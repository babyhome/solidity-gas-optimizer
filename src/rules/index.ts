import { BaseRule, RuleContext } from "./base-rule";
import { StorageReadInLoopRule } from "./storage-read-in-loops";

export const ALL_RULES = [
  StorageReadInLoopRule
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

