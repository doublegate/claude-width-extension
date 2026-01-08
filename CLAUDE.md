# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefox extension (Manifest V2) that customizes the chat width on claude.ai. Allows users to adjust the main chat area from 40-100% width via a popup UI, without affecting the sidebar. Version 1.6.0 adds keyboard shortcuts and full accessibility support.

## Build & Development

```bash
# Build XPI package (from project root)
zip -r build/claude-width-customizer-v1.6.0.xpi . -x "*.git*" -x "build/*" -x "*.DS_Store" -x "CLAUDE.md" -x ".claude/*" -x "docs/*"

# Development testing (no build step required)
# 1. Open Firefox → about:debugging → This Firefox
# 2. Click "Load Temporary Add-on..." → select manifest.json
# 3. Extension reloads on manifest.json reload
```

No npm/node dependencies. Pure vanilla JavaScript.

## Architecture

### Communication Flow (v1.6.0)

```
                            browser.commands API
                                    │
                                    ▼
                            background.js ─────────────────┐
                                    │                      │
                                    │ tabs.sendMessage()   │ browserAction.setBadge()
                                    ▼                      ▼
popup.js ──storage.local.set()──> browser.storage      Badge/Tooltip
    │                                   │
    │                                   ├── onChanged listener
    │                                   ▼
    └──tabs.sendMessage()──────> content.js ──inline styles──> DOM
```

1. **Background Script** (`background/background.js`): Handles global keyboard shortcuts (Alt+Shift+W/C/D), manages toolbar badge, processes commands
2. **Popup** (`popup/popup.js`): User changes width via slider/presets, local keyboard shortcuts (1-4, R, Esc)
3. **Storage**: Preference saved to `browser.storage.local` with key `chatWidthPercent`
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

| Constant | Value | Location |
|----------|-------|----------|
| `DEFAULT_WIDTH_PERCENT` | 60 | content.js, background.js |
| `MIN_WIDTH_PERCENT` | 40 | content.js |
| `MAX_WIDTH_PERCENT` | 100 | content.js |
| `PRESET_CYCLE` | `[50, 70, 85, 100]` | content.js, background.js |
| `STORAGE_KEY` | `chatWidthPercent` | all files |
| `LAST_WIDTH_KEY` | `lastNonDefaultWidth` | content.js |
| `THEME_STORAGE_KEY` | `theme` | popup.js |
| `DEFAULT_THEME` | `system` | popup.js |
| `VALID_THEMES` | `['light', 'dark', 'system']` | popup.js |
| `BADGE_COLOR` | `#D97757` | background.js |

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
| R | Reset to default (60%) |
| Escape | Close popup |
| Tab | Focus trap navigation |

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

## File Structure

```
claude-width-extension/
├── manifest.json              # Extension manifest (Manifest V2, v1.6.0)
├── README.md                  # User documentation
├── CONTRIBUTING.md            # Contribution guidelines
├── LICENSE                    # MIT license
├── .gitignore                 # Git exclusions
├── background/
│   └── background.js          # Global keyboard shortcuts, badge management
├── content/
│   ├── content.js             # Main content script (DOM manipulation)
│   └── content.css            # Transition styles, reduced motion
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Popup styling (themes, a11y)
│   └── popup.js               # Popup logic (keyboard, focus trap)
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
| v1.6.0 | 2026-01-07 | Keyboard shortcuts, full accessibility, badge, options page |
| v1.5.1 | 2026-01-06 | Mozilla Add-ons `data_collection_permissions` compliance |
| v1.5.0 | 2026-01-06 | Light/Dark/System themes, CSP, safe DOM manipulation |
| v1.4.0 | 2026-01-05 | Public release preparation |
| v1.3.0 | 2026-01-05 | Fixed dynamic width application |
| v1.2.0 | 2026-01-05 | JavaScript-based targeting rewrite |
| v1.1.0 | 2026-01-05 | Sidebar fix attempt |
| v1.0.0 | 2026-01-05 | Initial release |
