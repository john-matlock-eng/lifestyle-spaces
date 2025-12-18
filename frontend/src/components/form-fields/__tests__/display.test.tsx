/**
 * Tests for Display Components (HeaderField, StaticTextField, DividerField)
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HeaderField } from '../display/HeaderField'
import { StaticTextField } from '../display/StaticTextField'
import { DividerField } from '../display/DividerField'

describe('HeaderField', () => {
  describe('rendering', () => {
    it('renders content', () => {
      render(<HeaderField content="Personal Information" />)
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })

    it('renders as h2 by default', () => {
      render(<HeaderField content="Section Header" />)
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('renders as h1 when level is 1', () => {
      render(<HeaderField content="Main Header" level={1} />)
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('renders as h3 when level is 3', () => {
      render(<HeaderField content="Sub Header" level={3} />)
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })

    it('applies level class', () => {
      render(<HeaderField content="Header" level={2} />)
      expect(screen.getByText('Header')).toHaveClass('field-header--level-2')
    })

    it('applies custom className', () => {
      render(<HeaderField content="Header" className="custom-class" />)
      expect(screen.getByText('Header')).toHaveClass('custom-class')
    })

    it('applies testId', () => {
      render(<HeaderField content="Header" testId="section-header" />)
      expect(screen.getByTestId('section-header')).toBeInTheDocument()
    })
  })
})

describe('StaticTextField', () => {
  describe('rendering', () => {
    it('renders content', () => {
      render(<StaticTextField content="This is some static text." />)
      expect(screen.getByText('This is some static text.')).toBeInTheDocument()
    })

    it('renders as paragraph', () => {
      render(<StaticTextField content="Paragraph text" />)
      const element = screen.getByText('Paragraph text')
      expect(element.tagName).toBe('P')
    })

    it('applies body variant class by default', () => {
      render(<StaticTextField content="Body text" />)
      expect(screen.getByText('Body text')).toHaveClass('field-static-text--body')
    })

    it('applies caption variant class', () => {
      render(<StaticTextField content="Caption text" variant="caption" />)
      expect(screen.getByText('Caption text')).toHaveClass('field-static-text--caption')
    })

    it('applies muted variant class', () => {
      render(<StaticTextField content="Muted text" variant="muted" />)
      expect(screen.getByText('Muted text')).toHaveClass('field-static-text--muted')
    })

    it('applies custom className', () => {
      render(<StaticTextField content="Custom text" className="custom-class" />)
      expect(screen.getByText('Custom text')).toHaveClass('custom-class')
    })

    it('applies testId', () => {
      render(<StaticTextField content="Test text" testId="static-text" />)
      expect(screen.getByTestId('static-text')).toBeInTheDocument()
    })
  })
})

describe('DividerField', () => {
  describe('rendering', () => {
    it('renders hr element', () => {
      const { container } = render(<DividerField />)
      expect(container.querySelector('hr')).toBeInTheDocument()
    })

    it('applies medium spacing class by default', () => {
      const { container } = render(<DividerField />)
      expect(container.querySelector('hr')).toHaveClass('field-divider--medium')
    })

    it('applies small spacing class', () => {
      const { container } = render(<DividerField spacing="small" />)
      expect(container.querySelector('hr')).toHaveClass('field-divider--small')
    })

    it('applies large spacing class', () => {
      const { container } = render(<DividerField spacing="large" />)
      expect(container.querySelector('hr')).toHaveClass('field-divider--large')
    })

    it('applies custom className', () => {
      const { container } = render(<DividerField className="custom-class" />)
      expect(container.querySelector('hr')).toHaveClass('custom-class')
    })

    it('applies testId', () => {
      render(<DividerField testId="section-divider" />)
      expect(screen.getByTestId('section-divider')).toBeInTheDocument()
    })

    it('has aria-hidden for accessibility', () => {
      const { container } = render(<DividerField />)
      expect(container.querySelector('hr')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
