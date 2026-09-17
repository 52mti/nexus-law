from typing import Any, Literal

from pydantic import BaseModel, Field


class SendCodeRequest(BaseModel):
    scene: Literal["register", "login", "reset_password", "bind_contact"]
    phone: str | None = None
    email: str | None = None


class RegisterRequest(BaseModel):
    code: str = Field(min_length=4, max_length=8)
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = None
    email: str | None = None
    nickname: str | None = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    login_type: Literal["password", "code"] = "password"
    phone: str | None = None
    email: str | None = None
    password: str | None = None
    code: str | None = None


class ResetPasswordRequest(BaseModel):
    code: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=8, max_length=72)
    phone: str | None = None
    email: str | None = None


class ProfileUpdateRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=64)
    phone: str | None = None
    email: str | None = None
    code: str | None = None


class PasswordUpdateRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class UserProfile(BaseModel):
    id: str
    email: str | None
    phone: str | None
    nickname: str | None
    avatar_url: str | None
    points: int
    status: str
    role_codes: list[str]
    membership: dict[str, Any] | None = None


class AuthResult(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in_hours: int
    user: UserProfile
