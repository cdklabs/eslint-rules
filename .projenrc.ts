import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';
import { TypeScriptModuleResolution } from 'projen/lib/javascript';

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

  devDeps: [
    '@types/fs-extra',
    '@types/estree',
    '@typescript-eslint/rule-tester',
  ],
  deps: [
    'fs-extra',
    '@typescript-eslint/utils',
  ],
  peerDeps: [
    '@typescript-eslint/parser',
    'eslint@>=6 <9',
  ],

  peerDependencyOptions: {
    pinnedDevDependency: false,
  },

  tsconfig: {
    compilerOptions: {
      module: 'Node16',
      moduleResolution: TypeScriptModuleResolution.NODE16,
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
project.addDevDeps('@types/eslint@^8', 'eslint@^8');

// Only ignore node_modules at the root, we also have one inside the
// `test/fixtures` directory.
project.gitignore.addPatterns('!test/rules/fixtures/node_modules/');
project.gitignore.addPatterns('.test-output/');

project.synth();
