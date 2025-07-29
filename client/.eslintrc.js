module.exports = {
  extends: ['react-app', 'react-app/jest', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    '@typescript-eslint/no-unused-vars': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'no-console': 'off',
    'prefer-const': 'error',
  },
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
