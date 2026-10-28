# 狂神降世（g4）关卡编写规格

本作是《超时空英雄传说 3：狂神降世》（宇峻 2001）的粉丝重制。剧情依原作资料改编，**对白全部重新撰写**（不要照抄原作台词），简体中文，语气参考 `js/g3/stages_m1.js`。
研究资料：`/tmp/claude-0/-home-user/9be729c2-74a1-5e5a-97f9-c2a7a35894fd/scratchpad/research/game3_kuangshen_jiangshi.md`（先读第 1–3 节）。
**原作是半即时 CT 制，本重制不采用**：沿用系列一贯的回合制引擎（与复仇魔神、北方密使相同：格子地图、移动点数、方向、高低差、自由转职）。原作的「时距」= 本作的「回合」。
角色、职业、招式、道具、结局：`js/g4/data4.js`。格式与前作相同（先读 `notes/SPEC_G2.md` 的「文件与格式」「地形字母」「兵种」三节，再读 `notes/SPEC_G3.md` 的「与二代的不同」），以下只写**本作的不同之处**与剧情分配。

## 与前作的不同
* 文件 `js/g4/stages_<部分>.js`，内容是若干次 `CAMPAIGN_STAGES.g4.push({...})`（建议整个文件包在 IIFE 里）。id 以 `g4_` 开头，`no` 见下表（显示为「第 N 关」；同一章的关卡 no 连续）。
* **单一主角** `kehelin`（克荷林）：每关 `required` 必须含 `'kehelin'`，`lose.units` 至少含 `'kehelin'`。
* 宝箱第 5 项 `'hidden'` / `'locked'` 照用（盗贼系、小偷系、百合的职业有搜索与开锁；初期队伍里没有，第二章起才有百合）。
* **效果**多了：`stat: { kehelin: { atk: 2, hp: 6 } }`（永久能力增减，hp/mp 指上限）、`perk: { kehelin: ['combo'] }`（永久特殊能力：combo 连击、drain 吸取、pierce 灵击、search、unlock）。`learn`、`catchUp` 照用。
* 条件 `{ flag: 'route', is: ['A1', 'B1'] }` 可以用数组（任一相符）。
* **变身首领**（狂神）：单位选项 `transform: { below: 0.4, to: 'madGod2', name: '狂神·真身', mul: 1.1, say: [对白...] }`——生命降到 40% 以下时变身、回满。只用在最终关。
* 好感度（`rel`）：`beiliqina` 贝里奇娜、`baihe` 百合、`nafeiya` 娜菲雅、`kouqi` 寇琪、`lida` 丽妲。剧情选项每次 +5～15（原作在对话里选体贴的回答会加分）。结局门槛 40，**每位候选人在她出现的路线上要有 5 次左右加分机会**。
* 等级：第一章 2→7；第二章 8→13；第三章 14→20（B2 博丰篇 14→21）；第四章 21→26；第五章 27→33。隐藏关比所在位置高 4–6 级。

## 兵种（本作新增）
敌方：`maskman` 蒙面人（15 级起为蒙面人队长）、`outsider` 异界魔物（「不属于这个世界的怪物」，黑暗系）、`madGod` 狂神、`madGod2` 狂神·真身（变身用）。
可当敌兵的职业：duelist 斗剑士、longbowman 长弓手、halberdier 长戟士（8 级起骑马）、tribesman 蛮族战士、thief 盗贼、alchemist 炼金术士、monk 修士、swordmaid 女战士、shooter 射手、pikemaid 长枪士、amazon 亚马逊战士、pickpocket 小偷、sorceress 魔术士、nun 修女、elementalist 元素使、pirate 海贼、summoner 召唤士。
沿用：一代全部兵种（soldier、captain、crossbow、darkKnight、bandit、knight、priest、mage、dragon、kraken、spiritEarth/Fire/Wind/Water、demon、gargoyle……）、二代 assassin、三代 skeleton、bat、mecha、jester 等。**提醒（前作的经验）**：敌方杂兵别大量使用玩家职业的高等级版（武士、剑士等打主角很痛）；小丑（灵击）与会召唤的敌人要少用；首领等级别比本关 level 高太多。
剧情人物可以 `hero:` 出场：`andi` 安迪将军（雅曼）、`wood` 伍德城主、`ambassador` 雅曼大使（要保护）、`limu` 利姆、`obutana` 欧布坦拿、`deluowa` 德洛瓦将军、`bide` 彼德、`sisi` 西斯得菲尔、`bailandi` 白兰蒂、`fendeli` 芬德利。可加入的英雄在加入前也可用 `hero:` 当友军或敌人（例如娜菲雅先是敌人）。被列在 lose.units 里的 `hero:` 友军引擎会自动加厚。

## 道具（本作新增）
武器：militiaSword 佣兵长剑、energySword 能量剑、griffinBlade 狮鹫之剑、compoundBow 复合弓、xuanmingBow 玄冥弓、meteorXbow 流星弩、halberd 长戟、poisonDagger 毒素匕首、shadowDagger 暗影匕首、greatAxe 巨斧、anchor 船锚、alchemyStaff 炼金杖、elementRod 四元素之杖。防具：bigShield 百炼大圆盾、senseArmor 感知战甲、gryphonMail 狮鹫鳞甲。饰品：speedHat 速度之帽、hasteRing 加速指环、mysteryMask 神秘的面具、elementCharm 元素加护符。剧情：ambassadorSeal 雅曼使节印、dragonEgg 圣龙之卵、oldMap 芬德利的古地图。前作道具照常可用。

## 角色与加入时间
初始（g4_01 的 required）：kehelin 克荷林（斗剑士，主角）、maisi 麦斯（长弓手，执着复仇）、tao 陶（炼金术士，军师，毒舌）、bobi 波比（蛮族战士，憨直、说话颠三倒四）、kouqi 寇琪（女战士，爱捉弄人）、lida 丽妲（炼金术士，内向，暗恋麦斯）。
* beiliqina 贝里奇娜（元素使）：g4_05 密林天使战后加入。
* pulusi 普鲁丝（幻术师）、baihe 百合（小偷/杀手）：「屠杀」（A 线 g4_14 / B 线 g4_23）战后加入。
* liqi 力奇（海贼）：A 线 g4_18 重逢 / B1 g4_28 黑旗海盗 / B2 g4_45 船上。
* nushayi 努莎伊（长枪士）：g4_33 尽忠职守 / B2 g4_42 重回故里。
* tuoli 托莉（修女，幻影佣兵团）：g4_36 夏米尔监狱外 / B2 g4_46 / 伊卡尔港 g4_61（三处都写「若还不在队则可邀请」）。
* xianniya 仙妮亚（射手）：g4_37 天牢 / B2 g4_46。
* nafeiya 娜菲雅（女战士）：伊卡尔港篇 g4_63 相遇（先打败她，战后加入）。
* guluru 咕鲁鲁（幼龙）：乌托邦篇 g4_56 火刑 / 伊卡尔港篇 g4_65 圣龙之谷。
* 普鲁丝在乌托邦篇 g4_53 离队（leave），g4_56 回来（join）。

## 故事主轴
法尔马立克大陆：艾普洛王国（国教穆伦教）与独立出来的雅曼共和国打了两年。在杉福王国秘密签订停战密约的那天，会场被蒙面人闯入，除雅曼大使外各国使者全部遇害——受雇护送大使的佣兵团「血狮鹫兵团」（团长克荷林）被嫁祸，成了各国追缉的对象。
幕后：祈勒蒙的大贤者**欧布坦拿**梦想用神的力量打造「没有战争的乌托邦」。他的蒙面人刺杀使者、让战火延续，用战争的死亡与「异境门」引来的异界魔物，为唤醒封在梵冷尼奥地底的**狂神**做准备。贝里奇娜原是穆伦教的祭司，几年前一场失败的封印仪式让她失去记忆——她其实是用来封印狂神的「钥匙」。
结局：克荷林一行在狂神祭坛「弑神救世」。A1/B1 路线麦斯牺牲、A2/B2 路线贝里奇娜牺牲；A 线克荷林继续流浪，B 线他夺回并接任博丰领主（他原是博丰领主的么子）。

## 旗标
line（'A'/'B'，g4_06 设定）、route（'A1'/'A2'/'B1'/'B2'）、tuoliJoined、xianniyaJoined、nafeiyaSpared、woodCaptured、bahamut（打败太古神龙）、hector（打败赫克特）、leviathan。

## 路线图
```
第一章 g4_01–06 ──┬─ A：g4_11–18（第二章 流浪的猎犬）──────────┐
                   └─ B：g4_21–27（第二章 赞曲与悼歌）─┬─ B1：g4_28 → ┤
                                                          └─ B2：g4_41–47（博丰篇）─────┐
第三章 暗潮涌动 g4_31–37（A、B1 共用）──┬─ line B（B1）→ g4_53 乌托邦篇      │
                                         ├─ A 不同意麦斯（A1）→ g4_51–52 → g4_53 │
                                         └─ A 同意麦斯（A2）→ g4_61 伊卡尔港篇 ◄─┘
乌托邦篇 g4_53–59（A1/B1） ┐
伊卡尔港篇 g4_61–67（A2/B2）┴→ 第五章 信念 g4_71–79（共通，g4_79 最终关）
隐藏关：g4_39 海兽利维亚桑（g4_31 的 secret）、g4_80 太古神龙巴哈姆特（g4_73 的 secret）、g4_81 魔装重骑士赫克特（g4_77 的 secret）
```

## 关卡分配

### 第一章 · 绯红的和平（负责人 A，`js/g4/stages_c1.js`，level 2→7）
* **g4_01 / 1 不白之冤**（lv2）：杉福行馆，和会遭袭。**intro 开头是「前导问答」**：旁白以回忆的方式问克荷林 5 个问题（每题 3–4 个选项，用 `'?'`，每组恰好一个 auto）：
  1. 出身——贵族世家 `stat {def:2, mag:1}` / 富商巨贾 `gold: 1000` / 工农平民 `stat {hp:6, atk:1}` / 流浪卖艺者 `stat {spd:2}`
  2. 少年时代——山林修行 `stat {atk:1, spd:1}` / 进学院 `stat {mag:3, mp:6}` / 结党少年 `stat {atk:2, hp:4}`
  3. 湖之女神问他要哪一样——金剑 `stat {atk:2}` / 诸善的理念 `stat {mag:1, def:1}`、`learn {kehelin:['holyLight']}` / 复仇 `stat {atk:1, mag:1}`、`set {vengeful:true}`
  4. 危急时救谁——师父 `stat {hp:2, atk:1, def:1, mag:1, spd:1}` / 战友 `stat {hp:10}` / 爱人 `rel {beiliqina: 10}` / 自己 `perk {kehelin:['combo']}`
  5. 力量与和平——渴求无上的力量 `stat {atk:3, mag:3, def:-2}` / 和平 `stat {hp:8, def:1}`
  然后才是事件：蒙面人杀进会场，敌全灭即胜；雅曼大使（`hero:ambassador` 友军，lose 含他）要保护。`required: ['kehelin','maisi','tao','bobi','kouqi','lida']`。
* **g4_02 / 2 逃亡**（lv3）：杉福行馆外，被各国卫兵当成凶手追捕，护着大使突围（reach 或敌全灭；大使不能死）。
* **g4_03 / 3 利姆的请求**（lv4）：逃亡路上，努欧勒镇少年利姆求兵团救村子（盗匪）。
* **g4_04 / 4 贪念**（lv5）：努欧勒镇，盗匪首领勾结镇长；击败首领。
* **g4_05 / 5 密林天使**（lv6）：古木森林，遇到被异界魔物（outsider）包围的贝里奇娜（`hero:beiliqina` 友军）；她说那些怪物「不属于这个世界」。onWin join beiliqina；好感选项（原作：「你一个人来这里？这种危险的深山？」+）。
* **g4_06 / 6 待宰羔羊**（lv7）：铁车城的秘密行馆，伍德城主知道和会的内幕。胜利：rout 或 reach（行馆后门）。outro 后 next 选项（**A/B 分歧**）：`[{ to:'g4_11', label:'放走伍德，带大使离开（A 线：流浪的猎犬）', set:{line:'A'}, auto:true }, { to:'g4_21', label:'押着伍德城主去见雅曼的安迪将军（B 线：赞曲与悼歌）', set:{line:'B', woodCaptured:true} }]`，ask：'伍德城主就在眼前，要怎么做？'。

### 第二章 A · 流浪的猎犬（负责人 B，`js/g4/stages_a2.js`，level 8→13）
g4_11 落难之犬（派特洛丘陵，reach 或全灭）→ g4_12 怪物之谜（达伦平原，异界魔物）→ g4_13 麦勒港之夜（麦勒港）→ g4_14 屠杀（穗海镇：先敌全灭，第 N 回合蒙面人队长现身；战后 join pulusi, baihe）→ g4_15 派特洛森林 → g4_16 封蹄沼泽（首领柴克利）→ g4_17 黑旗海盗（船上，首领尼尔森）→ g4_18 重逢（海盗窝：力奇原本被尼尔森与沙克挟持，战后 join liqi）→ next g4_31。

### 第二章 B · 赞曲与悼歌（负责人 C，`js/g4/stages_b2.js`，level 8→13）
g4_21 袭击（犁沟镇，协助安迪将军 `hero:andi` 友军）→ g4_22 怪物之谜（绢河河谷）→ g4_23 屠杀（穗海镇；战后 join pulusi, baihe）→ g4_24 会战（达伦平原，大规模会战）→ g4_25 中计（派特洛丘陵）→ g4_26 救援（派特洛森林，救安迪）→ g4_27 殒星（绢河河畔，敌全灭；安迪将军重伤，兵团必须决定去向）。g4_27 的 next：`[{ to:'g4_28', label:'随安迪将军的部队出海，追查蒙面人（B1）', set:{route:'B1'}, auto:true }, { to:'g4_41', label:'趁乱夺回故乡博丰（B2）', set:{route:'B2'} }]`。
**g4_28 / 28 黑旗海盗**（B1，lv14）：船上，首领尼尔森；战后 join liqi（他是被挟持的世交）。next g4_31。

### 第三章 · 暗潮涌动（A 与 B1 共用，负责人 D，`js/g4/stages_c3.js`，level 14→20）
g4_31 不自量力（西风港，佣兵头领强·裘帝玛；**secret：港口最外的码头 → g4_39 海兽利维亚桑**）→ g4_32 关卡前夜（劳伦蒂斯森林？自定）→ g4_33 尽忠职守（关卡；守关女骑士努莎伊先是敌方 `hero:nushayi`，中途选项说服她 → join nushayi）→ g4_34 步步危机（劳伦蒂斯森林）→ g4_35 危急之秋（科伦诺砦）→ g4_36 幽冥路（莫古洛湿原，亡灵；结尾在夏米尔监狱外遇到托莉：选项邀请 → join tuoli、set tuoliJoined）→ g4_37 天牢（夏米尔监狱：救出关在下层的仙妮亚 → join xianniya）。
**g4_37 的 next**：`[{ to:'g4_53', if:{ flag:'line', is:'B' } }, { to:'g4_61', label:'同意麦斯：直捣艾普洛的伊卡尔港（A2）', set:{route:'A2'}, if:{ flag:'line', is:'A' } }, { to:'g4_51', label:'不同意：先去祈勒蒙查明幕后真相（A1）', set:{route:'A1'}, if:{ flag:'line', is:'A' }, auto:true }]`；outro 里写麦斯与陶、贝里奇娜的争论（麦斯想直接复仇）。
**g4_39 / 39 海兽利维亚桑**（隐藏，lv20）：超大海兽（kraken boss）；贝里奇娜若在队，对白提到她用「火山爆发」；宝箱 elementCharm 等。RETURN。
第三章 3 个 hidden/locked 宝箱。

### B2 · 博丰篇 + A1 前段（负责人 E，`js/g4/stages_bf.js`）
* B2（level 14→21）：g4_41 重回战场（达伦平原）→ g4_42 重回故里（博丰城门；努莎伊是博丰旧臣之女，join nushayi）→ g4_43 将计就计（博丰城内，首领德洛瓦将军）→ g4_44 背叛者（博丰城内，「严厉教训」彼德）→ g4_45 船上（join liqi）→ g4_46 夏米尔监狱（外+内合一：join xianniya；若未 tuoliJoined 可邀请托莉）→ g4_47 妒念（奎恩堡，首领西斯得菲尔）→ next g4_61。克荷林在 B2 恢复了博丰么子的身份，对白要有份量。
* A1 前段（level 20→21）：g4_51 奎恩堡外 → g4_52 异境门（绿魔森林外关卡：发现欧布坦拿开启「异境门」引来异界魔物的证据）→ next g4_53。

### 第四章 · 乌托邦变奏曲（A1/B1，负责人 F，`js/g4/stages_u4.js`，level 21→26）
g4_53 乌托邦之路（祈勒蒙山道；战后普鲁丝不告而别 leave pulusi）→ g4_54 大义（欧布坦拿宅内；地震，对白交代普鲁丝坠崖）→ g4_55 抉择（欧布坦拿宅外）→ g4_56 火刑（祈勒蒙市民广场：克荷林与贝里奇娜被抓上火刑台——开场 kehelin、beiliqina 在广场中央被围，其余队员从外围杀进来；战后普鲁丝回来，带着孵出的幼龙咕鲁鲁 → join pulusi, guluru）→ g4_57 祈勒蒙街道 → g4_58 伊法连圣堂 → g4_59 龙力筏（龙力筏上对抗欧布坦拿召出的魔龙 dragon boss）→ next g4_71。

### 第四章 · 伊卡尔港篇（A2/B2，负责人 G，`js/g4/stages_i4.js`，level 21→26）
g4_61 接应（伊卡尔港：先支援一位逃亡的贵夫人上岸再护送她到目的地；地图右上会出现托莉，若未 tuoliJoined 可邀请）→ g4_62 艾普洛史最长的一日（那特罗芙平原，大会战，敌全灭）→ g4_63 相遇（那特罗芙平原：首领娜菲雅 `hero:nafeiya` 敌方 boss；战后她看清真相，选项 → join nafeiya、set nafeiyaSpared、rel nafeiya）→ g4_64 异界之门（与怪物作战，异界魔物）→ g4_65 圣龙之谷（唤醒圣龙；圣龙之卵孵出咕鲁鲁 → join guluru）→ g4_66 欧布坦拿宅外 → g4_67 龙力筏（欧布坦拿召出的魔龙）→ next g4_71。

### 第五章 · 信念（共通，负责人 H，`js/g4/stages_c5.js`，level 27→33）
g4_71 圣城外的暴动（梵冷尼奥森林）→ g4_72 圣地下的炼狱（地下水道）→ g4_73 潜入作战（梵冷尼奥街道；**secret：古怪老学者芬德利的屋前 → g4_80 太古神龙巴哈姆特**）→ g4_74 忠诚之爱（大圣堂）→ g4_75 风与地之祭坛（狂岚圣女、刚岩圣女：开场只有 4 只小精灵，第 3 回合两位圣女现身，spiritWind/spiritEarth 当首领型敌人）→ g4_76 水与火之祭坛（碧浪圣女、绯炎圣女）→ g4_77 偏执的悲剧（地下祭坛入口，首领白兰蒂 `hero:bailandi`；**secret → g4_81 魔装重骑士赫克特**）→ g4_78 理想与狂想（地底祭坛，首领欧布坦拿 `hero:obutana` 或 sorcerer 名「欧布坦拿」）→ **g4_79 狂神降世**（final:true，next 'END'；狂神 `madGod` boss，`transform: { below: 0.4, to: 'madGod2', name: '狂神·真身', say: [...] }`；每 5 回合援军；失败条件克荷林阵亡）。第五章的对白要依 route 交代谁将牺牲（A1/B1 麦斯、A2/B2 贝里奇娜）的伏笔，但牺牲本身写在结局里（`CAMPAIGN_ENDINGS.g4.prelude`）。
隐藏：**g4_80 / 80 太古神龙巴哈姆特**（lv38，dragon boss，龙炎很痛，set bahamut，宝箱 energySword、senseArmor 等）、**g4_81 / 81 魔装重骑士赫克特**（lv36，darkKnight boss「魔装重骑士·赫克特」，set hector，宝箱 bigShield、speedHat、hasteRing）。两关都 secretStage、next 'RETURN'。

## 写作要求
* 每关 intro 6–14 句、outro 4–10 句；人物个性要鲜明（克荷林沉稳有担当、麦斯阴郁执着、陶毒舌冷静、波比憨、寇琪调皮、丽妲腼腆、贝里奇娜神秘温柔、普鲁丝说话像谜语、百合冷淡、力奇豪爽）。好感选项分散。
* 地图 12–14 宽、13–16 高，有特色；宝箱 2–4 个（0–1 个 hidden/locked）；敌人 8–14 个，有层次。
* 写完用 `node tools/validate_g4.js js/g4/stages_*.js` 校验到 0 错误。只改自己的文件，不改引擎与 data4.js（缺什么在回报里说明）。
