/**
 * Test Setup File
 * ================
 *
 * Global test setup for Vitest. This file is loaded before every test file.
 * Sets up browser API mocks and common utilities.
 */

import { vi } from 'vitest';
import {
  installBrowserMock,
  resetMocks,
  mockBrowser
} from './mocks/browser.js';

// Install browser mock globally before all tests
installBrowserMock();

// Reset mocks before each test
beforeEach(() => {
  resetMocks();
  vi.clearAllMocks();

  // Reset DOM to clean state
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Reset any data attributes on html element
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-claude-width-applied');
  document.documentElement.removeAttribute('data-claude-enhanced-applied');
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Helper to create a mock DOM structure similar to Claude's chat interface.
 * Uses safe DOM methods (createElement, appendChild, textContent).
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.withSidebar - Include sidebar elements
 * @param {boolean} options.withMessages - Include message elements
 * @param {boolean} options.withComposer - Include composer/form elements
 * @param {boolean} options.withCodeBlocks - Include code block elements
 * @returns {HTMLElement} The container element
 */
export function createMockClaudeDOM(options = {}) {
  const {
    withSidebar = true,
    withMessages = true,
    withComposer = true,
    withCodeBlocks = false
  } = options;

  const container = document.createElement('div');
  container.id = 'test-container';

  if (withSidebar) {
    const sidebar = document.createElement('nav');
    sidebar.className = 'Sidebar';

    const sidebarNav = document.createElement('div');
    sidebarNav.className = 'SidebarNav';

    const newChatBtn = document.createElement('button');
    newChatBtn.textContent = 'New Chat';
    sidebarNav.appendChild(newChatBtn);

    const chatHistory = document.createElement('div');
    chatHistory.className = 'chat-history';

    const link1 = document.createElement('a');
    link1.href = '/chat/1';
    link1.textContent = 'Chat 1';
    chatHistory.appendChild(link1);

    const link2 = document.createElement('a');
    link2.href = '/chat/2';
    link2.textContent = 'Chat 2';
    chatHistory.appendChild(link2);

    sidebarNav.appendChild(chatHistory);
    sidebar.appendChild(sidebarNav);
    container.appendChild(sidebar);
  }

  const main = document.createElement('main');
  main.className = 'mx-auto';
  main.style.maxWidth = '768px';

  if (withMessages) {
    const thread = document.createElement('div');
    thread.className = 'Thread';

    // Human message
    const humanMsg = document.createElement('div');
    humanMsg.className = 'Message human';

    const humanAvatar = document.createElement('div');
    humanAvatar.className = 'avatar';
    humanAvatar.textContent = 'H';
    humanMsg.appendChild(humanAvatar);

    const humanProse = document.createElement('div');
    humanProse.className = 'prose';
    const humanP = document.createElement('p');
    humanP.textContent = 'Hello, how are you?';
    humanProse.appendChild(humanP);
    humanMsg.appendChild(humanProse);

    const humanTime = document.createElement('time');
    humanTime.className = 'timestamp';
    humanTime.textContent = '10:30 AM';
    humanMsg.appendChild(humanTime);

    thread.appendChild(humanMsg);

    // Assistant message
    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'Message assistant';

    const assistantAvatar = document.createElement('div');
    assistantAvatar.className = 'avatar';
    assistantAvatar.textContent = 'C';
    assistantMsg.appendChild(assistantAvatar);

    const assistantProse = document.createElement('div');
    assistantProse.className = 'prose';
    const assistantP = document.createElement('p');
    assistantP.textContent = "I'm doing well, thank you!";
    assistantProse.appendChild(assistantP);

    if (withCodeBlocks) {
      const pre = document.createElement('pre');
      pre.className = 'CodeBlock';
      const code = document.createElement('code');
      code.textContent = "console.log('Hello World');";
      pre.appendChild(code);
      assistantProse.appendChild(pre);
    }

    assistantMsg.appendChild(assistantProse);

    const assistantTime = document.createElement('time');
    assistantTime.className = 'timestamp';
    assistantTime.textContent = '10:31 AM';
    assistantMsg.appendChild(assistantTime);

    thread.appendChild(assistantMsg);
    main.appendChild(thread);
  }

  if (withComposer) {
    const composer = document.createElement('div');
    composer.className = 'Composer sticky';

    const form = document.createElement('form');

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Send a message';
    form.appendChild(textarea);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Send';
    form.appendChild(submitBtn);

    composer.appendChild(form);
    main.appendChild(composer);
  }

  container.appendChild(main);
  document.body.appendChild(container);

  return container;
}

/**
 * Helper to wait for DOM updates and microtasks.
 *
 * @param {number} ms - Milliseconds to wait (default 0)
 * @returns {Promise<void>}
 */
export function waitForDOMUpdate(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to simulate a storage change event.
 *
 * @param {Object} changes - Storage changes object
 * @param {string} areaName - Storage area name ('local' or 'sync')
 */
export async function simulateStorageChange(changes, areaName = 'local') {
  const { storageListeners } = await import('./mocks/browser.js');

  for (const listener of storageListeners) {
    listener(changes, areaName);
  }
}

/**
 * Helper to simulate a runtime message.
 *
 * @param {Object} message - The message to send
 * @param {Object} sender - The sender info
 * @returns {Promise<*>} Response from listeners
 */
export async function simulateRuntimeMessage(message, sender = {}) {
  return mockBrowser.runtime.sendMessage(message);
}

/**
 * Helper to get computed styles of an element.
 *
 * @param {HTMLElement} element - The element
 * @param {string} property - CSS property name
 * @returns {string} The computed value
 */
export function getComputedStyleValue(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Mock window.ClaudeWidthConstants for tests.
 */
export function installMockConstants() {
  window.ClaudeWidthConstants = {
    DEFAULT_WIDTH: 85,
    MIN_WIDTH: 40,
    MAX_WIDTH: 100,
    PRESET_CYCLE: [50, 70, 85, 100],
    STORAGE_KEY: 'chatWidthPercent',
    THEME_STORAGE_KEY: 'theme',
    LAST_WIDTH_KEY: 'lastNonDefaultWidth',
    ENHANCED_KEYS: {
      FONT_SIZE: 'fontSizePercent',
      LINE_HEIGHT: 'lineHeight',
      MESSAGE_PADDING: 'messagePadding',
      DISPLAY_MODE: 'displayMode',
      CODE_BLOCK_HEIGHT: 'codeBlockMaxHeight',
      CODE_BLOCK_WRAP: 'codeBlockWordWrap',
      CODE_BLOCKS_COLLAPSED: 'codeBlocksCollapsed',
      SHOW_TIMESTAMPS: 'showTimestamps',
      SHOW_AVATARS: 'showAvatars',
      BUBBLE_STYLE: 'messageBubbleStyle'
    },
    ENHANCED_DEFAULTS: {
      fontSizePercent: 100,
      lineHeight: 'normal',
      messagePadding: 'medium',
      displayMode: 'comfortable',
      codeBlockMaxHeight: 400,
      codeBlockWordWrap: false,
      codeBlocksCollapsed: false,
      showTimestamps: true,
      showAvatars: true,
      messageBubbleStyle: 'rounded'
    },
    DISPLAY_MODE_PRESETS: {
      'compact': { lineHeight: 'compact', messagePadding: 'small', fontSize: 95 },
      'comfortable': { lineHeight: 'normal', messagePadding: 'medium', fontSize: 100 },
      'spacious': { lineHeight: 'relaxed', messagePadding: 'large', fontSize: 105 }
    },
    TIMING: {
      DEBOUNCE_MS: 50,
      ANIMATION_MS: 150,
      SR_ANNOUNCE_DELAY_MS: 50,
      INIT_RETRY_INTERVALS: [100, 500, 1000, 2000, 3000]
    },
    MAX_CUSTOM_PRESETS: 4,
    MAX_RECENT_WIDTHS: 3,
    BUILT_IN_PRESETS: [
      { id: 'narrow', name: 'Narrow', width: 50, builtIn: true },
      { id: 'medium', name: 'Medium', width: 70, builtIn: true },
      { id: 'wide', name: 'Wide', width: 85, builtIn: true },
      { id: 'full', name: 'Full', width: 100, builtIn: true }
    ],
    DEFAULT_THEME: 'system',
    VALID_THEMES: ['light', 'dark', 'system'],
    BADGE_COLOR: '#6B7280',
    BADGE_TEXT_COLOR: '#FFFFFF'
  };

  window.ClaudeWidthLogger = {
    PREFIX: '[Claude Width]',
    LEVELS: { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 },
    currentLevel: 1,
    format(module, message) {
      return `${this.PREFIX} [${module}] ${message}`;
    },
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    handleError: vi.fn((module, operation, error) => ({
      success: false,
      error: `${operation} failed: ${error.message}`,
      details: error
    }))
  };
}

// Install mock constants by default
installMockConstants();
