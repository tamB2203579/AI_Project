// Sample data for the timetable management application
import type { Lecturer, Course, Room } from './types';

export const sampleLecturers: Lecturer[] = [
    { id: 'lec-1', name: 'Dr. Sarah Chen', maxHoursPerWeek: 16, preferredDays: [0, 1, 2], color: '#1f5ca9' },
    { id: 'lec-2', name: 'Prof. James Wilson', maxHoursPerWeek: 12, preferredDays: [1, 2, 3], color: '#00afef' },
    { id: 'lec-3', name: 'Dr. Maria Garcia', maxHoursPerWeek: 18, preferredDays: [0, 2, 4], color: '#0ea5e9' },
    { id: 'lec-4', name: 'Dr. David Kim', maxHoursPerWeek: 14, preferredDays: [0, 1, 3], color: '#0284c7' },
    { id: 'lec-5', name: 'Prof. Emily Brown', maxHoursPerWeek: 10, preferredDays: [2, 3, 4], color: '#2563eb' },
    { id: 'lec-6', name: 'Dr. Michael Lee', maxHoursPerWeek: 16, preferredDays: [0, 3, 4], color: '#3b82f6' },
    { id: 'lec-7', name: 'Prof. Anna White', maxHoursPerWeek: 14, preferredDays: [1, 2, 4], color: '#0369a1' },
    { id: 'lec-8', name: 'Dr. Robert Taylor', maxHoursPerWeek: 12, preferredDays: [0, 1, 2], color: '#0c4a6e' },
];

export const sampleCourses: Course[] = [
    // sessionDuration: how many consecutive periods per session (1-3)
    // unitsPerWeek: total periods needed per week (must be divisible by sessionDuration)
    { id: 'crs-1', name: 'Introduction to AI', code: 'CS101', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-1', studentCount: 60, roomType: 'lecture' },
    { id: 'crs-2', name: 'Data Structures', code: 'CS201', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-2', studentCount: 45, roomType: 'lecture' },
    { id: 'crs-3', name: 'Machine Learning Lab', code: 'CS301', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-1', studentCount: 30, roomType: 'lab' },
    { id: 'crs-4', name: 'Database Systems', code: 'CS202', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-3', studentCount: 55, roomType: 'lecture' },
    { id: 'crs-5', name: 'Web Development', code: 'CS203', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-4', studentCount: 25, roomType: 'lab' },
    { id: 'crs-6', name: 'Operating Systems', code: 'CS302', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-5', studentCount: 40, roomType: 'lecture' },
    { id: 'crs-7', name: 'Computer Networks', code: 'CS303', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-6', studentCount: 35, roomType: 'lecture' },
    { id: 'crs-8', name: 'Software Engineering', code: 'CS304', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-7', studentCount: 50, roomType: 'seminar' },
    { id: 'crs-9', name: 'Algorithms', code: 'CS305', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-2', studentCount: 40, roomType: 'lecture' },
    { id: 'crs-10', name: 'Cyber Security', code: 'CS401', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-6', studentCount: 30, roomType: 'lab' },
    { id: 'crs-11', name: 'Cloud Computing', code: 'CS402', unitsPerWeek: 2, sessionDuration: 2, lecturerId: 'lec-8', studentCount: 35, roomType: 'seminar' },
    { id: 'crs-12', name: 'Digital Logic', code: 'CS102', unitsPerWeek: 3, sessionDuration: 3, lecturerId: 'lec-4', studentCount: 65, roomType: 'lecture' },
];

export const sampleRooms: Room[] = [
    { id: 'room-1', name: 'Hall A', capacity: 80, type: 'lecture' },
    { id: 'room-2', name: 'Hall B', capacity: 60, type: 'lecture' },
    { id: 'room-3', name: 'Lab 1', capacity: 35, type: 'lab' },
    { id: 'room-4', name: 'Lab 2', capacity: 30, type: 'lab' },
    { id: 'room-5', name: 'Seminar Room', capacity: 50, type: 'seminar' },
];
