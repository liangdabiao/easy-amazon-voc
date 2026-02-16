import pandas as pd
import os
from collections import defaultdict
import re

# 定义分析维度结构
DIMENSIONS = {
    '人群/场景': ['人群特征', '使用场景/期望'],
    '功能价值': ['核心功能表现', '辅助特色功能', '操作控制相关'],
    '保障价值': ['产品质量耐用性', '品牌服务支持', '安全性可靠性'],
    '体验价值': ['价格感知情感价值', '感官体验', '日常使用便携性', '安装体验']
}

def analyze_dimension(df, column_name, sentiment_col):
    results = defaultdict(lambda: {'正面':0, '负面':0, '中性/建议':0})
    
    for _, row in df.iterrows():
        # 预处理换行符和多余引号
        row = row.apply(lambda x: x.replace('\n', ' ').replace('""', '"') if isinstance(x, str) else x)
        # 使用正则表达式验证中文标签格式
        valid_pattern = re.compile(r'^[一-龥\d\-/、，（）()\s]+$')
        if pd.notna(row[column_name]) and isinstance(row[column_name], str):
            invalid_tags = []
            tags = re.split(r'[,，]', row[column_name].strip())
            
            for tag in tags:
                tag = tag.strip()
                if tag and tag != '无匹配标签':
                    if not valid_pattern.match(tag):
                        invalid_tags.append(tag)
            
            if invalid_tags:
                print(f'发现无效标签（行号：{_+1}）: {invalid_tags} | 原始内容: {row[column_name]}')
                continue
            # 情感判断（示例逻辑，需根据实际数据调整）
            # 改进情感判断逻辑
            sentiment = str(row[sentiment_col]).strip()
            if '正面' in sentiment or 'positive' in sentiment.lower():
                results[tag]['正面'] += 1
            elif '负面' in sentiment or 'negative' in sentiment.lower():
                results[tag]['负面'] += 1
            else:
                results[tag]['中性/建议'] += 1
    return results

def generate_markdown_table(results, dimension):
    total = sum(sum(v.values()) for v in results.values())
    table = f'## {dimension}\n| 维度 | 出现次数 | 正面 | 负面 | 中性/建议 | 占比 |\n|------|---------|------|------|----------|-----|\n'
    
    for tag, counts in sorted(results.items(), key=lambda x: -sum(x[1].values())):
        count = sum(counts.values())
        ratio = f'{count/total:.1%}' if total >0 else '0.0%'
        table += f'| {tag} | {count} | {counts["正面"]} | {counts["负面"]} | {counts["中性/建议"]} | {ratio} |\n'
    return table

def main():
    try:
        # 读取CSV文件（注意编码可能需要调整）
        # 自动检测文件编码
        encodings = ['gb18030', 'utf-8', 'gbk', 'big5']
        for enc in encodings:
            try:
                df = pd.read_csv('reviews.csv', encoding=enc, quotechar='"', escapechar='\\', engine='python', skipinitialspace=True, on_bad_lines='warn')
                print('成功读取文件，检测到列名：', df.columns.tolist())
                break
            except UnicodeDecodeError:
                continue
        else:
            raise FileNotFoundError(f"未找到数据文件，请确认当前目录({os.getcwd()})包含CSV文件")
        
        # 自动匹配列名
        # 列名验证
        required_columns = {
            'sentiment': re.compile(r'情感(分析)?|sentiment|评[价分]?[星]?[级]?\d*|score|star|rating|等级', re.I),
            'tag': re.compile(r'标签|tag|关键词|特征|场景|keyword', re.I),
            'category': re.compile(r'功能|分类|category|类型|type|质量|体验|保障|feature|function', re.I)
        }
        
        matched_columns = {}
        for col in df.columns:
            for key, pattern in required_columns.items():
                if pattern.search(col):
                    matched_columns[key] = col
                    break
        
        if not matched_columns.get('sentiment'):
            column_list = '\n'.join([f'• {col}' for col in df.columns.tolist()])
            raise ValueError(f"未找到情感分析列，检测到可用列名为：\n{column_list}\n请确认数据文件包含评价星级（如'评分4.5'）或情感分析相关列名")
        if not matched_columns.get('tag'):
            print('警告: 未找到标准标签列，尝试使用备用列名')
            matched_columns['tag'] = next((col for col in df.columns if re.search(r'特征|场景', col)), None)
            if not matched_columns['tag']:
                raise ValueError("未找到标签列，请检查数据文件列名是否包含'标签/特征/场景'相关词汇")
        
        # 初始化报告内容
        report = ['# 定量分析报告']
        
        # 按维度分析
        for dimension, sub_dimensions in DIMENSIONS.items():
            dimension_results = {}
            for sub in sub_dimensions:
                # 根据实际列名调整（当前列名有乱码需要确认）
                # 根据维度选择对应列
                column_mapping = {
                    '人群/场景': matched_columns['tag'],
                    '功能价值': matched_columns['tag'],
                    '保障价值': matched_columns['tag'],
                    '体验价值': matched_columns['tag']
                }
                
                # 分类列备用匹配逻辑
                if not matched_columns.get('category'):
                    category_fallback = next((col for col in df.columns 
                        if re.search(r'功能|质量|体验|保障', col) and col != matched_columns['tag']), None)
                    if category_fallback:
                        column_mapping.update({
                            '功能价值': category_fallback,
                            '保障价值': category_fallback,
                            '体验价值': category_fallback
                        })
                results = analyze_dimension(df, column_mapping[dimension], matched_columns['sentiment'])
                dimension_results.update(results)
            
            report.append(generate_markdown_table(dimension_results, dimension))
        
        # 写入报告文件
        with open('test_report_analysis.md', 'w', encoding='utf-8') as f:
            f.write('\n\n'.join(report))
        print('分析完成，结果已写入 test_report_analysis.md')
    
    except Exception as e:
        print(f'发生错误: {str(e)}')
        print('当前工作目录文件列表：')
        print('\n'.join([f for f in os.listdir('.') if f.endswith('.csv')]))
        print(f'请检查文件路径是否正确，建议将数据文件重命名为：评论.csv')
        print(f'错误发生时的数据行内容: {row}' if 'row' in locals() else '未进入数据处理阶段')
        current_dimension = dimension if 'dimension' in locals() else '未进入维度循环阶段'
        current_column = column_name if 'column_name' in locals() else '未定义'
        print(f'错误详情: 数据分析步骤失败于维度: {current_dimension}')
        print(f'当前使用的列: 标签列={current_column}')

if __name__ == '__main__':
    main()