import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const compose = readFileSync(join(process.cwd(), "compose.yaml"), "utf8");

// This test guards the secret-handling contract of the Docker configuration.
describe("Docker environment configuration", () => {
  it("references authentication secrets through environment variables", () => {
    expect(compose).toContain("JWT_SECRET:");
    expect(compose).toContain("OAUTH_SERVER_URL:");
    expect(compose).toContain("BUILT_IN_FORGE_API_KEY:");
    expect(compose).toMatch(/JWT_SECRET:\s+\$\{JWT_SECRET:\?/);
    expect(compose).not.toContain("mysql://");
  });
});
