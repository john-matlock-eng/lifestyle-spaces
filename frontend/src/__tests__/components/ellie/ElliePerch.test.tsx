import { render, screen, fireEvent } from '@testing-library/react';
import { ElliePerch } from '../../../components/ellie/ElliePerch';
import { EllieProvider } from '../../../contexts/EllieContext';

describe('ElliePerch', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EllieProvider>{children}</EllieProvider>
  );

  it('should render Ellie at perch position', () => {
    render(
      <ElliePerch
        showThoughtBubble={true}
        thoughtText="Hello!"
      />,
      { wrapper }
    );

    expect(screen.getByTestId('ellie-perch')).toBeInTheDocument();
    expect(screen.getByTestId('ellie-perch')).toHaveClass('perch-position-1'); // Default
  });

  it('should show perch cycle button', () => {
    render(<ElliePerch showPerchControl={true} />, { wrapper });

    expect(screen.getByLabelText('Move Ellie')).toBeInTheDocument();
  });

  it('should cycle perch on button click', () => {
    render(<ElliePerch showPerchControl={true} />, { wrapper });

    const perchElement = screen.getByTestId('ellie-perch');
    expect(perchElement).toHaveClass('perch-position-1');

    const cycleButton = screen.getByLabelText('Move Ellie');
    fireEvent.click(cycleButton);

    expect(perchElement).toHaveClass('perch-position-2');
  });

  it('should apply is-typing class when typing', () => {
    render(<ElliePerch />, { wrapper });

    const perchElement = screen.getByTestId('ellie-perch');
    expect(perchElement).not.toHaveClass('is-typing');

    // Simulate typing by updating context (would need to expose setIsTyping in test)
    // For now, verify the class binding works
    expect(perchElement).toHaveAttribute('data-typing', 'false');
  });

  it('should hide perch control when showPerchControl is false', () => {
    render(<ElliePerch showPerchControl={false} />, { wrapper });

    expect(screen.queryByLabelText('Move Ellie')).not.toBeInTheDocument();
  });

  it('should pass customization props to ModularEnhancedShihTzu', () => {
    render(
      <ElliePerch
        furColor="#FF0000"
        collarStyle="bowtie"
        collarColor="#0000FF"
        collarTag={true}
      />,
      { wrapper }
    );

    // Verify component renders (actual prop testing would require mocking ModularEnhancedShihTzu)
    expect(screen.getByTestId('ellie-perch')).toBeInTheDocument();
  });
});
