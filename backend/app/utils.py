import math
import dataclasses
from app.schemas.course import Course


def expand_courses_to_sessions(courses, rooms):
    """
    1. Split courses into virtual classes if studentsCount > max room capacity
    2. Expand each (virtual) course into sessions based on unitsPerWeek / maxUnitsPerDay
    Returns: (sessions_list, new_courses_dict)
    """
    all_courses = []
    next_virtual_id = max(c.id for c in courses) * 1000 + 1

    for course in courses:
        # Find max capacity among compatible rooms
        compatible = [r for r in rooms if r.type in course.roomType]
        max_cap = max((r.capacity for r in compatible), default=0)

        if max_cap > 0 and course.studentsCount > max_cap:
            # Split into N virtual classes
            n_classes = math.ceil(course.studentsCount / max_cap)
            students_per_class = math.ceil(course.studentsCount / n_classes)

            for i in range(n_classes):
                virtual = dataclasses.replace(
                    course,
                    id=next_virtual_id,
                    courseCode=f"{course.courseCode}-M{str(i+1).zfill(2)}",
                    studentsCount=min(students_per_class, course.studentsCount - i * students_per_class),
                )
                all_courses.append(virtual)
                next_virtual_id += 1
        else:
            # No split needed – keep original but add M01 suffix for consistency
            all_courses.append(dataclasses.replace(
                course,
                courseCode=f"{course.courseCode}-M01",
            ))

    # Build new courses dict
    new_courses_dict = {c.id: c for c in all_courses}

    # Expand each course into sessions
    sessions = []
    for course in all_courses:
        session_id = 1
        remaining = course.unitsPerWeek

        while remaining > 0:
            units = min(course.maxUnitsPerDay, remaining)
            sessions.append(
                {"session_id": session_id, "course": course, "units": units}
            )
            remaining -= units
            session_id += 1

    return sessions, new_courses_dict


def format_genes(chromosome, courses_dict, lecturers_dict, rooms_dict):
    formatted = []
    for g in chromosome.genes:
        course = courses_dict.get(g.course_id)
        lecturer = lecturers_dict.get(g.lecturer_id)
        room = rooms_dict.get(g.room_id)

        formatted.append({
            "session": g.session_id,
            "courseId": g.course_id,
            "courseName": f"{course.courseCode} – {course.name}" if course else "Unknown",
            "units": g.units,
            "lecturerId": g.lecturer_id,
            "lecturerName": lecturer.name if lecturer else "Unknown",
            "roomId": g.room_id,
            "roomName": room.name if room else "Unknown",
            "timeslotId": g.timeslot_id
        })
    return formatted