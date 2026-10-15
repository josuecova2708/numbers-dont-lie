/**
 * Corrección única (oct 2026).
 *
 * Hasta el 14/10/2026 solo existían jornadas hasta el 16 de septiembre, así que todas las
 * stats del 9 sep al 14 oct se fueron escribiendo (sumando o reemplazando, según cada quien)
 * sobre la jornada del 16 sep. No se pueden separar por día, así que:
 *   - se renombra esa jornada como "acumulado" para que quede claro en el historial,
 *   - NO se borra ni modifica ninguna stat (el ranking total queda igual).
 * Las jornadas faltantes (23 sep en adelante) las crea la app sola (MatchDaysService.ensureRecurring).
 *
 * Uso:  npx ts-node prisma/fix-2026-10.ts            (dry-run, no escribe)
 *       npx ts-node prisma/fix-2026-10.ts --apply    (aplica)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const MATCH_DAY_ID = '755ee43b-09b9-4f99-80ac-b90a91d7d97c'; // "Jornada - Miércoles 16 de Septiembre"
const NEW_LABEL = 'Acumulado 9 sep – 14 oct (antes del arreglo)';

const apply = process.argv.includes('--apply');
const pool = new Pool({ connectionString: process.env.DATABASE_URL?.replace(/^﻿/, '') });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const md = await prisma.matchDay.findUnique({
    where: { id: MATCH_DAY_ID },
    include: { stats: { include: { player: { select: { displayName: true } } } } },
  });
  if (!md) {
    console.log('No existe la jornada, nada que hacer.');
    return;
  }

  console.log(`Jornada: "${md.label}" (${md.date.toISOString()}) → "${NEW_LABEL}"`);
  console.log('Stats que quedan en el acumulado (sin cambios):');
  console.table(
    md.stats.map((s) => ({
      jugador: s.player.displayName,
      ctx: s.context,
      goles: s.goals,
      asist: s.assists,
      fallados: s.missedGoals,
      autogoles: s.ownGoals,
      afuera: s.ballsOut,
    })),
  );

  if (md.label === NEW_LABEL) {
    console.log('Ya estaba aplicado.');
    return;
  }
  if (!apply) {
    console.log('\nDry-run: no se escribió nada. Corre con --apply para aplicar.');
    return;
  }
  await prisma.matchDay.update({ where: { id: MATCH_DAY_ID }, data: { label: NEW_LABEL } });
  console.log('✅ Aplicado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
