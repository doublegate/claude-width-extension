# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.1] - Technical Debt Remediation

### Added
- ESLint v9.x flat config (`eslint.config.js`) for automated code quality checks
- Pre-commit hooks with husky and lint-staged for quality gates
- JSDoc type definitions for Profile, CustomPreset, EnhancedSettings, and other data structures
- Enhanced `ClaudeWidthLogger` with configurable log levels and DEBUG mode

### Changed
- Vitest coverage configuration documented (IIFE pattern limitation explained)

### Fixed
- 5 ESLint errors (regex escapes, case block lexical declarations)

### Technical
- Added `@eslint/js` dependency for flat config support
- Fresh npm dependencies (vitest 4.x, esbuild 0.27.x)

### Documentation
- Updated CONTRIBUTING.md with test command documentation

### Tests
- All 281 tests continue to pass

## [1.9.0] - Sync & Profiles

### Added
- Configuration profiles - create up to 8 named profiles (Work, Personal, Reading, etc.)
- Profile switcher in popup header for quick profile switching
- Profile management in Options page - create, edit, duplicate, delete profiles
- Browser sync support with Firefox Sync for cross-browser profile synchronization
- Sync toggle with status indicator showing sync state and storage usage
- Import/Export settings to JSON file for backup and transfer
- Reset to Factory Defaults option in Options page
- Profile-specific settings - each profile stores width, theme, presets, and all styling options
- Toast notifications for user feedback on profile operations
- `lib/profiles.js` module with comprehensive profile management utilities

### Technical
- Migration version 3 for profile system initialization
- Backward compatible - existing settings migrate to "Default" profile
- Storage schema: `profiles`, `activeProfileId`, `syncEnabled`, `autoProfileRules`
- 100KB sync storage limit with 90KB safe threshold
- Profile validation and sanitization for import safety

### Tests
- Added 75 new tests for profile management (281 total tests)

## [1.8.4] - Toggle Control Fix

### Fixed
- Word Wrap toggle in Code Blocks section now responds to clicks
- Show Timestamps toggle in Visual Tweaks section now works correctly
- Show Avatars toggle in Visual Tweaks section now works correctly
- All toggle switch controls now have proper clickable area (full switch, not just handle)

### Technical
- Toggle input elements now use `position: absolute; width: 100%; height: 100%` for full coverage
- Added `z-index: 1` to ensure toggle inputs are above decorative slider elements
- Removed `width: 0; height: 0` that was preventing click events from registering

### UI/UX
- Toggle switches now respond to clicks anywhere on the switch, not just the small slider handle

## [1.8.3] - Advanced Styling Fix

### Fixed
- Word Wrap toggle now correctly applies/removes word wrapping from code blocks
- Expand/Collapse All button properly collapses code blocks with gradient overlay
- Individual expand buttons on collapsed code blocks now function correctly
- Timestamps toggle now properly shows/hides message timestamps
- Avatars toggle now properly shows/hides user and Claude avatars
- Bubble Style options (Rounded/Square/Minimal) now apply correctly

### Technical
- Replaced CSS custom properties with data attributes for visibility toggles
- Added DATA_ATTRS pattern (`data-claude-hide-*`, `data-claude-bubble-style`, `data-claude-code-collapsed`)
- When showing elements, data attribute is removed so original styles naturally apply
- When hiding elements, data attribute is set and CSS applies `display: none`

## [1.8.2] - Technical Debt Remediation

### Changed
- Replaced inline style manipulation with CSS custom properties for O(1) updates
- Centralized popup state management into consolidated `state` object
- Eliminated duplicate constant definitions across popup.js and constants.js

### Documentation
- Added comprehensive JSDoc documentation for all CSS selector arrays
- Documented selector design philosophy and maintenance guidelines

### Tests
- Comprehensive test suite with 206 tests achieving full code coverage
- Unit tests for constants, popup, content script, and background modules
- Integration tests for cross-module interactions

### Technical
- Removed dead code (unused enhancedDebounceTimer variable)
- Added helper functions (processNonSidebarElements, safeMatches, safeHasDescendant)
- Added cached selector strings for performance optimization

## [1.8.1] - Enhanced Styling Fix

### Fixed
- Real-time enhanced styling updates now work correctly
- Settings changes (typography, display mode, code blocks, etc.) apply immediately

### Technical
- Added applyEnhancedInlineStyles() call to handleEnhancedSettingsChange()
- Added 60+ comprehensive DOM selectors for claude.ai's Tailwind CSS structure
- Added clearEnhancedInlineStyles() for clean style re-application
- Added applyEnhancedInlineStylesDebounced() for MutationObserver efficiency
- Enhanced MutationObserver to detect enhanced-styling-relevant elements

## [1.8.0] - Enhanced Styling

### Added
- Advanced Styling section with collapsible panels
- Typography controls - font size (80-120%), line height, message padding
- Display modes - Compact, Comfortable, Spacious, or Custom
- Code block enhancements - max height, word wrap, collapse all
- Visual tweaks - hide/show timestamps and avatars, bubble styles (rounded, square, minimal)
- Reset All Styles button to restore all styling to defaults

### Changed
- Default width changed from 70% to 85%
- Toolbar badge color changed from terracotta to neutral grey

### Technical
- Migration version 2 for enhanced styling settings
- New storage keys for all enhanced styling options

### Refactored
- Centralized shared constants in `lib/constants.js` module
- All scripts now import from `window.ClaudeWidthConstants` global
- Extracted magic numbers to named `TIMING` constants
- Eliminated ~60 lines of duplicated constant definitions

## [1.7.0] - Custom Presets

### Added
- Create up to 4 custom presets with custom names and widths
- Drag-and-drop reordering of custom presets (or use Alt+Arrow keys)
- Favorites marking - star your most-used presets
- Right-click context menu on claude.ai with all presets
- Recently used widths section (last 3 non-preset widths)
- Unsaved changes indicator - visual feedback when slider differs from saved value

### Changed
- Default width changed from 60% to 70%

### Technical
- Added `contextMenus` permission for right-click menu
- Migration system preserves existing user settings on upgrade
- New storage keys: `customPresets`, `recentWidths`, `migrationVersion`

## [1.6.0] - Keyboard & Accessibility

### Added
- Global keyboard shortcuts (Alt+Shift+W/C/D) for popup, preset cycling, and toggle
- Popup keyboard shortcuts (1-4 for presets, R for reset, Escape to close)
- Full ARIA accessibility - labels, focus trap, screen reader announcements
- Toolbar badge showing current width percentage
- Non-default indicator in status bar
- Options page with keyboard shortcut documentation
- Background script for handling global commands

### Accessibility
- Reduced motion support (respects `prefers-reduced-motion`)
- High contrast mode support (Windows `forced-colors`)
- Focus management and keyboard navigation improvements

### UI
- Shortcut hints displayed on preset buttons
- All keyboard shortcuts are customizable via Firefox's extension shortcut manager

## [1.5.1] - Mozilla Add-ons Compliance

### Added
- `data_collection_permissions` property to manifest for Mozilla Add-on Developer Hub submission
- Extension declares `required: ["none"]` - no user data is collected or transmitted

### Note
- No functional changes from v1.5.0

## [1.5.0] - Theme Support & Security

### Added
- Light/Dark/System theme toggle for extension popup
- Dark mode color palette with warm tones matching Claude's aesthetic
- System theme respects OS `prefers-color-scheme` setting
- Content Security Policy (CSP) to manifest

### Security
- Replaced `innerHTML` with safe DOM manipulation APIs

### UI
- Updated popup title to "Claude.AI Chat Width"
- Theme preference persists across browser sessions via `browser.storage.local`

## [1.4.0] - Public Release

### Changed
- Updated author and repository information
- Prepared for public GitHub release

### Note
- No functional changes from v1.3.0

## [1.3.0] - Fixed Width Application

### Fixed
- Slider now properly changes width dynamically

### Changed
- Removed `isInsideMain()` check (Claude doesn't use `<main>` tag consistently)
- Added `clearAllStyles()` function to properly reset before applying new width
- Track styled elements in a Set for reliable cleanup
- Enhanced debug logging to show element count
- Force clear and reapply when width changes via storage or message

## [1.2.0] - JavaScript-based Targeting

### Changed
- Complete rewrite of styling approach
- Uses JavaScript to find and verify elements instead of CSS selectors
- Explicitly checks each element is NOT inside sidebar before applying styles
- Uses inline styles for maximum specificity

## [1.1.0] - Sidebar Fix Attempt

### Changed
- Attempted CSS-based sidebar protection
- Added `revert` keyword for sidebar elements

## [1.0.0] - Initial Release

### Added
- Slider-based width control (40-100%)
- Quick preset buttons
- Real-time preview
- Persistent storage
- SPA navigation support
