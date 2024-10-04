import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';

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

  devDeps: [
    '@types/eslint@^8',
    '@types/fs-extra',
    '@types/estree',
    'eslint@^8',
  ],
  deps: [
    'fs-extra',
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
      // moduleResolution: TypeScriptModuleResolution.NODE16,
    },
    exclude: [
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

// Only ignore node_modules at the root, we also have one inside the
// `test/fixtures` directory.
project.gitignore.addPatterns('!test/rules/fixtures/node_modules/');
project.gitignore.addPatterns('.test-output/');

project.synth();
