from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    nombre: str
    es_admin: bool


class TokenData(BaseModel):
    username: str | None = None
    user_id: str | None = None
