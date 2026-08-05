from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.movement import MovementStatus
from app.schemas.vehicle import VehicleOut
from app.schemas.driver import DriverOut
from app.schemas.user import UserOut

class MovementExitCreate(BaseModel):
    vehicle_id: int
    driver_id: int
    destination: str
    purpose: Optional[str] = None
    departure_odometer: int

class MovementReturnCreate(BaseModel):
    return_odometer: int
    notes: Optional[str] = None

class MovementUpdate(BaseModel):
    vehicle_id: Optional[int] = None
    driver_id: Optional[int] = None
    destination: Optional[str] = None
    purpose: Optional[str] = None
    departure_time: Optional[datetime] = None
    departure_odometer: Optional[int] = None
    return_time: Optional[datetime] = None
    return_odometer: Optional[int] = None
    status: Optional[MovementStatus] = None
    notes: Optional[str] = None

class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    driver_id: int
    destination: str
    purpose: Optional[str] = None
    departure_time: datetime
    departure_odometer: int
    departure_guard_id: int
    return_time: Optional[datetime] = None
    return_odometer: Optional[int] = None
    return_guard_id: Optional[int] = None
    status: MovementStatus
    notes: Optional[str] = None
    
    vehicle: Optional[VehicleOut] = None
    driver: Optional[DriverOut] = None
    departure_guard: Optional[UserOut] = None
    return_guard: Optional[UserOut] = None
