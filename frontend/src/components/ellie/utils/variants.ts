import type { EllieVariant } from '../types/ellie.types';

export interface VariantColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Get color scheme for a given variant
 */
export const getVariantColors = (variant: EllieVariant = 'default'): VariantColors => {
  switch (variant) {
    case 'winter':
      return { primary: '#E0F2FE', secondary: '#7DD3FC', accent: '#0EA5E9' };
    case 'party':
      return { primary: '#FEF3C7', secondary: '#FDE68A', accent: '#F59E0B' };
    case 'workout':
      return { primary: '#D1FAE5', secondary: '#6EE7B7', accent: '#10B981' };
    case 'balloon':
      // Vibrant balloon party colors - pink tones with hot pink accent
      return { primary: '#FDE2E4', secondary: '#E0B1CB', accent: '#BE185D' };
    default:
      return { primary: 'white', secondary: '#e5e7eb', accent: '#8B4513' };
  }
};

/**
 * Get the effective fur color based on furColor prop and variant
 * If furColor is provided, it takes precedence over variant colors
 * The variant parameter is used to determine gradient colors via getVariantColors()
 */
export const getEffectiveFurColor = (
  furColor?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _variant: EllieVariant = 'default'
): string => {
  if (furColor) {
    return furColor;
  }

  // Use gradient from variant colors (variant is used by caller to set gradient stops)
  return `url(#ellie-fur-gradient)`;
};

/**
 * Get nose color based on fur color for good contrast
 */
export const getNoseColor = (furColorValue?: string): string => {
  if (!furColorValue || furColorValue.startsWith('url(')) {
    return '#2c1810'; // Default dark brown nose
  }

  const lightColors = ['#FFFFFF', '#F5DEB3', '#D2691E', '#E0F2FE', '#FEF3C7', '#D1FAE5', '#FDE2E4'];
  const darkColors = ['#8B4513', '#696969', '#000000'];

  const upperFurColor = furColorValue.toUpperCase();

  // Light fur -> dark nose
  if (lightColors.some(color => upperFurColor.includes(color))) {
    return '#000000'; // Black nose for light fur
  }

  // Dark fur -> lighter nose
  if (darkColors.some(color => upperFurColor.includes(color))) {
    return '#D2691E'; // Chocolate/tan nose for dark fur
  }

  return '#2c1810'; // Default brown nose
};
