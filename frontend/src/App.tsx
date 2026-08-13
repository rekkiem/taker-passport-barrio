import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import GiverDashboard from './pages/GiverDashboard';
import TakerDashboard from './pages/TakerDashboard';
import TaskDetail from './pages/TaskDetail';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/giver" element={<GiverDashboard />} />
        <Route path="/taker" element={<TakerDashboard />} />
        <Route path="/task/:id" element={<TaskDetail />} />
      </Routes>
    </div>
  );
}

export default App;