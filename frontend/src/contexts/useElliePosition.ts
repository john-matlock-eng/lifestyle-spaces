import { useContext } from 'react';
import {
  ElliePositionContext,
  ElliePositionContextValue,
} from './ElliePositionContextDefinition';

export const useElliePosition = (): ElliePositionContextValue => {
  const context = useContext(ElliePositionContext);
  if (!context) {
    throw new Error('useElliePosition must be used within ElliePositionProvider');
  }
  return context;
};
