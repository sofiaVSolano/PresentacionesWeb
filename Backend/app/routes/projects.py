from fastapi import APIRouter

from app.repositories.project_repository import list_projects
from app.schemas.project import Project

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[Project])
def get_projects() -> list[Project]:
    return list_projects()
