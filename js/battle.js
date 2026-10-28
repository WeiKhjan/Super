// 超时空英雄传说 · 移动重制版 —— 战斗引擎（规则、单位、AI、渲染、操作）
'use strict';

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (x, y) => x + ',' + y;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const STATS = ['hp', 'mp', 'atk', 'def', 'mag', 'spd'];
const STAT_NAME = { hp: 'HP', mp: 'MP', atk: '攻击', def: '防御', mag: '魔力', spd: '敏捷' };
const STATUS_NAME = { petrify: '石化', freeze: '冻结', blind: '失明', poison: '中毒', silence: '禁锢', noCounter: '无法反击' };
const STATUS_COLOR = { petrify: '#9a9aa8', freeze: '#7ad8ff', blind: '#f4e04a', poison: '#a04ad8', silence: '#ff7ab0', noCounter: '#ff9a3a' };
const BUFF_NAME = { atk: '攻击', def: '防御', mag: '魔力', mov: '移动', skill: '战技', fly: '飞行', bless: '祝福' };
const LEVEL_CAP = 40;

const OPT = { sound: true, music: true, fast: false, easy: false, anim: true };
let AUTO = false; // 自动对战（测试用）：我方也由 AI 控制，跳过动画与对话
const T = ms => (AUTO ? 0 : OPT.fast ? ms / 2.5 : ms);
const wait = ms => (T(ms) > 0 ? sleep(T(ms)) : Promise.resolve());

// =====================================================================
// 职业与能力
// =====================================================================
let UID = 1;
const clsOf = u => CLASSES[u.cls];
function tierForLevel(cls, lv) {
  const tiers = CLASSES[cls].tiers;
  let t = 0;
  tiers.forEach((x, i) => { if (lv >= x.lv) t = i; });
  return t;
}
// 转职分支：B 路线单位在分支阶之后使用 alt 的职阶、成长与招式
const altOf = u => { const a = clsOf(u).alt; return a && u.path === 'b' && u.tier >= a.at ? a : null; };
const branchLv = C => C.alt ? C.tiers[C.alt.at].lv : 99;
const growthOf = u => (altOf(u) || clsOf(u)).growth;
const tierDef = u => { const a = altOf(u); return a ? a.tiers[Math.min(u.tier - a.at, a.tiers.length - 1)] : clsOf(u).tiers[Math.min(u.tier, clsOf(u).tiers.length - 1)]; };
const className = u => tierDef(u).name;
const itemStat = (id, k) => (id && ITEMS[id] && ITEMS[id][k]) || 0;
const gear = (u, k) => itemStat(u.weapon, k) + itemStat(u.armor, k) + itemStat(u.acc, k);
function buffOf(u, stat) {
  let v = 0;
  for (const b of u.buffs || []) { if (b.stat === stat) v += b.amount; if (b.stat === 'bless' && ['atk', 'def', 'mag'].includes(stat)) v += b.amount; }
  return v;
}
const atkOf = u => Math.max(0, u.atk + gear(u, 'atk') + buffOf(u, 'atk'));
const magOf = u => Math.max(0, u.mag + gear(u, 'mag') + buffOf(u, 'mag'));
const defOf = u => Math.max(0, u.def + gear(u, 'def') + buffOf(u, 'def') + (u.status && u.status.petrify ? 10 : 0));
const spdOf = u => u.spd + gear(u, 'spd');
const movOf = u => Math.max(1, tierDef(u).mov + gear(u, 'mov') + buffOf(u, 'mov'));
const moveTypeOf = u => (buffOf(u, 'fly') > 0 && tierDef(u).move !== 'water' ? 'fly' : tierDef(u).move);
const rangeOf = u => tierDef(u).range;
const hitBonus = u => gear(u, 'hit') + buffOf(u, 'skill');
const critBonus = u => gear(u, 'crit') + Math.round(buffOf(u, 'skill') / 2);
const typeOf = u => clsOf(u).type;
const isFlying = u => moveTypeOf(u) === 'fly';
const hasStatus = (u, s) => !!(u.status && u.status[s] > 0);
const canAct = u => !hasStatus(u, 'petrify') && !hasStatus(u, 'freeze') && !hasStatus(u, 'blind');
const spriteKey = u => (altOf(u) || clsOf(u)).sprite;

function skillsOf(u) {
  const C = clsOf(u), A = u.path === 'b' && C.alt;
  // B 路线：分支等级之后的职业招式改为 B 路线的招式
  let list = A ? C.skills.filter(s => s[0] < branchLv(C)).concat(C.alt.skills) : C.skills.slice();
  if (u.element && SHAMAN_SKILLS[u.element]) list = list.concat(SHAMAN_SKILLS[u.element]);
  if (u.cls === 'dragon' && u.color && DRAGON_BREATH[u.color]) list = list.filter(s => s[1] !== 'breathFire').concat([[1, DRAGON_BREATH[u.color]]]);
  const h = u.id && HEROES[u.id];
  if (h && h.skills) list = list.concat(h.skills);
  if (h && h.noSkills) list = list.filter(s => !h.noSkills.includes(s[1]));
  const seen = new Set(), out = [];
  // 敌方杂兵只会使用与等级相称的招式，大招留给首领
  const grunt = !u.id && !u.boss && (u.team === 'enemy' || u.team === 'rogue');
  const cap = grunt ? 10 + u.lv / 5 : 99;
  // 杂兵的职业战技只用单体的基本招式（贯穿、范围技留给我方与首领）
  const gruntOk = (sp, lv) => !grunt || (sp.kind === 'phys' && (sp.line || sp.area || shaped(sp)) ? false
    : !['枪', '斧', '刀', '弓', '翼', '牙'].includes(sp.school) || (!sp.line && !sp.area && !shaped(sp) && (sp.power || 0) <= 6 && u.lv >= lv + 5));
  for (const [lv, id] of list) if (lv <= u.lv && !seen.has(id) && SPELLS[id].mp <= cap && gruntOk(SPELLS[id], lv)) { seen.add(id); out.push(id); }
  return out;
}
function canUseWeapon(u, itemId) {
  const it = ITEMS[itemId], w = (altOf(u) && altOf(u).weapon) || clsOf(u).weapon;
  return !!(it && it.type === 'weapon' && w && w.includes(it.kind));
}

// 兵种相克倍率
function advMult(a, d) {
  const row = ADV[typeOf(a)] || (isFlying(a) && typeOf(a) === '骑兵' ? ADV['飞行'] : null);
  if (!row) return 1;
  let v = row[typeOf(d)];
  if (v === undefined && isFlying(d) && !['龙族', '鹰族'].includes(typeOf(d))) v = row['飞行'];
  return v === undefined ? 1 : ADV_MULT[v];
}

// =====================================================================
// 英雄数据（存档中的成长）与单位生成
// =====================================================================
const PERSIST_FIELDS = ['lv', 'exp', 'tier', 'path', 'mhp', 'mmp', 'atk', 'def', 'mag', 'spd', 'weapon', 'armor', 'acc'];
function heroData(id, minLv) {
  const h = HEROES[id], C = CLASSES[h.cls];
  const d = {
    id, name: h.name, cls: h.cls, lv: h.lv, exp: 0, tier: tierForLevel(h.cls, h.lv), hair: h.hair, lord: !!h.lord,
    mhp: h.stats.hp, mmp: h.stats.mp, atk: h.stats.atk, def: h.stats.def, mag: h.stats.mag, spd: h.stats.spd,
    weapon: h.weapon || null, armor: h.armor || null, acc: null,
  };
  // 入队时追上队伍等级：按成长率平均值补足
  while (minLv && d.lv < Math.min(minLv, LEVEL_CAP)) {
    d.lv++;
    for (const k of STATS) { const f = k === 'hp' ? 'mhp' : k === 'mp' ? 'mmp' : k; d[f] += Math.round(C.growth[k]); }
    const nt = tierForLevel(d.cls, d.lv);
    if (nt > d.tier) { d.tier = nt; for (const k of STATS) { const f = k === 'hp' ? 'mhp' : k === 'mp' ? 'mmp' : k; d[f] += (C.promo && C.promo[k]) || 0; } }
  }
  return d;
}
function battleUnitFromHero(data, team, x, y) {
  return Object.assign({}, data, { uid: UID++, team, x, y, hp: data.mhp, mp: data.mmp, acted: false, ai: 'aggr', status: {}, buffs: [] });
}
function weaponFor(cls, lv) {
  const w = CLASSES[cls].weapon;
  if (!w) return null;
  const list = DEFAULT_WEAPONS[w[0]];
  return list ? list[lv < 6 ? 0 : lv < 12 ? 1 : lv < 19 ? 2 : lv < 26 ? 3 : 4] : null;
}
function makeMonster(kind, lv, opts) {
  const cls = KIND_ALIAS[kind] || kind;
  const C = CLASSES[cls];
  lv = Math.max(1, lv | 0);
  const tier = tierForLevel(cls, lv);
  const u = { uid: UID++, id: null, cls, lv, exp: 0, tier, team: 'enemy', ai: 'aggr', acted: false, status: {}, buffs: [] };
  const slv = opts && opts.boss ? Math.max(1, lv - 2) : lv; // 首领的能力按低两级计算，再由倍率补强
  for (const k of STATS) {
    let v = Math.round(C.base[k] + C.growth[k] * (slv - 1));
    if (C.promo) v += (C.promo[k] || 0) * tier;
    u[k === 'hp' ? 'mhp' : k === 'mp' ? 'mmp' : k] = v;
  }
  u.weapon = weaponFor(cls, lv); u.armor = null; u.acc = null;
  Object.assign(u, opts || {});
  // 敌方单位过了分支阶时，约三分之一走 B 路线（首领除外，可由关卡指定 path）
  if (C.alt && tier >= C.alt.at && !u.path) u.path = !u.boss && Math.random() < 0.35 ? 'b' : 'a';
  if (u.path === 'b' && C.alt && tier >= C.alt.at) {
    const n = Math.max(0, slv - branchLv(C));
    for (const k of STATS) { const f = k === 'hp' ? 'mhp' : k === 'mp' ? 'mmp' : k; u[f] = Math.max(k === 'hp' ? 1 : 0, Math.round(u[f] + (C.alt.growth[k] - C.growth[k]) * n + ((C.alt.promo[k] || 0) - ((C.promo && C.promo[k]) || 0)))); }
  }
  if (kind === 'villager' && !(opts && opts.ai)) u.ai = 'guard';
  // 杂兵比同等级英雄弱一些；首领更强
  if (u.boss) { u.mhp = Math.round(u.mhp * 1.3); u.mmp = Math.max(u.mmp, 20); }
  else if (u.team === 'enemy' || u.team === 'rogue') { for (const k of ['mhp', 'atk', 'def']) u[k] = Math.round(u[k] * 0.8); u.mag = Math.round(u.mag * 0.7); }
  // 简单难度：敌方生命、攻击、魔力再降 15%
  if (OPT.easy && (u.team === 'enemy' || u.team === 'rogue')) for (const k of ['mhp', 'atk', 'mag']) u[k] = Math.round(u[k] * 0.85);
  // 施法单位至少有一些 MP
  if (skillsOf(u).some(id => SPELLS[id].mp > 0) && u.mmp < 12) u.mmp = 12 + lv;
  u.name = u.name || (u.element && SHAMAN_NAME[u.element]) || tierDef(u).name;
  u.hp = u.mhp; u.mp = u.mmp;
  return u;
}
function partyLevel() {
  const ls = S.order.map(id => S.roster[id] && S.roster[id].lv).filter(Boolean).sort((a, b) => b - a).slice(0, 8);
  return ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : 1;
}
function ensureHero(id) {
  if (!S.roster[id]) { S.roster[id] = heroData(id, partyLevel() - 1); S.order.push(id); }
  return S.roster[id];
}
function spawnSpec(spec) {
  let [what, lv, x, y, opts] = spec;
  let u;
  if (what.startsWith('hero:')) {
    const id = what.slice(5);
    const data = S.roster[id] || heroData(id, partyLevel() - 1);
    u = battleUnitFromHero(data, (opts && opts.team) || 'player', x, y);
    Object.assign(u, opts || {});
    if (opts && opts.name) u.name = opts.name;
    if (!opts || !opts.ai) u.ai = 'aggr';
  } else {
    // 需要保护的友军 NPC 至少与本关敌兵同级
    const npc = opts && opts.team === 'ally' && B && B.def;
    if (npc) lv = Math.max(lv, Math.round(1 + (B.def.no - 1) * 0.85) + 3);
    u = makeMonster(what, lv, Object.assign({}, opts));
    if (npc) { u.mhp = u.hp = Math.round(u.mhp * 1.3); }
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

function costFor(mt, x, y) { return TERRAIN[tileAt(x, y)].cost[mt]; }
function passable(u, x, y) { return inMap(x, y) && costFor(moveTypeOf(u), x, y) < 99; }
function freeSpotNear(u, x, y) {
  for (let r = 0; r < 14; r++) {
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
      const nc = cur.c + costFor(mt, nx, ny);
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
// 招式的作用格：直线 / 横扫（目标与左右两格）/ 扇形冲击波 / 以目标为中心的范围
function spellCells(u, sp, x, y) {
  if (sp.line) return lineTiles(u.x, u.y, x, y, sp.range[1]);
  if (sp.arc || sp.cone) {
    const dx = Math.sign(x - u.x), dy = Math.sign(y - u.y);
    if (!dx && !dy) return [];
    const px = dy ? 1 : 0, py = dx ? 1 : 0; // 与方向垂直
    const out = [];
    const depth = sp.cone || 1;
    for (let k = 1; k <= depth; k++) {
      const w = sp.arc ? 1 : k - 1;
      for (let s = -w; s <= w; s++) {
        const cx = u.x + dx * k + px * s, cy = u.y + dy * k + py * s;
        if (inMap(cx, cy)) out.push({ x: cx, y: cy });
      }
    }
    return out;
  }
  return areaTiles(x, y, sp.area || 0);
}
const shaped = sp => sp.around || sp.arc || sp.cone;
// 直线贯穿：施法者到目标的直线（不含施法者），延伸到射程尽头
function lineTiles(sx, sy, tx, ty, len) {
  const out = [];
  const dx = tx - sx, dy = ty - sy, n = Math.max(Math.abs(dx), Math.abs(dy));
  if (!n) return out;
  const steps = Math.max(n, len);
  const seen = new Set();
  for (let i = 1; i <= steps * 2; i++) {
    const t = i / 2 / n;
    const x = Math.round(sx + dx * t), y = Math.round(sy + dy * t);
    if (mdist(sx, sy, x, y) > len || !inMap(x, y)) break;
    const k = key(x, y);
    if (!seen.has(k) && !(x === sx && y === sy)) { seen.add(k); out.push({ x, y }); }
  }
  return out;
}
function threatTiles(u) {
  const reach = reachable(u), set = new Set();
  let [r0, r1] = rangeOf(u);
  for (const id of skillsOf(u)) { const sp = SPELLS[id]; if ((sp.power || sp.kind === 'status') && u.mp >= sp.mp && !['heal', 'buff', 'cure'].includes(sp.kind)) r1 = Math.max(r1, sp.range[1]); }
  for (const v of reach.values()) if (v.stop) for (const t of tilesInRange(v.x, v.y, Math.min(r0, 1), r1)) set.add(key(t.x, t.y));
  return { reach, set };
}

// ---------- 伤害计算 ----------
function physCalc(a, d, power = 0, sure = false) {
  const t = terrAt(d.x, d.y);
  let dmg = atkOf(a) + power - Math.round(defOf(d) * (1 + t.def / 100) * 0.75);
  dmg = Math.max(1, Math.round(dmg * advMult(a, d)));
  const hit = sure ? 100 : clamp(88 + (spdOf(a) - spdOf(d)) * 2 - t.avoid + hitBonus(a), 30, 100);
  const crit = clamp(3 + Math.max(0, spdOf(a) - spdOf(d)) + (typeOf(a) === '弓箭手' ? 5 : 0) + (a.boss ? 5 : 0) + critBonus(a), 0, 45);
  return { dmg, hit, crit, adv: advMult(a, d) };
}
function magCalc(a, d, sp) {
  let dmg = sp.power + magOf(a) * 0.85 - (defOf(d) * 0.35 + magOf(d) * 0.35);
  if (sp.vsDark && DARK_TYPES.includes(typeOf(d))) dmg *= sp.vsDark;
  if (sp.school === '技') dmg = Math.round(dmg * advMult(a, d)); // 喷火等天生攻击也受相克影响
  return { dmg: Math.max(1, Math.round(dmg)), hit: 100, crit: 0, adv: 1 };
}
function pairPartner(u) {
  return alive().filter(p => p !== u && p.team === u.team && !p.acted && canAct(p) && PAIR_CLASSES.includes(p.cls) && mdist(p.x, p.y, u.x, u.y) === 1)
    .sort((a, b) => atkOf(b) - atkOf(a))[0] || null;
}
function skillCalc(a, d, sp, partner) {
  if (sp.kind === 'magic') return magCalc(a, d, sp);
  if (sp.kind === 'pair') { const c = physCalc(a, d, sp.power + Math.round(atkOf(partner || a) * 0.6), true); return c; }
  const c = physCalc(a, d, sp.power, sp.sure);
  if (sp.crit) c.crit = clamp(c.crit + sp.crit, 0, 75);
  return c;
}
function healAmount(a, sp) { return sp.power + Math.round(magOf(a) * 0.8); }
function statusChance(a, d, sp) {
  if (d.boss && ['petrify', 'freeze', 'blind'].includes(sp.status)) return 0;
  if (sp.status && (sp.status === 'poison' || sp.status === 'petrify') && itemStat(d.acc, 'immune')) return 0;
  return clamp(sp.chance + (magOf(a) - magOf(d)) * 2, 10, 95);
}
function deathChance(a, d, sp) { return d.boss || d.lord ? 0 : clamp(sp.chance + (magOf(a) - magOf(d)) * 2 + (d.lv < a.lv ? 10 : 0), 5, 75); }
function canCounter(d, a) {
  if (!canAct(d) || hasStatus(d, 'noCounter')) return false;
  const [r0, r1] = rangeOf(d), dd = mdist(a.x, a.y, d.x, d.y);
  return dd >= r0 && dd <= r1;
}
function expFor(u, t, killed) {
  let e = 24 + (t.lv - u.lv) * 6 + (t.boss ? 10 : 0);
  if (killed) e = e * 3 + (t.boss ? 40 : 0);
  return clamp(Math.round(e), 1, 100);
}

// =====================================================================
// 渲染
// =====================================================================
const cv = $('#map');
const ctx = cv.getContext('2d');
let TS = 32, DPR = 1;
const FX = [], FLOATS = [];
const CAM = { trauma: 0, last: 0 };
// 加入镜头震动量（0~1）
function addTrauma(v) { if (!AUTO) CAM.trauma = Math.min(1, CAM.trauma + v); }
// 手机震动回馈
function haptic(p) { if (AUTO || !OPT.sound) return; try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
let mapLayers = null;

function resize() {
  if (!B) return;
  const stage = $('#stage');
  const W = stage.clientWidth, H = stage.clientHeight;
  if (!W || !H) return;
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
    g.strokeStyle = 'rgba(0,0,0,0.10)'; g.lineWidth = 1;
    for (let x = 1; x < B.w; x++) { g.beginPath(); g.moveTo(Math.round(x * s) + 0.5, 0); g.lineTo(Math.round(x * s) + 0.5, c.height); g.stroke(); }
    for (let y = 1; y < B.h; y++) { g.beginPath(); g.moveTo(0, Math.round(y * s) + 0.5); g.lineTo(c.width, Math.round(y * s) + 0.5); g.stroke(); }
    // 立体物件（山、树、城墙、石柱、村屋）由上往下逐行绘制，前排遮住后排
    if (typeof getProp === 'function') for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
      const pr = getProp(tileAt(x, y), x, y, frame);
      if (pr) g.drawImage(pr.c, Math.round(x * s), Math.round(y * s + pr.dy * s / 32), Math.ceil(s), Math.ceil(s * 1.5));
    }
    return c;
  });
}
window.addEventListener('resize', () => setTimeout(resize, 50));

const GRAY = {};
function tintSprite(c, id, mode) {
  const kk = id + '|' + mode;
  if (GRAY[kk]) return GRAY[kk];
  const g = document.createElement('canvas'); g.width = c.width; g.height = c.height;
  const x = g.getContext('2d'); x.drawImage(c, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11;
    if (mode === 'gray') { d.data[i] = d.data[i + 1] = d.data[i + 2] = v * 0.75; }
    else if (mode === 'stone') { d.data[i] = v * 0.8 + 40; d.data[i + 1] = v * 0.8 + 40; d.data[i + 2] = v * 0.8 + 50; }
    else if (mode === 'ice') { d.data[i] = v * 0.5 + 60; d.data[i + 1] = v * 0.6 + 110; d.data[i + 2] = 255; }
  }
  x.putImageData(d, 0, 0);
  return (GRAY[kk] = g);
}
// 冰龙路线默认用蓝色身体
const spriteVariant = u => u.color || u.element || (spriteKey(u) === 'dragon_b' ? 'blue' : undefined);
function unitSprite(u) { return getSprite(spriteKey(u), u.tier, u.team, u.hair, spriteVariant(u)); }
const TEAM_COLOR = { player: '#4a9aff', ally: '#4ad87a', enemy: '#ff4a4a', rogue: '#e0b040' };

function render(now) {
  requestAnimationFrame(render);
  if (!B || !mapLayers || $('#battle').hidden) return;
  // 镜头震动（trauma²：越强的冲击震得越厉害，并迅速衰减）
  const dtc = Math.min(0.05, (now - (CAM.last || now)) / 1000); CAM.last = now;
  CAM.trauma = Math.max(0, CAM.trauma - dtc * 1.6);
  const sh = CAM.trauma * CAM.trauma, shx = Math.round((Math.random() * 2 - 1) * sh * TS * 0.45 * DPR), shy = Math.round((Math.random() * 2 - 1) * sh * TS * 0.35 * DPR);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(1, 0, 0, 1, shx, shy);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(mapLayers[Math.floor(now / 600) % 2], 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, shx, shy);
  const ts = TS;

  for (const c of B.chests) drawChest(ctx, c.x * ts, c.y * ts, ts, c.opened);
  // 目标地点
  if (B.def.win.type === 'reach') {
    const [gx, gy] = B.def.win.at, p = (Math.sin(now / 200) + 1) / 2;
    ctx.fillStyle = `rgba(255,230,90,${0.25 + p * 0.3})`; ctx.fillRect(gx * ts + 2, gy * ts + 2, ts - 4, ts - 4);
    ctx.fillStyle = '#fff6a0'; ctx.font = `bold ${Math.round(ts * 0.5)}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('★', (gx + 0.5) * ts, (gy + 0.68) * ts); ctx.textAlign = 'left';
  }

  const hl = (set, fill, stroke) => {
    if (!set) return;
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1;
    for (const k of set) { const [x, y] = k.split(',').map(Number); ctx.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2); ctx.strokeRect(x * ts + 1.5, y * ts + 1.5, ts - 3, ts - 3); }
  };
  hl(B.hlDanger, 'rgba(255,60,60,0.22)', 'rgba(255,90,90,0.5)');
  hl(B.hlMove, 'rgba(70,150,255,0.33)', 'rgba(140,200,255,0.75)');
  hl(B.hlAttack, 'rgba(255,60,60,0.30)', 'rgba(255,120,120,0.85)');
  hl(B.hlHeal, 'rgba(60,230,120,0.30)', 'rgba(120,255,160,0.85)');
  hl(B.hlArea, 'rgba(255,220,60,0.35)', 'rgba(255,240,120,0.9)');

  const list = B.units.filter(u => u.hp > 0 || u.dying).sort((a, b) => (a.py ?? a.y) - (b.py ?? b.y));
  const bob = Math.floor(now / 400) % 2;
  for (const u of list) {
    let ux = (u.px ?? u.x) * ts + (u.ox || 0) * ts, uy = (u.py ?? u.y) * ts + (u.oy || 0) * ts;
    if (u.hitT) { // 受击：沿受力方向弹开再回位，带一点抖动
      const k = (now - u.hitT) / T(u.hitBig ? 380 : 260);
      if (k < 1) { const amp = Math.sin(k * Math.PI) * (1 - k) * ts * (u.hitBig ? 0.3 : 0.18); ux += u.hitDx * amp + (Math.random() - 0.5) * ts * 0.06 * (1 - k); uy += u.hitDy * amp; }
      else u.hitT = 0;
    }
    ctx.globalAlpha = u.dying ? Math.max(0, u.dying) : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.ellipse(ux + ts / 2, uy + ts * 0.86, ts * 0.33, ts * 0.12, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = TEAM_COLOR[u.team]; ctx.lineWidth = Math.max(1.5, ts / 22);
    ctx.beginPath(); ctx.ellipse(ux + ts / 2, uy + ts * 0.86, ts * 0.36, ts * 0.13, 0, 0, 7); ctx.stroke();
    let spr = unitSprite(u);
    const sid = `${spriteKey(u)}|${u.tier}|${u.team}|${u.hair}|${spriteVariant(u)}`;
    if (hasStatus(u, 'petrify')) spr = tintSprite(spr, sid, 'stone');
    else if (hasStatus(u, 'freeze')) spr = tintSprite(spr, sid, 'ice');
    else if (u.acted && B.phase === u.team) spr = tintSprite(spr, sid, 'gray');
    const still = u.acted || !canAct(u) || u.px !== undefined || u.hp <= 0;
    const by = (!still && bob) ? -ts / 32 : 0;
    const size = ts * (u.boss ? 1.4 : 1.2);
    const sx0 = ux + (ts - size) / 2, sy0 = uy + ts * 0.9 - size * 0.9 + by;
    ctx.drawImage(spr, sx0, sy0, size, size);
    if (u.flash && now < u.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(spr, sx0, sy0, size, size); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (u.hp > 0) {
      const bw = ts * 0.7, bh = Math.max(2, ts * 0.075), bx = ux + ts * 0.15, byy = uy + ts - bh - 1;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 1, byy - 1, bw + 2, bh + 2);
      const r = u.hp / u.mhp;
      ctx.fillStyle = r > 0.5 ? '#5ae05a' : r > 0.25 ? '#f0c030' : '#ff4040';
      ctx.fillRect(bx, byy, bw * r, bh);
      // 异常状态小点
      let sx = ux + ts * 0.82;
      for (const s in u.status) if (u.status[s] > 0) { ctx.fillStyle = STATUS_COLOR[s]; ctx.beginPath(); ctx.arc(sx, uy + ts * 0.12, Math.max(2, ts * 0.07), 0, 7); ctx.fill(); sx -= ts * 0.16; }
      if ((u.buffs || []).length) { ctx.fillStyle = '#6aff8a'; ctx.font = `bold ${Math.round(ts * 0.28)}px sans-serif`; ctx.fillText('↑', ux + ts * 0.02, uy + ts * 0.62); }
    }
    if (u.boss) { ctx.fillStyle = '#f4c542'; ctx.font = `bold ${Math.round(ts * 0.32)}px sans-serif`; ctx.fillText('★', ux + 1, uy + ts * 0.3); }
    if (u.summonLeft && u.summonLeft < 90) { ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(ts * 0.26)}px sans-serif`; ctx.fillText(u.summonLeft, ux + ts * 0.02, uy + ts * 0.3); }
    ctx.globalAlpha = 1;
  }

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
  if (typeof drawSpellFx === 'function') drawSpellFx(now);
  for (let i = FLOATS.length - 1; i >= 0; i--) {
    const f = FLOATS[i], life = f.big ? 1150 : 950, p = (now - f.t0) / life;
    if (p >= 1) { FLOATS.splice(i, 1); continue; }
    // 弹出：0 → 1.4 → 1，向上缓出；暴击字更大并抖动
    const sc = p < 0.1 ? 0.3 + p / 0.1 * 1.1 : p < 0.2 ? 1.4 - (p - 0.1) / 0.1 * 0.4 : 1;
    const rise = 1 - Math.pow(1 - Math.min(1, p / 0.6), 3);
    ctx.globalAlpha = p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
    ctx.font = `900 ${Math.round(ts * (f.big ? 0.62 : 0.44) * sc)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const jit = f.big && p < 0.3 ? (Math.random() - 0.5) * ts * 0.08 : 0;
    const tx = (f.x + 0.5) * ts + jit, ty = (f.y + 0.25) * ts - rise * ts * 0.7;
    ctx.lineWidth = Math.max(3, ts * 0.11); ctx.strokeStyle = '#120818'; ctx.strokeText(f.text, tx, ty);
    ctx.fillStyle = f.color; ctx.fillText(f.text, tx, ty);
    if (f.big && p < 0.2) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * (1 - p / 0.2); ctx.fillStyle = '#ffffff'; ctx.fillText(f.text, tx, ty); ctx.globalCompositeOperation = 'source-over'; }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}
requestAnimationFrame(render);

function floatText(x, y, text, color, big) { if (!AUTO) FLOATS.push({ x, y, text, color, big, t0: performance.now() }); }

function addFx(type, x, y, dur, extra) {
  if (AUTO) return Promise.resolve();
  FX.push(Object.assign({ type, x, y, t0: performance.now(), dur: T(dur) }, extra || {}));
  return wait(dur);
}
const FX_COLORS = { fire: ['#ffdd55', '#ff8a2a', '#ff3a1a'], acid: ['#caff4a', '#7ae02a', '#3a9a1a'], rock: ['#c8a070', '#8a6a3a', '#5a3a1a'],
  dark: ['#d08aff', '#8a3ad8', '#3a1060'], ice: ['#ffffff', '#9ae0ff', '#3a9ad8'], holy: ['#ffffff', '#fff6b0', '#f4c542'],
  heal: ['#ffffff', '#b0ffcc', '#4ae07a'], buff: ['#ffffff', '#ffe08a', '#6ad8ff'], wind: ['#ffffff', '#c8f0d8', '#7ad8a0'] };
function drawFx(now) {
  const ts = TS;
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i], p = (now - f.t0) / Math.max(1, f.dur);
    if (p >= 1) { FX.splice(i, 1); continue; }
    const cx = (f.x + 0.5) * ts, cy = (f.y + 0.5) * ts;
    ctx.save();
    switch (f.type) {
      case 'slash': {
        ctx.strokeStyle = f.color || '#fff'; ctx.lineWidth = ts * 0.08; ctx.globalAlpha = 1 - p;
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
        ctx.strokeStyle = f.color || '#ff6a1a'; ctx.lineWidth = ts * 0.45 * Math.sin(p * Math.PI); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = ts * 0.18 * Math.sin(p * Math.PI); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
        break;
      }
      case 'summon': {
        ctx.globalAlpha = 1 - p; ctx.strokeStyle = f.color || '#d08aff'; ctx.lineWidth = 2;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx, cy, ts * (0.2 + k * 0.15) * (0.5 + p), 0, 7); ctx.stroke(); }
        break;
      }
      default: {
        const col = FX_COLORS[f.type] || FX_COLORS.fire, rise = ['heal', 'holy', 'buff'].includes(f.type);
        for (let k = 0; k < 14; k++) {
          const a = k / 14 * Math.PI * 2 + p * 3, rr = ts * (f.type === 'heal' || f.type === 'buff' ? 0.3 : 0.15 + p * 0.45);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * (rise ? 0.4 : 1) - (rise ? p * ts * 0.6 : 0);
          ctx.globalAlpha = 1 - p; ctx.fillStyle = col[k % 3];
          const s = ts * 0.09 * (1.4 - p);
          ctx.fillRect(px - s, py - s, s * 2, s * 2);
        }
        if (!rise) { ctx.globalAlpha = (1 - p) * 0.6; ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.45 * Math.sin(p * Math.PI), 0, 7); ctx.fill(); }
        if (f.type === 'holy') { ctx.globalAlpha = 1 - p; ctx.fillStyle = '#fff'; ctx.fillRect(cx - ts * 0.05, cy - ts * 0.45, ts * 0.1, ts * 0.9); ctx.fillRect(cx - ts * 0.3, cy - ts * 0.2, ts * 0.6, ts * 0.1); }
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
// 音效（WebAudio 合成）
// =====================================================================
let AC = null;
const SFX = {
  select: [[880, 0.04, 'square']], move: [[520, 0.03, 'square'], [660, 0.03, 'square']],
  hit: [[180, 0.06, 'sawtooth'], [90, 0.09, 'sawtooth']], crit: [[300, 0.05, 'sawtooth'], [120, 0.05, 'square'], [60, 0.15, 'sawtooth']],
  miss: [[700, 0.04, 'triangle'], [500, 0.05, 'triangle']], magic: [[330, 0.07, 'sine'], [494, 0.07, 'sine'], [740, 0.1, 'sine']],
  heal: [[523, 0.07, 'triangle'], [659, 0.07, 'triangle'], [784, 0.12, 'triangle']],
  levelup: [[523, 0.08, 'square'], [659, 0.08, 'square'], [784, 0.08, 'square'], [1046, 0.2, 'square']],
  chest: [[784, 0.07, 'square'], [988, 0.07, 'square'], [1175, 0.16, 'square']], die: [[220, 0.08, 'square'], [165, 0.08, 'square'], [110, 0.2, 'square']],
  win: [[523, 0.12, 'square'], [523, 0.12, 'square'], [523, 0.12, 'square'], [659, 0.3, 'square'], [587, 0.15, 'square'], [659, 0.15, 'square'], [784, 0.4, 'square']],
  lose: [[392, 0.2, 'triangle'], [330, 0.2, 'triangle'], [262, 0.5, 'triangle']], turn: [[392, 0.08, 'square'], [523, 0.12, 'square']],
  status: [[200, 0.08, 'sine'], [150, 0.12, 'sine']],
};
function sfx(name) {
  if (!OPT.sound || AUTO) return;
  if (typeof AUDIO !== 'undefined') { try { AUDIO.sfx(name); } catch (e) { } return; }
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
// 通用 UI
// =====================================================================
function show(id) { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; }
// 背景音乐：随场景切换（AUDIO 由 js/audio.js 提供）
function music(name) {
  if (AUTO || typeof AUDIO === 'undefined') return;
  try { AUDIO.setMusicOn(OPT.music); if (!OPT.music) { AUDIO.stopMusic(); return; } AUDIO.playMusic(name); } catch (e) { }
}
function battleTheme(team) {
  if (!B) return 'player';
  if (B.def.no === STAGES[STAGES.length - 1].no) return 'final';
  if (B.def.win.type === 'boss' && B.units.some(u => u.boss && u.hp > 0 && B.turn >= 2)) return 'boss';
  return team === 'player' || team === 'ally' ? 'player' : 'enemy';
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
let toastTimer = null;
function toast(msg) {
  if (AUTO) return;
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 1800);
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
// buttons = [{label, value, cls, disabled}]；内容里带 data-pick 的元素点击后也会关闭并返回其值
function modal(title, bodyHtml, buttons, opts) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="m-box ${opts && opts.wide ? 'wide' : ''}">
      ${title ? `<div class="m-title">${title}</div>` : ''}
      <div class="m-body">${bodyHtml || ''}</div>
      <div class="m-btns">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${b.label}</button>`).join('')}</div>
    </div>`;
    m.hidden = false;
    const done = v => { m.hidden = true; m.innerHTML = ''; m.onclick = null; res(v); };
    m.onclick = e => {
      if (opts && opts.onClick && opts.onClick(e, done)) return;
      const btn = e.target.closest('[data-i]');
      if (btn && !btn.disabled) { sfx('select'); done(buttons[+btn.dataset.i].value); return; }
      const pick = e.target.closest('[data-pick]');
      if (pick && !pick.disabled) { sfx('select'); done(pick.dataset.pick); return; }
      if (e.target === m && opts && opts.dismiss !== undefined) done(opts.dismiss);
    };
    if (opts && opts.onOpen) opts.onOpen(m);
  });
}
// 转职分支：显示两条路线让玩家选择（各自的职阶、特色、专属招式与外观预览）
function pathInfo(C, p) {
  const at = C.alt.at, bl = branchLv(C);
  const tiers = p === 'b' ? C.alt.tiers : C.tiers.slice(at);
  const skills = (p === 'b' ? C.alt.skills : C.skills.filter(s => s[0] >= bl)).filter(s => SPELLS[s[1]]).map(s => SPELLS[s[1]].name);
  return { tiers, skills: [...new Set(skills)], label: p === 'b' ? C.alt.label : C.aLabel, desc: p === 'b' ? C.alt.desc : C.aDesc, focus: p === 'b' ? C.alt.focus : C.aFocus };
}
function pathCardsHtml(C, cur) {
  return ['a', 'b'].map(p => {
    const I = pathInfo(C, p);
    return `<button class="path-card ${cur === p ? 'on' : ''}" data-pick="${p}">
      <div class="pc-art" data-art="${p}"></div>
      <div class="pc-label">${esc(I.label)}</div>
      <div class="pc-tiers">${I.tiers.map(t => esc(t.name)).join(' → ')}</div>
      <div class="pc-focus">${esc(I.focus || '')}</div>
      <div class="pc-desc">${esc(I.desc || '')}</div>
      <div class="pc-skills">${I.skills.map(s => `<span>${esc(s)}</span>`).join('')}</div>
    </button>`;
  }).join('');
}
function fillPathArt(m, u) {
  const C = clsOf(u), at = C.alt.at;
  for (const el of m.querySelectorAll('[data-art]')) {
    const p = el.dataset.art, key = p === 'b' ? C.alt.sprite : C.sprite;
    const spr = getSprite(key, at, u.team || 'player', u.hair, key === 'dragon_b' ? 'blue' : undefined);
    if (u.id && typeof getPortrait === 'function') {
      try { const pc = getPortrait(u.id, undefined, at, p); const c = document.createElement('canvas'); c.width = pc.width; c.height = pc.height; c.getContext('2d').drawImage(pc, 0, 0); c.className = 'pix pc-port'; el.appendChild(c); } catch (e) { }
    }
    const c = document.createElement('canvas'); c.width = spr.width; c.height = spr.height; c.getContext('2d').drawImage(spr, 0, 0); c.className = 'pix pc-spr'; el.appendChild(c);
  }
}
async function choosePath(u) {
  const C = clsOf(u);
  sfx('charge');
  const p = await modal(`${esc(u.name)} 的转职之路`, `<p class="dim small">到达 Lv ${branchLv(C)}，请选择今后的道路（选择后不可更改）。</p><div class="path-cards">${pathCardsHtml(C)}</div>`, [], { wide: true, onOpen: m => fillPathArt(m, u) });
  return p === 'b' ? 'b' : 'a';
}
// 立绘：优先使用 portraits.js 的手绘风半身像（64×72），没有时退回放大的单位精灵
// 英雄当前的职阶（战斗中以场上单位为准，否则看存档）——立绘随转职换装
function heroPath(id) {
  const u = B && B.units && B.units.find(o => o.id === id);
  if (u) return u.path;
  const d = typeof S !== 'undefined' && S && S.roster && S.roster[id];
  return d ? d.path : undefined;
}
function heroTier(id) {
  const u = B && B.units && B.units.find(o => o.id === id);
  if (u) return u.tier;
  const d = typeof S !== 'undefined' && S && S.roster && S.roster[id];
  return d ? d.tier : undefined;
}
function portraitCanvas(who, size, variant) {
  if (!who) return null;
  let src = null;
  if (typeof getPortrait === 'function') {
    const enemy = who.startsWith('enemy:');
    try { src = getPortrait(who, variant, enemy ? undefined : heroTier(who), enemy ? undefined : heroPath(who)); } catch (e) { src = null; }
  }
  if (!src) {
    if (who.startsWith('enemy:')) { const k = who.slice(6), cls = KIND_ALIAS[k] || k; if (CLASSES[cls]) src = getSprite(CLASSES[cls].sprite, 0, 'enemy'); }
    else if (HEROES[who]) { const d = (S && S.roster[who]) || heroData(who); src = getSprite(CLASSES[d.cls].sprite, d.tier, 'player', d.hair); }
  }
  if (!src) return null;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.className = 'pix';
  c.style.width = size + 'px'; c.style.height = Math.round(size * src.height / src.width) + 'px';
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}
// 单位对应的立绘 id（英雄用自己的 id；敌人用兵种）
function unitPortrait(u, size) {
  if (u.id && HEROES[u.id]) return portraitCanvas(u.id, size);
  const kind = Object.keys(KIND_ALIAS).find(k => KIND_ALIAS[k] === u.cls) || u.cls;
  return portraitCanvas('enemy:' + kind, size, u.color || u.element);
}
function dialog(lines) {
  if (AUTO || !lines || !lines.length) return Promise.resolve();
  return new Promise(res => {
    const box = $('#dialog'); let i = 0, typing = null, full = '';
    const showLine = () => {
      const [who, text, pid] = lines[i];
      const narr = who === '旁白';
      $('#dlg-name').textContent = narr ? '' : who;
      $('#dlg-name').style.display = narr ? 'none' : '';
      const pw = $('#dlg-portrait'); pw.innerHTML = '';
      const pc = portraitCanvas(pid || heroIdByName(who), 76); if (pc) pw.appendChild(pc);
      pw.style.display = pc ? '' : 'none';
      box.classList.toggle('narration', narr);
      full = text; let n = 0;
      const el = $('#dlg-text'); el.textContent = '';
      clearInterval(typing);
      typing = setInterval(() => { n += OPT.fast ? 3 : 1; el.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; } }, 26);
    };
    box.hidden = false;
    box.onclick = () => {
      if (typing) { clearInterval(typing); typing = null; $('#dlg-text').textContent = full; return; }
      i++;
      if (i >= lines.length) { box.hidden = true; box.onclick = null; res(); return; }
      sfx('select'); showLine();
    };
    $('#dlg-skip').onclick = e => { e.stopPropagation(); clearInterval(typing); box.hidden = true; box.onclick = null; res(); };
    showLine();
  });
}
function heroIdByName(name) { for (const id in HEROES) if (HEROES[id].name === name) return id; return null; }
function hpBar(v, max, cls) { return `<div class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i><span>${v}/${max}</span></div>`; }

// =====================================================================
// 战斗流程
// =====================================================================
function startBattle(stageIdx, deploy) {
  const st = STAGES[stageIdx];
  B = {
    idx: stageIdx, def: st, map: st.map, w: st.map[0].length, h: st.map.length,
    units: [], chests: (st.chests || []).map(([x, y, item, gold]) => ({ x, y, item, gold: gold || 0, opened: false })),
    turn: 1, phase: 'player', mode: 'idle', over: null, firedEvents: new Set(),
  };
  const ids = deploy && deploy.length ? deploy : st.required.slice();
  ids.sort((a, b) => (S.roster[b].lord ? 1 : 0) - (S.roster[a].lord ? 1 : 0));
  ids.forEach((id, i) => {
    const [x, y] = st.start[i] || st.start[st.start.length - 1];
    const u = battleUnitFromHero(S.roster[id], 'player', x, y);
    if (st.startHp && st.startHp[id]) u.hp = Math.max(1, Math.round(u.mhp * st.startHp[id]));
    const spot = freeSpotNear(u, x, y); u.x = spot.x; u.y = spot.y;
    B.units.push(u);
  });
  for (const spec of st.units || []) B.units.push(spawnSpec(spec));
  show('battle');
  $('#hud-title').textContent = st.title;
  resize();
  setMode('idle');
}

function objectiveText() {
  const st = B.def, w = st.win;
  let win = w.type === 'boss' ? `击败 ${(B.units.find(u => u.boss) || {}).name || '首领'}`
    : w.type === 'reach' ? `我方任一角色抵达★（${w.label}）` : '击败所有敌人';
  if (w.turns) win = `${w.turns} 回合内` + win;
  const names = ((st.lose || {}).units || []).map(id => (S.roster[id] || HEROES[id]).name);
  let lose = names.join(' 或 ') + ' 阵亡';
  if ((st.lose || {}).npcAll) lose += '，或友军全灭';
  if (w.turns) lose += `，或超过 ${w.turns} 回合`;
  return { win, lose };
}

function checkEnd() {
  if (B.over) return B.over;
  const st = B.def, lose = st.lose || { units: ['mengqi'] };
  for (const id of lose.units || []) { const u = B.units.find(u => u.id === id); if (u && u.hp <= 0) return (B.over = 'lose'); }
  if (lose.npcAll) {
    const npcs = B.units.filter(u => u.team === 'ally' && !u.summoner);
    if (npcs.length && !npcs.some(u => u.hp > 0)) return (B.over = 'lose');
  }
  if (!alive().some(u => u.team === 'player')) return (B.over = 'lose');
  if (st.win.type === 'boss') { const b = B.units.find(u => u.boss); if (b && b.hp <= 0) return (B.over = 'win'); }
  if (st.win.type === 'reach') {
    const [gx, gy] = st.win.at;
    if (alive().some(u => u.team === 'player' && u.x === gx && u.y === gy && u.px === undefined)) return (B.over = 'win');
  }
  if (st.win.type !== 'reach' && !alive().some(u => u.team === 'enemy' || u.team === 'rogue')) return (B.over = 'win');
  return null;
}

async function battleLoop() {
  const limit = B.def.win.turns || 0;
  while (!B.over) {
    if (limit && B.turn > limit) { B.over = 'lose'; await banner('超过回合限制', '', 'lose'); break; }
    if (B.turn > 99) { B.over = 'lose'; break; }
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
  const mine = alive().filter(u => u.team === team);
  for (const u of B.units) if (u.team === team) u.acted = false;
  for (const u of mine) {
    // 召唤物倒计时
    if (u.summonLeft && --u.summonLeft <= 0) { u.hp = 0; floatText(u.x, u.y, '消失', '#ccc'); continue; }
    // 中毒
    if (hasStatus(u, 'poison')) { const v = Math.min(u.hp - 1, Math.max(1, Math.round(u.mhp * 0.08))); if (v > 0) { u.hp -= v; floatText(u.x, u.y, '毒 -' + v, '#c08aff'); } }
    // 地形回复
    const h = terrAt(u.x, u.y).heal;
    if (h && u.hp < u.mhp) { const v = Math.min(u.mhp - u.hp, Math.ceil(u.mhp * h / 100)); u.hp += v; floatText(u.x, u.y, '+' + v, '#6aff8a'); }
    // 状态与增益倒数
    for (const s in u.status) if (u.status[s] > 0) { u.status[s]--; if (!u.status[s]) { delete u.status[s]; floatText(u.x, u.y, STATUS_NAME[s] + '解除', '#ffffff'); } }
    u.buffs = (u.buffs || []).filter(b => --b.turns > 0);
    if (!canAct(u)) u.acted = true;
  }
  const label = { player: '我方行动', ally: '友军行动', enemy: '敌军行动', rogue: '第三势力行动' }[team];
  updateHud();
  music(battleTheme(team));
  if (team === 'player') {
    sfx('turn');
    const lim = B.def.win.turns;
    await banner(`第 ${B.turn} 回合`, label + (lim ? `（剩余 ${lim - B.turn + 1} 回合）` : ''), 'player');
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
function endPlayerPhase() { if (B && B.endPhase && B.phase === 'player') { setMode('idle'); B.endPhase(); } }

// ---------- 行动执行 ----------
async function moveUnit(u, path) {
  if (path.length > 1) sfx('move');
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    await tween(t => { u.px = a.x + (b.x - a.x) * t; u.py = a.y + (b.y - a.y) * t; }, 65);
  }
  const last = path[path.length - 1];
  u.x = last.x; u.y = last.y; delete u.px; delete u.py;
}
async function lunge(a, d) {
  const dx = Math.sign(d.x - a.x) * 0.3, dy = Math.sign(d.y - a.y) * 0.3;
  await tween(t => { a.ox = dx * Math.sin(t * Math.PI); a.oy = dy * Math.sin(t * Math.PI); }, 170);
  a.ox = a.oy = 0;
}
async function applyDamage(a, d, dmg, crit) {
  d.hp = Math.max(0, d.hp - dmg);
  const lethal = d.hp <= 0;
  d.flash = performance.now() + T(crit || lethal ? 220 : 160);
  floatText(d.x, d.y, (crit ? '暴击 ' : '') + dmg, crit ? '#ffcc33' : dmg >= d.mhp * 0.35 ? '#ffb070' : '#ffffff', crit || lethal);
  sfx(crit ? 'crit' : 'hit');
  if (d.ai === 'hold') d.ai = 'aggr';
  if (hasStatus(d, 'freeze') && dmg > 0) delete d.status.freeze; // 受攻击会打破冻结
  if (!AUTO && !DUEL.on) {
    // 地图上的打击感：受击弹开、镜头震动、顿帧、手机震动
    const dx = Math.sign(d.x - a.x), dy = Math.sign(d.y - a.y);
    Object.assign(d, { hitT: performance.now(), hitDx: dx || 0, hitDy: dy || (dx ? 0 : -1), hitBig: crit || lethal });
    addTrauma(lethal ? 0.55 : crit ? 0.5 : 0.22);
    haptic(lethal ? [40, 30, 80] : crit ? [30, 20, 40] : 15);
    await sleep(T(lethal ? 140 : crit ? 110 : 55)); // hit-stop
  }
  if (d.hp <= 0) await killUnit(d);
}
async function killUnit(u) {
  sfx('die'); sfx('ko');
  floatText(u.x, u.y - 0.35, u.boss ? '击破！' : '倒下', '#ff8080', u.boss);
  if (!AUTO && typeof emit === 'function') {
    // 击倒：碎成像素粒子 + 冲击环
    const x = (u.x + 0.5) * TS, y = (u.y + 0.45) * TS;
    emit(u.boss ? 50 : 28, x, y, { speed: [1, 3.2], life: [0.4, 0.9], size: [0.04, 0.09], cols: ['#ffffff', TEAM_COLOR[u.team], '#ffd0a0'], gravity: 2.5, drag: 0.88, shape: 'sq' });
    PFX.rings.push({ x, y, r0: 0.2, r1: u.boss ? 2 : 1.2, color: '#ffffff', t0: performance.now(), dur: T(400) });
    if (u.boss) { flash('#ffffff', 0.6, 350); addTrauma(0.8); }
  }
  u.dying = 1;
  await tween(t => { u.dying = 1 - t; }, 420);
  u.dying = 0;
  for (const s of alive().filter(s => s.summoner === u.uid)) s.hp = 0;
}
async function strike(a, d, calc, ranged) {
  const hit = Math.random() * 100 < calc.hit;
  const crit = hit && Math.random() * 100 < calc.crit;
  const dmg = Math.max(1, Math.round(calc.dmg * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1)));
  sfx(ranged ? 'arrow' : 'slash');
  if (DUEL.on) await duelStrike(a, d, hit, dmg, crit, ranged);
  else if (ranged) await addFx('arrow', d.x, d.y, 200, { sx: a.x, sy: a.y });
  else await lunge(a, d);
  if (!hit) { floatText(d.x, d.y, 'MISS', '#aaccff'); sfx('miss'); await wait(220); return { dmg: 0, killed: false }; }
  if (!ranged && !DUEL.on) addFx('slash', d.x, d.y, 200);
  await applyDamage(a, d, dmg, crit);
  await wait(220);
  return { dmg, killed: d.hp <= 0 };
}
async function doAttack(a, d) {
  B.cursor = null;
  const ranged = mdist(a.x, a.y, d.x, d.y) > 1;
  const duel = await duelOpen(a, d);
  const r1 = await strike(a, d, physCalc(a, d), ranged);
  let r2 = null;
  if (d.hp > 0 && a.hp > 0 && canCounter(d, a)) r2 = await strike(d, a, physCalc(d, a), ranged);
  if (duel) await duelClose();
  await giveExp(a, d, r1);
  if (r2) await giveExp(d, a, r2);
}
async function giveExp(u, t, r) {
  if (u.team !== 'player' || u.hp <= 0 || !r || (r.dmg === 0 && !r.killed)) return;
  await gainExp(u, expFor(u, t, r.killed));
}
async function gainExp(u, amt) {
  if (u.team !== 'player' || u.lv >= LEVEL_CAP) return;
  if (OPT.easy) amt = Math.min(100, Math.round(amt * 1.25));
  u.exp += amt;
  floatText(u.x, u.y - 0.4, `EXP+${amt}`, '#9ad8ff');
  while (u.exp >= 100 && u.lv < LEVEL_CAP) {
    u.exp -= 100;
    const r = levelUp(u);
    if (r.choose) {
      // 转职分支：玩家选择路线（自动对战默认 A 路线，测试可设 window.__pathB）
      const before = new Set(skillsOf(u));
      u.path = AUTO || u.team !== 'player' ? (window.__pathB ? 'b' : 'a') : await choosePath(u);
      const P = (altOf(u) || clsOf(u)).promo || {};
      for (const k of STATS) {
        const v = P[k] || 0; r.gains[k] += v;
        if (k === 'hp') { u.mhp += v; u.hp += v; } else if (k === 'mp') { u.mmp += v; u.mp += v; } else u[k] += v;
      }
      r.newSkills = skillsOf(u).filter(s => !before.has(s) || r.newSkills.includes(s));
      if (u.weapon && !canUseWeapon(u, u.weapon)) u.weapon = null;
    }
    if (!AUTO) {
      if (r.promoted && typeof promoteAnim === 'function') await promoteAnim(u, r.from);
      sfx('levelup');
      const rows = STATS.map(k => `<div class="lv-row"><span>${STAT_NAME[k]}</span><b>${k === 'hp' ? u.mhp : k === 'mp' ? u.mmp : u[k]}</b>${r.gains[k] ? `<em>+${r.gains[k]}</em>` : ''}</div>`).join('');
      let extra = '';
      if (r.promoted) extra += `<p class="promo">✦ 转职为「${className(u)}」！</p>`;
      for (const s of r.newSkills) extra += `<p class="promo">✦ 习得「${SPELLS[s].name}」！</p>`;
      await modal(`${esc(u.name)} 升级！ Lv ${u.lv}`, `<div class="lv-grid">${rows}</div>${extra}`, [{ label: '好', value: 1, cls: 'primary' }]);
    }
  }
  if (u.lv >= LEVEL_CAP) u.exp = 0;
}
function levelUp(u) {
  const C = clsOf(u), before = new Set(skillsOf(u));
  u.lv++;
  const gains = {};
  const G = growthOf(u);
  for (const k of STATS) { const g = G[k]; gains[k] = Math.floor(g) + (Math.random() < g % 1 ? 1 : 0); }
  const from = u.tier, nt = tierForLevel(u.cls, u.lv), promoted = nt > u.tier;
  // 到达分支阶且尚未选择路线：先不加转职奖励，等玩家选完再加
  const choose = promoted && C.alt && nt === C.alt.at && !u.path;
  if (promoted) { u.tier = nt; if (!choose) { const P = (altOf(u) || C).promo; for (const k of STATS) gains[k] += (P && P[k]) || 0; } }
  for (const k of STATS) {
    if (k === 'hp') { u.mhp += gains.hp; u.hp += gains.hp; }
    else if (k === 'mp') { u.mmp += gains.mp; u.mp += gains.mp; }
    else u[k] += gains[k];
  }
  const newSkills = skillsOf(u).filter(s => !before.has(s));
  return { gains, promoted, from, newSkills, choose };
}

// ---------- 法术目标 ----------
function areaTiles(x, y, r) { return tilesInRange(x, y, 0, r); }
const friendlySpell = sp => ['heal', 'buff', 'cure', 'refresh'].includes(sp.kind);
const maxSummons = u => (altOf(u) && altOf(u).maxSummons) || 1;
function spellAffected(u, spId, x, y) {
  const sp = SPELLS[spId];
  const tiles = spellCells(u, sp, x, y);
  const out = [];
  for (const t of tiles) {
    const o = unitAt(t.x, t.y); if (!o) continue;
    if (sp.groundOnly && isFlying(o)) continue;
    if (sp.line) { out.push(o); continue; } // 直线贯穿，不论敌我
    if (friendlySpell(sp) ? !hostile(u, o) : hostile(u, o)) out.push(o);
  }
  return out;
}
function canCastNow(u, spId) {
  const sp = SPELLS[spId];
  if (u.mp < sp.mp) return false;
  if (hasStatus(u, 'silence') && sp.school !== '技') return false;
  if (sp.kind === 'pair' && !pairPartner(u)) return false;
  if (sp.kind === 'summon' && alive().filter(o => o.summoner === u.uid).length >= maxSummons(u)) return false;
  return true;
}
function spellTiles(u, spId) {
  const sp = SPELLS[spId], out = [];
  // 以自身为中心的范围技（旋风枪等）：只要周围有敌人即可施放
  if (sp.around) return spellAffected(u, spId, u.x, u.y).length ? [{ x: u.x, y: u.y }] : [];
  for (const t of tilesInRange(u.x, u.y, sp.range[0], sp.range[1])) {
    const c = unitAt(t.x, t.y);
    if ((sp.arc || sp.cone) && !friendlySpell(sp)) { if (spellAffected(u, spId, t.x, t.y).some(o => hostile(u, o))) out.push(t); continue; }
    if (sp.kind === 'summon') {
      if (passable({ cls: sp.unit, tier: 0 }, t.x, t.y) && !c) out.push(t);
    } else if (sp.kind === 'heal') {
      if (sp.area ? spellAffected(u, spId, t.x, t.y).some(o => o.hp < o.mhp) : (c && !hostile(u, c) && c.hp < c.mhp)) out.push(t);
    } else if (sp.kind === 'refresh') {
      if (c && c !== u && !hostile(u, c) && c.acted && canAct(c) && c.team === u.team) out.push(t);
    } else if (sp.kind === 'cure') {
      if (c && !hostile(u, c) && sp.cures.some(s => hasStatus(c, s))) out.push(t);
    } else if (sp.kind === 'buff') {
      if (c && !hostile(u, c) && !(c.buffs || []).some(b => b.stat === sp.stat)) out.push(t);
    } else {
      if (c && hostile(u, c) && !(sp.groundOnly && isFlying(c))) {
        if (sp.kind === 'status' && hasStatus(c, sp.status)) continue;
        out.push(t);
      }
    }
  }
  return out;
}

async function spellFx(u, sp, tx, ty) {
  if (sp.line) { await addFx('beam', tx, ty, 480, { sx: u.x, sy: u.y, color: sp.fx === 'ice' ? '#7ad8ff' : sp.fx === 'dark' ? '#a04ad8' : sp.fx === 'bolt' ? '#fff6a0' : '#ff6a1a' }); return; }
  if (sp.fx === 'slash') { await lunge(u, { x: tx, y: ty }); addFx('slash', tx, ty, 240, { color: sp.kind === 'pair' ? '#ffe08a' : '#fff' }); return; }
  const cells = areaTiles(tx, ty, sp.area || 0);
  sfx({ fire: 'fire', ice: 'ice', bolt: 'bolt', wind: 'wind', rock: 'rock', dark: 'dark', holy: 'holy', acid: 'status', heal: 'heal', buff: 'buff' }[sp.fx] || 'magic');
  cells.forEach(c => addFx(sp.fx, c.x, c.y, 520));
  await wait(sp.area ? 520 : 420);
}

async function castSpell(u, spId, tx, ty) {
  const sp = SPELLS[spId];
  B.cursor = null;
  u.mp -= sp.mp;
  floatText(u.x, u.y, sp.name, '#ffe08a');
  const anim = typeof castAnim === 'function' && !AUTO;
  if (!anim) sfx(friendlySpell(sp) ? (sp.kind === 'heal' ? 'heal' : 'buff') : sp.kind === 'summon' ? 'summon' : 'magic');
  let partner = null;
  if (sp.kind === 'pair') { partner = pairPartner(u); if (partner) { partner.acted = true; floatText(partner.x, partner.y, '合击！', '#ffe08a'); } }
  B.castPartner = partner;
  await wait(anim ? 120 : 280);
  if (sp.kind === 'summon') {
    if (anim) await castAnim(u, sp, spId, tx, ty); else await addFx('summon', tx, ty, 500, { color: '#9ae0ff' });
    const s = makeMonster(sp.unit, Math.max(1, u.lv), { team: u.team, summonLeft: sp.turns, summoner: u.uid, acted: true });
    s.x = tx; s.y = ty;
    B.units.push(s);
    floatText(tx, ty, '召唤！', '#d8b0ff');
    await gainExp(u, 15);
    return;
  }
  const targets = spellAffected(u, spId, tx, ty);
  if (anim) await castAnim(u, sp, spId, tx, ty); else await spellFx(u, sp, tx, ty);
  let exp = 0;
  for (const t of targets) {
    switch (sp.kind) {
      case 'heal': {
        const v = Math.min(t.mhp - t.hp, healAmount(u, sp));
        t.hp += v; floatText(t.x, t.y, '+' + v, '#6aff8a');
        if (t !== u && v > 0) exp = Math.max(exp, 22);
        break;
      }
      case 'buff': {
        t.buffs = (t.buffs || []).filter(b => b.stat !== sp.stat);
        t.buffs.push({ stat: sp.stat, amount: sp.amount, turns: sp.turns + 1 });
        floatText(t.x, t.y, `${BUFF_NAME[sp.stat]}↑`, '#6aff8a');
        exp = Math.max(exp, 15);
        break;
      }
      case 'refresh': {
        t.acted = false; floatText(t.x, t.y, '再行动！', '#7ad8ff', true);
        exp = Math.max(exp, 25);
        break;
      }
      case 'cure': {
        for (const s of sp.cures) if (t.status[s]) { delete t.status[s]; floatText(t.x, t.y, STATUS_NAME[s] + '解除', '#ffffff'); }
        if (canAct(t) && t.team === B.phase && t !== u && t.acted && t.team === 'player') t.acted = false;
        exp = Math.max(exp, 15);
        break;
      }
      case 'debuff': {
        t.buffs = (t.buffs || []).filter(b => b.stat !== sp.stat);
        t.buffs.push({ stat: sp.stat, amount: sp.amount, turns: sp.turns + 1 });
        floatText(t.x, t.y, `${BUFF_NAME[sp.stat]}↓`, '#ff9a9a');
        if (t.ai === 'hold') t.ai = 'aggr';
        exp = Math.max(exp, 15);
        break;
      }
      case 'status': {
        if (Math.random() * 100 < statusChance(u, t, sp)) { t.status[sp.status] = sp.turns + (t.team === B.phase ? 0 : 1); floatText(t.x, t.y, STATUS_NAME[sp.status], STATUS_COLOR[sp.status]); sfx('status'); exp = Math.max(exp, 18); }
        else floatText(t.x, t.y, '无效', '#aaccff');
        if (t.ai === 'hold') t.ai = 'aggr';
        break;
      }
      case 'death': {
        if (Math.random() * 100 < deathChance(u, t, sp)) { floatText(t.x, t.y, '吞噬！', '#d08aff', true); t.hp = 0; await killUnit(t); exp += expFor(u, t, true); }
        else floatText(t.x, t.y, '无效', '#aaccff');
        break;
      }
      default: { // magic / phys / pair
        const c = skillCalc(u, t, sp, partner);
        if (Math.random() * 100 >= c.hit) { floatText(t.x, t.y, 'MISS', '#aaccff'); continue; }
        const crit = Math.random() * 100 < c.crit;
        const edge = sp.area && !shaped(sp) && (t.x !== tx || t.y !== ty) ? 0.7 : 1; // 范围法术外圈伤害 70%
        const dmg = Math.max(1, Math.round(c.dmg * edge * (0.9 + Math.random() * 0.2) * (crit ? 1.5 : 1)));
        await applyDamage(u, t, dmg, crit);
        if (sp.status && t.hp > 0 && (!sp.chance || Math.random() * 100 < statusChance(u, t, sp))) { t.status[sp.status] = sp.turns + 1; floatText(t.x, t.y - 0.3, STATUS_NAME[sp.status], STATUS_COLOR[sp.status]); }
        if (hostile(u, t)) exp += expFor(u, t, t.hp <= 0);
      }
    }
  }
  await wait(220);
  if (exp) { await gainExp(u, clamp(exp, 1, 100)); if (partner) await gainExp(partner, clamp(Math.round(exp / 2), 1, 60)); }
}

function itemTargets(u, itemId) {
  const it = ITEMS[itemId];
  if (!it.cures) return [u];
  return [u, ...tilesInRange(u.x, u.y, 1, 1).map(t => unitAt(t.x, t.y)).filter(o => o && o.team === u.team)]
    .filter(o => it.cures.some(s => hasStatus(o, s)));
}
async function useItem(u, itemId, target) {
  const it = ITEMS[itemId], t = target || u;
  S.inv[itemId]--; if (S.inv[itemId] <= 0) delete S.inv[itemId];
  if (it.hp) { const v = Math.min(t.mhp - t.hp, it.hp); t.hp += v; floatText(t.x, t.y, '+' + v, '#6aff8a'); }
  if (it.mp) { const v = Math.min(t.mmp - t.mp, it.mp); t.mp += v; floatText(t.x, t.y, 'MP+' + v, '#7ac8ff'); }
  if (it.cures) for (const s of it.cures) if (t.status[s]) { delete t.status[s]; floatText(t.x, t.y, STATUS_NAME[s] + '解除', '#fff'); }
  if (it.stat) for (const k in it.stat) { t[k] += it.stat[k]; if (k === 'mhp') t.hp += it.stat[k]; if (k === 'mmp') t.mp += it.stat[k]; floatText(t.x, t.y, `${STAT_NAME[k] || (k === 'mhp' ? 'HP' : 'MP')}+${it.stat[k]}`, '#ffe08a'); }
  sfx('heal');
  addFx('heal', t.x, t.y, 500);
  await wait(500);
}

async function finishUnit(u) {
  u.acted = true;
  if (u.team === 'player' && u.hp > 0) {
    const c = B.chests.find(c => !c.opened && c.x === u.x && c.y === u.y);
    if (c) {
      c.opened = true; sfx('chest');
      const it = ITEMS[c.item];
      S.inv[c.item] = (S.inv[c.item] || 0) + 1;
      if (c.gold) S.gold += c.gold;
      let msg = `获得 ${it.name}${c.gold ? ` 与 ${c.gold} G` : ''}！`;
      const slot = it.type === 'weapon' ? 'weapon' : it.type === 'armor' ? 'armor' : it.type === 'acc' ? 'acc' : null;
      const fits = slot && (slot !== 'weapon' || canUseWeapon(u, c.item));
      const stat = slot === 'weapon' ? 'atk' : 'def';
      if (fits && itemStat(c.item, stat) + itemStat(c.item, 'mag') > itemStat(u[slot], stat) + itemStat(u[slot], 'mag')) {
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
// 玩家操作
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
      if (u && u.team === 'player' && !u.acted && canAct(u)) return selectUnit(u);
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
      if (u === sel) return afterMove();
      const v = B.reach.get(key(x, y));
      if (v && v.stop) {
        busy = true; B.hlMove = null; B.hlDanger = null;
        await moveUnit(sel, pathTo(B.reach, x, y));
        busy = false;
        return afterMove();
      }
      if (u && u.team === 'player' && !u.acted && canAct(u)) return selectUnit(u);
      return setMode('idle');
    }
    case 'action': return;
    case 'target': case 'spell': {
      const k = key(x, y);
      const valid = (B.hlAttack && B.hlAttack.has(k)) || (B.hlHeal && B.hlHeal.has(k));
      if (!valid) { if (u) { B.focus = u; refreshPanel(); } return; }
      if (B.pending && B.pending.x === x && B.pending.y === y) return confirmPending();
      B.pending = { x, y }; B.cursor = { x, y };
      if (B.mode === 'spell') {
        const sp = SPELLS[B.spell];
        B.hlArea = new Set(spellCells(B.sel, sp, x, y).map(t => key(t.x, t.y)));
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
  if (!alive().some(u => u.team === 'player' && !u.acted && canAct(u))) endPlayerPhase();
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
      const groups = {};
      for (const id of skillsOf(u)) { const sp = SPELLS[id]; (groups[sp.school] = groups[sp.school] || []).push(id); }
      const html = Object.keys(groups).map(sc => `<div class="pick-group">${SCHOOL_NAME[sc] || sc}</div>` + groups[sc].map(id => {
        const sp = SPELLS[id];
        const ok = canCastNow(u, id) && spellTiles(u, id).length > 0;
        const why = !ok && sp.kind === 'pair' && !pairPartner(u) ? '（需相邻且未行动的剑术系伙伴：作家、剑士、魔剑使、大剑师）' : '';
        return `<button class="pick" data-pick="${id}" ${ok ? '' : 'disabled'}><b>${sp.name}</b><span>MP ${sp.mp}</span><small>${sp.desc}${why}</small></button>`;
      }).join('')).join('');
      const id = await modal(hasStatus(u, 'silence') ? '法术（被禁锢）' : '法术 / 战技', `<div class="pick-list">${html}</div>`, [{ label: '返回', value: null }], { dismiss: null });
      if (!id) return;
      const sp = SPELLS[id];
      const set = new Set(spellTiles(u, id).map(t => key(t.x, t.y)));
      setMode('spell', { sel: u, focus: u, orig: B.orig, spell: id, [friendlySpell(sp) || sp.kind === 'summon' ? 'hlHeal' : 'hlAttack']: set });
      if (sp.around) { // 以自身为中心：直接预览范围，再点一次确认
        Object.assign(B, { pending: { x: u.x, y: u.y }, cursor: { x: u.x, y: u.y }, hlArea: new Set(areaTiles(u.x, u.y, sp.area).map(t => key(t.x, t.y))) });
        refreshPanel();
      }
      return;
    }
    case 'item': {
      const ids = Object.keys(S.inv).filter(id => ITEMS[id].type === 'use' && S.inv[id] > 0);
      const list = ids.map(id => `<button class="pick" data-pick="${id}" ${itemTargets(u, id).length ? '' : 'disabled'}><b>${ITEMS[id].name}</b><span>×${S.inv[id]}</span><small>${ITEMS[id].desc}</small></button>`).join('') || '<p class="center dim">没有可用的道具</p>';
      const id = await modal('道具', `<div class="pick-list">${list}</div>`, [{ label: '返回', value: null }], { dismiss: null });
      if (!id) return;
      let target = u;
      const ts = itemTargets(u, id);
      if (ITEMS[id].cures && ts.length > 1) {
        const tid = await modal('对谁使用？', `<div class="pick-list">${ts.map(o => `<button class="pick" data-pick="${o.uid}"><b>${esc(o.name)}</b><small>${Object.keys(o.status).map(s => STATUS_NAME[s]).join(' ')}</small></button>`).join('')}</div>`, [{ label: '返回', value: null }], { dismiss: null });
        if (!tid) return;
        target = ts.find(o => String(o.uid) === tid);
      } else if (ts.length === 1) target = ts[0];
      busy = true; setMode('busy', { sel: u });
      await useItem(u, id, target);
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
      const cost = costFor(mt, nx, ny);
      if (cost >= 99) continue;
      const nc = cur.c + cost, k = key(nx, ny);
      if (D.has(k) && D.get(k) <= nc) continue;
      D.set(k, nc); q.push({ x: nx, y: ny, c: nc });
    }
  }
  return D;
}
// 预估各格子在敌方下一阶段会受到的伤害（友方 AI 用来避免孤军深入）
function dangerMap(u, foes) {
  const D = new Map();
  for (const f of foes) {
    if (!canAct(f)) continue;
    const ox = u.x, oy = u.y; u.x = -99; u.y = -99;
    const th = threatTiles(f);
    u.x = ox; u.y = oy;
    let dmg = Math.max(1, atkOf(f) - Math.round(defOf(u) * 0.5));
    for (const id of skillsOf(f)) { const sp = SPELLS[id]; if ((sp.kind === 'magic' || sp.kind === 'phys') && f.mp >= sp.mp) dmg = Math.max(dmg, skillCalc(f, u, sp).dmg); }
    for (const k of th.set) D.set(k, (D.get(k) || 0) + dmg);
  }
  return D;
}
async function runAI(team) {
  const list = alive().filter(u => u.team === team && !u.acted);
  for (const u of list) {
    if (B.over) return;
    if (u.hp <= 0 || u.acted || !canAct(u)) continue;
    if (!AUTO) { B.focus = u; B.cursor = { x: u.x, y: u.y }; refreshPanel(); await wait(140); }
    await aiUnit(u);
    if (u.hp > 0) await finishUnit(u); else checkEnd();
    await wait(90);
  }
  B.cursor = null;
}
async function aiUnit(u) {
  const foes = alive().filter(o => hostile(u, o));
  if (!foes.length || u.cls === 'villager') return;
  const careful = (u.team === 'player' || u.team === 'ally') && (u.lord || B.turn <= 6);
  const danger = careful ? dangerMap(u, foes) : null;
  const risk = (st, hpLeft) => { if (!danger) return 0; const d = danger.get(key(st.x, st.y)) || 0; return d >= hpLeft ? (u.lord ? 300 : 60) + d : d * 0.4; };
  const reach = reachable(u);
  const stops = [...reach.values()].filter(v => v.stop && (u.ai !== 'guard' || (v.x === u.x && v.y === u.y)));
  const skills = skillsOf(u).filter(id => SPELLS[id].kind !== 'pair' && canCastNow(u, id));
  const friends = alive().filter(o => !hostile(u, o));
  const here = reach.get(key(u.x, u.y));
  const restrained = u.ai === 'hold' || u.ai === 'boss' || u.ai === 'guard';

  // 1) 治疗
  for (const id of skills.filter(id => SPELLS[id].kind === 'heal')) {
    const sp = SPELLS[id];
    let best = null;
    for (const st of restrained ? [here] : stops) {
      for (const f of friends) {
        const d = mdist(st.x, st.y, f.x, f.y);
        if (d < sp.range[0] || d > sp.range[1] || f.hp > f.mhp * 0.6) continue;
        const score = (f.mhp - f.hp) + (f.lord ? 15 : 0) - st.c * 0.5;
        if (!best || score > best.score) best = { score, st, f };
      }
    }
    if (best) { await moveUnit(u, pathTo(reach, best.st.x, best.st.y)); await castSpell(u, id, best.f.x, best.f.y); return; }
  }
  // 2) 解除石化 / 冻结
  for (const id of skills.filter(id => SPELLS[id].kind === 'cure')) {
    const tgt = spellTiles(u, id)[0];
    if (tgt) { await castSpell(u, id, tgt.x, tgt.y); return; }
  }
  // 3) 召唤
  const sid = skills.find(id => SPELLS[id].kind === 'summon');
  if (sid && Math.random() < 0.7) {
    const near = Math.min(...foes.map(f => mdist(u.x, u.y, f.x, f.y)));
    const tiles = spellTiles(u, sid);
    if (near <= 8 && tiles.length) { await castSpell(u, sid, tiles[0].x, tiles[0].y); return; }
  }
  // 4) 攻击 / 攻击性法术
  let best = null;
  const [r0, r1] = rangeOf(u);
  const consider = (score, st, act, tx, ty, id) => { if (!best || score > best.score) best = { score, st, act, tx, ty, id }; };
  const threat = f => atkOf(f) + magOf(f) * 0.6;
  for (const st of stops) {
    const tdef = TERRAIN[tileAt(st.x, st.y)].def;
    const ox = u.x, oy = u.y; u.x = st.x; u.y = st.y;
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
      if (['heal', 'summon', 'cure', 'buff', 'refresh'].includes(sp.kind)) continue;
      for (const t of tilesInRange(st.x, st.y, sp.range[0], sp.range[1])) {
        const c0 = unitAt(t.x, t.y);
        if (!shaped(sp) && (!c0 || !hostile(u, c0))) continue;
        let s = 0;
        for (const f of spellAffected(u, id, t.x, t.y)) {
          const enemy = hostile(u, f);
          if (sp.kind === 'status') { if (enemy && !hasStatus(f, sp.status)) s += threat(f) * statusChance(u, f, sp) / 100 * (sp.status === 'poison' ? 0.4 : 0.9); }
          else if (sp.kind === 'debuff') { if (enemy) s += 4; }
          else if (sp.kind === 'death') { if (enemy) s += f.hp * deathChance(u, f, sp) / 100 * 0.6; }
          else {
            const c = skillCalc(u, f, sp);
            const dd = c.dmg * (sp.area && !shaped(sp) && (f.x !== t.x || f.y !== t.y) ? 0.7 : 1);
            const v = dd * c.hit / 100 + (dd >= f.hp ? 40 : 0) + (f.lord ? 6 : 0);
            s += enemy ? v : -v * 1.5; // 直线法术会误伤友军
          }
        }
        s += tdef * 0.04 - sp.mp * 0.2 - st.c * 0.05 - risk(st, u.hp);
        consider(s, st, 'spell', t.x, t.y, id);
      }
    }
    u.x = ox; u.y = oy;
  }
  if (best && best.score > (careful ? 0 : -5)) {
    if (u.ai === 'hold') u.ai = 'aggr';
    await moveUnit(u, pathTo(reach, best.st.x, best.st.y));
    if (best.act === 'attack') await doAttack(u, unitAt(best.tx, best.ty));
    else await castSpell(u, best.id, best.tx, best.ty);
    return;
  }
  if (restrained) return;
  // 5) 接近最近的敌人（「抵达」类关卡：我方离目标最近的角色直奔目标）
  let goal = foes;
  if (u.team === 'player' && B.def.win.type === 'reach') {
    const [gx, gy] = B.def.win.at;
    const mine = alive().filter(o => o.team === 'player' && !o.lord).sort((a, b) => mdist(a.x, a.y, gx, gy) - mdist(b.x, b.y, gx, gy));
    if (mine.slice(0, 2).includes(u)) goal = [{ x: gx, y: gy }];
  }
  const D = distField(u, goal);
  let pick = null;
  for (const st of stops) {
    const dv = D.has(key(st.x, st.y)) ? D.get(key(st.x, st.y)) : 999;
    const s = dv * 10 - TERRAIN[tileAt(st.x, st.y)].def * 0.05 + risk(st, u.hp) * 3 + (careful && u.lord ? dv * 4 : 0);
    if (!pick || s < pick.s) pick = { s, st };
  }
  if (pick) await moveUnit(u, pathTo(reach, pick.st.x, pick.st.y));
}

// =====================================================================
// HUD / 面板
// =====================================================================
function updateHud() {
  if (!B) return;
  const name = { player: '我方', ally: '友军', enemy: '敌军', rogue: '第三势力' }[B.phase];
  const lim = B.def.win.turns;
  $('#hud-turn').innerHTML = `第 <b>${B.turn}</b>${lim ? `/${lim}` : ''} 回合 · <span class="ph-${B.phase}">${name}</span>`;
}
function unitInfoHtml(u) {
  const t = terrAt(u.x, u.y);
  const eq = [u.weapon, u.armor, u.acc].filter(Boolean).map(i => ITEMS[i].name).join(' / ') || '—';
  const teamName = { player: '我方', ally: '友军', enemy: '敌军', rogue: '第三势力' }[u.team];
  const sts = Object.keys(u.status || {}).map(s => `<span class="st" style="background:${STATUS_COLOR[s]}">${STATUS_NAME[s]}${u.status[s]}</span>`).join('');
  const bfs = (u.buffs || []).map(b => `<span class="st ${b.amount < 0 ? 'down' : 'up'}">${BUFF_NAME[b.stat]}${b.amount < 0 ? '↓' : '↑'}</span>`).join('');
  return `<div class="ui-row">
    <div class="ui-port" data-port="${u.uid}"></div>
    <div class="ui-main">
      <div class="ui-name"><b>${esc(u.name)}</b> <span class="tag t-${u.team}">${teamName}</span> <span>${className(u)} Lv${u.lv}</span>${u.team === 'player' ? `<span class="dim"> EXP ${u.exp}</span>` : ''}${sts}${bfs}</div>
      ${hpBar(u.hp, u.mhp, 'hp')}${u.mmp ? hpBar(u.mp, u.mmp, 'mp') : ''}
      <div class="ui-stats">攻<b>${atkOf(u)}</b> 防<b>${defOf(u)}</b> 魔<b>${magOf(u)}</b> 速<b>${spdOf(u)}</b> 移<b>${movOf(u)}</b> <span class="dim">${typeOf(u)} · ${t.name}${t.def ? ' 防+' + t.def + '%' : ''}</span></div>
      <div class="ui-stats dim">${eq}</div>
    </div></div>`;
}
function advText(m) { return m > 1 ? `<i class="adv up">克制×${m}</i>` : m < 1 ? `<i class="adv down">被克×${m}</i>` : ''; }
function forecastHtml() {
  const u = B.sel, p = B.pending;
  if (!p) return '';
  const t = unitAt(p.x, p.y);
  if (B.mode === 'target' && t) {
    const c = physCalc(u, t);
    const counter = canCounter(t, u) ? physCalc(t, u) : null;
    return `<div class="fc">
      <div class="fc-side"><b>${esc(u.name)}</b>${advText(c.adv)}<div>伤害 <em>${c.dmg}</em> 命中 ${c.hit}% 暴击 ${c.crit}%</div></div>
      <div class="fc-vs">⚔</div>
      <div class="fc-side"><b>${esc(t.name)}</b> HP ${t.hp}/${t.mhp}<div>${counter ? `反击 <em>${counter.dmg}</em> 命中 ${counter.hit}%` : '无法反击'}</div></div>
    </div>`;
  }
  if (B.mode === 'spell') {
    const sp = SPELLS[B.spell];
    if (sp.kind === 'summon') return `<div class="fc"><div class="fc-side"><b>${sp.name}</b><div>在此处召唤${CLASSES[sp.unit].tiers[0].name}（${sp.turns} 回合）</div></div></div>`;
    const partner = sp.kind === 'pair' ? pairPartner(u) : null;
    const ts = spellAffected(u, B.spell, p.x, p.y);
    const rows = ts.map(o => {
      const ally = !hostile(u, o);
      switch (sp.kind) {
        case 'heal': return `${esc(o.name)} 回复 <em>${Math.min(o.mhp - o.hp, healAmount(u, sp))}</em>`;
        case 'buff': return `${esc(o.name)} ${BUFF_NAME[sp.stat]}提升 ${sp.turns} 回合`;
        case 'cure': return `${esc(o.name)} 解除异常状态`;
        case 'refresh': return `${esc(o.name)} 本回合可再次行动`;
        case 'debuff': return `${esc(o.name)} ${BUFF_NAME[sp.stat]}下降 ${sp.turns} 回合`;
        case 'status': return `${esc(o.name)} ${STATUS_NAME[sp.status]} 成功率 <em>${statusChance(u, o, sp)}%</em>`;
        case 'death': return `${esc(o.name)} 即死率 <em>${deathChance(u, o, sp)}%</em>`;
        default: { const c = skillCalc(u, o, sp, partner); const dd = Math.round(c.dmg * (sp.area && !shaped(sp) && (o.x !== p.x || o.y !== p.y) ? 0.7 : 1)); return `${ally ? '<span class="warn">误伤</span> ' : ''}${esc(o.name)} 伤害 <em>${dd}</em>${c.hit < 100 ? ` (${c.hit}%)` : ''}`; }
      }
    }).join('<br>');
    return `<div class="fc"><div class="fc-side"><b>${sp.name}</b> <span class="dim">MP ${sp.mp}${partner ? ` · 与${esc(partner.name)}合击` : ''}</span><div class="fc-rows">${rows || '<span class="dim">范围内没有目标</span>'}</div></div></div>`;
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
  if (pp && f) { const c = unitPortrait(f, 52); if (c) pp.appendChild(c); }
  const btn = (label, act, cls, dis) => `<button class="btn ${cls || ''}" data-act="${act}" ${dis ? 'disabled' : ''}>${label}</button>`;
  let b = '';
  const myTurn = B.phase === 'player' && B.endPhase && !B.over;
  switch (B.mode) {
    case 'idle': case 'inspect': b = btn('目标', 'objective') + btn('菜单', 'menu') + btn('结束回合', 'endturn', 'primary', !myTurn); break;
    case 'move': b = btn('取消', 'cancel'); break;
    case 'action': {
      const u = B.sel;
      const canAtk = attackTargets(u).length > 0;
      const canSpell = skillsOf(u).some(id => canCastNow(u, id) && spellTiles(u, id).length > 0);
      const hasItem = Object.keys(S.inv).some(id => ITEMS[id].type === 'use' && itemTargets(u, id).length);
      b = btn('攻击', 'attack', 'red', !canAtk) + btn('法术', 'spell', 'purple', !canSpell) + btn('道具', 'item', '', !hasItem) + btn('待机', 'wait', 'primary') + btn('取消', 'cancel');
      break;
    }
    case 'target': case 'spell':
      b = (B.pending ? btn('确认', 'confirm', 'primary') : `<span class="dim small">${B.mode === 'target' ? '选择攻击目标' : '选择目标'}（再次点击确认）</span>`) + btn('返回', 'cancel');
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
    const left = alive().filter(u => u.team === 'player' && !u.acted && canAct(u)).length;
    if (left) { const ok = await modal('结束回合', `<p class="center">还有 ${left} 名角色未行动，确定结束回合吗？</p>`, [{ label: '结束回合', value: 1, cls: 'primary' }, { label: '取消', value: 0 }]); if (!ok) return; }
    return endPlayerPhase();
  }
  if (act === 'objective') {
    const o = objectiveText(); sfx('select');
    return modal('作战目标', `<p><b class="win-c">胜利</b>　${esc(o.win)}</p><p><b class="lose-c">失败</b>　${esc(o.lose)}</p><p class="dim small">宝箱：让我方角色移动到宝箱上并结束行动即可开启。</p>`, [{ label: '确定', value: 1 }], { dismiss: 1 });
  }
  if (act === 'menu') return battleMenu();
  return onAction(act);
});
