// 测试API端点 - 验证OpenAI兼容API配置是否正确
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  console.log('[TestAPI] ===== 开始测试API配置 =====');

  try {
    // 读取环境变量
    const apiKey = process.env.OPENAI_API_KEY || process.env.GLM_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    console.log('[TestAPI] - 环境变量读取:');
    console.log('[TestAPI]   - Model:', model);
    console.log('[TestAPI]   - Base URL:', baseURL);
    console.log('[TestAPI]   - API Key:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'none');
    console.log('[TestAPI]   - API Key长度:', apiKey?.length || 0);

    if (!apiKey) {
      console.log('[TestAPI] - 错误: 未找到API Key');
      return NextResponse.json({
        success: false,
        error: '未找到API Key，请检查 .env 文件中的 OPENAI_API_KEY 或 GLM_API_KEY'
      }, { status: 500 });
    }

    console.log('[TestAPI] - 创建OpenAI客户端...');
    const client = new OpenAI({
      apiKey,
      baseURL,
    });

    console.log('[TestAPI] - 发送测试请求...');
    console.log('[TestAPI] - 调用模型:', model);
    const startTime = Date.now();

    // 使用 OpenAI 客户端内置的 timeout 参数
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10,
      timeout: 30000, // 30秒超时
    });

    const elapsed = Date.now() - startTime;
    console.log('[TestAPI] - 请求成功，耗时:', elapsed, 'ms');

    const content = response.choices[0]?.message?.content || '';
    console.log('[TestAPI] - 响应内容:', content);

    console.log('[TestAPI] ===== 测试完成 =====');

    return NextResponse.json({
      success: true,
      message: 'API配置正确',
      model,
      baseURL,
      response: content,
      elapsed,
      finishReason: response.choices[0]?.finish_reason,
    });

  } catch (error: any) {
    console.error('[TestAPI] - 测试失败!');
    console.error('[TestAPI] - 错误名称:', error.name);
    console.error('[TestAPI] - 错误信息:', error.message);
    console.error('[TestAPI] - 错误堆栈:', error.stack);

    // 详细错误信息
    const errorDetails: any = {
      success: false,
      error: error.message,
      name: error.name,
    };

    if (error.status) {
      errorDetails.httpStatus = error.status;
      console.error('[TestAPI] - HTTP状态码:', error.status);
    }

    if (error.code) {
      errorDetails.code = error.code;
      console.error('[TestAPI] - 错误代码:', error.code);
    }

    if (error.response) {
      errorDetails.response = {
        status: error.response.status,
        data: error.response.data,
      };
      console.error('[TestAPI] - API响应:', JSON.stringify(errorDetails.response));
    }

    // 添加诊断建议
    errorDetails.diagnostics = {
      baseURL: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL,
      hasApiKey: !!process.env.OPENAI_API_KEY || !!process.env.GLM_API_KEY,
      suggestions: [
        '检查网络连接是否正常',
        '检查防火墙是否阻止了API请求',
        '验证API Key是否有效',
        '确认模型名称（智谱AI应为 glm-4, glm-4-flash 等）',
        '尝试访问 https://open.bigmodel.cn 查看服务状态',
      ],
    };

    return NextResponse.json(errorDetails, { status: 500 });
  }
}
