// GA Operators: Selection, Crossover, Mutation (duration-aware)
import type { Chromosome, Gene, Room, Course } from '../data/types';
import { MORNING_SLOTS, AFTERNOON_SLOTS } from '../data/types';

// Get valid starting slots for a session of given duration
function getValidStartSlots(duration: number): number[] {
    const valid: number[] = [];
    // Morning: slots 0-4 (5 slots)
    for (let s = 0; s <= MORNING_SLOTS.length - duration; s++) {
        valid.push(MORNING_SLOTS[s]);
    }
    // Afternoon: slots 5-8 (4 slots)
    for (let s = 0; s <= AFTERNOON_SLOTS.length - duration; s++) {
        valid.push(AFTERNOON_SLOTS[s]);
    }
    return valid;
}

// Tournament selection
export function tournamentSelect(
    population: Chromosome[],
    fitnessScores: number[],
    tournamentSize: number
): Chromosome {
    let bestIdx = Math.floor(Math.random() * population.length);
    for (let i = 1; i < tournamentSize; i++) {
        const idx = Math.floor(Math.random() * population.length);
        if (fitnessScores[idx] > fitnessScores[bestIdx]) {
            bestIdx = idx;
        }
    }
    return population[bestIdx].map(g => ({ ...g }));
}

// Uniform crossover
export function crossover(
    parent1: Chromosome,
    parent2: Chromosome,
    crossoverRate: number
): [Chromosome, Chromosome] {
    if (Math.random() > crossoverRate) {
        return [parent1.map(g => ({ ...g })), parent2.map(g => ({ ...g }))];
    }

    const child1: Chromosome = [];
    const child2: Chromosome = [];

    for (let i = 0; i < parent1.length; i++) {
        if (Math.random() < 0.5) {
            child1.push({ ...parent1[i] });
            child2.push({ ...parent2[i] });
        } else {
            child1.push({ ...parent2[i] });
            child2.push({ ...parent1[i] });
        }
    }

    return [child1, child2];
}

// Mutation: randomly reassign day/slot/room for a gene (respecting duration)
export function mutate(
    chromosome: Chromosome,
    mutationRate: number,
    rooms: Room[],
    courses: Course[]
): Chromosome {
    return chromosome.map(gene => {
        if (Math.random() < mutationRate) {
            const course = courses.find(c => c.id === gene.courseId);
            const compatibleRooms = rooms.filter(r => !course || r.type === course.roomType);
            const availableRooms = compatibleRooms.length > 0 ? compatibleRooms : rooms;
            const newRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];

            // Get valid start slots for this session's duration
            const validSlots = getValidStartSlots(gene.duration);
            const newSlot = validSlots[Math.floor(Math.random() * validSlots.length)];

            return {
                ...gene,
                dayIndex: Math.floor(Math.random() * 5),
                slotIndex: newSlot,
                roomId: newRoom.id,
            };
        }
        return { ...gene };
    });
}

// Generate a random chromosome (one gene per session, not per unit)
export function generateRandomChromosome(
    courses: Course[],
    rooms: Room[]
): Chromosome {
    const genes: Gene[] = [];

    for (const course of courses) {
        const sessionsNeeded = Math.ceil(course.unitsPerWeek / course.sessionDuration);

        for (let s = 0; s < sessionsNeeded; s++) {
            const compatibleRooms = rooms.filter(r => r.type === course.roomType);
            const availableRooms = compatibleRooms.length > 0 ? compatibleRooms : rooms;
            const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];

            const duration = (s === sessionsNeeded - 1)
                ? course.unitsPerWeek - s * course.sessionDuration  // last session may be shorter
                : course.sessionDuration;

            const validSlots = getValidStartSlots(duration);
            const startSlot = validSlots[Math.floor(Math.random() * validSlots.length)];

            genes.push({
                courseId: course.id,
                lecturerId: course.lecturerId,
                roomId: room.id,
                dayIndex: Math.floor(Math.random() * 5),
                slotIndex: startSlot,
                duration,
            });
        }
    }

    return genes;
}
