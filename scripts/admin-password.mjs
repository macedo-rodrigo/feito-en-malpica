/**
 * Generates one account line for the editor login.
 *
 *   npm run admin:password -- correo@exemplo.gal "o contrasinal"
 *
 * Prints the line to add to ADMIN_USERS, and a SESSION_SECRET for the first
 * time it is run. The password itself is never stored anywhere, here or on
 * the server.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const [email, ...rest] = process.argv.slice(2);
const password = rest.join(' ').trim();

function fail(message) {
  console.error(`\n  ${message}\n`);
  console.error('    npm run admin:password -- correo@exemplo.gal "o contrasinal"\n');
  process.exit(1);
}

if (!email || !email.includes('@')) fail('Falta o correo, ou non parece un correo.');
if (!password) fail('Falta o contrasinal.');
if (password.length < 12) {
  fail('Contrasinal demasiado curto: usa polo menos 12 caracteres. É a única porta do panel.');
}

const salt = randomBytes(16).toString('hex');
const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);

console.log('\n  Engade esta liña á variable ADMIN_USERS do servidor.');
console.log('  Se xa hai outras persoas, déixaas e pon esta debaixo:\n');
console.log(`${email.trim().toLowerCase()} ${salt}:${derived.toString('hex')}`);
console.log('\n  A primeira vez fai falla tamén un SESSION_SECRET. Vale este:\n');
console.log(`${randomBytes(32).toString('base64url')}`);
console.log('\n  E GITHUB_TOKEN e GITHUB_REPO. Está todo en docs/ADMIN.md.\n');
