// ─── Enums ───────────────────────────────────────────────
export type GroupRole = 'ORGANIZER' | 'CAPTAIN' | 'PLAYER';
export type MatchDayStatus = 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type StatsContext = 'TEAM' | 'OTHER';

// ─── Models ──────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color?: string;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  recurrenceDay?: number;
  createdAt: string;
  teams: Team[];
  memberships?: Membership[];
  myRole?: GroupRole;
  myTeamId?: string;
}

export interface Membership {
  id: string;
  userId: string;
  groupId: string;
  teamId?: string;
  role: GroupRole;
  user: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  team?: Pick<Team, 'id' | 'name' | 'color'>;
}

export interface MatchDay {
  id: string;
  groupId: string;
  label: string;
  date: string;
  status: MatchDayStatus;
  createdAt: string;
  _count?: { stats: number };
}

export interface PlayerMatchStats {
  id: string;
  playerId: string;
  matchDayId: string;
  teamId?: string;
  context: StatsContext;
  goals: number;
  assists: number;
  missedGoals: number;
  ownGoals: number;
  ballsOut: number;
  player?: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  team?: Pick<Team, 'id' | 'name' | 'color'>;
}

// ─── Leaderboard ─────────────────────────────────────────
export interface PlayerRankingEntry {
  player: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  team?: Pick<Team, 'id' | 'name' | 'color'> | null;
  goals: number;
  assists: number;
  missedGoals: number;
  ownGoals: number;
  ballsOut: number;
}

export interface TeamStandingEntry {
  team: Pick<Team, 'id' | 'name' | 'color'>;
  goals: number;
  assists: number;
}

export interface FunnyEntry {
  player: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
  missedGoals: number;
  ownGoals: number;
  ballsOut: number;
  total: number;
}

// ─── Auth ─────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  user: User;
}
