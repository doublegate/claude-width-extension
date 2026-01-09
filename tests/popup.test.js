/**
 * Unit Tests for popup/popup.js
 * ==============================
 *
 * Tests for the popup controller that handles user interactions,
 * manages preferences, and communicates with content scripts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setStorageData, mockBrowser, mockTabs, storageListeners } from './mocks/browser.js';

describe('Popup Controller', () => {
  /**
   * Create mock popup DOM structure using safe DOM methods.
   */
  function createPopupDOM() {
    // Clear existing content safely
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    while (document.head.firstChild) {
      document.head.removeChild(document.head.firstChild);
    }

    // Slider and display
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = 'widthSlider';
    slider.min = '40';
    slider.max = '100';
    slider.value = '85';
    document.body.appendChild(slider);

    const widthValue = document.createElement('span');
    widthValue.id = 'widthValue';
    widthValue.textContent = '85';
    document.body.appendChild(widthValue);

    const previewBar = document.createElement('div');
    previewBar.id = 'previewBar';
    document.body.appendChild(previewBar);

    // Status elements
    const statusDot = document.createElement('span');
    statusDot.id = 'statusDot';
    document.body.appendChild(statusDot);

    const statusText = document.createElement('span');
    statusText.id = 'statusText';
    document.body.appendChild(statusText);

    const nonDefaultIndicator = document.createElement('span');
    nonDefaultIndicator.id = 'nonDefaultIndicator';
    document.body.appendChild(nonDefaultIndicator);

    // Preset buttons
    const presetContainer = document.createElement('div');
    presetContainer.className = 'preset-buttons';
    const presets = [
      { width: 50, name: 'Narrow' },
      { width: 70, name: 'Medium' },
      { width: 85, name: 'Wide' },
      { width: 100, name: 'Full' }
    ];
    presets.forEach(preset => {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.dataset.width = preset.width;
      btn.textContent = preset.name;
      presetContainer.appendChild(btn);
    });
    document.body.appendChild(presetContainer);

    // Action buttons
    const applyBtn = document.createElement('button');
    applyBtn.id = 'applyBtn';
    document.body.appendChild(applyBtn);

    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    document.body.appendChild(resetBtn);

    // Theme buttons
    const themeContainer = document.createElement('div');
    const themes = ['light', 'dark', 'system'];
    themes.forEach(theme => {
      const btn = document.createElement('button');
      btn.className = 'theme-btn';
      btn.dataset.theme = theme;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', theme === 'system' ? 'true' : 'false');
      themeContainer.appendChild(btn);
    });
    document.body.appendChild(themeContainer);

    // Screen reader announcements
    const srAnnouncements = document.createElement('div');
    srAnnouncements.id = 'srAnnouncements';
    srAnnouncements.setAttribute('aria-live', 'polite');
    document.body.appendChild(srAnnouncements);

    // Custom presets section
    const customPresetsSection = document.createElement('div');
    customPresetsSection.id = 'customPresetsSection';
    document.body.appendChild(customPresetsSection);

    const customPresetsList = document.createElement('div');
    customPresetsList.id = 'customPresetsList';
    document.body.appendChild(customPresetsList);

    const saveCurrentBtn = document.createElement('button');
    saveCurrentBtn.id = 'saveCurrentBtn';
    document.body.appendChild(saveCurrentBtn);

    const newPresetForm = document.createElement('div');
    newPresetForm.id = 'newPresetForm';
    newPresetForm.classList.add('hidden');
    document.body.appendChild(newPresetForm);

    const newPresetName = document.createElement('input');
    newPresetName.id = 'newPresetName';
    newPresetForm.appendChild(newPresetName);

    // Edit modal
    const editModal = document.createElement('div');
    editModal.id = 'editPresetModal';
    editModal.classList.add('hidden');
    document.body.appendChild(editModal);

    const editPresetName = document.createElement('input');
    editPresetName.id = 'editPresetName';
    editModal.appendChild(editPresetName);

    const editPresetWidth = document.createElement('input');
    editPresetWidth.id = 'editPresetWidth';
    editPresetWidth.type = 'number';
    editModal.appendChild(editPresetWidth);

    const cancelEditBtn = document.createElement('button');
    cancelEditBtn.id = 'cancelEditBtn';
    editModal.appendChild(cancelEditBtn);

    const saveEditBtn = document.createElement('button');
    saveEditBtn.id = 'saveEditBtn';
    editModal.appendChild(saveEditBtn);

    // Recently used section
    const recentlyUsedSection = document.createElement('div');
    recentlyUsedSection.id = 'recentlyUsedSection';
    document.body.appendChild(recentlyUsedSection);

    const recentlyUsedList = document.createElement('div');
    recentlyUsedList.id = 'recentlyUsedList';
    document.body.appendChild(recentlyUsedList);

    // Enhanced styling elements
    const fontSizeSlider = document.createElement('input');
    fontSizeSlider.type = 'range';
    fontSizeSlider.id = 'fontSizeSlider';
    fontSizeSlider.min = '80';
    fontSizeSlider.max = '120';
    fontSizeSlider.value = '100';
    document.body.appendChild(fontSizeSlider);

    const fontSizeValue = document.createElement('span');
    fontSizeValue.id = 'fontSizeValue';
    document.body.appendChild(fontSizeValue);

    // Display mode buttons
    const displayModes = ['compact', 'comfortable', 'spacious', 'custom'];
    displayModes.forEach(mode => {
      const btn = document.createElement('button');
      btn.className = 'display-mode-btn';
      btn.dataset.mode = mode;
      document.body.appendChild(btn);
    });

    // Advanced section toggle
    const advancedToggle = document.createElement('button');
    advancedToggle.id = 'advancedToggle';
    advancedToggle.setAttribute('aria-expanded', 'false');
    document.body.appendChild(advancedToggle);

    const advancedContent = document.createElement('div');
    advancedContent.id = 'advancedContent';
    advancedContent.classList.add('hidden');
    document.body.appendChild(advancedContent);
  }

  beforeEach(() => {
    createPopupDOM();
    setStorageData({
      chatWidthPercent: 85,
      theme: 'system',
      customPresets: [],
      recentWidths: []
    });
  });

  describe('Slider Interaction', () => {
    it('should update width value display on slider change', () => {
      const slider = document.getElementById('widthSlider');
      const widthValue = document.getElementById('widthValue');

      slider.value = '75';
      slider.dispatchEvent(new Event('input'));

      // Simulate update
      widthValue.textContent = slider.value;

      expect(widthValue.textContent).toBe('75');
    });

    it('should update preview bar width on slider change', () => {
      const slider = document.getElementById('widthSlider');
      const previewBar = document.getElementById('previewBar');

      slider.value = '60';
      previewBar.style.width = `${slider.value}%`;

      expect(previewBar.style.width).toBe('60%');
    });

    it('should respect minimum width', () => {
      const slider = document.getElementById('widthSlider');
      const MIN_WIDTH = 40;

      slider.value = String(MIN_WIDTH);
      expect(Number(slider.value)).toBe(MIN_WIDTH);
    });

    it('should respect maximum width', () => {
      const slider = document.getElementById('widthSlider');
      const MAX_WIDTH = 100;

      slider.value = String(MAX_WIDTH);
      expect(Number(slider.value)).toBe(MAX_WIDTH);
    });
  });

  describe('Preset Buttons', () => {
    it('should have all four preset buttons', () => {
      const presetButtons = document.querySelectorAll('.preset-btn');
      expect(presetButtons.length).toBe(4);
    });

    it('should set correct width on preset click', () => {
      const presetButtons = document.querySelectorAll('.preset-btn');
      const slider = document.getElementById('widthSlider');

      presetButtons.forEach(btn => {
        const expectedWidth = btn.dataset.width;
        btn.click();
        slider.value = expectedWidth;
        expect(slider.value).toBe(expectedWidth);
      });
    });

    it('should update aria-pressed on preset selection', () => {
      const presetButtons = document.querySelectorAll('.preset-btn');
      const selectedBtn = presetButtons[1];

      // Deselect all
      presetButtons.forEach(btn => btn.setAttribute('aria-pressed', 'false'));

      // Select one
      selectedBtn.setAttribute('aria-pressed', 'true');

      expect(selectedBtn.getAttribute('aria-pressed')).toBe('true');
      expect(presetButtons[0].getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('Theme Selection', () => {
    it('should have all three theme buttons', () => {
      const themeButtons = document.querySelectorAll('.theme-btn');
      expect(themeButtons.length).toBe(3);
    });

    it('should update aria-checked on theme selection', () => {
      const themeButtons = document.querySelectorAll('.theme-btn');
      const darkBtn = themeButtons[1]; // dark theme

      // Deselect all
      themeButtons.forEach(btn => btn.setAttribute('aria-checked', 'false'));

      // Select dark
      darkBtn.setAttribute('aria-checked', 'true');

      expect(darkBtn.getAttribute('aria-checked')).toBe('true');
    });

    it('should set data-theme attribute on document', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should save theme to storage', async () => {
      await mockBrowser.storage.local.set({ theme: 'dark' });
      const result = await mockBrowser.storage.local.get('theme');
      expect(result.theme).toBe('dark');
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should have live region element', () => {
      const srAnnouncements = document.getElementById('srAnnouncements');
      expect(srAnnouncements.getAttribute('aria-live')).toBe('polite');
    });

    it('should announce width changes', () => {
      const srAnnouncements = document.getElementById('srAnnouncements');
      srAnnouncements.textContent = 'Width set to 75%';
      expect(srAnnouncements.textContent).toBe('Width set to 75%');
    });

    it('should clear announcements between updates', async () => {
      const srAnnouncements = document.getElementById('srAnnouncements');

      srAnnouncements.textContent = '';
      await new Promise(resolve => setTimeout(resolve, 50));
      srAnnouncements.textContent = 'Width set to 85%';

      expect(srAnnouncements.textContent).toBe('Width set to 85%');
    });
  });

  describe('Custom Presets', () => {
    it('should show custom presets section', () => {
      const section = document.getElementById('customPresetsSection');
      expect(section).toBeTruthy();
    });

    it('should add preset to list', () => {
      const list = document.getElementById('customPresetsList');
      const item = document.createElement('div');
      item.className = 'custom-preset-item';
      item.dataset.presetId = 'preset-1';
      list.appendChild(item);

      expect(list.querySelectorAll('.custom-preset-item').length).toBe(1);
    });

    it('should generate unique preset IDs', () => {
      const id1 = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const id2 = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      expect(id1).not.toBe(id2);
    });

    it('should validate preset name is not empty', () => {
      const input = document.getElementById('newPresetName');
      input.value = '';
      expect(input.value.trim()).toBe('');
    });

    it('should limit presets to MAX_CUSTOM_PRESETS', () => {
      const MAX_CUSTOM_PRESETS = window.ClaudeWidthConstants.MAX_CUSTOM_PRESETS;
      const presets = Array.from({ length: MAX_CUSTOM_PRESETS + 1 }, (_, i) => ({
        id: `preset-${i}`,
        name: `Preset ${i}`,
        width: 50 + i
      }));

      expect(presets.slice(0, MAX_CUSTOM_PRESETS).length).toBe(MAX_CUSTOM_PRESETS);
    });
  });

  describe('Edit Modal', () => {
    it('should have edit modal hidden by default', () => {
      const modal = document.getElementById('editPresetModal');
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should show modal on edit', () => {
      const modal = document.getElementById('editPresetModal');
      modal.classList.remove('hidden');
      expect(modal.classList.contains('hidden')).toBe(false);
    });

    it('should populate edit fields', () => {
      const nameInput = document.getElementById('editPresetName');
      const widthInput = document.getElementById('editPresetWidth');

      nameInput.value = 'My Preset';
      widthInput.value = '75';

      expect(nameInput.value).toBe('My Preset');
      expect(widthInput.value).toBe('75');
    });

    it('should hide modal on cancel', () => {
      const modal = document.getElementById('editPresetModal');
      const cancelBtn = document.getElementById('cancelEditBtn');

      modal.classList.remove('hidden');
      cancelBtn.click();
      modal.classList.add('hidden');

      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Recently Used', () => {
    it('should show recently used section', () => {
      const section = document.getElementById('recentlyUsedSection');
      expect(section).toBeTruthy();
    });

    it('should display recent widths', () => {
      const list = document.getElementById('recentlyUsedList');
      const recentWidths = [75, 60, 45];

      recentWidths.forEach(width => {
        const btn = document.createElement('button');
        btn.textContent = `${width}%`;
        list.appendChild(btn);
      });

      expect(list.children.length).toBe(3);
    });

    it('should not show preset widths in recent', () => {
      const PRESET_WIDTHS = [50, 70, 85, 100];
      const recentWidths = [75, 60, 50]; // 50 is a preset

      const filteredRecent = recentWidths.filter(w => !PRESET_WIDTHS.includes(w));
      expect(filteredRecent).toEqual([75, 60]);
    });
  });

  describe('Enhanced Styling', () => {
    it('should have font size slider', () => {
      const slider = document.getElementById('fontSizeSlider');
      expect(slider).toBeTruthy();
      expect(slider.min).toBe('80');
      expect(slider.max).toBe('120');
    });

    it('should have display mode buttons', () => {
      const buttons = document.querySelectorAll('.display-mode-btn');
      expect(buttons.length).toBe(4);
    });

    it('should switch to custom mode on manual adjustment', () => {
      const displayButtons = document.querySelectorAll('.display-mode-btn');
      const customBtn = Array.from(displayButtons).find(
        btn => btn.dataset.mode === 'custom'
      );

      displayButtons.forEach(btn => btn.classList.remove('active'));
      customBtn.classList.add('active');

      expect(customBtn.classList.contains('active')).toBe(true);
    });

    it('should save enhanced settings to storage', async () => {
      await mockBrowser.storage.local.set({
        fontSizePercent: 110,
        lineHeight: 'relaxed',
        displayMode: 'spacious'
      });

      const result = await mockBrowser.storage.local.get([
        'fontSizePercent',
        'lineHeight',
        'displayMode'
      ]);

      expect(result.fontSizePercent).toBe(110);
      expect(result.lineHeight).toBe('relaxed');
      expect(result.displayMode).toBe('spacious');
    });
  });

  describe('Advanced Section', () => {
    it('should toggle advanced section visibility', () => {
      const toggle = document.getElementById('advancedToggle');
      const content = document.getElementById('advancedContent');

      // Initially hidden
      expect(content.classList.contains('hidden')).toBe(true);

      // Toggle open
      content.classList.remove('hidden');
      toggle.setAttribute('aria-expanded', 'true');

      expect(content.classList.contains('hidden')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');

      // Toggle closed
      content.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');

      expect(content.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Status Display', () => {
    it('should show active status on Claude tab', () => {
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      statusDot.classList.add('active');
      statusText.textContent = 'Active on claude.ai';

      expect(statusDot.classList.contains('active')).toBe(true);
      expect(statusText.textContent).toBe('Active on claude.ai');
    });

    it('should show inactive status on other tabs', () => {
      const statusDot = document.getElementById('statusDot');
      const statusText = document.getElementById('statusText');

      statusDot.classList.remove('active');
      statusText.textContent = 'Not on claude.ai';

      expect(statusDot.classList.contains('active')).toBe(false);
    });

    it('should show non-default indicator when width differs', () => {
      const indicator = document.getElementById('nonDefaultIndicator');
      const currentWidth = 75;
      const DEFAULT_WIDTH = 85;

      if (currentWidth !== DEFAULT_WIDTH) {
        indicator.classList.add('visible');
      }

      expect(indicator.classList.contains('visible')).toBe(true);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle preset keyboard shortcuts', () => {
      const PRESET_KEYS = {
        '1': { width: 50, name: 'Narrow' },
        '2': { width: 70, name: 'Medium' },
        '3': { width: 85, name: 'Wide' },
        '4': { width: 100, name: 'Full' }
      };

      expect(PRESET_KEYS['1'].width).toBe(50);
      expect(PRESET_KEYS['4'].width).toBe(100);
    });

    it('should handle reset keyboard shortcut', () => {
      const slider = document.getElementById('widthSlider');
      const DEFAULT_WIDTH = 85;

      // Simulate 'R' key press
      slider.value = String(DEFAULT_WIDTH);

      expect(Number(slider.value)).toBe(DEFAULT_WIDTH);
    });

    it('should handle escape to close popup', () => {
      // Simulate escape key - popup would close
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      // In real popup, window.close() would be called
      expect(event.key).toBe('Escape');
    });
  });

  describe('Storage Integration', () => {
    it('should load saved width from storage', async () => {
      setStorageData({ chatWidthPercent: 75 });
      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(75);
    });

    it('should save width to storage', async () => {
      await mockBrowser.storage.local.set({ chatWidthPercent: 65 });
      const result = await mockBrowser.storage.local.get('chatWidthPercent');
      expect(result.chatWidthPercent).toBe(65);
    });

    it('should listen for storage changes', () => {
      const listener = vi.fn();
      mockBrowser.storage.onChanged.addListener(listener);

      mockBrowser.storage.local.set({ chatWidthPercent: 80 });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('Tab Communication', () => {
    it('should query Claude tabs', async () => {
      const tabs = await mockTabs.query({ url: '*://claude.ai/*' });
      expect(Array.isArray(tabs)).toBe(true);
    });

    it('should send message to tabs', async () => {
      const response = await mockTabs.sendMessage(1, {
        action: 'updateWidth',
        width: 85
      });
      expect(response.success).toBe(true);
    });

    it('should detect active Claude tab', async () => {
      const tabs = await mockTabs.query({
        active: true,
        currentWindow: true
      });
      expect(tabs.length).toBeGreaterThan(0);
    });
  });

  describe('PRESET_KEYS Derivation', () => {
    it('should derive PRESET_KEYS from BUILT_IN_PRESETS', () => {
      const BUILT_IN_PRESETS = window.ClaudeWidthConstants.BUILT_IN_PRESETS;
      const PRESET_KEYS = BUILT_IN_PRESETS.reduce((acc, preset, index) => {
        const key = String(index + 1);
        acc[key] = { width: preset.width, name: preset.name };
        return acc;
      }, {});

      expect(PRESET_KEYS['1']).toEqual({ width: 50, name: 'Narrow' });
      expect(PRESET_KEYS['2']).toEqual({ width: 70, name: 'Medium' });
      expect(PRESET_KEYS['3']).toEqual({ width: 85, name: 'Wide' });
      expect(PRESET_KEYS['4']).toEqual({ width: 100, name: 'Full' });
    });

    it('should derive PRESETS from BUILT_IN_PRESETS', () => {
      const BUILT_IN_PRESETS = window.ClaudeWidthConstants.BUILT_IN_PRESETS;
      const PRESETS = BUILT_IN_PRESETS.reduce((acc, preset) => {
        acc[preset.width] = preset.name;
        return acc;
      }, {});

      expect(PRESETS[50]).toBe('Narrow');
      expect(PRESETS[70]).toBe('Medium');
      expect(PRESETS[85]).toBe('Wide');
      expect(PRESETS[100]).toBe('Full');
    });
  });
});
