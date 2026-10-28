// 对话立绘：64×72 代码绘制的 90 年代动画风半身像（无外部图片）
// getPortrait(id, variant, tier, path) → HTMLCanvasElement（已缓存），放大显示时请使用 image-rendering: pixelated
// tier = 职业阶（CLASSES[cls].tiers 的下标）：转职后换装；省略则为角色默认外观；path 'b' = 分支 B 路线外观
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
// Q 版：圆脸、短下巴、宽脸颊（脸部坐标，整体由头部缩放放大）
const FACES = {
  // 少年
  m: { pts: [20.5, 22, 19.6, 30, 20.2, 36.5, 22.6, 41.2, 26.4, 44.6, 31.4, 46, 36, 44.4, 39.8, 40.6, 42, 35, 42.8, 28, 41, 21, 31, 17, 23, 18.5],
    ey: 31.5, nx: 21.6, fx: 33.4, nose: [35.4, 39.4], mouth: [33.6, 41.9], ear: [20.2, 33], neck: [27.4, 34.8], chin: [31.4, 46], shadowX: 39.6 },
  // 少女
  f: { pts: [21, 22.5, 20.2, 30, 20.8, 36.5, 23, 41, 26.8, 44.2, 31.4, 45.4, 35.6, 43.8, 39.4, 40.2, 41.6, 34.6, 42.4, 27.6, 40.6, 21, 31, 17, 23.5, 18.8],
    ey: 31.5, nx: 21.8, fx: 33.4, nose: [35.4, 39.4], mouth: [33.6, 41.8], ear: [20.6, 33], neck: [28, 34.2], chin: [31.4, 45.4], shadowX: 39.2 },
  // 成年男子（下巴稍长）
  man: { pts: [20.6, 21.5, 19.8, 30, 20.4, 37, 22.6, 41.8, 26.4, 45.4, 31.6, 47, 36.4, 45, 40, 41.2, 42.2, 35, 42.8, 27.6, 41, 21, 31, 16.6, 23, 18.4],
    ey: 31.5, nx: 21.6, fx: 33.4, nose: [35.6, 39.4], mouth: [33.6, 42.4], ear: [20.4, 33], neck: [27.4, 35], chin: [31.6, 47], shadowX: 39.8 },
  // 魁梧（方下巴）
  broad: { pts: [19.6, 21.5, 19, 30, 19.4, 38, 21.8, 42.8, 26, 46.2, 32, 47.4, 37.4, 45.6, 41, 41.6, 43, 35, 43.4, 27.6, 41.2, 21, 31, 16.4, 22.5, 18.2],
    ey: 31.5, nx: 21.6, fx: 33.6, nose: [35.8, 39.4], mouth: [33.8, 42.6], ear: [19.4, 33], neck: [26.8, 35.6], chin: [32, 47.4], shadowX: 40.2 },
  // 老人
  old: { pts: [20.6, 21.5, 19.8, 30, 20.6, 37, 23, 41.8, 26.8, 45.4, 31.6, 46.8, 36, 45, 39.6, 41.4, 41.8, 35, 42.6, 27.6, 41, 21, 31, 16.6, 23, 18.4],
    ey: 31.5, nx: 21.6, fx: 33.4, nose: [35.6, 39.4], mouth: [33.6, 42.4], ear: [20.4, 33], neck: [27.6, 34.8], chin: [31.6, 46.8], shadowX: 39.6 },
};
// Q 版比例：头部放大（以 [31, py] 为基准），身体缩小（以 [bx, by] 为基准）
const CHIBI = { s: 1.38, py: 25.4, bs: 0.8, bx: 31.5, by: 79 };

// 发色色阶：深色头发的高光偏冷蓝，更有动画感
function hairRamp(hex) {
  const r = ramp(hex, { shift: 14, lit: 0.3 });
  const [, , l] = r2hsl(...h2r(hex));
  if (l < 0.3) { r[4] = mix(hex, '#6c7cb4', 0.42); r[5] = mix(hex, '#b4c4f0', 0.62); r[0] = mix(hex, '#000000', 0.6); }
  return r;
}

SKIN.sea = ['#10283a', '#3a6a8a', '#6aa0b8', '#a8d4e0', '#cceef4', '#f0fcff', '#4a8aa0', '#e0a0b0'];
SKIN.goblin = ['#142010', '#3a5a24', '#5a8a3a', '#82b058', '#a8d07a', '#d4f0b0', '#5a3a2a', '#a0c080'];
SKIN.beast = ['#1a1018', '#4a3040', '#7a5868', '#a88898', '#c8aab8', '#ead8e0', '#6a2a3a', '#b07888'];
SKIN.demonF = ['#1e1028', '#5a4078', '#9a7ab8', '#d0b8e8', '#e8dcf6', '#ffffff', '#a02a6a', '#d090c0'];
SKIN.snake = ['#142a1c', '#3a6a4a', '#6a9a72', '#a0c8a0', '#c4e0c0', '#e8f8e4', '#6a2a4a', '#c08090'];
SKIN.ogre = ['#1e2010', '#4e5a2a', '#76844a', '#9eac6a', '#bcc88a', '#dce6b4', '#5a3a2a', '#9a7a5a'];

// ---------- 眼睛模板（朝右看）----------
// K 睫毛 k 睫毛浅 W 眼白 w 眼白阴影 D 虹膜暗 I 虹膜 L 虹膜亮 H 高光 P 瞳孔 s 皮肤阴影 S 皮肤深影 0..7 = 皮肤色阶
const EYES = { // Q 版大眼：高瞳、大高光（dy = 相对 ey 的下移行数）
  hero: {
    near: ['..KKKKK.', '.KKKKKKK', 'KKWDDDDK', '..WHHDDK', '..WHHPIK', '..WDPPIK', '..WIPPIK', '..WIILLK', '...LLLK.', '....kk..'],
    far: ['KKKKK.', 'KKKKKK', 'KDDDDK', 'KHHDDK', 'KHHPIK', 'KDPPIK', 'KIPPIK', 'KILLIK', '.LLLK.', '..kk..'] },
  girl: {
    near: ['.KKKKKK.', 'KKKKKKKK', 'KKWDDDDK', '.KWHHDDK', '..WHHPIK', '..WDPPIK', '..WIPPIK', '..WIILLK', '...LLLK.', '....kk..'],
    far: ['KKKKKKK', 'KKKKKK', 'KDDDDK', 'KHHDDK', 'KHHPIK', 'KDPPIK', 'KIPPIK', 'KILLIK', '.LLLK.', '..kk..'] },
  adult: { dy: 1, // 成年（二代回归角色）：眼睛略短
    near: ['.KKKKKK.', 'KKKKKKKK', '..WHHDDK', '..WHHPIK', '..WDPPIK', '..WIILLK', '...LLLK.', '....kk..'],
    far: ['KKKKKK', 'KKKKKK', 'KHHDDK', 'KHHPIK', 'KDPPIK', 'KILLIK', '.LLLK.', '..kk..'] },
  sharp: { dy: 1,
    near: ['.KKKKKKK', 'KKKKKKKK', '..WHHDDK', '..WHPPIK', '..WDPPIK', '..WILLLK', '...kkkk.'],
    far: ['KKKKKK', 'KKKKKK', 'KHHDDK', 'KHPPIK', 'KDPPIK', 'KILLLK', '.kkkk.'] },
  stern: { dy: 2,
    near: ['KKKKKKKK', '.KKKKKKK', '..WHDDDK', '..WHPPIK', '..WIPLLK', '...kkkk.'],
    far: ['KKKKKK', 'KKKKKK', 'KHDDDK', 'KHPPIK', 'KIPLLK', '.kkkk.'] },
  kind: { dy: 2,
    near: ['..KKKK..', '.KKKKKK.', 'K.WHDDK.', '..WPPIK.', '...kkk..'],
    far: ['.KKKK.', 'KKKKKK', 'KHDDK.', 'KPPIK.', '.kkk..'] },
  closed: { dy: 3,
    near: ['..KKKK..', '.KK..KK.', 'KK....KK'],
    far: ['.KKK..', 'KK.KK.', 'K...K.'] },
  fierce: { dy: 1,
    near: ['KK......', '.KKKKKK.', '..KKKKKK', '..WHHDDK', '..WHPPIK', '..WIPPIK', '...kkkk.'],
    far: ['......', 'KKKKK.', 'KKKKKK', 'KHDDDK', 'KHPPIK', 'KIPPIK', '.kkkk.'] },
  glow: { dy: 2,
    near: ['.KKKKKK.', 'KKLLLLKK', 'KLLHLLLK', '.KLLLLK.', '..KKKK..'],
    far: ['KKKKK.', 'KLLLKK', 'KLHLLK', '.KLLK.', '..KK..'] },
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
  const HT = [CHIBI.s * (S.scale || 1.18) / 1.18, 31, CHIBI.py], BT = [CHIBI.bs, CHIBI.bx, CHIBI.by];
  c.HT = HT; c.BT = BT;
  // 1 背后（披风、翅膀、武器）
  TF = BT; for (const f of [].concat(S.back || [])) f(c);
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
  TF = BT;
  (BODY[S.body] || BODY.tunic)(c);
  for (const f of [].concat(S.over || [])) f(c); // 转职装备层（画面坐标）
  TF = HT;
  // 5 耳朵
  if (!S.noEar) {
    const ear = S.elfEar ? p.add(blob([F.ear[0] + 1.6, F.ear[1] - 3, F.ear[0] - 8, F.ear[1] - 9.5, F.ear[0] - 2, F.ear[1] + 1.5, F.ear[0] + 1, F.ear[1] + 3.6]), skin, 'skin') : p.add(ell(F.ear[0], F.ear[1], 2.3, 3.6, -0.15), skin, 'skin');
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
  // Q 版腮红（画面像素）：S.blush = 浓；有长胡子 / 无眼者略去
  if (S.eyes !== 'none' && S.blush !== false && !(S.beard && S.beard !== 'stubble')) {
    const bx0 = Math.floor(tx(F.nx)), bx1 = Math.floor(tx(F.fx)), by = Math.floor(ty(F.ey)) + 11, old = TF; TF = null;
    for (let k = S.blush ? -1 : 0; k <= (S.blush ? 2 : 1); k++) p.spx(bx0 + k + 0.5, by + 0.5, face, 7);
    for (let k = 1; k <= (S.blush ? 3 : 2); k++) p.spx(bx1 + k + 2.5, by + 0.5, face, 7);
    if (S.blush) { p.spx(bx0 + 0.5, by + 1.5, face, 7); p.spx(bx0 + 1.5, by + 1.5, face, 7); }
    TF = old;
  }
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
  const ox = TF ? TF[0] : 1;
  p.tmpl(F.nx, ey + (style.dy || 0) / ox, style.near, map);
  p.tmpl(F.fx, ey + (style.dy || 0) / ox, style.far, map);
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
  small: { o: [0, 0], t: ['2'] },
  long: { o: [0, -1], t: ['2', '2'] },
  big: { o: [-1, -1], t: ['.2', '21'] },
  hook: { o: [-1, -1], t: ['.2', '.2', '21'] },
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
  swept: { // 彦清风：侧分刘海 + 呆毛
    back(c) {
      hAdd(c, [ell(31, 24.5, 14.5, 12.5), lock(22, 30, 17, 42, 4.2, 1), lock(40, 30, 45, 41, 4, -1), lock(36, 13, 48, 16, 4.4, -1.5), lock(26, 14, 18, 13, 4, 1), lock(42, 20, 51, 26, 4, -1)]);
      hShade(c, { d: 0 });
    },
    front(c) {
      hAdd(c, blob([19.5, 24, 21, 16, 30, 12, 40, 14, 44, 22, 40, 21, 30, 20, 23, 22]), { ol: false });
      hLocks(c, [[22, 17, 19.6, 31, 4.2, -1.5], [24, 16, 26, 27.5, 4.6, -2.5], [28, 15, 32.5, 26.5, 4.6, -2.5], [32, 15, 38.5, 25, 4.4, -2], [36, 16, 42.5, 25.5, 3.8, -1.5], [40.5, 19, 44.6, 31, 2.6, 0]]);
      hLocks(c, [[30, 13, 35, 4, 2.6, -2.4, 0.4]]);
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
    const fp = rp(c.S.featherCol || '#f0e8dc'), tip = rp('#5a3a22');
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
  const oldTF = TF; TF = null; x += 5; y -= 6; // Q 版：剑柄露在大头右上方
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
  TF = oldTF;
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
    assassin: { face: 'man', skin: 'warm', hair: '#1a1a22', hairStyle: 'short', iris: '#c02020', eyes: 'sharp', brow: 'angry', mouth: 'none', nose: 'none', body: 'samurai', cloth: vc || '#2a1a1e', armor: '#3a2a30', headBack: 'hood', head: ['hood', HB.ninjaMask('#2a1a1e')], hood: vc || '#3a1a22', back: GB.twinBlades(STEEL) },
    siren: { face: 'f', skin: 'sea', hair: vc || '#2ab0a0', hairStyle: 'wavy', iris: '#f0d020', eyes: 'girl', brow: 'soft', mouth: 'lips', body: 'princess', cloth: '#1e6a7a', trim: '#0e3a4a', head: HG2.shellCrown, earring: true, elfEar: true },
    goblin: { face: 'broad', skin: 'goblin', hairStyle: 'bald', iris: '#f0c020', eyes: 'fierce', brow: 'angry', thickBrow: true, mouth: 'grin', nose: 'big', body: 'rags', cloth: vc || '#6a5a3a', trim: '#4a3a2a', strap: true, elfEar: true, blush: false,
      scar: c => { c.p.line([c.F.fx + 1, c.F.ey - 2, c.F.fx + 4, c.F.ey + 3], c.face, 1, true); } },
    beastKing: { face: 'broad', skin: 'beast', hair: '#7a3a12', hairStyle: 'wild', iris: '#ff3020', eyes: 'glow', brow: 'angry', thickBrow: true, mouth: 'teeth', nose: 'big', body: 'regal', cloth: '#2a0e14', head: [HG.hoodHorns('#3a2a20'), 'crown'], back: GEAR.aura('#ff3020'), bg: BG_DARK, blush: false },
    revengeDemon: { face: 'f', skin: 'demonF', hair: '#1e1a2a', hairStyle: 'wavy', iris: '#ff40c0', eyes: 'glow', brow: 'angry', mouth: 'lips', body: 'princess', cloth: '#1a0818', trim: '#0e0814', earring: true, head: [HG.hoodHorns('#2a0a2a'), HG2.flower('#a01a4a'), HG.circlet(GOLD, '#ff40c0', true)], over: [GEAR.mantle('#14061a', BLOOD)], back: [GEAR.aura('#c040ff'), GB2.batWings('#2a0a30')], bg: BG_DARK, blush: false },
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
  wolfHero(v, hero, tier, path) { return wolfHead(v, true, tier, path); },
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
  babyDragon(v, hero, tier, path) {
    const p = mpic();
    // 拉拉的阶：0 小龙 1 飞龙（默认）2 火龙 3 巨火龙
    const T = tier == null ? 1 : tier;
    const B = path === 'b' && T >= 2; // 分支 B：冰龙 / 冰晶龙王
    const col = B ? (T === 3 ? '#7ac4ec' : '#3a78d8') : T >= 2 ? (T === 3 ? '#c8321e' : '#e0682a') : T === 0 ? '#5cc070' : vcol(v, '#44b060', DRAGON_COL);
    const pal = ramp(col, { lit: 0.42 }), belly = ramp(B ? '#e4f6ff' : T >= 2 ? '#f8d878' : '#f4e2a8'), wing = ramp(B ? (T === 3 ? '#2a5a9a' : '#1e3a7a') : T >= 2 ? (T === 3 ? '#5a1418' : '#8a2a1a') : mix(col, '#203040', 0.35));
    const fire = B ? ICE : ['#3a0800', '#a02008', '#e05010', '#f89020', '#ffd050', '#fff4c0'];
    if (T === 3) { // 火焰光晕
      const fl = p.obj(fire, 'aura', { ol: false });
      for (let i = 0; i < 11; i++) { const a = PI * (1.05 + i * 0.09), r = 27 + (i % 2) * 4; p.fill(lock(32 + Math.cos(a) * 20, 34 + Math.sin(a) * 20, 32 + Math.cos(a) * r, 34 + Math.sin(a) * r, 3.4, (i % 2 ? 1 : -1), 0.2), fl, i % 2 ? 2 : 3); }
    }
    const ws = [0.55, 1, 1.3, 1.55][T] || 1;
    for (const [sx, d] of [[17, -1], [47, 1]]) {
      const W0 = [sx, 62, sx + d * 6, 48, sx + d * 15, 40, sx + d * 14, 47, sx + d * 17, 51, sx + d * 13, 55, sx + d * 15, 60, sx + d * 6, 66];
      const Wp = W0.map((q, i) => (i % 2 ? 62 + (q - 62) * ws : sx + (q - sx) * ws));
      const wid = mp(p, blob(Wp), wing, 'wing', { s: 1, d: 0, hl: 1 });
      if (T >= 2) { for (const k of [2, 4]) p.line([sx, 62, Wp[k * 2], Wp[k * 2 + 1]], wid, 4, true); mp(p, ell(Wp[4], Wp[5], 1.6, 1.6), B ? ICE : T === 3 ? METAL.gold : BONE, 'claw', { s: 0, hl: 1 }); }
    }
    mp(p, blob([10, 74, 12, 63, 20, 57, 32, 55, 44, 57, 52, 63, 54, 74]), pal, 'skin', { s: 3, d: 1, hl: 1 });
    mp(p, blob([22, 74, 23, 64, 32, 60, 41, 64, 42, 74]), belly, 'belly', { s: 2, d: 0, hl: 1 });
    for (let y = 65; y < 74; y += 3) p.line([24, y, 40, y], 'belly', 2, true);
    if (T === 3) { // 金项圈 + 宝石
      mp(p, blob([14, 64, 22, 58.5, 32, 57, 42, 58.5, 50, 64, 46, 66, 32, 61.5, 18, 66]), B ? METAL.silver : METAL.gold, 'metal', { s: 1, d: 0, hl: 1 });
      const g = mp(p, ell(32, 62.5, 2.4, 2.6), ramp(B ? '#a0f0ff' : '#20b0e0', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); p.px(31, 61.5, g, 5);
    }
    // 角与头冠刺
    const hornPal = B ? ICE : T === 3 ? METAL.gold : BONE;
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
    const ep = eyePal(B ? (T === 3 ? '#20d0ff' : '#3aa0e8') : T >= 2 ? (T === 3 ? '#f0a010' : '#e07010') : v === 'red' ? '#d04020' : '#c87010', '#10200c');
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
      if (T === 3) { const g = mp(p, poly([31, 14, 34, 18, 31, 22, 28, 18]), B ? METAL.silver : METAL.gold, 'metal', { s: 0, hl: 1 }); const j = mp(p, ell(31, 18, 1.4, 1.9), ramp(B ? '#60e0ff' : '#e02030', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); p.px(30.5, 17, j, 5); }
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
function wolfHead(v, hero, tier, path) {
  const p = mpic();
  // 坎培特的阶：0 狼族士兵 1 狼战士（默认）2 狼嚎战士
  const T = hero ? (tier == null ? 1 : tier) : -1;
  if (hero) return wolfChibi(T, path === 'b' && T >= 1);
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
// 坎培特 Q 版：圆头、短吻、大眼（T = 阶）
function wolfChibi(T, B) { // B = 分支 B 路线（月影狼 / 月神狼）
  const p = mpic();
  const fur = ramp(B ? (T === 2 ? '#dce2f4' : '#8aa2cc') : '#9a9cac', { shift: 10 }), cream = ramp(B ? '#f4f8ff' : '#e8e6f0', { coolHue: 230 });
  const c = { p, S: { cloth: B ? (T === 2 ? '#24306e' : '#1a2448') : T === 0 ? '#6a4a2e' : T === 2 ? '#1e2e5a' : '#2e4a7a', fur: B ? '#4a5a84' : T === 0 ? '#5a4030' : '#5a5a6a' } };
  if (T === 2 && B) { // 月轮光环
    const mo = p.obj(['#5a5a3a', '#a8a070', '#d8d4b0', '#f0eed8', '#fbfaf0', '#ffffff'], 'moon', { ol: false });
    p.fill(ell(31.5, 28, 28, 28), mo, 2); p.fill(ell(31.5, 28, 26.5, 26.5), mo, 3); p.fill(ell(27, 22, 6, 5), mo, 4);
    for (const [x, y, r] of [[48, 12, 3], [12, 40, 2.4], [52, 44, 2]]) p.fill(ell(x, y, r, r), mo, 2);
    GEAR.aura('#c8d8ff')(c);
  } else if (T === 2) GEAR.aura('#e0a040')(c);
  TF = [CHIBI.bs, CHIBI.bx, CHIBI.by];
  if (T === 2) GEAR.cape(B ? '#24306e' : '#9a1e24', B ? METAL.silver : METAL.gold)(c);
  BODY.wolf(c);
  if (T === 0) piece(c, lock(10, 57, 46, 74, 2.6, 1.5, 2.6), rp('#4a3020'), 'cloth', { s: 1, hl: 1 });
  if (T >= 1) piece(c, blob([22, 56, 31, 59, 42, 56, 41, 60, 31, 63, 23, 60]), B ? METAL.silver : METAL.gold, 'metal', { s: 1, hl: 1 });
  if (T === 2 && B) { GEAR.pauldrons(METAL.silver, null, true)(c); }
  else if (T === 2) {
    GEAR.pauldrons(METAL.steel, 'L', true)(c);
    for (const [x, y] of [[2, 54], [8, 51.5], [14, 52.5]]) mp(p, poly([x - 1.8, y + 3, x + 1.8, y + 3, x + 0.6, y - 4]), METAL.silver, 'spike', { s: 0, hl: 1 });
    pauldron(c, 52, 64, 8.5, 5.5, METAL.gold, 1, 0.2);
  }
  TF = null;
  // 颈部蓬毛
  const ruff = [];
  for (let i = 0; i < 9; i++) ruff.push(lock(14 + i * 4, 46 + Math.abs(i - 4) * 0.4, 11 + i * 4.8, 58 + (i % 2) * 2.5, 4.4, (i % 2 ? 1 : -1), 0.4));
  mp(p, union(...ruff), cream, 'cream', { s: 1, d: 0, hl: 1 });
  if (T === 2 && !B) {
    for (let i = 0; i < 5; i++) { const x = 21 + i * 5, y = 57 + Math.sin((i / 4) * PI) * 2.5; mp(p, poly([x - 1.4, y, x + 1.4, y, x, y + 4.4]), TOOTH, 'tooth', { s: 0, hl: 1 }); }
    emblem(c, 31.5, 66, 2.2, '#d02030');
  }
  if (B) emblem(c, 31.5, 66, T === 2 ? 2.6 : 2, '#80c0ff');
  // 大耳朵
  const ears = mp(p, union(blob([11, 28, 9, 12, 12, 1, 18, 6, 25, 16]), blob([33, 14, 41, 2.5, 47, 0, 49, 12, 47, 24])), fur, 'fur', { s: 2, d: 1, hl: 1 });
  p.shade(union(blob([13.5, 24, 12.5, 12, 14, 5.5, 18, 9.5, 22, 16]), blob([36.5, 14, 42, 6, 45.5, 4.5, 46, 13, 44.5, 20])), ears, 1);
  const pink = p.obj(['#5a2030', '#a04860', '#d07890', '#e8a0b0', '#f8c8d4', '#ffe8ee'], 'inner', { ol: false });
  p.fill(union(blob([14.5, 21, 14, 12, 15.5, 7.5, 18, 10.5, 20.5, 16]), blob([39, 13, 42.5, 8, 44.5, 7, 44.6, 13, 43.5, 18])), pink, 3);
  // 圆头 + 短吻
  const h = mp(p, blob([11, 34, 12, 23, 18, 15, 28, 11, 38, 11.5, 46, 16, 50, 23, 55, 27, 60, 31, 60.5, 36, 57, 40, 50, 43, 44, 48, 34, 51.5, 23, 50, 14.5, 44]), fur, 'fur', { s: 2, d: 1, hl: 1, dx: 0.9, dy: 0.7 });
  const cr = mp(p, blob([18, 42, 27, 38.5, 37, 40, 46, 39, 54, 39, 59.5, 37, 56, 41.5, 49, 45.5, 40, 49.5, 30, 51, 21, 48.5]), cream, 'cream', { s: 1, d: 0, hl: 1 });
  spikes(p, [[14, 40, 6, 44, -1], [16, 45, 9, 51, -1]], cream, 'cream', 3.4);
  spikes(p, [[24, 14, 22, 22, 1], [29.5, 12, 29.5, 20.5, 0], [35, 12.5, 37.5, 20, -1]], fur, 'fur', 3);
  texture(p, ['fur'], 'fur', 'wc', 0.025);
  // 鼻 + 嘴
  const nose = p.add(blob([55, 30, 59.5, 30.5, 61.5, 33, 59.5, 35.5, 55.5, 34.4]), ['#000000', '#08080c', '#14141c', '#22222c', '#4a4a5a', '#9090a0'], 'nose');
  p.px(57, 31, nose, 5); p.px(58, 31, nose, 4);
  p.line([47, 41, 50, 42.5, 53, 41, 56, 42.5, 58.5, 40.5], cr, 0);
  if (T === 2 && !B) fang(p, 51.5, 42, 2.2, 0.9);
  // 大眼（琥珀色）
  const ep = eyePal(B ? (T === 2 ? '#60b0ff' : '#e8c040') : T === 2 ? '#ffb020' : '#e8a020', '#141018');
  const e = p.obj(ep, 'eye', { ol: false });
  const map = { K: [e, 0], k: [e, 1], W: [e, 2], w: [e, 3], D: [e, 4], I: [e, 5], L: [e, 6], H: [e, 7], P: [e, 8] };
  p.tmpl(21, 25, EYES.hero.near, map);
  p.tmpl(36, 24, EYES.hero.far, map);
  const bl = p.obj(['#802040', '#c04060', '#e07080', '#f090a0', '#ffb0c0', '#ffd0e0'], 'blush', { ol: false });
  for (const [x, y] of [[21, 37], [22, 37], [23, 37], [40, 36], [41, 36]]) p.px(x, y, bl, 3);
  // 新月印记
  if (B) {
    const mk = p.obj(T === 2 ? ['#5a4a10', '#c8a020', '#f0d040', '#fff080', '#fffce0', '#ffffff'] : ['#3a4a6a', '#8aa0c8', '#c8d8f0', '#e8f0ff', '#ffffff', '#ffffff'], 'mark', { ol: false });
    p.fill(ring(ell(31, 17, 3.6, 3.6), ell(32.8, 16, 3, 3)), mk, 4);
    if (T === 2) for (const [x, y] of [[26, 15], [36, 13]]) { p.px(x, y, mk, 5); p.px(x - 1, y, mk, 3); p.px(x + 1, y, mk, 3); p.px(x, y - 1, mk, 3); p.px(x, y + 1, mk, 3); }
  }
  // 战纹 + 金耳环
  if (T === 2 && !B) {
    const wp = p.obj(['#3a0408', '#8a1014', '#c42020', '#e04030', '#f08060', '#ffc0a0'], 'paint', { ol: false });
    for (const [x0, y0, x1, y1] of [[13, 30, 19, 32], [13, 34, 19, 35.5]]) { p.line([x0, y0, x1, y1], wp, 3); }
    p.line([30, 13, 31, 18], wp, 3); p.line([29, 14, 30, 18], wp, 2);
    mp(p, ring(ell(45.5, 22.5, 2, 2.4), ell(45.5, 22.5, 1, 1.4)), METAL.gold, 'acc', { s: 0, hl: 1 });
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
    const { p } = c, pal = rp(col, { lit: 0.5 }), old = TF;
    TF = null; // 以画面坐标围绕 Q 版大头
    const cx = 31.5, cy = 29, R = 27.5;
    const id = p.obj(pal, 'aura', { ol: false });
    for (let i = 0; i < 24; i++) { const a = i / 24 * PI * 2, r0 = R + 1, r1 = R + (i % 2 ? 3.5 : 6); p.line([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], id, i % 2 ? 2 : 3); }
    p.fill(ring(ell(cx, cy, R + 1.6, R + 1.6), ell(cx, cy, R - 0.6, R - 0.6)), id, 4);
    p.fill(ring(ell(cx, cy, R + 0.4, R + 0.4), ell(cx, cy, R - 0.4, R - 0.4)), id, 5);
    TF = old;
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
    { over: [GEAR.mantle('#30206a', GOLD)], back: GEAR.collar('#30206a', '#8a2a5a', GOLD) },
    { over: [GEAR.mantle('#30206a', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]]), GEAR.emblem('#20b0a0', 31.5, 67, 2)], head: ['tiara', HG.circlet(GOLD, null, true)], back: GEAR.collar('#30206a', '#8a2a5a', GOLD) },
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
// 转职分支 B 路线：getPortrait(id, variant, tier, 'b')，tier >= 分支阶 at 时生效
// =====================================================================
const BRANCH_AT = { adventurer: 2, swordsman: 2, knight: 2, fighter: 2, samurai: 2, archer: 2, priest: 2, mage: 2, sorcerer: 1, hawk: 1, wolf: 1, babyDragon: 2 };
const HERO_CLS = { oz: 'swordsman', yangtie: 'knight', kaidi: 'knight', klein: 'fighter', augustus: 'fighter', slade: 'samurai', judy: 'archer', hake: 'archer',
  xueer: 'priest', qu: 'priest', wushuang: 'mage', lian: 'mage', hao: 'sorcerer', dvra: 'hawk', kampeite: 'wolf', lala: 'babyDragon' };
function branchAt(id) {
  try { const a = CLASSES[HEROES[id].cls].alt; if (a && a.at != null) return a.at; } catch (e) { /* data.js 尚无 alt */ }
  const k = G2_HEROES[id] && !HERO_SPECS[id] ? g2Cls(id) : HERO_CLS[id];
  try { const a = CLASSES[k].alt; if (a && a.at != null) return a.at; } catch (e) { /* 无 CLASSES */ }
  return k == null || BRANCH_AT[k] == null ? null : BRANCH_AT[k];
}
const ARCANE = ['#0c0820', '#261a52', '#3e2e84', '#6250b4', '#a090e0', '#ece6ff'];
const IVORY = ['#241e2c', '#6a6278', '#a8a2b8', '#e2deec', '#f6f4fc', '#ffffff'];
const RUNE_BLADE = ['#081830', '#2050b0', '#3a80f0', '#80c0ff', '#d0f0ff', '#ffffff'];
const TWIN_BLADE = ['#200a30', '#7030c0', '#a060f0', '#e0c0ff', '#ffffff', '#ffffff'];
const ICE = ['#0a2030', '#2a6a9a', '#4aa0d8', '#8ad4f4', '#c8f0ff', '#ffffff'];
const FIRE_P = ['#3a0800', '#a02008', '#e05010', '#f89020', '#ffd050', '#fff4c0'];
const BLOOD = ['#100406', '#3a080e', '#6a1018', '#a01e24', '#d84a3a', '#ff9a80'];
const LIGHT = ['#4a3a10', '#b08a20', '#e8c040', '#fff080', '#fffcd0', '#ffffff'];
// 在画面坐标（不受头/身缩放）中绘制
const scr = (f) => c => { const o = TF; TF = null; f(c); TF = o; };
function glowDot(p, x, y, pal, big) {
  const id = p.obj(pal, 'glow', { ol: false });
  p.fill(ell(x, y, big ? 2.6 : 1.8, big ? 2.6 : 1.8), id, 3); p.fill(ell(x - 0.3, y - 0.3, big ? 1.3 : 0.9, big ? 1.3 : 0.9), id, 5);
  for (const [dx, dy] of [[-3.5, 0], [3.5, 0], [0, -3.5], [0, 3.5]]) if (big) p.px(x + dx, y + dy, id, 4);
}
// —— B 路线身体层 ——
const GB = {
  // 塔盾（画面左下）：mark = 'cross' | 'crown' | 'boss'
  shield: (face, rim, mark) => c => {
    const sh = [0, 54, 8, 52.5, 16.5, 54, 17, 64, 9, 75, 0, 66];
    piece(c, blob(sh.map((v, i) => (i % 2 ? v + (v > 60 ? 1.4 : -1.4) : v + (v > 8 ? 1.4 : -1.4)))), rim, 'metal', { s: 1, hl: 1 });
    piece(c, blob(sh), face, 'shield', { s: 2, d: 1, hl: 1 });
    if (mark === 'cross') piece(c, union(rect(7, 55, 3, 15), rect(2.5, 59.5, 12, 3)), METAL.gold, 'acc', { s: 1, hl: 1 });
    else if (mark === 'crown') { piece(c, poly([3, 64, 3, 57, 6, 60, 8.5, 55.5, 11, 60, 14, 57, 14, 64]), METAL.gold, 'acc', { s: 1, hl: 1 }); piece(c, ell(8.5, 61.5, 1.3, 1.3), rp('#d02030'), 'acc', { s: 0, hl: 1 }); }
    else piece(c, ell(8.5, 61, 3, 3), rim, 'metal', { s: 1, hl: 1 });
  },
  // 长枪 + 旗（背后左上）
  banner: (flag, trim) => scr(c => {
    piece(c, lock(5, 74, 9, 2, 2, 0, 2), rp('#7a4a22'), 'acc', { s: 0, hl: 1 });
    piece(c, poly([8.6, 0, 10.4, 0, 9.5, -4]), METAL.silver, 'metal', { s: 0, hl: 1 });
    piece(c, blob([9, 3, 1, 5, -1, 13, 3, 18, 0, 22, 9, 21]), rp(flag), 'cape', { s: 1, hl: 1 });
    if (trim) piece(c, ell(4, 12, 1.8, 2), trim, 'acc', { s: 0, hl: 1 });
  }),
  // 巨刃（背后右上，画面坐标）：kind 'cleaver' | 'axe'
  bigBlade: (blade, kind, flame) => scr(c => {
    const { p } = c;
    piece(c, lock(44, 74, 57, 14, 2.6, 0, 2.6), rp('#4a2a1a'), 'acc', { s: 1, hl: 0 });
    if (flame) for (let i = 0; i < 5; i++) piece(c, lock(52 + i * 2.6, 22 - (i % 2) * 2, 50 + i * 3.4, 2 - (i % 2) * 3, 3.4, i % 2 ? 1.5 : -1.5, 0.3), FIRE_P, 'flame', { s: 1, d: 0, hl: 1 });
    if (kind === 'axe') {
      for (const d of [-1, 1]) piece(c, blob([55.5, 14, 55.5 + d * 9, 8, 55.5 + d * 12, 17, 55.5 + d * 9, 27, 56, 22]), blade, 'metal', { s: 2, d: 0, hl: 2 });
      p.line([45.5, 10, 46, 17, 46.5, 24], 'metal', 4, true); p.line([66, 10, 67, 17, 66, 24], 'metal', 4, true);
    } else {
      const id = piece(c, poly([51, 8, 64, 6, 64, 30, 57, 34, 55, 26]), blade, 'metal', { s: 2, d: 0, hl: 2 });
      p.line([63.5, 7, 63.5, 30], id, 5, true); p.px(59, 13, id, 0);
    }
  }),
  // 毛皮披肩
  fur: (col) => c => {
    const fp = rp(col || '#8a6a4a');
    for (const a of [[-1, 70, -1, 58, 6, 53, 16, 51, 24, 54, 22, 60, 18, 63, 14, 61, 11, 66, 6, 64, 3, 69], [65, 70, 65, 58, 57, 53, 47, 51, 39, 54, 41, 60, 45, 63, 49, 61, 52, 66, 57, 64, 60, 69]]) {
      const id = piece(c, blob(a), fp, 'fur', { s: 2, d: 1, hl: 1 });
      for (let k = 0; k < 7; k++) c.p.line([a[0] < 31 ? 2 + k * 3 : 61 - k * 3, 56 + (k % 3), a[0] < 31 ? 3 + k * 3 : 60 - k * 3, 60 + (k % 2)], id, 2, true);
    }
    const sk = piece(c, blob([25, 60, 31, 57, 38, 60, 37.5, 66, 34, 68.5, 28, 68.5, 25, 66]), BONE, 'acc', { s: 1, hl: 1 });
    c.p.px(29, 63, sk, 0); c.p.px(30, 63, sk, 0); c.p.px(33, 63, sk, 0); c.p.px(34, 63, sk, 0);
  },
  // 战纹（身体）
  bodyPaint: (col) => c => {
    const id = c.p.obj(rp(col), 'paint', { ol: false });
    for (const l of [[22, 60, 27, 66], [24, 59, 29, 65], [41, 60, 36, 66], [39, 59, 34, 65]]) c.p.line(l, id, 3);
  },
  // 忍者长围巾：long = 尾巴长度
  ninjaScarf: (col, long) => c => {
    const sc = rp(col);
    const L = long || 1;
    piece(c, lock(22, 55, -2, 52 - 6 * L, 4.4, 2, 2.4), sc, 'scarf', { s: 1, d: 0, hl: 1 });
    if (L > 1) piece(c, lock(23, 57, -2, 64 - 4 * L, 3.6, -1.5, 2), sc, 'scarf', { s: 1, d: 0, hl: 1 });
    const id = piece(c, blob([20, 50, 31, 54, 42, 50, 43.5, 56.5, 31, 61, 19, 56.5]), sc, 'scarf', { s: 2, d: 1, hl: 1 });
    folds(c, id, [[23, 54, 31, 57.5, 40, 54]]);
  },
  // 护臂（画面两下角）
  armGuards: (mt) => c => { piece(c, blob([-1, 66, 8, 63, 11, 74, -1, 74]), mt, 'metal', { s: 1, hl: 1 }); piece(c, blob([53, 63, 65, 66, 65, 74, 52, 74]), mt, 'metal', { s: 1, hl: 1 }); },
  // 双刀（背后交叉）
  twinBlades: (blade) => scr(c => { sword(c, 49, 32, blade); sword(c, 6, 40, blade); }),
  // 道服（交领 + 腰带）
  gi: (col, sash, under) => c => {
    const g = rp(col);
    piece(c, poly([24, 52, 28, 52, 34, 66, 31.5, 68]), rp(under || '#f4f0e6'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([38.5, 52, 41, 53.5, 34, 66, 32, 63]), rp(under || '#f4f0e6'), 'cloth', { s: 1, hl: 0 });
    piece(c, poly([20.5, 54, 24.5, 52, 33.5, 68, 32, 74, 27, 74]), g, 'cloth', { s: 1, hl: 1 });
    piece(c, blob([10, 70, 31, 67.5, 54, 70, 54, 75, 31, 73, 10, 75]), Array.isArray(sash) ? sash : rp(sash), 'sash', { s: 1, hl: 1 });
  },
  // 念珠
  beads: (col, big) => c => { for (let i = 0; i <= 8; i++) { const a = PI * (0.12 + i * 0.095), x = 31.5 + Math.cos(a) * 11, y = 53 + Math.sin(a) * 10; piece(c, ell(x, y, big ? 1.8 : 1.4, big ? 1.8 : 1.4), rp(col), 'acc', { s: 0, hl: 1 }); } },
  // 拳头（画面左下抬起）：wrap 缠布 / 金属拳套；glow = 圣光
  fist: (wrap, glow) => c => {
    const sk = c.skin || SKIN.fair;
    if (glow) { const g = c.p.obj(rp(glow, { lit: 0.5 }), 'glow', { ol: false }); c.p.fill(ell(8, 63, 9.5, 9), g, 4); c.p.fill(ell(8, 63, 7.6, 7.2), g, 5); }
    const f = piece(c, blob([2, 64, 3, 58, 8, 56.5, 13.5, 58, 14.5, 63, 12, 67, 5, 67.5]), sk, 'skin', { s: 2, d: 0, hl: 1 });
    for (const x of [5.5, 8.5, 11.5]) c.p.line([x, 57.5, x, 60], f, 2, true);
    piece(c, blob([3, 67, 12.5, 66.5, 13.5, 75, 2, 75]), Array.isArray(wrap) ? wrap : rp(wrap), 'acc', { s: 1, hl: 1 });
    c.p.line([3, 70, 13, 69.5], 'acc', 2, true);
  },
  // 齿轮纹（时空系披肩）
  gears: (mt, pts) => c => {
    for (const [x, y, r] of pts || [[6, 64, 2.6], [14, 60, 2], [50, 61, 2], [57.5, 65.5, 2.6]]) {
      piece(c, ring(ell(x, y, r + 0.9, r + 0.9), ell(x, y, r * 0.45, r * 0.45)), mt, 'acc', { s: 0, hl: 1 });
      for (let k = 0; k < 6; k++) { const a = k / 6 * PI * 2; c.p.px(x + Math.cos(a) * (r + 1.6), y + Math.sin(a) * (r + 1.6), c.p.objs.length - 1, 3); }
    }
  },
  // 沙漏（画面坐标浮空）
  hourglass: (x, y, sz, mt, sand) => scr(c => {
    const s = sz || 1, X = (d) => x + d * s, Y = (d) => y + d * s;
    piece(c, union(rect(X(-4), Y(-6.5), 8 * s, 1.6 * s), rect(X(-4), Y(5), 8 * s, 1.6 * s)), mt, 'metal', { s: 0, hl: 1 });
    piece(c, union(rect(X(-3.6), Y(-5), 1 * s, 10 * s), rect(X(2.6), Y(-5), 1 * s, 10 * s)), mt, 'metal', { s: 0, hl: 1 });
    const gl = piece(c, poly([X(-2.6), Y(-5), X(2.6), Y(-5), X(0.5), Y(0), X(2.6), Y(5), X(-2.6), Y(5), X(-0.5), Y(0)]), rp('#c8f0ff', { lit: 0.5 }), 'glass', { s: 0, hl: 1 });
    piece(c, union(poly([X(-1.8), Y(-3.2), X(1.8), Y(-3.2), X(0), Y(-0.4)]), poly([X(-2.2), Y(4.8), X(2.2), Y(4.8), X(0), Y(2.2)])), rp(sand || '#f0c040'), 'sand', { s: 0, hl: 1 });
  }),
  // 时钟光环（背后）
  clockHalo: (col) => c => {
    const { p } = c, o = TF; TF = null;
    const cx = 31.5, cy = 29, R = 27.5, pal = rp(col, { lit: 0.5 });
    const id = p.obj(pal, 'aura', { ol: false });
    p.fill(ring(ell(cx, cy, R + 1.4, R + 1.4), ell(cx, cy, R - 0.6, R - 0.6)), id, 4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; p.line([cx + Math.cos(a) * (R + 1.5), cy + Math.sin(a) * (R + 1.5), cx + Math.cos(a) * (R + (i % 3 ? 4 : 6.5)), cy + Math.sin(a) * (R + (i % 3 ? 4 : 6.5))], id, i % 3 ? 3 : 5); }
    p.line([cx + 22, cy - 18, cx + 30, cy - 26], id, 5); p.line([cx - 24, cy - 12, cx - 31, cy - 16], id, 5); // 指针尖
    TF = o;
  },
  // 星空法袍点
  cosmos: c => GEAR.stars('#e8f0ff', [[4, 66], [9, 61], [15, 64], [12, 70], [48, 62], [53, 66], [58, 61], [60, 70], [22, 70], [42, 71]])(c),
  // 灵魂火（浮空）：pts = [[x, y], ...]
  wisps: (col, pts) => scr(c => { for (const [x, y] of pts) { const pal = rp(col, { lit: 0.55 }); const id = piece(c, union(ell(x, y, 2.6, 2.6), lock(x - 0.5, y - 1, x + 1.5, y - 6.5, 2.4, 1, 0.2)), pal, 'wisp', { s: 1, d: 0, hl: 1 }); c.p.px(x - 0.5, y - 0.5, id, 5); } }),
  // 魔导书（胸前）
  grimoire: (col) => c => {
    piece(c, blob([22, 62, 31, 63.5, 41, 62, 42, 75, 31, 76, 21, 75]), rp(col), 'book', { s: 2, d: 1, hl: 1 });
    piece(c, poly([30.5, 63, 32, 63, 32, 75.5, 30.5, 75.5]), METAL.gold, 'acc', { s: 0, hl: 1 });
    for (const [x, y] of [[22.5, 63], [40.5, 63]]) piece(c, ell(x, y, 1.6, 1.6), METAL.gold, 'acc', { s: 0, hl: 1 });
    const g = piece(c, ell(26.5, 68.5, 1.8, 2), rp('#40e0d0', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); c.p.px(26, 68, g, 5);
  },
  // 闪电（画面坐标）
  bolts: (pts) => scr(c => { const id = c.p.obj(LIGHT, 'bolt', { ol: false }); for (const [x, y, d] of pts) { c.p.line([x, y, x + 3 * d, y + 4, x + 1 * d, y + 5, x + 4 * d, y + 10], id, 4); c.p.line([x + 1, y, x + 3 * d + 1, y + 4], id, 5); } }),
  // 弓（参数化）：wood, string 色阶, glow = 光弦
  bow: (wood, glow) => c => {
    const { p } = c;
    const pts = [], inner = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, a = -PI * 0.42 + t * PI * 0.84; const x = 44 + Math.cos(a) * 15, y = 46 + Math.sin(a) * 26; const w = 1.9 - Math.abs(t - 0.5) * 2; pts.push(x + w, y); inner.unshift(x - w, y); }
    piece(c, poly(pts.concat(inner)), Array.isArray(wood) ? wood : rp(wood), 'acc', { s: 1, hl: 1 });
    const sid = p.add(rect(0, 0, 0, 0), glow || ['#202020', '#5a5a60', '#7a7a80', '#9a9aa0', '#c0c0c8', '#e0e0e8'], 'string', { ol: false });
    p.line([44 + Math.cos(-PI * 0.42) * 15, 46 + Math.sin(-PI * 0.42) * 26, 44 + Math.cos(PI * 0.42) * 15, 46 + Math.sin(PI * 0.42) * 26], sid, glow ? 4 : 2);
    if (glow) p.line([44 + Math.cos(-PI * 0.42) * 15 + 1, 46 + Math.sin(-PI * 0.42) * 26, 44 + Math.cos(PI * 0.42) * 15 + 1, 46 + Math.sin(PI * 0.42) * 26], sid, 2);
    piece(c, rect(57, 43, 3, 6), rp('#5a2a1a'), 'acc', { s: 0, hl: 1 });
  },
  // 绿色兜帽斗篷（前襟）
  cloakFront: (col, trim) => c => {
    for (const a of [[-1, 74, -1, 58, 6, 53.5, 16, 52, 24, 55, 22, 74], [65, 74, 65, 58, 57, 53.5, 47, 52, 39, 55, 41, 74]]) {
      if (trim) piece(c, blob(a.map((v, i) => (i % 2 ? v : (a[0] < 31 ? v + 1.6 : v - 1.6)))), trim, 'metal', { s: 1, hl: 1 });
      piece(c, blob(a), rp(col), 'cloth', { s: 2, d: 1, hl: 1 });
    }
    piece(c, ell(31, 57, 2.2, 2.2), METAL.gold, 'acc', { s: 1, hl: 1 });
  },
};
// —— B 路线头部层（脸部坐标）——
const HB = {
  // 脸颊战纹
  warpaint: (col) => c => {
    const { p, F } = c, id = p.obj(rp(col), 'paint', { ol: false });
    for (const [x0, y0, x1, y1] of [[F.nx - 1.6, F.ey + 7.4, F.nx + 4.4, F.ey + 8], [F.nx - 1.2, F.ey + 9, F.nx + 3.6, F.ey + 9.6], [F.fx + 3.4, F.ey + 7.6, F.fx + 7, F.ey + 7.8]]) { p.line([x0, y0, x1, y1], id, 3); }
  },
  // 兽骨角盔
  skullHelm: (bone, horn) => c => {
    const { p } = c;
    piece(c, union(lock(20, 15, 5, 3, 4, 4, 0.5), lock(42, 14, 57, 1, 4, -4, 0.5)), rp(horn || '#e8dcc0'), 'horn', { s: 2, d: 0, hl: 1 });
    for (const [x, y] of [[11, 7.5], [50.5, 6]]) p.line([x - 1.4, y + 1.6, x + 1.4, y - 1.6], 'horn', 1, true);
    const h = piece(c, blob([17.5, 24, 18, 14, 24, 8, 31, 6.5, 38.5, 8, 44.5, 14, 45, 24, 39, 21.6, 31, 23, 23, 21.6]), Array.isArray(bone) ? bone : BONE, 'metal', { s: 3, d: 1, hl: 1 });
    const k = p.obj(['#000000', '#100808', '#200c0c', '#301010', '#ff4020', '#ffa060'], 'slit', { ol: false });
    p.fill(union(ell(25.5, 16, 2.6, 2.2), ell(36.5, 16, 2.6, 2.2)), k, 2); p.px(25.5, 16, k, 4); p.px(36.5, 16, k, 4);
    p.line([31, 18, 31, 21.5], h, 1, true);
    p.cast(['metal', 'horn'], ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 恶魔角盔（破坏神）
  demonHelm: (mt, horn) => c => {
    const { p } = c;
    piece(c, union(lock(19, 16, 2, 0, 4.6, 6, 0.4), lock(43, 15, 61, -1, 4.6, -6, 0.4)), rp(horn || '#d8281e'), 'horn', { s: 2, d: 1, hl: 1 });
    piece(c, blob([17.5, 25, 18, 14, 24, 7.5, 31, 5.5, 38.5, 7.5, 44.5, 14, 45, 25, 41, 22, 31, 20.5, 21, 22]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    piece(c, poly([29.5, 6, 32.5, 6, 33, 20.5, 31, 23, 29, 20.5]), rp('#c02020'), 'acc', { s: 1, hl: 1 });
    const g = piece(c, ell(31, 15, 1.6, 1.9), rp('#ff5020', { lit: 0.55 }), 'acc', { s: 0, hl: 1 }); p.px(30.5, 14.2, g, 5);
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3); p.cast('metal', ['skin', 'hair'], 0, 2, 2, 3);
  },
  // 忍者面罩（遮口鼻）
  ninjaMask: (col) => c => {
    const { p, F } = c;
    const m = piece(c, blob([19.6, 38.2, 26, 38.6, 31, 37.8, 37, 37.6, 42.6, 37, 42.4, 41.5, 38.5, 45.6, 31.5, F.chin[1] + 0.6, 24.5, 45.6, 20.5, 42]), rp(col), 'mask', { s: 2, d: 0, hl: 1, dy: 1 });
    p.line([21, 41.5, 31, 42, 41, 40.6], m, 2, true);
    p.cast(m, 'skin', 0, -1, 2, 3);
  },
  // 重盔：开面盔 + 护颊
  heavyHelm: (mt) => c => {
    HEAD.kettle(Object.assign({}, c, { S: Object.assign({}, c.S, { metal: mt, nasal: false, crest: null }) }));
    for (const a of [[16.5, 23, 21, 24, 21.5, 37, 18.5, 39, 16.6, 33], [41.5, 24, 46, 23, 46, 33, 44, 39, 41.2, 37]]) piece(c, blob(a), mt, 'metal', { s: 1, hl: 1 });
    rivet(c, 18.8, 30); rivet(c, 43.6, 30);
  },
  // 时钟额环
  clockCirclet: (mt, faceCol) => c => {
    const { p } = c;
    const b = piece(c, blob([19.4, 20.4, 31, 18.2, 43.4, 20, 43.4, 22.8, 31, 21, 19.4, 23.2]), mt, 'metal', { s: 1, hl: 1, dy: 1, dx: 0.3 });
    piece(c, ell(31, 17.5, 4.4, 4.4), mt, 'metal', { s: 1, hl: 1 });
    const f = piece(c, ell(31, 17.5, 3.2, 3.2), rp(faceCol || '#f4f8ff', { lit: 0.5 }), 'acc', { s: 0, hl: 0 });
    p.line([31, 17.5, 31, 15], f, 0); p.line([31, 17.5, 33, 18.5], f, 0);
    p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 皇冠头盔
  crownHelm: (mt, gem) => c => {
    const { p } = c;
    piece(c, blob([17.5, 31, 17.6, 18, 23, 9.5, 31, 7, 39.5, 9.5, 45, 18, 45.4, 31, 42.6, 33, 42.4, 25, 31, 22, 21, 24.5, 20.4, 34]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    piece(c, poly([19, 14, 18, 3, 23, 8, 26.5, 0, 31, 6, 35.5, 0, 39, 8, 44, 3, 43, 14, 31, 10.5]), METAL.gold, 'acc', { s: 2, d: 0, hl: 1 });
    for (const [x, col] of [[25, '#2060d0'], [31, gem || '#d02030'], [37, '#20a060']]) piece(c, ell(x, 11.5, 1.3, 1.3), rp(col), 'acc', { s: 0, hl: 1 });
    piece(c, blob([16.5, 23, 31, 19.5, 46, 23, 46, 26, 31, 23, 16.5, 26.4]), METAL.gold, 'metal', { s: 1, hl: 1 });
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 新月印记（额头）
  crescent: (col) => c => { const id = piece(c, ring(ell(31, 21, 2.6, 2.6), ell(32.4, 20.2, 2.2, 2.2)), rp(col, { lit: 0.55 }), 'acc', { s: 0, hl: 1 }); },
};
const NAVY_GOLD = '#1e3a8a';
// 每位英雄：b[tier] = 覆盖项（相对基础设定 HERO_SPECS）
const BRANCH_LOOK = {
  // 魔法剑士 → 魔导剑士 → 圣魔剑士
  oz: {
    2: { body: 'lightArmor', cloth: '#2e7a6a', metal: STEEL, over: [GEAR.mantle('#4a2a8a', SILVER), GEAR.stars('#a0e0ff', [[7, 63], [56, 64]])], head: HG.circlet(SILVER, '#a060f0'), back: SW(52, 36, RUNE_BLADE, SILVER) },
    3: { body: 'plate', metal: ARCANE, cape: '#3a1e6a', over: [GEAR.mantle('#3a1e6a', GOLD), GEAR.pauldrons(ARCANE, null, true), GEAR.emblem('#40e0ff'), GB.wisps('#60c0ff', [[6, 30], [57, 52], [4, 46]])], head: HG.circlet(GOLD, '#40e0ff', true), back: [GEAR.cape('#3a1e6a', GOLD), SW(52, 36, RUNE_BLADE, GOLD)] },
    4: { body: 'plate', metal: IVORY, cape: '#5a2a9a', over: [GEAR.mantle('#f4f0fa', rp('#a060f0')), GEAR.pauldrons(IVORY, null, true), GEAR.emblem('#a040f0', 31.5, 66, 2.8), GB.wisps('#c080ff', [[6, 30], [58, 50], [4, 46], [59, 30]])], head: HG.circlet(GOLD, '#a040f0', true), back: [GEAR.aura('#c080ff'), GEAR.cape('#5a2a9a', GOLD), SW(52, 36, TWIN_BLADE, GOLD)] },
  },
  // 重装骑士 → 圣骑士 → 皇家骑士（不飞行：塔盾、全身甲）
  yangtie: {
    2: { body: 'plate', metal: STEEL, torso: 'broad', cape: '#2c5aa0', over: [GEAR.pauldrons(STEEL, null, true), GB.shield(rp('#2c5aa0'), STEEL, 'boss')], head: HB.heavyHelm(STEEL) },
    3: { body: 'plate', metal: IVORY, torso: 'broad', cape: '#f4f2f8', over: [GEAR.mantle('#f4f2f8', GOLD, 'R'), GEAR.pauldrons(GOLD, 'R', true), GB.shield(rp('#f4f2f8'), GOLD, 'cross')], head: ['kettle', HG.circlet(GOLD, '#3a8ae0')], nasal: false, crest: '#f4f4fc', back: GEAR.cape('#f4f2f8', GOLD) },
    4: { body: 'plate', metal: SILVER, torso: 'broad', cape: NAVY_GOLD, over: [GEAR.mantle(NAVY_GOLD, GOLD, 'R'), GEAR.pauldrons(GOLD, 'R', true), GB.shield(rp(NAVY_GOLD), GOLD, 'crown')], head: HB.crownHelm(SILVER, '#2060d0'), back: [GEAR.cape(NAVY_GOLD, GOLD), GB.banner(NAVY_GOLD, GOLD)] },
  },
  kaidi: {
    2: { body: 'plate', metal: STEEL, torso: 'broad', over: [GEAR.pauldrons(STEEL, null, true), GB.shield(rp('#a82a3a'), STEEL, 'boss')], head: 'plumeHelm', helmMetal: STEEL, plume: '#e03040' },
    3: { body: 'plate', metal: IVORY, torso: 'broad', cape: '#f4f2f8', over: [GEAR.mantle('#f4f2f8', GOLD, 'R'), GEAR.pauldrons(GOLD, 'R', true), GB.shield(rp('#f4f2f8'), GOLD, 'cross')], helmMetal: IVORY, plume: '#f4f4fc', helmGem: '#e03040', back: GEAR.cape('#f4f2f8', GOLD) },
    4: { body: 'plate', metal: SILVER, torso: 'broad', cape: '#a01a2a', over: [GEAR.mantle('#a01a2a', GOLD, 'R'), GEAR.pauldrons(GOLD, 'R', true), GB.shield(rp('#a01a2a'), GOLD, 'crown')], head: HB.crownHelm(SILVER, '#e03040'), back: [GEAR.cape('#a01a2a', GOLD), GB.banner('#a01a2a', GOLD)] },
  },
  // 狂战士 → 斗神 → 破坏神
  klein: {
    2: { over: [GB.bodyPaint('#c02020'), GEAR.pauldrons(STEEL, 'R')], head: ['headband', HB.warpaint('#c81e1e')], bandPlate: false, back: GB.bigBlade(STEEL, 'cleaver') },
    3: { over: [GB.bodyPaint('#c02020'), GB.fur('#7a5a3a')], head: [HB.skullHelm(), HB.warpaint('#c81e1e')], back: GB.bigBlade(STEEL, 'axe') },
    4: { body: 'plate', metal: METAL.black, torso: 'broad', cape: '#8a0e14', over: [GEAR.pauldrons(BLOOD, null, true), GEAR.emblem('#ff3020', 31.5, 66, 2.8)], head: [HB.demonHelm(METAL.black, '#d8281e'), HB.warpaint('#e02020')], back: [GEAR.aura('#ff3020'), GEAR.cape('#8a0e14', BLOOD), GB.bigBlade(BLOOD, 'axe', true)] },
  },
  augustus: {
    2: { body: 'vest', cloth: '#4a3a2a', metal: null, cape: null, emblem: null, over: [GB.bodyPaint('#c02020')], head: HB.warpaint('#c81e1e'), back: GB.bigBlade(STEEL, 'cleaver') },
    3: { body: 'vest', cloth: '#3a2a1e', metal: null, cape: null, emblem: null, over: [GB.bodyPaint('#c02020'), GB.fur('#6a6a72')], head: [HB.skullHelm(), HB.warpaint('#c81e1e')], back: GB.bigBlade(STEEL, 'axe') },
    4: { metal: METAL.black, cape: '#8a0e14', emblem: '#ff3020', over: [GEAR.pauldrons(BLOOD, null, true)], head: [HB.demonHelm(METAL.black, '#d8281e'), HB.warpaint('#e02020')], back: [GEAR.aura('#ff3020'), GEAR.cape('#8a0e14', BLOOD), GB.bigBlade(BLOOD, 'axe', true)] },
  },
  // 忍者 → 上忍 → 影忍
  slade: {
    2: { cloth: '#22222e', armor: '#3a3a48', head: ['headband', HB.ninjaMask('#2a2a36')], band: '#2a2a3a', bandPlate: STEEL, back: SW(52, 36, STEEL, METAL.black) },
    3: { cloth: '#1a1a26', armor: '#2e2e3a', over: [GB.ninjaScarf('#b01e24', 1.6), GB.armGuards(STEEL)], head: ['headband', HB.ninjaMask('#1e1e2a')], band: '#b01e24', bandPlate: STEEL, back: SW(52, 36, STEEL, METAL.black) },
    4: { cloth: '#1a1028', armor: '#2a1a3a', eyes: 'glow', iris: '#c060ff', over: [GB.ninjaScarf('#6a2aa0', 2.4), GB.armGuards(METAL.black)], headBack: 'hood', head: ['hood', HB.ninjaMask('#2a1a3a')], hood: '#2a1a3e', back: [GEAR.aura('#a040ff'), GB.twinBlades(TWIN_BLADE)] },
  },
  // 游侠 → 魔弓手 → 天弓使
  judy: {
    2: { over: [GB.cloakFront('#2e6a2e')], headBack: 'hood', head: 'hood', hood: '#2e6a2e', back: GB.bow('#7a4a1e') },
    3: { cloth: '#3a2a6a', over: [GEAR.mantle('#3a2a6a', SILVER), GEAR.stars('#a0e0ff', [[7, 63], [56, 64]]), GB.wisps('#80c0ff', [[58, 50]])], headBack: 'hood', head: ['hood', HG.hoodGold()], hood: '#3a2a6a', back: GB.bow(ARCANE, RUNE_BLADE) },
    4: { cloth: '#f0eef6', over: [GEAR.mantle('#f4f2f8', GOLD), GEAR.emblem('#40c0ff', 31.5, 62, 2)], head: HG.circlet(GOLD, '#40c0ff', true), back: [GEAR.aura('#fff0a0'), GEAR.cape('#f4f2f8', GOLD), GB.bow(GOLD, LIGHT)] },
  },
  hake: {
    2: { over: [GB.cloakFront('#2e5a2e')], head: 'hood', headBack: 'hood', hood: '#2e5a2e', back: GB.bow('#7a4a1e') },
    3: { cloth: '#2a1e5a', epaulette: SILVER, hat: '#2a1e5a', hatFeather: '#a0e0ff', over: [GEAR.mantle('#3a2a6a', SILVER, 'L'), GB.wisps('#80c0ff', [[58, 50]])], back: GB.bow(ARCANE, RUNE_BLADE) },
    4: { cloth: '#f0eef6', epaulette: GOLD, hat: '#f0eef6', hatTrim: GOLD, hatFeather: '#ffe890', hatPlume: '#f4f4fc', over: [GEAR.mantle('#f4f2f8', GOLD, 'L'), GEAR.emblem('#40c0ff', 31.5, 59, 1.8)], back: [GEAR.aura('#fff0a0'), GEAR.cape('#f4f2f8', GOLD), GB.bow(GOLD, LIGHT)] },
  },
  // 武僧 → 圣拳士 → 拳圣
  xueer: {
    2: { body: 'tunic', cloth: '#e88a20', over: [GB.gi('#e88a20', '#3a2a1a'), GB.beads('#8a4a20'), GB.fist('#f0e8d8')], headBack: null, head: 'headband', band: '#c82020' },
    3: { body: 'tunic', cloth: '#f4f2f8', over: [GB.gi('#f4f2f8', GOLD, '#f0d8a0'), GB.beads('#c8a050', true), GB.fist(GOLD)], headBack: null, head: 'headband', band: '#f0f0f8', bandPlate: GOLD },
    4: { body: 'tunic', cloth: '#f4f2f8', over: [GEAR.mantle('#e8901e', GOLD), GB.gi('#f4f2f8', GOLD, '#f0d8a0'), GB.beads('#f0c040', true), GB.fist(GOLD, '#ffc040')], headBack: null, head: 'headband', band: '#e8901e', bandPlate: GOLD, bandGem: '#e02a3a', back: GEAR.aura('#ff9a20') },
  },
  qu: {
    2: { body: 'tunic', cloth: '#e88a20', over: [GB.gi('#e88a20', '#3a2a1a'), GB.beads('#8a4a20', true)], head: null },
    3: { body: 'tunic', cloth: '#f4f2f8', over: [GB.gi('#f4f2f8', GOLD, '#f0d8a0'), GB.beads('#c8a050', true), GB.fist(GOLD)], head: 'headband', band: '#f0f0f8', bandPlate: GOLD },
    4: { body: 'tunic', cloth: '#f4f2f8', over: [GEAR.mantle('#e8901e', GOLD), GB.gi('#f4f2f8', GOLD, '#f0d8a0'), GB.beads('#f0c040', true), GB.fist(GOLD, '#ffc040')], head: 'headband', band: '#e8901e', bandPlate: GOLD, bandGem: '#e02a3a', back: GEAR.aura('#ff9a20') },
  },
  // 时空术士 → 时空法师 → 时空贤者
  wushuang: {
    2: { cloth: '#1e6a6a', trim: '#c8d4dc', head: HB.clockCirclet(SILVER), over: [GB.hourglass(55, 44, 0.9, SILVER, '#60e0e0')] },
    3: { cloth: '#1e5a6a', trim: '#c8d4dc', over: [GEAR.mantle('#1e4a5a', SILVER), GB.gears(GOLD), GB.hourglass(55, 42, 1.15, GOLD, '#f0c040')], head: HB.clockCirclet(GOLD) },
    4: { cloth: '#1a1e5a', trim: '#2a2a7a', over: [GEAR.mantle('#141848', GOLD), GB.cosmos, GB.gears(GOLD, [[6, 64, 2.6], [57.5, 65.5, 2.6]]), GB.hourglass(56, 42, 1.25, GOLD, '#a0e0ff')], head: ['tiara', HB.clockCirclet(GOLD, '#e0f0ff')], back: GB.clockHalo('#f4d468') },
  },
  lian: {
    2: { cloth: '#1e6a6a', trim: '#c8d4dc', head: HB.clockCirclet(SILVER), over: [GB.hourglass(56, 44, 0.9, SILVER, '#60e0e0')] },
    3: { cloth: '#1e5a6a', trim: '#c8d4dc', over: [GEAR.mantle('#1e4a5a', SILVER), GB.gears(GOLD), GB.hourglass(56, 42, 1.15, GOLD, '#f0c040')], head: HB.clockCirclet(GOLD) },
    4: { cloth: '#1a1e5a', trim: '#2a2a7a', over: [GEAR.mantle('#141848', GOLD), GB.cosmos, GB.gears(GOLD, [[6, 64, 2.6], [57.5, 65.5, 2.6]]), GB.hourglass(57, 42, 1.25, GOLD, '#a0e0ff')], head: HB.clockCirclet(GOLD, '#e0f0ff'), back: GB.clockHalo('#f4d468') },
  },
  // 召唤士 → 召唤王
  hao: {
    1: { cloth: '#2a3a6a', hood: '#2e3e74', over: [GEAR.stars('#60f0e0', [[8, 64], [14, 61], [50, 62], [56, 66]]), GB.wisps('#50e0ff', [[57, 46]])], head: ['hoodShadow', HG.hoodGold([19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49]), HG.hoodGem('#40e0d0')] },
    2: { cloth: '#1e2a5a', hood: '#24306a', over: [GEAR.mantle('#1e2a5a', GOLD), GEAR.stars('#60f0e0', [[8, 64], [14, 61], [50, 62], [56, 66]]), GB.grimoire('#5a1e2a'), GB.wisps('#50e0ff', [[57, 46], [5, 40], [58, 26]])], head: ['hoodShadow', HG.hoodGold([19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49]), 'crown'], back: GEAR.aura('#50e0ff') },
  },
  // 风鹰术士 → 风暴之翼
  dvra: {
    1: { cloth: '#2a6a6a', feather: '#a0e0d8', featherCol: '#b0f0e8', featherBand: rp('#1e5a5a'), back: c => wings(c, '#2a8a8a') },
    2: { cloth: '#1e3a5a', feather: '#c8e0f8', featherCol: '#e0f0ff', featherN: 7, featherBand: SILVER, over: [GB.bolts([[2, 34, 1], [57, 36, -1], [6, 14, 1]]), GEAR.emblem('#ffe040', 31.5, 62, 2)], back: [GEAR.aura('#80c8ff'), c => wings(c, '#2a3a6a', 1.18, 7)] },
  },
};
function branchSpec(id, tier) {
  const base = HERO_SPECS[id], B = BRANCH_LOOK[id];
  if (!base || !B) return null;
  const at = branchAt(id), ks = Object.keys(B).map(Number);
  const t = clamp(tier | 0, at, Math.max(...ks));
  return B[t] ? Object.assign({}, base, B[t]) : null;
}

// =====================================================================
// 超时空英雄传说 2：复仇魔神 —— 新英雄（外观随当前职业 HEROES[id].cls 与阶数变化）
// =====================================================================
const g2Active = () => typeof CUR_CAMPAIGN !== 'undefined' && CUR_CAMPAIGN === 'g2';
// 二代之后的作品（g2 / g3）：回归角色显得成熟
const laterCamp = () => typeof CUR_CAMPAIGN !== 'undefined' && (CUR_CAMPAIGN === 'g2' || CUR_CAMPAIGN === 'g3');
const K_DEF = { c: '#4a5a8a', d: '#2a3a5a', t: '#e8c040', g: '#3a8ae0', c0: '#6a7aa8' };
// —— 二代新增头饰 / 装饰 ——
const HG2 = {
  // 芙蓉花（发侧）
  flower: (col, x, y) => c => {
    const { p } = c; x = x || 42; y = y || 16;
    for (let i = 0; i < 5; i++) { const a = -PI / 2 + i * PI * 0.4; piece(c, ell(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.2, 1.7, a), rp(col), 'flower', { s: 1, hl: 1 }); }
    const ctr = piece(c, ell(x, y, 1.3, 1.3), rp('#f8d040'), 'acc', { s: 0, hl: 1 }); p.px(x - 0.3, y - 0.3, ctr, 5);
  },
  // 叶冠（精灵）：big = 加花与金叶
  leafCrown: (col, flower, big) => c => {
    const lf = rp(col);
    for (let i = 0; i < (big ? 9 : 7); i++) { const t = i / ((big ? 9 : 7) - 1), x = 19 + t * 24.5, y = 20.5 - Math.sin(t * PI) * 3; piece(c, lock(x, y + 1, x + (t - 0.5) * 5, y - (big ? 6 : 4.2), 2.4, (t - 0.5) * 2, 0.2), lf, 'leaf', { s: 1, d: 0, hl: 1 }); }
    piece(c, blob([19.4, 20.6, 31, 18.6, 43.4, 20.2, 43.4, 22.2, 31, 20.6, 19.4, 22.6]), rp('#6a4a22'), 'acc', { s: 0, hl: 1 });
    if (flower) for (const x of big ? [22, 31, 40] : [24, 38]) { const f = piece(c, ell(x, 19.4, 1.8, 1.8), rp(flower), 'flower', { s: 0, hl: 1 }); c.p.px(x, 19, f, 5); }
    if (big) { const g = piece(c, ell(31, 15.5, 1.6, 2), METAL.gold, 'metal', { s: 0, hl: 1 }); }
    c.p.cast('leaf', ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 贝壳冠（海妖）
  shellCrown: c => {
    piece(c, blob([25, 20, 26, 12, 31, 9, 36, 12, 37, 20, 31, 21.5]), rp('#f4c8d8'), 'acc', { s: 1, hl: 1 });
    for (const x of [28, 31, 34]) c.p.line([31, 20.5, x, 11], 'acc', 2, true);
    for (const x of [21, 41]) piece(c, ell(x, 21, 1.4, 1.4), rp('#f4f8ff', { lit: 0.5 }), 'acc', { s: 0, hl: 1 });
  },
};
const GB2 = {
  // 蝙蝠翼（背后）
  batWings: (col) => c => {
    for (const d of [-1, 1]) {
      const X = (x) => 31.5 + d * x;
      const id = piece(c, poly([X(14), 58, X(22), 30, X(34), 14, X(36), 30, X(31), 34, X(34), 44, X(28), 46, X(30), 56, X(22), 58]), rp(col), 'wing', { s: 2, d: 0, hl: 1 });
      for (const [a, b] of [[34, 14], [31, 34], [28, 46]]) c.p.line([X(16), 56, X(a), b], id, 1, true);
    }
  },
  // 金甲虫护符（蛊术）
  beetle: (col) => c => {
    const b = piece(c, ell(31.5, 64.5, 3.2, 3.8), rp(col), 'acc', { s: 1, hl: 1 });
    c.p.line([31.5, 61, 31.5, 68], b, 1, true);
    piece(c, ell(31.5, 60.4, 1.8, 1.4), METAL.gold, 'acc', { s: 0, hl: 1 });
    for (const [x0, y0, x1, y1] of [[28.5, 63, 26, 61], [34.5, 63, 37, 61], [28.5, 66, 26, 68], [34.5, 66, 37, 68]]) c.p.line([x0, y0, x1, y1], c.p.obj(METAL.gold, 'acc', { ol: false }), 2);
  },
};
const bk = (k, ...f) => f.concat(k.w ? [k.w] : []);
const HSO = [19.5, 44, 19.5, 26, 24, 19, 31, 17.5, 38.5, 19, 43.5, 26, 43, 42, 37, 49, 31, 51, 25, 49];
const DRAGON_M = ['#1a0606', '#5a1210', '#8a2018', '#b83a22', '#e07040', '#ffc080'];
const BLUE = '#2a4aa8';
// —— 一代职业的通用外观（按英雄主色 k 着色）——
const CLASS_A = {
  swordsman: k => [
    {},
    { over: [GEAR.pauldrons(STEEL, 'L'), GEAR.bracer(STEEL)], head: 'headband', band: k.c, bandPlate: true },
    { body: 'lightArmor', cloth: k.c, metal: SILVER, over: [GEAR.strap('#6a4020')], head: 'headband', band: k.c, bandPlate: SILVER, back: SW(52, 36, SILVER) },
    { body: 'lightArmor', cloth: k.c, metal: GOLD, over: [GEAR.mantle(k.c, GOLD, 'L'), GEAR.pauldrons(GOLD, 'R')], head: HG.circlet(GOLD, k.g), back: [GEAR.cape(k.c), SW(52, 36, SILVER, GOLD)] },
    { body: 'plate', metal: GOLD, cape: k.d, over: [GEAR.mantle('#f0ece0', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem(k.g, 31.5, 66, 2.8)], head: HG.circlet(GOLD, k.g, true), back: [GEAR.aura('#f4d468'), GEAR.cape(k.d, GOLD), SW(52, 36, SILVER, GOLD)] },
  ],
  knight: k => [
    {},
    { over: [GEAR.mantle(k.c, null, 'L')], head: HG.circlet(STEEL) },
    { body: 'plate', metal: STEEL, cape: k.c, head: 'kettle', nasal: false, crest: k.t, back: GEAR.cape(k.c) },
    { body: 'plate', metal: SILVER, cape: k.c, over: [GEAR.mantle(k.c, SILVER, 'L')], head: 'plumeHelm', plume: '#f0f0f8', helmWings: '#f4f4fc', back: GEAR.cape(k.c, SILVER) },
    { body: 'plate', metal: SILVER, cape: k.d, over: [GEAR.mantle(k.d, GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem(k.g)], head: 'plumeHelm', helmMetal: GOLD, helmBand: SILVER, helmRidge: SILVER, helmHorns: '#f4ecd8', helmGem: k.g, plume: k.t, back: GEAR.cape(k.d, GOLD) },
  ],
  fighter: k => [
    {},
    { over: [GEAR.xstrap(), GEAR.pauldrons(STEEL, 'R'), GEAR.bracer(STEEL)] },
    { body: 'plate', metal: STEEL, torso: 'broad', over: [GEAR.tabard('#eeeaf0')] },
    { body: 'plate', metal: SILVER, torso: 'broad', cape: '#f0eef6', over: [GEAR.tabard('#f4f2f8'), GEAR.pauldrons(GOLD, 'L'), GEAR.emblem('#f0c020', 31.5, 66, 2.6)], back: bk(k, GEAR.cape('#f0eef6', GOLD)) },
    { body: 'plate', metal: GOLD, torso: 'broad', cape: k.c, over: [GEAR.mantle(k.c, GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem(k.g, 31.5, 66, 2.8)], back: bk(k, GEAR.aura('#ff8a3a'), GEAR.cape(k.c, GOLD)) },
  ],
  archer: k => [
    {},
    { head: HG.featherCap(k.c, k.t, 1), back: [bow, quiver] },
    { over: [GEAR.mantle(k.d, rp('#c8a060'))], head: HG.featherCap(k.c, k.t, 2), back: [bow, quiver] },
    { body: 'coat', cloth: k.c, epaulette: STEEL, over: [GEAR.crossbow(STEEL), GEAR.pauldrons(STEEL, 'L')], head: HG.featherCap(k.d, k.t, 2, STEEL), back: null },
    { body: 'coat', cloth: k.d, epaulette: GOLD, over: [GEAR.crossbow(GOLD, '#5a2a1a', true), GEAR.mantle(k.d, GOLD, 'L'), GEAR.emblem(k.g, 31.5, 59, 1.8)], head: HG.featherCap(k.d, k.t, 3, GOLD), back: GEAR.cape(k.d, GOLD) },
  ],
  priest: k => [
    {},
    { over: [GEAR.stole(k.t)], head: ['hood', HG.hoodGold()] },
    { over: [GEAR.mantle(k.t, GOLD), GEAR.cross()], head: ['hood', HG.hoodGold(), HG.circlet(GOLD, k.g)] },
    { body: 'highPriest', trim: k.t, over: [GEAR.mantle('#f4f2f8', GOLD)], head: ['hood', HG.hoodGold(), 'tiara'] },
    { body: 'highPriest', trim: k.t, over: [GEAR.mantle(k.t, GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]]), GEAR.cross(true)], head: ['hood', HG.hoodGold(), HG.circlet(GOLD, '#e02a5a', true)], back: GEAR.aura('#fff0a0') },
  ],
  mage: k => [
    { trim: k.c0 },
    {},
    { head: HG.mageHat(k.c, k.t) },
    { over: [GEAR.mantle(k.c, rp(k.t)), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], head: HG.mageHat(k.c, GOLD, '#f4e070') },
    { cloth: k.d, over: [GEAR.mantle(k.d, GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66], [10, 68.5]])], head: HG.mageHat(k.d, GOLD, '#f4e070'), back: [GEAR.aura(k.g), GEAR.collar(k.d, k.c, GOLD)] },
  ],
  sorcerer: k => [
    {},
    { over: [GEAR.mantle(k.d, rp(k.t))], head: ['hoodShadow', HG.hoodGold(HSO), HG.hoodGem('#c02040')] },
    { cloth: k.d, over: [GEAR.mantle(k.d, GOLD)], head: ['hoodShadow', HG.hoodGold(HSO), HG.hoodHorns('#d8ccb4'), HG.hoodGem('#ff3040')], back: [GEAR.aura(k.g), GEAR.collar(k.d, '#a01a3a', GOLD)] },
  ],
  samurai: k => [
    {},
    { over: [GEAR.dou('#3a2a2e')], head: 'headband', band: '#ece8e0' },
    { over: [GEAR.dou(k.c)], headBack: kabutoBack, head: 'kabuto', helm: '#2a2a3a', kuwa: 'small' },
    { armor: '#a82228', over: [GEAR.dou('#8a1c22', '#e8c050')], headBack: kabutoBack, head: 'kabuto', helm: '#2a2a3a', kuwa: 'big' },
    { armor: '#1e1e28', over: [GEAR.jinbaori('#b01e24', GOLD), GEAR.dou('#1e1e28', '#e8c050')], headBack: kabutoBack, head: 'kabuto', helm: '#1a1a24', kuwa: 'grand', back: bk(k, GEAR.aura('#f07030')) },
  ],
  // —— 二代职业 ——
  adventurer: k => [
    {},
    { body: 'lightArmor', cloth: BLUE, metal: STEEL, over: [GEAR.mantle(BLUE, null, 'L')], head: HG.circlet(STEEL), back: [GEAR.cape(BLUE), SW(52, 36, STEEL)] },
    { body: 'plate', metal: STEEL, cape: BLUE, over: [GEAR.mantle(BLUE, SILVER, 'L'), GEAR.pauldrons(STEEL, 'R', true), GEAR.strap('#5a3418')], head: 'headband', band: BLUE, bandPlate: SILVER, back: [GEAR.cape(BLUE, SILVER), SW(52, 36, SILVER, GOLD)] },
    { body: 'plate', metal: SILVER, cape: BLUE, over: [GEAR.mantle(BLUE, GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#3a8ae0', 31.5, 66, 2.8)], head: HG.circlet(GOLD, '#3a8ae0', true), back: [GEAR.aura('#f4d468'), GEAR.cape(BLUE, GOLD), SW(52, 36, ['#1a2a40', '#6a9ad0', '#a8d0f8', '#e0f4ff', '#ffffff', '#ffffff'], GOLD)] },
  ],
  lordmage: k => [
    { body: 'mageRobe', cloth: BLUE, trim: '#eae6f0', over: [GEAR.strap('#5a3418')], back: SW(52, 36) },
    { body: 'regal', cloth: BLUE, over: [GEAR.emblem('#3a8ae0', 31.5, 62, 2)], head: HG.circlet(GOLD, '#3a8ae0'), back: [GEAR.cape(BLUE, GOLD), SW(52, 36, SILVER, GOLD)] },
    { body: 'highPriest', trim: BLUE, over: [GEAR.mantle('#f4f2f8', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], head: HG.circlet(GOLD, '#3a8ae0', true), back: [GEAR.aura('#fff0a0'), GEAR.cape('#f4f2f8', GOLD)] },
  ],
  whiteKnight: k => [
    {},
    { over: [GEAR.mantle('#f4f2f8', GOLD, 'L'), GEAR.emblem('#d02a3a')], head: HG.circlet(GOLD, '#d02a3a'), back: GEAR.cape('#f4f2f8', GOLD) },
    { over: [GEAR.mantle('#2a3a8a', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#d02a3a')], head: HG.circlet(GOLD, '#d02a3a', true), back: GEAR.cape('#2a3a8a', GOLD) },
    { metal: IVORY, over: [GEAR.mantle('#4a2a8a', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#a040f0', 31.5, 66, 2.8), GB.wisps('#c080ff', [[6, 30], [58, 50], [4, 46]])], head: HG.circlet(GOLD, '#a040f0', true), back: [GEAR.aura('#c080ff'), GEAR.cape('#4a2a8a', GOLD)] },
  ],
  illusionist: k => [
    {},
    { over: [GEAR.mantle('#2a1030', rp('#c02a6a'))], head: [HG2.flower('#f070a0'), HG.circlet(SILVER, '#c02a6a')] },
    { cloth: '#2a0e24', trim: '#0e0814', over: [GEAR.mantle('#1a0a1e', GOLD), GB.wisps('#c040ff', [[57, 46], [5, 40]])], head: [HG2.flower('#c02a6a'), HG.circlet(GOLD, '#c02a6a', true)], back: GEAR.collar('#1a0a1e', '#a01a4a', GOLD) },
    { cloth: '#1a0818', trim: '#0e0814', eyes: 'glow', iris: '#ff40c0', over: [GEAR.mantle('#14061a', BLOOD), GB.wisps('#c040ff', [[57, 46], [5, 40], [58, 26]])], head: [HG.hoodHorns('#9a3a7a'), HG2.flower('#a01a4a')], back: [GEAR.aura('#c040ff'), GB2.batWings('#2a0a30')], bg: BG_DARK },
  ],
  windSword: k => [
    {},
    { over: [GB.ninjaScarf('#c8e0f8', 1.6)], back: SW(52, 36, SILVER) },
    { cloth: '#dce6f4', over: [GEAR.mantle('#7aa4d0', SILVER), GB.ninjaScarf('#c8e0f8', 2)], head: HG.circlet(SILVER, '#60c0ff'), back: [SW(52, 36, ICE, SILVER), GB.wisps('#a0e0ff', [[5, 40]])] },
    { cloth: '#f0f4fa', over: [GEAR.mantle('#f0f4fa', SILVER), GEAR.pauldrons(SILVER, 'L', true), GB.ninjaScarf('#a0d0f8', 2.4)], head: HG.circlet(SILVER, '#60c0ff', true), back: [GEAR.aura('#a0e0ff'), SW(52, 36, ICE, GOLD)] },
  ],
  prayer: k => [
    {},
    { over: [GEAR.breast(SILVER, '#c02a4a'), GEAR.pauldrons(SILVER)], head: 'tiara' },
    { body: 'highPriest', trim: '#c02a4a', over: [GEAR.mantle('#c02a4a', GOLD)], head: ['tiara', HG.circlet(GOLD, '#20b0a0')] },
    { body: 'highPriest', trim: '#d0a030', over: [GEAR.mantle('#f4f2f8', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66]])], head: ['tiara', HG.circlet(GOLD, '#e02a5a', true)], back: [GEAR.aura('#fff0a0'), c => wings(c, '#f4f4fc', 0.9, 5)] },
  ],
  swordMad: k => [
    {},
    { over: [GEAR.mantle('#6a0e14', null, 'L'), GEAR.strap('#3a0a0e')], head: 'headband', band: '#8a1a20', back: SW(53, 35, STEEL, METAL.black) },
    { cloth: '#120e18', over: [GEAR.mantle('#4a0a10', BLOOD), GEAR.pauldrons(METAL.black, 'R', true)], head: 'headband', band: '#1a1a24', bandPlate: BLOOD, bandGem: '#ff3020', back: [GEAR.aura('#c01020'), SW(53, 35, BLOOD, GOLD)] },
  ],
  gushi: k => [
    {},
    { over: [GEAR.mantle('#2a4a1e', rp('#8a6a2a')), GB.beads('#c8a050'), GB2.beetle('#3a8a2a')], head: ['headband', HB.warpaint('#40a040')] },
    { cloth: '#1e3a1a', over: [GEAR.mantle('#1e3a1a', GOLD), GB.beads('#f0c040', true), GB2.beetle('#60c030'), GB.wisps('#80ff60', [[57, 46], [5, 40]])], head: [HB.skullHelm(rp('#6a8a3a'), '#c8d890'), HB.warpaint('#40a040')], back: GEAR.aura('#60e040') },
  ],
};
// B 路线（一代职业沿用对应一代英雄的分支造型）
const B_DONOR = { swordsman: 'oz', knight: 'yangtie', fighter: 'augustus', samurai: 'slade', archer: 'judy', priest: 'xueer', mage: 'lian', sorcerer: 'hao' };
const CLASS_B = {
  adventurer: {
    2: { body: 'plate', metal: IVORY, cape: '#f4f2f8', over: [GEAR.mantle('#f4f2f8', GOLD, 'R'), GEAR.pauldrons(GOLD, 'R', true), GB.shield(rp('#f4f2f8'), GOLD, 'cross')], head: HG.circlet(GOLD, '#3a8ae0'), back: GEAR.cape(BLUE, GOLD) },
    3: { body: 'plate', metal: DRAGON_M, cape: BLUE, over: [GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#ff6020', 31.5, 66, 2.8)], head: 'plumeHelm', helmMetal: DRAGON_M, helmBand: GOLD, helmRidge: GOLD, helmHorns: '#f4ecd8', helmGem: '#ff6020', plume: '#f0c040', back: [GEAR.aura('#ff8030'), c => wings(c, '#8a2418', 1.1, 6), GEAR.cape(BLUE, GOLD)] },
  },
};
// 二代英雄：base = 第 0 阶造型；cls = 初始职业；k = 配色；a / b = 个人覆盖（按职业）
const G2_HEROES = {
  qingfeng: { cls: 'adventurer', lv: 3, k: {},
    base: { face: 'm', skin: 'fair', hair: '#6a3a1a', hairStyle: 'swept', iris: '#3a6ab0', eyes: 'hero', brow: 'normal', mouth: 'smile', body: 'tunic', cloth: '#a8784a', over: [GEAR.strap('#5a3418'), GEAR.mantle(BLUE, null, 'L')], back: [GEAR.cape(BLUE), SW(52, 36)] } },
  bai: { cls: 'swordsman', lv: 4, k: { c: '#2a4a8a', d: '#1a2a5a', g: '#3a8ae0' },
    base: { face: 'man', skin: 'warm', hair: '#2a2430', hairStyle: 'neat', iris: '#3a3a5a', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'strap', cloth: '#2a4a8a', trim: '#e8e4dc', back: SW(52, 36) } },
  eva: { cls: 'whiteKnight', lv: 4, k: {},
    base: { face: 'f', skin: 'fair', hair: '#c83a2a', hairStyle: 'wavy', iris: '#2a7a5a', eyes: 'girl', brow: 'stern', mouth: 'small', body: 'plate', metal: SILVER, cape: '#f4f2f8', head: HG.circlet(SILVER, '#d02a3a'), back: GEAR.cape('#f4f2f8') } },
  nuolu: { cls: 'fighter', lv: 3, k: { c: '#8a3a1a', g: '#d02030', w: GB.bigBlade(STEEL, 'axe') },
    base: { face: 'broad', skin: 'tan', hair: '#8a5a2a', hairStyle: 'shaggy', iris: '#4a2a1a', eyes: 'sharp', brow: 'stern', thickBrow: true, mouth: 'grin', nose: 'big', beard: 'full', body: 'vest', cloth: '#5a3a24', back: GB.bigBlade(STEEL, 'axe') } },
  sonia: { cls: 'archer', lv: 3, k: { c: '#6a5a2a', d: '#4a3a1a', t: '#e8c040', g: '#2ab0a0' },
    base: { face: 'f', skin: 'warm', hair: '#d8a040', hairStyle: 'ponytail', iris: '#2a7a6a', eyes: 'girl', brow: 'normal', mouth: 'smile', blush: true, body: 'archer', cloth: '#6a5a2a', back: bow } },
  shamanshan: { cls: 'mage', lv: 2, k: { c: '#6a3aa0', d: '#3a1e6a', t: '#f0e8f8', c0: '#8a6ab8', g: '#c080ff' },
    base: { face: 'f', skin: 'fair', hair: '#4a3a8a', hairStyle: 'bob', iris: '#8a4ad0', eyes: 'girl', brow: 'soft', mouth: 'small', blush: true, body: 'mageRobe', cloth: '#6a3aa0', trim: '#f0e8f8' } },
  furong: { cls: 'illusionist', lv: 4, k: {},
    base: { face: 'f', skin: 'pale', hair: '#1e1a2a', hairStyle: 'wavy', iris: '#a02a6a', eyes: 'girl', brow: 'soft', mouth: 'lips', body: 'princess', cloth: '#5a1a3a', trim: '#1a1028', earring: true, head: HG2.flower('#f070a0') } },
  qili: { cls: 'sorcerer', lv: 9, k: { d: '#2a1e4a', t: '#8a6ab8', g: '#a060f0' },
    base: { face: 'old', skin: 'old', hair: '#d8d8e8', hairStyle: 'sides', iris: '#5a4a7a', eyes: 'kind', brow: 'worried', thickBrow: true, mouth: 'neutral', nose: 'big', beard: 'long', body: 'sorcerer', cloth: '#3a2a5a', headBack: 'hood', head: 'hoodShadow', hood: '#3e2e62', lines: c => oldLines(c, true) } },
  qiuyue: { cls: 'windSword', lv: 8, k: {},
    base: { face: 'f', skin: 'pale', hair: '#d8d0f0', hairStyle: 'hime', iris: '#5a6ac0', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'master', cloth: '#4a6a9a', back: SW(52, 36) } },
  aifulin: { cls: 'priest', lv: 9, k: { t: '#3a3456', g: '#8a6ae0' },
    base: { face: 'f', skin: 'fair', hair: '#e8c8a0', hairStyle: 'bob', iris: '#6a8ac0', eyes: 'girl', brow: 'soft', mouth: 'small', blush: true, body: 'priestRobe', cloth: '#2a2630', trim: '#e8e4f0', headBack: 'hood', head: 'hood', hood: '#2a2632' } },
  laweisi: { cls: 'gushi', lv: 9, k: {},
    base: { face: 'm', skin: 'tan', hair: '#3a5a3a', hairStyle: 'wild', iris: '#8ac040', eyes: 'sharp', brow: 'normal', mouth: 'smirk', body: 'tunic', cloth: '#3a6a2a', over: [GB.beads('#c8a050')], head: 'headband', band: '#2a5a2a', bandGem: '#c0e040' } },
  jienuo: { cls: 'knight', lv: 14, k: { c: '#a82a3a', d: '#8a1a28', t: '#e03040', g: '#2a6ae0' },
    base: { face: 'man', skin: 'warm', hair: '#3a3a5a', hairStyle: 'neat', iris: '#3a4a6a', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'lightArmor', cloth: '#a82a3a' } },
  xiaoling: { cls: 'sorcerer', lv: 13, k: {},
    base: { face: 'f', skin: 'fair', hair: '#7ad87a', hairStyle: 'ponytail', iris: '#2a9a5a', eyes: 'girl', brow: 'soft', mouth: 'smile', blush: true, elfEar: true, body: 'mageRobe', cloth: '#3a8a4a', trim: '#e8f4d8', head: HG2.leafCrown('#4aa04a') },
    a: { sorcerer: [
      {},
      { over: [GEAR.mantle('#2a6a3a', rp('#c8e8a0'))], head: HG2.leafCrown('#4aa04a', '#f8a0c0') },
      { cloth: '#2a6a3a', over: [GEAR.mantle('#1e5a2e', GOLD), GB.wisps('#a0ff80', [[57, 46], [5, 40]])], head: HG2.leafCrown('#5ab05a', '#f8a0c0', true), back: GEAR.aura('#a0ff80') },
    ] },
    b: { sorcerer: { 1: { headBack: 'hood', elfEar: false }, 2: { headBack: 'hood', elfEar: false } } } },
  yilinna: { cls: 'prayer', lv: 14, k: {},
    base: { face: 'f', skin: 'fair', hair: '#f4d474', hairStyle: 'hime', iris: '#3a7ad8', eyes: 'girl', brow: 'soft', mouth: 'small', blush: true, body: 'priestRobe', cloth: '#f4f2f8', trim: '#c02a4a', head: 'tiara', earring: true } },
  aiwen: { cls: 'samurai', lv: 17, k: { c: '#4a3a2a', w: SW(52, 36) },
    base: { face: 'man', skin: 'warm', hair: '#2a2a2a', hairStyle: 'shaggy', iris: '#3a3030', eyes: 'stern', brow: 'stern', mouth: 'neutral', nose: 'long', beard: 'stubble', body: 'samurai', cloth: '#4a3a2a', armor: '#5a4a3a', back: SW(52, 36) } },
  rentian: { cls: 'mage', lv: 18, k: { c: '#2a3a6a', d: '#1a2448', t: '#c8c0d8', c0: '#4a5a8a', g: '#80a0ff' },
    base: { face: 'man', skin: 'fair', hair: '#5a6a8a', hairStyle: 'short', iris: '#3a5ab0', eyes: 'sharp', brow: 'normal', mouth: 'neutral', body: 'mageRobe', cloth: '#2a3a6a', trim: '#c8c0d8' } },
  xingtian: { cls: 'swordMad', lv: 22, k: {},
    base: { face: 'man', skin: 'pale', hair: '#1a1a24', hairStyle: 'wildLong', iris: '#8a1a2a', eyes: 'sharp', brow: 'stern', mouth: 'neutral', body: 'cloak', cloth: '#1a1a26', back: SW(53, 35, STEEL) } },
};
// 二代回归角色：略显成熟（仅二代进行中）
const G2_OLDER = {
  judy: { eyes: 'adult', blush: false, mouth: 'small' },
  dvra: { eyes: 'adult', mouth: 'neutral' },
  wushuang: { eyes: 'adult', mouth: 'small' },
  kaidi: { eyes: 'adult', mouth: 'smirk' },
  yangtie: { eyes: 'stern', brow: 'stern', beard: 'stubble', mouth: 'neutral' },
};
function g2Cls(id) {
  const h = G2_HEROES[id];
  // 自由转职后以存档里的职业为准
  const ros = typeof S !== 'undefined' && S && S.roster && S.roster[id];
  const cur = (ros && ros.cls) || (typeof HEROES !== 'undefined' && HEROES[id] && HEROES[id].cls);
  return (cur && (CLASS_A[cur] || (h.a && h.a[cur]))) ? cur : h.cls;
}
function g2Native(cls, lv) {
  try { const T = CLASSES[cls].tiers; let t = 0; T.forEach((x, i) => { if (lv >= x.lv) t = i; }); return t; } catch (e) { return 0; }
}
function g2Spec(id, tier, path) {
  const h = G2_HEROES[id], cls = g2Cls(id);
  if (h.single) return h.base;
  const kk = Object.assign({}, K_DEF, h.k);
  const A = (h.a && h.a[cls]) || (CLASS_A[cls] ? CLASS_A[cls](kk) : [{}]);
  let lv = h.lv; try { if (HEROES[id] && HEROES[id].lv) lv = HEROES[id].lv; } catch (e) { /* 无 HEROES */ }
  const t = clamp(tier == null ? g2Native(cls, lv) : tier | 0, 0, A.length - 1);
  if (path === 'b') {
    const donor = B_DONOR[cls], bo = CLASS_B[cls] ? CLASS_B[cls][t] : donor && BRANCH_LOOK[donor] && BRANCH_LOOK[donor][t];
    const bx = h.b && h.b[cls] && h.b[cls][t];
    if (bo) return Object.assign({}, h.base, bo, bx || {});
  }
  return Object.assign({}, h.base, A[t]);
}

// —— 二代敌人 ——
function treantHead(v) {
  const p = mpic();
  const bark = ramp(vcol(v, '#6a4a2a'), { shift: 8 }), leaf = ramp('#2a6a2a', { lit: 0.3 });
  // 树冠（簇叶）
  const blobs = [];
  for (const [x, y, r] of [[6, 18, 8], [14, 9, 9], [26, 5, 9], [39, 5, 9], [51, 9, 9], [58, 18, 8], [20, 20, 9], [44, 20, 9], [32, 14, 11]]) blobs.push(ell(x, y, r, r * 0.85));
  mp(p, union(...blobs), leaf, 'leaf', { s: 2, d: 1, hl: 1 });
  for (const [x, y, r] of [[14, 9, 9], [26, 5, 9], [39, 5, 9], [51, 9, 9], [32, 14, 11]]) p.shade(ell(x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.3), 'leaf', 4);
  texture(p, ['leaf'], 'scale', 'tl', 0.05);
  // 枝臂
  mp(p, union(lock(14, 58, 1, 40, 4, 2, 2), lock(50, 58, 63, 40, 4, -2, 2), lock(4, 44, -1, 36, 2, 0, 1), lock(60, 44, 65, 36, 2, 0, 1)), bark, 'bark', { s: 1, hl: 1 });
  // 树干（脸）
  const t = mp(p, blob([10, 74, 13, 50, 14, 30, 20, 20, 32, 17, 44, 20, 50, 30, 51, 50, 54, 74]), bark, 'bark', { s: 3, d: 1, hl: 1, dx: 1, dy: 0.3 });
  for (const l of [[18, 32, 17, 48, 19, 70], [26, 54, 25, 72], [40, 54, 41, 72], [46, 30, 47, 48, 45, 70]]) p.line(l, t, 1, true);
  // 眼洞 + 嘴
  const hole = p.add(rect(0, 0, 0, 0), ['#000000', '#0a0604', '#140c06', '#1e1208', '#3a2810', '#5a4020'], 'hole');
  p.fill(union(ell(24, 36, 4, 3.6), ell(40, 35.5, 4, 3.6)), hole, 2);
  p.fill(blob([22, 48, 32, 46, 42, 48, 39, 54, 32, 56, 25, 54]), hole, 1);
  const g = p.obj(['#203000', '#80c020', '#c0f040', '#f0ff80', '#ffffd0', '#ffffff'], 'glow', { ol: false });
  for (const [x, y] of [[24, 36], [40, 35.5]]) { p.px(x, y, g, 4); p.px(x + 1, y, g, 3); p.px(x, y + 1, g, 3); p.px(x - 1, y, g, 2); }
  mp(p, union(ell(10, 20, 3, 2), ell(52, 22, 3, 2)), ramp('#e05a8a'), 'flower', { s: 0, hl: 1 });
  return p.render(BG);
}
MONSTERS.treant = (v) => treantHead(v);
MONSTERS.silverWolf = (v) => wolfHead(v && v !== 'silver' ? v : '#b8bcd0');

// =====================================================================
// 超时空英雄传说 2 外传：北方密使（g3）—— 新职业外观、新英雄、NPC 与敌人
// =====================================================================
const SEA_M = ['#06201e', '#14504a', '#22807a', '#3ab0a4', '#7ee0d0', '#d8fff8'];
const BRONZE = METAL.bronze;
const TECH_M = ['#0a1220', '#1e3456', '#2e5288', '#4a7ab8', '#8ab8e8', '#e8f6ff'];
// —— 头部（脸部坐标）——
const HG3 = {
  // 大蝴蝶结（宝儿）
  ribbon: (col) => c => {
    const r = rp(col);
    piece(c, union(blob([40, 14, 33, 6, 31, 12, 36, 17]), blob([42, 14, 49, 6, 51, 12, 46, 17])), r, 'acc', { s: 1, d: 0, hl: 1 });
    piece(c, union(lock(40, 16, 36, 24, 2, 1, 1.2), lock(42, 16, 47, 24, 2, -1, 1.2)), r, 'acc', { s: 1, hl: 1 });
    const k = piece(c, ell(41, 14, 2, 2), r, 'acc', { s: 0, hl: 1 }); c.p.px(40.5, 13.5, k, 5);
  },
  // 沙漠珠冠（奥帕儿）：金额链 + 垂珠 + 两侧纱
  desertVeil: (silk, gem) => c => {
    const { p } = c;
    for (const x of [20.4, 42.6]) { piece(c, rect(x - 0.5, 21.5, 1.1, 6), METAL.gold, 'metal', { s: 0, hl: 1 }); piece(c, ell(x + 0.05, 28.6, 1.4, 1.6), rp(silk), 'acc', { s: 0, hl: 1 }); }
    piece(c, blob([19.4, 20.4, 31, 18.2, 43.4, 20, 43.4, 22, 31, 20.4, 19.4, 22.6]), METAL.gold, 'metal', { s: 0, hl: 1 });
    for (let i = 0; i < 9; i++) { const x = 21 + i * 2.6, y = 22.2 + Math.sin(i / 8 * PI) * 1.4; piece(c, ell(x, y, 0.9, 1), METAL.gold, 'acc', { s: 0, hl: 1 }); }
    piece(c, poly([31, 20, 32.6, 22.4, 31, 25.4, 29.4, 22.4]), METAL.gold, 'acc', { s: 0, hl: 1 });
    const g = piece(c, ell(31, 22.6, 1.1, 1.4), rp(gem || '#20c0b0', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); p.px(30.6, 22, g, 5);
    p.cast('metal', ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 发带 + 羽毛（奚族）
  featherBand: (band, feather, n) => c => {
    for (let i = 0; i < (n || 1); i++) { const f = piece(c, lock(42 - i * 2, 18 - i * 0.5, 47 + i * 3, 2 - i * 2, 2.6, -1.5, 0.4), rp(i % 2 ? '#f0ece0' : feather), 'feather', { s: 1, hl: 1 }); c.p.line([42 - i * 2, 18, 46 + i * 3, 4 - i * 2], f, 2, true); }
    const b = piece(c, blob([19.4, 20.6, 31, 18.6, 43.4, 20.2, 43.4, 23.2, 31, 21.8, 19.4, 23.8]), rp(band), 'acc', { s: 1, hl: 1 });
    for (const x of [24, 31, 38]) c.p.spx(x, 21.4, b, 5);
    c.p.cast(b, ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 鱼鳍冠
  finCrest: (col) => c => {
    const f = piece(c, poly([20, 18, 22, 4, 27, 10, 30, 0, 34, 9, 39, 2, 42, 12, 45, 8, 44, 20, 31, 16]), rp(col, { lit: 0.45 }), 'fin', { s: 2, d: 0, hl: 1 });
    for (const x of [24, 30, 36, 41]) c.p.line([x, 17, x - 1, 6], f, 2, true);
    for (const d of [-1, 1]) piece(c, poly([31 + d * 12, 26, 31 + d * 19, 21, 31 + d * 18, 31, 31 + d * 13, 32]), rp(col), 'fin', { s: 1, hl: 1 });
  },
  // 小丑帽（双角 + 铃铛）
  jesterHat: (c1, c2) => c => {
    const { p } = c;
    piece(c, blob([19, 20, 18, 12, 9, 6, 3, 14, 6, 13, 12, 13, 20, 8, 31, 6, 31, 18]), rp(c1), 'hat', { s: 2, d: 1, hl: 1 });
    piece(c, blob([31, 18, 31, 6, 42, 8, 50, 13, 56, 13, 59, 14, 53, 6, 44, 12, 43, 20]), rp(c2), 'hat', { s: 2, d: 1, hl: 1 });
    for (const [x, y] of [[4, 15], [58, 15]]) { const b = piece(c, ell(x, y, 2, 2), METAL.gold, 'acc', { s: 0, hl: 1 }); p.px(x - 0.5, y - 0.5, b, 5); }
    piece(c, blob([18.6, 19.6, 31, 17, 43.6, 19.6, 43.6, 22.6, 31, 20.4, 18.6, 22.8]), rp('#f4f0e8'), 'acc', { s: 1, hl: 1 });
    p.cast('hat', ['skin', 'hair'], 0, 1, 2, 3);
  },
  // 小丑脸彩：眼下星 + 红鼻
  jesterPaint: c => {
    const { p, F } = c, id = p.obj(rp('#3a3ac0'), 'paint', { ol: false }), r = p.obj(rp('#e02020'), 'paint', { ol: false });
    const sx = F.nx + 2, sy = F.ey + 8.6;
    p.line([sx - 1.2, sy, sx + 1.2, sy], id, 3); p.line([sx, sy - 1.2, sx, sy + 1.2], id, 3);
    p.fill(ell(F.nose[0] + 0.4, F.nose[1] + 0.2, 1.1, 1), r, 3); p.px(F.nose[0], F.nose[1] - 0.4, r, 5);
  },
  // 科技护目镜头盔（敌兵）
  techVisor: (mt, glow) => c => {
    const { p } = c;
    piece(c, blob([16.5, 34, 16.8, 18, 22, 9, 31, 6.5, 40, 9, 45.5, 18, 46, 34, 43, 36, 42.6, 26, 31, 24, 20.4, 26, 20, 36]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
    const v = p.add(blob([19.5, 27, 31, 25.4, 43.5, 27, 43, 34, 31, 33, 20, 34.4]), ['#000810', '#04304a', '#0a6a9a', glow || '#30d0ff', '#a0f4ff', '#ffffff'], 'visor');
    p.line([21, 30, 31, 29, 42, 30], v, 4); p.line([22, 28, 30, 27.4], v, 5);
    p.line([31, 7, 31, 24], 'metal', 4, true);
    piece(c, union(lock(44, 14, 50, 2, 1.2, 0, 1), ell(50, 2, 1.4, 1.4)), mt, 'metal', { s: 0, hl: 1 });
  },
  // 第三只眼（魔化）
  thirdEye: c => { const { p } = c; const id = p.add(ell(31, 17.5, 2.2, 1.6), ['#200008', '#80101a', '#e02030', '#ff6040', '#ffd0a0', '#ffffff'], 'eye3'); p.px(31, 17.5, id, 0); p.px(30.5, 17, id, 5); },
};
// —— 身体（画面 / 身体坐标）——
const GB3 = {
  // 皱领（小丑）
  ruff: (c1, c2) => c => { for (let i = 0; i < 9; i++) { const a = PI * (1.06 - i * 0.1 - 0.0), x = 31.5 + Math.cos(a) * 12.5, y = 54 - Math.sin(a) * -3.5 + Math.abs(i - 4) * 0.3; piece(c, ell(x, y, 3, 2.6), rp(i % 2 ? c2 : c1), 'ruff', { s: 1, d: 0, hl: 1 }); } },
  // 菱格纹
  diamonds: (c1, c2) => c => { for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const x = 4 + k * 9 + (r % 2) * 4.5, y = 62 + r * 5; piece(c, poly([x, y - 3, x + 3.2, y, x, y + 3, x - 3.2, y]), rp((r + k) % 2 ? c1 : c2), 'dia', { s: 0, hl: 1 }); } },
  // 鳞片
  scales: (col) => c => { const id = c.p.obj(rp(col), 'acc', { ol: false }); for (let r = 0; r < 4; r++) for (let x = 6 + (r % 2) * 3; x < 60; x += 6) c.p.line([x - 2.4, 60 + r * 3.6, x, 61.6 + r * 3.6, x + 2.4, 60 + r * 3.6], id, 4); },
  // 浮空灵剑（画面坐标）
  floatSwords: (pal, pts) => scr(c => {
    for (const [x, y] of pts || [[5, 34], [58, 30], [3, 50], [60, 48]]) {
      piece(c, poly([x - 1, y - 6, x + 1, y - 6, x + 1, y + 4, x, y + 7, x - 1, y + 4]), pal, 'metal', { s: 0, hl: 1 });
      piece(c, rect(x - 2.6, y - 6.6, 5.2, 1.4), METAL.gold, 'acc', { s: 0, hl: 1 });
      piece(c, rect(x - 0.7, y - 9.6, 1.4, 3), rp('#5a2a1a'), 'acc', { s: 0, hl: 0 });
    }
  }),
  // 玫瑰徽
  rose: (col, x, y) => c => { x = x || 31.5; y = y || 64; for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; piece(c, ell(x + Math.cos(a) * 1.9, y + Math.sin(a) * 1.9, 1.9, 1.6, a), rp(col), 'flower', { s: 1, hl: 1 }); } const k = piece(c, ell(x, y, 1.3, 1.3), rp(col), 'flower', { s: 0, hl: 0 }); c.p.px(x, y, k, 1); },
  // 领结 + 红宝石（吸血鬼）
  cravat: c => { piece(c, blob([27, 54, 31, 56, 36, 54, 35, 62, 31, 64, 28, 62]), rp('#f4f0f4'), 'cloth', { s: 1, hl: 0 }); const g = piece(c, ell(31.5, 58, 1.8, 2), rp('#c01020', { lit: 0.5 }), 'acc', { s: 0, hl: 1 }); c.p.px(31, 57.4, g, 5); },
  // 科技光纹
  techLines: (col) => c => { const id = c.p.obj(rp(col, { lit: 0.55 }), 'glow', { ol: false }); for (const l of [[24, 60, 24, 72], [39, 60, 39, 72], [24, 66, 39, 66], [6, 60, 14, 58], [50, 58, 58, 60]]) c.p.line(l, id, 4); },
  // 骨饰项链
  boneNecklace: c => { for (let i = 0; i <= 6; i++) { const a = PI * (0.18 + i * 0.107), x = 31.5 + Math.cos(a) * 10.5, y = 53 + Math.sin(a) * 9; piece(c, i % 2 ? ell(x, y, 1.3, 1.3) : poly([x - 1, y - 1, x + 1, y - 1, x, y + 3]), i % 2 ? rp('#c83a2a') : BONE, 'acc', { s: 0, hl: 1 }); } },
};
// 小队通用色
const TRIBE_RED = '#b03a24';
// —— g3 职业外观（加入 CLASS_A / CLASS_B）——
Object.assign(CLASS_A, {
  swordHand: k => [
    {},
    { over: [GEAR.mantle(k.c, null, 'L'), GEAR.pauldrons(STEEL, 'R')], head: 'headband', band: k.c, bandPlate: STEEL, back: SW(52, 36, SILVER) },
    { body: 'lightArmor', cloth: k.c, metal: SILVER, over: [GEAR.mantle(k.c, SILVER, 'L')], head: HG.circlet(SILVER, k.g), back: [GEAR.cape(k.c), SW(52, 36, SILVER, GOLD)] },
    { body: 'plate', metal: METAL.black, cape: '#8a1018', over: [GEAR.mantle('#8a1018', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#ff3020', 31.5, 66, 2.8)], head: HG.circlet(GOLD, '#ff3020', true), back: [GEAR.aura('#ff5030'), GEAR.cape('#8a1018', GOLD), SW(52, 36, SILVER, GOLD)] },
  ],
  magicKnight: k => [
    {},
    { metal: SILVER, cape: '#a01a3a', over: [GEAR.mantle('#a01a3a', GOLD, 'L'), GEAR.pauldrons(GOLD, 'R'), GB3.rose('#e02a4a')], head: [HG.circlet(GOLD, '#e02a4a'), HG2.flower('#e02a4a', 42, 15)], back: GEAR.cape('#a01a3a', GOLD) },
    { metal: GOLD, cape: '#f4f2f8', over: [GEAR.mantle('#f4f2f8', GOLD), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#40c0ff', 31.5, 66, 2.6), GB.bolts([[2, 30, 1], [58, 34, -1]])], head: 'plumeHelm', helmMetal: GOLD, helmBand: SILVER, helmRidge: SILVER, helmWings: '#f4f4fc', plume: false, helmGem: '#40c0ff', back: [GEAR.aura('#a0d8ff'), GEAR.cape('#f4f2f8', GOLD)] },
  ],
  killer: k => [
    {},
    { over: [GEAR.mantle(k.d, GOLD, 'L'), GEAR.emblem('#d02030', 31.5, 62, 1.8), GB.ninjaScarf(k.c, 1.2)], headBack: 'hood', head: ['hood', HG.hoodGold()], hood: k.d },
    { over: [GB.ninjaScarf('#c01a2a', 2.2), GEAR.strap('#3a1a10'), GB.armGuards(METAL.black)], head: HG.featherCap('#1a1420', '#d02030', 2, GOLD), back: GEAR.cape('#2a0a14', rp('#c01a2a')) },
  ],
  crossbowman: k => [
    {},
    { over: [GEAR.crossbow(STEEL, '#6a3a1a', true), GEAR.mantle(k.d, rp('#e8dcc0'), 'L'), GB3.boneNecklace], head: HG3.featherBand(k.t, '#d84a2a', 2) },
    { body: 'lightArmor', cloth: k.c, metal: BRONZE, over: [GEAR.crossbow(GOLD, '#5a2a1a', true), GEAR.mantle(k.d, GOLD), GB3.boneNecklace], head: HG3.featherBand('#d8a830', '#d84a2a', 3), back: [GEAR.aura('#ffb040'), GEAR.cape(k.d, GOLD)] },
  ],
  medium: k => [
    {},
    { over: [GEAR.mantle(k.d, rp('#e8dcc0')), GB.wisps('#a0e0ff', [[57, 46]])], head: HG3.featherBand(k.t, '#f0ece0', 2) },
    { over: [GEAR.mantle(k.d, GOLD), GB.beads('#f0c040', true), GB.wisps('#a0e0ff', [[57, 46], [5, 40], [58, 26]])], head: [HG3.featherBand(k.t, '#f0ece0', 3), HG.circlet(GOLD, '#40c0ff')], back: GEAR.aura('#a0e0ff') },
  ],
  child: k => [
    {},
    { cloth: '#f8f4fc', over: [GEAR.mantle('#fff4fa', GOLD), GEAR.stars('#fff4b8', [[6, 64], [14, 60.5], [50, 61.5], [57, 66], [10, 69]])], head: [HG3.ribbon('#ffd060'), HG.circlet(GOLD, '#ff80b0', true)], back: [GEAR.aura('#fff0a0'), c => wings(c, '#f8f4ff', 0.85, 5)] },
  ],
  princess: k => [{}],
  martial: k => [
    {},
    { over: [GB.gi(k.c, '#1a1a1a'), GB.beads('#8a4a20'), GB.armGuards(rp('#6a4a2a')), GB.fist('#e8e0d0')], head: 'headband', band: '#c82020' },
    { over: [GEAR.mantle('#e8901e', GOLD), GB.gi('#f4f2f8', GOLD, '#f0d8a0'), GB.beads('#f0c040', true), GB.fist(GOLD, '#ffc040')], head: 'headband', band: '#e8901e', bandPlate: GOLD, bandGem: '#e02a3a', back: GEAR.aura('#ff9a20') },
  ],
  barbarian: k => [
    {},
    { over: [GB.bodyPaint('#c02020'), GB.fur('#5a4a3a')], head: [HB.skullHelm(), HB.warpaint('#c81e1e')], back: GB.bigBlade(STEEL, 'axe') },
    { over: [GB.fur('#8a6a3a'), GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#ff3020', 31.5, 66, 2.6)], head: [HB.demonHelm(GOLD, '#f4ecd8'), HB.warpaint('#e02020')], back: [GEAR.aura('#ff6020'), GEAR.cape('#8a1a14', GOLD), GB.bigBlade(BLOOD, 'axe', true)] },
  ],
  // 隐藏职业（任何人都可转）
  fishman: k => [{ skin: 'sea', elfEar: true, blush: false, body: 'plate', metal: SEA_M, cape: null, emblem: null, over: [GB3.scales('#7ee0d0'), GEAR.pauldrons(SEA_M)], head: HG3.finCrest('#2ab0a4'), headBack: null, back: SW(52, 36, SEA_M, SEA_M) }],
  vampire: k => [{ skin: 'pale', iris: '#c01020', mouth: 'fang', blush: false, body: 'cloak', cloth: '#1a0a14', over: [GB3.cravat], head: null, headBack: null, back: [GB2.batWings('#2a0a1a'), GEAR.collar('#1a0a14', '#a01020')] }],
  harpy: k => [{ body: 'hawk', cloth: '#5a2a6a', feather: '#e8b0e0', head: 'feathers', headBack: null, featherN: 5, featherCol: '#f0b0e0', featherBand: rp('#6a2a8a'), featherGems: false, back: c => wings(c, '#8a4a9a', 1, 6) }],
  jester: k => [{ body: 'tunic', cloth: '#c02a2a', over: [GB3.diamonds('#f0c020', '#2a2aa0'), GB3.ruff('#f4f0e8', '#c02a2a')], head: [HG3.jesterHat('#c02a2a', '#2a2aa0'), HG3.jesterPaint], headBack: null, mouth: 'grin', back: null }],
});
Object.assign(CLASS_B, {
  swordHand: {
    2: { body: 'lightArmor', cloth: '#3a2a6a', metal: ARCANE, over: [GEAR.mantle('#4a2a8a', SILVER), GEAR.stars('#a0e0ff', [[7, 63], [56, 64]])], head: HG.circlet(SILVER, '#a060f0'), back: SW(52, 36, RUNE_BLADE, SILVER) },
    3: { body: 'plate', metal: IVORY, cape: '#2a5a8a', over: [GEAR.mantle('#f0f4fa', rp('#60c0ff')), GEAR.pauldrons(IVORY, null, true), GEAR.emblem('#40e0ff', 31.5, 66, 2.8), GB3.floatSwords(RUNE_BLADE)], head: HG.circlet(GOLD, '#40e0ff', true), back: [GEAR.aura('#80e0ff'), GEAR.cape('#2a5a8a', GOLD), SW(52, 36, RUNE_BLADE, GOLD)] },
  },
  crossbowman: {
    2: { cloth: '#2a1a3a', elfEar: true, over: [GEAR.crossbow(ARCANE, '#1a0a1e', true), GEAR.mantle('#1e0e2a', rp('#a040f0')), GB.wisps('#c060ff', [[58, 50], [5, 42]])], headBack: 'hood', head: ['hood', HG.hoodGold()], hood: '#24122e', back: GEAR.aura('#a040f0') },
  },
  medium: {
    2: { el: { robe: '#2a1430', trim: '#0e0614', bead: '#c02040' }, over: [GEAR.mantle('#1a0a1e', BLOOD), GB.wisps('#ff3070', [[57, 46], [5, 40], [58, 26]])], head: [HG.hoodHorns('#9a3a7a'), HG3.featherBand('#2a0a2a', '#a01a4a', 2)], back: GEAR.aura('#c02060') },
  },
});
Object.assign(BRANCH_AT, { swordHand: 2, crossbowman: 2, medium: 2 });
MOUTHS.fang = { o: [-2, -1], t: ['1111', '.5.5'] };
const g3el = (robe, trim, bead) => ({ robe, trim, bead });
// —— g3 新英雄 / NPC ——
Object.assign(G2_HEROES, {
  feishuang: { cls: 'magicKnight', lv: 2, k: {},
    base: { face: 'f', skin: 'fair', hair: '#a8c8f0', hairStyle: 'bob', iris: '#2a6ad0', eyes: 'girl', brow: 'stern', mouth: 'small', body: 'plate', metal: SILVER, cape: '#4a7ab8', over: [GB.wisps('#a0e0ff', [[58, 48]])], head: HG.circlet(SILVER, '#60c0ff'), back: GEAR.cape('#4a7ab8', SILVER) } },
  nanxun: { cls: 'knight', lv: 6, k: { c: '#2a3a6a', d: '#1a2448', t: '#e8c040', g: '#3a8ae0' },
    base: { face: 'man', skin: 'warm', hair: '#5a5a6a', hairStyle: 'neat', iris: '#3a3a4a', eyes: 'stern', brow: 'stern', mouth: 'neutral', nose: 'long', beard: 'mustache', body: 'lightArmor', cloth: '#2a3a6a', over: [GEAR.mantle('#2a3a6a', GOLD, 'L')], lines: c => oldLines(c, false) } },
  luosha: { cls: 'killer', lv: 4, k: { c: '#8a1a3a', d: '#2a1020' },
    base: { face: 'f', skin: 'fair', hair: '#8a1a3a', hairStyle: 'ponytail', iris: '#c02a4a', eyes: 'sharp', brow: 'normal', mouth: 'smirk', body: 'cloak', cloth: '#2a1a24', over: [GEAR.strap('#3a1a10')], back: SW(52, 36, STEEL, METAL.black) } },
  aopaer: { cls: 'princess', lv: 10, k: {},
    base: { face: 'f', skin: 'warm', hair: '#f0c860', hairStyle: 'ponytail', iris: '#20a0a0', eyes: 'girl', brow: 'soft', mouth: 'smile', blush: true, body: 'princess', cloth: '#c8402a', trim: '#1e6a7a', earring: true, head: HG3.desertVeil('#f4f8ff', '#20c0b0') } },
  lan: { cls: 'martial', lv: 18, k: { c: '#2e4a3a' },
    base: { face: 'man', skin: 'tan', hair: '#3a4a3a', hairStyle: 'tied', iris: '#2a3a2a', eyes: 'stern', brow: 'stern', mouth: 'neutral', body: 'tunic', cloth: '#2e4a3a', over: [GB.gi('#2e4a3a', '#1a1a1a'), GB.fist('#e8e0d0')] } },
  natalia: { cls: 'crossbowman', lv: 1, k: { c: TRIBE_RED, d: '#6a2a14', t: '#2a6a5a' },
    base: { face: 'f', skin: 'warm', hair: '#8a3a1a', hairStyle: 'wild', iris: '#c06020', eyes: 'girl', brow: 'angry', mouth: 'grin', body: 'archer', cloth: TRIBE_RED, over: [GEAR.crossbow(STEEL, '#6a3a1a')], head: HG3.featherBand('#2a6a5a', '#d84a2a', 1), back: null } },
  su: { cls: 'medium', lv: 1, k: { d: '#1e4a4a', t: '#c83a2a' },
    base: { face: 'f', skin: 'fair', hair: '#e8e0c8', hairStyle: 'hime', iris: '#6a5a9a', eyes: 'girl', brow: 'soft', mouth: 'small', body: 'shamanRobe', el: g3el('#2a6a6a', '#173a3a', '#e8d8a0'), head: 'headband', band: '#c83a2a', bandGem: '#40c0ff' } },
  muer: { cls: 'barbarian', lv: 2, k: {},
    base: { face: 'm', skin: 'tan', hair: '#6a3a1a', hairStyle: 'wild', iris: '#5a2a1a', eyes: 'fierce', brow: 'angry', thickBrow: true, mouth: 'grin', body: 'vest', cloth: '#6a4428', over: [GB.fur('#6a5a42')], head: HB.warpaint('#c81e1e'), back: GB.bigBlade(STEEL, 'axe') } },
  taipu: { cls: 'archer', lv: 2, k: { c: '#4a5a2a', d: '#2e3a1a', t: '#d84a2a', g: '#2ab0a0' },
    base: { face: 'man', skin: 'tan', hair: '#4a3a2a', hairStyle: 'shaggy', iris: '#4a3a1a', eyes: 'sharp', brow: 'normal', mouth: 'neutral', body: 'archer', cloth: '#4a5a2a', head: HG3.featherBand('#6a3a1a', '#d84a2a', 1), back: bow } },
  daixi: { cls: 'killer', lv: 6, k: { c: '#c86a2a', d: '#3a2a1a' },
    base: { face: 'f', skin: 'tan', hair: '#d87a3a', hairStyle: 'bob', iris: '#3a8a3a', eyes: 'girl', brow: 'normal', mouth: 'smile', blush: true, body: 'archer', cloth: '#5a4a2a', head: HG3.featherBand(TRIBE_RED, '#f0ece0', 1), back: SW(52, 36, STEEL) } },
  gusitafu: { cls: 'fighter', lv: 7, k: { c: '#2a6a7a', g: '#40c0d0', w: GB.bigBlade(STEEL, 'axe') },
    base: { face: 'broad', skin: 'tan', hair: '#a87a3a', hairStyle: 'short', iris: '#3a4a5a', eyes: 'stern', brow: 'stern', thickBrow: true, mouth: 'neutral', nose: 'big', beard: 'full', body: 'vest', cloth: '#4a3a2a', back: GB.bigBlade(STEEL, 'axe'), lines: c => oldLines(c, false),
      scar: c => { c.p.line([c.F.nx + 1, c.F.ey - 3, c.F.nx + 6, c.F.ey + 8], c.face, 1, true); c.p.line([c.F.fx + 2, c.F.ey + 7, c.F.fx + 5, c.F.ey + 9], c.face, 1, true); } } },
  baoer: { cls: 'child', lv: 8, k: {},
    base: { face: 'f', skin: 'fair', scale: 1.1, hair: '#f0a8c0', hairStyle: 'bob', iris: '#e05a8a', eyes: 'girl', brow: 'soft', mouth: 'open', blush: true, body: 'tunic', cloth: '#f088a8', head: HG3.ribbon('#e04a7a') } },
  // NPC（单一造型）
  dazhanglao: { cls: 'sorcerer', lv: 16, single: true, k: {},
    base: { face: 'old', skin: 'old', hair: '#e8e8e0', hairStyle: 'sage', iris: '#4a4a3a', eyes: 'kind', brow: 'worried', thickBrow: true, mouth: 'neutral', nose: 'big', beard: 'long', body: 'shamanRobe', el: g3el('#8a3a24', '#3a1a10', '#e8d8a0'), over: [GB3.boneNecklace], head: 'feathers', featherN: 5, featherBand: rp(TRIBE_RED), lines: c => oldLines(c, true) } },
  kelite: { cls: 'magicKnight', lv: 18, single: true, k: {},
    base: { face: 'f', skin: 'pale', hair: '#2a1a3a', hairStyle: 'wavy', iris: '#a02a8a', eyes: 'sharp', brow: 'angry', mouth: 'smirk', body: 'plate', metal: METAL.black, cape: '#5a1a4a', over: [GEAR.pauldrons(METAL.black, null, true), GEAR.emblem('#c02aa0')], head: HG.circlet(METAL.black, '#c02aa0', true), back: GEAR.cape('#5a1a4a', BLOOD) } },
  beiluo: { cls: 'knight', lv: 24, single: true, k: {},
    base: { face: 'broad', skin: 'warm', hair: '#7a6a5a', hairStyle: 'short', iris: '#3a3a3a', eyes: 'stern', brow: 'angry', thickBrow: true, mouth: 'frown', nose: 'big', beard: 'full', body: 'plate', metal: STEEL, torso: 'broad', cape: '#8a1a1a', over: [GEAR.pauldrons(GOLD, null, true), GEAR.emblem('#d02020')], back: GEAR.cape('#8a1a1a', GOLD) } },
  lingzhu: { cls: 'king', lv: 20, single: true, k: {},
    base: { face: 'old', skin: 'warm', hair: '#c8c0b0', hairStyle: 'sides', iris: '#5a4a3a', eyes: 'kind', brow: 'worried', mouth: 'frown', nose: 'big', beard: 'mustache', body: 'regal', cloth: '#c8902a', head: 'crown', lines: c => oldLines(c, false) } },
  crebtree: { cls: 'creb', lv: 32, single: true, k: {},
    base: { face: 'man', skin: 'pale', hair: '#4a1a5a', hairStyle: 'short', iris: '#b02a2a', eyes: 'sharp', brow: 'angry', mouth: 'smirk', nose: 'long', body: 'sorcerer', cloth: '#2a1030', trim: '#140814', over: [GEAR.mantle('#3a0a2a', GOLD), GEAR.emblem('#c02020', 31.5, 62, 2)], back: GEAR.collar('#2a1030', '#8a1030', GOLD), blush: false } },
});
// —— g3 敌人 ——
function skeletonHead(v) {
  const p = mpic(), c = { p, S: {} };
  sword(c, 47, 40);
  const rag = mp(p, blob([2, 74, 4, 62, 14, 56, 50, 56, 60, 62, 62, 74]), ramp(vcol(v, '#3a3a4a')), 'cloth', { s: 2, d: 1, hl: 1 });
  for (let x = 6; x < 60; x += 7) p.line([x, 70, x + 2, 74], rag, 1, true);
  const ribs = [];
  for (let i = 0; i < 4; i++) ribs.push(lock(31.5, 58 + i * 3.6, 18 + i, 61 + i * 3.6, 2, 2, 1.4), lock(31.5, 58 + i * 3.6, 45 - i, 61 + i * 3.6, 2, -2, 1.4));
  mp(p, union(rect(30, 55, 3, 19), ...ribs), BONE, 'bone', { s: 1, hl: 1 });
  mp(p, union(ell(10, 60, 7, 4.5), ell(53, 60, 7, 4.5)), METAL.bronze, 'metal', { s: 1, hl: 1 });
  // 头骨 + 颚
  const jaw = mp(p, blob([21, 42, 32, 44, 43, 42, 42, 50, 32, 53, 22, 50]), BONE, 'bone', { s: 2, d: 0, hl: 1 });
  const sk = mp(p, blob([13, 30, 15, 17, 23, 9, 32, 7, 41, 9, 49, 17, 51, 30, 47, 40, 40, 43, 32, 44, 24, 43, 17, 40]), BONE, 'bone', { s: 2, d: 1, hl: 1 });
  for (let x = 25; x <= 39; x += 2.8) p.line([x, 44, x, 48], jaw, 1, true);
  p.line([22, 46, 42, 46], jaw, 1, true);
  const hole = p.add(rect(0, 0, 0, 0), ['#000000', '#080408', '#100810', '#180c18', '#401020', '#601830'], 'hole');
  p.fill(union(ell(24.5, 29, 5, 5.4), ell(39.5, 29, 5, 5.4)), hole, 2);
  p.fill(poly([32, 34, 34.4, 39, 29.6, 39]), hole, 2);
  const g = p.obj(['#300000', '#a01010', '#ff2020', '#ff6040', '#ffb090', '#ffffff'], 'glow', { ol: false });
  for (const x of [25, 39]) { p.fill(ell(x, 29.5, 1.8, 2), g, 3); p.px(x - 0.5, 29, g, 5); }
  p.line([40, 10, 38, 15, 41, 19], sk, 1, true);
  // 生锈头盔
  mp(p, blob([12, 22, 14, 11, 22, 3, 32, 0, 42, 3, 50, 11, 52, 22, 46, 19, 32, 17, 18, 19]), METAL.bronze, 'metal', { s: 2, d: 1, hl: 1 });
  p.line([32, 0, 32, 17], 'metal', 4, true);
  return p.render(BG_DARK);
}
function batHead(v) {
  const p = mpic(), fur = ramp(vcol(v, '#4a3a5a'), { shift: 10 }), mem = ramp(vcol(v, '#3a2a4a'));
  for (const d of [-1, 1]) {
    const X = (x) => 32 + d * x;
    const w = mp(p, poly([X(10), 52, X(18), 30, X(30), 14, X(33), 28, X(28), 32, X(32), 44, X(25), 46, X(28), 58, X(20), 60, X(12), 62]), mem, 'wing', { s: 1, d: 0, hl: 1 });
    for (const [a, b] of [[30, 14], [28, 32], [25, 46]]) p.line([X(12), 56, X(a), b], w, 4, true);
  }
  mp(p, blob([14, 74, 16, 60, 24, 54, 40, 54, 48, 60, 50, 74]), fur, 'fur', { s: 2, d: 1, hl: 1 });
  const ears = mp(p, union(poly([16, 32, 13, 6, 28, 20]), poly([36, 20, 51, 6, 48, 32])), fur, 'fur', { s: 2, d: 1, hl: 1 });
  const pink = p.obj(['#5a2030', '#a04860', '#d07890', '#e8a0b0', '#f8c8d4', '#ffe8ee'], 'inner', { ol: false });
  p.fill(union(poly([18, 28, 16, 12, 25, 21]), poly([39, 21, 48, 12, 46, 28])), pink, 3);
  const h = mp(p, ell(32, 36, 17, 15), fur, 'fur', { s: 2, d: 1, hl: 1 });
  texture(p, ['fur'], 'fur', 'bt', 0.04);
  const ep = eyePal('#e02030', '#140810'); const e = p.obj(ep, 'eye', { ol: false });
  const map = { K: [e, 0], k: [e, 1], W: [e, 2], w: [e, 3], D: [e, 4], I: [e, 5], L: [e, 6], H: [e, 7], P: [e, 8] };
  p.tmpl(20, 30, EYES.hero.near, map); p.tmpl(36, 30, EYES.hero.far, map);
  mp(p, blob([29, 41, 35, 41, 34, 44, 30, 44]), ['#3a1020', '#7a3040', '#b05a70', '#d08a9a', '#f0b8c4', '#ffe0e8'], 'nose', { s: 0, hl: 1 });
  p.add(blob([27, 46, 32, 47, 37, 46, 35, 49, 32, 50, 29, 49]), MOUTH_IN, 'mouth');
  fang(p, 29, 46.6, 2.2, 0.8); fang(p, 35, 46.6, 2.2, 0.8);
  return p.render(BG_DARK);
}
function mechaHead(v) {
  const p = mpic(), mt = ramp(vcol(v, '#6a7486'), { shift: 6 });
  // 肩炮
  for (const d of [-1, 1]) {
    const X = (x) => 32 + d * x;
    mp(p, blob([X(16), 48, X(30), 46, X(33), 56, X(30), 64, X(17), 64]), mt, 'metal', { s: 2, d: 1, hl: 1 });
    mp(p, union(rect(d < 0 ? 0 : 52, 30, 12, 9), rect(d < 0 ? 2 : 54, 26, 8, 4)), STEEL, 'metal', { s: 1, hl: 1 });
    const m = p.add(ell(d < 0 ? 2 : 62, 34.5, 2.4, 3.6), ['#000000', '#100808', '#200c0c', '#301010', '#ff4020', '#ffa060'], 'slit');
  }
  const body = mp(p, blob([4, 74, 8, 60, 20, 54, 44, 54, 56, 60, 60, 74]), mt, 'metal', { s: 3, d: 1, hl: 1 });
  for (let i = 0; i < 4; i++) mp(p, poly([22 + i * 5, 74, 25 + i * 5, 66, 27.5 + i * 5, 66, 24.5 + i * 5, 74]), i % 2 ? ramp('#e8c020') : ramp('#2a2a30'), 'acc', { s: 0, hl: 0 });
  for (const y of [59, 62]) p.line([14, y, 50, y], body, 1, true);
  // 头
  const h = mp(p, blob([16, 46, 15, 22, 20, 12, 32, 9, 44, 12, 49, 22, 48, 46, 40, 50, 24, 50]), mt, 'metal', { s: 3, d: 1, hl: 2, dx: 1, dy: 0.5 });
  const vis = p.add(blob([18, 26, 32, 24, 46, 26, 45, 34, 32, 33, 19, 34]), ['#000000', '#05080a', '#0a1014', '#101820', '#202830', '#303840'], 'slit');
  const g = p.obj(['#300000', '#a01010', '#ff2020', '#ff6040', '#ffb090', '#ffffff'], 'glow', { ol: false });
  p.fill(ell(26, 29.5, 3.4, 2), g, 3); p.fill(ell(38, 29.5, 3.4, 2), g, 3); p.px(25, 29, g, 5); p.px(37, 29, g, 5);
  for (let x = 22; x <= 42; x += 4) p.line([x, 38, x, 46], h, 1, true);
  mp(p, union(lock(44, 14, 52, 2, 1.4, 0, 1), ell(52, 2, 1.6, 1.6)), STEEL, 'metal', { s: 0, hl: 1 });
  for (const [x, y] of [[20, 16], [44, 16], [20, 44], [44, 44]]) rivet({ p }, x, y);
  return p.render(BG);
}
MONSTERS.skeleton = (v) => skeletonHead(v);
MONSTERS.bat = (v) => batHead(v);
MONSTERS.mecha = (v) => mechaHead(v);
const G3_ENEMY = {
  jester: v => ({ face: 'm', skin: 'pale', hair: '#2a2a3a', hairStyle: 'short', iris: '#2a2a3a', eyes: 'sharp', brow: 'raised', mouth: 'grin', body: 'tunic', cloth: vcol(v, '#c02a2a'), over: [GB3.diamonds('#f0c020', '#2a2aa0'), GB3.ruff('#f4f0e8', vcol(v, '#c02a2a'))], head: [HG3.jesterHat(vcol(v, '#c02a2a'), '#2a2aa0'), HG3.jesterPaint], blush: false }),
  techWarrior: v => ({ face: 'man', skin: 'warm', eyes: 'none', brow: null, mouth: 'stern', nose: 'none', noEar: true, body: 'plate', metal: TECH_M, cape: null, over: [GB3.techLines(vcol(v, '#30d0ff'))], head: HG3.techVisor(TECH_M, vcol(v, '#30d0ff')), blush: false }),
  fishman: v => Object.assign({ face: 'broad', hair: '#1e5a5a', hairStyle: 'short', iris: '#f0d020', eyes: 'fierce', brow: 'angry', mouth: 'teeth', nose: 'none' }, CLASS_A.fishman({})[0]),
  vampire: v => Object.assign({ face: 'man', hair: '#1a1a26', hairStyle: 'neat', eyes: 'sharp', brow: 'angry' }, CLASS_A.vampire({})[0], { cloth: vcol(v, '#1a0a14') }),
  harpy: v => Object.assign({ face: 'f', skin: 'fair', hair: vcol(v, '#8a3a8a'), hairStyle: 'wildLong', iris: '#f0a020', eyes: 'sharp', brow: 'angry', mouth: 'smirk' }, CLASS_A.harpy({})[0]),
  creb: v => ({ face: 'broad', skin: 'beast', hair: '#4a1a5a', hairStyle: 'wildLong', iris: '#ff2040', eyes: 'glow', brow: 'angry', thickBrow: true, mouth: 'teeth', nose: 'big', body: 'sorcerer', cloth: '#1a0a20', over: [GEAR.mantle('#2a0a1a', BLOOD), GEAR.pauldrons(METAL.black, null, true), GEAR.emblem('#ff2040', 31.5, 66, 2.8)], head: [HG.hoodHorns('#d8ccb4'), HG3.thirdEye], back: [GEAR.aura('#c02040'), GB2.batWings('#2a0a1e')], bg: BG_DARK, blush: false }),
};
MONSTERS.creb = (v) => drawHuman(G3_ENEMY.creb(v));

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
function build(id, variant, tier, path) {
  if (typeof id !== 'string') return null;
  if (id.startsWith('enemy:')) {
    let k = id.slice(6);
    if (!variant && k.indexOf(':') > 0) { variant = k.split(':')[1]; k = k.split(':')[0]; }
    if (MONSTER_ALIAS[k]) k = MONSTER_ALIAS[k];
    if (k === 'shaman') return drawHuman(shamanSpec(variant));
    if (MONSTERS[k]) return MONSTERS[k](variant);
    const hs = enemyHuman(k, variant);
    if (hs) return drawHuman(hs);
    if (G3_ENEMY[k]) return drawHuman(G3_ENEMY[k](variant));
    return null;
  }
  if (G2_HEROES[id] && !HERO_SPECS[id]) return drawHuman(g2Spec(id, tier, path));
  const s = heroSpec(id);
  if (!s) return null;
  const old2 = laterCamp() && G2_OLDER[id];
  const xc = laterCamp() && typeof HEROES !== 'undefined' && HEROES[id] && HEROES[id].cls;
  if (xc && HERO_CLS[id] && xc !== HERO_CLS[id] && CLASS_A[xc]) { // 一代角色在后作转成其他职业
    const A = CLASS_A[xc](K_DEF), t = clamp(tier == null ? 0 : tier | 0, 0, A.length - 1);
    return drawHuman(Object.assign({}, s, A[t], old2 || {}));
  }
  if (old2) { const b0 = path === 'b' && branchSpec(id, tier) || tierSpec(id, tier) || s; return drawHuman(Object.assign({}, b0, old2)); }
  if (s.special) return MONSTERS[s.special](variant, true, heroTier(id, tier), path);
  if (path === 'b') { const b = branchSpec(id, tier); if (b) return drawHuman(b); }
  return drawHuman(tierSpec(id, tier) || s);
}
// tier：职业阶（0 起）；未指定 = 角色当前默认外观。仅对我方英雄有效
// path：'b' = 转职分支 B 路线（tier >= 该职业分支阶 at 时生效）；省略 / 'a' = 原路线
function getPortrait(id, variant, tier, path) {
  if (typeof id === 'string' && id.startsWith('enemy:')) tier = null;
  if (path !== 'b' || tier == null || !(tier >= (branchAt(id) == null ? Infinity : branchAt(id)))) path = null;
  let key = id + '|' + (variant || '') + (tier == null ? '' : '|' + tier) + (path ? '|b' : '');
  if (laterCamp() && G2_OLDER[id]) { key += '|' + CUR_CAMPAIGN; try { if (HEROES[id] && HEROES[id].cls !== HERO_CLS[id]) key += '|' + HEROES[id].cls; } catch (e) { /* 无 HEROES */ } }
  if (G2_HEROES[id] && !HERO_SPECS[id]) { key += '|' + g2Cls(id); if (tier == null) { try { key += '|lv' + HEROES[id].lv; } catch (e) { /* 无 HEROES */ } } }
  if (CACHE[key]) return CACHE[key];
  let c = null;
  try { c = build(id, variant, tier, path); } catch (e) { TF = null; if (G.console) console.warn('portrait', id, e); c = null; }
  TF = null;
  if (!c) c = CACHE['?'] || (CACHE['?'] = silhouette());
  else c.className = 'pix portrait';
  CACHE[key] = c;
  return c;
}
G.getPortrait = getPortrait;
})(typeof window !== 'undefined' ? window : this);
