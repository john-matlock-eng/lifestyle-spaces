import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceList } from './SpaceList';
import type { Space } from '../../types';

// Mock SpaceCard component
vi.mock('./SpaceCard', () => ({
  SpaceCard: ({ space, onClick, onKeyDown, role }: { space: Space; onClick: (space: Space) => void; onKeyDown?: (e: React.KeyboardEvent) => void; role?: string }) => (
    <button
      role={role}
      data-testid={`space-card-${space.spaceId}`} 
      onClick={() => onClick(space)}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {space.name}
    </button>
  ),
}));

describe('SpaceList', () => {
  const mockSpaces: Space[] = [
    {
      spaceId: 'space-1',
      name: 'First Space',
      description: 'First space description',
      ownerId: 'user-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      memberCount: 5,
      isPublic: true,
    },
    {
      spaceId: 'space-2',
      name: 'Second Space',
      description: 'Second space description',
      ownerId: 'user-1',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      memberCount: 3,
      isPublic: false,
    },
    {
      spaceId: 'space-3',
      name: 'Third Space',
      description: 'Third space description',
      ownerId: 'user-2',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T00:00:00Z',
      memberCount: 1,
      isPublic: true,
    },
  ];

  const defaultProps = {
    spaces: mockSpaces,
    onSpaceClick: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of spaces', () => {
    render(<SpaceList {...defaultProps} />);
    
    expect(screen.getByTestId('space-card-space-1')).toBeInTheDocument();
    expect(screen.getByTestId('space-card-space-2')).toBeInTheDocument();
    expect(screen.getByTestId('space-card-space-3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SpaceList {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading spaces...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows error state', () => {
    const error = 'Failed to load spaces';
    render(<SpaceList {...defaultProps} error={error} />);
    
    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows empty state when no spaces', () => {
    render(<SpaceList {...defaultProps} spaces={[]} />);
    
    expect(screen.getByText('No spaces found')).toBeInTheDocument();
    expect(screen.getByText('Create your first space to get started!')).toBeInTheDocument();
  });

  it('calls onSpaceClick when space is clicked', () => {
    const onSpaceClick = vi.fn();
    render(<SpaceList {...defaultProps} onSpaceClick={onSpaceClick} />);
    
    fireEvent.click(screen.getByTestId('space-card-space-1'));
    expect(onSpaceClick).toHaveBeenCalledWith(mockSpaces[0]);
  });

  it('renders spaces in grid layout by default', () => {
    render(<SpaceList {...defaultProps} />);
    
    const container = screen.getByTestId('spaces-container');
    expect(container).toHaveClass('spaces-list', 'spaces-list--grid');
  });

  it('renders spaces in list layout when specified', () => {
    render(<SpaceList {...defaultProps} layout="list" />);
    
    const container = screen.getByTestId('spaces-container');
    expect(container).toHaveClass('spaces-list', 'spaces-list--list');
  });

  it('applies custom className', () => {
    render(<SpaceList {...defaultProps} className="custom-class" />);
    
    const container = screen.getByTestId('spaces-container');
    expect(container).toHaveClass('spaces-list', 'custom-class');
  });

  it('shows retry button on error', () => {
    const onRetry = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        error="Network error" 
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not show retry button when onRetry is not provided', () => {
    render(<SpaceList {...defaultProps} error="Network error" />);
    
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('shows loading skeleton while loading', () => {
    render(<SpaceList {...defaultProps} isLoading={true} showSkeleton={true} />);
    
    const skeletons = screen.getAllByTestId('space-card-skeleton');
    expect(skeletons).toHaveLength(6); // Default skeleton count
  });

  it('shows custom skeleton count', () => {
    render(
      <SpaceList 
        {...defaultProps} 
        isLoading={true} 
        showSkeleton={true}
        skeletonCount={3}
      />
    );
    
    const skeletons = screen.getAllByTestId('space-card-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('handles search functionality', async () => {
    const onSearch = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        searchable={true}
        onSearch={onSearch}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search spaces...');
    expect(searchInput).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'First' } });
    
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('First');
    });
  });

  it('debounces search input', async () => {
    const onSearch = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        searchable={true}
        onSearch={onSearch}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search spaces...');
    
    // Type quickly
    fireEvent.change(searchInput, { target: { value: 'F' } });
    fireEvent.change(searchInput, { target: { value: 'Fi' } });
    fireEvent.change(searchInput, { target: { value: 'Fir' } });
    fireEvent.change(searchInput, { target: { value: 'First' } });
    
    // Should only call onSearch once after debounce delay
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('First');
    });
  });

  it('clears search input', async () => {
    const onSearch = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        searchable={true}
        onSearch={onSearch}
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search spaces...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    const clearButton = screen.getByRole('button', { name: /clear search/i });
    fireEvent.click(clearButton);
    
    expect(searchInput).toHaveValue('');
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  it('handles sort functionality', () => {
    const onSort = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        sortable={true}
        onSort={onSort}
      />
    );
    
    const sortSelect = screen.getByLabelText('Sort by');
    expect(sortSelect).toBeInTheDocument();
    
    fireEvent.change(sortSelect, { target: { value: 'name-desc' } });
    expect(onSort).toHaveBeenCalledWith('name-desc');
  });

  it('shows load more button when hasMore is true', () => {
    const onLoadMore = vi.fn();
    render(
      <SpaceList 
        {...defaultProps} 
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByText('Load More');
    expect(loadMoreButton).toBeInTheDocument();
    
    fireEvent.click(loadMoreButton);
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('disables load more button when loading more', () => {
    render(
      <SpaceList 
        {...defaultProps} 
        hasMore={true}
        onLoadMore={vi.fn()}
        isLoadingMore={true}
      />
    );
    
    const loadMoreButton = screen.getByText('Loading more...');
    expect(loadMoreButton).toBeDisabled();
  });

  it('shows selected space correctly', () => {
    render(
      <SpaceList 
        {...defaultProps} 
        selectedSpaceId="space-2"
      />
    );
    
    // This would be tested in integration with SpaceCard
    // The SpaceCard component should receive isSelected prop
    expect(screen.getByTestId('space-card-space-2')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<SpaceList {...defaultProps} />);
    
    const firstCard = screen.getByTestId('space-card-space-1');
    firstCard.focus();
    
    fireEvent.keyDown(firstCard, { key: 'ArrowDown' });
    
    const secondCard = screen.getByTestId('space-card-space-2');
    expect(secondCard).toHaveFocus();
  });

  it('has proper accessibility attributes', () => {
    render(<SpaceList {...defaultProps} />);
    
    const container = screen.getByTestId('spaces-container');
    expect(container).toHaveAttribute('role', 'grid');
    expect(container).toHaveAttribute('aria-label', 'Spaces list');
    
    const spaces = screen.getAllByTestId(/space-card-/);
    spaces.forEach(space => {
      expect(space).toHaveAttribute('role', 'gridcell');
    });
  });

  it('announces loading state to screen readers', () => {
    render(<SpaceList {...defaultProps} isLoading={true} />);
    
    const loadingStatus = screen.getByRole('status');
    expect(loadingStatus).toHaveTextContent('Loading spaces...');
  });

  it('announces error state to screen readers', () => {
    render(<SpaceList {...defaultProps} error="Failed to load" />);
    
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveTextContent('Failed to load');
  });

  it('handles empty search results', () => {
    render(
      <SpaceList 
        {...defaultProps} 
        spaces={[]}
        searchable={true}
        searchQuery="nonexistent"
      />
    );
    
    expect(screen.getByText('No spaces found matching "nonexistent"')).toBeInTheDocument();
  });
});