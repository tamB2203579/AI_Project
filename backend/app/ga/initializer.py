from app.ga.random_init import generate_random_chromosome
from app.ga.semi_greedy_init import generate_semi_greedy_chromosome
from app.schemas import Chromosome


def initialize_population(
    pop_size,
    courses,
    lecturers,
    rooms,
    timeslots,
):

    courses = sort_courses(courses)

    greedy_size = int(pop_size * 0.3)
    random_size = int(pop_size * 0.4)
    semi_size = pop_size - greedy_size - random_size

    population = []

    # random
    for _ in range(random_size):

        genes = generate_random_chromosome(
            courses, lecturers, rooms, timeslots
        )

        population.append(
            Chromosome(genes=genes)
        )

    # semi greedy
    for _ in range(semi_size):

        genes = generate_semi_greedy_chromosome(
            courses, lecturers, rooms, timeslots
        )

        population.append(
            Chromosome(genes=genes)
        )

    return population


def sort_courses(courses):
    return sorted(
        courses,
        key=lambda c: (
            c.studentsCount,
            c.unitsPerWeek,
            len(c.roomType)
        ),
        reverse=True
    )