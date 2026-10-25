// 像素精灵：16x16 字符画，按阵营配色后缓存为离屏画布
'use strict';

const PAL_BASE = {
  k: '#1a1020', s: '#f2c79a', S: '#c99a6e', m: '#d6dcea', n: '#7a8296', w: '#8a5a2c', W: '#ffffff',
  g: '#f4c542', G: '#5aa04a', H: '#2f6a2a', r: '#d83a3a', P: '#f29ab0', b: '#ece4c8', B: '#a89c7c',
  f: '#7a4a2a', F: '#4a2a14', y: '#9a9aa8', Y: '#5a5a6a', d: '#3a2050', D: '#6a3a8a', o: '#ff8a2a',
  c: '#7ad8ff', C: '#2a8ad8', e: '#ff3030',
};
const TEAM_PAL = {
  player: { p: '#3a7bd5', q: '#1f4a8a' },
  ally:   { p: '#3aa860', q: '#1f6a3a' },
  enemy:  { p: '#d8433a', q: '#8a1f1f' },
  rogue:  { p: '#b08a3a', q: '#6a4a1a' },
};

const BODY = [
  '................',
  '......kkkk......',
  '.....khhhhk.....',
  '....khhhhhhk....',
  '....khsssshk....',
  '....kskssksk....',
  '....kssssssk....',
  '.....kssssk.....',
  '....kqppppqk....',
  '...ksppppppsk...',
  '...ksqppppqsk...',
  '....kqqggqqk....',
  '....kppkkppk....',
  '....kqqkkqqk....',
  '....kkk..kkk....',
  '................',
];

function grid(rows) { return rows.map(r => r.padEnd(16, '.').slice(0, 16).split('')); }
function put(g, x, y, c) { if (y >= 0 && y < 16 && x >= 0 && x < 16) g[y][x] = c; }
function vline(g, x, y0, y1, c) { for (let y = y0; y <= y1; y++) put(g, x, y, c); }
function hline(g, x0, x1, y, c) { for (let x = x0; x <= x1; x++) put(g, x, y, c); }
function overlay(g, rows) {
  rows.forEach((r, y) => r.split('').forEach((c, x) => { if (c !== '.') put(g, x, y, c); }));
}

function sword(g) { vline(g, 13, 3, 9, 'm'); put(g, 14, 4, 'k'); vline(g, 14, 5, 9, 'n'); hline(g, 12, 14, 10, 'g'); put(g, 13, 11, 'w'); }
function robe(g, c1, c2) { hline(g, 4, 11, 12, c1); hline(g, 4, 11, 13, c2); hline(g, 4, 11, 14, 'k'); put(g, 4, 12, 'k'); put(g, 11, 12, 'k'); put(g, 4, 13, 'k'); put(g, 11, 13, 'k'); }
function helmet(g, c) { hline(g, 5, 10, 2, c); hline(g, 4, 11, 3, c); hline(g, 6, 9, 1, 'k'); put(g, 5, 1, 'k'); put(g, 10, 1, 'k'); }

const SPRITE_DEFS = {
  swordsman(t) { const g = grid(BODY); sword(g); if (t >= 2) helmet(g, t >= 3 ? 'g' : 'm'); if (t >= 1) { put(g, 7, 11, 'g'); put(g, 8, 11, 'g'); hline(g, 5, 10, 8, 'q'); } return g; },
  knight(t) {
    const g = grid(BODY); helmet(g, 'm'); put(g, 7, 0, 'p'); put(g, 8, 0, 'p');
    vline(g, 13, 0, 13, 'w'); put(g, 13, 0, 'm'); put(g, 13, 1, 'm'); put(g, 12, 1, 'm'); put(g, 14, 1, 'm');
    overlay(g, ['', '', '', '', '', '', '', '', '', '..kk', '.kmmk', '.kmpk', '.kmmk', '..kk']);
    if (t >= 3) { overlay(g, ['', '', '', '', '', '', '', 'WW', 'WWW', '.WW', '', '', '']); }
    return g;
  },
  archer(t) {
    const g = grid(BODY); hline(g, 5, 10, 2, 'q'); hline(g, 4, 11, 3, 'q'); put(g, 4, 4, 'q'); put(g, 11, 4, 'q');
    vline(g, 1, 6, 11, 'w'); put(g, 2, 5, 'w'); put(g, 2, 12, 'w'); vline(g, 3, 6, 11, 'W');
    if (t >= 2) { put(g, 12, 6, 'g'); put(g, 12, 7, 'g'); }
    return g;
  },
  mage(t) {
    const g = grid(BODY);
    overlay(g, ['.......kk.......', '......kppk......', '.....kppppk.....', '...kkppppppkk...', '..kqqqqqqqqqqk..']);
    robe(g, 'p', 'q'); hline(g, 5, 10, 11, 'q');
    vline(g, 13, 4, 13, 'w'); put(g, 13, 3, t >= 2 ? 'c' : 'r'); put(g, 12, 3, 'k'); put(g, 14, 3, 'k'); put(g, 13, 2, 'k');
    if (t >= 3) { put(g, 7, 2, 'g'); put(g, 8, 2, 'g'); }
    return g;
  },
  priest(t) {
    const g = grid(BODY);
    overlay(g, ['', '......kkkk......', '.....kWWWWk.....', '....kWWWWWWk....', '....kWsssskk....']);
    put(g, 4, 5, 'W'); put(g, 11, 5, 'W');
    for (let y = 8; y <= 13; y++) for (let x = 5; x <= 10; x++) if (g[y][x] !== 'k' && g[y][x] !== 's') g[y][x] = 'W';
    robe(g, 'W', 'p'); vline(g, 7, 8, 11, 'p'); vline(g, 8, 8, 11, 'p');
    vline(g, 13, 3, 13, 'w'); hline(g, 12, 14, 3, 'g'); vline(g, 13, 2, 4, 'g');
    if (t >= 2) { put(g, 7, 2, 'g'); put(g, 8, 2, 'g'); }
    return g;
  },
  spellblade() {
    const g = grid(BODY); sword(g); hline(g, 5, 10, 5, 'k'); put(g, 6, 5, 'c'); put(g, 9, 5, 'c');
    vline(g, 3, 8, 13, 'q'); vline(g, 12, 8, 13, 'q'); hline(g, 4, 11, 8, 'd');
    return g;
  },
  master() {
    const g = grid(BODY); sword(g); hline(g, 5, 10, 7, 'W'); hline(g, 6, 9, 8, 'W'); put(g, 7, 9, 'W'); put(g, 8, 9, 'W');
    put(g, 7, 11, 'g'); put(g, 8, 11, 'g');
    return g;
  },
  bandit() {
    const g = grid(BODY); hline(g, 4, 11, 3, 'r'); hline(g, 5, 10, 2, 'r'); put(g, 12, 3, 'r'); put(g, 13, 4, 'r');
    vline(g, 13, 4, 12, 'w'); overlay(g, ['', '', '', '', '', '...........kkk..', '..........kmmmk.', '..........kmmmk.', '...........kkk..']);
    return g;
  },
  shaman() {
    const g = grid(BODY);
    overlay(g, ['.......kk.......', '......kffk......', '.....kffffk.....', '....kffffffk....', '....kfsssfk.....']);
    robe(g, 'f', 'F'); for (let y = 8; y <= 11; y++) for (let x = 5; x <= 10; x++) if (g[y][x] === 'p' || g[y][x] === 'q' || g[y][x] === 'g') g[y][x] = 'f';
    put(g, 6, 9, 'p'); put(g, 9, 9, 'p');
    vline(g, 13, 4, 13, 'w'); overlay(g, ['', '', '...........kbbk.', '...........bkkb.', '...........kbbk.']);
    return g;
  },
  emperor() {
    const g = grid(BODY); sword(g);
    overlay(g, ['....g.g..g.g....', '....gggggggg....', '....kgrggrgk....']);
    vline(g, 3, 8, 14, 'r'); vline(g, 12, 8, 14, 'r'); hline(g, 5, 10, 8, 'g');
    return g;
  },
  darkKnight() {
    const g = grid(BODY); helmet(g, 'Y'); hline(g, 5, 10, 4, 'Y'); hline(g, 5, 10, 5, 'k'); put(g, 6, 5, 'e'); put(g, 9, 5, 'e');
    for (let y = 8; y <= 13; y++) for (let x = 4; x <= 11; x++) if (g[y][x] === 'p' || g[y][x] === 'q') g[y][x] = y % 2 ? 'Y' : 'd';
    vline(g, 13, 0, 13, 'F'); put(g, 13, 0, 'm'); put(g, 12, 1, 'm'); put(g, 14, 1, 'm'); put(g, 13, 1, 'm');
    return g;
  },
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
// 返回离屏画布 (16x16 像素)
function getSprite(key, tier, team, hair) {
  const id = `${key}|${tier}|${team}|${hair || ''}`;
  if (SPRITE_CACHE[id]) return SPRITE_CACHE[id];
  const def = SPRITE_DEFS[key] || SPRITE_DEFS.swordsman;
  const g = def(tier || 0);
  const pal = Object.assign({}, PAL_BASE, TEAM_PAL[team] || TEAM_PAL.enemy, { h: hair || '#3a2a1a' });
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
