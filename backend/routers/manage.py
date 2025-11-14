from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select, col, func, desc
import yaml
import os

from database import get_session, Image, Album, Tag, ImageTagLink
from auth import get_current_user, User

router = APIRouter(prefix="/manage", tags=["Management"])

CONFIG_PATH = "config.yaml"

def get_directory_size(path: str) -> int:
    """Recursively calculate directory size in bytes."""
    total_size = 0
    if not os.path.exists(path):
        return 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            if not os.path.islink(fp):
                total_size += os.path.getsize(fp)
    return total_size

@router.get("/readme")
async def get_readme():
    """
    Endpoint: GET /manage/readme
    Returns the content of README.md.
    """
    # In Docker, we mapped it to /app/README.md.
    # Locally, if running from backend/, it is at ../README.md.
    
    possible_paths = ["README.md", "../README.md", "/app/README.md"]
    
    content = "# README not found"
    
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                break
            except Exception as e:
                content = f"# Error reading README: {e}"
                
    return {"content": content}

# --- Stats Endpoint ---
@router.get("/stats")
async def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint: GET /manage/stats
    Description: Returns high-level statistics for the dashboard.
    """
    # 1. Basic Counts
    total_images = session.exec(select(func.count(Image.id)).where(Image.is_deleted == False)).first() or 0
    total_albums = session.exec(select(func.count(Album.id)).where(Album.is_deleted == False)).first() or 0
    total_tags = session.exec(select(func.count(Tag.id))).first() or 0
    pending_ai = session.exec(select(func.count(Image.id)).where(Image.is_processed == False).where(Image.is_deleted == False)).first() or 0
    
    # 2. Storage Usage (Real - App Only)
    data_dir_size = get_directory_size("data")
    db_size = os.path.getsize("database.db") if os.path.exists("database.db") else 0
    total_storage_bytes = data_dir_size + db_size
    
    # 3. Upload History (Last 14 days)
    history_query = (
        select(func.strftime('%Y-%m-%d', Image.created_at).label('date'), func.count(Image.id))
        .where(Image.is_deleted == False)
        .group_by(func.strftime('%Y-%m-%d', Image.created_at))
        .order_by(desc('date'))
        .limit(14)
    )
    history_results = session.exec(history_query).all()
    history_data = [{"date": r[0], "count": r[1]} for r in history_results][::-1]

    # 4. Top Tags
    tags_query = (
        select(Tag.name, func.count(ImageTagLink.image_id).label('count'))
        .join(ImageTagLink, Tag.id == ImageTagLink.tag_id)
        .group_by(Tag.id)
        .order_by(desc('count'))
        .limit(6)
    )
    tags_results = session.exec(tags_query).all()
    colors = ["indigo", "violet", "grape", "pink", "red", "orange"]
    top_tags = [{"name": r[0], "value": r[1], "color": colors[i % len(colors)]} for i, r in enumerate(tags_results)]

    return {
        "total_images": total_images,
        "total_albums": total_albums,
        "total_tags": total_tags,
        "pending_ai": pending_ai,
        "storage": {
            "used_bytes": total_storage_bytes,
            "formatted": f"{total_storage_bytes / (1024*1024):.2f} MB" 
        },
        "history": history_data,
        "top_tags": top_tags
    }

# --- Config Management ---

@router.get("/config")
async def get_config(
    current_user: User = Depends(get_current_user)
):
    if not os.path.exists(CONFIG_PATH):
        raise HTTPException(status_code=404, detail="Config file not found")
    try:
        with open(CONFIG_PATH, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse config: {e}")

@router.post("/config")
async def update_config(
    new_config: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if current_user.role != "admin":
         pass 

    try:
        with open(CONFIG_PATH, "w") as f:
            yaml.dump(new_config, f, sort_keys=False)
        return {"status": "success", "message": "Configuration updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save config: {e}")


# --- Image Management & Tags ---

@router.post("/images/delete")
async def delete_images_batch(
    image_ids: List[int] = Body(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not image_ids: return {"processed": 0}

    statement = select(Image).where(col(Image.id).in_(image_ids))
    images_to_delete = session.exec(statement).all()
    
    deleted_count = 0
    for img in images_to_delete:
        img.is_deleted = True
        session.add(img)
        deleted_count += 1
        
    session.commit()
    return {"message": "Batch delete successful", "deleted": deleted_count}


@router.post("/images/{image_id}/tags")
async def add_image_tag(
    image_id: int,
    tag_name: str = Body(..., embed=True),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Add a manual tag to an image. Creates the tag if it doesn't exist.
    """
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    img = session.get(Image, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Find or Create Tag
    tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()
    if not tag:
        tag = Tag(name=tag_name, category="manual")
        session.add(tag)
        session.commit()
        session.refresh(tag)
        
    # Create Link if not exists
    link = session.exec(select(ImageTagLink).where(ImageTagLink.image_id==img.id, ImageTagLink.tag_id==tag.id)).first()
    if not link:
        link = ImageTagLink(
            image_id=img.id, 
            tag_id=tag.id, 
            source="manual", 
            confidence=1.0, 
            is_verified=True
        )
        session.add(link)
        session.commit()
        
    return {"status": "success", "tag": tag}


@router.delete("/images/{image_id}/tags/{tag_id}")
async def remove_image_tag(
    image_id: int,
    tag_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    link = session.exec(select(ImageTagLink).where(ImageTagLink.image_id==image_id, ImageTagLink.tag_id==tag_id)).first()
    if not link:
        raise HTTPException(status_code=404, detail="Tag not linked to image")
        
    session.delete(link)
    session.commit()
    return {"status": "success"}


@router.post("/albums/{album_id}/delete")
async def delete_album(
    album_id: int,
    cascade: bool = False,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    album = session.exec(select(Album).where(Album.id == album_id)).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
        
    album.is_deleted = True
    session.add(album)
    
    images_count = 0
    if cascade:
        images = session.exec(select(Image).where(Image.album_id == album_id)).all()
        for img in images:
            img.is_deleted = True
            session.add(img)
        images_count = len(images)
        
    session.commit()
    return {"message": f"Album '{album.name}' deleted.", "images_deleted": images_count}