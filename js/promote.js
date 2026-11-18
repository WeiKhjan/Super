// 超时空英雄传说 · 移动重制版 —— 转职演出（地图光柱 → 全屏变身 → 新职业登场）
'use strict';

const PROMO = { on: false };
const promoCv = document.getElementById('promo-cv');
const promoCtx = promoCv.getContext('2d');
const SIL = {};
// 精灵的纯色剪影（变身时的发光体）
function silhouette(src, color) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function promoResize() {
  const w = Math.min(window.innerWidth, 560), h = Math.min(window.innerHeight, Math.round(w * 1.9));
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  promoCv.style.width = w + 'px'; promoCv.style.height = h + 'px';
  promoCv.width = Math.round(w * dpr); promoCv.height = Math.round(h * dpr);
  Object.assign(PROMO, { W: w, H: h, dpr });
}

async function promoteAnim(u, fromTier) {
  if (AUTO || !OPT.anim) return;
  const toTier = u.tier, newDef = tierDef(u), sprNew = unitSprite(u);
  u.tier = fromTier; // 旧职阶（分支前用 A 路线的外观）
  const oldDef = tierDef(u), sprOld = unitSprite(u);
  // HD：用战斗画面的矢量纸娃娃（怪物类则用高清精灵）
  const hd = typeof artHD === 'function' && artHD() && typeof DFIG !== 'undefined';
  let hdOld = null, hdNew = null;
  if (hd) {
    try {
      const mk = () => { const sp = DFIG.specOf(u); return sp.kind === 'doll' ? { spec: sp } : (() => { const c = typeof unitSpriteHD === 'function' ? unitSpriteHD(u) : null; return c ? { spr: c, sil: silhouette(c, '#fff6d0') } : null; })(); };
      hdOld = mk(); u.tier = toTier; hdNew = mk();
    } catch (e) { console.warn('转职 HD 立绘失败，改用像素', e); hdOld = hdNew = null; }
  }
  u.tier = toTier;

  // 1) 地图上：旧形象被光柱包围
  u.tier = fromTier;
  if (typeof PFX !== 'undefined') {
    const x = tc(u.x), y = tc(u.y);
    PFX.circles.push({ x, y: y + TS * 0.32, r: 0.7, color: '#ffe080', t0: now0(), dur: T(1000) });
    PFX.pillars.push({ x, y: y + TS * 0.3, w: 0.6, color: '#fff2a0', t0: now0() + T(150), dur: T(900) });
    emit(40, x, y, { speed: [0, 0], life: [0.6, 1], size: [0.04, 0.08], cols: ELEM.holy.cols, swirl: 7, cx: x, cy: y, vy: -1.4, jitter: 0.8, shape: 'star' });
    tween(t => { PFX.dim = 0.45 * t; }, 250);
  }
  sfx('charge');
  await wait(850);
  u.tier = toTier;

  // 2) 全屏变身
  promoResize();
  const el = document.getElementById('promo');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  const REVEAL = T(1500), END = T(4200);
  Object.assign(PROMO, {
    on: true, t0: performance.now(), u, sprOld, sprNew, oldName: oldDef.name, newName: newDef.name, REVEAL, END,
    silOld: silhouette(sprOld, '#fff6d0'), silNew: silhouette(sprNew, '#fff6d0'), parts: [], fanfare: false, skip: false, hd: !!(hdOld && hdNew), hdOld, hdNew,
    extra: [newDef.mov > oldDef.mov && `移动 ${oldDef.mov} → ${newDef.mov}`, newDef.move !== oldDef.move && newDef.move === 'fly' && '获得飞行能力'].filter(Boolean),
  });
  const onTap = () => {
    const el2 = performance.now() - PROMO.t0;
    if (el2 < PROMO.REVEAL) PROMO.t0 = performance.now() - PROMO.REVEAL; // 先跳到登场
    else PROMO.skip = true;
  };
  el.addEventListener('pointerdown', onTap);
  requestAnimationFrame(promoRender);
  await new Promise(res => {
    const chk = () => (PROMO.skip || performance.now() - PROMO.t0 >= PROMO.END ? res() : setTimeout(chk, 50));
    chk();
  });
  el.removeEventListener('pointerdown', onTap);
  el.classList.remove('in'); el.classList.add('out');
  await sleep(260);
  el.hidden = true; PROMO.on = false;
  if (typeof PFX !== 'undefined') {
    const x = tc(u.x), y = tc(u.y);
    tween(t => { PFX.dim = 0.45 * (1 - t); }, 350);
    PFX.rings.push({ x, y: y + TS * 0.3, r0: 0.2, r1: 1.2, color: '#ffe080', t0: now0(), dur: T(500), flat: true });
    emit(24, x, y, { speed: [0.3, 1.6], life: [0.5, 0.9], size: [0.04, 0.08], cols: ELEM.holy.cols, gravity: -0.8, shape: 'star' });
  }
}

function promoRender(now) {
  if (!PROMO.on) return;
  requestAnimationFrame(promoRender);
  if (PROMO.hd) { try { return promoRenderHD(now); } catch (e) { console.warn('转职 HD 演出失败，改用像素', e); PROMO.hd = false; } }
  const P = PROMO, g = promoCtx, W = P.W, H = P.H, t = now - P.t0, R = P.REVEAL;
  const dt = Math.min(0.05, (now - (P.last || now)) / 1000); P.last = now;
  g.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
  const cx = W / 2, cy = H * 0.45, S = Math.min(W * 0.34, H * 0.22); // 精灵显示尺寸
  const revealed = t >= R, rp = revealed ? Math.min(1, (t - R) / T(700)) : 0;

  // 背景：深紫 → 登场后转为金色光晕
  const bg = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.75);
  bg.addColorStop(0, revealed ? '#5a3a10' : '#2a1450'); bg.addColorStop(0.5, revealed ? '#24103a' : '#120828'); bg.addColorStop(1, '#05020e');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  g.save(); g.globalCompositeOperation = 'lighter';
  // 旋转光芒
  const rays = 14, rayA = revealed ? 0.22 + 0.1 * Math.sin(now / 300) : Math.min(1, t / R) * 0.12;
  g.save(); g.translate(cx, cy); g.rotate(now / 3000);
  for (let i = 0; i < rays; i++) {
    g.rotate(Math.PI * 2 / rays);
    const grd = g.createLinearGradient(0, 0, 0, -Math.max(W, H));
    grd.addColorStop(0, `rgba(255,230,140,${rayA})`); grd.addColorStop(1, 'rgba(255,230,140,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.lineTo(-S * 0.35, -Math.max(W, H)); g.lineTo(S * 0.35, -Math.max(W, H)); g.closePath(); g.fill();
  }
  g.restore();
  // 脚下魔法阵（两层反向旋转）
  const gy = cy + S * 0.48;
  for (const [r, dir, col] of [[S * 0.95, 1, '#ffd060'], [S * 0.7, -1.6, '#fff2b0']]) {
    g.save(); g.translate(cx, gy); g.scale(1, 0.32); g.rotate(dir * now / 900);
    g.strokeStyle = col; g.globalAlpha = 0.85; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.86, 0, 7); g.stroke();
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const a = k * Math.PI * 4 / 6; g[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); }
    g.stroke();
    for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.fillStyle = col; g.fillRect(Math.cos(a) * r * 0.93 - 3, Math.sin(a) * r * 0.93 - 3, 6, 6); }
    g.restore();
  }
  g.globalAlpha = 1;

  // 粒子：蓄力时向中心旋入，登场时向外爆开
  if (!revealed) {
    for (let k = 0; k < 4; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.45 + Math.random() * 0.2);
      P.parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, a, d, life: 0, max: 0.9, size: 2 + Math.random() * 3, col: pick(['#ffffff', '#fff2a0', '#ffd060', '#c8a0ff']), mode: 'in' });
    }
  } else if (!P.fanfare) {
    P.fanfare = true; sfx('promote');
    for (let k = 0; k < 120; k++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 420;
      P.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8 + Math.random() * 0.9, size: 2 + Math.random() * 4, col: pick(['#ffffff', '#fff2a0', '#ffd060', '#ffb040']), mode: 'out' });
    }
  } else if (Math.random() < 0.5) {
    P.parts.push({ x: cx + (Math.random() - 0.5) * S * 1.4, y: gy, vx: 0, vy: -40 - Math.random() * 60, life: 0, max: 1.4, size: 2 + Math.random() * 2, col: pick(['#fff2a0', '#ffd060', '#ffffff']), mode: 'up' });
  }
  for (let i = P.parts.length - 1; i >= 0; i--) {
    const p = P.parts[i]; p.life += dt;
    if (p.life >= p.max) { P.parts.splice(i, 1); continue; }
    if (p.mode === 'in') { const k = p.life / p.max; p.a += dt * 2.4; const d = p.d * (1 - k * k); p.x = cx + Math.cos(p.a) * d; p.y = cy + Math.sin(p.a) * d; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    const a = p.mode === 'in' ? Math.min(1, p.life / p.max * 3) : 1 - p.life / p.max;
    g.globalAlpha = a; g.fillStyle = p.col;
    g.save(); g.translate(p.x, p.y); g.rotate(p.life * 4);
    g.fillRect(-p.size / 2, -p.size * 1.5, p.size, p.size * 3); g.fillRect(-p.size * 1.5, -p.size / 2, p.size * 3, p.size);
    g.restore();
  }
  // 中心光球
  const orb = revealed ? (1 - rp) * 0.9 + 0.25 : Math.min(1, t / R) * 0.8;
  const og = g.createRadialGradient(cx, cy, 0, cx, cy, S * 0.9);
  og.addColorStop(0, `rgba(255,250,220,${orb})`); og.addColorStop(1, 'rgba(255,220,120,0)');
  g.globalAlpha = 1; g.fillStyle = og; g.fillRect(cx - S, cy - S, S * 2, S * 2);
  g.restore();

  // 精灵：旧形象发光 → 新旧剪影越闪越快 → 新形象
  g.imageSmoothingEnabled = false;
  const bob = Math.sin(now / 260) * S * 0.02;
  const draw = (img, alpha, scale) => {
    const s = S * (scale || 1);
    g.globalAlpha = alpha; g.drawImage(img, cx - s / 2, cy - s / 2 + bob, s, s);
  };
  if (!revealed) {
    const p = t / R;
    if (p < 0.4) { draw(P.sprOld, 1); draw(P.silOld, p / 0.4 * 0.7); }
    else {
      // 闪烁频率从 4Hz 加速到约 20Hz
      const f = 4 + 16 * ((p - 0.4) / 0.6) ** 2, which = Math.floor((t / 1000) * f) % 2;
      draw(which ? P.silNew : P.silOld, 1, 1 + (p - 0.4) * 0.15);
    }
  } else {
    const pop = rp < 0.25 ? 1.25 - rp : 1;
    draw(P.sprNew, 1, pop);
    if (rp < 1) draw(P.silNew, 1 - rp, pop);
  }
  g.globalAlpha = 1;

  // 登场瞬间的白色闪光
  if (revealed && t - R < T(450)) { g.fillStyle = `rgba(255,255,255,${1 - (t - R) / T(450)})`; g.fillRect(0, 0, W, H); }

  // 文字
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = s => `bold ${s}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  const outlined = (txt, x, y, size, fill, stroke) => {
    g.font = font(size); g.lineJoin = 'round'; g.lineWidth = Math.max(3, size / 7);
    g.strokeStyle = stroke || '#2a1000'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y);
  };
  g.globalAlpha = Math.min(1, t / T(300));
  outlined(P.u.name, cx, cy - S * 1.55, Math.round(W * 0.055), '#ffffff', '#120828');
  if (!revealed) outlined(P.oldName, cx, cy + S * 0.85, Math.round(W * 0.06), '#d8c8ff', '#120828');
  if (revealed) {
    // 「转职」大字由大缩小落定
    const k = Math.min(1, (t - R) / T(380)), sc = 1 + (1 - k) * 1.6;
    g.save(); g.translate(cx, cy - S * 1.05); g.scale(sc, sc); g.globalAlpha = k;
    const tg = g.createLinearGradient(0, -W * 0.06, 0, W * 0.06);
    tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.5, '#ffd060'); tg.addColorStop(1, '#e08a10');
    outlined('转 职', 0, 0, Math.round(W * 0.12), tg);
    g.restore();
    const k2 = Math.min(1, Math.max(0, (t - R - T(250)) / T(400)));
    g.globalAlpha = k2;
    const ty = cy + S * 0.85 + (1 - k2) * 12;
    g.font = font(Math.round(W * 0.05)); const wOld = g.measureText(P.oldName).width;
    g.font = font(Math.round(W * 0.075)); const wNew = g.measureText(P.newName).width;
    const gap = W * 0.1, x0 = cx - (wOld + gap + wNew) / 2;
    outlined(P.oldName, x0 + wOld / 2, ty, Math.round(W * 0.05), '#b8a8d8', '#120828');
    outlined('▶', x0 + wOld + gap / 2, ty, Math.round(W * 0.05), '#ffd060');
    outlined(P.newName, x0 + wOld + gap + wNew / 2, ty, Math.round(W * 0.075), '#ffe27a');
    P.extra.forEach((s, i) => outlined(s, cx, ty + W * (0.085 + i * 0.06), Math.round(W * 0.042), '#a8f0ff', '#04203a'));
    if (t - R > T(1200)) { g.globalAlpha = 0.5 + 0.5 * Math.sin(now / 250); outlined('点击继续', cx, H * 0.92, Math.round(W * 0.035), '#ffffff', '#120828'); }
  }
  g.globalAlpha = 1;
}

// ---------- HD 画风：矢量角色 + 加色光效 + 光泽文字 ----------
function promoGlow(g, x, y, r, rgb, a) {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(0.3, `rgba(${rgb},${a * 0.8})`); rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
}
function promoRenderHD(now) {
  const P = PROMO, g = promoCtx, W = P.W, H = P.H, t = now - P.t0, R = P.REVEAL;
  const dt = Math.min(0.05, (now - (P.last || now)) / 1000); P.last = now;
  g.setTransform(P.dpr, 0, 0, P.dpr, 0, 0);
  g.imageSmoothingEnabled = true;
  const cx = W / 2, cy = H * 0.45, S = Math.min(W * 0.34, H * 0.22);
  const revealed = t >= R, rp = revealed ? Math.min(1, (t - R) / T(700)) : 0, pr = Math.min(1, t / R);

  // 背景：深紫夜空 → 登场后转为金色晨光；远处星点与柔光
  const bg = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.8);
  if (revealed) { bg.addColorStop(0, '#8a5a1a'); bg.addColorStop(0.35, '#4a2440'); bg.addColorStop(0.7, '#1a0c34'); bg.addColorStop(1, '#05020e'); }
  else { bg.addColorStop(0, '#3a2070'); bg.addColorStop(0.45, '#1a0c3a'); bg.addColorStop(1, '#05020e'); }
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (!P.stars) P.stars = Array.from({ length: 70 }, () => [Math.random(), Math.random(), Math.random() * 1.4 + 0.4, Math.random() * 6]);
  for (const [sx, sy, sr, ph] of P.stars) { g.globalAlpha = 0.35 + 0.35 * Math.sin(now / 500 + ph); g.fillStyle = '#e8e0ff'; g.beginPath(); g.arc(sx * W, sy * H, sr, 0, 7); g.fill(); }
  g.globalAlpha = 1;

  g.save(); g.globalCompositeOperation = 'lighter';
  // 旋转光芒（柔边扇形）
  const rays = 14, rayA = revealed ? 0.2 + 0.08 * Math.sin(now / 300) : pr * 0.12, L = Math.max(W, H);
  g.save(); g.translate(cx, cy); g.rotate(now / 3000);
  for (let i = 0; i < rays; i++) {
    g.rotate(Math.PI * 2 / rays);
    const grd = g.createLinearGradient(0, 0, 0, -L);
    grd.addColorStop(0, `rgba(255,230,150,${rayA})`); grd.addColorStop(1, 'rgba(255,230,150,0)');
    g.fillStyle = grd; g.beginPath(); g.moveTo(0, 0); g.lineTo(-S * (i % 2 ? 0.22 : 0.4), -L); g.lineTo(S * (i % 2 ? 0.22 : 0.4), -L); g.closePath(); g.fill();
  }
  g.restore();
  // 脚下魔法阵：发光细线 + 符文点
  const gy = cy + S * 0.62;
  for (const [r, dir, col] of [[S * 1.05, 1, '255,208,96'], [S * 0.76, -1.6, '255,242,176']]) {
    g.save(); g.translate(cx, gy); g.scale(1, 0.3); g.rotate(dir * now / 900);
    for (const [lw, a] of [[8, 0.18], [2.2, 0.95]]) {
      g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = lw;
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.86, 0, 7); g.stroke();
      g.beginPath(); for (let k = 0; k <= 6; k++) { const a2 = k * Math.PI * 4 / 6; g[k ? 'lineTo' : 'moveTo'](Math.cos(a2) * r * 0.86, Math.sin(a2) * r * 0.86); } g.stroke();
    }
    for (let k = 0; k < 12; k++) { const a2 = k * Math.PI / 6; promoGlow(g, Math.cos(a2) * r * 0.93, Math.sin(a2) * r * 0.93, 9, col, 0.9); }
    g.restore();
  }
  // 粒子：蓄力时旋入，登场时爆开，之后从法阵缓缓升起
  if (!revealed) {
    for (let k = 0; k < 4; k++) {
      const a = Math.random() * Math.PI * 2, d = Math.max(W, H) * (0.45 + Math.random() * 0.2);
      P.parts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, a, d, life: 0, max: 0.9, size: 2 + Math.random() * 3, col: pick(['255,255,255', '255,242,160', '255,208,96', '200,160,255']), mode: 'in' });
    }
  } else if (!P.fanfare) {
    P.fanfare = true; sfx('promote');
    for (let k = 0; k < 140; k++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 460;
      P.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.8 + Math.random() * 0.9, size: 2 + Math.random() * 4, col: pick(['255,255,255', '255,242,160', '255,208,96', '255,176,64']), mode: 'out' });
    }
  } else if (Math.random() < 0.6) {
    P.parts.push({ x: cx + (Math.random() - 0.5) * S * 1.6, y: gy, vx: 0, vy: -40 - Math.random() * 70, life: 0, max: 1.5, size: 1.5 + Math.random() * 2.5, col: pick(['255,242,160', '255,208,96', '255,255,255']), mode: 'up' });
  }
  for (let i = P.parts.length - 1; i >= 0; i--) {
    const p = P.parts[i]; p.life += dt;
    if (p.life >= p.max) { P.parts.splice(i, 1); continue; }
    const px0 = p.x, py0 = p.y;
    if (p.mode === 'in') { const k = p.life / p.max; p.a += dt * 2.4; const d = p.d * (1 - k * k); p.x = cx + Math.cos(p.a) * d; p.y = cy + Math.sin(p.a) * d; }
    else { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    const a = p.mode === 'in' ? Math.min(1, p.life / p.max * 3) : 1 - p.life / p.max;
    // 带拖尾的光点
    g.strokeStyle = `rgba(${p.col},${a * 0.6})`; g.lineWidth = p.size; g.lineCap = 'round';
    const tl = p.mode === "in" ? 0.6 : 1.5; g.beginPath(); g.moveTo(px0 - (p.x - px0) * tl, py0 - (p.y - py0) * tl); g.lineTo(p.x, p.y); g.stroke();
    promoGlow(g, p.x, p.y, p.size * 3, p.col, a * 0.9);
  }
  // 中心光球
  const orb = revealed ? (1 - rp) * 0.9 + 0.25 : pr * 0.8;
  promoGlow(g, cx, cy, S * 1.1, '255,220,120', orb);
  g.restore();

  // 角色：旧形象发光 → 新旧剪影越闪越快 → 新形象（放大落定）
  const bob = Math.sin(now / 260) * S * 0.02;
  const fig = (F, alpha, scale, sil) => {
    if (!F || alpha <= 0) return;
    const sc = scale || 1;
    g.save(); g.globalAlpha = alpha;
    if (F.spec) {
      const s = S / 36 * sc, feet = cy + S * 0.62 + bob;
      const Q = DFIG.stance(F.spec); DFIG.proc(Q, F.spec, now, 0.7);
      if (revealed && rp < 1) Q.lean += (1 - rp) * 8;
      DFIG.draw(g, P.u, F.spec, Q, { x: cx, feet, s, f: 1, now, sil, dpr: P.dpr, rim: sil ? null : { c: '#ffe6a8', a: 0.75, w: 1.1 } });
    } else {
      const s2 = S * 1.25 * sc;
      g.drawImage(sil ? F.sil : F.spr, cx - s2 / 2, cy - s2 / 2 + bob, s2, s2);
    }
    g.restore();
  };
  // 角色背后的轮廓光
  g.save(); g.globalCompositeOperation = 'lighter'; promoGlow(g, cx, cy, S * 0.8, '255,240,200', revealed ? 0.35 : 0.2 + pr * 0.3); g.restore();
  if (!revealed) {
    const p = t / R;
    if (p < 0.4) { fig(P.hdOld, 1); fig(P.hdOld, p / 0.4 * 0.7, 1, '#fff6d0'); }
    else {
      const f = 4 + 16 * ((p - 0.4) / 0.6) ** 2, which = Math.floor((t / 1000) * f) % 2;
      fig(which ? P.hdNew : P.hdOld, 1, 1 + (p - 0.4) * 0.15, '#fff6d0');
    }
  } else {
    const pop = rp < 0.25 ? 1.25 - rp : 1;
    fig(P.hdNew, 1, pop);
    if (rp < 1) fig(P.hdNew, 1 - rp, pop, '#fff6d0');
  }
  g.globalAlpha = 1;
  if (revealed && t - R < T(450)) { g.fillStyle = `rgba(255,255,255,${1 - (t - R) / T(450)})`; g.fillRect(0, 0, W, H); }

  // 文字：深色粗描边 + 渐层 + 柔光
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const font = s => `900 ${s}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  const outlined = (txt, x, y, size, fill, stroke, glow) => {
    g.font = font(size); g.lineJoin = 'round';
    if (glow) { g.save(); g.shadowColor = glow; g.shadowBlur = size * 0.5; g.fillStyle = glow; g.fillText(txt, x, y); g.restore(); }
    g.lineWidth = Math.max(3, size / 5); g.strokeStyle = stroke || '#1a0c00'; g.strokeText(txt, x, y);
    g.fillStyle = fill; g.fillText(txt, x, y);
  };
  const plate = (y, h, w) => {
    const grd = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    grd.addColorStop(0, 'rgba(12,28,70,0)'); grd.addColorStop(0.2, 'rgba(16,36,86,0.9)'); grd.addColorStop(0.8, 'rgba(16,36,86,0.9)'); grd.addColorStop(1, 'rgba(12,28,70,0)');
    g.fillStyle = grd; g.fillRect(cx - w / 2, y - h / 2, w, h);
    const ln = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); ln.addColorStop(0, 'rgba(242,197,90,0)'); ln.addColorStop(0.5, 'rgba(242,197,90,1)'); ln.addColorStop(1, 'rgba(242,197,90,0)');
    g.fillStyle = ln; g.fillRect(cx - w / 2, y - h / 2, w, 1.5); g.fillRect(cx - w / 2, y + h / 2 - 1.5, w, 1.5);
  };
  g.globalAlpha = Math.min(1, t / T(300));
  outlined(P.u.name, cx, cy - S * 1.55, Math.round(W * 0.055), '#ffffff', '#120828');
  if (!revealed) outlined(P.oldName, cx, cy + S * 0.98, Math.round(W * 0.06), '#e0d4ff', '#120828', 'rgba(160,120,255,0.6)');
  if (revealed) {
    const k = Math.min(1, (t - R) / T(380)), sc = 1 + (1 - k) * 1.6;
    g.save(); g.translate(cx, cy - S * 1.08); g.scale(sc, sc); g.globalAlpha = k;
    const tg = g.createLinearGradient(0, -W * 0.06, 0, W * 0.06);
    tg.addColorStop(0, '#fffbe0'); tg.addColorStop(0.48, '#ffe070'); tg.addColorStop(0.52, '#ffc030'); tg.addColorStop(1, '#e07a10');
    outlined('转 职', 0, 0, Math.round(W * 0.13), tg, '#3a1400', 'rgba(255,190,60,0.85)');
    g.restore();
    const k2 = Math.min(1, Math.max(0, (t - R - T(250)) / T(400)));
    g.globalAlpha = k2;
    const ty = cy + S * 1.02 + (1 - k2) * 12;
    plate(ty, W * 0.12, W * 0.95);
    g.font = font(Math.round(W * 0.05)); const wOld = g.measureText(P.oldName).width;
    g.font = font(Math.round(W * 0.075)); const wNew = g.measureText(P.newName).width;
    const gap = W * 0.1, x0 = cx - (wOld + gap + wNew) / 2;
    outlined(P.oldName, x0 + wOld / 2, ty, Math.round(W * 0.05), '#b8a8d8', '#120828');
    outlined('▶', x0 + wOld + gap / 2, ty, Math.round(W * 0.05), '#ffd060', '#3a1400');
    const ng = g.createLinearGradient(0, ty - W * 0.04, 0, ty + W * 0.04); ng.addColorStop(0, '#fffbe0'); ng.addColorStop(1, '#ffc040');
    outlined(P.newName, x0 + wOld + gap + wNew / 2, ty, Math.round(W * 0.075), ng, '#3a1400', 'rgba(255,200,80,0.6)');
    P.extra.forEach((s, i) => outlined(s, cx, ty + W * (0.1 + i * 0.065), Math.round(W * 0.042), '#b8f4ff', '#04203a', 'rgba(80,200,255,0.5)'));
    if (t - R > T(1200)) { g.globalAlpha = 0.5 + 0.5 * Math.sin(now / 250); outlined('点击继续', cx, H * 0.92, Math.round(W * 0.035), '#ffffff', '#120828'); }
  }
  g.globalAlpha = 1;
}
