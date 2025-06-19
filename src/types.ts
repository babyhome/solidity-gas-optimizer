export interface GasIssue {
  type: 'storage-read-in-loop' | 'public-vs-external' | 'array-length-caching' | 'struct-caching' | 'mapping-read-in-loop' | 'unchecked-math' | 'state-variable-packing' | 'use-custom-errors' | 'other';
  severity: 'high' | 'medium' | 'low';
  line: number;
  column: number;
  message: string;
  suggestion: string;
  gasImpact?: string;     // Optional: estimated gas impact
  pattern?: string;   // Optional: pattern name
}

export interface AnalysisResult {
  file: string;
  issues: GasIssue[];
  summary?: {
    totalIssues: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    estimatedGasSaving?: number;
  }
}

export interface OptimizationRule {
  name: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  gasImpact: string;
  detect: (node: any, context: any) => boolean;
}


export interface VariableInfo {
  name: string;
  type: string;
  isArray: boolean;
  isMapping: boolean;
  visibility: string;
}

export interface LoopContext {
  type: string;
  depth: number;
  node: any;
  storageReadsInCondition: Set<string>;
  storageReadsInBody: Set<string>;
}

