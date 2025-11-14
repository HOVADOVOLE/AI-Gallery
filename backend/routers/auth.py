"""
API endpoints related to authentication (login).
"""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr

from database import get_session, User
from auth import verify_password, create_access_token, get_current_user, get_password_hash

router = APIRouter(tags=["Authentication"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

@router.post("/register", status_code=201)
async def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    """
    Endpoint: POST /register
    
    Description:
        Creates a new user account.
    """
    # Check if email exists
    existing_user = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Create User
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role="guest" # Default role
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {"message": "User created successfully", "user_id": new_user.id}

@router.post("/token")
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session)
):
    """
    Endpoint: POST /token
    
    Description:
        The login endpoint. Accepts username (email) and password via form-data.
        Validates credentials and returns a JWT access token.
    
    Args:
        form_data: Standard OAuth2 form containing 'username' and 'password'.
        session: Database session.
        
    Returns:
        dict: JSON containing 'access_token' and 'token_type'.
    """
    # Note: OAuth2 form uses 'username' field, but we treat it as 'email'
    user = session.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me")
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Endpoint: GET /users/me
    
    Description:
        Returns the profile information of the currently logged-in user.
        Useful for the Frontend to know who is logged in.
    """
    return current_user
