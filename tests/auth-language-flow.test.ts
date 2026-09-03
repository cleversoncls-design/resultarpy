import { describe, expect, it } from 'vitest';
import { appRouter } from '../server/routers';
import { COOKIE_NAME } from '../shared/const';
import type { TrpcContext } from '../server/_core/context';
import { translateText } from '../lib/language-provider';

describe('auth and language flow', () => {
  it('keeps the authenticated flow usable after switching to Spanish and logging out', async () => {
    const clearedCookies: string[] = [];
    const context: TrpcContext = {
      user: {
        id: 42,
        openId: 'local-flow-user',
        email: 'flow@example.local',
        name: 'Usuário de fluxo',
        loginMethod: 'local',
        role: 'user',
        profile: 'traveler',
        birthDate: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: 'https', hostname: 'localhost', headers: {} } as TrpcContext['req'],
      res: { clearCookie: (name: string) => { clearedCookies.push(name); } } as unknown as TrpcContext['res'],
    };

    expect(context.user?.active).toBe(true);
    expect(translateText('Encerrar sessão', 'es-ES')).toBe('Cerrar sesión');

    const result = await appRouter.createCaller(context).auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toEqual([COOKIE_NAME]);
  });
});
