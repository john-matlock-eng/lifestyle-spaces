/**
 * Binding Transforms
 *
 * Built-in transform functions for data bindings.
 * Transforms can modify values during binding resolution.
 *
 * @module transforms
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Transform function signature
 */
export type TransformFunction = (value: unknown, args?: Record<string, unknown>) => unknown

/**
 * Transform definition with metadata
 */
export interface TransformDefinition {
  /** Transform function */
  fn: TransformFunction
  /** Human-readable description */
  description: string
  /** Expected input type */
  inputType: 'any' | 'array' | 'string' | 'number' | 'object'
  /** Output type */
  outputType: 'any' | 'array' | 'string' | 'number' | 'object' | 'boolean'
  /** Optional arguments schema */
  args?: Record<string, { type: string; description: string; required?: boolean }>
}

// ============================================================================
// BUILT-IN TRANSFORMS
// ============================================================================

/**
 * Get the first item from an array
 */
const first: TransformFunction = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value[0]
  }
  return undefined
}

/**
 * Get the last item from an array
 */
const last: TransformFunction = (value) => {
  if (Array.isArray(value) && value.length > 0) {
    return value[value.length - 1]
  }
  return undefined
}

/**
 * Get the count/length of an array or string
 */
const count: TransformFunction = (value) => {
  if (Array.isArray(value)) {
    return value.length
  }
  if (typeof value === 'string') {
    return value.length
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length
  }
  return 0
}

/**
 * Join array items into a string
 */
const join: TransformFunction = (value, args) => {
  if (!Array.isArray(value)) {
    return value
  }
  const separator = typeof args?.separator === 'string' ? args.separator : ', '
  return value.filter((v) => v != null).join(separator)
}

/**
 * Split a string into an array
 */
const split: TransformFunction = (value, args) => {
  if (typeof value !== 'string') {
    return [value]
  }
  const separator = typeof args?.separator === 'string' ? args.separator : ','
  return value.split(separator).map((s) => s.trim())
}

/**
 * Convert to uppercase
 */
const uppercase: TransformFunction = (value) => {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

/**
 * Convert to lowercase
 */
const lowercase: TransformFunction = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase()
  }
  return value
}

/**
 * Trim whitespace
 */
const trim: TransformFunction = (value) => {
  if (typeof value === 'string') {
    return value.trim()
  }
  return value
}

/**
 * Get a substring or slice
 */
const slice: TransformFunction = (value, args) => {
  const start = typeof args?.start === 'number' ? args.start : 0
  const end = typeof args?.end === 'number' ? args.end : undefined

  if (typeof value === 'string') {
    return value.slice(start, end)
  }
  if (Array.isArray(value)) {
    return value.slice(start, end)
  }
  return value
}

/**
 * Flatten nested arrays
 */
const flatten: TransformFunction = (value, args) => {
  if (!Array.isArray(value)) {
    return [value]
  }
  const depth = typeof args?.depth === 'number' ? args.depth : 1
  return value.flat(depth)
}

/**
 * Get unique values from array
 */
const unique: TransformFunction = (value) => {
  if (!Array.isArray(value)) {
    return [value]
  }
  // For primitive values
  if (value.every((v) => typeof v !== 'object' || v === null)) {
    return [...new Set(value)]
  }
  // For objects, use JSON stringify for comparison
  const seen = new Set<string>()
  return value.filter((item) => {
    const key = JSON.stringify(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Filter array by a condition
 */
const filter: TransformFunction = (value, args) => {
  if (!Array.isArray(value)) {
    return value
  }

  const field = args?.field as string | undefined
  const equals = args?.equals
  const notEquals = args?.notEquals
  const contains = args?.contains as string | undefined

  return value.filter((item) => {
    let target = item
    if (field && typeof item === 'object' && item !== null) {
      target = (item as Record<string, unknown>)[field]
    }

    if (equals !== undefined) {
      return target === equals
    }
    if (notEquals !== undefined) {
      return target !== notEquals
    }
    if (contains !== undefined && typeof target === 'string') {
      return target.includes(contains)
    }

    // Default: filter out null/undefined
    return target != null
  })
}

/**
 * Map array to extract a field
 */
const pluck: TransformFunction = (value, args) => {
  if (!Array.isArray(value)) {
    return value
  }

  const field = args?.field as string | undefined
  if (!field) return value

  return value.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return (item as Record<string, unknown>)[field]
    }
    return undefined
  })
}

/**
 * Sort array
 */
const sort: TransformFunction = (value, args) => {
  if (!Array.isArray(value)) {
    return value
  }

  const field = args?.field as string | undefined
  const order = args?.order === 'desc' ? -1 : 1

  return [...value].sort((a, b) => {
    let aVal = a
    let bVal = b

    if (field && typeof a === 'object' && a !== null) {
      aVal = (a as Record<string, unknown>)[field]
    }
    if (field && typeof b === 'object' && b !== null) {
      bVal = (b as Record<string, unknown>)[field]
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * order
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * order
    }
    return 0
  })
}

/**
 * Reverse array or string
 */
const reverse: TransformFunction = (value) => {
  if (Array.isArray(value)) {
    return [...value].reverse()
  }
  if (typeof value === 'string') {
    return value.split('').reverse().join('')
  }
  return value
}

/**
 * Convert to number
 */
const toNumber: TransformFunction = (value) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  if (typeof value === 'boolean') return value ? 1 : 0
  return 0
}

/**
 * Convert to string
 */
const toString: TransformFunction = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Convert to boolean
 */
const toBoolean: TransformFunction = (value) => {
  return Boolean(value)
}

/**
 * Default value if undefined/null
 */
const defaultValue: TransformFunction = (value, args) => {
  if (value === undefined || value === null) {
    return args?.default
  }
  return value
}

/**
 * Format a date
 */
const formatDate: TransformFunction = (value, args) => {
  const format = (args?.format as string) || 'short'

  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value)
  } else {
    return value
  }

  if (isNaN(date.getTime())) {
    return value
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : format === 'short'
        ? { year: 'numeric', month: 'short', day: 'numeric' }
        : { year: 'numeric', month: 'numeric', day: 'numeric' }

  return date.toLocaleDateString(undefined, options)
}

/**
 * Sum numeric values in array
 */
const sum: TransformFunction = (value) => {
  if (!Array.isArray(value)) {
    return typeof value === 'number' ? value : 0
  }
  return value.reduce((acc, v) => {
    const num = typeof v === 'number' ? v : parseFloat(String(v))
    return acc + (isNaN(num) ? 0 : num)
  }, 0)
}

/**
 * Calculate average of numeric values
 */
const avg: TransformFunction = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return 0
  }
  const total = sum(value) as number
  return total / value.length
}

/**
 * Get minimum value
 */
const min: TransformFunction = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }
  const numbers = value
    .map((v) => (typeof v === 'number' ? v : parseFloat(String(v))))
    .filter((n) => !isNaN(n))
  return numbers.length > 0 ? Math.min(...numbers) : undefined
}

/**
 * Get maximum value
 */
const max: TransformFunction = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined
  }
  const numbers = value
    .map((v) => (typeof v === 'number' ? v : parseFloat(String(v))))
    .filter((n) => !isNaN(n))
  return numbers.length > 0 ? Math.max(...numbers) : undefined
}

// ============================================================================
// TRANSFORM REGISTRY
// ============================================================================

/**
 * Registry of all built-in transforms
 */
export const BUILT_IN_TRANSFORMS: Record<string, TransformDefinition> = {
  first: {
    fn: first,
    description: 'Get the first item from an array',
    inputType: 'array',
    outputType: 'any',
  },
  last: {
    fn: last,
    description: 'Get the last item from an array',
    inputType: 'array',
    outputType: 'any',
  },
  count: {
    fn: count,
    description: 'Get the count/length of an array or string',
    inputType: 'any',
    outputType: 'number',
  },
  join: {
    fn: join,
    description: 'Join array items into a string',
    inputType: 'array',
    outputType: 'string',
    args: {
      separator: { type: 'string', description: 'Separator between items', required: false },
    },
  },
  split: {
    fn: split,
    description: 'Split a string into an array',
    inputType: 'string',
    outputType: 'array',
    args: {
      separator: { type: 'string', description: 'Separator to split on', required: false },
    },
  },
  uppercase: {
    fn: uppercase,
    description: 'Convert string to uppercase',
    inputType: 'string',
    outputType: 'string',
  },
  lowercase: {
    fn: lowercase,
    description: 'Convert string to lowercase',
    inputType: 'string',
    outputType: 'string',
  },
  trim: {
    fn: trim,
    description: 'Trim whitespace from string',
    inputType: 'string',
    outputType: 'string',
  },
  slice: {
    fn: slice,
    description: 'Get a slice of an array or string',
    inputType: 'any',
    outputType: 'any',
    args: {
      start: { type: 'number', description: 'Start index', required: false },
      end: { type: 'number', description: 'End index (exclusive)', required: false },
    },
  },
  flatten: {
    fn: flatten,
    description: 'Flatten nested arrays',
    inputType: 'array',
    outputType: 'array',
    args: {
      depth: { type: 'number', description: 'Depth to flatten', required: false },
    },
  },
  unique: {
    fn: unique,
    description: 'Get unique values from array',
    inputType: 'array',
    outputType: 'array',
  },
  filter: {
    fn: filter,
    description: 'Filter array by condition',
    inputType: 'array',
    outputType: 'array',
    args: {
      field: { type: 'string', description: 'Field to filter on', required: false },
      equals: { type: 'any', description: 'Value must equal', required: false },
      notEquals: { type: 'any', description: 'Value must not equal', required: false },
      contains: { type: 'string', description: 'String must contain', required: false },
    },
  },
  pluck: {
    fn: pluck,
    description: 'Extract a field from each object in array',
    inputType: 'array',
    outputType: 'array',
    args: {
      field: { type: 'string', description: 'Field to extract', required: true },
    },
  },
  sort: {
    fn: sort,
    description: 'Sort array',
    inputType: 'array',
    outputType: 'array',
    args: {
      field: { type: 'string', description: 'Field to sort by', required: false },
      order: { type: 'string', description: 'Sort order (asc or desc)', required: false },
    },
  },
  reverse: {
    fn: reverse,
    description: 'Reverse array or string',
    inputType: 'any',
    outputType: 'any',
  },
  toNumber: {
    fn: toNumber,
    description: 'Convert to number',
    inputType: 'any',
    outputType: 'number',
  },
  toString: {
    fn: toString,
    description: 'Convert to string',
    inputType: 'any' as const,
    outputType: 'string' as const,
  },
  toBoolean: {
    fn: toBoolean,
    description: 'Convert to boolean',
    inputType: 'any',
    outputType: 'boolean',
  },
  default: {
    fn: defaultValue,
    description: 'Provide default value if undefined/null',
    inputType: 'any',
    outputType: 'any',
    args: {
      default: { type: 'any', description: 'Default value', required: true },
    },
  },
  formatDate: {
    fn: formatDate,
    description: 'Format a date',
    inputType: 'any',
    outputType: 'string',
    args: {
      format: { type: 'string', description: 'Format (short, long, numeric)', required: false },
    },
  },
  sum: {
    fn: sum,
    description: 'Sum numeric values in array',
    inputType: 'array',
    outputType: 'number',
  },
  avg: {
    fn: avg,
    description: 'Calculate average of numeric values',
    inputType: 'array',
    outputType: 'number',
  },
  min: {
    fn: min,
    description: 'Get minimum value from array',
    inputType: 'array',
    outputType: 'number',
  },
  max: {
    fn: max,
    description: 'Get maximum value from array',
    inputType: 'array',
    outputType: 'number',
  },
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get a transform function by name
 */
export function getTransform(name: string): TransformFunction | undefined {
  const definition = BUILT_IN_TRANSFORMS[name]
  return definition?.fn
}

/**
 * Get a transform definition by name
 */
export function getTransformDefinition(name: string): TransformDefinition | undefined {
  return BUILT_IN_TRANSFORMS[name]
}

/**
 * Check if a transform exists
 */
export function hasTransform(name: string): boolean {
  return name in BUILT_IN_TRANSFORMS
}

/**
 * Apply a transform by name
 */
export function applyTransform(
  name: string,
  value: unknown,
  args?: Record<string, unknown>
): unknown {
  const transform = getTransform(name)
  if (!transform) {
    return value
  }
  return transform(value, args)
}

/**
 * Apply multiple transforms in sequence
 */
export function applyTransforms(
  value: unknown,
  transforms: Array<{ name: string; args?: Record<string, unknown> }>
): unknown {
  return transforms.reduce((current, { name, args }) => {
    return applyTransform(name, current, args)
  }, value)
}

/**
 * Get all available transform names
 */
export function getTransformNames(): string[] {
  return Object.keys(BUILT_IN_TRANSFORMS)
}
