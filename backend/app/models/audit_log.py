from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=False)
    action = Column(String, nullable=False)      # ex: CREATE, UPDATE, DELETE, LOGIN, EXIT, RETURN
    resource = Column(String, nullable=False)    # ex: vehicle, driver, user, movement
    details = Column(Text, nullable=True)        # json or descriptive text
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
