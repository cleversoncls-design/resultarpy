import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

// Cifra a senha SMTP guardada no banco (AES-256-GCM). A chave é derivada do
// JWT_SECRET do servidor, então quem tiver só um dump do banco não consegue
// ler a senha. Formato guardado: "v1:<iv>:<tag>:<texto cifrado>" (base64).
const PREFIX = 'v1';

// Lê o JWT_SECRET na hora do uso (e não uma cópia feita na inicialização).
function deriveKey() {
  const secret = process.env.JWT_SECRET ?? '';
  if (!secret) throw new Error('JWT_SECRET não está configurado no servidor; não é possível guardar a senha SMTP com segurança.');
  return scryptSync(secret, 'controle-viagens:smtp-password', 32);
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [PREFIX, iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

export function decryptSecret(stored: string) {
  const [prefix, iv, tag, data] = stored.split(':');
  if (prefix !== PREFIX || !iv || !tag || !data) throw new Error('Senha SMTP guardada em formato inválido; informe a senha novamente.');
  try {
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Não foi possível ler a senha SMTP guardada (o JWT_SECRET mudou?). Informe a senha novamente.');
  }
}
