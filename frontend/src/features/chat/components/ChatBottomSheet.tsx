/**
 * Chat Bottom Sheet Component (Mobile)
 *
 * Swipe-up bottom sheet for mobile chat interface.
 */

import { useRef } from 'react';
import { motion, AnimatePresence, useDragControls, type PanInfo } from 'framer-motion';
import { MessageCircle, Minus } from 'lucide-react';
import { useChat } from '../useChat';
import { ChatContainer } from './ChatContainer';
import styles from './Chat.module.css';

interface ChatBottomSheetProps {
  spaceId: string;
}

export function ChatBottomSheet({ spaceId }: ChatBottomSheetProps) {
  const { isOpen, isExpanded, openChat, closeChat, expandChat, collapseChat } = useChat();
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    // If dragged up significantly, expand
    if (info.offset.y < -50) {
      expandChat();
    }
    // If dragged down significantly, collapse or close
    else if (info.offset.y > 50) {
      if (isExpanded) {
        collapseChat();
      } else {
        closeChat();
      }
    }
  };

  // Height variants
  const sheetHeight = isExpanded ? '85vh' : '60vh';

  return (
    <>
      {/* FAB trigger */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={openChat}
            className={styles.fab}
            aria-label="Open Ellie chat"
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className={styles.backdrop}
          />
        )}
      </AnimatePresence>

      {/* Bottom sheet */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={constraintsRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: sheetHeight }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className={styles.bottomSheet}
          >
            {/* Drag handle */}
            <div
              className={styles.dragHandle}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <Minus size={32} />
            </div>

            <ChatContainer spaceId={spaceId} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
