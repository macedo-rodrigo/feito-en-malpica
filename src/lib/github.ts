/**
 * Writes content back to the repository.
 *
 * Uses the Git Data API rather than the simpler Contents API because an
 * artisan is a Markdown file plus several photographs, and those belong in
 * one commit. The Contents API would make one commit per file, leaving a
 * history where half-saved states exist and are deployable.
 *
 * The token lives in an environment variable on the server and never
 * reaches the browser.
 */

const API = 'https://api.github.com';

export interface GitHubConfig {
  /** owner/name */
  repo: string;
  branch: string;
  token: string;
}

export interface FileWrite {
  path: string;
  /** Text content, or binary as a Buffer. */
  content: string | Buffer;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

export function readGitHubConfig(env: Record<string, string | undefined>): GitHubConfig | null {
  const repo = env.GITHUB_REPO?.trim();
  const token = env.GITHUB_TOKEN?.trim();
  if (!repo || !token || !repo.includes('/')) return null;
  return { repo, token, branch: env.GITHUB_BRANCH?.trim() || 'main' };
}

async function call<T>(
  config: GitHubConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${config.token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      'user-agent': 'feito-en-malpica-admin',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new GitHubError(
      `GitHub respondeu ${response.status} en ${path}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/**
 * Commits a set of files, and optionally deletes others, in a single commit.
 *
 * Returns the new commit SHA. Deleting is how an artisan's old photograph
 * gets removed when a new one replaces it under a different name.
 */
export async function commitFiles(
  config: GitHubConfig,
  {
    message,
    files,
    deletions = [],
  }: { message: string; files: FileWrite[]; deletions?: string[] },
): Promise<string> {
  if (files.length === 0 && deletions.length === 0) {
    throw new GitHubError('Nada que gardar.');
  }

  const { repo, branch } = config;

  // Where the branch is now.
  const ref = await call<{ object: { sha: string } }>(
    config,
    `/repos/${repo}/git/refs/heads/${branch}`,
  );
  const parent = ref.object.sha;

  const parentCommit = await call<{ tree: { sha: string } }>(
    config,
    `/repos/${repo}/git/commits/${parent}`,
  );

  // Upload each file as a blob. Binary goes as base64; text as-is, so the
  // history stays readable in a diff.
  const blobs = await Promise.all(
    files.map(async (file) => {
      const binary = Buffer.isBuffer(file.content);
      const blob = await call<{ sha: string }>(config, `/repos/${repo}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: binary ? (file.content as Buffer).toString('base64') : file.content,
          encoding: binary ? 'base64' : 'utf-8',
        }),
      });
      return { path: file.path, sha: blob.sha };
    }),
  );

  const tree = await call<{ sha: string }>(config, `/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parentCommit.tree.sha,
      tree: [
        ...blobs.map(({ path, sha }) => ({
          path,
          mode: '100644',
          type: 'blob',
          sha,
        })),
        // A null sha removes the path from the tree.
        ...deletions.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })),
      ],
    }),
  });

  const commit = await call<{ sha: string }>(config, `/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }),
  });

  await call(config, `/repos/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  });

  return commit.sha;
}

/** Lists the files directly inside a folder. Empty if the folder is absent. */
export async function listFolder(config: GitHubConfig, path: string): Promise<string[]> {
  try {
    const entries = await call<{ name: string; type: string }[]>(
      config,
      `/repos/${config.repo}/contents/${path}?ref=${config.branch}`,
    );
    return entries.filter((entry) => entry.type === 'file').map((entry) => entry.name);
  } catch (error) {
    if (error instanceof GitHubError && error.status === 404) return [];
    throw error;
  }
}

/** Checks the token works and can write, before the editor relies on it. */
export async function checkAccess(config: GitHubConfig): Promise<{ ok: boolean; detail: string }> {
  try {
    const repo = await call<{ permissions?: { push?: boolean }; default_branch: string }>(
      config,
      `/repos/${config.repo}`,
    );
    if (repo.permissions && repo.permissions.push === false) {
      return { ok: false, detail: 'O token non ten permiso de escritura no repositorio.' };
    }
    return { ok: true, detail: `Acceso correcto a ${config.repo}.` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : String(error) };
  }
}
