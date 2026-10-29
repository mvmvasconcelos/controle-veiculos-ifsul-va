import os

os.environ["DATABASE_URL"] = "sqlite://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.driver import Driver
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    yield session
    session.close()


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _headers(db, username, role):
    user = User(username=username, name=username, password_hash=get_password_hash("x"), role=role)
    db.add(user)
    db.commit()
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture()
def admin(db):
    return _headers(db, "admin", UserRole.ADMIN)


@pytest.fixture()
def guard(db):
    return _headers(db, "guard", UserRole.PORTARIA)


@pytest.fixture()
def vehicle(db):
    v = Vehicle(display_name="Carro", type="Carro", make="X", model="Y", color="Branco", fuel="Flex",
                year_manufacture=2020, year_model=2020, current_odometer=1000, plate="AAA0001")
    db.add(v)
    db.add(Driver(name="Motorista"))
    db.commit()
    return v
