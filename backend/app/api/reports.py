import csv
import io
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.movement import Movement
from app.models.user import User
from app.api.deps import get_current_portaria_user

router = APIRouter()

@router.get("/export/csv")
def export_movements_csv(
    db: Session = Depends(get_db),
    guard: User = Depends(get_current_portaria_user)
):
    movements = db.query(Movement).order_by(Movement.departure_time.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Write header
    writer.writerow([
        "ID", "Veículo", "Placa", "Motorista", "Destino", "Motivo",
        "Data/Hora Saída", "KM Saída", "Vigilante Saída",
        "Data/Hora Retorno", "KM Retorno", "Vigilante Retorno",
        "KM Percorrida", "Status", "Observações"
    ])
    
    for m in movements:
        km_driven = (m.return_odometer - m.departure_odometer) if m.return_odometer and m.departure_odometer else ""
        writer.writerow([
            m.id,
            m.vehicle.display_name if m.vehicle else "",
            m.vehicle.plate if m.vehicle else "",
            m.driver.name if m.driver else "",
            m.destination,
            m.purpose or "",
            m.departure_time.strftime("%Y-%m-%d %H:%M:%S") if m.departure_time else "",
            m.departure_odometer,
            m.departure_guard.name if m.departure_guard else "",
            m.return_time.strftime("%Y-%m-%d %H:%M:%S") if m.return_time else "",
            m.return_odometer or "",
            m.return_guard.name if m.return_guard else "",
            km_driven,
            m.status.value,
            m.notes or ""
        ])
        
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=relatorio_movimentacoes_ifsul.csv"
    return response
