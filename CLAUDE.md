# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefox extension (Manifest V2) that customizes the chat width on claude.ai. Allows users to adjust the main chat area from 40-100% width via a popup UI, without affecting the sidebar. Version 1.9.1 adds ESLint v9 flat config, pre-commit hooks, JSDoc type definitions, and enhanced debug logging. Version 1.9.0 added configuration profiles with browser sync support, allowing users to create up to 8 named profiles with distinct settings. Includes enhanced styling for typography controls (font size, line height, padding), display modes (compact, comfortable, spacious, custom), code block enhancements (max-height, word wrap, collapse all), and visual tweaks (timestamps, avatars, bubble styles). Settings can be imported/exported as JSON and synced across browsers via Firefox Sync.

## Build & Development

```bash
# Build XPI package (from project root)
zip -r build/claude-width-customizer-v1.9.1.xpi . -x "*.git*" -x "build/*" -x "*.DS_Store" -x "CLAUDE.md" -x ".claude/*" -x "docs/*" -x "images/*" -x "tests/*" -x "node_modules/*" -x "coverage/*" -x "*.config.js" -x ".husky/*"

# Development testing (no build step required)
# 1. Open Firefox → about:debugging → This Firefox
# 2. Click "Load Temporary Add-on..." → select manifest.json
# 3. Extension reloads on manifest.json reload

# Run tests (requires npm install)
npm test              # Run all 281 tests
npm run test:coverage # Run with coverage report
npm run test:watch    # Run in watch mode
npm run check         # Verify JS syntax
npm run lint          # Run ESLint (v9 flat config)
npm run lint:fix      # Auto-fix ESLint issues
```

Development dependencies (devDependencies only - not required for extension):
- vitest: Test framework
- jsdom: DOM simulation for tests
- @vitest/coverage-v8: Coverage reporting

## Architecture

### Communication Flow (v1.9.0)

```
                            browser.commands API
                                    │
                                    ▼
                            background.js ─────────────────┐
                                    │                      │
                                    │ tabs.sendMessage()   │ browserAction.setBadge()
                                    │                      │ contextMenus API
                                    ▼                      ▼
popup.js ──storage.local.set()──> browser.storage      Badge/Context Menu
    │                                   │
    │                                   ├── onChanged listener
    │                                   ▼
    └──tabs.sendMessage()──────> content.js ──inline styles──> DOM
```

1. **Background Script** (`background/background.js`): Handles global keyboard shortcuts (Alt+Shift+W/C/D), manages toolbar badge, context menu, migration, recent widths
2. **Popup** (`popup/popup.js`): Width slider/presets, custom preset CRUD, drag-and-drop, favorites, local keyboard shortcuts (1-4, R, Esc)
3. **Storage**: Preferences saved to `browser.storage.local` (or `sync` when enabled) with keys: `chatWidthPercent`, `customPresets`, `hiddenBuiltInPresets`, `recentWidths`, `migrationVersion`, `profiles`, `activeProfileId`, `syncEnabled`
4. **Profile System** (`lib/profiles.js`): Manages multiple configuration profiles with CRUD operations, import/export, validation, and sync support
5. **Content Script** (`content/content.js`): Receives updates via:
   - `browser.storage.onChanged` listener (triggers on storage change)
   - `browser.runtime.onMessage` listener (direct messages from popup/background)
   - Handles `cyclePresets`, `toggleDefault`, and `profileChanged` message actions
6. **DOM**: Width applied via inline styles with `!important` to override Claude's React styles
7. **Options Page** (`options/`): Profile management, sync toggle, import/export, keyboard shortcuts documentation

### Key Mechanism: Sidebar Exclusion

The extension must NOT affect sidebar elements. `isInsideSidebar()` walks up the DOM tree checking against `SIDEBAR_INDICATORS` array (nav, aside, `[class*="Sidebar"]`, etc.) before applying any styles.

### DOM Persistence

`MutationObserver` watches for new elements (Claude is a React SPA) and applies styles to newly added chat messages and containers. Uses debouncing (50ms) to batch updates.

### Styling Strategy

- Targets elements by class patterns: `mx-auto`, `Message`, `Composer`, `Thread`, `sticky`
- Uses `data-claude-width-applied` attribute to track styled elements
- Inline styles for maximum specificity over React-generated styles
- CSS file provides only transitions for smooth width changes

### Data Attributes Pattern (v1.8.3)

The visibility toggles (Timestamps, Avatars, Bubble Style) and code block collapse use data attributes on the `<html>` element instead of CSS custom properties. This approach was necessary because CSS variables with `display: block` or `display: inherit` broke elements that originally used `flex`, `inline-block`, or other display values.

**Pattern**: When hiding elements, set a data attribute so CSS applies `display: none`. When showing elements, remove the attribute so no override exists and original styles naturally apply.

```javascript
// DATA_ATTRS object in content.js (lines 92-97)
const DATA_ATTRS = {
    hideTimestamps: 'data-claude-hide-timestamps',
    hideAvatars: 'data-claude-hide-avatars',
    bubbleStyle: 'data-claude-bubble-style',
    codeCollapsed: 'data-claude-code-collapsed'
};
```

**CSS Attribute Selectors** (in generateEnhancedCSS):
- `html[data-claude-hide-timestamps] [selector] { display: none !important; }`
- `html[data-claude-hide-avatars] [selector] { display: none !important; }`
- `html[data-claude-bubble-style="square"] [selector] { border-radius: 0 !important; }`
- `html[data-claude-code-collapsed] pre { max-height: 100px; overflow: hidden; }`

## Key Constants

Shared constants are centralized in `lib/constants.js` and accessed via `window.ClaudeWidthConstants`:

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_WIDTH` | 85 | Default width percentage |
| `MIN_WIDTH` | 40 | Minimum allowed width |
| `MAX_WIDTH` | 100 | Maximum allowed width |
| `PRESET_CYCLE` | `[50, 70, 85, 100]` | Width presets for cycling |
| `STORAGE_KEY` | `chatWidthPercent` | Storage key for width preference |
| `LAST_WIDTH_KEY` | `lastNonDefaultWidth` | Storage key for toggle feature |
| `THEME_STORAGE_KEY` | `theme` | Storage key for theme preference |
| `DEFAULT_THEME` | `system` | Default theme |
| `VALID_THEMES` | `['light', 'dark', 'system']` | Valid theme values |
| `BADGE_COLOR` | `#6B7280` | Badge background color (grey) |
| `MAX_CUSTOM_PRESETS` | 4 | Maximum custom presets allowed |
| `MAX_RECENT_WIDTHS` | 3 | Maximum recent widths tracked |
| `ENHANCED_KEYS` | Object | Storage keys for enhanced styling |
| `ENHANCED_DEFAULTS` | Object | Default values for enhanced styling |
| `DISPLAY_MODE_PRESETS` | Object | Display mode preset configurations |
| `TIMING` | Object | Timing constants (debounce, animation, etc.) |
| `MAX_PROFILES` | 8 | Maximum number of profiles allowed |
| `PROFILE_NAME_MAX_LENGTH` | 30 | Maximum characters for profile names |
| `PROFILE_STORAGE_KEYS` | Object | Storage keys for profile system |
| `PROFILE_DEFAULTS` | Object | Default values for new profiles |
| `EXPORT_VERSION` | 1 | Import/export format version |
| `SYNC_QUOTA_BYTES` | 102400 | Firefox sync storage limit (100KB) |
| `SYNC_SAFE_LIMIT` | 90000 | Safe threshold for sync storage (90KB) |
| `CURRENT_MIGRATION_VERSION` | 3 | Migration version (local to background.js) |

## Keyboard Shortcuts

### Global Shortcuts (manifest.json commands)

| Command | Default Shortcut | Action |
|---------|------------------|--------|
| `_execute_browser_action` | Alt+Shift+W | Open extension popup |
| `cycle-presets` | Alt+Shift+C | Cycle through width presets |
| `toggle-default` | Alt+Shift+D | Toggle between current and default width |

### Popup Shortcuts (popup.js keydown handler)

| Key | Action |
|-----|--------|
| 1 | Narrow preset (50%) |
| 2 | Medium preset (70%) |
| 3 | Wide preset (85%) |
| 4 | Full width (100%) |
| R | Reset to default (85%) |
| Escape | Close popup |
| Tab | Focus trap navigation |
| Alt+Up/Down | Reorder custom presets |

Shortcuts are customizable via `about:addons` > gear icon > "Manage Extension Shortcuts"

## Mozilla Add-ons Compliance

The extension includes `data_collection_permissions` in `manifest.json` under `browser_specific_settings.gecko`:

```json
"data_collection_permissions": {
    "required": ["none"]
}
```

This declares that the extension does not collect or transmit any user data, which is required for submission to addons.mozilla.org (effective November 2025).

## Theme System

The popup supports Light/Dark/System themes via CSS custom properties:

- **Light theme**: Default warm palette (Claude's terracotta #D97757)
- **Dark theme**: `[data-theme="dark"]` selector with darker palette (#E8957A primary)
- **System theme**: Uses `@media (prefers-color-scheme: dark)` within `[data-theme="system"]`

Theme is applied by setting `data-theme` attribute on `<html>` element.

## Accessibility Features (v1.6.0)

### ARIA Support
- All interactive elements have `aria-label` attributes
- Preset buttons use `aria-pressed` for toggle state
- Theme buttons use `role="radio"` and `aria-checked`
- Status bar uses `role="status"` and `aria-live="polite"`
- Screen reader live region (`#srAnnouncements`) for width change announcements

### Focus Management
- Focus trap within popup (Tab cycles through focusable elements)
- Initial focus set to slider when popup opens
- Escape key closes popup

### Media Query Support
- `prefers-reduced-motion: reduce` - Disables all CSS transitions
- `forced-colors: active` - Windows High Contrast mode support

### Screen Reader Announcements
Width changes are announced via the `#srAnnouncements` live region element using a text-clearing technique to ensure re-announcement of repeated values.

## Context Menu (v1.7.0)

Right-click on any claude.ai page to access the width context menu:

- **Built-in Presets**: Narrow (50%), Medium (70%), Wide (85%), Full (100%)
- **Custom Presets**: User-created presets with favorites marked with star
- **Default (85%)**: Reset to default width
- **Recently Used**: Last 3 non-preset widths used

The context menu rebuilds dynamically when:
- Custom presets are added/edited/deleted
- Presets are favorited/unfavorited
- New widths are used via slider

## Enhanced Styling (v1.8.0)

The Advanced Styling section provides fine-grained control over Claude's chat appearance:

### Typography Controls
- **Font Size**: 80-120% slider for message text
- **Line Height**: Compact (1.2), Normal (1.5), Relaxed (1.8)
- **Message Padding**: None, Small, Medium, Large

### Display Modes
- **Compact**: Reduced spacing, smaller UI for more content
- **Comfortable**: Default balanced spacing
- **Spacious**: Increased spacing for readability
- **Custom**: Keep manual typography settings

### Code Block Enhancements
- **Max Height**: 200px, 400px, 600px, or None (unlimited)
- **Word Wrap**: Toggle code block text wrapping
- **Collapse All**: Expand/collapse all code blocks

### Visual Tweaks
- **Timestamps**: Show/hide message timestamps
- **Avatars**: Show/hide user and Claude avatars
- **Bubble Style**: Rounded (default), Square, Minimal

### Storage Keys (Enhanced Styling)
- `fontSizePercent`: 80-120 (default: 100)
- `lineHeight`: 'compact', 'normal', 'relaxed' (default: 'normal')
- `messagePadding`: 'none', 'small', 'medium', 'large' (default: 'medium')
- `displayMode`: 'compact', 'comfortable', 'spacious', 'custom' (default: 'comfortable')
- `codeBlockMaxHeight`: 200, 400, 600, 0 (default: 400)
- `codeBlockWordWrap`: true/false (default: false)
- `codeBlocksCollapsed`: true/false (default: false)
- `showTimestamps`: true/false (default: true)
- `showAvatars`: true/false (default: true)
- `messageBubbleStyle`: 'rounded', 'square', 'minimal' (default: 'rounded')

## Profile System (v1.9.0)

The profile system allows users to maintain multiple configuration profiles with distinct settings:

### Profile Structure
Each profile stores:
- `name`: Profile name (max 30 characters)
- `chatWidthPercent`: Width setting (40-100%)
- `theme`: Theme preference (light/dark/system)
- `customPresets`: Array of custom presets
- All enhanced styling settings (typography, display mode, code blocks, visual tweaks)

### Storage Schema
```javascript
{
    syncEnabled: boolean,        // Whether to use browser.storage.sync
    activeProfileId: string,     // Currently active profile ID
    profiles: {                  // Profile objects keyed by ID
        'default': { ... },
        'profile_xxx_yyy': { ... }
    },
    autoProfileRules: []         // URL pattern to profile ID mappings
}
```

### Profile Management (lib/profiles.js)
The profiles module exposes `window.ClaudeWidthProfiles` with:
- **CRUD**: `createProfile()`, `updateProfile()`, `duplicateProfile()`, `deleteProfile()`
- **Validation**: `validateProfileName()`, `validateProfile()`, `validateImportData()`
- **Sanitization**: `sanitizeProfile()`, `sanitizeEnhancedSettings()`
- **Storage**: `loadProfileData()`, `saveProfileData()`, `getActiveProfile()`, `setActiveProfile()`
- **Import/Export**: `exportSettings()`, `importSettings()`, `resetToDefaults()`
- **Sync**: `setSyncEnabled()`, `getSyncStatus()`
- **URL Matching**: `matchUrlPattern()`, `getAutoProfileForUrl()`, `addAutoProfileRule()`

### Migration (v3)
When upgrading from v1.8.x, the migration:
1. Preserves existing flat settings by creating a "Default" profile
2. Sets `activeProfileId` to 'default'
3. Initializes `syncEnabled` to false
4. Copies current width, theme, presets, and enhanced styling to the default profile

## File Structure

```
claude-width-extension/
├── manifest.json              # Extension manifest (Manifest V2, v1.9.0)
├── README.md                  # User documentation
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT license
├── .gitignore                 # Git exclusions
├── lib/
│   ├── constants.js           # Shared constants (loaded first by all scripts)
│   └── profiles.js            # Profile management utilities (v1.9.0)
├── background/
│   └── background.js          # Keyboard shortcuts, badge, context menu, migration
├── content/
│   ├── content.js             # Main content script (DOM manipulation)
│   └── content.css            # Transition styles, reduced motion
├── popup/
│   ├── popup.html             # Extension popup UI with custom presets
│   ├── popup.css              # Popup styling (themes, drag-drop, modal)
│   └── popup.js               # Popup logic (presets CRUD, drag-drop, favorites)
├── options/
│   ├── options.html           # Keyboard shortcuts documentation
│   ├── options.css            # Options page styling
│   └── options.js             # Options page logic
├── icons/
│   ├── icon.svg               # Source vector icon
│   ├── icon-48.png            # Toolbar icon
│   ├── icon-96.png            # High-DPI toolbar icon
│   ├── icon-256.png           # Mozilla Add-ons listing
│   └── screenshot-*.jpg       # Marketing screenshots
├── docs/
│   ├── ROADMAP.md             # Development roadmap (v1.7.0+)
│   └── MANIFEST-V3-MIGRATION.md # Migration planning document
├── tests/
│   ├── mocks/
│   │   └── browser.js         # Browser API mock for testing
│   ├── constants.test.js      # Unit tests for lib/constants.js
│   ├── profiles.test.js       # Unit tests for lib/profiles.js (v1.9.0)
│   ├── popup.test.js          # Unit tests for popup/popup.js
│   ├── content.test.js        # Unit tests for content/content.js
│   ├── background.test.js     # Unit tests for background/background.js
│   ├── integration.test.js    # Cross-module integration tests
│   └── setup.js               # Vitest setup configuration
├── vitest.config.js           # Vitest configuration
├── package.json               # NPM configuration (devDependencies only)
└── build/
    └── *.xpi                  # Built packages (gitignored)
```

## Troubleshooting Claude UI Changes

When Claude updates their UI, selectors may break. Debug process:
1. Open DevTools on claude.ai
2. Inspect chat containers for new class patterns
3. Update selectors in `content/content.js` `applyWidthToChat()` function
4. Check `SIDEBAR_INDICATORS` if sidebar elements are being affected

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v1.9.0 | 2026-01-08 | Configuration profiles with browser sync, import/export, up to 8 profiles |
| v1.8.4 | 2026-01-08 | Fixed non-clickable toggle switches in Advanced Styling popup controls |
| v1.8.3 | 2026-01-08 | Fixed visibility toggles, bubble styles, code block features using data attributes |
| v1.8.2 | 2026-01-08 | Technical debt remediation, CSS custom properties, test suite (206 tests) |
| v1.8.1 | 2026-01-08 | Fixed real-time enhanced styling updates, comprehensive DOM selectors |
| v1.8.0 | 2026-01-08 | Enhanced styling (typography, display modes, code blocks, visual tweaks), default 85%, grey badge |
| v1.7.0 | 2026-01-08 | Custom presets (CRUD, drag-drop, favorites), context menu, recent widths, default 70% |
| v1.6.0 | 2026-01-07 | Keyboard shortcuts, full accessibility, badge, options page |
| v1.5.1 | 2026-01-06 | Mozilla Add-ons `data_collection_permissions` compliance |
| v1.5.0 | 2026-01-06 | Light/Dark/System themes, CSP, safe DOM manipulation |
| v1.4.0 | 2026-01-05 | Public release preparation |
| v1.3.0 | 2026-01-05 | Fixed dynamic width application |
| v1.2.0 | 2026-01-05 | JavaScript-based targeting rewrite |
| v1.1.0 | 2026-01-05 | Sidebar fix attempt |
| v1.0.0 | 2026-01-05 | Initial release |
