import { Rule } from 'eslint';
import type { NewExpression, ThrowStatement } from 'estree';

export const meta = {
  hasSuggestions: true,
};

export function create(context: Rule.RuleContext): Rule.NodeListener {
  const fileName = context.filename;
  const isCliFile = fileName.includes('packages/aws-cdk/');

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
        const suggestions = [
          {
            desc: 'Replace with `ValidationError`',
            fix: (fixer: Rule.RuleFixer) => {
              // no existing args
              if (newExpr.arguments.length === 0) {
                return fixer.replaceText(newExpr, "new ValidationError('<insert error message>', this)");
              }

              const fixes = [
                fixer.replaceText(newExpr.callee, 'ValidationError'),
              ];

              const last = newExpr.arguments.at(-1)?.range;
              if (last) {
                fixes.push(
                  fixer.insertTextAfterRange(last, ', this'),
                );
              }

              return fixes;
            },
          },
        ];

        // Adds ToolkitError and AuthenticationError suggestions for CLI files.
        if (isCliFile) {
          suggestions.push(
            {
              desc: 'Replace with `ToolkitError`',
              fix: (fixer: Rule.RuleFixer) => {
                // no existing args
                if (newExpr.arguments.length === 0) {
                  return fixer.replaceText(newExpr, "new ToolkitError('<insert error message>')");
                }

                const fixes = [
                  fixer.replaceText(newExpr.callee, 'ToolkitError'),
                ];

                const last = newExpr.arguments.at(-1)?.range;
                if (last) {
                  fixes.push(
                    fixer.insertTextAfterRange(last, ', this'),
                  );
                }

                return fixes;
              },
            },
            {
              desc: 'Replace with `AuthenticationError`',
              fix: (fixer: Rule.RuleFixer) => {
                // no existing args
                if (newExpr.arguments.length === 0) {
                  return fixer.replaceText(newExpr, "new AuthenticationError('<insert error message>')");
                }

                const fixes = [
                  fixer.replaceText(newExpr.callee, 'AuthenticationError'),
                ];

                const last = newExpr.arguments.at(-1)?.range;
                if (last) {
                  fixes.push(
                    fixer.insertTextAfterRange(last, ', this'),
                  );
                }

                return fixes;
              },
            },
          );
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
