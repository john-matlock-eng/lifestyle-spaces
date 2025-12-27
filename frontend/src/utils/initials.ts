/**
 * Utility functions for generating user initials and avatar colors
 */

/**
 * Generate initials from a display name.
 *
 * Rules:
 * - Single word: First letter (e.g., "John" → "J")
 * - Two words: First letter of each (e.g., "Daisy Gray" → "DG")
 * - Three+ words: First and last initials (e.g., "John Paul Smith" → "JS")
 * - Max 2 characters
 *
 * @param name - Display name or username
 * @returns 1-2 character initials, uppercase
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return '?'
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return '?'
  }

  // Split by spaces and filter empty strings
  const words = trimmed.split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return '?'
  }

  if (words.length === 1) {
    // Single word - return first character
    return words[0].charAt(0).toUpperCase()
  }

  // Multiple words - first letter of first and last word
  const firstInitial = words[0].charAt(0).toUpperCase()
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase()

  return `${firstInitial}${lastInitial}`
}

/**
 * Generate a consistent color based on a string (name/id).
 * Useful for avatar background colors.
 */
export function getAvatarColor(str: string | null | undefined): string {
  const colors = [
    '#14b8a6', // teal
    '#a855f7', // purple
    '#ec4899', // pink
    '#10b981', // green
    '#0ea5e9', // blue
    '#f59e0b', // yellow/amber
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#f43f5e', // rose
    '#06b6d4', // cyan
  ]

  if (!str) {
    return colors[0]
  }

  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}
