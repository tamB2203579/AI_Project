import math
from app.schemas import Chromosome, Course, Lecturer, Room, TimeSlot


def evaluate_all_constraints(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
) -> tuple[dict[str, int], list[str], dict[str, int], list[str]]:
    hard_counts = {
        "overlap_violations": 0,
        "time_violations": 0,
        "room_suitability_violations": 0,
        "daily_limit_violations": 0,
    }
    soft_scores = {
        "preference_score": 0,
        "workload_score": 0,
        "idle_time_score": 0,
        "movement_score": 0,
    }
    hard_details = []
    soft_details = []

    lecturer_masks = {}
    room_masks = {}

    lecturer_schedule_blocks = {}

    course_days = {}

    for gene in chromosome.genes:
        course = courses_dict[gene.course_id]
        lecturer = lecturers_dict[gene.lecturer_id]
        room = rooms_dict[gene.room_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        start_period = timeslot.start_period
        end_period = start_period + gene.units - 1
        day = timeslot.day

        # ĐÁNH GIÁ THỜI GIAN (HARD)
        if end_period > 9:
            hard_counts["time_violations"] += 1
            hard_details.append(
                f"Vượt thời gian: Môn {course.name} {course.courseCode} kết thúc quá tiết 9 (Tiết {end_period})"
            )

        if start_period <= 5 and end_period >= 6:
            hard_counts["time_violations"] += 1
            hard_details.append(
                f"Vắt ngang ca: Môn {course.name} {course.courseCode} bị kẹp giữa ca Sáng/Chiều"
            )

        # ĐÁNH GIÁ CƠ SỞ VẬT CHẤT (HARD)
        if room.type not in course.roomType:
            hard_counts["room_suitability_violations"] += 1
            hard_details.append(
                f"Loại phòng: Môn {course.name} {course.courseCode} cần {course.roomType}, xếp vào P.{room.id} ({room.type})"
            )

        if room.capacity < course.studentsCount:
            hard_counts["room_suitability_violations"] += 1
            hard_details.append(
                f"Sức chứa: Môn {course.name} {course.courseCode} ({course.studentsCount} sv), xếp vào P.{room.name} (chứa {room.capacity})"
            )

        # TRÙNG LẶP MÔN TRONG NGÀY (HARD)
        if course.id not in course_days:
            course_days[course.id] = set()

        if day in course_days[course.id]:
            hard_counts["daily_limit_violations"] += 1
            hard_details.append(
                f"Giới hạn ngày: Môn {course.name} {course.courseCode} có nhiều hơn 1 buổi trên Ngày {day}"
            )

        course_days[course.id].add(day)

        # SỞ THÍCH VÀ SỨC CHỨA (SOFT)
        if day in lecturer.preferenceDay:
            soft_scores["preference_score"] += 1
            soft_details.append(
                f"GV {lecturer.name} dạy đúng ngày sở thích (Ngày {day}) — Môn {course.name} {course.courseCode}"
            )

        # TRÙNG LẶP SỬ DỤNG BITMASK (HARD)
        period_mask = ((1 << gene.units) - 1) << (start_period - 1)

        lecturer_key = (lecturer.id, day)
        room_key = (room.id, day)

        # Trùng lặp giảng viên
        if lecturer_key not in lecturer_masks:
            lecturer_masks[lecturer_key] = 0
            lecturer_schedule_blocks[lecturer_key] = []

        if lecturer_masks[lecturer_key] & period_mask:
            hard_counts["overlap_violations"] += 1
            hard_details.append(f"GV {lecturer.name} kẹt lịch Ngày {day}")

        lecturer_masks[lecturer_key] |= period_mask
        lecturer_schedule_blocks[lecturer_key].append(
            (start_period, end_period, room.id)
        )

        # Trùng lặp phòng
        if room_key not in room_masks:
            room_masks[room_key] = 0

        if room_masks[room_key] & period_mask:
            hard_counts["overlap_violations"] += 1
            hard_details.append(f"Phòng {room.name} bị trùng lịch Ngày {day}")

        room_masks[room_key] |= period_mask

    # TÍNH WORKLOAD / IDLE / MOVEMENT
    for (_, day), schedule in lecturer_schedule_blocks.items():
        schedule.sort(key=lambda x: x[0])
        total_p = sum(e - s + 1 for s, e, _ in schedule)

        if total_p <= 8:
            soft_scores["workload_score"] += 1
            soft_details.append(
                f"GV {lecturer.name} Ngày {day}: Tải hợp lý ({total_p} tiết)"
            )
        else:
            soft_scores["workload_score"] -= 1
            soft_details.append(
                f"GV {lecturer.name} Ngày {day}: Quá tải ({total_p} tiết)"
            )

        consecutive_p = 0
        last_e = -1
        last_r = -1

        for idx, (s, e, r_id) in enumerate(schedule):
            if idx == 0:
                last_e = e
                last_r = r_id
                consecutive_p = e - s + 1
                if consecutive_p > 5:
                    soft_scores["workload_score"] -= 1
                    soft_details.append(
                        f"GV {lecturer.name} Ngày {day}: Dạy liên tục quá 5 tiết ngay đầu ca"
                    )
                    consecutive_p = 0
                continue

            gap = s - last_e - 1

            if gap == 0:
                consecutive_p += e - s + 1
                if last_r == r_id:
                    soft_scores["movement_score"] += 1
                    soft_details.append(
                        f"GV {lecturer.name} Ngày {day}: Dạy liên tiếp cùng phòng P.{room.name}"
                    )
            elif gap == 1:
                soft_scores["idle_time_score"] -= 1
                soft_details.append(
                    f"GV {lecturer.name} Ngày {day}: Chờ 1 tiết giữa 2 lớp (nhỏ)"
                )
                consecutive_p = e - s + 1
            else:
                soft_scores["idle_time_score"] -= gap
                soft_details.append(
                    f"GV {lecturer.name} Ngày {day}: Chờ {gap} tiết giữa 2 lớp (lớn)"
                )
                consecutive_p = e - s + 1

            last_e = e
            last_r = r_id

            if consecutive_p > 5:
                soft_scores["workload_score"] -= 1
                soft_details.append(
                    f"GV {lecturer.name} Ngày {day}: Dạy liên tục quá 5 tiết"
                )
                consecutive_p = 0

    return hard_counts, hard_details, soft_scores, soft_details


def analyze_solution(
    chromosome: Chromosome,
    courses_dict,
    lecturers_dict,
    rooms_dict,
    timeslots_dict,
):
    hard_counts, hard_details, soft_scores, soft_details = evaluate_all_constraints(
        chromosome,
        courses_dict,
        lecturers_dict,
        rooms_dict,
        timeslots_dict,
    )

    return {
        "hard_constraints": {
            "total_violations": sum(hard_counts.values()),
            "by_type": hard_counts,
            "details": hard_details,
        },
        "soft_constraints": {
            "total_score": sum(soft_scores.values()),
            "by_type": soft_scores,
            "details": soft_details,
        },
    }


def penalty_fitness(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
    base_score: int = 1000,
    hard_penalty: int = 100,
    soft_bonus: int = 5,
):
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    hard_violations = sum(hard_counts.values())
    soft_score = sum(soft_scores.values())

    # 1 lỗi cứng = mất x điểm
    penalty = hard_violations * hard_penalty

    # Cộng dồn điểm mềm * tỷ lệ thưởng
    bonus = soft_score * soft_bonus

    chromosome.fitness = base_score - penalty + bonus
    return chromosome.fitness


def alpha_beta_fitness(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
    alpha: int = 1000,
    beta: int = 10,
):
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    hard_violations = sum(hard_counts.values())
    soft_score = sum(soft_scores.values())

    score_hard = alpha * (1 / (1 + hard_violations))
    score_soft = beta * max(0, soft_score)

    chromosome.fitness = score_hard + score_soft
    return chromosome.fitness


def weighted_fitness(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
):
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    # Trọng số cho hard constraints (Tổng: 0.70)
    w_overlap = 0.40
    w_time = 0.10
    w_room_suitability = 0.10
    w_daily_limit = 0.10

    # Trọng số cho soft constraints (Tổng: 0.30)
    w_pref = 0.15
    w_workload = 0.07
    w_idle = 0.05
    w_move = 0.03

    # Chuẩn hóa hard-constraints về thang (0 -> 1.0]
    score_overlap = 1.0 / (1.0 + hard_counts["overlap_violations"])
    score_time = 1.0 / (1.0 + hard_counts["time_violations"])
    score_room_suitability = 1.0 / (1.0 + hard_counts["room_suitability_violations"])
    score_daily_limit = 1.0 / (1.0 + hard_counts["daily_limit_violations"])

    # Chuẩn hóa soft-constraints về thang (0.0 -> 1.0)
    def normalize_sigmoid(val):
        return 1 / (1 + math.exp(-val))

    s_pref = normalize_sigmoid(soft_scores["preference_score"])
    s_workload = normalize_sigmoid(soft_scores["workload_score"])
    s_idle = normalize_sigmoid(soft_scores["idle_time_score"])
    s_move = normalize_sigmoid(soft_scores["movement_score"])

    chromosome.fitness = (
        (w_overlap * score_overlap)
        + (w_time * score_time)
        + (w_room_suitability * score_room_suitability)
        + (w_daily_limit * score_daily_limit)
        + (w_pref * s_pref)
        + (w_workload * s_workload)
        + (w_idle * s_idle)
        + (w_move * s_move)
    )
    return chromosome.fitness


def lexicographic_fitness(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
):
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    hard_violations = sum(hard_counts.values())
    soft_score = sum(soft_scores.values())

    chromosome.fitness = (-hard_violations, soft_score)
    return chromosome.fitness


FITNESS_METHODS = {
    "weighted": weighted_fitness,
    "penalty": penalty_fitness,
    "alpha_beta": alpha_beta_fitness,
    "lexicographic": lexicographic_fitness,
}


def pick_fitness_method(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
    method: str = "weighted",
    **kwargs,
):
    fitness_fn = FITNESS_METHODS.get(method, weighted_fitness)
    return fitness_fn(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict, **kwargs
    )
