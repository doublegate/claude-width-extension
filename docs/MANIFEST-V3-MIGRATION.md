# Manifest V3 Migration Guide

**Document Version:** 1.0.0
**Last Updated:** 2026-01-08
**Target Extension Version:** v2.0.0
**Current Extension Version:** v1.8.1 (Manifest V2)

---

## Table of Contents

1. [Overview](#overview)
2. [Timeline & Strategy](#timeline--strategy)
3. [Key API Changes](#key-api-changes)
4. [Migration Checklist](#migration-checklist)
5. [File-by-File Changes](#file-by-file-changes)
6. [Browser Abstraction Layer](#browser-abstraction-layer)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)
9. [References](#references)

---

## Overview

### Why Migrate?

- **Chrome Web Store requirement**: Chrome requires Manifest V3 for all new extensions and updates
- **Microsoft Edge**: Uses same Chromium extension system, requires MV3
- **Firefox**: Supports MV3 but also maintains MV2 support (no forced migration)
- **Future-proofing**: MV3 is the standard going forward

### Impact Assessment

| Component | Impact | Complexity |
|-----------|--------|------------|
| manifest.json | **High** | Medium |
| background.js | **High** | High |
| content.js | Low | Low |
| popup.js | Low | Low |
| constants.js | None | None |
| CSS files | None | None |

### Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Service worker lifecycle issues | Medium | High | Persistent alarms, storage-based state |
| API compatibility gaps | Low | Medium | Browser abstraction layer |
| Context menu rebuild on wake | Medium | Low | Event-driven rebuild pattern |
| Badge state loss | Medium | Low | Storage-backed badge state |

---

## Timeline & Strategy

### Recommended Approach: Dual-Build System

Maintain two manifest files and a single codebase:

```
claude-width-extension/
├── manifest.v2.json      # Firefox Manifest V2
├── manifest.v3.json      # Chrome/Edge Manifest V3
├── lib/
│   ├── constants.js      # Shared (unchanged)
│   └── browser-compat.js # NEW: Browser API abstraction
├── background/
│   └── background.js     # Modified for both MV2/MV3
├── ...
```

### Migration Phases

| Phase | Tasks | Duration |
|-------|-------|----------|
| 1. Preparation | Create abstraction layer, update build system | 1-2 days |
| 2. Background Script | Convert to service worker compatible code | 2-3 days |
| 3. Manifest Updates | Create MV3 manifest, test permissions | 1 day |
| 4. Testing | Cross-browser testing, edge cases | 2-3 days |
| 5. Release | Staged rollout, monitor for issues | 1 week |

---

## Key API Changes

### 1. Background Scripts to Service Worker

**Current (MV2):**
```json
"background": {
  "scripts": ["lib/constants.js", "background/background.js"],
  "persistent": false
}
```

**Target (MV3):**
```json
"background": {
  "service_worker": "background/background.js",
  "type": "module"
}
```

**Code Changes Required:**

| MV2 Pattern | MV3 Equivalent |
|-------------|----------------|
| `window` object | Not available - use `self` or avoid |
| DOM APIs | Not available - cannot use |
| `setInterval`/`setTimeout` | Use `chrome.alarms` for >30s intervals |
| Module state | Must survive service worker termination |
| `XMLHttpRequest` | Use `fetch()` (already compatible) |

**Critical: State Persistence**

Service workers can terminate at any time. State must be:
- Stored in `browser.storage.local` OR
- Rebuilt on service worker activation

```javascript
// MV2: Module-level state (persists while background page lives)
let currentWidth = 85;

// MV3: Storage-backed state (survives service worker restart)
async function getState() {
  const result = await chrome.storage.local.get(['currentWidth']);
  return result.currentWidth ?? 85;
}

async function setState(width) {
  await chrome.storage.local.set({ currentWidth: width });
}
```

### 2. browser_action to action

**Current (MV2):**
```json
"browser_action": {
  "default_icon": { "48": "icons/icon-48.png", "96": "icons/icon-96.png" },
  "default_title": "Claude Chat Width",
  "default_popup": "popup/popup.html"
}
```

**Target (MV3):**
```json
"action": {
  "default_icon": { "48": "icons/icon-48.png", "96": "icons/icon-96.png" },
  "default_title": "Claude Chat Width",
  "default_popup": "popup/popup.html"
}
```

**API Changes:**
```javascript
// MV2
browser.browserAction.setBadgeText({ text: '85' });
browser.browserAction.setBadgeBackgroundColor({ color: '#6B7280' });

// MV3
chrome.action.setBadgeText({ text: '85' });
chrome.action.setBadgeBackgroundColor({ color: '#6B7280' });
```

### 3. Permissions Model

**Current (MV2):**
```json
"permissions": [
  "storage",
  "activeTab",
  "tabs",
  "contextMenus"
]
```

**Target (MV3):**
```json
"permissions": [
  "storage",
  "activeTab",
  "contextMenus"
],
"host_permissions": [
  "*://claude.ai/*"
]
```

**Key Changes:**
- `tabs` permission: Often not needed in MV3 if using `activeTab`
- `host_permissions`: Separated from `permissions` for user transparency
- Content script `matches` patterns automatically grant host permissions

### 4. Content Security Policy

**Current (MV2):**
```json
"content_security_policy": "script-src 'self'; object-src 'self'"
```

**Target (MV3):**
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

**Note:** MV3 has stricter CSP requirements. Fortunately, this extension already complies - no dynamic code execution, no remote scripts, no inline scripts.

### 5. Commands API

**Unchanged** - The `commands` API works identically in MV3:

```json
"commands": {
  "_execute_action": {  // Note: Changed from _execute_browser_action
    "suggested_key": { "default": "Alt+Shift+W" },
    "description": "Open Claude Width popup"
  },
  "cycle-presets": { ... },
  "toggle-default": { ... }
}
```

**Important:** `_execute_browser_action` becomes `_execute_action` in MV3.

### 6. Context Menus

**Mostly unchanged**, but service worker lifecycle affects when menus are created:

```javascript
// MV2: Create once when background loads
browser.contextMenus.create({ ... });

// MV3: Recreate on service worker startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ ... });
});

// Also handle onStartup for existing installs
chrome.runtime.onStartup.addListener(() => {
  rebuildContextMenu();
});
```

---

## Migration Checklist

### Pre-Migration

- [ ] Audit all `window` and DOM API usage in background.js
- [ ] Identify all module-level state that needs persistence
- [ ] Review all timer usage (`setInterval`, `setTimeout`)
- [ ] Create browser abstraction layer
- [ ] Set up dual-build system

### Manifest Changes

- [ ] Create `manifest.v3.json` from `manifest.json`
- [ ] Change `manifest_version` to `3`
- [ ] Convert `browser_action` to `action`
- [ ] Convert `background.scripts` to `background.service_worker`
- [ ] Move host patterns from `permissions` to `host_permissions`
- [ ] Update `content_security_policy` to object format
- [ ] Change `_execute_browser_action` to `_execute_action`
- [ ] Remove `gecko` specific settings (Chrome doesn't support)

### Background Script Changes

- [ ] Replace `browser.browserAction.*` with `chrome.action.*` (or abstraction)
- [ ] Move state to storage-backed getters/setters
- [ ] Ensure context menu rebuilds on service worker activation
- [ ] Ensure badge state rebuilds on service worker activation
- [ ] Add `chrome.runtime.onInstalled` handler for initialization
- [ ] Add `chrome.runtime.onStartup` handler for state restoration
- [ ] Remove any `window` or DOM references

### Testing

- [ ] Test all keyboard shortcuts in both browsers
- [ ] Test context menu in both browsers
- [ ] Test badge updates in both browsers
- [ ] Test service worker termination/restart scenarios
- [ ] Test extension update scenarios
- [ ] Test fresh install scenarios
- [ ] Verify no console errors in either browser

### Release

- [ ] Build separate XPI (Firefox) and CRX/ZIP (Chrome) packages
- [ ] Submit to Mozilla Add-ons
- [ ] Submit to Chrome Web Store
- [ ] Submit to Microsoft Edge Add-ons
- [ ] Monitor for user-reported issues

---

## File-by-File Changes

### manifest.v3.json (NEW)

```json
{
  "manifest_version": 3,
  "name": "Claude Chat Width Customizer",
  "version": "2.0.0",
  "description": "Customize the width of text input/output boxes in Claude.AI chat sessions",
  "author": "DoubleGate",
  "homepage_url": "https://github.com/doublegate/claude-width-extension",

  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png",
    "128": "icons/icon-128.png"
  },

  "permissions": [
    "storage",
    "activeTab",
    "contextMenus"
  ],

  "host_permissions": [
    "*://claude.ai/*"
  ],

  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+W",
        "mac": "Alt+Shift+W"
      },
      "description": "Open Claude Width popup"
    },
    "cycle-presets": {
      "suggested_key": {
        "default": "Alt+Shift+C",
        "mac": "Alt+Shift+C"
      },
      "description": "Cycle through width presets"
    },
    "toggle-default": {
      "suggested_key": {
        "default": "Alt+Shift+D",
        "mac": "Alt+Shift+D"
      },
      "description": "Toggle between current and default width"
    }
  },

  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },

  "action": {
    "default_icon": {
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    },
    "default_title": "Claude Chat Width",
    "default_popup": "popup/popup.html"
  },

  "options_ui": {
    "page": "options/options.html"
  },

  "content_scripts": [
    {
      "matches": ["*://claude.ai/*"],
      "js": ["lib/constants.js", "content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_end"
    }
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### lib/browser-compat.js (NEW)

```javascript
/**
 * Browser Compatibility Layer
 * ===========================
 *
 * Provides unified API for both Firefox (MV2) and Chrome/Edge (MV3).
 * Import this module instead of using browser/chrome APIs directly.
 *
 * @version 2.0.0
 */

// Detect browser environment
const isFirefox = typeof browser !== 'undefined';
const isChrome = typeof chrome !== 'undefined' && !isFirefox;

// Base API object - Firefox uses 'browser', Chrome uses 'chrome'
const api = isFirefox ? browser : chrome;

/**
 * Promise wrapper for Chrome callback APIs
 * Chrome MV3 supports promises natively, but this provides fallback
 */
function promisify(fn) {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn(...args, (result) => {
        if (api.runtime.lastError) {
          reject(new Error(api.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  };
}

/**
 * Storage API wrapper
 */
export const storage = {
  local: {
    get: (keys) => api.storage.local.get(keys),
    set: (items) => api.storage.local.set(items),
    remove: (keys) => api.storage.local.remove(keys),
    clear: () => api.storage.local.clear()
  },
  sync: {
    get: (keys) => api.storage.sync.get(keys),
    set: (items) => api.storage.sync.set(items)
  },
  onChanged: api.storage.onChanged
};

/**
 * Action/BrowserAction API wrapper
 * Handles MV2 browserAction vs MV3 action
 */
export const action = {
  setBadgeText: (details) => {
    const actionApi = api.action || api.browserAction;
    return actionApi.setBadgeText(details);
  },
  setBadgeBackgroundColor: (details) => {
    const actionApi = api.action || api.browserAction;
    return actionApi.setBadgeBackgroundColor(details);
  },
  setBadgeTextColor: (details) => {
    const actionApi = api.action || api.browserAction;
    // setBadgeTextColor may not exist in all browsers
    if (actionApi.setBadgeTextColor) {
      return actionApi.setBadgeTextColor(details);
    }
  },
  setTitle: (details) => {
    const actionApi = api.action || api.browserAction;
    return actionApi.setTitle(details);
  }
};

/**
 * Tabs API wrapper
 */
export const tabs = {
  query: (queryInfo) => api.tabs.query(queryInfo),
  sendMessage: (tabId, message) => api.tabs.sendMessage(tabId, message),
  onActivated: api.tabs.onActivated,
  onUpdated: api.tabs.onUpdated
};

/**
 * Runtime API wrapper
 */
export const runtime = {
  sendMessage: (message) => api.runtime.sendMessage(message),
  onMessage: api.runtime.onMessage,
  onInstalled: api.runtime.onInstalled,
  onStartup: api.runtime.onStartup,
  getURL: (path) => api.runtime.getURL(path),
  id: api.runtime.id
};

/**
 * Commands API wrapper
 */
export const commands = {
  getAll: () => api.commands.getAll(),
  onCommand: api.commands.onCommand
};

/**
 * Context Menus API wrapper
 */
export const contextMenus = {
  create: (createProperties) => api.contextMenus.create(createProperties),
  update: (id, updateProperties) => api.contextMenus.update(id, updateProperties),
  remove: (menuItemId) => api.contextMenus.remove(menuItemId),
  removeAll: () => api.contextMenus.removeAll(),
  onClicked: api.contextMenus.onClicked
};

/**
 * Environment info
 */
export const env = {
  isFirefox,
  isChrome,
  manifestVersion: api.runtime.getManifest?.()?.manifest_version ?? 2
};

// Default export for convenience
export default {
  storage,
  action,
  tabs,
  runtime,
  commands,
  contextMenus,
  env
};
```

### background/background.js Changes

**Current pattern (problematic for MV3):**
```javascript
// Module-level state - lost on service worker restart
let currentState = {
  width: 85,
  customPresets: [],
  recentWidths: []
};
```

**Recommended pattern (MV3-compatible):**
```javascript
/**
 * Storage-backed state management for service worker compatibility
 */
const StateManager = {
  async get(key, defaultValue) {
    const result = await browser.storage.local.get({ [key]: defaultValue });
    return result[key];
  },

  async set(key, value) {
    await browser.storage.local.set({ [key]: value });
  },

  async getAll() {
    return await browser.storage.local.get({
      chatWidthPercent: DEFAULT_WIDTH,
      customPresets: [],
      hiddenBuiltInPresets: [],
      recentWidths: [],
      theme: DEFAULT_THEME,
      // ... enhanced settings
    });
  }
};

// Replace module-level state access
// OLD: currentState.width
// NEW: await StateManager.get('chatWidthPercent', DEFAULT_WIDTH)
```

**Context menu rebuild on activation:**
```javascript
// Ensure menus exist when service worker starts
async function ensureContextMenus() {
  try {
    await browser.contextMenus.removeAll();
    await buildContextMenu();
  } catch (e) {
    console.error('Failed to rebuild context menus:', e);
  }
}

// Call on install and startup
browser.runtime.onInstalled.addListener(ensureContextMenus);
browser.runtime.onStartup.addListener(ensureContextMenus);
```

**Badge state restoration:**
```javascript
// Restore badge when service worker activates
async function restoreBadgeState() {
  const { chatWidthPercent } = await browser.storage.local.get({
    chatWidthPercent: DEFAULT_WIDTH
  });
  await updateBadge(chatWidthPercent);
}

// Initialize on startup
browser.runtime.onStartup.addListener(restoreBadgeState);
```

### popup/popup.js Changes

**Minimal changes required.** The popup runs in its own context and is not affected by service worker lifecycle.

Only change needed:
```javascript
// MV2
browser.browserAction... // Not used in popup, but if present

// MV3 - Use abstraction layer
import { action } from '../lib/browser-compat.js';
```

### content/content.js Changes

**No changes required.** Content scripts work identically in MV2 and MV3.

---

## Browser Abstraction Layer

### Usage Pattern

```javascript
// Import specific APIs you need
import { storage, action, tabs, runtime } from '../lib/browser-compat.js';

// Use exactly like native APIs
const result = await storage.local.get('chatWidthPercent');
await action.setBadgeText({ text: '85' });
const activeTabs = await tabs.query({ active: true, currentWindow: true });
```

### Benefits

1. **Single codebase** for Firefox and Chrome
2. **Future-proof** - add new browser support without code changes
3. **Testable** - can mock the abstraction layer
4. **Type-safe** - can add TypeScript definitions

---

## Testing Strategy

### Automated Testing

```javascript
// tests/mv3-compat.test.js
describe('MV3 Compatibility', () => {
  describe('Service Worker Lifecycle', () => {
    it('should restore state after termination', async () => {
      // Simulate service worker restart
      await storage.local.set({ chatWidthPercent: 75 });

      // Simulate state restoration
      const state = await StateManager.getAll();
      expect(state.chatWidthPercent).toBe(75);
    });

    it('should rebuild context menu on startup', async () => {
      // Trigger startup handler
      await ensureContextMenus();

      // Verify menus exist
      // (Would need mock verification in real test)
    });
  });

  describe('Browser Abstraction', () => {
    it('should use correct API for environment', () => {
      const { isFirefox, isChrome } = env;
      expect(isFirefox || isChrome).toBe(true);
    });
  });
});
```

### Manual Testing Checklist

#### Firefox (MV2)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| Popup opens | Click toolbar icon | Popup displays, slider works |
| Keyboard shortcut | Alt+Shift+W | Popup opens |
| Preset cycling | Alt+Shift+C | Width cycles through presets |
| Context menu | Right-click on claude.ai | Menu appears with presets |
| Badge updates | Change width | Badge shows new value |
| Storage persistence | Change settings, restart browser | Settings preserved |

#### Chrome (MV3)

| Test Case | Steps | Expected |
|-----------|-------|----------|
| All Firefox tests | Same | Same expected behavior |
| Service worker restart | Idle for 30s, then use | All features work |
| Install flow | Fresh install | Defaults set correctly |
| Update flow | Update from v1.x | Settings migrated |

### Edge Cases

- [ ] Service worker terminates mid-operation
- [ ] User changes settings while service worker is dead
- [ ] Multiple Claude tabs open simultaneously
- [ ] Extension update while Claude tab is open
- [ ] Browser crash recovery

---

## Rollback Plan

### If Chrome MV3 Issues Found

1. **Immediate**: Unpublish Chrome version from Web Store
2. **Communication**: Post issue on GitHub, notify affected users
3. **Investigation**: Identify root cause, fix in development
4. **Re-release**: After thorough testing

### If Firefox MV2 Issues Found After MV3 Work

The dual-build system ensures Firefox users are unaffected by Chrome-specific changes:

1. Firefox build continues using `manifest.v2.json`
2. No service worker code paths executed on Firefox
3. Browser abstraction layer handles API differences

### Version Strategy

- **v2.0.0**: Multi-browser release (Firefox MV2 + Chrome MV3)
- **v2.0.1+**: Bug fixes for both platforms
- **v2.1.0**: Firefox MV3 migration (when Firefox enforces MV3)

---

## References

### Official Documentation

- [Chrome MV3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Chrome Service Workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
- [Firefox MV3 Support](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)

### Key Differences Summary

| Feature | MV2 (Firefox) | MV3 (Chrome) |
|---------|---------------|--------------|
| Background | Persistent/Event page | Service worker |
| Popup action | `browser_action` | `action` |
| Host permissions | In `permissions` | Separate `host_permissions` |
| CSP | String | Object |
| Open popup command | `_execute_browser_action` | `_execute_action` |
| DOM in background | Available | Not available |
| Module-level state | Persistent | Ephemeral |

### Tools

- [web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/) - Firefox extension development
- [Chrome Extension CLI](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world) - Chrome development
- [Polyfill](https://github.com/nickclaw/browser-polyfill) - Browser compatibility

---

## Appendix: Current Extension Analysis

### APIs Used (background.js)

| API | MV3 Compatible | Notes |
|-----|----------------|-------|
| `browser.storage.local` | Yes | No changes |
| `browser.storage.onChanged` | Yes | No changes |
| `browser.browserAction.setBadgeText` | **No** | Use `chrome.action` |
| `browser.browserAction.setBadgeBackgroundColor` | **No** | Use `chrome.action` |
| `browser.browserAction.setBadgeTextColor` | **No** | Use `chrome.action` |
| `browser.contextMenus.create` | Yes | Rebuild on startup |
| `browser.contextMenus.removeAll` | Yes | No changes |
| `browser.contextMenus.onClicked` | Yes | No changes |
| `browser.commands.onCommand` | Yes | No changes |
| `browser.tabs.query` | Yes | No changes |
| `browser.tabs.sendMessage` | Yes | No changes |
| `browser.tabs.onActivated` | Yes | No changes |
| `browser.tabs.onUpdated` | Yes | No changes |
| `browser.runtime.onMessage` | Yes | No changes |
| `browser.runtime.onInstalled` | Yes | No changes |

### State Variables (background.js)

Variables that need storage-backing for MV3:

| Variable | Current Location | MV3 Strategy |
|----------|------------------|--------------|
| Badge text | In-memory | Restore from `chatWidthPercent` |
| Context menu state | In-memory | Rebuild on activation |
| Recent widths | Storage | Already persistent |
| Custom presets | Storage | Already persistent |
| Migration version | Storage | Already persistent |

### Estimated Effort

| Task | Hours |
|------|-------|
| Create browser-compat.js | 2 |
| Update background.js | 4 |
| Create manifest.v3.json | 1 |
| Build system updates | 2 |
| Testing (Firefox) | 2 |
| Testing (Chrome) | 3 |
| Documentation | 2 |
| **Total** | **16 hours** |

---

*This document should be updated as the migration progresses and new issues are discovered.*
