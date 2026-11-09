/**
 * A very small .env reader and writer, shared by the admin scripts.
 *
 * Not a general dotenv implementation: it handles what this project's file
 * actually contains, and is strict about the rest so a malformed line is
 * reported rather than half-understood.
 */

/**
 * Reads a .env into `{ values, problems }`.
 *
 * A quoted value may span lines. An unbalanced quote is a problem, not
 * something to guess at: that is exactly the typo that produces a value
 * with the variable name inside it.
 */
export function parseEnv(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const values = {};
  const problems = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s);
    if (!match) {
      problems.push({ line: i + 1, message: 'Esta liña non ten a forma CLAVE=valor.' });
      continue;
    }

    const key = match[1];
    let rest = match[2];

    if (rest.startsWith('"') || rest.startsWith("'")) {
      const quote = rest[0];
      rest = rest.slice(1);

      // Gather lines until the closing quote.
      let value = '';
      let closed = false;
      let cursor = i;
      for (;;) {
        const end = rest.indexOf(quote);
        if (end >= 0) {
          value += rest.slice(0, end);
          const after = rest.slice(end + 1).trim();
          if (after && !after.startsWith('#')) {
            problems.push({
              line: cursor + 1,
              message: `Hai texto despois da comiña de peche de ${key}. Sobra unha comiña, ou falta unha.`,
            });
          }
          closed = true;
          break;
        }
        value += rest + '\n';
        cursor += 1;
        if (cursor >= lines.length) break;
        rest = lines[cursor];
      }

      if (!closed) {
        problems.push({ line: i + 1, message: `A comiña de ${key} non se pecha nunca.` });
      }
      values[key] = value.trim();
      i = cursor;
    } else {
      values[key] = rest.split('#')[0].trim();
    }
  }

  return { values, problems };
}

/** True when a value has to be quoted to survive a .env round trip. */
function needsQuotes(value) {
  return /[\s;#"']/.test(value);
}

/**
 * Returns the text with `key` set to `value`, replacing any existing entry
 * (however many lines it spanned) or appending it at the end.
 */
export function setEnvValue(text, key, value) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const output = [];
  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s);

    if (!match || match[1] !== key) {
      output.push(lines[i]);
      continue;
    }

    // Skip the whole old entry, including the lines a quoted value ran over.
    let rest = match[2];
    if (rest.startsWith('"') || rest.startsWith("'")) {
      const quote = rest[0];
      rest = rest.slice(1);
      while (!rest.includes(quote) && i + 1 < lines.length) {
        i += 1;
        rest = lines[i];
      }
    }

    output.push(`${key}=${needsQuotes(value) ? `"${value}"` : value}`);
    replaced = true;
  }

  if (!replaced) {
    if (output.length > 0 && output[output.length - 1].trim() !== '') output.push('');
    output.push(`${key}=${needsQuotes(value) ? `"${value}"` : value}`);
  }

  return output.join('\n');
}
