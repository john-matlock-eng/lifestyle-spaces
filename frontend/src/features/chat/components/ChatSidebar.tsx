/**
 * Chat Sidebar Component (Desktop)
 *
 * Collapsible sidebar for desktop chat interface.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../useChat';
import { ChatContainer } from './ChatContainer';
import styles from './Chat.module.css';

interface ChatSidebarProps {
  spaceId: string;
}

export function ChatSidebar({ spaceId }: ChatSidebarProps) {
  const { isOpen, openChat, closeChat } = useChat();

  return (
    <>
      {/* Toggle button when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={openChat}
            className={styles.sidebarToggle}
            title="Open Ellie chat"
          >
            <MessageCircle size={24} />
            <span>Ask Ellie</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={styles.sidebar}
          >
            <ChatContainer spaceId={spaceId} onClose={closeChat} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
