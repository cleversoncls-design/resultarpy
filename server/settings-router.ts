import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { organizationSettings } from '../drizzle/schema';
import { getDb } from './db';
import { adminProcedure, protectedProcedure, router } from './_core/trpc';

const currencySchema = z.enum(['BRL', 'USD', 'PYG']);

async function ensureGlobalCurrency() {
  const db = await getDb();
  if (!db) throw new Error('Banco de dados não configurado.');
  const rows = await db.select({ globalCurrency: organizationSettings.globalCurrency }).from(organizationSettings).where(eq(organizationSettings.id, 1)).limit(1);
  if (rows[0]) return rows[0].globalCurrency as z.infer<typeof currencySchema>;
  const inserted = await db.insert(organizationSettings).values({ id: 1, globalCurrency: 'BRL' }).returning({ globalCurrency: organizationSettings.globalCurrency });
  return (inserted[0]?.globalCurrency ?? 'BRL') as z.infer<typeof currencySchema>;
}

export const settingsRouter = router({
  globalCurrency: protectedProcedure.query(async () => ({ currency: await ensureGlobalCurrency() })),
  setGlobalCurrency: adminProcedure.input(z.object({ currency: currencySchema })).mutation(async ({ input }) => {
    const db = await getDb();
  if (!db) throw new Error('Banco de dados não configurado.');
    const updated = await db.update(organizationSettings).set({ globalCurrency: input.currency, updatedAt: new Date() }).where(eq(organizationSettings.id, 1)).returning({ currency: organizationSettings.globalCurrency });
    if (updated[0]) return updated[0];
    const inserted = await db.insert(organizationSettings).values({ id: 1, globalCurrency: input.currency }).returning({ currency: organizationSettings.globalCurrency });
    return inserted[0] ?? { currency: input.currency };
  }),
});
