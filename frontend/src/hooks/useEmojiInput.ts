/**
 * Hook for handling emoji input with : trigger
 *
 * Detects when user types `:` and manages emoji picker state.
 * Also converts :emoji_code: syntax to actual emoji.
 */

import { useState, useCallback, useRef } from 'react'

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
  onInsertEmoji: (emoji: string) => void
}

interface UseEmojiInputReturn {
  isPickerOpen: boolean
  openPicker: () => void
  closePicker: () => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  convertShortcodes: (value: string) => string
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
      onInsertEmoji(emoji)
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

  // Convert :shortcode: to emoji
  const convertShortcodes = useCallback((value: string): string => {
    let result = value

    // Find and replace :shortcode: patterns
    const shortcodePattern = /:[a-z0-9_+-]+:/gi
    const matches = value.match(shortcodePattern)

    if (matches) {
      matches.forEach((match) => {
        const lowerMatch = match.toLowerCase()
        if (EMOJI_SHORTCODES[lowerMatch]) {
          result = result.replace(match, EMOJI_SHORTCODES[lowerMatch])
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
    insertEmoji,
    pickerPosition,
    setPickerPosition,
  }
}
