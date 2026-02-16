// 评论结果表格组件 - 显示分析后的评论和标签
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { ChevronDown, ChevronUp, Filter, Download } from 'lucide-react';

// 标签列定义
const TAG_COLUMNS = [
  // 人群与场景
  { key: '用户需求与痛点-使用场景', label: '使用场景', dimension: '人群与场景' },
  { key: '用户需求与痛点-购买动机', label: '购买动机', dimension: '人群与场景' },
  { key: '用户需求与痛点-未被满足的需求', label: '未满足需求', dimension: '人群与场景' },
  { key: '用户需求与痛点-痛点问题', label: '痛点问题', dimension: '人群与场景' },
  // 功能价值
  { key: '产品反馈-产品优点', label: '产品优点', dimension: '功能价值', sentiment: 'positive' },
  { key: '产品反馈-产品缺点', label: '产品缺点', dimension: '功能价值', sentiment: 'negative' },
  { key: '产品反馈-用户期望建议', label: '期望建议', dimension: '功能价值' },
  { key: '产品反馈-设计与外观', label: '设计与外观', dimension: '功能价值' },
  // 保障价值
  { key: '服务评价-物流配送', label: '物流配送', dimension: '保障价值' },
  { key: '服务评价-售后服务', label: '售后服务', dimension: '保障价值' },
  { key: '服务评价-售前服务', label: '售前服务', dimension: '保障价值' },
  // 体验价值
  { key: '品牌形象与口碑-推荐意愿原因分析', label: '推荐原因', dimension: '体验价值' },
  { key: '品牌形象与口碑-是否愿意推荐给他人', label: '是否推荐', dimension: '体验价值' },
  { key: '品牌形象与口碑-品牌印象', label: '品牌印象', dimension: '体验价值' },
  { key: '感官感受', label: '感官感受', dimension: '体验价值' },
  { key: '价格感知', label: '价格感知', dimension: '体验价值' },
] as const;

interface CommentResultsTableProps {
  data: Array<Record<string, string>>;
  downloadUrl?: string;
  className?: string;
}

export function CommentResultsTable({
  data,
  downloadUrl,
  className = '',
}: CommentResultsTableProps) {
  const t = useTranslations('ResultsTable');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterDimension, setFilterDimension] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 过滤后的列
  const visibleColumns = useMemo(() => {
    if (!filterDimension) return TAG_COLUMNS;
    return TAG_COLUMNS.filter(col => col.dimension === filterDimension);
  }, [filterDimension]);

  // 排序和分页数据
  const processedData = useMemo(() => {
    let result = [...data];

    // 排序
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = a[sortColumn] || '';
        const bVal = b[sortColumn] || '';
        const comparison = aVal.localeCompare(bVal, 'zh');
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, sortColumn, sortDirection]);

  // 当前页数据
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  // 查找评论内容列
  const findReviewContent = (row: Record<string, string>): string => {
    // 可能的评论内容列名列表
    const possibleColumns = [
      'review_content', 'review', 'comment', 'content', 'body', 'text',
      '评论内容', '评论', '内容',
      'typography_body-l__v5JLj',
      'cr-original-review-content (2)',
    ];
    
    // 尝试精确匹配
    for (const col of possibleColumns) {
      if (row[col] && row[col].trim()) {
        return row[col];
      }
    }
    
    // 尝试模糊匹配（查找第一个非空且不是tag列的内容）
    const tagColumns = new Set(TAG_COLUMNS.map(c => c.key));
    for (const [key, value] of Object.entries(row)) {
      if (!tagColumns.has(key) && value && value.trim()) {
        return value;
      }
    }
    
    return '-';
  };

  // 渲染标签（带情感颜色）
  const renderTags = (tagsStr: string, sentiment?: 'positive' | 'negative') => {
    if (!tagsStr) return <span className="text-gray-400">-</span>;

    const tags = tagsStr.split(',').filter(t => t.trim());

    if (tags.length === 0) return <span className="text-gray-400">-</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag, idx) => {
          const cleanTag = tag.replace(/\[正面\]|\[负面\]|\[Positive\]|\[Negative\]/gi, '').trim();
          const tagSentiment = tag.includes('[正面]') || tag.includes('[Positive]')
            ? 'positive'
            : tag.includes('[负面]') || tag.includes('[Negative]')
            ? 'negative'
            : sentiment || 'neutral';

          const colors = {
            positive: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
            negative: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
            neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
          };

          return (
            <span
              key={idx}
              className={`px-2 py-0.5 rounded text-xs ${colors[tagSentiment]}`}
            >
              {cleanTag}
            </span>
          );
        })}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">
          {t('noData') || '暂无结果数据 / No result data available'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* 维度筛选 */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterDimension || ''}
              onChange={(e) => {
                setFilterDimension(e.target.value || null);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="">{t('allDimensions') || '全部维度'}</option>
              <option value="人群与场景">{t('dimensions.crowd') || '人群与场景'}</option>
              <option value="功能价值">{t('dimensions.functional') || '功能价值'}</option>
              <option value="保障价值">{t('dimensions.assurance') || '保障价值'}</option>
              <option value="体验价值">{t('dimensions.experience') || '体验价值'}</option>
            </select>
          </div>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('totalReviews', { count: processedData.length }) ||
             `共 ${processedData.length} 条评论`}
          </span>
        </div>

        {/* 下载按钮 */}
        {downloadUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t('downloadCSV') || '下载CSV'}
            </span>
          </button>
        )}
      </div>

      {/* 表格 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[200px]">
                  {t('reviewContent') || '评论内容'}
                </TableHead>
                {visibleColumns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="min-w-[120px] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{col.label}</span>
                      {sortColumn === col.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <TableCell className="text-center text-gray-500 dark:text-gray-400">
                    {(currentPage - 1) * pageSize + rowIdx + 1}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-900 dark:text-gray-100 line-clamp-3">
                      {findReviewContent(row)}
                    </div>
                  </TableCell>
                  {visibleColumns.map((col) => (
                    <TableCell key={col.key}>
                      {renderTags(row[col.key], col.sentiment)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('pageInfo', {
                current: currentPage,
                total: totalPages,
              }) || `第 ${currentPage} / ${totalPages} 页`}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('previous') || '上一页'}
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`
                        w-8 h-8 text-sm rounded-lg transition-colors
                        ${currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t('next') || '下一页'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentResultsTable;
