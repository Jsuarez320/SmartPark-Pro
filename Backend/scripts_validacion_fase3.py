"""Validación manual Fase 3 (H-09, H-12). Se ejecuta contra la DB real vía TestClient.

Crea el usuario efímero 'fase3_test' y lo elimina al final (los refresh_tokens
se borran en cascada por el FK ON DELETE CASCADE).

Escenarios:
 1. login -> access + refresh
 2. access expirado -> /auth/me da 401, /auth/refresh emite par nuevo (rotación)
 3. reuso del refresh viejo -> 401
 4. es_admin re-leído de la DB en /auth/refresh
 5. logout revoca -> /auth/refresh con él -> 401
 6. rate limit: 6+ logins fallidos -> 429
"""

from datetime import datetime, timedelta, timezone

from jose import jwt as jose_jwt
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.rate_limit import limiter
from app.core.security import pwd_context
from app.main import app

USER = "fase3_test"
PASS = "fase3-pass-123"
client = TestClient(app)


def section(title):
    print(f"\n=== {title} ===")


section("0. crear usuario de prueba efímero")
with engine.begin() as c:
    c.execute(
        text(
            "INSERT INTO usuarios (nombre, apellido, email, username, password_hash, es_admin, activo) "
            "VALUES ('Fase', 'Tres', :email, :u, :h, true, true) "
            "ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, es_admin = true, activo = true"
        ),
        {"email": "fase3@test.local", "u": USER, "h": pwd_context.hash(PASS)},
    )
print(f"usuario '{USER}' listo")

try:
    section("1. login devuelve access + refresh")
    r = client.post("/auth/login", data={"username": USER, "password": PASS})
    assert r.status_code == 200, r.text
    tok = r.json()
    assert tok["access_token"] and tok["refresh_token"]
    assert tok["es_admin"] is True
    print(
        "OK:",
        {k: (v[:25] + "..." if isinstance(v, str) and len(v) > 25 else v) for k, v in tok.items()},
    )

    section("2. access token forzado a expirar -> 401 en /auth/me")
    now = datetime.now(timezone.utc)
    expired = jose_jwt.encode(
        {
            "sub": tok["user_id"],
            "es_admin": True,
            "iat": now - timedelta(hours=1),
            "exp": now - timedelta(minutes=30),
            "jti": "test-expirado",
            "type": "access",
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401, r.status_code
    print("OK: /auth/me con access expirado -> 401")

    section("3. /auth/refresh sin Authorization header, solo refresh_token")
    r = client.post("/auth/refresh", json={"refresh_token": tok["refresh_token"]})
    assert r.status_code == 200, r.text
    nuevo = r.json()
    assert nuevo["access_token"] != tok["access_token"], "access debería ser nuevo"
    assert nuevo["refresh_token"] != tok["refresh_token"], "refresh debería rotar"
    claims = jose_jwt.decode(
        nuevo["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    exp_min = (
        datetime.fromtimestamp(claims["exp"], tz=timezone.utc) - datetime.now(timezone.utc)
    ).total_seconds() / 60
    print(
        f"OK: par nuevo emitido; exp del access en {exp_min:.1f} min; es_admin claim = {claims['es_admin']}"
    )

    section("4. reuso del refresh ya rotado -> 401")
    r = client.post("/auth/refresh", json={"refresh_token": tok["refresh_token"]})
    assert r.status_code == 401, r.status_code
    print("OK: refresh viejo revocado por rotación -> 401")

    section("5. es_admin se re-lee de la DB al refrescar")
    with engine.begin() as c:
        c.execute(text("UPDATE usuarios SET es_admin = false WHERE username = :u"), {"u": USER})
    r = client.post("/auth/refresh", json={"refresh_token": nuevo["refresh_token"]})
    assert r.status_code == 200 and r.json()["es_admin"] is False, r.text
    with engine.begin() as c:
        c.execute(text("UPDATE usuarios SET es_admin = true WHERE username = :u"), {"u": USER})
    r2 = client.post("/auth/refresh", json={"refresh_token": r.json()["refresh_token"]})
    assert r2.status_code == 200 and r2.json()["es_admin"] is True, r2.text
    print("OK: rol degradado->False, restaurado->True, leído de DB en cada refresh")
    refresh_activo = r2.json()["refresh_token"]

    section("6. logout revoca -> /auth/refresh con él -> 401")
    r = client.post("/auth/logout", json={"refresh_token": refresh_activo})
    assert r.status_code == 200, r.text
    r = client.post("/auth/refresh", json={"refresh_token": refresh_activo})
    assert r.status_code == 401, r.status_code
    print("OK: tras logout el refresh queda inutilizable (401)")

    section("7. rate limit /auth/login -> 429")
    limiter.reset()
    codigos = []
    for i in range(6):
        r = client.post("/auth/login", data={"username": USER, "password": "mal"})
        codigos.append(r.status_code)
    print("status codes:", codigos)
    assert codigos[:5] == [401] * 5, codigos
    assert codigos[5] == 429, codigos
    body_429 = client.post(
        "/auth/login", data={"username": USER, "password": "mal"}
    ).json()
    print("OK: 5 intentos -> 401, 6to -> 429 | mensaje:", body_429["detail"])

    section("RESULTADO: TODOS LOS TESTS PASARON")
finally:
    with engine.begin() as c:
        c.execute(text("DELETE FROM usuarios WHERE username = :u"), {"u": USER})
    print(f"\nlimpieza: usuario '{USER}' eliminado (refresh_tokens en cascada)")
