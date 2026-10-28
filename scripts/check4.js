const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
const lines = c.split('\n');
// Find where 'export default function Home' starts
let funcStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export default function Home')) { funcStart = i; break; }
}
console.log('Home starts at line', funcStart + 1);
let depth = 0;
for (let i = funcStart; i < lines.length; i++) {
  for (const ch of lines[i]) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  if (depth === 0 && i > funcStart) {
    console.log('Home closes at line', i + 1, ':', JSON.stringify(lines[i].slice(0, 60)));
    break;
  }
}
