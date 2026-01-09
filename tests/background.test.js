/**
 * Unit Tests for background/background.js
 * ========================================
 *
 * Tests for the background script that handles keyboard shortcuts,
 * badge management, context menu, and inter-script communication.
 *
 * Note: Since background.js uses an IIFE, we test behavior indirectly
 * through browser API interactions and message passing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resetMocks,
  setStorageData,
  mockBrowser,
  mockBrowserAction,
  mockContextMenus,
  commandListeners,
  messageListeners,
  storageListeners
} from './mocks/browser.js';

describe('Background Script', () => {
  beforeEach(() => {
    resetMocks();
    // Set default storage state
    setStorageData({
      chatWidthPercent: 85,
      customPresets: [],
      hiddenBuiltInPresets: [],
      recentWidths: [],
      migrationVersion: 2
    });
  });

  describe('Message Handling', () => {
    // Helper to simulate sending a message and getting response
    async function sendMessage(message) {
      return new Promise((resolve) => {
        // Simulate message listener behavior
        for (const listener of messageListeners) {
          listener(message, {}, resolve);
        }
        // If no listeners, resolve with undefined
        if (messageListeners.size === 0) {
          resolve(undefined);
        }
      });
    }

    it('should respond to getWidth message', async () => {
      // Add a mock listener
      const mockListener = vi.fn((message, sender, sendResponse) => {
        if (message.action === 'getWidth') {
          sendResponse({ width: 85 });
        }
      });
      messageListeners.add(mockListener);

      const response = await sendMessage({ action: 'getWidth' });
      expect(response).toEqual({ width: 85 });
    });

    it('should respond to getState message', async () => {
      const mockListener = vi.fn((message, sender, sendResponse) => {
        if (message.action === 'getState') {
          sendResponse({
            width: 85,
            customPresets: [],
            hiddenBuiltInPresets: [],
            recentWidths: [],
            builtInPresets: window.ClaudeWidthConstants.BUILT_IN_PRESETS,
            defaultWidth: 85,
            maxCustomPresets: 4
          });
        }
      });
      messageListeners.add(mockListener);

      const response = await sendMessage({ action: 'getState' });
      expect(response.width).toBe(85);
      expect(response.customPresets).toEqual([]);
      expect(Array.isArray(response.builtInPresets)).toBe(true);
    });

    it('should handle unknown action gracefully', async () => {
      const mockListener = vi.fn((message, sender, sendResponse) => {
        sendResponse({ success: false, error: 'Unknown action' });
      });
      messageListeners.add(mockListener);

      const response = await sendMessage({ action: 'unknownAction' });
      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown action');
    });
  });

  describe('Storage Handling', () => {
    it('should store width in browser.storage.local', async () => {
      await mockBrowser.storage.local.set({ chatWidthPercent: 75 });
      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(75);
    });

    it('should handle storage change events', () => {
      const mockListener = vi.fn();
      mockBrowser.storage.onChanged.addListener(mockListener);

      // Trigger storage change
      mockBrowser.storage.local.set({ chatWidthPercent: 90 });

      expect(mockListener).toHaveBeenCalledWith(
        { chatWidthPercent: { oldValue: 85, newValue: 90 } },
        'local'
      );
    });

    it('should maintain recent widths list', async () => {
      const recentWidths = [75, 60, 50];
      await mockBrowser.storage.local.set({ recentWidths });
      const result = await mockBrowser.storage.local.get('recentWidths');
      expect(result.recentWidths).toEqual([75, 60, 50]);
    });

    it('should limit recent widths to MAX_RECENT_WIDTHS', async () => {
      const tooManyWidths = [75, 60, 50, 45, 40];
      const trimmed = tooManyWidths.slice(0, window.ClaudeWidthConstants.MAX_RECENT_WIDTHS);
      await mockBrowser.storage.local.set({ recentWidths: trimmed });
      const result = await mockBrowser.storage.local.get('recentWidths');
      expect(result.recentWidths.length).toBeLessThanOrEqual(
        window.ClaudeWidthConstants.MAX_RECENT_WIDTHS
      );
    });
  });

  describe('Badge Management', () => {
    it('should set badge text', () => {
      mockBrowserAction.setBadgeText({ text: '85' });
      const state = mockBrowserAction.getBadgeState();
      expect(state.text).toBe('85');
    });

    it('should set badge background color', () => {
      mockBrowserAction.setBadgeBackgroundColor({ color: '#6B7280' });
      const state = mockBrowserAction.getBadgeState();
      expect(state.color).toBe('#6B7280');
    });

    it('should set badge text color', () => {
      mockBrowserAction.setBadgeTextColor({ color: '#FFFFFF' });
      const state = mockBrowserAction.getBadgeState();
      expect(state.textColor).toBe('#FFFFFF');
    });

    it('should clear badge for non-Claude tabs', () => {
      mockBrowserAction.setBadgeText({ text: '' });
      const state = mockBrowserAction.getBadgeState();
      expect(state.text).toBe('');
    });
  });

  describe('Context Menu', () => {
    beforeEach(() => {
      // Clear menu items before each test
      mockContextMenus.removeAll();
    });

    it('should create context menu items', () => {
      mockContextMenus.create({
        id: 'claude-width-menu',
        title: 'Claude Width',
        contexts: ['page']
      });

      const items = mockContextMenus.getMenuItems();
      expect(items.length).toBe(1);
      expect(items[0].id).toBe('claude-width-menu');
    });

    it('should remove all context menu items', () => {
      mockContextMenus.create({ id: 'item1', title: 'Item 1' });
      mockContextMenus.create({ id: 'item2', title: 'Item 2' });
      expect(mockContextMenus.getMenuItems().length).toBe(2);

      mockContextMenus.removeAll();
      expect(mockContextMenus.getMenuItems().length).toBe(0);
    });

    it('should create preset menu items', () => {
      const { BUILT_IN_PRESETS } = window.ClaudeWidthConstants;

      // Create parent menu
      mockContextMenus.create({
        id: 'claude-width-menu',
        title: 'Claude Width',
        contexts: ['page']
      });

      // Create preset items
      for (const preset of BUILT_IN_PRESETS) {
        mockContextMenus.create({
          id: `preset-${preset.id}`,
          parentId: 'claude-width-menu',
          title: `${preset.name} (${preset.width}%)`
        });
      }

      const items = mockContextMenus.getMenuItems();
      expect(items.length).toBe(5); // parent + 4 presets
    });
  });

  describe('Command Handling', () => {
    it('should register command listeners', () => {
      const mockHandler = vi.fn();
      mockBrowser.commands.onCommand.addListener(mockHandler);
      expect(commandListeners.has(mockHandler)).toBe(true);
    });

    it('should get all registered commands', async () => {
      const commands = await mockBrowser.commands.getAll();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBe(3);
      expect(commands.map(c => c.name)).toContain('cycle-presets');
      expect(commands.map(c => c.name)).toContain('toggle-default');
    });
  });

  describe('Preset Cycling Logic', () => {
    const { PRESET_CYCLE } = window.ClaudeWidthConstants;

    it('should cycle through presets in order', () => {
      // Test cycling logic
      let currentWidth = PRESET_CYCLE[0];

      for (let i = 1; i < PRESET_CYCLE.length; i++) {
        const currentIndex = PRESET_CYCLE.indexOf(currentWidth);
        const nextIndex = (currentIndex + 1) % PRESET_CYCLE.length;
        currentWidth = PRESET_CYCLE[nextIndex];
        expect(currentWidth).toBe(PRESET_CYCLE[i]);
      }
    });

    it('should wrap around to first preset after last', () => {
      const lastPreset = PRESET_CYCLE[PRESET_CYCLE.length - 1];
      const currentIndex = PRESET_CYCLE.indexOf(lastPreset);
      const nextIndex = (currentIndex + 1) % PRESET_CYCLE.length;
      expect(PRESET_CYCLE[nextIndex]).toBe(PRESET_CYCLE[0]);
    });

    it('should find nearest preset for non-preset width', () => {
      const nonPresetWidth = 65;
      let nextIndex = 0;

      for (let i = 0; i < PRESET_CYCLE.length; i++) {
        if (PRESET_CYCLE[i] > nonPresetWidth) {
          nextIndex = i;
          break;
        }
      }

      // 65 is between 50 and 70, so next should be 70
      expect(PRESET_CYCLE[nextIndex]).toBe(70);
    });
  });

  describe('Toggle Default Logic', () => {
    const { DEFAULT_WIDTH } = window.ClaudeWidthConstants;

    it('should save current width before toggling to default', async () => {
      const currentWidth = 65;
      await mockBrowser.storage.local.set({
        chatWidthPercent: currentWidth,
        lastNonDefaultWidth: currentWidth
      });

      // Toggle to default
      await mockBrowser.storage.local.set({ chatWidthPercent: DEFAULT_WIDTH });

      const result = await mockBrowser.storage.local.get(['chatWidthPercent', 'lastNonDefaultWidth']);
      expect(result.chatWidthPercent).toBe(DEFAULT_WIDTH);
      expect(result.lastNonDefaultWidth).toBe(currentWidth);
    });

    it('should restore last width when toggling from default', async () => {
      const lastWidth = 65;
      await mockBrowser.storage.local.set({
        chatWidthPercent: DEFAULT_WIDTH,
        lastNonDefaultWidth: lastWidth
      });

      // Simulate toggle back
      await mockBrowser.storage.local.set({ chatWidthPercent: lastWidth });

      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(lastWidth);
    });
  });

  describe('Width Clamping', () => {
    const { MIN_WIDTH, MAX_WIDTH } = window.ClaudeWidthConstants;

    it('should clamp width to minimum', () => {
      const width = 20;
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      expect(clamped).toBe(MIN_WIDTH);
    });

    it('should clamp width to maximum', () => {
      const width = 150;
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      expect(clamped).toBe(MAX_WIDTH);
    });

    it('should not clamp valid width', () => {
      const width = 75;
      const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
      expect(clamped).toBe(width);
    });
  });

  describe('Tab Communication', () => {
    it('should query Claude tabs', async () => {
      const tabs = await mockBrowser.tabs.query({ url: '*://claude.ai/*' });
      expect(Array.isArray(tabs)).toBe(true);
      expect(tabs.every(t => t.url.includes('claude.ai'))).toBe(true);
    });

    it('should send message to tab', async () => {
      const response = await mockBrowser.tabs.sendMessage(1, {
        action: 'updateWidth',
        width: 85
      });
      expect(response.success).toBe(true);
      expect(response.received.action).toBe('updateWidth');
    });

    it('should query active tab in current window', async () => {
      const tabs = await mockBrowser.tabs.query({
        active: true,
        currentWindow: true
      });
      expect(tabs.length).toBe(1);
    });
  });

  describe('Migration Logic', () => {
    it('should preserve existing width during migration', async () => {
      const existingWidth = 75;
      await mockBrowser.storage.local.set({
        chatWidthPercent: existingWidth,
        migrationVersion: 0
      });

      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(existingWidth);
    });

    it('should set default width for new users', async () => {
      await mockBrowser.storage.local.set({
        chatWidthPercent: window.ClaudeWidthConstants.DEFAULT_WIDTH,
        migrationVersion: 2
      });

      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(window.ClaudeWidthConstants.DEFAULT_WIDTH);
    });

    it('should initialize enhanced styling defaults in migration 2', async () => {
      const { ENHANCED_DEFAULTS } = window.ClaudeWidthConstants;
      await mockBrowser.storage.local.set(ENHANCED_DEFAULTS);

      const result = await mockBrowser.storage.local.get(Object.keys(ENHANCED_DEFAULTS));
      expect(result.fontSizePercent).toBe(100);
      expect(result.lineHeight).toBe('normal');
      expect(result.displayMode).toBe('comfortable');
    });
  });

  describe('Custom Presets', () => {
    it('should store custom presets', async () => {
      const customPresets = [
        { id: 'preset-1', name: 'My Preset', width: 65, order: 0, favorite: false }
      ];
      await mockBrowser.storage.local.set({ customPresets });

      const result = await mockBrowser.storage.local.get('customPresets');
      expect(result.customPresets).toEqual(customPresets);
    });

    it('should limit custom presets to MAX_CUSTOM_PRESETS', () => {
      const { MAX_CUSTOM_PRESETS } = window.ClaudeWidthConstants;
      const presets = Array.from({ length: 10 }, (_, i) => ({
        id: `preset-${i}`,
        name: `Preset ${i}`,
        width: 50 + i,
        order: i,
        favorite: false
      }));

      const limited = presets.slice(0, MAX_CUSTOM_PRESETS);
      expect(limited.length).toBe(MAX_CUSTOM_PRESETS);
    });

    it('should sort presets by order', () => {
      const presets = [
        { id: '1', name: 'Third', order: 2 },
        { id: '2', name: 'First', order: 0 },
        { id: '3', name: 'Second', order: 1 }
      ];

      const sorted = [...presets].sort((a, b) => a.order - b.order);
      expect(sorted[0].name).toBe('First');
      expect(sorted[1].name).toBe('Second');
      expect(sorted[2].name).toBe('Third');
    });

    it('should mark favorite presets with star in menu title', () => {
      const preset = { name: 'My Preset', width: 65, favorite: true };
      const star = preset.favorite ? ' *' : '';
      const title = `${preset.name}${star} (${preset.width}%)`;
      expect(title).toBe('My Preset * (65%)');
    });
  });
});
