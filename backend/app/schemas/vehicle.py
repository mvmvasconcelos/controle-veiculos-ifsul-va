from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.vehicle import VehicleStatus

class VehicleBase(BaseModel):
    display_name: str
    type: str
    make: str
    model: str
    color: str
    fuel: str
    year_manufacture: int
    year_model: int
    current_odometer: int = 0
    plate: str
    renavam: Optional[str] = None
    chassis: Optional[str] = None
    status: VehicleStatus = VehicleStatus.DISPONIVEL

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    display_name: Optional[str] = None
    type: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    fuel: Optional[str] = None
    year_manufacture: Optional[int] = None
    year_model: Optional[int] = None
    current_odometer: Optional[int] = None
    plate: Optional[str] = None
    renavam: Optional[str] = None
    chassis: Optional[str] = None
    status: Optional[VehicleStatus] = None

class VehicleOut(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
