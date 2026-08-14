import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../config/api';

type PaymentState = 'loading' | 'success' | 'error';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<PaymentState>('loading');
  const [message, setMessage] = useState('Confirmando pago protegido…');
  const token = params.get('token_ws');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('No llegó el token de WebPay para confirmar el pago.');
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function confirmPayment() {
      try {
        const { data } = await api.post('/payments/webhook', { token_ws: token });
        if (cancelled) return;

        if (data.status === 'held') {
          setState('success');
          setMessage('Pago retenido correctamente. La tarea ya puede ejecutarse.');
          timer = window.setTimeout(() => navigate('/giver'), 1800);
        } else {
          setState('success');
          setMessage('Este pago ya estaba procesado.');
          timer = window.setTimeout(() => navigate('/giver'), 1800);
        }
      } catch (err: any) {
        if (cancelled) return;
        setState('error');
        setMessage(err.response?.data?.error || 'No se pudo confirmar el pago.');
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [navigate, token]);

  const Icon = state === 'loading' ? Loader2 : state === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className="max-w-md mx-auto p-6 pt-16 text-center">
      <div className="ticket p-8">
        <Icon
          size={40}
          className={`mx-auto mb-4 ${state === 'loading' ? 'animate-spin text-azulejo' : state === 'success' ? 'text-azulejo' : 'text-ladrillo'}`}
        />
        <p className="font-mono text-xs uppercase tracking-widest text-azulejo mb-1">WebPay</p>
        <h1 className="font-display font-extrabold text-2xl mb-3">
          {state === 'error' ? 'Pago no confirmado' : 'Pago protegido'}
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
