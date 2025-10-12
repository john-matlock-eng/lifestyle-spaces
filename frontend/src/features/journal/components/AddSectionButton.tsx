import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, FileText, HelpCircle, List, CheckSquare, BarChart } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface AddSectionButtonProps {
  onAddSection: (section: {
    id: string
    title: string
    type: string
    content: any
    config?: any
  }) => void
  disabled?: boolean
  currentSectionCount?: number
  maxSections?: number
}

export const AddSectionButton: React.FC<AddSectionButtonProps> = ({
  onAddSection,
  disabled = false,
  currentSectionCount = 0,
  maxSections = 15
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const sectionTypes = [
    {
      type: 'paragraph',
      label: 'Text Section',
      icon: <FileText size={18} />,
      description: 'Free-form writing',
      defaultTitle: 'Additional Notes',
      defaultContent: ''
    },
    {
      type: 'q_and_a',
      label: 'Q&A Section',
      icon: <HelpCircle size={18} />,
      description: 'Question & answer pairs',
      defaultTitle: 'Questions & Answers',
      defaultContent: [],
      config: {
        min_pairs: 1,
        max_pairs: 10,
        suggested_questions: []
      }
    },
    {
      type: 'list',
      label: 'List',
      icon: <List size={18} />,
      description: 'Bullet points',
      defaultTitle: 'List Items',
      defaultContent: []
    },
    {
      type: 'checkbox',
      label: 'Checklist',
      icon: <CheckSquare size={18} />,
      description: 'Actionable items',
      defaultTitle: 'Action Items',
      defaultContent: []
    },
    {
      type: 'scale',
      label: 'Rating Scale',
      icon: <BarChart size={18} />,
      description: '1-10 rating',
      defaultTitle: 'Rating',
      defaultContent: 5,
      config: {
        min: 1,
        max: 10,
        labels: { 1: 'Lowest', 10: 'Highest' }
      }
    }
  ]

  const handleAddSection = (sectionType: typeof sectionTypes[0]) => {
    const newSection = {
      id: `custom_${uuidv4().substring(0, 8)}`,
      title: sectionType.defaultTitle,
      type: sectionType.type,
      content: sectionType.defaultContent,
      config: sectionType.config
    }

    onAddSection(newSection)
    setShowMenu(false)
  }

  if (currentSectionCount >= maxSections) {
    return null
  }

  return (
    <div className="add-section-container">
      {!showMenu ? (
        <button
          type="button"
          className="add-section-button"
          onClick={() => setShowMenu(true)}
          disabled={disabled}
        >
          <Plus size={18} />
          Add Custom Section
        </button>
      ) : (
        <div ref={menuRef} className="section-type-menu">
          <div className="section-type-header">
            <h4>Choose Section Type</h4>
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="close-menu-btn"
            >
              <X size={18} />
            </button>
          </div>

          <div className="section-type-list">
            {sectionTypes.map(sectionType => (
              <button
                key={sectionType.type}
                type="button"
                className="section-type-option"
                onClick={() => handleAddSection(sectionType)}
                disabled={disabled}
              >
                <div className="section-type-icon">
                  {sectionType.icon}
                </div>
                <div className="section-type-info">
                  <div className="section-type-label">{sectionType.label}</div>
                  <div className="section-type-description">{sectionType.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
