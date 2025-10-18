import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ModularEnhancedShihTzu } from '../ModularEnhancedShihTzu';
import EnhancedShihTzu from '../EnhancedShihTzu';

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
    const { container } = render(<ModularEnhancedShihTzu mood="happy" />);
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
      />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('should render with different moods', () => {
    const moods = ['idle', 'happy', 'excited', 'curious', 'playful', 'sleeping'] as const;

    moods.forEach((mood) => {
      const { container } = render(<ModularEnhancedShihTzu mood={mood} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.ellie-svg')).toHaveClass(`mood-${mood}`);
    });
  });

  it('should render with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const { container } = render(<ModularEnhancedShihTzu size={size} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      expect(container.querySelector('.ellie-svg')).toHaveClass(`ellie-${size}`);
    });
  });

  it('should render with different collar styles', () => {
    const collarStyles = ['none', 'leather', 'fabric', 'bowtie', 'bandana'] as const;

    collarStyles.forEach((collarStyle) => {
      const { container } = render(
        <ModularEnhancedShihTzu collarStyle={collarStyle} collarColor="#FF0000" />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('should render thought bubble when enabled', () => {
    const { getByText } = render(
      <ModularEnhancedShihTzu
        showThoughtBubble={true}
        thoughtText="I'm thinking!"
      />
    );
    expect(getByText("I'm thinking!")).toBeInTheDocument();
  });
});
