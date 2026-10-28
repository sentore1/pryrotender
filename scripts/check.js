const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
const lines = c.split('\n');
console.log('total lines:', lines.length);
for (let i = 908; i < 918; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
