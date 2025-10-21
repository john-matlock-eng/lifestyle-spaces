import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RichTextEditor } from './RichTextEditor'

describe('RichTextEditor', () => {
  it('should render the editor', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
        placeholder="Test placeholder"
      />
    )

    expect(document.querySelector('.rich-text-editor')).toBeInTheDocument()
    expect(document.querySelector('.ProseMirror')).toBeInTheDocument()
  })

  it('should render toolbar by default', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
      />
    )

    expect(screen.getByTitle('Bold')).toBeInTheDocument()
    expect(screen.getByTitle('Italic')).toBeInTheDocument()
    expect(screen.getByTitle('Strikethrough')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 1')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 2')).toBeInTheDocument()
    expect(screen.getByTitle('Heading 3')).toBeInTheDocument()
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument()
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument()
    expect(screen.getByTitle('Task List')).toBeInTheDocument()
    expect(screen.getByTitle('Quote')).toBeInTheDocument()
    expect(screen.getByTitle('Code Block')).toBeInTheDocument()
    expect(screen.getByTitle('Horizontal Line')).toBeInTheDocument()
    expect(screen.getByTitle('Undo')).toBeInTheDocument()
    expect(screen.getByTitle('Redo')).toBeInTheDocument()
  })

  it('should hide toolbar when showToolbar is false', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
        showToolbar={false}
      />
    )

    expect(screen.queryByTitle('Bold')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Italic')).not.toBeInTheDocument()
  })

  it('should disable toolbar buttons when disabled', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
        disabled={true}
      />
    )

    expect(screen.getByTitle('Bold')).toBeDisabled()
    expect(screen.getByTitle('Italic')).toBeDisabled()
    expect(screen.getByTitle('Strikethrough')).toBeDisabled()
  })

  it('should apply custom minHeight style', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
        minHeight="500px"
      />
    )

    const editorContent = document.querySelector('.editor-content') as HTMLElement
    expect(editorContent).toHaveStyle({ minHeight: '500px' })
  })

  it('should render markdown content', async () => {
    const onChange = vi.fn()
    const markdown = '# Test Heading\n\nThis is **bold** text.'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor).toBeInTheDocument()
    })
  })

  it('should handle empty content', () => {
    const onChange = vi.fn()
    render(
      <RichTextEditor
        content=""
        onChange={onChange}
      />
    )

    const editor = document.querySelector('.ProseMirror')
    expect(editor).toBeInTheDocument()
    expect(editor?.textContent).toBe('')
  })

  it('should render formatted markdown with headings', async () => {
    const onChange = vi.fn()
    const markdown = '# Heading 1\n\n## Heading 2\n\n### Heading 3'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor?.textContent).toContain('Heading 1')
      expect(editor?.textContent).toContain('Heading 2')
      expect(editor?.textContent).toContain('Heading 3')
    })
  })

  it('should render formatted markdown with lists', async () => {
    const onChange = vi.fn()
    const markdown = '- Item 1\n- Item 2\n- Item 3'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor?.textContent).toContain('Item 1')
      expect(editor?.textContent).toContain('Item 2')
      expect(editor?.textContent).toContain('Item 3')
    })
  })

  it('should render formatted markdown with blockquotes', async () => {
    const onChange = vi.fn()
    const markdown = '> This is a quote\n> Another line'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor?.textContent).toContain('This is a quote')
      expect(editor?.textContent).toContain('Another line')
    })
  })

  it('should render formatted markdown with code blocks', async () => {
    const onChange = vi.fn()
    const markdown = '```\nconst x = 42;\n```'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor?.textContent).toContain('const x = 42;')
    })
  })

  it('should render formatted markdown with task lists', async () => {
    const onChange = vi.fn()
    const markdown = '- [ ] Unchecked task\n- [x] Checked task'

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor).toBeInTheDocument()
    })
  })

  it('should handle complex markdown with multiple elements', async () => {
    const onChange = vi.fn()
    const markdown = `# Test Journal

This is **bold** and this is *italic* and this is ***both***.

## Lists

- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

## Other Elements

> This is a blockquote

\`\`\`
code block
\`\`\`

---`

    render(
      <RichTextEditor
        content={markdown}
        onChange={onChange}
      />
    )

    await waitFor(() => {
      const editor = document.querySelector('.ProseMirror')
      expect(editor?.textContent).toContain('Test Journal')
      expect(editor?.textContent).toContain('Lists')
      expect(editor?.textContent).toContain('Bullet item 1')
    })
  })
})
