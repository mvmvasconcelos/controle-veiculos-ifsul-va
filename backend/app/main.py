import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.core.config import settings
from app.core.database import Base, engine, ensure_schema
from app.api import auth, vehicles, drivers, movements, dashboard, users, reports, audit_logs
from seed import seed

# Create DB tables
Base.metadata.create_all(bind=engine)
ensure_schema(engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    root_path=settings.ROOT_PATH
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def on_startup():
    try:
        seed()
    except Exception as e:
        print(f"Error during startup seed: {e}")

# Include API Routers
api_v1_router = FastAPI()
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(vehicles.router, prefix=f"{settings.API_V1_STR}/vehicles", tags=["Veículos"])
app.include_router(drivers.router, prefix=f"{settings.API_V1_STR}/drivers", tags=["Motoristas"])
app.include_router(movements.router, prefix=f"{settings.API_V1_STR}/movements", tags=["Movimentações"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["Usuários"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Relatórios"])
app.include_router(audit_logs.router, prefix=f"{settings.API_V1_STR}/audit-logs", tags=["Auditoria"])

# Health Check
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME}

# Static Files & SPA Fallback
static_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
if not static_dir.exists():
    static_dir = Path("/app/static")

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Allow API routes to be handled by FastAPI
        if full_path.startswith("api/") or full_path.startswith("health"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint não encontrado"})
            
        target_file = static_dir / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))
        
        index_file = static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))
            
        return JSONResponse(status_code=404, content={"detail": "Arquivo não encontrado"})
