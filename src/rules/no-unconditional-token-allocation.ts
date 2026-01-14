import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { Rule } from 'eslint';
import type { CallExpression } from 'estree';
import NodeParentExtension = Rule.NodeParentExtension;

export const meta: Rule.RuleMetaData = {
  messages: {
    avoidCall: '{{ calleeText }}: this will allocate an entry in a global table, even if the consumer never needs its result. Prefer to put this call in a (memoized) property getter instead.',
  },
};

const DISALLOWED_CALLEES = [
  'this.getResourceNameAttribute',
  'this.getResourceArnAttribute',
  'Token.asString',
];

export const defaultOptions = {};

export function create(context: Rule.RuleContext): Rule.RuleListener {
  const functionStack: Array<boolean> = [];

  /**
   * Whether this function is a constructor
   */
  function isConstructor(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression) {
    return node.parent.type === AST_NODE_TYPES.MethodDefinition && node.parent.kind === 'constructor';
  }

  function maybeInteresting(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression): (typeof functionStack)[number] {
    return isConstructor(node);
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

  function currentInteresting(): (typeof functionStack)[number] {
    return functionStack.length > 0 ? functionStack[functionStack.length - 1] : false;
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
   * Check the text what we're calling against a set of disallowed entries
   */
  function callExpression(node: TSESTree.CallExpression) {
    const eslintNode = node as CallExpression;
    const calleeText = context.sourceCode.getText(eslintNode.callee);

    if (DISALLOWED_CALLEES.includes(calleeText)) {
      context.report({
        node: eslintNode,
        messageId: 'avoidCall',
        loc: eslintNode.loc ?? { line: 0, column: 0 },
        data: {
          calleeText,
        },
      });
    }
  }

  return {
    'FunctionDeclaration': enterFunction as any,
    'FunctionExpression': enterFunction as any,
    'FunctionDeclaration:exit': exitFunction,
    'FunctionExpression:exit': exitFunction,
    'CallExpression': onlyInInterestingFunction(callExpression) as any,
  };
}
