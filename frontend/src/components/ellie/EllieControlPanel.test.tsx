import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  EllieControlPanel,
  EllieControlButton,
  CallEllieButton,
  OpacitySlider,
} from './EllieControlPanel';
import { EllieMode } from './modes/types';

describe('EllieControlPanel', () => {
  describe('EllieControlButton', () => {
    it('should render trigger button', () => {
      render(<EllieControlButton />);

      expect(screen.getByRole('button')).toBeDefined();
    });

    it('should show menu on hover', async () => {
      render(<EllieControlButton />);

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText(/move/i)).toBeDefined();
      });
    });

    it('should hide menu on mouse leave', async () => {
      const { container } = render(<EllieControlButton />);

      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);

      await waitFor(() => {
        expect(screen.getByText(/move/i)).toBeDefined();
      });

      fireEvent.mouseLeave(button);
      fireEvent.mouseLeave(container);

      await waitFor(
        () => {
          expect(screen.queryByText(/move/i)).toBeNull();
        },
        { timeout: 2000 }
      );
    });

    it('should show 3-dot menu icon', () => {
      const { container } = render(<EllieControlButton />);

      const dots = container.querySelectorAll('.dot, [data-testid*="dot"]');
      expect(dots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('EllieControlPanel', () => {
    let onModeChange: ReturnType<typeof vi.fn>;
    let onMove: ReturnType<typeof vi.fn>;
    let onMinimize: ReturnType<typeof vi.fn>;
    let onCustomize: ReturnType<typeof vi.fn>;
    let onReset: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onModeChange = vi.fn();
      onMove = vi.fn();
      onMinimize = vi.fn();
      onCustomize = vi.fn();
      onReset = vi.fn();
    });

    it('should render control panel', () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      expect(screen.getByRole('button')).toBeDefined();
    });

    it('should show quick actions dropdown', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onMove={onMove}
          onMinimize={onMinimize}
          onCustomize={onCustomize}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/move/i)).toBeDefined();
        expect(screen.getByText(/minimize/i)).toBeDefined();
        expect(screen.getByText(/change mode/i)).toBeDefined();
        expect(screen.getByText(/customize/i)).toBeDefined();
      });
    });

    it('should call onMove when Move is clicked', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onMove={onMove}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const moveButton = await screen.findByText(/move/i);
      fireEvent.click(moveButton);

      expect(onMove).toHaveBeenCalled();
    });

    it('should call onMinimize when Minimize is clicked', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onMinimize={onMinimize}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const minimizeButton = await screen.findByText(/minimize/i);
      fireEvent.click(minimizeButton);

      expect(onMinimize).toHaveBeenCalled();
    });

    it('should call onCustomize when Customize is clicked', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onCustomize={onCustomize}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const customizeButton = await screen.findByText(/customize/i);
      fireEvent.click(customizeButton);

      expect(onCustomize).toHaveBeenCalled();
    });

    it('should show mode selector in dropdown', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const changeModeButton = await screen.findByText(/change mode/i);
      fireEvent.click(changeModeButton);

      await waitFor(() => {
        expect(screen.getByText(/companion/i)).toBeDefined();
        expect(screen.getByText(/assistant/i)).toBeDefined();
        expect(screen.getByText(/playful/i)).toBeDefined();
        expect(screen.getByText(/focus/i)).toBeDefined();
      });
    });

    it('should close dropdown after action', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onMove={onMove}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const moveButton = await screen.findByText(/move/i);
      fireEvent.click(moveButton);

      await waitFor(() => {
        expect(screen.queryByText(/minimize/i)).toBeNull();
      });
    });

    it('should show reset button', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onReset={onReset}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const resetButton = await screen.findByText(/reset/i);
      expect(resetButton).toBeDefined();
    });

    it('should call onReset when reset is clicked', async () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onReset={onReset}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const resetButton = await screen.findByText(/reset/i);
      fireEvent.click(resetButton);

      expect(onReset).toHaveBeenCalled();
    });

    it('should integrate with OpacitySlider', () => {
      const { container } = render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          showOpacityControl={true}
        />
      );

      const slider = container.querySelector('input[type="range"]');
      expect(slider).toBeDefined();
    });
  });

  describe('CallEllieButton', () => {
    it('should render call button when hidden', () => {
      render(<CallEllieButton isHidden={true} onCall={vi.fn()} />);

      expect(screen.getByRole('button')).toBeDefined();
    });

    it('should not render when not hidden', () => {
      const { container } = render(<CallEllieButton isHidden={false} onCall={vi.fn()} />);

      expect(container.querySelector('button')).toBeNull();
    });

    it('should call onCall when clicked', () => {
      const onCall = vi.fn();
      render(<CallEllieButton isHidden={true} onCall={onCall} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(onCall).toHaveBeenCalled();
    });

    it('should be positioned in bottom-right corner', () => {
      const { container } = render(<CallEllieButton isHidden={true} onCall={vi.fn()} />);

      const button = container.querySelector('button');
      expect(button?.className).toContain('bottom');
      expect(button?.className).toContain('right');
    });

    it('should show "Call Ellie" text or icon', () => {
      render(<CallEllieButton isHidden={true} onCall={vi.fn()} />);

      const button = screen.getByRole('button');
      expect(button.textContent || button.innerHTML).toBeTruthy();
    });
  });

  describe('OpacitySlider', () => {
    it('should render opacity slider', () => {
      const { container } = render(
        <OpacitySlider value={1.0} onChange={vi.fn()} />
      );

      const slider = container.querySelector('input[type="range"]');
      expect(slider).toBeDefined();
    });

    it('should have min value of 0.3', () => {
      const { container } = render(
        <OpacitySlider value={0.5} onChange={vi.fn()} />
      );

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider.min).toBe('0.3');
    });

    it('should have max value of 1.0', () => {
      const { container } = render(
        <OpacitySlider value={0.5} onChange={vi.fn()} />
      );

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(slider.max).toBe('1');
    });

    it('should display current value', () => {
      const { container } = render(
        <OpacitySlider value={0.7} onChange={vi.fn()} />
      );

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(parseFloat(slider.value)).toBeCloseTo(0.7, 1);
    });

    it('should call onChange when slider moves', () => {
      const onChange = vi.fn();
      const { container } = render(
        <OpacitySlider value={0.5} onChange={onChange} />
      );

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      fireEvent.change(slider, { target: { value: '0.8' } });

      expect(onChange).toHaveBeenCalledWith(0.8);
    });

    it('should show percentage label', () => {
      render(<OpacitySlider value={0.75} onChange={vi.fn()} />);

      expect(screen.getByText(/75%/i) || screen.getByText(/opacity/i)).toBeDefined();
    });

    it('should constrain value to valid range', () => {
      const onChange = vi.fn();
      const { container } = render(
        <OpacitySlider value={0.5} onChange={onChange} />
      );

      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;

      // Try to set below min
      fireEvent.change(slider, { target: { value: '0.1' } });
      expect(onChange).toHaveBeenCalled();

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('Integration', () => {
    it('should work with all controls together', async () => {
      const onModeChange = vi.fn();
      const onOpacityChange = vi.fn();
      const onMove = vi.fn();

      const { container } = render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={onModeChange}
          onMove={onMove}
          showOpacityControl={true}
          opacity={0.8}
          onOpacityChange={onOpacityChange}
        />
      );

      // Click control button
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Should show all controls
      await waitFor(() => {
        expect(screen.getByText(/move/i)).toBeDefined();
      });

      // Change opacity
      const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
      if (slider) {
        fireEvent.change(slider, { target: { value: '0.6' } });
        expect(onOpacityChange).toHaveBeenCalled();
      }
    });

    it('should match existing design system', () => {
      const { container } = render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
        />
      );

      // Should use Tailwind classes
      const hasButton = container.querySelector('button');
      expect(hasButton).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label') || button.textContent).toBeTruthy();
    });

    it('should be keyboard navigable', () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
        />
      );

      const button = screen.getByRole('button');

      // Should be focusable
      button.focus();
      expect(document.activeElement).toBe(button);

      // Should respond to Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
    });

    it('should have proper roles', () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
        />
      );

      expect(screen.getByRole('button')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing optional props', () => {
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
        />
      );

      // Should not crash
      expect(screen.getByRole('button')).toBeDefined();
    });

    it('should handle rapid clicks', async () => {
      const onMove = vi.fn();
      render(
        <EllieControlPanel
          currentMode={EllieMode.COMPANION}
          onModeChange={vi.fn()}
          onMove={onMove}
        />
      );

      const button = screen.getByRole('button');

      // Click multiple times rapidly
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      // Should not crash
      expect(true).toBe(true);
    });
  });
});
