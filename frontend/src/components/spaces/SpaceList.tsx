import React, { useState, useEffect, useCallback } from 'react';
import { Space } from '../../types';
import { SpaceCard } from './SpaceCard';
import './spaces.css';

interface SpaceListProps {
  spaces: Space[];
  onSpaceClick: (space: Space) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  layout?: 'grid' | 'list';
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  sortable?: boolean;
  onSort?: (sortBy: string) => void;
  sortBy?: string;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  selectedSpaceId?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;
}

export const SpaceList: React.FC<SpaceListProps> = ({
  spaces,
  onSpaceClick,
  isLoading = false,
  error = null,
  onRetry,
  className = '',
  layout = 'grid',
  searchable = false,
  onSearch,
  searchQuery = '',
  sortable = false,
  onSort,
  sortBy = 'updated-desc',
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  selectedSpaceId,
  showSkeleton = false,
  skeletonCount = 6,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Debounced search
  useEffect(() => {
    if (!searchable || !onSearch) return;

    const timer = setTimeout(() => {
      onSearch(localSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, searchable, onSearch]);

  // Sync external search query with local state
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
  };

  const clearSearch = () => {
    setLocalSearchQuery('');
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (!spaces.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = (index + (layout === 'grid' ? 3 : 1)) % spaces.length;
        setFocusedIndex(nextIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = index - (layout === 'grid' ? 3 : 1);
        setFocusedIndex(prevIndex < 0 ? spaces.length + prevIndex : prevIndex);
        break;
      case 'ArrowRight':
        if (layout === 'grid') {
          e.preventDefault();
          setFocusedIndex((index + 1) % spaces.length);
        }
        break;
      case 'ArrowLeft':
        if (layout === 'grid') {
          e.preventDefault();
          setFocusedIndex(index - 1 < 0 ? spaces.length - 1 : index - 1);
        }
        break;
    }
  }, [spaces.length, layout]);

  const renderSkeleton = () => {
    return Array.from({ length: skeletonCount }, (_, index) => (
      <div 
        key={`skeleton-${index}`} 
        className="space-card-skeleton" 
        data-testid="space-card-skeleton"
        aria-hidden="true"
      >
        <div className="space-card-skeleton__header">
          <div className="space-card-skeleton__title" />
          <div className="space-card-skeleton__badge" />
        </div>
        <div className="space-card-skeleton__content">
          <div className="space-card-skeleton__description" />
          <div className="space-card-skeleton__description space-card-skeleton__description--short" />
        </div>
        <div className="space-card-skeleton__footer">
          <div className="space-card-skeleton__meta" />
        </div>
      </div>
    ));
  };

  const renderEmptyState = () => {
    if (searchable && localSearchQuery) {
      return (
        <div className="spaces-list__empty">
          <div className="spaces-list__empty-icon">🔍</div>
          <h3 className="spaces-list__empty-title">
            No spaces found matching "{localSearchQuery}"
          </h3>
          <p className="spaces-list__empty-description">
            Try adjusting your search terms or browse all spaces.
          </p>
        </div>
      );
    }

    return (
      <div className="spaces-list__empty">
        <div className="spaces-list__empty-icon">📁</div>
        <h3 className="spaces-list__empty-title">No spaces found</h3>
        <p className="spaces-list__empty-description">
          Create your first space to get started!
        </p>
      </div>
    );
  };

  const renderError = () => (
    <div className="spaces-list__error" role="alert">
      <div className="spaces-list__error-icon">⚠️</div>
      <div className="spaces-list__error-content">
        <h3 className="spaces-list__error-title">Unable to load spaces</h3>
        <p className="spaces-list__error-message">{error}</p>
        {onRetry && (
          <button 
            type="button"
            onClick={onRetry}
            className="btn btn-secondary spaces-list__retry-btn"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );

  const renderSearchBar = () => {
    if (!searchable) return null;

    return (
      <div className="spaces-list__search">
        <div className="spaces-list__search-input-container">
          <input
            type="text"
            placeholder="Search spaces..."
            value={localSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="spaces-list__search-input"
            aria-label="Search spaces"
          />
          {localSearchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="spaces-list__search-clear"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
          <div className="spaces-list__search-icon" aria-hidden="true">
            🔍
          </div>
        </div>
      </div>
    );
  };

  const renderSortControls = () => {
    if (!sortable || !onSort) return null;

    const sortOptions = [
      { value: 'updated-desc', label: 'Recently Updated' },
      { value: 'updated-asc', label: 'Oldest Updated' },
      { value: 'created-desc', label: 'Recently Created' },
      { value: 'created-asc', label: 'Oldest Created' },
      { value: 'name-asc', label: 'Name (A-Z)' },
      { value: 'name-desc', label: 'Name (Z-A)' },
      { value: 'members-desc', label: 'Most Members' },
      { value: 'members-asc', label: 'Fewest Members' },
    ];

    return (
      <div className="spaces-list__sort">
        <label htmlFor="sort-select" className="spaces-list__sort-label">
          Sort by
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSort(e.target.value)}
          className="spaces-list__sort-select"
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderLoadMore = () => {
    if (!hasMore || !onLoadMore) return null;

    return (
      <div className="spaces-list__load-more">
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isLoadingMore}
          className="btn btn-secondary spaces-list__load-more-btn"
        >
          {isLoadingMore ? 'Loading more...' : 'Load More'}
        </button>
      </div>
    );
  };

  const containerClasses = [
    'spaces-list',
    `spaces-list--${layout}`,
    className,
  ].filter(Boolean).join(' ');

  if (isLoading && showSkeleton) {
    return (
      <div className="spaces-list-wrapper">
        {renderSearchBar()}
        <div className="spaces-list__controls">
          {renderSortControls()}
        </div>
        <div 
          className={containerClasses}
          data-testid="spaces-container"
          role="grid"
          aria-label="Spaces list"
        >
          {renderSkeleton()}
        </div>
      </div>
    );
  }

  if (isLoading && !showSkeleton) {
    return (
      <div className="spaces-list__loading" role="status" aria-live="polite">
        <div className="spaces-list__loading-spinner" aria-hidden="true" />
        <span>Loading spaces...</span>
      </div>
    );
  }

  if (error) {
    return renderError();
  }

  if (!spaces.length) {
    return (
      <div className="spaces-list-wrapper">
        {renderSearchBar()}
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className="spaces-list-wrapper">
      {renderSearchBar()}
      <div className="spaces-list__controls">
        {renderSortControls()}
        <div className="spaces-list__count">
          {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
        </div>
      </div>
      
      <div 
        className={containerClasses}
        data-testid="spaces-container"
        role="grid"
        aria-label="Spaces list"
      >
        {spaces.map((space, index) => (
          <div key={space.spaceId} role="gridcell">
            <SpaceCard
              space={space}
              onClick={onSpaceClick}
              isSelected={selectedSpaceId === space.spaceId}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          </div>
        ))}
      </div>

      {renderLoadMore()}
    </div>
  );
};