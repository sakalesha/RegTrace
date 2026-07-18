import asyncio
import sys
from pathlib import Path

# Add project root to path so imports work
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from shared.config.settings import settings
from backend.app.auth.security import get_password_hash
from backend.app.auth.models import UserRole

async def seed_users():
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    
    import os
    
    # Require passwords from environment variables (failing fast if absent)
    admin_pw = os.environ["ADMIN_PASSWORD"]
    officer_pw = os.environ["OFFICER_PASSWORD"]
    viewer_pw = os.environ["VIEWER_PASSWORD"]

    users = [
        {
            "email": os.getenv("ADMIN_EMAIL", "admin@regtrace.com").lower(),
            "full_name": "System Admin",
            "role": UserRole.ADMIN.value,
            "password_hash": get_password_hash(admin_pw),
            "is_active": True,
            "must_change_password": True
        },
        {
            "email": os.getenv("OFFICER_EMAIL", "officer@regtrace.com").lower(),
            "full_name": "Alice Officer",
            "role": UserRole.COMPLIANCE_OFFICER.value,
            "password_hash": get_password_hash(officer_pw),
            "is_active": True,
            "must_change_password": True
        },
        {
            "email": os.getenv("VIEWER_EMAIL", "viewer@regtrace.com").lower(),
            "full_name": "Bob Viewer",
            "role": UserRole.VIEWER.value,
            "password_hash": get_password_hash(viewer_pw),
            "is_active": True,
            "must_change_password": True
        }
    ]
    
    for u in users:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one(u)
            print(f"Created user: {u['email']}")
        else:
            await db.users.update_one(
                {"email": u["email"]},
                {"$set": {
                    "password_hash": u["password_hash"],
                    "must_change_password": True
                }}
            )
            print(f"User already exists, updated password and must_change_password flag: {u['email']}")
            
    client.close()

if __name__ == "__main__":
    print("Seeding database...")
    asyncio.run(seed_users())
    print("Done!")
