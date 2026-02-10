import { loadConfig, HomeManager } from '@gitpulse/core';
import { theme } from '../ui/theme.js';
import { runSetupWizard } from '../wizard/setup.js';
import { handleError } from '../utils/error-handler.js';

export interface ConfigOptions {
  init?: boolean;
  show?: boolean;
  set?: string;
}

export async function configCommandInner(options: ConfigOptions, setValue?: string): Promise<void> {
  if (options.init) {
    // Initialize ~/.gitpulse/ home directory
    const home = new HomeManager();
    const result = home.initialize();

    if (result.created) {
      console.log(theme.success(`Created ${result.homePath}/`));
    } else {
      console.log(theme.dim(`Home directory already exists: ${result.homePath}/`));
    }

    if (result.copiedRubrics.length > 0) {
      console.log(theme.success(`Copied rubrics: ${result.copiedRubrics.join(', ')}`));
    }
    if (result.skippedRubrics.length > 0) {
      console.log(theme.dim(`Skipped existing rubrics: ${result.skippedRubrics.join(', ')}`));
    }

    // Run project-level setup wizard
    await runSetupWizard(process.cwd());
    return;
  }

  if (options.show || (!options.set && !options.init)) {
    const config = await loadConfig(process.cwd());
    console.log(theme.heading('\nCurrent Configuration:\n'));
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (options.set && setValue) {
    console.log(theme.dim(`Setting ${options.set} = ${setValue}`));
    console.log(theme.warning('Direct config setting via CLI not yet implemented. Edit .gitpulse.yml directly.'));
  }
}

export async function configCommand(options: ConfigOptions, setValue?: string): Promise<void> {
  try {
    await configCommandInner(options, setValue);
  } catch (error) {
    handleError(error);
  }
}
