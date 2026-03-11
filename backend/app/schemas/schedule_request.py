from typing import List
from pydantic import BaseModel

from .course import Course
from .lecturer import Lecturer
from .room import Room
from .timeslot import TimeSlot

class ScheduleRequest(BaseModel):
    lecturers: List[Lecturer]
    rooms: List[Room]
    courses: List[Course]
    timeslots: List[TimeSlot]