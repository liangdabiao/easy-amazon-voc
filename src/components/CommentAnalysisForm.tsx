// 评论分析表单组件
'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Play } from 'lucide-react';
import FileUploadZone from './FileUploadZone';
import LanguageSwitcher from './LanguageSwitcher';

interface CommentAnalysisFormProps {
  onStartAnalysis: (file: File, locale: string) => void;
  isAnalyzing?: boolean;
}

export function CommentAnalysisForm({
  onStartAnalysis,
  isAnalyzing = false,
}: CommentAnalysisFormProps) {
  const t = useTranslations('CommentAnalysis');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentLocale, setCurrentLocale] = useState<string>('zh');
  const [error, setError] = useState<string>('');

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError('');
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setError('');
  }, []);

  const handleStartAnalysis = useCallback(() => {
    if (!selectedFile) {
      setError(t('errors.noFile') || '请先选择文件 / Please select a file first');
      return;
    }

    setError('');
    onStartAnalysis(selectedFile, currentLocale);
  }, [selectedFile, currentLocale, onStartAnalysis, t]);

  const handleLocaleChange = useCallback((newLocale: string) => {
    setCurrentLocale(newLocale);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {t('title') || '评论智能分析 / Comment AI Analysis'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('subtitle') || '上传CSV评论文件，AI自动生成多维度标签分析 / Upload CSV file for AI-powered multi-dimensional analysis'}
        </p>
      </div>

      {/* 语言选择器 */}
      <div className="flex justify-end mb-4">
        <LanguageSwitcher currentLocale={currentLocale} onLocaleChange={handleLocaleChange} />
      </div>

      {/* 分析表单 */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        {/* 文件上传区域 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t('uploadLabel') || '上传评论文件 / Upload Review File'}
          </label>
          <FileUploadZone
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            isProcessing={isAnalyzing}
            maxSize={16}
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 开始分析按钮 */}
        <button
          onClick={handleStartAnalysis}
          disabled={!selectedFile || isAnalyzing}
          className={`
            w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl
            font-medium text-white transition-all duration-200
            ${!selectedFile || isAnalyzing
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
            }
          `}
        >
          <Play className="w-5 h-5" />
          {isAnalyzing
            ? (t('analyzing') || '分析中... / Analyzing...')
            : (t('startButton') || '开始分析 / Start Analysis')
          }
        </button>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
            {t('tips.title') || '使用提示 / Tips'}
          </h3>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• {t('tips.tip1') || '支持最大16MB的CSV文件 / Supports CSV files up to 16MB'}</li>
            <li>• {t('tips.tip2') || '最多处理300条评论 / Maximum 300 reviews'}</li>
            <li>• {t('tips.tip3') || 'AI将生成四维价值模型分析 / AI generates 4-dimensional value model analysis'}</li>
            <li>• {t('tips.tip4') || '分析过程可能需要几分钟，请耐心等待 / Analysis may take several minutes, please be patient'}</li>
          </ul>
        </div>

        {/* CSV格式说明 */}
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
              {t('csvFormat.title') || '查看CSV格式要求 / View CSV format requirements'}
            </summary>
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-2">{t('csvFormat.subtitle') || '支持的列名 / Supported column names:'}</p>
              <ul className="space-y-1 ml-4">
                <li>• typography_body-l__v5JLj</li>
                <li>• cr-original-review-content (2)</li>
                <li>• review_content / review / comment / content / body / text</li>
                <li>• 评论内容 / 评论 / 内容</li>
              </ul>
              <p className="mt-3 text-gray-500 dark:text-gray-500">
                {t('csvFormat.note') || '系统将自动识别评论内容列 / System will automatically identify the review content column'}
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default CommentAnalysisForm;
