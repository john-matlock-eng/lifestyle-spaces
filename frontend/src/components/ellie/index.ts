export { Ellie } from './Ellie'
export type { EllieProps } from './Ellie'
// Use SimpleSmartEllie as SmartEllie - simplified working version
export { SimpleSmartEllie as SmartEllie } from './SimpleSmartEllie'
export type { SimpleSmartEllieProps as SmartEllieProps } from './SimpleSmartEllie'
export { AnimatedShihTzu } from './AnimatedShihTzu'
export { EllieCustomizer, type EllieCustomization } from './EllieCustomizer'
export { EllieBottomBar } from './EllieBottomBar'
export type { EllieBottomBarProps } from './EllieBottomBar'

// Modular component system (recommended)
export { ModularEnhancedShihTzu } from './ModularEnhancedShihTzu'
export { ModularEnhancedShihTzu as default } from './ModularEnhancedShihTzu'

// Legacy component (deprecated - use ModularEnhancedShihTzu instead)
export { default as EnhancedShihTzu } from './EnhancedShihTzu'

// Export modular types
export type * from './types/ellie.types'

// Export sub-components for advanced usage
export * from './facial'
export * from './anatomy'
export * from './accessories'

// Export hooks
export * from './hooks'

// Export utilities
export * from './utils/paths'

// Export constants
export * from './constants'
