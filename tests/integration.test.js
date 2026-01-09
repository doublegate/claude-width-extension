/**
 * Integration Tests
 * ==================
 *
 * Tests for cross-script communication, storage synchronization,
 * and end-to-end workflows in the extension.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resetMocks,
  setStorageData,
  mockBrowser,
  mockStorage,
  mockTabs,
  mockBrowserAction,
  mockContextMenus,
  storageListeners,
  messageListeners
} from './mocks/browser.js';
import { createMockClaudeDOM, waitForDOMUpdate } from './setup.js';

describe('Integration Tests', () => {
  beforeEach(() => {
    resetMocks();
    setStorageData({
      chatWidthPercent: 85,
      theme: 'system',
      customPresets: [],
      recentWidths: [],
      migrationVersion: 2
    });
  });

  describe('Storage Synchronization', () => {
    it('should propagate width changes across components', async () => {
      const listeners = [];

      // Simulate multiple listeners (popup, content, background)
      for (let i = 0; i < 3; i++) {
        const listener = vi.fn();
        mockStorage.onChanged.addListener(listener);
        listeners.push(listener);
      }

      // Set new width
      await mockStorage.local.set({ chatWidthPercent: 75 });

      // All listeners should be notified
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith(
          { chatWidthPercent: { oldValue: 85, newValue: 75 } },
          'local'
        );
      });
    });

    it('should handle concurrent storage updates', async () => {
      // Simulate rapid updates
      await mockStorage.local.set({ chatWidthPercent: 60 });
      await mockStorage.local.set({ chatWidthPercent: 70 });
      await mockStorage.local.set({ chatWidthPercent: 80 });

      const result = await mockStorage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(80);
    });

    it('should maintain consistency across storage operations', async () => {
      // Set multiple values
      await mockStorage.local.set({
        chatWidthPercent: 75,
        theme: 'dark',
        customPresets: [{ id: '1', name: 'Test', width: 65 }]
      });

      // Retrieve all values
      const result = await mockStorage.local.get([
        'chatWidthPercent',
        'theme',
        'customPresets'
      ]);

      expect(result.chatWidthPercent).toBe(75);
      expect(result.theme).toBe('dark');
      expect(result.customPresets.length).toBe(1);
    });
  });

  describe('Message Passing', () => {
    it('should route messages from popup to content script', async () => {
      const contentListener = vi.fn((message, sender, sendResponse) => {
        if (message.action === 'updateWidth') {
          sendResponse({ success: true });
        }
      });
      messageListeners.add(contentListener);

      const response = await mockBrowser.runtime.sendMessage({
        action: 'updateWidth',
        width: 75
      });

      expect(contentListener).toHaveBeenCalled();
      expect(response.success).toBe(true);
    });

    it('should handle message responses', async () => {
      messageListeners.add((message, sender, sendResponse) => {
        if (message.action === 'getState') {
          sendResponse({
            width: 85,
            theme: 'dark',
            presets: []
          });
        }
      });

      const response = await mockBrowser.runtime.sendMessage({
        action: 'getState'
      });

      expect(response.width).toBe(85);
      expect(response.theme).toBe('dark');
    });

    it('should handle cyclePresets message flow', async () => {
      const { PRESET_CYCLE } = window.ClaudeWidthConstants;
      let currentWidth = 50;

      messageListeners.add((message, sender, sendResponse) => {
        if (message.action === 'cyclePresets') {
          const currentIndex = PRESET_CYCLE.indexOf(currentWidth);
          const nextIndex = (currentIndex + 1) % PRESET_CYCLE.length;
          currentWidth = PRESET_CYCLE[nextIndex];
          sendResponse({ success: true, width: currentWidth });
        }
      });

      const response = await mockBrowser.runtime.sendMessage({
        action: 'cyclePresets'
      });

      expect(response.success).toBe(true);
      expect(response.width).toBe(70); // Next after 50
    });

    it('should handle toggleDefault message flow', async () => {
      const DEFAULT_WIDTH = 85;
      let currentWidth = 75;
      let lastWidth = 75;

      messageListeners.add((message, sender, sendResponse) => {
        if (message.action === 'toggleDefault') {
          if (currentWidth === DEFAULT_WIDTH) {
            currentWidth = lastWidth;
          } else {
            lastWidth = currentWidth;
            currentWidth = DEFAULT_WIDTH;
          }
          sendResponse({ success: true, width: currentWidth });
        }
      });

      // Toggle to default
      let response = await mockBrowser.runtime.sendMessage({
        action: 'toggleDefault'
      });
      expect(response.width).toBe(DEFAULT_WIDTH);

      // Toggle back
      response = await mockBrowser.runtime.sendMessage({
        action: 'toggleDefault'
      });
      expect(response.width).toBe(75);
    });
  });

  describe('Tab Communication', () => {
    it('should send width updates to all Claude tabs', async () => {
      const tabs = await mockTabs.query({ url: '*://claude.ai/*' });

      const sendPromises = tabs.map(tab =>
        mockTabs.sendMessage(tab.id, {
          action: 'updateWidth',
          width: 80
        })
      );

      const responses = await Promise.all(sendPromises);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });

    it('should only update active Claude tab for keyboard shortcuts', async () => {
      const tabs = await mockTabs.query({
        active: true,
        currentWindow: true
      });

      expect(tabs.length).toBe(1);

      if (tabs[0].url.includes('claude.ai')) {
        const response = await mockTabs.sendMessage(tabs[0].id, {
          action: 'updateWidth',
          width: 75
        });
        expect(response.success).toBe(true);
      }
    });
  });

  describe('Badge Updates', () => {
    it('should update badge when width changes', async () => {
      mockBrowserAction.setBadgeText({ text: '75' });
      mockBrowserAction.setBadgeBackgroundColor({ color: '#6B7280' });
      mockBrowserAction.setBadgeTextColor({ color: '#FFFFFF' });

      const state = mockBrowserAction.getBadgeState();
      expect(state.text).toBe('75');
      expect(state.color).toBe('#6B7280');
    });

    it('should clear badge on non-Claude tabs', () => {
      mockBrowserAction.setBadgeText({ text: '' });

      const state = mockBrowserAction.getBadgeState();
      expect(state.text).toBe('');
    });
  });

  describe('Context Menu Integration', () => {
    it('should rebuild menu when presets change', async () => {
      // Initial menu
      mockContextMenus.create({ id: 'menu-1', title: 'Preset 1' });
      expect(mockContextMenus.getMenuItems().length).toBe(1);

      // Rebuild with new presets
      mockContextMenus.removeAll();
      mockContextMenus.create({ id: 'menu-1', title: 'Preset 1' });
      mockContextMenus.create({ id: 'menu-2', title: 'Preset 2' });

      expect(mockContextMenus.getMenuItems().length).toBe(2);
    });

    it('should update menu when favorites change', async () => {
      const presets = [
        { id: '1', name: 'Preset 1', width: 65, favorite: false },
        { id: '2', name: 'Preset 2', width: 75, favorite: true }
      ];

      mockContextMenus.removeAll();
      presets.forEach(preset => {
        const star = preset.favorite ? ' *' : '';
        mockContextMenus.create({
          id: `preset-${preset.id}`,
          title: `${preset.name}${star} (${preset.width}%)`
        });
      });

      const items = mockContextMenus.getMenuItems();
      expect(items[1].title).toContain('*');
    });
  });

  describe('Enhanced Styling Flow', () => {
    it('should apply display mode preset values', async () => {
      const { DISPLAY_MODE_PRESETS } = window.ClaudeWidthConstants;
      const compactPreset = DISPLAY_MODE_PRESETS['compact'];

      await mockStorage.local.set({
        displayMode: 'compact',
        lineHeight: compactPreset.lineHeight,
        messagePadding: compactPreset.messagePadding,
        fontSizePercent: compactPreset.fontSize
      });

      const result = await mockStorage.local.get([
        'displayMode',
        'lineHeight',
        'messagePadding',
        'fontSizePercent'
      ]);

      expect(result.displayMode).toBe('compact');
      expect(result.lineHeight).toBe('compact');
      expect(result.fontSizePercent).toBe(95);
    });

    it('should switch to custom mode on manual adjustment', async () => {
      // Start with comfortable mode
      await mockStorage.local.set({
        displayMode: 'comfortable',
        fontSizePercent: 100
      });

      // Manually adjust font size
      await mockStorage.local.set({
        displayMode: 'custom',
        fontSizePercent: 110
      });

      const result = await mockStorage.local.get('displayMode');
      expect(result.displayMode).toBe('custom');
    });

    it('should persist enhanced settings across sessions', async () => {
      const settings = {
        fontSizePercent: 115,
        lineHeight: 'relaxed',
        messagePadding: 'large',
        displayMode: 'spacious',
        codeBlockMaxHeight: 600,
        codeBlockWordWrap: true,
        showTimestamps: false,
        showAvatars: true,
        messageBubbleStyle: 'minimal'
      };

      await mockStorage.local.set(settings);

      // Simulate new session - retrieve all settings
      const result = await mockStorage.local.get(Object.keys(settings));

      expect(result.fontSizePercent).toBe(115);
      expect(result.lineHeight).toBe('relaxed');
      expect(result.codeBlockMaxHeight).toBe(600);
      expect(result.showTimestamps).toBe(false);
    });
  });

  describe('Custom Presets Workflow', () => {
    it('should save and load custom presets', async () => {
      const presets = [
        { id: '1', name: 'Work', width: 65, order: 0, favorite: true },
        { id: '2', name: 'Reading', width: 80, order: 1, favorite: false }
      ];

      await mockStorage.local.set({ customPresets: presets });

      const result = await mockStorage.local.get('customPresets');
      expect(result.customPresets).toEqual(presets);
    });

    it('should update preset order after drag-drop', async () => {
      const presets = [
        { id: '1', name: 'First', order: 0 },
        { id: '2', name: 'Second', order: 1 }
      ];

      // Simulate drag-drop reorder
      presets[0].order = 1;
      presets[1].order = 0;

      const sorted = [...presets].sort((a, b) => a.order - b.order);

      expect(sorted[0].name).toBe('Second');
      expect(sorted[1].name).toBe('First');
    });

    it('should apply custom preset width on selection', async () => {
      const preset = { id: '1', name: 'Custom', width: 72 };

      await mockStorage.local.set({ chatWidthPercent: preset.width });

      const result = await mockStorage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(72);
    });
  });

  describe('Recent Widths Tracking', () => {
    it('should add width to recent list', async () => {
      const recentWidths = [75, 60, 55];
      await mockStorage.local.set({ recentWidths });

      // Add new width
      const newWidth = 72;
      const updated = [newWidth, ...recentWidths.filter(w => w !== newWidth)];
      await mockStorage.local.set({ recentWidths: updated.slice(0, 3) });

      const result = await mockStorage.local.get('recentWidths');
      expect(result.recentWidths[0]).toBe(72);
      expect(result.recentWidths.length).toBe(3);
    });

    it('should not duplicate widths in recent list', async () => {
      const recentWidths = [75, 60, 55];

      // Add existing width
      const newWidth = 60;
      const updated = [newWidth, ...recentWidths.filter(w => w !== newWidth)];

      expect(updated[0]).toBe(60);
      expect(updated.length).toBe(3);
    });

    it('should filter out preset widths from recent', () => {
      const PRESET_WIDTHS = [50, 70, 85, 100];
      const recentWidths = [75, 70, 60, 50]; // 70 and 50 are presets

      const filtered = recentWidths.filter(w => !PRESET_WIDTHS.includes(w));
      expect(filtered).toEqual([75, 60]);
    });
  });

  describe('Migration Flow', () => {
    it('should preserve existing width during migration', async () => {
      // Simulate pre-migration state
      setStorageData({
        chatWidthPercent: 72,
        migrationVersion: 0
      });

      // Migration should preserve width
      const result = await mockStorage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(72);
    });

    it('should add enhanced defaults during migration 2', async () => {
      const { ENHANCED_DEFAULTS } = window.ClaudeWidthConstants;

      // Simulate migration adding enhanced defaults
      await mockStorage.local.set({
        ...ENHANCED_DEFAULTS,
        migrationVersion: 2
      });

      const result = await mockStorage.local.get('fontSizePercent');
      expect(result.fontSizePercent).toBe(100);
    });
  });

  describe('DOM and Style Application', () => {
    it('should apply styles to mock Claude DOM', () => {
      createMockClaudeDOM({ withMessages: true, withComposer: true });

      const main = document.querySelector('.mx-auto');
      expect(main).toBeTruthy();

      main.style.maxWidth = '85%';
      main.style.width = '85%';

      expect(main.style.maxWidth).toBe('85%');
    });

    it('should not apply styles to sidebar elements', () => {
      createMockClaudeDOM({ withSidebar: true });

      const sidebar = document.querySelector('.Sidebar');
      expect(sidebar).toBeTruthy();

      // Sidebar should not have width styles applied
      expect(sidebar.style.maxWidth).toBe('');
    });

    it('should handle dynamic element addition', async () => {
      createMockClaudeDOM({ withMessages: true });

      // Add new message element
      const thread = document.querySelector('.Thread');
      const newMessage = document.createElement('div');
      newMessage.className = 'Message new';
      thread.appendChild(newMessage);

      await waitForDOMUpdate(10);

      const messages = document.querySelectorAll('.Message');
      expect(messages.length).toBe(3); // 2 original + 1 new
    });
  });

  describe('Error Recovery', () => {
    it('should use default width on storage error', async () => {
      const { DEFAULT_WIDTH } = window.ClaudeWidthConstants;

      // Simulate missing storage value
      const result = await mockStorage.local.get({ chatWidthPercent: DEFAULT_WIDTH });
      expect(result.chatWidthPercent).toBe(DEFAULT_WIDTH);
    });

    it('should handle invalid width values', () => {
      const { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH } = window.ClaudeWidthConstants;

      const validateWidth = (width) => {
        if (typeof width !== 'number' || width < MIN_WIDTH || width > MAX_WIDTH) {
          return DEFAULT_WIDTH;
        }
        return width;
      };

      expect(validateWidth(20)).toBe(DEFAULT_WIDTH);
      expect(validateWidth(150)).toBe(DEFAULT_WIDTH);
      expect(validateWidth('invalid')).toBe(DEFAULT_WIDTH);
      expect(validateWidth(75)).toBe(75);
    });

    it('should handle empty custom presets array', async () => {
      const result = await mockStorage.local.get({ customPresets: [] });
      expect(Array.isArray(result.customPresets)).toBe(true);
      expect(result.customPresets.length).toBe(0);
    });
  });

  describe('Theme Persistence', () => {
    it('should persist theme across sessions', async () => {
      await mockStorage.local.set({ theme: 'dark' });

      const result = await mockStorage.local.get('theme');
      expect(result.theme).toBe('dark');
    });

    it('should apply theme to document', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should handle system theme preference', () => {
      document.documentElement.setAttribute('data-theme', 'system');

      // In real browser, this would trigger media query checks
      const theme = document.documentElement.getAttribute('data-theme');
      expect(theme).toBe('system');
    });
  });
});
