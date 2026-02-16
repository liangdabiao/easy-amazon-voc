// CSV解析工具 - 用于解析上传的评论文件

// ==================== 类型定义 ====================

export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  contentColumn: string;
  contentColumnIndex: number;
  totalRows: number;
}

export interface CSVValidationResult {
  valid: boolean;
  error?: string;
  encoding?: 'utf-8' | 'gbk';
}

// ==================== 常量定义 ====================

// 可能的评论内容列名
const POSSIBLE_CONTENT_COLUMNS = [
  'typography_body-l__v5JLj',
  'cr-original-review-content (2)',
  'review_content',
  'review',
  'comment',
  'content',
  'body',
  'text',
  'message',
  '评论内容',
  '评论',
  '内容',
];

// 限制配置
export const CSV_LIMITS = {
  MAX_FILE_SIZE: 16 * 1024 * 1024, // 16MB
  MAX_ROWS: 300,
  MIN_ROWS: 1,
} as const;

// ==================== CSV解析类 ====================

export class CSVParser {
  /**
   * 验证CSV文件
   */
  static async validateCSV(file: File): Promise<CSVValidationResult> {
    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      return { valid: false, error: '仅支持CSV文件 / Only CSV files are supported' };
    }

    // 检查文件大小
    if (file.size > CSV_LIMITS.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `文件过大，最大支持${CSV_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB / File too large, max ${CSV_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // 检查编码和行数
    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // 尝试UTF-8解码
      let content: string;
      try {
        content = new TextDecoder('utf-8').decode(uint8Array);
      } catch {
        // 尝试GBK解码
        try {
          content = new TextDecoder('gbk').decode(uint8Array);
          return { valid: true, encoding: 'gbk' };
        } catch {
          return {
            valid: false,
            error: '文件编码不支持，请使用UTF-8或GBK编码 / Unsupported encoding, please use UTF-8 or GBK',
          };
        }
      }

      // 计算行数
      const lineCount = content.split(/\r\n|\n|\r/).length;
      if (lineCount > CSV_LIMITS.MAX_ROWS) {
        return {
          valid: false,
          error: `CSV文件数据不能超过${CSV_LIMITS.MAX_ROWS}条 / CSV file cannot exceed ${CSV_LIMITS.MAX_ROWS} rows`,
        };
      }

      return { valid: true, encoding: 'utf-8' };
    } catch (error) {
      return {
        valid: false,
        error: `文件读取失败 / Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * 解析CSV文件内容
   */
  static parseCSV(content: string, encoding: 'utf-8' | 'gbk' = 'utf-8'): ParsedCSVData {
    // 解析CSV行（处理引号内的逗号）
    const lines = this.splitCSVLines(content);

    if (lines.length === 0) {
      throw new Error('CSV文件为空 / CSV file is empty');
    }

    // 解析表头
    const headers = this.parseCSVLine(lines[0]);

    // 查找评论内容列
    const { column: contentColumn, index: contentColumnIndex } = this.findContentColumn(headers);

    // 解析数据行
    const rows: string[][] = [];
    for (let i = 1; i < lines.length && i <= CSV_LIMITS.MAX_ROWS; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    return {
      headers,
      rows,
      contentColumn,
      contentColumnIndex,
      totalRows: rows.length,
    };
  }

  /**
   * 从解析的数据中提取所有评论内容
   */
  static extractReviews(data: ParsedCSVData): string[] {
    const reviews: string[] = [];

    for (const row of data.rows) {
      if (data.contentColumnIndex < row.length) {
        const content = row[data.contentColumnIndex]?.trim();
        if (content && content.length > 0) {
          reviews.push(content);
        }
      }
    }

    return reviews;
  }

  // ==================== 私有方法 ====================

  /**
   * 查找评论内容列
   */
  private static findContentColumn(headers: string[]): { column: string; index: number } {
    // 首先尝试精确匹配
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.trim();
      if (POSSIBLE_CONTENT_COLUMNS.includes(header)) {
        return { column: header, index: i };
      }
    }

    // 尝试模糊匹配（包含关键词）
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toLowerCase() || '';
      for (const keyword of POSSIBLE_CONTENT_COLUMNS) {
        if (header.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(header)) {
          return { column: headers[i], index: i };
        }
      }
    }

    // 默认使用第11列（索引10），参考原项目
    const defaultIndex = Math.min(10, headers.length - 1);
    return { column: headers[defaultIndex] || 'review_content', index: defaultIndex };
  }

  /**
   * 分割CSV行（处理引号内的逗号和换行）
   */
  private static splitCSVLines(content: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        // 检查是否是转义的引号
        if (nextChar === '"') {
          currentLine += '""';
          i++; // 跳过下一个引号
        } else {
          inQuotes = !inQuotes;
          currentLine += char;
        }
      } else if ((char === '\r' && nextChar === '\n') || char === '\n' || char === '\r') {
        if (!inQuotes) {
          lines.push(currentLine);
          currentLine = '';
          if (char === '\r' && nextChar === '\n') {
            i++; // 跳过\n
          }
        } else {
          currentLine += char;
        }
      } else {
        currentLine += char;
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * 解析CSV行（处理引号内的逗号）
   */
  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // 跳过下一个引号
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

    // 处理引号包裹的字段
    return fields.map(field => {
      const trimmed = field.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1).replace(/""/g, '"');
      }
      return trimmed;
    });
  }
}

// ==================== Node.js环境使用的工具函数 ====================

/**
 * 在Node.js环境中读取并解析CSV文件
 */
export async function parseCSVFile(
  filePath: string,
  encoding: 'utf-8' | 'gbk' = 'utf-8'
): Promise<ParsedCSVData> {
  console.log('[CSVParser] ===== 开始解析CSV文件 =====');
  console.log('[CSVParser] - 文件路径:', filePath);
  console.log('[CSVParser] - 编码:', encoding);

  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, encoding);

  console.log('[CSVParser] - 文件读取完成，内容长度:', content.length, '字符');

  const result = CSVParser.parseCSV(content, encoding);

  console.log('[CSVParser] - 解析结果:');
  console.log('[CSVParser]   - 表头:', result.headers);
  console.log('[CSVParser]   - 总行数:', result.totalRows);
  console.log('[CSVParser]   - 内容列:', result.contentColumn, '(索引:', result.contentColumnIndex + ')');
  console.log('[CSVParser] ===== CSV解析完成 =====');

  return result;
}

/**
 * 验证CSV文件（Node.js环境）
 */
export async function validateCSVFile(filePath: string): Promise<CSVValidationResult> {
  console.log('[CSVParser] ===== 验证CSV文件 =====');
  console.log('[CSVParser] - 文件路径:', filePath);

  const fs = await import('fs/promises');

  try {
    const stats = await fs.stat(filePath);
    console.log('[CSVParser] - 文件大小:', stats.size, 'bytes (', Math.round(stats.size / 1024), 'KB)');

    // 检查文件扩展名
    if (!filePath.endsWith('.csv')) {
      console.log('[CSVParser] - 错误: 不是CSV文件');
      return { valid: false, error: '仅支持CSV文件' };
    }

    // 检查文件大小
    if (stats.size > CSV_LIMITS.MAX_FILE_SIZE) {
      console.log('[CSVParser] - 错误: 文件过大');
      return {
        valid: false,
        error: `文件过大，最大支持${CSV_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`,
      };
    }

    // 读取并检查内容
    const buffer = await fs.readFile(filePath);
    console.log('[CSVParser] - 文件读取成功，尝试检测编码...');

    // 尝试UTF-8解码
    let content: string;
    try {
      content = buffer.toString('utf-8');
      console.log('[CSVParser] - UTF-8编码检测成功');
    } catch {
      // 尝试GBK解码
      try {
        content = buffer.toString('gbk');
        console.log('[CSVParser] - GBK编码检测成功');
        return { valid: true, encoding: 'gbk' };
      } catch {
        console.log('[CSVParser] - 错误: 编码检测失败');
        return {
          valid: false,
          error: '文件编码不支持，请使用UTF-8或GBK编码',
        };
      }
    }

    // 计算行数
    const lineCount = content.split(/\r\n|\n|\r/).length;
    console.log('[CSVParser] - 文件行数:', lineCount);

    if (lineCount > CSV_LIMITS.MAX_ROWS) {
      console.log('[CSVParser] - 错误: 行数超限');
      return {
        valid: false,
        error: `CSV文件数据不能超过${CSV_LIMITS.MAX_ROWS}条`,
      };
    }

    console.log('[CSVParser] - 验证通过，编码: UTF-8');
    console.log('[CSVParser] ===== CSV验证完成 =====');
    return { valid: true, encoding: 'utf-8' };
  } catch (error) {
    console.error('[CSVParser] - 验证失败:', error);
    return {
      valid: false,
      error: `文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
