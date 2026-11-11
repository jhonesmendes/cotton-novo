import crypto from 'crypto';

// AES-256-GCM com chave derivada da ENCRYPTION_KEY — para segredos guardados no
// banco (ex.: senha do SMTP). Formato: iv.tag.cifra (base64).
function chave() {
  const segredo = process.env.ENCRYPTION_KEY;
  if (!segredo) throw new Error('ENCRYPTION_KEY não configurada');
  return crypto.createHash('sha256').update(segredo).digest();
}

export function cifrar(texto: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', chave(), iv);
  const cifra = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), cifra].map((b) => b.toString('base64')).join('.');
}

export function decifrar(valor: string) {
  const [iv, tag, cifra] = valor.split('.').map((p) => Buffer.from(p, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(cifra), d.final()]).toString('utf8');
}
