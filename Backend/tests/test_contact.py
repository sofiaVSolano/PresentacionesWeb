import smtplib

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.routes.contact import limiter
from app.schemas.contact import ContactRequest
from app.services import contact_service

client = TestClient(app)

VALID = {"name": "Ana Gómez", "email": "ana@ejemplo.com", "message": "Hola Sofía."}


@pytest.fixture(autouse=True)
def entorno_limpio(monkeypatch: pytest.MonkeyPatch) -> None:
    """Cada test arranca sin cuenta de envíos y sin credenciales de correo."""
    limiter.reset()
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_password", "")


def test_contact_accepts_valid_message() -> None:
    response = client.post("/api/contact", json=VALID)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["detail"]


def test_contact_rejects_bad_email() -> None:
    response = client.post("/api/contact", json={**VALID, "email": "no-es-un-correo"})
    assert response.status_code == 422


def test_contact_rejects_empty_fields() -> None:
    for field in ("name", "message"):
        response = client.post("/api/contact", json={**VALID, field: ""})
        assert response.status_code == 422, field


def test_contact_rejects_message_over_limit() -> None:
    # El formulario corta en 2000; el backend no puede fiarse de eso
    response = client.post("/api/contact", json={**VALID, "message": "x" * 2001})
    assert response.status_code == 422


def test_contact_rate_limits_repeated_messages() -> None:
    for _ in range(settings.contact_rate_limit):
        assert client.post("/api/contact", json=VALID).status_code == 200
    blocked = client.post("/api/contact", json=VALID)
    assert blocked.status_code == 429


def test_contact_reports_delivery_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_user", "sofia@ejemplo.com")
    monkeypatch.setattr(settings, "smtp_password", "secreto")

    def falla(_message: object) -> None:
        raise smtplib.SMTPException("el servidor no contesta")

    monkeypatch.setattr(contact_service, "_deliver", falla)

    response = client.post("/api/contact", json=VALID)
    # Un fallo de entrega no puede contarse como éxito: quien escribe tiene que
    # enterarse para poder usar el correo directo que ofrece el formulario.
    assert response.status_code == 502


def test_contact_email_replies_to_the_visitor(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "smtp_user", "sofia@ejemplo.com")
    monkeypatch.setattr(settings, "contact_to", "")

    message = contact_service._build_email(ContactRequest(**VALID))

    assert message["To"] == "sofia@ejemplo.com"
    assert "ana@ejemplo.com" in message["Reply-To"]
    assert "sofia@ejemplo.com" in message["From"]
    assert VALID["message"] in message.get_content()
