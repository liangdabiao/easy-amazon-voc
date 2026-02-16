// 评论分析任务管理器
// 管理CSV文件上传、分析任务处理和结果存储

import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';
import { mkdirSync, unlinkSync, existsSync } from 'fs';
import { TagSystem } from './comment-analysis-service';
import { commentAnalysisService } from './comment-analysis-service';
import { WordFrequencyService } from './word-frequency-service';
import {
  parseCSVFile,
  validateCSVFile,
  ParsedCSVData,
} from '../utils/csv-parser';
import {
  CSVGenerator,
  generateOutputFilename,
  generatePersonaFilename,
} from '../utils/csv-generator';

// ==================== 类型定义 ====================

export type JobStatus = 'processing' | 'completed' | 'failed';

export interface CommentAnalysisJob {
  jobId: string;
  status: JobStatus;
  progress: string;
  progressStep: number; // 0-100
  locale: string;
  startTime: number;
  endTime?: number;

  // 输入信息
  inputFilename: string;
  inputFilePath: string;

  // 输出信息
  outputFilename?: string;
  outputFilePath?: string;
  personaFilename?: string;
  personaFilePath?: string;
  downloadPath?: string;

  // 处理统计
  stats?: {
    totalRows: number;
    processedRows: number;
    skippedRows: number;
    tagSystemGenerated: boolean;
    personaGenerated: boolean;
  };

  // 分析结果
  wordFrequency?: Record<string, Record<string, number>>;
  personaMarkdown?: string;

  // 错误信息
  error?: string;
}

export interface CreateJobOptions {
  inputFilename: string;
  inputFilePath: string;
  locale?: string;
  outputDir?: string;
}

// ==================== 常量定义 ====================

const DEFAULT_OUTPUT_DIR = join(process.cwd(), 'uploads', 'processed');

// 进度步骤
const PROGRESS_STEPS = {
  VALIDATING: 5,
  PARSING: 10,
  GENERATING_TAG_SYSTEM: 25,
  ANALYZING_REVIEWS_START: 30,
  ANALYZING_REVIEWS_END: 80,
  CALCULATING_FREQUENCY: 85,
  GENERATING_PERSONA: 90,
  GENERATING_CSV: 95,
  COMPLETED: 100,
} as const;

// ==================== 任务管理器类 ====================

export class CommentJobManager {
  private jobs: Map<string, CommentAnalysisJob> = new Map();

  /**
   * 创建新的评论分析任务
   */
  async createJob(options: CreateJobOptions): Promise<string> {
    console.log('[CommentJobManager] ===== 创建新的分析任务 =====');

    const {
      inputFilename,
      inputFilePath,
      locale = 'zh',
      outputDir = DEFAULT_OUTPUT_DIR,
    } = options;

    const jobId = uuidv4();
    console.log('[CommentJobManager] - Job ID:', jobId);
    console.log('[CommentJobManager] - 文件名:', inputFilename);
    console.log('[CommentJobManager] - 文件路径:', inputFilePath);
    console.log('[CommentJobManager] - 语言:', locale);

    const job: CommentAnalysisJob = {
      jobId,
      status: 'processing',
      progress: '正在初始化任务...',
      progressStep: 0,
      locale,
      startTime: Date.now(),
      inputFilename,
      inputFilePath,
    };

    this.jobs.set(jobId, job);
    console.log('[CommentJobManager] - 任务已创建，开始异步执行...');

    // 异步执行任务
    this.executeJob(jobId, outputDir).catch(error => {
      console.error('[CommentJobManager] - 任务执行异常:', error);
      this.updateJobStatus(
        jobId,
        'failed',
        `任务执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    });

    return jobId;
  }

  /**
   * 获取任务信息
   */
  getJob(jobId: string): CommentAnalysisJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * 获取所有任务
   */
  getAllJobs(): CommentAnalysisJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 删除任务（清理相关文件）
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // 清理文件
    const filesToDelete = [
      job.inputFilePath,
      job.outputFilePath,
      job.personaFilePath,
    ].filter(Boolean) as string[];

    for (const filePath of filesToDelete) {
      try {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to delete file ${filePath}:`, error);
      }
    }

    this.jobs.delete(jobId);
    return true;
  }

  /**
   * 清理过期任务
   */
  cleanupExpiredJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    for (const [jobId, job] of this.jobs.entries()) {
      const age = now - job.startTime;
      if (age > maxAge) {
        this.deleteJob(jobId);
      }
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 更新任务状态
   */
  private updateJobStatus(
    jobId: string,
    status: JobStatus,
    progress: string,
    progressStep?: number,
    error?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      if (progressStep !== undefined) {
        job.progressStep = progressStep;
      }
      if (error) {
        job.error = error;
      }
      if (status === 'completed' || status === 'failed') {
        job.endTime = Date.now();
      }
    }
  }

  /**
   * 执行完整的分析任务
   */
  private async executeJob(jobId: string, outputDir: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error('[CommentJobManager] - Job not found:', jobId);
      return;
    }

    console.log('[CommentJobManager] ===== 开始执行任务 =====');
    console.log('[CommentJobManager] - Job ID:', jobId);
    console.log('[CommentJobManager] - 输出目录:', outputDir);

    const jobStartTime = Date.now();

    try {
      // 确保输出目录存在
      mkdirSync(outputDir, { recursive: true });
      console.log('[CommentJobManager] - 输出目录已创建');

      // ==================== 步骤1: 验证CSV文件 ====================
      console.log('[CommentJobManager] [步骤1/7] 验证CSV文件...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在验证CSV文件...',
        PROGRESS_STEPS.VALIDATING
      );

      const validationResult = await validateCSVFile(job.inputFilePath);
      console.log('[CommentJobManager] - 验证结果:', validationResult);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // ==================== 步骤2: 解析CSV文件 ====================
      console.log('[CommentJobManager] [步骤2/7] 解析CSV文件...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在解析CSV文件...',
        PROGRESS_STEPS.PARSING
      );

      const csvData: ParsedCSVData = await parseCSVFile(
        job.inputFilePath,
        validationResult.encoding
      );

      console.log('[CommentJobManager] - CSV解析完成:');
      console.log('[CommentJobManager]   - 编码:', validationResult.encoding);
      console.log('[CommentJobManager]   - 总行数:', csvData.rows.length);
      console.log('[CommentJobManager]   - 内容列索引:', csvData.contentColumnIndex);
      console.log('[CommentJobManager]   - 表头:', csvData.headers);

      const reviews = csvData.rows.map(row =>
        row[csvData.contentColumnIndex]?.trim() || ''
      ).filter(review => review.length > 0);

      console.log('[CommentJobManager] - 有效评论数:', reviews.length);

      if (reviews.length === 0) {
        throw new Error('CSV文件中没有找到有效的评论内容');
      }

      // ==================== 步骤3: 生成标签体系 ====================
      console.log('[CommentJobManager] [步骤3/7] 生成标签体系...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在AI分析，生成标签体系...',
        PROGRESS_STEPS.GENERATING_TAG_SYSTEM
      );

      const tagSystem = await commentAnalysisService.generateTagSystem(
        reviews,
        job.locale
      );
      console.log('[CommentJobManager] - 标签体系生成完成');
      console.log('[CommentJobManager] - 标签体系:', JSON.stringify(tagSystem, null, 2));

      // ==================== 步骤4: 逐条分析评论 ====================
      console.log('[CommentJobManager] [步骤4/7] 逐条分析评论...');
      const tagResults: TagSystem[] = [];
      let skippedCount = 0;

      const totalReviews = reviews.length;
      const startProgress = PROGRESS_STEPS.ANALYZING_REVIEWS_START;
      const endProgress = PROGRESS_STEPS.ANALYZING_REVIEWS_END;
      const progressRange = endProgress - startProgress;

      console.log('[CommentJobManager] - 开始逐条分析，共', totalReviews, '条评论');

      for (let i = 0; i < csvData.rows.length; i++) {
        const review = csvData.rows[i][csvData.contentColumnIndex]?.trim();

        console.log(`[CommentJobManager] ===== 开始处理第 ${i + 1}/${totalReviews} 条评论 =====`);

        if (!review) {
          console.log('[CommentJobManager] - 跳过空评论，行号:', i);
          skippedCount++;
          tagResults.push(commentAnalysisService.getEmptyTags());
          continue;
        }

        try {
          console.log(`[CommentJobManager] - 调用 tagSingleReview，评论长度: ${review.length}`);
          const tags = await commentAnalysisService.tagSingleReview(
            review,
            tagSystem,
            job.locale
          );
          console.log(`[CommentJobManager] - tagSingleReview 返回，行号: ${i}`);
          tagResults.push(tags);

          // 每处理10条评论输出一次日志
          if ((i + 1) % 10 === 0 || i === csvData.rows.length - 1) {
            console.log('[CommentJobManager] - 已处理:', i + 1, '/', totalReviews, '条评论');
          }

          // 更新进度
          const currentProgress = Math.floor(
            startProgress + (i / totalReviews) * progressRange
          );
          this.updateJobStatus(
            jobId,
            'processing',
            `正在分析评论 ${i + 1}/${totalReviews}...`,
            currentProgress
          );

          // 避免API调用过快
          if (i < csvData.rows.length - 1) {
            console.log(`[CommentJobManager] - 延迟 100ms 后处理下一条...`);
            await this.delay(100);
          }
        } catch (error) {
          console.error('[CommentJobManager] - 分析评论失败，行号:', i, error);
          console.error('[CommentJobManager] - 错误详情:', error instanceof Error ? error.message : 'Unknown error');
          skippedCount++;
          tagResults.push(commentAnalysisService.getEmptyTags());
        }

        console.log(`[CommentJobManager] ===== 第 ${i + 1} 条评论处理完成 =====`);
      }

      console.log('[CommentJobManager] - 评论分析完成:');
      console.log('[CommentJobManager]   - 处理成功:', tagResults.length - skippedCount);
      console.log('[CommentJobManager]   - 跳过:', skippedCount);

      // ==================== 步骤5: 计算词频统计 ====================
      console.log('[CommentJobManager] [步骤5/7] 计算词频统计...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在计算词频统计...',
        PROGRESS_STEPS.CALCULATING_FREQUENCY
      );

      const wordFrequency = WordFrequencyService.calculateWordFrequency(tagResults);
      console.log('[CommentJobManager] - 词频统计完成');
      console.log('[CommentJobManager] - 词频结果:', JSON.stringify(wordFrequency, null, 2));

      // ==================== 步骤6: 生成用户画像 ====================
      console.log('[CommentJobManager] [步骤6/7] 生成用户画像...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在生成用户画像...',
        PROGRESS_STEPS.GENERATING_PERSONA
      );

      const personaMarkdown = await commentAnalysisService.generatePersona(
        reviews,
        job.locale
      );

      // 保存用户画像到文件
      const personaFilename = generatePersonaFilename(job.inputFilename);
      const personaFilePath = join(outputDir, personaFilename);
      const { writeFileSync } = await import('fs');
      writeFileSync(personaFilePath, personaMarkdown, 'utf-8');
      console.log('[CommentJobManager] - 用户画像已保存:', personaFilePath);

      // ==================== 步骤7: 生成输出CSV文件 ====================
      console.log('[CommentJobManager] [步骤7/7] 生成输出CSV文件...');
      this.updateJobStatus(
        jobId,
        'processing',
        '正在生成分析结果文件...',
        PROGRESS_STEPS.GENERATING_CSV
      );

      const outputFilename = generateOutputFilename(job.inputFilename);
      const csvResult = CSVGenerator.generate({
        outputDir,
        outputFilename,
        headers: csvData.headers,
        originalRows: csvData.rows,
        tagResults,
        contentColumnIndex: csvData.contentColumnIndex,
      });
      console.log('[CommentJobManager] - 输出CSV已保存:', csvResult.outputPath);

      // ==================== 任务完成 ====================
      const jobEndTime = Date.now();
      const totalElapsed = jobEndTime - jobStartTime;

      job.stats = {
        totalRows: csvData.rows.length,
        processedRows: tagResults.length - skippedCount,
        skippedRows: skippedCount,
        tagSystemGenerated: true,
        personaGenerated: true,
      };

      job.outputFilename = outputFilename;
      job.outputFilePath = csvResult.outputPath;
      job.personaFilename = personaFilename;
      job.personaFilePath = personaFilePath;
      job.downloadPath = csvResult.downloadPath;
      job.wordFrequency = wordFrequency;
      job.personaMarkdown = personaMarkdown;

      console.log('[CommentJobManager] ===== 任务执行完成 =====');
      console.log('[CommentJobManager] - 总耗时:', totalElapsed, 'ms (', Math.round(totalElapsed / 1000), '秒)');
      console.log('[CommentJobManager] - 总行数:', job.stats.totalRows);
      console.log('[CommentJobManager] - 处理成功:', job.stats.processedRows);
      console.log('[CommentJobManager] - 跳过:', job.stats.skippedRows);

      this.updateJobStatus(
        jobId,
        'completed',
        '分析完成',
        PROGRESS_STEPS.COMPLETED
      );

    } catch (error) {
      console.error('[CommentJobManager] - 任务执行失败:', error);
      console.error('[CommentJobManager] - 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
      this.updateJobStatus(
        jobId,
        'failed',
        '任务执行失败',
        undefined,
        error instanceof Error ? error.message : '未知错误'
      );
    }
  }

  /**
   * 延迟函数（用于控制API调用速度）
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 导出单例 ====================

export const commentJobManager = new CommentJobManager();
