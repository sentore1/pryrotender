const m = require('../node_modules/pdf-parse/dist/pdf-parse/cjs/index.cjs');
const { PDFParse } = m;

console.log('PDFParse type:', typeof PDFParse);
const p = new PDFParse();
console.log('instance keys:', Object.keys(p));
console.log('proto methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(p)));
console.log('proto2 methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(Object.getPrototypeOf(p))));
