// Core data types for the timetable management application

export interface Lecturer {
    id: string;
    name: string;
    maxHoursPerWeek: number;
    preferredDays: number[]; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri
    color: string; // For visual display in timetable
}

export interface Course {
    id: string;
    name: string;
    code: string;
    unitsPerWeek: number; // total periods/units needed per week
    sessionDuration: number; // 1, 2, or 3 consecutive periods per session
    lecturerId: string;
    studentCount: number;
    roomType: 'lecture' | 'lab' | 'seminar';
}

export interface Room {
    id: string;
    name: string;
    capacity: number;
    type: 'lecture' | 'lab' | 'seminar';
}

export interface Gene {
    courseId: string;
    lecturerId: string;
    roomId: string;
    dayIndex: number;   // 0-4 (Mon-Fri)
    slotIndex: number;  // 0-8 (9 periods per day)
    duration: number;   // 1-3 consecutive periods
}

export type Chromosome = Gene[];

export interface GAConfig {
    populationSize: number;
    mutationRate: number;
    crossoverRate: number;
    maxGenerations: number;
    tournamentSize: number;
}

export interface GAResult {
    bestChromosome: Chromosome;
    fitnessHistory: number[];
    generations: number;
    bestFitness: number;
}

export interface TimeSlot {
    period: number;
    label: string;
    startTime: string;
    endTime: string;
    session: 'morning' | 'afternoon';
    breakAfter: string; // break duration after this period
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

// 9 periods per day: 5 morning + 4 afternoon (each 50 min)
export const TIME_SLOTS: TimeSlot[] = [
    // Morning (SÁNG)
    { period: 1, label: 'Period 1', startTime: '07:00', endTime: '07:50', session: 'morning', breakAfter: '' },
    { period: 2, label: 'Period 2', startTime: '07:50', endTime: '08:40', session: 'morning', breakAfter: '10 min' },
    { period: 3, label: 'Period 3', startTime: '08:50', endTime: '09:40', session: 'morning', breakAfter: '10 min' },
    { period: 4, label: 'Period 4', startTime: '09:50', endTime: '10:40', session: 'morning', breakAfter: '' },
    { period: 5, label: 'Period 5', startTime: '10:40', endTime: '11:30', session: 'morning', breakAfter: '' },
    // Afternoon (CHIỀU)
    { period: 6, label: 'Period 6', startTime: '13:30', endTime: '14:20', session: 'afternoon', breakAfter: '' },
    { period: 7, label: 'Period 7', startTime: '14:20', endTime: '15:10', session: 'afternoon', breakAfter: '10 min' },
    { period: 8, label: 'Period 8', startTime: '15:20', endTime: '16:10', session: 'afternoon', breakAfter: '' },
    { period: 9, label: 'Period 9', startTime: '16:10', endTime: '17:00', session: 'afternoon', breakAfter: '' },
];

// Morning slots: indices 0-4, Afternoon slots: indices 5-8
export const MORNING_SLOTS = [0, 1, 2, 3, 4];
export const AFTERNOON_SLOTS = [5, 6, 7, 8];
export const TOTAL_SLOTS_PER_DAY = 9;
