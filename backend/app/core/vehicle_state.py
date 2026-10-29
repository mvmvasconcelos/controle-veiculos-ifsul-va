from sqlalchemy.orm import Session
from app.models.movement import Movement, MovementStatus
from app.models.vehicle import Vehicle, VehicleStatus

def has_active_movement(db: Session, vehicle_id: int) -> bool:
    return (
        db.query(Movement.id)
        .filter(Movement.vehicle_id == vehicle_id, Movement.status == MovementStatus.EM_TRANSITO)
        .first()
        is not None
    )

def apply_movement_closed(vehicle: Vehicle) -> None:
    """After a return, the vehicle becomes available unless ADMIN blocked it as Indisponível."""
    if vehicle.status != VehicleStatus.INDISPONIVEL:
        vehicle.status = VehicleStatus.DISPONIVEL

def apply_movement_open(vehicle: Vehicle) -> None:
    """An open movement marks the vehicle as in use, but never overrides ADMIN-defined blocks."""
    if vehicle.status not in (VehicleStatus.INDISPONIVEL, VehicleStatus.MANUTENCAO):
        vehicle.status = VehicleStatus.EM_USO

def apply_movement_removed(vehicle: Vehicle) -> None:
    """Discarding an open movement only releases the in-use state; blocks stay in place."""
    if vehicle.status == VehicleStatus.EM_USO:
        vehicle.status = VehicleStatus.DISPONIVEL
