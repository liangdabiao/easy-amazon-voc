import { NextRequest, NextResponse } from 'next/server';
import { commentJobManager } from '../../../../../lib/services/comment-job-manager';

// 统一的任务状态查询接口 - 评论分析任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const queryStartTime = Date.now();

  try {
    const { jobId } = await params;

    if (!jobId) {
      console.log('[JobStatus API] - 错误: 缺少任务ID');
      return NextResponse.json(
        { error: "任务ID是必需的 / Job ID is required" },
        { status: 400 }
      );
    }

    // 从评论分析任务管理器获取任务
    const commentJob = commentJobManager.getJob(jobId);

    if (!commentJob) {
      console.log('[JobStatus API] - 错误: 任务不存在');
      return NextResponse.json(
        { error: "任务不存在 / Job not found" },
        { status: 404 }
      );
    }



    // 评论分析任务响应
    const response: {
      jobId: string;
      jobType: 'comment-analysis';
      status: string;
      progress: string;
      progressStep: number;
      inputFilename: string;
      downloadPath?: string;
      personaMarkdown?: string;
      wordFrequency?: Record<string, Record<string, number>>;
      stats?: {
        totalRows: number;
        processedRows: number;
        skippedRows: number;
      };
      error?: string;
    } = {
      jobId: commentJob.jobId,
      jobType: 'comment-analysis',
      status: commentJob.status,
      progress: commentJob.progress,
      progressStep: commentJob.progressStep,
      inputFilename: commentJob.inputFilename,
    };

    // 如果任务完成，包含结果
    if (commentJob.status === 'completed') {
      response.downloadPath = commentJob.downloadPath;
      response.personaMarkdown = commentJob.personaMarkdown;
      response.wordFrequency = commentJob.wordFrequency;
      response.stats = commentJob.stats;
    }

    // 如果任务失败，包含错误信息
    if (commentJob.status === 'failed') {
      response.error = commentJob.error || '任务执行失败 / Task execution failed';
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('[JobStatus API] - 错误:', error);
    console.error('[JobStatus API] - 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: "服务器内部错误 / Internal server error" },
      { status: 500 }
    );
  }
}
