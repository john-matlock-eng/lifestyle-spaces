# Quick Start: Getting an Invite Code for Your Space

## For a Single Space (Quick Fix)

If your space doesn't have an invite code, you can generate one using the API endpoint:

### Option 1: Using the Frontend UI

1. Navigate to your space settings
2. Look for "Invite Code" or "Share Space" section
3. Click "Generate Invite Code" or "Regenerate Code"
4. Copy the generated code

### Option 2: Using curl (Command Line)

```bash
# Replace {space_id} with your actual space ID
# Replace {your_jwt_token} with your authentication token

curl -X POST "https://api.lifestylespaces.com/api/spaces/{space_id}/invite" \
  -H "Authorization: Bearer {your_jwt_token}" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "invite_code": "A1B2C3D4",
  "invite_url": "/join/A1B2C3D4"
}
```

### Option 3: Using the Python Script

```bash
# From the backend directory
cd backend
python scripts/backfill_invite_codes.py
```

---

## For Multiple Spaces (Bulk Operation)

### Step 1: Preview What Will Change (Dry Run)

```bash
cd backend
python scripts/backfill_invite_codes.py --dry-run
```

This shows you which spaces are missing invite codes WITHOUT making any changes.

### Step 2: Apply Changes

```bash
cd backend
python scripts/backfill_invite_codes.py
```

This will generate invite codes for all spaces that don't have them.

---

## How to Find Your Space ID

### Method 1: From the URL
When viewing your space in the browser, the URL will contain the space ID:
```
https://lifestylespaces.com/spaces/abc-123-def-456
                                   ^^^^^^^^^^^^^^^^
                                   This is your space ID
```

### Method 2: Using the API
```bash
curl -X GET "https://api.lifestylespaces.com/api/spaces" \
  -H "Authorization: Bearer {your_jwt_token}"
```

This returns all your spaces with their IDs.

---

## Verification

After generating an invite code, verify it was created:

```bash
curl -X GET "https://api.lifestylespaces.com/api/spaces/{space_id}" \
  -H "Authorization: Bearer {your_jwt_token}"
```

Look for `"inviteCode": "XXXXXXXX"` in the response.

---

## Common Issues

### "403 Forbidden" Error
**Problem:** You're not the owner or admin of the space.

**Solution:** Only space owners and admins can generate invite codes. Ask the space owner to do it, or have them make you an admin first.

### "404 Not Found" Error
**Problem:** The space ID doesn't exist.

**Solution:** Double-check the space ID. Use the API to list all your spaces and confirm the ID.

### Script Shows "No spaces found"
**Problem:** No spaces in the database or AWS credentials not configured.

**Solution:**
1. Verify AWS credentials: `aws configure list`
2. Check the DynamoDB table exists: `aws dynamodb list-tables`
3. Verify you're connected to the right AWS account/region

---

## Need More Help?

See the full documentation: `INVITE_CODE_BACKFILL.md`

For technical details, see:
- API endpoint: `backend/app/api/routes/spaces.py` line 263
- Service method: `backend/app/services/space.py` line 622
- Backfill script: `backend/scripts/backfill_invite_codes.py`
