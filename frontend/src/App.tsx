/* eslint-disable @typescript-eslint/no-unused-vars */
import { AppProvider, useAppState } from './data/store';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DataManager } from './components/DataManager';
import { GAControls } from './components/GAControls';
import { TimetableGrid } from './components/TimetableGrid';
import './index.css';
import { useEffect } from 'react';
import { mockData } from './mock/mockData';


import { mockLecturers, mockRooms, mockCourses, mockTimeslots } from "./data/sampleData";

function PageRouter() {
  const { state } = useAppState();

  switch (state.currentPage) {
    case 'dashboard':
      return <Dashboard />;
    case 'data':
      return <DataManager />;
    case 'scheduler':
      return <GAControls />;
    case 'timetable':
      return <TimetableGrid />;
    default:
      return <Dashboard />;
  }
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { dispatch } = useAppState();

  useEffect(() => {
    dispatch({ type: "SET_LECTURERS", payload: mockLecturers });
    dispatch({ type: "SET_COURSES", payload: mockCourses });
    dispatch({ type: "SET_ROOMS", payload: mockRooms });
    dispatch({ type: "SET_TIMESLOTS", payload: mockTimeslots }); // ⭐ thêm dòng này
  }, []);

  return (
    <Layout>
      <PageRouter />
    </Layout>
  );
}

export default App;
