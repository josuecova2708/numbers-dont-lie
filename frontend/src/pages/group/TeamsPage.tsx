import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { teamsService } from '../../services/teams.service';
import { groupsService } from '../../services/groups.service';
import type { Team, Membership, Group, GroupRole } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const TEAM_COLORS = [
  '#4ADE80', // green
  '#60A5FA', // blue
  '#FB923C', // orange
  '#F87171', // red
  '#FACC15', // yellow
  '#C084FC', // purple
  '#38BDF8', // sky
  '#F472B6', // pink
];

export function TeamsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Team Modal / Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(TEAM_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Edit member assignment state
  const [selectedMember, setSelectedMember] = useState<Membership | null>(null);
  const [assignTeamId, setAssignTeamId] = useState<string>('');
  const [assignRole, setAssignRole] = useState<GroupRole>('PLAYER');
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  const loadData = () => {
    if (!groupId) return;
    Promise.all([
      groupsService.getOne(groupId),
      teamsService.getTeams(groupId),
      teamsService.getMembers(groupId),
    ])
      .then(([g, t, m]) => {
        setGroup(g);
        setTeams(t);
        setMembers(m);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const isOrganizer = group?.myRole === 'ORGANIZER';

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !newTeamName.trim()) return;
    if (teams.length >= 10) {
      toast.error('Has alcanzado el límite máximo de 10 equipos');
      return;
    }
    setIsCreating(true);
    try {
      await teamsService.createTeam(groupId, {
        name: newTeamName.trim(),
        color: newTeamColor,
      });
      toast.success(`Equipo "${newTeamName}" creado con éxito`);
      setNewTeamName('');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear equipo');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!groupId) return;
    if (!confirm(`¿Eliminar equipo "${teamName}"? Los miembros pasarán a estar sin equipo.`)) return;
    try {
      await teamsService.deleteTeam(groupId, teamId);
      toast.success('Equipo eliminado');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar equipo');
    }
  };

  const openMemberModal = (member: Membership) => {
    setSelectedMember(member);
    setAssignTeamId(member.teamId || '');
    setAssignRole(member.role);
  };

  const handleSaveMember = async () => {
    if (!groupId || !selectedMember) return;
    setIsUpdatingMember(true);
    try {
      await teamsService.updateMember(groupId, selectedMember.userId, {
        teamId: assignTeamId ? assignTeamId : null,
        role: assignRole,
      });
      toast.success('Miembro actualizado');
      setSelectedMember(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar miembro');
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const unassignedMembers = members.filter((m) => !m.teamId);

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Equipos y Plantillas</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8B8FA3' }}>
            {teams.length}/10 Equipos · {members.length} Jugadores
          </p>
        </div>
        {isOrganizer && teams.length < 10 && (
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Crear Equipo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Teams List */}
          {teams.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-4xl mb-2">🛡️</p>
              <p className="font-semibold text-white">Aún no hay equipos creados</p>
              <p className="text-xs mt-1" style={{ color: '#8B8FA3' }}>
                {isOrganizer
                  ? 'Crea hasta 10 equipos para organizar el torneo'
                  : 'El organizador creará los equipos pronto'}
              </p>
              {isOrganizer && (
                <Button size="sm" className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} /> Crear primer equipo
                </Button>
              )}
            </Card>
          ) : (
            teams.map((team) => {
              const teamMembers = members.filter((m) => m.teamId === team.id);
              return (
                <Card key={team.id}>
                  {/* Team Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: team.color || '#4ADE80' }}
                      />
                      <h2 className="font-bold text-white text-base">{team.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                        {teamMembers.length} jug.
                      </span>
                    </div>
                    {isOrganizer && (
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-gray-500 hover:text-red-400 p-1"
                        title="Eliminar equipo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Team Members */}
                  <div className="flex flex-col gap-2">
                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-gray-500 py-1">Sin jugadores asignados</p>
                    ) : (
                      teamMembers.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-[#22252F]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {m.user?.displayName}
                            </span>
                            {m.role === 'CAPTAIN' && (
                              <Badge color="blue">Capitán</Badge>
                            )}
                            {m.role === 'ORGANIZER' && (
                              <Badge color="yellow">Org</Badge>
                            )}
                          </div>
                          {isOrganizer && (
                            <button
                              onClick={() => openMemberModal(m)}
                              className="text-xs text-green-400 hover:underline"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })
          )}

          {/* Unassigned Members Section */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <span>👥</span> Sin Equipo Asignado ({unassignedMembers.length})
              </h2>
            </div>
            {unassignedMembers.length === 0 ? (
              <p className="text-xs text-gray-500">Todos los jugadores tienen equipo asignado 🎉</p>
            ) : (
              <div className="flex flex-col gap-2">
                {unassignedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#22252F]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{m.user?.displayName}</p>
                      <Badge color={m.role === 'ORGANIZER' ? 'yellow' : 'gray'}>
                        {m.role === 'ORGANIZER' ? 'Organizador' : 'Jugador'}
                      </Badge>
                    </div>
                    {isOrganizer && (
                      <Button size="sm" variant="secondary" onClick={() => openMemberModal(m)}>
                        Asignar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Modal: Create Team */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Crear Nuevo Equipo</h3>
            <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
              <Input
                label="Nombre del Equipo"
                placeholder="Ej: Los Galácticos"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                required
                maxLength={30}
                autoFocus
              />

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1.5 block">Color del Equipo</label>
                <div className="flex items-center gap-2">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTeamColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newTeamColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isCreating}>
                  Crear
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Edit Member Role / Team */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-1">
              Editar Jugador: {selectedMember.user?.displayName}
            </h3>
            <p className="text-xs text-gray-400 mb-4">Asigna un equipo y rol en este grupo</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Equipo</label>
                <select
                  value={assignTeamId}
                  onChange={(e) => setAssignTeamId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none bg-[#22252F] border border-[#2A2D37]"
                >
                  <option value="">-- Sin equipo --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-400 mb-1 block">Rol en el Grupo</label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value as GroupRole)}
                  className="w-full px-3 py-2.5 rounded-xl text-white text-sm outline-none bg-[#22252F] border border-[#2A2D37]"
                >
                  <option value="PLAYER">Jugador</option>
                  <option value="CAPTAIN">Capitán (puede auditar stats de su equipo)</option>
                  <option value="ORGANIZER">Organizador (control total)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedMember(null)}
                  disabled={isUpdatingMember}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveMember} isLoading={isUpdatingMember}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
