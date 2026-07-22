import crypto from 'crypto';

const PREFIX = 'enc:v1';
const KEY_CONTEXT = 'cpe-monitor-secure-value';

function getSecret(): string {
  const secret = process.env.CPE_CONFIG_SECRET
    || process.env.CPE_SESSION_SECRET
    || process.env.JWT_SECRET
    || '';
  if (!secret) {
    throw new Error(
      '缺少 CPE_CONFIG_SECRET、CPE_SESSION_SECRET 或 JWT_SECRET，无法安全保存 CPE 密码。',
    );
  }
  return secret;
}

function getKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(`${KEY_CONTEXT}:${getSecret()}`)
    .digest();
}

export function isEncryptedSecureValue(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(`${PREFIX}.`));
}

export function encryptSecureValue(value: string, purpose: string): string {
  if (!value) throw new Error('不能加密空值');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  cipher.setAAD(Buffer.from(purpose, 'utf8'));
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSecureValue(value: string, purpose: string): string {
  if (!isEncryptedSecureValue(value)) return value;

  try {
    const [prefix, ivValue, authTagValue, encryptedValue] = value.split('.');
    if (
      prefix !== PREFIX
      || !ivValue
      || !authTagValue
      || !encryptedValue
    ) {
      throw new Error('加密数据格式不正确');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getKey(),
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAAD(Buffer.from(purpose, 'utf8'));
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`CPE 密码解密失败，请确认加密密钥未发生变化：${reason}`);
  }
}
