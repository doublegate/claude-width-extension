/**
 * Claude Chat Width Customizer - Content Script
 * ==============================================
 *
 * VERSION 1.9.1 - Technical Debt Remediation
 *
 * Injected into claude.ai pages to apply width customizations to the chat area.
 * Works with the background script to handle keyboard shortcuts for preset
 * cycling and default toggling.
 *
 * Changes from 1.8.3:
 * - NEW: Profile switch handling via 'profileChanged' message
 * - NEW: Reloads settings when active profile changes
 * - UPDATED: Version bump to 1.9.0 for Sync & Profiles release
 *
 * Changes from 1.8.2:
 * - FIXED: Avatar/Timestamp visibility using data attributes instead of display:block/inline
 * - FIXED: Bubble styles using data attributes so 'rounded' doesn't override Claude's styles
 * - FIXED: Code block word wrap with more specific CSS selectors
 * - FIXED: Code block collapse/expand using global data attribute + per-block buttons
 * - NEW: DATA_ATTRS object for visibility and style toggle attributes
 * - NEW: CSS for individually expanded code blocks that override global collapse
 * - IMPROVED: Expand buttons styled in CSS instead of inline styles
 *
 * Changes from 1.8.1:
 * - REFACTORED: Replaced inline style manipulation with CSS custom properties
 * - NEW: CSS variables (--claude-width-*) defined on :root for dynamic updates
 * - PERFORMANCE: Eliminated O(n) DOM queries - now O(1) root element updates
 *
 * @author DoubleGate
 * @version 1.9.1
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
        TIMING,
        PROFILE_STORAGE_KEYS
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
     * CSS Custom Property names for enhanced styling.
     * Using CSS variables allows centralized styling updates without inline style manipulation.
     * JavaScript only needs to update these variables on :root, and all CSS rules update automatically.
     *
     * Benefits:
     * - Reduced DOM manipulation (better performance)
     * - Centralized styling in CSS
     * - Uses CSS cascade properly
     * - Eliminates duplication between CSS injection and inline styles
     */
    const CSS_VARS = {
        FONT_SIZE: '--claude-width-font-size',
        LINE_HEIGHT: '--claude-width-line-height',
        MESSAGE_PADDING: '--claude-width-message-padding',
        CODE_MAX_HEIGHT: '--claude-width-code-max-height',
        CODE_OVERFLOW: '--claude-width-code-overflow',
        CODE_WHITESPACE: '--claude-width-code-whitespace',
        CODE_WORDWRAP: '--claude-width-code-wordwrap'
        // Note: Avatar/Timestamp visibility and Bubble style now use data attributes
        // instead of CSS variables for proper show/hide behavior (v1.8.3)
    };

    /**
     * Data attribute names for visibility and style toggles.
     * Using data attributes allows toggling styles on/off without needing to know
     * the original display values - when attribute is absent, original styles apply.
     */
    const DATA_ATTRS = {
        HIDE_AVATARS: 'data-claude-hide-avatars',
        HIDE_TIMESTAMPS: 'data-claude-hide-timestamps',
        BUBBLE_STYLE: 'data-claude-bubble-style',
        CODE_COLLAPSED: 'data-claude-code-collapsed'
    };

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

    /**
     * Selectors that indicate an element is part of the sidebar.
     * Used by isInsideSidebar() to prevent width styles from affecting navigation.
     *
     * @type {string[]}
     *
     * IMPORTANT: These selectors are checked against an element AND all its ancestors.
     * If any ancestor matches, the element is considered "inside sidebar."
     *
     * Selector categories:
     * - SEMANTIC: HTML5 semantic elements (nav, aside)
     * - ARIA: Accessibility attributes for screen readers
     * - DATA-TESTID: Testing infrastructure attributes (most stable)
     * - CLASS: Dynamic class name patterns (both PascalCase and kebab-case)
     *
     * The sidebar contains:
     * - Conversation history list
     * - Navigation menu
     * - User settings/profile access
     * - Project/workspace selector
     */
    const SIDEBAR_INDICATORS = [
        // SEMANTIC HTML: Standard navigation/sidebar elements
        'nav',                                 // HTML5 <nav> element
        'aside',                               // HTML5 <aside> element (sidebar content)

        // ARIA: Accessibility role-based selectors (very stable)
        '[role="navigation"]',                 // ARIA navigation landmark

        // DATA-TESTID: Testing infrastructure (stable across deploys)
        '[data-testid="sidebar"]',             // Direct sidebar test ID
        '[data-testid="side-nav"]',            // Side navigation test ID
        '[data-testid="history-panel"]',       // Conversation history panel

        // ARIA-LABEL: Accessibility labels (case-insensitive)
        '[aria-label*="sidebar" i]',           // Any element labeled as sidebar
        '[aria-label*="navigation" i]',        // Any element labeled as navigation
        '[aria-label*="history" i]',           // Any element labeled as history
        '[aria-label*="menu" i]',              // Any element labeled as menu

        // CLASS: Sidebar component patterns (PascalCase - React components)
        '[class*="Sidebar"]',                  // Sidebar, LeftSidebar, SidebarNav, etc.
        '[class*="SideNav"]',                  // SideNav, SideNavigation, etc.
        '[class*="LeftPanel"]',                // LeftPanel, LeftPanelContainer, etc.
        '[class*="NavPanel"]',                 // NavPanel, NavPanelWrapper, etc.
        '[class*="NavigationMenu"]',           // NavigationMenu component
        '[class*="HistoryPanel"]',             // HistoryPanel for conversation list
        '[class*="ConversationList"]',         // ConversationList component

        // CLASS: Sidebar component patterns (kebab-case - CSS classes)
        '[class*="sidebar"]',                  // sidebar, left-sidebar, sidebar-nav
        '[class*="sidenav"]',                  // sidenav, sidenav-container
        '[class*="side-nav"]',                 // side-nav, side-nav-wrapper
        '[class*="left-panel"]',               // left-panel, left-panel-container
        '[class*="nav-panel"]',                // nav-panel, nav-panel-wrapper
        '[class*="navigation-menu"]',          // navigation-menu class
        '[class*="history-panel"]',            // history-panel for conversations
        '[class*="conversation-list"]'         // conversation-list component
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
    // CACHED SELECTOR STRINGS (Performance Optimization)
    // =========================================================================
    // Pre-computed combined selectors to avoid repeated array.join() operations.
    // These are used in querySelectorAll() calls and element.matches() checks.

    /**
     * Combined selector for width-relevant container elements.
     * These elements need max-width/width adjustments.
     * @type {string}
     */
    const WIDTH_CONTAINER_SELECTOR = [
        '[class*="mx-auto"]',
        'form',
        '[class*="Composer"]',
        '[class*="composer"]'
    ].join(',');

    /**
     * Combined selector for width-relevant content elements.
     * These elements only need max-width adjustments.
     * @type {string}
     */
    const WIDTH_CONTENT_SELECTOR = [
        '[class*="Message"]',
        '[class*="message"]',
        '[class*="Thread"]',
        '[class*="thread"]',
        '[class*="Conversation"]',
        '[class*="conversation"]'
    ].join(',');

    /**
     * Combined selector for prose/markdown elements.
     * @type {string}
     */
    const PROSE_SELECTOR = '.prose, [class*="prose"], [class*="Markdown"], [class*="markdown"]';

    /**
     * Combined selector for code blocks.
     * @type {string}
     */
    const CODE_BLOCK_SELECTOR = 'pre, [class*="CodeBlock"], [class*="code-block"]';

    /**
     * Combined selector for width-relevant elements (used in MutationObserver).
     * @type {string}
     */
    const WIDTH_RELEVANT_SELECTOR = `${WIDTH_CONTAINER_SELECTOR}, ${WIDTH_CONTENT_SELECTOR}`;

    /**
     * Combined selector for enhanced-styling-relevant elements (used in MutationObserver).
     * @type {string}
     */
    const ENHANCED_RELEVANT_SELECTOR = [
        '.prose',
        '[class*="prose"]',
        '[class*="Message"]',
        '[class*="message"]',
        'pre',
        '[class*="CodeBlock"]',
        '[class*="code-block"]',
        '[class*="avatar" i]',
        '[class*="Avatar"]',
        'time',
        '[class*="timestamp" i]'
    ].join(',');

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

    /**
     * Check if an element matches a selector (safely handles invalid selectors).
     *
     * @param {Element} element - The element to check
     * @param {string} selector - CSS selector to match against
     * @returns {boolean} True if element matches selector
     */
    function safeMatches(element, selector) {
        try {
            return element.matches && element.matches(selector);
        } catch (e) {
            // Invalid selector
            return false;
        }
    }

    /**
     * Check if an element has a descendant matching a selector (safely).
     *
     * @param {Element} element - The element to search within
     * @param {string} selector - CSS selector to find
     * @returns {boolean} True if a matching descendant exists
     */
    function safeHasDescendant(element, selector) {
        try {
            return element.querySelector && !!element.querySelector(selector);
        } catch (e) {
            // Invalid selector
            return false;
        }
    }

    /**
     * Process elements matching a selector, excluding sidebar elements.
     * Consolidates the common pattern of querySelectorAll + forEach + isInsideSidebar check.
     *
     * @param {string} selector - CSS selector to query
     * @param {function(Element): void} callback - Function to call for each non-sidebar element
     * @param {Element} [root=document] - Root element to query from
     * @returns {number} Count of elements processed
     */
    function processNonSidebarElements(selector, callback, root = document) {
        let count = 0;
        try {
            const elements = root.querySelectorAll(selector);
            elements.forEach(el => {
                if (!isInsideSidebar(el)) {
                    callback(el);
                    count++;
                }
            });
        } catch (e) {
            console.warn('[Claude Width] Invalid selector:', selector, e);
        }
        return count;
    }

    /**
     * Check if an element is relevant for width styling.
     *
     * @param {Element} element - The element to check
     * @returns {boolean} True if element needs width styling
     */
    function isWidthRelevant(element) {
        return safeMatches(element, WIDTH_RELEVANT_SELECTOR) ||
               safeHasDescendant(element, WIDTH_RELEVANT_SELECTOR);
    }

    /**
     * Check if an element is relevant for enhanced styling.
     *
     * @param {Element} element - The element to check
     * @returns {boolean} True if element needs enhanced styling
     */
    function isEnhancedRelevant(element) {
        return safeMatches(element, ENHANCED_RELEVANT_SELECTOR) ||
               safeHasDescendant(element, ENHANCED_RELEVANT_SELECTOR);
    }

    // =========================================================================
    // ENHANCED STYLING FUNCTIONS (v1.8.0)
    // =========================================================================

    /**
     * CSS SELECTOR DESIGN PHILOSOPHY
     * ===============================
     * Claude.ai uses React with dynamically-generated class names (Tailwind CSS + custom classes).
     * Class names may change between deployments, so we use multiple selector strategies:
     *
     * 1. **Class Pattern Matching** - [class*="Foo"] catches FooBar, BarFoo, etc.
     * 2. **Case Variants** - Both PascalCase and kebab-case versions
     * 3. **Data Attributes** - data-testid attributes are more stable
     * 4. **Semantic Elements** - <time>, <pre>, <code> are reliable
     * 5. **Exclusion Patterns** - :not() prevents matching unwanted containers
     *
     * Selectors are ordered from most specific to most general for optimal matching.
     */

    /**
     * Selectors for message content (text that needs typography styles).
     * Targets the actual text-containing elements for font-size and line-height.
     *
     * @type {string[]}
     *
     * Selector groups:
     * - PROSE: Claude wraps markdown-rendered content in .prose containers
     *   These use Tailwind's typography plugin for consistent text styling
     * - MESSAGE: Generic message content wrappers (both capitalized React and kebab-case CSS)
     * - CHAT: Broader conversation-level text containers
     * - MARKDOWN: Rendered markdown content blocks
     * - TURNS: Human/Assistant message turn containers
     */
    const MESSAGE_TEXT_SELECTORS = [
        // PROSE: Claude's primary text container using Tailwind Typography plugin
        // .prose applies consistent typography to markdown-rendered content
        '.prose',                              // Direct prose class
        '.prose p',                            // Paragraphs within prose
        '.prose li',                           // List items within prose
        '.prose span',                         // Inline text within prose
        '.prose div',                          // Div containers within prose
        '[class*="prose"]',                    // Any class containing "prose" (e.g., prose-sm)
        '[class*="prose"] p',                  // Paragraphs in prose-like containers
        '[class*="prose"] li',                 // List items in prose-like containers

        // MESSAGE: Primary message content containers
        // React components often use PascalCase class naming
        '[class*="Message"]',                  // PascalCase (MessageContent, MessageBody, etc.)
        '[class*="message"]',                  // kebab-case variants
        '[class*="MessageContent"]',           // Explicit content container
        '[class*="message-content"]',          // kebab-case content container

        // CHAT: Broader conversation-level containers
        '[class*="ConversationMessage"]',      // Full conversation message wrapper
        '[class*="conversation-message"]',     // kebab-case variant
        '[class*="ChatMessage"]',              // Chat-specific message wrapper
        '[class*="chat-message"]',             // kebab-case variant

        // MARKDOWN: Rendered markdown content
        '[class*="Markdown"]',                 // Markdown component wrapper
        '[class*="markdown"]',                 // kebab-case variant
        '[class*="MarkdownContent"]',          // Explicit markdown content

        // TURNS: Human vs Assistant message containers
        '[class*="ResponseContent"]',          // Claude's response content
        '[class*="HumanContent"]',             // User's message content
        '[class*="AssistantContent"]',         // Assistant-specific content
        '[class*="human-turn"]',               // Human turn container
        '[class*="assistant-turn"]'            // Assistant turn container
    ];

    /**
     * Selectors for message containers (elements that need padding/bubble styles).
     * Targets the outer wrapper elements for spacing and border-radius.
     *
     * @type {string[]}
     *
     * Uses :not() to exclude list containers that wrap multiple messages.
     * MessageList should not receive padding meant for individual messages.
     */
    const MESSAGE_CONTAINER_SELECTORS = [
        // MESSAGE: Individual message wrappers, excluding list containers
        '[class*="Message"]:not([class*="MessageList"])',    // Exclude message lists
        '[class*="message"]:not([class*="message-list"])',   // kebab-case with exclusion

        // CONVERSATION: Full message containers
        '[class*="ConversationMessage"]',      // Conversation-level message wrapper
        '[class*="ChatMessage"]',              // Chat-specific message wrapper

        // TURNS: Human/Assistant turn wrappers
        '[class*="turn-"]',                    // Hyphenated turn prefix
        '[class*="Turn"]',                     // PascalCase turn containers

        // DATA-TESTID: More stable selectors used in testing infrastructure
        '[data-testid*="message"]',            // Test ID containing "message"
        '[data-testid*="turn"]'                // Test ID containing "turn"
    ];

    /**
     * Selectors for avatar elements (user and Claude profile pictures).
     * Used to show/hide avatars based on user preference.
     *
     * @type {string[]}
     *
     * Strategy: Target common avatar class patterns + img elements with avatar-related alt text.
     * The 'i' flag makes class matching case-insensitive.
     */
    const AVATAR_SELECTORS = [
        // CLASS-BASED: Common avatar class naming patterns
        '[class*="avatar" i]',                 // Case-insensitive avatar class match
        '[class*="Avatar"]',                   // PascalCase (AvatarComponent, UserAvatar)
        '[class*="profile-pic" i]',            // Profile picture containers
        '[class*="user-icon" i]',              // User icon containers

        // SPECIFIC COMPONENTS: Known Claude.ai component patterns
        '[class*="ProfileImage"]',             // Profile image wrapper
        '[class*="UserIcon"]',                 // User icon component
        '[class*="ClaudeIcon"]',               // Claude's avatar icon
        '[class*="HumanIcon"]',                // Human user's avatar icon

        // IMAGE ELEMENTS: Target img tags by alt text content
        'img[alt*="avatar" i]',                // Images with "avatar" in alt text
        'img[alt*="profile" i]',               // Images with "profile" in alt text

        // TEST-ID: Stable testing selectors
        '[data-testid*="avatar"]'              // Test ID containing "avatar"
    ];

    /**
     * Selectors for timestamp elements (message time indicators).
     * Used to show/hide timestamps based on user preference.
     *
     * @type {string[]}
     *
     * Includes semantic HTML5 <time> element which is the most reliable indicator.
     */
    const TIMESTAMP_SELECTORS = [
        // CLASS-BASED: Common timestamp class patterns
        '[class*="timestamp" i]',              // Case-insensitive timestamp match
        '[class*="Timestamp"]',                // PascalCase timestamp component

        // SEMANTIC HTML: Standard time elements
        'time',                                // HTML5 <time> element
        '[datetime]',                          // Any element with datetime attribute

        // RELATIVE TIME: "2 hours ago" style displays
        '[class*="TimeAgo"]',                  // TimeAgo component
        '[class*="time-ago"]',                 // kebab-case time-ago

        // MESSAGE-SPECIFIC: Time displays within messages
        '[class*="MessageTime"]',              // Message timestamp component
        '[class*="message-time"]',             // kebab-case variant

        // TEST-ID: Stable testing selectors
        '[data-testid*="timestamp"]',          // Test ID containing "timestamp"
        '[data-testid*="time"]'                // Test ID containing "time"
    ];

    /**
     * Selectors for code blocks (syntax-highlighted code containers).
     * Used to apply max-height, word-wrap, and collapse functionality.
     *
     * @type {string[]}
     *
     * Primary targets are semantic <pre> and <code> elements, with fallback
     * to class-based patterns for custom code block components.
     */
    const CODE_BLOCK_SELECTORS = [
        // SEMANTIC HTML: Standard code elements
        'pre',                                 // Preformatted text (main code container)
        'pre code',                            // Code within preformatted blocks

        // CLASS-BASED: Custom code block components
        '[class*="CodeBlock"]',                // CodeBlock component wrapper
        '[class*="code-block"]',               // kebab-case variant
        '[class*="codeblock"]',                // No-separator variant

        // CONTAINER: Code container wrappers
        '[class*="code-container"]',           // Code container class
        '[class*="CodeContainer"]',            // PascalCase container

        // TEST-ID: Stable testing selectors
        '[data-testid*="code-block"]'          // Test ID containing "code-block"
    ];

    /**
     * Generate CSS for enhanced styling features using CSS custom properties and data attributes.
     * Uses broad selectors with high specificity to override Claude's styles.
     *
     * CSS Custom Properties Approach (v1.8.3):
     * - Typography uses CSS variables for dynamic updates
     * - Visibility toggles use data attributes for proper show/hide behavior
     * - Bubble styles use data attributes so "rounded" doesn't override Claude's styles
     *
     * @returns {string} CSS string
     */
    function generateEnhancedCSS() {
        // Build comprehensive selector strings
        const textSelectors = MESSAGE_TEXT_SELECTORS.join(',\n            ');
        const containerSelectors = MESSAGE_CONTAINER_SELECTORS.join(',\n            ');
        const avatarSelectors = AVATAR_SELECTORS.join(',\n            ');
        const timestampSelectors = TIMESTAMP_SELECTORS.join(',\n            ');
        const codeSelectors = CODE_BLOCK_SELECTORS.join(',\n            ');

        // CSS uses var() references for typography and data attributes for visibility/styles
        const css = `
            /* Claude Width Customizer - Enhanced Styling v1.8.3 */
            /* Uses CSS custom properties for typography, data attributes for visibility/styles */
            /* These styles use !important to override Claude's React-generated styles */

            /* ========================================
               CSS CUSTOM PROPERTIES (Variables)
               Set via JavaScript on :root element
               ======================================== */
            :root {
                /* Typography */
                ${CSS_VARS.FONT_SIZE}: ${ENHANCED_DEFAULTS.fontSizePercent}%;
                ${CSS_VARS.LINE_HEIGHT}: ${LINE_HEIGHT_VALUES.normal};
                ${CSS_VARS.MESSAGE_PADDING}: ${MESSAGE_PADDING_VALUES.medium}px;

                /* Code blocks */
                ${CSS_VARS.CODE_MAX_HEIGHT}: ${ENHANCED_DEFAULTS.codeBlockMaxHeight}px;
                ${CSS_VARS.CODE_OVERFLOW}: auto;
                ${CSS_VARS.CODE_WHITESPACE}: pre;
                ${CSS_VARS.CODE_WORDWRAP}: normal;
            }

            /* ========================================
               TYPOGRAPHY CONTROLS
               ======================================== */

            /* Font size and line height for all text content */
            ${textSelectors} {
                font-size: var(${CSS_VARS.FONT_SIZE}) !important;
                line-height: var(${CSS_VARS.LINE_HEIGHT}) !important;
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
               MESSAGE PADDING (always applies)
               ======================================== */

            /* Apply padding to message containers */
            ${containerSelectors} {
                padding: var(${CSS_VARS.MESSAGE_PADDING}) !important;
            }

            /* ========================================
               BUBBLE STYLE (data attribute based)
               Only override Claude's styles for square/minimal
               ======================================== */

            /* Square bubble style - remove border-radius */
            html[${DATA_ATTRS.BUBBLE_STYLE}="square"] ${containerSelectors} {
                border-radius: 0 !important;
            }

            /* Minimal bubble style - transparent, no borders, no shadows */
            html[${DATA_ATTRS.BUBBLE_STYLE}="minimal"] ${containerSelectors} {
                border-radius: 0 !important;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }

            /* ========================================
               CODE BLOCK STYLING
               ======================================== */

            /* Code block max height and overflow */
            ${codeSelectors} {
                max-height: var(${CSS_VARS.CODE_MAX_HEIGHT}) !important;
                overflow-y: var(${CSS_VARS.CODE_OVERFLOW}) !important;
            }

            /* Code block word wrap - use more specific selectors */
            pre,
            pre > code,
            [class*="CodeBlock"],
            [class*="CodeBlock"] > code,
            [class*="CodeBlock"] pre,
            [class*="CodeBlock"] pre > code,
            [class*="code-block"],
            [class*="code-block"] > code,
            [class*="code-block"] pre,
            [class*="code-block"] pre > code,
            code[class*="language-"],
            pre[class*="language-"] {
                white-space: var(${CSS_VARS.CODE_WHITESPACE}) !important;
                word-wrap: var(${CSS_VARS.CODE_WORDWRAP}) !important;
                overflow-wrap: var(${CSS_VARS.CODE_WORDWRAP}) !important;
                word-break: normal !important;
            }

            /* ========================================
               CODE BLOCK COLLAPSE (data attribute based)
               ======================================== */

            /* When code-collapsed is active, limit height and hide overflow */
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] pre,
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="CodeBlock"],
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="code-block"] {
                max-height: 100px !important;
                overflow: hidden !important;
                position: relative !important;
            }

            /* Collapse indicator gradient overlay */
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] pre::after,
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="CodeBlock"]::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 40px;
                background: linear-gradient(transparent, rgba(0, 0, 0, 0.3));
                pointer-events: none;
            }

            /* Individually expanded code blocks override global collapse */
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] pre[data-claude-individually-expanded="true"],
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="CodeBlock"][data-claude-individually-expanded="true"],
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="code-block"][data-claude-individually-expanded="true"] {
                max-height: none !important;
                overflow: visible !important;
            }

            /* Hide gradient overlay on individually expanded blocks */
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] pre[data-claude-individually-expanded="true"]::after,
            html[${DATA_ATTRS.CODE_COLLAPSED}="true"] [class*="CodeBlock"][data-claude-individually-expanded="true"]::after {
                display: none !important;
            }

            /* ========================================
               TIMESTAMP VISIBILITY (data attribute based)
               Only hide when attribute is present
               ======================================== */

            /* Hide timestamps when data attribute is set */
            html[${DATA_ATTRS.HIDE_TIMESTAMPS}="true"] ${timestampSelectors} {
                display: none !important;
                visibility: hidden !important;
            }

            /* ========================================
               AVATAR VISIBILITY (data attribute based)
               Only hide when attribute is present
               ======================================== */

            /* Hide avatars when data attribute is set */
            html[${DATA_ATTRS.HIDE_AVATARS}="true"] ${avatarSelectors} {
                display: none !important;
                visibility: hidden !important;
            }

            /* ========================================
               EXPAND/COLLAPSE BUTTON STYLING
               ======================================== */

            .claude-expand-btn {
                position: absolute !important;
                bottom: 8px !important;
                right: 8px !important;
                padding: 4px 12px !important;
                background: rgba(0, 0, 0, 0.7) !important;
                color: white !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                z-index: 100 !important;
                transition: background 0.2s ease !important;
            }

            .claude-expand-btn:hover {
                background: rgba(0, 0, 0, 0.85) !important;
            }

            .claude-expand-btn:focus {
                outline: 2px solid #fff !important;
                outline-offset: 2px !important;
            }

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

            /* Mark document as having enhanced styles applied */
            html[data-claude-enhanced-active] {
                /* This attribute marks that enhanced styling is active */
            }
        `;

        return css;
    }

    /**
     * Update CSS custom properties and data attributes on :root based on current settings.
     * - Typography uses CSS variables for dynamic updates
     * - Visibility and bubble styles use data attributes for proper on/off behavior
     */
    function updateCSSVariables() {
        const settings = enhancedSettings;
        const root = document.documentElement;

        // =====================================================================
        // TYPOGRAPHY (CSS Variables)
        // =====================================================================
        const fontSizePercent = settings.fontSizePercent || ENHANCED_DEFAULTS.fontSizePercent;
        const lineHeightValue = LINE_HEIGHT_VALUES[settings.lineHeight] || LINE_HEIGHT_VALUES.normal;
        const messagePaddingValue = MESSAGE_PADDING_VALUES[settings.messagePadding] || MESSAGE_PADDING_VALUES.medium;

        root.style.setProperty(CSS_VARS.FONT_SIZE, `${fontSizePercent}%`);
        root.style.setProperty(CSS_VARS.LINE_HEIGHT, String(lineHeightValue));
        root.style.setProperty(CSS_VARS.MESSAGE_PADDING, `${messagePaddingValue}px`);

        // =====================================================================
        // CODE BLOCKS (CSS Variables)
        // =====================================================================
        const codeBlockHeight = settings.codeBlockMaxHeight;
        const codeBlockWrap = settings.codeBlockWordWrap;

        if (codeBlockHeight > 0) {
            root.style.setProperty(CSS_VARS.CODE_MAX_HEIGHT, `${codeBlockHeight}px`);
            root.style.setProperty(CSS_VARS.CODE_OVERFLOW, 'auto');
        } else {
            root.style.setProperty(CSS_VARS.CODE_MAX_HEIGHT, 'none');
            root.style.setProperty(CSS_VARS.CODE_OVERFLOW, 'visible');
        }

        if (codeBlockWrap) {
            root.style.setProperty(CSS_VARS.CODE_WHITESPACE, 'pre-wrap');
            root.style.setProperty(CSS_VARS.CODE_WORDWRAP, 'break-word');
        } else {
            root.style.setProperty(CSS_VARS.CODE_WHITESPACE, 'pre');
            root.style.setProperty(CSS_VARS.CODE_WORDWRAP, 'normal');
        }

        // =====================================================================
        // VISIBILITY TOGGLES (Data Attributes)
        // Only set attribute when hiding; remove when showing (preserves original display)
        // =====================================================================
        const showAvatars = settings.showAvatars;
        const showTimestamps = settings.showTimestamps;

        if (showAvatars === false) {
            root.setAttribute(DATA_ATTRS.HIDE_AVATARS, 'true');
        } else {
            root.removeAttribute(DATA_ATTRS.HIDE_AVATARS);
        }

        if (showTimestamps === false) {
            root.setAttribute(DATA_ATTRS.HIDE_TIMESTAMPS, 'true');
        } else {
            root.removeAttribute(DATA_ATTRS.HIDE_TIMESTAMPS);
        }

        // =====================================================================
        // BUBBLE STYLE (Data Attribute)
        // Only set attribute for non-default styles; remove for 'rounded' (default)
        // =====================================================================
        const bubbleStyle = settings.messageBubbleStyle;

        if (bubbleStyle === 'square' || bubbleStyle === 'minimal') {
            root.setAttribute(DATA_ATTRS.BUBBLE_STYLE, bubbleStyle);
        } else {
            // 'rounded' or undefined - remove attribute to let Claude's default styles apply
            root.removeAttribute(DATA_ATTRS.BUBBLE_STYLE);
        }

        // =====================================================================
        // CODE BLOCKS COLLAPSED (Data Attribute)
        // =====================================================================
        const codeBlocksCollapsed = settings.codeBlocksCollapsed;

        if (codeBlocksCollapsed === true) {
            root.setAttribute(DATA_ATTRS.CODE_COLLAPSED, 'true');
        } else {
            root.removeAttribute(DATA_ATTRS.CODE_COLLAPSED);
        }

        // Mark document as having enhanced styles active
        root.setAttribute('data-claude-enhanced-active', 'true');

        console.log('[Claude Width] CSS variables and data attributes updated:', {
            fontSizePercent,
            lineHeightValue,
            messagePaddingValue,
            codeBlockHeight,
            codeBlockWrap,
            showAvatars,
            showTimestamps,
            bubbleStyle,
            codeBlocksCollapsed
        });
    }

    /**
     * Clear CSS custom properties and data attributes from :root.
     */
    function clearCSSVariables() {
        const root = document.documentElement;

        // Remove CSS custom properties
        Object.values(CSS_VARS).forEach(varName => {
            root.style.removeProperty(varName);
        });

        // Remove data attributes
        Object.values(DATA_ATTRS).forEach(attrName => {
            root.removeAttribute(attrName);
        });

        root.removeAttribute('data-claude-enhanced-active');
        console.log('[Claude Width] CSS variables and data attributes cleared');
    }

    /**
     * Inject or update enhanced styling CSS.
     * Uses CSS custom properties approach - the stylesheet is static,
     * and updateCSSVariables() handles dynamic value updates on :root.
     */
    function injectEnhancedCSS() {
        let styleElement = document.getElementById(ENHANCED_STYLE_ID);

        // Only inject the stylesheet once - it uses CSS variables that we update dynamically
        if (!styleElement) {
            const css = generateEnhancedCSS();
            styleElement = document.createElement('style');
            styleElement.id = ENHANCED_STYLE_ID;
            styleElement.type = 'text/css';
            styleElement.textContent = css;

            const head = document.head || document.getElementsByTagName('head')[0];
            if (head) {
                head.appendChild(styleElement);
            }
            console.log('[Claude Width] Enhanced CSS stylesheet injected');
        }

        // Update CSS custom properties on :root (much more efficient than inline styles)
        updateCSSVariables();

        console.log('[Claude Width] Enhanced styling applied via CSS variables');
    }

    /**
     * Apply enhanced styling.
     * REFACTORED in v1.8.2: Now uses CSS custom properties instead of inline styles.
     * This is more efficient as it only updates :root variables, not individual elements.
     *
     * @deprecated Use updateCSSVariables() directly for new code.
     */
    function applyEnhancedInlineStyles() {
        // Redirect to CSS variables approach - much more efficient
        updateCSSVariables();
    }

    /**
     * Clear all enhanced styling.
     * REFACTORED in v1.8.2: Now clears CSS custom properties from :root.
     *
     * @deprecated Use clearCSSVariables() directly for new code.
     */
    function clearEnhancedInlineStyles() {
        // Redirect to CSS variables approach
        clearCSSVariables();
    }

    /**
     * Debounced version of enhanced style application.
     * Uses CSS variables for efficient updates.
     */
    let enhancedStyleDebounceTimer = null;
    function applyEnhancedInlineStylesDebounced() {
        if (enhancedStyleDebounceTimer) {
            clearTimeout(enhancedStyleDebounceTimer);
        }
        enhancedStyleDebounceTimer = setTimeout(() => {
            updateCSSVariables();
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
     * Uses data attribute on html for global collapse state (CSS handles styling).
     * Individual expand buttons allow per-block expansion.
     *
     * @param {boolean} collapse - Whether to collapse all code blocks
     */
    function toggleAllCodeBlocks(collapse) {
        const root = document.documentElement;

        // Update global state via data attribute
        enhancedSettings.codeBlocksCollapsed = collapse;

        if (collapse) {
            root.setAttribute(DATA_ATTRS.CODE_COLLAPSED, 'true');
        } else {
            root.removeAttribute(DATA_ATTRS.CODE_COLLAPSED);
        }

        // Add or remove expand buttons on all code blocks
        processNonSidebarElements(CODE_BLOCK_SELECTOR, block => {
            if (collapse) {
                // Clear any individual expansion state
                block.removeAttribute('data-claude-individually-expanded');
                block.style.maxHeight = '';
                block.style.overflow = '';
                block.style.position = '';

                // Add expand button if not exists
                if (!block.querySelector('.claude-expand-btn')) {
                    addExpandButton(block);
                } else {
                    // Update existing button text
                    const btn = block.querySelector('.claude-expand-btn');
                    btn.textContent = 'Expand';
                }
            } else {
                // Clear individual expansion state
                block.removeAttribute('data-claude-individually-expanded');
                block.style.maxHeight = '';
                block.style.overflow = '';
                block.style.position = '';

                // Remove expand buttons
                const btn = block.querySelector('.claude-expand-btn');
                if (btn) btn.remove();
            }
        });

        console.log(`[Claude Width] All code blocks ${collapse ? 'collapsed' : 'expanded'}`);
    }

    /**
     * Add expand/collapse button to a code block.
     * Button allows individual expansion when global collapse is active.
     *
     * @param {Element} block - The code block element
     */
    function addExpandButton(block) {
        // Skip if button already exists
        if (block.querySelector('.claude-expand-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'claude-expand-btn';
        btn.textContent = 'Expand';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Expand code block');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            const isExpanded = block.hasAttribute('data-claude-individually-expanded');

            if (isExpanded) {
                // Collapse this block (return to global collapsed state)
                block.removeAttribute('data-claude-individually-expanded');
                block.style.maxHeight = '';
                block.style.overflow = '';
                btn.textContent = 'Expand';
                btn.setAttribute('aria-label', 'Expand code block');
            } else {
                // Expand this block (override global collapse)
                block.setAttribute('data-claude-individually-expanded', 'true');
                block.style.maxHeight = 'none';
                block.style.overflow = 'visible';
                btn.textContent = 'Collapse';
                btn.setAttribute('aria-label', 'Collapse code block');
            }
        });

        // Ensure code block is positioned for absolute child
        const position = getComputedStyle(block).position;
        if (position === 'static') {
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
     * Uses consolidated selectors for performance optimization.
     *
     * OPTIMIZATION: Previous implementation used 8 separate querySelectorAll calls.
     * Now uses 4 combined calls using cached selector strings, reducing DOM queries.
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

        // CONTAINER ELEMENTS (need max-width, width, and margin centering)
        // Uses WIDTH_CONTAINER_SELECTOR: mx-auto, form, Composer
        elementCount += processNonSidebarElements(WIDTH_CONTAINER_SELECTOR, el => {
            styleElement(el, clampedWidth, true);
        });

        // STICKY ELEMENTS (special handling for child divs)
        // Sticky footer containers often wrap the input area
        processNonSidebarElements('[class*="sticky"]', el => {
            elementCount += processNonSidebarElements(':scope > div', child => {
                styleElement(child, clampedWidth, true);
            }, el);
        });

        // CONTENT ELEMENTS (only need max-width, no centering)
        // Uses WIDTH_CONTENT_SELECTOR: Message, Thread, Conversation
        elementCount += processNonSidebarElements(WIDTH_CONTENT_SELECTOR, el => {
            styleElement(el, clampedWidth, false);
        });

        // PROSE/MARKDOWN ELEMENTS (fill their container)
        // Uses PROSE_SELECTOR: .prose, prose-*, Markdown
        processNonSidebarElements(PROSE_SELECTOR, el => {
            if (el.style) {
                el.style.maxWidth = '100%';
                styledElements.add(el);
            }
        });

        // CODE BLOCKS (fill container, enable horizontal scroll)
        // Uses CODE_BLOCK_SELECTOR: pre, CodeBlock
        processNonSidebarElements(CODE_BLOCK_SELECTOR, el => {
            if (el.style) {
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

    /**
     * Reload all settings from storage (used when profile changes).
     * Clears existing styles and reapplies with new settings.
     */
    async function reloadAllSettings() {
        console.log('[Claude Width] Reloading all settings...');

        // Clear existing styles
        clearAllStyles();
        clearEnhancedInlineStyles();

        // Reload width preference
        const savedWidth = await loadWidthPreference();
        currentWidth = savedWidth;

        // Reload enhanced settings
        await loadEnhancedSettings();

        // Re-inject CSS
        injectMinimalCSS();
        injectEnhancedCSS();

        // Apply styles
        applyWidthToChat(currentWidth);
        applyEnhancedInlineStyles();

        // Apply collapsed code blocks if enabled
        if (enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED]) {
            toggleAllCodeBlocks(true);
        } else {
            toggleAllCodeBlocks(false);
        }

        console.log(`[Claude Width] Settings reloaded. Width: ${currentWidth}%`);
    }

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

    /**
     * Process a MutationObserver mutation to determine if styling updates are needed.
     * Extracted from the callback for better readability and testability.
     *
     * @param {MutationRecord} mutation - The mutation record to process
     * @returns {{needsWidth: boolean, needsEnhanced: boolean}} Update flags
     */
    function processMutation(mutation) {
        let needsWidth = false;
        let needsEnhanced = false;

        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
            return { needsWidth, needsEnhanced };
        }

        for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;

            // Use cached selectors via helper functions for efficient checking
            if (!needsWidth && isWidthRelevant(node)) {
                needsWidth = true;
            }

            if (!needsEnhanced && isEnhancedRelevant(node)) {
                needsEnhanced = true;
            }

            // Early exit if both flags are set
            if (needsWidth && needsEnhanced) break;
        }

        return { needsWidth, needsEnhanced };
    }

    /**
     * Handle MutationObserver mutations.
     * Determines which style updates are needed and applies them with debouncing.
     *
     * @param {MutationRecord[]} mutations - Array of mutation records
     */
    function handleMutations(mutations) {
        let needsWidthUpdate = false;
        let needsEnhancedUpdate = false;

        // Process mutations to determine needed updates
        for (const mutation of mutations) {
            const result = processMutation(mutation);

            if (result.needsWidth) needsWidthUpdate = true;
            if (result.needsEnhanced) needsEnhancedUpdate = true;

            // Early exit if both flags are set
            if (needsWidthUpdate && needsEnhancedUpdate) break;
        }

        // Apply updates as needed (debounced)
        if (needsWidthUpdate) {
            applyWidthDebounced(currentWidth);
        }

        if (needsEnhancedUpdate) {
            applyEnhancedInlineStylesDebounced();
        }

        // Ensure our style elements exist (may be removed by page updates)
        if (!document.getElementById(STYLE_ELEMENT_ID)) {
            injectMinimalCSS();
        }
        if (!document.getElementById(ENHANCED_STYLE_ID)) {
            injectEnhancedCSS();
        }
    }

    /**
     * Set up the MutationObserver for dynamic content.
     * Claude.ai is a React SPA that dynamically loads content,
     * so we need to watch for new elements to style.
     */
    function setupDOMObserver() {
        if (domObserver) {
            domObserver.disconnect();
        }

        domObserver = new MutationObserver(handleMutations);

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

            case 'cyclePresets': {
                const newWidth = cycleToNextPreset();
                sendResponse({ success: true, currentWidth: newWidth });
                break;
            }

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

            case 'toggleCodeBlocks': {
                const collapse = message.collapse !== undefined ? message.collapse : !enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED];
                toggleAllCodeBlocks(collapse);
                sendResponse({ success: true, collapsed: collapse });
                break;
            }

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

            // Profile switch handling (v1.9.0)
            case 'profileChanged':
                console.log('[Claude Width] Profile changed, reloading settings...');
                // Reload all settings from storage
                reloadAllSettings().then(() => {
                    sendResponse({ success: true, currentWidth: currentWidth });
                }).catch(error => {
                    console.error('[Claude Width] Error reloading settings:', error);
                    sendResponse({ success: false, error: error.message });
                });
                return true; // Async response

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }

        return true;
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async function initialize() {
        console.log('[Claude Width] Initializing content script v1.9.1...');

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
