import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { groupsService } from '../services/groups.service';
import type { Group } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    groupsService.getMyGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const res = await groupsService.join(joinCode.trim().toUpperCase());
      navigate(`/groups/${res.groupId}`);
    } catch (err: any) {
      const { toast } = await import('react-hot-toast');
      toast.error(err.response?.data?.message || 'Código inválido');
    } finally {
      setIsJoining(false);
    }
  };

  const roleColor = (role: string) => {
    if (role === 'ORGANIZER') return 'yellow';
    if (role === 'CAPTAIN') return 'blue';
    return 'gray';
  };

  const roleLabel = (role: string) => {
    if (role === 'ORGANIZER') return 'Organizador';
    if (role === 'CAPTAIN') return 'Capitán';
    return 'Jugador';
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, {user?.displayName?.split(' ')[0]} 👋</h1>
          <p className="text-sm mt-0.5" style={{ color: '#8B8FA3' }}>Tus grupos de fútbol</p>
        </div>
        <Link to="/groups/new">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-black font-bold transition-all active:scale-90"
            style={{ backgroundColor: '#4ADE80' }}
          >
            <Plus size={20} />
          </button>
        </Link>
      </div>

      {/* Join group */}
      <Card className="mb-6">
        <p className="text-sm font-medium text-white mb-3">Unirse con código</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="MIERCOLES-5X5"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="flex-1 px-3 py-2.5 rounded-xl text-white text-sm uppercase tracking-wider outline-none focus:ring-2 focus:ring-green-400/50"
            style={{ backgroundColor: '#22252F', border: '1px solid #2A2D37' }}
          />
          <Button onClick={handleJoin} isLoading={isJoining} size="sm">
            Unirse
          </Button>
        </div>
      </Card>

      {/* Groups list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏟️</div>
          <p className="font-semibold text-white">Sin grupos todavía</p>
          <p className="text-sm mt-1" style={{ color: '#8B8FA3' }}>
            Crea uno o únete con un código
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <Card key={group.id} onClick={() => navigate(`/groups/${group.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: '#22252F' }}>
                    ⚽
                  </div>
                  <div>
                    <p className="font-bold text-white">{group.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge color={roleColor(group.myRole || 'PLAYER') as any}>
                        {roleLabel(group.myRole || 'PLAYER')}
                      </Badge>
                      <span className="text-xs" style={{ color: '#8B8FA3' }}>
                        · {group.teams.length} equipos
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: '#8B8FA3' }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
