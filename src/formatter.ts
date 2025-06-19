import chalk from "chalk";
import { AnalysisResult, GasIssue } from "./types";


export function formatIssues(issues: GasIssue[], sourceCode: string) {

}

function displaySummary(issues: GasIssue[]) {
  const high = issues.filter(i => i.severity === 'high').length;
  const medium = issues.filter(i => i.severity === 'medium').length;
  const low = issues.filter(i => i.severity === 'low').length;

  console.log(chalk.bold('\n📊 Summary Report'));
  console.log(chalk.gray('═'.repeat(50)));

  // Visual severity distribution
  console.log(chalk.white('\n Severity Distribution:'));

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
