import { useState } from 'react';
import axios from 'axios';
import {
  MapPin, CheckCircle2, Loader2, Flower2, Paintbrush, Sparkles, Zap,
  Wrench, Truck, PawPrint, Hammer, Package,
} from 'lucide-react';
import { API_URL } from '../config/api';

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
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');
  const Icon = CATEGORY_ICON[task.category?.toLowerCase()] || Package;
  const status = STATUS_LABEL[task.status] || { label: task.status, className: 'bg-paper2 text-ink/60' };

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  };

  const handlePay = () =>
    withLoading(async () => {
      const { data } = await axios.post(
        `${API_URL}/payments/create`,
        { taskId: task.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = data.mockUrl;
    });

  const handleConfirm = () =>
    withLoading(async () => {
      await axios.post(
        `${API_URL}/tasks/${task.id}/confirm`,
        { rating: 5 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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

      <div className="flex items-center justify-between border-t border-dashed border-linea pt-3">
        <span className="font-mono font-semibold text-lg">
          ${task.budget?.toLocaleString('es-CL')}
        </span>

        {task.status === 'open' && (
          <span className="text-xs text-ink/50 font-medium">Esperando postulantes</span>
        )}
        {task.status === 'assigned' && (
          <button
            onClick={handlePay}
            disabled={loading}
            className="text-sm bg-marigold text-ink px-4 py-2 rounded-full font-semibold hover:bg-marigold-dark transition flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={14} className="animate-spin" />} Pagar con WebPay
          </button>
        )}
        {task.status === 'completed' && (
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="text-sm bg-azulejo text-paper px-4 py-2 rounded-full font-semibold hover:bg-azulejo-dark transition flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Confirmar y liberar pago
          </button>
        )}
      </div>
    </div>
  );
}
