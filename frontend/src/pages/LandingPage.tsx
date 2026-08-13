import { useState } from 'react';
import {
  ArrowRight, MessageCircle, Flower2, Paintbrush, Sparkles, Zap, Wrench, Truck,
} from 'lucide-react';
import AuthModal from '../components/LoginModal';

const CATEGORIES = [
  { name: 'Jardinería', icon: Flower2 },
  { name: 'Pintura', icon: Paintbrush },
  { name: 'Limpieza', icon: Sparkles },
  { name: 'Electricidad', icon: Zap },
  { name: 'Plomería', icon: Wrench },
  { name: 'Mudanza', icon: Truck },
];

const STEPS = [
  { n: '01', title: 'Publica', body: 'Cuenta qué necesitas en menos de 2 minutos, sin letra chica.' },
  { n: '02', title: 'Conecta', body: 'Takers de tu comuna postulan mostrando su Passport de confianza.' },
  { n: '03', title: 'Confía', body: 'Pagas por WebPay; el Taker recibe el pago cuando tú confirmas.' },
];

export default function LandingPage() {
  const [authRole, setAuthRole] = useState<null | 'giver' | 'taker'>(null);

  return (
    <div>
      {/* Hero — cartel de barrio, no gradiente genérico */}
      <section className="relative overflow-hidden bg-azulejo-dark text-paper">
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #EFEDE2 0, #EFEDE2 1px, transparent 1px, transparent 14px)',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-marigold mb-4">
            Providencia · Ñuñoa · Santiago
          </p>
          <h1 className="font-display font-black text-4xl sm:text-6xl leading-[1.05] mb-6 text-balance">
            El vecino de confianza<br />que sí llega a la hora
          </h1>
          <p className="text-lg sm:text-xl text-paper/80 mb-10 max-w-2xl mx-auto">
            Conecta con trabajadores de tu barrio verificados por su historial real —
            no por estrellas infladas. Pago protegido hasta que el trabajo esté hecho.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setAuthRole('giver')}
              className="bg-paper text-azulejo-dark px-7 py-3.5 rounded-full font-display font-bold hover:bg-white transition flex items-center justify-center gap-2"
            >
              Publicar una tarea <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setAuthRole('taker')}
              className="bg-marigold text-ink px-7 py-3.5 rounded-full font-display font-bold hover:bg-marigold-dark transition flex items-center justify-center gap-2"
            >
              <Wrench size={18} /> Quiero trabajar
            </button>
          </div>
          <p className="flex items-center justify-center gap-1.5 text-paper/60 text-xs mt-5">
            <MessageCircle size={14} /> Recibirás avisos de tus tareas directo por WhatsApp
          </p>
        </div>
      </section>

      {/* Categorías — "puestos" de la feria de servicios */}
      <section className="py-14 px-4 max-w-5xl mx-auto">
        <h2 className="font-display font-bold text-xl mb-6 text-center text-ink/80">
          ¿Qué necesitas resolver hoy?
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setAuthRole('giver')}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-linea rounded-card hover:border-azulejo hover:-translate-y-0.5 transition text-center"
            >
              <Icon size={22} className="text-azulejo" />
              <span className="text-xs font-semibold text-ink/80">{name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Cómo funciona — secuencia real, numeración con sentido */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <h2 className="font-display font-bold text-3xl text-center mb-12">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="ticket p-6">
              <span className="font-mono text-3xl font-bold text-marigold">{s.n}</span>
              <h3 className="font-display font-bold text-xl mt-2 mb-2">{s.title}</h3>
              <p className="text-ink/60 text-sm">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Passport — diferenciador central del producto */}
      <section className="py-16 px-4 bg-paper2">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-azulejo mb-3">El diferenciador</p>
            <h2 className="font-display font-bold text-3xl mb-4">
              Un Passport que se gana tarea a tarea
            </h2>
            <p className="text-ink/70 mb-4">
              Nada de calificaciones compradas ni perfiles vacíos. Cada Taker construye
              un historial verificable: tareas completadas, tasa de cumplimiento y
              calificación real de vecinos que ya lo contrataron.
            </p>
            <button onClick={() => setAuthRole('taker')} className="inline-flex items-center gap-2 font-semibold text-azulejo hover:text-azulejo-dark">
              Quiero construir mi Passport <ArrowRight size={16} />
            </button>
          </div>
          <div className="stamp-card">
            <div className="bg-azulejo-dark text-paper rounded-card p-6 shadow-lg -rotate-1">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-marigold mb-3">Passport de ejemplo</p>
              <h3 className="font-display font-extrabold text-lg mb-1">Laura Vega</h3>
              <p className="text-paper/70 text-sm mb-4">Identidad verificada</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-paper/10 rounded-lg p-2">
                  <div className="font-display font-bold">4.5★</div>
                  <div className="text-[10px] text-paper/60">Rating</div>
                </div>
                <div className="bg-paper/10 rounded-lg p-2">
                  <div className="font-display font-bold">25</div>
                  <div className="text-[10px] text-paper/60">Tareas</div>
                </div>
                <div className="bg-paper/10 rounded-lg p-2">
                  <div className="font-display font-bold">88%</div>
                  <div className="text-[10px] text-paper/60">Éxito</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {authRole && (
        <AuthModal
          onClose={() => setAuthRole(null)}
          onLogin={() => {
            window.location.href = authRole === 'giver' ? '/giver' : '/taker';
          }}
          initialRole={authRole}
          initialRegister
        />
      )}
    </div>
  );
}
