import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MomentBlocksSection } from './MomentBlocksSection';
import type { MomentBlock } from '../../types/template.types';

describe('MomentBlocksSection', () => {
  const mockOnChange = vi.fn();
  const mockOnMomentAdd = vi.fn();
  const mockOnMomentRemove = vi.fn();
  const mockOnSubFieldComplete = vi.fn();

  const defaultConfig = {
    minMoments: 1,
    maxMoments: 3,
    defaultMoments: 1,
    textareaRows: 4,
    subFields: [
      { id: 'scene', label: 'The Scene', placeholder: 'What happened?' },
      { id: 'reaction', label: 'The Reaction', placeholder: 'How did you feel?' },
      { id: 'takeaway', label: 'The Takeaway', placeholder: 'What did you learn?', optional: true },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with default moment count', () => {
    render(
      <MomentBlocksSection
        value={[]}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    // Should initialize with 1 moment (defaultMoments)
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          scene: '',
          reaction: '',
          takeaway: '',
        }),
      ])
    );
  });

  it('should render existing moments', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: 'Scene 1', reaction: 'Reaction 1', takeaway: 'Takeaway 1' },
      { id: '2', scene: 'Scene 2', reaction: 'Reaction 2', takeaway: 'Takeaway 2' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.getByText('Moment 1')).toBeInTheDocument();
    expect(screen.getByText('Moment 2')).toBeInTheDocument();
  });

  it('should show add button when below maxMoments', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.getByText('Add another moment')).toBeInTheDocument();
  });

  it('should hide add button when at maxMoments', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
      { id: '2', scene: '', reaction: '', takeaway: '' },
      { id: '3', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.queryByText('Add another moment')).not.toBeInTheDocument();
  });

  it('should call onMomentAdd when adding a moment', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        onMomentAdd={mockOnMomentAdd}
        config={defaultConfig}
      />
    );

    fireEvent.click(screen.getByText('Add another moment'));

    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnMomentAdd).toHaveBeenCalled();
  });

  it('should show remove button when above minMoments', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
      { id: '2', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    // Should have 2 remove buttons (one for each moment)
    const removeButtons = screen.getAllByLabelText(/Remove moment/);
    expect(removeButtons).toHaveLength(2);
  });

  it('should hide remove button when at minMoments', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.queryByLabelText(/Remove moment/)).not.toBeInTheDocument();
  });

  it('should call onMomentRemove when removing a moment', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
      { id: '2', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        onMomentRemove={mockOnMomentRemove}
        config={defaultConfig}
      />
    );

    fireEvent.click(screen.getByLabelText('Remove moment 1'));

    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnMomentRemove).toHaveBeenCalledWith(0);
  });

  it('should update field value on change', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    const sceneTextarea = screen.getByPlaceholderText('What happened?');
    fireEvent.change(sceneTextarea, { target: { value: 'Something happened' } });

    expect(mockOnChange).toHaveBeenCalledWith([
      { id: '1', scene: 'Something happened', reaction: '', takeaway: '' },
    ]);
  });

  it('should call onSubFieldComplete on blur with content', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: 'Some scene', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        onSubFieldComplete={mockOnSubFieldComplete}
        config={defaultConfig}
      />
    );

    const sceneTextarea = screen.getByPlaceholderText('What happened?');
    fireEvent.blur(sceneTextarea);

    expect(mockOnSubFieldComplete).toHaveBeenCalledWith(0, 'scene');
  });

  it('should not call onSubFieldComplete on blur without content', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        onSubFieldComplete={mockOnSubFieldComplete}
        config={defaultConfig}
      />
    );

    const sceneTextarea = screen.getByPlaceholderText('What happened?');
    fireEvent.blur(sceneTextarea);

    expect(mockOnSubFieldComplete).not.toHaveBeenCalled();
  });

  it('should show optional label for optional fields', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('should handle string value (backward compatibility)', () => {
    const momentsJson = JSON.stringify([
      { id: '1', scene: 'Test', reaction: 'Test', takeaway: 'Test' },
    ]);

    render(
      <MomentBlocksSection
        value={momentsJson}
        onChange={mockOnChange}
        config={defaultConfig}
      />
    );

    expect(screen.getByText('Moment 1')).toBeInTheDocument();
  });

  it('should disable inputs when disabled prop is true', () => {
    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        disabled={true}
        config={defaultConfig}
      />
    );

    const sceneTextarea = screen.getByPlaceholderText('What happened?');
    expect(sceneTextarea).toBeDisabled();
  });

  it('should show hints when provided', () => {
    const config = {
      ...defaultConfig,
      subFields: [
        { id: 'scene', label: 'The Scene', placeholder: 'What happened?', hint: 'Describe the setting' },
      ],
    };

    const moments: MomentBlock[] = [
      { id: '1', scene: '', reaction: '', takeaway: '' },
    ];

    render(
      <MomentBlocksSection
        value={moments}
        onChange={mockOnChange}
        config={config}
      />
    );

    expect(screen.getByText('Describe the setting')).toBeInTheDocument();
  });
});
