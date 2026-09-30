import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../config/api';

type PaymentState = 'loading' | 'success' | 'pending' | 'error';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<PaymentState>('loading');
  const [message, setMessage] = useState('Confirmando pago protegido…');
  const [provider, setProvider] = useState<'WebPay' | 'Mercado Pago'>('WebPay');
  const token = params.get('token_ws');
  // Mercado Pago vuelve con external_reference = el id de la tarea (lo
  // fijamos así al crear la preferencia)
  const taskId = params.get('external_reference');

  useEffect(() => {
    if (!token && !taskId) {
      setState('error');
      setMessage('No llegó información de pago para confirmar.');
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function confirmWebPay() {
      const { data } = await api.post('/payments/webhook', { token_ws: token });
      if (cancelled) return;
      setState('success');
      setMessage(
        data.status === 'held' ? 'Pago retenido correctamente. La tarea ya puede ejecutarse.' : 'Este pago ya estaba procesado.'
      );
      timer = window.setTimeout(() => navigate('/giver'), 1800);
    }

    async function confirmMercadoPago() {
      setProvider('Mercado Pago');
      // El webhook de Mercado Pago llega server-to-server y puede tardar
      // unos segundos más que el redirect del comprador — se reintenta
      // hasta 10 veces (≈15s) antes de mostrar "sigue procesando".
      for (let i = 0; i < 10; i++) {
        if (cancelled) return;
        try {
          const { data } = await api.get(`/payments/status/${taskId}`);
          if (data.status === 'held') {
            setState('success');
            setMessage('Pago confirmado por Mercado Pago. La tarea ya puede ejecutarse.');
            timer = window.setTimeout(() => navigate('/giver'), 1800);
            return;
          }
        } catch {
          // puede que el registro de pago aún no exista en el primer intento
        }
        await sleep(1500);
      }
      if (cancelled) return;
      setState('pending');
      setMessage('Mercado Pago todavía está procesando tu pago. Te avisaremos por WhatsApp apenas se confirme.');
    }

    (token ? confirmWebPay() : confirmMercadoPago()).catch((err: any) => {
      if (cancelled) return;
      setState('error');
      setMessage(err.response?.data?.error || 'No se pudo confirmar el pago.');
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate, token, taskId]);

  const Icon = state === 'loading' ? Loader2 : state === 'success' ? CheckCircle2 : state === 'pending' ? Loader2 : AlertCircle;

  return (
    <div className="max-w-md mx-auto p-6 pt-16 text-center">
      <div className="ticket p-8">
        <Icon
          size={40}
          className={`mx-auto mb-4 ${
            state === 'loading' || state === 'pending' ? 'animate-spin text-azulejo' : state === 'success' ? 'text-azulejo' : 'text-ladrillo'
          }`}
        />
        <p className="font-mono text-xs uppercase tracking-widest text-azulejo mb-1">{provider}</p>
        <h1 className="font-display font-extrabold text-2xl mb-3">
          {state === 'error' ? 'Pago no confirmado' : state === 'pending' ? 'Procesando pago' : 'Pago protegido'}
        </h1>
        <p className="text-ink/60 text-sm mb-6">{message}</p>
        <Link
          to="/giver"
          className="inline-flex items-center justify-center gap-2 bg-azulejo text-paper px-5 py-2.5 rounded-full font-semibold hover:bg-azulejo-dark transition"
        >
          Volver al panel <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
