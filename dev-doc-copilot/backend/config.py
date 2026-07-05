import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

class Settings:
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_ENDPOINT: str = os.getenv("LLM_ENDPOINT", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "")
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "custom")
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "fastembed")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    DATA_DIR: Path = Path(os.getenv("DATA_ROOT_DIRECTORY", "./.data_storage"))
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CODE_EXTENSIONS: list[str] = os.getenv("CODE_EXTENSIONS", ".py,.js,.ts,.jsx,.tsx,.java,.go,.rs,.rb,.php,.c,.cpp,.h,.hpp,.cs,.swift,.kt,.scala").split(",")

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
