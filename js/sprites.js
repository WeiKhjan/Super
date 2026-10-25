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

function grid(rows) { const r = rows.slice(0, 16); while (r.length < 16) r.push(''); return r.map(x => x.padEnd(16, '.').slice(0, 16).split('')); }
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
  soldier() {
    const g = grid(BODY); helmet(g, 'n'); sword(g); hline(g, 5, 10, 11, 'w');
    return g;
  },
  captain() {
    const g = grid(BODY); helmet(g, 'm'); put(g, 7, 0, 'r'); put(g, 8, 0, 'r'); put(g, 8, 1, 'r'); sword(g);
    put(g, 7, 11, 'g'); put(g, 8, 11, 'g'); vline(g, 3, 9, 13, 'q');
    return g;
  },
  banditRider() { const g = SPRITE_DEFS.bandit(); hline(g, 2, 13, 14, 'f'); put(g, 1, 13, 'f'); put(g, 1, 12, 'F'); put(g, 0, 12, 'F'); return g; },
  villager() { return recolor(grid(BODY), { p: 'f', q: 'F', g: 'w' }); },
  king() { return SPRITE_DEFS.emperor(); },
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
  medusa() {
    const g = grid(BODY);
    overlay(g, ['.G.G.kkkk.G.G...', '..GkGGGGGGkG....', '.GkGGGGGGGGkG...', '..kGGGGGGGGk....', '....kGsssGk.....', '....kseseesk....']);
    robe(g, 'G', 'H'); return g;
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
  angel() {
    const g = grid(BODY);
    overlay(g, ['....gggggg......', '', '', '', '', '', 'WW............WW', 'WWW..........WWW', '.WWW........WWW.', '..WW........WW..']);
    for (let y = 8; y <= 13; y++) for (let x = 5; x <= 10; x++) if (g[y][x] === 'p' || g[y][x] === 'q') g[y][x] = 'W';
    hline(g, 5, 10, 2, 'g');
    return g;
  },
  turtle() {
    return grid(['', '', '', '', '.....kkkkkk.....', '...kkGHGHGHkk...', '..kGHGHGHGHGHk..', '.kHGHGHGHGHGHGk.', 'kkGHGHGHGHGHGHkk', 'kssGGGGGGGGGGkss',
      '.kkkssk..kssk.k.', '...kkk....kkk...']);
  },
});

// ---------- v3：转职外观 ----------
// 每次转职都要在手机地图上一眼看出：剪影（头盔 / 护肩 / 披风 / 武器尺寸）与配色（布 → 钢 → 银 → 金 → 光）同时升级。
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

const GEAR = {
  belt(g, c, buckle) { hline(g, 5, 10, 11, c); if (buckle) { put(g, 7, 11, buckle); put(g, 8, 11, buckle); } },
  boots(g, c) { hline(g, 5, 6, 13, c); hline(g, 9, 10, 13, c); },
  // 头带，带尾飘向右后
  band(g, c, tail) { hline(g, 4, 11, 3, c); if (tail) { put(g, 12, 3, c); put(g, 12, 4, c); } },
  // 护肩：big 时更宽更高
  pads(g, L, D, big) {
    put(g, 3, 8, L); put(g, 4, 8, L); put(g, 3, 9, D); put(g, 11, 8, L); put(g, 12, 8, L); put(g, 12, 9, D);
    if (big) { put(g, 2, 8, L); put(g, 2, 9, D); put(g, 13, 8, L); put(g, 13, 9, D); put(g, 3, 7, L); put(g, 4, 7, 'k'); put(g, 12, 7, L); put(g, 11, 7, 'k'); }
  },
  // 胸甲：mid = 中央罩袍 / 纹章色
  plate(g, L, D, mid) {
    hline(g, 5, 10, 8, L); hline(g, 5, 10, 9, L); hline(g, 5, 10, 10, D); put(g, 5, 9, D); put(g, 10, 9, D);
    if (mid) { put(g, 7, 9, mid); put(g, 8, 9, mid); put(g, 7, 10, mid); put(g, 8, 10, mid); }
  },
  // 披风：从肩后垂下，左侧向外摆，右侧在腿后露出；t = 镶边色
  cape(g, c1, c2, t, leftOnly) {
    const rows = ['', '', '', '', '', '', '', '',
      '...1........1...',
      '..12........21..',
      '..12........21..',
      '.112........211.',
      '.112........211.',
      '.122........221.',
      '.ttt........ttt.'];
    paint(g, leftOnly ? rows.map(r => r.slice(0, 8)) : rows, { 1: c1, 2: c2, t: t || c2 });
  },
  helm(g, L, D) {
    hline(g, 6, 9, 1, 'k'); hline(g, 5, 10, 2, L); hline(g, 4, 11, 3, L); put(g, 4, 3, D); put(g, 11, 3, D); put(g, 5, 4, D); put(g, 10, 4, D);
    put(g, 6, 2, 'W');
  },
  plume(g, c) { paint(g, ['......cccc......', '.......cc.cc....', '...........c....'], { c }); },
  crown(g, c, gem) { paint(g, ['.....c.cc.c.....', '.....cccccc.....', '.......ee.......'], { c, e: gem || 'r' }); },
};

// 剑：x=13/14 两列刃，top = 剑尖行；big = 大护手
function blade(g, top, L, D, guard, big) {
  put(g, 13, top, L); vline(g, 13, top + 1, 9, L); vline(g, 14, top + 1, 9, D);
  hline(g, 12, 14, 10, guard); put(g, 13, 11, 'w');
  if (big) { put(g, 15, 10, guard); put(g, 12, 9, guard); put(g, 15, 9, guard); put(g, 13, 12, guard); }
}
function sparkle(g, pts, c) { for (const [x, y] of pts) put(g, x, y, c || 'L'); }

Object.assign(SPRITE_DEFS, {
  // 剑士系：布衣铁剑 → 头带钢护肩长剑 → 银盔银甲披风 → 金盔金甲红缨 → 白缨金甲 + 光剑
  swordsman(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    if (t === 0) { GEAR.belt(g, 'w'); blade(g, 5, 'y', 'Y', 'w'); return g; }
    if (t === 1) {
      GEAR.band(g, 'p'); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w');
      blade(g, 3, 'm', 'n', 'n'); return g;
    }
    if (t === 2) {
      GEAR.cape(g, 'p', 'q'); GEAR.helm(g, 'm', 'i'); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'W', 'i');
      GEAR.belt(g, 'w', 'm'); GEAR.boots(g, 'i'); blade(g, 2, 'v', 'm', 'i'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'p', 'q', 'g'); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'r'); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true);
      GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a'); blade(g, 1, 'v', 'm', 'g', true); return g;
    }
    GEAR.cape(g, 'p', 'q', 'g'); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'W'); put(g, 7, 2, 'c'); put(g, 8, 2, 'c'); GEAR.plate(g, 'g', 'a', 'W'); put(g, 7, 9, 'c'); put(g, 8, 9, 'c');
    GEAR.pads(g, 'W', 'j', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
    blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[11, 1], [15, 3], [12, 5]]); return g;
  },

  // 孟祈（作家系）：红围巾贯穿全部 7 阶
  writer(t) {
    t = tierOf(t, 7); const g = grid(BODY);
    const coat = () => { for (let y = 9; y <= 11; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); } };
    const scarf = long => { hline(g, 5, 10, 8, 'r'); put(g, 4, 9, 'r'); if (long) { put(g, 3, 8, 'r'); put(g, 2, 9, 'r'); put(g, 1, 10, 'R'); put(g, 2, 10, 'R'); } };
    if (t === 0) { coat(); GEAR.belt(g, 'w'); scarf(false); blade(g, 5, 'b', 'B', 'f'); return g; }
    if (t === 1) { GEAR.cape(g, 'f', 'F'); coat(); GEAR.belt(g, 'w', 'y'); GEAR.boots(g, 'w'); scarf(true); blade(g, 3, 'm', 'n', 'n'); return g; }
    if (t === 2) {
      GEAR.cape(g, 'f', 'F'); coat(); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); GEAR.band(g, 'W', true); paint(g, ['.......hh.......']);
      scarf(true); blade(g, 2, 'v', 'm', 'g'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'W', 'j'); GEAR.plate(g, 'm', 'i', 'W'); GEAR.pads(g, 'W', 'i'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'i');
      hline(g, 4, 11, 3, 'm'); put(g, 7, 3, 'c'); put(g, 8, 3, 'c'); scarf(true); blade(g, 1, 'v', 'm', 'g'); return g;
    }
    if (t === 4) {
      GEAR.cape(g, 'p', 'q', 'g'); GEAR.plate(g, 'm', 'i', 'p'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a');
      hline(g, 4, 11, 3, 'g'); put(g, 7, 3, 'c'); put(g, 8, 3, 'c'); scarf(true); blade(g, 1, 'v', 'm', 'g', true); return g;
    }
    if (t === 5) {
      GEAR.cape(g, 'D', 'd', 'g'); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
      GEAR.crown(g, 'g', 'c'); scarf(true); blade(g, 0, 'v', 'm', 'g', true); return g;
    }
    // 剑圣：白金长袍 + 光剑 + 金冠
    GEAR.cape(g, 'W', 'j', 'g');
    for (let y = 8; y <= 13; y++) for (let x = 5; x <= 10; x++) if ('pqgs'.includes(g[y][x]) && y >= 8) g[y][x] = (x === 5 || x === 10) ? 'j' : 'W';
    hline(g, 5, 10, 11, 'p'); put(g, 7, 11, 'g'); put(g, 8, 11, 'g'); hline(g, 5, 6, 13, 'g'); hline(g, 9, 10, 13, 'g');
    GEAR.pads(g, 'g', 'a', true); GEAR.crown(g, 'g', 'c'); scarf(true);
    blade(g, 0, 'W', 'c', 'g', true); sparkle(g, [[11, 0], [15, 2], [11, 4], [15, 6]]); return g;
  },
});

// 坐骑（面朝左，侧视）：1 = 亮色 2 = 暗色 M = 鬃毛 / 尾巴 F = 蹄
const MOUNT_BODY = [
  '', '', '', '', '', '', '', '', '', '',
  '...k1111111111k.',
  '..k11111111111MM',
  '..k22111111122kM',
  '..k11k....k11k.M',
  '..k11k....k11k..',
  '..kFFk....kFFk..',
];
const MOUNT_HEAD = [
  '', '', '', '',
  '...k............',
  '..k1k...........',
  '.k111Mk.........',
  'k1k11Mk.........',
  'k11111Mk........',
  'kk2k11Mk........',
  '...k11M.........',
];
// 斧：0 手斧 1 战斧 2 双刃斧 3 巨斧（柄在 x=13）
function axe(g, kind, L, D, shaft) {
  const heads = [
    ['', '', '', '', '..............LL', '..............LD', '..............D.'],
    ['', '', '..............L.', '..............LL', '..............LL', '..............LD', '..............DD', '..............D.'],
    ['...........L...L', '...........LL.LL', '...........LL.LL', '...........DL.LD', '...........D...D'],
    ['...........L...L', '...........LL.LL', '...........LL.LL', '...........LL.LL', '...........DL.LL', '...........D..LD', '..............DD', '...............D'],
  ];
  paint(g, heads[kind], { L, D });
  vline(g, 13, kind >= 2 ? 0 : 2, 12, shaft || 'w');
  if (kind >= 2) put(g, 13, 0, L);
}
function bow(g, top, bot, wood, tip) {
  vline(g, 1, top + 1, bot - 1, wood); put(g, 2, top, tip || wood); put(g, 2, bot, tip || wood); vline(g, 3, top + 1, bot - 1, 'W');
}
// 武士刀：细长单刃，红柄
function katana(g, top, L, D, tsuba) {
  vline(g, 13, top, 9, L); vline(g, 14, top + 2, 9, D); hline(g, 12, 14, 10, tsuba); put(g, 13, 11, 'r'); put(g, 13, 12, 'r');
}
function staff(g, top, wood) { vline(g, 13, top, 13, wood || 'w'); }

Object.assign(SPRITE_DEFS, {
  // 骑兵系：棕马 → 披甲战马 → 白色战马 → 天马 → 飞龙
  knight(t) {
    t = tierOf(t, 5); const g = grid([]);
    const H = { 1: 'u', 2: 'f', M: 'F', F: 'F' };
    if (t >= 2) Object.assign(H, { 1: 'W', 2: 'j', M: 'b', F: 'Y' });
    if (t === 3) { // 天马：大翅膀向左上展开，远侧翅膀在右后
      paint(g, ['W..........jj...', 'WW.........jWW..', 'jWW.........jW..', '.jWW............', '..jWWk..........', '...jjk..........']);
    }
    if (t <= 3) paint(g, MOUNT_BODY, H);
    if (t === 1) paint(g, ['', '', '', '', '', '', '', '', '', '', '....pppppppppp', '...ppppppppppp', '...qqqqqqqqqqq', '...g.g.g.g.g.']);
    if (t >= 2 && t <= 3) paint(g, ['', '', '', '', '', '', '', '', '', '', '......ppppp', '......ppppp', '......ggggg']);
    if (t === 4) { // 飞龙：膜翼、长尾、粗后腿
      paint(g, [
        'kk..........kk..',
        'kHk.........kHk.',
        'kHGk........kHGk',
        'kHHGk........kHk',
        '.kHHGk.......kk.',
        '..kHHk..........',
        '', '', '', '',
        '...kGGGGGGGGGk..',
        '..kGGGGGGGGGGGk.',
        '..kGbbbbbbbGGGGk',
        '...kGGk..kGGkkGk',
        '...kGGk..kGGk.k.',
        '...kbbk..kbbk...']);
    }
    // 骑手（人形 BODY 右移 1、上移 1，只取到腰部）
    const r = grid(BODY);
    if (t === 0) { GEAR.helm(r, 'y', 'Y'); GEAR.belt(r, 'w'); }
    if (t === 1) { GEAR.helm(r, 'm', 'n'); GEAR.plate(r, 'm', 'n', 'p'); GEAR.pads(r, 'm', 'n'); }
    if (t === 2) { GEAR.helm(r, 'W', 'i'); GEAR.plume(r, 'r'); GEAR.plate(r, 'm', 'i', 'p'); GEAR.pads(r, 'W', 'i'); }
    if (t === 3) { GEAR.helm(r, 'g', 'a'); GEAR.plume(r, 'p'); GEAR.plate(r, 'g', 'a', 'p'); GEAR.pads(r, 'g', 'a'); }
    if (t === 4) { GEAR.helm(r, 'Y', 'd'); GEAR.plume(r, 'r'); paint(r, ['', '...g........g', '...gg......gg']); GEAR.plate(r, 'Y', 'd', 'p'); GEAR.pads(r, 'g', 'a'); }
    for (let y = 1; y <= 10; y++) for (let x = 0; x < 15; x++) { const c = r[y][x]; if (c !== '.') put(g, x + 1, y - 1, c); }
    paint(g, ['', '', '', '', '', '', '', '', '', '', '.......kpk', '.......kqk', '.......k' + (t >= 2 ? 'g' : 'w') + 'k']);
    // 坐骑的头与颈在骑手前方
    if (t <= 3) {
      paint(g, MOUNT_HEAD, H);
      if (t === 1) paint(g, ['', '', '', '', '', '', '.mmm', '.mk', 'mm']);
      if (t >= 2) { put(g, 2, 9, 'g'); put(g, 3, 8, 'g'); put(g, 4, 7, 'g'); }
    } else {
      paint(g, [
        '', '', '',
        '.k.k............',
        'kbkbk...........',
        'kGGGGk..........',
        'kGeGGGk.........',
        'kGGGGGHk........',
        'kWkWkGHk........',
        '.kkkGGGHk.......',
        '....kGGHk.......']);
    }
    // 骑枪（右手竖持）：铁矛 → 钢枪 + 阵营小旗 → 银枪 → 金枪
    const tip = ['y', 'm', 'v', 'v', 'v'][t], shaft = t >= 3 ? 'g' : 'w';
    vline(g, 14, 1, 10, shaft); put(g, 14, 0, tip); put(g, 14, 1, tip);
    if (t >= 1) { put(g, 14, 2, tip); put(g, 15, 2, 'p'); put(g, 15, 3, 'p'); put(g, 15, 4, 'q'); }
    if (t >= 2) { put(g, 13, 2, tip); put(g, 13, 1, tip); put(g, 14, 3, 'g'); }
    return g;
  },

  // 战士系：头巾手斧 → 赤膊战斧 → 钢盔双刃斧 → 金盔白披风 → 金角盔红披风 + 巨斧
  fighter(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const bandana = () => { hline(g, 4, 11, 3, 'r'); hline(g, 5, 10, 2, 'r'); put(g, 12, 3, 'r'); put(g, 12, 4, 'R'); };
    const vest = () => { for (let y = 8; y <= 10; y++) { put(g, 5, y, 'w'); put(g, 10, y, 'w'); } };
    if (t === 0) { bandana(); vest(); GEAR.belt(g, 'w'); axe(g, 0, 'y', 'Y'); return g; }
    if (t === 1) {
      bandana(); hline(g, 6, 9, 8, 's'); hline(g, 6, 9, 9, 's'); hline(g, 6, 9, 10, 'S'); vest();
      GEAR.pads(g, 'w', 'f'); put(g, 3, 7, 'b'); put(g, 12, 7, 'b'); put(g, 4, 10, 'W'); put(g, 11, 10, 'W');
      GEAR.belt(g, 'f', 'y'); GEAR.boots(g, 'w'); axe(g, 1, 'm', 'n'); return g;
    }
    if (t === 2) {
      GEAR.helm(g, 'm', 'n'); paint(g, ['.......gg.......', '.......gg.......']); GEAR.plate(g, 'm', 'n', 'p'); GEAR.pads(g, 'm', 'n', true);
      GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'n'); axe(g, 2, 'm', 'n'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'W', 'j', 'g'); GEAR.helm(g, 'g', 'a'); paint(g, ['.......WW.......', '.......WW.......']); GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a', true);
      GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a'); axe(g, 2, 'v', 'm', 'g'); return g;
    }
    GEAR.cape(g, 'r', 'R', 'g'); GEAR.helm(g, 'g', 'a'); paint(g, ['......rrrr......', '.....rrrrrr.....']); put(g, 6, 2, 'W'); GEAR.plate(g, 'g', 'a', 'r'); put(g, 7, 9, 'c'); put(g, 8, 9, 'c');
    GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g'); axe(g, 3, 'v', 'c', 'g'); sparkle(g, [[9, 0], [15, 7]]); return g;
  },

  // 武士系：发髻和服 → 钵卷 + 胴甲 → 黑兜 + 袖甲 → 锹形金角 + 阵羽织 → 金月前立 + 背旗
  samurai(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const collar = () => { put(g, 6, 8, 'W'); put(g, 9, 8, 'W'); put(g, 7, 9, 'W'); put(g, 8, 9, 'W'); };
    if (t === 0) { put(g, 7, 0, 'h'); put(g, 8, 0, 'h'); collar(); GEAR.belt(g, 'W'); katana(g, 4, 'm', 'n', 'k'); return g; }
    if (t === 1) {
      put(g, 7, 0, 'h'); put(g, 8, 0, 'h'); GEAR.band(g, 'W', true); GEAR.plate(g, 'Y', 'd', 'p'); collar(); GEAR.belt(g, 'W');
      katana(g, 3, 'v', 'm', 'k'); return g;
    }
    if (t === 2) {
      GEAR.helm(g, 'Y', 'd'); put(g, 3, 3, 'Y'); put(g, 12, 3, 'Y'); paint(g, ['.......gg.......', '.......gg.......']);
      GEAR.plate(g, 'Y', 'd', 'p'); GEAR.pads(g, 'Y', 'p', true); GEAR.belt(g, 'r'); katana(g, 2, 'v', 'm', 'g'); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'Y', 'd', 'g'); GEAR.helm(g, 'p', 'q'); put(g, 3, 3, 'q'); put(g, 12, 3, 'q'); paint(g, ['...g......g.....', '....g....g......', '.....gccg.......']);
      GEAR.plate(g, 'p', 'q', 'g'); hline(g, 5, 10, 9, 'g'); GEAR.pads(g, 'p', 'g', true); GEAR.belt(g, 'r'); katana(g, 1, 'v', 'm', 'g'); return g;
    }
    // 大将军：背旗（阵营色）+ 金色大月前立
    paint(g, ['ppp_', 'pWpw', 'pppw', 'qqqw', '...w', '...w', '...w', '...w']);
    GEAR.cape(g, 'R', 'r', 'g'); GEAR.helm(g, 'g', 'a'); put(g, 3, 3, 'a'); put(g, 12, 3, 'a');
    paint(g, ['....gg....gg....', '.....gggggg.....']); put(g, 7, 1, 'r'); put(g, 8, 1, 'r');
    GEAR.plate(g, 'g', 'a', 'p'); hline(g, 5, 10, 9, 'R'); GEAR.pads(g, 'g', 'a', true); GEAR.belt(g, 'r', 'g');
    katana(g, 0, 'W', 'c', 'g'); sparkle(g, [[15, 1], [12, 4]]); return g;
  },

  // 弓箭系：皮帽短弓 → 兜帽长弓 + 箭筒 → 羽帽金弓 + 披风 → 钢盔十字弩 → 羽盔连弩
  archer(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const hood = c => { hline(g, 5, 10, 2, c); hline(g, 4, 11, 3, c); put(g, 4, 4, c); put(g, 11, 4, c); };
    const quiver = () => { paint(g, ['', '', '', '............WW..', '............kw..', '............ww..', '............wf..']); };
    if (t === 0) {
      hood('w'); put(g, 4, 4, 'h'); put(g, 11, 4, 'h'); for (let y = 8; y <= 10; y++) { put(g, 5, y, 'f'); put(g, 10, y, 'f'); }
      GEAR.belt(g, 'w'); bow(g, 5, 12, 'w'); return g;
    }
    if (t === 1) { quiver(); hood('q'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); bow(g, 3, 14, 'w', 'f'); return g; }
    if (t === 2) {
      GEAR.cape(g, 'q', 'd'); quiver(); hood('p'); hline(g, 4, 11, 3, 'g'); paint(g, ['..........rr....', '.........r......']);
      put(g, 6, 8, 'w'); put(g, 7, 9, 'w'); put(g, 8, 10, 'w'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'w'); bow(g, 1, 14, 'g', 'W'); return g;
    }
    const xbow = big => {
      if (!big) paint(g, ['', '', '', '', '', '', '', '..............n.', '..............m.', '...........wwwwm', '..............m.', '..............m.', '..............n.']);
      else paint(g, ['', '', '', '', '',
        '..............g.',
        '...........kkkm.',
        '...........fgfm.',
        '...........fgfmv',
        '..........wwwwwg',
        '..............mv',
        '..............m.',
        '..............m.',
        '..............g.']);
    };
    if (t === 3) {
      hline(g, 5, 10, 2, 'm'); hline(g, 3, 12, 3, 'm'); put(g, 3, 3, 'n'); put(g, 12, 3, 'n'); put(g, 6, 2, 'W');
      GEAR.plate(g, 'm', 'n', 'p'); GEAR.pads(g, 'm', 'n'); GEAR.belt(g, 'w', 'g'); GEAR.boots(g, 'n');
      paint(g, ['', '', '', '', '', '', '', '', '', '..W', '.ww', '.wf']); xbow(false); return g;
    }
    GEAR.cape(g, 'p', 'q', 'g', true); GEAR.helm(g, 'g', 'a'); GEAR.plume(g, 'r'); GEAR.plate(g, 'm', 'i', 'g'); GEAR.pads(g, 'g', 'a');
    GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'a'); xbow(true); return g;
  },

  // 牧师系：麻布修士袍 + 木杖 → 白兜帽 + 十字杖 → 金边圣带 + 圣环杖 → 主教冠 + 披肩 + 牧杖 → 金冠白金袍 + 日轮杖
  priest(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const whiteHood = () => { paint(g, ['', '......kkkk......', '.....kWWWWk.....', '....kWWWWWWk....', '....kWsssskk....']); put(g, 4, 5, 'W'); put(g, 11, 5, 'W'); };
    const robeCol = (a, b) => { for (let y = 8; y <= 13; y++) for (let x = 5; x <= 10; x++) if (g[y][x] !== 'k' && g[y][x] !== 's') g[y][x] = a; robe(g, a, b); };
    if (t === 0) {
      robeCol('b', 'B'); vline(g, 7, 8, 11, 'p'); vline(g, 8, 8, 11, 'p'); hline(g, 5, 10, 11, 'w'); put(g, 7, 11, 'w'); put(g, 8, 11, 'w');
      staff(g, 3, 'w'); put(g, 13, 2, 'f'); put(g, 12, 3, 'f'); put(g, 14, 3, 'f'); return g;
    }
    if (t === 1) {
      whiteHood(); robeCol('W', 'p'); vline(g, 7, 8, 11, 'p'); vline(g, 8, 8, 11, 'p');
      staff(g, 4, 'w'); vline(g, 13, 1, 4, 'g'); put(g, 12, 2, 'g'); put(g, 14, 2, 'g'); return g;
    }
    if (t === 2) {
      whiteHood(); hline(g, 5, 10, 2, 'g'); robeCol('W', 'g'); vline(g, 6, 8, 13, 'p'); vline(g, 9, 8, 13, 'p'); put(g, 7, 8, 'g'); put(g, 8, 8, 'g');
      staff(g, 4, 'g'); paint(g, ['............ggg.', '...........gccg', '...........gccg', '............ggg.']); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'p', 'q', 'g'); whiteHood(); paint(g, ['.......WW.......', '......WWWW......', '......WWWW......', '.....kggggk.....']); put(g, 7, 1, 'p'); put(g, 8, 1, 'p'); vline(g, 7, 0, 2, 'g');
      robeCol('W', 'p'); vline(g, 6, 8, 13, 'g'); vline(g, 9, 8, 13, 'g'); GEAR.pads(g, 'p', 'q');
      staff(g, 3, 'g'); paint(g, ['............ggg.', '............g.g.', '...............g', '']); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g'); whiteHood();
    paint(g, ['.......gg.......', '......gWWg......', '......gWWg......', '.....kgccgk.....']); put(g, 3, 2, 'L'); put(g, 12, 3, 'L'); put(g, 4, 0, 'L');
    robeCol('W', 'g'); vline(g, 6, 8, 13, 'p'); vline(g, 9, 8, 13, 'p'); hline(g, 5, 10, 13, 'g'); GEAR.pads(g, 'g', 'a');
    staff(g, 4, 'g'); paint(g, ['...........L.L.L', '............ggg.', '...........LgLgL', '............ggg.', '...........L...L']); return g;
  },

  // 咒术师系：兜帽骨杖 → 角兜 + 骨项链 + 紫焰骷髅杖 → 高领尖兜 + 暗紫披风 + 魔焰
  sorcerer(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    if (t === 0) {
      paint(g, ['.......kk.......', '......kqqk......', '.....kqqqqk.....', '....kqqqqqqk....', '....kqsssqk.....']);
      robe(g, 'q', 'd'); staff(g, 4, 'w'); paint(g, ['', '', '...........kbbk.', '...........bkkb.', '...........kbbk.']); return g;
    }
    if (t === 1) {
      paint(g, ['....b.kk.b......', '....bkddkb......', '.....kddddk.....', '....kddddddk....', '....kdsssdk.....']);
      robe(g, 'p', 'd'); hline(g, 5, 10, 11, 'D'); hline(g, 5, 10, 8, 'b'); put(g, 7, 9, 'b'); put(g, 8, 9, 'b'); put(g, 6, 8, 'k'); put(g, 9, 8, 'k');
      staff(g, 4, 'F'); paint(g, ['............A...', '...........AAA..', '...........kbbk.', '...........bkkb.', '...........kbbk.']); return g;
    }
    GEAR.cape(g, 'd', 'D', 'A');
    paint(g, ['.......kk.......', '......kddk......', '.....kddddk.....', '....kddddddk....', '..d.kdsssdk.d...', '..dD.......Dd...', '..dDA.....ADd...', '...dD.....Dd....']);
    put(g, 6, 5, 'A'); put(g, 9, 5, 'A');
    robe(g, 'd', 'p'); for (let y = 8; y <= 11; y++) hline(g, 5, 10, y, 'd'); vline(g, 7, 8, 13, 'p'); vline(g, 8, 8, 13, 'p'); put(g, 7, 9, 'A'); put(g, 8, 9, 'A'); hline(g, 5, 10, 11, 'g');
    staff(g, 4, 'Y'); paint(g, ['............AP..', '...........AAAA.', '...........kbbk.', '...........bAAb.', '...........kbbk.']); sparkle(g, [[11, 0], [15, 5]], 'A'); return g;
  },

  // 法师系：软帽短杖 → 尖帽红晶杖 → 金带帽 + 蓝晶球杖 → 大檐帽 + 披风 + 月牙杖 → 白金披风 + 星帽 + 光球翼杖
  mage(t) {
    t = tierOf(t, 5); const g = grid(BODY);
    const hat = band => { paint(g, ['.......kk.......', '......kppk......', '.....kppppk.....', '...kkppppppkk...', '..kqqqqqqqqqqk..']); if (band) hline(g, 5, 10, 3, band); };
    if (t === 0) {
      paint(g, ['', '......kkkk......', '.....kppppk.....', '....kqqqqqqk....', '....khsssshk....']); put(g, 11, 1, 'p'); put(g, 12, 2, 'q');
      robe(g, 'p', 'q'); hline(g, 5, 10, 11, 'w'); vline(g, 13, 6, 12, 'w'); put(g, 13, 5, 'r'); return g;
    }
    if (t === 1) { hat(); robe(g, 'p', 'q'); hline(g, 5, 10, 11, 'q'); staff(g, 4, 'w'); put(g, 13, 3, 'o'); put(g, 12, 3, 'k'); put(g, 14, 3, 'k'); return g; }
    if (t === 2) {
      hat('g'); robe(g, 'p', 'q'); hline(g, 4, 11, 13, 'g'); hline(g, 5, 10, 11, 'g'); staff(g, 4, 'w');
      paint(g, ['', '............g...', '...........gccg.', '...........gCcg.', '............g...']); return g;
    }
    if (t === 3) {
      GEAR.cape(g, 'q', 'd', 'g');
      paint(g, ['........kpk.....', '.......kppk.....', '.....kpppgk.....', '...kkpgggppkk...', '.kqqqqqqqqqqqqk.']);
      robe(g, 'p', 'q'); hline(g, 4, 11, 13, 'g'); hline(g, 5, 10, 11, 'g'); staff(g, 4, 'w');
      paint(g, ['............gg..', '...........g..c.', '...........g.cc.', '............gg..']); return g;
    }
    GEAR.cape(g, 'W', 'j', 'g');
    paint(g, ['.......kgk......', '......kppgk.....', '.....kpgpppk....', '...kkpppgppkk...', '.kggggggggggggk.']);
    robe(g, 'p', 'q'); hline(g, 4, 11, 13, 'g'); hline(g, 5, 10, 11, 'g'); vline(g, 7, 8, 10, 'W'); vline(g, 8, 8, 10, 'W'); staff(g, 5, 'g');
    paint(g, ['............L...', '...........kWWk..', '..........WkWcWk', '..........WkccW.', '...........kggk.', '............g...']); sparkle(g, [[11, 0], [15, 0], [10, 6]]); return g;
  },

  // 鹰族：小褐翼 → 大翼 + 钢甲 + 红冠羽 → 白金巨翼 + 金甲金冠
  hawkman(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    if (t === 2) {
      paint(g, ['W..............W', 'WW............WW', 'jWW..........WWj', 'jjWW........WWjj', '.jjWW......WWjj.', '.gjjW......Wjjg.', '..gjjW....Wjjg..', '...gjW....Wjg...',
        '....g......g....']);
    }
    paint(g, ['', '......kkkk......', '.....kffffk.....', '....kffffffk....', '....kfWffWfk....', '....kffoofk.....']);
    if (t === 0) paint(g, ['', '', '', '', '', '', 'kk............kk', 'kfk..........kfk', 'kffk........kffk', '.kffk......kffk.', '..kfk......kfk..', '...k........k...']);
    if (t === 1) {
      paint(g, ['', '', 'F..............F', 'fF............Ff', 'ffF..........Fff', 'bffF........Fffb', 'bbffk......kffbb', '.bffk......kffb.', '..bfk......kfb..', '...k........k...']);
      put(g, 7, 0, 'r'); put(g, 8, 0, 'r'); put(g, 8, 1, 'r'); GEAR.plate(g, 'm', 'n', 'p'); GEAR.belt(g, 'w', 'g'); return g;
    }
    if (t === 2) {
      paint(g, ['......gggg......', '.....g.gg.g.....']); put(g, 7, 1, 'c'); put(g, 8, 1, 'c');
      GEAR.plate(g, 'g', 'a', 'p'); GEAR.pads(g, 'g', 'a'); GEAR.belt(g, 'a', 'g'); GEAR.boots(g, 'g');
    }
    return g;
  },

  // 狼族：狼头布衣 → 刺钉皮肩 + 钢爪 → 白鬃 + 金甲 + 红眼 + 长爪
  wolfman(t) {
    t = tierOf(t, 3); const g = grid(BODY);
    paint(g, ['....k......k....', '...kyk....kyk...', '...kyykkkkyyk...', '...kyyyyyyyyk...', '...kyWyyyyWyk...', '....kyyyyyyk....', '.....kyykkk.....', '......kyyk......']);
    put(g, 3, 10, 'y'); put(g, 12, 10, 'y');
    if (t === 0) { GEAR.belt(g, 'w'); return g; }
    const claws = c => paint(g, ['', '', '', '', '', '', '', '', '', '', '', '..ccc......ccc..', '..c.c......c.c..'], { c });
    if (t === 1) {
      GEAR.pads(g, 'w', 'f', true); put(g, 2, 7, 'b'); put(g, 13, 7, 'b'); put(g, 3, 6, 'b'); put(g, 12, 6, 'b');
      GEAR.belt(g, 'f', 'g'); claws('m'); return g;
    }
    put(g, 5, 4, 'e'); put(g, 10, 4, 'e');
    GEAR.cape(g, 'r', 'R', 'g');
    paint(g, ['', '', '', '', '', '', '..WW........WW..', '..WjWW....WWjW..', '...WjWWWWWWjW...']);
    GEAR.plate(g, 'g', 'a', 'p'); put(g, 7, 8, 'p'); put(g, 8, 8, 'p'); GEAR.belt(g, 'a', 'g'); claws('v'); put(g, 2, 13, 'v'); put(g, 13, 13, 'v'); return g;
  },

  // 龙族：小龙（敌方变色龙也用这一阶）→ 展翼飞龙 → 角 + 背刺 + 吐焰火龙 → 金角巨翼巨火龙
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
