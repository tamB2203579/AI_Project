import { AppProvider, useAppState } from './data/store';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DataManager } from './components/DataManager';
import { GAControls } from './components/GAControls';
import { TimetableGrid } from './components/TimetableGrid';
import './index.css';

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
      <Layout>
        <PageRouter />
      </Layout>
    </AppProvider>
  );
}

export default App;
