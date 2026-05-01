/** 与产品筛选里「风格标签」选项一致，用于首页横滑等 */
export const STYLE_MOOD_TAGS = [
  '运动',
  '性能赛道',
  'OEM风格',
  '豪华商务',
  '越野',
  '复古',
] as const

export type StyleMoodTag = (typeof STYLE_MOOD_TAGS)[number]
