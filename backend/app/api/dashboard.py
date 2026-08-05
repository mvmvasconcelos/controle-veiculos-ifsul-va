from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.movement import Movement, MovementStatus
from app.schemas.vehicle import VehicleOut
from app.schemas.movement import MovementOut

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    vehicles = db.query(Vehicle).order_by(Vehicle.id.asc()).all()
    
    total_vehicles = len(vehicles)
    available_count = sum(1 for v in vehicles if v.status == VehicleStatus.DISPONIVEL)
    in_use_count = sum(1 for v in vehicles if v.status == VehicleStatus.EM_USO)
    maintenance_count = sum(1 for v in vehicles if v.status == VehicleStatus.MANUTENCAO)
    
    # Active movements (currently out)
    active_movements = (
        db.query(Movement)
        .filter(Movement.status == MovementStatus.EM_TRANSITO)
        .order_by(Movement.departure_time.desc())
        .all()
    )
    
    # Common destinations (top 5)
    common_destinations = (
        db.query(Movement.destination, func.count(Movement.id).label("count"))
        .group_by(Movement.destination)
        .order_by(func.count(Movement.id).desc())
        .limit(5)
        .all()
    )
    destinations_list = [{"destination": d, "count": c} for d, c in common_destinations]
    
    # Recent completed trips (last 5)
    recent_trips = (
        db.query(Movement)
        .filter(Movement.status == MovementStatus.CONCLUIDO)
        .order_by(Movement.return_time.desc())
        .limit(5)
        .all()
    )
    
    return {
        "metrics": {
            "total_vehicles": total_vehicles,
            "available_count": available_count,
            "in_use_count": in_use_count,
            "maintenance_count": maintenance_count,
        },
        "vehicles": [VehicleOut.model_validate(v) for v in vehicles],
        "active_movements": [MovementOut.model_validate(m) for m in active_movements],
        "common_destinations": destinations_list,
        "recent_trips": [MovementOut.model_validate(m) for m in recent_trips]
    }
