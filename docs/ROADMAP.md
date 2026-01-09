# Claude Chat Width Customizer - Development Roadmap

**Version Range:** v1.6.0 - v2.0.0
**Last Updated:** 2026-01-08
**Status:** v1.9.0 Complete

---

## Overview

This document outlines the planned features and improvements for each minor release leading up to v2.0.0. Each version focuses on a specific theme to ensure incremental, well-tested improvements.

---

## Version Summary

| Version | Theme | Key Focus | Status |
|---------|-------|-----------|--------|
| v1.6.0 | Keyboard & Accessibility | Keyboard shortcuts, ARIA improvements | **COMPLETE** |
| v1.7.0 | Custom Presets | User-defined presets, preset management | **COMPLETE** |
| v1.8.0 | Enhanced Styling | Font size, line spacing, compact mode | **COMPLETE** |
| v1.9.0 | Sync & Profiles | Cross-device sync, multiple profiles | **COMPLETE** |
| v2.0.0 | Multi-Browser & Polish | Chrome/Edge support, UI overhaul | Planned |

---

## v1.6.0 - Keyboard & Accessibility

**Theme:** Make the extension fully keyboard-accessible and add power-user shortcuts.

**Status:** COMPLETE (Released 2026-01-07)

### Features

- [x] **Keyboard Shortcuts**
  - Global shortcut to open popup (Alt+Shift+W)
  - Shortcut to cycle through presets while on claude.ai (Alt+Shift+C)
  - Shortcut to toggle between last-used width and default (Alt+Shift+D)
  - Number keys (1-4) in popup to quickly select presets

- [x] **Accessibility Improvements**
  - Full ARIA labels for all interactive elements
  - Focus trap within popup for keyboard navigation
  - Screen reader announcements for width changes
  - High contrast mode support (forced-colors)
  - Reduced motion option (prefers-reduced-motion)

- [x] **Status Improvements**
  - Show current width in browser toolbar badge/tooltip
  - Visual indicator when width is non-default

### Technical Tasks

- [x] Add `commands` to manifest.json for keyboard shortcuts
- [x] Implement `browser.commands` API handlers in background.js
- [x] Add options page for shortcut documentation
- [x] Audit and improve ARIA attributes
- [x] Add `prefers-reduced-motion` media query support
- [x] Add `forced-colors` media query support

### Implementation Details

**New Files Created:**
- `background/background.js` - Command handlers, badge management
- `options/options.html` - Options page with shortcut documentation
- `options/options.css` - Options page styling
- `options/options.js` - Options page logic

**Files Updated:**
- `manifest.json` - Added commands, background script, options_ui, tabs permission
- `popup/popup.html` - ARIA attributes, screen reader live region, shortcut hints
- `popup/popup.js` - Keyboard handlers, focus trap, screen reader announcements
- `popup/popup.css` - Reduced motion, high contrast mode support
- `content/content.js` - cyclePresets and toggleDefault message handlers
- `content/content.css` - Reduced motion and high contrast support

### Testing Checklist

- [x] All features accessible via keyboard only
- [x] Screen reader testing (NVDA, VoiceOver)
- [x] Shortcuts work on Windows, macOS, Linux

---

## v1.7.0 - Custom Presets

**Theme:** Allow users to create, save, and manage their own width presets.

**Status:** COMPLETE (Released 2026-01-08)

### Features

- [x] **Custom Preset Management**
  - "Save Current" button to create new preset from current width
  - Name custom presets (e.g., "Reading Mode", "Coding Review")
  - Edit/rename existing custom presets
  - Delete custom presets
  - Maximum of 8 custom presets (4 built-in + 4 user)

- [x] **Preset Organization**
  - Drag-and-drop reordering of presets
  - Show/hide built-in presets
  - "Favorites" marking for most-used presets

- [x] **Quick Access**
  - Right-click context menu on claude.ai with preset list
  - Popup shows recently used widths

### Technical Tasks

- [x] Extend storage schema for custom presets
- [x] Implement preset CRUD operations
- [x] Add context menu via `browser.contextMenus` API
- [x] Design preset management UI in popup
- [x] Migration path for existing users (preserve settings)

### Storage Schema

```javascript
{
  chatWidthPercent: 70,
  theme: 'system',
  customPresets: [
    { id: 'uuid', name: 'Reading', width: 65, order: 0 },
    { id: 'uuid', name: 'Wide Code', width: 95, order: 1 }
  ],
  hiddenBuiltInPresets: [],
  recentWidths: [70, 85, 60]
}
```

### Testing Checklist

- [x] Create, edit, delete presets
- [x] Presets persist across browser restart
- [x] Context menu appears on claude.ai only
- [x] Migration from v1.5.x/v1.6.x works correctly

### Implementation Details

**Files Updated:**
- `manifest.json` - Added contextMenus permission, version bump to 1.7.0
- `background/background.js` - Context menu system, migration infrastructure, recent widths tracking
- `popup/popup.html` - Custom presets section, recently used section, edit modal
- `popup/popup.js` - Preset CRUD, drag-and-drop, favorites, recent widths
- `popup/popup.css` - Custom preset styles, drag states, modal, high contrast support
- `content/content.js` - DEFAULT_WIDTH changed to 70%
- `options/options.html` - Version update, 70% default reference

**Key Changes:**
- Default width changed from 60% to 70% across all files
- New storage keys: customPresets, hiddenBuiltInPresets, recentWidths, migrationVersion
- Context menu dynamically rebuilds when presets change
- Keyboard accessibility: Alt+Arrow keys for reordering presets

---

## v1.8.0 - Enhanced Styling

**Theme:** Expand beyond width to offer comprehensive chat styling options.

**Status:** COMPLETE (Released 2026-01-08)

### Features

- [x] **Typography Controls**
  - Font size adjustment (80% - 120% of default)
  - Line height/spacing control (compact, normal, relaxed)
  - Message padding adjustment (none, small, medium, large)

- [x] **Display Modes**
  - Compact mode (reduced spacing, smaller UI)
  - Comfortable mode (default)
  - Spacious mode (increased spacing)
  - Custom mode (user-defined values)

- [x] **Code Block Enhancements**
  - Adjustable code block max-height (200px, 400px, 600px, none)
  - Optional code block word wrap toggle
  - Expand/collapse all code blocks button

- [x] **Visual Tweaks**
  - Hide/show timestamps toggle
  - Hide/show avatars toggle
  - Message bubble style options (rounded, square, minimal)

### Technical Tasks

- [x] Extend CSS injection to handle new style properties
- [x] Create "Advanced" section in popup UI with collapsible panels
- [x] Implement display mode presets with coordinated typography
- [x] Add code block mutation observer for enhancements
- [x] Migration system for v1.7.0 users (preserves existing settings)

### Implementation Details

**Files Updated:**
- `manifest.json` - Version bump to 1.8.0
- `background/background.js` - Migration v2, grey badge color (#6B7280), enhanced styling storage keys
- `content/content.js` - Enhanced CSS injection, typography/display/code block/visual styling functions
- `content/content.css` - Transitions for enhanced styling properties
- `popup/popup.html` - Advanced Styling section with collapsible panels, all new controls
- `popup/popup.js` - Enhanced settings state, event listeners, UI synchronization
- `popup/popup.css` - Advanced toggle, collapsible sections, toggle switches, option buttons
- `options/options.html` - Version update, enhanced styling documentation

**Key Changes:**
- Default width changed from 70% to 85% across all files
- Badge color changed from terracotta (#D97757) to neutral grey (#6B7280)
- New storage keys: fontSizePercent, lineHeight, messagePadding, displayMode, codeBlockMaxHeight, codeBlockWordWrap, codeBlocksCollapsed, showTimestamps, showAvatars, messageBubbleStyle
- Migration version incremented to 2
- Dynamic CSS generation based on enhanced settings

### Storage Schema

```javascript
{
  // Width settings
  chatWidthPercent: 85,

  // Enhanced styling (v1.8.0)
  fontSizePercent: 100,        // 80-120
  lineHeight: 'normal',        // 'compact', 'normal', 'relaxed'
  messagePadding: 'medium',    // 'none', 'small', 'medium', 'large'
  displayMode: 'comfortable',  // 'compact', 'comfortable', 'spacious', 'custom'
  codeBlockMaxHeight: 400,     // 200, 400, 600, 0 (none)
  codeBlockWordWrap: false,
  codeBlocksCollapsed: false,
  showTimestamps: true,
  showAvatars: true,
  messageBubbleStyle: 'rounded'  // 'rounded', 'square', 'minimal'
}
```

### Testing Checklist

- [x] All typography changes render correctly
- [x] Display modes don't break Claude's layout
- [x] Code blocks remain functional with all options
- [x] Performance impact is minimal
- [x] Migration from v1.7.0 preserves all existing settings

---

## v1.9.0 - Sync & Profiles

**Theme:** Enable cross-device synchronization and support multiple configuration profiles.

**Status:** COMPLETE (Released 2026-01-08)

### Features

- [x] **Browser Sync**
  - Option to sync settings via `browser.storage.sync`
  - Sync toggle in Options page (local-only vs synced)
  - Automatic fallback to local storage when sync unavailable
  - Sync status indicator with storage usage display
  - 100KB sync quota with 90KB safe threshold

- [x] **Profiles**
  - Create up to 8 named profiles (e.g., "Work", "Personal", "Reading")
  - Quick profile switcher dropdown in popup header
  - Profile-specific settings (width, theme, custom presets, all enhanced styling)
  - Profile management in Options page (create, edit, duplicate, delete)
  - Toast notifications for profile operations

- [x] **Backup & Restore**
  - Export all settings to JSON file with versioned format
  - Import settings from JSON file with validation and sanitization
  - Reset to factory defaults with confirmation dialog
  - Export includes all profiles, sync settings, and auto-profile rules

- [x] **Auto-Profile (Optional)**
  - URL pattern matching for automatic profile switching
  - Wildcard support in patterns (e.g., `*://claude.ai/chat/*`)
  - Auto-profile rules stored per-profile

### Technical Tasks

- [x] Implement `browser.storage.sync` with fallback to local
- [x] Design profile data structure with full settings encapsulation
- [x] Build import/export functionality with validation
- [x] Add comprehensive Options page for sync and profile management
- [x] Handle storage quota limits (100KB sync, 90KB safe threshold)
- [x] Create `lib/profiles.js` module with profile management utilities
- [x] Implement migration v3 for profile system initialization
- [x] Add 75 new tests for profile management (281 total)

### Implementation Details

**New Files Created:**
- `lib/profiles.js` - Profile management utilities (create, update, duplicate, validate, sanitize, import/export)

**Files Updated:**
- `manifest.json` - Version bump to 1.9.0, added `storage` permission for sync
- `lib/constants.js` - Profile constants (MAX_PROFILES, PROFILE_STORAGE_KEYS, PROFILE_DEFAULTS, SYNC_QUOTA_BYTES)
- `background/background.js` - Migration v3, sync storage handling, profile message handlers
- `popup/popup.html` - Profile switcher dropdown, sync indicator, manage profiles button
- `popup/popup.js` - Profile switching logic, sync status display
- `popup/popup.css` - Profile switcher styles, sync indicator styles
- `options/options.html` - Sync & Profiles section, import/export UI, factory reset
- `options/options.js` - Import/export logic, profile management, sync toggle
- `options/options.css` - New section styles, toast notifications
- `content/content.js` - Profile switch message handling
- `tests/setup.js` - Profile mock constants for testing
- `tests/profiles.test.js` - 75 comprehensive profile tests

**Key Changes:**
- New storage keys: `syncEnabled`, `activeProfileId`, `profiles`, `autoProfileRules`
- Migration version incremented to 3
- Profile data structure encapsulates all settings (width, theme, presets, enhanced styling)
- Export format includes `exportVersion: 1` for future compatibility
- Validation separates rejection (invalid data) from sanitization (correctable data)

### Storage Schema

```javascript
{
  syncEnabled: false,  // opt-in by default
  activeProfileId: 'default',
  profiles: {
    'default': {
      name: 'Default',
      chatWidthPercent: 85,
      theme: 'system',
      customPresets: [],
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
    'work': {
      name: 'Work',
      chatWidthPercent: 100,
      theme: 'light',
      // ... all profile settings
    }
  },
  autoProfileRules: [
    { pattern: '*://claude.ai/chat/*', profileId: 'work' }
  ]
}
```

### Testing Checklist

- [x] Sync works across Firefox instances (with fallback)
- [x] Profile switching is instantaneous
- [x] Import/export produces valid JSON
- [x] Storage quota limits handled gracefully (90KB threshold)
- [x] Offline functionality preserved (local fallback)
- [x] All 281 tests pass including 75 new profile tests
- [x] Migration from v1.8.x preserves existing settings in "Default" profile

---

## v2.0.0 - Multi-Browser & Polish

**Theme:** Major release with Chrome/Edge support and comprehensive UI/UX overhaul.

### Features

- [ ] **Multi-Browser Support**
  - Chrome Web Store release (Manifest V3)
  - Microsoft Edge Add-ons release
  - Unified codebase with browser abstraction layer
  - Browser-specific optimizations

- [ ] **UI Overhaul**
  - Redesigned popup with modern aesthetics
  - Options page for advanced settings
  - Onboarding flow for new users
  - Visual changelog/what's new on update

- [ ] **Performance Optimizations**
  - Lazy loading of advanced features
  - Reduced memory footprint
  - Faster style injection
  - Optimized MutationObserver usage

- [ ] **Developer Experience**
  - Automated build pipeline (webpack/rollup)
  - Cross-browser testing setup
  - TypeScript migration (optional)
  - Comprehensive JSDoc documentation

- [ ] **Quality Assurance**
  - Unit tests for core logic
  - E2E tests with Playwright/Puppeteer
  - Automated accessibility testing
  - Performance benchmarks

### Technical Tasks

- Create browser abstraction layer (`browser` vs `chrome` APIs)
- Convert Manifest V2 to V3 for Chrome
  - Replace background scripts with service workers
  - Update CSP for Manifest V3 requirements
  - Handle `scripting` API changes
- Set up build tooling for multi-browser output
- Redesign popup UI components
- Write comprehensive test suite
- Create CI/CD pipeline for releases

### Manifest V3 Considerations

```javascript
// Chrome Manifest V3 changes needed:
{
  "manifest_version": 3,
  "action": { /* replaces browser_action */ },
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": ["*://claude.ai/*"],
  "permissions": ["storage", "activeTab", "scripting"]
}
```

### Browser Abstraction Example

```javascript
// lib/browser-polyfill.js
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export const storage = {
  get: (keys) => browserAPI.storage.local.get(keys),
  set: (items) => browserAPI.storage.local.set(items)
};

export const tabs = {
  query: (options) => browserAPI.tabs.query(options),
  sendMessage: (tabId, message) => browserAPI.tabs.sendMessage(tabId, message)
};
```

### Testing Checklist

- [ ] Firefox (Manifest V2) continues working
- [ ] Chrome (Manifest V3) full functionality
- [ ] Edge (Manifest V3) full functionality
- [ ] All existing features work on all browsers
- [ ] Performance is equal or better than v1.x
- [ ] No regressions from v1.9.0

---

## Future Considerations (Post v2.0.0)

Ideas for v2.x and beyond:

- **Safari Support** - WebExtensions API for Safari
- **Mobile Firefox** - Android Firefox support
- **Claude API Integration** - If Claude offers extension APIs
- **Theme Marketplace** - Share custom themes with other users
- **AI-Powered Suggestions** - Recommend optimal width based on content type
- **Multi-Site Support** - Extend to other AI chat interfaces (ChatGPT, etc.)
- **Internationalization** - Multi-language support for popup UI

---

## Contributing

Contributions are welcome for any planned feature. Before starting work:

1. Check if an issue exists for the feature
2. Comment on the issue to claim it
3. Follow the existing code style
4. Include tests where applicable
5. Update documentation

---

## Release Process

For each version:

1. Complete all features and testing
2. Update version in all files (manifest, HTML, JS, CSS)
3. Update README.md changelog
4. Update CLAUDE.md if architecture changes
5. Build and test XPI package
6. Create GitHub release with:
   - Comprehensive release notes
   - XPI artifact
   - Screenshots if UI changed
7. Submit to Mozilla Add-ons (and Chrome Web Store for v2.0.0+)

---

## Questions & Decisions Needed

- [x] **v1.7.0**: Maximum number of custom presets? **Answer: 4 custom + 4 built-in = 8 total**
- [x] **v1.8.0**: Should typography controls affect input area too? **Answer: No, only message content**
- [x] **v1.9.0**: Should sync be opt-in or opt-out by default? **Answer: Opt-in (syncEnabled: false by default)**
- [ ] **v2.0.0**: TypeScript migration - worth the effort?
- [ ] **v2.0.0**: Separate repos for Firefox/Chrome or monorepo?

---

*This roadmap is subject to change based on user feedback, Claude.ai UI changes, and browser API updates.*
