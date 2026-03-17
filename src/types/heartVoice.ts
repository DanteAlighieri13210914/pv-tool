export interface HeartVoiceConfig {
  /** 字体大小 */
  fontSize?: number;
  /** 交错延迟 */
  staggerDelay?: number;
  /** 预分词字典 - 格式: { "原文本": ["分词结果"] } */
  preDict?: Record<string, string[]>;
  /** 回退分词器类型: 'char' | 'whitespace' */
  fallbackSegmenter?: 'char' | 'whitespace';
}
