import { Star, TrendingUp, Award, DollarSign } from 'lucide-react';

export default function PassportView({ passport }: { passport: any }) {
  return (
    <div className="bg-gradient-to-br from-primary to-secondary text-white p-6 rounded-2xl shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
          {passport.name?.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-lg">{passport.name}</h3>
          <p className="text-white/80 text-sm">{passport.verified ? '✓ Verificado' : 'Pendiente de verificación'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 text-white/80 text-xs mb-1"><Star size={12} /> Rating</div>
          <div className="text-2xl font-bold">{passport.avg_rating || '0.0'}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 text-white/80 text-xs mb-1"><TrendingUp size={12} /> Tareas</div>
          <div className="text-2xl font-bold">{passport.total_tasks || 0}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 text-white/80 text-xs mb-1"><Award size={12} /> Éxito</div>
          <div className="text-2xl font-bold">{passport.completion_rate || 0}%</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-1 text-white/80 text-xs mb-1"><DollarSign size={12} /> Ganado</div>
          <div className="text-2xl font-bold">${Math.round(passport.earnings || 0).toLocaleString()}</div>
        </div>
      </div>

      {passport.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {passport.skills.map((s: string) => (
            <span key={s} className="bg-white/20 text-xs px-2 py-1 rounded-full">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}