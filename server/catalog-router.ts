import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import * as catalog from "./catalog-repository";

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
const expenseTypeUpdate = expenseTypeCreate.partial().extend({ id: idSchema, active: z.boolean().optional() }).refine(
  ({ id: _id, ...data }) => Object.values(data).some((value) => value !== undefined),
  "Informe ao menos um campo para atualizar",
);

export const catalogRouter = router({
  units: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listUnits(input))),
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
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listClients(input))),
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
  expenseTypes: router({
    list: adminProcedure.input(listInput).query(({ input }) => withCatalogErrors(() => catalog.listExpenseTypes(input))),
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
