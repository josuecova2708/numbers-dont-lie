import api from './api';
import type { MatchDay } from '../types';

export const matchDaysService = {
  create: async (groupId: string, label: string, date: string): Promise<MatchDay> => {
    const { data } = await api.post<MatchDay>(`/groups/${groupId}/match-days`, { label, date });
    return data;
  },

  getAll: async (groupId: string): Promise<MatchDay[]> => {
    const { data } = await api.get<MatchDay[]>(`/groups/${groupId}/match-days`);
    return data;
  },

  getActive: async (groupId: string): Promise<MatchDay | null> => {
    const { data } = await api.get<MatchDay>(`/groups/${groupId}/match-days/active`);
    return data;
  },

  getOne: async (groupId: string, matchDayId: string): Promise<MatchDay> => {
    const { data } = await api.get<MatchDay>(`/groups/${groupId}/match-days/${matchDayId}`);
    return data;
  },

  updateStatus: async (groupId: string, matchDayId: string, status: string): Promise<MatchDay> => {
    const { data } = await api.patch<MatchDay>(`/groups/${groupId}/match-days/${matchDayId}`, { status });
    return data;
  },

  generateRecurring: async (groupId: string, weeksAhead: number): Promise<MatchDay[]> => {
    const { data } = await api.post<MatchDay[]>(`/groups/${groupId}/match-days/generate-recurring`, { weeksAhead });
    return data;
  },
};
