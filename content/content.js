/**
 * Claude Chat Width Customizer - Content Script
 * ==============================================
 *
 * VERSION 1.8.1 - Enhanced Styling Fix
 *
 * Injected into claude.ai pages to apply width customizations to the chat area.
 * Works with the background script to handle keyboard shortcuts for preset
 * cycling and default toggling.
 *
 * Changes from 1.8.0:
 * - Fixed real-time enhanced styling updates (applyEnhancedInlineStyles now called on setting changes)
 * - Added comprehensive DOM selectors for claude.ai's Tailwind CSS structure
 * - Added clearEnhancedInlineStyles for clean style re-application
 * - Added applyEnhancedInlineStylesDebounced for MutationObserver efficiency
 * - Enhanced MutationObserver to detect enhanced-styling-relevant elements
 *
 * @author DoubleGate
 * @version 1.8.1
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
     * Selectors for message content (text that needs typography styles).
     * These are the actual elements on claude.ai that contain text.
     */
    const MESSAGE_TEXT_SELECTORS = [
        // Prose content (Claude's main text container)
        '.prose',
        '.prose p',
        '.prose li',
        '.prose span',
        '.prose div',
        '[class*="prose"]',
        '[class*="prose"] p',
        '[class*="prose"] li',
        // Message containers
        '[class*="Message"]',
        '[class*="message"]',
        '[class*="MessageContent"]',
        '[class*="message-content"]',
        // Generic text containers in chat
        '[class*="ConversationMessage"]',
        '[class*="conversation-message"]',
        '[class*="ChatMessage"]',
        '[class*="chat-message"]',
        // Markdown rendered content
        '[class*="Markdown"]',
        '[class*="markdown"]',
        '[class*="MarkdownContent"]',
        // Response/human turn containers
        '[class*="ResponseContent"]',
        '[class*="HumanContent"]',
        '[class*="AssistantContent"]',
        '[class*="human-turn"]',
        '[class*="assistant-turn"]'
    ];

    /**
     * Selectors for message containers (elements that need padding/bubble styles).
     */
    const MESSAGE_CONTAINER_SELECTORS = [
        '[class*="Message"]:not([class*="MessageList"])',
        '[class*="message"]:not([class*="message-list"])',
        '[class*="ConversationMessage"]',
        '[class*="ChatMessage"]',
        '[class*="turn-"]',
        '[class*="Turn"]',
        '[data-testid*="message"]',
        '[data-testid*="turn"]'
    ];

    /**
     * Selectors for avatar elements.
     */
    const AVATAR_SELECTORS = [
        '[class*="avatar" i]',
        '[class*="Avatar"]',
        '[class*="profile-pic" i]',
        '[class*="user-icon" i]',
        '[class*="ProfileImage"]',
        '[class*="UserIcon"]',
        '[class*="ClaudeIcon"]',
        '[class*="HumanIcon"]',
        'img[alt*="avatar" i]',
        'img[alt*="profile" i]',
        '[data-testid*="avatar"]'
    ];

    /**
     * Selectors for timestamp elements.
     */
    const TIMESTAMP_SELECTORS = [
        '[class*="timestamp" i]',
        '[class*="Timestamp"]',
        'time',
        '[datetime]',
        '[class*="TimeAgo"]',
        '[class*="time-ago"]',
        '[class*="MessageTime"]',
        '[class*="message-time"]',
        '[data-testid*="timestamp"]',
        '[data-testid*="time"]'
    ];

    /**
     * Selectors for code blocks.
     */
    const CODE_BLOCK_SELECTORS = [
        'pre',
        'pre code',
        '[class*="CodeBlock"]',
        '[class*="code-block"]',
        '[class*="codeblock"]',
        '[class*="code-container"]',
        '[class*="CodeContainer"]',
        '[data-testid*="code-block"]'
    ];

    /**
     * Generate CSS for enhanced styling features.
     * Uses broad selectors with high specificity to override Claude's styles.
     * @returns {string} CSS string
     */
    function generateEnhancedCSS() {
        const settings = enhancedSettings;
        const fontSizePercent = settings.fontSizePercent || ENHANCED_DEFAULTS.fontSizePercent;
        const lineHeightValue = LINE_HEIGHT_VALUES[settings.lineHeight] || LINE_HEIGHT_VALUES.normal;
        const messagePaddingValue = MESSAGE_PADDING_VALUES[settings.messagePadding] || MESSAGE_PADDING_VALUES.medium;
        const codeBlockHeight = settings.codeBlockMaxHeight;
        const codeBlockWrap = settings.codeBlockWordWrap;
        const showTimestamps = settings.showTimestamps;
        const showAvatars = settings.showAvatars;
        const bubbleStyle = settings.messageBubbleStyle;

        // Build comprehensive selector strings
        const textSelectors = MESSAGE_TEXT_SELECTORS.join(',\n            ');
        const containerSelectors = MESSAGE_CONTAINER_SELECTORS.join(',\n            ');
        const avatarSelectors = AVATAR_SELECTORS.join(',\n            ');
        const timestampSelectors = TIMESTAMP_SELECTORS.join(',\n            ');
        const codeSelectors = CODE_BLOCK_SELECTORS.join(',\n            ');

        let css = `
            /* Claude Width Customizer - Enhanced Styling v1.8.0 */
            /* These styles use !important to override Claude's React-generated styles */

            /* ========================================
               TYPOGRAPHY CONTROLS
               ======================================== */

            /* Font size and line height for all text content */
            ${textSelectors} {
                font-size: ${fontSizePercent}% !important;
                line-height: ${lineHeightValue} !important;
            }

            /* Ensure paragraphs inherit the styles */
            .prose p,
            [class*="prose"] p,
            [class*="Message"] p,
            [class*="message"] p {
                font-size: inherit !important;
                line-height: inherit !important;
            }

            /* ========================================
               MESSAGE PADDING
               ======================================== */

            /* Apply padding to message containers */
            ${containerSelectors} {
                padding: ${messagePaddingValue}px !important;
            }

            /* ========================================
               CODE BLOCK STYLING
               ======================================== */

            /* Code block max height */
            ${codeSelectors} {
                ${codeBlockHeight > 0 ? `max-height: ${codeBlockHeight}px !important;` : 'max-height: none !important;'}
                overflow-y: ${codeBlockHeight > 0 ? 'auto' : 'visible'} !important;
            }

            /* Code block word wrap */
            ${codeBlockWrap ? `
            pre,
            pre code,
            [class*="CodeBlock"] code,
            [class*="code-block"] code {
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
            }
            ` : ''}

            /* ========================================
               TIMESTAMP VISIBILITY
               ======================================== */

            ${!showTimestamps ? `
            /* Hide timestamps */
            ${timestampSelectors} {
                display: none !important;
                visibility: hidden !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            ` : ''}

            /* ========================================
               AVATAR VISIBILITY
               ======================================== */

            ${!showAvatars ? `
            /* Hide avatars */
            ${avatarSelectors} {
                display: none !important;
                visibility: hidden !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
            }
            ` : ''}

            /* ========================================
               MESSAGE BUBBLE STYLES
               ======================================== */

            ${bubbleStyle === 'square' ? `
            /* Square bubble style */
            ${containerSelectors} {
                border-radius: 0 !important;
            }
            ` : ''}

            ${bubbleStyle === 'minimal' ? `
            /* Minimal bubble style - no background or borders */
            ${containerSelectors} {
                border-radius: 0 !important;
                background: transparent !important;
                background-color: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }
            ` : ''}

            /* ========================================
               ACCESSIBILITY
               ======================================== */

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                ${containerSelectors},
                ${codeSelectors} {
                    transition: none !important;
                    animation: none !important;
                }
            }

            /* ========================================
               MARKER FOR STYLED ELEMENTS
               ======================================== */

            /* Mark elements that have been styled by this extension */
            [data-claude-enhanced-applied] {
                /* This attribute marks elements we've styled inline */
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

        // Also apply inline styles to existing elements for maximum specificity
        applyEnhancedInlineStyles();

        console.log('[Claude Width] Enhanced CSS injected/updated');
    }

    /**
     * Apply enhanced styling via inline styles for maximum specificity.
     * This ensures styles override Claude's React-generated styles.
     */
    function applyEnhancedInlineStyles() {
        const settings = enhancedSettings;
        const fontSizePercent = settings.fontSizePercent || ENHANCED_DEFAULTS.fontSizePercent;
        const lineHeightValue = LINE_HEIGHT_VALUES[settings.lineHeight] || LINE_HEIGHT_VALUES.normal;
        const messagePaddingValue = MESSAGE_PADDING_VALUES[settings.messagePadding] || MESSAGE_PADDING_VALUES.medium;
        const codeBlockHeight = settings.codeBlockMaxHeight;
        const codeBlockWrap = settings.codeBlockWordWrap;
        const showAvatars = settings.showAvatars;
        const showTimestamps = settings.showTimestamps;
        const bubbleStyle = settings.messageBubbleStyle;

        let styledCount = 0;

        // Apply typography styles to text elements
        MESSAGE_TEXT_SELECTORS.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (isInsideSidebar(el)) return;
                    el.style.setProperty('font-size', `${fontSizePercent}%`, 'important');
                    el.style.setProperty('line-height', String(lineHeightValue), 'important');
                    el.setAttribute('data-claude-enhanced-applied', 'true');
                    styledCount++;
                });
            } catch (e) {
                // Selector might be invalid
            }
        });

        // Apply padding to message containers
        MESSAGE_CONTAINER_SELECTORS.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (isInsideSidebar(el)) return;
                    el.style.setProperty('padding', `${messagePaddingValue}px`, 'important');

                    // Apply bubble style
                    if (bubbleStyle === 'square') {
                        el.style.setProperty('border-radius', '0', 'important');
                    } else if (bubbleStyle === 'minimal') {
                        el.style.setProperty('border-radius', '0', 'important');
                        el.style.setProperty('background', 'transparent', 'important');
                        el.style.setProperty('border', 'none', 'important');
                        el.style.setProperty('box-shadow', 'none', 'important');
                    }

                    el.setAttribute('data-claude-enhanced-applied', 'true');
                    styledCount++;
                });
            } catch (e) {
                // Selector might be invalid
            }
        });

        // Apply code block styles
        CODE_BLOCK_SELECTORS.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (isInsideSidebar(el)) return;

                    // Max height
                    if (codeBlockHeight > 0) {
                        el.style.setProperty('max-height', `${codeBlockHeight}px`, 'important');
                        el.style.setProperty('overflow-y', 'auto', 'important');
                    } else {
                        el.style.setProperty('max-height', 'none', 'important');
                    }

                    // Word wrap
                    if (codeBlockWrap) {
                        el.style.setProperty('white-space', 'pre-wrap', 'important');
                        el.style.setProperty('word-wrap', 'break-word', 'important');
                        el.style.setProperty('overflow-wrap', 'break-word', 'important');
                    }

                    el.setAttribute('data-claude-enhanced-applied', 'true');
                    styledCount++;
                });
            } catch (e) {
                // Selector might be invalid
            }
        });

        // Handle avatar visibility
        if (!showAvatars) {
            AVATAR_SELECTORS.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (isInsideSidebar(el)) return;
                        el.style.setProperty('display', 'none', 'important');
                        el.setAttribute('data-claude-enhanced-applied', 'true');
                        styledCount++;
                    });
                } catch (e) {
                    // Selector might be invalid
                }
            });
        }

        // Handle timestamp visibility
        if (!showTimestamps) {
            TIMESTAMP_SELECTORS.forEach(selector => {
                try {
                    document.querySelectorAll(selector).forEach(el => {
                        if (isInsideSidebar(el)) return;
                        el.style.setProperty('display', 'none', 'important');
                        el.setAttribute('data-claude-enhanced-applied', 'true');
                        styledCount++;
                    });
                } catch (e) {
                    // Selector might be invalid
                }
            });
        }

        console.log(`[Claude Width] Applied enhanced inline styles to ${styledCount} elements`);
    }

    /**
     * Clear all enhanced inline styles.
     */
    function clearEnhancedInlineStyles() {
        document.querySelectorAll('[data-claude-enhanced-applied]').forEach(el => {
            // Remove style properties we set
            el.style.removeProperty('font-size');
            el.style.removeProperty('line-height');
            el.style.removeProperty('padding');
            el.style.removeProperty('border-radius');
            el.style.removeProperty('background');
            el.style.removeProperty('border');
            el.style.removeProperty('box-shadow');
            el.style.removeProperty('max-height');
            el.style.removeProperty('overflow-y');
            el.style.removeProperty('white-space');
            el.style.removeProperty('word-wrap');
            el.style.removeProperty('overflow-wrap');
            el.style.removeProperty('display');
            el.removeAttribute('data-claude-enhanced-applied');
        });
    }

    /**
     * Debounced version of applyEnhancedInlineStyles.
     */
    let enhancedStyleDebounceTimer = null;
    function applyEnhancedInlineStylesDebounced() {
        if (enhancedStyleDebounceTimer) {
            clearTimeout(enhancedStyleDebounceTimer);
        }
        enhancedStyleDebounceTimer = setTimeout(() => {
            applyEnhancedInlineStyles();
        }, TIMING.DEBOUNCE_MS);
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
        let needsFullClear = false;

        // Check which settings changed
        for (const key of Object.values(ENHANCED_KEYS)) {
            if (changes[key] !== undefined) {
                const oldValue = enhancedSettings[key];
                const newValue = changes[key].newValue;
                enhancedSettings[key] = newValue;
                needsUpdate = true;

                // If we're re-enabling avatars or timestamps, we need to clear styles
                // so the display:none gets removed
                if (key === 'showAvatars' || key === 'showTimestamps') {
                    if (newValue === true && oldValue === false) {
                        needsFullClear = true;
                    }
                }

                // If bubble style changed from minimal/square to rounded, clear first
                if (key === 'messageBubbleStyle') {
                    if (newValue === 'rounded' && (oldValue === 'minimal' || oldValue === 'square')) {
                        needsFullClear = true;
                    }
                }

                console.log(`[Claude Width] Enhanced setting changed: ${key} = ${newValue}`);
            }
        }

        if (needsUpdate) {
            // Apply display mode preset if changed
            if (changes.displayMode) {
                const mode = changes.displayMode.newValue;
                if (mode !== 'custom' && DISPLAY_MODE_PRESETS[mode]) {
                    const preset = DISPLAY_MODE_PRESETS[mode];
                    enhancedSettings.lineHeight = preset.lineHeight;
                    enhancedSettings.messagePadding = preset.messagePadding;
                    enhancedSettings.fontSizePercent = preset.fontSize;
                }
            }

            // Handle code blocks collapsed state
            if (changes.codeBlocksCollapsed) {
                const collapsed = changes.codeBlocksCollapsed.newValue;
                toggleAllCodeBlocks(collapsed);
            }

            // Clear existing styles if needed (when re-enabling features)
            if (needsFullClear) {
                clearEnhancedInlineStyles();
            }

            // Inject updated CSS and apply inline styles
            injectEnhancedCSS();
            applyEnhancedInlineStyles();
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
            // Clear existing inline styles first
            clearEnhancedInlineStyles();

            // Reset to defaults
            await browser.storage.local.set(ENHANCED_DEFAULTS);
            enhancedSettings = { ...ENHANCED_DEFAULTS };

            // Re-inject CSS with default values
            injectEnhancedCSS();

            // Expand all code blocks
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
            let needsWidthUpdate = false;
            let needsEnhancedUpdate = false;

            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check if new element might need width styling
                            const isWidthRelevant = node.matches && (
                                node.matches('[class*="mx-auto"]') ||
                                node.matches('[class*="Message"]') ||
                                node.matches('[class*="Composer"]') ||
                                node.matches('form')
                            );

                            const hasWidthRelevantChild = node.querySelector && (
                                node.querySelector('[class*="mx-auto"]') ||
                                node.querySelector('[class*="Message"]') ||
                                node.querySelector('[class*="Composer"]') ||
                                node.querySelector('form')
                            );

                            if (isWidthRelevant || hasWidthRelevantChild) {
                                needsWidthUpdate = true;
                            }

                            // Check if new element might need enhanced styling
                            const isEnhancedRelevant = node.matches && (
                                node.matches('.prose') ||
                                node.matches('[class*="prose"]') ||
                                node.matches('[class*="Message"]') ||
                                node.matches('[class*="message"]') ||
                                node.matches('pre') ||
                                node.matches('[class*="CodeBlock"]') ||
                                node.matches('[class*="avatar" i]') ||
                                node.matches('[class*="Avatar"]') ||
                                node.matches('time') ||
                                node.matches('[class*="timestamp" i]')
                            );

                            const hasEnhancedRelevantChild = node.querySelector && (
                                node.querySelector('.prose') ||
                                node.querySelector('[class*="prose"]') ||
                                node.querySelector('[class*="Message"]') ||
                                node.querySelector('pre') ||
                                node.querySelector('[class*="CodeBlock"]') ||
                                node.querySelector('[class*="avatar" i]') ||
                                node.querySelector('[class*="Avatar"]') ||
                                node.querySelector('time')
                            );

                            if (isEnhancedRelevant || hasEnhancedRelevantChild) {
                                needsEnhancedUpdate = true;
                            }

                            // If both need updates, no need to continue checking
                            if (needsWidthUpdate && needsEnhancedUpdate) {
                                break;
                            }
                        }
                    }
                }
                if (needsWidthUpdate && needsEnhancedUpdate) break;
            }

            // Apply updates as needed
            if (needsWidthUpdate) {
                applyWidthDebounced(currentWidth);
            }

            if (needsEnhancedUpdate) {
                applyEnhancedInlineStylesDebounced();
            }

            // Ensure our style elements exist
            if (!document.getElementById(STYLE_ELEMENT_ID)) {
                injectMinimalCSS();
            }
            if (!document.getElementById(ENHANCED_STYLE_ID)) {
                injectEnhancedCSS();
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
        console.log('[Claude Width] Initializing content script v1.8.1...');

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
                setTimeout(() => {
                    applyWidthToChat(index === 0 ? savedWidth : currentWidth);
                    // Also re-apply enhanced inline styles for lazy-loaded content
                    applyEnhancedInlineStyles();
                }, delay);
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
