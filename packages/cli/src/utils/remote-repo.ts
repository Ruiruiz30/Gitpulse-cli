import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import simpleGit from 'simple-git';
import { theme } from '../ui/theme.js';

const REMOTE_URL_RE = /^(?:https?:\/\/|git@|ssh:\/\/|git:\/\/)/;

export function isRemoteUrl(input: string): boolean {
  return REMOTE_URL_RE.test(input);
}

function repoSlug(url: string): string {
  // Strip protocol, .git suffix, trailing slashes; convert non-alphanum to dashes
  const cleaned = url
    .replace(/^(?:https?:\/\/|git@|ssh:\/\/|git:\/\/)/, '')
    .replace(/\.git\/?$/, '')
    .replace(/:/g, '/')
    .replace(/\/+$/, '');
  const slug = cleaned.replace(/[^a-zA-Z0-9_.-]/g, '-').replace(/-+/g, '-');
  const hash = crypto.createHash('sha256').update(url).digest('hex').slice(0, 8);
  return `${slug}-${hash}`;
}

function getCacheDir(): string {
  return path.join(os.homedir(), '.gitpulse', 'repos');
}

export async function resolveRepoPath(input: string): Promise<{ localPath: string }> {
  if (!isRemoteUrl(input)) {
    return { localPath: input };
  }

  const slug = repoSlug(input);
  const cacheDir = getCacheDir();
  const localPath = path.join(cacheDir, slug);

  fs.mkdirSync(cacheDir, { recursive: true });

  if (fs.existsSync(path.join(localPath, '.git'))) {
    console.log(theme.dim(`Using cached clone at ${localPath}`));
    console.log(theme.dim('Fetching latest changes...'));

    try {
      const git = simpleGit(localPath);
      await git.fetch(['--all']);
      console.log(theme.success('Fetch complete.\n'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(theme.warning(`Fetch failed (using cached clone): ${msg}\n`));
    }
  } else {
    console.log(theme.dim(`Cloning ${input}...`));
    const git = simpleGit();
    await git.clone(input, localPath);
    console.log(theme.success('Clone complete.\n'));
  }

  return { localPath };
}
