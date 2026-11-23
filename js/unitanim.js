// unitanim
// 高清画风：地图上的「活」单位
//   待机：呼吸（身体上下伸缩，脚不离地）、发梢 / 披风摆动、武器偶尔闪光、飞行单位悬停振翅、
//         怪物各有动作（史莱姆果冻晃、幽灵飘、龙胸口起伏并喷烟、水怪波动、树人树冠摇）；已行动的单位动得更安静
//   行走：一格一步的颠步 + 左右摆、骑兵奔跑颠得更大、飞行单位滑翔；脚下扬尘 / 水花 / 雪粉，留下会淡去的脚印
//   动作：攻击前朝目标蓄势前倾、升级时开心一跳并洒星光、倒下时瘫软再淡出
// 做法：不重画精灵——同一张已缩放好的 HD 画布切成几条横条各自位移 / 伸缩（类似网格形变），
//       翅膀 / 披风另切一块做旋转 / 斜切；每单位每帧只多几次 drawImage。像素画风完全不经过这里。
// 对外：unitAnimDraw / unitAnimGround / unitAnimFront / unitAnimWindup / unitAnimLevelUp（由 battle.js 以 typeof 守卫呼叫）
'use strict';

(function (G) {
const TAU = Math.PI * 2;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - (1 - t) * (1 - t) * (1 - t);
const hash01 = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const tms = ms => (typeof T === 'function' ? T(ms) : ms);

// ---------------------------------------------------------------------
// 单位分类（依精灵键）：决定待机动作与切条方式
// ---------------------------------------------------------------------
const KIND = {};
for (const k of ['slime']) KIND[k] = 'slime';
for (const k of ['spirit', 'spiritEarth', 'spiritFire', 'spiritWind', 'spiritWater', 'gSpirit', 'wind', 'outsider', 'madGod', 'madGod2', 'darkLord']) KIND[k] = 'ghost';
for (const k of ['dragon', 'dragon_b', 'pigdragon', 'hydra']) KIND[k] = 'dragon';
for (const k of ['seaMonster', 'kraken', 'watersnake', 'crocodile']) KIND[k] = 'aqua';
for (const k of ['treant']) KIND[k] = 'plant';
for (const k of ['robot', 'mecha', 'console']) KIND[k] = 'machine';
for (const k of ['wolf', 'beast', 'beastKing', 'sphinx', 'spider', 'scorpion', 'turtle', 'giant', 'yeti', 'skeleton', 'skelArcher', 'demon', 'gargoyle', 'roc', 'bat']) KIND[k] = 'beast';
// 侧身的精灵（头朝左 = -1 / 朝右 = 1）：移动 / 攻击时可左右翻面；正面的 Q 版人形不翻
const SIDE = { wolf: -1, beast: -1, sphinx: -1, crocodile: -1, gGriffin: -1, watersnake: 1, scorpion: -1 };
const HEAD_WINGS = new Set(['bat', 'roc']); // 振翅更快的小型飞行生物

// 切条（占精灵高度的比例）。Q 版人形：0–8 行大头（0–4 行全是头发）、9–12 行身体、13–15 行腿
const CUT_HUMAN = [0, 0.19, 0.33, 0.56, 0.69, 0.82, 1];
const CUT_MOUNT = [0, 0.19, 0.33, 0.56, 0.7, 1];
const CUT_EVEN = [0, 0.2, 0.4, 0.6, 0.8, 1];

// ---------------------------------------------------------------------
// 每单位状态
// ---------------------------------------------------------------------
const ST = new WeakMap();
function stOf(u) {
  let s = ST.get(u);
  if (!s) {
    const id = typeof u.uid === 'number' ? u.uid : Math.random() * 997;
    s = {
      ph: hash01(id) * TAU, ph2: hash01(id + 7.13) * TAU, rate: 0.86 + hash01(id + 3.3) * 0.28,
      lx: u.px ?? u.x, ly: u.py ?? u.y, d: 0, ww: 0, wdx: 0, wdy: 0, step: 0,
      look: 0, lastDirX: 0, flip: 1, calm: 0, last: 0,
      gNext: 0, gT0: -1e9, side: hash01(id + 1.7) < 0.5 ? -1 : 1,
      wind: null, lv: null, smokeNext: 0, tt: hash01(id + 5.5) * 20,
    };
    ST.set(u, s);
  }
  return s;
}

// ---------------------------------------------------------------------
// 精灵分析：16×16 底稿（披风 / 长发格、武器尖、是否骑乘）+ 每张已缩放画布的分层快取
// ---------------------------------------------------------------------
const GRIDA = new Map();
const METAL = new Set('mnivjL34'.split(''));
const GEM = new Set('cAg'.split(''));
function gridInfo(u) {
  let key, tier, gear;
  try { key = spriteKey(u); const C = altOf(u) || clsOf(u); tier = C.spriteTier ?? u.tier; gear = gearOf(u); } catch (e) { return null; }
  const gs = typeof gearSig === 'function' ? gearSig(gear) : '';
  const id = key + '|' + tier + '|' + gs;
  let A = GRIDA.get(id);
  if (A !== undefined) return A;
  A = { key, kind: KIND[key] || 'human', mounted: false, cape: null, tip: null, side: SIDE[key] || 0 };
  try {
    const g = spriteGrid(key, tier, gear);
    if (typeof isMounted === 'function' && isMounted(g)) { A.mounted = true; if (!A.side) A.side = -1; }
    const gearless = typeof GEARLESS !== 'undefined' && GEARLESS.has(key);
    if (!gearless && !KIND[key]) {
      // 披风格：把 GEAR.cape 暂时换成空函数重建一次底稿，前后不同的格子就是露在外面的披风
      const cells = [];
      if (typeof GEAR === 'object' && GEAR && typeof GEAR.cape === 'function') {
        const orig = GEAR.cape; let g2 = null;
        GEAR.cape = function () { };
        try { g2 = spriteGrid(key, tier, gear); } catch (e) { g2 = null; } finally { GEAR.cape = orig; }
        if (g2) for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) if (g[y][x] !== g2[y][x] && g[y][x] !== '.' && (x <= 4 || x >= 11)) cells.push(x, y);
      }
      // 垂到身体两侧的长发
      for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (g[y][x] !== 'h') continue;
        const l = x > 0 ? g[y][x - 1] : '.', r = x < 15 ? g[y][x + 1] : '.';
        if (l === '.' || r === '.' || l === 'k' || r === 'k') cells.push(x, y);
      }
      if (cells.length >= 6) A.cape = cells;
      // 武器尖（闪光点）：右手武器在 x≥12（头部高度 x≥14），没有就找左手
      const pick = (lo, hi, loH, hiH) => {
        for (let y = 0; y < 13; y++) for (let x = (y < 9 ? loH : lo); x <= (y < 9 ? hiH : hi); x++) { const c = g[y][x]; if (METAL.has(c) || GEM.has(c)) return [x, y]; }
        return null;
      };
      A.tip = pick(12, 15, 14, 15) || pick(0, 3, 0, 1);
    }
  } catch (e) { /* 读不到底稿：只用通用动作 */ }
  GRIDA.set(id, A);
  return A;
}

// 每张画布（已缩放、可能已染色）的分层：披风层 / 去掉披风核心的底层；飞行单位的翅膀范围
const CV = new WeakMap();
let SCR = null;
function canvasInfo(spr, A, flyer) {
  let I = CV.get(spr);
  if (I && I.flyer === flyer) return I;
  I = { flyer, base: spr, cape: null, wing: null };
  const P = spr.width;
  if (A && A.cape) {
    const cell = P / 16, c = A.cape;
    const mk = () => { const m = document.createElement('canvas'); m.width = m.height = P; return m; };
    const cape = mk(), cg = cape.getContext('2d');
    // 披风层 = 精灵 ∩（披风格 + 外侧一圈空格，把外描边一起带走）
    cg.fillStyle = '#fff';
    const isCape = new Set(); for (let i = 0; i < c.length; i += 2) isCape.add(c[i] + c[i + 1] * 16);
    for (let i = 0; i < c.length; i += 2) {
      const x = c[i], y = c[i + 1];
      cg.fillRect(x * cell - cell * 0.5, y * cell - cell * 0.15, cell * 2, cell * 1.3);
    }
    cg.globalCompositeOperation = 'source-in'; cg.drawImage(spr, 0, 0);
    // 底层 = 精灵 − 披风格的内缩核心（留一圈原图，小幅摆动时不露洞）
    const base = mk(), bg = base.getContext('2d');
    bg.drawImage(spr, 0, 0); bg.globalCompositeOperation = 'destination-out'; bg.fillStyle = '#000';
    for (let i = 0; i < c.length; i += 2) {
      const x = c[i], y = c[i + 1], inL = isCape.has(x - 1 + y * 16), inR = isCape.has(x + 1 + y * 16), inU = isCape.has(x + (y - 1) * 16);
      const x0 = x * cell + (inL ? 0 : cell * 0.3), x1 = (x + 1) * cell - (inR ? 0 : cell * 0.3), y0 = y * cell + (inU ? 0 : cell * 0.3);
      bg.fillRect(x0, y0, x1 - x0, (y + 1) * cell - y0);
    }
    let top = 16; for (let i = 1; i < c.length; i += 2) top = Math.min(top, c[i]);
    I.base = base; I.cape = cape; I.capeTop = top / 16;
  }
  if (flyer && A && A.mounted) {
    // 天马 / 飞龙坐骑：双翼固定在上方两角（0–4 行），骑手的枪也在右侧 → 振幅减半，免得枪跟着大幅摆
    I.wing = { r0: 0, r1: 5 / 16, wl: 0.25, wr: 0.75, amp: 0.35 };
  } else if (flyer) {
    // 翅膀：左右外侧各 30% 的列中，从上往下第一段不透明的行
    if (!SCR) { SCR = document.createElement('canvas'); SCR.width = SCR.height = 32; }
    const g = SCR.getContext('2d', { willReadFrequently: true });
    g.clearRect(0, 0, 32, 32); g.drawImage(spr, 0, 0, 32, 32);
    let d = null; try { d = g.getImageData(0, 0, 32, 32).data; } catch (e) { d = null; }
    if (d) {
      const rowOn = y => { let n = 0; for (let x = 0; x < 32; x++) if ((x < 9 || x > 22) && d[(y * 32 + x) * 4 + 3] > 90) n++; return n >= 2; };
      let r0 = -1, r1 = -1;
      for (let y = 0; y < 32; y++) { if (rowOn(y)) { if (r0 < 0) r0 = y; r1 = y; } else if (r0 >= 0) break; }
      if (r0 >= 0 && r0 < 22 && r1 - r0 >= 3) {
        I.wing = { r0: Math.max(0, r0 - 0.5) / 32, r1: Math.min(32, r1 + 1.5) / 32, wl: 0.3, wr: 0.7 };
      }
    }
  }
  CV.set(spr, I);
  return I;
}

// ---------------------------------------------------------------------
// 地面效果：脚印（单位下方）与粒子（单位上方）
// ---------------------------------------------------------------------
const PRINTS = [], PARTS = [];
const DOT = new Map();
function dotTex(col) { // 柔和圆点贴图
  let c = DOT.get(col);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    const clear = col.replace(/,\s*[\d.]+\)$/, ',0)');
    gr.addColorStop(0, col); gr.addColorStop(0.45, col); gr.addColorStop(1, clear);
    g.fillStyle = gr; g.globalAlpha = 1; g.fillRect(0, 0, 32, 32);
    DOT.set(col, c);
  }
  return c;
}
let STAR = null;
function starTex() { // 四芒星闪光
  if (STAR) return STAR;
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(24, 24, 0, 24, 24, 12); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,240,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
  g.fillStyle = '#fffbe6'; g.beginPath();
  g.moveTo(24, 0); g.quadraticCurveTo(26, 22, 48, 24); g.quadraticCurveTo(26, 26, 24, 48); g.quadraticCurveTo(22, 26, 0, 24); g.quadraticCurveTo(22, 22, 24, 0); g.fill();
  return (STAR = c);
}
const GROUND = { // 地形 → 脚步效果
  G: 'dust', R: 'dust', S: 'sand', H: 'dust', V: 'dust', O: 'dust', D: 'dark', F: 'leaf', M: 'dust', B: 'wood',
  N: 'snow', T: 'splash', P: 'mud', W: 'splash',
};
const PRINT_ON = { G: 1, R: 1, S: 1, H: 1, N: 1, P: 1, D: 1, V: 1, O: 1, F: 1 };
function terrainAt(x, y) {
  try { const r = B.map[Math.round(y)]; return r ? r[Math.round(x)] || 'G' : 'G'; } catch (e) { return 'G'; }
}
function part(o) { if (PARTS.length < 260) PARTS.push(o); }
function stepFx(u, s, A, I, now) {
  const fly = I.flyer || A.kind === 'ghost';
  if (fly) return;
  const x = (u.px ?? u.x) + 0.5, y = (u.py ?? u.y) + 0.86, t = terrainAt(u.px ?? u.x, u.py ?? u.y);
  const fx = GROUND[t] || 'dust', big = A.mounted ? 1.5 : A.kind === 'beast' || A.kind === 'dragon' ? 1.25 : 1;
  const back = -s.wdx * 0.12, backY = -s.wdy * 0.06;
  if (fx === 'splash' || fx === 'mud') {
    const col = fx === 'mud' ? 'rgba(120,92,60,0.9)' : 'rgba(200,236,255,0.95)';
    for (let i = 0; i < 8 * big; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; part({ k: 'drop', x: x + back, y: y - 0.02, vx: Math.cos(a) * 1.0, vy: Math.sin(a) * 1.8, g: 6, t0: now, life: 420, r: 0.045 + Math.random() * 0.035, col }); }
    part({ k: 'ring', x, y, t0: now, life: 520, r: 0.12, r1: 0.42 * big, col: fx === 'mud' ? 'rgba(90,70,40,' : 'rgba(225,245,255,' });
  } else if (fx === 'snow') {
    for (let i = 0; i < 5 * big; i++) part({ k: 'puff', x: x + back + (Math.random() - 0.5) * 0.35, y: y + backY, vx: (Math.random() - 0.5) * 0.6 - s.wdx * 0.3, vy: -0.3 - Math.random() * 0.3, g: 0.4, t0: now, life: 560, r: 0.1 + Math.random() * 0.06, gr: 1.6, col: 'rgba(250,252,255,0.95)' });
  } else if (fx === 'leaf') {
    for (let i = 0; i < 2; i++) part({ k: 'drop', x: x + (Math.random() - 0.5) * 0.4, y: y - 0.05, vx: (Math.random() - 0.5) * 0.6, vy: -0.8 - Math.random() * 0.5, g: 2.4, t0: now, life: 520, r: 0.035, col: 'rgba(110,170,70,0.95)' });
    for (let i = 0; i < 2; i++) part({ k: 'puff', x: x + back, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.2, g: 0, t0: now, life: 360, r: 0.06, gr: 1.4, col: 'rgba(170,150,110,0.55)' });
  } else if (fx !== 'wood') {
    const col = fx === 'sand' ? 'rgba(244,222,168,0.9)' : fx === 'dark' ? 'rgba(170,120,210,0.7)' : 'rgba(232,214,178,0.85)';
    const n = (fx === 'sand' ? 5 : 4) * big;
    for (let i = 0; i < n; i++) part({ k: 'puff', x: x + back + (Math.random() - 0.5) * 0.4, y: y + backY + (Math.random() - 0.5) * 0.08, vx: (Math.random() - 0.5) * 0.7 - s.wdx * 0.4, vy: -0.2 - Math.random() * 0.3, g: 0, t0: now, life: 460 + Math.random() * 180, r: 0.09 + Math.random() * 0.06, gr: 1.4, col });
  }
  if (PRINT_ON[t] && PRINTS.length < 180) {
    s.step = (s.step + 1) & 1;
    const side = s.step ? 1 : -1, px = -s.wdy, py = s.wdx; // 与行进方向垂直，左右脚交替
    const col = t === 'N' ? 'rgba(120,140,175,' : t === 'S' ? 'rgba(150,115,70,' : t === 'P' ? 'rgba(60,45,30,' : 'rgba(45,35,25,';
    if (A.mounted) for (const k of [-1, 1]) PRINTS.push({ x: x + px * 0.1 * k, y: y - 0.02 + py * 0.05 * k, t0: now, life: t === 'N' ? 4200 : 2600, r: 0.055, col, rot: 0 });
    else if (A.kind === 'slime') PRINTS.push({ x, y: y - 0.02, t0: now, life: 2400, r: 0.13, col: 'rgba(80,160,90,', rot: 0, flat: 1 });
    else PRINTS.push({ x: x + px * 0.09 * side, y: y - 0.02 + py * 0.04 * side, t0: now, life: t === 'N' ? 4200 : 2600, r: 0.065, col, rot: Math.atan2(s.wdy, s.wdx) });
  }
}

// ---------------------------------------------------------------------
// 姿势：整体变换 + 每条切片的伸缩 / 边界位移
//   待机部分只依赖「相位时间」与幅度 → 可预先画成快取帧（每种形态 12 帧），静止待机的单位每帧只贴一张图；
//   行走 / 蓄势 / 跳跃 / 倒下 / 翻面 / 动静过渡中的单位才即时形变。
// ---------------------------------------------------------------------
const SY = new Float32Array(8), SX = new Float32Array(8), XB = new Float32Array(9), TOPS = new Float32Array(9); // XB = 各切条边界的水平位移（相邻切条共用 → 无撕裂）
const POSE = { tx: 0, ty: 0, rot: 0, gsx: 1, gsy: 1, flip: 1, alpha: -1, flap: 0, shear: 0, glint: 0 };
const PERIOD = { human: 3.0, slime: 1.6, ghost: 2.4, aqua: 2.3, plant: 4.2, machine: 1.3, dragon: 3.2, beast: 2.8 };
const MARGIN = { human: 0.05, slime: 0.07, ghost: 0.15, aqua: 0.07, plant: 0.08, machine: 0.03, dragon: 0.07, beast: 0.06 };
const NFR = 12;
const periodOf = (A, I) => (I.wing ? (HEAD_WINGS.has(A.key) ? 0.32 : 0.62) : PERIOD[A.kind] || 3);
const cutsOf = (A, I) => (I.wing ? null : A.kind === 'human' ? (A.mounted ? CUT_MOUNT : CUT_HUMAN) : CUT_EVEN);
function resetPose() {
  for (let i = 0; i < 8; i++) { SY[i] = 1; SX[i] = 1; } XB.fill(0);
  const P = POSE; P.flip = 1; P.tx = 0; P.ty = 0; P.rot = 0; P.gsx = 1; P.gsy = 1; P.alpha = -1; P.flap = 0; P.shear = 0; P.glint = 0;
}

// 待机：t = 相位时间（秒），amp = 幅度（已行动 0.45）
function idlePose(A, I, t, amp, dsz, n) {
  const P = POSE, w = TAU * t / periodOf(A, I), k = A.kind, sn = Math.sin(w), b01 = 0.5 + 0.5 * sn;
  if (I.wing) { // 飞行：悬停 + 振翅（翼尖上下），身体随拍翅起伏
    P.flap = sn * 0.16 * amp;
    P.ty -= dsz * (0.035 + 0.022 * amp * Math.sin(w - 1.2));
    P.gsy *= 1 + 0.015 * amp * Math.sin(w + 0.6); P.gsx *= 1 - 0.006 * amp * Math.sin(w + 0.6);
  } else if (k === 'slime') { // 果冻晃：上下压扁拉长 + 顶部滞后的左右晃
    for (let i = 0; i < n; i++) { SY[i] = 1 + 0.07 * amp * sn; SX[i] = 1 - 0.055 * amp * sn; }
    for (let i = 0; i <= n; i++) XB[i] = 0.035 * dsz * amp * Math.sin(w - 1.3 - i * 0.4) * ((n - i) / n);
  } else if (k === 'ghost') { // 飘：上下浮动 + 左右漂 + 下摆波动
    P.ty -= dsz * (0.045 + 0.035 * amp * sn);
    P.tx += dsz * 0.012 * amp * Math.sin(w + 2);
    for (let i = 0; i <= n; i++) XB[i] = 0.035 * dsz * amp * Math.sin(2 * w + i * 0.95) * (i / n);
  } else if (k === 'aqua') { // 水中生物：由上往下传的波
    for (let i = 0; i < n; i++) SY[i] = 1 + 0.025 * amp * Math.sin(w + i * 1.1 + 1);
    for (let i = 0; i <= n; i++) XB[i] = 0.03 * dsz * amp * Math.sin(w + i * 1.1) * (0.4 + 0.6 * (1 - i / n));
  } else if (k === 'plant') { // 树冠慢慢摇
    for (let i = 0; i <= n; i++) XB[i] = 0.045 * dsz * amp * Math.sin(w - i * 0.35) * Math.pow((n - i) / n, 1.6);
    SY[2] = SY[3] = 1 + 0.02 * amp * b01;
  } else if (k === 'machine') { // 机械：一顿一顿的低鸣
    P.ty -= dsz * 0.01 * amp * (sn > 0 ? 1 : 0);
  } else if (k === 'dragon' || k === 'beast') { // 胸腹起伏（龙更深），头部带一点滞后
    const e = k === 'dragon' ? 0.06 : 0.04, lag = Math.sin(w - 0.8);
    for (let i = 1; i < n - 1; i++) SY[i] = 1 + e * amp * b01;
    P.gsx *= 1 + e * 0.35 * amp * b01;
    XB[0] = 0.016 * dsz * amp * lag; XB[1] = 0.006 * dsz * amp * lag;
  } else { // 人形（含骑乘）：躯干伸缩 = 呼吸，头部整块跟着上下；最上两条（头发）带滞后的左右摆；披风另外斜切
    SY[3] = 1 + 0.05 * amp * b01; if (!A.mounted) SY[4] = SY[3];
    const lag = Math.sin(w + 0.5);
    XB[0] = 0.024 * dsz * amp * lag; XB[1] = 0.01 * dsz * amp * lag; XB[2] = 0.004 * dsz * amp * Math.sin(w + 1.3);
    if (A.mounted) SY[n - 1] = 1 + 0.012 * amp * Math.sin(w + 2);
    if (I.cape) P.shear = 0.05 * amp * Math.sin(w - 0.4);
  }
}

// 每帧的状态推进：相位时间、动静过渡、行走侦测（扬尘 / 脚印）、翻面
function tick(u, s, A, I, now) {
  const dt = Math.min(0.1, Math.max(0, (now - (s.last || now)) / 1000)); s.last = now;
  const calmT = u.acted || hasStatus(u, 'blind') ? 1 : 0; // 已行动 / 失明：动得更安静
  s.calm += (calmT - s.calm) * Math.min(1, dt * 4);
  if (Math.abs(s.calm - calmT) < 0.01) s.calm = calmT;
  const cx = u.px ?? u.x, cy = u.py ?? u.y, mdx = cx - s.lx, mdy = cy - s.ly, md = Math.hypot(mdx, mdy);
  s.lx = cx; s.ly = cy;
  const moving = u.px !== undefined && md > 1e-4 && md < 1.5;
  if (moving) {
    if (s.ww < 0.05) { s.d = 0; s.step = 0; stepFx(u, s, A, I, now); }
    s.wdx = mdx / md; s.wdy = mdy / md;
    const d0 = s.d; s.d += md;
    if (Math.floor(s.d) > Math.floor(d0)) stepFx(u, s, A, I, now);
    s.ww = Math.min(1, s.ww + dt * 14);
    if (Math.abs(mdx) > 1e-4) s.look = Math.sign(mdx);
  } else s.ww = s.ww > 0.002 ? Math.max(0, s.ww - dt * 7) : 0;
  // 相位时间：每单位速度略不同、起点不同 → 不会齐步；滑翔时翅膀拍得更快
  s.tt += dt * s.rate * (1 - 0.4 * s.calm) * (I.wing ? 1 + 1.2 * s.ww : 1);
  // 面向（只有侧身精灵会翻面）：行走方向 > 攻击目标 > 面向箭头
  if (u.dir && u.dir.x !== s.lastDirX) { s.lastDirX = u.dir.x; if (u.dir.x && !moving) s.look = u.dir.x; }
  if (A.side) {
    const want = s.look && s.look !== A.side ? -1 : 1;
    s.flip += (want - s.flip) * Math.min(1, dt * 16);
    if (Math.abs(s.flip - want) < 0.01) s.flip = want;
  }
}

// 行走 / 攻击 / 升级 / 倒下 / 翻面：叠加在待机姿势上；回传是否需要即时形变
function actionPose(u, s, A, I, now, dsz, ts, n) {
  const P = POSE, k = A.kind, ww = s.ww, dead = u.hp <= 0;
  let live = ww > 0 || (s.calm > 0 && s.calm < 1);
  if (A.side) { P.flip = Math.abs(s.flip) < 0.15 ? (s.flip < 0 ? -0.15 : 0.15) : s.flip; if (Math.abs(s.flip) !== 1) live = true; }
  if (ww > 0) {
    const bobW = Math.abs(Math.sin(Math.PI * s.d)), alt = Math.cos(Math.PI * s.d), wdx = s.wdx;
    if (I.wing) { P.rot += ww * 0.14 * wdx; P.flap += ww * 0.06 * Math.sign(P.flap || 1); } // 滑翔：前倾，不颠
    else if (k === 'slime') { P.ty -= ww * bobW * 0.16 * dsz; const sq = ww * Math.pow(1 - bobW, 3) * 0.16; P.gsy *= 1 - sq; P.gsx *= 1 + sq; }
    else if (k === 'ghost') P.rot += ww * 0.12 * wdx;
    else if (k === 'aqua') P.ty -= ww * bobW * 0.06 * dsz;
    else if (k === 'plant' || k === 'machine') { P.ty -= ww * bobW * 0.05 * dsz; P.rot += ww * 0.06 * alt; }
    else if (k === 'dragon' || k === 'beast') { P.ty -= ww * bobW * 0.08 * dsz; P.rot += ww * (0.08 * wdx + 0.06 * Math.sin(TAU * s.d)); }
    else if (A.mounted) { // 骑兵奔跑：颠得更大、前后点头，头发往后飘
      P.ty -= ww * bobW * 0.11 * dsz; P.rot += ww * (0.06 * wdx + 0.07 * Math.sin(TAU * s.d));
      XB[0] -= ww * wdx * 0.04 * dsz; XB[1] -= ww * wdx * 0.016 * dsz;
    } else { // 步行：一格一步的颠步 + 左右交替摆 + 落脚时微蹲
      P.ty -= ww * bobW * 0.075 * dsz; P.rot += ww * (0.09 * wdx + 0.055 * alt);
      XB[0] -= ww * wdx * 0.035 * dsz; XB[1] -= ww * wdx * 0.013 * dsz;
      const sq = ww * Math.pow(1 - bobW, 4) * 0.05; P.gsy *= 1 - sq; P.gsx *= 1 + sq * 0.6;
    }
    if (I.cape) P.shear += -ww * wdx * 0.22 + ww * 0.05 * Math.sin(now / 1000 * TAU * 4 + s.ph); // 披风往后拖、抖动
  }
  // ---- 攻击蓄势 / 突进时的前倾 ----
  const W = s.wind;
  let lean = 0;
  if (W) {
    live = true;
    const wk = (now - W.t0) / Math.max(1, W.dur);
    if (wk < 1) lean = easeOut(clamp01(wk));
    else { lean = Math.exp(-(now - W.t0 - W.dur) / 160); if (lean < 0.02) { s.wind = null; lean = 0; } }
    if (W.ranged) lean = -0.6 * lean;
  }
  const lx = u.ox || 0, ly = u.oy || 0, lunge = Math.min(1, Math.hypot(lx, ly) / 0.3);
  if (lunge > 0) { live = true; if (!(W && W.ranged)) lean = Math.max(lean, lunge); }
  if (lean && W) {
    P.rot += lean * 0.17 * W.dx;
    P.tx -= lean * 0.045 * dsz * W.dx * (1 - lunge);
    P.gsy *= 1 - 0.07 * Math.abs(lean) * (1 - lunge) + (W.dy < 0 ? 0.05 * lean * lunge : 0);
    P.gsx *= 1 + 0.04 * Math.abs(lean) * (1 - lunge);
    P.ty += W.dy * 0.03 * dsz * lean;
  } else if (lunge > 0) P.rot += lunge * 0.12 * Math.sign(lx);
  // ---- 升级：蹲 → 跳 → 落地回弹 ----
  const L = s.lv;
  if (L) {
    const lk = (now - L.t0) / L.dur;
    if (lk >= 1) s.lv = null;
    else {
      live = true;
      const up = sstep(0.12, 0.42, lk) - sstep(0.5, 0.82, lk);
      P.ty -= ts * 0.5 * Math.sin(Math.PI * clamp01((lk - 0.12) / 0.7)) * (lk > 0.12 && lk < 0.82 ? 1 : 0);
      const sq = lk < 0.12 ? Math.sin(Math.PI * lk / 0.12) * 0.16 : lk > 0.82 ? Math.sin(Math.PI * (lk - 0.82) / 0.18) * 0.14 : -0.06 * up;
      P.gsy *= 1 - sq; P.gsx *= 1 + sq * 0.7;
      P.rot += 0.12 * s.side * Math.sin(TAU * clamp01((lk - 0.12) / 0.7));
      if (!L.apex && lk > 0.45) { L.apex = 1; sparkle(u, now, 10); }
    }
  }
  // ---- 倒下：膝软、侧倒、下沉，再柔和淡出 ----
  if (dead && u.dying > 0) {
    live = true;
    const p = 1 - u.dying, sl = easeOut(clamp01(p / 0.55));
    if (k === 'ghost') { P.ty -= sl * 0.25 * dsz; P.gsx *= 1 - 0.3 * sl; P.gsy *= 1 + 0.15 * sl; }
    else if (k === 'slime') { P.gsy *= 1 - 0.55 * sl; P.gsx *= 1 + 0.35 * sl; }
    else {
      P.gsy *= 1 - 0.26 * sl; P.gsx *= 1 + 0.08 * sl;
      P.rot += s.side * 0.26 * sl; P.ty += 0.05 * dsz * sl;
      if (I.wing) { P.ty *= 1 - sl; P.flap *= 1 - sl; }
    }
    P.alpha = 1 - sstep(0.22, 1, p);
  }
  // ---- 武器闪光：每单位 4–9 秒一次；行走 / 已行动时不闪 ----
  if (A.tip && !s.calm && ww === 0 && !dead) {
    if (!s.gNext) s.gNext = now + 1200 + hash01(s.ph * 9) * 6000;
    if (now > s.gNext) { s.gT0 = now; s.gNext = now + 4200 + Math.random() * 5000; }
    const gk = (now - s.gT0) / 460;
    if (gk >= 0 && gk < 1) P.glint = Math.sin(gk * Math.PI);
  }
  if (k === 'dragon') dragonSmoke(u, s, A, now);
  return live;
}

function dragonSmoke(u, s, A, now) {
  if (u.hp <= 0 || s.ww > 0.05) return;
  if (!s.smokeNext) s.smokeNext = now + 1500 + hash01(s.ph * 5) * 5000;
  if (now < s.smokeNext) return;
  s.smokeNext = now + (5200 + Math.random() * 4500) * (s.calm ? 1.8 : 1);
  const ice = /_b$/.test(A.key) || u.color === 'blue', fire = (u.tier || 0) >= 2 && !ice;
  const x = (u.px ?? u.x) + 0.5, y = (u.py ?? u.y) + 0.9 - (u.boss ? 1.4 : 1.2) * 0.62;
  for (let i = 0; i < 5; i++) part({ k: 'puff', x: x + (Math.random() - 0.5) * 0.16, y: y + Math.random() * 0.05, vx: (Math.random() - 0.5) * 0.25, vy: -0.35 - Math.random() * 0.25, g: 0, t0: now + i * 60, life: 900, r: 0.05 + Math.random() * 0.03, gr: 2.4, col: ice ? 'rgba(210,240,255,0.7)' : 'rgba(190,190,200,0.55)' });
  if (fire) for (let i = 0; i < 4; i++) part({ k: 'ember', x: x + (Math.random() - 0.5) * 0.12, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.6 - Math.random() * 0.4, g: -0.2, t0: now + i * 50, life: 650, r: 0.025, col: Math.random() < 0.5 ? 'rgba(255,170,60,1)' : 'rgba(255,230,120,1)' });
}

function sparkle(u, now, n) {
  const x = (u.px ?? u.x) + 0.5, y = (u.py ?? u.y) + 0.45;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.random() * 0.5, sp = 0.6 + Math.random() * 0.8;
    part({ k: 'star', x: x + Math.cos(a) * 0.15, y: y + Math.sin(a) * 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 0.6, g: 0.9, t0: now + Math.random() * 80, life: 700 + Math.random() * 300, r: 0.12 + Math.random() * 0.1, spin: (Math.random() - 0.5) * 6 });
  }
}

// ---------------------------------------------------------------------
// 绘制（局部座标：原点 = 脚底锚点；精灵左上角在 (-dsz/2, -0.9·dsz)）
// ---------------------------------------------------------------------
function layoutTops(cuts, dsz) { // 只算各切条的顶边（闪光点定位用）
  const n = cuts.length - 1; let bottom = 0.1 * dsz;
  for (let i = n - 1; i >= 0; i--) { bottom -= (cuts[i + 1] - cuts[i]) * dsz * SY[i]; TOPS[i] = bottom; }
  TOPS[n] = 0.1 * dsz;
}
function drawPieces(g, I, cuts, dsz, P) {
  const img = I.base, W = img.width, k = dsz / W, Y0 = -0.9 * dsz, X0 = -dsz / 2;
  if (I.wing) {
    const w = I.wing, r0 = w.r0 * W, r1 = w.r1 * W, wl = w.wl * W, wr = w.wr * W, ov = W * 0.06;
    // 两侧翅膀以外的部分（先画，且往翅膀范围内多画一截：翅膀拍起时底下露出的是原图而不是缝）
    const oy = w.amp ? ov : 0, t1 = Math.min(r1, r0 + oy), b0 = Math.max(r0, r1 - oy); // 只有骑乘飞行（切线穿过骑手 / 长枪）才需要
    if (r0 > 0.5 || t1 > r0) { g.drawImage(img, 0, 0, wl + 1, t1, X0, Y0, (wl + 1) * k, t1 * k); g.drawImage(img, wr - 1, 0, W - wr + 1, t1, X0 + (wr - 1) * k, Y0, (W - wr + 1) * k, t1 * k); }
    if (r1 < W - 0.5) { g.drawImage(img, 0, b0, wl + 1, W - b0, X0, Y0 + b0 * k, (wl + 1) * k, (W - b0) * k); g.drawImage(img, wr - 1, b0, W - wr + 1, W - b0, X0 + (wr - 1) * k, Y0 + b0 * k, (W - wr + 1) * k, (W - b0) * k); }
    // 翅膀：以翼根为轴的竖向斜切 + 横向压缩（翼根处位移为 0 → 与身体无缝），翼尖上下拍动
    const A = P.flap * dsz * 0.6 * (w.amp || 1), c = 1 - 0.14 * Math.abs(P.flap) / 0.16 * (w.amp || 1);
    for (let sd = -1; sd <= 1; sd += 2) {
      const sx0 = sd < 0 ? 0 : wr - ov, sw = sd < 0 ? wl + ov : W - wr + ov, rootX = X0 + (sd < 0 ? wl : wr) * k, span = (sd < 0 ? wl : W - wr) * k;
      const sh = -sd * A / span; // y' = y + A·(离翼根的距离 / 翼展)
      g.save(); g.transform(c, sh, 0, 1, rootX * (1 - c), -sh * rootX);
      g.drawImage(img, sx0, r0, sw, r1 - r0, X0 + sx0 * k, Y0 + r0 * k, sw * k, (r1 - r0) * k);
      g.restore();
    }
    // 身体中段整列最后画，盖住翼根
    g.drawImage(img, wl, 0, wr - wl, W, X0 + wl * k, Y0, (wr - wl) * k, dsz);
    return;
  }
  // 横条：由下往上排，下层伸缩会把上层顶高；每条往下多取 1px 盖住接缝；
  // 每条以斜切连接上下边界的位移（XB[i] → XB[i+1]），整体是一张分段线性的网格形变
  const n = cuts.length - 1, M = g.getTransform(), ma = M.a, mb = M.b, mc = M.c, md = M.d, me = M.e, mf = M.f;
  let bottom = Y0 + dsz;
  for (let i = n - 1; i >= 0; i--) {
    const a = cuts[i] * W, b = cuts[i + 1] * W, h = (b - a) * k * SY[i], top = bottom - h;
    const ext = i < n - 1 ? 1 : 0, dw = dsz * SX[i], sh = (XB[i] - XB[i + 1]) / h, tx = XB[i + 1] + sh * bottom;
    g.setTransform(ma, mb, mc - ma * sh, md - mb * sh, me + ma * tx, mf + mb * tx);
    g.drawImage(img, 0, a, W, b - a + ext, -dw / 2, top, dw, h + ext * k * SY[i]);
    TOPS[i] = top; bottom = top;
  }
  g.setTransform(M);
  TOPS[n] = Y0 + dsz;
  if (I.cape) { // 披风 / 长发：以披风顶为轴斜切摆动
    const yc = Y0 + I.capeTop * dsz;
    g.save(); g.transform(1, 0, P.shear, 1, -P.shear * yc, 0);
    g.drawImage(I.cape, X0, Y0, dsz, dsz);
    g.restore();
  }
}

// 快取帧：同一张画布 × 动静（0 / 1）× 面向，各 NFR 帧，按需建立；总数过多就整批丢掉重建
let FR_COUNT = 0, FR_OWNERS = [];
function cachedFrame(I, A, j, calm, flip) {
  let F = I.frames;
  if (!F) { F = I.frames = new Map(); FR_OWNERS.push(I); }
  const key = (calm ? 2 : 0) + (flip < 0 ? 1 : 0);
  let set = F.get(key);
  if (!set) F.set(key, (set = new Array(NFR)));
  let c = set[j];
  if (c) return c;
  if (FR_COUNT > 720) { for (const o of FR_OWNERS) o.frames = null; FR_OWNERS = []; FR_COUNT = 0; return null; }
  const W = I.base.width, m = Math.ceil(W * (I.wing ? 0.17 : MARGIN[A.kind] || 0.05)), S = W + 2 * m;
  c = document.createElement('canvas'); c.width = S; c.height = S; c.m = m;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true;
  resetPose(); const cuts = cutsOf(A, I);
  idlePose(A, I, (j + 0.5) / NFR * periodOf(A, I), calm ? 0.45 : 1, W, cuts ? cuts.length - 1 : 0);
  g.translate(m + W / 2 + POSE.tx, m + 0.9 * W + POSE.ty); g.scale(flip * POSE.gsx, POSE.gsy);
  drawPieces(g, I, cuts, W, POSE);
  set[j] = c; FR_COUNT++;
  return c;
}

function drawGlint(g, A, cuts, dsz, now, ax, ay, sxl, syl, alpha) {
  if (!(POSE.glint > 0) || !A.tip || !cuts) return;
  const fy = (A.tip[1] + 0.5) / 16, fx = (A.tip[0] + 0.5) / 16;
  let i = 0; while (i < cuts.length - 2 && fy > cuts[i + 1]) i++;
  const f = (fy - cuts[i]) / (cuts[i + 1] - cuts[i]), y = TOPS[i] + (fy - cuts[i]) * dsz * SY[i], x = -dsz * SX[i] / 2 + fx * dsz * SX[i] + XB[i] + (XB[i + 1] - XB[i]) * f;
  const r = dsz * 0.2 * POSE.glint;
  g.save();
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.9 * POSE.glint * alpha; g.imageSmoothingEnabled = true;
  g.translate(ax + x * sxl, ay + y * syl); g.rotate(now / 600);
  g.drawImage(starTex(), -r / 2, -r / 2, r, r);
  g.restore();
}

// 主入口：画一个高清单位（已含染色的已缩放画布）；回传 true 表示已画好（含受击闪光）
function unitAnimDraw(g, u, spr, dx, dy, dsz, now, ts) {
  if (G.UNITANIM && G.UNITANIM.off) return false;
  if (!spr || !(spr.width > 0)) return false;
  const s = stOf(u), A = gridInfo(u) || { key: '', kind: 'human', mounted: false, cape: null, tip: null, side: 0 };
  let flyer = false;
  try { flyer = (tierDef(u).move === 'fly') && A.kind !== 'ghost' && A.kind !== 'machine'; } catch (e) { flyer = false; }
  const I = canvasInfo(spr, A, flyer);
  // battle.js 的旧二帧上下跳：高清由这里的呼吸取代，扣回去
  const still = u.acted || !canAct(u) || u.px !== undefined || u.hp <= 0;
  if (!still && Math.floor(now / 400) % 2) dy += ts / 32;
  tick(u, s, A, I, now);
  const flash = u.flash && now < u.flash, a0 = g.globalAlpha;
  // 石化 / 冰冻：完全不动
  if (u.hp > 0 && (hasStatus(u, 'petrify') || hasStatus(u, 'freeze'))) {
    g.drawImage(spr, dx, dy, dsz, dsz);
    if (flash) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7 * a0; g.drawImage(spr, dx, dy, dsz, dsz); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0; }
    return true;
  }
  // 待机姿势（连续相位）→ 叠上动作；没有动作时改贴预先形变好的快取帧
  const cuts = cutsOf(A, I), n = cuts ? cuts.length - 1 : 0, amp = 1 - 0.55 * s.calm, per = periodOf(A, I);
  resetPose(); idlePose(A, I, s.tt, amp, dsz, n);
  const live = actionPose(u, s, A, I, now, dsz, ts, n) || G.UNITANIM.live;
  if (G.UNITANIM.stat) G.UNITANIM.stat[live ? 1 : 0]++;
  if (!live) {
    const ph = s.tt / per, j = Math.floor((ph - Math.floor(ph)) * NFR) % NFR, flip = POSE.flip < 0 ? -1 : 1;
    const c = cachedFrame(I, A, j, s.calm, flip);
    if (c) { // 与画布像素 1:1 贴图，不需平滑缩放
      const kk = dsz / spr.width, m = c.m * kk, S = c.width * kk;
      g.drawImage(c, dx - m, dy - m, S, S);
      if (flash) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7 * a0; g.drawImage(c, dx - m, dy - m, S, S); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a0; }
      if (POSE.glint > 0 && cuts) {
        const gl = POSE.glint; resetPose(); POSE.glint = gl;
        idlePose(A, I, (j + 0.5) / NFR * per, amp, dsz, n); layoutTops(cuts, dsz);
        drawGlint(g, A, cuts, dsz, now, dx + dsz / 2 + POSE.tx, dy + dsz * 0.9 + POSE.ty, flip * POSE.gsx, POSE.gsy, a0);
      }
      return true;
    }
  }
  const P = POSE, alpha = P.alpha >= 0 ? P.alpha : a0;
  g.save();
  g.globalAlpha = alpha;
  g.imageSmoothingEnabled = true;
  const ax = dx + dsz / 2 + P.tx, ay = dy + dsz * 0.9 + P.ty;
  g.translate(ax, ay);
  if (P.rot) g.rotate(P.rot);
  g.scale(P.flip * P.gsx, P.gsy);
  drawPieces(g, I, cuts, dsz, P);
  if (flash) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7 * alpha; drawPieces(g, I, cuts, dsz, P); g.globalCompositeOperation = 'source-over'; }
  g.restore();
  if (cuts && P.glint > 0 && !P.rot) drawGlint(g, A, cuts, dsz, now, ax, ay, P.flip * P.gsx, P.gsy, alpha);
  if (P.alpha >= 0) g.globalAlpha = P.alpha; // 倒下时叠加资讯跟着一起淡出
  return true;
}

// 单位下方：脚印
function unitAnimGround(g, now, ts) {
  if (!PRINTS.length) return;
  const a0 = g.globalAlpha;
  for (let i = PRINTS.length - 1; i >= 0; i--) {
    const p = PRINTS[i], k = (now - p.t0) / p.life;
    if (k >= 1 || k < -0.5) { PRINTS.splice(i, 1); continue; }
    const a = (p.flat ? 0.3 : 0.42) * (1 - k * k);
    g.fillStyle = p.col + a.toFixed(3) + ')';
    g.beginPath(); g.ellipse(p.x * ts, p.y * ts, p.r * ts * (p.flat ? 1.4 : 1), p.r * ts * (p.flat ? 0.5 : 0.62), p.rot, 0, TAU); g.fill();
  }
  g.globalAlpha = a0;
}

// 单位上方（血条下方）：尘土 / 水花 / 雪粉 / 龙息 / 升级星光
function unitAnimFront(g, now, ts) {
  if (!PARTS.length) return;
  const a0 = g.globalAlpha, sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = true;
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i], age = now - p.t0;
    if (age < 0) continue;
    const k = age / p.life;
    if (k >= 1) { PARTS.splice(i, 1); continue; }
    const s = age / 1000, x = (p.x + p.vx * s) * ts, y = (p.y + p.vy * s + 0.5 * (p.g || 0) * s * s) * ts;
    if (p.k === 'ring') {
      const r = (p.r + (p.r1 - p.r) * easeOut(k)) * ts;
      g.strokeStyle = p.col + (0.7 * (1 - k)).toFixed(3) + ')'; g.lineWidth = Math.max(1, ts * 0.03);
      g.beginPath(); g.ellipse(p.x * ts, p.y * ts, r, r * 0.38, 0, 0, TAU); g.stroke();
    } else if (p.k === 'star') {
      const r = p.r * ts * (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) * 0.6);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k * k;
      g.save(); g.translate(x, y); g.rotate(p.spin * s); g.drawImage(starTex(), -r / 2, -r / 2, r, r); g.restore();
      g.globalCompositeOperation = 'source-over';
    } else {
      const r = p.r * ts * (1 + (p.gr || 0) * k) * 2, tex = dotTex(p.col);
      g.globalAlpha = p.k === 'puff' ? (1 - k) * (k < 0.15 ? k / 0.15 : 1) : 1 - k * k;
      if (p.k === 'ember') g.globalCompositeOperation = 'lighter';
      g.drawImage(tex, x - r / 2, y - r / 2, r, r);
      g.globalCompositeOperation = 'source-over';
    }
  }
  g.globalAlpha = a0; g.imageSmoothingEnabled = sm;
}

// 攻击前：朝目标蓄势前倾（远程则向后拉弓），之后 lunge / 箭矢照常
function unitAnimWindup(a, d, ranged) {
  const dur = tms(ranged ? 150 : 130);
  if (!a || !d || dur <= 0 || (typeof artHD === 'function' && !artHD())) return Promise.resolve();
  const s = stOf(a), vx = d.x - a.x, vy = d.y - a.y;
  s.wind = { t0: performance.now(), dur, dx: Math.sign(vx), dy: Math.abs(vy) > Math.abs(vx) ? Math.sign(vy) : 0, ranged: !!ranged };
  if (vx) s.look = Math.sign(vx);
  return new Promise(r => setTimeout(r, dur));
}

// 升级：开心一跳 + 星光；回传的 Promise 在落地前结束（之后才弹升级视窗）
function unitAnimLevelUp(u) {
  const dur = tms(620);
  if (!u || dur <= 0 || (typeof artHD === 'function' && !artHD())) return Promise.resolve();
  const now = performance.now(), s = stOf(u);
  s.lv = { t0: now, dur };
  sparkle(u, now, 8, TS);
  part({ k: 'ring', x: (u.px ?? u.x) + 0.5, y: (u.py ?? u.y) + 0.86, t0: now, life: 600, r: 0.1, r1: 0.7, col: 'rgba(255,226,120,' });
  return new Promise(r => setTimeout(r, dur * 0.85));
}

G.unitAnimDraw = unitAnimDraw;
G.unitAnimGround = unitAnimGround;
G.unitAnimFront = unitAnimFront;
G.unitAnimWindup = unitAnimWindup;
G.unitAnimLevelUp = unitAnimLevelUp;
G.UNITANIM = { off: false, live: false, stat: null, parts: PARTS, prints: PRINTS, info: (u, spr) => ({ A: gridInfo(u), I: CV.get(spr) }) }; // 调试 / 量测用
})(window);
