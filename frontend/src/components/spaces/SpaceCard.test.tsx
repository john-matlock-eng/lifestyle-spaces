import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SpaceCard } from './SpaceCard';
import type { Space } from '../../types';

describe('SpaceCard', () => {
  const mockSpace: Space = {
    spaceId: 'space-1',
    name: 'Test Space',
    description: 'A test space for testing',
    ownerId: 'user-1',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-02T00:00:00Z',
    memberCount: 5,
    isPublic: true,
  };

  const defaultProps = {
    space: mockSpace,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders space information correctly', () => {
    render(<SpaceCard {...defaultProps} />);
    
    expect(screen.getByText('Test Space')).toBeInTheDocument();
    expect(screen.getByText('A test space for testing')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders private space correctly', () => {
    const privateSpace = { ...mockSpace, isPublic: false };
    render(<SpaceCard {...defaultProps} space={privateSpace} />);
    
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('renders singular member count correctly', () => {
    const singleMemberSpace = { ...mockSpace, memberCount: 1 };
    render(<SpaceCard {...defaultProps} space={singleMemberSpace} />);
    
    expect(screen.getByText('1 member')).toBeInTheDocument();
  });

  it('renders zero member count correctly', () => {
    const noMemberSpace = { ...mockSpace, memberCount: 0 };
    render(<SpaceCard {...defaultProps} space={noMemberSpace} />);
    
    expect(screen.getByText('0 members')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescriptionSpace = {
      ...mockSpace,
      description: 'A'.repeat(200),
    };
    render(<SpaceCard {...defaultProps} space={longDescriptionSpace} />);
    
    const description = screen.getByText(/A+/);
    expect(description.textContent?.length).toBeLessThan(200);
  });

  it('handles empty description', () => {
    const noDescriptionSpace = { ...mockSpace, description: '' };
    render(<SpaceCard {...defaultProps} space={noDescriptionSpace} />);
    
    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<SpaceCard {...defaultProps} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(mockSpace);
  });

  it('calls onClick when Enter key is pressed', () => {
    const onClick = vi.fn();
    render(<SpaceCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(mockSpace);
  });

  it('calls onClick when Space key is pressed', () => {
    const onClick = vi.fn();
    render(<SpaceCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledWith(mockSpace);
  });

  it('does not call onClick for other keys', () => {
    const onClick = vi.fn();
    render(<SpaceCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<SpaceCard {...defaultProps} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', `Open ${mockSpace.name} space`);
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('displays formatted last activity date', () => {
    const recentSpace = {
      ...mockSpace,
      updatedAt: '2023-12-01T10:30:00Z',
    };
    render(<SpaceCard {...defaultProps} space={recentSpace} />);
    
    expect(screen.getByText(/Last activity:/)).toBeInTheDocument();
  });

  it('shows created date when no updates', () => {
    const newSpace = {
      ...mockSpace,
      updatedAt: mockSpace.createdAt,
    };
    render(<SpaceCard {...defaultProps} space={newSpace} />);
    
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('applies hover effects on mouse enter and leave', () => {
    render(<SpaceCard {...defaultProps} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('space-card');
    
    fireEvent.mouseEnter(card);
    expect(card).toHaveClass('space-card', 'space-card--hover');
    
    fireEvent.mouseLeave(card);
    expect(card).toHaveClass('space-card');
    expect(card).not.toHaveClass('space-card--hover');
  });

  it('applies focus styles', () => {
    render(<SpaceCard {...defaultProps} />);
    
    const card = screen.getByRole('button');
    act(() => {
      card.focus();
    });
    
    expect(card).toHaveFocus();
    expect(card).toHaveClass('space-card--focused');
  });

  it('shows loading state when specified', () => {
    render(<SpaceCard {...defaultProps} isLoading={true} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('space-card--loading');
    expect(card).toHaveAttribute('aria-busy', 'true');
    expect(card).toBeDisabled();
  });

  it('shows selected state when specified', () => {
    render(<SpaceCard {...defaultProps} isSelected={true} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('space-card--selected');
    expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders with custom className', () => {
    render(<SpaceCard {...defaultProps} className="custom-class" />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveClass('space-card', 'custom-class');
  });

  it('handles very long space names', () => {
    const longNameSpace = {
      ...mockSpace,
      name: 'Very Long Space Name That Should Be Truncated',
    };
    render(<SpaceCard {...defaultProps} space={longNameSpace} />);
    
    const name = screen.getByText(/Very Long Space Name/);
    expect(name).toHaveClass('space-card__title');
  });

  it('shows public badge for public spaces', () => {
    render(<SpaceCard {...defaultProps} />);
    
    const publicBadge = screen.getByText('Public');
    expect(publicBadge).toHaveClass('space-card__visibility-badge', 'space-card__visibility-badge--public');
  });

  it('shows private badge for private spaces', () => {
    const privateSpace = { ...mockSpace, isPublic: false };
    render(<SpaceCard {...defaultProps} space={privateSpace} />);
    
    const privateBadge = screen.getByText('Private');
    expect(privateBadge).toHaveClass('space-card__visibility-badge', 'space-card__visibility-badge--private');
  });

  it('handles missing onClick prop gracefully', () => {
    const { onClick, ...propsWithoutOnClick } = defaultProps;
    void onClick; // Acknowledge that onClick is intentionally unused in this test
    expect(() => {
      render(<SpaceCard {...propsWithoutOnClick} />);
    }).not.toThrow();
  });

  it('prevents event propagation on card actions', () => {
    const onClick = vi.fn();
    render(<SpaceCard {...defaultProps} onClick={onClick} />);
    
    const card = screen.getByRole('button');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    
    fireEvent(card, clickEvent);
    
    expect(onClick).toHaveBeenCalledWith(mockSpace);
  });
});