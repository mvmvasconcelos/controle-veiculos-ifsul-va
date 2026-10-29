from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_optional_current_user(
    db: Session = Depends(get_db),
    token: str | None = Depends(optional_oauth2_scheme)
) -> User | None:
    if token is None:
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou sessão expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except (TypeError, ValueError):
        raise credentials_exception
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_user(
    current_user: User | None = Depends(get_optional_current_user)
) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas ou sessão expirada",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def get_current_portaria_user(
    current_user: User = Depends(get_current_user)
) -> User:
    # Both PORTARIA and ADMIN can perform portaria actions
    if current_user.role not in [UserRole.PORTARIA, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente para esta operação"
        )
    return current_user

def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem executar esta operação"
        )
    return current_user
