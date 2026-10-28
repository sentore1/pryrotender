const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
const lines = c.split('\n');
let funcStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function TenderCard')) { funcStart = i; break; }
}
console.log('TenderCard starts at line', funcStart + 1);
let depth = 0;
for (let i = funcStart; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (depth === 0 && i > funcStart) {
    console.log('TenderCard closes at line', i + 1, ':', JSON.stringify(lines[i]));
    // show next few lines
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      console.log(j + 1, JSON.stringify(lines[j]));
    }
    break;
  }
}
