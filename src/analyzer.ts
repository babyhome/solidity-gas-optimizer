import * as parser from '@solidity-parser/parser'
import { GasIssue, AnalysisResult, VariableInfo, LoopContext } from './types';
import { BaseRule } from './rules';
import { ASTNode, BaseASTNode, ContractDefinition, FunctionCall, FunctionDefinition, MemberAccess, StateVariableDeclaration, StateVariableDeclarationVariable, TypeName, VariableDeclaration } from '@solidity-parser/parser/dist/src/ast-types';
import { createRules } from './rules';
import { RuleContext } from './rules/base-rule';


interface LoopStatement extends BaseASTNode {
  name: string;
}


export class GasAnalyzer {
  private issues: GasIssue[] = [];
  private currentFile: string = '';
  private rules: BaseRule[] = [];

  // context shared between rules
  private context: RuleContext;


  constructor() {
    // Initialize context
    this.context = {
      stateVariables: new Map(),
      localVariables: new Set(),
      currentFunction: null,
      loopStack: [],
      internalFunctionCalls: new Set(),
      contractName: '',

      // Helper methods
      isStorageVariable: (name: string) => this.isStorageVariable(name),
      isInLoop: () => this.isInLoop(),
      getCurrentLoop: () => this.getCurrentLoop(),
      addIssue: (issue: GasIssue) => this.addIssue(issue)
    };

    // create rule instances
    this.rules = createRules(this.context);
  }


  analyze(ast: any, filePath: string): AnalysisResult {
    this.currentFile  = filePath;
    this.issues       = [];
    this.resetContext();

    // setup rules
    this.rules.forEach(rule => rule.setup?.());

    // First pass: collect all state variables
    this.collectContractInfo(ast);
    this.collectStateVariables(ast);
    this.collectInternalFunctionCalls(ast);

    // Second pass: build combined visitors from all rules
    const visitors = this.buildCombinedVisitors();

    // Add built-in visitors for context menagement
    visitors['FunctionDefinition'] = this.wrapVisitor(visitors['FunctionDefinition'], (node) => this.enterFunction(node));
    visitors['FunctionDefinition:exit'] = this.wrapVisitor(visitors['FunctionDefinition:exit'], () => this.exitFunction());
    visitors['VariableDeclaration'] = this.wrapVisitor(visitors['VariableDeclaration'], (node) => this.trackLocalVariable(node));

    // Second pass: analyze for gas issues
    parser.visit(ast, visitors);

    // clearnup rules
    this.rules.forEach(rule => rule.cleanup?.());

    return {
      file: this.currentFile,
      issues: this.issues,
      summary: this.generateSummary()
    };
  }


  private resetContext() {
    this.context.stateVariables.clear();
    this.context.localVariables.clear();
    this.context.currentFunction = null;
    this.context.loopStack = [];
    this.context.internalFunctionCalls.clear();
    this.context.contractName = '';
  }


  private buildCombinedVisitors(): Record<string, (node: any) => void> {
    const combinedVisitors: Record<string, Array<(node: any) => void>> = {};

    // Collect visitors from all rules
    this.rules.forEach(rule => {
      const visitors = rule.getVisitors();
      Object.entries(visitors).forEach(([nodeType, visitor]) => {
        if (!combinedVisitors[nodeType]) {
          combinedVisitors[nodeType] = [];
        }
        combinedVisitors[nodeType].push(visitor);
      });
    });

    // create combined visitor functions
    const finalVisitors: Record<string, (node: any) => void> = {};
    Object.entries(combinedVisitors).forEach(([nodeType, visitors]) => {
      finalVisitors[nodeType] = (node: any) => {
        visitors.forEach(visitor => visitor(node));
      };
    });

    return finalVisitors;
  }


  private wrapVisitor(existing: ((node: any) => void) | undefined, additional: (node: any) => void): (node: any) => void {
    if (existing) {
      return (node: any) => {
        additional(node);
        existing(node);
      };
    }

    return additional;
  }


  private collectContractInfo(ast: any) {
    parser.visit(ast, {
      'ContractDefinition': (node: ContractDefinition) => {
        if (node.kind === 'contract') {
          this.context.contractName = node.name;
        }
      }
    });
  }


  private collectStateVariables(ast: any) {
    parser.visit(ast, {
      'StateVariableDeclaration': (node: StateVariableDeclaration) => {
        node.variables.forEach((variable: StateVariableDeclarationVariable) => {
          if (variable.name) {
            this.context.stateVariables.set(variable.name, {
              name: variable.name,
              type: this.extractType(variable?.typeName),
              isArray: this.isArrayType(variable?.typeName),
              isMapping: this.isMappingType(variable?.typeName),
              visibility: variable.visibility || 'internal'
            });
          }
        });
      }
    });
  }


  private collectInternalFunctionCalls(ast: any) {
    parser.visit(ast, {
      'FunctionCall': (node: FunctionCall) => {
        if (node.expression?.type === 'Identifier') {
          this.context.internalFunctionCalls.add(node.expression.name);
        } else if (node.expression?.type === 'MemberAccess' &&
                    node.expression?.expression?.type === 'Identifier' &&
                    node.expression?.expression?.name === 'this'
        ) {
          this.context.internalFunctionCalls.add(node.expression.memberName);
        }
      }
    });
  }


  private enterFunction(node: FunctionDefinition) {
    this.context.currentFunction = node.name;
    this.context.localVariables.clear();

    // Track function parameters as local variables
    if (node.parameters) {
      node.parameters?.forEach((param: any) => {
        if (param.name) {
          this.context.localVariables.add(param.name);
        }
      });
    }
  }

  
  private exitFunction() {
    this.context.currentFunction = null;
    this.context.localVariables.clear();
  }


  private analyzeLoopCondition(condition: any, context: LoopContext) {
    // Find storage reads specifically in the loop condition
    parser.visit(condition, {
      'Identifier': (node: any) => {
        if (this.isStorageVariable(node.name)) {
          context.storageReadsInCondition.add(node.name);
        }
      },
      'MemberAccess': (node: MemberAccess) => {
        if (node.memberName === 'length' &&
            node.expression?.type === 'Identifier' &&
            this.isStorageVariable(node.expression.name)
        ) {
          context.storageReadsInCondition.add(`${node.expression.name}.length`);
        }
      }
    });
  }


  private trackLocalVariable(node: VariableDeclaration) {
    if (node.name && this.context.currentFunction) {
      this.context.localVariables.add(node.name);
    }
  }


  private isStorageVariable(name: string): boolean {
    return this.context.stateVariables.has(name) && !this.context.localVariables.has(name);
  }


  private isInLoop(): boolean {
    return this.context.loopStack.length > 0;
  }


  private getCurrentLoop(): LoopContext | undefined {
    return this.context.loopStack[this.context.loopStack.length - 1];
  }


  private extractType(typeName: TypeName | null | undefined): string {
    if (!typeName) return 'unknown';
    if (typeName.type === 'ElementaryTypeName') return typeName.name;
    if (typeName.type === 'UserDefinedTypeName') return typeName.namePath;
    if (typeName.type === 'ArrayTypeName') return `${this.extractType(typeName.baseTypeName)}[]`;
    if (typeName.type === 'Mapping') return 'mapping';
    return 'complex';
  }


  private isArrayType(typeName: TypeName | null | undefined): boolean {
    return typeName?.type === 'ArrayTypeName';
  }


  private isMappingType(typeName: TypeName | null | undefined): boolean {
    return typeName?.type === 'Mapping';
  }


  private addIssue(issue: GasIssue) {
    // Avoid duplicate issue for the same line
    const isDuplicate = this.issues.some(
      existing =>
        existing.line === issue.line && existing.column === issue.column && existing.type === issue.type
    );

    if (!isDuplicate) {
      this.issues.push(issue);
    }
  }


  private generateSummary() {
    const summary = {
      totalIssues: this.issues.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      estimatedGasSavings: 0
    };

    this.issues.forEach(issue => {
      // Count type type
      summary.byType[issue.type] = (summary.byType[issue.type] || 0) + 1;
      // Count by severyti
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;

      // Estimate gas savings
      if (issue.type === 'storage-read-in-loop') {
        summary.estimatedGasSavings += issue.severity === 'high' ? 2100 : 800;
      } else {
        summary.estimatedGasSavings += 100;
      }
    });

    return summary;
  }
  
}



