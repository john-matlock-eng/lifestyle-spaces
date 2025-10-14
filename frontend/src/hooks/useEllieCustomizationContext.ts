import { useContext } from 'react'
import { EllieCustomizationContext } from '../contexts/EllieCustomizationContext'

export const useEllieCustomizationContext = () => {
  const context = useContext(EllieCustomizationContext)
  if (context === undefined) {
    throw new Error('useEllieCustomizationContext must be used within an EllieCustomizationProvider')
  }
  return context
}
