from app.schemas import Chromosome, Course, Lecturer, Room, TimeSlot


def evaluate_hard_constraints(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
) -> tuple[dict[str, int], list[str]]:
    """
    Hàm đánh giá số liệu vi phạm các ràng buộc cứng (Hard Constraints).

    Phân loại vi phạm thành 3 nhóm cơ bản:
    1. Trùng lặp (overlap): Giảng viên dạy 2 lớp cùng lúc, hoặc 2 lớp học chung 1 phòng.
    2. Thời gian (time): Tổng thời lượng vượt qua 9 tiết/ngày, hoặc vắt ngang ca sáng (<= tiết 5) và chiều (>= tiết 6).
    3. Phù hợp chuẩn (room_suitability): Phòng học bị sai loại phòng (ví dụ Lý thuyết vs Thực hành).
    """
    counts = {
        "overlap_violations": 0,
        "time_violations": 0,
        "room_suitability_violations": 0,
    }
    violation_details = []

    # Biến lưu trữ lịch đã xếp để dò tìm các điểm trùng lặp (Overlap)
    # Cấu trúc lưu trữ: {(ID Đối Tượng, Ngày học): [(Tiết Bắt đầu, Tiết Kết thúc), ...]}
    lecturer_schedule = {}
    room_schedule = {}

    for gene in chromosome.genes:
        course = courses_dict[gene.course_id]
        lecturer = lecturers_dict[gene.lecturer_id]
        room = rooms_dict[gene.room_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        start_period = timeslot.start_period
        end_period = start_period + gene.units - 1
        day = timeslot.day

        # Nhóm Ràng Buộc Thời Gian
        # 1. Lớp học kết thúc quá muộn (sau tiết 9)
        if end_period > 9:
            counts["time_violations"] += 1
            violation_details.append(
                f"Vượt giới hạn thời gian: Môn {course.id} kết thúc quá tiết 9 (Tiết {end_period})"
            )

        # 2. Vắt ngang ca: Bắt đầu ở ca sáng (<=5) và kết thúc ở ca chiều (>=6)
        if start_period <= 5 and end_period >= 6:
            counts["time_violations"] += 1
            violation_details.append(
                f"Vắt ngang ca sáng/chiều: Môn {course.id} bị kẹp giữa (Từ {start_period} đến {end_period})"
            )

        # Nhóm Ràng Buộc Cơ Sở Vật Chất (Phòng Học)
        # Sức chứa phòng không đáp ứng đủ tổng sinh viên sẽ được chuyển qua Soft Constraints

        # 2. Loại phòng không đúng yêu cầu của môn học (vd: cần phòng Máy Tính, nhưng xếp vào Lý Thuyết)
        if room.type not in course.roomType:
            counts["room_suitability_violations"] += 1
            violation_details.append(
                f"Loại phòng không phù hợp: Môn {course.id} cần phòng {course.roomType}, nhưng P.{room.id} là phòng {room.type}"
            )

        # Nhóm Ràng Buộc Trùng Lặp (Overlap)
        # 1. Trùng lịch giảng viên trong cùng một ngày
        lecturer_key = (lecturer.id, day)
        if lecturer_key not in lecturer_schedule:
            lecturer_schedule[lecturer_key] = []

        # Kiểm tra xem khoảng thời gian hiện tại có giao nhau với bất kỳ lịch nào của Giảng Viên đã xếp trước đó không.
        for existing_start, existing_end in lecturer_schedule[lecturer_key]:
            if not (end_period < existing_start or start_period > existing_end):
                counts["overlap_violations"] += 1
                violation_details.append(
                    f"Giảng viên {lecturer.id} kẹt lịch vào Ngày {day}"
                )
                break
        lecturer_schedule[lecturer_key].append((start_period, end_period))

        # 2. Trùng lịch phòng học trong cùng một ngày
        room_key = (room.id, day)
        if room_key not in room_schedule:
            room_schedule[room_key] = []

        # Tương tự như GV, kiểm tra xem Phòng này đã được lớp khác sử dụng trùng thời gian không.
        for existing_start, existing_end in room_schedule[room_key]:
            if not (end_period < existing_start or start_period > existing_end):
                counts["overlap_violations"] += 1
                violation_details.append(
                    f"Phòng {room.id} bị trùng lịch vào Ngày {day}"
                )
                break
        room_schedule[room_key].append((start_period, end_period))

    return counts, violation_details


def evaluate_soft_constraints(
    chromosome: Chromosome,
    courses_dict: dict[int, Course],
    lecturers_dict: dict[int, Lecturer],
    rooms_dict: dict[int, Room],
    timeslots_dict: dict[int, TimeSlot],
) -> tuple[dict[str, int], list[str]]:
    """
    Hàm đánh giá và tính điểm các yêu cầu tối ưu (Soft Constraints).

    Hệ thống điểm bao gồm 4 tiêu chí (Chỉ cộng hoặc trừ điểm tích luỹ, không làm chết NST):
    1. Sở thích (Preference): Giảng viên được xếp đúng ngày họ muốn đi dạy (+).
    2. Khối lượng (Workload): Giảng viên không dạy quá 8 tiết/ngày (+), và không dạy liên tục quá 5 tiết.
    3. Thời gian trống (Idle time): Lớp học sát nhau được cộng điểm (+), trống 1 tiết có thể bỏ qua (+), trống quá 2 tiết trở lên bị trừ điểm (-).
    4. Cố định không gian (Movement): Hai ca học liên tiếp diễn ra ở cùng một căn phòng sẽ tiết kiệm thời gian di chuyển (+).
    """
    scores = {
        "preference_score": 0,
        "workload_score": 0,
        "idle_time_score": 0,
        "movement_score": 0,
        "capacity_score": 0,
    }
    details = []

    # Biến lưu trữ lịch của GV để phân tích chuỗi thời gian dạy liên tục
    # Cấu trúc: {(GV_ID, Ngày): [(Tiết BĐ, Tiết KT, Phòng), ...]}
    lecturer_schedule = {}

    for gene in chromosome.genes:
        lecturer = lecturers_dict[gene.lecturer_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        # Kiểm tra Sở thích: Nếu ngày học nằm trong bộ preferenceDay đã khai báo của Giáo viên.
        if timeslot.day in lecturer.preferenceDay:
            scores["preference_score"] += 1
            details.append(
                f"[Preference] Giảng viên {lecturer.id} được xếp đúng ngày mong muốn (Ngày {timeslot.day})"
            )

        # Kiểm tra Sức chứa phòng học (Room Capacity)
        course = courses_dict[gene.course_id]
        room = rooms_dict[gene.room_id]
        if room.capacity < course.studentsCount:
            # Phạt điểm mềm nếu phòng không đủ chỗ
            scores["capacity_score"] -= 1
            details.append(
                f"[Capacity] Phòng quá nhỏ: Môn {course.id} có {course.studentsCount} sv, nhưng P.{room.id} chỉ chứa {room.capacity}"
            )
        else:
            # Thưởng 1 điểm nếu xếp được phòng đủ chỗ
            scores["capacity_score"] += 1

        lecturer_key = (lecturer.id, timeslot.day)
        if lecturer_key not in lecturer_schedule:
            lecturer_schedule[lecturer_key] = []
        lecturer_schedule[lecturer_key].append(
            (
                timeslot.start_period,
                timeslot.start_period + gene.units - 1,
                gene.room_id,
            )
        )

    # Phân tích chuỗi thời gian của riêng mỗi Giảng viên / Ngày
    # Nhằm suy luận ra thời gian rảnh rỗi giữa các ca & tổng block giờ làm của GV.
    for (lecturer_id, day), schedule in lecturer_schedule.items():
        schedule.sort(
            key=lambda x: x[0]
        )  # Sắp xếp timeline theo thứ tự tiết bắt đầu trong ngày

        # Tổng hợp số tiết dạy của Giảng viên này trong ngày
        total_periods = sum([end - start + 1 for start, end, _ in schedule])

        # Tiêu chí Workload: Quá tải hay không? (Limit cứng là 8 tiết/ngày)
        if total_periods <= 8:
            scores["workload_score"] += 1
            details.append(
                f"[Workload] Giảng viên {lecturer_id} có khối lượng giảng dạy hợp lý ({total_periods} tiết) vào ngày {day}"
            )
        else:
            scores["workload_score"] -= 1  # Trừ điểm nếu quá tải
            details.append(
                f"[Workload] Giảng viên {lecturer_id} bị quá tải ({total_periods} tiết) vào ngày {day}"
            )

        consecutive_periods = 0
        last_end = -1
        last_room = -1

        for idx, (start, end, room_id) in enumerate(schedule):
            if idx == 0:
                last_end = end
                last_room = room_id
                consecutive_periods = end - start + 1
                continue

            # Tính khoảng thời gian trống giữa ca học trước đó (last_end) và ca học hiện tại (start)
            gap = start - last_end - 1

            # Tiêu chí Movement & Idle time dựa trên Gap
            if gap == 0:
                # Nếu Gap == 0 (Dạy sát giờ nhau): Cộng liền mạch
                consecutive_periods += end - start + 1

                # Cùng dạy liên tiếp và Cùng cả 1 phòng học => Thưởng thêm điểm Movement.
                if last_room == room_id:
                    scores["movement_score"] += 1
                    details.append(
                        f"[Movement] Giảng viên {lecturer_id} dạy liên tiếp cùng một phòng (Phòng {room_id})"
                    )

            elif gap == 1:
                # Gap == 1 (Nghỉ đúng 1 tiết): Hợp lý, cho phép GV nghỉ giải lao ngắn.
                scores["idle_time_score"] += 1
                details.append(
                    f"[Idle] Giảng viên {lecturer_id} có khoảng nghỉ 1 tiết hợp lý vào ngày {day}"
                )
                consecutive_periods = end - start + 1

            else:
                # Gap >= 2: Tiết rỗng quá lắt nhắt khiến lịch của GV bị kéo dãn và tốn thời gian trống. Phạt trừ.
                scores["idle_time_score"] -= 1
                details.append(
                    f"[Idle] Giảng viên {lecturer_id} có khoảng trống dài {gap} tiết giữa hai ca vào ngày {day}"
                )
                consecutive_periods = end - start + 1

            last_end = end
            last_room = room_id

            # Tiêu chí Workload (Part 2): Ngăn chặn lịch dạy liên tục không ngắt đoạn suốt nhiều giờ.
            # Dạy quá 5 tiết liên tục sẽ bị tính phạt trừ điểm workload.
            if consecutive_periods > 5:
                scores["workload_score"] -= 1
                details.append(
                    f"[Workload] Giảng viên {lecturer_id} dạy liên tục quá 5 tiết"
                )
                consecutive_periods = 0

    return scores, details

def analyze_solution(
    chromosome: Chromosome,
    courses_dict,
    lecturers_dict,
    rooms_dict,
    timeslots_dict,
):
    hard_counts, hard_details = evaluate_hard_constraints(
        chromosome,
        courses_dict,
        lecturers_dict,
        rooms_dict,
        timeslots_dict,
    )

    soft_scores, soft_details = evaluate_soft_constraints(
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
    hard_counts, _ = evaluate_hard_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )
    soft_scores, _ = evaluate_soft_constraints(
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
    hard_counts, _ = evaluate_hard_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )
    soft_scores, _ = evaluate_soft_constraints(
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
    hard_counts, _ = evaluate_hard_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )
    soft_scores, _ = evaluate_soft_constraints(
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
    hard_counts, _ = evaluate_hard_constraints(
        chromosome, courses_dict, lecturers_dict, rooms_dict, timeslots_dict
    )
    soft_scores, _ = evaluate_soft_constraints(
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
