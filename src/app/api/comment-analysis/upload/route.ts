// 评论分析文件上传API路由
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { commentJobManager } from '../../../../../lib/services/comment-job-manager';
import { CSVParser, CSV_LIMITS } from '../../../../../lib/utils/csv-parser';

// 上传目录配置
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'input');

// 确保上传目录存在
if (!existsSync(UPLOAD_DIR)) {
  mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  console.log('[Upload API] ===== 收到文件上传请求 =====');

  try {
    // 获取表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const locale = (formData.get('locale') as string) || 'zh';

    console.log('[Upload API] - 语言:', locale);

    // 验证文件
    if (!file) {
      console.log('[Upload API] - 错误: 未选择文件');
      return NextResponse.json(
        { error: '未选择文件 / No file selected' },
        { status: 400 }
      );
    }

    console.log('[Upload API] - 文件名:', file.name);
    console.log('[Upload API] - 文件类型:', file.type);
    console.log('[Upload API] - 文件大小:', file.size, 'bytes (', Math.round(file.size / 1024), 'KB)');

    // 验证文件名
    if (!file.name || file.name.trim() === '') {
      console.log('[Upload API] - 错误: 空文件名');
      return NextResponse.json(
        { error: '空文件名 / Empty filename' },
        { status: 400 }
      );
    }

    // 验证文件类型（通过扩展名）
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.log('[Upload API] - 错误: 不支持的文件类型');
      return NextResponse.json(
        { error: '仅支持CSV文件 / Only CSV files are supported' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > CSV_LIMITS.MAX_FILE_SIZE) {
      console.log('[Upload API] - 错误: 文件过大');
      return NextResponse.json(
        {
          error: `文件过大，最大支持${CSV_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB / File too large, max ${CSV_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    console.log('[Upload API] - 文件验证通过，开始验证编码...');

    // 验证编码
    const validationResult = await CSVParser.validateCSV(file);
    console.log('[Upload API] - 编码验证结果:', validationResult);

    if (!validationResult.valid) {
      console.log('[Upload API] - 错误: 编码验证失败 -', validationResult.error);
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // 生成唯一的文件名
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `${timestamp}_${randomId}_${file.name}`;
    const filepath = join(UPLOAD_DIR, filename);

    console.log('[Upload API] - 保存文件到:', filepath);

    // 保存文件到服务器
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    console.log('[Upload API] - 文件保存成功，创建分析任务...');

    // 创建分析任务
    const jobId = await commentJobManager.createJob({
      inputFilename: file.name,
      inputFilePath: filepath,
      locale,
    });

    const requestElapsed = Date.now() - requestStartTime;
    console.log('[Upload API] - 请求处理完成，耗时:', requestElapsed, 'ms');
    console.log('[Upload API] - Job ID:', jobId);
    console.log('[Upload API] ===== 上传请求处理完成 =====');

    // 返回任务ID
    return NextResponse.json({
      success: true,
      jobId,
      message: '文件上传成功，正在分析中... / File uploaded successfully, analysis in progress...',
    });

  } catch (error) {
    console.error('[Upload API] - 错误:', error);
    console.error('[Upload API] - 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: `文件上传失败 / Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}

// 处理OPTIONS请求（CORS预检）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
