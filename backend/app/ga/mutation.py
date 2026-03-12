import random

def random_reassignment_mutation(gene, lecturers, rooms, timeslots):
    mutate_type = random.choice(["timeslot", "room", "lecturer"])
    
    if mutate_type == "timeslot":
        # Lọc ra các slot hợp lệ (không vượt quá period 9) VÀ khác với slot hiện tại
        valid_slots = [s for s in timeslots if s.start_period + gene.units - 1 <= 9 and s.id != gene.timeslot_id]
        if valid_slots:
            gene.timeslot_id = random.choice(valid_slots).id
            
    elif mutate_type == "room":
        # Lọc ra các phòng khác với phòng hiện tại
        valid_rooms = [r for r in rooms if r.id != gene.room_id]
        if valid_rooms:
            gene.room_id = random.choice(valid_rooms).id
            
    elif mutate_type == "lecturer":
        # Lọc ra các giảng viên khác với giảng viên hiện tại
        valid_lecturers = [l for l in lecturers if l.id != gene.lecturer_id]
        if valid_lecturers:
            gene.lecturer_id = random.choice(valid_lecturers).id

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
    ]
    
    if valid_creeps:
        gene.timeslot_id = random.choice(valid_creeps).id
        return True
    return False

def heuristic_mutation(chromosome, lecturers, rooms, timeslots, courses_dict, lecturers_dict, rooms_dict, timeslots_dict):
    """
    Heuristic Mutation: Nhắm mục tiêu trực tiếp vào các gene đang gây ra lỗi Hard Constraint.
    """
    # 1. Quét tìm các gene lỗi bằng cách giả lập chạy hàm evaluate của Tâm
    # Tuy nhiên, hàm của Tâm trả về tổng số lượng vi phạm chứ không chỉ ra đích danh gene nào.
    # Nên ở đây, ta phải tự mô phỏng một vòng quét nhỏ để tìm các thủ phạm.
    
    faulty_genes = []
    
    lecturer_schedule = {}
    room_schedule = {}

    for gene in chromosome.genes:
        is_faulty = False
        course = courses_dict[gene.course_id]
        room = rooms_dict[gene.room_id]
        timeslot = timeslots_dict[gene.timeslot_id]

        start = timeslot.start_period
        end = start + gene.units - 1
        day = timeslot.day

        # Kiểm tra nhanh các lỗi cá nhân của gene
        if end > 9 or (start <= 5 and end >= 6) or room.capacity < course.studentsCount or room.type not in course.roomType:
            is_faulty = True

        # Kiểm tra trùng lặp GV
        lec_key = (gene.lecturer_id, day)
        if lec_key not in lecturer_schedule:
            lecturer_schedule[lec_key] = []
        for e_start, e_end in lecturer_schedule[lec_key]:
            if not (end < e_start or start > e_end):
                is_faulty = True
                break
        lecturer_schedule[lec_key].append((start, end))

        # Kiểm tra trùng lặp Phòng
        room_key = (gene.room_id, day)
        if room_key not in room_schedule:
            room_schedule[room_key] = []
        for e_start, e_end in room_schedule[room_key]:
            if not (end < e_start or start > e_end):
                is_faulty = True
                break
        room_schedule[room_key].append((start, end))

        if is_faulty:
            faulty_genes.append(gene)

    # 2. Nếu tìm thấy gene lỗi, ép buộc một số gene trong đó phải thay đổi ngẫu nhiên
    mutations_done = 0
    if faulty_genes:
        # Giới hạn số lượng đột biến heuristic để tránh phá nát NST
        num_to_fix = min(len(faulty_genes), max(1, len(chromosome.genes) // 10)) 
        target_genes = random.sample(faulty_genes, num_to_fix)
        
        for gene in target_genes:
            # Dùng random_reassignment để ép gene này nhảy sang vị trí/phòng khác
            random_reassignment_mutation(gene, lecturers, rooms, timeslots)
            mutations_done += 1
            
    return mutations_done


def mutate_population(population, lecturers, rooms, timeslots, method="random", mutation_rate=0.05, **kwargs):
    """
    Cập nhật hàm điều phối để hỗ trợ Heuristic.
    """
    for chromosome in population:
        if method == "swap":
            if random.random() < mutation_rate:
                swap_mutation(chromosome)
                
        elif method == "heuristic":
            # Heuristic áp dụng thẳng trên NST dựa trên rate
            if random.random() < mutation_rate:
                heuristic_mutation(
                    chromosome, lecturers, rooms, timeslots,
                    kwargs.get("courses_dict"),
                    kwargs.get("lecturers_dict"),
                    kwargs.get("rooms_dict"),
                    kwargs.get("timeslots_dict")
                )
        else:
            for gene in chromosome.genes:
                if random.random() < mutation_rate:
                    if method == "random":
                        random_reassignment_mutation(gene, lecturers, rooms, timeslots)
                    elif method == "creep":
                        creep_mutation(gene, timeslots)
    return population