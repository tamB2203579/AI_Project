from pydantic import BaseModel

class Gene(BaseModel):
    lecturer_id: int
    room_id: int
    course_id: int
    timeslot_id: int
    units: int
    session_id: int