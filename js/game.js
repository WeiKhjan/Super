// 超时空英雄传说 · 移动版 —— 游戏引擎
'use strict';

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (x, y) => x + ',' + y;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const STATS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'];
const STAT_NAME = { hp: 'HP', mp: 'MP', atk: '攻击', def: '防御', mag: '魔力', spd: '敏捷' };

const OPT = { sound: true, fast: false };
let AUTO = false; // 自动对战（测试用）：我方也由 AI 控制，跳过动画与对话
const T = ms => (AUTO ? 0 : OPT.fast ? ms / 2.5 : ms);
const wait = ms => (T(ms) > 0 ? sleep(T(ms)) : Promise.resolve());

// =====================================================================
// 存档
// =====================================================================
const SAVE_KEY = 'cskyxcs_save_v1';
const OPT_KEY = 'cskyxcs_opt_v1';
let S = null; // { chapter, gold, roster: {id: data}, order: [id], inv: {itemId: n} }

function newSave() { S = { chapter: 0, gold: 150, roster: {}, order: [], inv: { herb: 3 } }; }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 隐私模式等 */ } }
function readSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.roster) return s; } catch (e) { }
  return null;
}
function loadOpt() { try { Object.assign(OPT, JSON.parse(localStorage.getItem(OPT_KEY)) || {}); } catch (e) { } }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPT)); } catch (e) { } }

// =====================================================================
// 单位
// =====================================================================
let UID = 1;
const clsOf = u => CLASSES[u.cls];
function tierForLevel(cls, lv) {
  const n = CLASSES[cls].tiers.length;
  return Math.min(n - 1, lv >= 15 ? 3 : lv >= 10 ? 2 : lv >= 5 ? 1 : 0);
}
const tierDef = u => clsOf(u).tiers[Math.min(u.tier, clsOf(u).tiers.length - 1)];
const className = u => tierDef(u).name;
const movOf = u => tierDef(u).mov;
const moveTypeOf = u => tierDef(u).move;
const rangeOf = u => tierDef(u).range;
const itemStat = (id, k) => (id && ITEMS[id] && ITEMS[id][k]) || 0;
const atkOf = u => u.atk + itemStat(u.weapon, 'atk');
const magOf = u => u.mag + itemStat(u.weapon, 'mag');
const defOf = u => u.def + itemStat(u.armor, 'def');
const isUndead = u => !!clsOf(u).undead;
const skillsOf = u => clsOf(u).skills.filter(s => s.lv <= u.lv).map(s => s.id);
const spriteKey = u => clsOf(u).sprite;

function heroData(id) {
  const h = HEROES[id];
  return {
    id, name: h.name, cls: h.cls, lv: h.lv, exp: 0, tier: tierForLevel(h.cls, h.lv), hair: h.hair, lord: !!h.lord,
    mhp: h.stats.hp, mmp: h.stats.mp, atk: h.stats.atk, def: h.stats.def, mag: h.stats.mag, spd: h.stats.spd,
    weapon: h.weapon, armor: h.armor,
  };
}
const PERSIST_FIELDS = ['lv', 'exp', 'tier', 'mhp', 'mmp', 'atk', 'def', 'mag', 'spd', 'weapon', 'armor'];

function battleUnitFromHero(data, team, x, y) {
  const u = Object.assign({}, data, { uid: UID++, team, x, y, hp: data.mhp, mp: data.mmp, acted: false, ai: 'aggr' });
  return u;
}

const WEAPON_UPGRADE = { ironSword: 'silverSword', spear: 'silverLance', shortBow: 'longBow', woodStaff: 'magicStaff' };
function makeMonster(cls, lv, opts) {
  const C = CLASSES[cls];
  const tier = tierForLevel(cls, lv);
  const u = { uid: UID++, id: null, cls, lv, exp: 0, tier, team: 'enemy', ai: 'aggr', acted: false };
  for (const k of STATS) {
    let v = Math.round(C.base[k] + C.growth[k] * (lv - 1));
    if (C.promo) v += (C.promo[k] || 0) * tier;
    u[k === 'hp' ? 'mhp' : k === 'mp' ? 'mmp' : k] = v;
  }
  u.weapon = C.weapon ? DEFAULT_WEAPON[C.weapon] : null;
  if (u.weapon && lv >= 8 && WEAPON_UPGRADE[u.weapon]) u.weapon = WEAPON_UPGRADE[u.weapon];
  u.armor = null;
  Object.assign(u, opts || {});
  // 杂兵比同等级的英雄弱一些；首领则更强
  if (u.boss) { u.mhp = Math.round(u.mhp * 1.3); u.def += 2; }
  else if (u.team === 'enemy' || u.team === 'rogue') for (const k of ['mhp', 'atk', 'def', 'mag']) u[k] = Math.round(u[k] * 0.85);
  u.name = u.name || C.tiers[tier].name;
  u.hp = u.mhp; u.mp = u.mmp;
  return u;
}

function spawnSpec(spec) {
  const [what, lv, x, y, opts] = spec;
  let u;
  if (what.startsWith('hero:')) {
    const id = what.slice(5);
    const data = S.roster[id] || heroData(id);
    u = battleUnitFromHero(data, (opts && opts.team) || 'player', x, y);
    Object.assign(u, opts || {});
    if (!opts || !opts.ai) u.ai = 'aggr';
  } else {
    u = makeMonster(what, lv, Object.assign({}, opts));
    u.x = x; u.y = y;
  }
  const spot = freeSpotNear(u, x, y);
  u.x = spot.x; u.y = spot.y;
  return u;
}

// =====================================================================
// 战场
// =====================================================================
let B = null;

const inMap = (x, y) => x >= 0 && y >= 0 && x < B.w && y < B.h;
const tileAt = (x, y) => B.map[y][x];
const terrAt = (x, y) => TERRAIN[tileAt(x, y)];
const alive = () => B.units.filter(u => u.hp > 0);
const unitAt = (x, y) => B.units.find(u => u.hp > 0 && u.x === x && u.y === y);
const side = t => (t === 'player' || t === 'ally' ? 'P' : t);
const hostile = (a, b) => side(a.team) !== side(b.team);
const mdist = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

function passable(u, x, y) { return inMap(x, y) && TERRAIN[tileAt(x, y)].cost[moveTypeOf(u)] < 99; }
function freeSpotNear(u, x, y) {
  for (let r = 0; r < 12; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) !== r) continue;
      const nx = x + dx, ny = y + dy;
      if (B && passable(u, nx, ny) && !unitAt(nx, ny)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}

function reachable(u) {
  const mt = moveTypeOf(u), mov = movOf(u);
  const best = new Map();
  best.set(key(u.x, u.y), { x: u.x, y: u.y, c: 0, prev: null });
  const q = [{ x: u.x, y: u.y, c: 0 }];
  while (q.length) {
    q.sort((a, b) => a.c - b.c);
    const cur = q.shift();
    if (cur.c > best.get(key(cur.x, cur.y)).c) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!inMap(nx, ny)) continue;
      const nc = cur.c + TERRAIN[tileAt(nx, ny)].cost[mt];
      if (nc > mov) continue;
      const o = unitAt(nx, ny);
      if (o && hostile(o, u)) continue;
      const k = key(nx, ny), ex = best.get(k);
      if (ex && ex.c <= nc) continue;
      best.set(k, { x: nx, y: ny, c: nc, prev: key(cur.x, cur.y) });
      q.push({ x: nx, y: ny, c: nc });
    }
  }
  for (const v of best.values()) { const o = unitAt(v.x, v.y); v.stop = !o || o === u; }
  return best;
}
function pathTo(reach, x, y) {
  const path = []; let k = key(x, y);
  while (k) { const n = reach.get(k); path.unshift({ x: n.x, y: n.y }); k = n.prev; }
  return path;
}
function tilesInRange(x, y, r0, r1) {
  const out = [];
  for (let dy = -r1; dy <= r1; dy++) for (let dx = -r1; dx <= r1; dx++) {
    const d = Math.abs(dx) + Math.abs(dy);
    if (d >= r0 && d <= r1 && inMap(x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
  }
  return out;
}
// 威胁范围：移动 + 攻击可达的所有格子
function threatTiles(u) {
  const reach = reachable(u), set = new Set();
  let [r0, r1] = rangeOf(u);
  for (const id of skillsOf(u)) { const sp = SPELLS[id]; if (sp.power && sp.kind !== 'heal' && u.mp >= sp.mp) r1 = Math.max(r1, sp.range[1]); }
  for (const v of reach.values()) if (v.stop) for (const t of tilesInRange(v.x, v.y, Math.min(r0, 1), r1)) set.add(key(t.x, t.y));
  return { reach, set };
}

// ---------- 伤害计算 ----------
function physCalc(a, d, power = 0, sure = false) {
  const t = terrAt(d.x, d.y);
  const dmg = Math.max(1, atkOf(a) + power - Math.round(defOf(d) * (1 + t.def / 100) * 0.5));
  const hit = sure ? 100 : clamp(88 + (a.spd - d.spd) * 2 - t.avoid, 35, 100);
  const crit = clamp(3 + Math.max(0, a.spd - d.spd) + (clsOf(a).weapon === 'bow' ? 5 : 0) + (a.boss ? 5 : 0), 0, 40);
  return { dmg, hit, crit };
}
function magCalc(a, d, sp) {
  let dmg = sp.power + magOf(a) - Math.round(defOf(d) * 0.25 + d.mag * 0.35);
  if (sp.undead && isUndead(d)) dmg *= sp.undead;
  return { dmg: Math.max(1, Math.round(dmg)), hit: 100, crit: 0 };
}
function skillCalc(a, d, sp) { return sp.kind === 'magic' ? magCalc(a, d, sp) : physCalc(a, d, sp.power, sp.sure); }
function healAmount(a, sp) { return sp.power + Math.round(magOf(a) * 0.8); }
function canCounter(d, a) { const [r0, r1] = rangeOf(d); const dd = mdist(a.x, a.y, d.x, d.y); return dd >= r0 && dd <= r1; }
function expFor(u, t, killed) {
  let e = 18 + (t.lv - u.lv) * 5 + (t.boss ? 10 : 0);
  if (killed) e = e * 2.5 + (t.boss ? 40 : 0);
  return clamp(Math.round(e), 1, 100);
}

// =====================================================================
// 画面 / 渲染
// =====================================================================
const cv = $('#map');
const ctx = cv.getContext('2d');
let TS = 32, DPR = 1;
const FX = [], FLOATS = [];
let mapLayers = null;

function resize() {
  if (!B) return;
  const stage = $('#stage');
  const W = stage.clientWidth, H = stage.clientHeight;
  TS = Math.max(16, Math.floor(Math.min(W / B.w, H / B.h)));
  DPR = Math.min(3, window.devicePixelRatio || 1);
  cv.style.width = TS * B.w + 'px'; cv.style.height = TS * B.h + 'px';
  cv.width = Math.round(TS * B.w * DPR); cv.height = Math.round(TS * B.h * DPR);
  mapLayers = [0, 1].map(frame => {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const s = TS * DPR;
    for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      g.drawImage(getTile(tileAt(x, y), x, y, frame), Math.round(x * s), Math.round(y * s), Math.ceil(s), Math.ceil(s));
    }
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
    for (let x = 1; x < B.w; x++) { g.beginPath(); g.moveTo(Math.round(x * s) + 0.5, 0); g.lineTo(Math.round(x * s) + 0.5, c.height); g.stroke(); }
    for (let y = 1; y < B.h; y++) { g.beginPath(); g.moveTo(0, Math.round(y * s) + 0.5); g.lineTo(c.width, Math.round(y * s) + 0.5); g.stroke(); }
    return c;
  });
}
window.addEventListener('resize', () => setTimeout(resize, 50));

const GRAY = {};
function graySprite(c, id) {
  if (GRAY[id]) return GRAY[id];
  const g = document.createElement('canvas'); g.width = 16; g.height = 16;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0);
  const d = x.getImageData(0, 0, 16, 16);
  for (let i = 0; i < d.data.length; i += 4) { const v = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.75; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; }
  x.putImageData(d, 0, 0);
  return (GRAY[id] = g);
}
function unitSprite(u) { return getSprite(spriteKey(u), u.tier, u.team, u.hair); }
const TEAM_COLOR = { player: '#4a9aff', ally: '#4ad87a', enemy: '#ff4a4a', rogue: '#e0b040' };

function render(now) {
  requestAnimationFrame(render);
  if (!B || !mapLayers || $('#battle').hidden) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapLayers[Math.floor(now / 600) % 2], 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const ts = TS;

  for (const c of B.chests) drawChest(ctx, c.x * ts, c.y * ts, ts, c.opened);

  // 高亮
  const hl = (set, fill, stroke) => {
    if (!set) return;
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1;
    for (const k of set) { const [x, y] = k.split(',').map(Number); ctx.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2); ctx.strokeRect(x * ts + 1.5, y * ts + 1.5, ts - 3, ts - 3); }
  };
  hl(B.hlDanger, 'rgba(255,60,60,0.22)', 'rgba(255,90,90,0.5)');
  hl(B.hlMove, 'rgba(70,150,255,0.33)', 'rgba(140,200,255,0.75)');
  hl(B.hlAttack, 'rgba(255,60,60,0.30)', 'rgba(255,120,120,0.85)');
  hl(B.hlHeal, 'rgba(60,230,120,0.30)', 'rgba(120,255,160,0.85)');
  if (B.hlArea) hl(B.hlArea, 'rgba(255,220,60,0.35)', 'rgba(255,240,120,0.9)');

  // 单位
  const list = B.units.filter(u => u.hp > 0 || u.dying).sort((a, b) => (a.py ?? a.y) - (b.py ?? b.y));
  const bob = Math.floor(now / 400) % 2;
  for (const u of list) {
    const ux = (u.px ?? u.x) * ts + (u.ox || 0) * ts, uy = (u.py ?? u.y) * ts + (u.oy || 0) * ts;
    ctx.globalAlpha = u.dying ? Math.max(0, u.dying) : 1;
    // 阵营底圈
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(ux + ts / 2, uy + ts * 0.86, ts * 0.32, ts * 0.11, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = TEAM_COLOR[u.team]; ctx.lineWidth = Math.max(1.5, ts / 20);
    ctx.beginPath(); ctx.ellipse(ux + ts / 2, uy + ts * 0.86, ts * 0.34, ts * 0.12, 0, 0, 7); ctx.stroke();
    let spr = unitSprite(u);
    if (u.acted && B.phase === u.team) spr = graySprite(spr, `${spriteKey(u)}|${u.tier}|${u.team}|${u.hair}`);
    const by = (!u.acted && !u.px && bob && u.hp > 0) ? -ts / 32 : 0;
    const size = u.boss ? ts * 1.15 : ts;
    ctx.drawImage(spr, ux + (ts - size) / 2, uy - ts * 0.06 + by - (size - ts), size, size);
    if (u.flash && now < u.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(spr, ux + (ts - size) / 2, uy - ts * 0.06 - (size - ts), size, size); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    // 血条
    if (u.hp > 0) {
      const bw = ts * 0.7, bh = Math.max(2, ts * 0.075), bx = ux + ts * 0.15, byy = uy + ts - bh - 1;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, bh + 2);
      const r = u.hp / u.mhp;
      ctx.fillStyle = r > 0.5 ? '#5ae05a' : r > 0.25 ? '#f0c030' : '#ff4040';
      ctx.fillRect(bx, byy, bw * r, bh);
    }
    if (u.boss) { ctx.fillStyle = '#f4c542'; ctx.font = `bold ${Math.round(ts * 0.32)}px sans-serif`; ctx.fillText('★', ux + 1, uy + ts * 0.3); }
    if (u.summonLeft && u.summonLeft < 90) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(ts * 0.26)}px sans-serif`; ctx.fillText(u.summonLeft, ux + ts * 0.78, uy + ts * 0.28); }
    ctx.globalAlpha = 1;
  }

  // 光标
  if (B.cursor) {
    const { x, y } = B.cursor, p = (Math.sin(now / 150) + 1) / 2;
    ctx.strokeStyle = `rgba(255,255,255,${0.6 + p * 0.4})`; ctx.lineWidth = 2;
    const m = 1 + p * 2, L = ts * 0.3;
    const x0 = x * ts + m, y0 = y * ts + m, x1 = (x + 1) * ts - m, y1 = (y + 1) * ts - m;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + L); ctx.lineTo(x0, y0); ctx.lineTo(x0 + L, y0);
    ctx.moveTo(x1 - L, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + L);
    ctx.moveTo(x1, y1 - L); ctx.lineTo(x1, y1); ctx.lineTo(x1 - L, y1);
    ctx.moveTo(x0 + L, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - L);
    ctx.stroke();
  }

  drawFx(now);

  // 飘字
  for (let i = FLOATS.length - 1; i >= 0; i--) {
    const f = FLOATS[i], p = (now - f.t0) / 900;
    if (p >= 1) { FLOATS.splice(i, 1); continue; }
    ctx.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    ctx.font = `bold ${Math.round(ts * (f.big ? 0.5 : 0.4))}px sans-serif`;
    ctx.textAlign = 'center';
    const tx = (f.x + 0.5) * ts, ty = (f.y + 0.3) * ts - p * ts * 0.6;
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(f.text, tx, ty);
    ctx.fillStyle = f.color; ctx.fillText(f.text, tx, ty);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}
requestAnimationFrame(render);

function floatText(x, y, text, color, big) { if (!AUTO) FLOATS.push({ x, y, text, color, big, t0: performance.now() }); }

// ---------- 特效 ----------
function addFx(type, x, y, dur, extra) {
  if (AUTO) return Promise.resolve();
  const f = Object.assign({ type, x, y, t0: performance.now(), dur: T(dur) }, extra || {});
  FX.push(f);
  return wait(dur);
}
function drawFx(now) {
  const ts = TS;
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i], p = (now - f.t0) / Math.max(1, f.dur);
    if (p >= 1) { FX.splice(i, 1); continue; }
    const cx = (f.x + 0.5) * ts, cy = (f.y + 0.5) * ts;
    ctx.save();
    switch (f.type) {
      case 'slash': {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = ts * 0.08; ctx.globalAlpha = 1 - p;
        for (let k = 0; k < 2; k++) {
          const o = (k ? 1 : -1) * ts * 0.15;
          ctx.beginPath(); ctx.moveTo(cx - ts * 0.4 + o, cy - ts * 0.4 + p * ts * 0.2); ctx.lineTo(cx + ts * 0.4 + o, cy + ts * 0.4 * (p * 2 - 1)); ctx.stroke();
        }
        break;
      }
      case 'arrow': {
        const sx = (f.sx + 0.5) * ts, sy = (f.sy + 0.5) * ts;
        const ax = sx + (cx - sx) * p, ay = sy + (cy - sy) * p, ang = Math.atan2(cy - sy, cx - sx);
        ctx.translate(ax, ay); ctx.rotate(ang);
        ctx.fillStyle = '#f4e0b0'; ctx.fillRect(-ts * 0.3, -1, ts * 0.3, 2);
        ctx.fillStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(5, 0); ctx.lineTo(0, 3); ctx.fill();
        break;
      }
      case 'fire': case 'acid': case 'rock': case 'dark': case 'ice': case 'holy': case 'heal': {
        const col = { fire: ['#ffdd55', '#ff8a2a', '#ff3a1a'], acid: ['#caff4a', '#7ae02a', '#3a9a1a'], rock: ['#c8a070', '#8a6a3a', '#5a3a1a'],
          dark: ['#d08aff', '#8a3ad8', '#3a1060'], ice: ['#ffffff', '#9ae0ff', '#3a9ad8'], holy: ['#ffffff', '#fff6b0', '#f4c542'], heal: ['#ffffff', '#b0ffcc', '#4ae07a'] }[f.type];
        const n = 14;
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2 + p * 3, rr = ts * (f.type === 'heal' ? 0.3 : 0.15 + p * 0.45);
          const px = cx + Math.cos(a) * rr * (f.type === 'heal' ? 1 : 1), py = cy + Math.sin(a) * rr * (f.type === 'heal' ? 0.4 : 1) - (f.type === 'heal' || f.type === 'holy' ? p * ts * 0.6 : 0);
          ctx.globalAlpha = 1 - p; ctx.fillStyle = col[k % 3];
          const s = ts * 0.09 * (1.4 - p);
          ctx.fillRect(px - s, py - s, s * 2, s * 2);
        }
        if (f.type !== 'heal') { ctx.globalAlpha = (1 - p) * 0.6; ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.45 * Math.sin(p * Math.PI), 0, 7); ctx.fill(); }
        if (f.type === 'holy') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff'; ctx.fillRect(cx - ts * 0.05, cy - ts * 0.45, ts * 0.1, ts * 0.9); ctx.fillRect(cx - ts * 0.3, cy - ts * 0.2, ts * 0.6, ts * 0.1); }
        break;
      }
      case 'bolt': {
        ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = ts * 0.08; ctx.globalAlpha = p < 0.5 ? 1 : 2 - p * 2;
        ctx.beginPath(); let x = cx, y = cy - ts * 1.5; ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x = cx + (k % 2 ? 1 : -1) * ts * 0.2; y += ts * 0.3; ctx.lineTo(x, y); }
        ctx.stroke(); ctx.fillStyle = 'rgba(255,255,160,0.4)'; ctx.fillRect(cx - ts / 2, cy - ts / 2, ts, ts);
        break;
      }
      case 'beam': {
        const sx = (f.sx + 0.5) * ts, sy = (f.sy + 0.5) * ts;
        ctx.globalAlpha = 1 - p * 0.8; ctx.lineCap = 'round';
        ctx.strokeStyle = '#ff6a1a'; ctx.lineWidth = ts * 0.45 * Math.sin(p * Math.PI); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = ts * 0.18 * Math.sin(p * Math.PI); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
        break;
      }
      case 'arrows': {
        ctx.strokeStyle = '#f4e0b0'; ctx.lineWidth = 2;
        for (let k = 0; k < 9; k++) {
          const ox = ((k * 37) % 30 - 15) / 15 * ts * 1.2, oy = ((k * 53) % 30 - 15) / 15 * ts * 1.2;
          const yy = cy + oy - ts * 2 * (1 - p);
          ctx.globalAlpha = 1 - p * 0.5; ctx.beginPath(); ctx.moveTo(cx + ox, yy - ts * 0.3); ctx.lineTo(cx + ox, yy); ctx.stroke();
        }
        break;
      }
      case 'summon': {
        ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.color || '#d08aff'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx, cy, ts * (0.2 + k * 0.15) * (0.5 + p), 0, 7); ctx.stroke(); }
        break;
      }
    }
    ctx.restore();
  }
}

function tween(fn, ms) {
  const d = T(ms);
  if (d <= 0) { fn(1); return Promise.resolve(); }
  return new Promise(res => {
    const t0 = performance.now();
    const step = now => { const p = Math.min(1, (now - t0) / d); fn(p); if (p < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}

// =====================================================================
// 音效（WebAudio 合成，无外部文件）
// =====================================================================
let AC = null;
const SFX = {
  select: [[880, 0.04, 'square']],
  move: [[520, 0.03, 'square'], [660, 0.03, 'square']],
  hit: [[180, 0.06, 'sawtooth'], [90, 0.09, 'sawtooth']],
  crit: [[300, 0.05, 'sawtooth'], [120, 0.05, 'square'], [60, 0.15, 'sawtooth']],
  miss: [[700, 0.04, 'triangle'], [500, 0.05, 'triangle']],
  magic: [[330, 0.07, 'sine'], [494, 0.07, 'sine'], [740, 0.1, 'sine']],
  heal: [[523, 0.07, 'triangle'], [659, 0.07, 'triangle'], [784, 0.12, 'triangle']],
  levelup: [[523, 0.08, 'square'], [659, 0.08, 'square'], [784, 0.08, 'square'], [1046, 0.2, 'square']],
  chest: [[784, 0.07, 'square'], [988, 0.07, 'square'], [1175, 0.16, 'square']],
  die: [[220, 0.08, 'square'], [165, 0.08, 'square'], [110, 0.2, 'square']],
  win: [[523, 0.12, 'square'], [523, 0.12, 'square'], [523, 0.12, 'square'], [659, 0.3, 'square'], [587, 0.15, 'square'], [659, 0.15, 'square'], [784, 0.4, 'square']],
  lose: [[392, 0.2, 'triangle'], [330, 0.2, 'triangle'], [262, 0.5, 'triangle']],
  turn: [[392, 0.08, 'square'], [523, 0.12, 'square']],
};
function sfx(name) {
  if (!OPT.sound || AUTO) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime;
    for (const [f, d, type] of SFX[name] || []) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.07, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  } catch (e) { }
}

// =====================================================================
// UI 通用
// =====================================================================
function show(id) { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let toastTimer = null;
function toast(msg) {
  if (AUTO) return;
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1600);
}
async function banner(text, sub, cls) {
  if (AUTO) return;
  const b = $('#banner');
  b.innerHTML = `<div class="b-main">${esc(text)}</div>${sub ? `<div class="b-sub">${esc(sub)}</div>` : ''}`;
  b.className = 'on ' + (cls || '');
  await wait(1000);
  b.className = '';
  await wait(150);
}

// 通用弹窗：buttons = [{label, value, cls, disabled}]
function modal(title, bodyHtml, buttons, opts) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="m-box ${opts && opts.wide ? 'wide' : ''}">
      ${title ? `<div class="m-title">${title}</div>` : ''}
      <div class="m-body">${bodyHtml || ''}</div>
      <div class="m-btns">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>
    </div>`;
    m.hidden = false;
    const done = v => { m.hidden = true; m.innerHTML = ''; res(v); };
    m.onclick = e => {
      const btn = e.target.closest('[data-i]');
      if (btn && !btn.disabled) { sfx('select'); done(buttons[+btn.dataset.i].value); return; }
      const pick = e.target.closest('[data-pick]');
      if (pick && !pick.disabled) { sfx('select'); done(pick.dataset.pick); return; }
      if (e.target === m && opts && opts.dismiss !== undefined) done(opts.dismiss);
    };
  });
}

// 立绘：取英雄或敌方职业的精灵
function portraitCanvas(who, size) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 16; c.className = 'pix';
  c.style.width = c.style.height = size + 'px';
  if (!who) return null;
  let spr;
  if (who.startsWith('enemy:')) { const cls = who.slice(6); spr = getSprite(CLASSES[cls].sprite, 0, 'enemy'); }
  else if (HEROES[who]) { const d = (S && S.roster[who]) || heroData(who); spr = getSprite(CLASSES[d.cls].sprite, d.tier, 'player', d.hair); }
  if (spr) c.getContext('2d').drawImage(spr, 0, 0);
  return c;
}

function dialog(lines) {
  if (AUTO || !lines || !lines.length) return Promise.resolve();
  return new Promise(res => {
    const box = $('#dialog'); let i = 0, typing = null, full = '';
    const showLine = () => {
      const [who, text, pid] = lines[i];
      $('#dlg-name').textContent = who === '旁白' ? '' : who;
      $('#dlg-name').style.display = who === '旁白' ? 'none' : '';
      const pw = $('#dlg-portrait'); pw.innerHTML = '';
      const pc = portraitCanvas(pid, 64); if (pc) pw.appendChild(pc);
      pw.style.display = pc ? '' : 'none';
      box.classList.toggle('narration', who === '旁白');
      full = text; let n = 0;
      const el = $('#dlg-text'); el.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => { n += OPT.fast ? 3 : 1; el.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 28);
    };
    box.hidden = false;
    box.onclick = () => {
      if (typing) { clearInterval(typing); typing = null; $('#dlg-text').textContent = full; return; }
      i++;
      if (i >= lines.length) { box.hidden = true; box.onclick = null; res(); return; }
      sfx('select'); showLine();
    };
    showLine();
  });
}

function hpBar(v, max, cls) { return `<div class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i><span>${v}/${max}</span></div>`; }

// =====================================================================
// 战斗流程
// =====================================================================
function startBattle(chIdx) {
  const ch = CHAPTERS[chIdx];
  B = {
    ch: chIdx, def: ch, map: ch.map, w: ch.map[0].length, h: ch.map.length,
    units: [], chests: ch.chests.map(([x, y, item, gold]) => ({ x, y, item, gold: gold || 0, opened: false })),
    turn: 1, phase: 'player', mode: 'idle', over: null, firedEvents: new Set(),
  };
  // 我方出阵
  for (const id of ch.party) if (!S.roster[id]) { S.roster[id] = heroData(id); S.order.push(id); }
  const ids = S.order.filter(id => S.roster[id]);
  ids.sort((a, b) => (S.roster[b].lord ? 1 : 0) - (S.roster[a].lord ? 1 : 0));
  ids.forEach((id, i) => {
    const [x, y] = ch.start[i] || ch.start[ch.start.length - 1];
    const u = battleUnitFromHero(S.roster[id], 'player', x, y);
    if (ch.startHp && ch.startHp[id]) u.hp = Math.max(1, Math.round(u.mhp * ch.startHp[id]));
    const spot = freeSpotNear(u, x, y); u.x = spot.x; u.y = spot.y;
    B.units.push(u);
  });
  for (const spec of ch.units) B.units.push(spawnSpec(spec));
  show('battle');
  $('#hud-title').textContent = ch.title;
  resize();
  setMode('idle');
}

async function runChapter(chIdx, skipIntro) {
  const snapshot = JSON.stringify(S);
  const ch = CHAPTERS[chIdx];
  if (!skipIntro) {
    show('battle');
    await chapterCard(ch.title);
  }
  startBattle(chIdx);
  if (!skipIntro) await dialog(ch.intro);
  await objectiveBanner();
  const result = await battleLoop();
  if (result === 'win') {
    sfx('win');
    await banner('胜 利', ch.title, 'win');
    await dialog(ch.outro);
    // 回写成长、加入新伙伴
    for (const u of B.units) {
      if (!u.id) continue;
      if (u.team === 'player' || u.join) {
        if (!S.roster[u.id]) { S.roster[u.id] = heroData(u.id); S.order.push(u.id); }
        for (const f of PERSIST_FIELDS) S.roster[u.id][f] = u[f];
      }
    }
    S.gold += ch.reward;
    S.chapter = chIdx + 1;
    persist();
    if (S.chapter >= CHAPTERS.length) return showEnding();
    if (ch.reward && !AUTO) await modal('战斗结算', `<p class="center">获得奖励金 <b class="gold">${ch.reward} G</b></p>`, [{ label: '前往营地', value: 1, cls: 'primary' }]);
    return showCamp();
  }
  sfx('lose');
  if (AUTO) return 'lose';
  await banner('战 败', '', 'lose');
  const v = await modal('战斗失败', '<p class="center">胜败乃兵家常事，大侠请重新来过。</p>', [
    { label: '重新挑战', value: 'retry', cls: 'primary' }, { label: '返回标题', value: 'title' }]);
  S = JSON.parse(snapshot);
  if (v === 'retry') return runChapter(chIdx, true);
  return showTitle();
}

async function chapterCard(title) {
  if (AUTO) return;
  const c = $('#chapter-card');
  c.innerHTML = `<div>${esc(title)}</div>`;
  c.hidden = false; c.classList.add('on');
  await sleep(1700);
  c.classList.remove('on'); await sleep(300); c.hidden = true;
}

function objectiveText() {
  const ch = B.def;
  const win = ch.win.type === 'boss' ? `击败 ${B.units.find(u => u.boss).name}` : '击败所有敌人';
  const lose = ch.lose.map(id => (S.roster[id] || HEROES[id]).name).join(' 或 ') + ' 阵亡';
  return { win, lose };
}
async function objectiveBanner() {
  const o = objectiveText();
  await banner('胜利条件：' + o.win, '失败条件：' + o.lose);
}

function checkEnd() {
  if (B.over) return B.over;
  const ch = B.def;
  for (const id of ch.lose) { const u = B.units.find(u => u.id === id); if (u && u.hp <= 0) return (B.over = 'lose'); }
  if (!alive().some(u => u.team === 'player')) return (B.over = 'lose');
  if (ch.win.type === 'boss') { const b = B.units.find(u => u.boss); if (b && b.hp <= 0) return (B.over = 'win'); }
  if (!alive().some(u => u.team === 'enemy' || u.team === 'rogue')) return (B.over = 'win');
  return null;
}

async function battleLoop() {
  let guard = 0;
  while (!B.over) {
    if (++guard > 60) { B.over = 'lose'; break; } // 防止无限回合（自动测试时）
    await phaseStart('player');
    if (B.over) break;
    if (AUTO) await runAI('player');
    else { await new Promise(res => { B.endPhase = res; refreshPanel(); }); B.endPhase = null; }
    if (B.over) break;
    for (const t of ['ally', 'enemy', 'rogue']) {
      if (!alive().some(u => u.team === t)) continue;
      await phaseStart(t);
      if (B.over) break;
      await runAI(t);
      if (B.over) break;
    }
    if (B.over) break;
    B.turn++;
  }
  window.__lastTurn = B.turn;
  setMode('idle');
  return B.over;
}

async function phaseStart(team) {
  B.phase = team;
  setMode('idle');
  for (const u of B.units) if (u.team === team) u.acted = false;
  // 召唤物倒计时
  for (const u of alive().filter(u => u.team === team && u.summonLeft)) {
    if (--u.summonLeft <= 0) { u.hp = 0; floatText(u.x, u.y, '消失', '#ccc'); }
  }
  // 村庄回复
  for (const u of alive().filter(u => u.team === team)) {
    const h = terrAt(u.x, u.y).heal;
    if (h && u.hp < u.mhp) { const v = Math.min(u.mhp - u.hp, Math.ceil(u.mhp * h / 100)); u.hp += v; floatText(u.x, u.y, '+' + v, '#6aff8a'); }
  }
  const label = { player: '我方行动', ally: '友军行动', enemy: '敌军行动', rogue: '第三势力行动' }[team];
  updateHud();
  if (team === 'player') {
    sfx('turn');
    await banner(`第 ${B.turn} 回合`, label, 'player');
    // 剧情事件
    for (const [i, ev] of (B.def.events || []).entries()) {
      if (ev.turn === B.turn && !B.firedEvents.has(i)) {
        B.firedEvents.add(i);
        for (const spec of ev.spawn || []) {
          const u = spawnSpec(spec);
          B.units.push(u);
          addFx('summon', u.x, u.y, 500, { color: '#fff' });
        }
        await wait(400);
        await dialog(ev.dialog);
      }
    }
  } else {
    await banner(label, '', team);
  }
}

function endPlayerPhase() {
  if (B && B.endPhase && B.phase === 'player') { setMode('idle'); B.endPhase(); }
}

// ---------- 行动执行 ----------
async function moveUnit(u, path) {
  if (path.length > 1) sfx('move');
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    await tween(t => { u.px = a.x + (b.x - a.x) * t; u.py = a.y + (b.y - a.y) * t; }, 70);
  }
  const last = path[path.length - 1];
  u.x = last.x; u.y = last.y; delete u.px; delete u.py;
}

async function lunge(a, d) {
  const dx = Math.sign(d.x - a.x) * 0.3, dy = Math.sign(d.y - a.y) * 0.3;
  await tween(t => { a.ox = dx * Math.sin(t * Math.PI); a.oy = dy * Math.sin(t * Math.PI); }, 180);
  a.ox = a.oy = 0;
}

async function applyDamage(a, d, dmg, crit) {
  d.hp = Math.max(0, d.hp - dmg);
  d.flash = performance.now() + T(160);
  floatText(d.x, d.y, (crit ? '暴击 ' : '') + dmg, crit ? '#ffdd44' : '#ffffff', crit);
  sfx(crit ? 'crit' : 'hit');
  if (d.ai === 'hold') d.ai = 'aggr';
  if (!AUTO) { const st = $('#stage'); st.classList.remove('shake'); void st.offsetWidth; if (crit) st.classList.add('shake'); }
  if (d.hp <= 0) await killUnit(d);
}
async function killUnit(u) {
  sfx('die');
  floatText(u.x, u.y, u.boss ? '击破！' : '倒下', '#ff8080');
  u.dying = 1;
  await tween(t => { u.dying = 1 - t; }, 450);
  u.dying = 0;
  // 召唤者倒下时，召唤物一同消失
  for (const s of alive().filter(s => s.summoner === u.uid && s.summonLeft < 90)) s.hp = 0;
}

// 一次打击，返回 {dmg, killed}
async function strike(a, d, calc, ranged) {
  if (ranged) await addFx('arrow', d.x, d.y, 220, { sx: a.x, sy: a.y });
  else await lunge(a, d);
  if (Math.random() * 100 >= calc.hit) { floatText(d.x, d.y, 'MISS', '#aaccff'); sfx('miss'); await wait(250); return { dmg: 0, killed: false }; }
  const crit = Math.random() * 100 < calc.crit;
  let dmg = Math.round(calc.dmg * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1));
  dmg = Math.max(1, dmg);
  if (!ranged) addFx('slash', d.x, d.y, 220);
  await applyDamage(a, d, dmg, crit);
  await wait(250);
  return { dmg, killed: d.hp <= 0 };
}

async function doAttack(a, d) {
  B.cursor = null;
  const ranged = mdist(a.x, a.y, d.x, d.y) > 1;
  const r1 = await strike(a, d, physCalc(a, d), ranged);
  await giveExp(a, d, r1);
  if (d.hp > 0 && a.hp > 0 && canCounter(d, a)) {
    const r2 = await strike(d, a, physCalc(d, a), mdist(a.x, a.y, d.x, d.y) > 1);
    await giveExp(d, a, r2);
  }
}

async function giveExp(u, t, r) {
  if (u.team !== 'player' || u.hp <= 0 || !r || (r.dmg === 0 && !r.killed)) return;
  await gainExp(u, expFor(u, t, r.killed));
}
async function gainExp(u, amt) {
  if (u.team !== 'player') return;
  u.exp += amt;
  floatText(u.x, u.y - 0.4, `EXP+${amt}`, '#9ad8ff');
  while (u.exp >= 100) {
    u.exp -= 100;
    const r = levelUp(u);
    if (!AUTO) {
      sfx('levelup');
      const rows = STATS.map(k => `<div class="lv-row"><span>${STAT_NAME[k]}</span><b>${k === 'hp' ? u.mhp : k === 'mp' ? u.mmp : u[k]}</b>${r.gains[k] ? `<em>+${r.gains[k]}</em>` : ''}</div>`).join('');
      let extra = '';
      if (r.promoted) extra += `<p class="promo">✦ 转职为「${className(u)}」！</p>`;
      for (const s of r.newSkills) extra += `<p class="promo">✦ 习得「${SPELLS[s].name}」！</p>`;
      await modal(`${esc(u.name)} 升级！ Lv ${u.lv}`, `<div class="lv-grid">${rows}</div>${extra}`, [{ label: '好', value: 1, cls: 'primary' }]);
    }
  }
}
function levelUp(u) {
  const C = clsOf(u);
  u.lv++;
  const gains = {};
  for (const k of STATS) {
    const g = C.growth[k];
    let inc = Math.floor(g) + (Math.random() < g % 1 ? 1 : 0);
    gains[k] = inc;
  }
  const nt = tierForLevel(u.cls, u.lv);
  const promoted = nt > u.tier;
  if (promoted) { u.tier = nt; for (const k of STATS) gains[k] += (C.promo && C.promo[k]) || 0; }
  for (const k of STATS) {
    if (k === 'hp') { u.mhp += gains.hp; u.hp += gains.hp; }
    else if (k === 'mp') { u.mmp += gains.mp; u.mp += gains.mp; }
    else u[k] += gains[k];
  }
  const newSkills = C.skills.filter(s => s.lv === u.lv).map(s => s.id);
  return { gains, promoted, newSkills };
}

function areaTiles(x, y, r) { return tilesInRange(x, y, 0, r); }
function spellTargetsAt(u, spId, x, y) {
  const sp = SPELLS[spId];
  const ts = areaTiles(x, y, sp.area || 0);
  const out = [];
  for (const t of ts) {
    const o = unitAt(t.x, t.y); if (!o) continue;
    if (sp.kind === 'heal' ? !hostile(u, o) : hostile(u, o)) out.push(o);
  }
  return out;
}
// 法术可选的目标格
function spellTiles(u, spId) {
  const sp = SPELLS[spId];
  const out = [];
  for (const t of tilesInRange(u.x, u.y, sp.range[0], sp.range[1])) {
    if (sp.kind === 'summon') {
      const tmp = { cls: sp.unit, tier: 0 };
      if (passable(tmp, t.x, t.y) && !unitAt(t.x, t.y)) out.push(t);
    } else if (sp.kind === 'heal') {
      const c = unitAt(t.x, t.y);
      if (sp.area ? spellTargetsAt(u, spId, t.x, t.y).some(o => o.hp < o.mhp) : (c && !hostile(u, c) && c.hp < c.mhp)) out.push(t);
    } else {
      const c = unitAt(t.x, t.y);
      if (c && hostile(u, c)) out.push(t);
    }
  }
  return out;
}

async function castSpell(u, spId, tx, ty) {
  const sp = SPELLS[spId];
  B.cursor = null;
  u.mp -= sp.mp;
  floatText(u.x, u.y, sp.name, '#ffe08a');
  sfx(sp.kind === 'heal' ? 'heal' : 'magic');
  await wait(300);
  if (sp.kind === 'summon') {
    await addFx('summon', tx, ty, 500, { color: sp.unit === 'spirit' ? '#9ae0ff' : '#d08aff' });
    const s = makeMonster(sp.unit, Math.max(1, u.lv), { team: u.team, summonLeft: sp.turns, summoner: u.uid, acted: true });
    if (sp.unit === 'pigdragon') s.name = '豬頭龍';
    s.x = tx; s.y = ty;
    B.units.push(s);
    floatText(tx, ty, '召唤！', '#d8b0ff');
    await gainExp(u, 15);
    return;
  }
  const targets = spellTargetsAt(u, spId, tx, ty);
  // 特效
  const fxt = sp.fx;
  if (fxt === 'beam') await addFx('beam', tx, ty, 500, { sx: u.x, sy: u.y });
  else if (fxt === 'slash') { await lunge(u, { x: tx, y: ty }); addFx('slash', tx, ty, 260); }
  else {
    const cells = areaTiles(tx, ty, sp.area || 0);
    cells.forEach(c => addFx(fxt === 'arrows' && c.x !== tx ? 'fire' : fxt, c.x, c.y, 550));
    await wait(sp.area ? 550 : 450);
  }
  let exp = 0;
  for (const t of targets) {
    if (sp.kind === 'heal') {
      const v = Math.min(t.mhp - t.hp, healAmount(u, sp));
      t.hp += v; floatText(t.x, t.y, '+' + v, '#6aff8a');
      if (t !== u) exp = Math.max(exp, 22);
    } else {
      const c = skillCalc(u, t, sp);
      if (Math.random() * 100 >= c.hit) { floatText(t.x, t.y, 'MISS', '#aaccff'); continue; }
      const crit = Math.random() * 100 < c.crit;
      const dmg = Math.max(1, Math.round(c.dmg * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1)));
      await applyDamage(u, t, dmg, crit);
      exp += expFor(u, t, t.hp <= 0);
    }
  }
  await wait(250);
  if (exp) await gainExp(u, clamp(exp, 1, 100));
}

async function useItem(u, itemId) {
  const it = ITEMS[itemId];
  S.inv[itemId]--; if (S.inv[itemId] <= 0) delete S.inv[itemId];
  if (it.hp) { const v = Math.min(u.mhp - u.hp, it.hp); u.hp += v; floatText(u.x, u.y, '+' + v, '#6aff8a'); }
  if (it.mp) { const v = Math.min(u.mmp - u.mp, it.mp); u.mp += v; floatText(u.x, u.y, 'MP+' + v, '#7ac8ff'); }
  if (it.stat) for (const k in it.stat) { u[k] += it.stat[k]; floatText(u.x, u.y, `${STAT_NAME[k]}+${it.stat[k]}`, '#ffe08a'); }
  sfx('heal');
  addFx('heal', u.x, u.y, 500);
  await wait(500);
}

async function finishUnit(u) {
  u.acted = true;
  if (u.team === 'player' && u.hp > 0) {
    const c = B.chests.find(c => !c.opened && c.x === u.x && c.y === u.y);
    if (c) {
      c.opened = true; sfx('chest');
      S.inv[c.item] = (S.inv[c.item] || 0) + 1;
      if (c.gold) S.gold += c.gold;
      const it = ITEMS[c.item];
      let msg = `获得 ${it.name}${c.gold ? ` 与 ${c.gold} G` : ''}！`;
      // 打开宝箱的角色若能使用且更强，则直接装备
      const slot = it.type === 'weapon' ? 'weapon' : it.type === 'armor' ? 'armor' : null;
      const fits = slot === 'armor' || (slot === 'weapon' && it.kind === clsOf(u).weapon);
      const stat = slot === 'weapon' ? 'atk' : 'def';
      if (slot && fits && itemStat(c.item, stat) > itemStat(u[slot], stat)) {
        if (u[slot]) S.inv[u[slot]] = (S.inv[u[slot]] || 0) + 1;
        u[slot] = c.item;
        if (--S.inv[c.item] <= 0) delete S.inv[c.item];
        msg += ` ${u.name} 装备上了`;
      }
      toast(msg);
      floatText(u.x, u.y, it.name, '#ffe08a');
      await wait(500);
    }
  }
  checkEnd();
  if (B.over && B.endPhase) B.endPhase();
}

// =====================================================================
// 玩家输入
// =====================================================================
function setMode(mode, extra) {
  B.mode = mode;
  Object.assign(B, { hlMove: null, hlAttack: null, hlHeal: null, hlArea: null, hlDanger: null, pending: null }, extra || {});
  if (mode === 'idle') { B.sel = null; B.cursor = null; }
  refreshPanel();
}

cv.addEventListener('click', e => {
  if (!B || AUTO) return;
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / TS), y = Math.floor((e.clientY - r.top) / TS);
  if (!inMap(x, y)) return;
  onTap(x, y);
});

let busy = false;
async function onTap(x, y) {
  if (busy || B.over || B.phase !== 'player' || !B.endPhase) return;
  const u = unitAt(x, y);
  B.focusTile = { x, y };
  switch (B.mode) {
    case 'idle': case 'inspect':
      if (u && u.team === 'player' && !u.acted) return selectUnit(u);
      if (u) {
        sfx('select');
        const th = threatTiles(u);
        setMode('inspect', { hlDanger: th.set, hlMove: new Set([...th.reach.values()].filter(v => v.stop).map(v => key(v.x, v.y))), focus: u });
        B.cursor = { x, y };
        return refreshPanel();
      }
      setMode('idle'); B.focus = null; B.cursor = { x, y }; return refreshPanel();
    case 'move': {
      const sel = B.sel;
      if (u === sel) { return afterMove(); }
      const v = B.reach.get(key(x, y));
      if (v && v.stop) {
        busy = true;
        B.hlMove = null; B.hlDanger = null;
        await moveUnit(sel, pathTo(B.reach, x, y));
        busy = false;
        return afterMove();
      }
      if (u && u.team === 'player' && !u.acted) return selectUnit(u);
      return setMode('idle');
    }
    case 'action':
      return; // 使用底部按钮
    case 'target': case 'spell': {
      const k = key(x, y);
      const valid = (B.hlAttack && B.hlAttack.has(k)) || (B.hlHeal && B.hlHeal.has(k));
      if (!valid) { if (u) { B.focus = u; refreshPanel(); } return; }
      if (B.pending && B.pending.x === x && B.pending.y === y) return confirmPending();
      B.pending = { x, y };
      B.cursor = { x, y };
      if (B.mode === 'spell') {
        const sp = SPELLS[B.spell];
        B.hlArea = new Set(areaTiles(x, y, sp.area || 0).map(t => key(t.x, t.y)));
      }
      B.focus = u || B.sel;
      sfx('select');
      return refreshPanel();
    }
  }
}

function selectUnit(u) {
  sfx('select');
  const reach = reachable(u);
  const stops = [...reach.values()].filter(v => v.stop);
  const atk = new Set();
  const [r0, r1] = rangeOf(u);
  for (const v of stops) for (const t of tilesInRange(v.x, v.y, r0, r1)) if (!reach.get(key(t.x, t.y))?.stop) atk.add(key(t.x, t.y));
  setMode('move', { sel: u, reach, orig: { x: u.x, y: u.y }, focus: u, hlMove: new Set(stops.map(v => key(v.x, v.y))), hlDanger: atk });
  B.cursor = { x: u.x, y: u.y };
  refreshPanel();
}
function afterMove() {
  const u = B.sel;
  setMode('action', { sel: u, focus: u, orig: B.orig });
  B.cursor = { x: u.x, y: u.y };
  refreshPanel();
}
function attackTargets(u) {
  const [r0, r1] = rangeOf(u);
  return tilesInRange(u.x, u.y, r0, r1).map(t => unitAt(t.x, t.y)).filter(o => o && hostile(u, o));
}

async function confirmPending() {
  const u = B.sel, p = B.pending;
  if (!p) return;
  busy = true;
  const mode = B.mode, spell = B.spell;
  setMode('busy', { sel: u });
  if (mode === 'target') await doAttack(u, unitAt(p.x, p.y));
  else await castSpell(u, spell, p.x, p.y);
  await finishUnit(u);
  busy = false;
  afterAction();
}
function afterAction() {
  if (B.over) return;
  setMode('idle');
  if (!alive().some(u => u.team === 'player' && !u.acted)) endPlayerPhase();
}

async function onAction(act) {
  const u = B.sel;
  if (busy) return;
  sfx('select');
  switch (act) {
    case 'attack': {
      const ts = attackTargets(u);
      setMode('target', { sel: u, focus: u, orig: B.orig, hlAttack: new Set(ts.map(o => key(o.x, o.y))) });
      return;
    }
    case 'spell': {
      const list = skillsOf(u).map(id => {
        const sp = SPELLS[id];
        const ok = u.mp >= sp.mp && spellTiles(u, id).length > 0;
        return `<button class="pick" data-pick="${id}" ${ok ? '' : 'disabled'}><b>${sp.name}</b><span>MP ${sp.mp}</span><small>${sp.desc}</small></button>`;
      }).join('');
      const id = await modal('法术 / 技能', `<div class="pick-list">${list}</div>`, [{ label: '返回', value: null }], { dismiss: null });
      if (!id) return;
      const sp = SPELLS[id];
      const tiles = spellTiles(u, id);
      const set = new Set(tiles.map(t => key(t.x, t.y)));
      setMode('spell', { sel: u, focus: u, orig: B.orig, spell: id, [sp.kind === 'heal' || sp.kind === 'summon' ? 'hlHeal' : 'hlAttack']: set });
      return;
    }
    case 'item': {
      const ids = Object.keys(S.inv).filter(id => ITEMS[id].type === 'use' && S.inv[id] > 0);
      const list = ids.map(id => `<button class="pick" data-pick="${id}"><b>${ITEMS[id].name}</b><span>×${S.inv[id]}</span><small>${ITEMS[id].desc}</small></button>`).join('') || '<p class="center dim">没有可用的道具</p>';
      const id = await modal('道具', `<div class="pick-list">${list}</div>`, [{ label: '返回', value: null }], { dismiss: null });
      if (!id) return;
      busy = true; setMode('busy', { sel: u });
      await useItem(u, id);
      await finishUnit(u);
      busy = false;
      return afterAction();
    }
    case 'wait':
      busy = true; setMode('busy', { sel: u });
      await finishUnit(u);
      busy = false;
      return afterAction();
    case 'cancel':
      if (B.mode === 'target' || B.mode === 'spell') return afterMove();
      if (B.orig) { u.x = B.orig.x; u.y = B.orig.y; }
      return setMode('idle');
    case 'confirm':
      return confirmPending();
  }
}

// =====================================================================
// AI
// =====================================================================
function distField(u, foes) {
  const mt = moveTypeOf(u);
  const D = new Map(); const q = [];
  for (const f of foes) { D.set(key(f.x, f.y), 0); q.push({ x: f.x, y: f.y, c: 0 }); }
  while (q.length) {
    q.sort((a, b) => a.c - b.c);
    const cur = q.shift();
    if (cur.c > D.get(key(cur.x, cur.y))) continue;
    for (const [dx, dy] of DIRS) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (!inMap(nx, ny)) continue;
      const cost = TERRAIN[tileAt(nx, ny)].cost[mt];
      if (cost >= 99) continue;
      const nc = cur.c + cost, k = key(nx, ny);
      if (D.has(k) && D.get(k) <= nc) continue;
      D.set(k, nc); q.push({ x: nx, y: ny, c: nc });
    }
  }
  return D;
}

async function runAI(team) {
  const list = alive().filter(u => u.team === team && !u.acted);
  for (const u of list) {
    if (B.over) return;
    if (u.hp <= 0 || u.acted) continue;
    if (!AUTO) { B.focus = u; B.cursor = { x: u.x, y: u.y }; refreshPanel(); await wait(160); }
    await aiUnit(u);
    if (u.hp > 0) await finishUnit(u); else checkEnd();
    await wait(100);
  }
  B.cursor = null;
}

// 预估各格子在敌方下一阶段会受到的伤害（友方 AI 用来避免孤军深入）
function dangerMap(u, foes) {
  const D = new Map();
  for (const f of foes) {
    const ox = u.x, oy = u.y; u.x = -99; u.y = -99; // 不阻挡敌人路径
    const th = threatTiles(f);
    u.x = ox; u.y = oy;
    let dmg = Math.max(1, atkOf(f) - Math.round(defOf(u) * 0.5));
    for (const id of skillsOf(f)) { const sp = SPELLS[id]; if (sp.kind === 'magic' && f.mp >= sp.mp) dmg = Math.max(dmg, magCalc(f, u, sp).dmg); }
    for (const k of th.set) D.set(k, (D.get(k) || 0) + dmg);
  }
  return D;
}

async function aiUnit(u) {
  const foes = alive().filter(o => hostile(u, o));
  if (!foes.length) return;
  const careful = (u.team === 'player' || u.team === 'ally') && (u.lord || B.turn <= 6);
  const danger = careful ? dangerMap(u, foes) : null;
  const risk = (st, hpLeft) => { if (!danger) return 0; const d = danger.get(key(st.x, st.y)) || 0; return d >= hpLeft ? (u.lord ? 300 : 60) + d : d * 0.4; };
  const reach = reachable(u);
  const stops = [...reach.values()].filter(v => v.stop && (u.ai !== 'guard' || (v.x === u.x && v.y === u.y)));
  const skills = skillsOf(u).filter(id => u.mp >= SPELLS[id].mp);
  const friends = alive().filter(o => !hostile(u, o));
  const here = reach.get(key(u.x, u.y));
  // 原地已脱离战斗且不主动出击的单位
  const restrained = u.ai === 'hold' || u.ai === 'boss' || u.ai === 'guard';

  // 1) 治疗
  for (const id of skills.filter(id => SPELLS[id].kind === 'heal')) {
    const sp = SPELLS[id];
    let best = null;
    for (const st of restrained ? [here] : stops) {
      for (const f of friends) {
        const d = mdist(st.x, st.y, f.x, f.y);
        if (d < sp.range[0] || d > sp.range[1] || f.hp > f.mhp * 0.6) continue;
        const score = (f.mhp - f.hp) + (f.lord ? 10 : 0) - st.c * 0.5;
        if (!best || score > best.score) best = { score, st, f };
      }
    }
    if (best) {
      await moveUnit(u, pathTo(reach, best.st.x, best.st.y));
      await castSpell(u, id, best.f.x, best.f.y);
      return;
    }
  }
  // 2) 召唤
  const sid = skills.find(id => SPELLS[id].kind === 'summon');
  if (sid && !alive().some(o => o.summoner === u.uid)) {
    const near = Math.min(...foes.map(f => mdist(u.x, u.y, f.x, f.y)));
    const tiles = spellTiles(u, sid);
    if (near <= 9 && tiles.length) { await castSpell(u, sid, tiles[0].x, tiles[0].y); return; }
  }
  // 3) 攻击
  let best = null;
  const [r0, r1] = rangeOf(u);
  const consider = (score, st, act, tx, ty, id) => { if (!best || score > best.score) best = { score, st, act, tx, ty, id }; };
  for (const st of stops) {
    const tdef = TERRAIN[tileAt(st.x, st.y)].def;
    const ox = u.x, oy = u.y; u.x = st.x; u.y = st.y; // 暂时移动以计算反击距离
    for (const f of foes) {
      const d = mdist(st.x, st.y, f.x, f.y);
      if (d >= r0 && d <= r1) {
        const c = physCalc(u, f);
        let s = c.dmg * c.hit / 100 + (c.dmg >= f.hp ? 40 * c.hit / 100 : 0) + (f.lord ? 6 : 0) + tdef * 0.04 - st.c * 0.05;
        const ctr = c.dmg < f.hp && canCounter(f, u) ? physCalc(f, u).dmg : 0;
        s -= ctr * 0.35 + risk(st, u.hp - ctr) * (c.dmg >= f.hp && !u.lord ? 0.5 : 1);
        consider(s, st, 'attack', f.x, f.y);
      }
    }
    for (const id of skills) {
      const sp = SPELLS[id];
      if (!sp.power || sp.kind === 'heal') continue;
      for (const t of tilesInRange(st.x, st.y, sp.range[0], sp.range[1])) {
        const c0 = unitAt(t.x, t.y);
        if (!c0 || !hostile(u, c0)) continue;
        let s = 0;
        for (const f of spellTargetsAt(u, id, t.x, t.y)) {
          const c = skillCalc(u, f, sp);
          s += c.dmg * c.hit / 100 + (c.dmg >= f.hp ? 40 : 0) + (f.lord ? 6 : 0);
        }
        s += tdef * 0.04 - sp.mp * 0.25 - st.c * 0.05 - risk(st, u.hp);
        consider(s, st, 'spell', t.x, t.y, id);
      }
    }
    u.x = ox; u.y = oy;
  }
  if (best && (!careful || best.score > 0)) {
    if (u.ai === 'hold') u.ai = 'aggr';
    await moveUnit(u, pathTo(reach, best.st.x, best.st.y));
    if (best.act === 'attack') await doAttack(u, unitAt(best.tx, best.ty));
    else await castSpell(u, best.id, best.tx, best.ty);
    return;
  }
  if (restrained) return;
  // 4) 接近最近的敌人
  const D = distField(u, foes);
  let pick = null;
  for (const st of stops) {
    const dv = D.has(key(st.x, st.y)) ? D.get(key(st.x, st.y)) : 999;
    const s = dv * 10 - TERRAIN[tileAt(st.x, st.y)].def * 0.05 + risk(st, u.hp) * 3 + (careful && u.lord ? dv * 4 : 0);
    if (!pick || s < pick.s) pick = { s, st };
  }
  if (pick) await moveUnit(u, pathTo(reach, pick.st.x, pick.st.y));
}

// =====================================================================
// 战斗 HUD / 面板
// =====================================================================
function updateHud() {
  if (!B) return;
  const name = { player: '我方', ally: '友军', enemy: '敌军', rogue: '第三势力' }[B.phase];
  $('#hud-turn').innerHTML = `第 <b>${B.turn}</b> 回合 · <span class="ph-${B.phase}">${name}</span>`;
}

function unitInfoHtml(u) {
  const t = terrAt(u.x, u.y);
  const w = u.weapon ? ITEMS[u.weapon].name : '—', a = u.armor ? ITEMS[u.armor].name : '—';
  const teamName = { player: '我方', ally: '友军', enemy: '敌军', rogue: '第三势力' }[u.team];
  return `<div class="ui-row">
    <div class="ui-port" data-port="${u.uid}"></div>
    <div class="ui-main">
      <div class="ui-name"><b>${esc(u.name)}</b> <span class="tag t-${u.team}">${teamName}</span> <span>${className(u)} Lv${u.lv}</span>${u.team === 'player' ? `<span class="dim"> EXP ${u.exp}</span>` : ''}</div>
      ${hpBar(u.hp, u.mhp, 'hp')}${u.mmp ? hpBar(u.mp, u.mmp, 'mp') : ''}
      <div class="ui-stats">攻<b>${atkOf(u)}</b> 防<b>${defOf(u)}</b> 魔<b>${magOf(u)}</b> 速<b>${u.spd}</b> 移<b>${movOf(u)}</b> <span class="dim">${t.name}${t.def ? ' 防+' + t.def + '%' : ''}</span></div>
      <div class="ui-stats dim">${w} / ${a}</div>
    </div></div>`;
}
function forecastHtml() {
  const u = B.sel, p = B.pending;
  if (!p) return '';
  const t = unitAt(p.x, p.y);
  if (B.mode === 'target' && t) {
    const c = physCalc(u, t);
    const ox = u.x, oy = u.y;
    const counter = canCounter(t, u) ? physCalc(t, u) : null;
    void ox; void oy;
    return `<div class="fc">
      <div class="fc-side"><b>${esc(u.name)}</b><div>伤害 <em>${c.dmg}</em> 命中 ${c.hit}% 暴击 ${c.crit}%</div></div>
      <div class="fc-vs">⚔</div>
      <div class="fc-side"><b>${esc(t.name)}</b> HP ${t.hp}/${t.mhp}<div>${counter ? `反击 <em>${counter.dmg}</em> 命中 ${counter.hit}%` : '无法反击'}</div></div>
    </div>`;
  }
  if (B.mode === 'spell') {
    const sp = SPELLS[B.spell];
    if (sp.kind === 'summon') return `<div class="fc"><div class="fc-side"><b>${sp.name}</b><div>在此处召唤${CLASSES[sp.unit].tiers[0].name}（${sp.turns} 回合）</div></div></div>`;
    const ts = spellTargetsAt(u, B.spell, p.x, p.y);
    const rows = ts.map(o => sp.kind === 'heal' ? `${esc(o.name)} 回复 <em>${Math.min(o.mhp - o.hp, healAmount(u, sp))}</em>` : `${esc(o.name)} 伤害 <em>${skillCalc(u, o, sp).dmg}</em>${skillCalc(u, o, sp).hit < 100 ? ` (${skillCalc(u, o, sp).hit}%)` : ''}`).join('<br>');
    return `<div class="fc"><div class="fc-side"><b>${sp.name}</b> <span class="dim">MP ${sp.mp}</span><div>${rows}</div></div></div>`;
  }
  return '';
}

function refreshPanel() {
  if (!B || AUTO) return;
  updateHud();
  const info = $('#info'), acts = $('#actions');
  const f = B.focus && B.focus.hp > 0 ? B.focus : null;
  let html = '';
  if (B.pending) html = forecastHtml();
  else if (f) html = unitInfoHtml(f);
  else if (B.focusTile) { const t = terrAt(B.focusTile.x, B.focusTile.y); html = `<div class="ui-hint">${t.name} · 防御+${t.def}% · 回避+${t.avoid}${t.heal ? ' · 每回合回复 ' + t.heal + '% HP' : ''}</div>`; }
  else html = `<div class="ui-hint">点击我方单位进行移动与行动，点击敌人查看其攻击范围。</div>`;
  info.innerHTML = html;
  const pp = info.querySelector('[data-port]');
  if (pp && f) { const c = document.createElement('canvas'); c.width = c.height = 16; c.className = 'pix'; c.getContext('2d').drawImage(unitSprite(f), 0, 0); pp.appendChild(c); }

  const btn = (label, act, cls, dis) => `<button class="btn ${cls || ''}" data-act="${act}" ${dis ? 'disabled' : ''}>${label}</button>`;
  let b = '';
  const myTurn = B.phase === 'player' && B.endPhase && !B.over;
  switch (B.mode) {
    case 'idle': case 'inspect':
      b = btn('目标', 'objective') + btn('菜单', 'menu') + btn('结束回合', 'endturn', 'primary', !myTurn);
      break;
    case 'move':
      b = btn('取消', 'cancel');
      break;
    case 'action': {
      const u = B.sel;
      const canAtk = attackTargets(u).length > 0;
      const canSpell = skillsOf(u).some(id => u.mp >= SPELLS[id].mp && spellTiles(u, id).length > 0);
      const hasItem = Object.keys(S.inv).some(id => ITEMS[id].type === 'use');
      b = btn('攻击', 'attack', 'red', !canAtk) + btn('法术', 'spell', 'purple', !canSpell) + btn('道具', 'item', '', !hasItem) + btn('待机', 'wait', 'primary') + btn('取消', 'cancel');
      break;
    }
    case 'target': case 'spell':
      b = (B.pending ? btn('确认', 'confirm', 'primary') : `<span class="dim small">${B.mode === 'target' ? '选择攻击目标' : '选择法术目标'}（再次点击确认）</span>`) + btn('返回', 'cancel');
      break;
    case 'busy':
      b = '';
      break;
  }
  acts.innerHTML = b;
}

$('#actions').addEventListener('click', async e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || !B) return;
  const act = el.dataset.act;
  if (act === 'endturn') {
    sfx('select');
    const left = alive().filter(u => u.team === 'player' && !u.acted).length;
    if (left) { const ok = await modal('结束回合', `<p class="center">还有 ${left} 名角色未行动，确定结束回合吗？</p>`, [{ label: '结束回合', value: 1, cls: 'primary' }, { label: '取消', value: 0 }]); if (!ok) return; }
    return endPlayerPhase();
  }
  if (act === 'objective') { const o = objectiveText(); sfx('select'); return modal('作战目标', `<p><b class="win-c">胜利</b>　${esc(o.win)}</p><p><b class="lose-c">失败</b>　${esc(o.lose)}</p><p class="dim small">宝箱：让我方角色移动到宝箱上并结束行动即可开启。</p>`, [{ label: '确定', value: 1 }], { dismiss: 1 }); }
  if (act === 'menu') return battleMenu();
  return onAction(act);
});

async function battleMenu() {
  sfx('select');
  const v = await modal('菜单', '', [
    { label: '继续游戏', value: 'back', cls: 'primary' },
    { label: `音效：${OPT.sound ? '开' : '关'}`, value: 'sound' },
    { label: `战斗速度：${OPT.fast ? '快' : '标准'}`, value: 'fast' },
    { label: '重新开始本章', value: 'restart' },
    { label: '返回标题', value: 'title' },
  ], { dismiss: 'back' });
  if (v === 'sound') { OPT.sound = !OPT.sound; saveOpt(); return battleMenu(); }
  if (v === 'fast') { OPT.fast = !OPT.fast; saveOpt(); return battleMenu(); }
  if (v === 'restart' || v === 'title') {
    const ok = await modal('确认', '<p class="center">当前战斗进度将会丢失，确定吗？</p>', [{ label: '确定', value: 1, cls: 'red' }, { label: '取消', value: 0 }]);
    if (!ok) return;
    const saved = readSave();
    abortBattle();
    if (saved) S = saved; // 回到本章开始前的存档
    else newSave();
    if (v === 'restart') return runChapter(S.chapter, true);
    return showTitle();
  }
}
function abortBattle() {
  if (!B) return;
  B.over = 'abort';
  if (B.endPhase) B.endPhase();
  B = null;
}

// =====================================================================
// 营地
// =====================================================================
let campTab = 'party';
function showCamp() {
  B = null;
  show('camp');
  renderCamp();
}
function renderCamp() {
  const next = CHAPTERS[S.chapter];
  $('#camp-next').textContent = next ? next.title : '';
  $('#camp-gold').textContent = S.gold + ' G';
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.tab === campTab);
  const body = $('#camp-body');
  if (campTab === 'party') {
    body.innerHTML = S.order.map(id => {
      const d = S.roster[id];
      const u = Object.assign({}, d);
      const sk = skillsOf(u).map(s => SPELLS[s].name).join('、') || '—';
      return `<div class="card">
        <div class="card-top"><div class="port" data-hero="${id}"></div>
          <div><b>${esc(d.name)}</b> <span class="dim">${className(u)} Lv${d.lv}</span><br>
          <span class="small">HP ${d.mhp} · MP ${d.mmp} · 攻 ${atkOf(u)} · 防 ${defOf(u)} · 魔 ${magOf(u)} · 速 ${d.spd} · 移 ${movOf(u)}</span><br>
          <span class="small dim">EXP ${d.exp}/100 · 技能：${sk}</span></div></div>
        <div class="card-btns">
          <button class="btn small" data-equip="${id}" data-slot="weapon">武器：${d.weapon ? ITEMS[d.weapon].name : '无'}</button>
          <button class="btn small" data-equip="${id}" data-slot="armor">防具：${d.armor ? ITEMS[d.armor].name : '无'}</button>
        </div>
        <p class="small dim bio">${HEROES[id].bio}</p>
      </div>`;
    }).join('');
    for (const p of body.querySelectorAll('[data-hero]')) { const c = portraitCanvas(p.dataset.hero, 48); if (c) p.appendChild(c); }
  } else if (campTab === 'items') {
    const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0);
    body.innerHTML = ids.length ? ids.map(id => {
      const it = ITEMS[id];
      const desc = it.desc || (it.type === 'weapon' ? `攻击 +${it.atk}${it.mag ? ' 魔力 +' + it.mag : ''}（${{ sword: '剑', lance: '枪', bow: '弓', staff: '杖', axe: '斧' }[it.kind]}）` : `防御 +${it.def}`);
      const canUse = it.type === 'use' && it.stat;
      const sell = it.price ? Math.floor(it.price / 2) : 0;
      return `<div class="row-item"><div><b>${it.name}</b> ×${S.inv[id]}<br><span class="small dim">${desc}</span></div>
        <div>${canUse ? `<button class="btn small primary" data-use="${id}">使用</button>` : ''}${sell ? `<button class="btn small" data-sell="${id}">卖 ${sell}G</button>` : ''}</div></div>`;
    }).join('') : '<p class="center dim">背包空空如也</p>';
  } else {
    body.innerHTML = SHOP_STOCK.map(id => {
      const it = ITEMS[id];
      const desc = it.desc || (it.type === 'weapon' ? `攻击 +${it.atk}${it.mag ? ' 魔力 +' + it.mag : ''}（${{ sword: '剑', lance: '枪', bow: '弓', staff: '杖' }[it.kind]}）` : `防御 +${it.def}`);
      return `<div class="row-item"><div><b>${it.name}</b> <span class="dim small">持有 ${S.inv[id] || 0}</span><br><span class="small dim">${desc}</span></div>
        <button class="btn small ${S.gold >= it.price ? 'primary' : ''}" data-buy="${id}" ${S.gold >= it.price ? '' : 'disabled'}>${it.price} G</button></div>`;
    }).join('');
  }
}
$('#camp').addEventListener('click', async e => {
  const t = e.target.closest('.tab');
  if (t) { sfx('select'); campTab = t.dataset.tab; return renderCamp(); }
  const buy = e.target.closest('[data-buy]');
  if (buy) { const it = ITEMS[buy.dataset.buy]; if (S.gold >= it.price) { S.gold -= it.price; S.inv[buy.dataset.buy] = (S.inv[buy.dataset.buy] || 0) + 1; sfx('chest'); toast(`购买了 ${it.name}`); persist(); renderCamp(); } return; }
  const sell = e.target.closest('[data-sell]');
  if (sell) { const id = sell.dataset.sell; S.gold += Math.floor(ITEMS[id].price / 2); if (--S.inv[id] <= 0) delete S.inv[id]; sfx('select'); persist(); return renderCamp(); }
  const use = e.target.closest('[data-use]');
  if (use) {
    const id = use.dataset.use;
    const list = S.order.map(h => `<button class="pick" data-pick="${h}"><b>${S.roster[h].name}</b><small>攻 ${S.roster[h].atk} 防 ${S.roster[h].def}</small></button>`).join('');
    const who = await modal(`使用 ${ITEMS[id].name}`, `<div class="pick-list">${list}</div>`, [{ label: '取消', value: null }], { dismiss: null });
    if (!who) return;
    for (const k in ITEMS[id].stat) S.roster[who][k] += ITEMS[id].stat[k];
    if (--S.inv[id] <= 0) delete S.inv[id];
    sfx('levelup'); toast(`${S.roster[who].name} 的能力提升了！`); persist(); return renderCamp();
  }
  const eq = e.target.closest('[data-equip]');
  if (eq) {
    const id = eq.dataset.equip, slot = eq.dataset.slot, d = S.roster[id];
    const kind = CLASSES[d.cls].weapon;
    const opts = Object.keys(S.inv).filter(i => S.inv[i] > 0 && ITEMS[i].type === slot && (slot === 'armor' || ITEMS[i].kind === kind));
    const list = opts.map(i => `<button class="pick" data-pick="${i}"><b>${ITEMS[i].name}</b><small>${slot === 'weapon' ? '攻击 +' + ITEMS[i].atk + (ITEMS[i].mag ? ' 魔力 +' + ITEMS[i].mag : '') : '防御 +' + ITEMS[i].def}</small></button>`).join('')
      + (d[slot] ? `<button class="pick" data-pick="__none"><b>卸下</b><small>${ITEMS[d[slot]].name}</small></button>` : '');
    const pick = await modal(`${d.name} 的${slot === 'weapon' ? '武器' : '防具'}`, `<div class="pick-list">${list || '<p class="center dim">没有可装备的物品</p>'}</div>`, [{ label: '取消', value: null }], { dismiss: null });
    if (!pick) return;
    if (d[slot]) S.inv[d[slot]] = (S.inv[d[slot]] || 0) + 1;
    if (pick === '__none') d[slot] = null;
    else { d[slot] = pick; if (--S.inv[pick] <= 0) delete S.inv[pick]; }
    persist(); return renderCamp();
  }
});
$('#camp-go').addEventListener('click', () => { sfx('select'); runChapter(S.chapter); });
$('#camp-title').addEventListener('click', () => { sfx('select'); persist(); showTitle(); });

// =====================================================================
// 标题 / 结局
// =====================================================================
function showTitle() {
  B = null;
  show('title');
  const sv = readSave();
  $('#btn-continue').hidden = !sv;
  if (sv) $('#btn-continue').textContent = `继续旅程（${sv.chapter >= CHAPTERS.length ? '已通关' : CHAPTERS[sv.chapter].title}）`;
}
async function showEnding() {
  show('ending');
  const box = $('#ending-scroll');
  box.innerHTML = '';
  await dialog(ENDING);
  sfx('win');
  box.innerHTML = `<h2>— 全剧终 —</h2>
    <p>感谢游玩《超时空英雄传说 · 移动重制版》</p>
    <p class="dim">本作为粉丝向的非官方重制，<br>谨此致敬 宇峻科技 1996 年的经典战棋游戏<br>《超时空英雄传说》。</p>
    <button class="btn primary" id="btn-end-title">返回标题</button>`;
  $('#btn-end-title').onclick = () => { S.chapter = CHAPTERS.length; persist(); showTitle(); };
}

$('#btn-new').addEventListener('click', async () => {
  sfx('select');
  if (readSave()) {
    const ok = await modal('新的旅程', '<p class="center">将覆盖现有存档，确定吗？</p>', [{ label: '开始', value: 1, cls: 'primary' }, { label: '取消', value: 0 }]);
    if (!ok) return;
  }
  newSave(); persist();
  runChapter(0);
});
$('#btn-continue').addEventListener('click', () => {
  sfx('select');
  S = readSave();
  if (!S) return;
  if (S.chapter >= CHAPTERS.length) return showEnding();
  if (S.chapter === 0) return runChapter(0);
  showCamp();
});
$('#btn-help').addEventListener('click', () => {
  sfx('select');
  modal('游戏说明', `
    <div class="help">
    <p><b>操作</b>：点击我方角色 → 点击蓝色格子移动 → 选择「攻击 / 法术 / 道具 / 待机」。选中目标后再点一次（或按「确认」）执行。</p>
    <p><b>查看敌人</b>：点击敌方单位可显示其移动（蓝）与攻击（红）范围。</p>
    <p><b>地形</b>：森林、山地、村庄、城堡提供防御与回避加成，村庄每回合回复 HP。骑兵难以进入森林与山地，飞行单位无视地形。</p>
    <p><b>反击</b>：被攻击的一方若射程够得着，会自动反击。弓兵无法反击贴身的敌人。</p>
    <p><b>成长</b>：获得 100 经验升级；Lv5 / Lv10 / Lv15 自动转职（如 剑士 → 高级剑士 → 银剑士 → 黄金剑士），并习得新技能。</p>
    <p><b>宝箱</b>：移动到宝箱上并结束行动即可开启。</p>
    <p><b>营地</b>：每章之间可在营地更换装备、使用道具与购物。进度会自动保存在本机浏览器。</p>
    <p class="dim">提示：在手机浏览器中选择「添加到主屏幕」，即可像 App 一样全屏游玩。</p>
    </div>`, [{ label: '明白了', value: 1, cls: 'primary' }], { dismiss: 1, wide: true });
});
$('#btn-sound').addEventListener('click', () => { OPT.sound = !OPT.sound; saveOpt(); $('#btn-sound').textContent = OPT.sound ? '🔊' : '🔇'; sfx('select'); });

// 标题画面：时空裂缝星空
(function titleFx() {
  const c = $('#title-bg'), g = c.getContext('2d');
  const stars = Array.from({ length: 140 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.2 + Math.random() * 0.8 }));
  const loop = now => {
    requestAnimationFrame(loop);
    if ($('#title').hidden) return;
    const w = c.width = c.clientWidth, h = c.height = c.clientHeight;
    g.fillStyle = '#07041a'; g.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.36, R = Math.max(w, h) * 0.7;
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    grd.addColorStop(0, 'rgba(160,110,255,0.55)'); grd.addColorStop(0.3, 'rgba(80,40,180,0.25)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (const s of stars) {
      s.r += 0.0015 * s.s; if (s.r > 1) s.r = 0.02;
      const d = s.r * s.r * R, x = cx + Math.cos(s.a + now / 9000) * d, y = cy + Math.sin(s.a + now / 9000) * d * 0.8;
      g.fillStyle = `rgba(220,210,255,${Math.min(1, s.r * 2)})`;
      const z = 1 + s.r * 2.5; g.fillRect(x, y, z, z);
    }
  };
  requestAnimationFrame(loop);
})();

// 标题画面的英雄像
(function titleHeroes() {
  const row = $('#title-heroes');
  for (const id of ['yangtie', 'mengqi', 'shirley']) { const c = portraitCanvas(id, 56); if (c) row.appendChild(c); }
})();

// =====================================================================
// 启动
// =====================================================================
loadOpt();
$('#btn-sound').textContent = OPT.sound ? '🔊' : '🔇';
showTitle();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });

// 测试接口：自动对战全部章节
window.__autoplay = async function (chapters) {
  AUTO = true; newSave();
  const out = [];
  for (let i = 0; i < (chapters || CHAPTERS.length); i++) {
    const before = S.chapter;
    const r = await runChapter(i, true);
    const won = S.chapter > before;
    out.push({ ch: i, won, turns: B ? B.turn : null, lv: S.order.map(id => S.roster[id].name + S.roster[id].lv).join(' ') });
    if (!won) { if (r === 'lose') { S.chapter = i + 1; } }
  }
  AUTO = false;
  return out;
};
