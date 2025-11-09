/**
 * Real-time synchronization hook for TipTap journals with embedded highlights
 *
 * This hook handles:
 * - Syncing TipTap document changes across users
 * - Broadcasting highlight creation/deletion
 * - Updating comment counts on highlights
 * - Managing WebSocket connection
 */

import { useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useHighlightsRealtime } from './useHighlightsRealtime';

export interface TipTapSyncOptions {
  editor: Editor | null;
  journalId: string;
  spaceId: string;
  onRemoteUpdate?: (content: any) => void;
  enabled?: boolean;
}

export const useTipTapSync = ({
  editor,
  journalId,
  spaceId,
  onRemoteUpdate,
  enabled = true,
}: TipTapSyncOptions) => {
  const isLocalChange = useRef(false);
  const lastSyncedContent = useRef<string | null>(null);

  // Use existing real-time highlights infrastructure
  const {
    isConnected,
    isConnecting,
  } = useHighlightsRealtime(spaceId, journalId);

  /**
   * Broadcast local document changes to other users
   */
  const broadcastDocumentChange = useCallback(() => {
    if (!editor || !isConnected || !enabled) return;

    const content = editor.getJSON();
    const contentStr = JSON.stringify(content);

    // Only broadcast if content actually changed
    if (contentStr === lastSyncedContent.current) {
      return;
    }

    lastSyncedContent.current = contentStr;
    isLocalChange.current = true;

    // Broadcast via WebSocket
    // This would connect to your WebSocket manager
    console.log('[TipTapSync] Broadcasting document update:', {
      journalId,
      contentSize: contentStr.length,
    });

    // TODO: Implement actual WebSocket broadcast
    // ws.send({ type: 'DOCUMENT_UPDATED', payload: { journalId, content } });
  }, [editor, isConnected, journalId, enabled]);

  /**
   * Handle incoming document updates from other users
   */
  const handleRemoteUpdate = useCallback(
    (payload: any) => {
      if (!editor || !enabled) return;

      // Ignore our own updates
      if (isLocalChange.current) {
        isLocalChange.current = false;
        return;
      }

      console.log('[TipTapSync] Received remote update:', payload);

      // Apply remote changes
      if (payload.content_tiptap) {
        editor.commands.setContent(payload.content_tiptap, false);
        lastSyncedContent.current = JSON.stringify(payload.content_tiptap);

        if (onRemoteUpdate) {
          onRemoteUpdate(payload.content_tiptap);
        }
      }
    },
    [editor, enabled, onRemoteUpdate]
  );

  /**
   * Handle highlight-specific updates
   */
  const handleHighlightUpdate = useCallback(
    (payload: any) => {
      if (!editor || !enabled) return;

      switch (payload.type) {
        case 'HIGHLIGHT_CREATED':
          // Another user created a highlight - it should already be in their document update
          console.log('[TipTapSync] Remote highlight created:', payload.id);
          break;

        case 'HIGHLIGHT_DELETED':
          // Another user deleted a highlight - remove it from our document
          if (payload.highlight_id && editor.commands.unsetHighlight) {
            editor.commands.unsetHighlight(payload.highlight_id);
          }
          break;

        case 'HIGHLIGHT_COMMENT_COUNT_UPDATED':
          // Update comment count on a highlight
          if (payload.highlight_id && payload.comment_count !== undefined) {
            if (editor.commands.updateHighlightCommentCount) {
              editor.commands.updateHighlightCommentCount(
                payload.highlight_id,
                payload.comment_count
              );
            }
          }
          break;

        default:
          console.log('[TipTapSync] Unknown highlight update type:', payload.type);
      }
    },
    [editor, enabled]
  );

  /**
   * Listen for editor updates and broadcast changes
   */
  useEffect(() => {
    if (!editor || !enabled) return;

    const handleUpdate = () => {
      // Debounce: wait a bit after user stops typing
      const timeoutId = setTimeout(() => {
        broadcastDocumentChange();
      }, 1000);

      return () => clearTimeout(timeoutId);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, enabled, broadcastDocumentChange]);

  /**
   * Listen for WebSocket messages
   */
  useEffect(() => {
    if (!enabled) return;

    // Set up WebSocket listeners
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'JOURNAL_UPDATED':
            handleRemoteUpdate(data.payload);
            break;

          case 'HIGHLIGHT_CREATED':
          case 'HIGHLIGHT_DELETED':
          case 'HIGHLIGHT_COMMENT_COUNT_UPDATED':
            handleHighlightUpdate(data.payload);
            break;

          default:
            // Ignore other message types
            break;
        }
      } catch (error) {
        console.error('[TipTapSync] Failed to parse WebSocket message:', error);
      }
    };

    // TODO: Connect to actual WebSocket
    // const ws = getWebSocket(spaceId, journalId);
    // ws.addEventListener('message', handleMessage);

    return () => {
      // TODO: Clean up WebSocket listener
      // ws.removeEventListener('message', handleMessage);
    };
  }, [enabled, handleRemoteUpdate, handleHighlightUpdate, spaceId, journalId]);

  return {
    isConnected,
    isConnecting,
    broadcastDocumentChange,
  };
};
