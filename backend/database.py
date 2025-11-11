"""
This module handles the database configuration and schema definition using SQLModel.
It defines the relational models (Users, Albums, Images, Tags) and provides 
utility functions for database initialization and session management.

Dependencies:
    - sqlmodel: For ORM and schema definition.
    - sqlalchemy: Backend engine for SQLModel.
"""

import os
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv
from sqlmodel import Field, Relationship, SQLModel, create_engine, Session

# Load environment variables from .env file
load_dotenv()

# --- Configuration ---
# Fetch database URL from environment or default to local SQLite file
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./database.db")

# Create the SQLAlchemy engine. 
# 'check_same_thread=False' is required for SQLite to work with FastAPI's async nature.
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

from sqlalchemy import event

# Enable Write-Ahead Logging (WAL) for concurrency
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()


# --- Link Tables (Many-to-Many) ---

class ImageTagLink(SQLModel, table=True):
    """
    Class: ImageTagLink
    
    Description:
        A join table (association table) for the Many-to-Many relationship 
        between Images and Tags. It includes additional metadata about the 
        relationship, such as AI confidence and the source of the tag.
        
    Attributes:
        image_id (int): Foreign key to the Image table.
        tag_id (int): Foreign key to the Tag table.
        confidence (float): The AI model's confidence score (0.0 to 1.0).
        source (str): The origin of the tag (e.g., 'manual', 'ai_clip', 'ai_ocr').
        is_verified (bool): Flag indicating if the tag was manually confirmed by an admin.
    """
    image_id: Optional[int] = Field(default=None, foreign_key="image.id", primary_key=True)
    tag_id: Optional[int] = Field(default=None, foreign_key="tag.id", primary_key=True)
    
    confidence: float = Field(default=1.0)
    source: str = Field(default="manual") # 'manual', 'ai_clip', 'ai_ocr'
    is_verified: bool = Field(default=False)


# --- Core Models ---

class User(SQLModel, table=True):
    """
    Class: User
    
    Description:
        Represents an application user with authentication and authorization details.
        
    Attributes:
        id (int): Primary key.
        email (str): Unique email address used for login.
        hashed_password (str): Bcrypt-hashed password.
        full_name (Optional[str]): The user's display name.
        role (str): User role (e.g., 'admin', 'guest').
        is_active (bool): Status flag for active/deactivated accounts.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    hashed_password: str
    full_name: Optional[str] = None
    role: str = Field(default="guest")
    is_active: bool = Field(default=True)


class Album(SQLModel, table=True):
    """
    Class: Album
    
    Description:
        Represents a logical collection of images (e.g., a specific race event).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    root_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = Field(default=False)

    # Relationship to images
    images: List["Image"] = Relationship(back_populates="album")
    
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")


class Tag(SQLModel, table=True):
    """
    Class: Tag
    
    Description:
        Represents a descriptive label that can be attached to images.
        
    Attributes:
        id (int): Primary key.
        name (str): The tag text (e.g., 'BMW', 'Drift').
        category (str): Type of tag (e.g., 'vehicle', 'number', 'scene').
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    category: str = Field(default="general")

    # Many-to-Many relationship with images through ImageTagLink
    images: List["Image"] = Relationship(back_populates="tags", link_model=ImageTagLink)


class Image(SQLModel, table=True):
    """
    Class: Image
    
    Description:
        Represents a single photograph and its associated technical metadata.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    album_id: int = Field(foreign_key="album.id")
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")
    
    filename: str
    path: str
    file_hash: str = Field(index=True)
    
    captured_at: Optional[datetime] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    camera_model: Optional[str] = None
    
    is_processed: bool = Field(default=False)
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    album: Album = Relationship(back_populates="images")
    tags: List[Tag] = Relationship(back_populates="images", link_model=ImageTagLink)


# --- Utility Functions ---

def create_db_and_tables():
    """
    Function: create_db_and_tables
    
    Description:
        Initializes the database by creating all defined SQLModel tables.
        This should be called during application startup.
        
    Args:
        None
        
    Returns:
        None
        
    Notes:
        Uses SQLModel.metadata.create_all(engine).
    """
    SQLModel.metadata.create_all(engine)


def get_session():
    """
    Function: get_session
    
    Description:
        A generator function that provides a database session.
        Intended to be used as a FastAPI dependency.
        
    Yields:
        Session: An active SQLAlchemy/SQLModel session.
        
    Usage:
        @app.get("/items")
        def read_items(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session


# --- Response Models ---

class TagRead(SQLModel):
    id: int
    name: str
    category: str

class ImageRead(SQLModel):
    id: int
    album_id: int
    filename: str
    path: str
    file_hash: str
    captured_at: Optional[datetime]
    width: Optional[int]
    height: Optional[int]
    file_size: Optional[int]
    camera_model: Optional[str]
    is_processed: bool
    created_at: datetime
    tags: List[TagRead] = []
