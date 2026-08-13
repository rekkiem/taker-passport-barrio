import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import AuthModal from './LoginModal';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-16 p-4 text-center">
        <ShieldAlert className="mx-auto mb-3 text-azulejo" size={32} />
        <h2 className="font-display font-bold text-xl mb-2">Necesitas una cuenta</h2>
        <p className="text-ink/60 text-sm mb-5">Inicia sesión o regístrate para continuar.</p>
        <button
          onClick={() => setShowAuth(true)}
          className="bg-azulejo text-paper px-6 py-2.5 rounded-full font-semibold hover:bg-azulejo-dark transition"
        >
          Ingresar
        </button>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={setUser} />}
      </div>
    );
  }

  return <>{children}</>;
}
