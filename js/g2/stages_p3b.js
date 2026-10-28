// 复仇魔神 · 第三部后半（负责人 E）：多情剑客 / 无敌剑阵 / 花去飘香 / 百花军团 / 崩坏的秩序 / 召魂大法 / 疯人院（隐） / 黑石魂魄
// 刑天与秋月的去留、百花部以孟祈之名设下的埋伏、黑石的召魂大法与疯人院的秘密。对白为重新撰写。
'use strict';
(() => {
  const PART = '第三部 · 风起明锡';
  // 本部可能在队中的英雄（实际出战 = 已在队中 ∩ 此列表 − 已离队）
  const ALL = ['qingfeng', 'eva', 'nuolu', 'sonia', 'shamanshan', 'furong', 'qili', 'dvra', 'judy', 'qiuyue',
    'aifulin', 'laweisi', 'jienuo', 'xiaoling', 'yilinna', 'aiwen', 'rentian', 'xingtian'];
  // 高度图：fn(x, y, 地形字母) → 0–3
  const TH = { H: 1, K: 1, M: 2, Y: 2 };
  const hmap = (map, fn) => map.map((r, y) => [...r].map((c, x) => Math.max(0, Math.min(3, fn(x, y, c, TH[c] || 0)))).join(''));

  // =================================================================
  // 第 50 关 · 多情剑客（只在秋月随刑天离去后出现）
  // =================================================================
  const M50 = [
    'MMMFFFRFFFMWW',
    'MMFFGGRGGFFMW',
    'MFFGGHRHGGFMW',
    'MFGGYCCCYGGMW',
    'FFGCCCCCCCGHW',
    'FGGCCCKCCCGHW',
    'FGYCCKKKCCYHW',
    'FGGCCCKCCCGHW',
    'FFGCCCCCCCGHW',
    'MFGGYCCCYGGMW',
    'MFFGGHRHGGFMW',
    'MMFFGGRGGFFMW',
    'MMMFGGRGGFMWW',
    'MMMFFGRGFFMWW',
    'MMMMFGRGFMMWW',
  ];
  // 拒绝单挑时赶来的同伴（各自在队中才会出现）
  const rescue50 = [['eva', 4, 12], ['yilinna', 8, 12], ['jienuo', 5, 13], ['dvra', 7, 13], ['judy', 6, 14], ['aifulin', 5, 14]]
    .map(([id, x, y]) => ({ turn: 1, if: [{ flag: 'xingtianHostile' }, { has: id }], spawn: [['hero:' + id, 0, x, y, { team: 'player' }]] }));

  CAMPAIGN_STAGES.g2.push({
    id: 'g2_50', no: 50, title: '多情剑客', part: PART, level: 22,
    map: M50,
    heights: hmap(M50, (x, y, c, h) => c === 'C' ? 1 : c === 'K' ? 2 : c === 'Y' ? 3 : h),
    heroes: ['qingfeng'], required: ['qingfeng'], maxDeploy: 1,
    start: [[6, 12]],
    units: [
      // 单挑：刑天主动逼近（不用 hold，免得双方对峙）；等级压低，代表他「每一剑都留了半分」
      ['swordMad', 19, 6, 6, { team: 'enemy', name: '刑天', boss: true, mhp: 72, atk: 34 }],
      ['swordsman', 21, 1, 5, { team: 'enemy', name: '剑阵弟子', ai: 'guard' }],
      ['swordsman', 21, 11, 5, { team: 'enemy', name: '剑阵弟子', ai: 'guard' }],
      ['swordsman', 21, 1, 7, { team: 'enemy', name: '剑阵弟子', ai: 'guard' }],
      ['swordsman', 21, 11, 7, { team: 'enemy', name: '剑阵弟子', ai: 'guard' }],
      ['samurai', 21, 5, 1, { team: 'enemy', name: '剑阵武士', ai: 'guard' }],
      ['samurai', 21, 7, 1, { team: 'enemy', name: '剑阵武士', ai: 'guard' }],
    ],
    chests: [[6, 0, 'lifeFruit'], [1, 10, 'healFruit']],
    win: { type: 'boss' },
    lose: { units: ['qingfeng'] },
    events: [
      ...rescue50,
      { turn: 1, if: { flag: 'xingtianHostile' },
        spawn: [
          ['windSword', 22, 3, 2, { team: 'enemy', name: '剑阵剑侠' }],
          ['windSword', 22, 9, 2, { team: 'enemy', name: '剑阵剑侠' }],
        ],
        dialog: [
          ['旁白', '号角声在断崖下回荡。山道上，同伴们的身影一个接一个冲上剑坪。'],
          ['伊娃', '清风，我们来了！谁敢动他一根头发，先过我这杆枪！', 'eva'],
          ['刑天', '剑阵弟子听令——不必再守规矩了！', 'xingtian'],
        ] },
      { turn: 3, if: { flag: 'xingtianHostile' },
        spawn: [
          ['swordsman', 22, 0, 6, { team: 'enemy', name: '剑阵弟子' }],
          ['swordsman', 22, 11, 4, { team: 'enemy', name: '剑阵弟子' }],
        ],
        dialog: [
          ['刑天', '两翼合围！今夜谁也别想活着走下断崖！', 'xingtian'],
        ] },
      { turn: 3, if: { not: { flag: 'xingtianHostile' } },
        dialog: [
          ['刑天', '能在我剑下撑过两个回合的人，这几年里你是第一个。', 'xingtian'],
          ['彦清风', '你的剑太快了……可是，每一剑都留了半分。', 'qingfeng'],
          ['刑天', '少啰嗦。下一剑，我不会再留。', 'xingtian'],
          ['秋月', '……（握着剑柄的手，指节已经发白）', 'qiuyue'],
        ] },
    ],
    intro: [
      ['旁白', '回到雷夫大陆的第三夜，一支白羽箭钉在了营帐的木柱上。箭杆上绑着一封短信，字迹锋利得像剑痕。'],
      ['彦清风', '「明夜子时，断崖剑坪。只请彦清风一人。——刑天」', 'qingfeng'],
      ['伊娃', '只请你一人？这摆明了是陷阱。清风，我陪你去。', 'eva'],
      ['彦清风', '他若要暗算，就不会先写信。刑天是那种会把剑亮在明处的人。……大家在山下等我。', 'qingfeng'],
      ['旁白', '次夜，断崖剑坪。月光把石坪照得一片雪白，刑天背剑而立，秋月静静站在崖边。'],
      ['刑天', '你果然一个人来了。比我想的有胆色。', 'xingtian'],
      ['彦清风', '秋月姑娘……你还好吗？', 'qingfeng'],
      ['秋月', '……我很好。你不该来的。', 'qiuyue'],
      ['刑天', '明锡岛上，你把她还给了我。我刑天不欠人情——可我也不服人。', 'xingtian'],
      ['刑天', '秋月说你的剑里有一股傻气，傻到肯为不相干的人豁出性命。我想亲手试试，那是不是真的。', 'xingtian'],
      ['刑天', '与我单打独斗。你赢了，我的剑和我这个人随你处置；你输了，从此别再踏进迦纳一步。', 'xingtian'],
      ['?', '要接受刑天的单挑吗？', [
        { label: '接受单挑', auto: true, say: [
          ['彦清风', '好，我接下了。不过我不是为了赢你——是不想再让秋月姑娘夹在我们中间为难。', 'qingfeng'],
          ['刑天', '口气不小。剑坪四周的弟子不会插手，这是剑客之间的事。', 'xingtian'],
          ['秋月', '（低声）清风，小心他的「剑气」，那一剑能贯穿一整列的人。别站在他的正前方。', 'qiuyue'],
        ] },
        { label: '拒绝，吹号召集同伴', set: { xingtianHostile: true }, say: [
          ['彦清风', '我的同伴就在山下。一场意气之争，我不能拿整支队伍的将来去赌。', 'qingfeng'],
          ['刑天', '……原来你从一开始就没打算守约。秋月，这就是你说的「傻气」？', 'xingtian'],
          ['秋月', '清风，你……', 'qiuyue'],
          ['刑天', '也罢。从今天起，我刑天的剑只为斩你一人而出鞘。', 'xingtian'],
        ] },
      ]],
    ],
    outro: [
      ['if', { flag: 'xingtianHostile' }, [
        ['刑天', '咳……以多欺少，这就是赤子国的英雄？', 'xingtian'],
        ['秋月', '刑天，你的伤——', 'qiuyue'],
        ['刑天', '走，秋月。彦清风，下次见面，我不会再讲什么剑客的规矩。我会让你知道，什么叫「无情」的剑。', 'xingtian'],
        ['旁白', '刑天在弟子的掩护下退进夜色。秋月回头看了清风一眼，终究还是跟着他走了。'],
        ['伊娃', '你没有做错。一个人去送死，才是真的傻。', 'eva'],
        ['彦清风', '……可我好像把一个本来能成为朋友的人，亲手推成了敌人。', 'qingfeng'],
      ], [
        ['刑天', '……我输了。你的剑没有章法，可每一剑都不肯退。', 'xingtian'],
        ['彦清风', '最后那一剑，你明明可以刺得更深。', 'qingfeng'],
        ['刑天', '少自作多情。剑客输了就是输了，没有什么让不让。', 'xingtian'],
        ['秋月', '他很久没有输得这么痛快了。……我看得出来，他在笑。', 'qiuyue'],
        ['刑天', '不过，输的只是「刑天」，还不是我的「剑阵」。明日拂晓，剑冢峰上，我的弟子会布下无敌剑阵。破得了，我和秋月就随你走。', 'xingtian'],
        ['?', '秋月望着你，似乎有话想说。', [
          { label: '「等破了阵，我们一起走。」', rel: { qiuyue: 10 }, auto: true, say: [
            ['秋月', '……嗯。这一次，我不会再走散了。', 'qiuyue'],
          ] },
          { label: '「你该留在刑天身边。」', rel: { qiuyue: -5 }, say: [
            ['秋月', '你总是替别人着想。……可我想听的，不是这句话。', 'qiuyue'],
          ] },
        ]],
      ]],
    ],
    next: [{ to: 'g2_51', if: { not: { flag: 'xingtianHostile' } } }, { to: 'g2_52' }],
    reward: 4000,
    shop: ['dragonSword', 'divineLance', 'goldArmor', 'healFlower', 'magicFruit'],
  });

  // =================================================================
  // 第 51 关 · 无敌剑阵
  // =================================================================
  const M51 = [
    'MMMMMHHHHMMMMM',
    'MMMMHCCCCHMMMM',
    'MMMHCCKKCCHMMM',
    'MMHCYCKKCYCHMM',
    'MHCCCCCCCCCCHM',
    'MHCYCCCCCCYCHM',
    'HCCCCCAACCCCCH',
    'MHCYCCCCCCYCHM',
    'MHCCCCCCCCCCHM',
    'MMHCYCCCCYCHMM',
    'MMMHCCCCCCHMMM',
    'MMMFHHRRHHFMMM',
    'MMFFGGRRGGFFMM',
    'MFFGGRRRRGGFFM',
    'MFGGGRRRRGGGFM',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_51', no: 51, title: '无敌剑阵', part: PART, level: 23,
    map: M51,
    heights: hmap(M51, (x, y, c, h) => c === 'Y' ? 3 : c === 'M' ? 2 + (y < 4 ? 1 : 0) : y <= 3 ? h + 2 : y <= 10 ? 1 + (c === 'H' ? 1 : 0) : h),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 8,
    start: [[6, 13], [7, 13], [5, 13], [8, 13], [6, 14], [7, 14], [5, 14], [8, 14]],
    units: [
      ['swordMad', 24, 6, 2, { team: 'enemy', name: '刑天', boss: true, ai: 'boss' }],
      ['swordMad', 22, 5, 3, { team: 'enemy', name: '剑阵·天位', ai: 'hold' }],
      ['swordMad', 22, 8, 3, { team: 'enemy', name: '剑阵·地位', ai: 'hold' }],
      ['swordsman', 21, 3, 4, { team: 'enemy', name: '剑阵·风位', ai: 'hold' }],
      ['swordsman', 21, 10, 4, { team: 'enemy', name: '剑阵·云位', ai: 'hold' }],
      ['windSword', 21, 2, 6, { team: 'enemy', name: '剑阵·龙位', ai: 'hold' }],
      ['windSword', 21, 11, 6, { team: 'enemy', name: '剑阵·虎位', ai: 'hold' }],
      ['samurai', 21, 3, 8, { team: 'enemy', name: '剑阵·鸟位', ai: 'hold' }],
      ['samurai', 21, 10, 8, { team: 'enemy', name: '剑阵·蛇位', ai: 'hold' }],
      ['priest', 22, 7, 1, { team: 'enemy', name: '剑冢守墓人', ai: 'hold' }],
    ],
    chests: [[1, 13, 'swordManual'], [12, 13, 'manaRobe'], [8, 1, 'elixir']],
    win: { type: 'rout' },
    lose: { units: ['qingfeng'] },
    events: [
      { turn: 5,
        spawn: [['swordsman', 21, 0, 6, { team: 'enemy', name: '剑阵·补位' }]],
        dialog: [
          ['刑天', '补位！八方剑位，缺一补一——剑阵不破，生生不息！', 'xingtian'],
          ['戴薇拉', '左翼又冒出人来了。别被他们包成饺子！', 'dvra'],
        ] },
      { turn: 7,
        dialog: [
          ['刑天', '好！能把剑阵逼到这一步……秋月，你没看错人。', 'xingtian'],
          ['秋月', '……我早就说过了。', 'qiuyue'],
        ] },
    ],
    intro: [
      ['旁白', '剑冢峰顶，传说埋着历代剑客折断的佩剑。拂晓的雾气里，十余名剑客按八方方位站定，剑尖齐指来路。'],
      ['刑天', '这就是我花了十年钻研的「无敌剑阵」。八方剑位，环环相扣；破了一角，其余立刻补上。', 'xingtian'],
      ['刑天', '阵心那两块圣坛能让人伤势复原。别让我的弟子守在上面——这是我唯一的提醒。', 'xingtian'],
      ['诺鲁', '把破绽说得这么清楚，不怕我们钻空子？', 'nuolu'],
      ['刑天', '剑客交手，要赢就赢得光明正大。何况——知道了，也未必破得了。', 'xingtian'],
      ['秋月', '清风，阵里每一个人都是刑天亲手教出来的。他们的剑不算最快，可从来不会落单。', 'qiuyue'],
      ['依琳娜', '那我们也不能落单。一步一步推进，彼此照应。', 'yilinna'],
      ['戴薇拉', '呵，这阵势倒让我想起十年前，孟祈带着我们闯黑魔神城的时候。年轻人，跟紧了。', 'dvra'],
      ['?', '秋月轻声问：「你……会伤他吗？」', [
        { label: '「我答应你，不取他的性命。」', rel: { qiuyue: 10 }, auto: true, say: [
          ['秋月', '谢谢你。……你真是个不像剑客的剑客。', 'qiuyue'],
        ] },
        { label: '「刀剑无眼，我只能尽力。」', rel: { qiuyue: 5 }, say: [
          ['秋月', '……也是。换作他，也会这么说。', 'qiuyue'],
        ] },
      ]],
      ['刑天', '剑阵——起！', 'xingtian'],
    ],
    outro: [
      ['刑天', '……阵破了。十年的心血，原来还缺了一样东西。', 'xingtian'],
      ['彦清风', '缺了什么？', 'qingfeng'],
      ['刑天', '缺了你们那种明知会受伤、还要护着同伴的笨拙。我的弟子守的是一个「阵」，你们守的是「人」。', 'xingtian'],
      ['刑天', '这把「冥魄」随我多年，饮过的血比你喝过的酒还多。从今天起，它为你们出鞘。', 'xingtian'],
      ['秋月', '这是师门的阴剑「地宁」。我离开的时候带走了它……现在，连人一起还给你们。', 'qiuyue'],
      ['彦清风', '欢迎回来，秋月。还有——欢迎你，刑天。', 'qingfeng'],
      ['刑天', '别叫得那么亲热。我只是想看看，你那股傻气能把这片大陆带到哪里去。', 'xingtian'],
      ['旁白', '刑天与秋月加入了队伍。得到「古剑-冥魄」与「地宁-阴剑」。'],
    ],
    onWin: { join: ['xingtian', 'qiuyue'], set: { xingtianJoined: true }, item: { ancientSword: 1, yinSwordItem: 1 } },
    next: 'g2_52',
    reward: 4500,
    shop: ['dragonSword', 'sunBow', 'starStaff', 'spiritCape', 'healFruit'],
  });

  // =================================================================
  // 第 52 关 · 花去飘香（百花部的伏击）
  // =================================================================
  const M52 = [
    'MMFFHHRRHHFFMM',
    'MFFGGHRRHGGFFM',
    'FFGGGGGRGGGGFF',
    'FGGVGGGRGGGVGF',
    'FGGGGFGRGFGGGF',
    'HGGGTTTBTTGGGH',
    'HGGTTWWBWTTGGH',
    'FGGGTTTBTTGGGF',
    'FGGGGGGRGGGGGF',
    'FFGFGGRRGGFGFF',
    'FFGGGGRGGGGGFF',
    'MFFGGRRGGGGFFM',
    'MFFGGRGGGGFFFM',
    'MMFFGRGGGFFMMM',
    'MMMFGRRGFFMMMM',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_52', no: 52, title: '花去飘香', part: PART, level: 23,
    map: M52,
    heights: hmap(M52, (x, y, c, h) => c === 'M' ? 3 : y <= 1 ? h + 1 : c === 'H' ? 2 : h),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 7,
    start: [[5, 12], [6, 12], [4, 13], [5, 13], [6, 13], [5, 14], [6, 14], [7, 13]],
    units: [
      ['assassin', 26, 7, 0, { team: 'enemy', name: '夜来香', boss: true, ai: 'hold' }],
      ['archer', 23, 5, 1, { team: 'enemy', name: '百花弓姬', ai: 'hold' }],
      ['archer', 23, 8, 1, { team: 'enemy', name: '百花弓姬', ai: 'hold' }],
      ['prayer', 23, 7, 2, { team: 'enemy', name: '百花祭司', ai: 'hold' }],
      ['illusionist', 23, 3, 3, { team: 'enemy', name: '百花幻姬', ai: 'hold' }],
      ['illusionist', 23, 11, 3, { team: 'enemy', name: '百花幻姬', ai: 'hold' }],
      ['treant', 23, 4, 4, { team: 'enemy', name: '食人花' }],
      ['treant', 23, 9, 4, { team: 'enemy', name: '食人花' }],
      ['assassin', 23, 2, 6, { team: 'enemy', name: '百花刺客' }],
      ['assassin', 23, 11, 6, { team: 'enemy', name: '百花刺客' }],
      ['assassin', 23, 1, 8, { team: 'enemy', name: '百花刺客' }],
    ],
    chests: [[0, 6, 'wisdomFruit'], [13, 6, 'magicWine'], [12, 1, 'spiritCape']],
    win: { type: 'boss' },
    lose: { units: ['qingfeng'] },
    events: [
      { turn: 2,
        spawn: [
          ['assassin', 23, 1, 10, { team: 'enemy', name: '百花刺客' }],
          ['assassin', 23, 12, 10, { team: 'enemy', name: '百花刺客' }],
        ],
        dialog: [
          ['夜来香', '花落之处，就是你们的退路——可惜，已经没有了。', 'enemy:assassin'],
          ['伊娃', '身后也有人！清风，后面交给我！', 'eva'],
        ] },
      { turn: 5,
        dialog: [
          ['旁白', '一阵山风卷过谷底，花瓣漫天飞散。浓得发腻的香气，终于淡了下去。'],
          ['拉维司', '迷香散了！手脚不麻了——现在轮到我们反击！', 'laweisi'],
        ] },
    ],
    intro: [
      ['旁白', '越过鹰族的山岭，一行人走进一座开满奇花的山谷。粉的、紫的、白的花海一直铺到天边，香气浓得几乎能尝出甜味。'],
      ['诺鲁', '哇！打了这么久的仗，总算有个像样的地方能歇歇脚了！', 'nuolu'],
      ['索妮亚', '别乱跑，诺鲁。这里安静得连一声鸟叫都没有。', 'sonia'],
      ['拉维司', '……不对。这香味里混着「醉仙花粉」，是蛊族拿来迷倒猎物的东西。大家快掩住口鼻！', 'laweisi'],
      ['艾芙琳', '难怪……我的指尖已经开始发麻了。', 'aifulin'],
      ['if', { flag: 'xingtianJoined' }, [
        ['刑天', '百花部。迦纳暗中养着的一群女刺客，以花为号，专做见不得光的事。看来有人把我们的行踪卖了。', 'xingtian'],
      ], [
        ['茱迪', '这种手法……我在镜湖城听过。一群以花为号的女刺客，叫「百花部」，没人知道她们真正替谁卖命。', 'judy'],
      ]],
      ['夜来香', '好灵的鼻子。可惜闻出来，也已经晚了。', 'enemy:assassin'],
      ['夜来香', '百花部「夜来香」，奉花主之命，来取彦清风的首级。姐妹们——让他们睡在花里吧。', 'enemy:assassin'],
      ['彦清风', '这片花海本身就是陷阱……大家背靠背，别被各个击破！', 'qingfeng'],
    ],
    outro: [
      ['夜来香', '不可能……百花部的伏击，从来没有失手过……', 'enemy:assassin'],
      ['夜来香', '呵……别高兴得太早。花主早就为你们准备好了更大的花园……你们想找的人，就在那里等着呢……', 'enemy:assassin'],
      ['旁白', '夜来香咬碎了藏在齿间的毒丸，倒进了花丛。山风吹过，满谷的花瓣纷纷凋落，香气转眼散尽。'],
      ['彦清风', '「你们想找的人」……她指的是谁？', 'qingfeng'],
      ['伊娃', '先别想了，你的手臂在流血。别动，我帮你包扎。', 'eva'],
      ['?', '伊娃低着头，仔细地替你缠上绷带。', [
        { label: '「谢谢你，伊娃。一直都是你在背后护着我。」', rel: { eva: 10 }, auto: true, say: [
          ['伊娃', '……这是近卫的本分。不过，你能注意到，我很高兴。', 'eva'],
        ] },
        { label: '「小伤而已，先去照顾其他人吧。」', rel: { eva: 3 }, say: [
          ['伊娃', '是。……你总是这样，把自己排在最后。', 'eva'],
        ] },
      ]],
    ],
    next: 'g2_54',
    reward: 4000,
    shop: ['antidote', 'healFlower', 'healFruit', 'magicFruit', 'swiftBoots'],
  });

  // =================================================================
  // 第 54 关 · 百花军团（以孟祈的消息设伏）
  // =================================================================
  const M54 = [
    'MMMMHCCCCHMMMM',
    'MMMHCCKCCCHMMM',
    'MMMHGCCCGGHMMM',
    'MMMMFGGRGFFMMM',
    'MMMFFGRRHHFMMM',
    'MMHHGRRGGGHMMM',
    'MHGGRRGFFMMMMM',
    'MGGRRGFMMMMMMM',
    'MGRRGGFFMMMMMM',
    'MMRGGGGFFFHHMM',
    'MMRRRRRRRRRGHM',
    'MMMFFGGHGGRRGM',
    'MMMMMMFFGGGRGH',
    'MHHFFGGGGRRRGH',
    'MGGGRRRRRRGGFM',
    'MGGRRGGGFFFMMM',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_54', no: 54, title: '百花军团', part: PART, level: 24,
    map: M54,
    heights: hmap(M54, (x, y, c, h) => (y <= 2 ? 3 : y <= 5 ? 2 : y <= 9 ? 1 : 0) + (c === 'H' || c === 'M' ? 1 : 0)),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 7,
    start: [[3, 15], [4, 15], [2, 14], [3, 14], [4, 14], [2, 15], [5, 15], [1, 14]],
    units: [
      ['illusionist', 27, 6, 1, { team: 'enemy', name: '牡丹', boss: true, ai: 'boss' }],
      ['archer', 24, 4, 2, { team: 'enemy', name: '百花弓姬', ai: 'hold' }],
      ['archer', 24, 9, 2, { team: 'enemy', name: '百花弓姬', ai: 'hold' }],
      ['prayer', 24, 7, 2, { team: 'enemy', name: '百花祭司', ai: 'hold' }],
      ['whiteKnight', 23, 7, 4, { team: 'enemy', name: '百花骑士' }],
      ['whiteKnight', 24, 6, 5, { team: 'enemy', name: '百花骑士' }],
      ['illusionist', 24, 10, 5, { team: 'enemy', name: '百花幻姬', ai: 'hold' }],
      ['sorcerer', 24, 2, 6, { team: 'enemy', name: '百花咒姬', ai: 'hold' }],
      ['assassin', 22, 4, 7, { team: 'enemy', name: '百花刺客' }],
      ['assassin', 22, 3, 9, { team: 'enemy', name: '百花刺客' }],
      ['assassin', 24, 8, 10, { team: 'enemy', name: '百花刺客' }],
    ],
    chests: [[1, 7, 'healFruit'], [12, 11, 'powerStone'], [8, 0, 'elixir']],
    win: { type: 'boss' },
    lose: { units: ['qingfeng'] },
    events: [
      { turn: 3, if: { not: { flag: 'baihuaDeal' } },
        spawn: [
          ['whiteKnight', 24, 12, 12, { team: 'enemy', name: '百花骑士' }],
          ['archer', 24, 13, 13, { team: 'enemy', name: '百花弓姬' }],
        ],
        dialog: [
          ['牡丹', '东侧的姐妹们，截断他们的退路！一个也别放下山！', 'enemy:illusionist'],
          ['杰诺', '后方出现敌骑！我去拦住他们，你们只管往上冲！', 'jienuo'],
        ] },
      { turn: 3, if: { flag: 'baihuaDeal' },
        dialog: [
          ['旁白', '东侧山坳里扬起一阵尘土——百花部的另一支人马果然依约撤下了山。'],
          ['牡丹', '哼，交易就是交易。不过我自己，可没说要走。', 'enemy:illusionist'],
        ] },
    ],
    intro: [
      ['旁白', '几天后，山脚的小镇上流传着一个奇怪的消息——落霞山上，有人见到一位穿着怪异衣裳的男子，自称「孟祈」。'],
      ['戴薇拉', '孟祈？！不可能……十年前那一战之后，他就回他自己的世界去了。', 'dvra'],
      ['茱迪', '可万一是真的呢？他要是回来了，一定是察觉到这片大陆又出事了。', 'judy'],
      ['彦清风', '十年前和无双女王、杨铁国王一起平定乱世的人……如果能见到他，也许就能知道杨铁国王为什么会变成今天这样。', 'qingfeng'],
      ['if', { has: 'furong' }, [
        ['芙蓉', '孟祈……真是个让人怀念的名字呢。（她微微一笑）去看看吧，清风，不管是真是假。', 'furong'],
      ]],
      ['杰诺', '我只担心这消息来得太巧了。前脚刚遇上百花部，后脚就有人把好消息送上门。', 'jienuo'],
      ['彦清风', '就算是陷阱，也值得走这一趟。大家打起精神。', 'qingfeng'],
      ['旁白', '落霞山顶。云雾之间，果然站着一个衣着奇异的男子，正朝山下挥手。'],
      ['戴薇拉', '那身衣服……是他！孟——', 'dvra'],
      ['牡丹', '呵呵呵，鹰族的女英雄，还是这么容易动情。', 'enemy:illusionist'],
      ['旁白', '男子的身影像水中倒影般晃了一晃，化成了一名手持花杖的女子。山道两侧的岩石后面，站起了密密麻麻的伏兵。'],
      ['牡丹', '百花部之主，牡丹。夜来香那丫头不中用，只好由我亲自招待各位。我要的东西只有一样——无双交给你的紫色同调石。', 'enemy:illusionist'],
      ['if', { item: 'syncGem' }, [
        ['牡丹', '交出来，我就让东侧的姐妹撤下山去。不然……落霞山就是你们的坟。', 'enemy:illusionist'],
        ['?', '要用同调石换取对方部分人马撤退吗？', [
          { label: '交出同调石', set: { gemGiven: true, baihuaDeal: true }, item: { syncGem: -1 }, say: [
            ['彦清风', '……拿去吧。但愿你说话算话。', 'qingfeng'],
            ['if', { flag: 'showedHermit' }, [
              ['旁白', '交出石头的那一刻，清风想起隐者克里斯曾经端详过它。不知为何，它的紫光比当初黯淡了许多。'],
            ]],
            ['牡丹', '识时务。——至于剩下的人，我可没答应要放过你们。', 'enemy:illusionist'],
            ['伊娃', '卑鄙……！', 'eva'],
          ] },
          { label: '拒绝', auto: true, say: [
            ['彦清风', '女王托付的东西，我不会拿来换自己的命。', 'qingfeng'],
            ['牡丹', '好骨气。那就带着它，一起埋在这座山上吧。', 'enemy:illusionist'],
          ] },
        ]],
      ], [
        ['彦清风', '同调石已经不在我们手上了。你来晚了一步。', 'qingfeng'],
        ['牡丹', '哦？……那就只好拿你们的命，回去向主上交差了。', 'enemy:illusionist'],
      ]],
    ],
    outro: [
      ['牡丹', '咳……百花凋零……也罢……', 'enemy:illusionist'],
      ['彦清风', '孟祈的消息，是你们编出来的？', 'qingfeng'],
      ['牡丹', '消息是假的，名字可是真的。这片大陆上，还有好多人在等那个异界的英雄回来呢……真可怜。', 'enemy:illusionist'],
      ['牡丹', '告诉你也无妨。百花部效忠的不是杨铁，是黑石大人。他要用「召魂大法」，把十年前死去的东西，统统叫回来……', 'enemy:illusionist'],
      ['旁白', '牡丹的身子化作一阵花瓣，随风散去了。'],
      ['戴薇拉', '……我竟然被一个幻影骗了。孟祈要是知道，一定会笑我老糊涂。', 'dvra'],
      ['?', '依琳娜走到你身边，轻轻拉了拉你的衣袖。', [
        { label: '「我们一定会查出真相。一起。」', rel: { yilinna: 10 }, auto: true, say: [
          ['依琳娜', '嗯。……有你在，我好像什么都不怕了。', 'yilinna'],
        ] },
        { label: '「公主，你不该跟着我们冒这种险。」', rel: { yilinna: -5 }, say: [
          ['依琳娜', '我不是只会待在王宫里的公主。……请别再把我当成需要被保护的人。', 'yilinna'],
        ] },
      ]],
      ['彦清风', '黑石……召魂大法。我们必须赶在他前面。', 'qingfeng'],
    ],
    next: 'g2_56',
    reward: 5000,
    shop: ['sunBow', 'starStaff', 'goldArmor', 'amulet', 'healFruit'],
  });

  // =================================================================
  // 第 56 关 · 崩坏的秩序（弃城后的萨隆城）
  // =================================================================
  const M56 = [
    'XXXXXXRRXXXXXX',
    'XCCCCXRRXCCCCX',
    'XCVVGHRRHGVVCX',
    'XHGGGCCCCGGGHX',
    'XXGVGCCCCGVGXX',
    'RRGGCCCCCCGGRR',
    'XHGGCCCCCCGGHX',
    'XVGHCCKKCCHGVX',
    'XCGGCCCCCCGGCX',
    'XXGVGGRRGGVGXX',
    'XHGGGHRRHGGGHX',
    'XCVVGGRRGGVVCX',
    'XCCCCXRRXCCCCX',
    'XXXXXXRRXXXXXX',
    'GGGFFGRRGFFGGG',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_56', no: 56, title: '崩坏的秩序', part: PART, level: 24,
    map: M56,
    // 城墙走道高 3、钟楼高 3（其阶梯 2）、瓦砾堆高 2、房屋高 1
    heights: hmap(M56, (x, y, c, h) => (y === 1 || y === 12) && c === 'C' ? 3 : y === 4 && x === 6 ? 3 : y === 4 && (x === 5 || x === 7) ? 2 : c === 'H' ? 2 : c === 'V' || c === 'K' ? 1 : 0),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 7,
    start: [[6, 14], [7, 14], [5, 14], [8, 14], [6, 13], [7, 13], [4, 14], [9, 14]],
    units: [
      ['soldier', 24, 5, 7, { team: 'ally', name: '萨隆自卫队' }],
      ['soldier', 24, 8, 7, { team: 'ally', name: '萨隆自卫队' }],
      ['fighter', 24, 6, 8, { team: 'ally', name: '铁匠大叔' }],
      ['priest', 24, 7, 6, { team: 'ally', name: '萨隆修士' }],
      ['archer', 26, 6, 4, { team: 'enemy', name: '弓兵头目', boss: true, ai: 'hold' }],
      ['archer', 24, 2, 1, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['archer', 24, 11, 1, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['crossbow', 24, 4, 1, { team: 'enemy', name: '弃城弩手', ai: 'hold' }],
      ['crossbow', 24, 9, 1, { team: 'enemy', name: '弃城弩手', ai: 'hold' }],
      ['archer', 24, 1, 3, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['archer', 24, 12, 3, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['archer', 23, 1, 10, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['archer', 23, 12, 10, { team: 'enemy', name: '弃城弓兵', ai: 'hold' }],
      ['bandit', 24, 0, 5, { team: 'enemy', name: '趁火打劫的暴兵' }],
      ['bandit', 24, 13, 5, { team: 'enemy', name: '趁火打劫的暴兵' }],
    ],
    chests: [[1, 11, 'magicWine'], [12, 8, 'goldArmor'], [7, 1, 'healFruit']],
    win: { type: 'rout' },
    lose: { units: ['qingfeng'], npcAll: true },
    events: [
      { turn: 3,
        spawn: [
          ['bandit', 24, 0, 5, { team: 'enemy', name: '趁火打劫的暴兵' }],
          ['bandit', 24, 13, 5, { team: 'enemy', name: '趁火打劫的暴兵' }],
        ],
        dialog: [
          ['弓兵头目', '东西两门的弟兄，给我冲进广场！把那些不肯交粮的家伙全宰了！', 'enemy:archer'],
          ['萨隆自卫队', '他们从两边城门进来了！我们……我们撑不了多久！', 'enemy:soldier'],
          ['艾芙琳', '别慌，我们这就过去！', 'aifulin'],
        ] },
    ],
    intro: [
      ['旁白', '循着牡丹留下的线索北上，一行人来到迦纳边境的小城萨隆。这里曾是商旅往来的要冲，如今城墙半塌，满街碎瓦。'],
      ['旁白', '迦纳守军早已弃城而逃。留下的弓兵却占了钟楼与城墙，自封为萨隆的主人，向城民强征粮食。'],
      ['萨隆自卫队', '你们……不是迦纳兵？求求你们，帮帮这座城吧！', 'enemy:soldier'],
      ['弓兵头目', '又来一群不怕死的。城墙上的弟兄，箭都给我搭上！', 'enemy:archer'],
      ['艾芙琳', '他们占着高处，箭能射得比平地更远、更准。得先护住广场上的镇民。', 'aifulin'],
      ['索妮亚', '交给我。弓手对弓手，就看谁更沉得住气。', 'sonia'],
      ['杰诺', '弃城的军队、占城为王的散兵……秩序一旦崩坏，最先遭殃的永远是百姓。', 'jienuo'],
      ['彦清风', '自卫队的各位，千万别冲出去！我们会把城墙上的人一个一个拉下来！', 'qingfeng'],
    ],
    outro: [
      ['旁白', '最后一名弓兵从钟楼上摔落，萨隆城终于安静了下来。'],
      ['萨隆镇长', '……谢谢你们。可是，能不能请你们尽快离开？', 'enemy:villager'],
      ['诺鲁', '什么？我们刚救了你们耶！', 'nuolu'],
      ['萨隆镇长', '迦纳军撤走前说过，只要有反抗军进城，他们就会回来屠城……我们，再也经不起了。', 'enemy:villager'],
      ['?', '镇长低着头，不敢看你们的眼睛。', [
        { label: '「是我们考虑不周，给大家添麻烦了。」', rel: { yilinna: 10 }, auto: true, say: [
          ['彦清风', '对不起。我们只想着赶路，却没想过留下来的人要承受什么。', 'qingfeng'],
          ['萨隆镇长', '你……你是在向我们道歉？打了这么多年仗，你是第一个。', 'enemy:villager'],
          ['依琳娜', '肯向百姓低头的人，才配得上保护他们。……清风，我没有看错你。', 'yilinna'],
        ] },
        { label: '「该害怕的是迦纳，不是你们。」', rel: { eva: 5 }, say: [
          ['彦清风', '迦纳若敢回来，我们就再把他们打出去。萨隆不该一直跪着活下去。', 'qingfeng'],
          ['伊娃', '说得好。女王陛下也常说，恐惧只会让敌人更加得寸进尺。', 'eva'],
        ] },
        { label: '默默转身离开', say: [
          ['旁白', '清风没有回答，只是向镇长深深一揖，带着同伴走出了城门。'],
        ] },
      ]],
      ['彦清风', '走吧。牡丹说的黑石……据点就在前面的魂葬谷。', 'qingfeng'],
    ],
    next: 'g2_58',
    reward: 3500,
    shop: ['divineLance', 'thunderHammer', 'spiritCape', 'healFlower', 'magicFruit'],
  });

  // =================================================================
  // 第 58 关 · 召魂大法（东北宝箱后 → 隐藏关 疯人院）
  // =================================================================
  const M58 = [
    'MMMMMHDDHMMMHG',
    'MMMHDDDDDDHMGG',
    'MMHDYDKKDYDHGG',
    'MHDDDKKKKDDDHM',
    'MHDLDKKKKDLDHM',
    'MHDLDDDDDDDLDM',
    'MMDLYDDDDYDLHM',
    'MMDDDDLLDDDDHM',
    'MHDDDLLDDDDDDM',
    'MFDDDDDDLDDDFM',
    'MFFDDDDDLLDFFM',
    'MMFGDDDDDDDGFM',
    'MMFGGDDRDDGGFM',
    'MMMFGGRRRGGFMM',
    'MMMMFGRRRGFMMM',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_58', no: 58, title: '召魂大法', part: PART, level: 26,
    map: M58,
    heights: hmap(M58, (x, y, c, h) => c === 'Y' ? 3 : x >= 12 && y <= 2 ? 2 : c === 'K' ? 2 : y <= 4 && c === 'D' ? 1 : h),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 7,
    start: [[6, 13], [7, 13], [8, 13], [6, 14], [7, 14], [8, 14], [5, 13], [9, 13]],
    units: [
      ['sorcerer', 30, 6, 3, { team: 'enemy', name: '黑石', boss: true, ai: 'boss', learned: ['soulSummon', 'demonCurse'] }],
      ['sorcerer', 26, 5, 2, { team: 'enemy', name: '黑石术士', ai: 'hold' }],
      ['sorcerer', 26, 8, 2, { team: 'enemy', name: '黑石术士', ai: 'hold' }],
      ['medusa', 26, 8, 5, { team: 'enemy', name: '夜魔女', ai: 'hold' }],
      ['gargoyle', 26, 2, 5, { team: 'enemy', name: '石像鬼' }],
      ['gargoyle', 26, 11, 5, { team: 'enemy', name: '石像鬼' }],
      ['beast', 26, 3, 7, { team: 'enemy', name: '魔兵' }],
      ['beast', 26, 10, 7, { team: 'enemy', name: '魔兵' }],
      ['beast', 26, 6, 9, { team: 'enemy', name: '魔兵' }],
      ['darkKnight', 26, 4, 9, { team: 'enemy', name: '黑石骑士' }],
      ['darkKnight', 26, 10, 9, { team: 'enemy', name: '黑石骑士' }],
      ['medusa', 26, 4, 5, { team: 'enemy', name: '夜魔女', ai: 'hold' }],
      ['giant', 26, 9, 8, { team: 'enemy', name: '骨巨人', ai: 'hold' }],
    ],
    chests: [[12, 1, 'starStaff'], [1, 9, 'magicFruit'], [12, 9, 'healFruit']],
    win: { type: 'boss', turns: 18 },
    lose: { units: ['qingfeng'] },
    secret: { at: [13, 0], to: 'g2_64', msg: '宝箱后的岩壁上有一道窄缝，里面隐约传来疯癫的笑声……胜利后将前往该处。' },
    events: [
      { turn: 4,
        spawn: [['beast', 26, 5, 4, { team: 'enemy', name: '亡魂' }], ['beast', 26, 8, 4, { team: 'enemy', name: '亡魂' }]],
        dialog: [
          ['黑石', '法阵第六圈……醒来吧，被英雄们踩在脚下的亡魂！', 'enemy:sorcerer'],
        ] },
      { turn: 8,
        spawn: [['beast', 26, 5, 5, { team: 'enemy', name: '亡魂' }], ['gargoyle', 26, 8, 5, { team: 'enemy', name: '亡魂' }]],
        dialog: [
          ['黑石', '第十二圈！听见了吗？谷底的哭声越来越大了！', 'enemy:sorcerer'],
          ['if', { has: 'qili' }, [
            ['栖历', '法阵已经转过一大半了！再不打断他，整座山谷都会变成死地！', 'qili'],
          ], [
            ['拉维司', '法阵在吸周围的生气……再拖下去，我们全都会被吸干！', 'laweisi'],
          ]],
        ] },
      { turn: 13,
        spawn: [['beast', 27, 4, 3, { team: 'enemy', name: '亡魂' }], ['beast', 27, 9, 3, { team: 'enemy', name: '亡魂' }]],
        dialog: [
          ['黑石', '只差最后几圈了……哈哈哈，十年了，我等这一天等了整整十年！', 'enemy:sorcerer'],
          ['彦清风', '快！在第十八回合之前击倒黑石！', 'qingfeng'],
        ] },
    ],
    intro: [
      ['旁白', '魂葬谷。十年前，黑魔神的大军在这里全军覆没。谷底至今寸草不生，连风里都带着一股铁锈味。'],
      ['旁白', '谷心的祭坛上，一个披着黑袍的老人高举骨杖，脚下的血色法阵一圈一圈地亮起。'],
      ['黑石', '来得比我想的还快。牡丹那孩子，终究没能拦住你们。', 'enemy:sorcerer'],
      ['彦清风', '你就是黑石？住手！把死去的人叫回来，你到底想做什么？', 'qingfeng'],
      ['黑石', '做什么？十年前，孟祈和他的伙伴在这座山谷里杀了成千上万的生灵。魔也好、人也好，全成了他们脚下的亡魂。', 'enemy:sorcerer'],
      ['黑石', '召魂大法一成，它们都会回来。到时候，就让那些所谓的英雄，尝尝被自己杀死的东西追索的滋味！', 'enemy:sorcerer'],
      ['if', { has: 'furong' }, [
        ['芙蓉', '……召魂大法。那种禁术，不该再出现在这世上。', 'furong'],
        ['彦清风', '芙蓉？你知道这个法术？', 'qingfeng'],
        ['芙蓉', '只是在古书上读过罢了。（她的手在袖中，悄悄握紧了）', 'furong'],
      ]],
      ['艾芙琳', '法阵会越转越快。等它转满十八圈，就再也挡不住了。', 'aifulin'],
      ['戴薇拉', '十年前我就在这座谷里。那时死的人已经够多了——我不会让他们再被拖出来受辱！', 'dvra'],
      ['黑石', '亡魂们，醒来吧！', 'enemy:sorcerer'],
    ],
    outro: [
      ['黑石', '不……法阵……只差一点……', 'enemy:sorcerer'],
      ['黑石', '呵呵……你们以为毁掉这具肉身就结束了？我的魂魄……早就寄在黑石堡里了……', 'enemy:sorcerer'],
      ['旁白', '黑石的身体化成一滩焦黑的灰。一缕黑烟钻进地缝，向北方飘去。'],
      ['彦清风', '北方……黑石堡？', 'qingfeng'],
      ['if', { has: 'furong' }, [
        ['?', '芙蓉望着黑烟消失的方向，神情复杂。', [
          { label: '「你好像有心事。愿意的话，可以跟我说。」', rel: { furong: 10 }, auto: true, say: [
            ['芙蓉', '……谢谢你。等这一切结束，我会告诉你的。我保证。', 'furong'],
          ] },
          { label: '「你到底在隐瞒什么？」', rel: { furong: -10 }, say: [
            ['芙蓉', '每个人都有不想说的事，清风。……包括你那位女王陛下。', 'furong'],
          ] },
        ]],
      ]],
      ['伊娃', '不管他逃到哪里，我们都追上去。', 'eva'],
    ],
    next: 'g2_67',
    reward: 5000,
    shop: ['earthStaff', 'blueDragonBlade', 'goldArmor', 'healFruit', 'magicFruit'],
  });

  // =================================================================
  // 隐藏关 · 疯人院（从召魂大法东北角进入）
  // =================================================================
  const M64 = [
    'XXXXXXXXXXXXX',
    'XOOCXKKKXCOOX',
    'XOCCXKKKXCCOX',
    'XCCCXCKCXCCCX',
    'XXCXXXCXXXCXX',
    'XCCCCCCCCCCCX',
    'XCXOXCCCXOXCX',
    'XCXCXCYCXCXCX',
    'XCCCCCCCCCCCX',
    'XCXOXCCCXOXCX',
    'XCXCXCYCXCXCX',
    'XCCCCCCCCCCCX',
    'XXXXXCCCXXXXX',
    'XFGGGGRGGGGFX',
    'FFGGGRRRGGGFF',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_64', no: 64, title: '疯人院', part: PART, level: 30, secretStage: true,
    map: M64,
    heights: hmap(M64, (x, y, c, h) => c === 'Y' ? 3 : y <= 3 && x >= 5 && x <= 7 ? 1 : y >= 5 && y <= 11 ? (c === 'O' ? 0 : 1) : h),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 6,
    start: [[6, 13], [5, 13], [7, 13], [6, 14], [5, 14], [7, 14]],
    units: [
      ['sorcerer', 33, 6, 2, { team: 'enemy', name: '院长', boss: true, ai: 'boss', learned: ['soulSummon'] }],
      ['captain', 30, 10, 1, { team: 'enemy', name: '狱卒', ai: 'hold' }],
      ['captain', 30, 6, 5, { team: 'enemy', name: '狱卒', ai: 'hold' }],
      ['gushi', 30, 2, 1, { team: 'enemy', name: '疯癫蛊师', ai: 'hold' }],
      ['bandit', 30, 3, 6, { team: 'enemy', name: '疯人' }],
      ['bandit', 30, 9, 6, { team: 'enemy', name: '疯人' }],
      ['bandit', 30, 3, 9, { team: 'enemy', name: '疯人' }],
      ['fighter', 30, 9, 9, { team: 'enemy', name: '狂暴疯人' }],
      ['fighter', 30, 6, 8, { team: 'enemy', name: '狂暴疯人' }],
      ['wolfman', 30, 1, 11, { team: 'enemy', name: '兽化疯人' }],
      ['wolfman', 30, 11, 11, { team: 'enemy', name: '兽化疯人' }],
    ],
    chests: [[1, 1, 'lifeFruit'], [11, 1, 'wisdomFruit'], [7, 1, 'magicBoots']],
    win: { type: 'rout' },
    lose: { units: ['qingfeng'] },
    events: [
      { turn: 3,
        spawn: [['wolfman', 30, 3, 2, { team: 'enemy', name: '兽化疯人' }], ['wolfman', 30, 9, 2, { team: 'enemy', name: '兽化疯人' }]],
        dialog: [
          ['旁白', '走廊深处传来铁门被撞飞的巨响。两个浑身长满灰毛、四肢着地的「人」冲了出来。'],
          ['诺鲁', '那、那是人吗？怎么跟野兽一样……', 'nuolu'],
          ['院长', '我最得意的作品。半个魂魄被抽走之后，剩下的就只记得撕咬。', 'enemy:sorcerer'],
        ] },
    ],
    intro: [
      ['旁白', '岩缝的尽头是一座被遗忘的石砌建筑。铁门上的牌子锈得只剩几个字：「……疗养院」。'],
      ['旁白', '门内传来此起彼伏的笑声、哭声，还有铁链在地上拖行的声音。'],
      ['诺鲁', '这、这是什么地方……我宁可再去闯一次剑阵。', 'nuolu'],
      ['艾芙琳', '是收容病人的地方……可是这些人身上，全都烙着法阵的痕迹。', 'aifulin'],
      ['院长', '访客？好久没有访客了。来得正好，我的病人们正缺新的玩伴。', 'enemy:sorcerer'],
      ['院长', '黑石大人的召魂大法需要「容器」。这些可怜虫的魂魄被抽走了一半——剩下的另一半，正好拿来装别的东西。', 'enemy:sorcerer'],
      ['疯人', '嘻嘻……英雄……英雄冢……大家都睡在那里……嘻嘻嘻……', 'enemy:bandit'],
      ['彦清风', '英雄冢？', 'qingfeng'],
      ['院长', '疯子的胡话，别放在心上。来吧，让我看看，你们的魂魄是什么颜色。', 'enemy:sorcerer'],
      ['伊娃', '清风……这些人，已经救不回来了吗？', 'eva'],
      ['彦清风', '……至少，别再让他们被人利用了。', 'qingfeng'],
    ],
    outro: [
      ['旁白', '疗养院终于安静了下来。在院长的书房里，一行人找到一本厚厚的病历。'],
      ['艾芙琳', '「第十七号，兽化反应剧烈，已秘密转送迦纳王都。」……兽化？', 'aifulin'],
      ['戴薇拉', '迦纳王都……难道杨铁的变化，也跟这里的实验有关？', 'dvra'],
      ['彦清风', '还有这一页。画着一座被藤蔓覆盖的古墓，旁边写着：「英雄冢——召魂之源，前代英雄长眠之地」。', 'qingfeng'],
      ['if', { item: 'oldScroll' }, [
        ['依琳娜', '这个图案……和父王交给我的那卷神秘卷轴上画的一模一样！', 'yilinna'],
        ['彦清风', '原来卷轴指的，就是英雄冢的位置……', 'qingfeng'],
      ]],
      ['if', { has: 'furong' }, [
        ['旁白', '病历的最后几页被人撕走了，撕口还很新。'],
        ['芙蓉', '……走吧。这里的空气，让人喘不过气。', 'furong'],
      ]],
      ['伊娃', '我想起了王城沦陷那天。那些人哭喊的样子……跟这里的病人好像。清风，答应我，一定要阻止这一切。', 'eva'],
      ['?', '伊娃紧紧握着长枪，等着你的回答。', [
        { label: '「我答应你。一起把这场噩梦结束掉。」', rel: { eva: 10 }, auto: true, say: [
          ['伊娃', '……嗯。只要和你一起，我就能一直走下去。', 'eva'],
        ] },
        { label: '「我只能说，我会尽力。」', rel: { eva: 3 }, say: [
          ['伊娃', '这样就够了。你从来不说做不到的事。', 'eva'],
        ] },
      ]],
    ],
    onWin: { set: { madhouse: true } },
    next: 'RETURN',
    reward: 6000,
    shop: ['spiritStaff', 'thunderHammer', 'healFruit', 'magicFruit'],
  });

  // =================================================================
  // 第 67 关 · 黑石魂魄
  // =================================================================
  const M67 = [
    'MXXXXXXXXXXXXM',
    'MXDDDDKKDDDDXM',
    'MXDYDDKKDDYDXM',
    'MXDDDDKKDDDDXM',
    'MXXDXXCCXXDXXM',
    'MHDDDDCCDDDDHM',
    'MHDYDDCCDDYDHM',
    'MXXCXXCCXXCXXM',
    'LLLBLLBBLLBLLL',
    'LLLBLLBBLLBLLL',
    'HDDDDDRRDDDDDH',
    'HDHDDDRRDDDHDH',
    'MDDDFDRRDFDDDM',
    'MMDDDDRRDDDDMM',
    'MMFDDRRRRDDFMM',
    'MMMFDRRRRDFMMM',
  ];
  CAMPAIGN_STAGES.g2.push({
    id: 'g2_67', no: 67, title: '黑石魂魄', part: PART, level: 27,
    map: M67,
    heights: hmap(M67, (x, y, c, h) => c === 'Y' ? 3 : y >= 1 && y <= 3 ? 2 + (c === 'K' ? 1 : 0) : y >= 4 && y <= 7 ? 1 + (c === 'H' ? 1 : 0) : h),
    heroes: ALL, required: ['qingfeng'], maxDeploy: 8,
    start: [[6, 14], [7, 14], [5, 14], [8, 14], [6, 15], [7, 15], [5, 15], [8, 15]],
    units: [
      ['demon', 30, 6, 1, { team: 'enemy', name: '黑石魂魄', boss: true, ai: 'boss', learned: ['soulSummon', 'demonCurse'] }],
      ['giant', 27, 7, 3, { team: 'enemy', name: '黑石巨像', ai: 'hold' }],
      ['sorcerer', 27, 2, 2, { team: 'enemy', name: '黑石术士', ai: 'hold' }],
      ['sorcerer', 27, 11, 2, { team: 'enemy', name: '黑石术士', ai: 'hold' }],
      ['darkKnight', 27, 6, 5, { team: 'enemy', name: '黑石骑士', ai: 'hold' }],
      ['darkKnight', 27, 7, 5, { team: 'enemy', name: '黑石骑士', ai: 'hold' }],
      ['crossbow', 27, 3, 7, { team: 'enemy', name: '黑石弩手', ai: 'hold' }],
      ['crossbow', 27, 10, 7, { team: 'enemy', name: '黑石弩手', ai: 'hold' }],
      ['gargoyle', 27, 4, 9, { team: 'enemy', name: '魂火石像' }],
      ['gargoyle', 27, 9, 9, { team: 'enemy', name: '魂火石像' }],
      ['beast', 27, 3, 11, { team: 'enemy', name: '魔兵' }],
      ['beast', 27, 10, 11, { team: 'enemy', name: '魔兵' }],
      ['beast', 27, 6, 10, { team: 'enemy', name: '魔兵' }],
    ],
    chests: [[2, 1, 'dragonScale'], [11, 1, 'elixir'], [12, 12, 'healFruit']],
    win: { type: 'boss' },
    lose: { units: ['qingfeng'] },
    events: [
      { turn: 5,
        spawn: [['gargoyle', 27, 5, 8, { team: 'enemy', name: '魂火石像' }], ['gargoyle', 27, 8, 8, { team: 'enemy', name: '魂火石像' }]],
        dialog: [
          ['黑石魂魄', '城墙的守卫们，醒来！把这些闯进我身体里的虫子烧成灰！', 'enemy:demon'],
          ['if', { has: 'rentian' }, [
            ['任天', '熔岩里又爬出来了……他在用整座城堡的魔力。速战速决！', 'rentian'],
          ], [
            ['杰诺', '熔岩里又爬出东西来了！别在桥上停留太久！', 'jienuo'],
          ]],
        ] },
    ],
    intro: [
      ['旁白', '黑石堡矗立在熔岩河中央，城墙被烧得乌黑。一缕缕黑烟在塔楼间盘旋，像是有生命一般。'],
      ['彦清风', '黑石的魂魄，就藏在这里。', 'qingfeng'],
      ['黑石魂魄', '来吧，来吧……这座城堡就是我的身体，每一块石头都是我的骨头。', 'enemy:demon'],
      ['黑石魂魄', '召魂大法虽然没成，可吸来的亡魂已经够我脱离肉身了——不老、不死，永远都在！', 'enemy:demon'],
      ['if', { flag: 'xingtianJoined' }, [
        ['刑天', '不死？那我倒想试试，冥魄能不能斩断一个魂魄。', 'xingtian'],
      ]],
      ['if', { has: 'qiuyue' }, [
        ['秋月', '魂魄寄在城里，那城的「心」就是他的要害——王座上那团黑雾。', 'qiuyue'],
      ]],
      ['艾芙琳', '这里的魔气太重了。大家守住心神，别被它吞噬。', 'aifulin'],
      ['杰诺', '熔岩河上只有三座桥，被堵住就麻烦了。分三路过河！', 'jienuo'],
      ['依琳娜', '我会在后方为大家祈祷。……请一定要平安回来。', 'yilinna'],
      ['彦清风', '结束吧——为了萨隆城的人，为了疗养院里的病人，也为了魂葬谷里不得安息的亡魂！', 'qingfeng'],
    ],
    outro: [
      ['黑石魂魄', '不……我的魂……正在散开……', 'enemy:demon'],
      ['黑石魂魄', '哈……哈哈……你们以为我是最后的敌人？召魂大法，不过是借来的法术……真正想把亡魂叫回来的人……是……', 'enemy:demon'],
      ['旁白', '话还没说完，黑烟便被一阵凭空而起的风撕得粉碎。黑石堡的城墙一块接一块崩落，沉进了熔岩之中。'],
      ['彦清风', '他最后想说的……到底是谁？', 'qingfeng'],
      ['if', [{ flag: 'baihuaDeal' }, { not: { item: 'syncGem' } }], [
        ['旁白', '崩塌的王座下滚出一颗紫色的石头——正是在落霞山交给牡丹的那颗同调石。'],
        ['do', { item: { syncGem: 1 }, set: { gemGiven: false } }],
        ['彦清风', '女王的托付……总算又回到我手里了。', 'qingfeng'],
      ]],
      ['if', { flag: 'xingtianHostile' }, [
        ['旁白', '离开黑石堡时，清风在焦土上看见一柄插在地上的长剑。剑穗上系着一张字条，只有一行字。'],
        ['彦清风', '「帝都之前，断崖之上，一决生死。——刑天」……他在等我。', 'qingfeng'],
      ], [
        ['if', { flag: 'xingtianJoined' }, [
          ['刑天', '下一站就是迦纳帝都了。杨铁的王宫我熟，跟着我走。', 'xingtian'],
        ]],
      ]],
      ['戴薇拉', '是时候了。直取迦纳帝都，当面问杨铁一个明白！', 'dvra'],
    ],
    next: [{ to: 'g2_91', if: { flag: 'xingtianHostile' } }, { to: 'g2_61' }],
    reward: 5500,
    shop: ['spiritStaff', 'earthStaff', 'sunBow', 'dragonSword', 'healFruit', 'magicFruit'],
  });
})();
