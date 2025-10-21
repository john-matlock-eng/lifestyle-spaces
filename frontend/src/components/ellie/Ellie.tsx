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
  variant?: 'default' | 'winter' | 'party' | 'workout' | 'balloon'
  className?: string
  tabIndex?: number
  // Customization props
  furColor?: string
  collarStyle?: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana'
  collarColor?: string
  collarTag?: boolean
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
  variant = 'default',
  className,
  tabIndex,
  furColor,
  collarStyle = 'none',
  collarColor = '#8B4513',
  collarTag = false
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
        left: `${position.x}px`,
        top: `${position.y}px`,
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
        variant={variant}
        furColor={furColor}
        collarStyle={collarStyle}
        collarColor={collarColor}
        collarTag={collarTag}
      />
    </div>
  )
}
