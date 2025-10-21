# Frontend Developer - Lifestyle Spaces Project Instructions

## Project-Specific Requirements

### Development Methodology
1. **TDD IS MANDATORY**
   - Write Vitest tests FIRST for every component/feature
   - Achieve 100% code coverage before marking complete
   - Use `npm run test:coverage`

### Testing Setup Required
```json
// Add to package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### Required Dependencies
```bash
# Testing dependencies (add to package.json)
npm install -D vitest @vitest/ui @testing-library/react 
npm install -D @testing-library/jest-dom @testing-library/user-event
npm install -D @vitest/coverage-v8 jsdom
```

### Project Structure
```
frontend/
├── src/
│   ├── components/       # Reusable components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API integration
│   ├── stores/          # State management
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── config/          # Configuration
├── tests/               # TEST FIRST!
│   ├── unit/           # Component tests
│   ├── integration/    # Feature tests
│   └── setup.ts        # Test configuration
├── public/             # Static assets
└── vite.config.ts      # Include test configuration
```

### Vite Configuration for Testing
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  }
})
```

### API Integration Pattern
```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })
    
    if (!response.ok) {
      throw new ApiError(response.status, await response.text())
    }
    
    return response.json()
  }
}
```

### Component Development Rules
1. **Write test first**
2. Functional components only (no class components)
3. Use TypeScript for all components
4. Props interface for every component
5. Memoization where appropriate
6. Accessibility (ARIA) attributes required

### Example Test-First Approach
```typescript
// tests/unit/Button.test.tsx - WRITE THIS FIRST!
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/Button'

describe('Button Component', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
  
  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
  
  it('should be disabled when specified', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByText('Disabled')).toBeDisabled()
  })
})

// THEN implement the component to pass tests
```

### State Management
- Use React Context for global state
- Local state with useState/useReducer
- Consider Zustand if complex state needed
- No Redux (unnecessary complexity for POC)

### Security Requirements
- Sanitize all user inputs
- Content Security Policy headers
- No sensitive data in localStorage
- API tokens in httpOnly cookies or memory
- XSS protection on all rendered content

### Performance Optimization
- Code splitting with React.lazy()
- Image optimization (WebP, lazy loading)
- Bundle size monitoring
- Lighthouse score > 90

### Styling Approach
- CSS Modules or styled-components
- Mobile-first responsive design
- Dark mode support from start
- Consistent design tokens

### Environment Configuration
```typescript
// .env files
.env                # Default
.env.local          # Local overrides (gitignored)
.env.production     # Production settings

// Usage
VITE_API_URL=https://api.example.com
VITE_AUTH_DOMAIN=auth.example.com
```

### Build Output for S3
- Static files optimized for CloudFront
- Proper cache headers configuration
- Gzipped assets
- Source maps for debugging (dev only)

### Coordination with Backend
- Use OpenAPI spec from backend
- Generate TypeScript types from API
- Mock API responses for testing
- Handle API errors gracefully

### Deliverables Checklist
- [ ] Tests written first (100% coverage)
- [ ] All components TypeScript typed
- [ ] API integration layer complete
- [ ] Authentication flow implemented
- [ ] Error boundaries configured
- [ ] Loading states for async operations
- [ ] Accessibility standards met
- [ ] Responsive design implemented
- [ ] Production build optimized
- [ ] Environment variables configured

### Required NPM Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  }
}
```

### CloudFront Integration
- Configure CORS properly
- Handle CloudFront cache invalidation
- Set up error pages (404, 500)
- Configure security headers

## Critical Reminders
- **NO deployment without 100% test coverage**
- **NO console.log in production code**
- **NO hardcoded API endpoints**
- **NO synchronous localStorage operations in render**
- **ALWAYS test accessibility**
- **ALWAYS coordinate API changes with backend**