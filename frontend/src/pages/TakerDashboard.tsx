import { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, Search, PackageSearch, Loader2, ClipboardList, Clock, CreditCard } from 'lucide-react';
import PassportView from '../components/PassportView';
import { api } from '../config/api';

function takerState(task: any) {
  if (task.status === 'open') {
    return { label: 'Postulación enviada', className: 'bg-azulejo/10 text-azulejo' };
  }
  if (task.status === 'assigned' && task.payment_status === 'held') {
    return { label: 'Pago retenido', className: 'bg-marigold/20 text-marigold-dark' };
  }
  if (task.status === 'assigned') {
    return { label: 'Esperando pago', className: 'bg-paper2 text-ink/60' };
  }
  if (task.status === 'completed') {
    return { label: 'Esperando confirmación', className: 'bg-ink/10 text-ink' };
  }
  if (task.status === 'confirmed') {
    return { label: 'Pagada', className: 'bg-azulejo text-paper' };
  }
  return { label: task.status, className: 'bg-paper2 text-ink/60' };
}

export default function TakerDashboard() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [passport, setPassport] = useState<any>(null);
  const [filter, setFilter] = useState('Providencia');
  const [query, setQuery] = useState('');
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchAvailableTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    if (user.id) {
      fetchPassport();
      fetchMyTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const fetchAvailableTasks = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get('/tasks', { params: { available: true, location: filter } });
      setTasks(data);
      setApplied(
        data.reduce((acc: Record<string, boolean>, task: any) => {
          if (task.has_applied) acc[task.id] = true;
          return acc;
        }, {})
      );
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

  const fetchMyTasks = async () => {
    setMyTasksLoading(true);
    try {
      const { data } = await api.get('/tasks?mine=taker');
      setMyTasks(data);
    } catch {
      // el toast global muestra el detalle si falla
    } finally {
      setMyTasksLoading(false);
    }
  };

  const handleApply = async (taskId: string) => {
    setApplying((prev) => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/tasks/${taskId}/apply`, {});
      setApplied((prev) => ({ ...prev, [taskId]: true }));
      await fetchMyTasks();
      await fetchAvailableTasks();
    } catch {
      // el interceptor de `api` ya muestra el error real en el toast
      // (ej: "Tarea no disponible", "No puedes postular a tu propia tarea")
    } finally {
      setApplying((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleComplete = async (taskId: string) => {
    setCompleting((prev) => ({ ...prev, [taskId]: true }));
    try {
      await api.post(`/tasks/${taskId}/complete`, {});
      await fetchMyTasks();
      await fetchPassport();
    } catch {
      // el interceptor global muestra por qué no se puede completar todavía
    } finally {
      setCompleting((prev) => ({ ...prev, [taskId]: false }));
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
          <section className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display font-bold text-xl">Mis postulaciones</h2>
              <button onClick={fetchMyTasks} className="text-azulejo font-semibold text-sm hover:text-azulejo-dark">
                Actualizar
              </button>
            </div>

            {myTasksLoading ? (
              <div className="text-center py-8 text-ink/40 border border-dashed border-linea rounded-card">
                Cargando tus movimientos…
              </div>
            ) : myTasks.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-linea rounded-card">
                <ClipboardList className="mx-auto mb-2 text-ink/30" size={28} />
                <p className="text-ink/60 text-sm">Cuando postules, tu seguimiento aparecerá aquí.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task: any) => {
                  const state = takerState(task);
                  const canComplete = task.status === 'assigned' && task.payment_status === 'held';
                  return (
                    <div key={task.id} className="ticket p-4">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display font-bold leading-tight">{task.category}</h3>
                          <p className="text-ink/60 text-sm mt-1">{task.description}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/70">
                            <span className="flex items-center gap-1">
                              <MapPin size={13} /> {task.location}
                            </span>
                            <span className="font-mono font-semibold">${task.budget?.toLocaleString('es-CL')}</span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} /> {task.giver_name}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shrink-0 ${state.className}`}>
                          {state.label}
                        </span>
                      </div>

                      <div className="border-t border-dashed border-linea pt-3 mt-3 flex justify-end">
                        {canComplete ? (
                          <button
                            onClick={() => handleComplete(task.id)}
                            disabled={completing[task.id]}
                            className="text-sm bg-azulejo text-paper px-4 py-2 rounded-full font-semibold hover:bg-azulejo-dark transition flex items-center gap-2 disabled:opacity-60"
                          >
                            {completing[task.id] ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Marcar completada
                          </button>
                        ) : task.status === 'assigned' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ink/50 font-medium">
                            <CreditCard size={13} /> El Giver debe retener el pago
                          </span>
                        ) : task.status === 'completed' ? (
                          <span className="text-xs text-ink/50 font-medium">El Giver debe confirmar para liberar el pago</span>
                        ) : task.status === 'confirmed' ? (
                          <span className="text-xs text-azulejo font-semibold">Pago liberado a tu Passport</span>
                        ) : (
                          <span className="text-xs text-ink/50 font-medium">Esperando respuesta del Giver</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

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
                    disabled={applied[task.id] || task.has_applied || applying[task.id]}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-1 ${
                      applied[task.id] || task.has_applied
                        ? 'bg-azulejo/10 text-azulejo cursor-default'
                        : 'bg-azulejo text-paper hover:bg-azulejo-dark disabled:opacity-60'
                    }`}
                  >
                    {applying[task.id] ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : applied[task.id] || task.has_applied ? (
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
