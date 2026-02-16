// 用户画像下载API路由
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// 文件下载目录配置
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'processed');

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

    const filepath = join(UPLOAD_DIR, filename);

    if (!existsSync(filepath)) {
      return NextResponse.json(
        { error: '用户画像文件不存在 / Persona file not found' },
        { status: 404 }
      );
    }

    const file = await readFile(filepath, 'utf-8');

    // 返回Markdown内容
    return new NextResponse(file, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
      },
    });

  } catch (error) {
    console.error('Persona download error:', error);
    return NextResponse.json(
      {
        error: `用户画像下载失败 / Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
