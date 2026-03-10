from dataclasses import dataclass

@dataclass
class TimeSlot:
    id: int
    day: int
    start_period: int
    duration: int