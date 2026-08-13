import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GiverDashboard from './pages/GiverDashboard';
import TakerDashboard from './pages/TakerDashboard';
import TaskDetail from './pages/TaskDetail';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/giver"
          element={
            <RequireAuth>
              <GiverDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/taker"
          element={
            <RequireAuth>
              <TakerDashboard />
            </RequireAuth>
          }
        />
        <Route path="/task/:id" element={<TaskDetail />} />
      </Routes>
      <Toast />
    </div>
  );
}

export default App;
