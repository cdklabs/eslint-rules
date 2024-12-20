/**
 * Adapted from https://github.com/mysticatea/eslint-plugin/blob/v13.0.0/tests/lib/rules/no-this-in-static.js
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * MIT License
 */

import { Rule } from 'eslint';
import type { ClassDeclaration, FunctionDeclaration, FunctionExpression, Super, ThisExpression } from 'estree';
import NodeParentExtension = Rule.NodeParentExtension;

export const meta = {
  fixable: true,
};

export function create(context: Rule.RuleContext): Rule.NodeListener {
  const sourceCode = context.sourceCode;
  const staticFunctionStack: boolean[] = [];
  const classDeclarations: Map<string, ClassDeclaration> = new Map();

  function isStaticMethod(node: any): boolean {
    return (
      node.type === 'FunctionExpression' &&
      node.parent.type === 'MethodDefinition' &&
      node.parent.static === true
    );
  }

  function enterFunction(node: (FunctionDeclaration | FunctionExpression) & NodeParentExtension) {
    staticFunctionStack.push(isStaticMethod(node));
  }

  function exitFunction() {
    staticFunctionStack.pop();
  }

  function reportIfStatic(node: (ThisExpression | Super) & NodeParentExtension) {
    const currentMethodIsStatic = staticFunctionStack.length > 0 && staticFunctionStack[staticFunctionStack.length - 1];

    if (currentMethodIsStatic) {
      context.report({
        node,
        loc: node.loc ?? { line: 0, column: 0 },
        message: "'{{type}}' keyword found in a static method. Replace it with the class name.",
        data: { type: sourceCode.getText(node) },
        fix(fixer: Rule.RuleFixer) {
          if (node.type === 'Super') {
            const hierarchy = superClasses(findClassDeclaration(node));
            const memberName = findMemberName(node);

            if (memberName == null) {
              return null;
            }

            const superDecl = hierarchy.find(hasStaticMemberCalled(memberName));
            return superDecl ? fixer.replaceText(node, superDecl.id.name) : null;
          }

          if (node.type === 'ThisExpression') {
            const decl = findClassDeclaration(node);
            return decl ? fixer.replaceText(node, decl.id.name) : null;
          }

          return null;
        },
      });
    }
  }

  function superClasses(node: ClassDeclaration | null): ClassDeclaration[] {
    if (node == null) {
      return [];
    }

    const result: ClassDeclaration[] = [];

    let superClass = node.superClass;

    while (superClass != null) {
      if (superClass.type === 'Identifier') {
        const className = superClass.name;
        const decl = classDeclarations.get(className)!;
        result.push(decl);
        superClass = classDeclarations.get(className)?.superClass;
      }
    }

    return result;
  }

  function enterClass(node: ClassDeclaration & NodeParentExtension) {
    classDeclarations.set(node.id.name, node);
  }

  function findClassDeclaration(node: NodeParentExtension): ClassDeclaration | null {
    let parent = node.parent;

    while (parent != null) {
      if (parent.type === 'ClassDeclaration') {
        return parent;
      }

      parent = parent.parent;
    }

    return null;
  }

  function findMemberName(node: NodeParentExtension): string | null {
    let parent = node.parent;

    while (parent != null) {
      if (
        parent.type == 'MemberExpression'
        && parent.property.type === 'Identifier'
      ) {
        return parent.property.name;
      }

      if (
        parent.type === 'CallExpression'
        && parent.callee.type === 'MemberExpression'
        && parent.callee.property.type === 'Identifier'
      ) {
        return parent.callee.property.name;
      }

      parent = parent.parent;
    }

    return null;
  }

  const hasStaticMemberCalled = (name: string) => (decl: ClassDeclaration) => {
    return decl.body.body.some((node) => {
      return (node.type === 'MethodDefinition' || node.type === 'PropertyDefinition')
        && node.static && node.key.type === 'Identifier'
        && node.key.name === name;
    });
  };

  return {
    'FunctionDeclaration': enterFunction,
    'FunctionExpression': enterFunction,
    'FunctionDeclaration:exit': exitFunction,
    'FunctionExpression:exit': exitFunction,
    'ThisExpression': reportIfStatic,
    'Super': reportIfStatic,
    'ClassDeclaration': enterClass,
  };
}
