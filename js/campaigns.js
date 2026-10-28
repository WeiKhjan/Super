// 超时空英雄传说 · 移动重制版 —— 系列作品（各作独立的关卡、英雄、存档）
'use strict';

// 各作的关卡文件把关卡放进 CAMPAIGN_STAGES[id]，英雄放进 CAMPAIGN_HEROES[id]
// 一代沿用最早的全局 STAGES / HEROES（关卡文件直接 push 进 STAGES）
const CAMPAIGN_STAGES = window.CAMPAIGN_STAGES || (window.CAMPAIGN_STAGES = {});
const CAMPAIGN_HEROES = window.CAMPAIGN_HEROES || (window.CAMPAIGN_HEROES = {});
const CAMPAIGN_ENDINGS = window.CAMPAIGN_ENDINGS || (window.CAMPAIGN_ENDINGS = {});

const CAMPAIGNS = {
  g1: {
    id: 'g1', no: '壹', title: '超时空英雄传说', subtitle: 'HEROES OF TIME & SPACE', year: 1996,
    tag: '全 35 关', saveKey: 'cskyxcs_save_v2', titleHeroes: ['yangtie', 'mengqi', 'xueer', 'wushuang'],
    desc: '作家孟祈误闯时空裂缝来到科隆多大陆，与杨铁等人对抗迦纳帝国与黑魔神。',
    color: '#8a6aff',
  },
  g2: {
    id: 'g2', no: '贰', title: '复仇魔神', full: '超时空英雄传说 2：复仇魔神', subtitle: 'HEROES OF TIME & SPACE II', year: 1996,
    tag: '制作中', saveKey: 'cskyxcs_g2_save_v1', soon: true,
    desc: '十年后的科隆多：迦纳国王杨铁性情大变，赤子女王无双密遣冒险者清风踏上旅程。芙蓉、秋月等四位女主角与多重结局。',
    color: '#ff6a4a',
  },
  g3: {
    id: 'g3', no: '外', title: '北方密使', full: '超时空英雄传说 2 外传：北方密使', subtitle: 'HEROES OF TIME & SPACE II · GAIDEN', year: 1998,
    tag: '制作中', saveKey: 'cskyxcs_g3_save_v1', soon: true,
    desc: '复仇魔神之后：迦纳剑士白志超与奚族少女娜塔莉亚，男女双主角两条路线，最终在奚族圣地交会。',
    color: '#4ad8c8',
  },
  g4: {
    id: 'g4', no: '叁', title: '狂神降世', full: '超时空英雄传说 3：狂神降世', subtitle: 'HEROES OF TIME & SPACE III', year: 2001,
    tag: '制作中', saveKey: 'cskyxcs_g4_save_v1', soon: true,
    desc: '新大陆法尔马立克：五章四路线、即时行动值（CT）战斗、隐藏职业与多结局。',
    color: '#f4c542',
  },
};
const CAMPAIGN_ORDER = ['g1', 'g2', 'g3', 'g4'];
let CUR_CAMPAIGN = 'g1';

// 一代的内容在载入时就存在于全局，先存起来
CAMPAIGN_STAGES.g1 = STAGES.slice();
CAMPAIGN_HEROES.g1 = Object.assign({}, HEROES);
const ENDING_SETS = { g1: { prelude: typeof ENDING_PRELUDE !== 'undefined' ? ENDING_PRELUDE : [], endings: typeof ENDINGS !== 'undefined' ? ENDINGS : {} } };

// 切换当前作品：替换全局的 STAGES 与 HEROES（其余系统共用）
function useCampaign(id) {
  if (!campaignReady(id)) return false;
  CUR_CAMPAIGN = id;
  STAGES.length = 0;
  STAGES.push(...(CAMPAIGN_STAGES[id] || []));
  STAGES.sort((a, b) => a.no - b.no);
  for (const k of Object.keys(HEROES)) delete HEROES[k];
  Object.assign(HEROES, CAMPAIGN_HEROES[id] || {});
  try { localStorage.setItem('cskyxcs_campaign', id); } catch (e) { }
  return true;
}
function curCampaign() { return CAMPAIGNS[CUR_CAMPAIGN]; }
function campaignReady(id) { const c = CAMPAIGNS[id]; return !!c && !c.soon && (id === 'g1' || (CAMPAIGN_STAGES[id] || []).length > 0); }
