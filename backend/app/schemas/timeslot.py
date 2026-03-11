from pydantic import BaseModel

class TimeSlot(BaseModel):
    id: int
    day: int
    start_period: int
    duration: int