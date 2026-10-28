// 像素精灵：16x16 字符画，按阵营配色后缓存为离屏画布
'use strict';

const PAL_BASE = {
  k: '#1a1020', s: '#f2c79a', S: '#c99a6e', m: '#d6dcea', n: '#7a8296', w: '#8a5a2c', W: '#ffffff',
  g: '#f4c542', G: '#5aa04a', H: '#2f6a2a', r: '#d83a3a', P: '#f29ab0', b: '#ece4c8', B: '#a89c7c',
  f: '#7a4a2a', F: '#4a2a14', y: '#9a9aa8', Y: '#5a5a6a', d: '#3a2050', D: '#6a3a8a', o: '#ff8a2a',
  c: '#7ad8ff', C: '#2a8ad8', e: '#ff3030', O: '#b0702a', K: '#1a1020',
  // 转职外观用：银、暗金、淡金光、暗红、马棕、刃光、魔紫、白马阴影
  i: '#a4aec4', a: '#b07a1e', L: '#fff1a0', R: '#9a1e24', u: '#b0703a', v: '#eaf8ff', A: '#c66aff', j: '#c8ccd8',
  T: '#2fb0a8', t: '#1a6a70', // 青色（时空术士、风鹰）
  U: '#1c3f8a', // 深蓝（冒险者蓝披风）
};
const TEAM_PAL = {
  player: { p: '#3a7bd5', q: '#1f4a8a' },
  ally:   { p: '#3aa860', q: '#1f6a3a' },
  enemy:  { p: '#d8433a', q: '#8a1f1f' },
  rogue:  { p: '#b08a3a', q: '#6a4a1a' },
};

// Q 版人形底稿：大头（0–8 行，满宽、2×2 大眼带高光、腮红），小身体（9–12 行），短腿（13–14 行）
const BODY = [
  '.....kkkkkk.....',
  '...kkhhhhhhkk...',
  '..khhhhhhhhhhk..',
  '..khhhhhhhhhhk..',
  '..khhhhhhhhhhk..',
  '..khhsshhsshhk..',
  '..khsWkssWkshk..',
  '..ksskksskkssk..',
  '...kPssssssPk...',
  '....kqppppqk....',
  '...ksppppppsk...',
  '....kqppppqk....',
  '....kqqggqqk....',
  '....kppkkppk....',
  '....kqqkkqqk....',
  '....kkk..kkk....',
]

function grid(rows) { const r = rows.slice(0, 16); while (r.length < 16) r.push(''); return r.map(x => x.padEnd(16, '.').slice(0, 16).split('')); }
function put(g, x, y, c) { if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = c; }
function vline(g, x, y0, y1, c) { for (let y = y0; y <= y1; y++) put(g, x, y, c); }
function hline(g, x0, x1, y, c) { for (let x = x0; x <= x1; x++) put(g, x, y, c); }
function sword(g) { vline(g, 13, 3, 9, 'm'); put(g, 14, 4, 'k'); vline(g, 14, 5, 9, 'n'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'w'); }
function overlay(g, rows) {
  rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c !== '.') put(g, x, y, c); }));
}


const SPRITE_DEFS = {
  skeleton() {
    const g = grid([
      '................',
      '......kkkk......',
      '.....kbbbbk.....',
      '....kbbbbbbk....',
      '....kbkbbkbk....',
      '....kbkbbkbk....',
      '....kbbbbbbk....',
      '.....kbkbkk.....',
      '.....kbbbbk.....',
      '....kbkbbkbk....',
      '...kbkbbbbkbk...',
      '.....kbkbk......',
      '.....kbkkbk.....',
      '.....kbkkbk.....',
      '.....kk..kk.....',
      '................',
    ]);
    sword(g); for (let y = 3; y <= 9; y++) if (g[y][13] === 'm') g[y][13] = 'B';
    return g;
  },
  skelArcher() {
    const g = SPRITE_DEFS.skeleton(); for (let y = 0; y < 16; y++) for (let x = 12; x < 16; x++) g[y][x] = '.';
    vline(g, 1, 6, 11, 'w'); put(g, 2, 5, 'w'); put(g, 2, 12, 'w'); vline(g, 3, 6, 11, 'W');
    return g;
  },
  pigdragon() {
    return grid([
      '................',
      '.k..........k...',
      'kPk........kPk..',
      'kPPk.kkkk.kPPk..',
      '.kPkkGGGGkkPk...',
      '..kkGGGGGGkk....',
      '..kGGkGGkGGk....',
      '..kGGGGGGGGk....',
      '..kGPPPPPPGk....',
      '..kGPkPPkPGk....',
      '...kGPPPPGkk....',
      '...kGGGGGGGGk...',
      '..kGGkGGGkGGGk..',
      '..kGk.kkk.kGkk..',
      '..kk.......kk...',
      '................',
    ]);
  },
  wolf() {
    return grid([
      '................',
      '................',
      '................',
      '..kk............',
      '.kyyk...........',
      'kyyyyk..........',
      'kykyyykkkkkkk...',
      '.kyyyyyyyyyyyk..',
      '..kyyyyyyyyyyyk.',
      '..kyWyyyyyyyyyk.',
      '...kyyyyyyyyykk.',
      '...kyykkkkyyk...',
      '...kyk...kyk....',
      '...kk....kk.....',
      '................',
      '................',
    ]);
  },
  roc() {
    return grid([
      '................',
      'k..............k',
      'kfk...kkk....kfk',
      'kffk.kooook.kffk',
      '.kffkokookokffk.',
      '.kfffkoooofffk..',
      '..kfffkooofffk..',
      '...kffoooooffk..',
      '....kkoooook....',
      '.....kfffffk....',
      '......kfffk.....',
      '......kgkgk.....',
      '......kg.gk.....',
      '................',
      '................',
      '................',
    ]);
  },
  spirit() {
    return grid([
      '................',
      '.......kk.......',
      '..kk..kcck..kk..',
      '.kcck.kcck.kcck.',
      '.kccckWWWWkccck.',
      '..kcckWkkWkcck..',
      '...kckWWWWkck...',
      '....kkcWWckk....',
      '.....kcccck.....',
      '....kcCccCck....',
      '.....kcccck.....',
      '......kcck......',
      '.......kk.......',
      '................',
      '................',
      '................',
    ]);
  },
  demon() {
    return grid([
      '.kk..........kk.',
      'kmmk........kmmk',
      '.kmmk.kkkk.kmmk.',
      '..kmkdddddkmk...',
      '...kddddddddk...',
      '..kddeddddeddk..',
      '..kdddddddddddk.',
      'kkkddkWkWkddkkkk',
      'kDDkdddddddkDDDk',
      'kDDDkddrrddkDDDk',
      '.kDDkddddddkDDk.',
      '..kkdddddddkkk..',
      '...kddkkkddk....',
      '...kdk...kdk....',
      '...kk.....kk....',
      '................',
    ]);
  },
};

const SPRITE_CACHE = {};
// 变体配色（龙的颜色、神巫元素、精灵属性）：替换 G/H 等通道
const VARIANT_PAL = {
  red: { G: '#d8433a', H: '#8a1f1f' }, blue: { G: '#4a8ad8', H: '#1f4a8a' }, black: { G: '#3a3048', H: '#1a1020' }, green: { G: '#5aa04a', H: '#2f6a2a' },
  earth: { f: '#8a6a3a', F: '#5a3a1a' }, wood: { f: '#3a7a3a', F: '#1f4a1f' }, water: { f: '#3a6ab8', F: '#1f3a7a' }, fire: { f: '#c8401a', F: '#7a1f0a' }, metal: { f: '#c8c8d0', F: '#7a7a8a' },
};
// 返回离屏画布 (16x16 像素)
function getSprite(key, tier, team, hair, variant) {
  const id = `${key}|${tier}|${team}|${hair || ''}|${variant || ''}`;
  if (SPRITE_CACHE[id]) return SPRITE_CACHE[id];
  const def = SPRITE_DEFS[key] || SPRITE_DEFS.swordsman;
  const g = def(tier || 0);
  const pal = Object.assign({}, PAL_BASE, TEAM_PAL[team] || TEAM_PAL.enemy, { h: hair || '#3a2a1a' }, VARIANT_PAL[variant] || {});
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d');
  for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) {
    const ch = g[yy][xx]; if (ch === '.' || !pal[ch]) continue;
    x.fillStyle = pal[ch]; x.fillRect(xx, yy, 1, 1);
  }
  SPRITE_CACHE[id] = c;
  return c;
}

// ---------- 地形贴图 ----------
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const TILE_CACHE = {};
function getTile(t, x, y, frame) {
  const variant = (x * 7 + y * 13) % 3;
  const id = `${t}|${variant}|${frame}`;
  if (TILE_CACHE[id]) return TILE_CACHE[id];
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const R = seeded(variant * 97 + t.charCodeAt(0) * 31 + frame * 7);
  const px = (xx, yy, col) => { g.fillStyle = col; g.fillRect(xx, yy, 1, 1); };
  const fill = col => { g.fillStyle = col; g.fillRect(0, 0, 16, 16); };
  const speckle = (cols, n) => { for (let i = 0; i < n; i++) px((R() * 16) | 0, (R() * 16) | 0, cols[(R() * cols.length) | 0]); };
  const grass = () => { fill('#5d9e3f'); speckle(['#6fb24a', '#4f8a34', '#78bd52'], 26); };
  switch (t) {
    case 'G': grass(); if (variant === 1) { px(4, 5, '#f4e04a'); px(11, 11, '#ffffff'); } break;
    case 'F': {
      grass();
      const tree = (cx, cy, r) => {
        g.fillStyle = '#5a3a1a'; g.fillRect(cx - 1, cy + r - 1, 2, 3);
        g.fillStyle = '#1e4a1e'; g.beginPath(); g.arc(cx, cy, r + 0.6, 0, 7); g.fill();
        g.fillStyle = '#2f7a2f'; g.beginPath(); g.arc(cx, cy, r - 0.4, 0, 7); g.fill();
        g.fillStyle = '#4aa04a'; g.fillRect(cx - 2, cy - 2, 2, 2);
      };
      tree(5, 5, 3.5); tree(11, 8, 3.5); tree(5, 12, 2.5);
      break;
    }
    case 'M': {
      fill('#8a9a5a'); speckle(['#7a8a4a', '#9aaa6a'], 16);
      g.fillStyle = '#3a3030'; g.beginPath(); g.moveTo(0, 16); g.lineTo(8, 1); g.lineTo(16, 16); g.fill();
      g.fillStyle = '#8a7a6a'; g.beginPath(); g.moveTo(1.5, 15.5); g.lineTo(8, 2.5); g.lineTo(14.5, 15.5); g.fill();
      g.fillStyle = '#6a5a4a'; g.beginPath(); g.moveTo(8, 2.5); g.lineTo(14.5, 15.5); g.lineTo(9, 15.5); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(8, 2.5); g.lineTo(5.6, 7); g.lineTo(8, 6); g.lineTo(10.4, 7); g.fill();
      break;
    }
    case 'W': {
      fill('#3b6fc4'); speckle(['#3466b8', '#4479d0'], 20);
      g.fillStyle = '#9ac4ff';
      for (let i = 0; i < 3; i++) { const yy = 3 + i * 5, xx = ((i * 5 + frame * 3) % 12); g.fillRect(xx, yy, 3, 1); g.fillRect(xx + 1, yy - 1, 1, 1); }
      break;
    }
    case 'L': {
      fill('#c8341a'); speckle(['#e85a1a', '#a82010', '#ff9a2a'], 40);
      g.fillStyle = '#ffd040'; for (let i = 0; i < 3; i++) g.fillRect(((i * 6 + frame * 4) % 14), 2 + i * 5, 2, 1);
      break;
    }
    case 'R': fill('#c9a66b'); speckle(['#b8955a', '#d8b87a', '#a8854a'], 22); break;
    case 'S': fill('#e0c890'); speckle(['#d0b880', '#f0d8a0'], 20); break;
    case 'B': {
      fill('#3b6fc4');
      g.fillStyle = '#7a4a22'; g.fillRect(0, 1, 16, 14);
      g.fillStyle = '#9a6a3a'; for (let i = 0; i < 4; i++) g.fillRect(0, 2 + i * 3.5, 16, 2.5);
      g.fillStyle = '#4a2a10'; g.fillRect(0, 1, 16, 1); g.fillRect(0, 14, 16, 1);
      break;
    }
    case 'V': {
      grass();
      g.fillStyle = '#e8d8b0'; g.fillRect(3, 8, 10, 7);
      g.fillStyle = '#c03a2a'; g.beginPath(); g.moveTo(1, 9); g.lineTo(8, 2); g.lineTo(15, 9); g.fill();
      g.fillStyle = '#801a10'; g.fillRect(1, 9, 14, 1);
      g.fillStyle = '#5a3a1a'; g.fillRect(7, 11, 3, 4);
      g.fillStyle = '#7ad8ff'; g.fillRect(4, 10, 2, 2);
      break;
    }
    case 'C': {
      fill('#8a8a94');
      g.fillStyle = '#6a6a74'; for (let i = 0; i < 16; i += 8) { g.fillRect(0, i, 16, 1); g.fillRect(i + (variant * 4) % 8, 0, 1, 16); }
      speckle(['#9a9aa4', '#7a7a84'], 10);
      break;
    }
    case 'K': {
      fill('#8a8a94'); g.fillStyle = '#a01a2a'; g.fillRect(1, 0, 14, 16);
      g.fillStyle = '#f4c542'; g.fillRect(2, 0, 1, 16); g.fillRect(13, 0, 1, 16);
      break;
    }
    case 'X': {
      fill('#4a4450');
      g.fillStyle = '#2a2430'; for (let yy = 0; yy < 16; yy += 4) { g.fillRect(0, yy, 16, 1); for (let xx = (yy / 4) % 2 ? 0 : 4; xx < 16; xx += 8) g.fillRect(xx, yy, 1, 4); }
      g.fillStyle = '#5a5460'; g.fillRect(0, 1, 16, 1);
      break;
    }
    case 'D': {
      fill('#3a2848'); speckle(['#4a3858', '#2a1838', '#5a3a6a'], 26);
      g.fillStyle = '#7a3aa0'; if (variant === 2) { g.fillRect(3, 6, 4, 1); g.fillRect(6, 7, 1, 3); }
      break;
    }
    case 'H': {
      grass(); g.fillStyle = '#4f8a34'; g.beginPath(); g.ellipse(8, 11, 8, 5, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#78bd52'; g.beginPath(); g.ellipse(7, 11, 5, 3, 0, Math.PI, 0); g.fill(); break;
    }
    case 'N': fill('#e8eef8'); speckle(['#ffffff', '#cfd8e8', '#dfe6f2'], 26); break;
    case 'P': { fill('#4a6a3a'); speckle(['#3a5a5a', '#5a7a4a'], 24); g.fillStyle = '#3a6a8a'; g.fillRect(2, 4, 5, 2); g.fillRect(9, 10, 5, 2); g.fillStyle = '#7aa04a'; g.fillRect(12, 3, 1, 3); g.fillRect(4, 11, 1, 3); break; }
    case 'T': { fill('#5a9ad8'); speckle(['#6aaae0', '#4a8ac8', '#c0a070'], 18); g.fillStyle = '#c8e4ff'; g.fillRect(((frame * 5) % 12), 6, 3, 1); g.fillRect(((frame * 5 + 6) % 12), 12, 3, 1); break; }
    case 'O': fill('#5a4a42'); speckle(['#4a3a32', '#6a5a52', '#3a2a22'], 30); break;
    case 'Y': { fill('#8a8a94'); g.fillStyle = '#1a1020'; g.fillRect(4, 1, 8, 15); g.fillStyle = '#c8c8d0'; g.fillRect(5, 1, 6, 14); g.fillStyle = '#9a9aa4'; g.fillRect(9, 1, 2, 14); g.fillStyle = '#e8e8f0'; g.fillRect(3, 1, 10, 2); break; }
    case 'A': { fill('#8a8a94'); g.fillStyle = '#c8b070'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#f4e08a'; g.fillRect(3, 3, 10, 10); g.fillStyle = '#fff6c8'; g.fillRect(7, 4, 2, 8); g.fillRect(5, 6, 6, 2); break; }
    default: grass();
  }
  TILE_CACHE[id] = c;
  return c;
}

function drawChest(ctx, x, y, s, opened) {
  const p = s / 16;
  ctx.fillStyle = '#1a1020'; ctx.fillRect(x + 3 * p, y + 6 * p, 10 * p, 8 * p);
  ctx.fillStyle = opened ? '#6a4a2a' : '#b0702a'; ctx.fillRect(x + 4 * p, y + 7 * p, 8 * p, 6 * p);
  ctx.fillStyle = opened ? '#3a2a1a' : '#f4c542'; ctx.fillRect(x + 4 * p, y + 9 * p, 8 * p, 1 * p); ctx.fillRect(x + 7 * p, y + 9 * p, 2 * p, 2 * p);
}

// ---------- v2：更多职业与怪物 ----------
function recolor(g, map) { for (const row of g) for (let x = 0; x < 16; x++) if (map[row[x]]) row[x] = map[row[x]]; return g; }
Object.assign(SPRITE_DEFS, {
  slime() {
    return grid(['', '', '', '', '', '', '......kkkk......', '....kkGGGGkk....', '...kGGWGGGGGk...', '..kGGWWGGGGGGk..', '..kGGGkGGkGGGk..', '..kGGGGGGGGGGk..',
      '..kHGGGGGGGGHk..', '...kHHHHHHHHk...', '....kkkkkkkk....']);
  },
  watersnake() {
    return recolor(grid(['', '', '..........kkk...', '.........kGGGk..', '.........kGkGk..', '.........kGGGrr.', '..........kGGk..', '.....kkkkkGGk...',
      '....kGGGGGGk....', '...kGGkkkkk.....', '...kGGk.kkkk....', '....kGGkGGGGk...', '.....kGGGGGGGk..', '......kkkkkkk...']), {});
  },
  crocodile() {
    return grid(['', '', '', '', '', '...kk.kk........', '..kGGkGGkkkkk...', '.kGWkGGGGGGGGkk.', 'kGGGGGGGGGGGGGGk', 'kWWWWGGGHGHGHGGk',
      '.kkkkGGGGGGGGGk.', '....kGk.kGk.kGk.', '....kk..kk..kk..']);
  },
  hydra() {
    return grid(['.kk....kk....kk.', 'kGrk..kGrk..kGrk', 'kGGk..kGGk..kGGk', '.kGk...kGk..kGk.', '.kGGk..kGk.kGGk.', '..kGGk.kGk.kGk..', '...kGGkGGkkGk...',
      '...kGGGGGGGGk...', '..kGGGGGGGGGGk..', '.kGGHGGHGGHGGGk.', '.kGGGGGGGGGGGGk.', '..kHHHHHHHHHHk..', '..CCccCCccCCccC.', '.cCCccCCccCCccCC']);
  },
  gargoyle() {
    return grid(['', '.k.....kk.....k.', 'kYk...kYYk...kYk', 'kYYk.kYeYeK.kYYk', '.kYYkYYYYYYkYYk.', '..kYYkYYYYkYYk..', '...kkYYYYYYkk...', '....kYYkkYYk....',
      '....kYYYYYYk....', '.....kYkkYk.....', '....kYk..kYk....', '....kk....kk....']);
  },
  scorpion() {
    return grid(['', '..........kk....', '.........kOOk...', '..........kOk...', '..........kOk...', '..kk.....kOk....', '.kOOk..kkOk.....', '.kOkkkkOOOk.kk..',
      '..kOOOOOOOOkOOk.', '.kOOkOOkOOOOOk..', 'kOk.kOOOOOOk....', '.k..kOkkOkOk....', '....kk..k.kk....']);
  },
  spider() {
    return grid(['', '', '', 'k..k......k..k..', '.k..k....k..k...', '..k..kkkk..k....', '...kkddddkk.....', 'kkkkdeddedkkkkk.', '...kddddddk.....',
      '..kkdDDDDdkk....', '.k.kdDddDdk.k...', 'k..k.kddk.k..k..', '...k..kk..k.....']);
  },
  giant() {
    return grid(['......kkkk......', '.....kffffk.....', '....kSSSSSSk....', '....kSkSSkSk....', '....kSSSSSSk..kk', '.....kSrrSk..kyyk', '...kkkSSSSkkkyyyk',
      '..kffffffffffkyk', '..kSffffffffSk..', '..kSkffffffkSk..', '...kkffffffkk...', '....kffkkffk....', '....kSSk.kSSk...', '....kkkk.kkkk...']);
  },
  yeti() {
    return grid(['......kkkk......', '....kkWWWWkk....', '...kWWWWWWWWk...', '...kWCkWWkCWk...', '...kWWWWWWWWk...', '....kWkkkkWk....', '..kkWWWWWWWWkk..',
      '.kWWWWWWWWWWWWk.', '.kWWkWWWWWWkWWk.', '.kWk.kWWWWk.kWk.', '..k..kWWWWk..k..', '.....kWkkWk.....', '....kWWkkWWk....', '....kkkk.kkkk...']);
  },
  sphinx() {
    return grid(['', '.....kkkkk......', '....kgggggk.....', '...kgsssssgk....', '...kgskssksk....', '...kgsssssgk....', '....kgsrsgk.kk..', '....kgkkkgkkook.',
      '..kkoooooooooook', '.koooooooooooook', '.kokooooooookok.', '.kok.kook.kok...', '.kk..kkk..kk....']);
  },
  seaMonster() {
    return grid(['', '', '', '.....kkkkk......', '....kCCCCCk..kk.', '...kCWkCCCCk.kCk', '..kCCCCCCCCCkCCk', '..kCrrrCCCCCCCk.', '..kCCCCCCCCCCk..',
      '...kCCCCCCCCk...', '....kkCCCCkk....', '..cccckkkkcccc..', '.cCcCccCCccCcCc.']);
  },
  kraken() {
    return grid(['.....kkkkkk.....', '....kPPPPPPk....', '...kPPPPPPPPk...', '...kPWkPPkWPk...', '...kPPPPPPPPk...', '....kPPPPPPk....', '.k.kPkPkkPkPk.k.',
      'kPkPkPkPPkPkPkPk', 'kPkPk.kPPk.kPkPk', '.kPk..kPPk..kPk.', '.kPk...kk...kPk.', '..kk.cccccc.kk..', '.cCCccCCCCccCCc.']);
  },
  beast() { return SPRITE_DEFS.wolf(); },
  darkLord() {
    const g = SPRITE_DEFS.demon();
    put(g, 1, 1, 'g'); put(g, 2, 1, 'g'); put(g, 13, 1, 'g'); put(g, 14, 1, 'g'); put(g, 6, 3, 'g'); put(g, 9, 3, 'g');
    return g;
  },
  robot() {
    return grid(['', '.....kkkkkk.....', '....kmmmmmmk....', '....kmkkkkmk....', '....kmceeckk....', '....kmmmmmmk....', '...kkkmmmmkkk...', '..knmnmmmmnmnk..',
      '..knmkmggmkmnk..', '..kkkkmmmmkkkk..', '....kmmkkmmk....', '....knnk.knnk...', '....kkkk.kkkk...']);
  },
  console() {
    return grid(['', '', '..kkkkkkkkkkkk..', '..kYYYYYYYYYYk..', '..kYkkkkkkkkYk..', '..kYkcccGcckYk..', '..kYkcGcccckYk..', '..kYkcccccGkYk..', '..kYkkkkkkkkYk..',
      '..kYYYYYYYYYYk..', '.kkkkkkkkkkkkkk.', '.knrngnrngnrnnk.', '.kYYYYYYYYYYYYk.', '.kkkkkkkkkkkkkk.']);
  },
  wind() {
    return grid(['', '..kkkkkkkkkkk...', '.kWcWcWcWcWcWk..', '..kcWcWcWcWck...', '...kWcWcWcWk....', '....kcWcWck.....', '.....kWcWk......', '......kcWk......',
      '.....kWck.......', '......kWk.......', '.......kWk......', '......kk........']);
  },
  spiritEarth() { return recolor(SPRITE_DEFS.spirit(), { c: 'o', C: 'f' }); },
  spiritFire() { return recolor(SPRITE_DEFS.spirit(), { c: 'o', C: 'r' }); },
  spiritWind() { return recolor(SPRITE_DEFS.spirit(), { c: 'G', C: 'H' }); },
  spiritWater() { return SPRITE_DEFS.spirit(); },
  turtle() {
    return grid(['', '', '', '', '.....kkkkkk.....', '...kkGHGHGHkk...', '..kGHGHGHGHGHk..', '.kHGHGHGHGHGHGk.', 'kkGHGHGHGHGHGHkk', 'kssGGGGGGGGGGkss',
      '.kkkssk..kssk.k.', '...kkk....kkk...']);
  },
});

// ---------- v3：Q 版（大头）角色 + 转职外观 ----------
// 头占 0–8 行（满宽、2×2 大眼带高光、腮红），身体 9–12 行，短腿 13–14 行。
// 每次转职都要在手机地图上一眼看出：头上的装备（头带 / 头盔 / 冠 / 帽）、护肩、披风、武器尺寸与配色（布 → 钢 → 银 → 金 → 光）同时升级。
// 阵营色 p/q 始终保留在衣身 / 腿 / 披风上，敌我仍可辨认。
// 辅助函数放在块作用域内，避免与其它脚本的全局名冲突
{
const tierOf = (t, n) => Math.max(0, Math.min(n - 1, t | 0));
// 叠加字符画：'.' 或空格跳过，'_' 擦成透明；map 可把占位字母换成实际色
function paint(g, rows, map) {
  rows.forEach((r, y) => r.split('').forEach((c, x) => {
    if (c === '.' || c === ' ') return;
    put(g, x, y, c === '_' ? '.' : (map && map[c]) || c);
  }));
  return g;
}
// 区域内把 from 里的字符换成 c
function fill(g, x0, y0, x1, y1, c, from) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] !== undefined && (!from || from.includes(g[y][x]))) g[y][x] = c;
}
// 眼睛的暗色像素（保留左上高光）
function eyes(g, c) { for (const [x, y] of [[6, 6], [5, 7], [6, 7], [10, 6], [9, 7], [10, 7]]) put(g, x, y, c); }

const GEAR = {
  belt(g, c, buckle) { hline(g, 5, 10, 12, c); if (buckle) { put(g, 7, 12, buckle); put(g, 8, 12, buckle); } },
  boots(g, c) { hline(g, 5, 6, 14, c); hline(g, 9, 10, 14, c); },
  // 头带，tail = 带尾飘向左后
  band(g, c, tail) { hline(g, 3, 12, 4, c); if (tail) { put(g, 2, 4, c); put(g, 1, 5, c); put(g, 1, 6, c); put(g, 0, 7, c); } },
  circlet(g, c, gem) { hline(g, 3, 12, 4, c); put(g, 7, 4, gem); put(g, 8, 4, gem); },
  // 全盔：盖住头发，帽檐 + 护颊
  helm(g, L, D) {
    fill(g, 2, 1, 13, 4, L, 'h'); hline(g, 3, 12, 5, D); put(g, 3, 6, D); put(g, 12, 6, D); put(g, 3, 7, D); put(g, 12, 7, D);
    put(g, 5, 2, 'W'); put(g, 4, 3, 'W');
  },
  hood(g, c) {
    fill(g, 2, 1, 13, 4, c, 'h'); for (const [x, y] of [[3, 5], [4, 5], [11, 5], [12, 5], [3, 6], [12, 6], [3, 7], [12, 7]]) put(g, x, y, c);
  },
  // 头顶羽饰 / 冠缨（突出头顶）
  plume(g, c) { paint(g, ['.....cccccc.....', '......cccc......'], { c }); },
  crown(g, c, gem) { paint(g, ['....c..cc..c....', '....cccccccc....', '....ccceeccc....'], { c, e: gem || 'r' }); },
  // 护肩：big 时更宽
  pads(g, L, D, big) {
    put(g, 3, 9, L); put(g, 4, 9, L); put(g, 3, 10, D); put(g, 11, 9, L); put(g, 12, 9, L); put(g, 12, 10, D);
    if (big) { put(g, 2, 9, L); put(g, 2, 10, D); put(g, 13, 9, L); put(g, 13, 10, D); }
  },
  // 胸甲：mid = 中央罩袍 / 纹章色
  plate(g, L, D, mid) {
    hline(g, 5, 10, 9, L); hline(g, 5, 10, 10, L); hline(g, 5, 10, 11, D); put(g, 5, 10, D); put(g, 10, 10, D);
    if (mid) { put(g, 7, 10, mid); put(g, 8, 10, mid); put(g, 7, 11, mid); put(g, 8, 11, mid); }
  },
  // 披风：从肩后垂下，两侧外摆；t = 镶边色
  cape(g, c1, c2, t, leftOnly) {
    const rows = ['', '', '', '', '', '', '', '', '',
      '...1........1...',
      '..12........21..',
      '..12........21..',
      '.112........211.',
      '.112........211.',
      '.122........221.',
      '.ttt........ttt.'];
    paint(g, leftOnly ? rows.map(r => r.slice(0, 8)) : rows, { 1: c1, 2: c2, t: t || c2 });
  },
  // 长袍下摆
  skirt(g, c1, c2) { hline(g, 5, 10, 13, c1); hline(g, 4, 11, 14, c2); put(g, 4, 13, 'k'); put(g, 11, 13, 'k'); put(g, 3, 14, 'k'); put(g, 12, 14, 'k'); hline(g, 4, 11, 15, 'k'); },
  // 整件长袍（身 + 下摆）
  robe(g, c1, c2) { fill(g, 5, 9, 10, 12, c1, 'pqg'); GEAR.skirt(g, c1, c2); },
};

// ---------- 武器（右手在 (11,10)，武器在 x=12–15） ----------
// 剑：x=13/14 两列刃，top = 剑尖行；big = 大护手
function blade(g, top, L, D, guard, big) {
  put(g, 13, top, L); vline(g, 13, top + 1, 9, L); vline(g, 14, top + 1, 9, D);
  hline(g, 12, 14, 10, guard); put(g, 13, 11, 'w');
  if (big) { put(g, 15, 10, guard); put(g, 15, 9, guard); put(g, 13, 12, guard); }
}
// 武士刀：细长单刃，红柄
function katana(g, top, L, D, tsuba) {
  vline(g, 13, top, 9, L); vline(g, 14, top + 2, 9, D); hline(g, 12, 14, 10, tsuba); put(g, 13, 11, 'r'); put(g, 13, 12, 'r');
}
// 斧：0 手斧 1 战斧 2 双刃斧 3 巨斧（柄在 x=13）
function axe(g, kind, L, D, shaft) {
  const heads = [
    ['', '', '', '..............LL', '..............LL', '..............LD', '..............D.'],
    ['', '..............L.', '..............LL', '..............LL', '..............LL', '..............LD', '..............DD', '..............D.'],
    ['...........L...L', '...........LL.LL', '...........LL.LL', '...........DL.LD', '...........D...D'],
    ['...........L...L', '...........LL.LL', '...........LL.LL', '...........LL.LL', '...........DL.LL', '...........D..LD', '..............DD', '...............D'],
  ];
  paint(g, heads[kind], { L, D });
  vline(g, 13, [3, 1, 0, 0][kind], 13, shaft || 'w');
  if (kind >= 2) put(g, 13, 0, L);
}
// 弓：在左手，x=1 弓身、x=3 弓弦
function bow(g, top, bot, wood, tip) {
  vline(g, 1, top + 1, bot - 1, wood); put(g, 2, top, tip || wood); put(g, 2, bot, tip || wood); vline(g, 3, top + 1, bot - 1, 'W');
}
function staff(g, top, wood) { vline(g, 13, top, 14, wood || 'w'); }
function sparkle(g, pts, c) { for (const [x, y] of pts) put(g, x, y, c || 'L'); }

// ---------- 坐骑（Q 版胖马，面朝左） ----------
const MOUNT_BODY = [
  '', '', '', '', '', '', '', '', '', '', '',
  '..k1111111111kM.',
  '..k1111111111kMM',
  '..k2211111122k.M',
  '..k11k....k11k..',
  '..kFFk....kFFk..',
];
const MOUNT_HEAD = [
  '', '', '', '', '', '', '',
  '.k..............',
  'k1k.............',
  'k11Mk...........',
  'k1k1Mk..........',
  'k1111Mk.........',
  'kk211Mk.........',
];
// 把骑手（BODY 坐标，只到腰）放上坐骑，腿垂在马身侧
function seat(g, r, boot) {
  for (let y = 0; y <= 10; y++) for (let x = 0; x < 16; x++) if (r[y][x] !== '.') g[y][x] = r[y][x];
  paint(g, ['', '', '', '', '', '', '', '', '', '', '', '.....kpk', '.....kqk', '.....k' + boot + 'k']);
}

Object.assign(SPRITE_DEFS, {
  // 剑士系：布衣铁剑 → 头带钢护肩长剑 → 银盔银甲披风 → 金盔金甲红缨 → 白缨金甲 + 光剑
  swordsman(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    if (t === 0) { GEAR.belt(g, 'w'); blade(g, 4, 'y', 'Y', 'w'); return g; }
    if (t === 1) {
      GEAR.band(g, 'p', true); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w');
      blade(g, 2, 'm', 'n', 'n'); return g;
    }
    if (t === 2) {
      GEAR.cape(g, 'p', 'q'); GEAR.helm(g, 'm', 'i'); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'W', 'i');
      GEAR.belt(g, 'w', 'm'); GEAR.boots(g, 'i'); blade(g, 1, 'v', 'm', 'i'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'p', 'q', 'g'); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'r'); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true);
      GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a'); blade(g, 0, 'v', 'm', 'g', true); return g;
    }
    GEAR.cape(g, 'p', 'q', 'g'); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'W'); put(g, 7, 4, 'c'); put(g, 8, 4, 'c');
    GEAR.plate(g, 'g', 'a', 'W'); put(g, 7, 10, 'c'); put(g, 8, 10, 'c'); GEAR.pads(g, 'W', 'j', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
    blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[15, 1], [15, 5], [12, 0]]); return g;
  },

  // 孟祈（作家系）：红围巾贯穿全部 7 阶
  writer(t) {
    t = tierOf(t, 7); const g = grid(BODY);
    const coat = () => { for (let y = 10; y <= 12; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } };
    const scarf = long => {
      hline(g, 4, 11, 9, 'r'); put(g, 3, 10, 'r');
      if (long) { put(g, 3, 9, 'r'); put(g, 2, 10, 'r'); put(g, 2, 11, 'R'); put(g, 1, 11, 'r'); put(g, 1, 12, 'R'); }
    };
    if (t === 0) { coat(); GEAR.belt(g, 'w'); scarf(false); blade(g, 4, 'b', 'B', 'f'); return g; }
    if (t === 1) { GEAR.cape(g, 'f', 'F'); coat(); GEAR.belt(g, 'w', 'y'); GEAR.boots(g, 'w'); scarf(true); blade(g, 2, 'm', 'n', 'n'); return g; }
    if (t === 2) {
      GEAR.cape(g, 'f', 'F'); coat(); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); GEAR.band(g, 'W');
      scarf(true); blade(g, 1, 'v', 'm', 'g'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'W', 'j'); GEAR.plate(g, 'm', 'i', 'W'); GEAR.pads(g, 'W', 'i'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'i');
      GEAR.circlet(g, 'm', 'c'); scarf(true); blade(g, 0, 'v', 'm', 'g'); return g;
    }
    if (t === 4) {
      GEAR.cape(g, 'p', 'q', 'g'); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a');
      GEAR.circlet(g, 'g', 'c'); scarf(true); blade(g, 0, 'v', 'm', 'g', true); return g;
    }
    if (t === 5) {
      GEAR.cape(g, 'D', 'd', 'g'); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
      GEAR.crown(g, 'g', 'c'); scarf(true); blade(g, 0, 'v', 'm', 'g', true); return g;
    }
    // 剑圣：白金长袍 + 光剑 + 金冠
    GEAR.cape(g, 'W', 'j', 'g'); fill(g, 5, 9, 10, 14, 'W', 'pqg'); put(g, 5, 10, 'j'); put(g, 10, 10, 'j');
    hline(g, 5, 10, 12, 'p'); put(g, 7, 12, 'g'); put(g, 8, 12, 'g'); hline(g, 5, 6, 14, 'g'); hline(g, 9, 10, 14, 'g');
    GEAR.pads(g, 'g', 'a', true); GEAR.crown(g, 'g', 'c'); scarf(true);
    blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[15, 0], [15, 4], [12, 1], [0, 2]]); return g;
  },

  // 骑兵系：棕马 → 披甲战马 → 白色战马 → 天马 → 飞龙（骑手保留大头）
  knight(t) {
    t = tierOf(t, 5); const g = grid([]);
    const H = { 1: 'u', 2: 'f', M: 'F', F: 'F' };
    if (t >= 2) Object.assign(H, { 1: 'W', 2: 'j', M: 'b', F: 'Y' });
    if (t === 3) paint(g, ['W..............j', 'WW............jW', 'jWW...........jW', 'jjW...........jW', '.jj............j']); // 天马双翼
    if (t === 4) paint(g, ['kk............kk', 'kHk..........kHk', 'kHGk.........kGk', 'kHHk..........k.', '.kk.............']); // 膜翼
    if (t <= 3) paint(g, MOUNT_BODY, H);
    else paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..kGGGGGGGGGGkk.', '..kGGGGGGGGGGGGk', '..kGbbbbbbbbkkGk', '..kGGk....kGGk.k', '..kbbk....kbbk..']);
    if (t === 1) paint(g, ['', '', '', '', '', '', '', '', '', '', '', '...pppppppppp', '...pppppppppp', '...qqqqqqqqqq', '...g.g....g.g']);
    if (t === 2 || t === 3) paint(g, ['', '', '', '', '', '', '', '', '', '', '', '.....pppppp', '.....pppppp', '.....gggggg']);
    // 骑手
    const r = grid(BODY);
    if (t === 0) { GEAR.helm(r, 'y', 'Y'); }
    if (t === 1) { GEAR.helm(r, 'm', 'n'); GEAR.plate(r, 'm', 'n', 'p'); GEAR.pads(r, 'm', 'n'); }
    if (t === 2) { GEAR.helm(r, 'W', 'i'); GEAR.plume(r, 'r'); GEAR.plate(r, 'm', 'i', 'p'); GEAR.pads(r, 'W', 'i'); }
    if (t === 3) { GEAR.helm(r, 'g', 'a'); GEAR.plume(r, 'p'); GEAR.plate(r, 'g', 'a', 'p'); GEAR.pads(r, 'g', 'a'); }
    if (t === 4) { GEAR.helm(r, 'Y', 'd'); GEAR.plume(r, 'r'); paint(r, ['..g..........g..', '..gg........gg..']); GEAR.plate(r, 'Y', 'd', 'p'); GEAR.pads(r, 'g', 'a'); }
    seat(g, r, t >= 2 ? 'g' : 'w');
    // 坐骑头颈在骑手前方
    if (t <= 3) {
      paint(g, MOUNT_HEAD, H);
      if (t === 1) paint(g, ['', '', '', '', '', '', '', '', '.m', '.mm', '.mk', 'm']);
      if (t >= 2) { put(g, 1, 12, 'g'); put(g, 3, 11, 'g'); put(g, 4, 10, 'g'); }
    } else {
      paint(g, ['', '', '', '', '', '',
        '.k.k............',
        'kbkbk...........',
        'kGGGGk..........',
        'kGeGGGk.........',
        'kGGGGGHk........',
        'kWkWkGHk........',
        '.kkkGGHk........']);
    }
    // 骑枪（右手竖持）：铁矛 → 钢枪 + 阵营小旗 → 银枪 → 金枪
    const tip = ['y', 'm', 'v', 'v', 'v'][t], shaft = t >= 3 ? 'g' : 'w';
    vline(g, 14, 1, 10, shaft); put(g, 14, 0, tip); put(g, 14, 1, tip); put(g, 13, 10, 's');
    if (t >= 1) { put(g, 14, 2, tip); put(g, 15, 2, 'p'); put(g, 15, 3, 'p'); put(g, 15, 4, 'q'); }
    if (t >= 2) { put(g, 13, 1, tip); put(g, 14, 3, 'g'); }
    return g;
  },

  // 战士系：头巾手斧 → 赤膊战斧 → 钢盔双刃斧 → 金盔白披风 → 金盔红冠 + 红披风 + 巨斧
  fighter(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const bandana = () => { hline(g, 3, 12, 3, 'r'); hline(g, 3, 12, 4, 'r'); put(g, 2, 4, 'r'); put(g, 1, 5, 'r'); put(g, 1, 6, 'R'); };
    const vest = () => { for (let y = 9; y <= 11; y++) { put(g, 5, y, 'w'); put(g, 10, y, 'w'); } };
    if (t === 0) { bandana(); vest(); GEAR.belt(g, 'w'); axe(g, 0, 'y', 'Y'); return g; }
    if (t === 1) {
      bandana(); hline(g, 6, 9, 9, 's'); hline(g, 6, 9, 10, 's'); hline(g, 6, 9, 11, 'S'); vest();
      GEAR.pads(g, 'w', 'f', true); put(g, 2, 9, 'b'); put(g, 13, 9, 'b'); put(g, 4, 10, 'W'); put(g, 11, 10, 'W');
      GEAR.belt(g, 'f', 'y'); GEAR.boots(g, 'w'); axe(g, 1, 'm', 'n'); return g;
    }
    if (t === 2) {
      GEAR.helm(g, 'm', 'n'); paint(g, ['.......gg.......', '.......gg.......']); GEAR.plate(g, 'm', 'n', 'p'); GEAR.pads(g, 'm', 'n', true);
      GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'n'); axe(g, 2, 'm', 'n'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'W', 'j', 'g'); GEAR.helm(g, 'g', 'a'); paint(g, ['......WWW.......', '......WWW.......']); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true);
      GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a'); axe(g, 2, 'v', 'm', 'g'); return g;
    }
    GEAR.cape(g, 'r', 'R', 'g'); GEAR.helm(g, 'g', 'a'); paint(g, ['....rrrrrr......', '.....rrrr.......']); put(g, 7, 4, 'c'); put(g, 8, 4, 'c');
    GEAR.plate(g, 'g', 'a', 'r'); put(g, 7, 10, 'c'); put(g, 8, 10, 'c');
    GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g'); axe(g, 3, 'v', 'c', 'g'); sparkle(g, [[10, 0], [15, 9]]); return g;
  },

  // 武士系：发髻和服 → 钵卷 + 胴甲 → 黑兜 + 袖甲 → 锹形金角 + 阵羽织 → 金月前立 + 背旗
  samurai(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const collar = () => { put(g, 6, 9, 'W'); put(g, 9, 9, 'W'); put(g, 7, 10, 'W'); put(g, 8, 10, 'W'); };
    const topknot = () => paint(g, ['......khhk......']);
    if (t === 0) { topknot(); collar(); GEAR.belt(g, 'W'); katana(g, 3, 'm', 'n', 'k'); return g; }
    if (t === 1) {
      topknot(); GEAR.band(g, 'W', true); GEAR.plate(g, 'Y', 'd', 'p'); collar(); GEAR.belt(g, 'W');
      katana(g, 2, 'v', 'm', 'k'); return g;
    }
    const flaps = c => { put(g, 1, 5, c); put(g, 2, 5, c); put(g, 13, 5, c); put(g, 14, 5, c); put(g, 1, 4, 'k'); put(g, 14, 4, 'k'); };
    if (t === 2) {
      GEAR.helm(g, 'Y', 'd'); flaps('Y'); paint(g, ['', '', '.......gg.......', '.......gg.......']);
      GEAR.plate(g, 'Y', 'd', 'p'); GEAR.pads(g, 'Y', 'p', true); GEAR.belt(g, 'r'); katana(g, 1, 'v', 'm', 'g'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'Y', 'd', 'g'); GEAR.helm(g, 'p', 'q'); flaps('q');
      paint(g, ['...g........g...', '....g......g....', '.....g.cc.g.....']);
      GEAR.plate(g, 'p', 'q', 'g'); hline(g, 5, 10, 10, 'g'); GEAR.pads(g, 'p', 'g', true); GEAR.belt(g, 'r'); katana(g, 0, 'v', 'm', 'g'); return g;
    }
    // 大将军：背旗（阵营色）+ 金色大月前立
    GEAR.cape(g, 'R', 'r', 'g'); GEAR.helm(g, 'g', 'a'); flaps('a');
    paint(g, ['..gg........gg..', '...gggggggggg...', '.......rr.......']);
    paint(g, ['pp..', 'pW..', 'qq..', '.w..', '.w..', '.w..', '.w..']);
    GEAR.plate(g, 'g', 'a', 'p'); hline(g, 5, 10, 10, 'R'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'r', 'g');
    katana(g, 0, 'W', 'c', 'g'); sparkle(g, [[15, 1], [15, 6]]); return g;
  },

  // 弓箭系：皮帽短弓 → 兜帽长弓 + 箭筒 → 羽帽金弓 + 披风 → 宽檐钢盔十字弩 → 羽盔连弩
  archer(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const quiver = () => paint(g, ['', '', '', '', '', '..............W.', '.............W..', '.............kw.', '.............ww.', '.............wf.']);
    if (t === 0) {
      fill(g, 2, 1, 13, 3, 'w', 'h'); hline(g, 2, 13, 4, 'f'); for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); }
      GEAR.belt(g, 'w'); bow(g, 7, 14, 'w'); return g;
    }
    if (t === 1) { quiver(); GEAR.hood(g, 'q'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); bow(g, 5, 15, 'w', 'f'); return g; }
    if (t === 2) {
      GEAR.cape(g, 'q', 'd', null, true); quiver(); GEAR.hood(g, 'p'); hline(g, 3, 12, 4, 'g'); paint(g, ['..........rrr...', '............rr..']);
      put(g, 6, 9, 'w'); put(g, 7, 10, 'w'); put(g, 8, 11, 'w'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); bow(g, 3, 15, 'g', 'W'); return g;
    }
    if (t === 3) {
      fill(g, 2, 1, 13, 4, 'm', 'h'); put(g, 5, 2, 'W'); hline(g, 0, 15, 5, 'm'); put(g, 0, 5, 'n'); put(g, 15, 5, 'n'); hline(g, 1, 14, 6, 'k'); fill(g, 3, 6, 12, 6, 'h', 'k');
      GEAR.plate(g, 'm', 'n', 'p'); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'n');
      paint(g, ['', '', '', '', '', '', '', '', '', '', '..W', '.ww', '.wf']);
      paint(g, ['', '', '', '', '', '', '', '..............n.', '..............m.', '..............m.', '...........wwwwm', '..............m.', '..............m.', '..............n.']);
      for (const [x, y] of [[5, 6], [6, 6], [9, 6], [10, 6]]) put(g, x, y, x === 5 || x === 9 ? 'W' : 'k');
      return g;
    }
    GEAR.cape(g, 'p', 'q', 'g', true); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'r'); GEAR.plate(g, 'm', 'i', 'g'); GEAR.pads(g, 'g', 'a');
    GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a');
    paint(g, ['', '', '', '', '', '',
      '..............g.',
      '...........kkkm.',
      '...........fgfm.',
      '...........fgfmv',
      '..........wwwwwg',
      '..............mv',
      '..............m.',
      '..............m.',
      '..............g.']);
    return g;
  },

  // 牧师系：麻布袍 + 木杖 → 白兜帽 + 十字杖 → 金边圣带 + 圣环杖 → 白主教冠 + 披肩 + 牧杖 → 金主教冠 + 白金袍 + 日轮杖
  priest(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const mitre = (c, mid) => paint(g, ['......kccK......', '.....kcmmck.....', '....kccmmcck....', '....kccmmcck....', '...kggggggggk...'].map(r => r.replace('K', 'k')), { c, m: mid });
    if (t === 0) {
      GEAR.robe(g, 'b', 'B'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.belt(g, 'w');
      staff(g, 3, 'w'); put(g, 13, 2, 'f'); put(g, 12, 3, 'f'); put(g, 14, 3, 'f'); return g;
    }
    if (t === 1) {
      GEAR.hood(g, 'W'); GEAR.robe(g, 'W', 'p'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p');
      staff(g, 4, 'w'); vline(g, 13, 0, 4, 'g'); put(g, 12, 1, 'g'); put(g, 14, 1, 'g'); return g;
    }
    if (t === 2) {
      GEAR.hood(g, 'W'); hline(g, 3, 12, 4, 'g'); GEAR.robe(g, 'W', 'g'); vline(g, 6, 9, 14, 'p'); vline(g, 9, 9, 14, 'p'); put(g, 7, 9, 'g'); put(g, 8, 9, 'g');
      staff(g, 4, 'g'); paint(g, ['............gg..', '...........gccg.', '...........gccg.', '............gg..']); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'p', 'q', 'g'); GEAR.hood(g, 'j'); mitre('W', 'g'); put(g, 7, 2, 'p'); put(g, 8, 2, 'p');
      GEAR.robe(g, 'W', 'p'); vline(g, 6, 9, 14, 'g'); vline(g, 9, 9, 14, 'g'); GEAR.pads(g, 'p', 'q');
      staff(g, 3, 'g'); paint(g, ['............ggg.', '............g.g.', '..............g.']); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); GEAR.hood(g, 'W'); mitre('g', 'W'); put(g, 7, 4, 'c'); put(g, 8, 4, 'c');
    GEAR.robe(g, 'W', 'g'); vline(g, 6, 9, 14, 'p'); vline(g, 9, 9, 14, 'p'); GEAR.pads(g, 'g', 'a');
    staff(g, 4, 'g'); paint(g, ['...........L.L.L', '............ggg.', '...........LgWgL', '............ggg.', '...........L...L']);
    sparkle(g, [[1, 1], [2, 0]]); return g;
  },

  // 咒术师系：兜帽骨杖 → 角兜 + 骨项链 + 紫焰骷髅杖 → 尖领魔兜 + 紫光眼 + 暗紫披风 + 魔焰
  sorcerer(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const skull = () => paint(g, ['', '', '............bb..', '...........bkkb.', '...........bbbb.', '............kk..']);
    if (t === 0) { GEAR.hood(g, 'q'); GEAR.robe(g, 'q', 'd'); hline(g, 5, 10, 12, 'd'); staff(g, 4, 'w'); skull(); return g; }
    if (t === 1) {
      GEAR.hood(g, 'd'); paint(g, ['..b..........b..', '...b........b...']);
      GEAR.robe(g, 'p', 'd'); hline(g, 5, 10, 12, 'D'); hline(g, 5, 10, 9, 'b'); put(g, 7, 10, 'b'); put(g, 8, 10, 'b');
      staff(g, 4, 'F'); skull(); paint(g, ['............AA..', '............AA..']); return g;
    }
    GEAR.cape(g, 'd', 'D', 'A');
    GEAR.hood(g, 'd'); paint(g, ['..b..........b..', '..bb........bb..', '', '', '', '', '.dD..........Dd.', '.dDA........ADd.', '..dD........Dd..']);
    eyes(g, 'A');
    GEAR.robe(g, 'd', 'p'); vline(g, 7, 9, 14, 'p'); vline(g, 8, 9, 14, 'p'); put(g, 7, 10, 'A'); put(g, 8, 10, 'A'); hline(g, 5, 10, 12, 'g');
    staff(g, 4, 'Y'); skull(); put(g, 12, 3, 'A'); put(g, 13, 3, 'A'); paint(g, ['............AP..', '...........AAAA.']); sparkle(g, [[15, 0], [15, 7]], 'A'); return g;
  },

  // 法师系：软帽短杖 → 尖帽红晶杖 → 金带帽 + 蓝晶球杖 → 大檐星帽 + 披风 + 月牙杖 → 金檐帽 + 白金披风 + 光球杖
  mage(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    // 尖帽：抹掉帽外的头顶，让剪影变成三角帽 + 宽帽檐
    const hat = (c, brim, wide) => paint(g, [
      '______kcck______',
      '_____kcccck_____',
      '____kcccccck____',
      '..kkcccccccckk..',
      '..kcccccccccck..',
      wide ? 'bbbbbbbbbbbbbbbb' : '.bbbbbbbbbbbbbb.',
    ], { c, b: brim });
    if (t === 0) {
      fill(g, 2, 1, 13, 3, 'p', 'h'); hline(g, 3, 12, 4, 'q'); paint(g, ['..........kpk...', '...........k....']);
      GEAR.robe(g, 'p', 'q'); hline(g, 5, 10, 12, 'w'); vline(g, 13, 7, 13, 'w'); put(g, 13, 6, 'r'); put(g, 12, 6, 'k'); put(g, 14, 6, 'k'); return g;
    }
    if (t === 1) { hat('p', 'q'); GEAR.robe(g, 'p', 'q'); hline(g, 5, 10, 12, 'q'); staff(g, 4, 'w'); put(g, 13, 3, 'o'); put(g, 12, 3, 'k'); put(g, 14, 3, 'k'); return g; }
    if (t === 2) {
      hat('p', 'q'); hline(g, 4, 11, 4, 'g'); GEAR.robe(g, 'p', 'g'); hline(g, 5, 10, 12, 'g'); staff(g, 4, 'w');
      paint(g, ['', '............g...', '...........gccg.', '...........gCcg.', '............g...']); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'q', 'd', 'g'); hat('p', 'q', true); hline(g, 4, 11, 4, 'g'); put(g, 7, 2, 'g'); put(g, 8, 2, 'g');
      GEAR.robe(g, 'p', 'g'); hline(g, 5, 10, 12, 'g'); staff(g, 4, 'w');
      paint(g, ['............gg..', '...........g..c.', '...........g.cc.', '............gg..']); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); hat('p', 'g', true); hline(g, 4, 11, 4, 'g'); put(g, 6, 3, 'g'); put(g, 9, 2, 'g'); put(g, 7, 1, 'L');
    GEAR.robe(g, 'p', 'g'); hline(g, 5, 10, 12, 'g'); vline(g, 7, 9, 11, 'W'); vline(g, 8, 9, 11, 'W'); staff(g, 5, 'g');
    paint(g, ['............L...', '...........kWWk.', '..........WkWcWk', '..........WkccW.', '...........kggk.', '............g...']); sparkle(g, [[15, 0], [10, 7]]); return g;
  },

  // 鹰族：小褐翼 → 大翼 + 钢甲 + 红冠羽 → 白金巨翼 + 金甲金冠
  hawkman(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    if (t === 1) paint(g, ['', '', 'F..............F', 'fF............Ff', 'ffF..........Fff', 'bffk........kffb', 'bbfk........kfbb', '.bfk........kfb.', '..bk........kb..']);
    if (t === 2) paint(g, ['W..............W', 'WW............WW', 'jWW..........WWj', 'jjW..........Wjj', 'gjjW........Wjjg', '.gjW........Wjg.', '..gj........jg..', '...g........g...']);
    paint(g, [
      '.....kkkkkk.....',
      '...kkffffffkk...',
      '..kffffffffffk..',
      '..kffffffffffk..',
      '..kffffffffffk..',
      '..kfbbbbbbbbfk..',
      '..kfbWkbbWkbfk..',
      '..kbbkkookkbbk..',
      '...kbbbOObbbk...',
    ]);
    if (t === 0) paint(g, ['', '', '', '', '', '', '', '', '', 'kk............kk', 'kfk..........kfk', '.kfk........kfk.', '..kfk......kfk..', '...k........k...']);
    if (t === 1) { paint(g, ['......rrrr......', '.......rr.......']); GEAR.plate(g, 'm', 'n', 'p'); GEAR.belt(g, 'w', 'g'); return g; }
    if (t === 2) { GEAR.crown(g, 'g', 'c'); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a'); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g'); }
    return g;
  },

  // 狼族：狼头布衣 → 刺钉皮肩 + 钢爪 → 白鬃 + 金甲 + 红眼 + 红披风 + 长爪
  wolfman(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    paint(g, [
      '.kk..........kk.',
      '.kPk........kPk.',
      '.kyyyyyyyyyyyyk.',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyWkyyWkyyk..',
      '..kyykkyykkyyk..',
      '..kyyybbbbyyyk..',
      '...kyybkkbyyk...',
    ]);
    put(g, 3, 10, 'y'); put(g, 12, 10, 'y');
    if (t === 0) { GEAR.belt(g, 'w'); return g; }
    const claws = c => paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..ccc......ccc..', '..c.c......c.c..'], { c });
    if (t === 1) {
      GEAR.pads(g, 'w', 'f', true); put(g, 2, 8, 'b'); put(g, 13, 8, 'b');
      GEAR.belt(g, 'f', 'g'); claws('m'); return g;
    }
    for (const [x, y] of [[6, 5], [5, 6], [6, 6], [10, 5], [9, 6], [10, 6]]) put(g, x, y, 'e');
    GEAR.cape(g, 'r', 'R', 'g');
    paint(g, ['', '', '', '', '', '', '', '.W............W.', '.WW..........WW.', '..WjWW....WWjW..', '...WjWWWWWWjW...']);
    GEAR.plate(g, 'g', 'a', 'p'); fill(g, 5, 9, 10, 9, 'W'); GEAR.belt(g, 'a', 'g'); claws('v'); put(g, 2, 13, 'v'); put(g, 13, 13, 'v'); return g;
  },

  // ---------- 敌方 / NPC 人形（同一套 Q 版身体） ----------
  soldier() { const g = grid(BODY); GEAR.helm(g, 'y', 'Y'); GEAR.belt(g, 'w'); blade(g, 3, 'm', 'n', 'w'); return g; },
  captain() {
    const g = grid(BODY); GEAR.cape(g, 'q', 'd'); GEAR.helm(g, 'm', 'n'); GEAR.plume(g, 'r'); GEAR.pads(g, 'm', 'n');
    GEAR.belt(g, 'w', 'g'); blade(g, 1, 'm', 'n', 'g'); return g;
  },
  darkKnight() {
    const g = grid(BODY); GEAR.cape(g, 'd', 'k', 'D'); GEAR.helm(g, 'Y', 'd');
    hline(g, 3, 12, 6, 'Y'); hline(g, 3, 12, 7, 'k'); hline(g, 3, 12, 8, 'Y'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); put(g, 5, 7, 'e'); put(g, 10, 7, 'e');
    paint(g, ['..d..........d..', '..dd........dd..']);
    GEAR.plate(g, 'Y', 'd', 'D'); GEAR.pads(g, 'Y', 'd', true); fill(g, 5, 13, 10, 14, 'Y', 'pq'); GEAR.belt(g, 'd', 'e');
    vline(g, 13, 1, 13, 'F'); put(g, 13, 0, 'm'); put(g, 12, 1, 'm'); put(g, 14, 1, 'm'); put(g, 13, 1, 'm'); put(g, 13, 2, 'm'); return g;
  },
  bandit() {
    const g = grid(BODY); hline(g, 3, 12, 3, 'r'); hline(g, 3, 12, 4, 'r'); put(g, 2, 4, 'r'); put(g, 1, 5, 'r');
    hline(g, 4, 11, 8, 'F'); put(g, 4, 8, 'k'); put(g, 11, 8, 'k'); // 蒙面巾
    for (let y = 9; y <= 11; y++) { put(g, 5, y, 'w'); put(g, 10, y, 'w'); }
    GEAR.belt(g, 'F', 'y'); axe(g, 1, 'm', 'n'); return g;
  },
  banditRider() {
    const g = grid([]), H = { 1: 'u', 2: 'f', M: 'F', F: 'F' };
    paint(g, MOUNT_BODY, H); seat(g, SPRITE_DEFS.bandit(), 'w'); paint(g, MOUNT_HEAD, H);
    fill(g, 11, 12, 15, 15, '.', 'mnw'); return g;
  },
  villager() { const g = recolor(grid(BODY), { p: 'f', q: 'F', g: 'w' }); put(g, 6, 9, 'b'); put(g, 9, 9, 'b'); return g; },
  emperor() {
    const g = grid(BODY); GEAR.cape(g, 'r', 'R', 'g'); GEAR.crown(g, 'g', 'r'); put(g, 4, 0, 'c'); put(g, 11, 0, 'c');
    hline(g, 4, 11, 9, 'W'); put(g, 4, 9, 'k'); put(g, 11, 9, 'k'); GEAR.plate(g, 'g', 'a', 'p'); fill(g, 5, 9, 10, 9, 'W');
    GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g'); blade(g, 1, 'v', 'm', 'g', true); return g;
  },
  king() { return SPRITE_DEFS.emperor(); },
  shaman() {
    const g = grid(BODY); GEAR.hood(g, 'f'); paint(g, ['..b..........b..', '...b........b...']);
    GEAR.robe(g, 'f', 'F'); put(g, 6, 10, 'p'); put(g, 9, 10, 'p'); hline(g, 5, 10, 9, 'b');
    staff(g, 4, 'w'); paint(g, ['', '', '............bb..', '...........bkkb.', '...........bbbb.', '............kk..']); return g;
  },
  spellblade() {
    const g = grid(BODY); GEAR.cape(g, 'q', 'd'); hline(g, 3, 12, 5, 'd'); put(g, 2, 5, 'k'); put(g, 13, 5, 'k'); eyes(g, 'c');
    hline(g, 4, 11, 9, 'd'); put(g, 4, 9, 'k'); put(g, 11, 9, 'k'); GEAR.plate(g, 'Y', 'd', 'p'); GEAR.belt(g, 'd', 'c');
    blade(g, 1, 'c', 'C', 'D'); return g;
  },
  master() {
    const g = grid(BODY); fill(g, 5, 9, 10, 11, 'W', 'pqg'); put(g, 5, 10, 'j'); put(g, 10, 10, 'j'); vline(g, 7, 9, 11, 'j');
    GEAR.belt(g, 'w', 'g'); GEAR.band(g, 'W', true); blade(g, 1, 'v', 'm', 'g'); return g;
  },
  medusa() {
    const g = grid(BODY); fill(g, 2, 0, 13, 6, 'G', 'h');
    paint(g, ['G.kG......Gk.G..', 'kGk........kGkG.', '.k...........kG.', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    put(g, 1, 7, 'G'); put(g, 14, 7, 'G'); put(g, 1, 8, 'H'); put(g, 14, 8, 'H');
    eyes(g, 'e'); GEAR.robe(g, 'G', 'H'); hline(g, 5, 10, 12, 'g'); return g;
  },
  angel() {
    const g = grid(BODY);
    paint(g, ['', '', '', '', '', 'W..............W', 'WW............WW', 'jWW..........WWj', 'jjWW........WWjj', '.jjW........Wjj.', '..jj........jj..', '...j........j...']);
    paint(g, ['....gggggggg....', '...g........g...']);
    GEAR.robe(g, 'W', 'j'); hline(g, 5, 10, 12, 'g'); return g;
  },

  // 龙族：小龙（敌方变色龙也用这一阶）→ 展翼飞龙 → 角 + 吐焰火龙 → 金角巨翼巨火龙
  dragon(t) {
    t = tierOf(t, 4);
    if (t === 0) return grid([
      '................',
      'kGk...kkk...kGk.',
      'kGGk.kGGGk.kGGk.',
      '.kGGkGeGGGkGGk..',
      '..kGGGGGGGGGk...',
      '...kGGGrrGGk....',
      '..kGkGGGGGkGk...',
      '.kGk.kGGGGGkGk..',
      '.kk.kGHHHHGk.k..',
      '....kGHHHHGGk...',
      '...kGGHHHHGGGk..',
      '...kGkGGGGkGGGk.',
      '...kk.kGGk..kGGk',
      '......kk.....kk.',
    ]);
    if (t === 1) return grid([
      'k..............k',
      'Gk....kkkk....kG',
      'HGk..kGGGGk..kGH',
      'HHGk.kGeGeGk.kGHH',
      'HHHGkGGGGGGkGHHH',
      'kHHHGkGrrGkGHHHk',
      '.kHHGGkGGkGGHHk.',
      '..kkGkGbbGkGkk..',
      '....kGbbbbGk....',
      '...kGGbbbbGGk...',
      '...kGkGbbGkGGk..',
      '...kk.kGGk.kGGk.',
      '......kk....kGGk',
      '.............kk.',
    ]);
    if (t === 2) return grid([
      'b.....b..b.....b',
      'Gk...kbkkbk...kG',
      'HGk..kGGGGk..kGH',
      'HHGk.kGeGeGk.kGH',
      'HHHGkGGGGGGkGHHH',
      'kHHHGkGrrGkGHHHk',
      '.kHHGGkoLkGGHHk.',
      '..kkGkGoooGkkk..',
      '....kGboLoGk....',
      '...kGGbborGGk.k.',
      '...kGkGbbGkGGkGk',
      '...kk.kGGk.kGGGk',
      '......kk....kkk.',
    ]);
    return grid([
      'W..g..........g.',
      'HG..gk.kk.kg..GH',
      'HHG.kgkGGkgk.GHH',
      'HHHGkGGGGGGkGHHH',
      'HHHHGGeGGeGGHHHH',
      'kHHHGGGGGGGGHHHk',
      '.kHHGkGrrGkGHHk.',
      '.kkHGGkGGkGGHkk.',
      '..kkGkGooGkGkk..',
      '...kGGoLLoGGk...',
      '..kGGGbLLbGGGk..',
      '..kGkGbbbbGkGGk.',
      '..kGkGGbbGGkGGGk',
      '..kk.kGkkGk.kGGk',
      '.....kk..kk..kk.',
    ]);
  },
});
// ---------- 转职分支 B 路线：'<key>_b'，t 为绝对阶（从分支阶 at 起） ----------
const tierB = (t, at, last) => Math.max(at, Math.min(last, t | 0));
Object.assign(SPRITE_DEFS, {
  // 剑士 B：魔法剑士（法师披肩 + 蓝色符文剑）→ 魔导剑士（奥术紫甲 + 符文火花）→ 圣魔剑士（白紫圣魔甲 + 双色光剑）
  swordsman_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    if (t === 2) {
      GEAR.cape(g, 'D', 'd'); GEAR.circlet(g, 'm', 'c'); GEAR.pads(g, 'm', 'n'); put(g, 6, 9, 'W'); put(g, 9, 9, 'W');
      GEAR.belt(g, 'w', 'c'); GEAR.boots(g, 'w'); blade(g, 1, 'c', 'C', 'i'); put(g, 13, 4, 'W'); put(g, 13, 7, 'W'); sparkle(g, [[15, 2]], 'c'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'd', 'D', 'A'); GEAR.circlet(g, 'g', 'A'); GEAR.plate(g, 'D', 'd', 'c'); GEAR.pads(g, 'D', 'A', true);
      GEAR.belt(g, 'd', 'A'); GEAR.boots(g, 'D'); blade(g, 0, 'c', 'C', 'g', true); put(g, 13, 3, 'A'); put(g, 13, 6, 'A');
      sparkle(g, [[15, 1], [12, 0], [0, 7], [15, 6]], 'A'); return g;
    }
    GEAR.cape(g, 'W', 'D', 'A'); GEAR.crown(g, 'W', 'A'); GEAR.plate(g, 'W', 'j', 'A'); put(g, 5, 10, 'D'); put(g, 10, 10, 'D');
    GEAR.pads(g, 'W', 'D', true); GEAR.belt(g, 'D', 'A'); GEAR.boots(g, 'W');
    put(g, 13, 0, 'W'); vline(g, 13, 1, 9, 'W'); vline(g, 14, 1, 9, 'A'); hline(g, 12, 15, 10, 'g'); put(g, 15, 9, 'g'); put(g, 13, 11, 'w'); put(g, 13, 12, 'g');
    sparkle(g, [[15, 1], [12, 0], [15, 5]], 'L'); sparkle(g, [[0, 6], [11, 0]], 'A'); return g;
  },

  // 骑兵 B（始终骑马、无翼）：重装骑士（钢马铠 + 塔盾）→ 圣骑士（白金马衣 + 十字盾）→ 皇家骑士（王冠盔 + 王家马衣 + 枪旗）
  knight_b(t) {
    t = tierB(t, 2, 4); const g = grid([]);
    const H = t === 2 ? { 1: 'u', 2: 'f', M: 'F', F: 'F' } : { 1: 'W', 2: 'j', M: 'g', F: 'a' };
    paint(g, MOUNT_BODY, H);
    if (t === 2) paint(g, ['', '', '', '', '', '', '', '', '', '', '', '...mmmmmmmmmm', '...mmmmmmmmmm', '...nnnnnnnnnn', '...k.k....k.k']);
    if (t === 3) paint(g, ['', '', '', '', '', '', '', '', '', '', '', '...WWWWWWWWWW', '...WWWWpWWWWW', '...gggggggggg', '...W.W....W.W']);
    if (t === 4) paint(g, ['', '', '', '', '', '', '', '', '', '', '', '...pppppppppp', '...ppgppppgpp', '...gggggggggg', '...p.p....p.p']);
    const r = grid(BODY);
    if (t === 2) { GEAR.helm(r, 'n', 'Y'); hline(r, 3, 12, 5, 'Y'); GEAR.plate(r, 'n', 'Y', 'p'); GEAR.pads(r, 'n', 'Y', true); }
    if (t === 3) { GEAR.helm(r, 'W', 'g'); paint(r, ['.......gg.......', '.......gg.......']); GEAR.plate(r, 'W', 'j', 'g'); GEAR.pads(r, 'g', 'a', true); }
    if (t === 4) { GEAR.helm(r, 'g', 'a'); GEAR.crown(r, 'g', 'c'); GEAR.plate(r, 'g', 'a', 'p'); GEAR.pads(r, 'p', 'g', true); }
    seat(g, r, t === 2 ? 'Y' : 'g');
    paint(g, MOUNT_HEAD, H);
    if (t === 2) paint(g, ['', '', '', '', '', '', '', '', '.m', '.mm', '.mk', 'mm']);
    else { put(g, 1, 12, 'g'); put(g, 3, 11, 'g'); put(g, 4, 10, 'g'); paint(g, ['', '', '', '', '', '', '', '', '.g', '.g']); }
    // 盾：塔盾 / 十字盾 / 王家盾（挡在骑手胸前，不遮马头）
    const shield = {
      2: ['kkkk', 'kmmk', 'kmpk', 'kmpk', 'kmmk', 'knnk', '.kk.'],
      3: ['kkkk', 'kWgk', 'kggk', 'kWgk', 'kWgk', 'kjjk', '.kk.'],
      4: ['kkkk', 'kggk', 'kgcg', 'kppk', 'kppk', 'kggk', '.kk.'],
    }[t];
    shield.forEach((row, y) => row.split('').forEach((c, x) => { if (c !== '.') put(g, 6 + x, 9 + y, c); }));
    // 骑枪
    const tip = t === 2 ? 'm' : 'v', shaft = t === 2 ? 'Y' : 'g';
    vline(g, 14, 1, 10, shaft); put(g, 14, 0, tip); put(g, 14, 1, tip); put(g, 14, 2, tip); put(g, 13, 1, tip); put(g, 13, 10, 's');
    if (t === 4) paint(g, ['', '', '', '...............p', '...............g', '...............p', '...............q']);
    else if (t === 3) { put(g, 15, 3, 'W'); put(g, 15, 4, 'g'); }
    return g;
  },

  // 战士 B：狂战士（赤膊战纹 + 乱发 + 巨型砍刀）→ 斗神（兽皮披肩 + 角骨盔 + 双斧）→ 破坏神（红黑魔甲 + 火焰巨斧 + 红色气焰）
  fighter_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    const bare = () => { hline(g, 5, 10, 9, 's'); hline(g, 5, 10, 10, 's'); hline(g, 5, 10, 11, 'S'); put(g, 6, 10, 'r'); put(g, 9, 10, 'r'); };
    if (t === 2) {
      paint(g, ['...h..h..h..h...', '.h............h.', '', '.h............h.']); put(g, 4, 8, 'r'); put(g, 11, 8, 'r'); put(g, 4, 7, 'r'); put(g, 11, 7, 'r');
      bare(); GEAR.belt(g, 'F', 'y'); GEAR.boots(g, 'F'); put(g, 4, 10, 'W'); put(g, 11, 10, 'W');
      paint(g, ['', '.............mm.', '............mmmn', '............mmmn', '............mmmn', '............mmnn', '............mnn.', '.............w..', '.............w..', '.............w..', '.............w..']);
      return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'f', 'F', 'b'); fill(g, 2, 1, 13, 4, 'b', 'h'); put(g, 5, 3, 'k'); put(g, 10, 3, 'k');
      paint(g, ['.b............b.', 'bb............bb', '.bb..........bb.']);
      bare(); paint(g, ['', '', '', '', '', '', '', '', '', '.bbBbb....bbBbb.', '..bb........bb..']);
      GEAR.belt(g, 'F', 'g'); GEAR.boots(g, 'f'); axe(g, 1, 'm', 'n');
      paint(g, ['', '', '', '', '', '', 'L...', 'LL..', 'LL..', 'LD..', 'D.w.', '..w.', '..w.', '..w.'], { L: 'm', D: 'n' }); return g;
    }
    GEAR.cape(g, 'R', 'd', 'e'); GEAR.helm(g, 'd', 'R'); paint(g, ['.r............r.', 'rr............rr', '.rr..........rr.']); eyes(g, 'e');
    GEAR.plate(g, 'R', 'd', 'e'); GEAR.pads(g, 'd', 'R', true); put(g, 2, 8, 'W'); put(g, 13, 8, 'W'); fill(g, 5, 13, 10, 14, 'd', 'pq'); GEAR.belt(g, 'd', 'e');
    axe(g, 3, 'o', 'r', 'd'); sparkle(g, [[12, 0], [15, 8], [14, 0]], 'L'); sparkle(g, [[0, 9], [0, 13], [15, 12], [1, 2]], 'e'); return g;
  },

  // 武士 B：忍者（头巾 + 面罩 + 忍刀 + 手里剑）→ 上忍（长围巾 + 护臂）→ 影忍（紫黑影装 + 发光眼 + 超长围巾 + 双刃）
  samurai_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    const hoodC = t === 4 ? 'd' : 'Y';
    GEAR.hood(g, hoodC); hline(g, 3, 12, 4, 'p'); hline(g, 3, 12, 8, hoodC); put(g, 2, 8, 'k'); put(g, 13, 8, 'k');
    fill(g, 4, 9, 11, 14, t === 4 ? 'd' : 'Y', 'pqg'); put(g, 6, 9, 'k'); put(g, 9, 9, 'k'); GEAR.belt(g, 'p');
    const shuriken = (x, y) => { for (const [dx, dy] of [[1, 0], [0, 1], [2, 1], [1, 2]]) put(g, x + dx, y + dy, 'm'); put(g, x + 1, y + 1, 'k'); };
    if (t === 2) { katana(g, 3, 'm', 'n', 'k'); shuriken(0, 10); return g; }
    if (t === 3) {
      paint(g, ['', '', '', '', '', '', '', '', '', '...pp', '..ppq', '.pq', 'pq', 'q']); put(g, 3, 10, 'm'); put(g, 12, 10, 'm'); put(g, 4, 11, 'm'); put(g, 11, 11, 'm');
      katana(g, 1, 'v', 'm', 'k'); shuriken(0, 4); return g;
    }
    eyes(g, 'A'); put(g, 5, 6, 'c'); put(g, 9, 6, 'c');
    paint(g, ['', '', '', '', '', '', '', '', '', '...pp', '..ppq', '.ppq', 'ppq', 'pq', 'q.']); paint(g, ['', '', '', 'p', 'pq', '.q']);
    put(g, 3, 10, 'D'); put(g, 12, 10, 'D');
    katana(g, 0, 'v', 'A', 'k'); vline(g, 1, 6, 11, 'v'); vline(g, 2, 8, 11, 'A'); hline(g, 0, 2, 12, 'k'); put(g, 1, 13, 'r');
    sparkle(g, [[15, 2], [12, 0], [15, 7]], 'A'); return g;
  },

  // 弓箭 B：游侠（绿色兜帽斗篷 + 长弓）→ 魔弓手（发光弦奥术弓 + 法师披肩 + 符文箭）→ 天弓使（白金 + 羽翼头环 + 光之弓）
  archer_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    const bowS = (top, bot, wood, str, tip) => { vline(g, 1, top + 1, bot - 1, wood); put(g, 2, top, tip); put(g, 2, bot, tip); vline(g, 3, top + 1, bot - 1, str); };
    if (t === 2) {
      GEAR.cape(g, 'G', 'H'); GEAR.hood(g, 'G'); put(g, 7, 0, 'H'); put(g, 8, 0, 'H');
      paint(g, ['', '', '', '', '', '..............W.', '.............W..', '.............kw.', '.............ww.', '.............wf.']);
      GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'F'); bowS(2, 15, 'w', 'W', 'f'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'd', 'D', 'A'); GEAR.hood(g, 'D'); GEAR.circlet(g, 'D', 'A'); put(g, 6, 9, 'A'); put(g, 9, 9, 'A');
      GEAR.belt(g, 'd', 'A'); GEAR.boots(g, 'D'); bowS(1, 15, 'D', 'A', 'A');
      paint(g, ['', '', '', '', '', '', '', '', '', '...........AAAc', '']); sparkle(g, [[15, 3], [13, 6]], 'A'); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); GEAR.circlet(g, 'g', 'c'); paint(g, ['', 'W..............W', 'WW............WW', '.WW..........WW.']);
    GEAR.plate(g, 'W', 'j', 'g'); GEAR.pads(g, 'g', 'a'); GEAR.belt(g, 'g', 'c'); GEAR.boots(g, 'g'); bowS(0, 15, 'L', 'W', 'g');
    paint(g, ['', '', '', '', '', '', '', '', '', '...........LLLW']); sparkle(g, [[15, 3], [14, 6], [15, 12]], 'L'); return g;
  },

  // 牧师 B：武僧（橙黄道服 + 念珠 + 缠手）→ 圣拳士（白道服 + 金腰带 + 金拳套）→ 拳圣（金色气场 + 圣光拳 + 宗师长袍）
  priest_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    const beads = () => { for (const x of [4, 6, 9, 11]) put(g, x, 9, 'F'); put(g, 7, 9, 'w'); put(g, 8, 9, 'w'); };
    if (t === 2) {
      paint(g, ['......khhk......']); fill(g, 4, 9, 11, 12, 'o', 'pq'); put(g, 5, 11, 'O'); put(g, 10, 11, 'O'); beads();
      GEAR.belt(g, 'p'); put(g, 3, 10, 'W'); put(g, 4, 10, 'W'); put(g, 11, 10, 'W'); put(g, 12, 10, 'W'); return g;
    }
    if (t === 3) {
      GEAR.band(g, 'p', true); fill(g, 4, 9, 11, 12, 'W', 'pq'); put(g, 5, 11, 'j'); put(g, 10, 11, 'j'); beads(); GEAR.belt(g, 'g', 'g'); hline(g, 5, 6, 13, 'g');
      paint(g, ['', '', '', '', '', '', '', '', '', '', '..ggk......kgg..', '..gak......kag..']); return g;
    }
    GEAR.cape(g, 'W', 'g', 'g'); GEAR.circlet(g, 'g', 'c'); paint(g, ['......khhk......']);
    fill(g, 4, 9, 11, 12, 'W', 'pq'); GEAR.skirt(g, 'W', 'g'); vline(g, 7, 9, 14, 'p'); vline(g, 8, 9, 14, 'p'); beads(); GEAR.belt(g, 'g', 'c');
    paint(g, ['', '', '', '', '', '', '', '', '', '.L............L.', 'LWWk........kWWL', '.LL..........LL.']);
    sparkle(g, [[0, 3], [15, 3], [1, 0], [14, 0], [0, 14], [15, 14]], 'L'); return g;
  },

  // 法师 B（时空系）：时空术士（青银长袍 + 沙漏杖 + 钟面头环）→ 时空法师（齿轮纹斗篷 + 浮空沙漏）→ 时空贤者（星空长袍 + 钟针光环）
  mage_b(t) {
    t = tierB(t, 2, 4); const g = grid(BODY);
    const glass = (x, y, frame) => { ['fff', 'kck', '.b.', 'kbk', 'fff'].forEach((r, dy) => r.split('').forEach((c, dx) => { if (c !== '.') put(g, x + dx, y + dy, c === 'f' ? frame : c); })); };
    if (t === 2) {
      GEAR.circlet(g, 'm', 'W'); put(g, 8, 4, 'k'); GEAR.robe(g, 'T', 't'); hline(g, 4, 11, 14, 'm'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.belt(g, 'm', 'W');
      staff(g, 5, 'm'); glass(12, 0, 'm'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 't', 'T', 'g'); GEAR.circlet(g, 'g', 'W'); put(g, 8, 4, 'k'); GEAR.robe(g, 'T', 'g'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p');
      put(g, 2, 12, 'g'); put(g, 13, 12, 'g'); put(g, 5, 13, 'g'); put(g, 10, 13, 'g'); GEAR.belt(g, 'g', 'W');
      staff(g, 5, 'g'); glass(12, 0, 'g'); glass(0, 1, 'g'); sparkle(g, [[1, 7]], 'c'); return g;
    }
    GEAR.cape(g, 'd', 'D', 'g'); paint(g, ['..g..gLLg..g....', '.g............g.']); GEAR.circlet(g, 'g', 'W'); put(g, 8, 4, 'k');
    GEAR.robe(g, 'd', 'D'); for (const [x, y] of [[5, 10], [9, 11], [6, 13], [10, 14], [2, 11], [13, 13], [1, 14]]) put(g, x, y, 'W'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
    GEAR.belt(g, 'g', 'c'); staff(g, 5, 'g'); glass(12, 0, 'g'); put(g, 13, 2, 'L'); glass(0, 2, 'L'); sparkle(g, [[15, 6], [0, 8]], 'c'); return g;
  },

  // 咒术师 B：召唤士（符文长袍 + 水晶杖 + 精灵光团）→ 召唤王（王冠 + 大魔导书 + 环绕精灵球）
  sorcerer_b(t) {
    t = tierB(t, 1, 2); const g = grid(BODY);
    const crystal = () => paint(g, ['............c...', '...........cWc..', '...........cCc..', '............c...']);
    if (t === 1) {
      GEAR.circlet(g, 'c', 'C'); GEAR.robe(g, 'p', 'q'); put(g, 6, 10, 'c'); put(g, 9, 11, 'c'); put(g, 6, 13, 'c'); put(g, 9, 13, 'c'); GEAR.belt(g, 'c');
      staff(g, 4, 'w'); crystal(); paint(g, ['', '', '.c', 'cWc', '.c']); return g;
    }
    GEAR.cape(g, 'D', 'd', 'g'); GEAR.crown(g, 'g', 'c'); GEAR.robe(g, 'p', 'g'); put(g, 6, 10, 'c'); put(g, 9, 11, 'c'); GEAR.belt(g, 'g', 'c');
    staff(g, 4, 'g'); crystal(); put(g, 11, 2, 'g'); put(g, 15, 2, 'g');
    paint(g, ['', '', '', '', '', '', '', '', '', 'kkkk', 'kRgR', 'kRWR', 'kRgR', 'kkkk']);
    paint(g, ['', '', '.o', 'oLo', '.o', '', '', '', '...............', '', '', '', '', '', 'G']); put(g, 15, 8, 'G'); put(g, 14, 15, 'c'); put(g, 0, 15, 'G'); return g;
  },

  // 鹰族 B：风鹰术士（青羽 + 风杖）→ 风暴之翼（闪电风暴巨翼）
  hawkman_b(t) {
    t = tierB(t, 1, 2); const g = grid(BODY);
    if (t === 1) paint(g, ['', '', '', '', '', '', '', '', '', 'kk............kk', 'kTk..........kTk', 'kTTk........kTTk', '.ktTk......kTtk.', '..kck......kck..']);
    else paint(g, ['', '', '', '', 'k..............k', 'Tk............kT', 'TTk..........kTT', 'tLTk........kTLt', 'TtLTk......kTLtT', 'TTtLk......kLtTT', 'cTLTk......kTLTc', 'ccLtk......ktLcc', '.cLck......kcLc.', '..ck........kc..', '...k........k...']);
    paint(g, [
      '.....kkkkkk.....',
      '...kkTTTTTTkk...',
      '..kTTTTTTTTTTk..',
      '..kTTTTTTTTTTk..',
      '..kTTTTTTTTTTk..',
      '..kTbbbbbbbbTk..',
      '..kTbWkbbWkbTk..',
      '..kbbkkookkbbk..',
      '...kbbbOObbbk...',
    ]);
    GEAR.robe(g, 'p', 't'); GEAR.belt(g, 'T', 'c'); staff(g, 4, 'w'); paint(g, ['', '', '.............c..', '............cGc.', '.............c..']);
    if (t === 2) { paint(g, ['......cccc......', '.......cc.......']); hline(g, 4, 11, 14, 'c'); put(g, 12, 3, 'L'); put(g, 14, 3, 'L'); sparkle(g, [[15, 7], [0, 9]], 'L'); }
    return g;
  },

  // 狼族 B：月影狼（银蓝毛 + 新月纹）→ 月神狼（白色发光毛 + 月环）
  wolfman_b(t) {
    t = tierB(t, 1, 2); const g = grid(BODY);
    const fur = t === 1 ? 'i' : 'W', fur2 = t === 1 ? 'C' : 'j';
    if (t === 2) paint(g, ['..L..........L..', '.L............L.', 'L..............L', 'L..............L', '.L............L.']);
    paint(g, [
      '.kk..........kk.',
      '.kPk........kPk.',
      '.kyyyyyyyyyyyyk.',
      '..kyyyyyyyyyyk..',
      '..kyyyyyyyyyyk..',
      '..kyyWkyyWkyyk..',
      '..kyykkyykkyyk..',
      '..kyyybbbbyyyk..',
      '...kyybkkbyyk...',
    ], { y: fur, b: t === 1 ? 'j' : 'i' });
    paint(g, ['', '', '.......LL.......', '......L.........', '.......LL.......']); put(g, 3, 10, fur); put(g, 12, 10, fur);
    if (t === 1) { fill(g, 4, 9, 11, 9, fur2, 'pq'); GEAR.belt(g, 'C', 'L'); GEAR.cape(g, 'C', 'q', 'i', true); return g; }
    for (const [x, y] of [[6, 5], [5, 6], [6, 6], [10, 5], [9, 6], [10, 6]]) put(g, x, y, 'c');
    GEAR.cape(g, 'W', 'j', 'L'); GEAR.plate(g, 'm', 'i', 'p'); fill(g, 4, 9, 11, 9, 'W'); GEAR.belt(g, 'i', 'L');
    paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..vvv......vvv..', '..v.v......v.v..']); sparkle(g, [[15, 8], [0, 11]], 'L'); return g;
  },

  // 龙族 B：冰龙（蓝膜翼 + 冰晶背刺 + 寒气）→ 冰晶龙王（冰晶王冠 + 巨翼 + 冰息）；身体仍用 G/H 通道
  dragon_b(t) {
    t = tierB(t, 2, 3);
    if (t === 2) return grid([
      'W..............W',
      'Ck....kWkW....kC',
      'cCk..kGGGGk..kCc',
      'cCCk.kGcGcGk.kCC',
      'ccCCkGGGGGGkCCcc',
      'kccCGkGWWGkGCcck',
      '.kcCGGkGGkGGCck.',
      '..kkGkGbbGkGkk..',
      '...WkGbbbbGkW...',
      '...kGGbbbbGGk...',
      '...kGkGbbGkGGkW.',
      '...kk.kGGk.kGGkc',
      '......kk....kGGk',
      '.............kk.',
    ]);
    return grid([
      'W.cWc......cWc.W',
      'CW..ck.kk.kc..WC',
      'CCW.kcWGGWck.WCC',
      'cCCWkGGGGGGkWCCc',
      'ccCCGGcGGcGGCCcc',
      'kccCGGGGGGGGCcck',
      '.kcCGkGWWGkGCck.',
      '.kkCGGkGGkGGCkk.',
      '..kkGkGccGkGkk..',
      '..WkGGcWWcGGkW..',
      '..kGGGbWWbGGGk..',
      '.WkGkGbbbbGkGGkW',
      '..kGkGGbbGGkGGGk',
      '..kk.kGkkGk.kGGk',
      '.....kk..kk..kk.',
    ]);
  },
});
// ---------- 超时空英雄传说2：新职业（同一套 Q 版身体，t = 绝对阶） ----------
// 女性角色：长发垂到肩下 + 睫毛
function girl(g) {
  paint(g, ['', '', '', '', '.h............h.', '.hh..........hh.', '.hh..........hh.', '.hh..........hh.', '.hhh........hhh.', '..hh........hh..', '..h..........h..']);
  put(g, 4, 6, 'k'); put(g, 11, 6, 'k');
  return g;
}
// 地面坐骑 + 骑手（马身 / 马头调色 H，马衣 cloth 行）
function mounted(g, r, H, cloth, boot) {
  paint(g, MOUNT_BODY, H); if (cloth) paint(g, cloth);
  seat(g, r, boot); paint(g, MOUNT_HEAD, H);
}
Object.assign(SPRITE_DEFS, {
  // 冒险者系（彦清风，蓝披风）：冒险者 → 勇士 → 斗剑士 → 英雄
  adventurer(t) {
    t = tierOf(t, 4); const g = grid(BODY);
    GEAR.cape(g, 'C', 'U', t >= 2 ? 'g' : null, t === 0);
    if (t === 0) {
      for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } GEAR.belt(g, 'w', 'y'); put(g, 4, 12, 'f'); GEAR.boots(g, 'w');
      blade(g, 3, 'm', 'n', 'w'); return g;
    }
    if (t === 1) {
      for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w');
      GEAR.band(g, 'C'); put(g, 3, 10, 'w'); put(g, 12, 10, 'w'); blade(g, 1, 'v', 'm', 'n'); return g;
    }
    if (t === 2) {
      GEAR.plate(g, 'm', 'n', 'p'); GEAR.pads(g, 'm', 'n', true); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'n'); GEAR.band(g, 'C');
      blade(g, 0, 'v', 'm', 'g', true); return g;
    }
    GEAR.circlet(g, 'g', 'c'); GEAR.plate(g, 'm', 'i', 'C'); hline(g, 5, 10, 9, 'g'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
    blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[15, 1], [12, 0], [15, 6]]); return g;
  },
  // 冒险者 B（龙骑之道）：圣骑士（白马 + 蓝金马衣）→ 龙领主（骑赤龙）
  adventurer_b(t) {
    t = tierB(t, 2, 3); const g = grid([]);
    const r = grid(BODY);
    if (t === 2) {
      GEAR.plate(r, 'W', 'j', 'C'); GEAR.pads(r, 'g', 'a'); GEAR.circlet(r, 'g', 'c');
      paint(g, ['', '', '', '', '', '', '', '', '', 'U', 'CU', 'CU', 'CU']);
      mounted(g, r, { 1: 'W', 2: 'j', M: 'g', F: 'a' }, ['', '', '', '', '', '', '', '', '', '', '', '...CCCCCCCCCC', '...CCCgCCCCCC', '...gggggggggg', '...C.C....C.C'], 'g');
      put(g, 1, 12, 'g'); put(g, 3, 11, 'g');
      vline(g, 14, 1, 10, 'g'); put(g, 14, 0, 'v'); put(g, 14, 1, 'v'); put(g, 13, 1, 'v'); put(g, 15, 2, 'C'); put(g, 15, 3, 'C'); put(g, 15, 4, 'U'); put(g, 13, 10, 's');
      return g;
    }
    // 龙领主：赤龙巨翼 + 金角，骑手金甲蓝披风
    paint(g, ['kk............kk', 'kRk..........kRk', 'kRrk........krRk', 'kRRrk......krRRk', '.kRRk......kRRk.', '..kk........kk..']);
    paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..krrrrrrrrrrkk.', '..krrrrrrrrrrrrk', '..kroooooooorkrk', '..krrk....krrk.k', '..kgok....kgok..']);
    GEAR.plate(r, 'g', 'a', 'C'); GEAR.pads(r, 'g', 'a', true); GEAR.crown(r, 'g', 'c');
    seat(g, r, 'g');
    paint(g, ['', '', '', '', '', '',
      'g.g.............',
      'kgkgk...........',
      'krrrrk..........',
      'krLrrrk.........',
      'krrrrrRk........',
      'kWkWkrRk........',
      '.kkkrrRk........']);
    vline(g, 14, 1, 10, 'g'); put(g, 14, 0, 'W'); put(g, 14, 1, 'v'); put(g, 13, 1, 'v'); put(g, 15, 1, 'v'); put(g, 13, 10, 's'); sparkle(g, [[15, 4], [0, 14]], 'o');
    return g;
  },

  // 施法者系（剑 + 杖）：施法者 → 领主（貂皮领 + 金头环 + 王家披风）→ 圣者（白金袍 + 光环）
  lordmage(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const hipSword = (L, guard) => { put(g, 3, 11, guard); put(g, 2, 12, L); put(g, 1, 13, L); put(g, 0, 14, L); put(g, 4, 10, 's'); };
    if (t === 0) {
      GEAR.cape(g, 'C', 'U', null, true); GEAR.robe(g, 'p', 'q'); GEAR.belt(g, 'w', 'y'); hipSword('m', 'n');
      staff(g, 4, 'w'); paint(g, ['', '', '.............k..', '............kok.', '.............k..']); return g;
    }
    if (t === 1) {
      GEAR.cape(g, 'R', 'r', 'g'); GEAR.circlet(g, 'g', 'r'); GEAR.robe(g, 'p', 'g'); hline(g, 4, 11, 9, 'W'); put(g, 6, 9, 'k'); put(g, 9, 9, 'k');
      GEAR.belt(g, 'g', 'r'); hipSword('v', 'g'); staff(g, 4, 'g'); paint(g, ['', '............gg..', '...........gccg.', '...........gccg.', '............gg..']); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); paint(g, ['...LLLLLLLLLL...']); GEAR.circlet(g, 'g', 'c'); GEAR.robe(g, 'W', 'g'); vline(g, 7, 9, 14, 'p'); vline(g, 8, 9, 14, 'p');
    GEAR.belt(g, 'g', 'c'); hipSword('W', 'g'); staff(g, 4, 'g');
    paint(g, ['............L...', '...........kWWk.', '..........WkWcWk', '..........WkccW.', '...........kggk.']); sparkle(g, [[15, 0], [1, 2], [14, 7]]); return g;
  },

  // 白骑士系（伊娃，女骑士，红发）：白骑士 → 圣殿骑士 → 皇家骑士 → 魔法骑士
  whiteKnight(t) {
    t = tierOf(t, 4); const g = grid([]);
    const r = girl(grid(BODY));
    const H = t === 0 ? { 1: 'j', 2: 'i', M: 'W', F: 'Y' } : { 1: 'W', 2: 'j', M: t >= 2 ? 'g' : 'i', F: t >= 2 ? 'a' : 'Y' };
    GEAR.plate(r, 'm', 'i', t >= 1 ? 'p' : 'W'); GEAR.pads(r, t >= 2 ? 'g' : 'm', t >= 2 ? 'a' : 'i', t >= 2);
    let cloth = null;
    if (t === 0) { GEAR.band(r, 'm'); }
    if (t === 1) { GEAR.circlet(r, 'm', 'c'); paint(r, ['', '..W..........W..', '.WW..........WW.']); cloth = ['', '', '', '', '', '', '', '', '', '', '', '...pppppppppp', '...ppppWpppp', '...WWWWWWWWWW', '...p.p....p.p']; }
    if (t === 2) { GEAR.crown(r, 'g', 'c'); cloth = ['', '', '', '', '', '', '', '', '', '', '', '...pppppppppp', '...ppgppppgpp', '...gggggggggg', '...p.p....p.p']; }
    if (t === 3) {
      GEAR.crown(r, 'W', 'A'); put(r, 7, 10, 'A'); put(r, 8, 10, 'A');
      cloth = ['', '', '', '', '', '', '', '', '', '', '', '...DDDDDDDDDD', '...DDADDDDADD', '...cccccccccc', '...D.D....D.D'];
    }
    if (t >= 1) paint(g, ['', '', '', '', '', '', '', '', '', 'p', 'pq', 'pq', 'pq']);
    mounted(g, r, H, cloth, t >= 2 ? 'g' : 'i');
    if (t === 1) paint(g, ['', '', '', '', '', '', '', '', '.m', '.mm', '.mk', 'mm']);
    if (t >= 2) { put(g, 1, 12, 'g'); put(g, 3, 11, 'g'); put(g, 4, 10, 'g'); }
    if (t === 3) { put(g, 1, 8, 'c'); put(g, 0, 7, 'c'); }
    const tip = t === 3 ? 'c' : 'v';
    vline(g, 14, 1, 10, t >= 2 ? 'g' : 'j'); put(g, 14, 0, tip); put(g, 14, 1, tip); put(g, 14, 2, tip); put(g, 13, 1, tip); put(g, 13, 10, 's');
    if (t >= 1) { put(g, 15, 2, t === 3 ? 'A' : 'p'); put(g, 15, 3, t === 3 ? 'A' : 'p'); put(g, 15, 4, 'q'); }
    if (t === 3) sparkle(g, [[12, 0], [15, 7], [0, 3]], 'c');
    return g;
  },

  // 幻术师系（芙蓉，女）：幻术师 → 幻术大师 → 魔幻师 → 幻魔（越来越暗、越来越像魔）
  illusionist(t) {
    t = tierOf(t, 4); const g = grid(BODY);
    if (t === 3) paint(g, ['', '', '', '', '', 'k..............k', 'dk............kd', 'Ddk..........kdD', 'DDdk........kdDD', 'kDDd........dDDk', '.kDd........dDk.', '..kd........dk..']);
    girl(g);
    const dress = t <= 1 ? ['p', 'D'] : t === 2 ? ['d', 'p'] : ['d', 'R'];
    GEAR.robe(g, dress[0], dress[1]); hline(g, 5, 10, 12, t >= 2 ? 'A' : 'D'); put(g, 7, 10, 'g'); put(g, 8, 10, 'g');
    if (t === 0) { put(g, 3, 3, 'A'); put(g, 4, 2, 'A'); staff(g, 5, 'w'); paint(g, ['', '', '', '............AA..', '.............A..']); return g; }
    if (t === 1) {
      paint(g, ['', '..A.........', '.AAA', '..A']); GEAR.cape(g, 'D', 'd', 'A', true); staff(g, 4, 'g');
      paint(g, ['', '............gg..', '...........gAAg.', '...........gAAg.', '............gg..']); sparkle(g, [[0, 12], [15, 7]], 'A'); return g;
    }
    if (t === 2) {
      GEAR.cape(g, 'd', 'D', 'A'); paint(g, ['..D..........D..', '..DD........DD..']); put(g, 2, 8, 'D'); put(g, 13, 8, 'D');
      staff(g, 4, 'Y'); paint(g, ['............gg..', '...........g..g.', '...........gAeg.', '............gg..']); sparkle(g, [[15, 6], [0, 13], [1, 1]], 'A'); return g;
    }
    // 幻魔：弯角、红眼、蝠翼、红黑长裙、魔焰
    paint(g, ['.R............R.', '.RR..........RR.', '..Rk........kR..']); eyes(g, 'e');
    GEAR.cape(g, 'd', 'R', 'e'); staff(g, 4, 'k'); paint(g, ['............ee..', '...........eAAe.', '...........eAAe.', '............ee..']); sparkle(g, [[15, 7], [0, 14], [15, 0]], 'e'); return g;
  },

  // 御风剑士系（秋月，女）：剑侠 → 御风剑士 → 飘渺剑士 → 剑圣（风之围巾越来越长）
  windSword(t) {
    t = tierOf(t, 4); const g = girl(grid(BODY));
    paint(g, ['.hh', 'hh']); // 侧马尾
    const scarf = (c, d, len) => {
      hline(g, 4, 11, 9, c); put(g, 3, 9, c);
      const tail = [[2, 9], [1, 10], [0, 10], [0, 11], [1, 12], [0, 13], [0, 14]].slice(0, len);
      tail.forEach(([x, y], i) => put(g, x, y, i % 2 ? d : c));
    };
    if (t === 0) { GEAR.belt(g, 'w'); GEAR.boots(g, 'w'); scarf('T', 't', 3); blade(g, 3, 'm', 'n', 'n'); return g; }
    if (t === 1) {
      GEAR.band(g, 'W'); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); scarf('T', 't', 5); blade(g, 1, 'v', 'm', 'g');
      sparkle(g, [[0, 4], [1, 3], [15, 8]], 'c'); return g;
    }
    if (t === 2) {
      fill(g, 4, 9, 11, 12, 'W', 'pq'); put(g, 5, 11, 'j'); put(g, 10, 11, 'j'); GEAR.skirt(g, 'W', 'p'); GEAR.band(g, 'c'); GEAR.belt(g, 'p', 'c');
      scarf('c', 'T', 7); blade(g, 0, 'W', 'c', 'g'); sparkle(g, [[0, 3], [2, 1], [15, 6], [12, 15]], 'c'); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); fill(g, 4, 9, 11, 12, 'W', 'pq'); GEAR.skirt(g, 'W', 'g'); GEAR.crown(g, 'g', 'c'); GEAR.belt(g, 'g', 'c'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
    scarf('T', 'g', 7); blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[15, 1], [12, 0], [0, 3], [15, 6]]); return g;
  },

  // 祈祷师系（依琳娜，公主）：祈祷师 → 神官战士 → 大祭司 → 圣女
  prayer(t) {
    t = tierOf(t, 4); const g = girl(grid(BODY));
    if (t === 3) paint(g, ['', '', '', '', '', 'W..............W', 'WW............WW', 'jWW..........WWj', '.jW..........Wj.', '..j..........j..']);
    if (t === 3) girl(g);
    GEAR.robe(g, 'W', t >= 2 ? 'g' : 'p'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p');
    if (t === 0) { paint(g, ['', '......g..g......', '......gggg......']); staff(g, 4, 'w'); paint(g, ['', '', '.............c..', '............cWc.', '.............c..']); return g; }
    if (t === 1) {
      paint(g, ['', '......g..g......', '......gggg......']); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'g');
      vline(g, 13, 2, 14, 'w'); put(g, 13, 0, 'v'); put(g, 13, 1, 'v'); put(g, 12, 2, 'v'); put(g, 14, 2, 'v'); put(g, 14, 3, 'p'); put(g, 14, 4, 'p'); return g;
    }
    if (t === 2) {
      paint(g, ['.....WWWWWW.....', '....WWggggWW....', '..WWW......WWW..', '..W..........W..', '.WW..........WW.', '.WW..........WW.', '.Wj..........jW.', '.Wj..........jW.']);
      put(g, 7, 2, 'c'); put(g, 8, 2, 'c'); GEAR.belt(g, 'g', 'c'); GEAR.cape(g, 'p', 'q', 'g');
      staff(g, 3, 'g'); paint(g, ['............ggg.', '...........gWcWg', '............ggg.']); return g;
    }
    paint(g, ['..LLLLLLLLLLL...']); GEAR.crown(g, 'g', 'c'); GEAR.belt(g, 'g', 'c'); GEAR.pads(g, 'g', 'a');
    vline(g, 13, 2, 14, 'g'); put(g, 13, 0, 'W'); put(g, 13, 1, 'L'); put(g, 12, 2, 'L'); put(g, 14, 2, 'L'); put(g, 14, 3, 'p'); put(g, 14, 4, 'p');
    sparkle(g, [[15, 0], [11, 0], [0, 13], [15, 9]]); return g;
  },

  // 剑客系（刑天，长风衣）：多情剑客 → 剑狂 → 剑痴（剑气越来越盛）
  swordMad(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const coat = c => { for (let y = 9; y <= 14; y++) { put(g, 4, y, c); put(g, 5, y, c); put(g, 10, y, c); put(g, 11, y, c); } put(g, 3, 13, c); put(g, 3, 14, c); put(g, 12, 13, c); put(g, 12, 14, c); put(g, 3, 10, 'k'); put(g, 12, 10, 'k'); };
    paint(g, ['', '.h............h.', 'hh............hh']); // 乱发
    if (t === 0) { coat('Y'); GEAR.belt(g, 'k', 'y'); blade(g, 2, 'm', 'n', 'k'); put(g, 2, 9, 'r'); put(g, 3, 9, 'r'); put(g, 2, 8, 'G'); return g; }
    if (t === 1) {
      coat('R'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '', '', '..R', '.R', 'R']); GEAR.belt(g, 'k', 'g'); GEAR.band(g, 'r', true);
      blade(g, 0, 'v', 'm', 'k', true); vline(g, 15, 1, 8, 'c'); put(g, 12, 2, 'c'); put(g, 12, 5, 'c'); return g;
    }
    coat('d'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '', '', '..d', '.dd', 'dd.']); GEAR.belt(g, 'k', 'A'); eyes(g, 'A'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    blade(g, 0, 'W', 'A', 'k', true); vline(g, 15, 0, 8, 'A'); vline(g, 12, 1, 7, 'A'); put(g, 12, 0, 'L'); sparkle(g, [[11, 0], [15, 11], [0, 9]], 'A'); return g;
  },

  // 蛊师系（拉维司，南疆）：蛊师 → 蛊术士 → 蛊王（羽冠、蛊罐、毒虫）
  gushi(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    hline(g, 3, 12, 4, 'f'); put(g, 5, 4, 'o'); put(g, 8, 4, 'o'); put(g, 11, 4, 'o'); put(g, 4, 8, 'o'); put(g, 11, 8, 'o'); // 头巾 + 纹面
    for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } put(g, 6, 11, 'o'); put(g, 9, 11, 'o');
    const jar = (c, lid) => paint(g, ['', '', '', '', '', '', '', '', '', '', '.kkk', 'k' + lid + lid + lid + 'k', 'kcccck', 'kcOcck', '.kkkk'].map(r => r.slice(0, 6)), { c });
    if (t === 0) {
      paint(g, ['.......G........', '......GG........']); GEAR.belt(g, 'f', 'o'); jar('O', 'w'); put(g, 1, 9, 'k'); put(g, 3, 8, 'k');
      staff(g, 4, 'f'); put(g, 13, 3, 'G'); put(g, 12, 3, 'k'); put(g, 14, 3, 'k'); return g;
    }
    if (t === 1) {
      paint(g, ['....r.GG.o......', '.....rGGoo......', '......GGo.......']); hline(g, 4, 11, 9, 'b'); put(g, 5, 9, 'k'); put(g, 10, 9, 'k');
      GEAR.belt(g, 'f', 'G'); jar('O', 'G'); put(g, 1, 8, 'G'); put(g, 2, 7, 'G'); put(g, 0, 6, 'k'); put(g, 3, 6, 'k');
      staff(g, 4, 'f'); paint(g, ['', '', '...........kbbk.', '...........bGGb.', '...........kbbk.']); sparkle(g, [[15, 7], [14, 0]], 'k'); return g;
    }
    GEAR.cape(g, 'H', 'G', 'g'); paint(g, ['..r.G.GG.G.o....', '...rGgGGgGo.....', '....gggggggg....']); put(g, 7, 2, 'c'); hline(g, 4, 11, 9, 'b');
    eyes(g, 'G'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    GEAR.belt(g, 'g', 'G'); jar('g', 'G'); put(g, 1, 8, 'G'); put(g, 2, 7, 'G'); put(g, 1, 6, 'G');
    staff(g, 4, 'g'); paint(g, ['', '', '...........kbbk.', '...........bGGb.', '...........kbbk.']); sparkle(g, [[0, 4], [15, 6], [14, 0], [3, 1], [15, 12]], 'g'); return g;
  },

  // ---------- 二代敌方专用 ----------
  // 树妖：树冠 + 树干脸 + 根须
  treant() {
    return grid([
      '....kkkkkkk.....',
      '..kkGGHGGGGkk...',
      '.kGGGGGGHGGGGk..',
      'kGHGGGGGGGGHGGk.',
      'kGGGHGGGHGGGGHk.',
      '.kHGGkkkkkkGGk..',
      '..kkkwfffwfkk...',
      '...kfwLffLwfk...',
      '...kffkffkffk...',
      '..kffwkkkkwffk..',
      '.kwfkffwfffkfwk.',
      'kwk.kfwffwfk.kwk',
      'k...kffwffwk...k',
      '...kfwkffkwfk...',
      '..kwfk.kk.kfwk..',
      '..kkk......kkk..',
    ]);
  },
  // 地精：绿皮尖耳、大眼、匕首（Q 版身体）
  goblin() {
    const g = recolor(grid(BODY), { s: 'H', h: 'F', P: 'G' });
    fill(g, 3, 6, 12, 8, 'H', 'H'); paint(g, ['', '', '', '', 'k..............k', 'kHk..........kHk', '.kHk........kHk.']);
    for (const [x, y] of [[5, 6], [9, 6]]) put(g, x, y, 'L');
    fill(g, 4, 9, 11, 12, 'f', 'pq'); GEAR.belt(g, 'F', 'y'); fill(g, 5, 13, 10, 14, 'H', 'pq');
    vline(g, 13, 6, 9, 'm'); hline(g, 12, 14, 10, 'F'); put(g, 13, 11, 'F'); return g;
  },
  // 兽王（兽化杨铁）：鬃毛兽头、獠牙、壮硕身躯、利爪
  beastKing() {
    return grid([
      '.kk..........kk.',
      'kuuk.kkkkkk.kuuk',
      'kuFukFFFFFFkuFuk',
      '.kuFFuuuuuuFFuk.',
      'kFFuuuuuuuuuuFFk',
      'kFuuLkuuuuLkuuFk',
      'kFuukkuuuukkuuFk',
      '.kFuuubbbbuuuFk.',
      'kFFkuWbkkbWukFFk',
      'kFuuukWbbWkuuuFk',
      'kuuuuuuuuuuuuuuk',
      'kWukuuubbuuukuWk',
      '.WkkuuubbuuukkW.',
      '...kuuuuuuuuk...',
      '..kuuk.kk.kuuk..',
      '..kWWk....kWWk..',
    ]);
  },
  // 复仇魔神：巨角、蝠翼、红眼、黑金魔甲、魔焰
  revengeDemon() {
    const g = grid(BODY); girl(g); recolor(g, { h: 'd' });
    paint(g, ['k..............k', 'dk.....ee.....kd', 'Ddk..........kdD', 'DDdk........kdDD', 'kDDdk......kdDDk', '.kDDd......dDDk.', '..kDd......dDk..', '...kd......dk...', '', 'k..............k', 'dk............kd', 'Ddk..........kdD', '.Dd..........dD.', '..d..........d..']);
    paint(g, ['..R..........R..', '.RRk........kRR.', '.R.k........k.R.']); eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L');
    GEAR.robe(g, 'd', 'R'); GEAR.plate(g, 'd', 'k', 'e'); fill(g, 5, 9, 10, 9, 'g'); GEAR.pads(g, 'g', 'a', true); hline(g, 5, 10, 12, 'g');
    sparkle(g, [[1, 0], [14, 0], [0, 15], [15, 15], [7, 0], [8, 0]], 'e'); return g;
  },
});
// ---------- 超时空英雄传说2 外传：北方密使（g3）新职业 / 敌人 ----------
// 手弩（右手平举）：x=11–15 弩身、x=14 弩臂；big = 加弩匣
function handXbow(g, wood, prod, big) {
  hline(g, 11, 15, 10, wood); vline(g, 14, 8, 12, prod); put(g, 14, 7, 'n'); put(g, 14, 13, 'n'); put(g, 15, 9, 'v');
  if (big) { hline(g, 11, 13, 9, 'f'); put(g, 12, 8, 'g'); hline(g, 11, 13, 8, 'k'); put(g, 15, 11, 'v'); }
}
// 奚族毛皮帽：帽身 c，毛边 b/B
function furHat(g, c, plume) {
  fill(g, 2, 1, 13, 3, c, 'h'); hline(g, 2, 13, 4, 'b'); hline(g, 3, 12, 5, 'B'); put(g, 1, 4, 'k'); put(g, 14, 4, 'k');
  for (const x of [4, 7, 10]) put(g, x, 4, 'B');
  if (plume) paint(g, ['..........' + plume + plume + '....', '...........' + plume + plume + '...']);
}
// 小孩身体：头同样大，身体只有 3 行，整体下移 2 行
function childBody() {
  const b = grid(BODY), g = grid([]);
  const map = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: 13, 15: 14 };
  for (const y in map) g[y] = b[map[y]].slice();
  paint(g, ['', '', '', '', '', '', '.hk..........kh.', 'hhk..........khh', 'hh............hh', '.h............h.']); // 双马尾
  put(g, 4, 8, 'k'); put(g, 11, 8, 'k');
  return g;
}
Object.assign(SPRITE_DEFS, {
  // 剑手系（白志超）：剑手 → 剑客 → 剑宗 → 霸王剑士
  swordHand(t) {
    t = tierOf(t, 4); const g = grid(BODY);
    const jacket = c => { for (let y = 9; y <= 12; y++) { put(g, 5, y, c); put(g, 10, y, c); } };
    if (t === 0) { jacket('F'); GEAR.belt(g, 'w', 'y'); put(g, 4, 10, 'w'); put(g, 11, 10, 'w'); blade(g, 3, 'm', 'n', 'n'); return g; }
    if (t === 1) {
      GEAR.cape(g, 'Y', 'k', null, true); jacket('F'); GEAR.pads(g, 'w', 'f'); GEAR.belt(g, 'F', 'g'); GEAR.boots(g, 'F');
      put(g, 4, 10, 'w'); put(g, 11, 10, 'w'); blade(g, 1, 'v', 'm', 'g'); return g;
    }
    if (t === 2) {
      GEAR.cape(g, 'q', 'd', 'W'); fill(g, 5, 9, 10, 11, 'W', 'pq'); put(g, 5, 10, 'j'); put(g, 10, 10, 'j'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
      GEAR.band(g, 'W', true); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'p', 'g'); GEAR.boots(g, 'Y'); blade(g, 0, 'W', 'v', 'g', true);
      sparkle(g, [[15, 2], [12, 0]], 'v'); return g;
    }
    // 霸王剑士：黑金重甲 + 金角冠 + 赤披风 + 巨剑
    GEAR.cape(g, 'r', 'R', 'g'); GEAR.helm(g, 'Y', 'k'); paint(g, ['..g..........g..', '..gg..g..g..gg..', '...gggggggggg...']); put(g, 7, 3, 'r'); put(g, 8, 3, 'r');
    GEAR.plate(g, 'Y', 'k', 'g'); hline(g, 5, 10, 9, 'g'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'g', 'r'); GEAR.boots(g, 'Y');
    put(g, 13, 0, 'W'); vline(g, 13, 1, 9, 'W'); vline(g, 14, 0, 9, 'm'); vline(g, 15, 2, 9, 'n'); hline(g, 11, 15, 10, 'g'); put(g, 13, 11, 'k'); put(g, 13, 12, 'g');
    sparkle(g, [[12, 0], [11, 2]], 'L'); return g;
  },
  // 剑手 B（灵剑之道）：魔法剑士（青色法披 + 符文剑）→ 灵剑使（白青灵衣 + 环绕灵剑）
  swordHand_b(t) {
    t = tierB(t, 2, 3); const g = grid(BODY);
    if (t === 2) {
      GEAR.cape(g, 'T', 't', 'c'); GEAR.circlet(g, 'i', 'c'); GEAR.plate(g, 'i', 'n', 'T'); GEAR.pads(g, 'T', 't'); GEAR.belt(g, 't', 'c'); GEAR.boots(g, 'n');
      blade(g, 1, 'c', 'T', 'i'); put(g, 13, 3, 'W'); put(g, 13, 6, 'W'); sparkle(g, [[15, 2], [12, 0]], 'c'); return g;
    }
    GEAR.cape(g, 'W', 'T', 'c'); GEAR.circlet(g, 'c', 'W'); paint(g, ['...cccccccccc...']);
    fill(g, 5, 9, 10, 11, 'W', 'pqg'); GEAR.skirt(g, 'W', 'T'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.pads(g, 'c', 'T', true); GEAR.belt(g, 'T', 'W');
    blade(g, 0, 'W', 'c', 'c', true);
    // 环绕的灵剑
    paint(g, ['', '', 'c', 'Wc', 'Wc', 'c', 'T', '', '', '', '', '', '...............c', '...............W', '...............W', '...............T']);
    sparkle(g, [[12, 0], [1, 9]], 'v'); return g;
  },

  // 魔法骑士系（飞霜，女，骑马）：魔法骑士 → 玫瑰骑士 → 女战神
  magicKnight(t) {
    t = tierOf(t, 3); const g = grid([]); const r = girl(grid(BODY));
    let H, cloth = null;
    if (t === 0) {
      H = { 1: 'i', 2: 'Y', M: 'k', F: 'k' };
      GEAR.plate(r, 'm', 'n', 'D'); GEAR.pads(r, 'D', 'd'); GEAR.circlet(r, 'm', 'A');
      cloth = ['', '', '', '', '', '', '', '', '', '', '', '.....DDDDDD', '.....DDDDDD', '.....AAAAAA'];
      paint(g, ['', '', '', '', '', '', '', '', '', 'D', 'Dd', 'Dd', 'Dd']);
    } else if (t === 1) {
      H = { 1: 'W', 2: 'j', M: 'P', F: 'Y' };
      GEAR.plate(r, 'W', 'j', 'r'); GEAR.pads(r, 'P', 'r'); paint(r, ['....r.rr.r......', '....rPrrPr......', '.....GGGG.......']);
      cloth = ['', '', '', '', '', '', '', '', '', '', '', '...PPPPPPPPPP', '...PPrPPPPrPP', '...rrrrrrrrrr', '...P.P....P.P'];
      paint(g, ['', '', '', '', '', '', '', '', '', 'r', 'rR', 'rR', 'rR']);
    } else {
      H = { 1: 'W', 2: 'j', M: 'g', F: 'a' };
      GEAR.helm(r, 'g', 'a'); paint(r, ['W..............W', 'WW............WW', '.WW..........WW.']); GEAR.plate(r, 'g', 'a', 'p'); GEAR.pads(r, 'W', 'j', true);
      cloth = ['', '', '', '', '', '', '', '', '', '', '', '...gggggggggg', '...ggpggggpgg', '...WWWWWWWWWW', '...g.g....g.g'];
      paint(g, ['', '', '', '', '', '', '', '', '', 'p', 'pq', 'pq', 'pq']);
    }
    mounted(g, r, H, cloth, t === 2 ? 'g' : 'i');
    if (t >= 1) { put(g, 1, 12, t === 2 ? 'g' : 'r'); put(g, 3, 11, t === 2 ? 'g' : 'r'); }
    const tip = ['c', 'v', 'L'][t];
    vline(g, 14, 1, 10, t === 2 ? 'g' : 'i'); put(g, 14, 0, tip); put(g, 14, 1, tip); put(g, 14, 2, tip); put(g, 13, 1, tip); put(g, 13, 10, 's');
    if (t === 0) { put(g, 15, 2, 'A'); sparkle(g, [[12, 0]], 'A'); }
    if (t === 1) { put(g, 15, 2, 'r'); put(g, 15, 3, 'P'); put(g, 12, 0, 'r'); }
    if (t === 2) { put(g, 15, 1, 'L'); sparkle(g, [[12, 0], [15, 5], [0, 5]], 'L'); }
    return g;
  },

  // 杀手系（罗莎莉，女）：杀手 → 皇家杀手 → 飞贼
  killer(t) {
    t = tierOf(t, 3); const g = girl(grid(BODY));
    fill(g, 4, 9, 11, 12, t === 2 ? 'F' : 'Y', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
    if (t === 0) {
      hline(g, 3, 12, 8, 'd'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); GEAR.belt(g, 'k', 'y'); GEAR.boots(g, 'k');
      vline(g, 13, 6, 9, 'm'); put(g, 13, 5, 'v'); hline(g, 12, 14, 10, 'k'); put(g, 13, 11, 'r'); return g;
    }
    if (t === 1) {
      GEAR.cape(g, 'D', 'd', 'g'); hline(g, 3, 12, 8, 'd'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); GEAR.circlet(g, 'g', 'r');
      GEAR.pads(g, 'd', 'g'); GEAR.belt(g, 'g', 'r'); GEAR.boots(g, 'd');
      vline(g, 13, 4, 9, 'v'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'r');
      vline(g, 2, 7, 11, 'v'); hline(g, 1, 3, 12, 'g'); put(g, 2, 13, 'r'); return g;
    }
    // 飞贼：眼罩、红斗篷、钩索、宝袋
    GEAR.cape(g, 'r', 'R', 'W'); hline(g, 3, 12, 6, 'k'); hline(g, 3, 12, 7, 'k'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W'); put(g, 6, 7, 'L'); put(g, 10, 7, 'L');
    put(g, 2, 6, 'k'); put(g, 13, 6, 'k');
    GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'F');
    paint(g, ['', '', '', '', '', '', '', '', '..bb', '.bgb', '.bbb']); // 宝袋
    vline(g, 13, 3, 9, 'v'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'r'); paint(g, ['', '..............w.', '.............w.w', '.............w.w', '..............w.']);
    sparkle(g, [[0, 2], [15, 7]], 'L'); return g;
  },

  // 连弩手系（娜塔莉亚，奚族女弩手）：连弩手 → 射手 → 骑弓手（骑马）
  crossbowman(t) {
    t = tierOf(t, 3);
    const r = girl(grid(BODY));
    furHat(r, t === 0 ? 'p' : 'q', t >= 1 ? 'r' : null);
    hline(r, 4, 11, 9, 'b'); put(r, 4, 9, 'B'); put(r, 11, 9, 'B'); for (let y = 10; y <= 11; y++) { put(r, 5, y, 'w'); put(r, 10, y, 'w'); } GEAR.belt(r, 'F', 'g');
    if (t < 2) {
      GEAR.boots(r, 'F'); if (t === 1) GEAR.cape(r, 'B', 'w', 'b', true);
      handXbow(r, 'w', t === 1 ? 'g' : 'm', t === 1);
      if (t === 1) { put(r, 1, 11, 'w'); put(r, 1, 12, 'w'); put(r, 1, 10, 'W'); put(r, 2, 10, 'W'); }
      return r;
    }
    // 骑弓手：草原兔褐马（浅色，与发色区分）+ 角弓
    const g = grid([]);
    mounted(g, r, { 1: 'b', 2: 'B', M: 'F', F: 'F' }, ['', '', '', '', '', '', '', '', '', '', '', '.....rrrrrr', '.....rgrrgr', '.....pppppp'], 'F');
    put(g, 1, 12, 'r'); put(g, 3, 11, 'r');
    paint(g, ['..............g.', '.............kwW', '............kw.W', '............w..W', '...........sw..W', '............w..W', '............kw.W', '.............kwW', '..............g.']);
    sparkle(g, [[12, 0]], 'r'); return g;
  },
  // 连弩手 B：黑精灵（暗肤尖耳、诅咒之弓、紫光）
  crossbowman_b(t) {
    const g = girl(recolor(grid(BODY), { s: 'S', P: 'D' }));
    paint(g, ['', '', '', '', '', 'k..............k', 'Sk............kS', '.Sk..........kS.']);
    eyes(g, 'A'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    GEAR.cape(g, 'd', 'D', 'A'); fill(g, 4, 9, 11, 12, 'd', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p'); GEAR.circlet(g, 'D', 'A'); GEAR.belt(g, 'D', 'A'); GEAR.boots(g, 'd');
    vline(g, 1, 3, 13, 'D'); put(g, 2, 2, 'A'); put(g, 2, 14, 'A'); vline(g, 3, 3, 13, 'A'); paint(g, ['', '', '', '', '', '', '', '', '', '...AAAAAc']);
    sparkle(g, [[0, 1], [15, 4], [15, 12]], 'A'); return g;
  },

  // 通灵使系（苏，奚族巫医）：通灵使 → 灵术师 → 召唤师
  medium(t) {
    t = tierOf(t, 3); const g = girl(grid(BODY));
    hline(g, 3, 12, 4, 'r'); for (const x of [4, 7, 10]) put(g, x, 4, 'g');
    GEAR.robe(g, t === 0 ? 'b' : 'W', t === 2 ? 'g' : 'p'); for (const [x, y] of [[5, 10], [10, 10], [6, 12], [9, 12]]) put(g, x, y, 'r'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
    hline(g, 5, 10, 9, 'g'); put(g, 6, 9, 'c'); put(g, 9, 9, 'c'); // 串珠
    if (t === 0) {
      paint(g, ['..........WB....', '...........B....']); staff(g, 4, 'w'); paint(g, ['', '', '...........g.g..', '............w...', '...........g.g..']); return g;
    }
    if (t === 1) {
      paint(g, ['....W.r..r.W....', '....WBr..rBW....']); staff(g, 4, 'w'); paint(g, ['', '............c...', '...........cWc..', '............c...']);
      paint(g, ['', '', '', '.c', 'cWc', '.c', '', '', '', '', '', '', '', '', '', '']); sparkle(g, [[15, 7]], 'c'); return g;
    }
    // 召唤师：鹿角头饰 + 灵兽之魂 + 金纹披风
    GEAR.cape(g, 'r', 'R', 'g'); paint(g, ['.b.b........b.b.', '..bb.W....W.bb..', '...b.B....B.b...']);
    staff(g, 4, 'g'); paint(g, ['............gg..', '...........gccg.', '...........gccg.', '............gg..']);
    paint(g, ['', '', '.cc', 'cWcc', 'ccc.', '.c..', '', '', '', '', '', '', '', '', '', '']); sparkle(g, [[15, 6], [0, 9], [14, 14]], 'c'); return g;
  },
  // 通灵使 B：邪灵使（骷髅面饰、暗紫袍、紫焰、红眼）
  medium_b(t) {
    const g = girl(grid(BODY));
    GEAR.cape(g, 'd', 'k', 'A'); paint(g, ['..b.bbbbbb.b....', '...bkbbbbkb.....', '....bbbbbb......']); eyes(g, 'e'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    GEAR.robe(g, 'd', 'D'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); hline(g, 5, 10, 9, 'b'); put(g, 7, 9, 'e'); put(g, 8, 9, 'e'); GEAR.belt(g, 'D', 'A');
    staff(g, 4, 'k'); paint(g, ['............AP..', '...........AAAA.', '...........kbbk.', '...........bkkb.', '...........kbbk.']);
    paint(g, ['', '', '', '.A', 'AeA', '.A']); sparkle(g, [[15, 7], [0, 13], [14, 14]], 'A'); return g;
  },

  // 小孩（宝儿）：小孩 → 宝儿神（白金神衣、光环、翅膀、浮空）
  child(t) {
    t = tierOf(t, 2); const g = childBody();
    if (t === 0) {
      fill(g, 4, 11, 11, 13, 'P', 'pqg'); hline(g, 5, 10, 13, 'p'); put(g, 7, 11, 'W'); put(g, 8, 11, 'W');
      vline(g, 13, 7, 14, 'w'); put(g, 13, 6, 'r'); put(g, 12, 6, 'P'); put(g, 14, 6, 'P'); put(g, 13, 5, 'P'); return g;
    }
    paint(g, ['', '', '', '', '', '', '', 'W..............W', 'WW............WW', 'jWW..........WWj', '.jW..........Wj.', '..j..........j..']);
    paint(g, ['...LLLLLLLLLL...', '..L..........L..']);
    fill(g, 4, 11, 11, 15, 'W', 'pqgk'); hline(g, 5, 10, 13, 'g'); put(g, 7, 11, 'p'); put(g, 8, 11, 'p'); hline(g, 4, 11, 15, '.'); hline(g, 5, 10, 14, 'g');
    vline(g, 13, 6, 14, 'g'); put(g, 13, 5, 'L'); put(g, 12, 5, 'L'); put(g, 14, 5, 'L'); put(g, 13, 4, 'W');
    sparkle(g, [[0, 3], [15, 3], [1, 14], [14, 15]], 'L'); return g;
  },

  // 贵族公主（奥帕儿，沙漠贵族）：金冠面纱、白纱长裙、金饰、宝石杖
  princess() {
    const g = girl(grid(BODY));
    GEAR.crown(g, 'g', 'r'); paint(g, ['', '', '', '', '', 'W..............W', 'Wc............cW', 'Wc............cW', '.Wc..........cW.', '..W..........W..']);
    GEAR.robe(g, 'W', 'g'); put(g, 5, 10, 'c'); put(g, 10, 10, 'c'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); hline(g, 5, 10, 9, 'g'); put(g, 7, 9, 'r'); put(g, 8, 9, 'r');
    GEAR.belt(g, 'g', 'r'); staff(g, 4, 'g'); paint(g, ['', '............ggg.', '...........gWrWg', '............ggg.', '.............g..']); return g;
  },

  // 武师系（岚）：武师 → 武道家 → 拳圣（龙纹黑衣 + 火焰拳）
  martial(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const fists = (c, d) => paint(g, ['', '', '', '', '', '', '', '', '', '', '..' + c + c + 'k......k' + c + c + '..', '..' + d + c + 'k......k' + c + d + '..'], {});
    if (t === 0) {
      put(g, 6, 9, 'W'); put(g, 9, 9, 'W'); for (const y of [10, 11]) put(g, 7, y, 'g'); GEAR.belt(g, 'w'); hline(g, 5, 10, 13, 'q');
      fists('m', 'n'); return g;
    }
    if (t === 1) {
      GEAR.band(g, 'r', true); fill(g, 5, 9, 10, 11, 'W', 'pqg'); put(g, 5, 10, 'j'); put(g, 10, 10, 'j'); put(g, 7, 10, 'p'); put(g, 8, 10, 'p'); GEAR.belt(g, 'k', 'k');
      fists('m', 'n'); put(g, 1, 10, 'm'); put(g, 14, 10, 'm'); return g;
    }
    GEAR.band(g, 'g', true); fill(g, 5, 9, 10, 11, 'Y', 'pqg'); put(g, 6, 9, 'g'); put(g, 7, 10, 'g'); put(g, 8, 10, 'g'); put(g, 9, 11, 'g'); vline(g, 7, 11, 11, 'p');
    GEAR.belt(g, 'r', 'g'); GEAR.cape(g, 'r', 'R', 'g', true);
    fists('o', 'r'); paint(g, ['', '', '', '', '', '', '', '', '.o............o.', 'oLo..........oLo', '.o............o.']); sparkle(g, [[0, 13], [15, 13], [15, 5]], 'o'); return g;
  },

  // 蛮人系（穆尔）：蛮人 → 狂战士 → 霸王（狼皮兜帽 + 金项圈 + 巨斧）
  barbarian(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    hline(g, 5, 10, 9, 's'); hline(g, 5, 10, 10, 's'); hline(g, 5, 10, 11, 'S'); fill(g, 5, 13, 10, 14, 'B', 'pq'); hline(g, 5, 10, 12, 'p'); // 赤膊 + 兽皮裙
    if (t === 0) {
      paint(g, ['...h.h..h.h.....', '.h............h.']); put(g, 4, 9, 'B'); put(g, 11, 9, 'B'); put(g, 3, 9, 'B'); put(g, 12, 9, 'B');
      GEAR.boots(g, 'B'); axe(g, 1, 'y', 'Y', 'F'); return g;
    }
    if (t === 1) {
      paint(g, ['...h.h..h.h.....', '.h............h.']); put(g, 3, 6, 'C'); put(g, 12, 6, 'C'); put(g, 3, 7, 'C'); put(g, 12, 7, 'C'); // 蓝色战纹
      GEAR.cape(g, 'B', 'w', 'b'); hline(g, 4, 11, 9, 'b'); for (const x of [5, 7, 8, 10]) put(g, x, 9, 'W'); GEAR.boots(g, 'B');
      axe(g, 2, 'm', 'n', 'F'); return g;
    }
    // 霸王：狼头兜帽
    GEAR.cape(g, 'r', 'R', 'B');
    paint(g, ['.kk..........kk.', '.kyk........kyk.', '.kyyyyyyyyyyyyk.', '..kyyyyyyyyyyk..', '..kyWkyyyyWkyk..', '..kyyyyyyyyyyk..']);
    put(g, 2, 6, 'y'); put(g, 13, 6, 'y'); put(g, 2, 7, 'y'); put(g, 13, 7, 'y');
    hline(g, 4, 11, 9, 'g'); put(g, 7, 9, 'r'); put(g, 8, 9, 'r'); GEAR.pads(g, 'y', 'Y', true); GEAR.boots(g, 'g');
    axe(g, 3, 'g', 'a', 'F'); sparkle(g, [[12, 0], [15, 9]], 'L'); return g;
  },

  // ---------- 隐藏职业 ----------
  // 鱼人：鱼头鳍冠、鳞身、三叉戟
  fishman() {
    const g = recolor(grid(BODY), { h: 'C', s: 'c', P: 'C' });
    paint(g, ['......TT........', '.....TTTT.......', '..T.........T...', '.TT..........TT.', '..T..........T..']);
    for (const [x, y] of [[4, 2], [7, 3], [10, 2], [5, 4], [9, 4]]) put(g, x, y, 'c');
    put(g, 7, 8, 'k'); put(g, 8, 8, 'k'); fill(g, 4, 9, 11, 12, 'C', 'pq'); for (const [x, y] of [[6, 10], [9, 10], [7, 11]]) put(g, x, y, 'c'); GEAR.belt(g, 'p', 'g');
    fill(g, 5, 13, 10, 14, 'C', 'pq'); put(g, 4, 14, 'T'); put(g, 11, 14, 'T');
    vline(g, 13, 2, 14, 'g'); paint(g, ['............m.m.', '............mmm.', '.............m..']); put(g, 13, 0, 'm'); return g;
  },
  // 吸血鬼：苍白、背头、高领蝠翼披风（红里）、红眼、剑
  vampire() {
    const g = recolor(grid(BODY), { s: 'j', P: 'j' });
    fill(g, 2, 1, 13, 5, 'h', 'h'); hline(g, 3, 12, 5, 'h'); put(g, 7, 5, 'j'); put(g, 8, 5, 'j'); eyes(g, 'e'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W'); put(g, 7, 8, 'W');
    paint(g, ['', '', '', '', '', 'k..............k', 'dk............kd', 'Rdk..........kdR', 'RRdk........kdRR', 'kRRd........dRRk', '.kRd........dRk.', '..kd........dk..', '...d........d...']);
    paint(g, ['', '', '', '', '', '', '', '', '..dd........dd..', '..dR........Rd..']);
    fill(g, 5, 9, 10, 12, 'k', 'pqg'); put(g, 7, 9, 'W'); put(g, 8, 9, 'W'); put(g, 7, 10, 'r'); put(g, 8, 10, 'p'); fill(g, 5, 13, 10, 14, 'k', 'pq');
    blade(g, 2, 'v', 'm', 'R'); return g;
  },
  // 女妖：羽翼化的手臂、长发、羽衣、鸟爪
  harpy() {
    const g = girl(grid(BODY));
    paint(g, ['', '', '', '', 'P..............P', 'DP............PD', 'DDP..........PDD', 'ADDP........PDDA', '.ADDP......PDDA.', '..ADP......PDA..', '...AP......PA...', '....A......A....']);
    paint(g, ['....P.......P...', '.....P.....P....']);
    fill(g, 4, 9, 11, 12, 'D', 'pqs'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); put(g, 6, 9, 'P'); put(g, 9, 9, 'P'); GEAR.belt(g, 'A');
    fill(g, 5, 13, 10, 14, 'o', 'pq'); put(g, 4, 14, 'O'); put(g, 11, 14, 'O'); hline(g, 4, 11, 15, 'k'); sparkle(g, [[0, 2], [15, 2]], 'A'); return g;
  },
  // 小丑：双角铃铛帽、白脸星纹、菱格衣（阵营色）、短刃
  jester() {
    const g = grid(BODY);
    paint(g, ['.gk..........kg.', '.kpk........kqk.', '..kpp......qqk..', '..kppppqqqqqqk..', '..kppppqqqqqqk..']);
    fill(g, 3, 5, 12, 8, 'W', 'shP'); for (const [x, y] of [[4, 7], [11, 7]]) put(g, x, y, 'r'); put(g, 7, 8, 'r'); put(g, 8, 8, 'r'); put(g, 5, 5, 'D'); put(g, 10, 5, 'D');
    hline(g, 4, 11, 9, 'W'); put(g, 4, 9, 'k'); put(g, 11, 9, 'k');
    for (let y = 10; y <= 14; y++) for (let x = 5; x <= 10; x++) if ('pq'.includes(g[y][x])) g[y][x] = (x + y) % 2 ? 'p' : 'r';
    put(g, 4, 10, 'W'); put(g, 11, 10, 'W'); GEAR.belt(g, 'g', 'g');
    vline(g, 13, 5, 9, 'v'); put(g, 14, 6, 'v'); put(g, 14, 7, 'v'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'p'); return g;
  },

  // ---------- g3 敌人 ----------
  // 吸血蝙蝠
  bat() {
    return grid(['', '', '', 'k..k......k..k..', 'Dk.dk.kk.kd.kD..', 'DDkddkddkddkDD..', 'dDDkdkeekdkDDd..', '.dDDdddddddDDd..', '..dDDdWkWddDDd..', '...ddDdkdDDdd...', '....kddddddk....', '.....kdkdkk.....', '......k..k......'].map(r => '.' + r.slice(0, 15)));
  },
  // 重装机甲：铁甲巨躯、驾驶舱、加农臂、履带腿
  mecha() {
    return grid([
      '....kkkkkkkk....',
      '...kmmmmmmmmk...',
      '...kmkccckmmk...',
      '...kmkcWckmnk...',
      'kkkkmmmmmmmnkkkk',
      'kYYkppppppppkYYk',
      'kmmkmnmmmmnmkmmk',
      'kmnkmmgmmgmmkmnk',
      'kmnkmnmmmmnmkmnk',
      'kYYkmmmmmmmmkYYk',
      'kkkknnnnnnnnkkkk',
      '.kOk.kmmmmk.kOk.',
      '.kkk.kmnnmk.kkk.',
      '....kmmkkmmk....',
      '...kYYYkkYYYk...',
      '...kkkkkkkkkk...',
    ]);
  },
  // 克雷布特里（最终 Boss）：高耸邪教主冠、黑紫金袍、骷髅杖、红眼
  creb() {
    const g = grid(BODY); recolor(g, { s: 'j', P: 'j' });
    paint(g, [
      '......kddk......',
      '.....kdAAdk.....',
      '....kdddddk.....',
    ]);
    fill(g, 2, 1, 13, 5, 'd', 'h'); hline(g, 3, 12, 4, 'g'); put(g, 7, 4, 'e'); put(g, 8, 4, 'e'); hline(g, 3, 12, 5, 'k');
    eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L'); hline(g, 6, 9, 8, 'k'); put(g, 7, 8, 'W');
    paint(g, ['', '', '', '', '', 'd..............d', 'dd............dd', 'Ddd..........ddD', 'DDdd........ddDD', 'gDDd........dDDg', '.gDd........dDg.', '..gd........dg..']);
    GEAR.robe(g, 'd', 'g'); GEAR.plate(g, 'd', 'k', 'e'); hline(g, 5, 10, 9, 'g'); GEAR.pads(g, 'g', 'a', true); hline(g, 5, 10, 12, 'g');
    staff(g, 3, 'k'); paint(g, ['............AA..', '...........kbbk.', '...........bkkb.', '...........kbbk.', '............ee..']);
    sparkle(g, [[0, 2], [15, 7], [1, 15], [14, 15]], 'A'); return g;
  },
});
// ---------- 超时空英雄传说3：狂神降世（g4）新职业 / 隐藏职业 / 敌人 ----------
// 长戟（步战，右手）：柄 x=13，戟头斧刃在 x=14–15
function halberdAt(g, top, L, D, shaft) {
  vline(g, 13, top + 1, 14, shaft || 'w'); put(g, 13, top, L);
  for (const [x, dy, c] of [[14, 1, L], [15, 1, L], [14, 2, L], [15, 2, D], [14, 3, D], [12, 2, L]]) put(g, x, top + dy, c);
}
// 骑乘时右手竖持的长兵：tip 枪尖，shaft 柄，flag 小旗色（可省）
function lanceUp(g, tip, shaft, flag, axeHead) {
  vline(g, 14, 1, 10, shaft); put(g, 14, 0, tip); put(g, 14, 1, tip); put(g, 13, 10, 's');
  if (axeHead) { put(g, 15, 2, tip); put(g, 15, 3, tip); put(g, 13, 3, tip); }
  else if (flag) { put(g, 15, 2, flag); put(g, 15, 3, flag); put(g, 15, 4, 'q'); }
}
// 天马（白羽坐骑）：双翼 + 白马
function pegasus(g, r, cloth, boot, wing) {
  const w = wing || 'W';
  paint(g, ['W..............j', 'WW............jW', 'jWW...........jW', 'jjW...........jW', '.jj............j'].map(s => s.replace(/W/g, w)));
  mounted(g, r, { 1: 'W', 2: 'j', M: 'g', F: 'a' }, cloth, boot);
  put(g, 1, 12, 'g'); put(g, 3, 11, 'g');
}
// 狮鹫：鹰首、金褐身、双翼、狮尾
function griffin(g, r, boot) {
  paint(g, ['u..............f', 'uu............fu', 'guu...........fu', 'ggu...........fg', '.gg............g']);
  paint(g, MOUNT_BODY, { 1: 'u', 2: 'f', M: 'F', F: 'o' }); seat(g, r, boot);
  paint(g, ['', '', '', '', '', '',
    '.WW.............',
    'WWWk............',
    'WkWWk...........',
    'oWWWWk..........',
    'ooWWuuk.........',
    '.kWuuuk.........',
    '..kuuuk.........']);
}
// 女巫大帽（法师尖帽同形，颜色可换）
function witchHat(g, c, band, brim) {
  paint(g, ['______kcck______', '_____kcccck_____', '____kcccccck____', '..kkcccccccckk..', '..kbbbbbbbbbbk..', 'rrrrrrrrrrrrrrrr'], { c, b: band, r: brim });
}
function quiver(g) { paint(g, ['', '', '', '', '', '..............W.', '.............W..', '.............kw.', '.............ww.', '.............wf.']); }

Object.assign(SPRITE_DEFS, {
  // ===== 男性职业 =====
  // 斗剑士系（克荷林，血狮鹫兵团团长）：斗剑士 → 剑客 → 大剑师
  duelist(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const sash = () => { put(g, 5, 9, 'r'); put(g, 6, 10, 'r'); put(g, 7, 11, 'r'); put(g, 8, 12, 'r'); };
    if (t === 0) { for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } sash(); GEAR.belt(g, 'F', 'y'); GEAR.boots(g, 'F'); blade(g, 3, 'm', 'n', 'n'); return g; }
    if (t === 1) {
      GEAR.cape(g, 'r', 'R'); GEAR.plate(g, 'i', 'n', 'p'); put(g, 7, 10, 'g'); GEAR.pads(g, 'i', 'n'); GEAR.belt(g, 'F', 'g'); GEAR.boots(g, 'F');
      blade(g, 1, 'v', 'm', 'g'); return g;
    }
    GEAR.cape(g, 'r', 'R', 'g'); GEAR.circlet(g, 'g', 'r'); GEAR.plate(g, 'm', 'i', 'r'); put(g, 7, 10, 'g'); put(g, 8, 10, 'g'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'Y');
    put(g, 13, 0, 'W'); vline(g, 13, 1, 9, 'W'); vline(g, 14, 0, 9, 'm'); vline(g, 15, 2, 9, 'n'); hline(g, 11, 15, 10, 'g'); put(g, 13, 11, 'r'); put(g, 13, 12, 'g'); return g;
  },
  // 长弓手系（麦斯）：长弓手 → 神射手
  longbowman(t) {
    t = tierOf(t, 2); const g = grid(BODY);
    if (t === 0) {
      GEAR.hood(g, 'F'); quiver(g); for (let y = 9; y <= 11; y++) { put(g, 5, y, 'w'); put(g, 10, y, 'w'); } GEAR.belt(g, 'F'); GEAR.boots(g, 'F'); bow(g, 1, 15, 'w', 'F'); return g;
    }
    GEAR.cape(g, 'F', 'f', 'g', true); quiver(g);
    paint(g, ['', '..kpppppppk.....', '.kppppppppppk...', 'kqqqqqqqqqqqqk..', '..kgggggggggk...']); paint(g, ['.........rrrW...', '.........rr.....']);
    GEAR.plate(g, 'w', 'f', 'p'); GEAR.pads(g, 'w', 'f'); GEAR.belt(g, 'F', 'g'); GEAR.boots(g, 'F'); bow(g, 0, 15, 'g', 'W'); return g;
  },
  // 长戟士系：长戟士（步）→ 游击骑士（栗马）→ 飙风骑士（黑马 + 风巾）
  halberdier(t) {
    t = tierOf(t, 3); const r = grid(BODY);
    if (t === 0) {
      GEAR.helm(r, 'n', 'Y'); fill(r, 5, 9, 10, 11, 'b', 'pqg'); put(r, 6, 10, 'B'); put(r, 9, 10, 'B'); vline(r, 7, 9, 11, 'p'); vline(r, 8, 9, 11, 'p'); GEAR.belt(r, 'F', 'y'); GEAR.boots(r, 'F');
      halberdAt(r, 0, 'm', 'n'); return r;
    }
    const g = grid([]);
    if (t === 1) {
      GEAR.helm(r, 'm', 'n'); GEAR.plate(r, 'm', 'n', 'p'); GEAR.pads(r, 'w', 'f');
      mounted(g, r, { 1: 'u', 2: 'f', M: 'F', F: 'F' }, ['', '', '', '', '', '', '', '', '', '', '', '.....pppppp', '.....pppppp', '.....qqqqqq'], 'F');
      lanceUp(g, 'm', 'w', null, true); return g;
    }
    GEAR.helm(r, 'W', 'i'); GEAR.plume(r, 'c'); GEAR.plate(r, 'm', 'i', 'p'); GEAR.pads(r, 'W', 'i', true);
    paint(g, ['', '', '', '', '', '', '', '', 'c', 'cT', '.cT', '..c']);
    mounted(g, r, { 1: 'Y', 2: 'k', M: 'W', F: 'W' }, ['', '', '', '', '', '', '', '', '', '', '', '...pppppppppp', '...ppcppppcpp', '...cccccccccc', '...Y.Y....Y.Y'], 'i');
    lanceUp(g, 'v', 'g', null, true); sparkle(g, [[15, 7], [0, 14]], 'c'); return g;
  },
  // 长戟士 B：重装骑士（黑铁全甲 + 全披甲黑马 + 红狮鹫马衣 + 长戟）
  halberdier_b(t) {
    const g = grid([]), r = grid(BODY);
    GEAR.helm(r, 'Y', 'k'); hline(r, 3, 12, 6, 'Y'); hline(r, 3, 12, 7, 'k'); put(r, 5, 7, 'r'); put(r, 10, 7, 'r'); hline(r, 3, 12, 8, 'Y'); GEAR.plume(r, 'r');
    GEAR.plate(r, 'Y', 'k', 'r'); put(r, 7, 10, 'g'); GEAR.pads(r, 'Y', 'g', true);
    mounted(g, r, { 1: 'm', 2: 'n', M: 'r', F: 'k' }, ['', '', '', '', '', '', '', '', '', '', '', '...rrrrrrrrrr', '...rrgrrrrgrr', '...gggggggggg', '...n.n....n.n'], 'Y');
    paint(g, ['', '', '', '', '', '', '', '', '.n', '.nn', '.nk', 'nn']);
    lanceUp(g, 'm', 'Y', null, true); put(g, 14, 2, 'g'); return g;
  },
  // 蛮族战士系（波比）：蛮族战士 → 装甲佣兵 → 狂战士（熊皮兜帽 + 双刃斧）
  tribesman(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    if (t === 0) {
      paint(g, ['...h.hh.h.......', '..b.........']); put(g, 4, 7, 'G'); put(g, 11, 7, 'G'); hline(g, 5, 10, 9, 's'); hline(g, 5, 10, 10, 's'); hline(g, 5, 10, 11, 'S'); put(g, 6, 10, 'G'); put(g, 9, 10, 'G');
      fill(g, 5, 13, 10, 13, 'B', 'pq'); hline(g, 5, 10, 12, 'p'); GEAR.boots(g, 'B');
      paint(g, ['', '', '', '', '', '', '', '', '', '.kkk', 'kwfwk', 'kfgfk', 'kwfwk', '.kkk']); axe(g, 1, 'm', 'n'); return g;
    }
    if (t === 1) {
      GEAR.helm(g, 'n', 'Y'); paint(g, ['.......nn.......']); GEAR.plate(g, 'n', 'Y', 'r'); GEAR.pads(g, 'n', 'Y', true); GEAR.belt(g, 'F', 'g'); GEAR.boots(g, 'Y');
      axe(g, 1, 'm', 'n'); return g;
    }
    GEAR.cape(g, 'u', 'f', 'F');
    paint(g, ['.kk..........kk.', '.kuk........kuk.', '.kuuuuuuuuuuuuk.', '..kuuuuuuuuuuk..', '..kuuWkuuWkuuk..', '..kfffffffffk...']);
    eyes(g, 'e'); hline(g, 5, 10, 9, 's'); hline(g, 5, 10, 10, 's'); hline(g, 5, 10, 11, 'S'); put(g, 6, 10, 'r'); put(g, 9, 10, 'r'); hline(g, 4, 11, 9, 'b');
    fill(g, 5, 13, 10, 14, 'f', 'pq'); hline(g, 5, 10, 12, 'p'); axe(g, 2, 'v', 'm', 'F'); sparkle(g, [[15, 6]], 'e'); return g;
  },
  // 蛮族战士 B：武斗僧（灰蓝僧衣 + 红腰带 + 念珠 + 气功光）
  tribesman_b(t) {
    const g = grid(BODY);
    GEAR.band(g, 'r', true); fill(g, 4, 9, 11, 12, 'i', 'pq'); put(g, 5, 11, 'n'); put(g, 10, 11, 'n'); for (const x of [4, 6, 9, 11]) put(g, x, 9, 'F'); put(g, 7, 9, 'g'); put(g, 8, 9, 'g');
    GEAR.belt(g, 'r', 'p'); fill(g, 5, 13, 10, 14, 'Y', 'pq');
    paint(g, ['', '', '', '', '', '', '', '', '', '.c............c.', 'cWWk........kWWc', '.WWk........kWW.', '..c..........c..']);
    sparkle(g, [[0, 4], [15, 4], [1, 14], [14, 14]], 'c'); return g;
  },
  // 盗贼系：盗贼（兜帽面巾 + 短刀 + 钱袋）→ 义贼（眼罩 + 蓝斗篷 + 金币）
  thief(t) {
    t = tierOf(t, 2); const g = grid(BODY);
    if (t === 0) {
      GEAR.hood(g, 'F'); hline(g, 3, 12, 8, 'f'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); fill(g, 4, 9, 11, 11, 'f', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
      GEAR.belt(g, 'F', 'y'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..bb', '.bgb', '.bbb']);
      vline(g, 13, 6, 9, 'm'); hline(g, 12, 14, 10, 'F'); put(g, 13, 11, 'F'); return g;
    }
    GEAR.cape(g, 'U', 'C', 'W'); paint(g, ['', '..kpppppppk.....', '.kppppppppppk...', 'kqqqqqqqqqqqqk..', '', '..........W.....']); paint(g, ['.........WW.....', '.........W......']);
    hline(g, 3, 12, 6, 'k'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W'); put(g, 2, 6, 'k'); put(g, 13, 6, 'k');
    fill(g, 4, 9, 11, 11, 'F', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p'); GEAR.belt(g, 'w', 'g');
    vline(g, 13, 4, 9, 'v'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'F'); sparkle(g, [[1, 10], [0, 13], [2, 15]], 'g'); return g;
  },
  // 炼金术士系（男女皆可，发色区分）：炼金术士 → 巫师 → 降术师
  alchemist(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    const flask = (c, x, y) => ['.k.', '.m.', 'kck', 'ccc', 'kck'].forEach((r, dy) => r.split('').forEach((ch, dx) => { if (ch !== '.') put(g, x + dx, y + dy, ch === 'c' ? c : ch); }));
    hline(g, 3, 12, 4, 'w'); put(g, 5, 4, 'c'); put(g, 6, 4, 'c'); put(g, 9, 4, 'c'); put(g, 10, 4, 'c'); // 护目镜
    if (t === 0) {
      GEAR.robe(g, 'p', 'q'); fill(g, 6, 10, 9, 14, 'b'); GEAR.belt(g, 'w');
      flask('G', 0, 9); staff(g, 5, 'w'); put(g, 13, 4, 'f'); sparkle(g, [[1, 7]], 'G'); return g;
    }
    if (t === 1) {
      GEAR.cape(g, 'q', 'd', 'g'); GEAR.robe(g, 'p', 'g'); GEAR.belt(g, 'F', 'g'); put(g, 5, 12, 'r'); put(g, 6, 12, 'G'); put(g, 9, 12, 'c'); put(g, 10, 12, 'A');
      flask('o', 0, 8); staff(g, 4, 'w'); paint(g, ['', '', '............kck.', '............cmc.', '.............k..']); sparkle(g, [[1, 6], [2, 5]], 'o'); return g;
    }
    GEAR.cape(g, 'd', 'D', 'g'); GEAR.robe(g, 'd', 'g'); hline(g, 5, 10, 9, 'g'); put(g, 7, 10, 'L'); put(g, 8, 10, 'L'); GEAR.belt(g, 'g', 'c');
    flask('c', 0, 4); flask('r', 0, 10); staff(g, 4, 'g'); paint(g, ['............LL..', '...........LWWL.', '...........LWWL.', '............LL..']);
    hline(g, 2, 13, 15, 'c'); put(g, 1, 15, 'A'); put(g, 14, 15, 'A'); sparkle(g, [[15, 7]], 'L'); return g;
  },
  // 炼金术士 B：邪术师（暗袍、骷髅毒瓶、紫绿毒雾、红眼）
  alchemist_b(t) {
    const g = grid(BODY);
    GEAR.cape(g, 'd', 'k', 'G'); GEAR.hood(g, 'd'); eyes(g, 'e'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    GEAR.robe(g, 'd', 'D'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.belt(g, 'G', 'A');
    paint(g, ['', '', '', '', '', '', '', '', '.k.', 'kbk', 'bkb', 'kAk', 'AAA', '.k.']);
    staff(g, 4, 'k'); paint(g, ['...........GAG..', '............G...', '...........kbbk.', '...........bkkb.', '...........kbbk.']);
    sparkle(g, [[0, 6], [2, 5], [15, 8], [14, 14]], 'G'); return g;
  },
  // 修士系：修士（灰褐兜帽修服 + 十字坠）→ 德鲁依（叶衣 + 鹿角叶冠 + 生命之杖）
  monk(t) {
    t = tierOf(t, 2); const g = grid(BODY);
    if (t === 0) {
      GEAR.hood(g, 'f'); GEAR.robe(g, 'f', 'F'); hline(g, 5, 10, 12, 'b'); vline(g, 7, 9, 11, 'p'); put(g, 8, 10, 'p'); put(g, 7, 10, 'g'); put(g, 8, 9, 'g'); put(g, 6, 10, 'g');
      staff(g, 3, 'w'); put(g, 13, 2, 'F'); return g;
    }
    GEAR.cape(g, 'H', 'G', 'g'); paint(g, ['.F.F........F.F.', '..FF.G....G.FF..', '...GGGGGGGGGG...']); put(g, 5, 2, 'P'); put(g, 10, 2, 'P');
    GEAR.robe(g, 'G', 'H'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.belt(g, 'F', 'P');
    staff(g, 4, 'w'); paint(g, ['............GG..', '...........GHGG.', '...........GGPG.', '............wG..']); sparkle(g, [[0, 7], [15, 9], [1, 14]], 'G'); return g;
  },
  // 海贼系（力奇）：海贼（条纹衫 + 头巾 + 弯刀）→ 海贼船长（三角帽 + 红长外套 + 眼罩）
  pirate(t) {
    t = tierOf(t, 2); const g = grid(BODY);
    const cutlass = (L, D, guard) => { vline(g, 13, 3, 9, L); put(g, 14, 2, L); put(g, 14, 3, D); vline(g, 14, 4, 8, D); hline(g, 12, 14, 10, guard); put(g, 13, 11, 'k'); };
    if (t === 0) {
      hline(g, 3, 12, 3, 'r'); hline(g, 3, 12, 4, 'r'); put(g, 5, 3, 'W'); put(g, 8, 3, 'W'); put(g, 11, 3, 'W'); put(g, 2, 4, 'r'); put(g, 1, 5, 'r');
      for (let y = 9; y <= 11; y++) for (let x = 5; x <= 10; x++) if ('pq'.includes(g[y][x])) g[y][x] = y % 2 ? 'W' : 'p';
      GEAR.belt(g, 'r', 'g'); GEAR.boots(g, 'F'); cutlass('m', 'n', 'g'); return g;
    }
    paint(g, ['..kkkkkkkkkkkk..', '.kkkkkkkkkkkkk..', 'kkkkkWkkkkkkkkk.', '.kggggggggggggk.', '..kkkkkkkkkkkk..']); put(g, 6, 2, 'W'); put(g, 7, 2, 'W');
    paint(g, ['', '', '', '', '', '', '...kkkk.........', '...kkkk.........']); put(g, 9, 6, 'W'); put(g, 10, 6, 'k');
    GEAR.cape(g, 'R', 'r', 'g'); fill(g, 4, 9, 11, 14, 'R', 'pq'); vline(g, 7, 9, 11, 'W'); vline(g, 8, 9, 11, 'p'); hline(g, 4, 11, 9, 'g'); GEAR.belt(g, 'k', 'g'); GEAR.boots(g, 'k');
    cutlass('v', 'm', 'g'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..k', '.kgg', 'kw']); return g;
  },

  // ===== 女性职业 =====
  // 女战士系（寇琪 / 娜菲雅）：女战士 → 剑士 → 剑姬
  swordmaid(t) {
    t = tierOf(t, 3); const g = girl(grid(BODY));
    if (t === 0) { fill(g, 4, 9, 11, 11, 'f', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p'); GEAR.skirt(g, 'p', 'q'); GEAR.belt(g, 'F', 'y'); blade(g, 3, 'm', 'n', 'F'); return g; }
    if (t === 1) {
      GEAR.cape(g, 'p', 'q'); GEAR.band(g, 'm'); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'm', 'i'); GEAR.skirt(g, 'p', 'q'); GEAR.belt(g, 'F', 'g');
      blade(g, 1, 'v', 'm', 'g'); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); GEAR.crown(g, 'g', 'c'); GEAR.plate(g, 'W', 'j', 'p'); put(g, 7, 10, 'g'); put(g, 8, 10, 'g'); GEAR.pads(g, 'g', 'a', true);
    GEAR.skirt(g, 'W', 'g'); GEAR.belt(g, 'g', 'c'); vline(g, 13, 0, 9, 'W'); vline(g, 14, 2, 9, 'c'); hline(g, 12, 14, 10, 'g'); put(g, 12, 9, 'g'); put(g, 13, 11, 'g');
    sparkle(g, [[15, 1], [12, 0], [15, 6]]); return g;
  },
  // 射手系（仙妮亚）：射手 → 弓骑手（骑马）
  shooter(t) {
    t = tierOf(t, 2); const r = girl(grid(BODY));
    GEAR.band(r, 'G', true); fill(r, 4, 9, 11, 11, 'G', 'pq'); vline(r, 7, 9, 11, 'p'); vline(r, 8, 9, 11, 'p'); GEAR.belt(r, 'F', 'g');
    if (t === 0) { quiver(r); GEAR.skirt(r, 'H', 'G'); GEAR.boots(r, 'F'); bow(r, 3, 15, 'w', 'g'); return r; }
    const g = grid([]); GEAR.pads(r, 'w', 'f');
    mounted(g, r, { 1: 'u', 2: 'f', M: 'W', F: 'F' }, ['', '', '', '', '', '', '', '', '', '', '', '.....GGGGGG', '.....GgGGgG', '.....pppppp'], 'F');
    paint(g, ['..............g.', '.............kwW', '............kw.W', '............w..W', '...........sw..W', '............w..W', '............kw.W', '.............kwW', '..............g.']); return g;
  },
  // 长枪士系（努莎伊）：长枪士（步）→ 白羽骑士（白羽天马）
  pikemaid(t) {
    t = tierOf(t, 2); const r = girl(grid(BODY));
    if (t === 0) {
      GEAR.band(r, 'm'); GEAR.plate(r, 'm', 'n', 'p'); GEAR.pads(r, 'm', 'n'); GEAR.skirt(r, 'p', 'q'); GEAR.belt(r, 'F', 'g');
      vline(r, 13, 2, 14, 'w'); put(r, 13, 0, 'v'); put(r, 13, 1, 'v'); put(r, 12, 2, 'm'); put(r, 14, 2, 'm'); put(r, 14, 3, 'p'); put(r, 14, 4, 'p'); return r;
    }
    const g = grid([]);
    GEAR.helm(r, 'W', 'j'); paint(r, ['W..............W', 'WW............WW', '.W............W.']); GEAR.plate(r, 'W', 'j', 'p'); GEAR.pads(r, 'g', 'a');
    pegasus(g, r, ['', '', '', '', '', '', '', '', '', '', '', '.....pppppp', '.....pppppp', '.....gggggg'], 'g');
    lanceUp(g, 'v', 'g', 'p'); return g;
  },
  // 亚马逊战士系：亚马逊战士（羽饰 + 豹纹 + 圆盾手斧）→ 铠甲士（厚甲 + 角盔 + 大斧）
  amazon(t) {
    t = tierOf(t, 2); const g = girl(grid(BODY));
    if (t === 0) {
      paint(g, ['..........G.....', '.........GrG....']); hline(g, 5, 10, 9, 's'); hline(g, 5, 10, 10, 'o'); put(g, 6, 10, 'F'); put(g, 9, 10, 'F'); hline(g, 5, 10, 11, 'S');
      GEAR.skirt(g, 'o', 'O'); put(g, 6, 13, 'F'); put(g, 9, 14, 'F'); GEAR.belt(g, 'p', 'g');
      paint(g, ['', '', '', '', '', '', '', '', '', '.kkk', 'kwpwk', 'kpgpk', 'kwpwk', '.kkk']); axe(g, 0, 'm', 'n'); return g;
    }
    GEAR.helm(g, 'n', 'Y'); paint(g, ['.b............b.', '.bb..........bb.', '..b..........b..']);
    GEAR.plate(g, 'n', 'Y', 'p'); GEAR.pads(g, 'n', 'Y', true); GEAR.skirt(g, 'Y', 'p'); GEAR.belt(g, 'F', 'g'); axe(g, 2, 'm', 'n', 'F'); return g;
  },
  // 亚马逊 B：拳法家（丸子头、旗袍、缠拳）
  amazon_b(t) {
    const g = girl(grid(BODY));
    paint(g, ['.hhk........khh.', 'hhhk........khhh', '.hh..........hh.']); put(g, 2, 1, 'r'); put(g, 13, 1, 'r');
    fill(g, 4, 9, 11, 12, 'p', 'pq'); put(g, 7, 9, 'g'); put(g, 8, 10, 'g'); put(g, 7, 11, 'g'); hline(g, 5, 10, 12, 'g'); GEAR.skirt(g, 'p', 'q');
    paint(g, ['', '', '', '', '', '', '', '', '', '', '..WWk......kWW..', '..WWk......kWW..']); sparkle(g, [[0, 9], [15, 9]], 'o'); return g;
  },
  // 小偷系（百合）：小偷（短斗篷兜帽 + 短刀）→ 杀手（暗紫装 + 红围巾 + 双刀）
  pickpocket(t) {
    t = tierOf(t, 2); const g = girl(grid(BODY));
    if (t === 0) {
      fill(g, 2, 1, 13, 3, 'f', 'h'); hline(g, 3, 12, 4, 'F'); GEAR.cape(g, 'f', 'F', null, true); fill(g, 4, 9, 11, 11, 'F', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p');
      GEAR.belt(g, 'F', 'y'); GEAR.boots(g, 'F'); vline(g, 13, 6, 9, 'm'); hline(g, 12, 14, 10, 'F'); put(g, 13, 11, 'F'); return g;
    }
    fill(g, 4, 9, 11, 14, 'D', 'pq'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p'); GEAR.belt(g, 'd', 'r');
    hline(g, 3, 12, 9, 'r'); paint(g, ['', '', '', '', '', '', '', '', '', '', 'r', 'rR', '.R']); hline(g, 3, 12, 8, 'd'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k');
    vline(g, 13, 4, 9, 'v'); hline(g, 12, 14, 10, 'k'); put(g, 13, 11, 'r'); vline(g, 2, 7, 11, 'v'); put(g, 2, 12, 'k'); sparkle(g, [[15, 3]], 'r'); return g;
  },
  // 魔术士系：魔术士（兜帽斗篷 + 星杖）→ 女巫（黑尖帽 + 扫帚）
  sorceress(t) {
    t = tierOf(t, 2); const g = girl(grid(BODY));
    if (t === 0) {
      GEAR.hood(g, 'p'); GEAR.robe(g, 'p', 'q'); GEAR.belt(g, 'g'); staff(g, 5, 'w'); paint(g, ['', '', '.............g..', '............ggg.', '.............g..']); return g;
    }
    witchHat(g, 'd', 'A', 'd'); GEAR.cape(g, 'd', 'k', 'A'); GEAR.robe(g, 'D', 'd'); vline(g, 7, 9, 11, 'p'); vline(g, 8, 9, 11, 'p'); GEAR.belt(g, 'A', 'g');
    vline(g, 13, 2, 11, 'w'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '............ggg.', '...........gogg.', '...........g.g.g']);
    sparkle(g, [[15, 2], [1, 13]], 'A'); return g;
  },
  // 修女系（托莉）：修女（黑头巾白边）→ 主教（白金主教冠 + 披肩 + 牧杖）
  nun(t) {
    t = tierOf(t, 2); const g = girl(grid(BODY));
    if (t === 0) {
      fill(g, 0, 0, 15, 11, 'k', 'h'); fill(g, 2, 1, 13, 4, 'k'); hline(g, 3, 12, 4, 'W'); fill(g, 4, 5, 11, 5, 's', 'k'); for (const [x, y] of [[3, 5], [12, 5], [3, 6], [12, 6], [3, 7], [12, 7]]) put(g, x, y, 'W');
      GEAR.robe(g, 'k', 'Y'); hline(g, 5, 10, 9, 'W'); vline(g, 7, 10, 12, 'p'); vline(g, 8, 10, 12, 'p'); put(g, 7, 10, 'g'); GEAR.belt(g, 'W');
      staff(g, 4, 'w'); vline(g, 13, 0, 4, 'g'); put(g, 12, 1, 'g'); put(g, 14, 1, 'g'); return g;
    }
    GEAR.cape(g, 'p', 'q', 'g'); paint(g, ['......kWWk......', '.....kWggWk.....', '....kWWggWWk....', '....kWWggWWk....', '...kggggggggk...']);
    GEAR.robe(g, 'W', 'g'); vline(g, 6, 9, 14, 'p'); vline(g, 9, 9, 14, 'p'); GEAR.pads(g, 'g', 'a');
    staff(g, 3, 'g'); paint(g, ['............ggg.', '............g.g.', '..............g.']); return g;
  },
  // 修女 B：精灵使（花冠、绿裙、精灵光点环绕）
  nun_b(t) {
    const g = girl(grid(BODY));
    hline(g, 3, 12, 4, 'G'); for (const x of [3, 6, 9, 12]) put(g, x, 4, 'P'); put(g, 7, 4, 'r'); put(g, 8, 4, 'L');
    GEAR.robe(g, 'G', 'H'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); hline(g, 5, 10, 12, 'P');
    staff(g, 4, 'w'); paint(g, ['............GG..', '...........GPGG.', '............GG..']);
    paint(g, ['', '.c', 'cWc', '.c', '', '', '', '', '', '', '', '..............L.', '.............LWL', '..............L.']); sparkle(g, [[15, 4], [0, 12]], 'G'); return g;
  },
  // 元素使系（贝里奇娜）：元素使（四色宝石杖）→ 大元素使（四元素光球环绕 + 披风）
  elementalist(t) {
    t = tierOf(t, 2); const g = girl(grid(BODY));
    GEAR.robe(g, 'W', 'p'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); put(g, 5, 13, 'r'); put(g, 6, 13, 'C'); put(g, 9, 13, 'G'); put(g, 10, 13, 'O');
    staff(g, 4, 'g'); paint(g, ['', '............r...', '...........GLC..', '............O...']);
    if (t === 0) { GEAR.circlet(g, 'm', 'c'); GEAR.belt(g, 'g'); return g; }
    GEAR.cape(g, 'D', 'd', 'g'); GEAR.crown(g, 'g', 'c'); GEAR.belt(g, 'g', 'L');
    paint(g, ['.r..............', 'rLr.............', '.r..............', '', '', '', '', '', '...............', '', '.C............G.', 'CWC..........GWG', '.C............G.', '', '..............O.', '.............OLO']);
    return g;
  },
  // 召唤士系（男女皆可）：召唤士（兜帽 + 召唤书）→ 召唤师（法阵 + 小魔宠随身）
  summoner(t) {
    t = tierOf(t, 2); const g = grid(BODY);
    GEAR.hood(g, 'q'); GEAR.robe(g, 'p', 'q'); GEAR.belt(g, 'g', 'A'); put(g, 7, 10, 'A'); put(g, 8, 10, 'A');
    paint(g, ['', '', '', '', '', '', '', '', '', '', 'kkkk', 'kwRk', 'kwRk', 'kkkk']);
    staff(g, 4, 'w'); paint(g, ['', '', '............AA..', '...........AWWA.', '............AA..']);
    if (t === 0) return g;
    GEAR.cape(g, 'd', 'D', 'A'); fill(g, 2, 1, 13, 4, 'd', 'q'); hline(g, 3, 12, 4, 'A');
    hline(g, 1, 14, 15, 'A'); put(g, 0, 15, 'c'); put(g, 15, 15, 'c');
    paint(g, ['kk..', 'kCCk', 'CWkC', 'kCCk', '.kk.']); sparkle(g, [[4, 0], [15, 7]], 'A'); return g;
  },

  // ===== 隐藏职业（单阶、华丽终极造型）=====
  // 克荷林：剑圣（白金 + 金光圣剑）/ 剑邪（黑红魔剑 + 红气）/ 狮鹫骑士（骑狮鹫飞行）
  gSwordSaint() {
    const g = grid(BODY); GEAR.cape(g, 'W', 'j', 'g'); paint(g, ['...LLLLLLLLLL...']); GEAR.circlet(g, 'g', 'c');
    fill(g, 4, 9, 11, 14, 'W', 'pq'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'g', 'c'); hline(g, 5, 6, 14, 'g'); hline(g, 9, 10, 14, 'g');
    put(g, 13, 0, 'L'); vline(g, 13, 1, 9, 'L'); vline(g, 14, 0, 9, 'g'); hline(g, 11, 15, 10, 'g'); put(g, 13, 11, 'W'); sparkle(g, [[15, 2], [12, 0], [0, 4], [15, 7]]); return g;
  },
  gSwordEvil() {
    const g = grid(BODY); GEAR.cape(g, 'k', 'R', 'e'); paint(g, ['..R..........R..', '..RR........RR..']); eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L');
    GEAR.plate(g, 'k', 'R', 'e'); GEAR.pads(g, 'R', 'k', true); fill(g, 5, 13, 10, 14, 'k', 'pq'); GEAR.belt(g, 'R', 'e');
    put(g, 13, 0, 'e'); vline(g, 13, 1, 9, 'e'); vline(g, 14, 0, 9, 'R'); hline(g, 11, 15, 10, 'k'); put(g, 13, 11, 'R'); sparkle(g, [[15, 2], [12, 0], [0, 6], [15, 9], [1, 15]], 'e'); return g;
  },
  gGriffin() {
    const g = grid([]), r = grid(BODY); GEAR.plate(r, 'm', 'i', 'r'); put(r, 7, 10, 'g'); GEAR.pads(r, 'g', 'a'); GEAR.circlet(r, 'g', 'r');
    griffin(g, r, 'g'); lanceUp(g, 'v', 'g', 'r'); return g;
  },
  // 麦斯：弓王 / 暗影狙击手
  gBowKing() {
    const g = grid(BODY); GEAR.cape(g, 'R', 'r', 'g', true); GEAR.crown(g, 'g', 'c'); quiver(g); GEAR.plate(g, 'w', 'f', 'g'); GEAR.pads(g, 'g', 'a'); GEAR.belt(g, 'g', 'c');
    vline(g, 1, 1, 14, 'g'); put(g, 2, 0, 'L'); put(g, 2, 15, 'L'); put(g, 0, 7, 'g'); vline(g, 3, 1, 14, 'L'); paint(g, ['', '', '', '', '', '', '', '', '', '', '...LLLLLLLLW']); sparkle(g, [[15, 3], [0, 1]]); return g;
  },
  gShadowSniper() {
    const g = grid(BODY); GEAR.cape(g, 'k', 'd', 'Y', true); GEAR.hood(g, 'k'); hline(g, 3, 12, 8, 'k'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); put(g, 10, 6, 'e'); put(g, 9, 7, 'e'); put(g, 10, 7, 'e');
    fill(g, 4, 9, 11, 14, 'd', 'pq'); vline(g, 7, 9, 11, 'p'); GEAR.belt(g, 'k', 'e'); quiver(g);
    bow(g, 1, 15, 'k', 'e'); paint(g, ['', '', '', '', '', '', '', '', '', '', '...eeeeeeW']); sparkle(g, [[15, 4]], 'e'); return g;
  },
  // 贝里奇娜：光之圣女 / 超灵体
  gLightMaiden() {
    const g = girl(grid(BODY)); paint(g, ['', '', '', '', 'L..............L', 'LL............LL', 'WLL..........LLW', 'WWL..........LWW', '.WL..........LW.', '..L..........L..']); girl(g);
    paint(g, ['...LLLLLLLLLL...']); GEAR.crown(g, 'g', 'c'); GEAR.robe(g, 'W', 'g'); vline(g, 7, 9, 12, 'p'); vline(g, 8, 9, 12, 'p'); GEAR.belt(g, 'g', 'L');
    staff(g, 4, 'g'); paint(g, ['............LL..', '...........LWWL.', '...........LWWL.', '............LL..']); sparkle(g, [[0, 1], [15, 1], [1, 15], [14, 15]]); return g;
  },
  gSpirit() {
    const g = recolor(girl(grid(BODY)), { s: 'v', h: 'c', P: 'c', p: 'c', q: 'C', g: 'W' });
    eyes(g, 'C'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W'); fill(g, 4, 13, 11, 15, '.'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '', '', '.....cWWc......', '......cc.......', '.......c........']);
    put(g, 7, 10, 'p'); put(g, 8, 10, 'p'); paint(g, ['.W............W.', 'WcW..........WcW', '.W............W.', '', '', '', '', '', '', '', '', '', 'c..............c', '.c............c.']); return g;
  },
  // 波比：幽冥斧王 / 雷风斧王
  gNetherAxe() {
    const g = grid(BODY); GEAR.cape(g, 'k', 'H', 'G'); GEAR.helm(g, 'Y', 'k'); paint(g, ['..b..........b..', '..bb........bb..']); eyes(g, 'G'); put(g, 5, 6, 'W'); put(g, 9, 6, 'W');
    GEAR.plate(g, 'Y', 'k', 'G'); GEAR.pads(g, 'b', 'B', true); fill(g, 5, 13, 10, 14, 'Y', 'pq'); GEAR.belt(g, 'k', 'G');
    axe(g, 3, 'G', 'H', 'k'); sparkle(g, [[0, 5], [1, 15], [15, 9], [12, 0]], 'G'); return g;
  },
  gThunderAxe() {
    const g = grid(BODY); GEAR.cape(g, 'C', 'U', 'L'); GEAR.helm(g, 'C', 'U'); paint(g, ['..L..........L..', '...L........L...']);
    GEAR.plate(g, 'm', 'C', 'L'); GEAR.pads(g, 'L', 'g', true); GEAR.belt(g, 'U', 'L'); GEAR.boots(g, 'U');
    axe(g, 3, 'L', 'C', 'U'); paint(g, ['', '', '', '', '', 'L', '.L', 'L', '.L', '', '', '', '', '', '', '']); sparkle(g, [[15, 9], [12, 0], [0, 12]], 'L'); return g;
  },
  // 寇琪：魔剑使 / 魔法剑士
  gMagicBlade() {
    const g = girl(grid(BODY)); GEAR.cape(g, 'd', 'D', 'A'); GEAR.crown(g, 'D', 'A'); GEAR.plate(g, 'd', 'D', 'A'); GEAR.pads(g, 'D', 'A', true); GEAR.skirt(g, 'd', 'A'); GEAR.belt(g, 'A', 'e');
    put(g, 13, 0, 'A'); vline(g, 13, 1, 9, 'A'); vline(g, 14, 0, 9, 'D'); hline(g, 11, 15, 10, 'k'); put(g, 13, 11, 'e'); sparkle(g, [[15, 2], [12, 0], [0, 4], [15, 7]], 'A'); return g;
  },
  gSpellSword() {
    const g = girl(grid(BODY)); GEAR.cape(g, 'C', 'U', 'c'); GEAR.circlet(g, 'c', 'W'); GEAR.plate(g, 'W', 'C', 'c'); GEAR.pads(g, 'C', 'U', true); GEAR.skirt(g, 'C', 'U'); GEAR.belt(g, 'c', 'W');
    blade(g, 0, 'c', 'C', 'm', true); paint(g, ['', '', '', '', '', '', '', '', '..g', '.gcg', '..g.', '..w', '..w', '..w', '..w']); sparkle(g, [[15, 1], [12, 0], [0, 6]], 'c'); return g;
  },
  // 普鲁丝：阎魔使（判官冠 + 红黑朝服 + 生死簿 + 冥火）/ 圣魔使（一侧白羽一侧黑翼）
  gYama() {
    const g = girl(grid(BODY)); paint(g, ['.kkkkkkkkkkkkkk.', '..kRRRRRRRRRRk..', '...kgggggggk....', '...kRRgRRgRk....', '..kkkkkkkkkkkk..']);
    GEAR.robe(g, 'R', 'k'); hline(g, 4, 11, 9, 'k'); vline(g, 7, 10, 13, 'g'); vline(g, 8, 10, 13, 'g'); GEAR.belt(g, 'g', 'e');
    paint(g, ['', '', '', '', '', '', '', '', '', '', 'kkkk', 'kbbk', 'kbkk', 'kbbk', 'kkkk']);
    staff(g, 4, 'k'); paint(g, ['............ee..', '...........eooe.', '...........eooe.', '............ee..']); sparkle(g, [[0, 3], [15, 8], [14, 15]], 'e'); return g;
  },
  gHolyDemon() {
    const g = girl(grid(BODY)); paint(g, ['', '', '', '', '', 'W..............k', 'WW............dk', 'jWW..........ddD', 'jjW..........dDD', '.jW..........dD.', '..j..........D..']); girl(g);
    paint(g, ['...LLLL.........', '..........RR....']); GEAR.robe(g, 'W', 'd'); fill(g, 9, 9, 10, 14, 'd'); hline(g, 5, 10, 12, 'g'); vline(g, 7, 9, 11, 'p');
    staff(g, 4, 'g'); paint(g, ['............LA..', '...........LWAA.', '...........LWdA.', '............LA..']); sparkle(g, [[0, 1]], 'L'); sparkle(g, [[15, 1]], 'A'); return g;
  },
  // 百合：特攻（战术装备 + 护目镜）/ 影忍（黑装 + 红巾 + 光眼）
  gSpecialOps() {
    const g = girl(grid(BODY)); hline(g, 3, 12, 4, 'Y'); put(g, 5, 4, 'c'); put(g, 6, 4, 'c'); put(g, 9, 4, 'c'); put(g, 10, 4, 'c');
    fill(g, 4, 9, 11, 14, 'H', 'pq'); GEAR.plate(g, 'Y', 'k', 'H'); put(g, 7, 10, 'p'); put(g, 8, 10, 'p'); GEAR.pads(g, 'Y', 'k'); GEAR.belt(g, 'k', 'y'); for (const x of [5, 10]) put(g, x, 12, 'F'); GEAR.boots(g, 'k');
    vline(g, 13, 4, 9, 'v'); hline(g, 12, 14, 10, 'k'); put(g, 13, 11, 'k'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '.kk', '.kgk', '.kk']); return g;
  },
  gShadowNinja() {
    const g = girl(grid(BODY)); GEAR.hood(g, 'k'); hline(g, 3, 12, 4, 'r'); hline(g, 3, 12, 8, 'k'); put(g, 2, 8, 'k'); put(g, 13, 8, 'k'); eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L');
    fill(g, 4, 9, 11, 14, 'k', 'pq'); fill(g, 4, 9, 11, 14, 'k', 's'); put(g, 4, 10, 'd'); put(g, 11, 10, 'd'); GEAR.belt(g, 'r', 'p');
    paint(g, ['', '', '', '', '', '', '', '', '', '...rr', '..rrR', '.rrR', 'rrR', 'rR', 'R']);
    katana(g, 0, 'v', 'e', 'k'); sparkle(g, [[15, 2], [12, 0], [0, 3]], 'e'); return g;
  },
  // 力奇：海贼王（羽饰船长帽 + 金外套 + 双弯刀 + 宝光）/ 黑海霸主（珊瑚冠 + 海蓝甲 + 浪纹披风）
  gPirateKing() {
    const g = grid(BODY);
    paint(g, ['..kkkkkkkkkkWWW.', '.kkkkkkkkkkkkWW.', 'kkkkkWkkkkkkkkk.', '.kggggggggggggk.', '..kkkkkkkkkkkk..']); put(g, 6, 2, 'W'); put(g, 7, 2, 'W');
    GEAR.cape(g, 'g', 'a', 'R'); fill(g, 4, 9, 11, 14, 'g', 'pq'); vline(g, 7, 9, 11, 'W'); vline(g, 8, 9, 11, 'p'); hline(g, 4, 11, 9, 'R'); GEAR.belt(g, 'R', 'c'); GEAR.boots(g, 'k');
    vline(g, 13, 3, 9, 'v'); put(g, 14, 2, 'v'); vline(g, 14, 4, 8, 'm'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'k');
    vline(g, 1, 5, 10, 'v'); put(g, 2, 4, 'v'); hline(g, 0, 2, 11, 'g'); put(g, 1, 12, 'k'); sparkle(g, [[15, 6], [0, 14], [15, 13]], 'L'); return g;
  },
  gSeaLord() {
    const g = grid(BODY); GEAR.cape(g, 'C', 'U', 'c'); paint(g, ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '.ccc........ccc.', 'c...c......c...c']);
    paint(g, ['...r.P..P.r.....', '...rrPPPPrr.....', '....cccccc......']); GEAR.plate(g, 'C', 'U', 'c'); GEAR.pads(g, 'c', 'C', true); GEAR.belt(g, 'U', 'g'); GEAR.boots(g, 'U');
    vline(g, 13, 2, 14, 'g'); paint(g, ['............c.c.', '............ccc.', '.............c..']); put(g, 13, 0, 'c'); sparkle(g, [[15, 6], [0, 4]], 'c'); return g;
  },
  // 娜菲雅：邪剑使 / 神剑使
  gEvilSword() {
    const g = girl(grid(BODY)); GEAR.cape(g, 'k', 'R', 'e'); paint(g, ['..R..........R..', '..RR........RR..']); eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L');
    GEAR.plate(g, 'k', 'R', 'e'); GEAR.pads(g, 'R', 'k', true); GEAR.skirt(g, 'k', 'R'); GEAR.belt(g, 'e', 'k');
    put(g, 13, 0, 'e'); vline(g, 13, 1, 9, 'e'); vline(g, 14, 2, 9, 'R'); hline(g, 12, 14, 10, 'k'); put(g, 12, 9, 'k'); put(g, 13, 11, 'e'); sparkle(g, [[15, 1], [12, 0], [0, 5], [15, 7]], 'e'); return g;
  },
  gHolySword() {
    const g = girl(grid(BODY)); GEAR.cape(g, 'W', 'j', 'g'); GEAR.crown(g, 'g', 'c'); GEAR.plate(g, 'W', 'j', 'g'); GEAR.pads(g, 'W', 'g', true); GEAR.skirt(g, 'W', 'g'); GEAR.belt(g, 'g', 'c');
    put(g, 13, 0, 'L'); vline(g, 13, 1, 9, 'W'); vline(g, 14, 1, 9, 'L'); hline(g, 11, 15, 10, 'g'); put(g, 11, 9, 'W'); put(g, 15, 9, 'W'); put(g, 13, 11, 'g'); sparkle(g, [[15, 1], [12, 0], [0, 4], [15, 6]]); return g;
  },
  // 努莎伊：光明骑士（金甲白马 + 光枪）/ 圣骑士（金翼天马 + 光环）
  gLightKnight() {
    const g = grid([]), r = girl(grid(BODY)); GEAR.helm(r, 'g', 'a'); GEAR.plume(r, 'W'); GEAR.plate(r, 'W', 'g', 'L'); GEAR.pads(r, 'g', 'a', true);
    mounted(g, r, { 1: 'W', 2: 'j', M: 'L', F: 'g' }, ['', '', '', '', '', '', '', '', '', '', '', '...gggggggggg', '...ggLggggLgg', '...LLLLLLLLLL', '...g.g....g.g'], 'g');
    put(g, 1, 12, 'g'); put(g, 3, 11, 'g'); lanceUp(g, 'L', 'g', 'W'); sparkle(g, [[12, 0], [0, 4], [15, 8]]); return g;
  },
  gHolyKnight() {
    const g = grid([]), r = girl(grid(BODY)); paint(r, ['...LLLLLLLLLL...']); GEAR.crown(r, 'g', 'c'); GEAR.plate(r, 'g', 'a', 'W'); GEAR.pads(r, 'W', 'j', true);
    pegasus(g, r, ['', '', '', '', '', '', '', '', '', '', '', '...gggggggggg', '...ggWggggWgg', '...WWWWWWWWWW', '...g.g....g.g'], 'g', 'L');
    lanceUp(g, 'L', 'g', 'W'); sparkle(g, [[12, 0], [15, 8]]); return g;
  },

  // ===== g4 敌人 =====
  // 蒙面人：黑兜帽 + 白面具 → 队长：红边斗篷 + 双刀
  maskman(t) {
    t = tierOf(t, 2); const g = grid(BODY); GEAR.hood(g, 'k'); fill(g, 3, 5, 12, 8, 'W', 'shPkR'); for (const [x, y] of [[5, 6], [6, 6], [9, 6], [10, 6]]) put(g, x, y, 'k'); put(g, 7, 8, 'j'); put(g, 8, 8, 'j');
    fill(g, 4, 9, 11, 14, 'k', 'pq'); put(g, 4, 10, 'Y'); put(g, 11, 10, 'Y'); hline(g, 5, 10, 12, 'p');
    vline(g, 13, 4, 9, 'm'); hline(g, 12, 14, 10, 'k'); put(g, 13, 11, 'k');
    if (t === 1) { GEAR.cape(g, 'k', 'r', 'r'); hline(g, 3, 12, 4, 'r'); vline(g, 2, 6, 11, 'm'); put(g, 2, 12, 'k'); put(g, 5, 7, 'e'); put(g, 10, 7, 'e'); }
    return g;
  },
  // 异界魔物：触手独眼
  outsider() {
    return grid([
      '',
      '.....kkkkkk.....',
      '...kkDDDDDDkk...',
      '..kDDAAAAAADDk..',
      '.kDAAWWWWWWAADk.',
      '.kDAWWkkkkWWADk.',
      'kDDAWkkeekkWADDk',
      'kDDAWWkkkkWWADDk',
      '.kDDAAWWWWAADDk.',
      '..kDDDAAAADDDk..',
      '.kDkDDDDDDDDkDk.',
      'kDk.kDkDDkDk.kDk',
      'kDk.kDk.kDk..kDk',
      '.kDk.kDkkDk.kDk.',
      '..kk..kk.kk..kk.',
    ]);
  },
  // 狂神：浮空的狂乱神祇（角冠、金饰、六翼、狂气）
  madGod() {
    const g = grid(BODY); recolor(g, { s: 'j', P: 'j', h: 'W' });
    paint(g, ['k.k..........k.k', 'dkdk........kdkd', 'Dddk........kddD', 'DDdk........kdDD', 'kDDdk......kdDDk', '.kDDd......dDDk.', 'dkDDd......dDDkd', 'DdkDd......dDkdD', '.DDkd......dkDD.', '..DDk......kDD..']);
    paint(g, ['..g.gg.gg.gg.g..', '...gggggggggg...', '....kgkeekgk....']); eyes(g, 'e'); put(g, 5, 6, 'L'); put(g, 9, 6, 'L');
    GEAR.robe(g, 'd', 'g'); hline(g, 4, 11, 9, 'g'); put(g, 7, 10, 'e'); put(g, 8, 10, 'e'); vline(g, 7, 11, 13, 'g'); vline(g, 8, 11, 13, 'g'); fill(g, 3, 15, 12, 15, '.');
    sparkle(g, [[0, 12], [15, 12], [1, 14], [14, 14]], 'A'); return g;
  },
  // 狂神·真身：巨口多眼的异形之神
  madGod2() {
    return grid([
      'k.kk........kk.k',
      'RkRRk.kkkk.kRRkR',
      'kRRdkkddddkkdRRk',
      '.kddddeddeddddk.',
      'kddekddddddkeddk',
      'kdddddLeeLdddddk',
      'DkddddeeeedddkD.',
      'DDkdkkkkkkkkdkDD',
      'kDDkWkWkWkWkWkDk',
      'kDdkkkkeekkkkdDk',
      '.kddkWkWkWkWkddk',
      'kDdddkkkkkkdddDk',
      'kDkdddddddddkkDk',
      'kAkdDkdddkDdkkAk',
      '.Ak.kAk.kAk.kAk.',
      '..A..A...A...A..',
    ]);
  },
});
// 隐藏职业白龙 / 黑龙：沿用 'dragon' 0 阶造型，用变体色调（'black' 已有）
VARIANT_PAL.white = { G: '#e8eef8', H: '#9aa8c4' };
}
