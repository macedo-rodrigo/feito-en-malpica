/**
 * Checks that .env is filled in correctly, without printing anything from
 * it. Says what is wrong and what to run, never what the values are.
 *
 *   npm run admin:check
 */
import { readFile } from 'node:fs/promises';
import { parseEnv } from './lib/dotenv.mjs';

const FILE = '.env';

let raw;
try {
  raw = await readFile(FILE, 'utf8');
} catch {
  console.error('\n  Non hai ningún ficheiro .env nesta carpeta.\n');
  console.error('    cp .env.example .env\n');
  process.exit(1);
}

const { values: env, problems: malformed } = parseEnv(raw);


const problems = malformed.map((p) => `A liña ${p.line} do .env está mal: ${p.message}`);
const notes = [];

// --- accounts -------------------------------------------------------------
const accounts = (env.ADMIN_USERS ?? '')
  .split(/[;\n]/)
  .map((line) => line.trim())
  .filter(Boolean);

if (accounts.length === 0) {
  problems.push('ADMIN_USERS está baleiro. Xera unha liña con: npm run admin:password -- o@teu.correo');
} else {
  const good = [];
  for (const account of accounts) {
    const separator = account.search(/\s/);
    const email = separator < 0 ? account : account.slice(0, separator).trim();
    const hash = separator < 0 ? '' : account.slice(separator).trim();

    if (!email.includes('@')) {
      problems.push(`Unha conta non ten correo: empeza por "${account.slice(0, 12)}…"`);
    } else if (!/^[0-9a-f]{16,}:[0-9a-f]{32,}$/i.test(hash)) {
      problems.push(
        `A conta de ${email} non leva un hash válido` +
          (hash === 'sal:hash' ? ' (segue co texto de exemplo).' : '.') +
          ` Xérao con: npm run admin:password -- ${email}`,
      );
    } else {
      good.push(email);
    }
  }
  if (good.length > 0) {
    notes.push(`${good.length} conta(s) correcta(s): ${good.join(', ')}`);
  }
}

// --- session secret -------------------------------------------------------
const secret = env.SESSION_SECRET ?? '';
if (!secret) {
  problems.push(
    'Falta SESSION_SECRET. Xérao con:\n' +
      '      node -e "console.log(require(\'node:crypto\').randomBytes(32).toString(\'base64url\'))"',
  );
} else if (secret.length < 32) {
  problems.push(`SESSION_SECRET é curto de máis (${secret.length} caracteres, fan falla 32).`);
} else {
  notes.push('SESSION_SECRET correcto.');
}

// --- github ---------------------------------------------------------------
if (!env.GITHUB_TOKEN) {
  problems.push('Falta GITHUB_TOKEN.');
} else if (env.GITHUB_TOKEN.startsWith('ghp_') || env.GITHUB_TOKEN.startsWith('github_pat_')) {
  notes.push('GITHUB_TOKEN presente.');
} else {
  notes.push('GITHUB_TOKEN presente (non ten a forma habitual, pero pode valer).');
}

if (!env.GITHUB_REPO?.includes('/')) {
  problems.push('GITHUB_REPO ten que ser como "macedo-rodrigo/feito-en-malpica".');
} else {
  notes.push(`GITHUB_REPO: ${env.GITHUB_REPO}`);
}

// --- report ---------------------------------------------------------------
console.log('');
for (const note of notes) console.log(`  ok    ${note}`);
for (const problem of problems) console.log(`  FALTA ${problem}`);

if (problems.length === 0) {
  console.log('\n  Todo listo. Agora:\n');
  console.log('    npx netlify login');
  console.log('    npx netlify link');
  console.log('    npx netlify env:import .env\n');
} else {
  console.log(`\n  ${problems.length} cousa(s) por arranxar.\n`);
}

process.exit(problems.length === 0 ? 0 : 1);
