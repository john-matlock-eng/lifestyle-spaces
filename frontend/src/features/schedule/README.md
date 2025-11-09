# Schedule Feature

Comprehensive schedule sharing UI components for the Lifestyle Spaces application.

## Overview

The schedule feature allows users to create, view, edit, and share weekly schedules within their spaces. It includes drag-and-drop functionality, collision detection, glassmorphism design, and full accessibility support.

## Components

### ScheduleTemplate

Main container component for the schedule feature.

```tsx
import { ScheduleTemplate } from '@/features/schedule';

<ScheduleTemplate
  spaceId="space-123"
  userId="user-456"
  onScheduleCreated={(scheduleId) => console.log('Created:', scheduleId)}
  onScheduleUpdated={(scheduleId) => console.log('Updated:', scheduleId)}
/>
```

**Features:**
- Week navigation (previous/next/current)
- Floating action button for schedule creation
- Schedule CRUD operations
- Loading and error states

### WeekView

Grid layout displaying the full week schedule with drag-and-drop support.

```tsx
import { WeekView } from '@/features/schedule';

<WeekView
  scheduleData={scheduleData}
  weekStart={new Date()}
  onBlockEdit={(block, day) => handleEdit(block, day)}
  onBlockDelete={(block, day) => handleDelete(block, day)}
  onScheduleChange={(data) => handleChange(data)}
/>
```

**Features:**
- 7-column grid (Monday-Sunday)
- Time ruler (00:00-23:59)
- Drag-and-drop time blocks between days
- Responsive design (mobile/desktop)

### TimeBlock

Individual time block component.

```tsx
import { TimeBlock } from '@/features/schedule';

<TimeBlock
  timeBlock={block}
  onClick={handleClick}
  onEdit={handleEdit}
  onDelete={handleDelete}
  hasCollision={false}
  draggable
/>
```

**Features:**
- Activity name, icon, and type
- Time range display
- Duration calculation
- Collision warning
- Edit/delete actions

### TimeBlockEditor

Modal for creating/editing time blocks.

```tsx
import { TimeBlockEditor } from '@/features/schedule';

<TimeBlockEditor
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSave={handleSave}
  initialData={block}
  mode="edit"
/>
```

**Features:**
- Activity name and type selection
- Time picker (start/end)
- Description field
- Color picker
- Form validation

### ScheduleWizard

Multi-step wizard for creating new schedules.

```tsx
import { ScheduleWizard } from '@/features/schedule';

<ScheduleWizard
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onComplete={handleComplete}
  spaceId="space-123"
  templates={templates}
/>
```

**Steps:**
1. Select week (must start on Monday)
2. Choose template or blank schedule
3. Add initial time blocks

### ScheduleDiff

Side-by-side schedule comparison.

```tsx
import { ScheduleDiff } from '@/features/schedule';

<ScheduleDiff
  schedule1={userSchedule}
  schedule2={partnerSchedule}
  title1="Your Schedule"
  title2="Partner's Schedule"
/>
```

**Features:**
- Visual diff highlighting
- Added (green), removed (red), modified (yellow)
- Changes summary
- Day-by-day comparison

## Hooks

### useSchedule

CRUD operations for schedules.

```tsx
import { useSchedule } from '@/features/schedule';

const {
  schedules,
  isLoading,
  error,
  createSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
} = useSchedule();
```

### useWeekNavigation

Week selection and navigation logic.

```tsx
import { useWeekNavigation } from '@/features/schedule';

const {
  currentWeek,
  weekStarting,
  goToNextWeek,
  goToPreviousWeek,
  goToCurrentWeek,
  isCurrentWeek,
} = useWeekNavigation();
```

### useCollisionDetection

Detect overlapping time blocks.

```tsx
import { useCollisionDetection } from '@/features/schedule';

const {
  hasCollisions,
  collisions,
  checkBlockCollision,
  getBlockCollisions,
} = useCollisionDetection(timeBlocks);
```

## Utilities

### Time Utils

```typescript
import {
  timeToMinutes,
  minutesToTime,
  formatTimeDisplay,
  formatTimeRange,
  calculateDuration,
  roundTimeToInterval,
} from '@/features/schedule';

const minutes = timeToMinutes('09:30'); // 570
const time = minutesToTime(570); // '09:30'
const display = formatTimeDisplay('14:30'); // '2:30 PM'
const range = formatTimeRange('09:00', '10:00'); // '9:00 AM - 10:00 AM'
const duration = calculateDuration('09:00', '10:00'); // 60
const rounded = roundTimeToInterval('09:07', 15); // '09:00'
```

### Collision Detection

```typescript
import {
  doBlocksOverlap,
  detectCollisions,
  wouldBlockCollide,
  findGaps,
} from '@/features/schedule';

const overlap = doBlocksOverlap(block1, block2); // boolean
const result = detectCollisions(blocks); // { hasCollision, conflicts }
const wouldCollide = wouldBlockCollide(newBlock, existingBlocks); // boolean
const gaps = findGaps(blocks, 30); // Find gaps >= 30 minutes
```

### Validation

```typescript
import {
  validateTimeBlock,
  validateScheduleData,
  validateWeekStarting,
  getWeekStart,
} from '@/features/schedule';

const errors = validateTimeBlock(block); // ValidationError[]
const scheduleErrors = validateScheduleData(scheduleData); // ValidationError[]
const weekError = validateWeekStarting('2025-11-10'); // ValidationError | null
const weekStart = getWeekStart(new Date()); // '2025-11-04' (Monday)
```

### Activity Types

```typescript
import {
  ACTIVITY_TYPES,
  getAllActivityTypes,
  getDefaultColor,
  getActivityIcon,
} from '@/features/schedule';

const allTypes = getAllActivityTypes(); // ActivityTypeInfo[]
const color = getDefaultColor('work'); // '#3b82f6'
const icon = getActivityIcon('exercise'); // '🏃'
```

## Types

```typescript
import type {
  Schedule,
  ScheduleData,
  TimeBlockType,
  ActivityType,
  DayOfWeek,
  CreateScheduleData,
  WeekRange,
} from '@/features/schedule';
```

## Styling

The schedule feature uses glassmorphism design with backdrop blur effects. All styles are in `styles/schedule.css`.

**CSS Variables Used:**
- `--theme-bg-base`: Background color
- `--theme-text-primary`: Primary text color
- `--theme-text-secondary`: Secondary text color
- `--theme-primary-600`: Primary action color
- `--theme-border-light`: Border color

**Dark Theme:**
The components automatically adapt to dark theme using `[data-theme="midnight-dark"]` selector.

## Accessibility

All components follow WCAG 2.1 AA standards:

- Keyboard navigation support
- ARIA labels and roles
- Focus management in modals
- Screen reader announcements
- Color contrast ratios >= 4.5:1
- Focus visible indicators

## Drag and Drop

Time blocks support drag-and-drop between days:

1. Click and hold a time block
2. Drag to a different day column
3. Drop to move the block
4. Visual feedback during drag
5. Collision detection prevents invalid drops

## Testing

Tests are written using Vitest and Testing Library:

```bash
npm test -- schedule
```

**Test Coverage:**
- Utility functions: 100%
- Hooks: 95%+
- Components: 90%+

## Performance

- Memoized collision detection
- Efficient drag-and-drop with minimal re-renders
- Lazy loading for heavy components
- Optimized grid layout for large schedules

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations

1. Overnight blocks (e.g., 23:00-01:00) are supported but display on the start day only
2. Maximum 100 time blocks per day for performance
3. Week must start on Monday (no custom week start)
4. Drag-and-drop not available on touch devices (use edit button instead)

## Future Enhancements

- Recurring schedules
- Schedule templates library
- Export to calendar (iCal)
- Print view
- Multi-user real-time collaboration
- Mobile app version with native drag-and-drop

## License

Part of Lifestyle Spaces - see root LICENSE file.
