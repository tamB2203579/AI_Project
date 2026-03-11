from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import copy
import random

from app.schemas import Course, Room, Lecturer, TimeSlot

from app.ga.initializer import initialize_population
from app.ga.fitness import pick_fitness_method, weighted_fitness
from app.ga.selection import pick_selection_method
from app.ga.elitism import get_elites

from app.ga.crossover import (
    single_point_crossover, 
    two_point_crossover, 
    multi_point_crossover, 
    uniform_crossover
)
from app.ga.mutation import (
    swap_mutation, 
    random_reassignment_mutation, 
    creep_mutation,
    heuristic_mutation
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)
class CrossoverRequest(BaseModel):
    method: str = Field(
        default="single_point", 
        description="Chọn: single_point, two_point, multi_point, uniform"
    )
    n_points: int = Field(
        default=3, 
        ge=1, 
        description="Số điểm cắt (chỉ có tác dụng khi chọn multi_point)"
    )

class MutationRequest(BaseModel):
    method: str = Field(
        default="random", 
        description="Chọn: random, swap, creep, heuristic"
    )
    mutation_rate: float = Field(
        default=5.0, 
        ge=0.0, 
        le=10.0,
        description="Tỉ lệ đột biến phần trăm (0 - 10%)"
    )

def format_genes(chromosome):
    return [
        {
            "session": g.session_id,
            "course": g.course_id,
            "units": g.units,
            "lecturer": g.lecturer_id,
            "room": g.room_id,
            "timeslot": g.timeslot_id
        }
        for g in chromosome.genes
    ]


@app.get("/health")
def health():
    return {"status": "GA scheduler running"}


@app.post("/test-init")
def test_initializer_post(data: dict):
    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    population = initialize_population(
        pop_size=3, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots,
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
        pop_size=20, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots,
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
        pop_size=20, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots,
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
        pop_size=1, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots,
    )

    chromosome = population[0]

    return {
        "penalty_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="penalty", hard_penalty=100, soft_bonus=5
        ),
        "alpha_beta_fitness": pick_fitness_method(
            chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict,
            method="alpha_beta", alpha=1000, beta=100
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
        pop_size=100, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots,
    )

    for ind in population:
        weighted_fitness(ind, courses_dict, lecturers_dict, rooms_dict, timeslots_dict)

    elites = get_elites(population, elitism_rate=0.2) 

    return {
        "original_population_fitness": [ind.fitness for ind in population],
        "elites_fitness": [ind.fitness for ind in elites],
    }

@app.post("/test-crossover")
def test_crossover_endpoint(req: CrossoverRequest):
    with open("data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    lecturers = [Lecturer(**l) for l in data["lecturers"]]
    rooms = [Room(**r) for r in data["rooms"]]
    courses = [Course(**c) for c in data["courses"]]
    timeslots = [TimeSlot(**t) for t in data["timeslots"]]

    population = initialize_population(pop_size=2, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots)
    parent1, parent2 = population[0], population[1]

    if req.method == "single_point":
        child1, child2 = single_point_crossover(parent1, parent2)
    elif req.method == "two_point":
        child1, child2 = two_point_crossover(parent1, parent2)
    elif req.method == "multi_point":
        child1, child2 = multi_point_crossover(parent1, parent2, n=req.n_points)
    elif req.method == "uniform":
        child1, child2 = uniform_crossover(parent1, parent2)
    else:
        return {"error": f"Phương pháp '{req.method}' không hợp lệ."}

    return {
        "method_used": req.method,
        "n_points_param": req.n_points if req.method == "multi_point" else "Not applicable",
        "parents": {
            "parent_1": format_genes(parent1),
            "parent_2": format_genes(parent2)
        },
        "children": {
            "child_1": format_genes(child1),
            "child_2": format_genes(child2)
        }
    }

@app.post("/test-mutation")
def test_mutation_endpoint(req: MutationRequest):
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

    population = initialize_population(pop_size=1, courses=courses, lecturers=lecturers, rooms=rooms, timeslots=timeslots)
    original = population[0]
    mutated = copy.deepcopy(original)
    
    total_genes = len(mutated.genes)
    num_to_mutate = int(round(total_genes * (req.mutation_rate / 100.0)))
    
    if req.mutation_rate > 0 and num_to_mutate == 0:
        num_to_mutate = 1

    mutations_count = 0

    if num_to_mutate > 0:
        if req.method == "heuristic":
            # Đối với heuristic, ta chạy thẳng hàm và xem nó fix được bao nhiêu lỗi
            mutations_count = heuristic_mutation(
                mutated, lecturers, rooms, timeslots,
                courses_dict, lecturers_dict, rooms_dict, timeslots_dict
            )
            
        elif req.method == "swap":
            num_swaps = max(1, num_to_mutate // 2)
            for _ in range(num_swaps):
                if swap_mutation(mutated):
                    mutations_count += 2
                    
        elif req.method in ["random", "creep"]:
            genes_to_mutate = random.sample(mutated.genes, num_to_mutate)
            for gene in genes_to_mutate:
                if req.method == "random":
                    random_reassignment_mutation(gene, lecturers, rooms, timeslots)
                    mutations_count += 1
                elif req.method == "creep":
                    if creep_mutation(gene, timeslots):
                        mutations_count += 1
        else:
            return {"error": f"Phương pháp '{req.method}' không hợp lệ."}

    return {
        "method_used": req.method,
        "mutation_rate_applied": f"{req.mutation_rate}%",
        "total_genes": total_genes,
        "target_mutations": num_to_mutate if req.method != "heuristic" else "Dynamic (Based on faults)",
        "actual_mutations_count": mutations_count,
        "results": {
            "original": format_genes(original),
            "mutated": format_genes(mutated)
        }
    }