import { BaseRule } from "./base-rule";

export class UncheckedMathRule extends BaseRule {
  getName(): string {
    return 'unchecked-math';
  }

  getDescription(): string {
    return 'Suggests using unchecked blocks for safe math operations';
  }

  getVisitors(): Record<string, (node: any) => void> {
    return {
      'BinaryOperation': (node) => this.checkMathOperation(node)
    };
  }


  private checkMathOperation(node: any) {
    // Check for increment/decrement operations that can't overflow
    if (node.operator === '+' || node.operator === '-') {
      // Simple example: i++ in a for loop
      if (this.context.isInLoop() &&
          node.left?.type === 'Identifier' &&
          node.right?.type === 'NumberLiteral' &&
          node.right.number === '1'
      ) {
        this.context.addIssue({
          type: 'unchecked-math',
          severity: 'low',
          line: node.loc?.start.line || 0,
          column: node.loc?.start.column || 0,
          message: `Increment operation '${node.left.name}++' can use unchecked block`,
          suggestion: `Wrap in unchecked block: 'unchecked { ${node.left.name}++; }'`,
          gasImpact: '~50 gas per operation'
        });
      }
    }
  }
}

