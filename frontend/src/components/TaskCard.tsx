import axios from 'axios';
import { MapPin, DollarSign, User, CheckCircle } from 'lucide-react';
import { API_URL } from '../config/api';

export default function TaskCard({ task, onUpdate }: { task: any, onUpdate: () => void }) {
  const token = localStorage.getItem('token');

  const getStatusColor = (status: string) => {
    const colors: any = { open: 'bg-blue-100 text-blue-700', assigned: 'bg-yellow-100 text-yellow-700', 
      completed: 'bg-purple-100 text-purple-700', confirmed: 'bg-green-100 text-green-700' };
    return colors[status] || 'bg-gray-100';
  };

  const handlePay = async () => {
    const { data } = await axios.post(`${API_URL}/payments/create`, { taskId: task.id }, 
      { headers: { Authorization: `Bearer ${token}` } });
    window.location.href = data.mockUrl;
  };

  const handleConfirm = async () => {
    await axios.post(`${API_URL}/tasks/${task.id}/confirm`, { rating: 5 }, 
      { headers: { Authorization: `Bearer ${token}` } });
    onUpdate();
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${getStatusColor(task.status)}`}>
          {task.status}
        </span>
        <span className="text-sm text-gray-500 flex items-center gap-1">
          <MapPin size={14} /> {task.location}
        </span>
      </div>

      <h3 className="text-lg font-bold mb-1">{task.category}</h3>
      <p className="text-gray-600 mb-4">{task.description}</p>

      <div className="flex items-center gap-4 text-sm text-gray-700 mb-4">
        <span className="flex items-center gap-1"><DollarSign size={16} /> ${task.budget?.toLocaleString()}</span>
        {task.taker_id && <span className="flex items-center gap-1"><User size={16} /> Asignado</span>}
      </div>

      <div className="flex gap-2">
        {task.status === 'open' && (
          <button className="text-sm bg-secondary text-white px-4 py-2 rounded-lg">Ver postulantes</button>
        )}
        {task.status === 'assigned' && (
          <button onClick={handlePay} className="text-sm bg-accent text-white px-4 py-2 rounded-lg">Pagar con WebPay</button>
        )}
        {task.status === 'completed' && (
          <button onClick={handleConfirm} className="text-sm bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-1">
            <CheckCircle size={16} /> Confirmar y liberar
          </button>
        )}
      </div>
    </div>
  );
}