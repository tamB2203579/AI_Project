from dataclasses import dataclass


@dataclass(slots=True)
class Gene:
    lecturer_id: int
    room_id: int
    course_id: int
    timeslot_id: int
    units: int
    session_id: int
