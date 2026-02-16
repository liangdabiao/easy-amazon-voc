/**
 * API测试脚本
 * 用于测试评论分析API的各项功能
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message: string) {
  log(`✓ ${message}`, 'green');
}

function error(message: string) {
  log(`✗ ${message}`, 'red');
}

function info(message: string) {
  log(`ℹ ${message}`, 'blue');
}

// 测试1：健康检查
async function testHealthCheck() {
  info('测试健康检查API...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      success('健康检查通过');
      return true;
    } else {
      error('健康检查失败');
      return false;
    }
  } catch (e) {
    error(`健康检查异常: ${e}`);
    return false;
  }
}

// 测试2：文件上传（模拟）
async function testFileUpload() {
  info('测试文件上传API...');

  const testCSVContent = `review_content,reviewer,rating
测试评论1：这个产品很好用,测试用户,5
测试评论2：产品质量不错,测试用户2,4
测试评论3：物流很快,测试用户3,5`;

  const blob = new Blob([testCSVContent], { type: 'text/csv' });
  const file = new File([blob], 'test.csv', { type: 'text/csv' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('locale', 'zh');

  try {
    const response = await fetch(`${API_BASE_URL}/api/comment-analysis/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.jobId) {
      success(`文件上传成功，任务ID: ${data.jobId}`);
      return data.jobId;
    } else {
      error(`文件上传失败: ${data.error || '未知错误'}`);
      return null;
    }
  } catch (e) {
    error(`文件上传异常: ${e}`);
    return null;
  }
}

// 测试3：任务状态查询
async function testJobStatus(jobId: string) {
  info(`测试任务状态查询API (JobID: ${jobId})...`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
    const data = await response.json();

    if (response.ok) {
      success(`任务状态: ${data.status}, 进度: ${data.progressStep}%`);
      return data;
    } else {
      error(`任务状态查询失败: ${data.error}`);
      return null;
    }
  } catch (e) {
    error(`任务状态查询异常: ${e}`);
    return null;
  }
}

// 测试4：轮询任务直到完成
async function testJobPolling(jobId: string, maxAttempts: number = 60) {
  info(`开始轮询任务状态 (最多等待${maxAttempts}秒)...`);

  for (let i = 0; i < maxAttempts; i++) {
    const jobData = await testJobStatus(jobId);

    if (!jobData) {
      error('无法获取任务状态');
      return false;
    }

    if (jobData.status === 'completed') {
      success('任务执行完成！');
      info(`处理文件: ${jobData.inputFilename}`);
      info(`统计数据: ${jobData.stats?.totalRows || 0} 条评论`);
      return true;
    }

    if (jobData.status === 'failed') {
      error(`任务执行失败: ${jobData.error}`);
      return false;
    }

    // 等待1秒
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  error('任务执行超时');
  return false;
}

// 测试5：文件下载
async function testFileDownload(downloadPath: string) {
  info('测试文件下载API...');

  try {
    const response = await fetch(`${API_BASE_URL}${downloadPath}`);

    if (response.ok) {
      const contentLength = response.headers.get('content-length');
      success(`文件下载成功，大小: ${contentLength} 字节`);
      return true;
    } else {
      error('文件下载失败');
      return false;
    }
  } catch (e) {
    error(`文件下载异常: ${e}`);
    return false;
  }
}

// 运行所有测试
export async function runAllTests() {
  log('\n========================================', 'blue');
  log('      easy-amazon-voc API 测试套件', 'blue');
  log('========================================\n', 'blue');

  const results: { [key: string]: boolean } = {};

  // 测试1：健康检查
  results['healthCheck'] = await testHealthCheck();
  log('', 'reset');

  // 测试2：文件上传
  const jobId = await testFileUpload();
  results['fileUpload'] = !!jobId;
  log('', 'reset');

  if (jobId) {
    // 测试3和4：任务状态查询和轮询
    results['jobPolling'] = await testJobPolling(jobId);
    log('', 'reset');

    // 测试5：文件下载
    const jobData = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`).then(r => r.json());
    if (jobData?.downloadPath) {
      results['fileDownload'] = await testFileDownload(jobData.downloadPath);
    } else {
      results['fileDownload'] = false;
      error('无可下载的文件');
    }
  } else {
    results['jobPolling'] = false;
    results['fileDownload'] = false;
  }

  // 输出测试结果汇总
  log('\n========================================', 'blue');
  log('           测试结果汇总', 'blue');
  log('========================================\n', 'blue');

  let passedCount = 0;
  let totalCount = 0;

  for (const [testName, passed] of Object.entries(results)) {
    totalCount++;
    if (passed) {
      passedCount++;
      success(`${testName}: 通过`);
    } else {
      error(`${testName}: 失败`);
    }
  }

  log('', 'reset');
  log(`总计: ${passedCount}/${totalCount} 测试通过`, passedCount === totalCount ? 'green' : 'yellow');
  log('', 'reset');

  return passedCount === totalCount;
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      error(`测试运行失败: ${err}`);
      process.exit(1);
    });
}
