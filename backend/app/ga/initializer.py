import random
import dataclasses
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
        genes = generate_greedy_chromosome(sessions, rooms, timeslots)
        population.append(Chromosome(genes=genes))

    # Random
    for _ in range(random_size):
        genes = generate_random_chromosome(sessions, rooms, timeslots)
        population.append(Chromosome(genes=genes))

    # Semi Greedy
    for _ in range(semi_size):
        genes = generate_semi_greedy_chromosome(sessions, rooms, timeslots)
        population.append(Chromosome(genes=genes))

    return population


# RANDOM INIT
def generate_random_chromosome(sessions, rooms, timeslots):

    genes = []
    course_days = {}

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]

        # Use the course's assigned lecturer (not a random one)
        lecturer_id = course.lecturerId

        room = random.choice(rooms)
        
        if course.id not in course_days:
            course_days[course.id] = set()

        valid_slots = [
            s for s in timeslots
            if s.start_period + units - 1 <= 9
            and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)  # no morning→afternoon crossing
            and s.day not in course_days[course.id]
        ]

        if not valid_slots:
            valid_slots = [
                s for s in timeslots
                if s.start_period + units - 1 <= 9
                and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)
            ]
            if not valid_slots:
                continue

        slot = random.choice(valid_slots)
        course_days[course.id].add(slot.day)

        gene = Gene(
            lecturer_id=lecturer_id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# GREEDY INIT — tracks occupied slots to avoid overlaps
def generate_greedy_chromosome(sessions, rooms, timeslots):

    genes = []
    # Track occupation: (lecturer_id, day) -> set of occupied periods
    lecturer_occupied = {}
    # Track occupation: (room_id, day) -> set of occupied periods
    room_occupied = {}
    course_days = {}

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]
        lecturer_id = course.lecturerId

        best_score = -1
        best_option = None
        
        if course.id not in course_days:
            course_days[course.id] = set()

        shuffled_rooms = list(rooms)
        random.shuffle(shuffled_rooms)
        shuffled_slots = list(timeslots)
        random.shuffle(shuffled_slots)

        for room in shuffled_rooms:
            for slot in shuffled_slots:
                if slot.start_period + units - 1 > 9:
                    continue

                # Check session boundary (morning: 1-5, afternoon: 6-9)
                start = slot.start_period
                end = start + units - 1
                if start <= 5 and end >= 6:
                    continue
                    
                if slot.day in course_days[course.id]:
                    continue

                # Check lecturer overlap
                lec_key = (lecturer_id, slot.day)
                occupied_periods = set(range(start, end + 1))
                if lec_key in lecturer_occupied and lecturer_occupied[lec_key] & occupied_periods:
                    continue

                # Check room overlap
                room_key = (room.id, slot.day)
                if room_key in room_occupied and room_occupied[room_key] & occupied_periods:
                    continue

                score = evaluate_option(course, room, slot, lecturer_id)

                if score > best_score:
                    best_score = score
                    best_option = (room, slot, occupied_periods, lec_key, room_key)

        if best_option is None:
            # Fallback: random placement if no valid option found
            room = random.choice(rooms)
            valid_slots = [
                s for s in timeslots 
                if s.start_period + units - 1 <= 9
                and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)
                and s.day not in course_days[course.id]
            ]
            if not valid_slots:
                valid_slots = [
                    s for s in timeslots 
                    if s.start_period + units - 1 <= 9
                    and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)
                ]
            slot = random.choice(valid_slots) if valid_slots else timeslots[0]
            start = slot.start_period
            end = start + units - 1
            occupied_periods = set(range(start, end + 1))
            lec_key = (lecturer_id, slot.day)
            room_key = (room.id, slot.day)
            best_option = (room, slot, occupied_periods, lec_key, room_key)

        room, slot, occupied_periods, lec_key, room_key = best_option
        course_days[course.id].add(slot.day)

        # Mark occupation
        if lec_key not in lecturer_occupied:
            lecturer_occupied[lec_key] = set()
        lecturer_occupied[lec_key] |= occupied_periods

        if room_key not in room_occupied:
            room_occupied[room_key] = set()
        room_occupied[room_key] |= occupied_periods

        gene = Gene(
            lecturer_id=lecturer_id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# SEMI GREEDY INIT
def generate_semi_greedy_chromosome(sessions, rooms, timeslots):

    genes = []
    lecturer_occupied = {}
    room_occupied = {}
    course_days = {}

    for session in sessions:
        course = session["course"]
        units = session["units"]
        session_id = session["session_id"]
        lecturer_id = course.lecturerId

        candidates = []
        
        if course.id not in course_days:
            course_days[course.id] = set()

        shuffled_rooms = list(rooms)
        random.shuffle(shuffled_rooms)
        shuffled_slots = list(timeslots)
        random.shuffle(shuffled_slots)

        for room in shuffled_rooms:
            for slot in shuffled_slots:
                if slot.start_period + units - 1 > 9:
                    continue

                start = slot.start_period
                end = start + units - 1
                if start <= 5 and end >= 6:
                    continue
                    
                if slot.day in course_days[course.id]:
                    continue

                # Check lecturer overlap
                lec_key = (lecturer_id, slot.day)
                occupied_periods = set(range(start, end + 1))
                if lec_key in lecturer_occupied and lecturer_occupied[lec_key] & occupied_periods:
                    continue

                # Check room overlap
                room_key = (room.id, slot.day)
                if room_key in room_occupied and room_occupied[room_key] & occupied_periods:
                    continue

                score = evaluate_option(course, room, slot, lecturer_id)
                candidates.append((score, room, slot, occupied_periods, lec_key, room_key))

        if not candidates:
            # Fallback
            room = random.choice(rooms)
            valid_slots = [
                s for s in timeslots 
                if s.start_period + units - 1 <= 9
                and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)
                and s.day not in course_days[course.id]
            ]
            if not valid_slots:
                valid_slots = [
                    s for s in timeslots 
                    if s.start_period + units - 1 <= 9
                    and not (s.start_period <= 5 and s.start_period + units - 1 >= 6)
                ]
            slot = random.choice(valid_slots) if valid_slots else timeslots[0]
            start = slot.start_period
            end = start + units - 1
            occupied_periods = set(range(start, end + 1))
            lec_key = (lecturer_id, slot.day)
            room_key = (room.id, slot.day)
            candidates.append((0, room, slot, occupied_periods, lec_key, room_key))

        candidates.sort(key=lambda x: x[0], reverse=True)
        top_candidates = candidates[:TOP_K]
        chosen = random.choice(top_candidates)

        _, room, slot, occupied_periods, lec_key, room_key = chosen
        course_days[course.id].add(slot.day)

        # Mark occupation
        if lec_key not in lecturer_occupied:
            lecturer_occupied[lec_key] = set()
        lecturer_occupied[lec_key] |= occupied_periods

        if room_key not in room_occupied:
            room_occupied[room_key] = set()
        room_occupied[room_key] |= occupied_periods

        gene = Gene(
            lecturer_id=lecturer_id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
            units=units,
            session_id=session_id,
        )

        genes.append(gene)

    return genes


# SCORING FUNCTION
def evaluate_option(course, room, slot, lecturer_id=None):

    score = 0

    if room.capacity >= course.studentsCount:
        score += 5

    if room.type in course.roomType:
        score += 5

    return score


# SORT COURSE
def sort_courses(courses):

    return sorted(
        courses,
        key=lambda c: (c.studentsCount, c.unitsPerWeek, len(c.roomType)),
        reverse=True,
    )
