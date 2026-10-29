'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { FileUploadZone } from '@/components/FileUploadZone';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

async function downloadDocx(content: string, filename: string) {
  const lines = content.split('\n');
  const children = lines.map(line => {
    if (line.startsWith('## ')) return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    if (line.startsWith('### ')) return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    if (line.trim() === '') return new Paragraph({ text: '' });
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return new Paragraph({ children: parts.map(p => p.startsWith('**') && p.endsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, size: 22 }) : new TextRun({ text: p, size: 22 })) });
  });
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  saveAs(blob, filename);
}

export default function FormFillerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const reset = () => { setFile(null); setResult(''); setError(''); setChatInput(''); };

  const handleFill = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fd = new FormData();
      fd.append('file', file);
      if (user?.id) fd.append('userId', user.id);
      const res = await fetch('/api/fill-form', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setResult(data.result);
      else setError(data.error || 'Failed to process form.');
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

  const sendFollowUp = async () => {
    if (!chatInput.trim() || !result) return;
    setChatLoading(true);
    try {
      const res = await fetch('/api/adjust-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal: result, instruction: chatInput }),
      });
      const data = await res.json();
      if (data.success) { setResult(data.proposal); setChatInput(''); }
      else setError(data.error || 'Failed to update.');
    } catch { setError('Network error.'); }
    finally { setChatLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-100 px-6 py-3 shrink-0">
        <h1 className="text-sm font-bold text-gray-800">Form Filler</h1>
        <p className="text-xs text-gray-400 mt-0.5">Upload a PDF form and AI will help you fill it using your company profile</p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 max-w-3xl w-full mx-auto">

        <FileUploadZone
          file={file}
          accept=".pdf,.txt"
          acceptLabel="PDF, TXT"
          onFile={f => { setFile(f); setResult(''); setError(''); }}
          onError={setError}
        />

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {file && !result && (
          <button onClick={handleFill} disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm mb-4">
            {loading
              ? <span className="flex items-center justify-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />Processing form...</span>
              : 'Fill Form with AI'}
          </button>
        )}

        {result && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Form Filling Guide</span>
              <div className="flex gap-2">
                <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Copy</button>
                <button onClick={() => downloadDocx(result, `form_filled_${file?.name?.replace(/\.[^.]+$/, '') || 'result'}.docx`)} className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-gray-50">Download DOCX</button>
                <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-50">Reset</button>
              </div>
            </div>

            <MarkdownRenderer content={result} />

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <input
                type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendFollowUp()}
                placeholder="Ask a question or request changes to the filled form..."
                disabled={chatLoading}
                className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={sendFollowUp} disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {chatLoading ? '...' : 'Ask'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
