import React, { useState } from 'react';
import type { Space } from '../../types';
import './spaces.css';

interface SpaceCardProps {
  space: Space;
  onClick?: (space: Space) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isLoading?: boolean;
  isSelected?: boolean;
  className?: string;
  role?: string;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({
  space,
  onClick,
  onKeyDown,
  isLoading = false,
  isSelected = false,
  className = '',
  role,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleClick = () => {
    if (!isLoading && onClick) {
      onClick(space);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle selection keys
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
      return;
    }
    
    // Call external onKeyDown handler for navigation
    onKeyDown?.(e);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatMemberCount = (count: number) => {
    if (count === 1) return '1 member';
    return `${count} members`;
  };

  const truncateDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getActivityLabel = () => {
    const isUpdated = space.updatedAt !== space.createdAt;
    return isUpdated ? 'Last activity:' : 'Created:';
  };

  const getActivityDate = () => {
    const isUpdated = space.updatedAt !== space.createdAt;
    return formatDate(isUpdated ? space.updatedAt : space.createdAt);
  };

  const cardClasses = [
    'space-card',
    isHovered && 'space-card--hover',
    isFocused && 'space-card--focused',
    isLoading && 'space-card--loading',
    isSelected && 'space-card--selected',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cardClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={isLoading}
      tabIndex={0}
      role={role}
      data-testid={`space-card-${space.spaceId}`}
      aria-label={`Open ${space.name} space`}
      aria-busy={isLoading}
      aria-pressed={isSelected}
    >
      <div className="space-card__header">
        <h3 className="space-card__title" title={space.name}>
          {space.name}
        </h3>
        <div 
          className={`space-card__visibility-badge space-card__visibility-badge--${space.isPublic ? 'public' : 'private'}`}
        >
          {space.isPublic ? 'Public' : 'Private'}
        </div>
      </div>

      <div className="space-card__content">
        <p className="space-card__description" title={space.description}>
          {space.description 
            ? truncateDescription(space.description)
            : 'No description provided'
          }
        </p>
      </div>

      <div className="space-card__footer">
        <div className="space-card__meta">
          <div className="space-card__member-count">
            <span className="space-card__icon" aria-hidden="true">👥</span>
            <span>{formatMemberCount(space.memberCount)}</span>
          </div>
          
          <div className="space-card__activity">
            <span className="space-card__icon" aria-hidden="true">📅</span>
            <div className="space-card__activity-info">
              <span className="space-card__activity-label">
                {getActivityLabel()}
              </span>
              <span className="space-card__activity-date">
                {getActivityDate()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-card__loading-overlay">
          <div className="space-card__spinner" aria-hidden="true" />
        </div>
      )}
    </button>
  );
};