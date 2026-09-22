"""
Entrega de los mensajes del formulario de contacto.

El correo sale por SMTP desde la propia cuenta de Sofía y llega a su bandeja.
El remitente tiene que ser esa cuenta —ningún servidor serio deja firmar con
la dirección de otro—, así que quien escribe va en `Reply-To`: al darle a
responder, la respuesta le llega directa.
"""

import logging
import smtplib
import ssl
from email.headerregistry import Address
from email.message import EmailMessage

from app.core.config import settings
from app.schemas.contact import ContactRequest, ContactResponse

logger = logging.getLogger(__name__)

RECEIVED = "Mensaje recibido. Te responderé pronto."


class ContactDeliveryError(RuntimeError):
    """No se pudo entregar el mensaje; la ruta decide qué se le cuenta a quien escribe."""


def _address(display_name: str, addr_spec: str) -> Address:
    username, _, domain = addr_spec.partition("@")
    return Address(display_name=display_name, username=username, domain=domain)


def _build_email(payload: ContactRequest) -> EmailMessage:
    message = EmailMessage()
    message["Subject"] = f"Portafolio · mensaje de {payload.name}"
    message["From"] = _address(settings.contact_from_name, settings.smtp_user)
    message["To"] = settings.contact_recipient
    # Lo que hace que responder funcione sin copiar direcciones a mano
    message["Reply-To"] = _address(payload.name, payload.email)
    message.set_content(
        f"{payload.message}\n\n"
        f"—\n"
        f"De: {payload.name} <{payload.email}>\n"
        f"Enviado desde el formulario de contacto del portafolio.\n"
        f"Responde a este correo y le llega directo.\n"
    )
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


def send_contact_message(payload: ContactRequest) -> ContactResponse:
    if not settings.smtp_configured:
        # En desarrollo se trabaja sin credenciales: queda en el log y sigue.
        # En producción no se calla: un mensaje perdido en silencio es peor que
        # un error a la vista, porque nadie se entera de que se perdió.
        if settings.environment == "development":
            logger.warning(
                "SMTP sin configurar: el mensaje de %s <%s> solo queda aquí:\n%s",
                payload.name,
                payload.email,
                payload.message,
            )
            return ContactResponse(success=True, detail=RECEIVED)
        raise ContactDeliveryError("El correo no está configurado en el servidor.")

    try:
        _deliver(_build_email(payload))
    except (smtplib.SMTPException, OSError) as error:
        # El texto queda en el log aunque el envío falle: no se pierde nada
        logger.exception(
            "No se pudo enviar el mensaje de %s <%s>:\n%s",
            payload.name,
            payload.email,
            payload.message,
        )
        raise ContactDeliveryError("No se pudo entregar el mensaje.") from error

    logger.info("Mensaje de contacto entregado: %s <%s>", payload.name, payload.email)
    return ContactResponse(success=True, detail=RECEIVED)
