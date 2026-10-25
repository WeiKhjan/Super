// 超时空英雄传说 · 移动重制版 —— 美术升级：32×32 立体着色单位、仿原作 2.5D 地形
// 以 sprites.js 的 16×16 字符画为底稿：边缘平滑放大 → 1px 描边 → 左上光源三阶着色。
'use strict';

const ART = { size: 32 };

// ---------- 单位 ----------
// Scale2x（EPX）：放大时把斜边处理得圆滑，不会出现锯齿方块
function scale2x(g) {
  const H = g.length, W = g[0].length, out = [];
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '.' : g[y][x]);
  for (let y = 0; y < H * 2; y++) out.push(new Array(W * 2).fill('.'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const P = g[y][x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    let e1 = P, e2 = P, e3 = P, e4 = P;
    if (C === A && C !== D && A !== B) e1 = A;
    if (A === B && A !== C && B !== D) e2 = B;
    if (D === C && D !== B && C !== A) e3 = C;
    if (B === D && B !== A && D !== C) e4 = D;
    out[y * 2][x * 2] = e1; out[y * 2][x * 2 + 1] = e2; out[y * 2 + 1][x * 2] = e3; out[y * 2 + 1][x * 2 + 1] = e4;
  }
  return out;
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade([r, g, b], f) {
  if (f >= 0) return [r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f].map(Math.round);
  return [r * (1 + f), g * (1 + f), b * (1 + f)].map(Math.round);
}

const SPRITE3_CACHE = {};
const _getSprite16 = getSprite;
// 覆盖 sprites.js 的 getSprite：返回 32×32 的着色版本
getSprite = function (key, tier, team, hair, variant) {
  const id = `${key}|${tier}|${team}|${hair || ''}|${variant || ''}`;
  if (SPRITE3_CACHE[id]) return SPRITE3_CACHE[id];
  const def = SPRITE_DEFS[key] || SPRITE_DEFS.swordsman;
  const g = scale2x(def(tier || 0));
  const pal = Object.assign({}, PAL_BASE, TEAM_PAL[team] || TEAM_PAL.enemy, { h: hair || '#3a2a1a' }, VARIANT_PAL[variant] || {});
  const N = 32;
  // 外轮廓的 2px 黑线先去掉（稍后重描 1px）
  const trans = (x, y) => x < 0 || y < 0 || x >= N || y >= N || g[y][x] === '.';
  const outer = new Set();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (g[y][x] !== 'k' && g[y][x] !== 'K') continue;
    if (trans(x - 1, y) || trans(x + 1, y) || trans(x, y - 1) || trans(x, y + 1)) outer.add(y * N + x);
  }
  for (const i of outer) g[(i / N) | 0][i % N] = '.';
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const ctx = c.getContext('2d'), img = ctx.createImageData(N, N), d = img.data;
  const solid = (x, y) => !(x < 0 || y < 0 || x >= N || y >= N || g[y][x] === '.');
  const line = (x, y) => solid(x, y) && (g[y][x] === 'k' || g[y][x] === 'K');
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = g[y][x], i = (y * N + x) * 4;
    if (ch === '.') {
      // 重描 1px 外轮廓
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) { d[i] = 20; d[i + 1] = 12; d[i + 2] = 30; d[i + 3] = 255; }
      continue;
    }
    if (!pal[ch]) continue;
    let rgb = hexRgb(pal[ch]);
    if (ch !== 'k' && ch !== 'K') {
      // 左上光源：靠左上边缘提亮，靠右下边缘压暗，再叠一点由上到下的渐层
      const edgeTL = !solid(x - 1, y) || !solid(x, y - 1) || line(x - 1, y) || line(x, y - 1);
      const edgeBR = !solid(x + 1, y) || !solid(x, y + 1) || line(x + 1, y) || line(x, y + 1);
      let f = 0.1 - y / N * 0.22;
      if (edgeTL && !edgeBR) f += 0.28;
      else if (edgeBR && !edgeTL) f -= 0.3;
      // 内部轻微抖动纹理
      if (((x + y) & 3) === 0 && !edgeTL && !edgeBR) f -= 0.05;
      rgb = shade(rgb, f);
    }
    d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  SPRITE3_CACHE[id] = c;
  return c;
};

// ---------- 地形 ----------
// 原作风格：偏暗的大地色、细碎纹理；山、城墙、森林、石柱等「立体物件」高出地面，向上一格突出
const TILE3_CACHE = {};
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function noiseFill(g, w, h, base, cols, n, R, size) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; const s = size || 1 + ((R() * 2) | 0); g.fillRect((R() * w) | 0, (R() * h) | 0, s, s); }
}
const GROUND = {
  grass: ['#4d7a2c', ['#5f8f36', '#3f6a24', '#6a9a3c', '#386020', '#7aa648']],
  road: ['#a8834e', ['#b8935a', '#98733e', '#8a6634', '#c8a46a']],
  sand: ['#c8a868', ['#d8b878', '#b89858', '#e0c488', '#a88848']],
  snow: ['#dfe6f0', ['#ffffff', '#cdd6e4', '#eef2f8', '#bcc6d8']],
  dirt: ['#5a4a3a', ['#4a3a2c', '#6a5a48', '#3a2c20', '#7a6a54']],
  dark: ['#33243f', ['#3f2c4f', '#28193a', '#4a3060', '#22152e']],
  stone: ['#7a7a84', ['#8a8a94', '#6a6a74', '#5a5a64', '#9a9aa4']],
};
function groundTile(g, kind, R) { const [b, cols] = GROUND[kind]; noiseFill(g, 32, 32, b, cols, 150, R); }

function getTile(t, x, y, frame) {
  const variant = (x * 7 + y * 13) % 4;
  const id = `${t}|${variant}|${frame}`;
  if (TILE3_CACHE[id]) return TILE3_CACHE[id];
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const g = c.getContext('2d');
  const R = rng(variant * 977 + t.charCodeAt(0) * 131 + 7);
  const grassTufts = () => { for (let i = 0; i < 5; i++) { const gx = (R() * 28) | 0, gy = (R() * 28) | 0; g.fillStyle = '#7aa648'; g.fillRect(gx, gy, 1, 2); g.fillRect(gx + 2, gy + 1, 1, 2); g.fillStyle = '#2f5018'; g.fillRect(gx + 1, gy + 2, 1, 1); } };
  switch (t) {
    case 'M': groundTile(g, 'dirt', R); break;
    case 'G': case 'F': case 'H':
      groundTile(g, 'grass', R); grassTufts();
      if (t === 'G' && variant === 1) { g.fillStyle = '#e8d84a'; g.fillRect(8, 9, 2, 2); g.fillStyle = '#f0f0f0'; g.fillRect(22, 21, 2, 2); }
      break;
    case 'R': groundTile(g, 'road', R); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, 32, 2); break;
    case 'S': groundTile(g, 'sand', R); g.strokeStyle = 'rgba(150,110,60,0.35)'; g.beginPath(); g.moveTo(0, 10 + variant * 3); g.quadraticCurveTo(16, 4 + variant * 3, 32, 12 + variant * 2); g.stroke(); break;
    case 'N': groundTile(g, 'snow', R); g.fillStyle = 'rgba(150,170,210,0.35)'; g.beginPath(); g.ellipse(10 + variant * 4, 20, 9, 3, 0, 0, 7); g.fill(); break;
    case 'P': groundTile(g, 'grass', R); g.fillStyle = '#2e5a6a'; g.beginPath(); g.ellipse(9, 10, 7, 3, 0, 0, 7); g.ellipse(22, 22, 8, 3, 0, 0, 7); g.fill(); g.fillStyle = '#6aa048'; for (let i = 0; i < 6; i++) g.fillRect((R() * 30) | 0, (R() * 28) | 0, 1, 4); break;
    case 'T': case 'W': case 'B': {
      const deep = t === 'W';
      noiseFill(g, 32, 32, deep ? '#1f4a8a' : '#3f7ab8', deep ? ['#1a4080', '#25559a', '#163a74'] : ['#4a88c4', '#356aa8', '#5a98d0'], 90, R);
      g.fillStyle = deep ? '#7ab0e8' : '#bfe0ff';
      for (let i = 0; i < 3; i++) { const yy = 5 + i * 10, xx = (i * 9 + frame * 5 + variant * 3) % 26; g.fillRect(xx, yy, 5, 1); g.fillRect(xx + 1, yy - 1, 3, 1); }
      if (t === 'B') {
        g.fillStyle = '#1a1020'; g.fillRect(0, 3, 32, 26);
        for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#8a5a2a' : '#9a6a36'; g.fillRect(0, 4 + i * 5, 32, 4); g.fillStyle = '#b07a42'; g.fillRect(0, 4 + i * 5, 32, 1); }
        g.fillStyle = '#4a2a10'; g.fillRect(0, 3, 32, 1); g.fillRect(0, 28, 32, 1);
      }
      break;
    }
    case 'L': {
      noiseFill(g, 32, 32, '#c83410', ['#e85a18', '#a82008', '#f08a28', '#ffb030'], 110, R);
      // 冷却的暗色岩壳与发亮的裂缝
      g.fillStyle = '#4a1a10';
      for (let i = 0; i < 4; i++) { const cx = (R() * 26) | 0, cy = (R() * 26) | 0; g.beginPath(); g.ellipse(cx + 3, cy + 3, 3 + R() * 3, 2 + R() * 2, R() * 3, 0, 7); g.fill(); }
      g.fillStyle = frame ? '#ffe070' : '#ffc040'; for (let i = 0; i < 3; i++) g.fillRect((i * 11 + frame * 6) % 28, 4 + i * 10, 4, 1);
      break;
    }
    case 'V': case 'C': case 'K': case 'A': case 'X': case 'Y': {
      groundTile(g, t === 'V' ? 'grass' : 'stone', R);
      if (t !== 'V') { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 32; i += 16) { g.fillRect(0, i, 32, 1); g.fillRect((i + variant * 8) % 32, 0, 1, 32); } }
      if (t === 'K') { g.fillStyle = '#8a1424'; g.fillRect(3, 0, 26, 32); g.fillStyle = '#b02234'; g.fillRect(5, 0, 22, 32); g.fillStyle = '#f0c040'; g.fillRect(3, 0, 2, 32); g.fillRect(27, 0, 2, 32); }
      if (t === 'A') { g.fillStyle = '#c8a040'; g.fillRect(2, 2, 28, 28); g.fillStyle = '#f4dc80'; g.fillRect(4, 4, 24, 24); g.fillStyle = '#fff6c8'; g.fillRect(14, 6, 4, 20); g.fillRect(8, 12, 16, 4); }
      if (t === 'V') grassTufts();
      break;
    }
    case 'O': groundTile(g, 'dirt', R); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 32, 3); break;
    case 'D': groundTile(g, 'dark', R); if (variant === 2) { g.strokeStyle = '#8a3ad0'; g.beginPath(); g.moveTo(6, 12); g.lineTo(13, 15); g.lineTo(11, 22); g.stroke(); } break;
    default: groundTile(g, 'grass', R);
  }
  TILE3_CACHE[id] = c;
  return c;
}

// 立体物件：返回 {c: 32×48 画布, dy: -16}（向上突出一格的一半），没有则 null
const PROP3_CACHE = {};
function getProp(t, x, y, frame) {
  if (!'FMHXYV'.includes(t)) return null;
  const variant = (x * 5 + y * 11) % 3;
  const id = `${t}|${variant}`;
  if (PROP3_CACHE[id] !== undefined) return PROP3_CACHE[id];
  const c = document.createElement('canvas'); c.width = 32; c.height = 48;
  const g = c.getContext('2d');
  const R = rng(variant * 313 + t.charCodeAt(0) * 17);
  const shadow = (cx, cy, rx, ry) => { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.fill(); };
  switch (t) {
    case 'F': { // 树丛：2–3 棵圆冠树
      const trees = variant === 0 ? [[10, 30, 9], [23, 36, 9]] : variant === 1 ? [[16, 28, 11], [7, 40, 7], [25, 41, 7]] : [[9, 33, 9], [22, 29, 9], [17, 42, 7]];
      for (const [tx, ty, r] of trees) {
        shadow(tx + 2, ty + r - 1, r, r * 0.35);
        g.fillStyle = '#3a2412'; g.fillRect(tx - 1, ty + r * 0.4, 3, r * 0.7);
        g.fillStyle = '#0e1e0a'; g.beginPath(); g.arc(tx, ty, r + 1, 0, 7); g.fill();
        g.fillStyle = '#1f4214'; g.beginPath(); g.arc(tx, ty, r, 0, 7); g.fill();
        g.fillStyle = '#2f6420'; g.beginPath(); g.arc(tx - r * 0.2, ty - r * 0.2, r * 0.75, 0, 7); g.fill();
        g.fillStyle = '#4a8a30'; g.beginPath(); g.arc(tx - r * 0.38, ty - r * 0.4, r * 0.38, 0, 7); g.fill();
        g.fillStyle = '#7ab84a'; g.fillRect(tx - r * 0.5, ty - r * 0.55, 2, 2);
      }
      break;
    }
    case 'M': { // 岩山：块状岩体，受光面 / 侧面 / 裂缝 / 雪顶
      shadow(16, 45, 16, 3);
      const top = 6 + variant * 3;
      const pts = [[0, 47], [2, 30], [7, top + 6], [14, top], [20, top + 3], [26, top + 10], [31, 28], [32, 47]];
      g.fillStyle = '#140e0c'; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.fill();
      const body = pts.map(([px, py]) => [Math.min(31, Math.max(1, px)), py + 1]);
      g.fillStyle = '#6e5e4a'; g.beginPath(); body.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.fill();
      // 受光面（左）与阴影面（右）
      g.fillStyle = '#a08a6a'; g.beginPath(); g.moveTo(2, 46); g.lineTo(3, 31); g.lineTo(8, top + 7); g.lineTo(14, top + 1); g.lineTo(16, 46); g.fill();
      g.fillStyle = '#c0aa84'; g.beginPath(); g.moveTo(5, 40); g.lineTo(8, top + 9); g.lineTo(13, top + 3); g.lineTo(10, 40); g.fill();
      g.fillStyle = '#4a3e30'; g.beginPath(); g.moveTo(20, top + 4); g.lineTo(26, top + 11); g.lineTo(30, 29); g.lineTo(31, 46); g.lineTo(19, 46); g.fill();
      g.strokeStyle = '#2a2018'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(14, top + 3); g.lineTo(16, 20); g.lineTo(13, 30); g.moveTo(22, 18); g.lineTo(24, 30); g.lineTo(21, 40); g.stroke();
      for (let i = 0; i < 14; i++) { g.fillStyle = R() > 0.5 ? '#5a4c3a' : '#b49c78'; g.fillRect(3 + R() * 26, top + 12 + R() * 28, 2, 1); }
      g.fillStyle = '#f2f6fa'; g.beginPath(); g.moveTo(14, top); g.lineTo(8, top + 7); g.lineTo(12, top + 6); g.lineTo(14, top + 9); g.lineTo(17, top + 6); g.lineTo(20, top + 4); g.fill();
      g.fillStyle = '#c8d4e4'; g.beginPath(); g.moveTo(17, top + 6); g.lineTo(20, top + 4); g.lineTo(19, top + 7); g.fill();
      break;
    }
    case 'H': { // 丘陵：两个圆丘
      shadow(16, 44, 15, 3);
      for (const [hx, hy, r] of [[11, 40, 10], [22, 42, 9]]) {
        g.fillStyle = '#1e3410'; g.beginPath(); g.ellipse(hx, hy, r + 1, r * 0.75 + 1, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#4a7a28'; g.beginPath(); g.ellipse(hx, hy, r, r * 0.75, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#6a9a3a'; g.beginPath(); g.ellipse(hx - 2, hy - 1, r * 0.6, r * 0.45, 0, Math.PI, 0); g.fill();
      }
      break;
    }
    case 'X': { // 城墙：顶面 + 正面砖块
      g.fillStyle = '#1a1420'; g.fillRect(0, 14, 32, 34);
      g.fillStyle = '#8a8494'; g.fillRect(0, 15, 32, 9); // 顶面
      g.fillStyle = '#a8a2b0'; g.fillRect(0, 15, 32, 2);
      g.fillStyle = '#4a4452'; g.fillRect(0, 24, 32, 24); // 正面
      g.fillStyle = '#3a3442';
      for (let yy = 24; yy < 48; yy += 6) { g.fillRect(0, yy, 32, 1); for (let xx = (yy / 6) % 2 ? 0 : 8; xx < 32; xx += 16) g.fillRect(xx, yy, 1, 6); }
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 25, 32, 2);
      break;
    }
    case 'Y': { // 石柱
      shadow(18, 45, 9, 3);
      g.fillStyle = '#1a1420'; g.fillRect(8, 6, 16, 41);
      g.fillStyle = '#d8d4dc'; g.fillRect(9, 7, 14, 4); g.fillStyle = '#b8b4bc'; g.fillRect(10, 11, 12, 33);
      g.fillStyle = '#e8e4ec'; g.fillRect(11, 11, 3, 33); g.fillStyle = '#8a8690'; g.fillRect(19, 11, 3, 33);
      g.fillStyle = '#d8d4dc'; g.fillRect(9, 43, 14, 3);
      break;
    }
    case 'V': { // 村屋：屋顶 + 墙 + 门窗
      shadow(17, 45, 14, 3);
      g.fillStyle = '#1a1020'; g.fillRect(5, 24, 23, 22);
      g.fillStyle = '#d8c8a0'; g.fillRect(6, 25, 21, 20); g.fillStyle = '#b8a880'; g.fillRect(20, 25, 7, 20);
      g.fillStyle = '#1a1020'; g.beginPath(); g.moveTo(1, 27); g.lineTo(16, 9); g.lineTo(31, 27); g.fill();
      g.fillStyle = variant === 1 ? '#3a6aa8' : '#b0301e'; g.beginPath(); g.moveTo(3, 26); g.lineTo(16, 11); g.lineTo(29, 26); g.fill();
      g.fillStyle = variant === 1 ? '#5a8ac8' : '#d8503a'; g.beginPath(); g.moveTo(3, 26); g.lineTo(16, 11); g.lineTo(16, 26); g.fill();
      g.fillStyle = '#4a2a14'; g.fillRect(14, 34, 5, 11); g.fillStyle = '#7ad8ff'; g.fillRect(8, 30, 4, 4); g.fillRect(22, 30, 3, 4);
      break;
    }
  }
  PROP3_CACHE[id] = { c, dy: -16 };
  return PROP3_CACHE[id];
}

function drawChest(ctx, x, y, s, opened) {
  const p = s / 32;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 16 * p, y + 27 * p, 10 * p, 3 * p, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 6 * p, y + 11 * p, 20 * p, 16 * p);
  ctx.fillStyle = opened ? '#5a3a1a' : '#9a5a20'; ctx.fillRect(x + 7 * p, y + 12 * p, 18 * p, 14 * p);
  ctx.fillStyle = opened ? '#3a2410' : '#c07a30'; ctx.fillRect(x + 7 * p, y + 12 * p, 18 * p, 5 * p);
  ctx.fillStyle = opened ? '#2a1a10' : '#f4c542'; ctx.fillRect(x + 7 * p, y + 17 * p, 18 * p, 2 * p); ctx.fillRect(x + 14 * p, y + 16 * p, 4 * p, 5 * p);
  if (!opened) { ctx.fillStyle = '#fff6c8'; ctx.fillRect(x + 8 * p, y + 12 * p, 4 * p, 1 * p); }
}
