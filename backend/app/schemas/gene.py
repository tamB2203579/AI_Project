from dataclasses import dataclass

@dataclass
class Gene:
    lecturer_id: int
    room_id: int
    course_id: int
    timeslot_id: int