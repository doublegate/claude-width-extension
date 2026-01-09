/**
 * Claude Chat Width Customizer - Shared Constants
 * ================================================
 *
 * Centralized constants shared across all extension scripts.
 * This module is loaded first and exposes constants via window.ClaudeWidthConstants.
 *
 * @author DoubleGate
 * @version 1.9.1
 * @license MIT
 */

// =============================================================================
// JSDOC TYPE DEFINITIONS
// =============================================================================

/**
 * Custom preset configuration.
 * @typedef {Object} CustomPreset
 * @property {string} id - Unique identifier for the preset
 * @property {string} name - Display name for the preset
 * @property {number} width - Width percentage (40-100)
 * @property {number} order - Sort order for display
 * @property {boolean} favorite - Whether this preset is favorited
 */

/**
 * Built-in preset configuration.
 * @typedef {Object} BuiltInPreset
 * @property {string} id - Unique identifier (narrow, medium, wide, full)
 * @property {string} name - Display name
 * @property {number} width - Width percentage
 * @property {boolean} builtIn - Always true for built-in presets
 */

/**
 * Enhanced styling settings for typography, display, and visual options.
 * @typedef {Object} EnhancedSettings
 * @property {number} fontSizePercent - Font size percentage (80-120)
 * @property {'compact'|'normal'|'relaxed'} lineHeight - Line height setting
 * @property {'none'|'small'|'medium'|'large'} messagePadding - Message padding setting
 * @property {'compact'|'comfortable'|'spacious'|'custom'} displayMode - Display mode
 * @property {200|400|600|0} codeBlockMaxHeight - Code block max height (0 = unlimited)
 * @property {boolean} codeBlockWordWrap - Enable word wrap in code blocks
 * @property {boolean} codeBlocksCollapsed - Collapse all code blocks by default
 * @property {boolean} showTimestamps - Show message timestamps
 * @property {boolean} showAvatars - Show user/Claude avatars
 * @property {'rounded'|'square'|'minimal'} messageBubbleStyle - Message bubble style
 */

/**
 * Profile configuration with all settings.
 * @typedef {Object} Profile
 * @property {string} name - Profile display name
 * @property {number} chatWidthPercent - Chat width percentage (40-100)
 * @property {'light'|'dark'|'system'} theme - Theme preference
 * @property {CustomPreset[]} customPresets - Custom width presets
 * @property {number} fontSizePercent - Font size percentage
 * @property {'compact'|'normal'|'relaxed'} lineHeight - Line height
 * @property {'none'|'small'|'medium'|'large'} messagePadding - Message padding
 * @property {'compact'|'comfortable'|'spacious'|'custom'} displayMode - Display mode
 * @property {200|400|600|0} codeBlockMaxHeight - Code block max height
 * @property {boolean} codeBlockWordWrap - Code block word wrap
 * @property {boolean} codeBlocksCollapsed - Code blocks collapsed
 * @property {boolean} showTimestamps - Show timestamps
 * @property {boolean} showAvatars - Show avatars
 * @property {'rounded'|'square'|'minimal'} messageBubbleStyle - Bubble style
 */

/**
 * Auto-profile rule for URL-based profile switching.
 * @typedef {Object} AutoProfileRule
 * @property {string} pattern - URL pattern (supports * wildcards)
 * @property {string} profileId - Profile ID to activate when pattern matches
 */

/**
 * Profile storage data structure.
 * @typedef {Object} ProfileData
 * @property {boolean} syncEnabled - Whether browser sync is enabled
 * @property {string} activeProfileId - Currently active profile ID
 * @property {Object<string, Profile>} profiles - Map of profile ID to profile
 * @property {AutoProfileRule[]} autoProfileRules - Auto-profile rules
 */

/**
 * Import/export data format.
 * @typedef {Object} ImportExportData
 * @property {number} exportVersion - Export format version
 * @property {string} exportDate - ISO date string of export
 * @property {string} extensionVersion - Extension version at export time
 * @property {boolean} syncEnabled - Sync enabled setting
 * @property {string} activeProfileId - Active profile ID
 * @property {Object<string, Profile>} profiles - All profiles
 * @property {AutoProfileRule[]} autoProfileRules - Auto-profile rules
 */

/**
 * Storage data structure (flat format used by content script).
 * @typedef {Object} StorageData
 * @property {number} chatWidthPercent - Current width percentage
 * @property {'light'|'dark'|'system'} theme - Theme preference
 * @property {CustomPreset[]} customPresets - Custom presets
 * @property {string[]} hiddenBuiltInPresets - Hidden built-in preset IDs
 * @property {number[]} recentWidths - Recently used widths
 * @property {number} lastNonDefaultWidth - Last width before toggling to default
 * @property {number} migrationVersion - Data migration version
 * @property {number} fontSizePercent - Font size percentage
 * @property {'compact'|'normal'|'relaxed'} lineHeight - Line height
 * @property {'none'|'small'|'medium'|'large'} messagePadding - Message padding
 * @property {'compact'|'comfortable'|'spacious'|'custom'} displayMode - Display mode
 * @property {200|400|600|0} codeBlockMaxHeight - Code block max height
 * @property {boolean} codeBlockWordWrap - Code block word wrap
 * @property {boolean} codeBlocksCollapsed - Code blocks collapsed
 * @property {boolean} showTimestamps - Show timestamps
 * @property {boolean} showAvatars - Show avatars
 * @property {'rounded'|'square'|'minimal'} messageBubbleStyle - Bubble style
 */

/**
 * Operation result with success/error status.
 * @typedef {Object} OperationResult
 * @property {boolean} success - Whether operation succeeded
 * @property {string} [error] - Error message if failed
 * @property {*} [data] - Optional result data
 */

// =============================================================================
// MAIN MODULE
// =============================================================================

(function() {
    'use strict';

    /**
     * Shared constants for the Claude Width extension.
     * @namespace
     */
    window.ClaudeWidthConstants = {
        // =====================================================================
        // DEBUG CONFIGURATION
        // =====================================================================

        /**
         * Enable debug logging. Set to true for development, false for production.
         * When false, only warnings and errors are logged.
         * @type {boolean}
         */
        DEBUG: false,

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
        BADGE_TEXT_COLOR: '#FFFFFF',

        // =====================================================================
        // PROFILE CONFIGURATION (v1.9.0)
        // =====================================================================

        /**
         * Maximum number of profiles allowed.
         * @type {number}
         */
        MAX_PROFILES: 8,

        /**
         * Maximum length for profile names.
         * @type {number}
         */
        PROFILE_NAME_MAX_LENGTH: 30,

        /**
         * Profile storage keys.
         * @type {Object<string, string>}
         */
        PROFILE_STORAGE_KEYS: {
            SYNC_ENABLED: 'syncEnabled',
            ACTIVE_PROFILE_ID: 'activeProfileId',
            PROFILES: 'profiles',
            AUTO_PROFILE_RULES: 'autoProfileRules'
        },

        /**
         * Default profile settings (used for new profiles).
         * Combines width, theme, and enhanced styling defaults.
         * @type {Object}
         */
        PROFILE_DEFAULTS: {
            chatWidthPercent: 85,
            theme: 'system',
            customPresets: [],
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
         * Export/import format version.
         * Increment when changing export format.
         * @type {number}
         */
        EXPORT_VERSION: 1,

        // =====================================================================
        // SYNC CONFIGURATION (v1.9.0)
        // =====================================================================

        /**
         * Browser sync storage quota (bytes).
         * Firefox allows 100KB for sync storage.
         * @type {number}
         */
        SYNC_QUOTA_BYTES: 102400,

        /**
         * Safe sync storage limit (90% of quota).
         * Leave headroom for other data.
         * @type {number}
         */
        SYNC_SAFE_LIMIT: 90000
    };

    // =========================================================================
    // LOGGING UTILITY
    // =========================================================================

    /**
     * Logging utility for consistent error handling and debugging.
     * Provides structured logging with module context and optional user feedback.
     *
     * @namespace
     */
    window.ClaudeWidthLogger = {
        /**
         * Log prefix for all messages.
         * @type {string}
         */
        PREFIX: '[Claude Width]',

        /**
         * Log levels for filtering.
         * @enum {number}
         */
        LEVELS: {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        },

        /**
         * Current log level (can be changed at runtime).
         * Set based on DEBUG constant: DEBUG=true -> 0 (show all), DEBUG=false -> 2 (warnings+errors only)
         * @type {number}
         */
        currentLevel: window.ClaudeWidthConstants.DEBUG ? 0 : 2,

        /**
         * Format a log message with module context.
         *
         * @param {string} module - The module name (e.g., 'Popup', 'Content', 'Background')
         * @param {string} message - The message to log
         * @returns {string} Formatted message
         */
        format(module, message) {
            return `${this.PREFIX} [${module}] ${message}`;
        },

        /**
         * Log a debug message.
         *
         * @param {string} module - The module name
         * @param {string} message - The message
         * @param {...*} args - Additional arguments
         */
        debug(module, message, ...args) {
            if (this.currentLevel <= this.LEVELS.DEBUG) {
                console.debug(this.format(module, message), ...args);
            }
        },

        /**
         * Log an info message.
         *
         * @param {string} module - The module name
         * @param {string} message - The message
         * @param {...*} args - Additional arguments
         */
        info(module, message, ...args) {
            if (this.currentLevel <= this.LEVELS.INFO) {
                console.log(this.format(module, message), ...args);
            }
        },

        /**
         * Log a warning message.
         *
         * @param {string} module - The module name
         * @param {string} message - The message
         * @param {...*} args - Additional arguments
         */
        warn(module, message, ...args) {
            if (this.currentLevel <= this.LEVELS.WARN) {
                console.warn(this.format(module, message), ...args);
            }
        },

        /**
         * Log an error message.
         *
         * @param {string} module - The module name
         * @param {string} message - The message
         * @param {Error} [error] - Optional error object
         * @param {...*} args - Additional arguments
         */
        error(module, message, error, ...args) {
            if (this.currentLevel <= this.LEVELS.ERROR) {
                if (error instanceof Error) {
                    console.error(this.format(module, message), error, ...args);
                } else {
                    console.error(this.format(module, message), error, ...args);
                }
            }
        },

        /**
         * Log an error with context and return a standardized error object.
         * Useful for consistent error handling in async functions.
         *
         * @param {string} module - The module name
         * @param {string} operation - What operation failed
         * @param {Error} error - The error object
         * @returns {{success: false, error: string, details: Error}} Standardized error response
         */
        handleError(module, operation, error) {
            this.error(module, `${operation} failed:`, error);
            return {
                success: false,
                error: `${operation} failed: ${error.message}`,
                details: error
            };
        },

        /**
         * Set log level at runtime.
         * Useful for enabling debug mode temporarily.
         *
         * @param {number|string} level - Log level (0-3 or 'DEBUG', 'INFO', 'WARN', 'ERROR')
         */
        setLevel(level) {
            if (typeof level === 'string') {
                level = this.LEVELS[level.toUpperCase()] ?? this.LEVELS.WARN;
            }
            this.currentLevel = level;
        },

        /**
         * Enable debug mode (shows all logs).
         */
        enableDebug() {
            this.currentLevel = this.LEVELS.DEBUG;
        },

        /**
         * Disable debug mode (shows only warnings and errors).
         */
        disableDebug() {
            this.currentLevel = this.LEVELS.WARN;
        }
    };

    // =========================================================================
    // CONVENIENCE LOGGING SHORTCUTS
    // =========================================================================

    /**
     * Shorthand for debug logging.
     * Usage: debug('Module', 'message', ...args)
     *
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    window.debug = function(module, message, ...args) {
        window.ClaudeWidthLogger.debug(module, message, ...args);
    };

    /**
     * Shorthand for info logging (respects DEBUG flag).
     * Usage: log('Module', 'message', ...args)
     *
     * @param {string} module - Module name
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    window.log = function(module, message, ...args) {
        window.ClaudeWidthLogger.info(module, message, ...args);
    };

})();
