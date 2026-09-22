from app.schemas.project import Project

# Placeholder until real project data is provided — populate with confirmed
# projects only (RITMO, EcoConciencia, Sanigest, LexIA, etc.), never invented ones.
_PROJECTS: list[Project] = []


def list_projects() -> list[Project]:
    return _PROJECTS
