/**
 * Checks a password against the hash stored in .env, without touching the
 * network or the deployed site.
 *
 *   npm run admin:try -- correo@exemplo.gal
 *
 * It answers one question: is the password you are typing the one this
 * project knows about? If it is and the site still refuses you, the problem
 * is the copy of the variables on the host, not the password.
 */
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { askSecret } from './lib/prompt.mjs';
import { readFile } from 'node:fs/promises';

import { parseEnv } from './lib/dotenv.mjs';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('\n  Falta o correo.\n');
  console.error('    npm run admin:try -- correo@exemplo.gal\n');
  process.exit(1);
}

let raw;
try {
  raw = await readFile('.env', 'utf8');
} catch {
  console.error('\n  Non hai ficheiro .env nesta carpeta.\n');
  process.exit(1);
}

const { values } = parseEnv(raw);
const accounts = (values.ADMIN_USERS ?? '')
  .split(/[;\n]/)
  .map((line) => line.trim())
  .filter(Boolean);

const line = accounts.find((account) => account.toLowerCase().startsWith(`${email} `));
if (!line) {
  console.error(`\n  En .env non hai ningunha conta para ${email}.`);
  console.error(`  Hai ${accounts.length}: ${accounts.map((a) => a.split(/\s/)[0]).join(', ')}\n`);
  process.exit(1);
}

const stored = line.slice(line.search(/\s/)).trim();
const [salt, expectedHex] = stored.split(':');

const password = (await askSecret('  Contrasinal a probar (vense asteriscos): ')).trim();
console.log(`  (lin ${password.length} caracteres)`);
const expected = Buffer.from(expectedHex, 'hex');
const derived = await scryptAsync(password, salt, expected.length, SCRYPT);
const matches = derived.length === expected.length && timingSafeEqual(derived, expected);

if (matches) {
  console.log(`\n  CORRECTA. Esa é a contrasinal de ${email} neste .env.`);
  console.log('\n  Se aínda así a web non te deixa entrar, o que falla son as');
  console.log('  variables do servidor, non a contrasinal. Comproba con:\n');
  console.log('    npx netlify env:list\n');
} else {
  console.log(`\n  NON COINCIDE coa que hai en .env para ${email}.`);
  console.log('\n  Ou é outra contrasinal, ou houbo unha errata ao crearla.');
  console.log('  Para poñer outra:\n');
  console.log(`    npm run admin:password -- ${email}`);
  console.log('    npx netlify env:import .env\n');
}

process.exit(matches ? 0 : 1);
