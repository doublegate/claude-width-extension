# Claude Chat Width Customizer - Development Roadmap

**Version Range:** v1.6.0 - v2.0.0
**Last Updated:** 2026-01-07
**Status:** v1.6.0 Complete

---

## Overview

This document outlines the planned features and improvements for each minor release leading up to v2.0.0. Each version focuses on a specific theme to ensure incremental, well-tested improvements.

---

## Version Summary

| Version | Theme | Key Focus | Status |
|---------|-------|-----------|--------|
| v1.6.0 | Keyboard & Accessibility | Keyboard shortcuts, ARIA improvements | **COMPLETE** |
| v1.7.0 | Custom Presets | User-defined presets, preset management | Planned |
| v1.8.0 | Enhanced Styling | Font size, line spacing, compact mode | Planned |
| v1.9.0 | Sync & Profiles | Cross-device sync, multiple profiles | Planned |
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

### Features

- [ ] **Custom Preset Management**
  - "Save Current" button to create new preset from current width
  - Name custom presets (e.g., "Reading Mode", "Coding Review")
  - Edit/rename existing custom presets
  - Delete custom presets
  - Maximum of 8 custom presets (4 built-in + 4 user)

- [ ] **Preset Organization**
  - Drag-and-drop reordering of presets
  - Show/hide built-in presets
  - "Favorites" marking for most-used presets

- [ ] **Quick Access**
  - Right-click context menu on claude.ai with preset list
  - Popup shows recently used widths

### Technical Tasks

- Extend storage schema for custom presets
- Implement preset CRUD operations
- Add context menu via `browser.contextMenus` API
- Design preset management UI in popup
- Migration path for existing users (preserve settings)

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

- [ ] Create, edit, delete presets
- [ ] Presets persist across browser restart
- [ ] Context menu appears on claude.ai only
- [ ] Migration from v1.5.x/v1.6.x works correctly

---

## v1.8.0 - Enhanced Styling

**Theme:** Expand beyond width to offer comprehensive chat styling options.

### Features

- [ ] **Typography Controls**
  - Font size adjustment (80% - 120% of default)
  - Line height/spacing control (compact, normal, relaxed)
  - Message padding adjustment

- [ ] **Display Modes**
  - Compact mode (reduced spacing, smaller UI)
  - Comfortable mode (default)
  - Spacious mode (increased spacing)
  - Custom mode (user-defined values)

- [ ] **Code Block Enhancements**
  - Adjustable code block max-height
  - Optional code block word wrap toggle
  - Expand/collapse all code blocks button

- [ ] **Visual Tweaks**
  - Hide/show timestamps
  - Hide/show avatars
  - Message bubble style options (rounded, square, minimal)

### Technical Tasks

- Extend CSS injection to handle new style properties
- Create "Advanced" section in popup UI
- Implement display mode presets
- Add code block mutation observer for enhancements
- Ensure styles don't conflict with Claude UI updates

### UI Considerations

- Use collapsible sections to keep popup manageable
- "Basic" vs "Advanced" toggle
- Preview changes in real-time
- "Reset All" returns to pure defaults

### Testing Checklist

- [ ] All typography changes render correctly
- [ ] Display modes don't break Claude's layout
- [ ] Code blocks remain functional
- [ ] Performance impact is minimal

---

## v1.9.0 - Sync & Profiles

**Theme:** Enable cross-device synchronization and support multiple configuration profiles.

### Features

- [ ] **Browser Sync**
  - Option to sync settings via `browser.storage.sync`
  - Sync toggle in settings (local-only vs synced)
  - Conflict resolution for simultaneous edits
  - Sync status indicator

- [ ] **Profiles**
  - Create named profiles (e.g., "Work", "Personal", "Mobile")
  - Quick profile switcher in popup
  - Profile-specific settings (width, theme, custom presets)
  - Import/export profiles as JSON

- [ ] **Backup & Restore**
  - Export all settings to JSON file
  - Import settings from JSON file
  - Reset to factory defaults with confirmation

- [ ] **Auto-Profile (Optional)**
  - URL pattern matching for automatic profile switching
  - Time-based profile switching (work hours vs personal)

### Technical Tasks

- Implement `browser.storage.sync` with fallback to local
- Design profile data structure
- Build import/export functionality
- Add options page for sync and profile management
- Handle storage quota limits (sync has 100KB limit)

### Storage Schema

```javascript
{
  syncEnabled: true,
  activeProfileId: 'default',
  profiles: {
    'default': {
      name: 'Default',
      chatWidthPercent: 70,
      theme: 'system',
      customPresets: [...],
      typography: {...}
    },
    'work': {
      name: 'Work',
      chatWidthPercent: 85,
      theme: 'light',
      ...
    }
  },
  autoProfileRules: [
    { pattern: '*://claude.ai/chat/*', profileId: 'work' }
  ]
}
```

### Testing Checklist

- [ ] Sync works across Firefox instances
- [ ] Profile switching is instantaneous
- [ ] Import/export produces valid JSON
- [ ] Storage quota limits handled gracefully
- [ ] Offline functionality preserved

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

- [ ] **v1.7.0**: Maximum number of custom presets?
- [ ] **v1.8.0**: Should typography controls affect input area too?
- [ ] **v1.9.0**: Should sync be opt-in or opt-out by default?
- [ ] **v2.0.0**: TypeScript migration - worth the effort?
- [ ] **v2.0.0**: Separate repos for Firefox/Chrome or monorepo?

---

*This roadmap is subject to change based on user feedback, Claude.ai UI changes, and browser API updates.*
