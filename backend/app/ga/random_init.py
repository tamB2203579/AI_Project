import random
from app.schemas import Gene


def generate_random_chromosome(courses, lecturers, rooms, timeslots):

    genes = []

    for course in courses:

        lecturer = random.choice(lecturers)
        room = random.choice(rooms)
        slot = random.choice(timeslots)

        gene = Gene(
            lecturer_id=lecturer.id,
            room_id=room.id,
            course_id=course.id,
            timeslot_id=slot.id,
        )

        genes.append(gene)

    return genes