/**
 * Adds an account to the editor login, writing it into .env directly.
 *
 *   npm run admin:password -- correo@exemplo.gal
 *
 * The password is asked for, never passed as an argument: an argument ends
 * up in the shell's history file and in the scrollback. And the result is
 * written to .env rather than printed to be copied by hand, because that
 * copy is where a stray quote or a missing space gets in.
 *
 * Pass --print to see the line instead of writing it, for when the account
 * has to go straight into a hosting panel.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { readFile, writeFile } from 'node:fs/promises';
import { stdin, stdout } from 'node:process';
import { parseEnv, setEnvValue } from './lib/dotenv.mjs';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const FILE = '.env';

function fail(message) {
  console.error(`\n  ${message}\n`);
  console.error('    npm run admin:password -- correo@exemplo.gal\n');
  process.exit(1);
}

/**
 * Two separate paths on purpose. On a terminal, readline asks and the echo
 * is suppressed. Piped, readline answers the first question and then never
 * settles the second, so the input is read in one go instead; that path
 * exists so this can be tested without a terminal.
 */
async function reader() {
  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    const lines = Buffer.concat(chunks).toString().split('\n');
    const ask = (question) => {
      stdout.write(question + '\n');
      return Promise.resolve(lines.shift() ?? '');
    };
    ask.close = () => {};
    return ask;
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  const ask = (question) =>
    new Promise((resolve) => {
      let shown = false;
      rl._writeToOutput = (text) => {
        if (!shown && text.includes(question)) {
          stdout.write(question);
          shown = true;
        }
      };
      rl.question(question, (answer) => {
        stdout.write('\n');
        resolve(answer);
      });
    });
  ask.close = () => rl.close();
  return ask;
}

const args = process.argv.slice(2);
const printOnly = args.includes('--print');
const email = (args.find((a) => !a.startsWith('--')) ?? '').trim().toLowerCase();

if (!email || !email.includes('@')) fail('Falta o correo, ou non parece un correo.');

const ask = await reader();
const password = (await ask('  Contrasinal (non se ve mentres escribes): ')).trim();

if (!password) fail('Non escribiches nada.');
if (password.length < 16) {
  fail(
    `Demasiado curto: ${password.length} caracteres, fan falla 16.\n` +
      '  Non hai bloqueo tras varios intentos fallidos, así que a lonxitude é\n' +
      '  a defensa. Tres ou catro palabras soltas van mellor que algo curto\n' +
      '  con símbolos: "peirao-lonxa-vimbio-marea" é máis forte e máis doado\n' +
      '  de lembrar.',
  );
}

const confirmation = (await ask('  Repíteo: ')).trim();
if (confirmation !== password) fail('Non coinciden.');
ask.close();

const salt = randomBytes(16).toString('hex');
const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);
const account = `${email} ${salt}:${derived.toString('hex')}`;

if (printOnly) {
  console.log('\n  Engade isto a ADMIN_USERS, separado das outras cun ";".\n');
  console.log(account);
  console.log('');
  process.exit(0);
}

let text = '';
try {
  text = await readFile(FILE, 'utf8');
} catch {
  try {
    text = await readFile('.env.example', 'utf8');
    console.log('\n  Non había .env: creado a partir de .env.example.');
  } catch {
    text = '';
  }
}

const { values, problems } = parseEnv(text);
if (problems.length > 0) {
  console.error('\n  O .env ten liñas mal formadas e non vou tocalo ás cegas:\n');
  for (const problem of problems) console.error(`    liña ${problem.line}: ${problem.message}`);
  console.error('\n  Arránxaas, ou borra o ficheiro e empeza de novo con:');
  console.error('    cp .env.example .env\n');
  process.exit(1);
}

// Keep every other account, replace this person's if they already had one.
const existing = (values.ADMIN_USERS ?? '')
  .split(/[;\n]/)
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => /^[0-9a-f]{16,}:[0-9a-f]{32,}$/i.test(line.slice(line.search(/\s/) + 1).trim()));

const others = existing.filter((line) => !line.toLowerCase().startsWith(`${email} `));
const replaced = others.length < existing.length;

text = setEnvValue(text, 'ADMIN_USERS', [...others, account].join(';'));

// A session secret is needed once, for every account together.
if (!values.SESSION_SECRET || values.SESSION_SECRET.length < 32) {
  text = setEnvValue(text, 'SESSION_SECRET', randomBytes(32).toString('base64url'));
  console.log('  Xerado tamén un SESSION_SECRET, que faltaba.');
}
if (!values.GITHUB_REPO) {
  text = setEnvValue(text, 'GITHUB_REPO', 'macedo-rodrigo/feito-en-malpica');
}

await writeFile(FILE, text.endsWith('\n') ? text : `${text}\n`);

console.log(
  `\n  ${replaced ? 'Actualizada' : 'Engadida'} a conta de ${email} en .env.` +
    ` Hai ${others.length + 1} conta(s).`,
);
console.log('\n  Comproba como vai todo con:  npm run admin:check\n');
