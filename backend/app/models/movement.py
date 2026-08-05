import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class MovementStatus(str, enum.Enum):
    EM_TRANSITO = "em_transito"
    CONCLUIDO = "concluido"

class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    destination = Column(String, nullable=False)
    purpose = Column(String, nullable=True)
    
    departure_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    departure_odometer = Column(Integer, nullable=False)
    departure_guard_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    return_time = Column(DateTime, nullable=True)
    return_odometer = Column(Integer, nullable=True)
    return_guard_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    status = Column(Enum(MovementStatus), default=MovementStatus.EM_TRANSITO, nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")
    departure_guard = relationship("User", foreign_keys=[departure_guard_id])
    return_guard = relationship("User", foreign_keys=[return_guard_id])
