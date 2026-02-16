// 评论分析主页 - 上传CSV文件并进行AI分析
'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { useTranslations, useLocale } from 'next-intl';
import CommentAnalysisForm from '@/components/CommentAnalysisForm';
import LoadingAnimation from '@/components/LoadingAnimation';
import WordFrequencyChart from '@/components/WordFrequencyChart';
import PersonaDisplay from '@/components/PersonaDisplay';
import CommentResultsTable from '@/components/CommentResultsTable';
import { AlertCircle, FileText, BarChart3 } from 'lucide-react';

// API 响应类型 - 评论分析任务
interface CommentJobResponse {
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
}

// SWR fetcher 函数
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const t = useTranslations('CommentAnalysis');
  const locale = useLocale();

  const [jobId, setJobId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<Array<Record<string, string>>>([]);

  // 使用 useSWR 轮询任务状态
  const { data: jobData, error: jobError } = useSWR<CommentJobResponse>(
    jobId ? `/api/jobs/${jobId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        if (!jobId) return 0;
        if (!data) return 1500;
        return data.status === 'processing' ? 1500 : 0;
      },
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data.status === 'completed' || data.status === 'failed') {
          setIsAnalyzing(false);
          // 如果任务完成且下载路径存在，加载CSV数据
          if (data.status === 'completed' && data.downloadPath) {
            loadCSVData(data.downloadPath);
          }
        }
      },
      onError: () => {
        setIsAnalyzing(false);
      },
    }
  );

  const handleStartAnalysis = useCallback(async (file: File, analysisLocale: string) => {
    try {
      setIsAnalyzing(true);
      setCurrentFile(file);
      setJobId(null);

      // 创建FormData上传文件
      const formData = new FormData();
      formData.append('file', file);
      formData.append('locale', analysisLocale);

      const response = await fetch('/api/comment-analysis/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (data.jobId) {
        setJobId(data.jobId);
      } else {
        throw new Error('No job ID returned');
      }
    } catch (error) {
      console.error('Analysis start error:', error);
      setIsAnalyzing(false);
      alert(error instanceof Error ? error.message : 'Upload failed');
    }
  }, []);

  const handleReset = useCallback(() => {
    setJobId(null);
    setIsAnalyzing(false);
    setCurrentFile(null);
    setCsvData([]);
  }, []);

  // 加载CSV数据
  const loadCSVData = useCallback(async (downloadPath: string) => {
    try {
      const response = await fetch(downloadPath);
      const text = await response.text();
      
      // 解析CSV
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) return;

      const headers = parseCSVLine(lines[0]);
      const data: Array<Record<string, string>> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      setCsvData(data);
    } catch (error) {
      console.error('Failed to load CSV data:', error);
    }
  }, []);

  // 解析CSV行
  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }

    fields.push(currentField);

    return fields.map(field => {
      const trimmed = field.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/""/g, '"');
      }
      return trimmed;
    });
  };

  // 分析完成状态
  const isCompleted = jobData?.status === 'completed';
  const isFailed = jobData?.status === 'failed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {t('mainTitle') || '评论智能分析平台'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('mainSubtitle') || '基于AI的四维价值模型分析，深度挖掘用户评论中的痛点和需求'}
          </p>
        </div>

        {/* 主内容区 */}
        <div className="max-w-6xl mx-auto">
          {/* 初始表单状态 */}
          {!jobId && !isAnalyzing && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CommentAnalysisForm
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {/* 分析中状态 */}
          {isAnalyzing && jobData && jobData.status === 'processing' && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
                <LoadingAnimation
                  progressText={jobData.progress || t('analyzing') || '分析中...'}
                  status="processing"
                />
                {jobData.progressStep !== undefined && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${jobData.progressStep}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                      {jobData.progressStep}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 分析失败状态 */}
          {isFailed && (
            <div className="animate-in fade-in duration-300">
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-900 dark:text-red-300 mb-2">
                  {t('error.title') || '分析失败'}
                </h2>
                <p className="text-red-700 dark:text-red-400 mb-6">
                  {jobData?.error || t('error.unknown') || '未知错误'}
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t('error.retry') || '重试'}
                </button>
              </div>
            </div>
          )}

          {/* 分析完成状态 */}
          {isCompleted && jobData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* 完成提示 */}
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-green-900 dark:text-green-300">
                        {t('success.title') || '分析完成'}
                      </h2>
                      <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                        {t('success.message', {
                          filename: jobData.inputFilename,
                          processed: jobData.stats?.processedRows || 0,
                          total: jobData.stats?.totalRows || 0,
                        }) || `已处理 ${jobData.stats?.processedRows || 0} 条评论`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {jobData.downloadPath && (
                      <a
                        href={jobData.downloadPath}
                        download
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg"
                      >
                        <FileText className="w-4 h-4" />
                        {t('success.downloadCSV') || '下载CSV'}
                      </a>
                    )}
                    <button
                      onClick={handleReset}
                      className="px-5 py-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                    >
                      {t('success.newAnalysis') || '新建分析'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.total') || '总评论数'}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {jobData.stats?.totalRows || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.processed') || '已处理'}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {jobData.stats?.processedRows || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.skipped') || '跳过'}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {jobData.stats?.skippedRows || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('stats.dimensions') || '分析维度'}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">4</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 词频统计 */}
              {jobData.wordFrequency && (
                <WordFrequencyChart wordFrequency={jobData.wordFrequency} />
              )}

              {/* 用户画像 */}
              {jobData.personaMarkdown && (
                <PersonaDisplay
                  personaMarkdown={jobData.personaMarkdown}
                  filename={`${jobData.inputFilename}_persona.md`}
                />
              )}

              {/* 评论结果表格 */}
              {csvData.length > 0 && (
                <CommentResultsTable
                  data={csvData}
                  downloadUrl={jobData.downloadPath}
                />
              )}
            </div>
          )}
        </div>

        {/* 页脚 */}
        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 easy-amazon-voc - {t('footer.slogan') || 'AI驱动的用户洞察平台'}</p>
        </footer>
      </div>
    </div>
  );
}
