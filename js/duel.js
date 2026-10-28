// 超时空英雄传说 · 移动重制版 —— 战斗画面（仿原作的侧视对战演出）
// 角色由 js/duelfig.js 的纸娃娃渲染器逐帧绘制；本文件负责镜头、编排（冲刺 / 挥砍 / 射击 → 受击 / 闪避 / 倒下）与特效
'use strict';

const DUEL = { on: false, a: null, d: null, fx: [], t0: 0, shakeUntil: 0, shakeAmp: 8, whiteUntil: 0, hp: {}, fig: {}, actor: null };
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
  Object.assign(DUEL, { on: true, a, d, left: leftIsA ? a : d, right: leftIsA ? d : a, fx: [], t0: performance.now(), fig: {}, actor: null, shakeUntil: 0, whiteUntil: 0 });
  DUEL.hp[a.uid] = a.hp; DUEL.hp[d.uid] = d.hp;
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
function duelText(u, text, color, big) { DUEL.fx.push({ type: 'text', u, text, color, big, t0: performance.now() }); }

// ---------- 角色状态与动作播放 ----------
function duelFig(u) {
  return DUEL.fig[u.uid] || (DUEL.fig[u.uid] = { spec: DFIG.specOf(u), anim: null, flash: 0, seed: Math.random() * 6, anch: null });
}
function duelPlay(u, A) {
  const st = duelFig(u);
  st.anim = { keys: A.keys, t0: performance.now(), k: Math.max(1e-4, T(1000) / 1000), dur: A.dur, hold: !!A.hold };
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
  const now = performance.now();
  let rem = 0;
  for (const k in DUEL.fig) { const a = DUEL.fig[k].anim; if (a) rem = Math.max(rem, a.t0 + a.dur * a.k - now); }
  rem = Math.min(rem, maxMs || 2000);
  return rem > 0 ? new Promise(r => setTimeout(r, rem)) : Promise.resolve();
}

// 一次出手的演出：冲刺 / 挥砍 / 射击 → 命中闪光 → 伤害数字；守方受击、闪避或倒下
async function duelStrike(att, def, hit, dmg, crit, ranged) {
  if (!DUEL.on) return;
  await duelSettle(1200);
  const A = duelFig(att), D = duelFig(def);
  const kill = hit && def.hp - dmg <= 0;
  const pl = DFIG.plan(A.spec, ranged, crit);
  A.crit = crit; DUEL.actor = att;
  duelPlay(att, pl);
  const now0 = performance.now();
  if (crit) DUEL.fx.push({ type: 'glint', u: att, t0: now0 + T(Math.max(0, (pl.impact || pl.release) - 260)), dur: T(240) });
  if (pl.streak) DUEL.fx.push({ type: 'streak', u: att, from: null, t0: now0 + T(pl.streak[0]), dur: T(pl.streak[1] - pl.streak[0] + 260) });
  if (pl.puff) DUEL.fx.push({ type: 'breath', from: att, to: def, t0: now0 + T(pl.puff), dur: T(160), col: BREATH_COL[att.color || 'red'] || BREATH_COL.red, parts: [], short: 1 });
  if (pl.release != null) {
    await wait(pl.release);
    const t0 = performance.now(), color = att.color || 'red';
    if (pl.style === 'breath') DUEL.fx.push({ type: 'breath', from: att, to: def, t0, dur: T(pl.fly + 200), col: BREATH_COL[color] || BREATH_COL.red, parts: [] });
    else {
      DUEL.fx.push({ type: pl.style === 'bolt3' ? 'bolt' : pl.style, from: att, to: def, t0, dur: T(pl.fly), col: A.spec.wpn && A.spec.wpn.gem });
      if (pl.style === 'bolt3') for (const o of [70, 140]) DUEL.fx.push({ type: 'bolt', from: att, to: def, t0: t0 + T(o), dur: T(pl.fly), dy: o / 14 - 7 });
    }
    await wait(pl.fly);
  } else await wait(pl.impact);
  const now = performance.now();
  if (!hit) {
    duelPlay(def, DFIG.react(D.spec, 'dodge'));
    duelText(def, 'MISS', '#aaccff');
  } else {
    D.flash = now + T(crit ? 220 : 130);
    DUEL.fx.push({ type: 'slash', u: def, crit, style: pl.style, t0: now, dur: T(crit ? 340 : 260) });
    duelSparks(def, crit ? 16 : 9, crit ? '#ffe070' : '#ffffff');
    if (crit || pl.heavy || kill) { DUEL.shakeUntil = now + T(crit ? 380 : 200); DUEL.shakeAmp = crit ? 12 : 6; }
    if (crit) DUEL.whiteUntil = now + T(90);
    duelText(def, (crit ? '暴击 ' : '') + dmg, crit ? '#ffdd44' : '#ffffff', crit);
    duelPlay(def, DFIG.react(D.spec, kill ? 'die' : crit ? 'crit' : 'hit'));
    if (kill) D.dead = true;
  }
  await wait(40);
}
function duelSparks(u, n, col) {
  const st = duelFig(u), c = st.anch ? st.anch.chest : null, t0 = performance.now();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
    DUEL.fx.push({ type: 'spark', u, ox: 0, oy: 0, at: c, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t0, dur: T(260 + Math.random() * 200), col });
  }
}

// ---------- 绘制 ----------
function duelRender(now) {
  if (!DUEL.on) return;
  requestAnimationFrame(duelRender);
  const g = duelCtx, W = DUEL.W, H = DUEL.H, s0 = DUEL.s;
  g.setTransform(DUEL.dpr, 0, 0, DUEL.dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  let sx = 0, sy = 0;
  if (now < DUEL.shakeUntil) { const k = DUEL.shakeAmp; sx = (Math.random() - 0.5) * k; sy = (Math.random() - 0.5) * k * 0.8; }
  g.save(); g.translate(sx, sy);
  // 背景：依守方所在地形
  const terr = tileAt(DUEL.d.x, DUEL.d.y);
  const [sky1, sky2, gr1, gr2] = DUEL_BG[terr] || DUEL_BG.G;
  const groundY = H * 0.6;
  let grd = g.createLinearGradient(0, 0, 0, groundY);
  grd.addColorStop(0, sky1); grd.addColorStop(1, sky2);
  g.fillStyle = grd; g.fillRect(-10, -10, W + 20, groundY + 10);
  // 远景剪影
  g.fillStyle = 'rgba(20,16,40,0.25)';
  g.beginPath(); g.moveTo(-10, groundY);
  for (let i = 0; i <= 8; i++) g.lineTo(i * W / 8, groundY - 18 - ((i * 37) % 5) * 9);
  g.lineTo(W + 10, groundY); g.fill();
  grd = g.createLinearGradient(0, groundY, 0, H);
  grd.addColorStop(0, gr1); grd.addColorStop(1, gr2);
  g.fillStyle = grd; g.fillRect(-10, groundY, W + 20, H - groundY + 10);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < 40; i++) g.fillRect((i * 97) % W, groundY + 6 + ((i * 53) % Math.max(1, H - groundY - 10)), 6, 2);

  // 两名角色：出手者画在上层
  const feet = groundY + H * 0.1, sep = W * 0.46;
  const order = DUEL.actor === DUEL.left ? [DUEL.right, DUEL.left] : [DUEL.left, DUEL.right];
  for (const u of order) {
    const st = duelFig(u), isLeft = u === DUEL.left, f = isLeft ? 1 : -1, s = st.spec.mount ? DUEL.sm : s0;
    if (st.anim && !st.anim.hold && (now - st.anim.t0) / st.anim.k >= st.anim.dur) st.anim = null;
    const P = duelPose(st, now);
    const foe = isLeft ? DUEL.right : DUEL.left;
    const approach = Math.max(0, sep - DFIG.gap(st.spec, duelFig(foe).spec) * s);
    const x = (isLeft ? W * 0.27 : W * 0.73) + f * (P.X * approach + P.P * sep + P.dx * s);
    // 影子
    const fly = st.spec.mount ? st.spec.mount.t !== 'horse' : st.spec.wings || st.spec.fly;
    const sw = (st.spec.mount ? 22 : st.spec.kind === 'sprite' ? 7 * st.spec.scale : 14) * s;
    g.fillStyle = `rgba(0,0,0,${fly ? 0.25 : 0.4})`; g.beginPath(); g.ellipse(isLeft ? x + 0 : x, feet + s, sw * (P.Y < -4 ? 0.7 : 1), 3.2 * s, 0, 0, 7); g.fill();
    // 顶阶光环
    if (st.spec.aura && !st.dead) {
      const a = st.anch ? st.anch.chest : [x, feet - 30 * s], r = 46 * s * (1 + 0.06 * Math.sin(now * 0.004));
      const rg = g.createRadialGradient(a[0], a[1], 4, a[0], a[1], r);
      rg.addColorStop(0, st.spec.aura + '55'); rg.addColorStop(1, st.spec.aura + '00');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = rg; g.beginPath(); g.arc(a[0], a[1], r, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over';
    }
    // 拖影：回溯前几帧姿势
    let prev = null;
    if (P.tr > 0.05 && st.anim) prev = [14, 28, 42, 56, 70].map(dt => duelPose(st, now - dt));
    st.anch = DFIG.draw(g, u, st.spec, P, { x, feet, s, f, now, flash: (st.flash || 0) > now, prev, crit: st.crit });
  }
  // 特效
  const s = s0;
  const anc = (u, k) => { const st = duelFig(u); return st.anch ? st.anch[k] : [u === DUEL.left ? W * 0.27 : W * 0.73, feet - 30 * s]; };
  for (let i = DUEL.fx.length - 1; i >= 0; i--) {
    const f = DUEL.fx[i];
    if (now < f.t0) continue;
    if (f.type === 'text') {
      const p = (now - f.t0) / 1000; if (p >= 1) { DUEL.fx.splice(i, 1); continue; }
      g.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.font = `900 ${Math.round(H * (f.big ? 0.16 : 0.12))}px sans-serif`; g.textAlign = 'center';
      const top = anc(f.u, 'top');
      const ty = Math.max(H * 0.16, Math.min(top[1], groundY - 40 * s)) - p * H * 0.12;
      g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(f.text, top[0], ty);
      g.fillStyle = f.color; g.fillText(f.text, top[0], ty);
      g.globalAlpha = 1; g.textAlign = 'left';
      continue;
    }
    const p = (now - f.t0) / Math.max(1, f.dur); if (p >= 1) { DUEL.fx.splice(i, 1); continue; }
    duelDrawFx(g, f, p, now, anc, s);
  }
  g.restore();
  if (now < DUEL.whiteUntil) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, W, H); }
  // 底部资讯：名字、职业、HP 条（缓慢追上实际值）
  for (const u of [DUEL.left, DUEL.right]) {
    const isLeft = u === DUEL.left, bw = W * 0.44, bx = isLeft ? W * 0.03 : W * 0.53, by = H * 0.84;
    const cur = DUEL.hp[u.uid] = DUEL.hp[u.uid] + (u.hp - DUEL.hp[u.uid]) * 0.12;
    g.fillStyle = 'rgba(10,6,30,0.82)'; g.fillRect(bx - 4, by - H * 0.11, bw + 8, H * 0.25);
    g.strokeStyle = u.team === 'player' ? '#4a9aff' : u.team === 'ally' ? '#4ad87a' : '#ff5a5a'; g.lineWidth = 2; g.strokeRect(bx - 4, by - H * 0.11, bw + 8, H * 0.25);
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(H * 0.068)}px sans-serif`;
    g.fillText(`${u.name}`, bx, by - H * 0.03, bw * 0.6);
    g.fillStyle = '#c8b8ff'; g.font = `${Math.round(H * 0.05)}px sans-serif`; g.textAlign = 'right';
    g.fillText(`${className(u)} Lv${u.lv}`, bx + bw, by + H * 0.105, bw * 0.55); g.textAlign = 'left';
    g.fillStyle = '#000'; g.fillRect(bx, by, bw, H * 0.05);
    const r = Math.max(0, cur / u.mhp);
    g.fillStyle = r > 0.5 ? '#5ae05a' : r > 0.25 ? '#f0c030' : '#ff4040'; g.fillRect(bx, by, bw * r, H * 0.05);
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(H * 0.05)}px sans-serif`;
    g.fillText(`${Math.max(0, Math.round(cur))} / ${u.mhp}`, bx + 4, by + H * 0.105);
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
  } else if (f.type === 'spark') {
    if (!f.at) f.at = anc(f.u, 'chest');
    const t = (now - f.t0) / 1000, x = f.at[0] + f.vx * t, y = f.at[1] + f.vy * t + 300 * t * t;
    g.globalAlpha = 1 - p; g.fillStyle = f.col; const z = Math.max(1, 2 * s); g.fillRect(x - z / 2, y - z / 2, z, z); g.globalAlpha = 1;
  } else if (f.type === 'glint') {
    const [x, y] = anc(f.u, 'tip'), r = (4 + 14 * Math.sin(p * Math.PI)) * s * 0.6;
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
