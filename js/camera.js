// camera
'use strict';
// =====================================================================
// 地图镜头：双指缩放 / 滚轮缩放、单指拖曳平移、镜头跟随，以及「敌方回合快进」
//
// 做法：缩放 = 放大 TS（每格的 CSS 像素），地图画布照旧是「整张地图」大小，
// 只是比舞台大时用 CSS translate 平移。所以 battle.js / spellfx.js 里所有以 TS 为单位
// 的绘制（高亮、飘字、徽章、危险区域、光标、法术特效）与点击换算全都不必改。
// 放大时在像素预算内压低 DPR，避免超大画布吃光手机记忆体。
//
// 对外只暴露几个 camz 前缀的函数（由 battle.js / game.js 的 hook 呼叫）：
//   camzOnResize(W, H)  resize() 算出贴合用的 TS 后呼叫：套用缩放、摆放地图
//   camzSpeed()         T() 的额外时间倍率（快进时 < 1）
//   camzMenuItem() / camzMenuPick(v)   战斗菜单里的「敌方回合：正常 / 快进」
//   camzReset()         回到整张地图
// 另外以包装（不改原档）的方式挂上：duelOpen / skillCutIn（快进时跳过）、
// doAttack / castSpell（记下目标位置，让镜头同时框住出手者与目标）、buildMapHD（缩放来回切换时重用地图层）。
// =====================================================================
(function () {
  const ZMAX = 2.2;          // 最大缩放（相对于整张地图）
  const PX_BUDGET = 3.2e6;   // 放大时单张画布的像素上限（地图层 / 危险区域层同尺寸）
  const SLOP = 9;            // 移动超过这么多 CSS 像素就算拖曳，不算点击
  const FF_K = 0.28;         // 快进时的时间倍率

  const Z = {
    zoom: 1, ts: 0, fitTS: 32, ox: 0, oy: 0, W: 0, H: 0, b: null,
    anchor: null,            // 下一次 resize 时要固定在原位的点 {sx, sy, mx, my}
    preview: null,           // 手势进行中的 CSS 预览 {s, ox, oy}
    goal: null, fKey: '', manual: false, poi: null, suppress: false, busyAnim: false,
  };
  const zoomed = () => !!B && Z.ts > 0 && (Z.ts * B.w > Z.W + 0.5 || Z.ts * B.h > Z.H + 0.5);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const realDPR = () => window.devicePixelRatio || 1;

  // ---------- 样式与按钮 ----------
  const css = document.createElement('style');
  css.textContent = `
#stage { position: relative; }
#stage > #map { position: absolute; left: 0; top: 0; transform-origin: 0 0; touch-action: none; will-change: transform; }
.camz-btn { position: absolute; z-index: 20; top: 8px; height: 34px; min-width: 34px; padding: 0 10px; border-radius: 17px;
  border: 1.5px solid rgba(255,225,140,.75); background: rgba(8,18,46,.72); color: #fff; font-weight: bold; font-size: 13px;
  letter-spacing: 1px; box-shadow: 0 2px 6px rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center;
  -webkit-tap-highlight-color: transparent; cursor: pointer; user-select: none; -webkit-user-select: none; }
.camz-btn[hidden] { display: none; }
.camz-btn:active { transform: translateY(1px); filter: brightness(1.15); }
#camz-zoom { right: 8px; padding: 0; width: 34px; font-size: 17px; }
#camz-ff { right: 50px; }
#camz-ff.on { background: linear-gradient(180deg, #ffe692, #e9ae2c); color: #3a2200; border-color: #fff1b8; text-shadow: 0 1px 0 rgba(255,255,255,.4); }
`;
  document.head.appendChild(css);
  const stage = document.getElementById('stage');
  const mk = (id, html, title) => { const b = document.createElement('button'); b.id = id; b.className = 'camz-btn'; b.type = 'button'; b.innerHTML = html; b.title = title; b.hidden = true; stage.appendChild(b); return b; };
  const btnZoom = mk('camz-zoom', '⊕', '放大地图');
  const btnFF = mk('camz-ff', '⏩ 快进', '敌方回合快进');

  // ---------- 摆放地图 ----------
  function clampPan() {
    const mw = Z.ts * B.w, mh = Z.ts * B.h;
    Z.ox = mw <= Z.W ? (Z.W - mw) / 2 : cl(Z.ox, Z.W - mw, 0);
    Z.oy = mh <= Z.H ? (Z.H - mh) / 2 : cl(Z.oy, Z.H - mh, 0);
  }
  let lastTf = '';
  function apply() {
    const d = realDPR(), p = Z.preview;
    const x = p ? p.ox : Math.round(Z.ox * d) / d, y = p ? p.oy : Math.round(Z.oy * d) / d;
    const tf = p ? `translate3d(${x}px,${y}px,0) scale(${p.s})` : `translate3d(${x}px,${y}px,0)`;
    if (tf !== lastTf) { cv.style.transform = tf; lastTf = tf; }
  }
  // 舞台座标 → 地图格座标（以目前已提交的 TS 计算）
  const toMap = (sx, sy) => ({ mx: (sx - Z.ox) / Z.ts, my: (sy - Z.oy) / Z.ts });

  // resize() 的 hook：此时 TS 是「贴合整张地图」的大小
  window.camzOnResize = function (W, H) {
    if (B !== Z.b) { Z.b = B; Z.zoom = 1; Z.ts = 0; Z.goal = null; Z.manual = false; Z.poi = null; Z.fKey = ''; LAYERS.length = 0; }
    // 保持舞台中心对着同一个地图点（转向、视窗大小改变时）
    let keep = null;
    if (!Z.anchor && Z.ts) keep = toMap(Z.W / 2, Z.H / 2);
    Z.W = W; Z.H = H; Z.fitTS = TS;
    Z.zoom = cl(Z.zoom, 1, ZMAX);
    if (Z.zoom > 1.001) {
      TS = Math.max(Z.fitTS, Math.round(Z.fitTS * Z.zoom));
      const area = TS * B.w * TS * B.h;
      DPR = Math.min(DPR, Math.max(1, Math.sqrt(PX_BUDGET / area)));
    }
    const prevS = Z.ts * (Z.dpr || 0);
    Z.ts = TS; Z.dpr = DPR;
    if (Z.anchor) { Z.ox = Z.anchor.sx - Z.anchor.mx * TS; Z.oy = Z.anchor.sy - Z.anchor.my * TS; Z.anchor = null; }
    else if (keep) { Z.ox = W / 2 - keep.mx * TS; Z.oy = H / 2 - keep.my * TS; }
    Z.preview = null; Z.goal = null;
    clampPan(); apply();
    // 高清精灵的缩图快取依尺寸累积：换尺寸时清掉，免得记忆体越积越多
    if (prevS && prevS !== TS * DPR) { try { if (typeof FIT !== 'undefined') FIT = new WeakMap(); } catch (e) { } }
    syncButtons(true);
  };

  // 提交缩放：(sx, sy) 为舞台内要保持不动的点
  function setZoom(z, sx, sy) {
    if (!B) return;
    z = cl(z, 1, ZMAX);
    if (sx === undefined) { sx = Z.W / 2; sy = Z.H / 2; }
    const m = toMap(sx, sy);
    Z.anchor = { sx, sy, mx: m.mx, my: m.my };
    Z.zoom = z;
    resize();
  }
  // 预览（只动 CSS，不重画）：缩放到 z，且 (sx, sy) 对准地图点 (mx, my)
  function previewAt(z, sx, sy, mx, my) {
    z = cl(z, 1, ZMAX);
    const s = (Z.fitTS * z) / Z.ts, ts = Z.ts * s, mw = ts * B.w, mh = ts * B.h;
    let ox = sx - mx * ts, oy = sy - my * ts;
    ox = mw <= Z.W ? (Z.W - mw) / 2 : cl(ox, Z.W - mw, 0);
    oy = mh <= Z.H ? (Z.H - mh) / 2 : cl(oy, Z.H - mh, 0);
    Z.preview = { s, ox, oy, z };
    apply();
  }
  // 平滑缩放（按钮用）：先用 CSS 补间，结束时才重建
  function animateZoom(z, sx, sy) {
    if (!B || Z.busyAnim) return;
    if (sx === undefined) { sx = Z.W / 2; sy = Z.H / 2; }
    const m = toMap(sx, sy), z0 = Z.zoom, t0 = performance.now(), dur = 200;
    Z.busyAnim = true;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      previewAt(z0 + (z - z0) * e, sx, sy, m.mx, m.my);
      if (p < 1) return requestAnimationFrame(step);
      Z.busyAnim = false;
      const pv = Z.preview; // 以预览的最终位置为准，换算回缩放后的锚点
      Z.zoom = cl(z, 1, ZMAX); Z.anchor = { sx, sy, mx: m.mx, my: m.my };
      if (pv) { Z.anchor.sx = pv.ox + m.mx * Z.fitTS * Z.zoom; Z.anchor.sy = pv.oy + m.my * Z.fitTS * Z.zoom; }
      resize();
    };
    requestAnimationFrame(step);
  }
  // 「放大」按钮的目标：刚好填满舞台（用上下的空白），至少 1.6 倍
  function fillZoom() { return cl(Math.max(Z.W / (Z.fitTS * B.w), Z.H / (Z.fitTS * B.h), 1.6), 1, ZMAX); }
  window.camzReset = function () { if (B && Z.zoom > 1.001) animateZoom(1); };

  // ---------- 输入：拖曳 / 双指 / 滚轮 ----------
  const PTR = new Map();
  let G = null; // 进行中的手势
  const local = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const blocked = () => !B || AUTO || $('#battle').hidden || Z.busyAnim;
  cv.addEventListener('pointerdown', e => {
    if (blocked()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    PTR.set(e.pointerId, p);
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    if (PTR.size === 1) { G = { mode: 'tap', sx: p.x, sy: p.y, ox0: Z.ox, oy0: Z.oy }; Z.suppress = false; }
    else if (PTR.size === 2) {
      const [a, b] = [...PTR.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, m = toMap(mid.x, mid.y);
      G = { mode: 'pinch', d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), z0: Z.zoom, mx: m.mx, my: m.my, mid };
      Z.suppress = true; Z.goal = null; Z.manual = true;
    }
  });
  const onMove = e => {
    if (!PTR.has(e.pointerId) || !G) return;
    const p = local(e); PTR.set(e.pointerId, p);
    if (G.mode === 'tap' && Math.hypot(p.x - G.sx, p.y - G.sy) > SLOP) { G.mode = 'pan'; Z.suppress = true; }
    if (G.mode === 'pan') {
      if (!zoomed()) return;
      Z.manual = true; Z.goal = null;
      Z.ox = G.ox0 + p.x - G.sx; Z.oy = G.oy0 + p.y - G.sy; clampPan(); apply();
    } else if (G.mode === 'pinch' && PTR.size >= 2) {
      const [a, b] = [...PTR.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      G.mid = mid; G.z = cl(G.z0 * d / G.d0, 1, ZMAX);
      previewAt(G.z, mid.x, mid.y, G.mx, G.my);
    }
  };
  const onUp = e => {
    if (!PTR.has(e.pointerId)) return;
    PTR.delete(e.pointerId);
    if (!G) return;
    if (G.mode === 'pinch' && PTR.size < 2) {
      const pv = Z.preview, z = G.z || Z.zoom;
      G = { mode: 'done' };
      if (pv) { // 以预览位置为锚：手指下的那一格在重建后仍在原处
        const ts = Z.fitTS * pv.z, cx = Z.W / 2, cy = Z.H / 2;
        const m = { mx: (cx - pv.ox) / ts, my: (cy - pv.oy) / ts };
        Z.zoom = cl(z, 1, ZMAX); Z.anchor = { sx: cx, sy: cy, mx: m.mx, my: m.my };
        resize();
      }
    }
    if (!PTR.size) G = null;
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  // 拖曳 / 双指之后的 click 不当成点格子（捕获阶段先拦下，battle.js 的点击处理收不到）
  stage.addEventListener('click', e => {
    if (e.target === cv && Z.suppress) { e.stopPropagation(); e.preventDefault(); Z.suppress = false; }
  }, true);
  // 滚轮 / 触控板：即时用 CSS 预览，停下后才重建
  let wheelT = 0, W0 = null;
  stage.addEventListener('wheel', e => {
    if (blocked()) return;
    e.preventDefault();
    const p = local(e);
    if (!W0) { const m = toMap(p.x, p.y); W0 = { z: Z.zoom, mx: m.mx, my: m.my }; }
    const k = e.ctrlKey ? 0.012 : 0.0022, dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    W0.z = cl(W0.z * Math.exp(-dy * k), 1, ZMAX); W0.sx = p.x; W0.sy = p.y;
    Z.goal = null; Z.manual = true;
    previewAt(W0.z, p.x, p.y, W0.mx, W0.my);
    clearTimeout(wheelT);
    wheelT = setTimeout(() => {
      const w = W0; W0 = null; if (!w || !B) return;
      Z.zoom = w.z; Z.anchor = { sx: w.sx, sy: w.sy, mx: w.mx, my: w.my };
      resize();
    }, 160);
  }, { passive: false });
  // 防止 iOS 的手势缩放整页
  for (const ev of ['gesturestart', 'gesturechange']) stage.addEventListener(ev, e => e.preventDefault());

  btnZoom.addEventListener('click', e => {
    e.stopPropagation();
    if (!B) return;
    if (typeof sfx === 'function') sfx('select');
    if (Z.zoom > 1.001) return animateZoom(1);
    // 以选中 / 正在看的单位为中心放大
    const u = (B.sel && B.sel.hp > 0 && B.sel) || (B.focus && B.focus.hp > 0 && B.focus) || null;
    const c = u ? { x: Z.ox + (u.x + 0.5) * Z.ts, y: Z.oy + (u.y + 0.5) * Z.ts } : B.cursor ? { x: Z.ox + (B.cursor.x + 0.5) * Z.ts, y: Z.oy + (B.cursor.y + 0.5) * Z.ts } : { x: Z.W / 2, y: Z.H / 2 };
    Z.manual = false; Z.fKey = '';
    animateZoom(fillZoom(), c.x, c.y);
  });

  // ---------- 镜头跟随 ----------
  function followTarget() {
    const u = B.phase === 'player' ? B.sel : B.focus;
    if (!u || !(u.hp > 0 || u.dying)) return null;
    const ux = (u.px ?? u.x) + 0.5, uy = (u.py ?? u.y) + 0.5;
    const pts = [[ux, uy]];
    let k = 'u' + u.uid;
    const q = Z.poi;
    if (q && q.a === u && performance.now() - q.t < 6000) { pts.push([q.x + 0.5, q.y + 0.5]); k += '|' + q.x + ',' + q.y; }
    return { k, pts };
  }
  let lastNow = 0;
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (lastNow || now)) / 1000); lastNow = now;
    if (!B || $('#battle').hidden) return;
    syncButtons(false);
    if (AUTO || G || W0 || Z.busyAnim || Z.preview || !zoomed()) return;
    const t = followTarget();
    if (t && t.k !== Z.fKey) { Z.fKey = t.k; Z.manual = false; }
    if (t && !Z.manual) {
      // 目标（或出手者 + 目标）离开中央区域时，把它们移到画面中央
      const m = B.phase === 'player' ? 0.12 : 0.2, ix = Z.W * m, iy = Z.H * m; // 我方点选的单位本来就在画面里：只在贴边时才移
      const out = t.pts.some(([x, y]) => { const sx = Z.ox + x * Z.ts, sy = Z.oy + y * Z.ts; return sx < ix || sx > Z.W - ix || sy < iy || sy > Z.H - iy; });
      if (out) {
        let cx = 0, cy = 0; for (const [x, y] of t.pts) { cx += x; cy += y; } cx /= t.pts.length; cy /= t.pts.length;
        Z.goal = { ox: Z.W / 2 - cx * Z.ts, oy: Z.H / 2 - cy * Z.ts };
      }
    }
    if (Z.goal) {
      const mw = Z.ts * B.w, mh = Z.ts * B.h;
      const gx = mw <= Z.W ? (Z.W - mw) / 2 : cl(Z.goal.ox, Z.W - mw, 0), gy = mh <= Z.H ? (Z.H - mh) / 2 : cl(Z.goal.oy, Z.H - mh, 0);
      const k = 1 - Math.exp(-dt * (ffOn() ? 16 : 9));
      Z.ox += (gx - Z.ox) * k; Z.oy += (gy - Z.oy) * k;
      if (Math.abs(gx - Z.ox) < 0.4 && Math.abs(gy - Z.oy) < 0.4) { Z.ox = gx; Z.oy = gy; Z.goal = null; }
      apply();
    }
  }
  requestAnimationFrame(tick);

  // ---------- 敌方回合快进 ----------
  const ffOn = () => !!(OPT.ffEnemy && B && !AUTO && B.phase !== 'player' && !B.over);
  window.camzSpeed = () => (ffOn() ? FF_K : 1);
  function toggleFF() {
    OPT.ffEnemy = !OPT.ffEnemy;
    try { if (typeof saveOpt === 'function') saveOpt(); } catch (e) { }
    syncButtons(true);
  }
  btnFF.addEventListener('click', e => {
    e.stopPropagation();
    toggleFF();
    if (typeof sfx === 'function') sfx('select');
    if (typeof toast === 'function') toast(OPT.ffEnemy ? '⏩ 敌方回合快进：跳过战斗画面' : '敌方回合：恢复正常速度');
  });
  window.camzMenuItem = () => ({ label: `敌方回合：${OPT.ffEnemy ? '快进' : '正常'}`, value: 'camz-ff' });
  window.camzMenuPick = v => { if (v !== 'camz-ff') return false; toggleFF(); return true; };

  let bState = '';
  function syncButtons(force) {
    const show = !!B && !AUTO && !$('#battle').hidden && !B.over;
    const ff = show && B.phase !== 'player';
    const zs = show && (Z.fitTS * ZMAX > Z.fitTS + 1);
    const st = `${ff}|${zs}|${!!OPT.ffEnemy}|${Z.zoom > 1.001}`;
    if (!force && st === bState) return;
    bState = st;
    btnFF.hidden = !ff; btnFF.classList.toggle('on', !!OPT.ffEnemy);
    btnZoom.hidden = !zs;
    btnZoom.textContent = Z.zoom > 1.001 ? '⤢' : '⊕';
    btnZoom.title = Z.zoom > 1.001 ? '显示整张地图' : '放大地图';
    btnFF.style.right = zs ? '50px' : '8px';
  }

  // ---------- 包装既有函数（不改原档） ----------
  function wrap(name, fn) {
    try {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = fn(orig);
    } catch (e) { }
  }
  // 快进：敌 / 友军回合不开对战画面、不放必杀技插图（地图上的特效照常，只是加速）
  wrap('duelOpen', o => function (a, d) { return ffOn() ? Promise.resolve(false) : o.apply(this, arguments); });
  wrap('skillCutIn', o => function () { return ffOn() ? Promise.resolve() : o.apply(this, arguments); });
  // 记下出手目标：镜头同时框住出手者与目标
  wrap('doAttack', o => function (a, d) { if (a && d) Z.poi = { a, x: d.x, y: d.y, t: performance.now() }; return o.apply(this, arguments); });
  wrap('castSpell', o => function (u, id, tx, ty) { if (u) Z.poi = { a: u, x: tx, y: ty, t: performance.now() }; return o.apply(this, arguments); });
  // 地图层快取：缩放在「整张 ↔ 放大」之间切换时不必每次重建（最多留两种尺寸）
  const LAYERS = [];
  wrap('buildMapHD', o => function (b, s, frame) {
    if (!b || !b.map) return o.apply(this, arguments);
    const k = s + '|' + frame + '|' + b.map.join('/');
    const i = LAYERS.findIndex(e => e.b === b && e.k === k);
    if (i >= 0) { const e = LAYERS.splice(i, 1)[0]; LAYERS.push(e); return e.c; }
    const c = o.apply(this, arguments);
    if (c) { LAYERS.push({ b, k, c }); while (LAYERS.length > 4) LAYERS.shift(); }
    return c;
  });
})();
