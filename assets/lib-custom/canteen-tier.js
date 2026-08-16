(function () {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      setTimeout(callback, 0);
    }
  }

  const canteenData = {};
  const tierOrder = ['夯', '顶级', '人上人', 'NPC', '拉完了'];

  const stalls = [
    // 🍜 简餐 / 一人食
    {
      name: '【星光广场二楼】拌将麻辣烫',
      tier: '夯',
      tierLabel: '顶级（星光麻辣烫领域） / 夯',
      rating: 5,
      description:
        '明厨亮灶、后厨干净，食材质量好，肉质不错，丸子不是劣质“科技丸”，有爆浆肠、芝士肠等真材实料，可做干拌（酱料多，有低卡选择）、水煮（清汤/牛油锅底）、油素汁干拌，人均约20元，比一般外卖略贵但物有所值，办卡有88折，周二送一道5元菜品。',
      pros: [
        '明厨亮灶，整体卫生感强',
        '肉类和丸子质量好，有爆浆肠、芝士肠等',
        '干拌 / 水煮 / 低卡等多种吃法可选',
        '价格略高但性价比合理，有办卡优惠和周二赠菜',
      ],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城】萨莉亚',
      tier: '人上人',
      tierLabel: '人上人 · 平价意式料理',
      rating: 3,
      description:
        '虽然是连锁店，但便宜又好吃，在平价意式料理领域没有明显竞品，因此在一人食场景下评价很高。',
      pros: ['价格便宜、选择多', '在同价位意式料理中没有明显竞品'],
      cons: [],
      note: '适合穷鬼套餐 / 一人食。',
    },
    {
      name: '【大悦城负一楼】其根大碗牛',
      tier: 'NPC',
      tierLabel: 'NPC（原定人上人，因不适合聚餐降级）',
      rating: 2,
      description:
        '可能是无锡特有或较少见的连锁，性价比高，约20元可以吃到肥牛饭+温泉蛋+无限畅饮酸梅汁，但整体只适合一人食，不太适合聚餐。',
      pros: ['单人套餐性价比高', '肥牛饭+温泉蛋+无限酸梅汁搭配舒服'],
      cons: ['不适合多人聚餐'],
      note: '',
    },
    {
      name: '【大悦城负一楼】冯宝宝肥牛小火锅',
      tier: '人上人',
      tierLabel: '人上人 · 一人火锅解法',
      rating: 3,
      description:
        '解决了“一个人想吃火锅”的痛点，食材质量不错，但环境拥挤，价格偏贵，吃饱大约需要60元以上。',
      pros: [
        '适合一个人吃火锅，周边没有海底捞的情况下很有存在感',
        '食材整体还可以',
      ],
      cons: ['环境拥挤、就餐体验一般', '价格偏贵，吃饱大概要 60 元以上'],
      note: '有人认为不如去海底捞点清水锅配单格，但考虑到地理位置和替代品缺失，综合评价仍偏正向。',
    },
    {
      name: '【星光广场】辣椒炒肉',
      tier: 'NPC',
      tierLabel: 'NPC · 星光新开辣椒炒肉',
      rating: 2,
      description:
        '刚炒出来的时候很香、很下饭，但整体属于全世界辣椒炒肉都很下饭的那一档，没有特别惊艳的点；博主甚至认为不如 22 楼那家辣椒炒肉好吃，最终给出中规中矩的 NPC。',
      pros: ['现炒很香，很下饭'],
      cons: ['没有特别惊艳之处', '对比 22 楼辣椒炒肉并不占优'],
      note: '',
    },

    // 🍲 正餐：锅类 / 大锅炖
    {
      name: '【星光广场】龙涛',
      tier: '顶级',
      tierLabel: '顶级 · 性价比超高锅类',
      rating: 4,
      description:
        '具体品类略偏火锅 / 干锅，老板人很好，对大学生打折（7～8 折），熟客甚至可以刷脸，口味顶级，整体属于“花小钱办大事”的高性价比聚餐选择。',
      pros: [
        '老板热情，大学生有折扣',
        '口味在线，适合重口味聚餐',
        '性价比极高，适合多人大锅吃肉',
      ],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城外围】五花火锅鸡',
      tier: '顶级',
      tierLabel: '顶级 · 大份量火锅鸡',
      rating: 4,
      description:
        '全是鸡腿肉且块大，人均 30～40 元就能吃到很足，夏天会提供免费西瓜，涮菜种类多且新鲜，是学生聚餐的高性价比火锅鸡选择。',
      pros: [
        '使用鸡腿肉且分量足，人均价格友好',
        '涮菜品种多且新鲜',
        '夏天有免费西瓜，服务细节加分',
      ],
      cons: ['环境较简陋', '人气极高，需要预约排队'],
      note: '',
    },
    {
      name: '【星光广场外围】摇滚炒鸡',
      tier: '人上人',
      tierLabel: '人上人 ~ 顶级 · 山东风味',
      rating: 3,
      description:
        '山东风味，机器炒制，口味统一稳定，加麻油后麻辣鲜香，地域特色明显，人均 30～40 元，整体介于人上人与顶级之间。',
      pros: ['标准化机器炒制，口味稳定', '加入麻油后麻辣鲜香，有明显山东风味'],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城 B1】刘记德大火锅鸡',
      tier: '人上人',
      tierLabel: '人上人 · 入围锅类',
      rating: 3,
      description:
        '大悦城 B1 的火锅鸡店，整体体验达到入围水准，具体细节未展开描述，可视作五花火锅鸡的平替或补充选项。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场二楼】星光超越火锅鸡',
      tier: '人上人',
      tierLabel: '人上人 · 环境友好的火锅鸡',
      rating: 3,
      description:
        '星光广场二楼的火锅鸡，相比五花火锅鸡，环境更好，有雅座，整体不那么拥挤，味道也不错，适合在星光周边就近解决聚餐需求。',
      pros: [
        '环境比五花火锅鸡好，有一定私密度',
        '味道表现不错，适合不想排太久队的场景',
      ],
      cons: [],
      note: '',
    },

    // 🥗 正餐：炒菜 / 地方菜
    {
      name: '【星光广场】重返白桦林',
      tier: '顶级',
      tierLabel: '顶级 · 招待朋友首选',
      rating: 4,
      description:
        '星光广场内的正餐馆，有露台，夏天晚上氛围很好，整体有故事感；菜品包含无锡特色菜（如油面筋等），口味中上，价格合适且学生可打折，是招待朋友和聚餐的首选之一。',
      pros: [
        '露台+夜景氛围感强，适合拍照和聊天',
        '有无锡本地特色菜，口味稳定在中上',
        '学生有折扣，整体价格友好',
      ],
      cons: ['团购通常不能和学生折扣叠加'],
      note: '',
    },
    {
      name: '【八方汇 / 庙街附近】海成楼',
      tier: '顶级',
      tierLabel: '顶级 · 东北菜硬菜馆',
      rating: 4,
      description:
        '东北菜为主，菜量大、实惠，人均 40～50 元可以吃到一桌大肉硬菜，忌口少，非常适合多人聚餐和大口吃肉的场景。',
      pros: [
        '菜量巨大，适合多人分食',
        '价格在人均 40～50 元区间，性价比高',
        '偏硬菜，大肉居多，满足感强',
      ],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场旁】穆罕默德清真餐厅',
      tier: '夯',
      tierLabel: '夯 · 新疆清真菜',
      rating: 5,
      description:
        '新疆清真菜馆，民族风味明显，重油、重香料，辣椒和胡萝卜用量充足，综合能力强，可一人食也可聚餐，人均约 60～70 元，喜欢新疆菜的人会非常喜欢，不习惯这类风味的人需要谨慎选择。',
      pros: [
        '民族风味浓郁，菜品辨识度高',
        '适合一人食和多人聚餐两种场景',
        '综合实力强，风味、分量和氛围都在线',
      ],
      cons: ['重油重香料，对清淡党不太友好'],
      note: '',
    },
    {
      name: '【大悦城】梅里山下·觅花涧',
      tier: '人上人',
      tierLabel: '人上人 · 云南菜 / 约会向',
      rating: 3,
      description:
        '大悦城里的云南菜馆，环境精致，属于“漂亮饭”，很适合约会或请客；菜品有创意、味道不错，但价格较贵，人均约 80～90 元，更偏向氛围消费。',
      pros: ['装修精致，氛围感强，适合拍照和约会', '菜品有创意，口味整体在线'],
      cons: ['价格偏贵，人均 80～90 元', '性价比相对其他馆子略低'],
      note: '',
    },

    // 🦞 自助餐
    {
      name: '【大悦城】钱小奴',
      tier: 'NPC',
      tierLabel: 'NPC（2026-08 从顶级下调）',
      rating: 2,
      description:
        '江大周边自助餐“权威”，价格涨到了 80～90 元，海鲜和牛肉质量一般，但在学校附近想吃爽、想要品类全，它依旧是首选；如果放在全市范围来看，只能算一般水平。',
      pros: ['江大附近品类最全的自助餐之一', '吃到爽的上限较高'],
      cons: ['海鲜和牛肉质量一般', '价格相对学生预算略高'],
      note: '',
    },
    {
      name: '【大悦城】快乐爱斯米',
      tier: '拉完了',
      tierLabel: '拉完了 · 自助品类过少',
      rating: 1,
      description:
        '品类太少，性价比偏低。2026 年已改版：不再是 36 元随便吃，不点寿喜烧套餐里的肉基本拿不到什么，正常吃肉要 60 多元——这个价钱不如去吃流浪泡泡或者龙哥。本来也只有 1 星，没有再降的空间了。',
      pros: [],
      cons: ['菜品和品类过少', '即使便宜也不如去吃别的'],
      note: '',
    },
    {
      name: '【大悦城】韩右右',
      tier: '拉完了',
      tierLabel: '拉完了 · 卫生和肉质问题',
      rating: 1,
      description:
        '卫生状况堪忧，有吃完拉肚子的经历反馈，肉质也偏差，出现“咬不动”的情况，整体不推荐。',
      pros: [],
      cons: ['卫生问题严重，曾出现吃完肚子不舒服的情况', '肉质差，口感不好'],
      note: '',
    },

    // 🍸 小酒馆 / 简餐
    {
      name: '【星光广场】烙印 Lao Yin',
      tier: '人上人',
      tierLabel: '人上人 · 清吧 + 泰式简餐',
      rating: 3,
      description:
        '清吧 + 简餐类型的小酒馆，环境氛围接近顶级：灯光偏暗、人不多、安静不吵，适合晚上喝一杯调酒；餐食主打泰式风味（椰香鸡块、打抛饭、生牛肉等），有流心蛋，整体感觉比较健康，简餐人均约 25 元（外卖 / 堂食价格接近）。内部有争议，一方觉得只是普通 NPC 简餐，另一方认为结合氛围、健康程度和口味，值得人上人，综合后定级为人上人。',
      pros: [
        '氛围好，灯光和环境适合小酌聊天',
        '人不多且安静，不吵闹',
        '泰式风味简餐，食材相对健康',
        '简餐人均约 25 元，外卖和堂食价格接近',
      ],
      cons: ['在只看餐食的前提下会被部分人认为只是 NPC 简餐'],
      note: '',
    },

    // 🏢 商场连锁店（通常 NPC）
    {
      name: '【大悦城】新白鹿',
      tier: 'NPC',
      tierLabel: 'NPC · 普通商场连锁',
      rating: 2,
      description:
        '全国连锁商场品牌，江大这边也有，整体水平与其他城市门店类似，性价比一般，适合随便吃吃，不值得专门来学校门口打卡。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城】小菜园',
      tier: 'NPC',
      tierLabel: 'NPC · 普通商场连锁',
      rating: 2,
      description:
        '典型的全国性连锁门店，口味和体验较为统一，作为日常正餐可以，但在江大周边不算特别有特点。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城】胖哥俩肉蟹煲',
      tier: 'NPC',
      tierLabel: 'NPC · 全国都有的肉蟹煲',
      rating: 2,
      description:
        '标准化连锁肉蟹煲，全国各地商场都能见到，在江大周边吃并没有额外加成，更多是图方便。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城负一楼】和府捞面',
      tier: 'NPC',
      tierLabel: 'NPC · 连锁面馆',
      rating: 2,
      description:
        '全国连锁的书房风格面馆，环境舒适但价格偏贵，适合赶时间随便吃一顿。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城负一楼】鸭血粉丝汤（胥先生）',
      tier: 'NPC',
      tierLabel: 'NPC · 商场鸭血粉丝',
      rating: 2,
      description:
        '胥先生品牌的鸭血粉丝汤，口味标准化，在全国很多地方都能吃到，江大这边没有明显差异点。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光一楼】五口灶',
      tier: 'NPC',
      tierLabel: 'NPC · 类似食堂',
      rating: 2,
      description:
        '星光一楼类似食堂的快餐档，充卡吃还行，当作日常食堂替代还可以，单次散点就比较一般。',
      pros: ['充卡后日常吃比较划算'],
      cons: ['整体体验类似食堂，散点体验一般'],
      note: '',
    },

    // 🍢 烧烤 / 小吃
    {
      name: '【星光广场】破店烧烤',
      tier: '人上人',
      tierLabel: '人上人 · 便宜人气烧烤',
      rating: 3,
      description:
        '初体验觉得一般，但晚上生意极好，人流量大说明口味受众广；整体价格便宜，还有一些没见过的特色菜品。',
      pros: ['价格便宜', '生意好、人流量大', '有一些少见的特色菜品'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】星光小屋',
      tier: '顶级',
      tierLabel: '顶级 · 韩式自助 / 单点烤肉',
      rating: 4,
      description:
        '韩式自助+单点结合，单人自助约 80 元（团购 70+），也可以单点；有小隔间，适合团建和聚餐，装修有氛围；有原切肉、烤菠萝等菜品，味道不错。',
      pros: [
        '单人自助价格相对友好，也支持单点',
        '有小隔间，适合团建和聚餐',
        '环境和装修氛围好',
        '有原切肉、烤菠萝等菜品，口味不错',
      ],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】味多多脏摊麻辣串',
      tier: '人上人',
      tierLabel: '人上人 · 芝麻酱很香',
      rating: 3,
      description:
        '味道不错，芝麻酱很香，价格合适，是麻辣串领域可以一试的档口。',
      pros: ['芝麻酱很香', '整体味道不错', '价格合适'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】炸串吧',
      tier: 'NPC',
      tierLabel: 'NPC · 炸串平替',
      rating: 2,
      description:
        '在正新鸡排隔壁屹立不倒，说明有一定实力；味道和喜姐炸串差不多，价格略便宜一点。',
      pros: ['味道类似喜姐炸串', '价格比喜姐略便宜'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】正新鸡排',
      tier: 'NPC',
      tierLabel: 'NPC · 不再是当年的 10 元鸡排',
      rating: 2,
      description:
        '标准连锁鸡排店，不再是当年 10 元时期的高性价比，整体性价比不高。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【大悦城 & 星光广场】塔斯汀中国汉堡',
      tier: '人上人',
      tierLabel: '人上人 · 面皮有特色',
      rating: 3,
      description: '口味不错，面皮有自己特色，在国产汉堡中有一定辨识度。',
      pros: ['口味不错', '面皮有明显特色'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】心福口福里脊饼',
      tier: '拉完了',
      tierLabel: '拉完了 · 里脊饼踩雷',
      rating: 1,
      description: '整体体验较差，被归入拉完了，仅作为避雷参考。',
      pros: [],
      cons: [],
      note: '',
    },

    // 🍜 粉面 / 简餐（一人食）
    {
      name: '【星光广场】肥汁四囍',
      tier: '人上人',
      tierLabel: '人上人 · 酸甜米线',
      rating: 3,
      description: '酸酸甜甜，口味不错，对标“鑫花溪”，作为米线选项体验良好。',
      pros: ['酸甜口味，风味讨喜', '对标鑫花溪，整体体验不错'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】朱家牛肉汤',
      tier: '人上人',
      tierLabel: '人上人 · 正宗牛肉汤',
      rating: 3,
      description: '服务好，味道正宗，是“牛肉汤该有的味道”。',
      pros: ['服务态度好', '牛肉汤味道正宗'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】淮南牛肉汤',
      tier: '人上人',
      tierLabel: '人上人 · 守门员',
      rating: 3,
      description:
        '类似沙县模式的快餐档，非连锁但这家口味不错，必点牛肉炒饭（18 元，加萝卜干特别好吃）；饭点可能要排队，人气说明实力。',
      pros: ['牛肉炒饭必点，加萝卜干很好吃', '饭点可能需要排队，人气高'],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】多多麻辣拌',
      tier: '人上人',
      tierLabel: '人上人 · 情怀麻辣拌',
      rating: 3,
      description:
        '有以前“月热晴”的影子（酸甜麻辣口），台面干净、菜品摆放整齐，适合单人吃，但不太适合聚餐。',
      pros: ['酸甜麻辣口带情怀感', '台面干净、菜品摆放整齐'],
      cons: ['更适合单人吃，不适合多人聚餐'],
      note: '',
    },
    {
      name: '【星光广场】阿臻味道米粉',
      tier: '人上人',
      tierLabel: '人上人 · 新疆炒米粉',
      rating: 3,
      description:
        '正宗新疆炒米粉（新疆朋友认证），味道比普通连锁更浓烈，连锁店通常偏柔和 / 偏甜，这家虽然环境一般，但味道正。',
      pros: ['新疆朋友认证的正宗味道', '味道比普通连锁更浓烈'],
      cons: ['环境一般'],
      note: '',
    },
    {
      name: '【星光广场】同学会东北菜',
      tier: '人上人',
      tierLabel: '人上人 · 海成楼平替',
      rating: 3,
      description:
        '海成楼的平替，离得近、价格便宜，虽然摆盘和环境不如海成楼，但人少去吃很合适。',
      pros: ['离近、价格便宜', '适合人少随便吃一顿东北菜'],
      cons: ['摆盘和环境不如海成楼'],
      note: '',
    },
    {
      name: '【星光广场】南云上品',
      tier: 'NPC',
      tierLabel: 'NPC · 从人上人降级',
      rating: 2,
      description:
        '大一时的回忆，量大管饱（曾经人均能吃四碗饭），但现在看，肉是提前炸过的，不太健康，卫生一般，因此从人上人降为 NPC。',
      pros: ['分量大、很管饱'],
      cons: ['肉提前炸过，健康属性一般', '整体卫生感一般'],
      note: '',
    },
    {
      name: '【星光广场】罗罐中米粉',
      tier: '拉完了',
      tierLabel: '拉完了 · 量多但不好吃',
      rating: 1,
      description: '量比周真真多，但不好吃，因此直接归入拉完了。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】河南滋补烩面',
      tier: '拉完了',
      tierLabel: '拉完了 · 对不起价格',
      rating: 1,
      description: '难吃，对不起价格，被归入拉完了。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】陈凤祥肠粉店',
      tier: '拉完了',
      tierLabel: '拉完了 · 肠粉+猪脚饭踩雷',
      rating: 1,
      description:
        '装修前是平庸肠粉（NPC），装修后主打的猪脚饭极难吃（饭一口没动），整体直接跌入拉完了。',
      pros: [],
      cons: [],
      note: '',
    },

    // 🍛 炒饭 / 晚间快餐
    {
      name: '【星光广场】张三炒饭',
      tier: 'NPC',
      tierLabel: 'NPC · 锅气足但有争议的卤肉炒饭',
      rating: 2,
      description:
        '招牌是卤肉炒饭，锅气非常足、卤肉很香，虽然偏油但吃起来很爽；缺点是油大、价格偏贵（卤肉炒饭大致在 15～16 元一份，有人甚至说要到 23 元，普遍认为只值 10～12 元），排队时间也比较久。相比另外两家海鲜炒饭（走干香路线），张三的卤肉炒饭更有特色。内部评价存在较大分歧：捞鱼认为太油、排队久、性价比一般，给到 NPC；吴彦祖和走位怪则觉得确实好吃、锅气足，倾向于人上人。最终以 2 比 1 的票数判定为 NPC，并在备注中写明：口味党觉得很香，性价比党觉得不行。',
      pros: ['卤肉很香，锅气足', '相比其他海鲜炒饭更有自己的特色'],
      cons: ['偏油', '价格偏贵、性价比争议大', '排队时间久'],
      note: '口味党觉得很香，性价比党觉得不行。',
    },

    // 🚫 避雷 / 差评区（拉完了）
    {
      name: '【星光广场】老宁波干菜',
      tier: '拉完了',
      tierLabel: '拉完了 · 店面卫生差',
      rating: 1,
      description:
        '店面极脏，地板黏、桌面不及时收拾，消毒柜不开，菜品不新鲜，被列入避雷名单。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】辣心上麻辣香锅',
      tier: '拉完了',
      tierLabel: '拉完了 · 肉质极差',
      rating: 1,
      description:
        '自助 23 元一位看似便宜，但肉是假肉 / 合成肉，品质极差，不如去吃普通快餐。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】杨铭宇黄焖鸡',
      tier: 'NPC',
      tierLabel: 'NPC · 中规中矩的黄焖鸡',
      rating: 2,
      description:
        '整体中规中矩，甚至懒得细评，有负面新闻加成，不如去大悦城吃其他黄焖鸡。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】陈先生海鲜炒饭',
      tier: 'NPC',
      tierLabel: 'NPC · 上菜慢',
      rating: 2,
      description: '上菜极慢，被明确提到这一点，因此仅列入 NPC 级别。',
      pros: [],
      cons: [],
      note: '',
    },

    // 😐 普通区（NPC - 没必要特意去）
    {
      name: '【星光广场】七味餐厅',
      tier: 'NPC',
      tierLabel: 'NPC · 石锅拌饭',
      rating: 2,
      description: '普通石锅拌饭档口，整体口味平平，属于“随便吃吃”级别。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】大熊家',
      tier: 'NPC',
      tierLabel: 'NPC · 普通餐厅',
      rating: 2,
      description: '整体表现普通，没有特别明显的亮点或槽点。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】小姐姐（杂物+螺蛳粉）',
      tier: 'NPC',
      tierLabel: 'NPC · 一家独大但味道一般',
      rating: 2,
      description:
        '卖杂物和螺蛳粉，在区域内属于“一家独大”，但口味本身比较一般，不值得专门去。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】酱骨头',
      tier: 'NPC',
      tierLabel: 'NPC · 普通酱骨头店',
      rating: 2,
      description: '酱骨头档口，整体味道尚可但不出挑，归入普通区。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】金年任韩式饭',
      tier: 'NPC',
      tierLabel: 'NPC · 韩式饭',
      rating: 2,
      description: '韩式饭快餐店，口味平平，适合就近解决一餐。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】蛇蛇身牛肉米粉',
      tier: 'NPC',
      tierLabel: 'NPC · 牛肉米粉',
      rating: 2,
      description: '普通牛肉米粉档口，整体无功无过。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】小娟阿姨板面',
      tier: 'NPC',
      tierLabel: 'NPC · 满 16 送鸡腿',
      rating: 2,
      description:
        '有“满 16 送鸡腿”的活动，但板面口味太一般，整体只在 NPC 水平。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场二楼】张亮麻辣烫',
      tier: 'NPC',
      tierLabel: 'NPC · 连锁麻辣烫',
      rating: 2,
      description:
        '全国连锁麻辣烫，口味和体验比较标准化，在江大周边不算特别出彩。2026-08 有同学反馈已搬到星光广场二楼继续营业。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场西边老店】李记重庆鸡公煲',
      tier: 'NPC',
      tierLabel: 'NPC · 中规中矩',
      rating: 2,
      description: '西边老店，整体中规中矩，没有特别明显的亮点。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【星光广场】福宇记黄焖鸡',
      tier: 'NPC',
      tierLabel: 'NPC · 普通黄焖鸡',
      rating: 2,
      description:
        '普通黄焖鸡档口，味道一般，作为日常选择可以，但不值得特意打卡。',
      pros: [],
      cons: [],
      note: '',
    },
    {
      name: '【周边·仅早餐时段】肯德基（早餐）',
      tier: '夯',
      tierLabel: '夯 · 早餐评分锚点（4.5 星）',
      rating: 4.5,
      description:
        '芝士鸡肉帕尼尼 + 冰豆浆，约 8 元。冰豆浆太好喝了！早餐品类限量供应、只在早餐时段有，和其他品类很不一样，所以单独标注。评分锚点：大家都吃过，用来校准整体打分。',
      pros: ['冰豆浆太好喝了', '8 元早餐组合性价比高'],
      cons: ['仅早餐时段供应，限量'],
      note: '建议买肯德基早餐卡，或者闲鱼代下单更便宜。',
    },
    {
      name: '【周边·仅早餐时段】麦当劳（早餐）',
      tier: '顶级',
      tierLabel: '顶级 · 早餐评分锚点（4 星）',
      rating: 4,
      description:
        '吉士蛋麦满分组合（吉士蛋麦满分 + 热豆浆），约 7.5 元。麦满分胚子上有碎碎的点点，口感特别好；热豆浆一般般。仅早餐时段供应，单独标注。',
      pros: ['麦满分胚子口感特别好', '7.5 元组合便宜'],
      cons: ['热豆浆一般般', '仅早餐时段供应'],
      note: '同样建议早餐卡或闲鱼代下单。',
    },
    {
      name: '【大悦城一楼商场外围】牛约堡',
      tier: 'NPC',
      tierLabel: 'NPC · 性价比很高但味道一般',
      rating: 2,
      description:
        '汉堡连锁。味道一般般，本来想给 2.5 星，但毕竟是哪儿都能吃到的连锁，就按 2 星算。突出的点是性价比：截至 2026 年 8 月依然很能打，单人餐 16.6 元，双人六件套 24.9 元——双人餐可以吃成巨人观。整体感觉不如汉堡王。',
      pros: ['性价比极高：单人餐 16.6 元、双人六件套 24.9 元', '分量能吃到巨人观'],
      cons: ['味道一般般', '连锁店哪儿都能吃到', '感觉不如同类汉堡王'],
      note: '',
    },
    {
      name: '【大悦城负一楼】清膳记药膳鸡',
      tier: '拉完了',
      tierLabel: '拉完了 · 中药味劝退（1.9 星）',
      rating: 1.9,
      description:
        '药膳鸡单人餐参考价 44 元。有的人喜欢它的中药味，但我不太喜欢，不好意思，只能给 1.9 星。小菜自助，但至少我去的那天小菜卫生质量一般、都是很一般的蔬菜。吃肯定能吃饱——44 块钱去哪家连锁店正常吃都能吃饱。一股中药味，不喜欢。',
      pros: ['小菜自助，能吃饱'],
      cons: ['一股中药味（不喜欢的会很痛苦）', '小菜卫生质量一般', '44 元性价比低'],
      note: '',
    },
  ];

  stalls.forEach((item) => {
    canteenData[item.name] = item;
  });

  const tierColors = {
    夯: {
      gradient: 'linear-gradient(135deg, #d22b1f 0%, #f1542c 100%)',
      textColor: '#fff',
      shadow: 'rgba(210, 43, 31, 0.3)',
    },
    顶级: {
      gradient: 'linear-gradient(135deg, #f5a000 0%, #ffd54f 100%)',
      textColor: '#1D1D1F',
      shadow: 'rgba(245, 160, 0, 0.25)',
    },
    人上人: {
      gradient: 'linear-gradient(135deg, #ffe450 0%, #fff59d 100%)',
      textColor: '#1D1D1F',
      shadow: 'rgba(255, 228, 80, 0.25)',
    },
    NPC: {
      gradient: 'linear-gradient(135deg, #fff7e1 0%, #fffdf4 100%)',
      textColor: '#4A4A4A',
      shadow: 'rgba(0, 0, 0, 0.08)',
    },
    拉完了: {
      gradient: 'linear-gradient(135deg, #cfd4d8 0%, #f1f3f5 100%)',
      textColor: '#4A4A4A',
      shadow: 'rgba(0, 0, 0, 0.05)',
    },
  };

  function getRatingStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '⭐'.repeat(full + (half ? 1 : 0)) + '☆'.repeat(5 - full - (half ? 1 : 0));
  }

  function generateModalContent(data) {
    const tierStyle = tierColors[data.tier] || tierColors['NPC'];
    let html = `
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; background: ${tierStyle.gradient}; color: ${tierStyle.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 8px ${tierStyle.shadow};">
          评分：${data.tierLabel}
        </div>
      </div>
      <p style="font-size: 1.05em; line-height: 1.9; margin-bottom: 20px;">${data.description}</p>
    `;

    if (data.pros && data.pros.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(255, 177, 66, 0.1) 0%, rgba(255, 138, 120, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(255, 177, 66, 0.2);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 亮点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.pros.map((pro) => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(252, 243, 207, 0.1) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(250, 112, 154, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">⚠️ 踩雷点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.cons.map((con) => `<li>${con}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.note) {
      html += `
        <div style="background: rgba(0, 0, 0, 0.03); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 3px solid #ffb142;">
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>私藏吃法：</strong>${data.note}</p>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 24px; text-align: center;">
        <div style="font-size: 1.2em; letter-spacing: 2px;">${getRatingStars(
          data.rating
        )}</div>
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">复购指数</p>
      </div>
    `;

    return html;
  }

  function generateContentSectionHTML() {
    let html = '<h2>档口详细手记</h2>';
    tierOrder.forEach((tier) => {
      const tierStalls = Object.values(canteenData).filter(
        (item) => item.tier === tier
      );
      if (!tierStalls.length) return;
      tierStalls.forEach((data) => {
        html += `<h3>${data.name} · ${data.tierLabel}</h3>`;
        html += `<p>${data.description}</p>`;
      });
    });
    return html;
  }

  function populateTierList() {
    const tierItems = {};
    document.querySelectorAll('.tier-row').forEach((row) => {
      const label = row.querySelector('.tier-label');
      const items = row.querySelector('.tier-items');
      if (label && items) {
        tierItems[label.textContent.trim()] = items;
        items.innerHTML = '';
      }
    });

    stalls.forEach((stall) => {
      const container = tierItems[stall.tier];
      if (!container) return;

      const card = document.createElement('div');
      card.className = 'spot-card';
      card.setAttribute('data-spot', stall.name);

      if (stall.bgImage) {
        card.classList.add('spot-card--with-bg');
        card.style.setProperty('--spot-bg-image', `url("${stall.bgImage}")`);
      }

      const label = document.createElement('span');
      label.className = 'spot-card__name';
      label.textContent = stall.name;
      card.appendChild(label);

      container.appendChild(card);
    });
  }

  function initCanteenTier() {
    const modal = document.getElementById('spotModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const contentSection = document.querySelector('.content-section');

    populateTierList();

    const spotCards = document.querySelectorAll('.spot-card');

    function showModal(stallName) {
      const data = canteenData[stallName];
      if (!data || !modal || !modalTitle || !modalBody) {
        return;
      }

      modalTitle.textContent = data.name;
      modalBody.innerHTML = generateModalContent(data);

      modal.style.display = 'flex';
      modal.style.opacity = '0';
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
        void modal.offsetWidth;
        requestAnimationFrame(() => {
          modal.classList.add('show');
          modal.style.opacity = '1';
          modalContent.style.transform = 'translateY(0) scale(1)';
          modalContent.style.opacity = '1';
        });
      } else {
        modal.classList.add('show');
        modal.style.opacity = '1';
      }

      document.body.style.overflow = 'hidden';
    }

    function hideModal() {
      if (!modal) return;
      const modalContent = modal.querySelector('.modal-content');
      modal.style.opacity = '0';
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
      }
      setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }

    spotCards.forEach((card) => {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        const stallName = this.getAttribute('data-spot');
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
          showModal(stallName);
        }, 150);
      });

      let touchStartTime = 0;
      card.addEventListener('touchstart', function () {
        touchStartTime = Date.now();
        this.style.transform = 'scale(0.98)';
      });

      card.addEventListener('touchend', function () {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 300) {
          this.style.transform = 'scale(1.02)';
          setTimeout(() => {
            this.style.transform = '';
          }, 100);
        } else {
          this.style.transform = '';
        }
      });
    });

    if (modalClose) {
      modalClose.addEventListener('click', hideModal);
    }

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          hideModal();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
        hideModal();
      }
    });

    if (contentSection) {
      contentSection.innerHTML = generateContentSectionHTML();
    }
  }

  onReady(initCanteenTier);
})();
