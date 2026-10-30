// 超时空英雄传说 · 移动重制版 —— 战斗画面的纸娃娃角色
// 侧视像素人物：按职业系 × 阶级程序绘制（头、发、躯干、四肢、武器、披风 / 盾 / 坐骑 / 翅膀），
// 每帧在低解析度离屏画布上做软件光栅化（1px 深色描边、左上受光），再以最近邻放大到战斗画面。
// 姿势 = 一组关节角度；动作 = 关键帧 + 插值（见 DFIG.plan / react），由 js/duel.js 驱动。
'use strict';

const DFIG = (() => {
  const FW = 208, FH = 164, OX = 104, OY = 150; // 离屏画布与脚底原点
  const RAD = Math.PI / 180;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const dv = (a, l = 1) => [Math.sin(a * RAD) * l, Math.cos(a * RAD) * l]; // 0 = 向下、90 = 向前、180 = 向上
  const add = (p, q, k = 1) => [p[0] + q[0] * k, p[1] + q[1] * k];
  const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const angOf = (p, q) => Math.atan2(q[0] - p[0], q[1] - p[1]) / RAD;

  // ---------------- 调色盘（每色自动生成 亮 / 暗 / 深 三阶） ----------------
  const PAL = [0], PL = [0], PD = [0], PDD = [0], PIX = {};
  const pk = (r, g, b) => ((255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
  function rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function pc(h) {
    if (!h) return 0;
    let i = PIX[h]; if (i) return i;
    const [r, g, b] = rgb(h); i = PAL.length;
    PAL.push(pk(r, g, b));
    PL.push(pk(r + (255 - r) * 0.42, g + (250 - g) * 0.42, b + (236 - b) * 0.36));
    PD.push(pk(r * 0.64, g * 0.62, b * 0.74));
    PDD.push(pk(r * 0.4, g * 0.36, b * 0.52));
    return (PIX[h] = i);
  }
  const OUTC = pk(20, 10, 30), WHITE = pk(255, 255, 255);

  // ---------------- 软件光栅器 ----------------
  const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
  const cvx = cv.getContext('2d');
  const img = cvx.createImageData(FW, FH), U32 = new Uint32Array(img.data.buffer);
  const COL = new Uint16Array(FW * FH), ID = new Uint8Array(FW * FH), FL = new Uint8Array(256), GR = new Uint8Array(256);
  const SH = 1, OL = 2, DIM = 4, FLAT = 8;
  const NF = SH | OL, BF = SH | OL | DIM;
  let F = 1, cur = 0;
  function clear() { COL.fill(0); ID.fill(0); cur = 0; }
  // 新部件：不同部件之间会画内描边；join = 与该部件同组（不描边）
  function part(fl = NF, join) { cur = Math.min(255, cur + 1); FL[cur] = fl; GR[cur] = join ? GR[join] : cur; return cur; }
  function fill(x0, y0, x1, y1, ins, c) {
    let bx0, bx1;
    if (F > 0) { bx0 = Math.floor(OX + x0); bx1 = Math.ceil(OX + x1); } else { bx0 = Math.floor(OX - x1); bx1 = Math.ceil(OX - x0); }
    bx0 = Math.max(0, bx0); bx1 = Math.min(FW - 1, bx1);
    const by0 = Math.max(0, Math.floor(OY + y0)), by1 = Math.min(FH - 1, Math.ceil(OY + y1));
    const fn = typeof c === 'function';
    for (let by = by0; by <= by1; by++) {
      const py = by + 0.5 - OY; let i = by * FW + bx0;
      for (let bx = bx0; bx <= bx1; bx++, i++) {
        const px = (bx + 0.5 - OX) * F, r = ins(px, py);
        if (r === false) continue;
        const col = fn ? c(px, py, r) : c;
        if (col) { COL[i] = col; ID[i] = cur; }
      }
    }
  }
  function disc(p, r, c) { const x = p[0], y = p[1], r2 = r * r; fill(x - r, y - r, x + r, y + r, (px, py) => (px - x) * (px - x) + (py - y) * (py - y) <= r2 || false, c); }
  function ring(p, r0, r1, c) { const x = p[0], y = p[1]; fill(x - r1, y - r1, x + r1, y + r1, (px, py) => { const d = Math.hypot(px - x, py - y); return (d <= r1 && d >= r0) || false; }, c); }
  function dot(p, c) { const x = p[0], y = p[1]; fill(x - 0.5, y - 0.5, x + 0.5, y + 0.5, (px, py) => (Math.abs(px - x) <= 0.5 && Math.abs(py - y) <= 0.5) || false, c); }
  function cap(a, b, r0, r1, c) {
    if (r1 == null) r1 = r0;
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-6, R = Math.max(r0, r1);
    fill(Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, (px, py) => {
      let t = ((px - a[0]) * dx + (py - a[1]) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - a[0] - t * dx, ey = py - a[1] - t * dy, r = r0 + (r1 - r0) * t;
      return ex * ex + ey * ey <= r * r ? t : false;
    }, c);
  }
  function chain(pts, r0, r1, c) { const n = pts.length - 1; for (let i = 0; i < n; i++) cap(pts[i], pts[i + 1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, c); }
  function poly(pts, c) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const n = pts.length;
    fill(x0, y0, x1, y1, (px, py) => {
      let ins = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] > py) !== (b[1] > py) && px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins;
      }
      return ins;
    }, c);
  }
  function ell(p, rx, ry, a, c) {
    const s = Math.sin(a * RAD), co = Math.cos(a * RAD), R = Math.max(rx, ry), x = p[0], y = p[1];
    fill(x - R, y - R, x + R, y + R, (px, py) => { const dx = px - x, dy = py - y, u = dx * co + dy * s, v = -dx * s + dy * co; return u * u / (rx * rx) + v * v / (ry * ry) <= 1 || false; }, c);
  }
  // 着色：内描边（后方部件紧贴前方部件处）→ 左上亮边 → 右下暗边；外围 1px 深色描边
  function finish(flash, sil) {
    const SIL = sil ? pk(...rgb(sil)) : 0;
    const W = FW;
    for (let y = 0; y < FH; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, c = COL[i];
        const up = y ? ID[i - W] : 0, dn = y < FH - 1 ? ID[i + W] : 0, lf = x ? ID[i - 1] : 0, rt = x < W - 1 ? ID[i + 1] : 0;
        if (!c) {
          U32[i] = ((up && FL[up] & OL) || (dn && FL[dn] & OL) || (lf && FL[lf] & OL) || (rt && FL[rt] & OL)) ? (SIL || OUTC) : 0;
          continue;
        }
        if (SIL) { U32[i] = SIL; continue; }
        const p = ID[i], f = FL[p], g = GR[p];
        if (f & FLAT) { U32[i] = flash ? WHITE : PAL[c]; continue; }
        if ((up > p && GR[up] !== g && FL[up] & OL) || (dn > p && GR[dn] !== g && FL[dn] & OL) || (lf > p && GR[lf] !== g && FL[lf] & OL) || (rt > p && GR[rt] !== g && FL[rt] & OL)) {
          U32[i] = flash ? OUTC : PDD[c]; continue;
        }
        if (flash) { U32[i] = WHITE; continue; }
        let lev = 1;
        if (f & SH) {
          if (GR[up] !== g || GR[lf] !== g) lev = 2;
          else if (GR[dn] !== g || GR[rt] !== g) lev = 0;
        }
        if (f & DIM) lev--;
        U32[i] = lev >= 2 ? PL[c] : lev === 1 ? PAL[c] : lev === 0 ? PD[c] : PDD[c];
      }
    }
    cvx.putImageData(img, 0, 0);
  }

  // ---------------- 颜色 ----------------
  const C = {
    skin: '#f2c79a', iron: '#9a9aa8', dIron: '#5e5e6e', steel: '#c4ccd8', dSteel: '#7a8296', silver: '#e8eef8', gold: '#f4c542', dGold: '#b07a1e',
    leather: '#8a5a2c', dLeather: '#5a3618', brown: '#7a4a2a', dBrown: '#4a2a14', linen: '#e4dcc0', white: '#f6f6fa', pearl: '#c8ccd8',
    red: '#d83a3a', dRed: '#9a1e24', purple: '#6a3a8a', dPurple: '#3a2050', black: '#34303e', cyan: '#7ad8ff', blade: '#eaf8ff', wood: '#9a6434',
    bone: '#e8dcc0', hakama: '#3a3448', pants: '#4a4258', green: '#3aa860', eye: '#1a1020',
  };
  const HAIR_STYLE = { mengqi: 'spiky', yangtie: 'short', klein: 'spiky', slade: 'topknot', oz: 'short', xueer: 'pony', judy: 'pony', wushuang: 'long', qu: 'bald',
    hao: 'long', lian: 'long', dvra: 'long', liu: 'short', kaidi: 'long', hake: 'short', augustus: 'short', zhangqing: 'long' };
  const BEARD = { qu: 1, hake: 1, augustus: 1, zhangqing: 1 };
  // 超时空英雄传说2 的英雄发型
  Object.assign(HAIR_STYLE, { qingfeng: 'spiky', bai: 'short', eva: 'pony', nuolu: 'spiky', sonia: 'pony', shamanshan: 'long', furong: 'long', qili: 'short',
    kehelin: 'spiky', maisi: 'short', tao: 'short', bobi: 'spiky', kouqi: 'pony', lida: 'long', beiliqina: 'long', pulusi: 'long', baihe: 'pony', liqi: 'short', nushayi: 'long', xianniya: 'pony', tuoli: 'long', nafeiya: 'long', sisi: 'long', bailandi: 'long',
    qiuyue: 'pony', aifulin: 'long', feishuang: 'long', luosha: 'pony', aopaer: 'long', lan: 'short', natalia: 'pony', su: 'long', muer: 'spiky', taipu: 'short', daixi: 'pony', gusitafu: 'short', baoer: 'pony', kelite: 'long', crebtree: 'long', laweisi: 'short', jienuo: 'short', xiaoling: 'pony', yilinna: 'long', aiwen: 'topknot', rentian: 'short', xingtian: 'long' });

  // ---------------- 外观规格：职业系 × 阶级 ----------------
  const SW = (len, c, g, o) => Object.assign({ k: 'sword', len, c, g, grip: C.dLeather }, o);
  const STAFF = (len, top, o) => Object.assign({ k: 'staff', len, top, wood: C.wood }, o);
  const LINES = {
    // 作家系（孟祈）：外套 → 旅行斗篷 → 皮甲白头带 → 钢甲白披风银环 → 银甲金肩阵营披风 → 金甲紫披风王冠 → 白金圣甲 + 光剑
    writer: (t, p, q) => [
      { armor: { t: 'coat', c: '#7a4a2a' }, wpn: SW(15, '#d8c08a', '#7a4a2a', { wood: 1 }) },
      { armor: { t: 'coat', c: '#7a4a2a' }, cape: { c: '#7a4a2a', c2: '#4a2a14' }, buckle: C.iron, wpn: SW(18, C.steel, C.dSteel) },
      { armor: { t: 'leather', c: C.leather, c2: C.dLeather }, cape: { c: '#7a4a2a', c2: '#4a2a14' }, pads: { c: C.steel }, head: { t: 'band', c: C.white, tail: 1 }, buckle: C.gold, wpn: SW(19, C.blade, C.gold) },
      { armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, cape: { c: C.white, c2: C.pearl, trim: C.gold }, pads: { c: C.white }, head: { t: 'circlet', c: C.silver, gem: C.cyan }, skirt: { t: 'tunic', c: p }, wpn: SW(20, C.blade, C.gold) },
      { armor: { t: 'plate', c: C.silver, c2: C.dSteel, trim: C.gold }, emblem: p, cape: { c: p, c2: q, trim: C.gold }, pads: { c: C.gold, big: 1 }, head: { t: 'circlet', c: C.gold, gem: C.cyan }, greave: C.gold, skirt: { t: 'tassets', c: C.silver, c2: p }, wpn: SW(21, C.blade, C.gold, { big: 1 }) },
      { armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, cape: { c: C.purple, c2: C.dPurple, trim: C.gold }, pads: { c: C.gold, big: 1 }, head: { t: 'crown', c: C.gold, gem: C.cyan }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: SW(22, C.blade, C.gold, { big: 1 }) },
      { armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: C.gold, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 34 }, pads: { c: C.gold, big: 1 }, head: { t: 'crown', c: C.gold, gem: C.cyan }, greave: C.gold, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: SW(25, '#ffffff', C.gold, { big: 1, glow: '#a8ecff' }), aura: '#ffe890', sparkle: 1 },
    ][t],
    // 剑士系：布衣铁剑 → 头带皮甲小圆盾 → 银盔钢甲披风鸢盾 → 金盔红缨金甲 → 白缨白金甲 + 光剑
    swordsman: (t, p, q) => [
      { skirt: { t: 'tunic', c: p }, wpn: SW(16, C.iron, C.dLeather) },
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, pads: { c: C.steel }, skirt: { t: 'tunic', c: p }, shield: { s: 'round', c: C.wood, c2: C.iron }, wpn: SW(18, C.steel, C.dSteel) },
      { head: { t: 'helm', c: C.steel, nasal: 1 }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, cape: { c: p, c2: q }, skirt: { t: 'tunic', c: p }, shield: { s: 'kite', c: C.steel, c2: C.dSteel, e: p }, wpn: SW(19, C.blade, C.steel) },
      { head: { t: 'helm', c: C.gold, plume: C.red, nasal: 1 }, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold }, skirt: { t: 'tassets', c: C.gold, c2: p }, shield: { s: 'kite', c: C.gold, c2: C.dGold, e: p }, wpn: SW(21, C.blade, C.gold, { big: 1 }) },
      { head: { t: 'helm', c: C.gold, plume: C.white, crest: C.cyan, nasal: 1 }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: C.gold, pads: { c: C.white, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.gold, c2: p }, shield: { s: 'kite', c: C.white, c2: C.gold, e: p }, wpn: SW(24, '#ffffff', C.gold, { big: 1, glow: '#a8ecff' }), aura: '#fff0a0', sparkle: 1 },
    ][t],
    // 骑兵系：棕马铁矛 → 披甲战马钢甲 + 枪旗 → 白色战马银盔红缨 → 天马金甲 → 飞龙暗金角盔
    knight: (t, p, q) => [
      { head: { t: 'kettle', c: C.iron }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, wpn: { k: 'lance', len: 34, c: C.iron }, mount: { t: 'horse', c: '#a0683a', m: '#4a2a14', blanket: p } },
      { head: { t: 'helm', c: C.steel, nasal: 1 }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, wpn: { k: 'lance', len: 38, c: C.steel, flag: p }, mount: { t: 'horse', c: '#8a5630', m: '#2a1a10', bard: p, trim: C.steel, plate: C.steel } },
      { head: { t: 'helm', c: C.silver, plume: C.red, visor: 1 }, armor: { t: 'plate', c: C.silver, c2: C.dSteel }, emblem: p, pads: { c: C.silver, big: 1 }, cape: { c: p, c2: q, len: 24 }, wpn: { k: 'lance', len: 40, c: C.blade, flag: p, gold: 1 }, mount: { t: 'horse', c: '#f2f2f6', m: '#e0d0a0', bard: p, trim: C.gold, plate: C.silver } },
      { head: { t: 'helm', c: C.gold, plume: p, visor: 1 }, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 24 }, wpn: { k: 'lance', len: 42, c: C.blade, flag: p, gold: 1 }, mount: { t: 'pegasus', c: '#f6f6fc', m: '#e8f0ff', bard: p, trim: C.gold, plate: C.gold, wing: '#ffffff', wing2: '#bcd8ff' } },
      { head: { t: 'helm', c: '#4a4658', plume: C.red, horns: C.gold, visor: 1 }, armor: { t: 'plate', c: '#5a5668', c2: '#34303e', trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.gold, len: 24 }, wpn: { k: 'lance', len: 46, c: '#ffffff', flag: p, gold: 1, glow: '#ffb070' }, mount: { t: 'wyvern', c: '#4a8a5a', c2: '#2a5a3a', belly: '#d8c890', blanket: p, trim: C.gold }, aura: '#ffb060', sparkle: 1 },
    ][t],
    // 战士系：头巾手斧 → 赤膊战斧 → 钢盔双刃斧 → 金盔白披风 → 金角盔红披风 + 巨斧
    fighter: (t, p, q) => [
      { head: { t: 'bandana', c: C.red }, armor: { t: 'vest', c: C.leather }, wpn: { k: 'axe', len: 16, h: 0, c: C.iron } },
      { head: { t: 'bandana', c: C.red }, armor: { t: 'bare', c: C.dLeather }, pads: { c: '#c8b088', fur: 1 }, bracer: C.leather, pants: p, wpn: { k: 'axe', len: 20, h: 1, c: C.steel } },
      { head: { t: 'helm', c: C.steel, crest: C.gold }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel, big: 1 }, skirt: { t: 'tunic', c: p }, wpn: { k: 'axe', len: 22, h: 2, c: C.steel } },
      { head: { t: 'helm', c: C.gold, crest: C.white }, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: C.white, c2: C.pearl, trim: C.gold }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: { k: 'axe', len: 23, h: 2, c: C.blade, g: C.gold } },
      { head: { t: 'helm', c: C.gold, crest: C.red, horns: C.white }, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: C.red }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: C.red, c2: C.dRed, trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: { k: 'axe', len: 26, h: 3, c: C.blade, g: C.gold, glow: '#a8ecff' }, aura: '#ffd070', sparkle: 1 },
    ][t],
    // 武士系：发髻和服 → 钵卷 + 胴甲 → 黑兜 + 袖甲 → 锹形金角 + 阵羽织 → 金月前立 + 背旗
    samurai: (t, p, q) => [
      { hs: 'topknot', collar: C.white, wide: 1, pants: C.hakama, belt: C.white, wpn: { k: 'katana', len: 24, c: C.steel, g: C.dIron } },
      { hs: 'topknot', head: { t: 'band', c: C.white, tail: 1 }, armor: { t: 'do', c: '#3a3646', c2: p }, collar: C.white, wide: 1, pants: C.hakama, belt: C.white, wpn: { k: 'katana', len: 25, c: C.blade, g: C.dIron } },
      { head: { t: 'kabuto', c: '#2e2a38', crest: 'bar', cc: C.gold }, armor: { t: 'do', c: '#2e2a38', c2: p }, pads: { c: '#2e2a38', c2: p, sode: 1 }, wide: 1, pants: C.hakama, belt: C.red, wpn: { k: 'katana', len: 25, c: C.blade, g: C.gold } },
      { head: { t: 'kabuto', c: p, crest: 'horns', cc: C.gold }, armor: { t: 'do', c: p, c2: C.gold }, pads: { c: p, c2: C.gold, sode: 1 }, cape: { c: '#4a4658', c2: '#2e2a38', trim: C.gold }, wide: 1, pants: C.hakama, belt: C.red, wpn: { k: 'katana', len: 26, c: C.blade, g: C.gold } },
      { head: { t: 'kabuto', c: C.gold, crest: 'moon', cc: C.gold, c2: C.dGold }, armor: { t: 'do', c: C.gold, c2: C.red }, pads: { c: C.gold, c2: C.red, sode: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.gold }, banner: { c: p, c2: q }, wide: 1, pants: C.hakama, belt: C.red, wpn: { k: 'katana', len: 28, c: '#ffffff', g: C.gold, glow: '#a8ecff' }, aura: '#ffe080', sparkle: 1 },
    ][t],
    // 弓箭系：皮帽短弓 → 兜帽长弓箭筒 → 羽帽金弓披风 → 钢盔十字弩 → 羽盔连弩
    archer: (t, p, q) => [
      { head: { t: 'cap', c: C.leather }, armor: { t: 'vest', c: C.leather }, wpn: { k: 'bow', size: 11, c: C.wood } },
      { head: { t: 'hood', c: q }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, quiver: 1, wpn: { k: 'bow', size: 14, c: C.wood } },
      { head: { t: 'feather', c: p, band: C.gold, plume: C.red }, armor: { t: 'leather', c: '#6a4a2a', c2: C.gold }, cape: { c: q, c2: C.dPurple, len: 24 }, quiver: 1, wpn: { k: 'bow', size: 15, c: C.gold, tip: C.white } },
      { head: { t: 'kettle', c: C.steel }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, skirt: { t: 'tunic', c: p }, wpn: { k: 'xbow', c: C.wood, m: C.steel } },
      { head: { t: 'helm', c: C.gold, plume: C.red, nasal: 1 }, armor: { t: 'plate', c: C.silver, c2: C.dSteel, trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 26 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: { k: 'xbow', c: C.gold, m: C.silver, big: 1 }, aura: '#ffe890', sparkle: 1 },
    ][t],
    // 牧师系：麻布修士袍 + 木杖 → 白兜帽 + 十字杖 → 金环圣带 + 圣环杖 → 主教冠 + 披风 + 牧杖 → 金冠白金袍 + 日轮杖
    priest: (t, p, q) => [
      { robe: { c: '#cbbf9a', trim: p }, belt: C.brown, wpn: STAFF(30, 'knob') },
      { head: { t: 'hood', c: C.white }, robe: { c: C.white, trim: p }, belt: p, wpn: STAFF(32, 'cross', { tc: C.gold }) },
      { head: { t: 'circlet', c: C.gold, gem: p }, robe: { c: C.white, trim: C.gold }, mantle: { c: p, trim: C.gold }, belt: C.gold, wpn: STAFF(34, 'ring', { tc: C.gold, gem: C.cyan }) },
      { head: { t: 'mitre', c: C.white, c2: C.gold }, robe: { c: C.white, trim: C.gold }, mantle: { c: p, trim: C.gold }, cape: { c: p, c2: q, trim: C.gold, len: 32 }, belt: C.gold, wpn: STAFF(36, 'crozier', { tc: C.gold, wood: C.gold }) },
      { head: { t: 'mitre', c: C.gold, c2: C.white, gem: C.red, tall: 1 }, robe: { c: C.white, trim: C.gold, c2: '#fff4d0' }, mantle: { c: C.gold, trim: C.white }, cape: { c: p, c2: q, trim: C.gold, len: 36 }, belt: p, wpn: STAFF(40, 'sun', { tc: C.gold, wood: C.gold, glow: '#fff6b0' }), aura: '#fff6c0', halo: 1, sparkle: 1 },
    ][t],
    // 法师系：阵营色布袍短杖 → 尖帽 + 蓝宝石杖 → 金带帽 + 水晶杖 → 星纹大帽 + 紫斗篷 + 星杖 → 白金大帽 + 光球大杖
    mage: (t, p, q) => [
      { robe: { c: p, trim: q }, belt: C.brown, wpn: STAFF(24, 'gem', { gem: C.cyan }) },
      { head: { t: 'wizhat', c: p }, robe: { c: p, trim: q }, belt: C.brown, wpn: STAFF(30, 'gem', { gem: C.cyan }) },
      { head: { t: 'wizhat', c: p, band: C.gold }, robe: { c: p, trim: C.gold }, mantle: { c: q, trim: C.gold }, belt: C.gold, wpn: STAFF(33, 'crystal', { gem: C.cyan }) },
      { head: { t: 'wizhat', c: C.purple, band: C.gold, star: C.gold, big: 1 }, robe: { c: p, trim: C.gold }, cape: { c: C.purple, c2: C.dPurple, trim: C.gold, len: 32 }, belt: C.gold, wpn: STAFF(36, 'orb', { gem: '#c890ff', glow: '#e8d0ff', tc: C.gold }) },
      { head: { t: 'wizhat', c: C.white, band: C.gold, star: C.gold, gem: C.cyan, big: 1 }, robe: { c: C.white, trim: C.gold, sash: p }, mantle: { c: p, trim: C.gold }, cape: { c: p, c2: q, trim: C.gold, len: 36 }, belt: C.gold, wpn: STAFF(40, 'orb', { gem: C.cyan, glow: '#c8f4ff', tc: C.gold, big: 1, wood: C.gold }), aura: '#a8e8ff', sparkle: 1 },
    ][t],
    // 咒术师系：暗紫兜帽袍 + 骷髅杖 → 深兜帽遮脸（只见发光双眼）+ 高领斗篷 → 角冠黑金袍 + 紫光球杖
    sorcerer: (t, p, q) => [
      { head: { t: 'hood', c: C.dPurple }, robe: { c: '#4a2a5a', trim: p }, belt: C.brown, wpn: STAFF(30, 'skull', { wood: '#6a5a40' }) },
      { head: { t: 'cowl', c: '#2a1a3a', eyes: '#ff60ff' }, robe: { c: '#3a2048', trim: p }, mantle: { c: '#2a1a3a', trim: p, collar: 1 }, belt: p, wpn: STAFF(34, 'skull', { wood: '#e8dcc0', gem: '#c060ff' }) },
      { head: { t: 'cowl', c: '#1e1428', eyes: '#ff70ff', horns: C.gold }, robe: { c: '#241830', trim: C.gold }, mantle: { c: '#1e1428', trim: C.gold, collar: 1 }, cape: { c: p, c2: C.dPurple, trim: C.gold, len: 36 }, belt: C.gold, wpn: STAFF(38, 'orb', { gem: '#b040ff', glow: '#e0a0ff', tc: C.gold, wood: '#2a2030', big: 1 }), aura: '#c060ff', sparkle: 1 },
    ][t],
    // 魔剑使（刘队长）：黑面甲（青光双眼）+ 暗紫锁甲 + 阵营披风 + 符文青光剑
    spellblade: (t, p, q) => ({ head: { t: 'mask', c: '#3a3648', eyes: C.cyan }, armor: { t: 'chain', c: '#5a4a72', c2: '#3a2c50' }, tabard: C.dPurple, emblem: C.cyan, pads: { c: '#4a4060', big: 1 }, cape: { c: p, c2: q, trim: C.cyan, len: 32 }, wpn: SW(22, '#c8f4ff', C.dPurple, { glow: '#7ad8ff', runes: 1 }), aura: '#7ad8ff' }),
    // 大剑师（张青）：白发长须、白色道袍、阵营腰带、白金剑
    master: (t, p, q) => ({ robe: { c: C.white, trim: C.pearl, short: 1 }, belt: p, sash: p, wide: 1, pants: C.white, wpn: SW(24, '#ffffff', C.gold, { glow: '#e0f6ff' }), aura: '#ffffff', sparkle: 1 }),
    // 鹰族：鹰首 + 双翼；皮带爪 → 钢胸甲长枪 → 金甲白翼光枪
    hawk: (t, p, q, u) => {
      const fe = u.hair || '#8a5a2a';
      return [
        { beast: 'hawk', armor: { t: 'harness', c: C.leather }, skirt: { t: 'tunic', c: p }, wings: { c: fe, c2: '#e8dcc0' }, wpn: { k: 'claw', c: C.bone } },
        { beast: 'hawk', head: { t: 'beakhelm', c: C.steel }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, skirt: { t: 'tunic', c: p }, wings: { c: fe, c2: C.white }, wpn: { k: 'lance', len: 34, c: C.steel, flag: p } },
        { beast: 'hawk', head: { t: 'beakhelm', c: C.gold, crest: C.red }, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wings: { c: C.white, c2: C.gold, big: 1 }, wpn: { k: 'lance', len: 38, c: C.blade, flag: p, gold: 1, glow: '#fff0a0' }, aura: '#fff0a0', sparkle: 1 },
      ][t];
    },
    // 狼族：狼首 + 尾；兽皮腰布 → 钢护肩铁爪 → 金甲阵营披风光爪
    wolf: (t, p, q, u) => {
      const fur = u.hair || '#6a6a7a';
      return [
        { beast: 'wolf', fur, armor: { t: 'harness', c: C.leather }, skirt: { t: 'tunic', c: p }, wpn: { k: 'claw', c: C.bone } },
        { beast: 'wolf', fur, armor: { t: 'harness', c: C.steel, plate: 1 }, pads: { c: C.steel, big: 1 }, bracer: C.steel, skirt: { t: 'tunic', c: p }, wpn: { k: 'claw', c: C.steel, big: 1 } },
        { beast: 'wolf', fur, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, bracer: C.gold, cape: { c: p, c2: q, trim: C.gold }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: { k: 'claw', c: '#ffffff', big: 1, glow: '#a8ecff' }, aura: '#ffd070', sparkle: 1 },
      ][t];
    },
    // ---- 敌方人类兵种 ----
    soldier: (t, p) => ({ head: { t: 'kettle', c: C.iron }, armor: { t: 'chain', c: C.steel, c2: C.dSteel }, tabard: p, shield: { s: 'round', c: C.wood, c2: C.iron, e: p }, wpn: SW(16, C.steel, C.dIron) }),
    captain: (t, p, q) => ({ head: { t: 'helm', c: C.steel, plume: p, nasal: 1 }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel, big: 1 }, cape: { c: p, c2: q }, skirt: { t: 'tunic', c: p }, shield: { s: 'kite', c: C.steel, c2: C.dSteel, e: p }, wpn: SW(19, C.blade, C.gold) }),
    crossbow: (t, p) => ({ head: { t: 'kettle', c: C.iron }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, skirt: { t: 'tunic', c: p }, wpn: { k: 'xbow', c: C.wood, m: C.iron } }),
    darkKnight: (t, p, q) => ({ head: { t: 'helm', c: '#3a3646', visor: 1, horns: '#8a8a9a', eyes: '#ff3030' }, armor: { t: 'plate', c: '#4a4658', c2: '#24202e', trim: C.dRed }, emblem: p, pads: { c: '#4a4658', big: 1 }, cape: { c: '#24202e', c2: p, trim: p, len: 26 }, wpn: { k: 'lance', len: 40, c: '#c8ccd8', flag: p, dark: 1 }, mount: { t: 'horse', c: '#2e2a36', m: '#6a1a2a', bard: '#3a3446', trim: p, plate: '#5a5668', eyes: '#ff3030' } }),
    bandit: (t, p) => ({ head: { t: 'bandana', c: C.red }, armor: { t: 'vest', c: '#6a4a2a', bare: 1 }, belt: p, pants: '#b0905a', boots: C.dBrown, bracer: C.leather, wpn: { k: 'axe', len: 16, h: 1, c: C.iron } }),
    banditRider: (t, p) => ({ head: { t: 'bandana', c: C.red }, armor: { t: 'vest', c: '#6a4a2a', bare: 1 }, belt: p, pants: '#b0905a', bracer: C.leather, wpn: { k: 'axe', len: 18, h: 1, c: C.iron }, mount: { t: 'horse', c: '#8a5a30', m: '#2a1a10', blanket: p } }),
    villager: (t, p) => ({ head: { t: 'straw', c: '#e0c070' }, armor: { t: 'tunic', c: '#9a7a50' }, belt: p, pants: '#6a5a40', boots: C.brown, wpn: { k: 'fork', len: 30, c: C.iron } }),
    king: (t, p, q) => ({ head: { t: 'crown', c: C.gold, gem: C.red, big: 1 }, beard: 1, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: C.red }, emblem: p, pads: { c: C.gold, big: 1, ermine: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.white, ermine: 1, len: 36 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: SW(22, C.blade, C.gold, { big: 1 }), aura: '#ffd070' }),
    shaman: (t, p, q, u) => {
      const v = (typeof VARIANT_PAL !== 'undefined' && VARIANT_PAL[u.element]) || {};
      return { head: { t: 'headdress', c: v.f || '#8a6a3a', c2: C.white }, robe: { c: v.f || '#8a6a3a', trim: p, c2: v.F }, mantle: { c: v.F || '#5a3a1a', trim: C.bone }, belt: p, wpn: STAFF(32, 'skull', { wood: '#7a5a3a', gem: v.f }) };
    },
  };
  LINES.emperor = LINES.king;

  // ---------------- 超时空英雄传说2：新职业系 ----------------
  Object.assign(LINES, {
    // 冒险者系（彦清风）：皮背心 → 头带圆盾 → 钢甲阔剑 → 白金英雄铠 + 光剑
    adventurer: (t, p, q) => [
      { armor: { t: 'vest', c: C.leather }, cape: { c: '#7a5a2a', c2: '#4a3418', len: 22 }, skirt: { t: 'tunic', c: p }, wpn: SW(17, C.steel, C.dLeather) },
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, pads: { c: C.steel }, cape: { c: p, c2: q, len: 26 }, skirt: { t: 'tunic', c: p }, shield: { s: 'round', c: C.wood, c2: C.iron, e: p }, wpn: SW(19, C.steel, C.dSteel) },
      { head: { t: 'circlet', c: C.silver, gem: C.cyan }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel, big: 1 }, cape: { c: p, c2: q, trim: C.silver }, skirt: { t: 'tassets', c: C.steel, c2: p }, wpn: SW(22, C.blade, C.gold, { big: 1 }) },
      { head: { t: 'crown', c: C.gold, gem: C.cyan }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: SW(25, '#ffffff', C.gold, { big: 1, glow: '#bff0ff' }), aura: '#fff0a0', sparkle: 1 },
    ][t],
    // 施法者系：法袍宝石杖 → 领主貂皮披风与王冠 → 白金圣者 + 日轮杖
    lordmage: (t, p, q) => [
      { head: { t: 'circlet', c: C.silver, gem: C.cyan }, robe: { c: p, trim: C.silver }, belt: C.brown, wpn: STAFF(30, 'gem', { gem: C.cyan, tc: C.silver }) },
      { head: { t: 'crown', c: C.gold, gem: C.red }, robe: { c: p, trim: C.gold }, cape: { c: C.dRed, c2: '#5a1018', trim: C.white, ermine: 1, len: 32 }, pads: { c: C.white, ermine: 1 }, belt: C.gold, wpn: STAFF(34, 'orb', { gem: '#ff9a7a', glow: '#ffd8c8', tc: C.gold }) },
      { head: { t: 'crown', c: C.gold, gem: C.cyan, big: 1 }, robe: { c: C.white, trim: C.gold, sash: p }, mantle: { c: p, trim: C.gold }, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 36 }, belt: C.gold, halo: 'ring', wpn: STAFF(40, 'sun', { tc: C.gold, wood: C.gold, glow: '#fff6b0' }), aura: '#fff4c0', sparkle: 1 },
    ][t],
    // 白骑士系（伊娃，女骑士）：白马枪兵 → 圣殿骑士 → 皇家骑士（旗枪）→ 魔法骑士（紫光魔枪）
    whiteKnight: (t, p, q) => [
      { armor: { t: 'leather', c: C.white, c2: C.pearl }, pads: { c: C.silver }, skirt: { t: 'tunic', c: p }, wpn: { k: 'lance', len: 34, c: C.silver }, mount: { t: 'horse', c: '#f4f4f8', m: '#e8dcc0', blanket: p } },
      { head: { t: 'circlet', c: C.gold, gem: p }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: p, pads: { c: C.white, big: 1 }, cape: { c: p, c2: q, len: 24 }, wpn: { k: 'lance', len: 38, c: C.blade, flag: p }, mount: { t: 'horse', c: '#f4f4f8', m: '#e8dcc0', bard: C.white, trim: C.gold, plate: C.silver } },
      { head: { t: 'crown', c: C.gold, gem: C.cyan }, armor: { t: 'plate', c: C.silver, c2: C.dSteel, trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 26 }, wpn: { k: 'lance', len: 42, c: C.blade, flag: p, banner: 1, gold: 1 }, mount: { t: 'horse', c: '#f6f6fa', m: '#f4c542', bard: p, trim: C.gold, plate: C.gold } },
      { head: { t: 'crown', c: C.gold, gem: '#c890ff', big: 1 }, armor: { t: 'plate', c: C.white, c2: '#b8a0e0', trim: '#8a5ad8' }, emblem: p, pads: { c: '#8a5ad8', big: 1 }, cape: { c: '#6a3aa8', c2: '#3a1a6a', trim: C.gold, len: 28 }, wpn: { k: 'lance', len: 44, c: '#f0e0ff', flag: p, gold: 1, glow: '#c890ff' }, mount: { t: 'horse', c: '#f6f6fa', m: '#c8a0ff', bard: '#6a3aa8', trim: C.gold, plate: C.silver }, aura: '#c890ff', sparkle: 1 },
    ][t],
    // 幻术师系（芙蓉）：紫袍水晶杖 → 高领斗篷 → 小角黑袍 → 幻魔（大角、蝠翼、红光）
    illusionist: (t, p, q) => [
      { head: { t: 'circlet', c: C.silver, gem: '#ff70c0' }, robe: { c: '#6a3a8a', trim: p }, belt: p, wpn: STAFF(30, 'crystal', { gem: '#ff90d0' }) },
      { head: { t: 'circlet', c: C.gold, gem: '#ff70c0' }, robe: { c: '#4a2a6a', trim: C.gold, sash: p }, mantle: { c: '#2a1a40', trim: '#ff70c0', collar: 1 }, belt: C.gold, wpn: STAFF(34, 'orb', { gem: '#ff70c0', glow: '#ffc0e8', tc: C.gold }) },
      { head: { t: 'horns', c: '#3a2a4a', gem: '#ff3060' }, robe: { c: '#24182e', trim: C.gold, sash: p }, cape: { c: '#5a1028', c2: '#24182e', trim: C.gold, len: 34 }, belt: C.gold, wpn: STAFF(36, 'orb', { gem: '#c040ff', glow: '#e0a0ff', tc: C.gold, wood: '#2a2030' }), aura: '#c060ff', sparkle: 1 },
      { head: { t: 'horns', c: '#1a1018', big: 1, gem: '#ff2040' }, robe: { c: '#1a0e20', trim: '#ff3060', sash: p }, cape: { c: '#3a0a18', c2: '#14080e', trim: '#ff3060', len: 36 }, bwings: { c: '#2a1430', c2: '#6a1a3a' }, belt: '#ff3060', wpn: STAFF(40, 'orb', { gem: '#ff2040', glow: '#ff90a0', tc: '#ff3060', wood: '#1a1018', big: 1 }), aura: '#ff3080', sparkle: 1 },
    ][t],
    // 御风剑士系（秋月，女剑客）：长围巾随风飘动；疾风突进斩
    windSword: (t, p, q) => [
      { shirt: '#5aa078', sleeve: '#5aa078', skirt: { t: 'tunic', c: p }, belt: C.brown, scarf: '#d8f4e8', scarfLen: 1.2, wpn: SW(18, C.steel, C.dLeather), style: 'dash' },
      { head: { t: 'band', c: '#d8f4e8', tail: 1 }, armor: { t: 'leather', c: '#3a7a5a', c2: '#2a5a40' }, shirt: '#5aa078', pads: { c: C.silver }, skirt: { t: 'tunic', c: p }, scarf: '#d8f4e8', scarfLen: 1.6, wpn: SW(20, C.blade, C.silver), style: 'dash' },
      { head: { t: 'circlet', c: C.silver, gem: '#6af0b0' }, armor: { t: 'tunic', c: C.white }, shirt: C.white, sleeve: C.white, mantle: { c: '#3a8a6a', trim: C.silver }, skirt: { t: 'tunic', c: p }, belt: '#3a8a6a', scarf: '#a8f0d0', scarfLen: 2, wpn: SW(22, '#e8fff4', C.silver, { glow: '#8af0c0' }), trail: '#8af0c0', style: 'dash', sparkle: 1 },
      { head: { t: 'crown', c: C.gold, gem: '#6af0b0' }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: '#3a8a6a', pads: { c: C.gold, big: 1 }, skirt: { t: 'tassets', c: C.white, c2: p }, scarf: '#a8f0d0', scarfLen: 2.6, wpn: SW(25, '#ffffff', C.gold, { glow: '#8af0c0', big: 1 }), trail: '#8af0c0', style: 'dash', aura: '#a0ffd0', sparkle: 1 },
    ][t],
    // 祈祷师系（依琳娜，公主祭司）：白袍十字杖 → 神官战士（持枪）→ 大祭司 → 圣女（光环、日轮杖）
    prayer: (t, p, q) => [
      { head: { t: 'crown', c: C.gold, gem: C.cyan }, robe: { c: C.white, trim: p }, belt: p, wpn: STAFF(32, 'cross', { tc: C.gold }) },
      { head: { t: 'circlet', c: C.gold, gem: p }, robe: { c: C.white, trim: C.gold, short: 1 }, pads: { c: C.silver }, pants: C.white, belt: p, wpn: { k: 'lance', len: 34, c: C.blade, flag: p, gold: 1 } },
      { head: { t: 'crown', c: C.gold, gem: C.cyan, big: 1 }, robe: { c: C.white, trim: C.gold }, mantle: { c: p, trim: C.gold }, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 34 }, belt: C.gold, wpn: STAFF(36, 'ring', { tc: C.gold, gem: C.cyan }) },
      { head: { t: 'crown', c: C.gold, gem: C.red, big: 1 }, robe: { c: C.white, trim: C.gold, c2: '#fff4d0', sash: p }, mantle: { c: C.gold, trim: C.white }, cape: { c: C.white, c2: '#fff4d0', trim: C.gold, len: 38 }, wings: { c: C.white, c2: '#fff0b0' }, halo: 'ring', belt: C.gold, wpn: STAFF(40, 'sun', { tc: C.gold, wood: C.gold, glow: '#fff6b0' }), aura: '#fff6c0', sparkle: 1 },
    ][t],
    // 剑客系（刑天）：长外套 → 深红外套 → 黑金外套 + 长披风；挥剑放出剑气
    swordMad: (t, p, q) => [
      { armor: { t: 'coat', c: '#4a4a5a' }, shirt: p, pants: '#2a2a34', wpn: SW(21, C.steel, C.dIron), style: 'qi' },
      { armor: { t: 'coat', c: '#7a1a24' }, shirt: p, pads: { c: C.dSteel }, pants: '#2a2a34', wpn: SW(23, C.blade, C.dSteel, { big: 1 }), style: 'qi' },
      { armor: { t: 'coat', c: '#1e1a24' }, shirt: p, pads: { c: C.gold }, cape: { c: '#1e1a24', c2: p, trim: C.gold, len: 34 }, pants: '#1e1a24', wpn: SW(26, '#ffffff', C.gold, { big: 1, glow: '#a8d8ff' }), style: 'qi', aura: '#a8d8ff', sparkle: 1 },
    ][t],
    // 蛊师系（拉维司，部族术士）：羽冠骷髅杖 → 兽皮披肩 → 骨角王冠 + 绿光杖；远程放出蛊虫群
    gushi: (t, p, q) => [
      { head: { t: 'headdress', c: '#3a6a3a', c2: '#e8dcc0' }, armor: { t: 'vest', c: '#3a5a3a', bare: 1 }, beads: 1, skirt: { t: 'tunic', c: p }, pants: '#5a4a2a', wpn: STAFF(30, 'skull', { wood: '#6a5a3a', gem: '#7aff7a' }), style: 'gu' },
      { head: { t: 'headdress', c: '#2a5a2a', c2: '#c8f0a0' }, armor: { t: 'vest', c: '#2a4a2a', bare: 1 }, mantle: { c: '#6a5a3a', trim: '#c8f0a0', fur: 1 }, beads: 1, bracer: C.bone, skirt: { t: 'tunic', c: p }, pants: '#4a3a24', wpn: STAFF(34, 'skull', { wood: '#e8dcc0', gem: '#7aff7a' }), style: 'gu' },
      { head: { t: 'horns', c: C.bone, gem: '#7aff7a' }, robe: { c: '#1e3a1e', trim: '#7aff7a', sash: p }, cape: { c: '#2a4a1a', c2: '#14240e', trim: C.bone, len: 34 }, beads: 1, wpn: STAFF(38, 'orb', { gem: '#5aff5a', glow: '#b0ffb0', tc: C.bone, wood: '#3a2a1a' }), style: 'gu', aura: '#7aff7a', sparkle: 1 },
    ][t],
    // ---- 敌方 ----
    assassin: (t, p, q) => Object.assign({}, LINES_B.samurai(t ? 3 : 2, p, q), { scarf: p }),
    treant: (t, p) => ({ skin: '#9a7a4e', hair: '#4a9a3a', hs: 'short', eyeC: '#2a6a1a', shirt: '#6a4a2a', sleeve: '#7a5a3a', belt: p, pants: '#5a3a1a', boots: '#3a2410', wpn: { k: 'claw', c: '#5a3a1a', big: 1 }, scaleK: 1.15 }),
    goblin: (t, p) => ({ skin: '#7ab04a', hs: 'bald', head: { t: 'cap', c: C.leather }, armor: { t: 'vest', c: '#6a4a2a', bare: 1 }, belt: p, pants: '#5a4a2a', wpn: SW(11, C.iron, C.dLeather) }),
    silverWolf: (t, p) => ({ beast: 'wolf', fur: '#c8d0dc', armor: { t: 'harness', c: C.leather }, skirt: { t: 'tunic', c: p }, wpn: { k: 'claw', c: C.bone }, fast: 1 }),
    // 兽王（被魔化的杨铁）：巨大兽首、红眼、残破黑甲与红披风
    beastKing: (t, p) => ({ beast: 'wolf', fur: '#5a3a2a', armor: { t: 'plate', c: '#3a2a2a', c2: '#1a1010', trim: C.red }, emblem: p, pads: { c: '#3a2a2a', big: 1 }, cape: { c: C.dRed, c2: '#3a0a10', trim: '#1a1010', len: 32 }, skirt: { t: 'tassets', c: '#3a2a2a', c2: p }, wpn: { k: 'claw', c: '#ffe0d0', big: 1, glow: '#ff5040' }, aura: '#ff3020', scaleK: 1.45, sparkle: 1 }),
    // 复仇魔神（芙蓉）：大角、蝠翼、暗紫长袍的魔神女王
    revengeDemon: (t, p) => ({ hs: 'long', hair: '#1e1a2a', head: { t: 'horns', c: '#1a1018', big: 1, gem: '#ff2040', crown: 1 }, robe: { c: '#2a0e30', trim: '#c040ff', c2: '#14081a', sash: p }, cape: { c: '#3a0a28', c2: '#14080e', trim: '#ff3060', len: 38 }, bwings: { c: '#2a1430', c2: '#8a1a4a', big: 1 }, belt: '#c040ff', wpn: STAFF(42, 'orb', { gem: '#ff2040', glow: '#ff90c0', tc: '#c040ff', wood: '#1a1018', big: 1 }), aura: '#c040ff', scaleK: 1.4, sparkle: 1 }),
  });

  // ---------------- 北方密使（g3）：新职业系与敌兵 ----------------
  const G3 = {
    // 剑手系（白志超）：迦纳剑师外套 → 剑客长外套 → 剑宗白衣 → 霸王剑士黑金重甲
    swordHand: (t, p, q) => [
      { armor: { t: 'coat', c: '#4a5a7a' }, shirt: p, pants: '#3a3a4a', wpn: SW(18, C.steel, C.dLeather) },
      { armor: { t: 'coat', c: '#2e3448' }, shirt: p, pads: { c: C.steel }, cape: { c: '#2e3448', c2: p, len: 22 }, belt: C.silver, buckle: C.silver, pants: '#2a2a3a', wpn: SW(20, C.blade, C.dSteel) },
      { head: { t: 'circlet', c: C.silver, gem: '#7ad8ff' }, armor: { t: 'coat', c: C.white }, shirt: p, mantle: { c: '#3a5a8a', trim: C.silver }, pads: { c: C.silver }, pants: '#d8dce8', wpn: SW(22, '#eaf8ff', C.silver, { glow: '#bfe8ff' }) },
      { head: { t: 'crown', c: C.gold, gem: C.red }, armor: { t: 'plate', c: '#2a2430', c2: '#14101a', trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: '#2a2430', c2: p }, wpn: SW(27, '#ffffff', C.gold, { big: 1, glow: '#ffd8a0' }), aura: '#ffc060', sparkle: 1 },
    ][t],
    // 魔法骑士系（飞霜，女）：银蓝骑士 → 玫瑰骑士 → 女战神（羽翼冠、金甲、雷光枪）
    magicKnight: (t, p, q) => [
      { armor: { t: 'plate', c: '#c8d8f0', c2: '#7a8ab8' }, emblem: p, pads: { c: C.silver }, skirt: { t: 'tunic', c: p }, wpn: { k: 'lance', len: 36, c: '#d8f0ff', flag: p, glow: '#a8d8ff' }, mount: { t: 'horse', c: '#d8dce8', m: '#8a9ab8', blanket: p } },
      { head: { t: 'circlet', c: C.gold, gem: '#ff6a9a' }, armor: { t: 'plate', c: '#e86a8a', c2: '#9a2a4a', trim: C.gold }, emblem: C.white, pads: { c: '#f4c0d0', big: 1 }, cape: { c: '#c83a5a', c2: '#7a1a3a', trim: C.gold, len: 26 }, wpn: { k: 'lance', len: 40, c: '#ffe0ec', flag: p, gold: 1 }, mount: { t: 'horse', c: '#f4f0f4', m: '#e86a8a', bard: '#c83a5a', trim: C.gold, plate: C.silver } },
      { head: { t: 'circlet', c: C.gold, wings: C.white, gem: C.cyan }, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: C.white }, emblem: p, pads: { c: C.white, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 28 }, wpn: { k: 'lance', len: 46, c: '#ffffff', flag: p, banner: 1, gold: 1, glow: '#fff0a0' }, mount: { t: 'horse', c: '#ffffff', m: '#f4c542', bard: p, trim: C.gold, plate: C.gold }, aura: '#fff0a0', sparkle: 1 },
    ][t],
    // 杀手系（罗莎莉，女）：双刃，瞬身斩
    killer: (t, p, q) => [
      { head: { t: 'band', c: '#2a2434', tail: 1 }, armor: { t: 'harness', c: '#3a2a3a' }, shirt: '#3a2a4a', sleeve: '#3a2a4a', belt: p, pants: '#2a2434', boots: '#2a2434', scarf: p, scarfLen: 1, wpn: NINJATO(C.steel, { len: 15 }), wpn2: NINJATO(C.steel, { len: 13 }), style: 'ninja' },
      { head: { t: 'circlet', c: C.gold, gem: '#c040ff' }, armor: { t: 'harness', c: '#5a2a6a' }, shirt: '#2a1a3a', sleeve: '#2a1a3a', belt: C.gold, bracer: C.gold, pants: '#1e1428', boots: '#1e1428', scarf: '#6a3aa8', scarfLen: 1.4, wpn: NINJATO('#e8d8ff', { len: 17 }), wpn2: NINJATO('#e8d8ff', { len: 15 }), style: 'ninja', sparkle: 1 },
      { head: { t: 'feather', c: '#3a1a2a', band: C.gold, plume: C.red }, armor: { t: 'harness', c: '#4a1a2a' }, shirt: '#1e1218', sleeve: '#1e1218', cape: { c: '#8a1a3a', c2: '#2a0a14', trim: C.gold, len: 30 }, belt: p, pants: '#1e1218', boots: '#1e1218', wpn: NINJATO('#ffffff', { len: 18, glow: '#ff90b0' }), wpn2: NINJATO('#ffffff', { len: 16 }), style: 'ninja', aura: '#ff5080', sparkle: 1 },
    ][t],
    // 连弩手系（娜塔莉亚，奚族）：兽毛背心手弩 → 射手连弩 → 骑弓手（骑草原马）
    crossbowman: (t, p, q) => [
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'vest', c: '#8a6a3a' }, mantle: { c: '#8a6a3a', trim: '#f0e0c0', fur: 1 }, skirt: { t: 'tunic', c: p }, pants: '#6a4a2a', wpn: { k: 'xbow', c: C.wood, m: C.iron } },
      { head: { t: 'feather', c: '#6a4a2a', band: p, plume: '#e8dcc0' }, armor: { t: 'leather', c: '#7a4a2a', c2: '#4a2a14' }, mantle: { c: '#8a6a3a', trim: '#f0e0c0', fur: 1 }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'xbow', c: C.wood, m: C.steel, big: 1 } },
      { head: { t: 'feather', c: p, band: C.gold, plume: C.red }, armor: { t: 'leather', c: '#8a5a2a', c2: C.gold }, mantle: { c: '#a07a4a', trim: '#f4ecd8', fur: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 24 }, wpn: { k: 'xbow', c: C.gold, m: C.silver, big: 1 }, mount: { t: 'horse', c: '#8a5a30', m: '#2a1a10', blanket: p }, sparkle: 1 },
    ][t],
    // 通灵使系（苏，奚族巫医）：羽冠铃杖 → 兽皮披肩与灵球 → 召唤师（多颗灵球）
    medium: (t, p, q) => [
      { head: { t: 'headdress', c: '#e8e0c8', c2: p }, robe: { c: '#e8dcc0', trim: p }, beads: 1, belt: p, wpn: STAFF(30, 'ring', { tc: C.gold, gem: '#ffe080' }) },
      { head: { t: 'headdress', c: '#3a8a8a', c2: C.white }, robe: { c: '#2a7a7a', trim: C.gold, sash: p }, mantle: { c: '#a07a4a', trim: '#f4ecd8', fur: 1 }, beads: 1, belt: C.gold, orbs: ['#a0f0ff'], wpn: STAFF(34, 'orb', { gem: '#7af0ff', glow: '#c8f8ff', tc: C.gold }) },
      { head: { t: 'headdress', c: C.gold, c2: C.white }, robe: { c: '#1e5a6a', trim: C.gold, sash: p }, cape: { c: p, c2: q, trim: C.gold, len: 34 }, beads: 1, belt: C.gold, orbs: ['#a0f0ff', '#ffe080', '#ff90c0'], wpn: STAFF(38, 'crystal', { gem: '#c8f8ff', tc: C.gold }), aura: '#a0f0ff', sparkle: 1 },
    ][t],
    // 小孩（宝儿）→ 宝儿神：浮空、光环、小翅膀
    child: (t, p, q) => [
      { robe: { c: '#f0a8c0', trim: p, short: 1 }, pants: '#f4ecd8', belt: p, wpn: STAFF(20, 'knob'), scaleK: 0.85 },
      { head: { t: 'circlet', c: C.gold, gem: '#ff90c0' }, robe: { c: C.white, trim: C.gold, c2: '#fff4d0', sash: p }, wings: { c: C.white, c2: '#ffe0f0' }, halo: 'ring', hover: 1, belt: C.gold, wpn: STAFF(26, 'sun', { tc: C.gold, wood: C.gold, glow: '#fff6b0' }), aura: '#ffe0f0', sparkle: 1, scaleK: 0.95 },
    ][t],
    // 贵族公主（奥帕儿，沙漠明珠）
    princess: (t, p, q) => ({ head: { t: 'veil', c: '#f4e8c8', c2: C.gold, gem: C.red }, robe: { c: '#8a3a8a', trim: C.gold, sash: p }, mantle: { c: C.gold, trim: '#8a3a8a' }, belt: C.gold, beads: 1, wpn: STAFF(30, 'gem', { gem: C.red, tc: C.gold, wood: C.gold }), sparkle: 1 }),
    // 武师系（岚）：徒手连打
    martial: (t, p, q) => [
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'tunic', c: '#5a7a5a' }, shirt: '#5a7a5a', sleeve: '#5a7a5a', belt: '#2a2a24', pants: '#3a4a3a', wide: 1, glove: '#f4ecd8', bracer: '#f4ecd8', wpn: { k: 'fist' } },
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'tunic', c: '#24242c' }, shirt: '#24242c', sleeve: '#24242c', collar: C.gold, belt: C.gold, pants: '#24242c', wide: 1, glove: C.steel, bracer: C.steel, wpn: { k: 'fist', glow: '#bfe8ff' } },
      { head: { t: 'circlet', c: C.gold, gem: p }, armor: { t: 'tunic', c: C.white }, shirt: C.white, sleeve: C.white, collar: C.gold, mantle: { c: C.gold, trim: C.white }, belt: p, pants: '#f4e8c8', wide: 1, glove: C.gold, bracer: C.gold, wpn: { k: 'fist', glow: '#fff6a0', big: 1 }, aura: '#ffe060', sparkle: 1 },
    ][t],
    // 蛮人系（穆尔）：兽皮腰布斧头 → 狂战士双斧 → 霸王（兽角盔、巨型砍刀、怒气）
    barbarian: (t, p, q) => [
      { hs: 'spiky', armor: { t: 'bare', c: '#6a4a2a', paint: '#3a6ab8' }, pads: { c: '#c8b088', fur: 1 }, pants: p, bracer: C.leather, wpn: { k: 'axe', len: 18, h: 1, c: C.iron }, style: 'rage' },
      { hs: 'spiky', head: { t: 'band', c: C.red, tail: 1 }, armor: { t: 'bare', c: C.dLeather, paint: '#c82020' }, mantle: { c: '#8a6a4a', trim: '#e8dcc0', fur: 1 }, pants: p, bracer: C.steel, wpn: { k: 'axe', len: 20, h: 2, c: C.steel }, wpn2: { k: 'axe', len: 18, h: 1, c: C.steel }, style: 'rage' },
      { hs: 'spiky', head: { t: 'helm', c: '#8a6a4a', horns: C.bone, crest: '#e8dcc0' }, armor: { t: 'plate', c: '#5a4a3a', c2: '#2a2018', trim: C.gold }, emblem: p, pads: { c: '#c8b088', fur: 1 }, cape: { c: '#8a6a4a', c2: '#4a3a24', trim: '#e8dcc0', len: 32 }, skirt: { t: 'tassets', c: '#5a4a3a', c2: p }, wpn: { k: 'axe', len: 26, h: 3, c: C.blade, g: C.gold, cleaver: 1, glow: '#ffb060' }, style: 'rage', aura: '#ff8030', sparkle: 1 },
    ][t],
    // ---- 隐藏职业 ----
    fishman: (t, p) => ({ skin: '#5ab0a8', hs: 'bald', eyeC: '#ffe040', head: { t: 'fin', c: '#2a7a8a' }, armor: { t: 'harness', c: '#2a5a6a' }, shirt: '#5ab0a8', sleeve: '#5ab0a8', skirt: { t: 'tunic', c: p }, pants: '#4a9a98', boots: '#2a7a8a', wpn: { k: 'fork', len: 32, c: C.cyan } }),
    vampire: (t, p, q) => ({ skin: '#ece4f4', hair: '#1a1420', hs: 'short', eyeC: '#d01a2a', armor: { t: 'coat', c: '#1e1424' }, shirt: C.white, mantle: { c: '#1e1424', trim: C.red, collar: 1 }, cape: { c: '#1e1424', c2: '#8a0a1a', trim: p, len: 34 }, pants: '#1e1424', bwings: { c: '#2a1430', c2: '#4a1a2a' }, hover: 1, wpn: SW(19, '#ffe0e8', C.gold, { glow: '#ff5060' }), trail: '#ff4060', style: 'ninja', aura: '#c01a3a' }),
    harpy: (t, p) => ({ hair: '#d070c0', hs: 'long', skin: '#f4d0c8', armor: { t: 'harness', c: '#7a3a8a' }, shirt: '#a060c0', sleeve: '#a060c0', skirt: { t: 'tunic', c: p }, pants: '#a060c0', talons: 1, wings: { c: '#a060c0', c2: '#f0c0f0', big: 1 }, hover: 1, wpn: { k: 'claw', c: '#f0d080' } }),
    jester: (t, p) => ({ skin: '#f8f4f4', hair: '#3a2a4a', head: { t: 'jester', c: p, c2: C.gold }, clown: 1, armor: { t: 'diamond', c: p, c2: C.gold }, sleeve: C.gold, pants: p, boots: '#3a2a4a', collar: C.white, wpn: NINJATO('#e8e8f0', { len: 15 }), style: 'dash' }),
    // ---- 敌方 ----
    skeleton: (t, p) => ({ skin: '#ece4cc', hs: 'bald', skull: 1, armor: { t: 'ribs', c: '#ece4cc' }, shirt: '#ece4cc', sleeve: '#ece4cc', belt: p, pants: '#ece4cc', boots: '#c8bca0', shield: { s: 'round', c: '#7a5a3a', c2: C.dIron, e: p }, wpn: SW(15, '#a8a08a', '#6a5a3a') }),
    bat: (t, p) => ({ skin: '#4a3a5a', hs: 'bald', eyeC: '#ff3030', head: { t: 'batears', c: '#4a3a5a' }, shirt: '#4a3a5a', sleeve: '#4a3a5a', belt: p, pants: '#4a3a5a', boots: '#2a2034', bwings: { c: '#2a2034', c2: '#6a4a7a', big: 1 }, hover: 1, wpn: { k: 'claw', c: C.bone }, scaleK: 0.85 }),
    mecha: (t, p) => ({ skin: '#8a9aa8', hs: 'bald', head: { t: 'helm', c: '#5a6a78', c2: '#3a4450', visor: 1, eyes: '#ff3030', crest: '#ffcc30' }, armor: { t: 'plate', c: '#6a7a88', c2: '#3a4450', trim: '#ffcc30' }, emblem: p, pads: { c: '#5a6a78', big: 1 }, sleeve: '#5a6a78', bracer: '#3a4450', glove: '#3a4450', pants: '#4a5a68', boots: '#2a3440', greave: '#5a6a78', wpn: { k: 'cannon', c: '#5a6a78' }, scaleK: 1.35 }),
    creb: (t, p, q) => ({ hair: '#4a1a5a', hs: 'long', beard: 1, head: { t: 'horns', c: '#1a1018', big: 1, crown: 1, gem: '#c040ff' }, robe: { c: '#2a1438', trim: C.gold, c2: '#14081a', sash: p, runes: 1 }, mantle: { c: '#1a0e24', trim: '#c040ff', collar: 1 }, cape: { c: '#1a0e24', c2: '#5a1a6a', trim: C.gold, len: 40 }, belt: C.gold, orbs: ['#c040ff', '#ff3060'], wpn: STAFF(44, 'skull', { wood: '#2a2030', gem: '#ff3060' }), aura: '#a030ff', sparkle: 1, scaleK: 1.45 }),
  };
  for (const k in G3) LINES[k] = (t, p, q, u) => Object.assign({ fixW: 1 }, G3[k](t, p, q, u));

  // ---------------- 狂神降世（g4）：新职业系、英雄专属隐藏职业与敌兵 ----------------
  const HALB = (c, o) => Object.assign({ k: 'lance', len: 34, c, halberd: 1 }, o);
  const ANCHOR = (c, o) => Object.assign({ k: 'axe', len: 22, h: 1, c, anchor: 1 }, o);
  const EL4 = ['#ff7a3a', '#7ad0ff', '#8ae8a0', '#e0c090'];
  const G4 = {
    // 斗剑士系（克荷林，血狮鹫兵团团长）
    duelist: (t, p, q) => [
      { armor: { t: 'leather', c: C.leather, c2: C.dLeather }, cape: { c: C.dRed, c2: '#5a1018', len: 24 }, skirt: { t: 'tunic', c: p }, wpn: SW(18, C.steel, C.dLeather) },
      { head: { t: 'band', c: C.dRed, tail: 1 }, armor: { t: 'coat', c: '#6a2a24' }, shirt: p, pads: { c: C.steel, big: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.silver, len: 28 }, wpn: SW(21, C.blade, C.dSteel, { big: 1 }) },
      { head: { t: 'circlet', c: C.gold, gem: C.red }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.dRed }, emblem: C.dRed, pads: { c: C.gold, big: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: SW(25, '#ffffff', C.gold, { big: 1, glow: '#ffd8a0' }), aura: '#ffd080', sparkle: 1 },
    ][t],
    longbowman: (t, p, q) => [
      { head: { t: 'hood', c: '#4a6a3a' }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 17, c: C.wood } },
      { head: { t: 'feather', c: '#3a5a2a', band: C.gold, plume: C.white }, armor: { t: 'leather', c: '#5a4a2a', c2: C.gold }, cape: { c: '#3a5a2a', c2: '#24361a', trim: C.gold, len: 26 }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 18, c: C.gold, tip: C.white }, sparkle: 1 },
    ][t],
    // 长戟士系：步行长戟 → 游击骑士 → 飙风骑士
    halberdier: (t, p, q) => [
      { head: { t: 'kettle', c: C.steel }, armor: { t: 'chain', c: C.steel, c2: C.dSteel }, tabard: p, wpn: HALB(C.steel) },
      { head: { t: 'helm', c: C.steel, nasal: 1, plume: p }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, cape: { c: p, c2: q, len: 22 }, wpn: HALB(C.blade, { len: 38, flag: p }), mount: { t: 'horse', c: '#8a5630', m: '#2a1a10', blanket: p } },
      { head: { t: 'helm', c: C.silver, visor: 1, plume: '#8ae8c0' }, armor: { t: 'plate', c: C.silver, c2: '#5a7a8a', trim: '#8ae8c0' }, emblem: p, pads: { c: C.silver, big: 1 }, cape: { c: '#3a8a7a', c2: '#1a4a40', trim: C.silver, len: 26 }, wpn: HALB('#ffffff', { len: 42, flag: p, gold: 1, glow: '#a8f0d0' }), mount: { t: 'horse', c: '#d8dce8', m: '#8ae8c0', bard: '#3a8a7a', trim: C.silver, plate: C.silver }, aura: '#a8f0d0', sparkle: 1 },
    ][t],
    tribesman: (t, p, q) => [
      { hs: 'spiky', armor: { t: 'bare', c: '#6a4a2a', paint: '#3a6ab8' }, pads: { c: '#c8b088', fur: 1 }, pants: p, bracer: C.leather, wpn: { k: 'axe', len: 19, h: 1, c: C.iron } },
      { head: { t: 'helm', c: C.iron, nasal: 1 }, armor: { t: 'plate', c: C.iron, c2: C.dIron }, emblem: p, pads: { c: C.iron, big: 1 }, skirt: { t: 'tunic', c: p }, wpn: { k: 'axe', len: 22, h: 2, c: C.steel } },
      { hs: 'spiky', head: { t: 'band', c: C.red, tail: 1 }, armor: { t: 'bare', c: C.dLeather, paint: '#c82020' }, mantle: { c: '#8a6a4a', trim: '#e8dcc0', fur: 1 }, pants: p, bracer: C.steel, wpn: { k: 'axe', len: 22, h: 2, c: C.steel }, wpn2: { k: 'axe', len: 19, h: 1, c: C.steel }, style: 'rage', aura: '#ff6040' },
    ][t],
    thief: (t, p, q) => [
      { head: { t: 'bandana', c: '#3a3a4a' }, armor: { t: 'vest', c: '#4a3a2a' }, belt: p, pants: '#3a3428', scarf: p, scarfLen: 0.9, wpn: NINJATO(C.steel, { len: 13 }), style: 'ninja' },
      { head: { t: 'hood', c: '#2a3a4a' }, armor: { t: 'leather', c: '#3a3a4a', c2: '#24242e' }, cape: { c: '#2a3a4a', c2: p, len: 26 }, belt: p, pants: '#24242e', wpn: NINJATO(C.blade, { len: 15 }), wpn2: NINJATO(C.blade, { len: 13 }), style: 'ninja', sparkle: 1 },
    ][t],
    // 炼金术士系：皮围裙与药瓶 → 巫师 → 降术师；远程投掷药瓶
    alchemist: (t, p, q) => [
      { head: { t: 'cap', c: '#6a4a2a' }, armor: { t: 'coat', c: '#7a6a4a' }, shirt: p, flasks: 1, pants: '#4a3a2a', wpn: STAFF(26, 'gem', { gem: '#9aff4a', tc: C.iron }), style: 'flask' },
      { head: { t: 'wizhat', c: '#4a6a3a', band: C.gold }, robe: { c: '#3a5a2a', trim: C.gold, sash: p }, flasks: 1, belt: C.brown, wpn: STAFF(32, 'crystal', { gem: '#9aff4a' }), style: 'flask' },
      { head: { t: 'hood', c: '#2a3a5a' }, robe: { c: '#2a3a5a', trim: C.gold, sash: p, runes: 1 }, mantle: { c: '#1a2440', trim: C.gold, collar: 1 }, flasks: 1, belt: C.gold, orbs: ['#9aff4a'], wpn: STAFF(36, 'orb', { gem: '#9aff4a', glow: '#d8ffb0', tc: C.gold }), style: 'flask', sparkle: 1 },
    ][t],
    monk: (t, p, q) => [
      { head: { t: 'hood', c: '#7a5a3a' }, robe: { c: '#8a6a44', trim: p }, belt: C.brown, beads: 1, wpn: STAFF(30, 'knob') },
      { head: { t: 'headdress', c: '#3a7a2a', c2: '#a8e070' }, robe: { c: '#3a6a2a', trim: '#a8e070', sash: p }, mantle: { c: '#6a4a24', trim: '#a8e070', fur: 1 }, beads: 1, orbs: ['#a8ff90'], wpn: STAFF(36, 'crystal', { gem: '#7aff6a', wood: '#5a3a1a' }), aura: '#a8ff90' },
    ][t],
    swordmaid: (t, p, q) => [
      { armor: { t: 'leather', c: '#8a4a2a', c2: '#5a2a14' }, skirt: { t: 'tunic', c: p }, wpn: SW(17, C.steel, C.dLeather) },
      { head: { t: 'circlet', c: C.silver, gem: p }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, cape: { c: p, c2: q, len: 24 }, skirt: { t: 'tunic', c: p }, wpn: SW(20, C.blade, C.silver) },
      { head: { t: 'crown', c: C.gold, gem: C.red }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.red }, emblem: C.red, pads: { c: C.gold, big: 1 }, cape: { c: C.red, c2: C.dRed, trim: C.gold, len: 32 }, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: SW(23, '#ffffff', C.gold, { big: 1, glow: '#ffc8c8' }), trail: '#ff9aa8', aura: '#ffb0c0', sparkle: 1 },
    ][t],
    shooter: (t, p, q) => [
      { head: { t: 'band', c: p, tail: 1 }, armor: { t: 'leather', c: '#5a7a4a', c2: '#3a5a2a' }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 15, c: C.wood } },
      { head: { t: 'feather', c: '#3a6a3a', band: C.gold, plume: C.white }, armor: { t: 'leather', c: '#4a6a3a', c2: C.gold }, cape: { c: p, c2: q, trim: C.gold, len: 24 }, wpn: { k: 'bow', size: 16, c: C.gold, tip: C.white }, mount: { t: 'horse', c: '#c8a070', m: '#5a3a1a', blanket: p }, sparkle: 1 },
    ][t],
    // 长枪士 → 白羽骑士（骑天马）
    pikemaid: (t, p, q) => [
      { head: { t: 'helm', c: C.steel, nasal: 1 }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel }, skirt: { t: 'tunic', c: p }, wpn: { k: 'lance', len: 34, c: C.steel, flag: p } },
      { head: { t: 'circlet', c: C.gold, wings: C.white, gem: C.cyan }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: p, pads: { c: C.white, big: 1 }, cape: { c: C.white, c2: '#d8e8ff', trim: C.gold, len: 24 }, wpn: { k: 'lance', len: 42, c: C.blade, flag: p, gold: 1 }, mount: { t: 'pegasus', c: '#f6f6fc', m: '#e8f0ff', bard: p, trim: C.gold, plate: C.silver, wing: '#ffffff', wing2: '#d8e8ff' }, sparkle: 1 },
    ][t],
    amazon: (t, p, q) => [
      { armor: { t: 'vest', c: '#7a5a3a', bare: 1 }, head: { t: 'headdress', c: '#c84a2a', c2: '#f0d080' }, pads: { c: '#c8b088', fur: 1 }, skirt: { t: 'tunic', c: p }, bracer: C.gold, wpn: { k: 'axe', len: 19, h: 1, c: C.steel } },
      { head: { t: 'helm', c: C.gold, crest: C.red }, armor: { t: 'plate', c: C.gold, c2: C.dGold }, emblem: p, pads: { c: C.gold, big: 1 }, skirt: { t: 'tassets', c: C.gold, c2: p }, wpn: { k: 'axe', len: 22, h: 2, c: C.blade, g: C.gold } },
    ][t],
    pickpocket: (t, p, q) => [
      { head: { t: 'hood', c: '#4a3a5a' }, armor: { t: 'vest', c: '#3a2a3a' }, belt: p, pants: '#2a2434', wpn: NINJATO(C.steel, { len: 13 }), style: 'ninja' },
      { head: { t: 'ninja', c: '#24182e', band: '#8a1a3a' }, armor: { t: 'harness', c: '#3a1a2a' }, shirt: '#24182e', sleeve: '#24182e', belt: p, pants: '#1e1428', boots: '#1e1428', scarf: '#8a1a3a', scarfLen: 1.6, wpn: NINJATO('#ffffff', { len: 16 }), wpn2: NINJATO('#ffffff', { len: 14 }), style: 'ninja', sparkle: 1 },
    ][t],
    sorceress: (t, p, q) => [
      { head: { t: 'wizhat', c: p }, robe: { c: p, trim: q }, belt: C.brown, wpn: STAFF(28, 'gem', { gem: C.cyan }) },
      { head: { t: 'wizhat', c: '#3a1a4a', band: C.gold, star: C.gold, big: 1 }, robe: { c: '#3a1a4a', trim: C.gold, sash: p }, cape: { c: '#5a2a6a', c2: '#2a1030', trim: C.gold, len: 32 }, belt: C.gold, wpn: STAFF(36, 'orb', { gem: '#c890ff', glow: '#e8d0ff', tc: C.gold }), aura: '#c890ff', sparkle: 1 },
    ][t],
    nun: (t, p, q) => [
      { head: { t: 'hood', c: '#2a2434' }, robe: { c: '#2a2434', trim: C.white, sash: p }, collar: C.white, belt: C.white, wpn: STAFF(30, 'cross', { tc: C.silver }) },
      { head: { t: 'mitre', c: C.white, c2: C.gold }, robe: { c: C.white, trim: C.gold, sash: p }, mantle: { c: p, trim: C.gold }, cape: { c: p, c2: q, trim: C.gold, len: 34 }, belt: C.gold, wpn: STAFF(36, 'ring', { tc: C.gold, gem: C.cyan }), sparkle: 1 },
    ][t],
    // 元素使系（贝里奇娜）：地水火风四色光球环绕
    elementalist: (t, p, q) => [
      { head: { t: 'circlet', c: C.silver, gem: '#ff7a3a' }, robe: { c: '#3a4a7a', trim: C.silver, sash: p, stars: 1 }, belt: C.silver, orbs: EL4.slice(0, 2), wpn: STAFF(32, 'crystal', { gem: C.cyan }), style: 'elem' },
      { head: { t: 'crown', c: C.gold, gem: C.cyan }, robe: { c: '#24305a', trim: C.gold, sash: p, stars: 1 }, mantle: { c: p, trim: C.gold }, cape: { c: '#24305a', c2: '#14183a', trim: C.gold, dots: '#ffffff', len: 34 }, belt: C.gold, orbs: EL4, wpn: STAFF(38, 'orb', { gem: '#ffffff', glow: '#fff0c0', tc: C.gold }), style: 'elem', aura: '#fff0c0', sparkle: 1 },
    ][t],
    // 海贼系（力奇）：铁锚为武器
    pirate: (t, p, q) => [
      { head: { t: 'bandana', c: C.red }, armor: { t: 'vest', c: '#3a3a5a', bare: 1 }, belt: p, pants: '#4a4a6a', boots: C.dBrown, wpn: ANCHOR(C.iron) },
      { head: { t: 'tricorne', c: '#2a2434', c2: C.gold, plume: C.red }, armor: { t: 'coat', c: '#8a1a24' }, shirt: C.white, belt: C.gold, buckle: C.gold, pads: { c: C.gold }, cape: { c: '#2a2434', c2: p, len: 26 }, pants: '#2a2434', wpn: ANCHOR(C.steel, { len: 25, h: 2 }) },
    ][t],
    summoner: (t, p, q) => [
      { head: { t: 'hood', c: '#4a3a6a' }, robe: { c: '#4a3a6a', trim: C.cyan, sash: p, runes: 1 }, belt: p, orbs: ['#8af0ff'], wpn: STAFF(32, 'crystal', { gem: C.cyan }) },
      { head: { t: 'crown', c: C.gold, gem: '#c890ff' }, robe: { c: '#2e2450', trim: C.gold, sash: p, runes: 1 }, cape: { c: p, c2: '#2a1a50', trim: C.gold, len: 34 }, belt: C.gold, book: '#6a2a8a', orbs: ['#8af0ff', '#ff90c0', '#ffe080'], wpn: STAFF(36, 'crystal', { gem: '#c890ff', tc: C.gold }), aura: '#b0a0ff', sparkle: 1 },
    ][t],
    // ---- 英雄专属隐藏职业 ----
    gSwordSaint: (t, p, q) => ({ head: { t: 'circlet', c: C.gold, wings: C.white, gem: C.cyan }, armor: { t: 'coat', c: C.white }, shirt: p, mantle: { c: C.gold, trim: C.white }, cape: { c: C.white, c2: '#fff4d0', trim: C.gold, len: 36 }, pads: { c: C.gold, big: 1 }, pants: '#f4ecd8', wpn: SW(27, '#ffffff', C.gold, { big: 1, glow: '#fff4a0' }), trail: '#fff0a0', aura: '#fff0a0', sparkle: 1 }),
    gSwordEvil: (t, p, q) => ({ head: { t: 'horns', c: '#1a1018', gem: C.red }, armor: { t: 'plate', c: '#2a1a24', c2: '#0e0810', trim: C.red }, emblem: C.red, pads: { c: '#2a1a24', big: 1 }, cape: { c: '#14080e', c2: C.dRed, trim: C.red, len: 36 }, skirt: { t: 'tassets', c: '#2a1a24', c2: p }, wpn: SW(26, '#ffd0d8', '#5a0a1a', { big: 1, glow: '#ff3050' }), trail: '#ff3050', aura: '#ff2040', sparkle: 1 }),
    gGriffin: (t, p, q) => ({ head: { t: 'helm', c: C.gold, plume: C.red, nasal: 1 }, armor: { t: 'plate', c: '#8a3a24', c2: '#4a1a10', trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: C.dRed, c2: '#5a1018', trim: C.gold, len: 24 }, wpn: { k: 'lance', len: 42, c: C.blade, flag: p, gold: 1 }, mount: { t: 'pegasus', c: '#c89a5a', m: '#f4ecd8', bard: C.dRed, trim: C.gold, wing: '#8a5a2a', wing2: '#f4ecd8', beak: 1, eyes: '#ffd040' }, aura: '#ffb070', sparkle: 1 }),
    gBowKing: (t, p, q) => ({ head: { t: 'crown', c: C.gold, gem: C.red, big: 1 }, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: C.red }, emblem: p, pads: { c: C.red, big: 1 }, cape: { c: C.red, c2: C.dRed, trim: C.gold, len: 32 }, quiver: 1, wpn: { k: 'bow', size: 19, c: C.gold, tip: C.white, str: '#fff6a0', arrow: '#ffd040' }, aura: '#ffd060', sparkle: 1 }),
    gShadowSniper: (t, p, q) => ({ head: { t: 'hood', c: '#1a1424' }, armor: { t: 'leather', c: '#24182e', c2: '#8a3aff' }, mantle: { c: '#14101c', trim: '#8a3aff', collar: 1 }, cape: { c: '#14101c', c2: '#3a1a5a', trim: '#8a3aff', len: 30 }, quiver: 1, wpn: { k: 'bow', size: 18, c: '#2a2034', tip: '#8a3aff', str: '#c890ff', arrow: '#8a3aff' }, aura: '#7a3aff' }),
    gLightMaiden: (t, p, q) => ({ head: { t: 'circlet', c: C.gold, wings: C.white, gem: '#fff0a0' }, robe: { c: C.white, trim: C.gold, c2: '#fff4d0', sash: p }, mantle: { c: C.gold, trim: C.white }, halo: 'ring', wings: { c: C.white, c2: '#fff0b0' }, belt: C.gold, wpn: STAFF(38, 'sun', { tc: C.gold, wood: C.gold, glow: '#fff6b0' }), aura: '#fff6c0', sparkle: 1 }),
    gSpirit: (t, p, q) => ({ skin: '#e8f4ff', hair: '#c8e8ff', head: { t: 'circlet', c: '#a8e0ff', gem: '#ffffff' }, robe: { c: '#c8e8ff', trim: '#ffffff', c2: '#a8d0f0', sash: p }, wings: { c: '#e8f8ff', c2: '#a8d8ff', big: 1 }, halo: 'ring', hover: 1, orbs: ['#ffffff', '#a8e0ff'], belt: '#ffffff', wpn: STAFF(36, 'orb', { gem: '#ffffff', glow: '#c8f0ff', tc: '#a8e0ff', wood: '#e8f4ff' }), aura: '#c8f0ff', sparkle: 1 }),
    gNetherAxe: (t, p, q) => ({ hs: 'spiky', head: { t: 'helm', c: C.bone, c2: '#5a4a6a', horns: '#5a3a8a', visor: 1, eyes: '#c060ff' }, armor: { t: 'plate', c: '#3a2a4a', c2: '#14101c', trim: '#a040ff' }, emblem: p, pads: { c: C.bone, big: 1 }, cape: { c: '#14101c', c2: '#5a1a8a', trim: '#a040ff', len: 32 }, skirt: { t: 'tassets', c: '#3a2a4a', c2: p }, wpn: { k: 'axe', len: 27, h: 3, c: '#e0c0ff', g: '#a040ff', cleaver: 1, glow: '#c060ff' }, style: 'rage', aura: '#a040ff', sparkle: 1 }),
    gThunderAxe: (t, p, q) => ({ hs: 'spiky', head: { t: 'helm', c: '#3a5a9a', horns: C.gold, crest: '#ffe040' }, armor: { t: 'plate', c: '#3a5a9a', c2: '#1a2a5a', trim: '#ffe040' }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: '#1a2a5a', c2: '#ffe040', trim: C.gold, len: 32 }, skirt: { t: 'tassets', c: '#3a5a9a', c2: p }, storm: 1, wpn: { k: 'axe', len: 26, h: 3, c: '#fff8c0', g: C.gold, glow: '#fff060' }, wpn2: { k: 'axe', len: 20, h: 2, c: '#fff8c0' }, style: 'rage', aura: '#fff060', sparkle: 1 }),
    gMagicBlade: (t, p, q) => ({ head: { t: 'mask', c: '#3a3648', eyes: C.cyan }, armor: { t: 'chain', c: '#5a4a72', c2: '#3a2c50' }, tabard: '#2a1a4a', emblem: C.cyan, pads: { c: '#4a4060', big: 1 }, cape: { c: p, c2: q, trim: C.cyan, len: 32 }, wpn: SW(24, '#c8f4ff', C.dPurple, { glow: '#7ad8ff', runes: 1, big: 1 }), trail: '#7ad8ff', aura: '#7ad8ff', sparkle: 1 }),
    gSpellSword: (t, p, q) => ({ head: { t: 'wizhat', c: '#6a3a8a', band: C.gold, star: C.gold }, armor: { t: 'leather', c: '#5a3a7a', c2: C.gold }, mantle: { c: p, trim: C.gold }, skirt: { t: 'tunic', c: p }, wpn: SW(22, '#ffe8ff', C.gold, { glow: '#ff90ff', runes: 1 }), trail: '#ff90ff', sparkle: 1 }),
    gYama: (t, p, q) => ({ head: { t: 'horns', c: '#2a0a0a', big: 1, crown: 1, gem: '#ff5020' }, robe: { c: '#5a0a0a', trim: '#ff5020', c2: '#2a0606', sash: p, runes: 1 }, mantle: { c: '#1a0606', trim: C.gold, collar: 1 }, cape: { c: '#1a0606', c2: '#ff5020', trim: C.gold, len: 36 }, belt: C.gold, wpn: STAFF(38, 'orb', { gem: '#ff5020', glow: '#ffb070', tc: C.gold, wood: '#2a0a0a', big: 1 }), aura: '#ff5020', sparkle: 1 }),
    gHolyDemon: (t, p, q) => ({ head: { t: 'horns', c: C.white, gem: '#c040ff' }, robe: { c: C.white, trim: '#c040ff', c2: '#2a1438', sash: p }, mantle: { c: '#2a1438', trim: C.gold }, halo: 'ring', bwings: { c: '#2a1438', c2: '#6a3a8a' }, belt: C.gold, wpn: STAFF(38, 'orb', { gem: '#ffffff', glow: '#e0a0ff', tc: C.gold, big: 1 }), aura: '#e0a0ff', sparkle: 1 }),
    gSpecialOps: (t, p, q) => ({ head: { t: 'ninja', c: '#2a3a2a', band: C.red }, armor: { t: 'harness', c: '#3a4a3a' }, shirt: '#2a3a2a', sleeve: '#2a3a2a', belt: p, bracer: C.steel, pants: '#24302a', boots: '#1a1a1a', scarf: C.red, scarfLen: 1.8, wpn: NINJATO('#ffffff', { len: 18, glow: '#ff6060' }), style: 'ninja', sparkle: 1 }),
    gShadowNinja: (t, p, q) => Object.assign({}, LINES_B.samurai(4, p, q), { scarf: '#6a3aa8' }),
    gPirateKing: (t, p, q) => ({ head: { t: 'tricorne', c: '#8a1a24', c2: C.gold, plume: C.white, big: 1 }, armor: { t: 'coat', c: '#8a1a24' }, shirt: C.white, belt: C.gold, buckle: C.gold, pads: { c: C.gold, big: 1 }, cape: { c: '#2a2434', c2: C.gold, trim: C.gold, len: 34 }, pants: '#2a2434', wpn: ANCHOR(C.gold, { len: 27, h: 3, glow: '#fff0a0' }), aura: '#ffe080', sparkle: 1 }),
    gSeaLord: (t, p, q) => ({ head: { t: 'tricorne', c: '#14202a', c2: '#3ac8c8', plume: '#3ac8c8', big: 1 }, armor: { t: 'coat', c: '#14202a' }, shirt: '#3a8a8a', belt: '#3ac8c8', pads: { c: '#2a4a5a', big: 1 }, cape: { c: '#14202a', c2: '#3ac8c8', trim: '#3ac8c8', len: 34 }, pants: '#14202a', wpn: ANCHOR('#a8f0f0', { len: 27, h: 3, glow: '#7af0f0' }), aura: '#3ac8c8', sparkle: 1 }),
    gEvilSword: (t, p, q) => ({ head: { t: 'horns', c: '#1a1018', gem: C.red, crown: 1 }, armor: { t: 'plate', c: '#2a1424', c2: '#0e0810', trim: C.red }, emblem: C.red, pads: { c: '#2a1424', big: 1 }, cape: { c: '#14080e', c2: C.dRed, trim: C.red, len: 34 }, skirt: { t: 'tassets', c: '#2a1424', c2: p }, wpn: SW(24, '#ffd0d8', '#5a0a1a', { glow: '#ff3050', big: 1 }), trail: '#ff3050', aura: '#ff2040', sparkle: 1 }),
    gHolySword: (t, p, q) => ({ head: { t: 'circlet', c: C.gold, wings: C.white, gem: C.cyan }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: C.gold, pads: { c: C.gold, big: 1 }, cape: { c: C.white, c2: '#fff4d0', trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: SW(25, '#ffffff', C.gold, { glow: '#fff4a0', big: 1 }), trail: '#fff0a0', aura: '#fff0a0', sparkle: 1 }),
    gLightKnight: (t, p, q) => ({ head: { t: 'helm', c: C.white, visor: 1, crest: C.gold, plume: C.gold }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: C.gold, pads: { c: C.gold, big: 1 }, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 24 }, shield: { s: 'tower', c: C.white, c2: C.gold, e: C.gold, cross: 1 }, wpn: { k: 'lance', len: 42, c: '#ffffff', flag: p, gold: 1, glow: '#fff0a0' }, mount: { t: 'horse', c: '#ffffff', m: '#f4c542', bard: p, trim: C.gold, plate: C.gold }, aura: '#fff0a0', sparkle: 1 }),
    gHolyKnight: (t, p, q) => ({ head: { t: 'helm', c: C.gold, visor: 1, crownTop: C.gold, plume: C.white }, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: C.white }, emblem: p, pads: { c: C.white, big: 1 }, cape: { c: C.white, c2: '#fff4d0', trim: C.gold, len: 26 }, halo: 'ring', wpn: { k: 'lance', len: 46, c: '#ffffff', flag: p, banner: 1, gold: 1, glow: '#fff0a0' }, mount: { t: 'pegasus', c: '#ffffff', m: '#f4c542', bard: p, trim: C.gold, plate: C.gold, wing: '#ffffff', wing2: '#fff0b0' }, aura: '#fff6c0', sparkle: 1 }),
    // ---- 敌方 ----
    maskman: (t, p, q) => ({ head: { t: 'ninja', c: t ? '#5a1a1a' : '#2a2a34', band: t ? C.gold : C.white, eyes: '#ffffff' }, armor: { t: 'harness', c: '#3a3a44' }, shirt: '#2a2a34', sleeve: '#2a2a34', belt: p, pants: '#24242c', boots: '#1a1a1e', scarf: p, scarfLen: t ? 1.4 : 1, wpn: NINJATO(C.steel, { len: 16 }), style: 'ninja' }),
    outsider: (t, p) => ({ skin: '#5a3a7a', hair: '#2a1a3a', hs: 'spiky', eyeC: '#ff3030', head: { t: 'horns', c: '#2a1a3a', gem: '#ff3030' }, armor: { t: 'bare', c: '#3a1a4a', paint: '#ff3030' }, sleeve: '#5a3a7a', pants: '#3a2a4a', boots: '#2a1a3a', talons: 1, bwings: { c: '#2a1a3a', c2: '#5a2a6a' }, wpn: { k: 'claw', c: '#ff9090', big: 1 }, scaleK: 1.1 }),
    madGod: (t, p) => ({ skin: '#e0d0e4', hair: '#5a5a7a', hs: 'long', eyeC: '#ff2020', head: { t: 'horns', c: C.gold, big: 1, crown: 1, gem: '#ff2020' }, armor: { t: 'plate', c: '#2a2030', c2: '#100c14', trim: C.gold }, emblem: '#ff2020', pads: { c: C.gold, big: 1 }, cape: { c: '#3a0a14', c2: '#100c14', trim: C.gold, len: 40 }, skirt: { t: 'tassets', c: '#2a2030', c2: '#ff2020' }, bwings: { c: '#1a1420', c2: '#5a1a2a', big: 1 }, wpn: SW(30, '#ffe0e0', C.gold, { big: 1, glow: '#ff3040' }), trail: '#ff3040', aura: '#ff2040', sparkle: 1, scaleK: 1.3 }),
    madGod2: (t, p) => ({ skin: '#c8b0d8', hair: '#3a0a1e', hs: 'long', eyeC: '#ff1010', head: { t: 'horns', c: '#1a0a10', big: 1, crown: 1, gem: '#ff1010' }, armor: { t: 'plate', c: '#14080e', c2: '#3a0a18', trim: '#ff3040' }, emblem: '#ffd040', pads: { c: '#3a0a18', big: 1 }, cape: { c: '#3a0a18', c2: '#14080e', trim: '#ff3040', len: 42 }, skirt: { t: 'tassets', c: '#14080e', c2: '#ff3040' }, bwings: { c: '#0e0610', c2: '#8a0a2a', big: 1 }, wings: { c: '#2a1a2a', c2: '#ff3040', big: 1 }, orbs: ['#ff3040', '#ffd040', '#c040ff'], wpn: SW(32, '#ffffff', '#ff3040', { big: 1, glow: '#ff5060', runes: 1, twin: '#ffd040' }), trail: '#ff3040', aura: '#ff1030', sparkle: 1, scaleK: 1.45 }),
  };
  for (const k in G4) LINES[k] = (t, p, q, u) => Object.assign({ fixW: 1 }, G4[k](t, p, q, u));

  // ---------------- 转职 B 路线（u.path === 'b' 且 tier >= at）----------------
  // at 以 CLASSES[cls].alt.at 为准；data.js 尚未提供时使用此后备表
  const ALT_AT = { halberdier: 2, tribesman: 2, alchemist: 2, amazon: 1, nun: 1, adventurer: 2, swordHand: 2, crossbowman: 2, medium: 2, swordsman: 2, knight: 2, fighter: 2, samurai: 2, archer: 2, priest: 2, mage: 2, sorcerer: 1, hawk: 1, wolf: 1, babyDragon: 2 };
  const NINJATO = (c, o) => Object.assign({ k: 'katana', len: 20, c, g: '#2a2434', straight: 1, grip: '#2a2434' }, o);
  const LINES_B = {
    // 魔法剑士 → 魔导剑士 → 圣魔剑士：法师披肩 + 符文光剑（魔法拖影）
    swordsman: (t, p, q) => [
      { head: { t: 'circlet', c: C.silver, gem: '#b070ff' }, armor: { t: 'leather', c: '#5a4a7a', c2: '#3a2a5a' }, mantle: { c: q, trim: C.gold }, skirt: { t: 'tunic', c: p }, wpn: SW(20, '#d0e8ff', C.silver, { glow: '#8ab8ff', runes: 1 }), trail: '#9a8aff' },
      { head: { t: 'circlet', c: C.gold, gem: C.cyan }, armor: { t: 'plate', c: '#8a7ab8', c2: '#4a3a78', trim: C.gold }, emblem: p, pads: { c: '#6a5aa0', big: 1 }, mantle: { c: p, trim: C.gold }, skirt: { t: 'tassets', c: '#8a7ab8', c2: p }, wpn: SW(22, '#e8d8ff', C.gold, { glow: '#c890ff', runes: 1, big: 1 }), trail: '#c890ff', aura: '#a070ff', sparkle: 1 },
      { head: { t: 'crown', c: C.gold, gem: '#ff70ff' }, armor: { t: 'plate', c: C.white, c2: '#b8a0e0', trim: '#8a5ad8' }, emblem: '#8a5ad8', pads: { c: C.white, big: 1 }, cape: { c: '#6a3aa8', c2: C.white, trim: C.gold, len: 34 }, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: SW(25, '#ffffff', C.gold, { glow: '#ff90ff', runes: 1, big: 1, twin: '#7ad8ff' }), trail: '#ff90ff', aura: '#d8a0ff', sparkle: 1 },
    ][t - 2],
    // 重装骑士 → 圣骑士 → 皇家骑士：始终骑马（全披甲马），塔盾，长枪冲锋
    knight: (t, p, q) => [
      { head: { t: 'helm', c: C.steel, visor: 1 }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel, big: 1 }, shield: { s: 'tower', c: p, c2: C.steel, e: C.steel }, wpn: { k: 'lance', len: 38, c: C.steel, flag: p }, mount: { t: 'horse', c: '#6a4a30', m: '#2a1a10', bard: '#8a8f9c', trim: p, plate: C.steel } },
      { head: { t: 'helm', c: C.white, visor: 1, crest: C.gold, plume: C.gold }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: C.gold, pads: { c: C.gold, big: 1 }, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 24 }, shield: { s: 'tower', c: C.white, c2: C.gold, e: C.gold, cross: 1 }, wpn: { k: 'lance', len: 40, c: C.blade, flag: p, gold: 1 }, mount: { t: 'horse', c: '#f2f2f6', m: '#e0d0a0', bard: p, trim: C.gold, plate: C.silver }, aura: '#fff4c0' },
      { head: { t: 'helm', c: C.gold, visor: 1, crownTop: C.gold, plume: p }, armor: { t: 'plate', c: C.gold, c2: C.dGold, trim: '#2a3a8a' }, emblem: p, pads: { c: '#2a3a8a', big: 1 }, cape: { c: '#2a3a8a', c2: '#1a2458', trim: C.gold, len: 26 }, shield: { s: 'tower', c: '#2a3a8a', c2: C.gold, e: C.gold, cross: 1 }, wpn: { k: 'lance', len: 44, c: '#ffffff', flag: p, banner: 1, gold: 1, glow: '#fff0a0' }, mount: { t: 'horse', c: '#f6f6fa', m: '#f4c542', bard: p, trim: C.gold, plate: C.gold }, aura: '#ffe080', sparkle: 1 },
    ][t - 2],
    // 狂战士 → 斗神 → 破坏神：赤膊战纹、巨型砍刀 / 双斧、狂暴跳劈，顶阶红色怒气
    fighter: (t, p, q) => [
      { hs: 'spiky', head: { t: 'band', c: C.red, tail: 1 }, armor: { t: 'bare', c: C.dLeather, paint: '#c82020' }, bracer: C.leather, pants: p, wpn: { k: 'axe', len: 22, h: 1, c: C.steel, cleaver: 1 }, style: 'rage' },
      { hs: 'spiky', head: { t: 'helm', c: C.bone, c2: '#c8b898', horns: C.bone, visor: 1, eyes: '#ff4020' }, armor: { t: 'bare', c: C.dLeather, paint: '#c82020' }, mantle: { c: '#8a6a4a', trim: '#e8dcc0', fur: 1 }, pads: { c: '#c8b088', fur: 1 }, bracer: C.steel, pants: p, wpn: { k: 'axe', len: 21, h: 2, c: C.steel }, wpn2: { k: 'axe', len: 19, h: 1, c: C.steel }, style: 'rage', aura: '#ff6040' },
      { hs: 'spiky', head: { t: 'helm', c: '#2a1418', c2: '#5a1a1a', horns: C.red, visor: 1, eyes: '#ffb020' }, armor: { t: 'plate', c: '#6a1a1a', c2: '#2a0a0a', trim: '#ff5020' }, emblem: p, pads: { c: '#2a1418', big: 1 }, cape: { c: '#2a0a0a', c2: C.red, trim: '#ff5020', len: 32 }, skirt: { t: 'tassets', c: '#3a1414', c2: p }, wpn: { k: 'axe', len: 28, h: 3, c: '#ffd0a0', g: '#ff5020', cleaver: 1, glow: '#ff7030', fire: 1 }, style: 'rage', aura: '#ff3020', sparkle: 1 },
    ][t - 2],
    // 忍者 → 上忍 → 影忍：蒙面头巾、忍者刀、长围巾；瞬身到敌后斩击，远程掷手里剑
    samurai: (t, p, q) => [
      { head: { t: 'ninja', c: '#34304a' }, armor: { t: 'tunic', c: '#34304a' }, belt: p, pants: '#2a2638', boots: '#2a2638', scarf: p, scarfLen: 1, wpn: NINJATO(C.steel), style: 'ninja' },
      { head: { t: 'ninja', c: '#24304a', band: C.steel }, armor: { t: 'harness', c: '#4a4a5a' }, shirt: '#24304a', belt: p, bracer: C.steel, pants: '#1e2438', boots: '#1e2438', scarf: p, scarfLen: 1.5, wpn: NINJATO(C.blade), style: 'ninja' },
      { head: { t: 'ninja', c: '#1e1428', band: '#6a3aa8', eyes: '#e070ff' }, armor: { t: 'harness', c: '#3a2a5a' }, shirt: '#2a1a3a', belt: p, bracer: '#6a3aa8', pants: '#1e1428', boots: '#1e1428', scarf: '#6a3aa8', scarfLen: 2.2, wpn: NINJATO('#e8d8ff', { glow: '#b070ff' }), wpn2: NINJATO('#e8d8ff'), style: 'ninja', aura: '#8040c0', sparkle: 1 },
    ][t - 2],
    // 游侠 → 魔弓手 → 天弓使：绿斗篷长弓 → 发光弓弦与符文魔法箭 → 白金天弓、光之箭
    archer: (t, p, q) => [
      { head: { t: 'hood', c: '#3a6a3a' }, cape: { c: '#3a6a3a', c2: '#24442a', len: 28 }, armor: { t: 'leather', c: C.leather, c2: C.dLeather }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 16, c: C.wood } },
      { head: { t: 'hood', c: '#4a2a6a' }, mantle: { c: q, trim: C.gold }, cape: { c: '#4a2a6a', c2: '#2a1a40', trim: C.gold, len: 28 }, armor: { t: 'leather', c: '#5a3a6a', c2: C.gold }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 16, c: '#5a3a8a', tip: C.gold, str: '#d8b0ff', arrow: '#c890ff' }, sparkle: 1 },
      { head: { t: 'circlet', c: C.gold, wings: C.white, gem: C.cyan }, cape: { c: C.white, c2: C.pearl, trim: C.gold, len: 32 }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, skirt: { t: 'tassets', c: C.white, c2: p }, wpn: { k: 'bow', size: 17, c: C.gold, tip: C.white, str: '#fff6a0', arrow: '#fff090', glow: 1 }, aura: '#fff0a0', sparkle: 1 },
    ][t - 2],
    // 武僧 → 圣拳士 → 拳圣：徒手连打（数记快拳 + 终结一击），高阶拳头发光
    priest: (t, p, q) => [
      { head: { t: 'band', c: '#c87818', tail: 1 }, armor: { t: 'tunic', c: '#f0a030' }, shirt: '#f0a030', sleeve: '#f0a030', collar: '#c87818', belt: p, beads: 1, pants: '#e89028', wide: 1, glove: '#f4ecd8', bracer: '#f4ecd8', wpn: { k: 'fist' } },
      { head: { t: 'band', c: C.white, tail: 1 }, armor: { t: 'tunic', c: C.white }, shirt: C.white, sleeve: C.white, collar: C.gold, belt: p, beads: 1, pants: C.white, wide: 1, glove: C.gold, bracer: C.gold, wpn: { k: 'fist', glow: '#fff0a0' }, sparkle: 1 },
      { head: { t: 'circlet', c: C.gold, gem: C.red }, armor: { t: 'tunic', c: C.white }, shirt: C.white, sleeve: C.white, mantle: { c: C.gold, trim: C.white }, collar: C.gold, belt: p, beads: 1, pants: '#f4e8c8', wide: 1, glove: C.gold, bracer: C.gold, wpn: { k: 'fist', glow: '#fff6a0', big: 1 }, aura: '#ffe060', sparkle: 1 },
    ][t - 2],
    // 时空术士 → 时空法师 → 时空贤者：沙漏 / 时钟杖，悬浮沙漏，时针光环
    mage: (t, p, q) => [
      { head: { t: 'circlet', c: C.silver, gem: '#7ad8ff' }, robe: { c: '#2a8a8a', trim: C.silver, sash: p }, belt: C.silver, wpn: STAFF(32, 'hourglass', { tc: C.silver }) },
      { head: { t: 'circlet', c: C.gold, gem: '#7ad8ff' }, robe: { c: '#1f6a6a', trim: C.gold, sash: p }, cape: { c: '#1a4a5a', c2: '#0e2a3a', trim: C.gold, dots: C.gold, len: 32 }, belt: C.gold, float: 'hourglass', wpn: STAFF(36, 'clock', { tc: C.gold }) },
      { head: { t: 'circlet', c: C.gold, gem: '#c8f4ff' }, robe: { c: '#1a1a4a', trim: C.gold, sash: p, stars: 1 }, cape: { c: '#14143a', c2: '#2a2a6a', trim: '#7ad8ff', dots: '#ffffff', len: 36 }, belt: C.gold, halo: 'clock', float: 'hourglass', wpn: STAFF(40, 'clock', { tc: C.gold, glow: '#c8f4ff', wood: C.gold }), aura: '#7ad8ff', sparkle: 1 },
    ][t - 2],
    // 召唤士 → 召唤王：符文长袍 + 水晶杖与精灵光球 → 王冠、魔典、环绕的多颗精灵
    sorcerer: (t, p, q) => [
      { head: { t: 'hood', c: '#2a3a6a' }, robe: { c: '#3a4a7a', trim: C.cyan, sash: p, runes: 1 }, belt: p, orbs: ['#8af0ff'], wpn: STAFF(34, 'crystal', { gem: C.cyan }) },
      { head: { t: 'crown', c: C.gold, gem: C.cyan }, robe: { c: '#2a3060', trim: C.gold, sash: p, runes: 1 }, cape: { c: p, c2: '#2a1a50', trim: C.gold, len: 34 }, belt: C.gold, book: '#6a2a8a', orbs: ['#8af0ff', '#ff90c0', '#b0ff90'], wpn: STAFF(36, 'crystal', { gem: '#c8a0ff', tc: C.gold }), aura: '#a0c0ff', sparkle: 1 },
    ][t - 1],
    // 风鹰术士 → 风暴之翼：青羽鸟人持杖 → 闪电缠绕的风暴之翼
    hawk: (t, p, q) => [
      { beast: 'hawk', hair: '#3a9a9a', armor: { t: 'harness', c: C.leather }, mantle: { c: '#2a6a6a', trim: C.silver }, skirt: { t: 'tunic', c: p }, wings: { c: '#3a9a9a', c2: '#e8fff8' }, wpn: STAFF(30, 'gem', { gem: C.cyan, tc: C.silver }) },
      { beast: 'hawk', hair: '#2a7a8a', head: { t: 'beakhelm', c: C.silver, crest: C.cyan }, armor: { t: 'plate', c: C.silver, c2: '#5a7a8a', trim: C.cyan }, emblem: p, mantle: { c: '#1a4a5a', trim: C.cyan }, skirt: { t: 'tunic', c: p }, wings: { c: '#1a5a6a', c2: '#7af0ff', big: 1 }, storm: 1, wpn: STAFF(34, 'orb', { gem: C.cyan, glow: '#c8f8ff', tc: C.silver }), aura: '#7af0ff', sparkle: 1 },
    ][t - 1],
    // 冒险者 B：圣骑士（白马、塔盾、骑枪）→ 龙领主（骑红龙）
    adventurer: (t, p, q) => [
      { head: { t: 'helm', c: C.white, visor: 1, plume: C.gold }, armor: { t: 'plate', c: C.white, c2: C.pearl, trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 24 }, shield: { s: 'tower', c: C.white, c2: C.gold, e: C.gold, cross: 1 }, wpn: { k: 'lance', len: 40, c: C.blade, flag: p, gold: 1 }, mount: { t: 'horse', c: '#f2f2f6', m: '#e0d0a0', bard: p, trim: C.gold, plate: C.silver } },
      { head: { t: 'helm', c: '#7a1a1a', visor: 1, horns: C.gold, plume: C.gold }, armor: { t: 'plate', c: '#8a2020', c2: '#4a0a0a', trim: C.gold }, emblem: p, pads: { c: C.gold, big: 1 }, cape: { c: p, c2: q, trim: C.gold, len: 24 }, wpn: { k: 'lance', len: 46, c: '#ffffff', flag: p, gold: 1, glow: '#ffb070' }, mount: { t: 'wyvern', c: '#c83a2a', c2: '#7a1a1a', belly: '#f4c542', blanket: p, trim: C.gold }, aura: '#ffb060', sparkle: 1 },
    ][t - 2],
    // 剑手 B：魔法剑士（法师披肩 + 青光符文剑）→ 灵剑使（白衣、环绕的灵剑光球）
    swordHand: (t, p, q) => [
      { fixW: 1, head: { t: 'circlet', c: C.silver, gem: '#6af0e0' }, armor: { t: 'leather', c: '#2a5a6a', c2: '#1a3a4a' }, mantle: { c: q, trim: C.silver }, skirt: { t: 'tunic', c: p }, wpn: SW(22, '#d8fff8', C.silver, { glow: '#6af0e0', runes: 1, twin: '#ffffff' }), trail: '#6af0e0', sparkle: 1 },
      { fixW: 1, head: { t: 'crown', c: C.silver, gem: '#6af0e0' }, armor: { t: 'coat', c: C.white }, shirt: p, mantle: { c: '#2a6a7a', trim: C.silver }, cape: { c: C.white, c2: '#a8e8e0', trim: '#6af0e0', len: 34 }, orbs: ['#a8fff0', '#ffffff', '#a8fff0'], wpn: SW(25, '#ffffff', C.silver, { glow: '#a8fff0', big: 1, runes: 1, twin: '#6af0e0' }), trail: '#a8fff0', aura: '#a8fff0', sparkle: 1 },
    ][t - 2],
    // 连弩手 B：黑精灵（尖耳、暗色皮甲、紫光暗之弓）
    crossbowman: (t, p, q) => [
      { fixW: 1, elf: 1, skin: '#c8b0d8', head: { t: 'circlet', c: '#c040ff', gem: '#ff3060' }, armor: { t: 'leather', c: '#2a1a3a', c2: '#c040ff' }, cape: { c: '#2a1a3a', c2: '#14081e', trim: '#c040ff', len: 28 }, skirt: { t: 'tunic', c: p }, quiver: 1, wpn: { k: 'bow', size: 17, c: '#3a2a4a', tip: '#c040ff', str: '#e0a0ff', arrow: '#a040ff' }, aura: '#a040ff', sparkle: 1 },
    ][t - 2],
    // 通灵使 B：邪灵使（骨角、暗绿长袍、邪灵光球）
    medium: (t, p, q) => [
      { fixW: 1, head: { t: 'horns', c: C.bone, gem: '#7aff7a' }, robe: { c: '#1a2a1e', trim: '#7aff7a', sash: p, runes: 1 }, mantle: { c: '#14200e', trim: '#7aff7a', collar: 1 }, cape: { c: '#14200e', c2: '#3a1a4a', trim: '#7aff7a', len: 34 }, orbs: ['#7aff7a', '#c060ff'], wpn: STAFF(36, 'skull', { wood: '#2a2a1e', gem: '#7aff7a' }), style: 'gu', aura: '#7aff7a', sparkle: 1 },
    ][t - 2],
    // ---- 狂神降世 B 路线 ----
    halberdier: (t, p, q) => [{ fixW: 1, head: { t: 'helm', c: C.steel, visor: 1, crest: p }, armor: { t: 'plate', c: C.steel, c2: C.dSteel }, emblem: p, pads: { c: C.steel, big: 1 }, shield: { s: 'tower', c: p, c2: C.steel, e: C.steel }, wpn: HALB(C.steel, { len: 38, flag: p }), mount: { t: 'horse', c: '#5a4a3a', m: '#1a1410', bard: '#8a8f9c', trim: p, plate: C.steel } }][t - 2],
    tribesman: (t, p, q) => [{ fixW: 1, head: { t: 'band', c: '#f0a030', tail: 1 }, armor: { t: 'tunic', c: '#f0a030' }, shirt: '#f0a030', sleeve: '#f0a030', collar: '#c87818', belt: p, beads: 1, pants: '#e89028', wide: 1, glove: '#f4ecd8', bracer: C.steel, wpn: { k: 'fist', glow: '#ffd890' } }][t - 2],
    alchemist: (t, p, q) => [{ fixW: 1, head: { t: 'horns', c: '#2a3a1a', gem: '#9aff4a' }, robe: { c: '#1e2a14', trim: '#9aff4a', sash: p, runes: 1 }, mantle: { c: '#14200e', trim: '#9aff4a', collar: 1 }, cape: { c: '#14200e', c2: '#4a1a5a', trim: '#9aff4a', len: 34 }, flasks: 1, orbs: ['#9aff4a', '#c040ff'], wpn: STAFF(36, 'skull', { wood: '#2a2a1e', gem: '#9aff4a' }), style: 'flask', aura: '#9aff4a', sparkle: 1 }][t - 2],
    amazon: (t, p, q) => [{ fixW: 1, head: { t: 'band', c: C.red, tail: 1 }, armor: { t: 'tunic', c: C.red }, shirt: C.red, sleeve: C.red, collar: C.gold, belt: C.gold, pants: '#3a2a2a', wide: 1, glove: '#f4ecd8', bracer: C.gold, wpn: { k: 'fist', glow: '#ffb090' } }][t - 1],
    nun: (t, p, q) => [{ fixW: 1, head: { t: 'circlet', c: '#a8e070', wings: '#e8ffe0', gem: '#7aff6a' }, robe: { c: '#3a7a3a', trim: '#e8ffe0', sash: p }, mantle: { c: '#e8ffe0', trim: '#7aff6a' }, belt: '#7aff6a', orbs: ['#a8ff90', '#a0f0ff', '#ffe080'], wpn: STAFF(34, 'crystal', { gem: '#a8ff90' }), aura: '#a8ff90', sparkle: 1 }][t - 1],
    // 月影狼 → 月神狼：银蓝毛皮、额上新月 → 发光白狼、月轮光环；扑击更快
    wolf: (t, p, q) => [
      { beast: 'wolf', fur: '#9aaccc', mark: C.gold, armor: { t: 'harness', c: '#c8d0e0' }, skirt: { t: 'tunic', c: p }, wpn: { k: 'claw', c: '#e8eef8' }, fast: 1 },
      { beast: 'wolf', fur: '#e8eef8', mark: C.gold, halo: 'moon', armor: { t: 'plate', c: C.silver, c2: '#7a8ab8', trim: '#7ab0ff' }, emblem: p, pads: { c: C.silver, big: 1 }, cape: { c: p, c2: q, trim: C.silver }, skirt: { t: 'tassets', c: C.silver, c2: p }, wpn: { k: 'claw', c: '#ffffff', big: 1, glow: '#c8e8ff' }, fast: 1, aura: '#c8e0ff', sparkle: 1 },
    ][t - 1],
  };

  // 规格补完：默认色、衣袖 / 手套 / 腿甲依护甲类型推导
  function finalize(S, base) {
    const a = S.armor;
    S.shirt = S.shirt || S.p;
    if (!S.sleeve) S.sleeve = a && (a.t === 'plate') ? a.c : a && a.t === 'chain' ? a.c : a && a.t === 'bare' ? S.skin : S.shirt;
    if (S.beast === 'wolf') { S.sleeve = S.fur; S.skin = S.fur; }
    if (S.beast === 'hawk') { S.skin = S.hair; S.sleeve = S.sleeve === S.shirt ? S.hair : S.sleeve; }
    if (!S.bracer && a && a.t === 'plate') S.bracer = a.c;
    if (!S.glove) S.glove = a && a.t === 'plate' ? a.c2 : a && a.t === 'chain' ? C.dLeather : null;
    S.pants = S.pants || (S.beast === 'wolf' ? S.fur : S.beast === 'hawk' ? S.hair : C.pants);
    S.boots = S.boots || (S.beast ? null : a && a.t === 'plate' ? a.c : C.leather);
    if (!S.greave && a && a.t === 'plate') S.greave = a.c;
    S.belt = S.belt || C.dLeather;
    S.bulk = a && (a.t === 'plate' || a.t === 'do') ? 1.22 : 1.08;
    if (S.robe) { S.robe.c2 = S.robe.c2 || S.robe.c; if (!base.sleeve) S.sleeve = S.robe.c; if (!base.bracer) S.bracer = S.robe.trim; }
    return S;
  }
  // ---------------- 装备外观（我方 / 友军）：武器种类、品级金属色与光芒；护甲改变身体层 ----------------
  const ROBE_CLOTH = ['#8a7a5a', '#6a5a8a', '#4a5aa8', '#8a3aa8', '#5a2a8a'];
  function gearWeapon(cur, W, S) {
    const [dk, md, lt] = W.metal, gr = W.grade, gold = gr >= 3;
    const MAP = { sword: 'sword', blade: 'katana', lance: 'lance', bow: 'bow', staff: 'staff', axe: 'axe', claw: 'claw' };
    let k = MAP[W.kind]; if (!k) return cur;
    if (k === 'bow' && cur.k === 'xbow') k = 'xbow';
    if (k === 'claw' && cur.k === 'fist') k = 'fist';
    const DEF = { sword: () => SW(18, C.steel, C.dSteel), katana: () => ({ k: 'katana', len: 24, c: C.blade, g: C.dIron }), lance: () => ({ k: 'lance', len: 36, c: C.steel, flag: S.p }),
      bow: () => ({ k: 'bow', size: 14, c: C.wood }), xbow: () => ({ k: 'xbow', c: C.wood, m: C.steel }), staff: () => STAFF(30, 'gem', { gem: C.cyan }), axe: () => ({ k: 'axe', len: 20, h: 1, c: C.steel }),
      claw: () => ({ k: 'claw', c: C.steel }), fist: () => ({ k: 'fist' }) };
    const w = cur.k === k ? Object.assign({}, cur) : DEF[k]();
    w.glow = W.glow || null;
    switch (k) {
      case 'sword': w.c = lt; w.g = gold ? C.gold : md; w.big = gr >= 3 ? 1 : 0; w.wood = gr === 0 && cur.wood ? 1 : 0; w.len = Math.max(w.len || 18, 15 + gr * 2); if (!W.glow) w.runes = 0; break;
      case 'katana': w.c = lt; w.g = gold ? C.gold : dk; break;
      case 'axe': w.c = lt; w.g = gold ? C.gold : md; if (gr >= 3 && (w.h || 0) < 2) w.h = 2; if (gr >= 4) w.h = 3; break;
      case 'lance': w.c = lt; w.gold = gold ? 1 : 0; w.dark = 0; w.len = Math.max(w.len || 34, 32 + gr * 2); break;
      case 'bow': w.c = [C.wood, '#6a4a2a', '#c4ccd8', C.gold, '#a868e8'][gr]; w.tip = lt; w.size = Math.max(w.size || 14, 13 + gr); if (W.glow) { w.str = W.glow; w.arrow = W.glow; } else { delete w.str; delete w.arrow; } break;
      case 'xbow': w.c = gold ? C.gold : C.wood; w.m = lt; w.big = gr >= 3 ? 1 : w.big; break;
      case 'staff': w.wood = gr <= 1 ? C.wood : gr === 2 ? '#c4ccd8' : C.gold; w.tc = gold ? C.gold : md; if (W.glow) w.gem = W.glow; w.len = Math.max(w.len || 30, 28 + gr * 2); break;
      case 'claw': w.c = lt; w.big = gr >= 2 ? 1 : w.big; break;
      case 'fist': w.glow = W.glow || (gr >= 2 ? lt : null); break;
    }
    return w;
  }
  function gearArmor(S, A) {
    const [dk, md, lt] = A.metal, gr = A.grade, legend = gr >= 4 || !!A.glow;
    const isCape = /cape|cloak/i.test(A.id || '');
    switch (A.weight) {
      case 'shield':
        if (!['bow', 'xbow', 'katana'].includes(S.wpn.k) && !(S.wpn.k === 'axe' && !S.wpn2) && !S.book) S.shield = { s: /round/i.test(A.id || '') || /圆/.test((ITEMS[A.id] || {}).name || '') ? 'round' : gr >= 2 ? 'kite' : 'round', c: md, c2: legend ? C.gold : dk, e: S.p };
        break;
      case 'cloth':
        if (isCape) S.cape = Object.assign({}, S.cape || {}, { c: ROBE_CLOTH[gr], c2: dk, trim: legend ? C.gold : lt, len: (S.cape && S.cape.len) || 26 });
        else if (S.robe) S.mantle = { c: ROBE_CLOTH[gr], trim: legend ? C.gold : lt };
        else { S.armor = { t: 'coat', c: ROBE_CLOTH[gr] }; S.mantle = gr >= 2 ? { c: ROBE_CLOTH[gr], trim: lt } : S.mantle; }
        break;
      case 'leather':
        if (S.robe) { S.belt = C.leather; S.bracer = C.leather; }
        else { S.armor = { t: 'leather', c: gr >= 1 ? '#7a4a2a' : C.leather, c2: gr >= 1 ? lt : C.dLeather }; S.bracer = C.leather; }
        break;
      case 'mail':
        if (S.robe) S.pads = { c: md };
        else { S.armor = { t: 'chain', c: lt, c2: md }; S.tabard = S.p; S.emblem = legend ? C.gold : S.emblem; S.pads = gr >= 2 ? { c: md } : S.pads; S.sleeve = lt; }
        break;
      default: // plate
        if (S.robe) { S.pads = { c: md, big: gr >= 2 ? 1 : 0 }; S.bracer = md; }
        else {
          S.armor = { t: 'plate', c: md, c2: dk, trim: legend ? C.gold : null };
          S.emblem = legend ? (A.glow || C.gold) : S.p;
          S.pads = { c: gr >= 3 ? lt : md, big: gr >= 2 ? 1 : 0 };
          S.greave = md; S.bracer = md; S.glove = dk; S.sleeve = md; S.boots = md;
        }
    }
    if (legend && A.glow && !S.aura) S.aura = A.glow;
  }
  function applyGear(S, u, CL, alt, isB) {
    const W = u.weapon ? gearLook(u.weapon) : null, A = u.armor ? gearLook(u.armor) : null;
    if (W && W.kind !== 'armor' && W.kind !== 'acc') {
      const allowed = (isB && alt && alt.weapon) || (CL && CL.weapon) || [];
      if (allowed.includes(W.kind)) S.wpn = gearWeapon(S.wpn, W, S);
    }
    if (A && A.kind === 'armor') gearArmor(S, A);
  }
  const SPEC_CACHE = {};
  function specOf(u) {
    const cls = u.cls, CL = typeof CLASSES !== 'undefined' && CLASSES[cls];
    const team = TEAM_PAL[u.team] ? u.team : 'enemy', p = TEAM_PAL[team].p, q = TEAM_PAL[team].q;
    const alt = CL && CL.alt, at = alt && alt.at != null ? alt.at : ALT_AT[cls];
    const n = Math.max(CL ? CL.tiers.length : 1, alt && alt.tiers ? at + alt.tiers.length : 0), t = clamp(u.tier | 0, 0, n - 1);
    const isB = u.path === 'b' && at != null && t >= at;
    const wk = (typeof ITEMS !== 'undefined' && u.weapon && ITEMS[u.weapon] && ITEMS[u.weapon].kind) || '';
    const key = [cls, t, team, u.hair || '', u.id || '', wk, u.element || '', u.color || '', isB ? 'b' : 'a', u.sex || '', u.weapon || '', u.armor || ''].join('|');
    if (SPEC_CACHE[key]) return SPEC_CACHE[key];
    const fn = (isB && LINES_B[cls]) || LINES[cls] || (CL && LINES[CL.sprite]);
    let S;
    if (!fn) {
      const sk = CL ? CL.sprite : cls;
      S = { kind: 'sprite', sk, dragon: /dragon/i.test(sk || '') || cls === 'babyDragon', fly: !!(CL && CL.tiers[t] && CL.tiers[t].move === 'fly'), big: ['giant', 'yeti', 'sphinx', 'kraken', 'hydra', 'demon', 'darkLord', 'dragon', 'console', 'turtle'].includes(sk) };
      S.scale = S.big ? 4.0 : cls === 'babyDragon' ? 3.0 + t * 0.3 : 3.3;
      if (cls === 'gWhiteDragon' || cls === 'gBlackDragon') { S.tintM = cls === 'gWhiteDragon' ? 'white' : 'black'; S.breath = cls === 'gWhiteDragon' ? 'blue' : 'red'; S.scale = 4.2; }
      if (isB && cls === 'babyDragon') { S.ice = 1; S.skB = ((alt && alt.sprite) || 'dragon_b'); S.breath = 'blue'; S.scale += 0.2 * (t - at + 1); }
    } else {
      const base = fn(t, p, q, u) || {};
      const hdef = (typeof HEROES !== 'undefined' && HEROES[u.id]) || (typeof CAMPAIGN_HEROES !== 'undefined' && CAMPAIGN_HEROES.g2 && CAMPAIGN_HEROES.g2[u.id]) || null;
      const sex = u.sex || (hdef && hdef.sex) || (CL && CL.sex) || 'm';
      S = Object.assign({ kind: 'doll', p, q, t, path: isB ? 'b' : 'a', skin: C.skin, hair: u.hair || '#3a2a1a', hs: HAIR_STYLE[u.id] || (sex === 'f' ? 'long' : 'short'), beard: !!BEARD[u.id] }, base);
      if (isB && cls === 'hawk' && base.hair) S.hair = base.hair;
      S.wpn = Object.assign({}, S.wpn || { k: 'none' });
      // 装备的武器种类可覆盖默认（如武士改拿剑、鹰族拿爪）
      const ally = team === 'player' || team === 'ally';
      if (ally && typeof gearLook === 'function') applyGear(S, u, CL, alt, isB);
      else if (!isB && !base.scaleK && !base.fixW && wk && wk !== S.wpn.k && !(S.wpn.k === 'xbow' && wk === 'bow') && !(cls === 'prayer' && wk === 'staff')) {
        if (wk === 'sword') S.wpn = SW(19, C.steel, C.dSteel);
        else if (wk === 'blade') S.wpn = { k: 'katana', len: 24, c: C.blade, g: C.dIron };
        else if (wk === 'claw') S.wpn = { k: 'claw', c: C.steel };
        else if (wk === 'lance') S.wpn = { k: 'lance', len: 34, c: C.steel, flag: p };
        else if (wk === 'axe') S.wpn = { k: 'axe', len: 20, h: 1, c: C.steel };
        else if (wk === 'staff') S.wpn = STAFF(30, 'gem', { gem: C.cyan });
        else if (wk === 'bow') S.wpn = { k: 'bow', size: 14, c: C.wood };
      }
      if (u.id === 'mengqi' || cls === 'writer') { S.scarf = C.red; S.scarfLong = t >= 1; }
      if (S.hs === 'pony' && S.head && ['helm', 'kettle', 'hood', 'cowl', 'mask'].includes(S.head.t)) S.hs = 'long';
      finalize(S, base);
    }
    return (SPEC_CACHE[key] = S);
  }

  // ---------------- 姿势 ----------------
  // 所有角度为绝对方向（0 下、90 前、180 上）；X = 冲刺进度、P = 穿越（以两人间距为 1）、dx/Y = 美术像素位移
  const P0 = { X: 0, P: 0, dx: 0, Y: 0, rot: 0, sq: 0, al: 1, lean: 4, hd: 0, lt: 10, ls: -4, bt: -14, bs: -18, fa: 20, fe: 80, ba: -8, be: 14, w: 150,
    dr: 0, sik: 0, two: 0, ra: 0, ga: 0, mp: 0, wf: 0, tr: 0, mo: 0, ld: 1, glw: 0, fl: 0 };
  const STANCE = {
    sword: { fa: 25, fe: 95, w: 138, ba: -15, be: 18, lean: 6 },
    katana: { fa: 35, fe: 105, w: 122, two: 1, lean: 8, lt: 18, ls: -6, bt: -20, bs: -22 },
    axe: { fa: 30, fe: 95, w: 148, two: 1, lean: 6 },
    lance: { fa: 18, fe: 80, w: 162 },
    fork: { fa: 18, fe: 80, w: 160 },
    staff: { fa: 50, fe: 90, w: 176, lean: 2 },
    bow: { ba: 35, be: 60, fa: 8, fe: 30, lean: 0 },
    xbow: { fa: 14, fe: 75, w: 112, two: 1, lean: 2 },
    claw: { fa: 40, fe: 150, ba: 28, be: 135, lean: 14, lt: 22, ls: -10, bt: -26, bs: -32 },
    cannon: { fa: 40, fe: 92, w: 92, ba: 30, be: 80, lean: 4 },
    fist: { fa: 50, fe: 140, ba: 40, be: 125, lean: 10, lt: 22, ls: -10, bt: -26, bs: -32 },
    none: { fa: 30, fe: 135, ba: 20, be: 120, lean: 8 },
  };
  function stance(S) {
    if (S.kind !== 'doll') return Object.assign({}, P0);
    const k = S.wpn.k, st = Object.assign({}, P0, STANCE[k] || STANCE.none);
    if (S.mount) Object.assign(st, { lt: 62, ls: -8, ba: 40, be: 80, lean: 4 }, k === 'lance' ? { fa: 18, fe: 85, w: 158 } : {});
    if (S.robe) Object.assign(st, { lt: 6, ls: 0, bt: -8, bs: -8 });
    if (S.wings) Object.assign(st, { wf: 0.25 }, k === 'claw' ? { fa: 50, fe: 100, ba: 40, be: 95 } : {});
    if (S.shield) Object.assign(st, S.mount ? { ba: 35, be: 100 } : { ba: 70, be: 92 });
    if (S.wpn2) Object.assign(st, { two: 0, ba: 25, be: 110, fa: 35, fe: 120 });
    if (S.book) Object.assign(st, { ba: 40, be: 95 });
    if (S.hover) Object.assign(st, { Y: -9, lt: 25, ls: 10, bt: -10, bs: 20 });
    return st;
  }
  const EASE = { in: t => t * t, out: t => 1 - (1 - t) * (1 - t), lin: t => t, io: t => t * t * (3 - 2 * t) };
  function mkKeys(arr) { return arr.map(k => ({ t: k[0], p: k[1] || {}, e: EASE[k[2] || 'io'] })); }
  function sample(base, keys, ms) {
    const P = Object.assign({}, base);
    if (!keys || !keys.length) return P;
    if (ms <= keys[0].t) return Object.assign(P, keys[0].p);
    for (let i = 1; i < keys.length; i++) {
      const k1 = keys[i];
      if (ms > k1.t) continue;
      const k0 = keys[i - 1], t = k1.e(clamp((ms - k0.t) / Math.max(1, k1.t - k0.t), 0, 1));
      for (const f in k0.p) { const a = k0.p[f], b = f in k1.p ? k1.p[f] : base[f]; P[f] = a + (b - a) * t; }
      for (const f in k1.p) if (!(f in k0.p)) { const a = base[f], b = k1.p[f]; P[f] = a + (b - a) * t; }
      return P;
    }
    return Object.assign(P, keys[keys.length - 1].p);
  }
  // 程序化次级动作：呼吸、奔跑步伐、振翅
  function proc(P, S, now, seed) {
    const b = Math.sin(now * 0.0042 + seed);
    if (S.hover) P.Y += Math.sin(now * 0.005 + seed) * 2;
    P.lean += b * 1.2; P.fa += b * 2; P.w += b * 2.5; P.ba -= b * 1.5;
    if (!S.mount && !S.robe && !P.ra) { const k = (b + 1) * 2.2; P.lt += k; P.ls -= k; P.bt += k * 0.4; P.bs -= k * 0.8; }
    if (P.ra > 0.01) {
      const ph = now * 0.017, s1 = Math.sin(ph), c1 = Math.cos(ph), r = P.ra;
      P.lt += r * 36 * s1; P.bt -= r * 36 * s1;
      P.ls = P.lt - r * (14 + 50 * Math.max(0, c1)); P.bs = P.bt - r * (14 + 50 * Math.max(0, -c1));
      if (P.two < 0.5 && S.wpn.k !== 'bow') { P.ba += r * 30 * s1; P.be = P.ba + 40; }
      P.Y -= r * 2.5 * Math.abs(c1);
    }
  }

  // ---------------- 骨架（正向运动学 + 两段 IK） ----------------
  const L1 = 4.2, L2 = 3.8, A1 = 4.6, A2 = 4.2, KU = 0.52, KV = 1.32, TL = 15 * KU, NK = 0.8, HR = 6.3 * 2.1;
  // 躯干局部坐标（沿用原 17 高的躯干单位）→ Q 版短胖躯干
  const T = (J, v, u, bk) => [J.hip[0] + J.fw[0] * v * KV * (bk || 1) + J.up[0] * u * KU, J.hip[1] + J.fw[1] * v * KV * (bk || 1) + J.up[1] * u * KU];
  const TLoc = (J, px, py, bk) => { const rx = px - J.hip[0], ry = py - J.hip[1]; return [(rx * J.fw[0] + ry * J.fw[1]) / (KV * (bk || 1)), (rx * J.up[0] + ry * J.up[1]) / KU]; };
  function ik2(s, tgt, l1, l2, bend) {
    let dx = tgt[0] - s[0], dy = tgt[1] - s[1], d = Math.hypot(dx, dy);
    const mx = l1 + l2 - 0.05; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; } if (d < 0.5) d = 0.5;
    const base = Math.atan2(dx, dy) / RAD, c = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const a1 = base + bend * Math.acos(c) / RAD, e = add(s, dv(a1, l1));
    return [a1, angOf(e, add(s, [dx, dy]))];
  }
  function rigHuman(P, S, seat) {
    const J = {};
    const hip = seat ? seat.slice() : [0, 0];
    J.kF = add(add(hip, [0.6, 0]), dv(P.lt, L1)); J.fF = add(J.kF, dv(P.ls, L2));
    J.kB = add(add(hip, [-0.6, 0]), dv(P.bt, L1)); J.fB = add(J.kB, dv(P.bs, L2));
    let oy = 0;
    if (!seat) { oy = -(Math.max(J.fF[1], J.fB[1]) + 3.4) + P.Y; for (const k of ['kF', 'fF', 'kB', 'fB']) J[k][1] += oy; hip[1] += oy; }
    J.hip = hip; J.ground = seat ? null : P.Y;
    const up = dv(180 - P.lean), fw = dv(90 - P.lean);
    J.up = up; J.fw = fw;
    J.sh = add(hip, up, TL); J.neck = add(hip, up, TL + NK);
    J.hc = add(J.neck, dv(180 - P.lean * 0.5 - P.hd, HR * 0.68)); J.hc = [Math.round(J.hc[0]), Math.round(J.hc[1])];
    J.ha = P.lean * 0.5 + P.hd;
    J.sF = add(add(J.sh, fw, 1.5), up, -1.5); J.sB = add(add(J.sh, fw, -2.5), up, -1.5);
    let fa = P.fa, fe = P.fe, ba = P.ba, be = P.be;
    J.eF = add(J.sF, dv(fa, A1)); J.hF = add(J.eF, dv(fe, A2));
    J.wd = dv(P.w);
    const k = S.wpn.k;
    if (k === 'bow') {
      J.eB = add(J.sB, dv(ba, A1)); J.hB = add(J.eB, dv(be, A2));
      J.aim = be;
      if (P.sik > 0.5) { const tgt = add(J.hB, dv(be), -(2 + 7 * P.dr)); [fa, fe] = ik2(J.sF, tgt, A1, A2, -1); J.eF = add(J.sF, dv(fa, A1)); J.hF = add(J.eF, dv(fe, A2)); }
    } else if (P.two > 0.5) {
      const grip = k === 'xbow' ? add(J.hF, J.wd, 5) : k === 'staff' || k === 'fork' ? add(J.hF, J.wd, -5) : add(J.hF, J.wd, -3.6);
      [ba, be] = ik2(J.sB, grip, A1, A2, k === 'xbow' ? -1 : -1);
      J.eB = add(J.sB, dv(ba, A1)); J.hB = add(J.eB, dv(be, A2));
    } else { J.eB = add(J.sB, dv(ba, A1)); J.hB = add(J.eB, dv(be, A2)); }
    J.fe = fe; J.be = be; J.fa = fa; J.ba = ba;
    return J;
  }
  // 武器尖端（拖影与特效定位用）
  function weaponTip(J, S, P) {
    const w = S.wpn, k = w.k;
    if (w.anchor) return [add(J.hF, J.wd, w.len * 0.5), add(J.hF, J.wd, w.len + 2)];
    if (k === 'sword' || k === 'katana') return [add(J.hF, J.wd, 3), add(J.hF, J.wd, w.len)];
    if (k === 'axe') return [add(J.hF, J.wd, w.len * 0.55), add(add(J.hF, J.wd, w.len - 2), dv(P.w - 90), 6)];
    if (k === 'lance' || k === 'fork') return [add(J.hF, J.wd, w.len * 0.5), add(J.hF, J.wd, w.len)];
    if (k === 'staff') return [add(J.hF, J.wd, w.len * 0.35), add(J.hF, J.wd, w.len - 12)];
    if (k === 'claw' || k === 'none' || k === 'fist') return [J.eF, add(J.hF, dv(J.fe), 5)];
    if (k === 'cannon') return [J.hF, add(J.hF, J.wd, 16)];
    return [J.hF, J.hF];
  }

  // ---------------- 坐骑骨架（Q 版：圆胖身体、短腿、大头） ----------------
  function rigMount(P, M, now) {
    const R = {}, fly = M.t !== 'horse', ga = P.ga || 0, ph = now * 0.019;
    const hov = fly ? -6 + Math.sin(now * 0.004) * 2 : 0;
    const B = [0, -14.5 + hov + P.Y - (ga && !fly ? Math.abs(Math.sin(ph)) * 2.5 * ga : 0)];
    const pitch = P.mp + (ga ? Math.sin(ph * 2) * 3 * ga : 0);
    const cs = Math.cos(-pitch * RAD), sn = Math.sin(-pitch * RAD);
    const L = v => [B[0] + v[0] * cs - v[1] * sn, B[1] + v[0] * sn + v[1] * cs];
    R.B = B; R.L = L; R.pitch = pitch; R.fly = fly;
    const nod = Math.sin(now * 0.005) * 3 + (ga ? Math.sin(ph * 2) * 6 * ga : 0) + P.mo * 10;
    if (M.t === 'wyvern') {
      R.legs = [[-4, 4.5, 1], [-2.5, 5, 0]].map(([x, y, far]) => {
        const hip = L([x, y]);
        const a1 = fly ? -30 + Math.sin(now * 0.004 + far) * 6 : 0, k = add(hip, dv(a1 + 20, 3.8)), f = add(k, dv(a1 - 40, 3.8));
        return { hip, k, f, far };
      });
      const nb = L([10, -4]), n1 = add(nb, dv(138 - pitch + nod * 0.5, 7)), hd = add(n1, dv(162 - pitch + nod, 5));
      R.neck = [nb, n1, hd]; R.head = hd; R.muzzle = add(hd, dv(105 - pitch + nod * 0.6, 8));
      const sw = Math.sin(now * 0.004) * 10;
      const t0 = L([-11, 0]), t1 = add(t0, dv(-70 + sw * 0.4, 7)), t2 = add(t1, dv(-80 + sw, 7)), t3 = add(t2, dv(-90 + sw * 1.6, 6));
      R.tail = [t0, t1, t2, t3];
      R.wroot = L([1, -6]);
    } else {
      R.legs = [[7.5, 4.5, 0, 1], [-7.5, 4.5, Math.PI, 1], [9, 5, 0.6, 0], [-6, 5, Math.PI + 0.6, 0]].map(([x, y, o, far]) => {
        const hip = L([x, y]), front = x > 0;
        let a1, a2;
        if (ga) { const s1 = Math.sin(ph + o), c1 = Math.cos(ph + o); a1 = ga * (front ? 8 + 38 * s1 : -6 + 34 * s1); a2 = front ? a1 - ga * (6 + 70 * Math.max(0, c1)) : a1 + ga * (10 + 30 * Math.max(0, -c1)); }
        else if (fly) { a1 = front ? 40 + Math.sin(now * 0.004) * 6 : -35; a2 = front ? -30 : 15; }
        else { a1 = front ? 2 : -3; a2 = front ? 0 : 4; }
        const k = add(hip, dv(a1, 3.6)), f = add(k, dv(a2, 4));
        return { hip, k, f, far };
      });
      const nb = L([11, -4]), nt = add(nb, dv(126 - pitch + nod, 9));
      R.neck = [nb, nt]; R.head = nt; R.muzzle = add(nt, dv(108 - pitch + nod, 7));
      const sw = Math.sin(now * 0.005) * 8 + (ga ? 25 * ga : 0);
      const t0 = L([-12, -3]), t1 = add(t0, dv(-40 - sw * 0.5, 5)), t2 = add(t1, dv(-20 - sw, 6));
      R.tail = [t0, t1, t2];
      R.wroot = L([3, -6]);
    }
    R.seat = L([-3.5, -9.5]);
    return R;
  }

  // ---------------- 绘制：零件 ----------------
  let NOW = 0;
  // Q 版：头部局部坐标放大 HK 倍（帽 / 盔 / 冠随大头一起放大），线宽放大 HKW 倍
  const HK = 2.1, HKW = 1.6;
  const discK = (p, r, c) => disc(p, r * HK, c);
  const capK = (a, b, r0, r1, c) => cap(a, b, r0 * HKW, (r1 == null ? r0 : r1) * HKW, c);
  const chainK = (pts, r0, r1, c) => chain(pts, r0 * HKW, r1 * HKW, c);
  const ellK = (p, rx, ry, a, c) => ell(p, rx * HK, ry * HK, a, c);
  const dotK = (p, c) => disc(p, 0.9, c);
  function featherWing(root, wa, sc, c, c2, fl) {
    part(fl);
    const wr = add(root, dv(wa, 9 * sc)), dirs = [24, 44, 64, 84, 104], lens = [17, 16, 14, 12, 10];
    const pts = [root, wr];
    const tips = dirs.map((a, i) => add(wr, dv(wa + a, lens[i] * sc)));
    pts.push(...tips, add(root, dv(wa + 125, 7 * sc)));
    const cc = pc(c), cc2 = pc(c2);
    poly(pts, (px, py) => (Math.hypot(px - wr[0], py - wr[1]) > 9 * sc ? cc2 : cc));
    tips.forEach(tp => cap(mix(wr, tp, 0.45), tp, 1.9 * sc, 0.9, cc2));
    cap(root, wr, 3 * sc, 2.4 * sc, cc);
  }
  function batWing(root, wa, sc, c, c2, fl, back) {
    part(fl);
    const el = add(root, dv(wa, 13 * sc));
    const f = [add(el, dv(wa + 25, 18 * sc)), add(el, dv(wa + 60, 17 * sc)), add(el, dv(wa + 95, 13 * sc))];
    poly([root, el, f[0], mix(f[0], f[1], 0.5), f[1], mix(f[1], f[2], 0.55), f[2], back], pc(c2));
    const bc = pc(c);
    cap(root, el, 2.2 * sc, 1.6 * sc, bc); f.forEach(tp => cap(el, tp, 1.1, 0.5, bc));
    disc(el, 1.5, pc(C.bone));
  }
  function drawCape(J, S, P, mounted) {
    const cp = S.cape; if (!cp) return;
    part(NF);
    const fw = J.fw, up = J.up, A = T(J, -3.6, 14.5);
    const spd = Math.max(P.ra || 0, P.ga || 0, Math.abs(P.Y) > 6 ? 0.6 : 0);
    const phi = (mounted ? 38 : 17) + 30 * spd + Math.sin(NOW * 0.0035) * 4 - P.lean * 0.4;
    const len = (cp.len || 30) * (mounted ? 0.42 : 0.46), d = dv(-phi), pp = dv(90 - phi);
    const bot = add(A, d, len), wv = Math.sin(NOW * 0.009) * (1 + spd * 2);
    const pts = [T(J, 1.5, 17.5), add(A, pp, -2.4), add(add(A, d, len * 0.5), pp, -6), add(add(bot, pp, -7.5), d, wv), add(bot, d, -wv * 0.6), add(add(bot, pp, 5.5), d, wv * 0.8), T(J, 1.5, 6)];
    const c1 = pc(cp.c), c2 = pc(cp.c2 || cp.c), tr = pc(cp.trim || cp.c2 || cp.c), wh = pc('#ffffff'), bk = pc('#1a1020');
    poly(pts, (px, py) => {
      const rx = px - A[0], ry = py - A[1], along = rx * d[0] + ry * d[1], side = rx * pp[0] + ry * pp[1];
      if (along > len - 2.6 + Math.abs(side) * 0.05) return cp.ermine ? ((Math.floor(px) + Math.floor(py)) % 5 === 0 ? bk : wh) : tr;
      if (cp.dots && ((Math.floor(px) * 5 + Math.floor(py) * 3) % 17 === 0)) return pc(cp.dots);
      return side < -4 ? c2 : c1;
    });
  }
  function drawScarfTail(J, S, P) {
    part(NF);
    const n = add(add(J.neck, J.fw, -3.5), J.up, -1.5), spd = Math.max(P.ra || 0, Math.abs(P.Y) > 6 ? 0.6 : 0);
    const w1 = Math.sin(NOW * 0.011) * 9, w2 = Math.sin(NOW * 0.011 - 1.2) * 12;
    const base = -58 - spd * 28 - (P.lean < -8 ? 15 : 0);
    const l = (S.scarfLong ? 5.5 : 4.2) * (S.scarfLen || 1);
    const dr = S.scarfLen ? 22 : 0, a = add(n, dv(base + w1 - 8, l)), b = add(a, dv(base + w2 - 4 + dr, l)), c = add(b, dv(base + w2 * 1.3 + dr * 2, l * 0.8));
    const rc = pc(S.scarf), rd = pc(C.dRed);
    chain(S.scarfLong || S.scarfLen ? [n, a, b, c] : [n, a, b], 3.3, 2.6, (px, py, t) => rc);
    if (S.scarfLong) cap(add(n, [0, 1]), add(a, dv(base + 30, 3)), 2.1, 1.6, rd);
  }
  function drawArm(s, e, h, S, back, fe) {
    part(back ? BF : NF);
    const sl = pc(S.sleeve), br = pc(S.bracer || S.sleeve), gl = pc(S.glove || S.skin);
    cap(s, e, 3.2, 3, sl);
    cap(e, h, 3, 2.9, (px, py, t) => (t > 0.3 ? br : sl));
    if (S.beast === 'wolf' || S.beast === 'hawk') {
      const cl = pc(S.beast === 'hawk' ? '#e0b030' : C.bone);
      disc(h, 2.9, pc(S.sleeve));
      if (S.wpn.k !== 'claw') { cap(h, add(h, dv(fe + 20, 4)), 1, 0.6, cl); }
    } else disc(h, 3.2, gl);
    if (S.pads) {
      const pd = S.pads, j = part(back ? BF : NF);
      const a = angOf(s, e), pcol = pc(pd.c), pc2 = pc(pd.c2 || pd.c);
      if (pd.sode) { poly([add(s, dv(a + 90, 4.4)), add(s, dv(a - 90, 4.6)), add(add(s, dv(a, 7.5)), dv(a - 90, 5.2)), add(add(s, dv(a, 7.5)), dv(a + 90, 4.6))], (px, py) => { const d = (px - s[0]) * Math.sin(a * RAD) + (py - s[1]) * Math.cos(a * RAD); return (Math.floor(d) % 2) ? pcol : pc2; }); }
      else if (pd.fur) ell(add(s, [0, -0.5]), 5.2, 4, 0, (px, py) => ((Math.floor(px * 1.3) + Math.floor(py)) % 3 ? pcol : pc(C.dBrown)));
      else {
        const rx = pd.big ? 6 : 4.6, ry = pd.big ? 4.6 : 3.6;
        ell(add(add(s, dv(a, 1)), [0, -0.6]), rx, ry, 0, pd.ermine ? ((px, py) => ((Math.floor(px) * 3 + Math.floor(py)) % 4 ? pc(C.white) : pc('#1a1020'))) : pcol);
        if (pd.big) cap(add(s, dv(a, 2.5)), add(s, dv(a, 4.6)), 4.2, 3.6, pcol);
      }
      void j;
    }
  }
  function drawLeg(hip, k, f, S, back) {
    part(back ? BF : NF);
    const pa = pc(S.pants), bo = pc(S.boots || S.pants), gr = S.greave ? pc(S.greave) : 0;
    const wide = S.wide ? 1.3 : 0;
    cap(hip, k, 3.8 + wide, 3.5 + wide, pa);
    cap(k, f, 3.5 + wide, 3.3 + (wide ? 0.9 : 0), (px, py, t) => (gr && t > 0.12 ? gr : !wide && t > 0.4 ? bo : pa));
    const sa = angOf(k, f), toe = add(add(f, dv(sa + 92, 3.4)), [0, 0.4]);
    if (S.beast === 'hawk' || S.talons) { const tc = pc('#e0b030'); cap(f, add(f, dv(sa + 70, 5)), 1.5, 0.8, tc); cap(f, add(f, dv(sa + 110, 4.5)), 1.5, 0.8, tc); cap(f, add(f, dv(sa - 80, 3)), 1.3, 0.8, tc); }
    else if (S.beast === 'wolf') { cap(f, toe, 2.8, 2.3, pc(S.fur)); dot(add(toe, dv(sa + 92, 1)), pc(C.bone)); }
    else cap(add(f, [0, 0.4]), toe, wide ? 2.6 : 3.2, 2.7, wide ? pc(C.white) : gr || bo);
    if (gr) disc(k, 3.2, gr);
  }
  function drawTorso(J, S, P) {
    const id = part(NF);
    const h = J.hip, bk = S.bulk;
    const TP = (v, u) => T(J, v, u, bk);
    const pts = [TP(-4.4, 0), TP(4.2, 0), TP(4.9, 5), TP(5.7, 10), TP(5.2, 14), TP(3, 16.3), TP(-1, 16.8), TP(-4.4, 15.5), TP(-5.2, 8)];
    const a = S.armor, sh = pc(S.shirt), bl = pc(S.belt), bu = pc(S.buckle || S.belt);
    const ac = a ? pc(a.c) : 0, ac2 = a ? pc(a.c2 || a.c) : 0, tr = a && a.trim ? pc(a.trim) : 0;
    const em = S.emblem ? pc(S.emblem) : 0, tb = S.tabard ? pc(S.tabard) : 0, sk = pc(S.skin), col = S.collar ? pc(S.collar) : 0;
    const fur = S.fur ? pc(S.fur) : 0;
    poly(pts, (px, py) => {
      const [v, u] = TLoc(J, px, py, bk);
      if (u >= 1.2 && u < 3.8) return v > 2.4 && S.buckle ? bu : bl;
      if (col && u > 11 && Math.abs(v - (u - 11) * 0.9 - 1.2) < 1) return col;
      if (!a) return sh;
      switch (a.t) {
        case 'coat': return v > 2.8 && u > 8 ? (u > 14 ? sk : sh) : ac;
        case 'tunic': return u > 15 && v > 0 ? sk : ac;
        case 'vest': return a.bare ? (v < 1.2 || v > 4.6 ? ac : sk) : (v < 1.2 || v > 4.4 ? ac : sh);
        case 'leather': if (u > 14.6) return sh; return Math.abs(v - 1) < 0.55 || (u > 9.5 && u < 10.5) ? ac2 : ac;
        case 'chain': if (tb && v > -2.6 && u < 14.6) return em && Math.abs(v - 1.4) + Math.abs(u - 9) < 2 ? em : tb; return (Math.floor(px) + Math.floor(py)) & 1 ? ac : ac2;
        case 'plate': {
          if (u > 15.4) return ac2;
          if (tr && u < 4.4) return tr;
          if (em && Math.abs(v - 1.6) + Math.abs(u - 9.5) < 2.3) return em;
          if (Math.floor(u * KU) % 4 === 0 && u > 4) return ac2;
          return ac;
        }
        case 'do': return u > 14.8 ? ac2 : Math.floor(u * KU) % 3 === 0 ? ac2 : ac;
        case 'bare': if (a.paint && (Math.abs(u - 10.5 + v * 0.3) < 0.9 || Math.abs(u - 7.5 + v * 0.3) < 0.9) && v > -1) return pc(a.paint); return Math.abs(v - (u * 0.7 - 5.5)) < 0.9 ? ac : sk;
        case 'diamond': return u > 15.2 ? pc(S.collar || '#ffffff') : ((Math.floor(v * 0.8 + u * 0.5) + Math.floor(-v * 0.8 + u * 0.5)) & 1 ? ac : ac2);
        case 'ribs': return (u > 6 && u < 14.5 && Math.floor(u * KU) % 2 === 0 && Math.abs(v) < 4.4) || Math.abs(v + 3.6) < 0.8 ? pc('#5a4a3a') : ac;
        case 'harness': return (a.plate && u > 8) ? ac : (Math.abs(v - (u * 0.7 - 5.5)) < 0.9 || (u > 3.4 && u < 4.6) ? ac : (fur || sk));
      }
      return sh;
    });
    return id;
  }
  function drawSkirt(J, S, tid) {
    const sk = S.skirt; if (!sk) return;
    part(NF, tid);
    const h = J.hip, fw = J.fw, up = J.up, len = sk.t === 'tassets' ? 0.62 : 0.75;
    const bk = S.bulk, pts = [T(J, -4.9, 4, bk), T(J, 4.7, 4, bk), add(mix(h, J.kF, len), fw, 4.6), add(mix(h, J.kF, len * 0.9), fw, 0), add(mix(h, J.kB, len), fw, -4.8)];
    const c1 = pc(sk.c), c2 = pc(sk.c2 || sk.c);
    poly(pts, sk.t === 'tassets' ? ((px, py) => { const v = (px - h[0]) * fw[0] + (py - h[1]) * fw[1]; const u = -((px - h[0]) * up[0] + (py - h[1]) * up[1]); return u > 3.2 ? c2 : (Math.floor(v + 7) % 3 === 0 ? c2 : c1); }) : c1);
  }
  function drawRobe(J, S, tid, P) {
    const r = S.robe; if (!r) return;
    part(NF, tid);
    const h = J.hip, fw = J.fw, up = J.up;
    const gy = J.ground != null ? J.ground : Math.max(J.fF[1], J.fB[1]);
    const hem = r.short ? Math.max(J.kF[1], J.kB[1]) + 2 : gy - 3.4;
    const fx = Math.max(J.fF[0], J.kF[0]) + 4, bx = Math.min(J.fB[0], J.kB[0]) - 4.4;
    const sway = Math.sin(NOW * 0.004) * 0.8 - (P.ra || 0) * 2;
    const wF = T(J, 4.6, 4), wB = T(J, -4.8, 4);
    const pts = [wB, wF, [Math.max(fx, wF[0] + 1.5) + sway, hem], [(fx + bx) / 2, hem + 0.6], [Math.min(bx, wB[0] - 2) + sway * 1.5, hem]];
    const c1 = pc(r.c), c2 = pc(r.c2), tr = pc(r.trim), sa = r.sash ? pc(r.sash) : 0;
    poly(pts, (px, py) => {
      if (py > hem - 1.6) return tr;
      const t = clamp((py - wF[1]) / Math.max(1, hem - wF[1]), 0, 1), front = wF[0] + (pts[2][0] - wF[0]) * t;
      if (px > front - 1.6) return tr;
      if (sa && px > front - 4 && px < front - 1.6) return sa;
      if (r.stars && ((Math.floor(px) * 7 + Math.floor(py) * 13) % 29 === 0)) return pc('#ffffff');
      if (r.runes && t > 0.5 && t < 0.65 && Math.floor(px) % 3 === 0) return tr;
      return t > 0.55 ? c2 : c1;
    });
    // 上身袍子
    part(NF, tid);
    const TP = (v, u) => T(J, v, u, 1.1);
    poly([TP(-4.6, 0), TP(4.4, 0), TP(5, 5), TP(5.6, 10), TP(5, 14), TP(2.8, 16.3), TP(-1, 16.8), TP(-4.4, 15.5), TP(-5.2, 8)], (px, py) => {
      const [v, u] = TLoc(J, px, py, 1.1);
      if (u >= 1.4 && u < 3.8) return pc(S.belt);
      if (Math.abs(v - (u - 9) * 0.55 - 1.2) < 1 && u > 8) return tr;
      return c1;
    });
  }
  function drawMantle(J, S) {
    const m = S.mantle; if (!m) return;
    part(NF);
    const TP = (v, u) => T(J, v, u, 1.1);
    const c1 = pc(m.c), tr = pc(m.trim);
    const pts = m.collar ? [TP(-6, 19.5), TP(-2, 18.5), TP(5.8, 16), TP(6.4, 9.5), TP(2, 8), TP(-6.4, 9)] : [TP(-5.8, 16), TP(5.6, 15.2), TP(6.4, 9.6), TP(1, 8.6), TP(-6.4, 9.4)];
    poly(pts, (px, py) => { const u = TLoc(J, px, py, 1.1)[1]; if (m.fur) return u < 10.6 ? tr : ((Math.floor(px * 1.3) + Math.floor(py)) % 3 ? c1 : pc('#5a3a1a')); return u < 10.6 ? tr : c1; });
  }
  function drawHead(J, S, P) {
    const hc = J.hc, hd = S.head || {}, r = 6.3;
    const ca = Math.cos(J.ha * RAD), sa = Math.sin(J.ha * RAD);
    const L = (px, py) => { const x = (px - hc[0]) / HK, y = (py - hc[1]) / HK; return [x * ca + y * sa, -x * sa + y * ca]; };
    const W = (x, y) => [hc[0] + (x * ca - y * sa) * HK, hc[1] + (x * sa + y * ca) * HK];
    const hair = pc(S.hair), skin = pc(S.skin), eye = pc(C.eye);
    const hs = S.hs;
    // 后发（长发 / 马尾）
    if (!S.beast && (hs === 'long' || hs === 'pony') && hd.t !== 'cowl') {
      part(NF);
      if (hs === 'long') poly([W(-6.5, -3), W(-1, -5), W(-2.5, 8 + Math.sin(NOW * 0.004)), W(-6.8, 10)], hair);
      else { const sw = Math.sin(NOW * 0.006) * 1.5 - (P.ra || 0) * 3; chainK([W(-5.5, -3.5), W(-8.5, 0 + sw * 0.3), W(-9 + sw, 5.5)], 1.8, 1.1, hair); }
    }
    // 颈
    const nid = part(NF);
    capK(J.neck, add(hc, [0, 2]), 2.1, 2.1, pc(S.beast === 'hawk' ? S.hair : S.beast === 'wolf' ? S.fur : S.skin));
    if (S.beast === 'wolf') { drawWolfHead(J, S, P, W, L, nid); return; }
    if (S.beast === 'hawk') { drawHawkHead(J, S, P, W, L, nid); return; }
    // 头：Q 版大眼（近眼 + 远眼、高光、小嘴、腮红），蓬松头发
    const covered = ['helm', 'kettle', 'hood', 'cowl', 'mask', 'kabuto', 'bandana', 'cap', 'beakhelm'].includes(hd.t);
    if (!covered && hs !== 'bald') {
      part(NF, nid); ell(W(-1.7, -1.2), (r + 0.5) * HK * 1.08, (r + 0.6) * HK, J.ha, hair);
      for (const [x, y, rr] of [[-5.8, -3.8, 2.4], [-2.4, -6.4, 2.5], [1.4, -6.5, 2.1], [-7, 0.6, 2]]) discK(W(x, y), rr, hair);
    }
    part(NF, nid);
    const shadowFace = hd.t === 'cowl', eyesCol = hd.eyes ? pc(hd.eyes) : 0;
    const wh = pc('#ffffff'), iris = pc(S.eyeC || '#3a4a9a'), mouth = pc('#a8484a'), blush = pc('#f78c8c');
    const bangs = x => -1.1 - ((Math.floor((x + 8) * 1.25) % 3) === 0 ? 0.9 : 0);
    ell(hc, r * HK * 1.1, r * HK * 0.96, J.ha, (px, py) => {
      const [x, y] = L(px, py);
      if (shadowFace) return (x > 0.9 && x < 2.5 && y > -1.4 && y < 0.6) || (x > 3.7 && x < 4.7 && y > -1.4 && y < 0.6) ? eyesCol : pc('#120a18');
      if (S.skull) {
        if (((x >= 0.4 && x < 2.8) || (x >= 3.4 && x < 4.9)) && y >= -1.6 && y < 1.2) return pc('#2a1a24');
        if (x >= 4.6 && x < 5.4 && y >= 1.6 && y < 2.4) return pc('#2a1a24');
        if (y >= 3 && y < 3.9 && x > 1 && x < 5.6 && Math.floor(x * 2.4) % 2) return pc('#2a1a24');
        return skin;
      }
      if (S.clown) { if (x >= 5.4 && y >= 0.9 && y < 2.2) return pc(C.red); if (x >= 1 && x < 2.2 && y >= 1.6 && y < 2.8 && Math.abs(x - 1.6) + Math.abs(y - 2.2) < 0.7) return pc('#3a6ab8'); }
      if (hs === 'bald') { if (x < -2 && y > -3.2 && y < 3) return hair; }
      else if (y < -2.3 || (x < -2.4 && y < 3.6) || (y < bangs(x) && x > -2.4) || (x > 5.4 && y < -0.6)) return hair;
      if (y >= -1.3 && y < 1.3 && x >= 0.7 && x < 2.7) return (x < 1.45 && y < -0.3) || (x >= 2.0 && x < 2.45 && y >= 0.55 && y < 0.95) ? wh : y > 0.25 ? iris : eye;
      if (y >= -1.1 && y < 1.2 && x >= 3.7 && x < 4.7) return (x < 4.15 && y < -0.3) ? wh : y > 0.3 ? iris : eye;
      if (S.beard && y > 1.8 && x > -2.4) return hair;
      if (y >= 2.7 && y < 3.15 && x >= 3.1 && x < 3.8) return mouth;
      if (y >= 1.7 && y < 2.4 && x >= 0.3 && x < 2.4) return blush;
      return skin;
    });
    if (hs === 'spiky' && !['helm', 'kettle', 'hood', 'kabuto', 'mask', 'cowl', 'crown', 'mitre', 'wizhat', 'bandana', 'feather', 'cap', 'straw', 'headdress'].includes(hd.t)) {
      part(NF, nid); const sw = Math.sin(NOW * 0.005) * 0.5;
      capK(W(-2, -5), W(-7, -8.5 + sw), 1.6, 0.5, hair); capK(W(1, -6), W(-1.5, -10.5), 1.6, 0.5, hair); capK(W(-4.5, -2), W(-9.5, -3.5 + sw), 1.5, 0.5, hair); capK(W(3, -5), W(5.5, -8), 1.2, 0.4, hair);
    }
    if (hs === 'topknot' && !['kabuto', 'helm'].includes(hd.t)) { part(NF, nid); discK(W(-1.5, -7), 2.2, hair); }
    if (S.beard) { part(NF, nid); poly([W(1, 2), W(5.6, 2), W(4.5, 6.5), W(1.5, 8.5), W(-1.5, 4)], hair); }
    if (S.elf) { part(NF, nid); poly([W(-2.6, -0.6), W(-9.5, -5.5), W(-2.2, 2)], skin); }
    drawHeadgear(J, S, P, W, L, hc, r);
  }
  function drawHeadgear(J, S, P, W, L, hc, r) {
    const hd = S.head; if (!hd || !hd.t) return;
    const c1 = pc(hd.c), c2 = pc(hd.c2 || hd.c), eye = pc(C.eye);
    const t = hd.t;
    part(NF);
    const dome = (rr, lim, colf) => discK(hc, rr, (px, py) => { const [x, y] = L(px, py); return y < lim(x) ? (colf ? colf(x, y) : c1) : 0; });
    if (t === 'band') {
      discK(hc, r + 0.9, (px, py) => { const [, y] = L(px, py); return y > -4 && y < -1.8 ? c1 : 0; });
      if (hd.tail) { const s = Math.sin(NOW * 0.012) * 2; capK(W(-6, -2.5), W(-11, -1 + s), 1.1, 0.7, c1); capK(W(-6, -2.5), W(-10, 1.5 + s), 1, 0.6, c1); }
    } else if (t === 'bandana') {
      dome(r + 1, () => -1.6, null); const s = Math.sin(NOW * 0.012) * 1.5; capK(W(-6.5, -2), W(-10, 1 + s), 1.4, 0.8, c1); capK(W(-6.5, -2), W(-9, 3.5 + s), 1.2, 0.7, pc(C.dRed));
    } else if (t === 'cap') {
      dome(r + 1, x => -1.5 - (x > 2 ? 0.6 : 0)); capK(W(3, -2.2), W(8.5, -1.6), 1, 0.8, c1);
    } else if (t === 'straw') {
      dome(r + 0.8, () => -1.6); ellK(W(0, -2.5), 11, 1.8, J.ha, c1);
    } else if (t === 'hood' || t === 'cowl') {
      discK(hc, r + 1.6, (px, py) => { const [x, y] = L(px, py); return (t === 'hood' && x > 0.6 && y > -3.6 && y < 5.5) || (t === 'cowl' && x > 2.5 && y > -2.8 && y < 4) ? 0 : c1; });
      poly([W(-7.5, -1), W(-2, 6), W(-3.5, 10), W(-8.5, 9)], c1);
      if (t === 'cowl') poly([W(1, -8.5), W(5.5, -6), W(4.6, -4), W(0, -6)], c1);
      if (hd.horns) { part(NF); const hc2 = pc(hd.horns); chainK([W(-1, -7), W(-4, -11), W(-8.5, -12.5)], 1.8, 0.6, hc2); chainK([W(2.5, -7), W(4, -11), W(2, -14)], 1.6, 0.5, hc2); }
    } else if (t === 'helm' || t === 'kettle' || t === 'mask' || t === 'beakhelm') {
      const lim = t === 'mask' ? (x => (x > 0.4 ? -1.6 : 5)) : t === 'kettle' ? (() => -0.6) : hd.visor ? (() => 5) : (x => (x < -1.6 ? 4 : -0.4));
      discK(hc, r + 1.3, (px, py) => {
        const [x, y] = L(px, py);
        if (y >= lim(x)) return 0;
        if (hd.visor && x > 1.8 && y > -1.6 && y < 0.4) return hd.eyes ? (x < 4 ? pc(hd.eyes) : eye) : eye;
        if (hd.visor && x > 2.5 && y > 1.5 && y < 4 && (Math.floor(y) % 2 === 0)) return eye;
        return (y < -5.4 || (x < -6)) ? c2 : c1;
      });
      if (hd.nasal && !hd.visor) capK(W(4.6, -1.5), W(5.3, 2), 0.9, 0.9, c1);
      if (t === 'mask') { poly([W(-0.5, 2), W(6.6, 1.6), W(6, 5.5), W(0, 6.5)], c2); if (hd.eyes) poly([W(0.6, -2.4), W(5.5, -2.4), W(5.5, -1.6), W(0.6, -1.6)], pc(hd.eyes)); }
      if (t === 'kettle') ellK(W(0, -1.4), 9.5, 1.5, J.ha, c1);
      if (t === 'beakhelm') { poly([W(3, -4.5), W(10, -1.5), W(4.5, -0.6)], c1); }
      if (hd.crest) { part(NF); const cc = pc(hd.crest); poly([W(-5, -6), W(-1, -9.8), W(3.5, -8), W(-2, -6.8)], cc); }
      if (hd.horns) { part(NF); const hc2 = pc(hd.horns); chainK([W(-1.5, -6), W(-4.5, -8.5), W(-4, -11)], 1.8, 0.6, hc2); chainK([W(2, -6), W(4.8, -8), W(4.6, -10.5)], 1.6, 0.5, hc2); }
      if (hd.crownTop) { part(NF); const cc = pc(hd.crownTop); for (const x of [-4.5, -1.8, 0.9, 3.6]) poly([W(x - 1.2, -6.2), W(x + 1.2, -6.2), W(x, -9.8)], cc); poly([W(-5.5, -6.4), W(4.8, -6.4), W(4.6, -5.4), W(-5.4, -5.4)], cc); dotK(W(-0.4, -5.9), pc(C.red)); }
      if (hd.plume) { part(NF); const pl = pc(hd.plume), s = Math.sin(NOW * 0.008) * 1.5 - (P.ra || 0) * 2; chainK([W(0, -8), W(-4, -11), W(-9, -10 + s), W(-13, -6 + s * 1.4)], 2.6, 1.2, pl); }
    } else if (t === 'tricorne') {
      // 海贼三角帽（可带羽毛）
      const b = hd.big ? 1.2 : 1;
      discK(hc, r + 1, (px, py) => { const [, y] = L(px, py); return y < -2.6 ? c1 : 0; });
      poly([W(-9.5 * b, -2.4), W(9 * b, -2.4), W(7 * b, -5.5), W(0, -4.6), W(-7 * b, -6)], c1);
      part(NF); poly([W(-9.5 * b, -2.4), W(9 * b, -2.4), W(8.6 * b, -3.4), W(-9 * b, -3.4)], c2);
      dotK(W(0.5, -6.2), pc('#ffffff'));
      if (hd.plume) { part(NF); const s2 = Math.sin(NOW * 0.008) * 1.2; chainK([W(-2, -6.5), W(-7, -9.5 + s2), W(-12, -8 + s2)], 1.8, 0.7, pc(hd.plume)); }
    } else if (t === 'veil') {
      // 沙漠公主：金额饰 + 垂到肩后的薄纱
      poly([W(-2, -5.8), W(-9, -2), W(-8.5, 9), W(-3, 7), W(-1, -2)], c1);
      part(NF); discK(hc, r + 0.9, (px, py) => { const [, y] = L(px, py); return y > -4.4 && y < -2.8 ? c2 : 0; });
      for (const x of [-1, 1.5, 4]) dotK(W(x, -2.4), c2);
      if (hd.gem) { part(FLAT); dotK(W(4.6, -3.6), pc(hd.gem)); }
    } else if (t === 'jester') {
      // 小丑帽：两只垂下的尖角 + 铃铛
      discK(hc, r + 1.2, (px, py) => { const [, y] = L(px, py); return y < -2.2 ? c1 : 0; });
      const sw = Math.sin(NOW * 0.008) * 1.2;
      poly([W(-5, -4), W(-1, -6.5), W(-11, -10 + sw), W(-12.5, -3 + sw)], c1);
      poly([W(0, -6.5), W(4.5, -4.5), W(6, -13 - sw), W(1.5, -11)], c2);
      part(NF); const bl = pc(C.gold); discK(W(-12.5, -3 + sw), 1.3, bl); discK(W(6, -13 - sw), 1.3, bl);
      discK(hc, r + 1.3, (px, py) => { const [, y] = L(px, py); return y > -2.8 && y < -1.8 ? pc('#ffffff') : 0; });
    } else if (t === 'fin') {
      // 鱼人：头顶鱼鳍 + 鳃
      poly([W(-6, -3), W(-3, -9), W(0, -8), W(2.5, -11), W(4, -5.5)], (px, py) => { const [x] = L(px, py); return Math.floor(x * 1.6) % 2 ? c1 : pc('#7ad8e8'); });
      for (const yy of [1, 2.6]) capK(W(-2.5, yy), W(-0.8, yy + 0.4), 0.4, 0.4, c1);
    } else if (t === 'batears') {
      poly([W(-5.5, -3), W(-8, -12), W(-1.5, -5.5)], c1); poly([W(0.5, -5.8), W(3, -13), W(4.5, -4.5)], c1);
      part(FLAT); poly([W(-5, -4), W(-7, -10), W(-2.6, -5.6)], pc('#c87a9a'));
    } else if (t === 'horns') {
      // 魔角（可带额饰宝石 / 王冠）
      const b = hd.big ? 1.3 : 1;
      chainK([W(-1, -5.5), W(-4.5, -8.5 * b), W(-8.5, -9 * b), W(-10.5, -6.5 * b)], 2, 0.6, c1);
      chainK([W(2.5, -6), W(4.5, -10 * b), W(2.5, -13 * b)], 1.9, 0.5, c1);
      if (hd.crown) { part(NF); const cc = pc(C.gold); for (const x of [-3.5, -1, 1.5]) poly([W(x - 1.1, -5.6), W(x + 1.1, -5.6), W(x, -8.6)], cc); }
      if (hd.gem) { part(FLAT); dotK(W(4.4, -3.3), pc(hd.gem)); }
    } else if (t === 'ninja') {
      // 忍者头巾：只露出眼睛一条缝，脑后打结
      discK(hc, r + 1.4, (px, py) => { const [x, y] = L(px, py); if (x > -0.4 && y > -1.9 && y < 1.6) return 0; return c1; });
      const sw = Math.sin(NOW * 0.012) * 1.5; capK(W(-6.5, -1.5), W(-10.5, 0.5 + sw), 1.2, 0.7, c1); capK(W(-6.5, -1.5), W(-10, 3 + sw), 1.1, 0.6, c1);
      if (hd.band) { part(NF); discK(hc, r + 1.6, (px, py) => { const [, y] = L(px, py); return y > -4.4 && y < -3 ? pc(hd.band) : 0; }); poly([W(3, -4.6), W(5.4, -4.6), W(5.4, -2.8), W(3, -2.8)], pc(C.silver)); }
      if (hd.eyes) { part(NF); poly([W(-0.4, -1.9), W(6.6, -1.9), W(6.6, 1.6), W(-0.4, 1.6)], pc('#120a18')); part(FLAT); poly([W(0.8, -0.9), W(2.8, -0.6), W(2.8, 0.3), W(0.8, 0.1)], pc(hd.eyes)); poly([W(3.9, -0.7), W(5, -0.5), W(5, 0.3), W(3.9, 0.2)], pc(hd.eyes)); }
    } else if (t === 'circlet' || t === 'crown') {
      discK(hc, r + 0.8, (px, py) => { const [, y] = L(px, py); return y > -4.2 && y < -2.4 ? c1 : 0; });
      if (t === 'crown') { const b = hd.big ? 1.3 : 1; for (const x of [-4, -1, 2, 4.5]) poly([W(x - 1.3, -3.5), W(x + 1.3, -3.5), W(x, -3.5 - 4 * b)], c1); if (hd.big) poly([W(-5, -3.5), W(5, -3.5), W(4, -6), W(-4, -6)], pc(C.dRed)); }
      if (hd.gem) dotK(W(4.5, -3.4), pc(hd.gem));
      if (hd.wings) { part(NF); const wc = pc(hd.wings); poly([W(-3.5, -3.4), W(-9, -9), W(-8, -6), W(-10.5, -6), W(-8.5, -4), W(-10, -2.5), W(-6, -2.6)], wc); }
    } else if (t === 'mitre') {
      const h = hd.tall ? 17 : 14;
      poly([W(-5.5, -2.5), W(5.2, -2.5), W(4, -h * 0.7), W(0.5, -h), W(-4.5, -h * 0.72)], (px, py) => { const [x, y] = L(px, py); return Math.abs(x) < 0.9 || y > -4 ? c2 : c1; });
      if (hd.gem) dotK(W(0.3, -h * 0.55), pc(hd.gem)); else { const g = c2; dotK(W(0.3, -h * 0.5), g); }
      if (hd.tall) { const g = pc(C.gold); capK(W(-4, -3), W(-8, 4 + Math.sin(NOW * 0.005)), 0.9, 0.9, g); }
    } else if (t === 'wizhat' || t === 'feather') {
      const big = hd.big ? 1.25 : 1, s = Math.sin(NOW * 0.005) * 1.2 - (P.ra || 0) * 2;
      if (t === 'wizhat') {
        const tip = W(-9 * big + s, -18 * big);
        poly([W(-6, -3.5), W(6, -3.5), W(2.5, -9 * big), tip, W(-5, -10 * big)], c1);
        if (hd.band) { part(NF); poly([W(-6, -3.5), W(6, -3.5), W(5, -5.6), W(-5.5, -5.6)], pc(hd.band)); }
        if (hd.star) dotK(W(-0.5, -10 * big), pc(hd.star)), dotK(W(-1.5, -12 * big), pc(hd.star));
        if (hd.gem) dotK(W(3, -4.6), pc(hd.gem));
        part(NF); ellK(W(0, -3.3), 10.5 * big, 1.6, J.ha, c1);
      } else {
        poly([W(-6.5, -2.5), W(6, -2.5), W(4, -7), W(-4, -8)], c1); ellK(W(-0.5, -2.6), 9, 1.4, J.ha, c1);
        part(NF); poly([W(-5.8, -2.6), W(5.5, -2.6), W(5, -4), W(-5.5, -4)], pc(hd.band));
        part(NF); chainK([W(-3, -5), W(-8, -9 + s), W(-13, -9 + s * 1.5)], 1.6, 0.6, pc(hd.plume));
      }
    } else if (t === 'kabuto') {
      discK(hc, r + 1.4, (px, py) => { const [x, y] = L(px, py); return y < -0.6 || (x < -2 && y < 3) ? (y < -5 ? c2 : c1) : 0; });
      poly([W(-3, 0), W(-11, 5), W(-9, 7), W(-2, 3.5)], (px, py) => { const [, y] = L(px, py); return Math.floor(y) % 2 ? c1 : pc(S.p); });
      poly([W(3.8, -1), W(7.5, -2.5), W(6.8, 0.5)], c1);
      const cc = pc(hd.cc || C.gold);
      part(NF);
      if (hd.crest === 'bar') poly([W(1, -6), W(5.5, -9), W(6.3, -8), W(2, -5)], cc);
      if (hd.crest === 'horns') { chainK([W(2, -5.5), W(4.5, -11), W(2, -16)], 1.4, 0.6, cc); chainK([W(0.5, -6), W(0, -12), W(-3.5, -15.5)], 1.3, 0.5, cc); }
      if (hd.crest === 'moon') { const m = W(1.5, -11); discK(m, 6, (px, py) => { const [x, y] = L(px, py); const d2 = Math.hypot(x - 1.5, y + 13.5); return d2 > 4.6 && y < -6 ? cc : 0; }); }
    } else if (t === 'headdress') {
      dome(r + 1, () => -2);
      part(NF); const w = pc(hd.c2); for (let i = 0; i < 5; i++) { const a = -150 + i * 22, s = Math.sin(NOW * 0.006 + i) * 3; capK(W(-1, -5), add(W(-1, -5), dv(a + s - J.ha, 8 * HK)), 1.4, 0.6, i % 2 ? w : c1); }
    }
  }
  function drawWolfHead(J, S, P, W, L, nid) {
    part(NF, nid);
    const fur = pc(S.fur), lt = pc('#e0d8d0'), eye = pc('#ffd040'), dk = pc(C.eye);
    const hc = J.hc;
    // 远耳
    poly([W(-6, -2), W(-5.5, -10.5), W(-2.2, -4)], pc(C.dIron));
    discK(hc, 5.8, (px, py) => { const [x, y] = L(px, py); if (x > 0.6 && x < 2.8 && y > -2.8 && y < 0.2) return x < 1.3 && y < -2 ? pc('#ffffff') : y > -0.8 ? dk : eye; if (y > 2 && x > -1) return lt; return fur; });
    const mo = P.mo || 0;
    capK(W(2.5, 1.2), W(8, 2.2), 2.6, 2.2, (px, py) => { const [, y] = L(px, py); return y > 2.2 ? lt : fur; });
    if (mo > 0.2) capK(W(2, 3), W(8.5, 5 + mo * 3), 1.6, 1.2, fur);
    discK(W(9, 1.4), 0.9, dk);
    poly([W(-3.5, -3.5), W(-1.8, -11.5), W(0.8, -4)], fur);
    if (S.mark) { part(FLAT); const mk = pc(S.mark), mc = W(0.4, -3.6); disc(mc, 1.6 * HK, (px, py) => { const [x, y] = L(px, py); return Math.hypot(x - 1.1, y + 4.1) > 1.3 ? mk : 0; }); }
    part(NF); capK(W(-4, 2), W(-8, 8), 3, 2.2, fur);
    drawHeadgear(J, Object.assign({}, S, { head: S.head && S.head.t !== 'beakhelm' ? S.head : null }), P, W, L, hc, 5.8);
  }
  function drawHawkHead(J, S, P, W, L, nid) {
    part(NF, nid);
    const fe = pc(S.hair), wh = pc('#f4ecd8'), bk = pc('#e8b030'), dk = pc(C.eye), ey = pc('#ffe060');
    const hc = J.hc;
    const s = Math.sin(NOW * 0.008) * 1.2;
    chainK([W(-4, -3), W(-9, -4.5 + s), W(-13, -3 + s)], 2, 0.7, fe);
    chainK([W(-4, 0), W(-9, 1 + s), W(-12, 3 + s)], 1.6, 0.6, wh);
    discK(hc, 6, (px, py) => { const [x, y] = L(px, py); if (x > 1.2 && x < 3.4 && y > -2.6 && y < -0.4) return (x > 2.3 ? dk : ey); if (y > 1.5 && x > -1) return wh; return fe; });
    poly([W(-1, -4.5), W(4.5, -3.2), W(3.5, -2.2), W(-1, -3.2)], dk);
    part(NF);
    const mo = P.mo || 0;
    poly([W(4.5, -2.6), W(9, -1.2), W(11, 1.6), W(9.6, 2.6), W(9, 1), W(4.6, 2 - mo)], bk);
    if (mo > 0.2) poly([W(4.6, 2.4), W(9, 2.5 + mo * 2), W(5, 4 + mo)], bk);
    if (S.head && S.head.t === 'beakhelm') {
      part(NF); const hcol = pc(S.head.c);
      discK(hc, 6.9, (px, py) => { const [x, y] = L(px, py); return y < -2.4 && x < 4.5 ? hcol : 0; });
      if (S.head.crest) { part(NF); chainK([W(-1, -7), W(-6, -10), W(-11, -9)], 2, 0.8, pc(S.head.crest)); }
    }
  }
  function drawShield(J, S) {
    if (S.book) {
      part(NF);
      const h = add(J.hB, J.fw, 2), bc = pc(S.book), pg = pc('#f4ecd8'), gd = pc(C.gold);
      poly([add(h, [-4.5, -5]), add(h, [4.5, -5]), add(h, [4.5, 4]), add(h, [-4.5, 4])], (px, py) => { const x = px - h[0], y = py - h[1]; return Math.abs(x) > 3.4 || Math.abs(y + 0.5) > 3.6 ? gd : Math.abs(x) < 0.6 ? gd : bc; });
      dot(h, pc('#8af0ff')); void pg;
    }
    const sd = S.shield; if (!sd) return;
    part(NF);
    const c1 = pc(sd.c), c2 = pc(sd.c2), e = sd.e ? pc(sd.e) : 0, h = add(add(J.hB, J.fw, sd.s === 'tower' ? 1.5 : 4), J.up, sd.s === 'tower' ? 0 : 1);
    if (sd.s === 'tower') {
      const w2 = 7, ht = 12, hh = add(add(h, J.fw, 3), [0, 3]);
      poly([add(hh, [-w2, -ht]), add(hh, [w2, -ht]), add(hh, [w2, ht - 3]), add(hh, [0, ht]), add(hh, [-w2, ht - 3])], (px, py) => {
        const x = px - hh[0], y = py - hh[1];
        if (Math.abs(x) > w2 - 1.6 || y < -ht + 1.6 || y > ht - 2.6 - Math.abs(x) * 0.5) return c2;
        if (sd.cross ? (Math.abs(x) < 1.3 && y < ht - 4) || (Math.abs(y + 3) < 1.3) : (e && Math.abs(x) < 1.2)) return e || c2;
        return Math.floor(y + 20) % 6 === 0 ? c2 : c1;
      });
    } else if (sd.s === 'round') {
      ell(h, 6.2, 8, 0, (px, py) => { const d = Math.hypot((px - h[0]) / 6.2, (py - h[1]) / 8); return d > 0.78 ? c2 : e && d < 0.38 ? e : c1; });
    } else {
      const K = 1.3, pts = [add(h, [-3.6 * K, -6.5 * K]), add(h, [3.6 * K, -6.5 * K]), add(h, [3.8 * K, 1 * K]), add(h, [0, 8 * K]), add(h, [-3.8 * K, 1 * K])];
      poly(pts, (px, py) => { const x = (px - h[0]) / K, y = (py - h[1]) / K; const edge = Math.abs(x) > 2.8 || y < -5.6 || y > 6.2 - Math.abs(x) * 1.2; if (edge) return c2; if (e && (Math.abs(x) < 1 || (y > -3.2 && y < -1.4))) return e; return c1; });
    }
  }
  function drawWeapon(J, S, P) {
    const w = S.wpn, k = w.k, h = J.hF, d = J.wd, a = P.w;
    if (k === 'none' || k === 'bow') return;
    if (k === 'cannon') {
      // 机甲臂炮：粗炮管 + 能量口
      part(NF); const c = pc(w.c), dk = pc('#2a3440');
      cap(add(h, d, -5), add(h, d, 13), 4, 3.4, (px, py, t) => (Math.floor(t * 9) % 3 === 0 ? dk : c));
      cap(add(h, d, 12), add(h, d, 15), 2.4, 2.4, dk);
      part(FLAT); disc(add(h, d, 15.5), 1.8 + Math.sin(NOW * 0.02) * 0.4, pc('#ff6060'));
      return;
    }
    if (k === 'fist') {
      if (w.glow) { part(FLAT); const r = (w.big ? 4.4 : 3.6) + Math.sin(NOW * 0.015) * 0.6; disc(h, r, pc(w.glow)); disc(J.hB, r * 0.85, pc(w.glow)); }
      return;
    }
    const c = pc(w.c || C.steel), g = pc(w.g || C.dSteel);
    if (w.glow) { part(FLAT); const gl = pc(w.glow), pulse = 0.4 + 0.4 * Math.sin(NOW * 0.012); if (k === 'sword' || k === 'katana') cap(add(h, d, 3), add(h, d, w.len + 0.5), 2.4 + pulse, 1.4 + pulse, gl); else if (k === 'lance') cap(add(h, d, w.len - 7), add(h, d, w.len + 1), 2.8 + pulse, 1.4, gl); }
    part(NF);
    if (k === 'sword') {
      const big = w.big ? 1 : 0;
      cap(add(h, d, -3.6), add(h, d, 1.4), 1.3, 1.3, pc(w.grip || C.dLeather));
      if (!w.wood) { cap(add(add(h, d, 2), dv(a + 90), 3.4 + big), add(add(h, d, 2), dv(a - 90), 3.4 + big), 1.2 + big * 0.2, 1.2 + big * 0.2, g); disc(add(h, d, -4.2), 1.3, g); }
      const bl = pc(w.c), rn = w.runes ? pc(w.twin || C.cyan) : 0;
      cap(add(h, d, 2.6), add(h, d, w.len), 1.9 + big * 0.4, 0.8, (px, py, t) => (rn && t > 0.2 && t < 0.8 && (Math.floor(t * 12) % 2) ? rn : bl));
    } else if (k === 'katana') {
      const pp = dv(a - 90);
      cap(add(h, d, -5.5), add(h, d, 1), 1, 1, (px, py, t) => ((Math.floor(t * 6) % 2) ? pc(C.red) : pc(C.dRed)));
      disc(add(h, d, 1.6), 1.7, g);
      const m = add(add(h, d, w.len * 0.55), pp, w.straight ? 0 : -0.8), tip = add(add(h, d, w.len), pp, w.straight ? 0 : -2.4);
      cap(add(h, d, 2.4), m, 1.5, 1.4, c); cap(m, tip, 1.4, 0.6, c);
    } else if (k === 'axe') {
      cap(add(h, d, -4), add(h, d, w.len), 1.6, 1.5, pc(C.wood));
      const top = add(h, d, w.len - 1), side = dv(a - 90), H = [[4.5, 4], [6, 6.5], [7, 8], [8.5, 10]][w.h || 0];
      if (w.anchor) {
        // 铁锚：顶端圆环 + 横杆 + 两侧弯钩
        const sd = dv(a - 90), bot = add(h, d, w.len - 1), big = (w.h || 1) >= 2 ? 1.25 : 1;
        if (w.glow) { part(FLAT); disc(bot, 7 * big, pc(w.glow)); part(NF); }
        ring(add(h, d, -5.5), 1.2, 2.6, c);
        cap(add(add(h, d, -2), sd, -4 * big), add(add(h, d, -2), sd, 4 * big), 1.1, 1.1, c);
        const tp = add(h, d, w.len);
        chain([tp, add(add(tp, d, 3), sd, 4.5 * big), add(add(tp, d, -2), sd, 7.5 * big)], 1.8 * big, 0.9, c);
        chain([tp, add(add(tp, d, 3), sd, -4.5 * big), add(add(tp, d, -2), sd, -7.5 * big)], 1.8 * big, 0.9, c);
        poly([add(add(tp, d, -2), sd, 7.5 * big), add(add(tp, d, -5.5), sd, 6.5 * big), add(add(tp, d, -3), sd, 9.5 * big)], c);
        poly([add(add(tp, d, -2), sd, -7.5 * big), add(add(tp, d, -5.5), sd, -6.5 * big), add(add(tp, d, -3), sd, -9.5 * big)], c);
        void bot;
      } else if (w.cleaver) {
        const bw = (w.h >= 3 ? 10 : 8), bl = (w.h >= 3 ? 14 : 11), hot = w.fire && Math.sin(NOW * 0.02) > 0;
        poly([add(top, d, 1.5), add(add(top, d, 2.5), side, bw), add(add(top, d, -bl), side, bw + 1.5), add(top, d, -bl)], (px, py) => { const off = (px - top[0]) * side[0] + (py - top[1]) * side[1]; return off > bw - 2 ? pc(hot ? '#ffd040' : C.blade) : c; });
        disc(add(add(top, d, -2), side, 3), 1.1, pc(C.dIron));
        if (w.fire) { part(FLAT); for (let i = 0; i < 4; i++) { const ph = (NOW * 0.004 + i * 0.25) % 1; disc(add(add(top, d, -bl * (0.2 + i * 0.25)), side, bw + 2 + ph * 5), 2.2 * (1 - ph) + 0.5, pc(ph < 0.4 ? '#ffd040' : '#ff5020')); } part(NF); }
      } else {
      const blade = sgn => poly([add(top, d, -1), add(add(top, d, 1.5), side, H[0] * sgn), add(add(top, d, -H[1] - 0.5), side, (H[0] + 0.8) * sgn), add(top, d, -H[1] + 1)], (px, py) => { const off = ((px - top[0]) * side[0] + (py - top[1]) * side[1]) * sgn; return off > H[0] - 1.6 ? pc(w.glow && Math.sin(NOW * 0.012) > 0 ? w.glow : C.blade) : c; });
      blade(1); if ((w.h || 0) >= 2) blade(-0.75);
      if (w.glow) { part(FLAT); const gl = pc(w.glow); for (let i = 0; i < 3; i++) dot(add(add(top, d, -1 - i * 3), side, H[0] + 0.6), gl); part(NF); }
      if ((w.h || 0) >= 3) { poly([add(top, d, 0), add(add(top, d, 5), side, 0.8), add(add(top, d, 0), side, 1.4)], c); }
      }
      disc(add(top, d, -H[1] * 0.5), 1.5, pc(w.g || C.dIron));
    } else if (k === 'lance' || k === 'fork') {
      const base = add(h, d, -12), tip = add(h, d, w.len);
      cap(base, add(tip, d, -5), 1.6, 1.3, pc(w.gold ? C.gold : w.dark ? '#3a3646' : C.wood));
      if (k === 'fork') { const s2 = dv(a - 90); for (const o of [-2, 0, 2]) cap(add(add(tip, d, -5), s2, o), add(add(tip, d, 0), s2, o * 1.1), 0.7, 0.5, c); }
      else {
        if (w.halberd) { const sd = dv(a - 90), b0 = add(tip, d, -6); poly([add(b0, d, 1.5), add(add(b0, d, 2.5), sd, 6), add(add(b0, d, -5), sd, 6.5), add(b0, d, -5)], (px, py) => { const off = (px - b0[0]) * sd[0] + (py - b0[1]) * sd[1]; return off > 4.6 ? pc(C.blade) : c; }); cap(add(b0, d, -1), add(add(b0, d, -1), sd, -3.5), 0.8, 0.5, c); }
        poly([add(add(tip, d, -6), dv(a + 90), 2.2), add(tip, d, 1), add(add(tip, d, -6), dv(a - 90), 2.2), add(tip, d, -7.5)], c);
        poly([add(add(h, d, 2), dv(a + 90), 1.3), add(add(h, d, 2), dv(a - 90), 1.3), add(add(h, d, 6.5), dv(a - 90), 3.2), add(add(h, d, 6.5), dv(a + 90), 3.2)], pc(w.gold ? C.gold : C.steel));
      }
      if (w.flag && w.banner) {
        part(NF);
        const fl = pc(w.flag), s1 = Math.sin(NOW * 0.012) * 1.5, f0 = add(tip, d, -7), f1 = add(tip, d, -19), back = dv(-90 + s1 * 3);
        poly([f0, add(f0, back, 11), add(add(f1, back, 11), [0, s1]), add(add(f1, back, 6), d, 2), f1], (px, py) => { const cc = add(mix(f0, f1, 0.5), back, 5.5); return Math.hypot(px - cc[0], py - cc[1]) < 2.4 ? pc(C.gold) : fl; });
      } else if (w.flag) {
        part(NF);
        const fl = pc(w.flag), s1 = Math.sin(NOW * 0.014) * 1.5, sp = Math.max(P.ga || 0, P.ra || 0);
        const f0 = add(tip, d, -7), f1 = add(tip, d, -13), back = dv(-62 - sp * 22 - (a < 120 ? 20 : 0));
        poly([f0, add(add(f0, back, 7), [0, s1 * 0.6]), add(add(mix(f0, f1, 0.5), back, 11), [0, s1 * 1.6]), add(add(f1, back, 6), [0, s1]), f1], fl);
      }
    } else if (k === 'staff') {
      const wd = pc(w.wood || C.wood), base = add(h, d, -12), top = add(h, d, w.len - 12);
      cap(base, top, 1.5, 1.6, wd);
      const tc = pc(w.tc || C.gold), gem = w.gem ? pc(w.gem) : pc(C.cyan);
      const pp = dv(a - 90);
      part(NF);
      switch (w.top) {
        case 'knob': disc(top, 2.2, wd); break;
        case 'cross': cap(add(top, d, -2), add(top, d, 4), 1, 1, tc); cap(add(add(top, d, 1.5), pp, -3), add(add(top, d, 1.5), pp, 3), 1, 1, tc); break;
        case 'ring': ring(add(top, d, 3.2), 2.2, 3.8, tc); disc(add(top, d, 3.2), 1.2, gem); break;
        case 'crozier': chain([top, add(top, d, 5), add(add(top, d, 8), pp, 2.5), add(add(top, d, 6.5), pp, 5.5), add(add(top, d, 3.5), pp, 5)], 1.3, 1, tc); break;
        case 'sun': { ring(add(top, d, 4), 2.6, 4.2, tc); for (let i = 0; i < 8; i++) { const rr = dv(i * 45 + NOW * 0.05); cap(add(add(top, d, 4), rr, 4.4), add(add(top, d, 4), rr, 6.4), 0.8, 0.4, tc); } part(FLAT); disc(add(top, d, 4), 2.4, pc(w.glow || '#fff6b0')); break; }
        case 'hourglass': { const c0 = add(top, d, 4); poly([add(add(c0, d, 3.5), pp, -2.6), add(add(c0, d, 3.5), pp, 2.6), c0], pc('#e8f6ff')); poly([add(add(c0, d, -3.5), pp, -2.6), add(add(c0, d, -3.5), pp, 2.6), c0], pc('#f4d070')); cap(add(add(c0, d, 4), pp, -3.2), add(add(c0, d, 4), pp, 3.2), 0.8, 0.8, tc); cap(add(add(c0, d, -4), pp, -3.2), add(add(c0, d, -4), pp, 3.2), 0.8, 0.8, tc); break; }
        case 'clock': { const c0 = add(top, d, 4.5); ring(c0, 3.4, 4.6, tc); disc(c0, 3.4, pc('#f4f8ff')); part(NF); cap(c0, add(c0, dv(180 - NOW * 0.36), 2.8), 0.5, 0.5, pc(C.eye)); cap(c0, add(c0, dv(180 - NOW * 0.03), 2), 0.6, 0.6, pc(C.eye)); if (w.glow) { part(FLAT); ring(c0, 4.8, 5.6, pc(w.glow)); } break; }
        case 'gem': disc(add(top, d, 1.6), 2, gem); cap(add(top, pp, -2), add(top, pp, 2), 0.8, 0.8, tc); break;
        case 'crystal': poly([add(top, pp, -2.2), add(add(top, d, 3), pp, -2), add(top, d, 7), add(add(top, d, 3), pp, 2), add(top, pp, 2.2)], gem); break;
        case 'orb': { const big = w.big ? 1.3 : 1; chain([add(top, pp, -3 * big), add(add(top, d, 3), pp, -3.4 * big), add(add(top, d, 7 * big), pp, -1.5)], 0.9, 0.6, tc); chain([add(top, pp, 3 * big), add(add(top, d, 3), pp, 3.4 * big), add(add(top, d, 7 * big), pp, 1.5)], 0.9, 0.6, tc); part(FLAT); disc(add(top, d, 3.6 * big), 3 * big, pc(w.glow || '#e8d0ff')); part(NF); disc(add(top, d, 3.6 * big), 2.1 * big, gem); break; }
        case 'skull': { disc(add(top, d, 2.6), 2.8, pc(C.bone)); dot(add(add(top, d, 2.8), pp, 1), pc(C.eye)); dot(add(add(top, d, 2.8), pp, -0.6), pc(w.gem || C.eye)); break; }
      }
    } else if (k === 'claw') {
      const fe = J.fe, cl = pc(w.c), big = w.big ? 1.4 : 1;
      if (w.glow) { part(FLAT); disc(add(h, dv(fe), 3), 4.5, pc(w.glow)); part(NF); }
      for (const o of [-22, 0, 22]) cap(h, add(h, dv(fe + o, 5.5 * big)), 0.9, 0.4, cl);
    } else if (k === 'xbow') {
      const big = w.big ? 1 : 0, stock = pc(w.c), m = pc(w.m || C.steel), pp = dv(a - 90);
      cap(add(h, d, -7), add(h, d, 10), 1.6, 1.3, stock);
      const front = add(h, d, 9);
      const t1 = add(add(front, pp, -7 - big * 2), d, -2.5), t2 = add(add(front, pp, 7 + big * 2), d, -2.5);
      chain([t1, front, t2], 1.2, 1.2, m);
      part(FLAT);
      const str = add(h, d, P.ld > 0.5 ? 1 : 6.5), sc = pc('#f0f0f0');
      cap(t1, str, 0.4, 0.4, sc); cap(t2, str, 0.4, 0.4, sc);
      if (P.ld > 0.5) { part(NF); cap(str, add(h, d, 12), 0.7, 0.7, pc(C.wood)); poly([add(add(h, d, 12), pp, 1.2), add(h, d, 14.5), add(add(h, d, 12), pp, -1.2)], pc(C.steel)); }
      if (big) { part(NF); const mg = add(add(h, d, 3), pp, -2.8); poly([add(mg, d, -3), add(mg, d, 3), add(add(mg, d, 3), pp, -3), add(add(mg, d, -3), pp, -3)], pc(C.gold)); }
    }
  }
  function drawBow(J, S, P) {
    const w = S.wpn; if (w.k !== 'bow') return;
    const h = J.hB, aim = J.aim, up = dv(aim + 90), dn = dv(aim - 90), back = dv(aim + 180), sz = w.size;
    const pull = 1.5 + 2.5 * P.dr;
    const tTop = add(add(h, up, sz), back, pull + 1.5), tBot = add(add(h, dn, sz), back, pull + 1.5);
    const mTop = add(add(h, up, sz * 0.55), dv(aim), 1.2), mBot = add(add(h, dn, sz * 0.55), dv(aim), 1.2);
    part(NF);
    const wc = pc(w.c), tc = pc(w.tip || w.c);
    chain([h, mTop, tTop], 1.4, 0.9, wc); chain([h, mBot, tBot], 1.4, 0.9, wc);
    dot(tTop, tc); dot(tBot, tc);
    part(FLAT);
    const sp = P.sik > 0.5 ? J.hF : add(h, back, 2 + pull);
    const sc = pc(w.str || '#f4f0e0'), sw = w.str ? 0.7 : 0.45;
    cap(tTop, sp, sw, sw, sc); cap(tBot, sp, sw, sw, sc);
    if (P.sik > 0.5) { part(NF); cap(sp, add(h, dv(aim), 4), 0.6, 0.6, pc(C.wood)); poly([add(add(h, dv(aim), 4), up, 1.2), add(h, dv(aim), 7), add(add(h, dv(aim), 4), dn, 1.2)], pc(C.steel)); }
  }
  function drawQuiver(J, S) {
    if (!S.quiver) return;
    part(NF);
    const TP = (v, u) => T(J, v, u);
    cap(TP(-4.5, 5), TP(-7, 19), 3, 3.2, pc(C.leather));
    const fl = pc(C.white); disc(TP(-7.8, 22), 1.2, fl); disc(TP(-6.4, 22.6), 1.1, pc(C.red)); disc(TP(-8.8, 21.4), 1.1, fl);
  }
  function drawBanner(J, S) {
    const b = S.banner; if (!b) return;
    part(NF);
    const h = J.hip, fw = J.fw, up = J.up, TP = (v, u) => add(add(h, fw, v), up, u);
    cap(TP(-6, 4), TP(-7.5, 50), 1.1, 1.1, pc(C.dLeather));
    const s = Math.sin(NOW * 0.01) * 1.2;
    part(NF);
    poly([TP(-7.2, 49), TP(-17, 49 + s), TP(-17.5, 37 + s), TP(-7, 37)], (px, py) => { const c = TP(-12.2, 43); return Math.hypot(px - c[0], py - c[1]) < 2.6 ? pc(C.white) : pc(b.c); });
  }
  function drawTail(J, S) {
    if (S.beast !== 'wolf') return;
    part(NF);
    const s = Math.sin(NOW * 0.006) * 8, h = add(add(J.hip, J.up, 2), J.fw, -5);
    chain([h, add(h, dv(-60 + s * 0.5, 6)), add(add(h, dv(-60 + s * 0.5, 6)), dv(-40 + s, 7))], 3.2, 3.8, pc(S.fur));
  }

  // ---------------- 坐骑绘制 ----------------
  function drawMountBack(R, M, P) {
    const c = pc(M.c), m = pc(M.m || M.c2 || M.c), wy = M.t === 'wyvern';
    if (M.t === 'pegasus') featherWing(R.wroot, 205 + Math.sin(NOW * (P.wf > 0.5 ? 0.03 : 0.006)) * (P.wf > 0.5 ? 45 : 14) + 8, 1.3, M.wing, M.wing2, BF);
    if (wy) batWing(R.wroot, 200 + Math.sin(NOW * 0.007) * 20 + 10, 1.05, M.c2, M.c, BF, R.L([-7, -4]));
    part(BF);
    for (const lg of R.legs) if (lg.far) {
      cap(lg.hip, lg.k, wy ? 4.4 : 3.4, wy ? 3.4 : 3, c); cap(lg.k, lg.f, wy ? 3 : 3, wy ? 2.4 : 2.6, c);
      if (!wy) cap(lg.f, add(lg.f, [0, 1.2]), 2.7, 2.7, pc('#2a2020')); else cap(lg.f, add(lg.f, [3.5, 0.5]), 1.8, 0.8, pc(C.bone));
    }
    part(NF);
    if (wy) { chain(R.tail, 4.4, 1.8, c); const tp = R.tail[R.tail.length - 1]; poly([add(tp, [-1, -3.5]), add(tp, [-7, 0]), add(tp, [-1, 3.5])], pc(M.c2)); }
    else chain(R.tail, 2.8, 3.6, m);
  }
  function drawMountBody(R, M, P) {
    const c = pc(M.c), L = R.L, wy = M.t === 'wyvern';
    part(NF);
    if (wy) {
      const bel = pc(M.belly || M.c);
      ell(R.B, 12, 8, -R.pitch, (px, py) => (py - R.B[1] > 3.4 ? bel : c));
      disc(L([8, -0.5]), 7, c);
      for (let i = 0; i < 4; i++) disc(L([-8 + i * 4.5, -8]), 1.1, pc(M.c2));
    } else {
      ell(R.B, 13, 9.8, -R.pitch, c); disc(L([7, 0]), 8.8, c); disc(L([-7, 0]), 8.8, c);
    }
    part(NF);
    for (const lg of R.legs) if (!lg.far) {
      if (wy) { cap(lg.hip, lg.k, 5.2, 3.8, c); cap(lg.k, lg.f, 3.4, 2.6, c); const tc = pc(C.bone); cap(lg.f, add(lg.f, [4.5, 0.8]), 1.8, 0.7, tc); cap(lg.f, add(lg.f, [3, 2]), 1.6, 0.7, tc); }
      else { cap(lg.hip, lg.k, 3.8, 3.3, c); cap(lg.k, lg.f, 3.3, 2.9, c); cap(lg.f, add(lg.f, [0, 1.2]), 3, 3, pc('#2a2020')); }
    }
    // 披挂 / 鞍毯
    if (M.bard) {
      part(NF);
      const bc = pc(M.bard), tr = pc(M.trim || M.bard);
      const pts = [L([-14, -3]), L([-12, -8.8]), L([12, -8.8]), L([14.8, -2]), L([14.2, 8]), L([-14.8, 8])];
      poly(pts, (px, py) => { const lb = L([0, 8]); const scal = Math.sin(px * 0.9) * 0.8; return py > lb[1] - 2.2 + scal ? tr : (Math.abs(px - L([1, 0])[0]) < 2.2 && M.trim ? tr : bc); });
    } else if (M.blanket && !wy) {
      part(NF);
      const bc = pc(M.blanket);
      poly([L([-9.5, -8.8]), L([2.5, -8.8]), L([3.5, 3.5]), L([-10.5, 3.5])], (px, py) => (py > L([0, 3.5])[1] - 1.6 ? pc(C.gold) : bc));
    }
    // 鞍
    part(NF);
    poly([L([-8, -8.5]), L([1, -8.5]), L([2.5, -11.3]), L([-0.5, -10.3]), L([-6, -10.3]), L([-9, -11.7])], pc(C.dLeather));
    if (wy && M.blanket) { part(NF); poly([L([-5, -8]), L([4, -8]), L([4.5, 1]), L([-5.5, 1])], (px, py) => (Math.abs(py - L([0, -0.5])[1]) < 1.2 ? pc(M.trim) : pc(M.blanket))); }
  }
  function drawMountHead(R, M, P) {
    const c = pc(M.c), m = pc(M.m || M.c), dk = pc(C.eye), wh = pc('#ffffff');
    const bigEye = (p, col) => { disc(p, 1.9, col || dk); dot(add(p, [-0.6, -0.7]), wh); };
    if (M.t === 'wyvern') {
      part(NF);
      chain(R.neck, 5, 4.2, c);
      const hd = R.head, mz = R.muzzle, a = angOf(hd, mz);
      const hcol = pc(C.bone);
      cap(add(hd, dv(a + 120, 3)), add(hd, dv(a + 160, 11)), 1.7, 0.6, hcol);
      cap(add(hd, dv(a + 95, 3.5)), add(hd, dv(a + 132, 10)), 1.5, 0.6, hcol);
      part(NF);
      disc(hd, 5.8, c);
      cap(hd, mz, 4.4, 3.3, c);
      const mo = P.mo || 0;
      if (mo > 0.1) { cap(add(hd, dv(a - 70, 2)), add(mz, dv(a - 60, 2 + mo * 4)), 2.6, 1.8, c); disc(add(mz, dv(a - 40, 1 + mo * 2)), 2 + mo, pc('#ff8040')); }
      disc(add(mz, dv(a + 40, 1.6)), 0.8, dk);
      bigEye(add(hd, dv(a + 62, 2.8)), pc('#ffd040')); dot(add(hd, dv(a + 62, 2.8)), dk);
      for (let i = 0; i < 3; i++) disc(add(R.neck[1], dv(-120 + i * 30, 4.6)), 1, pc(M.c2));
      return;
    }
    part(NF);
    const nb = R.neck[0], nt = R.neck[1], mz = R.muzzle, a = angOf(nt, mz);
    cap(nb, nt, 5.6, 4.8, c);
    poly([add(nt, dv(a + 150, 4)), add(nt, dv(a + 172, 10)), add(nt, dv(a + 122, 5.5))], c);
    disc(nt, 6.8, c);
    cap(add(nt, dv(a, 2)), mz, 4.8, 4, c);
    disc(add(mz, dv(a + 35, 2)), 0.8, pc('#2a1a20'));
    bigEye(add(nt, dv(a + 62, 2.6)), M.eyes ? pc(M.eyes) : null);
    if (M.beak) { part(NF); const bk = pc('#f0b030'); poly([add(nt, dv(a + 40, 3)), add(mz, dv(a, 4)), add(add(mz, dv(a, 2)), dv(a - 90, 3)), add(nt, dv(a - 50, 2.5))], bk); poly([add(nt, dv(a + 150, 4)), add(nt, dv(a + 175, 11)), add(nt, dv(a + 130, 7))], pc(M.wing)); }
    if (M.plate) { part(NF); const pl = pc(M.plate); cap(add(nt, dv(a, 1.5)), add(mz, dv(a, -1)), 3.2, 2.6, (px, py, t) => (t > 0.3 && t < 0.42 ? pc(M.trim || M.plate) : pl)); }
    part(NF);
    const back = dv(angOf(nb, nt) - 90);
    chain([add(add(nt, back, 5.5), dv(a + 180, 2)), add(mix(nb, nt, 0.5), back, 5.4), add(nb, back, 5.4)], 2.6, 2.8, (px, py) => ((Math.floor(px + py) % 3) ? m : pc(M.m2 || M.m || M.c)));
    cap(add(nt, dv(a + 150, 5.5)), add(nt, dv(a + 95, 5.5)), 2, 1.4, m);
    if (M.plate) { part(NF); const pl = pc(M.plate); for (let i = 0; i < 2; i++) disc(add(mix(nb, nt, 0.25 + i * 0.4), back, 3.4), 2.8, pl); }
  }
  function drawMountWingFront(R, M, P) {
    if (M.t === 'pegasus') featherWing(add(R.wroot, [1, 0]), 195 + Math.sin(NOW * (P.wf > 0.5 ? 0.03 : 0.006) + 0.3) * (P.wf > 0.5 ? 50 : 16), 1.4, M.wing, M.wing2, NF);
    if (M.t === 'wyvern') batWing(add(R.wroot, [2, 0]), 190 + Math.sin(NOW * 0.007 + 0.4) * 24, 1.2, M.c2, M.c, NF, R.L([-5, -5]));
  }

  // 环绕的精灵光球（front = 只画前半圈）
  function drawOrbs(J, S, front) {
    if (!S.orbs) return;
    const c0 = T(J, 0, 10), n = S.orbs.length;
    S.orbs.forEach((col, i) => {
      const a = NOW * 0.003 + i * Math.PI * 2 / n, z = Math.sin(a);
      if ((z > 0) !== front) return;
      const p = add(c0, [Math.cos(a) * 15, z * 4 - 8 + Math.sin(NOW * 0.005 + i) * 2]);
      part(FLAT); disc(p, 3.4, pc(col)); disc(add(p, [-0.6, -0.6]), 1.6, pc('#ffffff'));
    });
  }
  function drawHalo(J, S) {
    if (!S.halo) return;
    part(FLAT);
    const c0 = add(J.hc, [-3, -2]), R = HR + 4;
    if (S.halo === 'ring') { const rc = add(J.hc, [-1, -HR - 4 + Math.sin(NOW * 0.004)]); ell(rc, 8, 2.2, 0, (px, py) => { const dx = (px - rc[0]) / 8, dy = (py - rc[1]) / 2.2; return dx * dx + dy * dy > 0.42 ? pc('#ffe680') : 0; }); return; }
    if (S.halo === 'moon') { const mc = pc('#e8f0ff'); disc(c0, R, (px, py) => (Math.hypot(px - c0[0] - 4, py - c0[1] + 3) > R - 2.5 ? mc : 0)); return; }
    ring(c0, R - 1.4, R, pc(C.gold));
    for (let i = 0; i < 12; i++) dot(add(c0, dv(i * 30, R - 2.6)), pc('#fff6c0'));
    part(NF); cap(c0, add(c0, dv(180 - NOW * 0.12, R - 3)), 0.8, 0.5, pc(C.gold)); cap(c0, add(c0, dv(180 - NOW * 0.01, R - 6)), 1, 0.6, pc(C.gold));
  }
  function drawFloat(J, S) {
    if (S.float !== 'hourglass') return;
    part(NF);
    const c0 = add(T(J, -9, 30), [0, Math.sin(NOW * 0.004) * 2]), a = NOW * 0.06, d = dv(180 + Math.sin(NOW * 0.002) * 20), pp = dv(270 + Math.sin(NOW * 0.002) * 20);
    poly([add(add(c0, d, 4), pp, -3), add(add(c0, d, 4), pp, 3), c0], pc('#e8f6ff')); poly([add(add(c0, d, -4), pp, -3), add(add(c0, d, -4), pp, 3), c0], pc('#f4d070'));
    cap(add(add(c0, d, 4.5), pp, -3.6), add(add(c0, d, 4.5), pp, 3.6), 0.9, 0.9, pc(C.gold)); cap(add(add(c0, d, -4.5), pp, -3.6), add(add(c0, d, -4.5), pp, 3.6), 0.9, 0.9, pc(C.gold)); void a;
  }

  // ---------------- 整体绘制 ----------------
  function drawDoll(S, P, prevPoses, crit) {
    let R = null, J;
    if (S.mount) { R = rigMount(P, S.mount, NOW); J = rigHuman(P, S, add(R.seat, [0, -1.5])); }
    else J = rigHuman(P, S, null);
    const M = S.mount;
    if (M) { drawMountBack(R, M, P); drawMountBody(R, M, P); drawMountHead(R, M, P); drawMountWingFront(R, M, P); }
    drawBanner(J, S);
    if (S.bwings) { const bw = S.bwings, sc = bw.big ? 1.15 : 0.95, fl = Math.sin(NOW * 0.006) * 14; batWing(T(J, -3.5, 13), 205 + fl, sc, bw.c, bw.c2, BF, T(J, -7, 2)); batWing(T(J, -2.5, 14), 195 + fl * 1.2, sc * 1.1, bw.c, bw.c2, NF, T(J, -6, 3)); }
    if (S.wings) featherWing(T(J, -3.5, 13), 205 + Math.sin(NOW * (P.wf > 0.5 ? 0.03 : 0.006)) * (P.wf > 0.5 ? 50 : 12) + 6, S.wings.big ? 1.3 : 1.1, S.wings.c, S.wings.c2, BF);
    if (S.scarf) drawScarfTail(J, S, P);
    drawCape(J, S, P, !!M);
    drawQuiver(J, S);
    drawTail(J, S);
    drawOrbs(J, S, false);
    drawArm(J.sB, J.eB, J.hB, S, true, J.be);
    if (!M) drawLeg(J.hip, J.kB, J.fB, S, true);
    if (S.wings) featherWing(T(J, -2.5, 14), 195 + Math.sin(NOW * (P.wf > 0.5 ? 0.03 : 0.006) + 0.4) * (P.wf > 0.5 ? 55 : 14), S.wings.big ? 1.4 : 1.2, S.wings.c, S.wings.c2, NF);
    if (S.robe && !M) drawLeg(J.hip, J.kF, J.fF, S, false);
    let tid;
    if (S.robe) { tid = part(NF); drawRobe(J, S, tid, P); }
    else tid = drawTorso(J, S, P);
    if (!S.robe) {
      drawLeg(J.hip, J.kF, J.fF, S, false);
      drawSkirt(J, S, tid);
    }
    drawMantle(J, S);
    if (S.flasks) { part(NF); [['#9aff4a', -3.5], ['#ff7a9a', 0], ['#7ad8ff', 3.2]].forEach(([fc, v]) => { const b0 = T(J, v, 1.2); cap(b0, add(b0, J.up, -3), 1.4, 1.1, pc(fc)); dot(add(b0, J.up, 0.8), pc(C.wood)); }); }
    if (S.beads) { part(NF); const bd = pc('#8a4a2a'); for (let i = 0; i < 6; i++) disc(T(J, -3 + i * 1.6, 15.5 - Math.sin(i / 5 * Math.PI) * 4), 1.1, i === 3 ? pc(C.gold) : bd); }
    drawHalo(J, S);
    drawHead(J, S, P);
    drawFloat(J, S);
    if (S.scarf) { part(NF); const n = J.neck; ell(add(n, J.up, -0.8), 5.2, 3, -P.lean, pc(S.scarf)); }
    if (S.book) drawShield(J, Object.assign({}, S, { shield: null }));
    if (S.wpn2) { const w2a = P.w + 22; drawWeapon(Object.assign({}, J, { hF: J.hB, wd: dv(w2a), fe: J.be }), Object.assign({}, S, { wpn: S.wpn2 }), Object.assign({}, P, { w: w2a })); part(BF); disc(J.hB, 3, pc(S.glove || S.skin)); }
    drawBow(J, S, P);
    // 拖影：用前几帧的姿势算出武器尖端轨迹
    if (prevPoses && prevPoses.length && P.tr > 0.05) {
      part(FLAT);
      const cols = S.trail && !crit ? [pc('#ffffff'), pc(S.trail), pc(S.trail)] : [pc(crit ? '#fff4b0' : '#ffffff'), pc(crit ? '#ffd040' : '#bfe8ff'), pc(crit ? '#e8a020' : '#7ab0e8')];
      let last = weaponTip(J, S, P);
      prevPoses.forEach((pp, i) => {
        const J2 = S.mount ? rigHuman(pp, S, add(rigMount(pp, S.mount, NOW).seat, [0, -1.5])) : rigHuman(pp, S, null);
        const tt = weaponTip(J2, S, pp);
        poly([last[0], last[1], tt[1], tt[0]], cols[Math.min(2, i >> 1)]);
        last = tt;
      });
    }
    drawWeapon(J, S, P);
    drawArm(J.sF, J.eF, J.hF, S, false, J.fe);
    if (S.shield) drawShield(J, Object.assign({}, S, { book: null }));
    drawOrbs(J, S, true);
    if (S.storm && Math.sin(NOW * 0.023) > 0.55) { part(FLAT); const c0 = T(J, -6, 22), cc = pc('#c8f8ff'); let q0 = add(c0, [Math.sin(NOW) * 8, -6]); for (let i = 0; i < 4; i++) { const q1 = add(q0, [(i % 2 ? 3 : -3), 3.5]); cap(q0, q1, 0.6, 0.6, cc); q0 = q1; } }
    // 闪光点缀（顶阶）
    if (S.sparkle) {
      part(FLAT);
      const tip = weaponTip(J, S, P)[1], sc = pc('#ffffff');
      for (let i = 0; i < 3; i++) {
        const ph = (NOW * 0.002 + i * 0.37) % 1; if (ph > 0.5) continue;
        const p = add(tip, [Math.sin(i * 7.3 + Math.floor(NOW * 0.002 + i * 0.37) * 2.1) * 6, Math.cos(i * 3.1 + Math.floor(NOW * 0.002 + i * 0.37)) * 6]);
        dot(p, sc); if (ph > 0.15 && ph < 0.35) { dot(add(p, [1, 0]), sc); dot(add(p, [-1, 0]), sc); dot(add(p, [0, 1]), sc); dot(add(p, [0, -1]), sc); }
      }
    }
    return J;
  }

  // 锚点（屏幕坐标）：武器尖端、手、头、胸
  function anchors(J, S, P, sx, sy, s, f) {
    const T = q => [sx + q[0] * s * f, sy + q[1] * s];
    const wt = weaponTip(J, S, P);
    const bowP = S.wpn.k === 'bow' ? add(J.hB, dv(J.aim), 5) : S.wpn.k === 'xbow' ? add(J.hF, J.wd, 14) : S.wpn.k === 'staff' ? wt[1] : J.hF;
    return { tip: T(wt[1]), hand: T(J.hF), shot: T(bowP), head: T(J.hc), chest: T(add(J.hip, J.up, 5)), top: T(add(J.hc, [0, -HR - 4])) };
  }

  const WHITE_SPR = {}, ICE_SPR = new WeakMap();
  // 冰龙：B 路线精灵图未就绪时，把龙的精灵图换成冰蓝色（保留深色描边）
  function iceTint(spr, mode) {
    const cache = ICE_SPR.get(spr) || {}; ICE_SPR.set(spr, cache);
    if (cache[mode || 'ice']) return cache[mode || 'ice'];
    const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
    const x = c.getContext('2d'); x.drawImage(spr, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < d.data.length; i += 4) {
      if (!d.data[i + 3]) continue;
      const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11;
      if (l < 45) continue;
      if (mode === 'white') { d.data[i] = Math.min(255, 150 + l * 0.45); d.data[i + 1] = Math.min(255, 150 + l * 0.45); d.data[i + 2] = Math.min(255, 165 + l * 0.4); }
      else if (mode === 'black') { const red = d.data[i] > 180 && d.data[i + 1] < 90; d.data[i] = red ? 255 : 30 + l * 0.35; d.data[i + 1] = red ? 60 : 24 + l * 0.25; d.data[i + 2] = red ? 40 : 44 + l * 0.4; }
      else { d.data[i] = Math.min(255, 70 + l * 0.6); d.data[i + 1] = Math.min(255, 140 + l * 0.45); d.data[i + 2] = Math.min(255, 220 + l * 0.15); }
    }
    x.putImageData(d, 0, 0);
    cache[mode || 'ice'] = c;
    return c;
  }
  function whiteSprite(spr, col) {
    spr.__id = spr.__id || Math.random().toString(36).slice(2);
    const key = spr.__id + (col || '#fff');
    if (WHITE_SPR[key]) return WHITE_SPR[key];
    const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height;
    const x = c.getContext('2d'); x.drawImage(spr, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col || '#fff'; x.fillRect(0, 0, c.width, c.height);
    return (WHITE_SPR[key] = c);
  }

  // 主入口：在 g 上画角色。x/feet 为屏幕脚底点、s 为美术像素→屏幕像素倍率、f 为朝向（1 = 面向右）
  function draw(g, u, S, P, opt) {
    const { x, feet, s, f, now, flash, prev, crit, sil } = opt;
    NOW = now; F = f;
    if (S.kind === 'sprite') {
      let spr = typeof unitSprite === 'function' ? unitSprite(u) : null;
      if (S.tintM && spr) spr = iceTint(spr, S.tintM);
      else if (S.ice && spr) spr = (typeof SPRITE_DEFS !== 'undefined' && SPRITE_DEFS[S.skB] && typeof getSprite === 'function') ? getSprite(S.skB, u.tier, u.team, u.hair, u.color) : iceTint(spr);
      if (!spr) return null;
      const size = 16 * S.scale * s, hov = S.fly ? (-8 + Math.sin(now * 0.004) * 2.5) * s : 0;
      const sqx = 1 + P.sq, sqy = 1 - P.sq;
      g.save();
      g.globalAlpha *= P.al;
      g.translate(x, feet + P.Y * s + hov);
      g.rotate(P.rot * f * RAD);
      g.scale(f > 0 ? -sqx : sqx, sqy);
      g.drawImage(spr, -size / 2, -size * 15 / 16, size, size);
      if (flash || sil) g.drawImage(whiteSprite(spr, sil), -size / 2, -size * 15 / 16, size, size);
      g.restore();
      const top = feet + hov + P.Y * s - size * 0.8 * sqy;
      return { tip: [x + f * size * 0.42, feet + hov - size * 0.5], hand: [x + f * size * 0.35, feet + hov - size * 0.5], shot: [x + f * size * 0.42, feet + hov - size * 0.55], head: [x + f * size * 0.25, top + size * 0.15], chest: [x, feet + hov - size * 0.45], top: [x, top] };
    }
    clear();
    const J = drawDoll(S, P, prev, crit);
    finish(flash, sil);
    g.save();
    g.globalAlpha *= P.al;
    g.translate(x, feet);
    if (P.rot) g.rotate(P.rot * f * RAD);
    g.imageSmoothingEnabled = false;
    g.drawImage(cv, -OX * s, -OY * s, FW * s, FH * s);
    g.restore();
    return anchors(J, S, P, x, feet, s, f);
  }

  // ---------------- 动作编排 ----------------
  // 返回 { keys, dur, impact, release?, fly?, proj?, style }
  function gap(SA, SD) {
    const k = SA.kind === 'doll' ? SA.wpn.k : 'bite';
    let g = { sword: 28, katana: 28, axe: 30, staff: 30, lance: 46, fork: 36, claw: 22, none: 18, bite: 30 }[k] || 28;
    if (SA.mount) g += 14;
    if (SA.kind === 'sprite') g = 16 * SA.scale * 0.45 + 10;
    if (SD.mount) g += 12;
    if (SD.kind === 'sprite') g += 16 * SD.scale * 0.2;
    return g;
  }
  // 蓄力：在挥击前的预备姿势上多停一拍（并在武器上闪光），让命中有反差
  function plan(S, ranged, crit) {
    const pl = planRaw(S, ranged, crit), ks = pl.keys;
    if (S.fast) { ks.forEach(k => { k.t *= 0.8; }); for (const f of ['impact', 'release', 'dur']) if (pl[f] != null) pl[f] *= 0.8; }
    let wi = -1;
    if (pl.wi != null) wi = pl.wi;
    else if (pl.impact != null) { const sw = ks.findIndex(k => k.p.tr > 0 || k.p.P > 0.5); wi = sw > 0 ? sw - 1 : 1; }
    else wi = ks.reduce((b, k, i) => (k.t < pl.release - 30 ? i : b), 0);
    const ms = pl.impact != null ? (pl.style === 'iai' ? 60 : 100) : 60, tw = ks[wi].t;
    ks.splice(wi + 1, 0, { t: tw + ms, p: ks[wi].p, e: EASE.io });
    for (let i = wi + 2; i < ks.length; i++) ks[i].t += ms;
    for (const f of ['impact', 'release', 'puff']) if (pl[f] != null && pl[f] > tw) pl[f] += ms;
    for (const f of ['streak', 'smoke', 'jabs', 'chops']) if (pl[f]) pl[f] = pl[f].map(t => (t > tw ? t + ms : t));
    pl.dur += ms; pl.glint = [Math.max(0, tw - 40), ms + 100];
    return pl;
  }
  function planRaw(S, ranged, crit) {
    if (S.kind === 'sprite') {
      if (S.dragon && !ranged) return { style: 'bite', puff: 200, keys: mkKeys([[0, {}], [180, { X: -0.06, sq: -0.2, rot: -12, mo: 1 }], [300, { X: 1, sq: 0.14, rot: 12, mo: 1 }, 'in'], [340, { X: 1.03, sq: 0.26, rot: 6 }], [520, { X: 1, sq: 0 }], [740, { X: 0.3, Y: -12, sq: -0.1 }], [880, {}]]), dur: 880, impact: 320 };
      if (ranged || S.dragon) {
        const big = ranged;
        return { style: S.dragon ? 'breath' : S.sk === 'giant' ? 'rock' : (S.sk === 'robot' || S.sk === 'console') ? 'laser' : 'orb', keys: mkKeys([[0, {}], [200, { sq: -0.16, rot: -12, X: -0.03 }], [270, { sq: 0.1, rot: 8, mo: 1 }, 'out'], [big ? 560 : 520, { rot: 5, sq: 0.06, mo: 1 }], [760, {}]]), dur: 760, release: 260, fly: big ? 260 : 200 };
      }
      return { style: 'bite', keys: mkKeys([[0, {}], [160, { X: -0.05, sq: -0.18, rot: -8 }], [290, { X: 1, sq: 0.12, rot: 10, mo: 1 }, 'in'], [330, { X: 1.03, sq: 0.25, rot: 6 }], [500, { X: 1, sq: 0 }], [720, { X: 0.3, Y: -10, sq: -0.1 }], [860, {}]]), dur: 860, impact: 310 };
    }
    const k = S.wpn.k;
    // B 路线：忍者瞬身 / 手里剑、狂战士双连跳劈、武僧连打
    if (S.style === 'ninja' && ranged) return { style: S.wpn2 ? 'shuriken3' : 'shuriken', keys: mkKeys([[0, {}], [140, { fa: 200, fe: 220, lean: -8 }], [220, { fa: 80, fe: 60, lean: 14 }, 'out'], [420, { fa: 70, fe: 55, lean: 10 }], [640, {}]]), dur: 640, release: 220, fly: 200 };
    if (S.style === 'ninja') {
      const CR = { lean: 22, lt: 45, ls: -25, bt: -45, bs: -70, fa: -15, fe: 30, w: -60, two: 0 }, B1 = { P: 1, fl: 1, two: 0 };
      return { style: 'slash', wi: 4, smoke: [165, 285, 595, 700], keys: mkKeys([[0, {}], [130, CR], [170, Object.assign({ al: 0 }, CR)], [175, Object.assign({ dx: 20, al: 0, lean: -4, fa: 200, fe: 215, w: 240, Y: -8 }, B1)], [290, Object.assign({ dx: 20, al: 1, lean: -4, fa: 200, fe: 215, w: 240, Y: -8 }, B1)], [370, Object.assign({ dx: 18, lean: 24, fa: 70, fe: 80, w: 72, tr: 1, Y: 0, lt: 34, ls: -8, bt: -34, bs: -40 }, B1), 'in'], [410, Object.assign({ dx: 17, lean: 26, fa: 45, fe: 55, w: 35, tr: 1 }, B1)], [560, Object.assign({ dx: 17, lean: 20, fa: 45, fe: 55, w: 35 }, B1)], [600, Object.assign({ dx: 17, al: 0 }, B1)], [605, { al: 0 }], [720, { al: 1 }], [800, {}]]), dur: 800, impact: 380 };
    }
    if (S.style === 'rage' && !ranged) return { style: 'chop', heavy: 1, chops: [370], keys: mkKeys([[0, {}], [80, { ra: 1, lean: 15, X: 0.25 }], [220, { ra: 1, lean: 15, X: 0.75 }], [300, { X: 0.92, Y: -18, fa: 200, fe: 205, w: 225, ba: 190, be: 200, lean: -12, lt: 45, ls: -30, bt: -10, bs: -60 }], [370, { X: 1, Y: -4, fa: 80, fe: 70, w: 60, ba: 60, be: 50, lean: 30, tr: 1, lt: 35, ls: -5, bt: -38, bs: -45 }, 'in'], [430, { X: 1, Y: -14, fa: 205, fe: 210, w: 230, ba: 200, be: 210, lean: -8, lt: 45, ls: -30, bt: -10, bs: -60 }], [500, { X: 1.03, Y: 0, fa: 85, fe: 65, w: 50, ba: 80, be: 60, lean: 36, tr: 1, lt: 35, ls: -5, bt: -38, bs: -45 }, 'in'], [540, { X: 1.03, fa: 75, fe: 55, w: 40, ba: 70, be: 50, lean: 38, tr: 1, lt: 35, ls: -5, bt: -38, bs: -45 }], [700, { X: 1, fa: 75, fe: 55, w: 40, lean: 32 }], [860, { X: 0.35, Y: -8 }], [1000, {}]]), dur: 1000, impact: 505 };
    if (k === 'fist' && !ranged) {
      const JF = { X: 1, fa: 88, fe: 90, lean: 18 }, JB = { X: 1, ba: 88, be: 90, lean: 18 };
      return { style: 'punch', jabs: [300, 360, 420, 480], keys: mkKeys([[0, {}], [80, { ra: 1, X: 0.25, lean: 14 }], [220, { ra: 1, X: 0.92, lean: 14 }], [260, { X: 1 }], [300, JF, 'out'], [330, { X: 1 }], [360, JB, 'out'], [390, { X: 1 }], [420, JF, 'out'], [450, { X: 1 }], [480, JB, 'out'], [540, { X: 1, lean: 8, lt: 40, ls: -30, bt: -40, bs: -60, fa: -10, fe: 40, Y: 2 }], [610, { X: 1.02, Y: -10, lean: -6, fa: 150, fe: 170, tr: 1, lt: 20, ls: 0, bt: -20, bs: -30 }, 'in'], [760, { X: 1, Y: -4, fa: 155, fe: 175, lean: -4 }], [920, { X: 0.35, Y: -6 }], [1040, {}]]), dur: 1040, impact: 610 };
    }
    if (k === 'bow') return { style: S.wpn.arrow ? 'marrow' : 'arrow', keys: mkKeys([[0, {}], [150, { ba: 80, be: 86, fa: 60, fe: 150, lean: -2 }], [170, { ba: 82, be: 88, sik: 1, dr: 0.1 }], [400, { ba: 92, be: 92, sik: 1, dr: 1, lean: -6, hd: -3 }], [440, { ba: 92, be: 92, sik: 1, dr: 1, lean: -6 }], [455, { ba: 92, be: 92, sik: 0, dr: 0, fa: -40, fe: -70, lean: -8 }, 'out'], [650, { ba: 88, be: 90, fa: -25, fe: -40 }], [860, {}]]), dur: 860, release: 450, fly: 230 };
    if (k === 'cannon') return { style: 'laser', keys: mkKeys([[0, {}], [220, { fa: 85, fe: 92, w: 92, lean: 6, hd: 4 }], [300, { fa: 85, fe: 92, w: 92, lean: 6, hd: 4 }], [330, { fa: 78, fe: 85, w: 100, lean: -8, dx: -4 }, 'out'], [600, { fa: 85, fe: 92, w: 92 }], [800, {}]]), dur: 800, release: 320, fly: 160 };
    if (k === 'xbow') return { style: S.wpn.big ? 'bolt3' : 'bolt', keys: mkKeys([[0, {}], [200, { fa: 80, fe: 92, w: 90, lean: 6, hd: 4 }], [340, { fa: 80, fe: 92, w: 90, lean: 6, hd: 4 }], [370, { fa: 70, fe: 82, w: 100, lean: -6, dx: -3, ld: 0 }, 'out'], [520, { fa: 80, fe: 92, w: 90, ld: 0 }], [760, { ld: 0 }], [800, { ld: 1 }]]), dur: 800, release: 350, fly: 170 };
    // 近战武器隔空攻击：原地挥砍送出剑气
    if (ranged) {
      if (k === 'staff' && S.style === 'flask') return { style: 'flask', keys: mkKeys([[0, {}], [180, { ba: 190, be: 200, fa: 30, fe: 80, lean: -10 }], [260, { ba: 80, be: 60, lean: 14 }, 'out'], [460, { ba: 70, be: 50, lean: 10 }], [700, {}]]), dur: 700, release: 260, fly: 260 };
      if (k === 'staff') return { style: S.style === 'gu' ? 'swarm' : S.style === 'elem' ? 'elem' : S.wpn.top === 'clock' || S.wpn.top === 'hourglass' ? 'clock' : 'orb', keys: mkKeys([[0, {}], [220, { fa: 150, fe: 160, w: 175, lean: -6, glw: 1 }], [300, { fa: 95, fe: 95, w: 110, lean: 10 }, 'out'], [520, { fa: 90, fe: 95, w: 110 }], [760, {}]]), dur: 760, release: 300, fly: 240 };
      return { style: 'wave', keys: mkKeys([[0, {}], [220, { fa: 200, fe: 215, w: 240, lean: -4 }], [320, { fa: 70, fe: 80, w: 65, lean: 22, tr: 1 }, 'in'], [360, { fa: 45, fe: 55, w: 35, lean: 24, tr: 1 }], [560, { fa: 45, fe: 55, w: 35, lean: 20 }], [800, {}]]), dur: 800, release: 330, fly: 220 };
    }
    if (S.mount) {
      if (k === 'axe') return { style: 'chop', keys: mkKeys([[0, {}], [100, { ga: 1, X: 0.2 }], [300, { ga: 1, X: 0.85, fa: 195, fe: 205, w: 225, lean: -8 }], [400, { ga: 0.5, X: 1, fa: 85, fe: 70, w: 60, lean: 24, tr: 1, mp: -4 }, 'in'], [560, { X: 1, fa: 75, fe: 55, w: 40, lean: 20 }], [800, { ga: 1, X: 0.3 }], [950, {}]]), dur: 950, impact: 390 };
      return { style: 'thrust', keys: mkKeys([[0, {}], [100, { ga: 1, X: 0.2, fa: 10, fe: 80, w: 120 }], [320, { ga: 1, X: 0.88, fa: -10, fe: 60, w: 96, lean: 10 }], [400, { ga: 0.6, X: 1, fa: 82, fe: 92, w: 92, lean: 26, mp: -6, tr: 0.8 }, 'out'], [560, { X: 1, fa: 80, fe: 90, w: 92, lean: 20 }], [800, { ga: 1, X: 0.3, mp: 4 }], [950, {}]]), dur: 950, impact: 390 };
    }
    if (S.wings) { // 鹰族：振翅俯冲
      const lance = k === 'lance';
      return { style: lance ? 'thrust' : 'claw', keys: mkKeys([[0, {}], [140, { Y: -24, X: 0.3, wf: 1, lean: 20 }], [290, { Y: -30, X: 0.85, wf: 1, lean: 28, fa: 185, fe: 190, w: 200, lt: 40, ls: 0, bt: -20, bs: -40 }], [380, { Y: -2, X: 1, wf: 0.6, lean: 40, fa: lance ? 100 : 60, fe: lance ? 100 : 40, w: lance ? 112 : 100, tr: 1, lt: 50, ls: 20 }, 'in'], [540, { Y: -4, X: 1, lean: 34, fa: lance ? 95 : 55, fe: lance ? 98 : 40, w: lance ? 110 : 100 }], [740, { Y: -22, X: 0.4, wf: 1 }], [900, {}]]), dur: 900, impact: 370 };
    }
    if (k === 'claw' || k === 'none') { // 狼族扑击 / 徒手
      if (k === 'none') return { style: 'punch', keys: mkKeys([[0, {}], [80, { ra: 0.8, X: 0.25, lean: 12 }], [260, { ra: 0.8, X: 0.95, lean: 12 }], [330, { X: 1, fa: -30, fe: 60, lean: -4 }], [400, { X: 1, fa: 92, fe: 92, lean: 18, tr: 1 }, 'in'], [560, { X: 1, fa: 88, fe: 90, lean: 14 }], [760, { X: 0.35, Y: -6 }], [880, {}]]), dur: 880, impact: 390 };
      return { style: 'claw', keys: mkKeys([[0, {}], [120, { lean: 32, lt: 60, ls: -40, bt: -30, bs: -80, fa: 40, fe: 140, ba: 30, be: 140 }], [310, { X: 0.88, Y: -22, lean: 38, lt: 80, ls: 20, bt: -20, bs: -60, fa: 190, fe: 205, ba: 170, be: 190, mo: 1 }], [390, { X: 1, Y: 0, lean: 34, fa: 60, fe: 30, ba: 85, be: 60, tr: 1, mo: 1, lt: 40, ls: -10, bt: -40, bs: -50 }, 'in'], [560, { X: 1, lean: 30, fa: 50, fe: 25, ba: 80, be: 55 }], [760, { X: 0.35, Y: -10 }], [900, {}]]), dur: 900, impact: 380 };
    }
    if (S.style === 'qi' && !ranged) return { style: 'wave', keys: mkKeys([[0, {}], [220, { fa: 200, fe: 215, w: 240, lean: -4, lt: 22, ls: 0, bt: -22, bs: -24 }], [320, { fa: 70, fe: 80, w: 65, lean: 22, tr: 1, lt: 34, ls: -8, bt: -34, bs: -40 }, 'in'], [360, { fa: 45, fe: 55, w: 35, lean: 24, tr: 1 }], [560, { fa: 45, fe: 55, w: 35, lean: 20 }], [800, {}]]), dur: 800, release: 330, fly: 200 };
    if (k === 'katana' || (S.style === 'dash' && k === 'sword')) return { style: 'iai', keys: mkKeys([[0, {}], [150, { lean: 22, lt: 45, ls: -25, bt: -45, bs: -70, fa: -15, fe: 30, w: -60, two: 0, ba: 60, be: 40 }], [250, { lean: 24, lt: 48, ls: -28, bt: -48, bs: -72, fa: -15, fe: 30, w: -62, two: 0, ba: 60, be: 40 }], [330, { P: 1, dx: 30, lean: 30, lt: 70, ls: 25, bt: -50, bs: -35, fa: 100, fe: 100, w: 96, two: 0, ba: -30, be: -10, tr: 1 }, 'out'], [560, { P: 1, dx: 32, lean: 26, lt: 60, ls: -20, bt: -55, bs: -70, fa: 100, fe: 100, w: 96, two: 0, ba: -30, be: -10 }], [640, { P: 1, dx: 32, lean: 12, fa: 20, fe: 90, w: -70, two: 0, ba: 50, be: 80 }], [840, { P: 0.45, dx: 14, Y: -26, lean: -10, two: 0 }], [1000, {}]]), dur: 1000, impact: 600, streak: [250, 330] };
    if (k === 'axe') return { style: 'chop', keys: mkKeys([[0, {}], [80, { ra: 1, lean: 15, X: 0.25 }], [230, { ra: 1, lean: 15, X: 0.78 }], [330, { X: 0.95, Y: -16, fa: 195, fe: 200, w: 220, lean: -10, lt: 45, ls: -30, bt: -10, bs: -60 }], [420, { X: 1, Y: 0, fa: 85, fe: 70, w: 60, lean: 32, tr: 1, lt: 35, ls: -5, bt: -38, bs: -45 }, 'in'], [460, { X: 1, fa: 75, fe: 55, w: 40, lean: 36, tr: 1, lt: 35, ls: -5, bt: -38, bs: -45 }], [620, { X: 1, fa: 75, fe: 55, w: 40, lean: 32 }], [800, { X: 0.35, Y: -8 }], [950, {}]]), dur: 950, impact: 425, heavy: 1 };
    if (k === 'staff' || k === 'fork') {
      if (k === 'fork') return { style: 'thrust', keys: mkKeys([[0, {}], [80, { ra: 0.8, X: 0.25 }], [260, { ra: 0.8, X: 0.9, fa: 0, fe: 70, w: 95 }], [380, { X: 1, fa: 85, fe: 92, w: 92, lean: 20, tr: 0.8 }, 'out'], [540, { X: 1, fa: 85, fe: 92, w: 92, lean: 16 }], [760, { X: 0.35, Y: -6 }], [880, {}]]), dur: 880, impact: 370 };
      return { style: 'bonk', keys: mkKeys([[0, {}], [80, { ra: 0.7, X: 0.22, lean: 8 }], [280, { ra: 0.7, X: 0.9, lean: 8 }], [380, { X: 1, fa: 195, fe: 205, w: 215, two: 1, lean: -8, Y: -4 }], [460, { X: 1, fa: 85, fe: 75, w: 72, two: 1, lean: 26, tr: 1 }, 'in'], [600, { X: 1, fa: 80, fe: 62, w: 60, two: 1, lean: 22 }], [780, { X: 0.35, Y: -6 }], [920, {}]]), dur: 920, impact: 455 };
    }
    if (k === 'lance') return { style: 'thrust', keys: mkKeys([[0, {}], [80, { ra: 1, X: 0.25 }], [250, { ra: 1, X: 0.85, fa: -10, fe: 60, w: 95, lean: 12 }], [340, { X: 1, fa: 85, fe: 92, w: 92, lean: 26, tr: 0.8 }, 'out'], [520, { X: 1, fa: 85, fe: 92, w: 92, lean: 20 }], [760, { X: 0.35, Y: -8 }], [900, {}]]), dur: 900, impact: 330 };
    // 剑：冲刺 → 高举 → 斜劈 → 收势 → 跃回
    return { style: 'slash', keys: mkKeys([[0, {}], [80, { ra: 1, lean: 18, X: 0.25 }], [240, { ra: 1, lean: 18, X: 0.9 }], [330, { X: 1, lean: -4, fa: 200, fe: 215, w: 240, lt: 22, ls: 0, bt: -22, bs: -24 }], [410, { X: 1, lean: 24, fa: 75, fe: 85, w: 72, tr: 1, lt: 34, ls: -8, bt: -34, bs: -40 }, 'in'], [450, { X: 1.02, lean: 26, fa: 45, fe: 55, w: 35, tr: 1, lt: 34, ls: -8, bt: -34, bs: -40 }], [600, { X: 1, lean: 20, fa: 45, fe: 55, w: 35 }], [770, { X: 0.4, Y: -8 }], [900, {}]]), dur: 900, impact: 415 };
  }
  // 守方反应：受击 / 暴击 / 闪避 / 倒下
  function react(S, kind) {
    const spr = S.kind === 'sprite', mnt = !!S.mount;
    if (kind === 'hit' || kind === 'crit') {
      const c = kind === 'crit' ? 1.8 : 1;
      if (spr) return { keys: mkKeys([[0, {}], [60, { dx: -6 * c, sq: -0.16, rot: -8 * c }], [200, { dx: -9 * c, sq: 0.1, rot: -3 }], [420, {}]]), dur: 420 };
      if (mnt) return { keys: mkKeys([[0, {}], [70, { dx: -6 * c, mp: 8 * c, lean: -18, hd: -14, fa: -10 }], [240, { dx: -9 * c, mp: 4, lean: -8 }], [460, {}]]), dur: 460 };
      return { keys: mkKeys([[0, {}], [60, { dx: -6 * c, lean: -20 * c, hd: -16, fa: -20, fe: 20, ba: -50, be: -30 }], [kind === 'crit' ? 260 : 200, { dx: -10 * c, lean: -10, hd: -6, lt: 20 + 10 * c, ls: -20 * c, bt: -10, bs: -30 * c }], [kind === 'crit' ? 560 : 420, {}]]), dur: kind === 'crit' ? 560 : 420 };
    }
    if (kind === 'dodge') {
      if (spr) return { keys: mkKeys([[0, {}], [90, { dx: -16, Y: -10, sq: -0.12 }], [220, { dx: -18, Y: 0, sq: 0.08 }], [420, {}]]), dur: 420 };
      if (mnt) return { keys: mkKeys([[0, {}], [100, { dx: -16, mp: 10, ga: 0.6 }], [240, { dx: -18, mp: 0 }], [440, {}]]), dur: 440 };
      return { keys: mkKeys([[0, {}], [90, { dx: -16, Y: -11, lean: -16, lt: 40, ls: -20, bt: -10, bs: -60 }], [220, { dx: -19, Y: 0, lean: -6 }], [440, {}]]), dur: 440 };
    }
    // die
    if (spr) return { keys: mkKeys([[0, {}], [70, { dx: -16, Y: -6, sq: -0.2, rot: -14 }, 'out'], [300, { dx: -22, sq: 0.35, rot: -16 }], [520, { dx: -22, sq: 0.55, rot: -20, Y: 2, al: 0.7 }], [720, { dx: -22, sq: 0.6, rot: -20, Y: 2, al: 0 }]]), dur: 720, hold: 1 };
    if (mnt) return { keys: mkKeys([[0, {}], [70, { dx: -14, mp: 12, lean: -30, hd: -24 }, 'out'], [360, { dx: -20, mp: 14, lean: -30, rot: -10 }], [520, { dx: -22, mp: -6, lean: -50, rot: -16, Y: 8, al: 0.8 }], [720, { dx: -22, mp: -6, lean: -50, rot: -16, Y: 8, al: 0 }]]), dur: 720, hold: 1 };
    const KN = { lean: 30, hd: 25, lt: 88, ls: -6, bt: 10, bs: -88, fa: 10, fe: 20, w: 100, ba: 10, be: 10 };
    return { keys: mkKeys([[0, {}], [70, { dx: -14, Y: -7, lean: -30, hd: -24, fa: -40, fe: -20, ba: -60, be: -40 }, 'out'], [200, { dx: -24, Y: -2, lean: -16, hd: -10, fa: -20, ba: -50 }], [330, Object.assign({ dx: -26 }, KN)], [520, Object.assign({ dx: -27, rot: -86, al: 0.8 }, KN), 'in'], [720, Object.assign({ dx: -27, rot: -86, al: 0 }, KN)]]), dur: 720, hold: 1 };
  }

  return { specOf, stance, sample, proc, draw, plan, react, gap, mkKeys, FW, FH, OX, OY };
})();
