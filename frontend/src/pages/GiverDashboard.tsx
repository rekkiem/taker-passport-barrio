import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, DollarSign } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { API_URL } from '../config/api';

export default function GiverDashboard() {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', description: '', location: 'Providencia', budget: '' });

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    setTasks(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    await axios.post(`${API_URL}/tasks`, form, { headers: { Authorization: `Bearer ${token}` } });
    setShowForm(false);
    setForm({ category: '', description: '', location: 'Providencia', budget: '' });
    fetchTasks();
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel Giver</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} /> Nueva Tarea
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm mb-8 space-y-4">
          <h3 className="text-lg font-bold">Nueva Tarea</h3>
          <input type="text" placeholder="Categoría (ej: Jardinería)" className="w-full p-3 border rounded-lg"
            value={form.category} onChange={e => setForm({...form, category: e.target.value})} required />
          <textarea placeholder="Describe tu tarea..." className="w-full p-3 border rounded-lg"
            value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          <div className="flex gap-4">
            <select className="flex-1 p-3 border rounded-lg" value={form.location} onChange={e => setForm({...form, location: e.target.value})}>
              <option value="Providencia">Providencia</option>
              <option value="Ñuñoa">Ñuñoa</option>
            </select>
            <div className="flex-1 relative">
              <DollarSign className="absolute left-3 top-3 text-gray-400" size={20} />
              <input type="number" placeholder="Presupuesto (CLP)" className="w-full p-3 pl-10 border rounded-lg"
                value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg">Publicar</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 px-6 py-2">Cancelar</button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {tasks.map((task: any) => (
          <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
        ))}
      </div>
    </div>
  );
}