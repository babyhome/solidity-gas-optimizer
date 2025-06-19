import { Command } from "commander";
import chalk from "chalk";
import { version } from '../package.json';
import { analyzeFile } from "./parser";

const program = new Command();

program
  .name("gas-opt")
  .description('CLI tool for detecting gas optimization opportunities in Solidity code')
  .version(version);

program
  .command('analyze <file>')
  .description('Analyze a Solidity file for optimization opportunities')
  .option('-r, --rules <rules>', 'Comma-separated list of rules to run', 'all')
  .option('-l, --list-rules', 'List all available rules')
  .action(async (filePath: string, options: any) => {
    console.log('filePath: ', filePath);
    console.log('options:', options);

    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.blue(`🔍 Analyzing ${filePath}...`));
    console.log('')

    try {
      await analyzeFile(filePath);
    } catch (error: any) {
      console.error(chalk.red('❌ Error:', error?.message));
      process.exit(1);
    }
  });

program.parse();

// show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
