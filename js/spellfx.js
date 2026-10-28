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
      g.globalAlpha = (1 - p) * al; g.strokeStyle = col; g.lineWidth = TS * wd * (s.thin || 1); g.lineCap = 'round';
      g.beginPath();
      if (s.straight) { g.moveTo(-L, 0); g.lineTo(-L + 2 * L * sweep, 0); } // 直线斩痕（刀光、爪痕）
      else g.arc(0, L * 0.6, L, -Math.PI / 2 - 0.9, -Math.PI / 2 - 0.9 + 1.8 * sweep);
      g.stroke();
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
    } else if (q.shape === 'arrow') {
      g.save(); g.translate(q.x, q.y); g.rotate(Math.atan2(q.vy, q.vx)); g.globalAlpha = 1;
      g.fillStyle = q.col; g.fillRect(-s * 7, -s * 0.35, s * 7, s * 0.7);
      g.beginPath(); g.moveTo(s * 1.8, 0); g.lineTo(-s * 0.4, s * 1.1); g.lineTo(-s * 0.4, -s * 1.1); g.fill();
      g.fillStyle = '#ffffff'; g.fillRect(-s * 7, -s * 1, s * 1.4, s * 2);
      g.restore();
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
function shakeStage(v) { addTrauma(v || 0.5); haptic(25); }
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

// ---------- 各职业战技的演出 ----------
// 直线飞行的投射物（箭、羽刃）：dur 秒内从 (x0,y0) 飞到 (x1,y1)
function shoot(x0, y0, x1, y1, dur, o) {
  o = o || {};
  PFX.parts.push({ x: x0, y: y0, vx: (x1 - x0) / dur, vy: (y1 - y0) / dur, life: 0, max: dur, size: (o.size || 0.06) * TS, col: o.col || '#f4e8c8',
    g: 0, drag: 1, shape: o.shape || 'arrow', glow: true, spin: 0, delay: o.delay || 0 });
}
const hitSpark = (x, y, cols) => emit(12, x, y, { speed: [1, 2.6], life: [0.18, 0.4], size: [0.03, 0.06], cols: cols || ELEM.slash.cols, drag: 0.7, shape: 'star' });
const STYLE = {
  // 长枪突刺：一道笔直的枪芒
  async thrust({ cx, cy, ang, cells }) {
    sfx('slash');
    emit(10, cx, cy, { angle: ang + Math.PI, spread: 0.4, speed: [1, 2], life: [0.2, 0.3], size: [0.03, 0.05], cols: ['#ffffff', '#c8dcff'], shape: 'star' });
    await wait(120);
    for (const c of cells) {
      const tx = tc(c.x), ty = tc(c.y), a = Math.atan2(ty - cy, tx - cx);
      PFX.beams.push({ x0: cx, y0: cy, x1: tx + Math.cos(a) * TS * 0.45, y1: ty + Math.sin(a) * TS * 0.45, w: 0.2, color: '#c8dcff', t0: now0(), dur: T(300) });
    }
    await wait(90);
    cells.forEach(c => { hitSpark(tc(c.x), tc(c.y)); PFX.rings.push({ x: tc(c.x), y: tc(c.y), r0: 0.1, r1: 0.6, color: '#e8f0ff', t0: now0(), dur: T(260) }); });
    sfx('hit');
    await wait(200);
  },
  // 冲锋贯穿：疾风般穿过一整列
  async charge({ u, sp, cx, cy, cells, E }) {
    sfx('wind');
    const end = cells[cells.length - 1] || u;
    const ex = tc(end.x), ey = tc(end.y), a = Math.atan2(ey - cy, ex - cx);
    PFX.beams.push({ x0: cx, y0: cy, x1: ex + Math.cos(a) * TS * 0.5, y1: ey + Math.sin(a) * TS * 0.5, w: 0.55, color: sp.fx === 'slash' ? '#a8f0d0' : E.glow, t0: now0(), dur: T(520) });
    emit(26, cx, cy, { angle: a, spread: 0.12, speed: [5, 8], life: [0.2, 0.35], size: [0.03, 0.05], cols: ['#ffffff', '#d8fff0'], shape: 'shard', jitter: 0.3 });
    await wait(150);
    cells.forEach((c, k) => setTimeout(() => {
      PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: a + Math.PI / 2, len: 0.55, color: '#e8f0ff', t0: now0(), dur: T(260), straight: true });
      hitSpark(tc(c.x), tc(c.y));
    }, T(k * 60)));
    sfx('slash');
    await wait(260 + cells.length * 60);
  },
  // 回旋横扫：以自身为中心的冲击环
  async spin({ sp, cx, cy, cells, E }) {
    sfx('wind');
    const r = (sp.area || 1) + 0.4, col = sp.fx === 'rock' ? '#e0c090' : sp.fx === 'dark' ? '#c070ff' : '#e8f0ff';
    for (let k = 0; k < 2; k++) PFX.rings.push({ x: cx, y: cy, r0: 0.3, r1: r, color: col, t0: now0() + T(k * 120), dur: T(420) });
    emit(36, cx, cy, { speed: [0, 0], life: [0.4, 0.6], size: [0.03, 0.06], cols: sp.fx === 'rock' ? ELEM.rock.cols : E.cols, swirl: -9, cx, cy, jitter: 0.9, shape: 'star' });
    await wait(160);
    cells.forEach((c, k) => {
      const a = Math.atan2(tc(c.y) - cy, tc(c.x) - cx);
      PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: a + Math.PI / 2, len: 0.6, color: col, t0: now0() + T(k * 25), dur: T(300) });
      if (sp.fx === 'rock') emit(10, tc(c.x), tc(c.y), { speed: [0.6, 1.8], life: [0.3, 0.6], size: [0.04, 0.08], cols: ELEM.rock.cols, gravity: 3, shape: 'rock' });
      else hitSpark(tc(c.x), tc(c.y));
    });
    sfx('slash');
    if (sp.fx === 'rock') shakeStage();
    await wait(320);
  },
  // 巨斧劈落：重击 + 碎石与震波
  async axe({ sp, cells }) {
    const main = cells[0];
    if (!main) return;
    const mx = tc(main.x), my = tc(main.y);
    PFX.slashes.push({ x: mx, y: my, angle: Math.PI / 2 - 0.15, len: 0.85, color: '#ffd8a0', t0: now0(), dur: T(260), straight: true, thin: 1.6 });
    sfx('crit');
    await wait(140);
    for (const c of cells) {
      const x = tc(c.x), y = tc(c.y);
      emit(16, x, y + TS * 0.25, { angle: -Math.PI / 2, spread: 1.1, speed: [1, 3], life: [0.3, 0.7], size: [0.04, 0.09], cols: ELEM.rock.cols, gravity: 6, drag: 0.95, shape: 'rock' });
      PFX.rings.push({ x, y: y + TS * 0.3, r0: 0.1, r1: 0.9, color: '#e0c090', t0: now0(), dur: T(380), flat: true });
    }
    if (cells.length > 1 || sp.power >= 28) shakeStage();
    sfx('rock');
    await wait(300);
  },
  // 居合一闪：停顿后一道横向刀光
  async blade({ sp, cells }) {
    await wait(140);
    sfx('slash');
    const n = sp.status ? 2 : 1; // 燕返：回旋两刀
    cells.forEach((c, i) => {
      for (let k = 0; k < n; k++) PFX.slashes.push({ x: tc(c.x), y: tc(c.y) + (k ? -TS * 0.12 : 0), angle: k ? Math.PI - 0.35 : -0.12, len: 0.75, color: k ? '#ffb0c0' : '#ffffff', t0: now0() + T(i * 40 + k * 150), dur: T(240), straight: true });
      hitSpark(tc(c.x), tc(c.y), ['#ffffff', '#ffe0e8', '#ffb0c0']);
    });
    flash('#ffffff', 0.25, 160);
    await wait(260 + (n - 1) * 150);
  },
  // 一闪：疾驰穿过一列
  async dash({ u, cx, cy, cells }) {
    const end = cells[cells.length - 1] || u, ex = tc(end.x), ey = tc(end.y), a = Math.atan2(ey - cy, ex - cx);
    sfx('wind');
    PFX.beams.push({ x0: cx, y0: cy, x1: ex + Math.cos(a) * TS * 0.6, y1: ey + Math.sin(a) * TS * 0.6, w: 0.12, color: '#ffffff', t0: now0(), dur: T(380) });
    await wait(200);
    sfx('slash');
    cells.forEach(c => { PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: a + 0.9, len: 0.7, color: '#ffe0e8', t0: now0(), dur: T(260), straight: true }); hitSpark(tc(c.x), tc(c.y)); });
    flash('#ffffff', 0.2, 140);
    await wait(260);
  },
  // 射箭
  async arrow({ cx, cy, x, y }) {
    sfx('arrow');
    shoot(cx, cy - TS * 0.1, x, y, T(220) / 1000 || 0.01);
    await wait(220);
    hitSpark(x, y, ['#ffffff', '#fff0c0']); sfx('hit');
    await wait(160);
  },
  async arrow2({ cx, cy, x, y }) {
    for (let k = 0; k < 2; k++) {
      sfx('arrow');
      shoot(cx, cy - TS * (0.2 - k * 0.2), x, y + TS * (k ? 0.1 : -0.1), T(200) / 1000 || 0.01);
      await wait(130);
    }
    await wait(80);
    hitSpark(x, y, ['#ffffff', '#fff0c0']); sfx('hit');
    await wait(160);
  },
  async pierce({ u, cx, cy, cells }) {
    const end = cells[cells.length - 1] || u, ex = tc(end.x), ey = tc(end.y), a = Math.atan2(ey - cy, ex - cx);
    sfx('arrow');
    const fx = ex + Math.cos(a) * TS * 1.5, fy = ey + Math.sin(a) * TS * 1.5;
    shoot(cx, cy, fx, fy, T(300) / 1000 || 0.01, { size: 0.06, col: '#d8fff0' });
    PFX.beams.push({ x0: cx, y0: cy, x1: fx, y1: fy, w: 0.16, color: '#8ae8c0', t0: now0(), dur: T(420) });
    cells.forEach((c, k) => setTimeout(() => hitSpark(tc(c.x), tc(c.y), ELEM.wind.cols), T(60 + k * 45)));
    await wait(380);
  },
  // 箭雨：先向天空齐射，再如雨落下
  async volley({ sp, cx, cy, cells }) {
    sfx('arrow');
    for (let k = 0; k < 8; k++) shoot(cx + rand(-0.2, 0.2) * TS, cy, cx + rand(-0.6, 0.6) * TS, cy - TS * 4, 0.25, { delay: k * 0.03 });
    await wait(300);
    const col = sp.fx === 'holy' ? '#fff2a0' : '#f4e8c8';
    for (const c of cells) for (let k = 0; k < 3; k++) {
      const x = tc(c.x) + rand(-0.35, 0.35) * TS, y = tc(c.y) + rand(-0.3, 0.3) * TS;
      shoot(x + TS * 0.8, y - TS * 3.5, x, y, 0.22, { delay: rand(0, 0.25), col });
    }
    await wait(330);
    cells.forEach(c => hitSpark(tc(c.x), tc(c.y), sp.fx === 'holy' ? ELEM.holy.cols : null));
    sfx('hit');
    await wait(220);
  },
  // 鹰族俯冲
  async dive({ x, y }) {
    sfx('wind');
    PFX.beams.push({ x0: x + TS * 1.2, y0: y - TS * 3.5, x1: x, y1: y, w: 0.3, color: '#d8fff0', t0: now0(), dur: T(360) });
    await wait(180);
    IMPACT.wind(x, y, false); hitSpark(x, y); sfx('hit');
    await wait(260);
  },
  async feathers({ cx, cy, cells }) {
    sfx('wind');
    for (const c of cells) for (let k = 0; k < 4; k++) shoot(cx + rand(-0.3, 0.3) * TS, cy + rand(-0.3, 0.3) * TS, tc(c.x) + rand(-0.2, 0.2) * TS, tc(c.y) + rand(-0.2, 0.2) * TS, 0.28, { shape: 'shard', size: 0.06, col: pick(['#ffffff', '#d8c098', '#a8f0d0']), delay: rand(0, 0.12) });
    await wait(380);
    cells.forEach(c => IMPACT.wind(tc(c.x), tc(c.y), false));
    await wait(200);
  },
  // 狼族爪击 / 撕咬：三道平行爪痕
  async claw({ sp, cells }) {
    sfx('slash');
    const col = sp.fx === 'holy' ? '#fff2a0' : '#ffd0d0';
    for (const c of cells) {
      const x = tc(c.x), y = tc(c.y);
      for (let k = -1; k <= 1; k++) PFX.slashes.push({ x: x + k * TS * 0.18, y: y - k * TS * 0.05, angle: 1.0, len: 0.5, color: col, t0: now0() + T((k + 1) * 30), dur: T(260), straight: true, thin: 0.7 });
      emit(10, x, y, { speed: [0.8, 2], life: [0.2, 0.4], size: [0.03, 0.06], cols: ['#ff6a6a', '#ffffff', col], drag: 0.7, shape: 'star' });
    }
    if (sp.fx === 'holy') flash('#fff8d0', 0.3, 200);
    await wait(320);
  },
};
// 横扫：一道横跨三格的大弧光
STYLE.sweep = async ({ u, sp, cells }) => {
  if (!cells.length) return;
  const mid = cells[(cells.length / 2) | 0], dx = mid.x - u.x, dy = mid.y - u.y;
  const ang = Math.atan2(dy, dx) + Math.PI / 2;
  sfx('slash');
  PFX.slashes.push({ x: tc(mid.x) - dx * TS * 0.45, y: tc(mid.y) - dy * TS * 0.45, angle: ang, len: 1.5, color: sp.fx === 'rock' ? '#ffd8a0' : '#e8f0ff', t0: now0(), dur: T(320), thin: 1.3 });
  await wait(120);
  cells.forEach((c, k) => setTimeout(() => (sp.fx === 'rock' ? emit(10, tc(c.x), tc(c.y), { speed: [0.6, 1.8], life: [0.3, 0.6], size: [0.04, 0.08], cols: ELEM.rock.cols, gravity: 3, shape: 'rock' }) : hitSpark(tc(c.x), tc(c.y))), T(k * 50)));
  sfx('hit');
  await wait(260);
};
// 扇形冲击波：一排排向前推进
STYLE.wave = async ({ u, sp, cells, E }) => {
  if (!cells.length) return;
  const dx = Math.sign(cells[0].x - u.x), dy = Math.sign(cells[0].y - u.y), ang = Math.atan2(dy, dx);
  const col = sp.fx === 'rock' ? '#e0c090' : sp.fx === 'wind' ? '#a8f0d0' : '#e8f0ff';
  const cols = sp.fx === 'rock' ? ELEM.rock.cols : sp.fx === 'wind' ? ELEM.wind.cols : ELEM.slash.cols;
  sfx(sp.fx === 'rock' ? 'rock' : 'wind');
  for (let k = 1; k <= (sp.cone || 1); k++) {
    const row = cells.filter(c => Math.abs(c.x - u.x) * Math.abs(dx) + Math.abs(c.y - u.y) * Math.abs(dy) === k);
    setTimeout(() => {
      const cx = tc(u.x + dx * k), cy = tc(u.y + dy * k);
      const L = 0.6 + k * 0.45;
      PFX.slashes.push({ x: cx - dx * TS * L * 0.3, y: cy - dy * TS * L * 0.3, angle: ang + Math.PI / 2, len: L, color: col, t0: now0(), dur: T(300), thin: 1.4 });
      row.forEach(c => emit(sp.fx === 'rock' ? 10 : 8, tc(c.x), tc(c.y), { angle: ang, spread: 0.6, speed: [1, 2.6], life: [0.25, 0.5], size: [0.04, 0.08], cols, gravity: sp.fx === 'rock' ? 3 : 0, drag: 0.8, shape: sp.fx === 'rock' ? 'rock' : 'shard' }));
      if (sp.fx === 'rock') shakeStage();
    }, T((k - 1) * 110));
  }
  await wait(140 + (sp.cone || 1) * 110);
  sfx('hit');
  await wait(180);
};
// 怒吼 / 咆哮：自身放出冲击环
STYLE.roar = async ({ sp, cx, cy, cells }) => {
  const col = sp.fx === 'dark' ? '#c070ff' : '#ff8a4a';
  sfx('status');
  for (let k = 0; k < 3; k++) PFX.rings.push({ x: cx, y: cy, r0: 0.3, r1: 1.8, color: col, t0: now0() + T(k * 110), dur: T(450) });
  emit(24, cx, cy, { speed: [1.5, 3], life: [0.3, 0.5], size: [0.03, 0.06], cols: [col, '#ffffff'], drag: 0.8, shape: 'shard' });
  shakeStage();
  await wait(300);
  cells.forEach(c => PFX.circles.push({ x: tc(c.x), y: tc(c.y) + TS * 0.3, r: 0.45, color: col, t0: now0(), dur: T(600) }));
  await wait(200);
};
STYLE.rain = async ctx => { // 天马流星枪：自空中连续刺下
  sfx('slash');
  for (const c of ctx.cells) for (let k = 0; k < 2; k++) {
    const x = tc(c.x), y = tc(c.y);
    PFX.beams.push({ x0: x + TS * 0.6, y0: y - TS * 2.8, x1: x, y1: y, w: 0.22, color: '#fff2b0', t0: now0() + T(k * 120 + rand(0, 80)), dur: T(280) });
  }
  await wait(260);
  ctx.cells.forEach(c => { hitSpark(tc(c.x), tc(c.y), ELEM.holy.cols); PFX.rings.push({ x: tc(c.x), y: tc(c.y), r0: 0.1, r1: 0.7, color: '#fff2a0', t0: now0(), dur: T(300) }); });
  sfx('hit');
  await wait(240);
};

// ---------- 必杀技插图（全屏 cut-in） ----------
let cutCv = null;
function isUltimate(u, sp) {
  if (sp.kind === 'heal' || sp.kind === 'buff' || sp.kind === 'cure') return (sp.area || 0) >= 2 && u.team === 'player';
  return sp.kind === 'pair' || (sp.power || 0) >= 26 || (sp.area || 0) >= 2 || (sp.kind === 'summon' && sp.mp >= 20) || (u.boss && (sp.power || 0) >= 16);
}
async function skillCutIn(u, sp, E) {
  if (AUTO || !OPT.anim) return;
  if (!cutCv) {
    cutCv = document.createElement('canvas');
    cutCv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:34;pointer-events:none;image-rendering:pixelated';
    $('#app').appendChild(cutCv);
  }
  const app = $('#app').getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = app.width, H = app.height;
  cutCv.width = Math.round(W * dpr); cutCv.height = Math.round(H * dpr); cutCv.hidden = false;
  const g = cutCv.getContext('2d');
  const ports = [u, B.castPartner].filter(Boolean).map(o => typeof unitPortrait === 'function' ? unitPortrait(o, 64) : null).filter(Boolean);
  const col = E.glow, dur = T(1050), t0 = performance.now();
  const lines = Array.from({ length: 26 }, () => ({ y: Math.random(), w: 0.2 + Math.random() * 0.5, sp: 1.5 + Math.random() * 2.5, o: Math.random() }));
  sfx('cutin'); haptic(20);
  await new Promise(res => {
    const frame = now => {
      const p = Math.min(1, (now - t0) / dur);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
      const inP = Math.min(1, p / 0.16), outP = p > 0.82 ? (p - 0.82) / 0.18 : 0;
      const ease = 1 - Math.pow(1 - inP, 3);
      // 背景压暗
      g.fillStyle = `rgba(4,2,14,${0.6 * ease * (1 - outP)})`; g.fillRect(0, 0, W, H);
      // 斜向色带
      const cy = H * 0.44, bh = H * 0.3 * (1 - outP * 0.95), sk = W * 0.18, slide = (1 - ease) * W * 1.2;
      g.save(); g.translate(slide, 0);
      const grd = g.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
      grd.addColorStop(0, '#0a0620'); grd.addColorStop(0.5, col); grd.addColorStop(1, '#0a0620');
      g.fillStyle = grd; g.globalAlpha = 0.92;
      g.beginPath(); g.moveTo(-sk, cy - bh / 2 + sk * 0.5); g.lineTo(W + sk, cy - bh / 2 - sk * 0.5); g.lineTo(W + sk, cy + bh / 2 - sk * 0.5); g.lineTo(-sk, cy + bh / 2 + sk * 0.5); g.closePath(); g.fill();
      g.clip();
      // 速度线
      g.globalCompositeOperation = 'lighter';
      for (const L of lines) {
        const x = W - ((now / 1000 * L.sp * W + L.o * W * 2) % (W * 2)), y = cy - bh / 2 + L.y * bh;
        g.globalAlpha = 0.35; g.fillStyle = '#ffffff'; g.fillRect(x, y, W * L.w, Math.max(1, bh * 0.012));
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      // 立绘（像素放大）由左滑入并缓慢推近
      const ps = Math.min(bh * 1.05 / 72, W * 0.36 / 64) * (1 + p * 0.06);
      ports.forEach((pc, i) => {
        const pin = Math.min(1, Math.max(0, (p - 0.04 - i * 0.06) / 0.18)), pe = 1 - Math.pow(1 - pin, 3);
        const px = W * 0.04 + i * 64 * ps * 0.82 - (1 - pe) * W * 0.6, py = cy - 72 * ps / 2;
        g.globalAlpha = pe; g.drawImage(pc, px, py, 64 * ps, 72 * ps);
      });
      g.restore(); g.globalAlpha = 1;
      // 招式名
      const tin = Math.min(1, Math.max(0, (p - 0.12) / 0.16)), te = 1 - Math.pow(1 - tin, 3);
      const fs = Math.round(Math.min(W * 0.11, bh * 0.3)), tx = W * 0.96 + (1 - te) * W * 0.5, ty = cy + bh * 0.12;
      g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.font = `900 ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
      g.globalAlpha = te * (1 - outP);
      g.lineWidth = Math.max(4, fs / 6); g.strokeStyle = '#0a0418'; g.strokeText(sp.name, tx, ty);
      const tg = g.createLinearGradient(0, ty - fs / 2, 0, ty + fs / 2);
      tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.55, E.label); tg.addColorStop(1, col);
      g.fillStyle = tg; g.fillText(sp.name, tx, ty);
      g.font = `bold ${Math.round(fs * 0.36)}px sans-serif`; g.lineWidth = 3;
      const cap = sp.kind === 'pair' ? '双人合击' : u.team === 'player' ? '必杀技' : '强敌绝招';
      g.strokeText(cap, tx, ty - fs * 0.78); g.fillStyle = '#ffffff'; g.fillText(cap, tx, ty - fs * 0.78);
      g.globalAlpha = 1;
      // 收尾闪光
      if (outP > 0) { g.fillStyle = `rgba(255,255,255,${0.7 * Math.sin(outP * Math.PI)})`; g.fillRect(0, 0, W, H); }
      if (p < 1) requestAnimationFrame(frame); else { g.clearRect(0, 0, W, H); cutCv.hidden = true; res(); }
    };
    requestAnimationFrame(frame);
  });
}

// ---------- 施法流程 ----------
// 返回时，命中特效已经打在目标上（之后才结算伤害），余韵继续在背景播放
async function castAnim(u, sp, spId, tx, ty) {
  if (AUTO) return;
  const fx = sp.kind === 'summon' ? 'summon' : sp.kind === 'phys' || sp.kind === 'pair' ? 'slash' : sp.line ? (sp.fx === 'beam' ? 'beam' : sp.fx) : sp.fx;
  const E = ELEM[fx] || ELEM.fire;
  const big = (sp.power || 0) >= 28 || (sp.area || 0) >= 2;
  const cx = tc(u.x), cy = tc(u.y), x = tc(tx), y = tc(ty);
  if (isUltimate(u, sp)) await skillCutIn(u, sp, E);
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

  const cells = spellCells(u, sp, tx, ty);
  const element = { fire: 'fire', ice: 'ice', bolt: 'bolt', wind: 'wind', rock: 'rock', dark: 'dark', holy: 'holy', acid: 'status', heal: 'heal', buff: 'buff', beam: 'fire' }[sp.fx];

  // 2) 施放
  if (sp.style && STYLE[sp.style]) {
    const ang = Math.atan2(y - cy, x - cx);
    const hitCells = sp.around ? cells.filter(c => c.x !== u.x || c.y !== u.y) : cells;
    await STYLE[sp.style]({ u, sp, cx, cy, x, y, ang, cells: hitCells, big, E });
    if (sp.kind !== 'debuff' && sp.fx && IMPACT[sp.fx] && ['fire', 'holy', 'dark', 'bolt'].includes(sp.fx)) hitCells.forEach((c, k) => setTimeout(() => IMPACT[sp.fx](tc(c.x), tc(c.y), false), T(k * 40)));
    if (big) { flash(E.glow, 0.35, 300); shakeStage(); }
    await wait(200);
  } else if (sp.line) {
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
    if (big) { flash(E.glow, 0.45, 380); shakeStage(0.75); sfx('boom'); haptic([30, 20, 60]); }
    await wait(big || spId === 'meteor' ? 620 : 440);
  }
  // 3) 收尾：变暗逐渐恢复（不阻塞伤害结算）
  tween(t => { PFX.dim = 0.42 * (1 - t); }, 450);
}
