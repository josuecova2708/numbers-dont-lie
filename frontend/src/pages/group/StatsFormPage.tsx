import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statsService } from '../../services/stats.service';
import { groupsService } from '../../services/groups.service';
import { matchDaysService } from '../../services/matchDays.service';
import type { Group, MatchDay, PlayerMatchStats } from '../../types';
import { Counter } from '../../components/ui/Counter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ChevronLeft, Plus, X, User as UserIcon, Calendar, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { AURA_STATS, REAL_STATS, STAT_META, emptyStats } from '../../constants/stats';
import type { StatsBlock } from '../../constants/stats';

const pickBlock = (s: PlayerMatchStats): StatsBlock => ({
  goals: s.goals, assists: s.assists, missedGoals: s.missedGoals, ownGoals: s.ownGoals, ballsOut: s.ballsOut,
});

export function StatsFormPage() {
  const { groupId, matchDayId } = useParams<{ groupId: string; matchDayId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [allStats, setAllStats] = useState<PlayerMatchStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const selectedPlayerId = searchParams.get('player') || user?.id || '';

  const [teamStats, setTeamStats] = useState<StatsBlock | null>(null);
  const [otherStats, setOtherStats] = useState<StatsBlock | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!groupId || !matchDayId) return;
    setIsLoading(true);
    Promise.all([
      groupsService.getOne(groupId),
      matchDaysService.getAll(groupId),
      statsService.getAll(matchDayId),
    ])
      .then(([g, mds, stats]) => {
        setGroup(g);
        setMatchDays(mds);
        setAllStats(stats);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Error al cargar la jornada'))
      .finally(() => setIsLoading(false));
  }, [groupId, matchDayId]);

  const matchDay = matchDays.find((md) => md.id === matchDayId);
  const membership = group?.memberships?.find((m) => m.userId === selectedPlayerId);
  const playerTeam = group?.teams.find((t) => t.id === membership?.teamId);
  const playerStats = allStats.filter((s) => s.playerId === selectedPlayerId);
  const teamEntry = playerStats.find((s) => s.context === 'TEAM');
  const otherEntry = playerStats.find((s) => s.context === 'OTHER');
  const hasSaved = playerStats.length > 0;

  // Precargar con lo ya guardado EN ESTA JORNADA para este jugador
  useEffect(() => {
    if (isLoading) return;
    if (teamEntry) setTeamStats(pickBlock(teamEntry));
    else setTeamStats(playerTeam && !otherEntry ? emptyStats() : null);
    if (otherEntry) setOtherStats(pickBlock(otherEntry));
    else setOtherStats(playerTeam ? null : emptyStats());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, selectedPlayerId, allStats, group]);

  // A quién puedo cargarle stats
  const editablePlayers = (group?.memberships || []).filter((m) => {
    if (m.userId === user?.id) return true;
    if (group?.myRole === 'ORGANIZER') return true;
    return group?.myRole === 'CAPTAIN' && !!group.myTeamId && m.teamId === group.myTeamId;
  });
  const selectableMatchDays = matchDays.filter((md) => md.acceptsStats || md.id === matchDayId);
  const isSelf = selectedPlayerId === user?.id;
  const playerName = isSelf ? 'tú' : membership?.user.displayName || 'el jugador';
  const nothingToSave = !(playerTeam && teamStats) && !otherStats;

  const changeMatchDay = (id: string) => {
    navigate(`/groups/${groupId}/match-days/${id}/stats${isSelf ? '' : `?player=${selectedPlayerId}`}`);
  };

  const changePlayer = (id: string) => {
    setSearchParams(id === user?.id ? {} : { player: id }, { replace: true });
  };

  const handleSave = async () => {
    if (!matchDayId || !selectedPlayerId) return;
    if (nothingToSave && !confirm('Se borrarán las stats de esta jornada. ¿Seguro?')) return;
    setIsSaving(true);
    try {
      // Sin equipo asignado no se manda `team` (queda intacto lo que hubiera de antes)
      await statsService.saveDay(matchDayId, selectedPlayerId, {
        team: playerTeam ? teamStats : undefined,
        other: otherStats,
      });
      toast.success(nothingToSave ? 'Stats borradas' : '¡Stats guardadas! 🏆');
      navigate(`/groups/${groupId}/match-days/${matchDayId}`);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">
          {isSelf ? '¿Cómo te fue?' : `Stats de ${membership?.user.displayName ?? ''}`}
        </h1>
      </div>

      {/* Jornada */}
      <Card className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className="text-green-400" />
          <p className="font-bold text-white text-sm">Jornada</p>
        </div>
        <select
          value={matchDayId}
          onChange={(e) => changeMatchDay(e.target.value)}
          className="w-full bg-[#1A1D26] text-white border border-[#2D313F] rounded-lg p-3 text-sm focus:outline-none focus:border-green-400"
        >
          {selectableMatchDays.map((md) => (
            <option key={md.id} value={md.id}>
              {md.label}
              {md.dateKey === new Date().toLocaleDateString('en-CA') ? ' (hoy)' : ''}
            </option>
          ))}
        </select>
      </Card>

      {editablePlayers.length > 1 && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon size={16} className="text-green-400" />
            <p className="font-bold text-white text-sm">Registrar stats para:</p>
          </div>
          <select
            value={selectedPlayerId}
            onChange={(e) => changePlayer(e.target.value)}
            className="w-full bg-[#1A1D26] text-white border border-[#2D313F] rounded-lg p-3 text-sm focus:outline-none focus:border-green-400"
          >
            {editablePlayers.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.userId === user?.id ? 'Mis Stats (Yo)' : m.user.displayName}
              </option>
            ))}
          </select>
        </Card>
      )}

      {matchDay && !matchDay.acceptsStats ? (
        <Card className="mb-4 border border-red-500/30">
          <p className="text-sm text-red-300">
            {matchDay.status === 'CANCELLED'
              ? 'Esta jornada fue cancelada.'
              : 'Esta jornada todavía no se ha jugado.'}{' '}
            Elige otra en el selector de arriba.
          </p>
        </Card>
      ) : (
        <>
          {/* Aclaración: total del día, no acumulado */}
          <div
            className="flex gap-2 p-3 rounded-xl mb-4 text-xs leading-relaxed"
            style={{ backgroundColor: '#4ADE8014', border: '1px solid #4ADE8040', color: '#C9F7D9' }}
          >
            <Info size={16} className="shrink-0 mt-0.5 text-green-400" />
            <p>
              Pon lo que hizo <b>{playerName}</b> <b>solo en esta jornada</b> ({matchDay?.label.replace('Jornada - ', '')}).
              Es el total de ese día, <b>no</b> el acumulado del torneo: el ranking suma las jornadas solo.
              {hasSaved && (
                <>
                  {' '}
                  <b>Ya hay stats guardadas aquí</b>: los números de abajo son ese total; corrígelo si hace falta, no le sumes encima.
                </>
              )}
            </p>
          </div>

          {/* Bloque equipo */}
          {playerTeam && (teamStats ? (
            <StatsCard
              title={`🛡️ Con ${playerTeam.name}`}
              stats={teamStats}
              onChange={setTeamStats}
              onRemove={() => setTeamStats(null)}
            />
          ) : (
            <AddBlockButton label={`Jugué con ${playerTeam.name}`} onClick={() => setTeamStats(emptyStats())} />
          ))}

          {/* Bloque comodín */}
          {otherStats ? (
            <StatsCard
              title="🎽 De comodín (con otro equipo)"
              stats={otherStats}
              onChange={setOtherStats}
              onRemove={playerTeam ? () => setOtherStats(null) : undefined}
            />
          ) : (
            <AddBlockButton
              label="También jugué de comodín con otro equipo"
              onClick={() => setOtherStats(emptyStats())}
            />
          )}

          <Button
            size="lg"
            variant={nothingToSave ? 'danger' : 'primary'}
            onClick={handleSave}
            isLoading={isSaving}
            disabled={nothingToSave && !hasSaved}
            className="w-full"
          >
            {nothingToSave ? '🗑️ Borrar stats de esta jornada' : hasSaved ? '💾 Actualizar total del día' : '💾 Guardar stats'}
          </Button>
        </>
      )}
    </div>
  );
}

function AddBlockButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl mb-4 text-sm font-semibold transition-all"
      style={{ border: '2px dashed #2A2D37', color: '#8B8FA3' }}
    >
      <Plus size={16} />
      {label}
    </button>
  );
}

function StatsCard({
  title, stats, onChange, onRemove,
}: {
  title: string;
  stats: StatsBlock;
  onChange: (s: StatsBlock) => void;
  onRemove?: () => void;
}) {
  const row = (field: keyof StatsBlock) => {
    const meta = STAT_META[field];
    return (
      <div key={field} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #2A2D37' }}>
        <div className="flex items-center gap-2">
          <span>{meta.emoji}</span>
          <div>
            <p className="text-sm font-medium text-white">{meta.label}</p>
            {meta.hint && <p className="text-[11px]" style={{ color: '#8B8FA3' }}>{meta.hint}</p>}
          </div>
        </div>
        <Counter value={stats[field]} onChange={(v) => onChange({ ...stats, [field]: v })} />
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-bold text-white">{title}</p>
        {onRemove && (
          <button onClick={onRemove} title="No jugué así">
            <X size={18} style={{ color: '#8B8FA3' }} />
          </button>
        )}
      </div>
      {REAL_STATS.map(row)}
      <p className="text-xs font-bold uppercase tracking-wider mt-4 mb-1 text-red-400">🎭 Aura negativa</p>
      {AURA_STATS.map(row)}
    </Card>
  );
}
