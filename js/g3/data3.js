// 超时空英雄传说 2 外传：北方密使 —— 新职业、招式、道具、英雄、结局与作品设定
// 依原作资料整理（复仇魔神之后：迦纳改行共和，南方领动向可疑；白志超与娜塔莉亚两条主线），对白为重新撰写
'use strict';

// ===================================================================
// 招式（新增）
// ===================================================================
Object.assign(SPELLS, {
  // 剑手（白志超）
  snowSword:   { name: '雪山飞剑', school: '剑', mp: 14, power: 24, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'ice', desc: '漫天飞雪般的剑影，波及周围' },
  ninesky:     { name: '九天剑法', school: '剑', mp: 22, power: 32, range: [1, 3], area: 2, kind: 'phys', sure: true, style: 'rain', fx: 'slash', desc: '剑气自九天而降，覆盖一大片区域' },
  baxie:       { name: '霸邪剑法', school: '剑', mp: 30, power: 52, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 20, style: 'charge', fx: 'dark', desc: '霸邪剑谱记载的终极剑术，贯穿一列' },
  spiritBlade: { name: '灵剑',     school: '魔', mp: 16, power: 26, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'holy', desc: '以灵力凝成剑雨' },
  // 魔法骑士（飞霜）
  roseLance:   { name: '玫瑰突刺', school: '枪', mp: 8,  power: 14, range: [1, 2], kind: 'phys', sure: true, crit: 15, style: 'thrust', fx: 'holy', desc: '如玫瑰绽放的连续突刺' },
  valkyrie:    { name: '战神之枪', school: '枪', mp: 20, power: 32, range: [1, 3], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '女战神的雷霆冲锋，贯穿一列' },
  // 连弩手（娜塔莉亚）
  flickArrow:  { name: '甩手箭',   school: '弓', mp: 4,  power: 7,  range: [1, 2], kind: 'phys', sure: true, crit: 20, style: 'arrow', fx: 'slash', desc: '奚族的贴身快箭，射程 1-2' },
  xiVolley:    { name: '奚族连弩', school: '弓', mp: 14, power: 18, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'volley', fx: 'slash', desc: '连弩齐发，贯穿一列' },
  darkArrow:   { name: '暗精灵之箭', school: '弓', mp: 16, power: 26, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'dark', desc: '带着诅咒的黑箭' },
  // 通灵使（苏）
  divination:  { name: '卜筮',     school: '圣', mp: 6,  range: [0, 3], kind: 'buff', stat: 'skill', amount: 25, turns: 3, fx: 'buff', desc: '占卜吉凶，命中与暴击大增' },
  spiritCall:  { name: '灵魂呼唤', school: '圣', mp: 12, power: 22, range: [1, 4], area: 1, kind: 'magic', vsDark: 2, fx: 'holy', desc: '召唤先祖之灵冲击敌人，对黑暗系加倍' },
  callDragon:  { name: '唤术「龙」', school: '唤', mp: 36, power: 48, range: [1, 5], area: 2, kind: 'magic', fx: 'fire', desc: '唤出古龙之魂，烈焰覆盖一大片区域' },
  callBeast:   { name: '唤术「兽」', school: '唤', mp: 18, range: [1, 1], kind: 'summon', unit: 'silverWolf', turns: 3, fx: 'summon', desc: '唤出草原银狼助战 3 回合' },
  // 武师（岚）
  shadowStep:  { name: '如行化影', school: '拳', mp: 6,  range: [0, 0], kind: 'buff', stat: 'mov', amount: 2, turns: 3, fx: 'buff', desc: '身形化影，3 回合内移动力 +2' },
  // 小孩（宝儿）
  cheer:       { name: '加油',     school: '圣', mp: 3,  range: [1, 2], kind: 'buff', stat: 'atk', amount: 5, turns: 3, fx: 'buff', desc: '宝儿的打气，3 回合内攻击 +5' },
  babyGod:     { name: '宝儿神之怒', school: '圣', mp: 30, power: 50, range: [1, 5], area: 2, kind: 'magic', fx: 'holy', desc: '传说中的宝儿神显灵' },
  // 贵族公主（奥帕儿）
  inspire:     { name: '鼓舞',     school: '圣', mp: 8,  range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 4, turns: 3, fx: 'buff', desc: '公主的号召，攻击、防御、魔力 +4' },
  // 隐藏职业
  tideSlash:   { name: '潮斩',     school: '技', mp: 8,  power: 18, range: [1, 2], kind: 'phys', sure: true, style: 'dash', fx: 'ice', desc: '鱼人的快斩' },
  bloodBite:   { name: '吸血',     school: '技', mp: 8,  power: 18, range: [1, 1], kind: 'phys', sure: true, style: 'blade', fx: 'dark', desc: '吸取敌人的鲜血' },
  charm:       { name: '魅惑',     school: '幻', mp: 10, range: [1, 3], kind: 'status', status: 'freeze', turns: 2, chance: 65, fx: 'dark', desc: '女妖的魅惑，令敌人无法行动' },
  juggle:      { name: '丑角戏法', school: '技', mp: 10, power: 16, range: [1, 4], area: 1, kind: 'magic', fx: 'fire', desc: '抛出会爆炸的彩球' },
  // 合击（需关系值）
  youwu:       { name: '有无相生', school: '双', mp: 30, power: 60, range: [1, 6], area: 3, kind: 'pair', sure: true, partner: 'qiuyue', rel: 60, fx: 'slash', desc: '刑天与秋月心意相通的合击，剑气笼罩整个战场' },
  northStar:   { name: '北斗交辉', school: '双', mp: 18, power: 46, range: [1, 4], line: true, kind: 'pair', sure: true, partner: 'natalia', rel: 70, fx: 'holy', desc: '白志超与娜塔莉亚的剑弩合击，贯穿一列' },
  northStarN:  { name: '北斗交辉', school: '双', mp: 18, power: 46, range: [1, 4], line: true, kind: 'pair', sure: true, partner: 'bai', rel: 70, fx: 'holy', desc: '娜塔莉亚与白志超的弩剑合击，贯穿一列' },
  // 敌方
  techLaser:   { name: '震旦光炮', school: '技', mp: 10, power: 26, range: [1, 4], line: true, kind: 'magic', fx: 'bolt', desc: '' },
  crebCurse:   { name: '圣地诅咒', school: '技', mp: 18, power: 40, range: [1, 5], area: 2, kind: 'magic', fx: 'dark', desc: '' },
});
Object.assign(SCHOOL_NAME, { 唤: '唤术' });

// -------------------------------------------------------------------
// 职业专属招式（c3_）：每个职业系各有自己的招式名与特色，不再借用法师法术
// -------------------------------------------------------------------
Object.assign(SPELLS, {
  // 剑手系（剑宗之道）：疾快的身法剑，招招必中
  c3_swallowSword: { name: '飞燕剑',   school: '剑', mp: 4,  power: 5,  range: [1, 2], kind: 'phys', sure: true, style: 'dash', fx: 'slash', desc: '身如飞燕掠过，射程 1-2，必中' },
  c3_startleSword: { name: '惊鸿剑',   school: '剑', mp: 8,  power: 6,  range: [1, 1], kind: 'phys', sure: true, status: 'noCounter', turns: 2, style: 'blade', fx: 'wind', desc: '剑光一闪如惊鸿，令敌人惊愕而无法反击' },
  c3_longWind:     { name: '长风剑气', school: '剑', mp: 7,  power: 10, range: [1, 3], kind: 'phys', sure: true, style: 'thrust', fx: 'wind', desc: '剑气随长风远送，射程 1-3，必中' },
  c3_cleaveMount:  { name: '劈山剑',   school: '剑', mp: 12, power: 18, range: [1, 2], kind: 'phys', sure: true, crit: 10, style: 'sweep', fx: 'rock', desc: '一剑劈山，力道沉重' },
  c3_swordWhirl:   { name: '回风剑阵', school: '剑', mp: 16, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'rain', fx: 'wind', desc: '剑影回旋成阵，绞碎目标与周围的敌人' },
  c3_kingSword:    { name: '霸王破天剑', school: '剑', mp: 34, power: 50, range: [1, 3], area: 1, kind: 'phys', sure: true, crit: 10, style: 'charge', fx: 'fire', desc: '霸王剑士的极意，一剑破天，波及周围' },
  // 剑手系 B（灵剑之道）：魔法剑士、灵剑使的魔剑技，以剑为媒介释放魔力
  c3_flameMagicSword: { name: '炎魔剑', school: '魔', mp: 7,  power: 14, range: [1, 1], kind: 'phys', sure: true, style: 'blade', fx: 'fire', desc: '魔力化作炎魔缠上剑身，一剑焚斩' },
  c3_iceMagicSlash:   { name: '冰魔斩', school: '魔', mp: 12, power: 20, range: [1, 2], area: 1, kind: 'phys', sure: true, style: 'sweep', fx: 'ice', desc: '冰魔附剑横斩，寒气冻裂目标与周围' },
  c3_boltMagicThrust: { name: '雷魔突', school: '魔', mp: 26, power: 40, range: [1, 4], line: true, kind: 'phys', sure: true, style: 'charge', fx: 'bolt', desc: '剑缠雷魔化作一道电光突进，贯穿一列' },
  c3_starfallSword:   { name: '魔剑·星落', school: '魔', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', style: 'rain', fx: 'holy', desc: '灵剑指天引落星辰，以剑为媒介的魔力轰击一大片区域' },
  // 魔法骑士系：魔枪技（枪尖凝聚魔力）
  c3_silverThrust: { name: '银枪突刺', school: '枪', mp: 4,  power: 6,  range: [1, 2], kind: 'phys', sure: true, style: 'thrust', fx: 'slash', desc: '骑士的银枪直刺，射程 1-2，必中' },
  c3_flameLance:   { name: '炎枪',     school: '枪', mp: 4,  power: 10, range: [1, 3], kind: 'magic', style: 'thrust', fx: 'fire', desc: '枪尖燃起魔炎射出，以魔力伤敌' },
  c3_frostLance:   { name: '霜华枪',   school: '枪', mp: 5,  power: 12, range: [1, 4], kind: 'magic', style: 'pierce', fx: 'ice', desc: '挥枪掷出冰晶枪影，射程 1-4' },
  c3_thunderLance: { name: '雷霆枪阵', school: '枪', mp: 10, power: 16, range: [1, 4], area: 1, kind: 'magic', style: 'rain', fx: 'bolt', desc: '长枪指天引雷，落向目标与周围' },
  c3_roseHeal:     { name: '玫瑰之愈', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '玫瑰骑士的治愈之誓，回复少许生命' },
  c3_valkyrieStorm:{ name: '女武神·雷枪', school: '枪', mp: 34, power: 40, range: [1, 4], area: 2, kind: 'magic', style: 'rain', fx: 'bolt', desc: '女战神掷出的雷枪化作万道雷光，覆盖一大片区域' },
  // 杀手系：暗杀术与随身的疗伤药
  c3_snakeFang:   { name: '蛇吻刺',   school: '忍', mp: 6,  power: 10, range: [1, 1], kind: 'phys', sure: true, status: 'poison', turns: 3, chance: 75, style: 'blade', fx: 'acid', desc: '淬了蛇毒的短刃，令敌人中毒' },
  c3_salve:       { name: '疗伤膏',   school: '忍', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '杀手随身的秘制伤药，回复少许生命' },
  c3_flyingKnife: { name: '袖里飞刀', school: '忍', mp: 4,  power: 9,  range: [2, 3], kind: 'phys', sure: true, crit: 10, style: 'feathers', fx: 'slash', desc: '袖中飞刀破空，射程 2-3' },
  c3_blindPowder: { name: '迷目粉',   school: '忍', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 65, fx: 'acid', desc: '撒出迷目粉，令一片敌人失明' },
  c3_crimsonPierce:{ name: '绯影穿刺', school: '忍', mp: 12, power: 26, range: [1, 3], line: true, kind: 'phys', sure: true, crit: 30, style: 'dash', fx: 'dark', desc: '绯红的身影穿过敌阵，贯穿一列' },
  c3_healMist:    { name: '疗伤雾',   school: '忍', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '撒出药雾，一次回复多人生命' },
  c3_bladeLotus:  { name: '刃之莲华', school: '忍', mp: 22, power: 34, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, crit: 20, style: 'spin', fx: 'slash', desc: '刀刃绽放如莲，斩向身边所有敌人' },
  // 连弩手系（骑弓之道）：奚族连弩
  c3_boltSnipe:   { name: '弩机狙击', school: '弓', mp: 4,  power: 5,  range: [2, 4], kind: 'phys', sure: true, crit: 15, style: 'arrow', fx: 'slash', desc: '架稳弩机瞄准要害，射程 2-4，必中' },
  c3_twinBolt:    { name: '双矢连弩', school: '弓', mp: 6,  power: 12, range: [2, 3], kind: 'phys', sure: true, style: 'arrow2', fx: 'slash', desc: '连弩机括一扣两矢' },
  c3_locustBolts: { name: '飞蝗弩雨', school: '弓', mp: 12, power: 14, range: [2, 5], area: 1, kind: 'phys', sure: true, style: 'volley', fx: 'wind', desc: '弩矢如飞蝗蔽空，覆盖一片区域' },
  c3_armorBreaker:{ name: '破甲重矢', school: '弓', mp: 9,  power: 15, range: [1, 5], line: true, kind: 'phys', sure: true, style: 'pierce', fx: 'rock', desc: '沉重的破甲矢贯穿一列，路径上不论敌我' },
  c3_steppeEye:   { name: '草原之眼', school: '弓', mp: 6,  range: [0, 0], kind: 'buff', stat: 'skill', amount: 30, turns: 3, fx: 'buff', desc: '草原射手的锐眼，自身命中与暴击大增' },
  c3_myriadBolts: { name: '奚族·万矢', school: '弓', mp: 24, power: 30, range: [2, 5], area: 2, kind: 'phys', sure: true, style: 'volley', fx: 'slash', desc: '奚族连弩的极意，万矢齐落覆盖一大片区域' },
  // 连弩手系 B（黑精灵之道）：魔弓技
  c3_shadowShaft: { name: '暗矢',     school: '弓', mp: 5,  power: 12, range: [1, 4], kind: 'magic', style: 'arrow', fx: 'dark', desc: '以魔力凝成黑暗之矢射出' },
  c3_hexShaft:    { name: '咒缚矢',   school: '弓', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', style: 'pierce', fx: 'dark', desc: '缠着诅咒的魔矢贯穿一列，路径上不论敌我' },
  c3_darkMeteor:  { name: '魔弓·暗流星', school: '弓', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', style: 'volley', fx: 'dark', desc: '射向天空的魔矢化作黑色流星坠落，覆盖一大片区域' },
  // 通灵使系：灵疗与唤术
  c3_spiritMend:  { name: '灵疗',     school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '借先祖之灵抚平伤痛，回复少许生命' },
  c3_ancestorWard:{ name: '祖灵庇佑', school: '圣', mp: 10, range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 3, turns: 3, fx: 'buff', desc: '祖灵守护友军，攻击、防御、魔力 +3' },
  c3_purifySoul:  { name: '净魂',     school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '洗净附身的邪气，医疗石化以外的各种状态' },
  c3_spiritCircle:{ name: '灵疗之环', school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '众灵围成光环，一次回复多人生命' },
  c3_callWind:    { name: '唤术「风」', school: '唤', mp: 14, range: [1, 1], kind: 'summon', unit: 'spiritWind', turns: 3, fx: 'summon', desc: '唤出草原的风灵助战 3 回合' },
  c3_soulSpring:  { name: '万灵回春', school: '圣', mp: 24, power: 50, range: [0, 3], area: 2, kind: 'heal', fx: 'heal', desc: '万灵齐降，大范围回复生命' },
  c3_callHeaven:  { name: '唤术「天」', school: '唤', mp: 26, range: [1, 1], kind: 'summon', unit: 'angel', turns: 3, fx: 'summon', desc: '唤下天界的使者助战 3 回合' },
  // 通灵使系 B（邪灵之道）：邪灵妖术
  c3_wraithBite:  { name: '怨灵噬',   school: '暗', mp: 18, power: 28, range: [1, 4], kind: 'magic', fx: 'dark', desc: '放出怨灵啃噬敌人，造成重伤' },
  c3_soulBind:    { name: '摄魂咒',   school: '暗', mp: 16, range: [1, 4], area: 1, kind: 'status', status: 'silence', turns: 3, chance: 70, fx: 'dark', desc: '邪灵缠身，令一片敌人无法施法' },
  c3_ghostParade: { name: '百鬼夜行', school: '暗', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '召来百鬼横行，覆盖一大片区域' },
  c3_soulSnatch:  { name: '夺魂',     school: '暗', mp: 20, range: [1, 4], kind: 'death', chance: 40, fx: 'dark', desc: '邪灵夺走敌人的魂魄（对首领无效）' },
  // 小孩（宝儿）
  c3_owieAway:    { name: '痛痛飞走', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '「痛痛飞走了～」回复少许生命' },
  c3_flowerCrown: { name: '花冠祝福', school: '圣', mp: 10, range: [0, 3], area: 1, kind: 'buff', stat: 'bless', amount: 3, turns: 3, fx: 'buff', desc: '送上亲手编的花冠，攻击、防御、魔力 +3' },
  c3_blowBlow:    { name: '呼呼就好', school: '圣', mp: 6,  range: [0, 3], kind: 'cure', cures: ['poison', 'freeze', 'blind', 'silence', 'noCounter'], fx: 'heal', desc: '吹一吹就好了，医疗石化以外的各种状态' },
  c3_lunchBox:    { name: '分享便当', school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '和大家分着吃便当，一次回复多人生命' },
  // 贵族公主（奥帕儿）：王家的恩典
  c3_royalGrace:  { name: '王家恩泽', school: '圣', mp: 4,  power: 20, range: [0, 3], kind: 'heal', fx: 'heal', desc: '公主的恩典，回复少许生命' },
  c3_crownRay:    { name: '王冠之辉', school: '圣', mp: 6,  power: 12, range: [1, 4], kind: 'magic', vsDark: 2, style: 'thrust', fx: 'holy', desc: '细剑上的王冠纹章放出圣辉，对魔族与黑暗系双倍伤害' },
  c3_courtHymn:   { name: '宫廷圣歌', school: '圣', mp: 10, power: 24, range: [0, 3], area: 1, kind: 'heal', fx: 'heal', desc: '咏唱王宫的圣歌，一次回复多人生命' },
  c3_royalMajesty:{ name: '王威圣光', school: '圣', mp: 14, power: 14, range: [0, 0], area: 2, around: true, kind: 'magic', fx: 'holy', vsDark: 2, desc: '公主的威仪化作圣光，周围两格的敌人受伤（对魔族、黑暗系双倍）' },
  c3_princessMiracle: { name: '公主的奇迹', school: '圣', mp: 12, power: 60, range: [0, 3], kind: 'heal', fx: 'heal', desc: '真诚的祈愿引来奇迹，回复大部分生命' },
  // 武师系（岚）：如影随形的拳脚
  c3_tigerPalm:   { name: '猛虎掌',   school: '拳', mp: 4,  power: 12, range: [1, 1], kind: 'phys', sure: true, style: 'claw', fx: 'wind', desc: '如猛虎扑击的一掌，必中' },
  c3_breathing:   { name: '调息归元', school: '拳', mp: 5,  power: 30, range: [0, 0], kind: 'heal', fx: 'heal', desc: '调匀内息，回复自身生命' },
  c3_shadowFists: { name: '化影连拳', school: '拳', mp: 10, power: 20, range: [1, 1], kind: 'phys', sure: true, crit: 20, style: 'claw', fx: 'dark', desc: '身形化影，拳影连打' },
  c3_dragonGale:  { name: '龙吟掌风', school: '拳', mp: 14, power: 22, range: [1, 1], cone: 3, kind: 'phys', sure: true, style: 'wave', fx: 'wind', desc: '掌风如龙吟，扇形扫过前方三排' },
  c3_phantomFist: { name: '无影神拳', school: '拳', mp: 22, power: 44, range: [1, 1], kind: 'phys', sure: true, crit: 10, style: 'claw', fx: 'rock', desc: '拳圣的绝招，快得看不见的一拳' },
  // 蛮人系（穆尔）：蛮力与咆哮
  c3_skullSmash:  { name: '碎颅击',   school: '斧', mp: 4,  power: 8,  range: [1, 1], kind: 'phys', style: 'axe', fx: 'rock', desc: '不顾一切的蛮力重击，威力大但可能落空' },
  c3_wildHowl:    { name: '蛮荒咆哮', school: '斧', mp: 7,  range: [0, 0], area: 1, around: true, kind: 'debuff', stat: 'atk', amount: -5, turns: 3, style: 'roar', fx: 'rock', desc: '野兽般的咆哮，身边敌人攻击 -5' },
  c3_bloodRage:   { name: '血怒',     school: '斧', mp: 6,  range: [0, 0], kind: 'buff', stat: 'atk', amount: 7, turns: 3, fx: 'fire', desc: '鲜血点燃怒火，自身攻击 +7' },
  c3_wildSpin:    { name: '蛮牛旋风', school: '斧', mp: 8,  power: 12, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'wind', desc: '抡起兵器狂转，攻击身边所有敌人' },
  c3_tyrantCleave:{ name: '霸王断岳', school: '斧', mp: 16, power: 30, range: [1, 1], kind: 'phys', sure: true, crit: 10, style: 'axe', fx: 'rock', desc: '霸王的一击足以断开山岳' },
  c3_titanStomp:  { name: '蛮神践踏', school: '斧', mp: 26, power: 38, range: [0, 0], area: 2, around: true, kind: 'phys', sure: true, groundOnly: true, style: 'roar', fx: 'rock', desc: '蛮神附身重重一踏，伤及周围两格的地面敌人' },
  // 隐藏职业：鱼人
  c3_waterJet:    { name: '水枪',     school: '水', mp: 5,  power: 12, range: [1, 4], kind: 'magic', style: 'thrust', fx: 'ice', desc: '从口中喷出高压水柱' },
  c3_riptide:     { name: '激流冲',   school: '水', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', style: 'charge', fx: 'ice', desc: '乘着激流冲过一列，路径上不论敌我' },
  c3_tsunami:     { name: '大海啸',   school: '水', mp: 36, power: 42, range: [1, 4], area: 2, kind: 'magic', fx: 'ice', desc: '唤来海啸吞没一大片区域' },
  // 隐藏职业：吸血鬼
  c3_batSwarm:    { name: '蝙蝠群',   school: '暗', mp: 5,  power: 12, range: [1, 4], kind: 'magic', style: 'feathers', fx: 'dark', desc: '放出吸血蝙蝠扑咬敌人' },
  c3_bloodMist:   { name: '血雾',     school: '暗', mp: 18, power: 30, range: [1, 4], line: true, kind: 'magic', fx: 'dark', desc: '化身血雾穿过一列，路径上不论敌我' },
  c3_bloodMoon:   { name: '血月之夜', school: '暗', mp: 32, power: 40, range: [1, 4], area: 2, kind: 'magic', fx: 'dark', desc: '血月升起，黑夜吞没一大片区域' },
  // 隐藏职业：女妖
  c3_shriekWing:  { name: '尖啸之翼', school: '翼', mp: 10, power: 14, range: [0, 0], area: 1, around: true, kind: 'phys', sure: true, style: 'spin', fx: 'dark', desc: '一边尖啸一边振翅，攻击身边所有敌人' },
  c3_sirenSong:   { name: '摄魂之歌', school: '幻', mp: 14, range: [1, 4], kind: 'status', status: 'freeze', turns: 2, chance: 70, fx: 'dark', desc: '女妖的歌声令敌人失神无法行动' },
  c3_quillRain:   { name: '妖羽乱舞', school: '翼', mp: 12, power: 15, range: [1, 3], area: 1, kind: 'phys', sure: true, style: 'feathers', fx: 'dark', desc: '抖落带着妖气的羽刃' },
  c3_phantomVeil: { name: '妖影幻纱', school: '幻', mp: 22, power: 34, range: [1, 4], area: 1, kind: 'magic', style: 'wave', fx: 'dark', desc: '虚实难辨的妖影罩住一片敌人' },
  // 隐藏职业：小丑
  c3_laughGas:    { name: '笑气弹',   school: '技', mp: 9,  range: [1, 3], area: 1, kind: 'status', status: 'silence', turns: 2, chance: 65, fx: 'acid', desc: '笑得停不下来，令一片敌人无法施法' },
  c3_magicFlash:  { name: '魔术闪光', school: '技', mp: 10, range: [1, 5], area: 1, kind: 'status', status: 'blind', turns: 1, chance: 75, fx: 'holy', desc: '帽子里蹦出的强光令敌人暂时失明' },
  c3_knifeCircus: { name: '飞刀马戏', school: '技', mp: 22, power: 32, range: [1, 3], area: 1, kind: 'phys', sure: true, crit: 20, style: 'feathers', fx: 'slash', desc: '抛出满天飞刀，落向目标与周围' },
});

// ===================================================================
// 职业（新增）
// passive：特殊能力 —— combo 连击 · drain 吸取 · poisonHit 毒击 · pierce 灵击 · search 搜索（看见隐藏宝物）· unlock 开锁（打开上锁宝箱）
// needItem：隐藏职业，转职时消耗该道具
// ===================================================================
Object.assign(CLASSES, {
  swordHand: { line: '剑手系', type: '剑士', weapon: ['sword'], sprite: 'swordHand', sex: 'm',
    tiers: [TIER('剑手', 1, 5), TIER('剑客', 8, 6), TIER('剑宗', 16, 6), TIER('霸王剑士', 24, 6)],
    base: { hp: 28, mp: 8, atk: 11, def: 7, mag: 3, spd: 9 }, growth: { hp: 3.3, mp: 0.9, atk: 1.8, def: 1.2, mag: 0.5, spd: 1.4 },
    promo: { hp: 5, mp: 2, atk: 3, def: 1, mag: 0, spd: 2 },
    skills: [[1, 'c3_swallowSword'], [3, 'c3_startleSword'], [6, 'c3_longWind'], [10, 'c3_cleaveMount'], [14, 'c3_swordWhirl'], [18, 'snowSword'], [24, 'ninesky'], [30, 'c3_kingSword']],
    aLabel: '剑宗之道', aDesc: '纯粹的剑术之路，终成霸王剑士', aFocus: '攻击 · 剑术',
    alt: { at: 2, sprite: 'swordHand_b', label: '灵剑之道', desc: '以魔力驭剑，成为魔法剑士、灵剑使', focus: '魔力 · 剑魔双修',
      tiers: [TIER('魔法剑士', 16, 6), TIER('灵剑使', 24, 7)],
      growth: { hp: 3.0, mp: 1.8, atk: 1.6, def: 1.1, mag: 1.3, spd: 1.4 }, promo: { hp: 4, mp: 5, atk: 2, def: 1, mag: 3, spd: 1 },
      skills: [[16, 'c3_flameMagicSword'], [16, 'c3_iceMagicSlash'], [19, 'spiritBlade'], [24, 'c3_boltMagicThrust'], [28, 'c3_starfallSword']] } },
  magicKnight: { line: '魔法骑士系', type: '骑兵', weapon: ['lance', 'sword'], sprite: 'magicKnight', sex: 'f',
    tiers: [TIER('魔法骑士', 1, 6, 'horse'), TIER('玫瑰骑士', 9, 6, 'horse'), TIER('女战神', 18, 7, 'horse')],
    base: { hp: 24, mp: 12, atk: 9, def: 7, mag: 7, spd: 8 }, growth: { hp: 3.0, mp: 1.6, atk: 1.5, def: 1.3, mag: 1.2, spd: 1.1 },
    promo: { hp: 6, mp: 4, atk: 2, def: 2, mag: 2, spd: 1 },
    skills: [[1, 'c3_silverThrust'], [2, 'c3_flameLance'], [5, 'c3_frostLance'], [8, 'roseLance'], [12, 'c3_thunderLance'], [15, 'c3_roseHeal'], [18, 'valkyrie'], [24, 'c3_valkyrieStorm']] },
  killer: { line: '杀手系', type: '武士', weapon: ['blade', 'sword'], sprite: 'killer', sex: 'f', passive: ['search', 'unlock'],
    tiers: [TIER('杀手', 1, 6), TIER('皇家杀手', 9, 7), TIER('飞贼', 18, 7)],
    base: { hp: 22, mp: 10, atk: 9, def: 5, mag: 5, spd: 11 }, growth: { hp: 2.6, mp: 1.3, atk: 1.6, def: 0.9, mag: 0.9, spd: 1.6 },
    promo: { hp: 4, mp: 3, atk: 2, def: 1, mag: 1, spd: 2 },
    skills: [[1, 'c3_snakeFang'], [2, 'c3_salve'], [5, 'c3_flyingKnife'], [9, 'c3_blindPowder'], [13, 'c3_crimsonPierce'], [17, 'c3_healMist'], [21, 'c3_bladeLotus']] },
  crossbowman: { line: '连弩手系', type: '弓箭手', weapon: ['bow'], sprite: 'crossbowman', sex: 'f', passive: ['combo'],
    tiers: [TIER('连弩手', 1, 5, 'foot', [1, 3]), TIER('射手', 9, 5, 'foot', [1, 4]), TIER('骑弓手', 18, 7, 'horse', [1, 4])],
    base: { hp: 21, mp: 6, atk: 10, def: 4, mag: 3, spd: 10 }, growth: { hp: 2.6, mp: 0.8, atk: 1.7, def: 0.8, mag: 0.6, spd: 1.5 },
    promo: { hp: 4, mp: 2, atk: 3, def: 1, mag: 1, spd: 2 },
    skills: [[1, 'flickArrow'], [3, 'c3_boltSnipe'], [6, 'c3_twinBolt'], [10, 'c3_locustBolts'], [13, 'xiVolley'], [17, 'c3_armorBreaker'], [22, 'c3_steppeEye'], [27, 'c3_myriadBolts']],
    aLabel: '骑弓之道', aDesc: '草原骑射，成为骑弓手', aFocus: '机动 · 连射',
    alt: { at: 2, sprite: 'crossbowman_b', label: '黑精灵之道', desc: '借助诅咒之力的暗之射手', focus: '魔力 · 范围',
      tiers: [TIER('黑精灵', 18, 6, 'foot', [1, 5])],
      growth: { hp: 2.5, mp: 1.8, atk: 1.6, def: 0.8, mag: 1.4, spd: 1.4 }, promo: { hp: 3, mp: 5, atk: 2, def: 1, mag: 3, spd: 1 },
      skills: [[18, 'c3_shadowShaft'], [20, 'darkArrow'], [24, 'c3_hexShaft'], [28, 'c3_darkMeteor']] } },
  medium: { line: '通灵使系', type: '牧师', weapon: ['staff'], sprite: 'medium', sex: 'f',
    tiers: [TIER('通灵使', 1, 5), TIER('灵术师', 9, 5), TIER('召唤师', 18, 5)],
    base: { hp: 19, mp: 18, atk: 4, def: 4, mag: 9, spd: 7 }, growth: { hp: 2.3, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.7, spd: 1.1 },
    promo: { hp: 4, mp: 7, atk: 0, def: 1, mag: 3, spd: 1 },
    skills: [[1, 'c3_spiritMend'], [1, 'spiritCall'], [3, 'divination'], [6, 'callBeast'], [9, 'c3_ancestorWard'], [12, 'c3_purifySoul'], [15, 'c3_spiritCircle'], [18, 'c3_callWind'], [22, 'c3_soulSpring'], [26, 'c3_callHeaven']],
    aLabel: '召唤之道', aDesc: '与灵兽和天使立约的召唤师', aFocus: '回复 · 召唤',
    alt: { at: 2, sprite: 'medium_b', label: '邪灵之道', desc: '与邪灵交易的邪灵使，精通妖术', focus: '魔力 · 妖术',
      tiers: [TIER('邪灵使', 18, 5)],
      growth: { hp: 2.4, mp: 2.4, atk: 0.5, def: 0.8, mag: 1.9, spd: 1.1 }, promo: { hp: 3, mp: 7, atk: 0, def: 1, mag: 4, spd: 1 },
      skills: [[18, 'c3_wraithBite'], [20, 'c3_soulBind'], [24, 'c3_ghostParade'], [28, 'c3_soulSnatch']] } },
  child: { line: '小孩', type: '村民', weapon: ['staff'], sprite: 'child', sex: 'f',
    tiers: [TIER('小孩', 1, 5), TIER('宝儿神', 30, 7, 'fly', [1, 2])],
    base: { hp: 16, mp: 12, atk: 4, def: 3, mag: 6, spd: 9 }, growth: { hp: 2.2, mp: 1.8, atk: 0.6, def: 0.7, mag: 1.3, spd: 1.3 },
    promo: { hp: 40, mp: 30, atk: 12, def: 12, mag: 15, spd: 8 },
    skills: [[1, 'cheer'], [3, 'c3_owieAway'], [8, 'c3_flowerCrown'], [14, 'c3_blowBlow'], [20, 'c3_lunchBox'], [30, 'babyGod']] },
  princess: { line: '贵族公主', type: '牧师', weapon: ['sword', 'staff'], sprite: 'princess', sex: 'f',
    tiers: [TIER('贵族公主', 1, 5)],
    base: { hp: 22, mp: 16, atk: 7, def: 5, mag: 8, spd: 8 }, growth: { hp: 2.8, mp: 2.0, atk: 1.0, def: 1.0, mag: 1.4, spd: 1.2 },
    skills: [[1, 'c3_royalGrace'], [1, 'inspire'], [5, 'c3_crownRay'], [10, 'c3_courtHymn'], [15, 'c3_royalMajesty'], [20, 'c3_princessMiracle']] },
  martial: { line: '武师系', type: '战士', weapon: ['claw'], sprite: 'martial', sex: 'm',
    tiers: [TIER('武师', 1, 6), TIER('武道家', 9, 6), TIER('拳圣', 18, 7)],
    base: { hp: 27, mp: 8, atk: 10, def: 6, mag: 3, spd: 10 }, growth: { hp: 3.2, mp: 1.0, atk: 1.7, def: 1.1, mag: 0.5, spd: 1.5 },
    promo: { hp: 5, mp: 2, atk: 2, def: 2, mag: 0, spd: 2 },
    skills: [[1, 'c3_tigerPalm'], [3, 'shadowStep'], [6, 'c3_breathing'], [10, 'c3_shadowFists'], [15, 'c3_dragonGale'], [22, 'c3_phantomFist']] },
  barbarian: { line: '蛮人系', type: '战士', weapon: ['axe', 'sword'], sprite: 'barbarian', sex: 'm',
    tiers: [TIER('蛮人', 1, 5), TIER('狂战士', 9, 5), TIER('霸王', 18, 6)],
    base: { hp: 32, mp: 4, atk: 12, def: 6, mag: 1, spd: 7 }, growth: { hp: 3.8, mp: 0.5, atk: 1.9, def: 1.1, mag: 0.2, spd: 1.1 },
    promo: { hp: 7, mp: 1, atk: 3, def: 1, mag: 0, spd: 1 },
    skills: [[1, 'c3_skullSmash'], [4, 'c3_wildHowl'], [8, 'c3_bloodRage'], [12, 'c3_wildSpin'], [18, 'c3_tyrantCleave'], [25, 'c3_titanStomp']] },
  // 隐藏职业（职业所内需持有对应道具）
  fishman: { line: '鱼人', type: '剑士', weapon: ['sword', 'lance'], sprite: 'fishman', needItem: 'morphPill', passive: ['combo'],
    tiers: [TIER('鱼人', 1, 6)],
    base: { hp: 30, mp: 12, atk: 12, def: 8, mag: 6, spd: 10 }, growth: { hp: 3.4, mp: 1.4, atk: 1.8, def: 1.3, mag: 0.9, spd: 1.4 },
    skills: [[1, 'tideSlash'], [4, 'c3_waterJet'], [10, 'c3_riptide'], [18, 'c3_tsunami']] },
  vampire: { line: '吸血鬼', type: '黑暗系', weapon: ['sword', 'claw'], sprite: 'vampire', sex: 'm', needItem: 'bloodCoffin', passive: ['drain'],
    tiers: [TIER('吸血鬼', 1, 6, 'fly')],
    base: { hp: 28, mp: 16, atk: 11, def: 7, mag: 9, spd: 10 }, growth: { hp: 3.2, mp: 1.8, atk: 1.7, def: 1.1, mag: 1.4, spd: 1.3 },
    skills: [[1, 'bloodBite'], [4, 'c3_batSwarm'], [10, 'c3_bloodMist'], [18, 'c3_bloodMoon']] },
  harpy: { line: '女妖', type: '鹰族', weapon: ['claw', 'staff'], sprite: 'harpy', sex: 'f', needItem: 'featherRobe', passive: ['drain'],
    tiers: [TIER('女妖', 1, 7, 'fly')],
    base: { hp: 24, mp: 18, atk: 9, def: 6, mag: 11, spd: 12 }, growth: { hp: 2.8, mp: 2.0, atk: 1.3, def: 1.0, mag: 1.6, spd: 1.5 },
    skills: [[1, 'charm'], [3, 'c3_shriekWing'], [8, 'c3_sirenSong'], [14, 'c3_quillRain'], [20, 'c3_phantomVeil']] },
  jester: { line: '小丑', type: '武士', weapon: ['blade', 'claw'], sprite: 'jester', needItem: 'jesterMask', passive: ['pierce'],
    tiers: [TIER('小丑', 1, 6)],
    base: { hp: 24, mp: 12, atk: 10, def: 5, mag: 7, spd: 12 }, growth: { hp: 2.8, mp: 1.4, atk: 1.6, def: 0.9, mag: 1.1, spd: 1.6 },
    skills: [[1, 'juggle'], [4, 'c3_laughGas'], [9, 'c3_magicFlash'], [15, 'c3_knifeCircus']] },
  // 敌方专用
  skeleton: { line: '骷髅兵', type: '黑暗系', weapon: null, sprite: 'skeleton', tiers: [TIER('骷髅兵', 1, 5)],
    base: { hp: 22, mp: 0, atk: 10, def: 6, mag: 0, spd: 6 }, growth: { hp: 2.8, mp: 0, atk: 1.6, def: 1.1, mag: 0, spd: 0.9 }, skills: [] },
  bat: { line: '蝙蝠', type: '兽类', weapon: null, sprite: 'bat', tiers: [TIER('吸血蝙蝠', 1, 7, 'fly')],
    base: { hp: 16, mp: 0, atk: 8, def: 3, mag: 0, spd: 12 }, growth: { hp: 2.0, mp: 0, atk: 1.3, def: 0.6, mag: 0, spd: 1.5 }, skills: [[1, 'bite']], passive: ['drain'] },
  mecha: { line: '重装机甲', type: '巨怪', weapon: null, sprite: 'mecha', tiers: [TIER('重装机甲', 1, 4, 'foot', [1, 3])],
    base: { hp: 44, mp: 20, atk: 14, def: 16, mag: 6, spd: 4 }, growth: { hp: 4.2, mp: 1.0, atk: 1.8, def: 1.8, mag: 0.6, spd: 0.6 }, skills: [[1, 'techLaser']] },
  techWarrior: { line: '高科技战士', type: '武士', weapon: null, sprite: 'robot', tiers: [TIER('高科技战士', 1, 6, 'foot', [1, 2])],
    base: { hp: 28, mp: 10, atk: 12, def: 9, mag: 4, spd: 10 }, growth: { hp: 3.0, mp: 0.8, atk: 1.7, def: 1.3, mag: 0.4, spd: 1.3 }, skills: [[1, 'laser']] },
  creb: { line: '克雷布特里', type: '黑暗系', weapon: null, sprite: 'creb', tiers: [TIER('克雷布特里', 1, 5, 'foot', [1, 3])],
    base: { hp: 56, mp: 90, atk: 13, def: 12, mag: 17, spd: 10 }, growth: { hp: 4.2, mp: 2.4, atk: 1.4, def: 1.3, mag: 1.9, spd: 1.0 },
    skills: [[1, 'crebCurse'], [1, 'curseWind'], [1, 'silence'], [1, 'devour'], [1, 'sumSkeleton']] },
});

// ===================================================================
// 道具（新增）
// ===================================================================
Object.assign(ITEMS, {
  scimitar:     { name: '弯刀',     type: 'weapon', kind: 'sword', atk: 7, crit: 5, price: 300 },
  roseRapier:   { name: '玫瑰细剑', type: 'weapon', kind: 'sword', atk: 10, crit: 8, price: 760 },
  tianqing:     { name: '古剑-天清', type: 'weapon', kind: 'sword', atk: 24, mag: 4, crit: 8, price: 0, desc: '与「地宁」成对的古剑' },
  handXbow:     { name: '手弩',     type: 'weapon', kind: 'bow', atk: 6, price: 260 },
  repeatXbow:   { name: '奚族连弩', type: 'weapon', kind: 'bow', atk: 11, crit: 5, price: 900 },
  spiritBell:   { name: '通灵铃杖', type: 'weapon', kind: 'staff', atk: 3, mag: 7, price: 640 },
  ironKnuckle:  { name: '铁拳套',   type: 'weapon', kind: 'claw', atk: 7, price: 320 },
  desertCloak:  { name: '沙漠斗篷', type: 'armor', def: 5, spd: 1, price: 380 },
  xiLeather:    { name: '奚族皮甲', type: 'armor', def: 7, price: 600 },
  xiCharm:      { name: '奚族护符', type: 'acc', mag: 3, def: 2, price: 0 },
  starPendant:  { name: '北斗坠饰', type: 'acc', crit: 6, mov: 1, price: 0 },
  baxieManual:  { name: '霸邪剑谱', type: 'book', learn: 'baxie', who: ['剑士'], price: 0, desc: '记载终极剑术「霸邪剑法」的剑谱（剑士类可学）' },
  dragonPact:   { name: '龙之契约', type: 'key', price: 0, desc: '飞龙谷的古龙认可的证明' },
  rope:         { name: '绳索',     type: 'key', price: 0, desc: '结实的长绳，也许能下到某个洞穴里' },
  battlePlan:   { name: '军事计划书', type: 'key', price: 0, desc: '南方领的秘密军事计划' },
  morphPill:    { name: '变身丸',   type: 'key', price: 0, desc: '吃下会变成鱼人？可在转职所转为隐藏职业「鱼人」' },
  bloodCoffin:  { name: '充血的棺材', type: 'key', price: 0, desc: '可在转职所转为隐藏职业「吸血鬼」（男性）' },
  featherRobe:  { name: '诱惑的羽衣', type: 'key', price: 0, desc: '可在转职所转为隐藏职业「女妖」（女性）' },
  jesterMask:   { name: '丑角的面具', type: 'key', price: 0, desc: '可在转职所转为隐藏职业「小丑」' },
  ruby:         { name: '红宝石',   type: 'key', price: 1600, desc: '可以高价卖出' },
});

// ===================================================================
// 英雄（北方密使）
// ===================================================================
CAMPAIGN_HEROES.g3 = {
  // —— 男主线（白志超）——
  bai:      { name: '白志超', cls: 'swordHand', lv: 1, hair: '#2a2430', lord: true, sex: 'm', weapon: 'ironSword', pool: ['swordHand', 'swordsman', 'knight', 'samurai', 'martial', 'barbarian'],
    stats: { hp: 34, mp: 6, atk: 13, def: 8, mag: 3, spd: 10 }, bio: '迦纳共和国的剑师，被选为南巡密使，潜入南方领首府亚修斯调查。外表冷静，其实比谁都热心。',
    skills: [[8, 'northStar']] },
  feishuang:{ name: '飞霜', cls: 'magicKnight', lv: 2, hair: '#a8c8f0', sex: 'f', weapon: 'spear', lines: ['magicKnight'],
    stats: { hp: 28, mp: 14, atk: 10, def: 8, mag: 8, spd: 9 }, bio: '迦纳的魔法骑士，奉命保护南巡使。一板一眼，最受不了白志超的擅自行动。' },
  nanxun:   { name: '南巡使', cls: 'knight', lv: 6, hair: '#5a5a6a', sex: 'm', weapon: 'silverLance',
    stats: { hp: 40, mp: 4, atk: 14, def: 12, mag: 4, spd: 9 }, bio: '迦纳议会派往南方领的巡察官，表面上是公开访问，暗中掩护密使们的行动。' },
  aiwen:    { name: '艾文', cls: 'samurai', lv: 3, hair: '#2a2a2a', sex: 'm', weapon: 'longBlade', lines: ['samurai'],
    stats: { hp: 34, mp: 4, atk: 12, def: 8, mag: 2, spd: 10 }, bio: '被称为「拦路虎」的浪人，只劫贪官的车队。被白志超打败后，嚷着要「监视」他而同行。' },
  judy:     { name: '茱迪', cls: 'archer', lv: 4, hair: '#c04a2a', sex: 'f', weapon: 'longBow', lines: ['archer'],
    stats: { hp: 28, mp: 4, atk: 12, def: 5, mag: 2, spd: 12 }, bio: '镜湖城的神箭手，前代英雄之一。听说南方有异动，决定亲自看看。' },
  luosha:   { name: '罗莎莉', cls: 'killer', lv: 4, hair: '#8a1a3a', sex: 'f', weapon: 'longBlade', lines: ['killer'],
    stats: { hp: 26, mp: 12, atk: 11, def: 5, mag: 6, spd: 13 }, bio: '受雇刺杀南巡使的杀手，失手后反被白志超放过。眼光锐利，什么暗藏的东西都瞒不过她。' },
  xingtian: { name: '刑天', cls: 'swordMad', lv: 8, hair: '#1a1a24', sex: 'm', weapon: 'steelSword', lines: ['swordMad'],
    stats: { hp: 44, mp: 12, atk: 18, def: 11, mag: 4, spd: 14 }, bio: '前迦纳四天王、剑气无双的剑客。复仇魔神之战后与秋月一同云游，路过南方领。',
    skills: [[1, 'youwu']] },
  qiuyue:   { name: '秋月', cls: 'windSword', lv: 8, hair: '#d8d0f0', sex: 'f', weapon: 'steelSword', lines: ['windSword'],
    stats: { hp: 40, mp: 12, atk: 17, def: 9, mag: 6, spd: 17 }, bio: '御风剑法的传人，刑天的恋人。嘴上冷淡，却总替刑天收拾烂摊子。' },
  aopaer:   { name: '奥帕儿', cls: 'princess', lv: 10, hair: '#f0c860', sex: 'f', weapon: 'shortStaff', lines: ['princess'], pool: [],
    stats: { hp: 34, mp: 26, atk: 9, def: 8, mag: 14, spd: 12 }, bio: '南方领的贵族千金，人称「沙漠明珠」。主张与迦纳、奚族议和，却被父亲那派人视为叛徒。' },
  lan:      { name: '岚', cls: 'martial', lv: 18, hair: '#3a4a3a', sex: 'm', weapon: 'ironKnuckle', lines: ['martial'],
    stats: { hp: 58, mp: 14, atk: 26, def: 16, mag: 6, spd: 24 }, bio: '流浪的武师，为寻访剑术的极致而来。话很少，出拳很快。' },
  // —— 女主线（娜塔莉亚）——
  natalia:  { name: '娜塔莉亚', cls: 'crossbowman', lv: 1, hair: '#8a3a1a', lord: true, sex: 'f', weapon: 'handXbow', pool: ['crossbowman', 'archer', 'killer', 'magicKnight', 'medium', 'prayer'],
    stats: { hp: 26, mp: 6, atk: 12, def: 5, mag: 4, spd: 12 }, bio: '奚族小队的队长，连弩百发百中。性子急，护短，最讨厌南方领的官兵。',
    skills: [[8, 'northStarN']] },
  su:       { name: '苏', cls: 'medium', lv: 1, hair: '#e8e0c8', sex: 'f', weapon: 'shortStaff', lines: ['medium'],
    stats: { hp: 20, mp: 22, atk: 4, def: 4, mag: 11, spd: 8 }, bio: '奚族的通灵使，治病、祈福、卜筮样样都会。温和沉静，是小队的定心丸。' },
  muer:     { name: '穆尔', cls: 'barbarian', lv: 2, hair: '#6a3a1a', sex: 'm', weapon: 'battleAxe', lines: ['barbarian'],
    stats: { hp: 36, mp: 2, atk: 13, def: 6, mag: 0, spd: 7 }, bio: '奚族的年轻战士，冲动好斗，凡事都想「先闹大再说」。' },
  taipu:    { name: '泰普', cls: 'archer', lv: 2, hair: '#4a3a2a', sex: 'm', weapon: 'shortBow',
    stats: { hp: 26, mp: 4, atk: 11, def: 5, mag: 2, spd: 11 }, bio: '奚族的猎人，心思细密，总能想出最稳当的办法。' },
  daixi:    { name: '戴西', cls: 'killer', lv: 6, hair: '#d87a3a', sex: 'f', weapon: 'longBlade',
    stats: { hp: 30, mp: 10, atk: 13, def: 6, mag: 5, spd: 15 }, bio: '奚族部落的斥候，身手敏捷。和泰普一起照顾孤儿宝儿。' },
  gusitafu: { name: '古斯塔夫', cls: 'fighter', lv: 7, hair: '#a87a3a', sex: 'm', weapon: 'battleAxe',
    stats: { hp: 46, mp: 2, atk: 16, def: 10, mag: 0, spd: 9 }, bio: '鳍鳞部五年前的竞技冠军，前「第一勇士」。因伤退隐，如今在采石场做苦工。' },
  baoer:    { name: '宝儿', cls: 'child', lv: 8, hair: '#f0a8c0', sex: 'f', weapon: 'shortStaff', lines: ['child'],
    stats: { hp: 22, mp: 18, atk: 5, def: 4, mag: 9, spd: 12 }, bio: '在亚修斯街头流浪的奚族孤儿，天真得让人心疼。传说一直当个小孩会变成「宝儿神」？' },
  // —— 剧情人物（只用于对白头像，或以 hero: 出场）——
  dazhanglao:{ name: '大长老', cls: 'sorcerer', lv: 16, hair: '#e8e8e0', sex: 'm', npc: true, stats: { hp: 50, mp: 60, atk: 8, def: 12, mag: 26, spd: 12 }, bio: '奚族的大长老，法力高强，却很爱和年轻人抢功劳。' },
  kelite:   { name: '柯莉特', cls: 'magicKnight', lv: 18, hair: '#2a1a3a', sex: 'f', npc: true, stats: { hp: 60, mp: 30, atk: 26, def: 20, mag: 20, spd: 20 }, bio: '南方领的女将，手段狠辣。' },
  beiluo:   { name: '贝洛', cls: 'knight', lv: 24, hair: '#7a6a5a', sex: 'm', npc: true, stats: { hp: 80, mp: 10, atk: 34, def: 28, mag: 6, spd: 18 }, bio: '南方领的军方首脑，主战派的核心。' },
  lingzhu:  { name: '南方领主', cls: 'king', lv: 20, hair: '#c8c0b0', sex: 'm', npc: true, stats: { hp: 60, mp: 30, atk: 20, def: 20, mag: 18, spd: 12 }, bio: '亚修斯的领主，奥帕儿的父亲。' },
  crebtree: { name: '克雷布特里', cls: 'creb', lv: 32, hair: '#4a1a5a', sex: 'm', npc: true, stats: { hp: 120, mp: 120, atk: 24, def: 26, mag: 40, spd: 22 }, bio: '在南方领与奚族之间挑起战火的幕后黑手。' },
};

// ===================================================================
// 作品设定
// ===================================================================
Object.assign(CAMPAIGNS.g3, {
  soon: false, tag: '男女双主线',
  rules: { ap: true, facing: { side: 1.25, back: 1.5 }, height: 0.15, freeClass: true },
  relLabel: '关系值',
  titleHeroes: ['natalia', 'bai', 'su', 'feishuang'],
  // 新游戏：选择主角（男主线 / 女主线），两线在「力量与魔法」交会
  starts: [
    { to: 'g3_01', label: '白志超篇', sub: '迦纳剑师 · 剑手', desc: '潜入南方领首府亚修斯的北方密使。关卡较难，队友多为剑士与骑士。', set: { route: 'male' }, hero: 'bai', auto: true },
    { to: 'g3_70', label: '娜塔莉亚篇', sub: '奚族队长 · 连弩手', desc: '调查被南方领占领的奚族采石场。难度较低，适合先玩。', set: { route: 'female' }, hero: 'natalia' },
  ],
  lord: S => (S.flags || {}).route === 'female' ? 'natalia' : 'bai',
  classPool: ['swordsman', 'knight', 'fighter', 'samurai', 'archer', 'priest', 'mage', 'sorcerer', 'swordHand', 'magicKnight', 'killer', 'crossbowman', 'medium', 'martial', 'barbarian', 'windSword', 'prayer', 'illusionist', 'fishman', 'vampire', 'harpy', 'jester'],
  shopBase: ['herb', 'antidote', 'magicHerb', 'ironSword', 'scimitar', 'spear', 'shortBow', 'handXbow', 'shortStaff', 'battleAxe', 'ironKnuckle', 'longBlade', 'leather', 'desertCloak'],
  helpRules: '<b>移动点数制</b>——攻击或施法后，若还有剩余移动力，可以再移动。<b>方向</b>——从侧面攻击伤害 ×1.25、从背后 ×1.5（依原作）。<b>高低差</b>——每高一层攻击 +15%。<b>自由转职</b>——Lv11 以上可在营地「转职所」改换职业，等级回到 1、能力与招式保留；男女主角各自只能转 6 种职业，奥帕儿无法转职。<b>隐藏职业</b>——持有变身丸、充血的棺材、诱惑的羽衣、丑角的面具时，转职所会出现鱼人、吸血鬼、女妖、小丑。<b>特殊能力</b>——连击（连弩手）、搜索与开锁（杀手：看得见隐藏宝物、打得开上锁的宝箱）、吸取、灵击。<b>关系值</b>——刑天与秋月的关系值 60 以上且相邻时可用合击「有无相生」；白志超与娜塔莉亚互信 70 以上可用「北斗交辉」。',
});
CAMPAIGN_STAGES.g3 = CAMPAIGN_STAGES.g3 || [];

// ===================================================================
// 结局：原作只有一个结局（奥帕儿继任边地行政长官），依关系值与路线有些微不同
// ===================================================================
CAMPAIGN_ENDINGS.g3 = {
  resolve(S) {
    const f = S.flags || {}, r = S.rel || {};
    if ((r.natalia || 0) >= 70 && (r.bai || 0) >= 70) return 'together';
    return f.route === 'female' ? 'xi' : 'envoy';
  },
  prelude: [
    ['旁白', '克雷布特里倒在奚族圣地的祭坛前，那场不知为何而打的战争，终于失去了它的理由。'],
    ['旁白', '南方领的精锐几乎折损殆尽，亚修斯的百姓转而支持议和派。贝洛想要镇压，却发现全军上下只想用他的人头换来和平。'],
    ['if', { has: 'aopaer' }, [['奥帕儿', '父亲……这一次，请让我来收拾残局吧。', 'aopaer']], [['旁白', '议和派的奥帕儿获得多数人的支持，正式继任「边地行政长官」。']]],
  ],
  endings: {
    together: { title: '北斗之下', lines: [
      ['娜塔莉亚', '喂，北方来的。任务结束了，你是不是该回去了？', 'natalia'],
      ['白志超', '报告书我寄回去了。……上面写着，密使白志超在南方失踪。', 'bai'],
      ['娜塔莉亚', '……笨蛋。那就留下来，教我们的孩子们用剑吧。', 'natalia'],
    ], epilogue: [['bai', '以「失踪」为由辞去密使一职，在奚族草原住了下来。'], ['natalia', '成为奚族与南方领之间的和平使者，身边总跟着一个北方剑客。'], ['aopaer', '继任边地行政长官，推动南方领与奚族、迦纳三方的通商。']] },
    envoy: { title: '北方密使', lines: [
      ['白志超', '亚修斯的阴谋已经揭穿，南方领也换了新的主人。我的任务，到此为止。', 'bai'],
      ['飞霜', '这次回去，议会应该会给你勋章吧。……虽然你从头到尾都在违抗命令。', 'feishuang'],
      ['白志超', '勋章就免了。我只是不想看到又一场不知为何而打的仗。', 'bai'],
    ], epilogue: [['bai', '回到迦纳后婉拒了所有封赏，继续以剑师的身份守护共和国。'], ['feishuang', '升任迦纳魔法骑士团团长，偶尔还会抱怨白志超的擅自行动。'], ['aopaer', '继任边地行政长官，南方领与迦纳重修旧好。']] },
    xi: { title: '奚族的守护者', lines: [
      ['娜塔莉亚', '采石场夺回来了，圣地也清静了。大家……可以回家了。', 'natalia'],
      ['苏', '先祖的灵告诉我，草原会有很长、很长的一段好日子。', 'su'],
      ['娜塔莉亚', '那就好。不过要是南方领再敢来，我的连弩随时奉陪！', 'natalia'],
    ], epilogue: [['natalia', '被族人推举为奚族最年轻的族长。'], ['su', '成为奚族的大巫医，据说连大长老都要让她三分。'], ['aopaer', '继任边地行政长官，与奚族订下百年和约。']] },
  },
};
