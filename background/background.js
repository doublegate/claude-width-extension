/**
 * Claude Chat Width Customizer - Background Script
 * =================================================
 *
 * VERSION 1.7.0 - Custom Presets
 *
 * Handles keyboard shortcuts (browser.commands API), badge updates,
 * context menu management, and communication between popup and content scripts.
 *
 * Features:
 * - Global keyboard shortcuts for width control
 * - Badge display showing current width percentage
 * - Tooltip updates based on active tab context
 * - Preset cycling and default toggle functionality
 * - Context menu for quick preset access on claude.ai
 * - Recent widths tracking
 * - Custom presets support
 *
 * Changes from 1.6.0:
 * - Changed default width from 60% to 70%
 * - Added context menu support for quick preset access
 * - Added recent widths tracking
 * - Added migration for existing users
 * - Added custom presets support
 *
 * @author DoubleGate
 * @version 1.7.0
 * @license MIT
 */

(function() {
    'use strict';

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    /**
     * Storage key for width preference.
     * @type {string}
     */
    const STORAGE_KEY = 'chatWidthPercent';

    /**
     * Storage key for last non-default width (for toggle feature).
     * @type {string}
     */
    const LAST_WIDTH_KEY = 'lastNonDefaultWidth';

    /**
     * Storage key for custom presets.
     * @type {string}
     */
    const CUSTOM_PRESETS_KEY = 'customPresets';

    /**
     * Storage key for hidden built-in presets.
     * @type {string}
     */
    const HIDDEN_PRESETS_KEY = 'hiddenBuiltInPresets';

    /**
     * Storage key for recent widths.
     * @type {string}
     */
    const RECENT_WIDTHS_KEY = 'recentWidths';

    /**
     * Storage key for migration version.
     * @type {string}
     */
    const MIGRATION_VERSION_KEY = 'migrationVersion';

    /**
     * Current migration version.
     * @type {number}
     */
    const CURRENT_MIGRATION_VERSION = 1;

    /**
     * Default width percentage.
     * @type {number}
     */
    const DEFAULT_WIDTH = 70;

    /**
     * Minimum allowed width.
     * @type {number}
     */
    const MIN_WIDTH = 40;

    /**
     * Maximum allowed width.
     * @type {number}
     */
    const MAX_WIDTH = 100;

    /**
     * Width presets for cycling (in order).
     * @type {number[]}
     */
    const PRESET_CYCLE = [50, 70, 85, 100];

    /**
     * Built-in presets configuration.
     * @type {Array<{id: string, name: string, width: number, builtIn: boolean}>}
     */
    const BUILT_IN_PRESETS = [
        { id: 'narrow', name: 'Narrow', width: 50, builtIn: true },
        { id: 'medium', name: 'Medium', width: 70, builtIn: true },
        { id: 'wide', name: 'Wide', width: 85, builtIn: true },
        { id: 'full', name: 'Full', width: 100, builtIn: true }
    ];

    /**
     * Maximum number of custom presets allowed.
     * @type {number}
     */
    const MAX_CUSTOM_PRESETS = 4;

    /**
     * Maximum number of recent widths to track.
     * @type {number}
     */
    const MAX_RECENT_WIDTHS = 3;

    /**
     * Badge background color (Claude's terracotta).
     * @type {string}
     */
    const BADGE_COLOR = '#D97757';

    /**
     * Badge text color.
     * @type {string}
     */
    const BADGE_TEXT_COLOR = '#FFFFFF';

    /**
     * Context menu IDs.
     * @type {Object}
     */
    const MENU_IDS = {
        PARENT: 'claude-width-menu',
        SEPARATOR_1: 'claude-width-sep-1',
        SEPARATOR_2: 'claude-width-sep-2',
        DEFAULT: 'claude-width-default',
        RECENT_PARENT: 'claude-width-recent'
    };

    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * Current width value.
     * @type {number}
     */
    let currentWidth = DEFAULT_WIDTH;

    /**
     * Custom presets array.
     * @type {Array<{id: string, name: string, width: number, order: number, favorite: boolean}>}
     */
    let customPresets = [];

    /**
     * Hidden built-in preset IDs.
     * @type {string[]}
     */
    let hiddenBuiltInPresets = [];

    /**
     * Recent widths array.
     * @type {number[]}
     */
    let recentWidths = [];

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the background script.
     */
    async function initialize() {
        console.log('[Claude Width Background] Initializing v1.7.0...');

        // Run migrations for existing users
        await runMigrations();

        // Load current state from storage
        await loadState();

        // Create context menu
        await createContextMenu();

        // Set up event listeners
        browser.commands.onCommand.addListener(handleCommand);
        browser.storage.onChanged.addListener(handleStorageChange);
        browser.tabs.onActivated.addListener(handleTabActivated);
        browser.tabs.onUpdated.addListener(handleTabUpdated);
        browser.contextMenus.onClicked.addListener(handleContextMenuClick);

        // Update badge for current tab
        updateBadgeForActiveTab();

        console.log('[Claude Width Background] Initialized successfully');
    }

    // =========================================================================
    // MIGRATIONS
    // =========================================================================

    /**
     * Run migrations for existing users upgrading from previous versions.
     */
    async function runMigrations() {
        try {
            const result = await browser.storage.local.get([MIGRATION_VERSION_KEY, STORAGE_KEY]);
            const currentMigrationVersion = result[MIGRATION_VERSION_KEY] || 0;

            if (currentMigrationVersion < CURRENT_MIGRATION_VERSION) {
                console.log(`[Claude Width Background] Running migrations from v${currentMigrationVersion} to v${CURRENT_MIGRATION_VERSION}`);

                // Migration 1: Initialize new storage keys, preserve existing width
                if (currentMigrationVersion < 1) {
                    const existingWidth = result[STORAGE_KEY];

                    // Initialize new storage structure
                    const newData = {
                        [MIGRATION_VERSION_KEY]: CURRENT_MIGRATION_VERSION,
                        [CUSTOM_PRESETS_KEY]: [],
                        [HIDDEN_PRESETS_KEY]: [],
                        [RECENT_WIDTHS_KEY]: []
                    };

                    // Preserve existing width if valid, otherwise use new default
                    if (typeof existingWidth === 'number' && existingWidth >= MIN_WIDTH && existingWidth <= MAX_WIDTH) {
                        // Keep user's existing width - don't override it
                        console.log(`[Claude Width Background] Preserving existing width: ${existingWidth}%`);
                        // Add existing width to recent widths
                        newData[RECENT_WIDTHS_KEY] = [existingWidth];
                    } else {
                        // New user or invalid value - set new default
                        newData[STORAGE_KEY] = DEFAULT_WIDTH;
                        console.log(`[Claude Width Background] Setting new default width: ${DEFAULT_WIDTH}%`);
                    }

                    await browser.storage.local.set(newData);
                    console.log('[Claude Width Background] Migration 1 complete');
                }
            }
        } catch (error) {
            console.error('[Claude Width Background] Migration error:', error);
        }
    }

    /**
     * Load current state from storage.
     */
    async function loadState() {
        try {
            const result = await browser.storage.local.get([
                STORAGE_KEY,
                CUSTOM_PRESETS_KEY,
                HIDDEN_PRESETS_KEY,
                RECENT_WIDTHS_KEY
            ]);

            // Load current width
            const stored = result[STORAGE_KEY];
            if (typeof stored === 'number' && stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
                currentWidth = stored;
            } else {
                currentWidth = DEFAULT_WIDTH;
            }

            // Load custom presets
            if (Array.isArray(result[CUSTOM_PRESETS_KEY])) {
                customPresets = result[CUSTOM_PRESETS_KEY];
            }

            // Load hidden built-in presets
            if (Array.isArray(result[HIDDEN_PRESETS_KEY])) {
                hiddenBuiltInPresets = result[HIDDEN_PRESETS_KEY];
            }

            // Load recent widths
            if (Array.isArray(result[RECENT_WIDTHS_KEY])) {
                recentWidths = result[RECENT_WIDTHS_KEY];
            }

            console.log(`[Claude Width Background] State loaded: width=${currentWidth}%, customPresets=${customPresets.length}, recentWidths=${recentWidths.length}`);
        } catch (error) {
            console.error('[Claude Width Background] Error loading state:', error);
            currentWidth = DEFAULT_WIDTH;
            customPresets = [];
            hiddenBuiltInPresets = [];
            recentWidths = [];
        }
    }

    // =========================================================================
    // CONTEXT MENU
    // =========================================================================

    /**
     * Create the context menu structure.
     */
    async function createContextMenu() {
        try {
            // Remove existing menu items first
            await browser.contextMenus.removeAll();

            // Create parent menu
            browser.contextMenus.create({
                id: MENU_IDS.PARENT,
                title: 'Claude Width',
                contexts: ['page'],
                documentUrlPatterns: ['*://claude.ai/*']
            });

            // Add visible built-in presets
            for (const preset of BUILT_IN_PRESETS) {
                if (!hiddenBuiltInPresets.includes(preset.id)) {
                    browser.contextMenus.create({
                        id: `preset-${preset.id}`,
                        parentId: MENU_IDS.PARENT,
                        title: `${preset.name} (${preset.width}%)`,
                        contexts: ['page'],
                        documentUrlPatterns: ['*://claude.ai/*']
                    });
                }
            }

            // Add separator if we have custom presets
            if (customPresets.length > 0) {
                browser.contextMenus.create({
                    id: MENU_IDS.SEPARATOR_1,
                    parentId: MENU_IDS.PARENT,
                    type: 'separator',
                    contexts: ['page'],
                    documentUrlPatterns: ['*://claude.ai/*']
                });

                // Add custom presets sorted by order
                const sortedPresets = [...customPresets].sort((a, b) => a.order - b.order);
                for (const preset of sortedPresets) {
                    const star = preset.favorite ? ' *' : '';
                    browser.contextMenus.create({
                        id: `custom-${preset.id}`,
                        parentId: MENU_IDS.PARENT,
                        title: `${preset.name}${star} (${preset.width}%)`,
                        contexts: ['page'],
                        documentUrlPatterns: ['*://claude.ai/*']
                    });
                }
            }

            // Add separator before default
            browser.contextMenus.create({
                id: MENU_IDS.SEPARATOR_2,
                parentId: MENU_IDS.PARENT,
                type: 'separator',
                contexts: ['page'],
                documentUrlPatterns: ['*://claude.ai/*']
            });

            // Add default option
            browser.contextMenus.create({
                id: MENU_IDS.DEFAULT,
                parentId: MENU_IDS.PARENT,
                title: `Default (${DEFAULT_WIDTH}%)`,
                contexts: ['page'],
                documentUrlPatterns: ['*://claude.ai/*']
            });

            // Add recently used submenu if we have recent widths
            if (recentWidths.length > 0) {
                browser.contextMenus.create({
                    id: MENU_IDS.RECENT_PARENT,
                    parentId: MENU_IDS.PARENT,
                    title: 'Recently Used',
                    contexts: ['page'],
                    documentUrlPatterns: ['*://claude.ai/*']
                });

                for (let i = 0; i < recentWidths.length; i++) {
                    browser.contextMenus.create({
                        id: `recent-${i}`,
                        parentId: MENU_IDS.RECENT_PARENT,
                        title: `${recentWidths[i]}%`,
                        contexts: ['page'],
                        documentUrlPatterns: ['*://claude.ai/*']
                    });
                }
            }

            console.log('[Claude Width Background] Context menu created');
        } catch (error) {
            console.error('[Claude Width Background] Error creating context menu:', error);
        }
    }

    /**
     * Handle context menu clicks.
     *
     * @param {Object} info - Menu click info
     * @param {Object} tab - Tab info
     */
    async function handleContextMenuClick(info, tab) {
        const menuId = info.menuItemId;

        // Handle built-in presets
        if (menuId.startsWith('preset-')) {
            const presetId = menuId.replace('preset-', '');
            const preset = BUILT_IN_PRESETS.find(p => p.id === presetId);
            if (preset) {
                await setWidth(preset.width);
                await notifyTab(tab.id, preset.width);
            }
            return;
        }

        // Handle custom presets
        if (menuId.startsWith('custom-')) {
            const presetId = menuId.replace('custom-', '');
            const preset = customPresets.find(p => p.id === presetId);
            if (preset) {
                await setWidth(preset.width);
                await notifyTab(tab.id, preset.width);
            }
            return;
        }

        // Handle recent widths
        if (menuId.startsWith('recent-')) {
            const index = parseInt(menuId.replace('recent-', ''), 10);
            if (index >= 0 && index < recentWidths.length) {
                const width = recentWidths[index];
                await setWidth(width);
                await notifyTab(tab.id, width);
            }
            return;
        }

        // Handle default
        if (menuId === MENU_IDS.DEFAULT) {
            await setWidth(DEFAULT_WIDTH);
            await notifyTab(tab.id, DEFAULT_WIDTH);
            return;
        }
    }

    /**
     * Notify a specific tab of width change.
     *
     * @param {number} tabId - Tab ID
     * @param {number} width - New width value
     */
    async function notifyTab(tabId, width) {
        try {
            await browser.tabs.sendMessage(tabId, {
                action: 'updateWidth',
                width: width
            });
        } catch (error) {
            console.log('[Claude Width Background] Could not notify tab');
        }
    }

    // =========================================================================
    // RECENT WIDTHS TRACKING
    // =========================================================================

    /**
     * Add a width to the recent widths list.
     *
     * @param {number} width - Width to add
     */
    async function addToRecentWidths(width) {
        // Remove if already exists
        recentWidths = recentWidths.filter(w => w !== width);

        // Add to beginning
        recentWidths.unshift(width);

        // Trim to max length
        if (recentWidths.length > MAX_RECENT_WIDTHS) {
            recentWidths = recentWidths.slice(0, MAX_RECENT_WIDTHS);
        }

        // Save to storage
        try {
            await browser.storage.local.set({ [RECENT_WIDTHS_KEY]: recentWidths });
            // Rebuild context menu to reflect new recent widths
            await createContextMenu();
        } catch (error) {
            console.error('[Claude Width Background] Error saving recent widths:', error);
        }
    }

    // =========================================================================
    // COMMAND HANDLERS
    // =========================================================================

    /**
     * Handle keyboard command events.
     *
     * @param {string} command - The command name
     */
    async function handleCommand(command) {
        console.log(`[Claude Width Background] Command received: ${command}`);

        switch (command) {
            case 'cycle-presets':
                await cyclePresets();
                break;
            case 'toggle-default':
                await toggleDefault();
                break;
            // _execute_browser_action is handled automatically by Firefox
        }
    }

    /**
     * Cycle through width presets.
     * Order: 50 -> 70 -> 85 -> 100 -> 50...
     */
    async function cyclePresets() {
        // Find current position in cycle
        const currentIndex = PRESET_CYCLE.indexOf(currentWidth);

        // Get next preset (wrap around)
        let nextIndex;
        if (currentIndex === -1) {
            // Current width not in presets, find nearest
            nextIndex = 0;
            for (let i = 0; i < PRESET_CYCLE.length; i++) {
                if (PRESET_CYCLE[i] > currentWidth) {
                    nextIndex = i;
                    break;
                }
            }
        } else {
            nextIndex = (currentIndex + 1) % PRESET_CYCLE.length;
        }

        const newWidth = PRESET_CYCLE[nextIndex];
        await setWidth(newWidth);

        // Notify active claude.ai tab
        await notifyActiveClaudeTab(newWidth);
    }

    /**
     * Toggle between current width and default (70%).
     * If at default, restore last non-default width.
     */
    async function toggleDefault() {
        if (currentWidth === DEFAULT_WIDTH) {
            // Restore last non-default width
            const result = await browser.storage.local.get(LAST_WIDTH_KEY);
            const lastWidth = result[LAST_WIDTH_KEY];

            if (typeof lastWidth === 'number' && lastWidth !== DEFAULT_WIDTH) {
                await setWidth(lastWidth);
                await notifyActiveClaudeTab(lastWidth);
            }
        } else {
            // Save current as last non-default, then set to default
            await browser.storage.local.set({ [LAST_WIDTH_KEY]: currentWidth });
            await setWidth(DEFAULT_WIDTH);
            await notifyActiveClaudeTab(DEFAULT_WIDTH);
        }
    }

    // =========================================================================
    // WIDTH MANAGEMENT
    // =========================================================================

    /**
     * Set width and save to storage.
     *
     * @param {number} width - New width value
     */
    async function setWidth(width) {
        const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
        currentWidth = clampedWidth;

        try {
            await browser.storage.local.set({ [STORAGE_KEY]: clampedWidth });
            console.log(`[Claude Width Background] Width set to ${clampedWidth}%`);

            // Add to recent widths
            await addToRecentWidths(clampedWidth);
        } catch (error) {
            console.error('[Claude Width Background] Error saving width:', error);
        }
    }

    /**
     * Notify active Claude tab of width change.
     *
     * @param {number} width - New width value
     */
    async function notifyActiveClaudeTab(width) {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });

            if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes('claude.ai')) {
                await browser.tabs.sendMessage(tabs[0].id, {
                    action: 'updateWidth',
                    width: width
                });
            }
        } catch (error) {
            // Tab might not have content script loaded
            console.log('[Claude Width Background] Could not notify active tab');
        }
    }

    // =========================================================================
    // STORAGE CHANGE HANDLER
    // =========================================================================

    /**
     * Handle storage changes to keep state in sync.
     *
     * @param {Object} changes - Storage changes
     * @param {string} areaName - Storage area name
     */
    async function handleStorageChange(changes, areaName) {
        if (areaName !== 'local') return;

        let needsMenuRebuild = false;

        if (changes[STORAGE_KEY]) {
            const newWidth = changes[STORAGE_KEY].newValue;
            if (typeof newWidth === 'number') {
                currentWidth = newWidth;
                updateBadgeForActiveTab();
            }
        }

        if (changes[CUSTOM_PRESETS_KEY]) {
            customPresets = changes[CUSTOM_PRESETS_KEY].newValue || [];
            needsMenuRebuild = true;
        }

        if (changes[HIDDEN_PRESETS_KEY]) {
            hiddenBuiltInPresets = changes[HIDDEN_PRESETS_KEY].newValue || [];
            needsMenuRebuild = true;
        }

        if (changes[RECENT_WIDTHS_KEY]) {
            recentWidths = changes[RECENT_WIDTHS_KEY].newValue || [];
            needsMenuRebuild = true;
        }

        if (needsMenuRebuild) {
            await createContextMenu();
        }
    }

    // =========================================================================
    // BADGE MANAGEMENT
    // =========================================================================

    /**
     * Update badge for the currently active tab.
     */
    async function updateBadgeForActiveTab() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });

            if (tabs.length > 0) {
                await updateBadgeForTab(tabs[0]);
            }
        } catch (error) {
            console.error('[Claude Width Background] Error updating badge:', error);
        }
    }

    /**
     * Update badge for a specific tab.
     *
     * @param {Object} tab - Tab object
     */
    async function updateBadgeForTab(tab) {
        const isClaudeTab = tab.url && tab.url.includes('claude.ai');

        if (isClaudeTab) {
            // Show current width percentage
            await browser.browserAction.setBadgeText({
                text: String(currentWidth),
                tabId: tab.id
            });
            await browser.browserAction.setBadgeBackgroundColor({
                color: BADGE_COLOR,
                tabId: tab.id
            });
            await browser.browserAction.setBadgeTextColor({
                color: BADGE_TEXT_COLOR,
                tabId: tab.id
            });
            await browser.browserAction.setTitle({
                title: `Claude Width: ${currentWidth}%`,
                tabId: tab.id
            });
        } else {
            // Clear badge or show inactive state
            await browser.browserAction.setBadgeText({
                text: '',
                tabId: tab.id
            });
            await browser.browserAction.setTitle({
                title: 'Claude Width (not on claude.ai)',
                tabId: tab.id
            });
        }
    }

    /**
     * Handle tab activation.
     *
     * @param {Object} activeInfo - Tab activation info
     */
    async function handleTabActivated(activeInfo) {
        try {
            const tab = await browser.tabs.get(activeInfo.tabId);
            await updateBadgeForTab(tab);
        } catch (error) {
            // Tab might have been closed
            console.log('[Claude Width Background] Tab not found for badge update');
        }
    }

    /**
     * Handle tab URL updates.
     *
     * @param {number} tabId - Tab ID
     * @param {Object} changeInfo - Change information
     * @param {Object} tab - Tab object
     */
    async function handleTabUpdated(_tabId, changeInfo, tab) {
        // Only update badge when URL changes
        if (changeInfo.url || changeInfo.status === 'complete') {
            await updateBadgeForTab(tab);
        }
    }

    // =========================================================================
    // MESSAGE HANDLING (from popup or content scripts)
    // =========================================================================

    /**
     * Handle messages from other parts of the extension.
     *
     * @param {Object} message - Message object
     * @param {Object} sender - Sender information
     * @param {Function} sendResponse - Response callback
     */
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        switch (message.action) {
            case 'getWidth':
                sendResponse({ width: currentWidth });
                break;

            case 'getState':
                sendResponse({
                    width: currentWidth,
                    customPresets: customPresets,
                    hiddenBuiltInPresets: hiddenBuiltInPresets,
                    recentWidths: recentWidths,
                    builtInPresets: BUILT_IN_PRESETS,
                    defaultWidth: DEFAULT_WIDTH,
                    maxCustomPresets: MAX_CUSTOM_PRESETS
                });
                break;

            case 'cyclePresets':
                cyclePresets().then(() => {
                    sendResponse({ success: true, width: currentWidth });
                });
                return true; // Async response

            case 'toggleDefault':
                toggleDefault().then(() => {
                    sendResponse({ success: true, width: currentWidth });
                });
                return true; // Async response

            case 'updateBadge':
                updateBadgeForActiveTab().then(() => {
                    sendResponse({ success: true });
                });
                return true; // Async response

            case 'rebuildContextMenu':
                createContextMenu().then(() => {
                    sendResponse({ success: true });
                });
                return true; // Async response

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    });

    // =========================================================================
    // ENTRY POINT
    // =========================================================================

    initialize();

})();
