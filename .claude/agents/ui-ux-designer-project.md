# UI/UX Designer Agent - Lifestyle Spaces Project Instructions

## Project Overview
**Lifestyle Spaces** is a collaborative accountability platform where users create shared spaces for lifestyle goals with friends, partners, or accountability buddies. Think of it as "shared habit tracking with social accountability."

## Design Philosophy

### Core Principles
1. **Simplicity First** - POC phase focuses on core functionality
2. **Mobile-Responsive** - All designs must work on mobile and desktop
3. **Accessibility** - WCAG 2.1 AA compliance required
4. **Performance** - Lightweight, fast-loading interfaces
5. **Consistency** - Unified design language across all components

### Target Users
- **Primary**: Young professionals (25-40) focused on self-improvement
- **Secondary**: Students and couples working on shared goals
- **Tertiary**: Fitness enthusiasts and study groups

## Current Design System

### Color Palette
```css
:root {
  /* Primary Colors */
  --primary-blue: #007bff;
  --primary-dark: #0056b3;
  
  /* Status Colors */
  --success-green: #28a745;
  --error-red: #dc3545;
  --warning-yellow: #ffc107;
  
  /* Neutral Colors */
  --gray-100: #f8f9fa;
  --gray-200: #e9ecef;
  --gray-300: #dee2e6;
  --gray-400: #ced4da;
  --gray-500: #adb5bd;
  --gray-600: #6c757d;
  --gray-700: #495057;
  --gray-800: #343a40;
  --gray-900: #212529;
  
  /* Background Colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-overlay: rgba(0, 0, 0, 0.5);
}
```

### Typography
```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

/* Type Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing System
```css
/* 8px Grid System */
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

## Component Library

### Core Components
1. **Button** - Primary, secondary, danger variants
2. **Modal** - Centered overlay with backdrop
3. **Form Controls** - Input, textarea, checkbox, select
4. **Card** - Container for space items
5. **Navigation** - Header, breadcrumbs, tabs
6. **Loading States** - Spinners, skeletons
7. **Empty States** - Illustrated placeholders
8. **Error States** - Alert boxes, inline errors

### Component States
Every interactive component must handle:
- Default
- Hover
- Active
- Focus (keyboard navigation)
- Disabled
- Loading
- Error

## Page Layouts

### 1. Authentication Pages
- **Sign In**: Simple centered form with logo
- **Sign Up**: Extended form with validation feedback
- **Layout**: Single column, max-width: 400px

### 2. Dashboard
- **Header**: Logo, navigation, user menu
- **Main Content**: Grid of space cards
- **Empty State**: Illustration + CTA for first space
- **Responsive**: 1-4 columns based on viewport

### 3. Space Detail
- **Header**: Breadcrumbs, space title, actions
- **Tabs**: Members, Activity, Files
- **Content Area**: Dynamic based on selected tab
- **Sidebar**: Member list on desktop

### 4. Modals
- **Create Space**: Form with name, description, privacy
- **Invite Member**: Email input with role selection
- **Confirm Actions**: Warning for destructive actions

## Interaction Patterns

### Navigation
- **Primary**: Top header navigation
- **Secondary**: Breadcrumbs for hierarchy
- **Tertiary**: Tabs for section switching

### Feedback
- **Success Messages**: Green banner, auto-dismiss after 5s
- **Error Messages**: Red alert, persistent until dismissed
- **Loading**: Inline spinners, no full-page loaders
- **Validation**: Real-time field validation

### Accessibility
- **Keyboard Navigation**: Full support with visible focus indicators
- **Screen Readers**: Proper ARIA labels and live regions
- **Color Contrast**: Minimum 4.5:1 for normal text
- **Focus Management**: Logical tab order, focus trapping in modals

## Responsive Breakpoints
```css
/* Mobile First Approach */
--breakpoint-sm: 576px;   /* Small devices */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 992px;   /* Desktops */
--breakpoint-xl: 1200px;  /* Large desktops */
```

## Current UI Implementation

### Completed Screens
✅ Sign In Page
✅ Sign Up Page  
✅ Dashboard (Empty & Populated states)
✅ Space Detail Page
✅ Create Space Modal
✅ Invite Member Modal
✅ Members List Component

### Design Patterns Used
1. **Card-based Layout** - Spaces displayed as cards
2. **Modal Overlays** - For create/edit actions
3. **Tab Navigation** - For space detail sections
4. **Form Validation** - Inline error messages
5. **Empty States** - Helpful messages when no data

## Design Constraints

### Technical Limitations
- **No CSS-in-JS** - Using CSS modules only
- **Bundle Size** - Keep UI assets under 500KB
- **No UI Framework** - Custom components only (no Material-UI, etc.)
- **Browser Support** - Modern browsers only (no IE11)

### Performance Requirements
- **First Paint**: < 1.5s
- **Interactive**: < 3s
- **Lighthouse Score**: > 90

## Future Design Considerations

### Planned Features
1. **Dark Mode** - System preference detection
2. **Animations** - Subtle transitions (reduced motion support)
3. **Data Visualizations** - Progress charts, activity graphs
4. **Rich Text Editor** - For activity posts
5. **File Uploads** - Image previews, file icons

### Mobile App Design
- **React Native** - Share design tokens
- **Platform Conventions** - iOS and Android patterns
- **Offline Support** - Cached data states
- **Push Notifications** - Visual design needed

## Design Tools & Assets

### File Organization
```
/frontend/src/
├── styles/
│   ├── globals.css      # Global styles
│   ├── variables.css    # Design tokens
│   └── components/      # Component styles
├── assets/
│   ├── images/         # SVGs, icons
│   └── fonts/          # Custom fonts (if any)
```

### Icon System
- Using inline SVGs for icons
- Consistent 24px grid
- Outline style for navigation
- Filled style for actions

## Collaboration Guidelines

### Design Handoff
1. All measurements in rem/px
2. Color values as CSS variables
3. Component states documented
4. Accessibility notes included
5. Responsive behavior specified

### Implementation Notes
- CSS follows BEM naming convention
- Mobile-first responsive approach
- Semantic HTML required
- ARIA attributes for accessibility
- Performance budget awareness

## Quality Checklist

Before implementing any design:
- [ ] Mobile responsive
- [ ] Keyboard accessible  
- [ ] Screen reader friendly
- [ ] Color contrast passes
- [ ] Loading states defined
- [ ] Error states defined
- [ ] Empty states defined
- [ ] Performance impact considered
- [ ] Consistent with design system
- [ ] User tested (if possible)

## Contact & Resources

- **Design System**: See `/frontend/src/styles/`
- **Component Examples**: See `/frontend/src/components/`
- **Project Status**: See `PROJECT_STATUS.md`
- **Development Guide**: See `CLAUDE.md`

Remember: **Good design is invisible, great design is inevitable.**