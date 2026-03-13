from typing import List, Dict, Any, Optional
from app.data_store import get_collection
from app.schemas import Course, Lecturer, Room, TimeSlot 

from app.schemas.chromosome import Chromosome
from app.ga.initializer import initialize_population
from app.ga.fitness import pick_fitness_method, analyze_solution
from app.ga.selection import pick_selection_method
from app.ga.elitism import get_elites
from app.ga.crossover import crossover_population
from app.ga.mutation import mutate_population
from app.ga.stopping import StoppingCondition

class GAScheduler:
    def __init__(self, request_data: Any):
        self.request = request_data
        self.ga_cfg = request_data.ga
        self.fit_cfg = request_data.fitness
        self.sel_cfg = request_data.selection
        self.cross_cfg = request_data.crossover
        self.mut_cfg = request_data.mutation

        self._load_data()
        
        self.population = []
        self.best_chromosome = None
        self.best_fitness = float('-inf')
        self.stopping = None

    def _load_data(self):
        courses = [Course(**c) for c in get_collection("courses")]
        lecturers = [Lecturer(**l) for l in get_collection("lecturers")]
        rooms = [Room(**r) for r in get_collection("rooms")]
        timeslots = [TimeSlot(**t) for t in get_collection("timeslots")]
        
        self.courses_dict = {c.id: c for c in courses}
        self.lecturers_dict = {l.id: l for l in lecturers}
        self.rooms_dict = {r.id: r for r in rooms}
        self.timeslots_dict = {t.id: t for t in timeslots}

    def initialize(self):
        self.population = initialize_population(
            pop_size=self.ga_cfg.pop_size,
            courses=list(self.courses_dict.values()),
            lecturers=list(self.lecturers_dict.values()),
            rooms=list(self.rooms_dict.values()),
            timeslots=list(self.timeslots_dict.values()),
        )

    def evaluate(self, pop: List[Chromosome]):
        for chrom in pop:
            if self.fit_cfg.method == "penalty":
                pick_fitness_method(
                    chromosome=chrom,
                    courses_dict=self.courses_dict,
                    lecturers_dict=self.lecturers_dict,
                    rooms_dict=self.rooms_dict,
                    timeslots_dict=self.timeslots_dict,
                    method=self.fit_cfg.method,
                    base_score=self.fit_cfg.base_score,
                    hard_penalty=self.fit_cfg.hard_penalty,
                    soft_bonus=self.fit_cfg.soft_bonus,
                )
            elif self.fit_cfg.method == "alpha_beta":
                pick_fitness_method(
                    chromosome=chrom,
                    courses_dict=self.courses_dict,
                    lecturers_dict=self.lecturers_dict,
                    rooms_dict=self.rooms_dict,
                    timeslots_dict=self.timeslots_dict,
                    method=self.fit_cfg.method,
                    alpha=self.fit_cfg.alpha,
                    beta=self.fit_cfg.beta
                )
            else:
                pick_fitness_method(
                    chromosome=chrom,
                    courses_dict=self.courses_dict,
                    lecturers_dict=self.lecturers_dict,
                    rooms_dict=self.rooms_dict,
                    timeslots_dict=self.timeslots_dict,
                    method=self.fit_cfg.method,
                )

    def run(self) -> Dict[str, Any]:
        self.initialize()
        
        self.stopping = StoppingCondition(
            max_generations=self.ga_cfg.max_generations,
            target_fitness=self.ga_cfg.target_fitness,
            max_time_seconds=self.ga_cfg.max_time_seconds,
            max_stall_generations=self.ga_cfg.max_stall_generations,
            base_mutation_rate=self.mut_cfg.rate,
            max_mutation_rate=min(1.0, self.mut_cfg.rate * 5)
        )
        self.stopping.reset()
        
        self.evaluate(self.population)
        
        stop_reason = "Finished max generations"
        generation_run = 0
        
        for generation in range(self.ga_cfg.max_generations):
            generation_run = generation
            
            # Find best in current generation
            current_best = max(self.population, key=lambda ind: ind.fitness)
            current_best_fitness = current_best.fitness
            
            # Scalar fitness for stopping condition
            scalar_fitness = current_best_fitness
            if isinstance(current_best_fitness, tuple):
                scalar_fitness = current_best_fitness[0] * 10000 + current_best_fitness[1]

            # Update overall best
            if self.best_chromosome is None or current_best_fitness > self.best_fitness:
                self.best_fitness = current_best_fitness
                import dataclasses
                self.best_chromosome = Chromosome(genes=[dataclasses.replace(g) for g in current_best.genes], fitness=current_best.fitness)
            
            # Check stopping
            should_stop, stop_reason = self.stopping.check_stop_and_adapt(generation, float(scalar_fitness))
            if should_stop:
                break
                
            # GA Operators
            elites = get_elites(self.population, self.ga_cfg.elitism_rate)
            
            num_parents = self.ga_cfg.pop_size - len(elites)
            parents = pick_selection_method(
                population=self.population,
                num_parents=num_parents,
                method=self.sel_cfg.method,
                tournament_k=self.sel_cfg.tournament_k
            )
            
            offspring = crossover_population(
                population=parents,
                method=self.cross_cfg.method,
                crossover_rate=self.cross_cfg.rate,
                n_points=self.cross_cfg.n_points
            )
            
            offspring = mutate_population(
                population=offspring,
                lecturers=list(self.lecturers_dict.values()),
                rooms=list(self.rooms_dict.values()),
                timeslots=list(self.timeslots_dict.values()),
                method=self.mut_cfg.method,
                mutation_rate=self.stopping.current_mutation_rate,
                courses_dict=self.courses_dict,
                lecturers_dict=self.lecturers_dict,
                rooms_dict=self.rooms_dict,
                timeslots_dict=self.timeslots_dict
            )
            
            self.evaluate(offspring)
            self.population = elites + offspring
        
        analysis = analyze_solution(
            self.best_chromosome,
            self.courses_dict,
            self.lecturers_dict,
            self.rooms_dict,
            self.timeslots_dict
        )

        return {
            "best_chromosome": self.best_chromosome,
            "best_fitness": self.best_fitness,
            "generations_run": generation_run + 1,
            "stop_reason": stop_reason,
            "hard_constraints": analysis["hard_constraints"],
            "soft_constraints": analysis["soft_constraints"],
        }
