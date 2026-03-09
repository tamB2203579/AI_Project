// Fitness evaluation for timetable chromosomes (duration-aware)
import type { Gene, Lecturer, Course, Room } from '../data/types';
import { MORNING_SLOTS, AFTERNOON_SLOTS } from '../data/types';

export interface FitnessResult {
  score: number;
  penalties: {
    lecturerClash: number;
    roomClash: number;
    capacityViolation: number;
    lecturerOverload: number;
    sessionOverflow: number;
  };
  bonuses: {
    preferredSlots: number;
    evenSpread: number;
  };
}

// Check if a session (starting at slotIndex with given duration) crosses morning/afternoon boundary
function sessionOverflows(slotIndex: number, duration: number): boolean {
  const endSlot = slotIndex + duration - 1;
  // Morning is 0-4, afternoon is 5-8
  const startsInMorning = MORNING_SLOTS.includes(slotIndex);
  const endsInMorning = MORNING_SLOTS.includes(endSlot);
  const startsInAfternoon = AFTERNOON_SLOTS.includes(slotIndex);
  const endsInAfternoon = AFTERNOON_SLOTS.includes(endSlot);

  // Overflow if crosses boundary or goes beyond last slot
  if (endSlot > 8) return true;
  if (startsInMorning && !endsInMorning) return true;
  if (startsInAfternoon && !endsInAfternoon) return true;
  return false;
}

export function evaluateFitness(
  chromosome: Gene[],
  lecturers: Lecturer[],
  courses: Course[],
  rooms: Room[]
): FitnessResult {
  let lecturerClash = 0;
  let roomClash = 0;
  let capacityViolation = 0;
  let lecturerOverload = 0;
  let sessionOverflow = 0;
  let preferredSlots = 0;
  let evenSpread = 0;

  const lecturerMap = new Map(lecturers.map(l => [l.id, l]));
  const courseMap = new Map(courses.map(c => [c.id, c]));
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  // Expand genes into occupied slots (considering duration)
  // Key: "dayIndex-slotIndex" => arrays of lecturerIds and roomIds
  const lecturerOccupied = new Map<string, Set<string>>();
  const roomOccupied = new Map<string, Set<string>>();
  const lecturerHours = new Map<string, number>();

  for (const gene of chromosome) {
    // Check session overflow
    if (sessionOverflows(gene.slotIndex, gene.duration)) {
      sessionOverflow++;
      continue;
    }

    const course = courseMap.get(gene.courseId);
    const room = roomMap.get(gene.roomId);
    const lecturer = lecturerMap.get(gene.lecturerId);

    // Room capacity violation
    if (course && room && course.studentCount > room.capacity) {
      capacityViolation++;
    }

    // Track lecturer hours
    lecturerHours.set(gene.lecturerId, (lecturerHours.get(gene.lecturerId) || 0) + gene.duration);

    // Check each occupied slot for clashes
    for (let s = 0; s < gene.duration; s++) {
      const slotIdx = gene.slotIndex + s;
      const key = `${gene.dayIndex}-${slotIdx}`;

      // Lecturer clash
      const lecKey = `lec-${gene.lecturerId}-${key}`;
      if (!lecturerOccupied.has(lecKey)) {
        lecturerOccupied.set(lecKey, new Set());
      }
      lecturerOccupied.get(lecKey)!.add(gene.courseId);
      if (lecturerOccupied.get(lecKey)!.size > 1) {
        lecturerClash++;
      }

      // Room clash
      const roomKey = `room-${gene.roomId}-${key}`;
      if (!roomOccupied.has(roomKey)) {
        roomOccupied.set(roomKey, new Set());
      }
      roomOccupied.get(roomKey)!.add(gene.courseId);
      if (roomOccupied.get(roomKey)!.size > 1) {
        roomClash++;
      }
    }

    // Preferred day bonus
    if (lecturer && lecturer.preferredDays.includes(gene.dayIndex)) {
      preferredSlots += gene.duration;
    }
  }

  // Lecturer overload check
  for (const [lecId, hours] of lecturerHours) {
    const lecturer = lecturerMap.get(lecId);
    if (lecturer && hours > lecturer.maxHoursPerWeek) {
      lecturerOverload += hours - lecturer.maxHoursPerWeek;
    }
  }

  // Even spread bonus
  const dayDistribution = new Map<string, Set<number>>();
  for (const gene of chromosome) {
    if (!dayDistribution.has(gene.lecturerId)) {
      dayDistribution.set(gene.lecturerId, new Set());
    }
    dayDistribution.get(gene.lecturerId)!.add(gene.dayIndex);
  }
  for (const [, days] of dayDistribution) {
    evenSpread += days.size;
  }

  // Calculate final score
  const HARD_PENALTY = 50;
  const SOFT_PENALTY = 10;
  const OVERFLOW_PENALTY = 100;
  const BASE_SCORE = 1000;

  const score = Math.max(
    0,
    BASE_SCORE
    - lecturerClash * HARD_PENALTY
    - roomClash * HARD_PENALTY
    - capacityViolation * HARD_PENALTY
    - sessionOverflow * OVERFLOW_PENALTY
    - lecturerOverload * SOFT_PENALTY
    + preferredSlots * 2
    + evenSpread * 1
  );

  return {
    score,
    penalties: { lecturerClash, roomClash, capacityViolation, lecturerOverload, sessionOverflow },
    bonuses: { preferredSlots, evenSpread },
  };
}
