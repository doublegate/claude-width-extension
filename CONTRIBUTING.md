# Contributing to Claude Chat Width Customizer

Thank you for your interest in contributing to this project!

## How to Contribute

### Reporting Bugs

1. Check existing issues to see if the bug has already been reported
2. Open a new issue with a clear title and description
3. Include steps to reproduce the bug
4. Include browser console output if relevant (F12 → Console tab)
5. Mention your Firefox version

### Suggesting Features

1. Open an issue describing the feature
2. Explain why it would be useful
3. Consider how it might affect existing functionality

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test thoroughly on claude.ai
5. Commit with clear messages (`git commit -m 'Add feature X'`)
6. Push to your fork (`git push origin feature/my-feature`)
7. Open a Pull Request

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/doublegate/claude-width-extension.git
   cd claude-width-extension
   ```

2. Load in Firefox for testing:
   - Navigate to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on..."
   - Select `manifest.json`

3. Make changes and reload the extension to test

### Code Style

- Use clear, descriptive variable names
- Add comments for complex logic
- Follow existing code formatting
- Include JSDoc comments for functions

### Testing

Before submitting a PR, test:
- [ ] Width slider changes work in real-time
- [ ] Sidebar remains unaffected
- [ ] Settings persist across browser restarts
- [ ] Extension works on new and existing chat sessions
- [ ] No console errors from the extension

## Questions?

Open an issue if you have questions about contributing.
