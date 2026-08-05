import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.driver import Driver, DriverType

def seed(db_session=None):
    if db_session is None:
        engine = create_engine(settings.DATABASE_URL)
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        close_db = True
    else:
        db = db_session
        close_db = False

    # 1. Seed Users
    initial_users = [
        {"username": "marcelo", "name": "Marcelo (Admin)", "role": UserRole.ADMIN},
        {"username": "vinicius", "name": "Vinicius (Admin)", "role": UserRole.ADMIN},
        {"username": "portaria1", "name": "Portaria 01", "role": UserRole.PORTARIA},
    ]
    for u in initial_users:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            user = User(
                username=u["username"],
                name=u["name"],
                password_hash=get_password_hash("123456"),
                role=u["role"],
                is_active=True
            )
            db.add(user)
    db.commit()

    # 2. Seed 5 Official Vehicles
    vehicles_data = [
        {
            "display_name": "Corolla Prata",
            "type": "Carro",
            "make": "Toyota",
            "model": "Corolla Gli",
            "color": "Prata",
            "fuel": "Alco/Gasol",
            "year_manufacture": 2009,
            "year_model": 2010,
            "current_odometer": 145000,
            "plate": "IQK5148",
            "renavam": "184009294",
            "chassis": "9BRBB42E7A5110897",
            "status": VehicleStatus.DISPONIVEL
        },
        {
            "display_name": "Zafira Elegance",
            "type": "Carro",
            "make": "GM/Chevrolet",
            "model": "Zafira Elegance",
            "color": "Branca",
            "fuel": "Alco/Gasol",
            "year_manufacture": 2010,
            "year_model": 2010,
            "current_odometer": 182000,
            "plate": "IQT0168",
            "renavam": "206180829",
            "chassis": "9BGTU75C0AC229295",
            "status": VehicleStatus.DISPONIVEL
        },
        {
            "display_name": "Microonibus",
            "type": "Microonibus",
            "make": "Agrale",
            "model": "Marcopolo/Volare W9",
            "color": "Branca",
            "fuel": "Diesel",
            "year_manufacture": 2010,
            "year_model": 2010,
            "current_odometer": 210000,
            "plate": "IQS3577",
            "renavam": "204133718",
            "chassis": "93PB40E3PAC032254",
            "status": VehicleStatus.DISPONIVEL
        },
        {
            "display_name": "Sprinter",
            "type": "Van",
            "make": "Mercedes Benz",
            "model": "Sprinter",
            "color": "Prata",
            "fuel": "Diesel",
            "year_manufacture": 2011,
            "year_model": 2011,
            "current_odometer": 165000,
            "plate": "ISJ9104",
            "renavam": "367508060",
            "chassis": "8AC903672BE051128",
            "status": VehicleStatus.DISPONIVEL
        },
        {
            "display_name": "Ônibus",
            "type": "Ônibus",
            "make": "Mercedes Benz",
            "model": "Marcopolo/ 0-500 M Euro 5",
            "color": "Branca",
            "fuel": "Diesel - S10",
            "year_manufacture": 2013,
            "year_model": 2013,
            "current_odometer": 195000,
            "plate": "IVI5850",
            "renavam": "992705053",
            "chassis": "9BM382185DB898182",
            "status": VehicleStatus.DISPONIVEL
        }
    ]

    for v_data in vehicles_data:
        existing = db.query(Vehicle).filter(Vehicle.plate == v_data["plate"]).first()
        if not existing:
            vehicle = Vehicle(**v_data)
            db.add(vehicle)
    db.commit()

    # 3. Seed Initial Drivers
    drivers_data = [
        {"name": "Motorista Oficial IFSul", "department": "Setor de Transportes", "driver_type": DriverType.FIXO},
        {"name": "Carlos Eduardo (Servidor)", "department": "Direção Geral", "driver_type": DriverType.FREQUENTE},
        {"name": "Prof. Roberto Mendes", "department": "Ensino", "driver_type": DriverType.FREQUENTE},
    ]
    for d_data in drivers_data:
        existing = db.query(Driver).filter(Driver.name == d_data["name"]).first()
        if not existing:
            driver = Driver(**d_data)
            db.add(driver)
    db.commit()

    if close_db:
        db.close()

if __name__ == "__main__":
    seed()
