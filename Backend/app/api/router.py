from fastapi import APIRouter

from app.routes import contact, health, projects

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(projects.router)
api_router.include_router(contact.router)
