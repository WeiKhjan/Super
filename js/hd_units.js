// 高清画风：单位与立绘（平滑高清重绘）
// 以 sprites.js 的 16×16 字符画 / portraits.js 的 64×72 立绘为底稿，自动「去像素化」成平滑的 Q 版插画：
//   EPX 放大 → 按色块做高斯加权的标签插值（边缘变成平滑曲线）→ 边界超采样抗锯齿
//   → 左上光源的柔和赛璐璐明暗 + 轮廓光 → 色块间细描线 → 外描边；人形单位叠加矢量动画大眼。
// 导出：getSpriteHD(key, tier, team, hair, variant, gear) → 128×128 画布（取景与 getSprite 相同）
//       hdPortrait(canvas, opts) → ×4 高清立绘：getPortrait 的立绘交给 portraits.js 以 5 倍解析度重画；其他来源平滑放大（opts.bg === false 时背景透明）
'use strict';

(function (G) {
const HD = 128;
let PSIGMA = 0.7, SIGMA = 0.95, SIGMA0 = 1.35, SIGMA_M = 0.75;             // 输出边长（= getSprite 的 32 × 4）
const OUTLINE = '#2a1c30';  // 外描边色（深紫褐）
const OUT_RGB = [42, 28, 48];

// ---------- 颜色工具 ----------
function hx(h) {
  if (h[0] !== '#') return [128, 128, 128];
  if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lum = c => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) / 255;
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// 柔和粉彩化：微提亮、轻微降低过饱和
function pastel(c, mild) {
  const m = (c[0] + c[1] + c[2]) / 3, L = lum(c);
  const s = mild ? 0.97 : L < 0.2 ? 0.98 : 0.93;
  let r = m + (c[0] - m) * s, g = m + (c[1] - m) * s, b = m + (c[2] - m) * s;
  const k = mild ? 0.025 : L < 0.15 ? 0.02 : 0.055;
  return [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k];
}
// 阴影色：压暗并偏冷紫（手绘感），亮部偏暖
const shadowOf = c => [c[0] * 0.66 + 10, c[1] * 0.64 + 6, c[2] * 0.72 + 22];
const lightOf = c => mixc(c, [255, 250, 236], 0.32);
function rgbStr(c) { return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; }

// ---------- EPX（Scale2x）：通用整数标签版 ----------
function epx(src, w, h) {
  const W = w * 2, out = new Int32Array(W * h * 2);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : src[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = src[y * w + x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    let e1 = P, e2 = P, e3 = P, e4 = P;
    if (C === A && C !== D && A !== B && A >= 0) e1 = A;
    if (A === B && A !== C && B !== D && B >= 0) e2 = B;
    if (D === C && D !== B && C !== A && C >= 0) e3 = C;
    if (B === D && B !== A && D !== C && D >= 0) e4 = D;
    const o = y * 2 * W + x * 2;
    out[o] = e1; out[o + 1] = e2; out[o + W] = e3; out[o + W + 1] = e4;
  }
  return out;
}

// 每个像素按其所在同色连通块（4 连通）的大小给权重
function compWeights(lab, w, h) {
  const n = w * h, seen = new Int32Array(n).fill(-1), pw = new Float32Array(n), st = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    if (seen[i] >= 0) continue;
    const L = lab[i]; let sp = 0, cnt = 0; st[sp++] = i; seen[i] = i;
    const members = [];
    while (sp) {
      const j = st[--sp]; members.push(j); cnt++;
      const x = j % w, y = (j / w) | 0;
      if (x > 0 && seen[j - 1] < 0 && lab[j - 1] === L) { seen[j - 1] = i; st[sp++] = j - 1; }
      if (x < w - 1 && seen[j + 1] < 0 && lab[j + 1] === L) { seen[j + 1] = i; st[sp++] = j + 1; }
      if (y > 0 && seen[j - w] < 0 && lab[j - w] === L) { seen[j - w] = i; st[sp++] = j - w; }
      if (y < h - 1 && seen[j + w] < 0 && lab[j + w] === L) { seen[j + w] = i; st[sp++] = j + w; }
    }
    const wt = L === 0 ? 1 : cnt <= 4 ? 1.75 : cnt <= 8 ? 1.5 : cnt <= 16 ? 1.3 : cnt <= 32 ? 1.12 : 1;
    for (const j of members) pw[j] = wt;
  }
  return pw;
}
// 大半径平滑：每个标签一张模糊指示场（画布外视为透明 0）。透明标签用更大的 σ → 外轮廓更圆润。
// 返回 { F, cand, present }：F = nL 张 w×h 场；cand = 每格最多 MAXC 个候选标签
const MAXC = 6;
function blurFields(lab, w, h, nL, sigma, sigma0, pw, clampEdge) {
  const n = w * h, F = new Float32Array(nL * n), tmp = new Float32Array(n), mxs = new Float32Array(n);
  const present = new Uint8Array(nL), bx0 = new Int32Array(nL).fill(w), by0 = new Int32Array(nL).fill(h), bx1 = new Int32Array(nL).fill(-1), by1 = new Int32Array(nL).fill(-1);
  // 每个标签逐行 / 逐列的范围：模糊只在标签附近做
  const rmin = new Int16Array(nL * h).fill(w), rmax = new Int16Array(nL * h).fill(-1), cmin = new Int16Array(nL * w).fill(h), cmax = new Int16Array(nL * w).fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const L = lab[y * w + x]; present[L] = 1;
    if (x < bx0[L]) bx0[L] = x; if (x > bx1[L]) bx1[L] = x; if (y < by0[L]) by0[L] = y; if (y > by1[L]) by1[L] = y;
    const r = L * h + y, c = L * w + x;
    if (x < rmin[r]) rmin[r] = x; if (x > rmax[r]) rmax[r] = x; if (y < cmin[c]) cmin[c] = y; if (y > cmax[c]) cmax[c] = y;
  }
  const kern = s => { const R = Math.ceil(s * 2.5), K = new Float32Array(R * 2 + 1); let t = 0; for (let i = -R; i <= R; i++) t += K[i + R] = Math.exp(-i * i / (2 * s * s)); for (let i = 0; i < K.length; i++) K[i] /= t; return K; };
  const K1 = kern(sigma), K0 = kern(sigma0);
  for (let L = 0; L < nL; L++) {
    if (!present[L]) continue;
    const K = L === 0 ? K0 : K1, R = (K.length - 1) >> 1, o = L * n;
    if (L === 0 && !clampEdge) { // 透明标签：画布外也算透明，整张计算
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -R; k <= R; k++) { const xx = x + k; if (xx < 0 || xx >= w || lab[y * w + xx] === 0) s += K[k + R] * (xx < 0 || xx >= w ? 1 : pw[y * w + xx]); }
        tmp[y * w + x] = s;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let s = 0;
        for (let k = -R; k <= R; k++) { const yy = y + k; s += K[k + R] * (yy < 0 || yy >= h ? 1 : tmp[yy * w + x]); }
        F[o + y * w + x] = s; if (s > mxs[y * w + x]) mxs[y * w + x] = s;
      }
      tmp.fill(0);
      continue;
    }
    for (let y = by0[L]; y <= by1[L]; y++) {
      const r = L * h + y; if (rmax[r] < 0) continue;
      const xa = Math.max(0, rmin[r] - R), xb = Math.min(w - 1, rmax[r] + R);
      for (let x = xa; x <= xb; x++) {
        let s = 0;
        for (let k = -R; k <= R; k++) { let xx = x + k; if (xx < 0 || xx >= w) { if (!clampEdge) continue; xx = xx < 0 ? 0 : w - 1; } if (lab[y * w + xx] === L) s += K[k + R] * pw[y * w + xx]; }
        tmp[y * w + x] = s;
      }
    }
    const xa = Math.max(0, bx0[L] - R), xb = Math.min(w - 1, bx1[L] + R);
    for (let x = xa; x <= xb; x++) {
      let y0 = h, y1 = -1;
      for (let xx = Math.max(0, x - R), xe = Math.min(w - 1, x + R); xx <= xe; xx++) { const c = L * w + xx; if (cmax[c] >= 0) { if (cmin[c] < y0) y0 = cmin[c]; if (cmax[c] > y1) y1 = cmax[c]; } }
      if (y1 < 0) continue;
      for (let y = Math.max(0, y0 - R), ye = Math.min(h - 1, y1 + R); y <= ye; y++) {
        let s = 0;
        for (let k = -R; k <= R; k++) { let yy = y + k; if (yy < 0 || yy >= h) { if (!clampEdge) continue; yy = yy < 0 ? 0 : h - 1; } if (yy >= y0 && yy <= y1) s += K[k + R] * tmp[yy * w + x]; }
        F[o + y * w + x] = s; if (s > mxs[y * w + x]) mxs[y * w + x] = s;
      }
      for (let y = y0; y <= y1; y++) tmp[y * w + x] = 0;
    }
  }
  // 候选：在本格 3×3 邻域任一格中「够强」（≥ 该格最大值 − 0.45）的标签 —— 双线性只用到这些格，才不会被裁成方块
  const cand = new Int16Array(n * MAXC).fill(-1);
  const strongAt = (i, L) => { const f = F[L * n + i]; return f > 0.03 && f >= mxs[i] - 0.45; };
  if (nL <= 31) {
    const sm = new Int32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (let L = 0; L < nL; L++) if (present[L] && strongAt(i, L)) m |= 1 << L; sm[i] = m; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = 0;
      for (let yy = y > 0 ? y - 1 : 0, ye = y < h - 1 ? y + 1 : y; yy <= ye; yy++) for (let xx = x > 0 ? x - 1 : 0, xe = x < w - 1 ? x + 1 : x; xx <= xe; xx++) m |= sm[yy * w + xx];
      const i = y * w + x; let c = 0;
      for (let L = 0; m && c < MAXC; L++, m >>>= 1) if (m & 1) cand[i * MAXC + c++] = L;
      if (!c) cand[i * MAXC] = lab[i];
    }
  } else { // 标签很多（立绘）：逐标签在包围盒内膨胀
    const cnt = new Uint8Array(n), st = new Uint8Array(n);
    for (let L = 0; L < nL; L++) {
      if (!present[L]) continue;
      const R = L === 0 ? (K0.length - 1) >> 1 : (K1.length - 1) >> 1, full = L === 0;
      const xa = full ? 0 : Math.max(0, bx0[L] - R - 1), xb = full ? w - 1 : Math.min(w - 1, bx1[L] + R + 1);
      const ya = full ? 0 : Math.max(0, by0[L] - R - 1), yb = full ? h - 1 : Math.min(h - 1, by1[L] + R + 1);
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) st[y * w + x] = strongAt(y * w + x, L) ? 1 : 0;
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const i = y * w + x; if (cnt[i] >= MAXC) continue;
        let ok = 0;
        for (let yy = y > ya ? y - 1 : ya, ye = y < yb ? y + 1 : yb; yy <= ye && !ok; yy++) for (let xx = x > xa ? x - 1 : xa, xe = x < xb ? x + 1 : xb; xx <= xe; xx++) if (st[yy * w + xx]) { ok = 1; break; }
        if (ok) cand[i * MAXC + cnt[i]++] = L;
      }
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) st[y * w + x] = 0;
    }
    for (let i = 0; i < n; i++) if (!cnt[i]) cand[i * MAXC] = lab[i];
  }
  return { F, cand, present };
}
// 双线性取样（arr 的 off 起始的 w×h 场；坐标钳制在范围内）
function bil(arr, off, w, h, u, v) {
  if (u < 0) u = 0; else if (u > w - 1.001) u = w - 1.001;
  if (v < 0) v = 0; else if (v > h - 1.001) v = h - 1.001;
  const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i = off + y0 * w + x0;
  return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + w] * (1 - fx) + arr[i + w + 1] * fx) * fy;
}
const sstep = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };
// ---------- 单位 ----------
// 同组字母视为同一材质（阴影不在组内的明暗两色之间重复叠加，也不在其间描线）
const GROUP = {};
['sS', 'pq', 'mnijv', 'bB', 'fF', 'yY', 'dD', 'GH', 'cC', 'rRe', 'ga', '1234', '5678', 'kK', 'tT', 'wuO'].forEach((s, gi) => { for (const ch of s) GROUP[ch] = gi + 1; });
let GROUP_NEXT = 40;
const METALISH = new Set('mnijv1234567gaLc'.split(''));

// 在 16×16 网格里找 Q 版大眼（W 高光在左上 + 3 个同色暗像素的 2×2 块），两只同一行 → 人脸
function findFace(g) {
  const eyes = [];
  for (let y = 2; y < 12; y++) for (let x = 1; x < 14; x++) {
    if (g[y][x] !== 'W') continue;
    const e = g[y][x + 1];
    if (e === 'W' || e === '.' || g[y + 1][x] !== e || g[y + 1][x + 1] !== e) continue;
    eyes.push([x, y, e]);
  }
  for (let a = 0; a < eyes.length; a++) for (let b = a + 1; b < eyes.length; b++) {
    const [x1, y1, e1] = eyes[a], [x2, y2] = eyes[b];
    if (y1 !== y2 || x2 - x1 < 3 || x2 - x1 > 5) continue;
    // 两眼之间的脸色（第二行中间）
    const skin = g[y1 + 1][x1 + 2];
    if (!skin || skin === '.' || skin === 'k' || skin === e1) continue;
    return { lx: x1, rx: x2, y: y1, eye: e1, skin };
  }
  return null;
}

// 矢量动画眼：cx,cy 为眼中心（输出像素），s = 每个 16 格像素的输出像素数
function drawEye(ctx, cx, cy, s, iris, flip) {
  const w = s * 0.86, h = s * 1.12;
  ctx.save();
  ctx.translate(cx, cy);
  // 眼白（下半）
  ctx.fillStyle = '#fbfaff';
  ctx.beginPath(); ctx.ellipse(0, h * 0.08, w * 0.98, h * 0.98, 0, 0, Math.PI * 2); ctx.fill();
  // 虹膜：上深下浅
  const ir = hx(iris), dark = rgbStr(mixc(ir, [20, 12, 30], 0.62)), light = rgbStr(mixc(ir, [255, 255, 255], 0.28));
  const gr = ctx.createLinearGradient(0, -h, 0, h);
  gr.addColorStop(0, dark); gr.addColorStop(0.55, rgbStr(ir)); gr.addColorStop(1, light);
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.ellipse(0, h * 0.12, w * 0.8, h * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  // 瞳孔
  ctx.fillStyle = 'rgba(20,10,30,0.85)';
  ctx.beginPath(); ctx.ellipse(0, h * 0.02, w * 0.38, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  // 上眼线（粗）+ 眼尾
  ctx.strokeStyle = OUTLINE; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.34;
  ctx.beginPath(); ctx.ellipse(0, h * 0.12, w * 1.0, h * 0.98, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.lineWidth = s * 0.22;
  ctx.beginPath(); const ex = flip ? -w * 1.02 : w * 1.02; ctx.moveTo(ex * 0.9, -h * 0.42); ctx.lineTo(ex * 1.12, -h * 0.66); ctx.stroke();
  // 高光：左上大、右下小
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(-w * 0.3, -h * 0.28, w * 0.36, h * 0.3, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.9;
  ctx.beginPath(); ctx.arc(w * 0.34, h * 0.5, s * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawFace(ctx, f, S, skinRGB, irisHex, blush) {
  const cy = (f.y + 1) * S, lx = (f.lx + 1) * S, rx = (f.rx + 1) * S;
  // 腮红
  if (blush) {
    for (const bx of [lx - S * 1.15, rx + S * 1.15]) {
      const gr = ctx.createRadialGradient(bx, cy + S * 1.25, 0, bx, cy + S * 1.25, S * 0.95);
      gr.addColorStop(0, 'rgba(255,120,140,0.55)'); gr.addColorStop(1, 'rgba(255,120,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(bx - S, cy, S * 2, S * 2.5);
    }
  }
  drawEye(ctx, lx, cy + S * 0.05, S, irisHex, true);
  drawEye(ctx, rx, cy + S * 0.05, S, irisHex, false);
  // 小嘴
  const mx = (lx + rx) / 2, my = cy + S * 1.45;
  ctx.strokeStyle = rgbStr(mixc(shadowOf(skinRGB), [120, 30, 40], 0.55)); ctx.lineWidth = S * 0.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx - S * 0.32, my - S * 0.05); ctx.quadraticCurveTo(mx, my + S * 0.22, mx + S * 0.32, my - S * 0.05); ctx.stroke();
}
function irisFor(hair, eyeHex, eyeCh) {
  if (eyeCh !== 'k' && eyeCh !== 'K' && eyeHex) return eyeHex;
  const h = hx(hair || '#3a2a1a');
  let c = lum(h) < 0.22 ? mixc(h, [70, 110, 190], 0.55) : mixc(h, [40, 30, 60], 0.25);
  if (lum(c) > 0.6) c = mixc(c, [40, 60, 120], 0.4);
  return '#' + c.map(v => Math.max(0, Math.min(255, v | 0)).toString(16).padStart(2, '0')).join('');
}


// ---------- 单位渲染的热循环（顶层函数，跨精灵复用优化后的机器码） ----------
const SN = 32, SNN = SN * SN, S4 = HD / SN;
let _F, _cand, _grp, _GF, _base, _dk, _lt, _ln, _metal, _isLine, _nL, _W = SN, _H = SN, _WH = SNN;
let _TM, _HM, _SH1, _RIM, _hairL = -1, _hcx = 64, _hcy = 60, _hr = 40;
let L2_ = -1, V2_ = -1, S1 = 0, S2 = -1, R_ = 0, G_ = 0, B_ = 0, A_ = 0;
const SC = new Float32Array(MAXC);
// 返回 (u,v) 处得分最高的标签；wantS2 时同时求不同材质组的次高分（描线）
function pickL(u, v, wantS2) {
  const W = _W, H = _H;
  if (u < 0) u = 0; else if (u > W - 1.001) u = W - 1.001;
  if (v < 0) v = 0; else if (v > H - 1.001) v = H - 1.001;
  const cb = (((v + 0.5) | 0) * W + ((u + 0.5) | 0)) * MAXC, cand = _cand, F = _F;
  if (cand[cb + 1] < 0) { S1 = 1; S2 = -1; L2_ = -1; V2_ = -1; return cand[cb]; }
  const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i00 = y0 * W + x0, WH = _WH;
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, d = fx * fy;
  let best = 0, bv = -1, nc = 0, sec = -1, sv = -1;
  for (; nc < MAXC; nc++) {
    const L = cand[cb + nc]; if (L < 0) break;
    const o = L * WH + i00, s = F[o] * a + F[o + 1] * b + F[o + W] * c + F[o + W + 1] * d;
    SC[nc] = s;
    if (s > bv) { sec = best; sv = bv; bv = s; best = L; } else if (s > sv) { sv = s; sec = L; }
  }
  S1 = bv; S2 = -1; L2_ = sec; V2_ = sv;
  if (wantS2) { const g = _grp[best]; for (let k = 0; k < nc; k++) { const L = cand[cb + k]; if (L && _grp[L] !== g && SC[k] > S2) S2 = SC[k]; } }
  return best;
}
const CW = HD / 2, CL = new Int32Array(CW * CW), CU = new Uint8Array(CW * CW);
const CR = new Float32Array(CW * CW), CG = new Float32Array(CW * CW), CB = new Float32Array(CW * CW);
function labelPass(M, LN, noLine, M2, COV) {
  // 先在隔一像素的粗网格上取样；3×3 粗邻域一致（CU）的像素直接沿用（远离色块边界，也不会有描线）
  for (let j = 0; j < CW; j++) { const v = (j * 2 + 0.5) / S4 - 0.5; for (let i = 0; i < CW; i++) CL[j * CW + i] = pickL((i * 2 + 0.5) / S4 - 0.5, v, false); }
  for (let j = 0; j < CW; j++) for (let i = 0; i < CW; i++) {
    const c0 = CL[j * CW + i]; let same = 1;
    for (let jj = j > 0 ? j - 1 : 0, je = j < CW - 1 ? j + 1 : j; jj <= je && same; jj++) for (let ii = i > 0 ? i - 1 : 0, ie = i < CW - 1 ? i + 1 : i; ii <= ie; ii++) if (CL[jj * CW + ii] !== c0) { same = 0; break; }
    CU[j * CW + i] = same;
  }
  for (let Y = 0; Y < HD; Y++) { const v = (Y + 0.5) / S4 - 0.5, cj = Y >> 1; for (let X = 0; X < HD; X++) {
    const ci = X >> 1, i = Y * HD + X;
    if (CU[cj * CW + ci]) { M[i] = CL[cj * CW + ci]; LN[i] = 0; COV[i] = 1; continue; }
    const L = pickL((X + 0.5) / S4 - 0.5, v, true);
    M[i] = L; LN[i] = 0;
    // 解析抗锯齿：最高分与次高分之差 ÷ 场的大致斜率（每输出像素约 0.2）≈ 到边界的距离
    if (L2_ >= 0) { M2[i] = L2_; const cv = 0.5 + (S1 - V2_) / 0.2; COV[i] = cv > 1 ? 1 : cv; } else COV[i] = 1;
    if (L && !noLine[L] && S2 > 0) LN[i] = 1 - sstep(0.02, 0.16, S1 - S2);
  } }
}
// 着色：左上光源的柔和赛璐璐、亮边、右侧轮廓光、材质组间描线；透明处给外描边
function shadeL(L, u, v, Y, line) {
  const F = _F, GF = _GF;
  if (L === 0) { // 外描边：平滑剪影场向外扩约 3px
    const s = 1 - bil(F, 0, SN, SN, u, v);
    A_ = sstep(0.24, 0.36, s); R_ = OUT_RGB[0]; G_ = OUT_RGB[1]; B_ = OUT_RGB[2]; return;
  }
  A_ = 1;
  if (_isLine[L]) { R_ = OUT_RGB[0]; G_ = OUT_RGB[1]; B_ = OUT_RGB[2]; return; }
  const go = _grp[L] * SNN, i3 = L * 3, base = _base, dk = _dk, lt = _lt;
  const t = bil(_TM, go, SN, SN, u, v), sh1 = t > 0.02 ? bil(_SH1, go, SN, SN, u, v) : 0;
  let r = base[i3], g = base[i3 + 1], b = base[i3 + 2];
  if (t > 0) { r += (dk[i3] - r) * t; g += (dk[i3 + 1] - g) * t; b += (dk[i3 + 2] - b) * t; }
  const h = bil(_HM, go, SN, SN, u, v) * (_metal[L] ? 0.95 : 0.6);
  let ring = 0;
  if (L === _hairL) { // 动画风头发光环：头顶一圈断续的高光
    const dx = (u + 0.5) * S4 - 0.5 - _hcx, dy = Y - _hcy, r2 = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
    if (ang < -0.7 && ang > -2.8) {
      const band = 1 - sstep(0.6, 2.4, Math.abs(r2 - _hr + Math.cos(ang * 8 + 0.5) * 1.5));
      const fade = sstep(-2.8, -2.4, ang) * (1 - sstep(-1.1, -0.7, ang));
      ring = band * fade * sstep(-0.35, 0.25, Math.cos(ang * 8 + 0.5)) * (1 - sh1 * 0.7);
    }
  }
  if (h > 0) { r += (lt[i3] - r) * h; g += (lt[i3 + 1] - g) * h; b += (lt[i3 + 2] - b) * h; }
  if (ring > 0) { const k = ring * 0.55; r += (250 - r) * k; g += (246 - g) * k; b += (240 - b) * k; }
  if (F[((v + 0.5) | 0) * SN + ((u + 0.5) | 0)] > 0.02) { // 靠近外缘才算轮廓光
    const rim = bil(_RIM, 0, SN, SN, u, v);
    if (rim > 0) { const k = rim * 0.42; r += (228 - r) * k; g += (238 - g) * k; b += (255 - b) * k; }
  }
  // 由上到下的轻微渐层
  const vg = 0.05 - Y / HD * 0.12;
  if (vg > 0) { r += (255 - r) * vg; g += (255 - g) * vg; b += (255 - b) * vg; } else { const k = -vg * 1.5; r -= r * 0.25 * k; g -= g * 0.28 * k; b -= b * 0.15 * k; }
  if (line > 0) { const k = line * 0.85, ln = _ln; r += (ln[i3] - r) * k; g += (ln[i3 + 1] - g) * k; b += (ln[i3 + 2] - b) * k; }
  R_ = r; G_ = g; B_ = b;
}
function colorPass(M, LN, d, M2, COV) {
  // 内部（粗邻域一致、非透明）先在粗网格上着色，细像素做插值：明暗场本来就平滑
  for (let j = 0; j < CW; j++) for (let i = 0; i < CW; i++) {
    const c = j * CW + i, L = CL[c];
    if (!L) continue;
    let need = CU[c];
    if (!need) for (let jj = j > 0 ? j - 1 : 0, je = j < CW - 1 ? j + 1 : j; jj <= je && !need; jj++) for (let ii = i > 0 ? i - 1 : 0, ie = i < CW - 1 ? i + 1 : i; ii <= ie; ii++) if (CU[jj * CW + ii] && CL[jj * CW + ii] === L) { need = 1; break; }
    if (!need) continue;
    shadeL(L, (i * 2 + 0.5) / S4 - 0.5, (j * 2 + 0.5) / S4 - 0.5, j * 2, 0);
    CR[c] = R_; CG[c] = G_; CB[c] = B_;
  }
  for (let Y = 0; Y < HD; Y++) for (let X = 0; X < HD; X++) {
    const cj = Y >> 1, ci = X >> 1, cc = cj * CW + ci;
    if (CU[cc] && CL[cc]) {
      const c1 = (X & 1) && ci < CW - 1 ? cc + 1 : cc, c2 = (Y & 1) && cj < CW - 1 ? cc + CW : cc, c3 = c1 + (c2 - cc);
      const o = (Y * HD + X) * 4;
      d[o] = (CR[cc] + CR[c1] + CR[c2] + CR[c3]) * 0.25; d[o + 1] = (CG[cc] + CG[c1] + CG[c2] + CG[c3]) * 0.25; d[o + 2] = (CB[cc] + CB[c1] + CB[c2] + CB[c3]) * 0.25; d[o + 3] = 255;
      continue;
    }
    const i = Y * HD + X, L = M[i], u = (X + 0.5) / S4 - 0.5, v = (Y + 0.5) / S4 - 0.5, cv = COV[i];
    if (L === 0 && cv >= 1 && _F[((v + 0.5) | 0) * SN + ((u + 0.5) | 0)] > 0.97) continue; // 远离剪影的透明处
    shadeL(L, u, v, Y, LN[i]);
    let r = R_ * A_, g = G_ * A_, b = B_ * A_, a = A_;
    if (cv < 1) {
      r *= cv; g *= cv; b *= cv; a *= cv;
      shadeL(M2[i], u, v, Y, LN[i]);
      const k = (1 - cv) * A_; r += R_ * k; g += G_ * k; b += B_ * k; a += k;
    }
    if (a <= 0) continue;
    const o = i * 4; d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; d[o + 3] = a * 255;
  }
}

// 复用的缓冲区（避免每个精灵都分配，减少 GC）
const B_M = new Int32Array(HD * HD), B_LN = new Float32Array(HD * HD), B_M2 = new Int32Array(HD * HD), B_COV = new Float32Array(HD * HD);
let B_GF = new Float32Array(SNN * 8), B_TM = new Float32Array(SNN * 8), B_HM = new Float32Array(SNN * 8), B_SH1 = new Float32Array(SNN * 8);
const B_RIM = new Float32Array(SNN);
// 材质组的平滑「在内部」场 GF（组 0 = 透明），以及 32 格点上预先算好的明暗：TM 阴影量、HM 亮边量、SH1 主阴影、RIM 轮廓光
function shadeMaps(F, present, grp, nL, nG) {
  const N = SN, n = SNN, len = nG * n;
  if (B_GF.length < len) { const m = len * 2; B_GF = new Float32Array(m); B_TM = new Float32Array(m); B_HM = new Float32Array(m); B_SH1 = new Float32Array(m); }
  const GF = B_GF, TM = B_TM, HM = B_HM, SH1 = B_SH1, RIM = B_RIM;
  GF.fill(0, 0, len); TM.fill(0, 0, len); HM.fill(0, 0, len); SH1.fill(0, 0, len);
  for (let L = 1; L < nL; L++) if (present[L]) { const o = grp[L] * n, s0 = L * n; for (let i = 0; i < n; i++) GF[o + i] += F[s0 + i]; }
  for (let i = n; i < len; i++) if (GF[i] > 1) GF[i] = 1;
  for (let i = 0; i < n; i++) GF[i] = F[i];
  for (let gi = 1; gi < nG; gi++) {
    const go = gi * n;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (GF[go + i] < 0.01 && GF[go + Math.min(n - 1, i + N + 1)] < 0.01 && GF[go + Math.max(0, i - N - 1)] < 0.01) continue; // 只在该组附近计算
      const sh1 = 1 - sstep(0.36, 0.6, bil(GF, go, N, N, x + 0.75, y + 1.05));
      const sh2 = sh1 > 0.98 ? 1 : 1 - sstep(0.3, 0.75, bil(GF, go, N, N, x + 1.7, y + 2.3));
      const hl = sh1 > 0.5 ? 0 : 1 - sstep(0.42, 0.62, bil(GF, go, N, N, x - 0.5, y - 0.7));
      SH1[go + i] = sh1; TM[go + i] = Math.min(1, sh1 * 0.9 + sh2 * 0.3); HM[go + i] = hl * (1 - sh1);
    }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) RIM[y * N + x] = sstep(0.45, 0.7, bil(F, 0, N, N, x + 0.55, y - 0.15));
  _GF = GF; _TM = TM; _HM = HM; _SH1 = SH1; _RIM = RIM;
}

// 去掉外轮廓的黑线（稍后重描细而平滑的外描边）；分隔两块实色的黑线、只由黑线构成的细部保留
function stripOuterK(src, lab, kI, KI) {
  if (kI === undefined && KI === undefined) return;
  const N = SN, sep = new Uint8Array(256);
  const solid16 = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && src[y * 16 + x] !== 0 && src[y * 16 + x] !== kI && src[y * 16 + x] !== KI;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const L = src[y * 16 + x]; if (L !== kI && L !== KI) continue;
    if ((solid16(x - 1, y) && solid16(x + 1, y)) || (solid16(x, y - 1) && solid16(x, y + 1))) sep[y * 16 + x] = 1; // 翅膀与身体之间等
    let near = false; // 蜘蛛腿、触须：8 邻域没有实色
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && solid16(x + dx, y + dy)) { near = true; break; }
    if (!near) sep[y * 16 + x] = 1;
  }
  const kill = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const L = lab[y * N + x]; if (L !== kI && L !== KI) continue;
    if (sep[(y >> 1) * 16 + (x >> 1)]) continue;
    if (x === 0 || y === 0 || x === N - 1 || y === N - 1 || !lab[y * N + x - 1] || !lab[y * N + x + 1] || !lab[y * N + x - N] || !lab[y * N + x + N]) kill.push(y * N + x);
  }
  for (const i of kill) lab[i] = 0;
}

const HD_CACHE = {};
function buildSprite(g16, pal) {
  g16 = g16.map(r => r.slice());
  // 1) 人脸：先把像素眼、腮红抹成皮肤色，稍后用矢量重画
  const face = findFace(g16);
  let blush = false;
  if (face) {
    for (const x of [face.lx, face.rx]) { g16[face.y][x] = face.skin; g16[face.y][x + 1] = face.skin; g16[face.y + 1][x] = face.skin; g16[face.y + 1][x + 1] = face.skin; }
    const by = face.y + 2;
    for (const x of [face.lx - 1, face.rx + 2]) if (g16[by] && g16[by][x] === 'P') { g16[by][x] = face.skin; blush = true; }
  }
  // 2) 字符 → 标签；EPX 放大到 32
  const chars = ['.'], idx = { '.': 0 }, src = new Int32Array(256);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let ch = g16[y][x]; if (ch !== '.' && !pal[ch]) ch = '.';
    if (idx[ch] === undefined) { idx[ch] = chars.length; chars.push(ch); }
    src[y * 16 + x] = idx[ch];
  }
  const N = SN, lab = epx(src, 16, 16);
  stripOuterK(src, lab, idx.k, idx.K);
  // 大片黑色（忍者、蒙面人的黑衣）当成深色布料上色，只留边缘做线条，否则会变成一团没有明暗的黑影
  if (idx.k !== undefined) {
    const kI = idx.k, fillIdx = chars.length, fl = [];
    for (let y = 1; y < SN - 1; y++) for (let x = 1; x < SN - 1; x++) {
      const i = y * SN + x; if (lab[i] !== kI) continue;
      let all = true;
      for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (lab[i + dy * SN + dx] !== kI) { all = false; break; }
      if (all) fl.push(i);
    }
    if (fl.length >= 6) { chars.push('§'); idx['§'] = fillIdx; for (const i of fl) lab[i] = fillIdx; }
  }
  const nL = chars.length;
  // 3) 平滑场：小色块按连通块大小加权，避免被模糊吃掉
  const sg = face ? SIGMA : SIGMA_M;
  const { F, cand, present } = blurFields(lab, N, N, nL, sg, sg * SIGMA0 / SIGMA, compWeights(lab, N, N));
  // 每个标签的材质组、基色、明暗色
  const grp = new Int32Array(nL), metal = new Uint8Array(nL), isLine = new Uint8Array(nL), noLine = new Uint8Array(nL);
  const base = new Float32Array(nL * 3), dk = new Float32Array(nL * 3), lt = new Float32Array(nL * 3), ln = new Float32Array(nL * 3);
  const gIdx = new Map(); gIdx.set(0, 0);
  for (let i = 1; i < nL; i++) {
    const ch = chars[i];
    if (!GROUP[ch]) GROUP[ch] = GROUP_NEXT++;
    if (!gIdx.has(GROUP[ch])) gIdx.set(GROUP[ch], gIdx.size);
    grp[i] = gIdx.get(GROUP[ch]);
    isLine[i] = ch === 'k' || ch === 'K' ? 1 : 0;
    noLine[i] = isLine[i] || 'WL48eP'.includes(ch) ? 1 : 0;
    metal[i] = METALISH.has(ch) ? 1 : 0;
    const c = isLine[i] ? OUT_RGB : ch === '§' ? [62, 52, 76] : pastel(hx(pal[ch])), d = shadowOf(c), l = lightOf(c), q = mixc(mixc(c, [0, 0, 0], 0.6), OUT_RGB, 0.5);
    for (let j = 0; j < 3; j++) { base[i * 3 + j] = c[j]; dk[i * 3 + j] = d[j]; lt[i * 3 + j] = l[j]; ln[i * 3 + j] = q[j]; }
  }
  const nG = gIdx.size;
  shadeMaps(F, present, grp, nL, nG);
  _hairL = face && idx.h !== undefined ? idx.h : -1;
  if (face) { _hcx = (face.lx + face.rx + 2) * 4; _hcy = (face.y + 1) * 8 + 2; _hr = (face.y + 1) * 8 - 18; }
  _W = SN; _H = SN; _WH = SNN; _F = F; _cand = cand; _grp = grp; _base = base; _dk = dk; _lt = lt; _ln = ln; _metal = metal; _isLine = isLine; _nL = nL;
  const M = B_M, LN = B_LN, M2 = B_M2, COV = B_COV;
  labelPass(M, LN, noLine, M2, COV);
  const body = document.createElement('canvas'); body.width = HD; body.height = HD;
  const bx = body.getContext('2d'), img = bx.createImageData(HD, HD);
  colorPass(M, LN, img.data, M2, COV);
  bx.putImageData(img, 0, 0);
  // 5) 矢量脸
  if (face) {
    const eh = pal[face.eye];
    drawFace(bx, face, HD / 16, pastel(hx(pal[face.skin])), irisFor(pal.h, eh, face.eye), blush || pal[face.skin] === PAL_BASE.s);
  }
  return body;
}

function getSpriteHD(key, tier, team, hair, variant, gear) {
  const gs = gearSig(gear);
  const id = `${key}|${tier}|${team}|${hair || ''}|${variant || ''}` + (gs ? '|' + gs : '');
  const hit = HD_CACHE[id]; if (hit) return hit;
  let c;
  try {
    const g = spriteGrid(key, tier, gear);
    const pal = Object.assign({}, PAL_BASE, TEAM_PAL[team] || TEAM_PAL.enemy, { h: hair || '#3a2a1a' }, VARIANT_PAL[variant] || {}, gs ? gearPal(gear) : {});
    c = buildSprite(g, pal);
  } catch (e) {
    if (G.console) console.warn('getSpriteHD', key, e);
    const s = getSprite(key, tier, team, hair, variant, gear);
    c = document.createElement('canvas'); c.width = HD; c.height = HD;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, HD, HD);
  }
  c.className = 'hd';
  HD_CACHE[id] = c;
  return c;
}

// ---------- 立绘 ----------
const PORT_CACHE = new WeakMap();
function hdPortrait(src, opts) {
  if (!src || !src.width) return src;
  // 真高清：getPortrait 的立绘交给 portraits.js 以高解析度重新绘制（同一套程序化美术）
  if (src.__pk && typeof G.portraitHDOf === 'function') {
    let hd = null;
    try { hd = G.portraitHDOf(src, opts); } catch (e) { if (G.console) console.warn('portraitHDOf', e); }
    if (hd) return hd;
  }
  const noBg = !!(opts && opts.bg === false);
  let ent = PORT_CACHE.get(src);
  if (!ent) { ent = {}; PORT_CACHE.set(src, ent); }
  const mode = noBg ? 'nobg' : 'bg';
  if (ent[mode]) return ent[mode];
  let out;
  try { out = buildPortrait(src, noBg); } catch (e) {
    if (G.console) console.warn('hdPortrait', e);
    out = document.createElement('canvas'); out.width = src.width * 4; out.height = src.height * 4;
    const x = out.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, out.width, out.height);
  }
  out.className = 'hd portrait';
  ent[mode] = out;
  return out;
}
// portraits.js 的背景：按到中心的距离分 4 阶 + 4×4 有序抖动（与 Pic.render 同一公式）
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bgLevel(x, y) {
  const ddx = (x - 33) / 40, ddy = (y - 30) / 44, r = Math.sqrt(ddx * ddx + ddy * ddy);
  const v = Math.max(0, Math.min(3, (1 - r) * 3 + 0.3));
  let k = Math.floor(v); if ((v - k) * 16 > BAYER[(y & 3) * 4 + (x & 3)]) k++;
  return Math.min(k, 3);
}
// 推断背景的 4 阶颜色；推断不出（非标准立绘）则返回 null
function detectBg(d, w, h) {
  if (w !== 64 || h !== 72) return null;
  const hist = [new Map(), new Map(), new Map(), new Map()], tot = [0, 0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!(x < 5 || x >= w - 5 || y < 5)) continue;
    const i = (y * w + x) * 4, key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2], k = bgLevel(x, y);
    hist[k].set(key, (hist[k].get(key) || 0) + 1); tot[k]++;
  }
  const pal = [null, null, null, null], exact = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) { // 该阶最常见、且够暗、且比上一阶亮的颜色（头发等碰到边框的物件不会被误认）
    const list = [...hist[k].entries()].sort((a, b) => b[1] - a[1]);
    for (const [key, cnt] of list) {
      if (cnt < Math.max(4, tot[k] * 0.2)) break;
      const c = [(key >> 16) & 255, (key >> 8) & 255, key & 255];
      if (lum(c) > 0.3 || (k && pal[k - 1] && lum(c) <= lum(pal[k - 1]))) continue;
      pal[k] = c; exact[k] = 1; break;
    }
  }
  if (!pal[0] || !pal[1]) return null;
  for (let k = 2; k < 4; k++) if (!pal[k]) pal[k] = pal[k - 1].map((c, j) => Math.max(0, Math.min(255, 2 * c - pal[k - 2][j])));
  return { pal, exact };
}
function buildPortrait(src, noBg) {
  const w = src.width, h = src.height, S = 4;
  const rc = document.createElement('canvas'); rc.width = w; rc.height = h;
  const rx = rc.getContext('2d', { willReadFrequently: true }); rx.drawImage(src, 0, 0);
  const d = rx.getImageData(0, 0, w, h).data;
  const bg = detectBg(d, w, h);
  // 颜色 → 标签（背景像素 = 0 透明）
  const cols = [[0, 0, 0]], idx = new Map(), lab = new Int32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    if (d[i * 4 + 3] < 128) { lab[i] = 0; continue; }
    if (bg) { // 与预测阶数相差不超过 1 的背景色 → 背景
      const k = bgLevel(x, y); let hit = false;
      for (let j = Math.max(0, k - 1); j <= Math.min(3, k + 1) && !hit; j++) {
        const c = bg.pal[j], tol = bg.exact[j] ? 0 : 3;
        hit = Math.abs(c[0] - r) <= tol && Math.abs(c[1] - g) <= tol && Math.abs(c[2] - b) <= tol;
      }
      if (hit) { lab[i] = 0; continue; }
    }
    const key = (r << 16) | (g << 8) | b;
    let L = idx.get(key);
    if (L === undefined) { L = cols.length; idx.set(key, L); cols.push([r, g, b]); }
    lab[i] = L;
  }
  // EPX ×2，再用平滑场 ×2
  const l2 = epx(lab, w, h), W2 = w * 2, H2 = h * 2, nL = cols.length;
  const pw = compWeights(l2, W2, H2);
  for (let i = 0; i < pw.length; i++) if (l2[i] && lum(cols[l2[i]]) < 0.14) pw[i] *= 0.93; // 描线略细
  const { F, cand } = blurFields(l2, W2, H2, nL, PSIGMA, PSIGMA, pw, true);
  _W = W2; _H = H2; _WH = W2 * H2; _F = F; _cand = cand; _grp = null;
  const OW = w * S, OH = h * S, sc = 2;
  const pc = new Float32Array(nL * 3);
  for (let L = 1; L < nL; L++) { const c = pastel(cols[L], true); pc[L * 3] = c[0]; pc[L * 3 + 1] = c[1]; pc[L * 3 + 2] = c[2]; }
  const fig = document.createElement('canvas'); fig.width = OW; fig.height = OH;
  const fx = fig.getContext('2d'), img = fx.createImageData(OW, OH);
  portraitPass(img.data, OW, OH, sc, pc);
  fx.putImageData(img, 0, 0);
  // 柔光：左上暖光、右下冷影（仅作用在人物上）
  fx.globalCompositeOperation = 'source-atop';
  const lg = fx.createLinearGradient(0, 0, OW, OH);
  lg.addColorStop(0, 'rgba(255,244,220,0.12)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(40,30,90,0.12)');
  fx.fillStyle = lg; fx.fillRect(0, 0, OW, OH);
  fx.globalCompositeOperation = 'source-over';
  if (noBg || !bg) return fig;
  // 背景：把抖动晕影换成平滑的径向渐层（同一公式的连续版本）
  const out = document.createElement('canvas'); out.width = OW; out.height = OH;
  const ox = out.getContext('2d'), P = bg.pal;
  ox.fillStyle = rgbStr(P[0]); ox.fillRect(0, 0, OW, OH);
  ox.save(); ox.translate(33.5 * S, 30.5 * S); ox.scale(1, 44 / 40);
  const R = 1.1 * 40 * S, rg = ox.createRadialGradient(0, 0, 0, 0, 0, R);
  rg.addColorStop(0, rgbStr(P[3])); rg.addColorStop(0.1 / 1.1, rgbStr(P[3]));
  rg.addColorStop(0.433 / 1.1, rgbStr(P[2])); rg.addColorStop(0.767 / 1.1, rgbStr(P[1])); rg.addColorStop(1, rgbStr(P[0]));
  ox.fillStyle = rg; ox.fillRect(-R, -R * 1.2, 2 * R, 2.4 * R);
  ox.restore();
  ox.drawImage(fig, 0, 0);
  return out;
}
function portraitPass(d, OW, OH, sc, pc) {
  const q = 0.25 / sc;
  let prev = new Int32Array(OW), cur = new Int32Array(OW), next = new Int32Array(OW);
  const row = (Y, arr) => { const v = (Y + 0.5) / sc - 0.5; for (let X = 0; X < OW; X++) arr[X] = pickL((X + 0.5) / sc - 0.5, v, false); };
  row(0, cur); prev.set(cur);
  for (let Y = 0; Y < OH; Y++) {
    if (Y + 1 < OH) row(Y + 1, next); else next.set(cur);
    const v = (Y + 0.5) / sc - 0.5;
    for (let X = 0; X < OW; X++) {
      const L = cur[X], o = (Y * OW + X) * 4;
      const edge = (X > 0 && cur[X - 1] !== L) || (X < OW - 1 && cur[X + 1] !== L) || prev[X] !== L || next[X] !== L;
      if (!edge) { if (L) { d[o] = pc[L * 3]; d[o + 1] = pc[L * 3 + 1]; d[o + 2] = pc[L * 3 + 2]; d[o + 3] = 255; } continue; }
      const u = (X + 0.5) / sc - 0.5;
      let r = 0, g = 0, b = 0, a = 0;
      for (let s = 0; s < 4; s++) {
        const l2 = pickL(u + (s & 1 ? q : -q), v + (s & 2 ? q : -q), false);
        if (l2) { r += pc[l2 * 3]; g += pc[l2 * 3 + 1]; b += pc[l2 * 3 + 2]; a++; }
      }
      if (a) { d[o] = r / a; d[o + 1] = g / a; d[o + 2] = b / a; d[o + 3] = a * 63.75; }
    }
    const t = prev; prev = cur; cur = next; next = t;
  }
}

G.getSpriteHD = getSpriteHD;
// 空闲时先建一个常用单位：预热 JIT，开战时第一批单位就不会卡顿
if (G.addEventListener) G.addEventListener('load', () => {
  const warm = () => { try { getSpriteHD('swordsman', 0, 'player', '#3a2a1a'); getSpriteHD('skeleton', 0, 'enemy'); } catch (e) { /* 忽略 */ } };
  if (G.requestIdleCallback) G.requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 500);
});
G.hdPortrait = hdPortrait;
G.HD_SPRITE_SIZE = HD;
G.__hdTune = o => { if (o.sigma) SIGMA = o.sigma; if (o.sigma0) SIGMA0 = o.sigma0; if (o.sigmaM) SIGMA_M = o.sigmaM; if (o.psigma) PSIGMA = o.psigma; for (const k in HD_CACHE) delete HD_CACHE[k]; };
})(typeof window !== 'undefined' ? window : this);
