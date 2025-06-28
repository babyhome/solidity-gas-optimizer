import * as parser from '@solidity-parser/parser';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { ASTNode } from '@solidity-parser/parser/dist/src/ast-types';
import { GasAnalyzer } from './analyzer';
import { formatAnalysisResult } from './formatter';


export async function analyzeFile(filePath: string) {
  try {
    console.clear();

    console.log(chalk.bold.cyan(`
      ╔═══════════════════════════════════════════════════╗
      ║          Solidity Gas Optimization Tool           ║
      ╚═══════════════════════════════════════════════════╝
      `));
    
    // read file
    const absolutePath = path.resolve(filePath);

    // check exists file
    try {
      await fs.access(absolutePath, fs.constants.F_OK);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }

    // check .sol
    if (path.extname(absolutePath).toLocaleLowerCase() !== '.sol') {
      throw new Error(`Invalid file type: ${filePath}. Expected a .sol file.`);
    }

    const content = await fs.readFile(absolutePath, 'utf8');

    console.log(chalk.green(`✓ File read successfully`));
    console.log(chalk.gray(`  Path: ${absolutePath}`));
    console.log(chalk.gray(`  Size: ${content.length} bytes\n`));

    // show progress
    process.stdout.write(chalk.yellow('\n⏳ Parsing Solidity code...'));
    // console.log(content);

    const ast = parser.parse(content, { loc: true, range: true, tolerant: true });
    console.log(chalk.green(' Done!'));

    process.stdout.write(chalk.yellow('⏳ Analyzing for optimizations...'));

    const analyzer = new GasAnalyzer();
    const result = analyzer.analyze(ast, filePath);
    console.log(chalk.green(' Done!'));

    // Display results with enhanced formatter
    formatAnalysisResult(result, content);

  } catch (error: any) {
    console.error(chalk.red.bold('\n❌ Error:'));
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    } else if (error instanceof parser.ParserError) {
      console.error(chalk.red(`   Solidity parsing error: ${error.message}`));
    } else {
      console.error(chalk.red(`  ${error.message}`));
      throw error;
    }

    process.exit(1);
  }
}


