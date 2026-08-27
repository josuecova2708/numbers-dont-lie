import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { leaderboardService } from '../../services/leaderboard.service';
import type { PlayerRankingEntry, TeamStandingEntry, FunnyEntry } from '../../types';
import { Card } from '../../components/ui/Card';

type Tab = 'players' | 'teams' | 'funny';

export function LeaderboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [tab, setTab] = useState<Tab>('players');
  const [players, setPlayers] = useState<PlayerRankingEntry[]>([]);
  const [teams, setTeams] = useState<TeamStandingEntry[]>([]);
  const [funny, setFunny] = useState<FunnyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    setIsLoading(true);
    Promise.all([
      leaderboardService.getPlayerRanking(groupId),
      leaderboardService.getTeamStandings(groupId),
      leaderboardService.getFunnyLeaderboard(groupId),
    ])
      .then(([p, t, f]) => {
        setPlayers(p);
        setTeams(t);
        setFunny(f);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [groupId]);

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'players', label: 'Jugadores', icon: '⚽' },
    { key: 'teams', label: 'Equipos', icon: '🛡️' },
    { key: 'funny', label: 'Aura Negativa', icon: '🎭' },
  ];

  const getRankBadge = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>🏆</span> Tabla de Posiciones
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Estadísticas acumuladas del torneo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: tab === key ? '#4ADE80' : '#22252F',
              color: tab === key ? '#0F1117' : '#8B8FA3',
              border: '1px solid #2A2D37',
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: PLAYERS RANKING */}
          {tab === 'players' && (
            <div className="flex flex-col gap-3">
              {/* Leader card if players exist */}
              {players.length > 0 && (
                <Card className="border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">👑</span>
                      <div>
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                          Pichichi / Máximo Goleador
                        </span>
                        <p className="text-lg font-bold text-white">{players[0].player?.displayName}</p>
                        <p className="text-xs text-gray-400">{players[0].team?.name || 'Sin equipo'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-green-400">{players[0].goals}</span>
                      <p className="text-xs text-gray-400">Goles totales</p>
                    </div>
                  </div>
                </Card>
              )}

              <Card>
                <div className="grid grid-cols-12 text-xs font-bold mb-3 px-2 text-gray-400 border-b border-gray-800 pb-2">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-5">Jugador</div>
                  <div className="col-span-3 text-center">Equipo</div>
                  <div className="col-span-3 text-right">⚽ / 👟</div>
                </div>

                {players.length === 0 ? (
                  <p className="text-center py-8 text-xs text-gray-500">Sin estadísticas registradas aún</p>
                ) : (
                  players.map((p, i) => (
                    <div
                      key={p.player?.id || i}
                      className="grid grid-cols-12 items-center py-2.5 px-2 rounded-lg hover:bg-[#22252F]/50 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #22252F' : 'none' }}
                    >
                      <div className="col-span-1 text-center text-sm font-bold">
                        {getRankBadge(i)}
                      </div>
                      <div className="col-span-5 flex flex-col pl-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {p.player?.displayName}
                        </span>
                      </div>
                      <div className="col-span-3 text-center">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium truncate inline-block max-w-full"
                          style={{
                            backgroundColor: p.team?.color ? `${p.team.color}20` : '#22252F',
                            color: p.team?.color || '#8B8FA3',
                          }}
                        >
                          {p.team?.name || 'Comodín'}
                        </span>
                      </div>
                      <div className="col-span-3 text-right font-mono">
                        <span className="font-bold text-green-400 text-sm">{p.goals}</span>
                        <span className="text-gray-500 mx-1">/</span>
                        <span className="font-bold text-blue-400 text-sm">{p.assists}</span>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}

          {/* TAB 2: TEAMS STANDINGS */}
          {tab === 'teams' && (
            <div className="flex flex-col gap-3">
              <Card>
                <div className="grid grid-cols-12 text-xs font-bold mb-3 px-2 text-gray-400 border-b border-gray-800 pb-2">
                  <div className="col-span-2 text-center">#</div>
                  <div className="col-span-6">Equipo</div>
                  <div className="col-span-2 text-center">⚽ Goles</div>
                  <div className="col-span-2 text-center">👟 Asist.</div>
                </div>

                {teams.length === 0 ? (
                  <p className="text-center py-8 text-xs text-gray-500">Sin estadísticas de equipo aún</p>
                ) : (
                  teams.map((t, i) => (
                    <div
                      key={t.team?.id || i}
                      className="grid grid-cols-12 items-center py-3 px-2 rounded-lg hover:bg-[#22252F]/50 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #22252F' : 'none' }}
                    >
                      <div className="col-span-2 text-center text-sm font-bold">
                        {getRankBadge(i)}
                      </div>
                      <div className="col-span-6 flex items-center gap-2">
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.team?.color || '#4ADE80' }}
                        />
                        <span className="text-sm font-bold text-white truncate">{t.team?.name}</span>
                      </div>
                      <div className="col-span-2 text-center font-bold text-green-400 text-sm">
                        {t.goals}
                      </div>
                      <div className="col-span-2 text-center font-bold text-blue-400 text-sm">
                        {t.assists}
                      </div>
                    </div>
                  ))
                )}
              </Card>
              <p className="text-xs text-center text-gray-500">
                * Solo se contabilizan los goles anotados para el equipo oficial
              </p>
            </div>
          )}

          {/* TAB 3: FUNNY LEADERBOARD */}
          {tab === 'funny' && (
            <div className="flex flex-col gap-3">
              {/* Legend */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
                <div className="p-2 rounded-xl bg-[#1A1D26] border border-[#2A2D37]">
                  <span className="text-base block mb-0.5">❌</span>
                  <span>Goles Cantados</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1A1D26] border border-[#2A2D37]">
                  <span className="text-base block mb-0.5">🤦</span>
                  <span>Autogoles</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1A1D26] border border-[#2A2D37]">
                  <span className="text-base block mb-0.5">🚀</span>
                  <span>Balones Botados</span>
                </div>
              </div>

              <Card>
                <div className="grid grid-cols-12 text-xs font-bold mb-3 px-2 text-gray-400 border-b border-gray-800 pb-2">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-5">Víctima</div>
                  <div className="col-span-2 text-center">❌</div>
                  <div className="col-span-2 text-center">🤦</div>
                  <div className="col-span-2 text-center">🚀</div>
                </div>

                {funny.length === 0 ? (
                  <p className="text-center py-8 text-xs text-gray-500">Sin bloopers registrados aún</p>
                ) : (
                  funny.map((f, i) => (
                    <div
                      key={f.player?.id || i}
                      className="grid grid-cols-12 items-center py-2.5 px-2 rounded-lg hover:bg-[#22252F]/50 transition-colors"
                      style={{ borderTop: i > 0 ? '1px solid #22252F' : 'none' }}
                    >
                      <div className="col-span-1 text-center text-sm font-bold">
                        {i === 0 ? '🪵' : `#${i + 1}`}
                      </div>
                      <div className="col-span-5 flex flex-col pl-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {f.player?.displayName}
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] text-red-400 font-bold uppercase">
                            Premio Tronco de Oro
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-bold text-red-400 text-sm">
                        {f.missedGoals}
                      </div>
                      <div className="col-span-2 text-center font-bold text-orange-400 text-sm">
                        {f.ownGoals}
                      </div>
                      <div className="col-span-2 text-center font-bold text-purple-400 text-sm">
                        {f.ballsOut}
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
