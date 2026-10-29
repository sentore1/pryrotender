'use client';
import { useRef } from 'react';

const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

interface Props {
  file: File | null;
  accept: string;
  acceptLabel: string;
  onFile: (f: File) => void;
  onError: (msg: string) => void;
}

export function FileUploadZone({ file, accept, acceptLabel, onFile, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = (f: File) => {
    if (f.size > MAX_BYTES) { onError(`File too large. Maximum size is ${MAX_MB}MB.`); return; }
    onFile(f);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
      className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition mb-4"
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }} />
      <div className="text-2xl mb-2 text-gray-300">&#9633;</div>
      {file ? (
        <p className="text-sm font-semibold text-blue-600">{file.name} <span className="text-gray-400 font-normal">({(file.size / 1024).toFixed(0)} KB)</span></p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700">Drop file here or click to upload</p>
          <p className="text-xs text-gray-400 mt-1">{acceptLabel} &mdash; max {MAX_MB}MB</p>
        </>
      )}
    </div>
  );
}
