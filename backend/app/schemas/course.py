from dataclasses import dataclass
from typing import List

@dataclass
class Course:
    id: int
    name: str
    unitsPerWeek: int
    studentsCount: int
    roomType: List[str]
    lecturerId: int
    maxUnitsPerDay: int