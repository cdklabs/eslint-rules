import { Rule } from 'eslint';
import type { NewExpression, ThrowStatement } from 'estree';

export const meta = {
  hasSuggestions: true,
};

// list of paths that should trigger the toolkit error suggestions
const toolkitErrorPaths = ['packages/aws-cdk/', 'packages/@aws-cdk/toolkit/'];

export function create(context: Rule.RuleContext): Rule.NodeListener {
  const fileName = context.filename;
  const isToolkitFile = toolkitErrorPaths.some((path) =>
    fileName.includes(path),
  );

  return {
    ThrowStatement(node: ThrowStatement) {
      if (node.argument.type !== 'NewExpression') {
        return;
      }

      const newExpr = node.argument as NewExpression;
      if (
        newExpr.callee &&
        newExpr.callee.type === 'Identifier' &&
        newExpr.callee.name === 'Error'
      ) {
        const suggestions = [];

        const replaceErrorClassSuggestion = (suggested: string) => {
          return {
            desc: `Replace with \`${suggested}\``,
            fix: (fixer: Rule.RuleFixer) => {
              // no args
              if (newExpr.arguments.length === 0) {
                return fixer.replaceText(newExpr, `new ${suggested}('<insert error message>')`);
              }
              return [fixer.replaceText(newExpr.callee, suggested)];
            },
          };
        };


        // Adds ToolkitError and AuthenticationError suggestions for CLI files.
        if (isToolkitFile) {
          suggestions.push(
            replaceErrorClassSuggestion('ToolkitError'),
            replaceErrorClassSuggestion('AuthenticationError'),
            replaceErrorClassSuggestion('AssemblyError'),
            replaceErrorClassSuggestion('ContextProviderError'),
          );
        } else {
          suggestions.push({
            desc: 'Replace with `ValidationError`',
            fix: (fixer: Rule.RuleFixer) => {
              // no existing args
              if (newExpr.arguments.length === 0) {
                return fixer.replaceText(
                  newExpr,
                  "new ValidationError('<insert error message>', this)",
                );
              }

              const fixes = [
                fixer.replaceText(newExpr.callee, 'ValidationError'),
              ];

              const last = newExpr.arguments.at(-1)?.range;
              if (last) {
                fixes.push(fixer.insertTextAfterRange(last, ', this'));
              }

              return fixes;
            },
          });
        }

        context.report({
          node: newExpr,
          message: 'Expected a non-default error object to be thrown.',
          suggest: suggestions,
        });
      }
    },
  };
}
