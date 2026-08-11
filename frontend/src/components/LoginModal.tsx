import { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { API_URL } from '../config/api';

export default function LoginModal({ onClose, onLogin }: { onClose: () => void, onLogin: (u: any) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ rut: '', name: '', email: '', phone: '', password: '', role: 'giver' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await axios.post(`${API_URL}${endpoint}`, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error en la solicitud');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4"><X size={20} /></button>
        <h2 className="text-2xl font-bold mb-4">{isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegister && (
            <>
              <input type="text" placeholder="RUT (12.345.678-9)" className="w-full p-3 border rounded-lg"
                value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} required />
              <input type="text" placeholder="Nombre completo" className="w-full p-3 border rounded-lg"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              <input type="tel" placeholder="Teléfono (+569...)" className="w-full p-3 border rounded-lg"
                value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
              <select className="w-full p-3 border rounded-lg" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="giver">Necesito ayuda (Giver)</option>
                <option value="taker">Quiero trabajar (Taker)</option>
                <option value="both">Ambos</option>
              </select>
            </>
          )}
          <input type="email" placeholder="Email" className="w-full p-3 border rounded-lg"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" placeholder="Contraseña" className="w-full p-3 border rounded-lg"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />

          <button type="submit" className="w-full bg-primary text-white p-3 rounded-lg font-semibold hover:bg-sky-600">
            {isRegister ? 'Registrarme' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <button onClick={() => setIsRegister(!isRegister)} className="text-primary font-semibold">
            {isRegister ? 'Inicia sesión' : 'Regístrate'}
          </button>
        </p>
      </div>
    </div>
  );
}