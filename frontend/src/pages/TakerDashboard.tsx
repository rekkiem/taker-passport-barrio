import { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, Search, PackageSearch, Loader2 } from 'lucide-react';
import PassportView from '../components/PassportView';
import { api } from '../config/api';

export default function TakerDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [passport, setPassport] = useState<any>(null);
  const [filter, setFilter] = useState('Providencia');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAvailableTasks();
    if (user.id) fetchPassport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchAvailableTasks = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get(`/tasks?status=open&location=${filter}`);
      setTasks(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchPassport = async () => {
    try {
      const { data } = await api.get(`/passport/${user.id}`);
      setPassport(data);
    } catch {
      // no bloquea el resto del panel si el passport falla en cargar
    }
  };

  const handleApply = async (taskId: string) => {
    setApplying((prev) => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/tasks/${taskId}/apply`, {});
      setApplied((prev) => ({ ...prev, [taskId]: true }));
    } catch {
      // el interceptor de `api` ya muestra el error real en el toast
      // (ej: "Tarea no disponible", "No puedes postular a tu propia tarea")
    } finally {
      setApplying((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const visibleTasks = tasks.filter(
    (t: any) =>
      t.category.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <p className="font-mono text-xs uppercase tracking-widest text-azulejo mb-1">Panel Taker</p>
      <h1 className="font-display font-extrabold text-3xl mb-8">Tareas disponibles</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 lg:sticky lg:top-20 h-fit">{passport && <PassportView passport={passport} />}</div>

        <div className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 text-ink/40" size={16} />
              <input
                type="text"
                placeholder="Busca por tipo de trabajo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 p-3 bg-white border border-linea rounded-xl placeholder:text-ink/40 focus:border-azulejo focus:ring-0 transition"
              />
            </div>
            <div className="flex gap-2">
              {['Providencia', 'Ñuñoa'].map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition ${
                    filter === c ? 'bg-azulejo text-paper border-azulejo' : 'border-linea text-ink/60 hover:border-ink/30'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-ink/40">Buscando tareas en {filter}…</div>
          ) : loadError ? (
            <div className="text-center py-16 border border-dashed border-ladrillo/40 rounded-card">
              <p className="font-display font-semibold text-ladrillo mb-1">No se pudieron cargar las tareas</p>
              <button onClick={fetchAvailableTasks} className="text-azulejo font-semibold text-sm hover:text-azulejo-dark">
                Reintentar
              </button>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-linea rounded-card">
              <PackageSearch className="mx-auto mb-3 text-ink/30" size={32} />
              <p className="font-display font-semibold text-ink/70 mb-1">No hay tareas abiertas en {filter}</p>
              <p className="text-ink/50 text-sm">Prueba con la otra comuna o vuelve más tarde.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleTasks.map((task: any) => (
                <div key={task.id} className="ticket p-5 flex justify-between items-start gap-4">
                  <div>
                    <h3 className="font-display font-bold text-lg">{task.category}</h3>
                    <p className="text-ink/60 text-sm mt-1">{task.description}</p>
                    <div className="flex gap-4 mt-3 text-sm text-ink/70">
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {task.location}
                      </span>
                      <span className="font-mono font-semibold">${task.budget?.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApply(task.id)}
                    disabled={applied[task.id] || applying[task.id]}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-1 ${
                      applied[task.id]
                        ? 'bg-azulejo/10 text-azulejo cursor-default'
                        : 'bg-azulejo text-paper hover:bg-azulejo-dark disabled:opacity-60'
                    }`}
                  >
                    {applying[task.id] ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : applied[task.id] ? (
                      <>
                        <CheckCircle2 size={14} /> Enviada
                      </>
                    ) : (
                      'Postular'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
