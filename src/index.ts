/* eslint-disable @typescript-eslint/no-require-imports */

export const meta = {
  name: require('../package.json').name,
  version: require('../package.json').version,
};

export const rules = {
  'no-core-construct': require('./rules/no-core-construct'),
  'invalid-cfn-imports': require('./rules/invalid-cfn-imports'),
  'no-literal-partition': require('./rules/no-literal-partition'),
  'no-invalid-path': require('./rules/no-invalid-path'),
  'no-throw-default-error': require('./rules/no-throw-default-error'),
  'promiseall-no-unbounded-parallelism': require('./rules/promiseall-no-unbounded-parallelism'),
  'no-this-in-static': require('./rules/no-this-in-static'),
  'no-evaluating-typeguard': require('./rules/no-evaluating-typeguard'),
  'no-unconditional-token-allocation': require('./rules/no-unconditional-token-allocation'),
};
