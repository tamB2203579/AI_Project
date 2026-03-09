// Data Manager: tabbed CRUD for lecturers, courses, rooms
import { useState } from 'react';
import { useAppState } from '../data/store';
import type { Lecturer, Course, Room } from '../data/types';
import { DAYS } from '../data/types';

type Tab = 'lecturers' | 'courses' | 'rooms';

const COLORS = ['#1f5ca9', '#00afef', '#0ea5e9', '#0284c7', '#2563eb', '#3b82f6', '#0369a1', '#0c4a6e', '#0284c7', '#38bdf8'];
const ROOM_TYPES: Array<'lecture' | 'lab' | 'seminar'> = ['lecture', 'lab', 'seminar'];

export function DataManager() {
    const { state } = useAppState();
    const [activeTab, setActiveTab] = useState<Tab>('lecturers');

    const tabs: { id: Tab; label: string; count: number }[] = [
        { id: 'lecturers', label: 'Lecturers', count: state.lecturers.length },
        { id: 'courses', label: 'Courses', count: state.courses.length },
        { id: 'rooms', label: 'Rooms', count: state.rooms.length },
    ];

    return (
        <div className="data-manager">
            <div className="page-header">
                <h2 className="page-title">Data Manager</h2>
                <p className="page-description">Manage lecturers, courses, and rooms</p>
            </div>

            <div className="tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                        <span className="tab-badge">{tab.count}</span>
                    </button>
                ))}
            </div>

            <div className="tab-content">
                {activeTab === 'lecturers' && <LecturersTab />}
                {activeTab === 'courses' && <CoursesTab />}
                {activeTab === 'rooms' && <RoomsTab />}
            </div>
        </div>
    );
}

function LecturersTab() {
    const { state, dispatch } = useAppState();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [maxHours, setMaxHours] = useState(12);
    const [days, setDays] = useState<number[]>([0, 1, 2]);

    const handleAdd = () => {
        if (!name.trim()) return;
        const newLec: Lecturer = {
            id: `lec-${Date.now()}`,
            name: name.trim(),
            maxHoursPerWeek: maxHours,
            preferredDays: days,
            color: COLORS[state.lecturers.length % COLORS.length],
        };
        dispatch({ type: 'ADD_LECTURER', payload: newLec });
        setName('');
        setMaxHours(12);
        setDays([0, 1, 2]);
        setShowForm(false);
    };

    return (
        <div>
            <div className="toolbar">
                <button className="btn-add" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Cancel' : '+ Add Lecturer'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <div className="form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Dr. John Smith"
                            className="input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Max Hours/Week</label>
                        <input
                            type="number"
                            value={maxHours}
                            onChange={e => setMaxHours(Number(e.target.value))}
                            min={1}
                            max={40}
                            className="input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Preferred Days</label>
                        <div className="day-selector">
                            {DAYS.map((day, i) => (
                                <button
                                    key={i}
                                    className={`day-chip ${days.includes(i) ? 'selected' : ''}`}
                                    onClick={() => setDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button className="btn-submit" onClick={handleAdd}>Add Lecturer</button>
                </div>
            )}

            <div className="items-list">
                {state.lecturers.map(lec => (
                    <div key={lec.id} className="item-card">
                        <div className="item-color" style={{ backgroundColor: lec.color }}></div>
                        <div className="item-info">
                            <span className="item-name">{lec.name}</span>
                            <span className="item-detail">
                                Max {lec.maxHoursPerWeek} hrs/week · Prefers: {lec.preferredDays.map(d => DAYS[d].slice(0, 3)).join(', ')}
                            </span>
                        </div>
                        <button className="btn-delete" onClick={() => dispatch({ type: 'REMOVE_LECTURER', payload: lec.id })}>🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CoursesTab() {
    const { state, dispatch } = useAppState();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [units, setUnits] = useState(3);
    const [sessionDuration, setSessionDuration] = useState(3);
    const [lecturerId, setLecturerId] = useState(state.lecturers[0]?.id || '');
    const [students, setStudents] = useState(40);
    const [roomType, setRoomType] = useState<'lecture' | 'lab' | 'seminar'>('lecture');

    const handleAdd = () => {
        if (!name.trim() || !code.trim()) return;
        const newCourse: Course = {
            id: `crs-${Date.now()}`,
            name: name.trim(),
            code: code.trim(),
            unitsPerWeek: units,
            sessionDuration,
            lecturerId,
            studentCount: students,
            roomType,
        };
        dispatch({ type: 'ADD_COURSE', payload: newCourse });
        setName('');
        setCode('');
        setUnits(3);
        setSessionDuration(3);
        setStudents(40);
        setShowForm(false);
    };

    const getLecturerName = (id: string) => state.lecturers.find(l => l.id === id)?.name || 'Unknown';

    return (
        <div>
            <div className="toolbar">
                <button className="btn-add" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Cancel' : '+ Add Course'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Course Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Intro to AI" className="input" />
                        </div>
                        <div className="form-group">
                            <label>Code</label>
                            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CS101" className="input" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Units/Week (total periods)</label>
                            <input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} min={1} max={15} className="input" />
                        </div>
                        <div className="form-group">
                            <label>Session Duration (1-3 periods)</label>
                            <select value={sessionDuration} onChange={e => setSessionDuration(Number(e.target.value))} className="input">
                                <option value={1}>1 period (50 min)</option>
                                <option value={2}>2 periods (100 min)</option>
                                <option value={3}>3 periods (150 min)</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Students</label>
                            <input type="number" value={students} onChange={e => setStudents(Number(e.target.value))} min={1} className="input" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Lecturer</label>
                            <select value={lecturerId} onChange={e => setLecturerId(e.target.value)} className="input">
                                {state.lecturers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Room Type</label>
                            <select value={roomType} onChange={e => setRoomType(e.target.value as 'lecture' | 'lab' | 'seminar')} className="input">
                                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <button className="btn-submit" onClick={handleAdd}>Add Course</button>
                </div>
            )}

            <div className="items-list">
                {state.courses.map(course => {
                    const lec = state.lecturers.find(l => l.id === course.lecturerId);
                    return (
                        <div key={course.id} className="item-card">
                            <div className="item-color" style={{ backgroundColor: lec?.color || '#666' }}></div>
                            <div className="item-info">
                                <span className="item-name">{course.code} — {course.name}</span>
                                <span className="item-detail">
                                    {getLecturerName(course.lecturerId)} · {course.unitsPerWeek} units/wk · {course.sessionDuration}p/session · {course.studentCount} students · {course.roomType}
                                </span>
                            </div>
                            <button className="btn-delete" onClick={() => dispatch({ type: 'REMOVE_COURSE', payload: course.id })}>🗑️</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RoomsTab() {
    const { state, dispatch } = useAppState();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [capacity, setCapacity] = useState(50);
    const [type, setType] = useState<'lecture' | 'lab' | 'seminar'>('lecture');

    const handleAdd = () => {
        if (!name.trim()) return;
        const newRoom: Room = {
            id: `room-${Date.now()}`,
            name: name.trim(),
            capacity,
            type,
        };
        dispatch({ type: 'ADD_ROOM', payload: newRoom });
        setName('');
        setCapacity(50);
        setShowForm(false);
    };

    const typeIcons: Record<string, string> = { lecture: '🏛️', lab: '🔬', seminar: '💬' };

    return (
        <div>
            <div className="toolbar">
                <button className="btn-add" onClick={() => setShowForm(!showForm)}>
                    {showForm ? '✕ Cancel' : '+ Add Room'}
                </button>
            </div>

            {showForm && (
                <div className="form-card">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Room Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hall A" className="input" />
                        </div>
                        <div className="form-group">
                            <label>Capacity</label>
                            <input type="number" value={capacity} onChange={e => setCapacity(Number(e.target.value))} min={1} className="input" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Room Type</label>
                        <select value={type} onChange={e => setType(e.target.value as 'lecture' | 'lab' | 'seminar')} className="input">
                            {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <button className="btn-submit" onClick={handleAdd}>Add Room</button>
                </div>
            )}

            <div className="items-list">
                {state.rooms.map(room => (
                    <div key={room.id} className="item-card">
                        <div className="item-icon">{typeIcons[room.type]}</div>
                        <div className="item-info">
                            <span className="item-name">{room.name}</span>
                            <span className="item-detail">Capacity: {room.capacity} · Type: {room.type}</span>
                        </div>
                        <button className="btn-delete" onClick={() => dispatch({ type: 'REMOVE_ROOM', payload: room.id })}>🗑️</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
