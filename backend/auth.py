"""
Core security module handling password hashing, JWT token generation, 
and user authentication dependencies.

Dependencies:
    - passlib: For bcrypt password hashing.
    - python-jose: For encoding/decoding JWT tokens.
    - fastapi.security: For OAuth2 password flow implementation.
"""

import os
from datetime import datetime, timedelta
from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session
from dotenv import load_dotenv

from database import get_session, User

load_dotenv()

# --- Configuration ---
# In production, strictly keep these secrets in .env and never commit them!
SECRET_KEY = os.getenv("SECRET_KEY", "unsafe_secret_key_change_me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing context (Bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme: Tells FastAPI that the client sends a token in the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


# --- Utility Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Function: verify_password
    
    Description:
        Verifies if a plain-text password matches the stored hash.
        
    Args:
        plain_password (str): The raw password provided by the user.
        hashed_password (str): The bcrypt hash stored in the database.
        
    Returns:
        bool: True if passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Function: get_password_hash
    
    Description:
        Hashes a plain-text password using bcrypt.
        
    Args:
        password (str): The raw password to hash.
        
    Returns:
        str: The resulting hashed string.
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Function: create_access_token
    
    Description:
        Generates a signed JWT (JSON Web Token) for the user.
        
    Args:
        data (dict): The payload to encode (usually contains 'sub' -> username).
        expires_delta (Optional[timedelta]): Custom expiration time. If None, uses default.
        
    Returns:
        str: The encoded JWT string.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- Dependencies ---

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)] = None, session: Session = Depends(get_session)) -> Optional[User]:
    """
    Function: get_current_user
    
    Description:
        FastAPI Dependency to retrieve the currently authenticated user from the JWT token.
    """
    # Special fix for when token might be null/undefined from frontend
    if not token or token == "null" or token == "undefined":
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except JWTError:
        return None
        
    # Fetch user from DB
    user = session.query(User).filter(User.email == email).first()
    return user

async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Function: get_current_active_user
    
    Description:
        Dependency that ensures the authenticated user is also active (not banned).
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
