const fs = require('fs');

const downloadWord = `
  const downloadWord = async () => {
    const { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType,
      Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, ShadingType } = await import('docx');
    const sections: any[] = [];

    // COVER PAGE
    const coverChildren: any[] = [];
    if (companyLogo) {
      const r = await fetch(companyLogo); const buf = await r.arrayBuffer();
      coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new ImageRun({ data: buf, transformation: { width: 220, height: 70 }, type: 'png' })] }));
    }
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 200 }, children: [new TextRun({ text: 'TECHNICAL AND FINANCIAL PROPOSAL', bold: true, size: 36, font: 'Times New Roman', color: '1a3a6b' })] }));
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: selectedTender?.title || '', bold: true, size: 28, font: 'Times New Roman', color: '333333' })] }));
    coverChildren.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Proposal Reference: ' + (companyInfo.refNumber || 'REF-' + new Date().getFullYear() + '-001'), size: 22, font: 'Times New Roman', color: '666666' })] }));
    const infoRows: [string, string][] = [
      ['Submitted By', companyInfo.name || '[Organization Name]'],
      ['Address', companyInfo.address || '[Address, Kigali, Rwanda]'],
      ['Telephone', companyInfo.phone || '[+250 XXX XXX XXX]'],
      ['Email', companyInfo.email || '[email@company.rw]'],
      ['Website', companyInfo.website || '[www.company.rw]'],
      ['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })],
    ];
    coverChildren.push(new Table({
      width: { size: 80, type: WidthType.PERCENTAGE },
      rows: infoRows.map(([label, value]) => new TableRow({ children: [
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'e8edf5' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Times New Roman', size: 20 })] })] }),
        new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value, font: 'Times New Roman', size: 20 })] })] }),
      ]})),
    }));
    if (companyStamp) {
      const r2 = await fetch(companyStamp); const buf2 = await r2.arrayBuffer();
      coverChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 800 }, children: [new ImageRun({ data: buf2, transformation: { width: 130, height: 80 }, type: 'png' })] }));
    }
    sections.push({ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: coverChildren });

    // BODY PAGE
    const bodyChildren: any[] = [];
    if (companyLogo) {
      const r = await fetch(companyLogo); const buf = await r.arrayBuffer();
      bodyChildren.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 200 }, children: [new ImageRun({ data: buf, transformation: { width: 160, height: 50 }, type: 'png' })] }));
    }

    const lines = proposal.split('\\n');
    let idx = 0;
    while (idx < lines.length) {
      const line = lines[idx];
      if (line.trim().startsWith('|') && idx + 1 < lines.length && lines[idx + 1].trim().startsWith('|---')) {
        const tblLines: string[] = [];
        while (idx < lines.length && lines[idx].trim().startsWith('|')) { tblLines.push(lines[idx]); idx++; }
        const parseRow = (r: string) => r.split('|').map((c: string) => c.trim()).filter((_: string, i: number, a: string[]) => i > 0 && i < a.length - 1);
        const headers = parseRow(tblLines[0]);
        const dataRows = tblLines.slice(2);
        const colW = Math.floor(100 / Math.max(headers.length, 1));
        bodyChildren.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: headers.map((h: string) => new TableCell({ width: { size: colW, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: '1a3a6b' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', font: 'Times New Roman', size: 18 })] })] })) }),
            ...dataRows.map((row: string, ri: number) => new TableRow({ children: parseRow(row).map((cell: string) => new TableCell({ width: { size: colW, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: ri % 2 === 0 ? 'FFFFFF' : 'f0f4fa' }, children: [new Paragraph({ children: [new TextRun({ text: cell, font: 'Times New Roman', size: 18 })] })] })) })),
          ],
        }));
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
        const runs = parts.map((p: string) => p.startsWith('**') && p.endsWith('**')
          ? new TextRun({ text: p.slice(2, -2), bold: true, font: 'Times New Roman', size: 20 })
          : new TextRun({ text: p, font: 'Times New Roman', size: 20 }));
        bodyChildren.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
      idx++;
    }

    // Signature block
    bodyChildren.push(new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: '1a3a6b' } }, spacing: { before: 600, after: 200 }, children: [new TextRun({ text: 'AUTHORIZED SIGNATORY', bold: true, font: 'Times New Roman', size: 22, color: '1a3a6b' })] }));
    const sigRows: [string, string][] = [['Name', ''], ['Title/Position', ''], ['Signature', ''], ['Date', new Date().toLocaleDateString('en-RW', { year: 'numeric', month: 'long', day: 'numeric' })]];
    bodyChildren.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: sigRows.map(([label, val]) => new TableRow({ children: [
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.SOLID, color: 'e8edf5' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Times New Roman', size: 20 })] })] }),
        new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: val || '_______________________________', font: 'Times New Roman', size: 20 })] })] }),
      ]})),
    }));
    if (companyStamp) {
      const r2 = await fetch(companyStamp); const buf2 = await r2.arrayBuffer();
      bodyChildren.push(new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 400 }, children: [new ImageRun({ data: buf2, transformation: { width: 130, height: 80 }, type: 'png' })] }));
    }
    sections.push({ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: bodyChildren });

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'proposal-' + (selectedTender?.id || 'tender') + '.docx' });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
`;

fs.appendFileSync('app/page.tsx', downloadWord);
console.log('B done');
