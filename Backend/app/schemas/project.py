from pydantic import BaseModel


class Project(BaseModel):
    id: str
    title: str
    description: str
    problem: str
    solution: str
    technologies: list[str]
    role: str
    status: str
    image: str | None = None
    demo_url: str | None = None
    github_url: str | None = None
    featured: bool = False
