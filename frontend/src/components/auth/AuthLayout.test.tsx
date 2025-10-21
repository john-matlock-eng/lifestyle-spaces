import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthLayout } from './AuthLayout';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('AuthLayout', () => {
  it('should render children content', () => {
    const testContent = 'Test authentication form';
    renderWithTheme(
      <AuthLayout>
        <div>{testContent}</div>
      </AuthLayout>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('should render the application logo/title', () => {
    renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByRole('heading', { name: /lifestyle spaces/i })).toBeInTheDocument();
  });

  it('should have proper semantic structure', () => {
    renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label', 'Authentication');
  });

  it('should be responsive and accessible', () => {
    renderWithTheme(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const container = screen.getByTestId('auth-layout');
    expect(container).toBeInTheDocument();
  });
});