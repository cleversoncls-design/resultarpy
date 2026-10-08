import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildMimeMessage, sendSmtpMail, type SmtpConfig } from '../server/smtp-client';
import { invalidRecipients, isValidEmail, parseRecipients } from '../server/email-service';

// Servidor SMTP falso (sem TLS) que guarda o que recebeu, só para validar o protocolo.
type Received = { rcpt: string[]; data: string };
let server: net.Server;
let port = 0;
const received: Received[] = [];

function handle(socket: net.Socket) {
  let buffer = '';
  let inData = false;
  let data = '';
  let current: Received = { rcpt: [], data: '' };
  let authed = false;
  const send = (line: string) => socket.write(`${line}\r\n`);
  socket.on('error', () => {});
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let index: number;
    while ((index = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (inData) {
        if (line === '.') { inData = false; received.push({ ...current, data }); send('250 queued'); } else data += `${line}\n`;
        continue;
      }
      const command = line.toUpperCase();
      if (command.startsWith('EHLO')) { send('250-fake'); send('250 AUTH PLAIN'); }
      else if (command.startsWith('AUTH PLAIN')) {
        const [, user, pass] = Buffer.from(line.split(' ')[2] ?? '', 'base64').toString().split('\0');
        if (user === 'usuario@teste.com' && pass === 'senha-certa') { authed = true; send('235 ok'); } else send('535 credenciais invalidas');
      }
      else if (command.startsWith('MAIL FROM')) { if (!authed) send('530 autenticacao necessaria'); else { current = { rcpt: [], data: '' }; send('250 ok'); } }
      else if (command.startsWith('RCPT TO')) { current.rcpt.push(line.slice(8).replace(/[<>]/g, '')); send('250 ok'); }
      else if (command === 'DATA') { inData = true; data = ''; send('354 go'); }
      else if (command === 'QUIT') { send('221 bye'); socket.end(); }
      else send('500 comando desconhecido');
    }
  });
  send('220 fake ESMTP');
}

beforeAll(async () => {
  server = net.createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as net.AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const config = (overrides: Partial<SmtpConfig> = {}): SmtpConfig => ({ host: '127.0.0.1', port, security: 'none', user: 'usuario@teste.com', password: 'senha-certa', fromEmail: 'viagens@teste.com', fromName: 'Controle de Viagens', ...overrides });

describe('cliente SMTP', () => {
  it('autentica, entrega para todos os destinatários e preserva acentos no assunto e no corpo', async () => {
    received.length = 0;
    const text = 'Olá, João.\n.linha começando com ponto\nFim';
    await sendSmtpMail(config(), { to: ['a@exemplo.com', 'b@exemplo.com'], subject: 'Aprovação da viagem — São Paulo', text });
    expect(received).toHaveLength(1);
    expect(received[0]?.rcpt).toEqual(['a@exemplo.com', 'b@exemplo.com']);
    const data = received[0]?.data ?? '';
    expect(data).toMatch(/^Subject: =\?UTF-8\?B\?/m);
    const body = data.split('\n\n')[1]?.replace(/\s+/g, '') ?? '';
    expect(Buffer.from(body, 'base64').toString('utf8').replace(/\r/g, '')).toBe(text);
  });

  it('informa o erro do servidor quando a senha está errada', async () => {
    await expect(sendSmtpMail(config({ password: 'errada' }), { to: ['a@exemplo.com'], subject: 'x', text: 'y' })).rejects.toThrow(/535/);
  });

  it('falha com mensagem clara quando não consegue conectar', async () => {
    await expect(sendSmtpMail(config({ port: 1 }), { to: ['a@exemplo.com'], subject: 'x', text: 'y' })).rejects.toThrow(/conectar/);
  });

  it('não deixa campos digitados injetarem cabeçalhos', () => {
    const message = buildMimeMessage(config({ fromName: 'X\r\nBcc: mal@exemplo.com' }), { to: ['a@exemplo.com\r\nBcc: mal@exemplo.com'], subject: 'S\r\nBcc: mal@exemplo.com', text: 't' });
    expect(message).not.toMatch(/^Bcc:/m);
  });
});

describe('destinatários', () => {
  it('aceita um e-mail por linha, vírgula ou ponto e vírgula, sem repetir', () => {
    expect(parseRecipients('A@x.com, b@x.com;\nc@x.com\n a@x.com')).toEqual(['a@x.com', 'b@x.com', 'c@x.com']);
  });

  it('aponta os e-mails inválidos', () => {
    expect(invalidRecipients('ok@x.com, sem-arroba, outro@')).toEqual(['sem-arroba', 'outro@']);
    expect(isValidEmail('ok@x.com')).toBe(true);
    expect(isValidEmail('ok@x')).toBe(false);
  });
});

describe('senha SMTP guardada', () => {
  it('cifra e decifra, e a cifra muda a cada vez', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-smtp';
    const { decryptSecret, encryptSecret } = await import('../server/email-crypto');
    const first = encryptSecret('minha-senha');
    expect(first).not.toContain('minha-senha');
    expect(decryptSecret(first)).toBe('minha-senha');
    expect(encryptSecret('minha-senha')).not.toBe(first);
  });
});
