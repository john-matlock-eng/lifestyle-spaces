import React from 'react'
import { Plus, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import '../../styles/sections.css'

export interface TableRow {
  id: string
  [key: string]: string | number
}

interface TableColumn {
  key: string
  label: string
  type?: 'text' | 'number'
  width?: string
}

interface TableSectionProps {
  value: TableRow[] | string
  onChange: (value: TableRow[]) => void
  placeholder?: string
  disabled?: boolean
  config?: {
    columns?: TableColumn[]
  }
}

export const TableSection: React.FC<TableSectionProps> = ({
  value,
  onChange,
  placeholder = "Add data...",
  disabled = false,
  config = {}
}) => {
  // Default columns if not specified
  const defaultColumns: TableColumn[] = [
    { key: 'col1', label: 'Column 1', type: 'text' },
    { key: 'col2', label: 'Column 2', type: 'text' }
  ]

  const columns = config.columns || defaultColumns

  // Parse value
  const rows: TableRow[] = typeof value === 'string'
    ? (value ? JSON.parse(value) : [])
    : value || []

  const addRow = () => {
    const newRow: TableRow = { id: uuidv4() }
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : ''
    })
    onChange([...rows, newRow])
  }

  const updateCell = (rowId: string, columnKey: string, cellValue: string | number) => {
    onChange(rows.map(row =>
      row.id === rowId ? { ...row, [columnKey]: cellValue } : row
    ))
  }

  const removeRow = (rowId: string) => {
    onChange(rows.filter(row => row.id !== rowId))
  }

  return (
    <div className="table-section">
      <div className="table-container">
        <table className="journal-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.type === 'number' ? (
                      <input
                        type="number"
                        value={row[col.key] || 0}
                        onChange={(e) => updateCell(row.id, col.key, parseInt(e.target.value) || 0)}
                        className="table-cell-input"
                        disabled={disabled}
                        placeholder={placeholder}
                      />
                    ) : (
                      <textarea
                        value={row[col.key] || ''}
                        onChange={(e) => updateCell(row.id, col.key, e.target.value)}
                        className="table-cell-input"
                        disabled={disabled}
                        placeholder={placeholder}
                        rows={1}
                      />
                    )}
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="table-row-remove"
                    disabled={disabled}
                    title="Remove row"
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="table-add-button"
        disabled={disabled}
      >
        <Plus size={16} />
        Add Row
      </button>
    </div>
  )
}
