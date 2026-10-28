// 超时空英雄传说 3：狂神降世 —— 新职业、招式、道具、英雄、结局与作品设定
// 依原作资料整理（新大陆法尔马立克；血狮鹫兵团被卷入和会刺杀案，最终「弑神救世」），对白为重新撰写
// 原作的半即时 CT 制不采用：沿用系列一贯的回合制引擎（移动点数、方向、高低差、自由转职）
'use strict';

// ===================================================================
// 招式（新增）
// ===================================================================
Object.assign(SPELLS, {
  // 元素使（贝里奇娜）—— 纯相魔
  rockSpike:   { name: '岩锥',     school: '元', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'rock', desc: '大地隆起尖锐的岩锥' },
  hotWind:     { name: '焚风',     school: '元', mp: 10, power: 14, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '灼热的狂风扫过一片区域' },
  mudslide:    { name: '土石洪流', school: '元', mp: 14, power: 20, range: [1, 4], line: true, kind: 'magic', fx: 'rock', groundOnly: true, desc: '泥石倾泻，贯穿一列（只伤地面部队）' },
  tempest:     { name: '暴风雨',   school: '元', mp: 20, power: 26, range: [1, 5], area: 2, kind: 'magic', fx: 'bolt', desc: '狂风暴雨覆盖一大片区域' },
  bigRockSpike:{ name: '高级岩锥', school: '元', mp: 18, power: 34, range: [1, 4], kind: 'magic', fx: 'rock', desc: '巨大的岩锥贯穿单一敌人' },
  volcano:     { name: '火山爆发', school: '元', mp: 30, power: 44, range: [1, 5], area: 2, kind: 'magic', fx: 'fire', desc: '引发火山爆发，烈焰吞没一大片区域' },
  fourBurst:   { name: '四元素爆炸', school: '元', mp: 40, power: 54, range: [1, 5], area: 3, kind: 'magic', fx: 'holy', desc: '地水火风同时爆发，范围极大' },
  // 炼金术士
  acidFlask:   { name: '强酸瓶',   school: '炼', mp: 5,  power: 12, range: [1, 3], kind: 'magic', fx: 'acid', desc: '投掷腐蚀性的强酸' },
  flashPowder: { name: '闪光粉',   school: '炼', mp: 8,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 70, fx: 'holy', desc: '炸开刺眼的闪光，令敌人无法行动' },
  potionMist:  { name: '药雾',     school: '炼', mp: 10, power: 18, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '喷洒回复药雾，治疗一片友军' },
  blastFlask:  { name: '爆裂药',   school: '炼', mp: 16, power: 26, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '炼金炸药，炸伤一片敌人' },
  pepperPowder:{ name: '强力辣椒粉', school: '炼', mp: 8, range: [1, 3], kind: 'status', status: 'silence', turns: 3, chance: 75, fx: 'acid', desc: '呛得敌人念不出咒语' },
  // 德鲁依
  thornBind:   { name: '荆棘缠绕', school: '圣', mp: 10, range: [1, 4], kind: 'status', status: 'freeze', turns: 2, chance: 65, fx: 'acid', desc: '荆棘缠住敌人的脚步' },
  natureHeal:  { name: '自然之息', school: '圣', mp: 14, power: 26, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '森林之息治愈周围友军' },
  // 射手 / 长弓手
  chargeShot:  { name: '蓄力射击', school: '弓', mp: 8,  power: 16, range: [2, 5], kind: 'phys', sure: true, crit: 20, style: 'arrow', fx: 'slash', desc: '拉满弓弦的一击，射程 2-5' },
  sureShot:    { name: '必中',     school: '弓', mp: 4,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 40, turns: 2, fx: 'buff', desc: '凝神瞄准，2 回合内命中与暴击大增' },
  // 海贼（力奇）
  anchorSwing: { name: '锚击',     school: '斧', mp: 6,  power: 12, range: [1, 1], area: 1, kind: 'phys', sure: true, style: 'blade', fx: 'slash', desc: '抡起铁锚横扫周围' },
  cannonShot:  { name: '舰炮',     school: '技', mp: 14, power: 24, range: [2, 5], area: 1, kind: 'magic', fx: 'fire', desc: '呼叫船上的大炮轰击' },
  // 隐藏职业招式
  swordSaint:  { name: '剑圣·天翔', school: '剑', mp: 24, power: 42, range: [1, 3], area: 1, kind: 'phys', sure: true, crit: 20, style: 'rain', fx: 'holy', desc: '剑圣的绝技' },
  evilBlade:   { name: '剑邪·噬魂', school: '剑', mp: 24, power: 40, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'dark', desc: '吞噬灵魂的邪剑' },
  griffinDive: { name: '狮鹫俯冲', school: '翼', mp: 18, power: 34, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'wind', desc: '驾驭狮鹫从天而降' },
  kingArrow:   { name: '弓王·破天', school: '弓', mp: 22, power: 40, range: [2, 6], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'bolt', desc: '弓王的穿天一箭' },
  shadowSnipe: { name: '暗影狙击', school: '弓', mp: 18, power: 38, range: [2, 7], kind: 'phys', sure: true, crit: 40, style: 'arrow', fx: 'dark', desc: '从阴影中射出的致命一箭' },
  netherAxe:   { name: '幽冥斧',   school: '斧', mp: 20, power: 38, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'blade', fx: 'dark', desc: '幽冥之力灌注的巨斧' },
  thunderAxe:  { name: '雷风斧',   school: '斧', mp: 20, power: 36, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '雷与风缠绕的飞斧' },
  lightSaint:  { name: '圣光之愈', school: '圣', mp: 24, power: 60, range: [0, 4], area: 2, kind: 'heal', fx: 'heal', desc: '光之圣女的大范围治愈' },
  yamaFire:    { name: '阎魔之火', school: '幻', mp: 24, power: 40, range: [1, 5], area: 1, kind: 'magic', fx: 'dark', desc: '地狱之火' },
  holyDemon:   { name: '圣魔交辉', school: '幻', mp: 24, power: 36, range: [1, 5], area: 2, kind: 'magic', vsDark: 1.6, fx: 'holy', desc: '圣与魔交织的光' },
  specialOps:  { name: '特攻',     school: '忍', mp: 18, power: 40, range: [1, 1], kind: 'phys', sure: true, crit: 50, style: 'dash', fx: 'dark', desc: '一击必杀的特攻' },
  pirateKing:  { name: '海贼王之怒', school: '斧', mp: 22, power: 38, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'ice', desc: '大海般汹涌的连斩' },
  holySword:   { name: '神剑',     school: '剑', mp: 22, power: 38, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '神剑使的光之剑' },
  evilSword:   { name: '邪剑',     school: '剑', mp: 22, power: 40, range: [1, 2], kind: 'phys', sure: true, crit: 35, style: 'blade', fx: 'dark', desc: '邪剑使的暗之剑' },
  // 合技（双方都在隐藏职业、相邻时可用）
  ancientGolem:{ name: '太古机兵', school: '双', mp: 30, power: 58, range: [1, 6], area: 3, kind: 'pair', sure: true, partner: 'beiliqina', needHidden: true, vsDark: 1.5, fx: 'rock', desc: '与贝里奇娜唤醒太古机兵，大地之力笼罩战场（对黑暗系加成）' },
  ancientGolemB:{ name: '太古机兵', school: '双', mp: 30, power: 58, range: [1, 6], area: 3, kind: 'pair', sure: true, partner: 'kehelin', needHidden: true, vsDark: 1.5, fx: 'rock', desc: '与克荷林唤醒太古机兵，大地之力笼罩战场（对黑暗系加成）' },
  stormShot:   { name: '暴风散弹箭', school: '双', mp: 22, power: 44, range: [1, 1], cone: 4, kind: 'pair', sure: true, partner: 'lida', needHidden: true, fx: 'wind', desc: '与丽妲的风之箭雨，扇形覆盖前方' },
  chaosPulse:  { name: '混沌脉冲', school: '双', mp: 22, power: 46, range: [1, 5], line: true, kind: 'pair', sure: true, partner: 'kouqi', needHidden: true, fx: 'dark', desc: '与寇琪放出的黑暗脉冲，贯穿一列' },
  chaosPulseB: { name: '混沌脉冲', school: '双', mp: 22, power: 46, range: [1, 5], line: true, kind: 'pair', sure: true, partner: 'bobi', needHidden: true, fx: 'dark', desc: '与波比放出的黑暗脉冲，贯穿一列' },
  heatWave:    { name: '超热燎原火', school: '双', mp: 30, power: 54, range: [1, 6], area: 3, kind: 'pair', sure: true, partner: 'guluru', needHidden: true, fx: 'fire', desc: '与咕鲁鲁的燎原烈焰，烧遍战场' },
  // 敌方
  madRoar:     { name: '狂神咆哮', school: '技', mp: 16, power: 36, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '' },
  madJudgment: { name: '灭世审判', school: '技', mp: 28, power: 52, range: [1, 6], area: 2, kind: 'magic', fx: 'dark', desc: '' },
  dragonFlameX:{ name: '龙炎',     school: '技', mp: 20, power: 48, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '' },
  outsiderClaw:{ name: '异界之爪', school: '技', mp: 6,  power: 16, range: [1, 1], kind: 'magic', fx: 'dark', desc: '' },
});
Object.assign(SCHOOL_NAME, { 元: '纯相魔', 炼: '炼金术' });

// ===================================================================
// 职业（新增）
// hiddenOf：某位英雄专属的隐藏职业（条件见 CAMPAIGN_HEROES.g4[id].hidden）
// spriteTier：借用其他职业造型的哪一阶
// ===================================================================
const G4_HID = (name, mov, move, range) => [TIER(name, 1, mov, move, range)];
Object.assign(CLASSES, {
  // —— 男性基本职业 ——
  duelist: { line: '斗剑士系', type: '剑士', weapon: ['sword'], sprite: 'duelist', sex: 'm',
    tiers: [TIER('斗剑士', 1, 5), TIER('剑客', 8, 6), TIER('大剑师', 16, 6)],
    base: { hp: 27, mp: 8, atk: 11, def: 7, mag: 3, spd: 9 }, growth: { hp: 3.3, mp: 1.0, atk: 1.8, def: 1.2, mag: 0.5, spd: 1.4 },
    promo: { hp: 5, mp: 2, atk: 3, def: 1, mag: 0, spd: 2 },
    skills: [[1, 'voidSword'], [4, 'soulBreak'], [8, 'rainbow'], [12, 'earthSplit'], [16, 'burstSword'], [20, 'limitless'], [26, 'qiankun']] },
  longbowman: { line: '长弓手系', type: '弓箭手', weapon: ['bow'], sprite: 'longbowman', sex: 'm',
    tiers: [TIER('长弓手', 1, 5, 'foot', [2, 4]), TIER('神射手', 12, 5, 'foot', [2, 5])],
    base: { hp: 22, mp: 4, atk: 10, def: 4, mag: 2, spd: 9 }, growth: { hp: 2.6, mp: 0.6, atk: 1.7, def: 0.8, mag: 0.3, spd: 1.4 },
    promo: { hp: 4, mp: 1, atk: 3, def: 1, spd: 2 },
    skills: [[1, 'aimShot'], [4, 'sureShot'], [7, 'chargeShot'], [10, 'arrowRain'], [14, 'pierceArrow'], [20, 'starArrows']] },
  halberdier: { line: '长戟士系', type: '骑兵', weapon: ['lance'], sprite: 'halberdier', sex: 'm',
    tiers: [TIER('长戟士', 1, 5, 'foot', [1, 2]), TIER('游击骑士', 8, 7, 'horse'), TIER('飙风骑士', 16, 8, 'horse')],
    base: { hp: 28, mp: 4, atk: 10, def: 9, mag: 2, spd: 7 }, growth: { hp: 3.4, mp: 0.6, atk: 1.6, def: 1.5, mag: 0.3, spd: 1.1 },
    promo: { hp: 6, mp: 1, atk: 2, def: 2, mag: 0, spd: 2 },
    skills: [[1, 'thrust'], [4, 'whirlLance'], [8, 'lanceSweep'], [12, 'galeCharge'], [18, 'royalCharge']],
    aLabel: '游击之道', aDesc: '机动力极高的飙风骑士', aFocus: '机动 · 冲锋',
    alt: { at: 2, sprite: 'halberdier_b', label: '重装之道', desc: '全身重甲的重装骑士', focus: '防御 · 铁壁',
      tiers: [TIER('重装骑士', 16, 5, 'horse')],
      growth: { hp: 4.0, mp: 0.6, atk: 1.6, def: 2.0, mag: 0.3, spd: 0.8 }, promo: { hp: 10, def: 4, atk: 2 },
      skills: [[16, 'shieldWall'], [20, 'oath'], [24, 'dragonLance']] } },
  tribesman: { line: '蛮族战士系', type: '战士', weapon: ['axe'], sprite: 'tribesman', sex: 'm',
    tiers: [TIER('蛮族战士', 1, 5), TIER('装甲佣兵', 8, 5), TIER('狂战士', 16, 6)],
    base: { hp: 32, mp: 3, atk: 12, def: 7, mag: 1, spd: 7 }, growth: { hp: 3.8, mp: 0.4, atk: 1.9, def: 1.2, mag: 0.2, spd: 1.0 },
    promo: { hp: 7, mp: 0, atk: 3, def: 2, mag: 0, spd: 1 },
    skills: [[1, 'heavyBlow'], [4, 'warCry'], [8, 'axeWave'], [12, 'whirlAxe'], [16, 'berserk'], [22, 'overlord']],
    aLabel: '狂战之道', aDesc: '舍身狂攻的狂战士', aFocus: '攻击',
    alt: { at: 2, sprite: 'tribesman_b', label: '武斗僧之道', desc: '以拳脚与气功战斗的武斗僧', focus: '敏捷 · 气功',
      tiers: [TIER('武斗僧', 16, 6)], weapon: ['claw', 'axe'],
      growth: { hp: 3.4, mp: 1.0, atk: 1.7, def: 1.1, mag: 0.6, spd: 1.5 }, promo: { hp: 5, mp: 3, atk: 2, spd: 3 },
      skills: [[16, 'chiPalm'], [18, 'meditate'], [21, 'hundredFist'], [25, 'chiWave']] } },
  thief: { line: '盗贼系', type: '武士', weapon: ['blade'], sprite: 'thief', sex: 'm', passive: ['search', 'unlock'],
    tiers: [TIER('盗贼', 1, 7), TIER('义贼', 12, 7)],
    base: { hp: 22, mp: 6, atk: 9, def: 5, mag: 3, spd: 12 }, growth: { hp: 2.6, mp: 0.8, atk: 1.5, def: 0.8, mag: 0.5, spd: 1.7 },
    promo: { hp: 4, mp: 2, atk: 2, def: 1, spd: 3 },
    skills: [[1, 'shuriken'], [4, 'smokeBomb'], [8, 'poisonBlade'], [12, 'shadowStrike']] },
  alchemist: { line: '炼金术士系', type: '法师', weapon: ['staff'], sprite: 'alchemist',
    tiers: [TIER('炼金术士', 1, 5), TIER('巫师', 8, 5), TIER('降术师', 16, 5)],
    base: { hp: 20, mp: 16, atk: 5, def: 5, mag: 8, spd: 7 }, growth: { hp: 2.5, mp: 2.1, atk: 0.6, def: 0.9, mag: 1.5, spd: 1.1 },
    promo: { hp: 4, mp: 6, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'acidFlask'], [3, 'flashPowder'], [6, 'potionMist'], [9, 'pepperPowder'], [12, 'blastFlask'], [16, 'sumFire'], [20, 'sumEarth'], [24, 'sumDemon']],
    aLabel: '降术之道', aDesc: '驱使魔物的降术师', aFocus: '召唤',
    alt: { at: 2, sprite: 'alchemist_b', label: '邪术之道', desc: '钻研禁忌的邪术师', focus: '黑暗魔法',
      tiers: [TIER('邪术师', 16, 5)],
      growth: { hp: 2.4, mp: 2.3, atk: 0.5, def: 0.8, mag: 1.8, spd: 1.1 }, promo: { hp: 3, mp: 7, mag: 4 },
      skills: [[16, 'evilArrow'], [18, 'curseWind'], [22, 'vortex'], [26, 'devour']] } },
  monk: { line: '修士系', type: '牧师', weapon: ['staff'], sprite: 'monk', sex: 'm',
    tiers: [TIER('修士', 1, 5), TIER('德鲁依', 10, 5)],
    base: { hp: 22, mp: 16, atk: 5, def: 6, mag: 8, spd: 6 }, growth: { hp: 2.7, mp: 2.0, atk: 0.7, def: 1.0, mag: 1.4, spd: 1.0 },
    promo: { hp: 5, mp: 6, atk: 1, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'heal'], [3, 'holyLight'], [6, 'bless'], [10, 'thornBind'], [13, 'natureHeal'], [17, 'cureAll'], [22, 'fullHeal']] },
  // —— 女性基本职业 ——
  swordmaid: { line: '女战士系', type: '剑士', weapon: ['sword'], sprite: 'swordmaid', sex: 'f',
    tiers: [TIER('女战士', 1, 5), TIER('剑士', 8, 6), TIER('剑姬', 16, 6)],
    base: { hp: 25, mp: 8, atk: 10, def: 6, mag: 4, spd: 10 }, growth: { hp: 3.0, mp: 1.0, atk: 1.7, def: 1.1, mag: 0.6, spd: 1.5 },
    promo: { hp: 5, mp: 2, atk: 2, def: 1, mag: 1, spd: 2 },
    skills: [[1, 'voidSword'], [4, 'spinSlash'], [8, 'rainbow'], [12, 'twinSword'], [16, 'burstSword'], [22, 'limitless']] },
  shooter: { line: '射手系', type: '弓箭手', weapon: ['bow'], sprite: 'shooter', sex: 'f',
    tiers: [TIER('射手', 1, 5, 'foot', [2, 4]), TIER('弓骑手', 10, 7, 'horse', [2, 4])],
    base: { hp: 21, mp: 5, atk: 9, def: 4, mag: 3, spd: 11 }, growth: { hp: 2.5, mp: 0.7, atk: 1.6, def: 0.8, mag: 0.4, spd: 1.6 },
    promo: { hp: 4, mp: 1, atk: 2, def: 1, spd: 2 },
    skills: [[1, 'aimShot'], [3, 'spreadShot'], [6, 'doubleShot'], [10, 'chargeShot'], [14, 'arrowRain'], [20, 'hawkEye']] },
  pikemaid: { line: '长枪士系', type: '骑兵', weapon: ['lance'], sprite: 'pikemaid', sex: 'f',
    tiers: [TIER('长枪士', 1, 5, 'foot', [1, 2]), TIER('白羽骑士', 12, 7, 'fly')],
    base: { hp: 26, mp: 6, atk: 9, def: 8, mag: 4, spd: 8 }, growth: { hp: 3.1, mp: 0.9, atk: 1.5, def: 1.4, mag: 0.6, spd: 1.2 },
    promo: { hp: 6, mp: 2, atk: 2, def: 2, mag: 1, spd: 2 },
    skills: [[1, 'thrust'], [4, 'whirlLance'], [8, 'lanceSweep'], [12, 'pegasusLance'], [18, 'holyLance']] },
  amazon: { line: '亚马逊战士系', type: '战士', weapon: ['axe', 'claw'], sprite: 'amazon', sex: 'f',
    tiers: [TIER('亚马逊战士', 1, 5), TIER('铠甲士', 9, 5)],
    base: { hp: 30, mp: 4, atk: 11, def: 8, mag: 2, spd: 8 }, growth: { hp: 3.6, mp: 0.5, atk: 1.7, def: 1.4, mag: 0.3, spd: 1.1 },
    promo: { hp: 7, mp: 1, atk: 2, def: 3, spd: 1 },
    skills: [[1, 'heavyBlow'], [4, 'warCry'], [8, 'whirlAxe'], [12, 'shieldWall'], [17, 'quakeAxe']],
    aLabel: '铠甲之道', aDesc: '重甲的铠甲士', aFocus: '防御',
    alt: { at: 1, sprite: 'amazon_b', label: '拳法之道', desc: '赤手空拳的拳法家', focus: '敏捷 · 拳法',
      tiers: [TIER('拳法家', 9, 6)], weapon: ['claw'],
      growth: { hp: 3.0, mp: 1.0, atk: 1.7, def: 1.0, mag: 0.6, spd: 1.6 }, promo: { hp: 4, mp: 3, atk: 2, spd: 3 },
      skills: [[9, 'chiPalm'], [12, 'meditate'], [15, 'hundredFist'], [20, 'chiWave']] } },
  pickpocket: { line: '小偷系', type: '武士', weapon: ['blade'], sprite: 'pickpocket', sex: 'f', passive: ['search', 'unlock'],
    tiers: [TIER('小偷', 1, 7), TIER('杀手', 10, 7)],
    base: { hp: 21, mp: 6, atk: 9, def: 5, mag: 4, spd: 12 }, growth: { hp: 2.5, mp: 0.9, atk: 1.6, def: 0.8, mag: 0.6, spd: 1.7 },
    promo: { hp: 4, mp: 2, atk: 3, def: 1, spd: 2 },
    skills: [[1, 'shuriken'], [4, 'poisonBlade'], [8, 'smokeBomb'], [10, 'shadowStrike'], [18, 'shadowDance']] },
  sorceress: { line: '魔术士系', type: '法师', weapon: ['staff'], sprite: 'sorceress', sex: 'f',
    tiers: [TIER('魔术士', 1, 5), TIER('女巫', 10, 5)],
    base: { hp: 19, mp: 18, atk: 4, def: 4, mag: 9, spd: 8 }, growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.2 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'fireball'], [2, 'iceArrow'], [5, 'thunder'], [9, 'weaken'], [10, 'firestorm'], [14, 'silence'], [18, 'blizzard'], [24, 'stormThunder']] },
  nun: { line: '修女系', type: '牧师', weapon: ['staff'], sprite: 'nun', sex: 'f',
    tiers: [TIER('修女', 1, 5), TIER('主教', 10, 5)],
    base: { hp: 20, mp: 18, atk: 4, def: 5, mag: 8, spd: 7 }, growth: { hp: 2.4, mp: 2.2, atk: 0.5, def: 0.9, mag: 1.5, spd: 1.1 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'heal'], [3, 'holyLight'], [6, 'bigHeal'], [10, 'cureAll'], [13, 'holyNova'], [17, 'strongHeal'], [22, 'fullHeal']],
    aLabel: '主教之道', aDesc: '统领教团的主教', aFocus: '回复',
    alt: { at: 1, sprite: 'nun_b', label: '精灵之道', desc: '与精灵立约的精灵使', focus: '召唤',
      tiers: [TIER('精灵使', 10, 5)],
      growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.2 }, promo: { hp: 3, mp: 7, mag: 4 },
      skills: [[10, 'sumWind'], [12, 'sumWater'], [16, 'sumEarth'], [20, 'sumFire'], [26, 'sumAngel']] } },
  // —— 特殊职业 ——
  elementalist: { line: '元素使系', type: '法师', weapon: ['staff'], sprite: 'elementalist', sex: 'f',
    tiers: [TIER('元素使', 1, 5), TIER('大元素使', 14, 5)],
    base: { hp: 21, mp: 20, atk: 4, def: 5, mag: 10, spd: 8 }, growth: { hp: 2.5, mp: 2.5, atk: 0.5, def: 0.9, mag: 1.8, spd: 1.1 },
    promo: { hp: 5, mp: 8, atk: 0, def: 1, mag: 4, spd: 1 },
    skills: [[1, 'rockSpike'], [1, 'heal'], [4, 'hotWind'], [8, 'mudslide'], [12, 'tempest'], [16, 'bigRockSpike'], [22, 'volcano'], [30, 'fourBurst']] },
  pirate: { line: '海贼系', type: '战士', weapon: ['axe', 'sword'], sprite: 'pirate', sex: 'm',
    tiers: [TIER('海贼', 1, 6), TIER('海贼船长', 12, 6)],
    base: { hp: 30, mp: 6, atk: 12, def: 7, mag: 2, spd: 9 }, growth: { hp: 3.5, mp: 0.8, atk: 1.8, def: 1.1, mag: 0.3, spd: 1.3 },
    promo: { hp: 6, mp: 2, atk: 3, def: 1, spd: 1 },
    skills: [[1, 'anchorSwing'], [4, 'warCry'], [8, 'axeWave'], [12, 'cannonShot'], [18, 'whirlAxe']] },
  summoner: { line: '召唤士系', type: '咒术师', weapon: ['staff'], sprite: 'summoner',
    tiers: [TIER('召唤士', 1, 5), TIER('召唤师', 12, 5)],
    base: { hp: 19, mp: 20, atk: 4, def: 4, mag: 9, spd: 7 }, growth: { hp: 2.3, mp: 2.5, atk: 0.4, def: 0.8, mag: 1.6, spd: 1.0 },
    promo: { hp: 4, mp: 8, mag: 3, def: 1 },
    skills: [[1, 'sumEarth'], [3, 'sumWater'], [6, 'sumWind'], [9, 'sumFire'], [12, 'sumTurtle'], [18, 'sumDemon'], [24, 'sumDragon']] },
  // —— 隐藏职业（各英雄专属；条件见英雄资料 hidden）——
  gSwordSaint:  { line: '剑圣', type: '剑士', weapon: ['sword'], sprite: 'gSwordSaint', hiddenOf: 'kehelin', tiers: G4_HID('剑圣', 7),
    base: { hp: 34, mp: 14, atk: 14, def: 10, mag: 6, spd: 13 }, growth: { hp: 3.6, mp: 1.4, atk: 2.1, def: 1.4, mag: 0.8, spd: 1.6 },
    skills: [[1, 'swordSaint'], [1, 'holyLight'], [1, 'ancientGolem'], [10, 'qiankun']] },
  gSwordEvil:   { line: '剑邪', type: '剑士', weapon: ['sword'], sprite: 'gSwordEvil', hiddenOf: 'kehelin', tiers: G4_HID('剑邪', 7), passive: ['drain'],
    base: { hp: 32, mp: 14, atk: 15, def: 9, mag: 7, spd: 13 }, growth: { hp: 3.4, mp: 1.4, atk: 2.2, def: 1.2, mag: 1.0, spd: 1.6 },
    skills: [[1, 'evilBlade'], [1, 'curseWind'], [1, 'ancientGolem'], [10, 'devour']] },
  gGriffin:     { line: '狮鹫骑士', type: '鹰族', weapon: ['lance', 'sword'], sprite: 'gGriffin', hiddenOf: 'kehelin', tiers: G4_HID('狮鹫骑士', 8, 'fly'),
    base: { hp: 34, mp: 10, atk: 14, def: 11, mag: 4, spd: 13 }, growth: { hp: 3.6, mp: 1.0, atk: 2.0, def: 1.5, mag: 0.6, spd: 1.6 },
    skills: [[1, 'griffinDive'], [1, 'galeCharge'], [1, 'ancientGolem'], [10, 'wyvernLance']] },
  gBowKing:     { line: '弓王', type: '弓箭手', weapon: ['bow'], sprite: 'gBowKing', hiddenOf: 'maisi', tiers: G4_HID('弓王', 6, 'foot', [2, 6]),
    base: { hp: 28, mp: 8, atk: 14, def: 7, mag: 3, spd: 13 }, growth: { hp: 3.0, mp: 1.0, atk: 2.1, def: 1.1, mag: 0.4, spd: 1.6 },
    skills: [[1, 'kingArrow'], [1, 'stormShot'], [10, 'starArrows']] },
  gShadowSniper:{ line: '暗影狙击手', type: '弓箭手', weapon: ['bow'], sprite: 'gShadowSniper', hiddenOf: 'maisi', tiers: G4_HID('暗影狙击手', 7, 'foot', [2, 7]), passive: ['search'],
    base: { hp: 26, mp: 10, atk: 14, def: 6, mag: 4, spd: 15 }, growth: { hp: 2.8, mp: 1.1, atk: 2.1, def: 0.9, mag: 0.6, spd: 1.8 },
    skills: [[1, 'shadowSnipe'], [1, 'stormShot'], [10, 'smokeBomb']] },
  gLightMaiden: { line: '光之圣女', type: '牧师', weapon: ['staff', 'claw'], sprite: 'gLightMaiden', hiddenOf: 'beiliqina', tiers: G4_HID('光之圣女', 6),
    base: { hp: 30, mp: 30, atk: 8, def: 9, mag: 15, spd: 12 }, growth: { hp: 3.0, mp: 2.8, atk: 1.0, def: 1.2, mag: 2.0, spd: 1.3 },
    skills: [[1, 'lightSaint'], [1, 'holyNova'], [1, 'ancientGolemB'], [10, 'fourBurst']] },
  gSpirit:      { line: '超灵体', type: '牧师', weapon: ['staff'], sprite: 'gSpirit', hiddenOf: 'beiliqina', tiers: G4_HID('超灵体', 7, 'fly'),
    base: { hp: 32, mp: 36, atk: 6, def: 10, mag: 18, spd: 13 }, growth: { hp: 3.0, mp: 3.0, atk: 0.8, def: 1.3, mag: 2.3, spd: 1.4 },
    skills: [[1, 'fourBurst'], [1, 'lightSaint'], [1, 'ancientGolemB'], [10, 'volcano']] },
  gNetherAxe:   { line: '幽冥斧王', type: '战士', weapon: ['axe'], sprite: 'gNetherAxe', hiddenOf: 'bobi', tiers: G4_HID('幽冥斧王', 6), passive: ['drain'],
    base: { hp: 40, mp: 8, atk: 16, def: 10, mag: 4, spd: 10 }, growth: { hp: 4.2, mp: 0.8, atk: 2.2, def: 1.4, mag: 0.6, spd: 1.2 },
    skills: [[1, 'netherAxe'], [1, 'chaosPulse'], [10, 'cataclysm']] },
  gThunderAxe:  { line: '雷风斧王', type: '战士', weapon: ['axe'], sprite: 'gThunderAxe', hiddenOf: 'bobi', tiers: G4_HID('雷风斧王', 7),
    base: { hp: 38, mp: 10, atk: 16, def: 9, mag: 6, spd: 12 }, growth: { hp: 4.0, mp: 1.0, atk: 2.2, def: 1.3, mag: 0.8, spd: 1.4 },
    skills: [[1, 'thunderAxe'], [1, 'chaosPulse'], [10, 'deathBlow']] },
  gMagicBlade:  { line: '魔剑使', type: '剑士', weapon: ['sword'], sprite: 'gMagicBlade', hiddenOf: 'kouqi', tiers: G4_HID('魔剑使', 7),
    base: { hp: 30, mp: 16, atk: 14, def: 8, mag: 10, spd: 13 }, growth: { hp: 3.2, mp: 1.8, atk: 2.0, def: 1.1, mag: 1.4, spd: 1.6 },
    skills: [[1, 'arcaneBlade'], [1, 'chaosPulseB'], [10, 'limitless']] },
  gSpellSword:  { line: '魔法剑士', type: '剑士', weapon: ['sword', 'staff'], sprite: 'gSpellSword', hiddenOf: 'kouqi', tiers: G4_HID('魔法剑士', 6),
    base: { hp: 28, mp: 22, atk: 12, def: 8, mag: 13, spd: 12 }, growth: { hp: 3.0, mp: 2.2, atk: 1.7, def: 1.1, mag: 1.8, spd: 1.4 },
    skills: [[1, 'thunderSword'], [1, 'firestorm'], [1, 'chaosPulseB'], [10, 'stormThunder']] },
  gYama:        { line: '阎魔使', type: '咒术师', weapon: ['staff'], sprite: 'gYama', hiddenOf: 'pulusi', tiers: G4_HID('阎魔使', 6),
    base: { hp: 26, mp: 34, atk: 5, def: 7, mag: 17, spd: 12 }, growth: { hp: 2.8, mp: 2.8, atk: 0.5, def: 1.0, mag: 2.2, spd: 1.3 },
    skills: [[1, 'yamaFire'], [1, 'nightmare'], [1, 'heatWave'], [10, 'devour']] },
  gHolyDemon:   { line: '圣魔使', type: '咒术师', weapon: ['staff'], sprite: 'gHolyDemon', hiddenOf: 'pulusi', tiers: G4_HID('圣魔使', 6),
    base: { hp: 28, mp: 34, atk: 5, def: 8, mag: 16, spd: 12 }, growth: { hp: 3.0, mp: 2.8, atk: 0.5, def: 1.1, mag: 2.1, spd: 1.3 },
    skills: [[1, 'holyDemon'], [1, 'bigHeal'], [1, 'heatWave'], [10, 'mirrorBlade']] },
  gSpecialOps:  { line: '特攻', type: '武士', weapon: ['blade'], sprite: 'gSpecialOps', hiddenOf: 'baihe', tiers: G4_HID('特攻', 8), passive: ['search', 'unlock'],
    base: { hp: 28, mp: 10, atk: 15, def: 7, mag: 5, spd: 17 }, growth: { hp: 3.0, mp: 1.0, atk: 2.2, def: 1.0, mag: 0.6, spd: 2.0 },
    skills: [[1, 'specialOps'], [1, 'shadowDance'], [10, 'musou']] },
  gShadowNinja: { line: '影忍', type: '武士', weapon: ['blade', 'claw'], sprite: 'gShadowNinja', hiddenOf: 'baihe', tiers: G4_HID('影忍', 8), passive: ['search', 'unlock', 'combo'],
    base: { hp: 27, mp: 12, atk: 14, def: 7, mag: 6, spd: 18 }, growth: { hp: 2.9, mp: 1.2, atk: 2.0, def: 1.0, mag: 0.8, spd: 2.1 },
    skills: [[1, 'shadowDance'], [1, 'hundredFist'], [10, 'shadowStrike']] },
  gPirateKing:  { line: '海贼王', type: '战士', weapon: ['axe', 'sword'], sprite: 'gPirateKing', hiddenOf: 'liqi', tiers: G4_HID('海贼王', 7),
    base: { hp: 40, mp: 10, atk: 16, def: 10, mag: 4, spd: 12 }, growth: { hp: 4.0, mp: 1.0, atk: 2.1, def: 1.4, mag: 0.5, spd: 1.4 },
    skills: [[1, 'pirateKing'], [1, 'cannonShot'], [10, 'cataclysm']] },
  gSeaLord:     { line: '黑海霸主', type: '战士', weapon: ['axe', 'blade'], sprite: 'gSeaLord', hiddenOf: 'liqi', tiers: G4_HID('黑海霸主', 7), passive: ['search', 'unlock'],
    base: { hp: 36, mp: 12, atk: 15, def: 9, mag: 6, spd: 14 }, growth: { hp: 3.8, mp: 1.2, atk: 2.0, def: 1.2, mag: 0.8, spd: 1.6 },
    skills: [[1, 'pirateKing'], [1, 'freezeWave'], [10, 'blizzard']] },
  gEvilSword:   { line: '邪剑使', type: '剑士', weapon: ['sword'], sprite: 'gEvilSword', hiddenOf: 'nafeiya', tiers: G4_HID('邪剑使', 7), passive: ['drain'],
    base: { hp: 30, mp: 14, atk: 15, def: 8, mag: 8, spd: 14 }, growth: { hp: 3.2, mp: 1.4, atk: 2.2, def: 1.1, mag: 1.0, spd: 1.7 },
    skills: [[1, 'evilSword'], [1, 'curseWind'], [10, 'devour']] },
  gHolySword:   { line: '神剑使', type: '剑士', weapon: ['sword'], sprite: 'gHolySword', hiddenOf: 'nafeiya', tiers: G4_HID('神剑使', 7),
    base: { hp: 32, mp: 14, atk: 14, def: 10, mag: 8, spd: 13 }, growth: { hp: 3.4, mp: 1.4, atk: 2.0, def: 1.4, mag: 1.0, spd: 1.6 },
    skills: [[1, 'holySword'], [1, 'holyLight'], [10, 'heroSlash']] },
  gLightKnight: { line: '光明骑士', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'gLightKnight', hiddenOf: 'nushayi', tiers: G4_HID('光明骑士', 7, 'horse'),
    base: { hp: 36, mp: 14, atk: 13, def: 12, mag: 8, spd: 11 }, growth: { hp: 3.8, mp: 1.4, atk: 1.8, def: 1.7, mag: 1.0, spd: 1.3 },
    skills: [[1, 'holyLance'], [1, 'heal'], [10, 'royalCharge']] },
  gHolyKnight:  { line: '圣骑士', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'gHolyKnight', hiddenOf: 'nushayi', tiers: G4_HID('圣骑士', 7, 'fly'),
    base: { hp: 38, mp: 18, atk: 14, def: 13, mag: 10, spd: 12 }, growth: { hp: 4.0, mp: 1.8, atk: 1.9, def: 1.8, mag: 1.2, spd: 1.3 },
    skills: [[1, 'holyLance'], [1, 'holyNova'], [1, 'bigHeal'], [10, 'dragonLance']] },
  gWhiteDragon: { line: '白龙', type: '龙族', weapon: null, sprite: 'dragon', spriteTier: 0, hiddenOf: 'guluru', tiers: G4_HID('白龙', 6, 'fly', [1, 2]),
    base: { hp: 44, mp: 20, atk: 14, def: 13, mag: 12, spd: 10 }, growth: { hp: 4.4, mp: 1.6, atk: 1.9, def: 1.7, mag: 1.5, spd: 1.1 },
    skills: [[1, 'breathIce'], [1, 'heatWave'], [10, 'blizzard']] },
  gBlackDragon: { line: '黑龙', type: '龙族', weapon: null, sprite: 'dragon', spriteTier: 0, hiddenOf: 'guluru', tiers: G4_HID('黑龙', 6, 'fly', [1, 2]),
    base: { hp: 44, mp: 20, atk: 16, def: 12, mag: 12, spd: 10 }, growth: { hp: 4.4, mp: 1.6, atk: 2.1, def: 1.5, mag: 1.5, spd: 1.1 },
    skills: [[1, 'breathFire'], [1, 'heatWave'], [10, 'dragonFlameX']] },
  // —— 敌方专用 ——
  maskman: { line: '蒙面人', type: '武士', weapon: ['blade'], sprite: 'maskman', tiers: [TIER('蒙面人', 1, 6), TIER('蒙面人队长', 15, 7)],
    base: { hp: 24, mp: 8, atk: 11, def: 6, mag: 4, spd: 11 }, growth: { hp: 2.8, mp: 0.8, atk: 1.7, def: 1.0, mag: 0.5, spd: 1.5 }, promo: { hp: 4, atk: 3, spd: 2 },
    skills: [[1, 'shuriken'], [12, 'smokeBomb']] },
  outsider: { line: '异界魔物', type: '黑暗系', weapon: null, sprite: 'outsider', tiers: [TIER('异界魔物', 1, 5)],
    base: { hp: 30, mp: 10, atk: 11, def: 8, mag: 8, spd: 7 }, growth: { hp: 3.6, mp: 0.8, atk: 1.7, def: 1.3, mag: 1.2, spd: 1.0 }, skills: [[1, 'outsiderClaw']] },
  madGod: { line: '狂神', type: '黑暗系', weapon: null, sprite: 'madGod', tiers: [TIER('狂神', 1, 4, 'fly', [1, 3])],
    base: { hp: 60, mp: 100, atk: 14, def: 13, mag: 16, spd: 10 }, growth: { hp: 4.6, mp: 2.6, atk: 1.6, def: 1.4, mag: 1.9, spd: 1.0 },
    skills: [[1, 'madRoar'], [1, 'curseWind'], [1, 'vortex'], [1, 'sumDemon']] },
  madGod2: { line: '狂神·真身', type: '黑暗系', weapon: null, sprite: 'madGod2', tiers: [TIER('狂神·真身', 1, 5, 'fly', [1, 3])],
    base: { hp: 80, mp: 140, atk: 18, def: 15, mag: 20, spd: 12 }, growth: { hp: 5.0, mp: 3.0, atk: 1.9, def: 1.5, mag: 2.2, spd: 1.1 },
    skills: [[1, 'madJudgment'], [1, 'madRoar'], [1, 'devour'], [1, 'sumDemon']] },
});

// ===================================================================
// 道具（新增）
// ===================================================================
Object.assign(ITEMS, {
  militiaSword: { name: '佣兵长剑', type: 'weapon', kind: 'sword', atk: 5, price: 160 },
  energySword:  { name: '能量剑',   type: 'weapon', kind: 'sword', atk: 16, mag: 3, price: 0, desc: '图那勇者王的佩剑' },
  griffinBlade: { name: '狮鹫之剑', type: 'weapon', kind: 'sword', atk: 20, crit: 8, price: 0, desc: '血狮鹫兵团的传承之剑' },
  compoundBow:  { name: '复合弓',   type: 'weapon', kind: 'bow', atk: 10, price: 820 },
  xuanmingBow:  { name: '玄冥弓',   type: 'weapon', kind: 'bow', atk: 14, crit: 6, price: 0 },
  meteorXbow:   { name: '流星弩',   type: 'weapon', kind: 'bow', atk: 16, price: 0 },
  halberd:      { name: '长戟',     type: 'weapon', kind: 'lance', atk: 7, price: 300 },
  poisonDagger: { name: '毒素匕首', type: 'weapon', kind: 'blade', atk: 8, crit: 8, price: 560 },
  shadowDagger: { name: '暗影匕首', type: 'weapon', kind: 'blade', atk: 15, crit: 15, price: 0 },
  greatAxe:     { name: '巨斧',     type: 'weapon', kind: 'axe', atk: 11, hit: -5, price: 700 },
  anchor:       { name: '船锚',     type: 'weapon', kind: 'axe', atk: 16, price: 0, desc: '力奇的家传船锚' },
  alchemyStaff: { name: '炼金杖',   type: 'weapon', kind: 'staff', atk: 3, mag: 6, price: 520 },
  elementRod:   { name: '四元素之杖', type: 'weapon', kind: 'staff', atk: 4, mag: 14, price: 0 },
  bigShield:    { name: '百炼大圆盾', type: 'armor', def: 10, price: 0 },
  senseArmor:   { name: '感知战甲', type: 'armor', def: 13, spd: 2, price: 0 },
  gryphonMail:  { name: '狮鹫鳞甲', type: 'armor', def: 8, price: 760 },
  speedHat:     { name: '速度之帽', type: 'acc', mov: 1, spd: 2, price: 0 },
  hasteRing:    { name: '加速指环', type: 'acc', spd: 4, price: 0 },
  mysteryMask:  { name: '神秘的面具', type: 'acc', crit: 10, spd: 1, price: 0 },
  elementCharm: { name: '元素加护符', type: 'acc', mag: 4, def: 3, price: 0 },
  ambassadorSeal: { name: '雅曼使节印', type: 'key', price: 0, desc: '雅曼大使托付的印信，能证明血狮鹫兵团的清白' },
  dragonEgg:    { name: '圣龙之卵', type: 'key', price: 0, desc: '散发微温的龙卵' },
  oldMap:       { name: '芬德利的古地图', type: 'key', price: 0, desc: '标出古神龙沉眠之处' },
});

// ===================================================================
// 英雄（狂神降世）
// hidden：专属隐藏职业。need = 各职业系曾达到的等级；同一 group 只能选一个（选了另一个就消失）
// ===================================================================
CAMPAIGN_HEROES.g4 = {
  kehelin:  { name: '克荷林', cls: 'duelist', lv: 1, hair: '#7a3a1a', lord: true, sex: 'm', weapon: 'militiaSword', lines: ['duelist'],
    stats: { hp: 33, mp: 8, atk: 12, def: 8, mag: 4, spd: 10 }, bio: '血狮鹫兵团的团长。原是博丰领主的么子，领地失陷后舍弃本名，在中立的西风岛带着难民与旧部组成兵团。',
    hidden: [
      { cls: 'gSwordSaint', need: { duelist: 16, monk: 5 }, group: 'k' },
      { cls: 'gSwordEvil', need: { duelist: 12, alchemist: 8 }, group: 'k' },
      { cls: 'gGriffin', need: { halberdier: 12, alchemist: 5 }, group: 'k' },
    ] },
  maisi:    { name: '麦斯', cls: 'longbowman', lv: 2, hair: '#2a2a2a', sex: 'm', weapon: 'shortBow', lines: ['longbowman'],
    stats: { hp: 26, mp: 4, atk: 12, def: 5, mag: 2, spd: 11 }, bio: '克荷林自小的挚友，百步穿杨的神射手。故乡毁于艾普洛军之手，一心只想复仇。',
    hidden: [
      { cls: 'gBowKing', need: { longbowman: 14, halberdier: 6 }, group: 'm' },
      { cls: 'gShadowSniper', need: { longbowman: 12, thief: 6 }, group: 'm' },
    ] },
  tao:      { name: '陶', cls: 'alchemist', lv: 3, hair: '#4a4a5a', sex: 'm', weapon: 'shortStaff', lines: ['alchemist'],
    stats: { hp: 24, mp: 20, atk: 5, def: 6, mag: 10, spd: 8 }, bio: '兵团的军师。年轻时热衷炼金术，一次实验爆炸在眼下留了道疤。足智多谋，嘴巴也毒。' },
  bobi:     { name: '波比', cls: 'tribesman', lv: 2, hair: '#a86a2a', sex: 'm', weapon: 'battleAxe', lines: ['tribesman'],
    stats: { hp: 38, mp: 2, atk: 13, def: 8, mag: 0, spd: 7 }, bio: '看上去像个凶神恶煞的恶徒，其实憨直善良，说话常颠三倒四，总被寇琪捉弄。',
    hidden: [
      { cls: 'gNetherAxe', need: { tribesman: 14, alchemist: 5 }, group: 'b' },
      { cls: 'gThunderAxe', need: { tribesman: 14, halberdier: 5 }, group: 'b' },
    ] },
  kouqi:    { name: '寇琪', cls: 'swordmaid', lv: 2, hair: '#e86a3a', sex: 'f', weapon: 'ironSword', lines: ['swordmaid'],
    stats: { hp: 28, mp: 6, atk: 11, def: 6, mag: 4, spd: 12 }, bio: '爱捉弄人，却开朗善良。胆子比男人还大，战场上从不落后。',
    hidden: [
      { cls: 'gMagicBlade', need: { swordmaid: 14, amazon: 8 }, group: 'q' },
      { cls: 'gSpellSword', need: { swordmaid: 14, sorceress: 8 }, group: 'q' },
    ] },
  lida:     { name: '丽妲', cls: 'alchemist', lv: 2, hair: '#d8a8c8', sex: 'f', weapon: 'shortStaff', lines: ['alchemist'],
    stats: { hp: 22, mp: 18, atk: 4, def: 5, mag: 10, spd: 9 }, bio: '从小显露炼金天分的少女，心思细腻却不常说出口。和麦斯、克荷林青梅竹马，偷偷喜欢着麦斯。' },
  beiliqina:{ name: '贝里奇娜', cls: 'elementalist', lv: 4, hair: '#e8e8f8', sex: 'f', weapon: 'shortStaff', lines: ['elementalist'],
    stats: { hp: 26, mp: 26, atk: 5, def: 6, mag: 13, spd: 10 }, bio: '在深山里遇见的神秘少女，能操纵地水火风四元素。失去了部分记忆，只记得自己曾是穆伦教的祭司。',
    hidden: [
      { cls: 'gLightMaiden', need: { amazon: 5, summoner: 4 }, group: 'z' },
      { cls: 'gSpirit', need: { nun: 6, gLightMaiden: 4 }, group: 'z2' },
    ] },
  pulusi:   { name: '普鲁丝', cls: 'illusionist', lv: 8, hair: '#6a3a8a', sex: 'f', weapon: 'shortStaff', lines: ['illusionist'],
    stats: { hp: 28, mp: 30, atk: 5, def: 6, mag: 15, spd: 12 }, bio: '神秘的幻术师，说话总像在打哑谜。似乎和狂神的传说有所牵连。',
    hidden: [
      { cls: 'gYama', need: { illusionist: 14 }, group: 'p' },
      { cls: 'gHolyDemon', need: { illusionist: 8, nun: 6 }, group: 'p' },
    ] },
  baihe:    { name: '百合', cls: 'pickpocket', lv: 8, hair: '#1a1a2a', sex: 'f', weapon: 'longBlade', lines: ['pickpocket'],
    stats: { hp: 28, mp: 8, atk: 14, def: 6, mag: 4, spd: 17 }, bio: '冷静寡言的女杀手。穗海镇屠杀后，与普鲁丝一起跟上了兵团。',
    hidden: [
      { cls: 'gSpecialOps', need: { pickpocket: 16 }, group: 'h' },
      { cls: 'gShadowNinja', need: { pickpocket: 10, amazon: 6 }, group: 'h' },
    ] },
  liqi:     { name: '力奇', cls: 'pirate', lv: 12, hair: '#3a6a8a', sex: 'm', weapon: 'greatAxe', lines: ['pirate'],
    stats: { hp: 48, mp: 8, atk: 20, def: 11, mag: 3, spd: 14 }, bio: '黑旗海盗之外的另一位海盗头子，与克荷林家是世交。豪爽，讲义气，酒量惊人。',
    hidden: [
      { cls: 'gPirateKing', need: { pirate: 14, tribesman: 6 }, group: 'l' },
      { cls: 'gSeaLord', need: { pirate: 14, thief: 6 }, group: 'l' },
    ] },
  nushayi:  { name: '努莎伊', cls: 'pikemaid', lv: 12, hair: '#c8a840', sex: 'f', weapon: 'spear', lines: ['pikemaid'],
    stats: { hp: 40, mp: 8, atk: 16, def: 14, mag: 5, spd: 13 }, bio: '镇守关卡的女骑士，忠于职守。看清艾普洛的所作所为后，选择站在兵团这一边。',
    hidden: [
      { cls: 'gLightKnight', need: { pikemaid: 12, nun: 5 }, group: 'n' },
      { cls: 'gHolyKnight', need: { gLightKnight: 4, summoner: 4 }, group: 'n2' },
    ] },
  xianniya: { name: '仙妮亚', cls: 'shooter', lv: 18, hair: '#a8d8a8', sex: 'f', weapon: 'longBow', lines: ['shooter'],
    stats: { hp: 46, mp: 8, atk: 24, def: 10, mag: 5, spd: 22 }, bio: '被关在夏米尔监狱深处的「最强弓手」，擅长超远距离狙击。' },
  tuoli:    { name: '托莉', cls: 'nun', lv: 18, hair: '#f0d0a0', sex: 'f', weapon: 'longStaff', lines: ['nun'],
    stats: { hp: 42, mp: 50, atk: 7, def: 12, mag: 24, spd: 16 }, bio: '神出鬼没的「幻影佣兵团」的回复系队员，笑眯眯地说是来「看热闹」的。' },
  nafeiya:  { name: '娜菲雅', cls: 'swordmaid', lv: 22, hair: '#3a1a2a', sex: 'f', weapon: 'silverSword', lines: ['swordmaid'],
    stats: { hp: 60, mp: 14, atk: 30, def: 18, mag: 10, spd: 26 }, bio: '艾普洛军中以剑术闻名的女剑士。在那特罗芙平原与兵团交手后，发现自己效忠的一切都是谎言。',
    hidden: [
      { cls: 'gEvilSword', need: { swordmaid: 24, pickpocket: 4 }, group: 'f' },
      { cls: 'gHolySword', need: { swordmaid: 24, amazon: 4 }, group: 'f' },
    ] },
  guluru:   { name: '咕鲁鲁', cls: 'babyDragon', lv: 20, hair: '#4a8a3a', sex: 'm', weapon: null, lines: ['babyDragon'], pool: [],
    stats: { hp: 58, mp: 26, atk: 22, def: 18, mag: 18, spd: 16 }, bio: '从圣龙之卵孵出的幼龙，把克荷林当成了妈妈。会喷火，也会撒娇。',
    hidden: [
      { cls: 'gWhiteDragon', need: { babyDragon: 26 }, group: 'g' },
      { cls: 'gBlackDragon', need: { babyDragon: 26 }, group: 'g' },
    ] },
  // —— 剧情人物 ——
  andi:     { name: '安迪将军', cls: 'knight', lv: 20, hair: '#8a7a6a', sex: 'm', npc: true, stats: { hp: 70, mp: 10, atk: 28, def: 24, mag: 5, spd: 18 }, bio: '雅曼共和国的将军，正直的老军人。' },
  wood:     { name: '伍德城主', cls: 'king', lv: 12, hair: '#b0a090', sex: 'm', npc: true, stats: { hp: 40, mp: 20, atk: 12, def: 14, mag: 12, spd: 8 }, bio: '铁车城的城主，和会阴谋的知情者。' },
  ambassador: { name: '雅曼大使', cls: 'mage', lv: 6, hair: '#6a6a7a', sex: 'm', npc: true, stats: { hp: 30, mp: 20, atk: 5, def: 8, mag: 10, spd: 6 }, bio: '雅曼共和国派往和会的使者，血狮鹫兵团的雇主。' },
  limu:     { name: '利姆', cls: 'villager', lv: 3, hair: '#c87a3a', sex: 'm', npc: true, stats: { hp: 20, mp: 0, atk: 6, def: 4, mag: 0, spd: 6 }, bio: '努欧勒镇的少年，向兵团求援。' },
  obutana:  { name: '欧布坦拿', cls: 'sorcerer', lv: 30, hair: '#d8d0c0', sex: 'm', npc: true, stats: { hp: 80, mp: 120, atk: 10, def: 18, mag: 36, spd: 16 }, bio: '祈勒蒙的大贤者，梦想以神之力打造「没有战争的乌托邦」。' },
  deluowa:  { name: '德洛瓦将军', cls: 'darkKnight', lv: 22, hair: '#5a4a3a', sex: 'm', npc: true, stats: { hp: 80, mp: 10, atk: 32, def: 26, mag: 6, spd: 18 }, bio: '占领博丰的艾普洛将军。' },
  bide:     { name: '彼德', cls: 'mage', lv: 20, hair: '#a89a7a', sex: 'm', npc: true, stats: { hp: 50, mp: 50, atk: 8, def: 14, mag: 26, spd: 14 }, bio: '彼德·安德列夫，出卖博丰的叛徒。' },
  sisi:     { name: '西斯得菲尔', cls: 'swordmaid', lv: 24, hair: '#8a2a4a', sex: 'f', npc: true, stats: { hp: 70, mp: 20, atk: 30, def: 20, mag: 14, spd: 24 }, bio: '奎恩堡的女主人，满心妒恨。' },
  bailandi: { name: '白兰蒂', cls: 'illusionist', lv: 28, hair: '#f0f0f0', sex: 'f', npc: true, stats: { hp: 70, mp: 80, atk: 8, def: 16, mag: 34, spd: 22 }, bio: '幻影佣兵团的前头领，擅长广域幻术。' },
  fendeli:  { name: '芬德利', cls: 'sorcerer', lv: 30, hair: '#e0e0e0', sex: 'm', npc: true, stats: { hp: 60, mp: 80, atk: 8, def: 14, mag: 30, spd: 12 }, bio: '梵冷尼奥的古怪老学者，知道太古神龙的下落。' },
};

// ===================================================================
// 作品设定
// ===================================================================
Object.assign(CAMPAIGNS.g4, {
  soon: false, tag: '四路线 · 隐藏职业',
  desc: '新大陆法尔马立克：和会刺杀案后被嫁祸的血狮鹫兵团，一路追查到「狂神」降世的阴谋。A/B 两线再分四路线、各英雄专属隐藏职业、合技与多结局。',
  rules: { ap: true, facing: { side: 1.2, back: 1.4 }, height: 0.1, freeClass: 5 },
  titleHeroes: ['beiliqina', 'kehelin', 'maisi', 'kouqi'],
  classPool: ['duelist', 'longbowman', 'halberdier', 'tribesman', 'thief', 'alchemist', 'monk', 'swordmaid', 'shooter', 'pikemaid', 'amazon', 'pickpocket', 'sorceress', 'nun', 'summoner'],
  shopBase: ['herb', 'antidote', 'magicHerb', 'militiaSword', 'ironSword', 'shortBow', 'halberd', 'spear', 'battleAxe', 'longBlade', 'shortStaff', 'leather', 'roundShield'],
  helpRules: '本作沿用系列的回合制（不采用原作的半即时 CT 制）。<b>移动点数制</b>——行动后可用剩余移动力再移动。<b>方向</b>——侧面 ×1.2、背后 ×1.4。<b>高低差</b>——每高一层 +10%。<b>自由转职</b>——Lv5 以上即可在营地「转职所」改换职业（等级回到 1，能力与招式保留）。<b>职业经历</b>——每个职业系达到过的最高等级都会记录下来。<b>隐藏职业</b>——主要角色各有专属的隐藏职业，满足「职业经历」条件后出现在转职所（例：克荷林的剑圣需斗剑士系 Lv16、修士系 Lv5）；同组的隐藏职业只能选一个。<b>合技</b>——两人都转为隐藏职业并相邻时可施展（太古机兵、暴风散弹箭、混沌脉冲、超热燎原火）。<b>好感度</b>——贝里奇娜、百合、娜菲雅、寇琪、丽妲；路线与好感度决定结局。',
});
CAMPAIGN_STAGES.g4 = CAMPAIGN_STAGES.g4 || [];

// ===================================================================
// 结局：四条路线 × 好感度（依原作路线表）
// A1/B1：麦斯牺牲；A2/B2：贝里奇娜牺牲。A 线克荷林流浪四方，B 线接任博丰领主
// ===================================================================
CAMPAIGN_ENDINGS.g4 = {
  resolve(S) {
    const f = S.flags || {}, r = S.rel || {}, has = id => S.roster[id] && !(S.left || {})[id];
    const route = f.route || 'A1';
    const pick = list => list.filter(id => has(id)).sort((a, b) => (r[b] || 0) - (r[a] || 0))[0];
    if (route === 'A1') return (r.beiliqina || 0) >= 40 ? 'A1_beiliqina' : 'A1_kouqi';
    if (route === 'A2') return has('nafeiya') && (r.nafeiya || 0) >= 40 ? 'A2_nafeiya' : 'A2_kouqi';
    if (route === 'B1') return pick(['beiliqina', 'baihe']) === 'baihe' ? 'B1_baihe' : 'B1_beiliqina';
    return 'B2_lida';
  },
  prelude: [
    ['旁白', '狂神的身影在祭坛上崩解，染红法尔马立克天空的光芒渐渐褪去。'],
    ['if', { flag: 'route', is: ['A1', 'B1'] }, [
      ['麦斯', '克荷林……我这一辈子都在想着复仇。最后能为你挡下这一击，也算……值了。', 'maisi'],
      ['旁白', '为了封住狂神最后的反扑，麦斯独自留在了崩塌的祭坛里。'],
    ], [
      ['贝里奇娜', '我终于想起来了……我本来就是为了封印祂而存在的。克荷林，谢谢你让我当了一阵子普通的女孩。', 'beiliqina'],
      ['旁白', '贝里奇娜化作四色的光，与狂神一同沉入了大地深处。'],
    ]],
    ['if', { flag: 'route', is: ['B1', 'B2'] }, [['旁白', '战后，血狮鹫兵团回到博丰。百姓们认出了当年的么子，拥戴他接任博丰领主。']],
      [['旁白', '战后，克荷林婉拒了雅曼的封赏，带着血狮鹫兵团的旗帜，再度踏上流浪的旅途。']]],
  ],
  endings: {
    A1_beiliqina: { title: '流浪的狮鹫与元素之女', lines: [
      ['贝里奇娜', '你要去哪里，我就去哪里。……这次不是因为我失去了记忆，是我自己想跟着你。', 'beiliqina'],
      ['克荷林', '那就一起走吧。天下这么大，总有不需要佣兵的地方。', 'kehelin'],
    ], epilogue: [['kehelin', '与贝里奇娜四海流浪，血狮鹫兵团的名号成了吟游诗人的歌。'], ['beiliqina', '找回了真正的名字，却仍喜欢别人叫她贝里奇娜。'], ['lida', '把麦斯留下的弓挂在炼金工坊的墙上，每天擦拭。']] },
    A1_kouqi: { title: '没有终点的旅途', lines: [
      ['寇琪', '喂，团长！下一单生意在哪？可别又是什么和会、什么神的！', 'kouqi'],
      ['克荷林', '……下一单，就护送一车葡萄酒吧。', 'kehelin'],
    ], epilogue: [['kehelin', '继续带着兵团流浪，接下的委托都是些和平的小事。'], ['kouqi', '一路捉弄着团长，不知不觉成了他身边最离不开的人。']] },
    A2_nafeiya: { title: '剑与誓约', lines: [
      ['娜菲雅', '我曾经为了谎言挥剑。从今以后，我只为你挥剑。', 'nafeiya'],
      ['克荷林', '不必为谁。为你自己就好。……不过，若你愿意同行，我很高兴。', 'kehelin'],
    ], epilogue: [['kehelin', '带着兵团流浪四方，常常在月下与娜菲雅比剑。'], ['nafeiya', '离开了艾普洛军，成了血狮鹫兵团的副团长。']] },
    A2_kouqi: { title: '寇琪的玩笑', lines: [
      ['寇琪', '团长，你再愁眉苦脸，我就在你的酒里加辣椒粉喔。', 'kouqi'],
      ['克荷林', '……加吧。至少能让我哭得像样一点。', 'kehelin'],
    ], epilogue: [['kehelin', '没有忘记贝里奇娜，却在寇琪的笑声里慢慢走了出来。'], ['kouqi', '一直陪在团长身边，打打闹闹地过了一辈子。']] },
    B1_beiliqina: { title: '博丰的领主夫人', lines: [
      ['贝里奇娜', '领主大人，今天的公文我替你念完了。……可以出去散步了吗？', 'beiliqina'],
      ['克荷林', '只要你在，博丰就是我想守护的家。', 'kehelin'],
    ], epilogue: [['kehelin', '接任博丰领主，以「不再有人流离失所」为施政之本。'], ['beiliqina', '成为博丰的领主夫人，在城里办起了教孩子们读书的学堂。']] },
    B1_baihe: { title: '影与光', lines: [
      ['百合', '……领主身边总要有个暗卫。我来当。', 'baihe'],
      ['克荷林', '暗卫可以，但晚饭要一起吃。这是领主的命令。', 'kehelin'],
    ], epilogue: [['kehelin', '接任博丰领主，治下的博丰再也没有发生过刺杀。'], ['baihe', '放下了杀手的过去，成为领主最信任的人——也是唯一能让他乖乖休息的人。']] },
    B2_lida: { title: '炼金术士的春天', lines: [
      ['丽妲', '我……一直以为自己喜欢的是麦斯。可是这一路上，一直在我身边的人是你。', 'lida'],
      ['克荷林', '丽妲，博丰需要一位炼金术士。……我也需要你。', 'kehelin'],
    ], epilogue: [['kehelin', '接任博丰领主，与丽妲一同重建故乡。'], ['lida', '成为博丰的领主夫人，她的炼金工坊让博丰成了大陆上最富庶的城市。'], ['maisi', '放下了复仇，在博丰的猎场当起了教头。']] },
  },
};
