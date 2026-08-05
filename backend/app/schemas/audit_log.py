from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: str
    action: str
    resource: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
