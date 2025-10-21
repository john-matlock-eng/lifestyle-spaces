// Re-export all types from a central location
export * from './auth.types';
export * from './space.types';
export * from './invitation.types';

// Common types used across the application
export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface FormErrors {
  [key: string]: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}