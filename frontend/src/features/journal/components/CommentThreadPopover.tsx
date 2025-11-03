import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MessageCircle, Check, Filter, ChevronDown } from 'lucide-react';
import type { Comment, Highlight } from '../types/highlight.types';
import {
  Popover,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CommentThreadPopoverProps {
  highlight: Highlight;
  comments: Comment[];
  spaceMembers: Array<{ id: string; name: string }>; // Reserved for future @mention functionality
  currentUserId: string;
  onAddComment: (text: string, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  onResolveComment: (commentId: string, resolved: boolean) => void;
  onClose: () => void;
  filterMode?: 'all' | 'mine' | 'collaborators';
  onFilterChange?: (mode: 'all' | 'mine' | 'collaborators') => void;
  // Position props for desktop popover (reserved for visual connector positioning)
  anchorRect?: DOMRect;
  open: boolean;
}

type FilterMode = 'all' | 'mine' | 'collaborators';

const CommentThreadPopover: React.FC<CommentThreadPopoverProps> = ({
  highlight,
  comments,
  // spaceMembers reserved for future @mention autocomplete
  currentUserId,
  onAddComment,
  onDeleteComment,
  onResolveComment,
  onClose,
  filterMode = 'all',
  onFilterChange,
  // anchorRect reserved for visual connector line positioning
  open,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [localFilterMode, setLocalFilterMode] = useState<FilterMode>(filterMode);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Filter comments based on selected mode
  const filteredComments = useCallback(() => {
    switch (localFilterMode) {
      case 'mine':
        return comments.filter(c => c.author === currentUserId);
      case 'collaborators':
        return comments.filter(c => c.author !== currentUserId);
      case 'all':
      default:
        return comments;
    }
  }, [comments, currentUserId, localFilterMode]);

  const handleFilterChange = (mode: FilterMode) => {
    setLocalFilterMode(mode);
    onFilterChange?.(mode);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    onAddComment(commentText, replyingTo || undefined);
    setCommentText('');
    setReplyingTo(null);
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    textareaRef.current?.focus();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Render single comment
  const renderComment = (comment: Comment, isNested = false) => {
    const isAuthor = comment.author === currentUserId;
    const replies = comments.filter(c => c.parentCommentId === comment.id);

    return (
      <div
        key={comment.id}
        className={cn(
          'space-y-2',
          isNested && 'ml-8 mt-2 border-l-2 border-white/10 pl-4'
        )}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {getInitials(comment.authorName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-foreground">
                {comment.authorName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(comment.createdAt)}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-muted-foreground italic">
                  (edited)
                </span>
              )}
              {comment.isResolved && (
                <Badge variant="success" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>

            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
              {comment.text}
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReply(comment.id)}
                className="h-8 text-xs"
              >
                Reply
              </Button>

              {!comment.parentCommentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResolveComment(comment.id, !comment.isResolved)}
                  className="h-8 text-xs"
                >
                  {comment.isResolved ? 'Unresolve' : 'Resolve'}
                </Button>
              )}

              {isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteComment(comment.id)}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="space-y-2">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  // Shared content for both desktop and mobile
  const ThreadContent = () => (
    <div className="flex flex-col h-full">
      {/* Header with quoted text - MOST PROMINENT */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">
              Commenting on:
            </div>
            <blockquote className="text-base font-medium text-foreground border-l-4 border-primary pl-3 py-1 italic">
              "{highlight.highlightedText}"
            </blockquote>
          </div>

          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 flex-shrink-0"
              aria-label="Close comments"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter dropdown - collapsed by default */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-muted-foreground">
            {filteredComments().length} {filteredComments().length === 1 ? 'comment' : 'comments'}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-2" />
                {localFilterMode === 'all' ? 'All' : localFilterMode === 'mine' ? 'My comments' : 'Collaborators'}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleFilterChange('all')}>
                All comments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('mine')}>
                My comments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterChange('collaborators')}>
                Collaborators
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Comments list - scrollable */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-4 pb-4">
          {filteredComments().length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No comments yet. Start the conversation!
              </p>
            </div>
          ) : (
            filteredComments()
              .filter(c => !c.parentCommentId) // Only show top-level comments
              .map(comment => renderComment(comment))
          )}
        </div>
      </ScrollArea>

      {/* Input section */}
      <div className="mt-4 pt-4 border-t border-white/10">
        {replyingTo && (
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
            <span>
              Replying to {comments.find(c => c.id === replyingTo)?.authorName}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(null)}
              className="h-6"
            >
              Cancel
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className={cn(
              'flex-1 min-h-[88px] resize-none rounded-md',
              'glass-morphism px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitComment();
              }
            }}
          />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="glass"
            size={isMobile ? 'touch' : 'sm'}
            onClick={handleSubmitComment}
            disabled={!commentText.trim()}
          >
            {replyingTo ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[70vh] p-6"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Comment Thread</SheetTitle>
            <SheetDescription>
              View and add comments on highlighted text
            </SheetDescription>
          </SheetHeader>

          {/* Drag handle */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-white/20" />

          <div className="h-full mt-4">
            <ThreadContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Margin Popover
  return (
    <Popover open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={16}
        className="w-[320px] p-4 max-h-[600px] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        <ThreadContent />

        {/* Visual connector line (will be styled with CSS) */}
        <div
          className="absolute left-0 top-4 -ml-4 w-4 h-[1px] bg-primary/50"
          aria-hidden="true"
        />
      </PopoverContent>
    </Popover>
  );
};

export default CommentThreadPopover;
