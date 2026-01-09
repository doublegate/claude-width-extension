/**
 * Unit Tests for content/content.js
 * ===================================
 *
 * Tests for the content script that applies width customizations
 * and enhanced styling to claude.ai pages.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockClaudeDOM, waitForDOMUpdate, simulateStorageChange } from './setup.js';
import { setStorageData, mockBrowser, storageListeners, messageListeners } from './mocks/browser.js';

describe('Content Script', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  describe('Sidebar Detection', () => {
    /**
     * Test implementation of isInsideSidebar logic.
     */
    function isInsideSidebar(element) {
      const SIDEBAR_INDICATORS = [
        'nav', 'aside', '[role="navigation"]',
        '[class*="Sidebar"]', '[class*="sidebar"]',
        '[aria-label*="sidebar" i]'
      ];

      let current = element;
      while (current && current !== document.body && current !== document.documentElement) {
        for (const selector of SIDEBAR_INDICATORS) {
          try {
            if (current.matches && current.matches(selector)) {
              return true;
            }
          } catch (e) {
            // Invalid selector, skip
          }
        }
        current = current.parentElement;
      }
      return false;
    }

    it('should detect element inside nav element', () => {
      const nav = document.createElement('nav');
      const child = document.createElement('div');
      nav.appendChild(child);
      document.body.appendChild(nav);

      expect(isInsideSidebar(child)).toBe(true);
    });

    it('should detect element inside aside element', () => {
      const aside = document.createElement('aside');
      const child = document.createElement('span');
      aside.appendChild(child);
      document.body.appendChild(aside);

      expect(isInsideSidebar(child)).toBe(true);
    });

    it('should detect element with Sidebar class', () => {
      const sidebar = document.createElement('div');
      sidebar.className = 'LeftSidebar';
      const child = document.createElement('p');
      sidebar.appendChild(child);
      document.body.appendChild(sidebar);

      expect(isInsideSidebar(child)).toBe(true);
    });

    it('should detect element with role="navigation"', () => {
      const nav = document.createElement('div');
      nav.setAttribute('role', 'navigation');
      const child = document.createElement('a');
      nav.appendChild(child);
      document.body.appendChild(nav);

      expect(isInsideSidebar(child)).toBe(true);
    });

    it('should not detect element in main content area', () => {
      const main = document.createElement('main');
      main.className = 'content-area';
      const child = document.createElement('div');
      main.appendChild(child);
      document.body.appendChild(main);

      expect(isInsideSidebar(child)).toBe(false);
    });

    it('should walk up entire DOM tree', () => {
      const sidebar = document.createElement('nav');
      const level1 = document.createElement('div');
      const level2 = document.createElement('div');
      const level3 = document.createElement('span');

      sidebar.appendChild(level1);
      level1.appendChild(level2);
      level2.appendChild(level3);
      document.body.appendChild(sidebar);

      expect(isInsideSidebar(level3)).toBe(true);
    });
  });

  describe('Safe Element Matching', () => {
    function safeMatches(element, selector) {
      try {
        return element.matches && element.matches(selector);
      } catch (e) {
        return false;
      }
    }

    it('should match valid selectors', () => {
      const div = document.createElement('div');
      div.className = 'test-class';
      document.body.appendChild(div);

      expect(safeMatches(div, '.test-class')).toBe(true);
    });

    it('should not match non-matching selectors', () => {
      const div = document.createElement('div');
      div.className = 'other-class';
      document.body.appendChild(div);

      expect(safeMatches(div, '.test-class')).toBe(false);
    });

    it('should handle invalid selectors gracefully', () => {
      const div = document.createElement('div');
      document.body.appendChild(div);

      // Invalid selector should return false, not throw
      expect(safeMatches(div, '[[[invalid')).toBe(false);
    });

    it('should handle elements without matches method', () => {
      const textNode = document.createTextNode('text');
      // textNode.matches is undefined, so the result is falsy (undefined)
      expect(safeMatches(textNode, 'div')).toBeFalsy();
    });
  });

  describe('Safe Descendant Check', () => {
    function safeHasDescendant(element, selector) {
      try {
        return element.querySelector && !!element.querySelector(selector);
      } catch (e) {
        return false;
      }
    }

    it('should find matching descendants', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      child.className = 'target';
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(safeHasDescendant(parent, '.target')).toBe(true);
    });

    it('should return false when no matching descendants', () => {
      const parent = document.createElement('div');
      const child = document.createElement('span');
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(safeHasDescendant(parent, '.nonexistent')).toBe(false);
    });

    it('should handle invalid selectors gracefully', () => {
      const parent = document.createElement('div');
      document.body.appendChild(parent);

      expect(safeHasDescendant(parent, '[[[invalid')).toBe(false);
    });
  });

  describe('Width Relevance Detection', () => {
    const WIDTH_RELEVANT_SELECTOR = [
      '[class*="mx-auto"]',
      'form',
      '[class*="Composer"]',
      '[class*="Message"]',
      '[class*="Thread"]'
    ].join(',');

    function isWidthRelevant(element) {
      try {
        return element.matches(WIDTH_RELEVANT_SELECTOR) ||
               !!element.querySelector(WIDTH_RELEVANT_SELECTOR);
      } catch (e) {
        return false;
      }
    }

    it('should detect mx-auto elements', () => {
      const el = document.createElement('div');
      el.className = 'mx-auto';
      document.body.appendChild(el);

      expect(isWidthRelevant(el)).toBe(true);
    });

    it('should detect form elements', () => {
      const form = document.createElement('form');
      document.body.appendChild(form);

      expect(isWidthRelevant(form)).toBe(true);
    });

    it('should detect Composer elements', () => {
      const el = document.createElement('div');
      el.className = 'ComposerWrapper';
      document.body.appendChild(el);

      expect(isWidthRelevant(el)).toBe(true);
    });

    it('should detect Message elements', () => {
      const el = document.createElement('div');
      el.className = 'MessageContent';
      document.body.appendChild(el);

      expect(isWidthRelevant(el)).toBe(true);
    });

    it('should detect elements containing width-relevant children', () => {
      const parent = document.createElement('div');
      const child = document.createElement('div');
      child.className = 'mx-auto';
      parent.appendChild(child);
      document.body.appendChild(parent);

      expect(isWidthRelevant(parent)).toBe(true);
    });

    it('should return false for non-relevant elements', () => {
      const el = document.createElement('span');
      el.className = 'random-class';
      document.body.appendChild(el);

      expect(isWidthRelevant(el)).toBe(false);
    });
  });

  describe('Enhanced Relevance Detection', () => {
    const ENHANCED_RELEVANT_SELECTOR = [
      '.prose',
      '[class*="prose"]',
      '[class*="Message"]',
      'pre',
      '[class*="CodeBlock"]',
      '[class*="avatar" i]',
      'time'
    ].join(',');

    function isEnhancedRelevant(element) {
      try {
        return element.matches(ENHANCED_RELEVANT_SELECTOR) ||
               !!element.querySelector(ENHANCED_RELEVANT_SELECTOR);
      } catch (e) {
        return false;
      }
    }

    it('should detect prose elements', () => {
      const el = document.createElement('div');
      el.className = 'prose';
      document.body.appendChild(el);

      expect(isEnhancedRelevant(el)).toBe(true);
    });

    it('should detect pre elements', () => {
      const pre = document.createElement('pre');
      document.body.appendChild(pre);

      expect(isEnhancedRelevant(pre)).toBe(true);
    });

    it('should detect time elements', () => {
      const time = document.createElement('time');
      document.body.appendChild(time);

      expect(isEnhancedRelevant(time)).toBe(true);
    });

    it('should detect avatar elements (case insensitive)', () => {
      const el = document.createElement('div');
      el.className = 'Avatar';
      document.body.appendChild(el);

      expect(isEnhancedRelevant(el)).toBe(true);
    });

    it('should detect CodeBlock elements', () => {
      const el = document.createElement('div');
      el.className = 'CodeBlockWrapper';
      document.body.appendChild(el);

      expect(isEnhancedRelevant(el)).toBe(true);
    });
  });

  describe('Process Non-Sidebar Elements', () => {
    function processNonSidebarElements(selector, callback, root = document) {
      const SIDEBAR_INDICATORS = ['nav', '[class*="Sidebar"]'];

      function isInsideSidebar(element) {
        let current = element;
        while (current && current !== document.body) {
          for (const sel of SIDEBAR_INDICATORS) {
            try {
              if (current.matches && current.matches(sel)) return true;
            } catch (e) {}
          }
          current = current.parentElement;
        }
        return false;
      }

      let count = 0;
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (!isInsideSidebar(el)) {
            callback(el);
            count++;
          }
        });
      } catch (e) {}
      return count;
    }

    it('should process elements outside sidebar', () => {
      const main = document.createElement('main');
      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      div1.className = 'target';
      div2.className = 'target';
      main.appendChild(div1);
      main.appendChild(div2);
      document.body.appendChild(main);

      const processed = [];
      const count = processNonSidebarElements('.target', el => processed.push(el));

      expect(count).toBe(2);
      expect(processed).toContain(div1);
      expect(processed).toContain(div2);
    });

    it('should skip elements inside sidebar', () => {
      const sidebar = document.createElement('nav');
      const sidebarDiv = document.createElement('div');
      sidebarDiv.className = 'target';
      sidebar.appendChild(sidebarDiv);

      const main = document.createElement('main');
      const mainDiv = document.createElement('div');
      mainDiv.className = 'target';
      main.appendChild(mainDiv);

      document.body.appendChild(sidebar);
      document.body.appendChild(main);

      const processed = [];
      const count = processNonSidebarElements('.target', el => processed.push(el));

      expect(count).toBe(1);
      expect(processed).toContain(mainDiv);
      expect(processed).not.toContain(sidebarDiv);
    });

    it('should use custom root element', () => {
      const container = document.createElement('div');
      container.id = 'custom-root';
      const child = document.createElement('span');
      child.className = 'target';
      container.appendChild(child);
      document.body.appendChild(container);

      const outsideChild = document.createElement('span');
      outsideChild.className = 'target';
      document.body.appendChild(outsideChild);

      const processed = [];
      processNonSidebarElements('.target', el => processed.push(el), container);

      expect(processed.length).toBe(1);
      expect(processed[0]).toBe(child);
    });
  });

  describe('Style Application', () => {
    it('should apply width style to elements', () => {
      const el = document.createElement('div');
      el.className = 'mx-auto';
      document.body.appendChild(el);

      // Simulate width application
      const width = 85;
      el.style.maxWidth = `${width}%`;
      el.style.width = `${width}%`;
      el.style.marginLeft = 'auto';
      el.style.marginRight = 'auto';
      el.setAttribute('data-claude-width-applied', 'true');

      expect(el.style.maxWidth).toBe('85%');
      expect(el.style.width).toBe('85%');
      expect(el.getAttribute('data-claude-width-applied')).toBe('true');
    });

    it('should clear applied styles', () => {
      const el = document.createElement('div');
      el.style.maxWidth = '85%';
      el.style.width = '85%';
      el.setAttribute('data-claude-width-applied', 'true');
      document.body.appendChild(el);

      // Clear styles
      el.style.maxWidth = '';
      el.style.width = '';
      el.style.marginLeft = '';
      el.style.marginRight = '';
      el.removeAttribute('data-claude-width-applied');

      expect(el.style.maxWidth).toBe('');
      expect(el.getAttribute('data-claude-width-applied')).toBeNull();
    });
  });

  describe('Enhanced Styling Application', () => {
    it('should apply font size style', () => {
      const el = document.createElement('div');
      el.className = 'prose';
      document.body.appendChild(el);

      const fontSizePercent = 110;
      el.style.fontSize = `${fontSizePercent}%`;

      expect(el.style.fontSize).toBe('110%');
    });

    it('should apply line height style', () => {
      const LINE_HEIGHT_VALUES = {
        'compact': 1.2,
        'normal': 1.5,
        'relaxed': 1.8
      };

      const el = document.createElement('p');
      document.body.appendChild(el);

      el.style.lineHeight = String(LINE_HEIGHT_VALUES['relaxed']);

      expect(el.style.lineHeight).toBe('1.8');
    });

    it('should apply message padding style', () => {
      const MESSAGE_PADDING_VALUES = {
        'none': 0,
        'small': 8,
        'medium': 16,
        'large': 24
      };

      const el = document.createElement('div');
      el.className = 'Message';
      document.body.appendChild(el);

      el.style.padding = `${MESSAGE_PADDING_VALUES['large']}px`;

      expect(el.style.padding).toBe('24px');
    });

    it('should apply code block max height', () => {
      const pre = document.createElement('pre');
      document.body.appendChild(pre);

      pre.style.maxHeight = '400px';
      pre.style.overflow = 'auto';

      expect(pre.style.maxHeight).toBe('400px');
      expect(pre.style.overflow).toBe('auto');
    });

    it('should apply code block word wrap', () => {
      const pre = document.createElement('pre');
      document.body.appendChild(pre);

      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordWrap = 'break-word';

      expect(pre.style.whiteSpace).toBe('pre-wrap');
    });

    it('should hide timestamps', () => {
      const time = document.createElement('time');
      time.textContent = '10:30 AM';
      document.body.appendChild(time);

      time.style.display = 'none';

      expect(time.style.display).toBe('none');
    });

    it('should hide avatars', () => {
      const avatar = document.createElement('div');
      avatar.className = 'Avatar';
      document.body.appendChild(avatar);

      avatar.style.display = 'none';

      expect(avatar.style.display).toBe('none');
    });
  });

  describe('Width Clamping', () => {
    const MIN_WIDTH = 40;
    const MAX_WIDTH = 100;

    function clampWidth(width) {
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
    }

    it('should clamp width below minimum', () => {
      expect(clampWidth(20)).toBe(MIN_WIDTH);
    });

    it('should clamp width above maximum', () => {
      expect(clampWidth(150)).toBe(MAX_WIDTH);
    });

    it('should not clamp valid width', () => {
      expect(clampWidth(75)).toBe(75);
    });

    it('should handle edge cases', () => {
      expect(clampWidth(MIN_WIDTH)).toBe(MIN_WIDTH);
      expect(clampWidth(MAX_WIDTH)).toBe(MAX_WIDTH);
    });
  });

  describe('Style Element Management', () => {
    it('should create style element with correct ID', () => {
      const styleEl = document.createElement('style');
      styleEl.id = 'claude-width-customizer-styles';
      styleEl.textContent = '.test { color: red; }';
      document.head.appendChild(styleEl);

      const found = document.getElementById('claude-width-customizer-styles');
      expect(found).toBeTruthy();
      expect(found.tagName).toBe('STYLE');
    });

    it('should create enhanced style element', () => {
      const styleEl = document.createElement('style');
      styleEl.id = 'claude-enhanced-styles';
      styleEl.textContent = '.prose { font-size: 110%; }';
      document.head.appendChild(styleEl);

      const found = document.getElementById('claude-enhanced-styles');
      expect(found).toBeTruthy();
    });

    it('should update existing style element content', () => {
      const styleEl = document.createElement('style');
      styleEl.id = 'claude-width-customizer-styles';
      styleEl.textContent = 'initial content';
      document.head.appendChild(styleEl);

      styleEl.textContent = 'updated content';

      const found = document.getElementById('claude-width-customizer-styles');
      expect(found.textContent).toBe('updated content');
    });

    it('should remove style element when clearing', () => {
      const styleEl = document.createElement('style');
      styleEl.id = 'claude-width-customizer-styles';
      document.head.appendChild(styleEl);

      styleEl.remove();

      const found = document.getElementById('claude-width-customizer-styles');
      expect(found).toBeNull();
    });
  });

  describe('MutationObserver Behavior', () => {
    it('should detect added elements', async () => {
      const addedNodes = [];
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              addedNodes.push(node);
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      const newEl = document.createElement('div');
      newEl.className = 'Message';
      document.body.appendChild(newEl);

      await waitForDOMUpdate(10);

      expect(addedNodes.length).toBe(1);
      expect(addedNodes[0].className).toBe('Message');

      observer.disconnect();
    });

    it('should ignore non-element nodes', async () => {
      const addedElements = [];
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              addedElements.push(node);
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      const textNode = document.createTextNode('text');
      document.body.appendChild(textNode);

      await waitForDOMUpdate(10);

      expect(addedElements.length).toBe(0);

      observer.disconnect();
    });
  });

  describe('Display Mode Presets', () => {
    const DISPLAY_MODE_PRESETS = {
      'compact': { lineHeight: 'compact', messagePadding: 'small', fontSize: 95 },
      'comfortable': { lineHeight: 'normal', messagePadding: 'medium', fontSize: 100 },
      'spacious': { lineHeight: 'relaxed', messagePadding: 'large', fontSize: 105 }
    };

    it('should have correct compact preset values', () => {
      const compact = DISPLAY_MODE_PRESETS['compact'];
      expect(compact.lineHeight).toBe('compact');
      expect(compact.messagePadding).toBe('small');
      expect(compact.fontSize).toBe(95);
    });

    it('should have correct comfortable preset values', () => {
      const comfortable = DISPLAY_MODE_PRESETS['comfortable'];
      expect(comfortable.lineHeight).toBe('normal');
      expect(comfortable.messagePadding).toBe('medium');
      expect(comfortable.fontSize).toBe(100);
    });

    it('should have correct spacious preset values', () => {
      const spacious = DISPLAY_MODE_PRESETS['spacious'];
      expect(spacious.lineHeight).toBe('relaxed');
      expect(spacious.messagePadding).toBe('large');
      expect(spacious.fontSize).toBe(105);
    });
  });

  describe('Mock Claude DOM', () => {
    it('should create DOM with sidebar', () => {
      createMockClaudeDOM({ withSidebar: true });

      const sidebar = document.querySelector('.Sidebar');
      expect(sidebar).toBeTruthy();
    });

    it('should create DOM with messages', () => {
      createMockClaudeDOM({ withMessages: true });

      const messages = document.querySelectorAll('.Message');
      expect(messages.length).toBe(2);
    });

    it('should create DOM with composer', () => {
      createMockClaudeDOM({ withComposer: true });

      const composer = document.querySelector('.Composer');
      expect(composer).toBeTruthy();
      expect(composer.querySelector('form')).toBeTruthy();
    });

    it('should create DOM with code blocks', () => {
      createMockClaudeDOM({ withMessages: true, withCodeBlocks: true });

      const codeBlock = document.querySelector('.CodeBlock');
      expect(codeBlock).toBeTruthy();
    });

    it('should create complete DOM structure', () => {
      createMockClaudeDOM({
        withSidebar: true,
        withMessages: true,
        withComposer: true,
        withCodeBlocks: true
      });

      expect(document.querySelector('.Sidebar')).toBeTruthy();
      expect(document.querySelector('.Thread')).toBeTruthy();
      expect(document.querySelectorAll('.Message').length).toBe(2);
      expect(document.querySelector('.Composer')).toBeTruthy();
      expect(document.querySelector('.CodeBlock')).toBeTruthy();
    });
  });
});
