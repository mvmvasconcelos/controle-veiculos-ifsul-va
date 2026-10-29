from sqlalchemy import create_engine, text

from app.core.database import ensure_schema


def put_vehicle(client, admin, vehicle, **data):
    return client.put(f"/api/v1/vehicles/{vehicle.id}", json=data, headers=admin)


def start_exit(client, guard, vehicle):
    return client.post("/api/v1/movements/exit", headers=guard, json={
        "vehicle_id": vehicle.id, "driver_id": 1, "destination": "Oficina", "departure_odometer": 1000})


def status_of(client, vehicle):
    return client.get(f"/api/v1/vehicles/{vehicle.id}").json()["status"]


def test_unavailable_vehicle_cannot_start_exit(client, admin, guard, vehicle):
    r = put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="  Reservado  ")
    assert r.status_code == 200 and r.json()["unavailable_reason"] == "Reservado"
    assert start_exit(client, guard, vehicle).status_code == 400


def test_maintenance_vehicle_cannot_start_exit(client, admin, guard, vehicle):
    put_vehicle(client, admin, vehicle, status="manutencao")
    assert start_exit(client, guard, vehicle).status_code == 400


def test_reason_is_hidden_from_public_and_visible_to_staff(client, admin, guard, vehicle):
    put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="Evento")
    assert "unavailable_reason" not in client.get("/api/v1/vehicles").json()[0]
    dash = client.get("/api/v1/dashboard/summary").json()
    assert "unavailable_reason" not in dash["vehicles"][0]
    assert client.get("/api/v1/vehicles/staff").status_code == 401
    assert client.get("/api/v1/vehicles/staff", headers=guard).json()[0]["unavailable_reason"] == "Evento"


def test_dashboard_hides_driver_name_from_public_and_shows_it_to_logged_in_users(client, guard, vehicle):
    movement = start_exit(client, guard, vehicle).json()

    public = client.get("/api/v1/dashboard/summary").json()
    logged_in = client.get("/api/v1/dashboard/summary", headers=guard).json()

    public_active = next(m for m in public["active_movements"] if m["id"] == movement["id"])
    logged_active = next(m for m in logged_in["active_movements"] if m["id"] == movement["id"])
    assert "driver" not in public_active
    assert logged_active["driver"]["name"] == "Motorista"

    client.post(
        f"/api/v1/movements/{movement['id']}/return",
        headers=guard,
        json={"return_odometer": 1010},
    )
    public_completed = client.get("/api/v1/dashboard/summary").json()["recent_trips"][0]
    logged_completed = client.get(
        "/api/v1/dashboard/summary", headers=guard
    ).json()["recent_trips"][0]
    assert "driver" not in public_completed
    assert logged_completed["driver"]["name"] == "Motorista"


def test_reason_validation(client, admin, vehicle):
    assert put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="x" * 201).status_code == 422
    assert put_vehicle(client, admin, vehicle, status="manutencao", unavailable_reason="Motivo").status_code == 400
    assert put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="   ").json()["unavailable_reason"] is None


def test_only_admin_can_change_vehicle_state(client, guard, vehicle):
    assert put_vehicle(client, guard, vehicle, status="indisponivel").status_code == 403


def test_unavailable_during_trip_persists_after_return(client, admin, guard, vehicle):
    movement = start_exit(client, guard, vehicle).json()
    assert status_of(client, vehicle) == "em_uso"
    put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="Reservado")
    summary = client.get("/api/v1/dashboard/summary").json()
    assert summary["metrics"]["unavailable_count"] == 1
    assert summary["metrics"]["in_use_count"] == 1
    assert [m["id"] for m in summary["active_movements"]] == [movement["id"]]

    r = client.post(f"/api/v1/movements/{movement['id']}/return", headers=guard, json={"return_odometer": 1010})
    assert r.status_code == 200
    staff = client.get("/api/v1/vehicles/staff", headers=guard).json()[0]
    assert staff["status"] == "indisponivel" and staff["unavailable_reason"] == "Reservado"

    r = put_vehicle(client, admin, vehicle, status="manutencao")
    assert r.json()["status"] == "manutencao" and r.json()["unavailable_reason"] is None


def test_maintenance_during_trip_then_return_makes_available(client, admin, guard, vehicle):
    movement = start_exit(client, guard, vehicle).json()
    put_vehicle(client, admin, vehicle, status="manutencao")
    summary = client.get("/api/v1/dashboard/summary").json()
    assert summary["metrics"]["maintenance_count"] == 1 and summary["metrics"]["in_use_count"] == 1
    assert client.post(f"/api/v1/movements/{movement['id']}/return", headers=guard,
                       json={"return_odometer": 1005}).status_code == 200
    assert status_of(client, vehicle) == "disponivel"


def test_releasing_block_during_trip_keeps_vehicle_in_use(client, admin, guard, vehicle):
    start_exit(client, guard, vehicle)
    put_vehicle(client, admin, vehicle, status="indisponivel")
    assert put_vehicle(client, admin, vehicle, status="disponivel").json()["status"] == "em_uso"
    assert start_exit(client, guard, vehicle).status_code == 400


def test_manual_in_transit_requires_open_movement(client, admin, vehicle):
    assert put_vehicle(client, admin, vehicle, status="em_uso").status_code == 400


def test_deleting_active_movement_keeps_blocks(client, admin, guard, vehicle):
    movement = start_exit(client, guard, vehicle).json()
    put_vehicle(client, admin, vehicle, status="indisponivel", unavailable_reason="Reservado")
    assert client.delete(f"/api/v1/movements/{movement['id']}", headers=admin).status_code == 204
    assert status_of(client, vehicle) == "indisponivel"

    movement = start_exit(client, guard, vehicle)
    assert movement.status_code == 400
    put_vehicle(client, admin, vehicle, status="disponivel")
    movement = start_exit(client, guard, vehicle).json()
    assert client.delete(f"/api/v1/movements/{movement['id']}", headers=admin).status_code == 204
    assert status_of(client, vehicle) == "disponivel"


def test_admin_movement_edit_does_not_override_blocks(client, admin, guard, vehicle):
    movement = start_exit(client, guard, vehicle).json()
    put_vehicle(client, admin, vehicle, status="indisponivel")
    r = client.put(f"/api/v1/movements/{movement['id']}", headers=admin,
                   json={"status": "concluido", "return_odometer": 1020})
    assert r.status_code == 200
    assert status_of(client, vehicle) == "indisponivel"


def test_vehicle_update_is_audited(client, admin, vehicle):
    put_vehicle(client, admin, vehicle, status="indisponivel")
    logs = client.get("/api/v1/audit-logs?resource=vehicle", headers=admin).json()
    assert any("indisponivel" in (log["details"] or "") for log in logs)


def test_ensure_schema_adds_column_preserving_data():
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE vehicles (id INTEGER PRIMARY KEY, status VARCHAR(10) NOT NULL)"))
        conn.execute(text("INSERT INTO vehicles (id, status) VALUES (1, 'MANUTENCAO')"))
    ensure_schema(engine)
    ensure_schema(engine)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT status, unavailable_reason FROM vehicles")).fetchall() == [("MANUTENCAO", None)]
