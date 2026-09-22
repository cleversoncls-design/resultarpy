import type { Express, Request, Response } from "express";
import {
  authenticateLocalUser,
  clearLocalSessionCookie,
  createLocalUser,
  getLocalUserFromRequest,
  listLocalUsers,
  setLocalUserActive,
  updateLocalUser,
  resetLocalUserPassword,
  publicUser,
  revokeLocalSession,
  setLocalSessionCookie,
} from "./local-auth";

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function respondValidation(res: Response, message: string) {
  res.status(400).json({ error: message });
}

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/local/login", async (req: Request, res: Response) => {
    const email = stringValue(req.body?.email);
    const password = stringValue(req.body?.password);
    if (!email || !password) {
      respondValidation(res, "Informe e-mail e senha.");
      return;
    }

    try {
      const result = await authenticateLocalUser(email, password);
      if (!result) {
        res.status(401).json({ error: "E-mail ou senha inválidos." });
        return;
      }
      setLocalSessionCookie(req, res, result.sessionToken);
      res.json({ user: publicUser(result.user) });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "Não foi possível realizar o login." });
    }
  });

  app.get("/api/auth/local/me", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      res.json({ user: user ? publicUser(user) : null });
    } catch (error) {
      console.error("[LocalAuth] Session lookup failed", error);
      res.status(500).json({ error: "Não foi possível consultar a sessão." });
    }
  });

  app.post("/api/auth/local/logout", async (req: Request, res: Response) => {
    try {
      await revokeLocalSession(req);
    } finally {
      clearLocalSessionCookie(req, res);
    }
    res.json({ success: true });
  });

  // Autoatendimento: o próprio usuário troca a senha, confirmando a atual
  // — antes disso não existia, só o Administrativo podia redefinir senha
  // de qualquer pessoa (sem pedir a senha atual, já que é uma ação de
  // confiança elevada do admin, diferente desta aqui).
  app.post("/api/auth/local/me/change-password", async (req: Request, res: Response) => {
    try {
      const user = await getLocalUserFromRequest(req);
      if (!user) {
        res.status(401).json({ error: "Sessão expirada. Entre novamente." });
        return;
      }
      const currentPassword = stringValue(req.body?.currentPassword);
      const newPassword = stringValue(req.body?.newPassword);
      if (!currentPassword || !newPassword) {
        respondValidation(res, "Informe a senha atual e a nova senha.");
        return;
      }
      if (!user.email) {
        res.status(400).json({ error: "Esta conta não possui e-mail configurado." });
        return;
      }
      const verified = await authenticateLocalUser(user.email, currentPassword);
      if (!verified) {
        res.status(400).json({ error: "A senha atual informada está incorreta." });
        return;
      }
      await resetLocalUserPassword(user.id, newPassword);
      // resetLocalUserPassword encerra as sessões existentes por segurança
      // (inclusive esta) — autenticamos de novo com a senha nova para que
      // quem acabou de trocar a própria senha não seja deslogado na hora.
      const relogged = await authenticateLocalUser(user.email, newPassword);
      if (relogged) setLocalSessionCookie(req, res, relogged.sessionToken);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível trocar a senha.";
      res.status(message.startsWith("A senha") ? 400 : 500).json({ error: message });
    }
  });

  app.post("/api/auth/local/users", async (req: Request, res: Response) => {
    try {
      const admin = await getLocalUserFromRequest(req);
      if (!admin || admin.role !== "admin") {
        res.status(403).json({ error: "Acesso administrativo necessário." });
        return;
      }
      const name = stringValue(req.body?.name);
      const email = stringValue(req.body?.email);
      const password = stringValue(req.body?.password);
      const profile = typeof req.body?.profile === 'string' ? req.body.profile : 'traveler_approver';
      const birthDate = req.body?.birthDate === null || req.body?.birthDate === undefined ? null : stringValue(req.body.birthDate);
      const role = profile === 'admin' ? 'admin' : 'user';
      if (!name || !email || !password) {
        respondValidation(res, "Nome, e-mail e senha são obrigatórios.");
        return;
      }
      const user = await createLocalUser({ name, email, password, role, profile: profile as Parameters<typeof createLocalUser>[0]['profile'], birthDate });
      res.status(201).json({ user: publicUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível criar o usuário.";
      res.status(message.startsWith("Já existe") || message.startsWith("A senha") || message.startsWith("Informe") ? 400 : 500).json({ error: message });
    }
  });

  app.get('/api/auth/local/users', async (req: Request, res: Response) => {
    try {
      const admin = await getLocalUserFromRequest(req);
      if (!admin || admin.role !== 'admin') {
        res.status(403).json({ error: 'Acesso administrativo necessário.' });
        return;
      }
      const users = await listLocalUsers();
      res.json({ users: users.map(publicUser) });
    } catch (error) {
      console.error('[LocalAuth] User list failed', error);
      res.status(500).json({ error: 'Não foi possível consultar os usuários.' });
    }
  });

  app.patch('/api/auth/local/users/:id', async (req: Request, res: Response) => {
    try {
      const admin = await getLocalUserFromRequest(req);
      if (!admin || admin.role !== 'admin') {
        res.status(403).json({ error: 'Acesso administrativo necessário.' });
        return;
      }
      const userId = Number(req.params.id);
      const name = stringValue(req.body?.name).trim();
      const profile = stringValue(req.body?.profile);
      const birthDate = req.body?.birthDate === null || req.body?.birthDate === undefined ? null : stringValue(req.body.birthDate);
      if (!Number.isSafeInteger(userId) || userId <= 0 || !name || !['traveler', 'traveler_approver', 'approver', 'admin'].includes(profile)) {
        respondValidation(res, 'Nome, usuário e perfil válido são obrigatórios.');
        return;
      }
      const user = await updateLocalUser(userId, { name, profile: profile as Parameters<typeof updateLocalUser>[1]['profile'], birthDate });
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }
      res.json({ user: publicUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível editar o usuário.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/auth/local/users/:id/reset-password', async (req: Request, res: Response) => {
    try {
      const admin = await getLocalUserFromRequest(req);
      if (!admin || admin.role !== 'admin') {
        res.status(403).json({ error: 'Acesso administrativo necessário.' });
        return;
      }
      const userId = Number(req.params.id);
      const password = stringValue(req.body?.password);
      if (!Number.isSafeInteger(userId) || userId <= 0 || !password) {
        respondValidation(res, 'Usuário e nova senha são obrigatórios.');
        return;
      }
      const updated = await resetLocalUserPassword(userId, password);
      if (!updated) {
        res.status(404).json({ error: 'Credencial local não encontrada.' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível redefinir a senha.';
      res.status(message.startsWith('A senha') ? 400 : 500).json({ error: message });
    }
  });

  app.patch('/api/auth/local/users/:id/status', async (req: Request, res: Response) => {
    try {
      const admin = await getLocalUserFromRequest(req);
      if (!admin || admin.role !== 'admin') {
        res.status(403).json({ error: 'Acesso administrativo necessário.' });
        return;
      }
      const userId = Number(req.params.id);
      const active = req.body?.active === true;
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        respondValidation(res, 'Usuário inválido.');
        return;
      }
      if (!active && userId === admin.id) {
        respondValidation(res, 'Não é possível bloquear a própria conta administrativa.');
        return;
      }
      const user = await setLocalUserActive(userId, active);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado.' });
        return;
      }
      res.json({ user: publicUser(user) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o usuário.';
      res.status(message.includes('último Administrador') ? 400 : 500).json({ error: message });
    }
  });
}
