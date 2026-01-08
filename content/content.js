/**
 * Claude Chat Width Customizer - Content Script
 * ==============================================
 *
 * VERSION 1.8.0 - Enhanced Styling
 *
 * Injected into claude.ai pages to apply width customizations to the chat area.
 * Works with the background script to handle keyboard shortcuts for preset
 * cycling and default toggling.
 *
 * Changes from 1.7.0:
 * - Updated version to 1.8.0
 * - Changed default width from 70% to 85%
 * - Added typography controls (font size, line height, message padding)
 * - Added display modes (compact, comfortable, spacious, custom)
 * - Added code block enhancements (max-height, word wrap, collapse all)
 * - Added visual tweaks (timestamps, avatars, bubble style)
 *
 * @author DoubleGate
 * @version 1.8.0
 * @license MIT
 */

(function() {
    'use strict';

    // =========================================================================
    // SHARED CONSTANTS (from lib/constants.js)
    // =========================================================================

    const {
        DEFAULT_WIDTH,
        MIN_WIDTH,
        MAX_WIDTH,
        PRESET_CYCLE,
        STORAGE_KEY,
        ENHANCED_KEYS,
        ENHANCED_DEFAULTS,
        DISPLAY_MODE_PRESETS,
        TIMING
    } = window.ClaudeWidthConstants;

    // Aliases for backward compatibility within this file
    const DEFAULT_WIDTH_PERCENT = DEFAULT_WIDTH;
    const MIN_WIDTH_PERCENT = MIN_WIDTH;
    const MAX_WIDTH_PERCENT = MAX_WIDTH;

    // =========================================================================
    // LOCAL CONSTANTS (specific to content script)
    // =========================================================================

    const STYLE_ELEMENT_ID = 'claude-width-customizer-styles';
    const ENHANCED_STYLE_ID = 'claude-enhanced-styles';
    const DATA_ATTR = 'data-claude-width-applied';

    /**
     * Line height values mapping.
     */
    const LINE_HEIGHT_VALUES = {
        'compact': 1.2,
        'normal': 1.5,
        'relaxed': 1.8
    };

    /**
     * Message padding values in pixels.
     */
    const MESSAGE_PADDING_VALUES = {
        'none': 0,
        'small': 8,
        'medium': 16,
        'large': 24
    };

    // Selectors that indicate an element is part of the sidebar
    const SIDEBAR_INDICATORS = [
        'nav',
        'aside',
        '[role="navigation"]',
        '[data-testid="sidebar"]',
        '[data-testid="side-nav"]',
        '[data-testid="history-panel"]',
        '[aria-label*="sidebar" i]',
        '[aria-label*="navigation" i]',
        '[aria-label*="history" i]',
        '[aria-label*="menu" i]',
        '[class*="Sidebar"]',
        '[class*="sidebar"]',
        '[class*="SideNav"]',
        '[class*="sidenav"]',
        '[class*="side-nav"]',
        '[class*="LeftPanel"]',
        '[class*="left-panel"]',
        '[class*="NavPanel"]',
        '[class*="nav-panel"]',
        '[class*="NavigationMenu"]',
        '[class*="navigation-menu"]',
        '[class*="HistoryPanel"]',
        '[class*="history-panel"]',
        '[class*="ConversationList"]',
        '[class*="conversation-list"]'
    ];

    // =========================================================================
    // STATE
    // =========================================================================

    let currentWidth = DEFAULT_WIDTH_PERCENT;
    let domObserver = null;
    let applyDebounceTimer = null;
    let styledElements = new Set();

    // Enhanced styling state (v1.8.0)
    let enhancedSettings = { ...ENHANCED_DEFAULTS };

    // =========================================================================
    // HELPER FUNCTIONS
    // =========================================================================

    /**
     * Check if an element is inside the sidebar.
     * Walks up the DOM tree checking for sidebar indicators.
     *
     * @param {Element} element - The element to check
     * @returns {boolean} True if element is inside sidebar
     */
    function isInsideSidebar(element) {
        let current = element;

        while (current && current !== document.body && current !== document.documentElement) {
            for (const selector of SIDEBAR_INDICATORS) {
                try {
                    if (current.matches && current.matches(selector)) {
                        return true;
                    }
                } catch (e) {
                    // Invalid selector, skip
                }
            }
            current = current.parentElement;
        }

        return false;
    }

    /**
     * Clear all previously applied styles.
     */
    function clearAllStyles() {
        styledElements.forEach(el => {
            if (el && el.style) {
                el.style.maxWidth = '';
                el.style.width = '';
                el.style.marginLeft = '';
                el.style.marginRight = '';
                el.removeAttribute(DATA_ATTR);
            }
        });
        styledElements.clear();
    }

    // =========================================================================
    // ENHANCED STYLING FUNCTIONS (v1.8.0)
    // =========================================================================

    /**
     * Generate CSS for enhanced styling features.
     * @returns {string} CSS string
     */
    function generateEnhancedCSS() {
        const settings = enhancedSettings;
        const fontSize = settings[ENHANCED_KEYS.FONT_SIZE];
        const lineHeight = LINE_HEIGHT_VALUES[settings[ENHANCED_KEYS.LINE_HEIGHT]] || 1.5;
        const messagePadding = MESSAGE_PADDING_VALUES[settings[ENHANCED_KEYS.MESSAGE_PADDING]] || 16;
        const codeBlockHeight = settings[ENHANCED_KEYS.CODE_BLOCK_HEIGHT];
        const codeBlockWrap = settings[ENHANCED_KEYS.CODE_BLOCK_WRAP];
        const showTimestamps = settings[ENHANCED_KEYS.SHOW_TIMESTAMPS];
        const showAvatars = settings[ENHANCED_KEYS.SHOW_AVATARS];
        const bubbleStyle = settings[ENHANCED_KEYS.BUBBLE_STYLE];

        let css = `
            /* Claude Width Customizer - Enhanced Styling v1.8.0 */

            /* Typography Controls */
            [class*="Message"] p,
            [class*="message"] p,
            .prose p,
            [class*="prose"] p {
                font-size: ${fontSize}% !important;
                line-height: ${lineHeight} !important;
            }

            /* Message Padding */
            [class*="Message"],
            [class*="message"] {
                padding: ${messagePadding}px !important;
            }
        `;

        // Code Block Max Height
        if (codeBlockHeight > 0) {
            css += `
                pre, [class*="CodeBlock"], [class*="code-block"] {
                    max-height: ${codeBlockHeight}px !important;
                    overflow-y: auto !important;
                }
            `;
        } else {
            css += `
                pre, [class*="CodeBlock"], [class*="code-block"] {
                    max-height: none !important;
                }
            `;
        }

        // Code Block Word Wrap
        if (codeBlockWrap) {
            css += `
                pre, pre code, [class*="CodeBlock"] code {
                    white-space: pre-wrap !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
            `;
        }

        // Hide Timestamps
        if (!showTimestamps) {
            css += `
                [class*="timestamp" i],
                [class*="time" i]:not([class*="runtime"]):not([class*="realtime"]),
                time,
                [datetime] {
                    display: none !important;
                }
            `;
        }

        // Hide Avatars
        if (!showAvatars) {
            css += `
                [class*="avatar" i],
                [class*="Avatar" i],
                [class*="profile-pic" i],
                [class*="user-icon" i] {
                    display: none !important;
                }
            `;
        }

        // Message Bubble Styles
        if (bubbleStyle === 'square') {
            css += `
                [class*="Message"],
                [class*="message"] {
                    border-radius: 0 !important;
                }
            `;
        } else if (bubbleStyle === 'minimal') {
            css += `
                [class*="Message"],
                [class*="message"] {
                    border-radius: 0 !important;
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                }
            `;
        }
        // 'rounded' is the default, no extra CSS needed

        // Reduced motion support
        css += `
            @media (prefers-reduced-motion: reduce) {
                [class*="Message"],
                [class*="message"],
                pre, [class*="CodeBlock"] {
                    transition: none !important;
                }
            }
        `;

        return css;
    }

    /**
     * Inject or update enhanced styling CSS.
     */
    function injectEnhancedCSS() {
        let styleElement = document.getElementById(ENHANCED_STYLE_ID);
        const css = generateEnhancedCSS();

        if (styleElement) {
            styleElement.textContent = css;
        } else {
            styleElement = document.createElement('style');
            styleElement.id = ENHANCED_STYLE_ID;
            styleElement.type = 'text/css';
            styleElement.textContent = css;

            const head = document.head || document.getElementsByTagName('head')[0];
            if (head) {
                head.appendChild(styleElement);
            }
        }

        console.log('[Claude Width] Enhanced CSS injected/updated');
    }

    /**
     * Load enhanced styling settings from storage.
     */
    async function loadEnhancedSettings() {
        try {
            const keys = Object.values(ENHANCED_KEYS);
            const result = await browser.storage.local.get(keys);

            // Merge with defaults
            for (const key of keys) {
                if (result[key] !== undefined) {
                    enhancedSettings[key] = result[key];
                }
            }

            console.log('[Claude Width] Enhanced settings loaded:', enhancedSettings);
        } catch (error) {
            console.error('[Claude Width] Error loading enhanced settings:', error);
        }
    }

    /**
     * Handle enhanced settings changes.
     * @param {Object} changes - Storage changes
     */
    function handleEnhancedSettingsChange(changes) {
        let needsUpdate = false;

        for (const key of Object.values(ENHANCED_KEYS)) {
            if (changes[key]) {
                enhancedSettings[key] = changes[key].newValue;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            // Apply display mode preset if changed
            if (changes[ENHANCED_KEYS.DISPLAY_MODE]) {
                const mode = changes[ENHANCED_KEYS.DISPLAY_MODE].newValue;
                if (mode !== 'custom' && DISPLAY_MODE_PRESETS[mode]) {
                    const preset = DISPLAY_MODE_PRESETS[mode];
                    enhancedSettings[ENHANCED_KEYS.LINE_HEIGHT] = preset.lineHeight;
                    enhancedSettings[ENHANCED_KEYS.MESSAGE_PADDING] = preset.messagePadding;
                    enhancedSettings[ENHANCED_KEYS.FONT_SIZE] = preset.fontSize;
                }
            }

            // Handle code blocks collapsed state
            if (changes[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED]) {
                const collapsed = changes[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED].newValue;
                toggleAllCodeBlocks(collapsed);
            }

            injectEnhancedCSS();
            console.log('[Claude Width] Enhanced settings updated');
        }
    }

    /**
     * Toggle collapse state of all code blocks.
     * @param {boolean} collapse - Whether to collapse
     */
    function toggleAllCodeBlocks(collapse) {
        const codeBlocks = document.querySelectorAll('pre, [class*="CodeBlock"], [class*="code-block"]');

        codeBlocks.forEach(block => {
            if (isInsideSidebar(block)) return;

            if (collapse) {
                block.style.maxHeight = '100px';
                block.style.overflow = 'hidden';
                block.setAttribute('data-claude-collapsed', 'true');

                // Add expand button if not exists
                if (!block.querySelector('.claude-expand-btn')) {
                    addExpandButton(block);
                }
            } else {
                block.style.maxHeight = '';
                block.style.overflow = '';
                block.removeAttribute('data-claude-collapsed');

                // Remove expand button
                const btn = block.querySelector('.claude-expand-btn');
                if (btn) btn.remove();
            }
        });
    }

    /**
     * Add expand/collapse button to a code block.
     * @param {Element} block - The code block element
     */
    function addExpandButton(block) {
        const btn = document.createElement('button');
        btn.className = 'claude-expand-btn';
        btn.textContent = 'Expand';
        btn.style.cssText = `
            position: absolute;
            bottom: 4px;
            right: 4px;
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            z-index: 10;
        `;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = block.getAttribute('data-claude-collapsed') === 'true';

            if (isCollapsed) {
                block.style.maxHeight = '';
                block.style.overflow = '';
                block.removeAttribute('data-claude-collapsed');
                btn.textContent = 'Collapse';
            } else {
                block.style.maxHeight = '100px';
                block.style.overflow = 'hidden';
                block.setAttribute('data-claude-collapsed', 'true');
                btn.textContent = 'Expand';
            }
        });

        // Ensure code block is positioned for absolute child
        if (getComputedStyle(block).position === 'static') {
            block.style.position = 'relative';
        }

        block.appendChild(btn);
    }

    /**
     * Reset all enhanced styling to defaults.
     */
    async function resetEnhancedStyles() {
        try {
            await browser.storage.local.set(ENHANCED_DEFAULTS);
            enhancedSettings = { ...ENHANCED_DEFAULTS };
            injectEnhancedCSS();
            toggleAllCodeBlocks(false);
            console.log('[Claude Width] Enhanced styles reset to defaults');
        } catch (error) {
            console.error('[Claude Width] Error resetting enhanced styles:', error);
        }
    }

    /**
     * Apply width style to an element (only max-width for most elements).
     *
     * @param {Element} element - Element to style
     * @param {number} widthPercent - Width percentage
     * @param {boolean} setWidth - Also set width property (for containers)
     */
    function styleElement(element, widthPercent, setWidth = false) {
        if (!element || !element.style) return;
        if (isInsideSidebar(element)) return;

        element.style.maxWidth = `${widthPercent}%`;
        if (setWidth) {
            element.style.width = `${widthPercent}%`;
            element.style.marginLeft = 'auto';
            element.style.marginRight = 'auto';
        }
        element.setAttribute(DATA_ATTR, String(widthPercent));
        styledElements.add(element);
    }

    // =========================================================================
    // MAIN STYLING LOGIC
    // =========================================================================

    /**
     * Find and style all relevant elements in the chat area.
     *
     * @param {number} widthPercent - Width percentage to apply
     */
    function applyWidthToChat(widthPercent) {
        const clampedWidth = Math.max(MIN_WIDTH_PERCENT, Math.min(MAX_WIDTH_PERCENT, widthPercent));

        // Clear previous styles if width changed
        if (clampedWidth !== currentWidth) {
            clearAllStyles();
        }

        let elementCount = 0;

        // Strategy: Target elements that contain "mx-auto" which is Tailwind's
        // margin-auto centering class - these are the containers with max-width
        document.querySelectorAll('[class*="mx-auto"]').forEach(el => {
            if (!isInsideSidebar(el)) {
                styleElement(el, clampedWidth, true);
                elementCount++;
            }
        });

        // Target form elements (the composer/input area)
        document.querySelectorAll('form').forEach(el => {
            if (!isInsideSidebar(el)) {
                styleElement(el, clampedWidth, true);
                elementCount++;
            }
        });

        // Target elements with Composer in class name
        document.querySelectorAll('[class*="Composer"], [class*="composer"]').forEach(el => {
            if (!isInsideSidebar(el)) {
                styleElement(el, clampedWidth, true);
                elementCount++;
            }
        });

        // Target sticky footer containers (where input usually is)
        document.querySelectorAll('[class*="sticky"]').forEach(el => {
            if (!isInsideSidebar(el)) {
                // Style child divs of sticky elements
                el.querySelectorAll(':scope > div').forEach(child => {
                    if (!isInsideSidebar(child)) {
                        styleElement(child, clampedWidth, true);
                        elementCount++;
                    }
                });
            }
        });

        // Target message containers - just max-width, not full width
        document.querySelectorAll('[class*="Message"], [class*="message"]').forEach(el => {
            if (!isInsideSidebar(el)) {
                styleElement(el, clampedWidth, false);
                elementCount++;
            }
        });

        // Target thread/conversation containers
        document.querySelectorAll('[class*="Thread"], [class*="thread"], [class*="Conversation"], [class*="conversation"]').forEach(el => {
            if (!isInsideSidebar(el)) {
                styleElement(el, clampedWidth, false);
                elementCount++;
            }
        });

        // Target prose/markdown content - let it fill container
        document.querySelectorAll('.prose, [class*="prose"], [class*="Markdown"], [class*="markdown"]').forEach(el => {
            if (!isInsideSidebar(el) && el.style) {
                el.style.maxWidth = '100%';
                styledElements.add(el);
            }
        });

        // Target code blocks - let them expand
        document.querySelectorAll('pre, [class*="CodeBlock"], [class*="code-block"]').forEach(el => {
            if (!isInsideSidebar(el) && el.style) {
                el.style.maxWidth = '100%';
                el.style.overflowX = 'auto';
                styledElements.add(el);
            }
        });

        currentWidth = clampedWidth;
        console.log(`[Claude Width] Applied ${clampedWidth}% width to ${elementCount} elements`);
    }

    /**
     * Debounced version of applyWidthToChat to prevent excessive calls.
     *
     * @param {number} widthPercent - Width percentage to apply
     */
    function applyWidthDebounced(widthPercent) {
        if (applyDebounceTimer) {
            clearTimeout(applyDebounceTimer);
        }

        applyDebounceTimer = setTimeout(() => {
            applyWidthToChat(widthPercent);
        }, TIMING.DEBOUNCE_MS);
    }

    // =========================================================================
    // PRESET CYCLING
    // =========================================================================

    /**
     * Cycle to the next width preset.
     *
     * @returns {number} The new width value
     */
    function cycleToNextPreset() {
        // Find current position in cycle
        const currentIndex = PRESET_CYCLE.indexOf(currentWidth);

        // Get next preset (wrap around)
        let nextIndex;
        if (currentIndex === -1) {
            // Current width not in presets, find nearest higher
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
        clearAllStyles();
        applyWidthToChat(newWidth);

        // Save to storage
        browser.storage.local.set({ [STORAGE_KEY]: newWidth });

        console.log(`[Claude Width] Cycled to preset: ${newWidth}%`);
        return newWidth;
    }

    /**
     * Toggle between current width and default.
     *
     * @returns {number} The new width value
     */
    async function toggleDefault() {
        const LAST_WIDTH_KEY = 'lastNonDefaultWidth';

        if (currentWidth === DEFAULT_WIDTH_PERCENT) {
            // Restore last non-default width
            const result = await browser.storage.local.get(LAST_WIDTH_KEY);
            const lastWidth = result[LAST_WIDTH_KEY];

            if (typeof lastWidth === 'number' && lastWidth !== DEFAULT_WIDTH_PERCENT) {
                clearAllStyles();
                applyWidthToChat(lastWidth);
                await browser.storage.local.set({ [STORAGE_KEY]: lastWidth });
                console.log(`[Claude Width] Toggled to last width: ${lastWidth}%`);
                return lastWidth;
            }
        } else {
            // Save current as last non-default, then set to default
            await browser.storage.local.set({ [LAST_WIDTH_KEY]: currentWidth });
            clearAllStyles();
            applyWidthToChat(DEFAULT_WIDTH_PERCENT);
            await browser.storage.local.set({ [STORAGE_KEY]: DEFAULT_WIDTH_PERCENT });
            console.log(`[Claude Width] Toggled to default: ${DEFAULT_WIDTH_PERCENT}%`);
            return DEFAULT_WIDTH_PERCENT;
        }

        return currentWidth;
    }

    // =========================================================================
    // MINIMAL CSS INJECTION
    // =========================================================================

    /**
     * Inject minimal CSS for transitions and child element handling.
     */
    function injectMinimalCSS() {
        let styleElement = document.getElementById(STYLE_ELEMENT_ID);

        const css = `
            /*
             * Claude Chat Width Customizer - Minimal CSS v1.8.0
             */

            /* Smooth transitions for styled elements */
            [${DATA_ATTR}] {
                transition: max-width 0.2s ease-out, width 0.2s ease-out !important;
            }

            /* Respect reduced motion preference */
            @media (prefers-reduced-motion: reduce) {
                [${DATA_ATTR}] {
                    transition: none !important;
                }
            }

            /* Allow prose to fill container */
            [${DATA_ATTR}] .prose,
            [${DATA_ATTR}] [class*="prose"] {
                max-width: 100% !important;
            }

            /* Textarea should fill container */
            [${DATA_ATTR}] textarea,
            [${DATA_ATTR}] [contenteditable="true"] {
                max-width: 100% !important;
                width: 100% !important;
            }

            /* Code blocks expand */
            [${DATA_ATTR}] pre {
                max-width: 100% !important;
                overflow-x: auto !important;
            }
        `;

        if (styleElement) {
            styleElement.textContent = css;
        } else {
            styleElement = document.createElement('style');
            styleElement.id = STYLE_ELEMENT_ID;
            styleElement.type = 'text/css';
            styleElement.textContent = css;

            const head = document.head || document.getElementsByTagName('head')[0];
            if (head) {
                head.appendChild(styleElement);
            }
        }
    }

    // =========================================================================
    // STORAGE HANDLING
    // =========================================================================

    async function loadWidthPreference() {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const savedWidth = result[STORAGE_KEY];

            if (typeof savedWidth === 'number' && savedWidth >= MIN_WIDTH_PERCENT && savedWidth <= MAX_WIDTH_PERCENT) {
                console.log(`[Claude Width] Loaded preference: ${savedWidth}%`);
                return savedWidth;
            }

            console.log(`[Claude Width] No valid preference, using default: ${DEFAULT_WIDTH_PERCENT}%`);
            return DEFAULT_WIDTH_PERCENT;
        } catch (error) {
            console.error('[Claude Width] Error loading preference:', error);
            return DEFAULT_WIDTH_PERCENT;
        }
    }

    function handleStorageChange(changes, areaName) {
        if (areaName !== 'local') return;

        // Handle width changes
        if (changes[STORAGE_KEY]) {
            const newWidth = changes[STORAGE_KEY].newValue;

            if (typeof newWidth === 'number') {
                console.log(`[Claude Width] Storage changed to: ${newWidth}%`);
                // Force clear and reapply
                clearAllStyles();
                applyWidthToChat(newWidth);
            }
        }

        // Handle enhanced styling changes (v1.8.0)
        handleEnhancedSettingsChange(changes);
    }

    // =========================================================================
    // DOM OBSERVATION
    // =========================================================================

    function setupDOMObserver() {
        if (domObserver) {
            domObserver.disconnect();
        }

        domObserver = new MutationObserver((mutations) => {
            let needsUpdate = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new element might need styling
                            const isRelevant = node.matches && (
                                node.matches('[class*="mx-auto"]') ||
                                node.matches('[class*="Message"]') ||
                                node.matches('[class*="Composer"]') ||
                                node.matches('form')
                            );

                            const hasRelevantChild = node.querySelector && (
                                node.querySelector('[class*="mx-auto"]') ||
                                node.querySelector('[class*="Message"]') ||
                                node.querySelector('[class*="Composer"]') ||
                                node.querySelector('form')
                            );

                            if (isRelevant || hasRelevantChild) {
                                needsUpdate = true;
                                break;
                            }
                        }
                    }
                }
                if (needsUpdate) break;
            }

            if (needsUpdate) {
                applyWidthDebounced(currentWidth);
            }

            // Ensure our style element exists
            if (!document.getElementById(STYLE_ELEMENT_ID)) {
                injectMinimalCSS();
            }
        });

        domObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        console.log('[Claude Width] DOM observer initialized');
    }

    // =========================================================================
    // MESSAGE HANDLING
    // =========================================================================

    function handleMessage(message, _sender, sendResponse) {
        switch (message.action) {
            case 'updateWidth':
                if (typeof message.width === 'number') {
                    console.log(`[Claude Width] Received updateWidth: ${message.width}%`);
                    clearAllStyles();
                    applyWidthToChat(message.width);
                    sendResponse({ success: true, currentWidth: currentWidth });
                } else {
                    sendResponse({ success: false, error: 'Invalid width value' });
                }
                break;

            case 'getStatus':
                sendResponse({
                    success: true,
                    currentWidth: currentWidth,
                    styledElementCount: styledElements.size,
                    enhancedSettings: enhancedSettings
                });
                break;

            case 'resetToDefault':
                clearAllStyles();
                applyWidthToChat(DEFAULT_WIDTH_PERCENT);
                sendResponse({ success: true, currentWidth: DEFAULT_WIDTH_PERCENT });
                break;

            case 'cyclePresets':
                const newWidth = cycleToNextPreset();
                sendResponse({ success: true, currentWidth: newWidth });
                break;

            case 'toggleDefault':
                toggleDefault().then(width => {
                    sendResponse({ success: true, currentWidth: width });
                });
                return true; // Async response

            // Enhanced styling actions (v1.8.0)
            case 'resetEnhancedStyles':
                resetEnhancedStyles().then(() => {
                    sendResponse({ success: true });
                });
                return true; // Async response

            case 'toggleCodeBlocks':
                const collapse = message.collapse !== undefined ? message.collapse : !enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED];
                toggleAllCodeBlocks(collapse);
                sendResponse({ success: true, collapsed: collapse });
                break;

            case 'getEnhancedSettings':
                sendResponse({
                    success: true,
                    settings: enhancedSettings
                });
                break;

            case 'refreshEnhancedStyles':
                injectEnhancedCSS();
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }

        return true;
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async function initialize() {
        console.log('[Claude Width] Initializing content script v1.8.0...');

        try {
            // Load saved width preference
            const savedWidth = await loadWidthPreference();
            currentWidth = savedWidth;

            // Load enhanced styling settings (v1.8.0)
            await loadEnhancedSettings();

            // Inject minimal CSS for width
            injectMinimalCSS();

            // Inject enhanced styling CSS (v1.8.0)
            injectEnhancedCSS();

            // Apply initial styles with delays to catch lazy-loaded content
            TIMING.INIT_RETRY_INTERVALS.forEach((delay, index) => {
                setTimeout(() => applyWidthToChat(index === 0 ? savedWidth : currentWidth), delay);
            });

            // Apply collapsed code blocks if enabled
            if (enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED]) {
                setTimeout(() => toggleAllCodeBlocks(true), 1500);
            }

            // Set up listeners
            browser.storage.onChanged.addListener(handleStorageChange);
            browser.runtime.onMessage.addListener(handleMessage);
            setupDOMObserver();

            console.log('[Claude Width] Content script initialized successfully');
        } catch (error) {
            console.error('[Claude Width] Initialization error:', error);
        }
    }

    // =========================================================================
    // ENTRY POINT
    // =========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
