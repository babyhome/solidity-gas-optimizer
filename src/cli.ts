#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { version } from '../package.json';
import { analyzeFile } from "./parser";
import { ALL_RULES } from "./rules";

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

    if (options.listRules) {
      console.log(chalk.bold('\n📋 Available Rules:\n'));
      ALL_RULES.forEach(ruleClass => {
        const rule = new ruleClass({} as any);
        console.log(chalk.whiteBright.bold(`  • `) + chalk.yellow(`${rule.getName()}`));
        console.log(chalk.gray(`    ${rule.getDescription()}\n`));
      });
      return;
    }

    console.log(chalk.blue('='.repeat(50)));
    console.log(chalk.blue(`🔍 Analyzing ${filePath}...`));

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
