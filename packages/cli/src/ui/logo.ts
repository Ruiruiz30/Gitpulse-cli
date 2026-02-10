import chalk from 'chalk';

const LOGO = `
   _____ _ _   _____       _
  / ____(_) | |  __ \\     | |
 | |  __ _| |_| |__) |   _| |___  ___
 | | |_ | | __|  ___/ | | | / __|/ _ \\
 | |__| | | |_| |   | |_| | \\__ \\  __/
  \\_____|_|\\__|_|    \\__,_|_|___/\\___|
`;

export function printLogo(): void {
  console.log(chalk.hex('#6366f1')(LOGO));
  console.log(chalk.dim('  AI-Powered Git Contribution Analyzer\n'));
}
