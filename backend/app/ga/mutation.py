import random

def random_reassignment_mutation(gene, rooms, timeslots, courses_dict=None):
    # Only mutate timeslot or room — lecturer is fixed per course
    mutate_type = random.choice(["timeslot", "room"])
    
    if mutate_type == "timeslot":
        valid_slots = [
            s for s in timeslots
            if s.start_period + gene.units - 1 <= 9
            and s.id != gene.timeslot_id
            and not (s.start_period <= 5 and s.start_period + gene.units - 1 >= 6)
        ]
        if valid_slots:
            gene.timeslot_id = random.choice(valid_slots).id
            return True
            
    elif mutate_type == "room":
        valid_rooms = [r for r in rooms if r.id != gene.room_id]
        if courses_dict:
            course = courses_dict[gene.course_id]
            valid_rooms = [r for r in valid_rooms if r.capacity >= course.studentsCount]
            
        if valid_rooms:
            gene.room_id = random.choice(valid_rooms).id
            return True

    return False  # No valid candidate found for the chosen mutate_type

def swap_mutation(chromosome):
    unit_groups = {}
    for i, gene in enumerate(chromosome.genes):
        unit_groups.setdefault(gene.units, []).append(i)
        
    valid_groups = {k: v for k, v in unit_groups.items() if len(v) >= 2}
    if not valid_groups:
        return False

    chosen_units = random.choice(list(valid_groups.keys()))
    idx1, idx2 = random.sample(valid_groups[chosen_units], 2)
    
    gene1, gene2 = chromosome.genes[idx1], chromosome.genes[idx2]
    gene1.timeslot_id, gene2.timeslot_id = gene2.timeslot_id, gene1.timeslot_id
    gene1.room_id, gene2.room_id = gene2.room_id, gene1.room_id
    return True

def creep_mutation(gene, timeslots):
    current_slot = next((s for s in timeslots if s.id == gene.timeslot_id), None)
    if not current_slot:
        return False

    valid_creeps = [
        s for s in timeslots 
        if s.day == current_slot.day 
        and s.start_period + gene.units - 1 <= 9
        and s.id != current_slot.id
        and abs(s.start_period - current_slot.start_period) <= 2
        and not (s.start_period <= 5 and s.start_period + gene.units - 1 >= 6)
    ]
    
    if valid_creeps:
        gene.timeslot_id = random.choice(valid_creeps).id
        return True
    return False

def heuristic_mutation(chromosome, rooms, timeslots, courses_dict, lecturers_dict, rooms_dict, timeslots_dict):
    """
    Heuristic Mutation: Nhắm mục tiêu trực tiếp vào các gene đang gây ra lỗi Hard Constraint.
    Dùng bitmask (giống fitness.py) để phát hiện trùng lặp — tránh lỗi phụ thuộc thứ tự
    của cách quét list-of-tuples cũ (gene đầu tiên trong cặp trùng không bị đánh dấu lỗi).
    """
    faulty_genes = []

    # Bitmask: (lecturer_id, day) -> int,  (room_id, day) -> int
    lecturer_masks = {}
    room_masks = {}

    for gene in chromosome.genes:
        is_faulty = False
        course = courses_dict[gene.course_id]
        room = rooms_dict[gene.room_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        start = timeslot.start_period
        end = start + gene.units - 1
        day = timeslot.day

        # Kiểm tra nhanh các lỗi cá nhân của gene
        if (end > 9
                or (start <= 5 and end >= 6)
                or room.capacity < course.studentsCount
                or room.type not in course.roomType):
            is_faulty = True

        # Bitmask cho tiết học: tiết 1 -> bit 0, tiết 2 -> bit 1, ...
        period_mask = ((1 << gene.units) - 1) << (start - 1)

        # Kiểm tra trùng lặp GV — bitmask phát hiện cả hai gene trong cặp trùng
        lec_key = (gene.lecturer_id, day)
        if lec_key not in lecturer_masks:
            lecturer_masks[lec_key] = 0
        if lecturer_masks[lec_key] & period_mask:
            is_faulty = True
        lecturer_masks[lec_key] |= period_mask

        # Kiểm tra trùng lặp Phòng
        room_key = (gene.room_id, day)
        if room_key not in room_masks:
            room_masks[room_key] = 0
        if room_masks[room_key] & period_mask:
            is_faulty = True
        room_masks[room_key] |= period_mask

        if is_faulty:
            faulty_genes.append(gene)

    # Nếu tìm thấy gene lỗi, ép buộc một số gene trong đó phải thay đổi ngẫu nhiên
    mutations_done = 0
    if faulty_genes:
        # Giới hạn số lượng đột biến heuristic để tránh phá nát NST
        num_to_fix = min(len(faulty_genes), max(1, len(chromosome.genes) // 10))
        target_genes = random.sample(faulty_genes, num_to_fix)

        for gene in target_genes:
            # Dùng random_reassignment để ép gene này nhảy sang vị trí/phòng khác
            random_reassignment_mutation(gene, rooms, timeslots, courses_dict)
            mutations_done += 1

    return mutations_done


def mutate_population(population, lecturers, rooms, timeslots, method="random", mutation_rate=0.05, **kwargs):
    """
    Cập nhật hàm điều phối để hỗ trợ Heuristic.
    Tham số `lecturers` được giữ lại trong signature để tương thích ngược với scheduler.py,
    nhưng không được dùng nữa vì lecturer là cố định theo môn học.
    """
    for chromosome in population:
        if method == "swap":
            if random.random() < mutation_rate:
                swap_mutation(chromosome)

        elif method == "heuristic":
            # Heuristic áp dụng thẳng trên NST dựa trên rate
            if random.random() < mutation_rate:
                heuristic_mutation(
                    chromosome, rooms, timeslots,
                    kwargs.get("courses_dict"),
                    kwargs.get("lecturers_dict"),
                    kwargs.get("rooms_dict"),
                    kwargs.get("timeslots_dict")
                )
        else:
            courses_dict = kwargs.get("courses_dict")
            for gene in chromosome.genes:
                if random.random() < mutation_rate:
                    if method == "random":
                        random_reassignment_mutation(gene, rooms, timeslots, courses_dict)
                    elif method == "creep":
                        creep_mutation(gene, timeslots)
    return population