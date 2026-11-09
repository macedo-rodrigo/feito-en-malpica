/**
 * Generates the two secrets the editor login needs.
 *
 *   npm run admin:password -- "a-contrasinal-que-escollas"
 *
 * Prints an ADMIN_PASSWORD_HASH and a SESSION_SECRET to paste into the
 * host's environment variables. The password itself is never stored
 * anywhere, here or on the server.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const password = process.argv.slice(2).join(' ').trim();

if (!password) {
  console.error('\n  Falta o contrasinal:\n');
  console.error('    npm run admin:password -- "o-teu-contrasinal"\n');
  process.exit(1);
}

if (password.length < 12) {
  console.error('\n  Contrasinal demasiado curto: usa polo menos 12 caracteres.');
  console.error('  É a única porta do panel, e vaise escribir unha vez ao mes.\n');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);

console.log('\n  Pega estas dúas variables no teu servidor (en Netlify:');
console.log('  Site configuration -> Environment variables):\n');
console.log(`  ADMIN_PASSWORD_HASH = ${salt}:${derived.toString('hex')}`);
console.log(`  SESSION_SECRET      = ${randomBytes(32).toString('base64url')}`);
console.log('\n  Fan falla tamén ADMIN_EMAIL, GITHUB_TOKEN e GITHUB_REPO.');
console.log('  Está todo en docs/ADMIN.md.\n');
