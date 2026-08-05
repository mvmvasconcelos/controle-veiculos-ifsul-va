from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.driver import DriverType

class DriverBase(BaseModel):
    name: str
    cnh: Optional[str] = None
    department: Optional[str] = None
    driver_type: DriverType = DriverType.EVENTUAL

class DriverCreate(DriverBase):
    pass

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    cnh: Optional[str] = None
    department: Optional[str] = None
    driver_type: Optional[DriverType] = None

class DriverOut(DriverBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    trip_count: Optional[int] = 0
    created_at: datetime
