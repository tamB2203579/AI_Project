import random
from app.schemas.chromosome import Chromosome


def roulette_wheel_selection(
    population: list[Chromosome], num_parents: int
) -> list[Chromosome]:
    if not population:
        return []

    def get_scalar(fitness):
        if isinstance(fitness, tuple):
            return fitness[0] * 1000 + fitness[1]
        return fitness
    
    scalars = [get_scalar(ind.fitness) for ind in population]
    min_fitness = min(scalars)

    # Dịch chuyển fitness để đảm bảo tất cả fitness >= 0 (nếu có giá trị âm)
    # Thêm một lượng nhỏ (epsilon) để đảm bảo cá thể tệ nhất vẫn có xác suất > 0
    shift = 0 if min_fitness >= 0 else abs(min_fitness)
    adjusted_fitnesses = [f + shift + 1e-6 for f in scalars]

    total_fitness = sum(adjusted_fitnesses)
    probabilities = [f / total_fitness for f in adjusted_fitnesses]

    # random.choices thực hiện lấy mẫu có hoàn lại với trọng số xác suất tương ứng
    selected_parents = random.choices(population, weights=probabilities, k=num_parents)
    return selected_parents


def tournament_selection(
    population: list[Chromosome], num_parents: int, k: int = 3
) -> list[Chromosome]:
    if not population:
        return []

    selected_parents = []
    # Đảm bảo k không vượt quá kích thước quần thể
    k = min(k, len(population))

    for _ in range(num_parents):
        tournament = random.sample(population, k=k)
        best = max(tournament, key=lambda ind: ind.fitness)
        selected_parents.append(best)

    return selected_parents


def rank_selection(population: list[Chromosome], num_parents: int) -> list[Chromosome]:
    if not population:
        return []

    # Sắp xếp quần thể theo fitness tăng dần (Rank 1 = kém nhất, Rank N = tốt nhất)
    sorted_population = sorted(population, key=lambda ind: ind.fitness)
    n = len(sorted_population)

    # Công thức tổng các hạng: n * (n + 1) / 2
    total_ranks = n * (n + 1) / 2

    # Tính xác suất: cá thể hạng i (i=1..n) có xác suất chọn = i / total_ranks
    probabilities = [(i + 1) / total_ranks for i in range(n)]

    selected_parents = random.choices(
        sorted_population, weights=probabilities, k=num_parents
    )
    return selected_parents


def elimination_selection(
    population: list[Chromosome], num_parents: int
) -> list[Chromosome]:
    if not population:
        return []

    # Sắp xếp giảm dần theo fitness và lấy các cá thể tốt nhất
    sorted_population = sorted(population, key=lambda ind: ind.fitness, reverse=True)
    return sorted_population[:num_parents]


SELECTION_METHODS = {
    "roulette": roulette_wheel_selection,
    "tournament": tournament_selection,
    "rank": rank_selection,
    "elimination": elimination_selection,
}


def pick_selection_method(
    population: list[Chromosome],
    num_parents: int,
    method: str = "roulette",
    tournament_k: int = 3,
) -> list[Chromosome]:
    if method == "tournament":
        return tournament_selection(population, num_parents, k=tournament_k)

    select_fn = SELECTION_METHODS.get(method, rank_selection)
    return select_fn(population, num_parents)
