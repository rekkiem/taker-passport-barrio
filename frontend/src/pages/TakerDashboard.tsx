import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, DollarSign } from 'lucide-react';
import PassportView from '../components/PassportView';
import { API_URL } from '../config/api';

export default function TakerDashboard() {
  const [tasks, setTasks] = useState([]);
  const [passport, setPassport] = useState<any>(null);
  const [filter, setFilter] = useState('Providencia');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAvailableTasks();
    if (user.id) fetchPassport();
  }, [filter]);

  const fetchAvailableTasks = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/tasks?status=open&location=${filter}`, 
      { headers: { Authorization: `Bearer ${token}` } });
    setTasks(data);
  };

  const fetchPassport = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/passport/${user.id}`, 
      { headers: { Authorization: `Bearer ${token}` } });
    setPassport(data);
  };

  const handleApply = async (taskId: string) => {
    const token = localStorage.getItem('token');
    await axios.post(`${API_URL}/tasks/${taskId}/apply`, {}, 
      { headers: { Authorization: `Bearer ${token}` } });
    alert('¡Postulación enviada!');
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Panel Taker</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {passport && <PassportView passport={passport} />}
        </div>

        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Tareas Disponibles</h2>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="p-2 border rounded-lg">
              <option value="Providencia">Providencia</option>
              <option value="Ñuñoa">Ñuñoa</option>
            </select>
          </div>

          <div className="space-y-4">
            {tasks.map((task: any) => (
              <div key={task.id} className="bg-white p-5 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{task.category}</h3>
                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    <div className="flex gap-4 mt-3 text-sm text-gray-700">
                      <span className="flex items-center gap-1"><MapPin size={14} /> {task.location}</span>
                      <span className="flex items-center gap-1"><DollarSign size={14} /> ${task.budget?.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => handleApply(task.id)} 
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-600">
                    Postular
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-gray-500 text-center py-8">No hay tareas disponibles en {filter}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}