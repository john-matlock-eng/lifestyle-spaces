# Goals & Habits Implementation Plan

## 📋 Overview

This document provides a comprehensive implementation plan for adding Goals and Habits tracking to Lifestyle Spaces. This feature allows space members to create, track, and share their personal goals and habits within a space.

**Architecture Model**: Space-Owned Content with Owner Attribution
- Goals and habits belong to a space (all members can view)
- Each item has a primary owner (creator) who can edit/delete
- All space members can view and interact
- Owner/contributors can add check-ins

---

## 🎯 Objectives

### Phase 1: Goals System
- [x] Design DynamoDB schema
- [ ] Implement backend API (models, services, routes)
- [ ] Write comprehensive tests (100% coverage)
- [ ] Create frontend components
- [ ] Integrate with existing space system

### Phase 2: Habits System
- [ ] Implement backend API
- [ ] Write comprehensive tests
- [ ] Create frontend components
- [ ] Add streak calculation
- [ ] Calendar visualization

### Success Metrics
- 100% test coverage (backend)
- 90%+ test coverage (frontend)
- All API endpoints documented
- All components accessible (WCAG compliant)

---

## 🗄️ Database Schema (DynamoDB)

### Goal Entity
```python
{
    'PK': 'SPACE#<spaceId>',
    'SK': 'GOAL#<goalId>',
    'id': '<goalId>',
    'space_id': '<spaceId>',
    'owner_id': '<userId>',
    'contributors': ['<userId>'],  # Optional: users who can check-in
    
    # Goal Details
    'name': 'Run 100 miles this month',
    'description': 'Training for half marathon',
    'type': 'quantitative',  # binary | quantitative | milestone
    'target': 100.0,
    'unit': 'miles',
    'current_value': 45.5,
    
    # Status & Dates
    'status': 'active',  # active | completed | paused | archived
    'start_date': '2025-10-01',
    'end_date': '2025-10-31',
    'completed_at': None,
    
    # Metadata
    'created_at': '2025-10-01T12:00:00Z',
    'updated_at': '2025-10-08T08:30:00Z',
    'last_checkin_at': '2025-10-08T08:30:00Z',
    'checkin_count': 12,
    
    # Engagement
    'reaction_count': 0,
    'comment_count': 0,
    
    # GSI1 - Get user's goals across all spaces
    'GSI1PK': 'USER#<userId>',
    'GSI1SK': 'GOAL#<goalId>'
}
```

### Goal Check-in Entity
```python
{
    'PK': 'SPACE#<spaceId>',
    'SK': 'GOAL#<goalId>#CHECKIN#<timestamp>',
    'id': '<checkinId>',
    'goal_id': '<goalId>',
    'space_id': '<spaceId>',
    'user_id': '<userId>',
    
    'value': 5.5,  # Progress amount
    'date': '2025-10-08',
    'notes': 'Morning run in the park',
    'created_at': '2025-10-08T08:30:00Z',
    
    # GSI1 - Get user's check-ins
    'GSI1PK': 'USER#<userId>',
    'GSI1SK': 'CHECKIN#<timestamp>'
}
```

### Habit Entity
```python
{
    'PK': 'SPACE#<spaceId>',
    'SK': 'HABIT#<habitId>',
    'id': '<habitId>',
    'space_id': '<spaceId>',
    'owner_id': '<userId>',
    'contributors': ['<userId>'],
    
    # Habit Details
    'name': 'Meditate daily',
    'description': '10 minutes of mindfulness',
    'category': 'wellness',
    
    # Schedule
    'frequency': 'daily',  # daily | weekly | custom
    'days_of_week': [1,2,3,4,5,6,7],  # 1=Mon, 7=Sun
    'time_of_day': 'morning',  # morning | afternoon | evening | anytime
    
    # Tracking
    'status': 'active',
    'start_date': '2025-10-01',
    'current_streak': 7,
    'longest_streak': 12,
    'total_completions': 45,
    
    # Metadata
    'created_at': '2025-10-01T12:00:00Z',
    'updated_at': '2025-10-08T07:15:00Z',
    'last_completed_at': '2025-10-08T07:15:00Z',
    
    # GSI1
    'GSI1PK': 'USER#<userId>',
    'GSI1SK': 'HABIT#<habitId>'
}
```

### Habit Check-in Entity
```python
{
    'PK': 'SPACE#<spaceId>',
    'SK': 'HABIT#<habitId>#CHECKIN#<date>',
    'id': '<checkinId>',
    'habit_id': '<habitId>',
    'space_id': '<spaceId>',
    'user_id': '<userId>',
    
    'date': '2025-10-08',
    'completed': True,
    'completed_at': '2025-10-08T07:15:00Z',
    'notes': 'Felt really focused today',
    'mood': 'great',  # great | good | okay | bad
    
    'created_at': '2025-10-08T07:15:00Z',
    
    # GSI1
    'GSI1PK': 'USER#<userId>',
    'GSI1SK': 'HABIT#<habitId>#<date>'
}
```

---

## 🔧 Backend Implementation

### Step 1: Create Pydantic Models

**File: `backend/app/models/goal.py`**

Create comprehensive models for:
- `GoalBase` - Base fields
- `GoalCreate` - Creation request
- `GoalUpdate` - Update request
- `GoalResponse` - API response with camelCase aliases
- `GoalCheckinCreate` - Check-in creation
- `GoalCheckinResponse` - Check-in response
- `GoalListResponse` - List response with pagination

**Key Requirements:**
- Use `Field(..., alias='camelCase')` for all response models
- Set `populate_by_name = True` in Config
- Include validation (min_length, max_length, gt, etc.)
- Add `is_owner`, `can_edit`, `can_checkin` permission flags

**File: `backend/app/models/habit.py`**

Create comprehensive models for:
- `HabitBase` - Base fields
- `HabitCreate` - Creation request
- `HabitUpdate` - Update request
- `HabitResponse` - API response with camelCase
- `HabitCheckinCreate` - Completion request
- `HabitCheckinResponse` - Completion response
- `HabitListResponse` - List response

### Step 2: Create Service Layer

**File: `backend/app/services/goal.py`**

Implement `GoalService` class with methods:

```python
class GoalService:
    def __init__(self):
        self.db = get_db()
    
    def create_goal(self, space_id: str, goal: GoalCreate, owner_id: str) -> Dict[str, Any]:
        """
        Create a new goal in a space.
        
        Steps:
        1. Verify user is a member of the space
        2. Generate goal_id (uuid)
        3. Build goal item with all fields
        4. Set GSI1PK/GSI1SK for user lookup
        5. Put item in DynamoDB
        6. Return formatted response
        
        Raises:
            SpaceNotFoundError: Space doesn't exist
            UnauthorizedError: User not a member
            ValidationError: Invalid goal data
        """
        pass
    
    def list_space_goals(self, space_id: str, user_id: str, 
                         status: Optional[str] = None,
                         type: Optional[str] = None) -> Dict[str, Any]:
        """
        List all goals in a space.
        
        Steps:
        1. Verify user is a member
        2. Query goals with PK=SPACE#{space_id}, SK begins_with GOAL#
        3. Filter by status/type if provided
        4. Add permission flags (is_owner, can_edit, can_checkin)
        5. Return paginated response
        """
        pass
    
    def get_goal(self, space_id: str, goal_id: str, user_id: str) -> Dict[str, Any]:
        """Get single goal with details."""
        pass
    
    def update_goal(self, space_id: str, goal_id: str, 
                    update: GoalUpdate, user_id: str) -> Dict[str, Any]:
        """
        Update goal (owner only).
        
        Steps:
        1. Get existing goal
        2. Verify user is owner
        3. Build updates dict (only changed fields)
        4. Update item in DynamoDB
        5. Return updated goal
        
        Raises:
            GoalNotFoundError: Goal doesn't exist
            UnauthorizedError: User not the owner
        """
        pass
    
    def delete_goal(self, space_id: str, goal_id: str, user_id: str) -> bool:
        """Delete goal (owner only)."""
        pass
    
    def create_checkin(self, space_id: str, goal_id: str, 
                       checkin: GoalCheckinCreate, user_id: str) -> Dict[str, Any]:
        """
        Add progress check-in to goal.
        
        Steps:
        1. Get goal
        2. Verify user can check-in (owner or contributor or all members)
        3. Calculate new current_value (add to existing)
        4. Create check-in item
        5. Update goal with new current_value, last_checkin_at, checkin_count
        6. Check if goal completed (current_value >= target)
        7. Create activity feed item
        8. Return check-in response
        """
        pass
    
    def get_goal_checkins(self, space_id: str, goal_id: str, 
                          user_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get check-in history for a goal."""
        pass
    
    def get_user_goals(self, user_id: str, 
                       status: Optional[str] = None) -> Dict[str, Any]:
        """
        Get all goals owned by user across all spaces (GSI1).
        
        Query: GSI1PK=USER#{user_id}, GSI1SK begins_with GOAL#
        """
        pass
    
    def _add_permission_flags(self, goal: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """Add is_owner, can_edit, can_checkin flags to goal."""
        pass
    
    def _calculate_progress(self, goal: Dict[str, Any]) -> float:
        """Calculate progress percentage (0-100)."""
        pass
```

**File: `backend/app/services/habit.py`**

Implement `HabitService` class with methods:

```python
class HabitService:
    def __init__(self):
        self.db = get_db()
    
    def create_habit(self, space_id: str, habit: HabitCreate, owner_id: str) -> Dict[str, Any]:
        """Create new habit."""
        pass
    
    def list_space_habits(self, space_id: str, user_id: str,
                          status: Optional[str] = None) -> Dict[str, Any]:
        """List all habits in space."""
        pass
    
    def get_habit(self, space_id: str, habit_id: str, user_id: str) -> Dict[str, Any]:
        """Get single habit."""
        pass
    
    def update_habit(self, space_id: str, habit_id: str,
                     update: HabitUpdate, user_id: str) -> Dict[str, Any]:
        """Update habit (owner only)."""
        pass
    
    def delete_habit(self, space_id: str, habit_id: str, user_id: str) -> bool:
        """Delete habit (owner only)."""
        pass
    
    def complete_habit(self, space_id: str, habit_id: str,
                       checkin: HabitCheckinCreate, user_id: str) -> Dict[str, Any]:
        """
        Mark habit as completed for a date.
        
        Steps:
        1. Get habit
        2. Verify user can check-in
        3. Check if already completed for this date
        4. Create completion item
        5. Update habit streak calculation
        6. Update total_completions, last_completed_at
        7. Create activity feed item
        8. Return completion response
        """
        pass
    
    def get_habit_history(self, space_id: str, habit_id: str,
                          user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get completion history for last N days.
        
        Returns calendar data showing completed/missed days.
        """
        pass
    
    def _calculate_streak(self, habit: Dict[str, Any], 
                          completions: List[Dict]) -> Tuple[int, int]:
        """
        Calculate current and longest streak.
        
        Returns: (current_streak, longest_streak)
        """
        pass
    
    def get_user_habits(self, user_id: str,
                        status: Optional[str] = None) -> Dict[str, Any]:
        """Get all habits owned by user across spaces (GSI1)."""
        pass
```

### Step 3: Create Exception Classes

**File: `backend/app/services/exceptions.py`**

Add new exceptions:
```python
class GoalNotFoundError(Exception):
    """Goal not found."""
    pass

class HabitNotFoundError(Exception):
    """Habit not found."""
    pass

class CheckinAlreadyExistsError(Exception):
    """Check-in already exists for this date."""
    pass
```

### Step 4: Create API Routes

**File: `backend/app/api/routes/goals.py`**

```python
from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
from app.models.goal import (
    GoalCreate, GoalUpdate, GoalResponse, 
    GoalListResponse, GoalCheckinCreate, GoalCheckinResponse
)
from app.services.goal import GoalService
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/spaces/{space_id}/goals", tags=["Goals"])

@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    space_id: str,
    goal: GoalCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new goal in the space."""
    pass

@router.get("", response_model=GoalListResponse)
async def list_goals(
    space_id: str,
    status: Optional[str] = Query(None, regex="^(active|completed|paused|archived)$"),
    type: Optional[str] = Query(None, regex="^(binary|quantitative|milestone)$"),
    current_user: dict = Depends(get_current_user)
):
    """List all goals in the space."""
    pass

@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(
    space_id: str,
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific goal."""
    pass

@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    space_id: str,
    goal_id: str,
    update: GoalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a goal (owner only)."""
    pass

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    space_id: str,
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a goal (owner only)."""
    pass

@router.post("/{goal_id}/checkins", response_model=GoalCheckinResponse, 
             status_code=status.HTTP_201_CREATED)
async def create_checkin(
    space_id: str,
    goal_id: str,
    checkin: GoalCheckinCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a progress check-in to the goal."""
    pass

@router.get("/{goal_id}/checkins", response_model=dict)
async def get_checkins(
    space_id: str,
    goal_id: str,
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get check-in history for a goal."""
    pass
```

**File: `backend/app/api/routes/habits.py`**

Similar structure to goals.py with habit-specific endpoints.

**File: `backend/app/api/routes/users.py`**

Add new endpoints:
```python
@router.get("/me/goals", response_model=GoalListResponse)
async def get_my_goals(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all goals I own across all spaces."""
    pass

@router.get("/me/habits", response_model=HabitListResponse)
async def get_my_habits(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all habits I own across all spaces."""
    pass
```

### Step 5: Update Main App

**File: `backend/app/main.py`**

Add new routers:
```python
from app.api.routes import goals, habits

app.include_router(goals.router)
app.include_router(habits.router)
```

---

## 🧪 Backend Testing

### Test Files to Create

**File: `backend/tests/unit/test_goal_service.py`**

Test all GoalService methods:
```python
class TestGoalService:
    def test_create_goal_success(self):
        """Test creating a goal successfully."""
        pass
    
    def test_create_goal_user_not_member(self):
        """Test creating goal when user not in space."""
        pass
    
    def test_list_space_goals(self):
        """Test listing goals in a space."""
        pass
    
    def test_list_goals_with_filters(self):
        """Test filtering goals by status and type."""
        pass
    
    def test_get_goal_with_permissions(self):
        """Test goal includes correct permission flags."""
        pass
    
    def test_update_goal_owner_only(self):
        """Test only owner can update goal."""
        pass
    
    def test_delete_goal_owner_only(self):
        """Test only owner can delete goal."""
        pass
    
    def test_create_checkin_updates_progress(self):
        """Test check-in updates goal progress."""
        pass
    
    def test_checkin_completes_goal(self):
        """Test check-in marks goal completed when target reached."""
        pass
    
    def test_get_user_goals_across_spaces(self):
        """Test GSI1 query for user's goals."""
        pass
    
    def test_calculate_progress_percentage(self):
        """Test progress calculation."""
        pass
```

**File: `backend/tests/unit/test_habit_service.py`**

Test all HabitService methods with focus on:
- Streak calculation logic
- Completion tracking
- Calendar data generation

**File: `backend/tests/unit/test_goal_routes.py`**

Test all API endpoints:
```python
class TestGoalRoutes:
    def test_create_goal_endpoint(self, client, auth_headers):
        """Test POST /api/spaces/{id}/goals"""
        pass
    
    def test_create_goal_unauthorized(self, client):
        """Test creating goal without auth."""
        pass
    
    def test_list_goals(self, client, auth_headers):
        """Test GET /api/spaces/{id}/goals"""
        pass
    
    def test_get_goal_not_found(self, client, auth_headers):
        """Test 404 for non-existent goal."""
        pass
    
    def test_update_goal_forbidden(self, client, auth_headers):
        """Test non-owner cannot update goal."""
        pass
    
    def test_create_checkin(self, client, auth_headers):
        """Test POST /api/spaces/{id}/goals/{id}/checkins"""
        pass
```

**File: `backend/tests/unit/test_habit_routes.py`**

Similar structure for habit endpoints.

### Test Coverage Requirements
- **Target**: 100% coverage
- **Mocking**: Use `@mock_dynamodb` for DynamoDB
- **Fixtures**: Create reusable fixtures for goals, habits, users, spaces
- **Edge Cases**: Test validation errors, permission errors, not found errors

---

## 🎨 Frontend Implementation

### Step 1: Create TypeScript Types

**File: `frontend/src/types/goal.ts`**

```typescript
export type GoalType = 'binary' | 'quantitative' | 'milestone';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface Goal {
  goalId: string;
  spaceId: string;
  ownerId: string;
  contributors: string[];
  
  name: string;
  description?: string;
  type: GoalType;
  target?: number;
  unit?: string;
  currentValue: number;
  
  status: GoalStatus;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  
  createdAt: string;
  updatedAt: string;
  lastCheckinAt?: string;
  checkinCount: number;
  
  reactionCount: number;
  commentCount: number;
  
  isOwner: boolean;
  canEdit: boolean;
  canCheckin: boolean;
}

export interface GoalCreate {
  name: string;
  description?: string;
  type: GoalType;
  target?: number;
  unit?: string;
  startDate?: string;
  endDate?: string;
  contributors?: string[];
}

export interface GoalCheckin {
  value: number;
  date: string;
  notes?: string;
}

export interface GoalCheckinResponse {
  checkinId: string;
  goalId: string;
  userId: string;
  value: number;
  date: string;
  notes?: string;
  createdAt: string;
}
```

**File: `frontend/src/types/habit.ts`**

```typescript
export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type HabitStatus = 'active' | 'paused' | 'archived';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type Mood = 'great' | 'good' | 'okay' | 'bad';

export interface Habit {
  habitId: string;
  spaceId: string;
  ownerId: string;
  contributors: string[];
  
  name: string;
  description?: string;
  category?: string;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timeOfDay?: TimeOfDay;
  
  status: HabitStatus;
  startDate: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  
  reminderEnabled: boolean;
  reminderTime?: string;
  
  createdAt: string;
  updatedAt: string;
  lastCompletedAt?: string;
  
  isOwner: boolean;
  canEdit: boolean;
  canCheckin: boolean;
}

export interface HabitCreate {
  name: string;
  description?: string;
  category?: string;
  frequency?: HabitFrequency;
  daysOfWeek?: number[];
  timeOfDay?: TimeOfDay;
  reminderEnabled?: boolean;
  reminderTime?: string;
  contributors?: string[];
}

export interface HabitCheckin {
  date: string;
  completed: boolean;
  notes?: string;
  mood?: Mood;
}
```

### Step 2: Create API Service

**File: `frontend/src/services/goalService.ts`**

```typescript
import { api } from './api';
import { Goal, GoalCreate, GoalCheckin, GoalCheckinResponse } from '../types/goal';

export const goalService = {
  async createGoal(spaceId: string, goal: GoalCreate): Promise<Goal> {
    const response = await api.post(`/spaces/${spaceId}/goals`, goal);
    return response.data;
  },
  
  async listGoals(spaceId: string, filters?: {
    status?: string;
    type?: string;
  }): Promise<{ goals: Goal[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams(filters as any);
    const response = await api.get(`/spaces/${spaceId}/goals?${params}`);
    return response.data;
  },
  
  async getGoal(spaceId: string, goalId: string): Promise<Goal> {
    const response = await api.get(`/spaces/${spaceId}/goals/${goalId}`);
    return response.data;
  },
  
  async updateGoal(spaceId: string, goalId: string, updates: Partial<GoalCreate>): Promise<Goal> {
    const response = await api.put(`/spaces/${spaceId}/goals/${goalId}`, updates);
    return response.data;
  },
  
  async deleteGoal(spaceId: string, goalId: string): Promise<void> {
    await api.delete(`/spaces/${spaceId}/goals/${goalId}`);
  },
  
  async createCheckin(spaceId: string, goalId: string, checkin: GoalCheckin): Promise<GoalCheckinResponse> {
    const response = await api.post(`/spaces/${spaceId}/goals/${goalId}/checkins`, checkin);
    return response.data;
  },
  
  async getCheckins(spaceId: string, goalId: string, limit = 50): Promise<{
    checkins: GoalCheckinResponse[];
    total: number;
  }> {
    const response = await api.get(`/spaces/${spaceId}/goals/${goalId}/checkins?limit=${limit}`);
    return response.data;
  },
  
  async getMyGoals(status?: string): Promise<{ goals: Goal[]; total: number }> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/users/me/goals${params}`);
    return response.data;
  }
};
```

**File: `frontend/src/services/habitService.ts`**

Similar structure for habits.

### Step 3: Create React Components

**File: `frontend/src/components/goals/GoalList.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { Goal } from '../../types/goal';
import { goalService } from '../../services/goalService';
import { GoalCard } from './GoalCard';
import './goals.css';

interface GoalListProps {
  spaceId: string;
}

export const GoalList: React.FC<GoalListProps> = ({ spaceId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  useEffect(() => {
    loadGoals();
  }, [spaceId, filter]);
  
  const loadGoals = async () => {
    try {
      setLoading(true);
      const result = await goalService.listGoals(spaceId, {
        status: filter === 'all' ? undefined : filter
      });
      setGoals(result.goals);
    } catch (err) {
      setError('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoalUpdate = () => {
    loadGoals();
  };
  
  if (loading) return <div>Loading goals...</div>;
  if (error) return <div className="error">{error}</div>;
  
  return (
    <div className="goal-list">
      <div className="goal-list-header">
        <h2>Goals</h2>
        <div className="goal-filters">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>
      
      {goals.length === 0 ? (
        <div className="goal-list-empty">
          <p>No goals yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="goal-grid">
          {goals.map(goal => (
            <GoalCard 
              key={goal.goalId} 
              goal={goal}
              onUpdate={handleGoalUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};
```

**File: `frontend/src/components/goals/GoalCard.tsx`**

```typescript
import React from 'react';
import { Goal } from '../../types/goal';
import { ProgressBar } from '../common/ProgressBar';
import './goals.css';

interface GoalCardProps {
  goal: Goal;
  onUpdate: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onUpdate }) => {
  const progress = goal.target 
    ? Math.min((goal.currentValue / goal.target) * 100, 100)
    : 0;
  
  const handleCheckin = () => {
    // Open checkin modal
  };
  
  return (
    <div className={`goal-card goal-card--${goal.status}`}>
      <div className="goal-card-header">
        <div className="goal-type-badge">{goal.type}</div>
        {goal.isOwner && <div className="goal-owner-badge">Owner</div>}
      </div>
      
      <h3 className="goal-title">{goal.name}</h3>
      
      {goal.description && (
        <p className="goal-description">{goal.description}</p>
      )}
      
      {goal.type === 'quantitative' && goal.target && (
        <div className="goal-progress">
          <ProgressBar value={progress} />
          <div className="goal-progress-text">
            {goal.currentValue} / {goal.target} {goal.unit}
          </div>
        </div>
      )}
      
      <div className="goal-card-footer">
        <div className="goal-stats">
          <span>{goal.checkinCount} check-ins</span>
          {goal.endDate && <span>Due {new Date(goal.endDate).toLocaleDateString()}</span>}
        </div>
        
        {goal.canCheckin && goal.status === 'active' && (
          <button 
            className="goal-checkin-btn"
            onClick={handleCheckin}
          >
            Log Progress
          </button>
        )}
      </div>
    </div>
  );
};
```

**File: `frontend/src/components/goals/CreateGoalModal.tsx`**

Modal with form for creating new goals:
- Name input (required)
- Description textarea
- Type selector (binary/quantitative/milestone)
- Target and unit (for quantitative)
- Date range
- Form validation
- Loading states
- Error handling

**File: `frontend/src/components/goals/GoalCheckinModal.tsx`**

Modal for adding check-ins:
- Value input (for quantitative)
- Date selector
- Notes textarea
- Validation
- Success feedback

**File: `frontend/src/components/habits/HabitList.tsx`**

Similar to GoalList but for habits.

**File: `frontend/src/components/habits/HabitCard.tsx`**

Shows:
- Habit name and description
- Current streak (🔥 indicator)
- Quick check-in button
- Calendar view of completions
- Status indicator

**File: `frontend/src/components/habits/HabitCalendar.tsx`**

Calendar grid showing:
- Last 30 days
- Completed days (✓ green)
- Missed days (✗ red or gray)
- Current streak highlighting

### Step 4: Create CSS Styles

**File: `frontend/src/components/goals/goals.css`**

Styles for:
- Goal list layout (grid)
- Goal card design
- Progress bars
- Type badges
- Status indicators
- Responsive design

**File: `frontend/src/components/habits/habits.css`**

Styles for:
- Habit cards
- Streak indicators
- Calendar grid
- Check-in buttons
- Status badges

---

## 🔗 Integration Points

### Update Space Detail Page

**File: `frontend/src/pages/SpaceDetail.tsx`**

Add new tabs:
```typescript
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'goals', label: 'Goals' },        // New
  { id: 'habits', label: 'Habits' },      // New
  { id: 'members', label: 'Members' },
  { id: 'settings', label: 'Settings' }
];
```

Add tab content:
```typescript
{activeTab === 'goals' && <GoalList spaceId={spaceId} />}
{activeTab === 'habits' && <HabitList spaceId={spaceId} />}
```

### Update User Dashboard

Add sections for:
- My Active Goals (across all spaces)
- My Active Habits (across all spaces)
- Recent Check-ins
- Achievements/Streaks

---

## ✅ Testing Requirements

### Frontend Tests

**File: `frontend/src/components/goals/GoalList.test.tsx`**

Test:
- Renders loading state
- Renders empty state
- Renders goal list
- Filters work correctly
- Error handling

**File: `frontend/src/components/goals/GoalCard.test.tsx`**

Test:
- Renders all goal types correctly
- Shows correct progress for quantitative goals
- Shows owner badge when appropriate
- Check-in button shows for correct users
- Accessibility (ARIA labels, keyboard nav)

**File: `frontend/src/services/goalService.test.ts`**

Mock API calls and test all service methods.

### Coverage Target
- **Frontend**: 90%+ coverage
- **All components**: Snapshot tests + behavior tests
- **Accessibility**: WCAG compliance tests

---

## 📦 Deployment Steps

### Step 1: Backend Deployment

```bash
# Run tests
cd backend
pytest tests/unit/test_goal_service.py -v
pytest tests/unit/test_habit_service.py -v
pytest tests/unit/test_goal_routes.py -v
pytest tests/unit/test_habit_routes.py -v

# Check coverage
pytest --cov=app --cov-report=term-missing

# Package and deploy
./scripts/package-lambda.sh
aws lambda update-function-code --function-name lifestyle-spaces-dev-api --zip-file fileb://lambda.zip
```

### Step 2: Frontend Deployment

```bash
# Run tests
cd frontend
npm test

# Build
npm run build

# Deploy
npm run deploy:dev
```

### Step 3: Smoke Tests

Test in production:
1. Create a goal
2. Add check-in
3. View progress
4. Create a habit
5. Mark complete
6. View streak
7. Delete items (owner only)

---

## 🎯 Success Criteria

### Backend
- [ ] All models created with camelCase aliases
- [ ] All service methods implemented
- [ ] All API endpoints working
- [ ] 100% test coverage
- [ ] All tests passing
- [ ] Error handling comprehensive
- [ ] DynamoDB queries optimized

### Frontend
- [ ] All components created
- [ ] All TypeScript types defined
- [ ] API service layer complete
- [ ] 90%+ test coverage
- [ ] All tests passing
- [ ] Responsive design working
- [ ] Accessibility validated
- [ ] Loading/error states handled

### Integration
- [ ] End-to-end flows tested
- [ ] Space detail page updated
- [ ] User dashboard updated
- [ ] No regressions in existing features

---

## 📝 Implementation Order

### Week 1: Goals Backend
1. Create models (goal.py)
2. Create service (goal.py)
3. Create routes (goals.py)
4. Write tests (100% coverage)
5. Deploy and test

### Week 2: Goals Frontend
1. Create types
2. Create service layer
3. Create components
4. Write tests (90% coverage)
5. Integrate with space detail
6. Deploy and test

### Week 3: Habits Backend
1. Create models (habit.py)
2. Create service (habit.py with streak logic)
3. Create routes (habits.py)
4. Write tests
5. Deploy and test

### Week 4: Habits Frontend
1. Create types
2. Create service layer
3. Create components (with calendar)
4. Write tests
5. Integrate
6. Deploy and test

---

## 🐛 Known Issues to Address

1. **Timezone handling**: All dates should be in UTC, display in user's local time
2. **Concurrent check-ins**: Handle race conditions when multiple users check-in simultaneously
3. **Streak calculation**: Edge case when completing habit late at night
4. **Progress overflow**: What happens if check-in exceeds target?
5. **Deleted space members**: What happens to their goals/habits?

---

## 🚀 Future Enhancements

### Phase 2
- [ ] Milestone goals (sub-tasks)
- [ ] Goal templates
- [ ] Habit streaks with notifications
- [ ] Data visualization (charts)
- [ ] Export data

### Phase 3
- [ ] Shared goals (multiple owners)
- [ ] Team challenges
- [ ] Leaderboards
- [ ] Achievements/badges
- [ ] Activity feed with reactions

### Phase 4
- [ ] Mobile app
- [ ] Push notifications
- [ ] Integrations (Fitbit, Apple Health, etc.)
- [ ] AI-powered insights
- [ ] Social sharing

---

## 📚 Resources

### Documentation
- DynamoDB Single Table Design: https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/
- FastAPI Best Practices: https://fastapi.tiangolo.com/tutorial/
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

### Similar Apps for Inspiration
- Habitica (gamified habits)
- Strides (goal tracking)
- Streaks (habit streaks)
- Done (habit calendar)

---

## 🤝 Working with Claude Code

When starting implementation, provide Claude Code with:

1. **This document** - Complete implementation plan
2. **Existing codebase context** - Point to current models, services, routes
3. **Specific phase** - "Implement Phase 1: Goals Backend"
4. **Success criteria** - 100% test coverage, all tests passing

Example prompt for Claude Code:
```
Please implement Phase 1 (Goals Backend) from GOALS_HABITS_IMPLEMENTATION_PLAN.md.

Context:
- Existing models are in backend/app/models/
- Existing services are in backend/app/services/
- Follow the same patterns as spaces.py and user_profile.py
- All responses must use camelCase aliases
- Must achieve 100% test coverage

Start with:
1. Create backend/app/models/goal.py
2. Then create backend/app/services/goal.py
3. Then create backend/app/api/routes/goals.py
4. Finally create comprehensive tests

Let me know when each step is complete.
```

---

**Document Version**: 1.0  
**Last Updated**: October 8, 2025  
**Status**: Ready for Implementation
