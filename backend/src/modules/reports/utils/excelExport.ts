interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'percent' | 'number' | 'text';
}

export function generateReportCsv(data: Record<string, unknown>[], columns: ExcelColumn[]): string {
  const escapeCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const formatValue = (val: unknown, fmt?: string): string => {
    if (val === null || val === undefined) return '';
    if (fmt === 'currency') return Number(val).toFixed(2);
    if (fmt === 'percent') return `${Number(val)}%`;
    if (fmt === 'number') return String(Number(val));
    return String(val);
  };

  const headers = columns.map((c) => escapeCsv(c.label)).join(',');

  const rows = data.map((row) => {
    return columns.map((c) => {
      const val = row[c.key];
      return escapeCsv(formatValue(val, c.format));
    }).join(',');
  });

  const totalsRow = columns.map((c) => {
    if (c.format === 'currency' || c.format === 'number') {
      const sum = data.reduce((acc, row) => {
        const v = Number(row[c.key]);
        return acc + (isNaN(v) ? 0 : v);
      }, 0);
      return escapeCsv(formatValue(sum, c.format));
    }
    if (c.format === 'percent' && c.key === columns[0]?.key) {
      return escapeCsv('TOTAL');
    }
    return '';
  }).join(',');

  const lines = [headers, ...rows, totalsRow];
  return lines.join('\n');
}
