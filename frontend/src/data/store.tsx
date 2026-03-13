/* eslint-disable react-refresh/only-export-components */
// Application state management with React Context + useReducer
import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  Lecturer,
  Course,
  Room,
  Chromosome,
  TimeSlot,
  HardConstraints,
  SoftConstraints,
} from "./types";

export interface AppState {
  lecturers: Lecturer[];
  courses: Course[];
  rooms: Room[];
  timetable: Chromosome | null;
  gaStatus: "idle" | "running" | "completed";
  fitnessHistory: number[];
  currentGeneration: number;
  bestFitness: number;
  currentPage: string;
  timeslots: TimeSlot[];
  hardConstraints: HardConstraints | null;
  softConstraints: SoftConstraints | null;
}

type Action =
  | { type: "SET_LECTURERS"; payload: Lecturer[] }
  | { type: "SET_COURSES"; payload: Course[] }
  | { type: "SET_ROOMS"; payload: Room[] }
  | { type: "SET_TIMETABLE"; payload: Chromosome | null }
  | { type: "SET_GA_STATUS"; payload: "idle" | "running" | "completed" }
  | { type: "SET_FITNESS_HISTORY"; payload: number[] }
  | { type: "SET_CURRENT_GENERATION"; payload: number }
  | { type: "SET_BEST_FITNESS"; payload: number }
  | { type: "SET_PAGE"; payload: string }
  | { type: "ADD_LECTURER"; payload: Lecturer }
  | { type: "REMOVE_LECTURER"; payload: number }
  | { type: "ADD_COURSE"; payload: Course }
  | { type: "REMOVE_COURSE"; payload: number }
  | { type: "ADD_ROOM"; payload: Room }
  | { type: "REMOVE_ROOM"; payload: number }
  | { type: "RESET_GA" }
  | { type: "LOAD_STATE"; payload: Partial<AppState> }
  | { type: "SET_TIMESLOTS"; payload: TimeSlot[] }
  | { type: "SET_HARD_CONSTRAINTS"; payload: HardConstraints | null }
  | { type: "SET_SOFT_CONSTRAINTS"; payload: SoftConstraints | null };

const initialState: AppState = {
  lecturers: [],
  courses: [],
  rooms: [],
  timetable: null,
  gaStatus: "idle",
  fitnessHistory: [],
  currentGeneration: 0,
  bestFitness: 0,
  currentPage: "dashboard",
  timeslots: [],
  hardConstraints: null,
  softConstraints: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case "SET_LECTURERS":
      return { ...state, lecturers: action.payload };

    case "SET_COURSES":
      return { ...state, courses: action.payload };

    case "SET_ROOMS":
      return { ...state, rooms: action.payload };

    case "SET_TIMESLOTS":
      return { ...state, timeslots: action.payload };

    case "SET_TIMETABLE":
      return { ...state, timetable: action.payload };

    case "SET_GA_STATUS":
      return { ...state, gaStatus: action.payload };

    case "SET_FITNESS_HISTORY":
      return { ...state, fitnessHistory: action.payload };

    case "SET_CURRENT_GENERATION":
      return { ...state, currentGeneration: action.payload };

    case "SET_BEST_FITNESS":
      return { ...state, bestFitness: action.payload };

    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    case "ADD_LECTURER":
      return {
        ...state,
        lecturers: [...state.lecturers, action.payload]
      };

    case "REMOVE_LECTURER":
      return {
        ...state,
        lecturers: state.lecturers.filter(l => l.id !== action.payload)
      };

    case "ADD_COURSE":
      return {
        ...state,
        courses: [...state.courses, action.payload]
      };

    case "REMOVE_COURSE":
      return {
        ...state,
        courses: state.courses.filter(c => c.id !== action.payload)
      };

    case "ADD_ROOM":
      return {
        ...state,
        rooms: [...state.rooms, action.payload]
      };

    case "REMOVE_ROOM":
      return {
        ...state,
        rooms: state.rooms.filter(r => r.id !== action.payload)
      };

    case "RESET_GA":
      return {
        ...state,
        timetable: null,
        gaStatus: "idle",
        fitnessHistory: [],
        currentGeneration: 0,
        bestFitness: 0,
        hardConstraints: null,
        softConstraints: null,
      };

    case "SET_HARD_CONSTRAINTS":
      return { ...state, hardConstraints: action.payload };

    case "SET_SOFT_CONSTRAINTS":
      return { ...state, softConstraints: action.payload };

    case "LOAD_STATE":
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

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
