// CSV生成工具 - 将分析结果写入CSV文件

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { TagSystem } from '../services/comment-analysis-service';

// ==================== 类型定义 ====================

export interface GenerateCSVOptions {
  outputDir: string;
  outputFilename: string;
  headers: string[];
  originalRows: string[][];
  tagResults: TagSystem[];
  contentColumnIndex: number;
}

export interface GenerateCSVResult {
  outputPath: string;
  downloadPath: string;
  filename: string;
}

// ==================== 新增的列名定义 ====================

// 需要添加到CSV中的新列（与标签体系对应）
export const NEW_COLUMNS = [
  // 人群与场景
  '用户需求与痛点-使用场景',
  '用户需求与痛点-购买动机',
  '用户需求与痛点-未被满足的需求',
  '用户需求与痛点-痛点问题',
  // 功能价值
  '产品反馈-产品优点',
  '产品反馈-产品缺点',
  '产品反馈-用户期望建议',
  '产品反馈-设计与外观',
  // 保障价值
  '服务评价-物流配送',
  '服务评价-售后服务',
  '服务评价-售前服务',
  // 体验价值
  '品牌形象与口碑-推荐意愿原因分析',
  '品牌形象与口碑-是否愿意推荐给他人',
  '品牌形象与口碑-品牌印象',
  '感官感受',
  '价格感知',
] as const;

// ==================== CSV生成类 ====================

export class CSVGenerator {
  /**
   * 生成带标签分析结果的CSV文件
   */
  static generate(options: GenerateCSVOptions): GenerateCSVResult {
    const {
      outputDir,
      outputFilename,
      headers,
      originalRows,
      tagResults,
      contentColumnIndex,
    } = options;

    // 确保输出目录存在
    mkdirSync(outputDir, { recursive: true });

    // 构建输出文件路径
    const outputPath = join(outputDir, outputFilename);

    // 构建新的表头
    const newHeaders = [...headers, ...NEW_COLUMNS];

    // 打开文件写入流
    const lines: string[] = [];

    // 写入表头
    lines.push(this.formatCSVRow(newHeaders));

    // 写入数据行
    for (let i = 0; i < originalRows.length && i < tagResults.length; i++) {
      const row = originalRows[i];
      const tags = tagResults[i];

      // 提取标签并转换为逗号分隔的字符串
      const tagValues = this.extractTagValues(tags);

      // 合并原始行和标签值
      const newRow = [...row, ...tagValues];

      lines.push(this.formatCSVRow(newRow));
    }

    // 写入文件（添加BOM以确保Excel正确识别UTF-8）
    const content = '\ufeff' + lines.join('\n');
    writeFileSync(outputPath, content);

    return {
      outputPath,
      downloadPath: `/api/comment-analysis/download/${outputFilename}`,
      filename: outputFilename,
    };
  }

  /**
   * 格式化CSV行（处理特殊字符）
   */
  private static formatCSVRow(fields: string[]): string {
    return fields
      .map(field => {
        const value = field || '';

        // 如果字段包含逗号、引号或换行符，需要用引号包裹
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
          // 转义引号（将"替换为""）
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        }

        return value;
      })
      .join(',');
  }

  /**
   * 从标签结果中提取值，按照NEW_COLUMNS的顺序
   */
  private static extractTagValues(tags: TagSystem): string[] {
    return NEW_COLUMNS.map(column => {
      // 将数组转换为逗号分隔的字符串
      const value = this.getTagValue(tags, column);
      return Array.isArray(value) ? value.join(',') : '';
    });
  }

  /**
   * 根据列名从标签体系中获取对应的值
   */
  private static getTagValue(tags: TagSystem, column: string): string[] {
    // 映射列名到标签体系中的路径
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
  private static getColumnToTagPath(column: string): { dimension: keyof TagSystem; category: string } | null {
    const mapping: Record<string, { dimension: keyof TagSystem; category: string }> = {
      '用户需求与痛点-使用场景': { dimension: '人群与场景', category: '用户需求与痛点-使用场景' },
      '用户需求与痛点-购买动机': { dimension: '人群与场景', category: '用户需求与痛点-购买动机' },
      '用户需求与痛点-未被满足的需求': { dimension: '人群与场景', category: '用户需求与痛点-未被满足的需求' },
      '用户需求与痛点-痛点问题': { dimension: '人群与场景', category: '用户需求与痛点-痛点问题' },
      '产品反馈-产品优点': { dimension: '功能价值', category: '产品反馈-产品优点' },
      '产品反馈-产品缺点': { dimension: '功能价值', category: '产品反馈-产品缺点' },
      '产品反馈-用户期望建议': { dimension: '功能价值', category: '产品反馈-用户期望建议' },
      '产品反馈-设计与外观': { dimension: '功能价值', category: '产品反馈-设计与外观' },
      '服务评价-物流配送': { dimension: '保障价值', category: '服务评价-物流配送' },
      '服务评价-售后服务': { dimension: '保障价值', category: '服务评价-售后服务' },
      '服务评价-售前服务': { dimension: '保障价值', category: '服务评价-售前服务' },
      '品牌形象与口碑-推荐意愿原因分析': { dimension: '体验价值', category: '品牌形象与口碑-推荐意愿原因分析' },
      '品牌形象与口碑-是否愿意推荐给他人': { dimension: '体验价值', category: '品牌形象与口碑-是否愿意推荐给他人' },
      '品牌形象与口碑-品牌印象': { dimension: '体验价值', category: '品牌形象与口碑-品牌印象' },
      '感官感受': { dimension: '体验价值', category: '感官感受' },
      '价格感知': { dimension: '体验价值', category: '价格感知' },
    };

    return mapping[column] || null;
  }
}

// ==================== 辅助函数 ====================

/**
 * 生成输出文件名（带时间戳）
 */
export function generateOutputFilename(originalFilename: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const basename = originalFilename.replace(/\.csv$/i, '');
  return `processed_${basename}_${timestamp}.csv`;
}

/**
 * 生成用户画像文件名
 */
export function generatePersonaFilename(outputFilename: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${outputFilename}_persona_${timestamp}.md`;
}
