from dataclasses import dataclass
from typing import List

from .course import Course
from .lecturer import Lecturer
from .room import Room
from .timeslot import TimeSlot


@dataclass
class ScheduleRequest:
    lecturers: List[Lecturer]
    rooms: List[Room]
    courses: List[Course]
    timeslots: List[TimeSlot]