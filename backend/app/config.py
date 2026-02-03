"""
Application configuration using pydantic-settings.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Google Gemini API
    google_api_key: str = ""

    # Server settings
    host: str = "0.0.0.0"
    port: int = 8000

    # PDF directory
    pdf_directory: str = ""

    # ChromaDB settings
    chroma_persist_directory: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
