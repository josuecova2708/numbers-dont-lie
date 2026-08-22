import api from './api';
import type { Team, Membership, GroupRole } from '../types';

export interface CreateTeamPayload {
  name: string;
  color?: string;
}

export interface UpdateMembershipPayload {
  teamId?: string | null;
  role?: GroupRole;
}

export const teamsService = {
  getTeams: async (groupId: string): Promise<Team[]> => {
    const { data } = await api.get<Team[]>(`/groups/${groupId}/teams`);
    return data;
  },

  createTeam: async (groupId: string, payload: CreateTeamPayload): Promise<Team> => {
    const { data } = await api.post<Team>(`/groups/${groupId}/teams`, payload);
    return data;
  },

  updateTeam: async (groupId: string, teamId: string, payload: Partial<CreateTeamPayload>): Promise<Team> => {
    const { data } = await api.patch<Team>(`/groups/${groupId}/teams/${teamId}`, payload);
    return data;
  },

  deleteTeam: async (groupId: string, teamId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/teams/${teamId}`);
  },

  getMembers: async (groupId: string): Promise<Membership[]> => {
    const { data } = await api.get<Membership[]>(`/groups/${groupId}/members`);
    return data;
  },

  updateMember: async (groupId: string, userId: string, payload: UpdateMembershipPayload): Promise<Membership> => {
    const { data } = await api.patch<Membership>(`/groups/${groupId}/members/${userId}`, payload);
    return data;
  },

  removeMember: async (groupId: string, userId: string): Promise<void> => {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },
};
