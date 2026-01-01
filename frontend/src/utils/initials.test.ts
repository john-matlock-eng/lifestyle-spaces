import { getInitials, getAvatarColor } from './initials'

describe('getInitials', () => {
  it('returns single initial for single word', () => {
    expect(getInitials('John')).toBe('J')
    expect(getInitials('daisy')).toBe('D')
  })

  it('returns two initials for two words', () => {
    expect(getInitials('Daisy Gray')).toBe('DG')
    expect(getInitials('John Smith')).toBe('JS')
  })

  it('returns first and last initials for 3+ words', () => {
    expect(getInitials('Watermelon Stitch')).toBe('WS')
    expect(getInitials('John Paul Smith')).toBe('JS')
    expect(getInitials('Mary Jane Watson Parker')).toBe('MP')
  })

  it('handles extra whitespace', () => {
    expect(getInitials('  Daisy   Gray  ')).toBe('DG')
    expect(getInitials('  John  ')).toBe('J')
  })

  it('returns ? for empty/null/undefined', () => {
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
  })

  it('uppercases initials', () => {
    expect(getInitials('daisy gray')).toBe('DG')
    expect(getInitials('john')).toBe('J')
  })
})

describe('getAvatarColor', () => {
  it('returns consistent color for same string', () => {
    const color1 = getAvatarColor('Daisy Gray')
    const color2 = getAvatarColor('Daisy Gray')
    expect(color1).toBe(color2)
  })

  it('returns a valid hex color', () => {
    const color = getAvatarColor('John Smith')
    expect(typeof color).toBe('string')
    expect(color.startsWith('#')).toBe(true)
    expect(color.length).toBe(7)
  })

  it('returns default color for null/undefined/empty', () => {
    expect(getAvatarColor(null)).toBe('#14b8a6')
    expect(getAvatarColor(undefined)).toBe('#14b8a6')
    expect(getAvatarColor('')).toBe('#14b8a6')
  })
})
