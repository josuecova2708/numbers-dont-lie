import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsService } from '../../services/groups.service';
import { matchDaysService } from '../../services/matchDays.service';
import type { Group, MatchDay } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ChevronRight, Zap, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada',
  ACTIVE: 'Activa',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  SCHEDULED: 'blue',
  ACTIVE: 'green',
  COMPLETED: 'gray',
  CANCELLED: 'red',
};

export function MatchDaysPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Manual create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreating, setIsCreating] = useState(false);

  const load = () => {
    if (!groupId) return;
    Promise.all([
      groupsService.getOne(groupId),
      matchDaysService.getAll(groupId),
    ])
      .then(([g, mds]) => {
        setGroup(g);
        setMatchDays(mds);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const handleGenerateRecurring = async () => {
    if (!groupId) return;
    try {
      await matchDaysService.generateRecurring(groupId, 8);
      toast.success('Jornadas generadas para las próximas 8 semanas ⚡');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al generar jornadas');
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !newLabel.trim()) return;
    setIsCreating(true);
    try {
      await matchDaysService.create(groupId, newLabel.trim(), new Date(newDate).toISOString());
      toast.success('Jornada creada con éxito');
      setNewLabel('');
      setShowCreateModal(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear jornada');
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivate = async (md: MatchDay) => {
    if (!groupId) return;
    try {
      await matchDaysService.updateStatus(groupId, md.id, 'ACTIVE');
      toast.success('¡Jornada activada!');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleCancel = async (md: MatchDay) => {
    if (!groupId) return;
    try {
      await matchDaysService.updateStatus(groupId, md.id, 'CANCELLED');
      toast.success('Jornada cancelada');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const isOrganizer = group?.myRole === 'ORGANIZER';

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Jornadas</h1>
          <p className="text-xs text-gray-400 mt-0.5">{matchDays.length} jornadas registradas</p>
        </div>
        {isOrganizer && (
          <div className="flex gap-2">
            {group?.recurrenceDay !== null && group?.recurrenceDay !== undefined && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleGenerateRecurring}
                title="Generar próximas 8 semanas"
              >
                <Zap size={14} className="text-yellow-400" /> Auto
              </Button>
            )}
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} /> Nueva
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : matchDays.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-4xl mb-2">📅</p>
          <p className="font-semibold text-white">Sin jornadas todavía</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {isOrganizer
              ? 'Puedes generar automáticamente las semanas programadas o crear una personalizada'
              : 'El organizador publicará las jornadas pronto'}
          </p>
          {isOrganizer && (
            <div className="flex justify-center gap-2">
              {group?.recurrenceDay !== null && group?.recurrenceDay !== undefined && (
                <Button size="sm" onClick={handleGenerateRecurring}>
                  <Zap size={14} /> Generar Recurrentes
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} /> Crear Manual
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {matchDays.map((md) => (
            <Card key={md.id} onClick={() => navigate(`/groups/${groupId}/match-days/${md.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={STATUS_COLOR[md.status]}>{STATUS_LABEL[md.status]}</Badge>
                    {md._count && (
                      <span className="text-xs" style={{ color: '#8B8FA3' }}>
                        {md._count.stats} registros
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white text-sm">{md.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isOrganizer && md.status === 'SCHEDULED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(md);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold text-green-400 hover:bg-green-400/20 transition-all border border-green-400/30"
                    >
                      Activar
                    </button>
                  )}
                  {isOrganizer && md.status === 'SCHEDULED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancel(md);
                      }}
                      className="text-xs px-2 py-1 rounded-lg font-semibold text-red-400 hover:bg-red-400/20 transition-all"
                      title="Cancelar jornada"
                    >
                      ✕
                    </button>
                  )}
                  <ChevronRight size={16} style={{ color: '#8B8FA3' }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create Manual MatchDay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Nueva Jornada</h3>
            <form onSubmit={handleCreateManual} className="flex flex-col gap-4">
              <Input
                label="Título / Etiqueta"
                placeholder="Ej: Jornada - Miércoles 21 de Agosto"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
                autoFocus
              />
              <Input
                label="Fecha"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
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
                  Crear Jornada
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
