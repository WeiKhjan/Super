// 对话立绘：64×72 代码绘制的 90 年代动画风半身像（无外部图片）
// getPortrait(id, variant, tier) → HTMLCanvasElement（已缓存），放大显示时请使用 image-rendering: pixelated
// tier = 职业阶（CLASSES[cls].tiers 的下标）：转职后换装；省略则为角色默认外观
(function (G) {
'use strict';
const W = 64, H = 72, N = W * H;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// =====================================================================
// 颜色工具与色阶
// =====================================================================
function h2r(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function r2h(r, g, b) { return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); }
function r2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2r(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const hsl = (h, s, l) => r2h(...hsl2r(h, s, l));
function mix(a, b, t) { const A = h2r(a), B = h2r(b); return r2h(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function rotH(h, target, amt) { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); }
// 6 阶色：0 描边 1 深影 2 阴影 3 基色 4 亮部 5 高光
function ramp(hex, o) {
  o = o || {};
  const [r, g, b] = h2r(hex); let [h, s, l] = r2hsl(r, g, b);
  const sh = o.shift == null ? 16 : o.shift;
  let hs = h, ss = s;
  if (s < 0.08) { hs = o.coolHue == null ? 235 : o.coolHue; ss = 0.12; }
  const lit = o.lit == null ? 0.34 : o.lit;
  return [
    hsl(rotH(hs, 250, sh * 1.6), Math.min(1, ss * 0.7 + 0.15), l * 0.16 + 0.03),
    hsl(rotH(hs, 250, sh * 1.2), ss * 0.95, l * 0.48),
    hsl(rotH(hs, 250, sh * 0.7), ss * 0.95, l * 0.72),
    hex,
    hsl(rotH(h, 60, sh * 0.5), s * 0.95, l + (1 - l) * lit),
    hsl(rotH(h, 60, sh * 0.8), s * 0.6, l + (1 - l) * Math.min(0.92, lit * 2.1)),
  ];
}

// =====================================================================
// 路径工具（像素坐标；像素中心 = 整数 + 0.5）
// =====================================================================
function ell(cx, cy, rx, ry, rot) { const p = new Path2D(); p.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); return p; }
function poly(a) { const p = new Path2D(); p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); p.closePath(); return p; }
function rect(x, y, w, h) { const p = new Path2D(); p.rect(x, y, w, h); return p; }
// 闭合平滑曲线（Catmull-Rom）
function blob(a, t) {
  t = t == null ? 1 : t;
  const n = a.length / 2, P = i => [a[((i + n) % n) * 2], a[((i + n) % n) * 2 + 1]];
  const p = new Path2D(); const s = P(0); p.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6 * t, p1[1] + (p2[1] - p0[1]) / 6 * t, p2[0] - (p3[0] - p1[0]) / 6 * t, p2[1] - (p3[1] - p1[1]) / 6 * t, p2[0], p2[1]);
  }
  p.closePath(); return p;
}
// 发束 / 尖刺：根部 (x0,y0) 宽 w，尖端 (x1,y1)，bend 为弯曲量，tw 为尖端宽
function lock(x0, y0, x1, y1, w, bend, tw) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  bend = bend || 0; tw = tw || 0;
  const mx = (x0 + x1) / 2 + nx * bend, my = (y0 + y1) / 2 + ny * bend;
  const p = new Path2D();
  p.moveTo(x0 + nx * w, y0 + ny * w);
  p.quadraticCurveTo(mx + nx * w * 0.7, my + ny * w * 0.7, x1 + nx * tw, y1 + ny * tw);
  if (tw) p.lineTo(x1 - nx * tw, y1 - ny * tw);
  p.quadraticCurveTo(mx - nx * w * 0.7, my - ny * w * 0.7, x0 - nx * w, y0 - ny * w);
  p.closePath(); return p;
}
function ring(outer, inner) { const p = new Path2D(); p.addPath(outer); p.addPath(inner); p.rule = 'evenodd'; return p; }
// 合并多个形状（逐个填充 = 取并集，避免绕向相反时出现镂空）
function union(...ps) { const p = new Path2D(); p.parts = []; for (const q of ps) if (q) { if (q.parts) p.parts.push(...q.parts); else p.parts.push(q); } return p; }
// 开放 Catmull-Rom 采样点
function splinePts(a, step) {
  const n = a.length / 2, out = [];
  if (n === 1) return [[a[0], a[1]]];
  const P = i => { i = clamp(i, 0, n - 1); return [a[i * 2], a[i * 2 + 1]]; };
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const seg = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / (step || 0.25)));
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a0, a1, a2, a3) => 0.5 * ((2 * a1) + (-a0 + a2) * t + (2 * a0 - 5 * a1 + 4 * a2 - a3) * t2 + (-a0 + 3 * a1 - 3 * a2 + a3) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P(n - 1)); return out;
}

// =====================================================================
// 画布：每像素记录 物件编号 + 色阶，最后统一描边上色
// =====================================================================
let MC = null, MX = null;
let TF = null; // 头部缩放 [s, ox, oy]
const tx = (x) => TF ? TF[1] + (x - TF[1]) * TF[0] : x, ty = (y) => TF ? TF[2] + (y - TF[2]) * TF[0] : y;
function maskOf(path) {
  if (!MC) { MC = document.createElement('canvas'); MC.width = W; MC.height = H; MX = MC.getContext('2d', { willReadFrequently: true }); }
  MX.setTransform(1, 0, 0, 1, 0, 0); MX.clearRect(0, 0, W, H); MX.fillStyle = '#fff';
  if (TF) MX.setTransform(TF[0], 0, 0, TF[0], TF[1] * (1 - TF[0]), TF[2] * (1 - TF[0]));
  if (path.parts) for (const q of path.parts) MX.fill(q, q.rule || 'nonzero');
  else MX.fill(path, path.rule || 'nonzero');
  const d = MX.getImageData(0, 0, W, H).data, m = new Uint8Array(N);
  for (let i = 0; i < N; i++) m[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
  return m;
}
function Pic() {
  this.o = new Int16Array(N); this.t = new Uint8Array(N);
  this.objs = [{ pal: null, g: 'bg', ol: false }];
}
Pic.prototype = {
  obj(pal, g, opt) { this.objs.push(Object.assign({ pal, g: g || '', ol: true }, opt || {})); return this.objs.length - 1; },
  sel(target) {
    const n = this.objs.length, m = new Uint8Array(n);
    if (target == null) { m.fill(1); m[0] = 0; return m; }
    for (const t of (Array.isArray(target) ? target : [target])) {
      if (typeof t === 'number') m[t] = 1;
      else for (let i = 1; i < n; i++) if (this.objs[i].g === t) m[i] = 1;
    }
    return m;
  },
  fill(path, id, tone) { const m = maskOf(path), o = this.o, t = this.t; tone = tone == null ? 3 : tone; for (let i = 0; i < N; i++) if (m[i]) { o[i] = id; t[i] = tone; } return id; },
  // 新建物件并填充
  add(path, pal, g, opt, tone) { const id = this.obj(pal, g, opt); this.fill(path, id, tone); return id; },
  // 只改变 target 范围内像素的色阶
  shade(path, target, tone, cond) {
    const m = maskOf(path), s = this.sel(target), o = this.o, t = this.t;
    for (let i = 0; i < N; i++) if (m[i] && s[o[i]] && (!cond || cond(t[i]))) t[i] = tone;
  },
  // 清除为背景（挖空）
  erase(path, target) { const m = maskOf(path), s = target == null ? null : this.sel(target); for (let i = 0; i < N; i++) if (m[i] && (!s || s[this.o[i]])) { this.o[i] = 0; this.t[i] = 0; } },
  px(x, y, id, tone) { x = Math.floor(tx(x)); y = Math.floor(ty(y)); y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; this.o[i] = id; this.t[i] = tone; },
  spx(x, y, target, tone) { x = Math.floor(tx(x)); y = Math.floor(ty(y)); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; const s = typeof target === 'number' ? this.o[i] === target : this.sel(target)[this.o[i]]; if (s) this.t[i] = tone; },
  at(x, y) { if (x < 0 || y < 0 || x >= W || y >= H) return 0; return this.o[y * W + x]; },
  linePx(a) {
    const raw = splinePts(a.map((v, i) => i % 2 ? ty(v) : tx(v)), 0.2), pts = [];
    for (const [x, y] of raw) { const X = Math.floor(x), Y = Math.floor(y); const l = pts[pts.length - 1]; if (!l || l[0] !== X || l[1] !== Y) pts.push([X, Y]); }
    // 补足 8 连通
    const full = [];
    for (let i = 0; i < pts.length; i++) {
      if (i) { let [x0, y0] = full[full.length - 1]; const [x1, y1] = pts[i]; while (Math.abs(x1 - x0) > 1 || Math.abs(y1 - y0) > 1) { x0 += Math.sign(x1 - x0); y0 += Math.sign(y1 - y0); full.push([x0, y0]); } }
      const l = full[full.length - 1]; if (!l || l[0] !== pts[i][0] || l[1] !== pts[i][1]) full.push(pts[i]);
    }
    // 去 L 形拐角
    const out = [];
    for (let i = 0; i < full.length; i++) {
      if (out.length >= 1 && i < full.length - 1) { const a0 = out[out.length - 1], c = full[i + 1]; if (Math.abs(a0[0] - c[0]) === 1 && Math.abs(a0[1] - c[1]) === 1) continue; }
      out.push(full[i]);
    }
    return out;
  },
  // 画线：id 为数字时设为该物件；opt.shade=true 时仅改色阶（id 为 target）
  line(a, id, tone, shadeOnly) {
    const s = shadeOnly ? this.sel(id) : null;
    for (const [x, y] of this.linePx(a)) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      if (shadeOnly) { if (s[this.o[i]]) this.t[i] = tone; } else { this.o[i] = id; this.t[i] = tone; }
    }
  },
  // 字符模板：map[ch] = [id, tone] 设置；数字 = 仅改色阶
  tmpl(x0, y0, rows, map, flip) {
    x0 = Math.round(tx(x0)); y0 = Math.round(ty(y0));
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]; if (ch === '.' || ch === ' ') continue;
        const e = map[ch]; if (e == null) continue;
        const x = flip ? x0 + row.length - 1 - c : x0 + c, y = y0 + r;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (typeof e === 'number') this.t[i] = e; else { this.o[i] = e[0]; this.t[i] = e[1]; }
      }
    }
  },
  // 自动赛璐璐明暗：光源方向 (-dx,-dy)；s 阴影宽，d 深影宽，hl 亮边宽
  auto(target, o) {
    o = o || {};
    const dx = o.dx == null ? 1 : o.dx, dy = o.dy == null ? 0.6 : o.dy;
    const s = o.s == null ? 2 : o.s, d = o.d || 0, hl = o.hl == null ? 1 : o.hl;
    const base = o.base == null ? 3 : o.base;
    const sel = this.sel(target), so = this.o, st = this.t, nt = new Uint8Array(st);
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && sel[so[y * W + x]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!sel[so[i]] || st[i] !== base) continue;
      let out = 0;
      for (let k = 1; k <= Math.max(s, d); k++) if (!inside(Math.round(x + dx * k), Math.round(y + dy * k))) { out = k; break; }
      if (out && out <= d) nt[i] = base - 2;
      else if (out && out <= s) nt[i] = base - 1;
      else if (hl) { for (let k = 1; k <= hl; k++) if (!inside(Math.round(x - dx * k), Math.round(y - dy * k))) { nt[i] = base + 1; break; } }
    }
    this.t.set(nt);
  },
  // from 物件在 to 物件上投下阴影（偏移 dx,dy）
  cast(from, to, dx, dy, tone, maxTone) {
    const fs = this.sel(from), ts = this.sel(to), o = this.o, t = this.t, nt = new Uint8Array(t);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!ts[o[i]]) continue;
      const sx = x - dx, sy = y - dy; if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      if (fs[o[sy * W + sx]] && t[i] > tone && (maxTone == null || t[i] <= maxTone)) nt[i] = tone;
    }
    this.t.set(nt);
  },
  render(bg) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
    const o = this.o, t = this.t, objs = this.objs;
    const cache = objs.map(ob => ob.pal ? ob.pal.map(h2r) : null);
    const bgp = bg.map(h2r);
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, A = o[i];
      let best = -1;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const j of nb) { if (j < 0) continue; const B = o[j]; if (B > A && objs[B].ol && B > best) best = B; }
      let col;
      if (best > 0 && !(objs[A] && objs[A].noRecv)) col = cache[best][objs[best].olt || 0];
      else if (A > 0) col = cache[A][t[i]] || cache[A][3];
      else {
        // 深蓝背景：中心偏亮的晕影 + 有序抖动
        const ddx = (x - 33) / 40, ddy = (y - 30) / 44, r = Math.sqrt(ddx * ddx + ddy * ddy);
        const v = clamp((1 - r) * (bgp.length - 1) + 0.3, 0, bgp.length - 1);
        let k = Math.floor(v); if ((v - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)]) k++;
        col = bgp[Math.min(k, bgp.length - 1)];
      }
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c;
  },
};

// =====================================================================
// 调色板
// =====================================================================
const BG = ['#080d26', '#0d1638', '#121e4a', '#17265a'];
const BG_DARK = ['#07050f', '#0f0a1e', '#170f2c', '#20143a'];
// 皮肤：0 描边 1 深影 2 阴影 3 基色 4 亮 5 高光 6 唇 7 红晕
const SKIN = {
  fair: ['#3c1a14', '#a85a4a', '#de9474', '#f7c9a4', '#fde2c8', '#fff4e6', '#d4646a', '#f2a08c'],
  warm: ['#3a1810', '#9a5236', '#cf8660', '#ecb48a', '#f6d0ac', '#fde8d2', '#c05a50', '#ea9278'],
  tan: ['#30140a', '#83442a', '#b46c48', '#d69a70', '#e8b890', '#f6d8b8', '#a84e40', '#d8846a'],
  dark: ['#24100a', '#5e2e1c', '#8a4c32', '#b07450', '#c8946c', '#e0b490', '#7e3a30', '#b8705a'],
  pale: ['#2a1c2c', '#8a6a7c', '#c4a4b0', '#ecd6d6', '#f8eaea', '#ffffff', '#c86878', '#eab0b4'],
  old: ['#38180f', '#9a5a46', '#cc9070', '#ecbe9c', '#f6d6bc', '#fdebdc', '#b86a5a', '#e0a08a'],
  grey: ['#1c1a24', '#55525e', '#8a8794', '#b8b6c0', '#d6d4dc', '#f0eff4', '#8a5a60', '#b8a0a8'],
};
const EYE_W = '#fbfbff', EYE_WS = '#b8c0e0';
function eyePal(iris, lash) {
  const r = ramp(iris, { lit: 0.4 });
  lash = lash || '#1a0e10';
  return [lash, mix(lash, '#6a3a2a', 0.45), EYE_W, EYE_WS, mix(r[1], r[0], 0.3), r[2], hsl(...(([h, s, l]) => [h, Math.min(1, s * 1.15 + 0.1), Math.min(0.72, l + 0.12)])(r2hsl(...h2r(iris)))), '#ffffff', r[0]];
}
const RP = {}; // ramp cache
const rp = (hex, o) => { const k = hex + JSON.stringify(o || ''); return RP[k] || (RP[k] = ramp(hex, o)); };
const METAL = {
  steel: ['#12141e', '#3e4458', '#6c7590', '#9aa4bc', '#c8d0e0', '#f4f8ff'],
  silver: ['#16161e', '#4c4e60', '#7e8298', '#b4b8c8', '#dcdee8', '#ffffff'],
  gold: ['#2a1606', '#7a4410', '#b87818', '#e0aa30', '#f4d468', '#fff4b8'],
  bronze: ['#22100a', '#5e3418', '#8e5a28', '#b88040', '#d8a868', '#f4d8a8'],
  black: ['#08080e', '#1a1a26', '#2c2c40', '#43435c', '#6a6a88', '#a8a8c8'],
  red: ['#200608', '#5c1014', '#901c20', '#c42a2a', '#e86050', '#ffb0a0'],
};

// =====================================================================
// 脸型（朝画面右侧的 3/4 侧脸）
// =====================================================================
const FACES = {
  // 少年
  m: { pts: [21, 22, 20.3, 30, 21, 37, 24.3, 42.8, 28.8, 46.8, 32.6, 48.2, 36.6, 45.4, 40.2, 40, 41.8, 34, 42.2, 27, 40, 20, 31, 17, 23, 18.5],
    ey: 31, nx: 22, fx: 34, nose: [35, 38], mouth: [33, 43], ear: [20.5, 34], neck: [25.5, 36.5], chin: [32.6, 48.2], shadowX: 38.8 },
  // 少女
  f: { pts: [21.5, 23, 21, 31, 21.8, 37, 24.8, 42.2, 29, 46, 32.4, 47.4, 36, 44.6, 39.6, 39.4, 41.2, 33, 41.5, 26, 39, 20, 31, 17, 24, 19],
    ey: 31, nx: 22, fx: 34, nose: [35, 38], mouth: [33, 42], ear: [21, 34], neck: [26.5, 35.5], chin: [32.4, 47.4], shadowX: 38.4 },
  // 成年男子（瘦长、下颌分明）
  man: { pts: [21, 21, 20.5, 30, 21.2, 38, 23.8, 44, 28.4, 48.4, 33.2, 49.6, 37.4, 46.6, 40.4, 41, 42, 35, 42.4, 27, 40, 20, 31, 16, 23, 18],
    ey: 31, nx: 22, fx: 34, nose: [35, 38], mouth: [33, 44], ear: [20.5, 34], neck: [25, 37], chin: [33.2, 49.6], shadowX: 38.8 },
  // 魁梧（方下巴）
  broad: { pts: [20, 21, 19.5, 30, 19.8, 39, 22.6, 45, 27.6, 49, 34, 49.8, 38.6, 46.8, 41.6, 41, 43, 34, 43, 27, 40.6, 20, 31, 16, 22.5, 18],
    ey: 31, nx: 22, fx: 34, nose: [35, 38], mouth: [33, 44], ear: [19.8, 34], neck: [24, 38.5], chin: [34, 49.8], shadowX: 39.4 },
  // 老人（颧骨、凹颊）
  old: { pts: [21, 21, 20.5, 30, 21.5, 38, 24, 44, 28.6, 48.6, 33, 49.6, 37, 46.8, 39.8, 41.6, 41.4, 35, 42.2, 27, 40, 20, 31, 16, 23, 18],
    ey: 31, nx: 22, fx: 34, nose: [35, 38], mouth: [33, 44], ear: [20.5, 34], neck: [25.5, 36.5], chin: [33, 49.6], shadowX: 38.6 },
};

// 发色色阶：深色头发的高光偏冷蓝，更有动画感
function hairRamp(hex) {
  const r = ramp(hex, { shift: 14, lit: 0.3 });
  const [, , l] = r2hsl(...h2r(hex));
  if (l < 0.3) { r[4] = mix(hex, '#6c7cb4', 0.42); r[5] = mix(hex, '#b4c4f0', 0.62); r[0] = mix(hex, '#000000', 0.6); }
  return r;
}

SKIN.snake = ['#142a1c', '#3a6a4a', '#6a9a72', '#a0c8a0', '#c4e0c0', '#e8f8e4', '#6a2a4a', '#c08090'];
SKIN.ogre = ['#1e2010', '#4e5a2a', '#76844a', '#9eac6a', '#bcc88a', '#dce6b4', '#5a3a2a', '#9a7a5a'];

// ---------- 眼睛模板（朝右看）----------
// K 睫毛 k 睫毛浅 W 眼白 w 眼白阴影 D 虹膜暗 I 虹膜 L 虹膜亮 H 高光 P 瞳孔 s 皮肤阴影 S 皮肤深影 0..7 = 皮肤色阶
const EYES = {
  hero: {
    near: ['..KKKKK.', '.KKwDDDK', 'KKWWHPIW', '..WWIPI.', '...WLLL.', '....ss..'],
    far: ['.KKKK.', 'KwDDDK', '.WHPIK', '.WIPI.', '..LLL.', '..ss..'] },
  girl: {
    near: ['..KKKKK.', '.KKKKKKK', 'KKwwDDDK', '..WWHPIW', '..WWIPIW', '...WLLL.', '....kk..'],
    far: ['.KKKK.', 'KKKKKK', 'kwDDDK', '.WHPIK', '.WIPI.', '..LLL.', '..kk..'] },
  sharp: {
    near: ['.KKKKKK.', 'KKwDDDKK', '..WHPIW.', '...LLL..', '...ss...'],
    far: ['KKKKK.', 'kwDDDK', '.WHPIK', '..LL..', '..s...'] },
  stern: {
    near: ['KKKKKKKK', '.KKwDDKK', '..WHPIW.', '...ss...'],
    far: ['KKKKKK', 'kwDDKK', '.HPIW.', '..s...'] },
  kind: {
    near: ['........', '..KKKKK.', '.KwDDDK.', '..WHPI..', '...ss...'],
    far: ['......', '.KKKK.', 'KwDDK.', '.HPI..', '.ss...'] },
  closed: {
    near: ['........', '...KKK..', '.KK...KK', '........'],
    far: ['......', '.KKK..', 'K...K.', '......'] },
  fierce: {
    near: ['KK......', '.KKKKKK.', '..KWWDKK', '...WWP..', '....ss..'],
    far: ['......', 'KKKKK.', 'KDWWK.', '.PWW..', '..s...'] },
  glow: {
    near: ['........', '.KKKKKK.', 'KKLLLLKK', '..KKKK..'],
    far: ['......', 'KKKKK.', 'KLLLKK', '.KKK..'] },
};

// =====================================================================
// 人物绘制
// =====================================================================
function drawHuman(S) {
  const p = new Pic();
  const F = Object.assign({}, FACES[S.face] || FACES.m);
  const skin = SKIN[S.skin] || SKIN.fair;
  const hairPal = S.hairPal || hairRamp(S.hair || '#3a2a20');
  const c = { p, F, S, skin, hairPal };
  const HT = [S.scale || 1.18, 31, 33];
  // 1 背后（披风、翅膀、武器）
  TF = null; for (const f of [].concat(S.back || [])) f(c);
  TF = HT;
  if (S.headBack === 'hood') hoodBack(c, rp(S.hood || '#f0eef4', { coolHue: 235 }));
  else if (S.headBack) S.headBack(c);
  // 2 后发
  const hs = HAIR[S.hairStyle] || HAIR.none;
  if (hs.back) hs.back(c);
  // 3 脖子
  const neck = p.add(poly([F.neck[0], 38, F.neck[1], 38, F.neck[1] + 1, 62, F.neck[0] - 1, 62]), skin, 'skin');
  c.neck = neck;
  p.auto(neck, { s: 2, hl: 0 });
  // 4 服装
  TF = null;
  (BODY[S.body] || BODY.tunic)(c);
  for (const f of [].concat(S.over || [])) f(c); // 转职装备层（画面坐标）
  TF = HT;
  // 5 耳朵
  if (!S.noEar) {
    const ear = p.add(ell(F.ear[0], F.ear[1], 2.3, 3.6, -0.15), skin, 'skin');
    p.shade(ell(F.ear[0] + 0.4, F.ear[1] + 0.4, 1, 2), ear, 2);
    c.ear = ear;
    if (S.earring) { const e = p.add(ell(F.ear[0] - 0.3, F.ear[1] + 4.6, 0.9, 1.1), METAL.gold, 'acc'); }
  }
  // 6 脸
  const face = p.add(blob(F.pts), skin, 'skin');
  c.face = face;
  const sx = F.shadowX;
  p.shade(blob([sx + 1, 16, 47, 16, 47, 53, F.chin[0] + 2.2, 52, sx - 0.4, 45.5, sx + 0.4, 40, sx - 0.2, 35.5, sx + 0.4, 30, sx + 0.8, 22]), face, 2);
  p.cast(face, neck, 0, 1, 2); p.cast(face, neck, -1, 2, 2); p.cast(face, neck, 0, 2, 2); p.cast(face, neck, 1, 3, 2);
  p.cast(face, neck, 0, 1, 1);
  // 7 五官
  if (S.lines) S.lines(c);
  if (S.eyes !== 'none') drawEyes(c);
  drawNose(c); drawMouth(c);
  if (S.blush) { const y = F.ey + 6; p.spx(F.nx + 2, y, face, 7); p.spx(F.nx + 3, y, face, 7); p.spx(F.nx + 4, y, face, 7); p.spx(F.fx + 3, y, face, 7); p.spx(F.fx + 4, y, face, 7); }
  if (S.scar) S.scar(c);
  // 8 胡须
  if (S.beard) BEARD[S.beard](c);
  // 9 前发
  if (hs.front) hs.front(c);
  p.cast('hair', 'skin', 0, 1, 2, 3); p.cast('hair', 'skin', 1, 1, 2, 3);
  if (hs.after) hs.after(c);
  // 10 头饰
  const fn = v => (typeof v === 'string' ? HEAD[v] : v);
  for (const h of [].concat(S.head || [], S.acc || [])) fn(h)(c);
  TF = null;
  if (S.front) S.front(c);
  return p.render(S.bg || BG);
}

function drawEyes(c) {
  const { p, F, S } = c;
  const style = EYES[S.eyes] || EYES.hero;
  const pal = eyePal(S.iris || '#4a3020', S.lash);
  if (S.eyes === 'glow') { pal[6] = S.iris || '#ff4040'; pal[0] = '#100808'; }
  const id = p.obj(pal, 'eye', { ol: false });
  const map = { K: [id, 0], k: [id, 1], W: [id, 2], w: [id, 3], D: [id, 4], I: [id, 5], L: [id, 6], H: [id, 7], P: [id, 8], s: 2, S: 1 };
  const ey = F.ey + (S.eyeDy || 0);
  p.tmpl(F.nx, ey, style.near, map);
  p.tmpl(F.fx, ey, style.far, map);
  c.eyeId = id;
  // 眉毛
  const b = S.brow === undefined ? 'normal' : S.brow;
  const BR = {
    normal: [[0, -2.5, 3, -3.6, 7.5, -3], [0, -3, 3, -3.5, 6, -2.4]],
    stern: [[0, -3.6, 4, -3, 8, -1.6], [-0.5, -1.6, 2.5, -2.8, 6, -3.4]],
    angry: [[0, -4.2, 4, -3, 8, -1.2], [-0.8, -1.2, 2.5, -2.8, 6, -4]],
    soft: [[0.5, -2.6, 3.5, -3.8, 7.5, -3.4], [0, -3.4, 3, -3.8, 5.5, -3]],
    raised: [[0, -3, 3.5, -4.8, 7.5, -4.2], [0, -4.2, 3, -4.6, 5.5, -3.6]],
    worried: [[0, -2.4, 4, -3, 8, -4.2], [-0.5, -4.2, 2.5, -3, 6, -2.4]],
  }[b];
  if (BR) {
    const bp = S.browPal || c.hairPal;
    const bid = p.obj(bp, 'brow', { ol: false });
    const tone = S.browTone == null ? 1 : S.browTone;
    const tr = (a, x0) => a.map((v, i) => i % 2 ? v + ey + 0.5 : v + x0 + 0.5);
    p.line(tr(BR[0], F.nx), bid, tone); p.line(tr(BR[1], F.fx), bid, tone);
    if (S.thickBrow) { p.line(tr(BR[0], F.nx).map((v, i) => i % 2 ? v - 1 : v), bid, tone); p.line(tr(BR[1], F.fx).map((v, i) => i % 2 ? v - 1 : v), bid, tone); }
  }
}
const DIG = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7 };
const NOSES = {
  small: { o: [-1, -1], t: ['.2', '21'] },
  long: { o: [-1, -2], t: ['.2', '.2', '21'] },
  big: { o: [-1, -2], t: ['.2.', '.22', '211'] },
  hook: { o: [-1, -3], t: ['.2', '.2', '.22', '211'] },
};
const MOUTHS = {
  smile: { o: [-2, -1], t: ['1...', '.111', '..2.'] },
  neutral: { o: [-2, 0], t: ['1111', '.22.'] },
  stern: { o: [-2, 0], t: ['.111', '1...', '.22.'] },
  frown: { o: [-2, 0], t: ['.11.', '1..1', '.22.'] },
  open: { o: [-2, -1], t: ['0000', '0660', '.00.'] },
  shout: { o: [-2, -1], t: ['00000', '05550', '06660', '.000.'] },
  grin: { o: [-2, -1], t: ['0...0', '.000.', '..6..'] },
  teeth: { o: [-2, -1], t: ['00000', '05550', '.000.'] },
  small: { o: [-1, 0], t: ['11', '2.'] },
  lips: { o: [-2, -1], t: ['.66.', '1661', '.22.'] },
  smirk: { o: [-2, -1], t: ['...1', '111.', '.2..'] },
  cat: { o: [-2, -1], t: ['1.1.1', '.1.1.'] },
};
function drawNose(c) {
  const { p, F, S } = c; const n = NOSES[S.nose || 'small']; if (!n) return;
  p.tmpl(F.nose[0] + n.o[0], F.nose[1] + n.o[1], n.t, DIG);
}
function drawMouth(c) {
  const { p, F, S } = c; const m = MOUTHS[S.mouth || 'neutral']; if (!m) return;
  p.tmpl(F.mouth[0] + m.o[0], F.mouth[1] + m.o[1], m.t, DIG);
}
// 皱纹
function oldLines(c, heavy) {
  const { p, F, face } = c;
  p.line([F.nx - 1, F.ey + 4, F.nx - 2.5, F.ey + 5.5], face, 2, true);
  p.line([F.nx + 2, F.ey + 6, F.nx + 6, F.ey + 6.5], face, 2, true);
  p.line([F.nose[0] - 3, F.nose[1] + 1, F.mouth[0] - 4.5, F.mouth[1] + 1.5], face, 2, true);
  if (heavy) { p.line([F.fx + 6, F.ey + 3, F.fx + 7.5, F.ey + 4.5], face, 1, true); p.line([F.nx + 1, F.ey + 7, F.nx + 6, F.ey + 8], face, 2, true); }
}

// ---------- 头发工具 ----------
function hAdd(c, paths, opt) { return c.p.add(Array.isArray(paths) ? union(...paths) : paths, c.hairPal, 'hair', opt); }
function hLocks(c, list, noStrand) {
  return list.map(l => {
    const id = c.p.add(lock(...l), c.hairPal, 'hair');
    if (!noStrand) {
      const [x0, y0, x1, y1, w, b] = l, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const o = -w * 0.35;
      c.p.line([x0 + dx * 0.25 + nx * o, y0 + dy * 0.25 + ny * o, x0 + dx * 0.5 + nx * (o + (b || 0) * 0.5), y0 + dy * 0.5 + ny * (o + (b || 0) * 0.5), x0 + dx * 0.72 + nx * (o * 0.5 + (b || 0) * 0.4), y0 + dy * 0.72 + ny * (o * 0.5 + (b || 0) * 0.4)], id, 2, true);
    }
    return id;
  });
}
function hShade(c, o) { c.p.auto('hair', Object.assign({ s: 2, d: 1, hl: 0, dx: 1, dy: 0.5 }, o)); }
// 光泽带（沿头顶弧线，内缘锯齿）
function gloss(c, cx, cy, rx, ry, a0, a1, w, n, tgt) {
  const pts = [], N = n || 8;
  for (let i = 0; i <= N; i++) { const a = a0 + (a1 - a0) * i / N; pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); }
  for (let i = N * 2; i >= 0; i--) { const a = a0 + (a1 - a0) * i / (N * 2); const k = (i % 2) ? w * 2.1 : w * 0.9; pts.push(cx + Math.cos(a) * (rx - k), cy + Math.sin(a) * (ry - k)); }
  c.p.shade(poly(pts), tgt || 'hair', 4, t => t >= 3);
  const q = [], M = Math.max(3, N >> 1), b0 = a0 + (a1 - a0) * 0.12, b1 = a0 + (a1 - a0) * 0.5;
  for (let i = 0; i <= M; i++) { const a = b0 + (b1 - b0) * i / M; q.push(cx + Math.cos(a) * (rx - w * 0.5), cy + Math.sin(a) * (ry - w * 0.5)); }
  for (let i = M; i >= 0; i--) { const a = b0 + (b1 - b0) * i / M; q.push(cx + Math.cos(a) * (rx - w * 1.3), cy + Math.sin(a) * (ry - w * 1.3)); }
  c.p.shade(poly(q), tgt || 'hair', 5, t => t >= 4);
}
const PI = Math.PI;

// ---------- 发型 ----------
const HAIR = {
  none: {},
  messy: {
    back(c) {
      hAdd(c, [ell(31, 24.5, 14.5, 12.5),
        lock(20, 25, 12.5, 33, 4.5, 1), lock(21, 30, 14, 41, 4, 1.5), lock(24, 34, 19, 46, 4, 1),
        lock(42, 23, 50, 28, 4, -1), lock(41, 30, 47, 40, 4, -1), lock(38, 34, 42, 46, 4, 0),
        lock(22, 18, 12, 14, 4.5, 1.5), lock(27, 14, 33, 5, 4.5, -2.5), lock(33, 14, 42, 7, 4, -1.5), lock(40, 18, 50, 15, 4, -1.5), lock(25, 15, 18, 8, 3.5, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 23, 22, 16, 30, 12.5, 39, 14.5, 44, 21, 40, 20, 32, 19.5, 24, 21.5]), { ol: false });
      hLocks(c, [[22, 19, 18.5, 32.5, 4, -1.5], [26, 17, 22.5, 29, 4, 1], [29.5, 16.5, 27.5, 28.5, 4, 1.5], [33, 17, 32.5, 29.5, 3.8, -0.5],
        [36, 17, 38.5, 28, 3.6, -1.5], [39.5, 18.5, 43.5, 29, 3.3, -1], [41, 21, 44.5, 33, 2.6, -0.5], [31, 18, 35.5, 26.5, 2.4, 1]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.18, 1.3, 9);
    },
  },
  neat: {
    back(c) {
      hAdd(c, [ell(31, 24.5, 14, 12.5), lock(22, 30, 18, 41, 4, 1), lock(40, 30, 44, 41, 4, -1), lock(36, 13, 47, 17, 4, -1), lock(26, 14, 19, 14, 4, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 21, 16, 30, 12, 40, 14, 44, 22, 40, 21, 30, 20, 23, 22]), { ol: false });
      hLocks(c, [[23, 16, 19.8, 31, 4, -1.5], [25, 16, 28.5, 27.5, 4.5, -1.5], [29, 15, 34.5, 27, 4.5, -1.5], [33, 15, 39.5, 26.5, 4.2, -1],
        [37, 16, 43.5, 27.5, 3.6, -0.5], [41, 19, 44.5, 32, 2.5, 0]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.9, -PI * 0.2, 1.3, 9);
    },
  },
  wild: {
    back(c) {
      hAdd(c, [ell(31, 23, 15, 12.5), lock(22, 18, 11, 11, 5, 1), lock(26, 14, 19, 2, 5, 1), lock(32, 13, 33, 0.5, 5, -1), lock(38, 14, 47, 3.5, 5, -1),
        lock(42, 19, 53, 15, 4.5, -1), lock(20, 26, 10, 28, 4, 1), lock(42, 26, 52, 30, 4, -1), lock(22, 32, 15, 41, 4, 1), lock(41, 32, 47, 41, 3.5, -1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 21, 15, 31, 11, 41, 15, 43.5, 23, 40, 21, 31, 20, 22, 22]), { ol: false });
      hLocks(c, [[25, 16, 21, 25.5, 3.6, 1], [29, 16, 27.5, 27, 3.4, 1], [33, 16, 34.5, 26.5, 3.4, -1], [38, 17, 42, 25, 3.2, -1]]);
      hShade(c);
      gloss(c, 31, 24, 13.5, 11.5, -PI * 0.92, -PI * 0.3, 1.3, 9);
    },
  },
  tied: {
    back(c) {
      hAdd(c, [ell(31, 23.5, 14, 12), lock(40, 18, 55, 42, 4.5, -3, 1), lock(42, 22, 50, 46, 3.5, -1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      const cap = hAdd(c, blob([19.5, 26, 20.5, 16, 30, 11.5, 40, 13.5, 44, 21, 42, 25, 38.5, 20, 30, 18.6, 23, 20.5, 21, 27]));
      hLocks(c, [[24, 18.5, 21.2, 33, 2.4, -1.5], [37, 18.5, 41.5, 30, 2, -1]]);
      hShade(c);
      for (const l of [[22, 21, 27, 14, 36, 13.5], [25, 19.5, 31, 15.5, 40, 16.5], [30, 19, 36, 17, 42, 20.5]]) c.p.line(l, cap, 2, true);
      gloss(c, 31, 24.5, 12.5, 11, -PI * 0.88, -PI * 0.35, 1.2, 8);
      // 发髻绳
      const t = c.p.add(ell(42.5, 19, 1.6, 2.2, 0.5), rp('#c03030'), 'acc');
    },
  },
  spiky: {
    back(c) {
      hAdd(c, [ell(31, 24, 14.5, 12.5), lock(23, 17, 16, 7, 5, 1.5), lock(28, 14, 31, 1, 5, -2), lock(34, 13, 45, 3, 5, -2), lock(40, 17, 54, 11, 4.5, -1.5),
        lock(42, 23, 53, 24, 4, -0.5), lock(20, 23, 10.5, 21, 4, 1), lock(21, 30, 13, 36, 3.5, 1), lock(41, 30, 48, 37, 3.5, -1), lock(24, 33, 20, 44, 3.5, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 23, 22, 15, 31, 11.5, 40, 14.5, 44, 21, 40, 20, 31, 19.5, 23, 21.5]), { ol: false });
      hLocks(c, [[23, 17, 19.5, 29.5, 4, -1], [27.5, 16, 25.5, 28.5, 4, 1], [32, 16, 33, 27.5, 4, -1], [36, 16, 40.5, 26.5, 4, -1.5], [40, 18, 45.5, 25.5, 3, -1]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.2, 1.3, 9);
    },
  },
  bob: { // 少女（兜帽下）：刘海 + 两侧长发
    back(c) {
      hAdd(c, [ell(31, 24.5, 14, 12.5), lock(21, 26, 17, 50, 4.5, 1.5, 1), lock(41, 26, 45.5, 48, 4.5, -1.5, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 22, 16, 31, 12.5, 40, 15, 43.5, 23, 40, 21, 31, 20, 23, 22]), { ol: false });
      hLocks(c, [[23, 18, 19.8, 31, 4, -1], [26, 17, 24.5, 28.6, 4, 0.5], [29.5, 17, 29, 29.5, 4, 0.5], [33, 17, 34, 28.6, 3.8, -0.5], [37, 18, 40, 28, 3.5, -1.2], [40, 20, 43.4, 31, 3, -1],
        [21.8, 25, 20.6, 45, 2.6, 0.6, 0.6]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.2, 1.3, 9);
    },
  },
  ponytail: {
    back(c) {
      hAdd(c, [ell(31, 24.5, 14, 12.5), lock(40, 15, 57, 46, 5.5, -4.5, 1), lock(43, 20, 59, 36, 3.2, -2), lock(21, 27, 18, 40, 3.5, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 22, 16, 31, 12, 40, 14.5, 44, 23, 40, 21, 31, 20, 23, 22]), { ol: false });
      hLocks(c, [[23, 18, 20.2, 30, 4, -1], [27, 16.5, 25.8, 28.4, 4, 0.8], [31, 16.5, 31.5, 29, 3.8, 0], [35, 17, 38.6, 27.6, 3.6, -1.2], [39, 19, 43.4, 29, 3, -1],
        [21.8, 24, 20.4, 40, 2.4, 0.6, 0.6]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.22, 1.3, 9);
      const t = c.p.add(ell(42.5, 16.5, 2.4, 1.6, -0.9), rp('#3a8a4a'), 'acc'); c.p.auto(t, { s: 1, hl: 1 });
    },
  },
  hime: { // 长直黑发，齐刘海
    back(c) {
      hAdd(c, blob([16, 26, 17.5, 13, 31, 9.5, 44.5, 13, 46.5, 26, 47, 46, 50, 62, 52, 70, 38, 70, 37, 50, 25, 50, 24, 70, 10, 70, 12, 60, 15, 46]));
      hShade(c, { d: 0, s: 2 });
    },
    front(c) {
      const b = hAdd(c, blob([19.5, 27, 20.5, 16, 31, 11.5, 41.5, 15, 43.5, 27, 40, 27.6, 35, 27.2, 30, 27.8, 25, 27.2, 21.5, 28]));
      for (const x of [24.5, 29, 33.5, 38]) c.p.line([x - 1, 18, x, 27], b, 2, true);
      hAdd(c, poly([19.5, 24, 22.6, 24, 22.8, 46, 21.8, 49, 19.2, 49]));
      hAdd(c, poly([40.4, 24, 43.5, 24, 44, 47, 42.5, 49.5, 40.5, 48]));
      hShade(c);
      gloss(c, 31, 26, 13, 12.5, -PI * 0.92, -PI * 0.12, 1.2, 10);
    },
  },
  wavy: { // 粉色长卷发
    back(c) {
      hAdd(c, [ell(31, 24.5, 14.5, 12.5), lock(20, 24, 12, 50, 5.5, 3, 1.5), lock(23, 32, 16, 57, 5, -2.5, 1.5), lock(42, 24, 50, 49, 5.5, -3, 1.5), lock(39, 32, 46, 57, 5, 2.5, 1.5),
        lock(18, 36, 10, 58, 4, 2, 1)]);
      hShade(c, { d: 0, s: 2 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 22, 15.5, 31, 12, 40, 14.5, 44, 23, 40, 21, 31, 20, 23, 22]), { ol: false });
      hLocks(c, [[22, 19, 19.5, 30, 4, -1], [25.5, 16.5, 23, 27, 4, 1.4], [29, 16, 30.5, 27.5, 4, 1.2], [33, 16.5, 37.5, 26.5, 3.8, -1.2], [37.5, 18, 42.5, 27.5, 3.5, -1.2],
        [21.6, 25, 20, 48, 3.2, 2.4, 1], [42, 25, 45, 44, 3, -2.4, 1]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.2, 1.3, 9);
    },
  },
  wildLong: { // 狂野长发
    back(c) {
      hAdd(c, [blob([15, 26, 17, 12, 31, 8.5, 45, 12, 48, 26, 50, 44, 46, 50, 22, 50, 12, 46]),
        lock(16, 34, 6, 52, 5, 2), lock(46, 34, 57, 54, 5, -2), lock(18, 40, 12, 60, 5, 1), lock(44, 40, 52, 62, 5, -1), lock(44, 20, 55, 24, 4, -1), lock(19, 18, 9, 18, 4, 1)]);
      hShade(c, { d: 0, s: 2 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 22, 15.5, 31, 12, 40, 14.5, 44, 23, 40, 21, 31, 20, 23, 22]), { ol: false });
      hLocks(c, [[23, 17, 19, 31, 4, -1], [27, 16, 25, 28, 4, 1], [31, 16, 32.5, 27.5, 4, -0.5], [35, 16, 40.5, 26, 4, -1.4], [39.5, 18, 45, 29, 3.2, -1], [21.6, 24, 18.5, 44, 3, 1.6]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.92, -PI * 0.22, 1.3, 9);
    },
  },
  shaggy: { // 帽子下的蓬发
    back(c) {
      hAdd(c, [ell(31, 24.5, 14.5, 12.5), lock(21, 28, 14, 42, 4.5, 1), lock(25, 34, 21, 48, 4, 1), lock(41, 28, 47, 42, 4.5, -1), lock(38, 34, 43, 48, 4, -1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hLocks(c, [[22, 20, 19.5, 33, 3.5, -1], [26, 19, 24, 28, 3.5, 1], [30, 19, 30.5, 27, 3.4, 0.5], [35, 19, 38, 26.5, 3.2, -1], [40, 20, 43.5, 31, 3, -1]]);
      hShade(c);
    },
  },
  mane: { // 奥古斯都：银色后梳鬃发
    back(c) {
      hAdd(c, [ell(31, 23.5, 15, 12.5), lock(40, 15, 54, 30, 5.5, -2), lock(42, 24, 53, 44, 5, -1.5), lock(38, 30, 45, 52, 4.5, -0.5), lock(22, 26, 13, 44, 4.5, 1.5), lock(26, 32, 20, 50, 4, 1),
        lock(32, 12, 46, 7, 5, -2), lock(24, 15, 14, 12, 4.5, 1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      const cap = hAdd(c, blob([19.5, 26, 20.5, 16, 30, 11, 40, 13, 44.5, 21, 42.5, 26, 38.5, 20, 31, 18, 24, 20.5, 21.5, 27]));
      hLocks(c, [[27, 18, 23, 26.5, 2.4, 1.2], [30, 18, 27.5, 25, 2, 1]]);
      for (const l of [[22, 22, 26, 15, 34, 12.5, 44, 15], [25, 20, 31, 15.5, 40, 16, 45, 20], [33, 18.4, 38, 18, 43.5, 23]]) c.p.line(l, cap, 2, true);
      hShade(c);
      gloss(c, 31, 24.5, 13, 11.5, -PI * 0.92, -PI * 0.3, 1.3, 9);
    },
  },
  sage: { // 张青：长白发 + 发髻
    back(c) {
      hAdd(c, [ell(31, 24, 14, 12.5), ell(37, 11.5, 4.5, 3.6), lock(20, 26, 14, 64, 5, 2), lock(42, 26, 50, 64, 5.5, -2), lock(30, 30, 30, 62, 9, 0)]);
      hShade(c, { d: 0 });
      c.p.line([34, 13.6, 36.5, 14.4, 40, 13.6], 'hair', 1, true);
    },
    front(c) {
      const cap = hAdd(c, blob([19.5, 27, 20.5, 16, 30, 11.5, 40, 13.5, 44, 22, 42.5, 27, 39, 20, 31, 18.5, 24, 20.5, 21.5, 28]));
      for (const l of [[22, 23, 25, 16, 32, 13], [30, 18.8, 36, 15, 42, 16.5]]) c.p.line(l, cap, 2, true);
      hLocks(c, [[21.8, 24, 19.4, 52, 2.6, 1, 0.5], [41.5, 24, 44, 46, 2.4, -1, 0.5]]);
      hShade(c);
      gloss(c, 31, 24.5, 12.5, 11, -PI * 0.9, -PI * 0.35, 1.2, 8);
    },
  },
  sides: { // 只露出两侧（帽冠下）
    back(c) {
      hAdd(c, [lock(22, 21, 17, 37, 4.5, 1, 1), lock(40, 21, 45, 35, 4.5, -1, 1), ell(31, 24, 13.5, 11)]);
      hShade(c, { d: 0 });
    },
  },
  short: { // 普通短发（士兵等）
    back(c) { hAdd(c, [ell(31, 24.5, 14, 12.5), lock(22, 30, 19, 40, 3.5, 1), lock(40, 30, 43, 40, 3.5, -1)]); hShade(c, { d: 0 }); },
    front(c) {
      hAdd(c, blob([19.5, 25, 21, 16, 30, 12, 40, 14, 44, 22, 41, 23, 30, 20.5, 22, 22.5]), { ol: false });
      hLocks(c, [[23, 17, 20, 29, 3.5, -1], [27, 17, 26, 26, 3.6, 1], [31, 17, 32, 25.5, 3.6, -0.5], [35, 17, 38.5, 25.5, 3.4, -1], [39, 18, 43, 28, 3, -1]]);
      hShade(c);
      gloss(c, 31, 25, 13, 11.5, -PI * 0.9, -PI * 0.25, 1.2, 8);
    },
  },
  bald: { back(c) {} },
  snakes: {
    back(c) {
      hAdd(c, [ell(31, 24.5, 14.5, 12.5), lock(20, 26, 12, 46, 4.5, 3, 1.5), lock(42, 26, 51, 44, 4.5, -3, 1.5)]);
      hShade(c, { d: 0 });
      snakeLocks(c, [[22, 18, 9, 9, 3], [40, 16, 52, 6, -3], [19, 28, 6, 30, -2], [43, 26, 56, 24, 2]]);
    },
    front(c) { snakeLocks(c, [[24, 17, 17, 28, -2], [29, 15, 26, 27, 2.5], [34, 15, 37.5, 26, -2], [39, 18, 45, 28, -2], [31, 14, 30, 4, 3]]); },
  },
};

function snakeLocks(c, list) {
  const { p } = c;
  const red = p.obj(['#300000', '#a01010', '#ff2020', '#ff6040', '#ffb090', '#ffffff'], 'glow', { ol: false });
  for (const [x0, y0, x1, y1, b] of list) {
    const id = p.add(lock(x0, y0, x1, y1, 2.6, b, 1.6), c.hairPal, 'hair');
    const a = Math.atan2(y1 - y0, x1 - x0);
    p.fill(ell(x1 + Math.cos(a) * 1.4, y1 + Math.sin(a) * 1.4, 2.6, 1.9, a), id, 3);
    p.auto(id, { s: 1, d: 0, hl: 1, dx: 1, dy: 0.5 });
    p.px(x1 + Math.cos(a) * 1.6 - Math.sin(a) * 0.9, y1 + Math.sin(a) * 1.6 + Math.cos(a) * 0.9, red, 2);
    p.line([x0 + (x1 - x0) * 0.2, y0 + (y1 - y0) * 0.2, (x0 + x1) / 2 + b * 0.3, (y0 + y1) / 2], id, 4, true);
  }
}
function kabutoBack(c) {
  const { p, S } = c;
  const mt = rp(S.helm || '#2a2a3a');
  const id = p.add(blob([11, 40, 12.5, 24, 20, 16, 31, 14, 42, 16, 49.5, 24, 51, 40, 45, 43, 41, 32, 21, 32, 17, 43]), mt, 'metal');
  p.auto(id, { s: 2, d: 1, hl: 1 });
  for (const y of [27, 32, 37]) p.line([11.5, y + 3, 20, y - 3, 31, y - 5, 42, y - 3, 50.5, y + 3], id, 1, true);
  for (const y of [28.5, 33.5]) p.line([11.5, y + 3, 20, y - 3, 31, y - 5, 42, y - 3, 50.5, y + 3], id, 4, true);
}
const NEMES = METAL.gold.concat(['#16286e', '#2c4cb4']);
function stripes(p, id, y0, n) { for (let k = 0; k < n; k++) { const y = y0 + k * 4.2; p.line([8, y + 12, 18, y + 2, 31, y - 3, 44, y + 2, 54, y + 12], id, 6, true); p.line([8, y + 13, 18, y + 3, 31, y - 2, 44, y + 3, 54, y + 13], id, 7, true); } }
function nemesBack(c) {
  const { p } = c;
  const id = p.add(blob([14, 44, 15, 22, 21, 12, 31, 9, 41, 12, 47, 22, 48, 44, 53, 58, 9, 58]), NEMES, 'hood');
  p.auto(id, { s: 2, d: 1, hl: 1 });
  stripes(p, id, 10, 11);
}
function nemesFront(c) {
  const { p } = c;
  const rim = ring(blob([13.5, 46, 14, 22, 20, 11.5, 31, 8, 42, 11.5, 48, 22, 49, 46, 46, 56, 16, 56]), blob([19.5, 42, 19.5, 25, 24, 19, 31, 18, 38.5, 19, 43.5, 25, 43.5, 42, 38, 49, 31, 51.5, 24, 49]));
  const id = piece(c, rim, NEMES, 'hood', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.4 });
  stripes(p, id, 8, 12);
  piece(c, blob([19, 20.5, 31, 17.5, 43.5, 20.5, 43.5, 23.5, 31, 20.8, 19, 23.8]), METAL.gold, 'metal', { s: 1, hl: 1 });
  piece(c, blob([29.5, 18, 30, 12, 31, 10.5, 32.5, 12, 33, 18]), METAL.gold, 'metal', { s: 1, hl: 1 });
  p.cast(id, ['skin'], 1, 1, 2, 3);
}

// ---------- 胡须 ----------
const BEARD = {
  stubble(c) {
    const { p, F, face } = c;
    for (let y = F.mouth[1] - 2; y <= F.chin[1]; y++) for (let x = 22; x <= 42; x++) {
      if ((x + y) % 2) continue;
      const near = y > F.mouth[1] - 2 && (x < F.mouth[0] - 3 || x > F.mouth[0] + 3 || y > F.mouth[1] + 1) && y > F.nose[1] + 3;
      if (near && y > 40) p.spx(x + 0.5, y + 0.5, face, 2);
    }
  },
  mustache(c) {
    const { p, F } = c; const [x, y] = F.mouth;
    const id = p.add(blob([x - 5, y + 0.5, x - 2, y - 2.2, x + 1, y - 2.4, x + 4, y - 1.2, x + 5, y + 1, x + 2, y - 0.4, x - 2, y - 0.2]), c.S.beardPal || c.hairPal, 'beard');
    p.auto(id, { s: 1, hl: 1 });
  },
  full(c) {
    const { p, F } = c; const [x, y] = F.mouth; const ch = F.chin;
    const pal = c.S.beardPal || c.hairPal;
    const id = p.add(blob([21, 37, 23.5, 41, x - 3, y - 2.6, x + 1, y - 2.8, x + 5, y - 1.6, 40.5, 39, 41.5, 37.5, 41, 43, ch[0] + 4, ch[1] + 2, ch[0], ch[1] + 4, ch[0] - 5, ch[1] + 2, 22.5, 45, 20.5, 40]), pal, 'beard');
    p.auto(id, { s: 2, d: 1, hl: 1 });
    p.add(blob([x - 2, y + 0.2, x + 2, y + 0.2, x + 1.5, y + 1.6, x - 1.5, y + 1.6]), SKIN.fair.slice(0, 3).concat(['#5a2a24', '#5a2a24', '#5a2a24']), 'mouth', { ol: false });
    for (const l of [[24, 42, 26, 46], [29, 45, 30, 49.5], [36, 45, 35.5, 49]]) p.line(l, id, 2, true);
  },
  long(c) {
    const { p, F } = c; const [x, y] = F.mouth; const ch = F.chin;
    const pal = c.S.beardPal || c.hairPal;
    const id = p.add(union(blob([21, 36, 23.5, 41, x - 3, y - 2.6, x + 1, y - 2.8, x + 5, y - 1.6, 40.5, 39, 41.5, 37, 41.5, 44, 38, 50, 35, 58, 32, 66, 29.5, 58, 25, 50, 21.5, 45]),
      lock(26, 46, 26, 60, 3, 1), lock(37, 46, 38.5, 58, 3, -1)), pal, 'beard');
    p.auto(id, { s: 2, d: 1, hl: 1 });
    // 小胡子
    const m = p.add(blob([x - 6, y + 2, x - 2, y - 2.4, x + 1, y - 2.6, x + 5, y - 1.2, x + 6, y + 2.5, x + 2, y - 0.2, x - 2, y]), pal, 'beard');
    p.auto(m, { s: 1, hl: 1 });
    for (const l of [[27, 46, 29, 56], [32, 48, 32.5, 60], [35.5, 47, 35, 55]]) p.line(l, id, 2, true);
  },
  goatee(c) {
    const { p, F } = c; const [x, y] = F.mouth; const ch = F.chin;
    const pal = c.S.beardPal || c.hairPal;
    const m = p.add(blob([x - 4.5, y + 1, x - 2, y - 2.2, x + 1, y - 2.4, x + 4, y - 1.2, x + 4.5, y + 1, x + 1, y - 0.6, x - 2, y - 0.4]), pal, 'beard');
    const g = p.add(blob([x - 1.5, y + 2, x + 2.5, y + 2, ch[0] + 1.5, ch[1] + 2.5, ch[0] - 0.5, ch[1] + 3.5]), pal, 'beard');
    p.auto('beard', { s: 1, hl: 1 });
  },
};

// ---------- 服装工具（画面坐标）----------
const TORSO = {
  std: [-1, 73, 0, 64, 4, 59.5, 12, 56.5, 21, 54.6, 26, 54, 37, 54, 43, 54.8, 51, 57, 58, 60.5, 63, 65, 65, 73],
  broad: [-1, 73, -1, 61, 3, 56.5, 11, 53.6, 21, 52.6, 26, 52.5, 38, 52.5, 44, 53, 53, 55, 60, 58, 65, 63, 65, 73],
  slim: [2, 73, 3, 65, 7, 60.5, 14, 57.6, 22, 56, 27, 55.5, 36, 55.5, 41, 56, 48, 58, 55, 61, 60, 66, 62, 73],
};
function torso(c, pal, kind, g) {
  const id = c.p.add(blob(TORSO[kind || 'std'], 0.8), pal, g || 'cloth');
  c.p.auto(id, { s: 3, d: 1, hl: 1, dx: 1, dy: 0.35 });
  return id;
}
function folds(c, id, list, tone) { for (const l of list) c.p.line(l, id, tone == null ? 2 : tone, true); }
function piece(c, path, pal, g, auto, opt) { const id = c.p.add(path, pal, g || 'cloth', opt); if (auto !== false) c.p.auto(id, Object.assign({ s: 2, d: 0, hl: 1, dx: 1, dy: 0.5 }, auto || {})); return id; }
// 肩甲：多层圆弧
function pauldron(c, x, y, rx, ry, pal, layers, rot) {
  let last;
  for (let i = 0; i < (layers || 1); i++) {
    last = piece(c, ell(x + i * 0.4, y + i * ry * 0.45, rx - i * 0.6, ry - i * 0.5, rot || 0), pal, 'metal', { s: 2, d: 1, hl: 2, dx: 0.8, dy: 0.8 });
  }
  return last;
}
function rivet(c, x, y) { c.p.px(x, y, c.p.obj(METAL.gold, 'acc', { ol: false }), 4); }
// 颈部 V 领
function vneck(c, pts, under) {
  if (under) return piece(c, poly(pts), under, 'cloth', { s: 1, hl: 0 });
  c.p.fill(poly(pts), c.neck, 3); c.p.auto(c.neck, { s: 2, hl: 0 });
  return c.neck;
}

const BODY = {
  tunic(c) { torso(c, rp(c.S.cloth || '#5a6a8a')); vneck(c, [26, 53, 37, 53, 32, 60]); },
  jacket(c) {
    const { p, S } = c;
    const jp = rp(S.cloth || '#a8743c');
    torso(c, jp);
    piece(c, poly([25, 52, 38, 52, 36.5, 74, 26.5, 74]), rp('#e6e2da'), 'cloth', { s: 2, hl: 0 });
    folds(c, 'cloth', [[8, 64, 12, 68, 13, 73], [50, 63, 52, 68], [17, 60, 20, 66]]);
    // 翻领
    piece(c, poly([22.5, 54, 27.5, 57, 25.5, 66, 20.5, 56.5]), jp, 'cloth', { s: 1, hl: 1 });
    piece(c, poly([40.5, 54, 36, 57.5, 38, 65, 43, 56.5]), jp, 'cloth', { s: 1, hl: 1 });
    // 红围巾
    const sc = rp(S.scarf || '#c8282c');
    const sid = piece(c, blob([22.5, 50.5, 30, 53.5, 39.5, 50.5, 40.5, 55, 31, 58.5, 22, 55.5]), sc, 'scarf', { s: 2, hl: 1 });
    piece(c, lock(27, 56, 24.5, 70.5, 3, 1, 1.6), sc, 'scarf', { s: 1, hl: 1 });
    piece(c, lock(29.5, 56.5, 30.5, 67, 2.4, -0.5, 1.2), sc, 'scarf', { s: 1, hl: 1 });
    folds(c, sid, [[25, 54, 31, 56.4, 37, 54]]);
  },
  lightArmor(c) {
    const { S } = c;
    torso(c, rp(S.cloth || '#2c5aa0'));
    const st = S.metal || METAL.steel;
    piece(c, blob([19, 74, 19.5, 63, 24, 57.5, 31, 56.6, 38.5, 57.5, 43.5, 62, 44.5, 74], 0.9), st, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.3 });
    piece(c, blob([23, 52, 31, 54.5, 40, 52, 41, 57, 31, 60, 22, 57]), st, 'metal', { s: 1, hl: 1 });
    c.p.line([31, 60, 31, 73], 'metal', 2, true);
    pauldron(c, 10, 61, 10.5, 6.5, st, 3, -0.15);
    pauldron(c, 53, 62.5, 8.5, 6, st, 2, 0.15);
    rivet(c, 7, 59); rivet(c, 51, 60);
    piece(c, rect(27, 64, 8, 2), METAL.gold, 'acc', { s: 0, hl: 0 });
  },
  vest(c) { // 克莱恩：赤膊 + 皮背心 + 肩甲
    const { p, S } = c;
    const sk = SKIN[S.skin] || SKIN.tan;
    const body = torso(c, sk, 'broad', 'skin');
    // 胸肌线
    folds(c, body, [[22, 62, 27, 64.5, 31, 63.5], [33, 64, 38, 65, 42, 62.5], [31, 62, 31.5, 72]], 2);
    const lp = rp(S.cloth || '#6a4428');
    piece(c, blob([-1, 74, -1, 62, 5, 56, 14, 53.6, 21, 54, 24, 60, 22, 74], 0.8), lp, 'cloth', { s: 2, d: 1, hl: 1, dx: 1, dy: 0.3 });
    piece(c, blob([42, 74, 40, 61, 44, 54, 52, 55.5, 60, 58.5, 65, 63, 65, 74], 0.8), lp, 'cloth', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.3 });
    pauldron(c, 9, 57.5, 10, 6, METAL.steel, 2, -0.25);
    rivet(c, 5, 56); rivet(c, 10, 55); rivet(c, 15, 56);
    piece(c, lock(41, 56, 22, 74, 2.2, 0, 2.2), rp('#4a3020'), 'cloth', { s: 1, hl: 1 });
  },
  samurai(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#2a2e4a'));
    // 白色内衬交领
    piece(c, poly([24.5, 52, 28, 52, 33, 64, 31, 66]), rp('#e8e4dc'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([38, 52, 40, 53.5, 33, 64, 31.5, 62]), rp('#e8e4dc'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([22, 54, 25, 52.5, 31.5, 66, 30, 74, 27, 74]), rp(S.cloth || '#2a2e4a'), 'cloth', { s: 1, hl: 1 });
    // 大袖（肩甲）
    const red = rp(S.armor || '#9a2a2a');
    const a = piece(c, poly([-1, 60, 6, 55, 17, 56, 15, 74, -1, 74]), red, 'metal', { s: 2, d: 1, hl: 1 });
    const b = piece(c, poly([46, 57, 56, 56, 64, 61, 64, 74, 49, 74]), red, 'metal', { s: 2, d: 1, hl: 1 });
    for (const y of [61, 66, 71]) { p.line([-1, y - 1, 16, y], a, 1, true); p.line([47.5, y, 64, y - 1], b, 1, true); }
    for (const x of [4, 10]) p.line([x, 57, x, 74], a, 4, true);
    for (const x of [52, 58]) p.line([x, 58, x, 74], b, 4, true);
  },
  strap(c) { // 欧兹：短上衣 + 斜挎皮带 + 单边肩甲
    const { S } = c;
    torso(c, rp(S.cloth || '#2e7a6a'));
    vneck(c, [27, 53, 36, 53, 32, 58.5]);
    piece(c, poly([24, 52.5, 31.5, 56.5, 39, 52.5, 40, 55, 31.5, 59.5, 23, 55]), rp(S.trim || '#e8dcb0'), 'cloth', { s: 1, hl: 1 });
    const lp = rp('#7a4a24');
    piece(c, lock(8, 58, 46, 74, 3, 1.5, 3), lp, 'cloth', { s: 1, hl: 1 });
    pauldron(c, 8.5, 60, 9, 5.8, rp('#8a5a2a'), 2, -0.2);
    rivet(c, 30, 66);
  },
  priestRobe(c) {
    const { p, S } = c;
    const w = rp(S.cloth || '#eeeaf2', { coolHue: 235 });
    torso(c, w, 'slim');
    const gold = METAL.gold;
    piece(c, blob([22, 56, 31, 59, 41, 56, 42, 59, 31, 63, 21, 59.5]), rp(S.trim || '#3a5ab0'), 'cloth', { s: 1, hl: 1 });
    piece(c, poly([29.5, 60, 33.5, 60, 33.5, 74, 29.5, 74]), rp(S.trim || '#3a5ab0'), 'cloth', { s: 1, hl: 1 });
    p.line([28.5, 60, 28.5, 74], 'cloth', 4, true);
    const cr = piece(c, union(rect(30.5, 63, 2, 7), rect(28.5, 65, 6, 2)), gold, 'acc', { s: 1, hl: 1 });
  },
  archer(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#3a7a3a'), 'slim');
    piece(c, blob([20, 55.5, 31, 58, 42, 55.5, 44, 60, 31, 63, 18, 60]), rp('#8a5a2c'), 'cloth', { s: 1, hl: 1 });
    vneck(c, [27, 54.5, 36, 54.5, 31.5, 59]);
    pauldron(c, 11, 61, 8, 5, rp('#8a5a2c'), 2, -0.2);
    piece(c, lock(44, 58, 22, 74, 2, 0, 2), rp('#5a3a1c'), 'cloth', { s: 1, hl: 1 });
  },
  princess(c) {
    const { p, S } = c;
    const robe = rp(S.cloth || '#8a2a5a');
    torso(c, robe, 'slim');
    const gold = METAL.gold;
    // 立领 + 金饰
    piece(c, blob([22.5, 51, 31, 54, 40.5, 51, 42, 57, 31, 61, 21, 57]), gold, 'metal', { s: 1, d: 0, hl: 1 });
    piece(c, blob([25, 54, 31, 56.4, 38, 54, 37, 57, 31, 59, 26, 57]), rp(S.trim || '#30206a'), 'cloth', { s: 1, hl: 0 });
    const gem = piece(c, ell(31.5, 59.5, 2, 2.2), rp('#20b0a0'), 'acc', { s: 1, hl: 1 });
    p.px(31, 58, gem, 5);
    // 披肩层
    piece(c, blob([2, 66, 8, 59, 17, 58, 22, 63, 16, 68, 6, 70]), rp(S.trim || '#30206a'), 'cloth', { s: 1, hl: 1 });
    piece(c, blob([45, 63, 49, 58.6, 57, 60, 62, 66, 56, 70, 47, 69]), rp(S.trim || '#30206a'), 'cloth', { s: 2, hl: 1 });
    folds(c, 'cloth', [[14, 64, 16, 73], [46, 70, 47, 74]]);
  },
  highPriest(c) {
    const { p, S } = c;
    torso(c, rp('#e8e4ee', { coolHue: 240 }));
    const st = rp(S.trim || '#a82a3a');
    piece(c, poly([21, 54, 27, 54, 30, 74, 21, 74]), st, 'cloth', { s: 1, hl: 1 });
    piece(c, poly([36, 54, 42, 54, 43, 74, 34, 74]), st, 'cloth', { s: 2, hl: 1 });
    piece(c, blob([20, 52, 31, 55, 42.5, 52, 44, 57, 31, 60, 18.5, 57]), METAL.gold, 'metal', { s: 1, hl: 1 });
    for (const [x, y] of [[25, 64], [38.5, 64]]) piece(c, union(rect(x - 0.5, y - 2, 2, 6), rect(x - 2, y - 0.5, 5, 2)), METAL.gold, 'acc', { s: 0, hl: 1 });
  },
  sorcerer(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#4a2a6a'));
    folds(c, 'cloth', [[12, 62, 14, 73], [48, 62, 49, 73], [24, 62, 25, 73]]);
    piece(c, blob([21, 53, 31, 57, 42, 53, 44, 58, 31, 63, 19, 58]), rp(S.trim || '#2a1a40'), 'cloth', { s: 1, hl: 1 });
    const cl = piece(c, ell(31, 62, 2.6, 2.3), METAL.gold, 'acc', { s: 1, hl: 1 });
    piece(c, ell(31, 62, 1.2, 1.1), rp('#c02040'), 'acc', { s: 0, hl: 1 });
  },
  mageRobe(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#2a4aa0'), 'slim');
    piece(c, blob([20.5, 54, 31, 57.5, 42, 54, 46, 60, 40, 64, 31, 60, 22, 64, 16, 60]), rp(S.trim || '#eae6f0'), 'cloth', { s: 1, hl: 1 });
    vneck(c, [27, 55, 36, 55, 31.5, 59]);
    const b = piece(c, ell(31.5, 60.5, 2.2, 2.2), rp('#d03040'), 'acc', { s: 1, hl: 1 });
    folds(c, 'cloth', [[12, 64, 13, 73], [50, 64, 51, 73]]);
  },
  hawk(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#6a4a2a'), 'slim');
    vneck(c, [26.5, 54.5, 36.5, 54.5, 31.5, 61]);
    piece(c, blob([20, 56, 31, 58, 42, 56, 41, 60, 31, 62, 21, 60]), rp('#c8a050'), 'cloth', { s: 1, hl: 1 });
    // 羽毛肩饰
    const fp = rp(S.feather || '#e8e0d0');
    for (let i = 0; i < 4; i++) piece(c, lock(14 - i * 2, 56 + i * 0.4, 4 - i * 3, 62 + i * 3, 3, 1.5), fp, 'feather', { s: 1, hl: 1 });
    for (let i = 0; i < 3; i++) piece(c, lock(48 + i * 2, 57 + i * 0.4, 57 + i * 3, 63 + i * 3, 3, -1.5), fp, 'feather', { s: 2, hl: 1 });
  },
  wolf(c) {
    const { p, S } = c;
    torso(c, rp(S.cloth || '#5a3a2a'), 'broad');
    const fur = rp(S.fur || '#9a9aa8');
    const f = piece(c, blob([-1, 64, 3, 55, 12, 51.5, 22, 50.5, 31, 54, 41, 50.5, 52, 52, 60, 55, 65, 62, 58, 64, 50, 61, 40, 60, 31, 63, 22, 60, 12, 61, 4, 66]), fur, 'fur', { s: 2, d: 1, hl: 1 });
    for (let x = 2; x < 62; x += 4) p.line([x, 58 + Math.sin(x) * 2, x + 1.5, 63 + Math.cos(x) * 1.5], f, 2, true);
    pauldron(c, 52, 64, 7, 4.5, METAL.steel, 1, 0.2);
  },
  cloak(c) {
    const { p, S } = c;
    const cp = rp(S.cloth || '#26263a');
    torso(c, cp, 'std');
    // 高立领
    piece(c, blob([20, 50, 23, 45, 26, 48, 31, 53, 37, 48, 41, 45, 43.5, 50, 42, 57, 31, 61, 21, 57]), cp, 'cloth', { s: 2, d: 1, hl: 1 });
    folds(c, 'cloth', [[10, 62, 12, 73], [20, 61, 21, 73], [48, 62, 50, 73]]);
    piece(c, ell(31, 60, 2.2, 2), METAL.silver, 'acc', { s: 1, hl: 1 });
  },
  plate(c) { // 银色板甲 + 披风
    const { p, S } = c;
    const mt = S.metal || METAL.silver;
    if (S.cape) piece(c, blob([-1, 74, 0, 60, 8, 55, 54, 55, 64, 60, 65, 74]), rp(S.cape), 'cloth', { s: 2, hl: 1 });
    torso(c, mt, S.torso || 'std', 'metal');
    piece(c, blob([22.5, 51.5, 31, 54.5, 40, 51.5, 41.5, 57.5, 31, 61, 21, 57.5]), mt, 'metal', { s: 1, d: 0, hl: 1 });
    c.p.line([31, 61, 31, 74], 'metal', 2, true);
    p.line([20, 66, 26, 63, 31, 64, 37, 63, 43, 66], 'metal', 2, true);
    pauldron(c, 9.5, 60.5, 11, 7, mt, 3, -0.2);
    pauldron(c, 54, 62, 9, 6.5, mt, 2, 0.2);
    if (S.trimGold) { p.line([1, 58, 9, 54, 19, 56], 'metal', 4, true); }
    if (S.emblem) { const e = piece(c, ell(31, 66, 3, 3.2), METAL.gold, 'acc', { s: 1, hl: 1 }); piece(c, ell(31, 66, 1.4, 1.6), rp(S.emblem), 'acc', { s: 0, hl: 1 }); }
  },
  coat(c) { // 哈克：船长外套
    const { p, S } = c;
    const cp = rp(S.cloth || '#2a3a6a');
    torso(c, cp);
    piece(c, poly([24, 52, 39, 52, 37, 74, 26, 74]), rp('#ece6d8'), 'cloth', { s: 1, hl: 0 });
    piece(c, blob([26, 54, 31, 53.5, 36.5, 54, 35, 61, 31, 63.5, 27, 61]), rp('#f4f0e8'), 'cloth', { s: 1, hl: 1 });
    piece(c, poly([20, 54, 26.5, 55, 25, 74, 18, 74]), cp, 'cloth', { s: 1, hl: 1 });
    piece(c, poly([37, 55, 43, 54, 46, 74, 38, 74]), cp, 'cloth', { s: 2, hl: 1 });
    for (const y of [62, 67, 72]) { rivet(c, 22, y); rivet(c, 41, y); }
    // 金肩章
    if (S.epaulette === false) return;
    const g = S.epaulette || METAL.gold;
    piece(c, ell(9, 58.5, 7.5, 3, -0.2), g, 'metal', { s: 1, hl: 1 });
    piece(c, ell(53, 59.5, 6, 2.6, 0.2), g, 'metal', { s: 1, hl: 1 });
    for (let x = 3; x <= 15; x += 2) p.line([x, 60.5, x - 0.3, 63.5], 'metal', 2, true);
  },
  master(c) { // 张青：交领长袍 + 护肩
    const { p, S } = c;
    const cp = rp(S.cloth || '#3a4a6a');
    torso(c, cp);
    piece(c, poly([25, 52, 28.5, 52, 35, 66, 32.5, 68]), rp('#e8e4dc'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([37.5, 52, 40, 53.5, 34, 65, 32.5, 62]), rp('#e8e4dc'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([21.5, 54, 25, 52.5, 33.5, 68, 32, 74, 27, 74]), cp, 'cloth', { s: 1, hl: 1 });
    pauldron(c, 10, 61, 9.5, 5.5, METAL.steel, 2, -0.2);
  },
  soldier(c) { // 敌兵：锁甲 + 罩袍
    const { p, S } = c;
    const mail = METAL.steel;
    const t = torso(c, mail, S.torso || 'std', 'metal');
    for (let y = 57; y < 73; y += 2) for (let x = (y % 4 ? 0 : 1); x < 64; x += 2) p.spx(x + 0.5, y + 0.5, t, 2);
    piece(c, blob([16, 74, 18, 62, 24, 58, 39, 58, 45, 62, 47, 74]), rp(S.cloth || '#a82a2a'), 'cloth', { s: 2, d: 1, hl: 1 });
    piece(c, blob([22.5, 51, 31, 54, 40, 51, 41.5, 57, 31, 60, 21, 57]), mail, 'metal', { s: 1, hl: 1 });
    if (S.emblem !== false) { const e = piece(c, poly([31.5, 62, 35, 64, 34, 69, 31.5, 71, 29, 69, 28, 64]), METAL.gold, 'acc', { s: 1, hl: 1 }); }
    if (S.pauldrons !== false) { pauldron(c, 9.5, 60.5, 10, 6, S.metal || METAL.steel, 2, -0.2); pauldron(c, 54, 62, 8.5, 5.8, S.metal || METAL.steel, 1, 0.2); }
  },
  rags(c) { // 村民/盗贼：粗布
    const { p, S } = c;
    torso(c, rp(S.cloth || '#8a7a5a'));
    vneck(c, [26, 53, 37, 53, 32, 61]);
    piece(c, blob([21, 54, 31, 59, 42, 54, 43, 57, 31, 63, 20, 57]), rp(S.trim || '#6a5a3a'), 'cloth', { s: 1, hl: 1 });
    folds(c, 'cloth', [[10, 62, 13, 73], [50, 63, 51, 73]]);
    if (S.strap) piece(c, lock(8, 58, 46, 74, 2.6, 1.5, 2.6), rp('#5a3a1c'), 'cloth', { s: 1, hl: 1 });
  },
  regal(c) { // 帝王：毛皮领 + 红金袍
    const { p, S } = c;
    torso(c, rp(S.cloth || '#8a1a2a'), 'broad');
    piece(c, poly([25, 52, 38, 52, 36, 74, 27, 74]), METAL.gold, 'metal', { s: 1, hl: 1 });
    const fur = piece(c, blob([-1, 62, 3, 54, 13, 51, 23, 51, 28, 58, 26, 74, 18, 74, 14, 64, 5, 66]), rp('#f0ece4'), 'fur', { s: 2, hl: 0 });
    const fur2 = piece(c, blob([35, 58, 40, 51, 50, 51, 60, 54, 65, 61, 60, 66, 50, 64, 46, 74, 38, 74]), rp('#f0ece4'), 'fur', { s: 2, hl: 0 });
    for (const [x, y] of [[8, 60], [16, 57], [20, 66], [44, 62], [52, 57], [58, 62], [41, 69]]) { p.spx(x, y, 'fur', 0); p.spx(x, y + 1, 'fur', 1); }
    piece(c, ell(31.5, 61, 2.4, 2.4), rp('#c02030'), 'acc', { s: 1, hl: 1 });
  },
  shamanRobe(c) {
    const { p, S } = c;
    const e = S.el || ELEM.earth;
    torso(c, rp(e.robe));
    piece(c, blob([20, 52, 31, 56, 42, 52, 44, 58, 31, 64, 18, 58]), rp(e.trim), 'cloth', { s: 1, hl: 1 });
    vneck(c, [27, 53, 36, 53, 31.5, 58]);
    // 念珠
    for (let i = 0; i <= 8; i++) { const a = PI * (0.15 + i * 0.0875); const x = 31.5 + Math.cos(a) * 9.5, y = 54 + Math.sin(a) * 9; piece(c, ell(x, y, 1.3, 1.3), rp(e.bead), 'acc', { s: 0, hl: 1 }); }
    folds(c, 'cloth', [[10, 63, 12, 73], [50, 63, 51, 73]]);
  },
  lion(c) { // 狮身：鬃毛 + 前肢
    const { p } = c;
    const fur = rp('#c89040'), mane = rp('#8a4a1a');
    torso(c, fur, 'broad', 'fur');
    const locks = [];
    for (let i = 0; i < 9; i++) locks.push(lock(6 + i * 6.4, 54 + Math.abs(i - 4) * 0.6, 4 + i * 6.8, 66 + (i % 2) * 4, 4.4, i % 2 ? 1.5 : -1.5, 0.4));
    const m = piece(c, union(...locks), mane, 'fur', { s: 2, d: 1, hl: 1 });
    piece(c, blob([24, 60, 31, 58, 39, 60, 38, 66, 31, 68, 25, 66]), METAL.gold, 'metal', { s: 1, hl: 1 });
    piece(c, ell(31.5, 63, 2, 2), rp('#2a6ad0'), 'acc', { s: 0, hl: 1 });
  },
  monkRobe(c) { // 敌方牧师 / 法师
    const { p, S } = c;
    torso(c, rp(S.cloth || '#e0dce8', { coolHue: 240 }));
    piece(c, blob([21, 53, 31, 57, 42, 53, 44, 58, 31, 63, 19, 58]), rp(S.trim || '#4a5aa0'), 'cloth', { s: 1, hl: 1 });
    folds(c, 'cloth', [[11, 63, 13, 73], [50, 63, 51, 73], [27, 64, 28, 73]]);
  },
};

// ---------- 头饰（脸部坐标）----------
function hoodBack(c, pal) {
  const id = c.p.add(blob([11, 46, 12, 22, 19, 10.5, 31, 6.5, 43, 10.5, 50, 22, 51, 46, 54, 56, 8, 56]), pal, 'hood');
  c.p.auto(id, { s: 2, d: 1, hl: 0 });
  c.p.shade(blob([15, 40, 17, 22, 24, 13, 31, 11, 38, 13, 45, 22, 47, 40, 31, 48]), id, 1);
}
function hoodFront(c, pal, open) {
  const o = open || [18.5, 41, 18.5, 24, 23.5, 15, 31, 13, 38.5, 15, 44, 24, 44, 41, 38, 49, 31, 51.5, 24, 49];
  const rim = ring(blob([12, 46, 12.5, 22, 19, 10.5, 31, 6.5, 43, 10.5, 49.5, 22, 50.5, 46, 47, 56, 15, 56]), blob(o));
  const id = c.p.add(rim, pal, 'hood');
  c.p.auto(id, { s: 3, d: 1, hl: 1, dx: 1, dy: 0.4 });
  c.p.cast(id, ['hair', 'skin'], 1, 1, 2, 3); c.p.cast(id, ['hair', 'skin'], 0, 2, 2, 3);
  return id;
}
const HEAD = {
  headband(c) {
    const { p, S } = c;
    const pal = rp(S.band || '#c8302c');
    piece(c, lock(19, 23, 9, 29, 2.2, 1, 1.4), pal, 'acc', { s: 1, hl: 1 });
    piece(c, lock(19, 24, 11, 34, 2, 2, 1.2), pal, 'acc', { s: 1, hl: 1 });
    const b = piece(c, blob([19.2, 21.2, 31, 19, 43.6, 20.6, 43.6, 24.2, 31, 22.8, 19.2, 25]), pal, 'acc', { s: 1, hl: 1, dy: 1, dx: 0.3 });
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
    if (S.bandPlate) piece(c, poly([27, 20.4, 35, 20.2, 35, 23.2, 27, 23.4]), Array.isArray(S.bandPlate) ? S.bandPlate : METAL.steel, 'metal', { s: 1, hl: 1 });
    if (S.bandGem) piece(c, ell(31, 21.8, 1.3, 1.3), rp(S.bandGem), 'acc', { s: 0, hl: 1 });
  },
  hood(c) { hoodFront(c, rp(c.S.hood || '#f0eef4', { coolHue: 235 })); if (c.S.hoodTrim) HEAD._trim(c); },
  _trim(c) { // 兜帽金边 + 额饰
    const g = METAL.gold;
    c.p.line([19, 41, 18.8, 25, 23.8, 15.5, 31, 13.4, 38.4, 15.4, 43.6, 25, 43.6, 41], c.p.objs.length - 1, 4, true);
  },
  mitre(c) {
    const { p } = c;
    const w = c.S.mitre ? rp(c.S.mitre) : rp('#f2eef4', { coolHue: 240 });
    const m = piece(c, blob([19.5, 23, 20, 12, 25, -1, 31, -6, 37, -1, 42, 12, 42.5, 23, 31, 21], 0.9), w, 'hat', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.2 });
    const g = METAL.gold;
    piece(c, blob([19.3, 19.5, 31, 17.5, 42.7, 19.5, 42.8, 23.4, 31, 21.5, 19.2, 23.6]), g, 'metal', { s: 1, hl: 1 });
    piece(c, poly([29.5, 0, 32.5, 0, 32.5, 18, 29.5, 18]), g, 'metal', { s: 1, hl: 1 });
    piece(c, union(rect(29.5, 5, 3, 8), rect(27.5, 7, 7, 3)), rp('#c02838'), 'acc', { s: 1, hl: 1 });
    p.cast('hat', 'skin', 0, 1, 2, 3); p.cast('metal', 'skin', 0, 1, 2, 3);
  },
  tiara(c) {
    const { p } = c;
    const g = METAL.gold;
    const b = piece(c, blob([20, 19.5, 31, 17, 42.5, 19.5, 42.5, 21.5, 31, 19.4, 20, 21.6]), g, 'metal', { s: 1, hl: 1 });
    piece(c, poly([28.5, 18.5, 31, 13, 33.5, 18.5, 31, 20.5]), g, 'metal', { s: 1, hl: 1 });
    const j = piece(c, ell(31, 17.6, 1.4, 1.6), rp('#e02a5a'), 'acc', { s: 0, hl: 1 });
    // 两侧垂饰
    for (const x of [20.4, 42.4]) {
      piece(c, rect(x - 0.5, 21, 1.2, 9), g, 'metal', { s: 0, hl: 1 });
      piece(c, ell(x + 0.1, 31.5, 1.3, 1.7), rp('#20b0a0'), 'acc', { s: 0, hl: 1 });
    }
    // 发簪
    piece(c, lock(40, 14, 49, 6, 1, 0, 0.6), g, 'metal', { s: 0, hl: 1 });
    piece(c, ell(41, 13.5, 2.2, 2), rp('#e02a5a'), 'acc', { s: 1, hl: 1 });
  },
  tricorne(c) {
    const { p } = c;
    const old = TF; if (TF) TF = [TF[0], TF[1], TF[2] + 3 / (1 - TF[0])]; // 帽子整体下移 3px
    const hp = rp(c.S.hat || '#2a2440');
    piece(c, blob([21, 12, 24, 3, 31, 0.5, 38, 3, 41, 12]), hp, 'hat', { s: 2, hl: 1 });
    const brim = piece(c, blob([5, 6, 12, 13, 21, 18.5, 31, 21.6, 41, 18.5, 50, 13, 57, 6, 52, 6.5, 44, 8, 38, 5.6, 31, 7.4, 24, 5.6, 18, 8, 10, 6.5], 0.9), hp, 'hat', { s: 2, d: 1, hl: 1, dy: 1, dx: 0.4 });
    p.line([5.5, 7, 12, 12.6, 21, 18, 31, 21, 41, 18, 50, 12.6, 56.5, 7], brim, 5, true);
    p.line([10, 8, 20, 10.5, 31, 12.5], brim, 2, true); p.line([31, 12.5, 42, 10.5, 52, 8], brim, 1, true);
    if (c.S.hatTrim) p.fill(ring(blob([5, 6, 12, 13, 21, 18.5, 31, 21.6, 41, 18.5, 50, 13, 57, 6, 52, 6.5, 44, 8, 38, 5.6, 31, 7.4, 24, 5.6, 18, 8, 10, 6.5], 0.9), blob([6.6, 6.8, 12.6, 12, 21, 17.2, 31, 20.2, 41, 17.2, 49.4, 12, 55.4, 6.8, 52, 7.8, 44, 9.2, 38, 6.9, 31, 8.6, 24, 6.9, 18, 9.2, 10, 7.8], 0.9)), p.obj(c.S.hatTrim, 'metal'), 4);
    if (c.S.hatFeather !== false) {
      const f = piece(c, lock(27, 7, 10, 0, 3, 3, 0.5), rp(c.S.hatFeather || '#e8e0d0'), 'feather', { s: 1, hl: 1 });
      p.line([27, 7, 18, 2.5, 11, 0.5], f, 2, true);
      if (c.S.hatPlume) { const f2 = piece(c, lock(29, 6, 14, -6, 3.4, 4, 0.5), rp(c.S.hatPlume), 'feather', { s: 1, hl: 1 }); p.line([29, 6, 21, -1.5, 15, -5], f2, 2, true); }
    }
    TF = old;
    p.cast('hat', ['skin', 'hair'], 0, 1, 2, 3); p.cast('hat', ['skin', 'hair'], 0, 2, 2, 3);
  },
  feathers(c) { // 戴薇拉：鹰羽头饰
    const { p } = c;
    const fp = rp('#f0e8dc'), tip = rp('#5a3a22');
    const all = { 3: [[26, 17, 18, 4, 2.4, 1.5], [33, 16, 35, 2, 2.4, -1], [39, 18, 48, 6, 2.4, -2]],
      5: [[24, 18, 12, 4, 2.6, 2], [28, 16, 22, -2, 2.6, 1], [33, 16, 35, -3, 2.6, -1], [38, 17, 47, 1, 2.6, -2], [41, 19, 53, 9, 2.6, -2]],
      7: [[22, 19, 7, 9, 2.8, 2], [24, 18, 12, 0, 2.8, 2], [28, 16, 21, -5, 2.8, 1], [33, 16, 35, -6, 2.8, -1], [38, 17, 49, -3, 2.8, -2], [41, 19, 56, 5, 2.8, -2], [43, 21, 58, 15, 2.6, -2]] };
    const list = all[c.S.featherN || 5];
    for (const l of list) {
      const f = piece(c, lock(...l), fp, 'feather', { s: 1, hl: 1, dy: 0.3 });
      p.shade(ell(l[2] + (l[0] - l[2]) * 0.18, l[3] + (l[1] - l[3]) * 0.18, 3, 3), f, 1);
      p.line([l[0], l[1], (l[0] + l[2]) / 2, (l[1] + l[3]) / 2], f, 2, true);
    }
    const b = piece(c, blob([19.4, 20.5, 31, 18.6, 43.4, 20, 43.4, 23.4, 31, 22.2, 19.4, 24]), c.S.featherBand || rp('#b02a2a'), 'acc', { s: 1, hl: 1 });
    if (c.S.featherGems !== false) for (const x of [24, 31, 38]) piece(c, ell(x, 21.3, 1.2, 1.2), rp('#30b0b0'), 'acc', { s: 0, hl: 1 });
    if (c.S.featherBand && c.S.featherGems !== false) { const g = piece(c, ell(31, 19.6, 2.2, 2.4), rp('#30b0b0'), 'acc', { s: 1, hl: 1 }); p.px(30.5, 18.6, g, 5); }
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  plumeHelm(c) { // 韩凯蒂：开面盔 + 羽饰
    const { p, S } = c;
    const mt = S.helmMetal || METAL.silver;
    const pl = rp(S.plume || '#d82a3a');
    if (S.plume !== false) piece(c, union(lock(31, 9, 52, 4, 3.5, -3, 1), lock(33, 8, 56, 14, 3.5, -2, 1), lock(35, 9, 54, 22, 3, -1, 1)), pl, 'plume', { s: 2, hl: 1 });
    if (S.helmWings) for (const d of [-1, 1]) { const x0 = d < 0 ? 19 : 43.5; for (let i = 0; i < 3; i++) piece(c, lock(x0, 20 - i * 2.2, x0 + d * (12 - i * 2), 13 - i * 6, 3 - i * 0.4, d * 1.5, 0.4), rp(S.helmWings), 'wing', { s: 1, hl: 1 }); }
    if (S.helmHorns) piece(c, union(lock(20, 15, 8, 1, 3.2, 3, 0.3), lock(42, 14, 53, -1, 3.2, -3, 0.3)), rp(S.helmHorns), 'horn', { s: 2, hl: 1 });
    const h = piece(c, ring(blob([17.5, 30, 18, 15, 24, 8, 31, 6, 39, 8, 45, 15, 45.5, 30, 42.5, 33, 42.5, 22, 38, 19.5, 31, 19, 24, 19.6, 20, 22, 20, 33]), new Path2D()), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    piece(c, blob([18, 22, 31, 18, 45, 22, 45, 24.5, 31, 21, 18, 24.5]), S.helmBand || METAL.gold, 'metal', { s: 1, hl: 1 });
    piece(c, poly([29.5, 6.5, 32.5, 6.5, 32.5, 19, 29.5, 19]), S.helmRidge || mt, 'metal', { s: 1, hl: 1 });
    if (S.helmGem) { const g = piece(c, ell(31, 20.2, 1.8, 1.8), rp(S.helmGem), 'acc', { s: 0, hl: 1 }); p.px(30.5, 19.4, g, 5); }
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3);
  },
  kettle(c) { // 士兵铁盔（护鼻）
    const { p, S } = c;
    const mt = S.metal || METAL.steel;
    const h = piece(c, blob([17.5, 31, 17.6, 18, 23, 9.5, 31, 7, 39.5, 9.5, 45, 18, 45.4, 31, 42.6, 33, 42.4, 25, 31, 22, 21, 24.5, 20.4, 34]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    piece(c, blob([16.5, 23, 31, 19.5, 46, 23, 46, 26, 31, 23, 16.5, 26.4]), mt, 'metal', { s: 1, hl: 1 });
    if (S.nasal !== false) piece(c, poly([33, 22, 35.5, 22, 35.4, 37, 34, 38.5, 33, 37]), mt, 'metal', { s: 1, hl: 1 });
    p.line([31, 8, 31, 20], h, 4, true);
    if (S.crest) piece(c, union(lock(30, 8, 45, 0, 3.4, -3, 1.6), lock(28, 9, 20, 0, 2.6, 2, 1)), rp(S.crest), 'plume', { s: 1, hl: 1 });
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3); p.cast('metal', ['skin'], 1, 2, 1, 2);
  },
  fullHelm(c) { // 全覆盖头盔（骑士 / 黑骑士）
    const { p, S } = c;
    const mt = S.metal || METAL.steel;
    if (S.horns) { piece(c, union(lock(20, 16, 6, 2, 3.4, 4, 0.4), lock(42, 16, 54, 1, 3.4, -4, 0.4)), rp(S.horns), 'horn', { s: 2, hl: 1 }); }
    if (S.crest) piece(c, union(lock(30, 6, 48, -2, 3.6, -3, 1.6), lock(31, 6, 50, 10, 3, -2, 1)), rp(S.crest), 'plume', { s: 1, hl: 1 });
    const h = piece(c, blob([16, 34, 16.5, 16, 23, 6, 31, 4, 40, 6, 46, 16, 46.5, 34, 44, 46, 37, 50.5, 31, 51, 24, 49, 18, 43]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    // 面甲 + 眼缝
    piece(c, blob([20, 28, 31, 26.5, 44, 28, 43.5, 46, 37, 50, 31, 50.5, 25, 48.5, 20.5, 44]), mt, 'metal', { s: 2, d: 0, hl: 1, dx: 1, dy: 0.3 });
    const slit = p.add(poly([21, 31.2, 31.5, 31, 44, 31.2, 44, 33.2, 31.5, 33, 21, 33.4]), ['#000000', '#05050a', '#0a0a10', '#0e0e16', '#1a1a24', '#2a2a36'], 'slit');
    p.line([33.5, 34, 33.5, 49.5], h, 2, true);
    for (const y of [37, 40, 43]) { p.line([25, y, 31, y + 0.3], h, 1, true); p.line([36, y + 0.3, 41, y], h, 1, true); }
    if (S.eyeGlow) { const g = p.obj(['#400000', '#ff6040', '#ff2020', '#ffb080', '#ffe0c0', '#ffffff'], 'glow', { ol: false }); p.px(25, 32, g, 2); p.px(26, 32, g, 3); p.px(37, 32, g, 2); p.px(38, 32, g, 3); }
  },
  kabuto(c) { // 武士盔：碗形盔体 + 吹返 + 锹形前立
    const { p, S } = c;
    const mt = rp(S.helm || '#2a2a3a');
    const bowl = piece(c, blob([17, 25, 18, 14, 24, 7, 31, 5, 38, 7, 44, 14, 45, 25, 31, 22]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    for (const x of [22, 26.5, 31, 35.5, 40]) p.line([31 + (x - 31) * 0.5, 6, x, 14, x + (x - 31) * 0.1, 22], bowl, 2, true);
    piece(c, blob([16, 23, 31, 20, 46, 23, 46.5, 26.5, 31, 24, 15.5, 26.5]), mt, 'metal', { s: 1, d: 0, hl: 1, dy: 1, dx: 0.3 });
    piece(c, poly([12.5, 23, 19, 22.5, 19.5, 31, 12, 28.5]), mt, 'metal', { s: 1, hl: 1 });
    piece(c, poly([43.5, 22.5, 50, 23, 50.5, 28.5, 43, 31]), mt, 'metal', { s: 2, hl: 1 });
    for (const [x0, x1] of [[13, 19], [44, 50]]) p.line([x0, 25.5, x1, 25.5], 'metal', 4, true);
    const kw = S.kuwa;
    if (kw === 'small') piece(c, union(lock(31, 17, 23, 7, 1.6, 1.5, 0.4), lock(31, 17, 39, 7, 1.6, -1.5, 0.4)), METAL.gold, 'acc', { s: 1, hl: 1 });
    else if (kw === 'big' || kw === 'grand') {
      piece(c, union(lock(31, 17, 12, -6, 2.6, 4, 0.5), lock(31, 17, 50, -6, 2.6, -4, 0.5)), METAL.gold, 'acc', { s: 1, hl: 1 });
      if (kw === 'grand') { const sun = piece(c, ell(31, 9, 5.2, 5.2), rp('#d8281e'), 'acc', { s: 1, d: 0, hl: 1 }); piece(c, ring(ell(31, 9, 6.4, 6.4), ell(31, 9, 5.2, 5.2)), METAL.gold, 'acc', { s: 0, hl: 1 }); piece(c, poly([30, 14, 32, 14, 32.5, 18, 29.5, 18]), METAL.gold, 'acc', { s: 0, hl: 1 }); }
    } else if (kw !== 'none') piece(c, union(lock(31, 17, 18, 0, 1.8, 2.5, 0.4), lock(31, 17, 44, 0, 1.8, -2.5, 0.4)), METAL.gold, 'acc', { s: 1, hl: 1 });
    if (kw !== 'none') piece(c, ell(31, 17.5, 2.6, 2.6), METAL.gold, 'acc', { s: 1, hl: 1 });
    if (S.kabutoMon) piece(c, ell(31, 17.5, 1.3, 1.3), rp(S.kabutoMon), 'acc', { s: 0, hl: 1 });
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3); p.cast('metal', ['skin', 'hair'], 0, 2, 2, 3);
  },
  hawkHelm(c) { // 鹰首盔
    const { p, S } = c;
    const mt = rp(S.helm || '#8a5a2a'), beak = rp('#e8b030');
    piece(c, union(lock(38, 9, 55, 2, 3, -2, 0.4), lock(41, 13, 58, 11, 3, -1, 0.4), lock(42, 18, 57, 21, 2.6, 0, 0.4)), rp('#f0e8d8'), 'feather', { s: 1, hl: 1 });
    piece(c, blob([16.5, 28, 17.5, 15, 24, 7.5, 32, 6, 40, 8.5, 45.5, 16, 46, 28, 42, 25, 31, 22.5, 20, 25]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    piece(c, blob([19, 21, 31, 17.5, 43, 21, 43, 24, 31, 21, 19, 24]), rp('#f0e8d8'), 'feather', { s: 1, hl: 1 });
    const b = piece(c, blob([25, 19, 31, 16.5, 37, 19, 35.5, 25, 32.5, 30.5, 31, 31, 29, 26]), beak, 'beak', { s: 2, d: 1, hl: 1 });
    p.line([28, 22, 31, 23.5, 34.5, 22], b, 1, true);
    for (const x of [23.5, 39]) { const e = p.obj(['#300000', '#a01010', '#ff2020', '#ff6040', '#ffb090', '#ffffff'], 'glow', { ol: false }); p.px(x, 15, e, 2); p.px(x + 1, 15, e, 3); }
    p.cast(['metal', 'beak'], ['skin', 'hair'], 0, 1, 2, 3); p.cast(['metal', 'beak'], ['skin', 'hair'], 0, 2, 2, 3);
  },
  crown(c) {
    const { p } = c;
    const g = METAL.gold;
    piece(c, poly([19.5, 21, 18.5, 9, 23, 15, 26.5, 5, 31, 13, 35.5, 5, 39, 15, 43.5, 9, 42.5, 21, 31, 19]), g, 'metal', { s: 2, d: 1, hl: 1, dx: 1, dy: 0.3 });
    piece(c, blob([19.2, 17.5, 31, 15.8, 42.8, 17.5, 42.8, 21.5, 31, 19.8, 19.2, 21.6]), g, 'metal', { s: 1, hl: 1 });
    for (const [x, col] of [[25, '#2060d0'], [31, '#d02030'], [37, '#20a060']]) piece(c, ell(x, 18.6, 1.3, 1.2), rp(col), 'acc', { s: 0, hl: 1 });
    for (const [x, y] of [[18.5, 9], [26.5, 5], [35.5, 5], [43.5, 9]]) piece(c, ell(x, y, 1.2, 1.2), METAL.gold, 'acc', { s: 0, hl: 1 });
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3);
  },
  bandana(c) {
    const { p, S } = c;
    const pal = rp(S.band || '#a03a2a');
    const b = piece(c, blob([18.8, 25, 19.5, 15, 26, 9, 31, 8, 37, 9, 43, 15, 44, 24, 31, 21.6]), pal, 'acc', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.5 });
    piece(c, union(lock(19, 22, 9, 30, 2.4, 1, 1.4), lock(19.5, 23, 12, 36, 2, 2, 1)), pal, 'acc', { s: 1, hl: 1 });
    for (const [x, y] of [[25, 14], [31, 12], [37, 15], [28, 18], [35, 19]]) p.spx(x, y, b, 4);
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  turban(c) {
    const { p, S } = c;
    const pal = rp(S.band || '#d8c8a0');
    const b = piece(c, blob([17.5, 25, 18, 14, 24, 7, 31, 5.5, 38, 7, 44, 14, 45, 25, 31, 22]), pal, 'acc', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.5 });
    for (const l of [[19, 20, 26, 10, 36, 7], [19, 24, 28, 15, 42, 11], [24, 22, 34, 16, 44.5, 18]]) p.line(l, b, 2, true);
    // 面巾
    const m = piece(c, blob([20, 39, 31, 37, 42.5, 37, 42, 46, 35, 51, 27, 50, 21, 45]), pal, 'acc', { s: 2, hl: 1 });
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  hoodShadow(c) { // 法师/术士兜帽（脸部阴影）
    const { p, S } = c;
    const id = hoodFront(c, rp(S.hood || '#4a2a6a'), [19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49]);
    if (S.faceShadow) { p.shade(blob([18, 20, 31, 16, 45, 20, 45, 31, 31, 29, 18, 31]), ['skin', 'hair'], 1); p.shade(blob([18, 28, 31, 25, 45, 28, 45, 34, 31, 32, 18, 34]), ['skin'], 2, t => t > 2); }
  },
  mask(c) { // 刘队长：银色半面具
    const { p } = c;
    const mt = METAL.silver;
    const m = piece(c, blob([18.5, 27.5, 24, 25.6, 31, 26.4, 38, 25.6, 44, 27.5, 43.5, 35, 37.5, 37.6, 33.5, 36, 31, 39, 28.5, 36, 23.5, 37.4, 19, 34.5]), mt, 'metal', { s: 2, d: 1, hl: 2, dx: 1, dy: 0.5 });
    const k = p.add(union(poly([22, 30.3, 28.6, 31.4, 28, 33.2, 22.6, 32.2]), poly([34.4, 31.2, 40.6, 30.2, 40, 32.2, 35, 33])), ['#000000', '#000000', '#0a0a14', '#0a0a14', '#202030', '#303040'], 'slit');
    const g = p.obj(['#003040', '#60e0ff', '#a0f0ff', '#e0ffff', '#ffffff', '#ffffff'], 'glow', { ol: false }); p.px(26, 32, g, 2); p.px(37, 32, g, 2);
    p.line([20, 28.6, 31, 27.4, 42.8, 28.6], m, 4, true);
    p.cast(m, 'skin', 0, 1, 2, 3);
  },
  glasses(c) {
    const { p, F } = c;
    const fr = rp('#8a4a2a');
    const ey = F.ey, id = p.obj(fr, 'acc', { ol: false });
    p.fill(ring(ell(F.nx + 4, ey + 2.6, 4.7, 3.7), ell(F.nx + 4, ey + 2.6, 3.6, 2.6)), id, 2);
    p.fill(ring(ell(F.fx + 3, ey + 2.6, 3.9, 3.7), ell(F.fx + 3, ey + 2.6, 2.8, 2.6)), id, 2);
    p.fill(rect(F.nx + 8.5, ey + 1.4, F.fx - F.nx - 8.4, 1), id, 2);
    p.px(F.nx + 7, ey + 1, id, 5); p.px(F.nx + 6, ey + 0, id, 5); p.px(F.fx + 5, ey + 1, id, 5);
  },
  halo(c) { const g = METAL.gold; piece(c, ring(ell(31, 6, 10, 2.6), ell(31, 6, 8, 1.4)), g, 'acc', { s: 1, hl: 1 }); },
};

// =====================================================================
// 角色设定
// =====================================================================
const ELEM = {
  earth: { robe: '#8a6232', trim: '#4a3418', bead: '#c8a050', paint: '#c87830', skin: 'tan', hat: '#6a4a22', gem: '#e0b030' },
  wood: { robe: '#2e7a3a', trim: '#1a4a22', bead: '#a0d060', paint: '#40a040', skin: 'warm', hat: '#2a5a2a', gem: '#80e040' },
  water: { robe: '#2a5aa8', trim: '#18306a', bead: '#80c8f0', paint: '#3a80d0', skin: 'pale', hat: '#20407a', gem: '#60d0ff' },
  fire: { robe: '#b0301c', trim: '#5a140e', bead: '#f0a030', paint: '#e04020', skin: 'warm', hat: '#7a1a10', gem: '#ffb020' },
  metal: { robe: '#8a8a9a', trim: '#40404e', bead: '#e0e0f0', paint: '#9090a0', skin: 'grey', hat: '#5a5a6a', gem: '#f0f0ff' },
};
const VCOL = { red: '#b02a2a', blue: '#2a4ab0', black: '#2a2a3a', green: '#2a7a3a', earth: '#8a6232', wood: '#2e7a3a', water: '#2a5aa8', fire: '#c03a1a', metal: '#8a8a9a', white: '#d8d8e0', gold: '#c8a030', purple: '#6a2a8a' };

function quiver(c) {
  const { p } = c;
  piece(c, poly([45, 46, 51, 42, 61, 60, 55, 65]), rp('#7a4a22'), 'cloth', { s: 2, hl: 1 });
  for (const [x, y] of [[45, 40], [48.5, 38], [52, 39]]) {
    p.add(poly([x + 1.4, y + 4, x + 2.4, y + 4, x + 5.4, y + 12, x + 4.4, y + 12]), rp('#c8a070'), 'acc');
    piece(c, union(poly([x, y, x + 2, y + 1, x + 2.4, y + 6, x + 0.6, y + 4.5]), poly([x + 2, y + 1, x + 4, y + 0.4, x + 3.6, y + 4.5, x + 2.4, y + 6])), rp('#d84a3a'), 'feather', { s: 1, hl: 1 });
  }
  p.line([45.5, 47, 51.5, 43], 'cloth', 5, true);
}
function bow(c) {
  const { p } = c;
  const pts = [], inner = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = -PI * 0.42 + t * PI * 0.84; const x = 44 + Math.cos(a) * 15, y = 46 + Math.sin(a) * 26; const w = 1.6 - Math.abs(t - 0.5) * 1.8; pts.push(x + w, y); inner.unshift(x - w, y); }
  piece(c, poly(pts.concat(inner)), rp('#9a5a24'), 'acc', { s: 1, hl: 1 });
  p.line([44 + Math.cos(-PI * 0.42) * 15, 46 + Math.sin(-PI * 0.42) * 26, 44 + Math.cos(PI * 0.42) * 15, 46 + Math.sin(PI * 0.42) * 26], p.add(rect(0, 0, 0, 0), ['#202020', '#5a5a60', '#7a7a80', '#9a9aa0', '#c0c0c8', '#e0e0e8'], 'string', { ol: false }), 2);
  piece(c, rect(57, 43, 3, 6), rp('#5a2a1a'), 'acc', { s: 0, hl: 1 });
}
function wings(c, col, sc, n) {
  const { p } = c;
  const fp = rp(col || '#8a5a32'), tip = rp('#f0e6d6');
  sc = sc || 1; n = n || 6;
  for (const [sx, dir] of [[15, -1], [48, 1]]) {
    for (let i = 0; i < n; i++) {
      const a = -PI / 2 + dir * (0.18 + i * 0.2 * 6 / n), L = (30 - i * 2.5 * 6 / n) * sc;
      const tx = sx + Math.cos(a) * L, ty = 58 + Math.sin(a) * L;
      const id = piece(c, lock(sx, 58, tx, ty, 3.6, dir * 2, 0.4), i % 2 ? fp : rp(col ? mix(col, '#000000', 0.15) : '#7a4a2a'), 'wing', { s: 2, d: 0, hl: 1 });
      p.shade(ell(tx - Math.cos(a) * 3, ty - Math.sin(a) * 3, 3.5, 3.5), id, 4);
    }
  }
}
function sword(c, x, y, blade, guard) {
  const { p } = c;
  const dx = -0.32, dy = 1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const P = (t, n) => [x + ux * t + nx * n, y + uy * t + ny * n];
  const q = (...a) => poly([].concat(...a));
  piece(c, q(P(8.5, -1.5), P(8.5, 1.5), P(40, 1.5), P(40, -1.5)), blade || METAL.steel, 'metal', { s: 1, hl: 1 });
  piece(c, q(P(1.5, -1), P(1.5, 1), P(7.5, 1), P(7.5, -1)), rp('#5a2a1a'), 'acc', { s: 1, hl: 0 });
  for (let t = 2.5; t < 7.5; t += 2) p.line([...P(t, -1), ...P(t + 0.7, 1)], 'acc', 2, true);
  const gw = guard ? 6.2 : 4.6;
  piece(c, q(P(7.2, -gw), P(7.2, gw), P(9, gw), P(9, -gw)), guard || METAL.gold, 'metal', { s: 0, hl: 1 });
  if (guard) for (const n of [-gw, gw]) piece(c, ell(...P(7.4, n), 1.5, 1.5), guard, 'metal', { s: 0, hl: 1 });
  piece(c, ell(...P(0, 0), 1.8, 1.8), guard || METAL.gold, 'metal', { s: 0, hl: 1 });
}
// 神巫头冠
function shamanHat(c) {
  const { p, S } = c; const e = S.el, k = S.elKey;
  const hp = rp(e.hat), g = METAL.gold;
  let shape;
  if (k === 'earth') shape = union(blob([18, 22, 19, 9, 31, 4, 43, 9, 44, 22, 31, 20]), lock(21, 12, 10, 0, 3, 3, 0.4), lock(41, 12, 52, 0, 3, -3, 0.4));
  else if (k === 'wood') shape = union(blob([18, 22, 19, 11, 31, 7, 43, 11, 44, 22, 31, 20]), lock(24, 12, 16, -1, 3.4, 2.5, 0.2), lock(31, 9, 31, -5, 3.4, 0, 0.2), lock(38, 12, 46, -1, 3.4, -2.5, 0.2));
  else if (k === 'water') shape = union(blob([18, 22, 19, 10, 31, 5, 43, 10, 44, 22, 31, 20]), lock(31, 8, 50, -2, 4, -4, 0.3), lock(24, 12, 12, 6, 3, 2, 0.3));
  else if (k === 'fire') shape = union(blob([18, 22, 19, 11, 31, 7, 43, 11, 44, 22, 31, 20]), lock(22, 14, 18, 0, 3, 1, 0), lock(27, 11, 26, -4, 3, -1, 0), lock(33, 10, 36, -5, 3, 1, 0), lock(39, 13, 45, 0, 3, -1, 0));
  else shape = union(blob([18, 22, 19, 10, 31, 4, 43, 10, 44, 22, 31, 20]), poly([22, 12, 18, -2, 27, 9]), poly([29, 8, 31, -6, 33, 8]), poly([35, 9, 44, -2, 40, 12]));
  const h = piece(c, shape, hp, 'hat', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.4 });
  piece(c, blob([18.4, 18.6, 31, 16.6, 43.6, 18.6, 43.6, 22.4, 31, 20.4, 18.4, 22.6]), g, 'metal', { s: 1, hl: 1 });
  const gm = piece(c, ell(31, 15, 2.2, 2.4), rp(e.gem), 'acc', { s: 1, hl: 1 }); p.px(30, 14, gm, 5);
  p.cast(['hat', 'metal'], ['skin', 'hair'], 0, 1, 2, 3); p.cast(['hat', 'metal'], ['skin', 'hair'], 0, 2, 2, 3);
}
function facePaint(c) {
  const { p, F, S } = c;
  const id = p.obj(rp(S.el.paint), 'paint', { ol: false });
  for (const [x, y] of [[F.nx + 1, F.ey + 6], [F.nx + 3, F.ey + 7], [F.nx + 5, F.ey + 6]]) { p.px(x, y, id, 3); p.px(x, y + 1, id, 2); }
  p.px(F.fx + 3, F.ey + 6, id, 2); p.px(F.fx + 3, F.ey + 7, id, 2);
  p.line([31, 22, 31, 26], id, 3);
}

const HERO_SPECS = {
  mengqi: { face: 'm', skin: 'fair', hair: '#2a1c24', hairStyle: 'messy', iris: '#7a4a28', eyes: 'hero', brow: 'normal', mouth: 'smile', body: 'jacket', cloth: '#b47c40', scarf: '#cc262a' },
  yangtie: { face: 'm', skin: 'fair', hair: '#9a4416', hairStyle: 'neat', iris: '#2e62a8', eyes: 'hero', brow: 'stern', mouth: 'neutral', body: 'lightArmor', cloth: '#2c5aa0' },
  klein: { face: 'broad', skin: 'tan', hair: '#a8581a', hairStyle: 'wild', iris: '#5a3a1a', eyes: 'sharp', brow: 'stern', thickBrow: true, mouth: 'grin', body: 'vest', cloth: '#6a4428', head: 'headband', band: '#d03a2a', bandPlate: true, beard: 'stubble' },
  slade: { face: 'man', skin: 'warm', hair: '#2a2a3c', hairStyle: 'tied', iris: '#3a3040', eyes: 'stern', brow: 'stern', mouth: 'stern', nose: 'long', body: 'samurai', cloth: '#2a2e4a', armor: '#8a2228' },
  oz: { face: 'm', skin: 'fair', hair: '#e4bc44', hairStyle: 'spiky', iris: '#2a8a5a', eyes: 'hero', brow: 'raised', mouth: 'open', body: 'strap', cloth: '#2e7a6a', back: c => sword(c, 52, 36) },
  xueer: { face: 'f', skin: 'fair', hair: '#f4d474', hairStyle: 'bob', iris: '#3a7ad8', eyes: 'girl', brow: 'soft', mouth: 'grin', blush: true, body: 'priestRobe', headBack: 'hood', head: 'hood', hood: '#f0eef6', trim: '#3a5ab8' },
  judy: { face: 'f', skin: 'fair', hair: '#c8442a', hairStyle: 'ponytail', iris: '#3a8a3a', eyes: 'girl', brow: 'normal', mouth: 'smile', blush: true, body: 'archer', cloth: '#3a7a3a', back: bow },
  wushuang: { face: 'f', skin: 'pale', hair: '#1a1626', hairStyle: 'hime', iris: '#7a3aa0', eyes: 'girl', brow: 'soft', mouth: 'lips', body: 'princess', cloth: '#8a2a5a', trim: '#30206a', head: 'tiara', earring: true },
  qu: { face: 'old', skin: 'old', hair: '#e8e8ee', hairStyle: 'sides', iris: '#4a5a6a', eyes: 'kind', brow: 'worried', thickBrow: true, mouth: 'neutral', nose: 'big', beard: 'long', body: 'highPriest', trim: '#a82a3a', head: 'mitre', lines: c => oldLines(c, true) },
  hao: { face: 'man', skin: 'pale', hair: '#4a2a6a', hairStyle: 'short', iris: '#d0a820', eyes: 'sharp', brow: 'stern', mouth: 'smirk', body: 'sorcerer', cloth: '#4a2a6a', headBack: 'hood', head: 'hoodShadow', hood: '#5a2e7a', faceShadow: true },
  lian: { face: 'f', skin: 'fair', hair: '#e47ab4', hairStyle: 'wavy', iris: '#3a6ad0', eyes: 'girl', brow: 'soft', mouth: 'small', blush: true, body: 'mageRobe', cloth: '#2a4aa0', acc: 'glasses' },
  dvra: { face: 'f', skin: 'tan', hair: '#8a5226', hairStyle: 'wildLong', iris: '#d08a20', eyes: 'girl', brow: 'stern', mouth: 'smirk', body: 'hawk', cloth: '#6a4a2a', head: 'feathers', back: c => wings(c, '#7a5030'), earring: true },
  kampeite: { special: 'wolfHero' },
  liu: { face: 'man', skin: 'warm', hair: '#1e1e2c', hairStyle: 'shaggy', eyes: 'none', mouth: 'stern', body: 'cloak', cloth: '#262636', head: 'mask', back: c => sword(c, 53, 35) },
  lala: { special: 'babyDragon' },
  kaidi: { face: 'f', skin: 'fair', hair: '#f29a3a', hairStyle: 'bob', iris: '#2a6a9a', eyes: 'girl', brow: 'stern', mouth: 'smirk', body: 'plate', cape: '#c02a3a', head: 'plumeHelm', plume: '#e03040' },
  hake: { face: 'broad', skin: 'tan', hair: '#5a3a1a', hairStyle: 'shaggy', iris: '#3a5a6a', eyes: 'sharp', brow: 'raised', thickBrow: true, mouth: 'grin', nose: 'big', beard: 'full', body: 'coat', cloth: '#2a3a6a', head: 'tricorne', hat: '#2a2440',
    scar: c => { c.p.line([c.F.fx + 1, c.F.ey - 3, c.F.fx + 4, c.F.ey + 6], c.face, 1, true); } },
  augustus: { face: 'man', skin: 'warm', hair: '#c4c6d4', hairStyle: 'mane', iris: '#3a6ab0', eyes: 'sharp', brow: 'stern', thickBrow: true, mouth: 'neutral', nose: 'long', body: 'plate', metal: METAL.gold, cape: '#b02a2a', emblem: '#c02030', torso: 'broad' },
  zhangqing: { face: 'old', skin: 'old', hair: '#ececf2', hairStyle: 'sage', iris: '#3a3a4a', eyes: 'stern', brow: 'stern', thickBrow: true, mouth: 'neutral', nose: 'long', beard: 'long', body: 'master', cloth: '#3a4a6a', lines: c => oldLines(c, false), back: c => sword(c, 53, 34) },
};

// 敌方人类兵种
function enemyHuman(kind, v) {
  const vc = VCOL[v];
  const S = {
    soldier: { face: 'man', skin: 'warm', hair: '#4a3020', eyes: 'sharp', brow: 'stern', mouth: 'stern', body: 'soldier', cloth: vc || '#a82a2a', head: 'kettle' },
    captain: { face: 'man', skin: 'warm', hair: '#3a2418', eyes: 'sharp', brow: 'angry', thickBrow: true, mouth: 'stern', nose: 'long', beard: 'mustache', body: 'soldier', cloth: vc || '#a82a2a', head: 'kettle', nasal: false, crest: '#d82a2a', metal: METAL.steel, back: c => piece(c, blob([-1, 74, 0, 60, 8, 54, 54, 54, 64, 60, 65, 74]), rp(vc || '#8a1a20'), 'cloth', { s: 2, hl: 1 }) },
    swordsman: { face: 'm', skin: 'warm', hair: '#5a3a20', hairStyle: 'short', eyes: 'sharp', brow: 'stern', mouth: 'stern', body: 'strap', cloth: vc || '#8a3a2a', trim: '#c8b890', back: c => sword(c, 52, 36) },
    archer: { face: 'm', skin: 'warm', hair: '#4a3020', hairStyle: 'short', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'archer', cloth: vc || '#5a6a2a', headBack: 'hood', head: 'hoodShadow', hood: '#4a5a2a', back: quiver },
    crossbow: { face: 'man', skin: 'warm', hair: '#4a3020', eyes: 'sharp', brow: 'stern', mouth: 'frown', body: 'rags', cloth: vc || '#7a5a3a', trim: '#5a3a1c', strap: true, head: 'kettle', nasal: false },
    knight: { face: 'man', skin: 'warm', eyes: 'none', mouth: 'none', nose: 'none', noEar: true, body: 'plate', cape: vc || '#a02a2a', head: 'fullHelm', crest: '#d83030' },
    darkKnight: { face: 'man', skin: 'grey', eyes: 'none', mouth: 'none', nose: 'none', noEar: true, body: 'plate', metal: METAL.black, cape: vc || '#4a1028', head: 'fullHelm', horns: '#d8d0bc', eyeGlow: true },
    fighter: { face: 'broad', skin: 'tan', hair: '#3a2a1a', hairStyle: 'bald', eyes: 'fierce', brow: 'angry', thickBrow: true, mouth: 'teeth', nose: 'big', beard: 'stubble', body: 'vest', cloth: vc || '#5a3a24', head: 'bandana', band: vc || '#8a2a2a', iris: '#4a2a1a',
      scar: c => { c.p.line([c.F.nx + 1, c.F.ey - 3, c.F.nx + 6, c.F.ey + 8], c.face, 1, true); } },
    samurai: { face: 'man', skin: 'warm', hair: '#1e1e28', eyes: 'fierce', brow: 'angry', thickBrow: true, mouth: 'frown', nose: 'long', beard: 'mustache', body: 'samurai', cloth: '#2a2a36', armor: vc || '#7a1a22', headBack: kabutoBack, head: 'kabuto', helm: '#2a2a38' },
    priest: { face: 'old', skin: 'old', hair: '#b8b8c0', eyes: 'kind', brow: 'worried', mouth: 'neutral', nose: 'big', body: 'monkRobe', cloth: '#dcd8e4', trim: vc || '#8a2a3a', headBack: 'hood', head: 'hood', hood: '#c8c4d4', lines: c => oldLines(c, false) },
    mage: { face: 'm', skin: 'fair', hair: '#3a2a4a', hairStyle: 'short', iris: '#4a3a8a', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'mageRobe', cloth: vc || '#3a3a8a', trim: '#c8c0d8', headBack: 'hood', head: 'hoodShadow', hood: vc || '#3a3a8a' },
    sorcerer: { face: 'man', skin: 'pale', hair: '#1a1a24', eyes: 'glow', iris: '#ff3a3a', brow: null, mouth: 'smirk', body: 'sorcerer', cloth: vc || '#2a1a3a', headBack: 'hood', head: 'hoodShadow', hood: vc || '#2e1a40', faceShadow: true },
    spellblade: { face: 'man', skin: 'warm', hair: '#2a2a3a', hairStyle: 'shaggy', iris: '#6a3a8a', eyes: 'sharp', brow: 'stern', mouth: 'stern', body: 'cloak', cloth: vc || '#3a2a4a', back: c => sword(c, 53, 35) },
    bandit: { face: 'broad', skin: 'tan', hair: '#3a2a1a', hairStyle: 'shaggy', iris: '#3a2a1a', eyes: 'fierce', brow: 'angry', mouth: 'grin', nose: 'big', beard: 'stubble', body: 'rags', cloth: vc || '#9a7a4a', trim: '#5a4024', strap: true, head: 'bandana', band: '#a83a2a',
      scar: c => { c.p.line([c.F.fx + 1, c.F.ey + 4, c.F.fx + 5, c.F.ey + 9], c.face, 1, true); } },
    banditRider: { face: 'man', skin: 'tan', hair: '#3a2a1a', iris: '#3a2a1a', eyes: 'fierce', brow: 'angry', mouth: 'none', nose: 'none', body: 'rags', cloth: vc || '#a88a5a', trim: '#6a4a2a', strap: true, head: 'turban', band: '#d8c8a0' },
    villager: { face: 'm', skin: 'warm', hair: '#5a3a1e', hairStyle: 'short', iris: '#5a3a1e', eyes: 'hero', brow: 'worried', mouth: 'neutral', body: 'rags', cloth: vc || '#8a7a5a', trim: '#a89870' },
    king: { face: 'old', skin: 'warm', hair: '#6a6470', hairStyle: 'mane', iris: '#8a2a1a', eyes: 'fierce', brow: 'angry', thickBrow: true, mouth: 'frown', nose: 'hook', beard: 'full', body: 'regal', cloth: vc || '#8a1a2a', head: 'crown', lines: c => oldLines(c, false), bg: BG_DARK },
  }[kind];
  return S || null;
}
function shamanSpec(v) {
  const k = ELEM[v] ? v : 'earth', e = ELEM[k];
  const base = { skin: e.skin, iris: e.gem, body: 'shamanRobe', el: e, elKey: k, head: shamanHat, eyes: 'fierce', brow: 'angry', thickBrow: true, nose: 'hook', hairStyle: 'sides' };
  const per = {
    earth: { face: 'old', hair: '#c8bca8', mouth: 'frown', beard: 'long', lines: c => { oldLines(c, true); facePaint(c); } },
    wood: { face: 'f', hair: '#24402a', hairStyle: 'hime', iris: '#60c040', eyes: 'girl', brow: 'stern', thickBrow: false, nose: 'small', mouth: 'smirk', lines: facePaint },
    water: { face: 'man', hair: '#3a4a7a', mouth: 'smirk', eyes: 'sharp', beard: 'mustache', lines: facePaint },
    fire: { face: 'broad', hair: '#c83a1a', hairStyle: 'wild', mouth: 'teeth', beard: 'stubble', nose: 'big', lines: facePaint },
    metal: { face: 'old', hair: '#e0e0e8', mouth: 'neutral', eyes: 'kind', brow: 'worried', beard: 'full', lines: c => { oldLines(c, true); facePaint(c); } },
  }[k];
  return Object.assign(base, per);
}
// =====================================================================
// 怪物与特殊角色（画面坐标，不缩放）
// =====================================================================
function rng(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; s = s || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function mp(p, path, pal, g, auto, opt) { const id = p.add(path, pal, g || 'm', opt); if (auto !== false) p.auto(id, Object.assign({ s: 2, d: 1, hl: 1, dx: 1, dy: 0.5 }, auto || {})); return id; }
const BONE = ['#2a2014', '#7a6648', '#b8a47e', '#e4d6b0', '#f6eccc', '#fffaea'];
const TOOTH = ['#3a2a20', '#9a8a70', '#d0c8b0', '#f4f0e2', '#ffffff', '#ffffff'];
const MOUTH_IN = ['#120408', '#3a0a14', '#6a1424', '#9a2a3a', '#c85060', '#f09090'];
// 怪物眼睛：椭圆 + 竖瞳 + 高光
function meye(p, cx, cy, rx, ry, col, o) {
  o = o || {};
  const pal = ramp(col, { lit: 0.5 }); pal[0] = '#100608';
  const id = p.add(ell(cx, cy, rx, ry, o.rot || 0), pal, 'eye', { ol: o.ol !== false });
  p.shade(ell(cx + rx * 0.2, cy - ry * 0.9, rx * 1.1, ry * 0.7, o.rot || 0), id, 2);
  if (o.glow) p.shade(ell(cx, cy + ry * 0.3, rx * 0.7, ry * 0.5), id, 4);
  if (o.slit) p.line([cx + 0.3, cy - ry + 0.6, cx + 0.3, cy + ry - 0.4], id, 0);
  else if (o.pupil !== false) p.fill(ell(cx + (o.px || 0.4), cy + 0.2, Math.max(0.6, rx * 0.4), Math.max(0.6, ry * 0.55)), id, 0);
  if (o.hl !== false) p.px(cx - rx * 0.35, cy - ry * 0.3, id, 5);
  return id;
}
function fang(p, x, y, len, w, dir) { return p.add(poly([x - w, y, x + w, y, x + (dir || 0) * 0.6, y + len]), TOOTH, 'tooth'); }
function fangUp(p, x, y, len, w) { return p.add(poly([x - w, y, x + w, y, x, y - len]), TOOTH, 'tooth'); }
function texture(p, target, kind, seed, dens) {
  const r = rng(seed || kind), sel = p.sel(target);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!sel[p.o[i]] || p.t[i] !== 3) continue;
    if (kind === 'scale') { if ((y % 4 === 0 && (x + (y >> 2) * 2) % 4 === 0) || (y % 4 === 1 && (x + (y >> 2) * 2) % 4 === 1)) p.t[i] = 2; }
    else if (kind === 'stone') { const v = r(); if (v < (dens || 0.07)) p.t[i] = 2; else if (v > 1 - (dens || 0.07) * 0.6) p.t[i] = 4; }
    else if (kind === 'fur') { const v = r(); if (v < (dens || 0.08)) { p.t[i] = 2; if (y + 1 < H && sel[p.o[i + W]] && p.t[i + W] === 3) p.t[i + W] = 2; } }
  }
}
function mpic() { const p = new Pic(); TF = null; return p; }
function spikes(p, pts, pal, g, w) { for (const s of pts) mp(p, lock(s[0], s[1], s[2], s[3], w || 2.6, s[4] || 0, 0.2), pal, g || 'spike', { s: 1, d: 0, hl: 1 }); }
function water(p) {
  const wp = ['#06122a', '#0e2a5a', '#18488a', '#2a6ab0', '#6aa8e0', '#d0f0ff'];
  const id = mp(p, rect(0, 64, 64, 9), wp, 'water', { s: 0, d: 0, hl: 0 });
  for (const [x, y, l] of [[2, 65, 8], [14, 67, 10], [30, 66, 8], [44, 68, 9], [52, 65, 8], [6, 70, 9], [24, 70, 12], [42, 71, 10]]) p.line([x, y, x + l / 2, y - 0.6, x + l, y], id, 4);
  for (const [x, y] of [[8, 64.5], [36, 65.5], [56, 64.5]]) p.line([x, y, x + 3, y], id, 5);
}
const DRAGON_COL = { red: '#c43c26', blue: '#2e5cc0', black: '#34303e', green: '#3a8a3a', gold: '#d0a030', white: '#d8dce8', earth: '#9a7040', wood: '#3a8a3a', water: '#2e5cc0', fire: '#d84a1a', metal: '#9a9cac', purple: '#7a3aa0' };
const vcol = (v, def, table) => (table && table[v]) || VCOL[v] || (typeof v === 'string' && /^#[0-9a-f]{3,6}$/i.test(v) ? v : def);

// 蛇头（朝右 dir=1 / 朝左 dir=-1）
function serpentHead(p, x, y, s, dir, pal, o) {
  o = o || {};
  const X = (dx) => x + dx * s * dir, Y = (dy) => y + dy * s;
  const pts = (a) => a.map((v, i) => (i % 2 ? Y(v) : X(v)));
  if (o.frill) for (let i = 0; i < 4; i++) mp(p, lock(X(-6), Y(-2 + i * 2.2), X(-15 + i), Y(-11 + i * 6), 2.2 * s, 0, 0.3), ramp(o.frill), 'fin', { s: 1, hl: 1 });
  mp(p, blob(pts([-4, 4, 4, 5, 13, 5.6, 17, 4.6, 14, 7.8, 4, 8.6, -4, 8])), MOUTH_IN, 'mouth', { s: 0, d: 0, hl: 0 });
  // 下颚
  mp(p, blob(pts([-6, 5, 6, 7.5, 15, 7.4, 16, 9, 8, 11, -4, 10.5, -8, 8])), pal, 'skin', { s: 1, hl: 0 });
  // 牙
  for (const d of [3, 11]) { const id = p.add(poly([X(d), Y(5.2), X(d + 1.6), Y(5.2), X(d + 0.8), Y(8.8)]), TOOTH, 'tooth'); }
  // 头
  const h = mp(p, blob(pts([-9, 2, -7, -5, 0, -8, 9, -7, 16, -4, 20, 0, 19, 3.5, 12, 5, 4, 5.4, -4, 6])), pal, 'skin', { s: 2, d: 1, hl: 1, dx: dir, dy: 0.6 });
  texture(p, h, 'scale', 'sh' + x);
  meye(p, X(5), Y(-3), 2.4 * s, 1.6 * s, o.eye || '#f0d020', { slit: true, rot: -0.2 * dir });
  mp(p, lock(X(1), Y(-5), X(10), Y(-5.2), 1.3 * s, -0.6 * dir), pal, 'skin', { s: 0, hl: 1 });
  p.px(X(17), Y(-1), h, 0);
  if (o.tongue) p.line([X(16), Y(6.2), X(21), Y(7), X(24), Y(5.6)], p.add(rect(0, 0, 0, 0), ['#300010', '#a02040', '#d03050', '#e04060', '#ff8090', '#ffc0c8'], 'tongue', { ol: false }), 3);
  return h;
}

const MONSTERS = {
  slime(v) {
    const p = mpic();
    const col = vcol(v, '#48b848');
    const pal = ramp(col, { lit: 0.45 });
    const b = mp(p, blob([2, 73, 4, 58, 10, 46, 18, 37, 26, 31, 30, 24, 33, 30, 40, 32, 49, 38, 56, 48, 60, 60, 62, 73]), pal, 'slime', { s: 4, d: 2, hl: 0, dx: 0.8, dy: 0.6 });
    p.shade(blob([12, 70, 16, 56, 26, 48, 40, 48, 50, 56, 52, 70]), b, 2, t => t >= 3);
    p.shade(blob([14, 46, 20, 38, 28, 34, 26, 38, 18, 46, 14, 52]), b, 4);
    p.shade(blob([18, 42, 22, 38, 25, 37, 21, 42]), b, 5);
    p.shade(ell(31, 26.5, 1, 2), b, 5);
    // 眼与嘴
    const k = ['#06120a', '#06120a', '#10261a', '#183020', '#ffffff', '#ffffff'];
    const e1 = p.add(ell(25, 47, 3.2, 4.4), k, 'eye', { ol: false }); p.px(24, 45, e1, 4); p.px(23, 46, e1, 4);
    const e2 = p.add(ell(38.5, 46.5, 2.6, 4), k, 'eye', { ol: false }); p.px(38, 44, e2, 4);
    const m = p.add(blob([22, 55, 31, 57.5, 42, 54.5, 39, 60, 31, 62, 25, 60]), MOUTH_IN, 'mouth');
    p.shade(blob([26, 59, 31, 58, 36, 59, 31, 61.5]), m, 4);
    for (const x of [26, 36]) p.add(poly([x - 1.4, 56.2, x + 1.4, 56.4, x, 59.4]), TOOTH, 'tooth');
    // 滴落
    for (const [x, y] of [[10, 62], [55, 60]]) mp(p, ell(x, y, 1.6, 2.4), pal, 'slime', { s: 1, hl: 1 });
    return p.render(BG);
  },
  watersnake(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#2a8a78'));
    // 身体蜷曲
    const body = mp(p, union(lock(8, 74, 26, 52, 8, -6, 5.5), lock(26, 54, 34, 34, 6.5, 4, 5.2)), pal, 'skin', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.2 });
    mp(p, lock(10, 73, 27, 50, 3.2, -4, 2.6), ramp('#e8d890'), 'belly', { s: 1, hl: 0 });
    texture(p, body, 'scale', 'ws');
    serpentHead(p, 30, 28, 1.35, 1, pal, { frill: '#d84a6a', tongue: true });
    // 背鳍
    spikes(p, [[18, 58, 9, 52, -1], [21, 52, 13, 45, -1], [25, 46, 18, 40, -1]], ramp('#d84a6a'), 'fin', 2.4);
    water(p);
    return p.render(BG);
  },
  crocodile(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#4a7a3a'));
    mp(p, blob([4, 73, 6, 52, 14, 42, 26, 40, 34, 48, 38, 73]), pal, 'skin', { s: 3, d: 1, hl: 1 });
    // 下颚 + 口腔
    mp(p, blob([18, 44, 40, 42, 62, 44, 62, 48, 40, 50, 20, 52]), MOUTH_IN, 'mouth', { s: 0, d: 0, hl: 0 });
    const jaw = mp(p, blob([14, 46, 30, 47, 50, 47.5, 63, 47, 63, 51, 48, 53.5, 30, 54, 16, 54]), pal, 'skin', { s: 2, d: 1, hl: 0 });
    mp(p, blob([22, 52.5, 40, 51.5, 60, 50.5, 60, 52.5, 40, 54.6, 22, 55]), ramp('#d8c890'), 'belly', { s: 1, hl: 0 });
    for (let x = 22; x < 62; x += 4) fangUp(p, x, 48, 3, 1);
    // 上颚
    const h = mp(p, blob([10, 40, 14, 30, 22, 25, 30, 26, 38, 30, 50, 33, 62, 36, 63, 42, 50, 44.5, 34, 45.5, 22, 46, 12, 46]), pal, 'skin', { s: 2, d: 1, hl: 1, dx: 0.8, dy: 1 });
    for (let x = 20; x < 62; x += 4) fang(p, x + 1, 44.6, 3, 1);
    texture(p, ['skin'], 'scale', 'cr');
    // 眼丘
    mp(p, ell(30, 25, 6, 4.4), pal, 'skin', { s: 1, hl: 1 });
    meye(p, 31, 25.5, 2.6, 2, '#e0c020', { slit: true });
    mp(p, lock(25, 23, 36, 22.5, 1.3, -1), pal, 'skin', { s: 0, hl: 1 });
    for (const [x, y] of [[59, 36], [56, 35]]) p.px(x, y, h, 0);
    for (let i = 0; i < 6; i++) mp(p, ell(14 + i * 4, 31 - Math.sin(i * 0.7) * 3 + i * 0.3, 1.6, 1.2), pal, 'skin', { s: 0, hl: 1 });
    water(p);
    return p.render(BG);
  },
  hydra(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#4a8a5a'));
    const pal2 = ramp(mix(vcol(v, '#4a8a5a'), '#000000', 0.18));
    mp(p, union(lock(10, 74, 12, 40, 6, 4, 4), lock(50, 74, 52, 36, 6, -4, 4)), pal2, 'skin', { s: 2, d: 1, hl: 1 });
    serpentHead(p, 13, 30, 0.9, -1, pal2, { eye: '#ff6020' });
    serpentHead(p, 49, 26, 0.9, 1, pal2, { eye: '#ff6020' });
    const n = mp(p, union(lock(22, 74, 28, 40, 8.5, -3, 6)), pal, 'skin', { s: 3, d: 1, hl: 1 });
    mp(p, lock(26, 74, 30, 42, 3.2, -2.5, 2.6), ramp('#d8d090'), 'belly', { s: 1, hl: 0 });
    texture(p, n, 'scale', 'hy');
    serpentHead(p, 27, 30, 1.25, 1, pal, { frill: '#8a3aa0', tongue: true });
    water(p);
    return p.render(BG);
  },
  gargoyle(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#7c7a88'), { shift: 8 });
    // 蝠翼
    for (const [sx, d] of [[14, -1], [50, 1]]) {
      const w = mp(p, blob([sx, 56, sx + d * 4, 36, sx + d * 12, 14, sx + d * 16, 10, sx + d * 14, 22, sx + d * 18, 26, sx + d * 15, 34, sx + d * 19, 40, sx + d * 13, 46, sx + d * 6, 58]), pal, 'wing', { s: 2, d: 1, hl: 1 });
      p.line([sx + d * 4, 50, sx + d * 13, 16], w, 1); p.line([sx + d * 4, 50, sx + d * 16, 28], w, 1); p.line([sx + d * 4, 52, sx + d * 16, 41], w, 1);
    }
    mp(p, blob(TORSO.broad, 0.8), pal, 'skin', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.35 });
    mp(p, poly([24, 46, 40, 46, 41, 60, 23, 60]), pal, 'skin', { s: 2, hl: 0 });
    // 角
    mp(p, union(lock(22, 18, 12, 4, 3, 4, 0.3), lock(39, 17, 48, 2, 3, -4, 0.3)), BONE, 'horn', { s: 1, hl: 1 });
    // 耳
    mp(p, union(lock(19, 30, 7, 22, 3.4, 1, 0.3), lock(44, 29, 55, 21, 3, -1, 0.3)), pal, 'skin', { s: 1, hl: 1 });
    const h = mp(p, blob([18, 30, 19, 20, 25, 13, 32, 12, 39, 14, 45, 21, 45, 31, 42, 41, 37, 48, 31, 50, 25, 47, 20, 40]), pal, 'skin', { s: 2, d: 1, hl: 1, dx: 1, dy: 0.5 });
    // 眉骨 + 眼
    mp(p, blob([20, 26, 31, 29, 43, 25, 43, 28, 31, 32, 20, 29]), pal, 'skin', { s: 1, hl: 1 });
    p.shade(blob([21, 29, 31, 32, 42, 28, 42, 33, 31, 35, 21, 33]), h, 1);
    meye(p, 26, 32, 2.6, 1.4, '#ff4020', { glow: true, pupil: false });
    meye(p, 37, 32, 2.2, 1.4, '#ff4020', { glow: true, pupil: false });
    // 鼻、嘴、獠牙
    p.line([32, 33, 33, 38, 31.5, 39.5], h, 1);
    const m = p.add(blob([24, 42, 31, 43.5, 39, 42, 37, 45.5, 31, 46.5, 26, 45.5]), MOUTH_IN, 'mouth');
    fang(p, 27, 42.4, 3.2, 1); fang(p, 35.5, 42.4, 3.2, 1); fangUp(p, 29, 46, 2.4, 0.8); fangUp(p, 33.5, 46, 2.4, 0.8);
    texture(p, ['skin', 'wing'], 'stone', 'gar', 0.06);
    return p.render(BG);
  },
  scorpion(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#a85a24'));
    // 尾巴越过头顶
    const segs = [[34, 50, 6], [40, 40, 5.5], [44, 29, 5], [44, 18, 4.6], [39, 9, 4.2], [31, 6, 3.8]];
    for (const [x, y, r] of segs) mp(p, ell(x, y, r, r * 0.9), pal, 'shell', { s: 2, d: 1, hl: 1 });
    mp(p, blob([27, 4, 22, 8, 19, 15, 23, 12, 28, 9]), BONE, 'horn', { s: 1, hl: 1 });
    // 螯
    for (const d of [-1, 1]) {
      const X = x => 32 + d * x;
      mp(p, lock(X(10), 52, X(20), 40, 3.6, d * 2, 3), pal, 'shell', { s: 2, d: 1, hl: 1 });
      mp(p, blob([X(16), 40, X(19), 28, X(26), 22, X(30), 27, X(27), 36, X(22), 42]), pal, 'shell', { s: 2, d: 1, hl: 1 });
      mp(p, lock(X(27), 26, X(23), 13, 2.6, -d * 1.5, 0.3), pal, 'shell', { s: 1, hl: 1 });
      mp(p, lock(X(22), 26, X(15), 17, 2.2, d * 1, 0.3), pal, 'shell', { s: 1, hl: 1 });
    }
    // 腿
    for (let i = 0; i < 3; i++) for (const d of [-1, 1]) mp(p, lock(32 + d * 10, 60 + i * 3, 32 + d * (24 + i * 3), 64 + i * 4, 1.6, -d * 2, 0.6), pal, 'shell', { s: 1, hl: 1 });
    // 头胸甲
    const h = mp(p, blob([14, 60, 16, 50, 24, 44, 32, 42, 40, 44, 48, 50, 50, 60, 44, 68, 32, 70, 20, 68]), pal, 'shell', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    p.line([32, 43, 32, 69], h, 2); p.line([18, 58, 32, 56, 46, 58], h, 2);
    for (const [x, y, r] of [[29, 50, 1.6], [35, 50, 1.6], [24, 52, 1], [40, 52, 1]]) meye(p, x, y, r, r, '#202020', { pupil: false });
    // 螯肢
    mp(p, union(lock(27, 62, 29, 70, 2, 0, 0.4), lock(37, 62, 35, 70, 2, 0, 0.4)), BONE, 'horn', { s: 1, hl: 1 });
    return p.render(BG);
  },
  spider(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#3c2c44'), { lit: 0.4 });
    // 腹部
    const ab = mp(p, ell(32, 20, 20, 15), pal, 'shell', { s: 3, d: 1, hl: 2 });
    p.shade(poly([28, 10, 36, 10, 34, 18, 38, 26, 32, 30, 26, 26, 30, 18]), ab, 4);
    const red = p.add(poly([30, 13, 34, 13, 33, 18, 36, 24, 32, 27, 28, 24, 31, 18]), ramp('#c82a2a'), 'mark');
    // 腿
    for (let i = 0; i < 4; i++) for (const d of [-1, 1]) {
      const kx = 32 + d * (18 + i * 3), ky = 34 + i * 8 - 12, fx = 32 + d * (26 + i * 2), fy = 46 + i * 8;
      mp(p, lock(32 + d * 8, 44 + i * 3, kx, ky, 2.4, 0, 1.6), pal, 'leg', { s: 1, hl: 1 });
      mp(p, lock(kx, ky, fx, fy, 2, -d * 1, 0.6), pal, 'leg', { s: 1, hl: 1 });
    }
    // 头胸
    const h = mp(p, blob([18, 46, 22, 36, 32, 32, 42, 36, 46, 46, 42, 56, 32, 60, 22, 56]), pal, 'shell', { s: 3, d: 1, hl: 2 });
    texture(p, ['leg', 'shell'], 'fur', 'sp', 0.06);
    for (const [x, y, r] of [[27.5, 44, 2.4], [36.5, 44, 2.4], [24, 40, 1.4], [40, 40, 1.4], [29, 39, 1.2], [35, 39, 1.2], [22, 45, 1], [42, 45, 1]]) meye(p, x, y, r, r, '#e02020', { pupil: false, glow: true });
    // 螯牙
    mp(p, union(lock(27, 53, 29, 66, 2.6, 1.5, 0.3), lock(37, 53, 35, 66, 2.6, -1.5, 0.3)), pal, 'shell', { s: 1, hl: 1 });
    mp(p, union(lock(28.6, 62, 30.5, 68, 1, 0.5, 0.2), lock(35.4, 62, 33.5, 68, 1, -0.5, 0.2)), BONE, 'horn', { s: 0, hl: 1 });
    return p.render(BG);
  },
  yeti(v) {
    const p = mpic();
    const fur = ramp(vcol(v, '#e6ecf4'), { coolHue: 215, shift: 20 });
    const face = ramp('#7a8ab4');
    mp(p, blob(TORSO.broad, 0.8), fur, 'fur', { s: 3, d: 1, hl: 1 });
    const locks = [];
    for (let i = 0; i < 14; i++) { const a = -PI * 0.05 - i * PI * 1.1 / 13; const r = 15; locks.push(lock(32 + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 32 + Math.cos(a) * (r + 6), 32 + Math.sin(a) * (r + 5) + 2, 4, (i % 2 ? 1 : -1) * 1.5, 0.3)); }
    for (let i = 0; i < 6; i++) locks.push(lock(14 + i * 7, 52, 12 + i * 7.6, 62 + (i % 2) * 3, 4, 1, 0.3));
    mp(p, union(ell(32, 32, 17, 17), ...locks), fur, 'fur', { s: 3, d: 1, hl: 1 });
    texture(p, 'fur', 'fur', 'yt', 0.07);
    // 面部
    const f = mp(p, blob([20, 30, 25, 24, 32, 23, 39, 24, 44, 30, 43, 40, 38, 47, 32, 49, 26, 47, 21, 40]), face, 'skin', { s: 2, d: 0, hl: 1 });
    mp(p, blob([17, 26, 24, 21, 32, 25, 40, 21, 47, 26, 40, 25, 32, 28.5, 24, 25]), fur, 'fur', { s: 1, hl: 1 });
    meye(p, 26.5, 29.5, 2, 1.4, '#ffd020', { glow: true });
    meye(p, 37.5, 29.5, 2, 1.4, '#ffd020', { glow: true });
    p.line([31, 33, 32, 36], f, 1); p.line([33, 33, 32, 36], f, 1);
    p.add(blob([24, 39, 32, 40.5, 40, 39, 38, 45, 32, 46.5, 26, 45]), MOUTH_IN, 'mouth');
    fang(p, 26.5, 39.6, 3.6, 1.1); fang(p, 37.5, 39.6, 3.6, 1.1); fangUp(p, 29, 46, 2, 0.8); fangUp(p, 35, 46, 2, 0.8);
    return p.render(BG);
  },
  roc(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#8a5a2a')), wh = ramp('#ece4d4'), beak = ramp('#e8a828');
    // 颈羽
    const neck = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) neck.push(lock(12 + i * 7 + r * 1.5, 44 + r * 7, 10 + i * 7 + r * 1.5, 54 + r * 7, 4, 1, 0.5));
    mp(p, union(blob([2, 73, 6, 50, 16, 40, 40, 40, 50, 50, 56, 73]), ...neck), pal, 'feather', { s: 2, d: 1, hl: 1 });
    // 冠羽
    spikes(p, [[22, 20, 6, 8, 2], [20, 24, 3, 18, 2], [24, 17, 14, 2, 1.5]], pal, 'feather', 3.4);
    const h = mp(p, blob([14, 34, 16, 22, 24, 15, 34, 14, 42, 18, 46, 26, 44, 36, 36, 44, 24, 46, 16, 42]), wh, 'feather', { s: 2, d: 1, hl: 1 });
    for (let i = 0; i < 5; i++) p.line([18 + i * 4, 38 + (i % 2), 20 + i * 4, 44], h, 2);
    // 喙
    mp(p, blob([38, 33, 44, 28, 52, 27, 59, 30, 62, 36, 60, 44, 57, 40, 52, 37, 44, 38]), beak, 'beak', { s: 2, d: 1, hl: 1 });
    mp(p, blob([40, 37, 50, 38, 56, 41, 50, 43, 42, 42]), beak, 'beak', { s: 1, hl: 0 });
    p.line([42, 37.5, 50, 38, 56, 41], 'beak', 0); p.px(53, 31, p.o[31 * W + 53] || 0, 1);
    meye(p, 34, 27, 2.8, 2.4, '#f0b020', {});
    mp(p, lock(28, 24, 42, 23, 1.8, -1.5), wh, 'feather', { s: 1, hl: 1 });
    return p.render(BG);
  },
  seaMonster(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#2a7a8a')), fin = ramp('#d06a4a');
    mp(p, blob(TORSO.std, 0.8), pal, 'skin', { s: 3, d: 1, hl: 1 });
    // 头鳍
    for (let i = 0; i < 5; i++) mp(p, lock(22 + i * 4, 18 - Math.sin(i / 4 * PI) * 2, 16 + i * 6, 2 + Math.abs(i - 2) * 2, 2.6, 0, 0.3), fin, 'fin', { s: 1, hl: 1 });
    mp(p, union(lock(17, 32, 5, 26, 3, 1, 0.5), lock(17, 36, 6, 40, 3, -1, 0.5), lock(46, 32, 58, 26, 3, -1, 0.5)), fin, 'fin', { s: 1, hl: 1 });
    const h = mp(p, blob([16, 34, 18, 22, 25, 15, 33, 14, 41, 16, 47, 24, 48, 36, 44, 46, 36, 52, 26, 51, 19, 45]), pal, 'skin', { s: 2, d: 1, hl: 1 });
    texture(p, ['skin'], 'scale', 'sm');
    mp(p, blob([24, 40, 34, 37, 46, 38, 44, 49, 34, 51, 26, 48]), ramp('#d8e0b0'), 'belly', { s: 1, hl: 0 });
    meye(p, 26, 30, 3.6, 3.6, '#f0e040', { px: 0.8 });
    meye(p, 40, 29.5, 2.8, 3.2, '#f0e040', { px: 0.8 });
    const m = p.add(blob([25, 42, 34, 41, 44, 41.5, 41, 46, 34, 47.5, 27, 46]), MOUTH_IN, 'mouth');
    for (let x = 27; x < 43; x += 2.6) fang(p, x, 41.6, 2.2, 0.8);
    for (let x = 28.4; x < 42; x += 2.6) fangUp(p, x, 47, 1.8, 0.7);
    for (const y of [34, 37, 40]) p.line([18, y, 21, y + 1], h, 1);
    return p.render(BG);
  },
  kraken(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#9a3a6a')), sk = ramp('#f0c0c8');
    const ten = (a) => { const id = mp(p, union(...a.map(t => lock(...t))), pal, 'ten', { s: 2, d: 1, hl: 1 }); return id; };
    ten([[14, 74, 2, 40, 4.5, 6, 1], [2, 41, 8, 32, 2, -2, 0.8], [50, 74, 62, 38, 4.5, -6, 1], [62, 39, 57, 30, 2, 2, 0.8]]);
    // 头（外套膜）
    const h = mp(p, blob([14, 40, 13, 24, 18, 10, 26, 3, 32, 1, 38, 3, 46, 10, 51, 24, 50, 40, 44, 50, 32, 53, 20, 50]), pal, 'skin', { s: 3, d: 1, hl: 2 });
    for (const [x, y, r] of [[22, 16, 1.6], [40, 12, 1.2], [30, 8, 1], [44, 22, 1.4], [18, 26, 1]]) p.shade(ell(x, y, r, r), h, 4);
    for (const x of [23, 41]) { const e = meye(p, x, 37, 4.4, 3.6, '#f0a020', { pupil: false, glow: true }); p.fill(ell(x + 0.5, 37.4, 3, 0.9), e, 0); p.px(x - 2, 35, e, 5); }
    p.shade(union(poly([16, 31, 30, 35, 29, 33, 17, 29]), poly([34, 35, 48, 31, 47, 29, 35, 33])), h, 1);
    ten([[20, 50, 8, 74, 4, 2, 2], [28, 52, 24, 74, 4, -2, 2], [36, 52, 40, 74, 4, 2, 2], [44, 50, 56, 74, 4, -2, 2]]);
    for (const [x, y] of [[10, 68], [12, 62], [23, 66], [41, 68], [40, 61], [53, 66], [6, 50], [58, 50], [4, 56]]) mp(p, ell(x, y, 1.3, 1), sk, 'sucker', { s: 0, d: 0, hl: 1 });
    return p.render(BG);
  },
  beast(v) { // 魔兽：红鬃黑豹，弯角，剑齿
    const p = mpic();
    const pal = ramp(vcol(v, '#4a3c60')), mane = ramp('#c43a1c'), muzzle = ramp('#7a6a8a');
    mp(p, blob(TORSO.broad, 0.8), pal, 'fur', { s: 3, d: 1, hl: 1 });
    const mn = [];
    for (let i = 0; i < 13; i++) { const a = PI * 0.25 - i * PI * 1.3 / 12; mn.push(lock(28 + Math.cos(a) * 9, 33 + Math.sin(a) * 9, 28 + Math.cos(a) * (23 + (i % 2) * 4), 33 + Math.sin(a) * (21 + (i % 2) * 4), 4.4, 2.2, 0.3)); }
    const m = mp(p, union(ell(28, 33, 15, 15), ...mn), mane, 'mane', { s: 2, d: 1, hl: 1 });
    texture(p, m, 'fur', 'bm', 0.06);
    mp(p, union(lock(24, 18, 10, 8, 3, 3, 0.3), lock(10, 8, 6, 16, 1.8, 1, 0.2), lock(36, 17, 44, 3, 3, -3, 0.3)), BONE, 'horn', { s: 1, hl: 1 });
    mp(p, union(poly([19, 24, 15, 11, 27, 19]), poly([36, 18, 43, 8, 44, 22])), pal, 'fur', { s: 1, hl: 1 });
    const h = mp(p, blob([17, 32, 19, 23, 26, 17, 35, 16.5, 42, 21, 47, 27, 54, 32, 56, 37, 53, 42, 45, 46, 35, 49, 25, 47, 19, 41]), pal, 'fur', { s: 2, d: 1, hl: 1, dx: 1, dy: 0.6 });
    mp(p, blob([36, 33, 44, 31, 52, 32.5, 55.5, 36, 53, 41.5, 45, 45, 38, 43]), muzzle, 'muzzle', { s: 1, hl: 1 });
    p.add(blob([51, 32, 55, 32.4, 56, 35, 53, 35.4]), ['#000000', '#100810', '#201820', '#302830', '#605860', '#a090a0'], 'nose');
    meye(p, 33, 27.5, 3, 1.7, '#ffd020', { slit: true, glow: true, rot: -0.25 });
    meye(p, 43.5, 27.5, 1.6, 1.4, '#ffd020', { slit: true, glow: true, rot: -0.3 });
    mp(p, lock(26, 25, 40, 24.6, 1.6, -1.2), pal, 'fur', { s: 0, hl: 1 });
    p.add(blob([37, 43, 45, 41.5, 52, 41, 48, 45.5, 39, 46.5]), MOUTH_IN, 'mouth');
    fang(p, 46, 41.6, 8, 1.4, -0.6); fang(p, 40, 43, 6.5, 1.2, -0.6);
    for (const l of [[24, 21, 27, 26], [29, 18.5, 31, 23], [20, 33, 25, 34], [21, 37.5, 26, 38]]) p.line(l, h, 1, true);
    return p.render(BG);
  },
  wolfman(v, hero) { return wolfHead(v, hero); },
  wolfHero(v, hero, tier) { return wolfHead(v, true, tier); },
  dragon(v) {
    const p = mpic();
    const col = vcol(v, '#c43c26', DRAGON_COL);
    const pal = ramp(col), belly = ramp(mix(col, '#f0e0a0', 0.6)), horn = BONE;
    const eye = v === 'black' ? '#ff3020' : v === 'blue' ? '#f0f060' : '#ffd020';
    // 颈
    const n = mp(p, blob([6, 73, 8, 56, 16, 42, 30, 38, 40, 46, 44, 60, 46, 73]), pal, 'skin', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.2 });
    texture(p, n, 'scale', 'dn');
    const b = mp(p, blob([30, 46, 38, 44, 44, 58, 46, 73, 34, 73, 34, 58]), belly, 'belly', { s: 2, d: 0, hl: 1 });
    for (let y = 50; y < 73; y += 4) p.line([32, y, 45, y - 1.5], b, 2, true);
    // 背刺
    spikes(p, [[14, 46, 4, 42, 1], [10, 54, 1, 52, 1], [8, 62, 0, 62, 1], [20, 38, 10, 32, 1]], ramp(mix(col, '#000000', 0.3)), 'spike', 3);
    // 角
    mp(p, union(lock(24, 20, 4, 8, 3.6, 3, 0.3), lock(28, 17, 12, 1, 3.2, 3, 0.3)), horn, 'horn', { s: 2, d: 1, hl: 1, dx: 1, dy: 1 });
    for (const [x, y] of [[12, 12], [16, 9]]) p.spx(x, y, 'horn', 2);
    // 口腔、下颚
    mp(p, blob([30, 38, 46, 39, 60, 38, 60, 44, 46, 46, 32, 44]), MOUTH_IN, 'mouth', { s: 0, d: 0, hl: 0 });
    const jaw = mp(p, blob([26, 40, 40, 44, 52, 44.5, 60, 44, 60, 47.5, 50, 50, 36, 50, 26, 46]), pal, 'skin', { s: 2, d: 1, hl: 0 });
    for (let x = 40; x < 59; x += 3.4) fangUp(p, x, 44.6, 2.6, 0.9);
    // 头
    const h = mp(p, blob([17, 30, 20, 21, 27, 16, 35, 15, 42, 19, 47, 23, 55, 25, 61, 29, 62, 35, 58, 39.5, 48, 40.5, 38, 42, 28, 42, 20, 38]), pal, 'skin', { s: 2, d: 1, hl: 1, dx: 1, dy: 0.7 });
    texture(p, h, 'scale', 'dh');
    for (let x = 41; x < 60; x += 3.4) fang(p, x, 39.8, 3, 0.9);
    // 颊刺
    spikes(p, [[22, 36, 9, 40, -1], [21, 32, 10, 30, 0]], horn, 'horn', 2.2);
    // 眉骨 + 眼
    mp(p, blob([28, 24, 36, 21, 44, 23, 45, 26, 36, 25, 29, 27]), pal, 'skin', { s: 1, hl: 1 });
    meye(p, 37, 28, 3, 1.7, eye, { slit: true, glow: true, rot: -0.15 });
    p.shade(blob([30, 26, 44, 25.5, 44, 27, 30, 28]), 'eye', 2);
    // 鼻孔
    p.line([56, 29, 58, 30], h, 0);
    for (const l of [[47, 32, 55, 33], [22, 26, 26, 22]]) p.line(l, h, 2, true);
    return p.render(BG);
  },
  pigdragon(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#c47888')), wing = ramp('#7a4a6a');
    for (const [sx, d] of [[16, -1], [48, 1]]) mp(p, blob([sx, 54, sx + d * 6, 34, sx + d * 14, 18, sx + d * 16, 24, sx + d * 13, 30, sx + d * 17, 36, sx + d * 12, 42, sx + d * 15, 48, sx + d * 6, 58]), wing, 'wing', { s: 2, d: 1, hl: 1 });
    mp(p, blob(TORSO.broad, 0.8), pal, 'skin', { s: 3, d: 1, hl: 1 });
    mp(p, blob([20, 74, 22, 60, 32, 56, 42, 60, 44, 74]), ramp('#f0d0b0'), 'belly', { s: 2, hl: 1 });
    mp(p, union(lock(22, 18, 14, 6, 2.6, 2, 0.3), lock(40, 18, 48, 6, 2.6, -2, 0.3)), BONE, 'horn', { s: 1, hl: 1 });
    mp(p, union(lock(19, 26, 6, 20, 4, 2, 0.6), lock(44, 26, 57, 20, 4, -2, 0.6)), pal, 'skin', { s: 1, hl: 1 });
    const h = mp(p, blob([16, 34, 18, 22, 26, 15, 32, 14, 38, 15, 46, 22, 48, 34, 45, 45, 38, 51, 32, 52, 26, 51, 19, 45]), pal, 'skin', { s: 2, d: 1, hl: 1 });
    texture(p, h, 'scale', 'pg');
    // 猪鼻
    const sn = mp(p, ell(32, 38, 7.5, 5.5), pal, 'snout', { s: 2, d: 0, hl: 1 });
    for (const x of [29, 35]) p.fill(ell(x, 38.5, 1.3, 2), sn, 0);
    meye(p, 25, 29, 2.2, 2, '#f0e030', { glow: true });
    meye(p, 39, 29, 2.2, 2, '#f0e030', { glow: true });
    mp(p, union(lock(19, 25.5, 30, 27.5, 1.5, -1), lock(45, 25.5, 34, 27.5, 1.5, 1)), pal, 'skin', { s: 0, hl: 1 });
    p.line([26, 46, 32, 47.5, 38, 46], h, 0);
    fangUp(p, 24.5, 47, 5, 1.2); fangUp(p, 39.5, 47, 5, 1.2);
    return p.render(BG);
  },
  demon(v) {
    const p = mpic();
    const col = vcol(v, '#8a2438');
    const pal = ramp(col), wing = ramp(mix(col, '#100010', 0.45));
    for (const [sx, d] of [[14, -1], [50, 1]]) {
      const w = mp(p, blob([sx, 54, sx + d * 6, 30, sx + d * 13, 8, sx + d * 18, 4, sx + d * 16, 18, sx + d * 19, 24, sx + d * 15, 32, sx + d * 19, 38, sx + d * 13, 44, sx + d * 6, 56]), wing, 'wing', { s: 2, d: 1, hl: 1 });
      p.line([sx + d * 5, 48, sx + d * 16, 8], w, 1); p.line([sx + d * 5, 50, sx + d * 17, 26], w, 1); p.line([sx + d * 5, 52, sx + d * 16, 40], w, 1);
    }
    const body = mp(p, blob(TORSO.broad, 0.8), pal, 'skin', { s: 3, d: 1, hl: 1 });
    p.line([20, 62, 26, 64.5, 31, 63.5], body, 2, true); p.line([33, 64, 38, 65, 43, 62.5], body, 2, true); p.line([31.5, 62, 31.5, 73], body, 2, true);
    mp(p, poly([24, 44, 40, 44, 41, 58, 23, 58]), pal, 'skin', { s: 2, hl: 0 });
    // 羊角
    mp(p, union(lock(23, 18, 8, 6, 4.4, 6, 1), lock(8, 6, 4, 18, 2.6, 3, 0.3), lock(39, 17, 55, 6, 4.4, -6, 1), lock(55, 6, 60, 18, 2.6, -3, 0.3)), ramp('#3a2a2a'), 'horn', { s: 2, d: 1, hl: 1 });
    for (const [x, y] of [[14, 9], [11, 11], [50, 9], [53, 11]]) p.spx(x, y, 'horn', 4);
    mp(p, union(lock(19, 30, 9, 24, 3, 1, 0.3), lock(44, 29, 54, 23, 2.8, -1, 0.3)), pal, 'skin', { s: 1, hl: 1 });
    const h = mp(p, blob([18, 30, 19, 19, 25, 13, 32, 12, 39, 13, 45, 19, 46, 30, 43, 41, 37, 47, 31, 49, 25, 46, 20, 40]), pal, 'skin', { s: 2, d: 1, hl: 1 });
    mp(p, blob([20, 25, 31, 29, 44, 24, 44, 28, 31, 32, 20, 28.5]), pal, 'skin', { s: 1, hl: 1 });
    p.shade(blob([21, 28.5, 31, 32, 43, 28, 43, 33, 31, 35, 21, 33]), h, 1);
    meye(p, 26, 31.6, 2.8, 1.4, '#ffe040', { glow: true, pupil: false });
    meye(p, 37, 31.6, 2.4, 1.4, '#ffe040', { glow: true, pupil: false });
    p.line([32, 33, 33.5, 37.5, 31.5, 38.6], h, 1);
    const m = p.add(blob([23, 41, 31, 42.5, 40, 41, 37, 45, 31, 46.5, 26, 45]), MOUTH_IN, 'mouth');
    fang(p, 26, 41.4, 3.6, 1); fang(p, 36.5, 41.4, 3.6, 1);
    for (const x of [28.6, 31, 33.4]) fang(p, x, 41.6, 1.6, 0.7);
    for (const l of [[24, 22, 27, 18], [38, 18, 40, 22], [22, 38, 25, 43]]) p.line(l, h, 2, true);
    return p.render(BG);
  },
  darkLord(v) {
    const p = mpic();
    const arm = ramp(vcol(v, '#2c2440'), { lit: 0.3 }), gold = METAL.gold, glow = ['#300818', '#8a1040', '#d02060', '#ff5080', '#ffb0c8', '#ffffff'];
    // 光环
    const aura = p.add(ring(ell(32, 26, 30, 28), ell(32, 26, 25, 23)), ['#14082a', '#2a0e4a', '#3e1468', '#5a1c8a', '#8a3ac0', '#c080f0'], 'aura', { ol: false });
    p.auto(aura, { s: 3, hl: 3, dx: 0.7, dy: 0.7 });
    for (let i = 0; i < 12; i++) { const a = -PI * 0.02 - i * PI * 0.96 / 11, r0 = 18, r1 = 30 + (i % 2) * 5; mp(p, lock(32 + Math.cos(a) * r0, 30 + Math.sin(a) * r0, 32 + Math.cos(a) * r1, 30 + Math.sin(a) * r1, 2.6, 0, 0.2), arm, 'spike', { s: 1, hl: 1 }); }
    // 巨型肩甲
    mp(p, blob(TORSO.broad, 0.8), arm, 'metal', { s: 3, d: 1, hl: 1 });
    for (const d of [-1, 1]) {
      const X = x => 32 + d * x;
      mp(p, blob([X(14), 56, X(20), 48, X(30), 46, X(34), 54, X(33), 66, X(20), 66]), arm, 'metal', { s: 2, d: 1, hl: 2 });
      spikes(p, [[X(24), 50, X(34), 34, -d * 2], [X(29), 52, X(38), 42, -d * 1]], BONE, 'horn', 2.6);
    }
    const gem = mp(p, ell(32, 64, 4, 4.4), glow, 'gem', { s: 1, hl: 1 }); p.px(30, 62, gem, 5);
    // 头冠（多角）
    mp(p, union(lock(24, 18, 12, -2, 3, 3, 0.3), lock(28, 14, 24, -4, 2.6, 1, 0.2), lock(36, 14, 40, -4, 2.6, -1, 0.2), lock(40, 18, 52, -2, 3, -3, 0.3), lock(32, 12, 32, -6, 3, 0, 0.2)), BONE, 'horn', { s: 2, d: 1, hl: 1 });
    // 头盔面
    const h = mp(p, blob([18, 30, 19, 18, 25, 11, 32, 9, 39, 11, 45, 18, 46, 30, 43, 42, 37, 50, 32, 52, 27, 50, 21, 42]), arm, 'metal', { s: 2, d: 1, hl: 2 });
    mp(p, blob([20, 22, 32, 18, 44, 22, 43, 26, 32, 23, 21, 26]), gold, 'trim', { s: 1, hl: 1 });
    const face = mp(p, blob([22, 30, 32, 26, 42, 30, 41, 40, 36, 47, 32, 49, 28, 47, 23, 40]), ['#05030a', '#0a0612', '#120a1c', '#1a1028', '#2a1a3a', '#3a2a4a'], 'void', { s: 2, hl: 1 });
    const g = p.obj(glow, 'glow', { ol: false });
    p.fill(poly([24, 31, 30, 33, 29.5, 34.6, 24.5, 33.4]), g, 3); p.fill(poly([34.5, 33, 40, 31, 39.5, 33.4, 35, 34.6]), g, 3);
    for (const [x, y] of [[26, 32], [37, 32]]) p.px(x, y, g, 5);
    p.fill(ell(32, 22.5, 1.6, 2.2), g, 3); p.px(32, 22, g, 5);
    p.line([28, 42, 30, 44, 32, 43, 34, 44, 36, 42], g, 2);
    p.line([32, 9, 32, 18], h, 4);
    return p.render(['#05020a', '#0a0414', '#12061e', '#1c0a2c']);
  },
  robot(v) {
    const p = mpic();
    const mt = METAL.steel, dk = METAL.black, glow = ['#300000', '#a01010', '#e02020', '#ff6040', '#ffb090', '#ffffff'];
    const accent = ramp(vcol(v, '#c8a030'));
    mp(p, blob(TORSO.broad, 0.8), mt, 'metal', { s: 3, d: 1, hl: 2 });
    for (const d of [-1, 1]) mp(p, blob([32 + d * 14, 56, 32 + d * 22, 50, 32 + d * 32, 54, 32 + d * 33, 66, 32 + d * 18, 66]), accent, 'plate', { s: 2, d: 1, hl: 2 });
    mp(p, poly([25, 44, 39, 44, 40, 56, 24, 56]), dk, 'neck', { s: 1, hl: 1 });
    for (let y = 46; y < 56; y += 2) p.line([25, y, 39, y], 'neck', 1);
    // 天线 + 耳
    mp(p, rect(31, 4, 2, 10), dk, 'neck', { s: 0, hl: 1 }); mp(p, ell(32, 4, 2, 2), glow, 'glow', { s: 0, hl: 1 });
    mp(p, union(rect(14, 26, 6, 10), rect(44, 26, 6, 10)), accent, 'plate', { s: 1, hl: 1 });
    const h = mp(p, blob([18, 32, 19, 20, 24, 14, 32, 12.5, 40, 14, 45, 20, 46, 32, 44, 42, 38, 47, 26, 47, 20, 42]), mt, 'metal', { s: 3, d: 1, hl: 2 });
    p.line([32, 13, 32, 22], h, 4);
    const vis = mp(p, blob([20, 27, 32, 25, 44, 27, 44, 33, 32, 34, 20, 33]), dk, 'visor', { s: 1, hl: 0 });
    const g = p.obj(glow, 'glow', { ol: false });
    p.fill(poly([22, 29, 42, 29, 42, 31, 22, 31]), g, 2);
    p.fill(poly([33, 28.6, 38, 28.6, 38, 31.4, 33, 31.4]), g, 4); p.px(35, 29, g, 5);
    for (const y of [38, 40.5, 43]) p.line([26, y, 38, y], h, 1);
    for (const [x, y] of [[21, 22], [42, 22], [22, 40], [41, 40]]) p.px(x, y, h, 5);
    return p.render(BG);
  },
  console(v) {
    const p = mpic();
    const mt = METAL.steel, dk = METAL.black, scr = ['#001010', '#003830', '#00705a', '#10b088', '#70f0c0', '#e0fff0'];
    const fr = mp(p, rect(4, 6, 56, 70), mt, 'metal', { s: 3, d: 1, hl: 2 });
    mp(p, rect(8, 10, 48, 34), dk, 'bezel', { s: 1, hl: 1 });
    const s = mp(p, rect(11, 13, 42, 28), scr, 'screen', { s: 0, d: 0, hl: 0 });
    for (let y = 13; y < 41; y++) for (let x = 11; x < 53; x++) { const i = y * W + x; if (p.o[i] === s) p.t[i] = (y % 2) ? 1 : 2; }
    p.auto(fr, { s: 3, d: 1, hl: 2 });
    // 屏幕上的“脸”与数据
    for (const [x0, y0] of [[19, 22], [38, 22]]) p.fill(poly([x0, y0, x0 + 7, y0, x0 + 7, y0 + 3, x0, y0 + 3]), s, 4);
    p.line([22, 33, 26, 35, 32, 33, 38, 35, 42, 33], s, 4);
    for (let i = 0; i < 6; i++) p.line([13, 15 + i * 0.01, 13 + ((i * 7) % 11) + 3, 15], s, 3);
    for (let i = 0; i < 4; i++) p.line([46, 16 + i * 2, 51, 16 + i * 2], s, 3);
    // 按钮
    const cols = ['#e02020', '#f0c020', '#20c040', '#2080f0'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) mp(p, rect(10 + i * 8, 50 + r * 6, 5, 3), ramp(cols[(i + r) % 4]), 'btn', { s: 1, hl: 1 });
    mp(p, ell(32, 66, 6, 4), ['#100830', '#3010a0', '#5030e0', '#8060ff', '#c0a0ff', '#ffffff'], 'orb', { s: 1, hl: 2 });
    for (const [x, y] of [[6, 8], [57, 8], [6, 46], [57, 46]]) p.px(x, y, fr, 5);
    return p.render(BG);
  },
  wind(v) { return vortex(v, '#9ad8e8', true); },
  spiritWind(v) { return vortex(v, '#9ae8b0'); },
  spiritFire(v) { return vortex(v, '#f07030'); },
  spiritWater(v) { return vortex(v, '#4a90e0'); },
  spiritEarth(v) { return vortex(v, '#b08040'); },
  babyDragon(v, hero, tier) {
    const p = mpic();
    // 拉拉的阶：0 小龙 1 飞龙（默认）2 火龙 3 巨火龙
    const T = tier == null ? 1 : tier;
    const col = T >= 2 ? (T === 3 ? '#c8321e' : '#e0682a') : T === 0 ? '#5cc070' : vcol(v, '#44b060', DRAGON_COL);
    const pal = ramp(col, { lit: 0.42 }), belly = ramp(T >= 2 ? '#f8d878' : '#f4e2a8'), wing = ramp(T >= 2 ? (T === 3 ? '#5a1418' : '#8a2a1a') : mix(col, '#203040', 0.35));
    const fire = ['#3a0800', '#a02008', '#e05010', '#f89020', '#ffd050', '#fff4c0'];
    if (T === 3) { // 火焰光晕
      const fl = p.obj(fire, 'aura', { ol: false });
      for (let i = 0; i < 11; i++) { const a = PI * (1.05 + i * 0.09), r = 27 + (i % 2) * 4; p.fill(lock(32 + Math.cos(a) * 20, 34 + Math.sin(a) * 20, 32 + Math.cos(a) * r, 34 + Math.sin(a) * r, 3.4, (i % 2 ? 1 : -1), 0.2), fl, i % 2 ? 2 : 3); }
    }
    const ws = [0.55, 1, 1.3, 1.55][T] || 1;
    for (const [sx, d] of [[17, -1], [47, 1]]) {
      const W0 = [sx, 62, sx + d * 6, 48, sx + d * 15, 40, sx + d * 14, 47, sx + d * 17, 51, sx + d * 13, 55, sx + d * 15, 60, sx + d * 6, 66];
      const Wp = W0.map((q, i) => (i % 2 ? 62 + (q - 62) * ws : sx + (q - sx) * ws));
      const wid = mp(p, blob(Wp), wing, 'wing', { s: 1, d: 0, hl: 1 });
      if (T >= 2) { for (const k of [2, 4]) p.line([sx, 62, Wp[k * 2], Wp[k * 2 + 1]], wid, 4, true); mp(p, ell(Wp[4], Wp[5], 1.6, 1.6), T === 3 ? METAL.gold : BONE, 'claw', { s: 0, hl: 1 }); }
    }
    mp(p, blob([10, 74, 12, 63, 20, 57, 32, 55, 44, 57, 52, 63, 54, 74]), pal, 'skin', { s: 3, d: 1, hl: 1 });
    mp(p, blob([22, 74, 23, 64, 32, 60, 41, 64, 42, 74]), belly, 'belly', { s: 2, d: 0, hl: 1 });
    for (let y = 65; y < 74; y += 3) p.line([24, y, 40, y], 'belly', 2, true);
    if (T === 3) { // 金项圈 + 宝石
      mp(p, blob([14, 64, 22, 58.5, 32, 57, 42, 58.5, 50, 64, 46, 66, 32, 61.5, 18, 66]), METAL.gold, 'metal', { s: 1, d: 0, hl: 1 });
      const g = mp(p, ell(32, 62.5, 2.4, 2.6), ramp('#20b0e0', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); p.px(31, 61.5, g, 5);
    }
    // 角与头冠刺
    const hornPal = T === 3 ? METAL.gold : BONE;
    if (T === 0) mp(p, union(lock(24, 18, 21, 10, 2.4, 0.5, 0.8), lock(36, 17, 39, 9.5, 2.2, -0.5, 0.8)), BONE, 'horn', { s: 1, hl: 1 });
    else if (T === 1) mp(p, union(lock(23, 17, 18, 5, 2.8, 1, 0.8), lock(37, 16, 42, 4.5, 2.6, -1, 0.8)), BONE, 'horn', { s: 1, hl: 1 });
    else {
      mp(p, union(lock(23, 18, 12, 1, 3.6, 3, 0.6), lock(37, 16, 47, 0, 3.4, -3, 0.6)), hornPal, 'horn', { s: 1, d: 0, hl: 1 });
      if (T === 3) mp(p, union(lock(19, 22, 6, 13, 2.6, 2, 0.5), lock(41, 18, 53, 10, 2.4, -2, 0.5)), hornPal, 'horn', { s: 1, hl: 1 });
      for (const l of [[21, 9, 18, 13], [42, 8, 40, 12]]) p.line(l, 'horn', 1, true);
    }
    if (T === 1) spikes(p, [[17, 24, 10, 20, 0], [15, 32, 8, 31, 0]], ramp('#f0c040'), 'spike', 2.2);
    else if (T >= 2) spikes(p, [[18, 21, 9, 14, 1], [16, 27, 6, 23, 0.5], [15, 33, 5, 33, 0], [16, 39, 7, 42, -0.5]].slice(0, T === 3 ? 4 : 3), fire, 'spike', T === 3 ? 3 : 2.6);
    // 头：圆脑袋 + 短圆吻
    const h = mp(p, blob([14, 36, 15, 24, 22, 15.5, 31, 13, 40, 15.5, 46, 23, 50, 30, 54, 34, 55, 40, 52, 46, 44, 51, 33, 53.5, 23, 52, 16, 46]), pal, 'skin', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    p.shade(ell(24, 21, 5, 3), h, 5, t => t >= 4);
    // 大眼睛
    const ep = eyePal(T >= 2 ? (T === 3 ? '#f0a010' : '#e07010') : v === 'red' ? '#d04020' : '#c87010', '#10200c');
    const e = p.obj(ep, 'eye', { ol: false });
    const map = { K: [e, 0], k: [e, 1], W: [e, 2], w: [e, 3], D: [e, 4], I: [e, 5], L: [e, 6], H: [e, 7], P: [e, 8] };
    p.tmpl(21, 26, ['..KKKKK..', '.KKKKKKK.', 'KKDDDDDKK', 'KHHDDDDIK', 'KHHPPDIIK', 'KDPPPPIIK', 'KIIPPIILK', '.KLLLLLK.', '..KKKKK..'], map);
    p.tmpl(37, 26, ['.KKKK.', 'KKKKKK', 'KDDDDK', 'KHDDIK', 'KHPPIK', 'KIPPIK', 'KILLLK', '.KKKK.'], map);
    // 腮红、鼻孔、嘴
    const bl = p.obj(['#802040', '#c04060', '#e07080', '#f090a0', '#ffb0c0', '#ffd0e0'], 'blush', { ol: false });
    for (const [x, y] of [[19, 38], [20, 38], [21, 38], [42, 38], [43, 38]]) p.px(x, y, bl, 3);
    p.px(52, 37, h, 0); p.px(49.5, 37.5, h, 1);
    const m = p.add(blob([36, 43, 43, 44.6, 51, 43, 48, 47.4, 42, 48.4, 38, 46.4]), MOUTH_IN, 'mouth');
    p.shade(blob([39, 46.5, 43, 45.5, 47, 46.5, 43, 48]), m, 4);
    fang(p, 47.5, 43.6, 1.8, 0.8);
    if (T >= 2) { // 鼻孔火星 / 额前宝石
      const fl = p.obj(fire, 'spark', { ol: false });
      for (const [x, y, t] of [[55, 35, 4], [57, 33, 3], [58, 35.5, 5], [60, 32, 2], [59, 30, 3]]) p.px(x, y, fl, t);
      if (T === 3) { const g = mp(p, poly([31, 14, 34, 18, 31, 22, 28, 18]), METAL.gold, 'metal', { s: 0, hl: 1 }); const j = mp(p, ell(31, 18, 1.4, 1.9), ramp('#e02030', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); p.px(30.5, 17, j, 5); }
    }
    return p.render(BG);
  },
  turtle(v) {
    const p = mpic();
    const pal = ramp(vcol(v, '#5a8a4a')), shell = ramp('#6a5030');
    const sh = mp(p, blob([0, 74, 0, 46, 10, 34, 24, 30, 34, 34, 40, 50, 42, 74]), shell, 'shell', { s: 3, d: 1, hl: 2 });
    for (const l of [[4, 46, 14, 40, 24, 42, 30, 52], [10, 60, 20, 56, 30, 60, 36, 70], [14, 40, 10, 56, 14, 74], [24, 42, 22, 58, 26, 74]]) p.line(l, sh, 1, true);
    mp(p, lock(28, 64, 40, 40, 7, -2, 6), pal, 'skin', { s: 2, d: 1, hl: 1 });
    const h = mp(p, blob([30, 34, 34, 26, 42, 22, 52, 23, 59, 27, 62, 33, 60, 40, 52, 44, 42, 45, 34, 42]), pal, 'skin', { s: 2, d: 1, hl: 1 });
    texture(p, ['skin'], 'scale', 'tu');
    p.line([48, 38, 55, 37, 61, 35], h, 0);
    mp(p, poly([56, 32, 62, 31, 62, 37, 58, 36]), BONE, 'beak', { s: 1, hl: 1 });
    meye(p, 46, 30, 2.2, 2, '#202010', { pupil: false });
    water(p);
    return p.render(BG);
  },
};

// 狼族头部（坎培特 / 敌方狼人）
function wolfHead(v, hero, tier) {
  const p = mpic();
  // 坎培特的阶：0 狼族士兵 1 狼战士（默认）2 狼嚎战士
  const T = hero ? (tier == null ? 1 : tier) : -1;
  const furCol = hero ? '#9a9cac' : vcol(v, '#7a5a3e');
  const fur = ramp(furCol, { shift: 10 }), cream = ramp(hero ? '#e6e4ee' : '#d8c0a0', { coolHue: 230 });
  const c = { p, S: { cloth: hero ? (T === 0 ? '#6a4a2e' : T === 2 ? '#1e2e5a' : '#2e4a7a') : '#5a2a2a', fur: hero ? (T === 0 ? '#5a4030' : '#5a5a6a') : '#3a2a1c' } };
  if (T === 2) { GEAR.aura('#e0a040')(c); GEAR.cape('#9a1e24', METAL.gold)(c); }
  BODY.wolf(c);
  if (T === 0) piece(c, lock(10, 57, 46, 74, 2.6, 1.5, 2.6), rp('#4a3020'), 'cloth', { s: 1, hl: 1 });
  if (T >= 1) piece(c, blob([22, 56, 31, 59, 42, 56, 41, 60, 31, 63, 23, 60]), METAL.gold, 'metal', { s: 1, hl: 1 });
  if (T === 2) {
    GEAR.pauldrons(METAL.steel, 'L', true)(c);
    for (const [x, y] of [[2, 54], [8, 51.5], [14, 52.5]]) mp(p, poly([x - 1.8, y + 3, x + 1.8, y + 3, x + 0.6, y - 4]), METAL.silver, 'spike', { s: 0, hl: 1 });
    pauldron(c, 52, 64, 8.5, 5.5, METAL.gold, 1, 0.2);
    emblem(c, 31.5, 66, 2.4, '#d02030');
  }
  // 颈部鬃毛
  const ruff = [];
  for (let i = 0; i < 8; i++) ruff.push(lock(17 + i * 3.6, 42 + Math.abs(i - 4) * 0.4, 13 + i * 4.4, 55 + (i % 2) * 3, 3.6, (i % 2 ? 1 : -1), 0.3));
  mp(p, union(...ruff), fur, 'fur', { s: 2, d: 1, hl: 1 });
  // 耳朵
  const ears = mp(p, union(poly([16, 22, 17, 2, 29, 14]), poly([30, 13, 38, 0, 42, 18])), fur, 'fur', { s: 2, d: 1, hl: 1 });
  p.shade(union(poly([19, 18, 19, 7, 26, 14]), poly([33, 13, 37.5, 5, 40, 16])), ears, 1);
  // 头 + 吻部
  const h = mp(p, blob([15, 31, 17, 20, 24, 12.5, 32, 11, 39, 13.5, 44, 19.5, 50, 24, 57, 28.5, 61.5, 32.5, 61, 37, 56, 39.5, 48, 41.5, 41, 45.5, 32, 49, 23, 47, 17, 40]), fur, 'fur', { s: 2, d: 1, hl: 1, dx: 0.9, dy: 0.7 });
  const cr = mp(p, blob([22, 41, 33, 38.5, 44, 39.5, 54, 39.6, 58, 39.2, 54, 42.5, 46, 45, 38, 48.5, 30, 50, 22, 47]), cream, 'cream', { s: 1, d: 0, hl: 1 });
  spikes(p, [[18, 40, 9, 45, -1], [20, 44, 12, 52, -1], [25, 47, 20, 56, 0]], cream, 'cream', 3);
  // 额毛
  spikes(p, [[25, 15, 23, 24, 1], [30, 13.5, 30, 22, 0]], fur, 'fur', 2.4);
  p.line([40, 20, 48, 25.5, 56, 29.5], h, 4, true);
  texture(p, ['fur'], 'fur', 'wf', 0.04);
  // 鼻
  const nose = p.add(blob([57, 29.5, 61, 30, 63, 33, 61, 35.5, 57.5, 34]), ['#000000', '#08080c', '#14141c', '#22222c', '#4a4a5a', '#9090a0'], 'nose');
  p.px(59, 31, nose, 5);
  // 狼嚎战士：战纹 + 獠牙项链 + 金耳环
  if (T === 2) {
    const wp = p.obj(['#3a0408', '#8a1014', '#c42020', '#e04030', '#f08060', '#ffc0a0'], 'paint', { ol: false });
    for (const [x0, y0, x1, y1] of [[20, 30, 27, 33], [21, 34, 28, 37], [23, 38, 30, 40.5]]) { p.line([x0, y0, x1, y1], wp, 3); p.line([x0, y0 + 1, x1 - 1, y1 + 1], wp, 2); }
    p.line([31, 15, 33, 21, 35, 22.5], wp, 3);
    for (let i = 0; i < 5; i++) { const x = 22 + i * 4.5, y = 58 + Math.sin((i / 4) * PI) * 3; mp(p, poly([x - 1.3, y, x + 1.3, y, x, y + 4.2]), TOOTH, 'tooth', { s: 0, hl: 1 }); }
    mp(p, ring(ell(30, 19, 2, 2.4), ell(30, 19, 1, 1.4)), METAL.gold, 'acc', { s: 0, hl: 1 });
  }
  // 眼
  const ec = hero ? (T === 2 ? '#ffc030' : '#e8b030') : '#ff4020';
  meye(p, 36, 26, 3, 1.8, ec, { rot: -0.3, glow: !hero || T === 2, px: 1 });
  mp(p, lock(29, 23.5, 43, 22, 1.6, -1), fur, 'fur', { s: 0, hl: 1 });
  // 嘴
  if (hero) { p.line([44, 44, 51, 42, 57, 39.4], cr, 1); p.line([40, 46, 44, 44], cr, 2); }
  else {
    p.add(blob([42, 42.5, 50, 40.8, 58, 39, 55, 43.4, 48, 45.6, 42, 46]), MOUTH_IN, 'mouth');
    fang(p, 54, 39.4, 3.4, 1, -0.4); fang(p, 47.5, 41, 3, 1); fangUp(p, 50, 45, 2.6, 0.9);
  }
  return p.render(BG);
}
// 风 / 精灵：漩涡 + 幽灵般的脸
function vortex(v, def, big) {
  const p = mpic();
  const col = vcol(v, def, { fire: '#f07030', water: '#4a90e0', earth: '#b08040', wood: '#60c060', metal: '#c0c0d0' });
  const pal = ramp(col, { lit: 0.45 });
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * PI * 3.2 + k * 2.1, r = 6 + t * (big ? 30 : 24); pts.push(32 + Math.cos(a) * r, 36 + Math.sin(a) * r * 0.85); }
    const inner = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * PI * 3.2 + k * 2.1, r = 6 + t * (big ? 30 : 24), w = 1 + t * 4.5; inner.push(32 + Math.cos(a) * (r - w), 36 + Math.sin(a) * (r - w) * 0.85); }
    const poly2 = [];
    for (let i = 0; i < pts.length; i += 2) poly2.push(pts[i], pts[i + 1]);
    for (let i = inner.length - 2; i >= 0; i -= 2) poly2.push(inner[i], inner[i + 1]);
    mp(p, poly(poly2), pal, 'wind', { s: 2, d: 0, hl: 1 });
  }
  const core = mp(p, ell(32, 36, 13, 15), pal, 'wind', { s: 3, d: 1, hl: 2 });
  p.shade(ell(28, 30, 5, 4), core, 5);
  // 脸
  const k = ['#000000', '#05101a', '#0a2030', '#10304a', '#ffffff', '#ffffff'];
  const e1 = p.add(blob([24, 34, 29, 32, 30, 37, 26, 37.6]), k, 'eye', { ol: false });
  const e2 = p.add(blob([34, 32, 39.5, 33.6, 38, 37.6, 34, 37]), k, 'eye', { ol: false });
  const gl = p.obj(['#000000', '#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'], 'g', { ol: false });
  p.px(27, 35, gl, 3); p.px(36, 35, gl, 3);
  p.add(blob([27, 42, 32, 41, 37, 42, 35, 46, 32, 47.5, 29, 46]), k, 'mouth', { ol: false });
  if (big) for (const [x, y] of [[8, 14], [54, 10], [58, 56], [6, 60]]) { const id = p.obj(pal, 'spark', { ol: false }); p.px(x, y, id, 5); p.px(x + 1, y, id, 4); p.px(x - 1, y, id, 4); p.px(x, y + 1, id, 4); p.px(x, y - 1, id, 4); }
  return p.render(BG);
}
const MONSTER_ALIAS = { wolf: 'wolfman', hawk: 'hawkman', demonSummon: 'demon' };
// 由人体系统绘制的怪物 / 特殊兵种
MONSTERS.medusa = (v) => drawHuman({ face: 'f', skin: 'snake', hair: vcol(v, '#3a8a4a'), hairStyle: 'snakes', iris: '#f0d020', eyes: 'girl', brow: 'angry', mouth: 'lips', body: 'princess', cloth: '#2a5a4a', trim: '#1a2a3a', head: 'tiara', earring: true, bg: BG });
MONSTERS.giant = (v) => drawHuman({ face: 'broad', skin: 'ogre', hairStyle: 'bald', eyes: 'none', brow: null, mouth: 'teeth', nose: 'big', body: 'vest', cloth: '#6a5a3a', scale: 1.22, lines: cyclopsEye, scar: c => { c.p.line([24, 22, 27, 27], c.face, 1, true); } });
MONSTERS.sphinx = (v) => drawHuman({ face: 'f', skin: 'tan', hairStyle: 'none', iris: '#e0b020', eyes: 'sharp', brow: 'stern', mouth: 'lips', body: 'lion', headBack: nemesBack, head: nemesFront, noEar: true, earring: false });
MONSTERS.hawkman = (v) => drawHuman({ face: 'man', skin: 'tan', hair: '#6a4024', hairStyle: 'shaggy', iris: '#e0a020', eyes: 'fierce', brow: 'angry', mouth: 'stern', nose: 'hook', body: 'hawk', cloth: vcol(v, '#5a3a24'), feather: '#d8cbb4', head: 'hawkHelm', back: c => wings(c, '#6a4a2a') });
MONSTERS.angel = (v) => drawHuman({ face: 'f', skin: 'fair', hair: '#f4dc8a', hairStyle: 'wavy', iris: '#5aa0e0', eyes: 'closed', brow: 'soft', mouth: 'small', body: 'priestRobe', cloth: '#f4f2f8', trim: '#d0a030', head: 'halo', back: c => wings(c, '#f0f0f8') });
function cyclopsEye(c) {
  const { p, F } = c;
  const id = p.obj(eyePal('#c02a10', '#1a0a08'), 'eye', { ol: false });
  const map = { K: [id, 0], W: [id, 2], w: [id, 3], D: [id, 4], I: [id, 5], L: [id, 6], H: [id, 7], P: [id, 8], s: 2, S: 1 };
  p.shade(blob([22, 26, 31, 23, 41, 26, 40, 29, 31, 27, 23, 29]), c.face, 1);
  p.shade(blob([22, 23, 31, 20, 41, 23, 41, 25.5, 31, 23, 22, 25.5]), c.face, 4);
  p.tmpl(26, 26, ['..SSSSSSS..', '.SKKKKKKKS.', 'SKwwwDDDwwK', 'KWWDDHPDDWK', 'KWWDPPPIDWK', 'KWWDIPIIDW.', '.KWWLLLLWK.', '..KKKKKKK..'], map);
  fangUp(c.p, 27, 46.5, 3, 1); fangUp(c.p, 37, 46.5, 3, 1);
}

// =====================================================================
// 转职外观：getPortrait(id, variant, tier) 时在基础设定上叠加每阶装备
// （脸、发色与标志物不变；阶数越高越华丽）
// =====================================================================
const mir = (a) => a.map((v, i) => (i % 2 ? v : 62.5 - v));
const shiftY = (a, d) => a.map((v, i) => (i % 2 ? v + d : v));
function emblem(c, x, y, r, gem) {
  piece(c, ell(x, y, r + 1.2, r + 1.3), METAL.gold, 'acc', { s: 1, hl: 1 });
  const g = piece(c, ell(x, y, r * 0.6, r * 0.65), rp(gem), 'acc', { s: 0, hl: 1 });
  c.p.px(x - 0.6, y - 0.8, g, 5);
}
// —— 身体层（画面坐标，S.over / S.back 中使用）——
const GEAR = {
  // 胸甲 + 护喉
  breast: (mt, gem) => c => {
    piece(c, blob([19, 74, 19.5, 63, 24, 57.5, 31, 56.6, 38.5, 57.5, 43.5, 62, 44.5, 74], 0.9), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.3 });
    piece(c, blob([23, 52, 31, 54.5, 40, 52, 41, 57, 31, 60, 22, 57]), mt, 'metal', { s: 1, hl: 1 });
    c.p.line([31, 61, 31, 73], 'metal', 2, true);
    if (gem) emblem(c, 31.5, 66, 2.2, gem);
  },
  // 肩甲：side 'L' / 'R' 只画一侧；big = 加大 + 金铆钉
  pauldrons: (mt, side, big) => c => {
    if (side !== 'R') pauldron(c, 9.5, 60.5, big ? 12.5 : 10.5, big ? 7.8 : 6.5, mt, 3, -0.2);
    if (side !== 'L') pauldron(c, 54, 62, big ? 10.5 : 8.5, big ? 7.2 : 6, mt, 2, 0.2);
    if (big) { rivet(c, 4, 58); rivet(c, 9.5, 56); rivet(c, 15, 57); rivet(c, 51, 58.5); rivet(c, 57, 59); }
  },
  // 半披肩：trim = 下缘金边
  mantle: (col, trim, side) => c => {
    const L = [-1, 72, -1, 60, 4, 55.5, 12, 52.6, 21, 51.8, 25.5, 55.5, 23, 61.5, 16, 67, 7, 71];
    for (const a of side === 'L' ? [L] : [L, mir(L)]) {
      if (trim) piece(c, blob(shiftY(a, 1.8)), trim, 'metal', { s: 1, hl: 1 });
      const id = piece(c, blob(a), rp(col), 'cloth', { s: 2, d: 1, hl: 1, dy: 0.7 });
      c.p.line([a[4], a[5] + 3, a[8] - 1, a[9] + 4, a[12], a[13]], id, 2, true);
    }
  },
  // 披风（背后，在两肩上方外扬）
  cape: (col, trim) => c => {
    const a = [-1, 74, -1, 50, 3, 45.5, 8, 49, 16, 52, 47, 52, 55, 49, 60, 45.5, 65, 50, 65, 74];
    if (trim) piece(c, blob(shiftY(a, -1.8)), trim, 'metal', { s: 1, hl: 1 });
    const id = piece(c, blob(a), rp(col), 'cape', { s: 2, d: 1, hl: 1 });
    c.p.line([3, 49, 1, 60], id, 2, true); c.p.line([60, 49, 62, 60], id, 2, true);
  },
  // 高立领（背后，自肩头呈扇形张开）
  collar: (col, lining, trim) => c => {
    const L = [25, 58, 14, 56.5, 6.5, 50, 3, 37, 9, 40, 15, 46, 21, 51];
    for (const a of [L, mir(L)]) {
      if (trim) piece(c, blob(a.map((v, i) => (i % 2 ? v - 1.4 : v + (v < 31 ? -1.4 : 1.4)))), trim, 'metal', { s: 1, hl: 1 });
      piece(c, blob(a), rp(col), 'cape', { s: 2, d: 1, hl: 1 });
      if (lining) piece(c, blob(a.map((v, i) => (i % 2 ? 0.7 * v + 0.3 * 53 : 0.7 * v + 0.3 * (a[0] < 31 ? 16 : 46.5)))), rp(lining), 'cape', { s: 1, hl: 1 });
    }
  },
  // 圣光环（背后）
  aura: (col) => c => {
    const { p } = c, pal = rp(col, { lit: 0.5 });
    const id = p.obj(pal, 'aura', { ol: false });
    for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r0 = 23.5, r1 = i % 2 ? 27.5 : 30.5; p.line([31 + Math.cos(a) * r0, 27 + Math.sin(a) * r0, 31 + Math.cos(a) * r1, 27 + Math.sin(a) * r1], id, i % 2 ? 2 : 3); }
    p.fill(ring(ell(31, 27, 25, 25), ell(31, 27, 22.6, 22.6)), id, 4);
    p.fill(ring(ell(31, 27, 23.6, 23.6), ell(31, 27, 23, 23)), id, 5);
  },
  // 斜挎皮带
  strap: (col) => c => { piece(c, lock(8, 58, 46, 74, 3, 1.5, 3), rp(col || '#6a4020'), 'cloth', { s: 1, hl: 1 }); rivet(c, 27, 66); },
  // 交叉皮带（格斗者）
  xstrap: (col) => c => {
    piece(c, union(lock(10, 57, 44, 74, 2.6, 1, 2.6), lock(52, 58, 18, 74, 2.6, -1, 2.6)), rp(col || '#5a3418'), 'cloth', { s: 1, hl: 1 });
    piece(c, ell(31, 66.5, 2.6, 2.4), METAL.steel, 'metal', { s: 1, hl: 1 });
  },
  // 罩袍 + 十字
  tabard: (col, cross) => c => {
    piece(c, blob([17, 74, 18.5, 62, 24, 58.5, 39, 58.5, 44.5, 62, 46, 74]), rp(col), 'cloth', { s: 2, d: 1, hl: 1 });
    piece(c, union(rect(30, 61, 3, 12), rect(26, 64, 11, 3)), cross || METAL.gold, 'acc', { s: 1, hl: 1 });
  },
  // 武士胴甲（漆札 + 缕线）
  dou: (col, lace) => c => {
    const id = piece(c, blob([18, 74, 18.5, 63, 23, 59, 31, 58, 39, 59, 44, 63, 45, 74], 0.9), rp(col), 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.3 });
    for (const y of [63, 67, 71]) c.p.line([18.5, y, 31, y - 1, 44.5, y], id, 1, true);
    const lc = c.p.obj(lace ? rp(lace) : rp('#d8c8a0'), 'acc', { ol: false });
    for (let x = 21; x < 44; x += 3) for (const y of [64.5, 68.5, 72.5]) c.p.px(x, y - (x > 26 && x < 37 ? 1 : 0), lc, 4);
    piece(c, blob([23, 58.5, 31, 57.4, 39, 58.5, 38, 61, 31, 60, 24, 61]), lace ? METAL.gold : rp('#c8b890'), 'acc', { s: 0, hl: 1 });
  },
  // 阵羽织（武将披肩）
  jinbaori: (col, trim) => c => {
    for (const a of [[-1, 74, -1, 60, 5, 55, 14, 53, 21, 53.5, 19, 62, 17, 74], mir([-1, 74, -1, 60, 5, 55, 14, 53, 21, 53.5, 19, 62, 17, 74])]) {
      if (trim) piece(c, blob(a.map((v, i) => (i % 2 ? v : (a[0] < 31 ? v + 1.6 : v - 1.6)))), trim, 'metal', { s: 1, hl: 1 });
      piece(c, blob(a), rp(col), 'cloth', { s: 2, d: 1, hl: 1 });
    }
  },
  // 孟祈的红围巾（叠在铠甲之上）
  scarf: (col) => c => {
    const sc = rp(col || '#cc262a');
    const sid = piece(c, blob([22.5, 50.5, 30, 53.5, 39.5, 50.5, 40.5, 55, 31, 58.5, 22, 55.5]), sc, 'scarf', { s: 2, hl: 1 });
    piece(c, lock(27, 56, 24.5, 70.5, 3, 1, 1.6), sc, 'scarf', { s: 1, hl: 1 });
    piece(c, lock(29.5, 56.5, 30.5, 67, 2.4, -0.5, 1.2), sc, 'scarf', { s: 1, hl: 1 });
    folds(c, sid, [[25, 54, 31, 56.4, 37, 54]]);
  },
  emblem: (gem, x, y, r) => c => emblem(c, x || 31.5, y || 66, r || 2.4, gem),
  // 圣职披肩（胸前两条垂带 + 金十字）
  stole: (col) => c => {
    const st = rp(col);
    piece(c, poly([22, 56, 26.5, 57.5, 27.5, 74, 22.5, 74]), st, 'cloth', { s: 1, hl: 1 });
    piece(c, poly([36.5, 57.5, 41, 56, 41.5, 74, 36.5, 74]), st, 'cloth', { s: 2, hl: 1 });
    for (const x of [25, 39]) piece(c, union(rect(x - 0.6, 66, 1.8, 5), rect(x - 1.9, 67.4, 4.4, 1.6)), METAL.gold, 'acc', { s: 0, hl: 1 });
  },
  // 圣职大十字
  cross: (big) => c => piece(c, union(rect(30, big ? 60 : 62, 3, big ? 12 : 9), rect(26.5, big ? 63 : 64.5, 10, 2.6)), METAL.gold, 'acc', { s: 1, hl: 1 }),
  // 星纹（披肩 / 法袍点缀）
  stars: (col, pts) => c => {
    const id = c.p.obj(rp(col || '#f4e070', { lit: 0.5 }), 'acc', { ol: false });
    for (const [x, y] of pts || [[6, 63], [14, 59], [50, 61], [57, 65], [10, 68]]) { c.p.px(x, y, id, 5); c.p.px(x - 1, y, id, 3); c.p.px(x + 1, y, id, 3); c.p.px(x, y - 1, id, 3); c.p.px(x, y + 1, id, 3); }
  },
  // 皮护腕 / 臂甲（画面左下角）
  bracer: (mt) => c => { piece(c, poly([0, 66, 7, 64, 9, 74, 0, 74]), mt, 'metal', { s: 1, hl: 1 }); },
  // 弩（背后右肩）
  crossbow: (mt, wood, rep) => c => {
    const { p } = c;
    const w = rp(wood || '#7a4a22');
    piece(c, lock(47, 62, 56, 30, 3.4, 0, 2.6), w, 'acc', { s: 1, hl: 1 });
    const pts = [], inn = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, x = 45 + t * 20, y = 31 - Math.sin(t * PI) * 4 + t * 6; const ww = 1.7 - Math.abs(t - 0.5) * 1.6; pts.push(x, y - ww); inn.unshift(x, y + ww); }
    piece(c, poly(pts.concat(inn)), mt, 'metal', { s: 1, hl: 1 });
    p.line([45.5, 31.5, 54, 40, 64, 37.5], p.add(rect(0, 0, 0, 0), ['#202020', '#5a5a60', '#7a7a80', '#9a9aa0', '#c0c0c8', '#e0e0e8'], 'string', { ol: false }), 3);
    piece(c, ell(55, 31.5, 2, 2), mt, 'metal', { s: 0, hl: 1 });
    if (rep) piece(c, poly([50, 41, 57, 36, 60, 40, 53, 45]), mt, 'metal', { s: 1, hl: 1 }); // 连弩弹匣
  },
};
// —— 头部层（脸部坐标）——
const HG = {
  // 额环：mt 金属色阶；gem 宝石；wings 两侧羽翼
  circlet: (mt, gem, wings) => c => {
    const { p } = c;
    if (wings) for (const [x0, d] of [[20, -1], [42.5, 1]]) for (let i = 0; i < 3; i++) piece(c, lock(x0, 20.5 - i * 1.2, x0 + d * (11 - i * 2.4), 12 - i * 4, 2.8 - i * 0.5, d * 1.4, 0.4), mt, 'metal', { s: 1, hl: 1 });
    const b = piece(c, blob([19.4, 20.4, 31, 18.2, 43.4, 20, 43.4, 22.8, 31, 21, 19.4, 23.2]), mt, 'metal', { s: 1, hl: 1, dy: 1, dx: 0.3 });
    if (gem) {
      piece(c, poly([28.4, 19.6, 31, 15, 33.6, 19.6, 31, 22.2]), mt, 'metal', { s: 1, hl: 1 });
      const g = piece(c, ell(31, 19.2, 1.4, 1.7), rp(gem), 'acc', { s: 0, hl: 1 }); p.px(30.5, 18.4, g, 5);
    }
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 兜帽金边
  hoodGold: (open) => c => {
    const o = open || [18.5, 41, 18.5, 24, 23.5, 15, 31, 13, 38.5, 15, 44, 24, 44, 41, 38, 49, 31, 51.5, 24, 49];
    const big = o.map((v, i) => (i % 2 ? 32 + (v - 32) * 1.065 : 31 + (v - 31) * 1.065));
    piece(c, ring(blob(big), blob(o)), METAL.gold, 'metal', { s: 1, hl: 1 });
  },
  // 猎帽 + 羽毛
  featherCap: (col, feather, n, band) => c => {
    const { p } = c;
    const hp = rp(col);
    if (n > 1) { const f2 = piece(c, lock(23, 13, 9, 7, 2.6, 2.5, 0.4), rp(n > 2 ? '#f4f0e0' : feather), 'feather', { s: 1, hl: 1 }); p.line([23, 13, 15, 9.5], f2, 2, true); }
    const f = piece(c, lock(24, 12, 8, -1, 3.2, 3, 0.4), rp(feather), 'feather', { s: 1, hl: 1 });
    p.line([24, 12, 16, 5, 9, 0], f, 2, true);
    const cap = piece(c, blob([17.5, 21, 18.5, 13, 24, 8, 32, 6.4, 40, 8.2, 45, 13, 47, 19.5, 41, 17.5, 31, 16.6, 23, 18.6]), hp, 'hat', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.5 });
    p.line([24, 8.5, 33, 12, 44.5, 16], cap, 2, true);
    piece(c, blob([17, 19.6, 24, 17.4, 31, 16.4, 41, 17.4, 47.4, 19.4, 47.6, 22, 41, 20, 31, 19, 24, 20, 17, 22.6]), band || hp, band ? 'metal' : 'hat', { s: 1, hl: 1, dy: 1 });
    if (band) { const g = piece(c, ell(24, 18.6, 1.5, 1.6), rp('#d02a3a'), 'acc', { s: 0, hl: 1 }); p.px(23.5, 18, g, 5); }
    p.cast(['hat', 'metal'], ['skin', 'hair'], 0, 1, 2, 3); p.cast(['hat', 'metal'], ['skin', 'hair'], 0, 2, 2, 3);
  },
  // 魔法帽（帽尖向后垂）
  mageHat: (col, band, star) => c => {
    const { p } = c;
    const old = TF; if (TF) TF = [TF[0], TF[1], TF[2] + 2.5 / (1 - TF[0])];
    const hp = rp(col);
    const crown = piece(c, blob([19.5, 15, 21, 8, 25.5, 3.2, 33, 1.4, 42, 2.6, 50, 6, 56, 11.6, 51.5, 11.6, 46, 9.6, 42.5, 9.8, 43.5, 15]), hp, 'hat', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.5 });
    p.line([26, 4, 33, 7, 41, 6, 49, 8.5], crown, 2, true);
    const brim = piece(c, blob([4, 18.4, 12, 14.4, 22, 12.6, 31, 12.2, 41, 12.8, 51, 14.6, 59, 18.8, 50, 20.4, 41, 20.4, 31, 19.6, 22, 20.6, 12, 21], 0.9), hp, 'hat', { s: 2, d: 1, hl: 1, dy: 1, dx: 0.4 });
    p.line([4.5, 19, 12, 20.6, 22, 20.2, 31, 19.2, 41, 20, 50, 20, 58.5, 19], brim, 1, true);
    if (band) piece(c, blob([20, 12.4, 31, 11, 43, 12.4, 43.2, 15.4, 31, 14, 19.8, 15.6]), Array.isArray(band) ? band : rp(band), 'metal', { s: 1, hl: 1 });
    if (star) {
      const sp = rp(star, { lit: 0.5 }), s = piece(c, poly([31, 7, 32.3, 10.6, 36, 12.4, 32.3, 14, 31, 17.6, 29.7, 14, 26, 12.4, 29.7, 10.6]), sp, 'acc', { s: 0, hl: 1 });
      p.px(31, 12, s, 5);
      piece(c, ell(55.2, 12.4, 1.8, 1.8), sp, 'acc', { s: 0, hl: 1 });
    }
    TF = old;
    p.cast('hat', ['skin', 'hair'], 0, 1, 2, 3); p.cast('hat', ['skin', 'hair'], 0, 2, 2, 3);
  },
  // 小圆帽（祭司）
  skullcap: (col) => c => {
    const id = piece(c, blob([20, 18.5, 22, 11.5, 31, 8.6, 40, 11.5, 42.5, 18.5, 31, 15.6]), rp(col), 'hat', { s: 2, d: 1, hl: 1, dy: 0.6 });
    c.p.line([31, 9, 31, 15.6], id, 2, true);
    c.p.cast('hat', ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 兜帽双角（魔道士）
  hoodHorns: (col) => c => {
    piece(c, union(lock(18, 17, 4, 8, 3.8, 4, 0.4), lock(44.5, 16, 58, 6, 3.8, -4, 0.4)), rp(col), 'horn', { s: 2, d: 1, hl: 1 });
    for (const [x, y] of [[11, 10.5], [52, 9.5]]) c.p.line([x - 1, y + 1.5, x + 1, y - 1.5], 'horn', 1, true);
  },
  // 额前宝石链（咒术 / 魔道）
  hoodGem: (gem) => c => {
    const g = piece(c, union(poly([31, 13.5, 34.2, 17, 31, 20.5, 27.8, 17])), METAL.gold, 'metal', { s: 1, hl: 1 });
    const j = piece(c, ell(31, 17, 1.4, 1.8), rp(gem), 'acc', { s: 0, hl: 1 }); c.p.px(30.5, 16.4, j, 5);
  },
  // 凤冠（大法师）
  phoenix: c => {
    const { p } = c, g = METAL.gold;
    for (const [x0, d] of [[21, -1], [41.5, 1]]) for (let i = 0; i < 4; i++) piece(c, lock(x0, 18 - i * 1.4, x0 + d * (13 - i * 2.4), 9 - i * 3.6, 2.6 - i * 0.35, d * 1.6, 0.35), g, 'metal', { s: 1, hl: 1 });
    piece(c, union(lock(31, 16, 31, 5, 3.2, 0, 0.6), lock(31, 14, 25, 6, 2.2, 1, 0.4), lock(31, 14, 37, 6, 2.2, -1, 0.4)), g, 'metal', { s: 1, hl: 1 });
    const j = piece(c, ell(31, 11, 1.8, 2.1), rp('#e02a5a'), 'acc', { s: 0, hl: 1 }); p.px(30.5, 10, j, 5);
  },
};
const GOLD = METAL.gold, SILVER = METAL.silver, STEEL = METAL.steel;
const STEEL_BLUE = ['#10162a', '#2e4470', '#46649c', '#6a8ac4', '#a8c4ec', '#eef6ff'];
// 每位英雄：native = 当前设定对应的阶（tier 未指定时即此外观）；t[i] = 第 i 阶的覆盖项
const SW = (x, y, bl, gd) => c => sword(c, x, y, bl, gd);
const TIER_LOOK = {
  // 作家 → 侠客 → 剑道家 → 圣剑士 → 剑侠 → 剑王 → 剑圣（红围巾贯穿始终）
  mengqi: { native: 0, t: [
    {},
    { over: [GEAR.pauldrons(rp('#7a4a24'), 'L'), GEAR.strap('#5a3418'), GEAR.scarf()], back: SW(53, 35) },
    { body: 'master', cloth: '#34406e', over: [GEAR.pauldrons(STEEL, 'L'), GEAR.scarf()], head: HG.circlet(STEEL), back: SW(53, 35) },
    { body: 'lightArmor', cloth: '#3a5ab8', metal: SILVER, over: [GEAR.scarf()], head: HG.circlet(SILVER, '#3a8ae0'), back: SW(53, 35, SILVER) },
    { body: 'plate', metal: SILVER, cape: '#2a4a9a', over: [GEAR.mantle('#2a4a9a', SILVER, 'L'), GEAR.scarf()], head: HG.circlet(SILVER, '#3a8ae0', true), back: [GEAR.cape('#2a4a9a'), SW(53, 35, SILVER)] },
    { body: 'plate', metal: SILVER, cape: '#a02a32', over: [GEAR.mantle('#a02a32', GOLD), GEAR.pauldrons(GOLD), GEAR.scarf(), GEAR.emblem('#2a6ae0')], head: HG.circlet(GOLD, '#2a6ae0', true), back: [GEAR.cape('#a02a32', GOLD), SW(53, 35, SILVER, GOLD)] },
    { body: 'plate', metal: GOLD, cape: '#f0eef6', over: [GEAR.mantle('#f0eef6', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.scarf(), GEAR.emblem('#d02030', 31.5, 66, 2.8)], head: HG.circlet(GOLD, '#e02a3a', true), back: [GEAR.aura('#f4d468'), GEAR.cape('#f0eef6', GOLD), SW(53, 35, ['#2a1a40', '#5a7ab0', '#8ab4e8', '#c4e4ff', '#eef8ff', '#ffffff'], GOLD)] },
  ] },
  // 剑士 → 高级剑士 → 银剑士 → 黄金剑士 → 大剑师（青绿色基调）
  oz: { native: 0, t: [
    {},
    { over: [GEAR.pauldrons(STEEL, 'L'), GEAR.bracer(STEEL)], head: 'headband', band: '#2e7a6a', bandPlate: true },
    { body: 'lightArmor', cloth: '#2e7a6a', metal: SILVER, over: [GEAR.strap('#6a4020')], head: 'headband', band: '#2e7a6a', bandPlate: SILVER, back: SW(52, 36, SILVER) },
    { body: 'lightArmor', cloth: '#2e7a6a', metal: GOLD, over: [GEAR.mantle('#2e7a6a', GOLD, 'L'), GEAR.pauldrons(GOLD, 'R')], head: HG.circlet(GOLD, '#30c090'), back: [GEAR.cape('#2e7a6a'), SW(52, 36, SILVER, GOLD)] },
    { body: 'plate', metal: GOLD, cape: '#1e6a5a', over: [GEAR.mantle('#f0ece0', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#30c090', 31.5, 66, 2.8)], head: HG.circlet(GOLD, '#30c090', true), back: [GEAR.cape('#1e6a5a', GOLD), SW(52, 36, ['#1a2a30', '#4a8a8a', '#7ac4c0', '#b4ece4', '#e4fff8', '#ffffff'], GOLD)] },
  ] },
  // 骑枪兵 → 旋风骑士 → 疾风骑士 → 飞马骑士 → 飞龙骑士
  yangtie: { native: 0, t: [
    {},
    { over: [GEAR.mantle('#2c5aa0', null, 'L')], head: HG.circlet(STEEL) },
    { body: 'plate', metal: STEEL, cape: '#2c5aa0', head: 'kettle', nasal: false, crest: '#3a6ad0', back: GEAR.cape('#2c5aa0') },
    { body: 'plate', metal: SILVER, cape: '#2c5aa0', over: [GEAR.mantle('#2c5aa0', SILVER, 'L')], head: 'plumeHelm', plume: '#f0f0f8', helmWings: '#f4f4fc', back: GEAR.cape('#2c5aa0', SILVER) },
    { body: 'plate', metal: STEEL_BLUE, cape: '#1e3a7a', over: [GEAR.mantle('#1e3a7a', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#d02030')], head: 'plumeHelm', helmMetal: STEEL_BLUE, helmRidge: GOLD, helmHorns: '#e8d8b0', helmGem: '#d02030', plume: '#3a7ae0', back: GEAR.cape('#1e3a7a', GOLD) },
  ] },
  kaidi: { native: 3, t: [
    { body: 'lightArmor', cloth: '#a82a3a', head: null },
    { body: 'lightArmor', cloth: '#a82a3a', over: [GEAR.mantle('#c02a3a', null, 'L')], head: HG.circlet(STEEL) },
    { body: 'plate', metal: STEEL, head: 'plumeHelm', helmMetal: STEEL, plume: false },
    {},
    { metal: GOLD, over: [GEAR.mantle('#c02a3a', GOLD), GEAR.emblem('#2a6ae0')], helmMetal: GOLD, helmBand: SILVER, helmRidge: SILVER, helmHorns: '#f4ecd8', helmGem: '#2a6ae0', helmWings: '#f4f0f8', back: GEAR.cape('#c02a3a', GOLD) },
  ] },
  // 战士 → 格斗者 → 圣战士 → 光明战士 → 终极战士
  klein: { native: 0, t: [
    {},
    { over: [GEAR.xstrap(), GEAR.pauldrons(STEEL, 'R'), GEAR.bracer(STEEL)] },
    { body: 'plate', metal: STEEL, torso: 'broad', over: [GEAR.tabard('#eeeaf0')], bandPlate: GOLD },
    { body: 'plate', metal: SILVER, torso: 'broad', cape: '#f0eef6', over: [GEAR.tabard('#f4f2f8'), GEAR.pauldrons(GOLD, 'L'), GEAR.emblem('#f0c020', 31.5, 66, 2.6)], bandPlate: GOLD, bandGem: '#3a8ae0', back: GEAR.cape('#f0eef6', GOLD) },
    { body: 'plate', metal: GOLD, torso: 'broad', cape: '#a01a1a', over: [GEAR.mantle('#a01a1a', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#d02030', 31.5, 66, 2.8)], band: '#c82020', bandPlate: GOLD, bandGem: '#d02030', back: [GEAR.aura('#ff8a3a'), GEAR.cape('#a01a1a', GOLD)] },
  ] },
  augustus: { native: 4, t: [
    { body: 'vest', cloth: '#5a4a3a', skin: 'warm', metal: null, cape: null, emblem: null },
    { body: 'vest', cloth: '#4a3a2a', metal: null, cape: null, emblem: null, over: [GEAR.xstrap(), GEAR.pauldrons(STEEL, 'R')] },
    { metal: STEEL, cape: null, emblem: null, over: [GEAR.tabard('#eeeaf0')] },
    { metal: SILVER, cape: '#f0eef6', emblem: '#3a8ae0', back: GEAR.cape('#f0eef6') },
    {},
  ] },
  // 次级武士 → 中级武士 → 高级武士 → 将军 → 大将军
  slade: { native: 0, t: [
    {},
    { over: [GEAR.dou('#3a2a2e')], head: 'headband', band: '#ece8e0' },
    { over: [GEAR.dou('#5a1c22')], headBack: kabutoBack, head: 'kabuto', helm: '#2a2a3a', kuwa: 'small' },
    { armor: '#a82228', over: [GEAR.dou('#8a1c22', '#e8c050')], headBack: kabutoBack, head: 'kabuto', helm: '#2a2a3a', kuwa: 'big' },
    { armor: '#1e1e28', over: [GEAR.jinbaori('#b01e24', GOLD), GEAR.dou('#1e1e28', '#e8c050')], headBack: kabutoBack, head: 'kabuto', helm: '#1a1a24', kuwa: 'grand', back: GEAR.aura('#f07030') },
  ] },
  // 猎人 → 弓箭手 → 神箭手 → 弩手 → 连弩手
  judy: { native: 0, t: [
    {},
    { head: HG.featherCap('#2e6a2e', '#d84a3a', 1), back: [bow, quiver] },
    { over: [GEAR.mantle('#2a5a2a', rp('#8a5a2c'))], head: HG.featherCap('#2e6a2e', '#d84a3a', 2), back: [bow, quiver] },
    { body: 'coat', cloth: '#2a5a3a', epaulette: STEEL, over: [GEAR.crossbow(STEEL), GEAR.pauldrons(STEEL, 'L')], head: HG.featherCap('#2a4a2a', '#d84a3a', 2, STEEL), back: null },
    { body: 'coat', cloth: '#1e4a30', epaulette: GOLD, over: [GEAR.crossbow(GOLD, '#5a2a1a', true), GEAR.mantle('#1e4a30', GOLD, 'L'), GEAR.emblem('#d02a3a', 31.5, 59, 1.8)], head: HG.featherCap('#1e3a24', '#e83a2a', 3, GOLD), back: GEAR.cape('#1e4a30', GOLD) },
  ] },
  hake: { native: 3, t: [
    { body: 'archer', cloth: '#6a5a3a', head: 'bandana', band: '#2a3a6a', back: bow },
    { body: 'archer', cloth: '#2a3a6a', head: 'bandana', band: '#a82a2a', back: [bow, quiver] },
    { cloth: '#5a3e26', epaulette: false, hat: '#3a2a1e', hatFeather: false, back: bow },
    {},
    { over: [GEAR.crossbow(GOLD, '#5a2a1a', true), GEAR.mantle('#a01a24', GOLD, 'L'), GEAR.emblem('#d02030', 31.5, 59, 1.8)], hatTrim: GOLD, hatFeather: '#f4f0e8', hatPlume: '#d82a2a', back: GEAR.cape('#a01a24', GOLD) },
  ] },
  // 修士 → 牧师 → 祭司 → 主教 → 大神官
  xueer: { native: 0, t: [
    {},
    { over: [GEAR.stole('#3a5ab8')], head: ['hood', HG.hoodGold()] },
    { over: [GEAR.mantle('#3a5ab8', GOLD), GEAR.cross()], head: ['hood', HG.hoodGold(), HG.circlet(GOLD, '#3a8ae0')] },
    { body: 'highPriest', trim: '#3a5ab8', over: [GEAR.mantle('#f4f2f8', GOLD)], head: ['hood', HG.hoodGold(), 'tiara'] },
    { body: 'highPriest', trim: '#3a5ab8', over: [GEAR.mantle('#3a5ab8', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]]), GEAR.cross(true)], head: ['hood', HG.hoodGold(), HG.circlet(GOLD, '#e02a5a', true)], back: GEAR.aura('#fff0a0') },
  ] },
  qu: { native: 3, t: [
    { body: 'monkRobe', cloth: '#8a7a64', trim: '#5a4a34', headBack: 'hood', head: 'hood', hood: '#a89a84' },
    { body: 'priestRobe', cloth: '#eeeaf2', trim: '#a82a3a', headBack: 'hood', head: ['hood', HG.hoodGold()], hood: '#f0eef4' },
    { head: HG.skullcap('#a82a3a') },
    {},
    { over: [GEAR.mantle('#a82a3a', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], mitre: '#f0d070', back: GEAR.aura('#fff0a0') },
  ] },
  // 咒术师 → 巫师 → 魔道士
  hao: { native: 0, t: [
    {},
    { over: [GEAR.mantle('#30184a', rp('#8a4ab8'))], head: ['hoodShadow', HG.hoodGold([19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49]), HG.hoodGem('#c02040')] },
    { cloth: '#2a1638', hood: '#3a1a4e', trim: '#1a0e28', over: [GEAR.mantle('#2a1638', GOLD)], head: ['hoodShadow', HG.hoodGold([19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49]), HG.hoodHorns('#d8ccb4'), HG.hoodGem('#ff3040')], back: [GEAR.aura('#a040e0'), GEAR.collar('#2a1638', '#a01a3a', GOLD)] },
  ] },
  // 魔术士 → 魔术师 → 魔法师 → 法师 → 大法师
  wushuang: { native: 1, t: [
    { body: 'mageRobe', trim: '#d8c8e8', head: HG.circlet(GOLD, '#e02a5a'), earring: false },
    {},
    { back: GEAR.collar('#30206a', '#8a2a5a', GOLD) },
    { over: [GEAR.mantle('#30206a', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], back: GEAR.collar('#30206a', '#8a2a5a', GOLD) },
    { over: [GEAR.mantle('#30206a', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66], [10, 68.5]])], head: [HG.phoenix, 'tiara'], back: [GEAR.aura('#e080ff'), GEAR.collar('#30206a', '#c02a6a', GOLD)] },
  ] },
  lian: { native: 1, t: [
    { cloth: '#56689a', trim: '#8496c4' },
    {},
    { head: HG.mageHat('#2a4aa0', '#eae6f0') },
    { over: [GEAR.mantle('#2a4aa0', rp('#eae6f0')), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], head: HG.mageHat('#2a4aa0', GOLD, '#f4e070') },
    { cloth: '#22307a', over: [GEAR.mantle('#1a2a6a', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66], [10, 68.5]])], head: HG.mageHat('#1a2a6a', GOLD, '#f4e070'), back: [GEAR.aura('#80c0ff'), GEAR.collar('#1a2a6a', '#3a5ac0', GOLD)] },
  ] },
  // 鹰族士兵 → 鹰战士 → 飞鹰战士
  dvra: { native: 1, t: [
    { featherN: 3, featherBand: rp('#7a5030'), featherGems: false, cloth: '#7a6444', earring: false, back: c => wings(c, '#7a5030', 0.72, 4) },
    {},
    { featherN: 7, featherBand: GOLD, over: [GEAR.breast(GOLD, '#30b0b0'), GEAR.pauldrons(GOLD, null, false)], back: c => wings(c, '#9a6a3a', 1.18, 7) },
  ] },
};
function tierSpec(id, tier) {
  const base = HERO_SPECS[id];
  const L = TIER_LOOK[id];
  if (!base || !L || tier == null) return base;
  const t = clamp(tier | 0, 0, L.t.length - 1);
  if (t === L.native) return base;
  return Object.assign({}, base, L.t[t]);
}
// 特殊角色的阶数（坎培特 / 拉拉 当前设定 = 第 1 阶）
function heroTier(id, tier) {
  const n = { kampeite: 3, lala: 4 }[id];
  return tier == null || !n ? null : clamp(tier | 0, 0, n - 1);
}

// =====================================================================
// 对外接口
// =====================================================================
const CACHE = {};
function silhouette() {
  const p = new Pic();
  const sp = ['#05060e', '#0c1024', '#141a36', '#1c2446', '#26305a', '#323e70'];
  const h = p.add(ell(32, 30, 12.5, 14.5), sp, 'x');
  const b = p.add(blob([2, 73, 6, 60, 20, 53, 44, 53, 58, 60, 62, 73]), sp, 'x');
  p.auto([h, b], { s: 3, hl: 1 });
  return p.render(BG);
}
function heroSpec(id) {
  const s = HERO_SPECS[id];
  if (s) return s;
  // 未知但存在于 HEROES 的角色：用发色生成一个通用形象
  if (typeof HEROES !== 'undefined' && HEROES[id]) {
    const h = HEROES[id];
    return { face: 'm', skin: 'fair', hair: h.hair || '#3a2a20', hairStyle: 'short', eyes: 'hero', mouth: 'neutral', body: 'tunic' };
  }
  return null;
}
function build(id, variant, tier) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('enemy:')) {
    let k = id.slice(6);
    if (!variant && k.indexOf(':') > 0) { variant = k.split(':')[1]; k = k.split(':')[0]; }
    if (MONSTER_ALIAS[k]) k = MONSTER_ALIAS[k];
    if (k === 'shaman') return drawHuman(shamanSpec(variant));
    if (MONSTERS[k]) return MONSTERS[k](variant);
    const hs = enemyHuman(k, variant);
    if (hs) return drawHuman(hs);
    return null;
  }
  const s = heroSpec(id);
  if (!s) return null;
  if (s.special) return MONSTERS[s.special](variant, true, heroTier(id, tier));
  return drawHuman(tierSpec(id, tier) || s);
}
// tier：职业阶（0 起）；未指定 = 角色当前默认外观。仅对我方英雄有效
function getPortrait(id, variant, tier) {
  if (typeof id === 'string' && id.startsWith('enemy:')) tier = null;
  const key = id + '|' + (variant || '') + (tier == null ? '' : '|' + tier);
  if (CACHE[key]) return CACHE[key];
  let c = null;
  try { c = build(id, variant, tier); } catch (e) { TF = null; if (G.console) console.warn('portrait', id, e); c = null; }
  TF = null;
  if (!c) c = CACHE['?'] || (CACHE['?'] = silhouette());
  else c.className = 'pix portrait';
  CACHE[key] = c;
  return c;
}
G.getPortrait = getPortrait;
})(typeof window !== 'undefined' ? window : this);
