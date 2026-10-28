const fs = require('fs');

const renderPart = `
  const parseBold = (text: string): React.ReactNode[] => {
    const parts = text.split(/(\\*\\*[^*]+\\*\\*)/g);
    return parts.map((p, i) => p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p);
  };

  const renderMarkdown = (text: string) => {
    const lines = text.split('\\n');
    const output: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|---')) {
        const tblLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { tblLines.push(lines[i]); i++; }
        const parseRow = (r: string) => r.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tblLines[0]);
        const dataRows = tblLines.slice(2);
        output.push(
          <div key={'t' + i} style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Times New Roman, serif' }}>
              <thead>
                <tr>{headers.map((h, hi) => <th key={hi} style={{ background: '#1a3a6b', color: '#fff', padding: '7px 10px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #c0cfe8' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#f0f4fa' }}>
                    {parseRow(row).map((cell, ci) => <td key={ci} style={{ padding: '6px 10px', border: '1px solid #c0cfe8', verticalAlign: 'top' }}>{parseBold(cell)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
      if (/^[-*_]{3,}\\s*$/.test(line.trim())) {
        output.push(<hr key={i} style={{ border: 'none', borderTop: '2px solid #1a3a6b', margin: '14px 0' }} />);
      } else if (line.startsWith('## ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '14px', color: '#1a3a6b', margin: '14px 0 6px', borderBottom: '1px solid #c0cfe8', paddingBottom: '3px' }}>{parseBold(line.slice(3))}</p>);
      } else if (line.startsWith('### ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '13px', color: '#2c5282', margin: '10px 0 4px' }}>{parseBold(line.slice(4))}</p>);
      } else if (line.startsWith('# ')) {
        output.push(<p key={i} style={{ fontWeight: 'bold', fontSize: '15px', color: '#1a3a6b', margin: '14px 0 6px' }}>{parseBold(line.slice(2))}</p>);
      } else if (/^[-*] /.test(line)) {
        output.push(<p key={i} style={{ margin: '3px 0', paddingLeft: '18px' }}>{'• '}{parseBold(line.slice(2))}</p>);
      } else if (!line.trim()) {
        output.push(<p key={i} style={{ margin: 0, minHeight: '0.7em' }}>&nbsp;</p>);
      } else {
        output.push(<p key={i} style={{ margin: '3px 0' }}>{parseBold(line)}</p>);
      }
      i++;
    }
    return output;
  };

  const openTenders = tenders.filter(t => !t.deadline?.toLowerCase().includes('closed'));
  const closedTenders = tenders.filter(t => t.deadline?.toLowerCase().includes('closed'));
`;

fs.appendFileSync('app/page.tsx', renderPart);
console.log('C done');
