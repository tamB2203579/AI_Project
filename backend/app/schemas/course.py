from typing import List
from pydantic import BaseModel

class Course(BaseModel):
    id: int
    name: str
    unitsPerWeek: int
    studentsCount: int
    roomType: List[str]
    lecturerId: int
    maxUnitsPerDay: int