// 超时空英雄传说 2：复仇魔神 —— 新职业、招式、道具、英雄、结局与作品设定
// 依原作资料整理（十年后的科隆多；彦清风受无双女王所托寻找前代英雄），对白为重新撰写
'use strict';

// ===================================================================
// 招式（新增）
// ===================================================================
Object.assign(SPELLS, {
  // 蛊术
  blackLouse:  { name: '黑虱蛊',   school: '蛊', mp: 6,  range: [1, 4], kind: 'status', status: 'poison', turns: 4, chance: 80, fx: 'acid', desc: '放出黑虱蛊，令敌人中毒' },
  heartGu:     { name: '噬心蛊',   school: '蛊', mp: 8,  range: [1, 4], kind: 'debuff', stat: 'atk', amount: -6, turns: 3, fx: 'acid', desc: '蛊虫噬心，敌人攻击 -6' },
  spiderGu:    { name: '千蛛蛊',   school: '蛊', mp: 14, range: [1, 4], area: 1, kind: 'status', status: 'poison', turns: 3, chance: 65, fx: 'acid', desc: '千蛛齐出，令一片敌人中毒' },
  goldSilkGu:  { name: '金蚕蛊',   school: '蛊', mp: 18, power: 28, range: [1, 4], kind: 'magic', fx: 'acid', desc: '金蚕蚀骨，造成重伤' },
  mindGu:      { name: '迷心蛊',   school: '蛊', mp: 16, range: [1, 4], area: 1, kind: 'status', status: 'silence', turns: 3, chance: 70, fx: 'acid', desc: '令一片敌人无法施法' },
  // 幻术（芙蓉）
  phantom:     { name: '幻影术',   school: '幻', mp: 7,  range: [1, 4], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'dark', desc: '幻影迷惑一片敌人，令其无法行动' },
  illusionKill:{ name: '幻杀',     school: '幻', mp: 10, power: 18, range: [1, 4], kind: 'magic', fx: 'dark', desc: '以幻象杀伤敌人' },
  nightmare:   { name: '梦魇',     school: '幻', mp: 14, range: [1, 4], kind: 'status', status: 'freeze', turns: 2, chance: 70, fx: 'dark', desc: '让敌人陷入梦魇无法行动' },
  mirrorBlade: { name: '镜花水月', school: '幻', mp: 22, power: 34, range: [1, 4], area: 1, kind: 'magic', fx: 'dark', desc: '虚实难辨的幻术，伤及一片敌人' },
  godGuard:    { name: '天神护体', school: '圣', mp: 8,  range: [0, 3], kind: 'buff', stat: 'def', amount: 10, turns: 3, fx: 'buff', desc: '天神庇护，3 回合内防御 +10' },
  // 御风剑法（秋月）
  windSword:   { name: '御风剑',   school: '剑', mp: 5,  power: 8,  range: [1, 2], kind: 'phys', sure: true, style: 'dash', fx: 'wind', desc: '身随风动的快剑，射程 1-2' },
  mistSword:   { name: '飘渺剑',   school: '剑', mp: 12, power: 18, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'wind', desc: '剑影飘渺，波及周围' },
  yinSword:    { name: '阴剑诀',   school: '剑', mp: 16, power: 24, range: [1, 1], kind: 'phys', sure: true, crit: 35, style: 'blade', fx: 'ice', desc: '阴寒剑气，极易暴击' },
  // 刑天
  swordQi:     { name: '剑气',     school: '剑', mp: 6,  power: 14, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'slash', desc: '剑气纵横，贯穿一列' },
  soulReaper:  { name: '冥魄剑',   school: '剑', mp: 22, power: 36, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'dark', desc: '古剑冥魄之力' },
  // 白骑士（伊娃）
  whiteLance:  { name: '白骑突击', school: '枪', mp: 6,  power: 10, range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'holy', desc: '白骑士的突刺' },
  magicKnight: { name: '魔骑士之刃', school: '枪', mp: 18, power: 28, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '附魔长枪贯穿一列' },
  // 冒险者 / 英雄（清风）
  braveStrike: { name: '勇者一击', school: '剑', mp: 5,  power: 9,  range: [1, 1], kind: 'phys', sure: true, crit: 15, style: 'blade', fx: 'slash', desc: '冒险者的必中一击' },
  heroSlash:   { name: '英雄斩',   school: '剑', mp: 20, power: 34, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '英雄的豪迈剑技' },
  dragonLord:  { name: '龙王之怒', school: '枪', mp: 26, power: 40, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'fire', desc: '驾龙冲锋，烈焰贯穿一列' },
  learnSkill:  { name: '学习',     school: '圣', mp: 4,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 30, turns: 3, fx: 'buff', desc: '圣者凝神学习，命中与暴击大增' },
  // 情侣合技（需好感度 80 以上并相邻）
  coupleEva:   { name: '双星圣骑', school: '双', mp: 16, power: 46, range: [1, 3], area: 1, kind: 'pair', sure: true, partner: 'eva', rel: 80, fx: 'holy', desc: '与伊娃心意相通的合击，波及周围' },
  coupleQiu:   { name: '风剑合璧', school: '双', mp: 16, power: 52, range: [1, 4], line: true, kind: 'pair', sure: true, partner: 'qiuyue', rel: 80, fx: 'slash', desc: '与秋月的双剑合璧，贯穿一列' },
  coupleYi:    { name: '圣光祈愿', school: '双', mp: 16, power: 48, range: [1, 4], area: 2, kind: 'pair', sure: true, partner: 'yilinna', rel: 80, fx: 'holy', desc: '与依琳娜共同祈愿，圣光降临一大片区域' },
  // 敌方
  beastRoar:   { name: '兽王咆哮', school: '技', mp: 10, power: 30, range: [1, 3], area: 1, kind: 'magic', fx: 'dark', desc: '' },
  demonCurse:  { name: '魔神诅咒', school: '技', mp: 16, power: 38, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '' },
  soulSummon:  { name: '召魂大法', school: '召', mp: 14, range: [1, 1], kind: 'summon', unit: 'beast', turns: 99, fx: 'summon', desc: '' },
});
Object.assign(SCHOOL_NAME, { 蛊: '蛊术', 幻: '幻术' });

// ===================================================================
// 职业专属招式（复仇魔神各职业系；取代原本借用的一代通用招式，数值与原格相当）
// ===================================================================
Object.assign(SPELLS, {
  // 冒险者系（英雄之道）：勇气与光的剑技
  b2_braveSpin:   { name: '勇气回旋', school: '剑', mp: 6,  power: 8,  range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '鼓起勇气旋身挥剑，攻击身边所有敌人' },
  b2_braveDash:   { name: '勇往直前', school: '剑', mp: 7,  power: 10, range: [1, 3], kind: 'phys', sure: true, style: 'dash', fx: 'slash', desc: '冒险者一往无前的突进斩，射程 1-3，必中' },
  b2_lightArc:    { name: '光刃横扫', school: '剑', mp: 9,  power: 12, range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'holy', desc: '剑刃带光横扫前方三格' },
  b2_braveBurst:  { name: '烈勇斩',   school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'fire', desc: '勇气化作烈焰，斩伤目标与周围' },
  b2_legendBlade: { name: '传说之剑', school: '剑', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, crit: 10, style: 'blade', fx: 'holy', desc: '吟游诗人传唱的英雄一剑，威力极大' },
  // 冒险者系 B「龙骑之道」：圣骑与龙
  b2_vowLance:    { name: '誓约之枪', school: '枪', mp: 9,  power: 16, range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'holy', desc: '以骑士誓约为力的长枪突刺' },
  b2_knightMend:  { name: '骑士疗愈', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '圣骑士按手祈祷，回复少许生命' },
  b2_dragonScale: { name: '龙鳞守护', school: '枪', mp: 8,  range: [0, 0], area: 1, kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '龙鳞之盾护住自己与身边同伴，防御 +6' },
  b2_dragonDive:  { name: '龙翔俯击', school: '枪', mp: 16, power: 24, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'dive', fx: 'fire', desc: '驭龙自空中俯冲刺下，龙焰波及周围' },
  // 施法者系：领主的纹章魔法
  b2_sigilFlame:  { name: '纹章火',   school: '火', mp: 4,  power: 10, range: [1, 3], kind: 'magic', fx: 'fire', desc: '燃起领主纹章，射出火焰' },
  b2_lordGrace:   { name: '领主恩泽', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '领主施予恩泽，回复少许生命' },
  b2_sigilFrost:  { name: '纹章冰棱', school: '水', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'ice', desc: '纹章凝出冰棱刺向敌人' },
  b2_banner:      { name: '王旗鼓舞', school: '圣', mp: 10, range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 3, turns: 3, fx: 'buff', desc: '高举王旗，友军攻击、防御、魔力 +3' },
  b2_sigilThunder:{ name: '纹章雷阵', school: '风', mp: 10, power: 16, range: [1, 4], area: 1, kind: 'magic', fx: 'bolt', desc: '纹章阵引落雷电，伤及一片敌人' },
  b2_sageHalo:    { name: '圣者光环', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '圣者周身光环扩散，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  b2_sageGrace:   { name: '圣者恩光', school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '圣者的恩光遍照，大范围回复生命' },
  b2_crownJudge:  { name: '天罚纹章', school: '风', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'bolt', desc: '王冠纹章降下天罚之雷' },
  // 白骑士系：白骑与魔枪
  b2_whiteMend:   { name: '纯白祈护', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '白骑士的祈护，回复少许生命' },
  b2_whiteSweep:  { name: '白翼横扫', school: '枪', mp: 6,  power: 8,  range: [1, 1], arc: true, kind: 'phys', sure: true, style: 'sweep', fx: 'wind', desc: '长枪如白翼展开，横扫前方三格' },
  b2_templarLance:{ name: '圣殿制裁', school: '枪', mp: 9,  power: 14, range: [1, 2], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'thrust', fx: 'holy', desc: '圣殿骑士的制裁突刺，令敌人无法反击' },
  b2_auroraLance: { name: '魔枪·极光', school: '枪', mp: 26, power: 42, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '魔法骑士以极光魔力灌注长枪冲锋，贯穿一列' },
  // 幻术师系
  b2_mirage:      { name: '蜃气迷障', school: '幻', mp: 8,  range: [1, 4], kind: 'debuff', stat: 'atk', amount: -5, turns: 3, fx: 'dark', desc: '蜃气幻象扰乱敌人，3 回合内攻击 -5' },
  b2_muteDream:   { name: '无声幻境', school: '幻', mp: 8,  range: [1, 4], kind: 'status', status: 'silence', turns: 3, chance: 75, fx: 'dark', desc: '将敌人困入无声的幻境，无法施法' },
  b2_dreamEater:  { name: '食梦',     school: '幻', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '吞食敌人的梦与魂（对首领无效）' },
  b2_phantasm:    { name: '万华幻境', school: '幻', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '千万幻象同时袭来，伤及一大片敌人' },
  // 御风剑士系
  b2_gustFeint:   { name: '风影虚招', school: '剑', mp: 8,  power: 6,  range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'dash', fx: 'wind', desc: '风中虚实一剑，令敌人无法反击' },
  b2_windMoon:    { name: '风月双剑', school: '双', mp: 12, power: 22, range: [1, 3], kind: 'pair', sure: true, fx: 'wind', desc: '与相邻伙伴一风一月，双剑交错' },
  b2_snowWind:    { name: '流风回雪', school: '双', mp: 24, power: 44, range: [1, 4], kind: 'pair', sure: true, fx: 'ice', desc: '与相邻伙伴剑舞如流风回雪' },
  b2_heavenWind:  { name: '天风一剑', school: '剑', mp: 26, power: 38, range: [1, 2], kind: 'phys', sure: true, crit: 10, style: 'dash', fx: 'wind', desc: '剑圣乘天风而至的一剑，威力极大' },
  // 祈祷师系：祈愿
  b2_wishHeal:    { name: '祈愿之息', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '轻声祈愿，回复少许生命' },
  b2_prayLight:   { name: '祈光',     school: '圣', mp: 6,  power: 12, range: [1, 4], kind: 'magic', fx: 'holy', vsDark: 2, desc: '祈来的圣光，对魔族与黑暗系双倍伤害' },
  b2_wardCircle:  { name: '祈护圣环', school: '圣', mp: 8,  range: [0, 3], area: 1, kind: 'buff', stat: 'def', amount: 6, turns: 3, fx: 'buff', desc: '圣环护住一片友军，3 回合内防御 +6' },
  b2_wishRain:    { name: '祈雨甘霖', school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '祈来甘霖，一次回复多人生命' },
  b2_purify:      { name: '净化祷文', school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '诵读净化祷文，解除石化以外的各种状态' },
  b2_prayField:   { name: '祈愿圣域', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '祈愿化作圣域，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  b2_devoutWish:  { name: '虔诚祈愿', school: '圣', mp: 12, power: 60, range: [0, 3], kind: 'heal', fx: 'heal', desc: '虔诚的祈愿，回复大部分生命' },
  b2_saintHymn:   { name: '圣女颂歌', school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '圣女的颂歌，大范围回复生命' },
  b2_angelDescent:{ name: '天使降临', school: '召', mp: 26, range: [1, 1], kind: 'summon', unit: 'angel', turns: 3, fx: 'summon', desc: '圣女的祈愿上达天听，天使降临助战 3 回合' },
  // 剑客系：剑狂、剑痴
  b2_glareSword:  { name: '剑意慑魂', school: '剑', mp: 8,  power: 6,  range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'blade', fx: 'dark', desc: '剑意逼人，令敌人胆寒而无法反击' },
  b2_madCleave:   { name: '狂剑劈山', school: '剑', mp: 12, power: 18, range: [1, 2], kind: 'phys', sure: true, style: 'blade', fx: 'rock', desc: '剑狂的劈山一剑，射程 1-2' },
  b2_thousandSword:{ name: '千剑乱舞', school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'slash', desc: '剑影如千，斩伤目标与周围' },
  b2_swordObsess: { name: '痴剑·天绝', school: '剑', mp: 34, power: 50, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'dark', desc: '剑痴毕生所悟的绝剑' },
  // 蛊师系
  b2_needleGu:    { name: '蛊针',     school: '蛊', mp: 5,  power: 12, range: [1, 4], kind: 'magic', fx: 'acid', desc: '射出淬了蛊毒的细针' },
  b2_soulGu:      { name: '夺魂蛊',   school: '蛊', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'acid', desc: '蛊虫钻入魂魄，夺人性命（对首领无效）' },
  // 杀手
  b2_throatCut:   { name: '封喉毒刃', school: '忍', mp: 6,  power: 10, range: [1, 1], kind: 'phys', sure: true, status: 'poison', turns: 3, chance: 75, style: 'blade', fx: 'acid', desc: '杀手的淬毒封喉一刀，令敌人中毒' },
  b2_ghostStep:   { name: '鬼步杀',   school: '忍', mp: 12, power: 26, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 30, style: 'dash', fx: 'dark', desc: '鬼魅般的步法穿过敌阵，必杀一刀' },
});

// ===================================================================
// 职业（新增）
// ===================================================================
Object.assign(CLASSES, {
  adventurer: { line: '冒险者系', type: '剑士', weapon: ['sword'], sprite: 'adventurer',
    tiers: [TIER('冒险者', 1, 5), TIER('勇士', 6, 5), TIER('斗剑士', 12, 6), TIER('英雄', 19, 6)],
    base: { hp: 26, mp: 8, atk: 9, def: 6, mag: 4, spd: 7 }, growth: { hp: 3.4, mp: 1.0, atk: 1.7, def: 1.3, mag: 0.7, spd: 1.3 },
    promo: { hp: 5, mp: 2, atk: 2, def: 2, mag: 1, spd: 1 },
    skills: [[1, 'braveStrike'], [4, 'b2_braveSpin'], [8, 'b2_braveDash'], [11, 'b2_lightArc'], [15, 'b2_braveBurst'], [20, 'heroSlash'], [26, 'b2_legendBlade']],
    aLabel: '英雄之道', aDesc: '以剑闯荡的冒险者，成长为传说中的英雄', aFocus: '攻击 · 剑技',
    alt: { at: 2, sprite: 'adventurer_b', label: '龙骑之道', desc: '成为圣骑士，最终驾驭巨龙', focus: '防御 · 机动',
      tiers: [TIER('圣骑士', 12, 6, 'horse'), TIER('龙领主', 19, 7, 'fly')],
      growth: { hp: 3.6, mp: 1.2, atk: 1.5, def: 1.6, mag: 0.9, spd: 1.0 }, promo: { hp: 7, mp: 3, atk: 2, def: 3, mag: 1, spd: 0 },
      skills: [[12, 'b2_vowLance'], [12, 'b2_knightMend'], [15, 'b2_dragonScale'], [20, 'b2_dragonDive'], [26, 'dragonLord']], weapon: ['sword', 'lance'] } },
  lordmage: { line: '施法者系', type: '法师', weapon: ['staff', 'sword'], sprite: 'lordmage',
    tiers: [TIER('施法者', 1, 5), TIER('领主', 8, 5), TIER('圣者', 16, 6)],
    base: { hp: 22, mp: 14, atk: 6, def: 5, mag: 8, spd: 6 }, growth: { hp: 2.8, mp: 2.0, atk: 1.0, def: 1.0, mag: 1.5, spd: 1.1 },
    promo: { hp: 5, mp: 6, atk: 1, def: 2, mag: 3, spd: 1 },
    skills: [[1, 'b2_sigilFlame'], [1, 'b2_lordGrace'], [4, 'b2_sigilFrost'], [8, 'b2_banner'], [11, 'b2_sigilThunder'], [16, 'learnSkill'], [16, 'b2_sageHalo'], [22, 'b2_sageGrace'], [26, 'b2_crownJudge']] },
  whiteKnight: { line: '白骑士系', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'whiteKnight', sex: 'f',
    tiers: [TIER('白骑士', 1, 6, 'horse'), TIER('圣殿骑士', 8, 6, 'horse'), TIER('皇家骑士', 16, 7, 'horse'), TIER('魔法骑士', 24, 7, 'horse')],
    base: { hp: 25, mp: 8, atk: 9, def: 7, mag: 5, spd: 7 }, growth: { hp: 3.2, mp: 1.1, atk: 1.6, def: 1.4, mag: 0.9, spd: 1.1 },
    promo: { hp: 6, mp: 3, atk: 2, def: 2, mag: 2, spd: 1 },
    skills: [[1, 'whiteLance'], [5, 'b2_whiteMend'], [9, 'b2_whiteSweep'], [13, 'godGuard'], [17, 'b2_templarLance'], [24, 'magicKnight'], [28, 'b2_auroraLance']] },
  illusionist: { line: '幻术师系', type: '咒术师', weapon: ['staff'], sprite: 'illusionist', sex: 'f',
    tiers: [TIER('幻术师', 1, 5), TIER('幻术大师', 8, 5), TIER('魔幻师', 16, 5), TIER('幻魔', 24, 6)],
    base: { hp: 19, mp: 18, atk: 4, def: 4, mag: 9, spd: 7 }, growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.2 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'illusionKill'], [2, 'phantom'], [6, 'b2_mirage'], [10, 'nightmare'], [14, 'b2_muteDream'], [18, 'mirrorBlade'], [24, 'b2_dreamEater'], [28, 'b2_phantasm']] },
  windSword: { line: '御风剑士系', type: '剑士', weapon: ['sword'], sprite: 'windSword', sex: 'f',
    tiers: [TIER('剑侠', 1, 6), TIER('御风剑士', 6, 6), TIER('飘渺剑士', 14, 7), TIER('剑圣', 22, 7)],
    base: { hp: 23, mp: 8, atk: 9, def: 5, mag: 4, spd: 10 }, growth: { hp: 2.8, mp: 1.0, atk: 1.7, def: 1.0, mag: 0.6, spd: 1.6 },
    promo: { hp: 4, mp: 2, atk: 3, def: 1, mag: 1, spd: 2 },
    skills: [[1, 'windSword'], [5, 'b2_gustFeint'], [9, 'mistSword'], [14, 'b2_windMoon'], [18, 'yinSword'], [24, 'b2_snowWind'], [28, 'b2_heavenWind']] },
  prayer: { line: '祈祷师系', type: '牧师', weapon: ['staff', 'lance'], sprite: 'prayer', sex: 'f',
    tiers: [TIER('祈祷师', 1, 5), TIER('神官战士', 8, 5), TIER('大祭司', 16, 5), TIER('圣女', 24, 6)],
    base: { hp: 21, mp: 18, atk: 6, def: 5, mag: 8, spd: 7 }, growth: { hp: 2.6, mp: 2.2, atk: 1.0, def: 1.0, mag: 1.5, spd: 1.1 },
    promo: { hp: 5, mp: 6, atk: 1, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'b2_wishHeal'], [1, 'b2_prayLight'], [5, 'b2_wardCircle'], [9, 'b2_wishRain'], [12, 'b2_purify'], [15, 'b2_prayField'], [19, 'b2_devoutWish'], [24, 'b2_saintHymn'], [28, 'b2_angelDescent']] },
  swordMad: { line: '剑客系', type: '剑士', weapon: ['sword'], sprite: 'swordMad',
    tiers: [TIER('多情剑客', 1, 6), TIER('剑狂', 10, 6), TIER('剑痴', 20, 7)],
    base: { hp: 28, mp: 10, atk: 12, def: 7, mag: 3, spd: 10 }, growth: { hp: 3.2, mp: 1.0, atk: 1.9, def: 1.1, mag: 0.4, spd: 1.4 },
    promo: { hp: 6, mp: 2, atk: 3, def: 1, mag: 0, spd: 2 },
    skills: [[1, 'swordQi'], [1, 'b2_glareSword'], [8, 'b2_madCleave'], [14, 'b2_thousandSword'], [20, 'soulReaper'], [26, 'b2_swordObsess']] },
  gushi: { line: '蛊师系', type: '咒术师', weapon: ['staff', 'claw'], sprite: 'gushi',
    tiers: [TIER('蛊师', 1, 5), TIER('蛊术士', 10, 5), TIER('蛊王', 20, 5)],
    base: { hp: 20, mp: 16, atk: 5, def: 4, mag: 8, spd: 7 }, growth: { hp: 2.4, mp: 2.2, atk: 0.7, def: 0.8, mag: 1.5, spd: 1.1 },
    promo: { hp: 5, mp: 7, atk: 1, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'blackLouse'], [4, 'heartGu'], [8, 'b2_needleGu'], [11, 'spiderGu'], [15, 'mindGu'], [19, 'goldSilkGu'], [25, 'b2_soulGu']] },
  // 敌方专用
  beastKing: { line: '兽王', type: '巨怪', weapon: null, sprite: 'beastKing', tiers: [TIER('兽化杨铁', 1, 5, 'foot', [1, 2])],
    base: { hp: 60, mp: 40, atk: 16, def: 12, mag: 10, spd: 9 }, growth: { hp: 4.4, mp: 1.5, atk: 1.9, def: 1.4, mag: 1.2, spd: 1.0 }, skills: [[1, 'beastRoar'], [1, 'earthSplit']] },
  revengeDemon: { line: '复仇魔神', type: '黑暗系', weapon: null, sprite: 'revengeDemon', tiers: [TIER('复仇魔神', 1, 5, 'fly', [1, 3])],
    base: { hp: 52, mp: 90, atk: 12, def: 10, mag: 16, spd: 10 }, growth: { hp: 4.0, mp: 2.4, atk: 1.4, def: 1.2, mag: 1.8, spd: 1.0 }, skills: [[1, 'demonCurse'], [1, 'mirrorBlade'], [1, 'nightmare'], [1, 'vortex']] },
  assassin: { line: '杀手', type: '武士', weapon: ['blade', 'sword'], sprite: 'samurai_b', tiers: [TIER('杀手', 1, 6), TIER('皇家杀手', 15, 7)],
    base: { hp: 24, mp: 6, atk: 11, def: 5, mag: 2, spd: 11 }, growth: { hp: 2.8, mp: 0.6, atk: 1.8, def: 0.9, mag: 0.3, spd: 1.6 }, promo: { hp: 4, atk: 3, spd: 2 },
    skills: [[1, 'b2_throatCut'], [10, 'b2_ghostStep']] },
  treant: { line: '树妖', type: '兽类', weapon: null, sprite: 'treant', tiers: [TIER('树妖', 1, 3)],
    base: { hp: 30, mp: 8, atk: 9, def: 9, mag: 5, spd: 3 }, growth: { hp: 3.4, mp: 0.5, atk: 1.5, def: 1.4, mag: 0.8, spd: 0.5 }, skills: [[1, 'acid']] },
  siren: { line: '海妖', type: '水中', weapon: null, sprite: 'medusa', tiers: [TIER('海妖', 1, 5, 'water', [1, 3])],
    base: { hp: 24, mp: 20, atk: 8, def: 6, mag: 10, spd: 8 }, growth: { hp: 2.8, mp: 1.2, atk: 1.2, def: 1.0, mag: 1.5, spd: 1.1 }, skills: [[1, 'iceArrow'], [8, 'freezeWave']] },
  goblin: { line: '地精', type: '兽类', weapon: null, sprite: 'goblin', tiers: [TIER('地精', 1, 5)],
    base: { hp: 18, mp: 0, atk: 8, def: 5, mag: 2, spd: 8 }, growth: { hp: 2.4, mp: 0, atk: 1.4, def: 0.9, mag: 0.3, spd: 1.2 } },
  silverWolf: { line: '银狼', type: '狼族', weapon: null, sprite: 'wolfman', tiers: [TIER('银狼', 1, 7)],
    base: { hp: 22, mp: 0, atk: 10, def: 4, mag: 0, spd: 10 }, growth: { hp: 2.8, mp: 0, atk: 1.7, def: 0.9, mag: 0, spd: 1.4 }, skills: [[1, 'bite']] },
});
// mk() 产生的职业没有 skills 字段的补上
for (const k of ['goblin']) CLASSES[k].skills = CLASSES[k].skills || [];

// ===================================================================
// 道具（新增）
// ===================================================================
Object.assign(ITEMS, {
  broadSword:   { name: '阔剑',     type: 'weapon', kind: 'sword', atk: 6, price: 220 },
  frostSword:   { name: '青霜剑',   type: 'weapon', kind: 'sword', atk: 9, crit: 5, price: 520 },
  twinCleaver:  { name: '双刃砍刀', type: 'weapon', kind: 'axe', atk: 12, hit: -5, price: 700 },
  lightSword:   { name: '光之剑',   type: 'weapon', kind: 'sword', atk: 18, mag: 4, price: 0, desc: '隐者克里斯以光聚成的剑' },
  sacredSword:  { name: '圣剑',     type: 'weapon', kind: 'sword', atk: 24, mag: 4, crit: 5, price: 0 },
  yinSwordItem: { name: '地宁-阴剑', type: 'weapon', kind: 'sword', atk: 22, crit: 15, price: 0 },
  ancientSword: { name: '古剑-冥魄', type: 'weapon', kind: 'sword', atk: 26, crit: 8, price: 0 },
  oriScepter:   { name: '奥里传国杖', type: 'weapon', kind: 'staff', atk: 6, mag: 12, price: 0 },
  silkRobe:     { name: '丝衣',     type: 'armor', def: 2, mag: 1, price: 90 },
  roundShield:  { name: '小圆盾',   type: 'armor', def: 4, price: 180 },
  ringMail:     { name: '环形甲',   type: 'armor', def: 9, price: 900 },
  mirrorShield: { name: '七彩镜盾', type: 'armor', def: 14, mag: 4, price: 0 },
  dragonSinew:  { name: '龙筋战衣', type: 'armor', def: 16, price: 0 },
  manaRobe:     { name: '魔力护袍', type: 'armor', def: 8, mag: 6, price: 0 },
  magicBoots:   { name: '魔法靴',   type: 'acc', mov: 1, mag: 2, price: 0 },
  catEye:       { name: '猫眼石',   type: 'acc', crit: 8, price: 0 },
  sirenHarp:    { name: '海妖竖琴', type: 'acc', mag: 5, price: 0 },
  powerStone:   { name: '力量辉石', type: 'use', stat: { atk: 2 }, price: 0, desc: '永久提升攻击 +2' },
  lifeFruit:    { name: '生命之果', type: 'use', stat: { mhp: 10 }, price: 0, desc: '永久提升 HP 上限 +10' },
  wisdomFruit:  { name: '智慧果',   type: 'use', stat: { mag: 2 }, price: 0, desc: '永久提升魔力 +2' },
  elixir:       { name: '仙丹',     type: 'use', hp: 999, price: 0, desc: '完全回复 HP' },
  syncGem:      { name: '紫色同调石', type: 'key', price: 0, desc: '无双女王托付的宝石，似乎与十年前的大战有关' },
  oldScroll:    { name: '神秘卷轴', type: 'key', price: 0, desc: '记载着英雄冢所在的古老卷轴' },
});

// ===================================================================
// 英雄（复仇魔神）
// ===================================================================
CAMPAIGN_HEROES.g2 = {
  qingfeng: { name: '彦清风', cls: 'adventurer', lv: 3, hair: '#6a3a1a', lord: true, sex: 'm', weapon: 'ironSword', lines: ['adventurer', 'lordmage'],
    stats: { hp: 34, mp: 10, atk: 11, def: 7, mag: 5, spd: 9 }, bio: '赤子国的青年，谦和中带着果决。受无双女王所托，寻找十年前的英雄们。',
    skills: [[12, 'coupleEva'], [12, 'coupleQiu'], [12, 'coupleYi']] },
  bai:      { name: '白志超', cls: 'swordsman', lv: 4, hair: '#2a2430', sex: 'm', weapon: 'ironSword',
    stats: { hp: 32, mp: 5, atk: 12, def: 7, mag: 2, spd: 9 }, bio: '清风的少年好友，迦纳帝国的剑士，连夜赶来赤子国示警。' },
  eva:      { name: '伊娃', cls: 'whiteKnight', lv: 4, hair: '#c83a2a', sex: 'f', weapon: 'spear', lines: ['whiteKnight'],
    stats: { hp: 33, mp: 10, atk: 11, def: 9, mag: 6, spd: 9 }, bio: '赤子国近卫队长，优雅的白骑士。对女王忠心耿耿，默默守在清风身边。' },
  nuolu:    { name: '诺鲁', cls: 'fighter', lv: 3, hair: '#8a5a2a', sex: 'm', weapon: 'battleAxe',
    stats: { hp: 36, mp: 2, atk: 12, def: 6, mag: 0, spd: 6 }, bio: '赤子国的斧兵，力大无穷，嗓门也大。' },
  sonia:    { name: '索妮亚', cls: 'archer', lv: 3, hair: '#d8a040', sex: 'f', weapon: 'shortBow',
    stats: { hp: 26, mp: 4, atk: 11, def: 4, mag: 2, spd: 11 }, bio: '赤子王城的女猎手，箭术精准。' },
  shamanshan:{ name: '沙曼珊', cls: 'mage', lv: 2, hair: '#4a3a8a', sex: 'f', weapon: 'shortStaff',
    stats: { hp: 22, mp: 22, atk: 4, def: 4, mag: 11, spd: 8 }, bio: '兵器塔里被迫研究魔法兵器的年轻魔术师。' },
  furong:   { name: '芙蓉', cls: 'illusionist', lv: 4, hair: '#1e1a2a', sex: 'f', weapon: 'shortStaff', lines: ['illusionist'],
    stats: { hp: 26, mp: 26, atk: 5, def: 5, mag: 13, spd: 10 }, bio: '神秘的富家千金，精通幻术。温柔的笑容底下，似乎藏着很深的秘密。' },
  qili:     { name: '栖历', cls: 'sorcerer', lv: 9, hair: '#d8d8e8', sex: 'm', weapon: 'longStaff',
    stats: { hp: 34, mp: 40, atk: 6, def: 8, mag: 20, spd: 10 }, bio: '隐居神殿的老术士，被清风一行打败后决定同行。' },
  dvra:     { name: '戴薇拉', cls: 'hawk', lv: 9, hair: '#8a5a2a', sex: 'f', weapon: 'wolfFang',
    stats: { hp: 44, mp: 8, atk: 22, def: 12, mag: 4, spd: 20 }, bio: '鹰族的女战士，十年前与孟祈并肩作战的英雄之一。' },
  judy:     { name: '茱迪', cls: 'archer', lv: 10, hair: '#c04a2a', sex: 'f', weapon: 'longBow',
    stats: { hp: 42, mp: 6, atk: 22, def: 10, mag: 3, spd: 20 }, bio: '镜湖城的神箭手，十年前的英雄之一，如今守护着故乡。' },
  qiuyue:   { name: '秋月', cls: 'windSword', lv: 8, hair: '#d8d0f0', sex: 'f', weapon: 'steelSword', lines: ['windSword'],
    stats: { hp: 40, mp: 12, atk: 19, def: 9, mag: 6, spd: 20 }, bio: '冷艳的女剑客，御风剑法出神入化。与迦纳四天王刑天有一段旧情。' },
  aifulin:  { name: '艾芙琳', cls: 'priest', lv: 9, hair: '#e8c8a0', sex: 'f', weapon: 'longStaff',
    stats: { hp: 34, mp: 34, atk: 6, def: 8, mag: 17, spd: 12 }, bio: '港口教会的修女，看不惯迦纳军的暴行而加入。' },
  laweisi:  { name: '拉维司', cls: 'gushi', lv: 9, hair: '#3a5a3a', sex: 'm', weapon: 'shortStaff',
    stats: { hp: 32, mp: 34, atk: 7, def: 7, mag: 17, spd: 11 }, bio: '来自南方蛊族的青年，精通蛊术，被迦纳军追捕。' },
  jienuo:   { name: '杰诺', cls: 'knight', lv: 14, hair: '#3a3a5a', sex: 'm', weapon: 'silverLance',
    stats: { hp: 58, mp: 8, atk: 28, def: 22, mag: 4, spd: 18 }, bio: '奥里国的骑士，在两难之间选择了站在清风这边。' },
  xiaoling: { name: '小灵', cls: 'sorcerer', lv: 13, hair: '#7ad87a', sex: 'f', weapon: 'shortStaff',
    stats: { hp: 40, mp: 44, atk: 7, def: 10, mag: 24, spd: 16 }, bio: '和地精们一起生活的精灵少女，被清风的仁慈打动。' },
  yilinna:  { name: '依琳娜', cls: 'prayer', lv: 14, hair: '#f4d474', sex: 'f', weapon: 'longStaff', lines: ['prayer'],
    stats: { hp: 48, mp: 46, atk: 12, def: 14, mag: 26, spd: 16 }, bio: '奥里国的公主，民间都叫她“公主”。率领奥里军民对抗迦纳。' },
  aiwen:    { name: '艾文', cls: 'samurai', lv: 17, hair: '#2a2a2a', sex: 'm', weapon: 'katana',
    stats: { hp: 64, mp: 10, atk: 32, def: 24, mag: 4, spd: 22 }, bio: '流浪的武士，被困在夹击之地的隐秘洞窟里。' },
  rentian:  { name: '任天', cls: 'mage', lv: 18, hair: '#5a6a8a', sex: 'm', weapon: 'crystalStaff',
    stats: { hp: 52, mp: 70, atk: 8, def: 14, mag: 34, spd: 20 }, bio: '隐洞深处的魔法师，擅长传送与定身的法术。' },
  xingtian: { name: '刑天', cls: 'swordMad', lv: 22, hair: '#1a1a24', sex: 'm', weapon: 'platinumSword', lines: ['swordMad'],
    stats: { hp: 86, mp: 26, atk: 44, def: 28, mag: 8, spd: 32 }, bio: '迦纳四天王之一，剑气无双的剑客，秋月的旧情人。' },
  // 剧情人物（不出战，只用于对白头像与名字）
  wushuang: { name: '无双', cls: 'mage', lv: 30, hair: '#1a1a2a', sex: 'f', npc: true, stats: { hp: 80, mp: 90, atk: 10, def: 20, mag: 40, spd: 24 }, bio: '赤子国女王，十年前的英雄之一。' },
  yangtie:  { name: '杨铁', cls: 'knight', lv: 30, hair: '#7a3a12', sex: 'm', npc: true, stats: { hp: 120, mp: 20, atk: 50, def: 36, mag: 10, spd: 26 }, bio: '迦纳帝国国王，十年前的英雄之一，如今性情大变。' },
  kaidi:    { name: '韩凯蒂', cls: 'knight', lv: 20, hair: '#f0a040', sex: 'f', npc: true, stats: { hp: 70, mp: 10, atk: 36, def: 30, mag: 5, spd: 22 }, bio: '奥里国的女骑士。' },
};

// ===================================================================
// 作品设定
// ===================================================================
Object.assign(CAMPAIGNS.g2, {
  soon: false, tag: '多路线 · 四位女主角',
  rules: { ap: true, facing: true, height: true, freeClass: true },
  titleHeroes: ['eva', 'qingfeng', 'furong', 'qiuyue'],
  classPool: ['swordsman', 'knight', 'fighter', 'samurai', 'archer', 'priest', 'mage', 'sorcerer', 'gushi'],
  shopBase: ['herb', 'antidote', 'magicHerb', 'broadSword', 'spear', 'shortBow', 'shortStaff', 'battleAxe', 'longBlade', 'silkRobe', 'leather', 'roundShield'],
});
CAMPAIGN_STAGES.g2 = CAMPAIGN_STAGES.g2 || [];

// ===================================================================
// 结局：依同调石的下落与女主角好感度
// ===================================================================
CAMPAIGN_ENDINGS.g2 = {
  resolve(S) {
    const f = S.flags || {}, r = S.rel || {}, left = S.left || {};
    if (f.gemLost && f.furongSaved) return 'furong';
    if (f.marryYilinna) return 'yilinna';
    const cand = ['eva', 'qiuyue', 'yilinna'].filter(id => !left[id] && S.roster[id]).sort((a, b) => (r[b] || 0) - (r[a] || 0));
    const top = cand[0];
    if (top && (r[top] || 0) >= 70) return top;
    return 'single';
  },
  prelude: [
    ['旁白', '复仇魔神倒下的那一刻，笼罩雷夫大陆的阴霾终于散去。'],
    ['无双', '清风……你做到了。十年前的英雄们，若是看到今天，也会为你骄傲。', 'wushuang'],
  ],
  endings: {
    eva: { title: '白骑士的誓言', lines: [
      ['伊娃', '女王陛下交代的任务，我总算完成了。……接下来，我想为自己守护一个人。', 'eva'],
      ['彦清风', '伊娃，以后换我守护你吧。', 'qingfeng'],
      ['旁白', '赤子王城的庆功宴上，近卫队长第一次卸下了铠甲。'],
    ], epilogue: [['qingfeng', '辅佐无双女王重建赤子国，被称为“新时代的英雄”。'], ['eva', '辞去近卫队长一职，与清风在王城外的小镇定居。']] },
    qiuyue: { title: '魔神大帝之后', lines: [
      ['秋月', '剑道的尽头是什么，我已经不想知道了。……我只想知道，你会不会一直在我身边。', 'qiuyue'],
      ['彦清风', '只要你不嫌我剑法差，我就一直陪你练下去。', 'qingfeng'],
    ], epilogue: [['qiuyue', '与清风一同云游四方，留下许多行侠仗义的传说。'], ['qingfeng', '在秋月的指点下，剑法终于有了名家风范。']] },
    yilinna: { title: '奥里的王夫', lines: [
      ['依琳娜', '奥里的子民需要一位英雄，而我……需要你。', 'yilinna'],
      ['旁白', '奥里国举行了盛大的婚礼，雷夫与奥里自此结为兄弟之邦。'],
    ], epilogue: [['yilinna', '成为奥里女王，以仁政治国。'], ['qingfeng', '成为奥里王夫，往来于两国之间，维系和平。']] },
    furong: { title: '仙与魔', lines: [
      ['芙蓉', '我的复仇……原来只是一场空。谢谢你，把我从魔神的手里拉了回来。', 'furong'],
      ['彦清风', '不管你过去是谁，现在的你，是我们的伙伴。', 'qingfeng'],
      ['旁白', '褪去魔气的芙蓉，从此不知所踪。只是每逢月圆，清风总会在窗前发现一朵芙蓉花。'],
    ], epilogue: [['furong', '隐居山林，以幻术为孩子们演出美丽的戏法。'], ['qingfeng', '终身未娶，四处寻找芙蓉的踪迹。']] },
    single: { title: '英雄的旅途', lines: [
      ['彦清风', '十年前的英雄们，用他们的方式守护了这片大陆。现在，轮到我们了。', 'qingfeng'],
      ['旁白', '清风婉拒了所有的封赏，背起行囊，再度踏上了冒险的旅途。'],
    ], epilogue: [['qingfeng', '继续以冒险者的身份游历大陆，成为吟游诗人传唱的英雄。']] },
  },
};
