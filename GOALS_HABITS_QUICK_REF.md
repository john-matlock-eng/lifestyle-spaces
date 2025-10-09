# Goals & Habits - Quick Reference Guide

## 🎯 Quick Start for Claude Code

This is a condensed reference for implementing goals and habits. See `GOALS_HABITS_IMPLEMENTATION_PLAN.md` for full details.

---

## 📊 Database Schema Quick Reference

```python
# Goal
PK: 'SPACE#<spaceId>'
SK: 'GOAL#<goalId>'
GSI1PK: 'USER#<ownerId>'
GSI1SK: 'GOAL#<goalId>'

# Goal Check-in
PK: 'SPACE#<spaceId>'
SK: 'GOAL#<goalId>#CHECKIN#<timestamp>'

# Habit
PK: 'SPACE#<spaceId>'
SK: 'HABIT#<habitId>'
GSI1PK: 'USER#<ownerId>'
GSI1SK: 'HABIT#<habitId>'

# Habit Check-in
PK: 'SPACE#<spaceId>'
SK: 'HABIT#<habitId>#CHECKIN#<date>'
```

---

## 🔧 Implementation Checklist

### Phase 1: Goals Backend ✅

- [ ] `backend/app/models/goal.py`
  - GoalBase, GoalCreate, GoalUpdate, GoalResponse
  - GoalCheckinCreate, GoalCheckinResponse
  - GoalListResponse
  - All use camelCase aliases

- [ ] `backend/app/services/goal.py`
  - create_goal(space_id, goal, owner_id)
  - list_space_goals(space_id, user_id)
  - get_goal(space_id, goal_id, user_id)
  - update_goal(space_id, goal_id, update, user_id)
  - delete_goal(space_id, goal_id, user_id)
  - create_checkin(space_id, goal_id, checkin, user_id)
  - get_goal_checkins(space_id, goal_id, user_id)
  - get_user_goals(user_id)

- [ ] `backend/app/api/routes/goals.py`
  - POST /api/spaces/{id}/goals
  - GET /api/spaces/{id}/goals
  - GET /api/spaces/{id}/goals/{id}
  - PUT /api/spaces/{id}/goals/{id}
  - DELETE /api/spaces/{id}/goals/{id}
  - POST /api/spaces/{id}/goals/{id}/checkins
  - GET /api/spaces/{id}/goals/{id}/checkins

- [ ] `backend/tests/unit/test_goal_service.py` (100% coverage)
- [ ] `backend/tests/unit/test_goal_routes.py` (100% coverage)

### Phase 2: Goals Frontend ✅

- [ ] `frontend/src/types/goal.ts`
- [ ] `frontend/src/services/goalService.ts`
- [ ] `frontend/src/components/goals/GoalList.tsx`
- [ ] `frontend/src/components/goals/GoalCard.tsx`
- [ ] `frontend/src/components/goals/CreateGoalModal.tsx`
- [ ] `frontend/src/components/goals/GoalCheckinModal.tsx`
- [ ] `frontend/src/components/goals/goals.css`
- [ ] Tests for all components (90%+ coverage)

### Phase 3: Habits Backend ✅

- [ ] `backend/app/models/habit.py`
- [ ] `backend/app/services/habit.py`
- [ ] `backend/app/api/routes/habits.py`
- [ ] Tests (100% coverage)

### Phase 4: Habits Frontend ✅

- [ ] `frontend/src/types/habit.ts`
- [ ] `frontend/src/services/habitService.ts`
- [ ] `frontend/src/components/habits/HabitList.tsx`
- [ ] `frontend/src/components/habits/HabitCard.tsx`
- [ ] `frontend/src/components/habits/HabitCalendar.tsx`
- [ ] `frontend/src/components/habits/CreateHabitModal.tsx`
- [ ] Tests (90%+ coverage)

---

## 🎨 Key Design Patterns

### Permission Flags
Every response includes:
```python
{
  'is_owner': bool,    # User created this
  'can_edit': bool,    # User can modify
  'can_checkin': bool  # User can add progress
}
```

### CamelCase Aliases
```python
class GoalResponse(BaseModel):
    goal_id: str = Field(..., alias='goalId')
    owner_id: str = Field(..., alias='ownerId')
    # etc...
    
    class Config:
        populate_by_name = True
```

### Error Handling
```python
try:
    # operation
except GoalNotFoundError:
    raise HTTPException(status_code=404, detail="Goal not found")
except UnauthorizedError:
    raise HTTPException(status_code=403, detail="Not authorized")
```

---

## 🧪 Testing Patterns

### Service Test
```python
def test_create_goal_success(mock_db):
    service = GoalService()
    goal = service.create_goal(
        space_id='space-123',
        goal=GoalCreate(name='Test', type='quantitative', target=100),
        owner_id='user-123'
    )
    assert goal['name'] == 'Test'
    assert goal['owner_id'] == 'user-123'
```

### Route Test
```python
def test_create_goal_endpoint(client, auth_headers):
    response = client.post(
        '/api/spaces/space-123/goals',
        json={'name': 'Test Goal', 'type': 'quantitative', 'target': 100},
        headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()['name'] == 'Test Goal'
```

---

## 📝 Common Queries

### List space goals
```python
self.db.query(
    PK='SPACE#<spaceId>',
    SK_begins_with='GOAL#'
)
```

### Get user's goals (GSI1)
```python
self.db.query(
    index_name='GSI1',
    PK='USER#<userId>',
    SK_begins_with='GOAL#'
)
```

### Get goal with check-ins
```python
self.db.query(
    PK='SPACE#<spaceId>',
    SK_begins_with='GOAL#<goalId>'
)
```

---

## 🚨 Critical Requirements

1. **All responses use camelCase** (goalId, not goal_id)
2. **100% backend test coverage**
3. **Permission checks on every operation**
4. **Owner-only edit/delete**
5. **Verify space membership**
6. **Calculate progress on check-in**
7. **Update streak on habit completion**

---

## 🔗 File Locations

```
backend/
├── app/
│   ├── models/
│   │   ├── goal.py        ← Create this
│   │   └── habit.py       ← Create this
│   ├── services/
│   │   ├── goal.py        ← Create this
│   │   └── habit.py       ← Create this
│   └── api/routes/
│       ├── goals.py       ← Create this
│       └── habits.py      ← Create this
└── tests/unit/
    ├── test_goal_service.py   ← Create this
    ├── test_habit_service.py  ← Create this
    ├── test_goal_routes.py    ← Create this
    └── test_habit_routes.py   ← Create this

frontend/
└── src/
    ├── types/
    │   ├── goal.ts        ← Create this
    │   └── habit.ts       ← Create this
    ├── services/
    │   ├── goalService.ts ← Create this
    │   └── habitService.ts← Create this
    └── components/
        ├── goals/
        │   ├── GoalList.tsx
        │   ├── GoalCard.tsx
        │   ├── CreateGoalModal.tsx
        │   └── goals.css
        └── habits/
            ├── HabitList.tsx
            ├── HabitCard.tsx
            ├── HabitCalendar.tsx
            └── habits.css
```

---

## 💬 Claude Code Prompts

### Start Phase 1
```
Implement Phase 1: Goals Backend from GOALS_HABITS_IMPLEMENTATION_PLAN.md

Follow the patterns in:
- backend/app/models/space.py
- backend/app/services/space.py
- backend/app/api/routes/spaces.py

Requirements:
- All models use camelCase aliases
- 100% test coverage
- Permission checks on all operations
- Owner-only edit/delete

Start with models, then service, then routes, then tests.
```

### Start Phase 2
```
Implement Phase 2: Goals Frontend from GOALS_HABITS_IMPLEMENTATION_PLAN.md

Follow the patterns in:
- frontend/src/components/spaces/
- frontend/src/services/spaceService.ts

Requirements:
- TypeScript strict mode
- 90%+ test coverage
- Responsive design
- Accessibility (WCAG)
- Loading/error states

Start with types, then service, then components.
```

---

## 🎯 Done Criteria

### Backend Complete When:
- ✅ All models created
- ✅ All services implemented
- ✅ All routes working
- ✅ 338+ tests passing
- ✅ 100% coverage maintained
- ✅ Deployed to Lambda

### Frontend Complete When:
- ✅ All types defined
- ✅ All services created
- ✅ All components working
- ✅ 90%+ test coverage
- ✅ Responsive on mobile
- ✅ Accessible
- ✅ Deployed to CloudFront

---

**Quick Ref Version**: 1.0  
**See Full Plan**: GOALS_HABITS_IMPLEMENTATION_PLAN.md
