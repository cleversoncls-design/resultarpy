import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import * as catalog from "./catalog-repository";
import { syncOfficialCurrencyRates } from "./currency-rates";

const idSchema = z.coerce.number().int().positive();
const listInput = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  includeInactive: z.boolean().default(false),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

function requireFound<T>(value: T | null, label: string) {
  if (!value) {
    throw new TRPCError({ code: "NOT_FOUND", message: `${label} não encontrado` });
  }
  return value;
}

async function withCatalogErrors<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23505") {
      throw new TRPCError({ code: "CONFLICT", message: "Já existe um registro com os mesmos dados únicos" });
    }
    if (code === "23503") {
      throw new TRPCError({ code: "CONFLICT", message: "O registro está vinculado a outros dados e não pode ser alterado dessa forma" });
    }
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a operação no cadastro" });
  }
}

const unitCreate = z.object({
  code: z.string().trim().min(1).max(32),
  name: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(120),
});
const unitUpdate = unitCreate.partial().extend({ id: idSchema }).refine(
  ({ id: _id, ...data }) => Object.values(data).some((value) => value !== undefined),
  "Informe ao menos um campo para atualizar",
);

const clientCreate = z.object({
  name: z.string().trim().min(1).max(180),
  billingCurrency: z.string().trim().length(3).default("BRL"),
});
const clientUpdate = clientCreate.partial().extend({ id: idSchema, active: z.boolean().optional() }).refine(
  ({ id: _id, ...data }) => Object.values(data).some((value) => value !== undefined),
  "Informe ao menos um campo para atualizar",
);

const travelerCreate = z.object({
  name: z.string().trim().min(1).max(160),
  userId: idSchema.nullable().optional(),
  unitId: idSchema.nullable().optional(),
  documentNumber: z.string().trim().max(40).nullable().optional(),
  canDrive: z.boolean().default(false),
});
const travelerUpdate = travelerCreate.partial().extend({ id: idSchema, active: z.boolean().optional() }).refine(
  ({ id: _id, ...data }) => Object.values(data).some((value) => value !== undefined),
  "Informe ao menos um campo para atualizar",
);

const expenseTypeCreate = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
});
const currencyCode = z.enum(['BRL', 'USD', 'PYG']);
const reimbursementProfileItem = z.object({ expenseTypeId: idSchema, limitAmount: z.string().trim().min(1) });
const reimbursementProfileCreate = z.object({ city: z.string().trim().max(120).default(''), currency: currencyCode.default('BRL'), items: z.array(reimbursementProfileItem).min(1).max(100) }).superRefine((input, context) => { if (new Set(input.items.map((item) => item.expenseTypeId)).size !== input.items.length) context.addIssue({ code: 'custom', path: ['items'], message: 'Cada tipo de gasto pode aparecer somente uma vez por cidade e moeda.' }); });
const reimbursementProfileUpdate = reimbursementProfileCreate.safeExtend({ id: idSchema });
const currencyRateInput = z.object({ rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), fromCurrency: currencyCode, toCurrency: z.literal('PYG'), rate: z.string().trim().min(1), rateType: z.enum(['venda', 'referencial']), source: z.enum(['DNIT', 'BCP', 'Manual']), sourceUrl: z.string().url().nullable().optional() });
const clientBillingProfileItem = z.object({ expenseTypeId: idSchema, limitAmount: z.string().trim().min(1) });
const clientBillingProfileCreate = z.object({ clientId: idSchema, currency: z.string().trim().length(3), items: z.array(clientBillingProfileItem).min(1).max(100) }).superRefine((input, context) => { if (new Set(input.items.map((item) => item.expenseTypeId)).size !== input.items.length) context.addIssue({ code: 'custom', path: ['items'], message: 'Cada tipo de gasto pode aparecer somente uma vez por cliente.' }); });
const clientBillingProfileUpdate = clientBillingProfileCreate.safeExtend({ id: idSchema });

const expenseTypeUpdate = expenseTypeCreate.partial().extend({ id: idSchema, active: z.boolean().optional() }).refine(
  ({ id: _id, ...data }) => Object.values(data).some((value) => value !== undefined),
  "Informe ao menos um campo para atualizar",
);

export const catalogRouter = router({
  units: router({
    list: protectedProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listUnits(input))),
    get: adminProcedure.input(z.object({ id: idSchema })).query(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.getUnit(input.id), "Unidade")),
    ),
    create: adminProcedure.input(unitCreate).mutation(({ input }) => withCatalogErrors(() => catalog.createUnit(input))),
    update: adminProcedure.input(unitUpdate).mutation(({ input }) => {
      const { id, ...data } = input;
      return withCatalogErrors(() => catalog.updateUnit(id, data));
    }),
    archive: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.archiveUnit(input.id), "Unidade")),
    ),
  }),
  clients: router({
    list: protectedProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listClients(input))),
    get: adminProcedure.input(z.object({ id: idSchema })).query(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.getClient(input.id), "Cliente")),
    ),
    create: adminProcedure.input(clientCreate).mutation(({ input }) => withCatalogErrors(() => catalog.createClient(input))),
    update: adminProcedure.input(clientUpdate).mutation(({ input }) => {
      const { id, ...data } = input;
      return withCatalogErrors(() => catalog.updateClient(id, data));
    }),
    archive: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.archiveClient(input.id), "Cliente")),
    ),
  }),
  travelers: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listTravelers(input))),
    get: adminProcedure.input(z.object({ id: idSchema })).query(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.getTraveler(input.id), "Viajante")),
    ),
    create: adminProcedure.input(travelerCreate).mutation(({ input }) => withCatalogErrors(() => catalog.createTraveler(input))),
    update: adminProcedure.input(travelerUpdate).mutation(({ input }) => {
      const { id, ...data } = input;
      return withCatalogErrors(() => catalog.updateTraveler(id, data));
    }),
    archive: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.archiveTraveler(input.id), "Viajante")),
    ),
  }),
  maintenanceReasons: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listMaintenanceReasons(input))),
    create: adminProcedure.input(z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(2000).nullable().optional(), category: z.enum(['Preventiva', 'Corretiva']) })).mutation(({ input }) => withCatalogErrors(() => catalog.createMaintenanceReason(input))),
    update: adminProcedure.input(z.object({ id: idSchema, name: z.string().trim().min(1).max(160).optional(), description: z.string().trim().max(2000).nullable().optional(), category: z.enum(['Preventiva', 'Corretiva']).optional(), active: z.boolean().optional() })).mutation(({ input: { id, ...data } }) => withCatalogErrors(() => catalog.updateMaintenanceReason(id, data))),
    archive: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => withCatalogErrors(async () => requireFound(await catalog.archiveMaintenanceReason(input.id), 'Motivo de manutenção'))),
  }),
  reimbursementLimits: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listReimbursementLimitProfiles(input))),
    create: adminProcedure.input(reimbursementProfileCreate).mutation(({ input }) => withCatalogErrors(async () => { for (const item of input.items) if (!(await catalog.getExpenseType(item.expenseTypeId))) throw new Error('Um dos tipos de gasto não foi encontrado ou está inativo.'); return catalog.createReimbursementLimitProfile(input); })),
    update: adminProcedure.input(reimbursementProfileUpdate).mutation(({ input }) => withCatalogErrors(async () => { const { id, ...data } = input; for (const item of data.items) if (!(await catalog.getExpenseType(item.expenseTypeId))) throw new Error('Um dos tipos de gasto não foi encontrado ou está inativo.'); return requireFound(await catalog.updateReimbursementLimitProfile(id, data), 'Perfil de reembolso'); })),
    delete: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => withCatalogErrors(async () => requireFound(await catalog.deleteReimbursementLimitProfile(input.id), 'Perfil de reembolso'))),
  }),
  currencyRates: router({
    list: adminProcedure.input(z.object({ rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })).query(({ input }) => withCatalogErrors(() => catalog.listCurrencyRates(input))),
    latest: adminProcedure.query(() => withCatalogErrors(() => catalog.listLatestCurrencyRates())),
    save: adminProcedure.input(z.object({ items: z.array(currencyRateInput).min(1).max(10) })).mutation(({ input }) => withCatalogErrors(() => catalog.upsertCurrencyRates(input.items))),
    sync: adminProcedure.mutation(() => withCatalogErrors(() => syncOfficialCurrencyRates())),
  }),
  clientBillingLimits: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listClientBillingProfiles(input))),
    create: adminProcedure.input(clientBillingProfileCreate).mutation(({ input }) => withCatalogErrors(async () => { if (!(await catalog.getClient(input.clientId))) throw new Error('Cliente não encontrado ou inativo.'); for (const item of input.items) if (!(await catalog.getExpenseType(item.expenseTypeId))) throw new Error('Um dos tipos de gasto não foi encontrado ou está inativo.'); return catalog.createClientBillingProfile(input); })),
    update: adminProcedure.input(clientBillingProfileUpdate).mutation(({ input }) => withCatalogErrors(async () => { const { id, ...data } = input; if (!(await catalog.getClient(data.clientId))) throw new Error('Cliente não encontrado ou inativo.'); for (const item of data.items) if (!(await catalog.getExpenseType(item.expenseTypeId))) throw new Error('Um dos tipos de gasto não foi encontrado ou está inativo.'); return requireFound(await catalog.updateClientBillingProfile(id, data), 'Limite de faturamento'); })),
    delete: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) => withCatalogErrors(async () => requireFound(await catalog.deleteClientBillingProfile(input.id), 'Limite de faturamento'))),
  }),
  translations: router({
    list: adminProcedure.input(z.object({ search: z.string().trim().max(120).optional() }).default({})).query(({ input }) => withCatalogErrors(() => catalog.listTranslationEntries(input))),
    save: adminProcedure.input(z.object({ items: z.array(z.object({ key: z.string().trim().min(1).max(240), spanish: z.string().trim().min(1).max(4000) })).min(1).max(500) })).mutation(({ ctx, input }) => withCatalogErrors(() => catalog.upsertTranslationEntries(input.items, ctx.user.id))),
  }),
  expenseTypes: router({
    list: protectedProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listExpenseTypes(input))),
    get: adminProcedure.input(z.object({ id: idSchema })).query(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.getExpenseType(input.id), "Tipo de gasto")),
    ),
    create: adminProcedure.input(expenseTypeCreate).mutation(({ input }) =>
      withCatalogErrors(() => catalog.createExpenseType(input)),
    ),
    update: adminProcedure.input(expenseTypeUpdate).mutation(({ input }) => {
      const { id, ...data } = input;
      return withCatalogErrors(() => catalog.updateExpenseType(id, data));
    }),
    archive: adminProcedure.input(z.object({ id: idSchema })).mutation(({ input }) =>
      withCatalogErrors(async () => requireFound(await catalog.archiveExpenseType(input.id), "Tipo de gasto")),
    ),
  }),
});
