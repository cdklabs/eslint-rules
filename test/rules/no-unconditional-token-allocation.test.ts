import * as path from 'path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as noUnconditionalTokenAllocation from '../../src/rules/no-unconditional-token-allocation';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
      tsconfigRootDir: path.join(__dirname, '..', '..'),
    },
  },
});

// Throws error if the tests in ruleTester.run() do not pass
ruleTester.run( 'no-unconditional-token-allocation', noUnconditionalTokenAllocation as any, {
  // checks
  // 'valid' checks cases that should pass
  valid: [
    // ✅ Empy constructor
    { code: 'class X { constructor() { } }' },
  ],
  // 'invalid' checks cases that should not pass
  invalid: [
    {
      // ⛔ Using this.getResourceNameAttribute
      code: 'class X { constructor() { this.getResourceNameAttribute(x, y) } }',
      errors: [{ messageId: 'avoidCall' }],
    },
    {
      // ⛔ Using this.getResourceArnAttribute
      code: 'class X { constructor() { this.getResourceArnAttribute(x, y) } }',
      errors: [{ messageId: 'avoidCall' }],
    },
    {
      // ⛔ Using Token.asString()
      code: 'class X { constructor() { Token.asString(x) } }',
      errors: [{ messageId: 'avoidCall' }],
    },
  ],
});