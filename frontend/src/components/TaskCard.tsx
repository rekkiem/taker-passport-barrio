import { useState } from 'react';
import {
  MapPin, CheckCircle2, Loader2, Flower2, Paintbrush, Sparkles, Zap,
  Wrench, Truck, PawPrint, Hammer, Package, UserCheck, ShieldCheck, Star,
  CreditCard,
} from 'lucide-react';
import { api } from '../config/api';

const CATEGORY_ICON: Record<string, any> = {
  jardineria: Flower2,
  jardinería: Flower2,
  pintura: Paintbrush,
  limpieza: Sparkles,
  electricidad: Zap,
  plomeria: Wrench,
  plomería: Wrench,
  mudanza: Truck,
  'cuidado de mascotas': PawPrint,
  carpinteria: Hammer,
  carpintería: Hammer,
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  open: { label: 'Abierta', className: 'bg-azulejo/10 text-azulejo' },
  assigned: { label: 'Asignada', className: 'bg-marigold/20 text-marigold-dark' },
  completed: { label: 'Completada', className: 'bg-ink/10 text-ink' },
  confirmed: { label: 'Pagada', className: 'bg-azulejo text-paper' },
};

export default function TaskCard({ task, onUpdate }: { task: any; onUpdate: () => void }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const Icon = CATEGORY_ICON[task.category?.toLowerCase()] || Package;
  const status = STATUS_LABEL[task.status] || { label: task.status, className: 'bg-paper2 text-ink/60' };
  const applicants = Array.isArray(task.applicants) ? task.applicants : [];

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoadingKey(key);
    try {
      await fn();
    } catch {
      // el interceptor de `api` ya muestra el error en el toast global
    } finally {
      setLoadingKey(null);
    }
  };

  const handleAssign = (takerId: string) =>
    withLoading(`assign:${takerId}`, async () => {
      await api.post(`/tasks/${task.id}/assign`, { takerId });
      onUpdate();
    });

  const handlePay = () =>
    withLoading('pay', async () => {
      const { data } = await api.post('/payments/create', { taskId: task.id });
      if (data.alreadyPaid) {
        onUpdate();
        return;
      }
      if (data.mockUrl) window.location.href = data.mockUrl;
    });

  const handleConfirm = () =>
    withLoading('confirm', async () => {
      await api.post(`/tasks/${task.id}/confirm`, { rating: 5 });
      onUpdate();
    });

  return (
    <div className="ticket p-5 hover:shadow-md transition">
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-azulejo/10 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-azulejo" />
          </div>
          <div>
            <h3 className="font-display font-bold leading-tight">{task.category}</h3>
            <span className="flex items-center gap-1 text-xs text-ink/50">
              <MapPin size={12} /> {task.location}
            </span>
          </div>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shrink-0 ${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="text-ink/70 text-sm mb-4">{task.description}</p>

      {task.status === 'open' && (
        <div className="border-t border-dashed border-linea pt-4 mb-4">
          {applicants.length === 0 ? (
            <span className="text-xs text-ink/50 font-medium">Esperando postulantes</span>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide font-bold text-ink/50">
                  {applicants.length === 1 ? '1 postulante' : `${applicants.length} postulantes`}
                </span>
              </div>
              {applicants.map((applicant: any) => (
                <div key={applicant.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-paper/60 border border-linea rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-bold text-sm">{applicant.name}</span>
                      {applicant.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-azulejo font-semibold">
                          <ShieldCheck size={12} /> Verificado
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-ink/60">
                      <span className="inline-flex items-center gap-1">
                        <Star size={12} /> {Number(applicant.passport?.avg_rating || 0).toFixed(1)}
                      </span>
                      <span>{applicant.passport?.total_tasks || 0} tareas</span>
                      <span>{Number(applicant.passport?.completion_rate || 0).toFixed(0)}% éxito</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(applicant.id)}
                    disabled={loadingKey === `assign:${applicant.id}`}
                    className="shrink-0 text-sm bg-azulejo text-paper px-4 py-2 rounded-full font-semibold hover:bg-azulejo-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loadingKey === `assign:${applicant.id}` ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                    Asignar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {task.taker_name && task.status !== 'open' && (
        <div className="border-t border-dashed border-linea pt-3 mb-4 text-sm text-ink/70">
          Taker asignado: <span className="font-semibold text-ink">{task.taker_name}</span>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-dashed border-linea pt-3">
        <span className="font-mono font-semibold text-lg">
          ${task.budget?.toLocaleString('es-CL')}
        </span>

        {task.status === 'open' && task.applicant_count > 0 && (
          <span className="text-xs text-azulejo font-semibold">Elige un Taker</span>
        )}
        {task.status === 'assigned' && (
          task.payment_status === 'held' ? (
            <span className="text-xs text-azulejo font-semibold">Pago retenido; esperando entrega</span>
          ) : (
            <button
              onClick={handlePay}
              disabled={loadingKey === 'pay'}
              className="text-sm bg-marigold text-ink px-4 py-2 rounded-full font-semibold hover:bg-marigold-dark transition flex items-center gap-2 disabled:opacity-60"
            >
              {loadingKey === 'pay' ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              {task.payment_status === 'pending' ? 'Retomar pago' : 'Pagar con WebPay'}
            </button>
          )
        )}
        {task.status === 'completed' && (
          <button
            onClick={handleConfirm}
            disabled={loadingKey === 'confirm'}
            className="text-sm bg-azulejo text-paper px-4 py-2 rounded-full font-semibold hover:bg-azulejo-dark transition flex items-center gap-2 disabled:opacity-60"
          >
            {loadingKey === 'confirm' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirmar y liberar pago
          </button>
        )}
        {task.status === 'confirmed' && (
          <span className="text-xs text-azulejo font-semibold">Pago liberado</span>
        )}
      </div>
    </div>
  );
}
