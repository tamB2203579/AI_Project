/* eslint-disable @typescript-eslint/no-explicit-any */
// // Core data types for the timetable management application

// export interface Lecturer {
//     id: string;
//     name: string;
//     maxHoursPerWeek: number;
//     preferredDays: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
//     color: string; // For visual display in timetable
// }

// export interface Course {
//     id: string;
//     name: string;
//     code: string;
//     unitsPerWeek: number; // total periods/units needed per week
//     sessionDuration: number; // 1, 2, or 3 consecutive periods per session
//     lecturerId: string;
//     studentCount: number;
//     roomType: 'lecture' | 'lab' | 'seminar';
// }

// export interface Room {
//     id: string;
//     name: string;
//     capacity: number;
//     type: 'lecture' | 'lab' | 'seminar';
// }

// export interface Gene {
//     courseId: string;
//     lecturerId: string;
//     roomId: string;
//     dayIndex: number;   // 0-4 (Mon-Fri)
//     slotIndex: number;  // 0-8 (9 periods per day)
//     duration: number;   // 1-3 consecutive periods
// }

// export type Chromosome = Gene[];

// export interface GAConfig {
//     populationSize: number;
//     mutationRate: number;
//     crossoverRate: number;
//     maxGenerations: number;
//     tournamentSize: number;
// }

// export interface GAResult {
//     bestChromosome: Chromosome;
//     fitnessHistory: number[];
//     generations: number;
//     bestFitness: number;
// }

// export interface TimeSlot {
//     period: number;
//     label: string;
//     startTime: string;
//     endTime: string;
//     session: 'morning' | 'afternoon';
//     breakAfter: string; // break duration after this period
// }

// export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

// // 9 periods per day: 5 morning + 4 afternoon (each 50 min)
// export const TIME_SLOTS: TimeSlot[] = [
//     // Morning (SÁNG)
//     { period: 1, label: 'Period 1', startTime: '07:00', endTime: '07:50', session: 'morning', breakAfter: '' },
//     { period: 2, label: 'Period 2', startTime: '07:50', endTime: '08:40', session: 'morning', breakAfter: '10 min' },
//     { period: 3, label: 'Period 3', startTime: '08:50', endTime: '09:40', session: 'morning', breakAfter: '10 min' },
//     { period: 4, label: 'Period 4', startTime: '09:50', endTime: '10:40', session: 'morning', breakAfter: '' },
//     { period: 5, label: 'Period 5', startTime: '10:40', endTime: '11:30', session: 'morning', breakAfter: '' },
//     // Afternoon (CHIỀU)
//     { period: 6, label: 'Period 6', startTime: '13:30', endTime: '14:20', session: 'afternoon', breakAfter: '' },
//     { period: 7, label: 'Period 7', startTime: '14:20', endTime: '15:10', session: 'afternoon', breakAfter: '10 min' },
//     { period: 8, label: 'Period 8', startTime: '15:20', endTime: '16:10', session: 'afternoon', breakAfter: '' },
//     { period: 9, label: 'Period 9', startTime: '16:10', endTime: '17:00', session: 'afternoon', breakAfter: '' },
// ];

// // Morning slots: indices 0-4, Afternoon slots: indices 5-8
// export const MORNING_SLOTS = [0, 1, 2, 3, 4];
// export const AFTERNOON_SLOTS = [5, 6, 7, 8];
// export const TOTAL_SLOTS_PER_DAY = 9;


// Core data types for the timetable management application

export interface Lecturer {
    id: number;
    name: string;
    maxUnitPerWeek: number;
    preferenceDay: number[]; // 1=Mon ... 5=Fri
}

export interface Course {
    id: number;
    name: string;
    unitsPerWeek: number;
    studentsCount: number;
    roomType: string[]; // ["Lecture","Lab"]
    lecturerId: number;
    maxUnitsPerDay: number;
}

export interface Room {
    id: number;
    name: string;
    capacity: number;
    type: string; // "Lecture" | "Lab"
}

export interface TimeSlot {
    id: number;
    day: number;          // 1-5
    start_period: number; // starting period
    duration: number;     // number of periods
}

export interface Gene {
    courseId: number;
    lecturerId: number;
    roomId: number;
    timeslotId: number;
    units: number
}

export type Chromosome = Gene[];

export type SelectionMethod =
  | "tournament"
  | "roulette"
  | "rank";

export type CrossoverMethod =
  | "single"
  | "two-point"
  | "multipoint"
  | "uniform";

export type MutationMethod =
  | "swap"
  | "scramble"
  | "random";

export type FitnessMethod =
  | "alpha-beta"
  | "penalty";

export interface GAConfig {
  populationSize: number
  maxGenerations: number

  selectionMethod: SelectionMethod
  tournamentK: number

  crossoverMethod: CrossoverMethod
  crossoverRate: number
  multipointN: number

  mutationMethod: MutationMethod
  mutationRate: number

  elitismRate: number

  fitnessMethod: FitnessMethod

  alpha: number
  beta: number

  baseScore: number
  hardPenalty: number
  softReward: number
}

export interface GAResult {
    schedule: any;
    bestChromosome: Chromosome;
    fitnessHistory: number[];
    generations: number;
    bestFitness: number;
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// 9 periods/day × 5 days = 45 slots  →  backend timeslot IDs go up to 45
// Periods 1-5 = Morning, 6-9 = Afternoon
export const PERIODS_PER_DAY = 9;

export const TIME_SLOTS: TimeSlot[] = Array.from({ length: 5 }, (_, dayIdx) =>
  Array.from({ length: PERIODS_PER_DAY }, (_, periodIdx) => ({
    id: dayIdx * PERIODS_PER_DAY + periodIdx + 1,
    day: dayIdx,                  // 0=Mon … 4=Fri
    start_period: periodIdx + 1,  // 1–9
    duration: 1,
  }))
).flat();

export const PERIOD_TIME = [
  { start: "07:00", end: "07:50" },
  { start: "07:50", end: "08:40" },
  { start: "08:50", end: "09:40" },
  { start: "09:50", end: "10:40" },
  { start: "10:40", end: "11:30" },
  { start: "13:30", end: "14:20" },
  { start: "14:20", end: "15:10" },
  { start: "15:20", end: "16:10" },
  { start: "16:10", end: "17:00" },
];