from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.driver import Driver, DriverType
from app.models.movement import Movement
from app.schemas.driver import DriverOut, DriverCreate, DriverUpdate
from app.api.deps import get_current_portaria_user, get_current_admin_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[DriverOut])
def list_drivers(db: Session = Depends(get_db)):
    # Query drivers along with their movement count for dynamic frequency ordering
    drivers = db.query(Driver).all()
    
    # Calculate trip counts
    trip_counts = (
        db.query(Movement.driver_id, func.count(Movement.id).label("cnt"))
        .group_by(Movement.driver_id)
        .all()
    )
    counts_map = {driver_id: cnt for driver_id, cnt in trip_counts}
    
    result = []
    for d in drivers:
        d_out = DriverOut.model_validate(d)
        d_out.trip_count = counts_map.get(d.id, 0)
        result.append(d_out)
        
    # Sort: FIXO first, then by trip_count desc, then by name asc
    type_order = {DriverType.FIXO: 0, DriverType.FREQUENTE: 1, DriverType.EVENTUAL: 2}
    result.sort(key=lambda x: (type_order.get(x.driver_type, 3), -x.trip_count, x.name.lower()))
    return result

@router.post("", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
def create_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    guard: User = Depends(get_current_portaria_user)
):
    driver = Driver(**driver_in.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    d_out = DriverOut.model_validate(driver)
    d_out.trip_count = 0
    return d_out

@router.put("/{driver_id}", response_model=DriverOut)
def update_driver(
    driver_id: int,
    driver_in: DriverUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
        
    for field, value in driver_in.model_dump(exclude_unset=True).items():
        setattr(driver, field, value)
        
    db.commit()
    db.refresh(driver)
    
    cnt = db.query(func.count(Movement.id)).filter(Movement.driver_id == driver_id).scalar() or 0
    d_out = DriverOut.model_validate(driver)
    d_out.trip_count = cnt
    return d_out

@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_driver(
    driver_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
    db.delete(driver)
    db.commit()
    return None
