// 词频可视化组件 - 使用Recharts展示词频统计
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface WordFrequencyChartProps {
  wordFrequency: Record<string, Record<string, number>>;
  maxItems?: number;
  className?: string;
}

interface ChartData {
  tag: string;
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  fill: string;
}

export function WordFrequencyChart({
  wordFrequency,
  maxItems = 10,
  className = '',
}: WordFrequencyChartProps) {
  const t = useTranslations('WordFrequency');

  // 检测标签的情感倾向
  const detectSentiment = (tag: string): 'positive' | 'negative' | 'neutral' => {
    const lowerTag = tag.toLowerCase();

    // 检查情感标记
    if (tag.includes('[正面]') || lowerTag.includes('[positive]')) {
      return 'positive';
    }
    if (tag.includes('[负面]') || lowerTag.includes('[negative]')) {
      return 'negative';
    }

    // 基于关键词检测
    const positiveKeywords = [
      '好', '优秀', '出色', '满意', '喜欢', '推荐', '值得',
      '方便', '快速', '准确', '稳定', '可靠', '舒适', '美观',
      'good', 'excellent', 'great', 'satisfied', 'like', 'recommend',
    ];
    const negativeKeywords = [
      '差', '糟糕', '失望', '不满', '问题', '缺陷', '困难',
      '慢', '贵', '麻烦', '不好', '后悔',
      'bad', 'poor', 'disappointed', 'issue', 'problem', 'difficult',
    ];

    for (const keyword of positiveKeywords) {
      if (tag.includes(keyword)) return 'positive';
    }
    for (const keyword of negativeKeywords) {
      if (tag.includes(keyword)) return 'negative';
    }

    return 'neutral';
  };

  // 获取情感对应的颜色
  const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral'): string => {
    const colors = {
      positive: '#10b981', // green-500
      negative: '#ef4444', // red-500
      neutral: '#6366f1',  // indigo-500
    };
    return colors[sentiment];
  };

  // 二级标签到一级标签和颜色的映射
  const columnConfig = [
    // 人群与场景
    { key: '用户需求与痛点-使用场景', name: '使用场景', dimension: '人群与场景', color: '#3b82f6' },
    { key: '用户需求与痛点-购买动机', name: '购买动机', dimension: '人群与场景', color: '#3b82f6' },
    { key: '用户需求与痛点-未被满足的需求', name: '未满足需求', dimension: '人群与场景', color: '#3b82f6' },
    { key: '用户需求与痛点-痛点问题', name: '痛点问题', dimension: '人群与场景', color: '#3b82f6' },
    // 功能价值
    { key: '产品反馈-产品优点', name: '产品优点', dimension: '功能价值', color: '#8b5cf6' },
    { key: '产品反馈-产品缺点', name: '产品缺点', dimension: '功能价值', color: '#8b5cf6' },
    { key: '产品反馈-用户期望建议', name: '期望建议', dimension: '功能价值', color: '#8b5cf6' },
    { key: '产品反馈-设计与外观', name: '设计与外观', dimension: '功能价值', color: '#8b5cf6' },
    // 保障价值
    { key: '服务评价-物流配送', name: '物流配送', dimension: '保障价值', color: '#f59e0b' },
    { key: '服务评价-售后服务', name: '售后服务', dimension: '保障价值', color: '#f59e0b' },
    { key: '服务评价-售前服务', name: '售前服务', dimension: '保障价值', color: '#f59e0b' },
    // 体验价值
    { key: '品牌形象与口碑-推荐意愿原因分析', name: '推荐原因', dimension: '体验价值', color: '#ec4899' },
    { key: '品牌形象与口碑-是否愿意推荐给他人', name: '是否推荐', dimension: '体验价值', color: '#ec4899' },
    { key: '品牌形象与口碑-品牌印象', name: '品牌印象', dimension: '体验价值', color: '#ec4899' },
    { key: '感官感受', name: '感官感受', dimension: '体验价值', color: '#ec4899' },
    { key: '价格感知', name: '价格感知', dimension: '体验价值', color: '#ec4899' },
  ];

  // 按二级标签组织词频数据
  const chartData = useMemo(() => {
    return columnConfig
      .filter(config => {
        const columnData = wordFrequency[config.key] || {};
        return Object.keys(columnData).length > 0;
      })
      .map(config => {
        const columnData = wordFrequency[config.key] || {};
        const tags: Array<{ tag: string; count: number; sentiment: 'positive' | 'negative' | 'neutral' }> = [];

        for (const [tag, count] of Object.entries(columnData)) {
          tags.push({
            tag,
            count,
            sentiment: detectSentiment(tag),
          });
        }

        const topTags = tags
          .sort((a, b) => b.count - a.count)
          .slice(0, maxItems);

        return {
          ...config,
          data: topTags.map(item => ({
            ...item,
            fill: getSentimentColor(item.sentiment),
          })) as ChartData[],
          hasData: topTags.length > 0,
        };
      });
  }, [wordFrequency, maxItems]);

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.tag}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {t('count') || '出现次数'}: {data.count}
          </p>
          <p className="text-xs mt-1">
            <span className={`inline-block px-2 py-0.5 rounded text-xs ${
              data.sentiment === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
              data.sentiment === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
              'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {data.sentiment === 'positive' ? (t('sentiment.positive') || '正面') :
               data.sentiment === 'negative' ? (t('sentiment.negative') || '负面') :
               (t('sentiment.neutral') || '中性')}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!wordFrequency || Object.keys(wordFrequency).length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          {t('noData') || '暂无词频数据 / No word frequency data available'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {t('title') || '词频统计 / Word Frequency Statistics'}
      </h2>

      {chartData.map(column => (
        !column.hasData ? null : (
          <div key={column.key} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: column.color }}
              />
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {column.name}
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {column.dimension}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                ({column.data.length} {t('tags') || '个标签'})
              </span>
            </div>

            {column.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={column.data} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis
                    type="number"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="tag"
                    stroke="#6b7280"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {column.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                {t('noDataInDimension') || '该维度暂无数据 / No data in this dimension'}
              </p>
            )}
          </div>
        )
      ))}
    </div>
  );
}

export default WordFrequencyChart;
