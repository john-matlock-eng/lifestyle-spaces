# Invite Code Backfill Guide

## Problem Statement

Spaces created before the invite code feature was implemented may not have invite codes assigned to them. This can happen in several scenarios:

1. Spaces created before the invite code feature was added
2. Database migration issues where the invite_code field wasn't saved
3. Spaces created through alternative paths that bypassed invite code generation
4. Production deployment issues

## Solution Overview

The system provides **two methods** to add invite codes to existing spaces:

### Method 1: API Endpoint (Recommended for Individual Spaces)

Use the existing regenerate invite code endpoint to add/regenerate codes for specific spaces.

### Method 2: Backfill Script (Recommended for Bulk Operations)

Use the automated backfill script to scan all spaces and add missing invite codes.

---

## Method 1: Using the API Endpoint

### Endpoint Details

**Endpoint:** `POST /api/spaces/{space_id}/invite`

**Authentication:** Required (JWT token)

**Authorization:** Owner or Admin role in the space

**Response:**
```json
{
  "invite_code": "AB12CD34",
  "invite_url": "/join/AB12CD34"
}
```

### How It Works

The `regenerate_invite_code()` method in `app/services/space.py` is designed to handle both scenarios:

1. **Space has existing invite code:** Generates new code, deletes old mapping, creates new mapping
2. **Space has NO invite code:** Generates new code, creates new mapping (gracefully handles missing old code)

Key code snippet (lines 642-662 in `space.py`):
```python
old_code = response['Item'].get('invite_code')  # Returns None if missing
new_code = self._generate_invite_code()

# Update space with new code
self.table.update_item(...)

# Delete old invite mapping if exists
if old_code:  # <-- Gracefully handles None
    try:
        self.table.delete_item(...)
    except Exception:
        pass
```

### Usage Example

#### Using curl:
```bash
curl -X POST "https://api.lifestylespaces.com/api/spaces/{space_id}/invite" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Using Python requests:
```python
import requests

space_id = "your-space-id-here"
token = "your-jwt-token"

response = requests.post(
    f"https://api.lifestylespaces.com/api/spaces/{space_id}/invite",
    headers={"Authorization": f"Bearer {token}"}
)

result = response.json()
print(f"Invite Code: {result['invite_code']}")
print(f"Invite URL: {result['invite_url']}")
```

#### From Frontend (React):
```typescript
const regenerateInviteCode = async (spaceId: string) => {
  const token = await getCurrentUserToken();

  const response = await fetch(
    `/api/spaces/${spaceId}/invite`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.invite_code;
};
```

### Error Handling

| Status Code | Error | Description |
|-------------|-------|-------------|
| 403 | Forbidden | User is not owner/admin of the space |
| 404 | Not Found | Space does not exist |
| 500 | Internal Server Error | Database error or other server issue |

---

## Method 2: Using the Backfill Script

### When to Use

- You have **multiple spaces** without invite codes
- You want to **audit** all spaces in the database
- You're performing a **one-time migration** after deploying the invite code feature
- You want to **preview** what would be updated before making changes

### Script Location

```
backend/scripts/backfill_invite_codes.py
```

### Prerequisites

1. Python environment with dependencies installed
2. AWS credentials configured (for DynamoDB access)
3. Access to the DynamoDB table used by the application

### Usage

#### Dry Run (Preview Changes)

See what would be updated without making actual changes:

```bash
cd backend
python scripts/backfill_invite_codes.py --dry-run
```

**Output:**
```
2024-01-15 10:30:00 - INFO - ============================================================
2024-01-15 10:30:00 - INFO - Starting invite code backfill process
2024-01-15 10:30:00 - INFO - ============================================================
2024-01-15 10:30:01 - INFO - Scanning DynamoDB for all spaces...
2024-01-15 10:30:02 - INFO - Found 15 total spaces
2024-01-15 10:30:02 - INFO - Space 'My Workspace' (ID: abc123) is missing invite code
2024-01-15 10:30:02 - INFO - Space 'Team Hub' (ID: def456) is missing invite code
2024-01-15 10:30:02 - INFO - Found 2 spaces without invite codes
2024-01-15 10:30:02 - INFO - DRY RUN MODE - No changes will be made
2024-01-15 10:30:02 - INFO - [DRY RUN] Would add invite code to space 'My Workspace' (ID: abc123)
2024-01-15 10:30:02 - INFO - [DRY RUN] Would add invite code to space 'Team Hub' (ID: def456)
2024-01-15 10:30:02 - INFO - ============================================================
2024-01-15 10:30:02 - INFO - BACKFILL SUMMARY
2024-01-15 10:30:02 - INFO - ============================================================
2024-01-15 10:30:02 - INFO - Total spaces processed: 2
2024-01-15 10:30:02 - INFO - Successfully updated: 2
2024-01-15 10:30:02 - INFO - Failed: 0
2024-01-15 10:30:02 - INFO -
2024-01-15 10:30:02 - INFO - *** DRY RUN COMPLETE - No changes were made ***
2024-01-15 10:30:02 - INFO - Run without --dry-run to apply changes
```

#### Execute Backfill

Actually update the spaces:

```bash
cd backend
python scripts/backfill_invite_codes.py
```

**Output:**
```
2024-01-15 10:35:00 - INFO - ============================================================
2024-01-15 10:35:00 - INFO - Starting invite code backfill process
2024-01-15 10:35:00 - INFO - ============================================================
2024-01-15 10:35:01 - INFO - Scanning DynamoDB for all spaces...
2024-01-15 10:35:02 - INFO - Found 15 total spaces
2024-01-15 10:35:02 - INFO - Space 'My Workspace' (ID: abc123) is missing invite code
2024-01-15 10:35:02 - INFO - Space 'Team Hub' (ID: def456) is missing invite code
2024-01-15 10:35:02 - INFO - Found 2 spaces without invite codes
2024-01-15 10:35:02 - INFO - ============================================================
2024-01-15 10:35:03 - INFO - ✓ Added invite code 'A1B2C3D4' to space 'My Workspace' (ID: abc123)
2024-01-15 10:35:03 - INFO - ✓ Added invite code 'X9Y8Z7W6' to space 'Team Hub' (ID: def456)
2024-01-15 10:35:03 - INFO - ============================================================
2024-01-15 10:35:03 - INFO - BACKFILL SUMMARY
2024-01-15 10:35:03 - INFO - ============================================================
2024-01-15 10:35:03 - INFO - Total spaces processed: 2
2024-01-15 10:35:03 - INFO - Successfully updated: 2
2024-01-15 10:35:03 - INFO - Failed: 0
2024-01-15 10:35:03 - INFO -
2024-01-15 10:35:03 - INFO - *** BACKFILL COMPLETE ***
```

### Script Features

1. **Safe by Default:** Use `--dry-run` to preview changes
2. **Comprehensive Logging:** Detailed output of all operations
3. **Error Handling:** Continues processing even if individual spaces fail
4. **Summary Report:** Shows total processed, successful, and failed updates
5. **Pagination Support:** Handles large numbers of spaces efficiently

### How the Script Works

1. **Scan Phase:** Scans DynamoDB for all space items (`PK=SPACE#*, SK=METADATA`)
2. **Filter Phase:** Identifies spaces missing the `invite_code` field
3. **Update Phase:** For each space without a code:
   - Calls `SpaceService.regenerate_invite_code(space_id)`
   - Generates an 8-character alphanumeric invite code
   - Updates the space item with the new code
   - Creates an `INVITE#` mapping item for lookup
4. **Report Phase:** Prints summary of operations

### Error Scenarios

The script handles various error scenarios:

| Scenario | Handling |
|----------|----------|
| DynamoDB unavailable | Script fails immediately with error message |
| Individual space update fails | Logs error, continues with next space |
| Permission denied | Logs error for that space, continues |
| Network timeout | Retry logic in boto3 client handles this |

---

## Verification

### Verify Invite Code Was Added

After using either method, verify the invite code was added:

#### Using the API:
```bash
curl -X GET "https://api.lifestylespaces.com/api/spaces/{space_id}" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Look for the `inviteCode` field in the response:
```json
{
  "spaceId": "abc123",
  "name": "My Workspace",
  "inviteCode": "A1B2C3D4",
  ...
}
```

#### Using DynamoDB Console:

1. Go to AWS DynamoDB Console
2. Select your table
3. Query with:
   - PK = `SPACE#{space_id}`
   - SK = `METADATA`
4. Check for `invite_code` attribute

#### Verify Invite Mapping:

Query for the invite mapping:
- PK = `INVITE#{invite_code}`
- SK = `SPACE#{space_id}`

Should return an item with `space_id` attribute.

---

## Testing

### Unit Tests

Run the comprehensive test suite for invite code backfill:

```bash
cd backend
python -m pytest tests/unit/test_space_invite_code_backfill.py -v
```

**Test Coverage:**
- ✓ Regenerating code on space without code
- ✓ Regenerating code on space with existing code
- ✓ Error handling for non-existent spaces
- ✓ Graceful handling of delete errors
- ✓ Multiple spaces backfill
- ✓ Invite code format validation
- ✓ Endpoint response format

### Integration Tests

Test the complete flow:

```bash
python -m pytest tests/test_spaces.py::TestSpaceInviteCodes -v
```

---

## Production Deployment Checklist

When deploying to production:

- [ ] Review all spaces that need invite codes
- [ ] Run backfill script with `--dry-run` first
- [ ] Schedule maintenance window if needed
- [ ] Take database snapshot before running script
- [ ] Run backfill script without `--dry-run`
- [ ] Verify all spaces have invite codes
- [ ] Test invite code functionality
- [ ] Monitor CloudWatch logs for errors
- [ ] Update documentation with completion date

---

## Troubleshooting

### Issue: Script shows "No spaces found in the database"

**Cause:** DynamoDB connection issue or empty table

**Solution:**
1. Verify AWS credentials are configured
2. Check DynamoDB table name is correct
3. Verify the table exists and has data

### Issue: "Permission denied" errors

**Cause:** Insufficient IAM permissions

**Solution:**
Ensure IAM role/user has these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/your-table-name"
    }
  ]
}
```

### Issue: Endpoint returns 403 Forbidden

**Cause:** User is not owner/admin of the space

**Solution:**
1. Verify user has correct role in the space
2. Check space membership in DynamoDB
3. Use a different user with admin/owner permissions

### Issue: Generated invite codes are not unique

**Cause:** Extremely unlikely but theoretically possible

**Solution:**
The code uses `secrets.token_urlsafe(6)` which provides cryptographically strong randomness. Collisions are statistically improbable. If this occurs, regenerate the code again.

---

## API Contract Reference

### POST /api/spaces/{space_id}/invite

**Request:**
```http
POST /api/spaces/{space_id}/invite HTTP/1.1
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "invite_code": "A1B2C3D4",
  "invite_url": "/join/A1B2C3D4"
}
```

**Error Responses:**

403 Forbidden:
```json
{
  "detail": "Only owners and admins can regenerate invite codes"
}
```

404 Not Found:
```json
{
  "detail": "Space {space_id} not found"
}
```

500 Internal Server Error:
```json
{
  "detail": "Failed to regenerate invite code"
}
```

---

## Code References

- **Service Method:** `backend/app/services/space.py` line 622 - `regenerate_invite_code()`
- **Helper Method:** `backend/app/services/space.py` line 90 - `_generate_invite_code()`
- **API Endpoint:** `backend/app/api/routes/spaces.py` line 263 - `POST /{space_id}/invite`
- **Backfill Script:** `backend/scripts/backfill_invite_codes.py`
- **Tests:** `backend/tests/unit/test_space_invite_code_backfill.py`

---

## FAQ

**Q: Will regenerating an invite code break existing invite links?**

A: Yes. When you regenerate a code, the old invite code mapping is deleted, so old invite links will no longer work. Only use this if you need to invalidate old invites.

**Q: Can I choose a custom invite code?**

A: No. Invite codes are randomly generated using `secrets.token_urlsafe()` for security. Custom codes could lead to collisions and security issues.

**Q: How long are invite codes valid?**

A: Invite codes do not expire. They remain valid until regenerated.

**Q: Can I see all invite codes for my spaces?**

A: Yes, call `GET /api/spaces/{space_id}` and check the `inviteCode` field in the response (if you're a member of the space).

**Q: What happens if I run the backfill script twice?**

A: The script only processes spaces that don't have invite codes. If a space already has a code, it will be skipped. However, running the script will regenerate codes for any spaces that are still missing them.

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the test files for usage examples
3. Check CloudWatch logs for detailed error messages
4. Contact the development team with:
   - Space ID
   - Error message
   - Steps to reproduce
