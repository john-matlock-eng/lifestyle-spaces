# TypeScript Pro Agent - Lifestyle Spaces Project Instructions

## Project Context
You are working on **Lifestyle Spaces**, a collaborative accountability platform built with React + TypeScript + Vite. This is a POC application with strict TypeScript requirements and 90%+ test coverage.

## Critical TypeScript Requirements

### 1. Strict Configuration Settings
The project uses TypeScript with `verbatimModuleSyntax` enabled. This means:
- **ALWAYS use `import type`** for type-only imports
- **NEVER import React directly** (using new JSX transform)
- **Strict mode is enabled** - no implicit any, strict null checks

### 2. Import Rules
```typescript
// ❌ WRONG - will fail with verbatimModuleSyntax
import { User, AuthState } from '../types';

// ✅ CORRECT
import type { User, AuthState } from '../types';
```

### 3. Type Safety Requirements
- **NO `any` types allowed** - always use specific types
- **Validate API responses at runtime** - don't use unsafe type assertions
- **Use proper type guards** for narrowing
- **Handle null/undefined explicitly**

### 4. API Response Validation
```typescript
// ❌ WRONG - unsafe type assertion
const response = await apiCall() as SomeType;

// ✅ CORRECT - validate at runtime
const response = await apiCall();
if (!response || typeof response !== 'object' || !('expectedField' in response)) {
  throw new Error('Invalid API response');
}
return response as SomeType;
```

### 5. DOM Element Type Safety
```typescript
// ❌ WRONG - no null check
element.nextElementSibling.focus();

// ✅ CORRECT - proper null checks
const nextElement = element.nextElementSibling as HTMLElement | null;
if (nextElement && typeof nextElement.focus === 'function') {
  nextElement.focus();
}
```

## Project Type Structure

### Core Types Location
- `src/types/` - All TypeScript type definitions
- `src/types/auth.types.ts` - Authentication types
- `src/types/space.types.ts` - Space management types
- `src/types/index.ts` - Re-exports all types

### Key Type Definitions
```typescript
// User and Auth Types
export interface User {
  userId: string;
  email: string;
  username: string;
  displayName: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Space Types
export interface Space {
  spaceId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  memberCount: number;
}

export interface SpaceMember {
  userId: string;
  username: string;
  displayName: string;
  role: SpaceMemberRole;
  joinedAt: string;
  lastSeen?: string;
  status: 'online' | 'offline';
}

export type SpaceMemberRole = 'owner' | 'admin' | 'member';
```

## Type-Related Linting Rules

The project enforces these ESLint rules:
- `@typescript-eslint/no-explicit-any` - Error
- `@typescript-eslint/no-unused-vars` - Error
- `@typescript-eslint/explicit-function-return-type` - Off (inference allowed)
- `@typescript-eslint/strict-null-checks` - Enabled

## Testing Requirements

### Type Coverage in Tests
- Tests must properly type all mocks and assertions
- Use proper types for React Testing Library queries
- Mock functions must have correct type signatures

### Example Test Types
```typescript
import type { Mock } from 'vitest';
import type { User, AuthState } from '../types';

// Properly typed mock
const mockSignIn = vi.fn<[SignInData], Promise<AuthResponse>>();

// Typed component props
const defaultProps: ComponentProps = {
  user: mockUser,
  onUpdate: vi.fn(),
};
```

## Common TypeScript Issues to Catch

1. **Missing type imports** - Ensure all types are imported with `import type`
2. **Implicit any in event handlers** - Always type event parameters
3. **Unhandled promise rejections** - Ensure async functions have proper error types
4. **Union type narrowing** - Use discriminated unions where appropriate
5. **Generic constraints** - Apply proper constraints to generic types

## Build & Validation Commands

Before any PR, ensure:
```bash
npm run build        # TypeScript compilation must pass
npm run lint         # No TypeScript ESLint errors
npm run typecheck    # Explicit type checking
npm test            # Tests with proper types
```

## Type Declaration Files

- Type declaration files (`*.d.ts`) are excluded from coverage
- Ambient declarations go in `src/vite-env.d.ts`
- Module declarations for untyped packages go in `src/types/modules.d.ts`

## Integration with Other Tools

### Vite Configuration
- TypeScript paths are configured in `tsconfig.json`
- Vite handles TypeScript transpilation
- Source maps enabled for debugging

### React + TypeScript
- Using React 18 types
- Functional components with proper prop types
- Hooks must have proper return type inference

## Performance Considerations

- Use `type` imports to reduce bundle size
- Avoid complex type computations in hot paths
- Prefer interfaces over type aliases for object shapes
- Use const assertions for literal types

## Migration & Refactoring

When refactoring JavaScript to TypeScript:
1. Start with `// @ts-check` for gradual migration
2. Add return types to functions first
3. Type function parameters next
4. Add interface definitions for objects
5. Enable strict mode last

## Documentation Requirements

- All exported types must have JSDoc comments
- Complex types need usage examples
- Generic types need constraint explanations
- Discriminated unions need variant descriptions

Remember: **The goal is 100% type safety with zero runtime type errors.**