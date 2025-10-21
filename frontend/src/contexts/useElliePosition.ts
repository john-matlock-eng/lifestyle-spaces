import { useContext } from 'react';
import type {
  ElliePositionContextValue,
} from './ElliePositionContextDefinition';
import {
  ElliePositionContext,
} from './ElliePositionContextDefinition';

export const useElliePosition = (): ElliePositionContextValue => {
  const context = useContext(ElliePositionContext);
  if (!context) {
    throw new Error('useElliePosition must be used within ElliePositionProvider');
  }
  return context;
};
