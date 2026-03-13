// Data Manager: tabbed CRUD for lecturers, courses, rooms
import { useState } from "react";
import { useAppState } from "../data/store";
import type { Lecturer, Course, Room } from "../data/types";
import { DAYS, ROOM_TYPES } from "../data/types";
import { lecturerApi } from "../api/lecturerApi";
import { courseApi } from "../api/courseApi";
import { roomApi } from "../api/roomApi";

type Tab = "lecturers" | "courses" | "rooms";

export function DataManager() {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<Tab>("lecturers");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "lecturers", label: "Lecturers", count: state.lecturers.length },
    { id: "courses", label: "Courses", count: state.courses.length },
    { id: "rooms", label: "Rooms", count: state.rooms.length },
  ];

  return (
    <div className="data-manager">
      <div className="page-header">
        <h2 className="page-title">Data Manager</h2>
        <p className="page-description">Manage lecturers, courses, and rooms</p>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-badge">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === "lecturers" && <LecturersTab />}
        {activeTab === "courses" && <CoursesTab />}
        {activeTab === "rooms" && <RoomsTab />}
      </div>
    </div>
  );
}

// ── Lecturers ──────────────────────────────────────────────

function LecturersTab() {
  const { state, dispatch } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [maxUnits, setMaxUnits] = useState(12);
  // Backend uses 1-indexed days: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  const [days, setDays] = useState<number[]>([1, 2, 3]);

  const handleAdd = async () => {
    if (!name.trim()) return;

    const newLec: Lecturer = {
      id: Date.now(),
      name: name.trim(),
      maxUnitPerWeek: maxUnits,
      preferenceDay: days,
    };

    try {
      const res = await lecturerApi.create(newLec);
      dispatch({ type: "ADD_LECTURER", payload: res.data });
      setName("");
      setMaxUnits(12);
      setDays([1, 2, 3]);
      setShowForm(false);
    } catch (err) {
      console.error("Create lecturer error", err);
    }
  };

  const handleDelete = async (id: number) => {
    await lecturerApi.delete(id);
    dispatch({ type: "REMOVE_LECTURER", payload: id });
  };

  const toggleDay = (dayNum: number) => {
    setDays((prev) =>
      prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
    );
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn-add" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Lecturer"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PhD. Nguyen Van A"
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Max Units/Week</label>
            <input
              type="number"
              value={maxUnits}
              onChange={(e) => setMaxUnits(Number(e.target.value))}
              min={1}
              max={40}
              className="input"
            />
          </div>
          <div className="form-group">
            <label>Preferred Days</label>
            <div className="day-selector">
              {DAYS.map((day, i) => {
                const dayNum = i + 1; // 1-indexed to match backend
                return (
                  <button
                    key={dayNum}
                    className={`day-chip ${days.includes(dayNum) ? "selected" : ""}`}
                    onClick={() => toggleDay(dayNum)}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <button className="btn-submit" onClick={handleAdd}>
            Add Lecturer
          </button>
        </div>
      )}

      <div className="items-list">
        {(state.lecturers ?? []).map((lec) => (
          <div key={lec.id} className="item-card">
            <div className="item-info">
              <span className="item-name">{lec.name}</span>
              <span className="item-detail">
                Max {lec.maxUnitPerWeek} units/week · Prefers:{" "}
                {lec.preferenceDay
                  .map((d: number) => DAYS[d - 1]?.slice(0, 3))
                  .join(", ")}
              </span>
            </div>
            <button className="btn-delete" onClick={() => handleDelete(lec.id)}>
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Courses ────────────────────────────────────────────────

function CoursesTab() {
  const { state, dispatch } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unitsPerWeek, setUnitsPerWeek] = useState(9);
  const [maxUnitsPerDay, setMaxUnitsPerDay] = useState(3);
  const [lecturerId, setLecturerId] = useState<number>(
    state.lecturers[0]?.id || 0
  );
  const [students, setStudents] = useState(40);
  // Backend supports multiple room types as an array: ["Lecture"], ["Lecture","Lab"]
  const [roomTypes, setRoomTypes] = useState<string[]>(["Lecture"]);

  const handleAdd = async () => {
    if (!name.trim()) return;

    const newCourse: Course = {
      id: Date.now(),
      name: name.trim(),
      unitsPerWeek,
      studentsCount: students,
      roomType: roomTypes,
      lecturerId,
      maxUnitsPerDay,
    };

    try {
      const res = await courseApi.create(newCourse);
      dispatch({ type: "ADD_COURSE", payload: res.data });
      setName("");
      setUnitsPerWeek(9);
      setStudents(40);
      setMaxUnitsPerDay(3);
      setRoomTypes(["Lecture"]);
      setShowForm(false);
    } catch (err) {
      console.error("Create course error", err);
    }
  };

  const handleDelete = async (id: number) => {
    await courseApi.delete(id);
    dispatch({ type: "REMOVE_COURSE", payload: id });
  };

  const toggleRoomType = (t: string) => {
    setRoomTypes((prev) =>
      prev.includes(t) ? prev.filter((r) => r !== t) : [...prev, t]
    );
  };

  const getLecturerName = (id: number) =>
    state.lecturers.find((l) => l.id === id)?.name || "Unknown";

  return (
    <div>
      <div className="toolbar">
        <button className="btn-add" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Course"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-group">
            <label>Course Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures"
              className="input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Units/Week (total periods)</label>
              <input
                type="number"
                value={unitsPerWeek}
                onChange={(e) => setUnitsPerWeek(Number(e.target.value))}
                min={1}
                max={20}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Max Units/Day (session size)</label>
              <input
                type="number"
                value={maxUnitsPerDay}
                onChange={(e) => setMaxUnitsPerDay(Number(e.target.value))}
                min={1}
                max={5}
                className="input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Students</label>
              <input
                type="number"
                value={students}
                onChange={(e) => setStudents(Number(e.target.value))}
                min={1}
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Lecturer</label>
              <select
                value={lecturerId}
                onChange={(e) => setLecturerId(Number(e.target.value))}
                className="input"
              >
                {state.lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Room Types (select all that apply)</label>
            <div className="day-selector">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  className={`day-chip ${roomTypes.includes(t) ? "selected" : ""}`}
                  onClick={() => toggleRoomType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-submit" onClick={handleAdd}>
            Add Course
          </button>
        </div>
      )}

      <div className="items-list">
        {state.courses.map((course) => (
          <div key={course.id} className="item-card">
            <div className="item-color" style={{ backgroundColor: "#666" }}></div>
            <div className="item-info">
              <span className="item-name">{course.name}</span>
              <span className="item-detail">
                {getLecturerName(course.lecturerId)} · {course.unitsPerWeek}{" "}
                units/wk · {course.maxUnitsPerDay}p/session ·{" "}
                {course.studentsCount} students · {course.roomType.join(", ")}
              </span>
            </div>
            <button
              className="btn-delete"
              onClick={() => handleDelete(course.id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rooms ──────────────────────────────────────────────────

function RoomsTab() {
  const { state, dispatch } = useAppState();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(50);
  const [type, setType] = useState("Lecture"); // matches backend casing

  const handleAdd = async () => {
    if (!name.trim()) return;

    const newRoom: Room = {
      id: Date.now(),
      name: name.trim(),
      capacity,
      type,
    };

    try {
      const res = await roomApi.create(newRoom);
      dispatch({ type: "ADD_ROOM", payload: res.data });
      setName("");
      setCapacity(50);
      setType("Lecture");
      setShowForm(false);
    } catch (err) {
      console.error("Create room error", err);
    }
  };

  const handleDelete = async (id: number) => {
    await roomApi.delete(id);
    dispatch({ type: "REMOVE_ROOM", payload: id });
  };

  const typeIcons: Record<string, string> = {
    Lecture: "🏛️",
    Lab: "🔬",
  };

  return (
    <div>
      <div className="toolbar">
        <button className="btn-add" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ Add Room"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-row">
            <div className="form-group">
              <label>Room Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 101/C1"
                className="input"
              />
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                min={1}
                className="input"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Room Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input"
            >
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-submit" onClick={handleAdd}>
            Add Room
          </button>
        </div>
      )}

      <div className="items-list">
        {state.rooms.map((room) => (
          <div key={room.id} className="item-card">
            <div className="item-icon">{typeIcons[room.type] || "🏠"}</div>
            <div className="item-info">
              <span className="item-name">{room.name}</span>
              <span className="item-detail">
                Capacity: {room.capacity} · Type: {room.type}
              </span>
            </div>
            <button
              className="btn-delete"
              onClick={() => handleDelete(room.id)}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
