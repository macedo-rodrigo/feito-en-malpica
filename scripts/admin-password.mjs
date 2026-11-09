/**
 * Generates one account line for the editor login.
 *
 *   npm run admin:password -- correo@exemplo.gal
 *
 * The password is asked for, never passed as an argument: an argument ends
 * up in the shell's history file and in the scrollback, where it outlives
 * any care taken with it afterwards. Nothing typed here is written to disk.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function fail(message) {
  console.error(`\n  ${message}\n`);
  console.error('    npm run admin:password -- correo@exemplo.gal\n');
  process.exit(1);
}

/**
 * Two separate paths on purpose.
 *
 * On a terminal, readline asks and the echo is suppressed. Piped, readline
 * will answer the first question and then never settle the second, so the
 * input is read in one go and handed out line by line instead. That path
 * exists so this script can be tested without a terminal.
 */
async function reader() {
  if (!stdin.isTTY) {
    const chunks = [];
    for await (const chunk of stdin) chunks.push(chunk);
    const lines = Buffer.concat(chunks).toString().split('\n');
    return (question) => {
      stdout.write(question + '\n');
      return Promise.resolve(lines.shift() ?? '');
    };
  }

  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  const ask = (question) =>
    new Promise((resolve) => {
      let shown = false;
      // Print the prompt once, then swallow everything readline would echo.
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

const email = (process.argv[2] ?? '').trim().toLowerCase();
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

ask.close?.();

const salt = randomBytes(16).toString('hex');
const derived = await scryptAsync(password, salt, SCRYPT.keylen, SCRYPT);

console.log('\n  Engade isto a ADMIN_USERS. Se xa hai alguén, sepárao cun ";".\n');
console.log(`${email} ${salt}:${derived.toString('hex')}`);
console.log('\n  A primeira vez fai falla tamén un SESSION_SECRET (un só, para');
console.log('  todas as contas). Vale este:\n');
console.log(`${randomBytes(32).toString('base64url')}`);
console.log('\n  E GITHUB_TOKEN e GITHUB_REPO. Está todo en docs/ADMIN.md.\n');
