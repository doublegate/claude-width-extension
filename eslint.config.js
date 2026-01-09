/**
 * ESLint Configuration for Claude Width Extension
 * ================================================
 *
 * ESLint v9.x flat config format.
 * This project uses IIFE patterns for browser extension compatibility.
 *
 * @author DoubleGate
 * @version 1.9.1
 * @license MIT
 */

import js from '@eslint/js';

export default [
    // Base recommended rules
    js.configs.recommended,

    // Global configuration for all source files
    {
        files: ['lib/**/*.js', 'popup/**/*.js', 'content/**/*.js', 'background/**/*.js', 'options/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script', // IIFE pattern compatibility
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                MutationObserver: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                FileReader: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly',
                HTMLElement: 'readonly',
                Element: 'readonly',
                Node: 'readonly',
                NodeList: 'readonly',
                getComputedStyle: 'readonly',

                // Firefox WebExtension APIs
                browser: 'readonly',

                // Extension globals (from lib/constants.js)
                ClaudeWidthConstants: 'readonly',
                ClaudeWidthLogger: 'readonly',
                ClaudeWidthProfiles: 'readonly'
            }
        },
        rules: {
            // Allow console statements (browser extension needs them for debugging)
            'no-console': 'off',

            // Warn on unused variables (allow underscore prefix for intentionally unused)
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],

            // Enforce semicolons
            'semi': ['error', 'always'],

            // Enforce single quotes
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

            // Enforce consistent spacing
            'indent': ['warn', 4, { SwitchCase: 1 }],
            'no-trailing-spaces': 'warn',
            'eol-last': ['warn', 'always'],

            // Best practices
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-empty': ['error', { allowEmptyCatch: true }],

            // Allow empty functions (common in event handlers)
            'no-empty-function': 'off',

            // Disable no-undef since we define globals manually
            // and IIFE pattern needs window assignments
            'no-undef': 'off'
        }
    },

    // Test file configuration
    {
        files: ['tests/**/*.js', 'tests/**/*.test.js', '*.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Node.js globals for config files
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',

                // Vitest globals
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                vi: 'readonly',

                // Browser globals (jsdom)
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                HTMLElement: 'readonly',
                Element: 'readonly',
                MutationObserver: 'readonly',
                localStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',

                // Extension globals
                browser: 'readonly',
                ClaudeWidthConstants: 'readonly',
                ClaudeWidthLogger: 'readonly',
                ClaudeWidthProfiles: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'no-undef': 'off'
        }
    },

    // Ignore patterns
    {
        ignores: [
            'node_modules/**',
            'build/**',
            'coverage/**',
            '*.min.js',
            'docs/**'
        ]
    }
];
