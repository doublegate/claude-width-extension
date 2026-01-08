# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefox extension (Manifest V2) that customizes the chat width on claude.ai. Allows users to adjust the main chat area from 40-100% width via a popup UI, without affecting the sidebar. Version 1.8.1 fixes enhanced styling with real-time updates and comprehensive DOM targeting for typography controls (font size, line height, padding), display modes (compact, comfortable, spacious, custom), code block enhancements (max-height, word wrap, collapse all), and visual tweaks (timestamps, avatars, bubble styles).

## Build & Development

```bash
# Build XPI package (from project root)
zip -r build/claude-width-customizer-v1.8.1.xpi . -x "*.git*" -x "build/*" -x "*.DS_Store" -x "CLAUDE.md" -x ".claude/*" -x "docs/*" -x "images/*"

# Development testing (no build step required)
# 1. Open Firefox → about:debugging → This Firefox
# 2. Click "Load Temporary Add-on..." → select manifest.json
# 3. Extension reloads on manifest.json reload
```

No npm/node dependencies. Pure vanilla JavaScript.

## Architecture

### Communication Flow (v1.8.0)

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
3. **Storage**: Preferences saved to `browser.storage.local` with keys: `chatWidthPercent`, `customPresets`, `hiddenBuiltInPresets`, `recentWidths`, `migrationVersion`
4. **Content Script** (`content/content.js`): Receives updates via:
   - `browser.storage.onChanged` listener (triggers on storage change)
   - `browser.runtime.onMessage` listener (direct messages from popup/background)
   - Handles `cyclePresets` and `toggleDefault` message actions
5. **DOM**: Width applied via inline styles with `!important` to override Claude's React styles
6. **Options Page** (`options/`): Documentation for keyboard shortcuts, link to Firefox shortcut manager

### Key Mechanism: Sidebar Exclusion

The extension must NOT affect sidebar elements. `isInsideSidebar()` walks up the DOM tree checking against `SIDEBAR_INDICATORS` array (nav, aside, `[class*="Sidebar"]`, etc.) before applying any styles.

### DOM Persistence

`MutationObserver` watches for new elements (Claude is a React SPA) and applies styles to newly added chat messages and containers. Uses debouncing (50ms) to batch updates.

### Styling Strategy

- Targets elements by class patterns: `mx-auto`, `Message`, `Composer`, `Thread`, `sticky`
- Uses `data-claude-width-applied` attribute to track styled elements
- Inline styles for maximum specificity over React-generated styles
- CSS file provides only transitions for smooth width changes

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
| `CURRENT_MIGRATION_VERSION` | 2 | Migration version (local to background.js) |

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

## File Structure

```
claude-width-extension/
├── manifest.json              # Extension manifest (Manifest V2, v1.8.0)
├── README.md                  # User documentation
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT license
├── .gitignore                 # Git exclusions
├── lib/
│   └── constants.js           # Shared constants (loaded first by all scripts)
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
│   └── ROADMAP.md             # Development roadmap (v1.7.0+)
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
