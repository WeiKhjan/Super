// 像素精灵：16x16 字符画，按阵营配色后缓存为离屏画布
'use strict';

const PAL_BASE = {
  k: '#1a1020', s: '#f2c79a', S: '#c99a6e', m: '#d6dcea', n: '#7a8296', w: '#8a5a2c', W: '#ffffff',
  g: '#f4c542', G: '#5aa04a', H: '#2f6a2a', r: '#d83a3a', P: '#f29ab0', b: '#ece4c8', B: '#a89c7c',
  f: '#7a4a2a', F: '#4a2a14', y: '#9a9aa8', Y: '#5a5a6a', d: '#3a2050', D: '#6a3a8a', o: '#ff8a2a',
  c: '#7ad8ff', C: '#2a8ad8', e: '#ff3030', O: '#b0702a', K: '#1a1020',
  // 转职外观用：银、暗金、淡金光、暗红、马棕、刃光、魔紫、白马阴影
  i: '#a4aec4', a: '#b07a1e', L: '#fff1a0', R: '#9a1e24', u: '#b0703a', v: '#eaf8ff', A: '#c66aff', j: '#c8ccd8',
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
}
