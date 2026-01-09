import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for browser environment simulation
    environment: 'jsdom',

    // Global test setup
    setupFiles: ['./tests/setup.js'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/**/*.js',
        'popup/**/*.js',
        'content/**/*.js',
        'background/**/*.js',
        'options/**/*.js'
      ],
      exclude: [
        'tests/**',
        'build/**',
        'node_modules/**',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      // Target 100% coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },

    // Include test files
    include: ['tests/**/*.test.js'],

    // Globals for cleaner test syntax
    globals: true,

    // Reporter configuration
    reporters: ['verbose'],

    // Timeout for tests
    testTimeout: 10000,

    // Mock browser APIs
    deps: {
      inline: ['jsdom']
    }
  }
});
