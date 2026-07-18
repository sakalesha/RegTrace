from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import timedelta, datetime
import jwt
from shared.database.mongodb import get_db
from shared.config.settings import settings
from shared.services.audit import AuditLogService
from backend.app.auth.models import UserCreate, UserOut, Token, ChangePasswordRequest, UserRole
from backend.app.auth.security import verify_password, get_password_hash, create_access_token
from backend.app.auth.dependencies import get_current_user, require_role, rate_limit, oauth2_scheme
from fastapi import Request

router = APIRouter()

@router.post("/login", response_model=Token, dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60))])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # form_data.username will contain the email
    user = await db.users.find_one({"email": form_data.username.lower()})
    
    if not user or not verify_password(form_data.password, user["password_hash"]):
        await AuditLogService.append("LOGIN_FAILED", {"email_attempted": form_data.username}, actor="system")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
        
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    user_out = UserOut(
        id=str(user["_id"]),
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        is_active=user.get("is_active", True),
        must_change_password=user.get("must_change_password", False)
    )
    
    await AuditLogService.append("LOGIN_SUCCESS", {"email": user["email"]}, actor=str(user["_id"]))
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_out.model_dump()}

@router.post("/logout")
async def logout(
    token: str = Depends(oauth2_scheme),
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            await db.revoked_tokens.update_one(
                {"jti": jti},
                {"$setOnInsert": {
                    "revoked_at": datetime.utcnow(),
                    "expires_at": datetime.utcfromtimestamp(exp) if exp else None
                }},
                upsert=True
            )
    except jwt.PyJWTError:
        # Ignore decode errors on logout, token is invalid anyway
        pass
        
    await AuditLogService.append("LOGOUT", {"email": current_user.email}, actor=current_user.id)
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserOut)
async def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: UserOut = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
        
    new_hashed_password = get_password_hash(data.new_password)
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"password_hash": new_hashed_password, "must_change_password": False}}
    )
    
    await AuditLogService.append("PASSWORD_CHANGED", {}, actor=current_user.id)
    return {"message": "Password changed successfully"}

@router.post("/users", response_model=UserOut)
async def create_user(
    user_data: UserCreate,
    current_user: UserOut = Depends(require_role([UserRole.ADMIN])),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    existing = await db.users.find_one({"email": user_data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    new_user = {
        "email": user_data.email.lower(),
        "full_name": user_data.full_name,
        "role": user_data.role.value,
        "password_hash": get_password_hash(user_data.password),
        "is_active": True,
        "must_change_password": True
    }
    
    result = await db.users.insert_one(new_user)
    
    await AuditLogService.append("USER_CREATED", {
        "new_user_id": str(result.inserted_id),
        "role": user_data.role.value
    }, actor=current_user.id)
    
    return UserOut(
        id=str(result.inserted_id),
        email=new_user["email"],
        full_name=new_user["full_name"],
        role=UserRole(new_user["role"]),
        is_active=True,
        must_change_password=True
    )
