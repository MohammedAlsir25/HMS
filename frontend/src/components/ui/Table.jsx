export function Table({ columns, data, onRowClick, className = '' }) {
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className={`w-full border-collapse ${className}`}>
        <thead>
          <tr className="border-b border-silver">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-caption font-medium text-slate uppercase tracking-wide
                  ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={row.id || idx}
              className={`border-b border-silver/50 transition-colors
                ${onRowClick ? 'cursor-pointer hover:bg-bone/50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 text-body text-obsidian ${col.cellClass || ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate text-body">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
