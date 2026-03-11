def expand_courses_to_sessions(courses):

    sessions = []

    for course in courses:

        session_id =1
        remaining = course.unitsPerWeek

        while remaining > 0:

            units = min(course.maxUnitsPerDay, remaining)

            sessions.append({
                "session_id": session_id,
                "course": course,
                "units": units
            })

            remaining -= units
            session_id += 1

    return sessions