// 狂神降世关卡校验：node tools/validate_g4.js js/g4/stages_*.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console };
ctx.window = ctx; vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
load(path.join(root, 'js/data.js'));
vm.runInContext("var CAMPAIGNS = { g2: {}, g3: {}, g4: {} }; var CAMPAIGN_STAGES = {}; var CAMPAIGN_HEROES = {}; var CAMPAIGN_ENDINGS = {};", ctx);
load(path.join(root, 'js/g2/data2.js'));
load(path.join(root, 'js/g3/data3.js'));
load(path.join(root, 'js/g4/data4.js'));
for (const f of process.argv.slice(2)) { try { load(f); } catch (e) { console.log(`语法/运行错误 ${f}: ${e.message}`); process.exit(1); } }
const { TERRAIN, CLASSES, ITEMS, SPELLS } = vm.runInContext('({ TERRAIN, CLASSES, ITEMS, SPELLS })', ctx);
const STAGES = vm.runInContext('CAMPAIGN_STAGES.g4', ctx), HEROES = vm.runInContext('CAMPAIGN_HEROES.g4', ctx);
const KIND_ALIAS = vm.runInContext('KIND_ALIAS', ctx);
let errors = 0, warns = 0;
const err = (s, m) => { errors++; console.log(`✗ [${s.id} ${s.title}] ${m}`); };
const warn = (s, m) => { warns++; console.log(`△ [${s.id} ${s.title}] ${m}`); };
const ids = new Set();
for (const s of STAGES) { if (!s.id || !/^g4_/.test(s.id)) err(s, 'id 必须以 g4_ 开头'); if (ids.has(s.id)) err(s, '重复 id'); ids.add(s.id); }
const moveOf = what => {
  if (what.startsWith('hero:')) { const h = HEROES[what.slice(5)]; return h ? CLASSES[h.cls].tiers[0].move : null; }
  const c = CLASSES[KIND_ALIAS[what] || what]; return c ? c.tiers[0].move : null;
};
const MT = { foot: 'foot', horse: 'horse', fly: 'fly', water: 'water' };
const cost = (m, x, y, mt) => { const t = TERRAIN[m[y][x]]; return t ? t.cost[mt] : 99; };
function flood(m, sx, sy, mt) {
  const h = m.length, w = m[0].length, seen = new Set([sx + ',' + sy]), q = [[sx, sy]];
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || cost(m, nx, ny, mt) >= 99 || seen.has(nx + ',' + ny)) continue; seen.add(nx + ',' + ny); q.push([nx, ny]); } }
  return seen;
}
function checkLines(s, lines, label) {
  if (!Array.isArray(lines)) return err(s, `${label} 不是数组`);
  lines.forEach((l, i) => {
    if (!Array.isArray(l)) return err(s, `${label}[${i}] 格式错误`);
    if (l[0] === 'if') { if (l.length < 3) err(s, `${label}[${i}] if 需要 [\'if\', 条件, 对白]`); checkCond(s, l[1], label); checkLines(s, l[2], label + '.if'); if (l[3]) checkLines(s, l[3], label + '.else'); return; }
    if (l[0] === 'do') { checkFx(s, l[1], label); return; }
    if (l[0] === '?') { if (typeof l[1] !== 'string' || !Array.isArray(l[2]) || l[2].length < 2) err(s, `${label}[${i}] 选项格式错误`); for (const o of l[2] || []) { if (!o.label) err(s, `${label}[${i}] 选项缺 label`); checkFx(s, o, label); if (o.say) checkLines(s, o.say, label + '.say'); } return; }
    if (l.length < 2 || typeof l[1] !== 'string') return err(s, `${label}[${i}] 格式错误`);
    const p = l[2];
    if (p && !(HEROES[p] || (p.startsWith('enemy:') && CLASSES[KIND_ALIAS[p.slice(6)] || p.slice(6)]))) err(s, `${label}[${i}] 头像 id 无效: ${p}`);
  });
}
function checkCond(s, c, label) {
  if (!c) return;
  if (Array.isArray(c)) return c.forEach(x => checkCond(s, x, label));
  if (c.rel) for (const id of Object.keys(c.rel)) if (!HEROES[id]) err(s, `${label} 条件 rel 未知英雄 ${id}`);
  if (c.has && !HEROES[c.has]) err(s, `${label} 条件 has 未知英雄 ${c.has}`);
  if (c.item && !ITEMS[c.item]) err(s, `${label} 条件 item 未知道具 ${c.item}`);
  if (c.not) checkCond(s, c.not, label);
}
function checkFx(s, e, label) {
  if (!e) return;
  for (const id of Object.keys(e.rel || {})) if (!HEROES[id]) err(s, `${label} rel 未知英雄 ${id}`);
  for (const id of [...(e.join || []), ...(e.leave || [])]) if (!HEROES[id]) err(s, `${label} join/leave 未知英雄 ${id}`);
  for (const id of Object.keys(e.item || {})) if (!ITEMS[id]) err(s, `${label} item 未知道具 ${id}`);
  for (const [id, st] of Object.entries(e.stat || {})) { if (!HEROES[id]) err(s, `${label} stat 未知英雄 ${id}`); for (const k of Object.keys(st)) if (!['hp', 'mp', 'atk', 'def', 'mag', 'spd'].includes(k)) err(s, `${label} stat 未知能力 ${k}`); }
  for (const [id, l] of Object.entries(e.perk || {})) { if (!HEROES[id]) err(s, `${label} perk 未知英雄 ${id}`); }
  for (const [id, l] of Object.entries(e.learn || {})) { if (!HEROES[id]) err(s, `${label} learn 未知英雄 ${id}`); for (const k of [].concat(l)) if (!SPELLS[k]) err(s, `${label} learn 未知招式 ${k}`); }
  if (e.if) checkCond(s, e.if, label);
}
for (const s of STAGES) {
  const m = s.map;
  if (!Array.isArray(m) || !m.length) { err(s, '缺少 map'); continue; }
  const w = m[0].length, h = m.length;
  if (w < 10 || w > 14) err(s, `地图宽 ${w}，应为 10–14`);
  if (h < 12 || h > 18) err(s, `地图高 ${h}，应为 12–18`);
  let bad = false;
  m.forEach((r, y) => { if (r.length !== w) { err(s, `第 ${y} 行宽度 ${r.length} ≠ ${w}`); bad = true; } for (const c of r) if (!TERRAIN[c]) { err(s, `未知地形 '${c}' (行 ${y})`); bad = true; } });
  if (bad) continue;
  if (s.heights) { if (s.heights.length !== h || s.heights.some(r => r.length !== w || /[^0-3]/.test(r))) err(s, 'heights 必须与地图同尺寸、只含 0-3'); }
  if (typeof s.no !== 'number') err(s, '缺少 no');
  if (typeof s.level !== 'number') err(s, '缺少 level（本关敌兵参考等级）');
  const inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const occ = new Map();
  const place = (x, y, who, mt) => { if (!inb(x, y)) return err(s, `${who} 坐标越界 (${x},${y})`); if (cost(m, x, y, mt) >= 99) err(s, `${who} 位于不可通行地形 ${m[y][x]} (${x},${y})`); const k = x + ',' + y; if (occ.has(k)) err(s, `${who} 与 ${occ.get(k)} 重叠 (${x},${y})`); occ.set(k, who); };
  for (const id of s.heroes || []) if (!HEROES[id]) err(s, `未知英雄 ${id}`); else if (HEROES[id].npc) err(s, `${id} 是剧情人物，不能出战`);
  if (!(s.required || []).includes('kehelin')) err(s, 'required 必须包含 kehelin');
  if (!(s.heroes || []).includes('kehelin')) err(s, 'heroes 必须包含 kehelin');
  for (const id of s.required || []) if (!(s.heroes || []).includes(id)) err(s, `required ${id} 不在 heroes`);
  if (!(s.maxDeploy >= 1 && s.maxDeploy <= 10)) err(s, 'maxDeploy 应在 1–10');
  if (!Array.isArray(s.start) || s.start.length < s.maxDeploy) err(s, 'start 数量少于 maxDeploy');
  (s.start || []).forEach(([x, y], i) => place(x, y, `出生点${i}`, 'foot'));
  let bosses = 0;
  const heroUnits = [];
  for (const [i, u] of (s.units || []).entries()) {
    const mt = moveOf(u[0]); if (!mt) { err(s, `units[${i}] 未知兵种 ${u[0]}`); continue; }
    const o = u[4] || {};
    if (!['enemy', 'ally', 'rogue'].includes(o.team)) err(s, `units[${i}] team 必须是 enemy/ally/rogue`);
    if (o.boss) bosses++;
    if (o.transform && !CLASSES[o.transform.to]) err(s, `units[${i}] transform.to 未知兵种 ${o.transform.to}`);
    if (u[0].startsWith('hero:')) heroUnits.push(u[0].slice(5));
    if (typeof u[1] !== 'number' || u[1] < 1 || u[1] > 45) err(s, `units[${i}] 等级异常`);
    place(u[2], u[3], `units[${i}](${o.name || u[0]})`, mt);
  }
  for (const ev of s.events || []) {
    if (!(ev.turn >= 1)) err(s, 'event 缺少 turn');
    checkCond(s, ev.if, 'event.if'); checkFx(s, ev.effects, 'event.effects');
    for (const [i, u] of (ev.spawn || []).entries()) {
      const mt = moveOf(u[0]); if (!mt) { err(s, `event spawn[${i}] 未知兵种 ${u[0]}`); continue; }
      if (!inb(u[2], u[3]) || cost(m, u[2], u[3], mt) >= 99) err(s, `event spawn[${i}] 位置不可用 (${u[2]},${u[3]})`);
      if ((u[4] || {}).boss) bosses++;
    }
    if (ev.dialog) checkLines(s, ev.dialog, `event(turn ${ev.turn})`);
  }
  for (const [i, c] of (s.chests || []).entries()) { if (c[4] && !['hidden', 'locked'].includes(c[4])) err(s, `chests[${i}] 第 5 项只能是 'hidden' 或 'locked'`); if (!ITEMS[c[2]]) err(s, `chests[${i}] 未知道具 ${c[2]}`); if (!inb(c[0], c[1]) || cost(m, c[0], c[1], 'foot') >= 99) err(s, `chests[${i}] 不可到达`); }
  for (const id of s.shop || []) if (!ITEMS[id]) err(s, `shop 未知道具 ${id}`);
  const win = s.win || {};
  if (!['rout', 'boss', 'reach'].includes(win.type)) err(s, `win.type 无效`);
  if (win.type === 'boss' && bosses !== 1) err(s, `boss 胜利需要恰好 1 个 boss（现有 ${bosses}）`);
  if (win.type === 'reach' && (!Array.isArray(win.at) || !inb(win.at[0], win.at[1]) || !win.label)) err(s, 'reach 需要 at 与 label');
  for (const id of (s.lose || {}).units || []) if (!(s.heroes || []).includes(id) && !heroUnits.includes(id)) err(s, `lose.units ${id} 不在本关`);
  checkLines(s, s.intro || [], 'intro'); checkLines(s, s.outro || [], 'outro');
  if (!(s.intro || []).length) err(s, 'intro 为空');
  checkFx(s, s.onWin, 'onWin');
  // 路线
  const nx = s.next;
  const tos = nx === undefined ? [] : typeof nx === 'string' ? [nx] : nx.map(o => o.to);
  if (nx === undefined) err(s, '缺少 next');
  for (const t of tos) if (t !== 'END' && t !== 'RETURN' && !ids.has(t)) warn(s, `next 指向尚未存在的关卡 ${t}`);
  if (Array.isArray(nx)) for (const o of nx) { checkCond(s, o.if, 'next'); checkFx(s, o, 'next'); }
  if (s.secret) { if (!inb(s.secret.at[0], s.secret.at[1]) || cost(m, s.secret.at[0], s.secret.at[1], 'foot') >= 99) err(s, 'secret.at 不可到达'); if (!ids.has(s.secret.to)) warn(s, `secret 指向尚未存在的关卡 ${s.secret.to}`); }
  if (s.start && s.start[0]) {
    const reach = flood(m, s.start[0][0], s.start[0][1], 'foot');
    for (const u of s.units || []) { const mt = moveOf(u[0]); if (!mt || (u[4] || {}).team === 'ally') continue; const adj = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]; if (!adj.some(([dx, dy]) => reach.has((u[2] + dx) + ',' + (u[3] + dy)))) err(s, `步兵无法接近 ${(u[4] || {}).name || u[0]} (${u[2]},${u[3]})`); }
    if (win.type === 'reach' && win.at && !reach.has(win.at.join(','))) err(s, 'reach 目标不可达');
    if (s.secret && !reach.has(s.secret.at.join(','))) err(s, 'secret 对步兵不可达');
  }
  if (typeof s.reward !== 'number') err(s, '缺少 reward');
}
console.log(`\n共 ${STAGES.length} 关：${errors} 个错误，${warns} 个提醒`);
process.exit(errors ? 1 : 0);
