import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X, User } from 'lucide-react';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">TakerPass</span>
              <span className="ml-2 text-xs bg-accent text-white px-2 py-0.5 rounded-full">Barrio</span>
            </Link>

            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Link to={user.role === 'giver' ? '/giver' : '/taker'} className="text-gray-700 hover:text-primary">
                    Dashboard
                  </Link>
                  <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
                    <User size={20} />
                  </button>
                </>
              ) : (
                <button onClick={() => setShowLogin(true)} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-sky-600">
                  Ingresar
                </button>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={setUser} />}
    </>
  );
}