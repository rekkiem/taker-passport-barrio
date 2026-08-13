import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MapPin, Clock } from 'lucide-react';
import { API_URL } from '../config/api';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTask = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    const found = data.find((t: any) => t.id === id);
    if (!found) setNotFound(true);
    setTask(found);
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="font-display font-semibold text-ink/70">Esta tarea ya no está disponible.</p>
        <Link to="/" className="text-azulejo font-semibold text-sm mt-2 inline-block">Volver al inicio</Link>
      </div>
    );
  }

  if (!task) return <div className="p-8 text-center text-ink/40">Cargando…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <Link to="/" className="flex items-center gap-2 text-ink/60 mb-4 hover:text-azulejo w-fit">
        <ArrowLeft size={18} /> Volver
      </Link>

      <div className="ticket p-8">
        <span className="inline-block bg-azulejo/10 text-azulejo text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-4">
          {task.category}
        </span>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl mb-5">{task.description}</h1>

        <div className="flex flex-wrap gap-6 text-ink/70 mb-8">
          <span className="flex items-center gap-2 text-sm">
            <MapPin size={16} /> {task.location}
          </span>
          <span className="font-mono font-semibold text-lg text-ink">
            ${task.budget?.toLocaleString('es-CL')} CLP
          </span>
          <span className="flex items-center gap-2 text-sm">
            <Clock size={16} /> {new Date(task.created_at).toLocaleDateString('es-CL')}
          </span>
        </div>

        <div className="border-t border-dashed border-linea pt-5">
          <h3 className="font-display font-bold text-sm text-ink/50 uppercase tracking-wide mb-1">Publicado por</h3>
          <p className="text-ink">{task.giver_name}</p>
        </div>
      </div>
    </div>
  );
}
