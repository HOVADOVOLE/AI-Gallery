"""
Provides functionality to recursively scan the filesystem for image files.
This service is responsible for discovering new media assets within
configured root directories.

Dependencies:
    - os: For directory traversal.
    - typing: For type hinting.
"""

import os
from typing import List, Set

# Define supported image extensions as a set for O(1) lookup
SUPPORTED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp"}

def list_image_files(root_path: str) -> List[str]:
    """
    Function: list_image_files
    
    Description:
        Recursively traverses the given root directory and collects absolute 
        paths of all supported image files.
        
    Args:
        root_path (str): The starting directory path for the scan.
        
    Returns:
        List[str]: A list of absolute strings representing paths to discovered images.
        
    Usage:
        Discovered paths are used by the Ingest Service to sync with the database.
        
    Notes:
        - Skips hidden files/directories (starting with '.').
        - Case-insensitive extension matching.
    """
    image_paths: List[str] = []
    
    if not os.path.exists(root_path):
        print(f"WARNING: Scanner root path does not exist: {root_path}")
        return image_paths

    for root, dirs, files in os.walk(root_path):
        # In-place modification of 'dirs' to skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            # Skip hidden files
            if file.startswith('.'):
                continue
                
            # Check if extension is supported
            _, ext = os.path.splitext(file)
            if ext.lower() in SUPPORTED_EXTENSIONS:
                absolute_path = os.path.join(root, file)
                image_paths.append(os.path.abspath(absolute_path))
                
    return image_paths

if __name__ == "__main__":
    # Quick test if run directly
    import sys
    test_path = sys.argv[1] if len(sys.argv) > 1 else "."
    print(f"Scanning: {test_path}")
    found = list_image_files(test_path)
    print(f"Found {len(found)} images.")
    for f in found[:5]:
        print(f" - {f}")
