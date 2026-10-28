const fs = require('fs');
const part3 = `
  const downloadWord = async () => {
    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, ShadingType } = await import('docx');
    const sections: any[] = [];

    // COVER PAGE
    const coverChildren: any[] = [];
    if (companyLogo) {
      const res = await fetch(companyLogo);
      const buf = await res.arrayBuffer();
      coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new ImageRun({ data: buf, transformation: { width: 220, height: 70 }, type: 'png' })] }));
    }
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 200 }, children: [new TextRun({ text: 'TECHNICAL AND FINANCIAL PROPOSAL', bold: true, size: 36, font: 'Times New Roman', color: '1a3a6b' })] }));
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: selectedTender?.title || '', bold: true, size: 28, font: 'Times New Roman', color: '333333' })] }));
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Proposal Reference: ' + (companyInfo.refNumber || 'REF-' + new Date().getFullYear() + '-001'), size: 22, font: 'Times New Roman', color: '666666' })] }));
    const infoRows = [
      ['Submitted By', companyInfo.name || '[Organization Name]'],
      ['Address', companyInfo.address || '[Address, Kigali, Rwanda]'],
      ['Telephone', companyInfo.phone || '[+250 XXX XXX XXX]'],
      ['Email', companyInfo.email || '[email@company.rw]'],
      ['Website', companyInfo.website || '[www.company.rw]'],
      ['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })],
    ];
    const infoTable = new Table({
      width: { size: 80, type: WidthType.PERCENTAGE },
      rows: infoRows.map(([label, value]) => new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'e8edf5' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Times New Roman', size: 20 })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Times New Roman', size: 20 })] })] }),
        ],
      })),
    });
    coverChildren.push(infoTable);
    if (companyStamp) {
      const res2 = await fetch(companyStamp);
      const buf2 = await res2.arrayBuffer();
      coverChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 800 }, children: [new ImageRun({ data: buf2, transformation: { width: 130, height: 80 }, type: 'png' })] }));
    }
    sections.push({ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: coverChildren });

    // BODY
    const bodyChildren: any[] = [];
    if (companyLogo) {
      const res = await fetch(companyLogo);
      const buf = await res.arrayBuffer();
      bodyChildren.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 200 }, children: [new ImageRun({ data: buf, transformation: { width: 160, height: 50 }, type: 'png' })] }));
    }
    const lines = proposal.split('\\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|---')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
        const parseRow = (r: string) => r.split('|').map((c: string) => c.trim()).filter((_: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1);
        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2);
        const colWidth = Math.floor(100 / headers.length);
        const docTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: headers.map((h: string) => new TableCell({ width: { size: colWidth, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: '1a3a6b' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Times New Roman', size: 18 })] })] })) }),
            ...dataRows.map((row: string, ri: number) => new TableRow({ children: parseRow(row).map((cell: string) => new TableCell({ width: { size: colWidth, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'FFFFFF' : 'f0f4fa' }, children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Times New Roman', size: 18 })] })] })) })),
          ],
        });
        bodyChildren.push(docTable);
        bodyChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
        continue;
      }
      if (line.startsWith('## ')) {
        bodyChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 }, children: [new TextRun({ text: line.slice(3), bold: true, size: 26, font: 'Times New Roman', color: '1a3a6b' })] }));
      } else if (line.startsWith('### ')) {
        bodyChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: line.slice(4), bold: true, size: 22, font: 'Times New Roman', color: '2c5282' })] }));
      } else if (line.startsWith('# ')) {
        bodyChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 }, children: [new TextRun({ text: line.slice(2), bold: true, size: 28, font: 'Times New Roman', color: '1a3a6b' })] }));
      } else if (/^[-*] /.test(line)) {
        bodyChildren.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: line.slice(2), font: 'Times New Roman', size: 20 })] }));
      } else if (/^---+$/.test(line.trim())) {
        bodyChildren.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1a3a6b' } }, spacing: { before: 200, after: 200 }, children: [] }));
      } else if (!line.trim()) {
        bodyChildren.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      } else {
        const parts = line.split(/(\\*\\*[^*]+\\*\\*)/g);
        const runs = parts.map((p: string) => p.startsWith('**') && p.endsWith('**') ? new TextRun({ text: p.slice(2, -2), bold: true, font: 'Times New Roman', size: 20 }) : new TextRun({ text: p, font: 'Times New Roman', size: 20 }));
        bodyChildren.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
      i++;
    }
    // Signature block
    bodyChildren.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: '1a3a6b' } }, spacing: { before: 600, after: 200 }, children: [new TextRun({ text: 'AUTHORIZED SIGNATORY', bold: true, font: 'Times New Roman', size: 22, color: '1a3a6b' })] }));
    const sigRows2 = [['Name', ''], ['Title/Position', ''], ['Signature', ''], ['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })]];
    const sigTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: sigRows2.map(([label, val]) => new TableRow({
        children: [
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'e8edf5' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Times New Roman', size: 20 })] })] }),
          new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: val || '_______________________________', font: 'Times New Roman', size: 20 })] })] }),
        ],
      })),
    });
    bodyChildren.push(sigTable);
    if (companyStamp) {
      const res2 = await fetch(companyStamp);
      const buf2 = await res2.arrayBuffer();
      bodyChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 400 }, children: [new ImageRun({ data: buf2, transformation: { width: 130, height: 80 }, type: 'png' })] }));
    }
    sections.push({ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: bodyChildren });

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'proposal-' + (selectedTender?.id || 'tender') + '.docx' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
`;
fs.appendFileSync('app/page.tsx', part3);
console.log('part3 done');
