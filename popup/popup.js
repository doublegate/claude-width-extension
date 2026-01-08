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
 * - R: Reset to default (70%)
 * - Escape: Close popup
 * - Alt+Up/Down: Reorder custom presets
 *
 * @author DoubleGate
 * @version 1.7.0
 * @license MIT
 *
 * Changelog:
 * - v1.7.0: Custom presets, drag-and-drop, favorites, recent widths, default 70%
 * - v1.6.0: Keyboard shortcuts, accessibility, badge
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
     * Default width percentage (changed from 60 to 70 in v1.7.0).
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
     * Built-in presets (not editable).
     * @type {Array<{id: string, name: string, width: number}>}
     */
    const BUILT_IN_PRESETS = [
        { id: 'narrow', name: 'Narrow', width: 50 },
        { id: 'medium', name: 'Medium', width: 70 },
        { id: 'wide', name: 'Wide', width: 85 },
        { id: 'full', name: 'Full', width: 100 }
    ];

    /**
     * Preset width configurations mapped by keyboard key.
     * @type {Object<string, {width: number, name: string}>}
     */
    const PRESET_KEYS = {
        '1': { width: 50, name: 'Narrow' },
        '2': { width: 70, name: 'Medium' },
        '3': { width: 85, name: 'Wide' },
        '4': { width: 100, name: 'Full' }
    };

    /**
     * Preset names by width value.
     * @type {Object<number, string>}
     */
    const PRESETS = {
        50: 'Narrow',
        70: 'Medium',
        85: 'Wide',
        100: 'Full'
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

    // =========================================================================
    // STATE
    // =========================================================================

    /**
     * Currently selected width (may differ from saved if user is previewing).
     * @type {number}
     */
    let selectedWidth = DEFAULT_WIDTH;

    /**
     * Last saved/applied width (used to detect unsaved changes).
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

    /**
     * All focusable elements in the popup (for focus trap).
     * @type {HTMLElement[]}
     */
    let focusableElements = [];

    /**
     * Custom presets array.
     * @type {Array<{id: string, name: string, width: number, favorite: boolean, order: number}>}
     */
    let customPresets = [];

    /**
     * Recently used widths.
     * @type {number[]}
     */
    let recentWidths = [];

    /**
     * Currently editing preset ID.
     * @type {string|null}
     */
    let editingPresetId = null;

    /**
     * Current drag target element.
     * @type {HTMLElement|null}
     */
    let dragTarget = null;

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

        // Set up event listeners
        setupEventListeners();

        // Cache focusable elements for focus trap
        cacheFocusableElements();

        // Load saved preferences and check status
        loadSavedTheme();
        loadSavedPreference();
        loadCustomPresets();
        loadRecentWidths();
        checkClaudeTabStatus();

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
        focusableElements = Array.from(document.querySelectorAll(selector))
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
        selectedWidth = value;
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
        selectedWidth = value;
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
        selectedWidth = width;
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
        saveAndApplyWidth(selectedWidth);
        showApplyFeedback();
        announceChange(`Width applied: ${selectedWidth} percent`);
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
            const newValue = Math.min(MAX_WIDTH, selectedWidth + 10);
            sliderElement.value = newValue;
            selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
            saveAndApplyWidth(newValue);
            announceChange(`Width set to ${newValue} percent`);
        } else if (event.key === 'PageDown') {
            event.preventDefault();
            const newValue = Math.max(MIN_WIDTH, selectedWidth - 10);
            sliderElement.value = newValue;
            selectedWidth = newValue;
            updateDisplay(newValue);
            updatePresetHighlight(newValue);
            saveAndApplyWidth(newValue);
            announceChange(`Width set to ${newValue} percent`);
        } else if (event.key === 'Home') {
            event.preventDefault();
            sliderElement.value = MIN_WIDTH;
            selectedWidth = MIN_WIDTH;
            updateDisplay(MIN_WIDTH);
            updatePresetHighlight(MIN_WIDTH);
            saveAndApplyWidth(MIN_WIDTH);
            announceChange(`Width set to minimum, ${MIN_WIDTH} percent`);
        } else if (event.key === 'End') {
            event.preventDefault();
            sliderElement.value = MAX_WIDTH;
            selectedWidth = MAX_WIDTH;
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

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

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
            currentTheme = theme;
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
            customPresets = result.customPresets || [];
            renderCustomPresets();
        } catch (error) {
            console.error('[Claude Width Popup] Error loading custom presets:', error);
            customPresets = [];
            renderCustomPresets();
        }
    }

    /**
     * Save custom presets to storage.
     */
    async function saveCustomPresets() {
        try {
            await browser.storage.local.set({ customPresets: customPresets });
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
        const sorted = [...customPresets].sort((a, b) => (a.order || 0) - (b.order || 0));

        sorted.forEach((preset, index) => {
            const item = createCustomPresetItem(preset, index);
            customPresetsList.appendChild(item);
        });

        // Update save button visibility
        if (saveCurrentBtn) {
            saveCurrentBtn.disabled = customPresets.length >= MAX_CUSTOM_PRESETS;
        }

        // Update custom presets container visibility and empty state
        if (customPresetsContainer) {
            const hasPresets = customPresets.length > 0;
            customPresetsContainer.classList.toggle('has-presets', hasPresets);
            customPresetsContainer.classList.toggle('empty', !hasPresets);

            // Update section header count
            const headerCount = customPresetsContainer.querySelector('.preset-count');
            if (headerCount) {
                headerCount.textContent = `(${customPresets.length}/${MAX_CUSTOM_PRESETS})`;
            }
        }

        // Update focusable elements cache
        cacheFocusableElements();
    }

    /**
     * Create a custom preset list item element using DOM methods.
     *
     * @param {Object} preset - The preset object
     * @param {number} index - The index in the sorted array
     * @returns {HTMLElement} The list item element
     */
    function createCustomPresetItem(preset, index) {
        const item = document.createElement('div');
        item.className = 'custom-preset-item';
        item.dataset.id = preset.id;
        item.dataset.index = String(index);
        item.draggable = true;
        item.setAttribute('aria-posinset', String(index + 1));
        item.setAttribute('aria-setsize', String(customPresets.length));

        // Drag handle
        const dragHandle = document.createElement('button');
        dragHandle.className = 'drag-handle';
        dragHandle.type = 'button';
        dragHandle.setAttribute('aria-label', `Reorder ${preset.name}, use Alt+Arrow keys`);
        dragHandle.title = 'Drag to reorder';
        dragHandle.tabIndex = 0;

        const dragSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        dragSvg.setAttribute('viewBox', '0 0 16 16');
        dragSvg.setAttribute('fill', 'currentColor');
        dragSvg.setAttribute('aria-hidden', 'true');
        const dragPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        dragPath.setAttribute('d', 'M2 4h12v1H2V4zm0 3.5h12v1H2v-1zm0 3.5h12v1H2v-1z');
        dragSvg.appendChild(dragPath);
        dragHandle.appendChild(dragSvg);

        // Apply button
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

        // Favorite button
        const favBtn = document.createElement('button');
        favBtn.className = 'favorite-btn' + (preset.favorite ? ' active' : '');
        favBtn.type = 'button';
        favBtn.setAttribute('aria-label', preset.favorite ? `Remove ${preset.name} from favorites` : `Add ${preset.name} to favorites`);
        favBtn.setAttribute('aria-pressed', preset.favorite ? 'true' : 'false');
        favBtn.title = preset.favorite ? 'Remove from favorites' : 'Add to favorites';

        const starSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        starSvg.setAttribute('viewBox', '0 0 16 16');
        starSvg.setAttribute('fill', 'currentColor');
        starSvg.setAttribute('aria-hidden', 'true');
        const starPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        starPath.setAttribute('d', preset.favorite
            ? 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z'
            : 'M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694z'
        );
        starSvg.appendChild(starPath);
        favBtn.appendChild(starSvg);

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.type = 'button';
        editBtn.setAttribute('aria-label', `Edit ${preset.name}`);
        editBtn.title = 'Edit preset';

        const editSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        editSvg.setAttribute('viewBox', '0 0 16 16');
        editSvg.setAttribute('fill', 'currentColor');
        editSvg.setAttribute('aria-hidden', 'true');
        const editPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        editPath.setAttribute('d', 'M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z');
        editSvg.appendChild(editPath);
        editBtn.appendChild(editSvg);

        // Append all elements
        item.appendChild(dragHandle);
        item.appendChild(applyBtn);
        item.appendChild(favBtn);
        item.appendChild(editBtn);

        // Event listeners
        applyBtn.addEventListener('click', () => handleApplyCustomPreset(preset));
        favBtn.addEventListener('click', () => handleToggleFavorite(preset.id));
        editBtn.addEventListener('click', () => openEditModal(preset));

        // Drag events
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragleave', handleDragLeave);

        return item;
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
        const preset = customPresets.find(p => p.id === presetId);
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
        if (customPresets.length >= MAX_CUSTOM_PRESETS) {
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
            width: selectedWidth,
            favorite: false,
            order: customPresets.length
        };

        customPresets.push(newPreset);
        saveCustomPresets();
        renderCustomPresets();

        // Hide form
        if (newPresetForm) {
            newPresetForm.hidden = true;
        }

        announceChange(`Custom preset "${name}" created at ${selectedWidth} percent`);
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

        editingPresetId = preset.id;
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
        if (!editingPresetId || !editPresetNameInput || !editPresetWidthInput) return;

        const preset = customPresets.find(p => p.id === editingPresetId);
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
        editingPresetId = null;
    }

    /**
     * Handle deleting a preset.
     */
    function handleDeletePreset() {
        if (!editingPresetId) return;

        const preset = customPresets.find(p => p.id === editingPresetId);
        const presetName = preset ? preset.name : 'Preset';

        customPresets = customPresets.filter(p => p.id !== editingPresetId);

        // Re-order remaining presets
        customPresets.forEach((p, i) => {
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
        const sorted = [...customPresets].sort((a, b) => (a.order || 0) - (b.order || 0));
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
        }, 50);

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

        dragTarget = item;
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
        dragTarget = null;

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
        if (item && item !== dragTarget) {
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
        if (!dropTarget || !dragTarget || dropTarget === dragTarget) return;

        const dragId = dragTarget.dataset.id;
        const dropId = dropTarget.dataset.id;

        const dragPreset = customPresets.find(p => p.id === dragId);
        const dropPreset = customPresets.find(p => p.id === dropId);

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
            recentWidths = result.recentWidths || [];
            renderRecentWidths();
        } catch (error) {
            console.error('[Claude Width Popup] Error loading recent widths:', error);
            recentWidths = [];
        }
    }

    /**
     * Render the recently used widths.
     */
    function renderRecentWidths() {
        if (!recentlyUsedList || !recentlyUsedContainer) return;

        // Filter out widths that match built-in or custom presets
        const presetWidths = [...BUILT_IN_PRESETS.map(p => p.width), ...customPresets.map(p => p.width)];
        const uniqueRecent = recentWidths.filter(w => !presetWidths.includes(w));

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
                selectedWidth = width;
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
            }, 50);
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
        const hasUnsavedChanges = selectedWidth !== savedWidth;

        // Update Apply button to indicate pending changes
        if (applyButton) {
            if (hasUnsavedChanges) {
                applyButton.classList.add('has-changes');
                applyButton.setAttribute('aria-label', `Apply pending change to ${selectedWidth} percent`);
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
                selectedWidth = stored;
                savedWidth = stored;
            } else {
                selectedWidth = DEFAULT_WIDTH;
                savedWidth = DEFAULT_WIDTH;
            }

            // Update UI with loaded value
            sliderElement.value = selectedWidth;
            updateDisplay(selectedWidth);
            updatePresetHighlight(selectedWidth);
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
            savedWidth = width;
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
