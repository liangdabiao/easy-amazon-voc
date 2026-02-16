// 测试用户画像解析逻辑
const fs = require('fs');
const path = require('path');

const personaFile = path.join(__dirname, 'uploads/processed/processed.csv_persona_2026-02-16T12-33-19.md');
const content = fs.readFileSync(personaFile, 'utf-8');

console.log('=== 用户画像原始内容 ===');
console.log(content);
console.log('\n=== 开始解析 ===\n');

// 当前的解析逻辑
console.log('--- 使用当前代码的分割逻辑 ---');
const sections = content.split(/^###\s+/m);
console.log('分割后 sections 长度:', sections.length);
console.log('sections:', sections);

const personas = [];
for (let i = 1; i < sections.length; i++) {
  const lines = sections[i].split('\n');
  const title = lines[0].trim();
  const contentPart = lines.slice(1).join('\n').trim();
  
  console.log(`\n第 ${i} 个 section:`);
  console.log('  标题:', title);
  console.log('  内容长度:', contentPart.length);
  console.log('  内容:', contentPart);

  if (title && contentPart) {
    personas.push({ title, content: contentPart, index: i - 1 });
  }
}

console.log('\n--- 最终解析结果 ---');
console.log('成功解析的画像数量:', personas.length);
personas.forEach((p, idx) => {
  console.log(`画像 ${idx + 1}: ${p.title}`);
});
