from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.user import User
from app.schemas.vehicle import VehicleOut, VehicleStaffOut, VehicleCreate, VehicleUpdate
from app.api.deps import get_current_admin_user, get_current_portaria_user
from app.core.vehicle_state import has_active_movement
from app.api.audit_logs import log_action

router = APIRouter()

@router.get("", response_model=List[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.id.asc()).all()

@router.get("/staff", response_model=List[VehicleStaffOut])
def list_vehicles_staff(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_portaria_user)
):
    return db.query(Vehicle).order_by(Vehicle.id.asc()).all()

@router.get("/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return vehicle

@router.post("", response_model=VehicleStaffOut, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    existing = db.query(Vehicle).filter(Vehicle.plate == vehicle_in.plate).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um veículo com esta placa")
    
    if vehicle_in.status == VehicleStatus.EM_USO:
        raise HTTPException(status_code=400, detail="Em Trânsito é definido pelo registro de saída, não manualmente")
    if vehicle_in.unavailable_reason and vehicle_in.status != VehicleStatus.INDISPONIVEL:
        raise HTTPException(status_code=400, detail="O motivo só pode ser informado para veículos Indisponíveis")

    vehicle = Vehicle(**vehicle_in.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    log_action(db, admin, "CREATE", "vehicle", f"Criou o veículo {vehicle.display_name} (Placa: {vehicle.plate})")
    return vehicle

@router.put("/{vehicle_id}", response_model=VehicleStaffOut)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    update_data = vehicle_in.model_dump(exclude_unset=True)
    if "plate" in update_data and update_data["plate"] != vehicle.plate:
        existing = db.query(Vehicle).filter(Vehicle.plate == update_data["plate"]).first()
        if existing:
            raise HTTPException(status_code=400, detail="Já existe um veículo com esta placa")
            
    previous_status = vehicle.status
    new_status = update_data.get("status", vehicle.status)
    if "status" in update_data and new_status in (VehicleStatus.EM_USO, VehicleStatus.DISPONIVEL):
        # An open movement keeps the vehicle in use until the return is registered
        if has_active_movement(db, vehicle.id):
            new_status = VehicleStatus.EM_USO
        elif new_status == VehicleStatus.EM_USO:
            raise HTTPException(status_code=400, detail="Em Trânsito é definido pelo registro de saída, não manualmente")
    update_data["status"] = new_status

    if new_status != VehicleStatus.INDISPONIVEL:
        if update_data.get("unavailable_reason"):
            raise HTTPException(status_code=400, detail="O motivo só pode ser informado para veículos Indisponíveis")
        update_data["unavailable_reason"] = None
    elif "unavailable_reason" not in update_data and previous_status != VehicleStatus.INDISPONIVEL:
        update_data["unavailable_reason"] = None

    for field, value in update_data.items():
        setattr(vehicle, field, value)
        
    db.commit()
    db.refresh(vehicle)
    details = f"Atualizou o veículo {vehicle.display_name} (ID: {vehicle.id})"
    if previous_status != vehicle.status:
        details += f" - status: {previous_status.value} -> {vehicle.status.value}"
    log_action(db, admin, "UPDATE", "vehicle", details)
    return vehicle

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    
    display_name = vehicle.display_name
    plate = vehicle.plate
    db.delete(vehicle)
    db.commit()
    log_action(db, admin, "DELETE", "vehicle", f"Excluiu o veículo {display_name} (Placa: {plate})")
    return None
