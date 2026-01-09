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
 * - Custom preset management (create, edit, delete, reorder)
 * - Favorites and drag-and-drop reordering
 * - Recently used widths tracking
 * - Persistent storage of user preferences
 * - Live updates to all open claude.ai tabs
 * - Status indication showing if extension is active
 * - Full keyboard navigation support
 * - Screen reader announcements
 *
 * Keyboard Shortcuts (popup):
 * - 1: Select Narrow (50%)
 * - 2: Select Medium (70%)
 * - 3: Select Wide (85%)
 * - 4: Select Full (100%)
 * - R: Reset to default (85%)
 * - Escape: Close popup
 * - Alt+Up/Down: Reorder custom presets
 *
 * @author DoubleGate
 * @version 1.9.1
 * @license MIT
 *
 * Changelog:
 * - v1.9.0: Sync & Profiles - profile management, browser sync, import/export
 * - v1.8.3: Fixed visibility toggles, bubble styles, code block features using data attributes
 * - v1.8.2: Technical debt remediation, CSS custom properties, state consolidation
 * - v1.8.1: Fixed real-time enhanced styling updates
 * - v1.8.0: Enhanced styling - typography, display modes, code blocks, visual tweaks, default 85%
 * - v1.7.0: Custom presets, drag-and-drop, favorites, recent widths, default 70%
 * - v1.6.0: Keyboard shortcuts, accessibility, badge
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
        STORAGE_KEY,
        THEME_STORAGE_KEY,
        DEFAULT_THEME,
        VALID_THEMES,
        ENHANCED_KEYS,
        ENHANCED_DEFAULTS,
        DISPLAY_MODE_PRESETS,
        MAX_CUSTOM_PRESETS,
        MAX_RECENT_WIDTHS,
        BUILT_IN_PRESETS,
        TIMING,
        PROFILE_STORAGE_KEYS
    } = window.ClaudeWidthConstants;

    // =========================================================================
    // LOCAL CONSTANTS (specific to popup)
    // =========================================================================

    /**
     * Preset width configurations mapped by keyboard key.
     * Derived from BUILT_IN_PRESETS to avoid duplication.
     * Keys 1-4 map to the first 4 built-in presets.
     * @type {Object<string, {width: number, name: string}>}
     */
    const PRESET_KEYS = BUILT_IN_PRESETS.reduce((acc, preset, index) => {
        const key = String(index + 1);
        acc[key] = { width: preset.width, name: preset.name };
        return acc;
    }, {});

    /**
     * Preset names by width value.
     * Derived from BUILT_IN_PRESETS to avoid duplication.
     * @type {Object<number, string>}
     */
    const PRESETS = BUILT_IN_PRESETS.reduce((acc, preset) => {
        acc[preset.width] = preset.name;
        return acc;
    }, {});

    /**
     * Theme display names for announcements.
     * @type {Object<string, string>}
     */
    const THEME_NAMES = {
        'light': 'Light',
        'dark': 'Dark',
        'system': 'System'
    };

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
     * @type {HTMLSpanElement}
     */
    let nonDefaultIndicator;

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

    /**
     * Screen reader announcements element.
     * @type {HTMLElement}
     */
    let srAnnouncements;

    /**
     * Custom presets section container.
     * @type {HTMLElement}
     */
    let customPresetsContainer;

    /**
     * Custom presets list.
     * @type {HTMLElement}
     */
    let customPresetsList;

    /**
     * Save current button.
     * @type {HTMLButtonElement}
     */
    let saveCurrentBtn;

    /**
     * New preset form.
     * @type {HTMLElement}
     */
    let newPresetForm;

    /**
     * New preset name input.
     * @type {HTMLInputElement}
     */
    let newPresetNameInput;

    /**
     * Edit modal overlay.
     * @type {HTMLElement}
     */
    let editModal;

    /**
     * Edit preset name input.
     * @type {HTMLInputElement}
     */
    let editPresetNameInput;

    /**
     * Edit preset width input.
     * @type {HTMLInputElement}
     */
    let editPresetWidthInput;

    /**
     * Recently used container.
     * @type {HTMLElement}
     */
    let recentlyUsedContainer;

    /**
     * Recently used list.
     * @type {HTMLElement}
     */
    let recentlyUsedList;

    /**
     * Profile select dropdown (v1.9.0).
     * @type {HTMLSelectElement}
     */
    let profileSelect;

    /**
     * Manage profiles button (v1.9.0).
     * @type {HTMLButtonElement}
     */
    let manageProfilesBtn;

    /**
     * Sync indicator element (v1.9.0).
     * @type {HTMLElement}
     */
    let syncIndicator;

    // =========================================================================
    // CONSOLIDATED STATE MANAGEMENT
    // =========================================================================

    /**
     * Centralized popup state object.
     * Consolidates all popup state variables into a single object for:
     * - Easier debugging (inspect state.* in console)
     * - Better organization of related state
     * - Clearer state initialization and reset patterns
     * - Simplified state persistence if needed in future
     *
     * @type {Object}
     * @property {number} selectedWidth - Currently selected width (may differ from saved during preview)
     * @property {number} savedWidth - Last saved/applied width (used to detect unsaved changes)
     * @property {boolean} isOnClaudeTab - Whether user is currently on a claude.ai tab
     * @property {string} currentTheme - Current theme preference ('light', 'dark', 'system')
     * @property {HTMLElement[]} focusableElements - All focusable elements for focus trap
     * @property {Array<Object>} customPresets - User's custom presets with id, name, width, favorite, order
     * @property {number[]} recentWidths - Recently used width values
     * @property {string|null} editingPresetId - ID of preset currently being edited, or null
     * @property {HTMLElement|null} dragTarget - Current drag target element during drag-drop
     * @property {Object} enhancedSettings - Enhanced styling settings (v1.8.0)
     * @property {boolean} advancedExpanded - Whether advanced section is expanded
     */
    const state = {
        // Width state
        selectedWidth: DEFAULT_WIDTH,
        savedWidth: DEFAULT_WIDTH,

        // Tab state
        isOnClaudeTab: false,

        // Theme state
        currentTheme: DEFAULT_THEME,

        // UI state
        focusableElements: [],
        advancedExpanded: false,

        // Presets state
        customPresets: [],
        recentWidths: [],

        // Interaction state (modal editing, drag-drop)
        editingPresetId: null,
        dragTarget: null,

        // Enhanced styling state (v1.8.0)
        enhancedSettings: { ...ENHANCED_DEFAULTS },

        // Profile state (v1.9.0)
        activeProfileId: 'default',
        activeProfileName: 'Default',
        profiles: {},
        syncEnabled: false
    };

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
        nonDefaultIndicator = document.getElementById('nonDefaultIndicator');
        presetButtons = document.querySelectorAll('.preset-btn');
        applyButton = document.getElementById('applyBtn');
        resetButton = document.getElementById('resetBtn');
        themeButtons = document.querySelectorAll('.theme-btn');
        srAnnouncements = document.getElementById('srAnnouncements');

        // Custom presets elements
        customPresetsContainer = document.getElementById('customPresetsSection');
        customPresetsList = document.getElementById('customPresetsList');
        saveCurrentBtn = document.getElementById('saveCurrentBtn');
        newPresetForm = document.getElementById('newPresetForm');
        newPresetNameInput = document.getElementById('newPresetName');

        // Edit modal elements
        editModal = document.getElementById('editPresetModal');
        editPresetNameInput = document.getElementById('editPresetName');
        editPresetWidthInput = document.getElementById('editPresetWidth');

        // Recently used elements
        recentlyUsedContainer = document.getElementById('recentlyUsedSection');
        recentlyUsedList = document.getElementById('recentlyUsedList');

        // Profile elements (v1.9.0)
        profileSelect = document.getElementById('profileSelect');
        manageProfilesBtn = document.getElementById('manageProfilesBtn');
        syncIndicator = document.getElementById('syncIndicator');

        // Set up event listeners
        setupEventListeners();

        // Cache focusable elements for focus trap
        cacheFocusableElements();

        // Load saved preferences and check status
        loadSavedTheme();
        loadSavedPreference();
        loadCustomPresets();
        loadRecentWidths();
        loadEnhancedSettings();
        loadProfiles();
        checkClaudeTabStatus();

        // Set up enhanced styling event listeners (v1.8.0)
        setupEnhancedStyleListeners();

        // Set up profile event listeners (v1.9.0)
        setupProfileListeners();

        // Set initial focus to slider after a brief delay
        setTimeout(() => {
            sliderElement.focus();
        }, 100);
    }

    /**
     * Cache all focusable elements for focus trap functionality.
     */
    function cacheFocusableElements() {
        const selector = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"]), details summary';
        state.focusableElements = Array.from(document.querySelectorAll(selector))
            .filter(el => !el.disabled && el.offsetParent !== null);
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

        // Global keyboard shortcuts for popup
        document.addEventListener('keydown', handleGlobalKeydown);

        // Focus trap
        document.addEventListener('keydown', handleFocusTrap);

        // Custom preset events
        if (saveCurrentBtn) {
            saveCurrentBtn.addEventListener('click', handleSaveCurrentClick);
        }

        // New preset form
        const confirmNewPresetBtn = document.getElementById('confirmNewPreset');
        const cancelNewPresetBtn = document.getElementById('cancelNewPreset');
        if (confirmNewPresetBtn) {
            confirmNewPresetBtn.addEventListener('click', handleConfirmNewPreset);
        }
        if (cancelNewPresetBtn) {
            cancelNewPresetBtn.addEventListener('click', handleCancelNewPreset);
        }
        if (newPresetNameInput) {
            newPresetNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmNewPreset();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancelNewPreset();
                }
            });
        }

        // Edit modal events
        const saveEditBtn = document.getElementById('saveEditBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const deletePresetBtn = document.getElementById('deletePresetBtn');
        if (saveEditBtn) {
            saveEditBtn.addEventListener('click', handleSaveEdit);
        }
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', handleCancelEdit);
        }
        if (deletePresetBtn) {
            deletePresetBtn.addEventListener('click', handleDeletePreset);
        }

        // Modal backdrop click
        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal) {
                    handleCancelEdit();
                }
            });
        }

        // Modal keyboard
        if (editModal) {
            editModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    handleCancelEdit();
                }
            });
        }
    }

    // =========================================================================
    // UTILITY FUNCTIONS
    // =========================================================================

    /**
     * Generate a UUID for custom presets.
     * @returns {string} A unique identifier
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Escape HTML to prevent XSS.
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        state.selectedWidth = value;
        updateDisplay(value);
        updatePresetHighlight(value);
        updateUnsavedIndicator();
    }

    /**
     * Handle slider change (fires when dragging stops).
     * Saves and announces the change.
     *
     * @param {Event} event - The change event
     */
    function handleSliderChange(event) {
        const value = parseInt(event.target.value, 10);
        state.selectedWidth = value;
        // Auto-apply on change for better UX
        saveAndApplyWidth(value);
        announceChange(`Width set to ${value} percent`);
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
            selectPreset(width);
        }
    }

    /**
     * Select a preset width and apply it.
     *
     * @param {number} width - Width value to set
     */
    function selectPreset(width) {
        state.selectedWidth = width;
        sliderElement.value = width;
        updateDisplay(width);
        updatePresetHighlight(width);
        saveAndApplyWidth(width);

        const presetName = PRESETS[width] || '';
        if (presetName) {
            announceChange(`${presetName} preset selected, ${width} percent width`);
        } else {
            announceChange(`Width set to ${width} percent`);
        }
    }

    /**
     * Handle Apply button click.
     */
    function handleApplyClick() {
        saveAndApplyWidth(state.selectedWidth);
        showApplyFeedback();
        announceChange(`Width applied: ${state.selectedWidth} percent`);
    }

    /**
     * Handle Reset button click.
     */
    function handleResetClick() {
        state.selectedWidth = DEFAULT_WIDTH;
        sliderElement.value = DEFAULT_WIDTH;
        updateDisplay(DEFAULT_WIDTH);
        updatePresetHighlight(DEFAULT_WIDTH);
        saveAndApplyWidth(DEFAULT_WIDTH);
        announceChange(`Width reset to default, ${DEFAULT_WIDTH} percent`);
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
            const newValue = Math.min(MAX_WIDTH, state.selectedWidth + 10);
            sliderElement.value = newValue;
            state.selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
            saveAndApplyWidth(newValue);
            announceChange(`Width set to ${newValue} percent`);
        } else if (event.key === 'PageDown') {
            event.preventDefault();
            const newValue = Math.max(MIN_WIDTH, state.selectedWidth - 10);
            sliderElement.value = newValue;
            state.selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
            saveAndApplyWidth(newValue);
            announceChange(`Width set to ${newValue} percent`);
        } else if (event.key === 'Home') {
            event.preventDefault();
            sliderElement.value = MIN_WIDTH;
            state.selectedWidth = MIN_WIDTH;
            updateDisplay(MIN_WIDTH);
            updatePresetHighlight(MIN_WIDTH);
            saveAndApplyWidth(MIN_WIDTH);
            announceChange(`Width set to minimum, ${MIN_WIDTH} percent`);
        } else if (event.key === 'End') {
            event.preventDefault();
            sliderElement.value = MAX_WIDTH;
            state.selectedWidth = MAX_WIDTH;
            updateDisplay(MAX_WIDTH);
            updatePresetHighlight(MAX_WIDTH);
            saveAndApplyWidth(MAX_WIDTH);
            announceChange(`Width set to maximum, ${MAX_WIDTH} percent`);
        }
    }

    /**
     * Handle global keyboard shortcuts for the popup.
     *
     * @param {KeyboardEvent} event - The keydown event
     */
    function handleGlobalKeydown(event) {
        // Don't handle if modal is open
        if (editModal && !editModal.hidden) {
            return;
        }

        // Don't handle if user is in a text input
        if (event.target.tagName === 'INPUT' && event.target.type === 'text') {
            return;
        }

        // Alt + Arrow for reordering custom presets
        if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
            const focusedItem = document.activeElement.closest('.custom-preset-item');
            if (focusedItem && focusedItem.dataset.id) {
                event.preventDefault();
                const direction = event.key === 'ArrowUp' ? -1 : 1;
                reorderPreset(focusedItem.dataset.id, direction);
                return;
            }
        }

        // Don't handle other keys if modifier keys are pressed
        if (event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        const key = event.key.toLowerCase();

        // Number keys 1-4 for presets
        if (PRESET_KEYS[key]) {
            event.preventDefault();
            selectPreset(PRESET_KEYS[key].width);
            return;
        }

        // R key for reset
        if (key === 'r' && event.target !== sliderElement) {
            event.preventDefault();
            handleResetClick();
            return;
        }

        // Escape to close popup
        if (event.key === 'Escape') {
            event.preventDefault();
            window.close();
            return;
        }
    }

    /**
     * Handle focus trap to keep focus within popup.
     *
     * @param {KeyboardEvent} event - The keydown event
     */
    function handleFocusTrap(event) {
        if (event.key !== 'Tab') return;

        // If modal is open, trap focus in modal
        if (editModal && !editModal.hidden) {
            const modalFocusable = editModal.querySelectorAll('button:not([disabled]), input:not([disabled])');
            if (modalFocusable.length === 0) return;

            const first = modalFocusable[0];
            const last = modalFocusable[modalFocusable.length - 1];

            if (event.shiftKey) {
                if (document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
            return;
        }

        const firstElement = state.focusableElements[0];
        const lastElement = state.focusableElements[state.focusableElements.length - 1];

        if (event.shiftKey) {
            // Shift + Tab: going backwards
            if (document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: going forwards
            if (document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
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
            state.currentTheme = theme;
            applyTheme(theme);
            updateThemeButtons(theme);
            saveTheme(theme);
            announceChange(`Theme changed to ${THEME_NAMES[theme]}`);
        }
    }

    // =========================================================================
    // CUSTOM PRESETS
    // =========================================================================

    /**
     * Load custom presets from storage.
     */
    async function loadCustomPresets() {
        try {
            const result = await browser.storage.local.get('customPresets');
            state.customPresets = result.customPresets || [];
            renderCustomPresets();
        } catch (error) {
            console.error('[Claude Width Popup] Error loading custom presets:', error);
            state.customPresets = [];
            renderCustomPresets();
        }
    }

    /**
     * Save custom presets to storage.
     */
    async function saveCustomPresets() {
        try {
            await browser.storage.local.set({ customPresets: state.customPresets });
            // Request context menu rebuild
            try {
                await browser.runtime.sendMessage({ action: 'rebuildContextMenu' });
            } catch (e) {
                // Background script might not be ready
            }
        } catch (error) {
            console.error('[Claude Width Popup] Error saving custom presets:', error);
        }
    }

    /**
     * Render the custom presets list.
     */
    function renderCustomPresets() {
        if (!customPresetsList) return;

        // Clear existing list
        customPresetsList.textContent = '';

        // Sort by order
        const sorted = [...state.customPresets].sort((a, b) => (a.order || 0) - (b.order || 0));

        sorted.forEach((preset, index) => {
            const item = createCustomPresetItem(preset, index);
            customPresetsList.appendChild(item);
        });

        // Update save button visibility
        if (saveCurrentBtn) {
            saveCurrentBtn.disabled = state.customPresets.length >= MAX_CUSTOM_PRESETS;
        }

        // Update custom presets container visibility and empty state
        if (customPresetsContainer) {
            const hasPresets = state.customPresets.length > 0;
            customPresetsContainer.classList.toggle('has-presets', hasPresets);
            customPresetsContainer.classList.toggle('empty', !hasPresets);

            // Update section header count
            const headerCount = customPresetsContainer.querySelector('.preset-count');
            if (headerCount) {
                headerCount.textContent = `(${state.customPresets.length}/${MAX_CUSTOM_PRESETS})`;
            }
        }

        // Update focusable elements cache
        cacheFocusableElements();
    }

    // =========================================================================
    // DOM ELEMENT FACTORY HELPERS (Extracted from createCustomPresetItem)
    // =========================================================================

    /**
     * Create an SVG element with the specified attributes and path.
     *
     * @param {string} pathData - The SVG path data (d attribute)
     * @param {Object} [options={}] - Optional settings
     * @param {string} [options.viewBox='0 0 16 16'] - The viewBox attribute
     * @param {string} [options.fill='currentColor'] - The fill color
     * @returns {SVGElement} The created SVG element
     */
    function createSvgIcon(pathData, options = {}) {
        const { viewBox = '0 0 16 16', fill = 'currentColor' } = options;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', viewBox);
        svg.setAttribute('fill', fill);
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        svg.appendChild(path);

        return svg;
    }

    /**
     * Create an icon button with SVG icon.
     *
     * @param {Object} options - Button configuration
     * @param {string} options.className - CSS class name
     * @param {string} options.ariaLabel - ARIA label for accessibility
     * @param {string} options.title - Tooltip text
     * @param {string} options.iconPath - SVG path data
     * @returns {HTMLButtonElement} The created button element
     */
    function createIconButton({ className, ariaLabel, title, iconPath }) {
        const btn = document.createElement('button');
        btn.className = className;
        btn.type = 'button';
        btn.setAttribute('aria-label', ariaLabel);
        btn.title = title;
        btn.appendChild(createSvgIcon(iconPath));
        return btn;
    }

    // SVG path constants for commonly used icons
    const SVG_PATHS = {
        drag: 'M2 4h12v1H2V4zm0 3.5h12v1H2v-1zm0 3.5h12v1H2v-1z',
        edit: 'M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z',
        starFilled: 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z',
        starOutline: 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694z'
    };

    // =========================================================================
    // CUSTOM PRESET ITEM CREATION
    // =========================================================================

    /**
     * Create a custom preset list item element using DOM methods.
     * Refactored to use helper functions for better readability and maintainability.
     *
     * @param {Object} preset - The preset object
     * @param {number} index - The index in the sorted array
     * @returns {HTMLElement} The list item element
     */
    function createCustomPresetItem(preset, index) {
        // Create container
        const item = document.createElement('div');
        item.className = 'custom-preset-item';
        item.dataset.id = preset.id;
        item.dataset.index = String(index);
        item.draggable = true;
        item.setAttribute('aria-posinset', String(index + 1));
        item.setAttribute('aria-setsize', String(state.customPresets.length));

        // Create drag handle using helper
        const dragHandle = createIconButton({
            className: 'drag-handle',
            ariaLabel: `Reorder ${preset.name}, use Alt+Arrow keys`,
            title: 'Drag to reorder',
            iconPath: SVG_PATHS.drag
        });
        dragHandle.tabIndex = 0;

        // Create apply button with name and width
        const applyBtn = document.createElement('button');
        applyBtn.className = 'preset-apply-btn';
        applyBtn.type = 'button';
        applyBtn.setAttribute('aria-label', `Apply ${escapeHtml(preset.name)} preset (${preset.width}%)`);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'preset-name';
        nameSpan.textContent = preset.name;

        const widthSpan = document.createElement('span');
        widthSpan.className = 'preset-width';
        widthSpan.textContent = `${preset.width}%`;

        applyBtn.appendChild(nameSpan);
        applyBtn.appendChild(widthSpan);

        // Create favorite button using helper
        const isFavorite = preset.favorite;
        const favBtn = createIconButton({
            className: 'favorite-btn' + (isFavorite ? ' active' : ''),
            ariaLabel: isFavorite ? `Remove ${preset.name} from favorites` : `Add ${preset.name} to favorites`,
            title: isFavorite ? 'Remove from favorites' : 'Add to favorites',
            iconPath: isFavorite ? SVG_PATHS.starFilled : SVG_PATHS.starOutline
        });
        favBtn.setAttribute('aria-pressed', String(isFavorite));

        // Create edit button using helper
        const editBtn = createIconButton({
            className: 'edit-btn',
            ariaLabel: `Edit ${preset.name}`,
            title: 'Edit preset',
            iconPath: SVG_PATHS.edit
        });

        // Append all elements
        item.appendChild(dragHandle);
        item.appendChild(applyBtn);
        item.appendChild(favBtn);
        item.appendChild(editBtn);

        // Attach event listeners
        attachPresetItemListeners(item, applyBtn, favBtn, editBtn, preset);

        return item;
    }

    /**
     * Attach event listeners to a custom preset item.
     * Extracted for testability and clarity.
     *
     * @param {HTMLElement} item - The preset item container
     * @param {HTMLButtonElement} applyBtn - The apply button
     * @param {HTMLButtonElement} favBtn - The favorite button
     * @param {HTMLButtonElement} editBtn - The edit button
     * @param {Object} preset - The preset data
     */
    function attachPresetItemListeners(item, applyBtn, favBtn, editBtn, preset) {
        // Click handlers
        applyBtn.addEventListener('click', () => handleApplyCustomPreset(preset));
        favBtn.addEventListener('click', () => handleToggleFavorite(preset.id));
        editBtn.addEventListener('click', () => openEditModal(preset));

        // Drag handlers
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);
    }

    /**
     * Handle applying a custom preset.
     *
     * @param {Object} preset - The preset to apply
     */
    function handleApplyCustomPreset(preset) {
        selectedWidth = preset.width;
        sliderElement.value = preset.width;
        updateDisplay(preset.width);
        updatePresetHighlight(preset.width);
        saveAndApplyWidth(preset.width);
        announceChange(`${preset.name} preset applied, ${preset.width} percent width`);
    }

    /**
     * Handle toggling favorite status.
     *
     * @param {string} presetId - The preset ID
     */
    function handleToggleFavorite(presetId) {
        const preset = state.customPresets.find(p => p.id === presetId);
        if (preset) {
            preset.favorite = !preset.favorite;
            saveCustomPresets();
            renderCustomPresets();
            announceChange(preset.favorite ? `${preset.name} added to favorites` : `${preset.name} removed from favorites`);
        }
    }

    /**
     * Handle save current width as preset button click.
     */
    function handleSaveCurrentClick() {
        if (state.customPresets.length >= MAX_CUSTOM_PRESETS) {
            announceChange('Maximum number of custom presets reached');
            return;
        }

        if (newPresetForm) {
            newPresetForm.hidden = false;
            if (newPresetNameInput) {
                newPresetNameInput.value = '';
                newPresetNameInput.focus();
            }
        }
    }

    /**
     * Handle confirming new preset creation.
     */
    function handleConfirmNewPreset() {
        if (!newPresetNameInput) return;

        const name = newPresetNameInput.value.trim();
        if (!name) {
            announceChange('Please enter a preset name');
            newPresetNameInput.focus();
            return;
        }

        // Create new preset
        const newPreset = {
            id: generateUUID(),
            name: name,
            width: state.selectedWidth,
            favorite: false,
            order: state.customPresets.length
        };

        state.customPresets.push(newPreset);
        saveCustomPresets();
        renderCustomPresets();

        // Hide form
        if (newPresetForm) {
            newPresetForm.hidden = true;
        }

        announceChange(`Custom preset "${name}" created at ${state.selectedWidth} percent`);
    }

    /**
     * Handle canceling new preset creation.
     */
    function handleCancelNewPreset() {
        if (newPresetForm) {
            newPresetForm.hidden = true;
        }
        if (newPresetNameInput) {
            newPresetNameInput.value = '';
        }
    }

    /**
     * Open the edit modal for a preset.
     *
     * @param {Object} preset - The preset to edit
     */
    function openEditModal(preset) {
        if (!editModal) return;

        state.editingPresetId = preset.id;
        if (editPresetNameInput) {
            editPresetNameInput.value = preset.name;
        }
        if (editPresetWidthInput) {
            editPresetWidthInput.value = preset.width;
        }

        editModal.hidden = false;
        editPresetNameInput.focus();
    }

    /**
     * Handle saving edit changes.
     */
    function handleSaveEdit() {
        if (!state.editingPresetId || !editPresetNameInput || !editPresetWidthInput) return;

        const preset = state.customPresets.find(p => p.id === state.editingPresetId);
        if (!preset) return;

        const newName = editPresetNameInput.value.trim();
        const newWidth = parseInt(editPresetWidthInput.value, 10);

        if (!newName) {
            announceChange('Please enter a preset name');
            editPresetNameInput.focus();
            return;
        }

        if (isNaN(newWidth) || newWidth < MIN_WIDTH || newWidth > MAX_WIDTH) {
            announceChange(`Width must be between ${MIN_WIDTH} and ${MAX_WIDTH}`);
            editPresetWidthInput.focus();
            return;
        }

        preset.name = newName;
        preset.width = newWidth;
        saveCustomPresets();
        renderCustomPresets();

        handleCancelEdit();
        announceChange(`Preset updated to "${newName}" at ${newWidth} percent`);
    }

    /**
     * Handle canceling edit.
     */
    function handleCancelEdit() {
        if (editModal) {
            editModal.hidden = true;
        }
        state.editingPresetId = null;
    }

    /**
     * Handle deleting a preset.
     */
    function handleDeletePreset() {
        if (!state.editingPresetId) return;

        const preset = state.customPresets.find(p => p.id === state.editingPresetId);
        const presetName = preset ? preset.name : 'Preset';

        state.customPresets = state.customPresets.filter(p => p.id !== state.editingPresetId);

        // Re-order remaining presets
        state.customPresets.forEach((p, i) => {
            p.order = i;
        });

        saveCustomPresets();
        renderCustomPresets();

        handleCancelEdit();
        announceChange(`${presetName} deleted`);
    }

    /**
     * Reorder a preset by direction.
     *
     * @param {string} presetId - The preset ID
     * @param {number} direction - -1 for up, 1 for down
     */
    function reorderPreset(presetId, direction) {
        const sorted = [...state.customPresets].sort((a, b) => (a.order || 0) - (b.order || 0));
        const index = sorted.findIndex(p => p.id === presetId);

        if (index === -1) return;

        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sorted.length) return;

        // Swap orders
        const temp = sorted[index].order;
        sorted[index].order = sorted[newIndex].order;
        sorted[newIndex].order = temp;

        saveCustomPresets();
        renderCustomPresets();

        // Re-focus the moved item
        setTimeout(() => {
            const movedItem = document.querySelector(`.custom-preset-item[data-id="${presetId}"]`);
            if (movedItem) {
                const dragHandle = movedItem.querySelector('.drag-handle');
                if (dragHandle) {
                    dragHandle.focus();
                }
            }
        }, TIMING.SR_ANNOUNCE_DELAY_MS);

        announceChange(`Preset moved ${direction < 0 ? 'up' : 'down'}`);
    }

    // =========================================================================
    // DRAG AND DROP
    // =========================================================================

    /**
     * Handle drag start.
     *
     * @param {DragEvent} event
     */
    function handleDragStart(event) {
        const item = event.target.closest('.custom-preset-item');
        if (!item) return;

        state.dragTarget = item;
        item.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.dataset.id);
    }

    /**
     * Handle drag end.
     *
     * @param {DragEvent} event
     */
    function handleDragEnd(event) {
        const item = event.target.closest('.custom-preset-item');
        if (item) {
            item.classList.remove('dragging');
        }
        state.dragTarget = null;

        // Remove all drag-over states
        document.querySelectorAll('.custom-preset-item.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    /**
     * Handle drag over.
     *
     * @param {DragEvent} event
     */
    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const item = event.target.closest('.custom-preset-item');
        if (item && item !== state.dragTarget) {
            // Remove drag-over from all items
            document.querySelectorAll('.custom-preset-item.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
            item.classList.add('drag-over');
        }
    }

    /**
     * Handle drag leave.
     *
     * @param {DragEvent} event
     */
    function handleDragLeave(event) {
        const item = event.target.closest('.custom-preset-item');
        if (item) {
            item.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop.
     *
     * @param {DragEvent} event
     */
    function handleDrop(event) {
        event.preventDefault();

        const dropTarget = event.target.closest('.custom-preset-item');
        if (!dropTarget || !state.dragTarget || dropTarget === state.dragTarget) return;

        const dragId = state.dragTarget.dataset.id;
        const dropId = dropTarget.dataset.id;

        const dragPreset = state.customPresets.find(p => p.id === dragId);
        const dropPreset = state.customPresets.find(p => p.id === dropId);

        if (dragPreset && dropPreset) {
            // Swap orders
            const tempOrder = dragPreset.order;
            dragPreset.order = dropPreset.order;
            dropPreset.order = tempOrder;

            saveCustomPresets();
            renderCustomPresets();
            announceChange('Preset order updated');
        }

        dropTarget.classList.remove('drag-over');
    }

    // =========================================================================
    // RECENT WIDTHS
    // =========================================================================

    /**
     * Load recent widths from storage.
     */
    async function loadRecentWidths() {
        try {
            const result = await browser.storage.local.get('recentWidths');
            state.recentWidths = result.recentWidths || [];
            renderRecentWidths();
        } catch (error) {
            console.error('[Claude Width Popup] Error loading recent widths:', error);
            state.recentWidths = [];
        }
    }

    /**
     * Render the recently used widths.
     */
    function renderRecentWidths() {
        if (!recentlyUsedList || !recentlyUsedContainer) return;

        // Filter out widths that match built-in or custom presets
        const presetWidths = [...BUILT_IN_PRESETS.map(p => p.width), ...state.customPresets.map(p => p.width)];
        const uniqueRecent = state.recentWidths.filter(w => !presetWidths.includes(w));

        if (uniqueRecent.length === 0) {
            recentlyUsedContainer.hidden = true;
            return;
        }

        recentlyUsedContainer.hidden = false;
        recentlyUsedList.textContent = '';

        uniqueRecent.slice(0, MAX_RECENT_WIDTHS).forEach(width => {
            const btn = document.createElement('button');
            btn.className = 'recent-width-btn';
            btn.type = 'button';
            btn.setAttribute('aria-label', `Apply ${width}% width`);
            btn.textContent = `${width}%`;
            btn.addEventListener('click', () => {
                state.selectedWidth = width;
                sliderElement.value = width;
                updateDisplay(width);
                updatePresetHighlight(width);
                saveAndApplyWidth(width);
                announceChange(`Width set to ${width} percent`);
            });
            recentlyUsedList.appendChild(btn);
        });

        cacheFocusableElements();
    }

    // =========================================================================
    // SCREEN READER ANNOUNCEMENTS
    // =========================================================================

    /**
     * Announce a change to screen readers.
     *
     * @param {string} message - Message to announce
     */
    function announceChange(message) {
        if (srAnnouncements) {
            // Clear first to ensure announcement is made even if same text
            srAnnouncements.textContent = '';

            // Use setTimeout to ensure the DOM updates
            setTimeout(() => {
                srAnnouncements.textContent = message;
            }, TIMING.SR_ANNOUNCE_DELAY_MS);
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
        setTimeout(() => widthValueElement.classList.remove('updating'), TIMING.ANIMATION_MS);

        // Update slider ARIA attributes
        sliderElement.setAttribute('aria-valuenow', width);
        sliderElement.setAttribute('aria-valuetext', `${width} percent`);

        // Update slider visual progress
        const progress = ((width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)) * 100;
        sliderElement.style.setProperty('--slider-progress', `${progress}%`);

        // Update preview bar width
        previewBarElement.style.width = `${width}%`;

        // Update non-default indicator
        updateNonDefaultIndicator(width);
    }

    /**
     * Update the non-default indicator visibility.
     *
     * @param {number} width - Current width value
     */
    function updateNonDefaultIndicator(width) {
        if (nonDefaultIndicator) {
            if (width !== DEFAULT_WIDTH) {
                nonDefaultIndicator.hidden = false;
            } else {
                nonDefaultIndicator.hidden = true;
            }
        }
    }

    /**
     * Update the unsaved changes indicator.
     * Shows visual feedback when slider value differs from saved value.
     */
    function updateUnsavedIndicator() {
        const hasUnsavedChanges = state.selectedWidth !== state.savedWidth;

        // Update Apply button to indicate pending changes
        if (applyButton) {
            if (hasUnsavedChanges) {
                applyButton.classList.add('has-changes');
                applyButton.setAttribute('aria-label', `Apply pending change to ${state.selectedWidth} percent`);
            } else {
                applyButton.classList.remove('has-changes');
                applyButton.setAttribute('aria-label', 'Apply current width setting');
            }
        }

        // Update width display to indicate preview state
        if (widthValueElement) {
            if (hasUnsavedChanges) {
                widthValueElement.classList.add('previewing');
            } else {
                widthValueElement.classList.remove('previewing');
            }
        }
    }

    /**
     * Highlight the preset button matching current width, if any.
     *
     * @param {number} width - Current width value
     */
    function updatePresetHighlight(width) {
        presetButtons.forEach(button => {
            const presetWidth = parseInt(button.dataset.width, 10);
            const isActive = presetWidth === width;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
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
            button.setAttribute('aria-checked', isActive ? 'true' : 'false');
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
        svg.setAttribute('aria-hidden', 'true');

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
                state.currentTheme = stored;
            } else {
                state.currentTheme = DEFAULT_THEME;
            }

            applyTheme(state.currentTheme);
            updateThemeButtons(state.currentTheme);

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
                state.selectedWidth = stored;
                state.savedWidth = stored;
            } else {
                state.selectedWidth = DEFAULT_WIDTH;
                state.savedWidth = DEFAULT_WIDTH;
            }

            // Update UI with loaded value
            sliderElement.value = state.selectedWidth;
            updateDisplay(state.selectedWidth);
            updatePresetHighlight(state.selectedWidth);
            updateUnsavedIndicator();

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
            state.savedWidth = width;
            updateUnsavedIndicator();

            console.log(`[Claude Width Popup] Saved width: ${width}%`);

            // Notify all claude.ai tabs
            notifyClaudeTabs(width);

            // Request badge update and recent widths from background script
            try {
                await browser.runtime.sendMessage({ action: 'updateBadge' });
                await browser.runtime.sendMessage({ action: 'addRecentWidth', width: width });
            } catch (e) {
                // Background script might not be ready
                console.log('[Claude Width Popup] Could not update badge or recent widths');
            }

            // Reload recent widths display
            loadRecentWidths();

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
                state.isOnClaudeTab = currentTab.url && currentTab.url.includes('claude.ai');

                if (state.isOnClaudeTab) {
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
    // ENHANCED STYLING (v1.8.0)
    // =========================================================================

    /**
     * Set up event listeners for enhanced styling controls.
     */
    function setupEnhancedStyleListeners() {
        // Advanced toggle button
        const advancedToggle = document.getElementById('advancedToggle');
        const advancedContent = document.getElementById('advancedContent');

        if (advancedToggle && advancedContent) {
            advancedToggle.addEventListener('click', () => {
                state.advancedExpanded = !state.advancedExpanded;
                advancedContent.hidden = !state.advancedExpanded;
                advancedToggle.setAttribute('aria-expanded', String(state.advancedExpanded));
                advancedToggle.classList.toggle('expanded', state.advancedExpanded);

                // Update focusable elements
                cacheFocusableElements();
            });
        }

        // Font size slider
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                if (fontSizeValue) {
                    fontSizeValue.textContent = `${value}%`;
                }
            });
            fontSizeSlider.addEventListener('change', (e) => {
                const value = parseInt(e.target.value, 10);
                saveEnhancedSetting(ENHANCED_KEYS.FONT_SIZE, value);
                // Switch to custom mode when manually adjusting
                saveEnhancedSetting(ENHANCED_KEYS.DISPLAY_MODE, 'custom');
                updateDisplayModeButtons('custom');
                announceChange(`Font size set to ${value}%`);
            });
        }

        // Option buttons (line height, message padding, code block height, bubble style)
        document.querySelectorAll('.option-btn[data-setting]').forEach(btn => {
            btn.addEventListener('click', () => {
                const setting = btn.dataset.setting;
                let value = btn.dataset.value;

                // Convert numeric values
                if (setting === ENHANCED_KEYS.CODE_BLOCK_HEIGHT) {
                    value = parseInt(value, 10);
                }

                // Update active state
                const group = btn.closest('.control-buttons');
                if (group) {
                    group.querySelectorAll('.option-btn').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-checked', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-checked', 'true');
                }

                saveEnhancedSetting(setting, value);

                // Switch to custom mode when manually adjusting typography
                if (setting === ENHANCED_KEYS.LINE_HEIGHT || setting === ENHANCED_KEYS.MESSAGE_PADDING) {
                    saveEnhancedSetting(ENHANCED_KEYS.DISPLAY_MODE, 'custom');
                    updateDisplayModeButtons('custom');
                }

                announceChange(`${getSettingName(setting)} set to ${btn.textContent}`);
            });
        });

        // Display mode buttons
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;

                // Update active state
                document.querySelectorAll('.mode-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-checked', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-checked', 'true');

                // Apply mode preset (except custom)
                if (mode !== 'custom' && DISPLAY_MODE_PRESETS[mode]) {
                    const preset = DISPLAY_MODE_PRESETS[mode];
                    saveEnhancedSetting(ENHANCED_KEYS.LINE_HEIGHT, preset.lineHeight);
                    saveEnhancedSetting(ENHANCED_KEYS.MESSAGE_PADDING, preset.messagePadding);
                    saveEnhancedSetting(ENHANCED_KEYS.FONT_SIZE, preset.fontSize);

                    // Update UI to reflect preset values
                    updateTypographyUI(preset);
                }

                saveEnhancedSetting(ENHANCED_KEYS.DISPLAY_MODE, mode);
                announceChange(`Display mode set to ${mode}`);
            });
        });

        // Toggle switches
        const codeWrapToggle = document.getElementById('codeWrapToggle');
        if (codeWrapToggle) {
            codeWrapToggle.addEventListener('change', (e) => {
                saveEnhancedSetting(ENHANCED_KEYS.CODE_BLOCK_WRAP, e.target.checked);
                announceChange(`Code block word wrap ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }

        const showTimestampsToggle = document.getElementById('showTimestampsToggle');
        if (showTimestampsToggle) {
            showTimestampsToggle.addEventListener('change', (e) => {
                saveEnhancedSetting(ENHANCED_KEYS.SHOW_TIMESTAMPS, e.target.checked);
                announceChange(`Timestamps ${e.target.checked ? 'shown' : 'hidden'}`);
            });
        }

        const showAvatarsToggle = document.getElementById('showAvatarsToggle');
        if (showAvatarsToggle) {
            showAvatarsToggle.addEventListener('change', (e) => {
                saveEnhancedSetting(ENHANCED_KEYS.SHOW_AVATARS, e.target.checked);
                announceChange(`Avatars ${e.target.checked ? 'shown' : 'hidden'}`);
            });
        }

        // Toggle code blocks button
        const toggleCodeBlocksBtn = document.getElementById('toggleCodeBlocksBtn');
        if (toggleCodeBlocksBtn) {
            toggleCodeBlocksBtn.addEventListener('click', async () => {
                const currentState = state.enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED];
                const newState = !currentState;
                saveEnhancedSetting(ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED, newState);
                updateCodeBlocksButtonText(newState);
                announceChange(`Code blocks ${newState ? 'collapsed' : 'expanded'}`);

                // Notify content script to toggle
                try {
                    const tabs = await browser.tabs.query({ url: '*://claude.ai/*' });
                    for (const tab of tabs) {
                        try {
                            await browser.tabs.sendMessage(tab.id, {
                                action: 'toggleCodeBlocks',
                                collapse: newState
                            });
                        } catch (e) {
                            // Tab might not have content script
                        }
                    }
                } catch (e) {
                    console.error('[Claude Width Popup] Error toggling code blocks:', e);
                }
            });
        }

        // Reset all styles button
        const resetAllStylesBtn = document.getElementById('resetAllStylesBtn');
        if (resetAllStylesBtn) {
            resetAllStylesBtn.addEventListener('click', async () => {
                await resetAllEnhancedStyles();
                announceChange('All styles reset to defaults');
            });
        }
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
                    state.enhancedSettings[key] = result[key];
                }
            }

            // Update UI to reflect loaded settings
            updateEnhancedStyleUI();
            console.log('[Claude Width Popup] Enhanced settings loaded:', state.enhancedSettings);
        } catch (error) {
            console.error('[Claude Width Popup] Error loading enhanced settings:', error);
        }
    }

    /**
     * Save an enhanced styling setting.
     *
     * @param {string} key - The setting key
     * @param {*} value - The value to save
     */
    async function saveEnhancedSetting(key, value) {
        try {
            state.enhancedSettings[key] = value;
            await browser.storage.local.set({ [key]: value });
            console.log(`[Claude Width Popup] Saved ${key}: ${value}`);
        } catch (error) {
            console.error(`[Claude Width Popup] Error saving ${key}:`, error);
        }
    }

    /**
     * Update the enhanced styling UI to reflect current settings.
     */
    function updateEnhancedStyleUI() {
        // Font size slider
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider) {
            fontSizeSlider.value = state.enhancedSettings[ENHANCED_KEYS.FONT_SIZE];
        }
        if (fontSizeValue) {
            fontSizeValue.textContent = `${state.enhancedSettings[ENHANCED_KEYS.FONT_SIZE]}%`;
        }

        // Line height buttons
        updateOptionButtons('lineHeight', state.enhancedSettings[ENHANCED_KEYS.LINE_HEIGHT]);

        // Message padding buttons
        updateOptionButtons('messagePadding', state.enhancedSettings[ENHANCED_KEYS.MESSAGE_PADDING]);

        // Display mode buttons
        updateDisplayModeButtons(state.enhancedSettings[ENHANCED_KEYS.DISPLAY_MODE]);

        // Code block height buttons
        updateOptionButtons('codeBlockMaxHeight', String(state.enhancedSettings[ENHANCED_KEYS.CODE_BLOCK_HEIGHT]));

        // Code wrap toggle
        const codeWrapToggle = document.getElementById('codeWrapToggle');
        if (codeWrapToggle) {
            codeWrapToggle.checked = state.enhancedSettings[ENHANCED_KEYS.CODE_BLOCK_WRAP];
        }

        // Show timestamps toggle
        const showTimestampsToggle = document.getElementById('showTimestampsToggle');
        if (showTimestampsToggle) {
            showTimestampsToggle.checked = state.enhancedSettings[ENHANCED_KEYS.SHOW_TIMESTAMPS];
        }

        // Show avatars toggle
        const showAvatarsToggle = document.getElementById('showAvatarsToggle');
        if (showAvatarsToggle) {
            showAvatarsToggle.checked = state.enhancedSettings[ENHANCED_KEYS.SHOW_AVATARS];
        }

        // Bubble style buttons
        updateOptionButtons('messageBubbleStyle', state.enhancedSettings[ENHANCED_KEYS.BUBBLE_STYLE]);

        // Code blocks collapsed button text
        updateCodeBlocksButtonText(state.enhancedSettings[ENHANCED_KEYS.CODE_BLOCKS_COLLAPSED]);
    }

    /**
     * Update option button active states.
     *
     * @param {string} setting - The setting name
     * @param {string} value - The active value
     */
    function updateOptionButtons(setting, value) {
        document.querySelectorAll(`.option-btn[data-setting="${setting}"]`).forEach(btn => {
            const isActive = btn.dataset.value === value;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', String(isActive));
        });
    }

    /**
     * Update display mode button active states.
     *
     * @param {string} mode - The active mode
     */
    function updateDisplayModeButtons(mode) {
        document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
            const isActive = btn.dataset.mode === mode;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-checked', String(isActive));
        });
    }

    /**
     * Update typography UI to reflect a preset.
     *
     * @param {Object} preset - The preset values
     */
    function updateTypographyUI(preset) {
        // Font size
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider) {
            fontSizeSlider.value = preset.fontSize;
        }
        if (fontSizeValue) {
            fontSizeValue.textContent = `${preset.fontSize}%`;
        }

        // Line height
        updateOptionButtons('lineHeight', preset.lineHeight);

        // Message padding
        updateOptionButtons('messagePadding', preset.messagePadding);
    }

    /**
     * Update code blocks button text based on collapsed state.
     *
     * @param {boolean} collapsed - Whether code blocks are collapsed
     */
    function updateCodeBlocksButtonText(collapsed) {
        const textElement = document.getElementById('toggleCodeBlocksText');
        if (textElement) {
            textElement.textContent = collapsed ? 'Expand All' : 'Collapse All';
        }
    }

    /**
     * Get human-readable setting name.
     *
     * @param {string} setting - The setting key
     * @returns {string} Human-readable name
     */
    function getSettingName(setting) {
        const names = {
            [ENHANCED_KEYS.LINE_HEIGHT]: 'Line height',
            [ENHANCED_KEYS.MESSAGE_PADDING]: 'Message padding',
            [ENHANCED_KEYS.CODE_BLOCK_HEIGHT]: 'Code block max height',
            [ENHANCED_KEYS.BUBBLE_STYLE]: 'Bubble style'
        };
        return names[setting] || setting;
    }

    /**
     * Reset all enhanced styling to defaults.
     */
    async function resetAllEnhancedStyles() {
        try {
            // Save all defaults to storage
            await browser.storage.local.set(ENHANCED_DEFAULTS);
            state.enhancedSettings = { ...ENHANCED_DEFAULTS };

            // Update UI
            updateEnhancedStyleUI();

            // Notify content scripts
            try {
                const tabs = await browser.tabs.query({ url: '*://claude.ai/*' });
                for (const tab of tabs) {
                    try {
                        await browser.tabs.sendMessage(tab.id, { action: 'resetEnhancedStyles' });
                    } catch (e) {
                        // Tab might not have content script
                    }
                }
            } catch (e) {
                console.error('[Claude Width Popup] Error notifying tabs:', e);
            }

            console.log('[Claude Width Popup] All enhanced styles reset to defaults');
        } catch (error) {
            console.error('[Claude Width Popup] Error resetting enhanced styles:', error);
        }
    }

    // =========================================================================
    // PROFILES (v1.9.0)
    // =========================================================================

    /**
     * Set up profile event listeners.
     */
    function setupProfileListeners() {
        // Profile select change
        if (profileSelect) {
            profileSelect.addEventListener('change', handleProfileChange);
        }

        // Manage profiles button
        if (manageProfilesBtn) {
            manageProfilesBtn.addEventListener('click', handleManageProfilesClick);
        }
    }

    /**
     * Load profiles from storage.
     */
    async function loadProfiles() {
        try {
            const result = await browser.storage.local.get([
                PROFILE_STORAGE_KEYS.SYNC_ENABLED,
                PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID,
                PROFILE_STORAGE_KEYS.PROFILES
            ]);

            state.syncEnabled = result[PROFILE_STORAGE_KEYS.SYNC_ENABLED] || false;
            state.activeProfileId = result[PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID] || 'default';
            state.profiles = result[PROFILE_STORAGE_KEYS.PROFILES] || {};

            // Get active profile name
            if (state.profiles[state.activeProfileId]) {
                state.activeProfileName = state.profiles[state.activeProfileId].name || 'Default';
            }

            // Update UI
            renderProfileSelect();
            updateSyncIndicator();

            console.log(`[Claude Width Popup] Profiles loaded: ${Object.keys(state.profiles).length} profiles, active: "${state.activeProfileName}"`);
        } catch (error) {
            console.error('[Claude Width Popup] Error loading profiles:', error);
        }
    }

    /**
     * Render the profile select dropdown.
     */
    function renderProfileSelect() {
        if (!profileSelect) return;

        // Clear existing options
        profileSelect.textContent = '';

        // Sort profiles by name, keeping default first
        const sortedProfiles = Object.entries(state.profiles)
            .sort(([idA, a], [idB, b]) => {
                if (idA === 'default') return -1;
                if (idB === 'default') return 1;
                return a.name.localeCompare(b.name);
            });

        // Add options
        for (const [id, profile] of sortedProfiles) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = profile.name;
            if (id === state.activeProfileId) {
                option.selected = true;
            }
            profileSelect.appendChild(option);
        }

        // Update focusable elements
        cacheFocusableElements();
    }

    /**
     * Update sync indicator visibility and text.
     */
    function updateSyncIndicator() {
        if (!syncIndicator) return;

        if (state.syncEnabled) {
            syncIndicator.hidden = false;
            const syncText = syncIndicator.querySelector('.sync-text');
            if (syncText) {
                syncText.textContent = 'Synced';
            }
            syncIndicator.classList.add('active');
        } else {
            syncIndicator.hidden = true;
            syncIndicator.classList.remove('active');
        }
    }

    /**
     * Handle profile select change.
     *
     * @param {Event} event - Change event
     */
    async function handleProfileChange(event) {
        const newProfileId = event.target.value;

        if (newProfileId === state.activeProfileId) {
            return;
        }

        try {
            // Switch profile via background script
            const response = await browser.runtime.sendMessage({
                action: 'switchProfile',
                profileId: newProfileId
            });

            if (response && response.success) {
                state.activeProfileId = newProfileId;
                state.activeProfileName = state.profiles[newProfileId]?.name || 'Unknown';

                // Reload settings from the new profile
                await loadSavedPreference();
                await loadEnhancedSettings();
                await loadCustomPresets();

                announceChange(`Switched to "${state.activeProfileName}" profile`);
                console.log(`[Claude Width Popup] Switched to profile: ${state.activeProfileName}`);
            } else {
                // Revert select to previous value
                profileSelect.value = state.activeProfileId;
                announceChange(response?.error || 'Failed to switch profile');
            }
        } catch (error) {
            console.error('[Claude Width Popup] Error switching profile:', error);
            profileSelect.value = state.activeProfileId;
            announceChange('Error switching profile');
        }
    }

    /**
     * Handle manage profiles button click.
     */
    function handleManageProfilesClick() {
        // Open options page
        browser.runtime.openOptionsPage();
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
