import { Link } from 'react-router-dom';
import { Shield, Zap, Heart, MessageCircle } from 'lucide-react';

export default function LandingPage() {
  const waLink = `https://wa.me/?text=Hola!%20Quiero%20usar%20TakerPass%20Barrio`;

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-secondary text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">El vecino de confianza que necesitas</h1>
          <p className="text-xl mb-8 opacity-90">
            Conectamos a quienes necesitan un servicio con trabajadores verificados de tu barrio. 
            Providencia y Ñuñoa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={waLink} target="_blank" rel="noopener noreferrer" 
               className="bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 flex items-center justify-center gap-2">
              <MessageCircle size={24} />
              Empezar por WhatsApp
            </a>
            <Link to="/giver" className="bg-accent text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600">
              Publicar una tarea
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="text-primary" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">1. Publica</h3>
            <p className="text-gray-600">Describe lo que necesitas en menos de 2 minutos.</p>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="text-secondary" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">2. Conecta</h3>
            <p className="text-gray-600">Recibe postulaciones de Takers verificados con Passport.</p>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="text-accent" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">3. Confía</h3>
            <p className="text-gray-600">Paga seguro con WebPay. El Taker recibe cuando confirmes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}