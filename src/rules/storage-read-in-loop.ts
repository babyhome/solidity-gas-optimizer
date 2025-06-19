import { BaseRule, RuleContext } from "./base-rule";
import { LoopContext } from "../types";
import * as parser from '@solidity-parser/parser';


export class StorageReadInLoopRule extends BaseRule {
  private cachedVariables: Set<string> = new Set();

  getName(): string {
    return 'storage-read-in-loop';
  }

  getDescription(): string {
    return 'Detects storage variable reads inside loops';
  }

  setup(): void {
    this.cachedVariables.clear();
  }


  getVisitors(): Record<string, (node: any) => void> {
    return {
      // Track loops
      'ForStatement': (node) => this.enterLoop(node, 'for'),
      'ForStatement:exit': () => this.exitLoop(),
      'WhileStatement': (node) => this.enterLoop(node, 'while'),
      'WhileStatement:exit': (node) => this.exitLoop(),
      'DoWhileStatement': (node) => this.enterLoop(node, 'do-while'),
      'DoWhileStatement:exit': () => this.exitLoop(),

      // Check storage access
      'Identifier': (node) => this.checkStorageRead(node),
      'MemberAccess': (node) => this.checkMemberAccess(node),
      'IndexAccess': (node) => this.checkIndexAccess(node),

      // Track caching
      'BinaryOperation': (node) => {
        // this.checkBinaryOperation(node);

        // Assignment tracking (to detect caching)
        if (node.operator === '=') {
          this.trackAssignment(node);
        }
      },
    };
  }


  private enterLoop(node: any, loopType: string) {
    const context: LoopContext = {
      type: loopType,
      depth: this.context.loopStack.length + 1,
      node: node,
      storageReadsInCondition: new Set(),
      storageReadsInBody: new Set()
    };

    // Analyze loop condition for storage reads
    if (node.condition) {
      this.analyzeLoopCondition(node.condition, context);
    }

    this.context.loopStack.push(context);
  }

  private exitLoop() {
    this.context.loopStack.pop();
  }


  private analyzeLoopCondition(condition: any, loopContext: LoopContext) {
    // Custom visitor for condition analysis
    const checkNode = (node: any): void => {
      if (!node) return;

      if (node.type === 'Identifier' && this.context.isStorageVariable(node.name)) {
        loopContext.storageReadsInCondition.add(node.name);
      } else if (node.type === 'MemberAccess' &&
                  node.memberName === 'length' &&
                  node.expression?.type === 'Identifier' &&
                  this.context.isStorageVariable(node.expression.name)
      ) {
        loopContext.storageReadsInCondition.add(`${node.expression.name}.length`);
      }

      // Recursively check child nodes
      Object.values(node).forEach(child => {
        if (child && typeof child === 'object') {
          checkNode(child);
        }
      });
    };

    checkNode(condition);
  }


  private checkStorageRead(node: any) {
    if (!this.context.isInLoop() || !this.context.isStorageVariable(node.name)) {
      return;
    }

    // skip if it's already cached || skip if it's a local variable
    if (this.cachedVariables.has(node.name) || this.context.localVariables.has(node.name)) {
      return;
    }

    const currentLoop = this.context.getCurrentLoop();
    const inCondition = currentLoop?.storageReadsInCondition.has(node.name);

    this.context.addIssue({
      type: 'storage-read-in-loop',
      severity: inCondition ? 'high' : 'medium',
      line: node.loc?.start.line || 0,
      column: node.loc?.start.column || 0,
      message: `Storage variable '${node.name}' is being read inside a ${currentLoop?.type} loop${inCondition ? 'condition' : ''}`,
      suggestion: `Cache '${node.name}' in a local variable before the loop: 'uint256 _${node.name} = ${node.name}`
    });
  }


  private checkMemberAccess(node: any) {
    if (!this.context.isInLoop()) return;

    // check for array.length
    if (node.memberName === 'length' &&
      node.expression?.type === 'Identifier' &&
      this.context.isStorageVariable(node.expression.name)
    ) {

      const varName = `${node.expression.name}.length`;
      if (this.cachedVariables.has(varName)) {
        return;
      }

      const currentLoop = this.context.getCurrentLoop();
      const inCondition = currentLoop?.storageReadsInCondition.has(varName);

      this.context.addIssue({
        type: 'storage-read-in-loop',
        severity: 'high',
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        message: `Storage array length '${varName}' is being read inside a loop${inCondition ? ' condition (very inefficient!)' : ''}`,
        suggestion: `Cache the array length before the loop: 'uint256 ${node.expression.name}Length = ${varName};'`,
        gasImpact: inCondition ? '~2100 gas per iteration' : '~800 gas per read'
      });
    }

    // // Check for struct member access
    // if (node.expression?.type === 'Identifier' &&
    //     this.isStorageVariable(node.expression.name)
    // ) {
    //   const varInfo = this.stateVariables.get(node.expression.name);
    //   if (varInfo && !varInfo.isArray && !varInfo.isMapping) {
    //     this.addIssue({
    //       type: 'storage-read-in-loop',
    //       severity: 'medium',
    //       line: node.loc?.start.line || 0,
    //       column: node.loc?.start.column || 0,
    //       message: `Storage struct member '${node.expression.name}.${node.memberName}' is being read inside a loop`,
    //       suggestion: `Consider caching the entire struct or specific members before the loop`
    //     });
    //   }
    // }
  }


  private checkIndexAccess(node: any) {
    if (!this.context.isInLoop()) return;

    // Check for array[index] or mapping[key] access
    if (node.base?.type === 'Identifier' && this.context.isStorageVariable(node.base.name)) {

      const varInfo = this.context.stateVariables.get(node.base.name);
      const accessType = varInfo?.isArray ? 'array' : varInfo?.isMapping ? 'mapping' : 'storage';

      this.context.addIssue({
        type: 'storage-read-in-loop',
        severity: varInfo?.isArray ? 'high' : 'medium',
        line: node.loc?.start.line || 0,
        column: node.loc?.start.column || 0,
        message: `Storage ${accessType} '${node.base.name}' is being accessed inside a loop`,
        suggestion: accessType === 'array'
          ? `Consider caching array elements if accessing the same indices multiple times`
          : `Cache mapping values in local variables when accessing the same keys multiple times`
      });
    }
  }


  private trackAssignment(node: any) {
    // check if we're caching a storage variable
    if (node.left?.type === 'Identifier' &&
        node.right?.type === 'Identifier' &&
        this.context.localVariables.has(node.left.name) &&
        this.context.isStorageVariable(node.right.name)
    ) {
      this.cachedVariables.add(node.right.name);
    }

    // Check for array length caching
    if (node.left?.type === 'Identifier' &&
        node.right?.type === 'MemberAccess' &&
        node.right.memberName === 'length' &&
        this.context.isStorageVariable(node.right.expression?.name)
    ) {
      this.cachedVariables.add(`${node.right.expression.name}.length`);
    }
  }


}


