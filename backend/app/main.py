
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

from app.schemas import Course, Room, Lecturer, TimeSlot

from app.ga.initializer import initialize_population

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

@app.get("/health")
def health():
    return {"status": "GA scheduler running"}

@app.post("/test-init")
def test_initializer(data: dict):

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    population = initialize_population(
        pop_size=3,
        courses=courses,
        lecturers=lecturers,
        rooms=rooms,
        timeslots=timeslots
    )

    lecturer_map = {l.id: l.name for l in lecturers}
    room_map = {r.id: r.name for r in rooms}
    course_map = {c.id: c.name for c in courses}
    timeslot_map = {t.id: t for t in timeslots}

    result = []

    for chromosome in population:

        genes = []

        for g in chromosome.genes:

            slot = timeslot_map[g.timeslot_id]

            genes.append({
                "session": g.session_id,
                "course": course_map[g.course_id],
                "units": g.units,
                "lecturer": lecturer_map[g.lecturer_id],
                "room": room_map[g.room_id],
                "day": slot.day,
                "start_period": slot.start_period,
                "duration": slot.duration
            })

        result.append(genes)

    return {"population": result}

@app.get("/test-init")
def test_initializer():

    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    population = initialize_population(
        pop_size=20,
        courses=courses,
        lecturers=lecturers,
        rooms=rooms,
        timeslots=timeslots
    )

    result = []

    for chromosome in population:
        genes = []
        for g in chromosome.genes:
            genes.append(g.__dict__)
        result.append(genes)

    return {"population": result}