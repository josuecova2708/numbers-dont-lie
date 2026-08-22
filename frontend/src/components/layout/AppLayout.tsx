import { Outlet, NavLink } from 'react-router-dom';
import { Home, User } from 'lucide-react';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F1117' }}>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ backgroundColor: '#1A1D26', borderColor: '#2A2D37' }}
      >
        <div className="flex items-center justify-around py-2">
          <NavLink to="/" end className={({ isActive }) => navClass(isActive)}>
            <Home size={22} />
            <span className="text-xs mt-0.5">Inicio</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => navClass(isActive)}>
            <User size={22} />
            <span className="text-xs mt-0.5">Perfil</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function navClass(isActive: boolean) {
  const base = 'flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors';
  return isActive
    ? `${base} text-green-400`
    : `${base} text-gray-500 hover:text-gray-300`;
}
