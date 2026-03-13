def expand_courses_to_sessions(courses):

    sessions = []

    for course in courses:
        session_id = 1
        remaining = course.unitsPerWeek

        while remaining > 0:
            units = min(course.maxUnitsPerDay, remaining)

            sessions.append(
                {"session_id": session_id, "course": course, "units": units}
            )

            remaining -= units
            session_id += 1

    return sessions


def format_genes(chromosome):
    return [
        {
            "session": g.session_id,
            "courseId": g.course_id,
            "units": g.units,
            "lecturerId": g.lecturer_id,
            "roomId": g.room_id,
            "timeslotId": g.timeslot_id
        }
        for g in chromosome.genes
    ]