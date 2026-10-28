const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
const lines = c.split('\n');
let depth = 0;
let minDepth = 0, minLine = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Skip string contents roughly - just count raw braces
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth < minDepth) { minDepth = depth; minLine = i + 1; } }
  }
  if (depth < 0) {
    console.log('depth went negative at line', i + 1, ':', JSON.stringify(line.slice(0, 80)));
    break;
  }
}
console.log('final depth:', depth, 'min depth line:', minLine);
