"""
API endpoints for triggering file scanning and ingestion processes.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session
from pydantic import BaseModel

from database import get_session
from auth import get_current_user, User
from services.ingest import process_import

router = APIRouter(prefix="/scan", tags=["Scanning"])

class ScanRequest(BaseModel):
    path: str

@router.post("/")
async def trigger_scan(
    request: ScanRequest, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Endpoint: POST /scan/
    Triggers the import process for a given directory via background task.
    """
    if not os.path.exists(request.path):
        raise HTTPException(status_code=404, detail="Directory path not found on server.")
        
    background_tasks.add_task(run_scan_in_background, request.path, current_user.id)
    
    return {"message": f"Scan started for {request.path}. Check dashboard for progress."}


def run_scan_in_background(path: str, owner_id: int):
    """
    Wrapper to run the import logic with its own database session.
    """
    from database import engine
    with Session(engine) as session:
        process_import(path, session, owner_id)