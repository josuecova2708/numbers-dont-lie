import { MatchDayStatus } from '@prisma/client';

// Las jornadas se razonan por DÍA CALENDARIO en la zona horaria del grupo,
// nunca por timestamp exacto (el servidor corre en UTC).
export const DEFAULT_TIMEZONE = 'America/Caracas';

export function appTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TIMEZONE;
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Fecha local `YYYY-MM-DD` de un instante en la zona horaria dada. */
export function localDateKey(date: Date, tz: string = appTimezone()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function keyToUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftKey(key: string, days: number): string {
  const d = keyToUtc(key);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToKey(d);
}

export function weekdayOfKey(key: string): number {
  return keyToUtc(key).getUTCDay();
}

function tzOffsetMinutes(date: Date, tz: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - date.getTime()) / 60000;
}

/** Instante que corresponde al mediodía local del día `key`. */
export function localNoon(key: string, tz: string = appTimezone()): Date {
  const guess = keyToUtc(key);
  guess.setUTCHours(12);
  return new Date(guess.getTime() - tzOffsetMinutes(guess, tz) * 60000);
}

export function formatMatchDayLabel(key: string): string {
  const d = keyToUtc(key);
  return `Jornada - ${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTH_NAMES[d.getUTCMonth()]}`;
}

/** Una jornada acepta stats si no está cancelada y su día ya llegó (sin fecha de vencimiento). */
export function acceptsStats(
  md: { date: Date; status: MatchDayStatus },
  now: Date = new Date(),
  tz: string = appTimezone(),
): boolean {
  return md.status !== MatchDayStatus.CANCELLED && localDateKey(md.date, tz) <= localDateKey(now, tz);
}

/**
 * Jornada "actual": la más reciente no cancelada cuyo día ya llegó
 * (así el jueves de madrugada sigue siendo la del miércoles).
 * Si todavía no se ha jugado ninguna, la próxima.
 */
export function pickCurrentMatchDay<T extends { date: Date; status: MatchDayStatus }>(
  matchDays: T[],
  now: Date = new Date(),
  tz: string = appTimezone(),
): T | null {
  const today = localDateKey(now, tz);
  let lastPlayed: T | null = null;
  let nextUp: T | null = null;
  for (const md of matchDays) {
    if (md.status === MatchDayStatus.CANCELLED) continue;
    if (localDateKey(md.date, tz) <= today) {
      if (!lastPlayed || md.date > lastPlayed.date) lastPlayed = md;
    } else if (!nextUp || md.date < nextUp.date) {
      nextUp = md;
    }
  }
  return lastPlayed ?? nextUp;
}

/**
 * Días (`YYYY-MM-DD`) de jornadas recurrentes que faltan:
 * - hacia atrás: los huecos desde la última jornada ya jugada (máx. `maxWeeksBack` semanas),
 * - hacia adelante: las próximas `weeksAhead` ocurrencias empezando por la de esta semana.
 */
export function missingRecurringDates(
  existing: Date[],
  recurrenceDay: number,
  now: Date = new Date(),
  tz: string = appTimezone(),
  weeksAhead = 4,
  maxWeeksBack = 8,
): string[] {
  const today = localDateKey(now, tz);
  const existingKeys = new Set(existing.map((d) => localDateKey(d, tz)));
  const nextKey = shiftKey(today, (recurrenceDay - weekdayOfKey(today) + 7) % 7);
  const endKey = shiftKey(nextKey, 7 * (weeksAhead - 1));

  const pastKeys = [...existingKeys].filter((k) => k <= today).sort();
  let startKey = nextKey;
  if (pastKeys.length > 0) {
    const lastPlayed = pastKeys[pastKeys.length - 1];
    const firstAfter = shiftKey(lastPlayed, ((recurrenceDay - weekdayOfKey(lastPlayed) + 6) % 7) + 1);
    const floor = shiftKey(nextKey, -7 * maxWeeksBack);
    startKey = firstAfter < floor ? floor : firstAfter;
  }

  const missing: string[] = [];
  for (let k = startKey; k <= endKey; k = shiftKey(k, 7)) {
    if (!existingKeys.has(k)) missing.push(k);
  }
  return missing;
}
