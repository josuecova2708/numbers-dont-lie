import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchDaysService } from '../../services/matchDays.service';
import type { MatchDay, PlayerMatchStats } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { groupsService } from '../../services/groups.service';
import type { GroupRole } from '../../types';
import { Pencil } from 'lucide-react';
import { STAT_META } from '../../constants/stats';
import type { StatField } from '../../constants/stats';

const COLUMNS: StatField[] = ['goals', 'assists', 'missedGoals', 'ownGoals', 'ballsOut'];

export function MatchDayDetail() {
  const { groupId, matchDayId } = useParams<{ groupId: string; matchDayId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matchDay, setMatchDay] = useState<(MatchDay & { stats: PlayerMatchStats[] }) | null>(null);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !matchDayId) return;
    Promise.all([
      matchDaysService.getOne(groupId, matchDayId) as Promise<MatchDay & { stats: PlayerMatchStats[] }>,
      groupsService.getOne(groupId),
    ]).then(([md, g]) => {
      setMatchDay(md);
      setMyRole(g.myRole ?? null);
      setMyTeamId(g.myTeamId ?? null);
    }).catch(console.error)
      .finally(() => setIsLoading(false));
  }, [groupId, matchDayId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!matchDay) return null;

  // Mismo criterio que el backend: organizador a todos, capitán a su equipo
  const canEdit = (pStats: PlayerMatchStats[]) =>
    myRole === 'ORGANIZER' ||
    (myRole === 'CAPTAIN' && !!myTeamId && pStats.some((s) => s.context === 'TEAM' && s.teamId === myTeamId));

  // Group stats by player
  const byPlayer: Record<string, PlayerMatchStats[]> = {};
  for (const s of matchDay.stats || []) {
    if (!byPlayer[s.playerId]) byPlayer[s.playerId] = [];
    byPlayer[s.playerId].push(s);
  }

  const statusColor = matchDay.status === 'ACTIVE' ? 'green' : matchDay.status === 'COMPLETED' ? 'gray' : 'blue';

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Badge color={statusColor}>
          {matchDay.status}
        </Badge>
        <h1 className="text-xl font-bold text-white mt-2">{matchDay.label}</h1>
        <p className="text-sm mt-0.5" style={{ color: '#8B8FA3' }}>
          {Object.keys(byPlayer).length} jugadores reportaron
        </p>
      </div>

      {/* My stats CTA */}
      {matchDay.acceptsStats ? (
        <Button size="lg" className="mb-5 w-full"
          onClick={() => navigate(`/groups/${groupId}/match-days/${matchDayId}/stats`)}>
          ⚽ {(matchDay.stats || []).some(s => s.playerId === user?.id) ? 'Editar mis stats de esta jornada' : 'Cargar mis stats'}
        </Button>
      ) : (
        <p className="mb-5 text-sm text-center" style={{ color: '#8B8FA3' }}>
          {matchDay.status === 'CANCELLED' ? 'Jornada cancelada' : 'Esta jornada todavía no se ha jugado'}
        </p>
      )}

      {/* All stats by player */}
      <div className="flex flex-col gap-3">
        {Object.entries(byPlayer).map(([pid, pStats]) => {
          const playerName = pStats[0]?.player?.displayName || 'Jugador';
          const teamStat = pStats.find(s => s.context === 'TEAM');
          const otherStat = pStats.find(s => s.context === 'OTHER');

          return (
            <Card key={pid}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-white">{playerName}</p>
                {matchDay.acceptsStats && pid !== user?.id && canEdit(pStats) && (
                  <button
                    onClick={() => navigate(`/groups/${groupId}/match-days/${matchDayId}/stats?player=${pid}`)}
                    className="p-1.5 rounded-lg transition-all"
                    style={{ backgroundColor: '#22252F' }}
                  >
                    <Pencil size={14} style={{ color: '#8B8FA3' }} />
                  </button>
                )}
              </div>

              {/* Stats table */}
              <div className="grid grid-cols-6 gap-1 text-center text-xs mb-2" style={{ color: '#8B8FA3' }}>
                <div></div>
                {COLUMNS.map((f) => (
                  <div key={f} title={STAT_META[f].label}>{STAT_META[f].emoji}</div>
                ))}
              </div>
              {[teamStat, otherStat].filter((s): s is PlayerMatchStats => !!s).map((s) => (
                <div key={s.id} className="grid grid-cols-6 gap-1 text-center text-sm mb-1.5">
                  <div className="text-left text-xs truncate" style={{ color: '#8B8FA3' }}>
                    {s.context === 'TEAM' ? s.team?.name || 'Equipo' : 'Comodín'}
                  </div>
                  {COLUMNS.map((f) => (
                    <div key={f} className={`font-bold ${f === 'goals' || f === 'assists' ? 'text-white' : 'text-red-300'}`}>
                      {s[f]}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          );
        })}

        {Object.keys(byPlayer).length === 0 && (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📋</p>
            <p style={{ color: '#8B8FA3' }}>Nadie ha reportado sus stats aún</p>
          </div>
        )}
      </div>
    </div>
  );
}
