import api from './api';
import type { PlayerRankingEntry, TeamStandingEntry, FunnyEntry } from '../types';

export const leaderboardService = {
  getPlayerRanking: async (groupId: string, matchDayId?: string): Promise<PlayerRankingEntry[]> => {
    const params = matchDayId ? `?matchDayId=${matchDayId}` : '';
    const { data } = await api.get<PlayerRankingEntry[]>(`/groups/${groupId}/leaderboard${params}`);
    return data;
  },

  getTeamStandings: async (groupId: string): Promise<TeamStandingEntry[]> => {
    const { data } = await api.get<TeamStandingEntry[]>(`/groups/${groupId}/leaderboard/teams`);
    return data;
  },

  getFunnyLeaderboard: async (groupId: string, matchDayId?: string): Promise<FunnyEntry[]> => {
    const params = matchDayId ? `?matchDayId=${matchDayId}` : '';
    const { data } = await api.get<FunnyEntry[]>(`/groups/${groupId}/leaderboard/funny${params}`);
    return data;
  },
};
