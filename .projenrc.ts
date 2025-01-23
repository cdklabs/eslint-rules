import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';
import { javascript } from 'projen';

const project = new CdklabsTypeScriptProject({
  private: false,
  projenrcTs: true,
  name: '@cdklabs/eslint-plugin',
  description: 'eslint rules published by the CDK team. Contains CDK rules and others.',
  majorVersion: 1,
  repository: 'https://github.com/cdklabs/eslint-rules',
  authorName: 'Amazon Web Services',
  authorUrl: 'https://aws.amazon.com',
  authorOrganization: true,
  defaultReleaseBranch: 'main',
  enablePRAutoMerge: true,

  packageManager: javascript.NodePackageManager.NPM,
  devDeps: [
    '@types/fs-extra',
    '@types/estree',
    '@typescript-eslint/rule-tester',
    '@eslint/compat',
    '@eslint/eslintrc',
    '@eslint/js',
    'globals',
    'typescript-eslint',
  ],
  deps: [
    'fs-extra',
    '@typescript-eslint/utils',
    'typescript',
  ],
  peerDeps: [
    'eslint@>=6 <10',
  ],

  peerDependencyOptions: {
    pinnedDevDependency: false,
  },

  tsconfig: {
    compilerOptions: {
      module: 'Node16',
      moduleResolution: javascript.TypeScriptModuleResolution.NODE16,
      isolatedModules: true,
    },
    exclude: [
      // Cannot exclude this, since we use the root tsconfig.dev.json to run eslint on thes efiles.
      // 'test/rules/fixtures/**/*.ts',
    ],
  },

  releaseToNpm: true,
  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,

  eslintOptions: {
    dirs: ['src'],
    ignorePatterns: ['test/rules/fixtures/**/*.ts'],
  },
});

// Declare different eslint deps than upstream projen
project.addDevDeps('eslint@^9.18.0');
project.deps.removeDependency('@typescript-eslint/eslint-plugin');
project.deps.removeDependency('@typescript-eslint/parser');

// Only ignore node_modules at the root, we also have one inside the
// `test/fixtures` directory.
project.gitignore.addPatterns('!test/rules/fixtures/node_modules/');
project.gitignore.addPatterns('.test-output/');

project.synth();
