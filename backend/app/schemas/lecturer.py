from dataclasses import dataclass
from typing import List

@dataclass
class Lecturer:
    id: int
    name: str
    maxUnitPerWeek: int
    preferenceDay: List[int]