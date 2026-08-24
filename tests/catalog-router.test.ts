import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import { closeDb, getUserByOpenId } from "../server/db";
import type { TrpcContext } from "../server/_core/context";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;

const describePostgres = testDatabaseUrl ? describe : describe.skip;

type CallerUser = NonNullable<TrpcContext["user"]>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({
    user,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describePostgres("Cadastros gerais via tRPC", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("permite listar cadastros para usuário administrativo", async () => {
    const admin = await getUserByOpenId("seed-admin");
    expect(admin?.role).toBe("admin");
    const result = await callerFor(admin!).catalogs.units.list({ page: 1, pageSize: 20, direction: "asc" });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("bloqueia os cadastros para usuário não administrativo", async () => {
    const approver = await getUserByOpenId("seed-approver");
    expect(approver?.role).toBe("user");
    await expect(callerFor(approver!).catalogs.units.list({ page: 1, pageSize: 20, direction: "asc" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
