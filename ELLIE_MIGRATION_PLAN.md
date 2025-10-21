# Ellie Migration & Feature Development Plan

## Executive Summary

This plan outlines migrating the polished landing page, animated Ellie companion, and theme system from `ellie-lifestyle-app` into `lifestyle-spaces`, then building out the wellness/lifestyle features on top of the working community/spaces foundation.

---

## Phase 1: Landing Page & Branding Migration (Week 1)

### 1.1 Animated Ellie Companion
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\components\AnimatedShihTzu.tsx`

**Components to Migrate**:
- `AnimatedShihTzu.tsx` - SVG-based animated dog with mood system
- `Ellie.tsx` - Floating companion with thought bubbles
- `useShihTzuCompanion.ts` hook - Manages Ellie's behavior, position, moods

**Features**:
- 10 mood states (happy, excited, curious, playful, sleeping, walking, concerned, proud, zen, celebrating)
- Smooth animations (bounce, pulse, position transitions)
- Context-aware messaging
- Interactive positioning

**Integration Points**:
- Add to `lifestyle-spaces/frontend/src/components/ellie/`
- Import into Dashboard, Space pages for contextual guidance
- Connect to user actions (join space → celebrating, create space → excited)

### 1.2 Landing Page Components
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\components/LandingPage/`

**Components to Migrate**:
- `LandingPage.tsx` - Main orchestrator
- `Hero/HeroWithEllie.tsx` - Hero section with Ellie intro
- `Features.tsx` - Feature showcase
- `Benefits.tsx` - Value propositions
- `About.tsx` - About section
- `Footer.tsx` - Enhanced footer
- `Navigation.tsx` - Landing navigation

**Strategy**:
1. Create `lifestyle-spaces/frontend/src/pages/Landing.tsx`
2. Adapt messaging to emphasize community + wellness
3. Update CTAs to point to "Create Space" and "Join with Code"
4. Maintain visual design and animations

### 1.3 Theme System Migration
**Source**: `C:\github\ellie-lifestyle-app\frontend\src/theme/`

**Components to Migrate**:
- `ThemeProvider.tsx` - Context provider
- `useTheme.ts` - Theme hook
- `theme.types.ts` - TypeScript definitions
- `ThemeSelector.tsx` - Theme switcher component
- `ThemeToggle.tsx` - Light/dark toggle

**Features**:
- Multiple theme presets (potentially)
- Dark/light mode
- Persistent theme preferences
- CSS custom properties integration

**Integration**:
- Wrap `lifestyle-spaces` app with ThemeProvider
- Add theme toggle to user menu
- Ensure theme applies to all pages (Dashboard, Space Detail, etc.)

---

## Phase 2: Enhanced Authentication & Onboarding (Week 2)

### 2.1 Improved Auth Components
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\features\auth\components`

**Components to Migrate**:
- `PasswordStrength.tsx` - Visual password strength indicator
- `MonikerInput.tsx` - Username input with availability checking
- `ForgotPassword.tsx` + `ResetPassword.tsx` - Password recovery flow
- `RelationshipTypeSelector.tsx` - Select relationship context

**Integration**:
- Enhance existing `SignUpForm.tsx` with password strength
- Add forgot/reset password to sign-in flow
- Add relationship type to user profile

### 2.2 Onboarding Flow
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\features\onboarding`

**Purpose**: Guide new users through:
1. Welcome + Ellie introduction
2. Profile setup (display name, privacy preferences)
3. Relationship context (couples, friends, accountability partners)
4. First space creation OR join existing space
5. Feature tour

**Components**:
- Multi-step wizard with progress indicator
- Ellie providing context-specific guidance
- Skippable steps with sensible defaults

---

## Phase 3: Wellness Features Foundation (Week 3-4)

### 3.1 Dashboard Enhancement
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\features\dashboard`

**Features to Add**:
- Activity feed (recent space activity, wellness check-ins)
- Quick actions (log mood, share update, track habit)
- Wellness metrics overview
- Ellie's daily encouragement

**Components**:
- `ActivityFeed.tsx`
- `WellnessSnapshot.tsx`
- `QuickActions.tsx`

### 3.2 Relationships Feature
**Source**: `C:\github\ellie-lifestyle-app\frontend\src\features\relationships`

**Features**:
- Partner/friend connections within spaces
- Relationship context (couple, friends, accountability)
- Privacy controls (what you share with whom)
- Relationship milestones/celebrations

**Integration with Spaces**:
- Spaces become the container for wellness activities
- Invite codes can specify relationship type
- Different space templates (Couples Space, Friend Group, Accountability Pod)

---

## Phase 4: Core Wellness Features (Week 5-8)

### 4.1 Mood Tracking
**New Feature**

**Components**:
- `MoodLogger.tsx` - Quick mood entry
- `MoodHistory.tsx` - Trend visualization
- `MoodInsights.tsx` - Patterns and insights

**Space Integration**:
- Share moods within space (optional)
- Ellie responds to mood entries
- Partner can see mood (if sharing enabled)

### 4.2 Habit Tracking
**New Feature**

**Components**:
- `HabitTracker.tsx` - Daily habit checklist
- `HabitStreak.tsx` - Streak visualization
- `SharedHabits.tsx` - Space-wide habit challenges

**Features**:
- Individual habits
- Shared space habits (e.g., "Exercise 3x/week")
- Streak tracking with celebrations (Ellie bounces!)
- Habit templates (wellness, fitness, relationship, mindfulness)

### 4.3 Check-ins
**New Feature**

**Components**:
- `DailyCheckIn.tsx` - Guided daily reflection
- `PartnerCheckIn.tsx` - Sync with partner/friends
- `CheckInHistory.tsx` - Past check-ins

**Features**:
- Morning/evening check-ins
- Gratitude prompts
- Share with space members
- Privacy controls per check-in

### 4.4 Shared Calendar
**New Feature**

**Components**:
- `WellnessCalendar.tsx` - Calendar view
- `EventCreator.tsx` - Add events
- `CalendarSync.tsx` - Sync with external calendars

**Use Cases**:
- Schedule couple time
- Plan wellness activities
- Track medication/supplements
- Shared meal planning

---

## Phase 5: Advanced Features (Week 9-12)

### 5.1 Goals & Progress
- Individual and shared goals
- Progress tracking
- Milestone celebrations (Ellie celebrates with you!)
- Goal templates

### 5.2 Journaling
- Private and shared journal entries
- Prompts and templates
- Reflection on progress
- Mood/gratitude journaling

### 5.3 Resources & Content
- Wellness articles
- Relationship tips
- Guided exercises
- Community-submitted resources

### 5.4 Notifications & Reminders
- Daily check-in reminders
- Habit reminders
- Partner notifications
- Ellie's encouraging nudges

---

## Technical Architecture Plan

### Directory Structure
```
lifestyle-spaces/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ellie/              # Ellie companion
│   │   │   │   ├── AnimatedShihTzu.tsx
│   │   │   │   ├── EllieCompanion.tsx
│   │   │   │   └── useShihTzuCompanion.ts
│   │   │   ├── landing/            # Landing page
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── Features.tsx
│   │   │   │   └── ...
│   │   │   └── theme/              # Theme system
│   │   │       ├── ThemeProvider.tsx
│   │   │       └── ThemeToggle.tsx
│   │   ├── features/               # Feature modules
│   │   │   ├── wellness/
│   │   │   │   ├── mood/
│   │   │   │   ├── habits/
│   │   │   │   └── checkins/
│   │   │   ├── relationships/
│   │   │   └── onboarding/
│   │   ├── pages/
│   │   │   ├── Landing.tsx         # New landing
│   │   │   ├── Dashboard.tsx       # Enhanced
│   │   │   └── SpaceDetail.tsx     # Enhanced
│   │   └── theme/
│   │       ├── themes.ts
│   │       └── ThemeProvider.tsx
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   │   ├── wellness.py         # New wellness endpoints
│   │   │   ├── habits.py
│   │   │   └── checkins.py
│   │   ├── models/
│   │   │   ├── mood.py
│   │   │   ├── habit.py
│   │   │   └── checkin.py
│   │   └── services/
│   │       ├── wellness.py
│   │       └── habit.py
```

### Database Design (DynamoDB Single-Table)

**Additional Access Patterns**:
```
# Moods
PK: USER#<userId>      SK: MOOD#<timestamp>
PK: SPACE#<spaceId>    SK: MOOD#<userId>#<timestamp>  # Shared moods

# Habits
PK: USER#<userId>      SK: HABIT#<habitId>
PK: SPACE#<spaceId>    SK: HABIT#<habitId>            # Shared habits
PK: HABIT#<habitId>    SK: LOG#<date>                 # Habit completion

# Check-ins
PK: USER#<userId>      SK: CHECKIN#<timestamp>
PK: SPACE#<spaceId>    SK: CHECKIN#<userId>#<timestamp>

# Goals
PK: USER#<userId>      SK: GOAL#<goalId>
PK: SPACE#<spaceId>    SK: GOAL#<goalId>
```

---

## Migration Checklist

### Immediate (This Week)
- [ ] Migrate AnimatedShihTzu component
- [ ] Migrate useShihTzuCompanion hook
- [ ] Migrate Landing page components
- [ ] Migrate theme system
- [ ] Update routing to show Landing for unauthenticated users
- [ ] Add Ellie to Dashboard with contextual messages

### Short Term (Next 2 Weeks)
- [ ] Enhanced auth components (password strength, forgot password)
- [ ] Onboarding flow
- [ ] Relationship type selection
- [ ] Dashboard enhancement with activity feed
- [ ] Add Ellie to Space pages with mood reactions

### Medium Term (Month 2)
- [ ] Mood tracking feature
- [ ] Habit tracking feature
- [ ] Daily check-ins
- [ ] Backend API endpoints for wellness features
- [ ] Tests for all new features

### Long Term (Month 3+)
- [ ] Goals and progress tracking
- [ ] Journaling
- [ ] Calendar integration
- [ ] Resources/content library
- [ ] Notification system

---

## Testing Strategy

### Unit Tests
- All migrated components maintain existing test coverage
- New features: 90%+ test coverage
- Ellie behavior tests (mood changes, animations)

### Integration Tests
- Landing → Sign Up → Onboarding flow
- Create Space → Mood tracking → Share with partner
- Habit creation → Daily logging → Streak

### E2E Tests
- Complete user journeys
- Multi-user scenarios (couples using shared space)

---

## Design Principles

1. **Ellie is the Guide**: Ellie provides context, encouragement, celebrates wins
2. **Privacy First**: Every feature has clear privacy controls
3. **Relationship-Centric**: Features built for sharing with partners/friends
4. **Progressive Disclosure**: Simple by default, powerful when needed
5. **Wellness Over Metrics**: Focus on wellbeing, not gamification

---

## Success Metrics

### Phase 1 (Landing/Theme)
- Landing page conversion rate > 5%
- Theme adoption (% users using dark mode, custom themes)

### Phase 2-3 (Onboarding/Foundation)
- Onboarding completion rate > 80%
- Space creation within first week > 60%

### Phase 4-5 (Wellness Features)
- Daily active users tracking mood/habits > 40%
- Shared space engagement (partner views) > 70%
- Feature adoption (using 3+ features regularly) > 50%

---

## Next Steps

1. **Review this plan** - Adjust priorities based on your vision
2. **Start with Phase 1.1** - Migrate Ellie first (most impactful, lowest risk)
3. **Iterate quickly** - Ship landing page + theme, get feedback
4. **Build incrementally** - Add one wellness feature at a time

Let's make this happen! 🐕✨
