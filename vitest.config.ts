import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    reporters: 'default',
  },
});
