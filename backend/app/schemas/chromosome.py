from typing import Any
from pydantic import BaseModel
from app.schemas.gene import Gene


class Chromosome(BaseModel):
    genes: list[Gene]
    fitness: Any = 0.0
