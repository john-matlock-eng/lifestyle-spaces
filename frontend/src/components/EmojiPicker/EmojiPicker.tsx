/**
 * Emoji Picker Component
 *
 * A searchable emoji picker that can be triggered by typing `:` or clicking a button.
 * Uses emoji-picker-react for the picker UI.
 */

import React, { useEffect, useRef } from 'react'
import EmojiPickerReact, { Theme } from 'emoji-picker-react'
import type { EmojiClickData } from 'emoji-picker-react'
import './EmojiPicker.css'

interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (emoji: string) => void
  position?: { top: number; left: number }
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  position,
}) => {
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      // Delay adding listener to prevent immediate close
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji)
    onClose()
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      ref={pickerRef}
      className="emoji-picker-container"
      style={
        position
          ? {
              position: 'absolute',
              top: position.top,
              left: position.left,
              zIndex: 1000,
            }
          : undefined
      }
    >
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={Theme.DARK}
        searchPlaceHolder="Search emoji..."
        width={320}
        height={400}
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
        lazyLoadEmojis
      />
    </div>
  )
}
