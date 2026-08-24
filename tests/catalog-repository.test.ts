import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../server/db";
import {
  archiveClient,
  archiveExpenseType,
  archiveTraveler,
  archiveUnit,
  createClient,
  createExpenseType,
  createTraveler,
  createUnit,
  listClients,
  listExpenseTypes,
  listTravelers,
  listUnits,
} from "../server/catalog-repository";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

const describePostgres = testDatabaseUrl ? describe : describe.skip;

describePostgres("PostgreSQL catalog repositories", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("lists units and clients with search and pagination", async () => {
    const units = await listUnits({ page: 1, pageSize: 10, search: "São", direction: "asc" });
    expect(units.items.length).toBeGreaterThan(0);
    expect(units.items[0]?.city).toContain("São");

    const clients = await listClients({ page: 1, pageSize: 10, search: "Agro", direction: "asc" });
    expect(clients.items.map((item) => item.name)).toContain("AgroNorte S.A.");
  });

  it("creates and archives a unit, client, traveler and expense type", async () => {
    const suffix = `${Date.now()}-${process.pid}`;
    const unit = await createUnit({ code: `TEST-${suffix}`, name: `Unidade ${suffix}`, city: "Teste" });
    expect(unit?.active).toBe(true);
    await archiveUnit(unit.id);

    const client = await createClient({ name: `Cliente ${suffix}`, billingCurrency: "BRL" });
    expect(client?.active).toBe(true);
    await archiveClient(client.id);

    const traveler = await createTraveler({
      name: `Viajante ${suffix}`,
      userId: null,
      unitId: unit.id,
      documentNumber: `DOC-${suffix}`,
      canDrive: true,
    });
    expect(traveler?.canDrive).toBe(true);
    await archiveTraveler(traveler.id);

    const expenseType = await createExpenseType({ name: `Gasto ${suffix}`, description: "Teste de integração" });
    expect(expenseType?.active).toBe(true);
    await archiveExpenseType(expenseType.id);

    const activeUnits = await listUnits({ page: 1, pageSize: 100, search: `Unidade ${suffix}`, direction: "asc" });
    expect(activeUnits.items).toHaveLength(0);
    const allExpenseTypes = await listExpenseTypes({
      page: 1,
      pageSize: 100,
      search: `Gasto ${suffix}`,
      includeInactive: true,
      direction: "asc",
    });
    expect(allExpenseTypes.items[0]?.active).toBe(false);

    const travelers = await listTravelers({ page: 1, pageSize: 100, search: `Viajante ${suffix}`, includeInactive: true, direction: "asc" });
    expect(travelers.items[0]?.active).toBe(false);
  });
});
