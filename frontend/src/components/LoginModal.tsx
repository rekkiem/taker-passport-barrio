import { useState } from 'react';
import { X, HandHelping, Wrench, Users, Loader2 } from 'lucide-react';
import { api } from '../config/api';

const ROLES = [
  { value: 'giver', label: 'Necesito ayuda', hint: 'Publicar tareas', icon: HandHelping },
  { value: 'taker', label: 'Quiero trabajar', hint: 'Postular a tareas', icon: Wrench },
  { value: 'both', label: 'Ambos', hint: 'Publicar y trabajar', icon: Users },
];

const inputClass =
  'w-full p-3 bg-paper border border-linea rounded-xl placeholder:text-ink/40 focus:border-azulejo focus:ring-0 transition';

export default function AuthModal({
  onClose,
  onLogin,
  initialRole = 'giver',
  initialRegister = false,
}: {
  onClose: () => void;
  onLogin: (u: any) => void;
  initialRole?: string;
  initialRegister?: boolean;
}) {
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [form, setForm] = useState({ rut: '', name: '', email: '', phone: '', password: '', role: initialRole });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      onClose();
    } catch (err: any) {
      const details = err.response?.data?.details;
      setError(details?.[0]?.message || err.response?.data?.error || 'Error en la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="ticket w-full max-w-md relative p-6 my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-ink/50 hover:text-ink" aria-label="Cerrar">
          <X size={20} />
        </button>

        <p className="font-mono text-xs uppercase tracking-widest text-azulejo mb-1">
          {isRegister ? 'Crear credencial' : 'Acceso vecinal'}
        </p>
        <h2 className="text-2xl font-display font-extrabold mb-5">
          {isRegister ? 'Súmate al barrio' : 'Bienvenido de vuelta'}
        </h2>

        {error && (
          <div className="bg-ladrillo-light text-ladrillo p-3 rounded-lg mb-4 text-sm font-medium">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-1">
                {ROLES.map(({ value, label, hint, icon: Icon }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setForm({ ...form, role: value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition ${
                      form.role === value
                        ? 'border-azulejo bg-azulejo/10 text-azulejo'
                        : 'border-linea text-ink/60 hover:border-ink/30'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                    <span className="text-[10px] leading-tight opacity-70">{hint}</span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="RUT (12.345.678-5)"
                className={inputClass}
                value={form.rut}
                onChange={(e) => setForm({ ...form, rut: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Nombre completo"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Teléfono (+569...)"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </>
          )}
          <input
            type="email"
            placeholder="Email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className={inputClass}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-azulejo text-paper p-3 rounded-xl font-display font-bold hover:bg-azulejo-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isRegister ? 'Crear mi cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-ink/60">
          {isRegister ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}{' '}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }} className="text-azulejo font-semibold">
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
}
