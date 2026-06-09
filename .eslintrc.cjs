module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2023: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/', '.turbo/', '.vscode/', 'apps/**/node_modules/'],
  rules: {
    'no-console': 'off',
  },
}
