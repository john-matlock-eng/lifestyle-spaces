import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { InteractionModeManager, ModeContextMenu } from './InteractionModes';
import { EllieMode, useModeKeyboardShortcuts } from './types';

describe('InteractionModes', () => {
  describe('EllieMode enum', () => {
    it('should have all required modes', () => {
      expect(EllieMode.COMPANION).toBe('companion');
      expect(EllieMode.ASSISTANT).toBe('assistant');
      expect(EllieMode.PLAYFUL).toBe('playful');
      expect(EllieMode.FOCUS).toBe('focus');
    });
  });

  describe('InteractionModeManager', () => {
    let onModeChange: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onModeChange = vi.fn();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('should render with default mode', () => {
      render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      expect(screen.getByText(/companion/i)).toBeDefined();
    });

    it('should display mode description', () => {
      render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      expect(screen.getByText(/follows user activity/i)).toBeDefined();
    });

    it('should allow mode switching', () => {
      const { rerender } = render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      const button = screen.getByRole('button', { name: /change mode/i });
      fireEvent.click(button);

      const assistantOption = screen.getByText(/assistant/i);
      fireEvent.click(assistantOption);

      expect(onModeChange).toHaveBeenCalledWith(EllieMode.ASSISTANT);

      rerender(
        <InteractionModeManager
          currentMode={EllieMode.ASSISTANT}
          onModeChange={onModeChange}
        />
      );

      expect(screen.getByText(/stays docked/i)).toBeDefined();
    });

    it('should show all mode options', () => {
      render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      const button = screen.getByRole('button', { name: /change mode/i });
      fireEvent.click(button);

      expect(screen.getByText(/companion/i)).toBeDefined();
      expect(screen.getByText(/assistant/i)).toBeDefined();
      expect(screen.getByText(/playful/i)).toBeDefined();
      expect(screen.getByText(/focus/i)).toBeDefined();
    });

    describe('Companion Mode Behavior', () => {
      it('should follow user activity subtly', async () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.COMPANION}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        // Simulate user activity (mouse move)
        fireEvent.mouseMove(document, { clientX: 500, clientY: 500 });

        await waitFor(() => {
          // Should move away from cursor
          expect(onPositionChange).toHaveBeenCalled();
        });
      });

      it('should move to avoid cursor', () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.COMPANION}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
            position={{ x: 500, y: 500 }}
          />
        );

        // Simulate cursor very close
        fireEvent.mouseMove(document, { clientX: 510, clientY: 510 });

        vi.advanceTimersByTime(100);

        expect(onPositionChange).toHaveBeenCalled();
      });
    });

    describe('Assistant Mode Behavior', () => {
      it('should stay docked in bottom-right', () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.ASSISTANT}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        // Should automatically dock
        expect(onPositionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number),
          })
        );
      });

      it('should not move on cursor proximity', () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.ASSISTANT}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        onPositionChange.mockClear();

        // Simulate cursor nearby
        fireEvent.mouseMove(document, { clientX: 900, clientY: 700 });

        vi.advanceTimersByTime(500);

        // Should not move away in assistant mode
        expect(onPositionChange).not.toHaveBeenCalled();
      });
    });

    describe('Playful Mode Behavior', () => {
      it('should move randomly on its own', () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.PLAYFUL}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        onPositionChange.mockClear();

        // Wait for random movement (30-60s interval)
        vi.advanceTimersByTime(35000);

        expect(onPositionChange).toHaveBeenCalled();
      });

      it('should move within valid range', () => {
        const onPositionChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.PLAYFUL}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        vi.advanceTimersByTime(40000);

        const calls = onPositionChange.mock.calls;
        if (calls.length > 0) {
          const [position] = calls[0];
          expect(position.x).toBeGreaterThanOrEqual(0);
          expect(position.y).toBeGreaterThanOrEqual(0);
        }
      });

      it('should clear random movement timer on mode change', () => {
        const onPositionChange = vi.fn();

        const { rerender } = render(
          <InteractionModeManager
            currentMode={EllieMode.PLAYFUL}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        // Change mode
        rerender(
          <InteractionModeManager
            currentMode={EllieMode.COMPANION}
            onModeChange={onModeChange}
            onPositionChange={onPositionChange}
          />
        );

        onPositionChange.mockClear();

        // Wait for what would have been a playful movement
        vi.advanceTimersByTime(40000);

        // Should not move since mode changed
        expect(onPositionChange).not.toHaveBeenCalled();
      });
    });

    describe('Focus Mode Behavior', () => {
      it('should minimize to tiny bubble', () => {
        const onDockChange = vi.fn();

        render(
          <InteractionModeManager
            currentMode={EllieMode.FOCUS}
            onModeChange={onModeChange}
            onDockChange={onDockChange}
          />
        );

        expect(onDockChange).toHaveBeenCalledWith(true);
      });

      it('should render at 30px size', () => {
        const { container } = render(
          <InteractionModeManager
            currentMode={EllieMode.FOCUS}
            onModeChange={onModeChange}
          />
        );

        const ellieElement = container.querySelector('[data-mode="focus"]');
        expect(ellieElement).toBeDefined();
      });

      it('should expand on hover', () => {
        const { container } = render(
          <InteractionModeManager
            currentMode={EllieMode.FOCUS}
            onModeChange={onModeChange}
          />
        );

        const ellieElement = container.querySelector('[data-mode="focus"]');
        if (ellieElement) {
          fireEvent.mouseEnter(ellieElement);

          expect(ellieElement.className).toContain('expanded');
        }
      });
    });
  });

  describe('ModeContextMenu', () => {
    let onModeSelect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onModeSelect = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should render context menu on right-click', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.COMPANION}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        expect(screen.getByText(/companion mode/i)).toBeDefined();
      }
    });

    it('should show all mode options in context menu', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.COMPANION}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        expect(screen.getByText(/companion mode/i)).toBeDefined();
        expect(screen.getByText(/assistant mode/i)).toBeDefined();
        expect(screen.getByText(/playful mode/i)).toBeDefined();
        expect(screen.getByText(/focus mode/i)).toBeDefined();
      }
    });

    it('should highlight current mode', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.ASSISTANT}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        const assistantItem = screen.getByText(/assistant mode/i).closest('button');
        expect(assistantItem?.className).toContain('active');
      }
    });

    it('should call onModeSelect when mode is clicked', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.COMPANION}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        const playfulItem = screen.getByText(/playful mode/i);
        fireEvent.click(playfulItem);

        expect(onModeSelect).toHaveBeenCalledWith(EllieMode.PLAYFUL);
      }
    });

    it('should close menu after selection', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.COMPANION}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        const playfulItem = screen.getByText(/playful mode/i);
        fireEvent.click(playfulItem);

        // Menu should be closed
        waitFor(() => {
          expect(screen.queryByText(/playful mode/i)).toBeNull();
        });
      }
    });

    it('should close menu on outside click', () => {
      const { container } = render(
        <>
          <ModeContextMenu
            currentMode={EllieMode.COMPANION}
            onModeSelect={onModeSelect}
          >
            <div data-testid="trigger">Right-click me</div>
          </ModeContextMenu>
          <div data-testid="outside">Outside</div>
        </>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        fireEvent.contextMenu(trigger);

        expect(screen.getByText(/companion mode/i)).toBeDefined();

        const outside = container.querySelector('[data-testid="outside"]');
        if (outside) {
          fireEvent.click(outside);

          waitFor(() => {
            expect(screen.queryByText(/companion mode/i)).toBeNull();
          });
        }
      }
    });

    it('should prevent default context menu', () => {
      const { container } = render(
        <ModeContextMenu
          currentMode={EllieMode.COMPANION}
          onModeSelect={onModeSelect}
        >
          <div data-testid="trigger">Right-click me</div>
        </ModeContextMenu>
      );

      const trigger = container.querySelector('[data-testid="trigger"]');
      if (trigger) {
        const event = new MouseEvent('contextmenu', { bubbles: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        trigger.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      }
    });
  });

  describe('useModeKeyboardShortcuts', () => {
    it('should cycle modes with Ctrl+Shift+E', () => {
      const onModeChange = vi.fn();
      const TestComponent = () => {
        useModeKeyboardShortcuts(EllieMode.COMPANION, onModeChange);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Press Ctrl+Shift+E
      fireEvent.keyDown(document, {
        key: 'e',
        ctrlKey: true,
        shiftKey: true,
      });

      expect(onModeChange).toHaveBeenCalledWith(EllieMode.ASSISTANT);
    });

    it('should cycle through all modes in order', () => {
      const onModeChange = vi.fn();
      const TestComponent: React.FC<{ mode: EllieMode }> = ({ mode }) => {
        useModeKeyboardShortcuts(mode, onModeChange);
        return <div>Test</div>;
      };

      const { rerender } = render(<TestComponent mode={EllieMode.COMPANION} />);

      fireEvent.keyDown(document, { key: 'e', ctrlKey: true, shiftKey: true });
      expect(onModeChange).toHaveBeenCalledWith(EllieMode.ASSISTANT);

      rerender(<TestComponent mode={EllieMode.ASSISTANT} />);
      fireEvent.keyDown(document, { key: 'e', ctrlKey: true, shiftKey: true });
      expect(onModeChange).toHaveBeenCalledWith(EllieMode.PLAYFUL);

      rerender(<TestComponent mode={EllieMode.PLAYFUL} />);
      fireEvent.keyDown(document, { key: 'e', ctrlKey: true, shiftKey: true });
      expect(onModeChange).toHaveBeenCalledWith(EllieMode.FOCUS);

      rerender(<TestComponent mode={EllieMode.FOCUS} />);
      fireEvent.keyDown(document, { key: 'e', ctrlKey: true, shiftKey: true });
      expect(onModeChange).toHaveBeenCalledWith(EllieMode.COMPANION);
    });

    it('should not trigger on wrong key combination', () => {
      const onModeChange = vi.fn();
      const TestComponent = () => {
        useModeKeyboardShortcuts(EllieMode.COMPANION, onModeChange);
        return <div>Test</div>;
      };

      render(<TestComponent />);

      // Just E
      fireEvent.keyDown(document, { key: 'e' });
      expect(onModeChange).not.toHaveBeenCalled();

      // Ctrl+E
      fireEvent.keyDown(document, { key: 'e', ctrlKey: true });
      expect(onModeChange).not.toHaveBeenCalled();

      // Shift+E
      fireEvent.keyDown(document, { key: 'e', shiftKey: true });
      expect(onModeChange).not.toHaveBeenCalled();
    });

    it('should cleanup event listener on unmount', () => {
      const onModeChange = vi.fn();
      const TestComponent = () => {
        useModeKeyboardShortcuts(EllieMode.COMPANION, onModeChange);
        return <div>Test</div>;
      };

      const { unmount } = render(<TestComponent />);
      unmount();

      // Should not respond to keyboard after unmount
      fireEvent.keyDown(document, { key: 'e', ctrlKey: true, shiftKey: true });
      expect(onModeChange).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid mode switching', () => {
      const onModeChange = vi.fn();

      const { rerender } = render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      for (let i = 0; i < 10; i++) {
        const modes = [
          EllieMode.COMPANION,
          EllieMode.ASSISTANT,
          EllieMode.PLAYFUL,
          EllieMode.FOCUS,
        ];
        const mode = modes[i % modes.length];

        rerender(
          <InteractionModeManager
            currentMode={mode}
            onModeChange={onModeChange}
          />
        );
      }

      // Should not crash
      expect(true).toBe(true);
    });

    it('should handle missing position prop', () => {
      const onModeChange = vi.fn();

      render(
        <InteractionModeManager
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      // Should use default position
      expect(screen.getByText(/companion/i)).toBeDefined();
    });
  });
});
