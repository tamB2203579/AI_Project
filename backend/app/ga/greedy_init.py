from app.schemas import Gene


def evaluate_option(course, lecturer, room, slot):

    score = 0

    if room.capacity >= course.studentsCount:
        score += 5

    if room.type in course.roomType:
        score += 5

    if slot.day in lecturer.preferenceDay:
        score += 3

    return score


def generate_greedy_chromosome(courses, lecturers, rooms, timeslots):

    genes = []

    for course in courses:

        best_score = -1
        best_option = None

        for lecturer in lecturers:
            for room in rooms:
                for slot in timeslots:

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
        )

        genes.append(gene)

    return genes