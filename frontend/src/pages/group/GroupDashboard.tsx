import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { groupsService } from '../../services/groups.service';
import { matchDaysService } from '../../services/matchDays.service';
import type { Group, MatchDay } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Copy, Check, ChevronLeft, Shield, Calendar, BarChart2 } from 'lucide-react';

export function GroupDashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [activeMatchDay, setActiveMatchDay] = useState<MatchDay | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    groupsService.getOne(groupId).then(setGroup).catch(console.error);
    matchDaysService.getActive(groupId).then(setActiveMatchDay).catch(() => setActiveMatchDay(null));
  }, [groupId]);

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!group) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOrganizer = group.myRole === 'ORGANIZER';

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Back button & Group Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/" className="text-gray-400 hover:text-white p-1">
          <ChevronLeft size={22} />
        </Link>
        <span className="text-xs text-gray-400 font-medium">Volver a mis grupos</span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{group.name}</h1>
            <Badge color={group.myRole === 'ORGANIZER' ? 'yellow' : group.myRole === 'CAPTAIN' ? 'blue' : 'gray'}>
              {group.myRole === 'ORGANIZER' ? 'Organizador' : group.myRole === 'CAPTAIN' ? 'Capitán' : 'Jugador'}
            </Badge>
          </div>
        </div>

        {/* Invite code */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl mt-3 transition-all active:scale-95"
          style={{ backgroundColor: '#22252F', border: '1px solid #2A2D37' }}
        >
          <span className="text-xs font-mono font-bold tracking-wider text-green-400">
            {group.inviteCode}
          </span>
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} style={{ color: '#8B8FA3' }} />}
          <span className="text-xs" style={{ color: '#8B8FA3' }}>
            {copied ? '¡Copiado al portapapeles!' : 'Copiar código de invitación'}
          </span>
        </button>
      </div>

      {/* Active matchday card */}
      {activeMatchDay ? (
        <Card className="mb-4" style={{ border: '1px solid #4ADE80' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">
                {activeMatchDay.status === 'ACTIVE' ? 'Jornada en Curso' : 'Jornada Actual'}
              </span>
            </div>
            <Badge color={activeMatchDay.status === 'ACTIVE' ? 'green' : activeMatchDay.status === 'COMPLETED' ? 'gray' : 'blue'}>
              {activeMatchDay.status === 'ACTIVE' ? 'En Curso' : activeMatchDay.status === 'COMPLETED' ? 'Finalizada' : 'Programada'}
            </Badge>
          </div>
          <p className="text-lg font-bold text-white mb-3">{activeMatchDay.label}</p>
          
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(`/groups/${groupId}/match-days/${activeMatchDay.id}/stats`)}
          >
            ⚽ Cargar mis stats
          </Button>
        </Card>
      ) : (
        <Card className="mb-4 text-center py-6">
          <p className="text-3xl mb-2">🏟️</p>
          <p className="font-semibold text-white">Sin jornada activa en este momento</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#8B8FA3' }}>
            {isOrganizer
              ? 'Puedes crear o activar una jornada desde la sección de Jornadas'
              : 'El organizador activará la jornada pronto'}
          </p>
          {isOrganizer && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(`/groups/${groupId}/match-days`)}
            >
              <Calendar size={16} /> Gestionar Jornadas
            </Button>
          )}
        </Card>
      )}

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card onClick={() => navigate(`/groups/${groupId}/teams`)}>
          <div className="flex items-center justify-between mb-1">
            <Shield size={20} className="text-blue-400" />
            <span className="text-xs text-green-400 font-semibold">Gestionar →</span>
          </div>
          <p className="text-2xl font-bold text-white">{group.teams.length}</p>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA3' }}>Equipos registrados</p>
        </Card>

        <Card onClick={() => navigate(`/groups/${groupId}/leaderboard`)}>
          <div className="flex items-center justify-between mb-1">
            <BarChart2 size={20} className="text-yellow-400" />
            <span className="text-xs text-green-400 font-semibold">Ver →</span>
          </div>
          <p className="text-2xl font-bold text-white">🏆</p>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA3' }}>Tabla de Posiciones</p>
        </Card>
      </div>

      {/* Quick Setup Recommendation if 0 teams */}
      {isOrganizer && group.teams.length === 0 && (
        <Card className="border border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-bold text-white">Configura tus equipos</p>
              <p className="text-xs text-gray-400 mt-1 mb-3">
                Para registrar goles oficiales, crea los equipos de tu torneo y asigna a tus amigos.
              </p>
              <Button size="sm" onClick={() => navigate(`/groups/${groupId}/teams`)}>
                Crear Equipos
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
