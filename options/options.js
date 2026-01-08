/**
 * Claude Chat Width Customizer - Options Page Script
 * ===================================================
 *
 * Handles the options page functionality.
 * Primarily provides a link to Firefox's built-in shortcut manager.
 *
 * @author DoubleGate
 * @version 1.6.0
 * @license MIT
 */

(function() {
    'use strict';

    /**
     * Initialize the options page.
     */
    function initialize() {
        setupEventListeners();
    }

    /**
     * Set up event listeners.
     */
    function setupEventListeners() {
        // Handle the "Open Add-ons Manager" button
        const manageBtn = document.getElementById('manageShortcutsBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', handleManageShortcuts);
        }
    }

    /**
     * Handle click on "Manage Shortcuts" button.
     * Opens Firefox's extension shortcut management page.
     *
     * @param {Event} event - Click event
     */
    function handleManageShortcuts(event) {
        event.preventDefault();

        // Open the add-ons page in a new tab
        // Users can then click the gear icon and select "Manage Extension Shortcuts"
        browser.tabs.create({
            url: 'about:addons'
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
