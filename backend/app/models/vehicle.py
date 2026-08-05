import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum
from app.core.database import Base

class VehicleStatus(str, enum.Enum):
    DISPONIVEL = "disponivel"
    EM_USO = "em_uso"
    MANUTENCAO = "manutencao"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    color = Column(String, nullable=False)
    fuel = Column(String, nullable=False)
    year_manufacture = Column(Integer, nullable=False)
    year_model = Column(Integer, nullable=False)
    current_odometer = Column(Integer, default=0, nullable=False)
    plate = Column(String, unique=True, index=True, nullable=False)
    renavam = Column(String, nullable=True)
    chassis = Column(String, nullable=True)
    status = Column(Enum(VehicleStatus), default=VehicleStatus.DISPONIVEL, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
