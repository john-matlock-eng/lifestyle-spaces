import React, { forwardRef } from 'react'
import './Button.css'

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: React.ReactNode | ((isLoading: boolean) => React.ReactNode)
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  fullWidth?: boolean
  className?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  // Build CSS classes
  const baseClasses = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = `btn-${size}`
  const loadingClass = loading ? 'btn-loading' : ''
  const disabledClass = (disabled || loading) ? 'btn-disabled' : ''
  const fullWidthClass = fullWidth ? 'btn-full-width' : ''
  
  const classes = [
    baseClasses,
    variantClass,
    sizeClass,
    loadingClass,
    disabledClass,
    fullWidthClass,
    className
  ].filter(Boolean).join(' ')

  // Handle children content
  const renderChildren = () => {
    if (loading) {
      return 'Loading...'
    }
    
    if (typeof children === 'function') {
      return children(loading)
    }
    
    return children
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {renderChildren()}
    </button>
  )
})

Button.displayName = 'Button'

export default Button