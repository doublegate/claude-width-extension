/**
 * Claude Chat Width Customizer - Popup Controller
 * ================================================
 * 
 * Handles user interactions in the extension popup, manages storage
 * of preferences, and communicates with content scripts on claude.ai tabs.
 * 
 * Features:
 * - Slider-based width selection with real-time preview
 * - Quick preset buttons for common width values
 * - Persistent storage of user preferences
 * - Live updates to all open claude.ai tabs
 * - Status indication showing if extension is active
 * 
 * Architecture:
 * - Uses browser.storage.local for preference persistence
 * - Sends messages to content scripts for immediate UI updates
 * - Queries active tabs to determine if user is on claude.ai
 * 
 * @author DoubleGate
 * @version 1.5.0
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
     * Preset width configurations.
     * @type {Object<string, number>}
     */
    const PRESETS = {
        50: 'narrow',
        70: 'medium',
        85: 'wide',
        100: 'full'
    };

    /**
     * Storage key for theme preference.
     * @type {string}
     */
    const THEME_STORAGE_KEY = 'theme';

    /**
     * Default theme (system).
     * @type {string}
     */
    const DEFAULT_THEME = 'system';

    /**
     * Valid theme values.
     * @type {string[]}
     */
    const VALID_THEMES = ['light', 'dark', 'system'];

    // =========================================================================
    // DOM REFERENCES
    // =========================================================================

    /**
     * @type {HTMLInputElement}
     */
    let sliderElement;

    /**
     * @type {HTMLSpanElement}
     */
    let widthValueElement;

    /**
     * @type {HTMLDivElement}
     */
    let previewBarElement;

    /**
     * @type {HTMLSpanElement}
     */
    let statusDotElement;

    /**
     * @type {HTMLSpanElement}
     */
    let statusTextElement;

    /**
     * @type {NodeListOf<HTMLButtonElement>}
     */
    let presetButtons;

    /**
     * @type {HTMLButtonElement}
     */
    let applyButton;

    /**
     * @type {HTMLButtonElement}
     */
    let resetButton;

    /**
     * @type {NodeListOf<HTMLButtonElement>}
     */
    let themeButtons;

    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * Currently selected width (not yet applied).
     * @type {number}
     */
    let selectedWidth = DEFAULT_WIDTH;

    /**
     * Last saved/applied width.
     * @type {number}
     */
    let savedWidth = DEFAULT_WIDTH;

    /**
     * Whether user is currently on a claude.ai tab.
     * @type {boolean}
     */
    let isOnClaudeTab = false;

    /**
     * Current theme preference.
     * @type {string}
     */
    let currentTheme = DEFAULT_THEME;

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    /**
     * Initialize the popup when DOM is ready.
     */
    function initialize() {
        // Cache DOM references
        sliderElement = document.getElementById('widthSlider');
        widthValueElement = document.getElementById('widthValue');
        previewBarElement = document.getElementById('previewBar');
        statusDotElement = document.getElementById('statusDot');
        statusTextElement = document.getElementById('statusText');
        presetButtons = document.querySelectorAll('.preset-btn');
        applyButton = document.getElementById('applyBtn');
        resetButton = document.getElementById('resetBtn');
        themeButtons = document.querySelectorAll('.theme-btn');

        // Set up event listeners
        setupEventListeners();

        // Load saved preferences and check status
        loadSavedTheme();
        loadSavedPreference();
        checkClaudeTabStatus();
    }

    /**
     * Set up all event listeners for interactive elements.
     */
    function setupEventListeners() {
        // Slider input (live preview)
        sliderElement.addEventListener('input', handleSliderInput);
        
        // Slider change (final value)
        sliderElement.addEventListener('change', handleSliderChange);

        // Preset buttons
        presetButtons.forEach(button => {
            button.addEventListener('click', handlePresetClick);
        });

        // Apply button
        applyButton.addEventListener('click', handleApplyClick);

        // Reset button
        resetButton.addEventListener('click', handleResetClick);

        // Keyboard accessibility for slider
        sliderElement.addEventListener('keydown', handleSliderKeydown);

        // Theme buttons
        themeButtons.forEach(button => {
            button.addEventListener('click', handleThemeClick);
        });
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    /**
     * Handle slider input (fires continuously while dragging).
     * Updates visual preview without saving.
     * 
     * @param {InputEvent} event - The input event
     */
    function handleSliderInput(event) {
        const value = parseInt(event.target.value, 10);
        selectedWidth = value;
        updateDisplay(value);
        updatePresetHighlight(value);
    }

    /**
     * Handle slider change (fires when dragging stops).
     * Could be used for auto-save if desired.
     * 
     * @param {Event} event - The change event
     */
    function handleSliderChange(event) {
        const value = parseInt(event.target.value, 10);
        selectedWidth = value;
        // Auto-apply on change for better UX
        saveAndApplyWidth(value);
    }

    /**
     * Handle preset button clicks.
     * 
     * @param {MouseEvent} event - The click event
     */
    function handlePresetClick(event) {
        const button = event.currentTarget;
        const width = parseInt(button.dataset.width, 10);
        
        if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
            selectedWidth = width;
            sliderElement.value = width;
            updateDisplay(width);
            updatePresetHighlight(width);
            saveAndApplyWidth(width);
        }
    }

    /**
     * Handle Apply button click.
     */
    function handleApplyClick() {
        saveAndApplyWidth(selectedWidth);
        showApplyFeedback();
    }

    /**
     * Handle Reset button click.
     */
    function handleResetClick() {
        selectedWidth = DEFAULT_WIDTH;
        sliderElement.value = DEFAULT_WIDTH;
        updateDisplay(DEFAULT_WIDTH);
        updatePresetHighlight(DEFAULT_WIDTH);
        saveAndApplyWidth(DEFAULT_WIDTH);
    }

    /**
     * Handle keyboard navigation on slider for accessibility.
     * 
     * @param {KeyboardEvent} event - The keydown event
     */
    function handleSliderKeydown(event) {
        // Add larger jumps with Page Up/Down
        if (event.key === 'PageUp') {
            event.preventDefault();
            const newValue = Math.min(MAX_WIDTH, selectedWidth + 10);
            sliderElement.value = newValue;
            selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
        } else if (event.key === 'PageDown') {
            event.preventDefault();
            const newValue = Math.max(MIN_WIDTH, selectedWidth - 10);
            sliderElement.value = newValue;
            selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
        }
    }

    /**
     * Handle theme button clicks.
     *
     * @param {MouseEvent} event - The click event
     */
    function handleThemeClick(event) {
        const button = event.currentTarget;
        const theme = button.dataset.theme;

        if (VALID_THEMES.includes(theme)) {
            currentTheme = theme;
            applyTheme(theme);
            updateThemeButtons(theme);
            saveTheme(theme);
        }
    }

    // =========================================================================
    // UI UPDATES
    // =========================================================================

    /**
     * Update all display elements to reflect current width value.
     * 
     * @param {number} width - Width percentage to display
     */
    function updateDisplay(width) {
        // Update numeric display
        widthValueElement.textContent = width;
        
        // Add pulse animation
        widthValueElement.classList.add('updating');
        setTimeout(() => widthValueElement.classList.remove('updating'), 150);
        
        // Update slider ARIA attribute
        sliderElement.setAttribute('aria-valuenow', width);
        
        // Update slider visual progress
        const progress = ((width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)) * 100;
        sliderElement.style.setProperty('--slider-progress', `${progress}%`);
        
        // Update preview bar width
        previewBarElement.style.width = `${width}%`;
    }

    /**
     * Highlight the preset button matching current width, if any.
     *
     * @param {number} width - Current width value
     */
    function updatePresetHighlight(width) {
        presetButtons.forEach(button => {
            const presetWidth = parseInt(button.dataset.width, 10);
            button.classList.toggle('active', presetWidth === width);
        });
    }

    /**
     * Apply theme to the document.
     *
     * @param {string} theme - Theme to apply ('light', 'dark', or 'system')
     */
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    /**
     * Update theme button states.
     *
     * @param {string} activeTheme - Currently active theme
     */
    function updateThemeButtons(activeTheme) {
        themeButtons.forEach(button => {
            const isActive = button.dataset.theme === activeTheme;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    /**
     * Update status indicator based on current tab.
     * 
     * @param {boolean} active - Whether on claude.ai tab
     * @param {string} [message] - Optional status message
     */
    function updateStatus(active, message) {
        statusDotElement.classList.remove('active', 'inactive', 'error');
        
        if (active) {
            statusDotElement.classList.add('active');
            statusTextElement.textContent = message || 'Active on claude.ai';
        } else {
            statusDotElement.classList.add('inactive');
            statusTextElement.textContent = message || 'Not on claude.ai';
        }
    }

    /**
     * Show visual feedback when apply button is clicked.
     * Uses DOM manipulation instead of innerHTML for security.
     */
    function showApplyFeedback() {
        // Store original children
        const originalChildren = Array.from(applyButton.childNodes).map(node => node.cloneNode(true));

        // Clear and rebuild with saved state
        applyButton.textContent = '';

        // Create checkmark SVG using DOM APIs
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'btn-icon');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z');
        path.setAttribute('fill', 'currentColor');

        svg.appendChild(path);
        applyButton.appendChild(svg);
        applyButton.appendChild(document.createTextNode(' Saved!'));
        applyButton.disabled = true;

        setTimeout(() => {
            applyButton.textContent = '';
            originalChildren.forEach(child => applyButton.appendChild(child));
            applyButton.disabled = false;
        }, 1000);
    }

    // =========================================================================
    // STORAGE OPERATIONS
    // =========================================================================

    /**
     * Load saved theme preference from storage.
     */
    async function loadSavedTheme() {
        try {
            const result = await browser.storage.local.get(THEME_STORAGE_KEY);
            const stored = result[THEME_STORAGE_KEY];

            if (stored && VALID_THEMES.includes(stored)) {
                currentTheme = stored;
            } else {
                currentTheme = DEFAULT_THEME;
            }

            applyTheme(currentTheme);
            updateThemeButtons(currentTheme);

        } catch (error) {
            console.error('[Claude Width Popup] Error loading theme:', error);
            // Use default theme on error
            applyTheme(DEFAULT_THEME);
            updateThemeButtons(DEFAULT_THEME);
        }
    }

    /**
     * Save theme preference to storage.
     *
     * @param {string} theme - Theme to save
     */
    async function saveTheme(theme) {
        try {
            await browser.storage.local.set({ [THEME_STORAGE_KEY]: theme });
            console.log(`[Claude Width Popup] Saved theme: ${theme}`);
        } catch (error) {
            console.error('[Claude Width Popup] Error saving theme:', error);
        }
    }

    /**
     * Load saved width preference from storage.
     */
    async function loadSavedPreference() {
        try {
            const result = await browser.storage.local.get(STORAGE_KEY);
            const stored = result[STORAGE_KEY];
            
            if (typeof stored === 'number' && stored >= MIN_WIDTH && stored <= MAX_WIDTH) {
                savedWidth = stored;
                selectedWidth = stored;
            } else {
                savedWidth = DEFAULT_WIDTH;
                selectedWidth = DEFAULT_WIDTH;
            }
            
            // Update UI with loaded value
            sliderElement.value = selectedWidth;
            updateDisplay(selectedWidth);
            updatePresetHighlight(selectedWidth);
            
        } catch (error) {
            console.error('[Claude Width Popup] Error loading preference:', error);
            // Use defaults on error
            sliderElement.value = DEFAULT_WIDTH;
            updateDisplay(DEFAULT_WIDTH);
        }
    }

    /**
     * Save width preference to storage and notify content scripts.
     * 
     * @param {number} width - Width percentage to save
     */
    async function saveAndApplyWidth(width) {
        try {
            // Save to storage
            await browser.storage.local.set({ [STORAGE_KEY]: width });
            savedWidth = width;
            
            console.log(`[Claude Width Popup] Saved width: ${width}%`);
            
            // Notify all claude.ai tabs
            notifyClaudeTabs(width);
            
        } catch (error) {
            console.error('[Claude Width Popup] Error saving preference:', error);
            updateStatus(false, 'Error saving');
        }
    }

    // =========================================================================
    // TAB COMMUNICATION
    // =========================================================================

    /**
     * Check if user is currently on a claude.ai tab.
     */
    async function checkClaudeTabStatus() {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            
            if (tabs.length > 0) {
                const currentTab = tabs[0];
                isOnClaudeTab = currentTab.url && currentTab.url.includes('claude.ai');
                
                if (isOnClaudeTab) {
                    // Try to get status from content script
                    try {
                        const response = await browser.tabs.sendMessage(currentTab.id, { action: 'getStatus' });
                        if (response && response.success) {
                            updateStatus(true, `Active (${response.currentWidth}%)`);
                        } else {
                            updateStatus(true);
                        }
                    } catch (e) {
                        // Content script might not be loaded yet
                        updateStatus(true, 'Active on claude.ai');
                    }
                } else {
                    updateStatus(false, 'Open claude.ai to use');
                }
            }
        } catch (error) {
            console.error('[Claude Width Popup] Error checking tab:', error);
            updateStatus(false, 'Unable to check tab');
        }
    }

    /**
     * Send width update to all claude.ai tabs.
     * 
     * @param {number} width - New width value to apply
     */
    async function notifyClaudeTabs(width) {
        try {
            const tabs = await browser.tabs.query({ url: '*://claude.ai/*' });
            
            for (const tab of tabs) {
                try {
                    await browser.tabs.sendMessage(tab.id, {
                        action: 'updateWidth',
                        width: width
                    });
                } catch (e) {
                    // Tab might not have content script loaded
                    console.log(`[Claude Width Popup] Could not notify tab ${tab.id}`);
                }
            }
            
            if (tabs.length > 0) {
                updateStatus(true, `Applied to ${tabs.length} tab${tabs.length > 1 ? 's' : ''}`);
            }
        } catch (error) {
            console.error('[Claude Width Popup] Error notifying tabs:', error);
        }
    }

    // =========================================================================
    // ENTRY POINT
    // =========================================================================

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
