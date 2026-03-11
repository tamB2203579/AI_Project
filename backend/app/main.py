from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import json

from app.schemas import Course, Room, Lecturer, TimeSlot, ScheduleRequest

from app.ga.initializer import initialize_population
from app.ga.fitness import pick_fitness_method, weighted_fitness
from app.ga.selection import pick_selection_method
from app.ga.elitism import get_elites

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
        timeslots=timeslots,
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

            genes.append(
                {
                    "session": g.session_id,
                    "course": course_map[g.course_id],
                    "units": g.units,
                    "lecturer": lecturer_map[g.lecturer_id],
                    "room": room_map[g.room_id],
                    "day": slot.day,
                    "start_period": slot.start_period,
                    "duration": slot.duration,
                }
            )

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
        timeslots=timeslots,
    )

    result = []

    for chromosome in population:
        genes = []
        for g in chromosome.genes:
            genes.append(g.__dict__)
        result.append(genes)

    return {"population": result}


@app.get("/test-selection")
def test_selection():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    courses_dict = {c.id: c for c in courses}
    lecturers_dict = {l.id: l for l in lecturers}
    rooms_dict = {r.id: r for r in rooms}
    timeslots_dict = {t.id: t for t in timeslots}

    population = initialize_population(
        pop_size=20,
        courses=courses,
        lecturers=lecturers,
        rooms=rooms,
        timeslots=timeslots,
    )

    for ind in population:
        weighted_fitness(ind, courses_dict, lecturers_dict, rooms_dict, timeslots_dict)

    num_parents = 5

    rw_selected = pick_selection_method(population, num_parents, method="roulette")
    tn_selected = pick_selection_method(population, num_parents, method="tournament", tournament_k=3)
    rank_selected = pick_selection_method(population, num_parents, method="rank")
    eli_selected = pick_selection_method(population, num_parents, method="elimination")

    def extract_fitness(selected_pop):
        return [ind.fitness for ind in selected_pop]

    return {
        "original_population_fitness": extract_fitness(population),
        "roulette_wheel_selection": extract_fitness(rw_selected),
        "tournament_selection": extract_fitness(tn_selected),
        "rank_selection": extract_fitness(rank_selected),
        "elimination_selection": extract_fitness(eli_selected),
    }


@app.get("/test-fitness")
def test_fitness():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    courses_dict = {c.id: c for c in courses}
    lecturers_dict = {l.id: l for l in lecturers}
    rooms_dict = {r.id: r for r in rooms}
    timeslots_dict = {t.id: t for t in timeslots}

    population = initialize_population(
        pop_size=1,
        courses=courses,
        lecturers=lecturers,
        rooms=rooms,
        timeslots=timeslots,
    )

    chromosome = population[0]

    # Sử dụng pick_fitness_method cho từng phương pháp
    return {
        "penalty_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="penalty",
            hard_penalty=100,
            soft_bonus=5
        ),
        "alpha_beta_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="alpha_beta",
            alpha=1000,
            beta=100
        ),
        "weighted_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="weighted",
        ),
        "lexicographic_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="lexicographic",
        ),
    }


@app.get("/test-elitism")
def test_elitism():
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    courses_dict = {c.id: c for c in courses}
    lecturers_dict = {l.id: l for l in lecturers}
    rooms_dict = {r.id: r for r in rooms}
    timeslots_dict = {t.id: t for t in timeslots}

    population = initialize_population(
        pop_size=100,
        courses=courses,
        lecturers=lecturers,
        rooms=rooms,
        timeslots=timeslots,
    )

    # Calculate fitness for sorting
    for ind in population:
        weighted_fitness(ind, courses_dict, lecturers_dict, rooms_dict, timeslots_dict)

    # Get elites
    elites = get_elites(population, elitism_rate=0.2)  # Get top 2

    return {
        "original_population_fitness": [ind.fitness for ind in population],
        "elites_fitness": [ind.fitness for ind in elites],
    }
