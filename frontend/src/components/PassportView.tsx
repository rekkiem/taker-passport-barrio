import { Star, TrendingUp, Wallet } from 'lucide-react';

export default function PassportView({ passport }: { passport: any }) {
  return (
    <div className="bg-azulejo-dark text-paper rounded-card p-6 relative overflow-hidden">
      {/* Textura sutil tipo trama de boleta oficial, sin depender de imágenes externas */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #EFEDE2 0, #EFEDE2 1px, transparent 1px, transparent 12px)',
        }}
      />

      <div className="relative">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-marigold mb-1">
          Passport del Taker
        </p>

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-extrabold text-xl">{passport.name}</h3>
            <p className="text-paper/70 text-sm">
              {passport.verified ? 'Identidad verificada' : 'Verificación pendiente'}
            </p>
          </div>

          {/* Sello circular — el número de tareas completadas hace de "timbre" de confianza */}
          <div className="stamp text-marigold border-marigold shrink-0">
            <span className="font-display font-black text-xl leading-none">{passport.total_tasks || 0}</span>
            <span className="text-[9px] uppercase tracking-wide leading-none mt-0.5">tareas</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-paper/10 rounded-xl p-3">
            <div className="flex items-center gap-1 text-paper/60 text-[11px] mb-1">
              <Star size={12} /> Rating
            </div>
            <div className="text-xl font-display font-bold">{passport.avg_rating || '—'}</div>
          </div>
          <div className="bg-paper/10 rounded-xl p-3">
            <div className="flex items-center gap-1 text-paper/60 text-[11px] mb-1">
              <TrendingUp size={12} /> Éxito
            </div>
            <div className="text-xl font-display font-bold">{passport.completion_rate || 0}%</div>
          </div>
          <div className="bg-paper/10 rounded-xl p-3">
            <div className="flex items-center gap-1 text-paper/60 text-[11px] mb-1">
              <Wallet size={12} /> Ganado
            </div>
            <div className="text-sm font-mono font-semibold mt-1.5">
              ${Math.round(passport.earnings || 0).toLocaleString('es-CL')}
            </div>
          </div>
        </div>

        {passport.skills?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {passport.skills.map((s: string) => (
              <span key={s} className="border border-paper/30 text-xs px-2.5 py-1 rounded-full text-paper/90">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
