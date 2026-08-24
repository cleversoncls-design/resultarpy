import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from './_core/trpc';
import * as operations from './operations-repository';

const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

const tripStatus = z.enum(['Rascunho', 'Aguardando aprovação', 'Aprovada', 'Liberada para viagem', 'Em preparação', 'Em prestação', 'Finalizada', 'Rejeitada', 'Devolvida']);
const reservationStatus = z.enum(['Aguardando veículo', 'Reservado', 'Reservada', 'Em viagem', 'Finalizada', 'Cancelada']);
const maintenanceType = z.enum(['Preventiva', 'Corretiva']);
const vehicleStatus = z.enum(['Disponível', 'Reservado', 'Em viagem', 'Realizar Manutenção', 'Em manutenção', 'Extintor próximo do vencimento', 'Avaria registrada']);

export const operationsRouter = router({
  trips: router({
    list: protectedProcedure.input(pageInput.extend({ status: tripStatus.optional() })).query(({ ctx, input }) => operations.listTrips({ ...input, travelerId: ctx.user.role === 'admin' ? undefined : ctx.user.id })),
    create: protectedProcedure.input(z.object({
      tripCode: z.string().min(3).max(40), travelerId: z.number().int().positive(), approverId: z.number().int().positive().nullable().optional(), clientId: z.number().int().positive().nullable().optional(), unitId: z.number().int().positive().nullable().optional(), origin: z.string().min(1).max(120), destination: z.string().min(1).max(120), country: z.string().max(80).nullable().optional(), area: z.string().max(120).nullable().optional(), transport: z.string().max(120).nullable().optional(), startsOn: z.string().date(), endsOn: z.string().date(), status: tripStatus.default('Aguardando aprovação'), requiresFleetVehicle: z.boolean().default(false), hasAdvance: z.boolean().default(false), needsHotel: z.boolean().default(false), advanceAmount: z.string().default('0'),
    })).mutation(({ input }) => operations.createTrip(input)),
  }),
  expenses: router({
    list: protectedProcedure.input(pageInput.extend({ tripId: z.number().int().positive().optional() })).query(({ input }) => operations.listTripExpenses(input.tripId, input)),
    create: protectedProcedure.input(z.object({ tripId: z.number().int().positive(), expenseTypeId: z.number().int().positive(), occurredOn: z.string().date(), city: z.string().min(1).max(120), quantity: z.string().default('1'), unitValue: z.string(), expenseGroup: z.string().max(120).nullable().optional(), prepaid: z.boolean().default(false), billable: z.boolean().default(true), receiptUri: z.string().url().nullable().optional(), notes: z.string().max(2000).nullable().optional(), reviewNote: z.string().max(2000).nullable().optional() })).mutation(({ input }) => operations.createTripExpense({ ...input, amount: (Number(input.quantity) * Number(input.unitValue)).toFixed(2) })),
  }),
  fleet: router({
    vehicles: router({
      list: adminProcedure.input(pageInput.extend({ status: vehicleStatus.optional() })).query(({ input }) => operations.listVehicles(input)),
      create: adminProcedure.input(z.object({ plate: z.string().min(3).max(16), brand: z.string().min(1).max(80), model: z.string().min(1).max(100), modelYear: z.number().int().min(1950).max(2200), color: z.string().max(60).nullable().optional(), unitId: z.number().int().positive(), currentKm: z.number().int().min(0).default(0), lastMaintenanceKm: z.number().int().min(0).default(0), maintenanceIntervalKm: z.number().int().positive(), fireExtinguisherExpiresOn: z.string().date().nullable().optional(), status: vehicleStatus.default('Disponível'), notes: z.string().max(2000).nullable().optional() })).mutation(({ input }) => operations.createVehicle(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), currentKm: z.number().int().min(0).optional(), status: vehicleStatus.optional(), notes: z.string().max(2000).nullable().optional() })).mutation(({ input: { id, ...input } }) => operations.updateVehicle(id, input)),
    }),
    reservations: router({
      list: adminProcedure.input(pageInput.extend({ status: reservationStatus.optional() })).query(({ input }) => operations.listFleetReservations(input)),
      create: adminProcedure.input(z.object({ tripId: z.number().int().positive(), vehicleId: z.number().int().positive().nullable().optional(), driverId: z.number().int().positive(), status: reservationStatus.default('Aguardando veículo'), plannedStartOn: z.string().date(), plannedEndOn: z.string().date() })).mutation(({ input }) => operations.createFleetReservation(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), vehicleId: z.number().int().positive().nullable().optional(), status: reservationStatus.optional(), departureAt: z.coerce.date().nullable().optional(), departureKm: z.number().int().min(0).nullable().optional(), returnAt: z.coerce.date().nullable().optional(), returnKm: z.number().int().min(0).nullable().optional() })).mutation(({ input: { id, ...input } }) => operations.updateFleetReservation(id, input)),
    }),
    events: router({
      list: adminProcedure.input(pageInput.extend({ reservationId: z.number().int().positive().optional() })).query(({ input }) => operations.listFleetEvents(input.reservationId, input)),
      create: adminProcedure.input(z.object({ reservationId: z.number().int().positive(), eventType: z.enum(['Multa', 'Avaria', 'Outro']), description: z.string().min(1).max(4000), photoUri: z.string().url().nullable().optional() })).mutation(({ input }) => operations.createFleetEvent(input)),
    }),
    workOrders: router({
      list: adminProcedure.input(pageInput.extend({ vehicleId: z.number().int().positive().optional(), maintenanceType: maintenanceType.optional(), from: z.string().date().optional(), to: z.string().date().optional() })).query(({ input }) => operations.listWorkOrders(input)),
      create: adminProcedure.input(z.object({ vehicleId: z.number().int().positive(), reasonId: z.number().int().positive().nullable().optional(), maintenanceType: maintenanceType, maintenanceDate: z.string().date(), vehicleKm: z.number().int().min(0), observation: z.string().max(4000).nullable().optional(), costAmount: z.string().default('0'), status: z.enum(['Em andamento', 'Concluída', 'Cancelada']).default('Concluída') })).mutation(({ input }) => operations.createWorkOrder(input)),
    }),
  }),
});
