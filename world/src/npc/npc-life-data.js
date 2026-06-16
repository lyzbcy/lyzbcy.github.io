/**
 * Life data for each NPC, keyed by category.
 * Merged onto the base NPC_DATA at runtime so the original data file stays simple.
 *
 * Each entry gives a character:
 *  - personality: roaming speed multiplier key
 *  - homeType:    procedural building/booth built beside them (npc-scenery.js)
 *  - face:        'image' (real sticker) or 'sprite' (procedural cartoon)
 *  - faceImage:   path under /world/ for image-faced NPCs
 *  - schedule:    cyclic list of states. Each state:
 *      duration (sec)   - how long they stay in this state
 *      mood             - speech-bubble text while in this state
 *      activity         - animation hint (lift/walk/type/cook/idle/...)
 *      waypoint {da,dr} - offset from home anchor (angle delta, radius delta)
 */

export const NPC_LIFE = {
  '健身': {
    personality: 'energetic',
    homeType: 'gym',
    face: 'sprite',
    schedule: [
      { duration: 14, mood: '再做一组深蹲！', activity: 'lift', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '去喝口蛋白粉', activity: 'walk', waypoint: { da: 0.12, dr: -3 } },
      { duration: 16, mood: '今天的状态不错', activity: 'flex', waypoint: { da: -0.1, dr: 2 } },
      { duration: 8, mood: '回家休息咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '星星布丁': {
    personality: 'gentle',
    homeType: 'cottage',
    face: 'image',
    faceImage: 'faces/xingxing.png',
    schedule: [
      { duration: 18, mood: '今天想做个布丁~', activity: 'idle', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '出去散散步', activity: 'walk', waypoint: { da: 0.15, dr: 3 } },
      { duration: 14, mood: '想捞鱼了', activity: 'idle', waypoint: { da: -0.12, dr: -2 } },
      { duration: 8, mood: '回家写信咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  'Unity开发': {
    personality: 'focused',
    homeType: 'workstation',
    face: 'sprite',
    schedule: [
      { duration: 20, mood: '在写插件…别打扰', activity: 'type', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '起来活动活动', activity: 'walk', waypoint: { da: 0.1, dr: 2 } },
      { duration: 14, mood: '这个bug有点棘手', activity: 'think', waypoint: { da: -0.08, dr: -1 } },
      { duration: 8, mood: '下班回家咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '美食': {
    personality: 'jolly',
    homeType: 'foodstall',
    face: 'sprite',
    schedule: [
      { duration: 16, mood: '今天推荐小龙虾！', activity: 'cook', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '去探探新店', activity: 'walk', waypoint: { da: 0.14, dr: 3 } },
      { duration: 14, mood: '这家的味道绝了', activity: 'eat', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '收摊回家咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '旅游': {
    personality: 'wanderer',
    homeType: 'tent',
    face: 'sprite',
    schedule: [
      { duration: 12, mood: '下一站去哪呢', activity: 'walk', waypoint: { da: 0.18, dr: 4 } },
      { duration: 14, mood: '查查攻略', activity: 'map', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '这张照片真好看', activity: 'photo', waypoint: { da: -0.16, dr: -3 } },
      { duration: 10, mood: '回帐篷休息咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '社会体验报告': {
    personality: 'thoughtful',
    homeType: 'bench',
    face: 'sprite',
    schedule: [
      { duration: 18, mood: '观察中…勿扰', activity: 'observe', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '出去采访一下', activity: 'walk', waypoint: { da: 0.12, dr: 2 } },
      { duration: 14, mood: '今天的发现真多', activity: 'write', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '回家整理笔记', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '学习': {
    personality: 'focused',
    homeType: 'library',
    face: 'sprite',
    schedule: [
      { duration: 20, mood: '正在刷题…', activity: 'study', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '换个地方继续', activity: 'walk', waypoint: { da: 0.1, dr: 2 } },
      { duration: 14, mood: '心流状态真爽', activity: 'think', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '回书馆咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '就业': {
    personality: 'busy',
    homeType: 'office',
    face: 'sprite',
    schedule: [
      { duration: 16, mood: '在做规划书', activity: 'type', waypoint: { da: 0, dr: 0 } },
      { duration: 8, mood: '赶去面试！', activity: 'walk', waypoint: { da: 0.16, dr: 3 } },
      { duration: 14, mood: '前途一片光明', activity: 'think', waypoint: { da: -0.12, dr: -2 } },
      { duration: 8, mood: '下班回家咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '工具': {
    personality: 'tinkerer',
    homeType: 'workshop',
    face: 'sprite',
    schedule: [
      { duration: 18, mood: '在调试新工具', activity: 'tinker', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '出去找找灵感', activity: 'walk', waypoint: { da: 0.12, dr: 2 } },
      { duration: 14, mood: '这个工具真香', activity: 'idle', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '回工坊咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '生活': {
    personality: 'gentle',
    homeType: 'cottage',
    face: 'sprite',
    schedule: [
      { duration: 16, mood: '泡杯茶慢慢喝', activity: 'idle', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '去花园转转', activity: 'walk', waypoint: { da: 0.14, dr: 3 } },
      { duration: 14, mood: '今天也要好好生活', activity: 'idle', waypoint: { da: -0.12, dr: -2 } },
      { duration: 8, mood: '回家做饭咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '写作': {
    personality: 'thoughtful',
    homeType: 'cottage',
    face: 'sprite',
    schedule: [
      { duration: 20, mood: '灵感来了，别打扰', activity: 'write', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '出去找找感觉', activity: 'walk', waypoint: { da: 0.12, dr: 2 } },
      { duration: 14, mood: '这句话写得真好', activity: 'think', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '回家歇笔咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '泰拉瑞亚': {
    personality: 'adventurous',
    homeType: 'tent',
    face: 'sprite',
    schedule: [
      { duration: 12, mood: '去挖矿！', activity: 'walk', waypoint: { da: 0.16, dr: 4 } },
      { duration: 14, mood: '盖个新房子', activity: 'build', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '这把剑真强', activity: 'idle', waypoint: { da: -0.14, dr: -3 } },
      { duration: 10, mood: '回基地存档咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '微信小游戏': {
    personality: 'tinkerer',
    homeType: 'workstation',
    face: 'sprite',
    schedule: [
      { duration: 18, mood: '在调小游戏…', activity: 'type', waypoint: { da: 0, dr: 0 } },
      { duration: 10, mood: '测试一下玩法', activity: 'walk', waypoint: { da: 0.12, dr: 2 } },
      { duration: 14, mood: '这个点子不错', activity: 'think', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '下班回家咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  },
  '周三涵': {
    personality: 'gentle',
    homeType: 'bench',
    face: 'image',
    faceImage: 'faces/zhouhan.png',
    schedule: [
      { duration: 18, mood: '今天想记点什么…', activity: 'idle', waypoint: { da: 0, dr: 0 } },
      { duration: 12, mood: '出去走走', activity: 'walk', waypoint: { da: 0.13, dr: 3 } },
      { duration: 14, mood: '嗯，就这样吧', activity: 'idle', waypoint: { da: -0.1, dr: -2 } },
      { duration: 8, mood: '回家记日记咯', activity: 'walk', waypoint: { da: 0, dr: 0 } }
    ]
  }
};

// Roaming speed multipliers per personality
export const PERSONALITY_SPEED = {
  energetic: 1.4,
  jolly: 1.2,
  adventurous: 1.3,
  wanderer: 1.15,
  busy: 1.25,
  focused: 0.8,
  thoughtful: 0.7,
  gentle: 0.75,
  tinkerer: 0.9
};

/**
 * Merge life data onto the base NPC list.
 * Returns a new array; does not mutate the input.
 */
export function withLife(npcData) {
  return npcData.map(npc => {
    const life = NPC_LIFE[npc.category] || NPC_LIFE['周三涵'];
    return { ...npc, ...life };
  });
}
