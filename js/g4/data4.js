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
// 职业专属招式（d4_ 前缀）—— 每个职业系、B 路线与隐藏职业各有自己的招式
// 威力、MP、射程、范围沿用原本那一格，只换成符合职业的名称与风味
// ===================================================================
Object.assign(SPELLS, {
  // 斗剑士系（男）—— 单挑、破架、一刀重击
  d4_duelThrust:  { name: '决斗刺击', school: '剑', mp: 4,  power: 5,  range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'slash', desc: '斗剑士的起手刺击，射程 1-2，必中' },
  d4_feint:       { name: '虚招破架', school: '剑', mp: 8,  power: 6,  range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'blade', fx: 'slash', desc: '虚晃一招打乱架势，敌人 2 回合无法反击' },
  d4_lunge:       { name: '飞身突刺', school: '剑', mp: 7,  power: 10, range: [1, 3], kind: 'phys', sure: true, style: 'dash', fx: 'slash', desc: '跃步突进刺向远处的敌人，射程 1-3，必中' },
  d4_crossCut:    { name: '十字斩',   school: '剑', mp: 12, power: 18, range: [1, 2], kind: 'phys', sure: true, crit: 10, style: 'blade', fx: 'slash', desc: '纵横两斩交成十字，容易暴击' },
  d4_duelBurst:   { name: '斗气爆斩', school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'fire', desc: '斗气灌入剑身后爆开，波及目标周围' },
  d4_heavensCut:  { name: '天断',     school: '剑', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, crit: 15, style: 'blade', fx: 'slash', desc: '大剑师一刀两断的重斩' },
  d4_swordGod:    { name: '斗神剑·极', school: '剑', mp: 34, power: 50, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '斗剑之道的极致，剑光如神降' },
  // 女战士系（女）—— 轻快、回旋、连斩
  d4_quickSlash:  { name: '疾风斩',   school: '剑', mp: 4,  power: 5,  range: [1, 2], kind: 'phys', sure: true, style: 'dash', fx: 'wind', desc: '轻快地突进一斩，射程 1-2，必中' },
  d4_bladeDance:  { name: '剑舞',     school: '剑', mp: 6,  power: 8,  range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '舞步般旋身挥剑，攻击身边所有敌人' },
  d4_swallowCut:  { name: '燕返',     school: '剑', mp: 7,  power: 10, range: [1, 3], kind: 'phys', sure: true, style: 'blade', fx: 'slash', desc: '如燕回旋的两段斩，射程 1-3，必中' },
  d4_twinBlossom: { name: '双花剑',   school: '双', mp: 12, power: 22, range: [1, 3], kind: 'pair', sure: true, partner: 'kehelin', fx: 'slash', desc: '与相邻的克荷林双剑合璧，两道剑花交错' },
  d4_petalStorm:  { name: '落樱乱舞', school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'wind', desc: '剑光如落樱纷飞，斩向目标与周围' },
  d4_moonShadow:  { name: '月影剑',   school: '剑', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, crit: 15, style: 'blade', fx: 'ice', desc: '剑姬的绝技，冷冽如月光的一闪' },
  // 长弓手系（男）—— 远程、重箭、贯穿
  d4_longShot:    { name: '长弓远射', school: '弓', mp: 4,  power: 5,  range: [2, 4], kind: 'phys', sure: true, crit: 15, style: 'arrow', fx: 'slash', desc: '拉开长弓稳稳射出，射程 2-4，必中' },
  d4_heavyVolley: { name: '重箭齐射', school: '弓', mp: 12, power: 14, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'rock', desc: '沉重的长箭砸落一片区域' },
  d4_armorPierce: { name: '破甲穿杨', school: '弓', mp: 9,  power: 15, range: [1, 5], line: true, kind: 'phys', sure: true, style: 'pierce', fx: 'wind', desc: '强弓之箭贯穿一列，路径上不论敌我' },
  d4_thunderBow:  { name: '神射·天雷', school: '弓', mp: 24, power: 30, range: [2, 5], area: 2, kind: 'phys', sure: true, style: 'volley', fx: 'bolt', desc: '神射手的绝技，万箭化作天雷落下' },
  // 射手系（女）—— 快射、连射、骑射
  d4_quickShot:   { name: '快射',     school: '弓', mp: 4,  power: 5,  range: [2, 4], kind: 'phys', sure: true, crit: 15, style: 'arrow', fx: 'wind', desc: '搭箭即射，射程 2-4，必中' },
  d4_fanShot:     { name: '扇形散射', school: '弓', mp: 6,  power: 7,  range: [2, 4], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'slash', desc: '一手扣数箭扇形放出，覆盖目标与周围' },
  d4_twinArrow:   { name: '双星连射', school: '弓', mp: 6,  power: 12, range: [2, 3], kind: 'phys', sure: true, style: 'arrow2', fx: 'slash', desc: '两箭几乎同时射中同一点' },
  d4_rideShot:    { name: '驰射',     school: '弓', mp: 8,  power: 16, range: [2, 5], kind: 'phys', sure: true, crit: 20, style: 'arrow', fx: 'wind', desc: '借着冲势射出的强箭，射程 2-5' },
  d4_galeRain:    { name: '疾风箭雨', school: '弓', mp: 12, power: 14, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'wind', desc: '乘风而下的箭雨，覆盖一片区域' },
  d4_falconEye:   { name: '隼眼',     school: '弓', mp: 6,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 30, turns: 3, fx: 'buff', desc: '如猎隼般锁定猎物，自身命中与暴击大增' },
  // 长戟士系（男）—— 劈刺并用、游击冲阵
  d4_halberdChop: { name: '戟劈',     school: '枪', mp: 4,  power: 6,  range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'slash', desc: '长戟连劈带刺，射程 1-2，必中' },
  d4_halberdSpin: { name: '回旋戟',   school: '枪', mp: 8,  power: 10, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'slash', desc: '抡转长戟，攻击身边所有敌人' },
  d4_hookSweep:   { name: '钩镰横扫', school: '枪', mp: 6,  power: 8,  range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'rock', desc: '戟钩横扫前方三格' },
  d4_raidCharge:  { name: '游击突袭', school: '枪', mp: 11, power: 17, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'wind', desc: '策马疾驰穿过敌阵，路径上不论敌我' },
  d4_galeLance:   { name: '飙风冲阵', school: '枪', mp: 26, power: 42, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'wind', desc: '飙风骑士挟狂风冲阵，贯穿一列' },
  // 长戟士 B：重装骑士
  d4_ironWall:    { name: '重甲壁垒', school: '枪', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '以重甲筑成壁垒，自己与身边同伴防御 +6' },
  d4_standFast:   { name: '不动如山', school: '枪', mp: 6,  range: [0, 1], kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '挡在同伴身前，自己或相邻同伴防御 +6' },
  d4_ironCharge:  { name: '铁骑碾压', school: '枪', mp: 30, power: 46, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'thrust', fx: 'rock', desc: '全副重甲的冲撞，碾碎目标与周围' },
  // 长枪士系（女）—— 白羽、天空、圣光
  d4_featherThrust:{ name: '白羽突',  school: '枪', mp: 4,  power: 6,  range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'wind', desc: '轻如白羽的突刺，射程 1-2，必中' },
  d4_featherSpin: { name: '羽旋枪',   school: '枪', mp: 8,  power: 10, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '枪尖卷起羽风，攻击身边所有敌人' },
  d4_skySweep:    { name: '天翼横扫', school: '枪', mp: 6,  power: 8,  range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'holy', desc: '展翼般横扫前方三格' },
  d4_featherMeteor:{ name: '白羽流星枪', school: '枪', mp: 16, power: 24, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '自高空连续刺下，波及周围' },
  d4_dawnLance:   { name: '曙光枪',   school: '枪', mp: 9,  power: 16, range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'holy', desc: '迎着曙光的一刺' },
  // 蛮族战士系（男）—— 蛮力、部族
  d4_savageBlow:  { name: '蛮力劈',   school: '斧', mp: 4,  power: 8,  range: [1, 1], kind: 'phys', style: 'axe', fx: 'rock', desc: '不讲章法的全力劈砍，威力大但可能落空' },
  d4_tribalHowl:  { name: '部族战嚎', school: '斧', mp: 7,  range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'atk', amount: -5, turns: 3, style: 'roar', fx: 'fire', desc: '部族的战嚎震慑敌胆，身边敌人攻击 -5' },
  d4_earthRend:   { name: '大地撕裂', school: '斧', mp: 16, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, groundOnly: true, style: 'wave', fx: 'rock', desc: '巨斧撕开大地，扇形伤及前方地面部队' },
  d4_tomahawkSpin:{ name: '战斧回旋', school: '斧', mp: 8,  power: 12, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'rock', desc: '双手抡斧打转，攻击身边所有敌人' },
  d4_bloodRage:   { name: '血怒',     school: '斧', mp: 6,  range: [0, 0], kind: 'buff', stat: 'atk', amount: 7, turns: 3, fx: 'fire', desc: '血脉沸腾，自身攻击 +7' },
  d4_skullSplit:  { name: '碎颅斩',   school: '斧', mp: 16, power: 30, range: [1, 1], kind: 'phys', sure: true, style: 'axe', fx: 'fire', desc: '狂战士劈碎头颅的一击' },
  // 蛮族战士 B：武斗僧 —— 刚猛气功
  d4_ironPalm:    { name: '铁砂掌',   school: '拳', mp: 4,  power: 12, range: [1, 1], kind: 'phys', sure: true, style: 'claw', fx: 'rock', desc: '练得刀枪不入的铁掌，必中' },
  d4_zenBreath:   { name: '金刚调息', school: '拳', mp: 5,  power: 30, range: [0, 0], kind: 'heal', fx: 'heal', desc: '运转金刚气，回复自身生命' },
  d4_arhatFist:   { name: '罗汉百拳', school: '拳', mp: 10, power: 20, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'slash', desc: '罗汉拳连打，容易暴击' },
  d4_lionChi:     { name: '狮吼气劲', school: '拳', mp: 14, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'holy', desc: '一声狮吼带出气劲，扇形伤及前方三排' },
  // 亚马逊战士系（女）—— 猎人、战盾
  d4_huntStrike:  { name: '猎杀一击', school: '斧', mp: 4,  power: 8,  range: [1, 1], kind: 'phys', style: 'axe', fx: 'slash', desc: '猎人般看准要害挥下，威力大但可能落空' },
  d4_jungleCry:   { name: '丛林威吓', school: '斧', mp: 7,  range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'def', amount: -5, turns: 3, style: 'roar', fx: 'acid', desc: '丛林猛兽般的威吓，身边敌人防御 -5' },
  d4_amazonSpin:  { name: '女战神回旋', school: '斧', mp: 8, power: 12, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'slash', desc: '旋身挥舞战斧，攻击身边所有敌人' },
  d4_warShield:   { name: '战盾阵',   school: '斧', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '铠甲士举盾结阵，自己与身边同伴防御 +6' },
  d4_stampede:    { name: '猛犸践踏', school: '斧', mp: 12, power: 16, range: [1, 1], area: 1, kind: 'phys', sure: true, groundOnly: true, style: 'axe', fx: 'rock', desc: '重踏大地，震伤周围地面部队' },
  // 亚马逊战士 B：拳法家 —— 腿法、身法
  d4_swiftKick:   { name: '旋风腿',   school: '拳', mp: 4,  power: 12, range: [1, 1], kind: 'phys', sure: true, style: 'claw', fx: 'wind', desc: '凌空一记旋踢，必中' },
  d4_innerCalm:   { name: '静心',     school: '拳', mp: 5,  power: 30, range: [0, 0], kind: 'heal', fx: 'heal', desc: '平复呼吸，回复自身生命' },
  d4_galeKicks:   { name: '疾风连环腿', school: '拳', mp: 10, power: 20, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'wind', desc: '快如疾风的连环踢，容易暴击' },
  d4_crescentKick:{ name: '新月踢',   school: '拳', mp: 14, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'wind', desc: '踢出新月形的气刃，扇形伤及前方三排' },
  // 盗贼系（男）—— 飞刀、撒沙、劫掠
  d4_throwKnife:  { name: '飞刀',     school: '忍', mp: 4,  power: 9,  range: [2, 3], kind: 'phys', sure: true, style: 'feathers', fx: 'slash', desc: '甩出袖里的飞刀，射程 2-3' },
  d4_sandToss:    { name: '撒沙',     school: '忍', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'rock', desc: '扬起一把沙土，令一片敌人失明' },
  d4_venomDagger: { name: '淬毒匕首', school: '忍', mp: 6,  power: 10, range: [1, 1], kind: 'phys', sure: true, status: 'poison', turns: 3, chance: 75, style: 'blade', fx: 'acid', desc: '抹了毒的匕首，令敌人中毒' },
  d4_nightRaid:   { name: '义贼·夜袭', school: '忍', mp: 12, power: 26, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 30, style: 'dash', fx: 'dark', desc: '趁夜色穿过敌阵，路径上的敌人都被划伤' },
  // 小偷系（女）—— 暗器、麻痹、暗杀
  d4_needleThrow: { name: '吹针',     school: '忍', mp: 4,  power: 9,  range: [2, 3], kind: 'phys', sure: true, style: 'feathers', fx: 'acid', desc: '吹出细小的暗针，射程 2-3' },
  d4_numbBlade:   { name: '麻痹刃',   school: '忍', mp: 6,  power: 10, range: [1, 1], kind: 'phys', sure: true, status: 'freeze', turns: 1, chance: 55, style: 'blade', fx: 'acid', desc: '刃上涂了麻药，敌人可能 1 回合无法行动' },
  d4_mistVeil:    { name: '迷雾',     school: '忍', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'dark', desc: '撒出迷雾粉，令一片敌人失明' },
  d4_assassinate: { name: '暗杀',     school: '忍', mp: 12, power: 26, range: [1, 3], kind: 'phys', sure: true, crit: 40, style: 'dash', fx: 'dark', desc: '瞬身至敌人背后一击，极易暴击' },
  d4_bladeWaltz:  { name: '杀手圆舞', school: '忍', mp: 22, power: 34, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, crit: 20, style: 'spin', fx: 'dark', desc: '旋舞的刀光斩向身边所有敌人' },
  // 炼金术士 A：降术师 —— 炼成魔物
  d4_conjGargoyle:{ name: '石像唤醒', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'gargoyle', turns: 3, fx: 'summon', desc: '以炼金药唤醒石像鬼助战 3 回合' },
  d4_conjGolem:   { name: '炼成人偶', school: '召', mp: 12, range: [1, 1], kind: 'summon', unit: 'robot', turns: 3, fx: 'summon', desc: '炼成自动人偶兵助战 3 回合' },
  d4_bindDemon:   { name: '降魔契约', school: '召', mp: 22, range: [1, 1], kind: 'summon', unit: 'demonSummon', turns: 3, fx: 'summon', desc: '以禁忌契约驱使魔族助战 3 回合' },
  // 炼金术士 B：邪术师 —— 禁忌炼金
  d4_hexBolt:     { name: '咒弹',     school: '炼', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'dark', desc: '掷出封入诅咒的黑色药弹' },
  d4_miasma:      { name: '瘴气洪流', school: '炼', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'acid', desc: '倾泻剧毒瘴气，路径上不论敌我都会受伤' },
  d4_blackSun:    { name: '黑日炼成', school: '炼', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '炼成吞噬光明的黑日，炸裂一大片区域' },
  d4_soulTransmute:{ name: '灵魂炼成', school: '炼', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '将敌人的灵魂炼成贤者之石（对首领无效）' },
  // 修士系 / 德鲁依 —— 自然
  d4_herbCure:    { name: '草药疗伤', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '以草药敷治，回复少许生命' },
  d4_sunRay:      { name: '林间日光', school: '圣', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '穿过林叶的日光，对魔族与黑暗系双倍伤害' },
  d4_oakBlessing: { name: '橡树之佑', school: '圣', mp: 10, range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 3, turns: 3, fx: 'buff', desc: '古橡树的庇佑，友军攻击、防御、魔力 +3' },
  d4_springPurify:{ name: '清泉净化', school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '以清泉洗净石化以外的各种状态' },
  d4_forestBloom: { name: '万木回春', school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '草木齐发，大范围回复生命' },
  // 修女系 / 主教 —— 祷告与圣言
  d4_prayer:      { name: '祷告',     school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '修女的祷告，回复少许生命' },
  d4_holyWord:    { name: '圣言',     school: '圣', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '诵出神圣之言，对魔族与黑暗系双倍伤害' },
  d4_hymn:        { name: '圣歌',     school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '咏唱圣歌，一次回复多人生命' },
  d4_absolve:     { name: '赦罪',     school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '赦免罪业，解除石化以外的各种状态' },
  d4_sanctum:     { name: '圣域',     school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '主教展开圣域，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  d4_benediction: { name: '大祝祷',   school: '圣', mp: 12, power: 60, range: [0, 3], kind: 'heal', fx: 'heal', desc: '主教的祝祷，回复大部分生命' },
  d4_miracle:     { name: '神迹',     school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '降下神迹，大范围回复生命' },
  // 修女 B：精灵使 —— 精灵契约
  d4_pactWind:    { name: '风精契约', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritWind', turns: 3, fx: 'summon', desc: '依契约唤来风精灵助战 3 回合' },
  d4_pactWater:   { name: '水精契约', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritWater', turns: 3, fx: 'summon', desc: '依契约唤来水精灵助战 3 回合' },
  d4_pactEarth:   { name: '地精契约', school: '召', mp: 12, range: [1, 1], kind: 'summon', unit: 'spiritEarth', turns: 3, fx: 'summon', desc: '依契约唤来土精灵助战 3 回合' },
  d4_pactFire:    { name: '火精契约', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritFire', turns: 3, fx: 'summon', desc: '依契约唤来火精灵助战 3 回合' },
  d4_pactLight:   { name: '圣灵契约', school: '召', mp: 26, range: [1, 1], kind: 'summon', unit: 'angel', turns: 3, fx: 'summon', desc: '与光之圣灵立约，唤来天使助战 3 回合' },
  // 魔术士系 / 女巫 —— 魔女术
  d4_witchFlame:  { name: '魔女之焰', school: '火', mp: 4,  power: 10, range: [1, 3], kind: 'magic', fx: 'fire', desc: '指尖燃起的魔女火焰' },
  d4_frostNeedle: { name: '霜针',     school: '水', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'ice', desc: '射出凝霜的冰针' },
  d4_thunderHex:  { name: '雷鸣咒',   school: '风', mp: 10, power: 16, range: [1, 4], area: 1, kind: 'magic', fx: 'bolt', desc: '念咒招来落雷，击中目标与周围' },
  d4_witchHex:    { name: '魔女的诅咒', school: '暗', mp: 8, range: [1, 4], kind: 'debuff', stat: 'atk', amount: -5, turns: 3, fx: 'dark', desc: '下咒令敌人无力，3 回合内攻击 -5' },
  d4_cauldron:    { name: '魔女釜爆', school: '火', mp: 18, power: 24, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '翻倒沸腾的魔女釜，烈焰炸开一片' },
  d4_hushCharm:   { name: '噤声咒',   school: '暗', mp: 8,  range: [1, 4], kind: 'status', status: 'silence', turns: 3, chance: 75, fx: 'dark', desc: '封住敌人的嘴，无法施法' },
  d4_moonFrost:   { name: '月寒风暴', school: '水', mp: 36, power: 42, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '借满月之力召来的冰雪风暴' },
  d4_witchStorm:  { name: '女巫雷宴', school: '风', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'bolt', desc: '女巫的雷之盛宴，雷电连环劈落' },
  // 元素使
  d4_springHeal:  { name: '清流之愈', school: '元', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '引来水之元素，回复少许生命' },
  // 海贼系
  d4_jollyRoger:  { name: '骷髅旗威吓', school: '斧', mp: 7, range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'atk', amount: -5, turns: 3, style: 'roar', fx: 'dark', desc: '亮出骷髅旗大吼，身边敌人攻击 -5' },
  d4_tidalCleave: { name: '怒涛劈',   school: '斧', mp: 16, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, groundOnly: true, style: 'wave', fx: 'ice', desc: '劈出怒涛般的冲击，扇形伤及前方地面部队' },
  d4_maelstrom:   { name: '漩涡斩',   school: '斧', mp: 8,  power: 12, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'ice', desc: '卷起漩涡般的回旋斩，攻击身边所有敌人' },
  // 召唤士系 —— 自己的召唤兽
  d4_callTreant:  { name: '树妖召唤', school: '召', mp: 12, range: [1, 1], kind: 'summon', unit: 'treant', turns: 3, fx: 'summon', desc: '召唤树妖助战 3 回合' },
  d4_callRoc:     { name: '巨鸟召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'roc', turns: 3, fx: 'summon', desc: '召唤洛克鸟助战 3 回合' },
  d4_callYeti:    { name: '雪人召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'yeti', turns: 3, fx: 'summon', desc: '召唤雪人助战 3 回合' },
  d4_callGiant:   { name: '巨人召唤', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'giant', turns: 3, fx: 'summon', desc: '召唤投石巨人助战 3 回合' },
  d4_callSphinx:  { name: '狮身召唤', school: '召', mp: 24, range: [1, 1], kind: 'summon', unit: 'sphinx', turns: 3, fx: 'summon', desc: '召唤人面狮身助战 3 回合' },
  d4_callDragon:  { name: '神龙召唤', school: '召', mp: 30, range: [1, 1], kind: 'summon', unit: 'dragon', turns: 3, fx: 'summon', desc: '召唤师的最高契约，唤来巨龙助战 3 回合' },
  d4_callTempest: { name: '风王召唤', school: '召', mp: 22, range: [1, 1], kind: 'summon', unit: 'wind', turns: 3, fx: 'summon', desc: '召唤狂风之王助战 3 回合' },
  // ===== 隐藏职业 =====
  // 剑圣
  d4_saintEye:    { name: '剑圣·心眼', school: '剑', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '以剑意凝成的破邪之光，对魔族与黑暗系双倍伤害' },
  d4_saintMyriad: { name: '剑圣·万剑归宗', school: '剑', mp: 34, power: 50, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '万道剑光归于一点，剑圣的究极奥义' },
  // 剑邪
  d4_evilGale:    { name: '剑邪·妖风', school: '剑', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'dark', desc: '挥剑卷起噬魂妖风，路径上不论敌我都会受伤' },
  d4_soulReap:    { name: '剑邪·夺魄', school: '剑', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '邪剑剑气直取魂魄（对首领无效）' },
  // 狮鹫骑士
  d4_griffinRush: { name: '狮鹫疾袭', school: '翼', mp: 11, power: 17, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'dive', fx: 'wind', desc: '狮鹫低空掠过敌阵，路径上不论敌我' },
  d4_griffinSky:  { name: '苍空裂羽', school: '翼', mp: 24, power: 36, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'feathers', fx: 'wind', desc: '狮鹫振翼射出钢羽，贯穿一列' },
  // 弓王
  d4_kingRain:    { name: '弓王·焚天箭雨', school: '弓', mp: 24, power: 30, range: [2, 5], area: 2, kind: 'phys', sure: true, style: 'volley', fx: 'fire', desc: '王者之箭化作火雨，烧遍一大片区域' },
  // 暗影狙击手
  d4_nightArrow:  { name: '夜幕箭',   school: '弓', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'dark', desc: '射出爆散黑雾的箭，令一片敌人失明' },
  // 光之圣女
  d4_maidenJudge: { name: '圣女·裁光', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '圣女放出裁决之光，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  d4_maidenDawn:  { name: '天光降临', school: '圣', mp: 40, power: 54, range: [1, 5], area: 3, kind: 'magic', fx: 'holy', desc: '天光自穹顶倾泻，范围极大' },
  // 超灵体
  d4_spiritOne:   { name: '元素归一', school: '元', mp: 40, power: 54, range: [1, 5], area: 3, kind: 'magic', fx: 'beam', desc: '超灵体将四元素合而为一，范围极大' },
  d4_spiritMend:  { name: '灵体·万象回生', school: '元', mp: 24, power: 60, range: [0, 4], area: 2, kind: 'heal', fx: 'heal', desc: '灵体之力滋养万物，大范围治愈' },
  d4_spiritStar:  { name: '星辰坍缩', school: '元', mp: 30, power: 44, range: [1, 5], area: 2, kind: 'magic', fx: 'wind', desc: '将星辰之力压缩后引爆，吞没一大片区域' },
  // 幽冥斧王 / 雷风斧王
  d4_netherQuake: { name: '冥府崩坏', school: '斧', mp: 26, power: 38, range: [0, 0], area: 2, around: true, kind: 'phys', sure: true, groundOnly: true, style: 'axe', fx: 'dark', desc: '幽冥斧砸开冥府之门，伤及周围两格的地面敌人' },
  d4_thunderGod:  { name: '雷神一击', school: '斧', mp: 22, power: 52, range: [1, 1], kind: 'phys', sure: true, style: 'axe', fx: 'bolt', desc: '挟雷神之力的一斧' },
  // 魔剑使 —— 魔剑技
  d4_voidRend:    { name: '魔剑·裂空', school: '魔', mp: 26, power: 40, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'dark', desc: '魔剑撕开虚空，剑气贯穿一列' },
  d4_starfallBlade:{ name: '魔剑·星落', school: '魔', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, crit: 10, style: 'rain', fx: 'holy', desc: '魔剑引落星辰，砸向单一敌人' },
  // 魔法剑士 —— 魔法与剑的融合
  d4_thunderThrust:{ name: '雷魔突', school: '魔', mp: 12, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'thrust', fx: 'bolt', desc: '以剑引雷突刺，雷光炸裂波及周围' },
  d4_flameBlade:  { name: '炎魔剑',   school: '魔', mp: 18, power: 24, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '剑身燃起魔焰，挥出的火焰剑气炸开一片' },
  d4_frostBlade:  { name: '冰魔斩·极', school: '魔', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '剑气化为冰魔风暴，冻结一大片区域' },
  // 阎魔使
  d4_yamaChain:   { name: '阎魔锁链', school: '幻', mp: 14, range: [1, 4], kind: 'status', status: 'freeze', turns: 2, chance: 70, fx: 'dark', desc: '冥界锁链缚住敌人，无法行动' },
  d4_yamaVerdict: { name: '阎魔审判', school: '幻', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '阎魔宣判死期（对首领无效）' },
  // 圣魔使
  d4_twilightMend:{ name: '晨昏之愈', school: '幻', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '圣与魔交融的柔光，一次回复多人生命' },
  d4_twilightRift:{ name: '晨昏裂隙', school: '幻', mp: 22, power: 34, range: [1, 4], area: 1, kind: 'magic', fx: 'beam', desc: '撕开昼与夜的裂隙，伤及一片敌人' },
  // 特攻 / 影忍
  d4_opsSweep:    { name: '瞬杀阵',   school: '忍', mp: 22, power: 34, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, crit: 20, style: 'dash', fx: 'slash', desc: '一瞬间斩遍身边所有敌人' },
  d4_opsFinale:   { name: '特攻·终结', school: '忍', mp: 26, power: 40, range: [1, 2], area: 1, kind: 'phys', sure: true, crit: 15, style: 'blade', fx: 'fire', desc: '特攻队的终结一击，波及目标周围' },
  d4_shadowClone: { name: '影分身',   school: '忍', mp: 22, power: 34, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, crit: 20, style: 'spin', fx: 'dark', desc: '化出无数影子同时斩向身边敌人' },
  d4_shadowFist:  { name: '影拳·百裂', school: '忍', mp: 10, power: 20, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'dark', desc: '影子与本体一同出拳，容易暴击' },
  d4_shadowHell:  { name: '影忍·瞬狱杀', school: '忍', mp: 12, power: 26, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 30, style: 'dash', fx: 'dark', desc: '化影穿过敌阵，路径上的敌人都被斩中' },
  // 海贼王 / 黑海霸主
  d4_broadside:   { name: '全舷齐射', school: '技', mp: 14, power: 24, range: [2, 5], area: 1, kind: 'magic', fx: 'fire', desc: '海贼王的旗舰全舷开炮' },
  d4_kingTide:    { name: '怒海崩',   school: '斧', mp: 26, power: 38, range: [0, 0], area: 2, around: true, kind: 'phys', sure: true, groundOnly: true, style: 'axe', fx: 'ice', desc: '巨斧掀起怒海，伤及周围两格的地面敌人' },
  d4_blackTide:   { name: '黑潮连斩', school: '斧', mp: 22, power: 38, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'dark', desc: '黑潮般连绵不绝的斩击' },
  d4_abyssCurrent:{ name: '深渊寒流', school: '水', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'ice', desc: '召来深海寒流，路径上不论敌我都会受伤' },
  d4_blackWhirl:  { name: '黑海漩涡', school: '水', mp: 36, power: 42, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '黑海霸主唤起吞船的大漩涡' },
  // 邪剑使
  d4_bloodMoon:   { name: '血月邪光', school: '剑', mp: 18, power: 26, range: [1, 4], area: 1, kind: 'magic', fx: 'dark', desc: '邪剑映出血月之光，伤及一片敌人' },
  d4_eclipse:     { name: '邪剑·蚀魂', school: '剑', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '邪剑蚀尽敌人的灵魂（对首领无效）' },
  // 神剑使
  d4_divineRay:   { name: '神剑·光明', school: '剑', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '神剑射出的光芒，对魔族与黑暗系双倍伤害' },
  d4_divineJudge: { name: '神剑·天罚', school: '剑', mp: 20, power: 34, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'holy', desc: '神剑降下天罚，光之剑气贯穿一列' },
  // 光明骑士 / 圣骑士
  d4_radiantLance:{ name: '光明枪',   school: '枪', mp: 9,  power: 16, range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'holy', desc: '光明骑士的光之突刺' },
  d4_knightLight: { name: '守护之光', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '骑士以守护之光回复同伴' },
  d4_lightCharge: { name: '光明冲锋', school: '枪', mp: 26, power: 42, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'holy', desc: '光芒万丈的冲锋，贯穿一列' },
  d4_sacredLance: { name: '圣骑枪',   school: '枪', mp: 9,  power: 16, range: [1, 2], kind: 'phys', sure: true, style: 'dive', fx: 'holy', desc: '圣骑士自空中刺下的圣枪' },
  d4_sacredNova:  { name: '圣骑光环', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '圣骑士放出光环，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  d4_sacredMend:  { name: '圣疗',     school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '圣骑士的治愈之光，一次回复多人生命' },
  d4_sacredDragon:{ name: '圣龙穿云枪', school: '枪', mp: 30, power: 46, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'dive', fx: 'holy', desc: '化作圣龙自云端俯冲，波及周围' },
  // 白龙 / 黑龙
  d4_whiteBreath: { name: '白龙冰息', school: '技', mp: 0,  power: 10, range: [1, 2], kind: 'magic', fx: 'ice', desc: '白龙喷出的极寒吐息' },
  d4_aurora:      { name: '极光风暴', school: '技', mp: 36, power: 42, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '白龙召来极光与冰雪，冻结一大片区域' },
  d4_blackBreath: { name: '黑龙炎息', school: '技', mp: 0,  power: 10, range: [1, 2], kind: 'magic', fx: 'fire', desc: '黑龙喷出的灼热吐息' },
  d4_blackFlame:  { name: '灭世黑炎', school: '技', mp: 20, power: 48, range: [1, 4], area: 1, kind: 'magic', fx: 'dark', desc: '黑龙吐出焚尽一切的黑炎' },
  d4_heatWaveB:   { name: '超热燎原火', school: '双', mp: 30, power: 54, range: [1, 6], area: 3, kind: 'pair', sure: true, partner: 'pulusi', needHidden: true, fx: 'fire', desc: '与普鲁丝的燎原烈焰，烧遍战场' },
});

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
    skills: [[1, 'd4_duelThrust'], [4, 'd4_feint'], [8, 'd4_lunge'], [12, 'd4_crossCut'], [16, 'd4_duelBurst'], [20, 'd4_heavensCut'], [26, 'd4_swordGod']] },
  longbowman: { line: '长弓手系', type: '弓箭手', weapon: ['bow'], sprite: 'longbowman', sex: 'm',
    tiers: [TIER('长弓手', 1, 5, 'foot', [2, 4]), TIER('神射手', 12, 5, 'foot', [2, 5])],
    base: { hp: 22, mp: 4, atk: 10, def: 4, mag: 2, spd: 9 }, growth: { hp: 2.6, mp: 0.6, atk: 1.7, def: 0.8, mag: 0.3, spd: 1.4 },
    promo: { hp: 4, mp: 1, atk: 3, def: 1, spd: 2 },
    skills: [[1, 'd4_longShot'], [4, 'sureShot'], [7, 'chargeShot'], [10, 'd4_heavyVolley'], [14, 'd4_armorPierce'], [20, 'd4_thunderBow']] },
  halberdier: { line: '长戟士系', type: '骑兵', weapon: ['lance'], sprite: 'halberdier', sex: 'm',
    tiers: [TIER('长戟士', 1, 5, 'foot', [1, 2]), TIER('游击骑士', 8, 7, 'horse'), TIER('飙风骑士', 16, 8, 'horse')],
    base: { hp: 28, mp: 4, atk: 10, def: 9, mag: 2, spd: 7 }, growth: { hp: 3.4, mp: 0.6, atk: 1.6, def: 1.5, mag: 0.3, spd: 1.1 },
    promo: { hp: 6, mp: 1, atk: 2, def: 2, mag: 0, spd: 2 },
    skills: [[1, 'd4_halberdChop'], [4, 'd4_halberdSpin'], [8, 'd4_hookSweep'], [12, 'd4_raidCharge'], [18, 'd4_galeLance']],
    aLabel: '游击之道', aDesc: '机动力极高的飙风骑士', aFocus: '机动 · 冲锋',
    alt: { at: 2, sprite: 'halberdier_b', label: '重装之道', desc: '全身重甲的重装骑士', focus: '防御 · 铁壁',
      tiers: [TIER('重装骑士', 16, 5, 'horse')],
      growth: { hp: 4.0, mp: 0.6, atk: 1.6, def: 2.0, mag: 0.3, spd: 0.8 }, promo: { hp: 10, def: 4, atk: 2 },
      skills: [[16, 'd4_ironWall'], [20, 'd4_standFast'], [24, 'd4_ironCharge']] } },
  tribesman: { line: '蛮族战士系', type: '战士', weapon: ['axe'], sprite: 'tribesman', sex: 'm',
    tiers: [TIER('蛮族战士', 1, 5), TIER('装甲佣兵', 8, 5), TIER('狂战士', 16, 6)],
    base: { hp: 32, mp: 3, atk: 12, def: 7, mag: 1, spd: 7 }, growth: { hp: 3.8, mp: 0.4, atk: 1.9, def: 1.2, mag: 0.2, spd: 1.0 },
    promo: { hp: 7, mp: 0, atk: 3, def: 2, mag: 0, spd: 1 },
    skills: [[1, 'd4_savageBlow'], [4, 'd4_tribalHowl'], [8, 'd4_earthRend'], [12, 'd4_tomahawkSpin'], [16, 'd4_bloodRage'], [22, 'd4_skullSplit']],
    aLabel: '狂战之道', aDesc: '舍身狂攻的狂战士', aFocus: '攻击',
    alt: { at: 2, sprite: 'tribesman_b', label: '武斗僧之道', desc: '以拳脚与气功战斗的武斗僧', focus: '敏捷 · 气功',
      tiers: [TIER('武斗僧', 16, 6)], weapon: ['claw', 'axe'],
      growth: { hp: 3.4, mp: 1.0, atk: 1.7, def: 1.1, mag: 0.6, spd: 1.5 }, promo: { hp: 5, mp: 3, atk: 2, spd: 3 },
      skills: [[16, 'd4_ironPalm'], [18, 'd4_zenBreath'], [21, 'd4_arhatFist'], [25, 'd4_lionChi']] } },
  thief: { line: '盗贼系', type: '武士', weapon: ['blade'], sprite: 'thief', sex: 'm', passive: ['search', 'unlock'],
    tiers: [TIER('盗贼', 1, 7), TIER('义贼', 12, 7)],
    base: { hp: 22, mp: 6, atk: 9, def: 5, mag: 3, spd: 12 }, growth: { hp: 2.6, mp: 0.8, atk: 1.5, def: 0.8, mag: 0.5, spd: 1.7 },
    promo: { hp: 4, mp: 2, atk: 2, def: 1, spd: 3 },
    skills: [[1, 'd4_throwKnife'], [4, 'd4_sandToss'], [8, 'd4_venomDagger'], [12, 'd4_nightRaid']] },
  alchemist: { line: '炼金术士系', type: '法师', weapon: ['staff'], sprite: 'alchemist',
    tiers: [TIER('炼金术士', 1, 5), TIER('巫师', 8, 5), TIER('降术师', 16, 5)],
    base: { hp: 20, mp: 16, atk: 5, def: 5, mag: 8, spd: 7 }, growth: { hp: 2.5, mp: 2.1, atk: 0.6, def: 0.9, mag: 1.5, spd: 1.1 },
    promo: { hp: 4, mp: 6, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'acidFlask'], [3, 'flashPowder'], [6, 'potionMist'], [9, 'pepperPowder'], [12, 'blastFlask'], [16, 'd4_conjGargoyle'], [20, 'd4_conjGolem'], [24, 'd4_bindDemon']],
    aLabel: '降术之道', aDesc: '驱使魔物的降术师', aFocus: '召唤',
    alt: { at: 2, sprite: 'alchemist_b', label: '邪术之道', desc: '钻研禁忌的邪术师', focus: '黑暗魔法',
      tiers: [TIER('邪术师', 16, 5)],
      growth: { hp: 2.4, mp: 2.3, atk: 0.5, def: 0.8, mag: 1.8, spd: 1.1 }, promo: { hp: 3, mp: 7, mag: 4 },
      skills: [[16, 'd4_hexBolt'], [18, 'd4_miasma'], [22, 'd4_blackSun'], [26, 'd4_soulTransmute']] } },
  monk: { line: '修士系', type: '牧师', weapon: ['staff'], sprite: 'monk', sex: 'm',
    tiers: [TIER('修士', 1, 5), TIER('德鲁依', 10, 5)],
    base: { hp: 22, mp: 16, atk: 5, def: 6, mag: 8, spd: 6 }, growth: { hp: 2.7, mp: 2.0, atk: 0.7, def: 1.0, mag: 1.4, spd: 1.0 },
    promo: { hp: 5, mp: 6, atk: 1, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'd4_herbCure'], [3, 'd4_sunRay'], [6, 'd4_oakBlessing'], [10, 'thornBind'], [13, 'natureHeal'], [17, 'd4_springPurify'], [22, 'd4_forestBloom']] },
  // —— 女性基本职业 ——
  swordmaid: { line: '女战士系', type: '剑士', weapon: ['sword'], sprite: 'swordmaid', sex: 'f',
    tiers: [TIER('女战士', 1, 5), TIER('剑士', 8, 6), TIER('剑姬', 16, 6)],
    base: { hp: 25, mp: 8, atk: 10, def: 6, mag: 4, spd: 10 }, growth: { hp: 3.0, mp: 1.0, atk: 1.7, def: 1.1, mag: 0.6, spd: 1.5 },
    promo: { hp: 5, mp: 2, atk: 2, def: 1, mag: 1, spd: 2 },
    skills: [[1, 'd4_quickSlash'], [4, 'd4_bladeDance'], [8, 'd4_swallowCut'], [12, 'd4_twinBlossom'], [16, 'd4_petalStorm'], [22, 'd4_moonShadow']] },
  shooter: { line: '射手系', type: '弓箭手', weapon: ['bow'], sprite: 'shooter', sex: 'f',
    tiers: [TIER('射手', 1, 5, 'foot', [2, 4]), TIER('弓骑手', 10, 7, 'horse', [2, 4])],
    base: { hp: 21, mp: 5, atk: 9, def: 4, mag: 3, spd: 11 }, growth: { hp: 2.5, mp: 0.7, atk: 1.6, def: 0.8, mag: 0.4, spd: 1.6 },
    promo: { hp: 4, mp: 1, atk: 2, def: 1, spd: 2 },
    skills: [[1, 'd4_quickShot'], [3, 'd4_fanShot'], [6, 'd4_twinArrow'], [10, 'd4_rideShot'], [14, 'd4_galeRain'], [20, 'd4_falconEye']] },
  pikemaid: { line: '长枪士系', type: '骑兵', weapon: ['lance'], sprite: 'pikemaid', sex: 'f',
    tiers: [TIER('长枪士', 1, 5, 'foot', [1, 2]), TIER('白羽骑士', 12, 7, 'fly')],
    base: { hp: 26, mp: 6, atk: 9, def: 8, mag: 4, spd: 8 }, growth: { hp: 3.1, mp: 0.9, atk: 1.5, def: 1.4, mag: 0.6, spd: 1.2 },
    promo: { hp: 6, mp: 2, atk: 2, def: 2, mag: 1, spd: 2 },
    skills: [[1, 'd4_featherThrust'], [4, 'd4_featherSpin'], [8, 'd4_skySweep'], [12, 'd4_featherMeteor'], [18, 'd4_dawnLance']] },
  amazon: { line: '亚马逊战士系', type: '战士', weapon: ['axe', 'claw'], sprite: 'amazon', sex: 'f',
    tiers: [TIER('亚马逊战士', 1, 5), TIER('铠甲士', 9, 5)],
    base: { hp: 30, mp: 4, atk: 11, def: 8, mag: 2, spd: 8 }, growth: { hp: 3.6, mp: 0.5, atk: 1.7, def: 1.4, mag: 0.3, spd: 1.1 },
    promo: { hp: 7, mp: 1, atk: 2, def: 3, spd: 1 },
    skills: [[1, 'd4_huntStrike'], [4, 'd4_jungleCry'], [8, 'd4_amazonSpin'], [12, 'd4_warShield'], [17, 'd4_stampede']],
    aLabel: '铠甲之道', aDesc: '重甲的铠甲士', aFocus: '防御',
    alt: { at: 1, sprite: 'amazon_b', label: '拳法之道', desc: '赤手空拳的拳法家', focus: '敏捷 · 拳法',
      tiers: [TIER('拳法家', 9, 6)], weapon: ['claw'],
      growth: { hp: 3.0, mp: 1.0, atk: 1.7, def: 1.0, mag: 0.6, spd: 1.6 }, promo: { hp: 4, mp: 3, atk: 2, spd: 3 },
      skills: [[9, 'd4_swiftKick'], [12, 'd4_innerCalm'], [15, 'd4_galeKicks'], [20, 'd4_crescentKick']] } },
  pickpocket: { line: '小偷系', type: '武士', weapon: ['blade'], sprite: 'pickpocket', sex: 'f', passive: ['search', 'unlock'],
    tiers: [TIER('小偷', 1, 7), TIER('杀手', 10, 7)],
    base: { hp: 21, mp: 6, atk: 9, def: 5, mag: 4, spd: 12 }, growth: { hp: 2.5, mp: 0.9, atk: 1.6, def: 0.8, mag: 0.6, spd: 1.7 },
    promo: { hp: 4, mp: 2, atk: 3, def: 1, spd: 2 },
    skills: [[1, 'd4_needleThrow'], [4, 'd4_numbBlade'], [8, 'd4_mistVeil'], [10, 'd4_assassinate'], [18, 'd4_bladeWaltz']] },
  sorceress: { line: '魔术士系', type: '法师', weapon: ['staff'], sprite: 'sorceress', sex: 'f',
    tiers: [TIER('魔术士', 1, 5), TIER('女巫', 10, 5)],
    base: { hp: 19, mp: 18, atk: 4, def: 4, mag: 9, spd: 8 }, growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.2 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'd4_witchFlame'], [2, 'd4_frostNeedle'], [5, 'd4_thunderHex'], [9, 'd4_witchHex'], [10, 'd4_cauldron'], [14, 'd4_hushCharm'], [18, 'd4_moonFrost'], [24, 'd4_witchStorm']] },
  nun: { line: '修女系', type: '牧师', weapon: ['staff'], sprite: 'nun', sex: 'f',
    tiers: [TIER('修女', 1, 5), TIER('主教', 10, 5)],
    base: { hp: 20, mp: 18, atk: 4, def: 5, mag: 8, spd: 7 }, growth: { hp: 2.4, mp: 2.2, atk: 0.5, def: 0.9, mag: 1.5, spd: 1.1 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'd4_prayer'], [3, 'd4_holyWord'], [6, 'd4_hymn'], [10, 'd4_absolve'], [13, 'd4_sanctum'], [17, 'd4_benediction'], [22, 'd4_miracle']],
    aLabel: '主教之道', aDesc: '统领教团的主教', aFocus: '回复',
    alt: { at: 1, sprite: 'nun_b', label: '精灵之道', desc: '与精灵立约的精灵使', focus: '召唤',
      tiers: [TIER('精灵使', 10, 5)],
      growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.2 }, promo: { hp: 3, mp: 7, mag: 4 },
      skills: [[10, 'd4_pactWind'], [12, 'd4_pactWater'], [16, 'd4_pactEarth'], [20, 'd4_pactFire'], [26, 'd4_pactLight']] } },
  // —— 特殊职业 ——
  elementalist: { line: '元素使系', type: '法师', weapon: ['staff'], sprite: 'elementalist', sex: 'f',
    tiers: [TIER('元素使', 1, 5), TIER('大元素使', 14, 5)],
    base: { hp: 21, mp: 20, atk: 4, def: 5, mag: 10, spd: 8 }, growth: { hp: 2.5, mp: 2.5, atk: 0.5, def: 0.9, mag: 1.8, spd: 1.1 },
    promo: { hp: 5, mp: 8, atk: 0, def: 1, mag: 4, spd: 1 },
    skills: [[1, 'rockSpike'], [1, 'd4_springHeal'], [4, 'hotWind'], [8, 'mudslide'], [12, 'tempest'], [16, 'bigRockSpike'], [22, 'volcano'], [30, 'fourBurst']] },
  pirate: { line: '海贼系', type: '战士', weapon: ['axe', 'sword'], sprite: 'pirate', sex: 'm',
    tiers: [TIER('海贼', 1, 6), TIER('海贼船长', 12, 6)],
    base: { hp: 30, mp: 6, atk: 12, def: 7, mag: 2, spd: 9 }, growth: { hp: 3.5, mp: 0.8, atk: 1.8, def: 1.1, mag: 0.3, spd: 1.3 },
    promo: { hp: 6, mp: 2, atk: 3, def: 1, spd: 1 },
    skills: [[1, 'anchorSwing'], [4, 'd4_jollyRoger'], [8, 'd4_tidalCleave'], [12, 'cannonShot'], [18, 'd4_maelstrom']] },
  summoner: { line: '召唤士系', type: '咒术师', weapon: ['staff'], sprite: 'summoner',
    tiers: [TIER('召唤士', 1, 5), TIER('召唤师', 12, 5)],
    base: { hp: 19, mp: 20, atk: 4, def: 4, mag: 9, spd: 7 }, growth: { hp: 2.3, mp: 2.5, atk: 0.4, def: 0.8, mag: 1.6, spd: 1.0 },
    promo: { hp: 4, mp: 8, mag: 3, def: 1 },
    skills: [[1, 'd4_callTreant'], [3, 'd4_callRoc'], [6, 'd4_callYeti'], [9, 'd4_callGiant'], [12, 'd4_callSphinx'], [18, 'd4_callTempest'], [24, 'd4_callDragon']] },
  // —— 隐藏职业（各英雄专属；条件见英雄资料 hidden）——
  gSwordSaint:  { line: '剑圣', type: '剑士', weapon: ['sword'], sprite: 'gSwordSaint', hiddenOf: 'kehelin', tiers: G4_HID('剑圣', 7),
    base: { hp: 34, mp: 14, atk: 14, def: 10, mag: 6, spd: 13 }, growth: { hp: 3.6, mp: 1.4, atk: 2.1, def: 1.4, mag: 0.8, spd: 1.6 },
    skills: [[1, 'swordSaint'], [1, 'd4_saintEye'], [1, 'ancientGolem'], [10, 'd4_saintMyriad']] },
  gSwordEvil:   { line: '剑邪', type: '剑士', weapon: ['sword'], sprite: 'gSwordEvil', hiddenOf: 'kehelin', tiers: G4_HID('剑邪', 7), passive: ['drain'],
    base: { hp: 32, mp: 14, atk: 15, def: 9, mag: 7, spd: 13 }, growth: { hp: 3.4, mp: 1.4, atk: 2.2, def: 1.2, mag: 1.0, spd: 1.6 },
    skills: [[1, 'evilBlade'], [1, 'd4_evilGale'], [1, 'ancientGolem'], [10, 'd4_soulReap']] },
  gGriffin:     { line: '狮鹫骑士', type: '鹰族', weapon: ['lance', 'sword'], sprite: 'gGriffin', hiddenOf: 'kehelin', tiers: G4_HID('狮鹫骑士', 8, 'fly'),
    base: { hp: 34, mp: 10, atk: 14, def: 11, mag: 4, spd: 13 }, growth: { hp: 3.6, mp: 1.0, atk: 2.0, def: 1.5, mag: 0.6, spd: 1.6 },
    skills: [[1, 'griffinDive'], [1, 'd4_griffinRush'], [1, 'ancientGolem'], [10, 'd4_griffinSky']] },
  gBowKing:     { line: '弓王', type: '弓箭手', weapon: ['bow'], sprite: 'gBowKing', hiddenOf: 'maisi', tiers: G4_HID('弓王', 6, 'foot', [2, 6]),
    base: { hp: 28, mp: 8, atk: 14, def: 7, mag: 3, spd: 13 }, growth: { hp: 3.0, mp: 1.0, atk: 2.1, def: 1.1, mag: 0.4, spd: 1.6 },
    skills: [[1, 'kingArrow'], [1, 'stormShot'], [10, 'd4_kingRain']] },
  gShadowSniper:{ line: '暗影狙击手', type: '弓箭手', weapon: ['bow'], sprite: 'gShadowSniper', hiddenOf: 'maisi', tiers: G4_HID('暗影狙击手', 7, 'foot', [2, 7]), passive: ['search'],
    base: { hp: 26, mp: 10, atk: 14, def: 6, mag: 4, spd: 15 }, growth: { hp: 2.8, mp: 1.1, atk: 2.1, def: 0.9, mag: 0.6, spd: 1.8 },
    skills: [[1, 'shadowSnipe'], [1, 'stormShot'], [10, 'd4_nightArrow']] },
  gLightMaiden: { line: '光之圣女', type: '牧师', weapon: ['staff', 'claw'], sprite: 'gLightMaiden', hiddenOf: 'beiliqina', tiers: G4_HID('光之圣女', 6),
    base: { hp: 30, mp: 30, atk: 8, def: 9, mag: 15, spd: 12 }, growth: { hp: 3.0, mp: 2.8, atk: 1.0, def: 1.2, mag: 2.0, spd: 1.3 },
    skills: [[1, 'lightSaint'], [1, 'd4_maidenJudge'], [1, 'ancientGolemB'], [10, 'd4_maidenDawn']] },
  gSpirit:      { line: '超灵体', type: '牧师', weapon: ['staff'], sprite: 'gSpirit', hiddenOf: 'beiliqina', tiers: G4_HID('超灵体', 7, 'fly'),
    base: { hp: 32, mp: 36, atk: 6, def: 10, mag: 18, spd: 13 }, growth: { hp: 3.0, mp: 3.0, atk: 0.8, def: 1.3, mag: 2.3, spd: 1.4 },
    skills: [[1, 'd4_spiritOne'], [1, 'd4_spiritMend'], [1, 'ancientGolemB'], [10, 'd4_spiritStar']] },
  gNetherAxe:   { line: '幽冥斧王', type: '战士', weapon: ['axe'], sprite: 'gNetherAxe', hiddenOf: 'bobi', tiers: G4_HID('幽冥斧王', 6), passive: ['drain'],
    base: { hp: 40, mp: 8, atk: 16, def: 10, mag: 4, spd: 10 }, growth: { hp: 4.2, mp: 0.8, atk: 2.2, def: 1.4, mag: 0.6, spd: 1.2 },
    skills: [[1, 'netherAxe'], [1, 'chaosPulse'], [10, 'd4_netherQuake']] },
  gThunderAxe:  { line: '雷风斧王', type: '战士', weapon: ['axe'], sprite: 'gThunderAxe', hiddenOf: 'bobi', tiers: G4_HID('雷风斧王', 7),
    base: { hp: 38, mp: 10, atk: 16, def: 9, mag: 6, spd: 12 }, growth: { hp: 4.0, mp: 1.0, atk: 2.2, def: 1.3, mag: 0.8, spd: 1.4 },
    skills: [[1, 'thunderAxe'], [1, 'chaosPulse'], [10, 'd4_thunderGod']] },
  gMagicBlade:  { line: '魔剑使', type: '剑士', weapon: ['sword'], sprite: 'gMagicBlade', hiddenOf: 'kouqi', tiers: G4_HID('魔剑使', 7),
    base: { hp: 30, mp: 16, atk: 14, def: 8, mag: 10, spd: 13 }, growth: { hp: 3.2, mp: 1.8, atk: 2.0, def: 1.1, mag: 1.4, spd: 1.6 },
    skills: [[1, 'd4_voidRend'], [1, 'chaosPulseB'], [10, 'd4_starfallBlade']] },
  gSpellSword:  { line: '魔法剑士', type: '剑士', weapon: ['sword', 'staff'], sprite: 'gSpellSword', hiddenOf: 'kouqi', tiers: G4_HID('魔法剑士', 6),
    base: { hp: 28, mp: 22, atk: 12, def: 8, mag: 13, spd: 12 }, growth: { hp: 3.0, mp: 2.2, atk: 1.7, def: 1.1, mag: 1.8, spd: 1.4 },
    skills: [[1, 'd4_thunderThrust'], [1, 'd4_flameBlade'], [1, 'chaosPulseB'], [10, 'd4_frostBlade']] },
  gYama:        { line: '阎魔使', type: '咒术师', weapon: ['staff'], sprite: 'gYama', hiddenOf: 'pulusi', tiers: G4_HID('阎魔使', 6),
    base: { hp: 26, mp: 34, atk: 5, def: 7, mag: 17, spd: 12 }, growth: { hp: 2.8, mp: 2.8, atk: 0.5, def: 1.0, mag: 2.2, spd: 1.3 },
    skills: [[1, 'yamaFire'], [1, 'd4_yamaChain'], [1, 'heatWave'], [10, 'd4_yamaVerdict']] },
  gHolyDemon:   { line: '圣魔使', type: '咒术师', weapon: ['staff'], sprite: 'gHolyDemon', hiddenOf: 'pulusi', tiers: G4_HID('圣魔使', 6),
    base: { hp: 28, mp: 34, atk: 5, def: 8, mag: 16, spd: 12 }, growth: { hp: 3.0, mp: 2.8, atk: 0.5, def: 1.1, mag: 2.1, spd: 1.3 },
    skills: [[1, 'holyDemon'], [1, 'd4_twilightMend'], [1, 'heatWave'], [10, 'd4_twilightRift']] },
  gSpecialOps:  { line: '特攻', type: '武士', weapon: ['blade'], sprite: 'gSpecialOps', hiddenOf: 'baihe', tiers: G4_HID('特攻', 8), passive: ['search', 'unlock'],
    base: { hp: 28, mp: 10, atk: 15, def: 7, mag: 5, spd: 17 }, growth: { hp: 3.0, mp: 1.0, atk: 2.2, def: 1.0, mag: 0.6, spd: 2.0 },
    skills: [[1, 'specialOps'], [1, 'd4_opsSweep'], [10, 'd4_opsFinale']] },
  gShadowNinja: { line: '影忍', type: '武士', weapon: ['blade', 'claw'], sprite: 'gShadowNinja', hiddenOf: 'baihe', tiers: G4_HID('影忍', 8), passive: ['search', 'unlock', 'combo'],
    base: { hp: 27, mp: 12, atk: 14, def: 7, mag: 6, spd: 18 }, growth: { hp: 2.9, mp: 1.2, atk: 2.0, def: 1.0, mag: 0.8, spd: 2.1 },
    skills: [[1, 'd4_shadowClone'], [1, 'd4_shadowFist'], [10, 'd4_shadowHell']] },
  gPirateKing:  { line: '海贼王', type: '战士', weapon: ['axe', 'sword'], sprite: 'gPirateKing', hiddenOf: 'liqi', tiers: G4_HID('海贼王', 7),
    base: { hp: 40, mp: 10, atk: 16, def: 10, mag: 4, spd: 12 }, growth: { hp: 4.0, mp: 1.0, atk: 2.1, def: 1.4, mag: 0.5, spd: 1.4 },
    skills: [[1, 'pirateKing'], [1, 'd4_broadside'], [10, 'd4_kingTide']] },
  gSeaLord:     { line: '黑海霸主', type: '战士', weapon: ['axe', 'blade'], sprite: 'gSeaLord', hiddenOf: 'liqi', tiers: G4_HID('黑海霸主', 7), passive: ['search', 'unlock'],
    base: { hp: 36, mp: 12, atk: 15, def: 9, mag: 6, spd: 14 }, growth: { hp: 3.8, mp: 1.2, atk: 2.0, def: 1.2, mag: 0.8, spd: 1.6 },
    skills: [[1, 'd4_blackTide'], [1, 'd4_abyssCurrent'], [10, 'd4_blackWhirl']] },
  gEvilSword:   { line: '邪剑使', type: '剑士', weapon: ['sword'], sprite: 'gEvilSword', hiddenOf: 'nafeiya', tiers: G4_HID('邪剑使', 7), passive: ['drain'],
    base: { hp: 30, mp: 14, atk: 15, def: 8, mag: 8, spd: 14 }, growth: { hp: 3.2, mp: 1.4, atk: 2.2, def: 1.1, mag: 1.0, spd: 1.7 },
    skills: [[1, 'evilSword'], [1, 'd4_bloodMoon'], [10, 'd4_eclipse']] },
  gHolySword:   { line: '神剑使', type: '剑士', weapon: ['sword'], sprite: 'gHolySword', hiddenOf: 'nafeiya', tiers: G4_HID('神剑使', 7),
    base: { hp: 32, mp: 14, atk: 14, def: 10, mag: 8, spd: 13 }, growth: { hp: 3.4, mp: 1.4, atk: 2.0, def: 1.4, mag: 1.0, spd: 1.6 },
    skills: [[1, 'holySword'], [1, 'd4_divineRay'], [10, 'd4_divineJudge']] },
  gLightKnight: { line: '光明骑士', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'gLightKnight', hiddenOf: 'nushayi', tiers: G4_HID('光明骑士', 7, 'horse'),
    base: { hp: 36, mp: 14, atk: 13, def: 12, mag: 8, spd: 11 }, growth: { hp: 3.8, mp: 1.4, atk: 1.8, def: 1.7, mag: 1.0, spd: 1.3 },
    skills: [[1, 'd4_radiantLance'], [1, 'd4_knightLight'], [10, 'd4_lightCharge']] },
  gHolyKnight:  { line: '圣骑士', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'gHolyKnight', hiddenOf: 'nushayi', tiers: G4_HID('圣骑士', 7, 'fly'),
    base: { hp: 38, mp: 18, atk: 14, def: 13, mag: 10, spd: 12 }, growth: { hp: 4.0, mp: 1.8, atk: 1.9, def: 1.8, mag: 1.2, spd: 1.3 },
    skills: [[1, 'd4_sacredLance'], [1, 'd4_sacredNova'], [1, 'd4_sacredMend'], [10, 'd4_sacredDragon']] },
  gWhiteDragon: { line: '白龙', type: '龙族', weapon: null, sprite: 'dragon', spriteTier: 0, spriteVariant: 'white', hiddenOf: 'guluru', tiers: G4_HID('白龙', 6, 'fly', [1, 2]),
    base: { hp: 44, mp: 20, atk: 14, def: 13, mag: 12, spd: 10 }, growth: { hp: 4.4, mp: 1.6, atk: 1.9, def: 1.7, mag: 1.5, spd: 1.1 },
    skills: [[1, 'd4_whiteBreath'], [1, 'd4_heatWaveB'], [10, 'd4_aurora']] },
  gBlackDragon: { line: '黑龙', type: '龙族', weapon: null, sprite: 'dragon', spriteTier: 0, spriteVariant: 'black', hiddenOf: 'guluru', tiers: G4_HID('黑龙', 6, 'fly', [1, 2]),
    base: { hp: 44, mp: 20, atk: 16, def: 12, mag: 12, spd: 10 }, growth: { hp: 4.4, mp: 1.6, atk: 2.1, def: 1.5, mag: 1.5, spd: 1.1 },
    skills: [[1, 'd4_blackBreath'], [1, 'd4_heatWaveB'], [10, 'd4_blackFlame']] },
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
  soon: false, tag: '四路线 · 隐藏职业', finalStage: 'g4_79',
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
