from pydantic import BaseModel

from .course import Course
from .lecturer import Lecturer
from .room import Room
from .timeslot import TimeSlot


class ScheduleRequest(BaseModel):
    lecturers: list[Lecturer]
    rooms: list[Room]
    courses: list[Course]
    timeslots: list[TimeSlot]
