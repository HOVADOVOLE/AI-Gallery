"""
Standalone worker script for AI processing.
Runs in a separate process to avoid blocking the main API.
"""

import sys
import os

# Add parent directory to path so we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from database import engine, Image, Tag, ImageTagLink
from services.ai_engine import analyze_batch

def run_ai_processing_task():
    """
    Worker function that fetches unprocessed images and runs AI analysis.
    """
    print("[Worker] AI Processor started.")
    BATCH_SIZE = 8 # Adjust based on RAM/VRAM
    
    # 1. Fetch Worklist
    # We create a session just to get the IDs, then close it.
    worklist = []
    with Session(engine) as session:
        # Fetch only what we need
        statement = select(Image.id, Image.path).where(Image.is_processed == False)
        results = session.exec(statement).all()
        # Convert to list of tuples to detach from session
        worklist = [(r[0], r[1]) for r in results]
        
    total_images = len(worklist)
    print(f"[Worker] Found {total_images} images to process.")
    
    if total_images == 0:
        return

    # 2. Process in Batches
    for i in range(0, total_images, BATCH_SIZE):
        batch_tuples = worklist[i : i + BATCH_SIZE]
        image_ids = [b[0] for b in batch_tuples]
        image_paths = [b[1] for b in batch_tuples]
        
        print(f"[Worker] Processing batch {i // BATCH_SIZE + 1} / {(total_images + BATCH_SIZE - 1) // BATCH_SIZE}...")
        
        try:
            # A. Heavy Lifting (AI Models)
            # This is the slow part, running independently.
            batch_results = analyze_batch(image_paths)
            
            # B. Save Results
            with Session(engine) as session:
                # Fetch images again to attach to this session
                batch_images = session.exec(select(Image).where(Image.id.in_(image_ids))).all()
                img_map = {img.id: img for img in batch_images}
                
                for idx, (img_id, img_path) in enumerate(batch_tuples):
                    img = img_map.get(img_id)
                    if not img: continue
                    
                    tags_data = batch_results[idx]
                    
                    if not tags_data:
                        img.is_processed = True
                        session.add(img)
                        continue

                    for tag_item in tags_data:
                        tag_name = tag_item["name"]
                        confidence = tag_item["confidence"]
                        source = tag_item["source"]
                        category = tag_item.get("category", "general")
                        
                        # Find or Create Tag
                        tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()
                        if not tag:
                            tag = Tag(name=tag_name, category=category)
                            session.add(tag)
                            session.commit()
                            session.refresh(tag)
                        
                        # Create Link
                        # Check existence to avoid unique constraint errors if re-run
                        existing_link = session.exec(
                            select(ImageTagLink)
                            .where(ImageTagLink.image_id == img.id)
                            .where(ImageTagLink.tag_id == tag.id)
                        ).first()
                        
                        if not existing_link:
                            link = ImageTagLink(
                                image_id=img.id,
                                tag_id=tag.id,
                                confidence=confidence,
                                source=source,
                                is_verified=False
                            )
                            session.add(link)
                    
                    img.is_processed = True
                    session.add(img)
                
                session.commit()
                
        except Exception as e:
            print(f"[Worker] ERROR in batch: {e}")
            import traceback
            traceback.print_exc()

    print("[Worker] AI Processing finished.")

if __name__ == "__main__":
    run_ai_processing_task()
