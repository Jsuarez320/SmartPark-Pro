from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  """
  Configuración global de la aplicación (Backend).
  Utiliza Pydantic para cargar variables de entorno automáticamente
  desde el archivo .env o del entorno del OS.
  """
  db_host: str = "localhost"
  db_port: int = 5432
  db_user: str = "postgres"
  db_password: str = "postgres"
  db_name: str = "smartpark_pro"
  jwt_secret_key: str = "change-me"
  jwt_algorithm: str = "HS256"
  access_token_expire_minutes: int = 480
  backend_cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

  model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

  @property
  def database_url(self) -> str:
    """Construye la URL de conexión a la BD desde las variables del .env."""
    return (
      f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
      f"@{self.db_host}:{self.db_port}/{self.db_name}"
    )


settings = Settings()
