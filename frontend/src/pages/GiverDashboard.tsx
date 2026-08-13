import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, ClipboardList } from 'lucide-react';
import TaskCard from '../components/TaskCard';
import { API_URL } from '../config/api';

const inputClass =
  'w-full p-3 bg-paper border border-linea rounded-xl placeholder:text-ink/40 focus:border-azulejo focus:ring-0 transition';

export default function GiverDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', description: '', location: 'Providencia', budget: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    setTasks(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API_URL}/tasks`, { ...form, budget: Number(form.budget) }, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setForm({ category: '', description: '', location: 'Providencia', budget: '' });
      fetchTasks();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'No se pudo publicar la tarea');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-azulejo mb-1">Panel Giver</p>
          <h1 className="font-display font-extrabold text-3xl">Tus tareas</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-azulejo text-paper px-4 py-2.5 rounded-full font-semibold flex items-center gap-2 hover:bg-azulejo-dark transition"
        >
          <Plus size={18} /> Nueva tarea
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="ticket p-6 mb-8 space-y-3 relative">
          <button type="button" onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-ink/40 hover:text-ink" aria-label="Cerrar">
            <X size={18} />
          </button>
          <h3 className="font-display font-bold text-lg mb-1">Describe tu tarea</h3>
          {formError && <div className="bg-ladrillo-light text-ladrillo p-3 rounded-lg text-sm">{formError}</div>}
          <input
            type="text"
            placeholder="Categoría (ej: Jardinería)"
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <textarea
            placeholder="¿Qué necesitas? Sé específico: tamaño, materiales, urgencia..."
            className={inputClass}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <div className="flex gap-3">
            <select
              className={`flex-1 ${inputClass}`}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            >
              <option value="Providencia">Providencia</option>
              <option value="Ñuñoa">Ñuñoa</option>
            </select>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-3.5 text-ink/40 font-mono text-sm">CLP</span>
              <input
                type="number"
                placeholder="Presupuesto"
                className={`${inputClass} pl-12`}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                min={1}
                required
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="bg-marigold text-ink px-6 py-2.5 rounded-full font-semibold hover:bg-marigold-dark transition">
              Publicar tarea
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-ink/50 px-6 py-2.5 hover:text-ink">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-ink/40">Cargando tus tareas…</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-linea rounded-card">
          <ClipboardList className="mx-auto mb-3 text-ink/30" size={32} />
          <p className="font-display font-semibold text-ink/70 mb-1">Aún no has publicado nada</p>
          <p className="text-ink/50 text-sm mb-4">Publica tu primera tarea y recibe postulantes de tu barrio.</p>
          <button onClick={() => setShowForm(true)} className="text-azulejo font-semibold text-sm hover:text-azulejo-dark">
            Publicar mi primera tarea →
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task: any) => (
            <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
          ))}
        </div>
      )}
    </div>
  );
}
