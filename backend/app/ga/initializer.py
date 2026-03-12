import random
from app.schemas import Chromosome, Gene
from app.utils import expand_courses_to_sessions

TOP_K = 3


def initialize_population(
    pop_size,
    courses,
    lecturers,
    rooms,
    timeslots,
):

    courses = sort_courses(courses)

    # split course -> sessions
    sessions = expand_courses_to_sessions(courses)

    print("=== SESSIONS ===")
    for s in sessions:
        print(
            "course:", s["course"].name,
            "| session:", s["session_id"],
            "| units:", s["units"]
        )

    greedy_size = int(pop_size * 0.3)
    random_size = int(pop_size * 0.4)
    semi_size = pop_size - greedy_size - random_size

    population = []

    # Greedy
    for _ in range(greedy_size):
        genes = generate_greedy_chromosome(sessions, lecturers, rooms, timeslots)

        population.append(Chromosome(genes=genes))

    # Random
    for _ in range(random_size):
        genes = generate_random_chromosome(sessions, lecturers, rooms, timeslots)

        population.append(Chromosome(genes=genes))

    # Semi Greedy
    for _ in range(semi_size):
        genes = generate_semi_greedy_chromosome(sessions, lecturers, rooms, timeslots)

        population.append(Chromosome(genes=genes))

    return population


# RANDOM INIT
def generate_random_chromosome(sessions, lecturers, rooms, timeslots):

    genes = []

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]

        lecturer = random.choice(lecturers)
        room = random.choice(rooms)

        valid_slots = [s for s in timeslots if s.start_period + units - 1 <= 9]

        if not valid_slots:
            continue

        slot = random.choice(valid_slots)

        gene = Gene(
            lecturer_id=lecturer.id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# GREEDY INIT
def generate_greedy_chromosome(sessions, lecturers, rooms, timeslots):

    genes = []

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]

        best_score = -1
        best_option = None

        for lecturer in lecturers:
            for room in rooms:
                for slot in timeslots:
                    if slot.start_period + units - 1 > 9:
                        continue

                    score = evaluate_option(course, lecturer, room, slot)

                    if score > best_score:
                        best_score = score
                        best_option = (lecturer, room, slot)

        lecturer, room, slot = best_option

        gene = Gene(
            lecturer_id=lecturer.id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# SEMI GREEDY INIT
def generate_semi_greedy_chromosome(sessions, lecturers, rooms, timeslots):

    genes = []

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]

        candidates = []

        for lecturer in lecturers:
            for room in rooms:
                for slot in timeslots:
                    if slot.start_period + units - 1 > 9:
                        continue

                    score = evaluate_option(course, lecturer, room, slot)

                    candidates.append((score, lecturer, room, slot))

        candidates.sort(key=lambda x: x[0], reverse=True)

        top_candidates = candidates[:TOP_K]

        chosen = random.choice(top_candidates)

        _, lecturer, room, slot = chosen

        gene = Gene(
            lecturer_id=lecturer.id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# SCORING FUNCTION
def evaluate_option(course, lecturer, room, slot):

    score = 0

    if room.capacity >= course.studentsCount:
        score += 5

    if room.type in course.roomType:
        score += 5

    if slot.day in lecturer.preferenceDay:
        score += 3

    return score


# SORT COURSE
def sort_courses(courses):

    return sorted(
        courses,
        key=lambda c: (c.studentsCount, c.unitsPerWeek, len(c.roomType)),
        reverse=True,
    )
