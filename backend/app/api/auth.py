import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.user import Token, UserOut
from app.api.deps import get_current_user
from app.api.audit_logs import log_action

router = APIRouter()

# Rate limiting in-memory storage: key -> list of timestamps
failed_login_attempts = defaultdict(list)
MAX_FAILED_ATTEMPTS = 5
WINDOW_SECONDS = 60

class LoginJSONRequest(BaseModel):
    username: str
    password: str

def check_rate_limit(key: str):
    now = time.time()
    # Filter out attempts older than WINDOW_SECONDS
    failed_login_attempts[key] = [t for t in failed_login_attempts[key] if now - t < WINDOW_SECONDS]
    if len(failed_login_attempts[key]) >= MAX_FAILED_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login incorretas. Por favor, aguarde 60 segundos antes de tentar novamente."
        )

def record_failed_attempt(key: str):
    failed_login_attempts[key].append(time.time())

@router.post("/login", response_model=Token)
def login_form(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    ip = request.client.host if request.client else "unknown"
    rate_key = f"{ip}:{form_data.username}"
    check_rate_limit(rate_key)

    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        record_failed_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )
    
    access_token = create_access_token(subject=user.id)
    log_action(db, user, "LOGIN", "auth", f"Login realizado com sucesso pelo IP {ip}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user)
    }

@router.post("/login/json", response_model=Token)
def login_json(
    req: LoginJSONRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else "unknown"
    rate_key = f"{ip}:{req.username}"
    check_rate_limit(rate_key)

    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        record_failed_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário inativo"
        )
    
    access_token = create_access_token(subject=user.id)
    log_action(db, user, "LOGIN", "auth", f"Login realizado com sucesso pelo IP {ip}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserOut.model_validate(user)
    }

@router.post("/refresh", response_model=Token)
def refresh_token(current_user: User = Depends(get_current_user)):
    new_token = create_access_token(subject=current_user.id)
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "user": UserOut.model_validate(current_user)
    }

@router.get("/me", response_model=UserOut)
def read_user_me(current_user: User = Depends(get_current_user)):
    return current_user
