import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

export type ReportColumn = { key: string; label: string };
export type ReportRow = Record<string, string | number>;

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

function tableHtml(title: string, columns: ReportColumn[], rows: ReportRow[]) {
  const head = columns.map((column) => `<th>${column.label}</th>`).join('');
  const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${String(row[column.key] ?? '').replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char))}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#151718;padding:24px}h1{font-size:20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #d7dce0;padding:7px;text-align:left}th{background:#f1f3f4}tr:nth-child(even){background:#fafafa}</style></head><body><h1>${title}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export async function exportReport(format: 'xlsx' | 'csv' | 'pdf', title: string, filename: string, columns: ReportColumn[], rows: ReportRow[]) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '-');
  if (format === 'csv') {
    const csv = [columns.map((column) => escapeCsv(column.label)).join(';'), ...rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(';'))].join('\n');
    if (Platform.OS === 'web') downloadWeb(`\ufeff${csv}`, `${safeFilename}.csv`, 'text/csv;charset=utf-8');
    else {
      const uri = `${FileSystem.cacheDirectory}${safeFilename}.csv`;
      await FileSystem.writeAsStringAsync(uri, `\ufeff${csv}`, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: title });
    }
    return;
  }

  if (format === 'xlsx') {
    const data = rows.map((row) => Object.fromEntries(columns.map((column) => [column.label, row[column.key] ?? ''])));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Relatório');
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

  const html = tableHtml(title, columns, rows);
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } else {
    const result = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: title });
  }
}
