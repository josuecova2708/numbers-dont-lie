import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { statsService } from '../../services/stats.service';
import { groupsService } from '../../services/groups.service';
import { matchDaysService } from '../../services/matchDays.service';
import type { Group, MatchDay, PlayerMatchStats } from '../../types';
import { Counter } from '../../components/ui/Counter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ChevronLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface StatsBlock {
  goals: number;
  assists: number;
  missedGoals: number;
  ownGoals: number;
  ballsOut: number;
}

const defaultStats = (): StatsBlock => ({
  goals: 0, assists: 0, missedGoals: 0, ownGoals: 0, ballsOut: 0,
});

export function StatsFormPage() {
  const { groupId, matchDayId } = useParams<{ groupId: string; matchDayId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [matchDay, setMatchDay] = useState<MatchDay | null>(null);
  const [existing, setExisting] = useState<PlayerMatchStats[]>([]);
  const [teamStats, setTeamStats] = useState<StatsBlock>(defaultStats());
  const [otherStats, setOtherStats] = useState<StatsBlock | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!groupId || !matchDayId) return;
    Promise.all([
      groupsService.getOne(groupId),
      matchDaysService.getOne(groupId, matchDayId) as Promise<MatchDay>,
      statsService.getMyStats(matchDayId),
    ]).then(([g, md, myStats]) => {
      setGroup(g);
      setMatchDay(md);
      setExisting(myStats);
      // Pre-fill if already has stats
      const teamEntry = myStats.find(s => s.context === 'TEAM');
      const otherEntry = myStats.find(s => s.context === 'OTHER');
      if (teamEntry) {
        setTeamStats({ goals: teamEntry.goals, assists: teamEntry.assists, missedGoals: teamEntry.missedGoals, ownGoals: teamEntry.ownGoals, ballsOut: teamEntry.ballsOut });
      }
      if (otherEntry) {
        setOtherStats({ goals: otherEntry.goals, assists: otherEntry.assists, missedGoals: otherEntry.missedGoals, ownGoals: otherEntry.ownGoals, ballsOut: otherEntry.ballsOut });
        setShowOther(true);
      }
    }).catch(console.error);
  }, [groupId, matchDayId]);

  const handleSave = async () => {
    if (!matchDayId || !group) return;
    setIsSaving(true);
    try {
      const myTeamId = group.myTeamId;
      // Save/update TEAM stats
      const teamExisting = existing.find(s => s.context === 'TEAM');
      if (teamExisting) {
        await statsService.update(matchDayId, teamExisting.id, teamStats);
      } else {
        await statsService.create(matchDayId, { context: 'TEAM', teamId: myTeamId, ...teamStats });
      }
      // Save/update OTHER stats
      if (showOther && otherStats) {
        const otherExisting = existing.find(s => s.context === 'OTHER');
        if (otherExisting) {
          await statsService.update(matchDayId, otherExisting.id, otherStats);
        } else {
          await statsService.create(matchDayId, { context: 'OTHER', ...otherStats });
        }
      }
      toast.success('¡Stats guardadas! 🎉');
      navigate(`/groups/${groupId}/match-days/${matchDayId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const myTeam = group?.teams.find(t => t.id === group.myTeamId);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">¿Cómo te fue hoy?</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA3' }}>{matchDay?.label}</p>
        </div>
      </div>

      {/* TEAM block */}
      <Card className="mb-4">
        <p className="font-bold text-white mb-4">
          🏅 {myTeam?.name || 'Mi Equipo'}
        </p>
        {(['goals', 'assists', 'missedGoals', 'ownGoals', 'ballsOut'] as const).map((field) => (
          <StatRow
            key={field}
            field={field}
            value={teamStats[field]}
            onChange={(v) => setTeamStats(prev => ({ ...prev, [field]: v }))}
          />
        ))}
      </Card>

      {/* OTHER block */}
      {showOther && otherStats ? (
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-white">🎭 Otros</p>
            <button onClick={() => { setShowOther(false); setOtherStats(null); }}>
              <X size={18} style={{ color: '#8B8FA3' }} />
            </button>
          </div>
          {(['goals', 'assists', 'missedGoals', 'ownGoals', 'ballsOut'] as const).map((field) => (
            <StatRow
              key={field}
              field={field}
              value={otherStats[field]}
              onChange={(v) => setOtherStats(prev => ({ ...prev!, [field]: v }))}
            />
          ))}
        </Card>
      ) : (
        <button
          onClick={() => { setShowOther(true); setOtherStats(defaultStats()); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl mb-4 text-sm font-semibold transition-all"
          style={{ border: '2px dashed #2A2D37', color: '#8B8FA3' }}
        >
          <Plus size={16} />
          Añadir estadísticas en Otros
        </button>
      )}

      <Button size="lg" onClick={handleSave} isLoading={isSaving}>
        💾 Guardar Stats
      </Button>
    </div>
  );
}

const STAT_META: Record<string, { label: string; emoji: string }> = {
  goals: { label: 'Goles', emoji: '⚽' },
  assists: { label: 'Asistencias', emoji: '👟' },
  missedGoals: { label: 'Goles cantados', emoji: '❌' },
  ownGoals: { label: 'Autogoles', emoji: '🤦' },
  ballsOut: { label: 'Balones afuera', emoji: '🚀' },
};

function StatRow({ field, value, onChange }: { field: string; value: number; onChange: (v: number) => void }) {
  const meta = STAT_META[field];
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #2A2D37' }}>
      <div className="flex items-center gap-2">
        <span>{meta.emoji}</span>
        <span className="text-sm font-medium text-white">{meta.label}</span>
      </div>
      <Counter value={value} onChange={onChange} />
    </div>
  );
}
