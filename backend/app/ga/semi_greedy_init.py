import random
from app.schemas import Gene

TOP_K = 3


def evaluate_option(course, lecturer, room, slot):

    score = 0

    if room.capacity >= course.studentsCount:
        score += 5

    if room.type in course.roomType:
        score += 5

    if slot.day in lecturer.preferenceDay:
        score += 3

    return score


def generate_semi_greedy_chromosome(courses, lecturers, rooms, timeslots):

    genes = []

    for course in courses:

        candidates = []

        for lecturer in lecturers:
            for room in rooms:
                for slot in timeslots:

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
        )

        genes.append(gene)

    return genes