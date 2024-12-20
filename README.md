# eslint-plugin-cdk

Eslint plugin for the CDK repository. Contains rules that need to be applied specific to the CDK repository.

## Rules

* `invalid-cfn-imports`: Ensures that imports of `Cfn<Resource>` L1 resources come from the stable
  `aws-cdk-lib` package and not the alpha packages. Rule only applies to alpha modules.

* `no-core-construct`: Forbid the use of `Construct` and `IConstruct` from the "@aws-cdk/core" module.
  Instead use `Construct` and `IConstruct` from the "constructs" module.
  Rule only applies to typescript files under the `test/` folder.

* `no-invalid-path`: Checks paths specified using `path.join()` for validity, including not going backwards (`'..'`)
  multiple times in the path and not going backwards beyond a package's `package.json`.

* `no-literal-partition`: Forbids the use of literal partitions (usually `aws`). Instead, use
  `Aws.PARTITION` to ensure that the code works for other partitions too.

* `consider-promise-all`: when using `Promise.all()`, attest that there is no unbounded parallelism.

* `no-throw-default-error`: Forbid throwing the default JavaScript error type. Instead a custom typed error should be thrown.

* `no-this-in-static`: Forbid the use of the keywords `this` and `super` in 
  static methods.

## How to use these rules

Import the plugin and declare rules with the `@cdklabs` prefix:

```js
module.exports = {
  plugins: [
    // ... other plugins
    '@cdklabs',
  ],
  rules: {
    '@cdklabs/no-throw-default-error': [ 'error' ],
  }
}
```

## How to add new rules

* Make a new file in `lib/rules`. It should export one function called `create`. The
  `create` function should return a visitor object.
* Add the new file to `lib/index.ts`.
* Add a fixture directory under `test/fixtures/<rule name>`. Copy and adjust an `eslintrc.js` file
  from another test.
* Add a testing `.ts` file, and be sure to add either an `expected.ts` or an `.error.txt` variant
  as well!
* You can now run the test in debugging mode (make sure to have `npx tsc -w` running, then from a debugging terminal, `npx jest --no-coverage -it 'your rule name'`), set a breakpoint, and inspect the typeless objects.

Use <https://ts-ast-viewer.com/> to get a feel for the AST you're trying to analyze. Note
that eslint uses `estree` to model AST nodes (not the TypeScript AST nodes), but they are
often comparable. Add type-testing TypeScript helpers to `type-checkers.ts` for typing
assistance.

To activate it for real on the repo, also add it to `cdk-build-tools/config/eslintrc.js`.
