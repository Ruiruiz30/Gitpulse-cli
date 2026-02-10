import { theme } from '../ui/theme.js';

export function handleError(error: unknown): never {
  if (error instanceof Error) {
    console.error(`\n${theme.error('Error:')} ${error.message}`);
    if (process.env.DEBUG) {
      console.error(theme.dim(error.stack ?? ''));
    }
  } else {
    console.error(`\n${theme.error('Error:')} An unexpected error occurred`);
  }
  process.exit(1);
}

export function handleReplError(error: unknown): void {
  if (error instanceof Error) {
    console.error(`\n${theme.error('Error:')} ${error.message}`);
    if (process.env.DEBUG) {
      console.error(theme.dim(error.stack ?? ''));
    }
  } else {
    console.error(`\n${theme.error('Error:')} An unexpected error occurred`);
  }
}
