import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { JournalHeaderCompact } from './JournalHeaderCompact'
import type { JournalHeaderCompactProps } from './JournalHeaderCompact'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock emotion data
vi.mock('../data/emotionData', () => ({
  getEmotionById: (id: string) => {
    const emotions: Record<string, { id: string; label: string; color: string }> = {
      happy: { id: 'happy', label: 'Happy', color: '#FFD700' },
      excited: { id: 'excited', label: 'Excited', color: '#FF6347' },
      calm: { id: 'calm', label: 'Calm', color: '#87CEEB' }
    }
    return emotions[id]
  }
}))

// Mock JournalContentManager
vi.mock('../../../lib/journal/JournalContentManager', () => ({
  JournalContentManager: {
    extractCleanMarkdown: (content: string) => content.replace(/[#*_]/g, '')
  }
}))

describe('JournalHeaderCompact', () => {
  const defaultProps: JournalHeaderCompactProps = {
    title: 'My Test Journal Entry',
    content: 'This is a test journal entry with some content that should be used for the subtitle preview.',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    wordCount: 1250,
    highlightCount: 5,
    commentCount: 3,
    headerState: 'full',
    readProgress: 45,
    density: 'comfortable',
    onDensityChange: vi.fn(),
    readTime: '6 min'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Title Display', () => {
    it('should display full title without truncation', () => {
      const longTitle = 'This is a very long journal title that should not be truncated and should wrap to multiple lines if necessary'

      render(<JournalHeaderCompact {...defaultProps} title={longTitle} />)

      const titleElement = screen.getByText(longTitle)
      expect(titleElement).toBeInTheDocument()
      expect(titleElement.tagName).toBe('H1')
    })

    it('should display pin icon when journal is pinned', () => {
      render(<JournalHeaderCompact {...defaultProps} isPinned={true} />)

      expect(screen.getByText('📌')).toBeInTheDocument()
    })

    it('should not display pin icon when journal is not pinned', () => {
      render(<JournalHeaderCompact {...defaultProps} isPinned={false} />)

      expect(screen.queryByText('📌')).not.toBeInTheDocument()
    })
  })

  describe('Subtitle Preview', () => {
    it('should display first 60 characters of content as subtitle in full state', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      const subtitle = screen.getByText(/This is a test journal entry with some content that should.../)
      expect(subtitle).toBeInTheDocument()
      expect(subtitle.className).toContain('journal-header-subtitle')
    })

    it('should not display subtitle in compact state', () => {
      render(<JournalHeaderCompact {...defaultProps} headerState="compact" />)

      const subtitle = screen.queryByText(/This is a test journal entry/)
      expect(subtitle).not.toBeInTheDocument()
    })

    it('should not display subtitle in hidden state', () => {
      render(<JournalHeaderCompact {...defaultProps} headerState="hidden" />)

      const subtitle = screen.queryByText(/This is a test journal entry/)
      expect(subtitle).not.toBeInTheDocument()
    })

    it('should handle content shorter than 60 characters', () => {
      render(<JournalHeaderCompact {...defaultProps} content="Short content" />)

      const subtitle = screen.getByText('Short content')
      expect(subtitle).toBeInTheDocument()
      expect(subtitle.textContent).not.toContain('...')
    })

    it('should strip markdown from subtitle', () => {
      const markdownContent = '# Heading\n**Bold text** and *italic text*'

      render(<JournalHeaderCompact {...defaultProps} content={markdownContent} />)

      const subtitle = screen.getByText(/Heading Bold text and italic text/)
      expect(subtitle).toBeInTheDocument()
    })
  })

  describe('Template Badge', () => {
    it('should display template badge when template is provided in full state', () => {
      const template = {
        id: 'gratitude',
        name: 'Gratitude Journal',
        icon: '🙏',
        sections: []
      }

      render(<JournalHeaderCompact {...defaultProps} template={template} />)

      expect(screen.getByText('🙏')).toBeInTheDocument()
      expect(screen.getByText('Gratitude Journal')).toBeInTheDocument()
    })

    it('should not display template badge in compact state', () => {
      const template = {
        id: 'gratitude',
        name: 'Gratitude Journal',
        icon: '🙏',
        sections: []
      }

      render(<JournalHeaderCompact {...defaultProps} template={template} headerState="compact" />)

      expect(screen.queryByText('Gratitude Journal')).not.toBeInTheDocument()
    })
  })

  describe('Grouped Tags', () => {
    it('should group emotional tags separately from topic tags', () => {
      render(
        <JournalHeaderCompact
          {...defaultProps}
          emotions={['happy', 'excited']}
          tags={['work', 'productivity']}
        />
      )

      // Check for emotion group icon
      expect(screen.getByText('💭')).toBeInTheDocument()

      // Check for topic group icon
      expect(screen.getByText('🏷️')).toBeInTheDocument()

      // Check for emotion tags
      expect(screen.getByText('Happy')).toBeInTheDocument()
      expect(screen.getByText('Excited')).toBeInTheDocument()

      // Check for topic tags
      expect(screen.getByText('work')).toBeInTheDocument()
      expect(screen.getByText('productivity')).toBeInTheDocument()
    })

    it('should apply correct styling to emotion tags', () => {
      render(
        <JournalHeaderCompact
          {...defaultProps}
          emotions={['happy']}
        />
      )

      const emotionTag = screen.getByText('Happy')
      expect(emotionTag.className).toContain('emotion')
      expect(emotionTag).toHaveStyle({
        color: '#FFD700'
      })
    })

    it('should apply correct styling to topic tags', () => {
      render(
        <JournalHeaderCompact
          {...defaultProps}
          tags={['work']}
        />
      )

      const topicTag = screen.getByText('work')
      expect(topicTag.className).toContain('topic')
    })

    it('should not display tags section in compact state', () => {
      render(
        <JournalHeaderCompact
          {...defaultProps}
          emotions={['happy']}
          tags={['work']}
          headerState="compact"
        />
      )

      expect(screen.queryByText('Happy')).not.toBeInTheDocument()
      expect(screen.queryByText('work')).not.toBeInTheDocument()
    })

    it('should handle empty emotions and tags arrays', () => {
      render(
        <JournalHeaderCompact
          {...defaultProps}
          emotions={[]}
          tags={[]}
        />
      )

      expect(screen.queryByText('💭')).not.toBeInTheDocument()
      expect(screen.queryByText('🏷️')).not.toBeInTheDocument()
    })
  })

  describe('Collapsible Metadata', () => {
    it('should render metadata toggle button in full state', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      expect(toggleButton).toBeInTheDocument()
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should start with metadata collapsed by default', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const metadataContent = screen.queryByText('John Doe')
      expect(metadataContent).not.toBeInTheDocument()
    })

    it('should expand metadata when toggle is clicked', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      fireEvent.click(toggleButton)

      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should collapse metadata when toggle is clicked again', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })

      // Expand
      fireEvent.click(toggleButton)
      expect(screen.getByText('John Doe')).toBeInTheDocument()

      // Collapse
      fireEvent.click(toggleButton)
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('should display author when provided', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      fireEvent.click(toggleButton)

      expect(screen.getByText('Author:')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('👤')).toBeInTheDocument()
    })

    it('should display created date', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      fireEvent.click(toggleButton)

      expect(screen.getByText('Created:')).toBeInTheDocument()
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument()
    })

    it('should display updated date when different from created date', () => {
      render(<JournalHeaderCompact {...defaultProps} updatedAt="2024-01-20T15:45:00Z" />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      fireEvent.click(toggleButton)

      expect(screen.getByText('Updated:')).toBeInTheDocument()
      expect(screen.getByText(/January 20, 2024/)).toBeInTheDocument()
    })

    it('should not display updated date when same as created date', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      fireEvent.click(toggleButton)

      expect(screen.queryByText('Updated:')).not.toBeInTheDocument()
    })

    it('should not render metadata section in compact state', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} headerState="compact" />)

      expect(screen.queryByRole('button', { name: /details/i })).not.toBeInTheDocument()
    })
  })

  describe('Reading Progress Bar', () => {
    it('should render progress bar with correct width', () => {
      render(<JournalHeaderCompact {...defaultProps} readProgress={45} />)

      const progressBar = screen.getByLabelText(/reading progress: 45%/i)
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '45%' })
    })

    it('should update progress bar width when readProgress changes', () => {
      const { rerender } = render(<JournalHeaderCompact {...defaultProps} readProgress={25} />)

      let progressBar = screen.getByLabelText(/reading progress: 25%/i)
      expect(progressBar).toHaveStyle({ width: '25%' })

      rerender(<JournalHeaderCompact {...defaultProps} readProgress={75} />)

      progressBar = screen.getByLabelText(/reading progress: 75%/i)
      expect(progressBar).toHaveStyle({ width: '75%' })
    })

    it('should handle 0% progress', () => {
      render(<JournalHeaderCompact {...defaultProps} readProgress={0} />)

      const progressBar = screen.getByLabelText(/reading progress: 0%/i)
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should handle 100% progress', () => {
      render(<JournalHeaderCompact {...defaultProps} readProgress={100} />)

      const progressBar = screen.getByLabelText(/reading progress: 100%/i)
      expect(progressBar).toHaveStyle({ width: '100%' })
    })
  })

  describe('Quick Stats', () => {
    it('should display all stats in full state', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      expect(screen.getByText('1250')).toBeInTheDocument() // word count
      expect(screen.getByText('6 min')).toBeInTheDocument() // read time
      expect(screen.getByText('5')).toBeInTheDocument() // highlights
      expect(screen.getByText('3')).toBeInTheDocument() // comments
    })

    it('should display stat labels in full state', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      expect(screen.getByText('words')).toBeInTheDocument()
      expect(screen.getByText('read')).toBeInTheDocument()
      expect(screen.getByText('highlights')).toBeInTheDocument()
      expect(screen.getByText('comments')).toBeInTheDocument()
    })

    it('should pluralize highlight label correctly', () => {
      const { rerender } = render(<JournalHeaderCompact {...defaultProps} highlightCount={1} />)
      expect(screen.getByText('highlight')).toBeInTheDocument()

      rerender(<JournalHeaderCompact {...defaultProps} highlightCount={2} />)
      expect(screen.getByText('highlights')).toBeInTheDocument()
    })

    it('should pluralize comment label correctly', () => {
      const { rerender } = render(<JournalHeaderCompact {...defaultProps} commentCount={1} />)
      expect(screen.getByText('comment')).toBeInTheDocument()

      rerender(<JournalHeaderCompact {...defaultProps} commentCount={2} />)
      expect(screen.getByText('comments')).toBeInTheDocument()
    })

    it('should apply compact class to stats in compact state', () => {
      const { container } = render(<JournalHeaderCompact {...defaultProps} headerState="compact" />)

      const statsElement = container.querySelector('.journal-header-stats')
      expect(statsElement).toHaveClass('compact')
    })
  })

  describe('Density Toggle', () => {
    it('should display density options in full state', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      expect(screen.getByRole('button', { name: /compact view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /comfortable view/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /spacious view/i })).toBeInTheDocument()
    })

    it('should highlight active density option', () => {
      render(<JournalHeaderCompact {...defaultProps} density="compact" />)

      const compactButton = screen.getByRole('button', { name: /^compact view$/i })
      expect(compactButton).toHaveClass('active')
    })

    it('should call onDensityChange when density option is clicked', () => {
      const onDensityChange = vi.fn()

      render(<JournalHeaderCompact {...defaultProps} onDensityChange={onDensityChange} />)

      const spaciousButton = screen.getByRole('button', { name: /spacious view/i })
      fireEvent.click(spaciousButton)

      expect(onDensityChange).toHaveBeenCalledWith('spacious')
    })

    it('should not display density toggle in compact state', () => {
      render(<JournalHeaderCompact {...defaultProps} headerState="compact" />)

      expect(screen.queryByRole('button', { name: /compact view/i })).not.toBeInTheDocument()
    })
  })

  describe('Header State Classes', () => {
    it('should apply full state class', () => {
      const { container } = render(<JournalHeaderCompact {...defaultProps} headerState="full" />)

      const header = container.querySelector('.journal-header-progressive')
      expect(header).toHaveClass('full')
    })

    it('should apply compact state class', () => {
      const { container } = render(<JournalHeaderCompact {...defaultProps} headerState="compact" />)

      const header = container.querySelector('.journal-header-progressive')
      expect(header).toHaveClass('compact')
    })

    it('should apply hidden state class', () => {
      const { container } = render(<JournalHeaderCompact {...defaultProps} headerState="hidden" />)

      const header = container.querySelector('.journal-header-progressive')
      expect(header).toHaveClass('hidden')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      expect(screen.getByLabelText('Compact view')).toBeInTheDocument()
      expect(screen.getByLabelText('Comfortable view')).toBeInTheDocument()
      expect(screen.getByLabelText('Spacious view')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes for collapsible metadata', () => {
      render(<JournalHeaderCompact {...defaultProps} author={{ displayName: 'John Doe', email: 'john@example.com' }} />)

      const toggleButton = screen.getByRole('button', { name: /details/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      expect(toggleButton).toHaveAttribute('aria-controls', 'journal-metadata-content')
    })

    it('should have semantic heading for title', () => {
      render(<JournalHeaderCompact {...defaultProps} />)

      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveTextContent('My Test Journal Entry')
    })

    it('should have proper test id for component', () => {
      const { container } = render(<JournalHeaderCompact {...defaultProps} />)

      expect(container.querySelector('[data-testid="journal-header-compact"]')).toBeInTheDocument()
    })
  })
})
