// 超时空英雄传说 · 移动重制版 —— 核心数据（地形、相克、法术、道具、职业、英雄）
// 关卡数据见 js/stages/*.js，结局见 js/story.js
'use strict';

const STAGES = [];

// ---------- 地形 ----------
// cost: foot 步兵 / horse 骑兵 / fly 飞行 / water 水中生物（99 = 不可通行）
const TERRAIN = {
  G: { name: '草地', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 0, avoid: 0 },
  R: { name: '道路', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 0, avoid: 0 },
  F: { name: '森林', cost: { foot: 2, horse: 3, fly: 1, water: 3 }, def: 20, avoid: 15 },
  H: { name: '丘陵', cost: { foot: 2, horse: 2, fly: 1, water: 3 }, def: 15, avoid: 10 },
  M: { name: '山地', cost: { foot: 3, horse: 99, fly: 1, water: 99 }, def: 30, avoid: 25 },
  S: { name: '沙地', cost: { foot: 2, horse: 2, fly: 1, water: 3 }, def: 0, avoid: 5 },
  N: { name: '雪地', cost: { foot: 2, horse: 2, fly: 1, water: 3 }, def: 5, avoid: 0 },
  P: { name: '湿地', cost: { foot: 3, horse: 3, fly: 1, water: 1 }, def: 0, avoid: 0 },
  T: { name: '浅水', cost: { foot: 3, horse: 99, fly: 1, water: 1 }, def: 0, avoid: 0 },
  W: { name: '深水', cost: { foot: 99, horse: 99, fly: 1, water: 1 }, def: 10, avoid: 10 },
  B: { name: '木桥', cost: { foot: 1, horse: 1, fly: 1, water: 1 }, def: 0, avoid: 0 },
  V: { name: '村庄', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 15, avoid: 10, heal: 10 },
  C: { name: '石板', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 10, avoid: 5 },
  K: { name: '红毯', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 10, avoid: 5 },
  O: { name: '洞窟', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 5, avoid: 5 },
  X: { name: '城墙', cost: { foot: 99, horse: 99, fly: 99, water: 99 }, def: 0, avoid: 0 },
  Y: { name: '石柱', cost: { foot: 99, horse: 99, fly: 1, water: 99 }, def: 0, avoid: 0 },
  D: { name: '魔域', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 5, avoid: 0 },
  L: { name: '熔岩', cost: { foot: 99, horse: 99, fly: 1, water: 99 }, def: 0, avoid: 0 },
  A: { name: '圣坛', cost: { foot: 1, horse: 1, fly: 1, water: 2 }, def: 20, avoid: 10, heal: 15 },
};

// ---------- 兵种相克（原作说明书修正表 + 弓箭对空） ----------
// ADV[攻方类别][守方类别] = 1 强 / 2 次强 / 3 稍弱 / 4 弱 / 0 极弱
const ADV = {
  剑士: { 战士: 3, 鹰族: 3, 狼族: 3, 巨怪: 2 },
  弓箭手: { 飞行: 1, 鹰族: 1, 龙族: 2 },
  魔剑使: { 战士: 3, 龙族: 2, 鹰族: 3, 狼族: 3, 巨怪: 1, 魔族: 2 },
  骑兵: { 龙族: 3, 鹰族: 3, 剑士: 2, 弓箭手: 2 },
  飞行: { 龙族: 0, 鹰族: 0 },
  战士: { 剑士: 2 },
  龙族: { 武士: 2, 牧师: 2, 咒术师: 2, 法师: 2, 魔剑使: 2, 骑兵: 2, 飞行: 0, 战士: 2, 狼族: 2, 兽类: 2, 爬虫: 2, 水中: 2, 黑暗系: 3 },
  鹰族: { 剑士: 2, 弓箭手: 2, 武士: 2, 牧师: 2, 咒术师: 2, 法师: 2, 魔剑使: 2, 骑兵: 2, 飞行: 0, 战士: 2, 狼族: 2, 兽类: 2, 爬虫: 2, 水中: 2, 黑暗系: 3 },
  狼族: { 飞行: 3, 龙族: 3, 鹰族: 3 },
  兽类: { 飞行: 3, 龙族: 3, 鹰族: 3 },
  巨怪: { 剑士: 3 },
};
const ADV_MULT = { 0: 0.6, 1: 1.5, 2: 1.25, 3: 0.8, 4: 0.65 };

// ---------- 法术 / 剑法 ----------
// kind: magic 魔法伤害 | phys 剑法(物理) | pair 双人剑式 | heal 治疗 | buff 增益 | debuff 减益 | status 异常状态
//       cure 解除异常 | death 即死 | summon 召唤
// area: n 菱形范围；line: true 直线贯穿（路径上不论敌我都会受伤）
// school: 地 火 风 水 暗 圣 召 剑 双 技
const SPELLS = {
  // 地系
  earthArrow:  { name: '地之箭',   school: '地', mp: 4,  power: 10, range: [1, 4], kind: 'magic', fx: 'rock', desc: '由地底射出魔箭攻击敌人' },
  armorUp:     { name: '铠甲强化', school: '地', mp: 6,  range: [0, 3], kind: 'buff', stat: 'def', amount: 5, turns: 3, fx: 'buff', desc: '护壁护身，3 回合内防御 +5' },
  quake:       { name: '地震',     school: '地', mp: 10, power: 14, range: [1, 4], area: 1, kind: 'magic', fx: 'rock', groundOnly: true, desc: '小型地震，只伤害地面部队' },
  crack:       { name: '裂地术',   school: '地', mp: 14, range: [1, 4], kind: 'death', chance: 35, fx: 'rock', groundOnly: true, desc: '地面裂缝吞没敌人（对首领无效）' },
  petrify:     { name: '石化术',   school: '地', mp: 12, range: [1, 4], kind: 'status', status: 'petrify', turns: 3, chance: 70, fx: 'rock', desc: '将敌人化为石像（对首领无效）' },
  meteor:      { name: '流星风暴', school: '地', mp: 20, power: 26, range: [2, 5], area: 1, kind: 'magic', fx: 'rock', desc: '召唤流星雨攻击一群敌人' },
  // 火系
  fireball:    { name: '火球术',   school: '火', mp: 4,  power: 10, range: [1, 3], kind: 'magic', fx: 'fire', desc: '火系基本攻击法术' },
  attackUp:    { name: '攻击增强', school: '火', mp: 6,  range: [0, 3], kind: 'buff', stat: 'atk', amount: 5, turns: 3, fx: 'buff', desc: '3 回合内攻击力 +5' },
  heatBeam:    { name: '极热光束', school: '火', mp: 16, power: 28, range: [1, 4], line: true, kind: 'magic', fx: 'beam', desc: '高温光束，路径上不论敌我都会受伤' },
  defDown:     { name: '降低防御', school: '火', mp: 6,  range: [1, 4], kind: 'debuff', stat: 'def', amount: -5, turns: 3, fx: 'dark', desc: '3 回合内敌人防御 -5' },
  firestorm:   { name: '火焰风暴', school: '火', mp: 18, power: 24, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '强烈的火焰风暴' },
  dazzle:      { name: '眩光术',   school: '火', mp: 10, range: [1, 5], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 75, fx: 'holy', desc: '强光令敌人暂时失明无法行动' },
  fusion:      { name: '核融爆',   school: '火', mp: 36, power: 44, range: [1, 4], area: 2, kind: 'magic', fx: 'fire', desc: '最强火系法术' },
  // 风系
  tornado:     { name: '龙卷风',   school: '风', mp: 5,  power: 11, range: [1, 4], kind: 'magic', fx: 'wind', desc: '风系基本攻击法术' },
  magicUp:     { name: '魔力强化', school: '风', mp: 6,  range: [0, 3], kind: 'buff', stat: 'mag', amount: 5, turns: 3, fx: 'buff', desc: '3 回合内魔力 +5' },
  thunder:     { name: '雷击',     school: '风', mp: 10, power: 16, range: [1, 4], area: 1, kind: 'magic', fx: 'bolt', desc: '离子层放出雷电' },
  lightning:   { name: '闪电光束', school: '风', mp: 15, power: 25, range: [1, 4], line: true, kind: 'magic', fx: 'bolt', desc: '攻击闪电，路径上不论敌我都会受伤' },
  haste:       { name: '高速移动', school: '风', mp: 6,  range: [0, 3], kind: 'buff', stat: 'mov', amount: 2, turns: 3, fx: 'buff', desc: '3 回合内移动力 +2' },
  cloudWalk:   { name: '行云术',   school: '风', mp: 8,  range: [0, 3], kind: 'buff', stat: 'fly', amount: 1, turns: 2, fx: 'buff', desc: '让受法者暂时可以飞行' },
  stormThunder:{ name: '狂雷怒涛', school: '风', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'bolt', desc: '连续强力雷击' },
  // 水系
  iceArrow:    { name: '冰箭术',   school: '水', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'ice', desc: '水系基本攻击法术' },
  skillUp:     { name: '战技向上', school: '水', mp: 6,  range: [0, 3], kind: 'buff', stat: 'skill', amount: 20, turns: 3, fx: 'buff', desc: '3 回合内命中、暴击提升' },
  iceBall:     { name: '冰球术',   school: '水', mp: 10, power: 19, range: [1, 4], kind: 'magic', fx: 'ice', desc: '冰球攻击敌人' },
  freeze:      { name: '冻结术',   school: '水', mp: 12, range: [1, 4], kind: 'status', status: 'freeze', turns: 2, chance: 70, fx: 'ice', desc: '冻结敌人使其无法行动' },
  unstone:     { name: '解石化',   school: '水', mp: 6,  range: [0, 3], kind: 'cure', cures: ['petrify'], fx: 'heal', desc: '让被石化者恢复正常' },
  freezeWave:  { name: '冷冻波',   school: '水', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'ice', desc: '冷冻波，路径上不论敌我都会受伤' },
  blizzard:    { name: '寒冰风暴', school: '水', mp: 36, power: 42, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '强力冰雪风暴' },
  // 黑暗系
  evilArrow:   { name: '邪恶之箭', school: '暗', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'dark', desc: '射出邪恶之箭' },
  weaken:      { name: '衰竭术',   school: '暗', mp: 8,  range: [1, 4], kind: 'debuff', stat: 'atk', amount: -5, turns: 3, fx: 'dark', desc: '敌人衰竭，3 回合内攻击 -5' },
  poison:      { name: '毒杀术',   school: '暗', mp: 7,  range: [1, 4], kind: 'status', status: 'poison', turns: 4, chance: 80, fx: 'acid', desc: '毒气令敌人中毒，每回合损失生命' },
  poisonCloud: { name: '毒雾',     school: '暗', mp: 10, range: [1, 4], area: 1, kind: 'status', status: 'poison', turns: 3, chance: 65, fx: 'acid', desc: '毒雾笼罩一片区域，令敌人中毒' },
  silence:     { name: '法术禁锢', school: '暗', mp: 8,  range: [1, 4], kind: 'status', status: 'silence', turns: 3, chance: 75, fx: 'dark', desc: '封住敌人魔法，无法施法' },
  curseWind:   { name: '诅咒之风', school: '暗', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'dark', desc: '诅咒强风，路径上不论敌我都会受伤' },
  vortex:      { name: '黑暗漩涡', school: '暗', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '强力的黑暗漩涡' },
  devour:      { name: '黑暗吞噬', school: '暗', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '吞噬心灵的黑暗力量（对首领无效）' },
  // 神圣系
  heal:        { name: '恢复术',   school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '回复少许生命' },
  holyLight:   { name: '圣光术',   school: '圣', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '神圣之光，对魔族与黑暗系双倍伤害' },
  holyNova:    { name: '圣光审判', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '以自身为中心放出圣光，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  bless:       { name: '祝福术',   school: '圣', mp: 10, range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 3, turns: 3, fx: 'buff', desc: '祝福友军，攻击、防御、魔力 +3' },
  bigHeal:     { name: '大回复',   school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '一次回复多人生命' },
  cureAll:     { name: '状态回复', school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '医疗石化以外的各种状态' },
  strongHeal:  { name: '强力恢复', school: '圣', mp: 12, power: 60, range: [0, 3], kind: 'heal', fx: 'heal', desc: '回复大部分生命' },
  fullHeal:    { name: '全体回复', school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '大范围回复生命' },
  // 召唤系
  sumEarth:    { name: '地之召唤', school: '召', mp: 12, range: [1, 1], kind: 'summon', unit: 'spiritEarth', turns: 3, fx: 'summon', desc: '召唤土精灵助战 3 回合' },
  sumFire:     { name: '火之召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritFire', turns: 3, fx: 'summon', desc: '召唤火精灵助战 3 回合' },
  sumWind:     { name: '风之召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritWind', turns: 3, fx: 'summon', desc: '召唤风精灵助战 3 回合' },
  sumWater:    { name: '水之召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritWater', turns: 3, fx: 'summon', desc: '召唤水精灵助战 3 回合' },
  sumDemon:    { name: '召唤魔族', school: '召', mp: 22, range: [1, 1], kind: 'summon', unit: 'demonSummon', turns: 3, fx: 'summon', desc: '召唤魔族助战 3 回合' },
  sumAngel:    { name: '召唤天使', school: '召', mp: 26, range: [1, 1], kind: 'summon', unit: 'angel', turns: 3, fx: 'summon', desc: '召唤天使助战 3 回合' },
  sumTurtle:   { name: '召唤巨龟', school: '召', mp: 24, range: [1, 1], kind: 'summon', unit: 'turtle', turns: 3, fx: 'summon', desc: '召唤坚硬的巨龟助战 3 回合' },
  // 单人剑式
  voidSword:   { name: '虚空剑法', school: '剑', mp: 4,  power: 5,  range: [1, 2], kind: 'phys', sure: true, fx: 'slash', desc: '最基本的剑法，射程 1-2，必中' },
  rainbow:     { name: '长虹剑法', school: '剑', mp: 7,  power: 10, range: [1, 3], kind: 'phys', sure: true, fx: 'slash', desc: '剑气如长虹，射程 1-3，必中' },
  soulBreak:   { name: '破魂剑法', school: '剑', mp: 8,  power: 6,  range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, fx: 'slash', desc: '令敌人惊吓而无法反击' },
  earthSplit:  { name: '裂地剑法', school: '剑', mp: 12, power: 18, range: [1, 2], kind: 'phys', sure: true, fx: 'slash', desc: '足以裂地的剑法' },
  burstSword:  { name: '爆烈剑法', school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, fx: 'fire', desc: '剑气爆裂，周围的敌人都受重伤' },
  chaosSword:  { name: '混沌剑法', school: '剑', mp: 22, power: 28, range: [1, 2], area: 1, kind: 'phys', sure: true, fx: 'dark', desc: '比爆烈剑法更强大的剑法' },
  limitless:   { name: '无极剑法', school: '剑', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, fx: 'slash', desc: '威力极大的剑法' },
  qiankun:     { name: '乾坤剑法', school: '剑', mp: 34, power: 50, range: [1, 3], area: 1, kind: 'phys', sure: true, fx: 'holy', desc: '剑法之极致' },
  spinSlash:   { name: '回旋斩',   school: '剑', mp: 6,  power: 8,  range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'slash', desc: '旋身一斩，攻击身边所有敌人' },
  swordArc:    { name: '剑气横扫', school: '剑', mp: 9,  power: 12, range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'slash', desc: '横扫前方三格的敌人' },
  swordWave:   { name: '剑波',     school: '剑', mp: 14, power: 18, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'slash', desc: '剑气化作扇形冲击波，前方三排敌人都受伤' },
  // 双人剑式（需要相邻、尚未行动的剑术系伙伴，伙伴也会结束行动）
  flyingSword: { name: '御剑术',   school: '双', mp: 8,  power: 14, range: [1, 3], kind: 'pair', sure: true, fx: 'slash', desc: '与相邻伙伴合力御剑' },
  twinSword:   { name: '紫青双剑', school: '双', mp: 12, power: 22, range: [1, 3], kind: 'pair', sure: true, fx: 'slash', desc: '两道剑光交错' },
  titanSword:  { name: '巨神剑法', school: '双', mp: 16, power: 30, range: [1, 4], kind: 'pair', sure: true, fx: 'holy', desc: '合击巨神之剑' },
  sunMoon:     { name: '日月剑法', school: '双', mp: 20, power: 36, range: [1, 3], area: 1, kind: 'pair', sure: true, fx: 'fire', desc: '日月同辉，波及周围' },
  twinPhoenix: { name: '双凤剑法', school: '双', mp: 24, power: 44, range: [1, 4], kind: 'pair', sure: true, fx: 'fire', desc: '双凤齐飞' },
  fourSymbol:  { name: '四象剑法', school: '双', mp: 30, power: 50, range: [1, 3], area: 1, kind: 'pair', sure: true, fx: 'holy', desc: '四象合一' },
  eightDragon: { name: '八龙剑法', school: '双', mp: 40, power: 64, range: [1, 4], area: 1, kind: 'pair', sure: true, fx: 'holy', desc: '八龙齐出，最强合击' },
  // 枪术（骑兵系）
  thrust:      { name: '突刺',     school: '枪', mp: 4,  power: 6,  range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'slash', desc: '长枪直刺，射程 1-2，必中' },
  whirlLance:  { name: '旋风枪',   school: '枪', mp: 8,  power: 10, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '舞枪横扫，攻击身边所有敌人' },
  oath:        { name: '骑士之誓', school: '枪', mp: 6,  range: [0, 1], kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '以骑士之名守护，自己或相邻同伴防御 +6' },
  lanceSweep:  { name: '横扫枪',   school: '枪', mp: 6,  power: 8,  range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'slash', desc: '长枪横扫前方三格' },
  galeCharge:  { name: '疾风突击', school: '枪', mp: 11, power: 17, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'slash', desc: '策马冲锋贯穿一列，路径上不论敌我' },
  pegasusLance:{ name: '天马流星枪', school: '枪', mp: 16, power: 24, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '自空中连续刺下，波及周围' },
  wyvernLance: { name: '飞龙穿云枪', school: '枪', mp: 24, power: 36, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'fire', desc: '驾飞龙俯冲，贯穿一列' },
  dragonLance: { name: '龙骑神枪', school: '枪', mp: 30, power: 46, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'thrust', fx: 'fire', desc: '枪术之极致' },
  // 斧技（战士系）
  heavyBlow:   { name: '强力一击', school: '斧', mp: 4,  power: 8,  range: [1, 1], kind: 'phys', style: 'axe', fx: 'rock', desc: '全力挥斧，威力大但可能落空' },
  berserk:     { name: '狂战士',   school: '斧', mp: 6,  range: [0, 0], kind: 'buff', stat: 'atk', amount: 7, turns: 3, fx: 'fire', desc: '燃起斗志，自身攻击 +7' },
  warCry:      { name: '战吼',     school: '斧', mp: 7,  range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'atk', amount: -5, turns: 3, style: 'roar', fx: 'fire', desc: '震天怒吼，身边敌人攻击 -5' },
  axeWave:     { name: '裂地斧',   school: '斧', mp: 16, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, groundOnly: true, style: 'wave', fx: 'rock', desc: '劈出扇形裂地冲击波，伤及前方地面部队' },
  whirlAxe:    { name: '旋风斧',   school: '斧', mp: 8,  power: 12, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'rock', desc: '回旋巨斧，攻击身边所有敌人' },
  quakeAxe:    { name: '震地击',   school: '斧', mp: 12, power: 16, range: [1, 1], area: 1, kind: 'phys', sure: true, groundOnly: true, style: 'axe', fx: 'rock', desc: '斧劈大地，震伤周围地面部队' },
  overlord:    { name: '霸王斩',   school: '斧', mp: 16, power: 30, range: [1, 1], kind: 'phys', sure: true, style: 'axe', fx: 'fire', desc: '霸者一击' },
  cataclysm:   { name: '天崩地裂', school: '斧', mp: 26, power: 38, range: [0, 0], area: 2, around: true, kind: 'phys', sure: true, groundOnly: true, style: 'axe', fx: 'rock', desc: '震碎大地，伤及周围两格的地面敌人' },
  // 刀术（武士系）
  iai:         { name: '居合斩',   school: '刀', mp: 4,  power: 6,  range: [1, 1], kind: 'phys', sure: true, crit: 30, style: 'blade', fx: 'slash', desc: '拔刀一闪，必中且易暴击' },
  swallow:     { name: '燕返',     school: '刀', mp: 7,  power: 12, range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'blade', fx: 'slash', desc: '回旋双斩，令敌人无法反击' },
  sideCut:     { name: '横一文字', school: '刀', mp: 6,  power: 9,  range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'slash', desc: '一刀横斩前方三格' },
  vacuumCut:   { name: '真空斩',   school: '刀', mp: 16, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'wind', desc: '斩出真空刃，扇形波及前方三排' },
  flashCut:    { name: '一闪',     school: '刀', mp: 10, power: 16, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'dash', fx: 'slash', desc: '疾驰穿过敌阵，路径上不论敌我' },
  bushido:     { name: '武士道',   school: '刀', mp: 6,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 30, turns: 3, fx: 'buff', desc: '心如止水，自身命中与暴击大增' },
  hundredCut:  { name: '百鬼斩',   school: '刀', mp: 16, power: 24, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'dark', desc: '刀光如百鬼夜行，斩向身边所有敌人' },
  musou:       { name: '无双乱舞', school: '刀', mp: 26, power: 40, range: [1, 2], area: 1, kind: 'phys', sure: true, crit: 15, style: 'blade', fx: 'fire', desc: '刀术之极致' },
  // 箭术（弓箭系）
  aimShot:     { name: '瞄准射击', school: '弓', mp: 4,  power: 5,  range: [2, 4], kind: 'phys', sure: true, crit: 15, style: 'arrow', fx: 'slash', desc: '屏息瞄准，射程 2-4，必中' },
  spreadShot:  { name: '散射',     school: '弓', mp: 6,  power: 7,  range: [2, 4], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'slash', desc: '一次放出数箭，覆盖目标与周围' },
  doubleShot:  { name: '连射',     school: '弓', mp: 6,  power: 12, range: [2, 3], kind: 'phys', sure: true, style: 'arrow2', fx: 'slash', desc: '连发两箭' },
  pierceArrow: { name: '穿云箭',   school: '弓', mp: 9,  power: 15, range: [1, 5], line: true, kind: 'phys', sure: true, style: 'pierce', fx: 'wind', desc: '贯穿一列，路径上不论敌我' },
  arrowRain:   { name: '箭雨',     school: '弓', mp: 12, power: 14, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'slash', desc: '万箭齐发，覆盖一片区域' },
  hawkEye:     { name: '鹰眼',     school: '弓', mp: 6,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 30, turns: 3, fx: 'buff', desc: '洞察弱点，自身命中与暴击大增' },
  starArrows:  { name: '流星箭雨', school: '弓', mp: 24, power: 30, range: [2, 5], area: 2, kind: 'phys', sure: true, style: 'volley', fx: 'holy', desc: '箭术之极致，箭如流星坠落' },
  // 鹰族
  dive:        { name: '俯冲',     school: '翼', mp: 4,  power: 7,  range: [1, 1], kind: 'phys', sure: true, style: 'dive', fx: 'wind', desc: '自高空俯冲攻击，必中' },
  featherStorm:{ name: '羽刃风暴', school: '翼', mp: 12, power: 15, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'feathers', fx: 'wind', desc: '振翅射出锋利羽刃' },
  gustWing:    { name: '旋风翼',   school: '翼', mp: 10, power: 14, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '振翅卷起旋风，攻击身边所有敌人' },
  skyStrike:   { name: '天鹰冲击', school: '翼', mp: 22, power: 34, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '化作雷光贯穿一列' },
  // 狼族
  bite:        { name: '撕咬',     school: '牙', mp: 4,  power: 7,  range: [1, 1], kind: 'phys', sure: true, crit: 10, style: 'claw', fx: 'slash', desc: '扑上撕咬，必中' },
  howl:        { name: '狼嚎',     school: '牙', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'atk', amount: 5, turns: 3, fx: 'buff', desc: '仰天长嚎，自己与身边同伴攻击 +5' },
  roar:        { name: '咆哮',     school: '牙', mp: 7,  range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'def', amount: -5, turns: 3, style: 'roar', fx: 'dark', desc: '野性咆哮，身边敌人防御 -5' },
  rendClaw:    { name: '裂爪',     school: '牙', mp: 8,  power: 12, range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'claw', fx: 'slash', desc: '撕裂爪击，令敌人无法反击' },
  frenzy:      { name: '疾风连爪', school: '牙', mp: 14, power: 18, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'slash', desc: '旋身连爪，攻击身边所有敌人' },
  moonFang:    { name: '月下狼牙', school: '牙', mp: 22, power: 34, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'holy', desc: '借月光之力的必杀一咬' },
  // 龙族
  tailSweep:   { name: '龙尾扫',   school: '技', mp: 5,  power: 10, range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'rock', desc: '甩尾横扫前方三格' },
  dragonFlame: { name: '龙焰冲击', school: '技', mp: 14, power: 26, range: [1, 4], line: true, kind: 'magic', fx: 'beam', desc: '喷出直线烈焰，路径上不论敌我' },
  // ===== 转职分支（B 路线）专属招式 =====
  // 魔法剑士系
  flameSword:  { name: '火焰剑',   school: '魔', mp: 7,  power: 14, range: [1, 1], kind: 'phys', sure: true, style: 'blade', fx: 'fire', desc: '剑身燃起烈焰的一击' },
  thunderSword:{ name: '雷光剑',   school: '魔', mp: 12, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'bolt', desc: '引雷入剑，劈向目标与周围' },
  frostSword:  { name: '冰霜剑',   school: '魔', mp: 10, power: 16, range: [1, 1], kind: 'phys', sure: true, status: 'freeze', turns: 1, chance: 45, style: 'thrust', fx: 'ice', desc: '寒气入骨，有机会冻结敌人' },
  arcaneBlade: { name: '圣魔剑',   school: '魔', mp: 26, power: 40, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'holy', desc: '圣与魔交织的剑气贯穿一列' },
  // 圣骑士系
  shieldWall:  { name: '铁壁',     school: '枪', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '举盾守护，自己与身边同伴防御 +6' },
  holyLance:   { name: '圣枪',     school: '枪', mp: 9,  power: 16, range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'holy', desc: '注入圣光的长枪突刺' },
  royalCharge: { name: '王者冲锋', school: '枪', mp: 26, power: 42, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'holy', desc: '率领王旗冲锋，贯穿一列' },
  // 狂战士系
  bloodRage:   { name: '血怒',     school: '斧', mp: 6,  range: [0, 0], kind: 'buff', stat: 'atk', amount: 10, turns: 3, fx: 'fire', desc: '以血激发狂怒，自身攻击 +10' },
  rampage:     { name: '暴走',     school: '斧', mp: 10, power: 22, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'fire', desc: '狂暴乱斩身边所有敌人' },
  twinCleave:  { name: '双斧裂',   school: '斧', mp: 10, power: 26, range: [1, 1], kind: 'phys', style: 'axe', fx: 'rock', desc: '双斧交叉劈下，威力极大但可能落空' },
  deathBlow:   { name: '灭世斩',   school: '斧', mp: 22, power: 52, range: [1, 1], kind: 'phys', sure: true, style: 'axe', fx: 'fire', desc: '破坏神的一击' },
  // 忍者系
  shuriken:    { name: '手里剑',   school: '忍', mp: 4,  power: 9,  range: [2, 3], kind: 'phys', sure: true, style: 'feathers', fx: 'slash', desc: '投出手里剑，射程 2-3' },
  poisonBlade: { name: '毒刃',     school: '忍', mp: 6,  power: 10, range: [1, 1], kind: 'phys', sure: true, status: 'poison', turns: 3, chance: 75, style: 'blade', fx: 'acid', desc: '淬毒的刀刃，令敌人中毒' },
  smokeBomb:   { name: '烟玉',     school: '忍', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'dark', desc: '烟雾弥漫，令一片敌人失明' },
  shadowStrike:{ name: '影袭',     school: '忍', mp: 12, power: 26, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 30, style: 'dash', fx: 'dark', desc: '化作黑影穿过敌阵' },
  shadowDance: { name: '影舞',     school: '忍', mp: 22, power: 34, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, crit: 20, style: 'spin', fx: 'dark', desc: '无数分身同时斩向身边敌人' },
  // 游侠系
  frostArrow:  { name: '冰结箭',   school: '弓', mp: 7,  power: 10, range: [2, 5], kind: 'phys', sure: true, status: 'freeze', turns: 1, chance: 50, style: 'arrow', fx: 'ice', desc: '冰之箭，有机会冻结敌人' },
  thunderArrow:{ name: '雷鸣箭',   school: '弓', mp: 10, power: 16, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'bolt', desc: '箭化雷霆落向一片区域' },
  arcaneArrow: { name: '天穹箭',   school: '弓', mp: 18, power: 30, range: [1, 6], line: true, kind: 'phys', sure: true, style: 'pierce', fx: 'holy', desc: '光之箭贯穿一列' },
  // 武僧系
  chiPalm:     { name: '气功掌',   school: '拳', mp: 4,  power: 12, range: [1, 1], kind: 'phys', sure: true, style: 'claw', fx: 'holy', desc: '运气出掌，必中' },
  meditate:    { name: '冥想',     school: '拳', mp: 5,  power: 30, range: [0, 0], kind: 'heal', fx: 'heal', desc: '调息回复自身生命' },
  hundredFist: { name: '百裂拳',   school: '拳', mp: 10, power: 20, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'slash', desc: '快拳连打' },
  chiWave:     { name: '气功波',   school: '拳', mp: 14, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'holy', desc: '扇形气功波，前方三排都受伤' },
  holyFist:    { name: '圣拳',     school: '拳', mp: 22, power: 44, range: [1, 1], kind: 'phys', sure: true, style: 'claw', fx: 'holy', desc: '拳圣的必杀一拳' },
  // 时空术士系
  slow:        { name: '迟缓术',   school: '时', mp: 6,  range: [1, 4], area: 1, kind: 'debuff', stat: 'mov', amount: -2, turns: 2, fx: 'dark', desc: '扭曲时间，一片敌人移动 -2' },
  timeStop:    { name: '时间停止', school: '时', mp: 14, range: [1, 4], area: 1, kind: 'status', status: 'freeze', turns: 1, chance: 55, fx: 'ice', desc: '冻结一片区域的时间，令敌人无法行动' },
  quicken:     { name: '时间加速', school: '时', mp: 18, range: [1, 3], kind: 'refresh', fx: 'buff', desc: '让一名已行动的同伴再次行动' },
  gravity:     { name: '重力场',   school: '时', mp: 16, power: 26, range: [1, 4], area: 1, kind: 'magic', fx: 'dark', desc: '扭曲空间的重力压垮敌人' },
  chronoBreak: { name: '时空崩坏', school: '时', mp: 36, power: 46, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '撕裂时空的最强魔法' },
  // 召唤士系
  sumDragon:   { name: '召唤神龙', school: '召', mp: 30, range: [1, 1], kind: 'summon', unit: 'dragon', turns: 3, fx: 'summon', desc: '召唤巨龙助战 3 回合' },
  // 月影狼系
  lunarHowl:   { name: '月之嚎',   school: '牙', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'skill', amount: 25, turns: 3, fx: 'buff', desc: '月下长嚎，自己与身边同伴命中、暴击提升' },
  moonRush:    { name: '月光疾驰', school: '牙', mp: 18, power: 32, range: [1, 4], line: true, kind: 'phys', sure: true, crit: 15, style: 'charge', fx: 'holy', desc: '化作月光贯穿一列' },
  // 怪物 / 敌方专用
  breathFire:  { name: '喷火',     school: '技', mp: 0,  power: 10, range: [1, 2], kind: 'magic', fx: 'fire', desc: '喷出火焰' },
  breathIce:   { name: '喷冰气',   school: '技', mp: 0,  power: 10, range: [1, 2], kind: 'magic', fx: 'ice', desc: '喷出冰气' },
  acid:        { name: '酸液',     school: '技', mp: 0,  power: 6,  range: [1, 2], kind: 'magic', fx: 'acid', desc: '' },
  gaze:        { name: '石化凝视', school: '技', mp: 6,  range: [1, 2], kind: 'status', status: 'petrify', turns: 2, chance: 55, fx: 'rock', desc: '' },
  venom:       { name: '毒螯',     school: '技', mp: 0,  range: [1, 1], kind: 'status', status: 'poison', turns: 3, chance: 70, fx: 'acid', desc: '' },
  laser:       { name: '光线枪',   school: '技', mp: 0,  power: 12, range: [1, 4], kind: 'magic', fx: 'beam', desc: '' },
  darkLight:   { name: '黑暗光',   school: '技', mp: 10, power: 24, range: [1, 4], area: 1, kind: 'magic', fx: 'dark', desc: '' },
  sumPig:      { name: '召唤豬頭龍', school: '召', mp: 10, range: [1, 1], kind: 'summon', unit: 'pigdragon', turns: 99, fx: 'summon', desc: '' },
  sumSkeleton: { name: '召唤魔兵', school: '召', mp: 12, range: [1, 1], kind: 'summon', unit: 'beast', turns: 99, fx: 'summon', desc: '' },
};
const SCHOOL_NAME = { 地: '地系', 火: '火系', 风: '风系', 水: '水系', 暗: '黑暗系', 圣: '神圣系', 召: '召唤系', 剑: '单人剑式', 双: '双人剑式', 魔: '魔剑术', 忍: '忍术', 拳: '拳法', 时: '时空魔法', 枪: '枪术', 斧: '斧技', 刀: '刀术', 弓: '箭术', 翼: '鹰族战技', 牙: '狼族战技', 技: '特技' };

// ---------- 道具 ----------
// type: weapon(kind) / armor / acc 饰品 / use 消耗 / key 任务道具
const ITEMS = {
  woodSword:    { name: '木剑',     type: 'weapon', kind: 'sword', atk: 1, price: 10 },
  ironSword:    { name: '铁剑',     type: 'weapon', kind: 'sword', atk: 4, hit: 5, price: 80 },
  steelSword:   { name: '钢剑',     type: 'weapon', kind: 'sword', atk: 7, price: 260 },
  silverSword:  { name: '银剑',     type: 'weapon', kind: 'sword', atk: 10, price: 600 },
  greatSword:   { name: '巨剑',     type: 'weapon', kind: 'sword', atk: 14, hit: -10, price: 900 },
  platinumSword:{ name: '白金剑',   type: 'weapon', kind: 'sword', atk: 17, price: 2200 },
  dragonSword:  { name: '屠龙剑',   type: 'weapon', kind: 'sword', atk: 22, crit: 5, price: 4800 },
  holySword:    { name: '光明圣剑', type: 'weapon', kind: 'sword', atk: 32, hit: 15, crit: 5, price: 0 },
  longBlade:    { name: '长刀',     type: 'weapon', kind: 'blade', atk: 6, price: 220 },
  katana:       { name: '武士刀',   type: 'weapon', kind: 'blade', atk: 12, crit: 5, price: 1200 },
  blueDragonBlade:{ name: '青龙刀', type: 'weapon', kind: 'blade', atk: 20, price: 4000 },
  spear:        { name: '长枪',     type: 'weapon', kind: 'lance', atk: 5, price: 120 },
  silverLance:  { name: '银枪',     type: 'weapon', kind: 'lance', atk: 11, price: 700 },
  flameLance:   { name: '烈火矛',   type: 'weapon', kind: 'lance', atk: 16, price: 2000 },
  divineLance:  { name: '战神之矛', type: 'weapon', kind: 'lance', atk: 24, price: 5000 },
  shortBow:     { name: '短弓',     type: 'weapon', kind: 'bow', atk: 4, price: 80 },
  longBow:      { name: '长弓',     type: 'weapon', kind: 'bow', atk: 8, price: 480 },
  silverBow:    { name: '银弓',     type: 'weapon', kind: 'bow', atk: 12, price: 1100 },
  elfBow:       { name: '精灵弓',   type: 'weapon', kind: 'bow', atk: 16, hit: 10, price: 2400 },
  sunBow:       { name: '太阳神弓', type: 'weapon', kind: 'bow', atk: 24, crit: 5, price: 5200 },
  shortStaff:   { name: '短杖',     type: 'weapon', kind: 'staff', atk: 1, mag: 1, price: 60 },
  longStaff:    { name: '长杖',     type: 'weapon', kind: 'staff', atk: 2, mag: 3, price: 300 },
  crystalStaff: { name: '水晶杖',   type: 'weapon', kind: 'staff', atk: 3, mag: 6, price: 1200 },
  starStaff:    { name: '星辰圣杖', type: 'weapon', kind: 'staff', atk: 5, mag: 10, price: 4000 },
  earthStaff:   { name: '大地之杖', type: 'weapon', kind: 'staff', atk: 6, mag: 11, price: 4500 },
  spiritStaff:  { name: '圣灵之杖', type: 'weapon', kind: 'staff', atk: 6, mag: 13, price: 5500 },
  battleAxe:    { name: '战斧',     type: 'weapon', kind: 'axe', atk: 8, hit: -5, price: 380 },
  thunderHammer:{ name: '雷神锤',   type: 'weapon', kind: 'axe', atk: 22, hit: -5, price: 4600 },
  wolfFang:     { name: '狼牙刀',   type: 'weapon', kind: 'claw', atk: 10, crit: 5, price: 900 },
  clothCap:     { name: '布帽',     type: 'armor', def: 1, price: 30 },
  leather:      { name: '皮甲',     type: 'armor', def: 3, price: 150 },
  mageRobe:     { name: '魔法袍',   type: 'armor', def: 2, mag: 2, price: 400 },
  chainMail:    { name: '锁子甲',   type: 'armor', def: 6, price: 500 },
  silverScale:  { name: '银鳞甲',   type: 'armor', def: 9, price: 1500 },
  knightArmor:  { name: '骑士铠甲', type: 'armor', def: 12, price: 2600 },
  spiritCape:   { name: '圣灵披风', type: 'armor', def: 8, mag: 5, price: 3000 },
  goldArmor:    { name: '黄金铠胄', type: 'armor', def: 15, price: 4200 },
  dragonScale:  { name: '龙鳞甲',   type: 'armor', def: 18, price: 0 },
  holyHelm:     { name: '神圣盔胄', type: 'armor', def: 14, mag: 4, price: 0 },
  mindHelm:     { name: '心灵护盔', type: 'armor', def: 16, mag: 6, price: 0 },
  powerRing:    { name: '力量之戒', type: 'acc', atk: 4, price: 1500 },
  swiftBoots:   { name: '迅捷靴',   type: 'acc', mov: 1, spd: 2, price: 1800 },
  amulet:       { name: '护身符',   type: 'acc', def: 3, immune: true, price: 1200, desc: '防御 +3，免疫中毒与石化' },
  herb:         { name: '药草',     type: 'use', hp: 30, price: 40, desc: '回复 30 HP' },
  healLeaf:     { name: '回复叶',   type: 'use', hp: 60, price: 100, desc: '回复 60 HP' },
  healFlower:   { name: '回复花',   type: 'use', hp: 120, price: 300, desc: '回复 120 HP' },
  healFruit:    { name: '回复果',   type: 'use', hp: 999, price: 500, desc: '完全回复 HP' },
  magicHerb:    { name: '魔草',     type: 'use', mp: 20, price: 120, desc: '回复 20 MP' },
  magicFruit:   { name: '魔果',     type: 'use', mp: 999, price: 600, desc: '完全回复 MP' },
  antidote:     { name: '解毒草',   type: 'use', cures: ['poison'], price: 20, desc: '解除中毒' },
  stoneCure:    { name: '化石草',   type: 'use', cures: ['petrify', 'freeze'], price: 60, desc: '解除石化、冻结（可对相邻伙伴使用）' },
  powerWine:    { name: '力量之酒', type: 'use', stat: { atk: 2 }, price: 0, desc: '永久提升攻击 +2' },
  magicWine:    { name: '魔法之酒', type: 'use', stat: { mag: 2 }, price: 0, desc: '永久提升魔力 +2' },
  vigorWine:    { name: '元气之酒', type: 'use', stat: { mhp: 8 }, price: 0, desc: '永久提升生命上限 +8' },
  wisdomBook:   { name: '智慧之书', type: 'use', stat: { mmp: 8 }, price: 0, desc: '永久提升 MP 上限 +8' },
  swordManual:  { name: '远古剑谱', type: 'use', stat: { atk: 3, spd: 1 }, price: 0, desc: '永久提升攻击 +3、敏捷 +1' },
  earthOrb:     { name: '地灵珠',   type: 'key', price: 0, desc: '蕴藏大地之力的宝珠' },
  fireOrb:      { name: '火神珠',   type: 'key', price: 0, desc: '蕴藏火焰之力的宝珠' },
  windOrb:      { name: '风之珠',   type: 'key', price: 0, desc: '蕴藏风之力的宝珠' },
  waterOrb:     { name: '水华珠',   type: 'key', price: 0, desc: '蕴藏水之力的宝珠' },
};
const SHOP_BASE = ['herb', 'magicHerb', 'antidote', 'stoneCure', 'ironSword', 'spear', 'shortBow', 'shortStaff', 'longBlade', 'battleAxe', 'clothCap', 'leather'];
// 随进度解锁的商品：[通过第几关后, 道具]
const SHOP_UNLOCK = [
  [3, 'healLeaf'], [3, 'steelSword'], [4, 'longStaff'], [5, 'chainMail'], [6, 'mageRobe'], [7, 'longBow'], [8, 'silverSword'], [8, 'silverLance'],
  [10, 'wolfFang'], [11, 'katana'], [12, 'silverBow'], [13, 'healFlower'], [13, 'silverScale'], [14, 'greatSword'], [15, 'crystalStaff'],
  [16, 'powerRing'], [18, 'knightArmor'], [19, 'platinumSword'], [19, 'flameLance'], [20, 'elfBow'], [21, 'spiritCape'], [22, 'swiftBoots'],
  [23, 'amulet'], [24, 'healFruit'], [24, 'magicFruit'], [25, 'goldArmor'], [26, 'blueDragonBlade'], [27, 'thunderHammer'], [28, 'starStaff'],
  [29, 'dragonSword'], [29, 'divineLance'], [30, 'sunBow'], [30, 'earthStaff'], [31, 'spiritStaff'],
];

// ---------- 职业 ----------
// tiers: 各阶 {name, lv: 达到此等级自动转职, mov, move, range}
// type: 兵种相克类别   weapon: 可装备的武器种类（null = 天生武器，不装备）
const TIER = (name, lv, mov, move, range) => ({ name, lv, mov, move: move || 'foot', range: range || [1, 1] });
function mk(name, type, sprite, weapon, move, range, mov, base, growth, skills) {
  return { line: name, type, weapon, sprite, tiers: [TIER(name, 1, mov, move, range)], base, growth, skills: skills || [] };
}
const CLASSES = {
  // ===== 我方职业系 =====
  writer: { line: '作家系', type: '剑士', weapon: ['sword'], sprite: 'writer',
    tiers: [TIER('作家', 1, 5), TIER('侠客', 5, 5), TIER('剑道家', 10, 5), TIER('圣剑士', 15, 6), TIER('剑侠', 20, 6), TIER('剑王', 25, 6), TIER('剑圣', 30, 7)],
    base: { hp: 26, mp: 6, atk: 8, def: 5, mag: 3, spd: 7 }, growth: { hp: 3.5, mp: 1.0, atk: 1.7, def: 1.3, mag: 0.6, spd: 1.3 },
    promo: { hp: 4, mp: 2, atk: 2, def: 1, spd: 1 },
    skills: [[2, 'voidSword'], [4, 'spinSlash'], [6, 'rainbow'], [8, 'flyingSword'], [9, 'swordArc'], [16, 'swordWave'], [10, 'soulBreak'], [13, 'twinSword'], [14, 'earthSplit'], [17, 'titanSword'],
      [18, 'burstSword'], [21, 'sunMoon'], [22, 'chaosSword'], [25, 'twinPhoenix'], [26, 'limitless'], [29, 'fourSymbol'], [30, 'qiankun'], [33, 'eightDragon']] },
  swordsman: { line: '剑士系', type: '剑士', weapon: ['sword'], sprite: 'swordsman',
    tiers: [TIER('剑士', 1, 5), TIER('高级剑士', 6, 5), TIER('银剑士', 12, 6), TIER('黄金剑士', 19, 6), TIER('大剑师', 26, 6)],
    base: { hp: 23, mp: 4, atk: 8, def: 5, mag: 2, spd: 7 }, growth: { hp: 2.9, mp: 0.7, atk: 1.7, def: 1.1, mag: 0.3, spd: 1.3 },
    promo: { hp: 5, mp: 2, atk: 3, def: 2, spd: 1 },
    skills: [[3, 'voidSword'], [5, 'spinSlash'], [8, 'rainbow'], [10, 'swordArc'], [12, 'flyingSword'], [17, 'swordWave'], [15, 'earthSplit'], [22, 'burstSword'], [24, 'titanSword'], [29, 'limitless']] },
  knight: { line: '骑兵系', type: '骑兵', weapon: ['lance'], sprite: 'knight',
    tiers: [TIER('骑枪兵', 1, 6, 'horse'), TIER('旋风骑士', 6, 6, 'horse'), TIER('疾风骑士', 12, 7, 'horse'), TIER('飞马骑士', 19, 7, 'fly'), TIER('飞龙骑士', 26, 7, 'fly')],
    base: { hp: 25, mp: 3, atk: 9, def: 6, mag: 1, spd: 6 }, growth: { hp: 3.2, mp: 0.5, atk: 1.6, def: 1.3, mag: 0.2, spd: 1.0 },
    promo: { hp: 6, mp: 1, atk: 2, def: 3, spd: 1 },
    skills: [[3, 'thrust'], [5, 'lanceSweep'], [7, 'oath'], [9, 'whirlLance'], [13, 'galeCharge'], [19, 'pegasusLance'], [26, 'wyvernLance'], [31, 'dragonLance']] },
  fighter: { line: '战士系', type: '战士', weapon: ['axe'], sprite: 'fighter',
    tiers: [TIER('战士', 1, 5), TIER('格斗者', 6, 5), TIER('圣战士', 12, 5), TIER('光明战士', 19, 6), TIER('终极战士', 26, 6)],
    base: { hp: 28, mp: 2, atk: 10, def: 5, mag: 0, spd: 5 }, growth: { hp: 3.6, mp: 0.4, atk: 1.9, def: 1.0, mag: 0.1, spd: 0.9 },
    promo: { hp: 7, mp: 1, atk: 3, def: 1, spd: 1 },
    skills: [[3, 'heavyBlow'], [5, 'whirlAxe'], [6, 'berserk'], [8, 'warCry'], [11, 'quakeAxe'], [17, 'axeWave'], [21, 'overlord'], [28, 'cataclysm']] },
  samurai: { line: '武士系', type: '武士', weapon: ['blade', 'sword'], sprite: 'samurai',
    tiers: [TIER('次级武士', 1, 5), TIER('中级武士', 6, 5), TIER('高级武士', 12, 5), TIER('将军', 19, 6), TIER('大将军', 26, 6)],
    base: { hp: 25, mp: 3, atk: 9, def: 7, mag: 1, spd: 6 }, growth: { hp: 3.2, mp: 0.5, atk: 1.6, def: 1.4, mag: 0.2, spd: 1.0 },
    promo: { hp: 6, mp: 1, atk: 2, def: 3, spd: 1 },
    skills: [[3, 'iai'], [5, 'sideCut'], [7, 'swallow'], [11, 'flashCut'], [12, 'hundredCut'], [14, 'bushido'], [18, 'vacuumCut'], [27, 'musou']] },
  archer: { line: '弓箭系', type: '弓箭手', weapon: ['bow'], sprite: 'archer',
    tiers: [TIER('猎人', 1, 5, 'foot', [2, 3]), TIER('弓箭手', 6, 5, 'foot', [2, 3]), TIER('神箭手', 12, 5, 'foot', [2, 4]), TIER('弩手', 19, 5, 'foot', [1, 4]), TIER('连弩手', 26, 6, 'foot', [1, 4])],
    base: { hp: 20, mp: 3, atk: 8, def: 3, mag: 2, spd: 8 }, growth: { hp: 2.5, mp: 0.5, atk: 1.6, def: 0.8, mag: 0.3, spd: 1.4 },
    promo: { hp: 4, mp: 1, atk: 3, def: 1, spd: 2 },
    skills: [[3, 'aimShot'], [5, 'spreadShot'], [7, 'doubleShot'], [10, 'arrowRain'], [11, 'pierceArrow'], [19, 'hawkEye'], [23, 'starArrows']] },
  priest: { line: '牧师系', type: '牧师', weapon: ['staff'], sprite: 'priest',
    tiers: [TIER('修士', 1, 4), TIER('牧师', 6, 4), TIER('祭司', 12, 5), TIER('主教', 19, 5), TIER('大神官', 26, 5)],
    base: { hp: 18, mp: 16, atk: 3, def: 3, mag: 7, spd: 6 }, growth: { hp: 2.2, mp: 2.2, atk: 0.4, def: 0.7, mag: 1.5, spd: 1.0 },
    promo: { hp: 4, mp: 6, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'heal'], [3, 'holyLight'], [6, 'bless'], [9, 'bigHeal'], [12, 'cureAll'], [14, 'holyNova'], [16, 'unstone'], [18, 'strongHeal'], [24, 'fullHeal'], [28, 'sumAngel']] },
  sorcerer: { line: '咒术师系', type: '咒术师', weapon: ['staff'], sprite: 'sorcerer',
    tiers: [TIER('咒术师', 1, 4), TIER('巫师', 10, 5), TIER('魔道士', 20, 5)],
    base: { hp: 18, mp: 18, atk: 3, def: 3, mag: 8, spd: 6 }, growth: { hp: 2.2, mp: 2.4, atk: 0.4, def: 0.7, mag: 1.6, spd: 1.0 },
    promo: { hp: 6, mp: 8, atk: 1, def: 2, mag: 4, spd: 1 },
    skills: [[1, 'evilArrow'], [3, 'poison'], [6, 'weaken'], [7, 'poisonCloud'], [8, 'sumEarth'], [11, 'silence'], [13, 'sumWater'], [15, 'curseWind'], [17, 'sumFire'],
      [19, 'sumWind'], [22, 'vortex'], [25, 'sumDemon'], [28, 'devour'], [31, 'sumTurtle']] },
  mage: { line: '法师系', type: '法师', weapon: ['staff'], sprite: 'mage',
    tiers: [TIER('魔术士', 1, 4), TIER('魔术师', 6, 4), TIER('魔法师', 12, 5), TIER('法师', 19, 5), TIER('大法师', 26, 5)],
    base: { hp: 17, mp: 18, atk: 3, def: 2, mag: 9, spd: 6 }, growth: { hp: 2.0, mp: 2.4, atk: 0.4, def: 0.6, mag: 1.8, spd: 1.0 },
    promo: { hp: 4, mp: 6, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'fireball'], [3, 'tornado'], [5, 'thunder'], [6, 'attackUp'], [11, 'haste'], [14, 'firestorm'], [17, 'heatBeam'], [20, 'dazzle'],
      [23, 'lightning'], [27, 'stormThunder'], [31, 'fusion']] },
  spellblade: { line: '魔剑使', type: '魔剑使', weapon: ['sword'], sprite: 'spellblade',
    tiers: [TIER('魔剑使', 1, 6)],
    base: { hp: 26, mp: 14, atk: 9, def: 6, mag: 7, spd: 8 }, growth: { hp: 2.9, mp: 1.4, atk: 1.5, def: 1.0, mag: 1.2, spd: 1.2 },
    skills: [[1, 'fireball'], [1, 'rainbow'], [1, 'spinSlash'], [6, 'thunder'], [8, 'swordArc'], [10, 'soulBreak'], [12, 'twinSword'], [16, 'burstSword'], [20, 'heatBeam'], [24, 'chaosSword']] },
  master: { line: '大剑师', type: '剑士', weapon: ['sword'], sprite: 'master',
    tiers: [TIER('大剑师', 1, 6)],
    base: { hp: 30, mp: 10, atk: 12, def: 8, mag: 3, spd: 10 }, growth: { hp: 3.0, mp: 1.0, atk: 1.8, def: 1.2, mag: 0.4, spd: 1.2 },
    skills: [[1, 'rainbow'], [1, 'spinSlash'], [1, 'swordWave'], [1, 'earthSplit'], [1, 'burstSword'], [1, 'chaosSword'], [1, 'limitless'], [1, 'eightDragon'], [30, 'qiankun']] },
  babyDragon: { line: '龙族', type: '龙族', weapon: null, sprite: 'dragon',
    tiers: [TIER('小龙', 1, 5, 'fly', [1, 2]), TIER('飞龙', 8, 6, 'fly', [1, 2]), TIER('火龙', 16, 6, 'fly', [1, 2]), TIER('巨火龙', 24, 7, 'fly', [1, 2])],
    base: { hp: 24, mp: 6, atk: 9, def: 6, mag: 6, spd: 6 }, growth: { hp: 3.4, mp: 0.8, atk: 1.6, def: 1.2, mag: 1.0, spd: 1.0 },
    promo: { hp: 8, mp: 2, atk: 3, def: 2, mag: 2, spd: 1 },
    skills: [[1, 'breathFire'], [6, 'tailSweep'], [12, 'dragonFlame'], [16, 'firestorm']] },
  hawk: { line: '鹰族', type: '鹰族', weapon: ['claw', 'lance'], sprite: 'hawkman',
    tiers: [TIER('鹰族士兵', 1, 6, 'fly'), TIER('鹰战士', 10, 7, 'fly'), TIER('飞鹰战士', 20, 7, 'fly')],
    base: { hp: 22, mp: 3, atk: 9, def: 4, mag: 2, spd: 9 }, growth: { hp: 2.7, mp: 0.5, atk: 1.6, def: 0.9, mag: 0.3, spd: 1.4 },
    promo: { hp: 6, mp: 2, atk: 3, def: 2, spd: 2 },
    skills: [[1, 'dive'], [4, 'featherStorm'], [14, 'gustWing'], [16, 'tornado'], [24, 'skyStrike']] },
  wolf: { line: '狼族', type: '狼族', weapon: ['claw'], sprite: 'wolfman',
    tiers: [TIER('狼族士兵', 1, 6), TIER('狼战士', 10, 7), TIER('狼嚎战士', 20, 7)],
    base: { hp: 26, mp: 2, atk: 10, def: 5, mag: 0, spd: 9 }, growth: { hp: 3.2, mp: 0.4, atk: 1.8, def: 1.0, mag: 0.1, spd: 1.3 },
    promo: { hp: 6, mp: 1, atk: 3, def: 2, spd: 2 },
    skills: [[1, 'bite'], [8, 'roar'], [10, 'howl'], [11, 'frenzy'], [12, 'rendClaw'], [25, 'moonFang']] },

  // ===== 敌方 / NPC / 召唤物 =====
  soldier:    mk('士兵', '士兵', 'soldier', ['sword'], 'foot', [1, 1], 5, { hp: 20, mp: 0, atk: 7, def: 5, mag: 0, spd: 5 }, { hp: 2.8, mp: 0, atk: 1.5, def: 1.1, mag: 0, spd: 0.9 }),
  captain:    mk('队长', '士兵', 'captain', ['sword'], 'foot', [1, 1], 5, { hp: 26, mp: 6, atk: 9, def: 6, mag: 1, spd: 7 }, { hp: 3.0, mp: 0.5, atk: 1.7, def: 1.2, mag: 0.2, spd: 1.1 }, [[4, 'voidSword']]),
  crossbow:   mk('弩手', '弓箭手', 'archer', ['bow'], 'foot', [1, 4], 5, { hp: 20, mp: 0, atk: 9, def: 4, mag: 0, spd: 7 }, { hp: 2.5, mp: 0, atk: 1.6, def: 0.9, mag: 0, spd: 1.1 }),
  darkKnight: mk('黑骑士', '骑兵', 'darkKnight', ['lance'], 'horse', [1, 1], 6, { hp: 27, mp: 6, atk: 10, def: 8, mag: 2, spd: 6 }, { hp: 3.2, mp: 0.4, atk: 1.7, def: 1.3, mag: 0.3, spd: 1.0 }, [[1, 'thrust']]),
  bandit:     mk('沙盗', '士兵', 'bandit', ['axe'], 'foot', [1, 1], 5, { hp: 22, mp: 0, atk: 9, def: 3, mag: 0, spd: 6 }, { hp: 3.0, mp: 0, atk: 1.7, def: 0.8, mag: 0, spd: 1.0 }),
  banditRider:mk('沙盗骑兵', '骑兵', 'banditRider', ['axe'], 'horse', [1, 1], 7, { hp: 24, mp: 0, atk: 9, def: 4, mag: 0, spd: 7 }, { hp: 3.0, mp: 0, atk: 1.7, def: 0.9, mag: 0, spd: 1.1 }),
  villager:   mk('村民', '士兵', 'villager', null, 'foot', [1, 1], 4, { hp: 34, mp: 0, atk: 2, def: 8, mag: 4, spd: 4 }, { hp: 3.6, mp: 0, atk: 0.3, def: 1.3, mag: 0.8, spd: 0.5 }),
  king:       mk('帝王', '剑士', 'king', ['sword'], 'foot', [1, 1], 5, { hp: 32, mp: 24, atk: 11, def: 8, mag: 7, spd: 7 }, { hp: 3.0, mp: 1.0, atk: 1.5, def: 1.1, mag: 0.9, spd: 0.9 }, [[1, 'thunder'], [1, 'rainbow'], [10, 'burstSword']]),
  shaman:     mk('神巫', '咒术师', 'shaman', ['staff'], 'foot', [1, 1], 4, { hp: 22, mp: 30, atk: 4, def: 4, mag: 8, spd: 6 }, { hp: 2.6, mp: 2.0, atk: 0.5, def: 0.9, mag: 1.4, spd: 0.9 }),
  slime:      mk('黏怪', '黏怪', 'slime', null, 'foot', [1, 1], 4, { hp: 22, mp: 0, atk: 7, def: 6, mag: 0, spd: 3 }, { hp: 3.0, mp: 0, atk: 1.3, def: 1.2, mag: 0, spd: 0.6 }, [[1, 'acid']]),
  watersnake: mk('水蛇', '水中', 'watersnake', null, 'water', [1, 1], 5, { hp: 18, mp: 0, atk: 8, def: 4, mag: 0, spd: 8 }, { hp: 2.5, mp: 0, atk: 1.5, def: 0.9, mag: 0, spd: 1.2 }, [[1, 'venom']]),
  crocodile:  mk('鳄鱼', '爬虫', 'crocodile', null, 'water', [1, 1], 4, { hp: 26, mp: 0, atk: 10, def: 7, mag: 0, spd: 4 }, { hp: 3.4, mp: 0, atk: 1.7, def: 1.3, mag: 0, spd: 0.7 }),
  hydra:      mk('多头蛇怪', '爬虫', 'hydra', null, 'water', [1, 2], 4, { hp: 34, mp: 20, atk: 11, def: 8, mag: 8, spd: 6 }, { hp: 3.6, mp: 1.0, atk: 1.7, def: 1.3, mag: 1.2, spd: 0.8 }, [[1, 'breathIce'], [1, 'acid'], [12, 'freezeWave']]),
  gargoyle:   mk('石像鬼', '魔族', 'gargoyle', null, 'fly', [1, 1], 6, { hp: 24, mp: 0, atk: 9, def: 8, mag: 0, spd: 7 }, { hp: 2.9, mp: 0, atk: 1.6, def: 1.4, mag: 0, spd: 1.0 }),
  medusa:     mk('梅莎', '魔族', 'medusa', null, 'foot', [1, 1], 4, { hp: 22, mp: 14, atk: 8, def: 5, mag: 8, spd: 7 }, { hp: 2.6, mp: 1.0, atk: 1.4, def: 1.0, mag: 1.3, spd: 1.0 }, [[1, 'gaze']]),
  scorpion:   mk('巨蝎', '兽类', 'scorpion', null, 'foot', [1, 1], 5, { hp: 24, mp: 0, atk: 10, def: 8, mag: 0, spd: 5 }, { hp: 3.0, mp: 0, atk: 1.7, def: 1.4, mag: 0, spd: 0.8 }, [[1, 'venom']]),
  spider:     mk('巨蜘蛛', '兽类', 'spider', null, 'foot', [1, 1], 5, { hp: 22, mp: 0, atk: 9, def: 6, mag: 0, spd: 8 }, { hp: 2.8, mp: 0, atk: 1.6, def: 1.0, mag: 0, spd: 1.2 }, [[1, 'venom']]),
  giant:      mk('投石巨人', '巨怪', 'giant', null, 'foot', [2, 3], 4, { hp: 34, mp: 0, atk: 12, def: 7, mag: 0, spd: 3 }, { hp: 4.0, mp: 0, atk: 1.9, def: 1.2, mag: 0, spd: 0.6 }),
  yeti:       mk('雪人', '巨怪', 'yeti', null, 'foot', [1, 2], 5, { hp: 32, mp: 10, atk: 11, def: 7, mag: 4, spd: 5 }, { hp: 3.8, mp: 0.6, atk: 1.8, def: 1.2, mag: 0.6, spd: 0.8 }, [[1, 'breathIce']]),
  sphinx:     mk('人面狮身', '巨怪', 'sphinx', null, 'foot', [1, 1], 6, { hp: 36, mp: 20, atk: 12, def: 9, mag: 10, spd: 7 }, { hp: 3.8, mp: 1.2, atk: 1.8, def: 1.4, mag: 1.4, spd: 1.0 }, [[1, 'gaze'], [1, 'thunder']]),
  roc:        mk('洛克鸟', '鹰族', 'roc', null, 'fly', [1, 1], 7, { hp: 22, mp: 0, atk: 10, def: 4, mag: 0, spd: 9 }, { hp: 2.7, mp: 0, atk: 1.7, def: 0.8, mag: 0, spd: 1.3 }),
  seaMonster: mk('海怪', '水中', 'seaMonster', null, 'water', [1, 1], 5, { hp: 26, mp: 0, atk: 10, def: 6, mag: 0, spd: 6 }, { hp: 3.2, mp: 0, atk: 1.7, def: 1.1, mag: 0, spd: 1.0 }),
  kraken:     mk('大海怪', '水中', 'kraken', null, 'water', [1, 2], 4, { hp: 40, mp: 20, atk: 13, def: 9, mag: 9, spd: 6 }, { hp: 4.0, mp: 1.0, atk: 1.8, def: 1.4, mag: 1.2, spd: 0.8 }, [[1, 'iceBall'], [1, 'acid']]),
  beast:      mk('魔兽', '狼族', 'beast', null, 'foot', [1, 1], 7, { hp: 22, mp: 0, atk: 10, def: 4, mag: 0, spd: 9 }, { hp: 2.8, mp: 0, atk: 1.7, def: 0.9, mag: 0, spd: 1.3 }),
  dragon:     mk('龙', '龙族', 'dragon', null, 'fly', [1, 2], 6, { hp: 32, mp: 10, atk: 12, def: 9, mag: 8, spd: 7 }, { hp: 3.8, mp: 0.6, atk: 1.8, def: 1.4, mag: 1.2, spd: 1.0 }, [[1, 'breathFire']]),
  demon:      mk('大恶魔', '魔族', 'demon', null, 'fly', [1, 2], 5, { hp: 38, mp: 40, atk: 13, def: 9, mag: 12, spd: 8 }, { hp: 3.6, mp: 1.6, atk: 1.6, def: 1.2, mag: 1.4, spd: 0.9 }, [[1, 'darkLight'], [1, 'sumSkeleton']]),
  darkLord:   mk('黑魔神', '黑暗系', 'darkLord', null, 'fly', [1, 2], 4, { hp: 50, mp: 80, atk: 14, def: 10, mag: 13, spd: 8 }, { hp: 4.0, mp: 2.0, atk: 1.6, def: 1.2, mag: 1.5, spd: 0.8 }, [[1, 'vortex'], [1, 'curseWind'], [1, 'darkLight'], [1, 'sumSkeleton']]),
  robot:      mk('自动士兵', '元素', 'robot', null, 'foot', [1, 3], 4, { hp: 26, mp: 0, atk: 10, def: 10, mag: 6, spd: 5 }, { hp: 3.0, mp: 0, atk: 1.6, def: 1.5, mag: 0.8, spd: 0.8 }, [[1, 'laser']]),
  console:    mk('主控台', '元素', 'console', null, 'foot', [1, 4], 0, { hp: 60, mp: 0, atk: 8, def: 12, mag: 10, spd: 3 }, { hp: 4.0, mp: 0, atk: 1.2, def: 1.4, mag: 1.2, spd: 0.4 }, [[1, 'laser']]),
  wind:       mk('大风', '元素', 'wind', null, 'fly', [1, 2], 6, { hp: 34, mp: 40, atk: 11, def: 7, mag: 12, spd: 10 }, { hp: 3.4, mp: 1.5, atk: 1.6, def: 1.0, mag: 1.4, spd: 1.2 }, [[1, 'tornado'], [1, 'lightning'], [1, 'thunder']]),
  pigdragon:  mk('豬頭龍', '龙族', 'pigdragon', null, 'fly', [1, 2], 5, { hp: 22, mp: 0, atk: 9, def: 5, mag: 6, spd: 6 }, { hp: 2.7, mp: 0, atk: 1.5, def: 1.0, mag: 1.0, spd: 0.9 }, [[1, 'acid']]),
  spiritEarth:mk('土精灵', '元素', 'spiritEarth', null, 'foot', [1, 1], 4, { hp: 26, mp: 20, atk: 8, def: 10, mag: 8, spd: 5 }, { hp: 3, mp: 1, atk: 1.3, def: 1.4, mag: 1.2, spd: 0.8 }, [[1, 'earthArrow'], [8, 'quake']]),
  spiritFire: mk('火精灵', '元素', 'spiritFire', null, 'fly', [1, 1], 5, { hp: 20, mp: 20, atk: 6, def: 5, mag: 10, spd: 8 }, { hp: 2.5, mp: 1, atk: 1, def: 1, mag: 1.6, spd: 1.1 }, [[1, 'fireball'], [10, 'firestorm']]),
  spiritWind: mk('风精灵', '元素', 'spiritWind', null, 'fly', [1, 1], 7, { hp: 18, mp: 20, atk: 6, def: 4, mag: 9, spd: 11 }, { hp: 2.3, mp: 1, atk: 1, def: 0.8, mag: 1.5, spd: 1.4 }, [[1, 'tornado'], [10, 'thunder']]),
  spiritWater:mk('水精灵', '元素', 'spiritWater', null, 'fly', [1, 1], 5, { hp: 20, mp: 24, atk: 5, def: 5, mag: 9, spd: 8 }, { hp: 2.5, mp: 1.2, atk: 0.8, def: 1, mag: 1.4, spd: 1.1 }, [[1, 'iceArrow'], [1, 'heal'], [10, 'bigHeal']]),
  demonSummon:mk('魔族', '魔族', 'demon', null, 'fly', [1, 2], 5, { hp: 30, mp: 20, atk: 12, def: 8, mag: 10, spd: 8 }, { hp: 3.2, mp: 1, atk: 1.6, def: 1.2, mag: 1.3, spd: 0.9 }, [[1, 'darkLight']]),
  angel:      mk('天使', '元素', 'angel', null, 'fly', [1, 1], 6, { hp: 28, mp: 40, atk: 10, def: 8, mag: 12, spd: 10 }, { hp: 3, mp: 1.5, atk: 1.4, def: 1.2, mag: 1.6, spd: 1.2 }, [[1, 'holyLight'], [1, 'bigHeal']]),
  turtle:     mk('巨龟', '爬虫', 'turtle', null, 'water', [1, 1], 4, { hp: 50, mp: 0, atk: 12, def: 16, mag: 0, spd: 3 }, { hp: 4.5, mp: 0, atk: 1.6, def: 2.0, mag: 0, spd: 0.5 }),
};
// 关卡里的兵种 id → 职业 key（人类兵种直接沿用我方职业系，按等级自动显示阶级名）
// ===== 转职分支：到达 at 阶时可选择 A（原作路线）或 B 路线 =====
// B 路线的各阶等级与 A 相同；skills 取代 A 路线在分支等级之后学到的招式
const ALT = (at, sprite, label, desc, focus, tiers, growth, promo, skills, extra) => Object.assign({ at, sprite, label, desc, focus, tiers, growth, promo, skills }, extra || {});
Object.assign(CLASSES.swordsman, { aLabel: '剑圣之道', aDesc: '专精剑术与双人剑式的正统剑士', aFocus: '攻击 · 速度',
  alt: ALT(2, 'swordsman_b', '魔剑之道', '以剑为杖，剑技与攻击魔法兼修', '攻击 · 魔力',
    [TIER('魔法剑士', 12, 5), TIER('魔导剑士', 19, 6), TIER('圣魔剑士', 26, 6)],
    { hp: 2.7, mp: 1.6, atk: 1.5, def: 1.0, mag: 1.3, spd: 1.2 }, { hp: 4, mp: 6, atk: 2, def: 1, mag: 3, spd: 1 },
    [[12, 'fireball'], [12, 'flameSword'], [14, 'thunder'], [17, 'thunderSword'], [20, 'frostSword'], [24, 'heatBeam'], [28, 'arcaneBlade']]) });
Object.assign(CLASSES.knight, { aLabel: '天空之道', aDesc: '骑乘天马、飞龙，翱翔战场的机动骑士', aFocus: '移动 · 飞行',
  alt: ALT(2, 'knight_b', '圣骑之道', '重甲与圣光守护同伴的骑士，能治疗', '防御 · 治疗',
    [TIER('重装骑士', 12, 5, 'horse'), TIER('圣骑士', 19, 6, 'horse'), TIER('皇家骑士', 26, 6, 'horse')],
    { hp: 3.6, mp: 1.0, atk: 1.4, def: 1.7, mag: 0.7, spd: 0.8 }, { hp: 8, mp: 3, atk: 2, def: 4, mag: 2, spd: 0 },
    [[12, 'shieldWall'], [12, 'heal'], [15, 'holyLance'], [19, 'bigHeal'], [24, 'holyNova'], [28, 'royalCharge']]) });
Object.assign(CLASSES.fighter, { aLabel: '圣战之道', aDesc: '攻守兼备、受光明祝福的战士', aFocus: '生命 · 防御',
  alt: ALT(2, 'fighter_b', '狂战之道', '舍弃防御、以狂怒换取毁灭性攻击', '攻击 · 暴击',
    [TIER('狂战士', 12, 5), TIER('斗神', 19, 6), TIER('破坏神', 26, 6)],
    { hp: 3.9, mp: 0.4, atk: 2.3, def: 0.7, mag: 0, spd: 1.1 }, { hp: 8, mp: 1, atk: 5, def: 0, mag: 0, spd: 2 },
    [[12, 'bloodRage'], [14, 'rampage'], [18, 'twinCleave'], [24, 'cataclysm'], [28, 'deathBlow']]) });
Object.assign(CLASSES.samurai, { aLabel: '武将之道', aDesc: '统率战场的将军，刀术与防御出众', aFocus: '防御 · 刀术',
  alt: ALT(2, 'samurai_b', '忍之道', '来去如影的忍者，移动力高，擅长毒、烟与暗杀', '速度 · 移动',
    [TIER('忍者', 12, 7), TIER('上忍', 19, 7), TIER('影忍', 26, 8)],
    { hp: 2.6, mp: 0.9, atk: 1.5, def: 0.9, mag: 0.5, spd: 1.9 }, { hp: 4, mp: 2, atk: 2, def: 1, mag: 0, spd: 4 },
    [[12, 'shuriken'], [14, 'poisonBlade'], [17, 'smokeBomb'], [21, 'shadowStrike'], [27, 'shadowDance']]) });
Object.assign(CLASSES.archer, { aLabel: '神射之道', aDesc: '精于弓弩连射的射手', aFocus: '攻击 · 连射',
  alt: ALT(2, 'archer_b', '游侠之道', '以魔力附箭的游侠，射程更远，会冻结与治疗', '射程 · 魔力',
    [TIER('游侠', 12, 5, 'foot', [2, 4]), TIER('魔弓手', 19, 5, 'foot', [2, 5]), TIER('天弓使', 26, 6, 'foot', [2, 5])],
    { hp: 2.4, mp: 1.3, atk: 1.5, def: 0.8, mag: 1.0, spd: 1.5 }, { hp: 4, mp: 4, atk: 2, def: 1, mag: 2, spd: 2 },
    [[12, 'frostArrow'], [15, 'thunderArrow'], [18, 'heal'], [22, 'arcaneArrow'], [27, 'starArrows']]) });
Object.assign(CLASSES.priest, { aLabel: '神官之道', aDesc: '专精治疗与神圣魔法的神职者', aFocus: '魔力 · 治疗',
  alt: ALT(2, 'priest_b', '武僧之道', '以拳证道的武僧，近身作战并能自我回复', '攻击 · 生命',
    [TIER('武僧', 12, 5), TIER('圣拳士', 19, 5), TIER('拳圣', 26, 6)],
    { hp: 3.2, mp: 1.0, atk: 1.8, def: 1.2, mag: 0.8, spd: 1.4 }, { hp: 7, mp: 2, atk: 3, def: 2, mag: 1, spd: 2 },
    [[12, 'chiPalm'], [12, 'cureAll'], [14, 'meditate'], [17, 'hundredFist'], [21, 'chiWave'], [27, 'holyFist']], { weapon: ['claw', 'staff'] }) });
Object.assign(CLASSES.mage, { aLabel: '元素之道', aDesc: '掌握火、风、雷的元素大魔法', aFocus: '魔力 · 范围',
  alt: ALT(2, 'mage_b', '时空之道', '操纵时间与空间：迟缓、停止时间，让同伴再次行动', '速度 · 辅助',
    [TIER('时空术士', 12, 5), TIER('时空法师', 19, 5), TIER('时空贤者', 26, 6)],
    { hp: 2.1, mp: 2.6, atk: 0.4, def: 0.7, mag: 1.6, spd: 1.3 }, { hp: 4, mp: 8, atk: 0, def: 1, mag: 3, spd: 2 },
    [[12, 'slow'], [16, 'timeStop'], [19, 'quicken'], [22, 'gravity'], [27, 'chronoBreak']]) });
Object.assign(CLASSES.sorcerer, { aLabel: '咒术之道', aDesc: '精通诅咒与黑暗魔法', aFocus: '魔力 · 异常',
  alt: ALT(1, 'sorcerer_b', '召唤之道', '同时操纵两只召唤兽，最终可召唤神龙', '召唤 · 魔力',
    [TIER('召唤士', 10, 5), TIER('召唤王', 20, 5)],
    { hp: 2.3, mp: 2.8, atk: 0.4, def: 0.8, mag: 1.6, spd: 1.0 }, { hp: 6, mp: 10, atk: 1, def: 2, mag: 3, spd: 1 },
    [[10, 'sumWater'], [12, 'sumFire'], [14, 'sumWind'], [16, 'silence'], [19, 'sumDemon'], [22, 'vortex'], [25, 'sumTurtle'], [28, 'sumDragon']], { maxSummons: 2 }) });
Object.assign(CLASSES.hawk, { aLabel: '鹰战之道', aDesc: '空中近战的勇士', aFocus: '攻击 · 速度',
  alt: ALT(1, 'hawkman_b', '风鹰之道', '驾驭风雷的鹰族术士', '魔力 · 范围',
    [TIER('风鹰术士', 10, 7, 'fly', [1, 2]), TIER('风暴之翼', 20, 7, 'fly', [1, 2])],
    { hp: 2.4, mp: 1.8, atk: 1.1, def: 0.8, mag: 1.5, spd: 1.4 }, { hp: 4, mp: 6, atk: 1, def: 1, mag: 3, spd: 2 },
    [[10, 'tornado'], [12, 'thunder'], [14, 'haste'], [16, 'lightning'], [24, 'stormThunder']]) });
Object.assign(CLASSES.wolf, { aLabel: '狼战之道', aDesc: '强韧的狼族战士', aFocus: '攻击 · 生命',
  alt: ALT(1, 'wolfman_b', '月影之道', '月光下疾驰的狼，速度与暴击惊人', '速度 · 暴击',
    [TIER('月影狼', 10, 7), TIER('月神狼', 20, 8)],
    { hp: 2.9, mp: 0.6, atk: 1.8, def: 0.8, mag: 0.3, spd: 1.8 }, { hp: 5, mp: 2, atk: 3, def: 1, mag: 0, spd: 4 },
    [[10, 'frenzy'], [14, 'moonFang'], [16, 'lunarHowl'], [22, 'moonRush']]) });
Object.assign(CLASSES.babyDragon, { aLabel: '火龙之道', aDesc: '喷吐烈焰的火龙', aFocus: '攻击 · 火焰',
  alt: ALT(2, 'dragon_b', '冰龙之道', '冰晶之龙，吐息能冻结敌人', '防御 · 冰冻',
    [TIER('冰龙', 16, 6, 'fly', [1, 2]), TIER('冰晶龙王', 24, 7, 'fly', [1, 2])],
    { hp: 3.6, mp: 1.0, atk: 1.5, def: 1.4, mag: 1.2, spd: 1.0 }, { hp: 8, mp: 2, atk: 3, def: 3, mag: 2, spd: 1 },
    [[16, 'breathIce'], [18, 'freezeWave'], [22, 'freeze'], [28, 'blizzard']]) });
const KIND_ALIAS = { wolfman: 'wolf', hawkman: 'hawk' };
// 被视为「黑暗」的类别（圣光术双倍伤害）
const DARK_TYPES = ['魔族', '黑暗系'];
// 敌方单位默认武器（按武器种类与等级段）
const DEFAULT_WEAPONS = {
  sword: ['ironSword', 'steelSword', 'silverSword', 'platinumSword', 'dragonSword'], blade: ['longBlade', 'longBlade', 'katana', 'katana', 'blueDragonBlade'],
  lance: ['spear', 'spear', 'silverLance', 'flameLance', 'divineLance'], bow: ['shortBow', 'longBow', 'silverBow', 'elfBow', 'sunBow'],
  staff: ['shortStaff', 'longStaff', 'crystalStaff', 'starStaff', 'spiritStaff'], axe: ['battleAxe', 'battleAxe', 'battleAxe', 'thunderHammer', 'thunderHammer'],
  claw: ['wolfFang', 'wolfFang', 'wolfFang', 'wolfFang', 'wolfFang'],
};
// 神巫的元素法术
const SHAMAN_SKILLS = {
  earth: [[1, 'earthArrow'], [1, 'sumPig'], [6, 'petrify'], [10, 'quake']],
  wood: [[1, 'evilArrow'], [1, 'poison'], [6, 'weaken'], [10, 'sumEarth']],
  water: [[1, 'iceArrow'], [1, 'freeze'], [8, 'iceBall'], [12, 'sumWater']],
  fire: [[1, 'fireball'], [1, 'sumFire'], [8, 'firestorm'], [14, 'heatBeam']],
  metal: [[1, 'thunder'], [1, 'defDown'], [10, 'lightning'], [16, 'stormThunder']],
};
const SHAMAN_NAME = { earth: '土神巫', wood: '木神巫', water: '水神巫', fire: '火神巫', metal: '金神巫' };
const DRAGON_BREATH = { red: 'breathFire', blue: 'breathIce', black: 'darkLight', green: 'acid' };

// ---------- 我方英雄 ----------
// lv / stats: 初次登场时的等级与能力（入队时若低于队伍平均会按成长率自动追上）
// skills: 个人专属技能（追加在职业技能之外）；noSkills: 不学的职业技能
const HEROES = {
  mengqi:   { name: '孟祈', cls: 'writer', lv: 1, hair: '#2a1a14', lord: true, weapon: 'woodSword',
              stats: { hp: 28, mp: 6, atk: 8, def: 5, mag: 3, spd: 8 }, bio: '来自地球的年轻作家，误闯时空裂缝来到科隆多。' },
  yangtie:  { name: '杨铁', cls: 'knight', lv: 2, hair: '#7a3a12', weapon: 'spear',
              stats: { hp: 28, mp: 3, atk: 10, def: 7, mag: 1, spd: 7 }, bio: '被迦纳帝国无故追杀的青年，正直重义。' },
  klein:    { name: '克莱恩', cls: 'fighter', lv: 2, hair: '#a05a1a', weapon: 'battleAxe',
              stats: { hp: 31, mp: 2, atk: 11, def: 5, mag: 0, spd: 5 }, bio: '厌倦战争的帝国逃兵，茱笛的哥哥。' },
  slade:    { name: '史莱德', cls: 'samurai', lv: 2, hair: '#3a3a4a', weapon: 'longBlade',
              stats: { hp: 28, mp: 3, atk: 10, def: 8, mag: 1, spd: 6 }, bio: '帝国逃兵，对战争深感厌恶。' },
  oz:       { name: '欧兹', cls: 'swordsman', lv: 2, hair: '#d8b040', weapon: 'ironSword',
              stats: { hp: 26, mp: 4, atk: 10, def: 5, mag: 2, spd: 8 }, bio: '帝国逃兵，一心想学习高深的剑术。' },
  xueer:    { name: '雪儿', cls: 'priest', lv: 3, hair: '#f0d070', weapon: 'shortStaff',
              stats: { hp: 21, mp: 20, atk: 4, def: 4, mag: 9, spd: 8 }, bio: '大剑师张青之女，活泼爽朗，说话毫不留情。' },
  judy:     { name: '茱笛', cls: 'archer', lv: 4, hair: '#c04a2a', weapon: 'shortBow',
              stats: { hp: 24, mp: 4, atk: 12, def: 4, mag: 2, spd: 11 }, bio: '克莱恩的妹妹，镜湖城的弓手。' },
  wushuang: { name: '无双', cls: 'mage', lv: 6, hair: '#1a1a2a', weapon: 'shortStaff',
              stats: { hp: 26, mp: 30, atk: 5, def: 5, mag: 16, spd: 10 }, bio: '赤子国的公主，聪慧果敢的魔法使。' },
  qu:       { name: '曲圆吉', cls: 'priest', lv: 20, hair: '#e8e8e8', weapon: 'crystalStaff',
              stats: { hp: 58, mp: 66, atk: 10, def: 18, mag: 36, spd: 18 }, bio: '赤子国大神官，忠心耿耿的老臣。' },
  hao:      { name: '郝西瑟', cls: 'sorcerer', lv: 9, hair: '#4a2a6a', weapon: 'shortStaff',
              stats: { hp: 34, mp: 36, atk: 6, def: 8, mag: 21, spd: 13 }, bio: '赤子国的术士，钻研黑暗与召唤之术。' },
  lian:     { name: '莲乔伊', cls: 'mage', lv: 9, hair: '#e07ab0', weapon: 'longStaff',
              stats: { hp: 32, mp: 38, atk: 6, def: 7, mag: 23, spd: 13 }, bio: '赤子国的魔法师，对魔法充满热忱。',
              skills: [[9, 'iceArrow'], [9, 'earthArrow'], [12, 'iceBall'], [14, 'petrify'], [16, 'freeze'], [19, 'skillUp'], [21, 'freezeWave'], [25, 'meteor'], [29, 'blizzard']],
              noSkills: ['fusion', 'stormThunder', 'heatBeam', 'lightning'] },
  dvra:     { name: '戴薇拉', cls: 'hawk', lv: 10, hair: '#8a5a2a', weapon: 'wolfFang',
              stats: { hp: 44, mp: 8, atk: 25, def: 13, mag: 4, spd: 22 }, bio: '鹰族的女战士，翱翔天际。' },
  kampeite: { name: '坎培特', cls: 'wolf', lv: 10, hair: '#6a6a7a', weapon: 'wolfFang',
              stats: { hp: 50, mp: 5, atk: 27, def: 14, mag: 1, spd: 21 }, bio: '狼族的勇士，体能与战技过人。' },
  liu:      { name: '刘队长', cls: 'spellblade', lv: 12, hair: '#202030', weapon: 'steelSword', armor: 'chainMail',
              stats: { hp: 58, mp: 32, atk: 26, def: 18, mag: 20, spd: 22 }, bio: '神秘剑士，前迦纳禁卫军队长，曾受杨铁之父大恩。' },
  lala:     { name: '拉拉', cls: 'babyDragon', lv: 15, hair: '#3aa860',
              stats: { hp: 60, mp: 16, atk: 28, def: 20, mag: 20, spd: 17 }, bio: '从龙谷被掳走的小龙，天真可爱。' },
  kaidi:    { name: '韩凯蒂', cls: 'knight', lv: 19, hair: '#f0a040', weapon: 'silverLance', armor: 'silverScale',
              stats: { hp: 72, mp: 10, atk: 36, def: 30, mag: 5, spd: 22 }, bio: '奥里国的女骑士队长，高傲而坚强。' },
  hake:     { name: '哈克', cls: 'archer', lv: 21, hair: '#5a3a1a', weapon: 'silverBow',
              stats: { hp: 66, mp: 8, atk: 38, def: 20, mag: 6, spd: 30 }, bio: '塔顿港的船长，擅长说故事。' },
  augustus: { name: '奥古斯都', cls: 'fighter', lv: 27, hair: '#c0c0c8', weapon: 'thunderHammer', armor: 'goldArmor',
              stats: { hp: 112, mp: 12, atk: 52, def: 32, mag: 4, spd: 26 }, bio: '黑暗大陆上的反抗者，率领残存的人们。' },
  zhangqing:{ name: '张青', cls: 'master', lv: 24, hair: '#e8e8e8', weapon: 'platinumSword', armor: 'knightArmor',
              stats: { hp: 96, mp: 34, atk: 48, def: 30, mag: 10, spd: 34 }, bio: '隐居的大剑师，雪儿之父，杨铁父亲的挚友。' },
};
// 能与孟祈等人施展双人剑式的职业（剑术系；骑兵、武士等有各自的专属战技）
const PAIR_CLASSES = ['writer', 'swordsman', 'master', 'spellblade'];

// =====================================================================
// 装备外观：武器 / 防具换了，地图小人、头像、战斗演出都要跟着变
// gearLook(itemId) → { kind, grade 0–4, metal: [暗, 中, 亮], glow?, weight? }
//   grade：0 铁木 · 1 钢 · 2 银 · 3 金 · 4 传说
//   weight（防具）：'cloth' 布袍 · 'leather' 皮甲 · 'mail' 锁甲鳞甲 · 'plate' 板甲 · 'shield' 盾
// =====================================================================
const GEAR_METAL = [['#4a4038', '#7a6a58', '#a89478'], ['#5a6068', '#8a929c', '#c0c8d0'], ['#7a8494', '#c4ccd8', '#f4f8ff'], ['#8a6418', '#d8a838', '#fff0a0'], ['#5a2a8a', '#a868e8', '#f0d8ff']];
const GEAR_GLOW = {
  holySword: '#fff4a0', dragonSword: '#ff6030', flameLance: '#ff7030', frostSword: '#80d0ff', blueDragonBlade: '#60a0ff', thunderHammer: '#ffe040',
  sunBow: '#ffd040', elfBow: '#80ff80', lightSword: '#fffbe0', sacredSword: '#ffe890', yinSwordItem: '#a0b0ff', ancientSword: '#c060ff', tianqing: '#80e0ff',
  shadowDagger: '#a040ff', energySword: '#60f0ff', griffinBlade: '#ff5050', divineLance: '#ffffff', starStaff: '#fff080', spiritStaff: '#a0ffd0', earthStaff: '#d0a060',
  elementRod: '#ff80ff', xuanmingBow: '#7070e0', meteorXbow: '#ff9040', oriScepter: '#ffd860', crystalStaff: '#a0e0ff', spiritBell: '#e0f0a0',
  dragonScale: '#e04020', goldArmor: '#ffd040', holyHelm: '#fff0a0', mindHelm: '#c080ff', spiritCape: '#80c0ff', mirrorShield: '#e0e0ff', dragonSinew: '#c03020',
  manaRobe: '#8060e0', senseArmor: '#60e0c0',
};
const GEAR_CACHE = {};
function gearLook(id) {
  if (!id || !ITEMS[id]) return null;
  if (GEAR_CACHE[id]) return GEAR_CACHE[id];
  const it = ITEMS[id];
  let look;
  if (it.type === 'weapon') {
    const p = it.kind === 'staff' ? (it.mag || 0) * 1.6 + (it.atk || 0) : (it.atk || 0) + (it.mag || 0) * 0.6;
    const grade = p >= 21 ? 4 : p >= 15 ? 3 : p >= 10 ? 2 : p >= 6 ? 1 : 0;
    look = { kind: it.kind, grade, metal: GEAR_METAL[grade], glow: GEAR_GLOW[id] || (grade >= 4 ? '#e0c0ff' : null) };
  } else if (it.type === 'armor') {
    const n = id.toLowerCase();
    const weight = /shield/.test(n) ? 'shield' : /robe|cape|cloak|cap|silk/.test(n) ? 'cloth' : /leather/.test(n) ? 'leather' : /chain|ring|scale|mail|sinew/.test(n) ? 'mail' : 'plate';
    const d = it.def || 0, grade = d >= 16 ? 4 : d >= 12 ? 3 : d >= 8 ? 2 : d >= 4 ? 1 : 0;
    look = { kind: 'armor', weight, grade, metal: GEAR_METAL[grade], glow: GEAR_GLOW[id] || null };
  } else look = { kind: 'acc', grade: 0, metal: GEAR_METAL[0], glow: GEAR_GLOW[id] || null };
  look.id = id;
  return (GEAR_CACHE[id] = look);
}
// 一个单位（或英雄存档）的装备外观；用作快取键的一部分
function gearOf(u) { return u ? { w: gearLook(u.weapon), a: gearLook(u.armor) } : { w: null, a: null }; }
function gearKey(u) { return u ? `${u.weapon || '-'}/${u.armor || '-'}` : '-/-'; }
