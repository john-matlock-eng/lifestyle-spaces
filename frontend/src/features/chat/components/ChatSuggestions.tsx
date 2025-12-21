/**
 * Chat Suggestions Component
 *
 * Quick prompt buttons for new conversations.
 */

import { Sparkles, TrendingUp, Heart, Target } from 'lucide-react';
import styles from './Chat.module.css';

interface ChatSuggestionsProps {
  onSelect: (suggestion: string) => void;
}

const suggestions = [
  {
    icon: TrendingUp,
    text: 'What patterns do you see in my journals?',
  },
  {
    icon: Heart,
    text: 'What have I been grateful for lately?',
  },
  {
    icon: Target,
    text: 'How am I progressing on my goals?',
  },
  {
    icon: Sparkles,
    text: 'What insights can you share from my reflections?',
  },
];

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  return (
    <div className={styles.suggestions}>
      <p className={styles.suggestionsTitle}>Try asking:</p>
      <div className={styles.suggestionsList}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion.text)}
            className={styles.suggestionButton}
          >
            <suggestion.icon size={16} />
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
