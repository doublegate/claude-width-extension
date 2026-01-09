/**
 * Claude Chat Width Customizer - Options Page Script
 * ===================================================
 *
 * Handles the options page functionality including:
 * - Profile management (create, edit, delete)
 * - Browser sync toggle and status
 * - Import/Export settings
 * - Reset to defaults
 *
 * @author DoubleGate
 * @version 1.9.0
 * @license MIT
 */

(function() {
    'use strict';

    // Get constants from shared module
    const {
        PROFILE_STORAGE_KEYS,
        PROFILE_DEFAULTS,
        MAX_PROFILES,
        PROFILE_NAME_MAX_LENGTH
    } = window.ClaudeWidthConstants || {};

    // Get profile utilities
    const Profiles = window.ClaudeWidthProfiles || {};

    // DOM element references
    const elements = {
        // Screen reader announcements
        srAnnouncements: null,

        // Profile section
        profileCount: null,
        profileList: null,
        createProfileBtn: null,

        // Sync section
        syncEnabledToggle: null,
        syncStatus: null,
        syncStatusIcon: null,
        syncStatusText: null,

        // Backup section
        exportBtn: null,
        importFileInput: null,

        // Reset section
        resetBtn: null,

        // Profile Modal
        profileModal: null,
        profileModalTitle: null,
        profileModalClose: null,
        profileNameInput: null,
        profileNameHint: null,
        profileModalCancel: null,
        profileModalSave: null,

        // Reset Modal
        resetModal: null,
        resetModalClose: null,
        resetModalCancel: null,
        resetModalConfirm: null,

        // Import Modal
        importModal: null,
        importModalClose: null,
        importPreview: null,
        importPreviewContent: null,
        importModalCancel: null,
        importModalConfirm: null,

        // Delete Profile Modal
        deleteProfileModal: null,
        deleteProfileModalClose: null,
        deleteProfileName: null,
        deleteProfileModalCancel: null,
        deleteProfileModalConfirm: null,

        // Toast
        toast: null,
        toastMessage: null,

        // Shortcuts section
        manageShortcutsBtn: null
    };

    // State
    let state = {
        profiles: {},
        activeProfileId: 'default',
        syncEnabled: false,
        editingProfileId: null,
        deletingProfileId: null,
        pendingImportData: null
    };

    /**
     * Initialize the options page.
     */
    async function initialize() {
        cacheElements();
        setupEventListeners();
        await loadData();
        renderProfiles();
        updateSyncStatus();
    }

    /**
     * Cache DOM element references.
     */
    function cacheElements() {
        elements.srAnnouncements = document.getElementById('srAnnouncements');

        // Profile section
        elements.profileCount = document.getElementById('profileCount');
        elements.profileList = document.getElementById('profileList');
        elements.createProfileBtn = document.getElementById('createProfileBtn');

        // Sync section
        elements.syncEnabledToggle = document.getElementById('syncEnabledToggle');
        elements.syncStatus = document.getElementById('syncStatus');
        elements.syncStatusIcon = document.getElementById('syncStatusIcon');
        elements.syncStatusText = document.getElementById('syncStatusText');

        // Backup section
        elements.exportBtn = document.getElementById('exportBtn');
        elements.importFileInput = document.getElementById('importFileInput');

        // Reset section
        elements.resetBtn = document.getElementById('resetBtn');

        // Profile Modal
        elements.profileModal = document.getElementById('profileModal');
        elements.profileModalTitle = document.getElementById('profileModalTitle');
        elements.profileModalClose = document.getElementById('profileModalClose');
        elements.profileNameInput = document.getElementById('profileNameInput');
        elements.profileNameHint = document.getElementById('profileNameHint');
        elements.profileModalCancel = document.getElementById('profileModalCancel');
        elements.profileModalSave = document.getElementById('profileModalSave');

        // Reset Modal
        elements.resetModal = document.getElementById('resetModal');
        elements.resetModalClose = document.getElementById('resetModalClose');
        elements.resetModalCancel = document.getElementById('resetModalCancel');
        elements.resetModalConfirm = document.getElementById('resetModalConfirm');

        // Import Modal
        elements.importModal = document.getElementById('importModal');
        elements.importModalClose = document.getElementById('importModalClose');
        elements.importPreview = document.getElementById('importPreview');
        elements.importPreviewContent = document.getElementById('importPreviewContent');
        elements.importModalCancel = document.getElementById('importModalCancel');
        elements.importModalConfirm = document.getElementById('importModalConfirm');

        // Delete Profile Modal
        elements.deleteProfileModal = document.getElementById('deleteProfileModal');
        elements.deleteProfileModalClose = document.getElementById('deleteProfileModalClose');
        elements.deleteProfileName = document.getElementById('deleteProfileName');
        elements.deleteProfileModalCancel = document.getElementById('deleteProfileModalCancel');
        elements.deleteProfileModalConfirm = document.getElementById('deleteProfileModalConfirm');

        // Toast
        elements.toast = document.getElementById('toast');
        elements.toastMessage = document.getElementById('toastMessage');

        // Shortcuts section
        elements.manageShortcutsBtn = document.getElementById('manageShortcutsBtn');
    }

    /**
     * Set up event listeners.
     */
    function setupEventListeners() {
        // Profile section
        if (elements.createProfileBtn) {
            elements.createProfileBtn.addEventListener('click', handleCreateProfile);
        }

        // Sync toggle
        if (elements.syncEnabledToggle) {
            elements.syncEnabledToggle.addEventListener('change', handleSyncToggle);
        }

        // Backup section
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', handleExport);
        }
        if (elements.importFileInput) {
            elements.importFileInput.addEventListener('change', handleImportFileSelect);
        }

        // Reset section
        if (elements.resetBtn) {
            elements.resetBtn.addEventListener('click', handleResetClick);
        }

        // Profile Modal
        if (elements.profileModalClose) {
            elements.profileModalClose.addEventListener('click', closeProfileModal);
        }
        if (elements.profileModalCancel) {
            elements.profileModalCancel.addEventListener('click', closeProfileModal);
        }
        if (elements.profileModalSave) {
            elements.profileModalSave.addEventListener('click', handleProfileSave);
        }
        if (elements.profileNameInput) {
            elements.profileNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    handleProfileSave();
                }
            });
        }

        // Reset Modal
        if (elements.resetModalClose) {
            elements.resetModalClose.addEventListener('click', closeResetModal);
        }
        if (elements.resetModalCancel) {
            elements.resetModalCancel.addEventListener('click', closeResetModal);
        }
        if (elements.resetModalConfirm) {
            elements.resetModalConfirm.addEventListener('click', handleResetConfirm);
        }

        // Import Modal
        if (elements.importModalClose) {
            elements.importModalClose.addEventListener('click', closeImportModal);
        }
        if (elements.importModalCancel) {
            elements.importModalCancel.addEventListener('click', closeImportModal);
        }
        if (elements.importModalConfirm) {
            elements.importModalConfirm.addEventListener('click', handleImportConfirm);
        }

        // Delete Profile Modal
        if (elements.deleteProfileModalClose) {
            elements.deleteProfileModalClose.addEventListener('click', closeDeleteProfileModal);
        }
        if (elements.deleteProfileModalCancel) {
            elements.deleteProfileModalCancel.addEventListener('click', closeDeleteProfileModal);
        }
        if (elements.deleteProfileModalConfirm) {
            elements.deleteProfileModalConfirm.addEventListener('click', handleDeleteProfileConfirm);
        }

        // Modal overlay clicks (close on background click)
        [elements.profileModal, elements.resetModal, elements.importModal, elements.deleteProfileModal].forEach(modal => {
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeAllModals();
                    }
                });
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeAllModals();
            }
        });

        // Shortcuts section
        if (elements.manageShortcutsBtn) {
            elements.manageShortcutsBtn.addEventListener('click', handleManageShortcuts);
        }

        // Listen for storage changes
        browser.storage.onChanged.addListener(handleStorageChange);
    }

    /**
     * Load data from storage.
     */
    async function loadData() {
        try {
            const data = await browser.storage.local.get([
                PROFILE_STORAGE_KEYS?.PROFILES || 'profiles',
                PROFILE_STORAGE_KEYS?.ACTIVE_PROFILE_ID || 'activeProfileId',
                PROFILE_STORAGE_KEYS?.SYNC_ENABLED || 'syncEnabled'
            ]);

            state.profiles = data[PROFILE_STORAGE_KEYS?.PROFILES || 'profiles'] || {};
            state.activeProfileId = data[PROFILE_STORAGE_KEYS?.ACTIVE_PROFILE_ID || 'activeProfileId'] || 'default';
            state.syncEnabled = data[PROFILE_STORAGE_KEYS?.SYNC_ENABLED || 'syncEnabled'] || false;

            // Ensure default profile exists
            if (!state.profiles.default) {
                state.profiles.default = Profiles.createDefaultProfile?.({}) || {
                    id: 'default',
                    name: 'Default',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    settings: { ...PROFILE_DEFAULTS }
                };
            }
        } catch (error) {
            console.error('[Options] Error loading data:', error);
            showToast('Error loading settings', 'error');
        }
    }

    /**
     * Render the profile list using safe DOM methods.
     */
    function renderProfiles() {
        if (!elements.profileList) return;

        const profileCount = Object.keys(state.profiles).length;

        // Update count
        if (elements.profileCount) {
            elements.profileCount.textContent = `${profileCount} of ${MAX_PROFILES || 8} profiles`;
        }

        // Update create button state
        if (elements.createProfileBtn) {
            elements.createProfileBtn.disabled = profileCount >= (MAX_PROFILES || 8);
        }

        // Clear existing content
        elements.profileList.textContent = '';

        // Sort profiles
        const sortedProfiles = Object.values(state.profiles).sort((a, b) => {
            if (a.id === 'default') return -1;
            if (b.id === 'default') return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Build profile items using safe DOM methods
        sortedProfiles.forEach(profile => {
            const profileEl = createProfileElement(profile);
            elements.profileList.appendChild(profileEl);
        });
    }

    /**
     * Create a profile item element using safe DOM methods.
     *
     * @param {Object} profile - Profile object
     * @returns {HTMLElement} Profile item element
     */
    function createProfileElement(profile) {
        const isActive = profile.id === state.activeProfileId;
        const isDefault = profile.id === 'default';
        const settings = profile.settings || {};

        // Create main container
        const item = document.createElement('div');
        item.className = `profile-item${isActive ? ' active' : ''}`;
        item.setAttribute('role', 'listitem');
        item.dataset.profileId = profile.id;

        // Create header
        const header = document.createElement('div');
        header.className = 'profile-item-header';

        // Profile info
        const info = document.createElement('div');
        info.className = 'profile-item-info';

        const name = document.createElement('span');
        name.className = 'profile-item-name';
        name.textContent = profile.name || 'Unnamed';
        info.appendChild(name);

        if (isActive) {
            const badge = document.createElement('span');
            badge.className = 'profile-badge active';
            badge.textContent = 'Active';
            info.appendChild(badge);
        }

        if (isDefault) {
            const badge = document.createElement('span');
            badge.className = 'profile-badge default';
            badge.textContent = 'Default';
            info.appendChild(badge);
        }

        header.appendChild(info);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'profile-item-actions';

        // Activate button (if not active)
        if (!isActive) {
            const activateBtn = createActionButton('activate', profile.id, profile.name, 'Activate');
            actions.appendChild(activateBtn);
        }

        // Edit button
        const editBtn = createActionButton('edit', profile.id, profile.name, 'Edit');
        actions.appendChild(editBtn);

        // Duplicate button
        const duplicateBtn = createActionButton('duplicate', profile.id, profile.name, 'Duplicate');
        actions.appendChild(duplicateBtn);

        // Delete button (not for default)
        if (!isDefault) {
            const deleteBtn = createActionButton('delete', profile.id, profile.name, 'Delete');
            actions.appendChild(deleteBtn);
        }

        header.appendChild(actions);
        item.appendChild(header);

        // Details
        const details = document.createElement('div');
        details.className = 'profile-item-details';

        const widthDetail = document.createElement('span');
        widthDetail.className = 'profile-detail';
        widthDetail.textContent = `Width: ${settings.chatWidthPercent || 85}%`;
        details.appendChild(widthDetail);

        const themeDetail = document.createElement('span');
        themeDetail.className = 'profile-detail';
        themeDetail.textContent = `Theme: ${capitalize(settings.theme || 'system')}`;
        details.appendChild(themeDetail);

        const displayDetail = document.createElement('span');
        displayDetail.className = 'profile-detail';
        displayDetail.textContent = `Display: ${capitalize(settings.displayMode || 'comfortable')}`;
        details.appendChild(displayDetail);

        item.appendChild(details);

        return item;
    }

    /**
     * Create an action button for profile items.
     *
     * @param {string} action - Action type
     * @param {string} profileId - Profile ID
     * @param {string} profileName - Profile name
     * @param {string} label - Button label
     * @returns {HTMLButtonElement} Button element
     */
    function createActionButton(action, profileId, profileName, label) {
        const btn = document.createElement('button');
        btn.className = `profile-action profile-action-${action}`;
        btn.dataset.profileId = profileId;
        btn.title = `${label} profile`;
        btn.setAttribute('aria-label', `${label} ${profileName || 'profile'}`);

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', 'currentColor');
        path.setAttribute('stroke-width', '1.5');

        switch (action) {
            case 'activate':
                path.setAttribute('d', 'M4.5 8L7 10.5L11.5 5.5');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                break;
            case 'edit':
                path.setAttribute('d', 'M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z');
                path.setAttribute('stroke-linejoin', 'round');
                break;
            case 'duplicate':
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', '5');
                rect.setAttribute('y', '5');
                rect.setAttribute('width', '9');
                rect.setAttribute('height', '9');
                rect.setAttribute('rx', '1');
                rect.setAttribute('stroke', 'currentColor');
                rect.setAttribute('stroke-width', '1.5');
                svg.appendChild(rect);
                path.setAttribute('d', 'M3 11V3C3 2.44772 3.44772 2 4 2H12');
                path.setAttribute('stroke-linecap', 'round');
                break;
            case 'delete':
                path.setAttribute('d', 'M2 4H14M5 4V2H11V4M6 7V12M10 7V12');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path2.setAttribute('d', 'M3 4L4 14H12L13 4');
                path2.setAttribute('stroke', 'currentColor');
                path2.setAttribute('stroke-width', '1.5');
                path2.setAttribute('stroke-linejoin', 'round');
                svg.appendChild(path2);
                break;
        }

        svg.appendChild(path);
        btn.appendChild(svg);

        // Add click handler
        btn.addEventListener('click', () => {
            switch (action) {
                case 'activate':
                    handleActivateProfile(profileId);
                    break;
                case 'edit':
                    handleEditProfile(profileId);
                    break;
                case 'duplicate':
                    handleDuplicateProfile(profileId);
                    break;
                case 'delete':
                    handleDeleteProfileClick(profileId);
                    break;
            }
        });

        return btn;
    }

    /**
     * Update sync status display.
     */
    function updateSyncStatus() {
        if (elements.syncEnabledToggle) {
            elements.syncEnabledToggle.checked = state.syncEnabled;
        }

        if (elements.syncStatusIcon) {
            elements.syncStatusIcon.classList.toggle('synced', state.syncEnabled);
        }

        if (elements.syncStatusText) {
            elements.syncStatusText.textContent = state.syncEnabled
                ? 'Synced across browsers'
                : 'Stored locally only';
        }
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================

    /**
     * Handle create profile button click.
     */
    function handleCreateProfile() {
        state.editingProfileId = null;
        openProfileModal('New Profile', '');
    }

    /**
     * Handle edit profile button click.
     *
     * @param {string} profileId - Profile ID to edit
     */
    function handleEditProfile(profileId) {
        const profile = state.profiles[profileId];
        if (!profile) return;

        state.editingProfileId = profileId;
        openProfileModal('Edit Profile', profile.name || '');
    }

    /**
     * Handle duplicate profile button click.
     *
     * @param {string} profileId - Profile ID to duplicate
     */
    async function handleDuplicateProfile(profileId) {
        const profile = state.profiles[profileId];
        if (!profile) return;

        const profileCount = Object.keys(state.profiles).length;
        if (profileCount >= (MAX_PROFILES || 8)) {
            showToast('Maximum profiles reached', 'error');
            return;
        }

        try {
            const response = await browser.runtime.sendMessage({
                action: 'createProfile',
                name: `${profile.name} (Copy)`,
                settings: profile.settings
            });

            if (response?.success) {
                showToast('Profile duplicated', 'success');
                await loadData();
                renderProfiles();
                announce('Profile duplicated successfully');
            } else {
                showToast(response?.error || 'Failed to duplicate profile', 'error');
            }
        } catch (error) {
            console.error('[Options] Error duplicating profile:', error);
            showToast('Failed to duplicate profile', 'error');
        }
    }

    /**
     * Handle delete profile button click.
     *
     * @param {string} profileId - Profile ID to delete
     */
    function handleDeleteProfileClick(profileId) {
        const profile = state.profiles[profileId];
        if (!profile || profileId === 'default') return;

        state.deletingProfileId = profileId;

        if (elements.deleteProfileName) {
            elements.deleteProfileName.textContent = profile.name || 'Unnamed';
        }

        openModal(elements.deleteProfileModal);
    }

    /**
     * Handle delete profile confirmation.
     */
    async function handleDeleteProfileConfirm() {
        if (!state.deletingProfileId) return;

        try {
            const response = await browser.runtime.sendMessage({
                action: 'deleteProfile',
                profileId: state.deletingProfileId
            });

            if (response?.success) {
                showToast('Profile deleted', 'success');
                announce('Profile deleted');
                closeDeleteProfileModal();
                await loadData();
                renderProfiles();
            } else {
                showToast(response?.error || 'Failed to delete profile', 'error');
            }
        } catch (error) {
            console.error('[Options] Error deleting profile:', error);
            showToast('Failed to delete profile', 'error');
        }

        state.deletingProfileId = null;
    }

    /**
     * Handle activate profile button click.
     *
     * @param {string} profileId - Profile ID to activate
     */
    async function handleActivateProfile(profileId) {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'switchProfile',
                profileId: profileId
            });

            if (response?.success) {
                state.activeProfileId = profileId;
                showToast('Profile activated', 'success');
                announce(`${state.profiles[profileId]?.name || 'Profile'} activated`);
                renderProfiles();
            } else {
                showToast(response?.error || 'Failed to activate profile', 'error');
            }
        } catch (error) {
            console.error('[Options] Error activating profile:', error);
            showToast('Failed to activate profile', 'error');
        }
    }

    /**
     * Handle profile save button click.
     */
    async function handleProfileSave() {
        const name = elements.profileNameInput?.value?.trim();

        if (!name) {
            elements.profileNameHint.textContent = 'Please enter a profile name';
            elements.profileNameHint.classList.add('error');
            elements.profileNameInput?.focus();
            return;
        }

        if (name.length > (PROFILE_NAME_MAX_LENGTH || 30)) {
            elements.profileNameHint.textContent = `Name must be ${PROFILE_NAME_MAX_LENGTH || 30} characters or less`;
            elements.profileNameHint.classList.add('error');
            return;
        }

        try {
            let response;

            if (state.editingProfileId) {
                // Edit existing profile
                response = await browser.runtime.sendMessage({
                    action: 'updateProfile',
                    profileId: state.editingProfileId,
                    updates: { name }
                });
            } else {
                // Create new profile
                response = await browser.runtime.sendMessage({
                    action: 'createProfile',
                    name: name
                });
            }

            if (response?.success) {
                showToast(state.editingProfileId ? 'Profile updated' : 'Profile created', 'success');
                announce(state.editingProfileId ? 'Profile updated' : 'Profile created');
                closeProfileModal();
                await loadData();
                renderProfiles();
            } else {
                showToast(response?.error || 'Failed to save profile', 'error');
            }
        } catch (error) {
            console.error('[Options] Error saving profile:', error);
            showToast('Failed to save profile', 'error');
        }
    }

    /**
     * Handle sync toggle change.
     */
    async function handleSyncToggle() {
        const enabled = elements.syncEnabledToggle?.checked || false;

        try {
            const response = await browser.runtime.sendMessage({
                action: 'setSyncEnabled',
                enabled: enabled
            });

            if (response?.success) {
                state.syncEnabled = enabled;
                updateSyncStatus();
                showToast(enabled ? 'Sync enabled' : 'Sync disabled', 'success');
                announce(enabled ? 'Browser sync enabled' : 'Browser sync disabled');
            } else {
                // Revert toggle
                elements.syncEnabledToggle.checked = !enabled;
                showToast(response?.error || 'Failed to change sync setting', 'error');
            }
        } catch (error) {
            console.error('[Options] Error changing sync setting:', error);
            elements.syncEnabledToggle.checked = !enabled;
            showToast('Failed to change sync setting', 'error');
        }
    }

    /**
     * Handle export button click.
     */
    async function handleExport() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'exportSettings'
            });

            if (response?.success && response.data) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const filename = `claude-width-settings-${new Date().toISOString().slice(0, 10)}.json`;

                // Use browser.downloads API
                await browser.downloads.download({
                    url: url,
                    filename: filename,
                    saveAs: true
                });

                showToast('Settings exported', 'success');
                announce('Settings exported to file');

                // Clean up
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } else {
                showToast(response?.error || 'Failed to export settings', 'error');
            }
        } catch (error) {
            console.error('[Options] Error exporting settings:', error);
            showToast('Failed to export settings', 'error');
        }
    }

    /**
     * Handle import file selection.
     *
     * @param {Event} event - Change event
     */
    async function handleImportFileSelect(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate import data
            const validation = Profiles.validateImportData?.(data);
            if (!validation?.valid) {
                showToast(validation?.error || 'Invalid import file', 'error');
                return;
            }

            // Store pending import data and show preview
            state.pendingImportData = data;

            // Build preview using safe DOM methods
            if (elements.importPreviewContent) {
                elements.importPreviewContent.textContent = '';

                const profileCount = Object.keys(data.profiles || {}).length;

                const p1 = document.createElement('p');
                const strong1 = document.createElement('strong');
                strong1.textContent = 'Export version: ';
                p1.appendChild(strong1);
                p1.appendChild(document.createTextNode(data.exportVersion || 'Unknown'));
                elements.importPreviewContent.appendChild(p1);

                const p2 = document.createElement('p');
                const strong2 = document.createElement('strong');
                strong2.textContent = 'Profiles: ';
                p2.appendChild(strong2);
                p2.appendChild(document.createTextNode(String(profileCount)));
                elements.importPreviewContent.appendChild(p2);

                const p3 = document.createElement('p');
                const strong3 = document.createElement('strong');
                strong3.textContent = 'Exported: ';
                p3.appendChild(strong3);
                p3.appendChild(document.createTextNode(
                    data.exportedAt ? new Date(data.exportedAt).toLocaleString() : 'Unknown'
                ));
                elements.importPreviewContent.appendChild(p3);
            }

            openModal(elements.importModal);
        } catch (error) {
            console.error('[Options] Error reading import file:', error);
            showToast('Invalid JSON file', 'error');
        }

        // Reset file input
        event.target.value = '';
    }

    /**
     * Handle import confirmation.
     */
    async function handleImportConfirm() {
        if (!state.pendingImportData) return;

        try {
            const response = await browser.runtime.sendMessage({
                action: 'importSettings',
                data: state.pendingImportData
            });

            if (response?.success) {
                showToast('Settings imported', 'success');
                announce('Settings imported successfully');
                closeImportModal();
                await loadData();
                renderProfiles();
                updateSyncStatus();
            } else {
                showToast(response?.error || 'Failed to import settings', 'error');
            }
        } catch (error) {
            console.error('[Options] Error importing settings:', error);
            showToast('Failed to import settings', 'error');
        }

        state.pendingImportData = null;
    }

    /**
     * Handle reset button click.
     */
    function handleResetClick() {
        openModal(elements.resetModal);
    }

    /**
     * Handle reset confirmation.
     */
    async function handleResetConfirm() {
        try {
            const response = await browser.runtime.sendMessage({
                action: 'resetToDefaults'
            });

            if (response?.success) {
                showToast('Settings reset to defaults', 'success');
                announce('All settings reset to factory defaults');
                closeResetModal();
                await loadData();
                renderProfiles();
                updateSyncStatus();
            } else {
                showToast(response?.error || 'Failed to reset settings', 'error');
            }
        } catch (error) {
            console.error('[Options] Error resetting settings:', error);
            showToast('Failed to reset settings', 'error');
        }
    }

    /**
     * Handle click on "Manage Shortcuts" button.
     *
     * @param {Event} event - Click event
     */
    function handleManageShortcuts(event) {
        event.preventDefault();
        browser.tabs.create({ url: 'about:addons' });
    }

    /**
     * Handle storage changes.
     *
     * @param {Object} changes - Storage changes
     * @param {string} areaName - Storage area name
     */
    async function handleStorageChange(changes, areaName) {
        if (areaName !== 'local') return;

        let needsRerender = false;

        if (changes[PROFILE_STORAGE_KEYS?.PROFILES || 'profiles']) {
            state.profiles = changes[PROFILE_STORAGE_KEYS?.PROFILES || 'profiles'].newValue || {};
            needsRerender = true;
        }

        if (changes[PROFILE_STORAGE_KEYS?.ACTIVE_PROFILE_ID || 'activeProfileId']) {
            state.activeProfileId = changes[PROFILE_STORAGE_KEYS?.ACTIVE_PROFILE_ID || 'activeProfileId'].newValue || 'default';
            needsRerender = true;
        }

        if (changes[PROFILE_STORAGE_KEYS?.SYNC_ENABLED || 'syncEnabled']) {
            state.syncEnabled = changes[PROFILE_STORAGE_KEYS?.SYNC_ENABLED || 'syncEnabled'].newValue || false;
            updateSyncStatus();
        }

        if (needsRerender) {
            renderProfiles();
        }
    }

    // =========================================================================
    // Modal Helpers
    // =========================================================================

    /**
     * Open the profile modal.
     *
     * @param {string} title - Modal title
     * @param {string} name - Profile name (for editing)
     */
    function openProfileModal(title, name) {
        if (elements.profileModalTitle) {
            elements.profileModalTitle.textContent = title;
        }
        if (elements.profileNameInput) {
            elements.profileNameInput.value = name;
        }
        if (elements.profileNameHint) {
            elements.profileNameHint.textContent = `Maximum ${PROFILE_NAME_MAX_LENGTH || 30} characters`;
            elements.profileNameHint.classList.remove('error');
        }
        openModal(elements.profileModal);
        elements.profileNameInput?.focus();
    }

    /**
     * Close the profile modal.
     */
    function closeProfileModal() {
        closeModal(elements.profileModal);
        state.editingProfileId = null;
    }

    /**
     * Close the reset modal.
     */
    function closeResetModal() {
        closeModal(elements.resetModal);
    }

    /**
     * Close the import modal.
     */
    function closeImportModal() {
        closeModal(elements.importModal);
        state.pendingImportData = null;
    }

    /**
     * Close the delete profile modal.
     */
    function closeDeleteProfileModal() {
        closeModal(elements.deleteProfileModal);
        state.deletingProfileId = null;
    }

    /**
     * Open a modal.
     *
     * @param {HTMLElement} modal - Modal element
     */
    function openModal(modal) {
        if (!modal) return;
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close a modal.
     *
     * @param {HTMLElement} modal - Modal element
     */
    function closeModal(modal) {
        if (!modal) return;
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    /**
     * Close all modals.
     */
    function closeAllModals() {
        closeProfileModal();
        closeResetModal();
        closeImportModal();
        closeDeleteProfileModal();
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================

    /**
     * Show a toast notification.
     *
     * @param {string} message - Message to show
     * @param {string} type - Toast type ('success' or 'error')
     */
    function showToast(message, type = 'success') {
        if (!elements.toast || !elements.toastMessage) return;

        elements.toastMessage.textContent = message;
        elements.toast.classList.remove('toast-success', 'toast-error');
        elements.toast.classList.add(`toast-${type}`);
        elements.toast.hidden = false;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            elements.toast.hidden = true;
        }, 3000);
    }

    /**
     * Announce a message to screen readers.
     *
     * @param {string} message - Message to announce
     */
    function announce(message) {
        if (!elements.srAnnouncements) return;

        // Clear and set to ensure announcement
        elements.srAnnouncements.textContent = '';
        setTimeout(() => {
            elements.srAnnouncements.textContent = message;
        }, 100);
    }

    /**
     * Capitalize first letter.
     *
     * @param {string} text - Text to capitalize
     * @returns {string} Capitalized text
     */
    function capitalize(text) {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
