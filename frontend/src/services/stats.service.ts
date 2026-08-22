import api from './api';
import type { PlayerMatchStats } from '../types';
import type { StatsContext } from '../types';

interface CreateStatsPayload {
  context: StatsContext;
  teamId?: string;
  goals?: number;
  assists?: number;
  missedGoals?: number;
  ownGoals?: number;
  ballsOut?: number;
}

interface UpdateStatsPayload {
  goals?: number;
  assists?: number;
  missedGoals?: number;
  ownGoals?: number;
  ballsOut?: number;
}

export const statsService = {
  create: async (matchDayId: string, payload: CreateStatsPayload): Promise<PlayerMatchStats> => {
    const { data } = await api.post<PlayerMatchStats>(`/match-days/${matchDayId}/stats`, payload);
    return data;
  },

  getAll: async (matchDayId: string): Promise<PlayerMatchStats[]> => {
    const { data } = await api.get<PlayerMatchStats[]>(`/match-days/${matchDayId}/stats`);
    return data;
  },

  getMyStats: async (matchDayId: string): Promise<PlayerMatchStats[]> => {
    const { data } = await api.get<PlayerMatchStats[]>(`/match-days/${matchDayId}/stats/me`);
    return data;
  },

  update: async (matchDayId: string, statId: string, payload: UpdateStatsPayload): Promise<PlayerMatchStats> => {
    const { data } = await api.patch<PlayerMatchStats>(`/match-days/${matchDayId}/stats/${statId}`, payload);
    return data;
  },

  delete: async (matchDayId: string, statId: string): Promise<void> => {
    await api.delete(`/match-days/${matchDayId}/stats/${statId}`);
  },
};
