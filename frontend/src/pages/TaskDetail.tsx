import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, MapPin, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config/api';

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState<any>(null);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get(`${API_URL}/tasks`, { headers: { Authorization: `Bearer ${token}` } });
    const found = data.find((t: any) => t.id === id);
    setTask(found);
  };

  if (!task) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Link to="/" className="flex items-center gap-2 text-gray-600 mb-4 hover:text-primary">
        <ArrowLeft size={20} /> Volver
      </Link>

      <div className="bg-white rounded-2xl shadow-sm p-8">
        <span className="inline-block bg-primary/10 text-primary text-sm font-bold px-3 py-1 rounded-full mb-4">
          {task.category}
        </span>
        <h1 className="text-3xl font-bold mb-4">{task.description}</h1>

        <div className="flex flex-wrap gap-6 text-gray-700 mb-8">
          <span className="flex items-center gap-2"><MapPin size={18} /> {task.location}</span>
          <span className="flex items-center gap-2"><DollarSign size={18} /> ${task.budget?.toLocaleString()} CLP</span>
          <span className="flex items-center gap-2"><Clock size={18} /> {new Date(task.created_at).toLocaleDateString()}</span>
        </div>

        <div className="border-t pt-6">
          <h3 className="font-bold mb-2">Publicado por</h3>
          <p className="text-gray-600">{task.giver_name}</p>
        </div>
      </div>
    </div>
  );
}