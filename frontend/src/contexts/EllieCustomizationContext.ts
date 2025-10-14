import { createContext } from 'react'

export interface EllieCustomization {
  furColor?: string
  collarStyle: 'none' | 'leather' | 'fabric' | 'bowtie' | 'bandana'
  collarColor: string
  collarTag: boolean
}

export interface EllieCustomizationContextType {
  customization: EllieCustomization
  updateCustomization: (updates: Partial<EllieCustomization>) => void
  resetCustomization: () => void
}

export const EllieCustomizationContext = createContext<EllieCustomizationContextType | undefined>(undefined)

// Re-export the provider component
export { EllieCustomizationProvider } from './EllieCustomizationContext.tsx'
