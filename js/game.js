// 超时空英雄传说 · 移动重制版 —— 存档、营地、出击、剧情流程、结局
'use strict';

const saveKey = () => curCampaign().saveKey;
const OPT_KEY = 'cskyxcs_opt_v1';
let S = null; // { stage, gold, roster: {id: data}, order: [id], inv: {itemId: n}, cleared }


function newSave() { S = { stage: 0, gold: 150, roster: {}, order: [], inv: { herb: 3 }, flags: {}, rel: {}, left: {} }; }
function persist() { try { localStorage.setItem(saveKey(), JSON.stringify(S)); } catch (e) { /* 隐私模式等 */ } }
function readSave() {
  try { const s = JSON.parse(localStorage.getItem(saveKey())); if (s && s.roster) return s; } catch (e) { }
  return null;
}
function loadOpt() { try { Object.assign(OPT, JSON.parse(localStorage.getItem(OPT_KEY)) || {}); } catch (e) { } }
function saveOpt() { try { localStorage.setItem(OPT_KEY, JSON.stringify(OPT)); } catch (e) { } }

// =====================================================================
// 关卡流程
// =====================================================================
function defaultDeploy(st) {
  const pick = st.required.filter(id => !(S.left || {})[id]);
  for (const id of S.order) if (pick.length < st.maxDeploy && st.heroes.includes(id) && !pick.includes(id) && !(S.left || {})[id]) pick.push(id);
  return pick;
}
function prepareStage(idx) {
  const st = STAGES[idx];
  // 二代起：英雄由剧情 join 加入，这里只确保必须出战的角色在队中
  for (const id of st.id ? st.required : st.heroes) if (!(S.left || {})[id]) ensureHero(id);
}
// 关卡之后去哪里：一代依序；二代起可分支（选项 / 条件）、隐藏关、回到主线
function stageIndexById(id) { return STAGES.findIndex(s => s.id === id); }
async function resolveNext(st, idx) {
  let nx = st.next;
  if (nx === undefined) return idx + 1;
  if (nx === 'END') return STAGES.length;
  if (nx === 'RETURN') { const r = S.ret ?? idx + 1; delete S.ret; return r; }
  if (typeof nx === 'string') return stageIndexById(nx);
  const opts = nx.filter(o => condOk(o.if));
  if (!opts.length) return idx + 1;
  let o = opts[0];
  if (opts.length > 1 && opts.some(o => o.label)) {
    if (AUTO) o = opts.find(o => o.auto) || opts[0];
    else { const v = await modal('前进的方向', `<p class="center">${esc(st.ask || '接下来要往哪里去？')}</p>`, opts.map((o, i) => ({ label: esc(o.label), value: String(i), cls: i ? '' : 'primary' }))); o = opts[+v || 0]; }
  }
  applyEffects(o);
  return o.to === 'END' ? STAGES.length : stageIndexById(o.to);
}

async function runStage(idx, opts) {
  opts = opts || {};
  prepareStage(idx);
  const st = STAGES[idx];
  const snapshot = JSON.stringify(S);
  const deploy = opts.deploy || defaultDeploy(st);
  if (!opts.skipIntro) { show('battle'); music('story'); await chapterCard(st); }
  startBattle(idx, deploy);
  if (!opts.skipIntro) await dialog(st.intro);
  if (!AUTO) { const o = objectiveText(); await banner('胜利：' + o.win, '失败：' + o.lose); }
  const result = await battleLoop();
  if (result === 'abort') return;
  if (result === 'win') {
    music('victory');
    await banner('胜 利', st.title, 'win');
    music('story');
    await dialog(st.outro);
    // 回写成长；中途加入（team player）的英雄正式入队
    for (const u of B.units) {
      if (!u.id || u.team !== 'player') continue;
      ensureHero(u.id);
      for (const f of PERSIST_FIELDS) S.roster[u.id][f] = u[f];
    }
    S.gold += st.reward || 0;
    if (st.id) (S.done = S.done || []).push(st.id);
    applyEffects(st.onWin);
    let nx = await resolveNext(st, idx);
    if (B.secretFound && st.secret) { S.ret = nx; nx = stageIndexById(st.secret.to); }
    S.stage = nx < 0 ? STAGES.length : nx;
    persist();
    if (S.stage >= STAGES.length) return showEnding();
    if (AUTO) return 'win';
    await modal('战斗结算', `<p class="center">获得奖励金 <b class="gold">${st.reward || 0} G</b></p>${(st.shop || []).length ? `<p class="center dim small">商店新增：${st.shop.map(i => ITEMS[i].name).join('、')}</p>` : ''}`, [{ label: '前往营地', value: 1, cls: 'primary' }]);
    return showCamp();
  }
  music('defeat');
  if (AUTO) { S = JSON.parse(snapshot); return 'lose'; }
  await banner('战 败', '', 'lose');
  const v = await modal('战斗失败', '<p class="center">胜败乃兵家常事，大侠请重新来过。</p>', [
    { label: '重新挑战', value: 'retry', cls: 'primary' }, { label: '返回营地', value: 'camp' }, { label: '返回标题', value: 'title' }]);
  S = JSON.parse(snapshot);
  if (v === 'retry') return runStage(idx, { skipIntro: true, deploy });
  if (v === 'camp' && idx > 0) return showCamp();
  return showTitle();
}

async function chapterCard(st) {
  if (AUTO) return;
  const c = $('#chapter-card');
  c.innerHTML = `<div>${st.part ? `<small class="cc-part">${esc(st.part)}</small>` : ''}<small>${st.secretStage ? '隐藏关' : `第 ${st.no} 关`}</small>${esc(st.title)}</div>`;
  c.hidden = false; c.classList.add('on');
  await sleep(1700);
  c.classList.remove('on'); await sleep(300); c.hidden = true;
}

async function battleMenu() {
  sfx('select');
  const v = await modal('菜单', '', [
    { label: '继续游戏', value: 'back', cls: 'primary' },
    { label: `音乐：${OPT.music ? '开' : '关'}`, value: 'music' },
    { label: `音效：${OPT.sound ? '开' : '关'}`, value: 'sound' },
    { label: `战斗速度：${OPT.fast ? '快' : '标准'}`, value: 'fast' },
    { label: `战斗画面：${OPT.anim ? '开' : '关'}`, value: 'anim' },
    { label: `难度：${OPT.easy ? '简单' : '标准'}（下次进入战斗生效）`, value: 'easy' },
    { label: '重新开始本关', value: 'restart' },
    { label: '返回营地', value: 'camp' },
    { label: '返回标题', value: 'title' },
  ], { dismiss: 'back' });
  if (v === 'sound') { OPT.sound = !OPT.sound; saveOpt(); return battleMenu(); }
  if (v === 'music') { OPT.music = !OPT.music; saveOpt(); music(battleTheme(B && B.phase)); return battleMenu(); }
  if (v === 'fast') { OPT.fast = !OPT.fast; saveOpt(); return battleMenu(); }
  if (v === 'anim') { OPT.anim = !OPT.anim; saveOpt(); return battleMenu(); }
  if (v === 'easy') { OPT.easy = !OPT.easy; saveOpt(); return battleMenu(); }
  if (['restart', 'camp', 'title'].includes(v)) {
    const ok = await modal('确认', '<p class="center">当前战斗进度将会丢失，确定吗？</p>', [{ label: '确定', value: 1, cls: 'red' }, { label: '取消', value: 0 }]);
    if (!ok) return;
    const idx = B.idx;
    abortBattle();
    S = readSave() || (newSave(), S);
    if (v === 'restart') return runStage(idx, { skipIntro: true });
    if (v === 'camp' && S.stage > 0) return showCamp();
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
function shopStock() {
  const c = curCampaign();
  if (c.shopBase) { // 二代起：基本商品 + 已通过关卡解锁的商品
    const list = c.shopBase.slice();
    for (const id of S.done || []) { const st = STAGES.find(s => s.id === id); for (const it of (st && st.shop) || []) if (!list.includes(it)) list.push(it); }
    return list.filter(id => ITEMS[id] && ITEMS[id].price > 0);
  }
  const list = SHOP_BASE.slice();
  for (const [n, id] of SHOP_UNLOCK) if (S.stage >= n && !list.includes(id)) list.push(id);
  for (let i = 0; i < S.stage; i++) for (const id of STAGES[i].shop || []) if (!list.includes(id) && ITEMS[id].price) list.push(id);
  return list.filter(id => ITEMS[id].price > 0);
}
function itemDesc(it) {
  if (it.desc && it.type !== 'acc') return it.desc;
  const parts = [];
  if (it.atk) parts.push(`攻击 +${it.atk}`);
  if (it.mag) parts.push(`魔力 +${it.mag}`);
  if (it.def) parts.push(`防御 +${it.def}`);
  if (it.hit) parts.push(`命中 ${it.hit > 0 ? '+' : ''}${it.hit}`);
  if (it.crit) parts.push(`暴击 +${it.crit}`);
  if (it.mov) parts.push(`移动 +${it.mov}`);
  if (it.spd) parts.push(`敏捷 +${it.spd}`);
  if (it.immune) parts.push('免疫中毒、石化');
  const kind = { sword: '剑', blade: '刀', lance: '枪', bow: '弓', staff: '杖', axe: '斧', claw: '爪' }[it.kind];
  return parts.join(' · ') + (kind ? `（${kind}）` : it.type === 'acc' ? '（饰品）' : it.type === 'armor' ? '（防具）' : '');
}
function showCamp() {
  B = null;
  show('camp');
  music('camp');
  prepareStage(Math.min(S.stage, STAGES.length - 1));
  renderCamp();
}
function renderCamp() {
  const next = STAGES[S.stage];
  $('#camp-next').textContent = next ? `第 ${next.no} 关 · ${next.title}` : '';
  $('#camp-gold').textContent = S.gold + ' G';
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('on', t.dataset.tab === campTab);
  const body = $('#camp-body');
  if (campTab === 'party') {
    body.innerHTML = S.order.map(id => {
      const d = S.roster[id], u = Object.assign({ status: {}, buffs: [] }, d);
      const away = next && !next.heroes.includes(id);
      const sk = skillsOf(u).map(s => SPELLS[s].name).join('、') || '—';
      return `<div class="card ${away ? 'away' : ''}">
        <div class="card-top"><div class="port" data-hero="${id}"></div>
          <div><b>${esc(d.name)}</b> <span class="dim">${className(u)} Lv${d.lv}</span>${(S.rel || {})[id] !== undefined ? ` <span class="rel">♥ ${S.rel[id]}</span>` : ''}${(S.left || {})[id] ? ' <span class="tag t-away">已离队</span>' : ''}${away ? ' <span class="tag t-away">本关不在队中</span>' : ''}<br>
          <span class="small">HP ${d.mhp} · MP ${d.mmp} · 攻 ${atkOf(u)} · 防 ${defOf(u)} · 魔 ${magOf(u)} · 速 ${spdOf(u)} · 移 ${movOf(u)}</span><br>
          <span class="small dim">EXP ${d.exp}/100 · ${CLASSES[d.cls].line} · ${typeOf(u)}</span></div></div>
        <p class="small skills">技能：${sk}</p>
        <div class="card-btns">
          ${CLASSES[d.cls].weapon ? `<button class="btn small" data-equip="${id}" data-slot="weapon">武器：${d.weapon ? ITEMS[d.weapon].name : '无'}</button>` : ''}
          <button class="btn small" data-equip="${id}" data-slot="armor">防具：${d.armor ? ITEMS[d.armor].name : '无'}</button>
          <button class="btn small" data-equip="${id}" data-slot="acc">饰品：${d.acc ? ITEMS[d.acc].name : '无'}</button>
          ${ruleOn('freeClass') && d.lv >= 11 ? `<button class="btn small primary" data-reclass="${id}">转职所</button>` : ''}
          <button class="btn small purple" data-tree="${id}">职业树${CLASSES[d.cls].alt && !d.path && d.tier >= CLASSES[d.cls].alt.at ? ' ⚑' : ''}</button>
        </div>
        <p class="small dim bio">${HEROES[id].bio}</p>
      </div>`;
    }).join('');
    for (const p of body.querySelectorAll('[data-hero]')) { const c = portraitCanvas(p.dataset.hero, 52); if (c) p.appendChild(c); }
  } else if (campTab === 'items') {
    const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0);
    body.innerHTML = ids.length ? ids.map(id => {
      const it = ITEMS[id];
      const canUse = it.type === 'use' && it.stat;
      const sell = it.price ? Math.floor(it.price / 2) : 0;
      return `<div class="row-item"><div><b>${it.name}</b> ×${S.inv[id]}<br><span class="small dim">${itemDesc(it)}</span></div>
        <div>${canUse ? `<button class="btn small primary" data-use="${id}">使用</button>` : ''}${sell ? `<button class="btn small" data-sell="${id}">卖 ${sell}G</button>` : ''}</div></div>`;
    }).join('') : '<p class="center dim">背包空空如也</p>';
  } else {
    body.innerHTML = shopStock().map(id => {
      const it = ITEMS[id];
      return `<div class="row-item"><div><b>${it.name}</b> <span class="dim small">持有 ${S.inv[id] || 0}</span><br><span class="small dim">${itemDesc(it)}</span></div>
        <button class="btn small ${S.gold >= it.price ? 'primary' : ''}" data-buy="${id}" ${S.gold >= it.price ? '' : 'disabled'}>${it.price} G</button></div>`;
    }).join('');
  }
}
// 职业树：共同阶段 → 分支 A / B（目前路线高亮）
function treeHtml(d) {
  const C = CLASSES[d.cls], u = Object.assign({ status: {}, buffs: [] }, d);
  const node = (t, i, p) => {
    const cur = d.tier === i && (!C.alt || i < C.alt.at || (d.path || 'a') === p);
    const off = C.alt && i >= C.alt.at && d.path && d.path !== p;
    return `<span class="tn ${cur ? 'cur' : ''} ${off ? 'off' : ''}">${esc(t.name)} <span class="lv">Lv${t.lv}</span></span>`;
  };
  if (!C.alt) return `<div class="tree-row">${C.tiers.map((t, i) => node(t, i)).join('→')}</div><p class="small dim">此职业没有分支。</p>`;
  const at = C.alt.at, shared = C.tiers.slice(0, at).map((t, i) => node(t, i)).join('→');
  const row = p => {
    const I = pathInfo(C, p), list = p === 'b' ? C.alt.tiers : C.tiers.slice(at);
    return `<div class="tree-row"><b class="${(d.path || (d.tier >= at ? 'a' : '')) === p ? 'gold' : 'dim'}">${p.toUpperCase()} · ${esc(I.label)}</b></div>
      <div class="tree-row">${list.map((t, i) => node(t, at + i, p)).join('→')}</div>
      <div class="small dim">${esc(I.focus)} · ${esc(I.desc)}</div><div class="pc-skills" style="justify-content:flex-start;margin:3px 0 8px">${I.skills.map(s => `<span>${esc(s)}</span>`).join('')}</div>`;
  };
  return `<div class="tree-row">${shared} →</div><div class="tree-branch">${row('a')}${row('b')}</div>
    <p class="small dim">${d.path ? '已选定路线。' : d.tier >= at ? '尚未选择路线（目前视为 A），可在此选择一次。' : `到达 Lv ${branchLv(C)} 转职时选择路线。`}</p>`;
}
// 二代起的自由转职：Lv11 以上可转为其他职业，等级回到 1，保留能力值与已学会的招式
function reclassPool(d) {
  const c = curCampaign(), h = HEROES[d.id] || {};
  return [...new Set([...(h.lines || []), ...(c.classPool || [])])].filter(k => CLASSES[k] && k !== d.cls && (!CLASSES[k].sex || CLASSES[k].sex === (h.sex || 'm')));
}
$('#camp').addEventListener('click', async e => {
  const rc = e.target.closest('[data-reclass]');
  if (rc) {
    const id = rc.dataset.reclass, d = S.roster[id];
    sfx('select');
    const pool = reclassPool(d);
    const html = pool.map(k => { const C = CLASSES[k]; return `<button class="pick" data-pick="${k}"><b>${esc(C.tiers[0].name)}</b><span>${esc(C.line)}</span><small>${C.tiers.map(t => esc(t.name)).join(' → ')}</small></button>`; }).join('');
    const k = await modal(`${esc(d.name)} · 转职所`, `<p class="dim small">转职后等级回到 Lv1（能力值保留），已学会的招式全部保留，可以一直循环转职。</p><div class="pick-list">${html}</div>`, [{ label: '取消', value: null }], { dismiss: null, wide: true });
    if (!k) return;
    const u = Object.assign({ status: {}, buffs: [] }, d);
    d.learned = [...new Set([...(d.learned || []), ...skillsOf(u)])];
    Object.assign(d, { cls: k, lv: 1, exp: 0, tier: 0, path: undefined });
    const u2 = Object.assign({ status: {}, buffs: [] }, d);
    if (d.weapon && !canUseWeapon(u2, d.weapon)) { S.inv[d.weapon] = (S.inv[d.weapon] || 0) + 1; d.weapon = null; }
    sfx('promote'); toast(`${d.name} 转职为「${CLASSES[k].tiers[0].name}」`); persist();
    return renderCamp();
  }
  const tr = e.target.closest('[data-tree]');
  if (tr) {
    const id = tr.dataset.tree, d = S.roster[id], C = CLASSES[d.cls];
    sfx('select');
    const canChoose = C.alt && !d.path && d.tier >= C.alt.at;
    const btns = canChoose ? [{ label: '选 A 路线', value: 'a' }, { label: '选 B 路线', value: 'b', cls: 'primary' }, { label: '关闭', value: null }] : [{ label: '关闭', value: null }];
    const r = await modal(`${esc(d.name)} · 职业树`, treeHtml(d), btns, { wide: true, dismiss: null });
    if (canChoose && (r === 'a' || r === 'b')) {
      d.path = r;
      if (r === 'b') { const u = Object.assign({ status: {}, buffs: [] }, d); if (d.weapon && !canUseWeapon(u, d.weapon)) d.weapon = null; }
      toast(`${d.name} 走上了「${pathInfo(C, r).label}」`); persist();
    }
    return renderCamp();
  }
  const t = e.target.closest('.tab');
  if (t) { sfx('select'); campTab = t.dataset.tab; return renderCamp(); }
  const buy = e.target.closest('[data-buy]');
  if (buy) { const it = ITEMS[buy.dataset.buy]; if (S.gold >= it.price) { S.gold -= it.price; S.inv[buy.dataset.buy] = (S.inv[buy.dataset.buy] || 0) + 1; sfx('chest'); toast(`购买了 ${it.name}`); persist(); renderCamp(); } return; }
  const sell = e.target.closest('[data-sell]');
  if (sell) { const id = sell.dataset.sell; S.gold += Math.floor(ITEMS[id].price / 2); if (--S.inv[id] <= 0) delete S.inv[id]; sfx('select'); persist(); return renderCamp(); }
  const use = e.target.closest('[data-use]');
  if (use) {
    const id = use.dataset.use;
    const list = S.order.map(h => `<button class="pick" data-pick="${h}"><b>${S.roster[h].name}</b><small>HP ${S.roster[h].mhp} MP ${S.roster[h].mmp} 攻 ${S.roster[h].atk} 魔 ${S.roster[h].mag}</small></button>`).join('');
    const who = await modal(`使用 ${ITEMS[id].name}`, `<div class="pick-list">${list}</div>`, [{ label: '取消', value: null }], { dismiss: null });
    if (!who) return;
    for (const k in ITEMS[id].stat) S.roster[who][k] += ITEMS[id].stat[k];
    if (--S.inv[id] <= 0) delete S.inv[id];
    sfx('levelup'); toast(`${S.roster[who].name} 的能力提升了！`); persist(); return renderCamp();
  }
  const eq = e.target.closest('[data-equip]');
  if (eq) {
    const id = eq.dataset.equip, slot = eq.dataset.slot, d = S.roster[id];
    const opts = Object.keys(S.inv).filter(i => S.inv[i] > 0 && ITEMS[i].type === slot && (slot !== 'weapon' || canUseWeapon(d, i)));
    const list = opts.map(i => `<button class="pick" data-pick="${i}"><b>${ITEMS[i].name}</b><small>${itemDesc(ITEMS[i])}</small></button>`).join('')
      + (d[slot] ? `<button class="pick" data-pick="__none"><b>卸下</b><small>${ITEMS[d[slot]].name}</small></button>` : '');
    const label = { weapon: '武器', armor: '防具', acc: '饰品' }[slot];
    const pick = await modal(`${d.name} 的${label}`, `<div class="pick-list">${list || '<p class="center dim">没有可装备的物品</p>'}</div>`, [{ label: '取消', value: null }], { dismiss: null });
    if (!pick) return;
    if (d[slot]) S.inv[d[slot]] = (S.inv[d[slot]] || 0) + 1;
    if (pick === '__none') d[slot] = null;
    else { d[slot] = pick; if (--S.inv[pick] <= 0) delete S.inv[pick]; }
    persist(); return renderCamp();
  }
});
$('#camp-go').addEventListener('click', async () => {
  sfx('select');
  const st = STAGES[S.stage];
  const deploy = await chooseDeploy(st);
  if (deploy) runStage(S.stage, { deploy });
});
$('#camp-title').addEventListener('click', () => { sfx('select'); persist(); showTitle(); });
$('#camp-auto').addEventListener('click', () => { sfx('chest'); const n = autoEquip(); toast(n ? `已为 ${n} 名角色换上最强装备` : '装备已是最佳'); persist(); renderCamp(); });

// 自动装备：为每位角色（优先本关出战者）换上背包里最强的武器 / 防具 / 饰品
const gearScore = (d, id, slot) => { const it = ITEMS[id]; if (!it) return 0; return slot === 'weapon' ? (it.atk || 0) + (['mage', 'priest', 'sorcerer'].includes(d.cls) ? (it.mag || 0) * 2 : 0) + (it.hit || 0) / 5 : (it.def || 0) + (it.mag || 0) + (it.atk || 0) + (it.mov || 0) * 4 + (it.spd || 0); };
function autoEquip() {
  let changed = 0;
  const next = STAGES[S.stage], order = S.order.slice().sort((a, b) => (next && next.heroes.includes(b) ? 1 : 0) - (next && next.heroes.includes(a) ? 1 : 0));
  for (const id of order) {
    const d = S.roster[id];
    for (const slot of ['weapon', 'armor', 'acc']) {
      if (slot === 'weapon' && !CLASSES[d.cls].weapon) continue;
      const opts = Object.keys(S.inv).filter(i => S.inv[i] > 0 && ITEMS[i].type === slot && (slot !== 'weapon' || canUseWeapon(d, i)));
      const best = opts.sort((a, b) => gearScore(d, b, slot) - gearScore(d, a, slot))[0];
      if (best && gearScore(d, best, slot) > gearScore(d, d[slot], slot)) {
        if (d[slot]) S.inv[d[slot]] = (S.inv[d[slot]] || 0) + 1;
        d[slot] = best; if (--S.inv[best] <= 0) delete S.inv[best];
        changed++;
      }
    }
  }
  return changed;
}
// 测试用：像玩家一样在营地采购（每人买得起的最好武器与防具，再补药草）
function autoShop() {
  const stock = shopStock();
  for (const id of S.order) {
    const d = S.roster[id];
    for (const slot of ['weapon', 'armor']) {
      if (slot === 'weapon' && !CLASSES[d.cls].weapon) continue;
      const cands = stock.filter(i => ITEMS[i].type === slot && (slot !== 'weapon' || canUseWeapon(d, i)) && ITEMS[i].price <= S.gold * 0.4)
        .sort((a, b) => gearScore(d, b, slot) - gearScore(d, a, slot));
      if (cands[0] && gearScore(d, cands[0], slot) > gearScore(d, d[slot], slot)) { S.gold -= ITEMS[cands[0]].price; S.inv[cands[0]] = (S.inv[cands[0]] || 0) + 1; }
    }
  }
  while (S.gold > 300 && (S.inv.healLeaf || 0) < 6 && stock.includes('healLeaf')) { S.gold -= ITEMS.healLeaf.price; S.inv.healLeaf = (S.inv.healLeaf || 0) + 1; }
  autoEquip();
}

// 出击人员选择
async function chooseDeploy(st) {
  const avail = S.order.filter(id => st.heroes.includes(id) && !(S.left || {})[id]);
  if (avail.length <= st.maxDeploy && avail.length === st.heroes.length) return avail;
  const sel = new Set(defaultDeploy(st));
  const row = id => {
    const d = S.roster[id], req = st.required.includes(id), on = sel.has(id);
    return `<button class="deploy ${on ? 'on' : ''} ${req ? 'req' : ''}" data-dep="${id}"><span class="dp" data-hero="${id}"></span><b>${esc(d.name)}</b><small>${className(d)} Lv${d.lv}${req ? ' · 必须出战' : ''}</small></button>`;
  };
  const render = m => {
    m.querySelector('.dep-list').innerHTML = avail.map(row).join('');
    m.querySelector('.dep-count').textContent = `${sel.size} / ${st.maxDeploy}`;
    for (const p of m.querySelectorAll('[data-hero]')) { const c = portraitCanvas(p.dataset.hero, 32); if (c) p.appendChild(c); }
  };
  return modal(`出击：${esc(st.title)}`, `<p class="center small dim">选择出战角色 <b class="dep-count"></b></p><div class="dep-list"></div>`,
    [{ label: '出击 ▶', value: 'go', cls: 'primary' }, { label: '返回', value: null }], {
      wide: true,
      onOpen: m => render(m),
      onClick: (e, done) => {
        const b = e.target.closest('[data-dep]');
        if (!b) { const btn = e.target.closest('[data-i]'); if (btn && btn.dataset.i === '0') { sfx('select'); done([...sel]); return true; } return false; }
        const id = b.dataset.dep;
        if (st.required.includes(id)) { toast('该角色必须出战'); return true; }
        if (sel.has(id)) sel.delete(id); else if (sel.size < st.maxDeploy) sel.add(id); else toast(`最多出战 ${st.maxDeploy} 人`);
        sfx('select'); render($('#modal'));
        return true;
      },
    });
}

// =====================================================================
// 标题 / 结局
// =====================================================================
// 主画面：系列作品选择
function showSelect() {
  B = null;
  show('select');
  music('title');
  const list = $('#select-list');
  list.innerHTML = CAMPAIGN_ORDER.map(id => {
    const c = CAMPAIGNS[id];
    let prog = '';
    try { const s = JSON.parse(localStorage.getItem(c.saveKey)); if (s && s.roster) { const n = (CAMPAIGN_STAGES[id] || []).length; prog = s.stage >= n && n ? '已通关' : `进行到第 ${s.stage + 1} 关`; } } catch (e) { }
    const soon = !campaignReady(id);
    return `<button class="game-card ${soon ? 'soon' : ''}" data-game="${id}" style="--gc:${c.color}">
      <span class="gc-no">${c.no}</span>
      <span class="gc-main"><b>${esc(c.full || c.title)}</b><small>${c.year} · ${esc(c.tag)}${prog ? ' · ' + prog : ''}</small><em>${esc(c.desc)}</em></span>
      <span class="gc-go">${soon ? '制作中' : '▶'}</span>
    </button>`;
  }).join('');
}
$('#select-list').addEventListener('click', e => {
  const b = e.target.closest('[data-game]');
  if (!b) return;
  const c = CAMPAIGNS[b.dataset.game];
  if (!campaignReady(c.id)) { sfx('miss'); toast(`《${c.full || c.title}》制作中，敬请期待`); return; }
  sfx('select');
  useCampaign(c.id);
  showTitle();
});
$('#btn-select').addEventListener('click', () => { sfx('select'); showSelect(); });
function showTitle() {
  B = null;
  show('title');
  music('title');
  const c = curCampaign();
  $('#logo-sub').textContent = c.subtitle;
  $('#logo-title').innerHTML = c.id === 'g1' ? '超时空<br>英雄传说' : `<small class="logo-pre">超时空英雄传说${c.id === 'g3' ? '外传' : ''}</small>${esc(c.title)}`;
  $('#logo-tag').textContent = `移动重制版 · ${c.tag}`;
  const row = $('#title-heroes'); row.innerHTML = '';
  for (const id of c.titleHeroes || []) { const pc = portraitCanvas(id, 64); if (pc) row.appendChild(pc); }
  const sv = readSave();
  $('#btn-continue').hidden = !sv;
  if (sv) $('#btn-continue').textContent = `继续旅程（${sv.stage >= STAGES.length ? '已通关' : `第 ${STAGES[sv.stage].no} 关`}）`;
}
async function showEnding() {
  if (AUTO) return 'win';
  if (CUR_CAMPAIGN !== 'g1') return showCampaignEnding();
  show('ending');
  music('ending');
  const box = $('#ending-scroll');
  box.innerHTML = '';
  await dialog(ENDING_PRELUDE);
  // 原作的两个抉择：是否担任迦纳帝国君主；是否留在科隆多
  let route = 'earth';
  const rule = await modal('抉择', '<p class="center">众人一致推举孟祈担任迦纳帝国的君主。<br>孟祈，是否担任？</p>', [{ label: '担任君主', value: 'yes', cls: 'primary' }, { label: '婉拒', value: 'no' }]);
  if (rule === 'yes') route = 'ruler';
  else {
    await dialog(ENDING_PORTAL);
    const stay = await modal('抉择', '<p class="center">时空传送器只能启动一次。<br>孟祈，您要留在科隆多吗？</p>', [{ label: '留下来', value: 'stay', cls: 'primary' }, { label: '回到地球', value: 'earth' }]);
    route = stay;
  }
  const E = ENDINGS[route];
  await dialog(E.lines);
  sfx('win');
  box.innerHTML = `<h2>— ${E.title} —</h2>
    <div class="epilogue">${E.epilogue.map(([id, text]) => `<div class="ep"><span class="ep-port" data-hero="${id}"></span><div><b>${esc(HEROES[id].name)}</b><p>${esc(text)}</p></div></div>`).join('')}</div>
    <p class="thanks">感谢游玩《超时空英雄传说 · 移动重制版》</p>
    <p class="dim small">本作为粉丝向非官方重制，谨此致敬 宇峻科技 1996 年的经典战棋游戏《超时空英雄传说》。<br>剧情依原作改编，对白为重新撰写。</p>
    <p class="dim small">结局：${Object.keys(ENDINGS).map(k => ENDINGS[k].title).join(' / ')}——换个选择，也许会看到不同的结局。</p>
    <button class="btn primary" id="btn-end-title">返回标题</button>`;
  for (const p of box.querySelectorAll('[data-hero]')) { const c = portraitCanvas(p.dataset.hero, 44); if (c) p.appendChild(c); }
  box.scrollTop = 0;
  $('#btn-end-title').onclick = () => { persist(); showTitle(); };
}

// 二代起：结局由旗标与关系值决定（CAMPAIGN_ENDINGS[id].resolve 返回结局键）
async function showCampaignEnding() {
  const CE = CAMPAIGN_ENDINGS[CUR_CAMPAIGN];
  show('ending');
  music('ending');
  const box = $('#ending-scroll');
  box.innerHTML = '';
  if (CE.prelude) await dialog(CE.prelude);
  const k = CE.resolve(S), E = CE.endings[k];
  await dialog(E.lines);
  sfx('win');
  const c = curCampaign();
  box.innerHTML = `<h2>— ${esc(E.title)} —</h2>
    <div class="epilogue">${(E.epilogue || []).map(([id, text]) => `<div class="ep"><span class="ep-port" data-hero="${id}"></span><div><b>${esc((HEROES[id] || {}).name || id)}</b><p>${esc(text)}</p></div></div>`).join('')}</div>
    <p class="thanks">感谢游玩《${esc(c.full || c.title)} · 移动重制版》</p>
    <p class="dim small">本作为粉丝向非官方重制，谨此致敬 宇峻科技。剧情依原作改编，对白为重新撰写。</p>
    <p class="dim small">已知结局：${Object.values(CE.endings).map(e => e.title).join(' / ')}——不同的选择、好感度与关键道具会走向不同的结局。</p>
    <button class="btn primary" id="btn-end-title">返回标题</button>`;
  for (const p of box.querySelectorAll('[data-hero]')) { const pc = portraitCanvas(p.dataset.hero, 44); if (pc) p.appendChild(pc); }
  box.scrollTop = 0;
  $('#btn-end-title').onclick = () => { persist(); showTitle(); };
}
$('#btn-new').addEventListener('click', async () => {
  sfx('select');
  if (readSave()) {
    const ok = await modal('新的旅程', '<p class="center">将覆盖现有存档，确定吗？</p>', [{ label: '开始', value: 1, cls: 'primary' }, { label: '取消', value: 0 }]);
    if (!ok) return;
  }
  newSave(); persist();
  runStage(0);
});
$('#btn-continue').addEventListener('click', () => {
  sfx('select');
  S = readSave();
  if (!S) return;
  if (S.stage >= STAGES.length) return showEnding();
  if (S.stage === 0) return runStage(0);
  showCamp();
});
$('#btn-help').addEventListener('click', () => {
  sfx('select');
  modal('游戏说明', `
    <div class="help">
    <p><b>操作</b>：点击我方角色 → 点击蓝色格子移动 → 选择「攻击 / 法术 / 道具 / 待机」。选中目标后再点一次（或按「确认」）执行。点击敌人可查看其移动（蓝）与攻击（红）范围。</p>
    <p><b>地形</b>：森林、山地、丘陵、村庄、城堡提供防御与回避加成；村庄与圣坛每回合回复 HP。骑兵难以通过森林山地，飞行单位无视地形，水中生物在水里行动自如。</p>
    <p><b>兵种相克</b>：依原作设定，例如弓箭克制飞行与鹰族，龙族、鹰族压制大多数地面部队，剑士面对战士、狼族稍弱。预测画面会显示「克制 / 被克」。</p>
    <p><b>魔法</b>：地、火、风、水、黑暗、神圣、召唤七大系统，另有各职业的专属战技——剑术系的单人剑式与需要相邻剑术伙伴的<b>双人剑式</b>、骑兵的<b>枪术</b>、战士的<b>斧技</b>、武士的<b>刀术</b>、弓手的<b>箭术</b>，以及鹰族、狼族的天赋战技。直线类法术（极热光束、闪电光束、冷冻波、诅咒之风）不论敌我都会受伤！</p>
    <p><b>异常状态</b>：石化、冻结、失明时无法行动；中毒每回合损失生命；禁锢无法施法；破魂剑法让敌人无法反击。可用状态回复、解石化、解毒草、化石草治疗。</p>
    <p><b>成长</b>：获得 100 经验升级，到达一定等级自动转职（例如孟祈：作家 → 侠客 → 剑道家 → 圣剑士 → 剑侠 → 剑王 → 剑圣）。多数职业在中期转职时会出现<b>分支</b>，可选择原作路线或新路线（如剑士→魔法剑士、骑兵→圣骑士、武士→忍者、法师→时空术士），营地的「职业树」可查看。</p>
    <p><b>营地</b>：每关之间可以更换装备（武器 / 防具 / 饰品）、使用道具、购物，并选择出击人员。进度自动保存在本机。</p>
    <p class="dim">提示：在手机浏览器中「添加到主屏幕」，即可像 App 一样全屏游玩。</p>
    </div>`, [{ label: '明白了', value: 1, cls: 'primary' }], { dismiss: 1, wide: true });
});
function diffLabel() { $('#btn-diff').textContent = `难度：${OPT.easy ? '简单' : '标准'}`; }
$('#btn-diff').addEventListener('click', () => { OPT.easy = !OPT.easy; saveOpt(); diffLabel(); sfx('select'); toast(OPT.easy ? '简单：敌人较弱，经验值 +25%' : '标准：接近原作的难度'); });
$('#btn-sound').addEventListener('click', () => { OPT.sound = OPT.music = !(OPT.sound || OPT.music); saveOpt(); $('#btn-sound').textContent = OPT.sound ? '🔊' : '🔇'; sfx('select'); music('title'); });

// 标题画面：时空裂缝星空
(function titleFx() {
  const c = $('#title-bg'), g = c.getContext('2d');
  const stars = Array.from({ length: 140 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), s: 0.2 + Math.random() * 0.8 }));
  const loop = now => {
    requestAnimationFrame(loop);
    if ($('#title').hidden && $('#select').hidden) return;
    if (!$('#select').hidden && c.parentNode.id !== 'select') $('#select').prepend(c);
    else if (!$('#title').hidden && c.parentNode.id !== 'title') $('#title').prepend(c);
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

// =====================================================================
// 启动
// =====================================================================
loadOpt();
// 首次触摸时解锁音频（iOS / Android 浏览器要求用户手势），之后播放当前场景的音乐
let audioUnlocked = false;
const unlockAudio = () => {
  if (audioUnlocked || typeof AUDIO === 'undefined') return;
  audioUnlocked = true;
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { } // iPhone 静音键开着也能听到音乐
  try { AUDIO.unlock(); AUDIO.setMusicOn(OPT.music); AUDIO.setSfxOn(OPT.sound); } catch (e) { }
  if (!$('#title').hidden || !$('#select').hidden) music('title'); else if (!$('#camp').hidden) music('camp');
};
for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, unlockAudio, { passive: true });
$('#btn-sound').textContent = (OPT.sound || OPT.music) ? '🔊' : '🔇';
diffLabel();
// 启动：先到系列作品选择画面（记住上次选的作品）
try { const last = localStorage.getItem('cskyxcs_campaign'); if (last && campaignReady(last)) useCampaign(last); } catch (e) { }
showSelect();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });

// 测试接口：AI 自动打完全部关卡（每关最多重试 retries 次），返回每关结果
window.__autoplay = async function (from, to, retries) {
  AUTO = true;
  if (!from) newSave();
  const out = [];
  for (let i = from || 0; i < (to || STAGES.length); i++) {
    let won = false, tries = 0;
    autoShop();
    while (!won && tries <= (retries ?? 2)) { tries++; const r = await runStage(i, { skipIntro: true }); won = S.stage > i; }
    out.push({ no: STAGES[i].no, won, tries, turns: window.__lastTurn, lv: partyLevel() });
    if (!won) { S.stage = i + 1; prepareStage(Math.min(i + 1, STAGES.length - 1)); }
  }
  AUTO = false;
  return out;
};
