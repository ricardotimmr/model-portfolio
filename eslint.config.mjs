import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  prettierConfig,
  globalIgnores([
    '.next/**',
    'dist/**',
    'out/**',
    'node_modules/**',
    'docs/**',
    'content-preparation/**',
    'public/media/**',
  ]),
]);
