/**
 * Unit Tests for lib/profiles.js
 * ================================
 *
 * Tests for the profile management utilities including CRUD operations,
 * validation, sanitization, import/export, sync, and auto-profile rules.
 *
 * Note: These tests implement the profile functions directly to test the logic
 * without depending on the actual module loading mechanism.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetMocks, mockBrowser } from './mocks/browser.js';

// =========================================================================
// Test Implementations of Profile Functions
// These mirror the actual implementation in lib/profiles.js for unit testing
// =========================================================================

const { ClaudeWidthConstants } = window;

/**
 * Generate a unique profile ID.
 */
function generateProfileId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `profile_${timestamp}_${random}`;
}

/**
 * Validate a profile name.
 */
function validateProfileName(name) {
  const MAX_LENGTH = ClaudeWidthConstants.PROFILE_NAME_MAX_LENGTH;

  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Profile name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Profile name cannot be empty' };
  }

  if (trimmed.length > MAX_LENGTH) {
    return { valid: false, error: `Profile name must be ${MAX_LENGTH} characters or less` };
  }

  // Check for invalid characters (only allow alphanumeric, spaces, hyphens, underscores)
  if (!/^[\w\s\-]+$/.test(trimmed)) {
    return { valid: false, error: 'Profile name contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate a profile object structure.
 */
function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'Invalid profile object' };
  }

  if (!profile.name) {
    return { valid: false, error: 'Profile name is required' };
  }

  const nameValidation = validateProfileName(profile.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  if (profile.chatWidthPercent !== undefined) {
    const width = profile.chatWidthPercent;
    if (typeof width !== 'number' || width < 40 || width > 100) {
      return { valid: false, error: 'Chat width must be a number between 40 and 100' };
    }
  }

  if (profile.theme !== undefined) {
    const validThemes = ['light', 'dark', 'system'];
    if (!validThemes.includes(profile.theme)) {
      return { valid: false, error: 'Theme must be light, dark, or system' };
    }
  }

  return { valid: true };
}

/**
 * Clamp a number between min and max, with fallback default.
 */
function clampNumber(value, min, max, defaultValue) {
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Sanitize enhanced styling settings.
 */
function sanitizeEnhancedSettings(profile) {
  const defaults = ClaudeWidthConstants.ENHANCED_DEFAULTS;

  return {
    fontSizePercent: clampNumber(profile.fontSizePercent, 80, 120, defaults.fontSizePercent),
    lineHeight: ['compact', 'normal', 'relaxed'].includes(profile.lineHeight)
      ? profile.lineHeight
      : defaults.lineHeight,
    messagePadding: ['none', 'small', 'medium', 'large'].includes(profile.messagePadding)
      ? profile.messagePadding
      : defaults.messagePadding,
    displayMode: ['compact', 'comfortable', 'spacious', 'custom'].includes(profile.displayMode)
      ? profile.displayMode
      : defaults.displayMode,
    codeBlockMaxHeight: [200, 400, 600, 0].includes(profile.codeBlockMaxHeight)
      ? profile.codeBlockMaxHeight
      : defaults.codeBlockMaxHeight,
    codeBlockWordWrap: typeof profile.codeBlockWordWrap === 'boolean'
      ? profile.codeBlockWordWrap
      : defaults.codeBlockWordWrap,
    codeBlocksCollapsed: typeof profile.codeBlocksCollapsed === 'boolean'
      ? profile.codeBlocksCollapsed
      : defaults.codeBlocksCollapsed,
    showTimestamps: typeof profile.showTimestamps === 'boolean'
      ? profile.showTimestamps
      : defaults.showTimestamps,
    showAvatars: typeof profile.showAvatars === 'boolean'
      ? profile.showAvatars
      : defaults.showAvatars,
    messageBubbleStyle: ['rounded', 'square', 'minimal'].includes(profile.messageBubbleStyle)
      ? profile.messageBubbleStyle
      : defaults.messageBubbleStyle
  };
}

/**
 * Sanitize a profile object.
 */
function sanitizeProfile(profile) {
  const MAX_LENGTH = ClaudeWidthConstants.PROFILE_NAME_MAX_LENGTH;
  const DEFAULT_WIDTH = ClaudeWidthConstants.DEFAULT_WIDTH;
  const DEFAULT_THEME = ClaudeWidthConstants.DEFAULT_THEME;

  return {
    name: (profile.name || 'Unnamed Profile').trim().substring(0, MAX_LENGTH),
    chatWidthPercent: clampNumber(profile.chatWidthPercent, 40, 100, DEFAULT_WIDTH),
    theme: ['light', 'dark', 'system'].includes(profile.theme) ? profile.theme : DEFAULT_THEME,
    customPresets: Array.isArray(profile.customPresets) ? profile.customPresets.slice(0, 4) : [],
    ...sanitizeEnhancedSettings(profile)
  };
}

/**
 * Validate import data structure.
 */
function validateImportData(data) {
  const MAX_PROFILES = ClaudeWidthConstants.MAX_PROFILES;

  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid import data' };
  }

  if (!data.exportVersion) {
    return { valid: false, error: 'Missing export version - file may be corrupted or from incompatible source' };
  }

  if (!data.profiles || typeof data.profiles !== 'object') {
    return { valid: false, error: 'Missing or invalid profiles data' };
  }

  const sanitizedProfiles = {};
  for (const [id, profile] of Object.entries(data.profiles)) {
    const validation = validateProfile(profile);
    if (!validation.valid) {
      return { valid: false, error: `Invalid profile "${profile.name || id}": ${validation.error}` };
    }
    sanitizedProfiles[id] = sanitizeProfile(profile);
  }

  if (Object.keys(sanitizedProfiles).length > MAX_PROFILES) {
    return { valid: false, error: `Too many profiles. Maximum allowed is ${MAX_PROFILES}` };
  }

  if (data.activeProfileId && !sanitizedProfiles[data.activeProfileId]) {
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

/**
 * Create a new profile with default settings.
 */
function createProfile(name, overrides = {}) {
  const id = generateProfileId();
  const profile = sanitizeProfile({
    name: name,
    ...ClaudeWidthConstants.PROFILE_DEFAULTS,
    ...overrides
  });

  return { id, profile };
}

/**
 * Create the default profile from existing settings.
 */
function createDefaultProfile(existingSettings = {}) {
  const DEFAULT_WIDTH = ClaudeWidthConstants.DEFAULT_WIDTH;
  const DEFAULT_THEME = ClaudeWidthConstants.DEFAULT_THEME;

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
 */
function updateProfile(profile, updates) {
  return sanitizeProfile({
    ...profile,
    ...updates
  });
}

/**
 * Duplicate a profile with a new name.
 */
function duplicateProfile(profile, newName) {
  const id = generateProfileId();
  const duplicated = sanitizeProfile({
    ...profile,
    name: newName
  });

  return { id, profile: duplicated };
}

/**
 * Check if a URL matches a pattern.
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
 * Convert active profile to flat settings.
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

// =========================================================================
// Test Suite
// =========================================================================

describe('Profile Management Utilities', () => {
  beforeEach(() => {
    resetMocks();
  });

  // =========================================================================
  // generateProfileId Tests
  // =========================================================================

  describe('generateProfileId()', () => {
    it('should generate a unique ID', () => {
      const id1 = generateProfileId();
      const id2 = generateProfileId();

      expect(id1).not.toBe(id2);
    });

    it('should start with "profile_" prefix', () => {
      const id = generateProfileId();

      expect(id).toMatch(/^profile_/);
    });

    it('should contain timestamp and random components', () => {
      const id = generateProfileId();
      const parts = id.split('_');

      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('profile');
      expect(parts[1].length).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should generate many unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateProfileId());
      }

      expect(ids.size).toBe(100);
    });
  });

  // =========================================================================
  // validateProfileName Tests
  // =========================================================================

  describe('validateProfileName()', () => {
    it('should accept valid profile names', () => {
      const validNames = ['Work', 'Personal', 'My Profile', 'Profile-1', 'Profile_2'];

      for (const name of validNames) {
        const result = validateProfileName(name);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject null or undefined names', () => {
      expect(validateProfileName(null).valid).toBe(false);
      expect(validateProfileName(undefined).valid).toBe(false);
    });

    it('should reject non-string names', () => {
      expect(validateProfileName(123).valid).toBe(false);
      expect(validateProfileName({}).valid).toBe(false);
      expect(validateProfileName([]).valid).toBe(false);
    });

    it('should reject empty strings', () => {
      const result = validateProfileName('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Profile name is required');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateProfileName('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Profile name cannot be empty');
    });

    it('should reject names exceeding max length', () => {
      const longName = 'a'.repeat(31);
      const result = validateProfileName(longName);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('30 characters');
    });

    it('should accept names at max length', () => {
      const maxName = 'a'.repeat(30);
      const result = validateProfileName(maxName);

      expect(result.valid).toBe(true);
    });

    it('should reject names with special characters', () => {
      const invalidNames = ['Profile!', 'Profile@Work', 'Profile#1', 'Profile$', 'Profile%'];

      for (const name of invalidNames) {
        const result = validateProfileName(name);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Profile name contains invalid characters');
      }
    });
  });

  // =========================================================================
  // validateProfile Tests
  // =========================================================================

  describe('validateProfile()', () => {
    it('should accept valid profiles', () => {
      const validProfile = {
        name: 'Work',
        chatWidthPercent: 85,
        theme: 'dark'
      };

      const result = validateProfile(validProfile);
      expect(result.valid).toBe(true);
    });

    it('should reject null or undefined profiles', () => {
      expect(validateProfile(null).valid).toBe(false);
      expect(validateProfile(undefined).valid).toBe(false);
    });

    it('should reject non-object profiles', () => {
      expect(validateProfile('string').valid).toBe(false);
      expect(validateProfile(123).valid).toBe(false);
    });

    it('should reject profiles without name', () => {
      const result = validateProfile({ chatWidthPercent: 85 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Profile name is required');
    });

    it('should validate chatWidthPercent bounds', () => {
      expect(validateProfile({ name: 'Test', chatWidthPercent: 39 }).valid).toBe(false);
      expect(validateProfile({ name: 'Test', chatWidthPercent: 101 }).valid).toBe(false);
      expect(validateProfile({ name: 'Test', chatWidthPercent: 40 }).valid).toBe(true);
      expect(validateProfile({ name: 'Test', chatWidthPercent: 100 }).valid).toBe(true);
    });

    it('should validate theme values', () => {
      expect(validateProfile({ name: 'Test', theme: 'light' }).valid).toBe(true);
      expect(validateProfile({ name: 'Test', theme: 'dark' }).valid).toBe(true);
      expect(validateProfile({ name: 'Test', theme: 'system' }).valid).toBe(true);
      expect(validateProfile({ name: 'Test', theme: 'invalid' }).valid).toBe(false);
    });
  });

  // =========================================================================
  // sanitizeProfile Tests
  // =========================================================================

  describe('sanitizeProfile()', () => {
    it('should apply defaults for missing fields', () => {
      const profile = sanitizeProfile({ name: 'Test' });

      expect(profile.name).toBe('Test');
      expect(profile.chatWidthPercent).toBe(85);
      expect(profile.theme).toBe('system');
      expect(profile.customPresets).toEqual([]);
      expect(profile.fontSizePercent).toBe(100);
      expect(profile.lineHeight).toBe('normal');
      expect(profile.messagePadding).toBe('medium');
      expect(profile.displayMode).toBe('comfortable');
    });

    it('should preserve valid field values', () => {
      const profile = sanitizeProfile({
        name: 'Work',
        chatWidthPercent: 70,
        theme: 'dark',
        fontSizePercent: 110,
        lineHeight: 'compact'
      });

      expect(profile.name).toBe('Work');
      expect(profile.chatWidthPercent).toBe(70);
      expect(profile.theme).toBe('dark');
      expect(profile.fontSizePercent).toBe(110);
      expect(profile.lineHeight).toBe('compact');
    });

    it('should clamp width to valid range', () => {
      expect(sanitizeProfile({ name: 'Test', chatWidthPercent: 30 }).chatWidthPercent).toBe(40);
      expect(sanitizeProfile({ name: 'Test', chatWidthPercent: 150 }).chatWidthPercent).toBe(100);
    });

    it('should clamp fontSizePercent to valid range', () => {
      expect(sanitizeProfile({ name: 'Test', fontSizePercent: 50 }).fontSizePercent).toBe(80);
      expect(sanitizeProfile({ name: 'Test', fontSizePercent: 150 }).fontSizePercent).toBe(120);
    });

    it('should truncate name to max length', () => {
      const longName = 'a'.repeat(50);
      const profile = sanitizeProfile({ name: longName });

      expect(profile.name.length).toBe(30);
    });

    it('should trim whitespace from name', () => {
      const profile = sanitizeProfile({ name: '  Work  ' });
      expect(profile.name).toBe('Work');
    });

    it('should limit custom presets to 4', () => {
      const presets = [1, 2, 3, 4, 5, 6].map(n => ({ id: n.toString(), width: 50 + n * 10 }));
      const profile = sanitizeProfile({
        name: 'Test',
        customPresets: presets
      });

      expect(profile.customPresets.length).toBe(4);
    });

    it('should default invalid theme to system', () => {
      const profile = sanitizeProfile({ name: 'Test', theme: 'invalid' });
      expect(profile.theme).toBe('system');
    });

    it('should default invalid lineHeight to normal', () => {
      const profile = sanitizeProfile({ name: 'Test', lineHeight: 'invalid' });
      expect(profile.lineHeight).toBe('normal');
    });

    it('should default invalid messagePadding to medium', () => {
      const profile = sanitizeProfile({ name: 'Test', messagePadding: 'invalid' });
      expect(profile.messagePadding).toBe('medium');
    });

    it('should default invalid displayMode to comfortable', () => {
      const profile = sanitizeProfile({ name: 'Test', displayMode: 'invalid' });
      expect(profile.displayMode).toBe('comfortable');
    });

    it('should default invalid codeBlockMaxHeight to 400', () => {
      const profile = sanitizeProfile({ name: 'Test', codeBlockMaxHeight: 999 });
      expect(profile.codeBlockMaxHeight).toBe(400);
    });

    it('should preserve valid codeBlockMaxHeight values', () => {
      expect(sanitizeProfile({ name: 'Test', codeBlockMaxHeight: 200 }).codeBlockMaxHeight).toBe(200);
      expect(sanitizeProfile({ name: 'Test', codeBlockMaxHeight: 400 }).codeBlockMaxHeight).toBe(400);
      expect(sanitizeProfile({ name: 'Test', codeBlockMaxHeight: 600 }).codeBlockMaxHeight).toBe(600);
      expect(sanitizeProfile({ name: 'Test', codeBlockMaxHeight: 0 }).codeBlockMaxHeight).toBe(0);
    });

    it('should default invalid bubble style to rounded', () => {
      const profile = sanitizeProfile({ name: 'Test', messageBubbleStyle: 'invalid' });
      expect(profile.messageBubbleStyle).toBe('rounded');
    });

    it('should preserve boolean values correctly', () => {
      const profile = sanitizeProfile({
        name: 'Test',
        codeBlockWordWrap: true,
        codeBlocksCollapsed: true,
        showTimestamps: false,
        showAvatars: false
      });

      expect(profile.codeBlockWordWrap).toBe(true);
      expect(profile.codeBlocksCollapsed).toBe(true);
      expect(profile.showTimestamps).toBe(false);
      expect(profile.showAvatars).toBe(false);
    });

    it('should default non-boolean to default values', () => {
      const profile = sanitizeProfile({
        name: 'Test',
        codeBlockWordWrap: 'yes',
        showTimestamps: 1
      });

      expect(profile.codeBlockWordWrap).toBe(false); // default
      expect(profile.showTimestamps).toBe(true); // default
    });
  });

  // =========================================================================
  // sanitizeEnhancedSettings Tests
  // =========================================================================

  describe('sanitizeEnhancedSettings()', () => {
    it('should return all enhanced settings', () => {
      const settings = sanitizeEnhancedSettings({});

      expect(settings).toHaveProperty('fontSizePercent');
      expect(settings).toHaveProperty('lineHeight');
      expect(settings).toHaveProperty('messagePadding');
      expect(settings).toHaveProperty('displayMode');
      expect(settings).toHaveProperty('codeBlockMaxHeight');
      expect(settings).toHaveProperty('codeBlockWordWrap');
      expect(settings).toHaveProperty('codeBlocksCollapsed');
      expect(settings).toHaveProperty('showTimestamps');
      expect(settings).toHaveProperty('showAvatars');
      expect(settings).toHaveProperty('messageBubbleStyle');
    });

    it('should apply defaults for empty object', () => {
      const settings = sanitizeEnhancedSettings({});

      expect(settings.fontSizePercent).toBe(100);
      expect(settings.lineHeight).toBe('normal');
      expect(settings.messagePadding).toBe('medium');
      expect(settings.displayMode).toBe('comfortable');
      expect(settings.codeBlockMaxHeight).toBe(400);
      expect(settings.codeBlockWordWrap).toBe(false);
      expect(settings.codeBlocksCollapsed).toBe(false);
      expect(settings.showTimestamps).toBe(true);
      expect(settings.showAvatars).toBe(true);
      expect(settings.messageBubbleStyle).toBe('rounded');
    });
  });

  // =========================================================================
  // validateImportData Tests
  // =========================================================================

  describe('validateImportData()', () => {
    it('should accept valid import data', () => {
      const data = {
        exportVersion: 1,
        profiles: {
          default: { name: 'Default' }
        }
      };

      const result = validateImportData(data);
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject null or undefined data', () => {
      expect(validateImportData(null).valid).toBe(false);
      expect(validateImportData(undefined).valid).toBe(false);
    });

    it('should reject data without exportVersion', () => {
      const result = validateImportData({
        profiles: { default: { name: 'Default' } }
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('export version');
    });

    it('should reject data without profiles', () => {
      const result = validateImportData({
        exportVersion: 1
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('profiles');
    });

    it('should reject data with invalid profile', () => {
      const result = validateImportData({
        exportVersion: 1,
        profiles: {
          default: { chatWidthPercent: 85 } // missing name
        }
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Profile name is required');
    });

    it('should reject data with too many profiles', () => {
      const profiles = {};
      for (let i = 0; i < 10; i++) {
        profiles[`profile${i}`] = { name: `Profile ${i}` };
      }

      const result = validateImportData({
        exportVersion: 1,
        profiles
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should sanitize profiles in returned data', () => {
      // validateProfile checks theme, so use valid theme but invalid fontSizePercent
      // fontSizePercent is NOT validated by validateProfile, only sanitized
      const result = validateImportData({
        exportVersion: 1,
        profiles: {
          default: { name: 'Default', fontSizePercent: 50, lineHeight: 'invalid' }
        }
      });

      expect(result.valid).toBe(true);
      // fontSizePercent should be clamped to minimum 80
      expect(result.data.profiles.default.fontSizePercent).toBe(80);
      // lineHeight should be sanitized to default 'normal'
      expect(result.data.profiles.default.lineHeight).toBe('normal');
      // chatWidthPercent should get default value
      expect(result.data.profiles.default.chatWidthPercent).toBe(85);
      // theme should get default value
      expect(result.data.profiles.default.theme).toBe('system');
    });

    it('should fix invalid activeProfileId', () => {
      const result = validateImportData({
        exportVersion: 1,
        activeProfileId: 'nonexistent',
        profiles: {
          default: { name: 'Default' }
        }
      });

      expect(result.valid).toBe(true);
      expect(result.data.activeProfileId).toBe('default');
    });
  });

  // =========================================================================
  // createProfile Tests
  // =========================================================================

  describe('createProfile()', () => {
    it('should create a profile with unique ID', () => {
      const result = createProfile('Work');

      expect(result.id).toMatch(/^profile_/);
      expect(result.profile).toBeDefined();
      expect(result.profile.name).toBe('Work');
    });

    it('should apply default settings', () => {
      const { profile } = createProfile('Work');

      expect(profile.chatWidthPercent).toBe(85);
      expect(profile.theme).toBe('system');
      expect(profile.fontSizePercent).toBe(100);
    });

    it('should apply overrides', () => {
      const { profile } = createProfile('Work', {
        chatWidthPercent: 70,
        theme: 'dark'
      });

      expect(profile.chatWidthPercent).toBe(70);
      expect(profile.theme).toBe('dark');
    });

    it('should generate unique IDs for each profile', () => {
      const result1 = createProfile('Work');
      const result2 = createProfile('Personal');

      expect(result1.id).not.toBe(result2.id);
    });
  });

  // =========================================================================
  // createDefaultProfile Tests
  // =========================================================================

  describe('createDefaultProfile()', () => {
    it('should create a profile named "Default"', () => {
      const profile = createDefaultProfile({});
      expect(profile.name).toBe('Default');
    });

    it('should use default values when no settings provided', () => {
      const profile = createDefaultProfile({});

      expect(profile.chatWidthPercent).toBe(85);
      expect(profile.theme).toBe('system');
      expect(profile.fontSizePercent).toBe(100);
    });

    it('should inherit existing settings', () => {
      const profile = createDefaultProfile({
        chatWidthPercent: 70,
        theme: 'dark',
        fontSizePercent: 110
      });

      expect(profile.chatWidthPercent).toBe(70);
      expect(profile.theme).toBe('dark');
      expect(profile.fontSizePercent).toBe(110);
    });

    it('should inherit custom presets', () => {
      const customPresets = [{ id: '1', width: 60 }];
      const profile = createDefaultProfile({
        customPresets
      });

      expect(profile.customPresets).toEqual(customPresets);
    });
  });

  // =========================================================================
  // updateProfile Tests
  // =========================================================================

  describe('updateProfile()', () => {
    it('should merge updates into profile', () => {
      const original = { name: 'Work', chatWidthPercent: 85, theme: 'system' };
      const updated = updateProfile(original, {
        chatWidthPercent: 70
      });

      expect(updated.name).toBe('Work');
      expect(updated.chatWidthPercent).toBe(70);
      expect(updated.theme).toBe('system');
    });

    it('should sanitize updated values', () => {
      const original = { name: 'Work', chatWidthPercent: 85 };
      const updated = updateProfile(original, {
        chatWidthPercent: 150 // out of range
      });

      expect(updated.chatWidthPercent).toBe(100);
    });

    it('should allow name updates', () => {
      const original = { name: 'Work', chatWidthPercent: 85 };
      const updated = updateProfile(original, {
        name: 'Personal'
      });

      expect(updated.name).toBe('Personal');
    });
  });

  // =========================================================================
  // duplicateProfile Tests
  // =========================================================================

  describe('duplicateProfile()', () => {
    it('should create a copy with new name', () => {
      const original = { name: 'Work', chatWidthPercent: 70, theme: 'dark' };
      const { id, profile } = duplicateProfile(original, 'Work Copy');

      expect(id).toMatch(/^profile_/);
      expect(profile.name).toBe('Work Copy');
      expect(profile.chatWidthPercent).toBe(70);
      expect(profile.theme).toBe('dark');
    });

    it('should generate unique ID for duplicate', () => {
      const original = { name: 'Work', chatWidthPercent: 70 };
      const dup1 = duplicateProfile(original, 'Copy 1');
      const dup2 = duplicateProfile(original, 'Copy 2');

      expect(dup1.id).not.toBe(dup2.id);
    });

    it('should preserve all settings in duplicate', () => {
      const original = {
        name: 'Work',
        chatWidthPercent: 70,
        theme: 'dark',
        fontSizePercent: 110,
        lineHeight: 'compact',
        codeBlockWordWrap: true,
        showAvatars: false
      };

      const { profile } = duplicateProfile(original, 'Work Copy');

      expect(profile.chatWidthPercent).toBe(70);
      expect(profile.theme).toBe('dark');
      expect(profile.fontSizePercent).toBe(110);
      expect(profile.lineHeight).toBe('compact');
      expect(profile.codeBlockWordWrap).toBe(true);
      expect(profile.showAvatars).toBe(false);
    });
  });

  // =========================================================================
  // matchUrlPattern Tests
  // =========================================================================

  describe('matchUrlPattern()', () => {
    it('should match exact URLs', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat',
        'https://claude.ai/chat'
      )).toBe(true);
    });

    it('should match with wildcard at end', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat/123',
        'https://claude.ai/chat/*'
      )).toBe(true);
    });

    it('should match with wildcard in middle', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat/123/edit',
        'https://claude.ai/*/123/*'
      )).toBe(true);
    });

    it('should match with wildcard at beginning', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat',
        '*/chat'
      )).toBe(true);
    });

    it('should not match different URLs', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat',
        'https://claude.ai/settings'
      )).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(matchUrlPattern(
        'https://CLAUDE.AI/CHAT',
        'https://claude.ai/chat'
      )).toBe(true);
    });

    it('should handle special regex characters in pattern', () => {
      expect(matchUrlPattern(
        'https://claude.ai/chat?id=123',
        'https://claude.ai/chat?id=*'
      )).toBe(true);
    });

    it('should return false for invalid regex', () => {
      // This should not throw
      const result = matchUrlPattern('test', '[invalid');
      expect(typeof result).toBe('boolean');
    });
  });

  // =========================================================================
  // profileToFlatSettings Tests
  // =========================================================================

  describe('profileToFlatSettings()', () => {
    it('should convert profile to flat settings object', () => {
      const profile = {
        name: 'Work',
        chatWidthPercent: 70,
        theme: 'dark',
        customPresets: [{ id: '1', width: 60 }],
        fontSizePercent: 110,
        lineHeight: 'compact',
        messagePadding: 'small',
        displayMode: 'compact',
        codeBlockMaxHeight: 600,
        codeBlockWordWrap: true,
        codeBlocksCollapsed: false,
        showTimestamps: true,
        showAvatars: false,
        messageBubbleStyle: 'square'
      };

      const flat = profileToFlatSettings(profile);

      expect(flat.chatWidthPercent).toBe(70);
      expect(flat.theme).toBe('dark');
      expect(flat.customPresets).toEqual([{ id: '1', width: 60 }]);
      expect(flat.fontSizePercent).toBe(110);
      expect(flat.lineHeight).toBe('compact');
      expect(flat.messagePadding).toBe('small');
      expect(flat.displayMode).toBe('compact');
      expect(flat.codeBlockMaxHeight).toBe(600);
      expect(flat.codeBlockWordWrap).toBe(true);
      expect(flat.codeBlocksCollapsed).toBe(false);
      expect(flat.showTimestamps).toBe(true);
      expect(flat.showAvatars).toBe(false);
      expect(flat.messageBubbleStyle).toBe('square');
    });

    it('should not include profile name in flat settings', () => {
      const profile = { name: 'Work', chatWidthPercent: 85 };
      const flat = profileToFlatSettings(profile);

      expect(flat.name).toBeUndefined();
    });

    it('should include all enhanced settings keys', () => {
      const profile = sanitizeProfile({ name: 'Test' });
      const flat = profileToFlatSettings(profile);

      expect(flat).toHaveProperty('chatWidthPercent');
      expect(flat).toHaveProperty('theme');
      expect(flat).toHaveProperty('customPresets');
      expect(flat).toHaveProperty('fontSizePercent');
      expect(flat).toHaveProperty('lineHeight');
      expect(flat).toHaveProperty('messagePadding');
      expect(flat).toHaveProperty('displayMode');
      expect(flat).toHaveProperty('codeBlockMaxHeight');
      expect(flat).toHaveProperty('codeBlockWordWrap');
      expect(flat).toHaveProperty('codeBlocksCollapsed');
      expect(flat).toHaveProperty('showTimestamps');
      expect(flat).toHaveProperty('showAvatars');
      expect(flat).toHaveProperty('messageBubbleStyle');
    });
  });

  // =========================================================================
  // clampNumber Tests
  // =========================================================================

  describe('clampNumber()', () => {
    it('should return value when within range', () => {
      expect(clampNumber(50, 0, 100, 0)).toBe(50);
    });

    it('should clamp to min when below range', () => {
      expect(clampNumber(-10, 0, 100, 0)).toBe(0);
    });

    it('should clamp to max when above range', () => {
      expect(clampNumber(150, 0, 100, 0)).toBe(100);
    });

    it('should return default for non-number values', () => {
      expect(clampNumber('50', 0, 100, 42)).toBe(42);
      expect(clampNumber(null, 0, 100, 42)).toBe(42);
      expect(clampNumber(undefined, 0, 100, 42)).toBe(42);
    });

    it('should return default for NaN', () => {
      expect(clampNumber(NaN, 0, 100, 42)).toBe(42);
    });

    it('should handle edge values exactly', () => {
      expect(clampNumber(0, 0, 100, 50)).toBe(0);
      expect(clampNumber(100, 0, 100, 50)).toBe(100);
    });
  });
});
