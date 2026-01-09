/**
 * Unit Tests for lib/constants.js
 * =================================
 *
 * Tests for the shared constants module that defines extension-wide
 * configuration values and the logging utility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ClaudeWidthConstants', () => {
  describe('Width Settings', () => {
    it('should have correct DEFAULT_WIDTH', () => {
      expect(window.ClaudeWidthConstants.DEFAULT_WIDTH).toBe(85);
    });

    it('should have correct MIN_WIDTH', () => {
      expect(window.ClaudeWidthConstants.MIN_WIDTH).toBe(40);
    });

    it('should have correct MAX_WIDTH', () => {
      expect(window.ClaudeWidthConstants.MAX_WIDTH).toBe(100);
    });

    it('should have DEFAULT_WIDTH within MIN and MAX range', () => {
      const { DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH } = window.ClaudeWidthConstants;
      expect(DEFAULT_WIDTH).toBeGreaterThanOrEqual(MIN_WIDTH);
      expect(DEFAULT_WIDTH).toBeLessThanOrEqual(MAX_WIDTH);
    });

    it('should have PRESET_CYCLE array with valid widths', () => {
      const { PRESET_CYCLE, MIN_WIDTH, MAX_WIDTH } = window.ClaudeWidthConstants;
      expect(Array.isArray(PRESET_CYCLE)).toBe(true);
      expect(PRESET_CYCLE.length).toBeGreaterThan(0);

      for (const width of PRESET_CYCLE) {
        expect(width).toBeGreaterThanOrEqual(MIN_WIDTH);
        expect(width).toBeLessThanOrEqual(MAX_WIDTH);
      }
    });

    it('should have PRESET_CYCLE in ascending order', () => {
      const { PRESET_CYCLE } = window.ClaudeWidthConstants;
      for (let i = 1; i < PRESET_CYCLE.length; i++) {
        expect(PRESET_CYCLE[i]).toBeGreaterThan(PRESET_CYCLE[i - 1]);
      }
    });
  });

  describe('Storage Keys', () => {
    it('should have STORAGE_KEY defined', () => {
      expect(window.ClaudeWidthConstants.STORAGE_KEY).toBe('chatWidthPercent');
    });

    it('should have THEME_STORAGE_KEY defined', () => {
      expect(window.ClaudeWidthConstants.THEME_STORAGE_KEY).toBe('theme');
    });

    it('should have LAST_WIDTH_KEY defined', () => {
      expect(window.ClaudeWidthConstants.LAST_WIDTH_KEY).toBe('lastNonDefaultWidth');
    });
  });

  describe('Enhanced Styling Keys', () => {
    it('should have ENHANCED_KEYS object with all required keys', () => {
      const { ENHANCED_KEYS } = window.ClaudeWidthConstants;
      expect(ENHANCED_KEYS).toBeDefined();

      const expectedKeys = [
        'FONT_SIZE', 'LINE_HEIGHT', 'MESSAGE_PADDING', 'DISPLAY_MODE',
        'CODE_BLOCK_HEIGHT', 'CODE_BLOCK_WRAP', 'CODE_BLOCKS_COLLAPSED',
        'SHOW_TIMESTAMPS', 'SHOW_AVATARS', 'BUBBLE_STYLE'
      ];

      for (const key of expectedKeys) {
        expect(ENHANCED_KEYS[key]).toBeDefined();
        expect(typeof ENHANCED_KEYS[key]).toBe('string');
      }
    });

    it('should have ENHANCED_DEFAULTS object with matching keys', () => {
      const { ENHANCED_KEYS, ENHANCED_DEFAULTS } = window.ClaudeWidthConstants;

      for (const key of Object.values(ENHANCED_KEYS)) {
        expect(ENHANCED_DEFAULTS).toHaveProperty(key);
      }
    });

    it('should have valid ENHANCED_DEFAULTS values', () => {
      const { ENHANCED_DEFAULTS } = window.ClaudeWidthConstants;

      expect(ENHANCED_DEFAULTS.fontSizePercent).toBe(100);
      expect(ENHANCED_DEFAULTS.lineHeight).toBe('normal');
      expect(ENHANCED_DEFAULTS.messagePadding).toBe('medium');
      expect(ENHANCED_DEFAULTS.displayMode).toBe('comfortable');
      expect(ENHANCED_DEFAULTS.codeBlockMaxHeight).toBe(400);
      expect(ENHANCED_DEFAULTS.codeBlockWordWrap).toBe(false);
      expect(ENHANCED_DEFAULTS.codeBlocksCollapsed).toBe(false);
      expect(ENHANCED_DEFAULTS.showTimestamps).toBe(true);
      expect(ENHANCED_DEFAULTS.showAvatars).toBe(true);
      expect(ENHANCED_DEFAULTS.messageBubbleStyle).toBe('rounded');
    });
  });

  describe('Display Mode Presets', () => {
    it('should have compact, comfortable, and spacious modes', () => {
      const { DISPLAY_MODE_PRESETS } = window.ClaudeWidthConstants;

      expect(DISPLAY_MODE_PRESETS).toHaveProperty('compact');
      expect(DISPLAY_MODE_PRESETS).toHaveProperty('comfortable');
      expect(DISPLAY_MODE_PRESETS).toHaveProperty('spacious');
    });

    it('should have valid preset configurations', () => {
      const { DISPLAY_MODE_PRESETS } = window.ClaudeWidthConstants;

      for (const [mode, preset] of Object.entries(DISPLAY_MODE_PRESETS)) {
        expect(preset).toHaveProperty('lineHeight');
        expect(preset).toHaveProperty('messagePadding');
        expect(preset).toHaveProperty('fontSize');
        expect(typeof preset.fontSize).toBe('number');
      }
    });

    it('should have decreasing font sizes from spacious to compact', () => {
      const { DISPLAY_MODE_PRESETS } = window.ClaudeWidthConstants;

      expect(DISPLAY_MODE_PRESETS.compact.fontSize)
        .toBeLessThan(DISPLAY_MODE_PRESETS.comfortable.fontSize);
      expect(DISPLAY_MODE_PRESETS.comfortable.fontSize)
        .toBeLessThan(DISPLAY_MODE_PRESETS.spacious.fontSize);
    });
  });

  describe('Timing Constants', () => {
    it('should have TIMING object with required values', () => {
      const { TIMING } = window.ClaudeWidthConstants;

      expect(TIMING.DEBOUNCE_MS).toBeDefined();
      expect(TIMING.ANIMATION_MS).toBeDefined();
      expect(TIMING.SR_ANNOUNCE_DELAY_MS).toBeDefined();
      expect(TIMING.INIT_RETRY_INTERVALS).toBeDefined();
    });

    it('should have positive timing values', () => {
      const { TIMING } = window.ClaudeWidthConstants;

      expect(TIMING.DEBOUNCE_MS).toBeGreaterThan(0);
      expect(TIMING.ANIMATION_MS).toBeGreaterThan(0);
      expect(TIMING.SR_ANNOUNCE_DELAY_MS).toBeGreaterThan(0);
    });

    it('should have INIT_RETRY_INTERVALS in ascending order', () => {
      const { TIMING } = window.ClaudeWidthConstants;

      for (let i = 1; i < TIMING.INIT_RETRY_INTERVALS.length; i++) {
        expect(TIMING.INIT_RETRY_INTERVALS[i])
          .toBeGreaterThan(TIMING.INIT_RETRY_INTERVALS[i - 1]);
      }
    });
  });

  describe('Preset Configuration', () => {
    it('should have MAX_CUSTOM_PRESETS as positive integer', () => {
      expect(window.ClaudeWidthConstants.MAX_CUSTOM_PRESETS).toBe(4);
    });

    it('should have MAX_RECENT_WIDTHS as positive integer', () => {
      expect(window.ClaudeWidthConstants.MAX_RECENT_WIDTHS).toBe(3);
    });

    it('should have BUILT_IN_PRESETS array', () => {
      const { BUILT_IN_PRESETS } = window.ClaudeWidthConstants;

      expect(Array.isArray(BUILT_IN_PRESETS)).toBe(true);
      expect(BUILT_IN_PRESETS.length).toBe(4);
    });

    it('should have valid BUILT_IN_PRESETS structure', () => {
      const { BUILT_IN_PRESETS, MIN_WIDTH, MAX_WIDTH } = window.ClaudeWidthConstants;

      for (const preset of BUILT_IN_PRESETS) {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('width');
        expect(preset).toHaveProperty('builtIn');
        expect(preset.builtIn).toBe(true);
        expect(preset.width).toBeGreaterThanOrEqual(MIN_WIDTH);
        expect(preset.width).toBeLessThanOrEqual(MAX_WIDTH);
      }
    });

    it('should have unique preset IDs', () => {
      const { BUILT_IN_PRESETS } = window.ClaudeWidthConstants;
      const ids = BUILT_IN_PRESETS.map(p => p.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('Theme Configuration', () => {
    it('should have DEFAULT_THEME defined', () => {
      expect(window.ClaudeWidthConstants.DEFAULT_THEME).toBe('system');
    });

    it('should have VALID_THEMES array', () => {
      const { VALID_THEMES } = window.ClaudeWidthConstants;

      expect(Array.isArray(VALID_THEMES)).toBe(true);
      expect(VALID_THEMES).toContain('light');
      expect(VALID_THEMES).toContain('dark');
      expect(VALID_THEMES).toContain('system');
    });

    it('should have DEFAULT_THEME in VALID_THEMES', () => {
      const { DEFAULT_THEME, VALID_THEMES } = window.ClaudeWidthConstants;
      expect(VALID_THEMES).toContain(DEFAULT_THEME);
    });
  });

  describe('Badge Configuration', () => {
    it('should have BADGE_COLOR as valid hex color', () => {
      const { BADGE_COLOR } = window.ClaudeWidthConstants;
      expect(BADGE_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have BADGE_TEXT_COLOR as valid hex color', () => {
      const { BADGE_TEXT_COLOR } = window.ClaudeWidthConstants;
      expect(BADGE_TEXT_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe('ClaudeWidthLogger', () => {
  beforeEach(() => {
    // Reset logger mocks
    window.ClaudeWidthLogger.debug.mockClear();
    window.ClaudeWidthLogger.info.mockClear();
    window.ClaudeWidthLogger.warn.mockClear();
    window.ClaudeWidthLogger.error.mockClear();
    window.ClaudeWidthLogger.handleError.mockClear();
  });

  describe('Configuration', () => {
    it('should have PREFIX defined', () => {
      expect(window.ClaudeWidthLogger.PREFIX).toBe('[Claude Width]');
    });

    it('should have LEVELS object', () => {
      const { LEVELS } = window.ClaudeWidthLogger;

      expect(LEVELS.DEBUG).toBe(0);
      expect(LEVELS.INFO).toBe(1);
      expect(LEVELS.WARN).toBe(2);
      expect(LEVELS.ERROR).toBe(3);
    });

    it('should have currentLevel set to INFO by default', () => {
      expect(window.ClaudeWidthLogger.currentLevel).toBe(1);
    });
  });

  describe('format()', () => {
    it('should format message with prefix and module', () => {
      const result = window.ClaudeWidthLogger.format('TestModule', 'Test message');
      expect(result).toBe('[Claude Width] [TestModule] Test message');
    });

    it('should handle empty module', () => {
      const result = window.ClaudeWidthLogger.format('', 'Test message');
      expect(result).toBe('[Claude Width] [] Test message');
    });

    it('should handle empty message', () => {
      const result = window.ClaudeWidthLogger.format('TestModule', '');
      expect(result).toBe('[Claude Width] [TestModule] ');
    });
  });

  describe('Logging Methods', () => {
    it('should have debug method', () => {
      expect(typeof window.ClaudeWidthLogger.debug).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof window.ClaudeWidthLogger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof window.ClaudeWidthLogger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof window.ClaudeWidthLogger.error).toBe('function');
    });
  });

  describe('handleError()', () => {
    it('should return standardized error object', () => {
      const testError = new Error('Test error');
      const result = window.ClaudeWidthLogger.handleError('TestModule', 'Test operation', testError);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Test operation failed');
      expect(result.error).toContain('Test error');
      expect(result).toHaveProperty('details', testError);
    });

    it('should call handleError mock', () => {
      const testError = new Error('Test error');
      window.ClaudeWidthLogger.handleError('Module', 'Op', testError);

      expect(window.ClaudeWidthLogger.handleError).toHaveBeenCalledWith('Module', 'Op', testError);
    });
  });
});
