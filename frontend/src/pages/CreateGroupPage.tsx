import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsService } from '../services/groups.service';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function CreateGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [recurrenceDay, setRecurrenceDay] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const group = await groupsService.create(
        name,
        recurrenceDay,
        inviteCode.trim() || undefined,
      );
      toast.success(`¡Grupo "${group.name}" creado!`);
      navigate(`/groups/${group.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear grupo');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto" style={{ minHeight: '100vh', backgroundColor: '#0F1117' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Crear Grupo</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Nombre del grupo"
          placeholder="Fútbol Miércoles"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={50}
        />

        <Input
          label="Código de invitación (opcional)"
          placeholder="Se genera automáticamente"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={20}
        />
        <p className="text-xs -mt-3" style={{ color: '#8B8FA3' }}>
          Si lo dejas vacío, se genera un código automático que luego puedes personalizar.
        </p>

        {/* Recurrence day */}
        <div>
          <p className="text-sm font-medium mb-2" style={{ color: '#8B8FA3' }}>Día de jornada semanal</p>
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

        <Button type="submit" size="lg" isLoading={isLoading} className="mt-2">
          Crear Grupo ⚽
        </Button>
      </form>
    </div>
  );
}
