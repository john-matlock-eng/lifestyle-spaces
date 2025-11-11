/**
 * Tests for TimeBlock component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeBlock } from './TimeBlock';
import type { TimeBlock as TimeBlockType } from '../types/schedule.types';

describe('TimeBlock', () => {
  const mockTimeBlock: TimeBlockType = {
    id: 'test-1',
    startTime: '09:00',
    endTime: '10:00',
    activity: 'Team Meeting',
    activityType: 'work',
    description: 'Weekly sync with team',
    color: '#3b82f6',
  };

  it('should render time block with activity name', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} />);
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  it('should display time range', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} />);
    expect(screen.getByText(/9:00 AM - 10:00 AM/)).toBeInTheDocument();
  });

  it('should show description when provided', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} />);
    expect(screen.getByText('Weekly sync with team')).toBeInTheDocument();
  });

  it('should show collision warning when hasCollision is true', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} hasCollision />);
    expect(screen.getByText('Time conflict detected')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<TimeBlock timeBlock={mockTimeBlock} onClick={handleClick} />);

    const block = screen.getByRole('button');
    await user.click(block);

    expect(handleClick).toHaveBeenCalledWith(mockTimeBlock);
  });

  it('should call onEdit when edit button clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();

    render(<TimeBlock timeBlock={mockTimeBlock} onEdit={handleEdit} />);

    const editButton = screen.getByLabelText('Edit time block');
    await user.click(editButton);

    expect(handleEdit).toHaveBeenCalledWith(mockTimeBlock);
  });

  it('should call onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();

    render(<TimeBlock timeBlock={mockTimeBlock} onDelete={handleDelete} />);

    const deleteButton = screen.getByLabelText('Delete time block');
    await user.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledWith(mockTimeBlock);
  });

  it('should apply custom color', () => {
    const { container } = render(<TimeBlock timeBlock={mockTimeBlock} />);
    const blockElement = container.querySelector('.time-block');

    expect(blockElement).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('should apply dragging class when isDragging is true', () => {
    const { container } = render(<TimeBlock timeBlock={mockTimeBlock} isDragging />);
    const blockElement = container.querySelector('.time-block.dragging');

    expect(blockElement).toBeInTheDocument();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<TimeBlock timeBlock={mockTimeBlock} onClick={handleClick} />);

    const block = screen.getByRole('button');
    block.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledWith(mockTimeBlock);
  });

  it('should show activity type icon', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} />);
    const icon = screen.getByRole('img', { name: 'work' });
    expect(icon).toBeInTheDocument();
  });

  it('should show duration', () => {
    render(<TimeBlock timeBlock={mockTimeBlock} />);
    expect(screen.getByText(/1h/)).toBeInTheDocument();
  });
});
