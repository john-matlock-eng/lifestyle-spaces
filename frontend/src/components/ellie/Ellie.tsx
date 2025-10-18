import React from 'react'
import { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu'

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
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon' // Deprecated - no longer used
  className?: string
  tabIndex?: number
  // Customization props
  furColor?: string
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana'
  collarColor?: string
  collarTag?: boolean // Deprecated - tag is shown automatically based on collar style
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant: _variant, // Accept but ignore - deprecated
  className,
  tabIndex,
  furColor,
  collarStyle = 'none',
  collarColor = '#8B4513',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  collarTag: _collarTag // Accept but ignore - tag shown automatically
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
      className={className}
      tabIndex={tabIndex}
      style={{
        position: 'fixed',
        zIndex: 9999,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) {
          onClick()
        }
      }}
    >
      <ModularEnhancedShihTzu
        mood={mood}
        position={position}
        onPositionChange={onPositionChange}
        onClick={onClick}
        onPet={onPet}
        size={size}
        showThoughtBubble={showThoughtBubble}
        thoughtText={thoughtText}
        particleEffect={particleEffect}
        furColor={furColor}
        collarStyle={collarStyle}
        collarColor={collarColor}
      />
    </div>
  )
}
