import ora, { type Ora } from 'ora';
import { theme } from './theme.js';

export function createSpinner(text: string): Ora {
  return ora({
    text: theme.dim(text),
    color: 'cyan',
  });
}

export function phaseSpinner(phase: number, totalPhases: number, text: string): Ora {
  return createSpinner(`[Phase ${phase}/${totalPhases}] ${text}`);
}
