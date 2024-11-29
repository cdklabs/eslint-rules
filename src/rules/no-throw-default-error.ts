import { Rule } from 'eslint';
import type { NewExpression, ThrowStatement } from 'estree';

export const meta = {
  hasSuggestions: true,
};

export function create(context: Rule.RuleContext): Rule.NodeListener {
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
        context.report({
          node: newExpr,
          message: 'Expected a non-default error object to be thrown.',
          suggest: [
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
          ],
        });
      }
    },
  };
}
