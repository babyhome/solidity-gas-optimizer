import chalk from "chalk";
import { AnalysisResult, GasIssue } from "./types";


export function formatIssues(issues: GasIssue[], sourceCode: string) {
  const lines = sourceCode.split('\n');

  // Group issues by type for better organization
  const issuesByType = new Map<string, GasIssue[]>();
  issues.forEach(issue => {
    const existing = issuesByType.get(issue.type) || [];
    existing.push(issue);
    issuesByType.set(issue.type, existing);
  });

  // Display header
  console.log(chalk.bold.yellow('\n🔍 Gas Optimization Report\n'));

  // Display issues by type
  const typeInfo: Record<string, { icon: string, title: string, color: any}> = {
    'storage-read-in-loop': {
      icon: '🔄',
      title: 'Storage Reads in Loops',
      color: chalk.red
    },
    'public-vs-external': {
      icon: '🔐',
      title: 'Public vs External Functions',
      color: chalk.yellow
    },
    'state-variable-packing': {
      icon: '',
      title: 'State Variable Packing',
      color: chalk.yellowBright
    },
    'use-custom-errors': {
      icon: '',
      title: 'Use Custom Errors',
      color: chalk.yellowBright
    }
  };

  issuesByType.forEach((typeIssues, type) => {
    const info = typeInfo[type] || { icon: '📌', title: type, color: chalk.white };

    console.log(info.color.bold(`\n${info.icon} ${info.title} (${typeIssues.length} issue${typeIssues.length > 1 ? 's' : ''})`));
    console.log(chalk.gray('-'.repeat(50)));

    typeIssues.forEach((issue, index) => {
      formatSingleIssue(issue, lines, index + 1);
    });
  });

  // Display summary with visual graph
  displaySummary(issues);
}


function formatSingleIssue(issue: GasIssue, lines: string[], index: number) {
  const severityColors = {
    high: chalk.red,
    medium: chalk.yellow,
    low: chalk.blue
  };

  const severityIcons = {
    high: '🔴',
    medium: '🟡',
    low: '🔵'
  };

  const color = severityColors[issue.severity];
  const icon = severityIcons[issue.severity];

  // Issue header with number
  console.log(
    chalk.gray(`[${index}]`) + ' ' +
    icon + ' ' +
    color(`${issue.severity.toUpperCase()}`) + ' ' +
    chalk.white(`at line ${issue.line}`)
  );

  // Issue message
  console.log(`    ${chalk.white(issue.message)}`);

  // Code snippet with better formatting
  const line = lines[issue.line - 1] || '';
  const trimmedLine = line.trim();
  const lineNumber = String(issue.line).padStart(4, ' ');

  console.log(chalk.gray(`\n    ${lineNumber} │ `) + highlightCode(trimmedLine));

  // Pointer
  const pointerPadding = ' '.repeat(issue.column + 7);
  console.log(color(`    ${pointerPadding}╰── here`));

  // Suggestion with gas impact
  console.log(chalk.green(`\n    💡 Suggestion: ${issue.suggestion}`));
  if (issue.gasImpact) {
    console.log(chalk.cyan(`    ⛽ Gas Impact: ${issue.gasImpact}`));
  }

  console.log(chalk.gray('\n    ' + '─'.repeat(46) + '\n'));
}


function highlightCode(code: string): string {
  // Simple syntax highlighting
  const keywords = ['function', 'public', 'external', 'view', 'pure', 'returns', 'for', 'while', 'if', 'uint256', 'address', 'mapping', 'struct'];
  let highlighted = code;

  keywords.forEach(keyword => {
    const regex  = new RegExp(`\\b${keyword}\\b`, 'g');
    highlighted = highlighted.replace(regex, chalk.magenta(keyword));
  });

  // Highlight strings
  highlighted = highlighted.replace(/"([^"]*)"/g, chalk.green('"$1"'));
  highlighted = highlighted.replace(/'([^']*)'/g, chalk.green("'$1'"));

  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, chalk.cyan('$1'));

  return highlighted;
}



function displaySummary(issues: GasIssue[]) {
  const high  = issues.filter(i => i.severity === 'high').length;
  const medium = issues.filter(i => i.severity === 'medium').length;
  const low = issues.filter(i => i.severity === 'low').length;

  console.log(chalk.bold('\n📊 Summary Report'));
  console.log(chalk.gray('═'.repeat(50)));

  // Visual severity distribution
  console.log(chalk.white('\n  Severity Distribution:'));

  if (high > 0) {
    const highBar = '█'.repeat(Math.min(high * 2, 20));
    console.log(chalk.red(`    High    │ ${highBar} ${high}`));
  }
  
  if (medium > 0) {
    const mediumBar = '█'.repeat(Math.min(medium * 2, 20));
    console.log(chalk.yellow(`    Medium  │ ${mediumBar} ${medium}`));
  }
  
  if (low > 0) {
    const lowBar = '█'.repeat(Math.min(low * 2, 20));
    console.log(chalk.blue(`    Low     │ ${lowBar} ${low}`));
  }

  // Issue types breakdown
  const typeCount: Record<string, number> = {};
  issues.forEach(issue => {
    typeCount[issue.type] = (typeCount[issue.type] || 0) + 1;
  });

  console.log(chalk.white('\n  Issue Types:'));
  Object.entries(typeCount).forEach(([type, count]) => {
    const typeNames: Record<string, string> = {
      'storage-read-in-loop': 'Storage Reads in Loops',
      'public-vs-external': 'Public vs External',
      'state-variable-packing': 'State Variable Packing',
      'use-custom-errors': 'Use Custom Errors',
    };
    console.log(chalk.gray(`    • ${typeNames[type] || type}: ${count}`));
  });

  // Overall score
  const score = calculateOptimizationScore(issues);
  const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
  
  console.log(chalk.white('\n  Optimization Score: ') + scoreColor.bold(`${score}/100`));
  
  // Recommendations
  console.log(chalk.white('\n  Top Recommendations:'));
  if (high > 0) {
    console.log(chalk.gray('    1. Fix high severity issues first (storage reads in loops)'));
  }
  if (typeCount['public-vs-external'] > 0) {
    console.log(chalk.gray('    2. Change public functions to external where possible'));
  }

  console.log(chalk.gray('\n═'.repeat(20)));
}


function calculateOptimizationScore(issues: GasIssue[]): number {
  let score = 100;

  issues.forEach(issue => {
    if (issue.severity === 'high') score -= 10;
    else if (issue.severity === 'medium') score -= 5;
    else if (issue.severity === 'low') score -= 2;
  });

  return Math.max(0, score);
}


export function formatAnalysisResult(result: AnalysisResult, sourceCode: string) {
  if (result.issues.length === 0) {
    console.log(chalk.green.bold('\n✨ Excellent! No gas optimization issues found!'));
    console.log(chalk.gray('Your contract follows gas optimization best practices.\n'));
  } else {
    formatIssues(result.issues, sourceCode);
  }
}
