"""
Migration script to fix existing user profiles with NULL values.
Run this once to fix all existing profiles in the database.
"""
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.core.database import get_db
from botocore.exceptions import ClientError


def fix_null_profiles():
    """Fix all user profiles that have NULL values for critical fields."""
    db = get_db()

    # Scan for all user profiles
    # In production, you'd use pagination for large datasets
    try:
        # Query all items with SK=PROFILE
        # This is simplified - in production use proper pagination
        response = db.table.scan(
            FilterExpression='SK = :sk',
            ExpressionAttributeValues={
                ':sk': 'PROFILE'
            }
        )

        profiles = response.get('Items', [])
        fixed_count = 0

        for profile in profiles:
            needs_update = False
            updates = {}

            user_id = profile.get('id', '')

            # Check and fix NULL or missing email
            if not profile.get('email'):
                updates['email'] = f"user_{user_id}@temp.local"
                needs_update = True
                print(f"Fixing NULL email for user {user_id}")

            # Check and fix NULL or missing username
            if not profile.get('username'):
                email = profile.get('email', '')
                if email and '@' in email:
                    updates['username'] = email.split('@')[0]
                else:
                    updates['username'] = f"user_{user_id[:8]}"
                needs_update = True
                print(f"Fixing NULL username for user {user_id}")

            # Check and fix NULL or missing display_name
            if not profile.get('display_name'):
                updates['display_name'] = (
                    profile.get('full_name') or
                    updates.get('username') or
                    profile.get('username') or
                    f"User {user_id[:8]}"
                )
                needs_update = True
                print(f"Fixing NULL display_name for user {user_id}")

            # Apply updates if needed
            if needs_update:
                updates['updated_at'] = datetime.now(timezone.utc).isoformat()

                db.update_item(
                    f"USER#{user_id}",
                    "PROFILE",
                    updates
                )
                fixed_count += 1
                print(f"✅ Fixed profile for user {user_id}")

        print(f"\n🎉 Migration complete! Fixed {fixed_count} out of {len(profiles)} profiles")

    except ClientError as e:
        print(f"❌ Error during migration: {e}")
        raise


if __name__ == "__main__":
    print("🔧 Starting profile migration to fix NULL values...")
    fix_null_profiles()
