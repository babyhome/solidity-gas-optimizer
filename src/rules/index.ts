import { BaseRule, RuleContext } from "./base-rule";
import { PublicVsExternalRule } from "./public-vs-external";
import { StateVariablePackingRule } from "./state-variable-packing";
import { StorageReadInLoopRule } from "./storage-read-in-loops";
import { UseCustomErrorsRule } from "./use-custom-errors";

export const ALL_RULES = [
  StorageReadInLoopRule,
  PublicVsExternalRule,
  StateVariablePackingRule,
  UseCustomErrorsRule
  // ... add new rules
];


// Export individual rules for direct import if needed
export { BaseRule } from './base-rule';

// Helper function to create rule instances
export function createRules(context: RuleContext): BaseRule[] {
  return ALL_RULES.map(RuleClass => new RuleClass(context));
}

// Helper to get rule by name
export function getRuleByName(name: string): typeof BaseRule | undefined {
  return ALL_RULES.find(RuleClass => {
    const tempInstance = new (RuleClass as any)({} as any);
    return tempInstance.getName() === name;
  });
}

