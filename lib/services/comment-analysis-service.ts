// 评论分析服务 - 基于AI的四维价值模型分析
// 参考 easy-amazon-voc-main 的分析逻辑

import OpenAI from 'openai';

// ==================== 类型定义 ====================

// 四维价值模型的一级标签
export type ValueDimension = '人群与场景' | '功能价值' | '保障价值' | '体验价值';

// 标签体系结构
export interface TagSystem {
  '人群与场景': {
    '用户需求与痛点-使用场景'?: string[];
    '用户需求与痛点-购买动机'?: string[];
    '用户需求与痛点-未被满足的需求'?: string[];
    '用户需求与痛点-痛点问题'?: string[];
  };
  '功能价值': {
    '产品反馈-产品优点'?: string[];
    '产品反馈-产品缺点'?: string[];
    '产品反馈-用户期望建议'?: string[];
    '产品反馈-设计与外观'?: string[];
  };
  '保障价值': {
    '服务评价-物流配送'?: string[];
    '服务评价-售后服务'?: string[];
    '服务评价-售前服务'?: string[];
  };
  '体验价值': {
    '品牌形象与口碑-推荐意愿原因分析'?: string[];
    '品牌形象与口碑-是否愿意推荐给他人'?: string[];
    '品牌形象与口碑-品牌印象'?: string[];
    '感官感受'?: string[];
    '价格感知'?: string[];
  };
}

// 单条评论的标签结果
export type ReviewTags = TagSystem;

// 用户画像
export interface Persona {
  name: string;
  age_gender: string;
  keywords: string[];
  motivation: string;
  emotion: string;
  description: string;
}

// ==================== 服务类 ====================

export class CommentAnalysisService {
  private client: OpenAI;
  private model: string;

  constructor() {
    // 从环境变量读取API配置
    const apiKey = process.env.OPENAI_API_KEY || process.env.GLM_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';

    // 调试日志：输出API配置（隐藏API Key的部分内容）
    const maskedKey = apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'none';

    if (!apiKey) {
      console.error('[CommentAnalysisService] - 错误: 未找到API Key!');
      console.error('[CommentAnalysisService] - 请检查环境变量 OPENAI_API_KEY 或 GLM_API_KEY');
      throw new Error('Missing API key: Please set OPENAI_API_KEY or GLM_API_KEY environment variable');
    }

    try {
      this.client = new OpenAI({
        apiKey,
        baseURL,
      });
    } catch (error) {
      console.error('[CommentAnalysisService] - OpenAI客户端创建失败:', error);
      throw error;
    }
  }

  // ==================== 核心分析方法 ====================

  /**
   * 第一步：生成标签体系
   * 基于所有评论内容，生成四维价值模型的层级标签体系
   */
  async generateTagSystem(allReviews: string[], locale: string = 'zh'): Promise<TagSystem> {
    console.log('[CommentAnalysisService] ===== 开始生成标签体系 =====');
    console.log('[CommentAnalysisService] - 评论数量:', allReviews.length);
    console.log('[CommentAnalysisService] - 语言:', locale);

    if (allReviews.length === 0) {
      throw new Error('No reviews provided for tag system generation');
    }

    // 将所有评论合并，限制总长度避免超过token限制
    const combinedContent = allReviews
      .slice(0, 100) // 最多100条用于生成标签体系
      .join('\n---\n')
      .slice(0, 15000); // 限制长度

    console.log('[CommentAnalysisService] - 合并后内容长度:', combinedContent.length, '字符');

    const prompt = this.getTagSystemPrompt(combinedContent, locale);
    console.log('[CommentAnalysisService] - Prompt长度:', prompt.length, '字符');

    // 重试机制
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[CommentAnalysisService] - 正在调用AI API生成标签体系... (尝试 ${attempt}/${maxRetries})`);
        console.log('[CommentAnalysisService] - Model:', this.model);
        const startTime = Date.now();

        // 使用 OpenAI 客户端内置的 timeout 参数
        console.log('[CommentAnalysisService] - 发起 API 请求...');
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          timeout: 180000, // 180秒超时（3分钟）
        });

        const elapsed = Date.now() - startTime;
        console.log('[CommentAnalysisService] - AI API响应时间:', elapsed, 'ms');
        console.log('[CommentAnalysisService] - 响应状态:', response?.choices?.[0]?.finish_reason);

        const content = response?.choices?.[0]?.message?.content || '';
        console.log('[CommentAnalysisService] - 响应内容长度:', content.length, '字符');
        console.log('[CommentAnalysisService] - 响应内容预览:', content.slice(0, 200) + '...');

        const result = this.parseTagSystemJSON(content);
        console.log('[CommentAnalysisService] - 标签体系解析完成');
        console.log('[CommentAnalysisService] ===== 标签体系生成完成 =====');
        return result;
      } catch (error: any) {
        lastError = error;
        console.error(`[CommentAnalysisService] - 标签体系生成失败! (尝试 ${attempt}/${maxRetries})`);
        console.error('[CommentAnalysisService] - 错误类型:', error?.name);
        console.error('[CommentAnalysisService] - 错误信息:', error?.message);

        // 检查是否是网络或API错误
        if (error?.code) {
          console.error('[CommentAnalysisService] - 错误代码:', error.code);
        }
        if (error?.status) {
          console.error('[CommentAnalysisService] - HTTP状态:', error.status);
        }
        if (error?.response?.data) {
          console.error('[CommentAnalysisService] - API响应数据:', JSON.stringify(error.response.data));
        }

        // 如果是最后一次尝试，不再重试
        if (attempt === maxRetries) {
          console.error('[CommentAnalysisService] - 已达到最大重试次数，放弃生成标签体系');
          break;
        }

        // 等待一段时间后重试
        const waitTime = attempt * 3000; // 3秒, 6秒, 9秒
        console.log(`[CommentAnalysisService] - 等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // 所有重试都失败，抛出错误
    console.error('[CommentAnalysisService] - 最终错误:', lastError?.message);
    throw new Error(`Tag system generation failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`);
  }

  /**
   * 第二步：对单条评论进行标签分析
   * 基于已生成的标签体系，为单条评论打上带情感倾向的标签
   */
  async tagSingleReview(review: string, tagSystem: TagSystem, locale: string = 'zh'): Promise<ReviewTags> {
    const reviewPreview = review.slice(0, 50) + (review.length > 50 ? '...' : '');
    console.log('[CommentAnalysisService] - 开始分析单条评论:', reviewPreview);

    if (!review || review.trim().length === 0) {
      console.log('[CommentAnalysisService] - 评论为空，返回空标签');
      return this.getEmptyTags();
    }

    const prompt = this.getTagReviewPrompt(review, tagSystem, locale);
    console.log('[CommentAnalysisService] - Prompt长度:', prompt.length, '字符');

    // 重试机制
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[CommentAnalysisService] - 准备调用AI API... (尝试 ${attempt}/${maxRetries})`);
        console.log('[CommentAnalysisService] - Model:', this.model);
        console.log('[CommentAnalysisService] - Base URL:', process.env.OPENAI_BASE_URL);
        const startTime = Date.now();

        // 使用 OpenAI 客户端内置的 timeout 参数
        console.log('[CommentAnalysisService] - 发起 API 请求...');
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          timeout: 60000, // 60秒超时（OpenAI客户端内置参数）
        });

        const elapsed = Date.now() - startTime;
        console.log('[CommentAnalysisService] - API 响应返回! 耗时:', elapsed, 'ms');
        console.log('[CommentAnalysisService] - 响应状态:', response?.choices?.[0]?.finish_reason);

        const content = response?.choices?.[0]?.message?.content || '';
        console.log('[CommentAnalysisService] - 响应内容长度:', content.length, '字符');
        console.log('[CommentAnalysisService] - 响应内容预览:', content.slice(0, 150) + '...');

        const result = this.parseReviewTagsJSON(content, tagSystem);
        console.log('[CommentAnalysisService] - 单条评论分析完成');
        return result;
      } catch (error: any) {
        lastError = error;
        const elapsed = Date.now() - (error.startTime || Date.now());
        console.error(`[CommentAnalysisService] - 单条评论分析失败! (尝试 ${attempt}/${maxRetries})`);
        console.error('[CommentAnalysisService] - 错误类型:', error?.name);
        console.error('[CommentAnalysisService] - 错误信息:', error?.message);

        // 检查是否是网络或API错误
        if (error?.code) {
          console.error('[CommentAnalysisService] - 错误代码:', error.code);
        }
        if (error?.status) {
          console.error('[CommentAnalysisService] - HTTP状态:', error.status);
        }
        if (error?.cause) {
          console.error('[CommentAnalysisService] - 根本原因:', error.cause);
        }

        // 如果是最后一次尝试，不再重试
        if (attempt === maxRetries) {
          console.error('[CommentAnalysisService] - 已达到最大重试次数，放弃此评论');
          break;
        }

        // 等待一段时间后重试
        const waitTime = attempt * 2000; // 2秒, 4秒, 6秒
        console.log(`[CommentAnalysisService] - 等待 ${waitTime/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // 所有重试都失败，返回空标签
    console.error('[CommentAnalysisService] - 最终错误:', lastError?.message);
    console.log('[CommentAnalysisService] - 返回空标签，继续处理下一条');
    return this.getEmptyTags();
  }

  /**
   * 生成用户画像
   * 基于所有评论内容，生成3-5个典型用户画像
   */
  async generatePersona(allReviews: string[], locale: string = 'zh'): Promise<string> {
    console.log('[CommentAnalysisService] ===== 开始生成用户画像 =====');
    console.log('[CommentAnalysisService] - 评论数量:', allReviews.length);
    console.log('[CommentAnalysisService] - 语言:', locale);

    const combinedContent = allReviews
      .slice(0, 50) // 最多50条用于生成画像
      .join('\n---\n')
      .slice(0, 10000);

    console.log('[CommentAnalysisService] - 合并后内容长度:', combinedContent.length, '字符');

    const prompt = this.getPersonaPrompt(combinedContent, locale);
    console.log('[CommentAnalysisService] - Prompt长度:', prompt.length, '字符');

    try {
      console.log('[CommentAnalysisService] - 正在调用AI API生成用户画像...');
      const startTime = Date.now();

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        timeout: 60000,
      });

      const elapsed = Date.now() - startTime;
      console.log('[CommentAnalysisService] - 用户画像生成耗时:', elapsed, 'ms');
      console.log('[CommentAnalysisService] - 响应状态:', response.choices[0]?.finish_reason);

      const result = response.choices[0]?.message?.content || '';
      console.log('[CommentAnalysisService] - 用户画像内容长度:', result.length, '字符');
      console.log('[CommentAnalysisService] ===== 用户画像生成完成 =====');
      return result;
    } catch (error) {
      console.error('[CommentAnalysisService] - 用户画像生成失败:', error);
      throw new Error(`Persona generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Prompt 生成方法 ====================

  private getTagSystemPrompt(content: string, locale: string): string {
    // 导入优化的提示词模板
    const PROMPTS = require('../prompts/analysis-prompts').PROMPTS;
    return PROMPTS.TAG_SYSTEM_GENERATION.replace('{{CONTENT}}', content);
  }

  private getTagReviewPrompt(review: string, tagSystem: TagSystem, locale: string): string {
    // 导入优化的提示词模板
    const PROMPTS = require('../prompts/analysis-prompts').PROMPTS;
    return PROMPTS.REVIEW_TAGGING
      .replace('{{TAG_SYSTEM}}', JSON.stringify(tagSystem, null, 2))
      .replace('{{REVIEW_CONTENT}}', review);
  }

  private getPersonaPrompt(content: string, locale: string): string {
    // 导入优化的提示词模板
    const PROMPTS = require('../prompts/analysis-prompts').PROMPTS;
    return PROMPTS.PERSONA_GENERATION.replace('{{CONTENT}}', content);
  }

  // ==================== JSON 解析方法 ====================

  private parseTagSystemJSON(content: string): TagSystem {
    // 提取JSON内容
    let jsonContent = content;

    // 移除markdown代码块标记
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    // 尝试解析JSON
    try {
      const parsed = JSON.parse(jsonContent);
      return this.validateAndNormalizeTagSystem(parsed);
    } catch (error) {
      console.error('JSON parse error:', error);
      console.error('Content:', jsonContent);
      // 返回默认标签体系
      return this.getDefaultTagSystem();
    }
  }

  private parseReviewTagsJSON(content: string, referenceTagSystem: TagSystem): ReviewTags {
    let jsonContent = content;

    // 移除markdown代码块标记
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                      content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(jsonContent);
      // 确保返回的结构与参考标签体系一致
      return this.mergeWithReferenceSystem(parsed, referenceTagSystem);
    } catch (error) {
      console.error('Review tags JSON parse error:', error);
      return this.getEmptyTags();
    }
  }

  private validateAndNormalizeTagSystem(tags: any): TagSystem {
    // 确保返回的标签体系包含所有必需的键
    const defaultSystem = this.getDefaultTagSystem();

    return {
      '人群与场景': { ...defaultSystem['人群与场景'], ...(tags['人群与场景'] || {}) },
      '功能价值': { ...defaultSystem['功能价值'], ...(tags['功能价值'] || {}) },
      '保障价值': { ...defaultSystem['保障价值'], ...(tags['保障价值'] || {}) },
      '体验价值': { ...defaultSystem['体验价值'], ...(tags['体验价值'] || {}) },
    };
  }

  private mergeWithReferenceSystem(tags: any, reference: TagSystem): ReviewTags {
    // 确保返回的标签与参考体系结构一致
    const result: TagSystem = {
      '人群与场景': {},
      '功能价值': {},
      '保障价值': {},
      '体验价值': {},
    };

    for (const dimension of Object.keys(reference) as ValueDimension[]) {
      result[dimension] = {};
      for (const category of Object.keys(reference[dimension])) {
        // 使用返回的标签，如果没有则使用空数组
        result[dimension][category] = tags[dimension]?.[category] || [];
      }
    }

    return result;
  }

  // ==================== 默认值方法 ====================

  private getDefaultTagSystem(): TagSystem {
    return {
      '人群与场景': {
        '用户需求与痛点-使用场景': [],
        '用户需求与痛点-购买动机': [],
        '用户需求与痛点-未被满足的需求': [],
        '用户需求与痛点-痛点问题': [],
      },
      '功能价值': {
        '产品反馈-产品优点': [],
        '产品反馈-产品缺点': [],
        '产品反馈-用户期望建议': [],
        '产品反馈-设计与外观': [],
      },
      '保障价值': {
        '服务评价-物流配送': [],
        '服务评价-售后服务': [],
        '服务评价-售前服务': [],
      },
      '体验价值': {
        '品牌形象与口碑-推荐意愿原因分析': [],
        '品牌形象与口碑-是否愿意推荐给他人': [],
        '品牌形象与口碑-品牌印象': [],
        '感官感受': [],
        '价格感知': [],
      },
    };
  }

  private getEmptyTags(): ReviewTags {
    return {
      '人群与场景': {
        '用户需求与痛点-使用场景': [],
        '用户需求与痛点-购买动机': [],
        '用户需求与痛点-未被满足的需求': [],
        '用户需求与痛点-痛点问题': [],
      },
      '功能价值': {
        '产品反馈-产品优点': [],
        '产品反馈-产品缺点': [],
        '产品反馈-用户期望建议': [],
        '产品反馈-设计与外观': [],
      },
      '保障价值': {
        '服务评价-物流配送': [],
        '服务评价-售后服务': [],
        '服务评价-售前服务': [],
      },
      '体验价值': {
        '品牌形象与口碑-推荐意愿原因分析': [],
        '品牌形象与口碑-是否愿意推荐给他人': [],
        '品牌形象与口碑-品牌印象': [],
        '感官感受': [],
        '价格感知': [],
      },
    };
  }
}

// 导出单例
export const commentAnalysisService = new CommentAnalysisService();
