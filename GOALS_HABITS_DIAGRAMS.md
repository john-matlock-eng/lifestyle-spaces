# Goals & Habits - Architecture Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         LIFESTYLE SPACES                         │
│                     Space-Owned Content Model                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    SPACE     │  Container for all content
│  (Existing)  │  - Provides permission boundary
└──────┬───────┘  - All members can view content
       │
       ├─────────┐
       │         │
   ┌───▼───┐ ┌──▼────┐
   │ GOALS │ │HABITS │  Content owned by users
   │       │ │       │  Shared with all space members
   └───┬───┘ └───┬───┘
       │         │
       ▼         ▼
   Check-ins  Completions  User actions tracked
```

---

## 📊 Data Model Relationships

```
USER (Existing)
  │
  ├─ owns ────→ GOAL (new)
  │               ├─ belongs to → SPACE
  │               └─ has many → GOAL CHECK-INS
  │
  ├─ owns ────→ HABIT (new)
  │               ├─ belongs to → SPACE
  │               └─ has many → HABIT COMPLETIONS
  │
  └─ member of → SPACE (existing)
                   └─ contains → GOALS + HABITS
```

---

## 🔄 Goal Lifecycle

```
1. CREATE GOAL
   ┌──────────┐
   │  User    │ POST /api/spaces/{id}/goals
   │  Action  │ { name, type, target }
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Verify  │ Check user is space member
   │  Access  │
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Create  │ Generate goal_id
   │  Goal    │ Set owner_id = current_user
   └────┬─────┘ Store in DynamoDB
        │       PK: SPACE#{spaceId}
        │       SK: GOAL#{goalId}
        ▼       GSI1: USER#{ownerId}
   ┌──────────┐
   │  Return  │ Goal with permissions:
   │ Response │ - is_owner: true
   └──────────┘ - can_edit: true
                - can_checkin: true

2. ADD CHECK-IN
   ┌──────────┐
   │  User    │ POST /api/spaces/{id}/goals/{id}/checkins
   │  Action  │ { value, date, notes }
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Verify  │ Check can_checkin permission
   │  Access  │ (owner or contributor)
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Create  │ Generate checkin_id
   │ Check-in │ Store progress entry
   └────┬─────┘ PK: SPACE#{spaceId}
        │       SK: GOAL#{goalId}#CHECKIN#{timestamp}
        ▼
   ┌──────────┐
   │  Update  │ current_value += check-in.value
   │   Goal   │ checkin_count += 1
   └────┬─────┘ last_checkin_at = now
        │       If current_value >= target:
        │         status = 'completed'
        ▼
   ┌──────────┐
   │  Create  │ Add to activity feed
   │ Activity │ Type: 'goal_checkin'
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Return  │ Check-in + updated goal
   └──────────┘

3. VIEW GOAL
   ┌──────────┐
   │  User    │ GET /api/spaces/{id}/goals/{id}
   │  Action  │
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Verify  │ Check space membership
   │  Access  │
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │   Get    │ Query DynamoDB
   │   Goal   │ PK: SPACE#{spaceId}
   └────┬─────┘ SK: GOAL#{goalId}
        │
        ▼
   ┌──────────┐
   │   Add    │ is_owner = (goal.owner_id == user_id)
   │  Perms   │ can_edit = is_owner
   └────┬─────┘ can_checkin = (is_owner or in contributors)
        │
        ▼
   ┌──────────┐
   │Calculate │ progress = (current / target) * 100
   │Progress  │
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Return  │ Goal with permissions + progress
   └──────────┘
```

---

## 🔄 Habit Lifecycle

```
1. CREATE HABIT
   Similar to goal creation, but with:
   - frequency (daily/weekly/custom)
   - days_of_week array
   - streak tracking fields

2. MARK COMPLETE
   ┌──────────┐
   │  User    │ POST /api/spaces/{id}/habits/{id}/checkins
   │  Action  │ { date, completed: true, mood }
   └────┬─────┘
        │
        ▼
   ┌──────────┐
   │  Check   │ Already completed today?
   │Duplicate │ If yes, return error
   └────┬─────┘
        │ No
        ▼
   ┌──────────┐
   │  Create  │ Store completion
   │Completion│ PK: SPACE#{spaceId}
   └────┬─────┘ SK: HABIT#{habitId}#CHECKIN#{date}
        │
        ▼
   ┌──────────┐
   │Calculate │ Get all completions
   │ Streaks  │ Find current consecutive days
   └────┬─────┘ Update longest_streak if needed
        │
        ▼
   ┌──────────┐
   │  Update  │ current_streak = X
   │  Habit   │ longest_streak = max(current, longest)
   └────┬─────┘ total_completions += 1
        │       last_completed_at = now
        ▼
   ┌──────────┐
   │  Create  │ Add to activity feed
   │ Activity │ Type: 'habit_completed'
   └────┬─────┘ Include streak info if milestone
        │
        ▼
   ┌──────────┐
   │  Return  │ Completion + updated habit
   └──────────┘
```

---

## 🗄️ DynamoDB Query Patterns

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN TABLE QUERIES                        │
└─────────────────────────────────────────────────────────────┘

1. LIST SPACE GOALS
   Query: PK = 'SPACE#123', SK begins_with 'GOAL#'
   Returns: All goals in the space
   
2. GET GOAL WITH CHECK-INS
   Query: PK = 'SPACE#123', SK begins_with 'GOAL#456'
   Returns: Goal + all its check-ins
   
3. GET GOAL CHECK-INS FOR DATE RANGE
   Query: PK = 'SPACE#123',
          SK between 'GOAL#456#CHECKIN#2025-10-01' 
                 and 'GOAL#456#CHECKIN#2025-10-31'
   Returns: October check-ins only

┌─────────────────────────────────────────────────────────────┐
│                    GSI1 QUERIES                              │
│         (User's content across all spaces)                   │
└─────────────────────────────────────────────────────────────┘

1. USER'S ALL GOALS
   Query: GSI1PK = 'USER#789', SK begins_with 'GOAL#'
   Returns: All goals owned by this user in any space
   
2. USER'S ALL HABITS
   Query: GSI1PK = 'USER#789', SK begins_with 'HABIT#'
   Returns: All habits owned by this user in any space
   
3. USER'S ALL CHECK-INS
   Query: GSI1PK = 'USER#789', SK begins_with 'CHECKIN#'
   Returns: All check-ins by this user
```

---

## 🔐 Permission Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PERMISSION CHECKS                         │
└─────────────────────────────────────────────────────────────┘

REQUEST → Verify Auth Token
             │
             ▼
          Extract user_id
             │
             ▼
    ┌────────────────────┐
    │ Check Space        │
    │ Membership         │
    │                    │
    │ Query:             │
    │ PK: USER#{user_id} │
    │ SK: SPACE#{id}     │
    └────────┬───────────┘
             │
     ┌───────┴────────┐
     │                │
    NO               YES
     │                │
     ▼                ▼
  REJECT          ┌────────────────────┐
  403             │ Check Item         │
                  │ Ownership          │
                  │                    │
                  │ item.owner_id      │
                  │ == user_id?        │
                  └────────┬───────────┘
                           │
                   ┌───────┴────────┐
                   │                │
                  YES              NO
                   │                │
                   ▼                ▼
              ┌────────┐      ┌────────┐
              │ ALLOW  │      │ VIEW   │
              │ EDIT   │      │ ONLY   │
              │ DELETE │      │        │
              └────────┘      └────────┘
```

---

## 📱 Frontend Component Hierarchy

```
┌────────────────────────────────────────────────────────────┐
│                    SpaceDetail Page                         │
└──────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
    ┌────────┐   ┌──────────┐  ┌────────┐
    │Overview│   │  Goals   │  │Habits  │
    │  Tab   │   │   Tab    │  │  Tab   │
    └────────┘   └─────┬────┘  └───┬────┘
                       │            │
                       ▼            ▼
              ┌──────────────┐  ┌──────────────┐
              │   GoalList   │  │  HabitList   │
              └──────┬───────┘  └──────┬───────┘
                     │                 │
          ┌──────────┼──────────┐     │
          │          │          │     │
          ▼          ▼          ▼     ▼
     ┌────────┐ ┌────────┐ ┌────────────┐
     │ Goal   │ │ Goal   │ │   Habit    │
     │ Card   │ │ Card   │ │   Card     │
     └───┬────┘ └───┬────┘ └─────┬──────┘
         │          │            │
         ▼          ▼            ▼
    ┌─────────────────┐    ┌──────────────┐
    │ GoalCheckin     │    │   Habit      │
    │    Modal        │    │  Calendar    │
    └─────────────────┘    └──────────────┘
```

---

## 🔄 API Call Flow

```
Frontend                Service Layer           Backend API
   │                        │                       │
   │  1. User clicks       │                       │
   │     "Add Progress"    │                       │
   │                        │                       │
   │  2. Open modal        │                       │
   │     Get user input    │                       │
   │                        │                       │
   │  3. Submit form       │                       │
   ├────────────────────────→                      │
   │  goalService.         │                       │
   │  createCheckin()      │                       │
   │                        │                       │
   │                        │  4. POST request      │
   │                        ├───────────────────────→
   │                        │  /api/spaces/{id}/    │
   │                        │  goals/{id}/checkins  │
   │                        │                       │
   │                        │  5. Validate          │
   │                        │     Check permissions │
   │                        │     Create check-in   │
   │                        │     Update goal       │
   │                        │     Create activity   │
   │                        │                       │
   │                        │  6. Return            │
   │                        │←───────────────────────
   │                        │  { checkin, goal }    │
   │                        │                       │
   │  7. Update UI         │                       │
   │←────────────────────────                      │
   │  - Close modal        │                       │
   │  - Refresh goal       │                       │
   │  - Show success       │                       │
   │                        │                       │
```

---

## 📈 Progress Calculation

```
QUANTITATIVE GOAL
┌────────────────────────────────────┐
│  Target: 100 miles                 │
│  Current: 45.5 miles               │
│                                    │
│  Progress = (45.5 / 100) * 100    │
│           = 45.5%                  │
│                                    │
│  Display:                          │
│  ████████░░░░░░░░░░ 45.5%         │
│  45.5 / 100 miles                 │
└────────────────────────────────────┘

BINARY GOAL
┌────────────────────────────────────┐
│  "Complete project"                │
│                                    │
│  Progress = completed ? 100 : 0    │
│                                    │
│  Display:                          │
│  ☐ Not Complete                    │
│  or                                │
│  ☑ Completed!                      │
└────────────────────────────────────┘

MILESTONE GOAL
┌────────────────────────────────────┐
│  "Launch Website"                  │
│  Sub-tasks: 5                      │
│  Completed: 3                      │
│                                    │
│  Progress = (3 / 5) * 100          │
│           = 60%                    │
│                                    │
│  Display:                          │
│  ████████████░░░░░░ 60%            │
│  ☑ Buy domain                      │
│  ☑ Design mockups                  │
│  ☑ Build pages                     │
│  ☐ Add content                     │
│  ☐ Deploy                          │
└────────────────────────────────────┘
```

---

## 🔥 Streak Calculation

```
HABIT: "Meditate daily"
Frequency: Daily (all days)

Check-in History:
2025-10-01: ✓ Completed
2025-10-02: ✓ Completed
2025-10-03: ✓ Completed
2025-10-04: ✗ Missed
2025-10-05: ✓ Completed
2025-10-06: ✓ Completed
2025-10-07: ✓ Completed
2025-10-08: ✓ Completed ← Today

Algorithm:
1. Start from today
2. Count back consecutive completed days
3. Stop at first missed day

Current Streak: 4 days (Oct 5-8)
Longest Streak: 4 days

If user completes tomorrow (Oct 9):
Current Streak: 5 days
Longest Streak: 5 days

Calendar Display:
S  M  T  W  T  F  S
            ✓  ✗  ✓
✓  🔥 🔥 🔥 ← 4-day streak
```

---

## 🎯 State Management

```
Frontend State Flow

┌────────────────────┐
│   User Action      │ (Create, Update, Delete, Check-in)
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Optimistic Update │ (Update UI immediately)
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│    API Call        │ (Send to backend)
└─────────┬──────────┘
          │
    ┌─────┴──────┐
    │            │
  Success       Error
    │            │
    ▼            ▼
┌─────────┐  ┌─────────┐
│ Confirm │  │ Revert  │
│ Update  │  │ & Show  │
│         │  │ Error   │
└─────────┘  └─────────┘

State Structure:
{
  goals: {
    byId: { 'goal-1': {...}, 'goal-2': {...} },
    bySpace: { 'space-1': ['goal-1', 'goal-2'] },
    loading: false,
    error: null
  },
  habits: {
    byId: { 'habit-1': {...} },
    bySpace: { 'space-1': ['habit-1'] },
    loading: false,
    error: null
  }
}
```

---

## 🚀 Deployment Flow

```
Code Change
    │
    ▼
Git Commit & Push
    │
    ▼
GitHub Actions Trigger
    │
    ├─ Run Tests
    │  ├─ Backend (pytest)
    │  └─ Frontend (vitest)
    │
    ├─ Build
    │  ├─ Package Lambda (backend)
    │  └─ Build React (frontend)
    │
    └─ Deploy
       ├─ Lambda Update
       │  └─ New code live in ~30 seconds
       │
       └─ CloudFront Update
          └─ New UI live after cache invalidation
```

---

**Diagram Version**: 1.0  
**Last Updated**: October 8, 2025
