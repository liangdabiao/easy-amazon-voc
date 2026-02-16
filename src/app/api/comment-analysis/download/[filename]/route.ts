// 评论分析文件下载API路由
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 文件下载目录配置
const UPLOAD_DIR = join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    if (!filename) {
      return NextResponse.json(
        { error: '文件名是必需的 / Filename is required' },
        { status: 400 }
      );
    }

    // 安全检查：确保文件名不包含路径遍历字符
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: '无效的文件名 / Invalid filename' },
        { status: 400 }
      );
    }

    // 尝试从processed目录查找
    const processedPath = join(UPLOAD_DIR, 'processed', filename);

    if (existsSync(processedPath)) {
      const file = await readFile(processedPath);
      return new NextResponse(file, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    // 尝试从input目录查找
    const inputPath = join(UPLOAD_DIR, 'input', filename);

    if (existsSync(inputPath)) {
      const file = await readFile(inputPath);
      return new NextResponse(file, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    return NextResponse.json(
      { error: '文件不存在 / File not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      {
        error: `文件下载失败 / Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
