'use client';

export function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0, k = 0;

  const renderInline = (text: string) => {
    // Split on bold markers and [FILL IN: ...] placeholders
    const parts = text.split(/(\*\*[^*]+\*\*|\[FILL IN:[^\]]+\])/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) return <strong key={j}>{p.slice(2, -2)}</strong>;
      if (p.startsWith('[FILL IN:')) return (
        <mark key={j} className="bg-yellow-100 text-yellow-800 rounded px-1 py-0.5 font-medium not-italic border border-yellow-300 text-xs">
          {p}
        </mark>
      );
      return <span key={j}>{p}</span>;
    });
  };

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|---')) {
      const headers = line.trim().split('|').filter(Boolean).map(s => s.trim());
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(lines[i].trim().split('|').filter(Boolean).map(s => s.trim()));
        i++;
      }
      elements.push(
        <div key={k++} className="overflow-x-auto my-3">
          <table className="w-full text-xs border-collapse">
            <thead><tr>{headers.map((h, j) => <th key={j} className="bg-gray-100 text-gray-800 px-3 py-2 text-left font-semibold border border-gray-200">{h}</th>)}</tr></thead>
            <tbody>{rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="px-3 py-1.5 border border-gray-200 text-gray-700">{renderInline(cell)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.startsWith('## ')) elements.push(<h2 key={k++} className="text-base font-bold text-gray-900 mt-5 mb-2">{line.slice(3)}</h2>);
    else if (line.startsWith('### ')) elements.push(<h3 key={k++} className="text-sm font-bold text-gray-800 mt-3 mb-1">{line.slice(4)}</h3>);
    else if (line.trim().startsWith('- ')) elements.push(<li key={k++} className="ml-4 text-gray-700 list-disc text-sm">{renderInline(line.trim().slice(2))}</li>);
    else if (line.trim() === '') elements.push(<div key={k++} className="h-1" />);
    else elements.push(<p key={k++} className="text-sm text-gray-700 leading-relaxed">{renderInline(line)}</p>);
    i++;
  }
  return <div className="space-y-0.5">{elements}</div>;
}
