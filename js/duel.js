// 超时空英雄传说 · 移动重制版 —— 战斗画面（仿原作的侧视对战演出）
// 角色由 js/duelfig.js 的纸娃娃渲染器逐帧绘制；本文件负责镜头、编排（冲刺 / 挥砍 / 射击 → 受击 / 闪避 / 倒下）与特效
'use strict';

const DUEL = { on: false, a: null, d: null, fx: [], t0: 0, hp: {}, hb: {}, fig: {}, actor: null, cam: null, lastHit: {}, impactUntil: 0, vigT: -1e9 };
// 战斗画面专用时钟：命中停顿（hit-stop）时冻结、击杀时慢动作；镜头 / 震动 / 伤害数字仍走真实时间
const DCLK = { real: 0, t: 0, stopUntil: 0, slowUntil: 0, slow: 1 };
function duelNow() {
  const r = performance.now();
  let last = DCLK.real || r, t = DCLK.t;
  if (last < DCLK.stopUntil) last = Math.min(r, DCLK.stopUntil);
  if (last < r && last < DCLK.slowUntil) { const e = Math.min(r, DCLK.slowUntil); t += (e - last) * DCLK.slow; last = e; }
  if (last < r) t += r - last;
  DCLK.real = r; DCLK.t = t;
  return t;
}
// 以战斗时钟等待（经 T() 换算，快速模式同样加速）；maxReal 防止异常时卡死
function duelWaitUntil(target, maxReal) {
  const r0 = performance.now();
  return new Promise(res => {
    const chk = () => { if (duelNow() >= target || performance.now() - r0 > (maxReal || 4000)) res(); else setTimeout(chk, 8); };
    chk();
  });
}
const duelWait = ms => (T(ms) > 0 ? duelWaitUntil(duelNow() + T(ms)) : Promise.resolve());
function duelBuzz(p) { if (AUTO) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
const duelCv = document.getElementById('duel-cv');
const duelCtx = duelCv.getContext('2d');
const DUEL_BG = {
  G: ['#5a8ad0', '#9ac8f0', '#4d7a2c', '#3a5e20'], F: ['#4a7ab0', '#8ab8e0', '#2f5a1e', '#1f4214'], H: ['#5a8ad0', '#9ac8f0', '#5a8a30', '#3f6a24'],
  M: ['#6a7a9a', '#a8b8d0', '#7a6a52', '#5a4a3a'], S: ['#e0a860', '#f8d8a0', '#c8a868', '#a88848'], N: ['#8aa0c8', '#d8e4f4', '#e8eef8', '#c0cce0'],
  W: ['#3a6ab0', '#8ac0f0', '#2a5a9a', '#1f4a8a'], T: ['#3a6ab0', '#8ac0f0', '#3f7ab8', '#2a5a9a'], B: ['#5a8ad0', '#9ac8f0', '#8a5a2a', '#6a4220'],
  V: ['#5a8ad0', '#9ac8f0', '#4d7a2c', '#3a5e20'], R: ['#5a8ad0', '#9ac8f0', '#a8834e', '#8a6634'], C: ['#2a2438', '#4a4060', '#7a7a84', '#5a5a64'],
  K: ['#2a2438', '#4a4060', '#8a1424', '#6a0a18'], X: ['#2a2438', '#4a4060', '#7a7a84', '#5a5a64'], O: ['#1a1414', '#3a2a24', '#5a4a3a', '#3a2c20'],
  D: ['#1a0a24', '#4a1a5a', '#33243f', '#22152e'], L: ['#3a0a08', '#a83a10', '#5a2a1a', '#3a1a10'], P: ['#4a6a7a', '#8aa8b0', '#4a6a3a', '#2e5a4a'],
  A: ['#3a3050', '#8a7aa0', '#c8a040', '#a08030'], Y: ['#2a2438', '#4a4060', '#7a7a84', '#5a5a64'],
};
const BREATH_COL = { red: ['#ffe070', '#ff8030', '#d83020'], blue: ['#ffffff', '#a8e0ff', '#4a8ad8'], green: ['#e8ff90', '#8ad040', '#3a8a2a'], black: ['#e0a0ff', '#8a3ab8', '#2a1040'] };

function duelResize() {
  const w = Math.min(window.innerWidth, 560), h = Math.round(w * 0.62);
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  // HD：画布加高成电影宽银幕（上下黑边），场景区仍是 w × 0.62w、置中；像素版维持原尺寸
  const hc = duelHD() ? Math.round(w * 0.8) : h;
  duelCv.style.width = w + 'px'; duelCv.style.height = hc + 'px';
  duelCv.width = Math.round(w * dpr); duelCv.height = Math.round(hc * dpr);
  DUEL.W = w; DUEL.H = h; DUEL.HC = hc; DUEL.oy = (hc - h) / 2; DUEL.dpr = dpr; if (!DUEL.q) DUEL.q = 1;
  // 美术像素 → 屏幕像素：取整数个实体像素，放大后像素块大小一致
  DUEL.s = Math.max(1, Math.round(h * 0.0098 * dpr)) / dpr;
  DUEL.sm = Math.max(1, Math.round(h * 0.0098 * 0.85 * dpr)) / dpr; // 骑乘者（含坐骑）略小，避免头顶出框
}
async function duelOpen(a, d) {
  if (AUTO || !OPT.anim) return false;
  duelResize();
  // 我方在右、敌方在左（与原作相同）；友军视同我方
  const leftIsA = side(a.team) !== 'P';
  Object.assign(DUEL, { on: true, a, d, left: leftIsA ? a : d, right: leftIsA ? d : a, fx: [], t0: duelNow(), fig: {}, hb: {}, lastHit: {}, actor: null, impactUntil: 0, vigT: -1e9 });
  DUEL.cam = { push: 0, pushT: 0, pushAt: [DUEL.W / 2, DUEL.H / 2], punch: 0, punchT0: 0, punchAt: [DUEL.W / 2, DUEL.H / 2], trauma: 0, kx: 0, ky: 0, last: performance.now() };
  if (duelHD()) duelCamInit(DUEL.cam);
  DCLK.stopUntil = DCLK.slowUntil = 0;
  duelFig(a); duelFig(d);
  // HD：开场前先画好地形背景（避免第一帧卡顿）
  if (duelHD()) { try { const t = tileAt(d.x, d.y); duelBgHD(t in DUEL_HDBG ? t : 'G', DUEL.W, DUEL.H, DUEL.dpr, 84); } catch (e) { } }
  const el = document.getElementById('duel');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  requestAnimationFrame(duelRender);
  await wait(380);
  return true;
}
async function duelClose() {
  if (!DUEL.on) return;
  await duelSettle(1400);
  if (duelHD() && DUEL.cam && DUEL.cam.tgt) { duelShot({ k: 5 }); DUEL.closeT = performance.now(); }
  await wait(320);
  const el = document.getElementById('duel');
  el.classList.remove('in'); el.classList.add('out');
  await wait(220);
  el.hidden = true; DUEL.on = false;
}
function duelText(u, text, color, big) { DUEL.fx.push({ type: 'dmg', u, text, kind: big ? 'crit' : 'hit', r0: performance.now(), dir: u === DUEL.left ? -1 : 1 }); }

// ---------- 角色状态与动作播放 ----------
function duelFig(u) {
  // HD 怪物立绘（js/hd_monsters.js）：收录的怪物换成带 mon 的规格；像素画风 / 未收录者回传 null，维持原样
  return DUEL.fig[u.uid] || (DUEL.fig[u.uid] = { spec: (typeof hdMonSpec === 'function' && hdMonSpec(u)) || DFIG.specOf(u), anim: null, flash: 0, seed: Math.random() * 6, anch: null });
}
function duelPlay(u, A) {
  const st = duelFig(u);
  st.anim = { keys: A.keys, t0: duelNow(), k: Math.max(1e-4, T(1000) / 1000), dur: A.dur, hold: !!A.hold };
  return st.anim;
}
// 某一时刻的姿势（纯函数：不改变动作状态，供拖影回溯）
function duelPose(st, now) {
  const base = DFIG.stance(st.spec), a = st.anim;
  let P;
  if (a) { const ms = (now - a.t0) / a.k; P = ms >= a.dur && !a.hold ? Object.assign({}, base) : DFIG.sample(base, a.keys, Math.min(Math.max(0, ms), a.dur)); }
  else P = Object.assign({}, base);
  DFIG.proc(P, st.spec, now, st.seed);
  return P;
}
// 等两人的动作播完（倒下的姿势会保持）
function duelSettle(maxMs) {
  const now = duelNow();
  let end = now;
  for (const k in DUEL.fig) { const a = DUEL.fig[k].anim; if (a) end = Math.max(end, a.t0 + a.dur * a.k); }
  return end > now ? duelWaitUntil(end, maxMs || 2000) : Promise.resolve();
}

// 一次出手的演出：蓄力（停顿 + 武器闪光、镜头推近）→ 冲刺 / 挥砍 / 射击 → 命中瞬间：停顿、镜头冲击缩放与震动、
// 冲击帧（暴击 / 击杀）、像素爆闪与火花尘土、伤害数字 → 守方受击 / 闪避 / 倒下（击杀时慢动作并碎成像素）
async function duelStrike(att, def, hit, dmg, crit, ranged) {
  if (!DUEL.on) return;
  await duelSettle(1200);
  const A = duelFig(att), D = duelFig(def), cam = DUEL.cam;
  const kill = hit && def.hp - dmg <= 0;
  const pl = DFIG.plan(A.spec, ranged, crit);
  if (A.spec.mon && typeof hdMonPlan === 'function') hdMonPlan(pl, A.spec, ranged, crit); // HD 怪物立绘：换成专属的扑咬 / 吐息 / 施法编排
  const HDs = duelHD() && cam.tgt;
  A.crit = crit; DUEL.actor = att;
  if (HDs) {
    // 蓄力镜位：推近出手者（反击时甩镜换边）；暴击多停一拍、背景压暗
    duelShotWindup(att, def, crit, att === DUEL.d);
    if (crit) await duelWait(150);
  }
  duelPlay(att, pl);
  const now0 = duelNow();
  cam.pushAt = A.anch ? A.anch.chest.slice() : [att === DUEL.left ? DUEL.W * 0.3 : DUEL.W * 0.7, DUEL.H * 0.5]; cam.pushT = 0.06;
  DUEL.fx.push({ type: 'glint', u: att, t0: now0 + T(pl.glint[0]), dur: T(pl.glint[1]), big: crit });
  if (pl.streak) DUEL.fx.push({ type: 'streak', u: att, from: null, t0: now0 + T(pl.streak[0]), dur: T(pl.streak[1] - pl.streak[0] + 260) });
  const bcol = BREATH_COL[A.spec.breath || att.color || 'red'] || BREATH_COL.red;
  if (pl.puff) DUEL.fx.push({ type: 'breath', from: att, to: def, t0: now0 + T(pl.puff), dur: T(160), col: bcol, parts: [], short: 1 });
  for (const t of pl.smoke || []) DUEL.fx.push({ type: 'smoke', u: att, t0: now0 + T(t), dur: T(340) });
  if (hit) for (const t of (pl.jabs || []).concat(pl.chops || [])) {
    DUEL.fx.push({ type: 'burst', u: def, crit: false, dir: att === DUEL.left ? 1 : -1, t0: now0 + T(t), dur: T(140), small: 1 });
    DUEL.fx.push({ type: 'kick', t0: now0 + T(t), dur: 1, dir: att === DUEL.left ? 1 : -1 });
  }
  if (pl.release != null) {
    await duelWait(pl.release);
    const t0 = duelNow();
    if (pl.style === 'breath') DUEL.fx.push({ type: 'breath', from: att, to: def, t0, dur: T(pl.fly + 200), col: bcol, parts: [] });
    else {
      const multi = pl.style === 'bolt3' || pl.style === 'shuriken3', ty = pl.style.replace('3', '');
      DUEL.fx.push({ type: ty, from: att, to: def, t0, dur: T(pl.fly), col: A.spec.wpn && (A.spec.wpn.arrow || A.spec.wpn.gem) });
      if (multi) for (const o of [70, 140]) DUEL.fx.push({ type: ty, from: att, to: def, t0: t0 + T(o), dur: T(pl.fly), dy: o / 14 - 7 });
    }
    cam.pushT = 0.03;
    if (HDs) duelShotWhip(att, def, true);
    await duelWait(pl.fly);
  } else if (HDs) { const lead = Math.min(pl.impact, 170); await duelWait(pl.impact - lead); duelShotWhip(att, def, false); await duelWait(lead); }
  else await duelWait(pl.impact);
  cam.pushT = 0;
  const now = duelNow(), real = performance.now(), dir = att === DUEL.left ? 1 : -1;
  if (!hit) {
    duelPlay(def, (D.spec.mon && typeof hdMonReact === 'function' && hdMonReact(D.spec, 'dodge')) || DFIG.react(D.spec, 'dodge')); // HD 怪物立绘：专属反应
    DUEL.fx.push({ type: 'dmg', u: def, text: 'MISS', kind: 'miss', r0: real, dir });
    DUEL.fx.push({ type: 'whoosh', u: def, t0: now, dur: T(260), dir });
    cam.trauma = Math.min(1, cam.trauma + 0.12);
    if (HDs) duelShotMiss(def);
  } else {
    // 命中停顿：普通 70 / 暴击 140 / 击杀 220 ms；击杀后接 400 ms 的 0.35 倍慢动作
    const hs = kill ? 220 : crit ? 140 : 70;
    DCLK.stopUntil = real + T(hs);
    if (kill) { DCLK.slowUntil = DCLK.stopUntil + T(400); DCLK.slow = 0.35; }
    D.flash = now + T(crit || kill ? 70 : 50);
    if (kill) D.blinkUntil = now + T(380);
    const big = crit || kill;
    DUEL.fx.push({ type: 'slash', u: def, crit, style: pl.style, t0: now, dur: T(crit ? 340 : 260) });
    DUEL.fx.push({ type: 'burst', u: def, crit: big, dir, t0: now, dur: T(big ? 300 : 220) });
    duelSparks(def, big ? 22 : 12, crit ? '#ffe070' : '#ffffff', dir);
    for (let i = 0; i < (big ? 5 : 3); i++) DUEL.fx.push({ type: 'dust', u: def, t0: now + T(i * 45), dur: T(380), dir, k: i });
    cam.trauma = Math.min(1, cam.trauma + (kill ? 0.85 : crit ? 0.7 : 0.38));
    cam.kx += dir * (big ? 10 : 5); cam.ky += big ? 3 : 1.5;
    cam.punch = kill ? 0.15 : crit ? 0.13 : 0.08; cam.punchT0 = real; cam.punchAt = D.anch ? D.anch.chest.slice() : cam.pushAt;
    DUEL.hitT = real; DUEL.hitCrit = big; DUEL.hitAt = cam.punchAt;
    if (HDs) duelShotImpact(att, def, crit, kill, dir);
    if (big) { DUEL.impactT0 = real; DUEL.impactUntil = real + T(kill ? 120 : 90); DUEL.impactAt = cam.punchAt; }
    if (kill) { DUEL.vigT = real; DUEL.fx.push({ type: 'shatter', u: def, t0: now + T(500), dur: T(700) }); }
    DUEL.lastHit[def.uid] = { crit, big: crit || dmg >= def.mhp * 0.2, real };
    DUEL.fx.push({ type: 'dmg', u: def, text: String(dmg), kind: crit ? 'crit' : 'hit', r0: real, dir });
    duelPlay(def, (D.spec.mon && typeof hdMonReact === 'function' && hdMonReact(D.spec, kill ? 'die' : crit ? 'crit' : 'hit')) || DFIG.react(D.spec, kill ? 'die' : crit ? 'crit' : 'hit')); // HD 怪物立绘：专属反应
    if (kill) D.dead = true;
    duelBuzz(kill ? [40, 30, 80] : crit ? [30, 20, 40] : 15);
  }
  await duelWait(40);
}
function duelSparks(u, n, col, dir) {
  const t0 = duelNow();
  for (let i = 0; i < n; i++) {
    const a = (Math.random() - 0.5) * Math.PI * 1.4 + (dir > 0 ? 0 : Math.PI), v = 80 + Math.random() * 200;
    DUEL.fx.push({ type: 'spark', u, at: null, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 70, t0, dur: T(240 + Math.random() * 220), col: Math.random() < 0.3 ? '#ffd040' : col });
  }
}

// ---------- 绘制 ----------
// 像素字体（3×5，M 为 5 宽）：伤害数字与 MISS
const DUEL_PXF = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'], M: ['10001', '11011', '10101', '10001', '10001'], I: ['111', '010', '010', '010', '111'],
  S: ['111', '100', '111', '001', '111'], '!': ['1', '1', '1', '0', '1'],
};
function duelPixText(g, str, cx, cy, q, c1, c2) {
  const gl = [...str].map(ch => DUEL_PXF[ch]).filter(Boolean);
  const w = (gl.reduce((n, r) => n + r[0].length + 1, -1)) * q, x0 = Math.round(cx - w / 2), y0 = Math.round(cy - 2.5 * q), o = Math.max(1, Math.round(q * 0.45));
  for (const pass of [0, 1]) {
    let x = x0;
    for (const rows of gl) {
      rows.forEach((row, ry) => row.split('').forEach((b, rx) => {
        if (b !== '1') return;
        const px = x + rx * q, py = y0 + ry * q;
        if (pass === 0) { g.fillStyle = '#140a1e'; g.fillRect(px - o, py - o, q + 2 * o, q + 2 * o); }
        else { g.fillStyle = ry < 2 ? c1 : c2; g.fillRect(px, py, q, q); }
      }));
      x += (rows[0].length + 1) * q;
    }
  }
}
function duelRender() {
  if (!DUEL.on) return;
  requestAnimationFrame(duelRender);
  const now = duelNow(), real = performance.now();
  // HD：自适应画质——连续数帧绘制过久（低端机）就降低角色图层解析度
  if (DUEL.lastCost > 0 && !DUEL.qFixed) { DUEL.costAvg = (DUEL.costAvg || 8) * 0.9 + DUEL.lastCost * 0.1; if (DUEL.costAvg > 15 && DUEL.q > 0.6) { DUEL.q = Math.max(0.6, DUEL.q * 0.85); DUEL.costAvg = 10; } }
  try { duelRenderFrame(now, real); } finally { DUEL.lastCost = performance.now() - real; }
}
function duelRenderFrame(now, real) {
  const g = duelCtx, W = DUEL.W, H = DUEL.H, s0 = DUEL.s, dpr = DUEL.dpr, cam = DUEL.cam;
  // 镜头：推近（蓄力）、冲击缩放（命中，250 ms 回弹）、创伤式震动（trauma² × 随机位移 + 轻微旋转）、命中方向的后坐
  const dtR = Math.min(0.05, Math.max(0, (real - cam.last) / 1000)); cam.last = real;
  cam.push += (cam.pushT - cam.push) * (1 - Math.exp(-dtR * 7));
  cam.trauma = Math.max(0, cam.trauma - dtR * 1.7);
  const kd = Math.exp(-dtR * 14); cam.kx *= kd; cam.ky *= kd;
  const pt = Math.min(1, (real - cam.punchT0) / Math.max(1, T(260))), punch = cam.punch * (1 - pt) * (1 - pt);
  const sh = cam.trauma * cam.trauma, rnd = () => Math.random() * 2 - 1;
  const ox = Math.round((sh * 12 * rnd() + cam.kx) * dpr) / dpr, oy = Math.round((sh * 9 * rnd() + cam.ky) * dpr) / dpr, rot = sh * 0.035 * rnd();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const HDm = duelHD();
  g.imageSmoothingEnabled = HDm;
  // HD：电影镜头（镜位 + 弹簧），场景区在加高画布内置中
  // 黑边以外才需要画场景：先裁剪（省下被黑边盖住的填充量）
  if (HDm) { if (!cam.tgt) duelCamInit(cam); duelCamHD(dtR, real); const bar = duelBarNow(real); g.save(); g.beginPath(); g.rect(0, bar, W, DUEL.HC - 2 * bar); g.clip(); g.setTransform(dpr, 0, 0, dpr, 0, DUEL.oy * dpr); }
  g.save();
  if (HDm) { g.translate(W / 2 + ox, H / 2 + oy); g.rotate(rot + cam.roll); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y); }
  else { g.translate(W / 2 + ox, H / 2 + oy); g.rotate(rot); g.translate(-W / 2, -H / 2); }
  for (const [z, A] of HDm ? [[punch, cam.punchAt]] : [[cam.push, cam.pushAt], [punch, cam.punchAt]]) if (z > 0.002) { g.translate(A[0], A[1]); g.scale(1 + z, 1 + z); g.translate(-A[0], -A[1]); }
  // 背景：依守方所在地形（画大一些，震动 / 缩放时不露边）
  const terr = tileAt(DUEL.d.x, DUEL.d.y);
  const [sky1, sky2, gr1, gr2] = DUEL_BG[terr] || DUEL_BG.G;
  const groundY = H * 0.6, M = HDm ? 84 : 60;
  if (HDm) duelBgLayersHD(g, terr in DUEL_HDBG ? terr : 'G', W, H, dpr, M, ox, oy, rot);
  else {
  let grd = g.createLinearGradient(0, 0, 0, groundY);
  grd.addColorStop(0, sky1); grd.addColorStop(1, sky2);
  g.fillStyle = grd; g.fillRect(-M, -M, W + 2 * M, groundY + M);
  g.fillStyle = 'rgba(20,16,40,0.25)';
  g.beginPath(); g.moveTo(-M, groundY);
  for (let i = 0; i <= 8; i++) g.lineTo(i * W / 8, groundY - 18 - ((i * 37) % 5) * 9);
  g.lineTo(W + M, groundY); g.fill();
  grd = g.createLinearGradient(0, groundY, 0, H);
  grd.addColorStop(0, gr1); grd.addColorStop(1, gr2);
  g.fillStyle = grd; g.fillRect(-M, groundY, W + 2 * M, H - groundY + M);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, groundY + 6 + ((i * 53) % Math.max(1, H - groundY - 10)), 6, 2);
  }
  const zoom = HDm ? cam.z * (1 + punch) : (1 + cam.push) * (1 + punch);

  // 两名角色：出手者画在上层；高速移动时加速度线与残影
  const feet = groundY + H * 0.1, sep = W * 0.46;
  const order = DUEL.actor === DUEL.left ? [DUEL.right, DUEL.left] : [DUEL.left, DUEL.right];
  const drawn = [];
  for (const u of order) {
    const st = duelFig(u), isLeft = u === DUEL.left, fB = isLeft ? 1 : -1, s = st.spec.scaleK ? Math.max(1, Math.round(s0 * dpr * st.spec.scaleK)) / dpr : st.spec.mount ? DUEL.sm : s0;
    if (st.anim && !st.anim.hold && (now - st.anim.t0) / st.anim.k >= st.anim.dur) st.anim = null;
    const P = duelPose(st, now), f = fB * (P.fl > 0.5 ? -1 : 1);
    const foe = isLeft ? DUEL.right : DUEL.left;
    const approach = Math.max(0, sep - DFIG.gap(st.spec, duelFig(foe).spec) * s);
    const xOf = Q => (isLeft ? W * 0.27 : W * 0.73) + fB * (Q.X * approach + Q.P * sep + Q.dx * s);
    const x = xOf(P);
    if (st.lastNow != null && now > st.lastNow + 1) { const v = Math.hypot(x - st.lastX, (P.Y - st.lastY) * s) / ((now - st.lastNow) / 1000); st.v = (st.v || 0) * 0.5 + v * 0.5; }
    st.lastNow = now; st.lastX = x; st.lastY = P.Y;
    const fly = st.spec.mount ? st.spec.mount.t !== 'horse' : st.spec.wings || st.spec.fly;
    const sw = (st.spec.mount ? 22 : st.spec.kind === 'sprite' ? 7 * st.spec.scale : 14) * s;
    if (HDm) {
      // 柔和的接地阴影
      const ex = sw * (P.Y < -4 ? 0.7 : 1) * 1.25, ey = 3.6 * s;
      g.save(); g.globalAlpha = P.al; g.translate(x, feet + s); g.scale(1, ey / ex);
      const sg = g.createRadialGradient(0, 0, 0, 0, 0, ex); sg.addColorStop(0, `rgba(8,6,24,${fly ? 0.32 : 0.55})`); sg.addColorStop(0.6, `rgba(8,6,24,${fly ? 0.18 : 0.32})`); sg.addColorStop(1, 'rgba(8,6,24,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(0, 0, ex, 0, 7); g.fill(); g.restore();
    } else { g.globalAlpha = P.al; g.fillStyle = `rgba(0,0,0,${fly ? 0.25 : 0.4})`; g.beginPath(); g.ellipse(x, feet + s, sw * (P.Y < -4 ? 0.7 : 1), 3.2 * s, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
    if (st.spec.aura && !st.dead) {
      const a = st.anch ? st.anch.chest : [x, feet - 30 * s], r = 46 * s * (1 + 0.06 * Math.sin(now * 0.004));
      const rg = g.createRadialGradient(a[0], a[1], 4, a[0], a[1], r);
      rg.addColorStop(0, st.spec.aura + '55'); rg.addColorStop(1, st.spec.aura + '00');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.beginPath(); g.arc(a[0], a[1], r, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    }
    const fast = u === DUEL.actor && st.anim && P.al > 0.5 && (st.v || 0) > 230 * s / 2.33 && (st.v || 0) < 9000 * s / 2.33;
    if (fast) {
      // 速度线：在角色身后横向拉出
      if (HDm) {
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 10; i++) { const y = feet - (4 + Math.random() * 46) * s, L = (22 + Math.random() * 70) * s, x0 = x - f * (6 + Math.random() * 26) * s; duelStreak(g, x0 - f * L, y, x0, y, (0.8 + Math.random() * 1.6) * s, 'rgba(210,235,255,0)', 'rgba(230,245,255,0.75)'); }
        g.restore();
      } else {
      g.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 9; i++) { const y = feet - (4 + Math.random() * 46) * s, L = (18 + Math.random() * 60) * s, x0 = x - f * (8 + Math.random() * 30) * s; g.fillRect(Math.min(x0, x0 - f * L), Math.round(y), L, Math.max(1, Math.round(s * 0.7))); }
      }
      // 残影：回溯前几帧姿势，淡蓝色剪影
      for (const k of [3, 2, 1]) {
        const Q = duelPose(st, now - k * 32);
        g.save(); g.globalAlpha = 0.14 * (4 - k);
        if (Q.al > 0.3) (st.spec.mon && typeof hdMonDraw === 'function' ? hdMonDraw : DFIG.draw)(g, u, st.spec, Q, { x: xOf(Q), feet, s, f: fB * (Q.fl > 0.5 ? -1 : 1), now, sil: '#a8dcff', dpr, zoom: zoom * 0.6, q: DUEL.q });
        g.restore();
      }
    }
    let prev = null;
    if (P.tr > 0.05 && st.anim) prev = [14, 28, 42, 56, 70].map(dt => duelPose(st, now - dt));
    const flash = (st.flash || 0) > now || ((st.blinkUntil || 0) > now && Math.floor(now / 55) % 2 === 0);
    st.anch = (st.spec.mon && typeof hdMonDraw === 'function' ? hdMonDraw : DFIG.draw)(g, u, st.spec, P, { x, feet, s, f, now, flash, prev, crit: st.crit, dpr, zoom, q: DUEL.q, rim: HDm && !flash ? duelRim(u, st, real) : null });
    if (st.anch) st.anch.feet = [x, feet];
    if (HDm) duelFigHD(u, st, P, x, feet, s, f, fly, now);
    drawn.push([u, st, P, x, s, f]);
  }
  // 特效
  const s = s0;
  const anc = (u, k) => { const st = duelFig(u); return st.anch && st.anch[k] ? st.anch[k] : [u === DUEL.left ? W * 0.27 : W * 0.73, feet - 30 * s]; };
  for (let i = DUEL.fx.length - 1; i >= 0; i--) {
    const f = DUEL.fx[i];
    if (f.type === 'dmg') continue;
    if (now < f.t0) continue;
    if (f.type === 'kick') { cam.trauma = Math.min(1, cam.trauma + 0.18); cam.kx += f.dir * 3; DUEL.fx.splice(i, 1); continue; }
    const p = (now - f.t0) / Math.max(1, f.dur); if (p >= 1) { DUEL.fx.splice(i, 1); continue; }
    if (!(HDm && duelDrawFxHD(g, f, p, now, anc, s))) duelDrawFx(g, f, p, now, anc, s);
  }
  // HD：命中闪光（加色白光，暴击偏金）
  if (HDm && real - (DUEL.hitT || -1e9) < T(160)) {
    const k = 1 - (real - DUEL.hitT) / Math.max(1, T(160)), C = DUEL.hitAt || [W / 2, H / 2];
    const rg = g.createRadialGradient(C[0], C[1], 0, C[0], C[1], W * 0.7);
    rg.addColorStop(0, `rgba(255,${DUEL.hitCrit ? 230 : 250},${DUEL.hitCrit ? 170 : 240},${(DUEL.hitCrit ? 0.42 : 0.26) * k})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.fillRect(-M, -M, W + 2 * M, H + 2 * M); g.restore();
  }
  // 冲击帧（暴击 / 击杀）：白底黑剪影 + 放射速度线，再一帧反相
  if (real < DUEL.impactUntil && HDm) duelImpactHD(g, W, H, M, real, drawn, feet, s, now);
  else if (real < DUEL.impactUntil) {
    const ph = (real - DUEL.impactT0) / Math.max(1, DUEL.impactUntil - DUEL.impactT0), inv = ph > 0.6;
    const bg = inv ? '#140a1e' : '#fffaf0', fg = inv ? '#fffaf0' : '#140a1e', C = DUEL.impactAt || [W / 2, H / 2];
    g.fillStyle = bg; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    g.fillStyle = fg;
    for (let k = 0; k < 30; k++) {
      const a = k / 30 * Math.PI * 2 + (k % 3) * 0.05, r0 = (34 + (k % 4) * 9) * s, r1 = W, w = 0.022 + (k % 2) * 0.012;
      g.beginPath(); g.moveTo(C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0); g.lineTo(C[0] + Math.cos(a - w) * r1, C[1] + Math.sin(a - w) * r1); g.lineTo(C[0] + Math.cos(a + w) * r1, C[1] + Math.sin(a + w) * r1); g.fill();
    }
    for (const [u, st, P, x, sS, f] of drawn) DFIG.draw(g, u, st.spec, P, { x, feet, s: sS, f, now, sil: fg });
  }
  // 伤害数字（真实时间：命中停顿时也会弹出）
  for (let i = DUEL.fx.length - 1; i >= 0; i--) {
    const f = DUEL.fx[i];
    if (f.type !== 'dmg') continue;
    const k = T(1000) / 1000 || 1, t = (real - f.r0) / k;
    if (t >= 1050) { DUEL.fx.splice(i, 1); continue; }
    if (!f.base) { const top = anc(f.u, 'top'); f.base = [top[0], Math.max(H * (f.kind === 'crit' ? 0.3 : 0.22), Math.min(top[1], groundY - 30 * s))]; }
    const crit = f.kind === 'crit', miss = f.kind === 'miss';
    const sc = t < 90 ? 1.4 * t / 90 : t < 200 ? 1.4 - 0.4 * (t - 90) / 110 : 1;
    let x = f.base[0], y = f.base[1] - 18 * (1 - Math.pow(1 - Math.min(1, t / 260), 2)) - Math.max(0, t - 260) * 0.02;
    if (t < 380) y -= Math.sin(t / 380 * Math.PI * 2) * 4 * (1 - t / 380);
    if (crit && t < 320) { x += (Math.random() * 2 - 1) * 2.5; y += (Math.random() * 2 - 1) * 2; }
    if (miss) x += f.dir * t * 0.05;
    g.save(); g.globalAlpha = t > 750 ? Math.max(0, 1 - (t - 750) / 300) : 1;
    g.translate(Math.round(x), Math.round(y)); g.scale(Math.max(0.01, sc), Math.max(0.01, sc));
    const q = Math.max(2, Math.round(s * (crit ? 2.2 : 1.7)));
    if (HDm) { g.rotate(-0.06); duelDmgHD(g, f, t, H, s); g.restore(); continue; }
    if (miss) duelPixText(g, 'MISS', 0, 0, Math.max(2, Math.round(s * 1.4)), '#c8dcf4', '#7890b8');
    else duelPixText(g, f.text, 0, 0, q, crit ? '#fff070' : '#ffffff', crit ? '#ff8a1a' : '#d8e0f0');
    if (crit) {
      g.font = `900 ${Math.round(H * 0.075)}px sans-serif`; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#140a1e';
      g.strokeText('暴击!', 0, -4 * q); g.fillStyle = '#ff5a2a'; g.fillText('暴击!', 0, -4 * q);
    }
    g.restore();
  }
  g.restore();
  // 击杀时的暗角脉冲
  const vt = real - DUEL.vigT;
  if (HDm) duelOverlayHD(g, real, now, punch, ox, oy);
  else if (vt < T(700)) {
    const va = 0.6 * Math.sin(Math.PI * vt / Math.max(1, T(700)));
    const vg = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, W * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(10,0,0,${va})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
  }
  // 底部资讯：名字、职业、HP 条（受伤时立即落到新值，白 / 红「残影」停留约 300 ms 再流失；大伤害面板抖动、暴击闪烁）
  for (const u of [DUEL.left, DUEL.right]) {
    const isLeft = u === DUEL.left, bw = W * 0.44, by = H * 0.84;
    const hb = DUEL.hb[u.uid] || (DUEL.hb[u.uid] = { shown: u.hp, ghost: u.hp, gT: 0, shakeT: 0, flashT: 0 });
    if (u.hp < hb.shown) {
      const lh = DUEL.lastHit[u.uid];
      hb.ghost = Math.max(hb.ghost, hb.shown); hb.shown = u.hp; hb.gT = real;
      if (lh && real - lh.real < 3000) { if (lh.big) hb.shakeT = real + 240; if (lh.crit) hb.flashT = real + 360; }
    } else if (u.hp > hb.shown) hb.shown = hb.ghost = u.hp;
    if (real - hb.gT > T(300)) hb.ghost += (hb.shown - hb.ghost) * (1 - Math.exp(-dtR * 9));
    if (HDm) { g.setTransform(dpr, 0, 0, dpr, 0, 0); duelPanelHD(g, u, isLeft, W, H, real, dtR); continue; }
    let bx = isLeft ? W * 0.03 : W * 0.53, byy = by;
    if (real < hb.shakeT) { bx += (Math.random() * 2 - 1) * 3; byy += (Math.random() * 2 - 1) * 2; }
    g.fillStyle = 'rgba(10,6,30,0.82)'; g.fillRect(bx - 4, byy - H * 0.11, bw + 8, H * 0.25);
    g.strokeStyle = u.team === 'player' ? '#4a9aff' : u.team === 'ally' ? '#4ad87a' : '#ff5a5a'; g.lineWidth = 2; g.strokeRect(bx - 4, byy - H * 0.11, bw + 8, H * 0.25);
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(H * 0.068)}px sans-serif`;
    g.fillText(`${u.name}`, bx, byy - H * 0.03, bw * 0.6);
    g.fillStyle = '#c8b8ff'; g.font = `${Math.round(H * 0.05)}px sans-serif`; g.textAlign = 'right';
    g.fillText(`${className(u)} Lv${u.lv}`, bx + bw, byy + H * 0.105, bw * 0.55); g.textAlign = 'left';
    g.fillStyle = '#000'; g.fillRect(bx, byy, bw, H * 0.05);
    const r = Math.max(0, hb.shown / u.mhp), rg = Math.max(0, hb.ghost / u.mhp);
    if (rg > r) { g.fillStyle = real - hb.gT < T(110) ? '#ffffff' : '#ff4a4a'; g.fillRect(bx + bw * r, byy, bw * (rg - r), H * 0.05); }
    const fl = real < hb.flashT && Math.floor((hb.flashT - real) / 60) % 2 === 0;
    g.fillStyle = fl ? '#ffffff' : r > 0.5 ? '#5ae05a' : r > 0.25 ? '#f0c030' : '#ff4040'; g.fillRect(bx, byy, bw * r, H * 0.05);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(bx, byy, bw * r, Math.max(1, H * 0.012));
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(H * 0.05)}px sans-serif`;
    g.fillText(`${Math.max(0, Math.round(hb.shown))} / ${u.mhp}`, bx + 4, byy + H * 0.105);
  }
}
function duelDrawFx(g, f, p, now, anc, s) {
  const lerp = (a, b, t) => a + (b - a) * t;
  if (f.type === 'slash') {
    const [cx, cy] = anc(f.u, 'chest'), size = 44 * s;
    g.lineCap = 'round';
    g.strokeStyle = f.crit ? '#ffe070' : '#ffffff'; g.lineWidth = f.crit ? 7 : 5; g.globalAlpha = 1 - p;
    if (f.style === 'thrust' || f.style === 'bolt' || f.style === 'arrow') {
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3, r0 = size * 0.12, r1 = size * (0.25 + p * 0.35); g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
    } else if (f.style === 'claw' || f.style === 'bite') {
      for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(cx - size * 0.3 + k * 8, cy - size * 0.4); g.lineTo(cx + size * 0.25 + k * 8, cy + size * 0.35 * (0.4 + p)); g.stroke(); }
    } else if (f.style === 'bonk') {
      for (let k = 0; k < 4; k++) { const a = now * 0.01 + k * Math.PI / 2, x = cx + Math.cos(a) * size * 0.35, y = cy - size * 0.55 + Math.sin(a) * size * 0.12; g.fillStyle = '#ffe070'; duelStar(g, x, y, 5 + 3 * (1 - p)); }
    } else if (f.style === 'chop') {
      g.beginPath(); g.moveTo(cx + size * 0.05, cy - size * 0.6); g.lineTo(cx - size * 0.05, cy + size * 0.5 * (0.5 + p)); g.stroke();
      g.fillStyle = 'rgba(200,170,120,0.6)'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(cx + k * size * 0.22 * (0.5 + p), cy + size * 0.62, (6 - Math.abs(k)) * s * (1 - p * 0.5), 0, 7); g.fill(); }
    } else if (f.style === 'iai') {
      g.lineWidth = f.crit ? 5 : 3; g.beginPath(); g.moveTo(cx - size * 0.9, cy + size * 0.1); g.lineTo(cx + size * 0.9, cy - size * 0.1); g.stroke();
    } else {
      for (let k = -1; k <= 1; k += 2) { g.beginPath(); g.moveTo(cx - size * 0.35, cy - size * 0.35 * k + p * 10); g.lineTo(cx + size * 0.35, cy + size * 0.35 * k * (1 - p)); g.stroke(); }
    }
    g.globalAlpha = (1 - p) * 0.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, size * 0.3 * p + 8, 0, 7); g.fill(); g.globalAlpha = 1;
  } else if (f.type === 'burst') {
    // 像素爆闪：8 道锯齿光芒 + 中心方块
    if (!f.at) { const c = anc(f.u, 'chest'); f.at = [c[0] - f.dir * 5 * s, c[1]]; }
    const q = Math.max(2, Math.round(s * 1.4)), e = 1 - (1 - p) * (1 - p), R = (10 + (f.crit ? 26 : f.small ? 9 : 18) * e) * s * (f.small ? 0.7 : 1);
    g.globalAlpha = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5;
    g.fillStyle = p < 0.3 ? '#ffffff' : f.crit ? '#ffd040' : '#fff0b0';
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + (k % 2 ? 0.25 : 0), len = (k % 2 ? 0.6 : 1) * R;
      for (let d = q * 2 + e * 6 * s; d < len; d += q) { const z = Math.max(1, Math.round(q * (1.2 - d / len * 0.8))); g.fillRect(Math.round(f.at[0] + Math.cos(a) * d - z / 2), Math.round(f.at[1] + Math.sin(a) * d - z / 2), z, z); }
    }
    if (p < 0.35) { const z = Math.round(q * (f.crit ? 5 : 3.5) * (1 - p)); g.fillStyle = '#ffffff'; g.fillRect(Math.round(f.at[0] - z / 2), Math.round(f.at[1] - z / 2), z, z); }
    g.globalAlpha = 1;
  } else if (f.type === 'dust') {
    // 尘土：脚下扬起，随击退方向拖出一串
    if (!f.at) { const c = anc(f.u, 'feet'); f.at = [c[0] - f.dir * (4 + f.k * 3) * s, c[1] - s]; }
    const r = (3 + 6 * p) * s * (1 - f.k * 0.1), y = f.at[1] - p * 6 * s;
    g.globalAlpha = 0.55 * (1 - p); g.fillStyle = '#e0d4b0';
    const z = Math.max(1, Math.round(s));
    for (const [dx, dy, rr] of [[0, 0, 1], [-1.2, 0.4, 0.7], [1.1, 0.5, 0.6]]) g.fillRect(Math.round(f.at[0] + dx * r - rr * r), Math.round(y + dy * r - rr * r * 0.7), Math.round(rr * r * 2 / z) * z, Math.round(rr * r * 1.4 / z) * z);
    g.globalAlpha = 1;
  } else if (f.type === 'smoke') {
    // 忍者瞬身的烟雾
    if (!f.at) { const c = anc(f.u, 'feet'); f.at = [c[0], c[1] - 16 * s]; }
    const z = Math.max(1, Math.round(s * 1.2));
    g.globalAlpha = 0.85 * (1 - p);
    for (let k = 0; k < 7; k++) {
      const a = k / 7 * Math.PI * 2 + 0.4, d = (6 + 14 * p) * s, r = (6 - k % 3) * s * (1 + p * 0.6);
      const x = f.at[0] + Math.cos(a) * d, y = f.at[1] + Math.sin(a) * d * 0.8 - p * 8 * s;
      g.fillStyle = k % 2 ? '#e8e4f0' : '#b8b0c8';
      g.fillRect(Math.round((x - r) / z) * z, Math.round((y - r) / z) * z, Math.round(2 * r / z) * z, Math.round(2 * r / z) * z);
    }
    g.globalAlpha = 1;
  } else if (f.type === 'flask') {
    // 炼金药瓶：旋转着抛物线飞出，命中时炸开一团彩色药雾
    if (!f.a) { f.a = anc(f.from, 'hand').slice(); f.b = anc(f.to, 'chest').slice(); f.c = ['#9aff4a', '#ff7a9a', '#7ad8ff'][Math.floor(Math.random() * 3)]; }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * 26 * s;
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(now * 0.02);
    g.fillStyle = '#140a1e'; g.fillRect(-3.4 * s, -2.6 * s, 6.8 * s, 6.8 * s); g.fillRect(-1.6 * s, -5.6 * s, 3.2 * s, 3.6 * s);
    g.fillStyle = f.c; g.fillRect(-2.6 * s, -1.8 * s, 5.2 * s, 5.2 * s); g.fillStyle = '#e8f4ff'; g.fillRect(-0.8 * s, -4.8 * s, 1.6 * s, 3 * s);
    g.fillStyle = '#ffffff'; g.fillRect(-2 * s, -1.2 * s, 1.4 * s, 1.4 * s); g.restore();
    if (p > 0.92) { g.globalAlpha = 0.8; g.fillStyle = f.c; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.beginPath(); g.arc(f.b[0] + Math.cos(a) * 8 * s, f.b[1] + Math.sin(a) * 6 * s, 5 * s, 0, 7); g.fill(); } g.globalAlpha = 1; }
  } else if (f.type === 'elem') {
    // 元素使：地水火风四色光球螺旋飞向目标
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); }
    const cols = ['#ff7a3a', '#7ad0ff', '#8ae8a0', '#e0c090'];
    cols.forEach((c, k) => {
      const q = Math.max(0, Math.min(1, p * 1.15 - k * 0.05)), a = q * 12 + k * Math.PI / 2, r = 7 * s * (1 - q);
      const x = lerp(f.a[0], f.b[0], q) + Math.cos(a) * r, y = lerp(f.a[1], f.b[1], q) + Math.sin(a) * r;
      const rg = g.createRadialGradient(x, y, 0.5, x, y, 6 * s); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.45, c); rg.addColorStop(1, c + '00');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, 6 * s, 0, 7); g.fill();
    });
  } else if (f.type === 'laser') {
    // 机甲 / 高科技战士的光炮：瞬间贯通的光束
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); }
    const reach = Math.min(1, p * 3), x1 = lerp(f.a[0], f.b[0], reach), y1 = lerp(f.a[1], f.b[1], reach), w0 = (p < 0.7 ? 1 : (1 - p) / 0.3) * s;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,60,60,0.55)'; g.lineWidth = (7 + Math.sin(now * 0.08) * 1.5) * w0; g.beginPath(); g.moveTo(f.a[0], f.a[1]); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = '#ffd0d0'; g.lineWidth = 3 * w0; g.beginPath(); g.moveTo(f.a[0], f.a[1]); g.lineTo(x1, y1); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 1.2 * w0; g.beginPath(); g.moveTo(f.a[0], f.a[1]); g.lineTo(x1, y1); g.stroke();
    g.fillStyle = '#ffffff'; duelStar(g, f.a[0], f.a[1], 6 * s * (1 - p));
  } else if (f.type === 'swarm') {
    // 蛊虫群：一团抖动的小黑虫沿弧线飞向目标
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); f.bugs = Array.from({ length: 22 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 6]); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * 14 * s, z = Math.max(1, Math.round(s * 1.2));
    for (const [bx, by, ph] of f.bugs) {
      const r = (6 + 4 * Math.sin(now * 0.02 + ph)) * s;
      g.fillStyle = ph < 1 ? '#7aff7a' : '#1a2414';
      g.fillRect(Math.round(x + bx * r + Math.sin(now * 0.05 + ph * 3) * 2 * s), Math.round(y + by * r * 0.7 + Math.cos(now * 0.05 + ph) * 2 * s), z, z);
    }
  } else if (f.type === 'shuriken' || f.type === 'marrow' || f.type === 'clock') {
    if (!f.a) { f.a = anc(f.from, f.type === 'clock' ? 'tip' : f.type === 'marrow' ? 'shot' : 'hand').slice(); f.b = anc(f.to, 'chest').slice(); if (f.dy) { f.a[1] += f.dy * s; f.b[1] += f.dy * s; } }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - (f.type === 'shuriken' ? Math.sin(p * Math.PI) * 6 * s : 0);
    if (f.type === 'shuriken') {
      g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(now * 0.04);
      g.fillStyle = '#140a1e'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-2.4 * s, -1.4 * s); g.lineTo(0, -7.5 * s); g.lineTo(2.4 * s, -1.4 * s); g.fill(); }
      g.fillStyle = '#d8dce8'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(-1.4 * s, -1 * s); g.lineTo(0, -6 * s); g.lineTo(1.4 * s, -1 * s); g.fill(); }
      g.fillStyle = '#140a1e'; g.fillRect(-s, -s, 2 * s, 2 * s); g.restore();
    } else if (f.type === 'marrow') {
      const c = f.col || '#c890ff', bx = lerp(f.a[0], f.b[0], Math.max(0, p - 0.35)), by = lerp(f.a[1], f.b[1], Math.max(0, p - 0.35));
      const lg = g.createLinearGradient(bx, by, x, y); lg.addColorStop(0, c + '00'); lg.addColorStop(1, c);
      g.strokeStyle = lg; g.lineWidth = 4 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(x, y); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 1.4 * s; g.beginPath(); g.moveTo(lerp(bx, x, 0.5), lerp(by, y, 0.5)); g.lineTo(x, y); g.stroke();
      g.fillStyle = '#ffffff'; duelStar(g, x, y, 4 * s);
    } else {
      // 时空术士：时钟法球（表盘 + 转动的指针）
      const R = 8 * s; g.fillStyle = '#c8f4ff'; g.beginPath(); g.arc(x, y, R + 2 * s, 0, 7); g.fill();
      g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
      g.strokeStyle = '#2a8a8a'; g.lineWidth = Math.max(1, s); g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
      g.strokeStyle = '#140a1e'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(now * 0.03) * R * 0.8, y + Math.sin(now * 0.03) * R * 0.8); g.moveTo(x, y); g.lineTo(x + Math.cos(now * 0.004) * R * 0.5, y + Math.sin(now * 0.004) * R * 0.5); g.stroke();
    }
  } else if (f.type === 'whoosh') {
    const c = anc(f.u, 'chest');
    g.globalAlpha = 0.7 * (1 - p); g.fillStyle = '#e8f4ff';
    for (let k = 0; k < 4; k++) { const y = c[1] - 14 * s + k * 9 * s, L = (26 - k * 4) * s * (0.5 + p); g.fillRect(Math.round(c[0] + f.dir * (6 + p * 20) * s - (f.dir > 0 ? 0 : L)), Math.round(y), L, Math.max(1, Math.round(s * 0.7))); }
    g.globalAlpha = 1;
  } else if (f.type === 'shatter') {
    // 击杀：身体碎成像素粒子向上飘散
    if (!f.parts) {
      const st = duelFig(f.u), sp = st.spec, ft = anc(f.u, 'feet'), tp = anc(f.u, 'top'), s2 = (st.spec.mount ? DUEL.sm : s) * (st.spec.scaleK || 1);
      const cols = sp.kind === 'doll' ? [sp.p, sp.skin, (sp.armor && sp.armor.c) || sp.shirt, sp.hair, '#ffffff'] : ['#ffffff', '#c8c8d8', '#8a8a9a'];
      const top = Math.min(tp[1], ft[1] - 20 * s2);
      f.parts = Array.from({ length: 40 }, () => ({ x: ft[0] + (Math.random() * 2 - 1) * 14 * s2, y: top + Math.random() * (ft[1] - top), vx: (Math.random() * 2 - 1) * 40 * s2, vy: -(20 + Math.random() * 70) * s2, c: cols[Math.floor(Math.random() * cols.length)] || '#fff', z: Math.max(2, Math.round(s2 * (1.5 + Math.random() * 1.5))) }));
    }
    const t = p * f.dur / 1000;
    g.globalAlpha = 1 - p * p;
    for (const q of f.parts) { g.fillStyle = q.c; g.fillRect(Math.round(q.x + q.vx * t), Math.round(q.y + q.vy * t - 20 * t * t), q.z, q.z); }
    g.globalAlpha = 1;
  } else if (f.type === 'spark') {
    if (!f.at) f.at = anc(f.u, 'chest');
    const t = (now - f.t0) / 1000, x = f.at[0] + f.vx * t, y = f.at[1] + f.vy * t + 300 * t * t;
    g.globalAlpha = 1 - p; g.fillStyle = f.col; const z = Math.max(1, 2 * s); g.fillRect(x - z / 2, y - z / 2, z, z); g.globalAlpha = 1;
  } else if (f.type === 'glint') {
    const [x, y] = anc(f.u, 'tip'), r = (5 + (f.big ? 20 : 14) * Math.sin(p * Math.PI)) * s * 0.6;
    g.globalCompositeOperation = 'lighter'; g.fillStyle = '#fff8c0'; duelStar(g, x, y, r); g.globalCompositeOperation = 'source-over';
  } else if (f.type === 'streak') {
    if (!f.from) f.from = anc(f.u, 'hand').slice();
    const to = anc(f.u, 'hand');
    g.globalAlpha = (1 - p) * 0.9; g.strokeStyle = '#ffffff'; g.lineWidth = 3 * s; g.lineCap = 'butt';
    g.beginPath(); g.moveTo(f.from[0], f.from[1]); g.lineTo(to[0], to[1]); g.stroke();
    g.globalAlpha = (1 - p) * 0.4; g.lineWidth = 8 * s; g.beginPath(); g.moveTo(f.from[0], f.from[1]); g.lineTo(to[0], to[1]); g.stroke(); g.globalAlpha = 1;
  } else if (f.type === 'arrow' || f.type === 'bolt') {
    if (!f.a) { f.a = anc(f.from, 'shot').slice(); f.b = anc(f.to, 'chest').slice(); if (f.dy) { f.a[1] += f.dy * s; f.b[1] += f.dy * s; } }
    const dir = Math.sign(f.b[0] - f.a[0]) || 1, arc = f.type === 'arrow' ? Math.sin(p * Math.PI) * 10 * s : 0;
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - arc;
    const ang = Math.atan2((f.b[1] - f.a[1]) - Math.cos(p * Math.PI) * 10 * s * Math.PI * (f.type === 'arrow' ? 1 : 0), f.b[0] - f.a[0]);
    g.save(); g.translate(x, y); g.rotate(ang);
    const L = (f.type === 'arrow' ? 16 : 10) * s;
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-L * 2.2, -s * 0.5, L * 1.6, s);
    g.fillStyle = f.type === 'arrow' ? '#c89a5a' : '#6a4a2a'; g.fillRect(-L, -s * 0.6, L, s * 1.2);
    g.fillStyle = '#e8eef8'; g.beginPath(); g.moveTo(0, -2 * s); g.lineTo(3.5 * s, 0); g.lineTo(0, 2 * s); g.fill();
    g.fillStyle = f.type === 'arrow' ? '#ffffff' : '#d83a3a'; g.fillRect(-L, -2 * s, 3 * s, 1.2 * s); g.fillRect(-L, 0.8 * s, 3 * s, 1.2 * s);
    g.restore(); void dir;
  } else if (f.type === 'wave') {
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p), dir = Math.sign(f.b[0] - f.a[0]) || 1;
    g.strokeStyle = '#e8f8ff'; g.lineWidth = 4 * s * 0.6; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(x - dir * 10 * s, y, 14 * s, -0.9, 0.9, dir < 0); if (dir < 0) { g.beginPath(); g.arc(x + 10 * s, y, 14 * s, Math.PI - 0.9, Math.PI + 0.9); } g.stroke(); g.globalAlpha = 1;
  } else if (f.type === 'orb' || f.type === 'rock') {
    if (!f.a) { f.a = anc(f.from, f.type === 'orb' ? 'tip' : 'top').slice(); f.b = anc(f.to, 'chest').slice(); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - (f.type === 'rock' ? Math.sin(p * Math.PI) * 30 * s : 0);
    if (f.type === 'rock') { g.fillStyle = '#8a7a6a'; g.beginPath(); g.arc(x, y, 7 * s, 0, 7); g.fill(); g.fillStyle = '#5a4a3a'; g.fillRect(x - 2 * s, y - 2 * s, 3 * s, 3 * s); }
    else { const c = f.col || '#c8f4ff'; const rg = g.createRadialGradient(x, y, 1, x, y, 10 * s); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, c); rg.addColorStop(1, c + '00'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, 10 * s, 0, 7); g.fill(); }
  } else if (f.type === 'breath') {
    const a = anc(f.from, 'head'), b = anc(f.to, 'chest');
    const k0 = f.short ? 0.6 : 1.8;
    if (p < 0.75) for (let k = 0; k < 3; k++) f.parts.push({ t0: now, x: a[0], y: a[1], vx: (b[0] - a[0]) * (k0 + Math.random() * k0 * 0.5), vy: (b[1] - a[1]) * k0 * 0.8 + (Math.random() - 0.5) * 120 * s, r: (3 + Math.random() * 4) * s });
    for (let j = f.parts.length - 1; j >= 0; j--) {
      const q = f.parts[j], t = (now - q.t0) / 1000;
      if (t > 0.45) { f.parts.splice(j, 1); continue; }
      const k = t / 0.45, x = q.x + q.vx * t, y = q.y + q.vy * t;
      g.globalAlpha = 1 - k; g.fillStyle = f.col[Math.min(2, Math.floor(k * 3))];
      g.beginPath(); g.arc(x, y, q.r * (1 + k * 1.5), 0, 7); g.fill();
    }
    g.globalAlpha = 1;
  }
}
function duelStar(g, x, y, r) {
  g.beginPath();
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.3 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
window.addEventListener('resize', () => { if (DUEL.on) duelResize(); });

// =====================================================================
// HD 画风（OPT.art !== 'pixel'）：绘制背景、光泽资讯面板、描边伤害数字、加色发光特效
// 像素画风仍走上面的原始绘制，不受影响
// =====================================================================
const duelHD = () => (typeof artHD === 'function' ? artHD() : true);
// 每种地形的绘制背景：天空、远景、中景、地面与光照
const DUEL_HDBG = {
  G: { sky: ['#4f8fe0', '#8cc4f2', '#e4f3ff'], far: 'mount', farC: '#8eaed6', mid: 'hills', midC: '#5c9a46', gr: ['#86c052', '#5a9a38', '#3c7428'], deco: 'grass' },
  R: { sky: ['#4f8fe0', '#8cc4f2', '#e4f3ff'], far: 'mount', farC: '#8eaed6', mid: 'hills', midC: '#5c9a46', gr: ['#c8a46a', '#a8834e', '#7c5e34'], deco: 'road' },
  V: { sky: ['#5a96e2', '#9ccaf2', '#f0f6ff'], far: 'mount', farC: '#94b2d8', mid: 'village', midC: '#5e9848', gr: ['#86c052', '#5a9a38', '#3c7428'], deco: 'grass' },
  H: { sky: ['#4f8fe0', '#8cc4f2', '#e4f3ff'], far: 'mount', farC: '#86a6d0', mid: 'hills2', midC: '#6aa44c', gr: ['#92c45a', '#64a03e', '#46802c'], deco: 'grass' },
  F: { sky: ['#3f7cc8', '#7ab4e4', '#d4ecf8'], far: 'trees', farC: '#4a7a5a', mid: 'trees2', midC: '#2e5e30', gr: ['#5e9a3c', '#3e7428', '#28561c'], deco: 'grass', shafts: 'rgba(255,250,200,0.16)' },
  M: { sky: ['#5a7eb4', '#a0bcd8', '#e6eef6'], far: 'peaks', farC: '#8a98b4', mid: 'rocks', midC: '#7a6c5a', gr: ['#9a8a70', '#7a6a52', '#584a38'], deco: 'pebble' },
  S: { sky: ['#e09a52', '#f6c88a', '#fff0d0'], far: 'dunes', farC: '#e0b070', mid: 'dunes2', midC: '#d4a05a', gr: ['#ecc888', '#d0a868', '#a8844a'], deco: 'ripple', sun: '#fff4c0' },
  N: { sky: ['#7c9cc8', '#c4d6ee', '#f4f8ff'], far: 'peaks', farC: '#b4c4dc', snow: 1, mid: 'pines', midC: '#4a6a6a', gr: ['#f4f8ff', '#dce6f4', '#b4c4dc'], deco: 'snow' },
  W: { sky: ['#3a76c8', '#86c0f0', '#e0f2ff'], far: 'sea', farC: '#3a7ac0', mid: null, gr: ['#4a96d8', '#2a6ab0', '#1a4a8a'], deco: 'water' },
  T: { sky: ['#3f80d0', '#8cc6f2', '#e4f4ff'], far: 'mount', farC: '#8eaed6', mid: 'hills', midC: '#5c9a46', gr: ['#6ab4e0', '#3e8ac4', '#2a68a4'], deco: 'water' },
  B: { sky: ['#4f8fe0', '#8cc4f2', '#e4f3ff'], far: 'mount', farC: '#8eaed6', mid: 'hills', midC: '#5c9a46', gr: ['#a8743e', '#865628', '#5e3a18'], deco: 'planks' },
  P: { sky: ['#5c7e8a', '#9cb4b0', '#dce6dc'], far: 'trees', farC: '#5a7a6a', mid: 'reeds', midC: '#3e5e40', gr: ['#5e7a48', '#44603a', '#2e4a30'], deco: 'swamp', fog: 'rgba(220,235,225,0.22)' },
  A: { sky: ['#3a3266', '#7a6aa8', '#e8d8f0'], far: 'temple', farC: '#6a5a8a', mid: null, gr: ['#d8c48a', '#b09a5e', '#7e6a3a'], deco: 'tiles', shafts: 'rgba(255,240,180,0.22)' },
  C: { indoor: 'castle', wall: ['#5a5a70', '#3e3e52'], gr: ['#8a8a98', '#6a6a7a', '#4a4a5a'], deco: 'tiles' },
  K: { indoor: 'throne', wall: ['#4a3a52', '#2e2238'], gr: ['#8a8a98', '#6a6a7a', '#4a4a5a'], deco: 'carpet' },
  X: { indoor: 'castle', wall: ['#5a5a70', '#3e3e52'], gr: ['#8a8a98', '#6a6a7a', '#4a4a5a'], deco: 'tiles' },
  Y: { indoor: 'castle', wall: ['#5a5a70', '#3e3e52'], gr: ['#8a8a98', '#6a6a7a', '#4a4a5a'], deco: 'tiles' },
  O: { indoor: 'cave', wall: ['#3a3030', '#1e1818'], gr: ['#6a5a48', '#4a3e30', '#2e261c'], deco: 'pebble' },
  D: { sky: ['#140820', '#3a1450', '#7a3a8a'], far: 'spires', farC: '#2a1438', mid: 'spires2', midC: '#1e0e2a', gr: ['#4a3458', '#33243f', '#1e1428'], deco: 'rune', glow: 'rgba(200,90,255,0.2)' },
  L: { sky: ['#1a0604', '#5a1408', '#c24a10'], far: 'volcano', farC: '#3a1410', mid: 'rocks', midC: '#2a1410', gr: ['#5a3020', '#3a1e14', '#24120c'], deco: 'lava', glow: 'rgba(255,120,30,0.28)' },
};
const DUEL_BGC = { key: '', cv: null };
function duelRng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function duelBgHD(terr, W, H, dpr, M) {
  const key = [terr, W, H, dpr, M].join('|');
  if (DUEL_BGC.key === key) return DUEL_BGC.cv;
  const cv = DUEL_BGC.cv || document.createElement('canvas');
  cv.width = Math.round((W + 2 * M) * dpr); cv.height = Math.round((H + 2 * M) * dpr);
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, M * dpr, M * dpr);
  const T = DUEL_HDBG[terr] || DUEL_HDBG.G, gy = H * 0.6, rnd = duelRng(terr.charCodeAt(0) * 977 + 13);
  const X0 = -M, X1 = W + M, Y0 = -M, Y1 = H + M, WW = X1 - X0;
  let grd;
  const ridge = (base, amp, n, col, col2, jag) => {
    g.beginPath(); g.moveTo(X0, gy + 2);
    const ph = rnd() * 6;
    for (let i = 0; i <= n; i++) {
      const x = X0 + WW * i / n, k = i / n;
      const y = base - amp * (0.55 + 0.45 * Math.sin(k * 7.3 + ph) * Math.sin(k * 2.9 + ph * 0.7)) - (jag ? (i % 2) * amp * 0.25 * rnd() : 0);
      g.lineTo(x, y);
    }
    g.lineTo(X1, gy + 2); g.closePath();
    const lg = g.createLinearGradient(0, base - amp, 0, gy); lg.addColorStop(0, col); lg.addColorStop(1, col2 || col);
    g.fillStyle = lg; g.fill();
  };
  const blob = (x, y, r, c) => { const rg = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r); rg.addColorStop(0, c[0]); rg.addColorStop(0.7, c[1]); rg.addColorStop(1, c[2] || c[1]); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(gg)},${f(b)})`; };
  if (T.indoor) {
    // 室内：石墙 + 柱子 / 王座厅帷幕 / 洞窟岩壁
    grd = g.createLinearGradient(0, Y0, 0, gy); grd.addColorStop(0, shade(T.wall[1], -0.35)); grd.addColorStop(1, T.wall[0]);
    g.fillStyle = grd; g.fillRect(X0, Y0, WW, gy - Y0 + 2);
    if (T.indoor === 'cave') {
      for (let i = 0; i < 60; i++) { const x = X0 + rnd() * WW, y = Y0 + rnd() * (gy - Y0), r = 8 + rnd() * 22; g.globalAlpha = 0.45; blob(x, y, r, [shade(T.wall[0], 0.1), shade(T.wall[0], -0.08), 'rgba(0,0,0,0)']); }
      g.globalAlpha = 1;
      g.fillStyle = shade(T.wall[1], -0.3);
      for (let i = 0; i < 9; i++) { const x = X0 + WW * (i + rnd() * 0.6) / 9, w = 10 + rnd() * 16, l = 20 + rnd() * 50; g.beginPath(); g.moveTo(x - w, Y0); g.lineTo(x + w, Y0); g.lineTo(x + rnd() * 4, Y0 + M + l * 0.6); g.closePath(); g.fill(); }
      const cg = g.createRadialGradient(W * 0.5, gy - 10, 10, W * 0.5, gy - 10, W * 0.7); cg.addColorStop(0, 'rgba(255,190,110,0.22)'); cg.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = cg; g.fillRect(X0, Y0, WW, gy - Y0);
    } else {
      // 砖缝
      g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1;
      const bh = 14;
      for (let r = 0, y = gy; y > Y0; r++, y -= bh) { g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); for (let x = X0 + (r % 2) * 18; x < X1; x += 36) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - bh); g.stroke(); } }
      g.fillStyle = 'rgba(255,255,255,0.05)'; for (let r = 0, y = gy; y > Y0; r++, y -= bh) g.fillRect(X0, y - bh + 1, WW, 2);
      if (T.indoor === 'throne') {
        // 帷幕与金穗
        for (const cx of [W * 0.12, W * 0.88]) {
          grd = g.createLinearGradient(cx - 40, 0, cx + 40, 0); grd.addColorStop(0, '#5a0a18'); grd.addColorStop(0.5, '#b8243a'); grd.addColorStop(1, '#5a0a18');
          g.fillStyle = grd; g.beginPath(); g.moveTo(cx - 44, Y0); g.lineTo(cx + 44, Y0); g.quadraticCurveTo(cx + 30, gy * 0.6, cx + 38, gy); g.lineTo(cx - 38, gy); g.quadraticCurveTo(cx - 30, gy * 0.6, cx - 44, Y0); g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 14, Y0); g.quadraticCurveTo(cx + k * 10, gy * 0.6, cx + k * 13, gy); g.stroke(); }
          g.fillStyle = '#f2c55a'; g.fillRect(cx - 46, Y0 + M + 6, 92, 5);
        }
        grd = g.createRadialGradient(W / 2, gy * 0.4, 5, W / 2, gy * 0.4, W * 0.45); grd.addColorStop(0, 'rgba(255,220,140,0.3)'); grd.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = grd; g.fillRect(X0, Y0, WW, gy);
      }
      // 柱子
      for (const px of [W * 0.03, W * 0.35, W * 0.65, W * 0.97]) {
        const pw = 22;
        grd = g.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0); grd.addColorStop(0, '#5a5a6e'); grd.addColorStop(0.35, '#c8c8d8'); grd.addColorStop(0.6, '#9a9aae'); grd.addColorStop(1, '#4a4a5c');
        g.fillStyle = grd; g.fillRect(px - pw / 2, Y0, pw, gy - Y0);
        g.fillStyle = '#7a7a8e'; g.fillRect(px - pw / 2 - 4, gy - 10, pw + 8, 10); g.fillRect(px - pw / 2 - 4, Y0 + M + 8, pw + 8, 8);
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(px - pw / 2 - 4, gy - 3, pw + 8, 3);
      }
      // 墙上火把光
      for (const tx of [W * 0.2, W * 0.8]) { grd = g.createRadialGradient(tx, gy * 0.42, 2, tx, gy * 0.42, 60); grd.addColorStop(0, 'rgba(255,200,110,0.55)'); grd.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = grd; g.fillRect(tx - 60, gy * 0.42 - 60, 120, 120); g.fillStyle = '#ffe8a0'; g.beginPath(); g.ellipse(tx, gy * 0.42, 3, 6, 0, 0, 7); g.fill(); g.fillStyle = '#5a4030'; g.fillRect(tx - 2, gy * 0.42 + 4, 4, 10); }
    }
  } else {
    // 天空
    grd = g.createLinearGradient(0, Y0, 0, gy); grd.addColorStop(0, T.sky[0]); grd.addColorStop(0.62, T.sky[1]); grd.addColorStop(1, T.sky[2]);
    g.fillStyle = grd; g.fillRect(X0, Y0, WW, gy - Y0 + 2);
    const sunX = W * 0.8, sunY = H * 0.08;
    if (terr === 'D') { g.fillStyle = '#e8d0ff'; g.beginPath(); g.arc(sunX, sunY + 12, 13, 0, 7); g.fill(); g.fillStyle = T.sky[0]; g.beginPath(); g.arc(sunX + 6, sunY + 8, 12, 0, 7); g.fill(); }
    grd = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, W * 0.55); grd.addColorStop(0, terr === 'D' ? 'rgba(220,170,255,0.45)' : terr === 'L' ? 'rgba(255,150,60,0.35)' : T.sun || 'rgba(255,250,225,0.85)'); grd.addColorStop(0.18, 'rgba(255,245,215,0.35)'); grd.addColorStop(1, 'rgba(255,245,215,0)');
    g.fillStyle = grd; g.fillRect(X0, Y0, WW, gy - Y0);
    if (terr !== 'D' && terr !== 'L') {
      // 云：一团团柔和的白色
      for (let c = 0; c < 5; c++) {
        const cx = X0 + WW * (c + rnd() * 0.7) / 5, cy = H * (0.06 + rnd() * 0.22), sc = 0.6 + rnd() * 0.7;
        for (let k = 0; k < 6; k++) { const x = cx + (k - 2.5) * 13 * sc, y = cy - Math.sin(k / 5 * Math.PI) * 8 * sc, r = (11 + Math.sin(k * 1.7) * 4) * sc; blob(x, y, r, ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.7)', 'rgba(230,240,255,0)']); }
      }
    } else {
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,${terr === 'L' ? 160 : 200},${terr === 'L' ? 80 : 255},${0.25 + rnd() * 0.5})`; g.beginPath(); g.arc(X0 + rnd() * WW, Y0 + rnd() * (gy - Y0) * 0.8, 0.6 + rnd() * 1.2, 0, 7); g.fill(); }
    }
    // 远景
    const fc = T.farC;
    if (T.far === 'mount' || T.far === 'peaks') {
      ridge(gy - H * 0.06, H * (T.far === 'peaks' ? 0.36 : 0.24), T.far === 'peaks' ? 14 : 9, shade(fc, 0.18), shade(fc, 0.35), T.far === 'peaks');
      if (T.snow || T.far === 'peaks') { g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(X0, Y0, WW, gy - H * 0.06 - H * 0.36 * 0.6); g.restore(); }
      ridge(gy - H * 0.02, H * 0.14, 11, fc, shade(fc, 0.12));
    } else if (T.far === 'trees') {
      for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) { const x = X0 + WW * (i + rnd() * 0.5) / 26, r = (14 + rnd() * 10) * (row ? 1.1 : 0.8), y = gy - (row ? 14 : 30) - rnd() * 10; blob(x, y, r, [shade(fc, row ? 0.05 : 0.25), shade(fc, row ? -0.15 : 0.1)]); }
    } else if (T.far === 'dunes') {
      ridge(gy - H * 0.03, H * 0.12, 6, shade(fc, 0.15), shade(fc, 0.3));
    } else if (T.far === 'sea') {
      grd = g.createLinearGradient(0, gy - H * 0.08, 0, gy); grd.addColorStop(0, shade(fc, 0.3)); grd.addColorStop(1, fc); g.fillStyle = grd; g.fillRect(X0, gy - H * 0.08, WW, H * 0.08 + 2);
      g.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 30; i++) g.fillRect(X0 + rnd() * WW, gy - H * 0.08 + rnd() * H * 0.08, 6 + rnd() * 14, 1);
    } else if (T.far === 'temple') {
      ridge(gy - H * 0.04, H * 0.2, 9, shade(fc, 0.2), shade(fc, 0.35));
      g.fillStyle = shade(fc, -0.2);
      for (const tx of [W * 0.2, W * 0.5, W * 0.8]) { g.fillRect(tx - 6, gy - H * 0.34, 12, H * 0.34); g.fillRect(tx - 10, gy - H * 0.36, 20, 6); }
    } else if (T.far === 'spires' || T.far === 'volcano') {
      if (T.far === 'volcano') { ridge(gy - H * 0.04, H * 0.3, 5, shade(fc, 0.1), fc); const vg = g.createRadialGradient(W * 0.5, gy - H * 0.32, 4, W * 0.5, gy - H * 0.32, H * 0.4); vg.addColorStop(0, 'rgba(255,140,40,0.7)'); vg.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = vg; g.fillRect(X0, Y0, WW, gy); }
      else { g.fillStyle = fc; for (let i = 0; i < 9; i++) { const x = X0 + WW * (i + 0.5) / 9, h = H * (0.18 + rnd() * 0.25), w = 8 + rnd() * 10; g.beginPath(); g.moveTo(x - w, gy); g.lineTo(x - w * 0.4, gy - h * 0.8); g.lineTo(x, gy - h); g.lineTo(x + w * 0.4, gy - h * 0.8); g.lineTo(x + w, gy); g.fill(); } }
    }
    // 中景
    const mc = T.midC;
    if (T.mid === 'hills' || T.mid === 'hills2' || T.mid === 'dunes2' || T.mid === 'rocks') ridge(gy + 1, H * (T.mid === 'hills2' ? 0.1 : 0.06), 7, shade(mc, 0.12), mc);
    else if (T.mid === 'trees2' || T.mid === 'pines' || T.mid === 'reeds') {
      for (let i = 0; i < 22; i++) {
        const x = X0 + WW * (i + rnd() * 0.6) / 22, h = 16 + rnd() * 16;
        if (T.mid === 'pines') { g.fillStyle = shade(mc, -0.1 + rnd() * 0.2); g.beginPath(); g.moveTo(x, gy - h * 1.6); g.lineTo(x + h * 0.45, gy + 1); g.lineTo(x - h * 0.45, gy + 1); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(x, gy - h * 1.6); g.lineTo(x + h * 0.16, gy - h * 1.05); g.lineTo(x - h * 0.16, gy - h * 1.05); g.fill(); }
        else if (T.mid === 'reeds') { g.strokeStyle = shade(mc, rnd() * 0.3); g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 3, gy + 2); g.quadraticCurveTo(x + k * 3 + 2, gy - h * 0.5, x + k * 3 + 5, gy - h); g.stroke(); } }
        else blob(x, gy - h * 0.5, h * 0.75, [shade(mc, 0.25), shade(mc, -0.05)]);
      }
    } else if (T.mid === 'village') {
      ridge(gy + 1, H * 0.05, 7, shade(mc, 0.12), mc);
      for (const hx of [W * 0.14, W * 0.3, W * 0.72, W * 0.9]) {
        const hw = 22 + rnd() * 8, hh = 16 + rnd() * 6, by = gy - 2;
        g.fillStyle = '#e8dcc0'; g.fillRect(hx - hw / 2, by - hh, hw, hh);
        g.fillStyle = '#b8402e'; g.beginPath(); g.moveTo(hx - hw / 2 - 4, by - hh); g.lineTo(hx, by - hh - 14); g.lineTo(hx + hw / 2 + 4, by - hh); g.fill();
        g.fillStyle = '#6a4a2a'; g.fillRect(hx - 3, by - 9, 6, 9); g.fillStyle = '#7ac0f0'; g.fillRect(hx + hw / 4 - 2, by - hh + 4, 5, 5);
      }
    } else if (T.mid === 'spires2') ridge(gy + 1, H * 0.07, 9, shade(mc, 0.1), mc, true);
    // 地平线雾气
    grd = g.createLinearGradient(0, gy - H * 0.12, 0, gy + 2); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(1, T.fog || (terr === 'D' ? 'rgba(160,80,200,0.25)' : terr === 'L' ? 'rgba(255,110,40,0.3)' : 'rgba(240,248,255,0.4)'));
    g.fillStyle = grd; g.fillRect(X0, gy - H * 0.12, WW, H * 0.12 + 2);
  }
  // 地面
  grd = g.createLinearGradient(0, gy, 0, Y1); grd.addColorStop(0, T.gr[0]); grd.addColorStop(0.45, T.gr[1]); grd.addColorStop(1, T.gr[2]);
  g.fillStyle = grd; g.fillRect(X0, gy, WW, Y1 - gy);
  const dk = T.gr[2];
  if (T.deco === 'grass') {
    // 远淡近浓的草丛：每丛三片细叶
    for (let i = 0; i < 170; i++) {
      const y = gy + 3 + Math.pow(rnd(), 1.25) * (Y1 - gy), k = (y - gy) / (Y1 - gy), sc = 0.45 + k * 1.1, x = X0 + rnd() * WW, lt = rnd() < 0.45;
      g.strokeStyle = lt ? shade(T.gr[0], 0.22) : shade(T.gr[1], -0.18); g.globalAlpha = 0.35 + k * 0.45; g.lineWidth = 0.9 * sc; g.lineCap = 'round';
      g.beginPath();
      for (const [dx, h, lean] of [[-1.5, 5, -2.2], [0, 7, 0.6], [1.6, 4.5, 2.4]]) { g.moveTo(x + dx * sc, y); g.quadraticCurveTo(x + dx * sc, y - h * sc * 0.6, x + (dx + lean) * sc, y - h * sc); }
      g.stroke();
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 14; i++) { const x = X0 + rnd() * WW, y = gy + 6 + rnd() * (H - gy); g.fillStyle = ['#fff6a0', '#ffffff', '#ffb0c8'][i % 3]; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  } else if (T.deco === 'road') {
    grd = g.createLinearGradient(0, gy, 0, Y1); grd.addColorStop(0, shade(T.gr[0], 0.15)); grd.addColorStop(1, T.gr[1]);
    g.fillStyle = '#6aa040'; g.fillRect(X0, gy, WW, 8);
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 120; i++) { const x = X0 + rnd() * WW, y = gy + 8 + rnd() * (Y1 - gy); g.beginPath(); g.ellipse(x, y, 2 + rnd() * 3, 1 + rnd(), 0, 0, 7); g.fill(); }
  } else if (T.deco === 'pebble') {
    for (let i = 0; i < 90; i++) { const x = X0 + rnd() * WW, y = gy + 4 + rnd() * (Y1 - gy), r = 1.5 + rnd() * 4 * (0.5 + (y - gy) / H); blob(x, y, r, [shade(T.gr[0], 0.25), shade(T.gr[1], -0.15)]); }
  } else if (T.deco === 'ripple' || T.deco === 'snow') {
    g.strokeStyle = T.deco === 'snow' ? 'rgba(160,180,215,0.5)' : 'rgba(150,100,40,0.35)'; g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) { const y = gy + 6 + rnd() * (Y1 - gy), x = X0 + rnd() * WW, l = 20 + rnd() * 50; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 3, x + l, y); g.stroke(); }
    if (T.deco === 'snow') for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(X0 + rnd() * WW, gy + rnd() * (Y1 - gy), 0.8 + rnd(), 0, 7); g.fill(); }
  } else if (T.deco === 'water') {
    for (let i = 0; i < 60; i++) { const y = gy + 3 + Math.pow(rnd(), 1.2) * (Y1 - gy), x = X0 + rnd() * WW, l = (8 + rnd() * 26) * (0.6 + (y - gy) / H); g.strokeStyle = `rgba(255,255,255,${0.25 + rnd() * 0.35})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke(); }
  } else if (T.deco === 'planks') {
    for (let y = gy, i = 0; y < Y1; i++) { const hh = 7 + i * 1.6; g.fillStyle = i % 2 ? shade(T.gr[1], 0.08) : shade(T.gr[1], -0.04); g.fillRect(X0, y, WW, hh); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X0, y + hh - 1.2, WW, 1.2); g.fillStyle = 'rgba(255,230,180,0.2)'; g.fillRect(X0, y, WW, 1); y += hh; }
  } else if (T.deco === 'swamp') {
    for (let i = 0; i < 18; i++) { const x = X0 + rnd() * WW, y = gy + 10 + rnd() * (Y1 - gy), r = 10 + rnd() * 26; g.fillStyle = 'rgba(70,110,100,0.45)'; g.beginPath(); g.ellipse(x, y, r, r * 0.25, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(200,230,220,0.3)'; g.stroke(); }
  } else if (T.deco === 'rune' || T.deco === 'lava') {
    // 龟裂的岩地：发光的裂缝（魔域紫光 / 熔岩橙光）+ 光池
    const lava = T.deco === 'lava', cc = lava ? '255,140,40' : '200,110,255';
    for (let i = 0; i < 26; i++) { const x = X0 + rnd() * WW, y = gy + 4 + rnd() * (Y1 - gy), r = 4 + rnd() * 12; blob(x, y, r * (0.6 + (y - gy) / H), [shade(T.gr[0], 0.12), shade(T.gr[1], -0.1), 'rgba(0,0,0,0)']); }
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 14; i++) {
      let x = X0 + rnd() * WW, y = gy + 4 + rnd() * (Y1 - gy); const pts = [[x, y]];
      for (let k = 0; k < 6; k++) { x += (rnd() - 0.3) * 26; y += (rnd() - 0.5) * 8; pts.push([x, y]); }
      for (const [w, a] of [[5, 0.18], [1.6, 0.85]]) { g.strokeStyle = `rgba(${cc},${a})`; g.lineWidth = w * (0.5 + (pts[0][1] - gy) / H); g.beginPath(); pts.forEach(([px, py], k) => g[k ? 'lineTo' : 'moveTo'](px, py)); g.stroke(); }
    }
    for (let i = 0; i < (lava ? 7 : 4); i++) { const x = X0 + rnd() * WW, y = gy + 10 + rnd() * (Y1 - gy - 10), r = 10 + rnd() * 18; const lg2 = g.createRadialGradient(x, y, 1, x, y, r); lg2.addColorStop(0, lava ? 'rgba(255,230,140,0.9)' : 'rgba(240,200,255,0.7)'); lg2.addColorStop(0.4, `rgba(${cc},0.55)`); lg2.addColorStop(1, `rgba(${cc},0)`); g.fillStyle = lg2; g.beginPath(); g.ellipse(x, y, r * 1.7, r * 0.42, 0, 0, 7); g.fill(); }
    g.restore();
  } else if (T.deco === 'tiles' || T.deco === 'carpet') {
    // 透视地砖
    const vx = W / 2, vy = gy - H * 0.9;
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.2;
    for (let i = -12; i <= 12; i++) { const bx = vx + i * 46; g.beginPath(); g.moveTo(vx + (bx - vx) * (gy - vy) / (Y1 - vy), gy); g.lineTo(bx, Y1); g.stroke(); }
    for (let k = 0, y = gy; y < Y1; k++) { g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); y += 6 + k * 4; }
    if (T.deco === 'carpet') {
      const cw0 = W * 0.16, cw1 = W * 0.5;
      grd = g.createLinearGradient(0, gy, 0, Y1); grd.addColorStop(0, '#a01c30'); grd.addColorStop(1, '#6a0a1c');
      g.fillStyle = grd; g.beginPath(); g.moveTo(W / 2 - cw0, gy); g.lineTo(W / 2 + cw0, gy); g.lineTo(W / 2 + cw1, Y1); g.lineTo(W / 2 - cw1, Y1); g.fill();
      g.strokeStyle = '#f2c55a'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - cw0 + 4, gy); g.lineTo(W / 2 - cw1 + 8, Y1); g.moveTo(W / 2 + cw0 - 4, gy); g.lineTo(W / 2 + cw1 - 8, Y1); g.stroke();
    }
    // 地面反光
    grd = g.createLinearGradient(0, gy, 0, gy + H * 0.2); grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(X0, gy, WW, H * 0.2);
  }
  // 地平线接缝的柔光 + 地面前缘的暗部
  grd = g.createLinearGradient(0, gy - 2, 0, gy + 10); grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(X0, gy - 2, WW, 12);
  grd = g.createLinearGradient(0, H * 0.72, 0, Y1); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(6,10,30,0.45)'); g.fillStyle = grd; g.fillRect(X0, H * 0.72, WW, Y1 - H * 0.72);
  // 光束 / 魔光 / 熔岩光
  if (T.shafts) { g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 5; i++) { const x = X0 + WW * (0.1 + i * 0.2 + rnd() * 0.08), w = 14 + rnd() * 22; grd = g.createLinearGradient(x, Y0, x - 60, gy + 30); grd.addColorStop(0, T.shafts); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.beginPath(); g.moveTo(x, Y0); g.lineTo(x + w, Y0); g.lineTo(x + w - 70, gy + 40); g.lineTo(x - 70, gy + 40); g.fill(); } g.restore(); }
  if (T.glow) { grd = g.createLinearGradient(0, gy - H * 0.3, 0, Y1); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, T.glow); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = grd; g.fillRect(X0, gy - H * 0.3, WW, Y1 - gy + H * 0.3); g.restore(); }
  // 四角压暗，视线集中在中央
  grd = g.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, W * 0.85); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(4,6,24,0.42)'); g.fillStyle = grd; g.fillRect(X0, Y0, WW, Y1 - Y0);
  DUEL_BGC.key = key; DUEL_BGC.cv = cv;
  return cv;
}

// ---------- 资讯面板（光泽海军蓝 + 金边，与地图 UI 一致） ----------
function duelRRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function duelPanelHD(g, u, isLeft, W, H, real, dtR) {
  const hb = DUEL.hb[u.uid];
  const pw = W * 0.455, ph = H * 0.2, py0 = (DUEL.HC || H) - ph - H * 0.025;
  // 名牌：开场从两侧滑入（略带回弹），收场滑出
  const sd = isLeft ? -1 : 1, ko = Math.min(1, Math.max(0, (real - (DUEL.openT || 0) - T(90)) / Math.max(1, T(440)))), kc = DUEL.closeT ? Math.min(1, (real - DUEL.closeT) / Math.max(1, T(300))) : 0;
  const eb = ko >= 1 ? 1 : 1 + 2.2 * Math.pow(ko - 1, 3) + 1.2 * Math.pow(ko - 1, 2);
  let px = (isLeft ? W * 0.025 : W - W * 0.025 - pw) + sd * (pw + 24) * ((1 - eb) + kc * kc), py = py0;
  // HP 条：缓出的平滑流失（命中停顿后开始），红色残影稍后跟上
  if (hb.disp == null) { hb.disp = hb.shown; hb.to = hb.shown; }
  if (hb.to !== hb.shown) { hb.from = hb.disp; hb.to = hb.shown; hb.eT = hb.gs = real + (hb.shown < hb.from ? T(80) : 0); hb.g2 = Math.max(hb.g2 || 0, hb.from); }
  if (hb.eT != null) { const k = Math.min(1, Math.max(0, (real - hb.eT) / Math.max(1, T(560)))); hb.disp = hb.from + (hb.to - hb.from) * (1 - Math.pow(1 - k, 3)); if (k >= 1) hb.eT = null; }
  if (real - (hb.gs || 0) > T(620)) hb.g2 = (hb.g2 || 0) + (hb.disp - (hb.g2 || 0)) * (1 - Math.exp(-dtR * 7));
  hb.g2 = Math.max(hb.g2 || 0, hb.disp);
  if (real < hb.shakeT) { px += (Math.random() * 2 - 1) * 3; py += (Math.random() * 2 - 1) * 2; }
  const team = HD_TEAM_DUEL[u.team] || HD_TEAM_DUEL.enemy, r = Math.min(10, ph * 0.22);
  // 面板
  // 投影（不用 shadowBlur，低端机上较省）
  duelRRect(g, px + 1, py + 3, pw, ph + 1, r); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
  duelRRect(g, px - 1, py + 1, pw + 2, ph + 3, r + 1); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill();
  g.save();
  duelRRect(g, px, py, pw, ph, r);
  let gr = g.createLinearGradient(0, py, 0, py + ph); gr.addColorStop(0, '#1e3a72'); gr.addColorStop(0.46, '#12264e'); gr.addColorStop(0.54, '#0b1838'); gr.addColorStop(1, '#0f1f46');
  g.fillStyle = gr; g.fill(); g.restore();
  // 金边 + 青色内线 + 上缘高光
  duelRRect(g, px, py, pw, ph, r); g.lineWidth = 2; g.strokeStyle = '#d9b45a'; g.stroke();
  duelRRect(g, px + 2.5, py + 2.5, pw - 5, ph - 5, Math.max(2, r - 2)); g.lineWidth = 1; g.strokeStyle = 'rgba(86,214,226,0.32)'; g.stroke();
  g.save(); duelRRect(g, px + 2, py + 2, pw - 4, ph * 0.42, Math.max(2, r - 2)); g.clip();
  gr = g.createLinearGradient(0, py, 0, py + ph * 0.42); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0.02)'); g.fillStyle = gr; g.fillRect(px, py, pw, ph * 0.42); g.restore();
  // 阵营色条（靠外侧）
  const sx = isLeft ? px + 5 : px + pw - 9;
  gr = g.createLinearGradient(0, py + 6, 0, py + ph - 6); gr.addColorStop(0, team.hi); gr.addColorStop(1, team.main);
  g.fillStyle = gr; duelRRect(g, sx, py + 6, 4, ph - 12, 2); g.fill();
  // 名字与职业
  const ix = isLeft ? px + 14 : px + 10, iw = pw - 24, fs = Math.round(H * 0.066);
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.font = `900 ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = 'rgba(4,8,24,0.85)';
  const ny = py + ph * 0.36;
  g.strokeText(u.name, ix, ny, iw * 0.58); g.fillStyle = '#ffffff'; g.fillText(u.name, ix, ny, iw * 0.58);
  g.textAlign = 'right'; g.font = `bold ${Math.round(H * 0.046)}px "PingFang SC","Microsoft YaHei",sans-serif`;
  g.fillStyle = '#9fe6ee'; g.fillText(`${className(u)}`, ix + iw, ny - fs * 0.02, iw * 0.42);
  // HP 条
  const bx = ix + H * 0.1, bw = iw - H * 0.1, by = py + ph * 0.52, bh = Math.max(7, ph * 0.17);
  g.textAlign = 'left'; g.font = `900 italic ${Math.round(H * 0.045)}px sans-serif`; g.fillStyle = '#f2c55a';
  g.strokeStyle = 'rgba(4,8,24,0.9)'; g.lineWidth = 3; g.strokeText('HP', ix, by + bh * 0.88); g.fillText('HP', ix, by + bh * 0.88);
  duelRRect(g, bx - 1.5, by - 1.5, bw + 3, bh + 3, (bh + 3) / 2); g.fillStyle = '#050a1c'; g.fill(); g.strokeStyle = 'rgba(217,180,90,0.7)'; g.lineWidth = 1; g.stroke();
  const rr = Math.max(0, hb.disp / u.mhp), rg = Math.max(rr, hb.g2 / u.mhp);
  g.save(); duelRRect(g, bx, by, bw, bh, bh / 2); g.clip();
  g.fillStyle = '#1a2240'; g.fillRect(bx, by, bw, bh);
  if (rg > rr) { g.fillStyle = real - hb.gT < T(110) ? '#ffffff' : '#ff4a5a'; g.fillRect(bx + bw * rr, by, bw * (rg - rr), bh); }
  const fl = real < hb.flashT && Math.floor((hb.flashT - real) / 60) % 2 === 0;
  const cols = rr > 0.5 ? ['#b8ff8a', '#4cd65a', '#1e8a3a'] : rr > 0.25 ? ['#fff0a0', '#f2c030', '#a87810'] : ['#ffb0a0', '#ff4a3a', '#a81a1a'];
  gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, fl ? '#ffffff' : cols[0]); gr.addColorStop(0.5, fl ? '#ffffff' : cols[1]); gr.addColorStop(1, fl ? '#e0e8ff' : cols[2]);
  g.fillStyle = gr; g.fillRect(bx, by, bw * rr, bh);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(bx, by + 1, bw * rr, bh * 0.32);
  g.fillStyle = 'rgba(0,0,0,0.25)'; for (let k = 1; k < 10; k++) g.fillRect(bx + bw * k / 10, by, 1, bh);
  g.restore();
  // 数值
  const vy = py + ph * 0.93;
  g.font = `900 ${Math.round(H * 0.07)}px "Arial Black","Helvetica Neue",Arial,sans-serif`; g.textAlign = 'left';
  const hpS = String(Math.max(0, Math.round(hb.disp)));
  g.lineWidth = 3.5; g.strokeStyle = 'rgba(4,8,24,0.95)'; g.strokeText(hpS, ix, vy);
  gr = g.createLinearGradient(0, vy - H * 0.06, 0, vy); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, rr > 0.25 ? '#cfe8ff' : '#ffb0a0');
  g.fillStyle = gr; g.fillText(hpS, ix, vy);
  const w1 = g.measureText(hpS).width;
  g.font = `bold ${Math.round(H * 0.045)}px Arial,sans-serif`; g.fillStyle = '#9fb0d8'; g.fillText(` / ${u.mhp}`, ix + w1, vy);
  g.textAlign = 'right'; g.fillStyle = '#f2c55a'; g.font = `900 ${Math.round(H * 0.044)}px Arial,sans-serif`; g.fillText(`Lv ${u.lv}`, ix + iw, vy);
}
const HD_TEAM_DUEL = { player: { main: '#38a4ff', hi: '#a8deff' }, enemy: { main: '#ff4048', hi: '#ffb0b0' }, ally: { main: '#3ad870', hi: '#b0ffc8' }, rogue: { main: '#f0bc2a', hi: '#fff0a0' } };

// ---------- 伤害数字：粗体斜体、深色描边 + 渐层填色 + 外发光 ----------
function duelDmgHD(g, f, t, H, s) {
  const crit = f.kind === 'crit', miss = f.kind === 'miss';
  const size = Math.round(H * (miss ? 0.085 : crit ? 0.15 : 0.115));
  g.font = `900 italic ${size}px "Arial Black","Helvetica Neue",Arial,sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const txt = f.text;
  if (!miss) {
    // 外发光：几层逐渐变细的加色描边（比 shadowBlur 便宜）
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [lw, a] of [[size * 0.62, 0.12], [size * 0.42, 0.18]]) { g.lineWidth = lw; g.strokeStyle = crit ? `rgba(255,150,40,${a})` : `rgba(110,180,255,${a})`; g.strokeText(txt, 0, 0); }
    g.restore();
  }
  g.lineWidth = size * 0.2; g.strokeStyle = '#0c0618'; g.strokeText(txt, 0, 0);
  g.lineWidth = size * 0.08; g.strokeStyle = miss ? '#2a3a5a' : crit ? '#7a2a00' : '#1a2a6a'; g.strokeText(txt, 0, 0);
  const gr = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  if (miss) { gr.addColorStop(0, '#f0f6ff'); gr.addColorStop(1, '#8aa8d8'); }
  else if (crit) { gr.addColorStop(0, '#fffde0'); gr.addColorStop(0.45, '#ffe040'); gr.addColorStop(0.55, '#ffb020'); gr.addColorStop(1, '#ff5a10'); }
  else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.48, '#ffffff'); gr.addColorStop(0.56, '#d8e8ff'); gr.addColorStop(1, '#a8c4f0'); }
  g.fillStyle = gr; g.fillText(txt, 0, 0);
  if (crit) {
    const fs = Math.round(H * 0.065);
    g.font = `900 ${fs}px "PingFang SC","Microsoft YaHei",sans-serif`;
    g.lineWidth = fs * 0.24; g.strokeStyle = '#140a1e'; g.strokeText('暴击!', 0, -size * 0.78);
    const g2 = g.createLinearGradient(0, -size * 0.78 - fs / 2, 0, -size * 0.78 + fs / 2); g2.addColorStop(0, '#ffd0a0'); g2.addColorStop(1, '#ff3a2a');
    g.fillStyle = g2; g.fillText('暴击!', 0, -size * 0.78);
  }
}

// ---------- 发光特效 ----------
function duelGlowDot(g, x, y, r, col, a) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.25, col.replace('A', a * 0.9)); rg.addColorStop(1, col.replace('A', 0));
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
// 锥形光刃（两端尖、中间粗的弧线）
function duelBlade(g, cx, cy, R, a0, a1, w, col, core) {
  const n = 18;
  g.beginPath();
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, ww = w * Math.sin(t * Math.PI); g.lineTo(cx + Math.cos(a) * (R + ww), cy + Math.sin(a) * (R + ww)); }
  for (let i = n; i >= 0; i--) { const t = i / n, a = a0 + (a1 - a0) * t, ww = w * Math.sin(t * Math.PI) * 0.35; g.lineTo(cx + Math.cos(a) * (R - ww), cy + Math.sin(a) * (R - ww)); }
  g.closePath(); g.fillStyle = col; g.fill();
  if (core) { g.strokeStyle = core; g.lineWidth = Math.max(1, w * 0.18); g.beginPath(); for (let i = 2; i <= n - 2; i++) { const t = i / n, a = a0 + (a1 - a0) * t; g[i === 2 ? 'moveTo' : 'lineTo'](cx + Math.cos(a) * (R + w * 0.25 * Math.sin(t * Math.PI)), cy + Math.sin(a) * (R + w * 0.25 * Math.sin(t * Math.PI))); } g.stroke(); }
}
function duelStreak(g, x0, y0, x1, y1, w, c0, c1) {
  const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, c0); lg.addColorStop(1, c1);
  const a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a) * w / 2, ny = Math.cos(a) * w / 2;
  g.fillStyle = lg; g.beginPath(); g.moveTo(x0 + nx, y0 + ny); g.lineTo(x1, y1); g.lineTo(x0 - nx, y0 - ny); g.closePath(); g.fill();
}
// 回传 true 表示已处理（否则退回像素版绘制）
function duelDrawFxHD(g, f, p, now, anc, s) {
  const lerp = (a, b, t) => a + (b - a) * t, add = () => { g.globalCompositeOperation = 'lighter'; }, norm = () => { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; };
  if (f.type === 'slash') {
    if (!f.dir) f.dir = f.u === DUEL.left ? -1 : 1;
    const [cx, cy] = anc(f.u, 'chest'), size = 44 * s, e = 1 - Math.pow(1 - p, 3), fade = 1 - p;
    const hot = f.crit ? 'rgba(255,214,90,A)' : 'rgba(150,215,255,A)';
    add();
    if (f.style === 'thrust' || f.style === 'bolt' || f.style === 'arrow' || f.style === 'marrow' || f.style === 'laser') {
      // 贯穿：一道横向光枪 + 放射细线
      const L = size * (0.5 + e * 0.9);
      duelStreak(g, cx - f.dir * L * 0.2, cy, cx + f.dir * L, cy, size * 0.24 * fade, hot.replace('A', 0.9 * fade), hot.replace('A', 0));
      duelStreak(g, cx - f.dir * L * 0.1, cy, cx + f.dir * L * 0.8, cy, size * 0.08 * fade, `rgba(255,255,255,${fade})`, 'rgba(255,255,255,0)');
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, r0 = size * 0.15, r1 = size * (0.3 + e * 0.45); duelStreak(g, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, 3.2 * s * fade, `rgba(255,255,255,${fade})`, hot.replace('A', 0)); }
    } else if (f.style === 'claw' || f.style === 'bite') {
      for (let k = -1; k <= 1; k++) { const ox = k * 9 * s; duelBlade(g, cx + ox - size * 1.1, cy - size * 0.9, size * 1.4, 0.25, 0.25 + e * 0.95, 5 * s * fade, hot.replace('A', 0.95 * fade), `rgba(255,255,255,${fade})`); }
    } else if (f.style === 'bonk') {
      for (let k = 0; k < 5; k++) { const a = now * 0.01 + k * Math.PI * 2 / 5, x = cx + Math.cos(a) * size * 0.4, y = cy - size * 0.55 + Math.sin(a) * size * 0.13; duelGlowDot(g, x, y, 7 * s, 'rgba(255,220,90,A)', fade); }
    } else if (f.style === 'chop') {
      duelBlade(g, cx + size * 1.4 * f.dir, cy + size * 0.1, size * 1.45, f.dir > 0 ? Math.PI * 1.08 : -0.08 - Math.PI * 0.0, f.dir > 0 ? Math.PI * 1.08 + e * 0.75 : -0.08 - e * 0.75, 9 * s * fade, hot.replace('A', 0.95 * fade), `rgba(255,255,255,${fade})`);
      norm(); g.globalAlpha = 0.55 * fade;
      for (let k = -2; k <= 2; k++) { const rg = g.createRadialGradient(cx + k * size * 0.22 * (0.5 + p), cy + size * 0.62, 0, cx + k * size * 0.22 * (0.5 + p), cy + size * 0.62, (7 - Math.abs(k)) * s * (1.2 + p)); rg.addColorStop(0, 'rgba(230,210,170,0.9)'); rg.addColorStop(1, 'rgba(230,210,170,0)'); g.fillStyle = rg; g.beginPath(); g.arc(cx + k * size * 0.22 * (0.5 + p), cy + size * 0.62, (7 - Math.abs(k)) * s * (1.2 + p), 0, 7); g.fill(); }
    } else if (f.style === 'iai') {
      // 居合：一道横贯画面的细长光痕
      const L = size * 2.2 * (0.4 + e * 0.6);
      duelStreak(g, cx - L, cy + size * 0.12, cx + L, cy - size * 0.12, (f.crit ? 7 : 5) * s * fade, hot.replace('A', 0), hot.replace('A', 0.95 * fade));
      duelStreak(g, cx + L, cy - size * 0.12, cx - L, cy + size * 0.12, (f.crit ? 7 : 5) * s * fade, hot.replace('A', 0), hot.replace('A', 0.95 * fade));
      g.strokeStyle = `rgba(255,255,255,${fade})`; g.lineWidth = 1.6 * s; g.beginPath(); g.moveTo(cx - L * 0.8, cy + size * 0.1); g.lineTo(cx + L * 0.8, cy - size * 0.1); g.stroke();
    } else {
      // 斩击：交叉的两道月牙光刃
      const d = f.dir;
      duelBlade(g, cx - d * size * 0.9, cy - size * 0.9, size * 1.25, d > 0 ? 0.15 : Math.PI - 0.15, d > 0 ? 0.15 + e * 1.25 : Math.PI - 0.15 - e * 1.25, (f.crit ? 11 : 8) * s * fade, hot.replace('A', 0.95 * fade), `rgba(255,255,255,${fade})`);
      if (f.crit) duelBlade(g, cx - d * size * 0.9, cy + size * 0.9, size * 1.25, d > 0 ? -0.15 : Math.PI + 0.15, d > 0 ? -0.15 - e * 1.1 : Math.PI + 0.15 + e * 1.1, 8 * s * fade, hot.replace('A', 0.9 * fade), `rgba(255,255,255,${fade})`);
    }
    // 中心冲击光 + 冲击波环
    duelGlowDot(g, cx, cy, size * (0.3 + p * 0.45), hot, 0.6 * fade);
    norm(); g.globalAlpha = fade * 0.8; g.strokeStyle = f.crit ? '#ffe9a0' : '#e0f2ff'; g.lineWidth = 3 * s * fade;
    g.beginPath(); g.ellipse(cx, cy, size * (0.2 + e * 0.9), size * (0.2 + e * 0.9) * 0.82, 0, 0, 7); g.stroke();
    norm(); return true;
  }
  if (f.type === 'burst') {
    if (!f.at) { const c = anc(f.u, 'chest'); f.at = [c[0] - f.dir * 5 * s, c[1]]; }
    const e = 1 - (1 - p) * (1 - p), R = (12 + (f.crit ? 34 : f.small ? 10 : 22) * e) * s * (f.small ? 0.75 : 1), fade = p < 0.4 ? 1 : 1 - (p - 0.4) / 0.6;
    const col = f.crit ? 'rgba(255,200,70,A)' : 'rgba(255,240,200,A)';
    add();
    duelGlowDot(g, f.at[0], f.at[1], R * 1.1, col, 0.55 * fade);
    // 尖锐的星芒
    g.fillStyle = `rgba(255,255,255,${fade})`;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + (k % 2 ? 0.2 : 0) + (f.crit ? p * 0.3 : 0), len = (k % 2 ? 0.55 : 1) * R * 1.5, w = R * 0.1;
      g.beginPath(); g.moveTo(f.at[0] + Math.cos(a + 1.57) * w, f.at[1] + Math.sin(a + 1.57) * w); g.lineTo(f.at[0] + Math.cos(a) * len, f.at[1] + Math.sin(a) * len); g.lineTo(f.at[0] + Math.cos(a - 1.57) * w, f.at[1] + Math.sin(a - 1.57) * w); g.fill();
    }
    norm(); return true;
  }
  if (f.type === 'spark') {
    if (!f.at) f.at = anc(f.u, 'chest');
    const t = (now - f.t0) / 1000, x = f.at[0] + f.vx * t, y = f.at[1] + f.vy * t + 300 * t * t, vx = f.vx, vy = f.vy + 600 * t, sp = Math.hypot(vx, vy) || 1, L = Math.min(26, sp * 0.045) * s / 2.2;
    add(); g.globalAlpha = 1 - p;
    duelStreak(g, x - vx / sp * L, y - vy / sp * L, x, y, 2.4 * s, 'rgba(255,255,255,0)', f.col);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 1.1 * s, 0, 7); g.fill();
    norm(); return true;
  }
  if (f.type === 'dust' || f.type === 'smoke') {
    if (!f.at) { const c = anc(f.u, 'feet'); f.at = f.type === 'dust' ? [c[0] - f.dir * (4 + f.k * 3) * s, c[1] - s] : [c[0], c[1] - 16 * s]; }
    const puffs = f.type === 'dust' ? [[0, 0, 1], [-1.2, 0.3, 0.7], [1.1, 0.4, 0.65]] : Array.from({ length: 7 }, (_, k) => { const a = k / 7 * Math.PI * 2 + 0.4; return [Math.cos(a) * 1.6, Math.sin(a) * 1.3, 0.8 + (k % 3) * 0.2]; });
    const r = f.type === 'dust' ? (3 + 7 * p) * s * (1 - f.k * 0.1) : (6 + 10 * p) * s, y0 = f.at[1] - p * (f.type === 'dust' ? 6 : 8) * s;
    g.globalAlpha = (f.type === 'dust' ? 0.6 : 0.85) * (1 - p);
    for (const [dx, dy, rr] of puffs) {
      const x = f.at[0] + dx * r * (f.type === 'smoke' ? 1 + p : 1), y = y0 + dy * r * 0.7, R = rr * r;
      const rg = g.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
      rg.addColorStop(0, f.type === 'dust' ? 'rgba(250,240,215,1)' : 'rgba(250,248,255,1)'); rg.addColorStop(0.6, f.type === 'dust' ? 'rgba(210,190,150,0.8)' : 'rgba(190,184,210,0.8)'); rg.addColorStop(1, 'rgba(200,190,170,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill();
    }
    norm(); return true;
  }
  if (f.type === 'shatter') {
    if (!f.parts) {
      const st = duelFig(f.u), sp = st.spec, ft = anc(f.u, 'feet'), tp = anc(f.u, 'top'), s2 = (st.spec.mount ? DUEL.sm : s) * (st.spec.scaleK || 1);
      const cols = sp.kind === 'doll' ? [sp.p, sp.skin, (sp.armor && sp.armor.c) || sp.shirt, sp.hair, '#ffffff'] : ['#ffffff', '#c8c8d8', '#a8b8e8'];
      const top = Math.min(tp[1], ft[1] - 20 * s2);
      f.parts = Array.from({ length: 46 }, () => ({ x: ft[0] + (Math.random() * 2 - 1) * 14 * s2, y: top + Math.random() * (ft[1] - top), vx: (Math.random() * 2 - 1) * 40 * s2, vy: -(20 + Math.random() * 70) * s2, c: cols[Math.floor(Math.random() * cols.length)] || '#fff', z: s2 * (1.2 + Math.random() * 1.8), a: Math.random() * 6, w: (Math.random() - 0.5) * 8 }));
    }
    const t = p * f.dur / 1000;
    for (const q of f.parts) {
      const x = q.x + q.vx * t, y = q.y + q.vy * t - 20 * t * t;
      g.globalAlpha = 1 - p * p; g.fillStyle = q.c;
      g.save(); g.translate(x, y); g.rotate(q.a + q.w * t); g.beginPath(); g.moveTo(0, -q.z); g.lineTo(q.z * 0.6, 0); g.lineTo(0, q.z); g.lineTo(-q.z * 0.6, 0); g.fill(); g.restore();
      add(); g.globalAlpha = (1 - p) * 0.5; duelGlowDot(g, x, y, q.z * 2.2, 'rgba(255,240,200,A)', 0.6); norm();
    }
    norm(); return true;
  }
  if (f.type === 'puff') { duelPuffHD(g, f, p); return true; }
  if (f.type === 'glint') {
    const [x, y] = anc(f.u, 'tip'), k = Math.sin(p * Math.PI), r = (6 + (f.big ? 24 : 16) * k) * s * 0.6;
    add(); duelGlowDot(g, x, y, r * 1.4, 'rgba(255,240,170,A)', 0.8 * k);
    g.fillStyle = `rgba(255,255,240,${k})`; g.save(); g.translate(x, y); g.rotate(p * 1.2);
    for (const [L, w] of [[r * 1.6, r * 0.13], [r * 0.9, r * 0.1]]) { g.beginPath(); g.moveTo(-L, 0); g.lineTo(0, -w); g.lineTo(L, 0); g.lineTo(0, w); g.fill(); g.beginPath(); g.moveTo(0, -L); g.lineTo(w, 0); g.lineTo(0, L); g.lineTo(-w, 0); g.fill(); g.rotate(Math.PI / 4); }
    g.restore(); norm(); return true;
  }
  if (f.type === 'streak') {
    if (!f.from) f.from = anc(f.u, 'hand').slice();
    const to = anc(f.u, 'hand');
    add(); g.lineCap = 'round';
    g.strokeStyle = `rgba(160,220,255,${(1 - p) * 0.45})`; g.lineWidth = 10 * s; g.beginPath(); g.moveTo(f.from[0], f.from[1]); g.lineTo(to[0], to[1]); g.stroke();
    g.strokeStyle = `rgba(255,255,255,${1 - p})`; g.lineWidth = 2.6 * s; g.beginPath(); g.moveTo(f.from[0], f.from[1]); g.lineTo(to[0], to[1]); g.stroke();
    norm(); return true;
  }
  if (f.type === 'whoosh') {
    const c = anc(f.u, 'chest');
    add(); g.globalAlpha = 0.8 * (1 - p);
    for (let k = 0; k < 4; k++) { const y = c[1] - 14 * s + k * 9 * s, L = (30 - k * 4) * s * (0.5 + p), x0 = c[0] + f.dir * (6 + p * 22) * s; duelStreak(g, x0 + f.dir * L, y, x0, y, 2.6 * s, 'rgba(220,240,255,0)', 'rgba(220,240,255,0.9)'); }
    norm(); return true;
  }
  if (f.type === 'arrow' || f.type === 'bolt') {
    if (!f.a) { f.a = anc(f.from, 'shot').slice(); f.b = anc(f.to, 'chest').slice(); if (f.dy) { f.a[1] += f.dy * s; f.b[1] += f.dy * s; } }
    const arcK = f.type === 'arrow' ? 10 * s : 0, x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * arcK;
    const ang = Math.atan2((f.b[1] - f.a[1]) - Math.cos(p * Math.PI) * arcK * Math.PI, f.b[0] - f.a[0]);
    g.save(); g.translate(x, y); g.rotate(ang);
    const L = (f.type === 'arrow' ? 16 : 11) * s;
    add(); duelStreak(g, -L * 3.2, 0, -L * 0.6, 0, 2.6 * s, 'rgba(200,235,255,0)', 'rgba(220,240,255,0.75)'); norm();
    let lg = g.createLinearGradient(0, -s, 0, s); lg.addColorStop(0, f.type === 'arrow' ? '#e8c088' : '#8a6a4a'); lg.addColorStop(1, f.type === 'arrow' ? '#8a5a2a' : '#4a3018');
    g.fillStyle = lg; g.beginPath(); g.roundRect ? g.roundRect(-L, -0.6 * s, L, 1.2 * s, 0.6 * s) : g.rect(-L, -0.6 * s, L, 1.2 * s); g.fill();
    lg = g.createLinearGradient(0, -2 * s, 0, 2 * s); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.5, '#c8d4e8'); lg.addColorStop(1, '#6a7890');
    g.fillStyle = lg; g.beginPath(); g.moveTo(-0.5 * s, -2.1 * s); g.lineTo(4 * s, 0); g.lineTo(-0.5 * s, 2.1 * s); g.lineTo(0.4 * s, 0); g.closePath(); g.fill();
    g.fillStyle = f.type === 'arrow' ? '#f4f0ec' : '#d83a3a';
    for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(-L + 4 * s, sg * 0.4 * s); g.lineTo(-L - 0.5 * s, sg * 2.4 * s); g.lineTo(-L + 1, sg * 0.4 * s); g.fill(); }
    g.restore(); return true;
  }
  if (f.type === 'orb' || f.type === 'wave') {
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p), dir = Math.sign(f.b[0] - f.a[0]) || 1;
    add();
    if (f.type === 'orb') {
      const c = f.col || '#c8f4ff', n = parseInt(c.slice(1), 16), rgbA = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`;
      for (let k = 1; k <= 5; k++) { const q = Math.max(0, p - k * 0.05); duelGlowDot(g, lerp(f.a[0], f.b[0], q), lerp(f.a[1], f.b[1], q), (9 - k) * s, rgbA, 0.35 * (1 - k / 6)); }
      duelGlowDot(g, x, y, 15 * s, rgbA, 0.9);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 3.2 * s, 0, 7); g.fill();
      for (let k = 0; k < 3; k++) { const a = now * 0.012 + k * 2.1; g.strokeStyle = rgbA.replace('A', 0.8); g.lineWidth = 1.2 * s; g.beginPath(); g.ellipse(x, y, 9 * s, 4 * s, a, 0, Math.PI); g.stroke(); }
    } else {
      // 剑气：发光的新月
      const a0 = dir > 0 ? -1.0 : Math.PI - 1.0, a1 = dir > 0 ? 1.0 : Math.PI + 1.0;
      duelBlade(g, x - dir * 12 * s, y, 15 * s, a0, a1, 6 * s, 'rgba(160,220,255,0.85)', 'rgba(255,255,255,1)');
      duelBlade(g, x - dir * 22 * s, y, 15 * s, a0, a1, 4 * s, 'rgba(120,190,255,0.35)', null);
    }
    norm(); return true;
  }
  if (f.type === 'flask') {
    // 炼金药瓶：旋转的玻璃瓶（渐层 + 高光），命中时炸开彩色药雾
    if (!f.a) { f.a = anc(f.from, 'hand').slice(); f.b = anc(f.to, 'chest').slice(); f.c = ['#9aff4a', '#ff7a9a', '#7ad8ff'][Math.floor(Math.random() * 3)]; }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * 26 * s, n = parseInt(f.c.slice(1), 16), rgbA = `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`;
    g.save(); g.translate(x, y); g.rotate(now * 0.02);
    g.fillStyle = '#e8f4ff'; g.strokeStyle = '#1c1228'; g.lineWidth = 0.9 * s;
    g.beginPath(); g.rect(-1.4 * s, -5.6 * s, 2.8 * s, 3.4 * s); g.fill(); g.stroke();
    g.fillStyle = '#9a6434'; g.fillRect(-1.6 * s, -6.6 * s, 3.2 * s, 1.4 * s);
    const lg = g.createRadialGradient(-1 * s, -0.5 * s, 0.3 * s, 0, 0.6 * s, 3.8 * s); lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.35, f.c); lg.addColorStop(1, rgbA.replace('A', 0.9));
    g.fillStyle = lg; g.beginPath(); g.arc(0, 0.8 * s, 3.4 * s, 0, 7); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(-1.2 * s, -0.2 * s, 0.7 * s, 1.1 * s, -0.5, 0, 7); g.fill();
    g.restore();
    if (p > 0.9) { const k = (p - 0.9) / 0.1; add(); for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; duelGlowDot(g, f.b[0] + Math.cos(a) * 12 * s * k, f.b[1] + Math.sin(a) * 9 * s * k, 9 * s, rgbA, 0.7 * (1 - k * 0.5)); } norm(); }
    return true;
  }
  if (f.type === 'swarm') {
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); f.bugs = Array.from({ length: 24 }, () => [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 6]); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * 14 * s;
    add(); duelGlowDot(g, x, y, 16 * s, 'rgba(120,255,120,A)', 0.35); norm();
    for (const [bx, by, ph] of f.bugs) {
      const r = (6 + 4 * Math.sin(now * 0.02 + ph)) * s, qx = x + bx * r + Math.sin(now * 0.05 + ph * 3) * 2 * s, qy = y + by * r * 0.7 + Math.cos(now * 0.05 + ph) * 2 * s;
      g.fillStyle = '#1a2414'; g.beginPath(); g.ellipse(qx, qy, 1.3 * s, 0.9 * s, ph, 0, 7); g.fill();
      g.fillStyle = 'rgba(200,255,200,0.55)'; g.beginPath(); g.ellipse(qx, qy - 0.9 * s, 1.1 * s, 0.5 * s, Math.sin(now * 0.08 + ph) * 0.8, 0, 7); g.fill();
      if (ph < 1.2) { add(); duelGlowDot(g, qx, qy, 2.4 * s, 'rgba(140,255,120,A)', 0.9); norm(); }
    }
    return true;
  }
  if (f.type === 'rock') {
    if (!f.a) { f.a = anc(f.from, 'top').slice(); f.b = anc(f.to, 'chest').slice(); }
    const x = lerp(f.a[0], f.b[0], p), y = lerp(f.a[1], f.b[1], p) - Math.sin(p * Math.PI) * 30 * s, R = 7 * s;
    g.save(); g.translate(x, y); g.rotate(now * 0.01);
    const rg = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R); rg.addColorStop(0, '#c8b8a0'); rg.addColorStop(0.6, '#8a7a6a'); rg.addColorStop(1, '#4a3e32');
    g.fillStyle = rg; g.strokeStyle = '#1c1228'; g.lineWidth = 0.9 * s;
    g.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = R * (0.82 + 0.18 * Math.sin(k * 2.7)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.stroke();
    g.restore(); return true;
  }
  if (f.type === 'laser') {
    if (!f.a) { f.a = anc(f.from, 'tip').slice(); f.b = anc(f.to, 'chest').slice(); }
    const reach = Math.min(1, p * 3), x1 = lerp(f.a[0], f.b[0], reach), y1 = lerp(f.a[1], f.b[1], reach), w0 = (p < 0.7 ? 1 : (1 - p) / 0.3) * s;
    add(); g.lineCap = 'round';
    for (const [w, c] of [[16, 'rgba(255,40,40,0.25)'], [8 + Math.sin(now * 0.08) * 1.5, 'rgba(255,80,80,0.6)'], [3.4, '#ffd8d8'], [1.4, '#ffffff']]) { g.strokeStyle = c; g.lineWidth = w * w0; g.beginPath(); g.moveTo(f.a[0], f.a[1]); g.lineTo(x1, y1); g.stroke(); }
    duelGlowDot(g, f.a[0], f.a[1], 12 * s * (1 - p * 0.5), 'rgba(255,90,90,A)', 0.9);
    if (reach >= 1) duelGlowDot(g, x1, y1, 16 * s, 'rgba(255,120,90,A)', 0.8 * (1 - p));
    norm(); return true;
  }
  if (f.type === 'breath') {
    const a = anc(f.from, 'head'), b = anc(f.to, 'chest'), k0 = f.short ? 0.6 : 1.8;
    if (p < 0.75) for (let k = 0; k < 3; k++) f.parts.push({ t0: now, x: a[0], y: a[1], vx: (b[0] - a[0]) * (k0 + Math.random() * k0 * 0.5), vy: (b[1] - a[1]) * k0 * 0.8 + (Math.random() - 0.5) * 120 * s, r: (3 + Math.random() * 4) * s });
    add();
    for (let j = f.parts.length - 1; j >= 0; j--) {
      const q = f.parts[j], t = (now - q.t0) / 1000;
      if (t > 0.45) { f.parts.splice(j, 1); continue; }
      const k = t / 0.45, x = q.x + q.vx * t, y = q.y + q.vy * t, c = f.col[Math.min(2, Math.floor(k * 3))], n = parseInt(c.slice(1), 16);
      duelGlowDot(g, x, y, q.r * (1.4 + k * 2), `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`, 0.75 * (1 - k));
    }
    norm(); return true;
  }
  return false;
}
// 冲击帧（暴击 / 击杀）：亮底 + 渐层放射速度线 + 角色剪影，最后一帧反相
function duelImpactHD(g, W, H, M, real, drawn, feet, s, now) {
  const ph = (real - DUEL.impactT0) / Math.max(1, DUEL.impactUntil - DUEL.impactT0), inv = ph > 0.6, C = DUEL.impactAt || [W / 2, H / 2];
  const rg = g.createRadialGradient(C[0], C[1], 4, C[0], C[1], W * 0.8);
  if (inv) { rg.addColorStop(0, '#3a1030'); rg.addColorStop(1, '#0a0614'); } else { rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.4, '#fff6dc'); rg.addColorStop(1, '#ffc870'); }
  g.fillStyle = rg; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
  const fg = inv ? 'rgba(255,240,220,' : 'rgba(30,10,30,';
  for (let k = 0; k < 44; k++) {
    const a = k / 44 * Math.PI * 2 + (k % 3) * 0.04, r0 = (30 + (k * 37 % 5) * 8) * s, w = (0.012 + (k % 2) * 0.012) * W * 1.6;
    duelStreak(g, C[0] + Math.cos(a) * W, C[1] + Math.sin(a) * W, C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0, w, fg + '0.95)', fg + '0)');
  }
  const sil = inv ? '#fff6e8' : '#1a0a1e';
  for (const [u, st, P, x, sS, f] of drawn) (st.spec.mon && typeof hdMonDraw === 'function' ? hdMonDraw : DFIG.draw)(g, u, st.spec, P, { x, feet, s: sS, f, now, sil, dpr: DUEL.dpr });
}

// ================= HD 电影化演出 =================
// 镜头：焦点（场景坐标）+ 缩放 + 侧倾，由「镜位」驱动、以弹簧平滑：开场横摇、蓄力推近出手者、甩镜到命中点、
// 暴击特写 / 击杀慢推（带侧倾的环绕感）；全景时自动拉远让高大角色（巨龙、狂神）完整入镜
const DUEL_RIM = { G: '#fff2c8', R: '#fff2c8', V: '#fff2c8', H: '#fff2c8', F: '#eaffc0', M: '#f0f0ff', S: '#ffd890', N: '#d8ecff', W: '#c8f0ff', T: '#c8f0ff', B: '#fff2c8',
  C: '#ffd8a0', K: '#ffc890', X: '#ffd8a0', Y: '#ffd8a0', O: '#ffb070', D: '#e0a0ff', L: '#ff9a40', P: '#d8fff0', A: '#ffe0a0' };
const DUEL_DUST = { S: '#f0d8a0', N: '#ffffff', W: '#e8f8ff', T: '#e8f8ff', L: '#7a4a3a', D: '#8a6aa0', O: '#a89878', C: '#c8c8d0', K: '#c8c8d0', X: '#c8c8d0', Y: '#c8c8d0', M: '#c8b898', B: '#c8a878' };
function duelCamInit(c) {
  const W = DUEL.W, H = DUEL.H, r = performance.now();
  Object.assign(c, { x: W / 2, y: H / 2, z: 1, roll: 0, zw: 1, uw: 0, dim: 0, lines: 0, lb: 0, keyA: 0, key: '#ffffff', tgt: { k: 6 }, next: null, script: null });
  DUEL.openT = r; DUEL.closeT = 0; DUEL.counterT = -1e9; DUEL.hitT = -1e9;
  // 开场确立镜头：从左方角色横摇到右方，再拉回全景（与名牌滑入同时进行）
  const dur = T(640);
  if (dur > 0) {
    const L = [W * 0.27, H * 0.47], R = [W * 0.73, H * 0.47], ez = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    c.script = rr => {
      const t = (rr - r) / dur; if (t >= 1) return null;
      if (t < 0.5) { const e = ez(t / 0.5); return [L[0] + (R[0] - L[0]) * e, L[1], 1.34 - 0.06 * e]; }
      const e = 1 - Math.pow(1 - (t - 0.5) / 0.5, 3); return [R[0] + (W / 2 - R[0]) * e, R[1] + (H / 2 - c.uw - R[1]) * e, 1.28 + (c.zw - 1.28) * e];
    };
    const p0 = c.script(r); c.x = p0[0]; c.y = p0[1]; c.z = p0[2];
  }
}
function duelShot(o, delay) {
  const c = DUEL.cam; if (!c || !c.tgt) return;
  if (delay) { c.next = { t: performance.now() + delay, o }; return; }
  c.script = null; c.next = null; c.tgt = Object.assign({ k: 6 }, o);
}
function duelCamHD(dt, real) {
  const c = DUEL.cam, W = DUEL.W, H = DUEL.H, M = 84, oy = DUEL.oy || 0;
  if (c.next && real >= c.next.t) { const o = c.next.o; c.next = null; duelShot(o); }
  // 全景构图：取两人静止时的外框，必要时拉远（≥ 0.84）并把焦点上移
  let top = 1e9, l = 1e9, r = -1e9;
  for (const u of [DUEL.left, DUEL.right]) { const st = DUEL.fig[u.uid]; if (st && st.ext) { top = Math.min(top, st.ext[1]); l = Math.min(l, st.ext[0]); r = Math.max(r, st.ext[2]); } }
  let zt = 1, ut = 0;
  if (top < 1e8) {
    const bar = duelBarRest(), dTop = H / 2 + oy - bar - 4;
    ut = Math.min(34, Math.max(0, (H / 2 - top) - dTop));
    zt = Math.min(1, dTop / Math.max(1, H / 2 - ut - top), (W / 2 - 3) / Math.max(1, W / 2 - l), (W / 2 - 3) / Math.max(1, r - W / 2));
    zt = Math.max(0.8, zt);
  }
  const kw = 1 - Math.exp(-dt * 5); c.zw += (zt - c.zw) * kw; c.uw += (ut - c.uw) * kw;
  const t = c.tgt;
  let fx = W / 2, fy = H / 2 - c.uw, z = c.zw;
  if (t.at) {
    const p = typeof t.at === 'function' ? t.at() : t.at; if (p) { const m = t.mix == null ? 1 : t.mix; fx += (p[0] - fx) * m; fy += (p[1] - fy) * m; }
    // 高大角色（巨龙、狂神）特写时少推一些，免得头 / 翅膀出画
    const tall = top < 1e8 ? Math.max(0, Math.min(1, (H * 0.42 - top) / (H * 0.4))) : 0;
    z = c.zw * (1 + ((t.z || 1) - 1) * (1 - tall * 0.65)); fy -= tall * H * 0.08;
  }
  let snap = false;
  if (c.script) { const e = c.script(real); if (e) { [fx, fy, z] = e; snap = true; } else c.script = null; }
  const a = snap ? 1 : 1 - Math.exp(-dt * (t.k || 6)), a2 = 1 - Math.exp(-dt * 7);
  c.z += (z - c.z) * a; c.x += (fx - c.x) * a; c.y += (fy - c.y) * a;
  c.roll += ((t.roll || 0) - c.roll) * (1 - Math.exp(-dt * 3));
  c.dim += ((t.dim || 0) - c.dim) * a2; c.lb += ((t.lb || 0) - c.lb) * a2;
  c.keyA += ((t.keyA || 0) - c.keyA) * a2; if (t.key) c.key = t.key;
  c.lines = Math.max(t.lines || 0, c.lines - dt * 2.4);
  // 不露出背景边缘
  const hw = W / 2 / c.z, hh = (H / 2 + oy) / c.z;
  c.x = Math.min(W + M - 2 - hw, Math.max(-M + 2 + hw, c.x)); c.y = Math.min(H + M - 2 - hh, Math.max(-M + 2 + hh, c.y));
}
const duelBarRest = () => Math.round((DUEL.oy || 0) * 0.82);
// 宽银幕黑边：开场由中间向外张开、暴击时收紧、收场合上
function duelBarNow(real) {
  const HC = DUEL.HC, rest = duelBarRest() + DUEL.cam.lb;
  const ko = Math.min(1, Math.max(0, (real - DUEL.openT) / Math.max(1, T(460)))), kc = DUEL.closeT ? Math.min(1, (real - DUEL.closeT) / Math.max(1, T(300))) : 0;
  const bar = HC * 0.5 + (rest - HC * 0.5) * (1 - Math.pow(1 - ko, 3));
  return Math.min(HC * 0.5, bar + (HC * 0.5 + 1 - bar) * kc * kc);
}
// 背景分两层：远景（整张背景，视差 0.5、镜头推近时叠上预先模糊的版本 = 景深）与地面（跟随镜头）
function duelBgBlur(cv) {
  if (DUEL_BGC.blurOf === cv && DUEL_BGC.blurKey === DUEL_BGC.key) return DUEL_BGC.blur;
  const w1 = Math.max(8, Math.round(cv.width / 3)), h1 = Math.max(8, Math.round(cv.height / 3)), w2 = Math.max(4, Math.round(cv.width / 7)), h2 = Math.max(4, Math.round(cv.height / 7));
  const a = document.createElement('canvas'); a.width = w1; a.height = h1; const ga = a.getContext('2d'); ga.imageSmoothingQuality = 'high'; ga.drawImage(cv, 0, 0, w1, h1);
  const b = DUEL_BGC.blur && DUEL_BGC.blur.width === w2 && DUEL_BGC.blur.height === h2 ? DUEL_BGC.blur : document.createElement('canvas'); b.width = w2; b.height = h2;
  const gb = b.getContext('2d'); gb.imageSmoothingQuality = 'high'; gb.drawImage(a, 0, 0, w2, h2);
  DUEL_BGC.blur = b; DUEL_BGC.blurOf = cv; DUEL_BGC.blurKey = DUEL_BGC.key;
  return b;
}
function duelBgLayersHD(g, terr, W, H, dpr, M, ox, oy, rot) {
  const c = DUEL.cam, bg = duelBgHD(terr, W, H, dpr, M), gy = H * 0.6;
  // 远景缩放较小、横向视差 0.5；纵向以地平线为轴对齐主镜头（两层在地平线上不会错位）
  const fz = 1 + (c.z - 1) * 0.45, pfx = W / 2 + (c.x - W / 2) * 0.5, pfy = gy - (gy - c.y) * c.z / fz;
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, DUEL.oy * dpr);
  g.translate(W / 2 + ox * 0.5, H / 2 + oy); g.rotate(rot + c.roll); g.scale(fz, fz); g.translate(-pfx, -pfy);
  const fh = Math.min(bg.height, Math.ceil((M + gy + 34) * dpr));
  g.drawImage(bg, 0, 0, bg.width, fh, -M, -M, W + 2 * M, fh / dpr);
  const dof = Math.min(0.92, Math.max(0, (c.z / c.zw - 1) * 3.2) + c.dim * 0.5);
  if (dof > 0.03 && DUEL.q > 0.62) { g.globalAlpha = dof; g.drawImage(duelBgBlur(bg), -M, -M, W + 2 * M, H + 2 * M); g.globalAlpha = 1; }
  g.restore();
  // 地面层：从地平线略上方切下，跟着主镜头
  const sy = Math.max(0, Math.floor((M + gy - 3) * dpr));
  g.drawImage(bg, 0, sy, bg.width, bg.height - sy, -M, sy / dpr - M, W + 2 * M, (bg.height - sy) / dpr);
  // 地平线接缝：一层柔和的雾，让两层的位移差不显眼
  const hg = g.createLinearGradient(0, gy - 10, 0, gy + 8); hg.addColorStop(0, 'rgba(255,255,255,0)'); hg.addColorStop(0.6, 'rgba(240,244,255,0.16)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hg; g.fillRect(-M, gy - 10, W + 2 * M, 18);
  // 暴击 / 击杀：背景压暗；出手者的元素色调（柔光）
  if (c.dim > 0.01 || c.keyA > 0.01) {
    g.save(); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 一次填色：压暗色混入元素色（只画一层，低端机较省）
    const n = parseInt((c.key || '#ffffff').slice(1), 16), kr = n >> 16, kg = (n >> 8) & 255, kb = n & 255, dA = c.dim * 0.55, kA = Math.min(0.3, c.keyA * 0.3), tA = Math.min(0.85, dA + kA), m = tA > 0 ? kA / tA : 0;
    g.fillStyle = `rgba(${(6 + (kr - 6) * m) | 0},${(4 + (kg - 4) * m) | 0},${(26 + (kb - 26) * m) | 0},${tA})`; g.fillRect(0, 0, W, DUEL.HC);
    g.restore();
  }
}
// 角色边缘光：地形主光从背后（上后方）勾边；出手蓄力时换成元素色、受击瞬间偏金白
function duelRim(u, st, real) {
  if (DUEL.q < 0.7) return null;
  const terr = tileAt(DUEL.d.x, DUEL.d.y), base = DUEL_RIM[terr] || '#fff2c8', c = DUEL.cam;
  let col = base, a = 0.5;
  if (u === DUEL.actor && c.keyA > 0.05) { col = c.key; a = 0.5 + c.keyA; }
  const lh = DUEL.lastHit[u.uid];
  if (lh && real - lh.real < T(220)) { col = lh.crit ? '#ffe080' : '#ffffff'; a = 0.9; }
  return { c: col, a: Math.min(0.95, a), w: 1.1 };
}
// 每名角色绘制后：记录静止外框（构图用）、冲刺时脚下扬尘
function duelFigHD(u, st, P, x, feet, s, f, fly, now) {
  const sp = st.spec;
  if (st.anch && (!st.anim || !st.ext)) {
    const half = sp.kind === 'sprite' ? 16 * sp.scale * s * 0.5 : (sp.mount ? 30 : 22) * s;
    const top = sp.kind === 'sprite' ? st.anch.top[1] - 16 * sp.scale * s * 0.15 - (sp.fly ? 3 * s : 0) : st.anch.top[1] - (sp.wings || sp.bwings ? 12 : 6) * s - (sp.head && /wizhat|mitre|crown|horns|feather/.test(sp.head.t || '') ? 8 * s : 0);
    st.ext = [x - half, top, x + half];
    if (st.anch.ext) st.ext = st.anch.ext; // HD 怪物立绘回传的精确外框（构图用）
  }
  if (u === DUEL.actor && st.anim && !fly && P.Y > -4 && P.al > 0.5 && (st.v || 0) > 150 * s / 2.33 && (st.v || 0) < 9000 * s / 2.33 && now - (st.dustT || 0) > 38) {
    st.dustT = now;
    DUEL.fx.push({ type: 'puff', at: [x - f * (4 + Math.random() * 6) * s, feet - s], t0: now, dur: T(480), dir: -f, r: (4 + Math.random() * 3) * s, vy: -(6 + Math.random() * 8) * s });
  }
}
function duelPuffHD(g, f, p) {
  const terr = tileAt(DUEL.d.x, DUEL.d.y), col = DUEL_DUST[terr] || '#e8dcc0', n = parseInt(col.slice(1), 16), rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`;
  const e = 1 - (1 - p) * (1 - p), x = f.at[0] + f.dir * e * 16 * (f.r / 5), y = f.at[1] + f.vy * e, r = f.r * (0.6 + e * 1.4);
  const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${rgb},${0.5 * (1 - p)})`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
// 场景坐标 → 画布（CSS px）坐标（忽略侧倾与震动）
function duelToScreen(p) { const c = DUEL.cam; return [DUEL.W / 2 + (p[0] - c.x) * c.z, DUEL.oy + DUEL.H / 2 + (p[1] - c.y) * c.z]; }
// 画面层（不随镜头）：命中的放射状缩放模糊、速度线、暗角、宽银幕黑边、反击字幕
function duelOverlayHD(g, real, now, punch, ox, oy) {
  const W = DUEL.W, H = DUEL.H, HC = DUEL.HC, dpr = DUEL.dpr, c = DUEL.cam;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bar = duelBarNow(real);
  // 命中：放射状缩放模糊（把画面以命中点为中心放大叠两层）
  const ht = real - (DUEL.hitT || -1e9), hd = T(DUEL.hitCrit ? 170 : 120);
  if (ht >= 0 && ht < hd && DUEL.hitAt && DUEL.q > 0.62) {
    const k = 1 - ht / hd, P = duelToScreen(DUEL.hitAt), cw = duelCv.width, ch = duelCv.height, px = P[0] * dpr, py = P[1] * dpr;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.beginPath(); g.rect(0, bar * dpr, cw, ch - 2 * bar * dpr); g.clip();
    for (const [sc, a] of [[1.05, 0.32], [1.13, 0.18]]) { const z = 1 + (sc - 1) * (DUEL.hitCrit ? 1.5 : 1); g.globalAlpha = a * k; g.drawImage(duelCv, px - px * z, py - py * z, cw * z, ch * z); }
    g.restore();
  }
  // 速度线（漫画式集中线）
  if (c.lines > 0.03) {
    const cx = W / 2, cy = DUEL.oy + H / 2, R0 = H * 0.36, R1 = Math.hypot(W, HC) * 0.6;
    g.save();
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r0 = R0 * (0.85 + Math.random() * 0.5), w = (1.2 + Math.random() * 3.2);
      duelStreak(g, cx + Math.cos(a) * R1, cy + Math.sin(a) * R1, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, w, `rgba(255,255,255,${0.55 * Math.min(1, c.lines)})`, 'rgba(255,255,255,0)');
    }
    g.restore();
  }
  // 暗角（暴击 / 击杀时加深，击杀再加一次脉冲）
  const vt = real - DUEL.vigT, kp = vt < T(900) ? Math.sin(Math.PI * Math.min(1, vt / Math.max(1, T(900)))) : 0;
  const va = 0.26 + c.dim * 0.4 + kp * 0.35;
  // 暗角图快取（低解析度，放大绘制；逐帧只改透明度）
  const vk = W + 'x' + HC;
  if (DUEL_BGC.vigKey !== vk) {
    const vc = DUEL_BGC.vig || document.createElement('canvas'), vw = Math.round(W / 3), vh = Math.round(HC / 3); vc.width = vw; vc.height = vh;
    const x = vc.getContext('2d'), vg = x.createRadialGradient(vw / 2, vh / 2, vh * 0.38, vw / 2, vh / 2, Math.hypot(vw, vh) * 0.55);
    vg.addColorStop(0, 'rgba(8,2,14,0)'); vg.addColorStop(0.6, 'rgba(8,2,14,0.35)'); vg.addColorStop(1, 'rgba(8,2,14,1)');
    x.fillStyle = vg; x.fillRect(0, 0, vw, vh); DUEL_BGC.vig = vc; DUEL_BGC.vigKey = vk;
  }
  g.globalAlpha = Math.min(0.9, va); g.drawImage(DUEL_BGC.vig, 0, 0, W, HC); g.globalAlpha = 1;
  g.restore(); // 场景裁剪（duelRenderFrame 开头）到此为止
  g.fillStyle = '#04020a'; g.fillRect(0, 0, W, bar); g.fillRect(0, HC - bar, W, bar);
  g.fillStyle = 'rgba(217,180,90,0.5)'; g.fillRect(0, bar, W, 1); g.fillRect(0, HC - bar - 1, W, 1);
  // 反击字幕：从反击者那一侧斜切进来
  const ct = real - DUEL.counterT, cd = T(820);
  if (ct >= 0 && ct < cd) {
    const k = ct / cd, sd = DUEL.counterSide || 1, ein = Math.min(1, k / 0.18), eout = k > 0.78 ? (k - 0.78) / 0.22 : 0;
    const x = W / 2 + sd * W * (1 - (1 - Math.pow(1 - ein, 3))) - sd * W * eout * eout, y = DUEL.oy + H * 0.2;
    g.save(); g.translate(x, y); g.transform(1, 0, -0.25, 1, 0, 0);
    const bw = W * 0.62, bh = H * 0.13;
    const gr = g.createLinearGradient(-bw / 2, 0, bw / 2, 0); gr.addColorStop(0, 'rgba(160,20,30,0)'); gr.addColorStop(0.2, 'rgba(160,20,30,0.85)'); gr.addColorStop(0.8, 'rgba(160,20,30,0.85)'); gr.addColorStop(1, 'rgba(160,20,30,0)');
    g.fillStyle = gr; g.fillRect(-bw / 2, -bh / 2, bw, bh);
    g.fillStyle = 'rgba(255,220,140,0.8)'; g.fillRect(-bw * 0.4, -bh / 2, bw * 0.8, 1.5); g.fillRect(-bw * 0.4, bh / 2 - 1.5, bw * 0.8, 1.5);
    const fs = Math.round(H * 0.1); g.font = `900 italic ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = fs * 0.18; g.lineJoin = 'round'; g.strokeStyle = '#1a0610'; g.strokeText('反 击 !', 0, 1);
    const tg = g.createLinearGradient(0, -fs / 2, 0, fs / 2); tg.addColorStop(0, '#fff6d0'); tg.addColorStop(1, '#ffb030'); g.fillStyle = tg; g.fillText('反 击 !', 0, 1);
    g.restore();
  }
}
// ---------- 镜位 ----------
function duelKeyCol(u) {
  const sp = duelFig(u).spec;
  return sp.aura || (sp.wpn && (sp.wpn.glow || sp.wpn.gem)) || sp.trail || (sp.breath && BREATH_COL[sp.breath] && BREATH_COL[sp.breath][1]) || (BREATH_COL[u.color] && BREATH_COL[u.color][1]) || (u.team === 'enemy' ? '#ff8a6a' : '#8ad0ff');
}
function duelChest(u) { const st = DUEL.fig[u.uid]; return st && st.anch ? st.anch.chest : [u === DUEL.left ? DUEL.W * 0.27 : DUEL.W * 0.73, DUEL.H * 0.5]; }
function duelShotWindup(att, def, crit, counter) {
  const key = duelKeyCol(att);
  if (counter) { DUEL.counterT = performance.now(); DUEL.counterSide = att === DUEL.left ? -1 : 1; }
  duelShot({ at: () => { const a = duelChest(att), d = duelChest(def); return [a[0] + (d[0] - a[0]) * 0.22, a[1] - 4]; }, z: crit ? 1.36 : 1.18, k: counter ? 13 : crit ? 6 : 5, dim: crit ? 0.65 : 0.12, key, keyA: crit ? 0.5 : 0.22, lb: crit ? 10 : 0, lines: counter ? 0.5 : 0 });
}
function duelShotWhip(att, def, ranged) {
  const t = DUEL.cam.tgt;
  duelShot({ at: () => { const a = duelChest(att), d = duelChest(def); return [a[0] + (d[0] - a[0]) * (ranged ? 0.62 : 0.55), (a[1] + d[1]) / 2 - 2]; }, z: ranged ? 1.1 : 1.16, k: 11, dim: t.dim, key: t.key, keyA: t.keyA * 0.8, lb: t.lb, lines: ranged ? 0 : 0.35 });
}
function duelShotImpact(att, def, crit, kill, dir) {
  const big = crit || kill, t0 = performance.now();
  if (kill) duelShot({ at: () => { const d = duelChest(def), e = Math.min(1, (performance.now() - t0) / 900); return [d[0] - dir * 10 * e, d[1] - 6 + 4 * e]; }, z: 1.44, k: 2.6, roll: dir * 0.04, dim: 0.75, keyA: 0, lb: 14, lines: 1 });
  else duelShot({ at: () => duelChest(def), mix: 0.85, z: crit ? 1.4 : 1.22, k: crit ? 20 : 16, dim: crit ? 0.5 : 0, keyA: 0, lb: crit ? 10 : 0, lines: big ? 1 : 0.4 });
  duelShot({ k: kill ? 2.2 : 4.2 }, T(kill ? 760 : crit ? 470 : 300));
}
function duelShotMiss(def) {
  duelShot({ at: () => duelChest(def), mix: 0.6, z: 1.1, k: 9, lines: 0 });
  duelShot({ k: 4.5 }, T(300));
}
