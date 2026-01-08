/**
 * Claude Chat Width Customizer - Shared Constants
 * ================================================
 *
 * Centralized constants shared across all extension scripts.
 * This module is loaded first and exposes constants via window.ClaudeWidthConstants.
 *
 * @author DoubleGate
 * @version 1.8.1
 * @license MIT
 */

(function() {
    'use strict';

    /**
     * Shared constants for the Claude Width extension.
     * @namespace
     */
    window.ClaudeWidthConstants = {
        // =====================================================================
        // WIDTH SETTINGS
        // =====================================================================

        /**
         * Default width percentage (changed from 70 to 85 in v1.8.0).
         * @type {number}
         */
        DEFAULT_WIDTH: 85,

        /**
         * Minimum allowed width percentage.
         * @type {number}
         */
        MIN_WIDTH: 40,

        /**
         * Maximum allowed width percentage.
         * @type {number}
         */
        MAX_WIDTH: 100,

        /**
         * Width presets for cycling (in order).
         * @type {number[]}
         */
        PRESET_CYCLE: [50, 70, 85, 100],

        // =====================================================================
        // STORAGE KEYS
        // =====================================================================

        /**
         * Storage key for width preference.
         * @type {string}
         */
        STORAGE_KEY: 'chatWidthPercent',

        /**
         * Storage key for theme preference.
         * @type {string}
         */
        THEME_STORAGE_KEY: 'theme',

        /**
         * Storage key for last non-default width (for toggle feature).
         * @type {string}
         */
        LAST_WIDTH_KEY: 'lastNonDefaultWidth',

        // =====================================================================
        // ENHANCED STYLING KEYS (v1.8.0)
        // =====================================================================

        /**
         * Storage keys for enhanced styling features.
         * @type {Object<string, string>}
         */
        ENHANCED_KEYS: {
            FONT_SIZE: 'fontSizePercent',
            LINE_HEIGHT: 'lineHeight',
            MESSAGE_PADDING: 'messagePadding',
            DISPLAY_MODE: 'displayMode',
            CODE_BLOCK_HEIGHT: 'codeBlockMaxHeight',
            CODE_BLOCK_WRAP: 'codeBlockWordWrap',
            CODE_BLOCKS_COLLAPSED: 'codeBlocksCollapsed',
            SHOW_TIMESTAMPS: 'showTimestamps',
            SHOW_AVATARS: 'showAvatars',
            BUBBLE_STYLE: 'messageBubbleStyle'
        },

        /**
         * Default values for enhanced styling.
         * @type {Object}
         */
        ENHANCED_DEFAULTS: {
            fontSizePercent: 100,
            lineHeight: 'normal',
            messagePadding: 'medium',
            displayMode: 'comfortable',
            codeBlockMaxHeight: 400,
            codeBlockWordWrap: false,
            codeBlocksCollapsed: false,
            showTimestamps: true,
            showAvatars: true,
            messageBubbleStyle: 'rounded'
        },

        /**
         * Display mode presets.
         * @type {Object<string, {lineHeight: string, messagePadding: string, fontSize: number}>}
         */
        DISPLAY_MODE_PRESETS: {
            'compact': {
                lineHeight: 'compact',
                messagePadding: 'small',
                fontSize: 95
            },
            'comfortable': {
                lineHeight: 'normal',
                messagePadding: 'medium',
                fontSize: 100
            },
            'spacious': {
                lineHeight: 'relaxed',
                messagePadding: 'large',
                fontSize: 105
            }
            // 'custom' uses user-defined values
        },

        // =====================================================================
        // TIMING CONSTANTS
        // =====================================================================

        /**
         * Timing-related constants.
         * @type {Object}
         */
        TIMING: {
            /**
             * Debounce delay for DOM updates (ms).
             * @type {number}
             */
            DEBOUNCE_MS: 50,

            /**
             * Animation duration for UI updates (ms).
             * @type {number}
             */
            ANIMATION_MS: 150,

            /**
             * Screen reader announcement delay (ms).
             * @type {number}
             */
            SR_ANNOUNCE_DELAY_MS: 50,

            /**
             * Retry intervals for initialization (ms).
             * Used to catch lazy-loaded content on claude.ai.
             * @type {number[]}
             */
            INIT_RETRY_INTERVALS: [100, 500, 1000, 2000, 3000]
        },

        // =====================================================================
        // PRESET CONFIGURATION
        // =====================================================================

        /**
         * Maximum number of custom presets allowed.
         * @type {number}
         */
        MAX_CUSTOM_PRESETS: 4,

        /**
         * Maximum number of recent widths to track.
         * @type {number}
         */
        MAX_RECENT_WIDTHS: 3,

        /**
         * Built-in presets configuration.
         * @type {Array<{id: string, name: string, width: number, builtIn: boolean}>}
         */
        BUILT_IN_PRESETS: [
            { id: 'narrow', name: 'Narrow', width: 50, builtIn: true },
            { id: 'medium', name: 'Medium', width: 70, builtIn: true },
            { id: 'wide', name: 'Wide', width: 85, builtIn: true },
            { id: 'full', name: 'Full', width: 100, builtIn: true }
        ],

        // =====================================================================
        // THEME CONFIGURATION
        // =====================================================================

        /**
         * Default theme.
         * @type {string}
         */
        DEFAULT_THEME: 'system',

        /**
         * Valid theme values.
         * @type {string[]}
         */
        VALID_THEMES: ['light', 'dark', 'system'],

        // =====================================================================
        // BADGE CONFIGURATION
        // =====================================================================

        /**
         * Badge background color (neutral grey).
         * @type {string}
         */
        BADGE_COLOR: '#6B7280',

        /**
         * Badge text color.
         * @type {string}
         */
        BADGE_TEXT_COLOR: '#FFFFFF'
    };

})();
