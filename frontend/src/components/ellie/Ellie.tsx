import React from 'react'
import EnhancedShihTzu from './EnhancedShihTzu'

export interface EllieProps {
  mood?: 'idle' | 'happy' | 'excited' | 'curious' | 'playful' | 'sleeping' | 'walking' | 'concerned' | 'proud' | 'zen' | 'celebrating'
  position?: { x: number; y: number }
  onPositionChange?: (position: { x: number; y: number }) => void
  onClick?: () => void
  onPet?: () => void
  size?: 'sm' | 'md' | 'lg'
  showThoughtBubble?: boolean
  thoughtText?: string
  particleEffect?: 'hearts' | 'sparkles' | 'treats' | 'zzz' | null
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon'
  className?: string
  style?: React.CSSProperties
  tabIndex?: number
}

export const Ellie: React.FC<EllieProps> = ({
  mood = 'idle',
  position = { x: 100, y: 100 },
  onPositionChange,
  onClick,
  onPet,
  size = 'md',
  showThoughtBubble = false,
  thoughtText = '',
  particleEffect = null,
  variant = 'balloon',
  className = '',
  style = {},
  tabIndex
}) => {
  // Generate ARIA label based on mood
  const getAriaLabel = () => {
    if (mood && mood !== 'idle') {
      return `Ellie the wellness companion is ${mood}`
    }
    return 'Ellie the wellness companion'
  }

  return (
    <div
      role="img"
      aria-label={getAriaLabel()}
      tabIndex={tabIndex}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) {
          onClick()
        }
      }}
    >
      <EnhancedShihTzu
        mood={mood}
        position={position}
        onPositionChange={onPositionChange}
        onClick={onClick}
        onPet={onPet}
        size={size}
        accessories={[]}
        showThoughtBubble={showThoughtBubble}
        thoughtText={thoughtText}
        particleEffect={particleEffect}
        variant={variant}
        className={className}
        style={{
          position: 'fixed',
          zIndex: 9999,
          ...style
        }}
      />
    </div>
  )
}
