import { BaseRule, RuleContext } from "./base-rule";

export class PublicVsExternalRule extends BaseRule {
  getName(): string {
    return 'public-vs-external';
  }

  getDescription(): string {
    return 'Suggest changing public functions to external when not called internally';
  }

  getVisitors(): Record<string, (node: any) => void> {
    return {
      'FunctionDefinition': (node) => this.checkFunctionVisibility(node)
    };
  }


  private checkFunctionVisibility(node: any) {
    // Skip if not public
    if (!node.visibility || node.visibility !== 'public') {
      return;
    }

    // Skip special functions
    if (node.isConstructor || node.isFallback || node.isReceiveEther) {
      return;
    }

    // Skip if called internally
    if (this.context.internalFunctionCalls.has(node.name)) {
      return;
    }

    // Determine severity
    const isViewOrPure = node.stateMutability === 'view' || node.stateMutability === 'pure';
    let severity: 'high' | 'medium' | 'low' = 'medium';
    let gasImpact = '~2100 gas per external call';

    if (isViewOrPure) {
      severity = 'low';
      gasImpact = 'Minimal gas savings, but better practice';
    } else if (node.body?.statements?.length > 10) {
      severity = 'high';
      gasImpact = 'Significant savings for complex functions';
    }

    this.context.addIssue({
      type: 'public-vs-external',
      severity: severity,
      line: node.loc?.start.line || 0,
      column: node.loc?.start.column || 0,
      message: `Function '${node.name}' is declared as 'public' but never called internally`,
      suggestion: `Change visibility from 'public' to 'external' to save gas on function calls`,
      gasImpact: gasImpact
    });
  }
}


