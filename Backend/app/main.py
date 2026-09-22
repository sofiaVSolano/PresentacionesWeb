import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

# Sin esto, el logger raíz se queda en WARNING y no se ven los avisos de la
# aplicación —como "mensaje de contacto entregado"— entre los de uvicorn.
logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")

app = FastAPI(title="Sofia Valencia — Portfolio API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
