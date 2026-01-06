# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firefox extension (Manifest V2) that customizes the chat width on claude.ai. Allows users to adjust the main chat area from 40-100% width via a popup UI, without affecting the sidebar.

## Build & Development

```bash
# Build XPI package (from project root)
zip -r build/claude-width-customizer-v1.5.1.xpi . -x "*.git*" -x "build/*" -x "*.DS_Store" -x "CLAUDE.md" -x ".claude/*"

# Development testing (no build step required)
# 1. Open Firefox → about:debugging → This Firefox
# 2. Click "Load Temporary Add-on..." → select manifest.json
# 3. Extension reloads on manifest.json reload
```

No npm/node dependencies. Pure vanilla JavaScript.

## Architecture

### Communication Flow

```
popup.js ──storage.local.set()──> browser.storage
    │                                   │
    │                                   ├── onChanged listener
    │                                   ▼
    └──tabs.sendMessage()──────> content.js ──inline styles──> DOM
```

1. **Popup** (`popup/popup.js`): User changes width via slider/presets
2. **Storage**: Preference saved to `browser.storage.local` with key `chatWidthPercent`
3. **Content Script** (`content/content.js`): Receives updates via:
   - `browser.storage.onChanged` listener (triggers on storage change)
   - `browser.runtime.onMessage` listener (direct messages from popup)
4. **DOM**: Width applied via inline styles with `!important` to override Claude's React styles

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
| `DEFAULT_WIDTH_PERCENT` | 60 | content.js |
| `MIN_WIDTH_PERCENT` | 40 | content.js |
| `MAX_WIDTH_PERCENT` | 100 | content.js |
| `STORAGE_KEY` | `chatWidthPercent` | both files |
| `THEME_STORAGE_KEY` | `theme` | popup.js |
| `DEFAULT_THEME` | `system` | popup.js |
| `VALID_THEMES` | `['light', 'dark', 'system']` | popup.js |

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

## Troubleshooting Claude UI Changes

When Claude updates their UI, selectors may break. Debug process:
1. Open DevTools on claude.ai
2. Inspect chat containers for new class patterns
3. Update selectors in `content/content.js` `applyWidthToChat()` function
4. Check `SIDEBAR_INDICATORS` if sidebar elements are being affected
