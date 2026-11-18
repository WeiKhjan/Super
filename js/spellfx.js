// 超时空英雄传说 · 移动重制版 —— 地图上的法术演出（粒子、魔法阵、投射物、各系命中特效）
'use strict';

const PFX = { actors: [], parts: [], circles: [], bolts: [], beams: [], pillars: [], rings: [], slashes: [], bursts: [], flash: null, label: null, dim: 0, last: 0, tint: null, vig: 0 };
// 高清画风（默认）走 drawSpellFxHD 的平滑发光渲染；OPT.art === 'pixel' 时保留原像素演出
const HDFX = () => typeof artHD !== 'function' || artHD();
const PART_CAP = 620; // 高清粒子上限（手机 60fps）
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
  const hd = HDFX();
  if (hd) { // 高清：依粒子总量收敛，避免大范围法术把手机拖慢
    const room = Math.round(PART_CAP * (0.45 + 0.55 * FXK.q)) - PFX.parts.length;
    if (room <= 0) return;
    n = Math.min(Math.ceil(n * (FXK.m || 1) * (0.5 + 0.5 * FXK.q) * (PFX.parts.length > PART_CAP * 0.5 ? 0.6 : 1)), room);
  }
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
    if (hd) { const q = PFX.parts[PFX.parts.length - 1]; q.rot = o.rot ?? rand(0, 6.283); q.spin = o.spin ? rand(-o.spin, o.spin) : 0; q.sway = o.sway || 0; q.ph = rand(0, 6.283); q.v = (Math.random() * 3) | 0; }
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
function drawSpellFx(now) { if (HDFX()) drawSpellFxHD(now); else { if (PFX.bursts.length) PFX.bursts.length = 0; if (PFX.actors.length) PFX.actors.length = 0; drawSpellFxPx(now); } }
function drawSpellFxPx(now) {
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
function fxActive() { return PFX.parts.length || PFX.circles.length || PFX.bolts.length || PFX.beams.length || PFX.pillars.length || PFX.rings.length || PFX.slashes.length || PFX.bursts.length || PFX.actors.length; }
function shakeStage(v) { addTrauma(v || 0.5); haptic(25); }
function flash(color, a, dur) { PFX.flash = { color, a, t0: now0(), dur: T(dur) }; }

// ---------- 各系命中特效 ----------
const IMPACT_PX = {
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
IMPACT_PX.beam = IMPACT_PX.fire;
IMPACT_PX.slash = (x, y) => emit(16, x, y, { speed: [1, 3], life: [0.2, 0.45], size: [0.03, 0.07], cols: ELEM.slash.cols, drag: 0.7, shape: 'star' });
IMPACT_PX.summon = IMPACT_PX.holy;
// 呼叫端一律用 IMPACT.xxx：高清画风转给 IMPACT_HD（定义在下方），像素画风维持原样
const IMPACT = {};
for (const k of Object.keys(IMPACT_PX)) IMPACT[k] = (x, y, big, v) => (HDFX() && IMPACT_HD[k] ? IMPACT_HD[k](x, y, big, v) : IMPACT_PX[k](x, y, big));

// ---------- 各职业战技的演出 ----------
// 直线飞行的投射物（箭、羽刃）：dur 秒内从 (x0,y0) 飞到 (x1,y1)
function shoot(x0, y0, x1, y1, dur, o) {
  o = o || {};
  PFX.parts.push({ x: x0, y: y0, vx: (x1 - x0) / dur, vy: (y1 - y0) / dur, life: 0, max: dur, size: (o.size || 0.06) * TS, col: o.col || '#f4e8c8',
    g: 0, drag: 1, shape: o.shape || 'arrow', glow: true, spin: 0, delay: o.delay || 0 });
}
const hitSpark = (x, y, cols) => (HDFX() ? hitSparkHD(x, y, cols) : emit(12, x, y, { speed: [1, 2.6], life: [0.18, 0.4], size: [0.03, 0.06], cols: cols || ELEM.slash.cols, drag: 0.7, shape: 'star' }));
const STYLE = {
  // 长枪突刺：一道笔直的枪芒
  async thrust({ cx, cy, ang, cells }) {
    sfx('slash');
    emit(10, cx, cy, { angle: ang + Math.PI, spread: 0.4, speed: [1, 2], life: [0.2, 0.3], size: [0.03, 0.05], cols: ['#ffffff', '#c8dcff'], shape: 'star' });
    await wait(120);
    for (const c of cells) {
      const tx = tc(c.x), ty = tc(c.y), a = Math.atan2(ty - cy, tx - cx);
      PFX.beams.push({ x0: cx, y0: cy, x1: tx + Math.cos(a) * TS * 0.45, y1: ty + Math.sin(a) * TS * 0.45, w: HDFX() ? 0.3 : 0.2, color: '#c8dcff', t0: now0(), dur: T(300) });
      if (HDFX()) { fxBurst(FXSPR.flare('#e8f0ff'), tx + Math.cos(a) * TS * 0.45, ty + Math.sin(a) * TS * 0.45, { r0: 0.5, r1: 1.4, rot: a, dur: 300, fin: 0.05 }); fxRing(tx, ty, 0.1, 0.8, '#c8dcff', 300, { delay: 60 }); }
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
      if (HDFX()) { // 高清：落点的光爆、岩刺与尘烟
        fxBurst(FXSPR.core('#ffd8a0'), x, y, { r0: 0.2, r1: 0.9, dur: 260, fin: 0.04 }); fxBloom(x, y, '#e0a050', 0.9, { a: 0.4 });
        for (let k = 0; k < 3; k++) fxBurst(FXSPR.spike(pick(['#b08a5a', '#a07a4a'])), x + (k - 1) * TS * 0.3, y + TS * 0.4, { r0: 0, r1: rand(0.3, 0.45), asp: 0.5, ay: 1, mode: 'grow', add: false, dur: 420, fin: 0.02, delay: k * 30 });
        emit(3, x, y + TS * 0.3, { speed: [0.4, 1], life: [0.6, 0.9], size: [0.24, 0.34], cols: ['#a08868'], gravity: -0.4, drag: 0.85, shape: 'smoke' });
      }
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
      if (HDFX()) { PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: 0.25, len: 1.05, color: sp.fx === 'holy' ? '#ffe880' : sp.fx === 'fire' ? '#ffa040' : '#e0e8ff', t0: now0() + T(i * 40), dur: T(300), thin: 1.5 }); fxBurst(FXSPR.flare('#ffffff'), tc(c.x), tc(c.y), { r0: 0.8, r1: 2.2, rot: -0.12, dur: 260, fin: 0.04 }); }
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
    if (HDFX()) PFX.beams.push({ x0: cx, y0: cy - TS * 0.1, x1: x, y1: y, w: 0.07, color: '#fff0c0', t0: now0() + T(40), dur: T(300) });
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
      for (let k = -1; k <= 1; k++) PFX.slashes.push({ x: x + k * TS * 0.18, y: y - k * TS * 0.05, angle: 1.0, len: HDFX() ? 0.62 : 0.5, color: HDFX() && sp.fx !== 'holy' ? '#ff9090' : col, t0: now0() + T((k + 1) * 30), dur: T(260), straight: true, thin: 0.7 });
      emit(10, x, y, { speed: [0.8, 2], life: [0.2, 0.4], size: [0.03, 0.06], cols: ['#ff6a6a', '#ffffff', col], drag: 0.7, shape: 'star' });
      if (HDFX()) { fxBurst(FXSPR.flare('#ffb0b0'), x, y, { r0: 0.6, r1: 1.6, rot: 1.0, dur: 260, fin: 0.05, delay: 60 }); fxBloom(x, y, sp.fx === 'holy' ? '#ffe070' : '#ff5050', 0.8, { a: 0.4 }); }
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

// ---------- 专属大招演出（狂神降世：合技与纯相魔大魔法；依招式 id 选用） ----------
const byDist = (cells, cx, cy) => cells.slice().sort((a, b) => Math.hypot(tc(a.x) - cx, tc(a.y) - cy) - Math.hypot(tc(b.x) - cx, tc(b.y) - cy));
const SHOW = {
  // 太古机兵：大地裂开，岩柱接连拔地而起，巨拳自天砸落
  async ancientGolem({ x, y, cells }) {
    sfx('rock'); shakeStage(0.4);
    byDist(cells, x, y).forEach((c, k) => setTimeout(() => {
      const px = tc(c.x), py = tc(c.y);
      PFX.pillars.push({ x: px, y: py + TS * 0.3, w: 0.55, color: '#c8a070', t0: now0(), dur: T(520) });
      emit(10, px, py + TS * 0.3, { angle: -Math.PI / 2, spread: 0.7, speed: [1.5, 3.2], life: [0.4, 0.7], size: [0.06, 0.12], cols: ELEM.rock.cols, gravity: 5, shape: 'rock' });
    }, T(k * 28)));
    await wait(420);
    for (let k = 0; k < 6; k++) emit(1, x + rand(-0.2, 0.2) * TS, y - TS * 5, { speed: [0, 0], vy: 12, life: [0.36, 0.4], size: [0.5, 0.7], cols: ['#8a7a6a', '#6a5a4a'], shape: 'rock' });
    await wait(330);
    flash('#ffe0b0', 0.55, 260); shakeStage(1); sfx('boom'); haptic([40, 30, 80]);
    for (let k = 0; k < 3; k++) PFX.rings.push({ x, y, r0: 0.2, r1: 2.5 + k, color: '#c8a070', t0: now0() + T(k * 90), dur: T(500), flat: true });
    cells.forEach((c, k) => setTimeout(() => IMPACT.rock(tc(c.x), tc(c.y), false), T(k * 15)));
    await wait(380);
  },
  // 暴风散弹箭：扇形的风之箭雨
  async stormShot({ cx, cy, cells }) {
    sfx('wind');
    for (let r = 0; r < 3; r++) cells.forEach(c => shoot(cx, cy, tc(c.x) + rand(-0.2, 0.2) * TS, tc(c.y) + rand(-0.2, 0.2) * TS, 0.2, { col: r % 2 ? '#ffffff' : '#a8f0d0', delay: r * 0.07 + rand(0, 0.04) }));
    emit(30, cx, cy, { speed: [0, 0], life: [0.4, 0.6], size: [0.04, 0.08], cols: ELEM.wind.cols, swirl: 9, cx, cy, jitter: 0.6, shape: 'shard' });
    await wait(330);
    cells.forEach((c, k) => setTimeout(() => IMPACT.wind(tc(c.x), tc(c.y), false), T(k * 25)));
    flash('#d8fff0', 0.35, 220); shakeStage(0.6); sfx('hit');
    await wait(360);
  },
  // 混沌脉冲：三道黑紫脉冲沿直线贯穿
  async chaosPulse({ cx, cy, cells }) {
    if (!cells.length) return;
    const end = byDist(cells, cx, cy).pop();
    const ex = tc(end.x), ey = tc(end.y);
    sfx('dark');
    emit(40, cx, cy, { speed: [0, 0], life: [0.4, 0.6], size: [0.05, 0.1], cols: ELEM.dark.cols, swirl: -10, cx, cy, jitter: 0.9, shape: 'circle' });
    await wait(260);
    for (let k = 0; k < 3; k++) PFX.beams.push({ x0: cx, y0: cy, x1: ex, y1: ey, w: 0.75 - k * 0.15, color: k === 1 ? '#f0c0ff' : '#8a2ad0', t0: now0() + T(k * 140), dur: T(420) });
    byDist(cells, cx, cy).forEach((c, k) => setTimeout(() => { IMPACT.dark(tc(c.x), tc(c.y), false); PFX.rings.push({ x: tc(c.x), y: tc(c.y), r0: 0.1, r1: 0.9, color: '#c070ff', t0: now0(), dur: T(320) }); }, T(80 + k * 45)));
    await wait(300); flash('#c070ff', 0.4, 260); shakeStage(0.8);
    await wait(320);
  },
  // 超热燎原火：烈焰自施法者向外一圈圈蔓延
  async heatWave({ cx, cy, cells }) {
    sfx('fire');
    const sorted = byDist(cells, cx, cy);
    sorted.forEach((c, k) => setTimeout(() => {
      const px = tc(c.x), py = tc(c.y);
      emit(12, px, py + TS * 0.2, { speed: [0.3, 1.2], life: [0.4, 0.8], size: [0.08, 0.16], cols: ELEM.fire.cols, gravity: -2.4, drag: 0.85, shape: 'circle', jitter: 0.35 });
      if (k % 3 === 0) PFX.rings.push({ x: px, y: py, r0: 0.1, r1: 0.8, color: '#ff8a30', t0: now0(), dur: T(300), flat: true });
    }, T(Math.min(700, k * 14))));
    await wait(360); flash('#ffb060', 0.5, 320); shakeStage(0.9); sfx('boom'); haptic([30, 20, 60]);
    await wait(460);
  },
  // 火山爆发：地面隆起、熔岩冲天，火山弹四散落下
  async volcano({ x, y, cells }) {
    sfx('rock'); shakeStage(0.5);
    PFX.circles.push({ x, y: y + TS * 0.3, r: 1.6, color: '#ff5a1a', t0: now0(), dur: T(1000) });
    await wait(300);
    PFX.pillars.push({ x, y: y + TS * 0.3, w: 1.2, color: '#ff7a1a', t0: now0(), dur: T(800) });
    emit(60, x, y, { angle: -Math.PI / 2, spread: 0.5, speed: [3, 7], life: [0.6, 1.1], size: [0.08, 0.18], cols: ELEM.fire.cols, gravity: 6, drag: 0.92, shape: 'circle' });
    flash('#ff8a30', 0.55, 300); shakeStage(1); sfx('boom'); haptic([40, 30, 80]);
    cells.forEach((c, k) => setTimeout(() => { IMPACT.fire(tc(c.x), tc(c.y), false); if (k % 2 === 0) IMPACT.rock(tc(c.x), tc(c.y), false); }, T(200 + k * 30)));
    await wait(700);
  },
  // 四元素爆炸：地、水、火、风四道元素柱依次落下，最后合为白光
  async fourBurst({ x, y, cells }) {
    const EL = [['rock', '#e0c090'], ['ice', '#7ad0ff'], ['fire', '#ff7a1a'], ['wind', '#8ae8c0']];
    for (let k = 0; k < 4; k++) {
      const [el, col] = EL[k], a = k * Math.PI / 2 + Math.PI / 4, px = x + Math.cos(a) * TS * 1.2, py = y + Math.sin(a) * TS * 0.8;
      PFX.pillars.push({ x: px, y: py + TS * 0.3, w: 0.6, color: col, t0: now0(), dur: T(600) });
      IMPACT[el](px, py, false); sfx(el === 'rock' ? 'rock' : el); await wait(150);
    }
    for (let k = 0; k < 4; k++) PFX.rings.push({ x, y, r0: 3, r1: 0.1, color: EL[k][1], t0: now0() + T(k * 60), dur: T(380) });
    await wait(360);
    flash('#ffffff', 0.75, 400); shakeStage(1); sfx('boom'); haptic([40, 30, 80]);
    PFX.rings.push({ x, y, r0: 0.2, r1: 4, color: '#ffffff', t0: now0(), dur: T(600) });
    cells.forEach((c, k) => setTimeout(() => IMPACT[EL[k % 4][0]](tc(c.x), tc(c.y), false), T(k * 12)));
    await wait(560);
  },
};
SHOW.ancientGolemB = SHOW.ancientGolem;
SHOW.chaosPulseB = SHOW.chaosPulse;
SHOW.d4_heatWaveB = SHOW.heatWave; // 与普鲁丝的超热燎原火（同一招）

// ---------- 必杀技插图（全屏 cut-in） ----------
let cutCv = null;
function isUltimate(u, sp) {
  if (sp.kind === 'heal' || sp.kind === 'buff' || sp.kind === 'cure') return (sp.area || 0) >= 2 && u.team === 'player';
  return sp.kind === 'pair' || (sp.power || 0) >= 26 || (sp.area || 0) >= 2 || (sp.kind === 'summon' && sp.mp >= 20) || (u.boss && (sp.power || 0) >= 16);
}
async function skillCutIn(u, sp, E) {
  if (AUTO || !OPT.anim) return;
  if (HDFX()) return skillCutInHD(u, sp, E);
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
  if (HDFX()) return castAnimHD(u, sp, spId, tx, ty);
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
  if (SHOW[spId]) {
    await SHOW[spId]({ u, sp, cx, cy, x, y, cells, E });
  } else if (sp.style && STYLE[sp.style]) {
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

// =====================================================================
// 高清法术演出（OPT.art !== 'pixel'）：快取的发光贴图 + 加色混合 + 平滑矢量
// 整段包在闭包里：内部工具函数（rgba、shade、poly…）不外泄成全局，免得盖掉其他档案的同名函数
const FXHD = (() => {
'use strict';
// =====================================================================
// m：每格粒子量倍率（大范围法术自动降低）；v：当前招式强度 0~1；q：自适应画质（掉帧时自动降低粒子量与次要光层）
const FXK = { m: 1, v: 0.4, q: 1 };
let FXQ_ema = 16.7, FXQ_hold = 0;
const TAU = Math.PI * 2;
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeBack = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const srand = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const RGB = new Map();
function hexRgb(h) {
  let v = RGB.get(h); if (v) return v;
  let x = String(h).replace('#', ''); if (x.length === 3) x = x.split('').map(c => c + c).join('');
  const n = parseInt(x.slice(0, 6), 16) || 0; v = [n >> 16 & 255, n >> 8 & 255, n & 255]; RGB.set(h, v); return v;
}
const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };
function shade(h, f) { const [r, g, b] = hexRgb(h), t = f > 0 ? 255 : 0, k = Math.abs(f); const m = c => Math.round(c + (t - c) * k); return `#${((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1)}`; }
const luma = h => { const [r, g, b] = hexRgb(h); return r * 0.3 + g * 0.59 + b * 0.11; };

// ---------- 贴图快取（每种颜色只画一次） ----------
const SPRC = new Map();
function mkSpr(key, w, h, fn) {
  let c = SPRC.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  try { fn(g, w, h); } catch (e) { console.warn('spellfx sprite', key, e); }
  c.crisp = /^(fl|fr|sw|fu|cr|ic|sk)/.test(key); c.key = key;
  SPRC.set(key, c); return c;
}
function radial(g, x, y, r, stops, sx, sy) {
  g.save(); g.translate(x, y); g.scale(sx || 1, sy || 1);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r); for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
}
function poly(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
const SP = {
  glow: col => mkSpr('gl' + col, 64, 64, g => radial(g, 32, 32, 32, [[0, rgba(col, 1)], [0.22, rgba(col, 0.62)], [0.5, rgba(col, 0.2)], [1, rgba(col, 0)]])),
  core: col => mkSpr('co' + col, 64, 64, g => radial(g, 32, 32, 32, [[0, 'rgba(255,255,255,1)'], [0.14, 'rgba(255,255,255,0.95)'], [0.3, rgba(col, 0.85)], [0.6, rgba(col, 0.25)], [1, rgba(col, 0)]])),
  flare: col => mkSpr('fl' + col, 64, 64, g => {
    g.globalCompositeOperation = 'lighter';
    const st = [[0, 'rgba(255,255,255,0.95)'], [0.25, rgba(col, 0.6)], [1, rgba(col, 0)]];
    radial(g, 32, 32, 32, st, 1, 0.08); radial(g, 32, 32, 32, st, 0.08, 1);
    radial(g, 32, 32, 13, [[0, '#ffffff'], [0.35, rgba(col, 0.75)], [1, rgba(col, 0)]]);
  }),
  flame: i => mkSpr('fm' + i, 48, 64, g => {
    g.globalCompositeOperation = 'lighter';
    const C = [['#ffffff', '#ffe070', '#ff9020'], ['#fff0a0', '#ff8a20', '#d02808'], ['#ff9a40', '#c02808', '#400800']][i];
    for (let k = 0; k < 6; k++) radial(g, 24, 46 - k * 7, 17 - k * 2.5, [[0, rgba(C[0], 0.5)], [0.45, rgba(C[1], 0.34)], [1, rgba(C[2], 0)]]);
  }),
  smoke: col => mkSpr('sm' + col, 64, 64, g => { for (const [x, y, r] of [[32, 35, 27], [21, 28, 16], [43, 26, 17], [31, 21, 14]]) radial(g, x, y, r, [[0, rgba(col, 0.4)], [0.6, rgba(col, 0.18)], [1, rgba(col, 0)]]); }),
  shard: col => mkSpr('sh' + col, 64, 20, g => {
    const gr = g.createLinearGradient(0, 2, 0, 18); gr.addColorStop(0, 'rgba(255,255,255,0.97)'); gr.addColorStop(0.5, rgba(col, 0.92)); gr.addColorStop(1, rgba(shade(col, -0.45), 0.92));
    g.fillStyle = gr; poly(g, [[1, 10], [14, 3], [52, 4], [63, 10], [52, 16], [14, 17]]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(14, 3.6); g.lineTo(52, 4.6); g.lineTo(63, 10); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(2, 10); g.lineTo(62, 10); g.stroke();
  }),
  rock: (col, i) => mkSpr('rk' + col + i, 32, 32, g => {
    const R = srand(11 + i * 97), pts = [];
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + R() * 0.45, r = 9.5 + R() * 5.5; pts.push([16 + Math.cos(a) * r, 16 + Math.sin(a) * r]); }
    const gr = g.createLinearGradient(5, 4, 26, 28); gr.addColorStop(0, shade(col, 0.45)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.6));
    g.fillStyle = gr; poly(g, pts); g.fill(); g.strokeStyle = rgba(shade(col, -0.78), 0.95); g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
    g.strokeStyle = rgba(shade(col, 0.65), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(pts[3][0], pts[3][1]); g.lineTo(15, 15); g.lineTo(pts[7][0], pts[7][1]); g.stroke();
  }),
  spike: col => mkSpr('sk' + col, 32, 64, g => {
    const gr = g.createLinearGradient(2, 0, 30, 0); gr.addColorStop(0, shade(col, 0.4)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.6));
    g.fillStyle = gr; poly(g, [[2, 64], [8, 32], [12, 35], [16, 2], [21, 26], [24, 23], [30, 64]]); g.fill();
    g.strokeStyle = rgba(shade(col, -0.8), 0.9); g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
    g.strokeStyle = rgba(shade(col, 0.7), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(16, 4); g.lineTo(14, 40); g.lineTo(17, 62); g.stroke();
  }),
  feather: col => mkSpr('fe' + col, 64, 20, g => {
    const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, 'rgba(255,255,255,0.98)'); gr.addColorStop(1, rgba(col, 0.9));
    g.fillStyle = gr; g.beginPath(); g.moveTo(4, 10); g.quadraticCurveTo(30, -1, 63, 9); g.quadraticCurveTo(30, 19, 4, 10); g.fill();
    g.strokeStyle = rgba(shade(col, -0.3), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(1, 10.2); g.lineTo(60, 9.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; for (let k = 0; k < 6; k++) { const x = 14 + k * 8; g.beginPath(); g.moveTo(x, 9.8); g.lineTo(x + 5, 4.5); g.moveTo(x, 9.8); g.lineTo(x + 5, 15); g.stroke(); }
  }),
  petal: col => mkSpr('pe' + col, 24, 24, g => { radial(g, 12, 12, 11, [[0, 'rgba(255,255,255,0.98)'], [0.5, rgba(col, 0.95)], [0.9, rgba(shade(col, -0.2), 0.85)], [1, rgba(col, 0)]], 1, 0.5); }),
  leaf: col => mkSpr('le' + col, 24, 24, g => {
    const gr = g.createLinearGradient(2, 12, 22, 12); gr.addColorStop(0, shade(col, 0.35)); gr.addColorStop(1, shade(col, -0.35));
    g.fillStyle = gr; g.beginPath(); g.moveTo(2, 12); g.quadraticCurveTo(12, 1, 22, 12); g.quadraticCurveTo(12, 23, 2, 12); g.fill();
    g.strokeStyle = rgba(shade(col, -0.5), 0.8); g.lineWidth = 1; g.beginPath(); g.moveTo(2, 12); g.lineTo(21, 12); g.stroke();
  }),
  ring: col => mkSpr('ri' + col, 128, 128, g => radial(g, 64, 64, 64, [[0, rgba(col, 0)], [0.7, rgba(col, 0)], [0.84, rgba(col, 0.35)], [0.93, 'rgba(255,255,255,0.92)'], [0.965, rgba(col, 0.6)], [1, rgba(col, 0)]])),
  blade: col => mkSpr('bl' + col, 64, 64, g => {
    const gr = g.createLinearGradient(6, 0, 58, 0); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.5, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, rgba(col, 0.2));
    g.fillStyle = gr; g.beginPath(); g.arc(32, 44, 28, Math.PI * 1.08, Math.PI * 1.92); g.arc(32, 52, 25, Math.PI * 1.9, Math.PI * 1.1, true); g.closePath(); g.fill();
  }),
  burst: col => mkSpr('sb' + col, 256, 256, g => {
    g.globalCompositeOperation = 'lighter'; g.translate(128, 128);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, w = k % 2 ? 0.035 : 0.07, gr = g.createRadialGradient(0, 0, 0, 0, 0, 128);
      gr.addColorStop(0, rgba(col, 0.75)); gr.addColorStop(0.5, rgba(col, 0.22)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - w) * 128, Math.sin(a - w) * 128); g.lineTo(Math.cos(a + w) * 128, Math.sin(a + w) * 128); g.fill();
    }
    radial(g, 0, 0, 44, [[0, 'rgba(255,255,255,0.8)'], [0.4, rgba(col, 0.4)], [1, rgba(col, 0)]]);
  }),
  cross: col => mkSpr('cr' + col, 128, 128, g => {
    g.globalCompositeOperation = 'lighter';
    const st = [[0, 'rgba(255,255,255,1)'], [0.3, rgba(col, 0.75)], [1, rgba(col, 0)]];
    radial(g, 64, 64, 64, st, 0.075, 1); radial(g, 64, 50, 42, st, 1, 0.075);
    radial(g, 64, 50, 18, [[0, 'rgba(255,255,255,1)'], [0.4, rgba(col, 0.6)], [1, rgba(col, 0)]]);
  }),
  void: () => mkSpr('void', 64, 64, g => radial(g, 32, 32, 32, [[0, 'rgba(2,0,8,0.96)'], [0.45, 'rgba(16,0,34,0.88)'], [0.75, 'rgba(70,16,120,0.35)'], [1, 'rgba(70,16,120,0)']])),
  bubble: col => mkSpr('bu' + col, 32, 32, g => {
    radial(g, 16, 16, 14, [[0, rgba(col, 0.08)], [0.8, rgba(col, 0.3)], [1, rgba(col, 0.5)]]);
    g.strokeStyle = rgba(shade(col, 0.3), 0.95); g.lineWidth = 1.6; g.beginPath(); g.arc(16, 16, 13, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 9, 3.6, 4.6); g.stroke();
  }),
  frost: col => mkSpr('fr' + col, 128, 128, g => {
    g.globalCompositeOperation = 'lighter'; radial(g, 64, 64, 64, [[0, rgba(col, 0.4)], [0.6, rgba(col, 0.12)], [1, rgba(col, 0)]]);
    g.translate(64, 64); g.lineCap = 'round';
    for (const [lw, st] of [[5, rgba(col, 0.45)], [2.2, rgba(col, 0.95)], [1, 'rgba(255,255,255,0.95)']]) {
      g.lineWidth = lw; g.strokeStyle = st; g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU, ca = Math.cos(a), sa = Math.sin(a);
        g.moveTo(0, 0); g.lineTo(ca * 58, sa * 58);
        for (const [d, l] of [[24, 13], [40, 9]]) for (const s of [-0.6, 0.6]) { g.moveTo(ca * d, sa * d); g.lineTo(ca * d + Math.cos(a + s) * l, sa * d + Math.sin(a + s) * l); }
      }
      g.stroke();
    }
  }),
  // 锥形光痕：亮端在右（left = true 时亮端在左）
  streak: (col, left) => mkSpr('st' + (col || '') + (left ? 'L' : ''), 256, 12, g => {
    const c = col || '#ffffff';
    if (left) { g.translate(256, 0); g.scale(-1, 1); }
    const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.75, rgba(c, 0.7)); gr.addColorStop(1, rgba(shade(c, 0.6), 1));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 6); g.lineTo(250, 1); g.quadraticCurveTo(256, 6, 250, 11); g.closePath(); g.fill();
  }),
  pillar: col => mkSpr('pi' + col, 64, 256, g => {
    const gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.28, rgba(col, 0.3)); gr.addColorStop(0.5, rgba(col, 0.95)); gr.addColorStop(0.72, rgba(col, 0.3)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.35, 'rgba(0,0,0,0.55)'); v.addColorStop(0.9, 'rgba(0,0,0,1)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = v; g.fillRect(0, 0, 64, 256);
  }),
  icicle: col => mkSpr('ic' + col, 24, 64, g => {
    const gr = g.createLinearGradient(3, 0, 21, 0); gr.addColorStop(0, 'rgba(255,255,255,0.97)'); gr.addColorStop(0.45, rgba(col, 0.92)); gr.addColorStop(1, rgba(shade(col, -0.5), 0.92));
    g.fillStyle = gr; poly(g, [[12, 0], [20, 38], [17, 64], [7, 64], [4, 38]]); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(12, 1); g.lineTo(5, 38); g.lineTo(8, 63); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(12, 1); g.lineTo(12, 63); g.stroke();
  }),
  swirl: col => mkSpr('sw' + col, 128, 128, g => {
    g.globalCompositeOperation = 'lighter'; g.translate(64, 64); g.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a0 = k / 4 * TAU;
      for (let t = 0; t < 1; t += 0.035) {
        const p = q => [Math.cos(a0 + q * 4.4) * (4 + 58 * q), Math.sin(a0 + q * 4.4) * (4 + 58 * q)], [x0, y0] = p(t), [x1, y1] = p(t + 0.04);
        g.strokeStyle = rgba(t < 0.12 ? '#f0d0ff' : col, 0.7 * Math.pow(1 - t, 1.4)); g.lineWidth = 1.2 + 4.5 * Math.sin(Math.PI * Math.min(1, t * 1.3));
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
    }
  }),
  funnel: col => mkSpr('fu2' + col, 64, 128, g => {
    // 龙卷：渐层锥体 + 几道不完整的旋风弧线（避免像弹簧）
    g.globalCompositeOperation = 'lighter';
    const v = g.createLinearGradient(0, 0, 0, 128); v.addColorStop(0, rgba(col, 0)); v.addColorStop(0.3, rgba(col, 0.42)); v.addColorStop(0.85, rgba(col, 0.3)); v.addColorStop(1, rgba(col, 0));
    g.fillStyle = v; g.beginPath(); g.moveTo(2, 4); g.quadraticCurveTo(26, 70, 28, 126); g.lineTo(36, 126); g.quadraticCurveTo(38, 70, 62, 4); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-in'; // 锥体左右边缘柔化
    const hm = g.createLinearGradient(0, 0, 64, 0); hm.addColorStop(0, 'rgba(0,0,0,0)'); hm.addColorStop(0.5, 'rgba(0,0,0,1)'); hm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = hm; g.fillRect(0, 0, 64, 128); g.globalCompositeOperation = 'lighter';
    const R = srand(col.length * 13 + 5);
    for (let k = 0; k < 6; k++) {
      const y = 112 - k * 19 + R() * 6, rx = 6 + (112 - y) * 0.24, ry = rx * 0.3, a0 = R() * 6;
      const al = 0.25 + 0.5 * Math.sin(Math.PI * (k + 0.5) / 6);
      for (const [lw, st] of [[3.5, rgba(col, 0.3 * al)], [1.5, rgba(col, 0.85 * al)], [0.7, `rgba(255,255,255,${0.8 * al})`]]) { g.lineWidth = lw; g.strokeStyle = st; g.beginPath(); g.ellipse(32, y, rx, ry, 0, a0, a0 + 2.4); g.stroke(); }
    }
  }),
  vignette: () => mkSpr('vig', 256, 256, g => {
    const gr = g.createRadialGradient(128, 128, 40, 128, 128, 182); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.9)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }),
};
// 魔法阵：外圈（双环 + 符文环 + 元素图样）与内圈（反向旋转）各自预先画好
const CIRCLE_PAT = { fire: 'star6', ice: 'snow', bolt: 'star5', wind: 'spiral', rock: 'square', dark: 'star5i', holy: 'cross', heal: 'petal', buff: 'star6', acid: 'star5', slash: 'star6', beam: 'star6', summon: 'sigil' };
function runeCircle(col, pat, inner) {
  return mkSpr(`rc|${col}|${pat}|${inner ? 1 : 0}`, 320, 320, g => {
    g.translate(160, 160); g.lineCap = 'round'; g.lineJoin = 'round';
    const R = srand(7 + pat.length * 31 + (inner ? 5 : 0));
    const pass = (fn, k) => {
      k = k || 1;
      g.strokeStyle = rgba(col, 0.26); g.lineWidth = 8 * k; fn();
      g.strokeStyle = rgba(col, 0.95); g.lineWidth = 2.6 * k; fn();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1 * k; fn();
    };
    const circ = r => { g.moveTo(r, 0); g.arc(0, 0, r, 0, TAU); };
    const star = (n, step, r, rot) => { for (let i = 0; i <= n; i++) { const a = rot + (i * step % n) / n * TAU; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } };
    const pattern = r => {
      if (pat === 'star6') { star(3, 1, r, -Math.PI / 2); star(3, 1, r, Math.PI / 2); }
      else if (pat === 'star5') star(5, 2, r, -Math.PI / 2);
      else if (pat === 'star5i') star(5, 2, r, Math.PI / 2);
      else if (pat === 'sigil') star(7, 3, r, -Math.PI / 2);
      else if (pat === 'square') { star(4, 1, r, 0); star(4, 1, r, Math.PI / 4); }
      else if (pat === 'snow') for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); for (const s of [-0.5, 0.5]) { g.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); g.lineTo(Math.cos(a) * r * 0.55 + Math.cos(a + s) * r * 0.3, Math.sin(a) * r * 0.55 + Math.sin(a + s) * r * 0.3); } }
      else if (pat === 'cross') { for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } star(4, 1, r * 0.62, Math.PI / 4); for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; g.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); g.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); } }
      else if (pat === 'petal') for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, mx = Math.cos(a) * r * 0.5, my = Math.sin(a) * r * 0.5; g.moveTo(mx + r * 0.5, my); g.arc(mx, my, r * 0.5, 0, TAU); }
      else if (pat === 'spiral') for (let k = 0; k < 3; k++) { const a0 = k / 3 * TAU; g.moveTo(0, 0); for (let t = 0; t <= 1.001; t += 0.05) g.lineTo(Math.cos(a0 + t * 3.4) * r * t, Math.sin(a0 + t * 3.4) * r * t); }
    };
    if (!inner) {
      g.beginPath(); circ(152); circ(142); circ(112); pass(() => g.stroke());
      // 外缘刻度
      g.beginPath(); for (let k = 0; k < 48; k++) { const a = k / 48 * TAU, l = k % 4 ? 4 : 9; g.moveTo(Math.cos(a) * 152, Math.sin(a) * 152); g.lineTo(Math.cos(a) * (152 + l), Math.sin(a) * (152 + l)); }
      g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.6; g.stroke();
      // 符文环：每个符文由 2~3 笔随机笔画组成
      g.beginPath();
      for (let k = 0; k < 28; k++) {
        const a = k / 28 * TAU; g.save(); g.rotate(a); g.translate(127, 0); g.rotate(Math.PI / 2);
        const n = 2 + (R() * 2 | 0);
        for (let j = 0; j < n; j++) {
          const t = R() * 6 | 0;
          if (t === 0) { g.moveTo(-5, -6); g.lineTo(-5, 6); } else if (t === 1) { g.moveTo(-5, -5); g.lineTo(5, 5); }
          else if (t === 2) { g.moveTo(5, -6); g.lineTo(-1, 0); g.lineTo(5, 6); } else if (t === 3) { g.moveTo(-6, 0); g.lineTo(6, 0); }
          else if (t === 4) { g.moveTo(4, 0); g.arc(0, 0, 4, 0, Math.PI); } else { g.moveTo(1, -6); g.lineTo(1, 6); g.moveTo(1, -2); g.lineTo(6, -6); }
        }
        g.restore();
      }
      pass(() => g.stroke(), 0.7);
      g.beginPath(); pattern(112); pass(() => g.stroke());
    } else {
      g.beginPath(); circ(74); circ(56); pass(() => g.stroke());
      g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.moveTo(Math.cos(a) * 65 + 3, Math.sin(a) * 65); g.arc(Math.cos(a) * 65, Math.sin(a) * 65, 3, 0, TAU); } pass(() => g.stroke(), 0.7);
      g.beginPath(); pattern(56); pass(() => g.stroke(), 0.8);
      g.beginPath(); circ(16); pass(() => g.stroke());
      radial(g, 0, 0, 40, [[0, 'rgba(255,255,255,0.5)'], [0.5, rgba(col, 0.25)], [1, rgba(col, 0)]]);
    }
  });
}

// ---------- 高清演出的建构函数 ----------
function burst(img, x, y, o) {
  PFX.bursts.push(Object.assign({ img, x, y, r0: 0.2, r1: 1, fy: 1, a: 1, rot: 0, spin: 0, add: true, fin: 0.12, mode: 'out', ay: 0.5, asp: 1 }, o, { t0: now0() + T((o && o.delay) || 0), dur: T((o && o.dur) || 400) }));
}
const ring = (x, y, r0, r1, color, dur, o) => PFX.rings.push(Object.assign({ x, y, r0, r1, color, t0: now0() + T((o && o.delay) || 0), dur: T(dur) }, o));
// 泛光：每次命中加一层大而柔的加色光晕
const bloom = (x, y, col, k, o) => { if ((FXK.m < 0.95 && Math.random() > FXK.m * 1.3) || FXK.q < 0.7) return; burst(SP.glow(col), x, y, Object.assign({ r0: 0.5, r1: 1.7 * (k || 1), a: 0.5, dur: 520, fin: 0.06 }, o)); };
function hitSparkHD(x, y, cols) {
  cols = cols || ELEM.slash.cols;
  emit(10, x, y, { speed: [2, 4.6], life: [0.16, 0.34], size: [0.03, 0.05], cols, drag: 0.72, shape: 'spark' });
  burst(SP.core(cols[2] || cols[0]), x, y, { r0: 0.12, r1: 0.5, a: 0.8, dur: 200, fin: 0.05 });
  burst(SP.flare(cols[1] || cols[0]), x, y, { r0: 0.4, r1: 0.9, a: 0.8, dur: 220, fin: 0.05, rot: rand(-0.4, 0.4) });
}
const IMPACT_HD = {
  fire(x, y, big, v) {
    v = v ?? FXK.v; const k = big ? 1.35 : 1;
    burst(SP.core('#ffa030'), x, y, { r0: 0.25, r1: 1.15 * k, dur: 380, fin: 0.05 });
    bloom(x, y, '#ff6a10', k);
    burst(SP.burst('#ff9a30'), x, y, { r0: 0.3, r1: 1.2 * k, a: 0.55, spin: 1.5, rot: rand(0, 1), dur: 420, fin: 0.05 });
    burst(SP.glow('#ff5a10'), x, y + TS * 0.3, { r0: 0.5, r1: 1.4 * k, fy: 0.45, a: 0.75, dur: 700 });
    emit(10 * k, x, y + TS * 0.15, { speed: [0, 0], life: [0.5, 0.85], size: [0.15, 0.24], cols: ['#fff'], swirl: 6, cx: x, cy: y + TS * 0.15, vy: -1.6, jitter: 0.38, shape: 'flame' });
    emit(8 * k, x, y, { speed: [0.5, 1.8], life: [0.4, 0.75], size: [0.13, 0.22], cols: ['#fff'], gravity: -2.4, drag: 0.82, shape: 'flame' });
    emit(16 * k, x, y, { speed: [1.8, 4.4], life: [0.45, 1.0], size: [0.025, 0.045], cols: ['#ffe080', '#ffb040', '#ff7a1a'], gravity: 1.8, drag: 0.9, shape: 'ember' });
    emit(2, x, y - TS * 0.1, { speed: [0.2, 0.5], life: [0.8, 1.2], size: [0.22, 0.32], cols: ['#5a4840'], gravity: -0.8, shape: 'smoke', delay: 0.22 });
    ring(x, y, 0.1, big ? 1.4 : 0.95, '#ff8a30', 420);
  },
  ice(x, y, big, v) {
    const k = big ? 1.3 : 1;
    burst(SP.frost('#8ad8ff'), x, y + TS * 0.28, { r0: 0.3, r1: 1.35 * k, fy: 0.5, dur: 820, spin: 0.9, rot: rand(0, 1), fin: 0.06 });
    burst(SP.core('#9ae0ff'), x, y, { r0: 0.15, r1: 1.0 * k, dur: 320, fin: 0.05 });
    bloom(x, y, '#5ab8ff', k, { a: 0.45 });
    for (let j = 0; j < (big ? 6 : 4); j++) { const a = j / (big ? 6 : 4) * TAU + rand(-0.3, 0.3), r = rand(0.18, 0.42); burst(SP.icicle(pick(['#9ae0ff', '#c8f0ff', '#7ac8f8'])), x + Math.cos(a) * r * TS, y + TS * 0.32 + Math.sin(a) * r * TS * 0.4, { r0: 0, r1: rand(0.32, 0.5) * k, asp: 0.38, ay: 1, mode: 'grow', add: false, rot: Math.cos(a) * 0.35, dur: 620, fin: 0.02, delay: j * 25 }); }
    emit(7 * k, x, y + TS * 0.3, { angle: -Math.PI / 2, spread: 0.75, speed: [2.2, 3.6], life: [0.45, 0.75], size: [0.08, 0.13], cols: ['#e8f8ff', '#9ae0ff', '#6ab8f0'], drag: 0.6, shape: 'shard' });
    emit(10 * k, x, y, { speed: [1.6, 3.6], life: [0.35, 0.7], size: [0.05, 0.09], cols: ELEM.ice.cols, drag: 0.78, shape: 'shard' });
    emit(12, x, y, { speed: [0.2, 0.8], life: [0.6, 1.1], size: [0.05, 0.09], cols: ['#ffffff', '#c8f0ff'], gravity: 0.4, shape: 'star', jitter: 0.45 });
    emit(3, x, y + TS * 0.2, { speed: [0.1, 0.4], life: [0.7, 1.1], size: [0.25, 0.35], cols: ['#d8f4ff'], gravity: -0.3, shape: 'mist' });
    ring(x, y, 0.2, big ? 1.3 : 0.9, '#9ae0ff', 500, { flat: true });
  },
  bolt(x, y, big, v) {
    v = v ?? FXK.v; const n = big ? (FXK.m < 0.8 ? 2 : 3) : v > 0.55 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      PFX.bolts.push({ x: x + (k ? rand(-0.4, 0.4) * TS : 0), y, color: '#fff6a0', t0: now0() + T(k * 110), dur: T(420) });
      burst(SP.core('#c8d8ff'), x, y, { r0: 0.3, r1: FXK.m < 0.8 ? 0.7 : 1.1, a: FXK.m < 0.8 ? 0.7 : 1, dur: 240, fin: 0.04, delay: k * 110 });
    }
    burst(SP.glow('#7a9aff'), x, y + TS * 0.3, { r0: 0.6, r1: 1.7, fy: 0.42, a: 0.4 + 0.45 * FXK.m, dur: 700, fin: 0.05 }); // 余辉
    for (let k = 0; k < (FXK.m < 0.7 ? 1 : 3); k++) { const a = rand(0, TAU), r = TS * rand(0.35, 0.6); PFX.bolts.push({ x0: x + Math.cos(a) * r * 0.3, y0: y + Math.sin(a) * r * 0.3, x1: x + Math.cos(a) * r, y1: y + Math.sin(a) * r, small: true, color: '#e0e8ff', t0: now0() + T(60 + k * 70), dur: T(220) }); }
    emit(14, x, y, { speed: [2, 5], life: [0.2, 0.45], size: [0.025, 0.045], cols: ['#ffffff', '#fff6a0', '#a0c8ff'], drag: 0.75, shape: 'spark' });
    ring(x, y, 0.1, 1.0, '#c8d8ff', 320);
  },
  wind(x, y, big, v) {
    const k = big ? 1.3 : 1;
    burst(SP.funnel('#7ae8b0'), x, y + TS * 0.45, { r0: 0.6, r1: 1.4 * k, asp: 0.55, ay: 1, mode: 'pulse', a: 0.5 + 0.5 * FXK.m, dur: 820 });
    if (FXK.m > 0.6) burst(SP.funnel('#e8fff4'), x, y + TS * 0.45, { r0: 0.4, r1: 1.15 * k, asp: 0.45, ay: 1, mode: 'pulse', a: 0.6, rot: 0.12, dur: 760, delay: 60 });
    bloom(x, y, '#5ad8a0', k, { a: 0.35 });
    emit(7 * k, x, y, { speed: [0, 0], life: [0.6, 0.95], size: [0.18, 0.26], cols: ['#d8fff0', '#8ae8c0'], swirl: 8, cx: x, cy: y, vy: -1.3, jitter: 0.6, shape: 'blade', spin: 0.01, delay: 0.1 });
    emit(6 * k, x, y, { speed: [0, 0], life: [0.7, 1.1], size: [0.07, 0.1], cols: ['#7ad070', '#a8e060', '#5ab858'], swirl: 6.5, cx: x, cy: y, vy: -1.1, jitter: 0.7, shape: 'leaf', spin: 9, delay: 0.12 });
    emit(22 * k, x, y, { speed: [0, 0], life: [0.6, 1.0], size: [0.04, 0.07], cols: ELEM.wind.cols, swirl: 7, cx: x, cy: y, vy: -1.6, jitter: 0.55, shape: 'circle', delay: 0.15 });
    for (let j = 0; j < 3; j++) ring(x, y + TS * (0.35 - j * 0.32), 0.35 + j * 0.15, 0.75 + j * 0.2, '#b8f8e0', 520, { flat: true, delay: j * 90 });
  },
  rock(x, y, big, v) {
    // 落石（附火尾）→ 落地后：岩刺破土、碎石、尘烟、震波
    const nr = big ? 4 : 2;
    for (let k = 0; k < nr; k++) {
      const ox = x + rand(-0.3, 0.3) * TS, d = rand(0, 0.2);
      emit(1, ox + TS * 0.8, y - TS * 3.2, { speed: [0, 0], vx: -2.2, vy: 7, life: [0.42, 0.46], size: [0.18, 0.26], cols: ['#a07040', '#8a6040'], shape: 'rock', spin: 6, delay: 0.2 });
      emit(6, ox + TS * 0.8, y - TS * 3.2, { speed: [0, 0.3], vx: -2.1, vy: 6.6, life: [0.3, 0.46], size: [0.1, 0.16], cols: ['#fff'], shape: 'flame', delay: 0.22, jitter: 0.1 });
    }
    setTimeout(() => {
      if (!HDFX()) return;
      burst(SP.core('#ffc080'), x, y, { r0: 0.2, r1: 1.0, dur: 280, fin: 0.05 }); bloom(x, y, '#e0a050', big ? 1.2 : 1, { a: 0.4 });
      for (let k = 0; k < (big ? 4 : 3); k++) burst(SP.spike(pick(['#b08a5a', '#a07a4a', '#c09a6a'])), x + rand(-0.38, 0.38) * TS, y + TS * rand(0.3, 0.45), { r0: 0, r1: rand(0.42, 0.62), asp: 0.5, ay: 1, mode: 'grow', add: false, dur: 520, fin: 0.02, delay: k * 35 });
      emit(16 * (big ? 1.3 : 1), x, y + TS * 0.2, { angle: -Math.PI / 2, spread: 1.2, speed: [1.2, 3.2], life: [0.45, 0.85], size: [0.05, 0.1], cols: ELEM.rock.cols, gravity: 6, drag: 0.92, shape: 'rock', spin: 8 });
      emit(4, x, y + TS * 0.3, { speed: [0.4, 1], life: [0.7, 1.1], size: [0.26, 0.4], cols: ['#a08868', '#8a7458'], gravity: -0.4, drag: 0.85, shape: 'smoke' });
      ring(x, y + TS * 0.2, 0.2, 1.2, '#e0c090', 450, { flat: true });
    }, T(380));
  },
  dark(x, y, big, v) {
    const k = big ? 1.3 : 1;
    burst(SP.glow('#8a30e0'), x, y, { r0: 0.4, r1: 1.5 * k, mode: 'pulse', a: 0.45, dur: 760 });
    if (FXK.m >= 0.8 || Math.random() < 0.35) { // 大范围时只在部分格子放虚空漩涡，避免糊成一片
      burst(SP.void(), x, y, { r0: 0.1, r1: 0.8 * k, add: false, mode: 'pulse', dur: 760, rot: 0, spin: 2 });
      burst(SP.swirl('#9040e0'), x, y, { r0: 0.3, r1: 1.0 * k, mode: 'pulse', a: 0.75, spin: -7, rot: rand(0, 6), dur: 760, fy: 0.75 });
    }
    emit(26 * k, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.04, 0.08], cols: ELEM.dark.cols, swirl: -6, cx: x, cy: y, jitter: 0.95, shape: 'circle' });
    emit(5 * k, x, y, { speed: [0, 0], life: [0.7, 1.1], size: [0.26, 0.4], cols: ['#2a0a4a', '#4a1478'], swirl: -4, cx: x, cy: y, jitter: 0.7, shape: 'smoke' });
    ring(x, y, 1.3, 0.1, '#b050ff', 700);
    burst(SP.core('#d080ff'), x, y, { r0: 0.1, r1: 1.1 * k, dur: 320, fin: 0.05, delay: 480 }); bloom(x, y, '#a040ff', k, { delay: 480, a: 0.4 });
    setTimeout(() => HDFX() && emit(12, x, y, { speed: [2, 4.5], life: [0.25, 0.5], size: [0.025, 0.045], cols: ['#f0c0ff', '#c070ff'], drag: 0.78, shape: 'spark' }), T(480));
  },
  holy(x, y, big, v) {
    const k = big ? 1.3 : 1;
    PFX.pillars.push({ x, y: y + TS * 0.3, w: big ? 0.7 : 0.5, color: '#fff2a0', t0: now0(), dur: T(700) });
    burst(SP.cross('#ffe880'), x, y - TS * 0.05, { r0: 0.4, r1: 1.3 * k, dur: 720, fin: 0.08 }); bloom(x, y, '#ffd860', k, { a: 0.45 });
    burst(SP.burst('#fff0a0'), x, y, { r0: 0.4, r1: 1.25 * k, a: 0.6, spin: 0.7, rot: rand(0, 1), dur: 700 });
    emit(4 * k, x, y - TS * 1.1, { speed: [0.1, 0.4], life: [0.8, 1.2], size: [0.1, 0.13], cols: ['#fff8e0', '#ffe8a0'], gravity: 0.5, drag: 0.6, shape: 'feather', spin: 3, sway: 1.2, jitter: 0.5 });
    emit(16, x, y, { speed: [0.2, 1], life: [0.6, 1.1], size: [0.05, 0.1], cols: ELEM.holy.cols, gravity: -1.2, shape: 'star', jitter: 0.4 });
    ring(x, y + TS * 0.3, 0.2, big ? 1.2 : 0.85, '#ffe880', 560, { flat: true });
  },
  heal(x, y) {
    PFX.pillars.push({ x, y: y + TS * 0.35, w: 0.55, color: '#7af0a0', t0: now0(), dur: T(700) });
    PFX.circles.push({ x, y: y + TS * 0.34, r: 0.55, color: '#7af0a0', el: 'heal', t0: now0(), dur: T(760) });
    burst(SP.flare('#c8ffd8'), x, y - TS * 0.1, { r0: 0.4, r1: 1.0, dur: 500, fin: 0.15, delay: 120 });
    burst(SP.glow('#7af0a0'), x, y + TS * 0.32, { r0: 0.5, r1: 0.95, fy: 0.42, a: 0.8, dur: 700 }); bloom(x, y, '#4ae07a', 0.75, { a: 0.35, dur: 700 });
    emit(16, x, y + TS * 0.3, { speed: [0.05, 0.3], life: [0.7, 1.2], size: [0.04, 0.08], cols: ELEM.heal.cols, gravity: -1.4, shape: 'circle', jitter: 0.45, sway: 0.6 });
    emit(6, x, y + TS * 0.25, { speed: [0.05, 0.25], life: [0.8, 1.2], size: [0.06, 0.09], cols: ['#ffc8e0', '#ffffff', '#ffe0f0'], gravity: -0.9, shape: 'petal', spin: 5, sway: 1.4, jitter: 0.45 });
    emit(8, x, y + TS * 0.2, { speed: [0.05, 0.2], life: [0.6, 1], size: [0.05, 0.08], cols: ['#ffffff', '#d0ffe0'], gravity: -1.2, shape: 'star', jitter: 0.4 });
    ring(x, y + TS * 0.35, 0.3, 0.75, '#9affb8', 520, { flat: true });
  },
  buff(x, y) {
    for (let k = 0; k < 3; k++) ring(x, y + TS * (0.35 - k * 0.3), 0.45, 0.55, '#ffd060', 520, { flat: true, delay: k * 140 });
    PFX.pillars.push({ x, y: y + TS * 0.35, w: 0.42, color: '#ffd060', t0: now0(), dur: T(650), h: 2.2 });
    PFX.circles.push({ x, y: y + TS * 0.34, r: 0.55, color: '#ffd060', el: 'buff', t0: now0(), dur: T(700) });
    burst(SP.glow('#ffd060'), x, y, { r0: 0.4, r1: 0.9, mode: 'pulse', a: 0.6, dur: 650 });
    emit(18, x, y + TS * 0.3, { speed: [0, 0], life: [0.6, 0.95], size: [0.04, 0.07], cols: ELEM.buff.cols, swirl: 7, cx: x, cy: y + TS * 0.3, vy: -1.8, jitter: 0.5, shape: 'star' });
    emit(8, x, y + TS * 0.3, { speed: [0.05, 0.2], life: [0.6, 1], size: [0.03, 0.05], cols: ['#ffffff', '#ffe08a'], gravity: -1.8, shape: 'spark', jitter: 0.4 });
  },
  acid(x, y) {
    emit(10, x, y, { speed: [0.3, 1.2], life: [0.6, 1.1], size: [0.06, 0.12], cols: ['#c8ff4a', '#9ae040'], gravity: -0.7, drag: 0.8, shape: 'bubble', jitter: 0.35, sway: 0.5 });
    emit(4, x, y + TS * 0.1, { speed: [0.2, 0.5], life: [0.8, 1.2], size: [0.24, 0.36], cols: ['#4a8a20', '#6a3a90'], gravity: -0.4, shape: 'smoke', jitter: 0.25 });
    emit(14, x, y, { speed: [0.3, 1.4], life: [0.5, 1], size: [0.04, 0.08], cols: ELEM.acid.cols, gravity: -0.6, drag: 0.8, shape: 'circle', jitter: 0.3 });
    burst(SP.glow('#9aff4a'), x, y + TS * 0.3, { r0: 0.4, r1: 1.0, fy: 0.45, a: 0.7, dur: 600 }); bloom(x, y, '#7ad020', 0.8, { a: 0.35 });
    ring(x, y + TS * 0.3, 0.2, 0.8, '#b8ff6a', 480, { flat: true });
  },
  slash(x, y) {
    emit(12, x, y, { speed: [2, 4.6], life: [0.18, 0.4], size: [0.03, 0.05], cols: ELEM.slash.cols, drag: 0.72, shape: 'spark' });
    burst(SP.core('#c8dcff'), x, y, { r0: 0.12, r1: 0.55, a: 0.7, dur: 220, fin: 0.05 });
    burst(SP.flare('#c8dcff'), x, y, { r0: 0.5, r1: 1.1, a: 0.8, dur: 260, fin: 0.05, rot: rand(-0.5, 0.5) });
  },
};
IMPACT_HD.beam = IMPACT_HD.fire;
IMPACT_HD.summon = (x, y, big) => {
  PFX.pillars.push({ x, y: y + TS * 0.3, w: 0.6, color: '#d8c0ff', t0: now0(), dur: T(700) });
  burst(SP.burst('#c8a8ff'), x, y, { r0: 0.4, r1: 1.4, a: 0.7, spin: 0.8, dur: 700 });
  emit(18, x, y, { speed: [0.2, 1], life: [0.6, 1.1], size: [0.05, 0.1], cols: ELEM.summon.cols, gravity: -1.2, shape: 'star', jitter: 0.4 });
};

// ---------- 每帧绘制 ----------
const LIST_OVER = [], LIST_ADD = [], LIST_SOFT = [];
let BX = 0, BY = 0, SC = 1; // 当前绘制目标的偏移（镜头震动）与缩放（主画布 = DPR；柔光缓冲 = DPR/2）
function xform(g, x, y, ang, fy) { const c = Math.cos(ang) * SC, s = Math.sin(ang) * SC; fy = fy || 1; g.setTransform(c, s * fy, -s, c * fy, BX + x * SC, BY + y * SC); }
const resetX = g => g.setTransform(SC, 0, 0, SC, BX, BY);
// 柔光缓冲：大面积的光晕、光柱、冲击波与火焰画在半解析度画布上，最后一次加色贴回主画布（省 3/4 填充量）
let GB = null, GBG = null, GBK = 0.5;
function glowBuf() {
  const w = Math.ceil(cv.width * GBK), h = Math.ceil(cv.height * GBK);
  if (!GB) { GB = document.createElement('canvas'); GBG = GB.getContext('2d'); }
  if (GB.width !== w || GB.height !== h) { GB.width = w; GB.height = h; }
  GBG.setTransform(1, 0, 0, 1, 0, 0); GBG.clearRect(0, 0, w, h);
  GBG.imageSmoothingEnabled = true; GBG.imageSmoothingQuality = 'low'; GBG.globalCompositeOperation = 'lighter';
  return GBG;
}
const SOFT_SHAPES = { flame: 1, glow: 1, circle: 1, core: 1, sq: 1 };
function boltLine(x0, y0, x1, y1, disp, depth) {
  let pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], len = Math.hypot(bx - ax, by - ay) || 1, o = rand(-1, 1) * disp;
      np.push([(ax + bx) / 2 - (by - ay) / len * o, (ay + by) / 2 + (bx - ax) / len * o], [bx, by]);
    }
    pts = np; disp *= 0.55;
  }
  return pts;
}
function boltGeom(b) {
  const len = Math.hypot(b.x1 - b.x0, b.y1 - b.y0), main = boltLine(b.x0, b.y0, b.x1, b.y1, len * (b.small ? 0.25 : 0.14), b.small ? 3 : 5), segs = [main];
  if (!b.small) {
    const dir = Math.atan2(b.y1 - b.y0, b.x1 - b.x0);
    for (let k = 0, n = 2 + (Math.random() * 2 | 0); k < n; k++) {
      const [sx, sy] = main[(main.length * rand(0.15, 0.7)) | 0], a = dir + rand(0.35, 0.8) * (Math.random() < 0.5 ? -1 : 1), L = len * rand(0.15, 0.35);
      segs.push(boltLine(sx, sy, sx + Math.cos(a) * L, sy + Math.sin(a) * L, L * 0.25, 3));
    }
  }
  return segs;
}
function drawCrescent(g, s, p) {
  const L = TS * s.len * 1.45, headP = Math.min(1, p * 2.6), tq = clamp01((p - 0.3) / 0.7), tailP = 1 - Math.pow(1 - tq, 2);
  const t0 = Math.min(tailP, headP), span = headP - t0;
  if (span < 0.015) return;
  const W = TS * 0.17 * (s.thin || 1), fade = p < 0.65 ? 1 : (1 - p) / 0.35, N = 14;
  const at = t => s.straight ? [-L + 2 * L * t, 0, 0] : (() => { const a = -Math.PI / 2 - 0.9 + 1.8 * t; return [Math.cos(a) * L, L * 0.6 + Math.sin(a) * L, a]; })();
  const shape = (wk, out) => {
    const top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N, t = t0 + span * f, w = W * wk * Math.pow(f < 0.82 ? f / 0.82 : (1 - f) / 0.18, 0.55) + 0.4;
      const [px, py, a] = at(t);
      if (s.straight) { top.push([px, py - w * 0.5]); bot.push([px, py + w * 0.5]); }
      else { const nx = Math.cos(a), ny = Math.sin(a); top.push([px + nx * w * out, py + ny * w * out]); bot.push([px - nx * w * (1 - out), py - ny * w * (1 - out)]); }
    }
    g.beginPath(); top.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = bot.length - 1; i >= 0; i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath();
  };
  const [tx, ty] = at(t0), [hx, hy] = at(headP);
  // 外层辉光（加色）→ 刀身（正常混合，保住颜色）→ 白色刃芯（加色）
  for (const [wk, out, col, al, add] of [[2.6, 0.5, s.color, 0.3, 1], [1, 0.2, s.color, 0.88, 0], [0.4, 0.1, '#ffffff', 1, 1]]) {
    const gr = g.createLinearGradient(tx, ty, hx, hy); gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.3, rgba(col, al * 0.45)); gr.addColorStop(0.8, rgba(col, al)); gr.addColorStop(1, rgba(col, al));
    g.globalCompositeOperation = add ? 'lighter' : 'source-over';
    g.globalAlpha = fade; g.fillStyle = gr; shape(wk, out); g.fill();
  }
  g.globalCompositeOperation = 'lighter';
  if (p < 0.5) { const d = TS * 0.8 * (s.thin || 1); g.globalAlpha = (1 - p * 2); g.drawImage(SP.flare(s.color), hx - d / 2, hy - d / 2, d, d); }
}
function drawSpellFxHD(now) {
  const dt0 = Math.min(0.05, (now - (PFX.last || now)) / 1000); PFX.last = now;
  const dt = dt0 * (OPT.fast ? 1.6 : 1);
  const g = ctx, W = B.w * TS, H = B.h * TS, ts = TS, shx = CAM.shx || 0, shy = CAM.shy || 0;
  // 自适应画质：演出期间平均帧时间偏高就逐步减量，顺畅一段时间后再慢慢恢复
  if (dt0 > 0 && dt0 < 0.2) {
    FXQ_ema += (dt0 * 1000 - FXQ_ema) * 0.08;
    if (fxActive() && FXQ_ema > 19.5 && now > FXQ_hold) { FXK.q = Math.max(0.35, FXK.q - 0.15); FXQ_hold = now + 350; }
    else if (FXQ_ema < 17.5 && now > FXQ_hold && FXK.q < 1) { FXK.q = Math.min(1, FXK.q + 0.05); FXQ_hold = now + 1500; }
  }
  const hq = FXK.q > 0.72;
  const main = () => { SC = DPR; BX = shx; BY = shy; };
  main();
  g.save(); resetX(g); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
  // 压暗：一次整屏填色（带元素色调）
  if (PFX.dim > 0.01) {
    g.globalAlpha = PFX.dim; g.fillStyle = PFX.tintDark || '#060214'; g.fillRect(-ts, -ts, W + ts * 2, H + ts * 2);
  } else if (!fxActive()) PFX.tint = PFX.tintDark = null;
  g.globalAlpha = 1;
  // ---- 更新粒子并分组 ----
  LIST_OVER.length = 0; LIST_ADD.length = 0; LIST_SOFT.length = 0;
  for (let i = PFX.parts.length - 1; i >= 0; i--) {
    const q = PFX.parts[i];
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.life += dt;
    if (q.life >= q.max) { PFX.parts.splice(i, 1); continue; }
    if (q.swirl) {
      const dx = q.x - q.cx, dy = q.y - q.cy, r = Math.hypot(dx, dy), an = Math.atan2(dy, dx) + q.swirl * dt;
      const nr = r * (q.swirl > 0 ? 0.985 : 1.01);
      q.x = q.cx + Math.cos(an) * nr; q.y = q.cy + Math.sin(an) * nr + q.vy * dt;
    } else {
      q.vy += q.g * dt; q.vx *= Math.pow(q.drag, dt * 10); q.vy *= Math.pow(q.drag, dt * 10);
      q.x += q.vx * dt; q.y += q.vy * dt;
    }
    if (q.sway) q.x += Math.sin(q.life * 5 + q.ph) * q.sway * ts * dt;
    if (q.spin) q.rot += q.spin * dt;
    const sh = q.shape;
    if (MPART[sh]) (MPART_ADD[sh] ? LIST_ADD : LIST_OVER).push(q);
    else if (sh === 'smoke' || sh === 'rock' || sh === 'shard' || sh === 'feather' || sh === 'petal' || sh === 'leaf' || sh === 'arrow' || sh === 'bubble' || sh === 'void' || sh === 'mist') LIST_OVER.push(q);
    else if (SOFT_SHAPES[sh]) LIST_SOFT.push(q); else LIST_ADD.push(q);
  }
  for (let i = PFX.bursts.length - 1; i >= 0; i--) if (now - PFX.bursts[i].t0 >= PFX.bursts[i].dur) PFX.bursts.splice(i, 1);
  // ---- 柔光层（半解析度）：魔法阵底光与光幕、光柱、冲击波、柔和光晕、火焰与光点 ----
  let soft = PFX.circles.length || PFX.pillars.length || PFX.rings.length || LIST_SOFT.length || PFX.bolts.length || PFX.beams.length;
  if (!soft) for (const b of PFX.bursts) if (b.add && !b.img.crisp) { soft = 1; break; }
  GBK = DPR > 2 ? (hq ? 0.45 : 0.34) : 0.6;
  const sg = soft ? glowBuf() : null;
  if (sg) {
    SC = DPR * GBK; BX = 0; BY = 0;
    for (let i = PFX.circles.length - 1; i >= 0; i--) {
      const c = PFX.circles[i], p = (now - c.t0) / c.dur;
      if (p < 0) continue;
      if (p >= 1) { PFX.circles.splice(i, 1); continue; }
      const a = p < 0.15 ? p / 0.15 : p > 0.78 ? (1 - p) / 0.22 : 1, R = c.r * ts * 1.12 * (0.35 + 0.65 * easeBack(Math.min(1, p * 3.2)));
      c._a = a; c._R = R;
      sg.globalAlpha = a * 0.55; xform(sg, c.x, c.y, 0, 0.42); sg.drawImage(SP.glow(c.color), -R * 1.15, -R * 1.15, R * 2.3, R * 2.3);
      if (hq) { resetX(sg); const ch = R * (0.9 + 0.3 * Math.sin(now / 160)); sg.globalAlpha = a * 0.32; sg.drawImage(SP.pillar(c.color), c.x - R * 0.95, c.y - ch, R * 1.9, ch); }
    }
    for (let i = PFX.pillars.length - 1; i >= 0; i--) {
      const c = PFX.pillars[i], p = (now - c.t0) / c.dur;
      if (p < 0) continue;
      if (p >= 1) { PFX.pillars.splice(i, 1); continue; }
      const a = Math.sin(p * Math.PI), w = ts * c.w * (0.5 + a * 0.6), h = ts * (c.h || 6.3);
      xform(sg, c.x, c.y, c.ang || 0);
      sg.globalAlpha = a * 0.95; sg.drawImage(SP.pillar(c.color), -w, -h, w * 2, h);
      sg.globalAlpha = a * 0.9; sg.drawImage(SP.pillar('#ffffff'), -w * 0.32, -h, w * 0.64, h);
      if (hq) { xform(sg, c.x, c.y, 0, 0.4); sg.globalAlpha = a * 0.8; sg.drawImage(SP.glow(c.color), -w * 1.6, -w * 1.6, w * 3.2, w * 3.2); }
    }
    for (let i = PFX.rings.length - 1; i >= 0; i--) {
      const c = PFX.rings[i], p = (now - c.t0) / c.dur;
      if (p < 0) continue;
      if (p >= 1) { PFX.rings.splice(i, 1); continue; }
      if (luma(c.color) < 50) continue; // 暗色环在主画布画
      const r = ts * (c.r0 + (c.r1 - c.r0) * easeOut(p)) / 0.93, fy = c.flat ? 0.45 : 1, a = Math.pow(1 - p, 1.15);
      xform(sg, c.x, c.y, 0, fy);
      sg.globalAlpha = a; sg.drawImage(SP.ring(c.color), -r, -r, r * 2, r * 2);
      if (hq) { sg.globalAlpha = a * 0.3; const r2 = r * 1.1; sg.drawImage(SP.ring('#ffffff'), -r2, -r2, r2 * 2, r2 * 2); }
    }
    for (const b of PFX.bursts) if (b.add && !b.img.crisp && now >= b.t0) drawBurst(sg, b, now);
    for (let i = LIST_SOFT.length - 1; i >= 0; i--) drawPartHD(sg, LIST_SOFT[i]);
    // 闪电与光束最宽的辉光层也画在柔光层
    resetX(sg); sg.lineCap = 'round'; sg.lineJoin = 'round';
    for (const b of PFX.bolts) {
      const p = (now - b.t0) / b.dur; if (p < 0 || p >= 1) continue;
      if (b.x0 === undefined) { b.x0 = b.x + rand(-0.6, 0.6) * ts; b.y0 = b.y - ts * 5.5; b.x1 = b.x; b.y1 = b.y; }
      if (!b.segs || now > b.nx) { b.segs = boltGeom(b); b.nx = now + 40 + Math.random() * 45; }
      b._a = p < 0.6 ? 0.75 + Math.random() * 0.25 : (1 - p) / 0.4;
      sg.globalAlpha = b._a * 0.26; sg.strokeStyle = b.glow || '#7a8cff';
      b.segs.forEach((seg, si) => { sg.lineWidth = ts * 0.34 * (b.small ? 0.45 : 1) * (si ? 0.5 : 1); sg.beginPath(); seg.forEach(([x, y], j) => (j ? sg.lineTo(x, y) : sg.moveTo(x, y))); sg.stroke(); });
    }
    for (const b of PFX.beams) {
      const p = (now - b.t0) / b.dur; if (p < 0 || p >= 1) continue;
      const grow = Math.min(1, p * 4), a = p < 0.7 ? 1 : (1 - p) / 0.3, w = ts * b.w * (0.85 + Math.sin(now / 30) * 0.15);
      const x1 = b.x0 + (b.x1 - b.x0) * grow, y1 = b.y0 + (b.y1 - b.y0) * grow;
      for (const [wd, al] of [[1.9, 0.16], [1.0, 0.42]]) { sg.globalAlpha = a * al; sg.strokeStyle = b.color; sg.lineWidth = Math.max(1, w * wd); sg.beginPath(); sg.moveTo(b.x0, b.y0); sg.lineTo(x1, y1); sg.stroke(); }
    }
    main();
    g.setTransform(1, 0, 0, 1, shx, shy); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1; g.drawImage(GB, 0, 0, GB.width, GB.height, 0, 0, cv.width, cv.height); resetX(g);
  }
  // ---- 主画布 ----
  // 魔法阵线条（清晰）
  g.globalCompositeOperation = 'lighter';
  for (const c of PFX.circles) {
    if (!c._R || now < c.t0) continue;
    const R = c._R, pat = c.pat || CIRCLE_PAT[c.el] || 'star6';
    g.globalAlpha = c._a; xform(g, c.x, c.y, now / 1500 + (c.rot0 || 0), 0.42); g.drawImage(runeCircle(c.color, pat, false), -R, -R, R * 2, R * 2);
    xform(g, c.x, c.y, -now / 800, 0.42); g.drawImage(runeCircle(c.color, pat, true), -R, -R, R * 2, R * 2);
  }
  resetX(g);
  // 暗色环（死亡类）
  g.globalCompositeOperation = 'source-over';
  for (const c of PFX.rings) {
    const p = (now - c.t0) / c.dur; if (p < 0 || p >= 1 || luma(c.color) >= 50) continue;
    const r = ts * (c.r0 + (c.r1 - c.r0) * easeOut(p)), fy = c.flat ? 0.45 : 1;
    g.globalAlpha = Math.pow(1 - p, 1.15) * 0.75; g.strokeStyle = 'rgba(10,0,20,0.9)'; g.lineWidth = ts * 0.16 * (1 - p) + 1;
    g.beginPath(); g.ellipse(c.x, c.y, r, r * fy, 0, 0, TAU); g.stroke();
  }
  // 正常混合：烟、虚空、岩石、冰晶、羽毛、花瓣、叶片、箭
  for (const b of PFX.bursts) if (!b.add && now >= b.t0) drawBurst(g, b, now);
  for (let i = LIST_OVER.length - 1; i >= 0; i--) drawPartHD(g, LIST_OVER[i]);
  resetX(g);
  if (PFX.actors.length) drawActors(g, now); // 招式意象（龙、凤、兵器、月、星……）
  // 加色：清晰的星芒、火花与贴图
  g.globalCompositeOperation = 'lighter';
  for (let i = LIST_ADD.length - 1; i >= 0; i--) drawPartHD(g, LIST_ADD[i]);
  for (const b of PFX.bursts) if (b.add && b.img.crisp && now >= b.t0) drawBurst(g, b, now);
  resetX(g);
  // 光束
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = PFX.beams.length - 1; i >= 0; i--) {
    const b = PFX.beams[i], p = (now - b.t0) / b.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.beams.splice(i, 1); continue; }
    const grow = Math.min(1, p * 4), a = p < 0.7 ? 1 : (1 - p) / 0.3, fl = 0.85 + Math.sin(now / 30 + i) * 0.15;
    const x1 = b.x0 + (b.x1 - b.x0) * grow, y1 = b.y0 + (b.y1 - b.y0) * grow, w = ts * b.w * fl;
    for (const [wd, col, al] of (sg ? [[0.52, b.color, 0.85], [0.2, '#ffffff', 1]] : [[1.9, b.color, 0.16], [1.0, b.color, 0.42], [0.52, b.color, 0.85], [0.2, '#ffffff', 1]])) {
      g.globalAlpha = a * al; g.strokeStyle = col; g.lineWidth = Math.max(1, w * wd);
      g.beginPath(); g.moveTo(b.x0, b.y0); g.lineTo(x1, y1); g.stroke();
    }
    const L = Math.hypot(x1 - b.x0, y1 - b.y0);
    if (L > ts * 0.5) { // 沿光束流动的能量粒
      const img = SP.core(b.color), d = w * 1.5;
      for (let k = 0; k < 6; k++) { const t = ((now / 260 + k / 6) % 1); g.globalAlpha = a * 0.85 * Math.sin(t * Math.PI); g.drawImage(img, b.x0 + (x1 - b.x0) * t - d / 2, b.y0 + (y1 - b.y0) * t - d / 2, d, d); }
    }
    const d0 = w * 3, d1 = w * (3.2 + Math.sin(now / 40) * 0.5);
    g.globalAlpha = a * 0.8; g.drawImage(SP.core(b.color), b.x0 - d0 / 2, b.y0 - d0 / 2, d0, d0);
    g.globalAlpha = a; g.drawImage(SP.core(b.color), x1 - d1 / 2, y1 - d1 / 2, d1, d1);
  }
  // 闪电（主干 + 分叉，抖动重生）
  for (let i = PFX.bolts.length - 1; i >= 0; i--) {
    const b = PFX.bolts[i], p = (now - b.t0) / b.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.bolts.splice(i, 1); continue; }
    if (!b.segs) continue;
    const a = b._a ?? 1, k = b.small ? 0.45 : 1;
    for (const [wd, col, al] of [[0.12, b.color, 0.8], [0.045, '#ffffff', 1]]) {
      g.globalAlpha = a * al; g.strokeStyle = col;
      b.segs.forEach((seg, si) => { g.lineWidth = Math.max(0.8, ts * wd * k * (si ? 0.5 : 1)); g.beginPath(); seg.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
    }
    if (!b.small) { const d = ts * 1.5; g.globalAlpha = a * 0.75; g.drawImage(SP.core('#c8d8ff'), b.x1 - d / 2, b.y1 - d / 2, d, d); }
  }
  // 斩击：渐层月牙刀光
  for (let i = PFX.slashes.length - 1; i >= 0; i--) {
    const s = PFX.slashes[i], p = (now - s.t0) / s.dur;
    if (p < 0) continue;
    if (p >= 1) { PFX.slashes.splice(i, 1); continue; }
    if (!s.hd) { s.hd = 1; s.dur *= 1.3; } // 高清：刀光残影多留一点（不阻塞流程）
    xform(g, s.x, s.y, s.angle); drawCrescent(g, s, p);
  }
  resetX(g);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  // 全屏闪光（亮色用加色 = 泛光感）
  if (PFX.flash) {
    const p = (now - PFX.flash.t0) / PFX.flash.dur;
    if (p >= 1) PFX.flash = null;
    else {
      const bright = luma(PFX.flash.color) > 90;
      g.globalCompositeOperation = bright ? 'lighter' : 'source-over';
      g.globalAlpha = Math.pow(1 - p, 1.6) * PFX.flash.a * (bright ? 0.85 : 1); g.fillStyle = PFX.flash.color; g.fillRect(-ts, -ts, W + ts * 2, H + ts * 2);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
  }
  if (PFX.label) drawLabelHD(g, now, W, H);
  g.restore();
}
function drawBurst(g, b, now) {
  const p = Math.min(1, (now - b.t0) / b.dur);
  let r, a;
  if (b.mode === 'pulse') { const e = Math.sin(Math.PI * p); r = b.r0 + (b.r1 - b.r0) * Math.min(1, p * 3); a = b.a * Math.min(1, e * 1.6); }
  else if (b.mode === 'grow') { r = b.r1 * easeBack(Math.min(1, p * 5)); a = b.a * (p < 0.7 ? 1 : (1 - p) / 0.3); }
  else { r = b.r0 + (b.r1 - b.r0) * easeOut(p); a = b.a * (p < b.fin ? p / b.fin : Math.pow((1 - p) / (1 - b.fin), 1.3)); }
  if (a <= 0.005 || r <= 0) return;
  const R = r * TS, dw = 2 * R * b.asp, dh = 2 * R;
  xform(g, b.x, b.y, b.rot + b.spin * (now - b.t0) / 1000, b.fy);
  g.globalAlpha = Math.min(1, a); g.drawImage(b.img, -dw / 2, -dh * b.ay, dw, dh);
}
function drawPartHD(g, q) {
  const lf = q.life / q.max, sh = q.shape;
  let s = q.size * (sh === 'ember' || sh === 'spark' ? 1 - lf * 0.7 : 1 - lf * 0.4);
  let a = lf < 0.15 ? lf / 0.15 : 1 - lf;
  if (a <= 0.01) return;
  const x = q.x, y = q.y;
  const mp = MPART[sh];
  if (mp) { // 招式意象的小粒子：花瓣、星、骷髅、鬼火、蝙蝠、音符……
    const img = mp(q), d = q.size * (MPART_K[sh] || 2.4), k = d / Math.max(img.width, img.height), up = sh === 'bat' || sh === 'wisp' || sh === 'skull' || sh === 'note' || sh === 'heart';
    xform(g, x, y, up ? Math.sin(q.life * 6 + q.ph) * 0.15 : sh === 'bug' ? Math.atan2(q.vy, q.vx) + Math.PI / 2 : q.rot || 0); g.globalAlpha = Math.min(1, a * 1.3);
    g.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k); return;
  }
  switch (sh) {
    case 'ember': case 'spark': {
      const tl = sh === 'spark' ? 0.05 : 0.035, ex = x - q.vx * tl, ey = y - q.vy * tl;
      resetX(g); g.globalAlpha = a; g.strokeStyle = q.col; g.lineWidth = Math.max(0.8, s * 1.1); g.lineCap = 'round';
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(x, y); g.stroke();
      const d = s * 4; g.globalAlpha = a * 0.8; g.drawImage(SP.glow(q.col), x - d / 2, y - d / 2, d, d);
      return;
    }
    case 'star': { resetX(g); const d = s * 6.5; g.globalAlpha = a; g.drawImage(SP.flare(q.col), x - d / 2, y - d / 2, d, d); return; }
    case 'flame': {
      a = lf < 0.12 ? lf / 0.12 : Math.pow(1 - lf, 1.2);
      const img = SP.flame(lf < 0.3 ? 0 : lf < 0.65 ? 1 : 2), d = q.size * (0.8 + lf * 0.7) * 3.4;
      xform(g, x, y, (q.vx || 0) * -0.002); g.globalAlpha = a; g.drawImage(img, -d * 0.375, -d * 0.7, d * 0.75, d); return;
    }
    case 'blade': { const d = s * 3; xform(g, x, y, q.rot + q.life * 14); g.globalAlpha = a; g.drawImage(SP.blade(q.col), -d / 2, -d / 2, d, d); return; }
    case 'core': { resetX(g); const d = s * 4; g.globalAlpha = a; g.drawImage(SP.core(q.col), x - d / 2, y - d / 2, d, d); return; }
    case 'glow': { resetX(g); const d = s * 4; g.globalAlpha = a * 0.8; g.drawImage(SP.glow(q.col), x - d / 2, y - d / 2, d, d); return; }
    case 'smoke': case 'mist': {
      a = lf < 0.2 ? lf / 0.2 : 1 - lf; const d = q.size * (1 + lf * 1.4) * 2.6;
      resetX(g); g.globalAlpha = a * (sh === 'mist' ? 0.55 : 0.85); g.drawImage(SP.smoke(q.col), x - d / 2, y - d / 2, d, d); return;
    }
    case 'void': { resetX(g); const d = s * 4; g.globalAlpha = a; g.drawImage(SP.void(), x - d / 2, y - d / 2, d, d); return; }
    case 'rock': { const d = q.size * 2.6; xform(g, x, y, q.rot || 0); g.globalAlpha = Math.min(1, a * 1.6); g.drawImage(SP.rock(q.col, q.v || 0), -d / 2, -d / 2, d, d); return; }
    case 'shard': { const L = s * 4.4; xform(g, x, y, Math.hypot(q.vx, q.vy) > TS * 0.3 ? Math.atan2(q.vy, q.vx) : q.rot); g.globalAlpha = Math.min(1, a * 1.3); g.drawImage(SP.shard(q.col), -L / 2, -L * 0.16, L, L * 0.32); return; }
    case 'feather': { const L = s * 4; xform(g, x, y, q.rot); g.globalAlpha = a; g.drawImage(SP.feather(q.col), -L / 2, -L * 0.16, L, L * 0.32); return; }
    case 'petal': case 'leaf': { const d = s * 2.6; xform(g, x, y, q.rot); g.globalAlpha = a; g.drawImage(sh === 'petal' ? SP.petal(q.col) : SP.leaf(q.col), -d / 2, -d / 2, d, d); return; }
    case 'bubble': { resetX(g); const d = s * 2.4; g.globalAlpha = a; g.drawImage(SP.bubble(q.col), x - d / 2, y - d / 2, d, d); return; }
    case 'arrow': {
      const ang = Math.atan2(q.vy, q.vx), L = TS * 0.62, w = Math.max(1.2, TS * 0.045);
      xform(g, x, y, ang); g.globalAlpha = 1;
      g.globalCompositeOperation = 'lighter'; g.drawImage(SP.streak(), -L * 2.6, -w * 1.6, L * 2.2, w * 3.2); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#6a4a2a'; g.fillRect(-L, -w * 0.32, L * 0.9, w * 0.64);
      g.fillStyle = q.col; g.beginPath(); g.moveTo(w * 2.6, 0); g.lineTo(-w * 0.4, w * 1.2); g.lineTo(0, 0); g.lineTo(-w * 0.4, -w * 1.2); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-L, 0); g.lineTo(-L - w * 0.8, -w * 1.3); g.lineTo(-L + w * 1.6, -w * 0.3); g.lineTo(-L + w * 1.6, w * 0.3); g.lineTo(-L - w * 0.8, w * 1.3); g.closePath(); g.fill();
      return;
    }
    default: { resetX(g); const d = s * 4.2; g.globalAlpha = a; g.drawImage(SP.core(q.col), x - d / 2, y - d / 2, d, d); }
  }
}
// 招式名横幅：中央渐隐的玻璃色带 + 渐层字
function labelCanvas(text, col, ts) {
  const fs = Math.round(ts * 0.6 * DPR), c = document.createElement('canvas'), g = c.getContext('2d');
  const font = `900 ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(text).width) + fs; c.width = w; c.height = Math.round(fs * 1.7);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const cx = w / 2, cy = c.height / 2;
  g.shadowColor = col; g.shadowBlur = fs * 0.45; g.fillStyle = rgba(col, 0.9); g.fillText(text, cx, cy); g.shadowBlur = 0;
  g.lineWidth = fs * 0.2; g.strokeStyle = '#0a0418'; g.strokeText(text, cx, cy);
  const gr = g.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, shade(col, 0.45)); gr.addColorStop(1, col);
  g.fillStyle = gr; g.fillText(text, cx, cy);
  return c;
}
function drawLabelHD(g, now, W, H) {
  const L = PFX.label, p = (now - L.t0) / L.dur;
  if (p >= 1) { PFX.label = null; return; }
  if (!L.cv || L.ts !== TS) { L.cv = labelCanvas(L.text, L.color, TS); L.ts = TS; }
  const a = p < 0.12 ? p / 0.12 : p > 0.8 ? (1 - p) / 0.2 : 1, y = H * 0.16, bh = TS * 0.95, ein = easeOut(Math.min(1, p / 0.18));
  const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(8,4,26,0)'); gr.addColorStop(0.22, 'rgba(8,4,26,0.82)'); gr.addColorStop(0.78, 'rgba(8,4,26,0.82)'); gr.addColorStop(1, 'rgba(8,4,26,0)');
  g.globalAlpha = a; g.fillStyle = gr; g.fillRect(0, y - bh / 2, W, bh);
  const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, rgba(L.color, 0)); lg.addColorStop(0.5, rgba(L.color, 1)); lg.addColorStop(1, rgba(L.color, 0));
  g.fillStyle = lg; const lw = W * ein; g.fillRect((W - lw) / 2, y - bh / 2, lw, 1.5); g.fillRect((W - lw) / 2, y + bh / 2 - 1.5, lw, 1.5);
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.35; g.fillStyle = lg; g.fillRect(0, y - bh / 2, W, bh); g.globalCompositeOperation = 'source-over';
  const cw = L.cv.width / DPR, ch = L.cv.height / DPR, sc = 1 + (1 - ein) * 0.35;
  g.globalAlpha = a; g.drawImage(L.cv, W / 2 - cw * sc / 2 + (1 - ein) * TS, y - ch * sc / 2, cw * sc, ch * sc);
  if (p < 0.5) { // 字面上划过的闪光
    const gx = W / 2 - cw / 2 + cw * (p / 0.5), d = TS * 1.1; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(p / 0.5 * Math.PI) * 0.9;
    g.drawImage(SP.flare('#ffffff'), gx - d / 2, y - d / 2, d, d); g.globalCompositeOperation = 'source-over';
  }
  g.globalAlpha = 1;
}

// ---------- 地图普通攻击 / 道具 / 事件特效（battle.js 的 drawFx 在高清画风下转到这里） ----------
function drawFxHD(list, now) {
  const g = ctx;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i], p = (now - f.t0) / Math.max(1, f.dur), cx = (f.x + 0.5) * TS, cy = (f.y + 0.5) * TS;
    if (!f.init) {
      f.init = 1;
      const pm = FXK.m; FXK.m = 0.7;
      switch (f.type) {
        case 'slash': { // 普攻：两道交叉月牙 + 火花
          const col = f.color && f.color !== '#fff' ? f.color : '#6ab0ff', a0 = rand(-0.5, -0.2);
          PFX.slashes.push({ x: cx, y: cy, angle: a0, len: 0.55, color: col, t0: now0(), dur: T(230), thin: 1.2 });
          PFX.slashes.push({ x: cx, y: cy, angle: a0 + Math.PI * 0.62, len: 0.5, color: '#ffd070', t0: now0() + T(60), dur: T(220), thin: 0.9, straight: true });
          hitSparkHD(cx, cy, ['#ffffff', '#fff0c0', col]);
          break;
        }
        case 'arrow': break;
        case 'beam': PFX.beams.push({ x0: (f.sx + 0.5) * TS, y0: (f.sy + 0.5) * TS, x1: cx, y1: cy, w: 0.45, color: f.color || '#ff6a1a', t0: now0(), dur: f.dur }); break;
        case 'summon': {
          const col = f.color && f.color !== '#fff' ? f.color : '#c8b0ff';
          PFX.circles.push({ x: cx, y: cy + TS * 0.3, r: 0.6, color: col, el: 'summon', t0: now0(), dur: f.dur * 1.4 });
          emit(18, cx, cy, { speed: [0, 0], life: [0.5, 0.8], size: [0.04, 0.07], cols: ['#ffffff', col], swirl: 6, cx, cy, vy: -1.2, jitter: 0.7, shape: 'star' });
          PFX.pillars.push({ x: cx, y: cy + TS * 0.3, w: 0.4, color: col, t0: now0(), dur: f.dur });
          break;
        }
        default: if (IMPACT_HD[f.type]) IMPACT_HD[f.type](cx, cy, false, 0.3);
      }
      FXK.m = pm;
    }
    if (p >= 1) { if (f.type === 'arrow') hitSparkHD(cx, cy, ['#ffffff', '#fff0c0', '#ffd080']); list.splice(i, 1); continue; }
    if (f.type === 'arrow') { // 箭矢 + 光痕
      const sx = (f.sx + 0.5) * TS, sy = (f.sy + 0.5) * TS, e = easeOut(p) * 0.3 + p * 0.7, ax = sx + (cx - sx) * e, ay = sy + (cy - sy) * e - Math.sin(p * Math.PI) * TS * 0.25;
      const q = { x: ax, y: ay, vx: cx - sx, vy: (cy - sy) - Math.cos(p * Math.PI) * TS * 0.8, col: '#e8e8f0', shape: 'arrow', life: 0.3, max: 1, size: 1 };
      BX = CAM.shx || 0; BY = CAM.shy || 0; SC = DPR;
      g.save(); g.imageSmoothingEnabled = true; drawPartHD(g, q); g.restore();
    }
  }
}

// ---------- 必杀技 cut-in（高清） ----------
let cutHD = null;
function cutPortrait(u) {
  try {
    if (typeof getPortrait === 'function' && typeof hdPortrait === 'function') {
      let src = null;
      if (u.id && HEROES[u.id]) src = getPortrait(u.id, undefined, heroTier(u.id), heroPath(u.id));
      else { const kind = Object.keys(KIND_ALIAS).find(k => KIND_ALIAS[k] === u.cls) || u.cls; src = getPortrait('enemy:' + kind, u.color || u.element); }
      if (src && src.__pk && src.__pk.key !== '?') { const hd = hdPortrait(src, { bg: false }); if (hd && hd.width > 0) return hd; }
    }
  } catch (e) { /* 退回一般立绘 */ }
  try { return typeof unitPortrait === 'function' ? unitPortrait(u, 128) : null; } catch (e) { return null; }
}
function cutTitle(text, col, lab, fs, dpr) {
  const f = Math.round(fs * dpr), c = document.createElement('canvas'), g = c.getContext('2d');
  const font = `italic 900 ${f}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  g.font = font; const w = Math.ceil(g.measureText(text).width + f * 1.2); c.width = w; c.height = Math.round(f * 1.8);
  const cx = w / 2, cy = c.height / 2;
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.shadowColor = col; g.shadowBlur = f * 0.6; g.fillStyle = col; g.fillText(text, cx, cy); g.fillText(text, cx, cy); g.shadowBlur = 0;
  g.lineWidth = f * 0.22; g.strokeStyle = '#0a0418'; g.strokeText(text, cx, cy);
  g.lineWidth = f * 0.07; g.strokeStyle = shade(col, 0.55); g.strokeText(text, cx, cy);
  // 字面：渐层 + 上半部高光
  const t = document.createElement('canvas'); t.width = w; t.height = c.height; const tg = t.getContext('2d');
  tg.font = font; tg.textAlign = 'center'; tg.textBaseline = 'middle';
  const gr = tg.createLinearGradient(0, cy - f / 2, 0, cy + f / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.48, shade(lab, 0.35)); gr.addColorStop(0.52, lab); gr.addColorStop(1, shade(col, -0.1));
  tg.fillStyle = gr; tg.fillText(text, cx, cy);
  tg.globalCompositeOperation = 'source-atop'; const gl = tg.createLinearGradient(0, cy - f / 2, 0, cy); gl.addColorStop(0, 'rgba(255,255,255,0.65)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  tg.fillStyle = gl; tg.fillRect(0, 0, w, cy);
  g.drawImage(t, 0, 0);
  return c;
}
async function skillCutInHD(u, sp, E) {
  if (!cutHD) {
    cutHD = document.createElement('canvas');
    cutHD.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:34;pointer-events:none';
    $('#app').appendChild(cutHD);
  }
  // cut-in 是 1 秒的全屏动态画面：最高以 2 倍解析度绘制（仍为平滑高清），换取手机上的稳定帧率
  const app = $('#app').getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = app.width, H = app.height;
  cutHD.width = Math.round(W * dpr); cutHD.height = Math.round(H * dpr); cutHD.hidden = false;
  const g = cutHD.getContext('2d');
  const pair = sp.kind === 'pair', col = pair ? '#ffc040' : E.glow, col2 = pair ? '#6ab0ff' : shade(E.glow, -0.35);
  const cy = H * 0.44, bh0 = H * 0.3, fs = Math.round(Math.min(W * 0.115, bh0 * 0.32));
  // 立绘先以高品质缩成画面上的实际像素大小，每帧只做低成本贴图
  const ports = [u, B.castPartner].filter(Boolean).map(cutPortrait).filter(Boolean).map(pc => {
    const h = Math.round(bh0 * 1.18 * dpr), w = Math.round(h * pc.width / pc.height);
    if (!(w > 0 && h > 0) || h >= pc.height) return pc;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(pc, 0, 0, w, h); return c;
  });
  const title = cutTitle(sp.name, col, E.label, fs, dpr);
  const cap = pair ? '双人合击' : u.team === 'player' ? '必杀技' : '强敌绝招';
  const dur = T(1050), t0 = performance.now();
  const lines = Array.from({ length: 26 }, () => ({ y: Math.random(), w: 0.25 + Math.random() * 0.55, sp: 1.6 + Math.random() * 2.6, o: Math.random(), h: 0.6 + Math.random() * 1.6, c: Math.random() < 0.35 }));
  const motes = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), v: 0.6 + Math.random() * 1.4 }));
  sfx('cutin'); haptic(20);
  await new Promise(res => {
    const frame = now => {
      const p = Math.min(1, (now - t0) / Math.max(1, dur));
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
      const inP = Math.min(1, p / 0.16), outP = p > 0.82 ? (p - 0.82) / 0.18 : 0, ease = easeOut(inP);
      // 背景：压暗（'copy' 一次完成清屏 + 填色）
      g.globalCompositeOperation = 'copy'; g.globalAlpha = 1; g.fillStyle = `rgba(4,2,14,${0.62 * ease * (1 - outP)})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
      const bh = bh0 * (1 - outP * 0.95) * (0.6 + 0.4 * ease), sk = W * 0.18, slide = (1 - ease) * W * 1.2;
      const band = () => { g.beginPath(); g.moveTo(-sk, cy - bh / 2 + sk * 0.5); g.lineTo(W + sk, cy - bh / 2 - sk * 0.5); g.lineTo(W + sk, cy + bh / 2 - sk * 0.5); g.lineTo(-sk, cy + bh / 2 + sk * 0.5); g.closePath(); };
      g.save(); g.translate(slide, 0);
      const grd = g.createLinearGradient(0, cy - bh / 2 - sk * 0.5, 0, cy + bh / 2 + sk * 0.5);
      grd.addColorStop(0, '#05030f'); grd.addColorStop(0.22, shade(col2, -0.55)); grd.addColorStop(0.5, shade(col, -0.15)); grd.addColorStop(0.78, shade(col2, -0.55)); grd.addColorStop(1, '#05030f');
      g.globalAlpha = 0.95; g.fillStyle = grd; band(); g.fill();
      g.save(); band(); g.clip();
      g.globalCompositeOperation = 'lighter';
      // 立绘背后的放射光
      const px0 = W * 0.24, sb = bh * 1.7; g.globalAlpha = 0.7; g.translate(px0, cy); g.rotate(now / 900); g.drawImage(SP.burst(col), -sb / 2, -sb / 2, sb, sb); g.setTransform(dpr, 0, 0, dpr, slide * dpr, 0);
      // 速度线（锥形渐层光痕）
      const stW = SP.streak('#ffffff', true), stC = SP.streak(col, true);
      for (const L of lines) {
        const len = W * L.w, x = W + len - ((now / 1000 * L.sp * W + L.o * W * 2.4) % (W * 2.4)), y = cy - bh / 2 - sk * 0.5 + L.y * (bh + sk);
        g.globalAlpha = L.c ? 0.7 : 0.4; g.drawImage(L.c ? stC : stW, x - len, y, len, Math.max(1, bh * 0.014 * L.h));
      }
      // 光点
      for (const m of motes) { const x = ((m.x - now / 1000 * m.v * 0.6) % 1 + 1) % 1 * W, y = cy - bh / 2 + m.y * bh, d = bh * 0.05 * m.s; g.globalAlpha = 0.8; g.drawImage(SP.flare(col), x - d, y - d, d * 2, d * 2); }
      // 扫过色带的光泽
      const sw = ((now - t0) / 700) % 1.4 - 0.2, sg = g.createLinearGradient(W * sw - W * 0.15, 0, W * sw + W * 0.15, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 1; g.fillStyle = sg; g.fillRect(W * sw - W * 0.15, cy - bh / 2 - sk * 0.6, W * 0.3, bh + sk * 1.2); // 只填光泽所在的窄条
      g.globalCompositeOperation = 'source-over';
      // 立绘：由左滑入并缓慢推近
      ports.forEach((pc, i) => {
        const pin = clamp01((p - 0.04 - i * 0.06) / 0.18), pe = easeOut(pin), ar = pc.height / pc.width;
        const ph = bh * 1.12 * (1 + p * 0.06), pw = ph / ar;
        const px = W * 0.02 + i * pw * 0.7 - (1 - pe) * W * 0.6, py = cy - ph / 2 + bh * 0.04;
        g.globalAlpha = pe; g.drawImage(pc, px, py, pw, ph);
      });
      g.restore();
      // 色带上下缘的发光线
      g.globalCompositeOperation = 'lighter';
      for (const [lw, c2, al] of [[6, col, 0.35], [2, col, 0.9], [1, '#ffffff', 1]]) {
        g.globalAlpha = al * ease; g.strokeStyle = c2; g.lineWidth = lw;
        g.beginPath(); g.moveTo(-sk, cy - bh / 2 + sk * 0.5); g.lineTo(W + sk, cy - bh / 2 - sk * 0.5); g.moveTo(-sk, cy + bh / 2 + sk * 0.5); g.lineTo(W + sk, cy + bh / 2 - sk * 0.5); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      g.restore(); g.globalAlpha = 1;
      // 招式名：冲入 + 回弹 + 掠光
      const tin = clamp01((p - 0.12) / 0.16), te = easeOut(tin), tsc = 1 + (1 - easeBack(tin)) * 0.5;
      const tw = title.width / dpr, th = title.height / dpr, tx = W * 0.97 - tw * 0.92 + (1 - te) * W * 0.5, ty = cy + bh * 0.1;
      g.globalAlpha = te * (1 - outP);
      g.drawImage(title, tx + tw * (1 - tsc) / 2, ty - th * tsc / 2, tw * tsc, th * tsc);
      // 副标（胶囊底）
      g.font = `bold ${Math.round(fs * 0.34)}px "PingFang SC","Microsoft YaHei",sans-serif`; g.textAlign = 'right'; g.textBaseline = 'middle';
      const cw = g.measureText(cap).width + fs * 0.6, chh = fs * 0.5, cxr = W * 0.95 + (1 - te) * W * 0.5, cyy = ty - fs * 0.86;
      const pg = g.createLinearGradient(cxr - cw, 0, cxr, 0); pg.addColorStop(0, rgba(col, 0)); pg.addColorStop(0.3, rgba(shade(col, -0.2), 0.95)); pg.addColorStop(1, rgba(col2, 0.95));
      g.fillStyle = pg; g.beginPath(); g.moveTo(cxr - cw, cyy - chh / 2); g.lineTo(cxr, cyy - chh / 2); g.lineTo(cxr - chh * 0.4, cyy + chh / 2); g.lineTo(cxr - cw - chh * 0.4, cyy + chh / 2); g.closePath(); g.fill();
      g.fillStyle = '#ffffff'; g.fillText(cap, cxr - fs * 0.3, cyy + 1);
      if (tin > 0 && p < 0.75) { const gx = tx + tw * clamp01((p - 0.2) / 0.4), d = fs * 2.2; g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(clamp01((p - 0.2) / 0.4) * Math.PI); g.drawImage(SP.flare('#ffffff'), gx - d / 2, ty - d / 2, d, d); g.globalCompositeOperation = 'source-over'; }
      g.globalAlpha = 1;
      // 收尾闪光
      if (outP > 0) { g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,255,255,${0.75 * Math.sin(outP * Math.PI)})`; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
      if (p < 1) requestAnimationFrame(frame); else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cutHD.width, cutHD.height); cutHD.hidden = true; res(); }
    };
    requestAnimationFrame(frame);
  });
}

// =====================================================================
// 招式意象（motif）：依招式名称挑选贴切的画面——八龙剑法有八条龙、流星风暴降下流星、炎魔剑是烈焰之剑……
// 没有对应关键字的招式维持原本的元素演出。所有贴图都预先画在离屏画布上（每种颜色只画一次）
// =====================================================================
const PAL = {
  fire: { c: '#ff6a1a', l: '#ffe08a', d: '#8a1404', g: '#ff7a1a' },
  ice: { c: '#6ac8ff', l: '#effbff', d: '#1a5a9a', g: '#7ad0ff' },
  bolt: { c: '#ffd83a', l: '#fffbd8', d: '#7a5a10', g: '#fff090' },
  wind: { c: '#4ad8a0', l: '#e0fff2', d: '#0e6a4a', g: '#8ae8c0' },
  rock: { c: '#c09060', l: '#f0dcb0', d: '#4a3420', g: '#e0b070' },
  dark: { c: '#8a3ae0', l: '#e8c0ff', d: '#1a0634', g: '#a040ff' },
  holy: { c: '#ffd050', l: '#fffbe0', d: '#9a6a08', g: '#fff0a0' },
  heal: { c: '#4ae080', l: '#e8fff0', d: '#0e6a34', g: '#7af0a0' },
  acid: { c: '#9ae040', l: '#f0ffc0', d: '#2a5a0a', g: '#9aff4a' },
  steel: { c: '#9ab8f0', l: '#ffffff', d: '#2a3a6a', g: '#c8dcff' },
  blood: { c: '#e82040', l: '#ffb8c0', d: '#4a0010', g: '#ff3050' },
  water: { c: '#2a98f0', l: '#d8f4ff', d: '#08306a', g: '#5ab8ff' },
  sakura: { c: '#ff8ac0', l: '#fff0f6', d: '#b03a78', g: '#ffb0d8' },
  rose: { c: '#ff3a6a', l: '#ffd0dc', d: '#7a0a2a', g: '#ff6a90' },
  gold: { c: '#ffc040', l: '#fff4c0', d: '#8a5a08', g: '#ffd060' },
  summon: { c: '#a080ff', l: '#f0e8ff', d: '#2a1478', g: '#b090ff' },
  jade: { c: '#2ac0b0', l: '#d8fff8', d: '#05504a', g: '#5ae8d8' },
  black: { c: '#3a2a52', l: '#d0a8ff', d: '#08040e', g: '#8a40e0' },
  white: { c: '#dce8ff', l: '#ffffff', d: '#5a6a8a', g: '#c8e0ff' },
  purple: { c: '#b050ff', l: '#f4d8ff', d: '#3a0a6a', g: '#c070ff' },
  cyan: { c: '#30d8ff', l: '#e0fbff', d: '#05507a', g: '#6ae8ff' },
};
const FX_PAL = { fire: 'fire', beam: 'fire', ice: 'ice', bolt: 'bolt', wind: 'wind', rock: 'rock', dark: 'dark', holy: 'holy', heal: 'heal', buff: 'gold', acid: 'acid', slash: 'steel', summon: 'summon' };
const palOf = k => PAL[k] || PAL.steel;
// 只有发光外框（加色贴在本体下面）
function glowOf(key, src, col, blur) {
  return mkSpr('gw' + key, src.width + blur * 4, src.height + blur * 4, g => {
    const t = document.createElement('canvas'); t.width = src.width; t.height = src.height; const x = t.getContext('2d');
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height);
    g.shadowColor = col; g.shadowBlur = blur; g.globalAlpha = 0.9; g.drawImage(t, blur * 2, blur * 2); g.drawImage(t, blur * 2, blur * 2);
  });
}
const vgrad = (g, y0, y1, stops) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; };
const MS = {
  // ---- 龙：头（朝右，颈部接点在 (40,74)）、鳞片身节、背鳍、龙爪、尾鬃 ----
  dhead: pk => mkSpr('mdh' + pk, 200, 140, g => {
    const P = palOf(pk); g.lineJoin = 'round'; g.lineCap = 'round';
    // 鬃毛（火焰状，向后飘）
    for (let k = 0; k < 7; k++) {
      const bx = 40 + k * 9, by = 52 + Math.sin(k) * 4, tx = 4 + k * 3, ty = 18 + k * 12;
      g.fillStyle = vgrad(g, ty, by, [[0, rgba(P.l, 0.95)], [1, rgba(P.c, 0.95)]]);
      g.beginPath(); g.moveTo(bx - 8, by + 6); g.quadraticCurveTo(bx - 20, by - 10, tx, ty); g.quadraticCurveTo(bx - 6, by - 4, bx + 8, by + 2); g.closePath(); g.fill();
    }
    // 龙角
    for (const [ox, oy, col] of [[0, 4, shade(P.l, -0.15)], [-8, 0, P.l]]) {
      g.fillStyle = vgrad(g, 0, 50, [[0, '#fffbe8'], [1, col]]); g.strokeStyle = rgba(P.d, 0.8); g.lineWidth = 2;
      g.beginPath(); g.moveTo(96 + ox, 44 + oy); g.quadraticCurveTo(70 + ox, 10 + oy, 14 + ox, 6 + oy); g.quadraticCurveTo(50 + ox, 18 + oy, 52 + ox, 22 + oy); g.lineTo(44 + ox, 12 + oy); g.quadraticCurveTo(66 + ox, 26 + oy, 82 + ox, 50 + oy); g.closePath(); g.fill(); g.stroke();
    }
    // 口腔、下颚
    g.fillStyle = '#3a0408'; poly(g, [[100, 80], [186, 72], [178, 102]]); g.fill();
    g.fillStyle = vgrad(g, 80, 112, [[0, P.c], [1, P.d]]); g.strokeStyle = shade(P.d, -0.4); g.lineWidth = 3;
    g.beginPath(); g.moveTo(96, 82); g.quadraticCurveTo(140, 90, 180, 100); g.lineTo(176, 110); g.quadraticCurveTo(128, 112, 80, 102); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) { const x = 120 + k * 12; g.beginPath(); g.moveTo(x, 92 + k * 1.6); g.lineTo(x + 4, 84 + k * 1.4); g.lineTo(x + 8, 92 + k * 1.8); g.fill(); }
    // 胡须（下颚的棘状须）
    g.fillStyle = rgba(P.l, 0.95);
    for (let k = 0; k < 4; k++) { const x = 70 + k * 16; g.beginPath(); g.moveTo(x, 100); g.quadraticCurveTo(x - 10, 116, x - 22, 128 - k * 2); g.quadraticCurveTo(x - 4, 116, x + 10, 104); g.fill(); }
    // 头部
    g.fillStyle = vgrad(g, 30, 98, [[0, P.l], [0.35, P.c], [1, P.d]]); g.strokeStyle = shade(P.d, -0.45); g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(26, 52); g.quadraticCurveTo(64, 30, 104, 40); g.quadraticCurveTo(118, 28, 130, 42); g.quadraticCurveTo(162, 44, 188, 56);
    g.quadraticCurveTo(200, 64, 190, 74); g.lineTo(150, 76); g.quadraticCurveTo(122, 78, 100, 84); g.quadraticCurveTo(66, 100, 26, 98); g.closePath(); g.fill(); g.stroke();
    // 上排牙
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) { const x = 128 + k * 11; g.beginPath(); g.moveTo(x, 76); g.lineTo(x + 4, 84); g.lineTo(x + 8, 76); g.fill(); }
    // 鼻梁鳞纹、颊纹
    g.strokeStyle = rgba(P.l, 0.75); g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(140 + k * 11, 52 + k * 1.5, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.strokeStyle = rgba(P.d, 0.6); g.beginPath(); g.moveTo(52, 84); g.quadraticCurveTo(76, 74, 98, 80); g.stroke();
    // 鼻孔
    g.fillStyle = shade(P.d, -0.5); g.beginPath(); g.ellipse(182, 62, 4, 2.4, -0.3, 0, TAU); g.fill();
    // 眼睛（发光、竖瞳）
    g.save(); g.shadowColor = '#fff6a0'; g.shadowBlur = 14;
    const eg = g.createRadialGradient(116, 54, 1, 116, 54, 11); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.45, '#fff080'); eg.addColorStop(1, '#ff8a10');
    g.fillStyle = eg; g.beginPath(); g.ellipse(116, 54, 11, 6.5, -0.15, 0, TAU); g.fill(); g.restore();
    g.fillStyle = '#200400'; g.beginPath(); g.ellipse(117, 54, 1.8, 5.5, -0.15, 0, TAU); g.fill();
    g.strokeStyle = shade(P.d, -0.5); g.lineWidth = 2.4; g.beginPath(); g.moveTo(100, 46); g.quadraticCurveTo(116, 40, 132, 48); g.stroke();
    // 长须
    g.strokeStyle = rgba(P.l, 0.9); g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(184, 70); g.bezierCurveTo(176, 96, 150, 110, 120, 134); g.stroke();
    g.beginPath(); g.moveTo(178, 64); g.bezierCurveTo(196, 40, 186, 20, 198, 8); g.stroke();
  }),
  dseg: pk => mkSpr('mds' + pk, 64, 64, g => {
    const P = palOf(pk);
    const gr = g.createRadialGradient(26, 22, 2, 32, 32, 30); gr.addColorStop(0, P.l); gr.addColorStop(0.45, P.c); gr.addColorStop(1, P.d);
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 27, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(32, 32, 27, 0, TAU); g.clip();
    g.fillStyle = vgrad(g, 40, 60, [[0, shade(P.l, -0.05)], [1, shade(P.l, -0.3)]]); g.fillRect(0, 42, 64, 22); // 腹甲
    g.strokeStyle = rgba(P.d, 0.5); g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 43); g.lineTo(64, 43); g.moveTo(32, 43); g.lineTo(32, 64); g.stroke();
    g.strokeStyle = rgba(P.l, 0.6); g.lineWidth = 1.6; // 鳞
    for (const [x, y] of [[18, 22], [34, 16], [46, 28], [26, 34]]) { g.beginPath(); g.arc(x, y, 7, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    g.restore();
    g.strokeStyle = shade(P.d, -0.5); g.lineWidth = 2.6; g.beginPath(); g.arc(32, 32, 27, 0, TAU); g.stroke();
  }),
  dfin: pk => mkSpr('mdf' + pk, 32, 48, g => {
    const P = palOf(pk); g.fillStyle = vgrad(g, 0, 48, [[0, '#ffffff'], [0.35, P.l], [1, P.c]]); g.strokeStyle = rgba(P.d, 0.8); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(4, 48); g.quadraticCurveTo(10, 20, 26, 2); g.quadraticCurveTo(22, 26, 28, 48); g.closePath(); g.fill(); g.stroke();
  }),
  dleg: pk => mkSpr('mdl' + pk, 48, 48, g => {
    const P = palOf(pk); g.lineCap = 'round';
    g.strokeStyle = P.d; g.lineWidth = 12; g.beginPath(); g.moveTo(10, 6); g.quadraticCurveTo(14, 26, 26, 32); g.stroke();
    g.strokeStyle = P.c; g.lineWidth = 8; g.beginPath(); g.moveTo(10, 6); g.quadraticCurveTo(14, 26, 26, 32); g.stroke();
    g.strokeStyle = '#fffbe8'; g.lineWidth = 3;
    for (const [dx, dy] of [[16, 8], [18, 0], [12, 12]]) { g.beginPath(); g.moveTo(26, 32); g.quadraticCurveTo(26 + dx, 32 + dy * 0.4, 26 + dx * 0.9, 32 + dy + 6); g.stroke(); }
  }),
  dtail: pk => mkSpr('mdt' + pk, 80, 56, g => {
    const P = palOf(pk); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const a = -0.6 + k * 0.3; g.fillStyle = vgrad(g, 0, 56, [[0, rgba(P.l, 0.9)], [1, rgba(P.c, 0.7)]]);
      g.beginPath(); g.moveTo(76, 28); g.quadraticCurveTo(40, 28 + a * 30, 4, 28 + a * 46); g.quadraticCurveTo(44, 30 + a * 16, 76, 32); g.fill();
    }
  }),
  // ---- 凤凰：身体（朝右）与翅膀（翼根在左下） ----
  phx: pk => mkSpr('mph' + pk, 256, 160, g => {
    const P = palOf(pk); g.lineCap = 'round';
    // 长尾羽（末端有眼状斑）
    for (let k = 0; k < 5; k++) {
      const ey = 46 + k * 22, ex = 18 + Math.abs(k - 2) * 10;
      const gr = g.createLinearGradient(110, 0, ex, 0); gr.addColorStop(0, rgba(P.c, 0.95)); gr.addColorStop(0.6, rgba(P.l, 0.85)); gr.addColorStop(1, rgba(P.c, 0.6));
      g.fillStyle = gr; g.beginPath(); g.moveTo(112, 84); g.bezierCurveTo(80, 80 + (k - 2) * 4, 60, ey + 10, ex, ey); g.bezierCurveTo(60, ey - 2, 84, 90 + (k - 2) * 2, 112, 92); g.fill();
      g.fillStyle = rgba(P.d, 0.9); g.beginPath(); g.ellipse(ex + 8, ey, 7, 5, 0, 0, TAU); g.fill();
      g.fillStyle = rgba(P.l, 1); g.beginPath(); g.ellipse(ex + 8, ey, 3.5, 2.5, 0, 0, TAU); g.fill();
    }
    // 身体
    g.fillStyle = vgrad(g, 60, 108, [[0, P.l], [0.5, P.c], [1, P.d]]); g.strokeStyle = rgba(P.d, 0.9); g.lineWidth = 2;
    g.beginPath(); g.ellipse(134, 86, 36, 19, -0.18, 0, TAU); g.fill(); g.stroke();
    // 颈与头
    g.fillStyle = vgrad(g, 44, 90, [[0, P.l], [1, P.c]]);
    g.beginPath(); g.moveTo(150, 74); g.quadraticCurveTo(170, 66, 180, 54); g.lineTo(196, 58); g.quadraticCurveTo(184, 78, 162, 94); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(190, 54, 13, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#ffe070'; g.beginPath(); g.moveTo(200, 50); g.lineTo(224, 58); g.lineTo(200, 62); g.closePath(); g.fill(); // 喙
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(193, 51, 3.2, 0, TAU); g.fill(); g.fillStyle = '#300'; g.beginPath(); g.arc(194, 51, 1.6, 0, TAU); g.fill();
    // 冠羽
    g.strokeStyle = rgba(P.l, 0.95); g.lineWidth = 3;
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(184, 44); g.quadraticCurveTo(170 - k * 6, 20 - k * 2, 150 - k * 12, 16 + k * 6); g.stroke(); g.fillStyle = P.l; g.beginPath(); g.arc(150 - k * 12, 16 + k * 6, 3.5, 0, TAU); g.fill(); }
    g.fillStyle = rgba('#ffffff', 0.45); g.beginPath(); g.ellipse(146, 80, 16, 6, -0.2, 0, TAU); g.fill();
  }),
  wing: pk => mkSpr('mpw2' + pk, 220, 160, g => {
    const P = palOf(pk);
    for (let layer = 0; layer < 2; layer++) {
      const n = layer ? 6 : 9, L0 = layer ? 66 : 138;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI * 0.86 + k / (n - 1) * Math.PI * 0.52, L = L0 * (layer ? 1 : 0.62 + 0.38 * Math.sin(Math.PI * (k + 1.5) / (n + 1)));
        g.save(); g.translate(140, 150); g.rotate(a);
        const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, layer ? P.c : P.d); gr.addColorStop(0.5, layer ? P.l : P.c); gr.addColorStop(1, layer ? '#ffffff' : P.l);
        g.fillStyle = gr; g.strokeStyle = rgba(P.d, 0.7); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(L * 0.5, -L * 0.12, L, 0); g.quadraticCurveTo(L * 0.5, L * 0.1, 0, 0); g.fill(); g.stroke();
        g.restore();
      }
    }
  }),
  // ---- 兵器：剑、枪、箭（都朝右） ----
  sword: pk => mkSpr('msw' + pk, 256, 56, g => {
    const P = palOf(pk);
    g.fillStyle = '#ffd860'; g.beginPath(); g.arc(10, 28, 7, 0, TAU); g.fill(); g.fillStyle = P.c; g.beginPath(); g.arc(10, 28, 3.5, 0, TAU); g.fill();
    g.fillStyle = '#3a2418'; g.fillRect(16, 23, 40, 10); g.strokeStyle = '#a07040'; g.lineWidth = 1.5;
    for (let x = 18; x < 56; x += 6) { g.beginPath(); g.moveTo(x, 23); g.lineTo(x + 5, 33); g.stroke(); }
    g.fillStyle = vgrad(g, 4, 52, [[0, '#fff0b0'], [0.5, '#e0a840'], [1, '#8a5a18']]); g.strokeStyle = '#4a2a08'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(56, 26); g.quadraticCurveTo(52, 10, 62, 3); g.lineTo(68, 22); g.lineTo(68, 34); g.lineTo(62, 53); g.quadraticCurveTo(52, 46, 56, 30); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = P.c; g.beginPath(); g.arc(63, 28, 4, 0, TAU); g.fill();
    g.fillStyle = vgrad(g, 17, 39, [[0, '#ffffff'], [0.45, P.l], [1, P.c]]); g.strokeStyle = rgba(P.d, 0.9); g.lineWidth = 1.5;
    poly(g, [[68, 18], [222, 20], [254, 28], [222, 36], [68, 38]]); g.fill(); g.stroke();
    g.strokeStyle = rgba(P.d, 0.55); g.lineWidth = 2; g.beginPath(); g.moveTo(72, 28); g.lineTo(206, 28); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(70, 19.5); g.lineTo(222, 21); g.lineTo(252, 28); g.stroke();
  }),
  spear: pk => mkSpr('msp' + pk, 320, 48, g => {
    const P = palOf(pk);
    g.fillStyle = vgrad(g, 20, 28, [[0, '#a0503a'], [1, '#4a1a10']]); g.fillRect(0, 20.5, 232, 7);
    g.fillStyle = '#e0b050'; g.fillRect(224, 18, 12, 12); g.fillRect(4, 19, 8, 10);
    g.fillStyle = P.c; // 红缨
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(222, 24); g.quadraticCurveTo(206 - k * 3, 30 + k * 2, 196 - k * 4, 40 + k); g.lineTo(200 - k * 3, 40 + k); g.quadraticCurveTo(210, 30, 224, 26); g.fill(); }
    g.fillStyle = vgrad(g, 8, 40, [[0, '#ffffff'], [0.45, P.l], [1, P.c]]); g.strokeStyle = rgba(P.d, 0.9); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(236, 24); g.quadraticCurveTo(256, 8, 318, 24); g.quadraticCurveTo(256, 40, 236, 24); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = rgba(P.d, 0.6); g.beginPath(); g.moveTo(238, 24); g.lineTo(310, 24); g.stroke();
  }),
  axe: pk => mkSpr('max' + pk, 256, 96, g => {
    const P = palOf(pk);
    g.fillStyle = vgrad(g, 42, 54, [[0, '#a0603a'], [1, '#4a2010']]); g.fillRect(0, 44, 236, 8); g.fillStyle = '#e0b050'; g.fillRect(186, 41, 16, 14); g.fillRect(2, 42, 10, 12);
    g.fillStyle = vgrad(g, 2, 94, [[0, P.l], [0.5, '#ffffff'], [1, P.c]]); g.strokeStyle = rgba(P.d, 0.95); g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(200, 42); g.quadraticCurveTo(212, 20, 188, 4); g.quadraticCurveTo(240, 8, 252, 48); g.quadraticCurveTo(240, 88, 188, 92); g.quadraticCurveTo(212, 76, 200, 54); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(196, 7); g.quadraticCurveTo(240, 12, 249, 48); g.quadraticCurveTo(240, 84, 196, 89); g.stroke();
  }),
  arrow: pk => mkSpr('mar' + pk, 192, 32, g => {
    const P = palOf(pk);
    g.fillStyle = vgrad(g, 14, 18, [[0, P.l], [1, P.d]]); g.fillRect(24, 14.5, 140, 3);
    g.fillStyle = P.c; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(20, 16); g.lineTo(6, 16 + s * 11); g.lineTo(44, 16 + s * 2); g.lineTo(52, 16); g.fill(); }
    g.fillStyle = vgrad(g, 6, 26, [[0, '#ffffff'], [0.5, P.l], [1, P.c]]); g.beginPath(); g.moveTo(190, 16); g.lineTo(160, 5); g.lineTo(166, 16); g.lineTo(160, 27); g.closePath(); g.fill();
  }),
  // ---- 星、月、花瓣、屏障、骷髅、幽魂、拳、掌、浪 ----
  star: col => mkSpr('mst' + col, 64, 64, g => {
    g.save(); g.shadowColor = col; g.shadowBlur = 10;
    const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 10 : 25; pts.push([32 + Math.cos(a) * r, 33 + Math.sin(a) * r]); }
    const gr = g.createRadialGradient(32, 33, 0, 32, 33, 25); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, shade(col, 0.5)); gr.addColorStop(1, col);
    g.fillStyle = gr; poly(g, pts); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.2; poly(g, pts); g.stroke();
  }),
  moon: pk => mkSpr('mmo' + pk, 256, 256, g => {
    const P = palOf(pk);
    radial(g, 128, 128, 128, [[0, rgba(P.g, 0.35)], [0.55, rgba(P.g, 0.18)], [1, rgba(P.g, 0)]]);
    const t = document.createElement('canvas'); t.width = t.height = 256; const x = t.getContext('2d');
    const gr = x.createRadialGradient(100, 110, 10, 128, 128, 96); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, P.l); gr.addColorStop(1, P.c);
    x.fillStyle = gr; x.beginPath(); x.arc(128, 128, 92, 0, TAU); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(166, 104, 84, 0, TAU); x.fill();
    g.shadowColor = P.g; g.shadowBlur = 24; g.drawImage(t, 0, 0); g.shadowBlur = 0; g.drawImage(t, 0, 0);
  }),
  sakura: col => mkSpr('mka' + col, 32, 32, g => {
    const gr = g.createRadialGradient(16, 29, 1, 16, 14, 18); gr.addColorStop(0, shade(col, -0.25)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, 0.75));
    g.fillStyle = gr; g.beginPath(); g.moveTo(16, 30); g.bezierCurveTo(2, 22, 3, 6, 12, 3); g.lineTo(16, 8); g.lineTo(20, 3); g.bezierCurveTo(29, 6, 30, 22, 16, 30); g.fill();
    g.strokeStyle = rgba(shade(col, -0.3), 0.5); g.lineWidth = 0.8; g.beginPath(); g.moveTo(16, 28); g.lineTo(16, 12); g.stroke();
  }),
  dome: col => mkSpr('mdo' + col, 256, 176, g => {
    g.globalCompositeOperation = 'lighter';
    g.save(); g.beginPath(); g.ellipse(128, 160, 120, 152, 0, Math.PI, TAU); g.clip();
    const gr = g.createRadialGradient(128, 160, 20, 128, 160, 156); gr.addColorStop(0, rgba(col, 0.08)); gr.addColorStop(0.7, rgba(col, 0.3)); gr.addColorStop(1, rgba(col, 0.95));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 176);
    g.strokeStyle = rgba(col, 0.85); g.lineWidth = 2; // 六角格
    for (let r = 0; r < 9; r++) for (let c = 0; c < 12; c++) {
      const hx = 8 + c * 22 + (r % 2) * 11, hy = 8 + r * 19;
      g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + Math.PI / 6; k ? g.lineTo(hx + Math.cos(a) * 11, hy + Math.sin(a) * 11) : g.moveTo(hx + Math.cos(a) * 11, hy + Math.sin(a) * 11); } g.stroke();
    }
    radial(g, 92, 60, 40, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 1, 0.6);
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(128, 160, 120, 152, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.strokeStyle = rgba(col, 0.9); g.lineWidth = 3; g.beginPath(); g.ellipse(128, 160, 120, 14, 0, 0, TAU); g.stroke();
  }),
  skull: col => mkSpr('mku' + col, 64, 72, g => {
    g.save(); g.shadowColor = col; g.shadowBlur = 12;
    g.fillStyle = vgrad(g, 6, 64, [[0, '#ffffff'], [0.6, '#e4e0f0'], [1, shade(col, 0.4)]]);
    g.beginPath(); g.arc(32, 28, 22, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(46, 46); g.lineTo(44, 60); g.lineTo(20, 60); g.lineTo(18, 46); g.closePath(); g.fill(); g.restore();
    g.fillStyle = '#12061e'; g.beginPath(); g.ellipse(23, 32, 6.5, 7.5, 0.2, 0, TAU); g.ellipse(41, 32, 6.5, 7.5, -0.2, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(32, 40); g.lineTo(28, 47); g.lineTo(36, 47); g.closePath(); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(23, 33, 2.6, 0, TAU); g.arc(41, 33, 2.6, 0, TAU); g.fill();
    g.strokeStyle = '#12061e'; g.lineWidth = 1.6; for (let x = 24; x <= 40; x += 4) { g.beginPath(); g.moveTo(x, 51); g.lineTo(x, 59); g.stroke(); }
    g.beginPath(); g.moveTo(21, 51); g.lineTo(43, 51); g.stroke();
  }),
  wisp: col => mkSpr('mwi' + col, 48, 80, g => {
    const gr = g.createRadialGradient(24, 58, 2, 24, 50, 30); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.4, rgba(col, 0.85)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(24, 76); g.bezierCurveTo(4, 74, 4, 52, 12, 40); g.bezierCurveTo(18, 28, 10, 16, 22, 2); g.bezierCurveTo(24, 18, 34, 22, 38, 38); g.bezierCurveTo(46, 54, 44, 74, 24, 76); g.fill();
    g.fillStyle = 'rgba(20,4,40,0.85)'; g.beginPath(); g.ellipse(18, 58, 2.6, 4, 0, 0, TAU); g.ellipse(30, 58, 2.6, 4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(24, 67, 3, 2, 0, 0, TAU); g.fill();
  }),
  fist: pk => mkSpr('mfi' + pk, 96, 96, g => {
    const P = palOf(pk); g.lineJoin = 'round';
    g.fillStyle = vgrad(g, 30, 70, [[0, P.l], [1, P.c]]); g.strokeStyle = P.d; g.lineWidth = 3;
    g.beginPath(); g.roundRect ? g.roundRect(4, 34, 34, 30, 6) : g.rect(4, 34, 34, 30); g.fill(); g.stroke(); // 前臂
    g.fillStyle = '#ffd860'; g.fillRect(30, 32, 7, 34);
    g.fillStyle = vgrad(g, 20, 76, [[0, '#ffffff'], [0.3, P.l], [1, P.c]]);
    g.beginPath(); g.roundRect ? g.roundRect(34, 20, 50, 54, 16) : g.rect(34, 20, 50, 54); g.fill(); g.stroke();
    g.strokeStyle = rgba(P.d, 0.8); g.lineWidth = 2.4;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(62, 20 + k * 13.5); g.lineTo(84, 20 + k * 13.5); g.stroke(); }
    g.fillStyle = vgrad(g, 56, 76, [[0, P.l], [1, P.c]]); g.strokeStyle = P.d; g.lineWidth = 2.6;
    g.beginPath(); g.ellipse(58, 66, 20, 8, -0.1, 0, TAU); g.fill(); g.stroke();
  }),
  palm: pk => mkSpr('mpa' + pk, 96, 112, g => {
    const P = palOf(pk); g.lineJoin = 'round';
    g.fillStyle = vgrad(g, 0, 112, [[0, '#ffffff'], [0.4, P.l], [1, P.c]]); g.strokeStyle = P.d; g.lineWidth = 3;
    const fing = [[24, 14, 30], [40, 6, 36], [56, 8, 34], [70, 18, 28]];
    g.beginPath(); g.ellipse(48, 74, 30, 32, 0, 0, TAU);
    for (const [fx, fy, h] of fing) { g.moveTo(fx + 7, fy + h); g.roundRect ? g.roundRect(fx - 7, fy, 14, h + 16, 7) : g.rect(fx - 7, fy, 14, h + 16); }
    g.fill(); g.stroke();
    g.beginPath(); g.ellipse(48, 74, 28, 30, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(14, 78, 9, 20, -0.7, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = rgba(P.d, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(48, 70, 16, 0.3, 2.6); g.stroke();
  }),
  wave: pk => mkSpr('mwa' + pk, 256, 160, g => {
    const P = palOf(pk);
    g.fillStyle = vgrad(g, 20, 160, [[0, P.l], [0.3, P.c], [1, rgba(P.d, 0.85)]]);
    g.beginPath(); g.moveTo(0, 160); g.lineTo(0, 112); g.bezierCurveTo(60, 96, 116, 30, 186, 22); g.bezierCurveTo(236, 18, 252, 52, 228, 72);
    g.bezierCurveTo(212, 84, 192, 72, 202, 58); g.bezierCurveTo(176, 72, 196, 124, 256, 140); g.lineTo(256, 160); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(70, 82); g.bezierCurveTo(110, 48, 150, 26, 188, 24); g.bezierCurveTo(232, 22, 246, 52, 228, 68); g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,0.6)';
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(30 + k * 30, 120 - k * 10); g.quadraticCurveTo(60 + k * 30, 100 - k * 14, 90 + k * 34, 104 - k * 16); g.stroke(); }
    g.fillStyle = '#ffffff'; for (let k = 0; k < 14; k++) { const a = k / 14; g.beginPath(); g.arc(150 + a * 90 + Math.sin(k * 3) * 6, 18 + Math.sin(a * 3) * 10 + Math.cos(k) * 6, 2 + (k % 3), 0, TAU); g.fill(); }
  }),
  clock: col => mkSpr('mcl' + col, 256, 256, g => {
    g.globalCompositeOperation = 'lighter'; g.translate(128, 128); g.lineCap = 'round';
    radial(g, 0, 0, 120, [[0, rgba(col, 0.25)], [0.8, rgba(col, 0.12)], [1, rgba(col, 0)]]);
    const pass = fn => { g.strokeStyle = rgba(col, 0.3); g.lineWidth = 8; fn(); g.strokeStyle = rgba(col, 0.95); g.lineWidth = 2.6; fn(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1; fn(); };
    pass(() => { g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.moveTo(104, 0); g.arc(0, 0, 104, 0, TAU); g.moveTo(40, 0); g.arc(0, 0, 40, 0, TAU); g.stroke(); });
    pass(() => { g.beginPath(); for (let k = 0; k < 60; k++) { const a = k / 60 * TAU, l = k % 15 === 0 ? 22 : k % 5 === 0 ? 14 : 5; g.moveTo(Math.cos(a) * 104, Math.sin(a) * 104); g.lineTo(Math.cos(a) * (104 - l), Math.sin(a) * (104 - l)); } g.stroke(); });
    g.font = 'bold 18px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.9)';
    ['XII', 'III', 'VI', 'IX'].forEach((s, k) => { const a = -Math.PI / 2 + k * Math.PI / 2; g.fillText(s, Math.cos(a) * 70, Math.sin(a) * 70); });
  }),
  note: col => mkSpr('mno' + col, 32, 48, g => {
    const body = () => { g.beginPath(); g.ellipse(12, 38, 8, 6, -0.4, 0, TAU); g.moveTo(19, 37); g.lineTo(19, 5); g.moveTo(19, 5); g.quadraticCurveTo(30, 12, 26, 24); g.quadraticCurveTo(26, 16, 19, 14); };
    g.save(); g.shadowColor = col; g.shadowBlur = 6; g.lineJoin = 'round'; g.strokeStyle = '#1a0a24'; g.lineWidth = 5.5; body(); g.stroke();
    g.fillStyle = shade(col, 0.25); g.strokeStyle = shade(col, 0.25); g.lineWidth = 3; body(); g.fill(); g.stroke(); g.restore();
  }),
  bat: (col, f) => mkSpr('mba' + col + f, 64, 36, g => {
    g.fillStyle = '#1a0a24'; g.strokeStyle = rgba(col, 0.9); g.lineWidth = 1.5;
    const wy = f ? 6 : 26;
    g.beginPath(); g.moveTo(32, 16); g.lineTo(4, wy); g.quadraticCurveTo(10, 22, 14, 24); g.quadraticCurveTo(18, 20, 22, 26); g.quadraticCurveTo(26, 21, 32, 24);
    g.quadraticCurveTo(38, 21, 42, 26); g.quadraticCurveTo(46, 20, 50, 24); g.quadraticCurveTo(54, 22, 60, wy); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(32, 20, 6, 8, 0, 0, TAU); g.moveTo(27, 14); g.lineTo(28, 7); g.lineTo(31, 13); g.moveTo(37, 14); g.lineTo(36, 7); g.lineTo(33, 13); g.fill();
    g.fillStyle = '#ff3040'; g.beginPath(); g.arc(29.5, 18, 1.4, 0, TAU); g.arc(34.5, 18, 1.4, 0, TAU); g.fill();
  }),
  eye: pk => mkSpr('mey' + pk, 192, 112, g => {
    const P = palOf(pk); g.translate(96, 56);
    const lid = () => { g.beginPath(); g.moveTo(-88, 0); g.quadraticCurveTo(0, -78, 88, 0); g.quadraticCurveTo(0, 78, -88, 0); g.closePath(); };
    g.save(); g.shadowColor = P.g; g.shadowBlur = 18; g.fillStyle = rgba(shade(P.l, 0.3), 0.95); lid(); g.fill(); g.restore();
    g.save(); lid(); g.clip();
    const ig = g.createRadialGradient(0, 0, 4, 0, 0, 34); ig.addColorStop(0, '#ffffff'); ig.addColorStop(0.25, P.l); ig.addColorStop(0.7, P.c); ig.addColorStop(1, P.d);
    g.fillStyle = ig; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.fill();
    g.fillStyle = '#0a0410'; g.beginPath(); g.ellipse(0, 0, 6, 26, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-12, -12, 6, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = P.d; g.lineWidth = 4; lid(); g.stroke();
  }),
  link: col => mkSpr('mli' + col, 36, 20, g => {
    g.strokeStyle = vgrad(g, 2, 18, [[0, '#ffffff'], [0.5, shade(col, 0.3)], [1, shade(col, -0.5)]]); g.lineWidth = 4.5;
    g.beginPath(); g.roundRect ? g.roundRect(4, 4, 28, 12, 6) : g.rect(4, 4, 28, 12); g.stroke();
  }),
  sun: (pk, black) => mkSpr('msu' + pk + (black ? 'B' : ''), 256, 256, g => {
    const P = palOf(pk); g.translate(128, 128); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, L = k % 2 ? 92 : 124, w = k % 2 ? 0.07 : 0.11, gr = g.createRadialGradient(0, 0, 40, 0, 0, L);
      gr.addColorStop(0, rgba(black ? P.g : P.l, 0.9)); gr.addColorStop(1, rgba(P.c, 0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(Math.cos(a - w) * 40, Math.sin(a - w) * 40); g.quadraticCurveTo(Math.cos(a) * L * 0.6 + 6, Math.sin(a) * L * 0.6, Math.cos(a) * L, Math.sin(a) * L); g.lineTo(Math.cos(a + w) * 40, Math.sin(a + w) * 40); g.fill();
    }
    radial(g, 0, 0, 74, [[0, rgba(black ? P.g : P.l, 0.9)], [0.6, rgba(P.c, 0.5)], [1, rgba(P.c, 0)]]);
    g.globalCompositeOperation = 'source-over';
    const dg = g.createRadialGradient(-12, -12, 4, 0, 0, 50);
    if (black) { dg.addColorStop(0, '#2a0a40'); dg.addColorStop(0.8, '#05000a'); dg.addColorStop(1, '#000000'); }
    else { dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.5, P.l); dg.addColorStop(1, P.c); }
    g.fillStyle = dg; g.beginPath(); g.arc(0, 0, 48, 0, TAU); g.fill();
    g.strokeStyle = black ? P.l : '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 49, 0, TAU); g.stroke();
  }),
  taiji: () => mkSpr('mtj', 192, 192, g => {
    g.translate(96, 96); const R = 84;
    g.save(); g.shadowColor = '#ffe080'; g.shadowBlur = 20; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.restore();
    g.fillStyle = '#120820'; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); g.arc(0, R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true); g.arc(0, -R / 2, R / 2, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, R / 2, R / 7, 0, TAU); g.fill();
    g.fillStyle = '#120820'; g.beginPath(); g.arc(0, -R / 2, R / 7, 0, TAU); g.fill();
    g.strokeStyle = '#ffd860'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  }),
  heart: col => mkSpr('mht' + col, 32, 32, g => {
    g.save(); g.shadowColor = col; g.shadowBlur = 6;
    g.fillStyle = vgrad(g, 4, 30, [[0, shade(col, 0.6)], [1, col]]); g.beginPath(); g.moveTo(16, 29); g.bezierCurveTo(-4, 16, 6, -2, 16, 9); g.bezierCurveTo(26, -2, 36, 16, 16, 29); g.fill(); g.restore();
  }),
  bug: col => mkSpr('mbg' + col, 24, 24, g => {
    g.strokeStyle = '#1a1008'; g.lineWidth = 1.2;
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(12, 9 + k * 4); g.lineTo(12 + s * 9, 6 + k * 6); g.stroke(); }
    g.fillStyle = vgrad(g, 4, 22, [[0, shade(col, 0.4)], [1, shade(col, -0.5)]]); g.beginPath(); g.ellipse(12, 13, 5.5, 8, 0, 0, TAU); g.fill();
    g.fillStyle = '#1a1008'; g.beginPath(); g.arc(12, 5, 3, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.moveTo(12, 6); g.lineTo(12, 21); g.stroke();
  }),
  drop: col => mkSpr('mdr' + col, 16, 24, g => {
    g.fillStyle = vgrad(g, 0, 24, [[0, '#ffffff'], [1, col]]); g.beginPath(); g.moveTo(8, 1); g.quadraticCurveTo(15, 14, 13, 18); g.arc(8, 17, 5.5, 0, Math.PI); g.quadraticCurveTo(1, 14, 8, 1); g.fill();
  }),
  flask: col => mkSpr('mfk' + col, 32, 40, g => {
    g.fillStyle = 'rgba(220,240,255,0.5)'; g.strokeStyle = '#e0f0ff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(12, 4); g.lineTo(20, 4); g.lineTo(20, 14); g.lineTo(28, 30); g.quadraticCurveTo(30, 37, 22, 37); g.lineTo(10, 37); g.quadraticCurveTo(2, 37, 4, 30); g.lineTo(12, 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(8, 24); g.lineTo(24, 24); g.lineTo(28, 31); g.quadraticCurveTo(29, 35, 22, 35); g.lineTo(10, 35); g.quadraticCurveTo(3, 35, 5, 30); g.fill();
    g.fillStyle = '#8a5a30'; g.fillRect(11, 1, 10, 5);
  }),
};
// 招式意象用的小粒子形状（由 drawPartHD 绘制）
const MPART = {
  sakura: q => MS.sakura(q.col), star5: q => MS.star(q.col), skull: q => MS.skull(q.col), wisp: q => MS.wisp(q.col),
  bat: q => MS.bat(q.col, ((q.life * 14) | 0) % 2), note: q => MS.note(q.col), heart: q => MS.heart(q.col), bug: q => MS.bug(q.col), drop: q => MS.drop(q.col),
};
const MPART_ADD = { star5: 1 };
const MPART_K = { sakura: 2.4, star5: 2.6, skull: 3, wisp: 3.2, bat: 3.4, note: 2.6, heart: 2.4, bug: 2, drop: 1.6 };

// ---------- 动画主体（每帧由 drawSpellFxHD 画在主画布上） ----------
function act(o) { o.t0 = now0() + T(o.delay || 0); o.dur = T(o.dur); PFX.actors.push(o); return o; }
const later = (ms, fn) => setTimeout(() => { if (HDFX()) fn(); }, T(ms));
function drawActors(g, now) {
  let n = 0; // 依加入顺序绘制（后加入的在上层），顺便移除已结束的
  for (let i = 0; i < PFX.actors.length; i++) {
    const A = PFX.actors[i], p = (now - A.t0) / Math.max(1, A.dur);
    if (p >= 1) continue;
    PFX.actors[n++] = A;
    if (p < 0) continue;
    try { A.draw(g, p, now); } catch (e) { A.t0 = -1e9; console.warn('motif actor', e); }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; resetX(g);
  }
  PFX.actors.length = n;
}
// 以中心点贴图（可旋转、可翻转）
function spr(g, img, x, y, w, h, ang, a, ax, ay, flip) {
  xform(g, x, y, ang || 0); if (flip) g.scale(1, -1);
  g.globalAlpha = a; g.drawImage(img, -w * (ax ?? 0.5), -h * (ay ?? 0.5), w, h);
}
const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
const lerp = (a, b, t) => a + (b - a) * t;
function pathLen(P) { let L = 0, [px, py] = P(0); for (let k = 1; k <= 24; k++) { const [x, y] = P(k / 24); L += Math.hypot(x - px, y - py); px = x; py = y; } return L; }

// ---- 龙：沿路径飞行的蛇形身躯（身节跟随龙头的轨迹），到达终点后整条龙「灌入」目标 ----
function dragonActor(o) {
  const ts = TS, sz = o.size || 1, r = 0.3 * ts * sz, P = o.P, L = Math.max(ts, pathLen(P));
  const sp = r * 0.6, N = Math.max(10, Math.min(36, Math.round(ts * 3.1 * sz / sp))), gap = sp / L, span = 1 + N * gap;
  const pk = o.pk, Pl = palOf(pk), seg = MS.dseg(pk), fin = MS.dfin(pk), leg = MS.dleg(pk), tail = MS.dtail(pk), head = MS.dhead(pk), glw = SP.glow(Pl.g);
  const tan = s => { const [x0, y0] = P(Math.max(0, s - 0.008)), [x1, y1] = P(Math.min(1, s + 0.008)); return Math.atan2(y1 - y0, x1 - x0); };
  const rad = i => r * (1 - 0.72 * Math.pow(i / N, 1.25));
  const legs = [Math.round(N * 0.18), Math.round(N * 0.5)];
  if (o.onHit) later((o.delay || 0) + o.arr, o.onHit);
  later(o.delay || 0, () => { const [x, y] = P(0); burst(SP.glow(Pl.g), x, y, { r0: 0.3, r1: 1.2 * sz, a: 0.7, dur: 500 }); emit(3, x, y, { speed: [0.2, 0.6], life: [0.6, 0.9], size: [0.3, 0.42], cols: [shade(Pl.d, 0.2)], gravity: -0.3, shape: 'smoke' }); });
  const X = new Float32Array(N + 1), Y = new Float32Array(N + 1), R = new Float32Array(N + 1), NX = new Float32Array(N + 1), NY = new Float32Array(N + 1);
  const A = act({ delay: o.delay, dur: o.arr * span + 40, side: 1, draw(g, p) {
    const S = p * A.dur / A.arrT; let m = 0, first = -1;
    for (let i = 0; i <= N; i++) { const s = S - i * gap; if (s < 0 || s > 1) continue; if (first < 0) first = i; const [x, y] = P(s), a = tan(s); X[m] = x; Y[m] = y; R[m] = rad(i) * Math.min(1, s / 0.05, (1 - s) / 0.04 + 0.25); NX[m] = -Math.sin(a); NY[m] = Math.cos(a); m++; }
    if (m < 2) return;
    const al = (o.alpha ?? 1) * Math.min(1, S / 0.08), ha = Math.atan2(Y[0] - Y[1], X[0] - X[1]);
    A.side += ((Math.cos(ha) < 0 ? -1 : 1) - A.side) * 0.25; const sd = A.side; // 腹侧（随龙头方向平滑翻转）
    // 发光底层
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < m; k += FXK.q < 0.6 ? 6 : 3) { const d = R[k] * 4.4; resetX(g); g.globalAlpha = 0.3 * al; g.drawImage(glw, X[k] - d / 2, Y[k] - d / 2, d, d); }
    g.globalCompositeOperation = 'source-over'; resetX(g); g.globalAlpha = al; g.lineJoin = 'round'; g.lineCap = 'round';
    const tube = (o0, o1, grow) => { g.beginPath(); for (let k = 0; k < m; k++) { const r = R[k] * o0 + grow; g.lineTo(X[k] + NX[k] * r * sd, Y[k] + NY[k] * r * sd); } for (let k = m - 1; k >= 0; k--) { const r = R[k] * o1 - grow; g.lineTo(X[k] + NX[k] * r * sd, Y[k] + NY[k] * r * sd); } g.closePath(); };
    // 背鳍（朝背侧后掠）
    g.fillStyle = Pl.l; g.strokeStyle = shade(Pl.d, -0.3); g.lineWidth = Math.max(1, ts * 0.025); g.beginPath();
    for (let k = 2; k < m - 2; k += 2) { const tx = -NY[k], ty = NX[k], r = R[k], bx = X[k] - NX[k] * r * 0.7 * sd, by = Y[k] - NY[k] * r * 0.7 * sd; g.moveTo(bx + tx * r * 0.45, by + ty * r * 0.45); g.lineTo(bx - NX[k] * r * 1.0 * sd - tx * r * 0.9, by - NY[k] * r * 1.0 * sd - ty * r * 0.9); g.lineTo(bx - tx * r * 0.5, by - ty * r * 0.5); }
    g.fill(); g.stroke();
    // 龙爪
    for (const i of legs) { const k = i - Math.max(0, first); if (k < 1 || k >= m) continue; const a = Math.atan2(Y[k - 1] - Y[k], X[k - 1] - X[k]); xform(g, X[k], Y[k], a); if (sd < 0) g.scale(1, -1); g.globalAlpha = al; const w = r * 1.6; g.drawImage(leg, -w * 0.4, R[k] * 0.2, w, w); }
    resetX(g); g.globalAlpha = al;
    // 尾鬃
    if (first + m - 1 === N) { const k = m - 1, a = Math.atan2(Y[k - 1] - Y[k], X[k - 1] - X[k]); xform(g, X[k], Y[k], a); if (sd < 0) g.scale(1, -1); const w = r * 3.6; g.drawImage(tail, -w * 0.95, -w * 0.35, w, w * 0.7); resetX(g); }
    // 身躯：外框 → 本体 → 背部高光 → 腹甲
    g.fillStyle = shade(Pl.d, -0.45); tube(1, -1, ts * 0.03); g.fill();
    g.fillStyle = Pl.c; tube(1, -1, 0); g.fill();
    g.fillStyle = rgba(Pl.l, 0.85); tube(-0.15, -0.72, 0); g.fill();
    g.fillStyle = rgba(shade(Pl.l, 0.3), 0.95); tube(0.88, 0.3, 0); g.fill();
    // 腹甲横纹 + 背上鳞纹
    g.strokeStyle = rgba(Pl.d, 0.55); g.lineWidth = Math.max(0.8, ts * 0.018); g.beginPath();
    for (let k = 1; k < m; k += 2) { const r = R[k]; g.moveTo(X[k] + NX[k] * r * 0.32 * sd, Y[k] + NY[k] * r * 0.32 * sd); g.lineTo(X[k] + NX[k] * r * 0.86 * sd, Y[k] + NY[k] * r * 0.86 * sd); }
    for (let k = 2; k < m - 1; k += 2) { const r = R[k], tx = -NY[k], ty = NX[k], cx0 = X[k] - NX[k] * r * 0.2 * sd, cy0 = Y[k] - NY[k] * r * 0.2 * sd; g.moveTo(cx0 - NX[k] * r * 0.35 * sd + tx * r * 0.3, cy0 - NY[k] * r * 0.35 * sd + ty * r * 0.3); g.lineTo(cx0 - tx * r * 0.15, cy0 - ty * r * 0.15); g.lineTo(cx0 + NX[k] * r * 0.35 * sd + tx * r * 0.3, cy0 + NY[k] * r * 0.35 * sd + ty * r * 0.3); }
    g.stroke();
    if (first === 0) { // 龙头
      const w = ts * 1.32 * sz, fl = Math.cos(ha) < 0;
      spr(g, head, X[0], Y[0], w, w * 0.7, ha, al * Math.min(1, S / 0.06), 0.2, 0.53, fl);
      if (Math.random() < 0.5) emit(1, X[0], Y[0], { speed: [0.2, 0.8], life: [0.25, 0.45], size: [0.03, 0.05], cols: [Pl.l, '#ffffff'], shape: 'spark' });
    }
  } });
  A.arrT = T(o.arr);
  return A;
}
// 曲线工具
const coilPath = (X0, Y0, x, y, R, th0, turns, sky) => s => {
  const e = Math.pow(s, 1.5), a = th0 + s * TAU * turns, k = R * (1 - e);
  return [lerp(X0, x, e) + Math.cos(a) * k, lerp(Y0 - sky, y, e) + Math.sin(a) * k * 0.5];
};
function swoopPath(ax, ay, bx, by, side, amp) {
  const c1x = ax + side * TS * 1.6, c1y = ay - TS * 3, c2x = bx - side * TS * 2, c2y = by - TS * 2.6;
  return s => { const w = Math.sin(Math.PI * s) * (amp || 0.35) * TS; return [bz(ax, c1x, c2x, bx, s) + Math.sin(s * 9.4) * w * 0.6, bz(ay, c1y, c2y, by, s) + Math.cos(s * 9.4) * w * 0.45]; };
}
function linePath(ax, ay, bx, by, amp) {
  const L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L, ny = (bx - ax) / L;
  return s => { const w = Math.sin(s * Math.PI * 2.4) * (amp || 0.45) * TS * Math.sin(Math.PI * Math.min(1, s * 1.15)); return [lerp(ax, bx, s) + nx * w, lerp(ay, by, s) + ny * w - Math.sin(Math.PI * s) * TS * 0.5]; };
}
// ---- 凤凰：振翅飞翔，身后拖着火焰 ----
function phoenixActor(o) {
  const ts = TS, sz = o.size || 1, pk = o.pk, Pl = palOf(pk), body = MS.phx(pk), wing = MS.wing(pk), glow = glowOf('ph' + pk, body, Pl.g, 10), P = o.P;
  if (o.onHit) later((o.delay || 0) + o.arr, o.onHit);
  const A = act({ delay: o.delay, dur: o.arr * 1.55, draw(g, p, now) {
    const S = p * A.dur / A.arrT, [x, y] = P(S), [x1, y1] = P(S + 0.01), a = Math.atan2(y1 - y, x1 - x), fl = Math.cos(a) < 0;
    const al = Math.min(1, S / 0.12, S > 1.2 ? (1.55 - S) / 0.35 : 1) * (o.alpha ?? 1);
    const W = ts * 2 * sz, H = W * 0.625, k = W / 256, fa = Math.sin(now / 75 + (o.ph || 0));
    g.globalCompositeOperation = 'lighter'; const d = W * 1.5; resetX(g); g.globalAlpha = FXK.q < 0.55 ? 0 : al * 0.45; g.drawImage(SP.glow(Pl.g), x - d / 2, y - d / 2, d, d);
    xform(g, x, y, a); if (fl) g.scale(1, -1); g.globalAlpha = al * 0.55; g.drawImage(glow, -W * 0.52 - 40 * k, -H * 0.54 - 40 * k, W + 80 * k, H + 80 * k);
    const wingAt = (ox, oy, f, al2) => { xform(g, x, y, a); if (fl) g.scale(1, -1); g.translate((128 - 134 + ox) * k, (74 - 86 + oy) * k); g.scale(1, f); g.globalAlpha = al2; const ww = W * 0.95, wh = ww * 160 / 220; g.drawImage(wing, -ww * 0.636, -wh * 0.9375, ww, wh); };
    g.globalCompositeOperation = 'source-over';
    wingAt(-14, -4, 0.3 + 0.7 * fa, al * 0.7);
    xform(g, x, y, a); if (fl) g.scale(1, -1); g.globalAlpha = al; g.drawImage(body, -W * 0.52, -H * 0.54, W, H);
    wingAt(0, 0, 0.3 + 0.7 * fa, al);
    if (S < 1.25) emit(2, x - Math.cos(a) * W * 0.4, y - Math.sin(a) * W * 0.4, { speed: [0.2, 0.7], life: [0.3, 0.5], size: [0.12, 0.2], cols: ['#fff'], shape: pk === 'fire' ? 'flame' : 'glow', gravity: -1 });
  } });
  A.arrT = T(o.arr);
  return A;
}
// ---- 落下物：流星、星、剑、枪、箭、拳、炮弹（可先在空中显形） ----
function fallerActor(o) {
  const ts = TS, Pl = palOf(o.pk), sz = o.size || 1, hov = o.comet ? Math.min(90, o.hover || 0) : o.hover || 0, fall = (o.fall || 300) * (o.comet ? 1.5 : 1), stick = o.stick || 0;
  const x0 = o.x + (o.dx || 0) * ts, y0 = o.y + (o.dy ?? -4) * ts, x1 = o.x, y1 = o.y + (o.ty || 0) * ts, ang = Math.atan2(y1 - y0, x1 - x0);
  const img = o.kind === 'sword' ? MS.sword(o.pk) : o.kind === 'spear' ? MS.spear(o.pk) : o.kind === 'arrow' ? MS.arrow(o.pk) : o.kind === 'star' ? MS.star(Pl.g) : o.kind === 'fist' ? MS.fist(o.pk) : null;
  const gl = img && o.kind !== 'star' ? glowOf(o.kind + o.pk, img, Pl.g, 8) : null;
  if (o.onHit) later((o.delay || 0) + hov + fall, o.onHit);
  o.landT = hov + fall;
  return act({ delay: o.delay, dur: hov + fall + stick + 20, draw(g, p, now) {
    const t = p * this.dur, q = clamp01((t - hov) / fall), e = q * q, x = lerp(x0, x1, e), y = lerp(y0, y1, e);
    const ain = hov ? clamp01(t / (hov * 0.6)) : clamp01(t / 60), aout = t > hov + fall ? 1 - clamp01((t - hov - fall) / Math.max(1, stick)) : 1, al = ain * aout;
    if (o.kind === 'meteor' || o.kind === 'star' || o.kind === 'arrow' || o.kind === 'cannon') {
      if (q >= 1) return;
      const met = o.kind === 'meteor', L = ts * (o.kind === 'arrow' ? 1.4 : met ? 3.2 : 2.6) * sz * Math.min(1, q * 4 + 0.2), w = ts * (met ? 0.8 : o.kind === 'cannon' ? 0.4 : 0.24) * sz;
      g.globalCompositeOperation = 'lighter';
      xform(g, x, y, ang); g.globalAlpha = al * 0.9; g.drawImage(SP.streak(Pl.g), -L, -w / 2, L, w); if (met) { g.globalAlpha = al * 0.8; g.drawImage(SP.streak(Pl.c), -L * 0.85, -w * 0.32, L * 0.85, w * 0.64); } g.globalAlpha = al; g.drawImage(SP.streak('#ffffff'), -L * 0.7, -w * 0.14, L * 0.7, w * 0.28);
      if (met || o.kind === 'cannon') {
        const d = ts * (met ? 1.5 : 1.1) * sz; resetX(g); g.globalAlpha = al; g.drawImage(SP.glow(o.kind === 'cannon' ? '#ff9040' : Pl.g), x - d, y - d, d * 2, d * 2);
        g.globalCompositeOperation = 'source-over'; const rd = ts * (o.kind === 'cannon' ? 0.36 : 0.46) * sz;
        spr(g, o.kind === 'cannon' ? SP.rock('#2a2a30', 1) : SP.rock(o.pk === 'dark' ? '#4a2a6a' : '#6a3a20', 2), x, y, rd, rd, now / 90, al);
        g.globalCompositeOperation = 'lighter'; resetX(g); g.globalAlpha = al * 0.85; g.drawImage(SP.core(o.kind === 'cannon' ? '#ffb060' : Pl.c), x - d * 0.4, y - d * 0.4, d * 0.8, d * 0.8);
        if (Math.random() < 0.8) emit(met ? 2 : 1, x, y, { speed: [0.1, 0.5], life: [0.25, 0.45], size: [0.14, 0.24], cols: ['#fff'], shape: o.pk === 'dark' ? 'glow' : 'flame', gravity: -0.5 });
      } else if (o.kind === 'star') { const d = ts * 0.75 * sz; spr(g, img, x, y, d, d, now / 120, al); }
      else { const d = ts * 0.95 * sz; g.globalCompositeOperation = 'source-over'; spr(g, img, x, y, d, d / 6, ang, al); }
      return;
    }
    // 兵器：显形（微微浮动）→ 刺落 → 插在地上淡出
    const len = ts * (o.kind === 'spear' ? 1.9 : o.kind === 'fist' ? 1.0 : 1.35) * sz, hh = o.kind === 'fist' ? len : len * (o.kind === 'spear' ? 0.2 : sz > 1.5 ? 0.32 : 0.25);
    const bob = t < hov ? Math.sin(t / 60) * ts * 0.04 : 0, tipX = x - Math.cos(ang) * len * 0.92, tipY = y - Math.sin(ang) * len * 0.92 + bob;
    g.globalCompositeOperation = 'lighter';
    if (gl) { xform(g, tipX, tipY, ang); g.globalAlpha = al * (t < hov ? 0.9 : 0.6); const pw = len * gl.width / img.width, ph = hh * gl.height / img.height; g.drawImage(gl, -(pw - len) / 2, -ph / 2, pw, ph); }
    if (q > 0 && q < 1) { xform(g, tipX, tipY, ang); g.globalAlpha = al * 0.8; g.drawImage(SP.streak(Pl.g), -len * 1.2, -hh * 0.4, len * 1.4, hh * 0.8); }
    if (o.comet && t >= hov * 0.5 && q < 1) { const cl = len * 2.4, cw = ts * 0.55 * sz; xform(g, x, y, ang); g.globalAlpha = al * 0.85; g.drawImage(SP.streak(Pl.g), -cl, -cw / 2, cl, cw); g.drawImage(SP.streak('#ffffff'), -cl * 0.6, -cw * 0.15, cl * 0.6, cw * 0.3); const d = ts * 0.9 * sz; resetX(g); g.drawImage(SP.core(Pl.g), x - d / 2, y - d / 2, d, d); }
    g.globalCompositeOperation = 'source-over'; xform(g, tipX, tipY, ang); g.globalAlpha = al; g.drawImage(img, 0, -hh / 2, len, hh);
    if (t < hov && Math.random() < 0.4) emit(1, tipX + Math.cos(ang) * len * Math.random(), tipY + Math.sin(ang) * len * Math.random(), { speed: [0.1, 0.4], life: [0.25, 0.4], size: [0.03, 0.05], cols: [Pl.l, '#ffffff'], shape: 'spark' });
  } });
}
// ---- 横扫的巨大兵器（剑、斧、枪） ----
function sweepActor(o) {
  const ts = TS, Pl = palOf(o.pk), sz = o.size || 1, L = ts * (o.kind === 'spear' ? 1.9 : 1.65) * sz, img = o.kind === 'spear' ? MS.spear(o.pk) : o.kind === 'axe' ? MS.axe(o.pk) : MS.sword(o.pk), gl = glowOf((o.kind || 'sword') + o.pk, img, Pl.g, 8);
  const hov = o.hover ?? 140, sw = o.swing ?? 220, px = o.x + (o.px ?? -0.15) * ts, py = o.y + (o.py ?? 0.55) * ts, a0 = o.a0 ?? -2.6, a1 = o.a1 ?? -0.35;
  if (o.onHit) later((o.delay || 0) + hov + sw * 0.55, o.onHit);
  return act({ delay: o.delay, dur: hov + sw + 260, draw(g, p) {
    const t = p * this.dur, q = easeOut(clamp01((t - hov) / sw)), a = lerp(a0, a1, q), al = clamp01(t / (hov * 0.7 + 1)) * (t > hov + sw ? 1 - clamp01((t - hov - sw) / 260) : 1), hh = L * img.height / img.width;
    // 刀光轨迹（加色弧带）
    if (q > 0) {
      g.globalCompositeOperation = 'lighter'; resetX(g); g.lineCap = 'round';
      for (const [wk, col, k] of [[0.3, Pl.g, 0.32], [0.13, Pl.l, 0.7], [0.045, '#ffffff', 0.95]]) {
        const fade = t > hov + sw ? 1 - clamp01((t - hov - sw) / 200) : 1; g.globalAlpha = k * fade; g.strokeStyle = col; g.lineWidth = L * wk;
        g.beginPath(); g.arc(px, py, L * 0.72, a0, a, a1 < a0); g.stroke();
      }
    }
    g.globalCompositeOperation = 'lighter'; xform(g, px, py, a); g.globalAlpha = al * 0.7; const pw = L * gl.width / img.width, ph = hh * gl.height / img.height; g.drawImage(gl, -(pw - L) / 2, -ph / 2, pw, ph);
    g.globalCompositeOperation = 'source-over'; xform(g, px, py, a); g.globalAlpha = al; g.drawImage(img, 0, -hh / 2, L, hh);
    if (o.trail === 'flame' || o.trail === 'star') { // 剑身上的火焰 / 霜气
      g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) { const f = 0.32 + k * 0.12, bx = px + Math.cos(a) * L * f, by = py + Math.sin(a) * L * f, fl = 0.8 + 0.4 * Math.sin(p * 40 + k * 2.1), d = L * 0.22 * fl * (1 - k * 0.06);
        if (o.trail === 'flame') { resetX(g); g.globalAlpha = al * 0.9; g.drawImage(SP.flame(k % 3), bx - d * 0.4, by - d * 0.9, d * 0.8, d * 1.1); }
        else { resetX(g); g.globalAlpha = al * 0.7; g.drawImage(SP.flare('#c8f0ff'), bx - d * 0.4, by - d * 0.4, d * 0.8, d * 0.8); } }
    }
    if (q > 0 && q < 1 && o.trail) { const k = Math.random(), ex = px + Math.cos(a) * L * (0.4 + 0.6 * k), ey = py + Math.sin(a) * L * (0.4 + 0.6 * k); emit(o.trail === 'flame' ? 2 : 1, ex, ey, { speed: [0.3, 1], life: [0.3, 0.5], size: o.trail === 'flame' ? [0.12, 0.2] : [0.05, 0.08], cols: o.trail === 'flame' ? ['#fff'] : [Pl.l, '#ffffff', Pl.c], shape: o.trail, gravity: o.trail === 'flame' ? -1.5 : 0.5, drag: 0.8 }); }
  } });
}
// ---- 直线飞行（剑、枪、箭、拳、瓶） ----
function flyActor(o) {
  const ts = TS, Pl = palOf(o.pk), sz = o.size || 1, img = o.kind === 'spear' ? MS.spear(o.pk) : o.kind === 'arrow' ? MS.arrow(o.pk) : o.kind === 'fist' ? MS.fist(o.pk) : o.kind === 'palm' ? MS.palm(o.pk) : o.kind === 'flask' ? MS.flask(Pl.c) : MS.sword(o.pk);
  const len = ts * (o.kind === 'spear' ? 1.9 : o.kind === 'arrow' ? 1.0 : o.kind === 'fist' || o.kind === 'palm' ? 0.9 : o.kind === 'flask' ? 0.45 : 1.3) * sz, hh = len * img.height / img.width;
  const gl = o.kind === 'flask' ? null : glowOf(o.kind + o.pk, img, Pl.g, 8), hov = o.hover || 0, fly = o.fly || 220, ang = Math.atan2(o.y1 - o.y0, o.x1 - o.x0);
  if (o.onHit) later((o.delay || 0) + hov + fly * (o.hitAt ?? 1), o.onHit);
  return act({ delay: o.delay, dur: hov + fly + (o.tail ?? 120), draw(g, p, now) {
    const t = p * this.dur, q = clamp01((t - hov) / fly), e = o.ease === 'in' ? q * q : q, arc = o.arc ? Math.sin(Math.PI * q) * o.arc * ts : 0;
    const x = lerp(o.x0, o.x1, e), y = lerp(o.y0, o.y1, e) - arc, al = clamp01(t / (hov ? hov * 0.6 : 50)) * (t > hov + fly ? 1 - clamp01((t - hov - fly) / (o.tail ?? 120)) : 1);
    const a = o.kind === 'flask' ? now / 80 : o.kind === 'palm' ? 0 : ang, back = o.kind === 'palm' || o.kind === 'flask' ? 0.5 : 0.92;
    const hx = x - Math.cos(a) * len * back, hy = y - Math.sin(a) * len * back;
    if (q > 0 && q < 1 && o.kind !== 'flask') { g.globalCompositeOperation = 'lighter'; xform(g, x, y, ang); g.globalAlpha = al * 0.85; g.drawImage(SP.streak(Pl.g), -len * 2.2, -hh * 0.45, len * 2.2, hh * 0.9); }
    if (gl) { g.globalCompositeOperation = 'lighter'; xform(g, hx, hy, a); g.globalAlpha = al * 0.7; const pw = len * gl.width / img.width, ph = hh * gl.height / img.height; g.drawImage(gl, -(pw - len) / 2, -(ph - hh) / 2 - hh / 2, pw, ph); }
    g.globalCompositeOperation = 'source-over'; xform(g, hx, hy, a); g.globalAlpha = al; g.drawImage(img, 0, -hh / 2, len, hh);
    if (o.trail && q > 0 && q < 1) emit(1, x, y, { speed: [0.1, 0.5], life: [0.25, 0.4], size: o.trail === 'flame' ? [0.12, 0.18] : [0.04, 0.07], cols: o.trail === 'flame' ? ['#fff'] : [Pl.l, Pl.c, '#ffffff'], shape: o.trail });
  } });
}
// ---- 定点浮现的图样（月、日、眼、钟、太极、屏障、骷髅……） ----
function popActor(o) {
  return act({ delay: o.delay, dur: o.dur, draw(g, p, now) {
    const ip = o.in ?? 0.2, op = o.out ?? 0.3, k = p < ip ? easeBack(p / ip) : 1, al = (p < ip ? clamp01(p / ip * 1.5) : p > 1 - op ? (1 - p) / op : 1) * (o.a ?? 1);
    if (al <= 0.01) return;
    o.paint(g, p, now, k, al);
  } });
}
// 以中心与大小贴图（加色或一般）
function blit(g, img, x, y, w, h, ang, al, add, ay) { if (add && FXK.q < 0.55 && img.key && img.key[0] === 'g' && img.key[1] === 'l') return; // 掉帧时省掉大片光晕
  g.globalCompositeOperation = add ? 'lighter' : 'source-over'; xform(g, x, y, ang || 0); g.globalAlpha = al; g.drawImage(img, -w / 2, -h * (ay ?? 0.5), w, h); }
// 分身：施法者精灵染成暗影色
const SHADE_SPR = new WeakMap();
function shadowOf(src, col) {
  let m = SHADE_SPR.get(src); if (!m) SHADE_SPR.set(src, (m = {}));
  if (m[col]) return m[col];
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(col, 0.82); x.fillRect(0, 0, c.width, c.height);
  return (m[col] = c);
}
function unitImg(u) { try { return (typeof unitSpriteHD === 'function' && unitSpriteHD(u)) || (typeof unitSprite === 'function' ? unitSprite(u) : null); } catch (e) { return null; } }
function summonImg(kind, u) {
  try {
    const cls = (typeof KIND_ALIAS !== 'undefined' && KIND_ALIAS[kind]) || kind; if (!CLASSES[cls]) return null;
    const lv = Math.max(1, u.lv || 1), fake = { cls, lv, tier: tierForLevel(cls, lv), team: u.team, path: 'a', status: {}, buffs: [], weapon: null, armor: null };
    return unitImg(fake);
  } catch (e) { return null; }
}

// ---------- 构图：每种意象依目标形状（单体、范围、直线、自身、友方）与强度组合 ----------
const byNear = (C, x, y) => C.pts.slice().sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
// 命中（叠加模式下由原本流程负责命中，这里只演意象）
function hitAt(C, px, py, minor, delay) {
  later(delay, () => {
    if (C.overlay) return;
    if (minor) { hitSparkHD(px, py, [C.P.l, '#ffffff', C.P.c]); return; }
    const f = IMPACT_HD[C.el]; if (f) f(px, py, C.big, C.v); else hitSparkHD(px, py, [C.P.l, '#ffffff', C.P.c]);
    if (C.phys) hitSparkHD(px, py, ['#ffffff', C.P.l, C.P.c]);
  });
}
function hitAll(C, delay, step, ox, oy) { byNear(C, ox ?? C.x, oy ?? C.y).forEach(([px, py], k) => hitAt(C, px, py, 0, delay + k * (step || 0))); }
function shockAt(C, x, y, k) { burst(SP.core(C.P.g), x, y, { r0: 0.3, r1: 1.3 * (k || 1), dur: 300, fin: 0.04 }); burst(SP.burst(C.P.g), x, y, { r0: 0.4, r1: 1.8 * (k || 1), a: 0.7, spin: 1, dur: 520, fin: 0.05 }); ring(x, y + TS * 0.25, 0.2, 1.4 * (k || 1), C.P.g, 460, { flat: true }); }
const mwait = (C, ms) => (C.overlay ? Promise.resolve() : wait(ms));
const trailOf = pk => (pk === 'fire' ? 'flame' : pk === 'ice' || pk === 'water' ? 'star' : 'spark');
const MOTIF = {
  async dragon(C) {
    const n = C.n || 1, pk = C.mo.dpk || (C.pk === 'steel' ? 'jade' : C.pk), sz = (n >= 6 ? 0.66 : n >= 3 ? 0.76 : n === 2 ? 0.88 : 1) * (C.ult ? 1.12 : 1) * (C.mo.size || 1);
    const arr = C.overlay ? 330 : n > 4 ? 520 : n > 1 ? 560 : 500;
    sfx('wind'); let last = 0;
    if (C.shape === 'line') {
      const [ex, ey] = C.pts[C.pts.length - 1], a = C.ang, A = arr + 120, L = Math.hypot(ex - C.cx, ey - C.cy) + TS * 1.7;
      for (let k = 0; k < n; k++) dragonActor({ P: linePath(C.cx - Math.cos(a) * TS * 0.8, C.cy - Math.sin(a) * TS * 0.8 - TS * 0.3, ex + Math.cos(a) * TS * 0.9, ey + Math.sin(a) * TS * 0.9, k % 2 ? -0.5 : 0.5), pk, size: sz, arr: A, delay: k * 90 });
      C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, A * (Math.hypot(px - C.cx, py - C.cy) + TS * 0.8) / L));
      last = A;
    } else if (n > 1 || C.pts.length > 1) {
      const R = TS * (1.5 + Math.min(2, C.spread) * 0.45), sky = TS * 3.2;
      if (n === 1) {
        const A = arr + 120; dragonActor({ P: coilPath(C.x, C.y, C.x, C.y, R * 1.25, -Math.PI * 0.9, 1.15, sky), pk, size: sz * 1.15, arr: A });
        hitAll(C, A, 22); later(A, () => shockAt(C, C.x, C.y, 1 + C.spread * 0.4)); last = A + C.pts.length * 22;
      } else {
        for (let k = 0; k < n; k++) {
          const [px, py] = C.pts[k % C.pts.length], d = k * (n > 4 ? 26 : 70);
          dragonActor({ P: coilPath(C.x, C.y, px, py, R, k / n * TAU - Math.PI / 2, 0.8, sky), pk, size: sz, arr, delay: d });
          hitAt(C, px, py, k >= C.pts.length, d + arr); last = Math.max(last, d + arr);
        }
        for (let i = n; i < C.pts.length; i++) hitAt(C, C.pts[i][0], C.pts[i][1], 0, last);
      }
    } else {
      for (let k = 0; k < n; k++) { const side = (C.x >= C.cx ? 1 : -1) * (k ? -1 : 1); dragonActor({ P: swoopPath(C.cx, C.cy - TS * 0.3, C.x, C.y, side), pk, size: sz, arr, delay: k * 80 }); }
      hitAt(C, C.x, C.y, 0, arr); later(arr, () => shockAt(C, C.x, C.y, 0.8)); last = arr + (n - 1) * 80;
    }
    C.hitT = last; await mwait(C, last + 70);
  },
  async phoenix(C) {
    const n = C.n || 1, pk = C.mo.dpk || (C.pk === 'steel' || C.pk === 'holy' ? 'fire' : C.pk), arr = C.overlay ? 360 : 520;
    sfx('fire');
    for (let k = 0; k < n; k++) {
      const side = (C.x >= C.cx ? 1 : -1) * (k ? -1 : 1), sw = swoopPath(C.cx, C.cy - TS * 0.4, C.x, C.y - TS * 0.2, side, 0.1);
      phoenixActor({ P: s => (s <= 1 ? sw(s) : [C.x + (s - 1) * side * TS * 2.6, C.y - TS * 0.2 - (s - 1) * TS * 4.2]), pk, size: (C.ult ? 1.3 : 1.1) * (n > 1 ? 0.88 : 1), arr, delay: k * 90, ph: k * 2 });
    }
    hitAll(C, arr + (n - 1) * 90, 25);
    later(arr, () => { shockAt(C, C.x, C.y, 1 + C.spread * 0.4); PFX.pillars.push({ x: C.x, y: C.y + TS * 0.3, w: 0.8, color: C.P.g, t0: now0(), dur: T(560) }); emit(8, C.x, C.y, { speed: [0.4, 1.2], life: [0.8, 1.2], size: [0.1, 0.14], cols: [C.P.l, C.P.c], gravity: -0.8, drag: 0.7, shape: 'feather', spin: 4, sway: 1.2, jitter: 0.5 }); });
    C.hitT = arr; await mwait(C, arr + (n - 1) * 90 + 80);
  },
  async rain(C) {
    const kind = C.mo.head || 'meteor', N = C.pts.length;
    const base = N === 1 ? { meteor: 3, star: 5, sword: 3, spear: 3, arrow: 5, cannon: 2, fist: 2 }[kind] : { meteor: 1, star: 2, sword: 2, spear: 1, arrow: 3, cannon: 1, fist: 1 }[kind];
    let per = C.n > 1 ? Math.max(1, Math.min(4, Math.round(C.n / N))) : base; per = Math.max(1, Math.min(per, Math.floor(30 / N)));
    const spread = (C.overlay ? 120 : 230) + (C.ult ? 90 : 0), hov = kind === 'sword' || kind === 'spear' ? (C.overlay ? 120 : 200) : kind === 'fist' ? 120 : 0;
    const fall = { meteor: 320, star: 250, arrow: 190, sword: 170, spear: 170, cannon: 330, fist: 160 }[kind];
    const sz = { meteor: 0.75 + C.v * 0.35 + (C.ult ? 0.25 : 0), star: 0.7, arrow: 0.85, sword: 0.95, spear: 0.95, cannon: 0.8, fist: 1.1 }[kind] * (C.mo.size || 1);
    sfx(kind === 'arrow' ? 'arrow' : kind === 'sword' || kind === 'spear' ? 'slash' : 'magic');
    let last = 0;
    C.pts.forEach(([px, py], i) => {
      for (let j = 0; j < per; j++) {
        const d = j === 0 ? Math.min(spread, i * 28) : rand(0, spread), jx = j ? rand(-0.32, 0.32) * TS : 0, jy = j ? rand(-0.25, 0.25) * TS : 0;
        const o = { kind, pk: C.mo.hpk || C.pk, x: px + jx, y: py + jy, delay: d, hover: hov, fall, size: sz * (j && N === 1 ? 0.75 : 1) * (C.mo.comet && kind !== 'meteor' ? 1.2 : 1), comet: C.mo.comet && kind !== 'meteor' };
        if (kind === 'meteor') Object.assign(o, { dx: 1.5 + rand(-0.3, 0.3), dy: -4.3 });
        else if (kind === 'star') Object.assign(o, { dx: 0.9, dy: -4 });
        else if (kind === 'arrow') Object.assign(o, { dx: 1.1 + rand(-0.15, 0.15), dy: -3.4 });
        else if (kind === 'cannon') Object.assign(o, { dx: (C.cx - px) / TS * 0.4 + 0.6, dy: -3.2 });
        else if (kind === 'fist') Object.assign(o, { dx: 0, dy: -3, ty: -0.1 });
        else if (o.comet) Object.assign(o, { dx: 1.3 + rand(-0.2, 0.2), dy: -3.6, ty: 0.2, stick: 260 });
        else Object.assign(o, { dx: rand(-0.2, 0.2), dy: -2.4, ty: 0.2, stick: 320 });
        if (kind === 'meteor' || kind === 'cannon') o.onHit = () => { const k = j ? 0.6 : 1; burst(SP.core('#ffd090'), o.x, o.y, { r0: 0.3, r1: 1.1 * k * sz, dur: 280, fin: 0.04 }); emit(10 * k, o.x, o.y + TS * 0.2, { angle: -Math.PI / 2, spread: 1.2, speed: [1.2, 3], life: [0.4, 0.7], size: [0.05, 0.1], cols: ELEM.rock.cols, gravity: 6, drag: 0.92, shape: 'rock', spin: 8 }); ring(o.x, o.y + TS * 0.25, 0.2, 1.1 * sz, '#ffb060', 420, { flat: true }); };
        if (kind === 'spear' && C.pk === 'bolt') o.onHit = () => PFX.bolts.push({ x: o.x, y: o.y, color: '#fff6a0', t0: now0(), dur: T(300) });
        fallerActor(o); hitAt(C, o.x, o.y, j > 0, d + o.landT); last = Math.max(last, d + o.landT);
      }
    });
    if (C.ult) later(last, () => { flash(C.P.g, 0.4, 300); shakeStage(0.9); sfx('boom'); });
    C.hitT = last; await mwait(C, last + 60);
  },
  async sword(C) {
    const st = C.sp.style, pk = C.pk, n = C.n || 1, wk = C.mo.w || (/斧/.test(C.sp.name) ? 'axe' : 'sword');
    if (C.mo.giant) {
      const sz = 2.3 + (C.ult ? 0.4 : 0) + C.spread * 0.3;
      fallerActor({ kind: 'sword', pk, x: C.x, y: C.y, dx: 0, dy: -2.8 - sz * 0.4, ty: 0.25, hover: C.overlay ? 140 : 240, fall: 150, stick: 420, size: sz, onHit: () => { shockAt(C, C.x, C.y, 1.2 + C.spread * 0.4); shakeStage(0.8); for (let k = 0; k < 5; k++) burst(SP.spike(C.P.c), C.x + (k - 2) * TS * 0.35, C.y + TS * 0.45, { r0: 0, r1: rand(0.35, 0.55), asp: 0.5, ay: 1, mode: 'grow', add: false, dur: 520, fin: 0.02, delay: Math.abs(k - 2) * 30 }); } });
      const h = (C.overlay ? 140 : 240) + 150; hitAll(C, h, 18); C.hitT = h; return mwait(C, h + 80);
    }
    if (st === 'rain' || st === 'volley' || (!C.phys && C.pts.length > 1 && C.shape !== 'line') || (n >= 9 && C.pts.length > 1)) return MOTIF.rain(Object.assign({}, C, { mo: Object.assign({}, C.mo, { head: 'sword' }) }));
    if (st === 'feathers') { // 飞刀 / 手里剑：数把小刀射向目标
      C.pts.slice(0, 6).forEach(([px, py], i) => { for (let k = 0; k < 2; k++) flyActor({ kind: 'sword', pk, x0: C.cx, y0: C.cy - TS * 0.1, x1: px + rand(-0.15, 0.15) * TS, y1: py + rand(-0.15, 0.15) * TS, fly: 200, delay: i * 30 + k * 70, size: 0.55, tail: 80 }); });
      hitAll(C, 220, 30); C.hitT = 220; return mwait(C, 340);
    }
    if (st === 'spin' || C.sp.around) { // 环绕施法者旋转的飞剑 / 战斧 / 长枪
      const k = Math.max(2, Math.min(6, n > 1 ? n : wk === 'sword' ? 3 : 2)), R = TS * ((C.sp.area || 1) * 0.9 + 0.2), img = wk === 'axe' ? MS.axe(pk) : wk === 'spear' ? MS.spear(pk) : MS.sword(pk), gl = glowOf(wk + pk, img, C.P.g, 8);
      popActor({ dur: 560, in: 0.15, out: 0.3, paint: (g, p, now, s, al) => { const L = TS * (wk === 'spear' ? 1.5 : 1.05), hh = L * img.height / img.width; for (let i = 0; i < k; i++) { const a = i / k * TAU + p * TAU * 1.3, x = C.cx + Math.cos(a) * R, y = C.cy + Math.sin(a) * R * 0.55; blit(g, gl, x, y, L * gl.width / img.width, hh * gl.height / img.height, a + Math.PI / 2, al * 0.6, true); g.globalCompositeOperation = 'source-over'; xform(g, x, y, a + Math.PI / 2); g.globalAlpha = al; g.drawImage(img, -L / 2, -hh / 2, L, hh); } } });
      hitAll(C, 220, 30, C.cx, C.cy); C.hitT = 220; return mwait(C, 420);
    }
    if (C.mo.fly || C.shape === 'line' || st === 'dash' || st === 'charge' || st === 'thrust' || st === 'pierce') { // 飞剑贯穿
      const [ex, ey] = C.pts[C.pts.length - 1] || [C.x, C.y], a = Math.atan2(ey - C.cy, ex - C.cx), k = Math.max(1, Math.min(4, n > 1 ? n : C.ult ? 3 : 1)), F = 230 + C.pts.length * 20;
      for (let i = 0; i < k; i++) { const off = (i - (k - 1) / 2) * TS * 0.3; flyActor({ kind: 'sword', pk, x0: C.cx - Math.cos(a) * TS * 0.4 - Math.sin(a) * off, y0: C.cy - Math.sin(a) * TS * 0.4 + Math.cos(a) * off - TS * 0.2, x1: ex + Math.cos(a) * TS * 1.2, y1: ey + Math.sin(a) * TS * 1.2, hover: C.overlay ? 80 : 140, fly: F, delay: i * 70, size: 1.1, trail: trailOf(pk) }); }
      const H = C.overlay ? 80 : 140, L = Math.hypot(ex - C.cx, ey - C.cy) + TS * 1.6;
      C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, H + F * (Math.hypot(px - C.cx, py - C.cy) + TS * 0.4) / L));
      C.hitT = H + F * 0.6; return mwait(C, H + F + (k - 1) * 70 + 60);
    }
    // 巨剑横斩（炎魔剑 = 烈焰之剑、冰魔斩 = 冰之刃）
    const sz = (1.15 + Math.min(2, C.spread) * 0.45 + C.v * 0.25) * (C.mo.size || 1), hov = C.overlay ? 60 : 140, sw = 220;
    sweepActor({ kind: wk, pk, x: C.x, y: C.y, size: sz, hover: hov, swing: sw, trail: trailOf(pk) });
    if (n >= 2) sweepActor({ kind: wk, pk: C.mo.pk2 || pk, x: C.x, y: C.y, size: sz, hover: hov + 120, swing: sw, px: 0.15, a0: -0.55, a1: -2.8, trail: trailOf(C.mo.pk2 || pk) });
    later(hov + sw * 0.5, () => PFX.slashes.push({ x: C.x, y: C.y, angle: 0.55, len: 0.9 * sz, color: C.P.g, t0: now0(), dur: T(320), thin: 1.8 }));
    hitAll(C, hov + sw * 0.55, 30); C.hitT = hov + sw * 0.55;
    return mwait(C, hov + sw + (n >= 2 ? 120 : 0) + 60);
  },
  async spear(C) {
    const st = C.sp.style, pk = C.pk, n = C.n || 1;
    if (st === 'spin' || st === 'sweep' || (C.sp.around && st !== 'rain')) return MOTIF.sword(Object.assign({}, C, { mo: Object.assign({}, C.mo, { w: 'spear' }) }));
    if (st === 'rain' || (C.pts.length > 1 && C.shape !== 'line' && !C.phys)) { // 枪阵：一圈长枪悬在空中，再一齐刺落
      const N = C.pts.length, k = Math.max(N, Math.min(8, n > 2 ? n : 6)), R = TS * (0.9 + C.spread * 0.4), hov = C.overlay ? 160 : 280, fall = 150, top = [];
      for (let i = 0; i < k; i++) {
        const th = i / k * TAU - Math.PI / 2, ox = C.x + Math.cos(th) * R, oy = C.y - TS * 2.5 + Math.sin(th) * R * 0.35, [px, py] = C.pts[i % N];
        top.push([ox, oy]);
        fallerActor({ kind: 'spear', pk, x: px + (i >= N ? rand(-0.25, 0.25) * TS : 0), y: py, dx: (ox - px) / TS, dy: (oy - py) / TS, ty: 0.2, hover: hov, fall, stick: 300, size: 1.15, delay: i * 20, onHit: pk === 'bolt' ? () => PFX.bolts.push({ x: px, y: py, color: '#fff6a0', t0: now0(), dur: T(320) }) : null });
        hitAt(C, px, py, i >= N, hov + fall + i * 20);
      }
      PFX.circles.push({ x: C.x, y: C.y - TS * 2.5, r: R / TS + 0.5, color: C.P.g, el: C.el, t0: now0(), dur: T(hov + 200) });
      if (pk === 'bolt') for (let i = 0; i < k; i++) { const [ax, ay] = top[i], [bx, by] = top[(i + 1) % k]; PFX.bolts.push({ x0: ax, y0: ay, x1: bx, y1: by, small: true, color: '#fff6a0', t0: now0() + T(80 + i * 25), dur: T(hov - 60) }); }
      C.hitT = hov + fall; return mwait(C, hov + fall + k * 20 + 80);
    }
    const [ex, ey] = C.shape === 'line' ? C.pts[C.pts.length - 1] : [C.x, C.y], a = Math.atan2(ey - C.cy, ex - C.cx), H = C.overlay ? 60 : 160, F = 170 + (C.shape === 'line' ? C.pts.length * 25 : 0);
    for (let i = 0; i < Math.min(3, n); i++) { const off = (i - (Math.min(3, n) - 1) / 2) * TS * 0.32; flyActor({ kind: 'spear', pk, x0: C.cx - Math.cos(a) * TS * 0.9 - Math.sin(a) * off, y0: C.cy - Math.sin(a) * TS * 0.9 + Math.cos(a) * off - TS * 0.1, x1: ex + Math.cos(a) * TS * 0.9, y1: ey + Math.sin(a) * TS * 0.9, hover: H, fly: F, ease: 'in', size: 1.1 + C.v * 0.3, delay: i * 60, trail: trailOf(pk) }); }
    const L = Math.hypot(ex - C.cx, ey - C.cy) + TS * 1.8;
    C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, H + F * Math.pow((Math.hypot(px - C.cx, py - C.cy) + TS * 0.9) / L, 0.5)));
    C.hitT = H + F * 0.8; return mwait(C, H + F + 100);
  },
  async arrow(C) {
    const pk = C.pk, n = C.n || 1;
    if (C.pts.length > 1 && C.shape !== 'line') return MOTIF.rain(Object.assign({}, C, { mo: Object.assign({}, C.mo, { head: C.mo.head || 'arrow' }) }));
    const [ex, ey] = C.shape === 'line' ? C.pts[C.pts.length - 1] : [C.x, C.y], a = Math.atan2(ey - C.cy, ex - C.cx), F = 200 + (C.shape === 'line' ? C.pts.length * 30 : 0), k = Math.min(3, n);
    sfx('arrow');
    for (let i = 0; i < k; i++) flyActor({ kind: C.mo.head === 'meteor' ? 'arrow' : 'arrow', pk, x0: C.cx, y0: C.cy - TS * 0.15 + (i - (k - 1) / 2) * TS * 0.2, x1: ex + Math.cos(a) * TS * (C.shape === 'line' ? 1.5 : 0.1), y1: ey + Math.sin(a) * TS * (C.shape === 'line' ? 1.5 : 0.1), fly: F, delay: i * 110, size: 1 + C.v * 0.4, trail: trailOf(pk), hover: C.overlay ? 0 : 60 });
    const L = Math.hypot(ex - C.cx, ey - C.cy) + TS * 1.5, H = C.overlay ? 0 : 60;
    C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, H + F * Math.min(1, Math.hypot(px - C.cx, py - C.cy) / L) + (k - 1) * 110));
    C.hitT = H + F; return mwait(C, H + F + (k - 1) * 110 + 80);
  },
  async fist(C) {
    const pk = C.pk === 'steel' ? 'gold' : C.pk, n = C.n || 1;
    if (n >= 5) { // 百裂：拳影乱打
      const img = MS.fist(pk), gl = glowOf('fist' + pk, img, C.P.g, 8);
      for (const [px, py] of C.pts.slice(0, 3)) for (let k = 0; k < 10; k++) {
        const ox = px + rand(-0.35, 0.35) * TS, oy = py + rand(-0.35, 0.3) * TS, a = Math.atan2(py - C.cy, px - C.cx) + rand(-0.3, 0.3);
        popActor({ delay: k * 38, dur: 200, in: 0.3, out: 0.5, paint: (g, p, now, s, al) => { const d = TS * 0.7 * (0.7 + p * 0.5); blit(g, gl, ox, oy, d * 1.2, d * 1.2, a, al * 0.7, true); blit(g, img, ox, oy, d, d, a, al); } });
        if (k % 3 === 2) later(k * 38 + 60, () => { hitSparkHD(ox, oy, [C.P.l, '#ffffff']); ring(ox, oy, 0.1, 0.6, C.P.g, 220); });
      }
      hitAll(C, 400, 20); later(400, () => shockAt(C, C.x, C.y, 0.9)); C.hitT = 400; return mwait(C, 480);
    }
    for (const [px, py] of C.pts.slice(0, 5)) flyActor({ kind: 'fist', pk, x0: C.cx, y0: C.cy - TS * 0.1, x1: px, y1: py, fly: 180, hover: C.overlay ? 0 : 80, size: 1 + C.v * 0.5, tail: 160 });
    const H = (C.overlay ? 0 : 80) + 180; C.pts.forEach(([px, py]) => later(H, () => { shockAt(C, px, py, 0.7); for (let k = 0; k < 2; k++) ring(px, py, 0.2, 1.2 + k * 0.4, C.P.l, 360, { delay: k * 80 }); }));
    hitAll(C, H, 15); C.hitT = H; return mwait(C, H + 100);
  },
  async palm(C) {
    const pk = C.pk, img = MS.palm(pk), gl = glowOf('palm' + pk, img, C.P.g, 10), a = C.ang, big = C.pts.length > 1 ? 1.5 + C.spread * 0.4 : 1.25;
    const bx = C.x - Math.cos(a) * TS * 0.7, by = C.y - Math.sin(a) * TS * 0.7 - TS * 0.2;
    popActor({ dur: 520, in: 0.25, out: 0.35, paint: (g, p, now, s, al) => { const push = easeOut(clamp01((p - 0.2) / 0.3)) * TS * 0.55, x = bx + Math.cos(a) * push, y = by + Math.sin(a) * push, d = TS * big * s; blit(g, gl, x, y, d * 1.3, d * 1.3 * 1.17, 0, al * 0.8, true); blit(g, img, x, y, d, d * 1.17, 0, al); } });
    for (let k = 0; k < 3; k++) ring(C.x, C.y, 0.2, 1 + k * 0.4 + C.spread * 0.6, C.P.l, 380, { delay: 180 + k * 70 });
    hitAll(C, 260, 25); C.hitT = 260; return mwait(C, 360);
  },
  async kick(C) {
    C.pts.forEach(([px, py], i) => { for (let k = 0; k < 2; k++) later(i * 30 + k * 90, () => PFX.slashes.push({ x: px, y: py, angle: k ? 2.4 : -0.6, len: 0.9, color: k ? '#ffffff' : C.P.g, t0: now0(), dur: T(300), thin: 1.8 })); later(i * 30 + 140, () => ring(px, py, 0.2, 1.1, C.P.l, 340)); });
    hitAll(C, 200, 30); C.hitT = 200; return mwait(C, 320);
  },
  async claw(C) {
    C.pts.forEach(([px, py], i) => { for (let k = -1; k <= 1; k++) later(i * 30 + (k + 1) * 40, () => PFX.slashes.push({ x: px + k * TS * 0.26, y: py - k * TS * 0.08, angle: 1.05, len: 1.0, color: C.P.g, t0: now0(), dur: T(320), straight: true, thin: 1.5 })); later(i * 30 + 60, () => burst(SP.void(), px, py, { r0: 0.2, r1: 0.9, add: false, mode: 'pulse', dur: 500, spin: 2 })); });
    hitAll(C, 200, 30); C.hitT = 200; return mwait(C, 340);
  },
  async moon(C) {
    const pk = C.mo.dpk || (['steel', 'wind', 'holy', 'gold', 'slash'].includes(C.pk) ? 'white' : C.pk), P = palOf(pk), area = C.pts.length > 1;
    const sz = (area ? 2.3 + C.spread * 0.5 : 1.85) * TS, mx = C.x + TS * 0.5, my = C.y - TS * 1.25 - sz * 0.25, img = MS.moon(pk);
    popActor({ dur: 1000, in: 0.25, out: 0.35, paint: (g, p, now, s, al) => { const d = sz * (0.9 + 0.1 * s); blit(g, SP.glow(P.g), mx, my, d * 1.9, d * 1.9, 0, al * 0.6, true); blit(g, img, mx, my, d, d, -0.25 + p * 0.15, al, false); blit(g, img, mx, my, d, d, -0.25 + p * 0.15, al * 0.35, true); } });
    const t = C.overlay ? 160 : 260;
    byNear(C, C.x, C.y).slice(0, 6).forEach(([px, py], i) => { later(t + i * 40, () => { PFX.slashes.push({ x: px, y: py, angle: -0.5, len: area ? 1.25 : 1.15, color: P.l, t0: now0(), dur: T(380), thin: 2.4 }); PFX.slashes.push({ x: px, y: py + TS * 0.05, angle: -0.5, len: 1.0, color: P.g, t0: now0() + T(70), dur: T(320), thin: 1.2 }); }); });
    hitAll(C, t + 60, 30); C.hitT = t + 60; return mwait(C, t + 200);
  },
  async star(C) {
    if (C.mo.v === 'collapse') return MOTIF.collapse(C);
    if (C.pts.length > 1) return MOTIF.rain(Object.assign({}, C, { mo: Object.assign({}, C.mo, { head: 'star', hpk: C.pk === 'steel' ? 'holy' : C.pk }) }));
    const k = Math.max(5, C.n || 5), col = palOf(C.pk === 'steel' ? 'holy' : C.pk).g, img = MS.star(col), R = TS * 1.6, T0 = C.overlay ? 200 : 320;
    popActor({ dur: T0 + 200, in: 0.05, out: 0.25, paint: (g, p, now, s, al) => { const q = clamp01(p * (T0 + 200) / T0), e = q * q; if (q >= 1) return; for (let i = 0; i < k; i++) { const a = i / k * TAU + q * 2.4, r = R * (1 - e); blit(g, img, C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.7, TS * 0.5, TS * 0.5, now / 150 + i, al, true); } } });
    later(T0, () => { burst(MS.star(col), C.x, C.y, { r0: 0.4, r1: 1.6, spin: 3, dur: 420, fin: 0.05 }); burst(SP.flare(col), C.x, C.y, { r0: 0.6, r1: 2.2, dur: 360, fin: 0.04 }); emit(12, C.x, C.y, { speed: [1.5, 3.2], life: [0.4, 0.7], size: [0.06, 0.1], cols: [col, '#ffffff'], drag: 0.82, shape: 'star5', spin: 6 }); });
    hitAll(C, T0, 0); C.hitT = T0; return mwait(C, T0 + 120);
  },
  async collapse(C) { // 星辰坍缩：群星螺旋落向中心后爆开
    const col = palOf(C.pk).g, img = MS.star('#fff0a0'), img2 = MS.star(col), R = TS * (2.2 + C.spread * 0.4), T0 = 520;
    popActor({ dur: T0 + 120, in: 0.05, out: 0.2, paint: (g, p, now, s, al) => { const q = clamp01(p * (T0 + 120) / T0); if (q >= 1) return; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + q * 5, r = R * Math.pow(1 - q, 1.4) * (0.6 + 0.4 * ((i * 7) % 5) / 5); const d = TS * (0.5 + 0.25 * ((i * 3) % 4) / 3); blit(g, SP.glow(col), C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.6, d * 2, d * 2, 0, al * 0.4, true); blit(g, i % 2 ? img : img2, C.x + Math.cos(a) * r, C.y + Math.sin(a) * r * 0.6, d, d, now / 120 + i, al, true); } } });
    later(T0, () => { shockAt(C, C.x, C.y, 1.6 + C.spread * 0.4); emit(24, C.x, C.y, { speed: [2, 5], life: [0.5, 0.9], size: [0.06, 0.1], cols: ['#ffffff', '#fff0a0', col], drag: 0.85, shape: 'star5', spin: 6 }); flash('#ffffff', 0.5, 300); });
    hitAll(C, T0 + 40, 18); C.hitT = T0; return mwait(C, T0 + 160);
  },
  async dipper(C) { // 北斗七星：沿直线排出七星，连线后星光齐落
    const [ex, ey] = C.pts[C.pts.length - 1] || [C.x, C.y], a = Math.atan2(ey - C.cy, ex - C.cx), L = Math.hypot(ex - C.cx, ey - C.cy) + TS * 0.6, nx = -Math.sin(a), ny = Math.cos(a);
    const D = [[0.05, 0.35], [0.22, 0.42], [0.38, 0.3], [0.52, 0.1], [0.62, -0.32], [0.88, -0.38], [0.96, 0.02]];
    const S = D.map(([u, w]) => [C.cx + Math.cos(a) * L * u + nx * w * TS, C.cy + Math.sin(a) * L * u + ny * w * TS - TS * 1.4]);
    const img = MS.star('#fff0a0');
    popActor({ dur: 900, in: 0.05, out: 0.25, paint: (g, p, now, s, al) => {
      const shown = Math.min(7, p * 900 / 50); g.globalCompositeOperation = 'lighter'; resetX(g); g.lineCap = 'round';
      for (const [lw, col, k] of [[TS * 0.12, '#ffd060', 0.35], [TS * 0.035, '#ffffff', 0.9]]) { g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = al * k; g.beginPath(); for (let i = 0; i < Math.floor(shown); i++) i ? g.lineTo(S[i][0], S[i][1]) : g.moveTo(S[i][0], S[i][1]); if (shown < 7 && shown >= 1) { const i = Math.floor(shown), f = shown - i; g.lineTo(lerp(S[i - 1][0], S[i][0], f), lerp(S[i - 1][1], S[i][1], f)); } g.stroke(); }
      for (let i = 0; i < Math.ceil(shown); i++) { const d = TS * (0.55 + 0.1 * Math.sin(now / 80 + i)); blit(g, SP.glow('#ffe080'), S[i][0], S[i][1], d * 2, d * 2, 0, al * 0.6, true); blit(g, img, S[i][0], S[i][1], d, d, now / 300 + i, al, true); }
    } });
    later(380, () => S.forEach(([sx, sy], i) => { const [px, py] = byNear(C, sx, sy + TS * 1.4)[0]; PFX.beams.push({ x0: sx, y0: sy, x1: px, y1: py, w: 0.22, color: i % 2 ? '#ffe080' : '#8ac8ff', t0: now0() + T(i * 25), dur: T(320) }); }));
    hitAll(C, 470, 30, C.cx, C.cy); C.hitT = 470; return mwait(C, 560);
  },
  async petal(C) {
    const pk = C.pk === 'steel' || C.pk === 'wind' || C.pk === 'holy' || C.pk === 'gold' ? 'sakura' : C.pk, P = palOf(pk), cols = C.mo.leaf ? ['#7ad070', '#a8e060', '#4aa848'] : [P.l, P.c, shade(P.c, 0.35)], shape = C.mo.leaf ? 'leaf' : 'sakura', T0 = C.overlay ? 200 : 320;
    if (!C.friendly) for (const [px, py] of C.pts.slice(0, 4)) { const d = Math.hypot(px - C.cx, py - C.cy) / TS; emit(16, C.cx, C.cy, { angle: Math.atan2(py - C.cy, px - C.cx), spread: 0.35, speed: [d / 0.4 * 0.75, d / 0.4 * 1.05], life: [0.38, 0.5], size: [0.07, 0.1], cols, drag: 1, shape, spin: 9, sway: 2 }); }
    C.pts.slice(0, 6).forEach(([px, py], i) => later(C.friendly ? i * 40 : T0 - 80, () => {
      emit(C.friendly ? 10 : 16, px, py, { speed: [0, 0], life: [0.6, 0.9], size: C.mo.leaf ? [0.1, 0.14] : [0.08, 0.11], cols, swirl: 7, cx: px, cy: py, vy: C.friendly ? -1.2 : -0.5, jitter: 0.8, shape, spin: 8 });
      bloomFlower(px, py - (C.friendly ? TS * 0.2 : 0), pk, C.mo.lotus ? 8 : 5, C.friendly ? 0.95 : 1, C.mo.leaf);
    }));
    hitAll(C, T0, 30); C.hitT = T0; return mwait(C, T0 + 140);
  },
  async ghost(C) {
    if (C.mo.v === 'parade') return MOTIF.parade(C);
    const kind = C.friendly || C.pk === 'holy' || C.pk === 'heal' ? 'spirit' : 'ghost', P = kind === 'spirit' ? palOf(C.pk) : palOf(C.pk === 'steel' ? 'dark' : C.pk), T0 = C.overlay ? 260 : 420;
    if (!C.friendly) { const [px, py] = C.pts[0]; const d = Math.hypot(px - C.cx, py - C.cy) / TS; emit(8, C.cx, C.cy, { angle: Math.atan2(py - C.cy, px - C.cx), spread: 0.6, speed: [d / 0.45 * 0.7, d / 0.45], life: [0.4, 0.5], size: [0.12, 0.16], cols: [P.g, P.l], drag: 1, shape: 'wisp', sway: 2 }); }
    C.pts.slice(0, 6).forEach(([px, py], i) => {
      emit(5, px, py + TS * 0.3, { speed: [0, 0], life: [0.6, 0.9], size: [0.17, 0.23], cols: [P.g, P.l], swirl: 5, cx: px, cy: py, vy: -1.3, jitter: 0.85, shape: 'wisp', delay: 0.05 });
      if (kind === 'ghost' && i < 5) { const img = MS.skull(P.g); popActor({ delay: i * 40, dur: T0 + 200, in: 0.25, out: 0.2, paint: (g, p, now, s, al) => { const q = clamp01((p * (T0 + 200) - T0 * 0.6) / (T0 * 0.4)), y = py - TS * 0.95 + q * q * TS * 0.9 + Math.sin(now / 90) * TS * 0.04, d = TS * 0.72 * s * (1 + q * 0.5); blit(g, SP.glow(P.g), px, y, d * 2.2, d * 2.2, 0, al * 0.55 * (1 - q), true); blit(g, img, px, y, d, d * 1.12, Math.sin(now / 70) * 0.08, al * (1 - q * 0.8)); } }); }
    });
    hitAll(C, T0, 30); C.hitT = T0; return mwait(C, T0 + 120);
  },
  async parade(C) { // 百鬼夜行：一列鬼火与骷髅横越战场
    const xs = C.pts.map(p => p[0]), x0 = Math.min(...xs) - TS * 1.6, x1 = Math.max(...xs) + TS * 1.6, ys = C.pts.map(p => p[1]), yc = (Math.min(...ys) + Math.max(...ys)) / 2, h = (Math.max(...ys) - Math.min(...ys)) / 2 + TS * 0.5, dur = 0.7;
    for (let k = 0; k < 16; k++) emit(1, x0 - rand(0, 0.8) * TS, yc + rand(-h, h), { speed: [0, 0], vx: (x1 - x0) / TS / dur, life: [dur, dur + 0.15], size: k % 3 ? [0.22, 0.28] : [0.24, 0.3], cols: ['#c080ff', '#80e0ff', '#ff80c0'], shape: k % 3 ? 'wisp' : 'skull', sway: 1.5, delay: rand(0, 0.15), drag: 1 });
    C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, 80 + dur * 1000 * (px - x0) / (x1 - x0)));
    C.hitT = 400; return mwait(C, dur * 1000 + 80);
  },
  async swarm(C) {
    const shape = C.mo.m, P = C.P, cols = shape === 'bat' ? [P.g] : shape === 'bug' ? [P.c, shade(P.c, -0.3)] : shape === 'heart' ? ['#ff6aa0', '#ff9ac0'] : shape === 'note' ? [P.c, '#ffd060', '#ff8ac0'] : [P.l, P.g], T0 = C.overlay ? 260 : 400;
    const sz = { bat: [0.2, 0.26], bug: [0.09, 0.12], note: [0.16, 0.2], heart: [0.12, 0.15] }[shape];
    if (C.friendly) { C.pts.slice(0, 6).forEach(([px, py]) => emit(8, px, py + TS * 0.3, { speed: [0.1, 0.4], life: [0.7, 1.1], size: sz, cols, gravity: -1.2, sway: 1.6, jitter: 0.5, shape })); C.hitT = 0; return; }
    for (const [px, py] of C.pts.slice(0, 4)) { const d = Math.hypot(px - C.cx, py - C.cy) / TS; emit(Math.ceil(14 / Math.min(4, C.pts.length)), C.cx, C.cy, { angle: Math.atan2(py - C.cy, px - C.cx), spread: 0.55, speed: [d / 0.42 * 0.75, d / 0.42 * 1.05], life: [0.4, 0.5], size: sz, cols, drag: 1, shape, sway: 1.6 }); }
    C.pts.slice(0, 6).forEach(([px, py]) => later(T0 - 60, () => emit(8, px, py, { speed: [0, 0], life: [0.4, 0.6], size: sz, cols, swirl: 8, cx: px, cy: py, jitter: 0.7, shape })));
    if (shape === 'heart') later(T0, () => C.pts.slice(0, 4).forEach(([px, py]) => burst(MS.heart('#ff6aa0'), px, py - TS * 0.5, { r0: 0.3, r1: 0.9, mode: 'grow', add: false, dur: 600 })));
    hitAll(C, T0, 25); C.hitT = T0; return mwait(C, T0 + 100);
  },
  async clock(C) {
    const v = C.mo.v || 'stop', P = v === 'stop' ? PAL.ice : v === 'fast' ? PAL.gold : PAL.purple, img = MS.clock(P.g), area = C.pts.length > 1, R = TS * (area ? 1.1 + C.spread * 0.45 : 0.75), x = C.x, y = C.y - (area ? TS * 0.3 : TS * 0.9);
    const D = v === 'break' ? 820 : 900;
    popActor({ dur: D, in: 0.18, out: 0.3, paint: (g, p, now, s, al) => {
      const sp = v === 'stop' ? 6 * Math.max(0, 1 - p * 2.2) : v === 'fast' ? 14 : 4 + p * 30, t = v === 'stop' ? 6 * (1 - Math.pow(1 - Math.min(1, p * 2.2), 2)) * 0.45 : p * sp, jx = v === 'break' && p > 0.45 ? rand(-1, 1) * TS * 0.04 : 0, d = R * 2 * s;
      blit(g, img, x + jx, y, d, d, 0, al, true);
      g.globalCompositeOperation = 'lighter'; resetX(g); g.lineCap = 'round';
      for (const [len, w, rate] of [[0.78, 0.07, 1], [0.5, 0.1, 1 / 12]]) { const a = -Math.PI / 2 + t * TAU * rate; for (const [lw, col] of [[w, P.g], [w * 0.4, '#ffffff']]) { g.strokeStyle = col; g.lineWidth = R * lw; g.globalAlpha = al; g.beginPath(); g.moveTo(x + jx, y); g.lineTo(x + jx + Math.cos(a) * R * len, y + Math.sin(a) * R * len); g.stroke(); } }
      if (v === 'break' && p > 0.45) { g.strokeStyle = '#ffffff'; g.lineWidth = TS * 0.04; g.globalAlpha = al; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k * 1.3 + 0.4; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.4); g.lineTo(x + Math.cos(a + 0.2) * R, y + Math.sin(a + 0.2) * R); } g.stroke(); }
    } });
    if (v === 'break') later(430, () => { emit(26, x, y, { speed: [1.5, 4], life: [0.5, 0.9], size: [0.08, 0.13], cols: ['#e8d8ff', '#ffffff', '#b070ff'], drag: 0.85, gravity: 2, shape: 'shard' }); flash('#c070ff', 0.45, 300); shakeStage(0.9); });
    const H = v === 'break' ? 460 : 300; hitAll(C, H, 20); C.hitT = H; return mwait(C, H + 140);
  },
  async eye(C) {
    const pk = C.friendly ? (C.pk === 'gold' ? 'gold' : C.pk) : C.pk === 'steel' ? 'dark' : C.pk, P = palOf(pk), img = MS.eye(pk), x = C.friendly ? C.x : C.x, y = C.y - TS * 1.35, w = TS * (C.pts.length > 1 ? 1.9 : 1.4);
    popActor({ dur: 900, in: 0.01, out: 0.2, paint: (g, p, now, s, al) => { const o = p < 0.25 ? easeOut(p / 0.25) : p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1; blit(g, SP.glow(P.g), x, y, w * 1.6, w * 1.2, 0, al * 0.5 * o, true); if (o > 0.02) { g.globalCompositeOperation = 'source-over'; xform(g, x, y, 0); g.scale(1, Math.max(0.02, o)); g.globalAlpha = al; g.drawImage(img, -w / 2, -w * 0.29, w, w * 0.58); } } });
    if (!C.friendly) later(C.overlay ? 260 : 320, () => C.pts.slice(0, 6).forEach(([px, py]) => PFX.beams.push({ x0: x, y0: y, x1: px, y1: py, w: 0.24, color: P.g, t0: now0(), dur: T(300) })));
    hitAll(C, 380, 25); C.hitT = 380; return mwait(C, 460);
  },
  async chain(C) {
    const P = C.pk === 'steel' ? PAL.dark : C.P, img = MS.link(P.g);
    C.pts.slice(0, 6).forEach(([px, py]) => popActor({ dur: 820, in: 0.1, out: 0.25, paint: (g, p, now, s, al) => { const r = TS * lerp(1.1, 0.48, easeOut(Math.min(1, p * 2))), n = 12; blit(g, SP.glow(P.g), px, py, r * 2.6, r * 1.6, 0, al * 0.35, true); for (let k = 0; k < n; k++) { const a = k / n * TAU + p * 2.5, lx = px + Math.cos(a) * r, ly = py + Math.sin(a) * r * 0.55; blit(g, img, lx, ly, TS * 0.3, TS * 0.17, a + Math.PI / 2 + (k % 2 ? 0 : 0), al, false); } } }));
    later(400, () => C.pts.slice(0, 6).forEach(([px, py]) => { burst(SP.flare(P.g), px, py, { r0: 0.4, r1: 1.2, dur: 260, fin: 0.05 }); ring(px, py, 0.9, 0.2, P.g, 300); }));
    hitAll(C, 400, 20); C.hitT = 400; return mwait(C, 480);
  },
  async sun(C) {
    const black = C.mo.v === 'black', pk = black ? 'dark' : C.pk === 'steel' || C.pk === 'gold' ? 'holy' : C.pk, P = palOf(pk), img = MS.sun(pk, black), area = C.pts.length > 1;
    const R = TS * (area ? 1.1 + C.spread * 0.35 : 0.85), x = C.x, y0 = C.y - TS * 0.6, y1 = C.y - TS * (area ? 2.2 : 1.7), H = C.overlay ? 280 : 420;
    popActor({ dur: H + 360, in: 0.25, out: 0.3, paint: (g, p, now, s, al) => { const y = lerp(y0, y1, easeOut(Math.min(1, p * 2))), d = R * 2.4 * (black && p * (H + 360) > H ? 1 + (p * (H + 360) - H) / 360 : 1); blit(g, img, x, y, d, d, now / 1400, al, false); if (!black) blit(g, SP.glow(P.g), x, y, d * 1.8, d * 1.8, 0, al * 0.5, true); } });
    if (black) emit(24, x, y1, { speed: [0, 0], life: [0.4, 0.6], size: [0.05, 0.09], cols: ['#c070ff', '#2a0a40', '#ffffff'], swirl: 7, cx: x, cy: y1, jitter: 2, shape: 'circle', delay: 0.05 });
    later(H - 60, () => C.pts.slice(0, 9).forEach(([px, py], i) => PFX.pillars.push({ x: px, y: py + TS * 0.3, w: 0.55, color: P.g, t0: now0() + T(i * 18), dur: T(420), ang: (px - x) / TS * -0.12 })));
    hitAll(C, H, 20); C.hitT = H; return mwait(C, H + 120);
  },
  async nova(C) { // 核融爆：白热核心收缩后炸开
    const x = C.x, y = C.y, R = TS * (1 + C.spread * 0.4);
    popActor({ dur: 520, in: 0.4, out: 0.1, paint: (g, p, now, s, al) => { const d = R * (1.6 - p * 1.1) * s; blit(g, SP.core('#ffd080'), x, y, d * 2, d * 2, 0, al, true); blit(g, MS.sun('fire'), x, y, d * 1.6, d * 1.6, now / 300, al * 0.8, true); } });
    emit(30, x, y, { speed: [0, 0], life: [0.4, 0.5], size: [0.05, 0.09], cols: ['#ffffff', '#ffd080', '#ff8a30'], swirl: 8, cx: x, cy: y, jitter: 2.4, shape: 'spark' });
    later(450, () => { flash('#ffffff', 0.8, 380); shakeStage(1.2); sfx('boom'); haptic([40, 30, 80]); burst(SP.core('#ffffff'), x, y, { r0: 0.5, r1: 3 + C.spread, dur: 420, fin: 0.03 }); for (let k = 0; k < 3; k++) ring(x, y, 0.3, 2.5 + C.spread + k * 0.8, k ? '#ff9a40' : '#ffffff', 520, { delay: k * 70 }); });
    hitAll(C, 470, 14); C.hitT = 470; return mwait(C, 620);
  },
  async taiji(C) {
    const x = C.x, y = C.y - TS * 0.15, R = TS * (C.pts.length > 1 ? 1.1 + C.spread * 0.45 : 0.85), img = MS.taiji(), H = C.overlay ? 280 : 420;
    popActor({ dur: H + 300, in: 0.3, out: 0.3, paint: (g, p, now, s, al) => { const d = R * 2 * s * (p > 0.6 ? 1 + (p - 0.6) * 1.2 : 1); blit(g, SP.glow('#ffe080'), x, y, d * 1.6, d * 1.6 * 0.5, 0, al * 0.6, true); g.globalCompositeOperation = 'source-over'; xform(g, x, y, 0, 0.5); g.rotate(now / 220); g.globalAlpha = al; g.drawImage(img, -d / 2, -d / 2, d, d); } });
    later(H, () => { burst(SP.burst('#ffffff'), x, y, { r0: 0.5, r1: 2 + C.spread, dur: 480, spin: 2, fin: 0.05 }); burst(SP.void(), x, y, { r0: 0.4, r1: 1.4 + C.spread * 0.5, add: false, mode: 'pulse', spin: -3, dur: 500 }); ring(x, y, 0.2, 1.8 + C.spread, '#ffe080', 460, { flat: true }); });
    hitAll(C, H, 20); C.hitT = H; return mwait(C, H + 120);
  },
  async rift(C) {
    const P = C.pk === 'steel' ? PAL.purple : C.P;
    C.pts.slice(0, 6).forEach(([px, py], i) => {
      const segs = [], a0 = rand(-0.9, -0.5); for (let k = 0; k < 3; k++) { const a = a0 + k * 1.05 + rand(-0.2, 0.2), pts = [[px, py]]; let qx = px, qy = py; for (let j = 0; j < 5; j++) { qx += Math.cos(a + rand(-0.5, 0.5)) * TS * 0.22; qy += Math.sin(a + rand(-0.5, 0.5)) * TS * 0.22; pts.push([qx, qy]); } segs.push(pts); }
      popActor({ delay: i * 30, dur: 640, in: 0.05, out: 0.35, paint: (g, p, now, s, al) => { const n = Math.min(6, 1 + p * 18); resetX(g); g.lineCap = 'round'; g.lineJoin = 'round'; for (const [lw, col, add, k] of [[0.22, 'rgba(10,0,24,0.85)', 0, 1], [0.12, P.g, 1, 0.8], [0.04, '#ffffff', 1, 1]]) { g.globalCompositeOperation = add ? 'lighter' : 'source-over'; g.strokeStyle = col; g.lineWidth = TS * lw; g.globalAlpha = al * k; g.beginPath(); for (const sg of segs) { const m = Math.floor(n); sg.slice(0, m).forEach(([qx, qy], j) => (j ? g.lineTo(qx, qy) : g.moveTo(qx, qy))); } g.stroke(); } } });
      later(i * 30 + 300, () => emit(10, px, py, { speed: [1.2, 3], life: [0.4, 0.7], size: [0.06, 0.1], cols: ['#ffffff', P.l, P.g], drag: 0.85, shape: 'shard' }));
    });
    hitAll(C, 320, 30); C.hitT = 320; return mwait(C, 440);
  },
  async mirror(C) {
    const P = C.pk === 'steel' ? PAL.white : C.P, T0 = C.overlay ? 260 : 400;
    C.pts.slice(0, 5).forEach(([px, py]) => popActor({ dur: T0 + 160, in: 0.15, out: 0.2, paint: (g, p, now, s, al) => { const q = clamp01(p * (T0 + 160) / T0), r = TS * lerp(1.1, 0.15, q * q); if (q >= 1) return; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + q * 4; blit(g, SP.shard('#e8f0ff'), px + Math.cos(a) * r, py + Math.sin(a) * r * 0.6 - TS * 0.1, TS * 0.55, TS * 0.18, a + Math.PI / 2, al, false); blit(g, SP.flare(P.g), px + Math.cos(a) * r, py + Math.sin(a) * r * 0.6 - TS * 0.1, TS * 0.5, TS * 0.5, 0, al * (0.5 + 0.5 * Math.sin(now / 50 + k)), true); } } }));
    later(T0, () => C.pts.slice(0, 6).forEach(([px, py]) => { emit(10, px, py, { speed: [1.5, 3.5], life: [0.4, 0.7], size: [0.06, 0.1], cols: ['#ffffff', '#e0e8ff', P.l], drag: 0.85, shape: 'shard' }); burst(SP.flare('#ffffff'), px, py, { r0: 0.5, r1: 1.5, dur: 260, fin: 0.05 }); }));
    hitAll(C, T0, 25); C.hitT = T0; return mwait(C, T0 + 100);
  },
  async shadow(C) { // 影分身：施法者的暗影残像轮番斩过目标
    const img = unitImg(C.u), k = Math.max(3, Math.min(5, C.n > 1 ? C.n : 3)), P = C.pk === 'steel' ? PAL.dark : C.P;
    const tgt = C.pts.slice(0, 4);
    if (img) tgt.forEach(([px, py], ti) => { const sh = shadowOf(img, '#1a0a30'); for (let i = 0; i < k; i++) { const a = i / k * TAU + ti, d = ti * 40 + i * 70; popActor({ delay: d, dur: 380, in: 0.3, out: 0.4, paint: (g, p, now, s, al) => { const q = easeOut(clamp01((p - 0.3) / 0.4)), r = TS * 0.9, x = px + Math.cos(a) * r * (1 - 2 * q), y = py + Math.sin(a) * r * 0.5 * (1 - 2 * q), sz = TS * 1.2; blit(g, SP.glow(P.g), x, y, sz * 1.3, sz * 1.3, 0, al * 0.5, true); blit(g, sh, x, y - TS * 0.08, sz, sz, 0, al * 0.85, false); } }); later(d + 200, () => PFX.slashes.push({ x: px, y: py, angle: a + Math.PI / 2, len: 0.8, color: P.g, t0: now0(), dur: T(260), straight: true, thin: 1.2 })); } });
    else tgt.forEach(([px, py]) => { for (let i = 0; i < k; i++) later(i * 70 + 200, () => PFX.slashes.push({ x: px, y: py, angle: i * 1.3, len: 0.8, color: P.g, t0: now0(), dur: T(260), straight: true, thin: 1.2 })); });
    hitAll(C, 220 + (k - 1) * 70, 30); C.hitT = 220; return mwait(C, 300 + k * 70);
  },
  async wave(C) {
    const P = C.pk === 'steel' || C.pk === 'ice' ? PAL.water : C.pk === 'dark' ? Object.assign({}, PAL.water, { c: '#2a3a8a', l: '#a8b8ff', d: '#05061a' }) : C.P, pk = P === PAL.water ? 'water' : C.pk;
    if (C.friendly) { C.pts.slice(0, 8).forEach(([px, py]) => { emit(10, px, py - TS * 1.6, { speed: [0, 0.2], vy: 5, life: [0.3, 0.4], size: [0.07, 0.1], cols: [P.l, P.c], shape: 'drop', jitter: 0.5, delay: 0.25 }); for (let k = 0; k < 3; k++) ring(px, py + TS * 0.3, 0.1, 0.6 + k * 0.2, P.g, 480, { flat: true, delay: 250 + k * 90 }); }); C.hitT = 0; return; }
    if (C.shape === 'line' || C.sp.style === 'thrust' || C.sp.style === 'charge' || C.sp.style === 'dash') { // 水柱 / 激流
      const [ex, ey] = C.pts[C.pts.length - 1] || [C.x, C.y]; PFX.beams.push({ x0: C.cx, y0: C.cy, x1: ex, y1: ey, w: 0.5, color: P.g, t0: now0(), dur: T(520) });
      emit(16, C.cx, C.cy, { angle: Math.atan2(ey - C.cy, ex - C.cx), spread: 0.18, speed: [5, 8], life: [0.25, 0.4], size: [0.07, 0.1], cols: [P.l, P.c], drag: 0.95, shape: 'drop' });
      C.pts.forEach(([px, py], i) => later(140 + i * 40, () => splash(px, py, P)));
      hitAll(C, 160, 40, C.cx, C.cy); C.hitT = 160; return mwait(C, 360);
    }
    const xs = C.pts.map(p => p[0]), ys = C.pts.map(p => p[1]), w = (Math.max(...xs) - Math.min(...xs)) + TS * 1.8, H = TS * (1.2 + C.spread * 0.45) * (C.ult ? 1.25 : 1), dir = C.x >= C.cx ? 1 : -1, img = MS.wave(pk);
    const yb = Math.max(...ys) + TS * 0.45, xA = C.x - dir * TS * 1.8, xB = C.x + dir * TS * 0.5, D = C.overlay ? 420 : 560;
    popActor({ dur: D, in: 0.12, out: 0.3, paint: (g, p, now, s, al) => { const x = lerp(xA, xB, easeOut(p)), h = H * (0.5 + 0.5 * Math.min(1, p * 1.6)) * (p > 0.7 ? 1 - (p - 0.7) * 1.2 : 1); g.globalCompositeOperation = 'source-over'; xform(g, x, yb, 0); if (dir < 0) g.scale(-1, 1); g.globalAlpha = al * 0.92; g.drawImage(img, -w * 0.75, -h, w, h); } });
    const hT = D * 0.55; C.pts.forEach(([px, py]) => later(hT + (px - C.x) * dir / TS * 30, () => splash(px, py, P)));
    hitAll(C, hT, 25); C.hitT = hT; return mwait(C, hT + 160);
  },
  async tornado(C) {
    const pk = C.pk === 'steel' ? 'wind' : C.pk, P = palOf(pk), area = C.pts.length > 1, list = C.shape === 'line' ? C.pts : area && C.spread >= 1.5 ? [[C.x, C.y]] : C.pts.slice(0, 5);
    const H = TS * (area && list.length === 1 ? 3 + C.spread * 0.5 : list.length > 2 ? 1.9 : 2.5), T0 = C.overlay ? 280 : 420, img = SP.funnel(P.g), img2 = SP.funnel('#ffffff');
    list.forEach(([px, py], i) => {
      const sx = C.shape === 'line' ? C.cx : px, sy = C.shape === 'line' ? C.cy : py, D = T0 + 420;
      popActor({ delay: C.shape === 'line' ? 0 : i * 30, dur: D, in: 0.15, out: 0.3, paint: (g, p, now, s, al) => { const q = C.shape === 'line' ? easeOut(Math.min(1, p * D / T0)) : 1, x = lerp(sx, px, q), y = lerp(sy, py, q) + TS * 0.45; for (let k = 0; k < 3; k++) { const wob = 1 + Math.sin(now / 70 + k * 2) * 0.12, h = H * s * (1 - k * 0.12), w = h * 0.62 * wob; g.globalCompositeOperation = 'lighter'; xform(g, x + Math.sin(now / 110 + k * 1.7) * TS * 0.08, y, Math.sin(now / 160 + k) * 0.06); g.globalAlpha = al * (k === 1 ? 0.6 : 0.95); g.drawImage(k === 1 ? img2 : img, -w / 2, -h, w, h); }
        // 绕着漏斗旋转的风圈（前半圈），看得出在转
        const h = H * s, w = h * 0.62; resetX(g); g.lineCap = 'round';
        for (let j = 0; j < 6; j++) { const yy = y - h * (j + 0.6) / 6.4, rx = w * 0.5 * (0.18 + 0.8 * (j + 0.5) / 6), a0 = now / 85 + j * 1.3, sw = x + Math.sin(now / 110 + j * 0.5) * TS * 0.06;
          for (const [lw, col, k2] of [[0.09, P.g, 0.45], [0.035, '#ffffff', 0.9]]) { g.strokeStyle = col; g.lineWidth = TS * lw; g.globalAlpha = al * k2; g.beginPath(); g.ellipse(sw, yy, rx, rx * 0.28, 0, a0 % TAU, a0 % TAU + 2.2); g.stroke(); } } } });
      emit(10, px, py, { speed: [0, 0], life: [0.6, 0.9], size: [0.06, 0.1], cols: pk === 'fire' ? ['#fff'] : pk === 'ice' ? ['#ffffff', '#c8f0ff'] : ['#7ad070', '#a8e060'], swirl: 9, cx: px, cy: py, vy: -2.2, jitter: 0.6, shape: pk === 'fire' ? 'flame' : pk === 'ice' ? 'star' : 'leaf', spin: 9, delay: 0.1 });
    });
    if (C.shape === 'line') C.pts.forEach(([px, py], i) => hitAt(C, px, py, 0, T0 * (i + 1) / C.pts.length)); else hitAll(C, T0 * 0.75, 25);
    C.hitT = T0; return mwait(C, T0 + 120);
  },
  async roar(C) {
    for (let k = 0; k < 4; k++) ring(C.cx, C.cy, 0.3, 1.6 + C.spread + k * 0.4, k % 2 ? '#ffffff' : C.P.g, 460, { delay: k * 90 });
    emit(20, C.cx, C.cy, { speed: [2, 4], life: [0.3, 0.5], size: [0.03, 0.05], cols: [C.P.g, '#ffffff'], drag: 0.8, shape: 'spark' }); shakeStage(0.7);
    C.pts.forEach(([px, py]) => hitAt(C, px, py, 0, 120 + Math.hypot(px - C.cx, py - C.cy) / TS * 60));
    C.hitT = 200; return mwait(C, 420);
  },
  async skull(C) { const img = MS.skull('#ff4040'); popActor({ dur: 800, in: 0.25, out: 0.3, paint: (g, p, now, s, al) => { const d = TS * 1.3 * s; blit(g, SP.glow('#ff3040'), C.cx, C.cy - TS * 1.2, d * 2, d * 2, 0, al * 0.5, true); blit(g, img, C.cx, C.cy - TS * 1.2, d, d * 1.12, Math.sin(now / 60) * 0.1, al); } }); return MOTIF.ghost(C); },
  async cannon(C) { return MOTIF.rain(Object.assign({}, C, { mo: Object.assign({}, C.mo, { head: 'cannon' }) })); },
  async flask(C) {
    const F = 300; C.pts.slice(0, 4).forEach(([px, py], i) => flyActor({ kind: 'flask', pk: C.pk, x0: C.cx, y0: C.cy - TS * 0.3, x1: px, y1: py, fly: F, arc: 1.4, delay: i * 50, tail: 0 }));
    later(F, () => C.pts.slice(0, 6).forEach(([px, py]) => { emit(8, px, py, { speed: [1, 2.6], life: [0.3, 0.5], size: [0.05, 0.08], cols: ['#ffffff', '#d8f0ff'], drag: 0.8, gravity: 3, shape: 'shard' }); emit(4, px, py, { speed: [0.3, 0.8], life: [0.7, 1], size: [0.25, 0.35], cols: [C.P.c], gravity: -0.4, shape: 'smoke' }); }));
    hitAll(C, F + 20, 30); C.hitT = F; return mwait(C, F + 140);
  },
  async cloud(C) {
    C.pts.slice(0, 8).forEach(([px, py], i) => later(i * 25 + 120, () => { emit(5, px, py, { speed: [0.3, 0.9], life: [0.8, 1.2], size: [0.26, 0.4], cols: [C.P.c, C.P.l], gravity: -0.3, drag: 0.85, shape: 'smoke', jitter: 0.3 }); emit(8, px, py, { speed: [0.5, 1.5], life: [0.5, 0.9], size: [0.03, 0.05], cols: [C.P.l, '#ffffff'], shape: 'spark', jitter: 0.4 }); }));
    hitAll(C, 260, 20); C.hitT = 260; return mwait(C, 380);
  },
  async feather(C) { // 天使之翼：目标（或施法者）身后展开双翼，羽毛飘落
    const pk = C.pk === 'steel' || C.pk === 'gold' || C.pk === 'heal' || C.pk === 'buff' ? 'white' : C.pk === 'holy' ? 'holy' : C.pk, img = MS.wing(pk), P = palOf(pk);
    const list = C.friendly ? C.pts.slice(0, 4) : [[C.cx, C.cy]];
    list.forEach(([px, py]) => popActor({ dur: 900, in: 0.3, out: 0.3, paint: (g, p, now, s, al) => { const W = TS * 1.15, f = 0.5 + 0.5 * easeOut(Math.min(1, p * 3)) + Math.sin(now / 160) * 0.05; blit(g, SP.glow(P.g), px, py - TS * 0.3, W * 2.6, W * 2, 0, al * 0.4, true); for (const sx of [-1, 1]) { g.globalCompositeOperation = 'source-over'; xform(g, px + sx * TS * 0.1, py - TS * 0.1, 0); g.scale(-sx, 1); g.rotate(0.35 - (1 - f) * 0.9); g.globalAlpha = al * 0.92; const H = W * 160 / 220; g.drawImage(img, -W * 0.636, -H * 0.9375, W, H); } } }));
    const fl = C.friendly ? list : C.pts.slice(0, 6); fl.forEach(([px, py]) => emit(6, px, py - TS * 1.2, { speed: [0.1, 0.4], life: [0.8, 1.2], size: [0.1, 0.13], cols: [P.l, '#ffffff'], gravity: 0.5, drag: 0.6, shape: 'feather', spin: 3, sway: 1.4, jitter: 0.6 }));
    if (!C.friendly) { hitAll(C, 300, 25); C.hitT = 300; return mwait(C, 420); }
  },
  async dome(C) {
    const pk = C.pk === 'steel' ? 'gold' : C.pk, P = palOf(pk), img = MS.dome(P.g);
    C.pts.slice(0, 8).forEach(([px, py], i) => popActor({ delay: i * 40, dur: 900, in: 0.28, out: 0.3, paint: (g, p, now, s, al) => { const w = TS * 1.35, h = w * 0.69 * s; g.globalCompositeOperation = 'lighter'; xform(g, px, py + TS * 0.4, 0); g.globalAlpha = al * (0.85 + 0.15 * Math.sin(now / 90)); g.drawImage(img, -w / 2, -h * 0.91, w, h); } }));
  },
  async aurora(C) { // 极光：数道彩带在战场上空飘动
    const xs = C.pts.map(p => p[0]), x0 = Math.min(...xs) - TS * 1.2, x1 = Math.max(...xs) + TS * 1.2, y = Math.min(...C.pts.map(p => p[1])) - TS * 0.7, cols = ['#5affb0', '#5ad8ff', '#c070ff'];
    popActor({ dur: 1000, in: 0.25, out: 0.35, paint: (g, p, now, s, al) => { g.globalCompositeOperation = 'lighter'; resetX(g); for (let k = 0; k < 3; k++) { const gr = g.createLinearGradient(0, y - TS, 0, y + TS * 1.2); gr.addColorStop(0, rgba(cols[k], 0)); gr.addColorStop(0.5, rgba(cols[k], 0.5)); gr.addColorStop(1, rgba(cols[k], 0)); g.fillStyle = gr; g.globalAlpha = al; g.beginPath(); const N = 16; for (let i = 0; i <= N; i++) { const x = lerp(x0, x1, i / N), yy = y + k * TS * 0.35 + Math.sin(i * 0.7 + now / 260 + k * 2) * TS * 0.35; i ? g.lineTo(x, yy - TS * 0.7) : g.moveTo(x, yy - TS * 0.7); } for (let i = N; i >= 0; i--) { const x = lerp(x0, x1, i / N), yy = y + k * TS * 0.35 + Math.sin(i * 0.7 + now / 260 + k * 2) * TS * 0.35; g.lineTo(x, yy + TS * 0.5); } g.closePath(); g.fill(); } } });
    C.pts.forEach(([px, py], i) => later(280 + i * 18, () => emit(3, px, py - TS * 1.4, { speed: [0, 0.2], vy: 4, life: [0.35, 0.4], size: [0.08, 0.12], cols: ['#e8f8ff', '#9ae0ff'], shape: 'shard' })));
    hitAll(C, 380, 18); C.hitT = 380; return mwait(C, 520);
  },
  async storm(C) { // 雷暴：战场上空聚起乌云，落雷连连
    const xs = C.pts.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), y = Math.min(...C.pts.map(p => p[1])) - TS * 2.4;
    for (let k = 0; k < 9; k++) emit(1, lerp(x0, x1, k / 8), y + rand(-0.2, 0.2) * TS, { speed: [0, 0.15], life: [0.9, 1.1], size: [0.5, 0.7], cols: ['#3a3a5a', '#2a2a40'], shape: 'smoke', jitter: 0.3 });
    C.pts.forEach(([px, py], i) => later(160 + rand(0, 260), () => { PFX.bolts.push({ x0: px + rand(-0.4, 0.4) * TS, y0: y, x1: px, y1: py, color: '#fff6a0', t0: now0(), dur: T(360) }); }));
    if (C.pk === 'water' || C.mo.rain) emit(30, (x0 + x1) / 2, y, { speed: [0, 0], vx: -1, vy: 9, life: [0.35, 0.45], size: [0.05, 0.07], cols: ['#a8d8ff'], shape: 'drop', jitter: Math.max(1, (x1 - x0) / TS / 2 + 0.5), delay: 0.2 });
    hitAll(C, 300, 25); C.hitT = 300; return mwait(C, 520);
  },
  async elements(C) { // 元素归一 / 四灵：四色元素球环绕后合一
    const cols = C.mo.cols || ['#ff7a1a', '#7ad0ff', '#8ae8c0', '#e0b070'], x = C.x, y = C.y - TS * 0.3, R = TS * (1.4 + C.spread * 0.3);
    popActor({ dur: 560, in: 0.1, out: 0.05, paint: (g, p, now, s, al) => { const q = clamp01(p / 0.85), r = R * (1 - q * q); if (q >= 1) return; for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + q * 5; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.55; blit(g, SP.core(cols[k]), px, py, TS * 0.9, TS * 0.9, 0, al, true); blit(g, SP.glow(cols[k]), px, py, TS * 1.8, TS * 1.8, 0, al * 0.5, true); } } });
    later(480, () => { shockAt(C, x, y, 1.6 + C.spread * 0.4); flash('#ffffff', 0.6, 320); cols.forEach((c, k) => ring(x, y, 0.3, 2.4 + C.spread + k * 0.3, c, 500, { delay: k * 50 })); });
    hitAll(C, 500, 14); C.hitT = 500; return mwait(C, 620);
  },
  async four(C) { // 四象：青龙、朱雀、白虎、玄武
    const C2 = Object.assign({}, C, { overlay: true });
    dragonActor({ P: swoopPath(C.cx - TS, C.cy - TS * 0.5, C.x, C.y, -1), pk: 'jade', size: 0.8, arr: 520 });
    phoenixActor({ P: (sw => s => (s <= 1 ? sw(s) : [C.x + (s - 1) * TS * 2.6, C.y - (s - 1) * TS * 4]))(swoopPath(C.cx + TS, C.cy - TS * 0.5, C.x, C.y - TS * 0.2, 1, 0.1)), pk: 'fire', size: 0.8, arr: 520, delay: 40 });
    later(420, () => { for (let k = -1; k <= 1; k++) PFX.slashes.push({ x: C.x + k * TS * 0.28, y: C.y - k * TS * 0.08, angle: 1.05, len: 1.1, color: '#e8f0ff', t0: now0() + T((k + 1) * 40), dur: T(320), straight: true, thin: 1.6 }); });
    MOTIF.dome(Object.assign({}, C2, { pk: 'jade', pts: [[C.x, C.y]] }));
    hitAll(C, 520, 25); later(520, () => shockAt(C, C.x, C.y, 1.4)); C.hitT = 520; return mwait(C, 620);
  },
  async summon(C) { // 召唤：地面法阵 → 时空裂口 → 召唤兽由光中现身
    const x = C.x, y = C.y, kind = C.sp.unit || '', P = palOf(C.mo.dpk || 'summon'), img = summonImg(kind, C.u), sz = TS * 1.2;
    sfx('summon');
    PFX.circles.push({ x, y: y + TS * 0.3, r: 1.0 + C.v * 0.3, color: P.g, el: 'summon', t0: now0(), dur: T(1150) });
    PFX.pillars.push({ x, y: y + TS * 0.3, w: 0.62, color: P.l, t0: now0() + T(250), dur: T(720) });
    popActor({ dur: 700, in: 0.3, out: 0.3, paint: (g, p, now, s, al) => { const w = TS * 0.9 * s, h = TS * 1.6 * s; blit(g, SP.void(), x, y - TS * 0.25, w, h, 0, al * 0.95, false); blit(g, SP.glow(P.g), x, y - TS * 0.25, w * 1.6, h * 1.3, 0, al * 0.7, true); g.globalCompositeOperation = 'lighter'; resetX(g); g.strokeStyle = P.l; g.lineWidth = TS * 0.05; g.globalAlpha = al; g.beginPath(); g.ellipse(x, y - TS * 0.25, w * 0.42, h * 0.45, 0, 0, TAU); g.stroke(); } });
    emit(26, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.04, 0.08], cols: [P.l, P.g, '#ffffff'], swirl: 6, cx: x, cy: y, vy: -1.2, jitter: 0.85, shape: 'star' });
    if (C.mo.dragon) dragonActor({ P: s => [x + Math.sin(s * TAU) * TS * 1.3, y - TS * 0.25 - Math.sin(s * Math.PI) * TS * 2.4], pk: C.mo.dragon, size: 0.8, arr: 560 });
    if (C.mo.wings) MOTIF.feather(Object.assign({}, C, { friendly: true, pts: [[x, y]], pk: 'white', overlay: true }));
    if (img) popActor({ delay: 330, dur: 520, in: 0.6, out: 0.01, paint: (g, p, now, s, al) => { const q = easeOut(clamp01(p / 0.6)), d = sz * (0.4 + 0.6 * q), yy = y - TS * 0.08 + (1 - q) * TS * 0.5; blit(g, img, x, yy, d, d, 0, al * Math.min(1, q * 1.4), false); blit(g, img, x, yy, d, d, 0, (1 - q) * 0.9, true); blit(g, SP.glow('#ffffff'), x, yy, d * 1.6, d * 1.6, 0, (1 - q) * 0.6, true); } });
    await wait(650);
    flash('#ffffff', 0.35, 220); burst(SP.burst(P.l), x, y, { r0: 0.4, r1: 1.6, a: 0.85, spin: 1, dur: 520, fin: 0.05 }); ring(x, y + TS * 0.3, 0.2, 1.4, P.l, 480, { flat: true }); shakeStage(0.4);
  },
};
['bat', 'bug', 'note', 'heart'].forEach(k => { MOTIF[k] = C => MOTIF.swarm(C); });
MOTIF.meteor = C => MOTIF.rain(Object.assign({}, C, { mo: Object.assign({ head: 'meteor' }, C.mo, { comet: 1 }) }));
MOTIF.leaf = C => MOTIF.petal(Object.assign({}, C, { mo: Object.assign({ leaf: 1 }, C.mo) }));
// 合成：同时放出数种意象（第一个负责命中）
MOTIF.combo = async C => { const [a, ...rest] = C.mo.parts; rest.forEach(m => MOTIF[m.m](Object.assign({}, C, { overlay: true, mo: m, pk: m.pk || C.pk, P: palOf(m.pk || C.pk), n: m.n || 0 }))); return MOTIF[a.m](Object.assign({}, C, { mo: a, pk: a.pk || C.pk, P: palOf(a.pk || C.pk), n: a.n || C.n })); };
function splash(px, py, P) { emit(10, px, py + TS * 0.2, { angle: -Math.PI / 2, spread: 0.9, speed: [1.6, 3.2], life: [0.4, 0.7], size: [0.06, 0.09], cols: [P.l, P.c, '#ffffff'], gravity: 7, drag: 0.95, shape: 'drop' }); emit(3, px, py, { speed: [0.2, 0.5], life: [0.6, 0.9], size: [0.25, 0.35], cols: [P.l], gravity: -0.3, shape: 'mist' }); ring(px, py + TS * 0.3, 0.2, 1.0, P.g, 420, { flat: true }); }
function bloomFlower(px, py, pk, n, k, leaf) {
  const img = leaf ? SP.leaf('#6ac860') : MS.sakura(palOf(pk).c);
  popActor({ dur: 760, in: 0.3, out: 0.35, paint: (g, p, now, s, al) => { const R = TS * 0.5 * k * s; blit(g, SP.glow(palOf(pk).g), px, py, R * 3, R * 3, 0, al * 0.5, true); for (let i = 0; i < n; i++) { const a = i / n * TAU + p * 1.2; g.globalCompositeOperation = 'source-over'; xform(g, px + Math.cos(a) * R * 0.5, py + Math.sin(a) * R * 0.5, a + Math.PI / 2); g.globalAlpha = al; g.drawImage(img, -R * 0.5, -R * 0.5, R, R * 1.05); } blit(g, SP.core('#fff0a0'), px, py, R * 0.8, R * 0.8, 0, al, true); } });
}

// ---------- 招式名 → 意象 ----------
// 关键字依优先序比对（先比到的胜出）；elem 表示名称只指出元素，沿用原本的元素演出
const MOTIF_KW = [
  [/龙卷/, 'tornado'], [/八龙/, 'dragon', { n: 8 }], [/龙鳞/, 'dome'], [/龙/, 'dragon'], [/凤|凰/, 'phoenix'],
  [/流星|陨|星落/, 'meteor'], [/北斗/, 'dipper'], [/月/, 'moon'], [/星/, 'star'],
  [/樱|花|莲|玫瑰/, 'petal'], [/骷髅/, 'skull'], [/蝙蝠/, 'bat'], [/蛊|蛛|虱|蚕/, 'bug'],
  [/眼|凝视/, 'eye'], [/诅咒|鬼|魂|魄|亡|怨|冥(?!想)|幽|阎魔/, 'ghost'], [/时间|时空/, 'clock'], [/镜|幻|蜃|梦|魇/, 'mirror'],
  [/锁链|缚|缠|封(?!喉)|锢/, 'chain'], [/乾坤|有无|圣魔交辉|太极/, 'taiji'], [/黑日|日光|天光|曙光/, 'sun'],
  [/歌|颂/, 'note'], [/魅|惑/, 'heart'], [/裂空|裂隙|异界|虚空|太虚|真空/, 'rift'],
  [/拳/, 'fist'], [/掌/, 'palm'], [/腿|踢/, 'kick'],
  [/箭|矢|弓|弩|射|狙|穿杨/, 'arrow'], [/枪|矛|戟/, 'spear'],
  [/春|木|树|橡|林间|草|荆|棘|自然/, 'leaf'],
  [/盾|壁|护|守|铠|(?<!破)甲|垒|庇|佑|不动/, 'dome'],
  [/天使|圣灵|祈|祷|翼|翅|羽|鹰|隼|鹫/, 'feather'],
  [/潮|浪|涛|海|啸|泉|激流|洪流|寒流|清流|霖|水/, 'wave'],
  [/剑|斩|刃|刀|斧|劈|一闪|居合|燕返|一文字/, 'sword'],
  [/爪|牙|噬|咬/, 'claw'], [/影|分身/, 'shadow'],
  [/旋风|暴风|风暴|飓|漩涡/, 'tornado'], [/吼|嚎|咆哮/, 'roar'],
  [/炮|舷/, 'cannon'], [/瓶|药|釜/, 'flask'], [/粉|沙|雾|烟|瘴|气弹/, 'cloud'], [/灵/, 'ghost'],
  [/雷|霆|电|冰|霜|雪|寒|冻|炎|火|焰|焚|热|爆|石|岩|地|山|岳|土|震|风|毒|酸|圣|光|天|神|暗|黑|邪|魔|咒/, 'elem'],
];
// 名称里的颜色字（先出现者为准）；没有就用招式的元素
const PK_KW = [[/冰|霜|雪|寒|冻|白龙/, 'ice'], [/炎|火|焰|焚|熔|热|燎/, 'fire'], [/雷|霆|电/, 'bolt'], [/血/, 'blood'], [/毒|蛊|瘴|酸/, 'acid'], [/潮|浪|涛|海|泉|激流|洪流|寒流|清流|霖|水/, 'water'], [/樱|花|莲/, 'sakura'], [/玫瑰/, 'rose'], [/黑龙/, 'black'], [/暗|黑|邪|冥|幽|阎|鬼|魂|怨|蚀|影/, 'dark'], [/风|岚/, 'wind'], [/石|岩|山|岳|土/, 'rock']];
const NUMK = { 双: 2, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 百: 12, 千: 14, 万: 16 };
// 手工调整：合击、终极魔法与隐藏职业的招牌招式
const MOTIF_ID = {
  // 合击
  flyingSword: { m: 'sword', n: 3, pk: 'cyan', fly: 1 }, twinSword: { m: 'sword', n: 2, pk: 'purple', pk2: 'cyan' }, titanSword: { m: 'sword', giant: 1, pk: 'gold' },
  sunMoon: { m: 'combo', parts: [{ m: 'moon', dpk: 'white' }, { m: 'sun', pk: 'fire' }] }, twinPhoenix: { m: 'phoenix', n: 2 }, fourSymbol: { m: 'four' },
  eightDragon: { m: 'dragon', n: 8, dpk: 'gold' }, a1_twinDemon: { m: 'sword', n: 2, pk: 'fire', pk2: 'ice' }, a1_heavenEarth: { m: 'sword', giant: 1, pk: 'holy' },
  b2_windMoon: { m: 'combo', parts: [{ m: 'moon', dpk: 'white' }, { m: 'tornado', pk: 'wind' }] }, b2_snowWind: { m: 'combo', parts: [{ m: 'tornado', pk: 'ice' }, { m: 'sword', pk: 'ice' }] },
  coupleEva: { m: 'combo', parts: [{ m: 'spear', pk: 'holy' }, { m: 'star', pk: 'holy' }] }, coupleQiu: { m: 'combo', parts: [{ m: 'sword', n: 3, pk: 'wind' }, { m: 'tornado', pk: 'wind' }] },
  coupleYi: { m: 'combo', parts: [{ m: 'sun', pk: 'holy' }, { m: 'feather', pk: 'holy' }] }, youwu: { m: 'taiji' }, northStar: { m: 'dipper' }, northStarN: { m: 'dipper' },
  d4_twinBlossom: { m: 'combo', parts: [{ m: 'petal', pk: 'sakura' }, { m: 'sword', n: 2, pk: 'sakura', pk2: 'white' }] },
  ancientGolem: { m: 'rain', head: 'fist', pk: 'rock', size: 1.6, mode: 'overlay' }, ancientGolemB: { m: 'rain', head: 'fist', pk: 'rock', size: 1.6, mode: 'overlay' },
  chaosPulse: { m: 'rift', pk: 'dark', mode: 'overlay' }, chaosPulseB: { m: 'rift', pk: 'dark', mode: 'overlay' },
  heatWave: { m: 'phoenix', pk: 'fire', mode: 'overlay' }, d4_heatWaveB: { m: 'phoenix', pk: 'fire', mode: 'overlay' }, stormShot: { m: 'tornado', pk: 'wind', mode: 'overlay' },
  // 终极魔法
  fusion: { m: 'nova' }, meteor: { m: 'meteor', pk: 'fire' }, stormThunder: { m: 'storm', pk: 'bolt' }, blizzard: { m: 'tornado', pk: 'ice' }, vortex: { m: 'elem' },
  chronoBreak: { m: 'clock', v: 'break' }, timeStop: { m: 'clock', v: 'stop' }, quicken: { m: 'clock', v: 'fast' }, callDragon: { m: 'dragon', dpk: 'fire' },
  babyGod: { m: 'sun', pk: 'holy' }, d4_spiritOne: { m: 'elements' }, d4_maidenDawn: { m: 'sun', pk: 'holy' }, d4_spiritStar: { m: 'star', v: 'collapse', pk: 'holy' },
  madJudgment: { m: 'sun', v: 'black' }, madRoar: { m: 'roar', pk: 'dark' }, d4_blackFlame: { m: 'dragon', dpk: 'black', pk: 'dark' }, dragonFlameX: { m: 'dragon', dpk: 'fire' },
  crebCurse: { m: 'ghost', pk: 'dark' }, c3_ghostParade: { m: 'ghost', v: 'parade' }, d4_aurora: { m: 'aurora', pk: 'ice' }, tempest: { m: 'storm', pk: 'water', rain: 1 },
  d4_witchStorm: { m: 'storm', pk: 'bolt' }, b2_crownJudge: { m: 'storm', pk: 'bolt' }, b2_phantasm: { m: 'combo', parts: [{ m: 'mirror', pk: 'purple' }, { m: 'petal', pk: 'sakura' }] },
  a1_stormEye: { m: 'combo', parts: [{ m: 'tornado', pk: 'wind' }, { m: 'eye', pk: 'wind' }] }, a1_spiritBurst: { m: 'four' }, d4_blackWhirl: { m: 'tornado', pk: 'water' },
  d4_frostBlade: { m: 'sword', pk: 'ice', size: 1.2 }, d4_flameBlade: { m: 'sword', pk: 'fire' }, c3_tsunami: { m: 'wave', pk: 'water' }, d4_twilightRift: { m: 'rift', pk: 'purple' },
  a1_absoluteZero: { m: 'clock', v: 'stop', pk: 'ice', mode: 'overlay' }, d4_eclipse: { m: 'sun', v: 'black' }, b2_wishRain: { m: 'wave', pk: 'water' },
  // 隐藏职业招牌
  swordSaint: { m: 'sword', n: 9, pk: 'holy' }, evilBlade: { m: 'combo', parts: [{ m: 'sword', n: 2, pk: 'dark' }, { m: 'ghost', pk: 'dark' }] }, griffinDive: { m: 'feather', pk: 'wind', mode: 'overlay' },
  kingArrow: { m: 'arrow', pk: 'bolt', n: 14 }, shadowSnipe: { m: 'arrow', pk: 'dark', n: 2 }, netherAxe: { m: 'combo', parts: [{ m: 'sword', pk: 'dark' }, { m: 'ghost', pk: 'dark' }] },
  thunderAxe: { m: 'combo', parts: [{ m: 'sword', pk: 'bolt' }, { m: 'storm', pk: 'bolt' }] }, pirateKing: { m: 'cannon', pk: 'fire' }, holySword: { m: 'sword', giant: 1, pk: 'holy' },
  evilSword: { m: 'sword', pk: 'dark', size: 1.2 }, specialOps: { m: 'shadow', pk: 'dark', n: 4 }, yamaFire: { m: 'ghost', pk: 'dark' }, holyDemon: { m: 'taiji' },
  d4_saintEye: { m: 'combo', parts: [{ m: 'sword', pk: 'holy' }, { m: 'eye', pk: 'holy' }] }, d4_saintMyriad: { m: 'sword', n: 16, pk: 'holy' }, d4_evilGale: { m: 'tornado', pk: 'dark' },
  d4_griffinRush: { m: 'feather', pk: 'wind', mode: 'overlay' }, d4_griffinSky: { m: 'feather', pk: 'wind', mode: 'overlay' }, d4_kingRain: { m: 'meteor', head: 'arrow', pk: 'fire' },
  d4_maidenJudge: { m: 'combo', parts: [{ m: 'sun', pk: 'holy' }, { m: 'feather', pk: 'holy' }] }, d4_spiritMend: { m: 'ghost', pk: 'heal' }, d4_netherQuake: { m: 'ghost', pk: 'dark' },
  d4_thunderGod: { m: 'combo', parts: [{ m: 'sword', pk: 'bolt', size: 1.3 }, { m: 'storm', pk: 'bolt' }] }, d4_voidRend: { m: 'rift', pk: 'purple' }, d4_starfallBlade: { m: 'meteor', head: 'star', pk: 'holy' },
  d4_yamaVerdict: { m: 'combo', parts: [{ m: 'chain', pk: 'dark' }, { m: 'ghost', pk: 'dark' }] }, d4_opsSweep: { m: 'shadow', pk: 'dark', n: 4 }, d4_opsFinale: { m: 'shadow', pk: 'fire', n: 5 },
  d4_shadowClone: { m: 'shadow', pk: 'dark', n: 5 }, d4_shadowHell: { m: 'shadow', pk: 'blood', n: 5 }, d4_broadside: { m: 'cannon', pk: 'fire' }, d4_kingTide: { m: 'wave', pk: 'water' },
  d4_divineRay: { m: 'sword', giant: 1, pk: 'holy', mode: 'replace' }, d4_divineJudge: { m: 'sword', giant: 1, pk: 'holy' }, d4_sacredNova: { m: 'sun', pk: 'holy' },
  // 其他名不副实的个案
  laser: { m: 'elem' }, c3_waterJet: { m: 'wave', pk: 'water' }, a1_ragingTide: { m: 'wave', pk: 'water' }, tideSlash: { m: 'wave', pk: 'water' }, d4_tidalCleave: { m: 'wave', pk: 'water' },
  c3_locustBolts: { m: 'arrow', pk: 'wind' }, c3_darkMeteor: { m: 'meteor', head: 'arrow', pk: 'dark' }, a1_meteorBow: { m: 'meteor', head: 'arrow', pk: 'fire' }, starArrows: { m: 'meteor', head: 'arrow', pk: 'holy' },
  pegasusLance: { m: 'meteor', head: 'spear', pk: 'holy' }, d4_featherMeteor: { m: 'meteor', head: 'spear', pk: 'white' }, c3_starfallSword: { m: 'meteor', head: 'star', pk: 'holy' }, a1_starFall: { m: 'meteor', head: 'star', pk: 'holy' },
  a1_thunderRing: { m: 'sword', pk: 'bolt' }, c3_thunderLance: { m: 'spear', pk: 'bolt', n: 6 }, c3_valkyrieStorm: { m: 'spear', pk: 'bolt', n: 8 }, d4_thunderThrust: { m: 'spear', pk: 'bolt' },
  a1_flameDemon: { m: 'sword', pk: 'fire' }, c3_flameMagicSword: { m: 'sword', pk: 'fire' }, a1_iceDemon: { m: 'sword', pk: 'ice' }, c3_iceMagicSlash: { m: 'sword', pk: 'ice' },
  a1_frostBreath: { m: 'dragon', dpk: 'ice' }, d4_whiteBreath: { m: 'dragon', dpk: 'white', pk: 'ice' }, d4_blackBreath: { m: 'dragon', dpk: 'black', pk: 'fire' }, d4_sacredDragon: { m: 'dragon', dpk: 'gold' },
  d4_moonFrost: { m: 'combo', parts: [{ m: 'moon', dpk: 'ice' }, { m: 'tornado', pk: 'ice' }] }, c3_bloodMoon: { m: 'moon', dpk: 'blood' }, d4_bloodMoon: { m: 'moon', dpk: 'blood' }, d4_crescentKick: { m: 'moon', dpk: 'white' },
  d4_jollyRoger: { m: 'skull', pk: 'blood' }, d4_crossCut: { m: 'sword', n: 2 }, a1_oneSword: { m: 'sword', giant: 1, pk: 'holy' }, limitless: { m: 'sword', n: 3 }, ninesky: { m: 'sword', n: 9 },
  b2_swordObsess: { m: 'sword', n: 14, pk: 'dark' }, a1_myriadSword: { m: 'sword', n: 16, pk: 'holy' }, a1_peakRain: { m: 'sword', n: 14 }, b2_thousandSword: { m: 'sword', n: 14 },
  qiankun: { m: 'taiji', mode: 'overlay' }, d4_petalStorm: { m: 'petal', pk: 'sakura' }, c3_bladeLotus: { m: 'petal', pk: 'rose', lotus: 1, mode: 'overlay' }, mirrorBlade: { m: 'mirror', pk: 'water' },
  c3_batSwarm: { m: 'bat', pk: 'blood' }, c3_wildHowl: { m: 'roar' }, d4_tribalHowl: { m: 'roar' }, d4_jungleCry: { m: 'roar' },
  sumDragon: { m: 'summon', dragon: 'gold' }, d4_callDragon: { m: 'summon', dragon: 'jade' }, sumAngel: { m: 'summon', wings: 1, dpk: 'holy' }, b2_angelDescent: { m: 'summon', wings: 1, dpk: 'holy' },
  c3_callHeaven: { m: 'summon', wings: 1, dpk: 'holy' }, d4_pactLight: { m: 'summon', wings: 1, dpk: 'holy' }, sumPig: { m: 'summon', dragon: 'rose' },
  curseWind: { m: 'combo', parts: [{ m: 'tornado', pk: 'dark' }, { m: 'ghost', pk: 'dark' }] }, devour: { m: 'elem' }, meditate: { m: 'petal', pk: 'sakura', lotus: 1 },
  spiritCall: { m: 'ghost', pk: 'holy' }, c3_purifySoul: { m: 'ghost', pk: 'heal' }, c3_sirenSong: { m: 'note', pk: 'purple' }, techLaser: { m: 'elem' },
  thornBind: { m: 'combo', parts: [{ m: 'chain', pk: 'acid' }, { m: 'leaf', pk: 'heal' }] }, d4_twinArrow: { m: 'arrow', n: 2, pk: 'holy' }, d4_featherThrust: { m: 'spear', pk: 'white' },
  d4_dawnLance: { m: 'combo', parts: [{ m: 'spear', pk: 'holy' }, { m: 'sun', pk: 'holy' }] }, d4_assassinate: { m: 'shadow', pk: 'dark', n: 3 }, d4_nightRaid: { m: 'shadow', pk: 'dark', n: 3 },
  d4_maelstrom: { m: 'tornado', pk: 'water', mode: 'overlay' }, d4_yamaChain: { m: 'combo', parts: [{ m: 'chain', pk: 'dark' }, { m: 'ghost', pk: 'dark' }] }, c3_boltMagicThrust: { m: 'spear', pk: 'bolt' },
  d4_moonShadow: { m: 'moon', dpk: 'ice' }, bloodBite: { m: 'bat', pk: 'blood', mode: 'overlay' },
  cataclysm: { m: 'meteor', pk: 'fire', mode: 'overlay' }, musou: { m: 'sword', n: 2, pk: 'fire', mode: 'overlay' }, chiWave: { m: 'palm', pk: 'holy', mode: 'overlay' },
  oath: { m: 'feather', pk: 'holy' }, godGuard: { m: 'dome', pk: 'holy' }, bushido: { m: 'sword', mode: 'overlay', pk: 'steel' },
};
const SUMMON_PK = { spiritEarth: 'rock', spiritFire: 'fire', spiritWind: 'wind', spiritWater: 'water', demonSummon: 'dark', angel: 'holy', turtle: 'water', dragon: 'gold', beast: 'dark', silverWolf: 'white', gargoyle: 'rock', robot: 'steel', treant: 'heal', roc: 'wind', yeti: 'ice', giant: 'rock', sphinx: 'gold', wind: 'wind', pigdragon: 'rose' };
const MOTIF_CACHE = new Map();
function motifOf(spId, sp) {
  if (MOTIF_CACHE.has(spId)) return MOTIF_CACHE.get(spId);
  sp = sp || SPELLS[spId];
  const name = sp.name || '', fxPk = FX_PAL[sp.fx] || 'steel';
  let mo = null, src = 'hand';
  if (MOTIF_ID[spId]) mo = Object.assign({}, MOTIF_ID[spId]);
  else if (sp.kind === 'summon') { mo = { m: 'summon' }; src = 'kind'; }
  else for (const [re, m, ex] of MOTIF_KW) if (re.test(name)) { mo = Object.assign({ m }, ex); src = 'name'; break; }
  if (!mo && sp.desc) { const d = sp.desc; for (const [re, m] of [[/龙/, 'dragon'], [/凤凰/, 'phoenix'], [/流星|陨石/, 'meteor'], [/花瓣|樱/, 'petal'], [/月光|新月|弦月/, 'moon'], [/骷髅|亡灵|怨灵/, 'ghost'], [/箭雨|飞箭/, 'arrow']]) if (re.test(d)) { mo = { m }; src = 'desc'; break; } }
  if (!mo) { MOTIF_CACHE.set(spId, null); return null; }
  // 颜色
  if (!mo.pk) {
    let best = 1e9; for (const [re, k] of PK_KW) { const i = name.search(re); if (i >= 0 && i < best) { best = i; mo.pk = k; } }
    if (!mo.pk) mo.pk = (fxPk === 'steel' || fxPk === 'gold') && /圣|光|天|神|王|金/.test(name) ? 'holy' : fxPk;
    if (mo.pk === 'water' && sp.fx === 'fire') mo.pk = 'fire';
  }
  if (sp.kind === 'summon' && !mo.dpk) mo.dpk = SUMMON_PK[sp.unit] || 'summon';
  if (!mo.n) { const nm = name.replace(/十字|一文字|一闪|万象/g, ''); for (const ch of nm) if (NUMK[ch]) { mo.n = NUMK[ch]; break; } }
  mo.src = src;
  MOTIF_CACHE.set(spId, mo);
  return mo;
}
// 是取代原本的施放演出，还是叠加在原本演出上
function motifMode(mo, sp, spId) {
  if (mo.mode) return mo.mode;
  if (SHOW[spId]) return 'overlay';
  if (mo.m === 'summon') return 'replace';
  if (sp.kind === 'pair') return 'replace';
  if (sp.kind !== 'magic' && sp.kind !== 'phys') return 'overlay';
  if (mo.m === 'dome' || mo.m === 'note' && sp.kind !== 'magic') return 'overlay';
  if (sp.style) {
    if ((sp.style === 'rain' || sp.style === 'volley') && ['sword', 'spear', 'meteor', 'star', 'arrow', 'petal', 'cannon', 'wave', 'ghost', 'combo'].includes(mo.m)) return 'replace';
    if (['dragon', 'phoenix', 'moon', 'nova', 'sun', 'taiji', 'dipper', 'four', 'elements', 'storm', 'aurora', 'wave', 'combo', 'shadow', 'fist', 'palm', 'mirror', 'rift', 'clock', 'ghost', 'bat', 'bug', 'tornado'].includes(mo.m) && sp.kind === 'magic') return 'replace';
    return 'overlay';
  }
  if (sp.kind === 'phys' && ['sword', 'elem', 'claw', 'kick'].includes(mo.m)) return 'overlay';
  return 'replace';
}
// 施法一开始（蓄力 / cut-in 期间）先把这招要用的贴图建好，免得放招当下第一次绘制时卡一下
function prewarmMotif(mo) {
  try {
    const list = mo.parts ? mo.parts : [mo];
    for (const m of list) {
      const pk = m.pk || mo.pk, d = m.dpk || mo.dpk || pk, P = palOf(pk);
      switch (m.m) {
        case 'dragon': MS.dhead(d); MS.dleg(d); MS.dtail(d); SP.glow(palOf(d).g); break;
        case 'phoenix': { const k = d === 'steel' || d === 'holy' ? 'fire' : d; glowOf('ph' + k, MS.phx(k), palOf(k).g, 10); MS.wing(k); break; }
        case 'sword': case 'spear': case 'arrow': case 'meteor': case 'rain': { const k = m.m === 'meteor' || m.m === 'rain' ? (m.head || mo.head || 'meteor') : m.m; if (k !== 'meteor' && k !== 'star' && k !== 'cannon' && MS[k]) glowOf(k + pk, MS[k](pk), P.g, 8); if (/斧/.test(m.name || '')) glowOf('axe' + pk, MS.axe(pk), P.g, 8); break; }
        case 'moon': MS.moon(d); break; case 'star': MS.star(P.g); MS.star('#fff0a0'); break; case 'petal': MS.sakura(palOf(pk === 'steel' ? 'sakura' : pk).c); break;
        case 'ghost': MS.skull(P.g); MS.wisp(P.g); break; case 'dome': MS.dome(P.g); break; case 'clock': MS.clock(PAL.ice.g); MS.clock(PAL.gold.g); MS.clock(PAL.purple.g); break;
        case 'eye': MS.eye(pk); break; case 'sun': MS.sun(pk, m.v === 'black'); MS.sun('dark', true); break; case 'taiji': MS.taiji(); break; case 'wave': MS.wave('water'); break;
        case 'fist': glowOf('fist' + (pk === 'steel' ? 'gold' : pk), MS.fist(pk === 'steel' ? 'gold' : pk), P.g, 8); break; case 'palm': glowOf('palm' + pk, MS.palm(pk), P.g, 10); break;
        case 'feather': MS.wing('white'); MS.wing('holy'); break;
      }
    }
  } catch (e) { /* 忽略 */ }
}
function motifCtx(u, sp, spId, tx, ty, cells, mo, extra) {
  const cx = tc(u.x), cy = tc(u.y), x = tc(tx), y = tc(ty), pts = cells.length ? cells.map(c => [tc(c.x), tc(c.y)]) : [[x, y]];
  let spread = 0; for (const [px, py] of pts) spread = Math.max(spread, Math.hypot(px - x, py - y) / TS);
  const friendly = typeof friendlySpell === 'function' && friendlySpell(sp);
  const shape = friendly ? (pts.length > 1 ? 'allies' : 'ally') : sp.line ? 'line' : pts.length > 1 ? 'area' : 'single';
  const phys = sp.kind === 'phys' || sp.kind === 'pair';
  const el = sp.kind === 'summon' ? 'summon' : IMPACT_HD[sp.fx] && sp.fx !== 'slash' ? (sp.fx === 'beam' ? 'fire' : sp.fx) : phys ? 'slash' : 'fire';
  return Object.assign({ u, sp, spId, cx, cy, x, y, pts, spread, friendly, shape, phys, el, mo, pk: mo.pk, P: palOf(mo.pk), n: mo.n || 0, ang: Math.atan2(y - cy, x - cx), v: FXK.v, big: (sp.power || 0) >= 28 || (sp.area || 0) >= 2, ult: false, overlay: false }, extra);
}

// ---------- 施法流程（高清）：节奏与原版相同，演出依强度放大 ----------
function spellPower(u, sp) {
  let v = Math.max((sp.power || 0) / 40, (sp.mp || 0) / 32) + (sp.area || 0) * 0.12 + (sp.line ? 0.08 : 0) + (sp.kind === 'pair' ? 0.3 : 0) + (u.boss ? 0.1 : 0);
  if (sp.kind === 'heal' || sp.kind === 'buff' || sp.kind === 'cure' || sp.kind === 'refresh') v = (sp.mp || 0) / 30 + (sp.area || 0) * 0.15;
  return clamp01(v);
}
async function castAnimHD(u, sp, spId, tx, ty) {
  const phys = sp.kind === 'phys' || sp.kind === 'pair', pair = sp.kind === 'pair';
  const fx = sp.kind === 'summon' ? 'summon' : phys ? 'slash' : sp.line ? (sp.fx === 'beam' ? 'beam' : sp.fx) : sp.fx;
  const E = ELEM[fx] || ELEM.fire, EL = ELEM[sp.fx] || E, el = ELEM[sp.fx] ? sp.fx : fx;
  const v = spellPower(u, sp), big = (sp.power || 0) >= 28 || (sp.area || 0) >= 2, ult = isUltimate(u, sp);
  const cx = tc(u.x), cy = tc(u.y), x = tc(tx), y = tc(ty);
  const friendly = typeof friendlySpell === 'function' && friendlySpell(sp);
  FXK.v = v; FXK.m = 1;
  const mo0 = motifOf(spId, sp); if (mo0 && mo0.m !== 'elem') prewarmMotif(mo0);
  if (ult) await skillCutIn(u, sp, phys && !pair ? EL : E);
  PFX.label = { text: sp.name, color: (phys ? EL : E).label, t0: now0(), dur: T(1300) };
  PFX.tint = pair ? '#ffc040' : (phys ? EL : E).glow; PFX.vig = ult ? 1 : 0.45 + v * 0.45;
  PFX.tintDark = shade(PFX.tint, -0.82);
  const dimTo = ult ? 0.5 : 0.34 + v * 0.12;
  await tween(t => { PFX.dim = dimTo * t; }, 160);

  // 1) 蓄力
  const partner = pair && B.castPartner;
  if (phys) {
    const cols = pair ? ['#ffe08a', '#ffffff', '#8ac8ff'] : EL === ELEM.slash ? E.cols : EL.cols.concat(['#ffffff']);
    emit(16 + v * 14, cx, cy, { speed: [0, 0], life: [0.35, 0.5], size: [0.04, 0.07], cols, swirl: 9, cx, cy, jitter: 0.75, shape: 'star' });
    burst(SP.glow(pair ? '#ffd060' : EL.glow), cx, cy, { r0: 0.4, r1: 0.8 + v * 0.5, mode: 'pulse', a: 0.7, dur: 520 });
    if (v > 0.4) emit(8 + v * 10, cx, cy + TS * 0.35, { speed: [0.05, 0.25], life: [0.35, 0.55], size: [0.08, 0.12], cols: ['#fff'], gravity: -2.6, jitter: 0.35, shape: EL === ELEM.fire ? 'flame' : 'circle' });
    if (pair) {
      PFX.circles.push({ x: cx, y: cy + TS * 0.32, r: 0.6, color: '#ffc040', el: 'holy', t0: now0(), dur: T(900) });
      if (partner) {
        const pxx = tc(partner.x), pyy = tc(partner.y);
        PFX.circles.push({ x: pxx, y: pyy + TS * 0.32, r: 0.6, color: '#6ab0ff', el: 'holy', t0: now0(), dur: T(900) });
        PFX.beams.push({ x0: pxx, y0: pyy, x1: cx, y1: cy, w: 0.12, color: '#ffe08a', t0: now0() + T(120), dur: T(380) });
        emit(14, pxx, pyy, { speed: [0, 0], life: [0.35, 0.5], size: [0.04, 0.07], cols: ['#8ac8ff', '#ffffff'], swirl: 9, cx: pxx, cy: pyy, jitter: 0.7, shape: 'star' });
      }
    }
  } else {
    const r = 0.78 + v * 0.38;
    PFX.circles.push({ x: cx, y: cy + TS * 0.32, r, color: E.glow, el, t0: now0(), dur: T(860) });
    emit(14 + v * 12, cx, cy, { speed: [0, 0], life: [0.4, 0.55], size: [0.035, 0.06], cols: E.cols, swirl: 7, cx, cy, jitter: 1.0, shape: 'star' });
    emit(12, cx, cy + TS * 0.3, { speed: [0.05, 0.2], life: [0.5, 0.8], size: [0.03, 0.06], cols: E.cols, gravity: -1.8, jitter: 0.35, shape: 'circle' });
    if (v > 0.45) PFX.pillars.push({ x: cx, y: cy + TS * 0.32, w: 0.32 + v * 0.15, color: E.glow, t0: now0() + T(100), dur: T(620), h: 3 });
    if (ult && !friendly && sp.kind !== 'summon') { // 目标区域的大魔法阵 + 天降光束
      PFX.circles.push({ x, y: y + TS * 0.3, r: (sp.area || 0) + 0.9, color: E.glow, el, t0: now0() + T(120), dur: T(1250), rot0: 1 });
      for (let k = 0; k < 3; k++) PFX.pillars.push({ x: x + (k - 1) * TS * 0.9, y: y + TS * 0.3, w: 0.28, color: E.glow, ang: (k - 1) * 0.22, t0: now0() + T(150 + k * 70), dur: T(560) });
    }
  }
  sfx(phys ? 'slash' : 'magic');
  await wait(420);

  const cells = spellCells(u, sp, tx, ty);
  const element = { fire: 'fire', ice: 'ice', bolt: 'bolt', wind: 'wind', rock: 'rock', dark: 'dark', holy: 'holy', acid: 'status', heal: 'heal', buff: 'buff', beam: 'fire' }[sp.fx];
  FXK.m = cells.length > 5 ? Math.max(0.3, Math.pow(5 / cells.length, 0.8)) : 1;
  const shake = s => shakeStage((s || 1) * (0.3 + v * 0.7));

  // 2) 施放：名称有对应意象的招式先交给意象构图（取代或叠加在原本演出上）
  let done = false;
  const mo = motifOf(spId, sp);
  if (mo && mo.m !== 'elem' && MOTIF[mo.m]) {
    const mode = motifMode(mo, sp, spId), C = motifCtx(u, sp, spId, tx, ty, cells, mo, { v, ult, big, overlay: mode !== 'replace' });
    if (mode === 'replace') {
      sfx(element || (phys ? 'slash' : 'magic'));
      try {
        const pr = MOTIF[mo.m](C);
        if ((big || ult) && C.hitT != null) later(C.hitT, () => { flash(C.P.g, 0.28 + v * 0.2, 320); shake(); if (ult) { sfx('boom'); haptic([30, 20, 60]); } });
        await pr; done = true;
        if (pair) pairFinish(cells, v);
      } catch (e) { console.warn('motif', spId, e); }
    } else Promise.resolve().then(() => MOTIF[mo.m](C)).catch(e => console.warn('motif', spId, e));
  }
  if (done) { /* 意象构图已演完 */ }
  else if (SHOW[spId]) {
    await SHOW[spId]({ u, sp, cx, cy, x, y, cells, E });
  } else if (sp.style && STYLE[sp.style]) {
    const ang = Math.atan2(y - cy, x - cx);
    const hitCells = sp.around ? cells.filter(c => c.x !== u.x || c.y !== u.y) : cells;
    await STYLE[sp.style]({ u, sp, cx, cy, x, y, ang, cells: hitCells, big, E });
    if (sp.kind !== 'debuff' && sp.fx && IMPACT[sp.fx] && ['fire', 'holy', 'dark', 'bolt', 'ice', 'wind', 'acid'].includes(sp.fx)) hitCells.forEach((c, k) => setTimeout(() => IMPACT[sp.fx](tc(c.x), tc(c.y), false, v), T(k * 40)));
    if (pair) pairFinish(hitCells, v);
    if (big || v > 0.7) { flash(EL.glow, 0.3 + v * 0.2, 300); shake(); }
    await wait(200);
  } else if (sp.line) {
    const end = cells[cells.length - 1] || { x: tx, y: ty };
    sfx(element || 'magic');
    const ex = tc(end.x), ey = tc(end.y), a = Math.atan2(ey - cy, ex - cx);
    PFX.beams.push({ x0: cx, y0: cy, x1: ex + Math.cos(a) * TS * 0.4, y1: ey + Math.sin(a) * TS * 0.4, w: big ? 0.62 : 0.46, color: E.glow, t0: now0(), dur: T(700) });
    burst(SP.burst(E.glow), cx, cy, { r0: 0.3, r1: 1.1 + v * 0.5, a: 0.75, spin: 2, dur: 520 });
    for (let k = 0; k < 4; k++) ring(cx + (ex - cx) * (k + 1) / 5, cy + (ey - cy) * (k + 1) / 5, 0.15, 0.55, E.glow, 380, { delay: 60 + k * 50 });
    if (fx === 'ice') emit(10, cx, cy, { angle: a, spread: 0.15, speed: [5, 8], life: [0.25, 0.45], size: [0.06, 0.1], cols: ELEM.ice.cols, drag: 0.95, shape: 'shard' });
    if (fx === 'bolt') PFX.bolts.push({ x0: cx, y0: cy, x1: ex, y1: ey, color: '#fff6a0', t0: now0() + T(60), dur: T(520) });
    await wait(180);
    cells.forEach((c, k) => setTimeout(() => (IMPACT[fx] || IMPACT.fire)(tc(c.x), tc(c.y), false, v), T(k * 40)));
    shake();
    if (big) flash(E.glow, 0.4, 300);
    await wait(360);
  } else if (phys) {
    // 剑法：冲出的剑气 + 连续月牙斩
    sfx('slash');
    const ang = Math.atan2(y - cy, x - cx);
    emit(16, cx, cy, { angle: ang, spread: 0.15, speed: [4, 6.5], life: [0.18, 0.28], size: [0.03, 0.05], cols: ['#ffffff', EL.glow], shape: 'spark' });
    PFX.beams.push({ x0: cx, y0: cy, x1: x, y1: y, w: 0.1 + v * 0.1, color: pair ? '#ffe08a' : EL.glow, t0: now0(), dur: T(220) });
    await wait(150);
    const hits = pair ? 4 : (sp.power || 0) >= 18 ? 3 : 2;
    for (const c of cells) for (let k = 0; k < hits; k++) {
      const col = pair ? (k % 2 ? '#ffd060' : '#8ac8ff') : EL === ELEM.slash ? (k % 2 ? '#ffffff' : '#a8c8ff') : EL.glow;
      PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: -0.8 + k * (1.6 / Math.max(1, hits - 1)) + rand(-0.15, 0.15), len: pair ? 0.85 : 0.62 + v * 0.15, color: col, t0: now0() + T(k * 90), dur: T(320), thin: 1 + v * 0.5 });
      setTimeout(() => HDFX() && hitSparkHD(tc(c.x) + rand(-0.15, 0.15) * TS, tc(c.y) + rand(-0.15, 0.15) * TS, ['#ffffff', col, EL.glow]), T(k * 90 + 60));
    }
    cells.forEach(c => IMPACT.slash(tc(c.x), tc(c.y)));
    if (pair) pairFinish(cells, v);
    if (pair || big) { flash('#ffffff', 0.45, 260); shake(); }
    if (sp.fx === 'fire' || sp.fx === 'dark' || sp.fx === 'holy' || sp.fx === 'ice' || sp.fx === 'bolt' || sp.fx === 'wind') setTimeout(() => cells.forEach(c => IMPACT[sp.fx](tc(c.x), tc(c.y), false, v)), T(160));
    await wait(160 + hits * 90);
  } else if (sp.kind === 'summon') {
    sfx('summon');
    PFX.circles.push({ x, y: y + TS * 0.3, r: 0.95 + v * 0.3, color: '#b090ff', el: 'summon', t0: now0(), dur: T(1150) });
    PFX.circles.push({ x: cx, y: cy + TS * 0.32, r: 0.5, color: '#d8c0ff', el: 'summon', t0: now0(), dur: T(700) });
    PFX.pillars.push({ x, y: y + TS * 0.3, w: 0.62, color: '#d8c0ff', t0: now0() + T(250), dur: T(720) });
    burst(SP.void(), x, y + TS * 0.1, { r0: 0.1, r1: 0.7, add: false, mode: 'pulse', dur: 620, spin: 3, fy: 0.5 });
    emit(30, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.04, 0.08], cols: ELEM.summon.cols, swirl: 6, cx: x, cy: y, vy: -1.2, jitter: 0.85, shape: 'star' });
    emit(10, x, y + TS * 0.3, { speed: [0.1, 0.3], life: [0.7, 1], size: [0.06, 0.1], cols: ['#b090ff', '#e0d0ff'], gravity: -1.8, jitter: 0.5, shape: 'spark' });
    await wait(650);
    flash('#ffffff', 0.4, 240); burst(SP.burst('#d8c0ff'), x, y, { r0: 0.4, r1: 1.6, a: 0.85, spin: 1, dur: 520, fin: 0.05 });
    ring(x, y + TS * 0.3, 0.2, 1.4, '#d8c0ff', 480, { flat: true }); shake(0.6);
  } else {
    const projectile = ['fire', 'ice', 'rock', 'dark', 'holy', 'acid', 'wind'].includes(fx) && (u.x !== tx || u.y !== ty) && !friendly && spId !== 'meteor';
    if (projectile && !big) await projectileHD(fx, cx, cy, x, y, v);
    sfx(element || 'magic');
    if (spId === 'meteor') cells.forEach((c, k) => setTimeout(() => IMPACT.rock(tc(c.x), tc(c.y), true, v), T(k * 70)));
    else if (spId === 'stormThunder' || spId === 'thunder') cells.forEach((c, k) => setTimeout(() => IMPACT.bolt(tc(c.x), tc(c.y), spId === 'stormThunder', v), T(k * 60)));
    else cells.forEach((c, k) => setTimeout(() => (IMPACT[fx] || IMPACT.fire)(tc(c.x), tc(c.y), big, v), T(k * 35)));
    if (fx === 'slash') cells.forEach((c, k) => { for (let j = 0; j < 2; j++) PFX.slashes.push({ x: tc(c.x), y: tc(c.y), angle: j ? 0.7 : -0.7, len: 0.65, color: j ? '#ffffff' : '#a8c8ff', t0: now0() + T(k * 35 + j * 80), dur: T(300), thin: 1.2 }); });
    if (friendly && (sp.area || 0) >= 1) { // 范围治疗 / 增益：脚下一圈大法阵
      PFX.circles.push({ x, y: y + TS * 0.3, r: (sp.area || 1) + 0.6, color: E.glow, el, t0: now0(), dur: T(900) });
      burst(SP.glow(E.glow), x, y + TS * 0.3, { r0: 0.6, r1: (sp.area || 1) + 1, fy: 0.42, a: 0.7, dur: 800 });
    }
    if (sp.kind === 'status' || sp.kind === 'debuff' || sp.kind === 'death') {
      const sc = sp.status ? STATUS_COLOR[sp.status] : '#ff7a9a';
      PFX.circles.push({ x, y: y + TS * 0.3, r: 0.6, color: sc, el: sp.kind === 'death' ? 'dark' : 'star5', pat: sp.kind === 'death' ? 'star5i' : 'star5', t0: now0() + T(150), dur: T(700) });
      cells.forEach(c => emit(10, tc(c.x), tc(c.y), { speed: [0, 0], life: [0.5, 0.8], size: [0.04, 0.07], cols: ['#ffffff', sc], swirl: -5, cx: tc(c.x), cy: tc(c.y), jitter: 0.8, shape: 'star' }));
      if (sp.kind === 'death') {
        ring(x, y, 1.6, 0.05, '#000000', 600);
        burst(SP.void(), x, y, { r0: 0.2, r1: 1.4, add: false, mode: 'pulse', dur: 700, spin: -3 });
        emit(8, x, y, { speed: [0, 0], life: [0.7, 1.1], size: [0.3, 0.45], cols: ['#1a0428', '#3a0a5a'], swirl: -5, cx: x, cy: y, jitter: 0.9, shape: 'smoke' });
        flash('#2a0a40', 0.5, 400);
      }
    }
    if (big) { flash(E.glow, 0.35 + v * 0.2, 380); shake(); sfx('boom'); haptic([30, 20, 60]); burst(SP.burst(E.glow), x, y, { r0: 0.5, r1: (sp.area || 1) + 1.6, a: 0.55, spin: 0.8, dur: 600, fin: 0.06 }); }
    else if (!friendly && sp.kind === 'magic') shake(0.4);
    await wait(big || spId === 'meteor' ? 620 : 440);
  }
  FXK.m = 1;
  // 3) 收尾：变暗逐渐恢复（不阻塞伤害结算）
  tween(t => { PFX.dim = dimTo * (1 - t); }, 450);
}
// 合击收尾：金蓝交叉十字斩 + 放射光
function pairFinish(cells, v) {
  if (!cells.length) return;
  const c = cells[(cells.length / 2) | 0], x = tc(c.x), y = tc(c.y);
  setTimeout(() => {
    if (!HDFX()) return;
    PFX.slashes.push({ x, y, angle: Math.PI / 4, len: 0.95, color: '#ffd060', t0: now0(), dur: T(300), straight: true, thin: 1.6 });
    PFX.slashes.push({ x, y, angle: -Math.PI / 4, len: 0.95, color: '#6ab0ff', t0: now0() + T(50), dur: T(300), straight: true, thin: 1.6 });
    burst(SP.burst('#ffe08a'), x, y, { r0: 0.4, r1: 2.2, a: 0.8, spin: 1.2, dur: 560, fin: 0.05 });
    burst(SP.core('#ffd060'), x, y, { r0: 0.3, r1: 1.2, dur: 300, fin: 0.04 });
    ring(x, y, 0.2, 1.8, '#ffd060', 460); ring(x, y, 0.2, 1.4, '#6ab0ff', 460, { delay: 60 });
    emit(20, x, y, { speed: [2.5, 5.5], life: [0.3, 0.6], size: [0.03, 0.05], cols: ['#ffffff', '#ffe08a', '#8ac8ff'], drag: 0.78, shape: 'spark' });
  }, T(200));
}
// 投射物：各元素有自己的弹头与尾迹
function projectileHD(fx, cx, cy, x, y, v) {
  const a = Math.atan2(y - cy, x - cx);
  return tween(t => {
    const px = cx + (x - cx) * t, py = cy + (y - cy) * t - Math.sin(t * Math.PI) * TS * 0.4;
    const o = { speed: [0, 0.3], life: [0.06, 0.08], jitter: 0 };
    switch (fx) {
      case 'fire': emit(1, px, py, { ...o, size: [0.36, 0.4], cols: ['#ffa040'], shape: 'core' }); emit(2, px, py, { speed: [0.1, 0.5], life: [0.2, 0.35], size: [0.1, 0.16], cols: ['#fff'], shape: 'flame', gravity: -1 }); emit(1, px, py, { speed: [0.5, 1.5], life: [0.3, 0.5], size: [0.02, 0.04], cols: ['#ffd060'], gravity: 2, shape: 'ember' }); break;
      case 'ice': emit(1, px, py, { ...o, size: [0.32, 0.34], cols: ['#9ae0ff'], shape: 'core' }); emit(1, px, py, { speed: [0, 0], vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5, life: [0.06, 0.07], size: [0.14, 0.14], cols: ['#e8f8ff'], shape: 'shard' }); emit(2, px, py, { speed: [0.1, 0.4], life: [0.3, 0.5], size: [0.03, 0.06], cols: ['#ffffff', '#c8f0ff'], shape: 'star', jitter: 0.1 }); break;
      case 'rock': emit(1, px, py, { ...o, size: [0.3, 0.32], cols: ['#ffb060'], shape: 'glow' }); emit(1, px, py, { ...o, life: [0.05, 0.06], size: [0.26, 0.26], cols: ['#a07848'], shape: 'rock' }); emit(1, px, py, { speed: [0.1, 0.4], life: [0.3, 0.5], size: [0.12, 0.18], cols: ['#8a7458'], shape: 'smoke' }); break;
      case 'dark': emit(1, px, py, { ...o, size: [0.4, 0.42], cols: ['#a040ff'], shape: 'glow' }); emit(1, px, py, { ...o, size: [0.26, 0.28], cols: ['#000'], shape: 'void' }); emit(2, px, py, { speed: [0.1, 0.4], life: [0.3, 0.5], size: [0.03, 0.06], cols: ELEM.dark.cols, shape: 'circle' }); break;
      case 'holy': emit(1, px, py, { ...o, size: [0.38, 0.4], cols: ['#ffe880'], shape: 'core' }); emit(2, px, py, { speed: [0.1, 0.5], life: [0.3, 0.5], size: [0.04, 0.07], cols: ELEM.holy.cols, shape: 'star', jitter: 0.1 }); break;
      case 'acid': emit(1, px, py, { ...o, size: [0.14, 0.16], cols: ['#c8ff4a'], shape: 'bubble' }); emit(1, px, py, { ...o, size: [0.24, 0.26], cols: ['#9aff4a'], shape: 'glow' }); emit(1, px, py, { speed: [0.1, 0.4], life: [0.3, 0.5], size: [0.03, 0.06], cols: ELEM.acid.cols, shape: 'circle', gravity: 1 }); break;
      case 'wind': emit(1, px, py, { ...o, size: [0.36, 0.38], cols: ['#d8fff0'], shape: 'blade', rot: a + Math.PI / 2 + t * 20 }); emit(1, px, py, { speed: [0.2, 0.6], life: [0.3, 0.5], size: [0.03, 0.06], cols: ELEM.wind.cols, shape: 'circle' }); break;
    }
  }, 300);
}
// 空闲时预先建好常用贴图（魔法阵、光晕、火焰…），避免第一次施法时卡一下
function warmSprites() {
  const jobs = [];
  for (const [el, E] of Object.entries(ELEM)) {
    jobs.push(() => { SP.glow(E.glow); SP.core(E.glow); SP.flare(E.glow); SP.ring(E.glow); SP.pillar(E.glow); SP.burst(E.glow); });
    jobs.push(() => runeCircle(E.glow, CIRCLE_PAT[el] || 'star6', false), () => runeCircle(E.glow, CIRCLE_PAT[el] || 'star6', true));
  }
  jobs.push(() => { SP.flame(0); SP.flame(1); SP.flame(2); SP.pillar('#ffffff'); SP.ring('#ffffff'); SP.streak(); SP.void(); SP.flare('#ffffff'); });
  const idle = window.requestIdleCallback ? f => window.requestIdleCallback(f, { timeout: 3000 }) : f => setTimeout(f, 50);
  const step = dl => { let n = 0; while (jobs.length && (n++ === 0 || (dl && dl.timeRemaining && dl.timeRemaining() > 6))) { try { jobs.shift()(); } catch (e) { /* 忽略 */ } } if (jobs.length) idle(step); };
  idle(step);
}
setTimeout(() => { if (HDFX()) warmSprites(); }, 1500);
return { IMPACT_HD, hitSparkHD, castAnimHD, skillCutInHD, drawSpellFxHD, drawFxHD, FXK, burst, SP, bloom, ring, motifOf, motifMode, MOTIF, summonImg };
})();
const { IMPACT_HD, hitSparkHD, castAnimHD, skillCutInHD, drawSpellFxHD, drawFxHD, FXK } = FXHD;
const fxBurst = FXHD.burst, FXSPR = FXHD.SP, fxBloom = FXHD.bloom, fxRing = FXHD.ring;
