export type StatField = 'goals' | 'assists' | 'missedGoals' | 'ownGoals' | 'ballsOut';

export interface StatsBlock {
  goals: number;
  assists: number;
  missedGoals: number;
  ownGoals: number;
  ballsOut: number;
}

export const emptyStats = (): StatsBlock => ({
  goals: 0, assists: 0, missedGoals: 0, ownGoals: 0, ballsOut: 0,
});

// Una sola fuente de etiquetas/emojis para formulario, detalle, ranking y perfil
export const STAT_META: Record<StatField, { label: string; short: string; emoji: string; hint?: string }> = {
  goals: { label: 'Goles', short: 'Goles', emoji: '⚽' },
  assists: { label: 'Asistencias', short: 'Asist.', emoji: '👟' },
  missedGoals: { label: 'Goles fallados', short: 'Fallados', emoji: '❌', hint: 'Goles cantados que se te fueron' },
  ownGoals: { label: 'Autogoles', short: 'Autogoles', emoji: '🤦' },
  ballsOut: { label: 'Balones afuera', short: 'Afuera', emoji: '🚀', hint: 'Balones botados de la cancha' },
};

export const REAL_STATS: StatField[] = ['goals', 'assists'];
export const AURA_STATS: StatField[] = ['missedGoals', 'ownGoals', 'ballsOut'];
