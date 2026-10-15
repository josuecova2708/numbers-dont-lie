import { MatchDayStatus } from '@prisma/client';
import {
  acceptsStats,
  formatMatchDayLabel,
  localDateKey,
  localNoon,
  missingRecurringDates,
  pickCurrentMatchDay,
} from './match-day-dates';

const TZ = 'America/Caracas'; // UTC-4 todo el año
const WED = 3;

// Instante a partir de hora local Caracas
const local = (iso: string) => new Date(`${iso}-04:00`);
const md = (key: string, status: MatchDayStatus = MatchDayStatus.SCHEDULED) => ({
  key,
  date: localNoon(key, TZ),
  status,
});

describe('match-day-dates', () => {
  it('localNoon/localDateKey: mediodía local en UTC-4 son las 16:00Z', () => {
    expect(localNoon('2026-09-16', TZ).toISOString()).toBe('2026-09-16T16:00:00.000Z');
    expect(localDateKey(new Date('2026-10-15T03:00:00Z'), TZ)).toBe('2026-10-14'); // 11 PM del miércoles
  });

  it('formatMatchDayLabel usa el día calendario', () => {
    expect(formatMatchDayLabel('2026-10-14')).toBe('Jornada - Miércoles 14 de Octubre');
  });

  describe('pickCurrentMatchDay (regresión: la jornada vencía a las 9 PM locales)', () => {
    const days = [md('2026-10-07'), md('2026-10-14'), md('2026-10-21')];

    it.each([
      ['miércoles 19:00 (antes del partido)', '2026-10-14T19:00:00'],
      ['miércoles 23:00 (al terminar el partido)', '2026-10-14T23:00:00'],
      ['jueves 02:00 de madrugada', '2026-10-15T02:00:00'],
      ['jueves 10:00', '2026-10-15T10:00:00'],
      ['martes siguiente', '2026-10-20T20:00:00'],
    ])('%s → jornada del 14 de octubre', (_label, when) => {
      expect(pickCurrentMatchDay(days, local(when), TZ)?.key).toBe('2026-10-14');
    });

    it('nunca devuelve una jornada futura si ya hubo una jugada', () => {
      expect(pickCurrentMatchDay([md('2026-09-16'), md('2026-10-21')], local('2026-10-15T10:00:00'), TZ)?.key).toBe(
        '2026-09-16',
      );
    });

    it('ignora jornadas canceladas', () => {
      const withCancelled = [md('2026-10-07'), md('2026-10-14', MatchDayStatus.CANCELLED)];
      expect(pickCurrentMatchDay(withCancelled, local('2026-10-15T10:00:00'), TZ)?.key).toBe('2026-10-07');
    });

    it('si no se ha jugado ninguna, devuelve la próxima', () => {
      expect(pickCurrentMatchDay([md('2026-10-28'), md('2026-10-21')], local('2026-10-15T10:00:00'), TZ)?.key).toBe(
        '2026-10-21',
      );
    });

    it('sin jornadas → null', () => {
      expect(pickCurrentMatchDay([], new Date(), TZ)).toBeNull();
    });
  });

  describe('acceptsStats', () => {
    const now = local('2026-10-15T10:00:00');
    it('acepta jornadas pasadas sin vencimiento, también semanas después', () => {
      expect(acceptsStats(md('2026-10-14'), now, TZ)).toBe(true);
      expect(acceptsStats(md('2026-08-26', MatchDayStatus.COMPLETED), now, TZ)).toBe(true);
    });
    it('rechaza futuras y canceladas', () => {
      expect(acceptsStats(md('2026-10-21'), now, TZ)).toBe(false);
      expect(acceptsStats(md('2026-10-14', MatchDayStatus.CANCELLED), now, TZ)).toBe(false);
    });
    it('el mismo miércoles a las 23:00 sí acepta', () => {
      expect(acceptsStats(md('2026-10-14'), local('2026-10-14T23:00:00'), TZ)).toBe(true);
    });
  });

  describe('missingRecurringDates', () => {
    const now = local('2026-10-15T10:00:00'); // jueves

    it('reproduce producción: solo había hasta el 16 sep → rellena 23 sep … 14 oct y las próximas 4', () => {
      const existing = ['2026-08-26', '2026-09-02', '2026-09-09', '2026-09-16'].map((k) => localNoon(k, TZ));
      expect(missingRecurringDates(existing, WED, now, TZ)).toEqual([
        '2026-09-23',
        '2026-09-30',
        '2026-10-07',
        '2026-10-14',
        '2026-10-21',
        '2026-10-28',
        '2026-11-04',
        '2026-11-11',
      ]);
    });

    it('no duplica el mismo día aunque el timestamp guardado sea distinto (las de prod están a 12:00Z)', () => {
      const existing = [new Date('2026-10-14T12:00:00Z'), new Date('2026-10-21T00:30:00Z')]; // = 14 oct 08:00 y 20 oct 20:30 locales
      const result = missingRecurringDates(existing, WED, now, TZ);
      expect(result).not.toContain('2026-10-14');
      expect(result[0]).toBe('2026-10-21'); // 2026-10-21T00:30Z es 20 oct local, así que el 21 falta
    });

    it('grupo nuevo: crea las próximas 4 desde hoy (incluye hoy si es el día)', () => {
      expect(missingRecurringDates([], WED, local('2026-10-14T08:00:00'), TZ)).toEqual([
        '2026-10-14',
        '2026-10-21',
        '2026-10-28',
        '2026-11-04',
      ]);
    });

    it('no rellena más de 8 semanas hacia atrás', () => {
      const result = missingRecurringDates([localNoon('2026-01-07', TZ)], WED, now, TZ);
      expect(result[0]).toBe('2026-08-26');
    });

    it('si todo existe no crea nada', () => {
      const all = ['2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11'].map((k) => localNoon(k, TZ));
      expect(missingRecurringDates(all, WED, now, TZ)).toEqual([]);
    });
  });
});
