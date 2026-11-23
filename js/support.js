// support —— 好感与支援系统（四部作品共用）
// 搭档羁绊（C → B → A，部分搭档可到 S）、战斗中的支援加成、营地的支援对话与支援一览。
// 与既有的「关系值 / 好感度」S.rel 并存：S.rel 仍是剧情选项与结局读取的数值；
// 支援点数另存于 S.sup = { 'a|b': { p: 点数, l: 等级 0~4 } }。与主角好感度相连的搭档（rel），
// 好感度也会计入支援点数，看完支援对话会让好感度小幅上升。
// 对外只露出 SUPPORT 与几个 sup 开头的钩子函数（battle.js 以 typeof 检查后调用）。
'use strict';
window.SUP_TALK = window.SUP_TALK || {};
(function () {
  const RANK = ['—', 'C', 'B', 'A', 'S'];
  const NEED = [0, 10, 26, 46, 70];                  // 解锁各等级对话所需的支援点数
  const BONUS = [null,                                // 每位在 2 格内的搭档提供的加成
    { hit: 5, avo: 5, crit: 0, dmg: 1 },
    { hit: 10, avo: 10, crit: 3, dmg: 2 },
    { hit: 15, avo: 15, crit: 5, dmg: 3 },
    { hit: 20, avo: 20, crit: 8, dmg: 4 }];
  const PAIR_BOOST = [0, 0.06, 0.12, 0.18, 0.25];    // 双人合技：依支援等级提升威力
  const RANGE = 2;        // 支援加成的距离
  const CAP = 8;          // 每场战斗、每对搭档最多获得的点数
  const REL_K = 0.5;      // 好感度换算成支援点数的比例
  const LINK_COL = ['', '255,176,208', '255,138,192', '255,106,168', '255,214,106'];

  // ---------- 资料 ----------
  const camp = () => (typeof CUR_CAMPAIGN !== 'undefined' ? CUR_CAMPAIGN : 'g1');
  const pairs = () => SUP_TALK[camp()] || [];
  const keyOf = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  let IDX = null, IDX_C = null;
  function index() { // 英雄 id → [{ p: 搭档资料, o: 对方 id }]
    if (IDX && IDX_C === camp()) return IDX;
    IDX = new Map(); IDX_C = camp();
    for (const p of pairs()) {
      p.key = keyOf(p.a, p.b);
      for (const [x, o] of [[p.a, p.b], [p.b, p.a]]) { if (!IDX.has(x)) IDX.set(x, []); IDX.get(x).push({ p, o }); }
    }
    return IDX;
  }
  function pairOf(a, b) { if (!a || !b) return null; const l = index().get(a); if (!l) return null; for (const e of l) if (e.o === b) return e.p; return null; }
  const store = () => { if (!S) return {}; S.sup = S.sup || {}; return S.sup; };
  const stateOf = p => store()[p.key] || { p: 0, l: 0 };
  const maxLv = p => (p.s ? 4 : 3);
  const nameOf = id => ((typeof HEROES !== 'undefined' && HEROES[id]) || {}).name || id;
  const present = id => !!(S && S.roster && S.roster[id] && !(S.left || {})[id]);
  function relPts(p) {
    if (!p.rel || !S) return 0;
    const r = S.rel || {};
    return Math.floor(Math.max(...p.rel.map(k => r[k] || 0)) * REL_K);
  }
  const points = p => Math.min(NEED[4], stateOf(p).p + relPts(p));
  function lvBetween(a, b) { const p = pairOf(a, b); return p && S ? stateOf(p).l : 0; }
  // 誓约（S）只能和一个人结下
  function sHolder(id) { for (const e of index().get(id) || []) if (stateOf(e.p).l >= 4) return e.o; return null; }
  function sBlocked(p) { const x = sHolder(p.a), y = sHolder(p.b); return (x && x !== p.b) ? p.a : (y && y !== p.a) ? p.b : null; }
  function ready(p) {
    const l = stateOf(p).l;
    if (l >= maxLv(p) || !present(p.a) || !present(p.b)) return false;
    if (!p.talk || !p.talk[RANK[l + 1]]) return false;
    if (l + 1 === 4 && sBlocked(p)) return false;
    return points(p) >= NEED[l + 1];
  }
  const readyList = () => (S ? pairs().filter(ready) : []);

  // ---------- 战斗：加成 ----------
  const sideOf = u => (u.team === 'player' || u.team === 'ally' ? 'P' : u.team);
  // 单位目前身边（RANGE 格内）的支援搭档与合计加成；没有就回传 null
  function aura(u) {
    if (!u || !u.id || !S || typeof B === 'undefined' || !B || !B.units) return null;
    const list = index().get(u.id);
    if (!list) return null;
    let out = null;
    for (const o of B.units) {
      if (o === u || !o.id || o.hp <= 0 || sideOf(o) !== sideOf(u)) continue;
      if (Math.abs(o.x - u.x) + Math.abs(o.y - u.y) > RANGE) continue;
      let p = null; for (const e of list) if (e.o === o.id) { p = e.p; break; }
      if (!p) continue;
      const l = stateOf(p).l;
      if (!l) continue;
      const b = BONUS[l];
      if (!out) out = { hit: 0, avo: 0, crit: 0, dmg: 0, lv: 0, who: [] };
      out.hit += b.hit; out.avo += b.avo; out.crit += b.crit; out.dmg += b.dmg;
      out.lv = Math.max(out.lv, l); out.who.push(o.name || nameOf(o.id));
    }
    if (out) { out.hit = Math.min(out.hit, 30); out.avo = Math.min(out.avo, 30); out.crit = Math.min(out.crit, 12); out.dmg = Math.min(out.dmg, 6); }
    return out;
  }
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function applyPhys(a, d, c, sure) {
    if (!c) return c;
    const sa = aura(a), sd = aura(d);
    if (sa) { c.dmg = Math.max(1, c.dmg + sa.dmg); if (!sure) c.hit = clampN(c.hit + sa.hit, 0, 100); c.crit = clampN(c.crit + sa.crit, 0, 60); c.sup = sa; }
    if (sd && !sure) { c.hit = clampN(c.hit - sd.avo, 20, 100); c.supDef = sd; }
    return c;
  }

  // ---------- 战斗：累积点数 ----------
  function unitById(id) { return B && B.units.find(o => o.id === id && o.hp > 0 && (o.team === 'player' || o.team === 'ally')); }
  function gain(u, v, n) {
    if (!S || !B || !u || !v || u === v || !u.id || !v.id || u.hp <= 0 || v.hp <= 0) return 0;
    if (sideOf(u) !== 'P' || sideOf(v) !== 'P') return 0;
    const p = pairOf(u.id, v.id);
    if (!p) return 0;
    const sup = store(), st = sup[p.key] || (sup[p.key] = { p: 0, l: 0 });
    if (st.l >= maxLv(p)) return 0;
    B.supGain = B.supGain || {};
    const got = B.supGain[p.key] || 0;
    // 点数停在下一段对话的门槛，看完对话才会继续累积
    const room = Math.min(CAP - got, NEED[Math.min(st.l + 1, 4)] - relPts(p) - st.p);
    const add = Math.min(n, room);
    if (add <= 0) return 0;
    const was = ready(p);
    st.p += add; B.supGain[p.key] = got + add;
    const mx = (u.x + v.x) / 2, my = (u.y + v.y) / 2 - 0.35;
    if (!was && ready(p)) floatText(mx, my, `♥ 支援${RANK[st.l + 1]}`, '#ff7ab0', true);
    else floatText(mx, my, '♥', '#ff8ab8');
    return add;
  }
  function adjPartners(u) {
    const out = [];
    if (!u || !u.id || u.hp <= 0 || !B) return out;
    for (const e of index().get(u.id) || []) {
      const o = unitById(e.o);
      if (o && Math.abs(o.x - u.x) + Math.abs(o.y - u.y) === 1) out.push(o);
    }
    return out;
  }

  // ---------- 包装 battle.js 的函数（不改动原本的程式码） ----------
  function wrap(name, make) {
    const f = window[name];
    if (typeof f !== 'function') return;
    window[name] = make(f);
  }
  wrap('physCalc', f => function (a, d, power, sure) { return applyPhys(a, d, f.apply(this, arguments), !!sure); });
  wrap('magCalc', f => function (a) {
    const c = f.apply(this, arguments), sa = aura(a);
    if (c && sa) { c.dmg = Math.max(1, c.dmg + sa.dmg); c.sup = sa; }
    return c;
  });
  // 双人合技：支援等级越高，合击越强
  wrap('skillCalc', f => function (a, d, sp, partner) {
    const c = f.apply(this, arguments);
    if (c && sp && sp.kind === 'pair' && partner && a) {
      const l = lvBetween(a.id, partner.id);
      if (l) { c.dmg = Math.max(1, Math.round(c.dmg * (1 + PAIR_BOOST[l]))); c.supPair = l; }
    }
    return c;
  });
  // 情侣 / 搭档合技：好感度不够时，支援等级够高（门槛 80 以上要 A，其余要 B）也能施展；
  // 一般双人剑式：优先找有羁绊的伙伴
  wrap('pairPartner', f => function (u, sp) {
    const r = f.apply(this, arguments);
    if (!u || !sp || !B) return r;
    const ok = p => p !== u && p.team === u.team && !p.acted && canAct(p) && mdist(p.x, p.y, u.x, u.y) === 1;
    if (sp.partner) {
      if (r) return r;
      if (lvBetween(u.id, sp.partner) < ((sp.rel || 0) >= 80 ? 3 : 2)) return null;
      if (sp.needHidden && !(CLASSES[u.cls] || {}).hiddenOf) return null;
      return alive().find(p => p.id === sp.partner && ok(p) && (!sp.needHidden || (CLASSES[p.cls] || {}).hiddenOf)) || null;
    }
    if (!r || typeof PAIR_CLASSES === 'undefined') return r;
    const best = alive().filter(p => ok(p) && PAIR_CLASSES.includes(p.cls) && lvBetween(u.id, p.id) > 0)
      .sort((a, b) => lvBetween(u.id, b.id) - lvBetween(u.id, a.id) || atkOf(b) - atkOf(a))[0];
    return best || r;
  });
  // 并肩作战：攻击或被攻击时，相邻的搭档 +1
  wrap('doAttack', f => async function (a, d) {
    const r = await f.apply(this, arguments);
    try { for (const x of [a, d]) for (const o of adjPartners(x)) gain(x, o, 1); } catch (e) { }
    return r;
  });
  // 补刀：击倒搭档先前打伤的敌人 +2
  wrap('applyDamage', f => async function (a, d) {
    const r = await f.apply(this, arguments);
    try {
      if (a && d && a.id && a !== d && hostile(a, d)) {
        if (d.hp <= 0 && d.supBy) for (const id of d.supBy) if (id !== a.id) gain(a, unitById(id), 2);
        if (d.hp > 0) { d.supBy = d.supBy || []; if (!d.supBy.includes(a.id)) d.supBy.push(a.id); }
      }
    } catch (e) { }
    return r;
  });
  // 治疗、补助搭档 +2；施放攻击法术时相邻搭档 +1；双人合技 +2
  wrap('castSpell', f => async function (u, spId, tx, ty) {
    const sp = SPELLS[spId] || {};
    let before = null;
    try {
      if (['heal', 'buff', 'cure', 'refresh'].includes(sp.kind)) before = spellAffected(u, spId, tx, ty).filter(t => t !== u && t.id).map(t => [t, t.hp, t.mhp]);
    } catch (e) { before = null; }
    const r = await f.apply(this, arguments);
    try {
      if (before) { for (const [t, hp0, mhp] of before) if (sp.kind !== 'heal' || t.hp > hp0 || hp0 < mhp) gain(u, t, 2); }
      else if (sp.kind === 'pair' && B && B.castPartner) gain(u, B.castPartner, 2);
      else if (sp.kind !== 'summon') for (const o of adjPartners(u)) gain(u, o, 1);
    } catch (e) { }
    return r;
  });
  wrap('useItem', f => async function (u, itemId, target) {
    const r = await f.apply(this, arguments);
    try { if (target && target !== u) gain(u, target, 1); } catch (e) { }
    return r;
  });

  // ---------- 预测画面的支援标签（battle.js forecastHtml 调用） ----------
  const bonusText = (o, keys) => keys.filter(([k]) => o[k]).map(([k, l]) => `${l}+${o[k]}`).join(' ');
  window.supForecastTag = function (u, partner) {
    try {
      if (!u || !u.id || !B) return '';
      const a = aura(u), parts = [];
      let lv = 0, who = '';
      if (a) { lv = a.lv; who = a.who.join('、'); parts.push(bonusText(a, B.mode === 'spell' ? [['dmg', '伤害']] : [['hit', '命中'], ['avo', '回避'], ['crit', '暴击'], ['dmg', '伤害']])); }
      if (partner && B.mode === 'spell') {
        const l = lvBetween(u.id, partner.id);
        if (l) { lv = Math.max(lv, l); if (!who) who = partner.name; parts.push(`合击威力+${Math.round(PAIR_BOOST[l] * 100)}%`); }
      }
      const txt = parts.filter(Boolean).join(' ');
      if (!lv || !txt) return '';
      return `<div class="sup-fc">♥ 支援 ${RANK[lv]} · 与${esc(who)} ${txt}</div>`;
    } catch (e) { return ''; }
  };

  // ---------- 地图：搭档之间的连线（高清画风，battle.js render 在画单位之前调用） ----------
  function heart(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y + r * 0.9);
    g.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
    g.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.9);
    g.fill();
  }
  window.supDrawLinks = function (g, ts, now) {
    if (!B || !S || !artHD() || !S.sup) return;
    const idx = index();
    const us = B.units.filter(u => u.id && u.hp > 0 && sideOf(u) === 'P' && idx.has(u.id) && u.px === undefined);
    if (us.length < 2) return;
    let saved = false;
    for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) {
      const a = us[i], b = us[j];
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > RANGE) continue;
      const l = lvBetween(a.id, b.id);
      if (!l) continue;
      if (!saved) { g.save(); g.lineCap = 'round'; saved = true; }
      // 沿着脚下的地面画一道往前垂的弧线（避免被 Q 版小人挡住）
      const ax = (a.x + 0.5) * ts, ay = (a.y + 1.0) * ts, bx = (b.x + 0.5) * ts, by = (b.y + 1.0) * ts;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 + ts * 0.4;
      const on = B.sel === a || B.sel === b, pulse = 0.85 + 0.15 * Math.sin(now / 420), col = LINK_COL[l];
      g.setLineDash([]);
      g.strokeStyle = `rgba(${col},${(on ? 0.22 : 0.1) * pulse})`; g.lineWidth = ts * 0.16;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
      g.setLineDash([ts * 0.12, ts * 0.1]); g.lineDashOffset = -now / 70;
      g.strokeStyle = `rgba(${col},${(on ? 0.9 : 0.6) * pulse})`; g.lineWidth = ts * (on ? 0.055 : 0.04);
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); g.stroke();
      g.fillStyle = `rgba(${col},${(on ? 1 : 0.8) * pulse})`;
      const hy = (ay + by) / 4 + my / 2; // 二次曲线的中点
      heart(g, mx, hy, ts * (on ? 0.15 : 0.12));
    }
    if (saved) { g.setLineDash([]); g.restore(); }
  };

  // ---------- 营地：支援页 ----------
  let supHero = null; // 支援页目前展开的角色
  function css() {
    if (document.getElementById('sup-css')) return;
    const s = document.createElement('style'); s.id = 'sup-css';
    s.textContent = `
.sup-fc{font-size:10.5px;line-height:1.35;color:#ffb3d1;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fc-duel:has(> .sup-fc){flex-wrap:wrap;align-content:center;row-gap:1px}
.fc-duel:has(> .sup-fc) .fc-side{height:auto}
.fc-duel > .sup-fc{flex:0 0 100%;text-align:center;padding:1px 6px;border-radius:8px;background:linear-gradient(90deg,transparent,rgba(255,90,150,.22),transparent)}
.tab .sup-dot{display:inline-block;min-width:16px;height:16px;line-height:16px;border-radius:8px;background:#ff5a8a;color:#fff;font-size:11px;font-style:normal;margin-left:3px;padding:0 3px;box-shadow:0 0 6px rgba(255,90,138,.7)}
.sup-intro{font-size:12px;color:var(--dim);margin:0 2px 8px;line-height:1.5}
.sup-intro b{color:#ffb3d1}
.sup-sec{font-size:12px;color:var(--gold);letter-spacing:1px;margin:10px 2px 6px}
.sup-talk{display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin-bottom:6px;padding:6px 10px;border-radius:12px;border:2px solid #ff7ab0;background:linear-gradient(180deg,#5a2450,#2a1238);color:#fff;box-shadow:0 0 10px rgba(255,122,176,.35),inset 0 1px 0 rgba(255,255,255,.2)}
.sup-talk .sup-txt{flex:1;min-width:0;line-height:1.35}
.sup-talk small{display:block;color:#ffc8de;font-size:11px}
.sup-talk .sup-go{font-weight:900;color:#ffd86a;white-space:nowrap}
.sup-pp{display:flex;flex:none}
.sup-pp .sup-port+.sup-port{margin-left:-10px}
.sup-port{flex:none;width:36px;height:36px;border-radius:50%;overflow:hidden;border:1px solid var(--trim);background:radial-gradient(#25407a,#081230);display:flex;align-items:flex-end;justify-content:center}
.sup-port.l{width:46px;height:46px}
.sup-port canvas{display:block;width:100%;height:auto}
.sup-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.sup-chip{display:flex;align-items:center;gap:4px;padding:3px 9px 3px 3px;border-radius:18px;border:2px solid #2f4f94;background:linear-gradient(#152a58,#0c1a3c);color:var(--dim);font-size:12px;font-weight:bold}
.sup-chip .sup-port{width:26px;height:26px}
.sup-chip.on{border-color:#ff7ab0;color:#fff;box-shadow:0 0 8px rgba(255,122,176,.45)}
.sup-chip i{font-style:normal;color:#ff8ab8}
.sup-card{margin-bottom:8px}
.sup-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.sup-head small{color:var(--dim)}
.sup-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(86,214,226,.15)}
.sup-mid{flex:1;min-width:0;font-size:12px;line-height:1.45}
.sup-mid b{font-size:13px}
.sup-tag{font-style:normal;font-size:10.5px;color:#ffc8de;border:1px solid rgba(255,122,176,.5);border-radius:6px;padding:0 4px;margin-left:4px}
.sup-sk{font-style:normal;font-size:10.5px;color:#ffe08a;margin-left:4px}
.sup-bar{height:6px;border-radius:3px;background:#050b1e;border:1px solid #2f4f94;overflow:hidden;margin:3px 0 2px}
.sup-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff8ab8,#ffd86a)}
.sup-mid small{color:var(--dim);font-size:11px}
.sup-rank{flex:none;width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;font-family:"Arial Black","Helvetica Neue",Arial,sans-serif;background:#0b1838;border:2px solid #2f4f94;color:#5a6a90}
.sup-rank.r1{color:#ffd0e2;border-color:#c86a98}.sup-rank.r2{color:#ffb0d0;border-color:#ff8ac0}.sup-rank.r3{color:#fff;border-color:#ff6aa8;background:#5a2450}.sup-rank.r4{color:#3a1a00;border-color:#ffd86a;background:linear-gradient(#fff1a0,#f0b830)}
.sup-row .btn{flex:none}
.sup-none{font-size:12px;color:var(--dim);text-align:center;padding:12px}`;
    document.head.appendChild(s);
  }
  const portEl = (id, cls) => `<span class="sup-port ${cls || ''}" data-sport="${id}"></span>`;
  function fillPorts(root) {
    for (const p of root.querySelectorAll('[data-sport]')) {
      if (p.firstChild) continue;
      const c = typeof portraitCanvas === 'function' ? portraitCanvas(p.dataset.sport, p.classList.contains('l') ? 46 : 36) : null;
      if (c) p.appendChild(c);
    }
  }
  const bonusLine = l => (l ? bonusText(BONUS[l], [['hit', '命中'], ['avo', '回避'], ['crit', '暴击'], ['dmg', '伤害']]) : '');
  function rowHtml(me, e) {
    const p = e.p, st = stateOf(p), l = st.l, pts = points(p), mx = maxLv(p);
    const next = Math.min(l + 1, mx), lo = NEED[l], hi = NEED[next];
    const pct = l >= mx ? 100 : Math.max(0, Math.min(100, (pts - lo) / Math.max(1, hi - lo) * 100));
    const blocked = l + 1 === 4 && p.s && sBlocked(p);
    let note;
    if (l >= mx) note = l === 4 ? '已结下誓约' : '羁绊已达最高等级';
    else if (ready(p)) note = `可以进行 ${RANK[l + 1]} 级支援对话`;
    else if (blocked) note = `S 级：${nameOf(blocked)}已与他人结下誓约`;
    else note = `距 ${RANK[next]} 级还差 ${Math.max(0, hi - pts)} 点`;
    const sk = (p.skill || []).filter(k => typeof SPELLS !== 'undefined' && SPELLS[k]).map(k => SPELLS[k].name);
    return `<div class="sup-row">${portEl(e.o)}
      <div class="sup-mid"><b>${esc(nameOf(e.o))}</b>${p.tag ? `<i class="sup-tag">${esc(p.tag)}</i>` : ''}${sk.length ? `<i class="sup-sk">合技·${esc([...new Set(sk)].join('/'))}</i>` : ''}
        <div class="sup-bar"><i style="width:${pct.toFixed(0)}%"></i></div>
        <small>${l ? `${bonusLine(l)} · ` : ''}${note}</small></div>
      ${ready(p) ? `<button class="btn small primary" data-sup-talk="${p.key}">对话</button>` : ''}
      <span class="sup-rank r${l}">${l ? RANK[l] : '—'}</span></div>`;
  }
  function supportHtml() {
    const idx = index(), heroes = (S.order || []).filter(id => present(id) && idx.has(id));
    if (!heroes.length) return '<p class="sup-none">队伍里还没有结下羁绊的同伴。</p>';
    if (!heroes.includes(supHero)) supHero = heroes[0];
    const rd = readyList();
    let h = `<p class="sup-intro">与搭档相距 <b>2 格内</b>时互相支援：命中、回避、暴击与伤害提升，等级越高越强。并肩作战、治疗补助、替搭档补刀都会累积<b>♥</b>。点数满了，就能在这里观看<b>支援对话</b>提升等级。</p>`;
    if (rd.length) {
      h += '<div class="sup-sec">♥ 可以进行的支援对话</div>';
      h += rd.map(p => { const l = stateOf(p).l + 1; return `<button class="sup-talk" data-sup-talk="${p.key}"><span class="sup-pp">${portEl(p.a)}${portEl(p.b)}</span><span class="sup-txt"><b>${esc(nameOf(p.a))} × ${esc(nameOf(p.b))}</b><small>${p.tag ? esc(p.tag) + ' · ' : ''}${RANK[l]} 级支援对话</small></span><span class="sup-go">支援对话 ${RANK[l]} ▶</span></button>`; }).join('');
    }
    h += '<div class="sup-sec">支援一览</div><div class="sup-chips">' + heroes.map(id => {
      const n = (idx.get(id) || []).filter(e => present(e.o)).length, hot = (idx.get(id) || []).some(e => present(e.o) && ready(e.p));
      return `<button class="sup-chip ${id === supHero ? 'on' : ''}" data-sup-hero="${id}">${portEl(id)}${esc(nameOf(id))}${hot ? ' <i>♥</i>' : ''}<small class="dim">${n}</small></button>`;
    }).join('') + '</div>';
    const me = supHero, list = (idx.get(me) || []).filter(e => present(e.o)), hidden = (idx.get(me) || []).length - list.length;
    const d = S.roster[me];
    h += `<div class="card sup-card"><div class="sup-head">${portEl(me, 'l')}<div><b>${esc(nameOf(me))}</b> <span class="dim small">${d ? esc(className(Object.assign({ status: {}, buffs: [] }, d))) + ' Lv' + d.lv : ''}</span><br><small>${list.length ? `已相遇的羁绊 ${list.length} 段` : '还没有遇到羁绊的对象'}${hidden ? ` · 另有 ${hidden} 段尚未相遇` : ''}</small></div></div>
      ${list.map(e => rowHtml(me, e)).join('')}</div>`;
    return h;
  }
  async function playTalk(key) {
    const p = pairs().find(q => (q.key || keyOf(q.a, q.b)) === key);
    if (!p || !ready(p)) return;
    const sup = store(), st = sup[p.key] || (sup[p.key] = { p: 0, l: 0 });
    const lv = st.l + 1, R = RANK[lv];
    sfx('select');
    toast(`支援对话 ${R} · ${nameOf(p.a)} × ${nameOf(p.b)}`);
    const lines = (p.talk[R] || []).map(([id, text]) => (id ? [nameOf(id), text, id] : ['旁白', text]));
    if (typeof warmPortraitsHD === 'function' && artHD()) { try { warmPortraitsHD([p.a, p.b].filter(id => S.roster[id]).map(id => [id, undefined, S.roster[id].tier, S.roster[id].path])); } catch (e) { } }
    await dialog(lines);
    st.l = lv;
    // 与主角好感度相连的搭档：看完对话，好感度小幅上升（结局依旧由好感度决定）
    let relUp = '';
    if (p.rel) { const r = (S.rel = S.rel || {}); for (const k of p.rel) r[k] = Math.min(100, (r[k] || 0) + (lv === 4 ? 10 : 5)); relUp = ` · ${curCampaign().relLabel || '好感度'}↑`; }
    persist();
    sfx('levelup');
    toast(`${nameOf(p.a)}与${nameOf(p.b)}的支援等级提升为 ${R}！${relUp}`);
    renderCamp();
  }

  // 营地：注入「支援」分页，包装 renderCamp / showCamp（game.js 载入后才存在）
  let lastReady = '';
  function installCamp() {
    css();
    const nav = document.querySelector('#camp .tabs');
    if (nav && !nav.querySelector('[data-tab="support"]')) {
      const b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = 'support'; b.textContent = '支援';
      nav.appendChild(b);
    }
    const tabLabel = () => {
      const t = document.querySelector('#camp .tab[data-tab="support"]');
      if (!t) return;
      const n = readyList().length;
      t.innerHTML = `支援${n ? `<i class="sup-dot">${n}</i>` : ''}`;
    };
    wrap('renderCamp', f => function () {
      if (typeof campTab === 'undefined' || campTab !== 'support' || !S) { const r = f.apply(this, arguments); tabLabel(); return r; }
      const next = STAGES[S.stage];
      $('#camp-next').textContent = next ? `第 ${next.no} 关 · ${next.title}` : '';
      $('#camp-gold').textContent = S.gold + ' G';
      for (const t of document.querySelectorAll('#camp .tab')) t.classList.toggle('on', t.dataset.tab === 'support');
      const body = $('#camp-body');
      body.innerHTML = supportHtml();
      fillPorts(body);
      tabLabel();
    });
    wrap('showCamp', f => function () {
      const r = f.apply(this, arguments);
      try {
        const rd = readyList().map(p => p.key).join(',');
        if (rd && rd !== lastReady) toast('♥ 有新的支援对话可以观看（营地「支援」）');
        lastReady = rd;
      } catch (e) { }
      return r;
    });
    $('#camp').addEventListener('click', e => {
      const t = e.target.closest('[data-sup-talk]');
      if (t) { e.stopPropagation(); playTalk(t.dataset.supTalk); return; }
      const h = e.target.closest('[data-sup-hero]');
      if (h) { sfx('select'); supHero = h.dataset.supHero; renderCamp(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installCamp); else setTimeout(installCamp, 0);

  // 对外接口（测试与其他模块用）
  window.SUPPORT = {
    RANK, NEED, BONUS, RANGE,
    pairs, pairOf, level: lvBetween, points: p => points(p), ready, readyList, aura, gain,
    state: (a, b) => { const p = pairOf(a, b); return p ? Object.assign({ pts: points(p) }, stateOf(p)) : null; },
    // 测试用：直接设定等级 / 点数
    set(a, b, l, pts) { const p = pairOf(a, b); if (!p) return false; store()[p.key] = { p: pts ?? NEED[Math.min(l, 4)], l }; return true; },
    talk: playTalk,
  };
})();

// =====================================================================
// 支援对话 · 壹《超时空英雄传说》
// 格式：{ a, b, tag, s: 可到 S, rel: 相连的好感度键, skill: 相关合技, talk: { C, B, A, S: [[说话者 id, 台词], …] } }
// 说话者 id 为空字串时是旁白。
// =====================================================================
SUP_TALK.g1 = [
  { a: 'mengqi', b: 'xueer', tag: '心之所系', s: true, talk: {
    C: [
      ['xueer', '喂，作家先生，又在火堆边写写画画？大半夜的，写什么呢？'],
      ['mengqi', '写日记。把每天发生的事记下来，免得哪天回了地球，以为自己只是做了一场梦。'],
      ['xueer', '那……有写到本姑娘吗？'],
      ['mengqi', '写了。「今天又被雪儿骂笨蛋，第七次。」'],
      ['xueer', '你！那种事不准写！要写就写「雪儿又漂亮又聪明，一记回复术救了全队」！'],
      ['mengqi', '好好好，我改。……不过第七次是真的。'],
      ['xueer', '哼，那今天就凑满第八次——笨蛋！'],
    ],
    B: [
      ['xueer', '别动！伤口还在流血呢。……真是的，你一个拿笔的，冲那么前面做什么？'],
      ['mengqi', '那个蛇妖差点咬到你了，我没多想。'],
      ['xueer', '……我会躲开的啦。我从小一个人在山里长大，比你会照顾自己多了。'],
      ['mengqi', '一个人？张青大剑师不在吗？'],
      ['xueer', '爹总是在外面查什么「黑暗军」，一走就是好几个月。我早就习惯了。……真的，习惯了。'],
      ['mengqi', '那以后就别一个人了。我们会一起找到他，然后你可以当面骂他一顿。'],
      ['xueer', '……噗。好啊，到时候你可要站在我这边。'],
    ],
    A: [
      ['xueer', '孟祈，我问你喔。……要是有一天找到回地球的路，你会走吗？'],
      ['mengqi', '……我不知道。那边有我的家，有没写完的稿子。可是这里——'],
      ['xueer', '这里怎样？'],
      ['mengqi', '这里有我一辈子都写不完的故事。'],
      ['xueer', '……笨蛋，答得一点都不清楚。'],
      ['xueer', '算了。不管你最后怎么选，不准不告而别。听到没有？要走，也得先跟我说。'],
      ['mengqi', '我答应你。'],
    ],
    S: [
      ['mengqi', '雪儿，这个给你。'],
      ['xueer', '一张纸？……「超时空英雄传说·第一章」？这是你写的书？'],
      ['mengqi', '还只有开头。主角是个误闯异世界的倒霉作家，第一个遇到的，是个说话不留情的女孩。'],
      ['xueer', '……那个女孩后来怎么了？'],
      ['mengqi', '我还没想好结局。所以想问问你——这个故事的结尾，你愿意陪我一起写吗？'],
      ['xueer', '……这种话，要说就早点说嘛。'],
      ['xueer', '好啦。不过先说好，结局一定要是好结局，否则我把你的稿子全烧了！'],
    ],
  } },
  { a: 'yangtie', b: 'wushuang', tag: '心之所系', s: true, talk: {
    C: [
      ['wushuang', '天还没亮就在练枪？杨铁，你这样会把自己累垮的。'],
      ['yangtie', '公主殿下。……抱歉，吵醒你了。'],
      ['wushuang', '别叫殿下，听着好生分。在战场上，我只是个会放火球的魔法使。'],
      ['yangtie', '……我只是睡不着。一闭上眼，就看到父亲被带走的那天。'],
      ['wushuang', '那就别勉强睡了。我陪你坐一会儿吧，等太阳出来。'],
      ['yangtie', '谢谢你，无……无双。'],
    ],
    B: [
      ['yangtie', '在卡斯堤，我对着那些士兵大吼大叫，像疯子一样……让你看笑话了。'],
      ['wushuang', '我不觉得好笑。我的父王被关进塔里的时候，我也很想把整座塔烧掉。'],
      ['yangtie', '你也会这样想？'],
      ['wushuang', '当然会。可是曲爷爷说，愤怒就像火系魔法——控制得住，能照亮前路；控制不住，就会先烧了自己。'],
      ['yangtie', '……我一直以为，只有我一个人在生气。'],
      ['wushuang', '所以啊，以后生气的时候，记得回头看看。我们都在。'],
    ],
    A: [
      ['wushuang', '杨铁，等打倒了迦纳大帝，你想做什么？'],
      ['yangtie', '我想……让迦纳变成父亲希望的样子。不再有人被无故追杀，不再有人家破人亡。'],
      ['wushuang', '那赤子国就有一个好邻居了。'],
      ['yangtie', '邻、邻居？'],
      ['wushuang', '不然呢？……你脸红什么呀。'],
      ['yangtie', '没、没什么！我是说——赤子国的事，就是我的事。不管什么时候，只要你开口。'],
      ['wushuang', '……嗯。我记住了。'],
    ],
    S: [
      ['yangtie', '无双，我有一句话，一直不知道该怎么说。'],
      ['wushuang', '你说话什么时候拐过弯？直说吧。'],
      ['yangtie', '等战争结束，我想以杨业之子的身份，正式去拜见赤子国王。……向他提亲。'],
      ['wushuang', '…………'],
      ['yangtie', '你、你要是不愿意，就当我没说——'],
      ['wushuang', '谁说我不愿意了？我只是在想……你得先过曲爷爷那一关。他可比迦纳大帝难对付多了。'],
      ['yangtie', '哈哈……那我就拼了这条命，也要过关！'],
    ],
  } },
  { a: 'mengqi', b: 'yangtie', tag: '结义兄弟', talk: {
    C: [
      ['yangtie', '孟大哥，你说的「地球」，真的有不用马拉、自己会跑的车？'],
      ['mengqi', '有啊，还有会飞的铁鸟，一天能从大陆这头飞到那头。'],
      ['yangtie', '……你该不会是写故事写多了，在拿我寻开心吧？'],
      ['mengqi', '那我们打个赌。等哪天时空裂缝再开，我带你去看看。'],
      ['yangtie', '一言为定！不过要是没有，你得请我喝一个月的酒。'],
    ],
    B: [
      ['yangtie', '孟大哥，有件事我一直想问。你本来跟迦纳一点关系都没有，为什么要陪我拼命？'],
      ['mengqi', '你还记得我们刚认识那天吗？我连剑都拿不稳，是你挡在我前面。'],
      ['yangtie', '那是因为追兵是冲着我来的，不能连累你。'],
      ['mengqi', '所以啊。一个被追杀的时候还先顾着别人的家伙，我怎么放心让他一个人去报仇。'],
      ['yangtie', '……孟大哥。'],
    ],
    A: [
      ['yangtie', '孟大哥，我想跟你结拜。'],
      ['mengqi', '这么突然？'],
      ['yangtie', '我爹说过，一辈子能遇到一个可以把背后交给他的人，就够了。我遇到了。'],
      ['mengqi', '……好。那从今天起，你的仇就是我的仇，你的路就是我的路。'],
      ['yangtie', '天地为证！孟大哥在上，受小弟一拜！'],
      ['mengqi', '起来起来，这里地上全是泥。……兄弟。'],
    ],
  } },
  { a: 'klein', b: 'judy', tag: '兄妹', talk: {
    C: [
      ['klein', '茱笛！刚才那只湖怪离你只有三步，你还站在原地拉弓？'],
      ['judy', '我在瞄准嘛！哥你别老是大呼小叫的，我又不是小孩子了。'],
      ['klein', '在我眼里，你永远是那个看到青蛙都会哭的小丫头。'],
      ['judy', '那、那是很小的时候的事了！……而且那只青蛙真的很大。'],
      ['klein', '是是是。总之，下次怪物靠近就往后退，听到没有？'],
      ['judy', '知道啦——（小声）明明自己也怕得要命。'],
    ],
    B: [
      ['judy', '哥，你为什么要从帝国军逃出来？以前你明明说过，当兵是最光荣的事。'],
      ['klein', '……他们要我们烧村子。说那村子藏了叛党，可里面只有老人跟小孩。'],
      ['judy', '……'],
      ['klein', '我放下了火把。那天晚上，我就和史莱德、欧兹一起跑了。'],
      ['judy', '你没有做错。哥，你一点都没有做错。'],
    ],
    A: [
      ['judy', '哥，我想了很久。……其实你逃出来，也是为了回镜湖城看我吧？'],
      ['klein', '帝国军要是知道我有个妹妹，会拿你来要挟我。我只是……想抢在他们前面。'],
      ['judy', '笨蛋哥哥。你什么都不说，我还以为你只是厌倦了打仗。'],
      ['klein', '说出来多难为情。'],
      ['judy', '那换我说好了——以后你保护我，我也保护你。我的箭，射得可比你的斧头远。'],
      ['klein', '……哈哈，好。那后背就交给你了，妹妹。'],
    ],
  } },
  { a: 'xueer', b: 'zhangqing', tag: '父女', talk: {
    C: [
      ['xueer', '爹，你还记得你上次回家是什么时候吗？'],
      ['zhangqing', '……去年秋天？'],
      ['xueer', '是前年冬天！你连自己女儿几岁都快忘了吧！'],
      ['zhangqing', '十七……不，十八了。雪儿，爹知道对不起你。'],
      ['xueer', '哼。知道就好。等这一仗打完，罚你在家待满一整年，每天给我做饭！'],
      ['zhangqing', '……爹做的饭，你确定要吃？'],
    ],
    B: [
      ['zhangqing', '你的回复术，比我想的进步了很多。'],
      ['xueer', '那当然。没人教，只好自己对着书练，拿山里受伤的兔子练手。'],
      ['zhangqing', '雪儿……爹这些年追查黑暗军，是因为发现他们在找有魔力天分的孩子。'],
      ['xueer', '……所以你才不让我下山？'],
      ['zhangqing', '我怕他们找到你。结果，你还是自己跑到战场上来了。'],
      ['xueer', '因为我是张青的女儿嘛。……爹，下次有事，要先告诉我。'],
    ],
    A: [
      ['zhangqing', '雪儿，那个叫孟祈的年轻人——'],
      ['xueer', '他、他怎么了？我跟他什么事都没有喔！'],
      ['zhangqing', '我还什么都没问。'],
      ['xueer', '……'],
      ['zhangqing', '他的剑法毫无章法，可是每次你遇险，他总是第一个冲上去。这种人，爹看得上。'],
      ['xueer', '爹！谁要你看得上了啦！'],
      ['zhangqing', '哈哈哈……好，好。爹不说了。'],
    ],
  } },
  { a: 'oz', b: 'zhangqing', tag: '师徒', talk: {
    C: [
      ['oz', '张青大剑师！请、请收我为徒！我什么苦都能吃！'],
      ['zhangqing', '你逃离帝国军，就是为了学剑？'],
      ['oz', '是！在军中只学砍人，我想学真正的剑术！'],
      ['zhangqing', '先学会在这场仗里活下来。活下来的人，才有资格谈剑术。'],
      ['oz', '……是！我一定活下来！'],
    ],
    B: [
      ['zhangqing', '欧兹。刚才那一剑，你的左脚踏得太深了。'],
      ['oz', '咦？您……您在看我？'],
      ['zhangqing', '重心压在前脚，收剑就会慢半拍。对手若有第二个人，你已经死了。'],
      ['oz', '原来如此！所以要这样……踏半步，再转腰——'],
      ['zhangqing', '……嗯，这次对了。'],
      ['oz', '大剑师夸我了！史莱德！克莱恩！大剑师夸我了！'],
    ],
    A: [
      ['zhangqing', '欧兹，你还想拜师吗？'],
      ['oz', '想！做梦都想！'],
      ['zhangqing', '我的剑，是用来守护的剑。学了它，就不能再为了功名去砍人。你做得到吗？'],
      ['oz', '我做得到。在帝国军的时候，我就已经受够了。'],
      ['zhangqing', '好。等这一仗打完，到山里来找我。那时候，我从拿剑的方式开始教你。'],
      ['oz', '师……师父！弟子欧兹，一定不让您失望！'],
    ],
  } },
  { a: 'yangtie', b: 'liu', tag: '恩义', talk: {
    C: [
      ['yangtie', '刘队长，你不必时时守在我身边。我不是小孩子了。'],
      ['liu', '我欠你父亲一条命。在还清之前，你的安危就是我的责任。'],
      ['yangtie', '父亲帮人，从来不求回报。'],
      ['liu', '我知道。所以我更不能不还。'],
      ['yangtie', '……你和我父亲一样固执。'],
    ],
    B: [
      ['yangtie', '刘队长，能跟我说说父亲在宫里的样子吗？我只记得他在家里的模样。'],
      ['liu', '杨业大剑师……在朝堂上是出了名的直脾气。连大帝的酒宴，他都敢说「太奢侈」当场离席。'],
      ['yangtie', '哈，像他会做的事。'],
      ['liu', '可是他每次巡营，都会记得哪个小兵家里有病人，悄悄塞银子给他们。我就是那时候认识他的。'],
      ['yangtie', '……原来父亲在我不知道的地方，帮了这么多人。'],
      ['liu', '你和他很像。尤其是生气的时候，眉毛会挑起来。'],
    ],
    A: [
      ['yangtie', '刘队长，我想了很久。你的恩，早就还清了。'],
      ['liu', '杨铁……'],
      ['yangtie', '所以从今天起，我不想你因为报恩跟着我。我想你以伙伴的身份，和我并肩作战。'],
      ['liu', '……你知道吗，这句话，你父亲当年也对我说过。'],
      ['liu', '好。那就以伙伴的身份——不论你走到哪里，我的剑都会在你身侧。'],
    ],
  } },
  { a: 'wushuang', b: 'qu', tag: '君臣', talk: {
    C: [
      ['qu', '公主殿下！您又站到前排去了！万一伤着了，老臣如何向陛下交代！'],
      ['wushuang', '曲爷爷，火球术要靠近一点才打得准嘛。'],
      ['qu', '那就让老臣站在您前面！老臣这把骨头，还挡得住几下！'],
      ['wushuang', '不行，曲爷爷要站后面帮大家疗伤。……我答应你，下次不会冲太前面。'],
      ['qu', '这句话，殿下从七岁说到现在了。'],
    ],
    B: [
      ['qu', '看着殿下施法，老臣就想起您小时候第一次学火系魔法……'],
      ['wushuang', '不要讲那个！'],
      ['qu', '把王宫大厅的帘子全烧了，还哭着说是帘子自己着火的。'],
      ['wushuang', '曲爷爷！'],
      ['qu', '呵呵……如今殿下的火焰，已经能保护整个赤子国了。陛下若是看到，一定很欣慰。'],
      ['wushuang', '……等救出父王，我要第一个让他看。'],
    ],
    A: [
      ['qu', '殿下，老臣有个心愿，憋了很多年了。'],
      ['wushuang', '曲爷爷请说，只要我做得到。'],
      ['qu', '老臣想在退休之前，看到殿下穿上嫁衣。'],
      ['wushuang', '……曲爷爷！现在是在打仗耶！'],
      ['qu', '打仗才要早做打算。依老臣看，那位姓杨的年轻人虽然急躁了些，倒也——'],
      ['wushuang', '我、我去前面看看敌情！'],
      ['qu', '呵呵呵……殿下脸红了。'],
    ],
  } },
  { a: 'hao', b: 'lian', tag: '同门', talk: {
    C: [
      ['lian', '郝西瑟，你又在研究召唤术？那种引来异界生物的魔法，迟早会出事。'],
      ['hao', '又来了。莲乔伊，你那套「魔法要按书上写的用」的理论，打得赢黑暗军吗？'],
      ['lian', '书上写的东西，是几百年来无数魔法师用命换来的经验！'],
      ['hao', '那几百年前的魔法师，也是先从「书上没写」的东西开始研究的。'],
      ['lian', '……歪理。'],
    ],
    B: [
      ['hao', '你在写什么？这么厚一叠。'],
      ['lian', '魔法入门书。我想写一本连普通人也看得懂的书，让赤子国以外的人也能学魔法。'],
      ['hao', '普通人学魔法？那些老神官听到会气晕。'],
      ['lian', '所以才要写啊。……你笑什么？'],
      ['hao', '没什么。只是觉得，你也挺离经叛道的嘛。……喏，召唤术的笔记借你，别说是我给的。'],
    ],
    A: [
      ['lian', '郝西瑟，你的笔记我看完了。……写得比我想的严谨。'],
      ['hao', '你那是在夸我吧？难得。'],
      ['lian', '那本书，召唤篇我写不来。等战争结束，你愿意一起写吗？'],
      ['hao', '我的名字要写在你前面。'],
      ['lian', '想得美，按笔画排。'],
      ['hao', '……「郝」比「莲」少，还是我在前面。'],
      ['lian', '……你早就算好了吧！'],
    ],
  } },
  { a: 'dvra', b: 'kampeite', tag: '鹰与狼', talk: {
    C: [
      ['kampeite', '戴薇拉！刚才那个沙盗是我先看到的！'],
      ['dvra', '是我先打倒的。在天上看得清清楚楚，你还差三步才到。'],
      ['kampeite', '在天上飞当然快！在地上跑，狼族可不会输给任何人！'],
      ['dvra', '哦？那下一场比比看，谁先打倒敌人的头目。'],
      ['kampeite', '比就比！输的人帮大家扛一天行李！'],
    ],
    B: [
      ['dvra', '你今天话特别少。怎么了，狼族的勇士？'],
      ['kampeite', '……族里的长老说，我是这一代最强的。可是出来以后才知道，比我强的人到处都是。'],
      ['dvra', '那又怎样？'],
      ['kampeite', '我怕回去以后，大家会失望。'],
      ['dvra', '鹰族有句话：飞得最高的鹰，是摔得最多次的那一只。你摔够了，自然就飞得起来。'],
      ['kampeite', '……可是狼不会飞啊。'],
      ['dvra', '笨狼。我是在安慰你。'],
    ],
    A: [
      ['kampeite', '戴薇拉，等战争结束，你要回鹰族吗？'],
      ['dvra', '嗯。我喜欢没有人管的天空。'],
      ['kampeite', '那……我可以去鹰族的山崖找你吗？狼族的人从来没上去过。'],
      ['dvra', '鹰族的山崖可是很高的。爬得上来，我就请你吃烤羊。'],
      ['kampeite', '一言为定！到时候，换我带你去狼族的草原跑一整天！'],
      ['dvra', '……嗯，一言为定。'],
    ],
  } },
];
// [end g1]

// =====================================================================
// 支援对话 · 贰《复仇魔神》（女主角的好感度与支援点数相连）
// =====================================================================
SUP_TALK.g2 = [
  { a: 'qingfeng', b: 'eva', tag: '白骑士', s: true, rel: ['eva'], skill: ['coupleEva'], talk: {
    C: [
      ['qingfeng', '伊娃，刚才那支冷箭，是你替我挡下的吧？'],
      ['eva', '近卫队长保护女王陛下的使者，是分内之事。不必道谢。'],
      ['qingfeng', '可你的肩甲都裂了。'],
      ['eva', '铠甲裂了可以换。你要是倒下，陛下托付的事就没人去办了。'],
      ['qingfeng', '那下次换我走前面。'],
      ['eva', '……不准。你只要好好走在我看得见的地方就够了。'],
    ],
    B: [
      ['eva', '……'],
      ['qingfeng', '又在看赤子国的方向？'],
      ['eva', '陛下现在不知道怎么样了。我十四岁进近卫队，从来没有离开过她身边这么久。'],
      ['qingfeng', '无双陛下比谁都坚强。她把你派到我身边，是因为相信你能把我们都平安带回去。'],
      ['eva', '……你总是知道该说什么。'],
      ['qingfeng', '我只是说实话。还有一句实话——你也该偶尔让自己休息一下。'],
      ['eva', '近卫队长不需要休息。……不过，今晚的守夜，可以分你一半。'],
    ],
    A: [
      ['eva', '清风。我有话对你说，你不准笑。'],
      ['qingfeng', '我不笑。'],
      ['eva', '上一场仗，你被围住的时候……我第一次在战场上发抖。不是怕敌人，是怕你回不来。'],
      ['qingfeng', '伊娃……'],
      ['eva', '近卫队长应该为陛下而战，可是那一刻，我脑子里只有你。……我是不是不够格了？'],
      ['qingfeng', '能为别人害怕的人，才是真正的守护者。你从来都够格。'],
      ['eva', '……笨蛋。这种话，要说就早点说。'],
    ],
    S: [
      ['eva', '清风，这枚徽章，你收下。'],
      ['qingfeng', '这是……赤子近卫队长的银鸢徽章？'],
      ['eva', '入队那天，陛下亲手替我别上的。她说：「伊娃，去守护你最想守护的东西。」'],
      ['eva', '那时候我以为，那就是陛下。现在我知道了，还有另一个人。'],
      ['qingfeng', '……那我也向你发誓。从今以后，换我来守护你。'],
      ['eva', '近卫队长被人保护，传出去会被笑话的。……不过，只有你的话，被笑话也无所谓。'],
    ],
  } },
  { a: 'qingfeng', b: 'qiuyue', tag: '御风之剑', s: true, rel: ['qiuyue'], skill: ['coupleQiu'], talk: {
    C: [
      ['qingfeng', '秋月，这么晚还在练剑？'],
      ['qiuyue', '睡不着的时候，剑比人好相处。'],
      ['qingfeng', '那能陪我过几招吗？我想看看真正的御风剑法。'],
      ['qiuyue', '……你的剑太老实了。每一剑都在告诉对手「我要砍这里」。'],
      ['qingfeng', '这样不好吗？'],
      ['qiuyue', '对付坏人不好。……不过，当朋友的话，倒也不坏。拔剑吧。'],
    ],
    B: [
      ['qingfeng', '你刚才在城墙上，一直望着迦纳的方向。'],
      ['qiuyue', '多事。'],
      ['qingfeng', '是在想刑天吧。'],
      ['qiuyue', '……他教我剑的时候说过，剑客最忌回头。结果他自己先转身走了，走进了迦纳的王宫。'],
      ['qingfeng', '我不会问你还在不在乎他。我只想说，不管你想见他还是想斩他，我们都陪你去。'],
      ['qiuyue', '……你这个人，真是爱管闲事。可是，谢谢。'],
    ],
    A: [
      ['qiuyue', '清风，看好了。御风剑的第三式，「风不回头」。'],
      ['qingfeng', '……好快。剑停下来的时候，风才追上来。'],
      ['qiuyue', '我从没教过别人。这一式，本来只会和那个人一起用。'],
      ['qingfeng', '那为什么教我？'],
      ['qiuyue', '因为我想往前看了。风不回头——我也想试试，不回头是什么感觉。'],
      ['qingfeng', '我会好好学。下次并肩的时候，让你看看我的「风」。'],
    ],
    S: [
      ['qiuyue', '伸手。'],
      ['qingfeng', '这是……你束发的风带？'],
      ['qiuyue', '御风剑的传人，一生只把它交给一个人。以前我以为会是他。'],
      ['qiuyue', '可是这一路，替我挡剑的是你，听我说话的是你，陪我往前走的也是你。'],
      ['qiuyue', '这一次，我想为自己选一次。'],
      ['qingfeng', '……我会一直带着它。风往哪里吹，我就陪你去哪里。'],
      ['qiuyue', '……傻瓜。'],
    ],
  } },
  { a: 'qingfeng', b: 'yilinna', tag: '奥里的光', s: true, rel: ['yilinna'], skill: ['coupleYi'], talk: {
    C: [
      ['yilinna', '清风，你们是赤子国的人，为什么要为奥里拼命？'],
      ['qingfeng', '迦纳的魔爪伸到哪里，哪里就有人受苦。奥里也好，赤子也好，都一样。'],
      ['yilinna', '说得好听。可是战争结束，你们还是会回去的吧。'],
      ['qingfeng', '会。不过在那之前，我会看着奥里的王回到王座上。'],
      ['yilinna', '……那就请你说到做到。奥里人，已经被骗过太多次了。'],
    ],
    B: [
      ['qingfeng', '每天晚上，你都一个人在这里祈祷？'],
      ['yilinna', '为父王祈祷。迦纳的特使对他下了咒，他连我的名字都想不起来了。'],
      ['yilinna', '把我关进白塔的命令，是他亲手盖的印。……我知道那不是他，可还是好痛。'],
      ['qingfeng', '那今晚，我陪你一起祈祷吧。两个人的声音，神明比较听得见。'],
      ['yilinna', '……你明明不信这个。'],
      ['qingfeng', '我信你。'],
    ],
    A: [
      ['yilinna', '清风，大家都叫我「公主」。连凯蒂和杰诺也是。'],
      ['qingfeng', '那是因为奥里的人都敬爱你。'],
      ['yilinna', '我知道。可是有时候，我好像只剩下「公主」这个身分，没有人记得依琳娜是谁。'],
      ['qingfeng', '依琳娜。'],
      ['yilinna', '……！'],
      ['qingfeng', '喜欢看星星，祈祷时会偷偷睁一只眼，害怕的时候会抓紧裙角的依琳娜。我记得。'],
      ['yilinna', '……傻瓜。你什么时候看到我偷睁眼的。'],
    ],
    S: [
      ['yilinna', '清风，等奥里重见光明，你愿意留下来，看看奥里的春天吗？'],
      ['qingfeng', '奥里的春天？'],
      ['yilinna', '王城外的山坡会开满白色的花。小时候，我总是一个人去看。'],
      ['yilinna', '以后……我不想再一个人去了。'],
      ['qingfeng', '那就约好了。不只是今年的春天，往后的每一个春天，我都陪你去。'],
      ['yilinna', '……你可要说话算话。奥里的公主，可是很会记仇的。'],
    ],
  } },
  { a: 'qingfeng', b: 'furong', tag: '幻之花', s: true, rel: ['furong'], talk: {
    C: [
      ['furong', '清风，你知道吗？这种花叫「夜来香」，只在没有人看的时候开。'],
      ['qingfeng', '你懂的东西真多。是在家里学的吗？'],
      ['furong', '（微笑）闲书读得多罢了。'],
      ['qingfeng', '说起来，你从来没提过你的家人。'],
      ['furong', '……清风，有些花，太早被人看见，就会谢的。等时候到了，我再告诉你，好吗？'],
    ],
    B: [
      ['furong', '清风，我想问你一个问题。'],
      ['qingfeng', '嗯。'],
      ['furong', '如果一个人的父亲做了坏事，坏到全世界都不肯原谅……那个人，也是坏人吗？'],
      ['qingfeng', '父亲是父亲，她是她。一个人好不好，要看她自己走的路。'],
      ['furong', '……就算她一直对你们隐瞒？'],
      ['qingfeng', '那她一定有她的理由。我相信你说的「时候到了」。'],
      ['furong', '……你啊，真是个让人没办法的人。'],
    ],
    A: [
      ['furong', '你还记得我说过，太亮的东西最容易碎吗？'],
      ['qingfeng', '记得。那时你看着同调石的光。'],
      ['furong', '我其实一直很怕。怕有一天，你知道了我的一切，就不再这样看着我了。'],
      ['qingfeng', '芙蓉，我认识的你，会替受伤的地精包扎，会在别人难过时讲故事。这些都不是幻术。'],
      ['furong', '……清风。'],
      ['furong', '那，我也不再用幻术藏起来了。至少在你面前，我想做真正的自己。'],
    ],
    S: [
      ['furong', '清风，你看，夜来香开了。'],
      ['qingfeng', '你说过，它只在没有人看的时候开。'],
      ['furong', '大概是因为……它终于找到愿意一直等它开花的人了吧。'],
      ['furong', '不管我是谁的女儿，不管过去发生过什么，你都会这样看着我吗？'],
      ['qingfeng', '会。从今以后，我想一直这样看着你。'],
      ['furong', '……真狡猾。这样的话，我就再也离不开了啊。'],
    ],
  } },
  { a: 'qingfeng', b: 'bai', tag: '少年好友', talk: {
    C: [
      ['bai', '清风，还记得吗？小时候在迦纳的剑术场，我们偷溜出去看庙会，被教官罚扫了一个月的马厩。'],
      ['qingfeng', '是你说「只去一下下」的。'],
      ['bai', '明明是你说想看会喷火的艺人。'],
      ['qingfeng', '……好像是。'],
      ['bai', '哈哈哈！那时候真好。谁想得到，有一天我们会这样并肩作战。'],
    ],
    B: [
      ['bai', '……清风，你说，陛下他到底怎么了。'],
      ['qingfeng', '杨铁陛下吗？'],
      ['bai', '小时候他来剑术场巡视，还亲手扶起被打倒的我，说「剑士要先学会站起来」。那样的人……怎么会派兵烧赤子国的村子。'],
      ['qingfeng', '我也不相信。所以更要查清楚，是什么让他变成这样。'],
      ['bai', '……嗯。我是迦纳的剑士，可我效忠的，是那时候的陛下。'],
    ],
    A: [
      ['bai', '清风，要是有一天，迦纳的军队里出现我认识的人……'],
      ['qingfeng', '你会犹豫吗？'],
      ['bai', '会。但我不会退。我连夜赶来示警的时候就决定了——我站在对的那一边，不站在旗子那一边。'],
      ['qingfeng', '那我也答应你。不管迦纳变成什么样，你都是我的兄弟。'],
      ['bai', '哈，这句话我记下了。哪天你当了大英雄，可别装作不认识我。'],
    ],
  } },
  { a: 'eva', b: 'sonia', tag: '赤子姐妹', talk: {
    C: [
      ['sonia', '伊娃姐，你刚才又往清风那边看了三次。'],
      ['eva', '我是在确认使者的安全。'],
      ['sonia', '确认安全需要脸红吗？'],
      ['eva', '……索妮亚，你今天的箭是不是太多了？要不要去帮诺鲁扛行李？'],
      ['sonia', '哇，公报私仇！我要去告诉女王陛下！'],
    ],
    B: [
      ['sonia', '伊娃姐，教我用枪好不好？弓箭被近身就没办法了。'],
      ['eva', '近身就往后退，让前排的人去挡。弓手的本分是活着射下一箭。'],
      ['sonia', '可是我不想总是躲在大家后面嘛。'],
      ['eva', '……那，我教你一招。用弓身格开对方的刀，然后踢他的膝盖。'],
      ['sonia', '这招好像不太优雅耶，白骑士大人。'],
      ['eva', '活下来的骑士才有资格谈优雅。'],
    ],
    A: [
      ['sonia', '伊娃姐，你小时候也是孤儿吧？我听王城的老人说的。'],
      ['eva', '……嗯。是陛下——那时她还是公主殿下——把我从街上带回王宫的。'],
      ['sonia', '我也是。所以我一直觉得，伊娃姐就像我真正的姐姐。'],
      ['eva', '……索妮亚。'],
      ['sonia', '所以啊，姐姐的终身大事，妹妹当然要帮忙！清风那边，我去帮你探探口风——'],
      ['eva', '索、妮、亚！'],
    ],
  } },
  { a: 'dvra', b: 'judy', tag: '十年前的英雄', talk: {
    C: [
      ['judy', '戴薇拉，你还是一样，打起仗来就不顾自己。'],
      ['dvra', '你也一样，嘴巴还是那么不饶人。十年了，镜湖城的神箭手。'],
      ['judy', '十年了。……那时候我们一群人，跟着孟祈到处跑，谁想得到会是今天这样。'],
      ['dvra', '我也没想到，有一天要拿爪子对着杨铁。'],
    ],
    B: [
      ['dvra', '杨铁派来的刺客，差一点就割断了长老的喉咙。'],
      ['judy', '我在镜湖城也挡下好几批。……他连无双都下得了手。'],
      ['dvra', '你说，十年前那个会为了一个村子的人掉眼泪的家伙，到哪里去了？'],
      ['judy', '不知道。可是我不相信人会无缘无故变成那样。一定有什么东西在作怪。'],
      ['dvra', '……你也这么想？'],
      ['judy', '不然我早就一箭射过去了。'],
    ],
    A: [
      ['judy', '戴薇拉，等见到杨铁，你打算怎么办？'],
      ['dvra', '先揍他一顿。'],
      ['judy', '然后呢？'],
      ['dvra', '然后把他揍醒。十年前他欠我们一顿酒，这笔账还没算呢。'],
      ['judy', '哈……好。那我负责把他的腿射住，免得他跑了。'],
      ['dvra', '这才像我们当年的样子。'],
    ],
  } },
  { a: 'yilinna', b: 'jienuo', tag: '公主与骑士', talk: {
    C: [
      ['jienuo', '殿下。'],
      ['yilinna', '杰诺，你又在门外站了一整夜？'],
      ['jienuo', '属下……曾经奉陛下之命，看守白塔。如今只是换个方式守着殿下。'],
      ['yilinna', '那时候的事，我不怪你。你只是守着你的誓言。'],
      ['jienuo', '……正因为殿下不怪，属下才更无地自容。'],
    ],
    B: [
      ['yilinna', '杰诺，你知道吗？我托人带出去的信，后来怎么样了？'],
      ['jienuo', '……被迦纳特使当着属下的面，烧掉了。'],
      ['yilinna', '信上写的是「杰诺，请你相信你自己的眼睛」。'],
      ['jienuo', '…………'],
      ['yilinna', '你最后还是相信了。所以那封信，其实已经送到了。'],
      ['jienuo', '殿下……'],
    ],
    A: [
      ['jienuo', '殿下，属下想重新立誓。'],
      ['yilinna', '你的誓言，不是已经献给奥里的王了吗？'],
      ['jienuo', '那时属下以为，守住王座就是守住王。如今属下明白了——誓言要守护的，是人，不是位子。'],
      ['jienuo', '此身此枪，献给奥里，与奥里的公主依琳娜。直到属下倒下为止。'],
      ['yilinna', '……那就不准倒下。这是公主的命令。'],
      ['jienuo', '遵命。'],
    ],
  } },
  { a: 'shamanshan', b: 'qili', tag: '师徒', talk: {
    C: [
      ['qili', '小姑娘，你施法的时候手抖得像风中的树叶。'],
      ['shamanshan', '对、对不起！我一紧张就……'],
      ['qili', '道歉做什么。魔法又不会因为你道歉就变强。'],
      ['shamanshan', '……那要怎样才会变强？'],
      ['qili', '先把腰挺直。施法的人自己都不信，魔力怎么会信你？'],
    ],
    B: [
      ['qili', '你在兵器塔里，被逼着研究了些什么？'],
      ['shamanshan', '……把魔力灌进铁做的身体里，让它们自己动起来。老师说那是违背天理的东西。'],
      ['shamanshan', '老师不肯做，他们就不给他药。上个月……他就没撑过去。'],
      ['qili', '……'],
      ['qili', '你老师说得对。不过，你知道那些东西是怎么造的，也就知道怎么拆。这份本事，别丢了。'],
      ['shamanshan', '……嗯。'],
    ],
    A: [
      ['qili', '小姑娘，老夫在神殿里待了几十年，一个徒弟也没收过。'],
      ['shamanshan', '因为大家都被您打跑了吧？'],
      ['qili', '哈哈哈！你也学会顶嘴了。'],
      ['qili', '等打完这一仗，你要是没地方去，就来神殿吧。老夫会的东西，全教给你。'],
      ['shamanshan', '……真的吗？我、我一定会好好学！不会再让人把魔法拿去害人！'],
      ['qili', '嗯。腰挺直了，这次不错。'],
    ],
  } },
  { a: 'aifulin', b: 'laweisi', tag: '修女与蛊师', talk: {
    C: [
      ['laweisi', '往东走就是港口，我认得路。'],
      ['aifulin', '拉维司先生，你三天前也是这么说的，结果我们看到了一头鲸鱼。'],
      ['laweisi', '那头鲸鱼也是往港口游的，方向没错。'],
      ['aifulin', '……愿神原谅我，我刚才有一瞬间想用圣典打你。'],
    ],
    B: [
      ['aifulin', '拉维司先生，教会的书上说，蛊术是用毒虫害人的邪术。'],
      ['laweisi', '书上还说，修女不会想用圣典打人。'],
      ['aifulin', '那、那是例外！'],
      ['laweisi', '蛊也一样。同一只虫，能让人发疯，也能把人身上的毒吸出来。南方的村子没有大夫，生病全靠它。'],
      ['aifulin', '……所以迦纳想抓你去养「战蛊」，你才宁可跳海？'],
      ['laweisi', '虫没有错。错的是拿它去杀人的家伙。'],
    ],
    A: [
      ['aifulin', '拉维司先生，上次那个村子的孩子，烧已经退了。'],
      ['laweisi', '是你的祈祷有用。'],
      ['aifulin', '是你的蛊虫先把毒吸干净，我的治疗术才派得上用场。'],
      ['laweisi', '……修女小姐，你这是在承认蛊术不是邪术？'],
      ['aifulin', '我是在承认，你是个好人。……还有，下次问路，我来问。'],
      ['laweisi', '哈，成交。'],
    ],
  } },
];
// [end g2]

// =====================================================================
// 支援对话 · 外传《北方密使》
// =====================================================================
SUP_TALK.g3 = [
  { a: 'bai', b: 'natalia', tag: '北斗', s: true, rel: ['natalia', 'bai'], skill: ['northStar', 'northStarN'], talk: {
    C: [
      ['natalia', '喂，北方来的。别以为帮我们打了几仗，我就会相信你。'],
      ['bai', '我没要你相信。我只是不想看到村子被烧。'],
      ['natalia', '说得好听。南方领的官兵当初也说是来「保护」我们的。'],
      ['bai', '我不是南方领的人。'],
      ['natalia', '北方人、南方人，在我看来都一样——都是拿着剑闯进别人家的人。'],
      ['bai', '……那就看着吧。看我的剑会砍向谁。'],
    ],
    B: [
      ['natalia', '你守夜守得倒挺认真。'],
      ['bai', '睡不着。'],
      ['natalia', '我问你，你为什么那么在意奚族的事？这又不是你的任务。'],
      ['bai', '几年前，我在复仇魔神之战里，看过整座整座的城被烧掉。那些人到死都不知道，自己是为了什么而死。'],
      ['bai', '这里的战争也一样。没有人说得清为什么要打。……我不想再看一次。'],
      ['natalia', '……原来北方人也会说这种话。'],
      ['natalia', '下半夜换我守。你去睡，这是命令。'],
    ],
    A: [
      ['natalia', '白志超，抬头。看到那七颗星了吗？'],
      ['bai', '北斗。在迦纳也看得到。'],
      ['natalia', '奚族的孩子迷路了，就找北斗的勺柄，跟着它走就能回家。'],
      ['bai', '……对我来说，那是回北方的方向。'],
      ['natalia', '……是喔。'],
      ['natalia', '之前说你跟南方领一样，是我错了。……就这样，我只说一次。'],
      ['bai', '我听到了。'],
    ],
    S: [
      ['bai', '娜塔莉亚。'],
      ['natalia', '干嘛突然叫这么正式。'],
      ['bai', '我想了很久，北斗在这里也看得见。那北方和这片草原，其实也没差多远。'],
      ['natalia', '……你到底想说什么？'],
      ['bai', '任务结束以后，我想留下来。在看得见北斗的地方——你的身边。'],
      ['natalia', '……笨蛋。这种话，北方人都这么直接说的吗？'],
      ['natalia', '那你就留下来吧。不过先说好，奚族的男人，可是要会骑马、会射箭、还要会烤羊的。'],
    ],
  } },
  { a: 'xingtian', b: 'qiuyue', tag: '有无相生', s: true, rel: ['qiuyue'], skill: ['youwu'], talk: {
    C: [
      ['qiuyue', '刑天，刚才那个敌将明明已经投降了，你还要逼他拔剑？'],
      ['xingtian', '他手里的刀还没放下。'],
      ['qiuyue', '那是吓得手抖！你就是想试试「天清」。'],
      ['xingtian', '……一半一半。'],
      ['qiuyue', '真是的。我当初怎么会看上一个满脑子只有剑的人。'],
    ],
    B: [
      ['xingtian', '秋月，那几年……我在迦纳替那个被操纵的国王卖命，杀了很多不该杀的人。'],
      ['qiuyue', '……我知道。'],
      ['xingtian', '复仇魔神倒下以后，我本来不打算再拿剑了。'],
      ['qiuyue', '可你还是拿了。为了那些被南方领烧掉家的人。'],
      ['xingtian', '还不清的。'],
      ['qiuyue', '那就用剩下的日子慢慢还。我陪你一起还。'],
    ],
    A: [
      ['qiuyue', '「天清」与「地宁」，是成对的古剑。一把太锐，一把太钝，单独用都会出事。'],
      ['xingtian', '像我们。'],
      ['qiuyue', '……你今天倒是很会说话。'],
      ['xingtian', '我的剑太快，常常停不下来。你的风太柔，常常斩不断。'],
      ['qiuyue', '所以要一起用。有与无，快与慢，相生相成——这就是「有无相生」。'],
      ['xingtian', '嗯。下次出剑，我等你的风。'],
    ],
    S: [
      ['xingtian', '秋月。'],
      ['qiuyue', '嗯？'],
      ['xingtian', '这一路云游，我一直在找一个能放下剑的地方。'],
      ['qiuyue', '找到了吗？'],
      ['xingtian', '……找到了。不是地方，是人。'],
      ['xingtian', '这场仗打完，我们不走了。找个看得见山的地方住下来。'],
      ['qiuyue', '……刑天，你刚才说「不走了」，是真的吧？'],
      ['xingtian', '我说过的话，什么时候不算数过。'],
    ],
  } },
  { a: 'bai', b: 'feishuang', tag: '护卫与密使', talk: {
    C: [
      ['feishuang', '白志超，这是你出发以来第四次擅自离队。'],
      ['bai', '那个老婆婆的屋顶漏水，总不能不管。'],
      ['feishuang', '我们是密使！「低调观察，不许惹事」！你修屋顶修到全村都认识你了！'],
      ['bai', '……下次我会低调地修。'],
      ['feishuang', '问题不是那个！'],
    ],
    B: [
      ['feishuang', '……你又去帮人了？'],
      ['bai', '嗯。顺手。'],
      ['feishuang', '其实，我有点羡慕你。'],
      ['bai', '羡慕？'],
      ['feishuang', '我从小就被教导：命令就是一切，规矩就是一切。我从来没有想过，命令以外的事。'],
      ['feishuang', '可是看到那些被你帮过的人笑的样子，我开始搞不清楚，到底谁才是对的。'],
      ['bai', '你不用搞清楚。你守你的规矩，我闯我的祸。这样才刚好。'],
    ],
    A: [
      ['feishuang', '白志超，我想通了。'],
      ['bai', '想通什么？'],
      ['feishuang', '议会给我的命令是「保护南巡使」。……可是保护你，比保护命令更重要。'],
      ['bai', '飞霜……'],
      ['feishuang', '所以下次你要擅自行动之前，先告诉我一声。我陪你一起去。'],
      ['feishuang', '……毕竟要是你闯祸被抓了，写报告的人还是我。'],
    ],
  } },
  { a: 'bai', b: 'aiwen', tag: '拦路虎', talk: {
    C: [
      ['aiwen', '白志超！再跟我比一场！上次是我脚滑！'],
      ['bai', '你上上次说是太阳太刺眼。'],
      ['aiwen', '那次也是真的！'],
      ['bai', '……打完这仗再说。'],
      ['aiwen', '好！说定了！我会监视你的，别想偷偷跑掉！'],
    ],
    B: [
      ['bai', '艾文，你为什么只劫贪官的车队？'],
      ['aiwen', '……我爹以前是个小县的捕快。他抓了一个收贿的官，结果被那个官反咬一口，冤死在牢里。'],
      ['aiwen', '那时候我就发誓，这世上没人管的事，我拦路虎来管。'],
      ['bai', '所以你才说要「监视」我。'],
      ['aiwen', '议会派来的人，谁知道是好是坏。……不过你啊，到现在还没让我失望。'],
    ],
    A: [
      ['aiwen', '白志超，我想了想，不监视你了。'],
      ['bai', '终于要走了？'],
      ['aiwen', '谁说要走！我是说……以后改成「跟着」你。你这家伙，到哪里都在管闲事，身边总得有个能打的。'],
      ['bai', '……谢了，艾文。'],
      ['aiwen', '不过比剑的事还没完！等仗打完，我们堂堂正正再比一次！'],
      ['bai', '好。那次我不会手下留情。'],
    ],
  } },
  { a: 'bai', b: 'luosha', tag: '一命之债', talk: {
    C: [
      ['luosha', '我一直想问你。那时候，为什么放我走？'],
      ['bai', '你只是收钱办事。真正想要南巡使命的人，不是你。'],
      ['luosha', '天真。要是我回头又来杀你呢？'],
      ['bai', '那你早就动手了。'],
      ['luosha', '……哼。随便你。'],
    ],
    B: [
      ['luosha', '我七岁就被卖到组织里。学的第一件事，是怎么让人看不见我。'],
      ['bai', '所以你的眼睛才那么尖。'],
      ['luosha', '看不见别人的人，活不过第一年。我看得见每一把藏起来的刀，每一个说谎的人。'],
      ['luosha', '……可是我看不懂你。你身上没有藏东西。这种人，我第一次遇到。'],
      ['bai', '那就慢慢看吧。看久了就懂了。'],
    ],
    A: [
      ['luosha', '白志超，这条命，我算还清了吗？'],
      ['bai', '你替我挡了那么多暗器，早就还清了。你随时可以走。'],
      ['luosha', '……是吗。'],
      ['luosha', '那么，从现在开始的这些——不算还债。'],
      ['bai', '什么意思？'],
      ['luosha', '意思是我想留下来，不收钱。……这种事别让我说第二次。'],
    ],
  } },
  { a: 'natalia', b: 'su', tag: '奚族姐妹', talk: {
    C: [
      ['su', '娜塔莉亚，今天的卦象说，你会遇到一个北方来的有缘人。'],
      ['natalia', '苏！不要随便帮我算这种东西！'],
      ['su', '我没有随便。先祖的灵自己告诉我的。'],
      ['natalia', '那叫他们少管闲事！'],
      ['su', '（微笑）好，我会转告他们的。'],
    ],
    B: [
      ['su', '你昨晚又没睡。'],
      ['natalia', '……采石场里还关着那么多族人。我是队长，不能睡。'],
      ['su', '队长也是人。你倒下了，大家才真的会乱。'],
      ['natalia', '可是我怕。苏，我好怕哪一天，我的判断害死了大家。'],
      ['su', '那就让我们分担。这个小队，不是你一个人的。'],
      ['natalia', '……嗯。谢谢你，苏。'],
    ],
    A: [
      ['natalia', '苏，你还记得我们小时候，第一次偷跑去圣地吗？'],
      ['su', '记得。你说要去「抓先祖的灵」，结果被大长老拎着耳朵拖回来。'],
      ['natalia', '那时候你一直哭，可是没有放开我的手。'],
      ['su', '因为你说过，奚族的姐妹，走到哪里都要一起。'],
      ['natalia', '……这句话，现在也算数。'],
      ['su', '嗯。先祖的灵也是这么说的。'],
    ],
  } },
  { a: 'muer', b: 'taipu', tag: '冲锋与谋略', talk: {
    C: [
      ['muer', '泰普！前面那群佣兵，直接冲过去砍就是了！'],
      ['taipu', '他们的弓手在右边山坡上。你冲过去，会被射成刺猬。'],
      ['muer', '那就先砍弓手！'],
      ['taipu', '……穆尔，你知道「绕路」这两个字吗？'],
      ['muer', '知道啊。可是绕路很慢！'],
    ],
    B: [
      ['muer', '……泰普，上次在狼谷，谢了。'],
      ['taipu', '哪一次？'],
      ['muer', '我冲太前面，被狼王扑倒的那次。是你一箭射中它的眼睛。'],
      ['taipu', '喔，那次啊。你倒下的时候还在骂它，我听了就知道你死不了。'],
      ['muer', '……哈哈哈！你这家伙！'],
    ],
    A: [
      ['taipu', '穆尔，我想到一个打法。你在正面闹，闹得越大越好。'],
      ['muer', '闹大？这个我最在行！'],
      ['taipu', '敌人都会盯着你。这时候，我从侧面绕过去，射倒他们的头目。'],
      ['muer', '所以……我负责冲，你负责想？'],
      ['taipu', '我负责想，你负责活着。你倒下了，我的计划就全白费了。'],
      ['muer', '放心！奚族最强的战士，可没那么容易倒！'],
    ],
  } },
  { a: 'daixi', b: 'baoer', tag: '小小家人', talk: {
    C: [
      ['baoer', '戴西姐姐！教宝儿在屋顶上跑好不好！'],
      ['daixi', '不行。你会摔下去。'],
      ['baoer', '宝儿不会！宝儿在亚修斯的时候，常常爬到面包店的屋顶上躲坏人！'],
      ['daixi', '……那更不行。以后不准一个人爬那么高。'],
      ['baoer', '那……和戴西姐姐一起爬就可以了吗？'],
      ['daixi', '……先学会认字。泰普会教你。'],
    ],
    B: [
      ['baoer', '戴西姐姐，宝儿听人家说，一直当小孩子，就会变成「宝儿神」喔！'],
      ['daixi', '谁告诉你的？'],
      ['baoer', '街上的老爷爷。所以宝儿不要长大！'],
      ['daixi', '……宝儿。你不用变成神。你只要好好长大，吃饱，睡暖，就够了。'],
      ['baoer', '可是长大了，就不能跟着姐姐了吧？'],
      ['daixi', '长大了也可以。长大了，换你跟我一起去侦察。'],
    ],
    A: [
      ['baoer', '戴西姐姐，宝儿以前没有家。'],
      ['daixi', '……我知道。'],
      ['baoer', '可是现在，有戴西姐姐，有泰普哥哥，有娜塔莉亚大姐姐……宝儿觉得，这就是宝儿的家了。'],
      ['daixi', '…………'],
      ['baoer', '姐姐？你在哭吗？'],
      ['daixi', '没有。是沙子进了眼睛。……宝儿，等仗打完，我们一起回草原。那里的星星，比亚修斯多一百倍。'],
    ],
  } },
  { a: 'aopaer', b: 'natalia', tag: '沙漠明珠', talk: {
    C: [
      ['natalia', '南方领主的女儿？你跟着我们做什么？'],
      ['aopaer', '我想亲眼看看，南方领的军队到底对奚族做了什么。'],
      ['natalia', '看了又怎样？你父亲会把采石场还给我们吗？'],
      ['aopaer', '……我不知道。但如果我连看都不敢看，就永远不会有人去改变它。'],
      ['natalia', '……哼，说得倒是好听。'],
    ],
    B: [
      ['aopaer', '娜塔莉亚，那个村子……我在父亲的军令上看过那个名字。'],
      ['natalia', '……'],
      ['aopaer', '我那时候以为，那只是一个地图上的名字。对不起。这一句道歉，什么都换不回来，可是我还是想说。'],
      ['natalia', '你知道吗，在奚族，道歉的人要亲手替对方挖一口井。'],
      ['aopaer', '那我就挖。挖到你原谅为止。'],
      ['natalia', '……贵族千金拿得动铲子吗？'],
    ],
    A: [
      ['aopaer', '娜塔莉亚，等这一切结束，我想让南方领和奚族订一个约定。'],
      ['natalia', '什么约定？'],
      ['aopaer', '不再有人因为出身被抓去采石场。不再有村子被烧。……由我们两个人，先订下来。'],
      ['natalia', '我们两个？我只是个小队长。'],
      ['aopaer', '我也只是个被叫作叛徒的千金。可是总要有人先开始。'],
      ['natalia', '……好。那就从我们开始。你挖的那口井，我会去喝第一口水。'],
    ],
  } },
  { a: 'lan', b: 'xingtian', tag: '武之极', talk: {
    C: [
      ['lan', '……你的剑。让我看。'],
      ['xingtian', '看什么？'],
      ['lan', '剑气。听说十步之外也能斩人。'],
      ['xingtian', '传言夸大了。只有八步。'],
      ['lan', '……够了。'],
    ],
    B: [
      ['lan', '比一场。'],
      ['xingtian', '……你出拳，我收剑。只比身法。'],
      ['lan', '好。'],
      ['', '两人在空地上交手了一炷香的时间，谁都没有碰到对方。'],
      ['xingtian', '你的拳，在最后一寸会停。为什么？'],
      ['lan', '……再往前，就会杀人。'],
      ['xingtian', '哈。原来你也知道。'],
    ],
    A: [
      ['lan', '刑天。剑的尽头，是什么？'],
      ['xingtian', '我以为是最快的一剑。追了半辈子，追到最后，发现斩下去的都是不该斩的东西。'],
      ['lan', '……那现在？'],
      ['xingtian', '现在我觉得，剑的尽头，是知道什么时候收剑。'],
      ['lan', '……拳也一样。'],
      ['xingtian', '你会走到的。你的拳，比我当年的剑干净多了。'],
    ],
  } },
];
// [end g3]

// =====================================================================
// 支援对话 · 叁《狂神降世》
// =====================================================================
SUP_TALK.g4 = [
  { a: 'kehelin', b: 'beiliqina', tag: '失落的祭司', s: true, rel: ['beiliqina'], skill: ['ancientGolem', 'ancientGolemB'], talk: {
    C: [
      ['beiliqina', '克荷林……你以前，是什么样的人？'],
      ['kehelin', '怎么突然问这个？'],
      ['beiliqina', '我什么都想不起来。所以想知道，别人记得的自己，是什么样子。'],
      ['kehelin', '我以前……是博丰领主家最不成材的么子。整天逃课去港口看船。'],
      ['beiliqina', '……噗。'],
      ['kehelin', '你笑了。'],
      ['beiliqina', '嗯。原来我会笑。……这个，我想记住。'],
    ],
    B: [
      ['beiliqina', '我又梦到了那个地方。很深、很暗，有什么东西在呼吸，一直在叫我过去。'],
      ['kehelin', '你在发抖。'],
      ['beiliqina', '他们说我是「钥匙」。如果有一天，我自己走进那个洞里，再也不回来……'],
      ['kehelin', '那我就跟着进去，把你拉出来。'],
      ['beiliqina', '……你不怕吗？'],
      ['kehelin', '怕。可是比起那个，我更怕你一个人在黑暗里。'],
    ],
    A: [
      ['beiliqina', '克荷林，你知道吗？和你在一起的时候，那些声音就会变小。'],
      ['kehelin', '声音？'],
      ['beiliqina', '地底的、风里的、火里的……四元素一直在跟我说话。只有你身边，是安静的。'],
      ['kehelin', '贝里奇娜，你听好。不管那些人说你是祭司、是钥匙、还是什么——'],
      ['kehelin', '在我眼里，你就只是贝里奇娜。会在城里被人群吓到，会偷偷对着咕鲁鲁笑的贝里奇娜。'],
      ['beiliqina', '……嗯。那我就只当贝里奇娜。'],
    ],
    S: [
      ['beiliqina', '克荷林，如果……如果有一天我又忘了一切，连你也忘了——'],
      ['kehelin', '那我就再告诉你一次。'],
      ['beiliqina', '要是又忘了呢？'],
      ['kehelin', '那就再说一次。一千次，一万次。直到你烦了为止。'],
      ['beiliqina', '……我不会烦的。'],
      ['beiliqina', '那，你先说第一次吧。……我想记住你现在的声音。'],
      ['kehelin', '贝里奇娜。我喜欢你。从深山里遇见你的那一天起。'],
    ],
  } },
  { a: 'kehelin', b: 'kouqi', tag: '并肩之花', s: true, rel: ['kouqi'], skill: ['d4_twinBlossom'], talk: {
    C: [
      ['kouqi', '少～主～今天的作战会议开完啦？'],
      ['kehelin', '寇琪。我说过不要那样叫。'],
      ['kouqi', '可是努莎伊都这样叫嘛。「少主小心！」「少主请！」好威风喔。'],
      ['kehelin', '博丰已经没有少主了。这里只有血狮鹫兵团。'],
      ['kouqi', '是是是，团长大人最严肃了。……那团长大人，晚饭吃什么？'],
    ],
    B: [
      ['kehelin', '寇琪，你为什么会加入兵团？你又不是博丰人。'],
      ['kouqi', '……我的村子被海盗烧了。逃到西风岛的时候，饿了三天。'],
      ['kouqi', '是兵团在码头分粥。那个分粥的笨蛋团长，自己一口都没吃，全给了难民。'],
      ['kehelin', '……我不记得了。'],
      ['kouqi', '你当然不记得，你分了几百碗。可是我记得。所以我就决定，要跟着这个笨蛋。'],
    ],
    A: [
      ['kehelin', '寇琪，刚才在城墙上，你一直在发抖。'],
      ['kouqi', '才、才没有！那是风大！'],
      ['kehelin', '你每次害怕，就会开更多玩笑。'],
      ['kouqi', '……被你发现了。'],
      ['kouqi', '我也会怕啊。怕兵团的大家受伤，怕你哪天一个人往前冲就回不来。……不开玩笑的话，我会撑不下去。'],
      ['kehelin', '那以后害怕的时候，就站到我旁边来。不用开玩笑也没关系。'],
      ['kouqi', '……团长，你这样很犯规耶。'],
    ],
    S: [
      ['kouqi', '团长，如果哪天你不当团长了，要做什么？'],
      ['kehelin', '没想过。大概……去港口看船吧。像小时候那样。'],
      ['kouqi', '那我陪你去。我们买一艘小船，去看海。看西风岛那边的海，看我老家那边的海。'],
      ['kehelin', '……寇琪。'],
      ['kouqi', '不准拒绝喔。这次我是认真的，一点玩笑都没开。'],
      ['kehelin', '我不会拒绝的。等这一切结束，我们一起去看海。'],
      ['kouqi', '……嘿嘿。这下兵团的大家，要改口叫我「团长夫人」了。'],
    ],
  } },
  { a: 'maisi', b: 'lida', tag: '青梅竹马', s: true, skill: ['stormShot'], talk: {
    C: [
      ['lida', '麦、麦斯。这是我新调的伤药，你手上的伤……'],
      ['maisi', '不用。小伤。'],
      ['lida', '可是那是被毒箭擦到的……'],
      ['maisi', '……放那里吧。'],
      ['lida', '嗯！要、要一天擦三次喔！'],
      ['maisi', '知道了。……谢谢。'],
    ],
    B: [
      ['lida', '麦斯，你昨晚又一个人在擦弓。'],
      ['maisi', '艾普洛的人还活着一天，我就睡不着。'],
      ['lida', '……等你报完仇以后呢？'],
      ['maisi', '以后？'],
      ['lida', '报完仇以后，你想做什么？……我只是想知道，那时候的你，还会不会笑。'],
      ['maisi', '…………'],
      ['maisi', '我没想过。……也许，该想一想了。'],
    ],
    A: [
      ['maisi', '丽妲，你上次说想开一间炼金工坊？'],
      ['lida', '咦？你、你听到了？'],
      ['maisi', '小小的那种，门口要挂铃铛，窗台上要种薄荷。你小时候就这么说过。'],
      ['lida', '……你还记得。'],
      ['maisi', '等这一切结束，我帮你搬药罐。重的我来扛。'],
      ['lida', '……！（脸一下子红到了耳根）'],
    ],
    S: [
      ['lida', '麦斯，我、我有话要说！你不准走！'],
      ['maisi', '……我没要走。'],
      ['lida', '我从很小很小的时候，就……就……'],
      ['maisi', '丽妲。'],
      ['maisi', '我知道。我一直都知道。只是我以前满脑子只有仇恨，觉得自己没有资格。'],
      ['maisi', '……工坊的门口，挂两个铃铛吧。一个你的，一个我的。'],
      ['lida', '……嗯！'],
    ],
  } },
  { a: 'kehelin', b: 'maisi', tag: '挚友', talk: {
    C: [
      ['maisi', '克荷林，你又在地图上画圈了。'],
      ['kehelin', '下一个据点。你觉得从哪边攻比较好？'],
      ['maisi', '哪边都好。只要那里有艾普洛的兵。'],
      ['kehelin', '……麦斯。'],
      ['maisi', '我知道你要说什么。不用说。'],
    ],
    B: [
      ['kehelin', '麦斯，我们小时候在博丰的山上，比谁先射中那棵老松树的松果，你记得吗？'],
      ['maisi', '你一次都没赢过。'],
      ['kehelin', '因为你每次都偷偷提早放箭。'],
      ['maisi', '……那时候，最大的烦恼就是输了要请对方吃烤鱼。'],
      ['kehelin', '那些日子，被艾普洛抢走了。可是我不想连你也被仇恨抢走。'],
      ['maisi', '……克荷林。我会试着，看清楚自己要射的是什么。'],
    ],
    A: [
      ['maisi', '克荷林。不管你最后要去哪里——复仇也好，找真相也好。'],
      ['kehelin', '嗯。'],
      ['maisi', '你的背后，交给我。只要我的弓还在，就不会有一支箭射到你身上。'],
      ['kehelin', '那你的背后，也交给我。'],
      ['maisi', '……哈。说好了，这次换你请吃烤鱼。'],
    ],
  } },
  { a: 'kehelin', b: 'tao', tag: '团长与军师', talk: {
    C: [
      ['tao', '团长，你刚才那个冲锋，是想让我的计划全部作废吗？'],
      ['kehelin', '左翼的村民来不及撤离。'],
      ['tao', '我知道。所以我原本的计划里，左翼是寇琪去救。你冲过去，害她差点撞到你。'],
      ['kehelin', '……抱歉。'],
      ['tao', '道歉留着吧。下次冲之前，先看我一眼。我会用眼神骂你。'],
    ],
    B: [
      ['kehelin', '陶，你眼下的那道疤……'],
      ['tao', '年轻时的炼金实验。我想做出能让庄稼不怕霜冻的药，结果把整间实验室炸上了天。'],
      ['kehelin', '原来你也有想做好事的时候。'],
      ['tao', '团长，我一直都想做好事。只是我发现，做好事最有效的方法，是先把坏人打倒。'],
      ['tao', '……还有，这道疤让我看起来很聪明，所以我不打算治。'],
    ],
    A: [
      ['tao', '团长，我想问你一个问题。为什么把军师的位子交给我？'],
      ['kehelin', '因为你是兵团里唯一敢当面骂我的人。'],
      ['tao', '……就这样？'],
      ['kehelin', '一个只会说「是」的军师，会把兵团带进坟墓。我需要有人在我走错路的时候，把我拉回来。'],
      ['tao', '……哼。那我就勉为其难，继续当这个毒舌军师吧。'],
      ['tao', '不过先说好，团长，你要是哪天真的走错了，我骂得会比现在更难听。'],
    ],
  } },
  { a: 'bobi', b: 'kouqi', tag: '搭档', skill: ['chaosPulse', 'chaosPulseB'], talk: {
    C: [
      ['bobi', '寇琪寇琪！一、二……二点五，后面是什么？'],
      ['kouqi', '是三啦！昨天不是才教过你吗？'],
      ['bobi', '三！波比记住了！……那三后面呢？'],
      ['kouqi', '……我们今天先学到三就好。'],
      ['bobi', '好！波比今天学会了三！波比好聪明！'],
    ],
    B: [
      ['kouqi', '波比，你刚才干嘛挡在我前面？那一斧头差点劈到你头上！'],
      ['bobi', '因为寇琪个子小，被劈到会坏掉。波比个子大，劈到只会痛。'],
      ['kouqi', '……谁个子小啊！'],
      ['bobi', '寇琪不要生气。波比也会痛的，所以寇琪要帮波比擦药。'],
      ['kouqi', '……笨蛋。手伸出来啦。'],
    ],
    A: [
      ['kouqi', '波比，我跟你说喔，大家都觉得我老是在捉弄你。'],
      ['bobi', '有吗？波比觉得寇琪在教波比东西。'],
      ['kouqi', '……其实，你是我在兵团里第一个朋友。刚来的时候，大家都很忙，只有你会陪我说话。'],
      ['bobi', '波比也是！寇琪是波比最好的朋友！第一好！'],
      ['kouqi', '那，以后也要一起打坏人喔。我负责砍，你负责……'],
      ['bobi', '波比负责很大声地「哇——」！'],
      ['kouqi', '……对，就是那样。'],
    ],
  } },
  { a: 'kehelin', b: 'guluru', tag: '妈妈与幼龙', talk: {
    C: [
      ['guluru', '咕噜！咕噜噜！（用脑袋拼命蹭克荷林的脸）'],
      ['kehelin', '好了好了，咕鲁鲁，我知道你饿了。'],
      ['tao', '团长，那条龙又把你当成妈妈了。'],
      ['kehelin', '……我已经放弃纠正它了。'],
      ['guluru', '咕噜～（满足地趴在克荷林的脚边）'],
    ],
    B: [
      ['kehelin', '咕鲁鲁，你今天在战场上喷的火，比上次大多了。'],
      ['guluru', '咕噜！（得意地挺起胸膛）'],
      ['kehelin', '不过你冲太前面了。被那个骑士的枪刺到怎么办？'],
      ['guluru', '咕……（尾巴垂了下来）'],
      ['kehelin', '……我不是在骂你。是在担心你。下次跟在我身边，好吗？'],
      ['guluru', '咕噜噜！（用尾巴轻轻缠住克荷林的手臂）'],
    ],
    A: [
      ['', '夜里，克荷林发现咕鲁鲁一直蜷在帐篷门口，面朝外头。'],
      ['kehelin', '咕鲁鲁？怎么不进来睡？'],
      ['guluru', '咕噜。（往外看了看，又回头看了看克荷林）'],
      ['kehelin', '……你在守夜？守着我？'],
      ['guluru', '咕噜噜！（用力点头，喷出一小团火星）'],
      ['kehelin', '……真是的。好，那今晚我们一起守。'],
    ],
  } },
  { a: 'pulusi', b: 'baihe', tag: '影与谜', talk: {
    C: [
      ['pulusi', '百合，你看，月亮是圆的。可是我们看到的，永远只有它的一面。'],
      ['baihe', '……'],
      ['pulusi', '她的意思是「是」。'],
      ['kouqi', '她什么都没说啊！'],
      ['pulusi', '没说的话，才是最真的话。'],
    ],
    B: [
      ['baihe', '……普鲁丝。'],
      ['pulusi', '嗯？'],
      ['baihe', '穗海镇……那些人，是用我的脸去杀的。'],
      ['pulusi', '我知道。面具底下的那个人，不是你。'],
      ['baihe', '……可是镇上的人，记住的是我的脸。'],
      ['pulusi', '那就让他们记住第二张——替他们讨回公道的那一张。'],
    ],
    A: [
      ['pulusi', '百合，你从来不问我为什么什么都知道。'],
      ['baihe', '……你想说，自然会说。'],
      ['pulusi', '有一天，我说的谜语会全部解开。到那时候，你也许会讨厌我。'],
      ['baihe', '……不会。'],
      ['pulusi', '为什么这么肯定？'],
      ['baihe', '……穗海镇那晚，只有你朝我伸出手。我只要记得这个。'],
      ['pulusi', '……那就够了。'],
    ],
  } },
  { a: 'kehelin', b: 'nushayi', tag: '少主与骑士', talk: {
    C: [
      ['nushayi', '少主！前方的侦察已经完成了！'],
      ['kehelin', '努莎伊，我说过，叫我团长就好。'],
      ['nushayi', '是，少……团、团长！'],
      ['kehelin', '……慢慢来吧。'],
      ['nushayi', '对不起！在城里等了三年，每天晚上都在心里练习「少主，您回来了」，一时改不过来！'],
    ],
    B: [
      ['kehelin', '奥兰爵士……你父亲，最后说了什么？'],
      ['nushayi', '他要我假装归顺艾普洛，留在城里，等您回来。'],
      ['nushayi', '还有一句：「告诉少主，博丰不需要复仇的领主，需要能让大家回家的人。」'],
      ['kehelin', '……奥兰爵士他，一直都比我看得远。'],
      ['nushayi', '所以我才等了三年。因为我相信，父亲等的人，一定会回来。'],
    ],
    A: [
      ['nushayi', '团长。……我终于叫顺了。'],
      ['kehelin', '辛苦你了。'],
      ['nushayi', '我想了很久。我以前一直以为，我是在为「少主」战斗。'],
      ['nushayi', '可是跟着兵团一路走来，我看到您为了素不相识的难民拼命，为了敌人的士兵手下留情。'],
      ['nushayi', '我现在是为了「克荷林团长」战斗。不是因为您的出身，是因为您这个人。'],
      ['kehelin', '……谢谢你，努莎伊。奥兰爵士若是在，也会以你为荣。'],
    ],
  } },
  { a: 'maisi', b: 'xianniya', tag: '神射手', skill: [], talk: {
    C: [
      ['xianniya', '你就是兵团的神射手？刚才那一箭，射偏了半寸。'],
      ['maisi', '……射中了。'],
      ['xianniya', '射中肩膀，没射中喉咙。他还能爬起来喊人。'],
      ['maisi', '你这是在挑衅？'],
      ['xianniya', '是邀请。下次扎营，比一场。'],
    ],
    B: [
      ['xianniya', '比完了。你输了三箭。'],
      ['maisi', '……'],
      ['xianniya', '你的箭很准，可是太急了。每一箭都像要把什么东西射穿。'],
      ['maisi', '要射穿的东西，本来就很多。'],
      ['xianniya', '我在夏米尔的牢里关了很久。那时候，我每天都想着要射穿把我关进去的人。'],
      ['xianniya', '后来我发现，满脑子只想着射穿谁的时候，我反而什么都射不中。'],
    ],
    A: [
      ['maisi', '仙妮亚，再比一场。'],
      ['xianniya', '好。……咦，这次你拉弓的样子不一样了。'],
      ['maisi', '我在想，这一箭射出去，能护住谁。'],
      ['', '箭矢破空，正中百步外的靶心。'],
      ['xianniya', '……平手。'],
      ['maisi', '下次我会赢。'],
      ['xianniya', '哈。那我等着。兵团的神射手，现在才算真正的神射手。'],
    ],
  } },
];
// [end g4]
