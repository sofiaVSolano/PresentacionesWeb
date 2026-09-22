from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.rate_limit import SlidingWindow
from app.schemas.contact import ContactRequest, ContactResponse
from app.services.contact_service import ContactDeliveryError, send_contact_message

router = APIRouter(tags=["contact"])

# Una hora de ventana: suficiente para escribir varias veces si algo sale mal,
# y corto para quien quiera llenar la bandeja de entrada.
limiter = SlidingWindow(limit=settings.contact_rate_limit, window_seconds=3600)


@router.post("/contact", response_model=ContactResponse)
def post_contact(payload: ContactRequest, request: Request) -> ContactResponse:
    client = request.client.host if request.client else "desconocido"
    if not limiter.allow(client):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Has enviado varios mensajes seguidos. Inténtalo dentro de un rato.",
        )

    try:
        return send_contact_message(payload)
    except ContactDeliveryError as error:
        # El formulario ya ofrece por su cuenta el correo directo: aquí solo va
        # el qué pasó, para no repetirle dos veces lo mismo a quien escribe.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error
