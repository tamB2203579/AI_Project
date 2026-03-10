import type { Lecturer, Course, Room, TimeSlot } from "./types";

export const mockLecturers: Lecturer[] = [
  { id: 1, name: "Dr. John Smith", maxUnitPerWeek: 12, preferenceDay: [0,1,2] },
  { id: 2, name: "Dr. Alice Brown", maxUnitPerWeek: 10, preferenceDay: [1,2,3] },
  { id: 3, name: "Dr. Michael Lee", maxUnitPerWeek: 14, preferenceDay: [0,3,4] }
];

export const mockRooms: Room[] = [
  { id: 1, name: "Lecture Hall A", capacity: 80, type: "Lecture" },
  { id: 2, name: "Computer Lab 1", capacity: 40, type: "Lab" },
  { id: 3, name: "Lecture Room B", capacity: 60, type: "Lecture" }
];

export const mockCourses: Course[] = [
  {
    id: 1,
    name: "Introduction to AI",
    unitsPerWeek: 3,
    studentsCount: 50,
    roomType: ["Lecture"],
    lecturerId: 1,
    maxUnitsPerDay: 3
  },
  {
    id: 2,
    name: "Machine Learning",
    unitsPerWeek: 3,
    studentsCount: 40,
    roomType: ["Lecture","Lab"],
    lecturerId: 2,
    maxUnitsPerDay: 2
  },
  {
    id: 3,
    name: "Database Systems",
    unitsPerWeek: 3,
    studentsCount: 45,
    roomType: ["Lecture"],
    lecturerId: 3,
    maxUnitsPerDay: 3
  }
];

export const mockTimeslots: TimeSlot[] = [
  { id: 1, day: 1, start_period: 1, duration: 1 },
  { id: 2, day: 1, start_period: 2, duration: 1 },
  { id: 3, day: 1, start_period: 3, duration: 1 },
  { id: 4, day: 2, start_period: 1, duration: 1 },
  { id: 5, day: 2, start_period: 2, duration: 1 },
  { id: 6, day: 2, start_period: 3, duration: 1 },
  { id: 7, day: 3, start_period: 1, duration: 1 },
  { id: 8, day: 3, start_period: 2, duration: 1 },
  { id: 9, day: 4, start_period: 1, duration: 1 }
];

