import { Outlet, NavLink, useParams } from 'react-router-dom';
import { Calendar, BarChart2, Users, Settings } from 'lucide-react';

export function GroupLayout() {
  const { groupId } = useParams<{ groupId: string }>();
  const base = `/groups/${groupId}`;

  return (
    <div className="flex flex-col min-h-screen bg-[#0F1117] text-white">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Group contextual bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ backgroundColor: '#1A1D26', borderColor: '#2A2D37' }}
      >
        <div className="flex items-center justify-around py-2">
          <NavLink to={base} end className={({ isActive }) => navClass(isActive)}>
            <Calendar size={20} />
            <span className="text-xs mt-0.5">Jornadas</span>
          </NavLink>
          <NavLink to={`${base}/leaderboard`} className={({ isActive }) => navClass(isActive)}>
            <BarChart2 size={20} />
            <span className="text-xs mt-0.5">Ranking</span>
          </NavLink>
          <NavLink to={`${base}/teams`} className={({ isActive }) => navClass(isActive)}>
            <Users size={20} />
            <span className="text-xs mt-0.5">Equipos</span>
          </NavLink>
          <NavLink to={`${base}/settings`} className={({ isActive }) => navClass(isActive)}>
            <Settings size={20} />
            <span className="text-xs mt-0.5">Config</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}

function navClass(isActive: boolean) {
  const base = 'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors';
  return isActive
    ? `${base} text-green-400`
    : `${base} text-gray-500 hover:text-gray-300`;
}
