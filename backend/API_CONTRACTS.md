# API Contracts Documentation

This document defines the complete API contract between the frontend (TypeScript) and backend (Python FastAPI). All endpoints, request/response structures, and validation rules are documented here to ensure perfect alignment between frontend and backend implementations.

**Last Updated:** Space Management endpoints fully implemented and tested

## Table of Contents
- [Base API Configuration](#base-api-configuration)
- [Health Check](#health-check)
- [Authentication Endpoints](#authentication-endpoints)
- [Space Management Endpoints](#space-management-endpoints)
- [Invitation Management Endpoints](#invitation-management-endpoints)
- [Type Definitions for Pydantic Models](#type-definitions-for-pydantic-models)
- [Validation Rules](#validation-rules)
- [Error Response Format](#error-response-format)

## Base API Configuration

### API Service Configuration
- **Base URL**: Configured via environment variable
- **Default Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Authentication**: AWS Cognito JWT tokens (Bearer token in Authorization header)
- **Error Handling**: Custom ApiError class with status and statusText

## Health Check

### GET /api/health
Health check endpoint to verify API availability.

**Request**: None

**Response**:
```json
{
  "status": "string",
  "timestamp": "string (ISO 8601 datetime)"
}
```

## Authentication Endpoints

> **Note**: Authentication is handled via AWS Amplify/Cognito on the frontend. The backend validates JWT tokens but doesn't have explicit auth endpoints. The following data structures are used by Amplify integration.

### Frontend Auth Data Structures (for backend awareness)

#### SignUpData
```typescript
{
  email: string;
  password: string;
  username: string;
  displayName: string;
}
```

#### SignInData
```typescript
{
  email: string;
  password: string;
}
```

#### User (from Cognito attributes)
```typescript
{
  userId: string;
  email: string;
  username: string;
  displayName: string;
  createdAt: string;  // ISO 8601
  updatedAt: string;  // ISO 8601
}
```

## Space Management Endpoints

### POST /api/spaces
Create a new space with automatic invite code generation.

**Request Body**:
```json
{
  "name": "string (required, 1-100 chars, cannot be empty/whitespace)",
  "description": "string (optional, max 500 chars)",
  "type": "string (optional, default: 'workspace')",
  "isPublic": "boolean (optional, default: false)"
}
```

**Response (201 Created)**:
```json
{
  "spaceId": "string (UUID)",
  "name": "string",
  "description": "string",
  "type": "string",
  "ownerId": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "memberCount": "integer (starts at 1)",
  "isPublic": "boolean",
  "isOwner": "boolean (always true for creator)",
  "inviteCode": "string (8 characters, uppercase alphanumeric)"
}
```

**Validation Rules**:
- Name must be 1-100 characters and cannot be only whitespace
- Description must be max 500 characters
- Returns 422 if validation fails
- Returns 500 if database operation fails

### GET /api/users/spaces
List spaces for the current authenticated user with filtering and pagination.

**Query Parameters**:
- `limit` (optional): integer - Number of results to return (default: 20, capped at 100)
- `offset` (optional): integer - Number of results to skip for pagination
- `search` (optional): string - Search term for space name/description
- `isPublic` (optional): boolean - Filter by public/private spaces
- `role` (optional): enum ["owner", "admin", "member"] - Filter by user's role

**Response (200 OK)**:
```json
{
  "spaces": [
    {
      "spaceId": "string (UUID)",
      "name": "string",
      "description": "string",
      "type": "string",
      "ownerId": "string",
      "createdAt": "string (ISO 8601)",
      "updatedAt": "string (ISO 8601)",
      "memberCount": "integer",
      "isPublic": "boolean"
    }
  ],
  "total": "integer",
  "page": "integer",
  "pageSize": "integer",
  "hasMore": "boolean"
}
```

**Notes**:
- Spaces are sorted by updatedAt (newest first)
- Search is case-insensitive and matches name or description
- Limit values over 100 are automatically capped at 100

### GET /api/spaces/{spaceId}
Get a specific space by ID.

**Path Parameters**:
- `spaceId`: string (UUID) - The space identifier

**Response (200 OK)**:
```json
{
  "spaceId": "string (UUID)",
  "name": "string",
  "description": "string",
  "type": "string",
  "ownerId": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "memberCount": "integer",
  "isPublic": "boolean",
  "isOwner": "boolean",
  "inviteCode": "string (optional, 8 characters uppercase alphanumeric)"
}
```

**Authorization**:
- Private spaces: Only accessible to members
- Public spaces: Accessible to all authenticated users
- Returns 403 if user is not a member of a private space
- Returns 404 if space doesn't exist

**Security Note**:
- The `inviteCode` field is OPTIONAL and only included in the response when:
  - The requesting user is the space owner, OR
  - The requesting user is an admin of the space
- Regular members and viewers will NOT see the invite code in the response
- This prevents unauthorized sharing of invite codes

### PUT /api/spaces/{spaceId}
Update space settings (owner/admin only).

**Path Parameters**:
- `spaceId`: string (UUID) - The space identifier

**Request Body** (all fields optional):
```json
{
  "name": "string (1-100 chars, cannot be empty/whitespace)",
  "description": "string (max 500 chars)",
  "isPublic": "boolean"
}
```

**Response (200 OK)**:
```json
{
  "spaceId": "string (UUID)",
  "name": "string",
  "description": "string",
  "type": "string",
  "ownerId": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "memberCount": "integer",
  "isPublic": "boolean",
  "isOwner": "boolean"
}
```

**Authorization**:
- Only space owner and admins can update settings
- Returns 403 if user doesn't have permission
- Returns 404 if space doesn't exist
- Returns 422 if validation fails

### GET /api/spaces/{spaceId}/members
Get members of a specific space.

**Path Parameters**:
- `spaceId`: string (UUID) - The space identifier

**Response (200 OK)** (returns array, not object):
```json
[
  {
    "userId": "string",
    "email": "string",
    "username": "string",
    "role": "enum ['owner', 'admin', 'member', 'viewer']",
    "joinedAt": "string (ISO 8601)"
  }
]
```

**Authorization**:
- Private spaces: Only accessible to members
- Public spaces: Accessible to all authenticated users
- Returns 403 if user is not a member of a private space
- Returns 404 if space doesn't exist

**Notes**:
- Members are sorted by role (owner → admin → member → viewer) then by join date
- Response is an array directly, not wrapped in an object

### POST /api/spaces/join
Join a space using an invite code.

**Request Body**:
```json
{
  "inviteCode": "string (required, 8 characters)"
}
```

**Response (200 OK)**:
```json
{
  "spaceId": "string (UUID)",
  "name": "string",
  "description": "string",
  "type": "string",
  "ownerId": "string",
  "createdAt": "string (ISO 8601)",
  "updatedAt": "string (ISO 8601)",
  "memberCount": "integer",
  "isPublic": "boolean",
  "isOwner": "boolean (false for new members)"
}
```

**Authorization**:
- Requires valid JWT authentication
- User must not already be a member of the space

**Error Responses**:
- `400 Bad Request`: Invalid or expired invite code
  ```json
  {
    "detail": "Invalid or expired invite code",
    "status_code": 400
  }
  ```
- `401 Unauthorized`: Missing or invalid authentication token
  ```json
  {
    "detail": "Not authenticated",
    "status_code": 401
  }
  ```
- `409 Conflict`: User is already a member of the space
  ```json
  {
    "detail": "User is already a member of this space",
    "status_code": 409
  }
  ```

**Notes**:
- Invite codes are case-insensitive (automatically converted to uppercase)
- New members join with the "member" role by default
- Joining a space increments the memberCount
- The invite code does not expire and can be used multiple times

### POST /api/spaces/{spaceId}/invite-code/regenerate
Regenerate the invite code for a space (owner/admin only).

**Path Parameters**:
- `spaceId`: string (UUID) - The space identifier

**Request Body**: Empty object `{}`

**Response (200 OK)**:
```json
{
  "inviteCode": "string (8 characters uppercase alphanumeric)",
  "inviteUrl": "string (full URL with invite code)"
}
```

**Authorization**:
- Only space owner and admins can regenerate invite codes
- Returns 403 if user doesn't have permission
- Returns 404 if space doesn't exist

**Error Responses**:
- `401 Unauthorized`: Missing or invalid authentication token
  ```json
  {
    "detail": "Not authenticated",
    "status_code": 401
  }
  ```
- `403 Forbidden`: User is not owner or admin
  ```json
  {
    "detail": "Only space owner and admins can regenerate invite codes",
    "status_code": 403
  }
  ```
- `404 Not Found`: Space doesn't exist
  ```json
  {
    "detail": "Space not found",
    "status_code": 404
  }
  ```

**Notes**:
- Regenerating an invite code immediately invalidates the old code
- The new invite code is 8 characters, uppercase alphanumeric
- The inviteUrl is a convenience field containing the full URL: `{frontend_url}/join/{inviteCode}`
- Use this endpoint if an invite code has been compromised or needs to be reset

## Invitation Management Endpoints

### POST /api/invitations
Create a new invitation to join a space.

**Request Body**:
```json
{
  "email": "string (required, valid email format)",
  "spaceId": "string (required, UUID)",
  "role": "enum ['owner', 'admin', 'member'] (optional, default: 'member')"
}
```

**Response**:
```json
{
  "invitationId": "string (UUID)",
  "spaceId": "string (UUID)",
  "spaceName": "string",
  "inviterEmail": "string",
  "inviterDisplayName": "string",
  "inviteeEmail": "string",
  "role": "enum ['owner', 'admin', 'member']",
  "status": "enum ['pending', 'accepted', 'declined', 'expired']",
  "createdAt": "string (ISO 8601)",
  "expiresAt": "string (ISO 8601)"
}
```

### PUT /api/invitations/{invitationId}/accept
Accept an invitation to join a space.

**Path Parameters**:
- `invitationId`: string (UUID) - The invitation identifier

**Request Body**: Empty object `{}`

**Response**:
```json
{
  "invitationId": "string (UUID)",
  "spaceId": "string (UUID)",
  "spaceName": "string",
  "inviterEmail": "string",
  "inviterDisplayName": "string",
  "inviteeEmail": "string",
  "role": "enum ['owner', 'admin', 'member']",
  "status": "enum ['pending', 'accepted', 'declined', 'expired']",
  "createdAt": "string (ISO 8601)",
  "expiresAt": "string (ISO 8601)"
}
```

### PUT /api/invitations/{invitationId}/decline
Decline an invitation to join a space.

**Path Parameters**:
- `invitationId`: string (UUID) - The invitation identifier

**Request Body**: Empty object `{}`

**Response**:
```json
{
  "invitationId": "string (UUID)",
  "spaceId": "string (UUID)",
  "spaceName": "string",
  "inviterEmail": "string",
  "inviterDisplayName": "string",
  "inviteeEmail": "string",
  "role": "enum ['owner', 'admin', 'member']",
  "status": "enum ['pending', 'accepted', 'declined', 'expired']",
  "createdAt": "string (ISO 8601)",
  "expiresAt": "string (ISO 8601)"
}
```

### GET /api/invitations/pending
Get all pending invitations for the current authenticated user.

**Request**: None (uses authenticated user's email)

**Response**:
```json
{
  "invitations": [
    {
      "invitationId": "string (UUID)",
      "spaceId": "string (UUID)",
      "spaceName": "string",
      "inviterEmail": "string",
      "inviterDisplayName": "string",
      "inviteeEmail": "string",
      "role": "enum ['owner', 'admin', 'member']",
      "status": "enum ['pending', 'accepted', 'declined', 'expired']",
      "createdAt": "string (ISO 8601)",
      "expiresAt": "string (ISO 8601)"
    }
  ]
}
```

### GET /api/spaces/{spaceId}/invitations
Get all pending invitations for a specific space (admin only).

**Path Parameters**:
- `spaceId`: string (UUID) - The space identifier

**Response (200 OK)**:
```json
{
  "invitations": [
    {
      "invitationId": "string (UUID)",
      "spaceId": "string (UUID)",
      "spaceName": "string",
      "inviterEmail": "string",
      "inviterDisplayName": "string",
      "inviteeEmail": "string",
      "role": "enum ['owner', 'admin', 'member']",
      "status": "enum ['pending', 'accepted', 'declined', 'expired']",
      "createdAt": "string (ISO 8601)",
      "expiresAt": "string (ISO 8601)"
    }
  ]
}
```

## Type Definitions for Pydantic Models

### Core Enums

```python
from enum import Enum

class SpaceMemberRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"

class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"
```

### User Model
```python
from pydantic import BaseModel, Field
from datetime import datetime

class User(BaseModel):
    user_id: str = Field(..., alias="userId")
    email: str
    username: str
    display_name: str = Field(..., alias="displayName")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

### Space Models
```python
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import datetime

class CreateSpaceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field("", max_length=500)
    is_public: bool = Field(False, alias="isPublic")
    
    @validator('name')
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Space name is required')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v:
            return v.strip()
        return ""
    
    class Config:
        populate_by_name = True

class Space(BaseModel):
    space_id: str = Field(..., alias="spaceId")
    name: str
    description: str
    owner_id: str = Field(..., alias="ownerId")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")
    member_count: int = Field(..., alias="memberCount")
    is_public: bool = Field(..., alias="isPublic")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class SpaceListResponse(BaseModel):
    spaces: list[Space]
    total: int
    has_more: bool = Field(..., alias="hasMore")
    
    class Config:
        populate_by_name = True

class SpaceMember(BaseModel):
    user_id: str = Field(..., alias="userId")
    email: str
    username: str
    display_name: str = Field(..., alias="displayName")
    role: SpaceMemberRole
    joined_at: datetime = Field(..., alias="joinedAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class MembersListResponse(BaseModel):
    members: list[SpaceMember]
    total: int
    has_more: bool = Field(..., alias="hasMore")
    
    class Config:
        populate_by_name = True
```

### Invitation Models
```python
from typing import Optional
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime

class CreateInvitationRequest(BaseModel):
    email: EmailStr
    role: Optional[SpaceMemberRole] = SpaceMemberRole.MEMBER
    
    @validator('email')
    def validate_email(cls, v):
        return v.strip().lower()
    
    @validator('space_id')
    def validate_space_id(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Space ID is required')
        return v
    
    class Config:
        populate_by_name = True

class Invitation(BaseModel):
    invitation_id: str = Field(..., alias="invitationId")
    space_id: str = Field(..., alias="spaceId")
    space_name: str = Field(..., alias="spaceName")
    inviter_email: str = Field(..., alias="inviterEmail")
    inviter_display_name: str = Field(..., alias="inviterDisplayName")
    invitee_email: str = Field(..., alias="inviteeEmail")
    role: SpaceMemberRole
    status: InvitationStatus
    created_at: datetime = Field(..., alias="createdAt")
    expires_at: datetime = Field(..., alias="expiresAt")
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PendingInvitationsResponse(BaseModel):
    invitations: list[Invitation]
```

### Query Parameter Models
```python
from typing import Optional
from pydantic import BaseModel, Field

class SpaceFilters(BaseModel):
    search: Optional[str] = None
    is_public: Optional[bool] = Field(None, alias="isPublic")
    role: Optional[SpaceMemberRole] = None
    
    class Config:
        populate_by_name = True

class PaginationParams(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
```

## Validation Rules

### Email Validation
- Must match regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Convert to lowercase before storage
- Trim whitespace

### Password Validation (Frontend only - Cognito handles)
- Minimum 8 characters
- Additional Cognito requirements apply

### Space Name Validation
- Required field
- 1-100 characters
- Trim whitespace
- Cannot be empty after trimming

### Space Description Validation
- Optional field
- Maximum 500 characters
- Trim whitespace
- Default to empty string if not provided

### Role Validation
- Must be one of: "owner", "admin", "member"
- Default to "member" if not specified

### UUID Validation
- All IDs (spaceId, invitationId, userId) should be valid UUIDs
- Strip whitespace before validation

### Pagination Validation
- Limit: minimum 1, maximum 100, default 20
- Offset: minimum 0, default 0

## Error Response Format

All error responses follow this structure:

```json
{
  "detail": "string (error message)",
  "status_code": "integer (HTTP status code)",
  "error_code": "string (optional, application-specific error code)"
}
```

### Common HTTP Status Codes
- `200 OK`: Successful GET, PUT
- `201 Created`: Successful POST creating new resource
- `204 No Content`: Successful DELETE
- `400 Bad Request`: Invalid request data/validation error
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Authenticated but not authorized
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `422 Unprocessable Entity`: Request validation failed
- `500 Internal Server Error`: Server error

## Authentication & Authorization

### JWT Token Validation
All endpoints (except `/api/health`) require valid JWT token from AWS Cognito.

**Authorization Header Format**:
```
Authorization: Bearer <jwt_token>
```

### Token Claims Used
- `sub`: User ID (Cognito user pool ID)
- `email`: User email address
- `custom:username`: Username
- `custom:displayName`: Display name
- `custom:userId`: Application user ID

### Authorization Rules
1. **Space Access**: Users can only access spaces they are members of (unless public)
2. **Member Management**: Only space owners and admins can invite new members
3. **Invitation Access**: Users can only see/accept/decline their own invitations
4. **Role Hierarchy**: owner > admin > member

### Invite Code Security

#### Visibility Rules
- **Invite codes are ONLY visible to**:
  - Space owner
  - Space admins
- **Regular members and viewers CANNOT**:
  - See the invite code in space details responses
  - Regenerate invite codes
  - Access invite code endpoints

#### Code Format and Generation
- **Length**: 8 characters
- **Character Set**: Uppercase alphanumeric (A-Z, 0-9) excluding ambiguous characters (0, O, I, 1)
- **Randomness**: Cryptographically secure random generation
- **Uniqueness**: Globally unique across all spaces
- **Case Handling**: Codes are case-insensitive, automatically converted to uppercase

#### Rate Limiting Recommendations
1. **Join endpoint** (`POST /api/spaces/join`):
   - Recommended: 10 requests per minute per user
   - Prevents brute-force attempts to guess invite codes

2. **Regenerate endpoint** (`POST /api/spaces/{spaceId}/invite-code/regenerate`):
   - Recommended: 5 requests per hour per space
   - Prevents abuse and excessive code rotation

3. **Get space details** (`GET /api/spaces/{spaceId}`):
   - Recommended: 100 requests per minute per user
   - Standard API rate limit

#### Security Best Practices
1. **Code Rotation**: Regenerate invite codes periodically or when compromised
2. **Access Logging**: Log all join attempts with invite codes for audit purposes
3. **Monitoring**: Alert on unusual patterns (many failed join attempts, rapid code regeneration)
4. **HTTPS Only**: Invite codes must only be transmitted over HTTPS
5. **No Email/Logs**: Never include invite codes in logs, error messages, or emails
6. **Temporary Display**: Frontend should provide "copy to clipboard" functionality rather than persistent display

#### Invite Code vs Email Invitations
The system supports two invitation methods:

1. **Invite Codes** (POST /api/spaces/join):
   - Shareable link/code
   - No email required
   - Instant access
   - Good for: Public communities, quick onboarding, social sharing

2. **Email Invitations** (POST /api/invitations):
   - Personalized email invitation
   - Role assignment before joining
   - Expiration date (7 days default)
   - Good for: Formal invitations, specific role assignments, controlled access

## DynamoDB Table Design

### Single Table Design Pattern
All data stored in a single DynamoDB table with composite keys.

### Key Schema
- **Partition Key (PK)**: `ENTITY#id`
- **Sort Key (SK)**: `METADATA#timestamp` or `RELATED#id`

### Entity Patterns
1. **User**: `PK: USER#userId, SK: METADATA#userId`
2. **Space**: `PK: SPACE#spaceId, SK: METADATA#spaceId`
3. **Space Member**: `PK: SPACE#spaceId, SK: MEMBER#userId`
4. **User's Spaces**: `PK: USER#userId, SK: SPACE#spaceId`
5. **Invitation**: `PK: INVITATION#invitationId, SK: METADATA#invitationId`
6. **User's Invitations**: `PK: USER#email, SK: INVITATION#invitationId`

### Global Secondary Indexes (GSIs)
- **GSI1**: For querying by different access patterns
  - PK: `GSI1PK`
  - SK: `GSI1SK`

## Implementation Notes

### Backend Requirements
1. All endpoints must validate JWT tokens (except health check)
2. Use Pydantic models for request/response validation
3. Implement proper error handling with appropriate HTTP status codes
4. Use async/await for all database operations
5. Log all errors for debugging (errors only, not info level)
6. Ensure 100% test coverage

### Frontend-Backend Alignment
1. Frontend TypeScript interfaces must match backend Pydantic models exactly
2. Use camelCase in JSON, snake_case in Python (Pydantic handles conversion)
3. All datetime fields use ISO 8601 format
4. Empty responses return `{}` not null
5. Arrays never return null, use empty array `[]` instead

### Security Considerations
1. Never expose internal IDs or implementation details in error messages
2. Validate all input data before processing
3. Use parameterized queries for DynamoDB operations
4. Implement rate limiting for API endpoints
5. Ensure CORS is properly configured
6. All data encrypted at rest (DynamoDB) and in transit (HTTPS)