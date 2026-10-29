from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime
from typing import Optional
from app.models.vehicle import VehicleStatus, UNAVAILABLE_REASON_MAX_LENGTH

def _normalize_reason(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if len(value) > UNAVAILABLE_REASON_MAX_LENGTH:
        raise ValueError(f"O motivo deve ter no máximo {UNAVAILABLE_REASON_MAX_LENGTH} caracteres")
    return value

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
    unavailable_reason: Optional[str] = None

    _check_reason = field_validator("unavailable_reason")(_normalize_reason)

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
    unavailable_reason: Optional[str] = None

    _check_reason = field_validator("unavailable_reason")(_normalize_reason)

class VehicleOut(VehicleBase):
    """Public representation: never exposes the unavailability reason."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

class VehicleStaffOut(VehicleOut):
    """Representation for authenticated Portaria/ADMIN users."""
    unavailable_reason: Optional[str] = None
