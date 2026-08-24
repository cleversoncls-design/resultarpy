import { describe, expect, it } from 'vitest';

describe('Supabase configuration', () => {
  it('accepts configured credentials and reaches the auth settings endpoint', async () => {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      console.warn('Supabase não configurado neste ambiente; verificação remota opcional ignorada.');
      return;
    }

    expect(url).toMatch(/^https:\/\//);
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
    });
    expect(response.ok).toBe(true);
  }, 15000);
});
