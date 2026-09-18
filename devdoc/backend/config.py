import os
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv(usecwd=True))

class Settings:
    LLM_API_KEY: str = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or os.getenv("LLM_API_KEY", "")
    GCP_PROJECT_ID: str = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("GCP_PROJECT_ID") or os.getenv("PROJECT_ID", "")
    GCP_LOCATION: str = os.getenv("GCP_LOCATION") or os.getenv("GOOGLE_CLOUD_REGION", "us-central1")
    LLM_ENDPOINT: str = os.getenv("LLM_ENDPOINT", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-2.5-flash")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "gemini")
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "fastembed")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    DATA_DIR: Path = Path(os.getenv("DATA_ROOT_DIRECTORY", "./.data_storage"))
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CODE_EXTENSIONS: list[str] = os.getenv("CODE_EXTENSIONS", ".py,.js,.ts,.jsx,.tsx,.java,.go,.rs,.rb,.php,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.scala,.json,.md,.sh,.yaml,.yml,.toml").split(",")
    CODE_INGEST_BATCH_SIZE: int = int(os.getenv("CODE_INGEST_BATCH_SIZE", "100"))
    MAX_CODE_FILES: int = int(os.getenv("MAX_CODE_FILES", "600"))
    MAX_CODE_FILE_BYTES: int = int(os.getenv("MAX_CODE_FILE_BYTES", "1048576"))

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

