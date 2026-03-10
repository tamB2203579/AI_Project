// Application state management with React Context + useReducer
import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Lecturer, Course, Room, Chromosome, GAConfig } from './types';
import { sampleLecturers, sampleCourses, sampleRooms } from './sampleData';

export interface AppState {
    lecturers: Lecturer[];
    courses: Course[];
    rooms: Room[];
    timetable: Chromosome | null;
    gaConfig: GAConfig;
    gaStatus: 'idle' | 'running' | 'completed';
    fitnessHistory: number[];
    currentGeneration: number;
    bestFitness: number;
    currentPage: string;
}

type Action =
    | { type: 'SET_LECTURERS'; payload: Lecturer[] }
    | { type: 'SET_COURSES'; payload: Course[] }
    | { type: 'SET_ROOMS'; payload: Room[] }
    | { type: 'SET_TIMETABLE'; payload: Chromosome | null }
    | { type: 'SET_GA_CONFIG'; payload: Partial<GAConfig> }
    | { type: 'SET_GA_STATUS'; payload: 'idle' | 'running' | 'completed' }
    | { type: 'SET_FITNESS_HISTORY'; payload: number[] }
    | { type: 'SET_CURRENT_GENERATION'; payload: number }
    | { type: 'SET_BEST_FITNESS'; payload: number }
    | { type: 'SET_PAGE'; payload: string }
    | { type: 'ADD_LECTURER'; payload: Lecturer }
    | { type: 'REMOVE_LECTURER'; payload: string }
    | { type: 'ADD_COURSE'; payload: Course }
    | { type: 'REMOVE_COURSE'; payload: string }
    | { type: 'ADD_ROOM'; payload: Room }
    | { type: 'REMOVE_ROOM'; payload: string }
    | { type: 'RESET_GA' }
    | { type: 'LOAD_STATE'; payload: Partial<AppState> };

const defaultGAConfig: GAConfig = {
    populationSize: 60,
    mutationRate: 0.05,
    crossoverRate: 0.8,
    maxGenerations: 500,
    tournamentSize: 3,
};

function loadFromStorage(): Partial<AppState> {
    try {
        const saved = localStorage.getItem('timetable-app-state');
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                lecturers: parsed.lecturers || sampleLecturers,
                courses: parsed.courses || sampleCourses,
                rooms: parsed.rooms || sampleRooms,
                gaConfig: parsed.gaConfig || defaultGAConfig,
            };
        }
    } catch { /* ignore */ }
    return {};
}

const savedState = loadFromStorage();

const initialState: AppState = {
    lecturers: savedState.lecturers || sampleLecturers,
    courses: savedState.courses || sampleCourses,
    rooms: savedState.rooms || sampleRooms,
    timetable: null,
    gaConfig: savedState.gaConfig || defaultGAConfig,
    gaStatus: 'idle',
    fitnessHistory: [],
    currentGeneration: 0,
    bestFitness: 0,
    currentPage: 'dashboard',
};

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_LECTURERS':
            return { ...state, lecturers: action.payload };
        case 'SET_COURSES':
            return { ...state, courses: action.payload };
        case 'SET_ROOMS':
            return { ...state, rooms: action.payload };
        case 'SET_TIMETABLE':
            return { ...state, timetable: action.payload };
        case 'SET_GA_CONFIG':
            return { ...state, gaConfig: { ...state.gaConfig, ...action.payload } };
        case 'SET_GA_STATUS':
            return { ...state, gaStatus: action.payload };
        case 'SET_FITNESS_HISTORY':
            return { ...state, fitnessHistory: action.payload };
        case 'SET_CURRENT_GENERATION':
            return { ...state, currentGeneration: action.payload };
        case 'SET_BEST_FITNESS':
            return { ...state, bestFitness: action.payload };
        case 'SET_PAGE':
            return { ...state, currentPage: action.payload };
        case 'ADD_LECTURER':
            return { ...state, lecturers: [...state.lecturers, action.payload] };
        case 'REMOVE_LECTURER':
            return { ...state, lecturers: state.lecturers.filter(l => l.id !== action.payload) };
        case 'ADD_COURSE':
            return { ...state, courses: [...state.courses, action.payload] };
        case 'REMOVE_COURSE':
            return { ...state, courses: state.courses.filter(c => c.id !== action.payload) };
        case 'ADD_ROOM':
            return { ...state, rooms: [...state.rooms, action.payload] };
        case 'REMOVE_ROOM':
            return { ...state, rooms: state.rooms.filter(r => r.id !== action.payload) };
        case 'RESET_GA':
            return { ...state, timetable: null, gaStatus: 'idle', fitnessHistory: [], currentGeneration: 0, bestFitness: 0, gaConfig: defaultGAConfig };
        case 'LOAD_STATE':
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

const AppContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Persist to localStorage on changes
    useEffect(() => {
        const toSave = {
            lecturers: state.lecturers,
            courses: state.courses,
            rooms: state.rooms,
            gaConfig: state.gaConfig,
        };
        localStorage.setItem('timetable-app-state', JSON.stringify(toSave));
    }, [state.lecturers, state.courses, state.rooms, state.gaConfig]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useAppState() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppState must be used within AppProvider');
    return ctx;
}
