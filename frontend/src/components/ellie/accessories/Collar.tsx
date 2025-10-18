import React from 'react';
import type { CollarStyle } from '../types/ellie.types';
import { LeatherCollar } from './LeatherCollar';
import { FabricCollar } from './FabricCollar';
import { BowtieCollar } from './BowtieCollar';
import { BandanaCollar } from './BandanaCollar';

export interface CollarProps {
  style: CollarStyle;
  color: string;
  showTag?: boolean;
  className?: string;
}

export const Collar: React.FC<CollarProps> = ({ style, color, showTag = false, className = '' }) => {
  if (style === 'none') {
    return null;
  }

  switch (style) {
    case 'leather':
      return <LeatherCollar color={color} showTag={showTag} className={className} />;
    case 'fabric':
      return <FabricCollar color={color} showTag={showTag} className={className} />;
    case 'bowtie':
      return <BowtieCollar color={color} showTag={showTag} className={className} />;
    case 'bandana':
      return <BandanaCollar color={color} className={className} />;
    default:
      return null;
  }
};
