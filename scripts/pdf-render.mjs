/**
 * Standalone PDF page renderer using pdfjs-dist v3 (CJS, proper Node.js support).
 * Runs as a child process outside Next.js bundling.
 *
 * Input  (stdin):  JSON { pdfBase64: string, maxPages: number }
 * Output (stdout): JSON string[]  — one base64 JPEG per page
 * Errors (stderr + exit 1) on failure.
 */

import { createRequire } from 'module';
import { createCanvas } from 'canvas';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Silence pdfjs console warnings so they don't contaminate stdout JSON output
const origWarn = console.warn;
console.warn = (...args) => process.stderr.write('[pdfjs warn] ' + args.join(' ') + '\n');
const origLog = console.log;
console.log = (...args) => process.stderr.write('[pdfjs log] ' + args.join(' ') + '\n');

// Use pdfjs-dist v3 CJS build — proper Node.js canvas support
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Point worker at the v3 CJS worker
const workerPath = resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
    const context = canvas.getContext('2d');
    return { canvas, context };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = Math.ceil(width);
    canvasAndContext.canvas.height = Math.ceil(height);
  }
  destroy(canvasAndContext) {
    if (canvasAndContext?.canvas) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  }
}

async function run() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const { pdfBase64, maxPages = 10 } = input;

  const pdfBuffer = Buffer.from(pdfBase64, 'base64');
  const canvasFactory = new NodeCanvasFactory();

  const task = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    canvasFactory,
  });

  const pdf = await task.promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const results = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory,
    }).promise;

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    canvasFactory.destroy({ canvas, context });
    results.push(base64);
  }

  process.stdout.write(JSON.stringify(results));
}

run().catch(err => {
  process.stderr.write(err.message + '\n' + (err.stack || '') + '\n');
  process.exit(1);
});
