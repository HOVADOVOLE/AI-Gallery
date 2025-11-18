"""
API endpoints for handling file uploads directly from the browser.
Includes both direct single-file upload (converted to WebP) and 
batch upload for ingestion (saved as-is).
"""

import os
import shutil
import hashlib
import zipfile
import uuid
import io
from typing import List
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from PIL import Image as PILImage

from database import get_session, Image, Album
from auth import get_current_user, User
from services.ingest import process_import

router = APIRouter(prefix="/upload", tags=["Upload"])

# --- Supported Extensions ---
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# --- Configuration ---
UPLOAD_DIR = "data/uploads"
THUMBNAIL_DIR = "data/thumbnails"
IMPORT_DIR = "data/imports"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)
os.makedirs(IMPORT_DIR, exist_ok=True)


# --- BATCH UPLOAD (For Import/Ingest) ---

@router.post("/batch")
async def upload_batch(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint: POST /upload/batch
    Description:
        Receives multiple files (images or ZIPs), saves them to a temporary import directory,
        and triggers the standard ingestion process (same as /scan).
        Ideal for browser-based bulk imports.
    """
    # 1. Prepare Directory
    # Create a unique folder for this upload session
    batch_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + str(uuid.uuid4())[:8]
    target_dir = os.path.join(IMPORT_DIR, batch_id)
    os.makedirs(target_dir, exist_ok=True)
    
    saved_count = 0
    
    # 2. Save Files to Disk
    for file in files:
        try:
            file_path = os.path.join(target_dir, file.filename)
            # Efficiently stream file to disk
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_count += 1
        except Exception as e:
            print(f"ERROR: Failed to save uploaded file {file.filename}: {e}")
            
    # 3. Trigger Background Ingest
    # Define a wrapper to run the ingest with a fresh DB session
    def _run_ingest_task(path, owner_id):
        from database import engine
        with Session(engine) as db:
             process_import(path, db, owner_id)

    if background_tasks:
        background_tasks.add_task(_run_ingest_task, target_dir, current_user.id)
    
    return {
        "message": f"Uploaded {saved_count} files. Processing started in background.",
        "batch_id": batch_id,
        "target_dir": target_dir
    }


# --- SINGLE / DIRECT UPLOAD (Legacy / Profile Pics) ---

def process_uploaded_image(file_content: bytes, filename: str, session: Session, owner_id: int):
    """
    Helper function to process a single uploaded image content.
    """
    try:
        # Check extension before heavy processing
        _, ext = os.path.splitext(filename)
        if ext.lower() not in IMAGE_EXTENSIONS:
            return None

        # 1. Load Image
        img = PILImage.open(io.BytesIO(file_content))
        
        # 2. Convert to WebP (In-Memory)
        output_buffer = io.BytesIO()
        if img.mode in ("RGBA", "LA"):
            pass 
        elif img.mode == "P":
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
            
        img.save(output_buffer, format="WEBP", quality=90)
        webp_content = output_buffer.getvalue()
        
        # 3. Calculate Hash
        file_hash = hashlib.sha256(webp_content).hexdigest()
        
        # Check Duplicate
        existing = session.exec(select(Image).where(Image.file_hash == file_hash)).first()
        if existing:
            return {"status": "skipped", "reason": "duplicate", "filename": filename}
            
        # 4. Save to Disk
        save_filename = f"{file_hash}.webp"
        save_path = os.path.join(UPLOAD_DIR, save_filename)
        
        with open(save_path, "wb") as f:
            f.write(webp_content)
            
        # 5. Generate Thumbnail
        thumb_filename = f"{file_hash}.jpg"
        thumb_path = os.path.join(THUMBNAIL_DIR, thumb_filename)
        img.thumbnail((400, 400), PILImage.Resampling.LANCZOS)
        img.convert("RGB").save(thumb_path, "JPEG", quality=80)
        
        # 6. Metadata
        width, height = img.size
        captured_at = None
        try:
            exif = img._getexif()
            if exif:
                from PIL.ExifTags import TAGS
                decoded = {TAGS.get(k, k): v for k, v in exif.items()}
                date_str = decoded.get("DateTimeOriginal") or decoded.get("DateTime")
                if date_str:
                    captured_at = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
        except:
            pass
            
        # 7. Album
        album = session.exec(select(Album).where(Album.slug == "web-uploads")).first()
        if not album:
            album = Album(name="Web Uploads", slug="web-uploads", root_path=UPLOAD_DIR, owner_id=owner_id)
            session.add(album)
            session.commit()
            session.refresh(album)

        # 8. DB Record
        new_image = Image(
            album_id=album.id,
            owner_id=owner_id,
            filename=filename,
            path=save_path,
            file_hash=file_hash,
            captured_at=captured_at,
            width=width,
            height=height,
            file_size=len(webp_content),
            is_processed=False
        )
        session.add(new_image)
        session.commit()
        
        return {"status": "success", "id": new_image.id, "filename": filename}
        
    except Exception as e:
        print(f"Error processing {filename}: {e}")
        return {"status": "error", "reason": str(e), "filename": filename}


@router.post("/")
async def upload_images(
    files: List[UploadFile] = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint: POST /upload/
    Accepts images and ZIP files.
    """
    results = []
    for file in files:
        filename = file.filename
        content = await file.read()
        
        # Handle ZIP files
        if filename.lower().endswith('.zip'):
            print(f"INFO: Extracting ZIP: {filename}")
            try:
                with zipfile.ZipFile(io.BytesIO(content)) as z:
                    for z_info in z.infolist():
                        # Skip directories
                        if z_info.is_dir():
                            continue
                        
                        # Process only images inside ZIP
                        ext = os.path.splitext(z_info.filename)[1].lower()
                        if ext in IMAGE_EXTENSIONS:
                            z_content = z.read(z_info.filename)
                            res = process_uploaded_image(z_content, z_info.filename, session, current_user.id)
                            if res: results.append(res)
            except Exception as e:
                results.append({"status": "error", "reason": f"ZIP corruption: {e}", "filename": filename})
        else:
            # Handle regular image
            res = process_uploaded_image(content, filename, session, current_user.id)
            if res: results.append(res)
        
    return {"processed": len(results), "details": results}