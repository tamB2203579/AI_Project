from typing import List
from pydantic import BaseModel
from app.schemas.gene import Gene


class Chromosome(BaseModel):
    genes: List[Gene]
    fitness: float = 0.0