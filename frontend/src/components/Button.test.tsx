import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button Component', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('btn', 'btn-primary')
    expect(button).not.toBeDisabled()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('should render with custom variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    
    const button = screen.getByRole('button', { name: 'Secondary' })
    expect(button).toHaveClass('btn', 'btn-secondary')
    expect(button).not.toHaveClass('btn-primary')
  })

  it('should render all variant types correctly', () => {
    const variants = ['primary', 'secondary', 'success', 'danger', 'warning'] as const
    
    variants.forEach((variant) => {
      render(<Button variant={variant} data-testid={`btn-${variant}`}>{variant}</Button>)
      const button = screen.getByTestId(`btn-${variant}`)
      expect(button).toHaveClass('btn', `btn-${variant}`)
    })
  })

  it('should render with custom size classes', () => {
    render(<Button size="large">Large Button</Button>)
    
    const button = screen.getByRole('button', { name: 'Large Button' })
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-large')
  })

  it('should render all size types correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const
    
    sizes.forEach((size) => {
      render(<Button size={size} data-testid={`btn-${size}`}>{size}</Button>)
      const button = screen.getByTestId(`btn-${size}`)
      expect(button).toHaveClass('btn', `btn-${size}`)
    })
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button', { name: 'Disabled' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('btn-disabled')
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick} disabled>Disabled</Button>)
    
    const button = screen.getByRole('button', { name: 'Disabled' })
    
    // Since the button is disabled, the event shouldn't be called
    // even if we try to fire the click event
    fireEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should handle click with fireEvent', () => {
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: 'Click me' })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button).toHaveClass('btn', 'btn-primary', 'custom-class')
  })

  it('should support different button types', () => {
    render(<Button type="submit">Submit</Button>)
    
    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('should support loading state', () => {
    render(<Button loading>Loading</Button>)
    
    const button = screen.getByRole('button', { name: 'Loading...' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('btn-loading')
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should show loading text when loading is true', () => {
    render(<Button loading>Submit</Button>)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.queryByText('Submit')).not.toBeInTheDocument()
  })

  it('should handle fullWidth prop', () => {
    render(<Button fullWidth>Full Width</Button>)
    
    const button = screen.getByRole('button', { name: 'Full Width' })
    expect(button).toHaveClass('btn-full-width')
  })

  it('should combine multiple props correctly', () => {
    const handleClick = vi.fn()
    
    render(
      <Button
        variant="danger"
        size="large"
        fullWidth
        className="custom-danger"
        onClick={handleClick}
        data-testid="complex-button"
      >
        Complex Button
      </Button>
    )
    
    const button = screen.getByTestId('complex-button')
    expect(button).toHaveClass('btn', 'btn-danger', 'btn-large', 'btn-full-width', 'custom-danger')
    expect(button).not.toBeDisabled()
  })

  it('should handle children as function', () => {
    render(<Button>{(isLoading) => isLoading ? 'Loading...' : 'Click me'}</Button>)
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should forward ref correctly', () => {
    const ref = vi.fn()
    
    render(<Button ref={ref}>Ref Button</Button>)
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement))
  })
})