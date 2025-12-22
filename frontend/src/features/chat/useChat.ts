/**
 * useChat Hook
 *
 * Hook for accessing chat context.
 */

import { useContext } from 'react';
import { ChatContext } from './ChatContext';

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
