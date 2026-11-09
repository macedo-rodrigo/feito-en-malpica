import { stdin, stdout } from 'node:process';

/**
 * Asks for something secret, showing an asterisk per character.
 *
 * Reads raw keypresses rather than going through readline with its output
 * suppressed. That trick hides the typing, but it also hides whether
 * anything is being registered at all - so a password that comes out
 * shorter than it was typed looks like the tool rejecting a correct
 * password for no reason. The asterisks make the length visible.
 *
 * Falls back to reading the stream when there is no terminal, so the
 * scripts can be tested without one.
 */
/**
 * Piped input is read once and handed out a line at a time. Reading the
 * stream again for a second question would find it already at the end.
 */
let piped = null;

export async function askSecret(question) {
  if (!stdin.isTTY) {
    if (piped === null) {
      const chunks = [];
      for await (const chunk of stdin) chunks.push(chunk);
      piped = Buffer.concat(chunks).toString().split('\n');
    }
    stdout.write(question + '\n');
    return piped.shift() ?? '';
  }

  stdout.write(question);

  return new Promise((resolve) => {
    const typed = [];

    const finish = (value) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      resolve(value);
    };

    const onData = (chunk) => {
      // A paste arrives as one chunk, so walk it a character at a time.
      for (const key of chunk.toString()) {
        if (key === '\r' || key === '\n' || key === '\u0004') {
          finish(typed.join(''));
          return;
        }
        if (key === '\u0003') {
          // Ctrl+C
          stdin.setRawMode(false);
          stdout.write('\n');
          process.exit(130);
        }
        if (key === '\u007f' || key === '\b') {
          if (typed.length > 0) {
            typed.pop();
            stdout.write('\b \b');
          }
          continue;
        }
        // Ignore the remaining control characters, including arrow keys,
        // which arrive as escape sequences and would otherwise be counted.
        if (key < ' ' || key === '\u001b') continue;

        typed.push(key);
        stdout.write('*');
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}
