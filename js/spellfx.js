// 超时空英雄传说 · 移动重制版 —— 地图上的法术演出（粒子、魔法阵、投射物、各系命中特效）
'use strict';

const PFX = { parts: [], circles: [], bolts: [], beams: [], pillars: [], rings: [], slashes: [], flash: null, label: null, dim: 0, last: 0 };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const ELEM = {
  fire: { cols: ['#fff2a0', '#ffc040', '#ff7a1a', '#e83a10'], glow: '#ff7a1a', label: '#ffb060' },
  ice: { cols: ['#ffffff', '#c8f0ff', '#7ad0ff', '#3a8ad8'], glow: '#7ad0ff', label: '#a8e4ff' },
  bolt: { cols: ['#ffffff', '#fff6a0', '#ffe040', '#a0c8ff'], glow: '#fff6a0', label: '#fff08a' },
  wind: { cols: ['#ffffff', '#d8fff0', '#8ae8c0', '#4ab890'], glow: '#8ae8c0', label: '#a8f8d8' },
  rock: { cols: ['#e0c090', '#b08a5a', '#7a5a34', '#4a3420'], glow: '#c8a070', label: '#e0c090' },
  dark: { cols: ['#f0c0ff', '#c070ff', '#7a2ad0', '#2a0a50'], glow: '#a040ff', label: '#d8a0ff' },
  holy: { cols: ['#ffffff', '#fffad0', '#ffe880', '#f4c542'], glow: '#fff0a0', label: '#fff2b0' },
  heal: { cols: ['#ffffff', '#d0ffe0', '#7af0a0', '#3ac870'], glow: '#7af0a0', label: '#a8ffc8' },
  buff: { cols: ['#ffffff', '#fff0b0', '#ffd060', '#7ad8ff'], glow: '#ffd060', label: '#ffe08a' },
  acid: { cols: ['#f0ffb0', '#c8ff4a', '#7ae02a', '#3a9a1a'], glow: '#9aff4a', label: '#c8ff8a' },
  slash: { cols: ['#ffffff', '#e8f0ff', '#a8c8ff', '#7a9ad8'], glow: '#c8dcff', label: '#ffffff' },
  beam: { cols: ['#ffffff', '#fff0c0', '#ff9a40', '#ff4a10'], glow: '#ff8a30', label: '#ffb060' },
  summon: { cols: ['#ffffff', '#d8c0ff', '#9a7aff', '#4a2ad0'], glow: '#b090ff', label: '#d8c0ff' },
};
const tc = v => (v + 0.5) * TS; // 格子中心 → 画布坐标

function emit(n, x, y, o) {
  for (let i = 0; i < n; i++) {
    const a = o.angle !== undefined ? o.angle + rand(-(o.spread || 0), o.spread || 0) : rand(0, Math.PI * 2);
    const sp = rand(o.speed[0], o.speed[1]) * TS;
    PFX.parts.push({
      x: x + rand(-(o.jitter || 0), o.jitter || 0) * TS, y: y + rand(-(o.jitter || 0), o.jitter || 0) * TS,
      vx: Math.cos(a) * sp + (o.vx || 0) * TS, vy: Math.sin(a) * sp + (o.vy || 0) * TS,
      life: 0, max: rand(o.life[0], o.life[1]), size: rand(o.size[0], o.size[1]) * TS, col: pick(o.cols),
      g: (o.gravity || 0) * TS, drag: o.drag ?? 0.9, shape: o.shape || 'sq', glow: o.glow !== false, spin: o.spin || 0,
      cx: o.cx, cy: o.cy, swirl: o.swirl || 0, delay: o.delay ? rand(0, o.delay) : 0,
    });
  }
}
function boltPath(x, y0, y1) {
  const pts = [[x, y0]]; let cx = x;
  const n = 7;
  for (let i = 1; i < n; i++) { cx = x + rand(-0.28, 0.28) * TS; pts.push([cx, y0 + (y1 - y0) * i / n]); }
  pts.push([x, y1]);
  return pts;
}
const now0 = () => performance.now();

// ---------- 每帧绘制（由 battle.js 的 render 调用） ----------
function drawSpellFx(now) {
  const dt = Math.min(0.05, (now - (PFX.last || now)) / 1000); PFX.last = now;
  const g = ctx, W = B.w * TS, H = B.h * TS;
  if (PFX.dim > 0.01) { g.fillStyle = `rgba(6,2,20,${PFX.dim})`; g.fillRect(0, 0, W, H); }
  g.save();
  g.globalCompositeOperation = 'lighter';
  // 魔法阵
  for (let i = PFX.circles.length - 1; i >= 0; i--) {
    const c = PFX.circles[i], p = (now - c.t0) / c.dur;
    if (p >= 1) { PFX.circles.splice(i, 1); continue; }
    const a = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1, r = c.r * TS * (0.6 + 0.4 * Math.min(1, p * 3));
    g.globalAlpha = a; g.strokeStyle = c.color; g.lineWidth = Math.max(1.5, TS / 18);
    g.save(); g.translate(c.x, c.y); g.scale(1, 0.45); g.rotate(now / 600);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.72, 0, 7); g.stroke();
    g.beginPath();
    for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; const an2 = an + Math.PI * 2 / 3; g.moveTo(Math.cos(an) * r * 0.72, Math.sin(an) * r * 0.72); g.lineTo(Math.cos(an2) * r * 0.72, Math.sin(an2) * r * 0.72); }
    g.stroke();
    for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2 - now / 900; g.fillStyle = c.color; g.fillRect(Math.cos(an) * r * 0.86 - 1.5, Math.sin(an) * r * 0.86 - 1.5, 3, 3); }
    g.restore();
  }
  // 光柱
  for (let i = PFX.pillars.length - 1; i >= 0; i--) {
    const c = PFX.pillars[i], p = (now - c.t0) / c.dur;
    if (p >= 1) { PFX.pillars.splice(i, 1); continue; }
    const a = Math.sin(p * Math.PI), w = TS * c.w * (0.5 + a * 0.6);
    const grd = g.createLinearGradient(c.x - w, 0, c.x + w, 0);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, c.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a * 0.9; g.fillStyle = grd; g.fillRect(c.x - w, c.y - TS * 6, w * 2, TS * 6.3);
    g.globalAlpha = a; g.fillStyle = '#ffffff'; g.fillRect(c.x - w * 0.15, c.y - TS * 6, w * 0.3, TS * 6.3);
  }
  // 冲击波圆环
  for (let i = PFX.rings.length - 1; i >= 0; i--) {
    const c = PFX.rings[i], p = (now - c.t0) / c.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.rings.splice(i, 1); continue; }
    g.globalAlpha = 1 - p; g.strokeStyle = c.color; g.lineWidth = TS * 0.12 * (1 - p) + 1;
    g.beginPath(); g.ellipse(c.x, c.y, TS * (c.r0 + (c.r1 - c.r0) * p), TS * (c.r0 + (c.r1 - c.r0) * p) * (c.flat ? 0.45 : 1), 0, 0, 7); g.stroke();
  }
  // 光束 / 直线法术
  for (let i = PFX.beams.length - 1; i >= 0; i--) {
    const b = PFX.beams[i], p = (now - b.t0) / b.dur;
    if (p >= 1) { PFX.beams.splice(i, 1); continue; }
    const grow = Math.min(1, p * 4), a = p < 0.7 ? 1 : (1 - p) / 0.3;
    const x1 = b.x0 + (b.x1 - b.x0) * grow, y1 = b.y0 + (b.y1 - b.y0) * grow;
    g.lineCap = 'round';
    for (const [wd, col, al] of [[b.w * 1.0, b.color, 0.35], [b.w * 0.55, b.color, 0.8], [b.w * 0.22, '#ffffff', 1]]) {
      g.globalAlpha = a * al; g.strokeStyle = col; g.lineWidth = TS * wd * (0.85 + Math.sin(now / 30) * 0.15);
      g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(x1, y1); g.stroke();
    }
  }
  // 闪电
  for (let i = PFX.bolts.length - 1; i >= 0; i--) {
    const b = PFX.bolts[i], p = (now - b.t0) / b.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.bolts.splice(i, 1); continue; }
    if (!b.pts || Math.random() < 0.35) b.pts = boltPath(b.x, b.y - TS * 5, b.y);
    const a = p < 0.6 ? 1 : (1 - p) / 0.4;
    for (const [wd, col, al] of [[0.35, b.color, 0.4], [0.14, b.color, 0.9], [0.05, '#ffffff', 1]]) {
      g.globalAlpha = a * al; g.strokeStyle = col; g.lineWidth = TS * wd; g.lineJoin = 'round';
      g.beginPath(); b.pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
    g.globalAlpha = a * 0.5; g.fillStyle = b.color; g.beginPath(); g.arc(b.x, b.y, TS * 0.6, 0, 7); g.fill();
  }
  // 剑气
  for (let i = PFX.slashes.length - 1; i >= 0; i--) {
    const s = PFX.slashes[i], p = (now - s.t0) / s.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.slashes.splice(i, 1); continue; }
    const L = TS * s.len, sweep = Math.min(1, p * 2.5);
    g.save(); g.translate(s.x, s.y); g.rotate(s.angle);
    for (const [wd, col, al] of [[0.28, s.color, 0.4], [0.12, s.color, 0.9], [0.04, '#ffffff', 1]]) {
      g.globalAlpha = (1 - p) * al; g.strokeStyle = col; g.lineWidth = TS * wd; g.lineCap = 'round';
      g.beginPath(); g.arc(0, L * 0.6, L, -Math.PI / 2 - 0.9, -Math.PI / 2 - 0.9 + 1.8 * sweep); g.stroke();
    }
    g.restore();
  }
  // 粒子
  for (let i = PFX.parts.length - 1; i >= 0; i--) {
    const q = PFX.parts[i];
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.life += dt;
    if (q.life >= q.max) { PFX.parts.splice(i, 1); continue; }
    if (q.swirl) { // 螺旋：绕中心旋转并收拢 / 上升
      const dx = q.x - q.cx, dy = q.y - q.cy, r = Math.hypot(dx, dy), an = Math.atan2(dy, dx) + q.swirl * dt;
      const nr = r * (q.swirl > 0 ? 0.985 : 1.01);
      q.x = q.cx + Math.cos(an) * nr; q.y = q.cy + Math.sin(an) * nr + q.vy * dt;
    } else {
      q.vy += q.g * dt; q.vx *= Math.pow(q.drag, dt * 10); q.vy *= Math.pow(q.drag, dt * 10);
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    const lf = q.life / q.max, s = q.size * (q.shape === 'ember' ? 1 - lf : 1 - lf * 0.5);
    g.globalAlpha = lf < 0.15 ? lf / 0.15 : 1 - lf;
    g.fillStyle = q.col;
    if (q.shape === 'circle' || q.shape === 'ember') { g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, s), 0, 7); g.fill(); }
    else if (q.shape === 'shard') {
      g.save(); g.translate(q.x, q.y); g.rotate(Math.atan2(q.vy, q.vx));
      g.beginPath(); g.moveTo(s * 2, 0); g.lineTo(0, s * 0.6); g.lineTo(-s * 1.2, 0); g.lineTo(0, -s * 0.6); g.fill(); g.restore();
    } else if (q.shape === 'star') {
      g.fillRect(q.x - s, q.y - s * 0.2, s * 2, s * 0.4); g.fillRect(q.x - s * 0.2, q.y - s, s * 0.4, s * 2);
    } else if (q.shape === 'rock') {
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1a1010'; g.fillRect(q.x - s - 1, q.y - s - 1, s * 2 + 2, s * 2 + 2);
      g.fillStyle = q.col; g.fillRect(q.x - s, q.y - s, s * 2, s * 2);
      g.globalCompositeOperation = 'lighter';
    } else g.fillRect(q.x - s / 2, q.y - s / 2, s, s);
  }
  g.restore();
  // 全屏闪光
  if (PFX.flash) {
    const p = (now - PFX.flash.t0) / PFX.flash.dur;
    if (p >= 1) PFX.flash = null;
    else { g.globalAlpha = (1 - p) * PFX.flash.a; g.fillStyle = PFX.flash.color; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  // 法术名称
  if (PFX.label) {
    const L = PFX.label, p = (now - L.t0) / L.dur;
    if (p >= 1) PFX.label = null;
    else {
      const a = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1, y = H * 0.16;
      g.globalAlpha = a * 0.85; g.fillStyle = '#0a0620'; g.fillRect(0, y - TS * 0.62, W, TS * 0.95);
      g.globalAlpha = a; g.fillStyle = L.color; g.fillRect(0, y - TS * 0.62, W, 2); g.fillRect(0, y + TS * 0.33, W, 2);
      g.font = `900 ${Math.round(TS * 0.62)}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText(L.text, W / 2 + (1 - Math.min(1, p * 5)) * TS, y - TS * 0.12);
      g.fillStyle = L.color; g.fillText(L.text, W / 2 + (1 - Math.min(1, p * 5)) * TS, y - TS * 0.12);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.globalAlpha = 1;
    }
  }
}
function fxActive() { return PFX.parts.length || PFX.circles.length || PFX.bolts.length || PFX.beams.length || PFX.pillars.length || PFX.rings.length || PFX.slashes.length; }
function shakeStage() { const st = $('#stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
function flash(color, a, dur) { PFX.flash = { color, a, t0: now0(), dur: T(dur) }; }

// ---------- 各系命中特效 ----------
const IMPACT = {
  fire(x, y, big) {
    const E = ELEM.fire;
    emit(big ? 46 : 30, x, y, { speed: [0.8, 2.6], life: [0.35, 0.8], size: [0.07, 0.16], cols: E.cols, gravity: -1.6, drag: 0.82, shape: 'circle' });
    emit(14, x, y, { speed: [1.5, 3.5], life: [0.4, 0.9], size: [0.03, 0.06], cols: ['#ffe080', '#ffb040'], gravity: 1.5, shape: 'ember' });
    PFX.rings.push({ x, y, r0: 0.1, r1: big ? 1.4 : 0.9, color: '#ff8a30', t0: now0(), dur: T(420) });
  },
  ice(x, y, big) {
    const E = ELEM.ice;
    emit(big ? 30 : 20, x, y, { speed: [1.2, 3], life: [0.4, 0.8], size: [0.07, 0.13], cols: E.cols, drag: 0.8, shape: 'shard' });
    emit(16, x, y, { speed: [0.2, 0.8], life: [0.6, 1.1], size: [0.05, 0.09], cols: ['#ffffff', '#c8f0ff'], gravity: 0.4, shape: 'star', jitter: 0.4 });
    PFX.rings.push({ x, y, r0: 0.2, r1: big ? 1.3 : 0.85, color: '#9ae0ff', t0: now0(), dur: T(500), flat: true });
  },
  bolt(x, y, big) {
    const n = big ? 3 : 1;
    for (let k = 0; k < n; k++) PFX.bolts.push({ x: x + (k ? rand(-0.4, 0.4) * TS : 0), y, color: '#fff6a0', t0: now0() + T(k * 110), dur: T(420) });
    emit(18, x, y, { speed: [1, 3.2], life: [0.2, 0.5], size: [0.04, 0.08], cols: ELEM.bolt.cols, drag: 0.7, shape: 'star' });
  },
  wind(x, y, big) {
    emit(big ? 60 : 40, x, y, { speed: [0, 0], life: [0.6, 1.1], size: [0.05, 0.1], cols: ELEM.wind.cols, swirl: 7, cx: x, cy: y, vy: -1.6, jitter: 0.55, shape: 'circle', delay: 0.15 });
    PFX.rings.push({ x, y: y + TS * 0.3, r0: 0.3, r1: 0.9, color: '#8ae8c0', t0: now0(), dur: T(600), flat: true });
  },
  rock(x, y, big) {
    for (let k = 0; k < (big ? 5 : 3); k++) emit(1, x + rand(-0.3, 0.3) * TS + TS * 0.8, y - TS * rand(2.5, 4), { speed: [0, 0], vx: -2.2, vy: 7, life: [0.4, 0.46], size: [0.16, 0.26], cols: ['#d8a060', '#a07040', '#ff8a30'], shape: 'rock', delay: 0.2 });
    emit(big ? 24 : 14, x + TS * 0.6, y - TS * 2.2, { speed: [0, 0.2], vx: -1.6, vy: 5, life: [0.3, 0.5], size: [0.06, 0.12], cols: ELEM.fire.cols, shape: 'circle', delay: 0.2 });
    setTimeout(() => {
      emit(26, x, y, { speed: [0.8, 2.4], life: [0.4, 0.8], size: [0.05, 0.1], cols: ELEM.rock.cols, gravity: 3, drag: 0.85, shape: 'rock' });
      PFX.rings.push({ x, y, r0: 0.2, r1: 1.1, color: '#c8a070', t0: now0(), dur: T(450), flat: true });
    }, T(380));
  },
  dark(x, y, big) {
    emit(big ? 70 : 46, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.05, 0.11], cols: ELEM.dark.cols, swirl: -6, cx: x, cy: y, jitter: 0.9, shape: 'circle' });
    PFX.rings.push({ x, y, r0: 1.2, r1: 0.1, color: '#a040ff', t0: now0(), dur: T(700) });
  },
  holy(x, y, big) {
    PFX.pillars.push({ x, y: y + TS * 0.3, w: big ? 0.7 : 0.5, color: '#fff2a0', t0: now0(), dur: T(700) });
    emit(26, x, y, { speed: [0.2, 1], life: [0.6, 1.1], size: [0.05, 0.1], cols: ELEM.holy.cols, gravity: -1.2, shape: 'star', jitter: 0.4 });
  },
  heal(x, y) {
    PFX.pillars.push({ x, y: y + TS * 0.35, w: 0.45, color: '#7af0a0', t0: now0(), dur: T(650) });
    emit(28, x, y + TS * 0.3, { speed: [0.05, 0.3], life: [0.7, 1.2], size: [0.04, 0.09], cols: ELEM.heal.cols, gravity: -1.4, shape: 'star', jitter: 0.45 });
  },
  buff(x, y) {
    for (let k = 0; k < 3; k++) PFX.rings.push({ x, y: y + TS * (0.35 - k * 0.3), r0: 0.45, r1: 0.5, color: '#ffd060', t0: now0() + T(k * 140), dur: T(500), flat: true });
    emit(20, x, y + TS * 0.3, { speed: [0.05, 0.2], life: [0.6, 1], size: [0.04, 0.07], cols: ELEM.buff.cols, gravity: -1.6, shape: 'star', jitter: 0.4 });
  },
  acid(x, y) {
    emit(26, x, y, { speed: [0.3, 1.4], life: [0.5, 1], size: [0.05, 0.12], cols: ELEM.acid.cols, gravity: -0.6, drag: 0.8, shape: 'circle', jitter: 0.3 });
  },
};
IMPACT.beam = IMPACT.fire;
IMPACT.slash = (x, y) => emit(16, x, y, { speed: [1, 3], life: [0.2, 0.45], size: [0.03, 0.07], cols: ELEM.slash.cols, drag: 0.7, shape: 'star' });
IMPACT.summon = IMPACT.holy;

// ---------- 施法流程 ----------
// 返回时，命中特效已经打在目标上（之后才结算伤害），余韵继续在背景播放
async function castAnim(u, sp, spId, tx, ty) {
  if (AUTO) return;
  const fx = sp.kind === 'summon' ? 'summon' : sp.kind === 'phys' || sp.kind === 'pair' ? 'slash' : sp.line ? (sp.fx === 'beam' ? 'beam' : sp.fx) : sp.fx;
  const E = ELEM[fx] || ELEM.fire;
  const big = (sp.power || 0) >= 28 || (sp.area || 0) >= 2;
  const cx = tc(u.x), cy = tc(u.y), x = tc(tx), y = tc(ty);
  PFX.label = { text: sp.name, color: E.label, t0: now0(), dur: T(1300) };
  await tween(t => { PFX.dim = 0.42 * t; }, 160);

  // 1) 蓄力：魔法阵 / 剑气凝聚
  if (sp.kind === 'phys' || sp.kind === 'pair') {
    emit(22, cx, cy, { speed: [0, 0], life: [0.35, 0.5], size: [0.04, 0.07], cols: sp.kind === 'pair' ? ['#ffe08a', '#ffffff'] : E.cols, swirl: 9, cx, cy, jitter: 0.7, shape: 'star' });
  } else {
    PFX.circles.push({ x: cx, y: cy + TS * 0.32, r: 0.62, color: E.glow, t0: now0(), dur: T(820) });
    emit(18, cx, cy + TS * 0.3, { speed: [0.05, 0.2], life: [0.5, 0.8], size: [0.03, 0.06], cols: E.cols, gravity: -1.8, jitter: 0.35, shape: 'star' });
  }
  sfx(sp.kind === 'phys' || sp.kind === 'pair' ? 'slash' : 'magic');
  await wait(420);

  const cells = sp.line ? lineTiles(u.x, u.y, tx, ty, sp.range[1]) : areaTiles(tx, ty, sp.area || 0);
  const element = { fire: 'fire', ice: 'ice', bolt: 'bolt', wind: 'wind', rock: 'rock', dark: 'dark', holy: 'holy', acid: 'status', heal: 'heal', buff: 'buff', beam: 'fire' }[sp.fx];

  // 2) 施放
  if (sp.line) {
    const end = cells[cells.length - 1] || { x: tx, y: ty };
    sfx(element || 'magic');
    PFX.beams.push({ x0: cx, y0: cy, x1: tc(end.x), y1: tc(end.y), w: big ? 0.6 : 0.45, color: E.glow, t0: now0(), dur: T(700) });
    await wait(180);
    cells.forEach((c, k) => setTimeout(() => (IMPACT[fx] || IMPACT.fire)(tc(c.x), tc(c.y), false), T(k * 40)));
    shakeStage();
    await wait(360);
  } else if (sp.kind === 'phys' || sp.kind === 'pair') {
    // 剑法：冲出的剑气 + 连续斩击
    sfx('slash');
    const ang = Math.atan2(y - cy, x - cx);
    emit(16, cx, cy, { angle: ang, spread: 0.15, speed: [4, 6], life: [0.18, 0.26], size: [0.05, 0.08], cols: ['#ffffff', E.glow], shape: 'shard' });
    await wait(150);
    const hits = sp.kind === 'pair' ? 4 : (sp.power || 0) >= 18 ? 3 : 2;
    for (const c of cells) for (let k = 0; k < hits; k++) {
      PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: -0.8 + k * (1.6 / Math.max(1, hits - 1)) + rand(-0.15, 0.15), len: sp.kind === 'pair' ? 0.8 : 0.6, color: sp.kind === 'pair' ? (k % 2 ? '#ffe08a' : '#a8c8ff') : '#c8dcff', t0: now0() + T(k * 90), dur: T(320) });
    }
    cells.forEach(c => IMPACT.slash(tc(c.x), tc(c.y)));
    if (sp.kind === 'pair' || big) { flash('#ffffff', 0.45, 260); shakeStage(); }
    if (sp.fx === 'fire' || sp.fx === 'dark' || sp.fx === 'holy') setTimeout(() => cells.forEach(c => IMPACT[sp.fx](tc(c.x), tc(c.y), false)), T(160));
    await wait(160 + hits * 90);
  } else if (sp.kind === 'summon') {
    sfx('summon');
    PFX.circles.push({ x, y: y + TS * 0.3, r: 0.85, color: '#b090ff', t0: now0(), dur: T(1100) });
    PFX.pillars.push({ x, y: y + TS * 0.3, w: 0.55, color: '#d8c0ff', t0: now0() + T(250), dur: T(700) });
    emit(36, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.04, 0.08], cols: ELEM.summon.cols, swirl: 6, cx: x, cy: y, vy: -1.2, jitter: 0.8, shape: 'star' });
    await wait(650);
    flash('#ffffff', 0.35, 220);
  } else {
    const projectile = ['fire', 'ice', 'rock', 'dark', 'holy', 'acid', 'wind'].includes(fx) && (u.x !== tx || u.y !== ty) && !friendlySpell(sp) && spId !== 'meteor';
    if (projectile && !big) {
      // 投射物飞向目标，拖着粒子尾巴
      await tween(t => {
        const px = cx + (x - cx) * t, py = cy + (y - cy) * t - Math.sin(t * Math.PI) * TS * 0.4;
        emit(3, px, py, { speed: [0, 0.3], life: [0.2, 0.35], size: [0.06, 0.12], cols: E.cols, shape: fx === 'rock' ? 'rock' : 'circle' });
      }, 300);
    }
    sfx(element || 'magic');
    // 大范围法术：额外的天降演出
    if (spId === 'meteor') cells.forEach((c, k) => setTimeout(() => IMPACT.rock(tc(c.x), tc(c.y), true), T(k * 70)));
    else if (spId === 'stormThunder' || spId === 'thunder') cells.forEach((c, k) => setTimeout(() => IMPACT.bolt(tc(c.x), tc(c.y), spId === 'stormThunder'), T(k * 60)));
    else cells.forEach((c, k) => setTimeout(() => (IMPACT[fx] || IMPACT.fire)(tc(c.x), tc(c.y), big), T(k * 35)));
    // 异常状态 / 减益：在目标身上加一层对应颜色的印记
    if (sp.kind === 'status' || sp.kind === 'debuff' || sp.kind === 'death') {
      PFX.circles.push({ x, y: y + TS * 0.3, r: 0.55, color: sp.status ? STATUS_COLOR[sp.status] : '#ff7a9a', t0: now0() + T(150), dur: T(700) });
      if (sp.kind === 'death') { PFX.rings.push({ x, y, r0: 1.4, r1: 0.05, color: '#000000', t0: now0(), dur: T(600) }); flash('#2a0a40', 0.5, 400); }
    }
    if (big) { flash(E.glow, 0.45, 380); shakeStage(); }
    await wait(big || spId === 'meteor' ? 620 : 440);
  }
  // 3) 收尾：变暗逐渐恢复（不阻塞伤害结算）
  tween(t => { PFX.dim = 0.42 * (1 - t); }, 450);
}
