from app.schemas import Chromosome, Course, Lecturer, Room, TimeSlot


def evaluate_all_constraints(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
) -> tuple[dict[str, int], list[str], dict[str, int], list[str]]:
    """
    Hàm đánh giá CẢ vi phạm nghiêm trọng (Hard Constraints) lẫn điểm thưởng mềm (Soft Constraints).
    Gộp 2 vòng lặp lớn thành 1 vòng duy nhất quét qua hệ gene.
    Khử vòng lặp dò trùng lặp tuyến tính (Array Search) bằng Bitwise Integer Check.
    """
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
        "capacity_score": 0,
    }
    hard_details = []
    soft_details = []

    # Dùng Bitmask để lưu trữ biểu đồ dạy của một GV / Phòng Học
    # vd: Dạy tiết 1, 2, 3 => Mask = 0b000000111
    lecturer_masks = {}
    room_masks = {}

    # Để suy luận Workload/Movement, chúng ta phải nhóm lại theo GV
    lecturer_schedule_blocks = {}
    
    # Track days each course is scheduled to prevent multiple sessions per day
    course_days = {}

    for gene in chromosome.genes:
        course = courses_dict[gene.course_id]
        lecturer = lecturers_dict[gene.lecturer_id]
        room = rooms_dict[gene.room_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        start_period = timeslot.start_period
        end_period = start_period + gene.units - 1
        day = timeslot.day

        # === 1. ĐÁNH GIÁ THỜI GIAN (HARD) === #
        if end_period > 9:
            hard_counts["time_violations"] += 1
            hard_details.append(f"Vượt thời gian: Môn {course.id} kết thúc quá tiết 9 (Tiết {end_period})")

        if start_period <= 5 and end_period >= 6:
            hard_counts["time_violations"] += 1
            hard_details.append(f"Vắt ngang ca: Môn {course.id} bị kẹp giữa ca Sáng/Chiều")

        # === 2. ĐÁNH GIÁ CƠ SỞ VẬT CHẤT (HARD) === #
        if room.type not in course.roomType:
            hard_counts["room_suitability_violations"] += 1
            hard_details.append(f"Loại phòng: Môn {course.id} cần {course.roomType}, xếp vào P.{room.id} ({room.type})")

        # === 3. TRÙNG LẶP MÔN TRONG NGÀY (HARD) === #
        if course.id not in course_days:
            course_days[course.id] = set()
            
        if day in course_days[course.id]:
            hard_counts["daily_limit_violations"] += 1
            hard_details.append(f"Giới hạn ngày: Môn {course.id} có nhiều hơn 1 buổi trên Ngày {day}")
            
        course_days[course.id].add(day)

        # === 3. SỞ THÍCH VÀ SỨC CHỨA (SOFT) === #
        if day in lecturer.preferenceDay:
            soft_scores["preference_score"] += 1

        if room.capacity < course.studentsCount:
            soft_scores["capacity_score"] -= 1
        else:
            soft_scores["capacity_score"] += 1

        # === 4. TRÙNG LẶP SỬ DỤNG BITMASK (HARD) === #
        # Hàm sinh ra chuỗi nhị phân (vd: Start=2, Length=2 -> 0b0000000110)
        # Bắt đầu tiết 1 (start_period=1) => bit dời = 0.
        period_mask = ((1 << gene.units) - 1) << (start_period - 1)

        lecturer_key = (lecturer.id, day)
        room_key = (room.id, day)

        # Trùng lặp Giảng viên
        if lecturer_key not in lecturer_masks:
            lecturer_masks[lecturer_key] = 0
            lecturer_schedule_blocks[lecturer_key] = []
        
        if lecturer_masks[lecturer_key] & period_mask:
            hard_counts["overlap_violations"] += 1
            hard_details.append(f"GV {lecturer.id} kẹt lịch Ngày {day}")
        
        lecturer_masks[lecturer_key] |= period_mask
        lecturer_schedule_blocks[lecturer_key].append((start_period, end_period, room.id))

        # Trùng lặp Phòng
        if room_key not in room_masks:
            room_masks[room_key] = 0
            
        if room_masks[room_key] & period_mask:
            hard_counts["overlap_violations"] += 1
            hard_details.append(f"Phòng {room.id} bị trùng lịch Ngày {day}")
            
        room_masks[room_key] |= period_mask

    # === PHÂN TÍCH CHUỖI BLOCK (WORKLOAD / IDLE / MOVEMENT) === #
    for (lecturer_id, day), schedule in lecturer_schedule_blocks.items():
        schedule.sort(key=lambda x: x[0])
        total_p = sum(e - s + 1 for s, e, _ in schedule)

        if total_p <= 8:
            soft_scores["workload_score"] += 1
        else:
            soft_scores["workload_score"] -= 1

        consecutive_p = 0
        last_e = -1
        last_r = -1

        for idx, (s, e, r_id) in enumerate(schedule):
            if idx == 0:
                last_e = e
                last_r = r_id
                consecutive_p = e - s + 1
                continue

            gap = s - last_e - 1
            if gap == 0:
                consecutive_p += e - s + 1
                if last_r == r_id:
                    soft_scores["movement_score"] += 1
            elif gap == 1:
                soft_scores["idle_time_score"] += 1
                consecutive_p = e - s + 1
            else:
                soft_scores["idle_time_score"] -= 1
                consecutive_p = e - s + 1

            last_e = e
            last_r = r_id

            if consecutive_p > 5:
                soft_scores["workload_score"] -= 1
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
    hard_penalty: int = 50,
    soft_bonus: int = 5,
):
    """
    Penalty Fitness (Chấm điểm Trừ Phạt Base Score)

    Phương pháp:
    - Lấy quỹ điểm chuẩn là 1000.
    - Mỗi vi phạm nghiêm trọng (Hard Constraint) làm trừ đi 50 điểm.
    - Mỗi một nấc đánh giá đạt của Soft Constraint sẽ cộng thêm 5 điểm bù.
    """
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
    """
    Điểm Thích Nghi Alpha/Beta (Thưởng Phát Không Tuệ Tính)

    Sử dụng tỷ lệ nghịch và trọng số khác biệt cho 2 nhóm Soft và Hard:
    - Alpha=1000: Scale tối đa nếu NST không dính bất kỳ lỗi HARD nào (Score_Hard = Alpha * 1.0).
    - Beta=10: Tỷ suất điểm mềm. Tối đa của cá thể cộng sinh thêm từ ưu điểm thời khóa biểu.
    Công thức: Alpha * (1 / (1 + Sum(HardViols))) + Beta * Sum(Max(0, SoftScore))
    """
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
    """
    Weighted Fitness (Tổng Trọng Số Tuyến Tính Có Chuẩn Hóa [0 -> 1])

    Hoàn toàn đánh giá cá thể TKB theo một tỷ lệ cố định (w_1, w_2, ..., w_n)
    sao cho tích luỹ của toàn bộ weights = 1.0.
    Lưu ý: Để việc cộng số học tuyến tính có ý nghĩa, mọi dữ liệu vi phạm cứng/điểm dương mềm
    đều được ép qua một hàm Sigmoid / Inverse để quy về miền [0 - 1.0].
    """
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    # TRỌNG SỐ CHO HARD CONSTRAINTS (Tổng: 0.55)
    w_overlap = 0.35  # 35% cho Trùng lịch (Nghiêm trọng nhất)
    w_time = 0.20  # 20% cho Sai khung giờ
    
    # Ở đây do room.capacity bị gỡ khỏi hard constraints nên ta chỉ đo lại room type vi phạm
    score_room = 1.0 / (1.0 + hard_counts["room_suitability_violations"]) 

    # TRỌNG SỐ CHO SOFT CONSTRAINTS (Tổng: 0.45)
    w_pref = 0.10  # 10% Sở thích ưu tiên
    w_workload = 0.08  # 8% Khối lượng làm việc liên tục
    w_idle = 0.07  # 7% Thời gian rảnh rỗi chờ ca dạy
    w_move = 0.05  # 5% Đổi phòng
    w_capacity = 0.15  # 15% cho Sức chứa phòng (Capacity)

    # CHUẨN HOÁ HARD-CONSTRAINTS VỀ THANG (0 -> 1.0]
    # Bản chất: Lỗi càng nhiều (Mẫu số to) thì Giá trị đem nhân Weight càng tụt mất (Gần về 0)
    score_overlap = 1.0 / (1.0 + hard_counts["overlap_violations"])
    score_time = 1.0 / (1.0 + hard_counts["time_violations"])

    # CHUẨN HOÁ SOFT-CONSTRAINTS VỀ THANG (0.0 -> 1.0)
    # Vì Soft Score là dạng tổng điểm (+) / phạt trừ biên độ (-), khó kiểm soát cận độ giới hạn.
    # Nên sử dụng đường cong Sigmoid 1 / (1 + e^-x) để làm phẳng và nhét chúng vào khoảng [0, 1].
    import math

    def normalize_sigmoid(val):
        # Ép điểm x nhét vào khoảng (0, 1) giúp dễ dàng weight toán học.
        return 1 / (1 + math.exp(-val))

    s_pref = normalize_sigmoid(soft_scores["preference_score"])
    s_workload = normalize_sigmoid(soft_scores["workload_score"])
    s_idle = normalize_sigmoid(soft_scores["idle_time_score"])
    s_move = normalize_sigmoid(soft_scores["movement_score"])
    s_capacity = normalize_sigmoid(soft_scores["capacity_score"])

    # KẾT XUẤT FINAL SCORE [Tổng W là 1.0]
    # Giá trị độ thích nghi cao nhất hoàn hảo của lý thuyết sẽ xấp xỉ là 1.0
    chromosome.fitness = (
        (w_overlap * score_overlap)
        + (w_time * score_time)
        + (0 * score_room) # Ignore score room if it's 0 (removed capacity from hard constraint sum) 
        + (w_pref * s_pref)
        + (w_workload * s_workload)
        + (w_idle * s_idle)
        + (w_move * s_move)
        + (w_capacity * s_capacity)
    )
    return chromosome.fitness


def lexicographic_fitness(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
):
    """
    Lexicographic Fitness (Fitness So Sánh Ưu Tiên Toán Học)

    NST được tính dưới dạng Tuple 2 chiều. Khi GA chạy Tournament/Rank Selection,
    nếu Tuple (A, B) > (C, D), thì nó ưu tiên số hạng A trước B.
    => Chỉ số A là lỗi HardConstraint (Để âm để vi phạm lớn sinh ra Tuple nhỏ).
    => Chỉ số B là điểm cộng SoftConstraint (Nếu A bằng nhau thì B lớn hơn thắng).
    """
    hard_counts, _, soft_scores, _ = evaluate_all_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )

    hard_violations = sum(hard_counts.values())
    soft_score = sum(soft_scores.values())

    # Điểm càng ít lỗi âm (Vd: -1 so với -30) thì bộ gene cá thể đó ưu việt hơn.
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
    return fitness_fn(chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict, **kwargs)
