from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/smartpark_pro"
  jwt_secret_key: str = "change-me"
  jwt_algorithm: str = "HS256"
  access_token_expire_minutes: int = 480
  backend_cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
