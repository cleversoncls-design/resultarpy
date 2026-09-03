import { describe, expect, it } from "vitest";
import { hashPassword, normalizeProfile, validatePassword, verifyPassword } from "../server/local-auth";

describe("local authentication", () => {
  it("hashes and verifies a valid password without storing it in plain text", async () => {
    const password = "SenhaLocal123";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$[^$]+\$[^$]+$/);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("SenhaIncorreta123", hash)).toBe(false);
  });

  it("normalizes the four supported local profiles", () => {
    expect(normalizeProfile("traveler")).toBe("traveler");
    expect(normalizeProfile("traveler_approver")).toBe("traveler_approver");
    expect(normalizeProfile("approver")).toBe("approver");
    expect(normalizeProfile("admin")).toBe("admin");
    expect(normalizeProfile("unknown")).toBe("traveler_approver");
  });

  it("rejects weak passwords", () => {
    expect(validatePassword("curta")).toBeTruthy();
    expect(validatePassword("somente-minusculas")).toBeTruthy();
    expect(validatePassword("SenhaForte123")).toBeNull();
  });
});
