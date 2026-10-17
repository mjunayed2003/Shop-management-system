/**
 * CSV Utilities with Formula Injection Protection (CSV Injection / CWE-1236)
 */

/**
 * Escapes a single CSV cell value and protects against CSV formula injection.
 * Formula triggers: =, +, -, @, or tab/carriage return at the beginning.
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }

  let str = String(val);

  // Prevent CSV Formula Injection
  // If the cell begins with =, +, -, @, \t, or \r, prepend a single quote (')
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape internal double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates properly formatted CSV string with formula injection protection
 */
export function exportToCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

/**
 * Generates CSV content and triggers client-side file download
 */
export function downloadCsv(
  contentOrRecordsOrFilename: string | Record<string, any>[],
  filenameOrHeaders?: string | string[],
  maybeRows?: (string | number | boolean | null | undefined)[][],
) {
  let csvContent = '';
  let filename = 'export.csv';

  if (Array.isArray(contentOrRecordsOrFilename)) {
    // Signature: downloadCsv(records: Record<string, any>[], filename: string)
    filename = typeof filenameOrHeaders === 'string' ? filenameOrHeaders : 'export.csv';
    if (contentOrRecordsOrFilename.length > 0) {
      const headers = Object.keys(contentOrRecordsOrFilename[0]);
      const rows = contentOrRecordsOrFilename.map((obj) => headers.map((h) => obj[h]));
      csvContent = exportToCsv(headers, rows);
    } else {
      csvContent = '';
    }
  } else if (Array.isArray(filenameOrHeaders)) {
    // Signature: downloadCsv(filename, headers, rows)
    filename = contentOrRecordsOrFilename;
    csvContent = exportToCsv(filenameOrHeaders, maybeRows || []);
  } else {
    // Signature: downloadCsv(csvContent, filename)
    csvContent = contentOrRecordsOrFilename;
    filename = filenameOrHeaders || 'export.csv';
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  data: string[][];
}

/**
 * Parses raw CSV string into headers, row objects, and raw data lines
 */
export function parseCsv(csvText: string): ParsedCsv {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], data: [] };
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const parsedLines = lines.map(parseLine);
  const headers = parsedLines[0] || [];
  const data = parsedLines.slice(1);

  const rows: Record<string, string>[] = [];
  data.forEach((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? '';
    });
    rows.push(obj);
  });

  return { headers, rows, data };
}
