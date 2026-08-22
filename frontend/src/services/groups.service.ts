import api from './api';
import type { Group } from '../types';

export const groupsService = {
  create: async (name: string, recurrenceDay?: number, inviteCode?: string): Promise<Group> => {
    const { data } = await api.post<Group>('/groups', { name, recurrenceDay, inviteCode });
    return data;
  },

  getMyGroups: async (): Promise<Group[]> => {
    const { data } = await api.get<Group[]>('/groups');
    return data;
  },

  getOne: async (groupId: string): Promise<Group> => {
    const { data } = await api.get<Group>(`/groups/${groupId}`);
    return data;
  },

  join: async (inviteCode: string) => {
    const { data } = await api.post('/groups/join', { inviteCode });
    return data;
  },

  update: async (groupId: string, payload: Partial<Group>) => {
    const { data } = await api.patch(`/groups/${groupId}`, payload);
    return data;
  },

  regenerateCode: async (groupId: string, inviteCode?: string) => {
    const { data } = await api.post(`/groups/${groupId}/regenerate-code`, { inviteCode });
    return data;
  },

  delete: async (groupId: string) => {
    await api.delete(`/groups/${groupId}`);
  },
};
