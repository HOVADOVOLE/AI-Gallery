"""
API endpoints for retrieving images and albums for display in the frontend.
Supports pagination and filtering by tags.
"""

from typing import List, Optional
from datetime import datetime
import os
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select, col, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from database import get_session, Image, Tag, Album, ImageTagLink, ImageRead
from auth import get_current_user, User

router = APIRouter(prefix="/gallery", tags=["Gallery"])

class PaginatedImages(BaseModel):
    items: List[ImageRead]
    page: int
    limit: int

class AlbumReadWithStats(BaseModel):
    id: int
    name: str
    created_at: datetime
    photo_count: int
    cover_photo_hash: Optional[str] = None

@router.get("/images/{image_id}/file")
async def get_image_file(
    image_id: int,
    session: Session = Depends(get_session),
    # current_user: Optional[User] = Depends(get_current_user) 
):
    image = session.exec(select(Image).where(Image.id == image_id)).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if not os.path.exists(image.path):
        raise HTTPException(status_code=404, detail="File not found on disk")
        
    return FileResponse(image.path)

@router.get("/images", response_model=PaginatedImages)
async def get_images(
    page: int = 0,
    limit: int = 50,
    tag: Optional[str] = None,
    album_id: Optional[int] = None,
    my_photos: bool = False,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    offset = page * limit
    
    query = select(Image).options(selectinload(Image.tags))
    
    if my_photos:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required to view your photos")
        query = query.where(Image.owner_id == current_user.id)
    
    if album_id:
        query = query.where(Image.album_id == album_id)
    
    query = query.where(Image.is_deleted == False)
        
    if tag:
        query = query.join(ImageTagLink).join(Tag).where(Tag.name == tag)

    query = query.order_by(col(Image.created_at).desc())
    
    results = session.exec(query.offset(offset).limit(limit)).all()
    
    return {
        "items": results,
        "page": page,
        "limit": limit
    }


@router.get("/images/{image_id}", response_model=ImageRead)
async def get_image_detail(
    image_id: int,
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    query = select(Image).where(Image.id == image_id).where(Image.is_deleted == False).options(selectinload(Image.tags))
    image = session.exec(query).first()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    return image


@router.get("/albums", response_model=List[AlbumReadWithStats])
async def get_albums(
    session: Session = Depends(get_session),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Endpoint: GET /gallery/albums
    Returns list of albums with photo count and cover image hash.
    """
    albums = session.exec(select(Album).where(Album.is_deleted == False).order_by(Album.created_at.desc())).all()
    
    results = []
    for album in albums:
        # Get count
        count = session.exec(select(func.count(Image.id)).where(Image.album_id == album.id).where(Image.is_deleted == False)).first()
        
        # Get cover (last uploaded image)
        cover = session.exec(select(Image).where(Image.album_id == album.id).where(Image.is_deleted == False).order_by(Image.created_at.desc()).limit(1)).first()
        
        results.append({
            "id": album.id,
            "name": album.name,
            "created_at": album.created_at,
            "photo_count": count or 0,
            "cover_photo_hash": cover.file_hash if cover else None
        })
        
    return results