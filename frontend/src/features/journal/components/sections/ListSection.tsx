import React from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import '../../styles/sections.css'

interface ListItem {
  id: string
  text: string
}

interface ListSectionProps {
  value: ListItem[] | string
  onChange: (value: ListItem[]) => void
  placeholder?: string
  disabled?: boolean
}

export const ListSection: React.FC<ListSectionProps> = ({
  value,
  onChange,
  placeholder = "Add an item...",
  disabled = false
}) => {
  const items: ListItem[] = typeof value === 'string'
    ? (value ? value.split('\n').map(text => ({ id: uuidv4(), text })) : [])
    : value || []

  const addItem = () => {
    onChange([...items, { id: uuidv4(), text: '' }])
  }

  const updateItem = (id: string, text: string) => {
    onChange(items.map(item =>
      item.id === id ? { ...item, text } : item
    ))
  }

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id))
  }

  // Auto-add new item when typing in last empty item
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && index === items.length - 1 && items[index].text) {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="list-section">
      {items.map((item, index) => (
        <div key={item.id} className="list-item">
          <button
            type="button"
            className="list-item-drag"
            disabled={disabled}
            title="Drag to reorder (coming soon)"
          >
            <GripVertical size={14} />
          </button>

          <span className="list-item-bullet">•</span>

          <input
            type="text"
            value={item.text}
            onChange={(e) => updateItem(item.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={placeholder}
            className="list-item-input"
            disabled={disabled}
          />

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="list-item-remove"
            disabled={disabled}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="list-add-button"
        disabled={disabled}
      >
        <Plus size={16} />
        Add Item
      </button>
    </div>
  )
}
