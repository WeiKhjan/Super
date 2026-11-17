// 超时空英雄传说 · 移动重制版 —— 地图上的法术演出（粒子、魔法阵、投射物、各系命中特效）
'use strict';

const PFX = { parts: [], circles: [], bolts: [], beams: [], pillars: [], rings: [], slashes: [], bursts: [], flash: null, label: null, dim: 0, last: 0, tint: null, vig: 0 };
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
function drawSpellFx(now) { if (HDFX()) drawSpellFxHD(now); else { if (PFX.bursts.length) PFX.bursts.length = 0; drawSpellFxPx(now); } }
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
function fxActive() { return PFX.parts.length || PFX.circles.length || PFX.bolts.length || PFX.beams.length || PFX.pillars.length || PFX.rings.length || PFX.slashes.length || PFX.bursts.length; }
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
  c.crisp = /^(fl|fr|sw|fu|cr|ic|sk)/.test(key);
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
    if (sh === 'smoke' || sh === 'rock' || sh === 'shard' || sh === 'feather' || sh === 'petal' || sh === 'leaf' || sh === 'arrow' || sh === 'bubble' || sh === 'void' || sh === 'mist') LIST_OVER.push(q);
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

  // 2) 施放
  if (SHOW[spId]) {
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
return { IMPACT_HD, hitSparkHD, castAnimHD, skillCutInHD, drawSpellFxHD, drawFxHD, FXK, burst, SP, bloom, ring };
})();
const { IMPACT_HD, hitSparkHD, castAnimHD, skillCutInHD, drawSpellFxHD, drawFxHD, FXK } = FXHD;
const fxBurst = FXHD.burst, FXSPR = FXHD.SP, fxBloom = FXHD.bloom, fxRing = FXHD.ring;
