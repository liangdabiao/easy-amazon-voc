// 用户画像展示组件 - 渲染Markdown格式的用户画像
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Users, Download, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PersonaDisplayProps {
  personaMarkdown: string;
  filename?: string;
  className?: string;
}

interface PersonaCard {
  title: string;
  content: string;
  index: number;
}

export function PersonaDisplay({
  personaMarkdown,
  filename = 'persona.md',
  className = '',
}: PersonaDisplayProps) {
  const t = useTranslations('Persona');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0, 1, 2]));
  const [parsedPersonas, setParsedPersonas] = useState<PersonaCard[]>([]);

  // 解析用户画像Markdown
  useEffect(() => {
    if (!personaMarkdown) return;

    console.log('[PersonaDisplay] ===== 开始解析用户画像 =====');
    console.log('[PersonaDisplay] - 原始内容长度:', personaMarkdown.length);
    console.log('[PersonaDisplay] - 原始内容预览:', personaMarkdown.slice(0, 500) + '...');

    const personas: PersonaCard[] = [];

    try {
      // 更健壮的解析方法：先清理内容，然后使用多种方式匹配
      let cleanedContent = personaMarkdown.trim();
      
      // 方法1: 使用正则表达式匹配所有以 ### 开头的块
      const regex = /^###\s+([^\n]+)([\s\S]*?)(?=^###\s+|\Z)/gm;
      let match;
      let matchCount = 0;
      
      console.log('[PersonaDisplay] - 使用正则表达式匹配画像块...');
      
      while ((match = regex.exec(cleanedContent)) !== null) {
        matchCount++;
        const title = match[1].trim();
        let content = match[2].trim();
        
        console.log(`[PersonaDisplay] - 正则匹配到块 ${matchCount}:`);
        console.log(`  标题: "${title}"`);
        console.log(`  内容长度: ${content.length}`);
        
        if (title && content) {
          // 额外清理内容
          content = content.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
          
          if (content.length > 0) {
            personas.push({ title, content, index: personas.length });
            console.log(`  ✓ 添加成功！当前总数: ${personas.length}`);
          } else {
            console.log(`  ✗ 内容为空，跳过`);
          }
        } else {
          console.log(`  ✗ 缺少标题或内容，跳过`);
        }
      }
      
      // 如果正则匹配没有找到，回退到原来的分割方法
      if (personas.length === 0) {
        console.log('[PersonaDisplay] - 正则匹配未找到画像，回退到分割方法...');
        
        const sections = cleanedContent.split(/^###\s+/m);
        console.log('[PersonaDisplay] - 分割后的sections数量:', sections.length);
        
        for (let i = 1; i < sections.length; i++) {
          const sectionContent = sections[i].trim();
          if (!sectionContent) {
            console.log(`[PersonaDisplay] - section ${i} 为空，跳过`);
            continue;
          }

          const lines = sections[i].split('\n');
          const title = lines[0].trim();
          const content = lines.slice(1).join('\n').trim();

          console.log(`[PersonaDisplay] - 处理 section ${i}:`);
          console.log(`  标题: "${title}"`);
          console.log(`  内容长度: ${content.length}`);

          if (title && content) {
            personas.push({ title, content, index: personas.length });
            console.log(`  ✓ 添加成功！当前总数: ${personas.length}`);
          }
        }
      }
      
    } catch (error) {
      console.error('[PersonaDisplay] - 解析出错:', error);
    }

    console.log('[PersonaDisplay] ===== 解析完成 =====');
    console.log('[PersonaDisplay] - 最终解析到的画像数量:', personas.length);
    personas.forEach((p, idx) => {
      console.log(`  画像 ${idx + 1}: ${p.title}`);
    });

    setParsedPersonas(personas);
  }, [personaMarkdown]);

  const toggleCard = useCallback((index: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([personaMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [personaMarkdown, filename]);

  if (!personaMarkdown || parsedPersonas.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Users className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          {t('noData') || '暂无用户画像数据 / No persona data available'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 ${className}`}>
      {/* 标题和下载按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title') || '用户画像 / User Personas'}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({parsedPersonas.length} {t('personas') || '个画像'})
          </span>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          aria-label="Download personas"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">
            {t('download') || '下载 / Download'}
          </span>
        </button>
      </div>

      {/* 用户画像卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {parsedPersonas.map((persona) => {
          const isExpanded = expandedCards.has(persona.index);

          return (
            <div
              key={persona.index}
              className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
            >
              {/* 卡片头部 */}
              <button
                onClick={() => toggleCard(persona.index)}
                className="w-full px-5 py-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-between hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-left">
                  {persona.title}
                </h3>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                )}
              </button>

              {/* 卡片内容 */}
              {isExpanded && (
                <div className="p-5 bg-white dark:bg-gray-800">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        // 自定义列表项样式
                        li: ({ children }) => (
                          <li className="text-gray-700 dark:text-gray-300 my-2">
                            {children}
                          </li>
                        ),
                        // 自定义段落样式
                        p: ({ children }) => (
                          <p className="text-gray-700 dark:text-gray-300 my-2">
                            {children}
                          </p>
                        ),
                        // 自定义强调样式
                        strong: ({ children }) => (
                          <strong className="text-gray-900 dark:text-gray-100 font-semibold">
                            {children}
                          </strong>
                        ),
                      }}
                    >
                      {persona.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 提示信息 */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          💡 {t('tip') || '用户画像基于AI分析评论内容生成，可用于产品定位、营销策略和用户洞察。'}
        </p>
      </div>
    </div>
  );
}

export default PersonaDisplay;
