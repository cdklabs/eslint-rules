import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { getParserServices } from '@typescript-eslint/utils/eslint-utils';
import { Rule } from 'eslint';
import type { MemberExpression } from 'estree';
import { TypeFlags } from 'typescript';
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
   * This is a short and sweet way to determine whether this is a function we should be checking.
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
   * There are a lot more heuristics involved here to determine whether this is actually
   * a function that does a run-time type check. It could look like this for a number of reasons.
   *
   * ```
   * function toSomething(x: SomeType): SomeSubType { ... }
   * ```
   */
  function isTypeCoercionFunction(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) {
    const typeChecker = services.program.getTypeChecker();

    const functionType = services.getTypeAtLocation(node);
    const callSignature = functionType.getCallSignatures()[0];
    if (!callSignature) {
      // Constructors, getters and setters don't have a call signature
      return false;
    }

    const firstParameter = callSignature.getParameters()[0];
    if (!firstParameter) {
      // Couldn't resolve first parameter for some reason. This can happen if the argument is 'this'
      return false;
    }

    const argumentType = typeChecker.getTypeOfSymbol(firstParameter);
    const returnType = callSignature.getReturnType();

    // If the output type is void this is not a type coercion
    // eslint-disable-next-line no-bitwise
    if ((returnType.getFlags() & TypeFlags.VoidLike) !== 0) {
      return false;
    }

    // If the output type doesn't have a symbol, it's an anonymous type (`return { x: 3, y: 42 };`)
    // Which is most likely not a coercion function.
    if (returnType.getSymbol() == null) {
      return false;
    }

    // Object methods are never type testing functions (static class methods might be)
    if (node.parent.type === AST_NODE_TYPES.MethodDefinition && !node.parent.static) {
      return false;
    }


    // If the return type is assignable to the input type, then this looks like
    // a downcast which probably means it's a type coercion function.
    return (typeChecker.isTypeAssignableTo(returnType, argumentType)
      && !typeChecker.isTypeAssignableTo(argumentType, returnType));
  }

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
    if (node.parent.type === AST_NODE_TYPES.LogicalExpression && ['&&', '||'].includes(node.parent.operator)) {
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
