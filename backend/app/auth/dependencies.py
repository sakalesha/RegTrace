from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import time
from datetime import datetime, timedelta
from fastapi import Request
from typing import List

from shared.database.mongodb import get_db
from shared.config.settings import settings
from backend.app.auth.models import UserOut, UserRole
from pymongo.errors import DuplicateKeyError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> UserOut:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id: str = payload.get("sub")
        jti: str = payload.get("jti")
        if user_id is None:
            raise credentials_exception
            
        # Check if token is revoked
        if jti:
            revoked = await db.revoked_tokens.find_one({"jti": jti})
            if revoked:
                raise credentials_exception
                
    except InvalidTokenError:
        raise credentials_exception

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
        
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
        
    return UserOut(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user.get("is_active", True),
        must_change_password=user.get("must_change_password", False)
    )

def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: UserOut = Depends(get_current_user)):
        if current_user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must change your password before accessing the system."
            )
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user
    return role_checker

def rate_limit(max_requests: int = 5, window_seconds: int = 60):
    async def rate_limiter(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        db = get_db()
        now = datetime.utcnow()
        expire_at = now + timedelta(seconds=window_seconds)
        
        pipeline = [
            {"$set": {
                "count": {
                    "$cond": {
                        "if": {"$gt": ["$expire_at", now]},
                        "then": {"$add": [{"$ifNull": ["$count", 0]}, 1]},
                        "else": 1
                    }
                },
                "expire_at": {
                    "$cond": {
                        "if": {"$gt": ["$expire_at", now]},
                        "then": "$expire_at",
                        "else": expire_at
                    }
                }
            }}
        ]
        
        try:
            result = await db.rate_limits.find_one_and_update(
                {"ip": client_ip},
                pipeline,
                upsert=True,
                return_document=True
            )
        except DuplicateKeyError:
            result = await db.rate_limits.find_one_and_update(
                {"ip": client_ip},
                pipeline,
                upsert=True,
                return_document=True
            )
        if result and result.get("count", 0) > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
            
        return True
    return rate_limiter
