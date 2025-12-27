/**
 * Hook for handling emoji input with : trigger
 *
 * Detects when user types `:` and manages emoji picker state.
 * Also converts :emoji_code: syntax to actual emoji.
 */

import { useState, useCallback, useRef } from 'react'

// Picker dimensions
const PICKER_WIDTH = 320
const PICKER_HEIGHT = 400

/**
 * Calculate picker position that stays within viewport bounds
 */
export function calculatePickerPosition(
  anchorRect: DOMRect,
  preferAbove: boolean = true
): { top: number; left: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const scrollY = window.scrollY
  const scrollX = window.scrollX
  const padding = 10 // Minimum distance from viewport edge

  let top: number
  let left: number

  // Calculate horizontal position - try to align with anchor, but keep within bounds
  left = anchorRect.left + scrollX
  if (left + PICKER_WIDTH > viewportWidth - padding) {
    // Would overflow right, align to right edge
    left = Math.max(padding, viewportWidth - PICKER_WIDTH - padding)
  }
  if (left < padding) {
    left = padding
  }

  // Calculate vertical position
  const spaceAbove = anchorRect.top
  const spaceBelow = viewportHeight - anchorRect.bottom

  if (preferAbove && spaceAbove >= PICKER_HEIGHT + padding) {
    // Enough space above, position above the anchor
    top = anchorRect.top + scrollY - PICKER_HEIGHT - padding
  } else if (spaceBelow >= PICKER_HEIGHT + padding) {
    // Position below the anchor
    top = anchorRect.bottom + scrollY + padding
  } else if (spaceAbove > spaceBelow) {
    // Not enough space either way, but more above - position at top of viewport
    top = scrollY + padding
  } else {
    // More space below - position to fit
    top = scrollY + viewportHeight - PICKER_HEIGHT - padding
  }

  // Ensure top is not negative
  top = Math.max(scrollY + padding, top)

  return { top, left }
}

// Common emoji shortcodes mapping
const EMOJI_SHORTCODES: Record<string, string> = {
  // Smileys
  ':smile:': '😊',
  ':grin:': '😀',
  ':joy:': '😂',
  ':rofl:': '🤣',
  ':wink:': '😉',
  ':blush:': '😊',
  ':heart_eyes:': '😍',
  ':kissing_heart:': '😘',
  ':thinking:': '🤔',
  ':neutral:': '😐',
  ':unamused:': '😒',
  ':rolling_eyes:': '🙄',
  ':grimacing:': '😬',
  ':relieved:': '😌',
  ':pensive:': '😔',
  ':sleepy:': '😪',
  ':sleeping:': '😴',
  ':sunglasses:': '😎',
  ':nerd:': '🤓',
  ':confused:': '😕',
  ':worried:': '😟',
  ':sob:': '😭',
  ':cry:': '😢',
  ':angry:': '😠',
  ':rage:': '😡',

  // Gestures
  ':thumbsup:': '👍',
  ':thumbs_up:': '👍',
  ':+1:': '👍',
  ':thumbsdown:': '👎',
  ':thumbs_down:': '👎',
  ':-1:': '👎',
  ':clap:': '👏',
  ':pray:': '🙏',
  ':wave:': '👋',
  ':ok_hand:': '👌',
  ':v:': '✌️',
  ':muscle:': '💪',
  ':raised_hands:': '🙌',
  ':fist:': '✊',

  // Hearts
  ':heart:': '❤️',
  ':red_heart:': '❤️',
  ':orange_heart:': '🧡',
  ':yellow_heart:': '💛',
  ':green_heart:': '💚',
  ':blue_heart:': '💙',
  ':purple_heart:': '💜',
  ':black_heart:': '🖤',
  ':white_heart:': '🤍',
  ':broken_heart:': '💔',
  ':sparkling_heart:': '💖',
  ':two_hearts:': '💕',

  // Symbols
  ':star:': '⭐',
  ':star2:': '🌟',
  ':sparkles:': '✨',
  ':zap:': '⚡',
  ':fire:': '🔥',
  ':100:': '💯',
  ':check:': '✅',
  ':white_check_mark:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':question:': '❓',
  ':exclamation:': '❗',
  ':bulb:': '💡',
  ':gift:': '🎁',
  ':bell:': '🔔',
  ':rocket:': '🚀',
  ':trophy:': '🏆',
  ':crown:': '👑',
  ':gem:': '💎',
  ':tada:': '🎉',
  ':confetti_ball:': '🎊',
  ':balloon:': '🎈',
  ':party_popper:': '🎉',

  // Nature
  ':sun:': '☀️',
  ':moon:': '🌙',
  ':cloud:': '☁️',
  ':rainbow:': '🌈',
  ':umbrella:': '☂️',
  ':snowflake:': '❄️',
  ':flower:': '🌸',
  ':rose:': '🌹',
  ':sunflower:': '🌻',
  ':tree:': '🌲',
  ':ocean:': '🌊',

  // Animals
  ':dog:': '🐕',
  ':cat:': '🐱',
  ':rabbit:': '🐰',
  ':bear:': '🐻',
  ':panda:': '🐼',
  ':tiger:': '🐯',
  ':lion:': '🦁',
  ':unicorn:': '🦄',
  ':butterfly:': '🦋',
  ':bee:': '🐝',

  // Food & Drink
  ':coffee:': '☕',
  ':tea:': '🍵',
  ':beer:': '🍺',
  ':wine:': '🍷',
  ':pizza:': '🍕',
  ':hamburger:': '🍔',
  ':taco:': '🌮',
  ':cookie:': '🍪',
  ':cake:': '🎂',
  ':ice_cream:': '🍨',
  ':apple:': '🍎',
  ':banana:': '🍌',
  ':avocado:': '🥑',

  // Activities
  ':soccer:': '⚽',
  ':basketball:': '🏀',
  ':football:': '🏈',
  ':music:': '🎵',
  ':art:': '🎨',
  ':movie:': '🎬',
  ':video_game:': '🎮',
  ':books:': '📚',
  ':book:': '📖',
  ':pencil:': '✏️',
  ':memo:': '📝',
}

interface UseEmojiInputOptions {
  // colonPosition is the index of the ':' to replace, or undefined if just appending
  onInsertEmoji: (emoji: string, colonPosition?: number) => void
}

interface UseEmojiInputReturn {
  isPickerOpen: boolean
  openPicker: () => void
  closePicker: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  convertShortcodes: (value: string) => string
  checkForColonTrigger: (
    text: string,
    cursorPos: number,
    textareaRect: DOMRect
  ) => void
  insertEmoji: (emoji: string) => void
  pickerPosition: { top: number; left: number } | undefined
  setPickerPosition: (pos: { top: number; left: number } | undefined) => void
}

export function useEmojiInput({
  onInsertEmoji,
}: UseEmojiInputOptions): UseEmojiInputReturn {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<
    { top: number; left: number } | undefined
  >()
  const colonPosRef = useRef<number | null>(null)

  const openPicker = useCallback(() => {
    setIsPickerOpen(true)
  }, [])

  const closePicker = useCallback(() => {
    setIsPickerOpen(false)
    colonPosRef.current = null
  }, [])

  const insertEmoji = useCallback(
    (emoji: string) => {
      // If picker was opened via colon trigger, pass the position to replace
      const colonPos = colonPosRef.current
      onInsertEmoji(emoji, colonPos !== null ? colonPos : undefined)
      closePicker()
    },
    [onInsertEmoji, closePicker]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Close picker on Escape
      if (e.key === 'Escape' && isPickerOpen) {
        closePicker()
        e.preventDefault()
      }
    },
    [isPickerOpen, closePicker]
  )

  // Check if user just typed : to trigger emoji picker
  const checkForColonTrigger = useCallback(
    (text: string, cursorPos: number, textareaRect: DOMRect) => {
      // Check if the character just typed was a colon
      const charBeforeCursor = text.charAt(cursorPos - 1)

      if (charBeforeCursor === ':') {
        // Check if this is a standalone colon (not part of a shortcode being typed)
        // Only trigger if it's at start or after a space/newline
        const charBeforeColon = cursorPos > 1 ? text.charAt(cursorPos - 2) : ''
        if (
          charBeforeColon === '' ||
          charBeforeColon === ' ' ||
          charBeforeColon === '\n'
        ) {
          colonPosRef.current = cursorPos - 1
          // Position picker with viewport bounds checking
          const position = calculatePickerPosition(textareaRect, true)
          setPickerPosition(position)
          openPicker()
        }
      }
    },
    [openPicker, setPickerPosition]
  )

  // Convert :shortcode: to emoji
  const convertShortcodes = useCallback((value: string): string => {
    let result = value

    // Find and replace :shortcode: patterns
    const shortcodePattern = /:[a-z0-9_+-]+:/gi
    const matches = value.match(shortcodePattern)

    if (matches) {
      matches.forEach((match) => {
        const lowerMatch = match.toLowerCase()
        const emoji = EMOJI_SHORTCODES[lowerMatch]
        if (emoji) {
          result = result.replace(match, emoji)
        }
      })
    }

    return result
  }, [])

  return {
    isPickerOpen,
    openPicker,
    closePicker,
    handleKeyDown,
    convertShortcodes,
    checkForColonTrigger,
    insertEmoji,
    pickerPosition,
    setPickerPosition,
  }
}
