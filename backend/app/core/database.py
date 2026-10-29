import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("sqlite:////"):
    db_path = db_url.replace("sqlite:////", "/")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
elif db_url.startswith("sqlite:///"):
    db_path = db_url.replace("sqlite:///", "")
    if os.path.dirname(db_path):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url, connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def ensure_schema(bind_engine=engine):
    """Adds columns introduced after the first release to existing databases (create_all never alters tables)."""
    from sqlalchemy import inspect, text
    inspector = inspect(bind_engine)
    if "vehicles" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("vehicles")}
    if "unavailable_reason" not in columns:
        with bind_engine.begin() as conn:
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN unavailable_reason VARCHAR(200)"))
