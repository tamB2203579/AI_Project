from pydantic import BaseModel


class Course(BaseModel):
    id: int
    name: str
    unitsPerWeek: int
    studentsCount: int
    roomType: list[str]
    lecturerId: int
    maxUnitsPerDay: int
