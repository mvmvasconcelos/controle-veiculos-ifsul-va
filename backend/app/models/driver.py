import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum
from app.core.database import Base

class DriverType(str, enum.Enum):
    FIXO = "fixo"
    FREQUENTE = "frequente"
    EVENTUAL = "eventual"

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    cnh = Column(String, nullable=True)
    department = Column(String, nullable=True)
    driver_type = Column(Enum(DriverType), default=DriverType.EVENTUAL, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
