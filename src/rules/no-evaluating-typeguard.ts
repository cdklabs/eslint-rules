import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { Rule } from 'eslint';
import type { MemberExpression } from 'estree';
import NodeParentExtension = Rule.NodeParentExtension;

export const meta: Rule.RuleMetaData = {
  messages: {
    avoidAccess: "{{ memberAccess }}: this will evaluate '{{ prop }}', which might throw if it's a getter. Prefer using `'{{ prop }}' in {{ obj }}` (don't forget to check for object-ness of {{ obj }} if necessary!)",
  },
};

export const defaultOptions = {};


interface InterestingFunction {
  readonly argumentName: string;
}

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const services = getParserServices(context as any);

  const functionStack: Array<InterestingFunction | undefined> = [];
  //  const classDeclarations: Map<string, ClassDeclaration> = new Map();

  /**
   * Whether this function is a type predicate
   *
   * ```
   * function isSomething(x: unknown): x is Something { ... }
   * ```
   */
  function isUserDefinedTypeGuard(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) {
    if (node.params.length !== 1 || node.params[0].type !== AST_NODE_TYPES.Identifier) { return false; }
    return node.returnType?.typeAnnotation.type === AST_NODE_TYPES.TSTypePredicate;
  }

  /**
   * Whether this looks like a type coercion function
   *
   * ```
   * function toSomething(x: SomeType): SomeSubType { ... }
   * ```
   */
  function isTypeCoercionFunction(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) {
    const typeChecker = services.program.getTypeChecker();

    const functionType = services.getTypeAtLocation(node);
    const argumentType = typeChecker.getTypeOfSymbol(functionType.getCallSignatures()[0].getParameters()[0]);
    const returnType = functionType.getCallSignatures()[0].getReturnType();

    // If the return type is assignable to the input type, then this looks like
    // a downcast which probably means it's a type coerction function.
    return typeChecker.isTypeAssignableTo(returnType, argumentType);
  }

  // eslint-disable-next-line @stylistic/max-len
  function maybeInteresting(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression): InterestingFunction | undefined {
    if (node.params.length !== 1 || node.params[0].type !== AST_NODE_TYPES.Identifier) { return undefined; }
    if (isUserDefinedTypeGuard(node) || isTypeCoercionFunction(node)) {
      return {
        argumentName: (node.params[0] as TSESTree.Identifier).name,
      };
    }
    return undefined;
  }

  /**
   * Enter a function and see if it's interesting
   */
  function enterFunction(node: (TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) & NodeParentExtension) {
    functionStack.push(maybeInteresting(node));
  }

  function exitFunction() {
    functionStack.pop();
  }

  function currentInteresting(): InterestingFunction | undefined {
    return functionStack.length > 0 ? functionStack[functionStack.length - 1] : undefined;
  }

  function onlyInInterestingFunction<A extends Function>(fn: A): A {
    return ((...args: any[]) => {
      if (currentInteresting()) {
        return fn(...args);
      }
      return undefined;
    }) as any;
  }

  /**
   * For member expressions in interesting functions
   *
   * - If their LHS refers to the only function argument; AND
   *   - If their parent is a `typeof` node; OR
   *   - The member expression is part of a boolean expression; OR
   *   - The member expression is in a bang-bang operator (!!); OR
   *   - The expression is by itself in an `if` or `return` or `?:` ternary
   *
   * Then that is a potential problem because it will evaluate a member
   * that we potentially only wanted to test for presence.
   */
  function memberExpression(node: TSESTree.MemberExpression) {
    const current = currentInteresting()!;

    // Only property access on the primary argument
    if ((node.object.type !== AST_NODE_TYPES.Identifier) || (node.object as TSESTree.Identifier).name !== current.argumentName) {
      return;
    }

    let dangerous = false;
    if (node.parent.type === AST_NODE_TYPES.UnaryExpression && node.parent.operator === 'typeof') {
      dangerous = true;
    }
    if (node.parent.type === AST_NODE_TYPES.UnaryExpression
      && node.parent.operator === '!'
      && node.parent.parent.type === AST_NODE_TYPES.UnaryExpression
      && node.parent.parent.operator === '!') {
      dangerous = true;
    }
    if (node.parent.type === AST_NODE_TYPES.LogicalExpression) {
      dangerous = true;
    }
    if ([AST_NODE_TYPES.ReturnStatement, AST_NODE_TYPES.IfStatement, AST_NODE_TYPES.ConditionalExpression].includes(node.parent.type)) {
      dangerous = true;
    }

    if (dangerous) {
      const eslintNode = node as MemberExpression;
      context.report({
        node: eslintNode,
        messageId: 'avoidAccess',
        loc: eslintNode.loc ?? { line: 0, column: 0 },
        data: {
          memberAccess: context.sourceCode.getText(eslintNode),
          obj: current.argumentName,
          prop: (node.property as TSESTree.PrivateIdentifier | TSESTree.Identifier).name,
        },
      });
    }
  }

  return {
    'FunctionDeclaration': enterFunction as any,
    'FunctionExpression': enterFunction as any,
    'FunctionDeclaration:exit': exitFunction,
    'FunctionExpression:exit': exitFunction,
    'MemberExpression': onlyInInterestingFunction(memberExpression) as any,
  };
}
