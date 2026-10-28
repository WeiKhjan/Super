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
  duelCv.style.width = w + 'px'; duelCv.style.height = h + 'px';
  duelCv.width = Math.round(w * dpr); duelCv.height = Math.round(h * dpr);
  DUEL.W = w; DUEL.H = h; DUEL.dpr = dpr;
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
  DCLK.stopUntil = DCLK.slowUntil = 0;
  duelFig(a); duelFig(d);
  const el = document.getElementById('duel');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  requestAnimationFrame(duelRender);
  await wait(380);
  return true;
}
async function duelClose() {
  if (!DUEL.on) return;
  await duelSettle(1400);
  await wait(320);
  const el = document.getElementById('duel');
  el.classList.remove('in'); el.classList.add('out');
  await wait(220);
  el.hidden = true; DUEL.on = false;
}
function duelText(u, text, color, big) { DUEL.fx.push({ type: 'dmg', u, text, kind: big ? 'crit' : 'hit', r0: performance.now(), dir: u === DUEL.left ? -1 : 1 }); }

// ---------- 角色状态与动作播放 ----------
function duelFig(u) {
  return DUEL.fig[u.uid] || (DUEL.fig[u.uid] = { spec: DFIG.specOf(u), anim: null, flash: 0, seed: Math.random() * 6, anch: null });
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
  A.crit = crit; DUEL.actor = att;
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
    await duelWait(pl.fly);
  } else await duelWait(pl.impact);
  cam.pushT = 0;
  const now = duelNow(), real = performance.now(), dir = att === DUEL.left ? 1 : -1;
  if (!hit) {
    duelPlay(def, DFIG.react(D.spec, 'dodge'));
    DUEL.fx.push({ type: 'dmg', u: def, text: 'MISS', kind: 'miss', r0: real, dir });
    DUEL.fx.push({ type: 'whoosh', u: def, t0: now, dur: T(260), dir });
    cam.trauma = Math.min(1, cam.trauma + 0.12);
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
    if (big) { DUEL.impactT0 = real; DUEL.impactUntil = real + T(kill ? 120 : 90); DUEL.impactAt = cam.punchAt; }
    if (kill) { DUEL.vigT = real; DUEL.fx.push({ type: 'shatter', u: def, t0: now + T(500), dur: T(700) }); }
    DUEL.lastHit[def.uid] = { crit, big: crit || dmg >= def.mhp * 0.2, real };
    DUEL.fx.push({ type: 'dmg', u: def, text: String(dmg), kind: crit ? 'crit' : 'hit', r0: real, dir });
    duelPlay(def, DFIG.react(D.spec, kill ? 'die' : crit ? 'crit' : 'hit'));
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
  g.imageSmoothingEnabled = false;
  g.save();
  g.translate(W / 2 + ox, H / 2 + oy); g.rotate(rot); g.translate(-W / 2, -H / 2);
  for (const [z, A] of [[cam.push, cam.pushAt], [punch, cam.punchAt]]) if (z > 0.002) { g.translate(A[0], A[1]); g.scale(1 + z, 1 + z); g.translate(-A[0], -A[1]); }
  // 背景：依守方所在地形（画大一些，震动 / 缩放时不露边）
  const terr = tileAt(DUEL.d.x, DUEL.d.y);
  const [sky1, sky2, gr1, gr2] = DUEL_BG[terr] || DUEL_BG.G;
  const groundY = H * 0.6, M = 60;
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
    g.globalAlpha = P.al; g.fillStyle = `rgba(0,0,0,${fly ? 0.25 : 0.4})`; g.beginPath(); g.ellipse(x, feet + s, sw * (P.Y < -4 ? 0.7 : 1), 3.2 * s, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    if (st.spec.aura && !st.dead) {
      const a = st.anch ? st.anch.chest : [x, feet - 30 * s], r = 46 * s * (1 + 0.06 * Math.sin(now * 0.004));
      const rg = g.createRadialGradient(a[0], a[1], 4, a[0], a[1], r);
      rg.addColorStop(0, st.spec.aura + '55'); rg.addColorStop(1, st.spec.aura + '00');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.beginPath(); g.arc(a[0], a[1], r, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    }
    const fast = u === DUEL.actor && st.anim && P.al > 0.5 && (st.v || 0) > 230 * s / 2.33 && (st.v || 0) < 9000 * s / 2.33;
    if (fast) {
      // 速度线：在角色身后横向拉出
      g.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < 9; i++) { const y = feet - (4 + Math.random() * 46) * s, L = (18 + Math.random() * 60) * s, x0 = x - f * (8 + Math.random() * 30) * s; g.fillRect(Math.min(x0, x0 - f * L), Math.round(y), L, Math.max(1, Math.round(s * 0.7))); }
      // 残影：回溯前几帧姿势，淡蓝色剪影
      for (const k of [3, 2, 1]) {
        const Q = duelPose(st, now - k * 32);
        g.save(); g.globalAlpha = 0.14 * (4 - k);
        if (Q.al > 0.3) DFIG.draw(g, u, st.spec, Q, { x: xOf(Q), feet, s, f: fB * (Q.fl > 0.5 ? -1 : 1), now, sil: '#a8dcff' });
        g.restore();
      }
    }
    let prev = null;
    if (P.tr > 0.05 && st.anim) prev = [14, 28, 42, 56, 70].map(dt => duelPose(st, now - dt));
    const flash = (st.flash || 0) > now || ((st.blinkUntil || 0) > now && Math.floor(now / 55) % 2 === 0);
    st.anch = DFIG.draw(g, u, st.spec, P, { x, feet, s, f, now, flash, prev, crit: st.crit });
    if (st.anch) st.anch.feet = [x, feet];
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
    duelDrawFx(g, f, p, now, anc, s);
  }
  // 冲击帧（暴击 / 击杀）：白底黑剪影 + 放射速度线，再一帧反相
  if (real < DUEL.impactUntil) {
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
  if (vt < T(700)) {
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
