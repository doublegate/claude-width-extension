/**
 * Claude Chat Width Customizer - Background Script
 * =================================================
 *
 * Handles keyboard shortcuts (browser.commands API), badge updates,
 * and communication between popup and content scripts.
 *
 * Features:
 * - Global keyboard shortcuts for width control
 * - Badge display showing current width percentage
 * - Tooltip updates based on active tab context
 * - Preset cycling and default toggle functionality
 *
 * @author DoubleGate
 * @version 1.6.0
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
     * Default width percentage.
     * @type {number}
     */
    const DEFAULT_WIDTH = 60;

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
     * Badge background color (Claude's terracotta).
     * @type {string}
     */
    const BADGE_COLOR = '#D97757';

    /**
     * Badge text color.
     * @type {string}
     */
    const BADGE_TEXT_COLOR = '#FFFFFF';

    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * Current width value.
     * @type {number}
     */
    let currentWidth = DEFAULT_WIDTH;

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the background script.
     */
    async function initialize() {
        console.log('[Claude Width Background] Initializing v1.6.0...');

        // Load current width from storage
        await loadCurrentWidth();

        // Set up event listeners
        browser.commands.onCommand.addListener(handleCommand);
        browser.storage.onChanged.addListener(handleStorageChange);
        browser.tabs.onActivated.addListener(handleTabActivated);
        browser.tabs.onUpdated.addListener(handleTabUpdated);

        // Update badge for current tab
        updateBadgeForActiveTab();

        console.log('[Claude Width Background] Initialized successfully');
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
     * Toggle between current width and default (60%).
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
     * Load current width from storage.
     */
    async function loadCurrentWidth() {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const stored = result[STORAGE_KEY];

            if (typeof stored === 'number' && stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
                currentWidth = stored;
            } else {
                currentWidth = DEFAULT_WIDTH;
            }
        } catch (error) {
            console.error('[Claude Width Background] Error loading width:', error);
            currentWidth = DEFAULT_WIDTH;
        }
    }

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
    function handleStorageChange(changes, areaName) {
        if (areaName !== 'local') return;

        if (changes[STORAGE_KEY]) {
            const newWidth = changes[STORAGE_KEY].newValue;
            if (typeof newWidth === 'number') {
                currentWidth = newWidth;
                updateBadgeForActiveTab();
            }
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

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    });

    // =========================================================================
    // ENTRY POINT
    // =========================================================================

    initialize();

})();
