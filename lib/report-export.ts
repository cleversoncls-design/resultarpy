import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

// Jeito correto de registrar a fonte padrão (Roboto) no pdfmake 0.3 —
// versões anteriores usavam "pdfMake.vfs = pdfFonts.pdfMake.vfs", que não
// funciona mais nessa versão da biblioteca.
(pdfMake as any).addVirtualFileSystem(pdfFonts);

export type ReportColumn = { key: string; label: string };
export type ReportRow = Record<string, string | number>;
// Um par "rótulo: valor" — usado pro bloco de informações da viagem no
// topo do relatório (Viajante, Data Início, Data Fim, etc.), quando o
// relatório está filtrado por uma viagem específica.
export type ReportInfoLine = { label: string; value: string };
// Uma imagem de comprovante com um rótulo de referência (viagem, data,
// tipo, valor) — usado só na exportação em PDF, anexado depois da
// tabela principal.
export type ReportImage = { label: string; uri: string };

function escapeCsv(value: string | number) {
  const text = String(value ?? '');
  return /[";,\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadWeb(content: BlobPart, filename: string, mime: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function tableHtml(title: string, columns: ReportColumn[], rows: ReportRow[], infoLines: ReportInfoLine[], summaryRow?: ReportRow, images: ReportImage[] = []) {
  const infoHtml = infoLines.length ? `<table class="info">${infoLines.map((line) => `<tr><th>${line.label}</th><td>${line.value}</td></tr>`).join('')}</table>` : '';
  const head = columns.map((column) => `<th>${column.label}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${String(row[column.key] ?? '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char))}</td>`).join('')}</tr>`).join('');
  const summaryHtml = summaryRow ? `<tr class="summary">${columns.map((column) => `<td>${String(summaryRow[column.key] ?? '')}</td>`).join('')}</tr>` : '';
  const imagesHtml = images.length ? images.map((image) => `<div class="receipt"><p>${image.label}</p><img src="${image.uri}" /></div>`).join('') : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#151718;padding:24px}h1{font-size:20px}table.info{margin-bottom:16px;font-size:12px}table.info th{text-align:left;padding:2px 12px 2px 0;color:#555}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #d7dce0;padding:7px;text-align:left}th{background:#f1f3f4}tr:nth-child(even){background:#fafafa}tr.summary td{font-weight:bold;background:#eef1f3;border-top:2px solid #171717}.receipt{page-break-before:always;margin-top:20px}.receipt p{font-weight:bold;font-size:13px}.receipt img{max-width:100%;max-height:900px}</style></head><body><h1>${title}</h1>${infoHtml}<table><thead><tr>${head}</tr></thead><tbody>${body}${summaryHtml}</tbody></table>${imagesHtml}</body></html>`;
}

export async function exportReport(
  format: 'xlsx' | 'csv' | 'pdf',
  title: string,
  filename: string,
  columns: ReportColumn[],
  rows: ReportRow[],
  options?: { infoLines?: ReportInfoLine[]; summaryRow?: ReportRow; images?: ReportImage[] },
) {
  const infoLines = options?.infoLines ?? [];
  const summaryRow = options?.summaryRow;
  const images = options?.images ?? [];
  const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '-');

  if (format === 'csv') {
    const infoRows = infoLines.map((line) => `${escapeCsv(line.label)};${escapeCsv(line.value)}`);
    const headerRow = columns.map((column) => escapeCsv(column.label)).join(';');
    const dataRows = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(';'));
    const summaryLine = summaryRow ? [columns.map((column) => escapeCsv(summaryRow[column.key] ?? '')).join(';')] : [];
    const csv = [...infoRows, ...(infoRows.length ? [''] : []), headerRow, ...dataRows, ...summaryLine].join('\n');
    if (Platform.OS === 'web') downloadWeb(`\ufeff${csv}`, `${safeFilename}.csv`, 'text/csv;charset=utf-8');
    else {
      const uri = `${FileSystem.cacheDirectory}${safeFilename}.csv`;
      await FileSystem.writeAsStringAsync(uri, `\ufeff${csv}`, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: title });
    }
    return;
  }

  if (format === 'xlsx') {
    const sheetRows: (string | number)[][] = [];
    if (infoLines.length) {
      infoLines.forEach((line) => sheetRows.push([line.label, line.value]));
      sheetRows.push([]);
    }
    sheetRows.push(columns.map((column) => column.label));
    rows.forEach((row) => sheetRows.push(columns.map((column) => row[column.key] ?? '')));
    if (summaryRow) sheetRows.push(columns.map((column) => summaryRow[column.key] ?? ''));
    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    if (Platform.OS === 'web') {
      const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      downloadWeb(output, `${safeFilename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const uri = `${FileSystem.cacheDirectory}${safeFilename}.xlsx`;
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: title });
    }
    return;
  }

  // PDF via pdfmake — não depende de html2canvas (o que quebrava o build
  // do sistema inteiro quando tentamos usar o jsPDF).
  if (Platform.OS === 'web') {
    const content: any[] = [{ text: title, fontSize: 14, bold: true, margin: [0, 0, 0, 8] }];
    if (infoLines.length) {
      content.push({
        columns: infoLines.map((line) => ({ text: [{ text: `${line.label}: `, bold: true }, line.value], fontSize: 9 })),
        margin: [0, 0, 0, 12],
      });
    }
    const tableBody = [
      columns.map((column) => ({ text: column.label, bold: true, fontSize: 8, fillColor: '#171717', color: '#ffffff' })),
      ...rows.map((row) => columns.map((column) => ({ text: String(row[column.key] ?? ''), fontSize: 8 }))),
    ];
    if (summaryRow) tableBody.push(columns.map((column) => ({ text: String(summaryRow[column.key] ?? ''), fontSize: 8, bold: true, fillColor: '#eef1f3' })));
    content.push({
      table: { headerRows: 1, widths: columns.map(() => '*'), body: tableBody },
      layout: { fillColor: (rowIndex: number) => (rowIndex > 0 && rowIndex < tableBody.length - (summaryRow ? 1 : 0) && rowIndex % 2 === 0 ? '#f8f8f8' : null) },
    });
    // Comprovantes anexados — cada imagem entra numa página própria, com
    // o rótulo de referência (viagem, data, tipo, valor) acima dela.
    // A página principal pode ficar "deitada" (landscape) quando há
    // muitas colunas na tabela, o que sobra pouca altura pra imagem —
    // por isso forçamos cada página de comprovante a ficar "em pé"
    // (portrait) e mantemos rótulo + imagem grudados como um bloco só.
    if (images.length) {
      images.forEach((image) => {
        content.push({
          stack: [
            { text: image.label, fontSize: 10, bold: true, margin: [0, 0, 0, 8] },
            { image: image.uri, fit: [380, 620] },
          ],
          pageBreak: 'before',
          pageOrientation: 'portrait',
        });
      });
    }
    const docDefinition = { pageOrientation: columns.length > 6 ? ('landscape' as const) : ('portrait' as const), content, defaultStyle: { fontSize: 8 } };
    (pdfMake as any).createPdf(docDefinition).download(`${safeFilename}.pdf`);
    return;
  }

  const html = tableHtml(title, columns, rows, infoLines, summaryRow, images);
  const result = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: title });
}