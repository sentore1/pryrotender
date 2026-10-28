const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
// Find all \r characters
const crCount = (c.match(/\r/g) || []).length;
console.log('CR count:', crCount);
// Check for \r\n mixed with \n
console.log('has CRLF:', c.includes('\r\n'));
// Count open/close braces
let open = 0, close = 0;
for (const ch of c) {
  if (ch === '{') open++;
  if (ch === '}') close++;
}
console.log('open braces:', open, 'close braces:', close, 'diff:', open - close);
// Find line with \r
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('\r')) {
    console.log('CRLF at line', i + 1, JSON.stringify(lines[i].slice(0, 40)));
    if (i > 5) break;
  }
}
