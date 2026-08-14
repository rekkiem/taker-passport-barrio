import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut, BadgeCheck } from 'lucide-react';
import AuthModal from './LoginModal';

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" className="fill-azulejo" />
        <path d="M8 20L16 10L24 20" stroke="#EFEDE2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="22.5" r="2" className="fill-marigold" />
      </svg>
      <span className="font-display font-extrabold text-lg tracking-tight text-ink">
        TakerPass <span className="text-azulejo">Barrio</span>
      </span>
    </span>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    const onLogin = (event: Event) => setUser((event as CustomEvent).detail);
    const onExpired = () => setUser(null);
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new CustomEvent('auth:logout'));
    setUser(null);
    navigate('/');
  };

  const panelLinks = user?.role === 'both'
    ? [
        { to: '/giver', label: 'Panel Giver' },
        { to: '/taker', label: 'Panel Taker' },
      ]
    : [{ to: user?.role === 'taker' ? '/taker' : '/giver', label: 'Mi panel' }];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-linea">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <Logo />
            </Link>

            <div className="hidden md:flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden lg:flex items-center gap-1 text-sm text-ink/70 mr-2">
                    <BadgeCheck size={16} className="text-azulejo" /> Hola, {user.name?.split(' ')[0]}
                  </span>
                  {panelLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="px-4 py-2 rounded-full text-sm font-semibold text-ink hover:bg-paper2 transition"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-ladrillo hover:bg-ladrillo-light transition"
                  >
                    <LogOut size={16} /> Salir
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="bg-azulejo text-paper px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-azulejo-dark transition shadow-stamp"
                >
                  Ingresar
                </button>
              )}
            </div>

            <button className="md:hidden" onClick={() => setIsOpen(!isOpen)} aria-label="Abrir menú">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {isOpen && (
            <div className="md:hidden pb-4 flex flex-col gap-2">
              {user ? (
                <>
                  {panelLinks.map((link) => (
                    <Link key={link.to} to={link.to} className="px-3 py-2 rounded-lg hover:bg-paper2" onClick={() => setIsOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                  <button onClick={handleLogout} className="text-left px-3 py-2 rounded-lg text-ladrillo hover:bg-ladrillo-light">
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowAuth(true); setIsOpen(false); }}
                  className="bg-azulejo text-paper px-4 py-2.5 rounded-full font-semibold text-sm"
                >
                  Ingresar
                </button>
              )}
            </div>
          )}
        </div>
      </nav>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={setUser} />}
    </>
  );
}
