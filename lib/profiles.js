/**
 * Claude Chat Width Customizer - Profile Management Utilities
 * ===========================================================
 *
 * Profile system for managing multiple configuration profiles with
 * browser sync support. Provides CRUD operations, import/export,
 * and sync/local storage handling.
 *
 * @author DoubleGate
 * @version 1.9.0
 * @license MIT
 */

(function() {
    'use strict';

    // =========================================================================
    // PROFILE CONSTANTS (from lib/constants.js)
    // =========================================================================

    const {
        DEFAULT_WIDTH,
        DEFAULT_THEME,
        ENHANCED_DEFAULTS,
        PROFILE_DEFAULTS,
        PROFILE_STORAGE_KEYS,
        MAX_PROFILES,
        PROFILE_NAME_MAX_LENGTH,
        EXPORT_VERSION
    } = window.ClaudeWidthConstants;

    // =========================================================================
    // PROFILE ID GENERATION
    // =========================================================================

    /**
     * Generate a unique profile ID.
     * Uses timestamp + random string for uniqueness.
     *
     * @returns {string} Unique profile ID
     */
    function generateProfileId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `profile_${timestamp}_${random}`;
    }

    // =========================================================================
    // PROFILE VALIDATION
    // =========================================================================

    /**
     * Validate a profile name.
     *
     * @param {string} name - Profile name to validate
     * @returns {{valid: boolean, error?: string}} Validation result
     */
    function validateProfileName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: 'Profile name is required' };
        }

        const trimmed = name.trim();

        if (trimmed.length === 0) {
            return { valid: false, error: 'Profile name cannot be empty' };
        }

        if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
            return { valid: false, error: `Profile name must be ${PROFILE_NAME_MAX_LENGTH} characters or less` };
        }

        // Check for invalid characters (only allow alphanumeric, spaces, hyphens, underscores)
        if (!/^[\w\s\-]+$/.test(trimmed)) {
            return { valid: false, error: 'Profile name contains invalid characters' };
        }

        return { valid: true };
    }

    /**
     * Validate a profile object structure.
     *
     * @param {Object} profile - Profile object to validate
     * @returns {{valid: boolean, error?: string}} Validation result
     */
    function validateProfile(profile) {
        if (!profile || typeof profile !== 'object') {
            return { valid: false, error: 'Invalid profile object' };
        }

        // Required fields
        if (!profile.name) {
            return { valid: false, error: 'Profile name is required' };
        }

        const nameValidation = validateProfileName(profile.name);
        if (!nameValidation.valid) {
            return nameValidation;
        }

        // Validate width if present
        if (profile.chatWidthPercent !== undefined) {
            const width = profile.chatWidthPercent;
            if (typeof width !== 'number' || width < 40 || width > 100) {
                return { valid: false, error: 'Chat width must be a number between 40 and 100' };
            }
        }

        // Validate theme if present
        if (profile.theme !== undefined) {
            const validThemes = ['light', 'dark', 'system'];
            if (!validThemes.includes(profile.theme)) {
                return { valid: false, error: 'Theme must be light, dark, or system' };
            }
        }

        return { valid: true };
    }

    /**
     * Validate import data structure.
     *
     * @param {Object} data - Import data to validate
     * @returns {{valid: boolean, error?: string, data?: Object}} Validation result with sanitized data
     */
    function validateImportData(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Invalid import data' };
        }

        // Check for required fields
        if (!data.exportVersion) {
            return { valid: false, error: 'Missing export version - file may be corrupted or from incompatible source' };
        }

        if (!data.profiles || typeof data.profiles !== 'object') {
            return { valid: false, error: 'Missing or invalid profiles data' };
        }

        // Validate each profile
        const sanitizedProfiles = {};
        for (const [id, profile] of Object.entries(data.profiles)) {
            const validation = validateProfile(profile);
            if (!validation.valid) {
                return { valid: false, error: `Invalid profile "${profile.name || id}": ${validation.error}` };
            }
            // Sanitize and store profile
            sanitizedProfiles[id] = sanitizeProfile(profile);
        }

        // Check profile count
        if (Object.keys(sanitizedProfiles).length > MAX_PROFILES) {
            return { valid: false, error: `Too many profiles. Maximum allowed is ${MAX_PROFILES}` };
        }

        // Validate activeProfileId if present
        if (data.activeProfileId && !sanitizedProfiles[data.activeProfileId]) {
            // Default to first profile or 'default'
            data.activeProfileId = sanitizedProfiles.default ? 'default' : Object.keys(sanitizedProfiles)[0];
        }

        return {
            valid: true,
            data: {
                ...data,
                profiles: sanitizedProfiles
            }
        };
    }

    // =========================================================================
    // PROFILE SANITIZATION
    // =========================================================================

    /**
     * Sanitize a profile object, applying defaults for missing fields.
     *
     * @param {Object} profile - Profile object to sanitize
     * @returns {Object} Sanitized profile with all required fields
     */
    function sanitizeProfile(profile) {
        return {
            name: (profile.name || 'Unnamed Profile').trim().substring(0, PROFILE_NAME_MAX_LENGTH),
            chatWidthPercent: clampNumber(profile.chatWidthPercent, 40, 100, DEFAULT_WIDTH),
            theme: ['light', 'dark', 'system'].includes(profile.theme) ? profile.theme : DEFAULT_THEME,
            customPresets: Array.isArray(profile.customPresets) ? profile.customPresets.slice(0, 4) : [],
            ...sanitizeEnhancedSettings(profile)
        };
    }

    /**
     * Sanitize enhanced styling settings from a profile.
     *
     * @param {Object} profile - Profile object containing enhanced settings
     * @returns {Object} Sanitized enhanced settings
     */
    function sanitizeEnhancedSettings(profile) {
        return {
            fontSizePercent: clampNumber(profile.fontSizePercent, 80, 120, ENHANCED_DEFAULTS.fontSizePercent),
            lineHeight: ['compact', 'normal', 'relaxed'].includes(profile.lineHeight)
                ? profile.lineHeight
                : ENHANCED_DEFAULTS.lineHeight,
            messagePadding: ['none', 'small', 'medium', 'large'].includes(profile.messagePadding)
                ? profile.messagePadding
                : ENHANCED_DEFAULTS.messagePadding,
            displayMode: ['compact', 'comfortable', 'spacious', 'custom'].includes(profile.displayMode)
                ? profile.displayMode
                : ENHANCED_DEFAULTS.displayMode,
            codeBlockMaxHeight: [200, 400, 600, 0].includes(profile.codeBlockMaxHeight)
                ? profile.codeBlockMaxHeight
                : ENHANCED_DEFAULTS.codeBlockMaxHeight,
            codeBlockWordWrap: typeof profile.codeBlockWordWrap === 'boolean'
                ? profile.codeBlockWordWrap
                : ENHANCED_DEFAULTS.codeBlockWordWrap,
            codeBlocksCollapsed: typeof profile.codeBlocksCollapsed === 'boolean'
                ? profile.codeBlocksCollapsed
                : ENHANCED_DEFAULTS.codeBlocksCollapsed,
            showTimestamps: typeof profile.showTimestamps === 'boolean'
                ? profile.showTimestamps
                : ENHANCED_DEFAULTS.showTimestamps,
            showAvatars: typeof profile.showAvatars === 'boolean'
                ? profile.showAvatars
                : ENHANCED_DEFAULTS.showAvatars,
            messageBubbleStyle: ['rounded', 'square', 'minimal'].includes(profile.messageBubbleStyle)
                ? profile.messageBubbleStyle
                : ENHANCED_DEFAULTS.messageBubbleStyle
        };
    }

    /**
     * Clamp a number between min and max, with fallback default.
     *
     * @param {*} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {number} defaultValue - Default if value is invalid
     * @returns {number} Clamped value
     */
    function clampNumber(value, min, max, defaultValue) {
        if (typeof value !== 'number' || isNaN(value)) {
            return defaultValue;
        }
        return Math.max(min, Math.min(max, value));
    }

    // =========================================================================
    // PROFILE CRUD OPERATIONS
    // =========================================================================

    /**
     * Create a new profile with default settings.
     *
     * @param {string} name - Profile name
     * @param {Object} [overrides={}] - Optional setting overrides
     * @returns {Object} New profile object
     */
    function createProfile(name, overrides = {}) {
        const id = generateProfileId();
        const profile = sanitizeProfile({
            name: name,
            ...PROFILE_DEFAULTS,
            ...overrides
        });

        return { id, profile };
    }

    /**
     * Create the default profile from existing settings.
     *
     * @param {Object} existingSettings - Current flat settings from storage
     * @returns {Object} Default profile object
     */
    function createDefaultProfile(existingSettings = {}) {
        return sanitizeProfile({
            name: 'Default',
            chatWidthPercent: existingSettings.chatWidthPercent || DEFAULT_WIDTH,
            theme: existingSettings.theme || DEFAULT_THEME,
            customPresets: existingSettings.customPresets || [],
            fontSizePercent: existingSettings.fontSizePercent,
            lineHeight: existingSettings.lineHeight,
            messagePadding: existingSettings.messagePadding,
            displayMode: existingSettings.displayMode,
            codeBlockMaxHeight: existingSettings.codeBlockMaxHeight,
            codeBlockWordWrap: existingSettings.codeBlockWordWrap,
            codeBlocksCollapsed: existingSettings.codeBlocksCollapsed,
            showTimestamps: existingSettings.showTimestamps,
            showAvatars: existingSettings.showAvatars,
            messageBubbleStyle: existingSettings.messageBubbleStyle
        });
    }

    /**
     * Update a profile with new settings.
     *
     * @param {Object} profile - Existing profile
     * @param {Object} updates - Settings to update
     * @returns {Object} Updated profile
     */
    function updateProfile(profile, updates) {
        return sanitizeProfile({
            ...profile,
            ...updates
        });
    }

    /**
     * Duplicate a profile with a new name.
     *
     * @param {Object} profile - Profile to duplicate
     * @param {string} newName - Name for the duplicate
     * @returns {{id: string, profile: Object}} New profile with unique ID
     */
    function duplicateProfile(profile, newName) {
        const id = generateProfileId();
        const duplicated = sanitizeProfile({
            ...profile,
            name: newName
        });

        return { id, profile: duplicated };
    }

    // =========================================================================
    // STORAGE OPERATIONS
    // =========================================================================

    /**
     * Get the appropriate storage API based on sync preference.
     *
     * @param {boolean} syncEnabled - Whether sync is enabled
     * @returns {Object} Browser storage API (sync or local)
     */
    function getStorage(syncEnabled) {
        return syncEnabled && browser.storage.sync ? browser.storage.sync : browser.storage.local;
    }

    /**
     * Load all profile data from storage.
     *
     * @returns {Promise<Object>} Profile data with syncEnabled, activeProfileId, and profiles
     */
    async function loadProfileData() {
        try {
            // First check local storage for sync preference
            const localData = await browser.storage.local.get([
                PROFILE_STORAGE_KEYS.SYNC_ENABLED,
                PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID,
                PROFILE_STORAGE_KEYS.PROFILES,
                PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES
            ]);

            const syncEnabled = localData[PROFILE_STORAGE_KEYS.SYNC_ENABLED] || false;

            // If sync is enabled, try to load from sync storage
            if (syncEnabled && browser.storage.sync) {
                try {
                    const syncData = await browser.storage.sync.get([
                        PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID,
                        PROFILE_STORAGE_KEYS.PROFILES,
                        PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES
                    ]);

                    // If we have sync data, use it
                    if (syncData[PROFILE_STORAGE_KEYS.PROFILES]) {
                        return {
                            syncEnabled: true,
                            activeProfileId: syncData[PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID] || 'default',
                            profiles: syncData[PROFILE_STORAGE_KEYS.PROFILES] || {},
                            autoProfileRules: syncData[PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES] || []
                        };
                    }
                } catch (syncError) {
                    console.warn('[Claude Width Profiles] Sync storage error, falling back to local:', syncError);
                }
            }

            // Return local data
            return {
                syncEnabled: syncEnabled,
                activeProfileId: localData[PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID] || 'default',
                profiles: localData[PROFILE_STORAGE_KEYS.PROFILES] || {},
                autoProfileRules: localData[PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES] || []
            };
        } catch (error) {
            console.error('[Claude Width Profiles] Error loading profile data:', error);
            return {
                syncEnabled: false,
                activeProfileId: 'default',
                profiles: {},
                autoProfileRules: []
            };
        }
    }

    /**
     * Save profile data to storage.
     *
     * @param {Object} data - Profile data to save
     * @param {boolean} data.syncEnabled - Whether to use sync storage
     * @param {string} data.activeProfileId - Active profile ID
     * @param {Object} data.profiles - Profiles object
     * @param {Array} [data.autoProfileRules] - Auto profile rules
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function saveProfileData(data) {
        try {
            const { syncEnabled, activeProfileId, profiles, autoProfileRules = [] } = data;

            // Always save sync preference to local storage
            await browser.storage.local.set({
                [PROFILE_STORAGE_KEYS.SYNC_ENABLED]: syncEnabled
            });

            const profileData = {
                [PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID]: activeProfileId,
                [PROFILE_STORAGE_KEYS.PROFILES]: profiles,
                [PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES]: autoProfileRules
            };

            // Save to appropriate storage
            const storage = getStorage(syncEnabled);

            // Check storage quota for sync (100KB limit)
            if (syncEnabled && browser.storage.sync) {
                const dataSize = new Blob([JSON.stringify(profileData)]).size;
                // Leave some headroom (90KB of 100KB limit)
                if (dataSize > 90000) {
                    return {
                        success: false,
                        error: 'Profile data exceeds sync storage limit. Please reduce number of profiles or custom presets.'
                    };
                }
            }

            await storage.set(profileData);

            // Also save to local as backup
            if (syncEnabled) {
                await browser.storage.local.set(profileData);
            }

            return { success: true };
        } catch (error) {
            console.error('[Claude Width Profiles] Error saving profile data:', error);
            return {
                success: false,
                error: error.message || 'Failed to save profile data'
            };
        }
    }

    /**
     * Get the active profile.
     *
     * @returns {Promise<{id: string, profile: Object}>} Active profile
     */
    async function getActiveProfile() {
        const data = await loadProfileData();
        const profile = data.profiles[data.activeProfileId];

        if (profile) {
            return { id: data.activeProfileId, profile };
        }

        // Fallback to default if active profile doesn't exist
        if (data.profiles.default) {
            return { id: 'default', profile: data.profiles.default };
        }

        // Create a default profile if none exists
        const defaultProfile = createDefaultProfile({});
        return { id: 'default', profile: defaultProfile };
    }

    /**
     * Set the active profile.
     *
     * @param {string} profileId - Profile ID to activate
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function setActiveProfile(profileId) {
        const data = await loadProfileData();

        if (!data.profiles[profileId]) {
            return { success: false, error: 'Profile not found' };
        }

        data.activeProfileId = profileId;
        return saveProfileData(data);
    }

    /**
     * Add a new profile.
     *
     * @param {string} name - Profile name
     * @param {Object} [settings={}] - Optional initial settings
     * @returns {Promise<{success: boolean, id?: string, error?: string}>} Result
     */
    async function addProfile(name, settings = {}) {
        const validation = validateProfileName(name);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const data = await loadProfileData();

        // Check profile limit
        if (Object.keys(data.profiles).length >= MAX_PROFILES) {
            return { success: false, error: `Maximum of ${MAX_PROFILES} profiles allowed` };
        }

        // Check for duplicate name
        const existingNames = Object.values(data.profiles).map(p => p.name.toLowerCase());
        if (existingNames.includes(name.toLowerCase().trim())) {
            return { success: false, error: 'A profile with this name already exists' };
        }

        const { id, profile } = createProfile(name, settings);
        data.profiles[id] = profile;

        const saveResult = await saveProfileData(data);
        if (!saveResult.success) {
            return saveResult;
        }

        return { success: true, id };
    }

    /**
     * Update an existing profile.
     *
     * @param {string} profileId - Profile ID to update
     * @param {Object} updates - Settings to update
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function updateProfileById(profileId, updates) {
        const data = await loadProfileData();

        if (!data.profiles[profileId]) {
            return { success: false, error: 'Profile not found' };
        }

        // Validate name if being updated
        if (updates.name) {
            const validation = validateProfileName(updates.name);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Check for duplicate name (excluding current profile)
            const existingNames = Object.entries(data.profiles)
                .filter(([id]) => id !== profileId)
                .map(([, p]) => p.name.toLowerCase());
            if (existingNames.includes(updates.name.toLowerCase().trim())) {
                return { success: false, error: 'A profile with this name already exists' };
            }
        }

        data.profiles[profileId] = updateProfile(data.profiles[profileId], updates);
        return saveProfileData(data);
    }

    /**
     * Delete a profile.
     *
     * @param {string} profileId - Profile ID to delete
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function deleteProfile(profileId) {
        if (profileId === 'default') {
            return { success: false, error: 'Cannot delete the default profile' };
        }

        const data = await loadProfileData();

        if (!data.profiles[profileId]) {
            return { success: false, error: 'Profile not found' };
        }

        // Must have at least one profile
        if (Object.keys(data.profiles).length <= 1) {
            return { success: false, error: 'Cannot delete the last profile' };
        }

        delete data.profiles[profileId];

        // If deleted profile was active, switch to default
        if (data.activeProfileId === profileId) {
            data.activeProfileId = data.profiles.default ? 'default' : Object.keys(data.profiles)[0];
        }

        // Remove from auto-profile rules
        data.autoProfileRules = data.autoProfileRules.filter(rule => rule.profileId !== profileId);

        return saveProfileData(data);
    }

    // =========================================================================
    // IMPORT/EXPORT OPERATIONS
    // =========================================================================

    /**
     * Export all settings to a JSON object.
     *
     * @returns {Promise<Object>} Export data
     */
    async function exportSettings() {
        const data = await loadProfileData();

        return {
            exportVersion: EXPORT_VERSION,
            exportDate: new Date().toISOString(),
            extensionVersion: browser.runtime.getManifest().version,
            syncEnabled: data.syncEnabled,
            activeProfileId: data.activeProfileId,
            profiles: data.profiles,
            autoProfileRules: data.autoProfileRules
        };
    }

    /**
     * Import settings from a JSON object.
     *
     * @param {Object} importData - Data to import
     * @param {Object} options - Import options
     * @param {boolean} [options.merge=false] - Merge with existing profiles instead of replace
     * @param {boolean} [options.preserveActive=true] - Keep current active profile
     * @returns {Promise<{success: boolean, error?: string, profileCount?: number}>} Result
     */
    async function importSettings(importData, options = {}) {
        const { merge = false, preserveActive = true } = options;

        // Validate import data
        const validation = validateImportData(importData);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        const sanitizedData = validation.data;

        try {
            const currentData = await loadProfileData();

            let newProfiles;
            let newActiveId;

            if (merge) {
                // Merge profiles (imported profiles override on name conflict)
                newProfiles = { ...currentData.profiles };

                // Generate new IDs for imported profiles to avoid ID conflicts
                for (const [, profile] of Object.entries(sanitizedData.profiles)) {
                    // Check if profile with same name exists
                    const existingEntry = Object.entries(newProfiles).find(
                        ([, p]) => p.name.toLowerCase() === profile.name.toLowerCase()
                    );

                    if (existingEntry) {
                        // Update existing profile
                        newProfiles[existingEntry[0]] = profile;
                    } else {
                        // Add new profile with new ID
                        const newId = generateProfileId();
                        newProfiles[newId] = profile;
                    }
                }

                newActiveId = preserveActive ? currentData.activeProfileId : sanitizedData.activeProfileId;
            } else {
                // Replace all profiles
                newProfiles = sanitizedData.profiles;
                newActiveId = preserveActive && currentData.profiles[currentData.activeProfileId]
                    ? currentData.activeProfileId
                    : sanitizedData.activeProfileId;
            }

            // Ensure active profile exists
            if (!newProfiles[newActiveId]) {
                newActiveId = newProfiles.default ? 'default' : Object.keys(newProfiles)[0];
            }

            // Check profile limit
            if (Object.keys(newProfiles).length > MAX_PROFILES) {
                return {
                    success: false,
                    error: `Import would exceed maximum of ${MAX_PROFILES} profiles`
                };
            }

            const saveResult = await saveProfileData({
                syncEnabled: currentData.syncEnabled, // Preserve current sync setting
                activeProfileId: newActiveId,
                profiles: newProfiles,
                autoProfileRules: merge
                    ? [...currentData.autoProfileRules, ...(sanitizedData.autoProfileRules || [])]
                    : (sanitizedData.autoProfileRules || [])
            });

            if (!saveResult.success) {
                return saveResult;
            }

            return {
                success: true,
                profileCount: Object.keys(newProfiles).length
            };
        } catch (error) {
            console.error('[Claude Width Profiles] Import error:', error);
            return { success: false, error: error.message || 'Import failed' };
        }
    }

    /**
     * Reset all settings to factory defaults.
     *
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function resetToDefaults() {
        try {
            const defaultProfile = createDefaultProfile({});

            await saveProfileData({
                syncEnabled: false,
                activeProfileId: 'default',
                profiles: {
                    default: defaultProfile
                },
                autoProfileRules: []
            });

            return { success: true };
        } catch (error) {
            console.error('[Claude Width Profiles] Reset error:', error);
            return { success: false, error: error.message || 'Reset failed' };
        }
    }

    // =========================================================================
    // SYNC OPERATIONS
    // =========================================================================

    /**
     * Enable or disable sync.
     *
     * @param {boolean} enabled - Whether to enable sync
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function setSyncEnabled(enabled) {
        try {
            const data = await loadProfileData();

            // If enabling sync, check if sync storage is available
            if (enabled && !browser.storage.sync) {
                return { success: false, error: 'Sync storage is not available' };
            }

            // If enabling sync, copy local data to sync
            if (enabled && !data.syncEnabled) {
                const profileData = {
                    [PROFILE_STORAGE_KEYS.ACTIVE_PROFILE_ID]: data.activeProfileId,
                    [PROFILE_STORAGE_KEYS.PROFILES]: data.profiles,
                    [PROFILE_STORAGE_KEYS.AUTO_PROFILE_RULES]: data.autoProfileRules
                };

                // Check size limit
                const dataSize = new Blob([JSON.stringify(profileData)]).size;
                if (dataSize > 90000) {
                    return {
                        success: false,
                        error: 'Profile data is too large for sync storage. Please reduce profiles or custom presets.'
                    };
                }

                await browser.storage.sync.set(profileData);
            }

            // Update sync enabled flag
            await browser.storage.local.set({
                [PROFILE_STORAGE_KEYS.SYNC_ENABLED]: enabled
            });

            return { success: true };
        } catch (error) {
            console.error('[Claude Width Profiles] Set sync error:', error);
            return { success: false, error: error.message || 'Failed to change sync setting' };
        }
    }

    /**
     * Get sync status information.
     *
     * @returns {Promise<Object>} Sync status
     */
    async function getSyncStatus() {
        try {
            const data = await loadProfileData();

            // Check if sync storage is available
            const syncAvailable = !!browser.storage.sync;

            // Get storage usage if available
            let syncBytesUsed = 0;
            let syncBytesAvailable = 102400; // 100KB default

            if (syncAvailable && browser.storage.sync.getBytesInUse) {
                try {
                    syncBytesUsed = await browser.storage.sync.getBytesInUse(null);
                } catch (e) {
                    // Ignore quota check errors
                }
            }

            return {
                enabled: data.syncEnabled,
                available: syncAvailable,
                bytesUsed: syncBytesUsed,
                bytesAvailable: syncBytesAvailable,
                percentUsed: Math.round((syncBytesUsed / syncBytesAvailable) * 100)
            };
        } catch (error) {
            console.error('[Claude Width Profiles] Get sync status error:', error);
            return {
                enabled: false,
                available: false,
                bytesUsed: 0,
                bytesAvailable: 0,
                percentUsed: 0
            };
        }
    }

    // =========================================================================
    // AUTO-PROFILE RULES
    // =========================================================================

    /**
     * Check if a URL matches a pattern.
     *
     * @param {string} url - URL to check
     * @param {string} pattern - URL pattern (supports * wildcards)
     * @returns {boolean} True if URL matches pattern
     */
    function matchUrlPattern(url, pattern) {
        try {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
                .replace(/\*/g, '.*'); // Convert * to .*

            const regex = new RegExp(`^${regexPattern}$`, 'i');
            return regex.test(url);
        } catch (e) {
            return false;
        }
    }

    /**
     * Get the profile to use for a given URL based on auto-profile rules.
     *
     * @param {string} url - Current URL
     * @returns {Promise<string|null>} Profile ID or null if no rule matches
     */
    async function getAutoProfileForUrl(url) {
        const data = await loadProfileData();

        for (const rule of data.autoProfileRules) {
            if (matchUrlPattern(url, rule.pattern)) {
                // Verify the profile still exists
                if (data.profiles[rule.profileId]) {
                    return rule.profileId;
                }
            }
        }

        return null;
    }

    /**
     * Add an auto-profile rule.
     *
     * @param {string} pattern - URL pattern
     * @param {string} profileId - Profile ID to activate
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function addAutoProfileRule(pattern, profileId) {
        if (!pattern || typeof pattern !== 'string') {
            return { success: false, error: 'Invalid URL pattern' };
        }

        const data = await loadProfileData();

        if (!data.profiles[profileId]) {
            return { success: false, error: 'Profile not found' };
        }

        // Check for duplicate pattern
        if (data.autoProfileRules.some(r => r.pattern === pattern)) {
            return { success: false, error: 'A rule with this pattern already exists' };
        }

        data.autoProfileRules.push({
            pattern: pattern,
            profileId: profileId
        });

        return saveProfileData(data);
    }

    /**
     * Remove an auto-profile rule.
     *
     * @param {string} pattern - URL pattern to remove
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function removeAutoProfileRule(pattern) {
        const data = await loadProfileData();

        const initialLength = data.autoProfileRules.length;
        data.autoProfileRules = data.autoProfileRules.filter(r => r.pattern !== pattern);

        if (data.autoProfileRules.length === initialLength) {
            return { success: false, error: 'Rule not found' };
        }

        return saveProfileData(data);
    }

    // =========================================================================
    // FLAT SETTINGS CONVERSION
    // =========================================================================

    /**
     * Convert active profile to flat settings for content script.
     * Returns settings as individual key-value pairs (compatible with existing storage format).
     *
     * @param {Object} profile - Profile object
     * @returns {Object} Flat settings object
     */
    function profileToFlatSettings(profile) {
        return {
            chatWidthPercent: profile.chatWidthPercent,
            theme: profile.theme,
            customPresets: profile.customPresets,
            fontSizePercent: profile.fontSizePercent,
            lineHeight: profile.lineHeight,
            messagePadding: profile.messagePadding,
            displayMode: profile.displayMode,
            codeBlockMaxHeight: profile.codeBlockMaxHeight,
            codeBlockWordWrap: profile.codeBlockWordWrap,
            codeBlocksCollapsed: profile.codeBlocksCollapsed,
            showTimestamps: profile.showTimestamps,
            showAvatars: profile.showAvatars,
            messageBubbleStyle: profile.messageBubbleStyle
        };
    }

    /**
     * Apply active profile settings to flat storage.
     * This maintains backward compatibility with content script which reads flat keys.
     *
     * @returns {Promise<{success: boolean, error?: string}>} Result
     */
    async function applyActiveProfileToStorage() {
        try {
            const { profile } = await getActiveProfile();
            const flatSettings = profileToFlatSettings(profile);

            await browser.storage.local.set(flatSettings);
            return { success: true };
        } catch (error) {
            console.error('[Claude Width Profiles] Apply profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // EXPOSE PUBLIC API
    // =========================================================================

    window.ClaudeWidthProfiles = {
        // Profile CRUD
        createProfile,
        createDefaultProfile,
        updateProfile,
        duplicateProfile,

        // Validation
        validateProfileName,
        validateProfile,
        validateImportData,

        // Sanitization
        sanitizeProfile,
        sanitizeEnhancedSettings,

        // Storage operations
        loadProfileData,
        saveProfileData,
        getActiveProfile,
        setActiveProfile,
        addProfile,
        updateProfileById,
        deleteProfile,

        // Import/Export
        exportSettings,
        importSettings,
        resetToDefaults,

        // Sync
        setSyncEnabled,
        getSyncStatus,

        // Auto-profile
        getAutoProfileForUrl,
        addAutoProfileRule,
        removeAutoProfileRule,
        matchUrlPattern,

        // Conversion
        profileToFlatSettings,
        applyActiveProfileToStorage,

        // Utilities
        generateProfileId
    };

})();
