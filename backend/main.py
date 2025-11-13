"""
Entry point for the FastAPI backend application.
This module initializes the FastAPI instance, configures middleware (CORS),
and sets up the primary routing structure.

Dependencies:
    - FastAPI
    - Uvicorn
    - Contextlib (for lifespan management)

Global Variables:
    - app (FastAPI): The main application instance.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import create_db_and_tables
from routers import auth, scan, ai, gallery, upload, manage, review

# --- Lifespan Events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Function: lifespan
    
    Description:
        Handles startup and shutdown events for the FastAPI application.
        This is the modern replacement for @app.on_event("startup").
        Used for database connections, loading AI models, or other initialization tasks.
    
    Args:
        app (FastAPI): The application instance.
        
    Yields:
        None: Control is yielded back to the application while it runs.
        
    Notes:
        - Logic before 'yield' runs on startup.
        - Logic after 'yield' runs on shutdown.
        - Initializes the SQLite database tables on startup.
    """
    # Startup logic: Load configuration, connect to DB
    print("INFO:    Initializing database...")
    create_db_and_tables()
    print("INFO:    Startup initiated. System is ready.")
    
    yield
    
    # Shutdown logic: Close DB connections, clear memory
    print("INFO:    Shutdown initiated. Cleaning up resources.")


# --- Application Initialization ---
app = FastAPI(
    title="AI Racing Gallery API",
    description="Backend API for AI-powered photo organization and semantic search.",
    version="0.1.0",
    lifespan=lifespan
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(upload.router)
app.include_router(ai.router)
app.include_router(gallery.router)
app.include_router(manage.router)
app.include_router(review.router)

# --- Static Files ---
# Mounting the thumbnails directory so they can be accessed via URL
app.mount("/thumbnails", StaticFiles(directory="data/thumbnails"), name="thumbnails")
# Mounting uploads for full-res view
app.mount("/uploads", StaticFiles(directory="data/uploads"), name="uploads")

# --- Middleware Configuration ---
# Notes:
#   Configuring CORS (Cross-Origin Resource Sharing) to allow the Frontend (React)
#   to communicate with this Backend. In production, 'allow_origins' should be restricted.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Basic Routes ---
@app.get("/")
async def root_endpoint():
    """
    Function: root_endpoint
    
    Description:
        A simple health-check endpoint to verify the API is running.
        
    Args:
        None
        
    Returns:
        dict: A JSON response containing a welcome message and status.
        
    Usage:
        GET /
    """
    return {
        "message": "Welcome to AI Racing Gallery API", 
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    """
    Section: Development Server Entry
    Description:
        Allows running this file directly via 'python main.py' for debugging purposes.
        In production, use 'uvicorn main:app --host 0.0.0.0 --port 8000'.
    """
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
