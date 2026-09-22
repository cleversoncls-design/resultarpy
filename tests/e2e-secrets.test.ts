import { describe, expect, it } from 'vitest';

describe('E2E isolated credentials configuration', () => {
  it('requires an isolated base URL and credential pair when E2E is enabled', async () => {
    const baseUrl = process.env.E2E_BASE_URL;
    const email = process.env.E2E_ADMIN_EMAIL;
    const password = process.env.E2E_ADMIN_PASSWORD;

    // The HTTP preflight is intentionally opt-in: the default unit-test process
    // runs outside the user's private LAN and must not probe a private server.
    if (process.env.E2E_SECRET_CHECK !== '1') return;
    if (!baseUrl && !email && !password) return;

    expect(baseUrl).toMatch(/^https?:\/\//);
    expect(email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    expect(password).toBeTruthy();
    expect(password).not.toBe(email);

    const response = await fetch(new URL('/login', baseUrl));
    expect(response.status).toBeLessThan(500);
  });
});
