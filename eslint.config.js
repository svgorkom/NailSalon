import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'bin', 'obj'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: globals.browser },
  },
  {
    // Core stays free of UI, 3D, data and DOM code.
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['react', 'react-*', 'three', 'three/*', '@react-three/*', 'firebase', 'firebase/*', '../ui/*', '../scene/*', '../data/*'] },
      ],
    },
  },
);
