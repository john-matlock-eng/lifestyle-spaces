/**
 * useInvitations Hook
 * Custom hook for accessing invitation context
 */

import { useContext } from 'react';
import { InvitationContext, type InvitationContextType } from '../contexts/InvitationContext';

export function useInvitations(): InvitationContextType {
  const context = useContext(InvitationContext);
  if (!context) {
    throw new Error('useInvitations must be used within an InvitationProvider');
  }
  return context;
}