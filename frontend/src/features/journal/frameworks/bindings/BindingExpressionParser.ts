/**
 * Binding Expression Parser
 *
 * Parses binding expressions like "focus-areas[0].name" or "values[*].title"
 * into structured path segments for data extraction.
 *
 * @module BindingExpressionParser
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Type of path segment
 */
export type PathSegmentType = 'property' | 'index' | 'wildcard'

/**
 * A single segment in a parsed path
 */
export interface PathSegment {
  /** Type of segment */
  type: PathSegmentType
  /** Property name (for 'property' type) */
  name?: string
  /** Array index (for 'index' type) */
  index?: number
}

/**
 * Result of parsing a binding expression
 */
export interface ParsedBindingExpression {
  /** Original expression string */
  original: string
  /** Parsed path segments */
  segments: PathSegment[]
  /** Whether expression contains wildcards */
  hasWildcard: boolean
  /** Whether expression is valid */
  isValid: boolean
  /** Error message if invalid */
  error?: string
}

/**
 * Options for the parser
 */
export interface ParserOptions {
  /** Allow empty expressions */
  allowEmpty?: boolean
  /** Maximum path depth */
  maxDepth?: number
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

// Matches a property name (letters, numbers, underscores, hyphens)
const PROPERTY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

// Matches array access patterns: [0], [123], [*]
const ARRAY_ACCESS_PATTERN = /^\[(\d+|\*)\]$/

// Splits expression on dots, preserving array notation
// e.g., "foo.bar[0].baz" -> ["foo", "bar[0]", "baz"]
// eslint-disable-next-line no-useless-escape
const SPLIT_PATTERN = /\.(?![^\[]*\])/

// ============================================================================
// PARSER CLASS
// ============================================================================

/**
 * Binding Expression Parser
 *
 * Parses path expressions for data binding resolution.
 */
export class BindingExpressionParser {
  private readonly options: Required<ParserOptions>

  constructor(options: ParserOptions = {}) {
    this.options = {
      allowEmpty: options.allowEmpty ?? false,
      maxDepth: options.maxDepth ?? 20,
    }
  }

  /**
   * Parse a binding expression into path segments
   */
  parse(expression: string): ParsedBindingExpression {
    // Handle null/undefined
    if (expression == null) {
      return this.createError('', 'Expression cannot be null or undefined')
    }

    // Trim whitespace
    const trimmed = expression.trim()

    // Handle empty expression
    if (trimmed === '') {
      if (this.options.allowEmpty) {
        return {
          original: expression,
          segments: [],
          hasWildcard: false,
          isValid: true,
        }
      }
      return this.createError(expression, 'Expression cannot be empty')
    }

    // Split expression into parts
    const parts = this.splitExpression(trimmed)

    // Check depth limit
    if (parts.length > this.options.maxDepth) {
      return this.createError(
        expression,
        `Expression exceeds maximum depth of ${this.options.maxDepth}`
      )
    }

    // Parse each part into segments
    const segments: PathSegment[] = []
    let hasWildcard = false

    for (const part of parts) {
      const result = this.parsePart(part)
      if (result.error) {
        return this.createError(expression, result.error)
      }
      segments.push(...result.segments)
      if (result.hasWildcard) {
        hasWildcard = true
      }
    }

    return {
      original: expression,
      segments,
      hasWildcard,
      isValid: true,
    }
  }

  /**
   * Split expression into parts at dots (preserving array notation)
   */
  private splitExpression(expression: string): string[] {
    // Handle expressions that start with array access
    if (expression.startsWith('[')) {
      // Find the end of the array access
      const endBracket = expression.indexOf(']')
      if (endBracket === -1) {
        return [expression] // Invalid, will be caught later
      }
      const firstPart = expression.slice(0, endBracket + 1)
      const rest = expression.slice(endBracket + 1)
      if (rest === '') {
        return [firstPart]
      }
      if (rest.startsWith('.')) {
        return [firstPart, ...this.splitExpression(rest.slice(1))]
      }
      // Handle consecutive array access like [0][1]
      if (rest.startsWith('[')) {
        return [firstPart, ...this.splitExpression(rest)]
      }
      return [expression] // Invalid, will be caught later
    }

    return expression.split(SPLIT_PATTERN).filter((p) => p !== '')
  }

  /**
   * Parse a single part of the expression
   */
  private parsePart(
    part: string
  ): { segments: PathSegment[]; hasWildcard: boolean; error?: string } {
    const segments: PathSegment[] = []
    let hasWildcard = false

    // Check for array access notation
    const bracketIndex = part.indexOf('[')

    if (bracketIndex === -1) {
      // Simple property name
      if (!PROPERTY_PATTERN.test(part)) {
        return { segments: [], hasWildcard: false, error: `Invalid property name: "${part}"` }
      }
      segments.push({ type: 'property', name: part })
    } else if (bracketIndex === 0) {
      // Array access only (e.g., "[0]" or "[*]")
      const result = this.parseArrayAccess(part)
      if (result.error) {
        return { segments: [], hasWildcard: false, error: result.error }
      }
      segments.push(result.segment!)
      hasWildcard = result.segment!.type === 'wildcard'
    } else {
      // Property with array access (e.g., "items[0]" or "items[*][0]")
      const propertyName = part.slice(0, bracketIndex)
      const arrayPart = part.slice(bracketIndex)

      if (!PROPERTY_PATTERN.test(propertyName)) {
        return {
          segments: [],
          hasWildcard: false,
          error: `Invalid property name: "${propertyName}"`,
        }
      }
      segments.push({ type: 'property', name: propertyName })

      // Parse all array accesses
      const arraySegments = this.parseMultipleArrayAccess(arrayPart)
      if (arraySegments.error) {
        return { segments: [], hasWildcard: false, error: arraySegments.error }
      }
      segments.push(...arraySegments.segments)
      hasWildcard = arraySegments.hasWildcard
    }

    return { segments, hasWildcard }
  }

  /**
   * Parse a single array access like "[0]" or "[*]"
   */
  private parseArrayAccess(access: string): { segment?: PathSegment; error?: string } {
    if (!ARRAY_ACCESS_PATTERN.test(access)) {
      return { error: `Invalid array access: "${access}"` }
    }

    const inner = access.slice(1, -1)
    if (inner === '*') {
      return { segment: { type: 'wildcard' } }
    }

    const index = parseInt(inner, 10)
    if (isNaN(index) || index < 0) {
      return { error: `Invalid array index: "${inner}"` }
    }

    return { segment: { type: 'index', index } }
  }

  /**
   * Parse multiple consecutive array accesses like "[0][1][*]"
   */
  private parseMultipleArrayAccess(
    part: string
  ): { segments: PathSegment[]; hasWildcard: boolean; error?: string } {
    const segments: PathSegment[] = []
    let hasWildcard = false
    let remaining = part

    while (remaining.length > 0) {
      if (!remaining.startsWith('[')) {
        return { segments: [], hasWildcard: false, error: `Unexpected character after array access: "${remaining}"` }
      }

      const endBracket = remaining.indexOf(']')
      if (endBracket === -1) {
        return { segments: [], hasWildcard: false, error: `Unclosed bracket in: "${remaining}"` }
      }

      const access = remaining.slice(0, endBracket + 1)
      const result = this.parseArrayAccess(access)
      if (result.error) {
        return { segments: [], hasWildcard: false, error: result.error }
      }

      segments.push(result.segment!)
      if (result.segment!.type === 'wildcard') {
        hasWildcard = true
      }

      remaining = remaining.slice(endBracket + 1)
    }

    return { segments, hasWildcard }
  }

  /**
   * Create an error result
   */
  private createError(expression: string, error: string): ParsedBindingExpression {
    return {
      original: expression,
      segments: [],
      hasWildcard: false,
      isValid: false,
      error,
    }
  }

  /**
   * Validate an expression without parsing
   */
  validate(expression: string): { valid: boolean; error?: string } {
    const result = this.parse(expression)
    return {
      valid: result.isValid,
      error: result.error,
    }
  }

  /**
   * Convert parsed expression back to string (for debugging)
   */
  stringify(parsed: ParsedBindingExpression): string {
    if (!parsed.isValid) {
      return parsed.original
    }

    const parts: string[] = []
    let currentProperty = ''

    for (const segment of parsed.segments) {
      switch (segment.type) {
        case 'property':
          if (currentProperty) {
            parts.push(currentProperty)
          }
          currentProperty = segment.name || ''
          break
        case 'index':
          currentProperty += `[${segment.index}]`
          break
        case 'wildcard':
          currentProperty += '[*]'
          break
      }
    }

    if (currentProperty) {
      parts.push(currentProperty)
    }

    return parts.join('.')
  }
}

// ============================================================================
// SINGLETON AND CONVENIENCE FUNCTIONS
// ============================================================================

/** Default parser instance */
export const bindingExpressionParser = new BindingExpressionParser()

/**
 * Parse a binding expression
 */
export function parse(expression: string, options?: ParserOptions): ParsedBindingExpression {
  const parser = options ? new BindingExpressionParser(options) : bindingExpressionParser
  return parser.parse(expression)
}

/**
 * Validate a binding expression
 */
export function validate(
  expression: string,
  options?: ParserOptions
): { valid: boolean; error?: string } {
  const parser = options ? new BindingExpressionParser(options) : bindingExpressionParser
  return parser.validate(expression)
}

/**
 * Check if an expression is valid
 */
export function isValidExpression(expression: string): boolean {
  return bindingExpressionParser.validate(expression).valid
}
