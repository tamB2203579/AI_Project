from typing import List
from pydantic import BaseModel

class Lecturer(BaseModel):
    id: int
    name: str
    maxUnitPerWeek: int
    preferenceDay: List[int]