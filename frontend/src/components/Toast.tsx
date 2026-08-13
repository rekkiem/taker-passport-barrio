import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function Toast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setMessage((e as CustomEvent).detail);
      window.clearTimeout((window as any).__toastTimer);
      (window as any).__toastTimer = window.setTimeout(() => setMessage(null), 5000);
    };
    window.addEventListener('app:error', handler);
    return () => window.removeEventListener('app:error', handler);
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[calc(100%-2rem)]">
      <div className="bg-ink text-paper rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
        <AlertCircle size={18} className="text-ladrillo shrink-0 mt-0.5" />
        <p className="text-sm flex-1">{message}</p>
        <button onClick={() => setMessage(null)} aria-label="Cerrar aviso" className="text-paper/60 hover:text-paper shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
