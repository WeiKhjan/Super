// 超时空英雄传说 · 移动重制版 —— 战斗画面（仿原作的侧视对战演出）
'use strict';

const DUEL = { on: false, a: null, d: null, fx: [], t0: 0, shakeUntil: 0, hp: {} };
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

function duelResize() {
  const w = Math.min(window.innerWidth, 560), h = Math.round(w * 0.62);
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  duelCv.style.width = w + 'px'; duelCv.style.height = h + 'px';
  duelCv.width = Math.round(w * dpr); duelCv.height = Math.round(h * dpr);
  DUEL.W = w; DUEL.H = h; DUEL.dpr = dpr;
}
async function duelOpen(a, d) {
  if (AUTO || !OPT.anim) return false;
  duelResize();
  // 我方在右、敌方在左（与原作相同）；友军视同我方
  const leftIsA = side(a.team) !== 'P';
  Object.assign(DUEL, { on: true, a, d, left: leftIsA ? a : d, right: leftIsA ? d : a, fx: [], t0: performance.now(), off: {}, flash: {} });
  DUEL.hp[a.uid] = a.hp; DUEL.hp[d.uid] = d.hp;
  const el = document.getElementById('duel');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  requestAnimationFrame(duelRender);
  await wait(380);
  return true;
}
async function duelClose() {
  if (!DUEL.on) return;
  await wait(420);
  const el = document.getElementById('duel');
  el.classList.remove('in'); el.classList.add('out');
  await wait(220);
  el.hidden = true; DUEL.on = false;
}
function duelText(u, text, color, big) { DUEL.fx.push({ type: 'text', u, text, color, big, t0: performance.now() }); }
// 一次出手的演出：冲刺 / 放箭 → 命中闪光 → 伤害数字
async function duelStrike(att, def, hit, dmg, crit, ranged) {
  const dir = att === DUEL.left ? 1 : -1;
  if (ranged) {
    DUEL.fx.push({ type: 'arrow', from: att, to: def, t0: performance.now(), dur: T(260) });
    await tween(t => { DUEL.off[att.uid] = -dir * Math.sin(t * Math.PI) * 6; }, 260);
  } else {
    await tween(t => { DUEL.off[att.uid] = dir * (t < 0.6 ? t / 0.6 : 1 - (t - 0.6) / 0.4) * DUEL.W * 0.28; }, 340);
  }
  DUEL.off[att.uid] = 0;
  if (!hit) { duelText(def, 'MISS', '#aaccff'); await tween(t => { DUEL.off[def.uid] = -dir * Math.sin(t * Math.PI) * 18; }, 240); DUEL.off[def.uid] = 0; return; }
  DUEL.fx.push({ type: 'slash', u: def, crit, t0: performance.now(), dur: T(260) });
  DUEL.flash[def.uid] = performance.now() + T(180);
  if (crit) DUEL.shakeUntil = performance.now() + T(320);
  duelText(def, (crit ? '暴击 ' : '') + dmg, crit ? '#ffdd44' : '#ffffff', crit);
  await tween(t => { DUEL.off[def.uid] = dir * Math.sin(t * Math.PI) * 10; }, 200);
  DUEL.off[def.uid] = 0;
}
function duelRender(now) {
  if (!DUEL.on) return;
  requestAnimationFrame(duelRender);
  const g = duelCtx, W = DUEL.W, H = DUEL.H;
  g.setTransform(DUEL.dpr, 0, 0, DUEL.dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  let sx = 0, sy = 0;
  if (now < DUEL.shakeUntil) { sx = (Math.random() - 0.5) * 10; sy = (Math.random() - 0.5) * 8; }
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
  // 两名角色
  const size = Math.min(W * 0.3, H * 0.5);
  for (const u of [DUEL.left, DUEL.right]) {
    const isLeft = u === DUEL.left;
    const baseX = isLeft ? W * 0.27 : W * 0.73;
    const x = baseX + (DUEL.off[u.uid] || 0), feet = groundY + H * 0.1;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(x, feet, size * 0.3, size * 0.07, 0, 0, 7); g.fill();
    if (u.hp <= 0 && !(DUEL.hp[u.uid] > 0)) g.globalAlpha = 0.35;
    const spr = unitSprite(u), bob = Math.sin(now / 260 + (isLeft ? 0 : 1.5)) * 2;
    g.save(); g.translate(x, feet - size * 0.9 + bob);
    if (isLeft) g.scale(-1, 1); // 左侧角色面向右
    g.drawImage(spr, -size / 2, 0, size, size);
    if ((DUEL.flash[u.uid] || 0) > now) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85; g.drawImage(spr, -size / 2, 0, size, size); }
    g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  // 特效
  for (let i = DUEL.fx.length - 1; i >= 0; i--) {
    const f = DUEL.fx[i];
    const fx = u => (u === DUEL.left ? W * 0.27 : W * 0.73) + (DUEL.off[u.uid] || 0);
    if (f.type === 'text') {
      const p = (now - f.t0) / 1000; if (p >= 1) { DUEL.fx.splice(i, 1); continue; }
      g.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      g.font = `900 ${Math.round(H * (f.big ? 0.16 : 0.12))}px sans-serif`; g.textAlign = 'center';
      const ty = groundY - size * 0.75 - p * H * 0.12;
      g.lineWidth = 5; g.strokeStyle = '#000'; g.strokeText(f.text, fx(f.u), ty);
      g.fillStyle = f.color; g.fillText(f.text, fx(f.u), ty);
      g.globalAlpha = 1; g.textAlign = 'left';
    } else {
      const p = (now - f.t0) / Math.max(1, f.dur); if (p >= 1) { DUEL.fx.splice(i, 1); continue; }
      if (f.type === 'slash') {
        const cx = fx(f.u), cy = groundY - size * 0.45;
        g.strokeStyle = f.crit ? '#ffe070' : '#ffffff'; g.lineWidth = f.crit ? 7 : 5; g.globalAlpha = 1 - p; g.lineCap = 'round';
        for (let k = -1; k <= 1; k += 2) { g.beginPath(); g.moveTo(cx - size * 0.35, cy - size * 0.35 * k + p * 10); g.lineTo(cx + size * 0.35, cy + size * 0.35 * k * (1 - p)); g.stroke(); }
        g.globalAlpha = (1 - p) * 0.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, size * 0.3 * p + 8, 0, 7); g.fill(); g.globalAlpha = 1;
      } else if (f.type === 'arrow') {
        const x0 = fx(f.from), x1 = fx(f.to), y = groundY - size * 0.5;
        const x = x0 + (x1 - x0) * p;
        g.fillStyle = '#f4e0b0'; g.fillRect(Math.min(x, x - Math.sign(x1 - x0) * 26), y - 1, 26, 3);
        g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + Math.sign(x1 - x0) * 10, y + 0.5); g.lineTo(x, y + 6); g.fill();
      }
    }
  }
  g.restore();
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
window.addEventListener('resize', () => { if (DUEL.on) duelResize(); });
