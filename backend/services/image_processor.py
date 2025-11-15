"""
Handles image-specific operations such as generating hashes, 
extracting EXIF metadata, and creating web-optimized thumbnails.

Dependencies:
    - hashlib: For SHA-256 calculation.
    - PIL (Pillow): For image manipulation and metadata extraction.
"""

import hashlib
import os
from datetime import datetime
from typing import Optional, Dict, Any
from PIL import Image, ExifTags
from PIL.ExifTags import TAGS

def calculate_file_hash(file_path: str) -> str:
    """
    Function: calculate_file_hash
    
    Description:
        Calculates the SHA-256 hash of a file's content.
        Used to detect duplicate images even if they have different filenames.
        
    Args:
        file_path (str): Path to the image file.
        
    Returns:
        str: Hexadecimal string representing the SHA-256 hash.
        
    Notes:
        Reads the file in chunks to avoid memory issues with large files.
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read in 4KB chunks
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def extract_metadata(file_path: str) -> Dict[str, Any]:
    """
    Function: extract_metadata
    
    Description:
        Extracts technical details and EXIF metadata from an image file.
        
    Args:
        file_path (str): Path to the image file.
        
    Returns:
        Dict[str, Any]: Dictionary containing metadata like width, height, 
                        captured_at, camera_model, etc.
                        
    Notes:
        - Handles missing EXIF data gracefully.
        - Attempts to parse standard EXIF date formats.
    """
    metadata = {
        "width": 0,
        "height": 0,
        "captured_at": None,
        "camera_model": "Unknown",
        "file_size": os.path.getsize(file_path)
    }

    try:
        with Image.open(file_path) as img:
            metadata["width"], metadata["height"] = img.size
            
            # Extract EXIF
            exif_data = img._getexif()
            if exif_data:
                decoded_exif = {TAGS.get(key, key): val for key, val in exif_data.items()}
                
                # Extract Camera Model
                metadata["camera_model"] = decoded_exif.get("Model", "Unknown")
                
                # Extract Timestamp (DateTimeOriginal is most reliable)
                date_str = decoded_exif.get("DateTimeOriginal") or decoded_exif.get("DateTime")
                if date_str:
                    try:
                        # Standard EXIF format is 'YYYY:MM:DD HH:MM:SS'
                        metadata["captured_at"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                    except ValueError:
                        metadata["captured_at"] = None
    except Exception as e:
        print(f"ERROR: Failed to extract metadata for {file_path}: {e}")

    return metadata


def generate_thumbnail(source_path: str, target_path: str, size=(400, 400)) -> bool:
    """
    Function: generate_thumbnail
    
    Description:
        Creates a small, web-optimized JPEG thumbnail of the source image.
        
    Args:
        source_path (str): Path to the original high-res image.
        target_path (str): Where to save the generated thumbnail.
        size (tuple): Maximum width and height of the thumbnail.
        
    Returns:
        bool: True if successful, False otherwise.
        
    Notes:
        - Maintains aspect ratio.
        - Uses LANCZOS resampling for high quality.
        - Converts to RGB if source is RGBA (e.g., PNG).
    """
    try:
        with Image.open(source_path) as img:
            # Handle transparency (PNG/WebP to JPEG)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(target_path, "JPEG", quality=85)
            return True
    except Exception as e:
        print(f"ERROR: Failed to generate thumbnail for {source_path}: {e}")
        return False
