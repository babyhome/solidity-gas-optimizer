import { GasIssue, LoopContext, VariableInfo } from "../types";

export interface RuleContext {
  // state tracking
  stateVariables: Map<string, VariableInfo>;
  localVariables: Set<string>;
  currentFunction: string | null;
  loopStack: LoopContext[];
  internalFunctionCalls: Set<string>;
  contractName: string;

  // Helper methods
  isStorageVariable(name: string): boolean;
  isInLoop(): boolean;
  getCurrentLoop(): LoopContext | undefined;
  addIssue(issue: GasIssue): void;
}


export abstract class BaseRule {
  protected context: RuleContext;

  constructor(context: RuleContext) {
    this.context = context;
  }

  // Each rule must define which AST nodes it wants to visit
  abstract getVisitors(): Record<string, (node: any) => void>;

  // Metadata about the rule
  abstract getName(): string;
  abstract getDescription(): string;

  // Optional: Setup before analysis
  setup?(): void;

  // Optional: cleanup after analysis
  cleanup?(): void;
}


