# Invitation System - Frontend Implementation Plan

## Overview
Complete frontend implementation plan for the Lifestyle Spaces invitation system, featuring a comprehensive React + TypeScript architecture with strict typing, error boundaries, optimistic UI updates, and WCAG 2.1 AA compliance.

## 1. Component Architecture

### Core Components Structure
```
src/
├── components/
│   ├── invitations/
│   │   ├── InvitationModal.tsx          ✅ Created
│   │   ├── InvitationCard.tsx           ✅ Created
│   │   ├── PendingInvitationsList.tsx   ✅ Created
│   │   ├── InvitationDashboard.tsx      📝 Next
│   │   ├── JoinByCodeForm.tsx           📝 Next
│   │   ├── InvitationStats.tsx          📝 Next
│   │   ├── BulkUploader.tsx             📝 Next
│   │   └── index.ts                     📝 Export barrel
│   └── common/
│       ├── ErrorBoundary.tsx            📝 Next
│       ├── LoadingSkeleton.tsx          📝 Next
│       └── ConfirmDialog.tsx            📝 Next
```

### Component Responsibilities

#### ✅ InvitationModal
- **Purpose**: Create single/bulk invitations with form validation
- **Features**:
  - Email parsing and validation
  - Role selection (Member/Admin)
  - Custom message support
  - CSV upload capability
  - Real-time validation feedback
- **Props**: `spaceId`, `spaceName`, `mode`, `isOpen`, `onClose`
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

#### ✅ InvitationCard
- **Purpose**: Display invitation with contextual actions
- **Features**:
  - Status indicators with visual cues
  - Role badges with color coding
  - Action buttons (Accept/Decline/Revoke/Resend)
  - Loading states with spinners
  - Optimistic UI updates
- **Variants**: `pending` (user view), `admin` (admin view)
- **Accessibility**: ARIA attributes, focus management, high contrast

#### ✅ PendingInvitationsList
- **Purpose**: Display user's pending invitations
- **Features**:
  - Advanced filtering (status, role, search)
  - Sorting (date, expiry, space name)
  - Real-time updates (30s polling)
  - Loading skeletons
  - Empty states
- **Performance**: Virtual scrolling for large lists, memoized filtering

#### 📝 InvitationDashboard (Admin View)
- **Purpose**: Space admin invitation management
- **Features**:
  - Space invitation overview
  - Bulk actions (revoke, resend)
  - Statistics overview
  - Member invitation history
- **Components**: Stats widgets, action toolbar, invitation table

#### 📝 JoinByCodeForm
- **Purpose**: Join space using invitation code
- **Features**:
  - Code validation (real-time)
  - Space preview before joining
  - Error handling for expired/invalid codes
- **UX**: Immediate feedback, progressive enhancement

#### 📝 InvitationStats
- **Purpose**: Analytics dashboard for invitations
- **Features**:
  - Acceptance rates
  - Response time analytics
  - Top inviters
  - Time-based charts
- **Charts**: Recharts integration for visualizations

#### 📝 BulkUploader
- **Purpose**: CSV file upload for bulk invitations
- **Features**:
  - Drag & drop interface
  - CSV validation and preview
  - Progress indicators
  - Error reporting per row
- **Validation**: File type, size limits, email format

## 2. State Management Strategy

### Context + Reducer Pattern
```typescript
// ✅ Implemented: /stores/invitationStore.tsx
interface InvitationState {
  // Data
  pendingInvitations: Invitation[]
  spaceInvitations: Record<string, Invitation[]>
  invitationStats: Record<string, InvitationStatsResponse>

  // UI State
  isLoading: boolean
  isCreating: boolean
  isActioning: boolean
  error: string | null

  // Filtering & Pagination
  filter: FilterState
  pagination: PaginationState

  // Real-time
  lastUpdated: number
  optimisticUpdates: Record<string, Invitation>
}
```

### Actions & Reducers
- **Data Actions**: `SET_PENDING_INVITATIONS`, `UPDATE_INVITATION`, `ADD_INVITATION`
- **UI Actions**: `SET_LOADING`, `SET_ERROR`, `CLEAR_ERROR`
- **Optimistic Actions**: `OPTIMISTIC_UPDATE_STATUS`, `REVERT_OPTIMISTIC_UPDATE`
- **Filter Actions**: `SET_FILTER`, `SET_PAGINATION`

### Benefits
- **Predictable State**: Single source of truth with immutable updates
- **Performance**: Memoized selectors, optimistic updates
- **Testing**: Easy to test reducers in isolation
- **Debugging**: Clear action history with Redux DevTools support

## 3. API Integration Patterns

### Service Layer Architecture
```typescript
// ✅ Implemented: /services/invitationService.ts
class InvitationService {
  // CRUD operations
  createInvitation(request: CreateInvitationRequest): Promise<Invitation>
  createBulkInvitations(request: BulkCreateInvitationRequest): Promise<BulkInvitationResponse>

  // User actions
  acceptInvitation(id: string): Promise<Invitation>
  declineInvitation(id: string): Promise<Invitation>

  // Admin actions
  revokeInvitation(id: string): Promise<void>
  resendInvitation(id: string): Promise<Invitation>

  // Data fetching
  getPendingInvitations(): Promise<{invitations: Invitation[]}>
  getSpaceInvitations(spaceId: string): Promise<{invitations: Invitation[]}>
  getInvitationStats(spaceId: string): Promise<InvitationStatsResponse>

  // Utilities
  validateCode(code: string): Promise<ValidateInviteCodeResponse>
  joinByCode(request: JoinByCodeRequest): Promise<Invitation>
}
```

### Error Handling Strategy
```typescript
// ✅ Implemented: Custom error classes with status mapping
class InvitationServiceError extends Error {
  constructor(message: string, code: string, statusCode?: number)
}

// Status code mapping
400 → INVALID_REQUEST
401 → UNAUTHORIZED
403 → PERMISSION_DENIED
404 → NOT_FOUND
409 → CONFLICT
422 → VALIDATION_ERROR
429 → QUOTA_EXCEEDED
500 → SERVER_ERROR
```

### Request/Response Patterns
- **Authentication**: Automatic JWT token injection via AWS Amplify
- **Retry Logic**: Exponential backoff for network failures
- **Caching**: 15-minute cache for validation endpoints
- **Optimistic Updates**: Immediate UI feedback with rollback capability

## 4. Real-time Updates Strategy

### Polling-based Implementation (Phase 1)
```typescript
// ✅ Implemented: subscribeToUpdates function
const subscribeToUpdates = (spaceId?: string) => {
  const interval = setInterval(() => {
    if (spaceId) {
      fetchSpaceInvitations(spaceId)
    } else {
      fetchPendingInvitations()
    }
  }, 30000) // 30 second intervals

  return () => clearInterval(interval)
}
```

### WebSocket Integration (Phase 2)
```typescript
// 📝 Future enhancement
interface InvitationNotification {
  type: 'new' | 'accepted' | 'declined' | 'expired'
  invitation: Invitation
  timestamp: string
}

// WebSocket event handlers
ws.on('invitation:created', handleNewInvitation)
ws.on('invitation:accepted', handleAcceptedInvitation)
ws.on('invitation:declined', handleDeclinedInvitation)
```

### Offline Support (Phase 3)
- **Service Worker**: Cache pending invitations for offline viewing
- **Queue Management**: Queue actions when offline, sync when online
- **Conflict Resolution**: Merge strategies for concurrent updates

## 5. Form Validation & UX Feedback

### Validation Strategy
```typescript
// ✅ Implemented: Email validation utilities
const emailUtils = {
  validateEmail(email: string): {valid: boolean, error?: string}
  validateEmails(emails: string[]): {valid: string[], invalid: Array<{email: string, error: string}>}
  parseEmailList(text: string): string[]
}
```

### Real-time Validation
- **Email Format**: Regex validation with normalization
- **Duplicate Detection**: Cross-reference with existing members
- **Bulk Validation**: Async validation for large lists
- **Server Validation**: Final validation on submission

### UX Feedback Patterns
- **Immediate Feedback**: Real-time validation as user types
- **Progressive Disclosure**: Show details on demand
- **Loading States**: Skeleton screens and progress indicators
- **Success States**: Toast notifications and visual confirmations
- **Error Recovery**: Clear error messages with action suggestions

## 6. Testing Strategy with Vitest

### Unit Testing
```typescript
// Component tests
describe('InvitationCard', () => {
  it('displays invitation details correctly')
  it('handles accept action with optimistic updates')
  it('shows loading state during actions')
  it('displays error states appropriately')
})

// Service tests
describe('InvitationService', () => {
  it('creates invitation with valid data')
  it('handles API errors gracefully')
  it('retries failed requests')
  it('validates email formats')
})

// Store tests
describe('InvitationStore', () => {
  it('updates state on successful invitation creation')
  it('handles optimistic updates correctly')
  it('reverts optimistic updates on error')
  it('filters invitations by status')
})
```

### Integration Testing
```typescript
// Full user flows
describe('Invitation Flow', () => {
  it('creates and accepts invitation end-to-end')
  it('handles bulk invitation workflow')
  it('manages error scenarios gracefully')
})
```

### Accessibility Testing
```typescript
// A11y tests with @testing-library/jest-dom
describe('Accessibility', () => {
  it('has proper ARIA labels')
  it('supports keyboard navigation')
  it('provides screen reader announcements')
  it('maintains focus management')
})
```

### Test Utilities
- **Mock Data**: Factories for invitation objects
- **Test Providers**: Wrapper components for context testing
- **API Mocking**: MSW for request/response testing
- **User Events**: Testing Library for interaction testing

## 7. Accessibility Implementation (WCAG 2.1 AA)

### Semantic HTML Structure
```typescript
// ✅ Implemented: Proper semantic markup
<div role="dialog" aria-labelledby="invite-modal-title" aria-modal="true">
  <h2 id="invite-modal-title">Invite to {spaceName}</h2>
  <form onSubmit={handleSubmit}>
    <label htmlFor="emails">Email Addresses</label>
    <textarea
      id="emails"
      aria-describedby={hasErrors ? 'email-error' : undefined}
      aria-invalid={hasErrors}
    />
    {hasErrors && <div id="email-error" role="alert">{errorMessage}</div>}
  </form>
</div>
```

### Keyboard Navigation
- **Tab Order**: Logical focus sequence
- **Escape Key**: Close modals and dropdowns
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate lists and menus

### Screen Reader Support
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Live Regions**: Announce dynamic content changes
- **Status Updates**: Inform users of loading/error states
- **Context Information**: Relationship descriptions

### Visual Accessibility
- **Color Contrast**: Minimum 4.5:1 ratio for text
- **Focus Indicators**: Visible focus rings
- **Color Independence**: Information not conveyed by color alone
- **Text Scaling**: Support up to 200% zoom

### Motion & Animation
- **Reduced Motion**: Respect prefers-reduced-motion
- **Animation Control**: Pausable animations
- **Timeout Management**: Adjustable timeout periods

## 8. Performance Optimization

### Code Splitting
```typescript
// Lazy loading for invitation components
const InvitationModal = lazy(() => import('./components/invitations/InvitationModal'))
const InvitationDashboard = lazy(() => import('./components/invitations/InvitationDashboard'))

// Route-based splitting
const InvitationsPage = lazy(() => import('./pages/InvitationsPage'))
```

### Memoization Strategy
```typescript
// Component memoization
const InvitationCard = React.memo(InvitationCardComponent)

// Expensive calculations
const filteredInvitations = useMemo(() => {
  return invitations.filter(applyFilters).sort(applySorting)
}, [invitations, filters, sorting])

// Callback memoization
const handleAccept = useCallback(async (id: string) => {
  await acceptInvitation(id)
}, [acceptInvitation])
```

### Virtual Scrolling
```typescript
// For large invitation lists
import { FixedSizeList as List } from 'react-window'

const InvitationList = ({ invitations }) => (
  <List
    height={600}
    itemCount={invitations.length}
    itemSize={120}
    itemData={invitations}
  >
    {InvitationRow}
  </List>
)
```

### Bundle Optimization
- **Tree Shaking**: Remove unused code
- **Bundle Analysis**: webpack-bundle-analyzer
- **Asset Optimization**: Image compression, lazy loading
- **Service Worker**: Cache strategies for offline support

### Performance Monitoring
```typescript
// Performance metrics
const performanceObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.duration)
    }
  })
})
```

## 9. Mobile Responsiveness

### Responsive Design Patterns
```css
/* Mobile-first approach */
.invitation-card {
  @apply p-4 space-y-3;

  @screen md {
    @apply p-6 space-y-4;
  }
}

/* Touch-friendly targets */
.action-button {
  @apply min-h-[44px] min-w-[44px];
}
```

### Mobile-Specific Features
- **Swipe Actions**: Swipe to accept/decline invitations
- **Pull-to-Refresh**: Native refresh behavior
- **Touch Gestures**: Pinch to zoom for accessibility
- **Viewport Optimization**: Proper meta tags

### Adaptive UI
- **Navigation**: Collapsible sidebar on mobile
- **Tables**: Horizontal scroll with sticky columns
- **Modals**: Full-screen on mobile, centered on desktop
- **Forms**: Stacked layout on mobile, grid on desktop

## 10. Error Boundary Implementation

### Global Error Boundary
```typescript
// 📝 To be implemented
class InvitationErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('Invitation component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <InvitationErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}
```

### Error Fallback Components
- **Network Errors**: Retry button with offline indicator
- **Permission Errors**: Clear message with escalation path
- **Validation Errors**: Field-specific feedback with correction hints
- **Server Errors**: Generic message with support contact

## Implementation Status

### ✅ Completed
- [x] Type definitions (`invitation.types.ts`)
- [x] Service layer (`invitationService.ts`)
- [x] State management (`invitationStore.tsx`)
- [x] InvitationModal component
- [x] InvitationCard component
- [x] PendingInvitationsList component

### 📝 Next Phase
- [ ] InvitationDashboard (admin view)
- [ ] JoinByCodeForm component
- [ ] InvitationStats component
- [ ] BulkUploader component
- [ ] ErrorBoundary implementation
- [ ] Test suite setup
- [ ] Performance optimization
- [ ] Accessibility audit

### 🚀 Future Enhancements
- [ ] WebSocket real-time updates
- [ ] Offline support with service workers
- [ ] Advanced analytics dashboard
- [ ] Email template customization
- [ ] Integration with calendar systems
- [ ] Mobile app push notifications

## File Structure Summary

```
frontend/src/
├── types/
│   └── invitation.types.ts              ✅
├── services/
│   └── invitationService.ts             ✅
├── stores/
│   └── invitationStore.tsx              ✅
└── components/
    └── invitations/
        ├── InvitationModal.tsx          ✅
        ├── InvitationCard.tsx           ✅
        ├── PendingInvitationsList.tsx   ✅
        ├── InvitationDashboard.tsx      📝
        ├── JoinByCodeForm.tsx           📝
        ├── InvitationStats.tsx          📝
        └── BulkUploader.tsx             📝
```

This comprehensive implementation provides a robust, accessible, and performant invitation system that scales with the application's growth while maintaining excellent user experience across all device types.