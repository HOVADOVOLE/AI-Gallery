import os
import zipfile
from typing import Dict
from sqlmodel import Session, select
from database import Image, Album
from services.scanner import list_image_files
from services.image_processor import calculate_file_hash, extract_metadata, generate_thumbnail

# --- Configuration ---
THUMBNAIL_DIR = "data/thumbnails"
os.makedirs(THUMBNAIL_DIR, exist_ok=True)

def extract_zip_in_place(zip_path: str):
    """
    Function: extract_zip_in_place
    Description: Extracts a ZIP file into a directory named after the ZIP.
    """
    target_dir = zip_path.replace('.zip', '')
    if os.path.exists(target_dir):
        return target_dir # Already extracted
        
    print(f"INFO: Extracting {zip_path} to {target_dir}")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            z.extractall(target_dir)
        return target_dir
    except Exception as e:
        print(f"ERROR: Failed to extract ZIP {zip_path}: {e}")
        return None

def process_import(root_path: str, session: Session, owner_id: int) -> Dict[str, int]:
    """
    Function: process_import
    Description: 
        Core logic for ingesting files from a directory into the database.
        Handles duplicates, thumbnails, and album creation.
    """
    print(f"INFO: Starting ingestion for {root_path} (Owner ID: {owner_id})")
    
    # Pre-scan for ZIP files and extract them
    for root, dirs, files in os.walk(root_path):
        for file in files:
            if file.lower().endswith('.zip'):
                zip_full_path = os.path.join(root, file)
                extract_zip_in_place(zip_full_path)
    
    # 1. Discover files (now includes extracted ones)
    image_paths = list_image_files(root_path)
    print(f"INFO: Found {len(image_paths)} potential images.")
    
    stats = {"added": 0, "skipped": 0, "errors": 0}
    
    for file_path in image_paths:
        try:
            # 2. Duplicate Check (Hash)
            file_hash = calculate_file_hash(file_path)
            
            existing_image = session.exec(select(Image).where(Image.file_hash == file_hash)).first()
            if existing_image:
                if existing_image.is_deleted:
                     print(f"DEBUG: Skipping deleted image {os.path.basename(file_path)} (Soft Deleted)")
                else:
                     print(f"DEBUG: Skipping duplicate {os.path.basename(file_path)}")
                stats["skipped"] += 1
                continue
            
            # 3. Metadata & Thumbnail
            metadata = extract_metadata(file_path)
            
            # Generate Thumbnail
            thumb_filename = f"{file_hash}.jpg"
            thumb_path = os.path.join(THUMBNAIL_DIR, thumb_filename)
            
            if not os.path.exists(thumb_path):
                generate_thumbnail(file_path, thumb_path)
                
            # 4. Album Management
            parent_dir = os.path.dirname(file_path)
            album_name = os.path.basename(parent_dir)
            
            from slugify import slugify
            album_slug = slugify(album_name)
            
            album = session.exec(select(Album).where(Album.slug == album_slug)).first()
            if not album:
                album = Album(
                    name=album_name,
                    slug=album_slug,
                    root_path=parent_dir,
                    owner_id=owner_id
                )
                session.add(album)
                session.commit()
                session.refresh(album)
            
            # 5. Save Image Record
            new_image = Image(
                album_id=album.id,
                filename=os.path.basename(file_path),
                path=file_path,
                file_hash=file_hash,
                captured_at=metadata.get("captured_at"),
                width=metadata.get("width"),
                height=metadata.get("height"),
                file_size=metadata.get("file_size"),
                camera_model=metadata.get("camera_model"),
                is_processed=False, # Ready for AI processing later
                owner_id=owner_id
            )
            
            session.add(new_image)
            session.commit()
            stats["added"] += 1
            
        except Exception as e:
            print(f"ERROR: Failed to process {file_path}: {e}")
            stats["errors"] += 1
            continue
            
    print(f"INFO: Ingestion complete. Stats: {stats}")
    return stats
