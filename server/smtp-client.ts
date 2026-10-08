import net from 'node:net';
import tls from 'node:tls';
import { randomUUID } from 'node:crypto';

// Cliente SMTP mínimo (sem dependências): SSL/TLS direto, STARTTLS ou
// conexão simples, com AUTH PLAIN/LOGIN. Suficiente para os avisos
// automáticos do sistema (texto puro, UTF-8).
export type SmtpSecurity = 'ssl' | 'starttls' | 'none';

export type SmtpConfig = {
  host: string;
  port: number;
  security: SmtpSecurity;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export type SmtpMessage = { to: string[]; subject: string; text: string };

const TIMEOUT_MS = 20_000;

// Remove CR/LF para que nenhum campo digitado consiga injetar cabeçalhos.
const clean = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
const encodeHeader = (value: string) => (/^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`);

export function buildMimeMessage(config: SmtpConfig, message: SmtpMessage) {
  const fromName = clean(config.fromName);
  const from = fromName ? `${encodeHeader(fromName)} <${clean(config.fromEmail)}>` : clean(config.fromEmail);
  const domain = clean(config.fromEmail).split('@')[1] || 'localhost';
  const body = Buffer.from(message.text.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  return [
    `From: ${from}`,
    `To: ${message.to.map(clean).join(', ')}`,
    `Subject: ${encodeHeader(clean(message.subject))}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

type Reply = { code: number; text: string };

class SmtpSession {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private waiters: Array<{ resolve: (reply: Reply) => void; reject: (error: Error) => void }> = [];
  private queued: Reply[] = [];
  private failure: Error | null = null;
  private pendingLines: string[] = [];

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.attach();
  }

  private attach() {
    this.socket.setTimeout(TIMEOUT_MS, () => this.fail(new Error('Tempo esgotado esperando resposta do servidor SMTP.')));
    this.socket.on('data', (chunk) => this.onData(chunk.toString('utf8')));
    this.socket.on('error', (error) => this.fail(error));
    this.socket.on('close', () => this.fail(new Error('O servidor SMTP encerrou a conexão.')));
  }

  private fail(error: Error) {
    if (this.failure) return;
    this.failure = error;
    this.socket.destroy();
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
  }

  private onData(text: string) {
    this.buffer += text;
    let index: number;
    while ((index = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, index).replace(/\r$/, '');
      this.buffer = this.buffer.slice(index + 1);
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) continue;
      this.pendingLines.push(match[3] ?? '');
      if (match[2] === ' ') {
        const reply: Reply = { code: Number(match[1]), text: this.pendingLines.join('\n') };
        this.pendingLines = [];
        const waiter = this.waiters.shift();
        if (waiter) waiter.resolve(reply);
        else this.queued.push(reply);
      }
    }
  }

  read(): Promise<Reply> {
    if (this.failure) return Promise.reject(this.failure);
    const queued = this.queued.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  async command(line: string, expected: number[], secret = false): Promise<Reply> {
    if (this.failure) throw this.failure;
    this.socket.write(`${line}\r\n`);
    const reply = await this.read();
    if (!expected.includes(reply.code)) {
      const shown = secret ? '(dados de autenticação)' : line.split(' ')[0];
      throw new Error(`Servidor SMTP respondeu ${reply.code} a ${shown}: ${reply.text}`);
    }
    return reply;
  }

  write(data: string) {
    this.socket.write(data);
  }

  // Troca o socket por uma versão TLS (STARTTLS), mantendo a mesma sessão.
  async upgradeToTls(host: string) {
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('error');
    this.socket.removeAllListeners('close');
    this.socket.setTimeout(0);
    const secure = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const upgraded = tls.connect({ socket: this.socket as net.Socket, servername: net.isIP(host) ? undefined : host }, () => resolve(upgraded));
      upgraded.once('error', reject);
    });
    this.socket = secure;
    this.buffer = '';
    this.pendingLines = [];
    this.attach();
  }

  close() {
    this.socket.destroy();
  }
}

function connect(config: SmtpConfig): Promise<net.Socket | tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const servername = net.isIP(config.host) ? undefined : config.host;
    const socket: net.Socket | tls.TLSSocket = config.security === 'ssl'
      ? tls.connect({ host: config.host, port: config.port, servername }, () => resolve(socket))
      : net.connect({ host: config.host, port: config.port }, () => resolve(socket));
    socket.setTimeout(TIMEOUT_MS, () => { socket.destroy(); reject(new Error(`Não foi possível conectar a ${config.host}:${config.port} (tempo esgotado).`)); });
    socket.once('error', (error) => reject(new Error(`Não foi possível conectar a ${config.host}:${config.port}: ${error.message}`)));
  });
}

export async function sendSmtpMail(config: SmtpConfig, message: SmtpMessage) {
  if (!message.to.length) throw new Error('Nenhum destinatário informado.');
  const socket = await connect(config);
  socket.setTimeout(0);
  const session = new SmtpSession(socket);
  try {
    const greeting = await session.read();
    if (greeting.code !== 220) throw new Error(`Servidor SMTP recusou a conexão: ${greeting.code} ${greeting.text}`);
    const ehloName = 'controle-viagens.local';
    let ehlo = await session.command(`EHLO ${ehloName}`, [250]);
    if (config.security === 'starttls') {
      await session.command('STARTTLS', [220]);
      await session.upgradeToTls(config.host);
      ehlo = await session.command(`EHLO ${ehloName}`, [250]);
    }
    if (config.user) {
      const mechanisms = ehlo.text.toUpperCase();
      if (mechanisms.includes('PLAIN') || !mechanisms.includes('LOGIN')) {
        const token = Buffer.from(`\0${config.user}\0${config.password}`, 'utf8').toString('base64');
        await session.command(`AUTH PLAIN ${token}`, [235], true);
      } else {
        await session.command('AUTH LOGIN', [334]);
        await session.command(Buffer.from(config.user, 'utf8').toString('base64'), [334], true);
        await session.command(Buffer.from(config.password, 'utf8').toString('base64'), [235], true);
      }
    }
    await session.command(`MAIL FROM:<${clean(config.fromEmail)}>`, [250]);
    for (const recipient of message.to) await session.command(`RCPT TO:<${clean(recipient)}>`, [250, 251]);
    await session.command('DATA', [354]);
    // O corpo é base64 (sem linhas começando com "."), então não precisa de dot-stuffing.
    session.write(`${buildMimeMessage(config, message)}\r\n.\r\n`);
    const done = await session.read();
    if (done.code !== 250) throw new Error(`Servidor SMTP recusou a mensagem: ${done.code} ${done.text}`);
    try { await session.command('QUIT', [221]); } catch { /* o envio já foi aceito */ }
  } finally {
    session.close();
  }
}
