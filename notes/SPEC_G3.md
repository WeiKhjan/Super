# 北方密使（g3）关卡编写规格

本作是《超时空英雄传说 2 外传：北方密使》（宇峻 1998）的粉丝重制。剧情依原作资料改编，**对白全部重新撰写**（不要照抄原作台词），简体中文，语气参考 `js/g2/stages_p1n.js`。
研究资料：`/tmp/claude-0/-home-user/9be729c2-74a1-5e5a-97f9-c2a7a35894fd/scratchpad/research/game_beifang_mishi.md`（先读第 2–4 节）。
角色、职业、招式、道具、结局：`js/g3/data3.js`。引擎：`js/battle.js`、`js/game.js`。格式与二代完全相同（先读 `notes/SPEC_G2.md` 的「文件与格式」「地形字母」「兵种」三节），以下只写**不同之处**与本作的剧情分配。

## 与二代的不同
* 文件 `js/g3/stages_<部分>.js`，内容是若干次 `CAMPAIGN_STAGES.g3.push({...})`；id 以 `g3_` 开头，`no` = 原作关卡编号（男主线 1–70、女主线 70 起、隐藏关见下表）。
* **双主角**：男主线主角 `bai`（白志超），女主线主角 `natalia`（娜塔莉亚）。男主线每关 `required` 含 `'bai'`，女主线每关含 `'natalia'`。共通关（第四部）写 `lordReq: true`，引擎会自动把本路线主角加入 required；`heroes` 要同时列 `bai` 与 `natalia`。`lose: { units: [...] }` 列主角（与必须保护的友军）。
* 路线旗标 `route`：`'male'` / `'female'`（新游戏选主角时设定，不用你设）。
* **宝箱第 5 项**：`[x, y, 'itemId', 金钱, 'hidden']` = 隐藏宝物（队伍里要有「搜索」能力的杀手系才看得见、拿得到）；`'locked'` = 上锁宝箱（要由有「开锁」能力的杀手系本人去开）。每关可放 0–1 个隐藏或上锁宝箱，放较好的东西。男主线罗莎莉（第 3 关起）、女主线戴西（第 79/81 关起）是杀手。
* **效果** 多了 `learn: { su: ['callDragon'] }`（让某英雄学会招式）。
* **关系值**（`rel`，引擎里叫关系值）：
  * `qiuyue` = 刑天与秋月的感情（第 4 关入队时设 50）。≥60 且两人相邻时刑天可用全画面合击「有无相生」。剧情选项每次 ±5～15（例：替刑天说话 +10、逼他们分开 -10）。
  * `bai` 与 `natalia` = 两位主角之间的互信。**两个键永远一起加减同样的数值**（例 `rel: { bai: 10, natalia: 10 }`）。两人初次见面（男线 g3_14 或 g3_21、女线 g3_83）时设到 20 左右，之后每有合作 +5～10。≥70 时两人相邻可用合击「北斗交辉」，并影响结局。
  * `aopaer` = 白志超与奥帕儿（只在男主线奥帕儿支线）。
* 等级：男主线第一部 2→9、第二部 10→18、第三部 19→26；女主线第一部 2→10、第二部 11→20、第三部 21→26；共通第四部 27→32。隐藏关比所在位置高 3–4 级，首领再高 2–4 级。

## 兵种（本作新增，units 第一项可用）
skeleton 骷髅兵 · bat 吸血蝙蝠(飞，吸取) · mecha 重装机甲(射程 1-3，硬) · techWarrior 高科技战士 · creb 克雷布特里（最终 BOSS 专用）· jester 小丑（丑子军团）· fishman 鱼人 · vampire 吸血鬼(飞) · harpy 女妖(飞) · killer 杀手(女) · crossbowman 连弩手 · medium 通灵使 · magicKnight 魔法骑士(骑) · swordHand 剑手 · martial 武师 · barbarian 蛮人 · child · princess。
沿用：一代全部兵种、二代的 assassin 杀手/皇家杀手、treant、siren、goblin、silverWolf、swordMad 等。有名字的敌将用 `{ name: '黑蝎子', boss: true, ai: 'boss' }` 标在兵种上即可。
剧情人物可以 `hero:` 出场（当敌人或友军）：`hero:kelite`（柯莉特，魔法骑士）、`hero:beiluo`（贝洛，骑兵）、`hero:lingzhu`（南方领主）、`hero:dazhanglao`（大长老，友军，会抢经验）、`hero:crebtree`（克雷布特里——**最终关请用兵种 `creb` 当 BOSS**，等级可控）。注意 `hero:` 单位的等级字段会被忽略（以队伍等级为准），需要强力首领时用兵种。
对白头像：英雄 id（见下）或 `'enemy:兵种'`（如 `'enemy:jester'`、`'enemy:bandit'`、`'enemy:creb'`、`'enemy:assassin'`）。

## 道具（本作新增）
武器：scimitar 弯刀、roseRapier 玫瑰细剑、tianqing 古剑-天清（与二代 yinSwordItem 地宁-阴剑成对）、handXbow 手弩、repeatXbow 奚族连弩、spiritBell 通灵铃杖、ironKnuckle 铁拳套。防具：desertCloak 沙漠斗篷、xiLeather 奚族皮甲。饰品：xiCharm 奚族护符、starPendant 北斗坠饰。
秘籍：baxieManual 霸邪剑谱（学终极剑术）。剧情：rope 绳索、battlePlan 军事计划书、dragonPact 龙之契约、ruby 红宝石（可卖）。
隐藏职业道具：morphPill 变身丸（鱼人）、bloodCoffin 充血的棺材（吸血鬼）、featherRobe 诱惑的羽衣（女妖）、jesterMask 丑角的面具（小丑）。
一代、二代道具照常可用（见 SPEC_G2.md）。

## 角色
男主线：bai 白志超（剑手，主角）· feishuang 飞霜（魔法骑士，女，奉命保护南巡使，一板一眼）· nanxun 南巡使（迦纳巡察官，骑兵，第 27 关后永久离队）· aiwen 艾文（浪人「拦路虎」，武士）· judy 茱迪（镜湖城神箭手，前代英雄）· luosha 罗莎莉（杀手，女）· xingtian 刑天 / qiuyue 秋月（二代角色，恋人，**离队两次**）· aopaer 奥帕儿（贵族公主，只在奥帕儿支线，不能转职，第 42/43 关后永久离队）· lan 岚（武师）。
女主线：natalia 娜塔莉亚（连弩手，主角，性子急护短）· su 苏（通灵使，温和）· muer 穆尔（蛮人，冲动）· taipu 泰普（猎人，稳重）· daixi 戴西（杀手，斥候）· gusitafu 古斯塔夫（战士，前第一勇士）· baoer 宝儿（小孩，孤儿）。
剧情人物：dazhanglao 大长老 · kelite 柯莉特（南方领女将，与赤子国佣兵私通）· beiluo 贝洛（南方领军方首脑，主战派）· lingzhu 南方领主（奥帕儿之父，软弱，被操纵）· crebtree 克雷布特里（领主的顾问，幕后黑手）。

## 故事主轴（各负责人共用）
复仇魔神之战后，迦纳废帝改行共和。南方领（首府亚修斯）渐渐不受控制：向赤子国招募佣兵、向海外的震旦买进机械兵器，十多天前还出兵占领了奚族的采石场。
* 男主线：迦纳议会派**南巡使**公开出访南方领，暗中派**白志超、飞霜**当「北方密使」随行调查。白志超一路扩大行动，介入各方明争暗斗。
* 女主线：奚族派**娜塔莉亚**的小队调查被占的采石场，一路从草原打进亚修斯。
* 两队不时合作（男线 g3_14/g3_21 ↔ 女线 g3_83），中后期在「力量与魔法」合流。
* 幕后：领主的顾问**克雷布特里**率领「狂教徒」与**丑子军团**（小丑佣兵），故意挑起南方领与奚族的战争——他要借战乱打开**奚族圣地**的古老封印，取得封在那里的力量。采石场的坑道正通往圣地底下的遗迹。柯莉特、贝洛、库库克、黑蝎子都是他直接或间接利用的棋子。
* 结局：克雷布特里在奚族圣地被打倒，主战派失势，议和派的奥帕儿继任「边地行政长官」。

## 旗标一览
route、branch1（'desert'/'ruins'）、metNatalia、metBai、opal（奥帕儿支线）、xtLeft（刑天秋月第一次离队）、xtLeft2（第二次）、xtBack（第 54 关归队）、plan（拿到军事计划书）、advice（'taipu'/'muer'）、breakout（'north'/'south'）、baoerKept、opalQueen、opalLeft、madhouse、keliteSaved（g3_95 救了柯莉特，g3_100 她会来助战）。

## 路线与关卡分配（id / no / 标题 / 要点）

### 男主线第一部 · 南巡之旅（负责人 A，`js/g3/stages_m1.js`，level 2→9）
* **g3_01 / 1 第一神剑**（lv2）：开场旁白交代共和、南方领异动；白志超刚在迦纳剑术大会夺得「第一神剑」，被议会选为密使。南下途中，南巡使车队夜里遭不明人马（被收买的盗匪）伏击。`required: ['bai','feishuang','nanxun']`。宝箱：弯刀、药草等。next g3_02。
* **g3_02 / 2 拦路虎**（lv3）：山道上的浪人「拦路虎」艾文（`hero:aiwen` 敌方 boss，ai hold）带着山贼拦路。胜利：击败艾文。战后他嚷着要「监视」白志超而同行（join aiwen）。**宝箱里放绳索 rope**（放在偏僻处，对白里有人提一句「带着说不定有用」）。
* **g3_03 / 3 水都镜湖**（lv4）：前往镜湖城（湖上桥城）。杀手罗莎莉（`hero:luosha` 敌方，非 boss）企图刺杀南巡使，茱迪（`hero:judy` 友军，不能死）出手相助。outro 选项：放过罗莎莉 → join luosha（auto）/ 交给城卫兵。onWin join judy。lose：bai、nanxun、judy。
* **g3_04 / 4 血染哨站**（lv5）：迦纳边境哨站遭血洗，现场留下奚族的箭——其实是南方领士兵假扮（埋伏笔）。第 4 回合刑天、秋月（`hero:` 友军）路过出手。onWin `{ join: ['xingtian','qiuyue'], rel: { qiuyue: 50 } }`。next 选项：`[{ to:'g3_05', label:'穿越沙漠近路', set:{branch1:'desert'}, auto:true }, { to:'g3_08', label:'走古代遗迹旧道', set:{branch1:'ruins'} }]`。
* 沙漠支线：**g3_05 / 5 黄沙烈焰**（lv6，沙地、放火的沙盗法师、巨蝎）→ **g3_06 / 6 沙盗营地**（lv7，突袭营地救出被掳的商人）→ **g3_07 / 7 沙盗黑蝎子**（lv8，boss 黑蝎子 = banditRider 名「黑蝎子」；他招认受「亚修斯的大人物」雇用）→ g3_10。
* 遗迹支线：**g3_08 / 8 遗迹恶鬼**（lv6，骷髅兵、石像鬼、亡灵）→ **g3_09 / 9 危亡的商队**（lv8，护送商队，villager 友军 `npcAll`）→ g3_10。
* **g3_10 / 10 罕泉哨所**（lv9）：沙漠绿洲罕泉镇的南方领哨所盘查过严，识破了南巡使随员的身份，被迫一战。outro：进入亚修斯。next g3_11。

### 男主线第二部 · 亚修斯风云（负责人 B，`js/g3/stages_m2.js`，level 10→18）
* **g3_11 / 11 恶德商人**（lv10）：亚修斯港边，向海外购买震旦兵器的奸商与打手。
* **g3_13 / 13 神秘的访客**（lv11）：夜里南巡使的宿处遭皇家杀手袭击，一位蒙面的神秘访客（其实是奥帕儿）出手示警后离去。next 选项：`[{ to:'g3_14', label:'前往贾府（追查奚族的线索）', auto:true }, { to:'g3_15', label:'离城追上神秘访客' }]`。
* **g3_14 / 14 意外的友军**（lv12）：贾府里白志超一行与娜塔莉亚的小队误会交手，随即一起对付闯进来的南方领兵（`hero:natalia`、`hero:su` 友军）。set metNatalia；rel bai/natalia 各 20。
* **g3_15 / 15 沙漠明珠**（lv12）：城外，奥帕儿的马车遭贝洛的部下追杀（`hero:aopaer` 友军，不能死）。onWin join aopaer，set opal，rel aopaer 20。
* g3_14 与 g3_15 的 outro 都要：刑天与秋月追查克雷布特里的线索暂时离队（leave xingtian, qiuyue；set xtLeft）——可加一个选项影响 rel qiuyue。两关 next 都是 g3_16。
* **g3_16 / 16 领主的晚宴**（lv13）：领主府为南巡使设宴，**克雷布特里**首次登场（领主身边的顾问），贝洛冷眼旁观。宴会上刺客杀出。若 has aopaer：奥帕儿当众与父亲争执。
* **g3_17 / 17 奚族刺客**（lv14）：南方领宣称刺客是奚族派来的，街上追捕；第 3 回合下方出现 4 名皇家杀手增援。战后发现「奚族刺客」身上有小丑面具的刺青。
* **g3_18 / 18 潜入领主府**（lv15）：夜探领主府找证据，reach 胜利（到书房）。
* **g3_21 / 21 携手合作**（lv16）：与娜塔莉亚小队联手突袭南方领军械库（`hero:natalia`、`hero:su` 友军）。若未 metNatalia：初次见面对白（set metNatalia，rel 20）；否则 rel +10。
* **g3_22 / 22 密盗库库克**（lv16）：亚修斯的密盗库库克（assassin 名「库库克」boss）偷走了线索；第 3 回合刑天、秋月回来助阵（`hero:` 友军，事件 effects `{ join: ['xingtian','qiuyue'] }`）。
* **g3_24 / 24 军事计划书**（lv17）：潜入军部偷出南方领的军事计划书（item battlePlan 1，set plan）——内容显示南方领要在采石场集结兵力、进攻奚族圣地方向。
* **g3_25 / 25 秘密据点**（lv18）：克雷布特里在城内的秘密据点；狂教徒、小丑；揭露他与丑子军团的关系。next g3_26。

### 男主线第三部（负责人 C，`js/g3/stages_m3.js`，level 19→26）
* **g3_26 / 26 流浪的剑士**（lv19）：在城外遇见寻访剑术极致的武师岚（`hero:lan` 友军），一起击退追兵；onWin join lan。
* **g3_27 / 27 情报网**（lv20）：拔除南方领的情报网。outro：南巡使被议会召回北方（leave nanxun，永久）；刑天、秋月第二次离开（leave xingtian, qiuyue；set xtLeft2）。next 选项：`[{ to:'g3_33', label:'走官道', auto:true }, { to:'g3_34', label:'前往军港' }]`。
* **g3_33 / 33 官道巡弋者**（lv21）：官道上的巡逻队；**secret：东北角路尽头 → g3_39 女妖之塔**。next g3_30。
* **g3_39 / 39 女妖之塔**（隐藏，lv25）：女妖 harpy 群；宝箱放 featherRobe（诱惑的羽衣）。secretStage，next RETURN。
* **g3_34 / 34 港都喋血**（lv21）：港都的屠杀（南方领军嫁祸奚族）；next g3_30。
* **g3_30 / 30 追击柯莉特**（lv22）：柯莉特带支队逃往赤子国与佣兵私通，于双龙城方向拦截。柯莉特 boss（magicKnight 兵种名「柯莉特」），被击败后逃走（对白交代）。
* **g3_36 / 36 古城要塞**（lv23）：有高低差的古城（用 heights）；**secret：最高处 → g3_40 龙穴**。next 三选一：`[{ to:'g3_41', label:'小丑献媚' }, { to:'g3_42', label:'谁是王者', auto:true }, { to:'g3_43', label:'奥帕儿女王', if:{ has:'aopaer' } }]`，ask: '三方势力同时找上门来，要先去哪里？'。
* **g3_40 / 40 龙穴**（隐藏，lv27）：龙族；宝箱放 bloodCoffin（充血的棺材）与 dragonScale。RETURN。
* **g3_41 / 41 小丑献媚**（lv25）：丑子军团假意结盟设下圈套；宝箱 jesterMask。→ g3_54。
* **g3_42 / 42 谁是王者**（lv25）：贝洛与领主两派火并，白志超一行被夹在中间。若 has aopaer：奥帕儿决定留下收拾残局（leave aopaer，set opalLeft）。→ g3_54。
* **g3_43 / 43 奥帕儿女王**（lv25）：奥帕儿号召议和派，被拥立为临时领袖；保护她（友军/在队，不能死）。outro：她留在亚修斯（leave aopaer，set opalQueen）。→ g3_54。

### 女主线第一部（负责人 D，`js/g3/stages_f1.js`，level 2→10）
* **g3_70 / 70 返回奚族**（lv2）：娜塔莉亚小队调查归来途中遇狼群与盗匪；`required: ['natalia','su','muer','taipu']`。很简单，教学关。next g3_71。
* **g3_71 / 71 恶兆**（lv3）：大长老（对白）的占卜出现凶兆；村外出现妖物。
* **g3_72 / 72 青色草原**（lv4）：清除草原上所有妖物（rout；silverWolf、spider、slime）。
* **g3_73 / 73 神秘的气息**（lv5）：苏察觉到邪气；第一次遇上丑子军团的斥候（几个 jester）与南方领兵。
* **g3_74 / 74 边城提那**（lv6）：南方领驻守的边城提那。outro 讨论对策，next 选项：`[{ to:'g3_75', label:'采纳泰普的建议：驱离守卫', set:{advice:'taipu'}, rel:{}, auto:true }, { to:'g3_76', label:'采纳穆尔的建议：引起骚动', set:{advice:'muer'} }]`。
* **g3_75 / 75 驱离守卫**（lv7，reach：悄悄引开守卫进城）/ **g3_76 / 76 引起骚动**（lv7，rout：大闹一场）→ 都到 g3_77。
* **g3_77 / 77 撤退保护战**（lv8）：南方领报复，护送奚族平民撤到小河西岸（reach，娜塔莉亚到达脱离点；villager 友军 npcAll，平民全灭即败）。
* **g3_78 / 78 突围的选择**（lv9）：被包围后突围。next 选项：`[{ to:'g3_79', label:'北上罕泉镇（去奚族部落求援）', set:{breakout:'north'}, auto:true }, { to:'g3_80', label:'南下采石场（直接调查）', set:{breakout:'south'} }]`。
* **g3_79 / 79 奚族部落**（lv10）：保卫鳍鳞部的营地；斥候戴西加入（join daixi）。→ g3_81。
* **g3_80 / 80 采石场**（lv10）：被占的采石场，救出做苦工的奚族人，其中有前第一勇士古斯塔夫（`hero:gusitafu` 友军）；join gusitafu。→ g3_81。

### 女主线第二部（负责人 E，`js/g3/stages_f2.js`，level 11→20）
* **g3_81 / 81 暹族的伏击**（lv11）：被南方领收买的暹族战士伏击（barbarian、bandit）。outro 用 `['if', { not: { has: 'daixi' } }, [... ['do', { join: ['daixi'] }]]]` 与同样的 gusitafu，补齐另一位队友。
* **g3_83 / 83 会面**（lv12）：在亚修斯郊外与白志超一行（`hero:bai`、`hero:feishuang` 友军）误会交手后合作。set metBai；rel bai/natalia 各 20。
* **g3_84 / 84 丑子军团**（lv13）：胜：打败所有小丑（jester）；败：娜塔莉亚阵亡。宝箱 jesterMask。
* **g3_85 / 85 矿坑上层**（lv14）：采石场坑道（O 洞窟、骷髅兵、蝙蝠、南方领兵），发现坑道通往地底古遗迹。
* **g3_87 / 87 黑牢历险**（lv15）：中了埋伏被关进黑牢，maxDeploy 4 从牢房逃出（宝箱里拿回装备）。
* **g3_89 / 89 孤零的宝儿**（lv16）：亚修斯街头，保护奚族孤儿宝儿（`hero:baoer` 友军，不能死）不被人贩抓走；join baoer，set baoerKept。
* **g3_90 / 90 杀之宴**（lv17）：受邀赴宴却是杀局，娜塔莉亚到达脱离点即胜（reach）。
* **g3_91 / 91 领主府内**（lv18）：`required: ['natalia','baoer']`——宝儿认得领主府的密道。府内发现克雷布特里的阴谋文件。
* **g3_93 / 93 暗夜妖魔**（lv20）：夜里妖魔袭击奚族营地；大长老（`hero:dazhanglao` 友军，ai 'aggr'）出手「抢经验」；第 4 回合蝙蝠群出现。next g3_102。

### 女主线第三部（负责人 F，`js/g3/stages_f3.js`，level 21→26）
* **g3_102 / 102 官道正规军**（lv21）：南方领正规军；**secret：东北角 → g3_101 飞龙谷**。next g3_103。
* **g3_101 / 101 飞龙谷**（隐藏，lv25）：龙族；击败古龙（dragon boss）后，古龙认可苏：onWin `{ learn: { su: ['callDragon'] }, item: { dragonPact: 1 } }`（苏不在队也照样学会）。RETURN。
* **g3_103 / 103 双龙之城**（lv22）：双龙城，柯莉特与赤子佣兵交易现场；佣兵混编，柯莉特逃走。
* **g3_105 / 105 渡河点**（lv23）：渡河追击；**secret：东侧水道出口 → g3_108 双子之塔**。next g3_106。
* **g3_108 / 108 双子之塔**（隐藏，lv27）：两座塔；宝箱放 featherRobe 与 bloodCoffin。RETURN。
* **g3_106 / 106 奥尔登军港**（lv24）：震旦的机械兵器（mecha）在军港上岸。
* **g3_109 / 109 高科技战士**（lv25）：techWarrior 与 mecha。
* **g3_115 / 115 小丑夺权**（lv26）：丑子军团的首领（jester boss「小丑王」）趁乱夺取南方领兵权；击败他。next g3_54。

### 第四部 · 圣地之谜（共通，负责人 G，`js/g3/stages_p4.js`，level 27→32）
* **g3_54 / 54 力量与魔法**（lv27，`lordReq: true`）：两队都追到克雷布特里的「力量与魔法」研究所（震旦机械 + 狂教徒的禁咒）。第 1 回合事件：`if {flag:'route',is:'male'}` → spawn `hero:natalia`、`hero:su` 友军；`if {flag:'route',is:'female'}` → spawn `hero:bai`、`hero:feishuang` 友军。**第 8 回合**事件：刑天、秋月赶到（spawn `hero:xingtian`、`hero:qiuyue` 友军；effects `{ join: ['xingtian','qiuyue'], set: { xtBack: true }, rel: { qiuyue: 20 }, item: { tianqing: 1, yinSwordItem: 1 } }`）。若在第 8 回合前就全灭敌人，两人永远不会归队（outro 用 `['if', { not: { flag: 'xtBack' } }, ...]` 交代）。敌人要够多（14 左右、有援军）。outro 用 if 依路线让另一队加入：男线 join natalia, su, taipu；女线 join bai, feishuang, aiwen；两条都 rel bai/natalia +10。**secret：地图一角的高塔 → g3_55 连欧塔塔**。next g3_60。
* **g3_55 / 55 连欧塔塔**（隐藏，lv31）：古代魔导塔；宝箱 morphPill、ruby。RETURN。
* **g3_60 / 60 峦河水霸**（lv28）：峦河上的水霸（fishman boss）与水中敌人；**secret：南方小岛 → g3_61 地洞，`if: { item: 'rope' }`**（msg 提到用绳索垂降）。next g3_95。
* **g3_61 / 61 地洞**（隐藏，lv32）：宝箱 baxieManual（霸邪剑谱）等。RETURN。
* **g3_95 / 95 落难的骑士**（lv29）：被克雷布特里抛弃的柯莉特遭狂教徒追杀（`hero:kelite` 友军）；选项救她 → 她说出圣地仪式的真相。next g3_100。
* **g3_100 / 100 奚族圣地**（lv32，final:true）：最终决战，`creb` 兵种当 BOSS（boss:true，等级 36 左右）；狂教徒、小丑、骷髅、恶魔护卫，会有援军。**secret：海报/石碑处（要绕远）→ g3_99 疯人院**。next 'END'。
* **g3_99 / 99 疯人院**（隐藏，lv36，全游戏最难）：一群「魔头」（插花魔头、算盘魔头……用 demon / vampire / jester / harpy / mecha 等兵种取名）；onWin set madhouse；宝箱 jesterMask、elixir、dragonSword 等。RETURN（回到结局）。

## 写作要求
* 每关 intro 6–14 句、outro 4–10 句；角色个性鲜明（白志超冷静但爱管闲事、飞霜一板一眼、艾文嘴贫、娜塔莉亚急躁护短、苏温和、穆尔冲动、泰普稳重、宝儿天真）。关系值选项分散在各关。
* 地图 12–14 宽、13–16 高，有特色（沙漠、绿洲、湖城、领主府、坑道、草原、军港……），宝箱 2–4 个（其中 0–1 个 hidden 或 locked），敌人 8–14 个，有前锋 / hold 后卫 / 首领层次。
* 写完用 `node tools/validate_g3.js js/g3/stages_*.js` 校验到 0 错误（next 指向别人负责的关卡出现「提醒」是正常的）。只改自己的文件，不改引擎与 data3.js（缺什么在回报里说明）。
