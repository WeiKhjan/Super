// 超时空英雄传说 · 移动重制版 —— HD 战斗画面的怪物立绘（侧视、可动的向量骨架）
// 原本怪物在决斗画面只是把地图精灵放大（软糊、大型怪出框）；HD 画风下改由本档以 Canvas2D 向量路径绘制：
// 渐层 + 描边 + 卡通明暗，与 duelfig.js 的 HD 纸娃娃同一画风。像素画风、未收录的怪物维持原样。
// 姿势沿用 DFIG 的姿势栏位（不需另给基准姿势）：mo 张嘴、hd 抬头、fe 前爪、be 尾、wf 振翅、glw 蓄力光、
// ga 下蹲、mp 痛苦、dr 倒下、two 人立、tr 挥击（详见 SEM）。由 js/duel.js 的四个挂钩呼叫：
//   hdMonSpec(u) 取代规格 / hdMonPlan(pl, spec, ranged, crit) 攻击编排 / hdMonReact(spec, kind) 受击反应 / hdMonDraw(...) 绘制
'use strict';

const HDMON = (() => {
  const RAD = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hdOn = () => (typeof artHD === 'function' ? artHD() : (typeof OPT === 'undefined' || OPT.art !== 'pixel'));

  // ================= 色阶（与 duelfig 的 HD 纸娃娃同一套亮 / 暗推算） =================
  const OUT = [28, 16, 40];
  const RAMP = {
    cloth: [[0, 0.5], [0.2, 0.14], [0.34, 0], [0.57, 0], [0.66, -0.78], [0.9, -0.92], [1, -0.7]],
    skin: [[0, 0.32], [0.3, 0.06], [0.6, 0], [0.74, -0.5], [1, -0.62]],
    metal: [[0, 0.35], [0.12, 0.85], [0.22, 0.42], [0.4, 0.06], [0.55, -0.22], [0.66, -0.62], [0.78, -0.3], [0.9, -0.48], [1, -0.7]],
    soft: [[0, 0.42], [0.25, 0.12], [0.45, 0], [0.7, -0.4], [1, -0.68]],
    hide: [[0, 0.4], [0.26, 0.1], [0.52, 0], [0.66, -0.5], [0.86, -0.72], [1, -0.6]],
    flat: [[0, 0], [1, 0]],
  };
  const hex3 = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const TONES = new Map();
  function tone(hex, mat) {
    const id = hex + '|' + mat;
    let T = TONES.get(id); if (T) return T;
    const c = hex3(hex), lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) / 255;
    const hi = mat === 'metal' ? [255, 253, 245] : [c[0] + (255 - c[0]) * 0.55, c[1] + (250 - c[1]) * 0.55, c[2] + (236 - c[2]) * 0.5];
    const dk = mat === 'skin' ? [c[0] * 0.8, c[1] * 0.6, c[2] * 0.6 + 14] : [c[0] * 0.5 + 6, c[1] * 0.48 + 6, c[2] * 0.6 + 26 * (1 - lum * 0.5)];
    const at = v => { const t = Math.min(1, Math.abs(v)), q = v > 0 ? hi : dk; return `rgb(${(c[0] + (q[0] - c[0]) * t) | 0},${(c[1] + (q[1] - c[1]) * t) | 0},${(c[2] + (q[2] - c[2]) * t) | 0})`; };
    const R = RAMP[mat] || RAMP.cloth;
    T = {
      stops: R.map(([p, v]) => [p, at(v)]), dim: R.map(([p, v]) => [p, at(v * 0.5 - 0.42)]), at,
      line: `rgb(${(c[0] * 0.135 + OUT[0] * 0.55) | 0},${(c[1] * 0.135 + OUT[1] * 0.55) | 0},${(c[2] * 0.135 + OUT[2] * 0.55) | 0})`,
    };
    TONES.set(id, T);
    return T;
  }
  const rgba = (hex, a) => { const c = hex3(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const mixHex = (h1, h2, t) => { const a = hex3(h1), b = hex3(h2); return '#' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t).toString(16).padStart(2, '0')).join(''); };

  // ================= 显示列表：图元在「美术坐标」（脚底原点、面向 +x、y 向下）录下，再一次画到图层 =================
  // 部件 = 一组图元：先把全部图元的外形合成一条路径描边（只留外轮廓），再逐一以渐层填色
  let DL = null, CUR = null, TX = { x: 0, y: 0, a: 0, c: 1, s: 0, k: 1 };
  const STK = [];
  function push(x, y, a, k) {
    STK.push(TX);
    const p = tp(x, y), na = TX.a + (a || 0);
    TX = { x: p[0], y: p[1], a: na, c: Math.cos(na * RAD), s: Math.sin(na * RAD), k: TX.k * (k || 1) };
  }
  function pop() { TX = STK.pop(); }
  const tp = (x, y) => [TX.x + (x * TX.c - y * TX.s) * TX.k, TX.y + (x * TX.s + y * TX.c) * TX.k];
  const tpp = p => tp(p[0], p[1]);
  function part(o) { CUR = { prims: [], dim: !!(o && o.dim), ol: !(o && o.ol === false), lw: (o && o.lw) || 1 }; DL.parts.push(CUR); }
  function add(p) { if (!CUR) part(); CUR.prims.push(p); const b = p.bb; if (b[0] < DL.bb[0]) DL.bb[0] = b[0]; if (b[1] < DL.bb[1]) DL.bb[1] = b[1]; if (b[2] > DL.bb[2]) DL.bb[2] = b[2]; if (b[3] > DL.bb[3]) DL.bb[3] = b[3]; return p; }
  // 椭圆
  function E(x, y, rx, ry, a, c, o) {
    const p = tp(x, y), k = TX.k; rx *= k; ry *= k; const R = Math.max(rx, ry);
    return add({ k: 'e', x: p[0], y: p[1], rx, ry, a: ((a || 0) + TX.a) * RAD, c, m: (o && o.m) || 'hide', no: o && o.no, bb: [p[0] - R, p[1] - R, p[0] + R, p[1] + R] });
  }
  // 胶囊（两端不同半径）
  function C(a, b, r0, r1, c, o) {
    const A = tpp(a), B = tpp(b), k = TX.k; r0 *= k; r1 *= k;
    return add({ k: 'cap', a: A, b: B, r0, r1, c, m: (o && o.m) || 'hide', no: o && o.no, bb: [Math.min(A[0] - r0, B[0] - r1), Math.min(A[1] - r0, B[1] - r1), Math.max(A[0] + r0, B[0] + r1), Math.max(A[1] + r0, B[1] + r1)] });
  }
  // 管（颈、尾、触手）：一串胶囊，半径线性渐变
  function Tb(pts, r0, r1, c, o) { const n = pts.length - 1; for (let i = 0; i < n; i++) C(pts[i], pts[i + 1], lerp(r0, r1, i / n), lerp(r0, r1, (i + 1) / n), c, o); }
  // 多边形（sm：以中点为端点、顶点为控制点的圆角曲线）
  function Pl(pts, c, o) {
    const P = pts.map(tpp);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of P) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
    return add({ k: 'poly', P, sm: o && o.sm, c, m: (o && o.m) || 'hide', no: o && o.no, bb: [x0, y0, x1, y1] });
  }
  // 细线（皱褶、鳞纹、骨节）：不描边
  function Ln(pts, w, col, o) {
    const P = pts.map(tpp);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of P) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
    return add({ k: 'ln', P, w: w * TX.k, col, sm: o && o.sm, a: o && o.a != null ? o.a : 1, no: 1, bb: [x0 - w, y0 - w, x1 + w, y1 + w] });
  }
  // 加色柔光
  function Gl(x, y, r, col, a) { const p = tp(x, y); r *= TX.k; return add({ k: 'glow', x: p[0], y: p[1], r, col, a: a == null ? 1 : a, no: 1, bb: [p[0] - r, p[1] - r, p[0] + r, p[1] + r] }); }
  // 纯色（不描边、不打光）
  const F = (x, y, rx, ry, a, col) => E(x, y, rx, ry, a, col, { m: 'flat', no: 1 });
  function anc(k, x, y) { DL.anc[k] = tp(x, y); }

  // ---- 常用零件 ----
  const at = (p, a, l) => [p[0] + Math.cos(a * RAD) * l, p[1] + Math.sin(a * RAD) * l]; // 0 = 向前、90 = 向下
  function chain(p0, angs, lens) { const out = [p0]; let p = p0; angs.forEach((a, i) => { p = at(p, a, lens[i]); out.push(p); }); return out; }
  // 怪物眼：深色眼窝 + 发光虹膜 + 高光；hu = 痛苦（眯眼）、de = 倒下（× 眼）
  function eye(x, y, r, iris, Q, o) {
    const sq = o && o.round ? 1 : 0.72;
    if (Q && Q.de > 0.6) { Ln([[x - r, y - r * 0.7], [x + r, y + r * 0.7]], r * 0.45, '#1a1020'); Ln([[x - r, y + r * 0.7], [x + r, y - r * 0.7]], r * 0.45, '#1a1020'); return; }
    if (Q && Q.hu > 0.4) { Ln([[x - r * 1.1, y - r * 0.2], [x, y + r * 0.25], [x + r * 1.1, y - r * 0.3]], r * 0.5, '#1a1020'); return; }
    F(x, y, r * 1.15, r * sq * 1.1, o && o.a, '#1a1020');
    if (o && o.white) { F(x, y, r, r * sq, o.a, '#ffffff'); F(x + r * 0.2, y, r * 0.55, r * 0.62 * sq, 0, iris); F(x + r * 0.25, y, r * 0.25, r * 0.4 * sq, 0, '#1a1020'); }
    else { F(x, y, r * 0.92, r * sq * 0.85, o && o.a, iris); F(x + r * 0.15, y + r * 0.1, r * 0.28, r * 0.55 * sq, 0, '#1a1020'); }
    F(x - r * 0.35, y - r * 0.3 * sq, r * 0.3, r * 0.26, 0, '#ffffff');
    if (!(o && o.noGlow)) Gl(x, y, r * 2.6, iris, 0.45);
  }
  // 尖牙：沿一条线排一列白色三角
  function fangs(p0, p1, n, h, down, col) {
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.1) / n, t1 = (i + 0.9) / n, a = [lerp(p0[0], p1[0], t0), lerp(p0[1], p1[1], t0)], b = [lerp(p0[0], p1[0], t1), lerp(p0[1], p1[1], t1)];
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (down ? h : -h) * (i === 0 ? 1.4 : 1)];
      Pl([a, m, b], col || '#f4f0e8', { m: 'skin', no: 1 });
    }
  }
  // 弯角：沿圆弧的锥形
  function horn(base, a0, len, w, bend, col, o) {
    const pts = [], L = [], n = 6;
    for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + bend * t; pts.push(i ? at(pts[i - 1], a, len / n) : base); }
    for (let i = 0; i <= n; i++) { const t = i / n, r = w * (1 - t * 0.92), a = a0 + bend * t + 90; L.push(at(pts[i], a, r)); }
    for (let i = n; i >= 0; i--) { const t = i / n, r = w * (1 - t * 0.92), a = a0 + bend * t - 90; L.push(at(pts[i], a, r)); }
    Pl(L, col, Object.assign({ m: 'skin' }, o));
    return pts[n];
  }
  // 背刺
  function spikes(pts, h, col, ang) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;
      const m = [(a[0] + b[0]) / 2 + nx * h + (ang || 0), (a[1] + b[1]) / 2 + ny * h];
      Pl([a, m, b], col, { m: 'skin' });
    }
  }
  // 二节肢：大腿 → 小腿 → 脚掌（含爪）；回传各关节
  function limb(hip, a1, l1, a2, l2, r1, r2, col, o) {
    const knee = at(hip, a1, l1), foot = at(knee, a2, l2);
    C(hip, knee, r1, r1 * 0.78, col); C(knee, foot, r1 * 0.72, r2, col);
    if (o && o.paw) {
      const pa = o.pawA != null ? o.pawA : 0, toe = at(foot, pa, o.paw);
      C(foot, toe, r2 * 1.05, r2 * 0.8, col);
      if (o.claw) for (let k = -1; k <= 1; k++) { const b = at(toe, pa + 90 + k * 50, r2 * 0.5); horn(at(b, pa, -0.3), pa + 20 + k * 22, o.claw, o.claw * 0.33, 40, o.cc || '#f0e8d8'); }
      return { knee, foot, toe };
    }
    return { knee, foot, toe: foot };
  }
  // 蝙蝠翼：u = 振翅（1 上 … -1 下），ws = 翼展倍率；cm 翼膜、cb 骨
  // u > 0 举翼、u < 0 收拢（-1 = 完全收在背上）
  function batWing(root, u, ws, cm, cb, o) {
    u = clamp(u, -1, 1);
    const up = Math.max(0, u), fold = Math.max(0, -u);
    const a1 = -100 - 32 * up - 95 * fold, a2 = a1 - 58 + 10 * up + 78 * fold, sp = 1 - 0.3 * fold;
    const el = at(root, a1, 13 * ws * sp), wr = at(el, a2, 12 * ws * sp);
    const fa = [70, 100, 128].map((d, i) => a2 + d * (1 - fold) + (i * 9 - 4) * fold), fl = [21, 18, 13].map(l => l * ws * (1 - 0.35 * fold));
    const tips = fa.map((a, i) => at(wr, a, fl[i]));
    const back = at(root, 180 + 18, 11 * ws);
    const mem = [root, el, wr];
    const scal = (A, B) => { for (let i = 1; i <= 4; i++) { const t = i / 5, m = [lerp(A[0], B[0], t), lerp(A[1], B[1], t)], d = Math.sin(t * Math.PI) * 0.26; mem.push([lerp(m[0], wr[0], d), lerp(m[1], wr[1], d)]); } };
    mem.push(tips[0]); scal(tips[0], tips[1]); mem.push(tips[1]); scal(tips[1], tips[2]); mem.push(tips[2]); scal(tips[2], back); mem.push(back);
    Pl(mem, cm, { m: 'soft' });
    // 翼膜上的骨与爪
    const bw = (o && o.bw) || 1;
    C(root, el, 1.7 * ws * bw, 1.3 * ws * bw, cb, { no: 1 }); C(el, wr, 1.3 * ws * bw, 1.0 * ws * bw, cb, { no: 1 });
    tips.forEach(t => Ln([wr, t], 0.9 * ws * bw, tone(cb, 'cloth').at(-0.35)));
    horn(wr, a2 - 40, 3.2 * ws, 1 * ws, -30, (o && o.cc) || '#f0e8d8');
    return { el, wr, tips };
  }
  // 羽翼：沿臂排列的层叠羽片
  function featherWing(root, u, ws, c1, c2, o) {
    u = clamp(u, -1, 1);
    const up = Math.max(0, u), fold = Math.max(0, -u);
    const a1 = -105 - 30 * up - 85 * fold, a2 = a1 - 50 + 8 * up + 70 * fold;
    const el = at(root, a1, 11 * ws), wr = at(el, a2, 11 * ws);
    // 主羽（长）→ 覆羽（短）
    for (let i = 0; i < 7; i++) {
      const t = i / 6, base = i < 4 ? [lerp(wr[0], el[0], t * 1.4), lerp(wr[1], el[1], t * 1.4)] : [lerp(el[0], root[0], (t - 0.5) * 2), lerp(el[1], root[1], (t - 0.5) * 2)];
      const a = a2 + 80 + t * 55, L = (22 - t * 9) * ws;
      const tip = at(base, a, L);
      Pl([at(base, a - 90, 2.2 * ws), at(lerp2(base, tip, 0.6), a - 90, 2.6 * ws), tip, at(lerp2(base, tip, 0.6), a + 90, 2.0 * ws), at(base, a + 90, 2 * ws)], i % 2 ? c2 : c1, { sm: 1, m: 'soft' });
    }
    C(root, el, 3.4 * ws, 2.8 * ws, c1); C(el, wr, 2.8 * ws, 2 * ws, c1);
    for (let i = 0; i < 4; i++) { const t = i / 3, p = [lerp(root[0], wr[0], t), lerp(root[1], wr[1], t)]; E(p[0], p[1] + 2 * ws, 4 * ws, 2.6 * ws, a1 + 90, c1, { m: 'soft' }); }
    return { el, wr };
  }
  const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

  // ================= 渲染 =================
  let LX = -0.55, LY = -0.83;
  function pathOf(g, p) {
    switch (p.k) {
      case 'e': g.moveTo(p.x + p.rx * Math.cos(p.a), p.y + p.rx * Math.sin(p.a)); g.ellipse(p.x, p.y, p.rx, p.ry, p.a, 0, TAU); break;
      case 'cap': {
        const a = p.a, b = p.b, r0 = p.r0, r1 = p.r1, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        if (L < 1e-3 || L <= Math.abs(r0 - r1)) { const c = r0 >= r1 ? a : b, r = Math.max(r0, r1); g.moveTo(c[0] + r, c[1]); g.arc(c[0], c[1], r, 0, TAU); break; }
        const ang = Math.atan2(dy, dx), ph = Math.acos(clamp((r0 - r1) / L, -1, 1));
        g.moveTo(a[0] + Math.cos(ang + ph) * r0, a[1] + Math.sin(ang + ph) * r0);
        g.arc(a[0], a[1], r0, ang + ph, ang - ph + TAU); g.arc(b[0], b[1], r1, ang - ph, ang + ph); g.closePath(); break;
      }
      case 'poly': {
        const P = p.P, n = P.length;
        if (p.sm) {
          const m = i => [(P[i % n][0] + P[(i + 1) % n][0]) / 2, (P[i % n][1] + P[(i + 1) % n][1]) / 2];
          const s = m(n - 1); g.moveTo(s[0], s[1]);
          for (let i = 0; i < n; i++) { const e = m(i); g.quadraticCurveTo(P[i][0], P[i][1], e[0], e[1]); }
          g.closePath();
        } else { g.moveTo(P[0][0], P[0][1]); for (let i = 1; i < n; i++) g.lineTo(P[i][0], P[i][1]); g.closePath(); }
        break;
      }
    }
  }
  function grad(g, p, T) {
    let gr;
    if (p.k === 'cap') {
      const dx = p.b[0] - p.a[0], dy = p.b[1] - p.a[1], L = Math.hypot(dx, dy) || 1;
      let nx = -dy / L, ny = dx / L; if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
      const R = Math.max(p.r0, p.r1) * 1.02, mx = (p.a[0] + p.b[0]) / 2, my = (p.a[1] + p.b[1]) / 2;
      gr = g.createLinearGradient(mx + nx * R, my + ny * R, mx - nx * R, my - ny * R);
    } else {
      const [x0, y0, x1, y1] = p.bb, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const cs = [x0 * LX + y0 * LY, x1 * LX + y0 * LY, x0 * LX + y1 * LY, x1 * LX + y1 * LY], dmax = Math.max(...cs), dmin = Math.min(...cs), dc = cx * LX + cy * LY;
      gr = g.createLinearGradient(cx + LX * (dmax - dc), cy + LY * (dmax - dc), cx + LX * (dmin - dc), cy + LY * (dmin - dc));
    }
    for (const [pos, col] of T) gr.addColorStop(pos, col);
    return gr;
  }
  function fillPrim(g, p, dim) {
    if (p.k === 'glow') {
      const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      rg.addColorStop(0, rgba(p.col, 0.9 * p.a)); rg.addColorStop(0.35, rgba(p.col, 0.4 * p.a)); rg.addColorStop(1, rgba(p.col, 0));
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); g.globalCompositeOperation = 'source-over';
      return;
    }
    if (p.k === 'ln') {
      g.strokeStyle = p.col; g.lineWidth = p.w; g.lineCap = 'round'; g.lineJoin = 'round'; if (p.a !== 1) g.globalAlpha = p.a;
      g.beginPath(); g.moveTo(p.P[0][0], p.P[0][1]);
      if (p.sm && p.P.length > 2) { for (let i = 1; i < p.P.length - 1; i++) { const m = [(p.P[i][0] + p.P[i + 1][0]) / 2, (p.P[i][1] + p.P[i + 1][1]) / 2]; g.quadraticCurveTo(p.P[i][0], p.P[i][1], m[0], m[1]); } const L = p.P[p.P.length - 1]; g.lineTo(L[0], L[1]); }
      else for (let i = 1; i < p.P.length; i++) g.lineTo(p.P[i][0], p.P[i][1]);
      g.stroke(); g.globalAlpha = 1; return;
    }
    if (p.m === 'flat') { g.fillStyle = dim ? tone(p.c, 'cloth').at(-0.4) : p.c; g.beginPath(); pathOf(g, p); g.fill(); return; }
    const T = tone(p.c, p.m);
    if (p.k === 'e') {
      // 椭圆：在（作为明暗基准的）椭圆的单位圆空间做径向渐层，亮点偏向光源；同部件同色的小椭圆沿用大椭圆的明暗，整块是一体的
      const q = p.by || p;
      g.beginPath(); pathOf(g, p);
      g.save(); g.translate(q.x, q.y); g.rotate(q.a); g.scale(1, q.ry / q.rx);
      const ca = Math.cos(-q.a), sa = Math.sin(-q.a), lx = (LX * ca - LY * sa), ly = (LX * sa + LY * ca) * q.rx / q.ry, ll = Math.hypot(lx, ly) || 1;
      const R = q.rx, hx = lx / ll * 0.42 * R, hy = ly / ll * 0.42 * R;
      const rg = g.createRadialGradient(hx, hy, 0, 0, 0, R * 1.12);
      for (const [pos, col] of dim ? T.dim : T.stops) rg.addColorStop(pos, col);
      g.fillStyle = rg; g.fill(); g.restore();
      return;
    }
    g.fillStyle = grad(g, p, dim ? T.dim : T.stops); g.beginPath(); pathOf(g, p); g.fill();
  }
  let LW = 1;
  function renderDL(g) {
    for (const pt of DL.parts) {
      if (!pt.prims.length) continue;
      if (pt.ol) {
        let c0 = null; g.beginPath();
        for (const p of pt.prims) if (!p.no) { pathOf(g, p); if (!c0) c0 = p.c; }
        if (c0) { g.lineJoin = 'round'; g.lineWidth = LW * pt.lw; g.strokeStyle = tone(c0, 'cloth').line; g.stroke(); }
      }
      if (pt.prims.length > 1) {
        const big = {};
        for (const p of pt.prims) if (p.k === 'e' && p.m !== 'flat') { const b = big[p.c + p.m]; if (!b || p.rx * p.ry > b.rx * b.ry) big[p.c + p.m] = p; }
        for (const p of pt.prims) if (p.k === 'e' && p.m !== 'flat') { const b = big[p.c + p.m]; p.by = b !== p && p.rx * p.ry < b.rx * b.ry * 0.85 && Math.hypot(p.x - b.x, p.y - b.y) < b.rx * 1.6 ? b : null; }
      }
      for (const p of pt.prims) fillPrim(g, p, pt.dim);
    }
  }

  // ================= 图层快取（依量化后的姿势） =================
  const CACHE = new Map(); let CPX = 0; const CMAX = 9e6; const POOL = []; const CST = { hit: 0, miss: 0 };
  function canvasOf(w, h) { const c = POOL.pop() || document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function evict() {
    while (CPX > CMAX && CACHE.size > 2) {
      const k = CACHE.keys().next().value, e = CACHE.get(k); CACHE.delete(k);
      CPX -= e.px; for (const c of e.cvs) if (POOL.length < 10) POOL.push(c);
    }
  }
  function entryPx(e, c) { e.cvs.push(c); e.px += c.width * c.height; CPX += c.width * c.height; }

  // 姿势栏位 → 语意（量化：快取命中、并让同一姿势像素完全一致）
  const qz = (v, st) => Math.round(v / st) * st;
  function semOf(P, now, seed, D) {
    const per = D.per || (D.fly ? 1100 : 1600);
    const de = qz(clamp(P.dr || 0, 0, 1), 0.05);
    const ph = de > 0.5 ? 0 : Math.floor((((now / per + seed) % 1) + 1) % 1 * 12) / 12;
    // 动作中的姿势以较粗的级距量化：相邻几帧共用同一张图层（位移 / 旋转 / 挤压在合成时套用，仍是平滑的）
    return { mo: qz(clamp(P.mo || 0, 0, 1.2), 0.1), hd: qz(P.hd || 0, 3), cl: qz((P.fe || 80) - 80, 5), tl: qz((P.be || 14) - 14, 5), wf: qz(P.wf || 0, 0.1),
      gl: qz(clamp(P.glw || 0, 0, 1), 0.1), cr: qz(clamp(P.ga || 0, -0.5, 1.2), 0.1), hu: qz(clamp(P.mp || 0, 0, 1), 0.25), de: qz(de, 0.1), ar: (P.tr || 0) > 0.3 ? 1 : 0, re: qz(clamp(P.two || 0, -0.5, 1.2), 0.1), ph };
  }
  const SEM_KEYS = ['mo', 'hd', 'cl', 'tl', 'wf', 'gl', 'cr', 'hu', 'de', 'ar', 're', 'ph'];

  function build(M, Q, f, k) {
    const id = M.id + '|' + f + '|' + k + '|' + SEM_KEYS.map(n => Q[n]).join(',');
    let e = CACHE.get(id);
    if (e) { CACHE.delete(id); CACHE.set(id, e); CST.hit++; return e; }
    CST.miss++;
    DL = { parts: [], anc: {}, bb: [1e9, 1e9, -1e9, -1e9] }; CUR = null; TX = { x: 0, y: 0, a: 0, c: 1, s: 0, k: 1 }; STK.length = 0;
    LX = -0.55 * f; LY = -0.83;
    try { if (M.D.sz) push(0, 0, 0, M.D.sz); M.D.fig(Q, M.L, M); } finally { STK.length = 0; }
    const R = DL; DL = null;
    const m = 2, [ax0, ay0, ax1, ay1] = [R.bb[0] - m, R.bb[1] - m, R.bb[2] + m, R.bb[3] + m];
    const sx0 = f > 0 ? ax0 : -ax1, sx1 = f > 0 ? ax1 : -ax0;
    const w = Math.min(2048, Math.ceil((sx1 - sx0) * k) + 2), h = Math.min(2048, Math.ceil((ay1 - ay0) * k) + 2);
    const cv = canvasOf(w, h), g = cv.getContext('2d');
    g.setTransform(k * f, 0, 0, k, -sx0 * k, -ay0 * k);
    g.imageSmoothingEnabled = true;
    DL = R; LW = clamp(2.6 / Math.max(1, k / 3), 0.75, 1.5); renderDL(g); DL = null;
    e = { cv, w, h, sx0, ay0, k, anc: R.anc, bb: [ax0, ay0, ax1, ay1], cvs: [], px: 0 };
    entryPx(e, cv);
    CACHE.set(id, e); evict();
    return e;
  }
  // 剪影 / 边缘光：在共用的暂存画布上即时合成（不进快取，快取只放姿势图层）
  const SCR = { cv: null, g: null };
  function scratch(e) {
    if (!SCR.cv) { SCR.cv = document.createElement('canvas'); SCR.g = SCR.cv.getContext('2d'); SCR.cv.width = SCR.cv.height = 16; }
    if (SCR.cv.width < e.w || SCR.cv.height < e.h) { SCR.cv.width = Math.max(SCR.cv.width, e.w); SCR.cv.height = Math.max(SCR.cv.height, e.h); }
    const g = SCR.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, e.w + 2, e.h + 2);
    return g;
  }
  function silOf(e, col) {
    const g = scratch(e);
    g.drawImage(e.cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, e.w, e.h); g.globalCompositeOperation = 'source-over';
    return SCR.cv;
  }
  function rimOf(e, col, f) {
    const g = scratch(e), d = Math.max(1, 1.1 * e.k);
    g.drawImage(e.cv, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(e.cv, Math.round(d * 0.85) * f, Math.round(d * 0.75));
    g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, e.w, e.h); g.globalCompositeOperation = 'source-over';
    return SCR.cv;
  }

  // ================= 怪物目录 =================
  const DEFS = {};
  const IVORY = '#ece4c8', BONE = '#f0e8d8', EYE_R = '#ff3030', GOLD = '#f4c542';
  // 变体色（与地图精灵的 VARIANT_PAL 一致）
  const VAR = {
    red: ['#d8433a', '#8a1f1f'], blue: ['#4a8ad8', '#1f4a8a'], black: ['#3a3048', '#1a1020'], green: ['#5aa04a', '#2f6a2a'], white: ['#e8eef8', '#9aa8c4'],
    earth: ['#8a6a3a', '#5a3a1a'], wood: ['#3a7a3a', '#1f4a1f'], water: ['#3a6ab8', '#1f3a7a'], fire: ['#c8401a', '#7a1f0a'], metal: ['#c8c8d0', '#7a7a8a'],
  };
  const varCol = (v, d) => VAR[v] || d;
  const wave = (ph, o) => Math.sin((ph + (o || 0)) * TAU);

  // ================= 龙族（龙 / 幼龙各阶 / 白龙黑龙 / 冰龙）=================
  // 头部（局部座标：+x 沿吻部）。hs = 头部缩放；回传嘴的位置
  function dragonHead(Q, L, hs, o) {
    const mo = clamp(Q.mo, 0, 1.2);
    push(0, 0, 0, hs);
    part();
    const ha = L.horn;
    if (L.t >= 1 || !L.baby) { horn([-1.5, -4.2], -158, 9.5, 1.9, 28, ha); }
    else { horn([0, -4.6], -120, 3.6, 1.4, 18, ha); }
    // 颈侧鳍刺
    Pl([[-4, -1], [-9.5, -3.5], [-5.5, 1], [-9.5, 3], [-4, 3.5]], L.mem, { m: 'soft' });
    part();
    // 口腔（张嘴时露出）
    const jaw = [2.5, 2.4], ja = mo * 30, jt = [jaw[0] + Math.cos(ja * RAD) * 10.5, jaw[1] + Math.sin(ja * RAD) * 10.5];
    if (mo > 0.08) { Pl([[1.5, 1.2], [12.5, 2.6], jt, jaw], '#5a1424', { m: 'flat', no: 1 }); C([3, 3], [lerp(4, jt[0], 0.8), lerp(3.5, jt[1], 0.7)], 1.4, 1, '#d84a5a', { no: 1, m: 'soft' }); }
    push(jaw[0], jaw[1], ja);
    C([0, 0], [10.5, 0.3], 2.9, 2.0, L.body);
    fangs([2.5, -1.7], [10, -1.4], 4, 1.1, false);
    pop();
    E(1, 0, 7, 5.7, 0, L.body);
    C([4, -0.6], [13, 0.9], 4.4, 3.1, L.body);
    E(3.6, -3.8, 4.2, 1.9, -12, L.dark);
    fangs([5.5, 3.4], [12.8, 3.6], 4, 1.2, true);
    F(12.4, -0.7, 0.85, 0.55, 20, '#1a1020');
    Ln([[-3, 2.5], [0, 4], [3, 4.2]], 0.45, tone(L.body, 'cloth').at(-0.6));
    eye(4.2, -1.6, 1.8, L.eye, Q);
    anc('mouth', 13.6, 3);
    if (Q.gl > 0.05 && o && o.breath) { Gl(13.5, 3.2, 3 + 7 * Q.gl, o.breath, 0.9 * Q.gl); }
    pop();
  }
  function figDragon(Q, L) {
    const b = wave(Q.ph), b2 = wave(Q.ph, 0.25), de = Q.de, cr = clamp(Q.cr, -0.4, 1.2), re = Q.re;
    const ws = L.ws, hs = L.hs;
    push(0, 0, 0, L.sz);
    const flap = lerp(clamp(0.3 + b * 0.55 + Q.wf * 0.7, -1, 1), -1, de);
    const by = -25 + cr * 4 + de * 12 + b * 0.8, pitch = -re * 20 + de * 6;
    push(0, by, pitch);
    // 远侧翼、远侧肢
    part({ dim: 1 }); batWing([3, -8], flap + 0.12, ws * 0.95, L.mem, L.dark);
    part({ dim: 1 });
    const limp = a => lerp(a, 98, de * 0.7);
    limb([-6, 3], limp(58 + cr * 25), 8, limp(122 - cr * 20), 7, 4.2, 2.3, L.body, { paw: 3.6, pawA: 8, claw: 2.2 });
    limb([11, 4], limp(78 - Q.cl * 0.8), 7, limp(78 - Q.cl * 0.8 - 48), 6, 3.0, 2.1, L.body, { paw: 2.6, pawA: limp(10 - Q.cl * 0.6), claw: 2.4 });
    // 尾
    part();
    const sw = b2 * 7 + Q.tl;
    const tail = chain([-12, 1], [176 + sw * 0.4, 168 + sw, 182 + sw, 200 + sw * 0.6, 222, 246].map(a => lerp(a, 190, de * 0.6)), [5.8, 5.6, 5.4, 5, 4.6, 4]);
    Tb(tail, 6.2, 1.3, L.body);
    const tt = tail[tail.length - 1], ta = 250;
    Pl([tt, at(tt, ta - 60, 3.4), at(tt, ta, 5.2), at(tt, ta + 60, 3.4)], L.dark, { m: 'soft' });
    // 背刺（先画，躯干盖住根部）
    part();
    const back = [[-17, -3], [-11, -8], [-4, -10.4], [3, -10.6], [9, -9]];
    spikes(back, L.ice ? 4.2 : 3.2, L.ice ? '#d8f4ff' : L.spike, 0);
    // 躯干
    part();
    E(-9, 1, 9.2, 8.6, 0, L.body); E(0, 0, 15, 10.4, -8, L.body); E(9, -3, 9.4, 9, 0, L.body);
    E(4, 5.2, 12, 4.6, -12, L.belly, { no: 1, m: 'skin' });
    for (let i = 0; i < 4; i++) { const x0 = -4 + i * 4.4; Ln([[x0, 3.4 - i * 0.9], [x0 + 1.4, 7.6 - i * 1.1]], 0.5, tone(L.belly, 'skin').at(-0.55)); }
    if (L.chest) { E(11.5, 0, 4.6, 5.6, 0, L.chest, { no: 1, m: 'soft' }); Gl(11.5, 0, 9 + 3 * b + 6 * Q.gl, L.chest, 0.4 + 0.4 * Q.gl); }
    anc('chest', 4, -2);
    // 颈 + 头
    part();
    const hd = Q.hd * (1 - de), n0 = [12, -6];
    const n1 = at(n0, -64 - hd * 0.9 + de * 40, 7.2), n2 = at(n1, -48 - hd * 1.1 + de * 50, 7), n3 = at(n2, -26 - hd * 1.1 + de * 50, 6);
    Tb([n0, n1, n2, n3], 6.6, 4.6, L.body);
    for (const [p, q] of [[n0, n1], [n1, n2], [n2, n3]]) { const a = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD + 90; C(at(p, a, 2.7), at(q, a, 2.4), 2.6, 2.2, L.belly, { no: 1, m: 'skin' }); }
    push(n3[0], n3[1], 14 + hd * 0.35 + de * 35);
    dragonHead(Q, L, hs, { breath: L.fire });
    pop();
    anc('top', n3[0], n3[1] - 8);
    // 近侧肢
    part();
    limb([-7, 3], limp(62 + cr * 25), 8, limp(124 - cr * 20), 7.5, 4.6, 2.4, L.body, { paw: 4, pawA: 6, claw: 2.4 });
    E(-7.6, 2.4, 6.6, 8.2, -25, L.body);
    part();
    const fa = limp(76 - Q.cl * 0.85);
    const arm = limb([10, 5], fa, 7.5, fa - 50, 6.5, 3.3, 2.2, L.body, { paw: 2.8, pawA: fa - 80, claw: 2.7 });
    anc('hand', arm.toe[0] + 2, arm.toe[1]);
    // 近侧翼
    part(); batWing([1, -8], flap, ws, L.mem, L.dark);
    pop(); pop();
  }
  DEFS.dragon = {
    fly: 1, hov: 7, melee: 'bite', ranged: 'breath', puff: 1, fig: figDragon,
    look(M) {
      const v = M.v, ice = v === 'ice' || M.key === 'dragon_b';
      const [b, d] = ice ? ['#7ac0ee', '#2f6aa8'] : varCol(v, VAR.green);
      const t = M.baby ? clamp(M.tier, 0, 3) : 2, gx = M.cls === 'gWhiteDragon' || M.cls === 'gBlackDragon';
      const breath = v === 'red' ? 'red' : (ice || v === 'blue' || v === 'white') ? 'blue' : v === 'black' ? 'black' : null;
      const BC = { red: '#ff8030', blue: '#a8e0ff', black: '#c070ff' };
      return {
        body: b, dark: d, mem: ice ? '#bfe8ff' : mixHex(b, d, 0.3), belly: v === 'black' ? '#6a5a7a' : IVORY, spike: mixHex(d, '#1a1020', 0.2),
        horn: M.baby && t >= 3 ? GOLD : v === 'black' ? '#c8c0d8' : BONE, eye: v === 'black' ? '#d070ff' : ice ? '#3a9aff' : EYE_R,
        t, baby: M.baby, ice, chest: t >= 2 && !ice && v !== 'white' && v !== 'blue' ? (v === 'black' ? '#a050ff' : '#ff8a2a') : null,
        sz: M.baby ? [0.72, 0.82, 0.92, 1.0][t] : gx ? 1.05 : 1.02, ws: M.baby ? [0.72, 0.92, 1.0, 1.12][t] : 1.1, hs: M.baby ? [1.22, 1.08, 1.0, 1.0][t] : 1.04,
        breath, fire: BC[breath] || '#ff9040', gem: BC[breath] || '#ff9040',
      };
    },
  };
  DEFS.dragon_b = DEFS.dragon;

  // ================= 蛇类 / 水生 =================
  // 水面圈（海怪、多头蛇、大海怪从水中现身）
  // back = 先画的水面（身体之后）；否则画前缘的水波与浪花（盖住身体底部）
  function water(w, ph, Q, back) {
    part({ ol: false });
    if (back) { E(0, -0.6, w, 3.4, 0, '#3a8ad8', { m: 'soft', no: 1 }); F(0, -1.1, w * 0.88, 2.3, 0, 'rgba(150,215,250,0.55)'); return; }
    Pl([[-w, -0.6], [-w * 0.7, 1.4], [0, 2.8], [w * 0.7, 1.4], [w, -0.6], [w * 0.62, 0.6], [0, 1.3], [-w * 0.62, 0.6]], '#2a78c8', { m: 'soft', no: 1, sm: 1 });
    for (let i = -3; i <= 3; i++) { const x = i * w * 0.27 + wave(ph, i * 0.17) * 1.2, y = 1 - Math.cos(i / 3.4 * 1.5) * 1.6; E(x, y - 0.4, w * 0.1, 1.3 + 0.3 * wave(ph, i * 0.3), 0, '#e8f8ff', { m: 'soft', no: 1 }); }
  }
  // 蛇头（局部座标：+x 沿吻部）；o.frill 颈鳍、o.horn 角
  function snakeHead(Q, L, o) {
    const mo = clamp(Q.mo, 0, 1.2), sc = (o && o.sc) || 1;
    push(0, 0, 0, sc);
    part();
    if (o && o.frill) Pl([[-1, -3], [-7, -7.5], [-5, -2.5], [-9, -2], [-5, 0.5], [-8, 3], [-1, 3]], o.frill, { m: 'soft' });
    if (o && o.horn) horn([0, -3.6], -150, 5.5, 1.3, 25, o.horn);
    part();
    const ja = mo * 36, jt = [1.4 + Math.cos(ja * RAD) * 8.4, 1.9 + Math.sin(ja * RAD) * 8.4];
    if (mo > 0.08) {
      Pl([[1, 0.9], [9.6, 1.6], jt, [1.4, 1.9]], '#5a1424', { m: 'flat', no: 1 });
      const tg = at([4, 1.8], ja * 0.5, 5 + mo * 4);
      Ln([[3, 1.9], tg, at(tg, ja * 0.5 - 25, 2.2)], 0.55, '#e83a4a'); Ln([tg, at(tg, ja * 0.5 + 25, 2.2)], 0.55, '#e83a4a');
    }
    push(1.4, 1.9, ja); C([0, 0], [8.2, 0.2], 2.3, 1.5, L.body); C([0.5, 0.7], [7.5, 0.7], 1.2, 0.8, L.belly, { no: 1 }); pop();
    E(1.6, -0.2, 5.2, 4.1, 0, L.body);
    C([3, -0.6], [9.4, 0.5], 3.4, 2.4, L.body);
    E(3.4, -2.9, 3.4, 1.5, -10, L.dark);
    Pl([[7.6, 1.8], [8.2, 5 + mo * 0.6], [8.8, 1.8]], '#f4f0e8', { m: 'skin', no: 1 });
    Pl([[5.3, 1.9], [5.8, 4.4 + mo * 0.4], [6.3, 1.9]], '#f4f0e8', { m: 'skin', no: 1 });
    F(9.1, -0.4, 0.6, 0.4, 0, '#1a1020');
    eye(3.6, -1.2, 1.5, L.eye, Q);
    anc('mouth', 9.8, 2.2);
    if (Q.gl > 0.05 && o && o.glow) Gl(10, 2.3, 3 + 6 * Q.gl, o.glow, 0.9 * Q.gl);
    pop();
  }
  // 竖起的蛇颈：p0 起点，回传各节点（颈的前缘画浅色腹鳞）
  function snakeNeck(p0, angs, lens, r0, r1, L) {
    const pts = chain(p0, angs, lens);
    Tb(pts, r0, r1, L.body);
    for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD + 90, r = lerp(r0, r1, (i + 0.5) / (pts.length - 1)); C(at(p, a, r * 0.42), at(q, a, r * 0.42), r * 0.5, r * 0.45, L.belly, { no: 1 }); }
    return pts;
  }
  function figSnake(Q, L) {
    const b = wave(Q.ph), de = Q.de, hd = Q.hd * (1 - de), cr = Q.cr;
    // 盘卷的身体
    part();
    const tail = chain([-12, -3], [190, 160, 130], [4, 3.5, 3]); Tb(tail, 3, 0.6, L.body);
    part();
    E(-3, -3.6, 13, 4.4, 0, L.body); E(1, -7.6 + cr * 2, 10, 4, -4, L.body);
    for (let i = 0; i < 5; i++) Ln([[-12 + i * 5, -2], [-10 + i * 5, -5]], 0.5, tone(L.body, 'hide').at(-0.5));
    // 颈
    part();
    const lean = -Q.re * 18, n = snakeNeck([6, -8 + cr * 2 + de * 4], [-80 + hd * -1 + lean, -112 + b * 6 - hd * 1.2 + lean + de * 90, -60 - hd * 1.4 + de * 90, -10 - hd * 1.2 + de * 80].map(a => a), [6.5, 7.5, 7, 5], 4.2, 3.2, L);
    const h = n[n.length - 1];
    push(h[0], h[1], 12 + hd * 0.4 + de * 40);
    snakeHead(Q, L, { glow: L.gem, sc: 1.05 });
    pop();
    anc('chest', 4, -12); anc('top', h[0], h[1] - 6);
  }
  DEFS.watersnake = { sz: 1.2, melee: 'bite', ranged: 'orb', fig: figSnake, look: M => { const [b, d] = varCol(M.v, VAR.green); return { body: b, dark: d, belly: '#d8e8a0', eye: '#ffd030', gem: '#8ad8ff' }; } };

  // 海怪：蓝色海蛇从水中拱起
  function figSeaMonster(Q, L) {
    const b = wave(Q.ph), de = Q.de, hd = Q.hd * (1 - de), cr = Q.cr;
    water(20, Q.ph, Q, 1);
    push(0, 1, 0, 1.4);
    // 远处露出水面的尾鳍
    part();
    const tb = [-15, -1];
    Pl([tb, at(tb, -130 + b * 8, 9), at(tb, -100 + b * 8, 4), at(tb, -60 + b * 8, 8), [tb[0] + 3, tb[1] + 1]], L.dark, { sm: 1 });
    // 身体拱起
    part();
    const lean = -Q.re * 16;
    const body = chain([-8, 0], [-70 + lean, -40 + lean + de * 60, -20 - hd * 0.6 + de * 60, 10 - hd * 1.2 + de * 60], [8, 8, 7, 6]);
    Tb(body, 7.5, 6.4, L.body);
    for (let i = 0; i < body.length - 1; i++) { const p = body[i], q = body[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD + 90; C(at(p, a, 3), at(q, a, 2.8), 3.6, 3.2, L.belly, { no: 1 }); }
    spikes([body[0], body[1], body[2], body[3]].map(p => [p[0] - 2, p[1] - 6]), 3.6, L.fin);
    // 胸鳍
    part();
    const fb = at(body[2], 100, 4);
    Pl([fb, at(fb, 140 + Q.cl * 0.4 + b * 10, 9), at(fb, 175 + Q.cl * 0.4 + b * 10, 7)], L.fin, { sm: 1 });
    // 头
    part();
    const h = body[body.length - 1];
    push(h[0], h[1], 18 - hd * -0.3 + de * 50, 1.25);
    snakeHead(Q, L, { frill: L.fin, glow: L.gem });
    pop();
    anc('chest', body[1][0] + 3, body[1][1]); anc('top', h[0], h[1] - 8);
    pop();
    water(20, Q.ph, Q);
  }
  DEFS.seaMonster = { melee: 'bite', ranged: 'orb', fig: figSeaMonster, look: () => ({ body: '#3a8ae0', dark: '#1f4a8a', belly: '#d8ecff', fin: '#5ab8f0', eye: '#ffd030', gem: '#7ad8ff' }) };

  // 多头蛇：岸边的粗壮躯干 + 三条长颈（交错摆动）
  function figHydra(Q, L) {
    const de = Q.de, hd = Q.hd * (1 - de), cr = Q.cr, b = wave(Q.ph);
    part();
    const tail = chain([-14, -6], [170, 150, 125], [6, 5, 4]); Tb(tail, 5, 1, L.body);
    // 三颈：远 → 近
    water(24, Q.ph, Q, 1);
    push(0, 0, 0, 1.12);
    const necks = [{ x: -8, a: -112, s: 1.0, o: 0.33, d: 1 }, { x: 9, a: -58, s: 0.9, o: 0.66, d: 0 }, { x: 1, a: -84, s: 1.1, o: 0, d: 0 }];
    let top = 0;
    necks.forEach((N, i) => {
      if (i === 1) { part(); E(-2, -10 + cr * 2, 15, 10, -4, L.body); E(1, -6, 11, 5, -6, L.belly, { no: 1 }); spikes([[-15, -12], [-8, -18], [0, -20], [8, -17]], 3, L.dark); }
      part({ dim: !!N.d });
      const w = wave(Q.ph, N.o), lean = -Q.re * 14, h0 = hd * (1 - i * 0.15);
      const n = snakeNeck([N.x, -16 + cr * 3], [N.a + w * 6 + lean - h0 * 0.6 + de * 70, N.a + 20 + w * 8 + lean - h0 * 1.1 + de * 80, N.a + 60 - h0 * 1.3 + de * 90, N.a + 85 - h0 * 1.2 + de * 80], [8 * N.s, 8 * N.s, 7 * N.s, 5 * N.s], 4.6, 3.4, L);
      const h = n[n.length - 1]; top = Math.min(top, h[1]);
      push(h[0], h[1], 14 + h0 * 0.3 + de * 40 + w * 4);
      const sub = Object.assign({}, Q, { mo: clamp(Q.mo * (1 - i * 0.12) + (Q.mo > 0.3 ? 0 : 0.15 * (w + 1) * 0.5), 0, 1.2) });
      snakeHead(sub, L, { frill: L.fin, sc: 1.1, glow: L.gem });
      pop();
      if (i === 2) anc('top', h[0], top - 6);
    });
    part();
    for (const [x, a] of [[-10, 92], [8, 82]]) limb([x, -6 + cr * 2], a, 4, a + 10, 3, 3.6, 2.6, L.body, { paw: 3, pawA: 0, claw: 1.8 });
    anc('chest', 2, -14);
    pop();
    water(24, Q.ph, Q);
  }
  DEFS.hydra = { melee: 'bite', ranged: 'breath', breath: 'green', fig: figHydra, look: M => { const [b, d] = varCol(M.v, VAR.green); return { body: b, dark: d, belly: '#d8e8a0', fin: mixHex(b, '#8ad040', 0.4), eye: '#ffd030', gem: '#a8f070', breath: 'green' }; } };

  // 猪头龙：圆滚滚的身体、猪鼻、粉红耳、小翅膀
  function figPigDragon(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = Q.cr, hd = Q.hd * (1 - de), mo = clamp(Q.mo, 0, 1.2);
    const flap = lerp(clamp(0.3 + b * 0.6 + Q.wf * 0.7, -1, 1), -1, de);
    push(0, -17 + cr * 3 + de * 6 + b * 0.6, -Q.re * 14 + de * 8);
    part({ dim: 1 }); batWing([-2, -9], flap + 0.15, 0.62, L.mem, L.dark);
    part({ dim: 1 }); limb([-5, 7], 80, 4, 95, 3.5, 3, 2.4, L.body, { paw: 2.2, pawA: 0 }); limb([6, 7], 75 - Q.cl * 0.6, 4, 70 - Q.cl * 0.6, 3, 2.8, 2.2, L.body, { paw: 2, pawA: 0 });
    part();
    const tl = chain([-12, 2], [175, 200, 250, 300], [3, 3, 2.5, 2.5]); Tb(tl, 2.2, 0.9, L.body);
    part();
    E(0, 0, 13, 11.5, 0, L.body); E(3, 4, 9, 7, -10, L.belly, { no: 1, m: 'skin' });
    for (let i = 0; i < 3; i++) Ln([[-1 + i * 3.5, 0.5], [0.5 + i * 3.5, 8]], 0.5, tone(L.belly, 'skin').at(-0.55));
    anc('chest', 3, 0);
    // 头（与身体相连的大圆头）
    part();
    push(9, -8, hd * -0.5 + de * 30);
    Pl([[-4, -6], [-6, -14], [-0.5, -8]], L.ear, { sm: 0 }); Pl([[1, -7], [2, -14.5], [4.5, -7]], L.ear);
    E(0, 0, 8.6, 7.6, 0, L.body);
    push(2.5, 3.5, mo * 28); C([0, 0], [7, 0.5], 2.6, 2, L.body); fangs([1.5, -1.6], [6.5, -1.4], 3, 0.9, false); pop();
    if (mo > 0.08) F(6.5, 3.6 + mo * 2, 2.6, 1.2 + mo * 1.6, 0, '#5a1424');
    E(8.5, 0.6, 4.4, 3.8, 0, L.snout, { m: 'skin' });
    F(10.4, -0.2, 0.7, 1.1, 0, '#8a3a4a'); F(10.6, 1.8, 0.7, 1.1, 0, '#8a3a4a');
    Pl([[5, 3.6], [5.5, 5.6], [6.2, 3.6]], '#f4f0e8', { m: 'skin', no: 1 });
    eye(2.6, -2.4, 1.6, L.eye, Q);
    anc('mouth', 12, 2.6);
    if (Q.gl > 0.05) Gl(12, 2.6, 3 + 6 * Q.gl, L.gem, 0.9 * Q.gl);
    pop();
    anc('top', 8, -24);
    part(); limb([-5, 8], 85 + cr * 10, 4, 100, 3.5, 3.4, 2.6, L.body, { paw: 2.6, pawA: 0, claw: 1.2 });
    const arm = limb([7, 7], 70 - Q.cl * 0.7, 4, 60 - Q.cl * 0.7, 3.4, 3, 2.3, L.body, { paw: 2.2, pawA: 20 - Q.cl * 0.6, claw: 1.3 });
    anc('hand', arm.toe[0], arm.toe[1]);
    part(); batWing([-3, -10], flap, 0.7, L.mem, L.dark);
    pop();
  }
  DEFS.pigdragon = { fly: 1, hov: 6, melee: 'bite', ranged: 'breath', puff: 1, fig: figPigDragon, look: M => { const [b, d] = varCol(M.v, VAR.green); return { body: b, dark: d, mem: mixHex(b, d, 0.3), belly: IVORY, ear: '#f29ab0', snout: '#f6b0c4', eye: EYE_R, gem: '#ff9040' }; } };

  // 鳄鱼：低矮的长身、巨颚
  function figCroc(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = Q.cr, hd = Q.hd * (1 - de), mo = clamp(Q.mo, 0, 1.2);
    push(0, -8 + cr * 1.5 + de * 1.5, -Q.re * 10);
    part({ dim: 1 }); limb([-9, 2], 60, 3.6, 110, 3.6, 2.6, 1.8, L.body, { paw: 2.6, pawA: -10, claw: 1.2 }); limb([9, 2], 70 - Q.cl * 0.4, 3.4, 100, 3.4, 2.4, 1.7, L.body, { paw: 2.4, pawA: 10, claw: 1.2 });
    part();
    const sw = wave(Q.ph, 0.25) * 6 + Q.tl;
    const tail = chain([-14, -1], [178 + sw * 0.4, 182 + sw, 186 + sw, 190 + sw * 0.5], [7, 7, 6, 5]); Tb(tail, 5, 1, L.body);
    spikes(tail.map(p => [p[0], p[1] - 3]), 2.4, L.dark);
    part();
    E(0, 0, 16, 6, 0, L.body); E(2, 3, 13, 3, 0, L.belly, { no: 1, m: 'skin' });
    for (let i = 0; i < 6; i++) E(-12 + i * 5, -4.6, 1.8, 1.4, 0, L.dark, { no: 1 });
    anc('chest', 4, -2);
    // 头：长吻、上下颚
    part();
    push(14, -1, hd * -0.3 - mo * 14 + de * 10);
    const ja = mo * 34;
    if (mo > 0.08) Pl([[1, 1.4], [16, 1.8], at([1, 2], ja, 16), [1, 2.2]], '#5a1424', { m: 'flat', no: 1 });
    push(1, 2.2, ja); C([0, 0], [16, 0.6], 2.4, 1.4, L.body); fangs([3, -1.6], [15, -1], 6, 1, false); C([1, 0.8], [15, 1], 1.2, 0.8, L.belly, { no: 1 }); pop();
    E(1, -0.6, 5, 3.6, 0, L.body); C([2, -0.4], [17, 0.6], 3.1, 1.8, L.body);
    fangs([4, 2.4], [16.5, 2.3], 6, 1.1, true);
    E(3, -3.4, 2.4, 1.8, 0, L.body);
    eye(3, -3.6, 1.3, L.eye, Q, { noGlow: 1 });
    F(16.4, -0.6, 0.6, 0.4, 0, '#1a1020');
    anc('mouth', 17, 1.8);
    pop();
    anc('top', 3, -8);
    part(); limb([-8, 3], 55 + cr * 20, 3.8, 115, 3.6, 2.8, 1.9, L.body, { paw: 2.8, pawA: -6, claw: 1.3 });
    const arm = limb([9, 3], 65 - Q.cl * 0.5, 3.6, 100 - Q.cl * 0.5, 3.4, 2.6, 1.8, L.body, { paw: 2.6, pawA: 12, claw: 1.3 });
    anc('hand', arm.toe[0], arm.toe[1]);
    pop();
  }
  DEFS.crocodile = { sz: 1.1, melee: 'bite', ranged: 'orb', fig: figCroc, look: M => { const [b, d] = varCol(M.v, VAR.green); return { body: b, dark: d, belly: '#e0e8b0', eye: '#ffd030', gem: '#8ad8ff' }; } };

  // 巨龟：圆顶甲壳、伸缩的头
  function figTurtle(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = Q.cr, hd = Q.hd * (1 - de), mo = clamp(Q.mo, 0, 1.2);
    push(0, -6 + cr * 2, -Q.re * 12 + de * 4);
    part({ dim: 1 }); limb([-10, -2], 70, 4, 95, 4, 4.4, 3.6, L.skin, { paw: 3, pawA: 0, claw: 1.4 }); limb([10, -2], 80 - Q.cl * 0.4, 4, 90 - Q.cl * 0.4, 4, 4.2, 3.4, L.skin, { paw: 3, pawA: 10, claw: 1.4 });
    part();
    const tl = chain([-19, -1], [170, 160], [3, 3]); Tb(tl, 2.6, 1, L.skin);
    // 头颈（缩进 / 伸出）
    part();
    const ext = clamp(1 - Q.hu * 0.8 - de, 0, 1) * (1 + clamp(-Q.hd / 30, 0, 0.6));
    const n0 = [15, -6], n1 = at(n0, -20 - hd * 0.8, 6 * ext + 2), n2 = at(n1, 10 - hd, 4 * ext + 1);
    Tb([n0, n1, n2], 4.6, 4, L.skin);
    push(n2[0], n2[1], 8 + hd * 0.2);
    part();
    push(1, 1.6, mo * 26); C([0, 0], [6.5, 0.4], 2.3, 1.6, L.skin); pop();
    E(1.5, -0.4, 5.2, 4.2, 0, L.skin); C([3, -0.5], [7.4, 0.8], 3.4, 2.4, L.skin);
    Pl([[6, 0.4], [8.6, 1.2], [6.6, 2.6]], '#e8dcb0', { m: 'skin', no: 1 });
    eye(3.4, -1.6, 1.4, L.eye, Q, { noGlow: 1 });
    anc('mouth', 8, 1.6);
    if (Q.gl > 0.05) Gl(8, 1.8, 3 + 6 * Q.gl, L.gem, 0.9 * Q.gl);
    pop();
    // 甲壳
    part();
    Pl([[-20, 0], [-19, -9], [-12, -17], [0, -20], [12, -17], [19, -9], [20, 0]], L.shell, { sm: 1 });
    C([-20, 0.5], [20, 0.5], 2.6, 2.6, L.rim);
    for (const [x, y] of [[-10, -9], [0, -12], [10, -9]]) Pl([[x - 4.4, y], [x - 2.2, y - 3.8], [x + 2.2, y - 3.8], [x + 4.4, y], [x + 2.2, y + 3.8], [x - 2.2, y + 3.8]], L.plate, { no: 1, m: 'soft', sm: 1 });
    for (let i = 0; i < 9; i++) Ln([[-18 + i * 4.5, -0.6], [-18 + i * 4.5, 1.8]], 0.5, tone(L.rim, 'hide').at(-0.6));
    anc('chest', 2, -8); anc('top', 0, -20);
    part(); limb([-11, -1], 75 + cr * 15, 4, 95, 4, 4.6, 3.8, L.skin, { paw: 3.2, pawA: 0, claw: 1.5 });
    const arm = limb([11, -1], 82 - Q.cl * 0.5, 4, 92 - Q.cl * 0.5, 4, 4.4, 3.6, L.skin, { paw: 3.2, pawA: 10, claw: 1.5 });
    anc('hand', arm.toe[0], arm.toe[1]);
    pop();
  }
  DEFS.turtle = { melee: 'slam', ranged: 'orb', fig: figTurtle, look: () => ({ shell: '#4a9a4a', plate: '#6ab85a', rim: '#c8b078', skin: '#8ab87a', eye: '#1a1020', gem: '#8ad8ff' }) };

  // 大海怪：粉红章鱼、巨大头套 + 盘卷触手
  function figKraken(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = Q.cr, hd = Q.hd * (1 - de);
    const tent = (base, a0, curl, len, r, ph, dim, lift) => {
      part({ dim });
      const angs = [], ls = [];
      for (let i = 0; i < 7; i++) { angs.push(a0 + curl * i / 6 * (1 + 0.15 * wave(Q.ph, ph)) + wave(Q.ph, ph + i * 0.08) * 6 * (1 - de) + (lift || 0) * (1 - i / 7)); ls.push(len / 7); }
      const pts = chain(base, angs, ls);
      Tb(pts, r, 0.9, L.body);
      for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD + 90; F(at(p, a, r * 0.55 * (1 - i / 7))[0], at(p, a, r * 0.55 * (1 - i / 7))[1], r * 0.32 * (1 - i / 8), r * 0.28 * (1 - i / 8), 0, L.sucker); }
      return pts;
    };
    water(22, Q.ph, Q, 1);
    push(0, cr * 3 + de * 4, 0);
    tent([-6, -18], 150, -100, 26, 3.6, 0.1, 1); tent([4, -18], 40, 110, 24, 3.4, 0.6, 1);
    tent([-9, -16], 120, -60, 24, 3.8, 0.35, 0);
    // 头套（向后倾）
    part();
    const lean = -Q.re * 14 + hd * 0.4 + de * 30;
    push(0, -24, lean);
    E(-5, -14, 13, 16, -24, L.body); E(1, -1, 11, 8, 0, L.body);
    for (const [x, y, r] of [[-9, -20, 2.2], [-3, -24, 1.6], [-12, -10, 1.4], [-5, -12, 1.2]]) F(x, y, r, r * 0.8, 0, tone(L.body, 'hide').at(-0.25));
    eye(6, -4, 2.6, '#ffd030', Q, { white: 0 });
    E(6.5, -7.4, 3.6, 1.5, -10, L.body);
    anc('chest', 0, -2); anc('top', -5, -30); anc('mouth', 9, 3);
    if (Q.gl > 0.05) Gl(9, 3, 3 + 7 * Q.gl, L.gem, 0.9 * Q.gl);
    pop();
    tent([-1, -18], 95, -40, 22, 3.8, 0.85, 0);
    // 攻击用的前触手：随 cl 举起后横扫
    const cl = Q.cl;
    const fp = tent([6, -20], -40 - cl * 0.55, 140 - Math.max(0, -cl) * 2, 30 + Math.max(0, cl) * 0.05, 4, 0.2, 0, 0);
    anc('hand', fp[fp.length - 1][0], fp[fp.length - 1][1]);
    tent([2, -17], 70, 70, 20, 3.6, 0.5, 0);
    pop();
    water(22, Q.ph, Q);
  }
  DEFS.kraken = { melee: 'whip', ranged: 'orb', fig: figKraken, look: () => ({ body: '#f29ab0', sucker: '#ffe0e8', gem: '#8a5ad8' }) };

  // ================= 骨架工具 =================
  // 两节肢反解：hip → foot，fwd = +1 膝盖朝前
  function ik(hip, foot, l1, l2, fwd) {
    const dx = foot[0] - hip[0], dy = foot[1] - hip[1], d = clamp(Math.hypot(dx, dy), 0.01, l1 + l2 - 0.01);
    const a = Math.atan2(dy, dx), off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), ka = a - fwd * off;
    return [hip[0] + Math.cos(ka) * l1, hip[1] + Math.sin(ka) * l1];
  }
  const rot2 = (p, o, a) => { const c = Math.cos(a * RAD), s = Math.sin(a * RAD); return [o[0] + p[0] * c - p[1] * s, o[1] + p[0] * s + p[1] * c]; };
  function clawHand(p, a, r, col, cc, n) {
    E(p[0], p[1], r * 1.25, r, a, col);
    for (let k = 0; k < (n || 3); k++) horn(at(p, a + (k - 1) * 32, r * 0.9), a + (k - 1) * 26 + 40, r * 1.5, r * 0.42, 50, cc || BONE);
  }

  // ================= 四足兽（魔兽、人面狮身）=================
  function quad(Q, L, o) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), re = Q.re, cl = Q.cl, hd = Q.hd * (1 - de);
    const by = -o.h + Math.max(0, cr) * 4 + de * o.h * 0.5 + b * 0.5, pitch = -re * 26 + de * 6 - Q.hu * 6, O = [0, by];
    const W = p => rot2(p, O, pitch);
    const [l1, l2, r1, r2] = o.leg;
    const leg = (hipL, dx, fwd, front, near) => {
      const hp = W(hipL);
      let foot = [hp[0] + dx, 0];
      if (de > 0) foot = lerp2(foot, [hp[0] + dx * 2 + (front ? 6 : -6), 0], de);
      let knee = ik(hp, foot, l1, l2, fwd);
      if (front && (re > 0.2 || cl > 0)) {
        // 前腿抬起（人立 / 挥爪）
        const t = clamp(Math.max(re, cl / 90), 0, 1), ua = lerp(95, 30 - cl * 0.6, t) + (near ? 0 : 12);
        const k2 = at(hp, ua, l1), f2 = at(k2, ua + lerp(0, 55, t), l2);
        knee = lerp2(knee, k2, t); foot = lerp2(foot, f2, t);
      }
      C(hp, knee, r1, r1 * 0.8, L.body); C(knee, foot, r1 * 0.72, r2, L.body);
      const pa = front && cl > 30 ? 20 - cl * 0.3 : 0;
      E(foot[0] + 1.4, foot[1] - r2 * 0.4, r2 * 1.45, r2 * 0.95, pa, L.paw || L.body);
      if (o.claws) for (let k = 0; k < 3; k++) horn(at(foot, pa - 20 + k * 20, r2 * 1.2), pa + 30, r2 * 0.9, r2 * 0.3, 40, o.cc || BONE);
      return foot;
    };
    if (o.wing) { part({ dim: 1 }); push(O[0], O[1], pitch); o.wing(Q, L, 1); pop(); }
    part({ dim: 1 }); leg([-8, 3], -1, 1, 0, 0); leg([9, 3], 2, -1, 1, 0);
    part(); push(O[0], O[1], pitch); o.tail(Q, L); pop();
    part(); push(O[0], O[1], pitch); o.body(Q, L); pop();
    anc('chest', W([6, -1])[0], W([6, -1])[1]);
    // 头
    part();
    const nk = W(o.neck), ha = pitch * 0.5 + (o.ha || 0) - hd * 0.8 + de * 26 + Q.hu * -8;
    push(nk[0], nk[1], ha); o.head(Q, L); pop();
    anc('top', nk[0], nk[1] - o.headH * (o.hs || 1));
    part(); leg([-7, 4], 2, 1, 0, 1);
    const hand = leg([10, 4], 4, -1, 1, 1); anc('hand', hand[0] + 2, hand[1] - 1);
    if (o.wing) { part(); push(O[0], O[1], pitch); o.wing(Q, L, 0); pop(); }
  }
  // 魔兽：灰狼般的魔物
  function wolfHead(Q, L) {
    const mo = clamp(Q.mo, 0, 1.2), ja = mo * 32;
    Pl([[-3, -2.5], [-3.6, -10.5], [1, -3.6]], L.dark); Pl([[-5, -1.5], [-6.6, -9], [-1.6, -3]], L.dark);
    Pl([[-4, -3], [-9, -1], [-5, 0], [-9, 2.5], [-4, 3.5]], L.mane);
    if (mo > 0.08) Pl([[2, 1], [10, 1.6], at([2, 2.2], ja, 8), [2, 2.2]], '#5a1424', { m: 'flat', no: 1 });
    push(2, 2.2, ja); C([0, 0], [7.6, 0.4], 2, 1.3, L.body); fangs([1.5, -1.4], [7.2, -1.1], 3, 1.1, false); pop();
    E(0, 0, 5.4, 4.6, 0, L.body); C([2.5, 0.3], [10, 1.3], 3, 1.9, L.body);
    E(2.4, -2.6, 3.2, 1.3, -12, L.dark);
    fangs([5, 2.9], [9.6, 2.9], 3, 1.1, true);
    F(10.3, 0.7, 1.15, 0.95, 0, '#1a1020');
    eye(2.6, -1.2, 1.4, L.eye, Q);
    anc('mouth', 10.4, 2.6);
    if (Q.gl > 0.05) Gl(10.4, 2.6, 3 + 6 * Q.gl, L.gem, 0.9 * Q.gl);
  }
  function figBeast(Q, L) {
    quad(Q, L, {
      h: 16, leg: [7.5, 8, 2.8, 2.1], neck: [12, -4], ha: 14, headH: 12, claws: 1,
      tail: Q2 => { const sw = wave(Q2.ph, 0.25) * 8 + Q2.tl; const t = chain([-14, -2], [200 + sw, 190 + sw, 175 + sw * 1.2, 165 + sw], [4, 4, 4, 3]); Tb(t, 3.4, 2.4, L.body); E(t[4][0], t[4][1], 3.6, 2.6, 165 + sw, L.mane); },
      body: () => {
        spikes([[-14, -4], [-8, -7.5], [-1, -8.5], [6, -9], [12, -8]], 3.2, L.mane);
        E(-8, 0, 8.6, 7, 0, L.body); E(0, -0.5, 11, 6.8, -3, L.body); E(8, -1.5, 7.6, 8.2, 0, L.body);
        E(3, 4, 10, 3, -4, L.belly, { no: 1 });
        Ln([[-3, -1], [-1, 3]], 0.5, tone(L.body, 'hide').at(-0.5)); Ln([[1, -1.6], [3, 2.6]], 0.5, tone(L.body, 'hide').at(-0.5));
      },
      head: () => wolfHead(Q, L),
    });
  }
  DEFS.beast = { sz: 1.15, melee: 'bite', ranged: 'orb', fig: figBeast, look: () => ({ body: '#a8a8b8', dark: '#5a5a6e', mane: '#4a4458', belly: '#d8d8e4', eye: '#ffcc30', gem: '#b06aff' }) };

  // 人面狮身：狮身、法老头巾的人脸、羽翼
  function figSphinx(Q, L) {
    quad(Q, L, {
      h: 20, leg: [9, 9.5, 3.6, 2.8], neck: [13, -8], ha: 2, headH: 16,
      tail: Q2 => { const sw = wave(Q2.ph, 0.25) * 10 + Q2.tl; const t = chain([-15, -2], [160 + sw, 170 + sw, 200 + sw, 230 + sw], [5, 5, 4, 3]); Tb(t, 1.6, 1.2, L.body); E(t[4][0], t[4][1], 2.4, 3.2, 0, L.dark); },
      body: () => {
        E(-9, 0, 10, 8.6, 0, L.body); E(0, -0.6, 12, 8.4, -3, L.body); E(9, -2, 9, 9.6, 0, L.body);
        E(2, 5, 11, 3.4, -4, L.belly, { no: 1 });
      },
      wing: (Q2, L2, far) => featherWing(far ? [0, -9] : [-2, -8], clamp(0.25 + wave(Q2.ph) * 0.3 + Q2.wf * 0.7, -1, 1) + (far ? 0.12 : 0) - Q2.de * 1.4, 0.95, L.wing, L.wing2),
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        // 法老头巾（后摆垂到肩上）
        Pl([[-6, -7], [3, -9.5], [6, -5], [5, 0], [1, 4], [-2, 12], [-9, 11], [-8, 0]], L.nemes, { sm: 1 });
        for (let i = 0; i < 4; i++) Ln([[-7 + i * 0.4, -3 + i * 3.4], [-1 + i * 0.6, -4 + i * 3.6]], 0.9, L.stripe);
        E(2.6, 0.4, 4.4, 5.4, 0, L.skin, { m: 'skin' });
        Pl([[6.5, -0.6], [8.8, 2.6], [6.4, 3]], L.skin, { m: 'skin' });
        C([4, 7], [3.2, 11], 1.3, 1, L.gold);
        Pl([[-2, -9], [6, -8.8], [6.8, -5.4], [-2, -5.6]], L.gold, { sm: 1 });
        C([6, -7.5], [7.6, -10.2], 0.9, 0.7, L.gold);
        F(6, 4.4 + mo * 0.6, 1.4, 0.4 + mo * 1.2, 0, '#5a1a24');
        eye(4.6, 0.2, 1.2, '#2a1a40', Q, { white: 1, noGlow: 1 });
        Ln([[3, -1.2], [6.4, -1.4], [7.2, -0.6]], 0.6, '#1a1020');
        anc('mouth', 7, 4.6);
        if (Q.gl > 0.05) Gl(6, -8, 3 + 7 * Q.gl, L.gem, 0.9 * Q.gl);
      },
    });
  }
  DEFS.sphinx = { melee: 'claw', ranged: 'orb', fig: figSphinx, look: () => ({ body: '#e8a040', dark: '#9a5a1a', belly: '#f8d8a0', wing: '#f0c870', wing2: '#d89a48', nemes: '#f4c542', stripe: '#3a5ab8', gold: '#f4c542', skin: '#e8b088', eye: '#2a1a40', gem: '#ffe070' }) };

  // ================= 人形魔物（巨人、雪人、石像鬼、恶魔、黑魔神、机器人、天使）=================
  function biped(Q, L, o) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), re = Q.re, cl = Q.cl, hd = Q.hd * (1 - de);
    const [l1, l2, lr1, lr2] = o.leg, [a1, a2, ar1, ar2] = o.arm, fly = o.fly;
    const hipY = -(l1 + l2) * 0.95 * (1 - Math.max(0, cr) * 0.22) * (1 - de * 0.5) + b * 0.5;
    const lean = (o.lean != null ? o.lean : 8) - re * 24 - Q.hu * 10 + de * 30 + Math.max(0, cr) * 14;
    const hip = [0, hipY], R = p => rot2(p, hip, lean);
    const shN = R([o.shX || 1, -o.sh]), shF = R([(o.shX || 1) - (o.shD || 3), -o.sh - 0.5]);
    const leg = (dx, back) => {
      const hp = R([dx, 0]);
      let knee, foot;
      if (fly) { knee = at(hp, 78 - cr * 25 + (back ? -10 : 6) + b * 4, l1); foot = at(knee, 108 + (back ? 12 : 0) + b * 4, l2); }
      else { foot = [dx * 0.6 + (back ? -1 : 1) * (o.stride || 3.5) * (1 + Math.max(0, cr) * 0.6), 0]; knee = ik(hp, foot, l1, l2, 1); }
      C(hp, knee, lr1, lr1 * 0.84, L.leg); C(knee, foot, lr1 * 0.78, lr2, L.leg);
      if (o.foot) o.foot(foot, back); else C([foot[0] - lr2 * 0.4, foot[1] - lr2 * 0.7], [foot[0] + lr2 * 1.6, foot[1] - lr2 * 0.55], lr2 * 0.9, lr2 * 0.7, L.foot || L.leg);
    };
    const arm = (sh, back) => {
      const u = 82 - cl * (back ? 0.85 : 1) + (back ? -12 : 0) + lean * 0.3 + b * 2 - Q.hu * 25 + de * 10;
      const el = at(sh, u, a1), fa = u - 28 - Math.max(0, cl) * 0.1 + (o.fore || 0), hand = at(el, fa, a2);
      C(sh, el, ar1, ar1 * 0.85, L.arm); C(el, hand, ar1 * 0.8, ar2, L.arm);
      (o.hand || ((p, a) => clawHand(p, a, ar2 * 1.1, L.arm, L.claw)))(hand, fa, back);
      return hand;
    };
    if (o.wing) { part({ dim: 1 }); o.wing(R([-2, -o.sh + 1]), 1); }
    part({ dim: 1 }); arm(shF, 1);
    part({ dim: 1 }); leg(-(o.hipW || 2), 1);
    if (o.tail) { part(); o.tail(R([-3, -1])); }
    part(); leg(o.hipW || 2, 0);
    if (o.wing) { part(); o.wing(R([-3, -o.sh + 2]), 0); }
    part(); push(hip[0], hip[1], lean); o.torso(Q, L); pop();
    const nk = R([o.nkX || 2, -o.nk]), ha = lean * 0.5 - hd * 0.7 + de * 22 + Q.hu * -6;
    part(); push(nk[0], nk[1], ha, o.hs || 1); o.head(Q, L); pop();
    anc('chest', R([2, -o.sh * 0.6])[0], R([2, -o.sh * 0.6])[1]);
    anc('top', nk[0], nk[1] - o.headH * (o.hs || 1));
    part(); const hand = arm(shN, 0); anc('hand', hand[0] + 1, hand[1]);
    if (o.after) o.after(hand, Q, L);
  }
  // 投石巨人
  function figGiant(Q, L) {
    biped(Q, L, {
      leg: [10, 10, 4.4, 3.4], arm: [11, 10.5, 4.2, 3.8], sh: 20, nk: 22, hs: 1.3, headH: 11, hipW: 2.5, stride: 4, lean: 6,
      torso: () => {
        E(0, -12, 10, 12.5, 0, L.skin, { m: 'skin' }); E(2, -16, 7, 5, 0, L.skin, { m: 'skin' });
        Pl([[-10, -12], [9, -14], [11, -2], [9, 3], [-10, 3], [-11, -4]], L.cloth, { sm: 1 });
        Pl([[6, -14], [-6, -23], [-2, -24], [9, -15]], L.cloth, { sm: 1 });
        C([-10, -1], [10, -1], 1.6, 1.6, L.belt, { no: 0 });
        for (let i = 0; i < 4; i++) Ln([[-8 + i * 5, 0.6], [-7 + i * 5, 3.6]], 0.6, tone(L.cloth, 'hide').at(-0.6));
      },
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        E(1, -2, 6.4, 7, 0, L.skin, { m: 'skin' });
        push(2, 2.4, mo * 22); C([0, 0], [5.6, 0.6], 3, 2.4, L.skin, { m: 'skin' }); fangs([2, -2], [5.4, -1.8], 2, 0.9, false); pop();
        E(-4, -1, 1.8, 2.6, 0, L.skin, { m: 'skin' });
        C([4, -2], [7.4, 0.6], 1.6, 1.4, L.skin, { m: 'skin' });
        C([0, -5.2], [6.2, -4.6], 1.3, 1.1, L.hair);
        Pl([[-4, -8], [-1, -10.5], [2, -8.4]], L.hair, { sm: 1 });
        eye(4, -3.2, 1.1, '#1a1020', Q, { noGlow: 1 });
        if (mo > 0.1) F(6.4, 2.6 + mo, 1.5, 0.6 + mo * 1.2, 0, '#5a1a24');
        anc('mouth', 7, 2.4);
      },
      hand: (p, a, back) => { E(p[0], p[1], 4.2, 3.8, a, L.skin, { m: 'skin' }); if (!back && Q.gl > 0.2) { const r = at(p, a - 60, 4); E(r[0], r[1], 5.6, 5, 20, L.rock); Ln([[r[0] - 2, r[1] - 1], [r[0] + 1, r[1] + 1.5]], 0.6, tone(L.rock, 'hide').at(-0.6)); anc('tip', r[0], r[1]); } },
      foot: (f) => C([f[0] - 1.5, f[1] - 2.2], [f[0] + 4.4, f[1] - 2], 2.6, 2.2, L.skin, { m: 'skin' }),
    });
  }
  DEFS.giant = { melee: 'slam', ranged: 'rock', fig: figGiant, look: () => ({ skin: '#c8906a', arm: '#c8906a', leg: '#c8906a', cloth: '#8a5a2c', belt: '#5a3a1a', hair: '#4a2a14', rock: '#9a8a78' }) };
  // 雪人
  function figYeti(Q, L) {
    biped(Q, L, {
      leg: [8, 8, 4.6, 3.8], arm: [13, 12, 4.4, 4.6], sh: 18, nk: 19, hs: 1.2, headH: 11, hipW: 2.5, stride: 4.5, lean: 14, fore: 10,
      torso: () => {
        E(0, -11, 11, 13, 0, L.fur); E(3, -6, 7, 8, 0, L.fur2, { no: 1 });
        for (let i = 0; i < 6; i++) { const a = -150 + i * 22; const p = at([0, -11], a, 11.5); Pl([at(p, a - 70, 2.4), at(p, a, 3.4), at(p, a + 70, 2.4)], L.fur); }
      },
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        E(0, -2, 7.2, 7.4, 0, L.fur);
        E(3.4, 0, 4.6, 4.8, 0, L.face, { m: 'skin' });
        push(2.4, 3, mo * 26); C([0, 0], [5.2, 0.5], 2.4, 1.8, L.face, { m: 'skin' }); fangs([1.5, -1.5], [5, -1.4], 2, 1, false); pop();
        if (mo > 0.1) F(5.2, 3.2 + mo, 1.8, 0.6 + mo * 1.3, 0, '#3a1a3a');
        fangs([4.6, 3], [7.6, 3], 2, 1.3, true);
        eye(4.4, -1.2, 1.4, '#3a9aff', Q);
        E(4.4, -3.4, 3.4, 1.2, -8, L.fur2);
        anc('mouth', 7.6, 3.4);
      },
      hand: (p, a, back) => { E(p[0], p[1], 4.4, 4, a, L.fur); horn(at(p, a, 3.4), a + 30, 2.4, 0.8, 30, '#c8d8f0'); if (!back && Q.gl > 0.2) { const r = at(p, a - 60, 4.4); E(r[0], r[1], 5, 4.8, 0, '#ffffff', { m: 'soft' }); anc('tip', r[0], r[1]); } },
      foot: (f) => { C([f[0] - 1.5, f[1] - 2.4], [f[0] + 4, f[1] - 2], 3, 2.4, L.fur); },
    });
  }
  DEFS.yeti = { melee: 'slam', ranged: 'rock', fig: figYeti, look: () => ({ fur: '#eef2fa', fur2: '#d0dcf0', arm: '#eef2fa', leg: '#eef2fa', face: '#8ab0d8', claw: '#c8d8f0' }) };

  // 恶魔类的头：角、红眼、獠牙
  function demonHead(Q, L, crown) {
    const mo = clamp(Q.mo, 0, 1.2);
    horn([-2, -5], -120, 9, 2, -60, L.horn);
    E(0, -1, 6.2, 6.4, 0, L.skin);
    Pl([[-5, -2], [-9, -1], [-5.4, 1.4]], L.skin);
    push(1.8, 2.6, mo * 26); C([0, 0], [5.4, 0.4], 2.6, 2, L.skin); fangs([1.4, -1.8], [5, -1.5], 3, 1, false); pop();
    if (mo > 0.1) F(5, 3 + mo, 1.8, 0.6 + mo * 1.4, 0, '#2a0a14');
    E(3.4, -3.6, 3.6, 1.4, -14, L.dark);
    C([3.6, -1.2], [6.6, 1.4], 1.8, 1.4, L.skin);
    fangs([3.6, 3.2], [6, 3.2], 2, 1.5, true);
    eye(3.6, -1.8, 1.6, L.eye, Q);
    horn([1, -5.6], -80, 10, 2.2, -70, L.horn);
    if (crown) for (let i = 0; i < 5; i++) horn([-3.6 + i * 1.9, -6.2 + Math.abs(i - 2) * 0.4], -94 + (i - 2) * 9, 4 - Math.abs(i - 2) * 0.6, 1, 0, GOLD, { m: 'metal' });
    anc('mouth', 6.6, 2.8);
    if (Q.gl > 0.05) Gl(5.6, 2.4, 3 + 7 * Q.gl, L.gem, 0.9 * Q.gl);
  }
  function figDemon(Q, L, M) {
    const big = M.key === 'darkLord';
    push(0, 0, 0, big ? 1.1 : 1);
    biped(Q, L, {
      fly: 1, leg: [9, 9, 4, 3], arm: [11, 10, 4.4, 3.6], sh: 19, nk: 21, hs: 1.2, headH: 14, hipW: 2.5, lean: 6,
      wing: (root, far) => batWing(root, lerp(clamp(0.3 + wave(Q.ph) * 0.5 + Q.wf * 0.7, -1, 1), -1, Q.de) + (far ? 0.12 : 0), big ? 1.35 : 1.2, L.mem, L.dark),
      tail: (r) => { const sw = wave(Q.ph, 0.25) * 10 + Q.tl; const t = chain(r, [150 + sw, 120 + sw, 150 + sw, 200 + sw], [6, 6, 5, 4]); Tb(t, 2.2, 1, L.skin); const e = t[4]; Pl([e, at(e, 200 + sw - 50, 3.6), at(e, 200 + sw, 5), at(e, 200 + sw + 50, 3.6)], L.dark); },
      torso: () => {
        E(0, -12, 10.5, 12.5, 0, L.skin); E(3, -14, 7, 7, 0, L.chest, { no: 1 });
        Ln([[2, -18], [3.5, -12], [2.6, -7]], 0.6, tone(L.chest, 'hide').at(-0.6));
        for (let i = 0; i < 3; i++) Ln([[1, -7 + i * 2.4], [6, -6.6 + i * 2.4]], 0.5, tone(L.skin, 'hide').at(-0.6));
        if (big) { C([-9, -21], [9, -21], 3, 3, L.cape); Pl([[-10, -22], [-14, 4], [-4, 2], [-8, -8]], L.cape, { sm: 1 }); E(4, -15, 2.4, 2.4, 0, L.gem, { m: 'soft' }); Gl(4, -15, 6 + 4 * Q.gl, L.gem, 0.6); }
      },
      head: () => demonHead(Q, L, big),
      hand: (p, a) => clawHand(p, a, 3.4, L.arm, L.claw),
      foot: (f) => { E(f[0] + 1, f[1] - 1.6, 3, 2, 0, L.leg); horn([f[0] + 3, f[1] - 1.2], 30, 2.4, 0.8, 30, L.claw); },
    });
    pop();
  }
  DEFS.demon = { fly: 1, hov: 6, melee: 'claw', ranged: 'orb', fig: figDemon, look: () => ({ skin: '#5a3478', arm: '#6a3a8a', leg: '#4a2a64', chest: '#7a4a9a', dark: '#2a1640', mem: '#4a2a64', horn: '#f0e8f4', claw: '#e8d8f0', eye: EYE_R, gem: '#c66aff' }) };
  DEFS.darkLord = { fly: 1, hov: 6, melee: 'claw', ranged: 'orb', aura: '#a040ff', fig: figDemon, look: () => ({ skin: '#4a2a64', arm: '#5a3478', leg: '#3a2050', chest: '#6a3a8a', dark: '#1a0a2a', mem: '#3a1a4a', horn: '#f0e8f4', claw: GOLD, eye: '#ff3030', gem: '#ff4a6a', cape: '#8a1424' }) };

  // 石像鬼：蹲伏的石头小魔，有翼
  function figGargoyle(Q, L) {
    biped(Q, L, {
      fly: 1, leg: [6.5, 6.5, 3, 2.2], arm: [7.5, 7, 2.8, 2.2], sh: 12, nk: 13.5, hs: 1.2, headH: 11, hipW: 1.5, lean: 18,
      wing: (root, far) => batWing(root, lerp(clamp(0.3 + wave(Q.ph) * 0.55 + Q.wf * 0.7, -1, 1), -1, Q.de) + (far ? 0.12 : 0), 0.95, L.mem, L.dark),
      tail: (r) => { const sw = wave(Q.ph, 0.25) * 10 + Q.tl; const t = chain(r, [160 + sw, 140 + sw, 170 + sw], [5, 5, 4]); Tb(t, 1.8, 0.9, L.skin); const e = t[3]; Pl([e, at(e, 120, 3), at(e, 170, 4.5), at(e, 220, 3)], L.dark); },
      torso: () => { E(0, -6.5, 6.6, 7.6, 0, L.skin); E(2, -6, 4, 5, 0, L.light, { no: 1 }); for (const [x, y] of [[-3, -9], [1, -3], [-2, -3]]) Ln([[x, y], [x + 2, y + 1.6]], 0.5, tone(L.skin, 'hide').at(-0.6)); },
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        horn([-2, -4], -130, 6, 1.5, -50, L.horn); horn([0.5, -4.6], -100, 5, 1.4, -40, L.horn);
        Pl([[-3, -2], [-7, -6.6], [-2.4, 0]], L.skin);
        E(0.6, -0.6, 5, 4.8, 0, L.skin);
        push(1.8, 2, mo * 30); C([0, 0], [4.6, 0.4], 2, 1.5, L.skin); fangs([1, -1.4], [4.4, -1.2], 3, 0.9, false); pop();
        if (mo > 0.1) F(4.4, 2.4 + mo, 1.5, 0.5 + mo * 1.2, 0, '#2a0a14');
        C([3, -0.8], [6, 0.8], 1.8, 1.4, L.skin);
        E(3, -2.8, 2.8, 1.1, -12, L.dark);
        eye(3.2, -1.4, 1.3, L.eye, Q);
        anc('mouth', 5.8, 2.4);
        if (Q.gl > 0.05) Gl(5.8, 2.4, 3 + 6 * Q.gl, L.gem, 0.9 * Q.gl);
      },
      hand: (p, a) => clawHand(p, a, 2.4, L.skin, L.claw),
      foot: (f) => { E(f[0] + 0.8, f[1] - 1.2, 2.4, 1.5, 0, L.skin); horn([f[0] + 2.6, f[1] - 1], 40, 1.8, 0.6, 30, L.claw); },
    });
  }
  DEFS.gargoyle = { sz: 1.1, fly: 1, hov: 6, melee: 'claw', ranged: 'orb', fig: figGargoyle, look: () => ({ skin: '#8a8a9a', arm: '#8a8a9a', leg: '#7a7a8a', light: '#a4a4b4', dark: '#4a4a5a', mem: '#6a6a7c', horn: '#d8d4cc', claw: '#d8d4cc', eye: EYE_R, gem: '#ff6a5a' }) };

  // 自动士兵 / 高科技战士：白色装甲、红色护目镜
  function figRobot(Q, L) {
    biped(Q, L, {
      leg: [8, 8, 3.4, 2.8], arm: [8, 8, 3.2, 2.8], sh: 15, nk: 16.5, hs: 1.12, headH: 10, hipW: 2, stride: 3, lean: 4,
      torso: () => {
        Pl([[-6, -1], [-7.4, -12], [-5, -17], [6, -17], [7.6, -12], [6, -1]], L.armor, { m: 'metal', sm: 1 });
        Pl([[-2, -15], [5, -15], [6, -9], [1, -8]], L.plate, { m: 'metal', sm: 1, no: 1 });
        E(3, -12, 2, 2, 0, L.light, { m: 'flat', no: 1 }); Gl(3, -12, 4.5 + Q.gl * 4, L.light, 0.8);
        C([-6, -1], [6, -1], 1.6, 1.6, L.trim, { m: 'metal' });
        Ln([[-5, -6], [5, -6]], 0.5, tone(L.armor, 'metal').at(-0.6));
      },
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        Pl([[-4.5, 3.5], [-5.4, -3], [-3, -6.4], [3.4, -6.4], [5.6, -3], [5.4, 3.5]], L.armor, { m: 'metal', sm: 1 });
        C([0, -3], [6, -1.6], 1.8, 1.6, L.visor, { m: 'soft' });
        Gl(5, -2, 3 + Q.gl * 4, L.visor, 0.7);
        Pl([[1.6, 1.2], [5.6, 1.2 + mo], [5.6, 3.2 + mo], [1.6, 3]], L.trim, { m: 'metal' });
        C([-2, -6.2], [-3.6, -10], 0.6, 0.4, L.trim, { m: 'metal' }); E(-3.6, -10.4, 1.1, 1.1, 0, L.visor, { m: 'soft' });
        anc('mouth', 6, -1.6);
      },
      hand: (p, a, back) => { E(p[0], p[1], 3, 2.7, a, L.trim, { m: 'metal' }); if (!back) { const t = at(p, a, 3); anc('tip', t[0], t[1]); if (Q.gl > 0.05) Gl(t[0], t[1], 3 + 6 * Q.gl, L.visor, Q.gl); } },
      foot: (f) => Pl([[f[0] - 2.4, f[1] - 3.2], [f[0] + 3, f[1] - 3.2], [f[0] + 4.6, f[1]], [f[0] - 2.6, f[1]]], L.trim, { m: 'metal', sm: 0 }),
    });
  }
  DEFS.robot = { sz: 1.08, melee: 'whip', ranged: 'laser', fig: figRobot, look: M => ({ armor: '#e8eef8', plate: '#c4ccd8', arm: '#d6dcea', leg: '#c4ccd8', trim: M.cls === 'techWarrior' ? '#7a8296' : '#f4c542', visor: '#ff3a3a', light: M.team === 'enemy' || M.team === 'rogue' ? '#ff5a4a' : M.team === 'ally' ? '#4ad87a' : '#4a9aff', gem: '#ff5a5a' }) };

  // 天使：白翼、光环、白袍
  function figAngel(Q, L) {
    biped(Q, L, {
      fly: 1, leg: [7, 7, 2.6, 2], arm: [7, 7, 2.2, 1.7], sh: 13, nk: 14.5, hs: 1.1, headH: 14, hipW: 1.2, lean: 2,
      wing: (root, far) => featherWing(root, lerp(clamp(0.35 + wave(Q.ph) * 0.4 + Q.wf * 0.6, -1, 1), -1, Q.de) + (far ? 0.12 : 0), 0.95, L.wing, L.wing2),
      torso: () => {
        Pl([[-5, 6], [-5.6, -4], [-4, -14], [4.6, -14], [5.6, -4], [6, 6]], L.robe, { m: 'cloth', sm: 1 });
        C([-4.6, -5], [5, -5], 1.2, 1.2, L.gold, { m: 'metal' });
        for (let i = 0; i < 3; i++) Ln([[-3 + i * 3, -3], [-3.5 + i * 3.4, 5.6]], 0.5, tone(L.robe, 'cloth').at(-0.5));
      },
      head: () => {
        const mo = clamp(Q.mo, 0, 1.2);
        E(0, -3, 6.4, 6.6, 0, L.skin, { m: 'skin' });
        Pl([[-6.6, -2], [-5.4, -9], [2, -10.6], [6, -6], [3, -6.4], [-2, -4], [-3, 1.6]], L.hair, { sm: 1 });
        F(4, 0.6 + mo * 0.4, 0.9, 0.3 + mo * 0.8, 0, '#a83a3a');
        eye(3.2, -2.6, 1.3, '#3a6ab8', Q, { white: 1, noGlow: 1, round: 1 });
        F(1.6, -0.4, 1.4, 0.8, 0, 'rgba(255,140,150,0.5)');
        push(0, -12, 0); E(0, 0, 5, 1.6, -8, L.gold, { m: 'metal' }); F(0, -0.2, 3.4, 0.7, -8, tone(L.gold, 'metal').at(-0.6)); Gl(0, 0, 7, '#fff0a0', 0.5); pop();
        anc('mouth', 5, 0);
      },
      hand: (p, a, back) => { E(p[0], p[1], 1.6, 1.5, 0, L.skin, { m: 'skin' }); if (!back) { anc('tip', p[0] + 1, p[1]); if (Q.gl > 0.05) Gl(p[0] + 1, p[1], 3 + 7 * Q.gl, '#fff6c0', Q.gl); } },
      foot: (f) => E(f[0] + 0.6, f[1] - 0.8, 1.8, 1.1, 0, L.skin, { m: 'skin' }),
    });
  }
  DEFS.angel = { fly: 1, hov: 7, melee: 'whip', ranged: 'orb', fig: figAngel, look: () => ({ robe: '#f4f4fa', arm: '#f2c79a', leg: '#f2c79a', skin: '#f2c79a', hair: '#7a4a2a', wing: '#ffffff', wing2: '#dfe6f4', gold: '#f4c542', gem: '#fff6c0' }) };

  // ================= 梅莎 / 海妖：蛇尾女妖，头发是小蛇 =================
  function figMedusa(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), re = Q.re, cl = Q.cl, hd = Q.hd * (1 - de);
    // 蛇尾：地上盘一圈，尾尖向后卷
    part();
    const sw = wave(Q.ph, 0.25) * 8 + Q.tl;
    const tt = chain([-12, -3], [190 + sw * 0.3, 210 + sw, 250 + sw, 290 + sw], [4, 4, 3.4, 3]); Tb(tt, 3.2, 0.8, L.tail);
    part();
    E(-3, -4, 12, 4.6, 0, L.tail); E(-4, -2.4, 10, 2, 0, L.belly, { no: 1 });
    const waist = [3 + re * -2, -20 + cr * 4 + de * 12 + b * 0.5], lean = 4 - re * 20 + de * 40 - Q.hu * 10;
    const up = chain([4, -6], [-70 + de * 50, -95 + de * 60], [7, 8]);
    Tb([up[0], up[1], waist], 5.6, 4.6, L.tail);
    C(at(up[0], 0, 2), at(up[1], 0, 2), 2.6, 2.2, L.belly, { no: 1 });
    for (let i = 0; i < 4; i++) Ln([[-12 + i * 5, -6], [-10 + i * 5, -2]], 0.5, tone(L.tail, 'hide').at(-0.5));
    const R = p => rot2(p, waist, lean), sh = R([1, -9]), shF = R([-1.5, -9.5]);
    const arm = (s0, back) => { const u = 85 - cl * (back ? 0.8 : 1) + lean * 0.3 + b * 2 - Q.hu * 20 - (back ? 12 : 0); const el = at(s0, u, 5.6), h = at(el, u - 30, 5); C(s0, el, 1.6, 1.4, L.skin, { m: 'skin' }); C(el, h, 1.3, 1.1, L.skin, { m: 'skin' }); clawHand(h, u - 30, 1.2, L.skin, '#c8ffb0'); return h; };
    part({ dim: 1 }); arm(shF, 1);
    // 后发（一大团）
    const nk = R([1.5, -12]), ha = lean * 0.5 - hd * 0.6 + Q.hu * -6;
    part(); push(nk[0], nk[1], ha, 1.15); E(-2.4, -5, 6.6, 7, 0, L.hair); pop();
    // 上身
    part(); push(waist[0], waist[1], lean);
    Pl([[-4, 1], [-4.6, -6], [-3.6, -11], [3.4, -11], [4.4, -6], [4, 1]], L.top, { sm: 1 });
    C([-4.4, 0], [4.4, 0], 1.3, 1.3, L.gold, { m: 'metal' });
    E(2.4, -7.6, 2, 1.8, 0, L.top, { no: 1 });
    pop();
    // 头 + 蛇发
    part(); push(nk[0], nk[1], ha, 1.15);
    const mo = clamp(Q.mo, 0, 1.2);
    E(0.6, -4, 5.6, 5.8, 0, L.skin, { m: 'skin' });
    if (mo > 0.08) F(4.6, -1 + mo * 0.5, 1, 0.3 + mo * 0.9, 0, '#7a1a2a');
    eye(3, -4.4, 1.3, L.eye, Q, { white: 0 });
    F(1.8, -2.4, 1.2, 0.7, 0, 'rgba(255,120,140,0.45)');
    // 小蛇们
    const snakes = [[-4, -9, -140], [-1, -10.5, -110], [2.4, -9.6, -70], [-6, -5, 170], [-5, -1, 140]];
    snakes.forEach(([x, y, a], i) => {
      const w = wave(Q.ph, i * 0.21) * 16 * (1 - de) + Q.hu * 20;
      const pts = chain([x, y], [a + w, a + 30 + w * 1.4, a - 10 + w], [3, 3, 2.4]);
      Tb(pts, 1.5, 1.1, L.hair);
      const h = pts[3], ah = a - 10 + w;
      E(h[0], h[1], 1.6, 1.2, ah, L.hair); F(at(h, ah - 50, 0.7)[0], at(h, ah - 50, 0.7)[1], 0.35, 0.35, 0, '#ff3030');
    });
    Pl([[-5, -7], [0, -10.6], [5.6, -7.6], [3, -8.4], [-1, -7], [-4, -3]], L.hair, { sm: 1 });
    anc('mouth', 5, -1.4); anc('tip', 4.6, -4.4);
    if (Q.gl > 0.05) Gl(3.4, -4.4, 3 + 7 * Q.gl, L.gem, Q.gl);
    pop();
    anc('chest', R([1, -6])[0], R([1, -6])[1]); anc('top', nk[0], nk[1] - 15);
    part(); const h = arm(sh, 0); anc('hand', h[0], h[1]);
  }
  DEFS.medusa = { sz: 1.15, melee: 'claw', ranged: 'orb', fig: figMedusa, look: M => M.cls === 'siren'
    ? { tail: '#3a9aa8', belly: '#c8f0e8', hair: '#4ab8c8', top: '#3a8aa8', gold: '#f4c542', skin: '#f2c79a', eye: '#ff3a6a', gem: '#7af0ff' }
    : { tail: '#4a9a3c', belly: '#d8e8a0', hair: '#5aa04a', top: '#5aa04a', gold: '#f4c542', skin: '#f2c79a', eye: EYE_R, gem: '#9aff6a' } };

  // ================= 节肢：巨蝎 / 巨蜘蛛 =================
  function figScorpion(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), cl = Q.cl, tl = Q.tl * (1 - de);
    const by = -7 + cr * 2 + de * 3, pitch = -Q.re * 8;
    const legs = (dim) => { part({ dim }); for (let i = 0; i < 3; i++) { const hp = [-4 + i * 4 + (dim ? 1.5 : 0), by + 1], a = 200 - i * 40 + (dim ? 15 : 0) + wave(Q.ph, i * 0.3) * 3; const kn = at(hp, -60 + i * 25 + (dim ? -10 : 0), 5), ft = [hp[0] + (i - 1) * 6 + (dim ? 2 : -1), 0]; C(hp, kn, 1.2, 1, L.body); C(kn, ft, 1, 0.5, L.body); } };
    const claw = (dim) => {
      part({ dim });
      const s0 = [8, by - 1 + (dim ? -1 : 0)], ua = 30 - cl * 0.6 + (dim ? -10 : 0), el = at(s0, ua, 6), wr = at(el, ua - 60, 5);
      C(s0, el, 1.6, 1.4, L.body); C(el, wr, 1.5, 1.8, L.body);
      const op = 20 + Q.mo * 20 + (Q.ar ? 25 : 0);
      E(wr[0] + 2, wr[1], 3.4, 2.6, ua - 60, L.body);
      horn(at(wr, ua - 60, 3), ua - 60 - op, 5, 1.4, op * 0.8, L.body); horn(at(wr, ua - 60, 3), ua - 60 + op * 0.6, 4.2, 1.1, -op * 0.5, L.dark);
      return at(wr, ua - 60, 6);
    };
    legs(1); claw(1);
    // 尾：向上弯过背部，tl > 0 再后卷蓄力、< 0 往前刺
    part();
    const base = [-9, by - 1], A0 = [-150, -110, -72, -36, 0, 40], angs = A0.map((a, i) => lerp(a - tl * (0.22 + i * 0.12), 180, de * 0.7));
    const tail = chain(base, angs, [4.6, 4.4, 4.2, 4, 3.6, 3]);
    for (let i = 0; i < tail.length - 1; i++) E((tail[i][0] + tail[i + 1][0]) / 2, (tail[i][1] + tail[i + 1][1]) / 2, 3.2 - i * 0.25, 2.5 - i * 0.2, angs[i], L.body);
    const st = tail[tail.length - 1], sa = angs[angs.length - 1];
    E(st[0], st[1], 3, 2.4, sa, L.dark); const tip = horn(at(st, sa, 2), sa + 50, 5, 1.2, 70, '#2a1a10');
    anc('tip', tip[0], tip[1]);
    if (Q.gl > 0.05) Gl(tip[0], tip[1], 3 + 6 * Q.gl, L.gem, Q.gl);
    // 身体
    part(); push(0, by, pitch);
    for (let i = 0; i < 4; i++) E(-7 + i * 4.4, 0, 4, 3.6 - Math.abs(i - 1.5) * 0.3, 0, L.body);
    E(8, -0.6, 3.6, 3, 0, L.body);
    eye(9.4, -2.4, 0.9, L.eye, Q, { noGlow: 1 }); eye(7.8, -2.8, 0.7, L.eye, Q, { noGlow: 1 });
    anc('mouth', 11.4, 0.4);
    pop();
    legs(0); anc('hand', ...claw(0));
    anc('chest', 0, by - 2); anc('top', -2, by - 18);
  }
  DEFS.scorpion = { sz: 1.3, melee: 'sting', ranged: 'orb', fig: figScorpion, look: () => ({ body: '#c8862a', dark: '#7a4a1a', eye: '#ff3030', gem: '#a0ff60' }) };

  function figSpider(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), mo = clamp(Q.mo, 0, 1.2);
    const by = -9 + cr * 3 + de * 5 + b * 0.4, pitch = -Q.re * 18;
    const legs = dim => {
      part({ dim });
      for (let i = 0; i < 4; i++) {
        const hp = rot2([1.5 + i * 1.2 - 2, 0], [0, by], pitch), up = Q.re > 0.3 && i === 3 ? 1 : 0;
        const ft = up ? at(hp, -20 - Q.cl * 0.3, 14) : [hp[0] + (i - 1.5) * 9 + (dim ? 2 : 0) + wave(Q.ph, i * 0.25) * 0.8, 0];
        const kn = up ? at(hp, -70, 7) : [lerp(hp[0], ft[0], 0.45), by - 9 + Math.abs(i - 1.5) * 1.6 - (dim ? 1 : 0)];
        C(hp, kn, 1.3, 1.1, L.body); C(kn, ft, 1.1, 0.5, L.body);
        F(kn[0], kn[1], 0.7, 0.7, 0, L.mark);
      }
    };
    legs(1);
    part(); push(0, by, pitch);
    E(-9, -3, 9, 8, -10, L.body); for (const [x, y] of [[-9, -7], [-12, -3], [-7, -2]]) F(x, y, 1.6, 1, -20, L.mark);
    Pl([[-10, -9], [-8, -10.4], [-6.6, -8.6], [-8.4, -7.4]], L.mark, { m: 'flat', no: 1 });
    E(3, -0.6, 5.4, 4.4, 0, L.body);
    push(6.6, 1.4, 0);
    const fa = 30 + mo * 30;
    horn([0, -0.4], fa, 4, 1.2, 60, L.fang); horn([-0.8, 0.4], fa + 20, 3.6, 1.1, 60, L.fang);
    pop();
    for (const [x, y, r] of [[5.6, -2.6, 1], [7, -1.4, 0.9], [4, -3.2, 0.7], [6.6, -3.4, 0.6]]) eye(x, y, r, L.eye, Q, { noGlow: r < 0.8, round: 1 });
    anc('mouth', 8.6, 2.6); anc('chest', 0, -2);
    if (Q.gl > 0.05) Gl(-14, 0, 3 + 6 * Q.gl, L.gem, Q.gl);
    pop();
    legs(0);
    anc('top', -8, by - 12);
  }
  DEFS.spider = { sz: 1.35, melee: 'bite', ranged: 'orb', fig: figSpider, look: () => ({ body: '#4a2a64', mark: '#8a4ab0', fang: '#d8d0c8', eye: EYE_R, gem: '#f0f0ff' }) };

  // ================= 黏怪 =================
  function figSlime(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.4, 1.2), mo = clamp(Q.mo, 0, 1.2);
    const h = 15 * (1 - cr * 0.3 - de * 0.55) * (1 + b * 0.04), w = 12 * (1 + cr * 0.22 + de * 0.4) * (1 - b * 0.03), lean = -Q.re * 4 + Q.hd * -0.08;
    part();
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU, c = Math.cos(a), s = Math.sin(a);
      const y = s < 0 ? -h * 0.55 - (-s) * h * 0.6 : -h * 0.55 + s * h * 0.55;
      pts.push([c * w * (s > 0 ? 1.08 : 0.92) + (s < 0 ? lean * (-s) * 3 : 0), Math.min(0, y)]);
    }
    Pl(pts, L.body, { sm: 1, m: 'soft' });
    F(-w * 0.4, -h * 0.9, w * 0.22, h * 0.12, -30, 'rgba(255,255,255,0.75)');
    F(-w * 0.62, -h * 0.6, w * 0.07, h * 0.06, 0, 'rgba(255,255,255,0.8)');
    for (const [x, y, r] of [[-3, -3, 1.4], [4, -5, 0.9], [-6, -6, 0.7]]) F(x, y, r, r, 0, tone(L.body, 'soft').at(0.5));
    eye(w * 0.25, -h * 0.68, 1.9, '#1a1020', Q, { white: 1, noGlow: 1, round: 1 }); eye(w * 0.62, -h * 0.66, 1.6, '#1a1020', Q, { white: 1, noGlow: 1, round: 1 });
    if (mo > 0.08 || Q.hu > 0.4) F(w * 0.48, -h * 0.4, 1.6, 0.4 + mo * 1.4, 0, '#2a1a2a');
    else Ln([[w * 0.3, -h * 0.44], [w * 0.46, -h * 0.38], [w * 0.62, -h * 0.44]], 0.6, '#1a1020');
    anc('mouth', w * 0.8, -h * 0.45); anc('chest', 0, -h * 0.5); anc('top', 0, -h * 1.1);
    if (Q.gl > 0.05) Gl(w * 0.8, -h * 0.5, 3 + 6 * Q.gl, L.gem, Q.gl);
  }
  DEFS.slime = { sz: 1.4, melee: 'tackle', ranged: 'orb', fig: figSlime, look: M => { const [b] = varCol(M.v, VAR.green); return { body: b, gem: '#9aff6a' }; } };

  // ================= 四元素精灵 =================
  function figSpirit(Q, L, M) {
    const b = wave(Q.ph), de = Q.de, el = L.el, mo = clamp(Q.mo, 0, 1.2), lean = 10 - Q.re * 20 + de * 40 - Q.hu * 10;
    push(0, -15 + de * 8 + b * 0.6, lean);
    const flap = lerp(clamp(0.2 + b * 0.7 + Q.wf * 0.6, -1, 1), -1, de);
    // 元素翼 / 尾
    const wing = (far) => {
      part({ dim: far });
      const r = [-3, -4 + (far ? -1 : 0)], a = -140 - flap * 25 + (far ? 12 : 0);
      if (el === 'fire') { for (let i = 0; i < 3; i++) { const t = at(r, a + i * 28, 10 - i * 2); Pl([at(r, a + i * 28 - 70, 2), at(lerp2(r, t, 0.6), a + i * 28 - 90, 2), t, at(lerp2(r, t, 0.5), a + i * 28 + 80, 1.5)], i ? L.dark : L.body, { sm: 1 }); } }
      else if (el === 'water') { const t = at(r, a, 10); Pl([at(r, a - 80, 2), t, at(r, a + 60, 2.5)], L.light, { sm: 1, m: 'soft' }); Ln([r, t], 0.5, 'rgba(255,255,255,0.7)'); }
      else if (el === 'wind') { for (let i = 0; i < 2; i++) { const t = at(r, a + i * 30, 11 - i * 3); Pl([r, at(lerp2(r, t, 0.5), a + i * 30 - 90, 3), t, at(lerp2(r, t, 0.5), a + i * 30 + 90, 2.4)], i ? L.dark : L.light, { sm: 1 }); Ln([r, t], 0.5, tone(L.dark, 'hide').at(-0.5)); } }
      else { const t = at(r, a, 8); Pl([at(r, a - 60, 2.4), at(lerp2(r, t, 0.6), a - 80, 3), t, at(lerp2(r, t, 0.5), a + 70, 2.4)], L.dark, {}); }
    };
    wing(1);
    // 尾部（漂浮的元素尾巴）
    part();
    const tw = wave(Q.ph, 0.3) * 10;
    const tail = chain([-1, 6], [110 + tw, 140 + tw, 170 + tw], [4, 3.6, 3]);
    Tb(tail, 3.6, 0.8, L.body, { m: 'soft' });
    // 身体 + 面具
    part();
    E(0, 0, 7, 8, 0, L.body, { m: 'soft' });
    E(1.6, 2.4, 4, 4.6, 0, L.light, { no: 1, m: 'soft' });
    if (el === 'earth') { Pl([[-6, -2], [-3, -7], [2, -7.6], [-1, -3]], L.dark); Pl([[-6, 3], [-2, 0], [-3, 6]], L.dark); }
    if (el === 'fire') { for (let i = 0; i < 4; i++) { const x = -5 + i * 3, hh = 6 + 3 * wave(Q.ph * 2, i * 0.3); Pl([[x - 2, -5], [x + wave(Q.ph * 2, i * 0.27) * 1.2, -5 - hh], [x + 2, -5]], i % 2 ? '#ffd040' : L.body, { sm: 1, no: 1, m: 'soft' }); } }
    if (el === 'water') for (let i = 0; i < 3; i++) F(-4 + i * 2.8, -5 - wave(Q.ph, i * 0.3) * 1.2, 0.9, 0.9, 0, 'rgba(255,255,255,0.75)');
    if (el === 'wind') Ln([[-5, -2], [-1, -6], [3, -4], [1, -1.6]], 0.8, 'rgba(255,255,255,0.7)', { sm: 1 });
    // 白色面具（地图精灵的白脸）
    push(3, -2.4, 0);
    E(0, 0, 4.2, 4.6, 0, '#f4f4fa', { m: 'soft' });
    if (Q.de > 0.6 || Q.hu > 0.4) eye(1.6, -0.6, 1.2, '#1a1020', Q);
    else { F(1.2, -0.8, 1.1, 1.6, 0, '#1a1020'); F(3.2, -0.6, 0.9, 1.4, 0, '#1a1020'); F(0.9, -1.3, 0.35, 0.45, 0, '#ffffff'); F(2.9, -1.1, 0.3, 0.4, 0, '#ffffff'); }
    F(2.4, 2.2, 1, 0.3 + mo * 0.8, 0, '#3a1a2a');
    anc('mouth', 4.4, 1.6);
    pop();
    // 小手
    const ua = 60 - Q.cl * 0.9;
    const hand = at([3, 3], ua, 6);
    C([3, 3], hand, 1.6, 1.3, L.body, { m: 'soft' }); E(hand[0], hand[1], 1.7, 1.6, 0, L.light, { m: 'soft' });
    anc('hand', hand[0], hand[1]); anc('tip', hand[0] + 1, hand[1]);
    if (Q.gl > 0.05) Gl(hand[0] + 1, hand[1], 3 + 7 * Q.gl, L.gem, Q.gl);
    Gl(0, 0, 12, L.gem, 0.22 + 0.08 * b);
    anc('chest', 0, 0); anc('top', 0, -12);
    wing(0);
    pop();
  }
  const SPIRIT = {
    spiritFire: { el: 'fire', body: '#ff7a2a', light: '#ffd070', dark: '#d8401a', gem: '#ff8a3a' },
    spiritWater: { el: 'water', body: '#6ab8f4', light: '#d0f0ff', dark: '#3a7ac8', gem: '#7ad0ff' },
    spiritWind: { el: 'wind', body: '#6ac85a', light: '#c8f4a8', dark: '#3a8a3a', gem: '#8ae8a0' },
    spiritEarth: { el: 'earth', body: '#d8963a', light: '#f8d8a0', dark: '#8a5a2a', gem: '#e0c090' },
  };
  for (const k in SPIRIT) DEFS[k] = { sz: 1.45, fly: 1, hov: 8, melee: 'tackle', ranged: 'orb', aura: SPIRIT[k].gem, fig: figSpirit, look: () => SPIRIT[k] };

  // ================= 大风：旋转的龙卷 =================
  function figWind(Q, L) {
    const de = Q.de, cr = clamp(Q.cr, -0.4, 1.2), sp = Q.ph * TAU * 2, lean = -Q.re * 10 + Q.hd * -0.3 + Q.hu * -8;
    const H = 44 * (1 - cr * 0.15) * (1 - de * 0.7);
    part({ ol: false });
    for (let i = 9; i >= 0; i--) {
      const t = i / 9, y = -t * H, r = 2.4 + t * t * 15 + t * 3, x = Math.sin(sp + t * 5) * (2 + t * 3) + t * lean * 0.6;
      E(x, y, r, 2.2 + t * 2.2, 0, i % 2 ? L.light : L.body, { m: 'soft', no: 1 });
      const sx = x + Math.cos(sp * 1.5 + i) * r * 0.8;
      Ln([[sx - r * 0.5, y - 0.6], [sx + r * 0.4, y + 0.8]], 0.6, 'rgba(255,255,255,0.8)');
    }
    for (let i = 0; i < 4; i++) { const a = sp + i * 1.6, t = (i + 1) / 5, x = Math.cos(a) * (6 + t * 12), y = -t * H * 0.9; E(x, y, 1.2, 0.8, a * 30, i % 2 ? '#8a7a5a' : '#5a8a3a', { m: 'soft', no: 1 }); }
    F(0, -0.6, 5, 1.6, 0, 'rgba(255,255,255,0.4)');
    anc('mouth', 12 + lean * 0.5, -H * 0.75); anc('chest', 2, -H * 0.5); anc('top', 0, -H - 4); anc('tip', 14, -H * 0.6);
    if (Q.gl > 0.05) Gl(10, -H * 0.6, 4 + 8 * Q.gl, '#e0f8ff', Q.gl);
  }
  DEFS.wind = { fly: 1, hov: 2, per: 700, melee: 'tackle', ranged: 'wave', fig: figWind, look: () => ({ body: '#9ad8f4', light: '#e8f8ff', gem: '#c8f0ff' }) };

  // ================= 洛克鸟 =================
  function figRoc(Q, L) {
    const b = wave(Q.ph), de = Q.de, cr = clamp(Q.cr, -0.3, 1.2), hd = Q.hd * (1 - de), mo = clamp(Q.mo, 0, 1.2);
    const flap = lerp(clamp(0.2 + b * 0.8 + Q.wf * 0.6, -1, 1), -1, de);
    push(0, -22 + cr * 3 + de * 12 + b * 0.8, -Q.re * 20 + de * 10 + 8);
    part({ dim: 1 }); featherWing([0, -5], flap + 0.12, 1.1, L.wing, L.wing2);
    // 爪：cl 向前抓
    const talon = (dim) => { part({ dim }); const hp = [2 - (dim ? 2 : 0), 6], ua = 80 - Q.cl * 0.7 - (dim ? 10 : 0), kn = at(hp, ua, 6), ft = at(kn, ua + 20, 5); C(hp, kn, 2.6, 1.6, L.body); C(kn, ft, 1.2, 1, L.leg); for (let k = 0; k < 3; k++) horn(ft, ua - 30 + k * 40, 3.4, 0.9, 60, '#2a1a10'); return ft; };
    talon(1);
    part();
    Pl([[-10, -1], [-20, -4 + b * 2], [-21, 1 + b * 2], [-19, 4 + b * 2], [-9, 3]], L.wing2, { sm: 1 });
    E(0, 0, 10, 7.6, -10, L.body); E(3, 2.6, 7, 4, -10, L.belly, { no: 1 });
    anc('chest', 2, 0);
    part();
    push(9, -6, -hd * 0.8 + de * 30 + 10);
    E(0, -1, 5, 4.6, 0, L.body);
    Pl([[-4, -3], [-8, -6], [-6, -2.4], [-9, -2], [-4, 0]], L.wing2, { sm: 1 });
    push(3, 0.8, mo * 24); Pl([[0, 0], [5, 0.4], [7.4, 1.6], [4, 2.2], [0, 1.6]], L.beak, { m: 'skin', sm: 1 }); pop();
    Pl([[2.4, -2.4], [7.6, -1], [10, 2.4], [8.6, 2], [6.2, 0.8], [2.4, 1]], L.beak, { m: 'skin', sm: 1 });
    eye(2, -1.6, 1.3, '#ffcc30', Q, { noGlow: 1 });
    E(2.4, -3.2, 2.6, 1, -14, L.dark);
    anc('mouth', 9.6, 2); anc('top', 0, -8);
    pop();
    const ft = talon(0); anc('hand', ft[0], ft[1]);
    part(); featherWing([-2, -4], flap, 1.2, L.wing, L.wing2);
    pop();
  }
  DEFS.roc = { fly: 1, hov: 8, melee: 'claw', ranged: 'wave', fig: figRoc, look: () => ({ body: '#ff9a3a', belly: '#ffd8a0', wing: '#a0602a', wing2: '#7a4520', dark: '#7a4520', leg: '#f4c542', beak: '#f4d060', gem: '#ffe0a0' }) };

  // ================= 主控台 / 防卫炮台 =================
  function figConsole(Q, L) {
    const de = Q.de, b = wave(Q.ph), gl = Q.gl, hu = Q.hu;
    part();
    Pl([[-12, 0], [-12, -12], [12, -12], [14, 0]], L.case, { m: 'metal' });
    Pl([[-12, -12], [-9, -15], [13, -15], [12, -12]], L.top, { m: 'metal' });
    for (let i = 0; i < 6; i++) { const c = ['#ff4a4a', '#f4c542', '#4ad87a', '#4a9aff', '#ff8a2a', '#c66aff'][i]; E(-8 + i * 3.4, -13.4, 1, 0.6, 0, c, { m: 'soft' }); if ((i + Math.floor(Q.ph * 8)) % 3 === 0) Gl(-8 + i * 3.4, -13.4, 2.2, c, 0.8); }
    for (let i = 0; i < 3; i++) Ln([[-10, -9 + i * 3], [10, -9 + i * 3]], 0.5, tone(L.case, 'metal').at(-0.6));
    // 屏幕（向前倾的显示器）
    part();
    const tilt = -10 - Q.re * 10 + de * 40 + hu * 10;
    push(0, -15, tilt);
    Pl([[-10, 0], [-10, -18], [11, -19], [12, 0]], L.case, { m: 'metal' });
    Pl([[-8, -2], [-8, -16], [9, -17], [10, -2]], hu > 0.4 || de > 0.5 ? '#c8c8d8' : L.screen, { m: 'soft' });
    if (!(hu > 0.4 || de > 0.5)) {
      // 屏幕上的「眼睛」与扫描线
      for (let i = 0; i < 5; i++) Ln([[-7, -14 + i * 2.8], [9, -14.4 + i * 2.8]], 0.35, 'rgba(255,255,255,0.25)');
      const ex = 2 + b * 1.4;
      E(ex - 3, -9.5, 2.4, 2.4, 0, L.eye, { m: 'flat', no: 1 }); E(ex + 3.6, -9.6, 2.4, 2.4, 0, L.eye, { m: 'flat', no: 1 });
      Gl(ex, -9.6, 8 + gl * 6, L.eye, 0.4 + gl * 0.5);
    } else for (let i = 0; i < 6; i++) Ln([[-7, -14 + i * 2.2], [9, -13.6 + i * 2.2 + (i % 2)]], 0.6, i % 2 ? '#5a5a6a' : '#f0f0f8');
    anc('tip', 11, -9.6); anc('mouth', 11, -9.6);
    if (gl > 0.05) Gl(11, -9.6, 4 + 8 * gl, L.eye, gl);
    pop();
    anc('chest', 0, -16); anc('top', 0, -36);
  }
  DEFS.console = { meleeRanged: 'laser', ranged: 'laser', fig: figConsole, look: () => ({ case: '#9a9aa8', top: '#c4ccd8', screen: '#2a8ad8', eye: '#7ad8ff', gem: '#ff5a5a' }) };


  // ================= 动作编排 =================
  // 语意名 → DFIG 姿势栏位（DFIG.stance 对非纸娃娃回传 P0，这些栏位都有基准值）
  const FLD = { mouth: 'mo', head: 'hd', wing: 'wf', glow: 'glw', crouch: 'ga', hurt: 'mp', dead: 'dr', arc: 'tr', rear: 'two' };
  function conv(o) {
    const r = {};
    for (const k in o) { const v = o[k]; if (k === 'claw') r.fe = 80 + v; else if (k === 'tail') r.be = 14 + v; else r[FLD[k] || k] = v; }
    return r;
  }
  const EASE = { in: t => t * t, out: t => 1 - (1 - t) * (1 - t), lin: t => t, io: t => t * t * (3 - 2 * t) };
  const kf = arr => arr.map(([t, o, e]) => ({ t, p: conv(o || {}), e: EASE[e || 'io'] }));
  // 近战：冲刺 → 蓄力（停一拍）→ 出手 → 收势 → 跃回
  function meleePlan(kind, D, crit) {
    const back = [[780, { X: 0.3, Y: -8 }], [920, {}]];
    if (kind === 'claw') return { style: 'claw', impact: 420, glint: [200, 180], dur: 940, keys: kf([[0, {}], [140, { X: 0.12, crouch: 0.4, rear: 0.2 }], [240, { X: 0.62, rear: 0.7, claw: 110, wing: 1, Y: -8, mouth: 0.5, head: 10 }], [330, { X: 0.84, rear: 0.85, claw: 125, wing: 1, Y: -12, mouth: 0.6, head: 12 }], [410, { X: 1, rear: -0.1, claw: -30, arc: 1, Y: 0, head: -14, mouth: 1, wing: -0.6 }, 'in'], [450, { X: 1.03, rear: -0.15, claw: -40, arc: 1, mouth: 0.8, sq: 0.08 }], [600, { X: 1, claw: -18, mouth: 0.3 }], [800, { X: 0.3, Y: -8 }], [940, {}]]) };
    if (kind === 'slam') return { style: 'chop', heavy: 1, impact: 470, glint: [240, 200], dur: 1000, keys: kf([[0, {}], [120, { X: 0.2, crouch: 0.3 }], [260, { X: 0.7, crouch: 0.7, claw: 40, sq: -0.08 }], [380, { X: 0.92, Y: -16, rear: 0.9, claw: 165, mouth: 0.6, head: 14, sq: -0.1 }], [460, { X: 1, Y: 0, rear: -0.3, claw: -10, crouch: 0.6, arc: 1, mouth: 1, head: -12, sq: 0.14 }, 'in'], [520, { X: 1, rear: -0.25, claw: -14, crouch: 0.7, arc: 1, sq: 0.1 }], [680, { X: 1, crouch: 0.3, claw: 0 }], [860, { X: 0.3, Y: -8 }], [1000, {}]]) };
    if (kind === 'sting') return { style: 'thrust', impact: 420, glint: [220, 180], dur: 920, keys: kf([[0, {}], [120, { X: 0.25, crouch: 0.2 }], [280, { X: 0.85, tail: 60, rear: 0.3, claw: 40, mouth: 0.4 }], [360, { X: 0.9, tail: 75, rear: 0.35, claw: 50, mouth: 0.5 }], [420, { X: 1, tail: -50, arc: 1, rear: -0.2, claw: -10, mouth: 1 }, 'in'], [470, { X: 1.02, tail: -58, arc: 1, sq: 0.08 }], [620, { X: 1, tail: -20 }], ...back]) };
    if (kind === 'tackle') return { style: 'bonk', impact: 380, glint: [160, 160], dur: 880, keys: kf([[0, {}], [160, { X: -0.04, crouch: 0.8, sq: 0.22, mouth: 0.3 }], [250, { X: -0.04, crouch: 0.9, sq: 0.26, mouth: 0.3 }], [320, { X: 0.6, Y: -18, crouch: -0.3, sq: -0.2, mouth: 0.8, rear: 0.4 }, 'out'], [380, { X: 1, Y: 0, crouch: 0.3, sq: 0.18, mouth: 1, arc: 1, rear: -0.2 }, 'in'], [430, { X: 1.03, crouch: 0.6, sq: 0.25 }], [580, { X: 1, sq: 0 }], ...back]) };
    if (kind === 'whip') return { style: 'chop', impact: 420, glint: [200, 180], dur: 920, keys: kf([[0, {}], [140, { X: 0.25 }], [300, { X: 0.82, claw: 150, rear: 0.6, mouth: 0.4, head: 10 }], [360, { X: 0.86, claw: 160, rear: 0.7, mouth: 0.5, head: 12 }], [430, { X: 1, claw: -40, rear: -0.2, arc: 1, mouth: 1, head: -10 }, 'in'], [470, { X: 1.02, claw: -50, arc: 1, sq: 0.06 }], [620, { X: 1, claw: -20 }], ...back]) };
    // bite：后仰蓄力 → 扑咬
    return { style: 'bite', impact: 400, glint: [180, 170], dur: 920, puff: D.puff ? 330 : undefined, keys: kf([[0, {}], [170, { X: -0.05, crouch: 0.5, head: 20, mouth: 0.35, sq: -0.06, rear: 0.3, wing: 0.8 }], [270, { X: -0.06, crouch: 0.55, head: 22, mouth: 0.45, sq: -0.07, rear: 0.35, wing: 1 }], [370, { X: 1, crouch: 0, head: -24, mouth: 1.1, sq: 0.06, rear: -0.25, wing: -0.6 }, 'in'], [410, { X: 1.03, head: -28, mouth: 0.05, sq: 0.12, rear: -0.25 }], [580, { X: 1, head: -12, mouth: 0.1 }], ...back]) };
  }
  // 远程：吐息 / 施法（蓄力光）
  function rangedPlan(kind, D) {
    if (kind === 'breath') return { style: 'breath', release: 300, fly: 260, glint: [120, 170], dur: 820, keys: kf([[0, {}], [200, { head: 26, mouth: 0.45, rear: 0.45, glow: 0.6, wing: 1, sq: -0.05 }], [270, { head: 28, mouth: 0.5, rear: 0.5, glow: 0.8, wing: 1 }], [320, { head: -8, mouth: 1.15, rear: -0.1, glow: 1, sq: 0.06, dx: -3 }, 'out'], [600, { head: -6, mouth: 1.1, rear: -0.05, glow: 0.5 }], [820, {}]]) };
    const style = kind === 'cast' ? 'orb' : kind;
    return { style, release: 320, fly: kind === 'laser' ? 160 : kind === 'rock' ? 260 : 240, glint: [140, 180], dur: 800, keys: kf([[0, {}], [220, { glow: 1, rear: 0.55, claw: 120, head: 12, mouth: 0.5, wing: 1, sq: -0.06 }], [290, { glow: 1, rear: 0.6, claw: 130, head: 14, mouth: 0.6, wing: 1 }], [340, { glow: 0.7, rear: -0.15, claw: 20, head: -10, mouth: 1, sq: 0.06, dx: -3 }, 'out'], [560, { glow: 0.3, claw: 30, mouth: 0.4 }], [800, {}]]) };
  }
  function react(kind) {
    if (kind === 'hit' || kind === 'crit') {
      const c = kind === 'crit' ? 1.8 : 1, d = kind === 'crit' ? 560 : 420;
      return { dur: d, keys: kf([[0, {}], [60, { dx: -6 * c, hurt: 1, head: 14 * c, mouth: 0.7, rot: -6 * c, sq: -0.08, rear: 0.35, wing: 0.6 }], [kind === 'crit' ? 260 : 200, { dx: -10 * c, hurt: 0.7, head: 4, mouth: 0.25, rot: -2, sq: 0.05, rear: 0.1 }], [d, {}]]) };
    }
    if (kind === 'dodge') return { dur: 420, keys: kf([[0, {}], [90, { dx: -16, Y: -10, rear: 0.45, wing: 1, sq: -0.06 }], [220, { dx: -18, Y: 0, crouch: 0.4, sq: 0.06 }], [420, {}]]) };
    return { dur: 720, hold: 1, keys: kf([[0, {}], [70, { dx: -14, Y: -6, hurt: 1, head: 26, mouth: 0.9, rear: 0.5, rot: -8, wing: 1 }, 'out'], [300, { dx: -20, dead: 0.5, crouch: 0.5, head: -8, rot: -6, mouth: 0.6, wing: 0.3 }], [520, { dx: -22, dead: 1, crouch: 1, head: -16, rot: -8, mouth: 0.4, wing: -0.8, al: 0.85 }], [720, { dx: -22, dead: 1, crouch: 1, head: -16, rot: -8, mouth: 0.4, wing: -0.8, al: 0 }]]) };
  }

  // ================= 规格与绘制（供 duel.js 挂钩） =================
  const SPEC_C = new Map();
  function spec(u) {
    if (!hdOn() || typeof DFIG === 'undefined' || typeof CLASSES === 'undefined') return null;
    let S; try { S = DFIG.specOf(u); } catch (e) { return null; }
    if (!S || S.kind !== 'sprite') return null;
    const CL = CLASSES[u.cls] || {}, key = S.sk, D = DEFS[key];
    if (!D) return null;
    const v = u.color || u.element || CL.spriteVariant || S.tintM || (S.ice ? 'ice' : '') || '';
    const tier = CL.spriteTier != null ? CL.spriteTier : (u.tier | 0), team = u.team || 'enemy';
    const id = [key, v, tier, team, u.cls, S.ice ? 'i' : ''].join('|');
    let R = SPEC_C.get(id);
    if (R) return R;
    const M = { id, key, D, v, tier, team, cls: u.cls, baby: u.cls === 'babyDragon' };
    M.L = D.look(M);
    R = Object.assign({}, S, { mon: M, wpn: { k: 'none', gem: M.L.gem || D.gem }, scale: D.scale || S.scale });
    const br = M.L.breath || D.breath; if (br) R.breath = br;
    const au = M.L.aura || D.aura; if (au) R.aura = au;
    SPEC_C.set(id, R);
    return R;
  }
  function plan(pl, S, ranged, crit) {
    const M = S && S.mon; if (!M) return pl;
    const D = M.D, kind = ranged ? D.ranged || 'cast' : D.melee || 'bite';
    const np = ranged || D.meleeRanged ? rangedPlan(ranged ? kind : D.meleeRanged, D) : meleePlan(kind, D, crit);
    for (const k in pl) delete pl[k];
    return Object.assign(pl, np);
  }
  function draw(g, u, S, P, opt) {
    const M = S && S.mon; if (!M || !hdOn()) return DFIG.draw(g, u, S, P, opt);
    const { x, feet, s, f, now, flash, sil } = opt, D = M.D;
    const seed = ((u && u.uid) || 0) * 0.618 % 1;
    const Q = semOf(P, now, seed, D);
    const dpr = opt.dpr || (typeof DUEL !== 'undefined' && DUEL.dpr) || window.devicePixelRatio || 1;
    // 图层解析度：静止时最高 8 倍、动作中（画面在动，细节看不出来）最高 6 倍；opt.q 为 duel.js 的自适应画质
    const busy = Q.mo || Q.hd || Q.cl || Q.tl || Q.wf || Q.gl || Q.cr || Q.hu || Q.de || Q.re;
    const k = clamp(Math.round(s * dpr * (opt.q || 1) * (opt.zoom || 1) * 2) / 2, 1.5, busy ? 6 : 8);
    let e;
    try { e = build(M, Q, f, k); } catch (er) { if (!draw.warned) { draw.warned = 1; console.warn('hd_monsters', M.key, er); } return DFIG.draw(g, u, S, P, opt); }
    const hov = D.fly ? (-(D.hov || 7) + Math.sin(now * 0.004 + seed * 6) * 2) * (1 - Q.de) : 0;
    const sq = P.sq || 0, sqx = 1 + sq, sqy = 1 - sq, oy = feet + ((P.Y || 0) + hov) * s, rr = (P.rot || 0) * f * RAD;
    const dx = e.sx0 * s, dy = e.ay0 * s, dw = e.w / e.k * s, dh = e.h / e.k * s;
    g.save();
    g.globalAlpha *= P.al == null ? 1 : P.al;
    g.translate(x, oy); if (rr) g.rotate(rr); g.scale(sqx, sqy);
    g.imageSmoothingEnabled = true;
    if (sil) g.drawImage(silOf(e, sil), 0, 0, e.w, e.h, dx, dy, dw, dh);
    else {
      g.drawImage(e.cv, 0, 0, e.w, e.h, dx, dy, dw, dh);
      if (flash) { g.globalAlpha *= 0.82; g.drawImage(silOf(e, '#ffffff'), 0, 0, e.w, e.h, dx, dy, dw, dh); }
      else if (opt.rim && opt.rim.a > 0.02) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= opt.rim.a; g.drawImage(rimOf(e, opt.rim.c, f), 0, 0, e.w, e.h, dx, dy, dw, dh); }
    }
    g.restore();
    // 锚点（美术坐标 → 画面）
    const cr = Math.cos(rr), sr = Math.sin(rr);
    const T = p => { const ax = f * p[0] * s * sqx, ay = p[1] * s * sqy; return [x + ax * cr - ay * sr, oy + ax * sr + ay * cr]; };
    const A = e.anc, bb = e.bb, mouth = A.mouth || [bb[2] - 4, (bb[1] + bb[3]) / 2], chest = A.chest || [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    const tip = A.tip || mouth, l = x + Math.min(f * bb[0], f * bb[2]) * s, r = x + Math.max(f * bb[0], f * bb[2]) * s;
    const restTop = feet + (bb[1] + (D.fly ? -(D.hov || 7) - 2 : 0)) * s - 2 * s;
    return { tip: T(tip), hand: T(A.hand || tip), shot: T(tip), head: T(mouth), chest: T(chest), top: T([chest[0], bb[1] + 3]), ext: [l, restTop, r] };
  }

  return { DEFS, spec, plan, react, draw, semOf, build, CACHE, CST, tone,
    // 测试 / 预览用：直接以语意姿势画出某怪物
    preview(g, key, v, tier, team, sem, x, y, s, f, k) {
      const cls = key; if (key === 'babyDragon') key = 'dragon';
      const D = DEFS[key]; if (!D) return null;
      const M = { id: 'pv|' + cls + '|' + v + '|' + tier + '|' + team, key, D, v: v || '', tier: tier | 0, team: team || 'enemy', cls, baby: cls === 'babyDragon' };
      M.L = D.look(M);
      const Q = Object.assign({ mo: 0, hd: 0, cl: 0, tl: 0, wf: 0, gl: 0, cr: 0, hu: 0, de: 0, ar: 0, re: 0, ph: 0 }, sem);
      const e = build(M, Q, f || 1, k || 6);
      g.drawImage(e.cv, 0, 0, e.w, e.h, x + e.sx0 * s, y + e.ay0 * s, e.w / e.k * s, e.h / e.k * s);
      return e;
    } };
})();
// 挂钩（js/duel.js 以 typeof 检查后呼叫）
function hdMonSpec(u) { return HDMON.spec(u); }
function hdMonPlan(pl, S, ranged, crit) { return HDMON.plan(pl, S, ranged, crit); }
function hdMonReact(S, kind) { return S && S.mon ? HDMON.react(kind) : null; }
function hdMonDraw(g, u, S, P, opt) { return HDMON.draw(g, u, S, P, opt); }
