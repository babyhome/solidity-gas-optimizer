import { BaseRule } from './base-rule';

interface ErrorPattern {
  message: string;
  line: number;
  column: number;
  condition?: any;
}

export class UseCustomErrorsRule extends BaseRule {
  private errorPatterns: Map<string, ErrorPattern[]> = new Map();
  private declaredErrors: Set<string> = new Set();
  
  getName(): string {
    return 'use-custom-errors';
  }
  
  getDescription(): string {
    return 'Suggests using custom errors instead of string revert messages';
  }
  
  setup(): void {
    this.errorPatterns.clear();
    this.declaredErrors.clear();
  }
  
  getVisitors(): Record<string, (node: any) => void> {
    return {
      'FunctionCall': (node) => this.checkRevertPattern(node),
      'CustomErrorDefinition': (node) => this.collectCustomError(node),
      'ContractDefinition:exit': () => this.suggestCommonErrors()
    };
  }
  
  private collectCustomError(node: any) {
    if (node.name) {
      this.declaredErrors.add(node.name);
    }
  }
  
  private checkRevertPattern(node: any) {
    // Check for require(condition, "message")
    if (this.isRequireWithString(node)) {
      this.handleRequireStatement(node);
    }
    
    // Check for revert("message")
    else if (this.isRevertWithString(node)) {
      this.handleRevertStatement(node);
    }
  }
  
  private isRequireWithString(node: any): boolean {
    return node.expression?.type === 'Identifier' && 
            node.expression.name === 'require' &&
            node.arguments?.length >= 2 &&
            node.arguments[1].type === 'StringLiteral';
  }
  
  private isRevertWithString(node: any): boolean {
    return node.expression?.type === 'Identifier' && 
           node.expression.name === 'revert' &&
           node.arguments?.length >= 1 &&
           node.arguments[0].type === 'StringLiteral';
  }
  
  private handleRequireStatement(node: any) {
    const condition = node.arguments[0];
    const errorMessage = node.arguments[1].value;
    
    this.addErrorPattern(errorMessage, node, condition);
    this.reportStringError(node, errorMessage, 'require');
  }
  
  private handleRevertStatement(node: any) {
    const errorMessage = node.arguments[0].value;
    
    this.addErrorPattern(errorMessage, node);
    this.reportStringError(node, errorMessage, 'revert');
  }
  
  private addErrorPattern(message: string, node: any, condition?: any) {
    const patterns = this.errorPatterns.get(message) || [];
    patterns.push({
      message,
      line: node.loc?.start.line || 0,
      column: node.loc?.start.column || 0,
      condition
    });
    this.errorPatterns.set(message, patterns);
  }
  
  private reportStringError(node: any, errorMessage: string, type: 'require' | 'revert') {
    const customErrorName = this.generateErrorName(errorMessage);
    const errorParams = this.suggestErrorParameters(errorMessage);
    
    // Calculate gas savings
    const stringLength = errorMessage.length;
    const gasWasted = 200 + (stringLength * 50); // Base cost + per-character cost
    
    this.context.addIssue({
      type: 'use-custom-errors',
      severity: stringLength > 32 ? 'high' : 'medium',
      line: node.loc?.start.line || 0,
      column: node.loc?.start.column || 0,
      message: `String revert message "${this.truncateMessage(errorMessage)}" consumes unnecessary gas`,
      suggestion: this.generateSuggestion(customErrorName, errorParams, type, node),
      gasImpact: `~${gasWasted} gas per revert (${stringLength} character string)`
    });
  }
  
  private generateErrorName(message: string): string {
    // Common patterns to error names
    const patterns: Record<string, string> = {
      'insufficient balance': 'InsufficientBalance',
      'insufficient funds': 'InsufficientFunds',
      'not authorized': 'Unauthorized',
      'not owner': 'NotOwner',
      'only owner': 'OnlyOwner',
      'invalid address': 'InvalidAddress',
      'zero address': 'ZeroAddress',
      'invalid amount': 'InvalidAmount',
      'amount too large': 'AmountTooLarge',
      'amount too small': 'AmountTooSmall',
      'already initialized': 'AlreadyInitialized',
      'not initialized': 'NotInitialized',
      'paused': 'ContractPaused',
      'not paused': 'NotPaused',
      'deadline expired': 'DeadlineExpired',
      'invalid signature': 'InvalidSignature',
      'array length mismatch': 'ArrayLengthMismatch'
    };
    
    const lowerMessage = message.toLowerCase();
    
    // Check common patterns
    for (const [pattern, errorName] of Object.entries(patterns)) {
      if (lowerMessage.includes(pattern)) {
        return errorName;
      }
    }
    
    // Generate from message
    return message
      .split(/[\s_-]+/)
      .filter(word => word.length > 0)
      .map((word, index) => {
        // First word can be lowercase if it's a common prefix
        if (index === 0 && ['is', 'has', 'not', 'only'].includes(word.toLowerCase())) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }
  
  private suggestErrorParameters(message: string): string[] {
    const params: string[] = [];
    
    // Detect common parameter patterns
    if (message.includes('balance') || message.includes('amount')) {
      params.push('uint256 required', 'uint256 available');
    } else if (message.includes('address')) {
      params.push('address account');
    } else if (message.includes('deadline') || message.includes('expired')) {
      params.push('uint256 deadline', 'uint256 timestamp');
    } else if (message.includes('length')) {
      params.push('uint256 expected', 'uint256 actual');
    }
    
    return params;
  }
  
  private generateSuggestion(errorName: string, params: string[], type: string, node: any): string {
    const suggestions: string[] = [];
    
    // Step 1: Define error
    if (params.length > 0) {
      suggestions.push(`1. Define custom error at contract level:`);
      suggestions.push(`   error ${errorName}(${params.join(', ')});`);
    } else {
      suggestions.push(`1. Define custom error at contract level:`);
      suggestions.push(`   error ${errorName}();`);
    }
    
    // Step 2: Replace usage
    suggestions.push(`\n2. Replace ${type} statement:`);
    
    if (type === 'require' && node.arguments?.[0]) {
      const condition = this.reconstructCondition(node.arguments[0]);
      if (params.length > 0) {
        suggestions.push(`   if (!(${condition})) revert ${errorName}(${this.suggestParameterValues(params)});`);
      } else {
        suggestions.push(`   if (!(${condition})) revert ${errorName}();`);
      }
    } else {
      if (params.length > 0) {
        suggestions.push(`   revert ${errorName}(${this.suggestParameterValues(params)});`);
      } else {
        suggestions.push(`   revert ${errorName}();`);
      }
    }
    
    return suggestions.join('\n');
  }
  
  private reconstructCondition(conditionNode: any): string {
    // Simple reconstruction - in real implementation would be more complex
    if (conditionNode.type === 'BinaryOperation') {
      return `${conditionNode.left.name || 'condition'} ${conditionNode.operator} ${conditionNode.right.name || conditionNode.right.number || 'value'}`;
    }
    return 'condition';
  }
  
  private suggestParameterValues(params: string[]): string {
    return params.map(p => {
      if (p.includes('required')) return 'requiredAmount';
      if (p.includes('available')) return 'availableAmount';
      if (p.includes('account')) return 'msg.sender';
      if (p.includes('deadline')) return 'deadline';
      if (p.includes('timestamp')) return 'block.timestamp';
      if (p.includes('expected')) return 'expectedLength';
      if (p.includes('actual')) return 'actualLength';
      return 'value';
    }).join(', ');
  }
  
  private truncateMessage(message: string): string {
    return message.length > 50 ? message.substring(0, 50) + '...' : message;
  }
  
  private suggestCommonErrors() {
    // If we found multiple uses of same error message, suggest defining it once
    this.errorPatterns.forEach((patterns, message) => {
      if (patterns.length > 2) {
        const errorName = this.generateErrorName(message);
        
        this.context.addIssue({
          type: 'use-custom-errors',
          severity: 'high',
          line: patterns[0].line,
          column: patterns[0].column,
          message: `String error "${this.truncateMessage(message)}" is used ${patterns.length} times`,
          suggestion: `Define once as custom error: error ${errorName}(); to save ${patterns.length * 2000} gas`,
          gasImpact: `~${patterns.length * 2000} gas total savings`
        });
      }
    });
  }
}