from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from database import get_session, Image, Tag, ImageTagLink
from auth import get_current_user, User

router = APIRouter(prefix="/review", tags=["Review"])

class ReviewItem(BaseModel):
    image_id: int
    tag_id: int
    image_hash: str # For thumbnail
    tag_name: str
    confidence: float

@router.get("/items", response_model=List[ReviewItem])
async def get_review_items(
    limit: int = 20,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint: GET /review/items
    Description: Returns a list of low-confidence tags that need human verification.
    """
    # Select links with confidence between 0.4 and 0.85 and NOT verified
    statement = (
        select(ImageTagLink, Image, Tag)
        .join(Image, ImageTagLink.image_id == Image.id)
        .join(Tag, ImageTagLink.tag_id == Tag.id)
        .where(ImageTagLink.is_verified == False)
        .where(ImageTagLink.confidence < 0.90) # Higher threshold to verify more
        .where(ImageTagLink.confidence > 0.30)
        .where(Image.is_deleted == False)
        .limit(limit)
    )
    
    results = session.exec(statement).all()
    
    output = []
    for link, image, tag in results:
        output.append(ReviewItem(
            image_id=image.id,
            tag_id=tag.id,
            image_hash=image.file_hash,
            tag_name=tag.name,
            confidence=link.confidence
        ))
        
    return output

class ReviewAction(BaseModel):
    action: str # "approve" or "reject"

@router.post("/{image_id}/{tag_id}")
async def review_tag(
    image_id: int,
    tag_id: int,
    body: ReviewAction,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint: POST /review/{img}/{tag}
    Description: Approve (verify) or Reject (delete) a tag.
    """
    link = session.exec(
        select(ImageTagLink)
        .where(ImageTagLink.image_id == image_id)
        .where(ImageTagLink.tag_id == tag_id)
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Tag link not found")
        
    if body.action == "approve":
        link.is_verified = True
        link.confidence = 1.0 # Set to max confidence
        session.add(link)
    elif body.action == "reject":
        session.delete(link) # Remove the tag connection completely
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'.")
        
    session.commit()
    return {"status": "success"}
