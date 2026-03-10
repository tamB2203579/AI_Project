from dataclasses import dataclass
from typing import List
from app.schemas.gene import Gene

@dataclass
class Chromosome:
    genes: List[Gene]
    fitness: float = 0.0