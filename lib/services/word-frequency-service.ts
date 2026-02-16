// 词频统计服务 - 统计分析结果中的标签词频

import { TagSystem } from './comment-analysis-service';
import { NEW_COLUMNS } from '../utils/csv-generator';

// ==================== 类型定义 ====================

export type WordFrequencyMap = Record<string, number>;

export interface WordFrequencyResult {
  [column: string]: WordFrequencyMap;
}

export interface TaggedWordFrequency {
  tag: string;
  count: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// ==================== 词频统计类 ====================

export class WordFrequencyService {
  /**
   * 统计所有标签的词频
   * @param tagResults 所有评论的标签结果
   * @returns 按列分类的词频统计
   */
  static calculateWordFrequency(tagResults: TagSystem[]): WordFrequencyResult {
    const result: WordFrequencyResult = {};

    // 初始化所有列的词频映射
    for (const column of NEW_COLUMNS) {
      result[column] = {};
    }

    // 遍历所有标签结果
    for (const tags of tagResults) {
      // 遍历每个列
      for (const column of NEW_COLUMNS) {
        const frequencyMap = result[column];

        // 获取该列对应的标签值
        const tagValues = this.getTagValuesForColumn(tags, column);

        // 统计每个标签的出现次数
        for (const tag of tagValues) {
          // 清理标签（移除情感标记）
          const cleanTag = this.cleanSentimentMark(tag).trim();

          if (cleanTag) {
            frequencyMap[cleanTag] = (frequencyMap[cleanTag] || 0) + 1;
          }
        }
      }
    }

    // 对每列的词频进行排序（从高到低）
    for (const column of NEW_COLUMNS) {
      result[column] = this.sortWordFrequency(result[column]);
    }

    return result;
  }

  /**
   * 获取指定列的TOP N高频词
   */
  static getTopWords(
    frequencyResult: WordFrequencyResult,
    column: string,
    topN: number = 10
  ): TaggedWordFrequency[] {
    const frequencyMap = frequencyResult[column] || {};

    return Object.entries(frequencyMap)
      .slice(0, topN)
      .map(([tag, count]) => ({
        tag,
        count,
        sentiment: this.detectSentiment(tag),
      }));
  }

  /**
   * 获取所有高频标签汇总（跨所有列）
   */
  static getAllTopTags(
    frequencyResult: WordFrequencyResult,
    topN: number = 20
  ): TaggedWordFrequency[] {
    const allTags: TaggedWordFrequency[] = [];

    for (const column of NEW_COLUMNS) {
      const tags = this.getTopWords(frequencyResult, column, topN);
      allTags.push(...tags);
    }

    // 按出现次数排序
    allTags.sort((a, b) => b.count - a.count);

    return allTags.slice(0, topN);
  }

  /**
   * 按维度分组获取高频标签
   */
  static getTopTagsByDimension(
    frequencyResult: WordFrequencyResult,
    dimension: '人群与场景' | '功能价值' | '保障价值' | '体验价值',
    topN: number = 10
  ): { column: string; tags: TaggedWordFrequency[] }[] {
    const dimensionColumns = this.getColumnsByDimension(dimension);
    const result: { column: string; tags: TaggedWordFrequency[] }[] = [];

    for (const column of dimensionColumns) {
      const tags = this.getTopWords(frequencyResult, column, topN);
      if (tags.length > 0) {
        result.push({ column, tags });
      }
    }

    return result;
  }

  /**
   * 统计情感分布
   */
  static getSentimentDistribution(
    frequencyResult: WordFrequencyResult,
    column: string
  ): { positive: number; negative: number; neutral: number } {
    const frequencyMap = frequencyResult[column] || {};
    const distribution = { positive: 0, negative: 0, neutral: 0 };

    for (const tag in frequencyMap) {
      const sentiment = this.detectSentiment(tag);
      distribution[sentiment] += frequencyMap[tag];
    }

    return distribution;
  }

  // ==================== 私有方法 ====================

  /**
   * 根据列名从标签体系中获取对应的值
   */
  private static getTagValuesForColumn(tags: TagSystem, column: string): string[] {
    const tagPath = this.getColumnToTagPath(column);

    if (!tagPath) {
      return [];
    }

    const { dimension, category } = tagPath;
    return tags[dimension]?.[category] || [];
  }

  /**
   * 将列名映射到标签体系的维度和分类
   */
  private static getColumnToTagPath(column: string): {
    dimension: keyof TagSystem;
    category: string;
  } | null {
    const mapping: Record<string, { dimension: keyof TagSystem; category: string }> = {
      '用户需求与痛点-使用场景': { dimension: '人群与场景', category: '用户需求与痛点-使用场景' },
      '用户需求与痛点-购买动机': { dimension: '人群与场景', category: '用户需求与痛点-购买动机' },
      '用户需求与痛点-未被满足的需求': {
        dimension: '人群与场景',
        category: '用户需求与痛点-未被满足的需求',
      },
      '用户需求与痛点-痛点问题': { dimension: '人群与场景', category: '用户需求与痛点-痛点问题' },
      '产品反馈-产品优点': { dimension: '功能价值', category: '产品反馈-产品优点' },
      '产品反馈-产品缺点': { dimension: '功能价值', category: '产品反馈-产品缺点' },
      '产品反馈-用户期望建议': { dimension: '功能价值', category: '产品反馈-用户期望建议' },
      '产品反馈-设计与外观': { dimension: '功能价值', category: '产品反馈-设计与外观' },
      '服务评价-物流配送': { dimension: '保障价值', category: '服务评价-物流配送' },
      '服务评价-售后服务': { dimension: '保障价值', category: '服务评价-售后服务' },
      '服务评价-售前服务': { dimension: '保障价值', category: '服务评价-售前服务' },
      '品牌形象与口碑-推荐意愿原因分析': {
        dimension: '体验价值',
        category: '品牌形象与口碑-推荐意愿原因分析',
      },
      '品牌形象与口碑-是否愿意推荐给他人': {
        dimension: '体验价值',
        category: '品牌形象与口碑-是否愿意推荐给他人',
      },
      '品牌形象与口碑-品牌印象': { dimension: '体验价值', category: '品牌形象与口碑-品牌印象' },
      '感官感受': { dimension: '体验价值', category: '感官感受' },
      '价格感知': { dimension: '体验价值', category: '价格感知' },
    };

    return mapping[column] || null;
  }

  /**
   * 按词频从大到小排序
   */
  private static sortWordFrequency(frequencyMap: WordFrequencyMap): WordFrequencyMap {
    const sorted = Object.entries(frequencyMap).sort((a, b) => b[1] - a[1]);

    const result: WordFrequencyMap = {};
    for (const [tag, count] of sorted) {
      result[tag] = count;
    }

    return result;
  }

  /**
   * 清理情感标记（如 [正面]、[负面]）
   */
  private static cleanSentimentMark(tag: string): string {
    // 移除中文情感标记
    let cleaned = tag.replace(/\[正面\]|\[负面\]/g, '').trim();

    // 移除英文情感标记
    cleaned = cleaned.replace(/\[Positive\]|\[Negative\]/gi, '').trim();

    return cleaned;
  }

  /**
   * 检测标签的情感倾向
   */
  private static detectSentiment(tag: string): 'positive' | 'negative' | 'neutral' {
    const lowerTag = tag.toLowerCase();

    // 检查中文情感标记
    if (tag.includes('[正面]')) {
      return 'positive';
    }
    if (tag.includes('[负面]')) {
      return 'negative';
    }

    // 检查英文情感标记
    if (lowerTag.includes('[positive]')) {
      return 'positive';
    }
    if (lowerTag.includes('[negative]')) {
      return 'negative';
    }

    // 基于关键词检测（中文）
    const positiveKeywords = [
      '好', '优秀', '出色', '满意', '喜欢', '推荐', '值得',
      '方便', '快速', '准确', '稳定', '可靠', '舒适', '美观',
    ];
    const negativeKeywords = [
      '差', '糟糕', '失望', '不满', '问题', '缺陷', '困难',
      '慢', '贵', '麻烦', '不好', '后悔', '缺陷', '故障',
    ];

    for (const keyword of positiveKeywords) {
      if (tag.includes(keyword)) {
        return 'positive';
      }
    }

    for (const keyword of negativeKeywords) {
      if (tag.includes(keyword)) {
        return 'negative';
      }
    }

    return 'neutral';
  }

  /**
   * 获取属于指定维度的所有列
   */
  private static getColumnsByDimension(
    dimension: '人群与场景' | '功能价值' | '保障价值' | '体验价值'
  ): string[] {
    const dimensionMapping: Record<
      typeof dimension,
      string[]
    > = {
      人群与场景: [
        '用户需求与痛点-使用场景',
        '用户需求与痛点-购买动机',
        '用户需求与痛点-未被满足的需求',
        '用户需求与痛点-痛点问题',
      ],
      功能价值: [
        '产品反馈-产品优点',
        '产品反馈-产品缺点',
        '产品反馈-用户期望建议',
        '产品反馈-设计与外观',
      ],
      保障价值: [
        '服务评价-物流配送',
        '服务评价-售后服务',
        '服务评价-售前服务',
      ],
      体验价值: [
        '品牌形象与口碑-推荐意愿原因分析',
        '品牌形象与口碑-是否愿意推荐给他人',
        '品牌形象与口碑-品牌印象',
        '感官感受',
        '价格感知',
      ],
    };

    return dimensionMapping[dimension] || [];
  }
}

// ==================== 导出辅助函数 ====================

/**
 * 格式化词频数据为前端友好格式
 */
export function formatWordFrequencyForFrontend(frequencyResult: WordFrequencyResult): {
  dimensions: {
    name: string;
    columns: { name: string; topTags: Array<{ tag: string; count: number }> }[];
  }[];
  overallTopTags: Array<{ tag: string; count: number; dimension: string }>;
} {
  const dimensions: typeof dimensions = [
    { name: '人群与场景', columns: [] },
    { name: '功能价值', columns: [] },
    { name: '保障价值', columns: [] },
    { name: '体验价值', columns: [] },
  ];

  const overallTopTags: Array<{ tag: string; count: number; dimension: string }> = [];

  // 填充维度数据
  for (const dimension of dimensions) {
    const dimensionColumns = WordFrequencyService.getColumnsByDimension(
      dimension.name as any
    );

    for (const column of dimensionColumns) {
      const topTags = WordFrequencyService.getTopWords(frequencyResult, column, 10);
      dimension.columns.push({
        name: column,
        topTags: topTags.map(t => ({ tag: t.tag, count: t.count })),
      });

      // 添加到总体top标签
      for (const tag of topTags) {
        overallTopTags.push({
          tag: tag.tag,
          count: tag.count,
          dimension: dimension.name,
        });
      }
    }
  }

  // 排序总体top标签
  overallTopTags.sort((a, b) => b.count - a.count);

  return { dimensions, overallTopTags: overallTopTags.slice(0, 30) };
}
