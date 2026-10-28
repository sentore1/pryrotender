const fs = require('fs');
const c = fs.readFileSync('app/page.tsx', 'utf8');
const lines = c.split('\n');
for (let i = 458; i < 475; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
