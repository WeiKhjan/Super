// 超时空英雄传说 · 移动重制版 —— 首领战机制
//   · 阶段转换：生命降到门槛时进入新阶段（横幅 + 台词 + 增援 / 能力暴涨 / 光环 / 危险地形 / 新招式）
//   · 蓄力大招：首领先「蓄力」并以红色预警格标出范围，下一个首领回合才发动；
//     玩家可以躲出范围，或在发动前造成足够伤害 / 施加禁锢来「破招」（破招槽）
//   · 首领血条：地图上方显示首领名称、阶段宝石、生命与破招槽
// 对外只提供 bossAI / bossCheckpoint / bossTileRisk / bossDrawGround / bossDrawTop 与调试用的 BOSS
// battle.js 里的挂钩全部以 typeof 检查，本档缺席时游戏照常运作；测试时可设 window.BOSS_OFF = true 关闭
'use strict';
(function () {
  // =====================================================================
  // 首领表：键 = 作品:关卡（一代用关卡编号，其余用关卡 id）:首领名称
  //   phases[]：依序触发。at = 生命比例门槛；form = 只在该职业（变身前/后）时判定；transform = 沿用 battle.js 的变身机制
  //     say 台词（第三栏为立绘 id；我方角色的台词只有该角色在场时才会出现）
  //     buff {atk, def, mag, mov}：整场有效的能力暴涨；heal：回复比例；learn：新招式；ai：改变行动方式
  //     summon [[职业, 等级(0=首领-2), dx, dy, opts]]（相对首领位置）
  //     aura {kind:'burn'|'regen', v, r}：每个首领回合灼伤周围的敌人 / 自我再生
  //     hazard {n, kind:'fire'|'dark'|'water'|'ice', dmg}：在首领周围生成危险地形（每个首领回合造成伤害）
  //     sigNow：立刻可以再蓄力
  //   sigs[]：蓄力大招。from = 第几阶段起可用（0 起算，取可用者中最新的一招）
  //     shape: 'area'（以目标格为中心，半径 r）| 'line'（直线贯穿 len 格）| 'cone'（扇形 depth 格）| 'around'（自身周围 r 格）
  //     kind 'magic' | 'phys'，power 威力，fx 元素，brk 破招门槛（最大生命的比例），cd 发动后的冷却（首领回合数）
  //     status / chance / turns：附带异常状态
  // =====================================================================
  const SAY = (who, text, pid) => [who, text, pid];
  const BOSSES = {
    // ------------------------------- 一代 -------------------------------
    'g1:5:三头湖怪': {
      sigs: [{ name: '湖啸吐息', shape: 'cone', depth: 3, kind: 'magic', power: 9, fx: 'ice', brk: 0.28, cd: 2 }],
      phases: [
        { at: 0.5, name: '三首狂怒', say: [SAY('三头湖怪', '咕噜噜……嘎啊啊啊——！！', 'enemy:hydra'), SAY('史莱德', '三个头一起发狂了！别挤在它面前，小心吐息！', 'slade')], buff: { atk: 2 }, sigNow: true },
      ],
    },
    'g1:17:火神巫': {
      sigs: [{ name: '火燄山崩', shape: 'area', r: 1, range: [1, 4], kind: 'magic', power: 18, fx: 'fire', brk: 0.22, cd: 2 }],
      phases: [
        { at: 0.6, name: '烈焰之躯', say: [SAY('火神巫', '哼，居然能逼我到这一步……火燄山的怒火，烧尽你们吧！', 'enemy:shaman'), SAY('雪儿', '地面在冒火！别站在烧起来的地方！', 'xueer')], hazard: { n: 6, kind: 'fire', dmg: 0.08 }, buff: { mag: 3 } },
        { at: 0.3, name: '焚身', say: [SAY('火神巫', '就算化为灰烬，我也要拉你们陪葬！', 'enemy:shaman')], aura: { kind: 'burn', r: 1, v: 0.07 }, buff: { mag: 3 }, sigNow: true },
      ],
    },
    'g1:19:迦纳大帝': {
      sigs: [
        { name: '天雷诏', shape: 'area', r: 1, range: [2, 5], kind: 'magic', power: 16, fx: 'bolt', brk: 0.22, cd: 2 },
        { name: '霸王斩', from: 2, shape: 'around', r: 2, kind: 'phys', power: 12, fx: 'bolt', brk: 0.2, cd: 2 },
      ],
      phases: [
        { at: 0.6, name: '皇帝之怒', say: [SAY('迦纳大帝', '放肆！朕的帝都，岂容尔等乱臣贼子撒野！禁卫军，护驾！', 'enemy:king')], summon: [['knight', 0, -1, 1, { name: '帝国禁卫' }], ['knight', 0, 1, 1, { name: '帝国禁卫' }]], buff: { def: 3 } },
        { at: 0.3, name: '背水一战', say: [SAY('迦纳大帝', '朕……还没输！就算只剩一口气，朕也要亲手斩了你们！', 'enemy:king'), SAY('杨铁', '他离开王座了！大家散开，别被一刀扫中！', 'yangtie')], buff: { atk: 5 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g1:34:黑暗魔龙': {
      sigs: [{ name: '暗黑龙息', shape: 'cone', depth: 3, kind: 'magic', power: 24, fx: 'dark', brk: 0.18, cd: 2 }],
      phases: [
        { at: 0.6, name: '鳞甲崩裂', say: [SAY('黑暗魔龙', '吼——！！（漆黑的鳞片根根竖起，瘴气从缝隙间喷涌而出）', 'enemy:dragon')], hazard: { n: 7, kind: 'dark', dmg: 0.08 }, buff: { atk: 4 } },
        { at: 0.25, name: '濒死狂暴', say: [SAY('黑暗魔龙', '吼……吼噢噢噢——！！', 'enemy:dragon'), SAY('孟祈', '它要拼命了！一鼓作气解决它！', 'mengqi')], buff: { atk: 4, mov: 1 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g1:35:黑魔神': {
      sigs: [
        { name: '元灵吞噬', shape: 'area', r: 1, range: [1, 5], kind: 'magic', power: 28, fx: 'dark', brk: 0.18, cd: 2 },
        { name: '灭世黑炎', from: 2, shape: 'area', r: 2, range: [1, 4], kind: 'magic', power: 32, fx: 'dark', brk: 0.16, cd: 2 },
      ],
      phases: [
        { at: 0.65, name: '元灵共鸣', say: [SAY('黑魔神', '低等的生命……竟敢伤我。元灵们，回应我的召唤！', 'enemy:darkLord')], summon: [['demon', 0, -2, 1, { name: '黑暗生物' }], ['demon', 0, 2, 1, { name: '黑暗生物' }]], aura: { kind: 'regen', v: 0.03 } },
        { at: 0.3, name: '真·黑魔神', say: [SAY('黑魔神', '够了！就让你们亲眼见识——高等生命真正的力量！', 'enemy:darkLord'), SAY('孟祈', '它的气息变了……大家撑住，这是最后关头！', 'mengqi')], buff: { mag: 6, def: 3 }, hazard: { n: 8, kind: 'dark', dmg: 0.1 }, sigNow: true },
      ],
    },
    // ------------------------------- 二代 -------------------------------
    'g2:g2_10:湖底古兽': {
      sigs: [{ name: '深渊冰息', shape: 'cone', depth: 3, kind: 'magic', power: 12, fx: 'ice', brk: 0.25, cd: 2, status: 'freeze', chance: 25, turns: 1 }],
      phases: [
        { at: 0.5, name: '湖底暗涌', say: [SAY('旁白', '湖底传来轰隆巨响，古兽四周的湖水翻起了漩涡。'), SAY('湖底古兽', '咕噜噜噜——嘎啊！！', 'enemy:hydra')], hazard: { n: 6, kind: 'water', dmg: 0.08 }, buff: { atk: 3 }, sigNow: true },
      ],
    },
    'g2:g2_39:白特国王': {
      sigs: [{ name: '王权雷霆', shape: 'area', r: 1, range: [2, 5], kind: 'magic', power: 18, fx: 'bolt', brk: 0.22, cd: 2 }],
      phases: [
        { at: 0.6, name: '重金悬赏', say: [SAY('白特国王', '来人！来人啊！谁护驾有功，赏、赏一千金币！', 'enemy:king')], summon: [['soldier', 0, -1, 1, { name: '白特卫兵' }], ['soldier', 0, 1, 1, { name: '白特卫兵' }]], buff: { def: 3 } },
        { at: 0.3, name: '困兽之斗', say: [SAY('白特国王', '别、别过来！朕……朕跟你们拼了！', 'enemy:king')], buff: { atk: 5, def: 3 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g2:g2_58:黑石': {
      sigs: [{ name: '召魂法阵', shape: 'area', r: 2, range: [1, 4], kind: 'magic', power: 22, fx: 'dark', brk: 0.2, cd: 2 }],
      phases: [
        { at: 0.6, name: '亡魂之阵', say: [SAY('黑石', '哈哈哈！法阵已经转动了——亡魂们，替我撕碎他们！', 'enemy:sorcerer')], summon: [['skeleton', 0, -1, 1, { name: '亡魂' }], ['skeleton', 0, 1, 1, { name: '亡魂' }]], hazard: { n: 6, kind: 'dark', dmg: 0.08 } },
        { at: 0.3, name: '血祭', say: [SAY('黑石', '十年的心血……岂能毁在你们手里！以我的血为祭！', 'enemy:sorcerer')], buff: { mag: 6 }, aura: { kind: 'burn', r: 1, v: 0.07 }, sigNow: true },
      ],
    },
    'g2:g2_67:黑石魂魄': {
      sigs: [{ name: '怨魂冲击', shape: 'line', len: 6, kind: 'magic', power: 24, fx: 'dark', brk: 0.2, cd: 2 }],
      phases: [
        { at: 0.6, name: '城墙苏醒', say: [SAY('黑石魂魄', '每一块石头都是我的骨头……城堡啊，吞掉这些虫子！', 'enemy:demon')], hazard: { n: 8, kind: 'dark', dmg: 0.08 }, buff: { mag: 3 } },
        { at: 0.3, name: '魂魄暴走', say: [SAY('黑石魂魄', '不老、不死……我会永远在这里！你们的魂，也留下来吧！', 'enemy:demon')], aura: { kind: 'regen', v: 0.04 }, buff: { mag: 4 }, sigNow: true },
      ],
    },
    'g2:g2_70a:复仇魔神': {
      sigs: [
        { name: '复仇之焰', shape: 'area', r: 1, range: [1, 5], kind: 'magic', power: 28, fx: 'dark', brk: 0.18, cd: 2 },
        { name: '十年怨恨', from: 2, shape: 'around', r: 2, kind: 'magic', power: 30, fx: 'fire', brk: 0.16, cd: 2 },
      ],
      phases: [
        { at: 0.65, name: '怨念凝聚', say: [SAY('复仇魔神', '十年了……我等这一刻等了整整十年！谁也别想阻止我！', 'enemy:revengeDemon')], summon: [['demon', 0, -2, 1, { name: '复仇之魔' }], ['demon', 0, 2, 1, { name: '复仇之魔' }]] },
        { at: 0.3, name: '魔神解放', say: [SAY('复仇魔神', '我失去的一切……今天要你们全部偿还！', 'enemy:revengeDemon'), SAY('无双', '孩子……你的恨，就让我来承受吧！', 'wushuang')], buff: { mag: 6, mov: 1 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g2:g2_70b:兽化杨铁': {
      sigs: [{ name: '裂地咆哮', shape: 'around', r: 2, kind: 'phys', power: 22, fx: 'rock', brk: 0.18, cd: 2 }],
      phases: [
        { at: 0.6, name: '兽性', say: [SAY('兽化杨铁', '吼……无双……呜……吼噢噢——！！', 'enemy:beastKing')], buff: { atk: 6 } },
        { at: 0.3, name: '最后的理智', say: [SAY('兽化杨铁', '杀……杀了我……趁我……还记得……自己是谁……', 'enemy:beastKing')], buff: { atk: 4, mov: 1 }, ai: 'aggr', sigNow: true },
      ],
    },
    // ----------------------------- 北方密使 -----------------------------
    'g3:g3_07:黑蝎子': {
      sigs: [{ name: '毒蝎冲锋', shape: 'line', len: 5, kind: 'phys', power: 8, fx: 'acid', brk: 0.3, cd: 2, status: 'poison', chance: 60, turns: 2 }],
      phases: [
        { at: 0.5, name: '亡命之徒', say: [SAY('黑蝎子', '兄弟们，一起上！谁砍下一颗脑袋，赏金加倍！', 'enemy:banditRider')], summon: [['bandit', 0, -1, 1, { name: '沙盗' }], ['bandit', 0, 1, 1, { name: '沙盗' }]], buff: { atk: 2 }, sigNow: true },
      ],
    },
    'g3:g3_39:女妖之后': {
      sigs: [{ name: '魅惑之歌', shape: 'around', r: 2, kind: 'magic', power: 18, fx: 'wind', brk: 0.2, cd: 2, status: 'silence', chance: 50, turns: 2 }],
      phases: [
        { at: 0.6, name: '群妖合唱', say: [SAY('女妖之后', '孩子们，唱吧！唱到他们忘记自己的名字！', 'enemy:harpy')], summon: [['harpy', 0, -1, 1, { name: '女妖' }], ['harpy', 0, 1, 1, { name: '女妖' }]] },
        { at: 0.3, name: '凄厉尖啸', say: [SAY('女妖之后', '啊啊啊——！你们这些……弄脏了我歌声的家伙！', 'enemy:harpy')], buff: { mag: 5 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g3:g3_40:古龙': {
      sigs: [{ name: '太古炎息', shape: 'cone', depth: 3, kind: 'magic', power: 24, fx: 'fire', brk: 0.18, cd: 2 }],
      phases: [
        { at: 0.6, name: '龙威', say: [SAY('古龙', '不错。那么，就让我看看你们能否承受龙族真正的怒火。', 'enemy:dragon')], hazard: { n: 6, kind: 'fire', dmg: 0.08 } },
        { at: 0.3, name: '逆鳞', say: [SAY('古龙', '……好久没有人能碰到我的逆鳞了。奚族的孩子们，最后一击，来吧！', 'enemy:dragon')], buff: { atk: 5 }, sigNow: true },
      ],
    },
    'g3:g3_115:小丑王': {
      sigs: [{ name: '死亡飞刀秀', shape: 'around', r: 2, kind: 'phys', power: 16, fx: 'wind', brk: 0.2, cd: 2 }],
      phases: [
        { at: 0.6, name: '压轴表演', say: [SAY('小丑王', '哈哈哈！观众们还满意吗？接下来才是压轴好戏！', 'enemy:jester')], buff: { def: 3 }, sigNow: true },
        { at: 0.3, name: '谢幕', say: [SAY('小丑王', '不笑？为什么不笑！给我笑啊！哈哈……哈哈哈哈！', 'enemy:jester')], buff: { atk: 3 }, ai: 'aggr' },
      ],
    },
    'g3:g3_100:克雷布特里': {
      sigs: [
        { name: '封印崩解', shape: 'area', r: 1, range: [1, 5], kind: 'magic', power: 28, fx: 'dark', brk: 0.18, cd: 2 },
        { name: '圣地黄昏', from: 2, shape: 'area', r: 2, range: [1, 4], kind: 'magic', power: 30, fx: 'dark', brk: 0.16, cd: 2 },
      ],
      phases: [
        { at: 0.65, name: '真面目', say: [SAY('克雷布特里', '呵呵……顾问的戏，我也演腻了。就让你们看看，我真正的模样。', 'enemy:creb')], summon: [['skeleton', 0, -2, 1, { name: '骷髅兵' }], ['skeleton', 0, 2, 1, { name: '骷髅兵' }]], buff: { mag: 4 } },
        { at: 0.3, name: '圣地之力', say: [SAY('克雷布特里', '奚族圣地的力量……现在全都归我了！', 'enemy:creb'), SAY('娜塔莉亚', '他在吸圣地的力量！快，别让他喘息！', 'natalia')], hazard: { n: 8, kind: 'dark', dmg: 0.1 }, aura: { kind: 'regen', v: 0.03 }, sigNow: true },
      ],
    },
    // ----------------------------- 狂神降世 -----------------------------
    'g4:g4_16:柴克利': {
      sigs: [{ name: '大地裂击', shape: 'area', r: 1, range: [1, 3], kind: 'phys', power: 12, fx: 'rock', brk: 0.22, cd: 2 }],
      phases: [
        { at: 0.5, name: '沼泽伏兵', say: [SAY('柴克利', '芦苇丛里的兄弟们，别躲了！给我把肥羊围起来！', 'enemy:tribesman')], summon: [['tribesman', 0, -1, 1, { name: '沼泽蛮兵' }], ['tribesman', 0, 1, 1, { name: '沼泽蛮兵' }]], buff: { atk: 3 }, sigNow: true },
      ],
    },
    'g4:g4_39:海兽利维亚桑': {
      sigs: [{ name: '怒海狂涛', shape: 'area', r: 2, range: [1, 4], kind: 'magic', power: 20, fx: 'ice', brk: 0.2, cd: 2 }],
      phases: [
        { at: 0.6, name: '巨浪', say: [SAY('海兽利维亚桑', '——————！！（海面掀起数丈高的巨浪）', 'enemy:kraken')], hazard: { n: 7, kind: 'water', dmg: 0.08 } },
        { at: 0.3, name: '深海之怒', say: [SAY('海兽利维亚桑', '————！！！（触手疯狂地拍打着浮台）', 'enemy:kraken')], buff: { atk: 5 }, sigNow: true },
      ],
    },
    'g4:g4_74:圣堂骑士长 罗兰德': {
      sigs: [{ name: '圣枪突击', shape: 'line', len: 6, kind: 'phys', power: 20, fx: 'holy', brk: 0.2, cd: 2 }],
      phases: [
        { at: 0.6, name: '誓约', say: [SAY('罗兰德', '圣女大人……就算您恨我，我也要把您从这些人手里夺回来！', 'enemy:halberdier')], buff: { def: 5 } },
        { at: 0.3, name: '殉道', say: [SAY('罗兰德', '我的枪只为守护您而存在。……哪怕要与您为敌！', 'enemy:halberdier')], buff: { atk: 6 }, ai: 'aggr', sigNow: true },
      ],
    },
    'g4:g4_78:欧布坦拿': {
      sigs: [{ name: '异境之门', shape: 'area', r: 2, range: [1, 5], kind: 'magic', power: 24, fx: 'dark', brk: 0.12, cd: 2 }],
      phases: [
        { at: 0.6, name: '血之门扉', say: [SAY('欧布坦拿', '看见了吗？门的另一边，有多少东西正等着来到这个世界！', 'obutana')], summon: [['outsider', 0, -2, 1, { name: '异界魔物' }], ['outsider', 0, 2, 1, { name: '异界魔物' }]] },
        { at: 0.3, name: '狂想', say: [SAY('欧布坦拿', '理想总是被嘲笑为狂想……可我会证明，我是对的！', 'obutana')], hazard: { n: 8, kind: 'dark', dmg: 0.1 }, aura: { kind: 'regen', v: 0.03 }, sigNow: true },
      ],
    },
    'g4:g4_79:狂神': {
      sigs: [
        { name: '暴食之口', shape: 'area', r: 1, range: [1, 4], kind: 'magic', power: 28, fx: 'dark', brk: 0.16, cd: 2 },
        { name: '神罚', from: 2, shape: 'area', r: 2, range: [1, 5], kind: 'magic', power: 30, fx: 'dark', brk: 0.15, cd: 2 },
      ],
      phases: [
        { at: 0.75, form: 'madGod', name: '饥饿', say: [SAY('狂神', '饿……好饿……把你们的血肉……给我……', 'enemy:madGod')], aura: { kind: 'burn', r: 1, v: 0.07 } },
        { transform: true, name: '真身' }, // 沿用 battle.js 的 transform（生命 40% 时化为真身、回满）
        { at: 0.5, form: 'madGod2', name: '万面哀嚎', say: [SAY('狂神·真身', '听见了吗？这些面孔……全都在哭喊着要你们陪葬。', 'enemy:madGod2'), SAY('贝里奇娜', '瞄准胸口的裂痕！别让祂把力量聚起来！', 'beiliqina')], hazard: { n: 8, kind: 'dark', dmg: 0.1 }, sigNow: true },
      ],
    },
    'g4:g4_80:太古神龙·巴哈姆特': {
      sigs: [{ name: '太古灭炎', shape: 'cone', depth: 3, kind: 'magic', power: 30, fx: 'fire', brk: 0.08, cd: 2 }],
      phases: [
        { at: 0.6, name: '龙王觉醒', say: [SAY('巴哈姆特', '……好。那就让你们见识，太古之王的炎息。', 'enemy:dragon')], hazard: { n: 8, kind: 'fire', dmg: 0.08 } },
        { at: 0.3, name: '天地同焚', say: [SAY('巴哈姆特', '站起来吧，人类。让我看看你们的极限！', 'enemy:dragon'), SAY('克荷林', '就是现在！全员，全力攻击！', 'kehelin')], buff: { atk: 5, mag: 5 }, sigNow: true },
      ],
    },
  };

  // =====================================================================
  // 状态
  // =====================================================================
  const off = () => !!window.BOSS_OFF;
  const STATS = { charge: 0, unleash: 0, interrupt: 0, phase: 0, hits: 0, whiff: 0 }; // 测试用统计
  const ST = { B: null, n: -1, list: [], hazards: new Map(), risk: new Map(), riskOk: false, bar: null, barSig: '', barTick: 0 };
  const cfgKey = u => `${typeof CUR_CAMPAIGN !== 'undefined' ? CUR_CAMPAIGN : 'g1'}:${B.def.id || B.def.no}:${u.name}`;
  function sync() {
    if (!B) return;
    if (ST.B !== B) { ST.B = B; ST.n = -1; ST.list = []; ST.hazards = new Map(); ST.riskOk = false; ST.barSig = ''; }
    if (ST.n === B.units.length) return;
    ST.n = B.units.length;
    for (const u of B.units) {
      if (!u.boss || u._bs) continue;
      const cfg = BOSSES[cfgKey(u)] || null;
      u._bs = { u, cfg, ph: 0, cd: 0, charge: null, auras: [], want: false };
      ST.list.push(u._bs);
    }
  }
  const aliveBosses = () => ST.list.filter(s => s.u.hp > 0);
  const foesOf = u => alive().filter(o => hostile(u, o));
  const curSig = s => { const sg = s.cfg && s.cfg.sigs; if (!sg) return null; let best = null; for (const g of sg) if ((g.from || 0) <= s.ph) best = g; return best; };

  // =====================================================================
  // 蓄力大招：选目标、预警、发动、破招
  // =====================================================================
  function sigCells(u, g, tx, ty) {
    if (g.shape === 'around') return areaTiles(u.x, u.y, g.r || 2).filter(c => c.x !== u.x || c.y !== u.y);
    if (g.shape === 'line') return lineTiles(u.x, u.y, tx, ty, g.len || 5);
    if (g.shape === 'cone') return spellCells(u, { cone: g.depth || 3, range: [1, 1] }, tx, ty);
    return areaTiles(tx, ty, g.r || 1);
  }
  function hitWeight(u, o) { return !hostile(u, o) ? 0 : o.summonLeft ? 0.35 : o.lord ? 1.6 : o.team === 'ally' ? 0.8 : 1; }
  function pickTarget(u, g) {
    const foes = foesOf(u);
    if (!foes.length) return null;
    const cands = [];
    if (g.shape === 'around') cands.push({ x: u.x, y: u.y });
    else if (g.shape === 'cone') for (const [dx, dy] of DIRS) { if (inMap(u.x + dx, u.y + dy)) cands.push({ x: u.x + dx, y: u.y + dy }); }
    else if (g.shape === 'line') for (const f of foes) { if (mdist(u.x, u.y, f.x, f.y) <= (g.len || 5)) cands.push({ x: f.x, y: f.y }); }
    else { const [r0, r1] = g.range || [1, 4]; for (const t of tilesInRange(u.x, u.y, r0, r1)) cands.push(t); }
    let best = null;
    for (const c of cands) {
      const cells = sigCells(u, g, c.x, c.y);
      if (!cells.length) continue;
      let s = 0;
      for (const t of cells) { const o = unitAt(t.x, t.y); if (o) s += hitWeight(u, o); }
      if (s > 0 && (!best || s > best.s)) best = { s, tx: c.x, ty: c.y, cells };
    }
    return best && best.s >= (g.min || 1) ? best : null;
  }
  function visSp(g) { // 交给 spellfx.js 的施法动画用的招式描述
    const sp = { name: g.name, kind: 'magic', power: Math.max(28, g.power), fx: g.fx || 'dark', mp: 0, school: '首', desc: g.name };
    if (g.shape === 'line') { sp.line = true; sp.range = [1, g.len || 5]; }
    else if (g.shape === 'cone') { sp.cone = g.depth || 3; sp.range = [1, 1]; }
    else if (g.shape === 'around') { sp.around = true; sp.area = g.r || 2; sp.range = [0, 0]; }
    else { sp.area = g.r || 1; sp.range = g.range || [1, 4]; }
    return sp;
  }
  const thrOf = (u, g) => Math.max(1, Math.round(u.mhp * (g.brk || 0.2)));
  function gaugeOf(s) {
    const c = s.charge; if (!c) return 0;
    const u = s.u;
    if (u.cls !== c.cls) return 1;
    let v = Math.max(0, c.hp0 - u.hp) / c.thr;
    for (const k in u.status) if (u.status[k] > 0 && !c.st0.includes(k)) v += k === 'silence' ? 1 : 0.34;
    const nd = (u.buffs || []).filter(b => b.amount < 0 && !b.bossBreak).length;
    if (nd > c.db0) v += 0.25 * (nd - c.db0);
    return Math.min(1, v);
  }
  async function startCharge(u, s, g, t) {
    s.charge = { g, tx: t.tx, ty: t.ty, cells: t.cells, set: new Set(t.cells.map(c => key(c.x, c.y))), hp0: u.hp, thr: thrOf(u, g), cls: u.cls,
      st0: Object.keys(u.status || {}).filter(k => u.status[k] > 0), db0: (u.buffs || []).filter(b => b.amount < 0).length, t0: performance.now() };
    ST.riskOk = false; STATS.charge++;
    faceTo(u, t.tx, t.ty);
    if (AUTO) return;
    sfx('magic'); sfx('status');
    floatText(u.x, u.y - 0.3, '蓄力！', '#ff6a5a', true);
    if (typeof emit === 'function') emit(24, (u.x + 0.5) * TS, (u.y + 0.5) * TS, { speed: [0, 0], life: [0.5, 0.8], size: [0.04, 0.07], cols: ['#ff4a4a', '#ffd0a0', '#ffffff'], swirl: 8, cx: (u.x + 0.5) * TS, cy: (u.y + 0.5) * TS, jitter: 1.1, shape: 'star' });
    addTrauma(0.25); haptic([20, 30, 20]);
    B.cursor = { x: t.tx, y: t.ty };
    const first = !ST.taught; ST.taught = true;
    await banner(`${u.name}正在蓄力：${g.name}！`, first ? '下回合发动！离开红色区域，或以伤害 / 禁锢打断' : `离开红色区域，或累积 ${s.charge.thr} 点伤害打断它`, 'boss');
  }
  async function interrupt(s) {
    const u = s.u, g = s.charge.g;
    s.charge = null; s.cd = Math.max(1, (g.cd || 2) - 1); ST.riskOk = false; STATS.interrupt++;
    u.buffs = (u.buffs || []).filter(b => !b.bossBreak);
    u.buffs.push({ stat: 'def', amount: -Math.max(2, Math.round(defOf(u) * 0.25)), turns: 2, bossBreak: true });
    if (AUTO) return;
    sfx('crit'); sfx('chest');
    floatText(u.x, u.y - 0.4, '破招！', '#ffe08a', true);
    addTrauma(0.6); haptic([30, 20, 60]);
    if (typeof flash === 'function') flash('#ffe08a', 0.35, 260);
    if (typeof PFX !== 'undefined') PFX.rings.push({ x: (u.x + 0.5) * TS, y: (u.y + 0.5) * TS, r0: 0.2, r1: 1.8, color: '#ffe08a', t0: performance.now(), dur: T(420) });
    await banner('破招成功！', `${u.name}的「${g.name}」被打断了 · 防御下降`, 'player');
  }
  async function unleash(s) {
    const u = s.u, c = s.charge, g = c.g;
    s.charge = null; s.cd = g.cd || 2; ST.riskOk = false; STATS.unleash++;
    const sp = visSp(g);
    const tx = g.shape === 'around' ? u.x : c.tx, ty = g.shape === 'around' ? u.y : c.ty;
    if (!AUTO) {
      B.cursor = null;
      await banner(`${g.name}！`, u.name, 'boss');
      B.castPartner = null;
      floatText(u.x, u.y, g.name, '#ff9a8a', true);
      if (typeof castAnim === 'function') { try { await castAnim(u, sp, 'boss_' + g.name, tx, ty); } catch (e) { console.warn('boss castAnim', e); } }
      else await spellFx(u, sp, tx, ty);
      if (typeof flash === 'function') flash('#ff3a3a', 0.3, 300);
      addTrauma(0.7);
    }
    const targets = c.cells.map(t => unitAt(t.x, t.y)).filter(o => o && o !== u && hostile(u, o) && o.hp > 0);
    STATS.hits += targets.length; if (!targets.length) STATS.whiff++;
    if (!targets.length) { if (!AUTO) { floatText(tx, ty, '落空！', '#aaccff', true); await wait(300); } return; }
    for (const t of targets) {
      if (t.hp <= 0) continue;
      const calc = g.kind === 'phys' ? physCalc(u, t, g.power, true) : magCalc(u, t, { power: g.power });
      let dmg = Math.round(calc.dmg * (0.95 + Math.random() * 0.1) * (OPT.easy ? 0.85 : 1));
      dmg = Math.max(1, Math.min(dmg, Math.round(t.mhp * (g.cap || 0.7))));
      await applyDamage(u, t, dmg, false);
      if (g.status && t.hp > 0 && Math.random() * 100 < (g.chance || 50) && !(g.status === 'poison' && itemStat(t.acc, 'immune'))) {
        t.status[g.status] = (g.turns || 1) + 1;
        floatText(t.x, t.y - 0.3, STATUS_NAME[g.status], STATUS_COLOR[g.status]);
      }
      if (B.over || checkEnd()) break;
    }
    await wait(260);
  }

  // =====================================================================
  // 阶段转换
  // =====================================================================
  async function bossDialog(lines, u) {
    if (!lines || !lines.length || AUTO) return;
    // 首领自己与敌方的台词一定出现；我方角色的台词只有该角色在场时才出现
    const ok = lines.filter(l => !l[2] || String(l[2]).startsWith('enemy:') || (u && l[0] === u.name) || B.units.some(o => o.hp > 0 && o.id === l[2]));
    await dialog(ok);
  }
  function phaseDue(s) {
    const ph = s.cfg && s.cfg.phases && s.cfg.phases[s.ph];
    if (!ph) return null;
    const u = s.u;
    if (ph.transform) return u.transformed ? ph : null;
    if (ph.form && u.cls !== ph.form) return u.transformed ? { skip: true } : null; // 已经变身：变身前形态的阶段直接跳过
    return u.hp > 0 && u.hp <= u.mhp * ph.at ? ph : null;
  }
  function pickHazardTiles(u, n) {
    const out = [], cand = tilesInRange(u.x, u.y, 2, 4).filter(t => costFor('foot', t.x, t.y) < 99 && !ST.hazards.has(key(t.x, t.y)));
    // 优先放在我方单位附近（逼迫走位），其余随机
    const foes = foesOf(u);
    cand.sort((a, b) => (Math.min(...foes.map(f => mdist(f.x, f.y, a.x, a.y)), 9) - Math.min(...foes.map(f => mdist(f.x, f.y, b.x, b.y)), 9)) + (Math.random() - 0.5) * 3);
    for (const t of cand) { if (out.length >= n) break; out.push(t); }
    return out;
  }
  async function enterPhase(s, ph) {
    const u = s.u;
    s.ph++; STATS.phase++;
    ST.riskOk = false;
    const pips = s.cfg.phases.length + 1;
    if (ph.transform) { // 变身由 battle.js 处理（台词、回满），这里只换阶段与取消蓄力
      if (s.charge) s.charge = null;
      if (ph.sigNow) s.cd = 0;
      return;
    }
    if (!AUTO) {
      sfx('boom'); sfx('dark');
      addTrauma(0.8); haptic([50, 30, 90]);
      if (typeof flash === 'function') flash('#ff3040', 0.45, 380);
      const x = (u.x + 0.5) * TS, y = (u.y + 0.5) * TS;
      if (typeof PFX !== 'undefined') { PFX.rings.push({ x, y, r0: 0.3, r1: 2.6, color: '#ff4a4a', t0: performance.now(), dur: T(520) }); PFX.rings.push({ x, y, r0: 0.2, r1: 1.6, color: '#ffe08a', t0: performance.now() + T(120), dur: T(420) }); }
      if (typeof emit === 'function') emit(30, x, y, { speed: [1, 3], life: [0.4, 0.9], size: [0.04, 0.08], cols: ['#ff4a4a', '#ffd070', '#ffffff'], gravity: 1.5, drag: 0.9, shape: artHD() ? 'spark' : 'sq' });
      B.cursor = { x: u.x, y: u.y }; B.focus = u;
      await banner(`${u.name} · ${ph.name}`, `首领进入第 ${s.ph + 1} / ${pips} 阶段！`, 'boss');
    }
    await bossDialog(ph.say, u);
    const fl = [];
    if (ph.buff) for (const k in ph.buff) { u.buffs = u.buffs || []; u.buffs.push({ stat: k, amount: ph.buff[k], turns: 999, bossPhase: true }); fl.push(`${BUFF_NAME[k]}↑`); }
    if (ph.heal) { const v = Math.round(u.mhp * ph.heal); u.hp = Math.min(u.mhp, u.hp + v); fl.push('+' + v); }
    if (ph.learn) { u.learned = (u.learned || []).concat(ph.learn); u.mp = Math.min(u.mmp, u.mp + 20); }
    if (ph.ai) u.ai = ph.ai;
    if (ph.sigNow) s.cd = 0;
    if (ph.aura) s.auras.push(ph.aura);
    if (fl.length) floatText(u.x, u.y - 0.35, fl.join(' '), '#ff9a6a', true);
    if (ph.hazard) {
      for (const t of pickHazardTiles(u, ph.hazard.n || 6)) {
        ST.hazards.set(key(t.x, t.y), { x: t.x, y: t.y, kind: ph.hazard.kind || 'fire', dmg: ph.hazard.dmg || 0.08, owner: u, t0: performance.now() + Math.random() * 300 });
        if (!AUTO) addFx(ph.hazard.kind === 'water' || ph.hazard.kind === 'ice' ? 'ice' : ph.hazard.kind === 'dark' ? 'dark' : 'fire', t.x, t.y, 500);
      }
      if (!AUTO) { sfx(ph.hazard.kind === 'fire' ? 'fire' : 'dark'); toast('地面出现了危险区域——首领回合时站在上面会受到伤害'); }
    }
    for (const sp of ph.summon || []) {
      const [kind, lv, dx, dy, opts] = sp;
      const x = clamp(u.x + dx, 0, B.w - 1), y = clamp(u.y + dy, 0, B.h - 1);
      const m = spawnSpec([kind, lv || Math.max(1, u.lv - 2), x, y, Object.assign({ team: u.team }, opts || {})]);
      B.units.push(m);
      if (!AUTO) addFx('summon', m.x, m.y, 500, { color: '#ff9a9a' });
    }
    if (!AUTO) await wait(300);
  }

  // =====================================================================
  // 挂钩：行动之后（battle.js finishUnit 开头）——阶段转换、破招判定
  // =====================================================================
  async function bossCheckpoint() {
    if (off() || !B || B.over) return;
    sync();
    for (const s of ST.list) {
      if (s.u.hp <= 0 || B.over) continue;
      if (s.charge && s.u.cls !== s.charge.cls) { s.charge = null; ST.riskOk = false; } // 变身打断了蓄力（不算破招）
      if (s.charge && gaugeOf(s) >= 1) await interrupt(s);
      if (s.want && B.phase === s.u.team && s.u.acted) { // 首领本回合行动完毕：在当前位置开始蓄力
        s.want = false;
        const g = curSig(s), t = g && !s.charge && canAct(s.u) && pickTarget(s.u, g);
        if (t) await startCharge(s.u, s, g, t);
      }
      let ph;
      while (s.u.hp > 0 && !B.over && (ph = phaseDue(s))) {
        if (ph.skip) { s.ph++; continue; }
        await enterPhase(s, ph);
      }
    }
  }

  // =====================================================================
  // 挂钩：AI（battle.js aiUnit 开头）——首领的蓄力 / 发动；回传 true 表示本回合已行动
  // =====================================================================
  async function tick(s) { // 首领回合开始：光环与危险地形生效
    const u = s.u;
    for (const a of s.auras) {
      if (a.kind === 'regen' && u.hp < u.mhp) { const v = Math.min(u.mhp - u.hp, Math.max(1, Math.round(u.mhp * a.v))); u.hp += v; floatText(u.x, u.y, '+' + v, '#6aff8a'); if (!AUTO) addFx('heal', u.x, u.y, 400); }
      if (a.kind === 'burn') for (const o of alive()) {
        if (!hostile(u, o) || mdist(u.x, u.y, o.x, o.y) > (a.r || 1)) continue;
        const v = Math.min(o.hp - 1, Math.max(1, Math.round(o.mhp * a.v)));
        if (v > 0) { o.hp -= v; floatText(o.x, o.y, '灼 -' + v, '#ff9a5a'); if (!AUTO) addFx('fire', o.x, o.y, 360); }
      }
    }
    let hit = false;
    for (const h of ST.hazards.values()) {
      if (h.owner !== u) continue;
      const o = unitAt(h.x, h.y);
      if (!o || !hostile(u, o)) continue;
      const v = Math.min(o.hp - 1, Math.max(1, Math.round(o.mhp * h.dmg)));
      if (v > 0) { o.hp -= v; floatText(o.x, o.y, '-' + v, HZ_COL[h.kind][0]); hit = true; if (!AUTO) addFx(h.kind === 'water' || h.kind === 'ice' ? 'ice' : h.kind === 'dark' ? 'dark' : 'fire', o.x, o.y, 360); }
    }
    if ((hit || s.auras.length) && !AUTO) await wait(260);
  }
  async function bossAI(u) {
    if (off() || !u.boss || !B) return false;
    sync();
    const s = u._bs;
    if (!s || !s.cfg) return false;
    s.want = false;
    if (s.charge) {
      if (gaugeOf(s) >= 1) { await interrupt(s); await tick(s); return false; } // 被打断：照常行动
      await tick(s);
      if (u.hp <= 0 || B.over) return true;
      await unleash(s);
      return true;
    }
    await tick(s);
    if (u.hp <= 0 || B.over) return true;
    if (s.cd > 0) { s.cd--; return false; }
    // 冷却好了：先照常行动（移动 / 攻击），行动结束后再于原地开始蓄力（见 bossCheckpoint）
    s.want = !!curSig(s);
    return false;
  }

  // =====================================================================
  // 挂钩：AI 避险（battle.js aiUnit 的 risk）——我方 / 友军避开预警格与危险地形
  // =====================================================================
  function rebuildRisk() {
    ST.risk = new Map(); ST.riskOk = true;
    for (const s of ST.list) {
      if (s.u.hp <= 0 || !s.charge) continue;
      const g = s.charge.g, v = 30 + g.power * 1.2;
      for (const k of s.charge.set) ST.risk.set(k, (ST.risk.get(k) || 0) + v);
    }
    for (const [k, h] of ST.hazards) if (h.owner.hp > 0) ST.risk.set(k, (ST.risk.get(k) || 0) + 3 + h.dmg * 30);
  }
  function bossTileRisk(u, x, y) {
    if (off() || !B || !ST.list.length || u.team === 'enemy' || u.team === 'rogue') return 0;
    if (ST.B !== B) return 0;
    if (!ST.riskOk) rebuildRisk();
    if (!ST.risk.size) return 0;
    const v = ST.risk.get(key(x, y)) || 0;
    return v ? v * (u.lord ? 1.6 : 1) : 0;
  }

  // =====================================================================
  // 绘制
  // =====================================================================
  const HZ_COL = { fire: ['#ff8a3a', '#ff3a10', '#3a0a02'], dark: ['#c070ff', '#6a1ab0', '#12041e'], water: ['#6ad0ff', '#1a6ad8', '#021430'], ice: ['#c8f0ff', '#5ab0e8', '#0a2440'] };
  let TC = null;
  function texCache() {
    const s = Math.max(4, Math.round(TS * DPR));
    if (TC && TC.s === s) return TC;
    TC = { s, hz: {} };
    // 预警格：暗红底 + 斜纹 + 内发光
    const c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(190,8,24,0.42)'; g.fillRect(0, 0, s, s);
    g.save(); g.beginPath(); g.rect(0, 0, s, s); g.clip();
    g.strokeStyle = 'rgba(255,70,70,0.42)'; g.lineWidth = s * 0.1;
    for (let i = -s; i < s * 2; i += s * 0.3) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + s, 0); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.strokeStyle = `rgba(255,60,60,${0.22 * (1 - i / 5)})`; g.lineWidth = s * 0.06 * (i + 1); g.strokeRect(0, 0, s, s); }
    g.restore();
    TC.warn = c;
    // 警示图示：红底金边三角 + 惊叹号
    const ic = document.createElement('canvas'), is = Math.round(s * 0.9); ic.width = ic.height = is;
    const h = ic.getContext('2d');
    const tri = () => { h.beginPath(); h.moveTo(is / 2, is * 0.08); h.lineTo(is * 0.94, is * 0.88); h.lineTo(is * 0.06, is * 0.88); h.closePath(); };
    h.lineJoin = 'round';
    tri(); h.fillStyle = '#1a0206'; h.lineWidth = is * 0.16; h.strokeStyle = '#1a0206'; h.stroke();
    tri(); const lg = h.createLinearGradient(0, 0, 0, is); lg.addColorStop(0, '#ff6a5a'); lg.addColorStop(1, '#b00c1c'); h.fillStyle = lg; h.fill();
    h.lineWidth = is * 0.07; h.strokeStyle = '#ffd86a'; h.stroke();
    h.fillStyle = '#fff6d8'; h.font = `900 ${Math.round(is * 0.5)}px "Arial Black", sans-serif`; h.textAlign = 'center'; h.textBaseline = 'alphabetic';
    h.fillText('!', is / 2, is * 0.8);
    TC.icon = ic;
    return TC;
  }
  function hazardTex(kind) {
    const T0 = texCache();
    if (T0.hz[kind]) return T0.hz[kind];
    const s = T0.s, [a, b, d] = HZ_COL[kind] || HZ_COL.fire;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(s / 2, s / 2, s * 0.05, s / 2, s / 2, s * 0.7);
    rg.addColorStop(0, a); rg.addColorStop(0.45, b); rg.addColorStop(1, d);
    g.globalAlpha = 0.66; g.fillStyle = rg; rrPath(g, s * 0.04, s * 0.04, s * 0.92, s * 0.92, s * 0.22); g.fill();
    g.globalAlpha = 0.9; g.strokeStyle = a; g.lineWidth = Math.max(1, s * 0.04); g.lineCap = 'round';
    // 裂纹 / 漩涡
    let seed = kind.length * 97;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    if (kind === 'water' || kind === 'ice') {
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(s / 2, s / 2, s * (0.14 + i * 0.12), i, i + 4.2); g.stroke(); }
    } else {
      for (let i = 0; i < 5; i++) {
        g.beginPath(); let x = s / 2, y = s / 2; g.moveTo(x, y);
        const ang = i / 5 * Math.PI * 2 + rnd();
        for (let k = 0; k < 3; k++) { x += Math.cos(ang + (rnd() - 0.5)) * s * 0.15; y += Math.sin(ang + (rnd() - 0.5)) * s * 0.15; g.lineTo(x, y); }
        g.stroke();
      }
    }
    return (T0.hz[kind] = c);
  }
  // 地面层（单位之前）：危险地形、预警格、光环
  function bossDrawGround(g, now, ts) {
    if (off() || !B) return;
    sync();
    if (!ST.list.length) return;
    const HD = artHD();
    if (ST.hazards.size) {
      for (const h of ST.hazards.values()) {
        if (h.owner.hp <= 0) continue;
        const p = 0.65 + 0.35 * Math.sin((now - h.t0) / 280 + h.x * 1.3 + h.y * 0.7);
        if (HD) { g.globalAlpha = p; g.drawImage(hazardTex(h.kind), h.x * ts, h.y * ts, ts, ts); }
        else { const col = HZ_COL[h.kind] || HZ_COL.fire; g.globalAlpha = 0.35 + 0.25 * p; g.fillStyle = col[1]; g.fillRect(h.x * ts + 1, h.y * ts + 1, ts - 2, ts - 2); g.globalAlpha = 0.9; g.strokeStyle = col[0]; g.lineWidth = 1; g.strokeRect(h.x * ts + 2.5, h.y * ts + 2.5, ts - 5, ts - 5); }
      }
      g.globalAlpha = 1;
    }
    for (const s of ST.list) {
      const u = s.u;
      if (u.hp <= 0) continue;
      const ux = ((u.px ?? u.x) + 0.5) * ts, uy = ((u.py ?? u.y) + 0.86) * ts;
      for (const a of s.auras) { // 光环：脚下的脉动圈
        const p = (now / 1400) % 1, col = a.kind === 'regen' ? '106,255,138' : '255,120,60';
        const R = a.kind === 'burn' ? (a.r || 1) + 0.5 : 0.8;
        g.strokeStyle = `rgba(${col},${0.55 * (1 - p)})`; g.lineWidth = Math.max(1.5, ts * 0.06);
        g.beginPath(); g.ellipse(ux, uy, ts * R * (0.4 + 0.6 * p), ts * R * 0.42 * (0.4 + 0.6 * p), 0, 0, 7); g.stroke();
      }
      if (!s.charge) continue;
      const pulse = 0.5 + 0.5 * Math.sin(now / 170);
      if (HD) {
        const t = texCache().warn;
        g.globalAlpha = 0.55 + 0.4 * pulse;
        for (const c of s.charge.cells) g.drawImage(t, c.x * ts, c.y * ts, ts, ts);
      } else {
        g.globalAlpha = 0.25 + 0.3 * pulse; g.fillStyle = '#e01020';
        for (const c of s.charge.cells) g.fillRect(c.x * ts, c.y * ts, ts, ts);
      }
      g.globalAlpha = 1;
      // 蓄力中的首领：脚下旋转的红色法阵
      const rot = now / 600;
      g.save(); g.translate(ux, uy); g.scale(1, 0.42);
      g.strokeStyle = `rgba(255,70,70,${0.6 + 0.35 * pulse})`; g.lineWidth = Math.max(2, ts * 0.07);
      g.setLineDash([ts * 0.22, ts * 0.12]); g.lineDashOffset = -rot * ts;
      g.beginPath(); g.arc(0, 0, ts * 0.62, 0, 7); g.stroke();
      g.setLineDash([]); g.strokeStyle = `rgba(255,216,106,${0.5 + 0.4 * pulse})`; g.lineWidth = Math.max(1, ts * 0.035);
      g.beginPath(); g.arc(0, 0, ts * 0.46, rot, rot + 4.4); g.stroke();
      g.restore();
    }
  }
  // 上层（单位之后）：预警外框、图示、破招槽；顺便更新首领血条
  function bossDrawTop(g, now, ts) {
    if (off() || !B) return;
    sync();
    updateBar(now);
    if (!ST.list.length) return;
    const HD = artHD();
    for (const s of ST.list) {
      const u = s.u;
      if (u.hp <= 0 || !s.charge) continue;
      const c = s.charge, pulse = 0.5 + 0.5 * Math.sin(now / 170);
      // 外框：只描范围的外缘
      g.lineCap = 'round';
      const edges = () => {
        g.beginPath();
        for (const t of c.cells) {
          const x0 = t.x * ts, y0 = t.y * ts, x1 = x0 + ts, y1 = y0 + ts;
          if (!c.set.has(key(t.x, t.y - 1))) { g.moveTo(x0, y0); g.lineTo(x1, y0); }
          if (!c.set.has(key(t.x, t.y + 1))) { g.moveTo(x0, y1); g.lineTo(x1, y1); }
          if (!c.set.has(key(t.x - 1, t.y))) { g.moveTo(x0, y0); g.lineTo(x0, y1); }
          if (!c.set.has(key(t.x + 1, t.y))) { g.moveTo(x1, y0); g.lineTo(x1, y1); }
        }
      };
      g.fillStyle = `rgba(255,30,40,${HD ? 0.08 + 0.1 * pulse : 0.1 * pulse})`; // 叠在单位上的淡红，确保站在格子里的单位也看得出危险
      for (const t of c.cells) g.fillRect(t.x * ts, t.y * ts, ts, ts);
      edges();
      if (HD) { g.strokeStyle = `rgba(255,40,40,${0.25 + 0.2 * pulse})`; g.lineWidth = Math.max(3, ts * 0.2); g.stroke(); }
      g.strokeStyle = `rgba(255,${120 + Math.round(100 * pulse)},${100 + Math.round(60 * pulse)},${0.75 + 0.25 * pulse})`; g.lineWidth = Math.max(1.5, ts * 0.06); g.stroke();
      // 警示图示（范围中心，上下浮动）
      const cx = (c.tx + 0.5) * ts, cy = (c.ty + 0.5) * ts - ts * 0.05 * Math.sin(now / 240);
      const sz = ts * (0.5 + 0.07 * pulse);
      if (HD) { g.imageSmoothingEnabled = true; g.drawImage(texCache().icon, cx - sz / 2, cy - sz / 2, sz, sz); g.imageSmoothingEnabled = false; }
      else { g.fillStyle = '#ffe040'; g.font = `bold ${Math.round(ts * 0.6)}px sans-serif`; g.textAlign = 'center'; g.fillText('!', cx, cy + ts * 0.22); g.textAlign = 'left'; }
      // 首领头上的破招槽
      const gv = gaugeOf(s), bw = ts * 0.96, bh = Math.max(3, ts * 0.13);
      const bx = ((u.px ?? u.x) + 0.5) * ts - bw / 2, by = Math.max(1, (u.py ?? u.y) * ts - ts * 0.5);
      g.fillStyle = 'rgba(10,4,12,0.85)'; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      g.fillStyle = '#f2c55a'; g.fillRect(bx, by, bw * gv, bh);
      g.strokeStyle = `rgba(255,80,80,${0.6 + 0.4 * pulse})`; g.lineWidth = 1; g.strokeRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
    }
  }

  // ---------- 首领血条（DOM，样式沿用海军蓝 + 金边） ----------
  const CSS = `
#boss-bar{position:absolute;left:8px;right:8px;top:0;z-index:5;pointer-events:none;padding:3px 8px 4px;border:2px solid var(--trim,#d9b45a);border-radius:10px;
 background:linear-gradient(180deg,rgba(28,52,104,.95) 0%,rgba(17,36,76,.95) 46%,rgba(11,24,56,.95) 54%,rgba(14,29,66,.95) 100%);
 box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 0 0 1px rgba(86,214,226,.28),0 3px 10px rgba(0,0,0,.5);color:#eef3ff;transition:opacity .25s}
#boss-bar[hidden]{display:none}
#boss-bar.charging{border-color:#ff5a5a;animation:bbPulse .8s infinite alternate}
@keyframes bbPulse{to{box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 12px rgba(255,60,60,.85)}}
.bb-top{display:flex;align-items:center;gap:7px;font-size:12px;line-height:15px;height:15px;white-space:nowrap}
.bb-name{color:var(--gold,#f2c55a);font-weight:900;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto;text-shadow:0 1px 0 #000}
.bb-name small{color:#ff9a8a;font-weight:bold;letter-spacing:0;margin-left:5px;font-size:11px}
.bb-ph{display:flex;gap:4px;flex:none;padding:0 2px}
.bb-ph i{width:7px;height:7px;transform:rotate(45deg);border:1px solid #d9b45a;background:#0a1430}
.bb-ph i.on{background:linear-gradient(135deg,#fff3c0,#f2c55a 50%,#b8861e);box-shadow:0 0 5px rgba(242,197,90,.85)}
.bb-chg{display:flex;align-items:center;gap:5px;margin-left:auto;flex:none;font-size:11px;color:#ffb8a8;font-weight:bold}
.bb-chg[hidden]{display:none}
.bb-gauge{width:58px;height:7px;border-radius:4px;background:#05091a;border:1px solid #b8861e;overflow:hidden;position:relative}
.bb-gauge i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#f2c55a,#fff1b8);transition:width .2s}
.bb-chg em{font-style:normal;color:#f2c55a}
.bb-track{position:relative;height:12px;margin-top:3px;border-radius:6px;background:#05091a;border:1px solid #7a2a36;overflow:hidden}
.bb-track i{position:absolute;left:0;top:0;bottom:0}
.bb-lag{background:#ffd8a8;transition:width .6s .35s ease-out}
.bb-fill{background:linear-gradient(#ff8a7a,#e02a40 55%,#8a0c1c);transition:width .2s}
.bb-track b{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:#f2c55a;box-shadow:0 0 2px #000}
.bb-hp{position:absolute;right:6px;top:0;font-size:10px;line-height:12px;font-weight:900;font-variant-numeric:tabular-nums;color:#fff;text-shadow:0 0 2px #000,0 1px 0 #000}
#banner.boss{border-color:#ff4a4a;background:linear-gradient(90deg,transparent,rgba(64,6,16,.95) 18%,rgba(96,12,26,.97) 50%,rgba(64,6,16,.95) 82%,transparent);box-shadow:0 0 26px rgba(255,50,60,.4)}
#banner.boss .b-main{color:#ffe08a;text-shadow:0 2px 0 #000,0 0 14px rgba(255,60,60,.85)}
#banner.boss .b-sub{color:#ffc8b8}
`;
  function ensureBar() {
    if (ST.bar && ST.bar.isConnected) return ST.bar;
    const host = document.getElementById('battle');
    if (!host) return null;
    if (!document.getElementById('boss-css')) { const st = document.createElement('style'); st.id = 'boss-css'; st.textContent = CSS; document.head.appendChild(st); }
    const el = document.createElement('div');
    el.id = 'boss-bar'; el.hidden = true;
    el.innerHTML = '<div class="bb-top"><span class="bb-name"></span><span class="bb-ph"></span><span class="bb-chg" hidden><span class="bb-cn"></span><span class="bb-gauge"><i></i></span><em>破招</em></span></div><div class="bb-track"><i class="bb-lag"></i><i class="bb-fill"></i><span class="bb-hp"></span></div>';
    host.appendChild(el);
    ST.bar = el;
    return el;
  }
  function primaryBoss() {
    let best = null, bs = -1;
    for (const s of aliveBosses()) {
      const sc = (s.cfg ? 1e6 : 0) + (s.u.ai === 'boss' ? 1e5 : 0) + s.u.mhp;
      if (sc > bs) { bs = sc; best = s; }
    }
    return best;
  }
  // 位置：地图上方或下方的空白处放得下就放空白处；放不下就叠在地图上（上 / 下择一，挡住较少单位的一边，首领权重最高）
  function placeBar(el) {
    const host = el.parentNode, stg = document.getElementById('stage'), cvs = document.getElementById('map');
    if (!host || !stg || !cvs || !B) return;
    const hb = host.getBoundingClientRect(), sb = stg.getBoundingClientRect(), cb = cvs.getBoundingClientRect();
    const h = el.offsetHeight || 36;
    const above = cb.top - sb.top, below = sb.bottom - cb.bottom;
    let top, over = false;
    if (above >= h + 4) top = cb.top - hb.top - h - 2;
    else if (below >= h + 4) top = cb.bottom - hb.top + 2;
    else {
      over = true;
      const ts = cb.height / B.h, nTop = Math.ceil((h + 3 - Math.max(0, above)) / ts), nBot = Math.ceil((h + 3 - Math.max(0, below)) / ts);
      let sTop = 0, sBot = 0;
      for (const o of alive()) { const w = o.boss ? 6 : o.team === 'player' ? 2 : 1; if (o.y < nTop) sTop += w; if (o.y >= B.h - nBot) sBot += w; }
      for (const s of ST.list) if (s.charge) for (const c of s.charge.cells) { if (c.y < nTop) sTop += 0.5; if (c.y >= B.h - nBot) sBot += 0.5; }
      const want = ST.barSide === 'bot' ? (sTop + 1 < sBot ? 'top' : 'bot') : (sBot + 1 < sTop ? 'bot' : 'top'); // 带一点迟滞，免得来回跳
      ST.barSide = want;
      top = want === 'top' ? Math.max(sb.top, cb.top) - hb.top + 2 : Math.min(sb.bottom, cb.bottom) - hb.top - h - 2;
    }
    const left = Math.max(sb.left, cb.left) - hb.left + 4, right = hb.right - Math.min(sb.right, cb.right) + 4;
    el.style.top = Math.round(top) + 'px'; el.style.left = Math.round(left) + 'px'; el.style.right = Math.round(right) + 'px';
    el.style.opacity = over ? '0.88' : '1';
  }
  function updateBar() {
    const el = ensureBar();
    if (!el) return;
    const s = off() || !B || B.over === 'win' ? null : primaryBoss();
    if (!s) { if (!el.hidden) { el.hidden = true; ST.barSig = ''; } return; }
    const u = s.u, gv = s.charge ? gaugeOf(s) : -1;
    const pips = s.cfg && s.cfg.phases ? s.cfg.phases.length + 1 : 0;
    const ph = s.cfg && s.cfg.phases && s.ph > 0 ? s.cfg.phases[s.ph - 1] : null;
    const sig = [u.uid, u.name, u.hp, u.mhp, s.ph, gv.toFixed(2), s.charge ? s.charge.g.name : ''].join('|');
    if (++ST.barTick % 30 === 0 || el.hidden) { el.hidden = false; placeBar(el); }
    if (sig === ST.barSig) return;
    const fresh = ST.barSig.split('|')[0] !== String(u.uid);
    ST.barSig = sig;
    el.hidden = false;
    el.querySelector('.bb-name').innerHTML = `★ ${esc(u.name)}${ph && ph.name && !s.charge ? `<small>${esc(ph.name)}</small>` : ''}`;
    el.querySelector('.bb-ph').innerHTML = pips ? Array.from({ length: pips }, (_, i) => `<i class="${i <= s.ph ? 'on' : ''}"></i>`).join('') : '';
    el.querySelector('.bb-hp').textContent = `${u.hp} / ${u.mhp}`;
    const pct = clamp(u.hp / u.mhp * 100, 0, 100) + '%';
    const fill = el.querySelector('.bb-fill'), lag = el.querySelector('.bb-lag');
    if (fresh) { lag.style.transition = 'none'; lag.style.width = pct; void lag.offsetWidth; lag.style.transition = ''; }
    fill.style.width = pct; lag.style.width = pct;
    // 阶段门槛刻度（只标当前形态下还没到的门槛）
    const tr = el.querySelector('.bb-track');
    for (const b of tr.querySelectorAll('b')) b.remove();
    if (s.cfg && s.cfg.phases) for (let i = s.ph; i < s.cfg.phases.length; i++) {
      const p = s.cfg.phases[i];
      if (p.transform) break;
      if (p.form && p.form !== u.cls) continue;
      const b = document.createElement('b'); b.style.left = p.at * 100 + '%'; tr.appendChild(b);
    }
    const chg = el.querySelector('.bb-chg');
    if (chg.hidden !== !s.charge) ST.barTick = 29; // 蓄力状态改变：下一帧重新定位
    el.classList.toggle('charging', !!s.charge);
    chg.hidden = !s.charge;
    if (s.charge) { el.querySelector('.bb-cn').textContent = `蓄力·${s.charge.g.name}`; el.querySelector('.bb-gauge i').style.width = Math.round(gv * 100) + '%'; }
    if (fresh) placeBar(el);
  }

  Object.assign(window, { bossAI, bossCheckpoint, bossTileRisk, bossDrawGround, bossDrawTop });
  window.BOSS = { table: BOSSES, state: ST, stats: STATS, gauge: gaugeOf, sync,
    // 测试用：让首领立刻在原地开始蓄力
    async forceCharge(u) { sync(); const s = u && u._bs, g = s && curSig(s), t = g && pickTarget(u, g); if (t) await startCharge(u, s, g, t); return !!t; } };
})();
