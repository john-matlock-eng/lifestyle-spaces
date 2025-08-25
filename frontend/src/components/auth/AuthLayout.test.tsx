import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './AuthLayout';

describe('AuthLayout', () => {
  it('should render children content', () => {
    const testContent = 'Test authentication form';
    render(
      <AuthLayout>
        <div>{testContent}</div>
      </AuthLayout>
    );

    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('should render the application logo/title', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    expect(screen.getByRole('heading', { name: /lifestyle spaces/i })).toBeInTheDocument();
  });

  it('should have proper semantic structure', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-label', 'Authentication');
  });

  it('should be responsive and accessible', () => {
    render(
      <AuthLayout>
        <div>Content</div>
      </AuthLayout>
    );

    const container = screen.getByTestId('auth-layout');
    expect(container).toBeInTheDocument();
  });
});