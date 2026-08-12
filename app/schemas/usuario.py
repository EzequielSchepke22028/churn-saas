"""Schemas de request/response para auth (registro y login)."""

from pydantic import BaseModel, EmailStr, Field


class RegistroRequest(BaseModel):
    tenant_slug: str
    email: EmailStr
    password: str = Field(..., min_length=8)
    rol: str = Field(default="colaborador")


class LoginRequest(BaseModel):
    tenant_slug: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    role: str