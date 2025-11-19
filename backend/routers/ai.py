"""
API endpoints for managing Artificial Intelligence tasks.
Allows triggering the analysis of images that haven't been processed yet.
"""

import sys
import subprocess
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session, Image
from auth import get_current_user, User

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])

@router.post("/process")
async def trigger_ai_analysis(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Endpoint: POST /ai/process
    Description:
        Triggers the background AI worker process.
        This spawns a completely separate system process to ensure
        the main API remains responsive for other users.
    """
    # Check if there is work to do
    count = session.exec(select(Image).where(Image.is_processed == False)).all()
    count = len(count)
    
    if count == 0:
        return {"message": "No new images to process."}
    
    # Spawn the worker process
    # We use sys.executable to ensure we use the same Python interpreter (venv)
    worker_script = "workers/ai_processor.py"
    
    try:
        subprocess.Popen([sys.executable, worker_script])
        print(f"INFO: Spawned AI Worker process (Images to process: {count})")
    except Exception as e:
        print(f"ERROR: Failed to spawn worker: {e}")
        return {"message": "Failed to start AI worker.", "error": str(e)}
    
    return {"message": f"AI processing started for {count} images (Background Process)."}