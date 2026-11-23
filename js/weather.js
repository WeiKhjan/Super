// 天气、地形事件与地图氛围
//   1) 天气（晴 / 雨 / 雾 / 雪 / 沙暴 / 夜）：按关卡指定，会影响命中、法术威力、移动力与视野；部分关卡战斗中途转变
//   2) 地形事件：熔岩蔓延、落石、河水涨落、木桥崩塌、林火蔓延（都会提前一回合标记警示格）
//   3) 地图氛围（高清画风）：雨丝水花、雪花、雾层、风沙、云影、水面波光、晨昏夜色与村庄灯火、阳光
// battle.js 只在几个地方以 typeof 检查后呼叫这里导出的 wx* 函数；不加载本文件时游戏照常运作。
// 测试：window.__wxOff = true 时一律晴天且没有地形事件（用来比较胜率）。
'use strict';

(function (G) {
// ---------------------------------------------------------------------
// 天气资料
// ---------------------------------------------------------------------
const WX = {
  clear: { name: '晴', fx: '', short: '' },
  rain: { name: '雨', fx: '火系法术威力 −20%，雷系法术威力 +25%，弓箭手命中 −15', short: '火系−20% · 雷系+25% · 弓箭命中−15' },
  fog: { name: '雾', fx: '视野只有 3 格：我方视野外的敌人看不见，也无法指定为目标（敌军同样看不清我方）', short: '视野 3 格 · 看不见的敌人无法攻击' },
  snow: { name: '雪', fx: '非飞行单位站在开阔地（草地、道路、沙地、雪地、丘陵）时移动力 −1；冰系法术威力 +15%', short: '开阔地移动力−1 · 冰系+15%' },
  sand: { name: '沙暴', fx: '远程攻击（隔一格以上）命中 −20', short: '远程命中−20' },
  night: { name: '夜', fx: '视野只有 2 格（村庄、熔岩与火光周围看得见）；盗贼与暗黑系单位命中 +10', short: '视野 2 格 · 盗贼/暗黑命中+10' },
};
const TOD_NAME = { day: '', dusk: '黄昏', night: '夜晚' };
const EV_TEXT = {
  lava: e => `熔岩每 ${e.every} 回合向四周蔓延`,
  rocks: e => `第 ${e.first} 回合起每 ${e.every} 回合有落石`,
  flood: () => '河水会上涨、回落',
  bridge: e => `第 ${e.at} 回合木桥崩塌`,
  fire: () => '林火每回合向相邻的森林蔓延',
};
// 各关天气：一代以「g1:关卡编号」，二代起以关卡 id 为键。大部分关卡保持晴天，天气才显得特别。
//   w 天气；tod 时段（day / dusk / night，夜天气自动为 night）；at {回合: 新天气} 中途转变；ev 地形事件
const WX_STAGE = {
  // ---- 一代 ----
  'g1:5': { w: 'fog' }, // 清澈如镜的镜湖：湖上晨雾
  'g1:7': { w: 'clear', at: { 4: 'rain' } }, // 卡斯堤会战：会战中途下起雨
  'g1:12': { tod: 'dusk' }, // 安哥拉高原
  'g1:14': { w: 'fog' }, // 迷幻森林
  'g1:17': { ev: [{ type: 'lava', first: 3, every: 3, n: 2, onto: 'H' }] }, // 火燄山：熔岩蔓延（不会吞没道路）
  'g1:20': { ev: [{ type: 'rocks', first: 3, every: 3, n: 3 }] }, // 火山口：火山落石
  'g1:21': { w: 'sand' }, // 死亡沙漠
  'g1:26': { w: 'rain' }, // 解救塔顿港
  'g1:27': { w: 'rain' }, // 海上怪兽：暴风雨中的海战
  'g1:29': { w: 'fog' }, // 黑暗大陆登陆战
  'g1:30': { tod: 'dusk', ev: [{ type: 'rocks', first: 2, every: 3, n: 3 }] }, // 暗之山谷：山谷落石
  'g1:31': { w: 'snow' }, // 雪中世界
  'g1:32': { w: 'snow' }, // 心眼碉堡
  'g1:33': { w: 'night' }, // 黑暗之都
  // ---- 二代 复仇魔神 ----
  'g2_02': { w: 'night' }, // 北驿小径：趁夜逃出王城
  'g2_04': { w: 'snow' }, // 进攻兵器塔：北方山谷
  'g2_05': { w: 'night' }, // 铲除狼群：入夜后的狼嚎
  'g2_13': { w: 'fog' }, // 神秘杀手：林间雾气
  'g2_15': { tod: 'dusk' }, // 秋月：枫溪月色
  'g2_17': { w: 'night', ev: [{ type: 'bridge', at: 4, n: 4 }] }, // 火烧船舰：夜袭，烧断的跳板
  'g2_18': { w: 'rain' }, // 浴血海战
  'g2_27': { w: 'night' }, // 解救王宫：夜色中的奥里王都
  'g2_30': { w: 'night', at: { 5: 'clear' } }, // 联手抗敌：月夜古城，天亮时夜魔女离去
  'g2_32': { w: 'fog' }, // 小人国：笼罩森林的紫雾
  'g2_36': { w: 'fog' }, // 明锡风云：海雾
  'g2_46': { ev: [{ type: 'rocks', first: 2, every: 2, n: 3 }] }, // 陷阱：山道落石
  'g2_48': { w: 'clear', at: { 3: 'rain' } }, // 海岸守备队
  'g2_50': { tod: 'dusk' }, // 多情剑客：断崖
  // ---- 外传 北方密使 ----
  'g3_01': { w: 'night' }, // 第一神剑：深夜营火
  'g3_03': { w: 'night' }, // 水都镜湖：桥上的灯一盏盏熄灭
  'g3_05': { w: 'sand' }, // 黄沙烈焰
  'g3_07': { w: 'clear', at: { 4: 'sand' } }, // 沙盗黑蝎子：漫天风沙
  'g3_11': { w: 'night' }, // 恶德商人：无月之夜的港口
  'g3_18': { w: 'night' }, // 潜入领主府
  'g3_34': { tod: 'dusk' }, // 港都喋血：黄昏抵达
  'g3_40': { ev: [{ type: 'lava', first: 3, every: 3, n: 2, onto: 'O' }] }, // 龙穴：熔岩
  'g3_60': { w: 'rain', ev: [{ type: 'flood', first: 3, every: 3, n: 6 }] }, // 峦河水霸：暴雨涨水
  'g3_83': { w: 'fog', at: { 4: 'clear' } }, // 会面：晨雾散去
  'g3_93': { w: 'night' }, // 暗夜妖魔
  'g3_100': { tod: 'dusk' }, // 奚族圣地：月蚀
  'g3_105': { w: 'rain', ev: [{ type: 'bridge', at: 4, n: 3 }] }, // 渡河点：雨中渡河，桥梁崩塌
  'g3_108': { w: 'fog' }, // 双子之塔：河湾浓雾
  // ---- 三代 狂神降世 ----
  'g4_02': { w: 'night' }, // 逃亡：夜色里的王都
  'g4_13': { w: 'night' }, // 麦勒港之夜
  'g4_22': { w: 'fog' }, // 怪物之谜：河谷雾气
  'g4_24': { w: 'clear', at: { 4: 'rain' } }, // 会战
  'g4_27': { w: 'night', ev: [{ type: 'rocks', first: 3, every: 3, n: 3, meteor: true }] }, // 殒星：深夜流星坠落
  'g4_32': { w: 'night' }, // 关卡前夜
  'g4_34': { ev: [{ type: 'fire', seeds: 2, n: 3 }] }, // 步步危机：林火
  'g4_36': { w: 'fog' }, // 幽冥路：终年不散的灰雾
  'g4_39': { w: 'rain' }, // 海兽利维亚桑
  'g4_45': { w: 'fog' }, // 船上：外海浓雾
  'g4_62': { tod: 'dusk' }, // 艾普洛史最长的一日
};
const OPEN = 'GRSNH'; // 雪天移动力 −1 的开阔地
const INDOOR = 'OCXKYDLA';

const curKey = st => (st.id ? st.id : 'g1:' + st.no);
const hs = (a, b) => { let h = Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const live = () => !!(B && B.wx);
const inBattle = u => live() && B.units.indexOf(u) >= 0;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const kxy = k => { const i = k.indexOf(','); return [+k.slice(0, i), +k.slice(i + 1)]; };

// ---------------------------------------------------------------------
// 战斗开始：建立本场的天气状态（存在 B.wx，换关自然重置）
// ---------------------------------------------------------------------
function wxStart(b) {
  const spec = (!G.__wxOff && WX_STAGE[curKey(b.def)]) || {};
  const w = spec.w || 'clear';
  let n = 0; for (const row of b.map) for (const ch of row) if (INDOOR.includes(ch)) n++;
  b.wx = {
    spec, w, tod: w === 'night' ? 'night' : spec.tod || 'day', indoor: n > b.w * b.h * 0.55,
    ev: (spec.ev || []).map(d => ({ d, stack: [], next: null, ops: 0 })),
    warn: new Map(), burn: new Map(), mapVer: 0, dirty: false, told: {}, lit: null, litVer: -1,
  };
  if (b.wx.ev.length) b.map = b.map.slice(); // 地形会变：复制一份，不动关卡原始资料
  hudChip();
}

// ---------------------------------------------------------------------
// 规则：命中 / 威力 / 移动力 / 视野
// ---------------------------------------------------------------------
const isArcher = u => typeOf(u) === '弓箭手' || (typeof weaponType === 'function' && weaponType(u) === 'bow');
const isSneaky = u => hasPerk(u, 'unlock') || hasPerk(u, 'search') || DARK_TYPES.includes(typeOf(u));
// 物理攻击的天气修正（返回 [命中修正, 说明]）
function physMod(a, d) {
  const w = B.wx.w, far = mdist(a.x, a.y, d.x, d.y) > 1;
  if (w === 'rain' && isArcher(a)) return [-15, '雨 · 弓箭命中 −15'];
  if (w === 'sand' && far) return [-20, '沙暴 · 远程命中 −20'];
  if (w === 'night' && isSneaky(a)) return [10, '夜 · 命中 +10'];
  return [0, ''];
}
function magMod(sp) {
  const w = B.wx.w;
  if (w === 'rain' && (sp.fx === 'fire' || sp.school === '火')) return [0.8, '雨 · 火系 −20%'];
  if (w === 'rain' && sp.fx === 'bolt') return [1.25, '雨 · 雷系 +25%'];
  if (w === 'snow' && sp.fx === 'ice') return [1.15, '雪 · 冰系 +15%'];
  return [1, ''];
}
// physCalc / magCalc 的结果经过这里（sp 为法术时是魔法；sure 为必中技）
function wxCalc(c, a, d, sp, sure) {
  if (!inBattle(a) || !c) return c;
  if (sp) {
    const [m] = magMod(sp);
    if (m !== 1) c.dmg = Math.max(1, Math.round(c.dmg * m));
  } else if (!sure) {
    const [m] = physMod(a, d);
    if (m) c.hit = clamp(c.hit + m, 10, 100);
  }
  return c;
}
function wxMov(u) {
  if (!live() || B.wx.w !== 'snow' || !inBattle(u) || !inMap(u.x, u.y) || isFlying(u)) return 0;
  return OPEN.includes(tileAt(u.x, u.y)) ? -1 : 0;
}
const visR = () => (live() ? (B.wx.w === 'fog' ? 3 : B.wx.w === 'night' ? 2 : 0) : 0);
// 夜里有光的格子：村庄、圣坛、熔岩与燃烧中的树林周围一格
function litGrid() {
  const X = B.wx;
  if (X.lit && X.litVer === X.mapVer + X.burn.size * 1000) return X.lit;
  const g = new Uint8Array(B.w * B.h);
  const mark = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) <= 1 && inMap(x + dx, y + dy)) g[(y + dy) * B.w + x + dx] = 1; };
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if ('VAL'.includes(B.map[y][x])) mark(x, y);
  for (const k of X.burn.keys()) { const [x, y] = kxy(k); mark(x, y); }
  X.lit = g; X.litVer = X.mapVer + X.burn.size * 1000;
  return g;
}
// 某一方（'P' 我方+友军 / 'enemy' / 'rogue'）是否看得见 (x, y)
function seenBy(sk, x, y, R) {
  for (const o of B.units) {
    if (o.hp <= 0 || side(o.team) !== sk) continue;
    if (Math.abs(o.x - x) + Math.abs(o.y - y) <= R + (hasPerk(o, 'search') ? 1 : 0)) return true;
  }
  return B.wx.w === 'night' && inMap(x, y) && !!litGrid()[y * B.w + x];
}
// a 能否把 d 当成目标（雾 / 夜：d 必须在 a 方任一单位的视野内）
function wxCanTarget(a, d) {
  const R = visR();
  if (!R || !a || !d || !hostile(a, d)) return true;
  return seenBy(side(a.team), d.x, d.y, R);
}
// 画面上是否隐藏（我方看不见的敌人）
function wxHidden(u) {
  const R = visR();
  if (!R || !u || side(u.team) === 'P') return false;
  return !seenBy('P', Math.round(u.px ?? u.x), Math.round(u.py ?? u.y), R);
}
function wxFilterUnits(list) {
  if (!visR()) return;
  for (let i = list.length - 1; i >= 0; i--) if (wxHidden(list[i])) list.splice(i, 1);
}

// ---------------------------------------------------------------------
// 回合开始：天气转变、地形事件
// ---------------------------------------------------------------------
async function wxPhase(team) {
  if (!live() || team !== 'player' || B.over) return;
  const X = B.wx, t = B.turn, at = X.spec.at || {};
  if (t === 1 && X.w !== 'clear') { hudChip(); await banner(`天气：${WX[X.w].name}`, WX[X.w].short); }
  if (at[t] && at[t] !== X.w) {
    const was = X.w; X.w = at[t];
    X.tod = X.w === 'night' ? 'night' : was === 'night' ? 'dusk' : X.spec.tod || 'day';
    X.lit = null; B.dangerCache = null;
    hudChip();
    const head = X.w === 'clear' ? (was === 'night' ? '天亮了' : was === 'fog' ? '雾散了' : '天气转晴') : X.w === 'rain' ? '下起雨了' : X.w === 'sand' ? '刮起沙暴了' : X.w === 'snow' ? '下起雪了' : X.w === 'fog' ? '起雾了' : '夜幕降临';
    await banner(head, X.w === 'clear' ? '天气影响解除' : WX[X.w].short);
  }
  let changed = false;
  for (const E of X.ev) changed = (await runEvent(E, t)) || changed;
  // 林火：燃烧中的格子灼伤站在上面的单位，烧完变成焦土（草地）
  if (X.burn.size) changed = (await burnTick()) || changed;
  rebuildWarn();
  if (changed) mapChanged();
}
function mapChanged() {
  const X = B.wx; X.mapVer++; X.lit = null; X.cache = null; B.dangerCache = null;
  if (AUTO) { X.dirty = true; return; }
  try { resize(); } catch (e) { console.warn('weather: resize failed', e); }
}
function rebuildWarn() {
  const X = B.wx; X.warn.clear();
  for (const E of X.ev) if (E.next) for (const k of E.next.tiles.keys()) X.warn.set(k, E.d.type);
}
// 下一次触发的回合（依事件类型）
function due(E, t) {
  const d = E.d;
  if (d.type === 'bridge') return t === d.at;
  if (d.type === 'fire') return t >= 2;
  return t >= d.first && (t - d.first) % d.every === 0;
}
async function runEvent(E, t) {
  const d = E.d, X = B.wx;
  let changed = false;
  if (d.type === 'fire' && t === 1) { // 开场点燃
    for (const k of fireSeeds(d.seeds || 2)) X.burn.set(k, 0);
    if (X.burn.size) { tell('fire', '林中起火了', '燃烧的树林会灼伤停留的单位，并逐回合向相邻森林蔓延'); for (const k of X.burn.keys()) { const [x, y] = kxy(k); addFx('fire', x, y, 520); } }
  }
  if (E.next && E.next.turn === t) { changed = await applyEvent(E, E.next); E.next = null; }
  if (due(E, t + 1)) {
    const tiles = plan(E);
    if (tiles && tiles.size) {
      E.next = { turn: t + 1, tiles };
      const msg = {
        lava: ['熔岩即将蔓延', '橙色标记的格子下回合会被熔岩吞没'],
        rocks: d.meteor ? ['流星划过夜空', '红色标记处下回合将有陨石坠落'] : ['头顶传来碎石声', '红色标记处下回合将有落石'],
        flood: E.ops % 4 < 2 ? ['河水开始上涨', '蓝色标记的格子下回合会被淹没'] : ['水位渐渐回落', '下回合部分水域会退去'],
        bridge: ['木桥摇摇欲坠', '标记处的桥面下回合将会崩塌'],
        fire: ['林火蔓延', '标记处的树林下回合将被引燃'],
      }[d.type];
      await tell(d.type + (d.type === 'flood' ? E.ops % 4 < 2 : ''), msg[0], msg[1]);
    }
  }
  return changed;
}
// 第一次用横幅说明，之后只用小提示
async function tell(id, head, sub) {
  const X = B.wx;
  if (!X.told[id]) { X.told[id] = 1; await banner(head, sub); } else toast(head);
}
// 规划下回合要变化的格子：Map(key → 新地形字元，或 '!' 表示只造成伤害)
function plan(E) {
  const d = E.d, n = d.n || 3, out = new Map(), X = B.wx;
  const adj = (x, y, set) => DIRS.some(([dx, dy]) => inMap(x + dx, y + dy) && set.includes(tileAt(x + dx, y + dy)));
  const blocked = (x, y) => B.chests.some(c => c.x === x && c.y === y && !c.opened) || (B.def.win.at && B.def.win.at[0] === x && B.def.win.at[1] === y) || (B.def.secret && B.def.secret.at[0] === x && B.def.secret.at[1] === y);
  const greedy = (cands, to) => { for (const [x, y, ch] of shuffle(cands)) { if (out.size >= n) break; const k = key(x, y); if (out.has(k)) continue; out.set(k, ch || to); if (!connOk(out)) out.delete(k); } };
  const all = []; for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) all.push([x, y]);
  if (d.type === 'lava') greedy(all.filter(([x, y]) => (d.onto || 'HO').includes(tileAt(x, y)) && adj(x, y, 'L') && !blocked(x, y)), 'L');
  else if (d.type === 'bridge') greedy(all.filter(([x, y]) => tileAt(x, y) === 'B' && !blocked(x, y)), 'W');
  else if (d.type === 'fire') {
    for (const [x, y] of shuffle(all.filter(([x, y]) => tileAt(x, y) === 'F' && !X.burn.has(key(x, y)) && DIRS.some(([dx, dy]) => X.burn.has(key(x + dx, y + dy)))))) { if (out.size >= n) break; out.set(key(x, y), '*'); }
  } else if (d.type === 'rocks') {
    const ps = shuffle(alive().filter(u => side(u.team) === 'P'));
    for (let i = 0; i < ps.length * 3 && out.size < n; i++) {
      const p = ps[i % ps.length], r = i < ps.length ? 0 : 1 + Math.floor(Math.random() * 2);
      const dx = Math.round((Math.random() * 2 - 1) * r), dy = (r - Math.abs(dx)) * (Math.random() < 0.5 ? -1 : 1);
      const x = p.x + dx, y = p.y + dy;
      if (!inMap(x, y) || TERRAIN[tileAt(x, y)].cost.foot >= 99 || out.has(key(x, y))) continue;
      if (i < ps.length && Math.random() < 0.5) continue; // 不必每次都正中我方
      out.set(key(x, y), '!');
    }
  } else if (d.type === 'flood') {
    if (E.ops % 4 < 2) { // 上涨两次，再回落两次
      greedy(all.filter(([x, y]) => tileAt(x, y) === 'T' && adj(x, y, 'W') && !blocked(x, y)), 'W');
      if (out.size < n) greedy(all.filter(([x, y]) => 'GPSR'.includes(tileAt(x, y)) && adj(x, y, 'WT') && !blocked(x, y)), 'T');
    } else {
      const last = E.stack[E.stack.length - 1];
      if (last) for (const [k, from] of last) out.set(k, from);
    }
  }
  return out;
}
async function applyEvent(E, nx) {
  const d = E.d, X = B.wx;
  let changed = false, hitAny = false;
  const undo = new Map();
  for (const [k, ch] of nx.tiles) {
    const [x, y] = kxy(k), u = unitAt(x, y);
    if (d.type === 'rocks') {
      addFx(d.meteor ? 'fire' : 'rock', x, y, 520);
      if (u) { hurt(u, 0.2, d.meteor ? '陨石' : '落石'); hitAny = true; }
      continue;
    }
    if (d.type === 'fire') { if (tileAt(x, y) === 'F') X.burn.set(k, 0); addFx('fire', x, y, 420); continue; }
    if (tileAt(x, y) === ch) continue;
    undo.set(k, tileAt(x, y));
    B.map[y] = B.map[y].slice(0, x) + ch + B.map[y].slice(x + 1);
    changed = true;
    addFx(ch === 'L' ? 'fire' : 'ice', x, y, 520);
  }
  if (d.type === 'flood') { if (E.ops % 4 < 2) E.stack.push(undo); else E.stack.pop(); E.ops++; }
  // 站在变成不可通行地形上的单位：被冲开 / 逼退并受伤
  if (changed) for (const u of alive()) {
    if (passable(u, u.x, u.y)) continue;
    const sp = freeSpotNear(u, u.x, u.y);
    u.x = sp.x; u.y = sp.y;
    hurt(u, d.type === 'lava' ? 0.2 : 0.1, d.type === 'lava' ? '灼伤' : '落水');
    hitAny = true;
  }
  const head = { lava: '熔岩蔓延！', rocks: d.meteor ? '陨石坠落！' : '落石！', flood: E.ops % 4 === 1 || E.ops % 4 === 2 ? '河水暴涨！' : '水位回落', bridge: '木桥崩塌！', fire: '' }[d.type];
  if (head) { sfx(d.type === 'lava' || d.meteor ? 'fire' : d.type === 'rocks' || d.type === 'bridge' ? 'rock' : 'magic'); if (typeof addTrauma === 'function') addTrauma(d.type === 'rocks' ? 0.45 : 0.25); toast(head); }
  if (hitAny || changed) await wait(450);
  return changed;
}
async function burnTick() {
  const X = B.wx; let changed = false, any = false;
  for (const [k, age] of [...X.burn]) {
    const [x, y] = kxy(k), u = unitAt(x, y);
    if (u && !isFlying(u)) { hurt(u, 0.1, '灼伤'); any = true; }
    if (age + 1 >= 3) { X.burn.delete(k); if (tileAt(x, y) === 'F') { B.map[y] = B.map[y].slice(0, x) + 'G' + B.map[y].slice(x + 1); changed = true; } }
    else X.burn.set(k, age + 1);
  }
  if (any) await wait(350);
  return changed;
}
// 地形伤害：按最大 HP 比例，最多扣到剩 1（不会因地形阵亡，避免关卡变得无法通关）
function hurt(u, f, label) {
  const v = Math.min(u.hp - 1, Math.max(1, Math.round(u.mhp * f)));
  if (v <= 0) return;
  u.hp -= v;
  floatText(u.x, u.y, `${label} -${v}`, '#ff9a5a');
  if (!AUTO) u.flash = performance.now() + 180;
}
function fireSeeds(n) {
  const ps = alive().filter(u => side(u.team) === 'P');
  const near = (x, y) => Math.min(99, ...ps.map(p => mdist(p.x, p.y, x, y)));
  const fs = [];
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) if (tileAt(x, y) === 'F' && near(x, y) >= 4) fs.push([x, y, near(x, y)]);
  fs.sort((a, b) => a[2] - b[2]);
  // 离我方 4~7 格的树林起火：够近才有压力，但不会一开场就烧到人
  const pool = fs.filter(f => f[2] <= 7);
  return shuffle(pool.length ? pool : fs).slice(0, n).map(([x, y]) => key(x, y));
}
// 地形改变后，所有步行单位原本能接近的敌人（或「抵达」目标）仍要接近得到
function connOk(changes) {
  const get = (x, y) => { const c = changes.get(key(x, y)); return c && c.length === 1 && c !== '!' && c !== '*' ? c : B.map[y][x]; };
  const orig = (x, y) => B.map[y][x];
  const flood = (x0, y0, T) => {
    const seen = new Uint8Array(B.w * B.h), q = [x0 + y0 * B.w]; seen[q[0]] = 1;
    while (q.length) {
      const i = q.pop(), x = i % B.w, y = (i / B.w) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy; if (!inMap(nx, ny)) continue;
        const j = nx + ny * B.w; if (seen[j] || TERRAIN[T(nx, ny)].cost.foot >= 99) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return seen;
  };
  const touch = (s, x, y) => s[x + y * B.w] || DIRS.some(([dx, dy]) => inMap(x + dx, y + dy) && s[x + dx + (y + dy) * B.w]);
  const goal = B.def.win.type === 'reach' ? [B.def.win.at] : alive().filter(u => side(u.team) !== 'P').map(u => [u.x, u.y]);
  for (const p of alive()) {
    if (side(p.team) !== 'P' || isFlying(p)) continue;
    const a = flood(p.x, p.y, orig), b = flood(p.x, p.y, get);
    for (const [gx, gy] of goal) if (touch(a, gx, gy) && !touch(b, gx, gy)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// 面板：HUD 天气标签、作战目标 / 地形提示 / 预测里的天气说明
// ---------------------------------------------------------------------
const ICON = {
  clear: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  rain: '<path d="M7 14a4.5 4.5 0 01.6-9 5.5 5.5 0 0110.4 2A3.5 3.5 0 0118 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
  fog: '<path d="M4 8h13M7 12h13M3 16h14M8 20h9"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.5l2 2 2-2M10 19.5l2-2 2 2"/>',
  sand: '<path d="M3 8h12a3 3 0 10-3-3M3 13h16a3 3 0 11-3 3M3 18h7"/>',
  night: '<path d="M19 15.5A8 8 0 019.5 4a8 8 0 109.5 11.5z"/>',
  dusk: '<path d="M4 18h16M7 14a5 5 0 0110 0M12 4v3M5 8l1.8 1.8M19 8l-1.8 1.8"/>',
  ev: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17v.5"/>',
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
function injectCss() {
  if (document.getElementById('wx-css')) return;
  const s = document.createElement('style'); s.id = 'wx-css';
  s.textContent = `
.wx-chip{display:inline-flex;align-items:center;gap:3px;flex:none;padding:1px 8px 1px 5px;border-radius:11px;font:600 11px/17px inherit;font-size:11px;color:#eaf2ff;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.05));border:1px solid rgba(160,200,255,.4);white-space:nowrap;cursor:pointer}
.wx-chip svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.wx-chip.w-rain{color:#a8d4ff}.wx-chip.w-fog{color:#dfe6ee}.wx-chip.w-snow{color:#e4f4ff}.wx-chip.w-sand{color:#ffd690}.wx-chip.w-night{color:#c4b8ff}.wx-chip.w-clear{color:#ffe07a}.wx-chip.w-dusk{color:#ffb070}
.wx-chip .wx-ev{color:#ff9a5a;margin-left:2px}
.wx-line{font-size:12px;color:#cfe6ff;line-height:1.35}.wx-line b{color:#8fd8ff;margin-right:4px}.wx-line.warn b,.wx-line.warn{color:#ffb070}
.ui-hint:has(.wx-line)>.dim{display:none}
.wx-fc{position:absolute;left:50%;top:3px;transform:translateX(-50%);font-size:10.5px;line-height:15px;padding:0 8px;border-radius:8px;background:rgba(8,18,46,.9);border:1px solid rgba(140,200,255,.5);color:#d6ecff;white-space:nowrap;z-index:3;pointer-events:none}
.wx-fc.up{color:#9affb0;border-color:rgba(120,255,160,.5)}.wx-fc.down{color:#ffb0a0;border-color:rgba(255,140,120,.55)}
.wx-modal p{margin:6px 0;line-height:1.5}.wx-modal b{color:#8fd8ff}`;
  document.head.appendChild(s);
}
function hudChip() {
  injectCss();
  const hud = document.getElementById('hud'); if (!hud) return;
  let el = document.getElementById('wx-chip');
  if (!el) {
    el = document.createElement('button'); el.id = 'wx-chip'; el.type = 'button';
    el.addEventListener('click', e => { e.stopPropagation(); showInfo(); });
    hud.insertBefore(el, document.getElementById('hud-turn'));
  }
  if (!live()) { el.hidden = true; return; }
  const X = B.wx, plain = X.w === 'clear' && X.tod === 'day' && !X.ev.length;
  el.hidden = plain;
  if (plain) return;
  const k = X.w !== 'clear' ? X.w : X.tod === 'dusk' ? 'dusk' : 'clear';
  el.className = 'wx-chip w-' + k;
  el.innerHTML = `${svg(k)}<span>${WX[X.w].name}${X.w === 'clear' && X.tod === 'dusk' ? ' · 黄昏' : ''}</span>${X.ev.length ? `<span class="wx-ev">⚠</span>` : ''}`;
}
function effectLines() {
  const X = B.wx, out = [];
  if (X.w !== 'clear') out.push(`<b>${WX[X.w].name}</b>${WX[X.w].short}`);
  else if (X.tod !== 'day') out.push(`<b>晴</b>${TOD_NAME[X.tod]} · 无天气影响`);
  const ats = Object.keys(X.spec.at || {}).filter(t => +t > B.turn);
  if (ats.length && X.w === (X.spec.w || 'clear')) out.push(`<b>预报</b>第 ${ats[0]} 回合起转为「${WX[X.spec.at[ats[0]]].name}」`);
  for (const E of X.ev) out.push(`<b>地形</b>${EV_TEXT[E.d.type](E.d)}`);
  return out;
}
function showInfo() {
  if (!live() || typeof modal !== 'function') return;
  const X = B.wx;
  let body = `<p><b>天气</b>　${WX[X.w].name}${TOD_NAME[X.tod] ? '（' + TOD_NAME[X.tod] + '）' : ''}</p><p>${X.w === 'clear' ? '没有天气影响。' : esc(WX[X.w].fx)}</p>`;
  const ats = Object.keys(X.spec.at || {}).filter(t => +t > B.turn);
  if (ats.length) body += `<p><b>预报</b>　第 ${ats[0]} 回合起转为「${WX[X.spec.at[ats[0]]].name}」</p>`;
  for (const E of X.ev) body += `<p><b>地形</b>　${EV_TEXT[E.d.type](E.d)}。会变化的格子在前一回合以闪烁标记提示；地形伤害不会让角色阵亡。</p>`;
  modal('天气与地形', `<div class="wx-modal">${body}</div>`, [{ label: '确定', value: 1 }], { dismiss: 1 });
}
// 资讯面板画好后补上天气说明（作战目标、地形提示、攻击 / 法术预测）
function wxPanelAfter(info) {
  if (!live() || !info) return;
  const X = B.wx;
  const hint = info.querySelector('.ui-hint');
  if (hint) {
    const lines = [];
    if (hint.querySelector('.win-c')) lines.push(...effectLines());
    else if (B.focusTile) {
      const { x, y } = B.focusTile, k = key(x, y), wk = X.warn.get(k);
      if (wk) lines.push(`<span class="warn"><b>警告</b>${{ lava: '下回合将被熔岩吞没', rocks: '下回合将有落石', flood: '下回合水位变化', bridge: '下回合桥面崩塌', fire: '下回合将被引燃' }[wk]}</span>`);
      if (X.burn.has(k)) lines.push('<span class="warn"><b>燃烧中</b>停留的单位每回合受到灼伤</span>');
      if (X.w === 'snow' && OPEN.includes(tileAt(x, y))) lines.push('<b>雪</b>站在此处的非飞行单位移动力 −1');
      else if (X.w !== 'clear') lines.push(`<b>${WX[X.w].name}</b>${WX[X.w].short}`);
    }
    if (lines.length) hint.insertAdjacentHTML('beforeend', lines.map(l => `<div class="wx-line${l.startsWith('<span class="warn"') ? ' warn' : ''}">${l}</div>`).join(''));
    return;
  }
  const fc = info.querySelector('.fc');
  if (!fc || !B.sel || !B.pending || X.w === 'clear') return;
  const u = B.sel, t = unitAt(B.pending.x, B.pending.y);
  let txt = '', dir = '';
  if (B.mode === 'target' && t) {
    const [m, s] = physMod(u, t);
    txt = s; dir = m > 0 ? 'up' : m < 0 ? 'down' : '';
  } else if (B.mode === 'spell' && SPELLS[B.spell]) {
    const [m, s] = magMod(SPELLS[B.spell]); txt = s; dir = m > 1 ? 'up' : m < 1 ? 'down' : '';
  }
  if (!txt) txt = `${WX[X.w].name} · 不受影响`;
  fc.insertAdjacentHTML('beforeend', `<div class="wx-fc ${dir}">${txt}</div>`);
}

// ---------------------------------------------------------------------
// 绘图：缓存的小贴图（依画面像素大小 s 建立）
// ---------------------------------------------------------------------
const SPR = { s: 0 };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function radial(size, stops) {
  const c = mk(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}
function sprites() {
  const s = Math.round(TS * DPR);
  if (SPR.s === s) return SPR;
  for (const k in SPR) delete SPR[k];
  SPR.s = s;
  SPR.flake = radial(32, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.85)'], [1, 'rgba(255,255,255,0)']]);
  SPR.glow = radial(96, [[0, 'rgba(255,214,140,0.95)'], [0.35, 'rgba(255,170,80,0.45)'], [1, 'rgba(255,140,40,0)']]);
  SPR.fireGlow = radial(64, [[0, 'rgba(255,190,90,0.9)'], [0.5, 'rgba(255,100,30,0.35)'], [1, 'rgba(255,60,0,0)']]);
  // 云影：几团柔和的暗色团块
  { const c = mk(256, 160), g = c.getContext('2d');
    for (let i = 0; i < 9; i++) { const x = 40 + hs(i, 1) * 176, y = 40 + hs(i, 2) * 80, r = 30 + hs(i, 3) * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(18,26,44,0.55)'); gr.addColorStop(1, 'rgba(18,26,44,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160); }
    SPR.cloud = c; }
  // 雾层：可水平平铺的白色雾团
  for (const v of [0, 1]) {
    const W = 320, H = 140, c = mk(W, H), g = c.getContext('2d');
    for (let i = 0; i < 34; i++) {
      const x = hs(i + v * 50, 4) * W, y = 25 + hs(i + v * 50, 5) * (H - 50), r = 18 + hs(i + v * 50, 6) * 34;
      for (const ox of [-W, 0, W]) { const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r); gr.addColorStop(0, 'rgba(236,242,248,0.34)'); gr.addColorStop(1, 'rgba(236,242,248,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y - r, r * 2, r * 2); }
    }
    SPR['fog' + v] = c;
  }
  // 沙尘雾带
  { const W = 320, H = 120, c = mk(W, H), g = c.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = hs(i, 7) * W, y = 20 + hs(i, 8) * 80, r = 20 + hs(i, 9) * 30; for (const ox of [-W, 0, W]) { const gr = g.createRadialGradient(x + ox, y, 0, x + ox, y, r); gr.addColorStop(0, 'rgba(206,150,80,0.5)'); gr.addColorStop(1, 'rgba(206,150,80,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y - r, r * 2, r * 2); } }
    SPR.dust = c; }
  // 水面波光：3 种，每种几道短弧
  SPR.shim = [0, 1, 2].map(v => {
    const c = mk(s, s), g = c.getContext('2d'); g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const x = s * (0.15 + hs(v, i) * 0.6), y = s * (0.2 + hs(v, i + 7) * 0.6), w = s * (0.16 + hs(v, i + 3) * 0.16);
      g.strokeStyle = `rgba(255,255,255,${0.55 + hs(v, i + 9) * 0.35})`; g.lineWidth = Math.max(1, s * 0.035);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - s * 0.04, x + w, y); g.stroke();
    }
    return c;
  });
  // 阳光：从左上斜射的几道光束（低解析度，放大后自然柔和）
  { const W = 128, H = 160, c = mk(W, H), g = c.getContext('2d');
    for (let i = 0; i < 5; i++) {
      const a = 0.42 + i * 0.12 + hs(i, 11) * 0.05, w = 0.03 + hs(i, 12) * 0.04, L = 260;
      const gr = g.createLinearGradient(-20, -30, -20 + Math.cos(a) * L, -30 + Math.sin(a) * L);
      gr.addColorStop(0, 'rgba(255,244,210,0.9)'); gr.addColorStop(0.6, 'rgba(255,236,190,0.25)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-20, -30);
      g.lineTo(-20 + Math.cos(a - w) * L, -30 + Math.sin(a - w) * L); g.lineTo(-20 + Math.cos(a + w) * L, -30 + Math.sin(a + w) * L); g.closePath(); g.fill();
    }
    SPR.rays = c; }
  // 火焰：4 帧
  SPR.flame = [0, 1, 2, 3].map(f => {
    const c = mk(s, s * 1.2), g = c.getContext('2d');
    const tongue = (cx, h, w, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(cx - w, s * 1.1); g.quadraticCurveTo(cx - w * 1.1, s * 1.1 - h * 0.5, cx + (hs(f, cx | 0) - 0.5) * w, s * 1.1 - h); g.quadraticCurveTo(cx + w * 1.1, s * 1.1 - h * 0.5, cx + w, s * 1.1); g.closePath(); g.fill(); };
    for (let i = 0; i < 3; i++) {
      const cx = s * (0.25 + i * 0.25), h = s * (0.45 + hs(f * 3 + i, 21) * 0.4), w = s * 0.13;
      tongue(cx, h, w, 'rgba(255,90,20,0.85)'); tongue(cx, h * 0.7, w * 0.65, 'rgba(255,190,60,0.95)'); tongue(cx, h * 0.38, w * 0.35, 'rgba(255,250,200,0.95)');
    }
    return c;
  });
  return SPR;
}
// 我方视野遮罩：每格 1 像素，放大时自然模糊成柔边
function fogMask() {
  const X = B.wx, R = visR();
  let h = X.mapVer * 7 + X.burn.size * 131 + (X.w === 'night' ? 3 : 1);
  for (const u of B.units) if (u.hp > 0 && side(u.team) === 'P') h = (h * 31 + u.x * 17 + u.y * 257 + u.uid) | 0;
  if (X.fog && X.fog.h === h) return X.fog.c;
  const c = (X.fog && X.fog.c) || mk(B.w, B.h), g = c.getContext('2d'), img = g.createImageData(B.w, B.h);
  const night = X.w === 'night', col = night ? [6, 10, 28, 150] : [196, 206, 216, 150];
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
    if (seenBy('P', x, y, R)) continue;
    const i = (y * B.w + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = col[3];
  }
  g.putImageData(img, 0, 0);
  X.fog = { h, c };
  return c;
}
function tileLists() {
  const X = B.wx;
  if (X.cache && X.cache.v === X.mapVer) return X.cache;
  const water = [], lamps = [];
  for (let y = 0; y < B.h; y++) for (let x = 0; x < B.w; x++) {
    const ch = B.map[y][x];
    if (ch === 'W' || ch === 'T') water.push(x, y);
    if (ch === 'V' || ch === 'A') lamps.push(x, y);
  }
  X.cache = { v: X.mapVer, water, lamps };
  return X.cache;
}

// ---------------------------------------------------------------------
// 地面层（地图之后、单位之前）：调色、波光、云影、灯火、警示格、燃烧的树林
// ---------------------------------------------------------------------
const GRADE_MAP = { dusk: ['multiply', '#ff9a62', 0.62], night: ['multiply', '#4a5694', 0.86] };
const GRADE_WX = { rain: ['multiply', '#9fb0c6', 0.55], sand: ['multiply', '#e8a868', 0.6], fog: ['source-over', '#e4ebf2', 0.16], snow: ['source-over', '#eef4ff', 0.12] };
function wxDrawUnder(g, now, ts) {
  if (!live()) return;
  const X = B.wx;
  if (X.dirty && !AUTO) { X.dirty = false; try { resize(); } catch (e) { } return; }
  const HD = artHD(), W = B.w * ts, H = B.h * ts, t = now / 1000;
  const plain = X.w === 'clear' && X.tod === 'day' && !X.ev.length;
  if (plain && !HD) return;
  g.save();
  // 时段与天气调色（只调地图，单位与范围格保持清楚）
  for (const gr of [GRADE_MAP[X.tod], GRADE_WX[X.w]]) {
    if (!gr) continue;
    g.globalCompositeOperation = gr[0]; g.globalAlpha = gr[2]; g.fillStyle = gr[1]; g.fillRect(0, 0, W, H);
  }
  if (X.tod === 'dusk') { // 黄昏：上暖下紫的天光
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,170,90,0.22)'); gr.addColorStop(1, 'rgba(110,70,150,0.22)');
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  if (HD && !AUTO) {
    const S = sprites(), L = tileLists();
    // 水面波光（雨天改成雨滴涟漪，在上层画）
    if (X.w !== 'rain' && L.water.length) {
      g.globalCompositeOperation = X.tod === 'night' ? 'lighter' : 'source-over';
      const n = Math.min(L.water.length, 360), k = X.tod === 'night' ? 0.35 : 1;
      for (let i = 0; i < n; i += 2) {
        const x = L.water[i], y = L.water[i + 1], ph = hs(x, y) * 6.283;
        const a = (0.12 + 0.3 * Math.max(0, Math.sin(t * 1.3 + ph))) * k;
        if (a < 0.03) continue;
        g.globalAlpha = a;
        g.drawImage(S.shim[(x * 7 + y * 3) % 3], x * ts + Math.sin(t * 0.6 + ph) * ts * 0.08, y * ts, ts, ts);
      }
      g.globalCompositeOperation = 'source-over';
    }
    // 晴天云影（户外）
    if (X.w === 'clear' && !X.indoor && X.tod !== 'night') {
      g.globalAlpha = X.tod === 'dusk' ? 0.16 : 0.26;
      const cw = ts * 7, ch = cw * 0.62;
      for (let i = 0; i < 3; i++) {
        const span = W + cw * 1.5, x = ((hs(i, 31) * span + t * ts * (0.18 + i * 0.05)) % span) - cw, y = (hs(i, 32) * (H + ch)) - ch * 0.6 + Math.sin(t * 0.05 + i) * ts * 0.4;
        g.drawImage(S.cloud, x, y, cw, ch);
      }
      g.globalAlpha = 1;
    }
    // 夜晚 / 黄昏：村庄灯火
    if (X.tod !== 'day' && L.lamps.length) {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < L.lamps.length; i += 2) {
        const x = L.lamps[i], y = L.lamps[i + 1], fl = 0.85 + 0.15 * Math.sin(t * 7 + hs(x, y) * 20) * Math.sin(t * 2.3 + x);
        const r = ts * (X.tod === 'night' ? 2.3 : 1.6) * fl;
        g.globalAlpha = (X.tod === 'night' ? 0.6 : 0.35) * fl;
        g.drawImage(S.glow, (x + 0.5) * ts - r, (y + 0.45) * ts - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
  }
  // 地形事件：警示格（闪烁）与燃烧的树林
  if (X.warn.size) drawWarn(g, now, ts);
  if (X.burn.size) drawBurn(g, now, ts, HD);
  g.restore();
}
const WARN_COL = { lava: [255, 120, 30], rocks: [255, 60, 60], flood: [70, 160, 255], bridge: [255, 80, 60], fire: [255, 140, 40] };
function drawWarn(g, now, ts, top) {
  const p = 0.5 + 0.5 * Math.sin(now / 180);
  for (const [k, kind] of B.wx.warn) {
    const [x, y] = kxy(k), c = WARN_COL[kind] || [255, 80, 60];
    if (!top) { // 地面：闪烁的底色（落石另有逐渐变大的落点阴影）
      g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.28 + p * 0.27})`; g.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
      if (kind === 'rocks') { g.fillStyle = `rgba(20,10,10,${0.3 + p * 0.2})`; g.beginPath(); g.ellipse((x + 0.5) * ts, (y + 0.62) * ts, ts * (0.18 + p * 0.14), ts * (0.08 + p * 0.06), 0, 0, 7); g.fill(); }
      continue;
    }
    // 上层：虚线框与「!」标记，不会被单位挡住
    g.lineWidth = Math.max(2, ts / 12); g.setLineDash([ts / 6, ts / 10]); g.lineDashOffset = -now / 60;
    g.strokeStyle = 'rgba(30,10,0,0.55)'; g.strokeRect(x * ts + 2.5, y * ts + 2.5, ts - 5, ts - 5);
    g.lineWidth = Math.max(1.2, ts / 22);
    g.strokeStyle = `rgba(${Math.min(255, c[0] + 40)},${Math.min(255, c[1] + 90)},${Math.min(255, c[2] + 90)},${0.75 + p * 0.25})`; g.strokeRect(x * ts + 2.5, y * ts + 2.5, ts - 5, ts - 5);
    g.setLineDash([]);
    const bx = (x + 0.8) * ts, by = (y + 0.22) * ts, r = ts * 0.15;
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, ts / 30); g.stroke();
    g.fillStyle = '#fff'; g.font = `900 ${Math.round(ts * 0.24)}px sans-serif`; g.textAlign = 'center'; g.fillText('!', bx, by + ts * 0.085); g.textAlign = 'left';
  }
}
function drawBurn(g, now, ts, HD) {
  const f = Math.floor(now / 110);
  if (!HD) { for (const k of B.wx.burn.keys()) { const [x, y] = kxy(k); g.fillStyle = (f + x + y) % 2 ? 'rgba(255,120,30,0.55)' : 'rgba(255,200,60,0.5)'; g.fillRect(x * ts + ts * 0.15, y * ts + ts * 0.3, ts * 0.7, ts * 0.6); } return; }
  const S = sprites();
  for (const k of B.wx.burn.keys()) {
    const [x, y] = kxy(k);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.55 + 0.2 * Math.sin(now / 90 + x * 3 + y);
    g.drawImage(S.fireGlow, (x - 0.4) * ts, (y - 0.4) * ts, ts * 1.8, ts * 1.8);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.95;
    g.drawImage(S.flame[(f + x * 3 + y) % 4], x * ts, (y - 0.2) * ts, ts, ts * 1.2);
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------------
// 上层（单位之后、血条资讯之前）：视野遮罩、天气粒子、阳光、闪电
// ---------------------------------------------------------------------
function wxDrawOver(g, now, ts) {
  if (!live()) return;
  const X = B.wx, HD = artHD(), W = B.w * ts, H = B.h * ts, t = now / 1000;
  if (X.warn.size) { g.save(); drawWarn(g, now, ts, true); g.restore(); }
  if (X.w === 'clear' && X.tod === 'day' && !(HD && !X.indoor)) return;
  g.save();
  // 夜色也稍微压一点单位亮度，整体才融在一起
  if (X.tod === 'night') { g.globalCompositeOperation = 'multiply'; g.globalAlpha = 0.28; g.fillStyle = '#6a78b8'; g.fillRect(0, 0, W, H); }
  else if (X.tod === 'dusk') { g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 0.25; g.fillStyle = '#ff9050'; g.fillRect(0, 0, W, H); }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  if (visR()) { g.imageSmoothingEnabled = true; g.drawImage(fogMask(), 0, 0, W, H); g.imageSmoothingEnabled = false; }
  if (!AUTO) {
    const S = HD ? sprites() : null, dens = Math.min(1.3, B.w * B.h / 180);
    if (X.w === 'rain') drawRain(g, t, W, H, ts, dens, HD);
    else if (X.w === 'snow') drawSnow(g, t, W, H, ts, dens, S);
    else if (X.w === 'sand') drawSand(g, t, W, H, ts, dens, S);
    if (HD && (X.w === 'fog' || X.w === 'sand')) { // 飘移的雾层 / 沙尘带
      const lay = X.w === 'fog' ? [[S.fog0, 0.75, 0.05, 0.7], [S.fog1, 0.55, 0.42, -0.45]] : [[S.dust, 1, 0.05, 2.2], [S.dust, 0.85, 0.45, 3.1]];
      for (const [tex, a, y0, sp] of lay) {
        const tw = W * 1.4, th = H * 0.62, off = (((t * ts * sp) % tw) + tw) % tw;
        g.globalAlpha = a;
        for (const x of [off - tw, off]) g.drawImage(tex, x, y0 * H, tw, th);
      }
      g.globalAlpha = 1;
    }
    if (HD && X.w === 'clear' && X.tod === 'day' && !X.indoor) { // 阳光
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.1 + 0.04 * Math.sin(t * 0.5);
      g.imageSmoothingEnabled = true; g.drawImage(S.rays, 0, 0, W, H); g.imageSmoothingEnabled = false;
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    if (X.w === 'rain') { // 偶尔的闪电
      const cyc = Math.floor(t / 11), t0 = cyc * 11 + 2 + hs(cyc, 41) * 6, dt = t - t0;
      if (dt > 0 && dt < 0.4 && hs(cyc, 42) < 0.7) {
        const a = dt < 0.08 ? 0.32 : dt > 0.16 && dt < 0.24 ? 0.22 : 0;
        if (a) { g.globalAlpha = a; g.fillStyle = '#eef4ff'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
      }
    }
  }
  g.restore();
}
function drawRain(g, t, W, H, ts, dens, HD) {
  const n = Math.round(90 * dens), len = ts * 0.5, vy = ts * 13, slant = 0.16;
  g.strokeStyle = HD ? 'rgba(214,228,255,0.42)' : 'rgba(190,210,255,0.55)'; g.lineWidth = Math.max(1, ts / 36); g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 0.8 + hs(i, 3) * 0.45, y = ((hs(i, 2) * (H + len) + t * vy * sp) % (H + len)) - len;
    const x = (((hs(i, 1) * W - y * slant) % W) + W) % W;
    g.moveTo(x, y); g.lineTo(x - len * slant, y + len * sp);
  }
  g.stroke();
  // 水花：地面 / 水面上一闪即逝的小圈
  const m = Math.round(16 * dens), P = 0.45;
  g.strokeStyle = 'rgba(220,236,255,0.6)'; g.lineWidth = Math.max(0.8, ts / 48);
  for (let i = 0; i < m; i++) {
    const q = t / P + hs(i, 5), cyc = Math.floor(q), ph = q - cyc;
    const x = hs(i * 977 + cyc, 6) * W, y = hs(i * 613 + cyc, 7) * H, r = ts * (0.05 + ph * 0.18);
    g.globalAlpha = (1 - ph) * 0.8;
    g.beginPath(); g.ellipse(x, y, r, r * 0.4, 0, 0, 7); g.stroke();
  }
  g.globalAlpha = 1;
}
function drawSnow(g, t, W, H, ts, dens, S) {
  const n = Math.round(80 * dens);
  for (let i = 0; i < n; i++) {
    const z = hs(i, 3), sz = ts * (0.07 + z * 0.1), y = ((hs(i, 2) * (H + sz) + t * ts * (0.5 + z * 0.7)) % (H + sz)) - sz;
    const x = (((hs(i, 1) * W + Math.sin(t * (0.6 + z) + i) * ts * 0.35 + t * ts * 0.25) % W) + W) % W;
    if (S) { g.globalAlpha = 0.55 + z * 0.45; g.drawImage(S.flake, x - sz / 2, y - sz / 2, sz, sz); }
    else { g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(Math.round(x), Math.round(y), Math.max(1, sz * 0.6), Math.max(1, sz * 0.6)); }
  }
  g.globalAlpha = 1;
}
function drawSand(g, t, W, H, ts, dens, S) {
  g.fillStyle = 'rgba(214,160,90,0.2)'; g.fillRect(0, 0, W, H);
  const n = Math.round(90 * dens);
  g.strokeStyle = 'rgba(255,236,196,0.7)'; g.lineWidth = Math.max(1, ts / 40); g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = 0.7 + hs(i, 3) * 0.6, L = ts * (0.2 + hs(i, 4) * 0.35);
    const x = ((hs(i, 1) * (W + L) + t * ts * 8 * sp) % (W + L)) - L, y = hs(i, 2) * H + Math.sin(t * 2 + i) * ts * 0.25;
    g.moveTo(x, y); g.lineTo(x + L, y + L * 0.08);
  }
  g.stroke();
}

// ---------------------------------------------------------------------
// 导出
// ---------------------------------------------------------------------
Object.assign(G, { wxStart, wxPhase, wxCalc, wxMov, wxCanTarget, wxHidden, wxFilterUnits, wxDrawUnder, wxDrawOver, wxPanelAfter });
G.WX_DEBUG = { table: WX_STAGE, info: WX, set(w) { if (live()) { B.wx.w = w; B.wx.tod = w === 'night' ? 'night' : B.wx.tod === 'night' ? 'day' : B.wx.tod; B.wx.lit = null; hudChip(); } }, plan, connOk };
})(window);
