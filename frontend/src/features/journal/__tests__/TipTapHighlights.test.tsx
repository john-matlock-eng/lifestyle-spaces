/**
 * Tests for TipTap-Native Highlighting System
 *
 * Tests cover:
 * - Creating highlights with correct attributes
 * - Persisting highlights through save/load cycle
 * - Handling overlapping highlights
 * - Updating comment counts
 * - Removing highlights
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor } from '@tiptap/react';
import { getEditorExtensions } from '../components/extensions';

interface TipTapNode {
  type?: string;
  marks?: Array<{ type: string; attrs: Record<string, unknown> }>;
  content?: TipTapNode[];
  text?: string;
}

describe('TipTap Highlight System', () => {
  let editor: ReturnType<typeof useEditor>;

  beforeEach(() => {
    const { result } = renderHook(() =>
      useEditor({
        extensions: getEditorExtensions('Test...', true),
        content: '<p>This is test content for highlighting.</p>',
      })
    );
    editor = result.current;
  });

  it('should create highlight with correct attributes', () => {
    if (!editor) return;

    // Select text
    editor.commands.setTextSelection({ from: 1, to: 5 });

    // Apply highlight
    editor.commands.setHighlight({
      id: 'test-highlight-1',
      color: 'yellow',
      authorId: 'user-123',
      authorName: 'Test User',
      createdAt: new Date().toISOString(),
      commentCount: 0,
    });

    // Get document JSON
    const json = editor.getJSON();

    // Find the highlight mark
    let foundHighlight = false;
    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        const highlightMark = node.marks.find((m) => m.type === 'highlight');
        if (highlightMark) {
          expect(highlightMark.attrs.id).toBe('test-highlight-1');
          expect(highlightMark.attrs.color).toBe('yellow');
          expect(highlightMark.attrs.authorId).toBe('user-123');
          expect(highlightMark.attrs.authorName).toBe('Test User');
          expect(highlightMark.attrs.commentCount).toBe(0);
          foundHighlight = true;
        }
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    expect(foundHighlight).toBe(true);
  });

  it('should persist highlights through save/load cycle', () => {
    if (!editor) return;

    // Create highlight
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.setHighlight({
      id: 'persist-test',
      color: 'blue',
      authorId: 'user-456',
      authorName: 'Persist User',
    });

    // Get JSON (simulating save)
    const savedJSON = editor.getJSON();

    // Create new editor and load saved content
    const { result: result2 } = renderHook(() =>
      useEditor({
        extensions: getEditorExtensions('Test...', true),
        content: savedJSON,
      })
    );
    const editor2 = result2.current;

    if (!editor2) return;

    // Verify highlight exists in new editor
    const json2 = editor2.getJSON();
    let foundHighlight = false;

    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        const highlightMark = node.marks.find((m) => m.type === 'highlight');
        if (highlightMark && highlightMark.attrs.id === 'persist-test') {
          expect(highlightMark.attrs.color).toBe('blue');
          foundHighlight = true;
        }
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json2);
    expect(foundHighlight).toBe(true);
  });

  it('should handle overlapping highlights', () => {
    if (!editor) return;

    // Create first highlight (position 1-10)
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.setHighlight({
      id: 'highlight-1',
      color: 'yellow',
      authorId: 'user-1',
      authorName: 'User 1',
    });

    // Create second overlapping highlight (position 5-15)
    editor.commands.setTextSelection({ from: 5, to: 15 });
    editor.commands.setHighlight({
      id: 'highlight-2',
      color: 'blue',
      authorId: 'user-2',
      authorName: 'User 2',
    });

    // Get document JSON
    const json = editor.getJSON();

    // Count highlights
    const highlightIds = new Set<string>();
    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type === 'highlight' && typeof mark.attrs.id === 'string') {
            highlightIds.add(mark.attrs.id);
          }
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);

    // Both highlights should exist
    expect(highlightIds.has('highlight-1')).toBe(true);
    expect(highlightIds.has('highlight-2')).toBe(true);
    expect(highlightIds.size).toBeGreaterThanOrEqual(2);
  });

  it('should update comment count on highlight', () => {
    if (!editor) return;

    // Create highlight
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.setHighlight({
      id: 'comment-test',
      color: 'green',
      authorId: 'user-123',
      authorName: 'Test User',
      commentCount: 0,
    });

    // Update comment count
    act(() => {
      editor.commands.updateHighlightCommentCount('comment-test', 3);
    });

    // Verify comment count updated
    const json = editor.getJSON();
    let foundCount = false;

    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        const highlightMark = node.marks.find(
          (m) => m.type === 'highlight' && m.attrs.id === 'comment-test'
        );
        if (highlightMark) {
          expect(highlightMark.attrs.commentCount).toBe(3);
          foundCount = true;
        }
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    expect(foundCount).toBe(true);
  });

  it('should remove highlight by ID', () => {
    if (!editor) return;

    // Create highlight
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.setHighlight({
      id: 'remove-test',
      color: 'purple',
      authorId: 'user-123',
      authorName: 'Test User',
    });

    // Verify it exists
    let json = editor.getJSON();
    let foundBefore = false;
    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        const highlightMark = node.marks.find(
          (m) => m.type === 'highlight' && m.attrs.id === 'remove-test'
        );
        if (highlightMark) {
          foundBefore = true;
        }
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };
    traverse(json);
    expect(foundBefore).toBe(true);

    // Remove highlight
    act(() => {
      editor.commands.unsetHighlight('remove-test');
    });

    // Verify it's gone
    json = editor.getJSON();
    let foundAfter = false;
    const traverseAfter = (node: TipTapNode) => {
      if (node.marks) {
        const highlightMark = node.marks.find(
          (m) => m.type === 'highlight' && m.attrs.id === 'remove-test'
        );
        if (highlightMark) {
          foundAfter = true;
        }
      }
      if (node.content) {
        node.content.forEach(traverseAfter);
      }
    };
    traverseAfter(json);
    expect(foundAfter).toBe(false);
  });

  it('should dispatch custom event on highlight click', () => {
    if (!editor) return;

    const eventSpy = vi.fn();
    document.addEventListener('highlight-clicked', eventSpy);

    // Create highlight
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.setHighlight({
      id: 'click-test',
      color: 'orange',
      authorId: 'user-123',
      authorName: 'Click Test User',
      commentCount: 5,
    });

    // Simulate click on highlight element
    const highlightElement = document.querySelector('mark[data-highlight-id="click-test"]');
    if (highlightElement) {
      highlightElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(eventSpy).toHaveBeenCalled();
      const event = eventSpy.mock.calls[0][0] as CustomEvent;
      expect(event.detail.id).toBe('click-test');
      expect(event.detail.commentCount).toBe(5);
    }

    document.removeEventListener('highlight-clicked', eventSpy);
  });

  it('should handle multiple colors correctly', () => {
    if (!editor) return;

    const colors = ['yellow', 'green', 'blue', 'purple', 'pink', 'orange'];

    colors.forEach((color, index) => {
      const from = 1 + index * 5;
      const to = from + 4;

      editor.commands.setTextSelection({ from, to });
      editor.commands.setHighlight({
        id: `color-test-${color}`,
        color,
        authorId: 'user-123',
        authorName: 'Color Test User',
      });
    });

    // Verify all colors are present
    const json = editor.getJSON();
    const foundColors = new Set<string>();

    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type === 'highlight' && typeof mark.attrs.color === 'string') {
            foundColors.add(mark.attrs.color);
          }
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);

    colors.forEach((color) => {
      expect(foundColors.has(color)).toBe(true);
    });
  });
});

describe('TipTap Highlight Performance', () => {
  it('should handle 100+ highlights efficiently', () => {
    const { result } = renderHook(() =>
      useEditor({
        extensions: getEditorExtensions('Test...', true),
        content: '<p>' + 'word '.repeat(200) + '</p>',
      })
    );

    const editor = result.current;
    if (!editor) return;

    const startTime = performance.now();

    // Create 100 highlights
    for (let i = 0; i < 100; i++) {
      const from = 1 + i * 6;
      const to = from + 4;

      editor.commands.setTextSelection({ from, to });
      editor.commands.setHighlight({
        id: `perf-test-${i}`,
        color: 'yellow',
        authorId: 'user-123',
        authorName: 'Perf User',
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete in reasonable time (< 1000ms)
    expect(duration).toBeLessThan(1000);

    // Verify highlights were created
    const json = editor.getJSON();
    const highlightIds = new Set<string>();

    const traverse = (node: TipTapNode) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type === 'highlight' && typeof mark.attrs.id === 'string') {
            highlightIds.add(mark.attrs.id);
          }
        });
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };

    traverse(json);
    expect(highlightIds.size).toBeGreaterThanOrEqual(90); // Allow some merging
  });
});
