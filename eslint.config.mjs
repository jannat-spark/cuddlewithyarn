import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * eslint-config-next 16 ships native flat configs, so no FlatCompat shim.
 */
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**', '.data/**', 'next-env.d.ts'],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;