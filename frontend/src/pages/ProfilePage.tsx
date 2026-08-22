import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/users/me/stats')
      .then((res) => {
        setStats(res.data);
        setLoadingStats(false);
      })
      .catch((err) => {
        console.error('Error loading stats', err);
        setLoadingStats(false);
      });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Recargar para refrescar el usuario globalmente
      window.location.reload();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">Mi Perfil</h1>

      <Card className="mb-6">
        <div className="flex flex-col items-center justify-center text-center gap-4 py-4">
          <div 
            onClick={handleAvatarClick}
            className="w-32 h-32 rounded-full flex items-center justify-center text-4xl relative overflow-hidden cursor-pointer"
            style={{ backgroundColor: '#22252F', border: '4px solid #2D313F' }}
          >
            {uploading ? (
              <span className="text-sm text-gray-400">...</span>
            ) : user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white">{user?.displayName?.[0]?.toUpperCase() || '?'}</span>
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="text-sm font-bold text-white">Cambiar foto</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
          <div>
            <p className="font-bold text-white text-xl">{user?.displayName}</p>
            <p className="text-sm" style={{ color: '#8B8FA3' }}>{user?.email}</p>
          </div>
        </div>
      </Card>

      <h2 className="text-xl font-bold text-white mb-4">Estadísticas Históricas</h2>
      
      {loadingStats ? (
        <p className="text-gray-400">Cargando estadísticas...</p>
      ) : stats ? (
        <Card className="mb-8 p-0 overflow-hidden">
          <div className="divide-y divide-[#22252F]">
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-300 font-medium">Goles</span>
              <span className="text-xl font-bold text-green-400">{stats.goals}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-300 font-medium">Asistencias</span>
              <span className="text-xl font-bold text-blue-400">{stats.assists}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-300 font-medium">Goles Fallados</span>
              <span className="text-xl font-bold text-red-400">{stats.missedGoals}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-300 font-medium">Balones Afuera</span>
              <span className="text-xl font-bold text-purple-400">{stats.ballsOut}</span>
            </div>
            <div className="flex justify-between items-center p-4">
              <span className="text-gray-300 font-medium">Autogoles</span>
              <span className="text-xl font-bold text-yellow-400">{stats.ownGoals}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-[#22252F] bg-opacity-30">
              <span className="text-gray-300 font-medium">Partidos Jugados</span>
              <span className="text-xl font-bold text-white">{stats.matchesPlayed}</span>
            </div>
          </div>
        </Card>
      ) : (
        <p className="text-gray-400">No hay datos aún.</p>
      )}

      <Button variant="danger" size="lg" onClick={handleLogout} className="w-full">
        Cerrar sesión
      </Button>
    </div>
  );
}
