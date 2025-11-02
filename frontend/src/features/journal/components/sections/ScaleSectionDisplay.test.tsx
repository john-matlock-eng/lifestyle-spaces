import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScaleSectionDisplay } from './ScaleSectionDisplay';

describe('ScaleSectionDisplay', () => {
  it('should render numeric value', () => {
    render(<ScaleSectionDisplay value={7} />);

    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('should render string numeric value', () => {
    render(<ScaleSectionDisplay value="8" />);

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('should use custom max value from config', () => {
    render(<ScaleSectionDisplay value={5} config={{ max: 5 }} />);

    // Use more specific query for the value display
    expect(screen.getByText('/ 5')).toBeInTheDocument();
    const valueDisplay = screen.getByText('/ 5').previousSibling;
    expect(valueDisplay).toHaveTextContent('5');
  });

  it('should display label for value if provided in config', () => {
    const config = {
      labels: {
        '1': 'Very Low',
        '5': 'Medium',
        '10': 'Very High',
      },
    };

    render(<ScaleSectionDisplay value={5} config={config} />);

    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should not display center label if not provided for value', () => {
    const config = {
      labels: {
        '1': 'Very Low',
        '10': 'Very High',
      },
    };

    render(<ScaleSectionDisplay value={5} config={config} />);

    // Should not show "Medium" as a center label for value 5
    expect(screen.queryByText('Medium')).not.toBeInTheDocument();

    // But SHOULD show min/max labels at the bottom
    expect(screen.getByText('Very Low')).toBeInTheDocument(); // min label
    expect(screen.getByText('Very High')).toBeInTheDocument(); // max label
  });

  it('should handle invalid numeric value', () => {
    render(<ScaleSectionDisplay value="invalid" />);

    expect(screen.getByText('Invalid scale value')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<ScaleSectionDisplay value={7} className="custom-scale-class" />);

    expect(document.querySelector('.custom-scale-class')).toBeInTheDocument();
  });

  it('should calculate correct fill width', () => {
    const { container } = render(<ScaleSectionDisplay value={7} config={{ min: 0, max: 10 }} />);

    const fillElement = container.querySelector('.scale-fill');
    expect(fillElement).toHaveStyle({ width: '70%' });
  });

  it('should handle custom min/max range', () => {
    const { container } = render(<ScaleSectionDisplay value={5} config={{ min: 0, max: 5 }} />);

    const fillElement = container.querySelector('.scale-fill');
    expect(fillElement).toHaveStyle({ width: '100%' });
  });

  it('should display min and max labels at the bottom', () => {
    const config = {
      min: 1,
      max: 10,
      labels: {
        '1': 'Very Uncertain',
        '10': 'Highly Confident',
      },
    };

    render(<ScaleSectionDisplay value={7} config={config} />);

    // Should show min and max labels
    expect(screen.getByText('Very Uncertain')).toBeInTheDocument();
    expect(screen.getByText('Highly Confident')).toBeInTheDocument();
  });

  it('should display numeric min/max when no labels provided', () => {
    const { container } = render(<ScaleSectionDisplay value={5} config={{ min: 1, max: 10 }} />);

    // Should show numeric values as labels when no label strings provided
    const minLabel = container.querySelector('.scale-label-min');
    const maxLabel = container.querySelector('.scale-label-max');
    expect(minLabel).toHaveTextContent('1');
    expect(maxLabel).toHaveTextContent('10');
  });
});
