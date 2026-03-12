/* eslint-disable @typescript-eslint/no-unused-vars */
// Timetable Grid with click-to-show detail popup
import { useState } from "react";
import { useAppState } from "../data/store";
import { DAYS, TIME_SLOTS, PERIODS_PER_DAY, PERIOD_TIME } from "../data/types";
import { ConflictPanel } from "./ConflictPanel";
import type { Gene } from "../data/types";

interface PopupInfo {
  courseName: string;
  courseCode: string;
  roomName: string;
  lecturerName: string;
  timeRange: string;
  lecturerColor: string;
  x: number;
  y: number;
}

export function TimetableGrid() {
  const { state } = useAppState();
  const [popup, setPopup] = useState<PopupInfo | null>(null);

  // console.log("COURSES:", state.courses);
  // console.log("TIMETABLE:", state.timetable);
  // console.log("TIME Slot:", TIME_SLOTS);

  if (!state.timetable || state.timetable.length === 0) {
    return (
      <div className="timetable-page">
        <div className="page-header">
          <h2 className="page-title">Timetable</h2>
          <p className="page-description">
            Run the GA scheduler first to generate a timetable
          </p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Timetable Generated</h3>
          <p>
            Go to the GA Scheduler page and run the algorithm to generate an
            optimized timetable.
          </p>
        </div>
      </div>
    );
  }

  function getGeneSlot(gene: Gene) {
    const dayIndex = Math.floor((gene.timeslotId - 1) / PERIODS_PER_DAY);
    const slotIndex = (gene.timeslotId - 1) % PERIODS_PER_DAY;

    return {
      dayIndex,
      slotIndex,
      duration: gene.units, // FIX
    };
  }

  // Build lookup maps — timeslotMap uses TIME_SLOTS (now 45 slots, 9/day)
  const timeslotMap = new Map(TIME_SLOTS.map((t) => [t.id, t]));
  const courseMap = new Map(state.courses.map((c) => [c.id, c]));
  const lecturerMap = new Map(state.lecturers.map((l) => [l.id, l]));
  const roomMap = new Map(state.rooms.map((r) => [r.id, r]));

  const conflictCells = new Set<string>();
  const occupiedSlots = new Map<string, string[]>();

  for (const gene of state.timetable) {
    const slot = timeslotMap.get(gene.timeslotId);

    if (!slot) continue;

    const geneSlot = getGeneSlot(gene);

    if (!geneSlot) continue;

    const { dayIndex, slotIndex, duration } = geneSlot;

    for (let s = 0; s < duration; s++) {
      const slotIdx = slotIndex + s;
      if (slotIdx >= PERIODS_PER_DAY) continue;

      const occKey = `${slotIdx}-${dayIndex}`;

      if (!occupiedSlots.has(occKey)) {
        occupiedSlots.set(occKey, []);
      }

      occupiedSlots.get(occKey)!.push(gene.courseId.toString());

      if (occupiedSlots.get(occKey)!.length > 1) {
        conflictCells.add(occKey);
      }
    }
  }

  type CellState =
    | { type: "empty" }
    | { type: "covered" }
    | { type: "start"; gene: Gene; rowSpan: number };
  const dayTracks: CellState[][][] = [];

  for (let d = 0; d < DAYS.length; d++) {
    const dayGenes = state.timetable.filter((g) => {
      const slot = timeslotMap.get(g.timeslotId);
      return slot?.day === d;
    });

    // Sort by start slot, then duration (desc), then courseId to preserve order
    dayGenes.sort((a, b) => {
      const sa = getGeneSlot(a);
      const sb = getGeneSlot(b);

      if (!sa || !sb) return 0;

      if (sa.slotIndex !== sb.slotIndex) return sa.slotIndex - sb.slotIndex;

      if (sb.duration !== sa.duration) return sb.duration - sa.duration;

      return a.courseId - b.courseId;
    });

    const tracks: CellState[][] = [];

    for (const gene of dayGenes) {
      const slot = timeslotMap.get(gene.timeslotId);
      if (!slot) continue;

      let placed = false;

      const slotIndex = slot.start_period - 1;
      // let actualDuration = slot.duration;
      let actualDuration = gene.units;

      if (slotIndex + actualDuration > PERIODS_PER_DAY) {
        actualDuration = PERIODS_PER_DAY - slotIndex;
      }

      // Find first track where these slots are free
      for (let t = 0; t < tracks.length; t++) {
        let free = true;

        for (let i = 0; i < actualDuration; i++) {
          if (tracks[t][slotIndex + i].type !== "empty") {
            free = false;
            break;
          }
        }

        if (free) {
          tracks[t][slotIndex] = {
            type: "start",
            gene,
            rowSpan: actualDuration,
          };

          for (let i = 1; i < actualDuration; i++) {
            tracks[t][slotIndex + i] = { type: "covered" };
          }

          placed = true;
          break;
        }
      }

      if (!placed) {
        const newTrack: CellState[] = Array(PERIODS_PER_DAY)
          .fill(null)
          .map(() => ({ type: "empty" }));

        newTrack[slotIndex] = {
          type: "start",
          gene,
          rowSpan: actualDuration,
        };

        for (let i = 1; i < actualDuration; i++) {
          newTrack[slotIndex + i] = { type: "covered" };
        }

        tracks.push(newTrack);
      }
    }

    if (tracks.length === 0) {
      tracks.push(
        Array(PERIODS_PER_DAY)
          .fill(null)
          .map(() => ({ type: "empty" })),
      );
    }

    dayTracks[d] = tracks;
  }

  const getSessionEndTime = (startSlot: number, duration: number) => {
    const endSlotIdx = Math.min(
      startSlot + duration - 1,
      TIME_SLOTS.length - 1,
    );

    return `P${endSlotIdx + 1}`;
  };

  const handleCardClick = (gene: Gene, e: React.MouseEvent) => {
    e.stopPropagation();

    const course = courseMap.get(gene.courseId);
    const lecturer = lecturerMap.get(gene.lecturerId);
    const room = roomMap.get(gene.roomId);
    const slot = timeslotMap.get(gene.timeslotId);

    if (!slot) return;

    const startIdx = slot.start_period - 1;
    const endIdx = startIdx + gene.units - 1;

    const startTime = PERIOD_TIME[startIdx]?.start;
    const endTime = PERIOD_TIME[endIdx]?.end;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    setPopup({
      courseName: course?.name || "",
      courseCode: `Course ${gene.courseId}`, // thay vì course.code
      roomName: room?.name || "",
      lecturerName: lecturer?.name || "",
      timeRange: `${startTime} - ${endTime}`,
      lecturerColor: "#1f5ca9", // màu mặc định
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const closePopup = () => setPopup(null);

  return (
    <div className="timetable-page" onClick={closePopup}>
      <div className="page-header">
        <h2 className="page-title">Timetable</h2>
        <p className="page-description">
          Generated schedule · Fitness:{" "}
          <strong>{state.bestFitness?.toFixed(2) ?? "-"}</strong> · Generation:{" "}
          {state.currentGeneration}
        </p>
      </div>

      <div className="timetable-wrapper">
        <table className="timetable-table">
          <colgroup>
            <col style={{ width: "40px" }} />
            <col className="period-col" />
            <col className="time-col" />
            {DAYS.map((_, d) =>
              dayTracks[d].map((_, t) => <col key={`col-${d}-${t}`} />),
            )}
          </colgroup>
          <thead>
            <tr>
              <th className="corner-header session-col">Session</th>
              <th className="corner-header period-col">Period</th>
              <th className="corner-header time-col">Time</th>
              {DAYS.map((day, i) => (
                <th
                  key={i}
                  className="day-header-cell"
                  colSpan={dayTracks[i].length}
                >
                  <span className="day-full">{day}</span>
                  <span className="day-short">{day.slice(0, 3)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PERIODS_PER_DAY }).map((_, slotIdx) => {
              const isFirstMorning = slotIdx === 0;
              const isFirstAfternoon = slotIdx === 5;

              return (
                <tr
                  key={slotIdx}
                  className={slotIdx < 5 ? "morning-row" : "afternoon-row"}
                >
                  {isFirstMorning && (
                    <td className="session-cell morning-cell" rowSpan={5}>
                      <span className="session-label">MORNING</span>
                    </td>
                  )}
                  {isFirstAfternoon && (
                    <td className="session-cell afternoon-cell" rowSpan={4}>
                      <span className="session-label">AFTERNOON</span>
                    </td>
                  )}

                  <td className="period-cell">
                    <span className="period-num">{slotIdx + 1}</span>
                  </td>

                  <td className="time-cell">
                    <span className="time-range">Period {slotIdx + 1}</span>
                  </td>

                  {DAYS.map((_, dayIdx) => {
                    return dayTracks[dayIdx].map((track, trackIdx) => {
                      const cellState = track[slotIdx];
                      // const key = `${dayIdx}-${slotIdx}`;
                      const key = `${slotIdx}-${dayIdx}`;
                      const hasConflict = conflictCells.has(key);

                      if (cellState.type === "covered") return null;

                      if (cellState.type === "start") {
                        const { gene, rowSpan } = cellState as Extract<
                          CellState,
                          { type: "start" }
                        >;
                        const course = courseMap.get(gene.courseId);
                        // console.log(`Course:  ${course}`);

                        const lecturer = lecturerMap.get(gene.lecturerId);
                        const room = roomMap.get(gene.roomId);
                        const slot = timeslotMap.get(gene.timeslotId);
                        if (!slot) return null;

                        const startPeriod = slot.start_period;
                        const duration = gene.units;

                        const startTime = `Period ${startPeriod}`;
                        const endTime = `Period ${startPeriod + duration - 1}`;

                        return (
                          <td
                            key={`${dayIdx}-${trackIdx}`}
                            className={`grid-td occupied ${hasConflict ? "conflict" : ""}`}
                            rowSpan={rowSpan}
                          >
                            <div
                              className="cell-content spanning"
                              style={{
                                backgroundColor: "#1f5ca9",
                                borderColor: "#1f5ca9",
                              }}
                              onClick={(e) => handleCardClick(gene, e)}
                            >
                              <span className="cell-name">
                                {course?.name || ""}
                              </span>
                              <span className="cell-room">
                                {room?.name || ""}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={`${dayIdx}-${trackIdx}`}
                          className={`grid-td empty ${hasConflict ? "conflict" : ""}`}
                        ></td>
                      );
                    });
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail popup */}
      {popup && (
        <div className="detail-overlay" onClick={closePopup}>
          <div
            className="detail-popup"
            style={{
              left: `${popup.x}px`,
              top: `${popup.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-row">
              <svg
                className="detail-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke={popup.lecturerColor}
                strokeWidth="2"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span className="detail-text">
                {popup.courseName} - {popup.courseCode}
              </span>
            </div>
            <div className="detail-row">
              <svg
                className="detail-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke={popup.lecturerColor}
                strokeWidth="2"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="detail-text">{popup.roomName}</span>
            </div>
            <div className="detail-row">
              <svg
                className="detail-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke={popup.lecturerColor}
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="detail-text">{popup.lecturerName}</span>
            </div>
            <div className="detail-row">
              <svg
                className="detail-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke={popup.lecturerColor}
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="detail-text">{popup.timeRange}</span>
            </div>
          </div>
        </div>
      )}

      <ConflictPanel />
    </div>
  );
}
