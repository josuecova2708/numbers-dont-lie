import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statsService } from '../../services/stats.service';
import { groupsService } from '../../services/groups.service';
import { matchDaysService } from '../../services/matchDays.service';
import type { Group, MatchDay, PlayerMatchStats } from '../../types';
import { Counter } from '../../components/ui/Counter';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ChevronLeft, Plus, X, User as UserIcon } from 'lucide-react';
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
  const { user } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [matchDay, setMatchDay] = useState<MatchDay | null>(null);
  const [allStats, setAllStats] = useState<PlayerMatchStats[]>([]);
  
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  
  const [teamStats, setTeamStats] = useState<StatsBlock>(defaultStats());
  const [otherStats, setOtherStats] = useState<StatsBlock | null>(null);
  const [showOther, setShowOther] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && !selectedPlayerId) setSelectedPlayerId(user.id);
  }, [user]);

  useEffect(() => {
    if (!groupId || !matchDayId) return;
    Promise.all([
      groupsService.getOne(groupId),
      matchDaysService.getOne(groupId, matchDayId) as Promise<MatchDay>,
      statsService.getAll(matchDayId), // Fetch all stats to be able to switch players
    ]).then(([g, md, stats]) => {
      setGroup(g);
      setMatchDay(md);
      setAllStats(stats);
    }).catch(console.error);
  }, [groupId, matchDayId]);

  // When selectedPlayerId or allStats changes, pre-fill form
  useEffect(() => {
    if (!selectedPlayerId) return;
    const playerStats = allStats.filter(s => s.playerId === selectedPlayerId);
    const teamEntry = playerStats.find(s => s.context === 'TEAM');
    const otherEntry = playerStats.find(s => s.context === 'OTHER');
    
    if (teamEntry) {
      setTeamStats({ goals: teamEntry.goals, assists: teamEntry.assists, missedGoals: teamEntry.missedGoals, ownGoals: teamEntry.ownGoals, ballsOut: teamEntry.ballsOut });
    } else {
      setTeamStats(defaultStats());
    }
    
    if (otherEntry) {
      setOtherStats({ goals: otherEntry.goals, assists: otherEntry.assists, missedGoals: otherEntry.missedGoals, ownGoals: otherEntry.ownGoals, ballsOut: otherEntry.ballsOut });
      setShowOther(true);
    } else {
      setOtherStats(null);
      setShowOther(false);
    }
  }, [selectedPlayerId, allStats]);

  const handleSave = async () => {
    if (!groupId || !matchDayId || !group || !selectedPlayerId) return;
    setIsSaving(true);
    try {
      const myTeamId = group.myTeamId;
      const playerStats = allStats.filter(s => s.playerId === selectedPlayerId);
      
      // Save/update TEAM stats
      const teamExisting = playerStats.find(s => s.context === 'TEAM');
      if (teamExisting) {
        await statsService.update(matchDayId, teamExisting.id, teamStats);
      } else {
        await statsService.create(matchDayId, { playerId: selectedPlayerId, context: 'TEAM', teamId: myTeamId, ...teamStats });
      }
      
      // Save/update OTHER stats
      if (showOther && otherStats) {
        const otherExisting = playerStats.find(s => s.context === 'OTHER');
        if (otherExisting) {
          await statsService.update(matchDayId, otherExisting.id, otherStats);
        } else {
          await statsService.create(matchDayId, { playerId: selectedPlayerId, context: 'OTHER', ...otherStats });
        }
      }
      toast.success('¡Stats guardadas! 🏆');
      navigate(/groups/ + groupId + /match-days/ + matchDayId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const myTeam = group?.teams.find(t => t.id === group.myTeamId);
  const isCaptain = group?.myRole === 'CAPTAIN' || group?.myRole === 'ORGANIZER';
  const teamMembers = group?.memberships?.filter(m => m.teamId === group.myTeamId) || [];

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

      {isCaptain && teamMembers.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon size={16} className="text-green-400" />
            <p className="font-bold text-white text-sm">Registrar stats para:</p>
          </div>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full bg-[#1A1D26] text-white border border-[#2D313F] rounded-lg p-3 text-sm focus:outline-none focus:border-green-400"
          >
            {teamMembers.map(m => (
              <option key={m.userId} value={m.userId}>
                {m.userId === user?.id ? 'Mis Stats (Yo)' : m.user.displayName}
              </option>
            ))}
          </select>
        </Card>
      )}

      {/* TEAM block */}
      <Card className="mb-4">
        <p className="font-bold text-white mb-4">
          🛡️ {myTeam?.name || 'Mi Equipo'}
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
            <p className="font-bold text-white">🎽 Otros</p>
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

      <Button size="lg" onClick={handleSave} isLoading={isSaving} className="w-full">
        💾 Guardar Stats
      </Button>
    </div>
  );
}

const STAT_META: Record<string, { label: string; emoji: string }> = {
  goals: { label: 'Goles', emoji: '⚽' },
  assists: { label: 'Asistencias', emoji: '👟' },
  missedGoals: { label: 'Goles cantados', emoji: '🤦‍♂️' },
  ownGoals: { label: 'Autogoles', emoji: '💀' },
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
