// Main Genetic Algorithm runner
import type { Chromosome, GAConfig, GAResult, Lecturer, Course, Room } from '../data/types';
import { evaluateFitness } from './fitness';
import { tournamentSelect, crossover, mutate, generateRandomChromosome } from './operators';

export interface GACallbacks {
    onGeneration?: (gen: number, bestFitness: number, bestChromosome: Chromosome) => void;
    shouldStop?: () => boolean;
}

export function runGA(
    lecturers: Lecturer[],
    courses: Course[],
    rooms: Room[],
    config: GAConfig,
    callbacks?: GACallbacks
): GAResult {
    const { populationSize, mutationRate, crossoverRate, maxGenerations, tournamentSize } = config;

    // Initialize population
    let population: Chromosome[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(generateRandomChromosome(courses, rooms));
    }

    const fitnessHistory: number[] = [];
    let bestChromosome = population[0];
    let bestFitness = -Infinity;

    for (let gen = 0; gen < maxGenerations; gen++) {
        // Check if should stop
        if (callbacks?.shouldStop?.()) break;

        // Evaluate fitness for all chromosomes
        const fitnessScores = population.map(
            chrom => evaluateFitness(chrom, lecturers, courses, rooms).score
        );

        // Track best
        for (let i = 0; i < population.length; i++) {
            if (fitnessScores[i] > bestFitness) {
                bestFitness = fitnessScores[i];
                bestChromosome = population[i].map(g => ({ ...g }));
            }
        }

        fitnessHistory.push(bestFitness);

        // Callback
        callbacks?.onGeneration?.(gen, bestFitness, bestChromosome);

        // Check for perfect score (no penalties)
        if (bestFitness >= 1000) break;

        const nextPopulation: Chromosome[] = [];

        // Elitism: keep the best chromosome
        const bestIdx = fitnessScores.indexOf(Math.max(...fitnessScores));
        nextPopulation.push(population[bestIdx].map(g => ({ ...g })));

        // Fill rest of population
        while (nextPopulation.length < populationSize) {
            const parent1 = tournamentSelect(population, fitnessScores, tournamentSize);
            const parent2 = tournamentSelect(population, fitnessScores, tournamentSize);

            let [child1, child2] = crossover(parent1, parent2, crossoverRate);
            child1 = mutate(child1, mutationRate, rooms, courses);
            child2 = mutate(child2, mutationRate, rooms, courses);

            nextPopulation.push(child1);
            if (nextPopulation.length < populationSize) {
                nextPopulation.push(child2);
            }
        }

        population = nextPopulation;
    }

    return {
        bestChromosome,
        fitnessHistory,
        generations: fitnessHistory.length,
        bestFitness,
    };
}

// Async version that yields to the UI between generations
export async function runGAAsync(
    lecturers: Lecturer[],
    courses: Course[],
    rooms: Room[],
    config: GAConfig,
    callbacks?: GACallbacks
): Promise<GAResult> {
    const { populationSize, mutationRate, crossoverRate, maxGenerations, tournamentSize } = config;

    let population: Chromosome[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(generateRandomChromosome(courses, rooms));
    }

    const fitnessHistory: number[] = [];
    let bestChromosome = population[0];
    let bestFitness = -Infinity;

    for (let gen = 0; gen < maxGenerations; gen++) {
        if (callbacks?.shouldStop?.()) break;

        const fitnessScores = population.map(
            chrom => evaluateFitness(chrom, lecturers, courses, rooms).score
        );

        for (let i = 0; i < population.length; i++) {
            if (fitnessScores[i] > bestFitness) {
                bestFitness = fitnessScores[i];
                bestChromosome = population[i].map(g => ({ ...g }));
            }
        }

        fitnessHistory.push(bestFitness);
        callbacks?.onGeneration?.(gen, bestFitness, bestChromosome);

        if (bestFitness >= 1000) break;

        const nextPopulation: Chromosome[] = [];
        const bestIdx = fitnessScores.indexOf(Math.max(...fitnessScores));
        nextPopulation.push(population[bestIdx].map(g => ({ ...g })));

        while (nextPopulation.length < populationSize) {
            const parent1 = tournamentSelect(population, fitnessScores, tournamentSize);
            const parent2 = tournamentSelect(population, fitnessScores, tournamentSize);

            let [child1, child2] = crossover(parent1, parent2, crossoverRate);
            child1 = mutate(child1, mutationRate, rooms, courses);
            child2 = mutate(child2, mutationRate, rooms, courses);

            nextPopulation.push(child1);
            if (nextPopulation.length < populationSize) {
                nextPopulation.push(child2);
            }
        }

        population = nextPopulation;

        // Yield to UI every 10 generations
        if (gen % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    return {
        bestChromosome,
        fitnessHistory,
        generations: fitnessHistory.length,
        bestFitness,
    };
}
