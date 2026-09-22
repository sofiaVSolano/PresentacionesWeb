"""
Entrega de los mensajes del formulario de contacto.

El correo sale de una dirección propia y llega a la bandeja de Sofía. El
remitente tiene que ser esa dirección —ningún servidor serio deja firmar con la
de otro—, así que quien escribe va en `Reply-To`: al darle a responder, la
respuesta le llega directa.

Hay dos caminos de salida y se intentan en este orden:

1. Resend, por HTTPS. Es el que funciona en producción: Render no deja abrir
   conexiones SMTP salientes y el socket muere con "Network is unreachable".
2. SMTP, el de siempre. Sirve en local y queda de respaldo por si Resend falla.

Si los dos fallan, el mensaje no se da por entregado: la ruta devuelve 502 y
quien escribe puede recurrir al correo directo que ofrece el formulario.
"""

import logging
import smtplib
import ssl
from email.headerregistry import Address
from email.message import EmailMessage

import resend
from resend.http_client_requests import RequestsClient

from app.core.config import settings
from app.schemas.contact import ContactRequest, ContactResponse

logger = logging.getLogger(__name__)

RECEIVED = "Mensaje recibido. Te responderé pronto."


class ContactDeliveryError(RuntimeError):
    """No se pudo entregar el mensaje; la ruta decide qué se le cuenta a quien escribe."""


def _address(display_name: str, addr_spec: str) -> Address:
    username, _, domain = addr_spec.partition("@")
    return Address(display_name=display_name, username=username, domain=domain)


def _subject(payload: ContactRequest) -> str:
    return f"Portafolio · mensaje de {payload.name}"


def _body(payload: ContactRequest) -> str:
    return (
        f"{payload.message}\n\n"
        f"—\n"
        f"De: {payload.name} <{payload.email}>\n"
        f"Enviado desde el formulario de contacto del portafolio.\n"
        f"Responde a este correo y le llega directo.\n"
    )


def _build_email(payload: ContactRequest) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = _subject(payload)
    message["From"] = _address(settings.contact_from_name, settings.smtp_user)
    message["To"] = settings.contact_recipient
    # Lo que hace que responder funcione sin copiar direcciones a mano
    message["Reply-To"] = _address(payload.name, payload.email)
    message.set_content(_body(payload))
    return message


def _deliver(message: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.smtp_ssl:
        with smtplib.SMTP_SSL(
            settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout, context=context
        ) as smtp:
            smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
        return

    with smtplib.SMTP(
        settings.smtp_host, settings.smtp_port, timeout=settings.smtp_timeout
    ) as smtp:
        smtp.starttls(context=context)
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)


def _send_via_resend(payload: ContactRequest) -> str | None:
    """Envía por la API de Resend y devuelve el id del correo. Lanza si no sale."""
    # La clave se toma de la configuración en cada envío, nunca del código, y no
    # se escribe en ningún log: solo viaja en la cabecera Authorization del SDK.
    resend.api_key = settings.resend_api_key
    # El cliente por defecto trae 30 s; en una petición web eso es demasiado
    # tiempo colgado antes de pasar al respaldo.
    resend.default_http_client = RequestsClient(timeout=settings.resend_timeout)

    sent = resend.Emails.send(
        {
            "from": settings.resend_from,
            "to": [settings.contact_recipient],
            "subject": _subject(payload),
            # Solo la dirección: la API es estricta con el formato y un 422 aquí
            # gastaría el intento. El nombre ya va en el asunto y en el cuerpo.
            "reply_to": [payload.email],
            "text": _body(payload),
        }
    )
    return sent.get("id") if isinstance(sent, dict) else None


def _send_via_smtp(payload: ContactRequest) -> None:
    """Envía por SMTP desde la cuenta de Sofía. Lanza si no sale."""
    _deliver(_build_email(payload))


def send_contact_message(payload: ContactRequest) -> ContactResponse:
    if not settings.email_configured:
        # En desarrollo se trabaja sin credenciales: queda en el log y sigue.
        # En producción no se calla: un mensaje perdido en silencio es peor que
        # un error a la vista, porque nadie se entera de que se perdió.
        if settings.environment == "development":
            logger.warning(
                "Correo sin configurar: el mensaje de %s <%s> solo queda aquí:\n%s",
                payload.name,
                payload.email,
                payload.message,
            )
            return ContactResponse(success=True, detail=RECEIVED)
        raise ContactDeliveryError("El correo no está configurado en el servidor.")

    if settings.resend_configured:
        try:
            email_id = _send_via_resend(payload)
        except Exception as error:  # noqa: BLE001
            # Ancho a propósito: da igual si fue la red, la clave o un 422 del
            # dominio sin verificar; cualquier fallo tiene que dejar paso a SMTP.
            logger.warning(
                "Resend no pudo entregar el mensaje de %s <%s> (%s: %s); se intenta SMTP.",
                payload.name,
                payload.email,
                type(error).__name__,
                error,
            )
        else:
            logger.info(
                "Mensaje de contacto entregado por Resend: %s <%s> (id %s)",
                payload.name,
                payload.email,
                email_id or "desconocido",
            )
            return ContactResponse(success=True, detail=RECEIVED)

    if not settings.smtp_configured:
        # El texto queda en el log aunque el envío falle: no se pierde nada
        logger.error(
            "Resend falló y no hay SMTP de respaldo; el mensaje de %s <%s> solo queda aquí:\n%s",
            payload.name,
            payload.email,
            payload.message,
        )
        raise ContactDeliveryError("No se pudo entregar el mensaje.")

    try:
        _send_via_smtp(payload)
    except (smtplib.SMTPException, OSError) as error:
        # El texto queda en el log aunque el envío falle: no se pierde nada
        logger.exception(
            "Resend y SMTP fallaron; el mensaje de %s <%s> solo queda aquí:\n%s",
            payload.name,
            payload.email,
            payload.message,
        )
        raise ContactDeliveryError("No se pudo entregar el mensaje.") from error

    logger.info("Mensaje de contacto entregado por SMTP: %s <%s>", payload.name, payload.email)
    return ContactResponse(success=True, detail=RECEIVED)
