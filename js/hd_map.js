// 高清画风：手绘风格地图
// 整张战场地图画成一幅连续的柔和插画（而不是一格一格的贴图）：
//   1) 低分辨率（每格 r 像素）逐像素计算各地表的「隶属场」+ 噪声 → 柔边遮罩（羽化、自然弯曲的边界）
//   2) 每种地表一张可平铺的手绘材质（按格子大小缓存），经遮罩叠到地面层；水、熔岩用低分辨率颜色场（深浅渐层）
//   3) 岸边泡沫、河岸、道路磨边、石板阴影等「边缘效果」在低分辨率合成成一张图后放大叠加
//   4) 立体物件（树、山、丘、城墙、石柱、村屋、桥、祭坛）逐行由后往前绘制，可向上突出到上一格
//   5) 静态部分（地面 + 物件）缓存，两帧之间只重画水面波光与熔岩亮纹
// 导出：buildMapHD(B, s, frame) → B.w*s × B.h*s 画布；drawChestHD(ctx, x, y, s, opened)
'use strict';

(function (G) {
// ---------- 工具 ----------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function hx(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgba(h, a) { const c = hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function mixHex(a, b, t) { const A = hx(a), B = hx(b); return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`; }
const hash2 = (x, y, k) => { let h = Math.imul(x * 374761393 + y * 668265263 + (k || 0) * 2246822519, 1274126177) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// 柔和圆斑（径向渐层）
function blob(g, x, y, rx, ry, col, a) {
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.55, rgba(col, a * 0.65)); gr.addColorStop(1, rgba(col, 0));
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
}
// 可平铺：在 P×P 内画一个东西，靠边时在对侧再画一次
function wrap(P, x, y, rad, fn) {
  for (const dx of [-P, 0, P]) for (const dy of [-P, 0, P]) {
    const X = x + dx, Y = y + dy;
    if (X + rad > 0 && X - rad < P && Y + rad > 0 && Y - rad < P) fn(X, Y);
  }
}

// ---------- 地表材质（可平铺，边长 4 格） ----------
const TEX = {};
function tex(kind, s) {
  const id = kind + '|' + s;
  if (TEX[id]) return TEX[id];
  if (Object.keys(TEX).length > 40) for (const k in TEX) delete TEX[k];
  const P = Math.round(4 * s), c = mk(P, P), g = c.getContext('2d');
  const t0 = performance.now();
  PAINT[kind](g, P, s, rng(kind.length * 7919 + kind.charCodeAt(0) * 131 + kind.charCodeAt(kind.length - 1)));
  PROF.texgen = (PROF.texgen || 0) + performance.now() - t0;
  return (TEX[id] = c);
}
// 短笔触（草叶、波纹）
function strokes(g, P, s, R, n, cols, len, wid, ang, bend) {
  g.lineCap = 'round';
  for (const [col, a] of cols) {
    g.strokeStyle = rgba(col, a); g.lineWidth = Math.max(1, wid * s); g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = R() * P, y = R() * P, L = (len * (0.6 + R() * 0.8)) * s, an = ang + (R() - 0.5) * 0.9, b = (R() - 0.5) * bend * s;
      wrap(P, x, y, L + 2, (X, Y) => { g.moveTo(X, Y); g.quadraticCurveTo(X + Math.cos(an) * L * 0.5 + b, Y + Math.sin(an) * L * 0.5, X + Math.cos(an) * L, Y + Math.sin(an) * L); });
    }
    g.stroke();
  }
}
function blobs(g, P, s, R, n, cols, r0, r1, a, flat) {
  for (let i = 0; i < n; i++) {
    const x = R() * P, y = R() * P, r = (r0 + R() * (r1 - r0)) * s, col = cols[(R() * cols.length) | 0];
    wrap(P, x, y, r, (X, Y) => blob(g, X, Y, r, r * (flat || 0.75), col, a));
  }
}
function dots(g, P, s, R, n, cols, r0, r1, a, flat) {
  for (const col of cols) {
    g.fillStyle = rgba(col, a); g.beginPath();
    for (let i = 0; i < n; i++) {
      const x = R() * P, y = R() * P, r = (r0 + R() * (r1 - r0)) * s;
      wrap(P, x, y, r, (X, Y) => { g.moveTo(X + r, Y); g.ellipse(X, Y, r, r * (flat || 0.7), 0, 0, 7); });
    }
    g.fill();
  }
}
// 小石子：底色 + 亮面
function pebbles(g, P, s, R, n, base, hi, sh, r0, r1) {
  for (let i = 0; i < n; i++) {
    const x = R() * P, y = R() * P, r = (r0 + R() * (r1 - r0)) * s;
    wrap(P, x, y, r * 2, (X, Y) => {
      g.fillStyle = rgba(sh, 0.35); g.beginPath(); g.ellipse(X + r * 0.25, Y + r * 0.35, r, r * 0.7, 0, 0, 7); g.fill();
      g.fillStyle = base; g.beginPath(); g.ellipse(X, Y, r, r * 0.72, 0, 0, 7); g.fill();
      g.fillStyle = hi; g.beginPath(); g.ellipse(X - r * 0.25, Y - r * 0.25, r * 0.45, r * 0.3, 0, 0, 7); g.fill();
    });
  }
}
// 碎裂纹（暗线 + 亮边）
function cracks(g, P, s, R, n, col, a, w, glow) {
  for (let i = 0; i < n; i++) {
    let x = R() * P, y = R() * P; const pts = [[x, y]];
    let an = R() * 6.28;
    for (let k = 0; k < 4 + (R() * 3 | 0); k++) { an += (R() - 0.5) * 1.4; x += Math.cos(an) * s * (0.08 + R() * 0.1); y += Math.sin(an) * s * (0.08 + R() * 0.1); pts.push([x, y]); }
    const draw = (ox, oy) => { g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)); g.stroke(); };
    for (const dx of [-P, 0, P]) for (const dy of [-P, 0, P]) {
      if (glow) { g.strokeStyle = rgba(glow, a * 0.35); g.lineWidth = w * s * 3; draw(dx, dy); }
      g.strokeStyle = rgba(col, a); g.lineWidth = Math.max(1, w * s); draw(dx, dy);
    }
  }
}
// 石板（对齐格线：每格 2×2 块，偶尔合并）
function flagstones(g, P, s, R, grout, cols, gap, rough) {
  g.fillStyle = grout; g.fillRect(0, 0, P, P);
  const n = 8, q = P / n;
  const used = new Set();
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (used.has(j * n + i)) continue;
    let w = 1, h = 1;
    if (R() < 0.18 && i < n - 1 && !used.has(j * n + i + 1)) w = 2; else if (R() < 0.15 && j < n - 1) h = 2;
    for (let a = 0; a < h; a++) for (let b = 0; b < w; b++) used.add((j + a) * n + i + b);
    const x = i * q + gap * s, y = j * q + gap * s, W = w * q - gap * 2 * s, H = h * q - gap * 2 * s, col = cols[(R() * cols.length) | 0];
    const gr = g.createLinearGradient(x, y, x + W, y + H);
    gr.addColorStop(0, mixHex(col, '#ffffff', 0.18)); gr.addColorStop(0.6, col); gr.addColorStop(1, mixHex(col, '#5a5040', 0.12));
    g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x, y, W, H, q * 0.12) : g.rect(x, y, W, H); g.fill();
    // 细微斑驳
    for (let k = 0; k < 3; k++) blob(g, x + R() * W, y + R() * H, q * (0.15 + R() * 0.2), q * 0.12, R() < 0.5 ? '#ffffff' : '#7a6e5a', 0.1 * rough);
    if (R() < 0.25) { g.strokeStyle = 'rgba(90,80,64,0.25)'; g.lineWidth = Math.max(1, s * 0.012); g.beginPath(); g.moveTo(x + W * R(), y); g.lineTo(x + W * (0.3 + R() * 0.4), y + H * 0.5); g.lineTo(x + W * R(), y + H); g.stroke(); }
  }
}

const PAINT = {
  grass(g, P, s, R) {
    g.fillStyle = '#9cc663'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 70, ['#b2d675', '#8cbb56', '#a8d06c', '#86b552', '#bcdc80'], 0.25, 0.7, 0.45);
    blobs(g, P, s, R, 30, ['#78a849', '#c6e28c'], 0.12, 0.3, 0.35);
    strokes(g, P, s, R, 260, [['#6c9c40', 0.5], ['#c8e690', 0.6]], 0.07, 0.016, -1.57, 0.03);
    strokes(g, P, s, R, 120, [['#5d8d38', 0.45]], 0.05, 0.018, -1.3, 0.02);
    // 零星小花
    for (let i = 0; i < 9; i++) {
      const cx = R() * P, cy = R() * P, col = ['#ffffff', '#fff2a0', '#ffc4d8', '#d8e8ff'][(R() * 4) | 0];
      g.fillStyle = col;
      for (let k = 0; k < 3 + (R() * 3 | 0); k++) { const x = cx + (R() - 0.5) * s * 0.3, y = cy + (R() - 0.5) * s * 0.2, r = s * (0.014 + R() * 0.01); wrap(P, x, y, r, (X, Y) => { g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill(); }); }
    }
  },
  road(g, P, s, R) {
    g.fillStyle = '#dcc394'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 60, ['#e8d4a8', '#ccb07e', '#e2cc9c', '#c4a674'], 0.2, 0.55, 0.45);
    strokes(g, P, s, R, 70, [['#b89a68', 0.35], ['#f2e2bc', 0.45]], 0.12, 0.012, 0, 0.04);
    pebbles(g, P, s, R, 40, '#c2a77c', '#eadbb8', '#7a6040', 0.018, 0.045);
    dots(g, P, s, R, 160, ['#b8986a', '#f0dfb8'], 0.005, 0.012, 0.6);
  },
  stone(g, P, s, R) {
    flagstones(g, P, s, R, '#b4ab98', ['#e4dece', '#dcd5c3', '#e9e4d8', '#d4ccb9', '#dfd8c6'], 0.022, 1);
    dots(g, P, s, R, 120, ['#a89c84', '#f6f2e8'], 0.004, 0.01, 0.5);
  },
  sand(g, P, s, R) {
    g.fillStyle = '#efd9a2'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 60, ['#f7e7bb', '#e4c88c', '#f2deaa', '#e8cf98'], 0.25, 0.7, 0.45);
    // 风纹
    g.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      const x = R() * P, y = R() * P, L = s * (0.4 + R() * 0.6), a = (R() - 0.5) * 0.3;
      wrap(P, x, y, L, (X, Y) => {
        g.strokeStyle = 'rgba(206,170,110,0.45)'; g.lineWidth = Math.max(1, s * 0.016); g.beginPath(); g.moveTo(X - L / 2, Y); g.bezierCurveTo(X - L / 6, Y - s * 0.07 + a * s, X + L / 6, Y + s * 0.07, X + L / 2, Y - a * s * 0.2); g.stroke();
        g.strokeStyle = 'rgba(255,246,214,0.6)'; g.lineWidth = Math.max(1, s * 0.012); g.beginPath(); g.moveTo(X - L / 2, Y - s * 0.025); g.bezierCurveTo(X - L / 6, Y - s * 0.095 + a * s, X + L / 6, Y + s * 0.045, X + L / 2, Y - a * s * 0.2 - s * 0.025); g.stroke();
      });
    }
    dots(g, P, s, R, 140, ['#c9a86c', '#fff6dc'], 0.004, 0.01, 0.6);
  },
  snow(g, P, s, R) {
    g.fillStyle = '#eef3fa'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 50, ['#ffffff', '#dfe8f5', '#d2def0', '#f7faff'], 0.25, 0.75, 0.55);
    for (let i = 0; i < 22; i++) {
      const x = R() * P, y = R() * P, L = s * (0.3 + R() * 0.5);
      wrap(P, x, y, L, (X, Y) => {
        g.strokeStyle = 'rgba(170,190,225,0.45)'; g.lineWidth = Math.max(1, s * 0.03); g.lineCap = 'round';
        g.beginPath(); g.moveTo(X - L / 2, Y); g.quadraticCurveTo(X, Y + s * 0.08, X + L / 2, Y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(1, s * 0.02);
        g.beginPath(); g.moveTo(X - L / 2, Y - s * 0.03); g.quadraticCurveTo(X, Y + s * 0.05, X + L / 2, Y - s * 0.03); g.stroke();
      });
    }
    dots(g, P, s, R, 60, ['#ffffff'], 0.008, 0.016, 0.9);
    dots(g, P, s, R, 50, ['#b8c8e2'], 0.005, 0.01, 0.6);
  },
  swamp(g, P, s, R) {
    g.fillStyle = '#8c9e62'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 50, ['#9cb06e', '#788c58', '#a4b674', '#6e8456'], 0.25, 0.6, 0.5);
    // 泥水坑
    for (let i = 0; i < 16; i++) {
      const x = R() * P, y = R() * P, rx = s * (0.18 + R() * 0.25), ry = rx * 0.5;
      wrap(P, x, y, rx * 1.3, (X, Y) => {
        g.fillStyle = 'rgba(78,96,58,0.7)'; g.beginPath(); g.ellipse(X, Y + ry * 0.15, rx * 1.12, ry * 1.2, 0, 0, 7); g.fill();
        const gr = g.createLinearGradient(X, Y - ry, X, Y + ry); gr.addColorStop(0, '#4f7a76'); gr.addColorStop(1, '#7aa8a0');
        g.fillStyle = gr; g.beginPath(); g.ellipse(X, Y, rx, ry, 0, 0, 7); g.fill();
        g.strokeStyle = 'rgba(200,230,210,0.45)'; g.lineWidth = Math.max(1, s * 0.012); g.beginPath(); g.ellipse(X - rx * 0.1, Y - ry * 0.1, rx * 0.55, ry * 0.4, 0, 3.6, 5.6); g.stroke();
      });
    }
    dots(g, P, s, R, 20, ['#6f9a48'], 0.03, 0.05, 0.9, 0.55);
    strokes(g, P, s, R, 110, [['#4e6a30', 0.75], ['#a4bc6a', 0.6]], 0.13, 0.016, -1.57, 0.06);
  },
  dark(g, P, s, R) {
    g.fillStyle = '#5c4a6e'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 60, ['#4a3a5c', '#6c5a80', '#544466', '#7a6890'], 0.25, 0.7, 0.5);
    pebbles(g, P, s, R, 30, '#4a3c5a', '#7e6e94', '#20162a', 0.02, 0.05);
    cracks(g, P, s, R, 14, '#d0a0ff', 0.75, 0.014, '#a060ff');
    dots(g, P, s, R, 40, ['#e0c8ff'], 0.005, 0.01, 0.7);
  },
  cave(g, P, s, R) {
    g.fillStyle = '#a18c74'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 60, ['#b29e86', '#8c7862', '#a8947c', '#7e6c58'], 0.25, 0.7, 0.5);
    cracks(g, P, s, R, 18, '#6a5844', 0.5, 0.012);
    pebbles(g, P, s, R, 50, '#968068', '#c4b096', '#3a2c20', 0.02, 0.05);
    dots(g, P, s, R, 160, ['#7a6650', '#d0bea4'], 0.004, 0.01, 0.6);
  },
  rock(g, P, s, R) {
    g.fillStyle = '#b8a688'; g.fillRect(0, 0, P, P);
    blobs(g, P, s, R, 60, ['#c8b898', '#a69476', '#bcae90', '#9a8a6c'], 0.25, 0.6, 0.5);
    pebbles(g, P, s, R, 60, '#a89678', '#dccdb0', '#4a3c2c', 0.025, 0.06);
    strokes(g, P, s, R, 60, [['#7e9a4c', 0.55]], 0.06, 0.016, -1.57, 0.02);
  },
  water(g, P, s, R) { // 水面静态细节（透明底）
    blobs(g, P, s, R, 40, ['#ffffff', '#1a4f8a'], 0.3, 0.8, 0.07, 0.45);
    strokes(g, P, s, R, 40, [['#ffffff', 0.12]], 0.3, 0.02, 0, 0.12);
  },
  ripple0(g, P, s, R) { ripples(g, P, s, R); },
  ripple1(g, P, s, R) { R(); R(); ripples(g, P, s, rng(99173)); },
  lavaCrust(g, P, s, R) { // 熔岩上漂浮的冷却岩壳（透明底）：大片、低对比、边缘发亮
    for (let i = 0; i < 12; i++) {
      const x = R() * P, y = R() * P, r = s * (0.22 + R() * 0.22), k = 9 + (R() * 4 | 0), pts = [], rot = R() * 6.28;
      for (let j = 0; j < k; j++) { const a = rot + j / k * 6.283, rr = r * (0.55 + R() * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.62]); }
      wrap(P, x, y, r * 1.4, (X, Y) => {
        const path = (sc, dx, dy) => { g.beginPath(); pts.forEach(([px, py], j) => { const ax = X + dx + px * sc, ay = Y + dy + py * sc; j ? g.lineTo(ax, ay) : g.moveTo(ax, ay); }); g.closePath(); };
        g.lineJoin = 'round';
        path(1.04, 0, 0); g.strokeStyle = 'rgba(255,210,110,0.55)'; g.lineWidth = s * 0.03; g.stroke();
        const gr = g.createLinearGradient(X - r, Y - r, X + r, Y + r); gr.addColorStop(0, 'rgba(150,62,34,0.82)'); gr.addColorStop(1, 'rgba(90,28,18,0.85)');
        g.fillStyle = gr; path(1, 0, 0); g.fill();
        g.fillStyle = 'rgba(190,100,70,0.3)'; path(0.6, -r * 0.15, -r * 0.1); g.fill();
        g.strokeStyle = 'rgba(255,170,70,0.75)'; g.lineWidth = Math.max(1, s * 0.014); g.beginPath();
        g.moveTo(X - r * 0.5, Y + r * 0.05); g.quadraticCurveTo(X - r * 0.1, Y - r * 0.2, X + r * 0.15, Y + r * 0.02); g.lineTo(X + r * 0.45, Y - r * 0.08); g.stroke();
      });
    }
  },
  lavaGlow0(g, P, s, R) { lavaGlow(g, P, s, R); },
  lavaGlow1(g, P, s, R) { lavaGlow(g, P, s, rng(5531)); },
  wallTop(g, P, s, R) {
    flagstones(g, P, s, R, '#5e574e', ['#a8a194', '#9c9588', '#b2ab9e', '#958d80'], 0.03, 1.6);
  },
  wallFace(g, P, s, R) {
    g.fillStyle = '#7a7062'; g.fillRect(0, 0, P, P);
    const rowH = P / 24, bw = P / 12;
    for (let j = 0; j < 24; j++) for (let i = -1; i < 12; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * rowH, col = ['#b0a592', '#a69a86', '#bab09e', '#9e927e'][(R() * 4) | 0];
      const gr = g.createLinearGradient(0, y, 0, y + rowH); gr.addColorStop(0, mixHex(col, '#ffffff', 0.18)); gr.addColorStop(1, mixHex(col, '#3a3024', 0.15));
      g.fillStyle = gr; g.beginPath(); g.roundRect ? g.roundRect(x + s * 0.012, y + s * 0.012, bw - s * 0.024, rowH - s * 0.024, s * 0.02) : g.rect(x + s * 0.012, y + s * 0.012, bw - s * 0.024, rowH - s * 0.024); g.fill();
    }
  },
};
function ripples(g, P, s, R) { // 水面波光（透明底）
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const x = R() * P, y = R() * P, L = s * (0.12 + R() * 0.22);
    wrap(P, x, y, L, (X, Y) => {
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = Math.max(1, s * 0.022);
      g.beginPath(); g.moveTo(X - L / 2, Y); g.quadraticCurveTo(X, Y - s * 0.05, X + L / 2, Y); g.stroke();
      if (R() < 0.5) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = Math.max(1, s * 0.014); g.beginPath(); g.moveTo(X - L * 0.25 + s * 0.05, Y + s * 0.06); g.quadraticCurveTo(X + s * 0.05, Y + s * 0.03, X + L * 0.25 + s * 0.05, Y + s * 0.06); g.stroke(); }
    });
  }
  for (let i = 0; i < 25; i++) { const x = R() * P, y = R() * P; wrap(P, x, y, s * 0.06, (X, Y) => blob(g, X, Y, s * 0.06, s * 0.03, '#ffffff', 0.7)); }
}
function lavaGlow(g, P, s, R) { // 熔岩流动的亮纹（透明底，以 lighter 叠加）
  g.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const x = R() * P, y = R() * P, L = s * (0.5 + R() * 0.6), a = (R() - 0.5) * 0.8, b = (R() < 0.5 ? -1 : 1) * s * (0.12 + R() * 0.2);
    const dx = Math.cos(a) * L, dy = Math.sin(a) * L;
    wrap(P, x, y, L, (X, Y) => {
      const path = () => { g.beginPath(); g.moveTo(X - dx / 2, Y - dy / 2); g.bezierCurveTo(X - dx / 6, Y - dy / 6 + b, X + dx / 6, Y + dy / 6 - b, X + dx / 2, Y + dy / 2); };
      g.strokeStyle = 'rgba(255,190,80,0.22)'; g.lineWidth = s * 0.16; path(); g.stroke();
      g.strokeStyle = 'rgba(255,225,130,0.2)'; g.lineWidth = s * 0.07; path(); g.stroke();
    });
  }
  for (let i = 0; i < 12; i++) { const x = R() * P, y = R() * P, r = s * (0.04 + R() * 0.06); wrap(P, x, y, r, (X, Y) => blob(g, X, Y, r, r * 0.6, '#fff0a0', 0.6)); }
}

// ---------- 地图分析 ----------
// 地表分组：地面材质（物件另画）
const GROUND_OF = { G: 'grass', F: 'grass', H: 'grass', V: 'grass', R: 'road', S: 'sand', N: 'snow', P: 'swamp', D: 'dark', O: 'cave', M: 'rock', C: 'stone', K: 'stone', A: 'stone', Y: 'stone', X: 'stone', W: 'water', T: 'water', B: 'water', b: 'water', L: 'lava' };
// 由下往上的叠放顺序与边界参数（k 越大越贴近格线；amp 噪声扰动；t 门槛，<0.5 表示略向外扩）
const LAYERS = [
  { m: 'swamp', k: 1.1, amp: 0.3, t: 0.44 },
  { m: 'dark', k: 1.1, amp: 0.3, t: 0.44 },
  { m: 'cave', k: 1.3, amp: 0.26, t: 0.44 },
  { m: 'rock', k: 1.1, amp: 0.3, t: 0.42 },
  { m: 'grass', k: 1.1, amp: 0.3, t: 0.44 },
  { m: 'sand', k: 1.1, amp: 0.3, t: 0.45 },
  { m: 'snow', k: 1.1, amp: 0.3, t: 0.45 },
  { m: 'road', k: 1.05, amp: 0.2, t: 0.47 },
  { m: 'stone', k: 2.6, amp: 0.08, t: 0.46 },
];
// 低分辨率底色（遮罩羽化处的过渡色）
const BASE_COL = { grass: '#9cc663', road: '#dcc394', sand: '#efd9a2', snow: '#eef3fa', swamp: '#7e9258', dark: '#5c4a6e', cave: '#a18c74', rock: '#b8a688', stone: '#ddd6c5', water: '#5aa6d6', lava: '#d8521c' };

function themeOf(B, T) {
  const n = {}; let tot = 0;
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) { const t = T(x, y); n[t] = (n[t] || 0) + 1; tot++; }
  const f = k => (n[k] || 0) / tot;
  if (f('N') > 0.12) return 'snow';
  if (f('L') > 0.04 || f('D') > 0.18) return 'volcanic';
  if (f('S') > 0.2) return 'desert';
  if (f('O') > 0.2) return 'cave';
  return 'normal';
}

// 值噪声（低分辨率，-1..1）
function noiseField(W, H, cell, R) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2, lat = new Float32Array(gw * gh);
  for (let i = 0; i < lat.length; i++) lat[i] = R() * 2 - 1;
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const fy = y / cell, j = fy | 0, ty = fy - j, ey = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < W; x++) {
      const fx = x / cell, i = fx | 0, tx = fx - i, ex = tx * tx * (3 - 2 * tx);
      const a = lat[j * gw + i], b = lat[j * gw + i + 1], c = lat[(j + 1) * gw + i], d = lat[(j + 1) * gw + i + 1];
      out[y * W + x] = lerp(lerp(a, b, ex), lerp(c, d, ex), ey);
    }
  }
  return out;
}
// 可分离方框模糊（两次 ≈ 高斯）
function blur(src, W, H, rad, passes) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), k = 1 / (rad * 2 + 1);
  for (let pass = 0; pass < (passes || 2); pass++) {
    const a = pass ? out : src;
    for (let y = 0; y < H; y++) {
      let acc = 0; const row = y * W;
      for (let i = -rad; i <= rad; i++) acc += a[row + Math.min(W - 1, Math.max(0, i))];
      for (let x = 0; x < W; x++) { tmp[row + x] = acc * k; acc += a[row + Math.min(W - 1, x + rad + 1)] - a[row + Math.max(0, x - rad)]; }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let i = -rad; i <= rad; i++) acc += tmp[Math.min(H - 1, Math.max(0, i)) * W + x];
      for (let y = 0; y < H; y++) { out[y * W + x] = acc * k; acc += tmp[Math.min(H - 1, y + rad + 1) * W + x] - tmp[Math.max(0, y - rad) * W + x]; }
    }
  }
  return out;
}

// 隶属场：格心为 0/1（或自订值），双线性 + 缓动（k）插值到每格 r 像素
function field(mem, w, h, r, k) {
  const W = w * r, H = h * r, out = new Float32Array(W * H);
  const ease = t => { if (k === 1) return t; const a = Math.pow(t, k), b = Math.pow(1 - t, k); return a / (a + b); };
  const cl = (v, n) => v < 0 ? 0 : v >= n ? n - 1 : v;
  const i0 = new Int32Array(W), i1 = new Int32Array(W), ex = new Float32Array(W);
  for (let p = 0; p < W; p++) { const u = (p + 0.5) / r - 0.5, i = Math.floor(u); i0[p] = cl(i, w); i1[p] = cl(i + 1, w); ex[p] = ease(u - i); }
  for (let py = 0; py < H; py++) {
    const v = (py + 0.5) / r - 0.5, j = Math.floor(v), ey = ease(v - j), r0 = cl(j, h) * w, r1 = cl(j + 1, h) * w, o = py * W;
    for (let px = 0; px < W; px++) {
      const a = mem[r0 + i0[px]], b = mem[r0 + i1[px]], c = mem[r1 + i0[px]], d = mem[r1 + i1[px]];
      if (a === b && b === c && c === d) { out[o + px] = a; continue; }
      const e = ex[px], top = a + (b - a) * e, bot = c + (d - c) * e;
      out[o + px] = top + (bot - top) * ey;
    }
  }
  return out;
}

// ---------- 主流程 ----------
const GMAX = 64;
let CACHE = null;
const PROF = {}; let _pt = 0; // 各步骤耗时（毫秒），调试用：HDMAP_PROF
const mark = k => { const t = performance.now(); if (k) PROF[k] = (PROF[k] || 0) + t - _pt; _pt = t; };
G.HDMAP_PROF = PROF;
function buildMapHD(B, s, frame) {
  const T0 = B && B.map ? (x, y) => B.map[y][x] : (x, y) => tileAt(x, y);
  // 立在甲板 / 桥上的石柱（桅杆）：地面当成桥
  const nb = (x, y, set) => { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < B.w && yy < B.h && set.includes(T0(xx, yy))) n++; } return n; };
  const T = (x, y) => { const t = T0(x, y); return t === 'Y' && nb(x, y, 'B') >= 2 ? 'b' : t; };
  const rows = []; for (let y = 0; y < B.h; y++) { let r = ''; for (let x = 0; x < B.w; x++) r += T(x, y); rows.push(r); }
  const key = rows.join('/') + '|' + s;
  if (!CACHE || CACHE.key !== key) CACHE = Object.assign({ key, done: {} }, buildStatic(B, s, T));
  const C = CACHE, out = mk(B.w * s, B.h * s), g = out.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
  let low = C.ground;
  if (C.waterMask || C.lavaMask) { // 水面 / 熔岩动画在地面分辨率下叠加
    low = mk(C.ground.width, C.ground.height); const lg = low.getContext('2d');
    lg.drawImage(C.ground, 0, 0); animLayer(lg, C, C.gs, frame);
  }
  g.drawImage(low, 0, 0, out.width, out.height);
  g.drawImage(C.over, 0, 0);
  C.done[frame] = 1;
  if (C.done[0] && C.done[1]) CACHE = null; // 两帧都取走了就放掉缓存，省内存
  return out;
}

function animLayer(g, C, s, frame) {
  const { tmp, tg } = C;
  for (const [mask, kind, bb, a, op] of [[C.waterMask, 'ripple' + (frame & 1), C.waterBB, 0.85, 'source-over'], [C.lavaMask, 'lavaGlow' + (frame & 1), C.lavaBB, 1, 'lighter']]) {
    if (!mask) continue;
    maskedTex(g, tmp, tg, tex(kind, s), mask, bb, C.r, s, a, op, true);
  }
}
// 把材质经低分辨率遮罩叠到 g 上（只处理 bb 范围）
function maskedTex(g, tmp, tg, texture, mask, bb, r, s, alpha, op, clear) {
  const [x0, y0, x1, y1] = bb, X = Math.floor(x0 * s), Y = Math.floor(y0 * s), W = Math.ceil(x1 * s) - X, H = Math.ceil(y1 * s) - Y;
  tg.save(); tg.beginPath(); tg.rect(X, Y, W, H); tg.clip();
  tg.clearRect(X, Y, W, H); tg.imageSmoothingEnabled = true;
  tg.drawImage(mask, X / s * r, Y / s * r, W / s * r, H / s * r, X, Y, W, H);
  // 不透明材质用 source-atop（软件绘图下比 source-in 快很多）；带透明的材质只能用 source-in
  tg.globalCompositeOperation = clear ? 'source-in' : 'source-atop'; tg.fillStyle = tg.createPattern(texture, 'repeat'); tg.fillRect(X, Y, W, H);
  tg.restore();
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = op || 'source-over'; g.drawImage(tmp, X, Y, W, H, X, Y, W, H); g.restore();
  tg.clearRect(X, Y, W, H);
}
function alphaCanvas(a, W, H, col) {
  const c = mk(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), d = img.data, [cr, cg, cb] = col ? hx(col) : [255, 255, 255];
  for (let i = 0; i < W * H; i++) { d[i * 4] = cr; d[i * 4 + 1] = cg; d[i * 4 + 2] = cb; d[i * 4 + 3] = a[i] * 255; }
  x.putImageData(img, 0, 0); return c;
}

// 物件格的地面：取四周（8 邻）已定地面中最多的一种，逐轮向内扩散；都没有时用预设
const PROP_DEFAULT = { F: 'grass', H: 'grass', V: 'grass', Y: 'stone', M: 'rock' };
const NATURAL = { grass: 1, sand: 1, snow: 1, swamp: 1, dark: 1, cave: 1, rock: 1, stone: 1, road: 0 };
function groundGrid(T, w, h, theme) {
  const gm = new Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = T(x, y); gm[y * w + x] = PROP_DEFAULT[t] ? null : (GROUND_OF[t] || 'grass'); }
  for (let pass = 0; pass < 6; pass++) {
    const next = gm.slice(); let left = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (gm[y * w + x]) continue;
      const cnt = {}; let best = null, bn = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const m = gm[yy * w + xx]; if (!m || !NATURAL[m]) continue;
        const k = (cnt[m] = (cnt[m] || 0) + (dx && dy ? 1 : 2)); if (k > bn) { bn = k; best = m; }
      }
      if (best) next[y * w + x] = best; else left++;
    }
    for (let i = 0; i < gm.length; i++) gm[i] = next[i];
    if (!left) break;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!gm[y * w + x]) {
    const t = T(x, y); gm[y * w + x] = t === 'M' ? (theme === 'snow' ? 'snow' : theme === 'desert' ? 'sand' : 'rock') : PROP_DEFAULT[t];
  }
  // 山脉里的山：地面一律为岩地（雪地主题为雪）
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (T(x, y) === 'M' && gm[y * w + x] === 'grass') {
    let mn = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && T(xx, yy) === 'M') mn++; }
    if (mn >= 2) gm[y * w + x] = 'rock';
  }
  return gm;
}

function buildStatic(B, s, T) {
  for (const k in PROF) delete PROF[k]; mark();
  const w = B.w, h = B.h, Wd = Math.round(w * s), Hd = Math.round(h * s);
  // 地面层以每格至多 GMAX 像素绘制，最后平滑放大（手绘质感本来就柔和；立体物件仍以全分辨率绘制）
  const S = s; s = Math.min(s, GMAX, Math.sqrt(1.25e6 / (B.w * B.h)));
  const Wg = Math.round(w * s), Hg = Math.round(h * s);
  // 遮罩网格：总像素约 7 万，地图越小每格越细（边缘越利落）
  const r = Math.max(8, Math.min(20, Math.floor(s / 3), Math.floor(Math.sqrt(72000 / (w * h))))), LW = w * r, LH = h * r, N = LW * LH;
  const theme = themeOf(B, T);
  const hw = Math.max(0.035, 1.05 / r); // 边缘渐变宽度（约 2.5 个遮罩像素，放大后不出锯齿）
  const seed = () => { let k = 7; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) k = (k * 31 + T(x, y).charCodeAt(0)) >>> 0; return k; };
  const R = rng(seed());
  const n1 = noiseField(LW, LH, r * 0.8, R), n2 = noiseField(LW, LH, r * 0.33, R), n3 = noiseField(LW, LH, r * 2.2, R);
  const noise = new Float32Array(N); for (let i = 0; i < N; i++) noise[i] = n1[i] * 0.62 + n2[i] * 0.38;

  const ground = mk(Wg, Hg), gg = ground.getContext('2d');
  const tmp = mk(Wg, Hg), tg = tmp.getContext('2d');
  gg.imageSmoothingEnabled = true;

  // 每格的地面材质：树、丘、村、柱、山脚下的地面随四周而定（雪地里的树长在雪上、沙漠里的石柱立在沙上）
  const gm = groundGrid(T, w, h, theme);
  const present = {}, bbox = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const m = gm[y * w + x]; present[m] = 1;
    const b = bbox[m] || (bbox[m] = [x, y, x + 1, y + 1]);
    b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x + 1); b[3] = Math.max(b[3], y + 1);
  }
  // 1) 底层：面积最大的陆地材质直接铺满整张（省掉一次遮罩合成）；其余各层叠在上面
  const count = {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const m = gm[y * w + x]; count[m] = (count[m] || 0) + 1; }
  let dom = 'grass', best = -1;
  for (const L of LAYERS) if ((count[L.m] || 0) > best) { best = count[L.m] || 0; dom = L.m; }
  gg.fillStyle = gg.createPattern(tex(dom, s), 'repeat'); gg.fillRect(0, 0, Wg, Hg);
  const grow = b => [Math.max(0, b[0] - 1), Math.max(0, b[1] - 1), Math.min(w, b[2] + 1), Math.min(h, b[3] + 1)];
  const memOf = fn => { const m = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = fn(T(x, y), x, y); return m; };

  // 边缘效果：低分辨率预乘 RGBA 累积
  const fx = new Float32Array(N * 4);
  const fxAdd = (col, alphaArr, mul) => {
    const [cr, cg, cb] = hx(col);
    for (let i = 0; i < N; i++) { const a = Math.min(1, alphaArr[i] * mul); if (a <= 0) continue; const o = i * 4, k = 1 - a; fx[o] = cr * a + fx[o] * k; fx[o + 1] = cg * a + fx[o + 1] * k; fx[o + 2] = cb * a + fx[o + 2] * k; fx[o + 3] = a + fx[o + 3] * k; }
  };
  const fxCover = a => { for (let i = 0; i < N; i++) { const k = 1 - a[i]; if (k >= 1) continue; const o = i * 4; fx[o] *= k; fx[o + 1] *= k; fx[o + 2] *= k; fx[o + 3] *= k; } };
  const edgeIn = (a, rad) => { const b = blur(a, LW, LH, rad, 1), o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = Math.max(0, a[i] * (1 - b[i]) * 2); return o; };
  const edgeOut = (a, rad, dy) => { const b = blur(a, LW, LH, rad, 1), o = new Float32Array(N); for (let i = 0; i < N; i++) { const j = Math.max(0, i - (dy | 0) * LW); o[i] = Math.max(0, b[j] * (1 - a[i]) * 2); } return o; };

  mark('base');
  // 2) 水：深浅颜色场
  let waterA = null, lavaA = null;
  const C = { r, tmp, tg, theme, gs: s };
  if (present.water) {
    const wm = field(memOf(t => (t === 'W' || t === 'T' || t === 'B' || t === 'b') ? 1 : 0), w, h, r, 1.15);
    const depth = field(memOf((t, x, y) => t === 'W' ? 1 : (t === 'B' || t === 'b') ? 0.85 : t === 'T' ? 0.22 : 0), w, h, r, 1);
    waterA = new Float32Array(N);
    const c = mk(LW, LH), cx = c.getContext('2d'), img = cx.createImageData(LW, LH), d = img.data;
    const sh = hx(theme === 'volcanic' ? '#6aa0b0' : '#9be0dc'), dp = hx(theme === 'volcanic' ? '#2c5a7a' : '#3a86c8'), md = hx('#5cb4d8');
    for (let i = 0; i < N; i++) {
      const a = sstep(0.42 - hw * 1.2, 0.42 + hw * 1.2, wm[i] + noise[i] * 0.2); waterA[i] = a;
      const t = sstep(0.1, 0.95, depth[i] + n3[i] * 0.08);
      const c1 = t < 0.5 ? [lerp(sh[0], md[0], t * 2), lerp(sh[1], md[1], t * 2), lerp(sh[2], md[2], t * 2)] : [lerp(md[0], dp[0], t * 2 - 1), lerp(md[1], dp[1], t * 2 - 1), lerp(md[2], dp[2], t * 2 - 1)];
      d[i * 4] = c1[0]; d[i * 4 + 1] = c1[1]; d[i * 4 + 2] = c1[2]; d[i * 4 + 3] = a * 255;
    }
    cx.putImageData(img, 0, 0);
    gg.drawImage(c, 0, 0, Wg, Hg);
    C.waterBB = grow(bbox.water);
    maskedTex(gg, tmp, tg, tex('water', s), alphaCanvas(waterA, LW, LH), C.waterBB, r, s, 1, 0, true);
  }
  mark('water');
  // 3) 熔岩：热度颜色场 + 岩壳
  if (present.lava) {
    const lm = field(memOf(t => t === 'L' ? 1 : 0), w, h, r, 1.15);
    const heat = field(memOf(t => t === 'L' ? 1 : 0), w, h, r, 1);
    lavaA = new Float32Array(N);
    const c = mk(LW, LH), cx = c.getContext('2d'), img = cx.createImageData(LW, LH), d = img.data;
    const c0 = hx('#a8280e'), c1 = hx('#f0601a'), c2 = hx('#ffb43a');
    for (let i = 0; i < N; i++) {
      const a = sstep(0.44 - hw * 1.2, 0.44 + hw * 1.2, lm[i] + noise[i] * 0.2); lavaA[i] = a;
      const t = Math.min(1, Math.max(0, heat[i] * 1.1 + n3[i] * 0.3 - 0.1));
      const col = t < 0.5 ? c0.map((v, k) => lerp(v, c1[k], t * 2)) : c1.map((v, k) => lerp(v, c2[k], t * 2 - 1));
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = a * 255;
    }
    cx.putImageData(img, 0, 0);
    gg.drawImage(c, 0, 0, Wg, Hg);
    C.lavaBB = grow(bbox.lava);
    maskedTex(gg, tmp, tg, tex('lavaCrust', s), alphaCanvas(lavaA, LW, LH), C.lavaBB, r, s, 1, 0, true);
  }

  mark('lava');
  // 4) 陆地各层
  const landCover = new Float32Array(N); // 陆地对下方（水、熔岩）的累积覆盖
  const alphas = {};
  for (const L of LAYERS) {
    if (!present[L.m]) continue;
    const f = field(memOf((t, x, y) => gm[y * w + x] === L.m ? 1 : 0), w, h, r, L.k);
    const a = new Float32Array(N), sh = (L.m.length * 13) % LW;
    for (let i = 0; i < N; i++) { const v = f[i]; a[i] = v <= 0 ? 0 : v >= 1 ? 1 : sstep(L.t - hw, L.t + hw, v + noise[(i + sh) % N] * L.amp); }
    alphas[L.m] = a;
    mark('l_field');
    if (L.m !== dom) maskedTex(gg, tmp, tg, tex(L.m, s), alphaCanvas(a, LW, LH), grow(bbox[L.m]), r, s, 1);
    else { // 底层只需在水、熔岩边重画一次，盖住它们向外扩的边
      const bs = [bbox.water, bbox.lava].filter(Boolean).map(grow);
      if (bs.length) { const AC = alphaCanvas(a, LW, LH); for (const bb of bs) maskedTex(gg, tmp, tg, tex(L.m, s), AC, bb, r, s, 1); }
    }
    mark('l_mask');
    if (L.m !== dom) fxCover(a);
    for (let i = 0; i < N; i++) landCover[i] = 1 - (1 - landCover[i]) * (1 - a[i]);
    // 各层自己的边缘
    const e1 = Math.max(1, r / 10 | 0), e2 = Math.max(1, r / 6 | 0);
    if (L.m === 'road') fxAdd('#a88458', edgeIn(a, e2), 0.5);
    if (L.m === 'stone') { fxAdd('#3a3428', edgeOut(a, e2, Math.max(1, r / 10 | 0)), 0.35); fxAdd('#7e7462', edgeIn(a, e1), 0.85); }
    if (L.m === 'snow') fxAdd('#a8bcdc', edgeIn(a, e2), 0.4);
    if (L.m === 'sand') fxAdd('#fff4d0', edgeIn(a, e2), 0.3);
    if (L.m === 'dark') fxAdd('#2a1c38', edgeIn(a, e2), 0.4);
    if (L.m === 'grass' && (present.sand || present.road || present.snow)) fxAdd('#6e9a44', edgeIn(a, e1), 0.35);
  }
  mark('land');
  // 5) 水岸 / 熔岩岸
  if (waterA) {
    const V = new Float32Array(N); for (let i = 0; i < N; i++) V[i] = waterA[i] * (1 - landCover[i]);
    const near = blur(V, LW, LH, Math.max(1, r / 10 | 0), 1), far = blur(V, LW, LH, Math.max(2, r / 5 | 0));
    const stA = alphas.stone || new Float32Array(N), quay = new Float32Array(N);
    const foam = new Float32Array(N), shade = new Float32Array(N), bank = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      foam[i] = V[i] * (1 - near[i]) * 2.2; shade[i] = V[i] * (1 - far[i]) * 1.6;
      const b = (1 - V[i]) * near[i] * 2.4 * landCover[i]; quay[i] = b * stA[i]; bank[i] = b * (1 - stA[i]);
    }
    fxAdd(theme === 'volcanic' ? '#1e3a4a' : '#2a6a96', shade, 0.5);
    fxAdd('#ffffff', foam, 0.6);
    fxAdd('#5a5244', quay, 0.8);
    fxAdd(theme === 'snow' ? '#8094b4' : theme === 'volcanic' ? '#5a4a44' : '#b49466', bank, theme === 'snow' ? 0.8 : 0.6);
    C.waterMask = alphaCanvas(V, LW, LH);
  }
  if (lavaA) {
    const V = new Float32Array(N); for (let i = 0; i < N; i++) V[i] = lavaA[i] * (1 - landCover[i]);
    const near = blur(V, LW, LH, Math.max(1, r / 10 | 0), 1), far = blur(V, LW, LH, Math.max(2, r / 4 | 0));
    const scorch = new Float32Array(N), glow = new Float32Array(N), rim = new Float32Array(N);
    for (let i = 0; i < N; i++) { scorch[i] = (1 - V[i]) * near[i] * 2.2; glow[i] = (1 - V[i]) * far[i] * 1.6; rim[i] = V[i] * (1 - near[i]) * 2; }
    fxAdd('#ff8a30', glow, 0.35);
    fxAdd('#3a201a', scorch, 0.75);
    fxAdd('#ffd070', rim, 0.6);
    C.lavaMask = alphaCanvas(V, LW, LH);
  }
  // fx 合成为一张图
  {
    const c = mk(LW, LH), cx = c.getContext('2d'), img = cx.createImageData(LW, LH), d = img.data;
    for (let i = 0; i < N; i++) { const a = fx[i * 4 + 3]; if (a <= 0.002) continue; d[i * 4] = fx[i * 4] / a; d[i * 4 + 1] = fx[i * 4 + 1] / a; d[i * 4 + 2] = fx[i * 4 + 2] / a; d[i * 4 + 3] = a * 255; }
    cx.putImageData(img, 0, 0);
    gg.drawImage(c, 0, 0, Wg, Hg);
  }
  mark('shore+fx');
  // 6) 红毯（贴格线的布料，不做柔边）
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (T(x, y) === 'K') carpet(gg, T, x, y, s, w, h);
  mark('carpet');
  // 7) 大尺度明暗（阳光斑驳）
  {
    const tw = Math.max(2, w * 3), th = Math.max(2, h * 3), c = mk(tw, th), cx = c.getContext('2d'), img = cx.createImageData(tw, th), d = img.data;
    const tn = noiseField(tw, th, 4, rng(seed() ^ 0x5bd1));
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      const i = y * tw + x, light = 0.06 * (1 - (x / tw + y / th)); // 左上略亮
      const v = 128 + (tn[i] * 0.5 + light) * 110;
      d[i * 4] = v + 6; d[i * 4 + 1] = v + 3; d[i * 4 + 2] = v - 6; d[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    gg.save(); gg.globalCompositeOperation = 'soft-light'; gg.globalAlpha = 0.55; gg.drawImage(c, 0, 0, Wg, Hg); gg.restore();
  }
  mark('tone');
  // 8) 物件层（全分辨率）：极淡格线 → 立体物件 → 氛围
  s = S;
  const over = mk(Wd, Hd), og = over.getContext('2d');
  og.save(); og.strokeStyle = theme === 'snow' ? 'rgba(60,80,120,0.07)' : 'rgba(30,40,20,0.06)'; og.lineWidth = Math.max(1, s / 64); og.beginPath();
  for (let x = 1; x < w; x++) { const X = Math.round(x * s) + 0.5; og.moveTo(X, 0); og.lineTo(X, Hd); }
  for (let y = 1; y < h; y++) { const Y = Math.round(y * s) + 0.5; og.moveTo(0, Y); og.lineTo(Wd, Y); }
  og.stroke(); og.restore();
  drawProps(og, T, w, h, s, theme, gm);
  ambient(og, w, h, s, theme, rng(seed() ^ 0x9e37));
  mark('props');
  C.ground = ground; C.over = over;
  return C;
}

// ---------- 红毯 ----------
function carpet(g, T, x, y, s, w, h) {
  const K = (i, j) => i >= 0 && j >= 0 && i < w && j < h && T(i, j) === 'K';
  const X = x * s, Y = y * s, ins = s * 0.12;
  const l = K(x - 1, y) ? 0 : ins, rr = K(x + 1, y) ? 0 : ins, t = K(x, y - 1) ? 0 : ins, b = K(x, y + 1) ? 0 : ins;
  const x0 = X + l, y0 = Y + t, x1 = X + s - rr, y1 = Y + s - b;
  g.fillStyle = 'rgba(40,20,20,0.25)'; g.fillRect(x0 + s * 0.03, y0 + s * 0.04, x1 - x0, y1 - y0);
  const gr = g.createLinearGradient(X, Y, X + s, Y + s); gr.addColorStop(0, '#c2404a'); gr.addColorStop(1, '#a42c3a');
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 织纹与内框
  g.fillStyle = 'rgba(255,200,200,0.07)'; for (let k = 0; k < 6; k++) g.fillRect(x0, Y + k * s / 6, x1 - x0, s / 24);
  g.strokeStyle = '#e8c062'; g.lineWidth = Math.max(1, s * 0.035);
  const e = s * 0.07;
  g.beginPath();
  if (!l) { } else { g.moveTo(x0 + e, Y + (t ? t + e : 0)); g.lineTo(x0 + e, Y + s - (b ? b + e : 0)); }
  if (rr) { g.moveTo(x1 - e, Y + (t ? t + e : 0)); g.lineTo(x1 - e, Y + s - (b ? b + e : 0)); }
  if (t) { g.moveTo(X + (l ? l + e : 0), y0 + e); g.lineTo(X + s - (rr ? rr + e : 0), y0 + e); }
  if (b) { g.moveTo(X + (l ? l + e : 0), y1 - e); g.lineTo(X + s - (rr ? rr + e : 0), y1 - e); }
  g.stroke();
  g.strokeStyle = 'rgba(80,10,20,0.6)'; g.lineWidth = Math.max(1, s * 0.015); g.beginPath();
  if (l) { g.moveTo(x0, y0); g.lineTo(x0, y1); } if (rr) { g.moveTo(x1, y0); g.lineTo(x1, y1); } if (t) { g.moveTo(x0, y0); g.lineTo(x1, y0); } if (b) { g.moveTo(x0, y1); g.lineTo(x1, y1); }
  g.stroke();
}

// ---------- 立体物件 ----------
const SPR = {};
function sprite(kind, v, theme, s, W, H, fn) {
  const id = kind + '|' + v + '|' + theme + '|' + s;
  if (SPR[id]) return SPR[id];
  if (Object.keys(SPR).length > 80) for (const k in SPR) delete SPR[k];
  const c = mk(W * s, H * s), g = c.getContext('2d');
  const t0 = performance.now();
  fn(g, s, rng(v * 7717 + kind.length * 31 + theme.length));
  PROF.sprgen = (PROF.sprgen || 0) + performance.now() - t0;
  return (SPR[id] = c);
}
function drawProps(g, T, w, h, s, theme, gm) {
  const at = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return null; const t = T(x, y); return t === 'b' ? 'B' : t; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = T(x, y), X = x * s, Y = y * s, v = (hash2(x, y, 3) * 4) | 0;
    switch (t) {
      case 'F': { const c = sprite('tree', v, theme, s, 1.5, 1.8, (sg, ss, R) => treeSprite(sg, ss, R, v, theme)); g.drawImage(c, X - 0.25 * s, Y - 0.8 * s); break; }
      case 'M': { const c = sprite('mtn', v, theme, s, 1.4, 1.9, (sg, ss, R) => mountainSprite(sg, ss, R, v, theme)); g.drawImage(c, X - 0.2 * s, Y - 0.9 * s); break; }
      case 'H': { const c = sprite('hill', v & 1, theme, s, 1.3, 1.4, (sg, ss, R) => hillSprite(sg, ss, R, v & 1, theme)); g.drawImage(c, X - 0.15 * s, Y - 0.4 * s); break; }
      case 'V': { const town = gm[y * w + x] === 'stone'; const c = sprite(town ? 'houseT' : 'house', v % 3, theme, s, 1.3, 1.7, (sg, ss, R) => houseSprite(sg, ss, R, v % 3, theme, town)); g.drawImage(c, X - 0.15 * s, Y - 0.7 * s); break; }
      case 'b': bridge(g, at, x, y, s); // 甲板上的桅杆：先画甲板再画柱
      // fallthrough
      case 'Y': { const c = sprite('pillar', 0, theme, s, 1.2, 1.9, (sg, ss) => pillarSprite(sg, ss, theme)); g.drawImage(c, X - 0.1 * s, Y - 0.9 * s); break; }
      case 'A': { const c = sprite('altar', 0, theme, s, 1.2, 1.4, (sg, ss) => altarSprite(sg, ss)); g.drawImage(c, X - 0.1 * s, Y - 0.4 * s); break; }
      case 'X': wall(g, at, x, y, s); break;
      case 'B': bridge(g, at, x, y, s); break;
    }
  }
}

// 蓬松圆树：多个圆团叠成树冠，左上受光
const TREE_PAL = {
  normal: { out: '#2e5a2c', dark: '#3f7a38', mid: '#5f9e48', light: '#8cc65a', hi: '#c4e488', trunk: '#7a5232' },
  desert: { out: '#3a5a28', dark: '#4f7a34', mid: '#74a044', light: '#a4c860', hi: '#d4e890', trunk: '#8a6038' },
  volcanic: { out: '#2a2430', dark: '#3e3a4a', mid: '#5a5468', light: '#857c90', hi: '#b0a8b8', trunk: '#3a2a24' },
  cave: { out: '#24402e', dark: '#33583e', mid: '#4a7650', light: '#6e9a68', hi: '#a0c490', trunk: '#5a4030' },
};
function canopy(g, cx, cy, r, P, R) {
  const lumps = [[0, 0, 0.78]];
  const n = 6 + (R() * 2 | 0);
  for (let i = 0; i < n; i++) { const a = i / n * 6.283 + R() * 0.5, d = 0.42 + R() * 0.12; lumps.push([Math.cos(a) * d, Math.sin(a) * d * 0.9, 0.48 + R() * 0.14]); }
  const path = (grow, ox, oy) => { g.beginPath(); for (const [lx, ly, lr] of lumps) { const X = cx + lx * r + (ox || 0), Y = cy + ly * r + (oy || 0), rr = lr * r + grow; g.moveTo(X + rr, Y); g.arc(X, Y, rr, 0, 7); } };
  path(r * 0.07); g.fillStyle = P.out; g.fill();
  path(0); g.fillStyle = P.dark; g.fill();
  g.save(); path(0); g.clip();
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx - r * 0.1, cy - r * 0.1, r * 1.25);
  gr.addColorStop(0, P.light); gr.addColorStop(0.45, P.mid); gr.addColorStop(1, rgba(P.mid, 0));
  g.fillStyle = gr; g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  // 叶团纹理：左上偏亮，右下偏暗
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.283, d = Math.sqrt(R()) * r * 0.95, X = cx + Math.cos(a) * d, Y = cy + Math.sin(a) * d, lr = r * (0.13 + R() * 0.1);
    const lit = (cx - X) + (cy - Y) > 0;
    g.fillStyle = lit ? rgba(P.hi, 0.35) : rgba(P.out, 0.28);
    g.beginPath(); g.arc(X, Y - lr * 0.2, lr, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill();
  }
  blob(g, cx - r * 0.38, cy - r * 0.42, r * 0.32, r * 0.24, P.hi, 0.7);
  // 下缘暗部
  g.fillStyle = rgba(P.out, 0.35); g.beginPath(); g.ellipse(cx + r * 0.1, cy + r * 0.95, r * 1.2, r * 0.45, 0, 0, 7); g.fill();
  g.restore();
}
function shadowEll(g, x, y, rx, ry, a) { blob(g, x, y, rx, ry, '#1a2a10', a); }
function treeSprite(g, s, R, v, theme) {
  const ox = 0.25 * s, oy = 0.8 * s;
  const L = [[[0.3, 0.6, 0.27], [0.72, 0.92, 0.29]], [[0.5, 0.55, 0.33], [0.2, 0.96, 0.22], [0.8, 0.98, 0.23]], [[0.28, 0.7, 0.28], [0.74, 0.58, 0.27], [0.52, 1.0, 0.25]], [[0.5, 0.88, 0.4]]][v];
  L.sort((a, b) => a[1] - b[1]);
  if (theme === 'snow') { for (const [x, y, r] of L) pine(g, ox + x * s, oy + y * s, r * s * 1.05, R); return; }
  if (theme === 'desert' && v !== 3) { for (const [x, y, r] of L) palm(g, ox + x * s, oy + y * s, r * s, R); return; }
  const P = TREE_PAL[theme] || TREE_PAL.normal;
  for (const [x, y, r] of L) shadowEll(g, ox + (x + 0.06) * s, oy + y * s, r * s * 1.15, r * s * 0.45, 0.45);
  for (const [x, y, r] of L) {
    const X = ox + x * s, Y = oy + y * s, rr = r * s;
    g.fillStyle = P.trunk; g.beginPath(); g.moveTo(X - rr * 0.14, Y); g.lineTo(X - rr * 0.08, Y - rr * 0.8); g.lineTo(X + rr * 0.08, Y - rr * 0.8); g.lineTo(X + rr * 0.16, Y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y - rr * 0.8, rr * 0.1, rr * 0.8);
    canopy(g, X, Y - rr * 1.05, rr, P, R);
  }
}
function pine(g, x, y, r, R) {
  shadowEll(g, x + r * 0.2, y, r * 1.0, r * 0.38, 0.4);
  g.fillStyle = '#6a4a30'; g.fillRect(x - r * 0.1, y - r * 0.5, r * 0.2, r * 0.5);
  const tiers = 3, top = y - r * 2.5;
  for (let i = 0; i < tiers; i++) {
    const ty = top + i * r * 0.62, by = ty + r * 1.05, hw = r * (0.45 + i * 0.28);
    g.fillStyle = '#24483e'; g.beginPath(); g.moveTo(x, ty - r * 0.05); g.lineTo(x - hw - r * 0.06, by + r * 0.04); g.lineTo(x + hw + r * 0.06, by + r * 0.04); g.closePath(); g.fill();
    const gr = g.createLinearGradient(x - hw, 0, x + hw, 0); gr.addColorStop(0, '#5a8a6a'); gr.addColorStop(0.5, '#3a6a54'); gr.addColorStop(1, '#2a5444');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x, ty); g.lineTo(x - hw, by); g.lineTo(x + hw, by); g.closePath(); g.fill();
    // 积雪
    g.fillStyle = '#f4f8fd'; g.beginPath(); g.moveTo(x, ty); g.lineTo(x - hw * 0.62, ty + (by - ty) * 0.62);
    for (let k = 0; k <= 4; k++) { const px = x - hw * 0.62 + hw * 1.24 * k / 4; g.quadraticCurveTo(px - hw * 0.15, ty + (by - ty) * (0.72 + (k % 2) * 0.08), px, ty + (by - ty) * 0.6); }
    g.lineTo(x, ty); g.fill();
    g.fillStyle = 'rgba(170,190,220,0.6)'; g.beginPath(); g.moveTo(x, ty); g.lineTo(x + hw * 0.6, ty + (by - ty) * 0.6); g.lineTo(x + hw * 0.1, ty + (by - ty) * 0.6); g.fill();
  }
}
function palm(g, x, y, r, R) {
  shadowEll(g, x + r * 0.5, y, r * 1.1, r * 0.4, 0.4);
  const lean = (R() - 0.5) * r * 0.8, topX = x + lean, topY = y - r * 2.1;
  g.strokeStyle = '#8a6a44'; g.lineWidth = r * 0.22; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.2, y - r, topX, topY); g.stroke();
  g.strokeStyle = '#b8945e'; g.lineWidth = r * 0.08; g.beginPath(); g.moveTo(x - r * 0.05, y); g.quadraticCurveTo(x + lean * 0.2 - r * 0.05, y - r, topX - r * 0.04, topY); g.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55 + (R() - 0.5) * 0.2, L = r * (1.0 + R() * 0.3);
    const ex = topX + Math.cos(a) * L, ey = topY + Math.sin(a) * L * 0.6 + L * 0.35;
    const mx = topX + Math.cos(a) * L * 0.5, my = topY + Math.sin(a) * L * 0.5 - r * 0.15;
    g.fillStyle = i % 2 ? '#4f8a3a' : '#66a046';
    g.beginPath(); g.moveTo(topX, topY); g.quadraticCurveTo(mx - Math.sin(a) * r * 0.25, my, ex, ey); g.quadraticCurveTo(mx + Math.sin(a) * r * 0.1, my + r * 0.12, topX, topY); g.fill();
  }
  g.fillStyle = '#6a4a2a'; g.beginPath(); g.arc(topX - r * 0.1, topY + r * 0.12, r * 0.1, 0, 7); g.arc(topX + r * 0.1, topY + r * 0.14, r * 0.1, 0, 7); g.fill();
}

const MTN_PAL = {
  normal: { out: '#3e342c', dark: '#857462', mid: '#ab9a82', light: '#d6c8ae', hi: '#efe6d2', snow: 0.3, grass: '#7ea24c' },
  snow: { out: '#363e50', dark: '#76839a', mid: '#a0acc0', light: '#d0d8e6', hi: '#ffffff', snow: 0.75, grass: '#dfe8f4' },
  desert: { out: '#4e2e20', dark: '#a0644a', mid: '#c88c66', light: '#e8b88c', hi: '#f8dab2', snow: 0, grass: '#d8bc84' },
  volcanic: { out: '#1a1416', dark: '#3a2e32', mid: '#5a4a4c', light: '#806c68', hi: '#a28e88', snow: 0, grass: '#4a3a3a', lava: 1 },
  cave: { out: '#2a221c', dark: '#5a4c40', mid: '#7e6c5a', light: '#a49278', hi: '#c4b498', snow: 0, grass: '#7a6a54' },
};
// 岩山：由几块圆钝岩体堆成（后高前低），左上受光
function rockLump(g, X, Y, s, R, P, cx, top, hw, snow) {
  const by = 0.97, j = () => (R() - 0.5) * 0.05;
  const pts = [[cx - hw, by], [cx - hw * 0.98 + j(), lerp(by, top, 0.45)], [cx - hw * 0.72 + j(), top + 0.14 + j()], [cx - hw * 0.3, top + 0.02 + j() * 0.5], [cx + hw * 0.05, top],
    [cx + hw * 0.42 + j(), top + 0.06 + j() * 0.5], [cx + hw * 0.8 + j(), top + 0.2 + j()], [cx + hw * 0.99, lerp(by, top, 0.4)], [cx + hw, by]];
  const path = () => {
    g.beginPath(); g.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx2, by2] = pts[i]; g.quadraticCurveTo(X(ax + (bx2 - ax) * 0.1), Y(ay + (by2 - ay) * 0.1 - 0.02), X((ax + bx2) / 2), Y((ay + by2) / 2)); g.lineTo(X(bx2), Y(by2)); }
    g.closePath();
  };
  g.save(); g.translate(s * 0.012, s * 0.02); path(); g.fillStyle = P.out; g.fill(); g.restore();
  path(); g.lineJoin = 'round'; g.lineWidth = s * 0.04; g.strokeStyle = P.out; g.stroke();
  path(); g.fillStyle = P.mid; g.fill();
  g.save(); path(); g.clip();
  // 受光面：一条由峰顶斜向右下的山脊线把岩体分成亮、暗两面
  const rx = cx + hw * 0.05;
  g.beginPath(); g.moveTo(X(cx - hw - 0.1), Y(top - 0.1)); g.lineTo(X(rx), Y(top - 0.1)); g.lineTo(X(rx), Y(top + 0.02));
  g.quadraticCurveTo(X(rx + hw * 0.1), Y(lerp(top, by, 0.4)), X(rx - hw * 0.15), Y(lerp(top, by, 0.7))); g.lineTo(X(rx + hw * 0.05), Y(by + 0.1)); g.lineTo(X(cx - hw - 0.1), Y(by + 0.1)); g.closePath();
  const gl = g.createLinearGradient(X(cx - hw), Y(top), X(rx), Y(by)); gl.addColorStop(0, P.hi); gl.addColorStop(0.45, P.light); gl.addColorStop(1, P.mid);
  g.fillStyle = gl; g.fill();
  // 暗面渐层与底部阴影
  const gd = g.createLinearGradient(X(rx), 0, X(cx + hw), 0); gd.addColorStop(0, rgba(P.dark, 0)); gd.addColorStop(1, rgba(P.dark, 0.85));
  g.fillStyle = gd; g.fillRect(X(rx), Y(top - 0.1), hw * 1.2 * s, (by - top + 0.2) * s);
  const gb = g.createLinearGradient(0, Y(lerp(top, by, 0.55)), 0, Y(by)); gb.addColorStop(0, rgba(P.out, 0)); gb.addColorStop(1, rgba(P.out, 0.35));
  g.fillStyle = gb; g.fillRect(X(cx - hw - 0.05), Y(top), (hw * 2 + 0.1) * s, (by - top) * s + 2);
  // 岩层横纹与裂缝
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const yy = lerp(top, by, 0.3 + k * 0.2 + (R() - 0.5) * 0.06), x0 = cx - hw * (0.3 + R() * 0.5), x1 = x0 + hw * (0.4 + R() * 0.5);
    g.strokeStyle = rgba(P.out, 0.4); g.lineWidth = Math.max(1, s * 0.016);
    g.beginPath(); g.moveTo(X(x0), Y(yy)); g.quadraticCurveTo(X((x0 + x1) / 2), Y(yy + 0.03), X(x1), Y(yy - 0.01)); g.stroke();
    g.strokeStyle = rgba(P.hi, 0.5); g.lineWidth = Math.max(1, s * 0.012);
    g.beginPath(); g.moveTo(X(x0), Y(yy - 0.018)); g.quadraticCurveTo(X((x0 + x1) / 2), Y(yy + 0.012), X(x1), Y(yy - 0.028)); g.stroke();
  }
  g.strokeStyle = rgba(P.out, 0.5); g.lineWidth = Math.max(1, s * 0.016);
  for (let k = 0; k < 2; k++) { const sx = cx + (R() - 0.3) * hw, sy = lerp(top, by, 0.15 + R() * 0.3); g.beginPath(); g.moveTo(X(sx), Y(sy)); g.lineTo(X(sx + 0.03), Y(sy + 0.1)); g.lineTo(X(sx - 0.01), Y(sy + 0.2)); g.stroke(); }
  if (snow > 0) {
    const sd = snow * (by - top) * 0.5;
    g.beginPath(); g.moveTo(X(cx - hw * 1.1), Y(top - 0.1)); g.lineTo(X(cx + hw * 1.1), Y(top - 0.1));
    g.lineTo(X(cx + hw * 1.1), Y(top + sd * 0.8));
    for (let k = 6; k >= 0; k--) { const xx = cx - hw * 1.1 + hw * 2.2 * k / 6; g.quadraticCurveTo(X(xx + hw * 0.18), Y(top + sd * (1.25 + (R() - 0.5) * 0.5)), X(xx), Y(top + sd * (0.85 + (R() - 0.5) * 0.3))); }
    g.closePath();
    const gs = g.createLinearGradient(X(cx - hw), 0, X(cx + hw), 0); gs.addColorStop(0, '#ffffff'); gs.addColorStop(0.55, '#f2f6fc'); gs.addColorStop(1, '#bccadf');
    g.fillStyle = gs; g.fill();
  }
  if (P.lava && R() < 0.7) { g.strokeStyle = 'rgba(255,130,40,0.9)'; g.lineWidth = Math.max(1, s * 0.024); const sx = cx + (R() - 0.5) * hw * 0.6; g.beginPath(); g.moveTo(X(sx), Y(top + 0.08)); g.lineTo(X(sx - 0.04), Y(top + 0.25)); g.lineTo(X(sx + 0.03), Y(top + 0.42)); g.stroke(); blob(g, X(sx), Y(top + 0.25), s * 0.1, s * 0.12, '#ff7a30', 0.35); }
  g.restore();
}
function mountainSprite(g, s, R, v, theme) {
  const P = MTN_PAL[theme] || MTN_PAL.normal;
  const ox = 0.2 * s, oy = 0.9 * s, X = u => ox + u * s, Y = u => oy + u * s;
  blob(g, X(0.55), Y(0.95), s * 0.62, s * 0.18, '#140e0a', 0.45);
  const lay = [
    [[0.5, -0.5, 0.42], [0.22, 0.12, 0.27], [0.78, 0.2, 0.26], [0.5, 0.5, 0.26]],
    [[0.38, -0.38, 0.38], [0.74, -0.12, 0.3], [0.3, 0.38, 0.3], [0.72, 0.5, 0.25]],
    [[0.6, -0.45, 0.4], [0.25, -0.05, 0.3], [0.8, 0.35, 0.24], [0.45, 0.48, 0.3]],
    [[0.45, -0.28, 0.45], [0.82, 0.18, 0.24], [0.2, 0.42, 0.24], [0.56, 0.55, 0.24]],
  ][v];
  lay.forEach(([cx, top, hw], i) => rockLump(g, X, Y, s, R, P, cx + (R() - 0.5) * 0.04, top + (R() - 0.5) * 0.05, hw, i === 0 ? P.snow : i === 1 ? P.snow * 0.5 : 0));
  // 山脚草丛 / 碎石
  for (let k = 0; k < 5; k++) {
    const bx = 0.05 + R() * 0.9;
    g.fillStyle = rgba(P.grass, 0.95); g.beginPath(); g.ellipse(X(bx), Y(0.97), s * (0.05 + R() * 0.05), s * 0.04, 0, Math.PI, 0); g.fill();
  }
}
function hillSprite(g, s, R, v, theme) {
  const ox = 0.15 * s, oy = 0.4 * s, X = u => ox + u * s, Y = u => oy + u * s;
  const P = theme === 'snow' ? ['#9fb0cc', '#d6e0ee', '#ffffff', '#7a8cac'] : theme === 'desert' ? ['#c09a62', '#e4c48a', '#f8e4b0', '#94703e'] : theme === 'volcanic' ? ['#4a3c3c', '#6a5a56', '#8c7a72', '#2a2020'] : theme === 'cave' ? ['#7a6a54', '#9a8a70', '#c0b090', '#4a3e30'] : ['#5f8e3c', '#8fc05a', '#c2e28a', '#3e6628'];
  blob(g, X(0.6), Y(0.94), s * 0.6, s * 0.17, '#1a2410', 0.42);
  const mounds = v ? [[0.3, 0.86, 0.34, 0.44], [0.7, 0.95, 0.36, 0.38]] : [[0.5, 0.93, 0.5, 0.56]];
  for (const [cx, by, rx, ry] of mounds) {
    const path = grow => { g.beginPath(); g.moveTo(X(cx - rx - 0.06) - grow, Y(by) + grow * 0.3);
      g.bezierCurveTo(X(cx - rx * 0.8) - grow, Y(by - ry * 0.55) - grow, X(cx - rx * 0.45), Y(by - ry * 1.02) - grow, X(cx), Y(by - ry) - grow);
      g.bezierCurveTo(X(cx + rx * 0.5), Y(by - ry * 0.98) - grow, X(cx + rx * 0.85) + grow, Y(by - ry * 0.5) - grow, X(cx + rx + 0.06) + grow, Y(by) + grow * 0.3); g.closePath(); };
    path(s * 0.022); g.fillStyle = rgba(P[3], 0.9); g.fill();
    path(0);
    const gr = g.createRadialGradient(X(cx - rx * 0.35), Y(by - ry * 0.8), s * 0.02, X(cx - rx * 0.1), Y(by - ry * 0.4), rx * s * 1.25);
    gr.addColorStop(0, P[2]); gr.addColorStop(0.42, P[1]); gr.addColorStop(1, P[0]);
    g.fillStyle = gr; g.fill();
    g.save(); path(0); g.clip();
    // 右下暗面
    g.fillStyle = rgba(P[3], 0.35); g.beginPath(); g.ellipse(X(cx + rx * 0.55), Y(by), rx * s * 0.75, ry * s * 0.8, 0, 0, 7); g.fill();
    // 草纹
    g.strokeStyle = rgba(P[3], 0.45); g.lineWidth = Math.max(1, s * 0.014); g.lineCap = 'round'; g.beginPath();
    for (let k = 0; k < 18; k++) { const a = R() * Math.PI, d = Math.sqrt(R()) * 0.85, x = X(cx - Math.cos(a) * rx * d), y = Y(by - Math.sin(a) * ry * d); g.moveTo(x, y); g.lineTo(x + s * 0.008, y - s * 0.04); }
    g.stroke();
    g.strokeStyle = rgba(P[2], 0.6); g.beginPath();
    for (let k = 0; k < 10; k++) { const a = Math.PI * (0.45 + R() * 0.5), d = 0.4 + R() * 0.5, x = X(cx - Math.cos(a) * rx * d), y = Y(by - Math.sin(a) * ry * d); g.moveTo(x, y); g.lineTo(x - s * 0.006, y - s * 0.035); }
    g.stroke();
    g.restore();
    // 底部融入地面
    const gb = g.createLinearGradient(0, Y(by - 0.08), 0, Y(by + 0.02)); gb.addColorStop(0, rgba(P[0], 0)); gb.addColorStop(1, rgba(P[0], 0.5));
    g.fillStyle = gb; g.fillRect(X(cx - rx - 0.08), Y(by - 0.08), (rx * 2 + 0.16) * s, 0.1 * s);
  }
  // 小石头
  for (let k = 0; k < 2; k++) { const x = X(0.15 + R() * 0.7), y = Y(0.88 + R() * 0.06), rr = s * (0.03 + R() * 0.02); g.fillStyle = '#5a5040'; g.beginPath(); g.ellipse(x + rr * 0.2, y + rr * 0.2, rr, rr * 0.7, 0, 0, 7); g.fill(); g.fillStyle = '#c8bca4'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.7, 0, 0, 7); g.fill(); }
}
function houseSprite(g, s, R, v, theme, town) {
  const ox = 0.15 * s, oy = 0.7 * s, X = u => ox + u * s, Y = u => oy + u * s;
  const roof = [['#d86a50', '#a8402e', '#f8a080'], ['#5a8ac8', '#34588a', '#8ab8e8'], ['#7aa84e', '#4a7434', '#a8d47a']][v];
  // 院子与阴影
  if (!town) blob(g, X(0.5), Y(0.82), s * 0.62, s * 0.26, '#e0c890', 0.8);
  blob(g, X(0.6), Y(0.94), s * 0.5, s * 0.1, '#2a2010', 0.4);
  const wx0 = X(0.1), wx1 = X(0.9), wy0 = Y(0.36), wy1 = Y(0.93), lw = Math.max(1, s * 0.025);
  // 墙
  g.fillStyle = '#3e2a20'; g.fillRect(wx0 - lw, wy0, wx1 - wx0 + lw * 2, wy1 - wy0 + lw);
  const gw = g.createLinearGradient(wx0, 0, wx1, 0); gw.addColorStop(0, '#fff4dc'); gw.addColorStop(0.65, '#eedfc0'); gw.addColorStop(1, '#cdb994');
  g.fillStyle = gw; g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
  g.fillStyle = '#8a6040'; g.fillRect(wx0, wy0 + (wy1 - wy0) * 0.5, wx1 - wx0, s * 0.035); g.fillRect(wx0, wy1 - s * 0.045, wx1 - wx0, s * 0.045);
  for (const tx of [0.1, 0.9]) g.fillRect(X(tx) - s * 0.02, wy0, s * 0.04, wy1 - wy0);
  // 门
  g.fillStyle = '#3e2a20'; g.beginPath(); g.roundRect ? g.roundRect(X(0.41) - lw, Y(0.6) - lw, s * 0.18 + lw * 2, s * 0.33 + lw, [s * 0.09, s * 0.09, 0, 0]) : g.rect(X(0.41), Y(0.6), s * 0.18, s * 0.33); g.fill();
  g.fillStyle = '#8a5a32'; g.beginPath(); g.roundRect ? g.roundRect(X(0.41), Y(0.6), s * 0.18, s * 0.33, [s * 0.09, s * 0.09, 0, 0]) : g.rect(X(0.41), Y(0.6), s * 0.18, s * 0.33); g.fill();
  g.fillStyle = '#f4c860'; g.beginPath(); g.arc(X(0.55), Y(0.78), s * 0.016, 0, 7); g.fill();
  // 窗（暖光）
  for (const wx of [0.17, 0.68]) {
    g.fillStyle = '#3e2a20'; g.fillRect(X(wx) - lw, Y(0.55) - lw, s * 0.15 + lw * 2, s * 0.14 + lw * 2);
    const gwin = g.createLinearGradient(0, Y(0.55), 0, Y(0.69)); gwin.addColorStop(0, '#fff6c0'); gwin.addColorStop(1, '#f0b848');
    g.fillStyle = gwin; g.fillRect(X(wx), Y(0.55), s * 0.15, s * 0.14);
    g.fillStyle = '#5a3c28'; g.fillRect(X(wx) + s * 0.065, Y(0.55), s * 0.02, s * 0.14); g.fillRect(X(wx), Y(0.61), s * 0.15, s * 0.02);
  }
  // 烟囱
  g.fillStyle = '#3e2a20'; g.fillRect(X(0.66) - lw, Y(-0.06), s * 0.12 + lw * 2, s * 0.3);
  g.fillStyle = '#9a8478'; g.fillRect(X(0.66), Y(-0.05), s * 0.12, s * 0.28); g.fillStyle = '#c0aa9c'; g.fillRect(X(0.66), Y(-0.05), s * 0.04, s * 0.28);
  // 屋顶（带屋檐）
  const roofP = (d) => { g.beginPath(); g.moveTo(X(-0.04) - d, Y(0.44) + d); g.lineTo(X(0.5), Y(-0.02) - d); g.lineTo(X(1.04) + d, Y(0.44) + d); g.closePath(); };
  roofP(lw * 1.2); g.fillStyle = '#3e2a20'; g.fill();
  roofP(0); g.fillStyle = roof[1]; g.fill();
  g.fillStyle = roof[0]; g.beginPath(); g.moveTo(X(-0.04), Y(0.44)); g.lineTo(X(0.5), Y(-0.02)); g.lineTo(X(0.56), Y(0.44)); g.closePath(); g.fill();
  g.save(); roofP(0); g.clip();
  g.strokeStyle = rgba(roof[1], 0.75); g.lineWidth = Math.max(1, s * 0.014); g.beginPath();
  for (let k = 1; k < 5; k++) { const yy = -0.02 + 0.46 * k / 5; g.moveTo(X(-0.1), Y(yy)); g.lineTo(X(1.1), Y(yy)); }
  for (let k = 0; k < 5; k++) for (let i = 0; i < 9; i++) { const yy = -0.02 + 0.46 * k / 5, xx = -0.04 + i * 0.13 + (k % 2) * 0.065; g.moveTo(X(xx), Y(yy)); g.lineTo(X(xx), Y(yy + 0.092)); }
  g.stroke();
  g.restore();
  g.strokeStyle = rgba(roof[2], 0.9); g.lineWidth = Math.max(1, s * 0.03); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(0.02), Y(0.42)); g.lineTo(X(0.5), Y(0.0)); g.stroke();
  if (theme === 'snow') { g.fillStyle = '#f6f9fd'; g.beginPath(); g.moveTo(X(0.5), Y(-0.03)); g.lineTo(X(0.1), Y(0.32)); g.quadraticCurveTo(X(0.3), Y(0.26), X(0.5), Y(0.3)); g.quadraticCurveTo(X(0.7), Y(0.26), X(0.9), Y(0.32)); g.closePath(); g.fill(); }
}
function pillarSprite(g, s, theme) {
  const ox = 0.1 * s, oy = 0.9 * s, X = u => ox + u * s, Y = u => oy + u * s;
  blob(g, X(0.62), Y(0.86), s * 0.42, s * 0.14, '#1a1410', 0.45);
  // 底座
  g.fillStyle = '#5a5248'; g.beginPath(); g.ellipse(X(0.5), Y(0.84), s * 0.34, s * 0.12, 0, 0, 7); g.fill();
  g.fillStyle = '#cfc8ba'; g.fillRect(X(0.2), Y(0.68), s * 0.6, s * 0.16); g.fillStyle = '#e8e2d6'; g.fillRect(X(0.2), Y(0.68), s * 0.6, s * 0.04);
  g.fillStyle = '#a8a092'; g.fillRect(X(0.6), Y(0.68), s * 0.2, s * 0.16);
  // 柱身
  const gs = g.createLinearGradient(X(0.3), 0, X(0.7), 0);
  gs.addColorStop(0, '#d8d2c6'); gs.addColorStop(0.3, '#f6f2ea'); gs.addColorStop(0.65, '#c8c0b0'); gs.addColorStop(1, '#8e8678');
  g.fillStyle = '#4a4238'; g.fillRect(X(0.28), Y(-0.6), s * 0.44, s * 1.3);
  g.fillStyle = gs; g.fillRect(X(0.3), Y(-0.6), s * 0.4, s * 1.3);
  g.strokeStyle = 'rgba(110,100,86,0.4)'; g.lineWidth = Math.max(1, s * 0.012); g.beginPath();
  for (const fx of [0.38, 0.46, 0.54, 0.62]) { g.moveTo(X(fx), Y(-0.55)); g.lineTo(X(fx), Y(0.66)); }
  g.stroke();
  // 柱头
  g.fillStyle = '#4a4238'; g.fillRect(X(0.18), Y(-0.78), s * 0.64, s * 0.22);
  g.fillStyle = '#e4ded2'; g.fillRect(X(0.2), Y(-0.76), s * 0.6, s * 0.18);
  g.fillStyle = '#fbf8f2'; g.fillRect(X(0.2), Y(-0.76), s * 0.6, s * 0.05);
  g.fillStyle = '#aaa294'; g.fillRect(X(0.6), Y(-0.71), s * 0.2, s * 0.13);
}
function altarSprite(g, s) {
  const ox = 0.1 * s, oy = 0.4 * s, X = u => ox + u * s, Y = u => oy + u * s;
  // 光晕
  blob(g, X(0.5), Y(0.5), s * 0.62, s * 0.5, '#fff0a0', 0.55);
  // 台座（两阶圆台）
  g.fillStyle = '#6a604e'; g.beginPath(); g.ellipse(X(0.5), Y(0.62), s * 0.46, s * 0.3, 0, 0, 7); g.fill();
  g.fillStyle = '#e6dcc4'; g.beginPath(); g.ellipse(X(0.5), Y(0.57), s * 0.45, s * 0.28, 0, 0, 7); g.fill();
  g.fillStyle = '#f6efdc'; g.beginPath(); g.ellipse(X(0.5), Y(0.53), s * 0.36, s * 0.21, 0, 0, 7); g.fill();
  // 魔法阵
  g.strokeStyle = '#e0a830'; g.lineWidth = Math.max(1, s * 0.02);
  g.beginPath(); g.ellipse(X(0.5), Y(0.53), s * 0.3, s * 0.17, 0, 0, 7); g.stroke();
  g.beginPath(); g.ellipse(X(0.5), Y(0.53), s * 0.2, s * 0.11, 0, 0, 7); g.stroke();
  g.beginPath();
  for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * 4 * Math.PI / 5; const px = X(0.5) + Math.cos(a) * s * 0.2, py = Y(0.53) + Math.sin(a) * s * 0.11; k ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke();
  g.save(); g.globalCompositeOperation = 'lighter'; blob(g, X(0.5), Y(0.5), s * 0.3, s * 0.2, '#ffd860', 0.5);
  // 光柱
  const gl = g.createLinearGradient(0, Y(-0.35), 0, Y(0.55)); gl.addColorStop(0, 'rgba(255,240,170,0)'); gl.addColorStop(1, 'rgba(255,230,140,0.45)');
  g.fillStyle = gl; g.beginPath(); g.moveTo(X(0.36), Y(0.55)); g.lineTo(X(0.42), Y(-0.35)); g.lineTo(X(0.58), Y(-0.35)); g.lineTo(X(0.64), Y(0.55)); g.fill();
  g.restore();
  g.fillStyle = '#fffbe6'; for (const [a, b] of [[0.3, 0.2], [0.68, 0.05], [0.56, -0.15], [0.4, -0.05]]) { g.beginPath(); g.arc(X(a), Y(b), s * 0.018, 0, 7); g.fill(); }
}

// 城墙：顶面石板 + 南侧立面砖墙，按邻格连接
function wall(g, at, x, y, s) {
  const X = x * s, Y = y * s, hh = s * 0.45, isX = (i, j) => at(i, j) === 'X';
  const n = isX(x, y - 1), so = isX(x, y + 1), e = isX(x + 1, y), wv = isX(x - 1, y);
  const top = tex('wallTop', s), face = tex('wallFace', s);
  const OUT = '#2e2622', lw = Math.max(1.5, s * 0.03);
  if (!so) {
    // 墙脚阴影落在下一格
    const gs = g.createLinearGradient(0, Y + s, 0, Y + s * 1.3); gs.addColorStop(0, 'rgba(30,24,20,0.42)'); gs.addColorStop(1, 'rgba(30,24,20,0)');
    g.fillStyle = gs; g.fillRect(X, Y + s, s + (e ? 0 : s * 0.12), s * 0.3);
    g.save(); g.beginPath(); g.rect(X, Y + s - hh, s, hh); g.clip();
    g.fillStyle = g.createPattern(face, 'repeat'); g.fillRect(X, Y + s - hh, s, hh);
    const gf = g.createLinearGradient(0, Y + s - hh, 0, Y + s); gf.addColorStop(0, 'rgba(255,250,235,0.1)'); gf.addColorStop(1, 'rgba(30,22,18,0.45)');
    g.fillStyle = gf; g.fillRect(X, Y + s - hh, s, hh);
    g.restore();
    g.fillStyle = OUT; g.fillRect(X - (wv ? 0 : lw), Y + s - lw, s + (wv ? 0 : lw) + (e ? 0 : lw), lw);
    if (!e) { g.fillStyle = OUT; g.fillRect(X + s, Y + s - hh, lw, hh); g.fillStyle = 'rgba(30,22,18,0.3)'; g.fillRect(X + s - s * 0.06, Y + s - hh, s * 0.06, hh); }
    if (!wv) { g.fillStyle = OUT; g.fillRect(X - lw, Y + s - hh, lw, hh); }
  }
  if (!e) { // 东侧投影
    const ge = g.createLinearGradient(X + s, 0, X + s * 1.18, 0); ge.addColorStop(0, 'rgba(30,24,20,0.3)'); ge.addColorStop(1, 'rgba(30,24,20,0)');
    g.fillStyle = ge; g.fillRect(X + s + lw, Y - hh * 0.4 + (n ? -hh * 0.6 : 0), s * 0.18, s + hh * 0.4);
  }
  // 顶面
  const ty = Y - hh, th = so ? s : s - hh;
  g.save(); g.beginPath(); g.rect(X, ty, s, th); g.clip();
  g.fillStyle = g.createPattern(top, 'repeat'); g.fillRect(X, ty, s, th);
  // 外缘女儿墙（带垛口）
  const pw = s * 0.15, cop = '#d4cdbd', notch = 'rgba(60,52,44,0.85)';
  const band = (bx, by, bw, bh, horiz) => {
    g.fillStyle = 'rgba(40,32,26,0.35)'; g.fillRect(bx + (horiz ? 0 : bw), by + (horiz ? bh : 0), horiz ? bw : s * 0.04, horiz ? s * 0.04 : bh);
    g.fillStyle = cop; g.fillRect(bx, by, bw, bh);
    g.fillStyle = 'rgba(255,255,250,0.55)'; g.fillRect(bx, by, horiz ? bw : bw * 0.35, horiz ? bh * 0.35 : bh);
    g.fillStyle = notch;
    for (let k = 0; k < 3; k++) { const c = (k + 0.5) / 3; if (horiz) g.fillRect(bx + bw * c - s * 0.05, by + bh * 0.3, s * 0.1, bh * 0.45); else g.fillRect(bx + bw * 0.3, by + bh * c - s * 0.05, bw * 0.45, s * 0.1); }
  };
  if (!n) band(X, ty, s, pw, true);
  if (!so) band(X, ty + th - pw, s, pw, true);
  if (!wv) band(X, ty, pw, th, false);
  if (!e) band(X + s - pw, ty, pw, th, false);
  g.restore();
  // 外轮廓
  g.fillStyle = OUT;
  if (!n) g.fillRect(X - (wv ? 0 : lw), ty - lw, s + (wv ? 0 : lw) + (e ? 0 : lw), lw);
  if (!wv) g.fillRect(X - lw, ty, lw, th);
  if (!e) g.fillRect(X + s, ty, lw, th);
  if (!so) g.fillRect(X, ty + th - Math.max(1, lw * 0.5), s, Math.max(1, lw * 0.5));
}

// 木桥 / 甲板：按两侧是否接陆地决定走向；相邻桥格连成一片，只有临水的一侧才有栏杆
function bridge(g, at, x, y, s) {
  const X = x * s, Y = y * s;
  const water = t => t === 'W' || t === 'T' || t === 'L';
  const pass = t => t !== null && !water(t);
  const lr = pass(at(x - 1, y)) || pass(at(x + 1, y)), ud = pass(at(x, y - 1)) || pass(at(x, y + 1));
  const horiz = lr && !ud ? true : ud && !lr ? false : (at(x - 1, y) === 'B' || at(x + 1, y) === 'B') && !(at(x, y - 1) === 'B' || at(x, y + 1) === 'B');
  // 局部坐标：u 沿通行方向，v 垂直于通行方向（0..1）
  const R = (u0, v0, u1, v1) => horiz ? [X + u0 * s, Y + v0 * s, (u1 - u0) * s, (v1 - v0) * s] : [X + v0 * s, Y + u0 * s, (v1 - v0) * s, (u1 - u0) * s];
  const fill = (col, u0, v0, u1, v1) => { const r = R(u0, v0, u1, v1); g.fillStyle = col; g.fillRect(r[0], r[1], r[2], r[3]); };
  const sideA = horiz ? at(x, y - 1) : at(x - 1, y), sideB = horiz ? at(x, y + 1) : at(x + 1, y);
  const endA = horiz ? at(x - 1, y) : at(x, y - 1), endB = horiz ? at(x + 1, y) : at(x, y + 1);
  const v0 = sideA === 'B' ? 0 : 0.12, v1 = sideB === 'B' ? 1 : 0.88;
  const u0 = endA === null || water(endA) ? 0.03 : 0, u1 = endB === null || water(endB) ? 0.97 : 1;
  // 投在水面的影子
  if (sideB !== 'B') fill('rgba(10,30,50,0.32)', u0, v1, u1, v1 + 0.08);
  fill('#5a3a22', u0, v0, u1, v1);
  // 木板：垂直于通行方向，一格 5 片
  const np = 5;
  for (let i = 0; i < np; i++) {
    const a = Math.max(u0, i / np), b = Math.min(u1, (i + 1) / np); if (b <= a) continue;
    const c = (i + x * 3 + y * 7) % 3 === 0 ? '#c4905a' : (i % 2 ? '#cc9a62' : '#bd8750');
    fill(c, a + 0.012, v0 + (sideA === 'B' ? 0 : 0.03), b - 0.012, v1 - (sideB === 'B' ? 0 : 0.03));
    fill('rgba(255,236,200,0.28)', a + 0.012, v0 + (sideA === 'B' ? 0 : 0.03), a + 0.04, v1 - (sideB === 'B' ? 0 : 0.03));
    fill('rgba(90,56,30,0.45)', (a + b) / 2, v0 + 0.08, (a + b) / 2 + 0.008, v1 - 0.08);
  }
  // 栏杆梁与桩
  const rail = (va, vb) => { fill('#5e3a20', u0, va, u1, vb); fill('#a46c3c', u0, va, u1, va + (vb - va) * 0.4); };
  if (sideA !== 'B') { rail(v0, v0 + 0.07); for (const pu of [0.06, 0.94]) if (pu > u0 && pu < u1) { fill('#4a2c18', pu - 0.05, v0 - 0.04, pu + 0.05, v0 + 0.09); fill('#8a5a32', pu - 0.05, v0 - 0.04, pu + 0.05, v0 - 0.01); } }
  if (sideB !== 'B') { rail(v1 - 0.07, v1); for (const pu of [0.06, 0.94]) if (pu > u0 && pu < u1) { fill('#4a2c18', pu - 0.05, v1 - 0.09, pu + 0.05, v1 + 0.05); fill('#8a5a32', pu - 0.05, v1 - 0.09, pu + 0.05, v1 - 0.06); } }
  if (u0 > 0) fill('#5e3a20', u0, v0, u0 + 0.04, v1);
  if (u1 < 1) fill('#5e3a20', u1 - 0.04, v0, u1, v1);
}

// ---------- 氛围：淡云、暗角 ----------
function ambient(g, w, h, s, theme, R) {
  const Wd = w * s, Hd = h * s;
  // 云影（极淡）+ 云丝，集中在地图边缘，避免挡住战场中央
  const n = Math.max(2, Math.round(w * h / 70));
  for (let i = 0; i < n; i++) {
    const side = R() < 0.5;
    const cx = side ? (R() < 0.5 ? R() * 1.5 : w - R() * 1.5) * s : R() * Wd, cy = side ? R() * Hd : (R() < 0.5 ? R() * 1.5 : h - R() * 1.5) * s;
    const sz = s * (0.9 + R() * 0.8);
    const col = theme === 'volcanic' ? '#3a2a2a' : theme === 'cave' ? '#1a1410' : '#ffffff';
    const a = theme === 'volcanic' ? 0.14 : theme === 'cave' ? 0.1 : 0.16;
    for (let k = 0; k < 6; k++) blob(g, cx + (R() - 0.5) * sz * 1.8, cy + (R() - 0.5) * sz * 0.5, sz * (0.4 + R() * 0.45), sz * (0.22 + R() * 0.12), col, a);
  }
  // 暗角
  const strong = theme === 'cave' || theme === 'volcanic' ? 0.32 : 0.16;
  const gr = g.createRadialGradient(Wd / 2, Hd / 2, Math.min(Wd, Hd) * 0.38, Wd / 2, Hd / 2, Math.hypot(Wd, Hd) * 0.56);
  gr.addColorStop(0, 'rgba(20,24,40,0)'); gr.addColorStop(1, `rgba(20,24,40,${strong})`);
  g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd);
  if (theme === 'volcanic') { const gl = g.createLinearGradient(0, Hd, 0, Hd * 0.5); gl.addColorStop(0, 'rgba(255,90,30,0.08)'); gl.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gl; g.fillRect(0, 0, Wd, Hd); }
}

// ---------- 宝箱 ----------
function drawChestHD(ctx, x, y, s, opened) {
  const p = s / 32, X = u => x + u * p, Y = u => y + u * p;
  ctx.save();
  blob(ctx, X(16.5), Y(27.5), 12 * p, 3.6 * p, '#1a1008', 0.5);
  const lw = Math.max(1, 1.1 * p);
  ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = lw;
  const rr = (x0, y0, w0, h0, r0) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X(x0), Y(y0), w0 * p, h0 * p, r0 * p) : ctx.rect(X(x0), Y(y0), w0 * p, h0 * p); };
  if (opened) {
    // 掀开的盖子（内侧）
    ctx.fillStyle = '#6a3e1e'; ctx.beginPath(); ctx.moveTo(X(6), Y(15)); ctx.lineTo(X(7.5), Y(6)); ctx.quadraticCurveTo(X(16), Y(3), X(24.5), Y(6)); ctx.lineTo(X(26), Y(15)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a2a14'; ctx.beginPath(); ctx.moveTo(X(8), Y(14)); ctx.lineTo(X(9), Y(8)); ctx.quadraticCurveTo(X(16), Y(6), X(23), Y(8)); ctx.lineTo(X(24), Y(14)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c89a40'; ctx.fillRect(X(9.5), Y(6.2), 2.2 * p, 8 * p); ctx.fillRect(X(20.3), Y(6.2), 2.2 * p, 8 * p);
  }
  // 箱身
  const gb = ctx.createLinearGradient(0, Y(14), 0, Y(27)); gb.addColorStop(0, opened ? '#8a5228' : '#b8743a'); gb.addColorStop(1, opened ? '#5a3216' : '#7c4520');
  rr(6, 14, 20, 13, 2); ctx.fillStyle = gb; ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(60,30,12,0.45)'; ctx.lineWidth = Math.max(1, 0.7 * p); ctx.beginPath(); ctx.moveTo(X(7), Y(20.5)); ctx.lineTo(X(25), Y(20.5)); ctx.stroke();
  if (opened) {
    // 箱口（空）
    ctx.fillStyle = '#2a160a'; rr(7.5, 13, 17, 3.2, 1); ctx.fill();
  } else {
    // 拱形盖
    const gl = ctx.createLinearGradient(0, Y(7), 0, Y(15)); gl.addColorStop(0, '#e09a54'); gl.addColorStop(1, '#a8622c');
    ctx.fillStyle = gl; ctx.strokeStyle = '#3a2210'; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(X(6), Y(15)); ctx.lineTo(X(6), Y(11)); ctx.quadraticCurveTo(X(6), Y(6.5), X(16), Y(6.5)); ctx.quadraticCurveTo(X(26), Y(6.5), X(26), Y(11)); ctx.lineTo(X(26), Y(15)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,180,0.45)'; ctx.beginPath(); ctx.ellipse(X(12), Y(9), 4 * p, 1.3 * p, -0.15, 0, 7); ctx.fill();
  }
  // 金属包边
  const gold = ctx.createLinearGradient(0, Y(6), 0, Y(27)); gold.addColorStop(0, '#fff0a0'); gold.addColorStop(0.5, '#f0c040'); gold.addColorStop(1, '#b07a18');
  ctx.fillStyle = opened ? '#b08a3a' : gold; ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = Math.max(1, 0.6 * p);
  for (const bx of [9.5, 20.5]) { rr(bx, opened ? 14 : 7.2, 2.2, opened ? 13 : 19.8, 0.6); ctx.fill(); ctx.stroke(); }
  rr(6, 14.2, 20, 2, 0.6); ctx.fill(); ctx.stroke();
  if (!opened) {
    // 锁
    rr(14, 13, 4, 5.5, 1); ctx.fillStyle = gold; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2210'; ctx.beginPath(); ctx.arc(X(16), Y(15.2), 0.75 * p, 0, 7); ctx.fill(); ctx.fillRect(X(15.6), Y(15.4), 0.8 * p, 1.8 * p);
    // 闪光
    ctx.fillStyle = 'rgba(255,255,240,0.95)'; ctx.beginPath();
    const sx = X(24.5), sy = Y(8.2), a = 2.2 * p, b = 0.5 * p;
    ctx.moveTo(sx, sy - a); ctx.lineTo(sx + b, sy - b); ctx.lineTo(sx + a, sy); ctx.lineTo(sx + b, sy + b); ctx.lineTo(sx, sy + a); ctx.lineTo(sx - b, sy + b); ctx.lineTo(sx - a, sy); ctx.lineTo(sx - b, sy - b); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

G.buildMapHD = buildMapHD;
G.drawChestHD = drawChestHD;
})(window);
