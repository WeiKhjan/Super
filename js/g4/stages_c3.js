// 狂神降世 · 第三章「暗潮涌动」（A 线与 B1 共用，负责人 D）
// g4_31 不自量力 → g4_32 关卡前夜 → g4_33 尽忠职守 → g4_34 步步危机 → g4_35 危急之秋 → g4_36 幽冥路 → g4_37 天牢
//   g4_37 依 line 分歧：B（B1）→ g4_53；A 同意麦斯（A2）→ g4_61；A 不同意（A1）→ g4_51
// 隐藏关：g4_39 海兽利维亚桑（g4_31 港口最外侧码头）
// 剧情依原作资料改编，对白为重新撰写。
'use strict';
(function () {
  const PART = '第三章 · 暗潮涌动';
  const CORE = ['kehelin', 'maisi', 'tao', 'bobi', 'kouqi', 'lida', 'beiliqina', 'pulusi', 'baihe', 'liqi'];

  // -------------------------------------------------------------------
  // 第 31 关 不自量力（西风港）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_31', no: 31, title: '不自量力', part: PART, level: 14,
    map: [
      'WWWWWWWWWWWBWW',
      'WWWBWWWWWWWBWW',
      'WWWBWWWBWWWBWW',
      'WWWBWWWBWWWBWW',
      'CCCCCCCCCCCCCT',
      'CXXCCVCCCXXCCT',
      'CXXCCCCCCXXCVG',
      'CCCCCRRRCCCCCG',
      'VCCXCRRRCXCCGG',
      'CCCXCCCCCXCGGH',
      'GCCCCCRCCCCGHH',
      'GGVGGGRGGVGGGF',
      'FGGGGGRGGGGGFF',
      'FFGGGRRGGGGGFF',
      'FFGGGRRRGGGHFF',
    ],
    heroes: CORE.slice(),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 14], [5, 14], [7, 14], [6, 13], [5, 13], [7, 13], [4, 14], [8, 14], [4, 13]],
    units: [
      ['tribesman', 15, 6, 4, { team: 'enemy', name: '强·裘帝玛', boss: true, ai: 'hold' }],
      ['duelist', 13, 5, 7, { team: 'enemy', name: '裘帝玛的剑手', ai: 'hold' }],
      ['pirate', 13, 8, 7, { team: 'enemy', name: '码头打手' }],
      ['longbowman', 14, 3, 4, { team: 'enemy', name: '佣兵弓手', ai: 'hold' }],
      ['longbowman', 14, 10, 4, { team: 'enemy', name: '佣兵弓手', ai: 'hold' }],
      ['halberdier', 13, 0, 5, { team: 'enemy', name: '佣兵骑手', ai: 'hold' }],
      ['halberdier', 13, 12, 5, { team: 'enemy', name: '佣兵骑手', ai: 'hold' }],
      ['pirate', 13, 3, 6, { team: 'enemy', name: '码头打手' }],
      ['pirate', 13, 8, 6, { team: 'enemy', name: '码头打手', ai: 'hold' }],
      ['monk', 14, 7, 5, { team: 'enemy', name: '随军修士', ai: 'hold' }],
      ['thief', 13, 11, 6, { team: 'enemy', name: '赏金盗贼', ai: 'hold' }],
    ],
    chests: [[3, 1, 'gryphonMail'], [7, 2, 'magicHerb', 300], [0, 8, 'healFlower']],
    win: { type: 'boss' },
    lose: { units: ['kehelin'] },
    secret: { at: [11, 0], to: 'g4_39', msg: '最外侧的码头尽头，海面下有一道比船还长的黑影缓缓游过……渔夫说的「海兽」，原来不是醉话。' },
    events: [
      { turn: 3,
        spawn: [
          ['pirate', 13, 13, 6, { team: 'enemy', name: '码头打手' }],
        ],
        dialog: [
          ['强·裘帝玛', '后巷的兄弟也到了！血狮鹫的人头每颗值五百金币，谁砍下来就算谁的！', 'enemy:tribesman'],
          ['力奇', '五百？哈！老子的人头都不止这个价，你们团长被看扁啦！', 'liqi'],
          ['陶', '……被悬赏的人还在讨价还价。我们兵团的水准就是这样一点一点往下掉的。', 'tao'],
        ] },
    ],
    intro: [
      ['旁白', '西风岛，大陆南方海上一座不属于任何国家的小岛。三年前，一群从博丰逃出来的人在这里竖起了一面绘着血色狮鹫的旗帜。'],
      ['if', { flag: 'line', is: 'B' }, [
        ['旁白', '安迪将军重伤后，雅曼的部队暂泊西风港整补。血狮鹫兵团受托先行一步，追查蒙面人的去向。'],
      ], [
        ['旁白', '在海上漂了几天之后，力奇的船载着血狮鹫兵团回到了西风港——兵团诞生的地方。'],
      ]],
      ['波比', '回、回家了！波比要吃港口的烤鱼，烤三条，不对，烤……很多条！', 'bobi'],
      ['寇琪', '波比，你看码头上贴的那张纸。上面画的那个歪嘴大个子，是不是很像你？', 'kouqi'],
      ['波比', '唔……真的很像！波比被画在纸上了！', 'bobi'],
      ['陶', '那是通缉令。悬赏金额还不少。……连我们的老家都贴满了，看来各国真的铁了心要把罪名扣在我们头上。', 'tao'],
      ['麦斯', '有人站在广场上等着。……那家伙我认得，强·裘帝玛。', 'maisi'],
      ['强·裘帝玛', '哟，这不是血狮鹫吗？以前在港口抢生意抢不过你们，现在好了，你们自己送上门来当赏金。', 'enemy:tribesman'],
      ['克荷林', '裘帝玛，我们没有杀那些使者。让开，我不想在西风岛动手。', 'kehelin'],
      ['强·裘帝玛', '杀没杀不关我的事，钱是真的就行！兄弟们，今天开始西风港只有一个佣兵团——我的！', 'enemy:tribesman'],
      ['?', '寇琪凑过来小声说：「团长，要不要我去把他的裤腰带割断？」', [
        { label: '「留着吧。等打完了，再让他自己掉。」', rel: { kouqi: 10 }, auto: true, say: [
          ['寇琪', '哈哈！团长居然也会开这种玩笑！好，我记下了，打完再说！', 'kouqi'],
        ] },
        { label: '「别闹，专心作战。」', say: [
          ['寇琪', '是是是——团长大人一点都不好玩。', 'kouqi'],
        ] },
      ]],
      ['克荷林', '全员准备。别伤到港口的居民——这里是我们的家。', 'kehelin'],
    ],
    outro: [
      ['强·裘帝玛', '怎、怎么可能……我手下有三十个人……', 'enemy:tribesman'],
      ['力奇', '三十个人加起来也不如一个会动脑子的。这叫「不自量力」，懂吗？', 'liqi'],
      ['百合', '……他身上有一封委托书。悬赏不是各国官府出的，是一个蒙面的中间人在港口私下发的。', 'baihe'],
      ['陶', '有意思。有人不只想嫁祸我们，还想让我们死在路上，好让真相永远说不清。', 'tao'],
      ['强·裘帝玛', '我、我只知道这些……还有，那个中间人提过——他们本来想雇「最强的弓手」仙妮亚动手，那女人不肯，被关进了夏米尔监狱。', 'enemy:tribesman'],
      ['麦斯', '夏米尔……那是艾普洛北边的监狱。', 'maisi'],
      ['克荷林', '拒绝刺杀使者的人，一定见过雇主的真面目。……我们去夏米尔。', 'kehelin'],
      ['贝里奇娜', '往北要经过边境的关卡。……我总觉得，那里有什么在等着我们。', 'beiliqina'],
    ],
    next: 'g4_32',
    reward: 1800,
    shop: ['compoundBow', 'gryphonMail', 'greatAxe', 'alchemyStaff', 'silverLance', 'chainMail', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 32 关 关卡前夜（卡隆溪谷的旧驿站）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_32', no: 32, title: '关卡前夜', part: PART, level: 15,
    map: [
      'FFFMMFFFFMMFF',
      'FFGGFFGGFFGGF',
      'FGGGGGRGGGGFF',
      'MFGHGGRGGHGGF',
      'MFGGGGRGGGGFF',
      'FFGGVVRVVGGGF',
      'FGGGRRRRRGGFF',
      'FGGGVRRRVGGGF',
      'FFGGGGRGGGHFF',
      'FGTTGGRGGGGGF',
      'FGTTGGRGGFFGF',
      'FFGGGGRGGGGFF',
      'MFFGGRRGGGFFM',
      'MMFFFRRFFFFMM',
    ],
    heroes: CORE.slice(),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 6], [5, 6], [7, 6], [6, 7], [5, 7], [7, 7], [4, 6], [8, 6], [6, 5]],
    units: [
      ['maskman', 16, 6, 1, { team: 'enemy', name: '蒙面人队长', ai: 'hold' }],
      ['maskman', 14, 3, 2, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 14, 9, 2, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 14, 11, 4, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 14, 5, 12, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 14, 7, 12, { team: 'enemy', name: '蒙面人' }],
      ['longbowman', 14, 3, 11, { team: 'enemy', name: '蒙面弓手' }],
      ['longbowman', 14, 10, 11, { team: 'enemy', name: '蒙面弓手' }],
      ['silverWolf', 15, 1, 7, { team: 'enemy', name: '夜狼' }],
      ['silverWolf', 15, 2, 4, { team: 'enemy', name: '夜狼' }],
      ['silverWolf', 15, 11, 7, { team: 'enemy', name: '夜狼' }],
    ],
    chests: [[2, 1, 'alchemyStaff'], [12, 9, 'healFlower', 200], [11, 1, 'xuanmingBow', 0, 'hidden']],
    win: { type: 'rout' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 2,
        dialog: [
          ['蒙面人队长', '……血狮鹫。主上说过，你们知道得太多了。今晚就让你们在这里「病死」。', 'enemy:maskman'],
          ['麦斯', '又是你们这群见不得光的东西！上次在杉福没杀干净，这次一个都别想走！', 'maisi'],
          ['普鲁丝', '面具底下没有脸的人，影子却拖得很长呢。……长到能一直伸到很北边的山上。', 'pulusi'],
        ] },
    ],
    intro: [
      ['旁白', '离开西风港后，兵团一路北上。边境的关卡就在溪谷尽头，翻过去便是艾普洛的土地。'],
      ['旁白', '天色已晚。众人在溪谷里一座废弃的旧驿站扎营，打算养足精神，明天一早再去闯关。'],
      ['陶', '关卡的守将据说是个死脑筋的女骑士，软硬都不吃。明天得想个办法。', 'tao'],
      ['力奇', '想什么办法？冲过去就是了！', 'liqi'],
      ['陶', '力奇，你的船如果也像你的脑子一样直，早就撞礁沉了。', 'tao'],
      ['旁白', '夜深了。克荷林守着营火，贝里奇娜抱着膝盖坐在一旁，望着天上的星星出神。'],
      ['贝里奇娜', '克荷林……我刚才又梦到了那个地方。很深、很暗的地底，有什么东西在呼吸。', 'beiliqina'],
      ['?', '克荷林要怎么回应？', [
        { label: '「梦而已。有我在，什么东西都别想靠近你。」', rel: { beiliqina: 10 }, auto: true, say: [
          ['贝里奇娜', '……嗯。听你这么说，好像真的就不怕了。', 'beiliqina'],
        ] },
        { label: '「也许和你失去的记忆有关。慢慢想，别急。」', rel: { beiliqina: 5 }, say: [
          ['贝里奇娜', '你总是这么冷静。……不过，谢谢你没有说我胡思乱想。', 'beiliqina'],
        ] },
        { label: '「早点睡吧，明天还要闯关。」', say: [
          ['贝里奇娜', '……也对。晚安。', 'beiliqina'],
        ] },
      ]],
      ['百合', '……别说话。林子里的虫子不叫了。', 'baihe'],
      ['克荷林', '全员起来！我们被包围了！', 'kehelin'],
    ],
    outro: [
      ['寇琪', '呼……一觉都没睡成。这些蒙面人怎么像蟑螂一样，打不完啊？', 'kouqi'],
      ['百合', '他们的刀是新打的，刀柄上没有任何国家的徽记。……却刻着同一种花纹。', 'baihe'],
      ['陶', '像是某种古老的学派纹章。我在炼金学院的旧书上见过类似的东西……一时想不起来。', 'tao'],
      ['普鲁丝', '想不起来的东西，往往在等一个对的时候才肯出现。', 'pulusi'],
      ['丽妲', '麦斯，你的手在流血……我、我帮你包一下。', 'lida'],
      ['麦斯', '……不碍事。谢了，丽妲。', 'maisi'],
      ['克荷林', '天快亮了。收拾一下，直接去关卡。', 'kehelin'],
    ],
    next: 'g4_33',
    reward: 1900,
    shop: ['poisonDagger', 'compoundBow', 'gryphonMail', 'greatAxe', 'silverScale', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 33 关 尽忠职守（关卡）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_33', no: 33, title: '尽忠职守', part: PART, level: 16,
    map: [
      'MMMMGGRRGGMMMM',
      'MMGGGCRRCGGGMM',
      'MGGCCCCCCCCGGM',
      'MGCCCCKKCCCCGM',
      'MGCCCCKKCCCCHM',
      'XXXXXXCCXXXXHX',
      'XHHGGGRRGGGHHX',
      'MGGGGGRRGGGGGM',
      'MFGGHGRRGHGGFM',
      'FFGGGGRRGGGGFF',
      'FGGHGGRRGGHGGF',
      'FGGGGRRGGGGGFF',
      'FFGGGRRGGGGFFF',
      'MFFGGRRGGGFFMM',
      'MMFFGRRGGFFMMM',
    ],
    heights: [
      '33331100113333',
      '33111111111133',
      '31111111111113',
      '31111111111113',
      '31111111111113',
      '00000011000010',
      '01100000000110',
      '20000000000002',
      '20001000010002',
      '00000000000000',
      '00010000001000',
      '00000000000000',
      '00000000000000',
      '20000000000022',
      '22000000000222',
    ],
    heroes: CORE.slice(),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 14], [5, 14], [7, 14], [6, 13], [5, 13], [7, 13], [4, 13], [8, 13], [8, 14]],
    units: [
      ['hero:nushayi', 16, 6, 3, { team: 'enemy', name: '努莎伊', boss: true, ai: 'hold' }],
      ['amazon', 16, 6, 6, { team: 'enemy', name: '关卡重甲兵', ai: 'hold' }],
      ['amazon', 16, 7, 6, { team: 'enemy', name: '关卡重甲兵', ai: 'hold' }],
      ['halberdier', 15, 5, 8, { team: 'enemy', name: '巡逻骑兵' }],
      ['halberdier', 15, 8, 8, { team: 'enemy', name: '巡逻骑兵' }],
      ['longbowman', 16, 4, 4, { team: 'enemy', name: '城头弓手', ai: 'hold' }],
      ['longbowman', 16, 9, 4, { team: 'enemy', name: '城头弓手', ai: 'hold' }],
      ['crossbowman', 15, 2, 3, { team: 'enemy', name: '关卡弩手', ai: 'hold' }],
      ['pikemaid', 15, 8, 2, { team: 'enemy', name: '努莎伊的部下' }],
      ['nun', 15, 7, 2, { team: 'enemy', name: '关卡修女', ai: 'hold' }],
      ['captain', 16, 3, 9, { team: 'enemy', name: '关卡队长' }],
      ['captain', 16, 10, 9, { team: 'enemy', name: '关卡队长' }],
    ],
    chests: [[2, 1, 'halberd'], [12, 2, 'healFlower', 300], [0, 9, 'magicHerb']],
    win: { type: 'boss' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 4,
        dialog: [
          ['努莎伊', '住手！……你们这些佣兵，明明可以一拥而上，却一直避开我的部下要害。为什么？', 'nushayi'],
          ['克荷林', '因为你们不是我们的敌人。我们只是要过关，去夏米尔找一个人。', 'kehelin'],
          ['努莎伊', '杀害和会使者的凶手，也会说这种好听的话。我的职责是守住这道关卡，不让任何罪人通过。', 'nushayi'],
          ['?', '怎么说服这位死守职责的女骑士？', [
            { label: '「若我们真是凶手，何必留你的部下活口？用你的眼睛判断吧。」', set: { nushayiTalked: true }, auto: true, win: true, say: [
              ['努莎伊', '……', 'nushayi'],
              ['努莎伊', '你的剑法……收招时总留三分余地。我父亲教我的剑，也是这样的。', 'nushayi'],
              ['克荷林', '……也许我们学的是同一位老师的剑。', 'kehelin'],
              ['努莎伊', '全员收兵！开关门。——我不是放过你们，我是要亲自盯着你们，看看你们说的是不是真话。', 'nushayi'],
            ] },
            { label: '出示雅曼使节印：「这是大使亲手托付的印信。」', if: { item: 'ambassadorSeal' }, set: { nushayiTalked: true }, win: true, say: [
              ['努莎伊', '雅曼使节的印……如果你们是凶手，大使怎么会把这个交给你们？', 'nushayi'],
              ['努莎伊', '全员收兵！开关门。……我要亲耳听你们把整件事说清楚。', 'nushayi'],
            ] },
            { label: '「多说无益。用剑来分辨吧。」', say: [
              ['努莎伊', '好！那就让我看看，你的剑配不配得上你的话！', 'nushayi'],
            ] },
          ]],
        ] },
    ],
    intro: [
      ['旁白', '溪谷尽头，一道石砌的城墙横在两座山之间。这是从南方进入艾普洛北境的唯一关卡。'],
      ['旁白', '关门紧闭，城头上弓手林立。一位金发的女骑士持枪立在门后。'],
      ['努莎伊', '来者止步！我是这道关卡的守将努莎伊。——血狮鹫兵团，你们的画像已经贴到我的营房里了。', 'nushayi'],
      ['克荷林', '我们没有杀那些使者。我们只想过关。', 'kehelin'],
      ['努莎伊', '我不审案，我只守关。是不是凶手，交给王都的法官去判。放下武器，我保证你们活着到王都。', 'nushayi'],
      ['麦斯', '艾普洛的「保证」？我的故乡就是被你们这样「保证」掉的！', 'maisi'],
      ['丽妲', '麦斯……别、别冲动……', 'lida'],
      ['陶', '死脑筋，但不是坏人。最麻烦的那种。……团长，尽量别下杀手，留条退路给她，也给我们自己。', 'tao'],
      ['?', '丽妲拉着克荷林的袖子，欲言又止。', [
        { label: '「丽妲，你帮我看着麦斯，别让他一个人冲太前面。」', rel: { lida: 10 }, auto: true, say: [
          ['丽妲', '……嗯！我、我会看好他的。谢谢你，克荷林。', 'lida'],
        ] },
        { label: '「有话等打完再说。」', say: [
          ['丽妲', '……好。', 'lida'],
        ] },
      ]],
      ['努莎伊', '不肯放下武器吗？那就怪不得我了。全员——守住关门！', 'nushayi'],
    ],
    outro: [
      ['if', { flag: 'nushayiTalked' }, [
        ['旁白', '关卡的守军收起了武器。努莎伊屏退部下，独自听完了和会那一夜的来龙去脉。'],
      ], [
        ['努莎伊', '……我输了。要杀便杀吧。', 'nushayi'],
        ['克荷林', '我说过，我们不是你的敌人。站起来吧，听我把话说完。', 'kehelin'],
        ['旁白', '克荷林把和会那一夜的来龙去脉，一五一十地告诉了这位女骑士。'],
      ]],
      ['努莎伊', '蒙面的刺客、私下悬赏、被关起来的证人……若你们说的是真的，那这道关卡守护的，就不是正义了。', 'nushayi'],
      ['努莎伊', '我是骑士。骑士守的不该是一道门，而是门后的人。……请让我同行。我要亲眼看到真相。', 'nushayi'],
      ['寇琪', '哇，团长，你又骗到一个了！', 'kouqi'],
      ['克荷林', '……寇琪，「骗」这个字不太对。欢迎你，努莎伊。', 'kehelin'],
      ['努莎伊', '关卡的事我会安排副官接手。往夏米尔，要先穿过劳伦蒂斯森林——那里最近不太平。', 'nushayi'],
    ],
    onWin: { join: ['nushayi'], catchUp: ['nushayi'] },
    next: 'g4_34',
    reward: 2000,
    shop: ['halberd', 'silverLance', 'compoundBow', 'poisonDagger', 'silverScale', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 34 关 步步危机（劳伦蒂斯森林）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_34', no: 34, title: '步步危机', part: PART, level: 17,
    map: [
      'FFFFFGRGFFFFF',
      'FFGGFGRGFGGFF',
      'FGGFFGRRGGFFF',
      'FFGGFFFRGGFHF',
      'FHGGGFFRRGGFF',
      'FFFGGGFFRFGGF',
      'FGGFTTGGRFFGF',
      'FGFFTTGRRGGFF',
      'FFGGGGRRFFGGF',
      'FGGFFGRFFGGHF',
      'FFGGGRRGGFFGF',
      'FGFFGRFFGGGFF',
      'FFGGGRRGGFFGF',
      'FGGFFGRGGGFFF',
      'FFFFGGRGGFFFF',
    ],
    heroes: CORE.concat(['nushayi']),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 14], [5, 14], [7, 14], [6, 13], [5, 13], [7, 13], [4, 14], [8, 14], [8, 13]],
    units: [
      ['halberdier', 18, 6, 0, { team: 'enemy', name: '追猎骑士团长', boss: true, ai: 'hold' }],
      ['treant', 17, 3, 6, { team: 'enemy', name: '劳伦蒂斯树妖', ai: 'hold' }],
      ['treant', 17, 10, 8, { team: 'enemy', name: '劳伦蒂斯树妖', ai: 'hold' }],
      ['spider', 17, 2, 4, { team: 'enemy', name: '巨蜘蛛' }],
      ['spider', 17, 11, 6, { team: 'enemy', name: '巨蜘蛛' }],
      ['longbowman', 16, 7, 2, { team: 'enemy', name: '追猎弓手' }],
      ['longbowman', 16, 9, 1, { team: 'enemy', name: '追猎弓手' }],
      ['shooter', 16, 2, 1, { team: 'enemy', name: '追猎骑射手' }],
      ['maskman', 16, 5, 5, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 16, 10, 5, { team: 'enemy', name: '蒙面人' }],
    ],
    chests: [[1, 4, 'poisonDagger'], [11, 9, 'magicHerb', 300], [2, 13, 'healFlower']],
    win: { type: 'rout' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 3,
        spawn: [
          ['silverWolf', 17, 1, 13, { team: 'enemy', name: '追猎犬' }],
          ['silverWolf', 17, 10, 13, { team: 'enemy', name: '追猎犬' }],
          ['maskman', 16, 6, 14, { team: 'enemy', name: '蒙面人' }],
        ],
        dialog: [
          ['百合', '……后面也来了。他们放了猎犬，一路闻着我们的味道。', 'baihe'],
          ['努莎伊', '这是王都的「追猎骑士团」，专门追捕要犯。……可他们为什么会和蒙面人一起行动？', 'nushayi'],
          ['陶', '因为下命令的是同一只手。前后夹击，步步都是陷阱——走一步，看一步吧。', 'tao'],
        ] },
    ],
    intro: [
      ['旁白', '劳伦蒂斯森林古木参天，林间小路弯弯曲曲，阳光几乎照不进来。'],
      ['努莎伊', '这片森林的树会动。别靠得太近，被缠住就麻烦了。', 'nushayi'],
      ['波比', '树、树会动？那波比晚上不能靠着树睡觉了……', 'bobi'],
      ['寇琪', '波比，你背后那棵是不是在动？', 'kouqi'],
      ['波比', '哇啊啊！', 'bobi'],
      ['寇琪', '骗你的啦～', 'kouqi'],
      ['百合', '……安静。前面有人。不止是树。', 'baihe'],
      ['?', '百合站在队伍最前面，一个人探路。', [
        { label: '「百合，别一个人走太前面。我跟你一起。」', rel: { baihe: 10 }, auto: true, say: [
          ['百合', '……我一个人比较快。', 'baihe'],
          ['百合', '不过……随你。', 'baihe'],
        ] },
        { label: '「交给你了，有动静就回报。」', rel: { baihe: 5 }, say: [
          ['百合', '……嗯。', 'baihe'],
        ] },
      ]],
      ['追猎骑士团长', '找到你们了，血狮鹫。努莎伊，你这个叛徒也在？正好，一并带回王都！', 'enemy:halberdier'],
      ['努莎伊', '我没有背叛任何人。我只是想知道真相！', 'nushayi'],
    ],
    outro: [
      ['追猎骑士团长', '可恶……那位大人说过，这群佣兵……绝对不能让他们到夏米尔……', 'enemy:halberdier'],
      ['努莎伊', '「那位大人」？追猎骑士团只听国王的命令，什么时候多了一位「大人」？', 'nushayi'],
      ['陶', '看来艾普洛的朝廷里，也有人在替蒙面人办事。或者说——艾普洛自己也被人当成了棋子。', 'tao'],
      ['麦斯', '棋子也好，主谋也好，艾普洛的人手上沾的血不会因此变少。', 'maisi'],
      ['贝里奇娜', '麦斯……', 'beiliqina'],
      ['克荷林', '先出森林。前面是科伦诺砦，可以在那里歇脚。', 'kehelin'],
    ],
    next: 'g4_35',
    reward: 2100,
    shop: ['poisonDagger', 'greatAxe', 'silverBow', 'alchemyStaff', 'silverScale', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 35 关 危急之秋（科伦诺砦）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_35', no: 35, title: '危急之秋', part: PART, level: 18,
    map: [
      'GGGHGGRRGGGFFF',
      'GFGGGGRRGGGGFF',
      'GGGHGGRRGGHGGF',
      'FGGGGGRRGGGGGG',
      'FFGHGGRRGGGHGG',
      'GGGGGGRRGGGGGG',
      'XXCXXXCCXXXXXX',
      'XCCCCCCCCCCCCX',
      'XCVCCCKKCCCVCX',
      'XCCXXCKKCXXCCX',
      'XCCXCCKKCCXCCX',
      'XCCCCCKKCCCCCX',
      'XXCCCCCCCCCCXX',
      'GXXXXXCCXXXXXG',
      'GGGGGRRRRGGGGG',
    ],
    heroes: CORE.concat(['nushayi']),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 10], [7, 10], [6, 11], [7, 11], [5, 11], [8, 11], [5, 10], [8, 10], [6, 9]],
    units: [
      ['darkKnight', 19, 6, 1, { team: 'enemy', name: '审判骑士 赫曼', boss: true, ai: 'hold' }],
      ['darkKnight', 17, 5, 3, { team: 'enemy', name: '审判骑士', ai: 'hold' }],
      ['darkKnight', 17, 8, 3, { team: 'enemy', name: '审判骑士', ai: 'hold' }],
      ['captain', 17, 3, 4, { team: 'enemy', name: '艾普洛队长' }],
      ['captain', 17, 10, 4, { team: 'enemy', name: '艾普洛队长' }],
      ['crossbow', 17, 2, 2, { team: 'enemy', name: '艾普洛弓手', ai: 'hold' }],
      ['crossbow', 17, 11, 2, { team: 'enemy', name: '艾普洛弓手', ai: 'hold' }],
      ['mage', 17, 7, 1, { team: 'enemy', name: '穆伦教法师' }],
      ['priest', 17, 8, 0, { team: 'enemy', name: '穆伦教祭司', ai: 'hold' }],
    ],
    chests: [[12, 7, 'greatAxe'], [1, 7, 'healFlower', 300], [2, 12, 'mysteryMask', 0, 'locked']],
    win: { type: 'boss' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 2,
        dialog: [
          ['审判骑士 赫曼', '穆伦神在上！窝藏异端与凶手的砦堡，一块石头都不必留下！', 'enemy:darkKnight'],
          ['努莎伊', '赫曼！科伦诺砦里还住着逃难的百姓，你要连他们一起杀吗？', 'nushayi'],
          ['审判骑士 赫曼', '被异端污染过的人，烧干净了才能升天堂。', 'enemy:darkKnight'],
          ['麦斯', '……就是这副嘴脸。三年前，烧掉我家乡的人也是这么说的。', 'maisi'],
        ] },
      { turn: 3,
        spawn: [
          ['maskman', 16, 6, 14, { team: 'enemy', name: '蒙面人' }],
          ['maskman', 16, 8, 14, { team: 'enemy', name: '蒙面人' }],
        ],
        dialog: [
          ['丽妲', '南、南门也有人！是那些蒙面人！', 'lida'],
          ['陶', '前门审判骑士，后门蒙面刺客，配合得天衣无缝。……真是危急存亡之秋。', 'tao'],
          ['力奇', '怕什么！两头一起砍，省得来回跑！', 'liqi'],
        ] },
    ],
    intro: [
      ['旁白', '科伦诺砦是一座被弃置多年的边境要塞。战火延烧后，附近村子的难民躲进了这里。'],
      ['旁白', '兵团才刚在砦里安顿下来，北方的地平线上就扬起了尘土。'],
      ['努莎伊', '那是穆伦教的审判骑士团……他们追来了。而且——他们打的旗号是「清剿异端」。', 'nushayi'],
      ['贝里奇娜', '异端……他们是来抓我的吗？', 'beiliqina'],
      ['陶', '不一定。但他们不会在乎砦里多死几个百姓。', 'tao'],
      ['?', '贝里奇娜脸色发白，紧紧攥着法杖。', [
        { label: '「不管他们来抓谁，我都不会把你交出去。」', rel: { beiliqina: 10 }, auto: true, say: [
          ['贝里奇娜', '……嗯。我也会保护大家的。这次，我想站在你身边战斗。', 'beiliqina'],
        ] },
        { label: '「别多想。你留在后排支援就好。」', rel: { beiliqina: 5 }, say: [
          ['贝里奇娜', '好……我会尽力。', 'beiliqina'],
        ] },
      ]],
      ['克荷林', '守住砦门。百姓都躲到中庭去！谁都别想踏进来一步！', 'kehelin'],
      ['百合', '……砦里有间锁着的旧军械库。打完了我去看看。', 'baihe'],
    ],
    outro: [
      ['审判骑士 赫曼', '异端……终会被……净化……', 'enemy:darkKnight'],
      ['旁白', '审判骑士团退去了。躲在中庭的难民们怯生生地走出来，向兵团道谢。'],
      ['难民老人', '……你们就是通缉令上的血狮鹫吧？可是救了我们的，是你们，不是官府。', 'enemy:villager'],
      ['寇琪', '嘿嘿，团长，被感谢的感觉还不错吧？', 'kouqi'],
      ['克荷林', '……嗯。不错。', 'kehelin'],
      ['努莎伊', '从这里往北，就是莫古洛湿原。穿过湿原，就能看到夏米尔监狱。', 'nushayi'],
      ['普鲁丝', '湿原里，死去的人睡得不太安稳呢。', 'pulusi'],
    ],
    next: 'g4_36',
    reward: 2200,
    shop: ['greatAxe', 'silverBow', 'silverLance', 'poisonDagger', 'knightArmor', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 36 关 幽冥路（莫古洛湿原 → 夏米尔监狱外）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_36', no: 36, title: '幽冥路', part: PART, level: 19,
    map: [
      'PPPTWWWWTPPGGG',
      'PGPTTWWTTPGGRG',
      'PPGGPTTPPGGRRG',
      'TPPGGPPGGPPRGP',
      'WTPPGBBBGPPRPP',
      'WWTPPBPPBGGRPT',
      'WWTPGBPPBGPRTW',
      'WTPPGGBBGGPRTW',
      'TPPGGPPPPGRRPT',
      'PPGGPPTTPGRPPP',
      'PGGPPTWWTPRGGP',
      'PGRRRBWWBRRGPP',
      'PRRPPTWWTPPGPP',
      'GRGPPPTTPPGGPP',
      'GRGGPPPPPPGGPP',
    ],
    heroes: CORE.concat(['nushayi']),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[1, 14], [0, 14], [2, 14], [1, 13], [0, 13], [2, 13], [1, 12], [2, 12], [3, 14]],
    units: [
      ['vampire', 21, 12, 1, { team: 'enemy', name: '湿原领主', boss: true, ai: 'hold' }],
      ['skeleton', 19, 4, 11, { team: 'enemy', name: '亡灵士兵' }],
      ['skeleton', 19, 6, 7, { team: 'enemy', name: '亡灵士兵' }],
      ['skeleton', 19, 9, 6, { team: 'enemy', name: '亡灵士兵' }],
      ['skeleton', 19, 10, 9, { team: 'enemy', name: '亡灵士兵' }],
      ['vampire', 19, 7, 4, { team: 'enemy', name: '吸血鬼' }],
      ['bat', 19, 3, 3, { team: 'enemy', name: '吸血蝙蝠' }],
      ['bat', 19, 12, 4, { team: 'enemy', name: '吸血蝙蝠' }],
      ['outsider', 19, 11, 11, { team: 'enemy', name: '异界魔物' }],
      ['outsider', 19, 4, 8, { team: 'enemy', name: '异界魔物' }],
      ['hydra', 19, 6, 10, { team: 'enemy', name: '沼泽多头蛇' }],
    ],
    chests: [[0, 0, 'silverBow'], [13, 13, 'magicWine'], [6, 5, 'healFlower', 400]],
    win: { type: 'rout' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 4,
        spawn: [
          ['skeleton', 19, 2, 9, { team: 'enemy', name: '亡灵士兵' }],
          ['skeleton', 19, 12, 8, { team: 'enemy', name: '亡灵士兵' }],
        ],
        dialog: [
          ['丽妲', '泥、泥巴里伸出手来了！又有骷髅爬起来了！', 'lida'],
          ['贝里奇娜', '这些亡者……不是自然醒来的。有人用异界的力量，把他们硬拖了起来。', 'beiliqina'],
          ['普鲁丝', '门开得越大，从另一边漏过来的东西就越多。……这里离「门」不远了。', 'pulusi'],
        ] },
    ],
    intro: [
      ['旁白', '莫古洛湿原终年笼罩着灰白的雾。据说这里埋着数百年前一场大战的亡者，从没有人能把他们全部安葬。'],
      ['波比', '好、好冷……波比的脚陷进泥巴里拔不出来了……', 'bobi'],
      ['力奇', '这鬼地方连条像样的路都没有！还是海上好，至少浪不会抓你的脚。', 'liqi'],
      ['丽妲', '……那、那边的雾里，是不是有人在走？', 'lida'],
      ['?', '丽妲吓得紧紧挨着队伍。', [
        { label: '「别怕，跟紧我。你的炼金术对付亡灵最有效。」', rel: { lida: 10 }, auto: true, say: [
          ['丽妲', '真、真的吗？……那我会努力的！', 'lida'],
        ] },
        { label: '「麦斯，你照顾一下丽妲。」', rel: { lida: 5 }, say: [
          ['麦斯', '……走我旁边。', 'maisi'],
          ['丽妲', '！……嗯。', 'lida'],
        ] },
      ]],
      ['陶', '雾里的东西没有呼吸声。……是死人。', 'tao'],
      ['克荷林', '沿着木栈道走，别陷进深水里。我们要在天黑前穿过湿原。', 'kehelin'],
    ],
    outro: [
      ['旁白', '雾气渐渐散去。湿原的尽头，一座黑色的石造监狱沉默地立在山岩上——夏米尔监狱。'],
      ['？？？', '哎呀呀，好精彩。能这样走出莫古洛湿原的人，我还是第一次见到。', 'tuoli'],
      ['寇琪', '谁？！什么时候站在那里的？', 'kouqi'],
      ['托莉', '别紧张，我叫托莉，是「幻影佣兵团」的人。我只是路过，顺便看看热闹。', 'tuoli'],
      ['陶', '幻影佣兵团……传说中来无影去无踪的那个？', 'tao'],
      ['托莉', '传说总是夸张的啦。不过嘛，我对你们要去监狱里救的人，也有点兴趣。', 'tuoli'],
      ['if', { not: { flag: 'tuoliJoined' } }, [
        ['?', '托莉笑眯眯地看着克荷林。要邀请她同行吗？', [
          { label: '「一起来吧。多一个会治疗的人，大家就多一分安全。」', join: ['tuoli'], catchUp: ['tuoli'], set: { tuoliJoined: true }, auto: true, say: [
            ['托莉', '嘻嘻，那就打扰啦。放心，我收费很便宜的——一顿热饭就够了。', 'tuoli'],
            ['波比', '波比也只要一顿热饭！波比和托莉是一样的！', 'bobi'],
          ] },
          { label: '「来历不明的人，恕不能同行。」', say: [
            ['托莉', '哎呀，被拒绝了。没关系，我们还会再见的——幻影总是会在想不到的地方出现。', 'tuoli'],
            ['旁白', '一阵雾气飘过，托莉的身影就像从没出现过一样消失了。'],
          ] },
        ]],
      ]],
      ['克荷林', '夏米尔就在眼前。今晚潜进去。', 'kehelin'],
    ],
    next: 'g4_37',
    reward: 2300,
    shop: ['silverBow', 'knightArmor', 'greatAxe', 'alchemyStaff', 'magicHerb', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 37 关 天牢（夏米尔监狱）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_37', no: 37, title: '天牢', part: PART, level: 20,
    map: [
      'XXXXXXRRXXXXXX',
      'XCCCCCCCCCCCCX',
      'XCXXCCKKCCXXCX',
      'XCXXCCKKCCXXCX',
      'XCCCCCKKCCCCCX',
      'XXXXXCCCCXXXXX',
      'XCCCXCCCCXCCCX',
      'XCCCCCOOCCCCCX',
      'XXXXXCOOCXXXXX',
      'XCCCCCOOCCCCCX',
      'XXXCXCCCCXCXXX',
      'XAYCCCCCCCCXCX',
      'XXXCXCCCCXCXXX',
      'XCCCCCCCCCCCCX',
      'XCXCXCCCCXCXCX',
      'XXXXXXXXXXXXXX',
    ],
    heroes: CORE.concat(['nushayi', 'tuoli']),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 0], [7, 0], [6, 1], [7, 1], [5, 1], [8, 1], [4, 1], [9, 1], [3, 1]],
    units: [
      ['hero:xianniya', 20, 1, 11, { team: 'ally', name: '仙妮亚', ai: 'guard' }],
      ['amazon', 21, 7, 13, { team: 'enemy', name: '典狱长 葛罗兹', ai: 'hold' }],
      ['captain', 18, 1, 4, { team: 'enemy', name: '狱卒长' }],
      ['captain', 18, 12, 4, { team: 'enemy', name: '狱卒长' }],
      ['crossbow', 18, 5, 3, { team: 'enemy', name: '监狱弩手', ai: 'hold' }],
      ['crossbow', 18, 8, 3, { team: 'enemy', name: '监狱弩手', ai: 'hold' }],
      ['amazon', 18, 6, 6, { team: 'enemy', name: '重甲狱卒' }],
      ['nun', 18, 12, 6, { team: 'enemy', name: '监狱修女', ai: 'hold' }],
      ['maskman', 18, 4, 11, { team: 'enemy', name: '蒙面人' }],
      ['maskman', 18, 4, 13, { team: 'enemy', name: '蒙面人' }],
      ['assassin', 18, 10, 11, { team: 'enemy', name: '监狱刺客' }],
      ['longbowman', 18, 2, 9, { team: 'enemy', name: '下层弓手' }],
    ],
    chests: [[12, 9, 'compoundBow'], [1, 13, 'elixir'], [12, 11, 'shadowDagger', 0, 'locked']],
    win: { type: 'reach', at: [3, 11], label: '仙妮亚的牢房' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 2,
        dialog: [
          ['仙妮亚', '……楼上那么吵，是来劫狱的？还是来灭口的？', 'xianniya'],
          ['百合', '下层左边的牢房。……声音是从那里传来的。', 'baihe'],
          ['仙妮亚', '如果是来救我的，就快一点。那些戴面具的家伙今晚是来送我上路的。', 'xianniya'],
          ['克荷林', '撑住！我们马上下来！', 'kehelin'],
        ] },
      { turn: 4,
        dialog: [
          ['典狱长 葛罗兹', '把下层的门都封死！一个犯人也不许放走，一个劫狱的也不许活着出去！', 'enemy:amazon'],
          ['力奇', '嘿，这嗓门比我船上的大副还大！', 'liqi'],
        ] },
    ],
    intro: [
      ['旁白', '夏米尔监狱建在北境的山岩上，号称「天牢」——进来的人，从没有活着出去过。'],
      ['旁白', '深夜，兵团借着巡逻换班的空档，从上层的正门潜了进去。'],
      ['百合', '……巡逻路线和我打听到的一样。仙妮亚关在下层，左边最里面那间。', 'baihe'],
      ['努莎伊', '牢门的栅栏是铁铸的，我们打不开。但是只要走到栅栏前，她就能把手伸出来。', 'nushayi'],
      ['麦斯', '「最强的弓手」吗……我倒想看看，是什么样的人，敢拒绝那种委托。', 'maisi'],
      ['?', '百合低声说：「我去前面引开狱卒。你们直接下楼。」', [
        { label: '「不行，太危险了。我们一起行动。」', rel: { baihe: 10 }, auto: true, say: [
          ['百合', '……你这个人，真的很麻烦。', 'baihe'],
          ['百合', '……好。一起。', 'baihe'],
        ] },
        { label: '「好。但一有危险就退回来。」', rel: { baihe: 5 }, say: [
          ['百合', '……我从来不会退。不过，我记住了。', 'baihe'],
        ] },
      ]],
      ['陶', '目标是下层的牢房。别恋战——只要有一个人走到栅栏前就行。', 'tao'],
    ],
    outro: [
      ['仙妮亚', '……呼。总算有人来了。我叫仙妮亚。你们是血狮鹫？外面的通缉令我在牢里都听说了。', 'xianniya'],
      ['克荷林', '我们来是想问你一件事——当初想雇你刺杀使者的，是什么人？', 'kehelin'],
      ['仙妮亚', '一个戴着银色面具的男人。他说他的主人是一位「贤者」，要用一场战争换来永远的和平。', 'xianniya'],
      ['仙妮亚', '我拒绝了。我的箭只射该死的人。然后——我就在这里了。', 'xianniya'],
      ['陶', '「贤者」……蒙面人刀柄上的纹章，我想起来了。那是祈勒蒙的贤者学派用的古纹章。', 'tao'],
      ['贝里奇娜', '祈勒蒙……那个名字，我好像……听过……', 'beiliqina'],
      ['仙妮亚', '我欠你们一条命。在还清之前，我的弓借给你们。', 'xianniya'],
      ['do', { join: ['xianniya'], catchUp: ['xianniya'], set: { xianniyaJoined: true } }],
      ['旁白', '众人带着仙妮亚逃出夏米尔监狱，在山下的林子里歇脚。营火边，气氛却越来越沉重。'],
      ['if', { flag: 'line', is: 'B' }, [
        ['旁白', '雅曼军的信鸽飞到了营地。安迪将军的伤势稳定了，他在信里只写了一句话——「追到底，查出幕后的人」。'],
        ['麦斯', '幕后的人……我只想知道，艾普洛的国王要为我的家乡付出什么代价。', 'maisi'],
        ['陶', '麦斯，蒙面人背后是祈勒蒙。艾普洛也不过是被人牵着走的一枚棋子。', 'tao'],
        ['贝里奇娜', '我想去祈勒蒙。……我总觉得，我失去的记忆，就在那里等我。', 'beiliqina'],
        ['克荷林', '那就去祈勒蒙。麦斯——你的仇，我不会忘。但我们得先找到真正握着刀的那只手。', 'kehelin'],
        ['麦斯', '……我听你的。这一次。', 'maisi'],
      ], [
        ['麦斯', '克荷林，艾普洛的伊卡尔港就在东边。他们的主力正往那里集结，我们直接打过去！', 'maisi'],
        ['陶', '打过去？就凭我们这些人？麦斯，你听到仙妮亚的话了——幕后的人在祈勒蒙，不在艾普洛的王座上。', 'tao'],
        ['麦斯', '我不管谁在幕后！烧了我家乡的是艾普洛的士兵，杀了我父母的是艾普洛的骑士！', 'maisi'],
        ['贝里奇娜', '麦斯……仇恨会把你带到看不见回头路的地方。我……好像曾经见过那样的人。', 'beiliqina'],
        ['丽妲', '麦斯……求求你，别这样……', 'lida'],
        ['麦斯', '克荷林，我们从小一起长大。我只问你一次——你站在我这边吗？', 'maisi'],
      ]],
    ],
    next: [
      { to: 'g4_53', if: { flag: 'line', is: 'B' } },
      { to: 'g4_61', label: '同意麦斯：直捣艾普洛的伊卡尔港（A2）', set: { route: 'A2' }, if: { flag: 'line', is: 'A' } },
      { to: 'g4_51', label: '不同意：先去祈勒蒙查明幕后真相（A1）', set: { route: 'A1' }, if: { flag: 'line', is: 'A' }, auto: true },
    ],
    reward: 2500,
    shop: ['compoundBow', 'silverBow', 'knightArmor', 'greatAxe', 'alchemyStaff', 'magicHerb', 'healFlower'],
  });

  // -------------------------------------------------------------------
  // 第 39 关 海兽利维亚桑（隐藏关，g4_31 最外侧码头）
  // -------------------------------------------------------------------
  CAMPAIGN_STAGES.g4.push({
    id: 'g4_39', no: 39, title: '海兽利维亚桑', part: PART, level: 20, secretStage: true,
    map: [
      'WWWWWWWWWWWWWW',
      'WWWWWWWWWWWWWW',
      'WWTTWWWWWWTTWW',
      'WWTCTWBBWTCTWW',
      'WWWTTWBBWTTWWW',
      'WWWWTBBBBTWWWW',
      'WWWWBCCCCBWWWW',
      'WWWBCCCCCCBWWW',
      'WWWBCCKKCCBWWW',
      'WWWBCCKKCCBWWW',
      'WWWBCCCCCCBWWW',
      'WWWWBCCCCBWWWW',
      'WWWWWBBBBWWWWW',
      'WWTTTTBBTTTTWW',
      'WTCTWWBBWWTCTW',
    ],
    heroes: CORE.concat(['nushayi', 'tuoli', 'xianniya']),
    required: ['kehelin'],
    maxDeploy: 8,
    start: [[6, 8], [7, 8], [6, 9], [7, 9], [5, 8], [8, 8], [5, 9], [8, 9], [6, 10]],
    units: [
      ['kraken', 22, 6, 2, { team: 'enemy', name: '海兽利维亚桑', boss: true, ai: 'boss' }],
      ['seaMonster', 20, 2, 6, { team: 'enemy', name: '海怪' }],
      ['seaMonster', 20, 11, 6, { team: 'enemy', name: '海怪' }],
      ['hydra', 19, 1, 10, { team: 'enemy', name: '多头海蛇' }],
      ['hydra', 19, 12, 10, { team: 'enemy', name: '多头海蛇' }],
      ['siren', 20, 3, 1, { team: 'enemy', name: '海妖' }],
      ['siren', 20, 10, 1, { team: 'enemy', name: '海妖' }],
      ['watersnake', 20, 4, 13, { team: 'enemy', name: '水蛇' }],
      ['watersnake', 20, 9, 13, { team: 'enemy', name: '水蛇' }],
      ['fishman', 20, 2, 2, { team: 'enemy', name: '鱼人' }],
      ['fishman', 20, 11, 2, { team: 'enemy', name: '鱼人' }],
    ],
    chests: [[11, 14, 'elementCharm'], [2, 14, 'anchor'], [10, 3, 'magicFruit', 600]],
    win: { type: 'boss' },
    lose: { units: ['kehelin'] },
    events: [
      { turn: 3,
        spawn: [
          ['seaMonster', 19, 0, 8, { team: 'enemy', name: '海怪' }],
          ['seaMonster', 19, 13, 8, { team: 'enemy', name: '海怪' }],
        ],
        dialog: [
          ['海兽利维亚桑', '——————！！（海面翻起巨浪，整座浮台剧烈摇晃）', 'enemy:kraken'],
          ['力奇', '它在叫帮手！这畜生比传说的还聪明！', 'liqi'],
          ['if', { has: 'beiliqina' }, [
            ['贝里奇娜', '海水在它身边是冰冷的……要对付它，得用比海更炽热的东西。', 'beiliqina'],
          ]],
        ] },
    ],
    intro: [
      ['旁白', '码头尽头的黑影，西风港的老渔夫们都知道——那是近年来专门掀翻船只的海兽「利维亚桑」。'],
      ['老渔夫', '那家伙就窝在外海的旧浮台底下。去年连力奇老爹的船都被它拖下了海，那船上的船锚到现在都没捞上来……', 'enemy:villager'],
      ['力奇', '……老爹的船。哼，原来是你这条臭鱼干的好事。', 'liqi'],
      ['克荷林', '力奇，你想去？', 'kehelin'],
      ['力奇', '想？我是非去不可！克荷林，借我几个人，今晚就把它的脑袋割下来下酒！', 'liqi'],
      ['陶', '在海上和海兽打？这是我今年听过最不划算的生意。……不过，浮台够大，勉强站得住。', 'tao'],
      ['if', { has: 'beiliqina' }, [
        ['贝里奇娜', '那么大的海兽……普通的魔法大概只能让它挠挠痒。可是，我体内好像有一股更炽热的力量，正在醒过来。', 'beiliqina'],
        ['?', '贝里奇娜不安地看着自己的手掌。', [
          { label: '「别勉强。如果那股力量让你害怕，就交给我们。」', rel: { beiliqina: 10 }, auto: true, say: [
            ['贝里奇娜', '……不。正因为有你们在，我才敢试试看。', 'beiliqina'],
          ] },
          { label: '「你的力量是你自己的。放心去用吧。」', rel: { beiliqina: 5 }, say: [
            ['贝里奇娜', '我自己的……嗯。我试试看。', 'beiliqina'],
          ] },
        ]],
      ]],
      ['旁白', '夜半，兵团乘小船登上外海的旧浮台。月光下，海面无声地隆起。'],
      ['海兽利维亚桑', '————（深沉的吼声从海底传来）', 'enemy:kraken'],
    ],
    outro: [
      ['旁白', '巨大的海兽发出最后一声悲鸣，缓缓沉入漆黑的海底。海面重新归于平静。'],
      ['if', { has: 'beiliqina' }, [
        ['旁白', '最后的一击，是贝里奇娜召来的烈焰。海面下仿佛有一座火山喷发，滚烫的岩浆与水柱冲天而起。'],
        ['贝里奇娜', '「火山爆发」……这个名字，是自己浮现在我脑海里的。我以前……一定用过这个魔法。', 'beiliqina'],
        ['do', { learn: { beiliqina: ['volcano'] } }],
        ['克荷林', '不管以前怎样，现在的你，用它救了大家。这就够了。', 'kehelin'],
      ]],
      ['力奇', '……老爹，你的仇报了。', 'liqi'],
      ['波比', '力奇，你的眼睛在下雨！', 'bobi'],
      ['力奇', '是海水！是海水溅的！……克荷林，这份情，我力奇记一辈子。', 'liqi'],
    ],
    onWin: { set: { leviathan: true } },
    next: 'RETURN',
    reward: 3000,
  });
})();
