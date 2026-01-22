import { render, screen, fireEvent } from '@testing-library/react';
import { ElliePerch } from '../../../components/ellie/ElliePerch';
import { EllieProvider } from '../../../contexts/EllieContext';
import { EllieCustomizationProvider } from '../../../contexts/EllieCustomizationContext';
import { AuthProvider } from '../../../stores/authStore';

describe('ElliePerch', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <EllieCustomizationProvider>
        <EllieProvider>{children}</EllieProvider>
      </EllieCustomizationProvider>
    </AuthProvider>
  );

  it('should render at default perch', () => {
    render(<ElliePerch />, { wrapper });
    const perch = screen.getByTestId('ellie-perch');
    expect(perch).toBeInTheDocument();
    expect(perch).toHaveClass('perch-position-1');
  });

  it('should show cycle button', () => {
    render(<ElliePerch showPerchControl={true} />, { wrapper });
    // Button uses pet name from context (default: Lily)
    expect(screen.getByLabelText('Move Lily')).toBeInTheDocument();
  });

  it('should cycle perch on click', () => {
    render(<ElliePerch showPerchControl={true} />, { wrapper });
    const perch = screen.getByTestId('ellie-perch');
    expect(perch).toHaveClass('perch-position-1');

    fireEvent.click(screen.getByLabelText('Move Lily'));
    expect(perch).toHaveClass('perch-position-2');
  });

  it('should hide cycle button when disabled', () => {
    render(<ElliePerch showPerchControl={false} />, { wrapper });
    expect(screen.queryByLabelText('Move Lily')).not.toBeInTheDocument();
  });

  it('should apply typing class', () => {
    render(<ElliePerch />, { wrapper });
    const perch = screen.getByTestId('ellie-perch');
    expect(perch).toHaveAttribute('data-typing', 'false');
  });
});
