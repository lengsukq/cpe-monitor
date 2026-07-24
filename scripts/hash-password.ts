/**
 * Generate a bcrypt hash for use as ADMIN_PASSWORD_HASH in .env.local
 *
 * Usage:
 *   npx tsx scripts/hash-password.ts <your-password>
 *
 * Then set the output in .env.local:
 *   ADMIN_PASSWORD_HASH=$2b$12$...
 */
import { hash } from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npx tsx scripts/hash-password.ts <password>');
  process.exit(1);
}

const hashed = await hash(password, 12);
console.log('\nAdd the following to your .env.local:\n');
console.log(`ADMIN_PASSWORD_HASH=${hashed}\n`);
