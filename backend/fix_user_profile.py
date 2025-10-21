"""
Simple script to fix a specific user profile in DynamoDB.
Usage: python fix_user_profile.py <user_id> <email> <username> <display_name>
"""
import sys
import os
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import get_db


def fix_user_profile(user_id: str, email: str, username: str, display_name: str):
    """Fix a user profile with correct attributes."""
    db = get_db()

    updates = {
        'email': email,
        'username': username,
        'display_name': display_name,
        'updated_at': datetime.now(timezone.utc).isoformat()
    }

    print(f"Updating profile for user {user_id}")
    print(f"  Email: {email}")
    print(f"  Username: {username}")
    print(f"  Display Name: {display_name}")

    db.update_item(f"USER#{user_id}", "PROFILE", updates)

    print("✅ Profile updated successfully!")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python fix_user_profile.py <user_id> <email> <username> <display_name>")
        print("")
        print("Example:")
        print('  python fix_user_profile.py 24c8e4c8-b051-70ac-0437-58b6db7b2b38 matlock.john@gmail.com CliffordBRD CliffordBRD')
        sys.exit(1)

    user_id = sys.argv[1]
    email = sys.argv[2]
    username = sys.argv[3]
    display_name = sys.argv[4]

    fix_user_profile(user_id, email, username, display_name)
