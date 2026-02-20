from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str  # Must be set in .env or environment variables
    SUPER_ADMIN_KEY: str = "supersecretkey"  # In production, set via env var
    SECRET_KEY: str = "your-secret-key"      # In production, set via env var
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
