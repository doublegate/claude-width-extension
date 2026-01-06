/**
 * Claude Chat Width Customizer - Content Script
 * ==============================================
 * 
 * VERSION 1.3.0 - Fixed width application
 * 
 * Changes from 1.2.0:
 * - Removed isInsideMain() check (Claude may not use <main> tag)
 * - Keep strict sidebar exclusion via isInsideSidebar()
 * - Force update styles when width changes (clear and reapply)
 * - Better element targeting with debug logging
 * 
 * @author DoubleGate
 * @version 1.4.0
 * @license MIT
 */

(function() {
    'use strict';

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    const DEFAULT_WIDTH_PERCENT = 60;
    const MIN_WIDTH_PERCENT = 40;
    const MAX_WIDTH_PERCENT = 100;
    const STYLE_ELEMENT_ID = 'claude-width-customizer-styles';
    const STORAGE_KEY = 'chatWidthPercent';
    const DATA_ATTR = 'data-claude-width-applied';

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
        }, 50);
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
             * Claude Chat Width Customizer - Minimal CSS v1.3.0
             */

            /* Smooth transitions for styled elements */
            [${DATA_ATTR}] {
                transition: max-width 0.2s ease-out, width 0.2s ease-out !important;
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
        
        if (changes[STORAGE_KEY]) {
            const newWidth = changes[STORAGE_KEY].newValue;
            
            if (typeof newWidth === 'number') {
                console.log(`[Claude Width] Storage changed to: ${newWidth}%`);
                // Force clear and reapply
                clearAllStyles();
                applyWidthToChat(newWidth);
            }
        }
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

    function handleMessage(message, sender, sendResponse) {
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
                    styledElementCount: styledElements.size
                });
                break;
                
            case 'resetToDefault':
                clearAllStyles();
                applyWidthToChat(DEFAULT_WIDTH_PERCENT);
                sendResponse({ success: true, currentWidth: DEFAULT_WIDTH_PERCENT });
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
        console.log('[Claude Width] Initializing content script v1.3.0...');
        
        try {
            // Load saved preference
            const savedWidth = await loadWidthPreference();
            currentWidth = savedWidth;
            
            // Inject minimal CSS
            injectMinimalCSS();
            
            // Apply initial styles with delays to catch lazy-loaded content
            setTimeout(() => applyWidthToChat(savedWidth), 100);
            setTimeout(() => applyWidthToChat(currentWidth), 500);
            setTimeout(() => applyWidthToChat(currentWidth), 1000);
            setTimeout(() => applyWidthToChat(currentWidth), 2000);
            setTimeout(() => applyWidthToChat(currentWidth), 3000);
            
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
