import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsService } from '../../services/groups.service';
import type { Group } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [recurrenceDay, setRecurrenceDay] = useState<number | undefined>(undefined);
  const [customCode, setCustomCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const loadData = () => {
    if (!groupId) return;
    groupsService
      .getOne(groupId)
      .then((g) => {
        setGroup(g);
        setName(g.name);
        setRecurrenceDay(g.recurrenceDay ?? undefined);
        setCustomCode(g.inviteCode);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const isOrganizer = group?.myRole === 'ORGANIZER';

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setIsSaving(true);
    try {
      await groupsService.update(groupId, {
        name: name.trim(),
        recurrenceDay: recurrenceDay ?? null as any,
      });
      toast.success('Configuración del grupo guardada');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!groupId) return;
    setIsRegenerating(true);
    try {
      await groupsService.regenerateCode(groupId, customCode.trim() || undefined);
      toast.success('Código de invitación actualizado');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar código');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción borrará todas las jornadas y estadísticas.')) {
      return;
    }
    try {
      await groupsService.delete(groupId);
      toast.success('Grupo eliminado');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al eliminar');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOrganizer) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
        <p className="text-3xl mb-2">🔒</p>
        <h2 className="text-lg font-bold text-white mb-2">Acceso restringido</h2>
        <p className="text-xs text-gray-400">Solo el Organizador del grupo puede modificar esta configuración.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      <h1 className="text-2xl font-bold text-white mb-6">Configuración del Grupo</h1>

      <div className="flex flex-col gap-6">
        {/* Basic Info */}
        <Card>
          <h2 className="font-bold text-white text-base mb-4">Información General</h2>
          <form onSubmit={handleUpdateGroup} className="flex flex-col gap-4">
            <Input
              label="Nombre del grupo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              maxLength={50}
            />

            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">Día de jornada semanal</label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRecurrenceDay(undefined)}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: recurrenceDay === undefined ? '#4ADE80' : '#22252F',
                    color: recurrenceDay === undefined ? '#000' : '#8B8FA3',
                    border: '1px solid #2A2D37',
                  }}
                >
                  Sin recurrencia
                </button>
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRecurrenceDay(i)}
                    className="py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: recurrenceDay === i ? '#4ADE80' : '#22252F',
                      color: recurrenceDay === i ? '#000' : '#8B8FA3',
                      border: '1px solid #2A2D37',
                    }}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" isLoading={isSaving} className="mt-2">
              Guardar Cambios
            </Button>
          </form>
        </Card>

        {/* Invite Code Customization */}
        <Card>
          <h2 className="font-bold text-white text-base mb-2">Código de Invitación</h2>
          <p className="text-xs text-gray-400 mb-4">
            Personaliza el código para compartirlo fácilmente con tus amigos.
          </p>

          <div className="flex flex-col gap-3">
            <Input
              label="Código actual / nuevo"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="MIERCOLES-5X5"
              maxLength={20}
            />
            <Button
              variant="secondary"
              onClick={handleRegenerateCode}
              isLoading={isRegenerating}
            >
              <RefreshCw size={16} /> Actualizar Código
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card style={{ borderColor: '#F8717140' }}>
          <h2 className="font-bold text-red-400 text-base mb-1">Zona de Peligro</h2>
          <p className="text-xs text-gray-400 mb-4">
            Eliminar el grupo borrará permanentemente los equipos, jornadas y estadísticas registradas.
          </p>
          <Button variant="danger" size="md" onClick={handleDeleteGroup}>
            <Trash2 size={16} /> Eliminar Grupo
          </Button>
        </Card>
      </div>
    </div>
  );
}
