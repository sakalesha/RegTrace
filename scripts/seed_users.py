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
    
    users = [
        {
            "email": "admin@regtrace.com",
            "full_name": "System Admin",
            "role": UserRole.ADMIN.value,
            "password_hash": get_password_hash("Admin123!"),
            "is_active": True,
            "must_change_password": False
        },
        {
            "email": "officer@regtrace.com",
            "full_name": "Alice Officer",
            "role": UserRole.COMPLIANCE_OFFICER.value,
            "password_hash": get_password_hash("Officer123!"),
            "is_active": True,
            "must_change_password": False
        },
        {
            "email": "viewer@regtrace.com",
            "full_name": "Bob Viewer",
            "role": UserRole.VIEWER.value,
            "password_hash": get_password_hash("Viewer123!"),
            "is_active": True,
            "must_change_password": False
        }
    ]
    
    for u in users:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one(u)
            print(f"Created user: {u['email']}")
        else:
            print(f"User already exists: {u['email']}")
            
    client.close()

if __name__ == "__main__":
    print("Seeding database...")
    asyncio.run(seed_users())
    print("Done!")
