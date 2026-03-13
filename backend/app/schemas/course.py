from dataclasses import dataclass


@dataclass(slots=True)
class Course:
    id: int
    courseCode: str
    name: str
    unitsPerWeek: int
    studentsCount: int
    roomType: list[str]
    lecturerId: int
    maxUnitsPerDay: int
