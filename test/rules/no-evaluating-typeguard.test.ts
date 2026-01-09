import * as path from 'path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as noEvaluatingTypeguard from '../../src/rules/no-evaluating-typeguard';

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
ruleTester.run( 'no-evaluating-typeguard', noEvaluatingTypeguard as any, {
  // checks
  // 'valid' checks cases that should pass
  valid: [
    // ✅ No member access at all
    { code: 'function xyz(x: any): x is number { return false; }' },
    // ✅ 'typeof' on argument itself is fine
    { code: 'function xyz(x: any): x is number { return typeof x === "number"; }' },
    // ✅ Not a callable we're interested in, but we shouldn't explode either
    { code: 'class X { constructor(y: string) { } }' },
    // ✅ Not a callable we're interested in, but we shouldn't explode either
    { code: 'function something(this: string) { }' },
    // ✅ Something that returns itself is a type coercion function
    { code: 'function something(x: string): string { return x.toUppercase ? x : "oops"; }' },
    // ✅ Something that returns void is not a type coercion function
    { code: 'function something(x: string) { if (x.toUppercase) { console.log(); } }' },
    // ✅ Something that returns an anonymous structure is not a coercion function
    { code: 'function something(x: string) { return { y: 42 }; }' },
    // ✅ We don't care about nullish chaining
    { code: 'function xyz(x: any): number { return (x.customParse ?? parseInt)(x) }' },
    {
      // ✅ Non-static methods are never a problem
      code: [
        'interface ISuper { super: string } interface ISub extends ISuper { sub: string }',
        'class X { public test(x: ISuper): ISub { if (x.sub) { throw new Error("Oops"); } return x; } }',
      ].join('\n'),
    },
  ],
  // 'invalid' checks cases that should not pass
  invalid: [
    {
      // ⛔ Reading a member (in a user defined type guard)
      code: 'function test(x: any): x is number { return x.toInt; }',
      errors: [{ messageId: 'avoidAccess' }],
    },
    {
      // ⛔ Using typeof on a member (in a user defined type guard)
      code: 'function test(x: any): x is number { return typeof x.toInt === "function"; }',
      errors: [{ messageId: 'avoidAccess' }],
    },
    {
      // ⛔ Reading a member in a logical expression (in a user defined type guard)
      code: 'function test(x: any): x is number { return true && x.toInt; }',
      errors: [{ messageId: 'avoidAccess' }],
    },
    {
      // ⛔ Reading a member in a bangbang operator (in a user defined type guard)
      code: 'function test(x: any): x is number { return !!x.toInt; }',
      errors: [{ messageId: 'avoidAccess' }],
    },
    {
      // ⛔ Detect a problem in a static function
      code: [
        'interface ISuper { super: string } interface ISub extends ISuper { sub: string }',
        'class X { public static test(x: ISuper): ISub { if (x.sub) { throw new Error("Oops"); } return x; } }',
      ].join('\n'),
      errors: [{ messageId: 'avoidAccess' }],
    },
    {
      // ⛔ Reading a member in an if in a type coercion function
      code: [
        'interface ISuper { super: string } interface ISub extends ISuper { sub: string }',
        'function test(x: ISuper): ISub { if (x.sub) { throw new Error("Oops"); } return x; }',
      ].join('\n'),
      errors: [{ messageId: 'avoidAccess' }],
    },
  ],
});