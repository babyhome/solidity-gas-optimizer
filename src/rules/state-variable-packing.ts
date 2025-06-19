import { BaseRule, RuleContext } from "./base-rule";
import { VariableInfo } from "../types";

interface StateVariable {
  name: string;
  typeName: string;
  size: number;
  line: number;
  column: number;
}

interface StorageSlot {
  variables: StateVariable[];
  usedBytes: number;
}


export class StateVariablePackingRule extends BaseRule {
  private stateVariables: StateVariable[] = [];
  private currentContract: string = '';


  getName(): string {
    return 'state-variable-packing';
  }


  getDescription(): string {
    return 'Detects inefficient state variable ordering that tastes storage slots';
  }


  setup(): void {
    this.stateVariables = [];
    this.currentContract = '';
  }


  getVisitors(): Record<string, (node: any) => void> {
    return {
      'ContractDefinition': (node) => this.enterContract(node),
      'ContractDefinition:exit': () => this.analyzeStorageLayout(),
      'StateVariableDeclaration': (node) => this.collectStateVariable(node)
    };
  }


  private enterContract(node: any) {
    this.currentContract = node.name;
    this.stateVariables = [];
  }


  private collectStateVariable(node: any) {
    node.variables.forEach((variable: any) => {
      // Skip constant and immutable variables (they don't use storage)
      if (variable.isDeclaredConst || variable.isImmutable) {
        return;
      }

      const size = this.getTypeSize(variable.typeName);

      this.stateVariables.push({
        name: variable.name,
        typeName: variable.typeName,
        size: size,
        line: variable.loc?.start.line || 0,
        column: variable.loc?.start.column || 0
      });
    });
  }


  private analyzeStorageLayout() {
    if (this.stateVariables.length < 2) return;

    // Calculate current layout
    const currentSlots = this.calculateStorageSlots(this.stateVariables);

    // Calculate optimal layout (sort by size descending, pack small types)
    const optimizedVars = this.optimizeVariableOrder([...this.stateVariables]);
    const optimalSlots = this.calculateStorageSlots(optimizedVars);

    // If we can save slots, report issues
    if (currentSlots.length > optimalSlots.length) {
      this.reportPackingIssues(currentSlots, optimalSlots);
    }
  }


  private calculateStorageSlots(variables: StateVariable[]): StorageSlot[] {
    const slots: StorageSlot[] = [];
    let currentSlot: StorageSlot = { variables: [], usedBytes: 0 };

    for (const variable of variables) {
      // If variable doesn't fit in current slot, start new slot
      if (currentSlot.usedBytes + variable.size > 32) {
        if (currentSlot.variables.length > 0) {
          slots.push(currentSlot);
        }
        currentSlot = { variables: [], usedBytes: 0 };
      }

      currentSlot.variables.push(variable);
      currentSlot.usedBytes += variable.size;
    }

    if (currentSlot.variables.length > 0) {
      slots.push(currentSlot);
    }

    return slots;
  }


  private optimizeVariableOrder(variables: StateVariable[]): StateVariable[] {
    // Separate by size categories
    const size32: StateVariable[] = [];
    const sizeLarge: StateVariable[] = [];    // > 16 bytes but < 32
    const sizeMedium: StateVariable[] = [];   // 9-16 bytes
    const sizeSmall: StateVariable[] = [];    // <= 8 bytes

    variables.forEach(v => {
      if (v.size === 32) size32.push(v);
      else if (v.size > 16) sizeLarge.push(v);
      else if (v.size > 8) sizeMedium.push(v);
      else sizeSmall.push(v);
    });

    // Order: 32-byte types first, then pack smaller types efficiently
    return [
      ...size32,
      ...sizeLarge,
      ...sizeMedium,
      ...sizeSmall
    ];
  }


  private reportPackingIssues(currentSlots: StorageSlot[], optimalSlots: StorageSlot[]) {
    const wastedSlots = currentSlots.length - optimalSlots.length;
    const gasWasted = wastedSlots * 20000; // 20k gas per slot

    // Find variables that could be packed better
    const inefficientVars = this.findInefficientVariables(currentSlots);

    inefficientVars.forEach(variable => {
      this.context.addIssue({
        type: 'state-variable-packing',
        severity: wastedSlots > 2 ? 'high' : 'medium',
        line: variable.line,
        column: variable.column,
        message: `State variable '${variable.name}' (${variable.size} bytes) is not efficiently packed`,
        suggestion: this.generatePackingSuggestion(currentSlots, optimalSlots),
        gasImpact: `Can save ${wastedSlots} storage slot${wastedSlots > 1 ? 's' : ''} (~${gasWasted} gas on deployment)`
      });
    });
  }


  private findInefficientVariables(slots: StorageSlot[]): StateVariable[] {
    const inefficient: StateVariable[] = [];

    slots.forEach(slot => {
      // If slot has wasted space and contains small variables
      if (slot.usedBytes < 32 && slot.variables.some(v => v.size < 32)) {
        // Mark small variables that cause inefficiency
        slot.variables
          .filter(v => v.size < 32)
          .forEach(v => inefficient.push(v));
      }
    });

    return inefficient;
  }


  private generatePackingSuggestion(current: StorageSlot[], optimal: StorageSlot[]): string {
    const suggestions: string[] = [];

    // Group by size for suggestion
    const sizeGroups = new Map<number, string[]>();
    current.forEach(slot => {
      slot.variables.forEach(v => {
        const group = sizeGroups.get(v.size) || [];
        group.push(v.name);
        sizeGroups.set(v.size, group);
      });
    });

    suggestions.push('Reorder state variable to pack them efficiently:');
    suggestions.push('1. Group 32-byte variables together (uint256, bytes32, etc.)');
    suggestions.push('2. Pack smaller variables together:');

    if (sizeGroups.has(1)) {
      suggestions.push(`   - bool/uint8/bytes1: ${sizeGroups.get(1)!.join(', ')}`);
    }
    if (sizeGroups.has(16)) {
      suggestions.push(`   - uint128/bytes16: ${sizeGroups.get(16)!.join(', ')}`);
    }
    if (sizeGroups.has(20)) {
      suggestions.push(`   - address: ${sizeGroups.get(20)!.join(', ')}`);
    }

    return suggestions.join('\n');
  }


  private getTypeSize(typeName: any): number {
    if (!typeName) return 32;

    const typeSizes: Record<string, number> = {
      // Boolean
      'bool': 1,

      // Integers
      'uint8': 1, 'int8': 1,
      'uint16': 2, 'int16': 2,
      'uint24': 3, 'int24': 3,
      'uint32': 4, 'int32': 4,
      'uint40': 5, 'int40': 5,
      'uint48': 6, 'int48': 6,
      'uint56': 7, 'int56': 7,
      'uint64': 8, 'int64': 8,
      'uint72': 9, 'int72': 9,
      'uint80': 10, 'int80': 10,
      'uint88': 11, 'int88': 11,
      'uint96': 12, 'int96': 12,
      'uint104': 13, 'int104': 13,
      'uint112': 14, 'int112': 14,
      'uint120': 15, 'int120': 15,
      'uint128': 16, 'int128': 16,
      'uint136': 17, 'int136': 17,
      'uint144': 18, 'int144': 18,
      'uint152': 19, 'int152': 19,
      'uint160': 20, 'int160': 20,
      'uint168': 21, 'int168': 21,
      'uint176': 22, 'int176': 22,
      'uint184': 23, 'int184': 23,
      'uint192': 24, 'int192': 24,
      'uint200': 25, 'int200': 25,
      'uint208': 26, 'int208': 26,
      'uint216': 27, 'int216': 27,
      'uint224': 28, 'int224': 28,
      'uint232': 29, 'int232': 29,
      'uint240': 30, 'int240': 30,
      'uint248': 31, 'int248': 31,
      'uint256': 32, 'int256': 32,
      'uint': 32, 'int': 32, // Default sizes
      
      // Address
      'address': 20,
      'address payable': 20,
      
      // Fixed bytes
      'bytes1': 1, 'bytes2': 2, 'bytes3': 3, 'bytes4': 4,
      'bytes5': 5, 'bytes6': 6, 'bytes7': 7, 'bytes8': 8,
      'bytes9': 9, 'bytes10': 10, 'bytes11': 11, 'bytes12': 12,
      'bytes13': 13, 'bytes14': 14, 'bytes15': 15, 'bytes16': 16,
      'bytes17': 17, 'bytes18': 18, 'bytes19': 19, 'bytes20': 20,
      'bytes21': 21, 'bytes22': 22, 'bytes23': 23, 'bytes24': 24,
      'bytes25': 25, 'bytes26': 26, 'bytes27': 27, 'bytes28': 28,
      'bytes29': 29, 'bytes30': 30, 'bytes31': 31, 'bytes32': 32
    };

    if (typeName.type === 'ElementaryTypeName') {
      return typeSizes[typeName.name] || 32;
    }

    // Arrays, mappings, structs, etc. use full slot
    return 32;
  }

}

