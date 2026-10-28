# 复仇魔神（g2）关卡编写规格

本作是《超时空英雄传说 2：复仇魔神》（宇峻 1996/97）的粉丝重制。剧情依原作资料改编，**对白全部重新撰写**（不要照抄原作台词），简体中文，语气参考一代 `js/stages/stages_01_09.js`。
研究资料：`/tmp/claude-0/-home-user/9be729c2-74a1-5e5a-97f9-c2a7a35894fd/scratchpad/research/game2_fuchou_moshen.md`（务必先读第 1–3 节）。
角色、职业、招式、道具、结局：`js/g2/data2.js`。引擎：`js/battle.js`、`js/game.js`。

## 文件与格式

每个负责人写一个文件 `js/g2/stages_<部分>.js`，内容是若干次：

```js
CAMPAIGN_STAGES.g2.push({
  id: 'g2_05', no: 5, title: '铲除狼群', part: '第一部 · 亡命者的悲歌', level: 6,
  map: [ ...12–14 个字符宽、13–16 行，地形字母见下 ],
  heights: [ ...可选：与 map 同尺寸，每格 0–3 的高度（二代有高低差，居高 +10%/层）],
  heroes: ['qingfeng', 'eva', ...],   // 本关「可能」出战的英雄（实际 = 已在队中 ∩ 此列表 − 已离队）
  required: ['qingfeng'],             // 必须出战（一定含 qingfeng；只放这时一定在队中的人）
  maxDeploy: 6,
  start: [[x, y], ...],               // 至少 maxDeploy 个出生点
  units: [ ['silverWolf', 6, x, y, { team: 'enemy', name: '银狼' }], ['hero:furong', 4, x, y, { team: 'ally', name: '芙蓉' }], ... ],
  chests: [[x, y, 'itemId'], [x, y, 'itemId', 金钱]],
  win: { type: 'rout' } | { type: 'boss' } | { type: 'reach', at: [x, y], label: '...' }, 可加 turns: N（8–40）
  lose: { units: ['qingfeng', 'furong'] },   // 这些角色阵亡即失败；可加 npcAll: true（友军全灭即败）
  events: [ { turn: 5, if: 条件?, effects: 效果?, spawn: [[兵种, 等级, x, y, {team,...}]], dialog: [...] } ],
  secret: { at: [x, y], to: 'g2_11', msg: '……' },   // 可选：我方停在此格即发现隐藏关，胜利后先去隐藏关
  intro: [...], outro: [...],
  onWin: 效果?,                         // 例如 { join: ['furong'], set: { x: true }, rel: { eva: 5 } }
  next: 'g2_06' | [{ to: 'g2_02', label: '往北走小径（较简单）', set: { route: 'north' }, auto: true }, { to: 'g2_12', label: '往东突破哨站', set: { route: 'east' } }] | [{ to: 'g2_70a', if: { flag: 'gemLost' } }, { to: 'g2_70b' }],
  reward: 1500, shop: ['frostSword', ...],
});
```

* `no` = 原作内部关卡编号（显示为「第 N 关」）。`level` = 本关敌方杂兵参考等级（见等级表）。隐藏关加 `secretStage: true`，其 `next: 'RETURN'`（回到发现它的那一关原本的下一关）。
* 最终关加 `final: true`。
* 对白行：`['角色名', '台词', '头像id']`。头像 id = 英雄 id（`CAMPAIGN_HEROES.g2` 的键，含剧情人物 wushuang / yangtie / kaidi）或 `'enemy:兵种'`（如 `'enemy:captain'`、`'enemy:assassin'`、`'enemy:beastKing'`）。旁白用 `['旁白', '……']`。
* 对白里可穿插：
  * 选项：`['?', '问题', [{ label: '……', set: {旗标: 值}, rel: { eva: +10 }, join: [...], leave: [...], item: { syncGem: -1 }, win: true, say: [对白...], auto: true }, ...]]`。`auto: true` 标记自动测试时选的那一项（每组选项恰好一个）。`win: true` 会立即判定本关胜利（例如「撤退」）。选项也可加 `if:` 只在条件成立时出现。
  * 条件对白：`['if', 条件, [成立时的对白], [不成立时的对白（可省）]]`。
  * 直接生效：`['do', 效果]`。
* 条件：`{ flag: 'gemLost' }`、`{ flag: 'route', is: 'north' }`、`{ rel: { eva: 60 } }`（好感 ≥）、`{ has: 'furong' }`（在队中且未离队）、`{ item: 'oldScroll' }`、`{ not: 条件 }`、数组 = 全部成立。
* 效果：`set`、`rel`（增减，夹在 0–100）、`join`（加入；以队伍平均等级入队）、`leave`（离队）、`item`（增减道具）、`gold`、`win`。
* 好感度：三位可结婚的女主角 eva / qiuyue / yilinna 以及 furong。剧情选项每次 ±5～15。开局约 eva 30、其余 0（第 1 关 onWin 设定）。80 以上能用情侣合技（清风 Lv12 起）。
* **英雄只能由 join 加入**（`heroes` 列表只是可出战名单）。加入后就一直在队中，除非 leave。

## 地形字母
G 草地 · R 道路 · F 森林(防20) · H 丘陵(防15) · M 山地(防30，骑兵不可) · S 沙地 · N 雪地 · P 湿地 · T 浅水(骑兵不可) · W 深水(只能飞/水) · B 木桥 · V 村庄(回复) · C 石板(防10) · K 红毯(防10) · O 洞窟 · X 城墙(不可通行) · Y 石柱(只能飞) · D 魔域 · L 熔岩(只能飞) · A 圣坛(回复)。未给 `heights` 时，丘陵/红毯高 1、山地/石柱高 2。

## 兵种（units 第一项）
一代已有：soldier 士兵、captain 队长、crossbow 弩手、darkKnight 黑骑士(骑)、bandit 沙盗、banditRider 沙盗骑兵(骑)、villager 村民、king 帝王、shaman 神巫、slime、watersnake(水)、crocodile(水)、hydra(水)、gargoyle(飞)、medusa、scorpion、spider、giant、yeti、sphinx、roc(飞)、seaMonster(水)、kraken(水)、beast 魔兽、dragon(飞)、demon(飞)、wolfman、hawkman(飞)、spiritEarth/Fire/Wind/Water；以及职业：swordsman、knight(骑)、fighter、samurai、archer、priest、mage、sorcerer、spellblade。
二代新增：assassin 杀手/皇家杀手、treant 树妖、siren 海妖(水)、goblin 地精、silverWolf 银狼、beastKing 兽化杨铁（最终 BOSS 之一）、revengeDemon 复仇魔神（芙蓉魔化，最终 BOSS 之一）、swordMad（刑天的职业）、whiteKnight、illusionist、windSword、prayer、gushi、adventurer、lordmage。
英雄当敌人 / 友军：`['hero:xingtian', 22, x, y, { team: 'enemy', name: '刑天', boss: true, ai: 'boss' }]`。
ai：默认 'aggr'；'hold'（有人进入攻击范围才动）、'guard'（原地不动）、'boss'。

## 等级表（level 与敌兵等级）
第一部 2→12，第二部 12→19，第三部 19→27，第四部 27→33；隐藏关比所在位置高 3–4 级、首领再高 2–4 级。敌方 8–14 个单位为宜；首领 `boss: true`，`win.type: 'boss'` 时只能有一个 boss。

## 道具 id（宝箱、商店、效果）
一代：ironSword steelSword silverSword greatSword platinumSword dragonSword holySword longBlade katana blueDragonBlade spear silverLance flameLance divineLance shortBow longBow silverBow elfBow sunBow shortStaff longStaff crystalStaff starStaff earthStaff spiritStaff battleAxe thunderHammer wolfFang clothCap leather mageRobe chainMail silverScale knightArmor spiritCape goldArmor dragonScale holyHelm mindHelm powerRing swiftBoots amulet herb healLeaf healFlower healFruit magicHerb magicFruit antidote stoneCure powerWine magicWine vigorWine wisdomBook swordManual
二代：broadSword 阔剑、frostSword 青霜剑、twinCleaver 双刃砍刀、lightSword 光之剑、sacredSword 圣剑、yinSwordItem 地宁-阴剑、ancientSword 古剑-冥魄、oriScepter 奥里传国杖、silkRobe 丝衣、roundShield 小圆盾、ringMail 环形甲、mirrorShield 七彩镜盾、dragonSinew 龙筋战衣、manaRobe 魔力护袍、magicBoots 魔法靴、catEye 猫眼石、sirenHarp 海妖竖琴、powerStone 力量辉石、lifeFruit 生命之果、wisdomFruit 智慧果、elixir 仙丹、syncGem 紫色同调石（剧情）、oldScroll 神秘卷轴（剧情）。

## 角色（英雄 id）
qingfeng 彦清风（主角，冒险者）· bai 白志超（剑士，好友）· eva 伊娃（白骑士，女主角）· nuolu 诺鲁（战士）· sonia 索妮亚（弓手）· shamanshan 沙曼珊（魔术师）· furong 芙蓉（幻术师，女主角，幕后关键）· qili 栖历（老术士，隐藏）· dvra 戴薇拉（鹰族，前作英雄）· judy 茱迪（神箭手，前作英雄）· qiuyue 秋月（剑侠，女主角）· aifulin 艾芙琳（修女）· laweisi 拉维司（蛊师）· jienuo 杰诺（奥里骑士）· xiaoling 小灵（精灵少女）· yilinna 依琳娜（奥里公主，女主角）· aiwen 艾文（流浪武士，隐藏）· rentian 任天（魔法师，隐藏）· xingtian 刑天（迦纳四天王，剑客）。
剧情人物（只出现在对白，或以 hero:/兵种 当敌人）：wushuang 无双女王、yangtie 迦纳国王杨铁、kaidi 韩凯蒂（奥里女骑士）。

## 旗标一览
route ('north'/'east')、showedHermit、furongLeft、qiuyueWent、gemLost、gemGiven、xingtianJoined、xingtianHostile、madhouse、marryYilinna、furongSaved、goblinSpared。

## 路线与关卡分配（id / no / 标题 / 要点）

### 第一部 · 亡命者的悲歌（level 2→12）
* **g2_01 / 1 王城沦陷**（负责人 A）：迦纳军攻陷赤子王城，清风与白志超突围。我方 qingfeng、bai；伊娃、诺鲁、索妮亚为友军 NPC（`hero:` 当 ally）。开场无双女王把小木盒（紫色同调石）交给清风，托他寻找前代英雄。onWin：join eva, nuolu, sonia；rel {eva: 30}；item {syncGem: 1}。next：往北小径 g2_02（芙蓉线，较易，set route north，auto）/ 往东哨站 g2_12（秋月线，较难，set route east）。宝物：阔剑、丝衣、小圆盾、药草。
* 北线（A）：**g2_02 / 2 北驿小径**（避开主力，敌队长为骑士；介绍「移动点数：行动后可用剩余移动力再移动」）→ **g2_03 / 3 形迹泄漏**（胜利条件：平息双方战斗＝击败敌方；河两岸）→ **g2_04 / 4 进攻兵器塔**（首领大神官 priest；沙曼珊被迫研究魔法兵器，战后 join shamanshan）→ **g2_05 / 5 铲除狼群**（银狼群，援军第 5 回合；芙蓉为友军，战后 join furong、rel furong 10；secret：左侧「虎口」山洞 → g2_11）→ **g2_11 / 11 栖历神殿**（隐藏，栖历为首领，战后 join qili，next RETURN）→ **g2_06 / 6 反抗军**（与梅里镇反抗军共同对抗迦纳军；第 5 回合刑天出现，芙蓉建议撤退：选项「撤退」win:true auto，「死战」继续；刑天 boss 剑气厉害）→ **g2_07 / 7 寻找隐者**（拜访隐者克里斯；穴居兽/召魂猫；条件：拿到水晶杖宝箱即可＝用 reach 或 boss；关键选项：给隐者看小木盒？是 → set showedHermit、item lightSword 1；否 → 无事）→ **g2_08 / 8 狼嚎鹰扬**（鹰族被迦纳军围困，戴薇拉为友军不能死，lose 含 dvra；战后 join dvra）→ **g2_09 / 9 劫囚车**（伏击押送队，狼族英雄坎培特其实已遇害，囚车里是迦纳武士假扮，援军包围）→ g2_17。
* 东线（B）：**g2_12 / 12 东击哨站**（强行突破，reach 或全灭）→ **g2_13 / 13 神秘杀手**（深入迦纳国境往镜湖城，会攻击人的树妖 treant；胜：树妖全灭）→ **g2_14 / 14 潜入镜湖城**（守住镜湖城，茱迪为友军不能死；战后 join judy；secret：地图东南「虎口」→ g2_10）→ **g2_10 / 10 湖底遗迹**（隐藏，水中敌人，next RETURN）→ **g2_15 / 15 秋月**（刑天来袭；秋月为友军；可选「逃走」reach 过关或击败刑天；战后 join qiuyue，rel qiuyue 10）→ g2_17。
* **g2_17 / 17 火烧船舰**（共通，负责人 B）：港口夺船出海。胜：击败援兵队长（boss）或走到红旗处（用 boss 胜利即可）；援兵第 12 回合出现；保护拉维司（友军 NPC，lose 含 laweisi）。战后 join aifulin, laweisi；白志超决定返回迦纳打探消息（leave bai，对白交代，为外传《北方密使》铺垫）；若 route north 则 join judy（茱迪随船），若 route east 则 join dvra（戴薇拉追上来）——用 onWin 里 `['do']` 不行，请用 outro 里的 `['if', {flag:'route',is:'north'}, [对白..., ['do', {join:['judy']}]], [对白..., ['do', {join:['dvra']}]]]`。next g2_18。

### 第二部 · 异域相逢（奥里国，level 12→19）
* 负责人 B：**g2_18 / 18 浴血海战**（一上岸即被奥里军包围，先挡韩凯蒂部；kaidi 以 `hero:kaidi` 或 knight 当敌方将领）→ **g2_19 / 19 先锋部队**（敌占高处，用 heights）→ **g2_20 / 20 昏君**（奥里国王被迦纳操控；韩凯蒂友军抢经验）→ **g2_21 / 21 突击王宫**（国王撤退）→ **g2_23 / 23 选择**（奥里骑士杰诺在两难中倒戈：战斗中第 3 回合选项让他加入 → join jienuo）。
* 负责人 C：**g2_25 / 25 寻找圣剑**（圣殿精灵难缠；圣剑在宝箱 sacredSword；secret：最上方巨神武士身后 → g2_29）→ **g2_29 / 29 圣殿秘室**（隐藏、极难，地灵珠/祖母绿=用 powerStone/lifeFruit 代替，RETURN）→ **g2_26 / 26 为民除害**（地精作乱；第 3 回合精灵少女小灵求情：选项饶过地精 → set goblinSpared、win:true、join xiaoling；或继续全灭）→ **g2_27 / 27 解救王宫**（救出依琳娜公主；战后 join yilinna，rel yilinna 10；她交给清风神秘卷轴 item oldScroll 1）→ **g2_30 / 30 联手抗敌**（夜魔女 medusa、人魔 demon、地魔 gargoyle；第 5 回合夜魔女与人魔离开）→ **g2_31 / 31 夹击**（4 回合后敌将投降：选项接受 win:true；secret → g2_31s）→ **g2_31s / 31 隐秘洞窟**（隐藏，流浪武士艾文被困，战后 join aiwen，RETURN）→ **g2_32 / 32 小人国**→ **g2_33 / 33 海妖之难**（siren 海妖远程攻击）→ **g2_34 / 34 佣兵集团**（佣兵：samurai/fighter/archer 混编；窄路）→ g2_36。

### 第三部 · 风起明锡（level 19→27）
* 负责人 D：**g2_36 / 36 明锡风云**（明锡岛；刑天现身。若 has furong：芙蓉出面交涉，选项「追问真相」→ leave furong、set furongLeft；「相信她」→ rel furong +10。若 has qiuyue：选项「让秋月跟刑天走」→ leave qiuyue、set qiuyueWent、rel qiuyue +10；「留下秋月」→ rel qiuyue +5、set xingtianHostile）→ **g2_37 / 37 震旦科技**（迦纳的机械兵 robot/console；outro：`['if', [{flag:'showedHermit'},{has:'furong'}], [芙蓉暗中取走真正的同调石的暗示..., ['do',{set:{gemLost:true}}]]]`）→ **g2_39 / 39 白特国王**（secret → g2_40）→ **g2_40 / 40 隐洞**（隐藏，恶魔群，魔法师任天 join rentian，RETURN）→ **g2_44 / 44 杀手**（皇家杀手挟持依琳娜索要同调石：选项交出 → set gemGiven、item syncGem -1（若 showedHermit 则交出的是假货，对白区分）、win:true；拒绝 → 苦战）→ **g2_45 / 45 夺取权杖**（夺回奥里传国杖 oriScepter；国王 NPC 不能死；outro：奥里国王提亲：选项「答应娶依琳娜」→ set marryYilinna、rel yilinna +20；「婉拒」）→ **g2_46 / 46 陷阱**→ **g2_48 / 48 海岸守备队**（很弱）→ **g2_49 / 49 鹰族战士**（回到雷夫大陆；next：`[{ to:'g2_50', if:{flag:'qiuyueWent'} }, { to:'g2_52' }]`）。
* 负责人 E：**g2_50 / 50 多情剑客**（刑天约战：选项接受单挑 → 刑天 boss 一对一（maxDeploy 1）/ 拒绝 → set xingtianHostile；next g2_51 若未 hostile 否则 g2_52）→ **g2_51 / 51 无敌剑阵**（打败刑天剑阵；战后 join xingtian, qiuyue（回归），set xingtianJoined，item ancientSword/yinSwordItem）→ **g2_52 / 52 花去飘香**（百花部伏兵）→ **g2_54 / 54 百花军团**（以孟祈的消息设伏；若同调石还在可交换让部分敌人离开）→ **g2_56 / 56 崩坏的秩序**（高处弓兵，NPC 不能全灭 npcAll；战后选项「认错」进隐藏？——本重制改为普通对白）→ **g2_58 / 58 召魂大法**（阻止黑石唤出召魂大法；黑石 = shaman 或 demon，boss；secret：东北宝箱后 → g2_64）→ **g2_64 / 64 疯人院**（隐藏、难；战后 set madhouse，RETURN）→ **g2_67 / 67 黑石魂魄**→ next `[{ to:'g2_91', if:{flag:'xingtianHostile'} }, { to:'g2_61' }]`。

### 第四部 · 复仇魔神（level 27→33）
* 负责人 F：**g2_91 / 91 清风与刑天**（无情剑客刑天单挑清风，maxDeploy 1，next g2_61）→ **g2_61 / 61 指向帝都**→ **g2_63 / 63 死守宫门**（secret：左边小河异样石块 → g2_72）→ **g2_72 / 72 帝都监狱**（隐藏，RETURN）→ g2_63 的 next：`[{ to:'g2_77', if:[{flag:'madhouse'},{item:'oldScroll'}], label:'独自追向英雄冢（隐藏·极难）' }, { to:'g2_70a', if:{flag:'gemLost'}, label:'直捣帝都王宫', auto:true }, { to:'g2_70b', label:'直捣帝都王宫', auto:true }]` —— 注意 70a/70b 的条件互斥写法：70b 加 `if:{not:{flag:'gemLost'}}`。**g2_77 / 77 英雄冢**（隐藏最终关：maxDeploy 4，所有魔王群聚，极难；next 同样依 gemLost 走 70a/70b，无 label 自动）→ **g2_70a / 70 复仇魔神**（final:true；芙蓉化为复仇魔神 revengeDemon boss；揭露她的复仇与十年前黑魔神之战的关联、杨铁被施术；若 rel furong ≥ 60 胜利后选项「伸出手」→ set furongSaved；next END）/ **g2_70b / 70 复仇魔神**（final:true；被施术兽化的杨铁 beastKing boss；芙蓉若在队会说明真相；next END）。

## 写作要求
* 每关：intro 6–14 句、outro 4–10 句，交代剧情、新角色个性；女主角好感选项分散在各关（每部至少 3 次）。
* 地图要有特色（城、港口、山道、神殿、雪原……），合理放置宝箱 2–4 个，敌人分布有层次（前锋/hold 的后卫/首领）。
* 难度参照一代：我方 5–8 人对敌 8–14 人；首领用 ai 'boss' 或 'hold'。
* 写完用 `node tools/validate_g2.js js/g2/stages_*.js` 校验到 0 错误（提醒 next 指向别人负责的关卡是正常的）。
