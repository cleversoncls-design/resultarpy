import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, protectedProcedure, router } from './_core/trpc';
import * as operations from './operations-repository';

const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(['asc', 'desc']).default('asc'),
});
const idInput = z.object({ id: z.number().int().positive() });
const currencyCode = z.enum(['BRL', 'USD', 'PYG']);

function normalizeBirthDate(value: unknown) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'string') return value;
  const raw = value.trim();
  if (!raw) return undefined;
  const brazilian = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brazilian) return `${brazilian[3]}-${brazilian[2]}-${brazilian[1]}`;
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (isoPrefix) return isoPrefix[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value;
}
const tripStatus = z.enum(['Rascunho', 'Aguardando aprovação', 'Aprovada', 'Em preparação', 'Liberada para viagem', 'Em prestação', 'Finalizada', 'Rejeitada', 'Devolvida']);
const approvalDecision = z.enum(['Aprovada', 'Rejeitada', 'Devolvida']);
const approvalHistoryFields = { decision: approvalDecision.optional(), from: z.string().date().optional(), to: z.string().date().optional() };
const approvalHistoryInput = idInput.extend({ ...approvalHistoryFields, page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(10) }).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' });
const approvalHistoryExportInput = idInput.extend(approvalHistoryFields).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' });
const reservationStatus = z.enum(['Aguardando veículo', 'Reservado', 'Reservada', 'Em viagem', 'Finalizada', 'Cancelada']);
const maintenanceType = z.enum(['Preventiva', 'Corretiva']);
const vehicleStatus = z.enum(['Disponível', 'Reservado', 'Em viagem', 'Realizar Manutenção', 'Em manutenção', 'Extintor próximo do vencimento', 'Avaria registrada']);
const workOrderStatus = z.enum(['Em andamento', 'Concluída', 'Cancelada']);
const forbidden = () => new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para acessar este registro' });
const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: 'Registro não encontrado' });
const scopeFor = (user: { id: number; role: string }) => ({ userId: user.role === 'admin' ? undefined : user.id, admin: user.role === 'admin' });

const tripFields = z.object({
  tripCode: z.string().min(3).max(40), travelerId: z.number().int().positive().optional(), approverId: z.number().int().positive().nullable().optional(), clientId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), origin: z.string().max(120).default(''), destination: z.string().min(1).max(120), country: z.string().max(80).nullable().optional(), area: z.string().max(120).nullable().optional(), transport: z.string().max(120).nullable().optional(), startsOn: z.string().date(), endsOn: z.string().date(), notes: z.string().max(4000).nullable().optional(), status: tripStatus.default('Aguardando aprovação'), requiresFleetVehicle: z.boolean().default(false), hasAdvance: z.boolean().default(false), needsHotel: z.boolean().default(false), advanceAmount: z.string().default('0'), flightDetails: z.object({ passengerName: z.string().max(180).optional(), passengerDocument: z.string().max(80).optional(), passengerBirthDate: z.preprocess(normalizeBirthDate, z.string().date().optional()), airline: z.string().max(120).optional(), flightNumber: z.string().max(40).optional(), departureAirport: z.string().max(12).optional(), arrivalAirport: z.string().max(12).optional() }).nullable().optional(),
  }).superRefine((input, ctx) => {
    if (input.transport !== 'Passagem aérea') return;
    const flight = input.flightDetails;
    if (!flight?.passengerName?.trim() || !flight.passengerDocument?.trim() || !flight.passengerBirthDate) {
      ctx.addIssue({ code: 'custom', path: ['flightDetails'], message: 'Dados do passageiro são obrigatórios para passagem aérea.' });
    }
  });
const expenseFields = z.object({ tripId: z.number().int().positive(), expenseTypeId: z.number().int().positive(), occurredOn: z.string().date(), city: z.string().min(1).max(120), quantity: z.string().default('1'), unitValue: z.string(), currency: currencyCode.default('BRL'), expenseGroup: z.string().max(120).nullable().optional(), prepaid: z.boolean().default(false), billable: z.boolean().default(true), receiptUri: z.string().max(6000000, 'O comprovante é grande demais. Tente uma foto mais leve.').nullable().optional(), notes: z.string().max(2000).nullable().optional(), reviewNote: z.string().max(2000).nullable().optional() });
const reportPeriod = { tripId: z.number().int().positive().optional(), clientId: z.number().int().positive().optional(), from: z.string().date().optional(), to: z.string().date().optional() };
const reimbursementReportInput = pageInput.extend(reportPeriod).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' });
const billingReportInput = pageInput.extend(reportPeriod).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' });

export const operationsRouter = router({
  trips: router({
    list: protectedProcedure.input(pageInput.extend({ status: tripStatus.optional(), travelerId: z.number().int().positive().optional(), mine: z.boolean().default(false) })).query(({ ctx, input }) => operations.listTrips({ ...input, travelerId: ctx.user.role === 'admin' && !input.mine ? input.travelerId : undefined, userId: ctx.user.role === 'admin' && !input.mine ? undefined : ctx.user.id })),
    // Usado só para decidir se o menu do Administrativo mostra "Minhas
    // viagens" (além de "Todas as viagens").
    hasOwnTrips: protectedProcedure.query(({ ctx }) => operations.hasOwnTrips(ctx.user.id)),
    get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => { const trip = await operations.getTrip(input.id, scopeFor(ctx.user)); if (!trip) throw notFound(); return trip; }),
    create: protectedProcedure.input(tripFields).mutation(async ({ ctx, input }) => { const isAdmin = ctx.user.role === 'admin' || ctx.user.profile === 'admin'; const travelerId = isAdmin ? input.travelerId : await operations.ensureTravelerIdByUserId(ctx.user.id); if (!travelerId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não foi possível identificar o viajante da sessão.' }); return operations.createTrip({ ...input, travelerId }); }),
    update: protectedProcedure.input(tripFields.partial().extend({ id: idInput.shape.id })).mutation(async ({ ctx, input }) => { const { id, ...changes } = input; const trip = await operations.updateTrip(id, changes, scopeFor(ctx.user)); if (!trip) throw notFound(); return trip; }),
    // Fluxo de fechamento: viajante envia -> admin valida comprovantes ->
    // admin fatura (o que finaliza a viagem).
    // O viajante marca que a viagem começou — funciona para qualquer
    // modalidade de transporte, não só frota.
    startTrip: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const trip = await operations.startTrip(input.id, scopeFor(ctx.user));
      if (!trip) throw notFound();
      return trip;
    }),
    submitClosure: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const trip = await operations.submitTripClosure(input.id, scopeFor(ctx.user));
      if (!trip) throw notFound();
      return trip;
    }),
    validateReceipts: adminProcedure.input(idInput).mutation(async ({ input }) => {
      const trip = await operations.validateTripReceipts(input.id);
      if (!trip) throw notFound();
      return trip;
    }),
    billTrip: adminProcedure.input(idInput).mutation(async ({ input }) => {
      const trip = await operations.billTrip(input.id);
      if (!trip) throw notFound();
      return trip;
    }),
    closureQueue: adminProcedure.input(pageInput).query(({ input }) => operations.listClosureQueue(input)),
    delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => { const deleted = await operations.deleteTrip(input.id, scopeFor(ctx.user)); if (!deleted) throw notFound(); return deleted; }),
    // Confirma que o depósito do adiantamento foi realizado, com o valor
    // efetivamente depositado (pode diferir do solicitado). Registra a
    // data automaticamente e reavalia se a viagem já pode ser liberada.
    confirmAdvance: adminProcedure.input(z.object({ id: idInput.shape.id, depositedAmount: z.string().min(1, 'Informe o valor depositado') })).mutation(async ({ input }) => {
      const trip = await operations.confirmTripAdvance(input.id, input.depositedAmount, { admin: true });
      if (!trip) throw notFound();
      return trip;
    }),
    // Salva a observação com os dados da reserva de hotel (texto livre) e
    // reavalia se a viagem já pode ser liberada.
    updateHotelNote: adminProcedure.input(z.object({ id: idInput.shape.id, hotelNote: z.string().max(4000).nullable() })).mutation(async ({ input }) => {
      const trip = await operations.updateTripHotelNote(input.id, input.hotelNote, { admin: true });
      if (!trip) throw notFound();
      return trip;
    }),
  }),
  approvals: router({
    list: protectedProcedure.input(pageInput.extend({ status: z.enum(['Pendiente', 'Aprovada', 'Rejeitada']).default('Pendiente'), from: z.string().date().optional(), to: z.string().date().optional() })).query(({ ctx, input }) => operations.listTripApprovals({ ...input, userId: ctx.user.id, admin: ctx.user.role === 'admin' || ctx.user.profile === 'admin', approver: ctx.user.profile === 'approver' || ctx.user.profile === 'traveler_approver' })),
    history: protectedProcedure.input(approvalHistoryInput).query(async ({ ctx, input }) => {
      const { id, ...filters } = input;
      const history = await operations.listTripApprovalHistory(id, scopeFor(ctx.user), filters);
      if (!history) throw notFound();
      return history;
    }),
    historyExport: protectedProcedure.input(approvalHistoryExportInput).query(async ({ ctx, input }) => {
      const { id, ...filters } = input;
      const history = await operations.listTripApprovalHistory(id, scopeFor(ctx.user), { ...filters, exportAll: true });
      if (!history) throw notFound();
      return history.items;
    }),
    // Histórico global — todas as viagens decididas de uma vez, sem
    // precisar abrir cada viagem individualmente.
    historyGlobal: protectedProcedure.input(z.object({ ...approvalHistoryFields, page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(10) }).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' })).query(({ ctx, input }) => operations.listApprovalDecisionsGlobal(scopeFor(ctx.user), input)),
    historyGlobalExport: protectedProcedure.input(z.object(approvalHistoryFields).refine((input) => !input.from || !input.to || input.from <= input.to, { path: ['to'], message: 'O período final deve ser igual ou posterior ao período inicial' })).query(async ({ ctx, input }) => {
      const history = await operations.listApprovalDecisionsGlobal(scopeFor(ctx.user), { ...input, page: 1, pageSize: 1000, exportAll: true });
      return history.items;
    }),
    decide: protectedProcedure.input(z.object({ tripId: idInput.shape.id, decision: approvalDecision, comment: z.string().trim().min(3, 'Comentário obrigatório').max(2000) })).mutation(async ({ ctx, input }) => {
      const result = await operations.decideTripApproval({ ...input, approverId: ctx.user.id }, ctx.user.role === 'admin' || ctx.user.profile === 'admin', ctx.user.profile === 'approver' || ctx.user.profile === 'traveler_approver');
      if (!result) throw forbidden();
      return result;
    }),
  }),
  expenses: router({
    list: protectedProcedure.input(pageInput.extend({ tripId: z.number().int().positive().optional() })).query(({ ctx, input }) => operations.listTripExpenses(input.tripId, { ...input, userId: ctx.user.role === 'admin' ? undefined : ctx.user.id })),
    get: protectedProcedure.input(idInput).query(async ({ ctx, input }) => { const expense = await operations.getTripExpense(input.id, scopeFor(ctx.user)); if (!expense) throw notFound(); return expense; }),
    create: protectedProcedure.input(expenseFields).mutation(async ({ ctx, input }) => { const amount = (Number(input.quantity) * Number(input.unitValue)).toFixed(2); const created = await operations.createTripExpense({ ...input, amount }, scopeFor(ctx.user)); if (!created) throw forbidden(); return created; }), setReimbursementRejection: adminProcedure.input(z.object({ id: z.number().int().positive(), rejected: z.boolean(), reviewNote: z.string().max(2000).nullable().optional() })).mutation(({ input }) => operations.setExpenseReimbursementRejection(input.id, input.rejected, input.reviewNote ?? null)),
    update: protectedProcedure.input(expenseFields.partial().extend({ id: idInput.shape.id })).mutation(async ({ ctx, input }) => { const { id, quantity, unitValue, ...changes } = input; const amount = quantity !== undefined || unitValue !== undefined ? (Number(quantity ?? 1) * Number(unitValue ?? 0)).toFixed(2) : undefined; const updated = await operations.updateTripExpense(id, { ...changes, ...(amount !== undefined ? { amount } : {}) }, scopeFor(ctx.user)); if (!updated) throw notFound(); return updated; }),
    delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => { const deleted = await operations.deleteTripExpense(input.id, scopeFor(ctx.user)); if (!deleted) throw notFound(); return deleted; }),
  }),
  reports: router({
    reimbursement: protectedProcedure.input(reimbursementReportInput).query(({ ctx, input }) => operations.listReimbursementReport({ ...input, userId: ctx.user.role === 'admin' ? undefined : ctx.user.id, admin: ctx.user.role === 'admin' })),
    billing: adminProcedure.input(billingReportInput).query(({ input }) => operations.listBillingReport(input)),
  }),
  fleet: router({
    vehicles: router({
      list: adminProcedure.input(pageInput.extend({ status: vehicleStatus.optional() })).query(({ input }) => operations.listVehicles(input)),
      get: adminProcedure.input(idInput).query(async ({ input }) => { const vehicle = await operations.getVehicle(input.id); if (!vehicle) throw notFound(); return vehicle; }),
      create: adminProcedure.input(z.object({ plate: z.string().min(3).max(16), brand: z.string().min(1).max(80), model: z.string().min(1).max(100), modelYear: z.number().int().min(1950).max(2200), color: z.string().max(60).nullable().optional(), unitId: z.number().int().positive(), currentKm: z.number().int().min(0).default(0), lastMaintenanceKm: z.number().int().min(0).default(0), maintenanceIntervalKm: z.number().int().positive(), fireExtinguisherExpiresOn: z.string().date().nullable().optional(), status: vehicleStatus.default('Disponível'), notes: z.string().max(2000).nullable().optional() })).mutation(({ input }) => operations.createVehicle(input)),
      // Antes só aceitava mudar KM/status/observações — ampliado para
      // permitir editar todos os campos coletados no formulário de veículo.
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), plate: z.string().min(3).max(16).optional(), brand: z.string().min(1).max(80).optional(), model: z.string().min(1).max(100).optional(), modelYear: z.number().int().min(1950).max(2200).optional(), color: z.string().max(60).nullable().optional(), unitId: z.number().int().positive().optional(), currentKm: z.number().int().min(0).optional(), lastMaintenanceKm: z.number().int().min(0).optional(), maintenanceIntervalKm: z.number().int().positive().optional(), fireExtinguisherExpiresOn: z.string().date().nullable().optional(), status: vehicleStatus.optional(), notes: z.string().max(2000).nullable().optional() })).mutation(({ input: { id, ...input } }) => operations.updateVehicle(id, input)),
    }),
    reservations: router({
      list: adminProcedure.input(pageInput.extend({ status: reservationStatus.optional(), vehicleId: z.number().int().positive().optional() })).query(({ input }) => operations.listFleetReservations(input)),
      // Retorna a reserva de frota vinculada a uma viagem específica (com
      // dados do veículo e do condutor), para exibição na tela de detalhes
      // da viagem. Respeita o mesmo escopo de acesso de trips.get.
      byTrip: protectedProcedure.input(idInput).query(async ({ ctx, input }) => {
        const reservation = await operations.getFleetReservationForTrip(input.id, scopeFor(ctx.user));
        if (reservation === undefined) throw notFound();
        return reservation;
      }),
      create: adminProcedure.input(z.object({ tripId: z.number().int().positive(), vehicleId: z.number().int().positive().nullable().optional(), driverId: z.number().int().positive(), status: reservationStatus.default('Aguardando veículo'), plannedStartOn: z.string().date(), plannedEndOn: z.string().date() })).mutation(({ input }) => operations.createFleetReservation(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), vehicleId: z.number().int().positive().nullable().optional(), status: reservationStatus.optional(), departureAt: z.coerce.date().nullable().optional(), departureKm: z.number().int().min(0).nullable().optional(), returnAt: z.coerce.date().nullable().optional(), returnKm: z.number().int().min(0).nullable().optional() })).mutation(({ input: { id, ...input } }) => operations.updateFleetReservation(id, input)),
      // O próprio viajante registra o KM de saída/retorno da sua reserva.
      recordKm: protectedProcedure.input(z.object({ reservationId: z.number().int().positive(), departureKm: z.number().int().min(0).optional(), returnKm: z.number().int().min(0).optional() })).mutation(async ({ ctx, input }) => {
        const { reservationId, ...changes } = input;
        const isAdmin = ctx.user.role === 'admin' || ctx.user.profile === 'admin';
        const updated = await operations.recordReservationKm(reservationId, changes, ctx.user.id, isAdmin);
        if (!updated) throw forbidden();
        return updated;
      }),
    }),
    events: router({
      list: protectedProcedure.input(pageInput.extend({ reservationId: z.number().int().positive().optional() })).query(({ ctx, input }) => { if (input.reservationId === undefined && ctx.user.role !== 'admin' && ctx.user.profile !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso administrativo necessário para listar todos os eventos.' }); return operations.listFleetEvents(input.reservationId, input); }),
      create: protectedProcedure.input(z.object({ reservationId: z.number().int().positive(), eventType: z.enum(['Multa', 'Avaria', 'Outro']), description: z.string().min(1).max(4000), photoUris: z.array(z.string().max(6000000, 'Uma das fotos é grande demais. Tente imagens mais leves.')).max(6, 'No máximo 6 fotos por evento.').optional() })).mutation(({ input }) => operations.createFleetEvent(input)),
    }),
    workOrders: router({
      list: adminProcedure.input(pageInput.extend({ vehicleId: z.number().int().positive().optional(), maintenanceType: maintenanceType.optional(), from: z.string().date().optional(), to: z.string().date().optional() })).query(({ input }) => operations.listWorkOrders(input)),
      get: adminProcedure.input(idInput).query(async ({ input }) => { const order = await operations.getWorkOrder(input.id); if (!order) throw notFound(); return order; }),
      create: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), reasonId: z.number().int().positive().nullable().optional(), maintenanceType, maintenanceDate: z.string().date(), vehicleKm: z.number().int().min(0), observation: z.string().max(4000).nullable().optional(), costAmount: z.string().default('0'), status: workOrderStatus.default('Concluída') })).mutation(({ input }) => operations.createWorkOrder(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), reasonId: z.number().int().positive().nullable().optional(), maintenanceType: maintenanceType.optional(), maintenanceDate: z.string().date().optional(), vehicleKm: z.number().int().min(0).optional(), observation: z.string().max(4000).nullable().optional(), costAmount: z.string().optional(), status: workOrderStatus.optional() })).mutation(async ({ input: { id, ...changes } }) => { const order = await operations.updateWorkOrder(id, changes); if (!order) throw notFound(); return order; }),
      delete: adminProcedure.input(idInput).mutation(async ({ input }) => { const deleted = await operations.deleteWorkOrder(input.id); if (!deleted) throw notFound(); return deleted; }),
    }),
  }),
});
