// EmotionWheel.tsx - Interactive circular emotion wheel with zoom, pan, and hierarchical selection
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import {
  getCoreEmotions,
  getSecondaryEmotions,
  getTertiaryEmotions,
  getEmotionById,
  getEmotionEmoji,
  type Emotion,
} from '../data/emotionData'

interface EmotionWheelProps {
  selectedEmotions: string[]
  onEmotionToggle: (emotionId: string) => void
  className?: string
  hierarchicalSelection?: boolean
  progressiveReveal?: boolean
  onComplete?: () => void
}

const EmotionWheel: React.FC<EmotionWheelProps> = ({
  selectedEmotions = [],
  onEmotionToggle,
  className = '',
  hierarchicalSelection = true,
  progressiveReveal = true,
  onComplete,
}) => {
  // Ensure selectedEmotions is always an array
  const safeSelectedEmotions = Array.isArray(selectedEmotions) ? selectedEmotions : []

  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredEmotion, setHoveredEmotion] = useState<string | null>(null)
  const [wheelSize, setWheelSize] = useState(600)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    emotion: Emotion | null
  } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 })
  const currentHoveredEmotionRef = useRef<Emotion | null>(null)
  const hasDraggedRef = useRef(false)
  const clickStartTimeRef = useRef(0)
  const initialClickPosRef = useRef({ x: 0, y: 0 })
  const [focusedCoreEmotion, setFocusedCoreEmotion] = useState<string | null>(null)
  const [focusedSecondaryEmotion, setFocusedSecondaryEmotion] = useState<string | null>(null)
  const [showCompleteButton, setShowCompleteButton] = useState(false)

  // Reset zoom and pan to default
  const resetView = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setLastPanOffset({ x: 0, y: 0 })
  }

  // Handle emotion selection with hierarchical logic
  const handleEmotionSelect = (emotionId: string) => {
    // Don't select if we just finished dragging
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false
      return
    }

    const emotion = getEmotionById(emotionId)
    if (!emotion) return

    if (progressiveReveal) {
      // Progressive reveal mode
      if (emotion.level === 'core') {
        if (focusedCoreEmotion === emotionId) {
          // Clicking the same core emotion - unfocus and clear selections
          setFocusedCoreEmotion(null)
          setFocusedSecondaryEmotion(null)
          setShowCompleteButton(false)
          // Clear all selections for this core emotion
          const toRemove = safeSelectedEmotions.filter((id: string) => {
            const e = getEmotionById(id)
            return (
              e &&
              (e.id === emotionId ||
                e.parent === emotionId ||
                (e.parent && getEmotionById(e.parent)?.parent === emotionId))
            )
          })
          toRemove.forEach((id: string) => onEmotionToggle(id))
        } else {
          // Focus on this core emotion
          setFocusedCoreEmotion(emotionId)
          setFocusedSecondaryEmotion(null)
          setShowCompleteButton(false)
          if (!safeSelectedEmotions.includes(emotionId)) {
            onEmotionToggle(emotionId)
          }
        }
      } else if (emotion.level === 'secondary') {
        // Can only select if it's a child of the focused core emotion
        if (emotion.parent === focusedCoreEmotion) {
          if (focusedSecondaryEmotion === emotionId) {
            // Clicking the same secondary emotion - unfocus
            setFocusedSecondaryEmotion(null)
            setShowCompleteButton(false)
            // Clear tertiary selections for this secondary emotion
            const toRemove = safeSelectedEmotions.filter((id: string) => {
              const e = getEmotionById(id)
              return e && e.parent === emotionId
            })
            toRemove.forEach((id: string) => onEmotionToggle(id))
            // Also deselect this secondary emotion
            onEmotionToggle(emotionId)
          } else {
            // Focus on this secondary emotion
            setFocusedSecondaryEmotion(emotionId)
            setShowCompleteButton(false)
            if (!safeSelectedEmotions.includes(emotionId)) {
              onEmotionToggle(emotionId)
            }
          }
        }
      } else if (emotion.level === 'tertiary') {
        // Can only select if it's a child of the focused secondary emotion
        if (emotion.parent === focusedSecondaryEmotion) {
          onEmotionToggle(emotionId)
          // Show complete button when a tertiary is selected
          setShowCompleteButton(true)
        }
      }
    } else {
      // Standard selection mode
      if (safeSelectedEmotions.includes(emotionId)) {
        // Deselecting - just remove this emotion
        onEmotionToggle(emotionId)
      } else {
        // Selecting - check if we need to select parents
        if (hierarchicalSelection && emotion.parent) {
          // Get all parent emotions
          const parents: string[] = []
          let currentId: string | undefined = emotion.parent

          while (currentId) {
            if (!safeSelectedEmotions.includes(currentId)) {
              parents.push(currentId)
            }
            const parentEmotion = getEmotionById(currentId)
            currentId = parentEmotion?.parent
          }

          // Select parents first (in reverse order - from core to specific)
          parents.reverse().forEach((parentId) => {
            onEmotionToggle(parentId)
          })
        }

        // Then select the clicked emotion
        onEmotionToggle(emotionId)
      }
    }
  }

  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const maxSize = Math.min(containerWidth - 40, 800)
        setWheelSize(Math.max(500, maxSize))
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle escape key to reset view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        resetView()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const centerX = wheelSize / 2
  const centerY = wheelSize / 2
  const innerRadius = wheelSize * 0.12
  const middleRadius = wheelSize * 0.3
  const outerRadius = wheelSize * 0.48

  // Calculate path for a segment
  const createPath = (
    startAngle: number,
    endAngle: number,
    innerR: number,
    outerR: number
  ) => {
    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1 = centerX + innerR * Math.cos(startAngleRad)
    const y1 = centerY + innerR * Math.sin(startAngleRad)
    const x2 = centerX + outerR * Math.cos(startAngleRad)
    const y2 = centerY + outerR * Math.sin(startAngleRad)
    const x3 = centerX + outerR * Math.cos(endAngleRad)
    const y3 = centerY + outerR * Math.sin(endAngleRad)
    const x4 = centerX + innerR * Math.cos(endAngleRad)
    const y4 = centerY + innerR * Math.sin(endAngleRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1}
    `
  }

  // Calculate text position
  const getTextPosition = (
    startAngle: number,
    endAngle: number,
    radius: number,
    level: 'core' | 'secondary' | 'tertiary'
  ) => {
    const midAngle = (((startAngle + endAngle) / 2) * Math.PI) / 180
    const x = centerX + radius * Math.cos(midAngle)
    const y = centerY + radius * Math.sin(midAngle)
    const rotation = (startAngle + endAngle) / 2

    let textRotation = rotation
    let anchor: 'start' | 'middle' | 'end' | 'inherit' = 'middle'

    if (level !== 'core') {
      const normalizedRotation = (((rotation + 90) % 360) + 360) % 360
      if (normalizedRotation > 180) {
        textRotation = rotation + 180
        anchor = 'middle'
      }
    }

    const zoomScaleFactor = Math.min(Math.sqrt(zoomLevel), 1.5)
    const baseFontSizes = {
      core: wheelSize * 0.02,
      secondary: wheelSize * 0.016,
      tertiary: wheelSize * 0.013,
    }

    return {
      x,
      y,
      rotation: textRotation,
      anchor,
      fontSize: baseFontSizes[level] * zoomScaleFactor,
    }
  }

  // Handle mouse events for tooltip
  const handleMouseEnter = (e: React.MouseEvent, emotion: Emotion) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      currentHoveredEmotionRef.current = emotion
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        emotion,
      })
    }
    setHoveredEmotion(emotion.id)
  }

  const handleMouseMove = (e: React.MouseEvent, emotion: Emotion) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      if (currentHoveredEmotionRef.current?.id !== emotion.id) {
        currentHoveredEmotionRef.current = emotion
        setHoveredEmotion(emotion.id)
      }

      setTooltip({ x, y, emotion })
    }
  }

  const handleMouseLeave = () => {
    setTooltip(null)
    setHoveredEmotion(null)
    currentHoveredEmotionRef.current = null
  }

  // Pan handlers
  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    clickStartTimeRef.current = Date.now()
    hasDraggedRef.current = false
    initialClickPosRef.current = { x: clientX, y: clientY }

    if (zoomLevel <= 1) return

    setIsPanning(true)
    setDragStart({ x: clientX, y: clientY })
    setLastPanOffset({ ...panOffset })

    e.preventDefault()
  }

  const handlePanMove = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const moveDistance = Math.sqrt(
      Math.pow(clientX - initialClickPosRef.current.x, 2) +
        Math.pow(clientY - initialClickPosRef.current.y, 2)
    )

    if (moveDistance > 5) {
      hasDraggedRef.current = true
    }

    if (!isPanning || zoomLevel <= 1) return

    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y

    const maxPan = (wheelSize * (zoomLevel - 1)) / 2
    const newX = Math.max(-maxPan, Math.min(maxPan, lastPanOffset.x + deltaX))
    const newY = Math.max(-maxPan, Math.min(maxPan, lastPanOffset.y + deltaY))

    setPanOffset({ x: newX, y: newY })
  }

  const handlePanEnd = () => {
    setIsPanning(false)

    const clickDuration = Date.now() - clickStartTimeRef.current
    if (clickDuration < 200 && !hasDraggedRef.current) {
      hasDraggedRef.current = false
    }
  }

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: Event) => {
      const wheelEvent = e as WheelEvent
      if (!containerRef.current?.contains(e.target as Node)) return

      wheelEvent.preventDefault()
      const delta = wheelEvent.deltaY > 0 ? -0.1 : 0.1
      const newZoom = Math.max(0.8, Math.min(4, zoomLevel + delta))

      if (newZoom !== zoomLevel) {
        const scale = newZoom / zoomLevel
        setPanOffset((prev) => ({
          x: prev.x * scale,
          y: prev.y * scale,
        }))
        setLastPanOffset((prev) => ({
          x: prev.x * scale,
          y: prev.y * scale,
        }))
      }

      setZoomLevel(newZoom)
    },
    [zoomLevel]
  )

  // Add wheel event listener
  useEffect(() => {
    const element = containerRef.current?.querySelector('.emotion-wheel-zoom')
    if (!element) return

    element.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const coreEmotions = getCoreEmotions()
  const coreAngleSize = 360 / coreEmotions.length

  // Check if any tertiary emotion is selected
  const hasTertiarySelected = safeSelectedEmotions.some((id: string) => {
    const emotion = getEmotionById(id)
    return emotion?.level === 'tertiary'
  })

  // Update complete button visibility
  useEffect(() => {
    setShowCompleteButton(progressiveReveal && hasTertiarySelected)
  }, [progressiveReveal, hasTertiarySelected])

  return (
    <div
      ref={containerRef}
      className={`emotion-wheel-container ${className}`}
      data-empty={safeSelectedEmotions.length === 0}
    >
      {/* Progress indicator - moved to top */}
      {progressiveReveal && focusedCoreEmotion && (
        <div className="emotion-progress">
          <span>Selection progress:</span>
          <div className="emotion-progress-steps">
            <span className="step active">1. Core</span>
            <span>→</span>
            <span className={`step ${focusedSecondaryEmotion ? 'active' : ''}`}>2. Secondary</span>
            <span>→</span>
            <span className={`step ${showCompleteButton ? 'active' : ''}`}>3. Specific</span>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="emotion-wheel-zoom-controls">
        <button
          onClick={() => {
            const newZoom = Math.min(zoomLevel + 0.2, 4)
            setZoomLevel(newZoom)
          }}
          disabled={zoomLevel >= 4}
          title="Zoom in"
        >
          <ZoomIn />
        </button>
        <button
          onClick={() => {
            const newZoom = Math.max(zoomLevel - 0.2, 0.8)
            setZoomLevel(newZoom)
            if (newZoom < zoomLevel) {
              const scale = newZoom / zoomLevel
              setPanOffset({
                x: panOffset.x * scale,
                y: panOffset.y * scale,
              })
              setLastPanOffset({
                x: panOffset.x * scale,
                y: panOffset.y * scale,
              })
            }
          }}
          disabled={zoomLevel <= 0.8}
          title="Zoom out"
        >
          <ZoomOut />
        </button>
        <button
          onClick={resetView}
          disabled={zoomLevel === 1 && panOffset.x === 0 && panOffset.y === 0}
          title="Reset view"
        >
          <RotateCcw />
        </button>
      </div>

      {/* SVG Container with zoom and pan */}
      <div
        className="emotion-wheel-zoom"
        style={{
          width: wheelSize,
          height: wheelSize,
          cursor: zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center',
            transition: isPanning ? 'none' : 'transform 0.2s ease-in-out',
            width: '100%',
            height: '100%',
          }}
        >
          <svg
            ref={svgRef}
            width={wheelSize}
            height={wheelSize}
            className="emotion-wheel-svg"
          >
            {/* Instructions */}
            {zoomLevel <= 1.2 && (
              <g>
                <rect
                  x={centerX - innerRadius * 0.8}
                  y={centerY - 12}
                  width={innerRadius * 1.6}
                  height={24}
                  fill="var(--color-background, #ffffff)"
                  opacity="0.9"
                  rx="4"
                />
                <text
                  x={centerX}
                  y={centerY + 2}
                  textAnchor="middle"
                  className="emotion-wheel-hint"
                  style={{ userSelect: 'none', fontSize: '12px' }}
                >
                  {!focusedCoreEmotion
                    ? safeSelectedEmotions.length === 0
                      ? 'Select core emotion'
                      : 'Select core to continue'
                    : !focusedSecondaryEmotion
                      ? 'Select specific emotion'
                      : 'Select final emotion'}
                </text>
              </g>
            )}

            {/* Core emotions */}
            {coreEmotions.map((emotion, index) => {
              const startAngle = index * coreAngleSize - 90
              const endAngle = (index + 1) * coreAngleSize - 90
              const isSelected = safeSelectedEmotions.includes(emotion.id)
              const isHovered = hoveredEmotion === emotion.id
              const textPos = getTextPosition(startAngle, endAngle, innerRadius * 0.6, 'core')

              return (
                <g key={emotion.id}>
                  <path
                    d={createPath(startAngle, endAngle, 0, innerRadius)}
                    fill={emotion.color}
                    stroke="var(--color-background, #ffffff)"
                    strokeWidth="2"
                    opacity={
                      isSelected
                        ? 1
                        : isHovered
                          ? 0.9
                          : progressiveReveal && focusedCoreEmotion && focusedCoreEmotion !== emotion.id
                            ? 0.3
                            : 0.8
                    }
                    onClick={() => handleEmotionSelect(emotion.id)}
                    onMouseEnter={(e) => handleMouseEnter(e, emotion)}
                    onMouseMove={(e) => handleMouseMove(e, emotion)}
                    onMouseLeave={handleMouseLeave}
                    className="emotion-segment"
                    style={{
                      cursor: 'pointer',
                      filter: isSelected ? 'brightness(1.1)' : 'none',
                    }}
                  />
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                    textAnchor={textPos.anchor}
                    dominantBaseline="middle"
                    className="emotion-text-core"
                    style={{
                      fontSize: `${textPos.fontSize}px`,
                      fill: 'white',
                      fontWeight: 'bold',
                      pointerEvents: 'none',
                    }}
                  >
                    {emotion.label}
                  </text>
                </g>
              )
            })}

            {/* Secondary emotions */}
            {coreEmotions.map((coreEmotion, coreIndex) => {
              if (progressiveReveal && focusedCoreEmotion !== coreEmotion.id) {
                return null
              }

              const secondaryEmotions = getSecondaryEmotions(coreEmotion.id)
              const coreStartAngle = coreIndex * coreAngleSize - 90
              const secondaryAngleSize = coreAngleSize / secondaryEmotions.length

              return secondaryEmotions.map((emotion, secIndex) => {
                const startAngle = coreStartAngle + secIndex * secondaryAngleSize
                const endAngle = startAngle + secondaryAngleSize
                const isSelected = safeSelectedEmotions.includes(emotion.id)
                const isHovered = hoveredEmotion === emotion.id
                const textPos = getTextPosition(
                  startAngle,
                  endAngle,
                  (innerRadius + middleRadius) / 2,
                  'secondary'
                )

                return (
                  <g key={emotion.id}>
                    <path
                      d={createPath(startAngle, endAngle, innerRadius, middleRadius)}
                      fill={emotion.color}
                      stroke="var(--color-background, #ffffff)"
                      strokeWidth="1.5"
                      opacity={
                        isSelected
                          ? 1
                          : isHovered
                            ? 0.85
                            : progressiveReveal &&
                                focusedSecondaryEmotion &&
                                focusedSecondaryEmotion !== emotion.id
                              ? 0.3
                              : 0.7
                      }
                      onClick={() => handleEmotionSelect(emotion.id)}
                      onMouseEnter={(e) => handleMouseEnter(e, emotion)}
                      onMouseMove={(e) => handleMouseMove(e, emotion)}
                      onMouseLeave={handleMouseLeave}
                      className="emotion-segment"
                      style={{
                        cursor: 'pointer',
                        filter: isSelected ? 'brightness(1.1)' : 'none',
                      }}
                    />
                    <text
                      x={textPos.x}
                      y={textPos.y}
                      transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                      textAnchor={textPos.anchor}
                      dominantBaseline="middle"
                      className="emotion-text-secondary"
                      style={{
                        fontSize: `${textPos.fontSize}px`,
                        fill: isSelected ? '#1a1a1a' : 'white',
                        fontWeight: isHovered || isSelected ? '600' : '500',
                        pointerEvents: 'none',
                      }}
                    >
                      {emotion.label}
                    </text>
                  </g>
                )
              })
            })}

            {/* Tertiary emotions */}
            {coreEmotions.map((coreEmotion, coreIndex) => {
              if (progressiveReveal && focusedCoreEmotion !== coreEmotion.id) {
                return null
              }

              const secondaryEmotions = getSecondaryEmotions(coreEmotion.id)
              const coreStartAngle = coreIndex * coreAngleSize - 90
              const secondaryAngleSize = coreAngleSize / secondaryEmotions.length

              return secondaryEmotions.map((secEmotion, secIndex) => {
                if (progressiveReveal && focusedSecondaryEmotion !== secEmotion.id) {
                  return null
                }

                const tertiaryEmotions = getTertiaryEmotions(secEmotion.id)
                if (tertiaryEmotions.length === 0) return null

                const secStartAngle = coreStartAngle + secIndex * secondaryAngleSize
                const tertiaryAngleSize = secondaryAngleSize / tertiaryEmotions.length

                return tertiaryEmotions.map((emotion, terIndex) => {
                  const startAngle = secStartAngle + terIndex * tertiaryAngleSize
                  const endAngle = startAngle + tertiaryAngleSize
                  const isSelected = safeSelectedEmotions.includes(emotion.id)
                  const isHovered = hoveredEmotion === emotion.id
                  const textPos = getTextPosition(
                    startAngle,
                    endAngle,
                    (middleRadius + outerRadius) / 2,
                    'tertiary'
                  )

                  return (
                    <g key={emotion.id}>
                      <path
                        d={createPath(startAngle, endAngle, middleRadius, outerRadius)}
                        fill={emotion.color}
                        stroke="var(--color-background, #ffffff)"
                        strokeWidth="1"
                        opacity={isSelected ? 1 : isHovered ? 0.8 : 0.6}
                        onClick={() => handleEmotionSelect(emotion.id)}
                        onMouseEnter={(e) => handleMouseEnter(e, emotion)}
                        onMouseMove={(e) => handleMouseMove(e, emotion)}
                        onMouseLeave={handleMouseLeave}
                        className="emotion-segment"
                        style={{
                          cursor: 'pointer',
                          filter: isSelected ? 'brightness(1.1)' : 'none',
                        }}
                      />
                      <text
                        x={textPos.x}
                        y={textPos.y}
                        transform={`rotate(${textPos.rotation}, ${textPos.x}, ${textPos.y})`}
                        textAnchor={textPos.anchor}
                        dominantBaseline="middle"
                        className="emotion-text-tertiary"
                        style={{
                          fontSize: `${textPos.fontSize}px`,
                          // Progressive opacity based on state
                          opacity: (() => {
                            if (isSelected) return 1
                            if (isHovered) return 0.9
                            if (zoomLevel > 1.5) return 0.8
                            if (zoomLevel > 1.1) return 0.7
                            return 0.5 // Always at least 50% visible
                          })(),
                          // Dynamic fill for better contrast
                          fill: (() => {
                            if (isSelected) return '#ffffff'
                            if (isHovered) return '#f8f8f8'
                            return '#e0e0e0' // Slightly gray when inactive
                          })(),
                          fontWeight: isSelected ? '600' : isHovered ? '500' : '400',
                          pointerEvents: 'none',
                          // Add text shadow for better readability
                          textShadow: isHovered || isSelected
                            ? '0 1px 3px rgba(0, 0, 0, 0.6)'
                            : '0 1px 2px rgba(0, 0, 0, 0.4)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {emotion.label}
                      </text>
                    </g>
                  )
                })
              })
            })}
          </svg>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && tooltip.emotion && (
        <div
          className="emotion-tooltip"
          style={{
            position: 'absolute',
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y - 35}px`,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getEmotionEmoji(tooltip.emotion.id)}</span>
            <span>{tooltip.emotion.label}</span>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            Click to {safeSelectedEmotions.includes(tooltip.emotion.id) ? 'deselect' : 'select'}
          </div>
        </div>
      )}

      {/* Complete/Add Another buttons */}
      {progressiveReveal && showCompleteButton && (
        <div className="emotion-complete-buttons">
          <button
            onClick={() => {
              if (onComplete) onComplete()
              setFocusedCoreEmotion(null)
              setFocusedSecondaryEmotion(null)
              setShowCompleteButton(false)
            }}
            className="emotion-btn-complete"
          >
            Complete Selection
          </button>
          <button
            onClick={() => {
              setFocusedCoreEmotion(null)
              setFocusedSecondaryEmotion(null)
              setShowCompleteButton(false)
            }}
            className="emotion-btn-add"
          >
            Add Another Emotion
          </button>
        </div>
      )}
    </div>
  )
}

export default EmotionWheel
