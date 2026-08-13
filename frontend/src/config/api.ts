import axios from 'axios';

// Relativo por defecto: siempre pasa por el mismo origen que sirve el frontend
// (el nginx del contenedor frontend hace proxy de /api al backend), así no
// depende de que el puerto 4000 esté expuesto al host ni de configurar CORS
// para distintos dominios en producción.
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: API_URL });

// Adjunta el token automáticamente — evita repetir el header en cada llamada
// y evita el bug de mandar "Bearer null" cuando no hay sesión.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Traduce cualquier error de red/API a un mensaje visible (evita el patrón
// "el botón no hace nada" cuando una petición falla en silencio) y desloguea
// automáticamente si el token expiró o es inválido.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message || 'Error de conexión';

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    window.dispatchEvent(new CustomEvent('app:error', { detail: message }));
    return Promise.reject(error);
  }
);
