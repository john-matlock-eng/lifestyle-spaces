# Framework Templates API Documentation

Comprehensive API reference for the Framework Templates feature.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Data Types](#data-types)
- [Template Endpoints](#template-endpoints)
- [Completion Endpoints](#completion-endpoints)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The Framework Templates API enables creation, management, and completion of structured data collection templates. Templates define fields with various types (text, scales, dates, etc.), organized into sections.

**Base URL**: `/api/framework-templates`

**Key Features**:
- Template versioning with automatic tracking
- Multiple field types (text, scale_1_7, scale_0_10, date, checkbox, etc.)
- Auto-dating for date fields
- Field-level validation
- Authorization controls

---

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

Obtain tokens via the `/api/auth/login` endpoint.

---

## Data Types

### FrameworkTemplate

```typescript
{
  templateId: string;           // UUID
  name: string;                 // Template name
  description: string;          // Template description
  sections: FrameworkTemplateSection[];
  icon?: string;                // Emoji or icon
  color?: string;               // Hex color code
  tags: string[];               // Tags for categorization
  version: number;              // Current version
  createdBy: string;            // User ID of creator
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
  isActive: boolean;            // Whether template is active
  spaceId?: string;             // Optional space ID if space-specific
}
```

### FrameworkTemplateSection

```typescript
{
  sectionId: string;
  sectionName: string;
  description?: string;
  fields: FrameworkTemplateField[];
  order: number;                // Display order
  collapsible?: boolean;        // Whether section can be collapsed
}
```

### FrameworkTemplateField

```typescript
{
  fieldId: string;
  fieldName: string;
  fieldType: "text" | "textarea" | "date" | "number" |
             "scale_1_7" | "scale_0_10" | "scale_custom" |
             "checkbox" | "select" | "multi_select";
  required: boolean;
  helpText?: string;            // Inline help text
  defaultValue?: any;
  placeholder?: string;
  scaleConfig?: ScaleConfig;    // For scale_custom type
  options?: string[];           // For select/multi_select
  autoDate?: boolean;           // Auto-populate with current date
  order: number;                // Display order within section
}
```

### ScaleConfig

```typescript
{
  minValue: number;
  maxValue: number;
  minLabel?: string;
  maxLabel?: string;
  step?: number;
}
```

### FrameworkTemplateCompletion

```typescript
{
  completionId: string;
  templateId: string;
  templateVersion: number;      // Version used for this completion
  userId: string;
  spaceId: string;
  fieldValues: Record<string, any>;  // field_id -> value
  completedAt: string;          // ISO 8601 timestamp
  updatedAt: string;            // ISO 8601 timestamp
  autoDatedFields: string[];    // Fields that were auto-dated
}
```

---

## Template Endpoints

### Create Template

Create a new framework template.

**Endpoint**: `POST /api/framework-templates`

**Query Parameters**:
- `space_id` (optional): Space ID if template is space-specific

**Request Body**:
```json
{
  "name": "Wellness Check-in",
  "description": "Daily wellness assessment",
  "sections": [
    {
      "sectionId": "metrics",
      "sectionName": "Wellness Metrics",
      "description": "Rate your current state",
      "fields": [
        {
          "fieldId": "energy",
          "fieldName": "Energy Level",
          "fieldType": "scale_1_7",
          "required": true,
          "helpText": "Rate from 1 (very low) to 7 (very high)",
          "order": 1
        },
        {
          "fieldId": "mood",
          "fieldName": "Mood",
          "fieldType": "scale_0_10",
          "required": true,
          "helpText": "Rate from 0 (poor) to 10 (excellent)",
          "order": 2
        }
      ],
      "order": 1
    }
  ],
  "icon": "🏥",
  "color": "#4CAF50",
  "tags": ["wellness", "daily"]
}
```

**Response**: `201 Created`
```json
{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Wellness Check-in",
  "description": "Daily wellness assessment",
  "sections": [...],
  "icon": "🏥",
  "color": "#4CAF50",
  "tags": ["wellness", "daily"],
  "version": 1,
  "createdBy": "user-123",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "isActive": true,
  "spaceId": null
}
```

**Errors**:
- `400`: Validation error (invalid field types, missing required fields)
- `401`: Unauthorized
- `500`: Server error

---

### List Templates

List all templates (with optional filters).

**Endpoint**: `GET /api/framework-templates`

**Query Parameters**:
- `space_id` (optional): Filter by space
- `tags` (optional): Comma-separated tags to filter by

**Response**: `200 OK`
```json
{
  "templates": [
    {
      "templateId": "...",
      "name": "Wellness Check-in",
      ...
    }
  ],
  "total": 1
}
```

---

### Get Template

Get a specific template (optionally a specific version).

**Endpoint**: `GET /api/framework-templates/{template_id}`

**Query Parameters**:
- `version` (optional): Specific version number (defaults to latest)

**Response**: `200 OK`
```json
{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Wellness Check-in",
  "version": 2,
  ...
}
```

**Errors**:
- `404`: Template not found

---

### Update Template

Update an existing template.

**Endpoint**: `PUT /api/framework-templates/{template_id}`

**Query Parameters**:
- `create_new_version` (optional, default: true): Whether to increment version

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "sections": [...],
  "icon": "🎯",
  "color": "#2196F3",
  "tags": ["updated", "tags"]
}
```

**Response**: `200 OK`
```json
{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Name",
  "version": 2,  // Incremented if create_new_version=true
  ...
}
```

**Errors**:
- `403`: Not authorized (only creator can update)
- `404`: Template not found

---

### Delete Template

Soft delete a template (marks as inactive).

**Endpoint**: `DELETE /api/framework-templates/{template_id}`

**Response**: `204 No Content`

**Errors**:
- `403`: Not authorized (only creator can delete)
- `404`: Template not found

---

## Completion Endpoints

### Create Completion

Create a new template completion.

**Endpoint**: `POST /api/framework-templates/completions`

**Query Parameters**:
- `space_id` (required): Space context for this completion

**Request Body**:
```json
{
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "fieldValues": {
    "energy": 6,
    "mood": 8,
    "notes": "Feeling good today"
  }
}
```

**Response**: `201 Created`
```json
{
  "completionId": "comp-123",
  "templateId": "123e4567-e89b-12d3-a456-426614174000",
  "templateVersion": 2,
  "userId": "user-123",
  "spaceId": "space-456",
  "fieldValues": {
    "energy": 6,
    "mood": 8,
    "notes": "Feeling good today",
    "date": "2025-01-15"  // Auto-dated field
  },
  "completedAt": "2025-01-15T14:30:00Z",
  "updatedAt": "2025-01-15T14:30:00Z",
  "autoDatedFields": ["date"]
}
```

**Validation**:
- Scale values must be within range (e.g., 1-7 for scale_1_7)
- Required fields must be present
- Field types must match template definition

**Errors**:
- `400`: Validation error (out of range, missing required fields)
- `404`: Template not found

---

### List Completions

List completions (by space, user, or template).

**Endpoint**: `GET /api/framework-templates/completions`

**Query Parameters** (at least one required):
- `space_id`: Filter by space
- `user_id`: Filter by user (defaults to current user if not provided)
- `template_id`: Filter by template

**Response**: `200 OK`
```json
{
  "completions": [
    {
      "completionId": "comp-123",
      "templateId": "123e4567-e89b-12d3-a456-426614174000",
      "fieldValues": {...},
      ...
    }
  ],
  "total": 1
}
```

---

### Get Completion

Get a specific completion.

**Endpoint**: `GET /api/framework-templates/completions/{completion_id}`

**Query Parameters**:
- `space_id` (required): Space ID

**Response**: `200 OK`
```json
{
  "completionId": "comp-123",
  "templateId": "...",
  "fieldValues": {...},
  ...
}
```

**Errors**:
- `404`: Completion not found

---

### Update Completion

Update an existing completion.

**Endpoint**: `PUT /api/framework-templates/completions/{completion_id}`

**Query Parameters**:
- `space_id` (required): Space ID

**Request Body**:
```json
{
  "fieldValues": {
    "energy": 7,  // Updated value
    "mood": 9     // Updated value
  }
}
```

**Response**: `200 OK`
```json
{
  "completionId": "comp-123",
  "fieldValues": {
    "energy": 7,
    "mood": 9,
    "notes": "Feeling good today"  // Unchanged field preserved
  },
  "updatedAt": "2025-01-15T15:00:00Z",
  ...
}
```

**Errors**:
- `403`: Not authorized (only creator can update)
- `404`: Completion not found

---

### Delete Completion

Delete a completion.

**Endpoint**: `DELETE /api/framework-templates/completions/{completion_id}`

**Query Parameters**:
- `space_id` (required): Space ID

**Response**: `204 No Content`

**Errors**:
- `403`: Not authorized (only creator can delete)
- `404`: Completion not found

---

## Error Handling

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**:
- `400 Bad Request`: Validation error, invalid input
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Not authorized for this action
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Unexpected server error

---

## Examples

### Example 1: Complete Workflow

**1. Create a wellness template:**
```bash
curl -X POST https://api.example.com/api/framework-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Wellness",
    "description": "Track daily wellness metrics",
    "sections": [{
      "sectionId": "metrics",
      "sectionName": "Metrics",
      "fields": [{
        "fieldId": "energy",
        "fieldName": "Energy Level",
        "fieldType": "scale_1_7",
        "required": true,
        "order": 1
      }],
      "order": 1
    }],
    "tags": ["wellness"]
  }'
```

**2. Complete the template:**
```bash
curl -X POST https://api.example.com/api/framework-templates/completions?space_id=space-123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template-uuid",
    "fieldValues": {
      "energy": 6
    }
  }'
```

**3. List my completions:**
```bash
curl https://api.example.com/api/framework-templates/completions \
  -H "Authorization: Bearer $TOKEN"
```

---

### Example 2: Template Versioning

**1. Update template (creates v2):**
```bash
curl -X PUT https://api.example.com/api/framework-templates/template-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Wellness v2"
  }'
```

**2. Get specific version:**
```bash
curl https://api.example.com/api/framework-templates/template-uuid?version=1 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Example 3: Field Types

**All field types in one template:**
```json
{
  "name": "Comprehensive Template",
  "sections": [{
    "sectionId": "all_types",
    "sectionName": "All Field Types",
    "fields": [
      {
        "fieldId": "text_field",
        "fieldName": "Text Field",
        "fieldType": "text",
        "required": false,
        "placeholder": "Enter text...",
        "order": 1
      },
      {
        "fieldId": "textarea_field",
        "fieldName": "Long Text",
        "fieldType": "textarea",
        "required": false,
        "order": 2
      },
      {
        "fieldId": "date_field",
        "fieldName": "Date",
        "fieldType": "date",
        "required": true,
        "autoDate": true,
        "order": 3
      },
      {
        "fieldId": "number_field",
        "fieldName": "Number",
        "fieldType": "number",
        "required": false,
        "order": 4
      },
      {
        "fieldId": "scale_1_7",
        "fieldName": "Scale 1-7",
        "fieldType": "scale_1_7",
        "required": true,
        "helpText": "Rate from 1 to 7",
        "order": 5
      },
      {
        "fieldId": "scale_0_10",
        "fieldName": "Scale 0-10",
        "fieldType": "scale_0_10",
        "required": true,
        "helpText": "Rate from 0 to 10",
        "order": 6
      },
      {
        "fieldId": "custom_scale",
        "fieldName": "Custom Scale",
        "fieldType": "scale_custom",
        "required": false,
        "scaleConfig": {
          "minValue": 10,
          "maxValue": 100,
          "minLabel": "Low",
          "maxLabel": "High",
          "step": 10
        },
        "order": 7
      },
      {
        "fieldId": "checkbox_field",
        "fieldName": "Checkbox",
        "fieldType": "checkbox",
        "required": false,
        "order": 8
      },
      {
        "fieldId": "select_field",
        "fieldName": "Select One",
        "fieldType": "select",
        "required": false,
        "options": ["Option 1", "Option 2", "Option 3"],
        "order": 9
      },
      {
        "fieldId": "multi_select",
        "fieldName": "Select Multiple",
        "fieldType": "multi_select",
        "required": false,
        "options": ["Choice A", "Choice B", "Choice C"],
        "order": 10
      }
    ],
    "order": 1
  }],
  "tags": ["comprehensive"]
}
```

---

## Type Storage Validation

**Important**: Scale values are stored as integers, not strings:

```json
// ✅ Correct
{
  "fieldValues": {
    "scale_1_7_field": 5,
    "scale_0_10_field": 8
  }
}

// ❌ Incorrect
{
  "fieldValues": {
    "scale_1_7_field": "5",
    "scale_0_10_field": "8"
  }
}
```

DynamoDB stores numbers as Decimals, but the backend automatically converts them to int/float for JSON responses.

---

## Query Performance Notes

**Current Design** (v1.0):
- Queries by space: `O(n)` where n = completions in space
- Queries by user: `O(n)` where n = user's completions
- Date-range queries: Requires filtering in application code

**Future Optimization** (Sprint 3-4):
- Add GSI2 for efficient date-range queries
- Pattern: `GSI2-PK: USER#{user_id}#TEMPLATE#{template_id}`, `GSI2-SK: DATE#{YYYY-MM-DD}#{completion_id}`

---

## Need Help?

- **GitHub Issues**: https://github.com/your-org/lifestyle-spaces/issues
- **API Examples**: See `examples/` directory
- **Frontend Integration**: See `frontend/src/pages/FrameworkTemplateExample.tsx`
