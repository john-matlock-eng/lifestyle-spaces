/**
 * Chat Suggestions Component
 *
 * Quick prompt buttons for new conversations.
 * Supports dynamic suggestions from the backend.
 */

import {
  TrendingUp,
  Heart,
  Target,
  Sparkles,
  HelpCircle,
  MessageCircle,
  Star,
  AlertCircle,
  Lightbulb,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import type { Suggestion } from '../types';
import styles from './Chat.module.css';

interface ChatSuggestionsProps {
  suggestions?: Suggestion[];
  onSelect: (suggestion: string) => void;
}

// Default suggestions as fallback
const defaultSuggestions: Suggestion[] = [
  { icon: 'TrendingUp', text: 'What patterns do you see in my journals?', category: 'patterns' },
  { icon: 'Heart', text: 'What have I been grateful for lately?', category: 'gratitude' },
  { icon: 'Target', text: 'How am I progressing on my goals?', category: 'goals' },
  { icon: 'Sparkles', text: 'What insights can you share from my reflections?', category: 'insights' },
];

// Icon name to component mapping
const iconMap: Record<string, LucideIcon> = {
  TrendingUp,
  TrendingDown,
  Heart,
  Target,
  Sparkles,
  HelpCircle,
  MessageCircle,
  Star,
  AlertCircle,
  Lightbulb,
};

// Helper to get icon component by name
function getIconComponent(iconName: string): LucideIcon {
  return iconMap[iconName] || MessageCircle;
}

export function ChatSuggestions({ suggestions, onSelect }: ChatSuggestionsProps) {
  const displaySuggestions =
    suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <div className={styles.suggestions}>
      <p className={styles.suggestionsTitle}>Try asking:</p>
      <div className={styles.suggestionsList}>
        {displaySuggestions.map((suggestion, index) => {
          const IconComponent = getIconComponent(suggestion.icon);
          return (
            <button
              key={index}
              onClick={() => onSelect(suggestion.text)}
              className={styles.suggestionButton}
            >
              <IconComponent size={16} />
              <span>{suggestion.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
