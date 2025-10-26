/**
 * TableSectionDisplay - Read-only display component for Table sections
 *
 * Tables display structured data in rows and columns.
 * Currently does NOT support highlighting as table cell text would be fragmented.
 * Future enhancement: Could support highlighting per-cell with compound sectionIds.
 */
import React from 'react';

interface TableSectionDisplayProps {
  value: Array<Record<string, string | number>> | string;
  className?: string;
}

export const TableSectionDisplay: React.FC<TableSectionDisplayProps> = ({
  value,
  className = ''
}) => {
  // Parse value to table rows
  let tableRows: Array<Record<string, string | number>>;

  try {
    tableRows = typeof value === 'string'
      ? JSON.parse(value || '[]')
      : value || [];
  } catch {
    return (
      <div className={`table-section-display ${className}`}>
        <div className="table-error">Invalid table data</div>
      </div>
    );
  }

  if (tableRows.length === 0) {
    return (
      <div className={`table-section-display ${className}`}>
        <div className="table-empty">No data</div>
      </div>
    );
  }

  // Get column keys from first row (excluding 'id')
  const columns = Object.keys(tableRows[0]).filter(key => key !== 'id');

  if (columns.length === 0) {
    return (
      <div className={`table-section-display ${className}`}>
        <div className="table-error">No columns found</div>
      </div>
    );
  }

  return (
    <div className={`table-section-display ${className}`}>
      <table className="journal-table-view">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col}>
                {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, index) => (
            <tr key={(row.id as string) || index}>
              {columns.map(col => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
