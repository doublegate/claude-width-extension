# Claude Chat Width Customizer

A Firefox extension that allows you to customize the width of the text input/output boxes in the main chat window on [claude.ai](https://claude.ai).

![Extension Preview](icons/icon-96.png)

## Features

- **Adjustable Width**: Set chat width from 40% to 100% of the viewport
- **Quick Presets**: One-click buttons for Narrow (50%), Medium (70%), Wide (85%), and Full (100%) widths
- **Keyboard Shortcuts**: Global shortcuts for power users (Alt+Shift+W/C/D), popup shortcuts (1-4, R, Esc)
- **Full Accessibility**: ARIA labels, focus management, screen reader announcements, reduced motion support
- **Real-time Preview**: See changes instantly as you adjust the slider
- **Theme Support**: Light, Dark, and System theme modes for the extension popup
- **Toolbar Badge**: Current width percentage displayed in the browser toolbar icon
- **Persistent Settings**: Your preferences (width and theme) are saved and applied to all Claude sessions
- **Main Window Only**: Modifies only the main chat area, leaving the sidebar untouched
- **SPA Compatible**: Works seamlessly with Claude's single-page application navigation
- **Security Hardened**: Content Security Policy (CSP) enforced, no unsafe DOM operations
- **Mozilla Add-ons Compliant**: Includes required `data_collection_permissions` declaration

## Installation

### Temporary Installation (Development/Testing)

1. Open Firefox and navigate to `about:debugging`
2. Click on **"This Firefox"** in the left sidebar
3. Click **"Load Temporary Add-on..."**
4. Navigate to the extension folder and select `manifest.json`
5. The extension will be loaded and active until you restart Firefox

### Permanent Installation

1. Package the extension as a `.xpi` file (see Building section)
2. Navigate to `about:addons` in Firefox
3. Click the gear icon ⚙️ and select **"Install Add-on From File..."**
4. Select the `.xpi` file

### Building the XPI Package

```bash
# Navigate to the extension directory
cd claude-width-extension

# Create the XPI file (ZIP with .xpi extension)
zip -r build/claude-width-customizer-v1.6.0.xpi . -x "*.git*" -x "build/*" -x "*.DS_Store" -x "CLAUDE.md" -x ".claude/*" -x "docs/*"
```

## Usage

1. Navigate to [claude.ai](https://claude.ai)
2. Click the extension icon in the Firefox toolbar
3. Use the slider or preset buttons to select your desired width
4. Changes apply immediately to all open Claude tabs

### Controls

| Control | Description |
|---------|-------------|
| **Theme Toggle** | Switch between Light, Dark, or System theme |
| **Slider** | Drag to set width between 40-100% |
| **Narrow** | Sets width to 50% |
| **Medium** | Sets width to 70% |
| **Wide** | Sets width to 85% |
| **Full** | Sets width to 100% |
| **Reset** | Returns to default 60% width |
| **Apply** | Manually saves and applies current setting |

### Keyboard Shortcuts

**Global Shortcuts** (work anywhere when browser is focused):

| Shortcut | Action |
|----------|--------|
| `Alt+Shift+W` | Open extension popup |
| `Alt+Shift+C` | Cycle through presets (50% -> 70% -> 85% -> 100% -> 50%...) |
| `Alt+Shift+D` | Toggle between current width and default (60%) |

**Popup Shortcuts** (when popup is open):

| Shortcut | Action |
|----------|--------|
| `1` | Narrow preset (50%) |
| `2` | Medium preset (70%) |
| `3` | Wide preset (85%) |
| `4` | Full width (100%) |
| `R` | Reset to default |
| `Escape` | Close popup |
| `Tab` | Navigate between controls |

Note: Global shortcuts can be customized via `about:addons` > gear icon > "Manage Extension Shortcuts"

## File Structure

```
claude-width-extension/
├── manifest.json           # Extension manifest (Manifest V2)
├── README.md               # This file
├── icons/
│   ├── icon.svg            # Source icon
│   ├── icon-48.png         # Toolbar icon (48px)
│   ├── icon-96.png         # High-DPI toolbar icon (96px)
│   └── icon-256.png        # Mozilla Add-ons listing icon (256px)
├── background/
│   └── background.js       # Background script for keyboard commands
├── content/
│   ├── content.js          # Content script injected into claude.ai
│   └── content.css         # Base styles and transitions
├── options/
│   ├── options.html        # Options/settings page
│   ├── options.css         # Options page styling
│   └── options.js          # Options page logic
├── popup/
│   ├── popup.html          # Popup interface HTML
│   ├── popup.css           # Popup styling
│   └── popup.js            # Popup interaction logic
└── docs/
    └── ROADMAP.md          # Development roadmap
```

## Technical Details

### Permissions

- `storage`: Persists user width and theme preferences
- `activeTab`: Detects when user is on claude.ai
- `tabs`: Required for updating badge when switching tabs

### How It Works

1. **Content Script**: Injected into all claude.ai pages, the content script generates and injects CSS rules that override Claude's default max-width constraints on chat containers.

2. **Popup Interface**: Provides a slider-based UI for width selection. Changes are saved to `browser.storage.local` and immediately communicated to all open Claude tabs.

3. **CSS Targeting**: Uses multiple CSS selectors to target conversation containers, message bubbles, and the input composer. The `!important` flag is used where necessary to override React-generated inline styles.

4. **MutationObserver**: Watches for DOM changes to ensure styles persist through SPA navigation events.

### Browser Compatibility

- **Firefox**: 109.0+ (tested)
- **Firefox ESR**: Should work with recent ESR versions
- **Chrome/Edge**: Would require minor manifest changes (Manifest V3)

## Troubleshooting

### Extension Not Working

1. Ensure you're on `https://claude.ai/*`
2. Try refreshing the page
3. Check that the extension is enabled in `about:addons`
4. Look for errors in the Browser Console (Ctrl+Shift+J)

### Width Not Applying

Claude.ai uses highly specific CSS selectors that may change. If the extension stops working after a Claude UI update:

1. Open Developer Tools (F12)
2. Inspect the chat container elements
3. Note the new class names
4. Update selectors in `content/content.js`

### Sidebar Affected

The extension specifically excludes sidebar elements using CSS selectors like `[class*="Sidebar"]`, `nav`, and `aside`. If the sidebar width changes, please report the issue.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Submit a pull request

## License

MIT License - feel free to modify and distribute.

## Author

DoubleGate - [GitHub](https://github.com/doublegate)

## Changelog

### v1.6.0 (Keyboard & Accessibility)
- **New**: Global keyboard shortcuts (Alt+Shift+W/C/D) for popup, preset cycling, and toggle
- **New**: Popup keyboard shortcuts (1-4 for presets, R for reset, Escape to close)
- **New**: Full ARIA accessibility - labels, focus trap, screen reader announcements
- **New**: Toolbar badge showing current width percentage
- **New**: Non-default indicator in status bar
- **New**: Options page with keyboard shortcut documentation
- **New**: Background script for handling global commands
- **Accessibility**: Reduced motion support (respects `prefers-reduced-motion`)
- **Accessibility**: High contrast mode support (Windows `forced-colors`)
- **Accessibility**: Focus management and keyboard navigation improvements
- **UI**: Shortcut hints displayed on preset buttons
- All keyboard shortcuts are customizable via Firefox's extension shortcut manager

### v1.5.1 (Mozilla Add-ons Compliance)
- **Compliance**: Added `data_collection_permissions` property to manifest for Mozilla Add-on Developer Hub submission
- Extension declares `required: ["none"]` - no user data is collected or transmitted
- No functional changes from v1.5.0

### v1.5.0 (Theme Support & Security)
- **New**: Light/Dark/System theme toggle for extension popup
- **New**: Dark mode color palette with warm tones matching Claude's aesthetic
- **New**: System theme respects OS `prefers-color-scheme` setting
- **Security**: Added Content Security Policy (CSP) to manifest
- **Security**: Replaced `innerHTML` with safe DOM manipulation APIs
- **UI**: Updated popup title to "Claude.AI Chat Width"
- Theme preference persists across browser sessions via `browser.storage.local`

### v1.4.0 (Public Release)
- Updated author and repository information
- Prepared for public GitHub release
- No functional changes from v1.3.0

### v1.3.0 (Fixed Width Application)
- **Fixed**: Slider now properly changes width dynamically
- Removed `isInsideMain()` check (Claude doesn't use `<main>` tag consistently)
- Added `clearAllStyles()` function to properly reset before applying new width
- Track styled elements in a Set for reliable cleanup
- Enhanced debug logging to show element count
- Force clear and reapply when width changes via storage or message

### v1.2.0 (JavaScript-based Targeting)
- Complete rewrite of styling approach
- Uses JavaScript to find and verify elements instead of CSS selectors
- Explicitly checks each element is NOT inside sidebar before applying styles
- Uses inline styles for maximum specificity

### v1.1.0 (Sidebar Fix Attempt)
- Attempted CSS-based sidebar protection
- Added `revert` keyword for sidebar elements

### v1.0.0 (Initial Release)
- Slider-based width control (40-100%)
- Quick preset buttons
- Real-time preview
- Persistent storage
- SPA navigation support
