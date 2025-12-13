/**
 * TableSectionDisplay - Read-only display component for Table sections
 *
 * Tables display structured data in rows and columns.
 * Supports markdown rendering in cell content.
 * Currently does NOT support highlighting as table cell text would be fragmented.
 * Future enhancement: Could support highlighting per-cell with compound sectionIds.
 */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number';
  width?: string;
}

interface TableSectionDisplayProps {
  value: Array<Record<string, string | number>> | string;
  config?: {
    columns?: TableColumn[];
  };
  className?: string;
}

export const TableSectionDisplay: React.FC<TableSectionDisplayProps> = ({
  value,
  config,
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

  // Use config columns if available, otherwise infer from data
  let columnsToDisplay: Array<{ key: string; label: string; width?: string }>;

  if (config?.columns && config.columns.length > 0) {
    // Use template-defined columns
    columnsToDisplay = config.columns.map(col => ({
      key: col.key,
      label: col.label,
      width: col.width
    }));
  } else {
    // Fallback: infer columns from first row (excluding 'id')
    const columnKeys = Object.keys(tableRows[0]).filter(key => key !== 'id');
    columnsToDisplay = columnKeys.map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }

  if (columnsToDisplay.length === 0) {
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
            {columnsToDisplay.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, index) => (
            <tr key={(row.id as string) || index}>
              {columnsToDisplay.map(col => {
                const cellValue = row[col.key];
                const cellContent = cellValue != null ? String(cellValue) : '';
                return (
                  <td key={col.key}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <>{children}</>,
                    }}>
                      {cellContent}
                    </ReactMarkdown>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
