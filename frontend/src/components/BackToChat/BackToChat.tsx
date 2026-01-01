/**
 * Back to Chat Floating Button
 *
 * Appears when user navigates to a journal from chat citations.
 * Returns them to the conversation.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import styles from './BackToChat.module.css';

export function BackToChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);

  // Only show if navigated from chat
  useEffect(() => {
    const fromChat = searchParams.get('fromChat') === 'true';
    const returnPath = sessionStorage.getItem('chatReturnPath');
    setIsVisible(fromChat && !!returnPath);
  }, [searchParams]);

  const handleClick = () => {
    const returnPath = sessionStorage.getItem('chatReturnPath');
    const scrollPosition = sessionStorage.getItem('chatScrollPosition');

    // Clean up session storage
    sessionStorage.removeItem('chatReturnPath');
    sessionStorage.removeItem('chatScrollPosition');

    if (returnPath) {
      navigate(returnPath);

      // Restore scroll position after navigation
      if (scrollPosition) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(scrollPosition, 10));
        });
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      className={styles.backButton}
      onClick={handleClick}
      aria-label="Back to chat"
    >
      <ArrowLeft size={18} />
      <MessageCircle size={18} />
      <span className={styles.buttonText}>Back to Chat</span>
    </button>
  );
}
