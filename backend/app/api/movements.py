from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.movement import Movement, MovementStatus
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.driver import Driver
from app.schemas.movement import MovementOut, MovementExitCreate, MovementReturnCreate, MovementUpdate
from app.api.deps import get_current_portaria_user, get_current_admin_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[MovementOut])
def list_movements(
    status_filter: Optional[MovementStatus] = Query(None, alias="status"),
    vehicle_id: Optional[int] = None,
    driver_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Movement)
    if status_filter:
        query = query.filter(Movement.status == status_filter)
    if vehicle_id:
        query = query.filter(Movement.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Movement.driver_id == driver_id)
        
    query = query.order_by(Movement.departure_time.desc()).limit(limit)
    return query.all()

@router.post("/exit", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def record_exit(
    exit_in: MovementExitCreate,
    db: Session = Depends(get_db),
    guard: User = Depends(get_current_portaria_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == exit_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
        
    if vehicle.status != VehicleStatus.DISPONIVEL:
        raise HTTPException(
            status_code=400,
            detail=f"Veículo '{vehicle.display_name}' não está disponível para saída (Status atual: {vehicle.status.value})"
        )
        
    driver = db.query(Driver).filter(Driver.id == exit_in.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Motorista não encontrado")
        
    # Create movement
    movement = Movement(
        vehicle_id=vehicle.id,
        driver_id=driver.id,
        destination=exit_in.destination,
        purpose=exit_in.purpose,
        departure_time=datetime.utcnow(),
        departure_odometer=exit_in.departure_odometer,
        departure_guard_id=guard.id,
        status=MovementStatus.EM_TRANSITO
    )
    
    # Update vehicle status and odometer if exit_in odometer is higher
    vehicle.status = VehicleStatus.EM_USO
    if exit_in.departure_odometer > vehicle.current_odometer:
        vehicle.current_odometer = exit_in.departure_odometer
        
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement

@router.post("/{movement_id}/return", response_model=MovementOut)
def record_return(
    movement_id: int,
    return_in: MovementReturnCreate,
    db: Session = Depends(get_db),
    guard: User = Depends(get_current_portaria_user)
):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
        
    if movement.status == MovementStatus.CONCLUIDO:
        raise HTTPException(status_code=400, detail="Esta movimentação já foi concluída")
        
    if return_in.return_odometer < movement.departure_odometer:
        raise HTTPException(
            status_code=400,
            detail=f"Odômetro de retorno ({return_in.return_odometer} km) não pode ser menor que o de saída ({movement.departure_odometer} km)"
        )
        
    vehicle = db.query(Vehicle).filter(Vehicle.id == movement.vehicle_id).first()
    
    # Update movement
    movement.return_time = datetime.utcnow()
    movement.return_odometer = return_in.return_odometer
    movement.return_guard_id = guard.id
    movement.status = MovementStatus.CONCLUIDO
    if return_in.notes:
        movement.notes = return_in.notes
        
    # Update vehicle
    if vehicle:
        vehicle.status = VehicleStatus.DISPONIVEL
        vehicle.current_odometer = return_in.return_odometer
        
    db.commit()
    db.refresh(movement)
    return movement

@router.put("/{movement_id}", response_model=MovementOut)
def update_movement(
    movement_id: int,
    mov_in: MovementUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
        
    update_data = mov_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(movement, field, value)
        
    # Sync vehicle status & odometer if needed
    vehicle = db.query(Vehicle).filter(Vehicle.id == movement.vehicle_id).first()
    if vehicle:
        if movement.status == MovementStatus.CONCLUIDO and movement.return_odometer:
            vehicle.status = VehicleStatus.DISPONIVEL
            if movement.return_odometer > vehicle.current_odometer:
                vehicle.current_odometer = movement.return_odometer
        elif movement.status == MovementStatus.EM_TRANSITO:
            vehicle.status = VehicleStatus.EM_USO
            
    db.commit()
    db.refresh(movement)
    return movement

@router.delete("/{movement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movement(
    movement_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimentação não encontrada")
        
    vehicle = db.query(Vehicle).filter(Vehicle.id == movement.vehicle_id).first()
    if vehicle and movement.status == MovementStatus.EM_TRANSITO:
        vehicle.status = VehicleStatus.DISPONIVEL
        
    db.delete(movement)
    db.commit()
    return None
