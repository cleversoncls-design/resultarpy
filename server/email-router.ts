import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { adminProcedure, router } from './_core/trpc';
import { getPublicEmailSettings, invalidRecipients, isValidEmail, listEmailLog, saveEmailSettings, sendTestEmail } from './email-service';

const settingsInput = z.object({
  enabled: z.boolean(),
  smtpHost: z.string().trim().max(255),
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecurity: z.enum(['ssl', 'starttls', 'none']),
  smtpUser: z.string().trim().max(255),
  // Vazio/ausente = manter a senha já guardada.
  smtpPassword: z.string().max(500).optional(),
  fromEmail: z.string().trim().max(320),
  fromName: z.string().trim().max(160),
  adminRecipients: z.string().max(2000),
});

const badRequest = (message: string) => new TRPCError({ code: 'BAD_REQUEST', message });

export const emailRouter = router({
  get: adminProcedure.query(() => getPublicEmailSettings()),
  save: adminProcedure.input(settingsInput).mutation(async ({ input }) => {
    if (input.enabled) {
      if (!input.smtpHost) throw badRequest('Informe o servidor SMTP para ativar o envio.');
      if (!isValidEmail(input.fromEmail)) throw badRequest('Informe um e-mail de origem válido para ativar o envio.');
    } else if (input.fromEmail && !isValidEmail(input.fromEmail)) {
      throw badRequest('O e-mail de origem informado não é válido.');
    }
    const invalid = invalidRecipients(input.adminRecipients);
    if (invalid.length) throw badRequest(`E-mail(s) do Administrativo inválido(s): ${invalid.join(', ')}`);
    return saveEmailSettings(input);
  }),
  sendTest: adminProcedure.input(z.object({ to: z.string().trim().max(320) })).mutation(async ({ input }) => {
    if (!isValidEmail(input.to)) throw badRequest('Informe um e-mail válido para o teste.');
    try {
      return await sendTestEmail(input.to);
    } catch (error) {
      throw badRequest(error instanceof Error ? error.message : 'Não foi possível enviar o e-mail de teste.');
    }
  }),
  log: adminProcedure.input(z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(1).max(100).default(20) })).query(({ input }) => listEmailLog(input)),
});
