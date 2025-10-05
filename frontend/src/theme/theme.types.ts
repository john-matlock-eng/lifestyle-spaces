/**
 * Complete TypeScript interfaces for the robust theme system
 * Following TDD principles - interfaces designed to support comprehensive testing
 */

// ==================== CORE THEME INTERFACES ====================

export interface ThemeColors {
  /** Primary color palette (50-950 scale) */
  primary: ColorScale
  /** Secondary color palette */
  secondary: ColorScale
  /** Accent color palette */
  accent: ColorScale
  /** Background colors for surfaces */
  background: BackgroundColors
  /** Text colors for content */
  text: TextColors
  /** Border colors */
  border: BorderColors
  /** Status/semantic colors */
  status: StatusColors
}

export interface ColorScale {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string  // Base color
  600: string
  700: string
  800: string
  900: string
  950: string
}

export interface BackgroundColors {
  /** Main page background */
  base: string
  /** Card/surface background */
  surface: string
  /** Elevated components (modals, dropdowns) */
  elevated: string
  /** Overlay background */
  overlay: string
  /** Overlay opacity (0-1) */
  overlayOpacity: number
}

export interface TextColors {
  /** Primary text (headings, body) */
  primary: string
  /** Secondary text (captions, labels) */
  secondary: string
  /** Muted text (placeholders, disabled) */
  muted: string
  /** Inverse text (text on colored backgrounds) */
  inverse: string
  /** Link text */
  link: string
  /** Link text on hover */
  linkHover: string
}

export interface BorderColors {
  /** Base border color */
  base: string
  /** Light border variant */
  light: string
  /** Dark border variant */
  dark: string
  /** Focus ring color */
  focus: string
}

export interface StatusColors {
  /** Success state */
  success: string
  /** Warning state */
  warning: string
  /** Error state */
  error: string
  /** Info state */
  info: string
}

// ==================== THEME EFFECTS & UTILITIES ====================

export interface ThemeEffects {
  /** Shadow definitions */
  shadows: ThemeShadows
  /** Blur effects */
  blur: ThemeBlur
  /** Border radius values */
  radius: ThemeRadius
  /** Transition timings */
  transitions: ThemeTransitions
}

export interface ThemeShadows {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  inner: string
}

export interface ThemeBlur {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
}

export interface ThemeRadius {
  none: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
  '3xl': string
  full: string
}

export interface ThemeTransitions {
  /** Fast transitions (150ms) */
  fast: string
  /** Base transitions (250ms) */
  base: string
  /** Slow transitions (350ms) */
  slow: string
  /** Theme switching transition */
  theme: string
}

// ==================== TYPOGRAPHY & SPACING ====================

export interface ThemeTypography {
  /** Font size scale */
  fontSize: FontSizeScale
  /** Font weight scale */
  fontWeight: FontWeightScale
  /** Line height scale */
  lineHeight: LineHeightScale
  /** Letter spacing scale */
  letterSpacing: LetterSpacingScale
}

export interface FontSizeScale {
  xs: string    // 12px
  sm: string    // 14px
  base: string  // 16px
  lg: string    // 18px
  xl: string    // 20px
  '2xl': string // 24px
  '3xl': string // 30px
  '4xl': string // 36px
  '5xl': string // 48px
  '6xl': string // 60px
}

export interface FontWeightScale {
  thin: string      // 100
  extralight: string // 200
  light: string     // 300
  normal: string    // 400
  medium: string    // 500
  semibold: string  // 600
  bold: string      // 700
  extrabold: string // 800
  black: string     // 900
}

export interface LineHeightScale {
  none: string     // 1
  tight: string    // 1.25
  snug: string     // 1.375
  normal: string   // 1.5
  relaxed: string  // 1.625
  loose: string    // 2
}

export interface LetterSpacingScale {
  tighter: string  // -0.05em
  tight: string    // -0.025em
  normal: string   // 0em
  wide: string     // 0.025em
  wider: string    // 0.05em
  widest: string   // 0.1em
}

export interface ThemeSpacing {
  0: string      // 0px
  px: string     // 1px
  0.5: string    // 2px
  1: string      // 4px
  1.5: string    // 6px
  2: string      // 8px
  2.5: string    // 10px
  3: string      // 12px
  3.5: string    // 14px
  4: string      // 16px
  5: string      // 20px
  6: string      // 24px
  7: string      // 28px
  8: string      // 32px
  9: string      // 36px
  10: string     // 40px
  11: string     // 44px
  12: string     // 48px
  14: string     // 56px
  16: string     // 64px
  20: string     // 80px
  24: string     // 96px
  28: string     // 112px
  32: string     // 128px
}

// ==================== COMPONENT-SPECIFIC THEMING ====================

export interface ComponentTheme {
  /** Form input theming */
  input: InputTheme
  /** Button theming */
  button: ButtonTheme
  /** Navigation theming */
  navigation: NavigationTheme
  /** Modal theming */
  modal: ModalTheme
  /** Card theming */
  card: CardTheme
}

export interface InputTheme {
  /** Input background */
  background: string
  /** Input border color */
  border: string
  /** Focus border color */
  focusBorder: string
  /** Input text color */
  text: string
  /** Placeholder text color */
  placeholder: string
  /** Disabled background */
  disabledBackground: string
  /** Error border color */
  errorBorder: string
  /** Input height variants */
  height: {
    sm: string
    md: string
    lg: string
  }
}

export interface ButtonTheme {
  /** Primary button colors */
  primary: ButtonVariant
  /** Secondary button colors */
  secondary: ButtonVariant
  /** Outline button colors */
  outline: ButtonVariant
  /** Ghost button colors */
  ghost: ButtonVariant
  /** Danger button colors */
  danger: ButtonVariant
}

export interface ButtonVariant {
  /** Default background */
  background: string
  /** Default text color */
  text: string
  /** Default border color */
  border: string
  /** Hover background */
  hoverBackground: string
  /** Hover text color */
  hoverText: string
  /** Hover border color */
  hoverBorder: string
  /** Active background */
  activeBackground: string
  /** Disabled background */
  disabledBackground: string
  /** Disabled text color */
  disabledText: string
}

export interface NavigationTheme {
  /** Navigation background */
  background: string
  /** Navigation text color */
  text: string
  /** Active item background */
  activeBackground: string
  /** Active item text color */
  activeText: string
  /** Hover item background */
  hoverBackground: string
  /** Mobile menu specific */
  mobile: {
    background: string
    backdrop: string
    zIndex: number
  }
}

export interface ModalTheme {
  /** Modal backdrop */
  backdrop: string
  /** Modal background */
  background: string
  /** Modal border */
  border: string
  /** Modal shadow */
  shadow: string
  /** Modal z-index */
  zIndex: number
}

export interface CardTheme {
  /** Card background */
  background: string
  /** Card border */
  border: string
  /** Card shadow */
  shadow: string
  /** Card hover shadow */
  hoverShadow: string
}

// ==================== THEME DEFINITION ====================

export interface Theme {
  /** Unique theme identifier */
  id: string
  /** Display name */
  name: string
  /** Theme description */
  description: string
  /** Theme category (light/dark/auto) */
  category: 'light' | 'dark' | 'auto'
  /** Theme colors */
  colors: ThemeColors
  /** Visual effects */
  effects: ThemeEffects
  /** Typography scale */
  typography: ThemeTypography
  /** Spacing scale */
  spacing: ThemeSpacing
  /** Component-specific theming */
  components: ComponentTheme
  /** Theme metadata */
  metadata: ThemeMetadata
}

export interface ThemeMetadata {
  /** Author information */
  author?: string
  /** Creation date */
  created: Date
  /** Last modified date */
  modified: Date
  /** Theme version */
  version: string
  /** Theme tags */
  tags: string[]
  /** Accessibility features */
  accessibility: AccessibilityFeatures
  /** Theme preview image */
  preview?: string
}

export interface AccessibilityFeatures {
  /** Meets WCAG AA contrast requirements */
  wcagAA: boolean
  /** Meets WCAG AAA contrast requirements */
  wcagAAA: boolean
  /** Supports high contrast mode */
  highContrast: boolean
  /** Supports reduced motion */
  reducedMotion: boolean
  /** Color blind friendly */
  colorBlindFriendly: boolean
}

// ==================== THEME CONTEXT INTERFACES ====================

export type DarkMode = 'light' | 'dark' | 'system'

export interface ThemeContextValue {
  /** Currently active theme */
  currentTheme: Theme
  /** Available themes */
  availableThemes: Theme[]
  /** Dark mode setting */
  darkMode: DarkMode
  /** Computed dark mode state */
  isDark: boolean
  /** Theme switching functions */
  setTheme: (themeId: string) => Promise<void>
  setDarkMode: (mode: DarkMode) => void
  toggleTheme: () => void
  /** Theme management functions */
  importTheme: (themeData: string) => Promise<boolean>
  exportTheme: (themeId?: string) => string
  resetTheme: () => void
  /** Theme validation */
  validateTheme: (theme: Partial<Theme>) => ValidationResult
  /** Performance metrics */
  metrics: ThemeMetrics
}

export interface ValidationResult {
  /** Validation passed */
  valid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Validation warnings */
  warnings: ValidationWarning[]
}

export interface ValidationError {
  /** Error field */
  field: string
  /** Error message */
  message: string
  /** Error severity */
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  /** Warning field */
  field: string
  /** Warning message */
  message: string
  /** Suggested fix */
  suggestion?: string
}

export interface ThemeMetrics {
  /** Theme switch duration (ms) */
  switchTime: number
  /** Theme load time (ms) */
  loadTime: number
  /** CSS variables count */
  variableCount: number
  /** Theme bundle size (bytes) */
  bundleSize: number
  /** Last performance check */
  lastCheck: Date
}

// ==================== THEME HOOK INTERFACES ====================

export interface UseThemeResult {
  /** Current theme data */
  theme: Theme
  /** Set new theme */
  setTheme: (themeId: string) => Promise<void>
  /** Available themes */
  availableThemes: Theme[]
  /** Dark mode controls */
  darkMode: DarkMode
  setDarkMode: (mode: DarkMode) => void
  isDark: boolean
  /** Theme utilities */
  toggleTheme: () => void
  resetTheme: () => void
  /** Theme management */
  importTheme: (themeData: string) => Promise<boolean>
  exportTheme: (themeId?: string) => string
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
}

export interface UseThemeColorsResult {
  /** Primary colors */
  primary: ColorScale
  /** Secondary colors */
  secondary: ColorScale
  /** Accent colors */
  accent: ColorScale
  /** Background colors */
  background: BackgroundColors
  /** Text colors */
  text: TextColors
  /** Border colors */
  border: BorderColors
  /** Status colors */
  status: StatusColors
  /** Get color with opacity */
  withOpacity: (color: string, opacity: number) => string
  /** Get contrasting color */
  getContrast: (color: string) => string
}

export interface UseThemeEffectsResult {
  /** Shadow utilities */
  shadows: ThemeShadows
  /** Blur utilities */
  blur: ThemeBlur
  /** Border radius utilities */
  radius: ThemeRadius
  /** Transition utilities */
  transitions: ThemeTransitions
  /** Responsive variants */
  responsive: {
    sm: ThemeEffects
    md: ThemeEffects
    lg: ThemeEffects
    xl: ThemeEffects
    '2xl': ThemeEffects
  }
}

// ==================== TESTING INTERFACES ====================

export interface ThemeTestUtils {
  /** Render component in theme */
  renderInTheme: (component: React.ReactElement, themeId?: string) => any
  /** Switch theme during test */
  switchTheme: (themeId: string) => Promise<void>
  /** Get computed styles */
  getComputedStyles: (element: HTMLElement) => CSSStyleDeclaration
  /** Check contrast ratio */
  getContrastRatio: (element: HTMLElement) => number
  /** Validate accessibility */
  checkAccessibility: (element: HTMLElement) => Promise<AccessibilityResult>
  /** Performance testing */
  measureThemeSwitch: () => Promise<PerformanceMetrics>
}

export interface AccessibilityResult {
  /** WCAG compliance level */
  wcagLevel: 'AA' | 'AAA' | 'fail'
  /** Contrast ratios */
  contrastRatios: ContrastCheck[]
  /** Focus management */
  focusManagement: boolean
  /** Keyboard navigation */
  keyboardNavigation: boolean
  /** Screen reader compatibility */
  screenReader: boolean
}

export interface ContrastCheck {
  /** Element selector */
  element: string
  /** Foreground color */
  foreground: string
  /** Background color */
  background: string
  /** Contrast ratio */
  ratio: number
  /** Passes WCAG AA */
  passesAA: boolean
  /** Passes WCAG AAA */
  passesAAA: boolean
}

export interface PerformanceMetrics {
  /** Theme switch duration */
  switchDuration: number
  /** Layout thrashing count */
  layoutThrashing: number
  /** Repaint count */
  repaintCount: number
  /** Memory usage delta */
  memoryDelta: number
  /** CSS variable update time */
  cssUpdateTime: number
}

// ==================== CONFIGURATION INTERFACES ====================

export interface ThemeConfig {
  /** Default theme ID */
  defaultTheme: string
  /** Theme storage key */
  storageKey: string
  /** Dark mode storage key */
  darkModeKey: string
  /** Enable system preference detection */
  enableSystemPreference: boolean
  /** Enable transitions */
  enableTransitions: boolean
  /** Enable theme validation */
  enableValidation: boolean
  /** Transition duration */
  transitionDuration?: number
  /** Theme validation mode */
  validationMode?: 'strict' | 'warn' | 'off'
  /** Performance monitoring */
  performanceMonitoring?: boolean
  /** Debug mode */
  debug?: boolean
}

export interface ThemeProviderProps {
  /** Child components */
  children: React.ReactNode
  /** Theme configuration */
  config?: Partial<ThemeConfig>
  /** Initial theme ID */
  initialTheme?: string
  /** Custom themes */
  customThemes?: Theme[]
  /** Theme loading callback */
  onThemeLoad?: (theme: Theme) => void
  /** Theme error callback */
  onThemeError?: (error: Error) => void
}

// ==================== EXPORT TYPES ====================

export type ThemeName = string
export type ColorValue = string
export type CSSProperty = string
export type ZIndexValue = number

// Type guards
export const isValidTheme = (theme: any): theme is Theme => {
  return (
    typeof theme === 'object' &&
    typeof theme.id === 'string' &&
    typeof theme.name === 'string' &&
    typeof theme.colors === 'object' &&
    typeof theme.effects === 'object'
  )
}

export const isValidColorScale = (scale: any): scale is ColorScale => {
  return (
    typeof scale === 'object' &&
    typeof scale[50] === 'string' &&
    typeof scale[500] === 'string' &&
    typeof scale[950] === 'string'
  )
}