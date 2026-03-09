// Timetable Grid with click-to-show detail popup
import { useState } from 'react';
import { useAppState } from '../data/store';
import { DAYS, TIME_SLOTS } from '../data/types';
import { ConflictPanel } from './ConflictPanel';
import type { Gene } from '../data/types';

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

    if (!state.timetable || state.timetable.length === 0) {
        return (
            <div className="timetable-page">
                <div className="page-header">
                    <h2 className="page-title">Timetable</h2>
                    <p className="page-description">Run the GA scheduler first to generate a timetable</p>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📅</div>
                    <h3>No Timetable Generated</h3>
                    <p>Go to the GA Scheduler page and run the algorithm to generate an optimized timetable.</p>
                </div>
            </div>
        );
    }

    // Build lookup maps
    const courseMap = new Map(state.courses.map(c => [c.id, c]));
    const lecturerMap = new Map(state.lecturers.map(l => [l.id, l]));
    const roomMap = new Map(state.rooms.map(r => [r.id, r]));

    const conflictCells = new Set<string>();
    const occupiedSlots = new Map<string, string[]>();

    for (const gene of state.timetable) {
        for (let s = 0; s < gene.duration; s++) {
            const slotIdx = gene.slotIndex + s;
            if (slotIdx >= TIME_SLOTS.length) continue;
            const occKey = `${slotIdx}-${gene.dayIndex}`;
            if (!occupiedSlots.has(occKey)) occupiedSlots.set(occKey, []);
            occupiedSlots.get(occKey)!.push(gene.courseId);
            if (occupiedSlots.get(occKey)!.length > 1) conflictCells.add(occKey);
        }
    }

    type CellState = { type: 'empty' } | { type: 'covered' } | { type: 'start', gene: Gene, rowSpan: number };
    const dayTracks: CellState[][][] = [];

    for (let d = 0; d < DAYS.length; d++) {
        const dayGenes = state.timetable.filter(g => g.dayIndex === d);

        // Sort by start slot, then duration (desc), then courseId to preserve order
        dayGenes.sort((a, b) => {
            if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
            if (b.duration !== a.duration) return b.duration - a.duration;
            return a.courseId.localeCompare(b.courseId);
        });

        const tracks: CellState[][] = [];

        for (const gene of dayGenes) {
            let placed = false;
            let actualDuration = gene.duration;
            if (gene.slotIndex + actualDuration > TIME_SLOTS.length) {
                actualDuration = TIME_SLOTS.length - gene.slotIndex;
            }

            // Find first track where these slots are free
            for (let t = 0; t < tracks.length; t++) {
                let free = true;
                for (let i = 0; i < actualDuration; i++) {
                    if (tracks[t][gene.slotIndex + i].type !== 'empty') {
                        free = false;
                        break;
                    }
                }
                if (free) {
                    tracks[t][gene.slotIndex] = { type: 'start', gene, rowSpan: actualDuration };
                    for (let i = 1; i < actualDuration; i++) {
                        tracks[t][gene.slotIndex + i] = { type: 'covered' };
                    }
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                // Create new track
                const newTrack: CellState[] = Array(TIME_SLOTS.length).fill(null).map(() => ({ type: 'empty' }));
                newTrack[gene.slotIndex] = { type: 'start', gene, rowSpan: actualDuration };
                for (let i = 1; i < actualDuration; i++) {
                    newTrack[gene.slotIndex + i] = { type: 'covered' };
                }
                tracks.push(newTrack);
            }
        }

        if (tracks.length === 0) {
            tracks.push(Array(TIME_SLOTS.length).fill(null).map(() => ({ type: 'empty' })));
        }

        dayTracks[d] = tracks;
    }

    const getSessionEndTime = (startSlot: number, duration: number) => {
        const endSlotIdx = Math.min(startSlot + duration - 1, TIME_SLOTS.length - 1);
        return TIME_SLOTS[endSlotIdx].endTime;
    };

    const handleCardClick = (gene: Gene, e: React.MouseEvent) => {
        e.stopPropagation();
        const course = courseMap.get(gene.courseId);
        const lecturer = lecturerMap.get(gene.lecturerId);
        const room = roomMap.get(gene.roomId);
        const startTime = TIME_SLOTS[gene.slotIndex].startTime;
        const endTime = getSessionEndTime(gene.slotIndex, gene.duration);

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        setPopup({
            courseName: course?.name || '',
            courseCode: course?.code || '',
            roomName: room?.name || '',
            lecturerName: lecturer?.name || '',
            timeRange: `${startTime} - ${endTime}`,
            lecturerColor: lecturer?.color || '#1f5ca9',
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
                    Generated schedule · Fitness: <strong>{state.bestFitness.toFixed(1)}</strong> · Generation: {state.currentGeneration}
                </p>
            </div>

            <div className="timetable-wrapper">
                <table className="timetable-table">
                    <colgroup>
                        <col style={{ width: '40px' }} />
                        <col className="period-col" />
                        <col className="time-col" />
                        {DAYS.map((_, d) =>
                            dayTracks[d].map((_, t) => (
                                <col key={`col-${d}-${t}`} />
                            ))
                        )}
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="corner-header session-col">Session</th>
                            <th className="corner-header period-col">Period</th>
                            <th className="corner-header time-col">Time</th>
                            {DAYS.map((day, i) => (
                                <th key={i} className="day-header-cell" colSpan={dayTracks[i].length}>
                                    <span className="day-full">{day}</span>
                                    <span className="day-short">{day.slice(0, 3)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map((slot, slotIdx) => {
                            const isFirstMorning = slotIdx === 0;
                            const isFirstAfternoon = slotIdx === 5;

                            return (
                                <tr key={slotIdx} className={slot.session === 'morning' ? 'morning-row' : 'afternoon-row'}>
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
                                        <span className="period-num">{slot.period}</span>
                                    </td>

                                    <td className="time-cell">
                                        <span className="time-range">{slot.startTime} – {slot.endTime}</span>
                                        {slot.breakAfter && <span className="break-badge">{slot.breakAfter}</span>}
                                    </td>

                                    {DAYS.map((_, dayIdx) => {
                                        return dayTracks[dayIdx].map((track, trackIdx) => {
                                            const cellState = track[slotIdx];
                                            const key = `${dayIdx}-${slotIdx}`;
                                            const hasConflict = conflictCells.has(key);

                                            if (cellState.type === 'covered') return null;

                                            if (cellState.type === 'start') {
                                                const { gene, rowSpan } = cellState as Extract<CellState, { type: 'start' }>;
                                                const course = courseMap.get(gene.courseId);
                                                const lecturer = lecturerMap.get(gene.lecturerId);
                                                const room = roomMap.get(gene.roomId);
                                                const startTime = TIME_SLOTS[gene.slotIndex].startTime;
                                                const endTime = getSessionEndTime(gene.slotIndex, gene.duration);

                                                return (
                                                    <td
                                                        key={`${dayIdx}-${trackIdx}`}
                                                        className={`grid-td occupied ${hasConflict ? 'conflict' : ''}`}
                                                        rowSpan={rowSpan}
                                                    >
                                                        <div
                                                            className="cell-content spanning"
                                                            style={{
                                                                backgroundColor: lecturer?.color || '#1f5ca9',
                                                                borderColor: lecturer?.color || '#1f5ca9',
                                                            }}
                                                            onClick={(e) => handleCardClick(gene, e)}
                                                        >
                                                            <span className="cell-name">{course?.name || ''}</span>
                                                            <span className="cell-course">{course?.code || gene.courseId}</span>
                                                            <span className="cell-time">{startTime} - {endTime}</span>
                                                            <span className="cell-room">{room?.name || ''}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={`${dayIdx}-${trackIdx}`} className={`grid-td empty ${hasConflict ? 'conflict' : ''}`}></td>
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
                            <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke={popup.lecturerColor} strokeWidth="2">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            <span className="detail-text">{popup.courseName} - {popup.courseCode}</span>
                        </div>
                        <div className="detail-row">
                            <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke={popup.lecturerColor} strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span className="detail-text">{popup.roomName}</span>
                        </div>
                        <div className="detail-row">
                            <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke={popup.lecturerColor} strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span className="detail-text">{popup.lecturerName}</span>
                        </div>
                        <div className="detail-row">
                            <svg className="detail-icon" viewBox="0 0 24 24" fill="none" stroke={popup.lecturerColor} strokeWidth="2">
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
