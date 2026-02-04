"""
CME Rules Navigator - FastAPI Backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.routers import chat, documents
from app.services.vector_service import VectorService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    # Initialize vector service (loads ChromaDB)
    app.state.vector_service = VectorService()
    yield
    # Cleanup on shutdown
    pass


app = FastAPI(
    title="CME Rules Navigator API",
    description="AI-powered navigation for CME trading rules with citation tracking",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

# Add allowed origins from environment variable
if os.getenv("ALLOWED_ORIGINS"):
    origins.extend(os.getenv("ALLOWED_ORIGINS").split(","))

# Allow all origins if specified (useful for development/testing)
if os.getenv("ALLOW_ALL_ORIGINS", "false").lower() == "true":
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])

# Serve PDF files from the public/CME directory
PDF_DIR = os.path.join(os.path.dirname(__file__), "../../public/CME")
if os.path.exists(PDF_DIR):
    app.mount("/pdfs", StaticFiles(directory=PDF_DIR), name="pdfs")


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "cme-rules-navigator"}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "CME Rules Navigator API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "documents": "/api/documents",
            "health": "/api/health"
        }
    }
