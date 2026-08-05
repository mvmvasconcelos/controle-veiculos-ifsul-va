from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogOut
from app.api.deps import get_current_admin_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[AuditLogOut])
def list_audit_logs(
    resource: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    query = db.query(AuditLog)
    if resource:
        query = query.filter(AuditLog.resource == resource)
    if action:
        query = query.filter(AuditLog.action == action)
        
    return query.order_by(AuditLog.created_at.desc()).limit(limit).all()

def log_action(db: Session, user: Optional[User], action: str, resource: str, details: str):
    try:
        log_entry = AuditLog(
            user_id=user.id if user else None,
            username=user.username if user else "system",
            action=action,
            resource=resource,
            details=details
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Error writing audit log: {e}")
