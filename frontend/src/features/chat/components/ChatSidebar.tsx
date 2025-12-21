/**
 * Chat Sidebar Component (Desktop)
 *
 * Collapsible sidebar for desktop chat interface with resizable width.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, GripVertical } from 'lucide-react';
import { useChat } from '../useChat';
import { ChatContainer } from './ChatContainer';
import styles from './Chat.module.css';

interface ChatSidebarProps {
  spaceId: string;
}

const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 420;
const STORAGE_KEY = 'ellie-chat-sidebar-width';

export function ChatSidebar({ spaceId }: ChatSidebarProps) {
  const { isOpen, openChat, closeChat } = useChat();
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Math.min(Math.max(parseInt(saved, 10), MIN_WIDTH), MAX_WIDTH) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Update CSS variable when width changes
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.setProperty('--chat-sidebar-width', `${width}px`);
    }
  }, [width, isOpen]);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection while resizing
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

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
            ref={sidebarRef}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={isResizing ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
            className={styles.sidebar}
            style={{ width }}
          >
            {/* Resize handle */}
            <div
              className={styles.resizeHandle}
              onMouseDown={handleResizeStart}
              title="Drag to resize"
            >
              <GripVertical size={16} />
            </div>
            <ChatContainer spaceId={spaceId} onClose={closeChat} />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
