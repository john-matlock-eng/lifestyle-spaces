import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ModularEnhancedShihTzu } from '../ModularEnhancedShihTzu';
import EnhancedShihTzu from '../EnhancedShihTzu';
import { EllieProvider } from '../../../contexts/EllieContext';
import React from 'react';

// Mock GSAP for component tests
vi.mock('gsap', () => {
  const mockTimeline = {
    to: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    eventCallback: vi.fn().mockReturnThis(),
    kill: vi.fn(),
  };

  return {
    gsap: {
      timeline: vi.fn(() => mockTimeline),
      to: vi.fn(),
      set: vi.fn(),
      registerPlugin: vi.fn(),
    },
  };
});

vi.mock('@gsap/react', () => ({
  useGSAP: vi.fn(),
}));

// Wrapper component for tests that need EllieProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <EllieProvider>{children}</EllieProvider>
);

/**
 * Backward compatibility tests for the modular refactoring
 */
describe('Ellie Modular Refactoring - Backward Compatibility', () => {
  it('should export ModularEnhancedShihTzu component', () => {
    expect(ModularEnhancedShihTzu).toBeDefined();
  });

  it('should still export original EnhancedShihTzu component', () => {
    expect(EnhancedShihTzu).toBeDefined();
  });

  it('should render ModularEnhancedShihTzu without errors', () => {
    const { container } = render(<ModularEnhancedShihTzu mood="happy" />, { wrapper });
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should accept all expected props', () => {
    const { container } = render(
      <ModularEnhancedShihTzu
        mood="excited"
        size="md"
        furColor="#FFFFFF"
        collarStyle="leather"
        collarColor="#8B4513"
        showThoughtBubble={true}
        thoughtText="Hello!"
        particleEffect="hearts"
      />,
      { wrapper }
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render with different moods', () => {
    const moods = ['idle', 'happy', 'excited', 'curious', 'playful', 'sleeping'] as const;

    moods.forEach((mood) => {
      const { container } = render(<ModularEnhancedShihTzu mood={mood} />, { wrapper });
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.ellie-svg')).toHaveClass(`mood-${mood}`);
    });
  });

  it('should render with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const { container } = render(<ModularEnhancedShihTzu size={size} />, { wrapper });
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.ellie-svg')).toHaveClass(`ellie-${size}`);
    });
  });

  it('should render with different collar styles', () => {
    const collarStyles = ['none', 'leather', 'fabric', 'bowtie', 'bandana'] as const;

    collarStyles.forEach((collarStyle) => {
      const { container } = render(
        <ModularEnhancedShihTzu collarStyle={collarStyle} collarColor="#FF0000" />,
        { wrapper }
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('should render thought bubble when enabled', () => {
    const { getByText } = render(
      <ModularEnhancedShihTzu
        showThoughtBubble={true}
        thoughtText="I'm thinking!"
      />,
      { wrapper }
    );
    expect(getByText("I'm thinking!")).toBeInTheDocument();
  });
});
