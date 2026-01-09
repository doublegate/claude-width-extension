/**
 * Browser API Mocks for Testing
 * ==============================
 *
 * Mocks the WebExtension browser API for testing popup.js, content.js,
 * background.js, and options.js in a Node.js/jsdom environment.
 *
 * These mocks simulate the behavior of browser.storage, browser.tabs,
 * browser.runtime, and other APIs used by the extension.
 */

/**
 * In-memory storage for testing.
 * @type {Map<string, *>}
 */
export const storageData = new Map();

/**
 * Storage change listeners.
 * @type {Set<Function>}
 */
export const storageListeners = new Set();

/**
 * Message listeners for runtime.onMessage.
 * @type {Set<Function>}
 */
export const messageListeners = new Set();

/**
 * Command listeners for commands.onCommand.
 * @type {Set<Function>}
 */
export const commandListeners = new Set();

/**
 * Reset all mock state. Call this in beforeEach().
 */
export function resetMocks() {
  storageData.clear();
  storageListeners.clear();
  messageListeners.clear();
  commandListeners.clear();
}

/**
 * Set initial storage data for tests.
 *
 * @param {Object} data - Key-value pairs to set
 */
export function setStorageData(data) {
  for (const [key, value] of Object.entries(data)) {
    storageData.set(key, value);
  }
}

/**
 * Mock browser.storage API.
 */
export const mockStorage = {
  local: {
    /**
     * Get items from storage.
     *
     * @param {string|string[]|Object|null} keys - Keys to get
     * @returns {Promise<Object>} Retrieved values
     */
    async get(keys) {
      const result = {};

      if (keys === null || keys === undefined) {
        // Return all storage
        for (const [key, value] of storageData) {
          result[key] = value;
        }
      } else if (typeof keys === 'string') {
        if (storageData.has(keys)) {
          result[keys] = storageData.get(keys);
        }
      } else if (Array.isArray(keys)) {
        for (const key of keys) {
          if (storageData.has(key)) {
            result[key] = storageData.get(key);
          }
        }
      } else if (typeof keys === 'object') {
        // Object with default values
        for (const [key, defaultValue] of Object.entries(keys)) {
          result[key] = storageData.has(key) ? storageData.get(key) : defaultValue;
        }
      }

      return result;
    },

    /**
     * Set items in storage.
     *
     * @param {Object} items - Key-value pairs to set
     * @returns {Promise<void>}
     */
    async set(items) {
      const changes = {};

      for (const [key, newValue] of Object.entries(items)) {
        const oldValue = storageData.get(key);
        storageData.set(key, newValue);

        changes[key] = { oldValue, newValue };
      }

      // Notify listeners
      for (const listener of storageListeners) {
        listener(changes, 'local');
      }
    },

    /**
     * Remove items from storage.
     *
     * @param {string|string[]} keys - Keys to remove
     * @returns {Promise<void>}
     */
    async remove(keys) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      const changes = {};

      for (const key of keysArray) {
        if (storageData.has(key)) {
          changes[key] = { oldValue: storageData.get(key) };
          storageData.delete(key);
        }
      }

      // Notify listeners
      if (Object.keys(changes).length > 0) {
        for (const listener of storageListeners) {
          listener(changes, 'local');
        }
      }
    },

    /**
     * Clear all storage.
     *
     * @returns {Promise<void>}
     */
    async clear() {
      const changes = {};

      for (const [key, value] of storageData) {
        changes[key] = { oldValue: value };
      }

      storageData.clear();

      // Notify listeners
      for (const listener of storageListeners) {
        listener(changes, 'local');
      }
    }
  },

  onChanged: {
    /**
     * Add a storage change listener.
     *
     * @param {Function} listener - The listener function
     */
    addListener(listener) {
      storageListeners.add(listener);
    },

    /**
     * Remove a storage change listener.
     *
     * @param {Function} listener - The listener to remove
     */
    removeListener(listener) {
      storageListeners.delete(listener);
    },

    /**
     * Check if a listener is registered.
     *
     * @param {Function} listener - The listener to check
     * @returns {boolean} True if registered
     */
    hasListener(listener) {
      return storageListeners.has(listener);
    }
  }
};

/**
 * Mock browser.tabs API.
 */
export const mockTabs = {
  /**
   * Mocked tabs data.
   * @type {Array<{id: number, url: string}>}
   */
  _tabs: [
    { id: 1, url: 'https://claude.ai/chat/123' },
    { id: 2, url: 'https://claude.ai/chat/456' }
  ],

  /**
   * Query tabs matching criteria.
   *
   * @param {Object} queryInfo - Query parameters
   * @returns {Promise<Array>} Matching tabs
   */
  async query(queryInfo) {
    let result = [...this._tabs];

    if (queryInfo.url) {
      const pattern = queryInfo.url.replace(/\*/g, '.*');
      const regex = new RegExp(pattern);
      result = result.filter(tab => regex.test(tab.url));
    }

    if (queryInfo.active !== undefined) {
      result = result.filter((_, index) => queryInfo.active ? index === 0 : true);
    }

    if (queryInfo.currentWindow) {
      result = result.slice(0, 1);
    }

    return result;
  },

  /**
   * Send a message to a tab.
   *
   * @param {number} tabId - The tab ID
   * @param {*} message - The message to send
   * @returns {Promise<*>} Response from the tab
   */
  async sendMessage(tabId, message) {
    // Simulate message handling
    return { success: true, received: message };
  }
};

/**
 * Mock browser.runtime API.
 */
export const mockRuntime = {
  onMessage: {
    /**
     * Add a message listener.
     *
     * @param {Function} listener - The listener function
     */
    addListener(listener) {
      messageListeners.add(listener);
    },

    /**
     * Remove a message listener.
     *
     * @param {Function} listener - The listener to remove
     */
    removeListener(listener) {
      messageListeners.delete(listener);
    },

    /**
     * Check if a listener is registered.
     *
     * @param {Function} listener - The listener to check
     * @returns {boolean} True if registered
     */
    hasListener(listener) {
      return messageListeners.has(listener);
    }
  },

  /**
   * Send a message to the extension.
   *
   * @param {*} message - The message to send
   * @returns {Promise<*>} Response from the listener
   */
  async sendMessage(message) {
    for (const listener of messageListeners) {
      const response = await new Promise(resolve => {
        listener(message, {}, resolve);
      });
      if (response !== undefined) {
        return response;
      }
    }
    return undefined;
  },

  /**
   * Get the extension URL.
   *
   * @param {string} path - The path within the extension
   * @returns {string} Full URL
   */
  getURL(path) {
    return `moz-extension://mock-extension-id/${path}`;
  },

  /**
   * Extension ID.
   */
  id: 'mock-extension-id@test'
};

/**
 * Mock browser.commands API.
 */
export const mockCommands = {
  onCommand: {
    /**
     * Add a command listener.
     *
     * @param {Function} listener - The listener function
     */
    addListener(listener) {
      commandListeners.add(listener);
    },

    /**
     * Remove a command listener.
     *
     * @param {Function} listener - The listener to remove
     */
    removeListener(listener) {
      commandListeners.delete(listener);
    }
  },

  /**
   * Get all registered commands.
   *
   * @returns {Promise<Array>} Array of command objects
   */
  async getAll() {
    return [
      { name: '_execute_browser_action', shortcut: 'Alt+Shift+W' },
      { name: 'cycle-presets', shortcut: 'Alt+Shift+C' },
      { name: 'toggle-default', shortcut: 'Alt+Shift+D' }
    ];
  }
};

/**
 * Mock browser.browserAction API.
 */
export const mockBrowserAction = {
  _badge: { text: '', color: '', textColor: '' },

  /**
   * Set badge text.
   *
   * @param {Object} details - Badge details
   */
  setBadgeText(details) {
    this._badge.text = details.text || '';
  },

  /**
   * Set badge background color.
   *
   * @param {Object} details - Color details
   */
  setBadgeBackgroundColor(details) {
    this._badge.color = details.color || '';
  },

  /**
   * Set badge text color.
   *
   * @param {Object} details - Color details
   */
  setBadgeTextColor(details) {
    this._badge.textColor = details.color || '';
  },

  /**
   * Get current badge state (for testing).
   *
   * @returns {Object} Badge state
   */
  getBadgeState() {
    return { ...this._badge };
  }
};

/**
 * Mock browser.contextMenus API.
 */
export const mockContextMenus = {
  _menus: [],

  /**
   * Create a context menu item.
   *
   * @param {Object} createProperties - Menu item properties
   * @param {Function} [callback] - Callback when created
   */
  create(createProperties, callback) {
    this._menus.push(createProperties);
    if (callback) callback();
  },

  /**
   * Remove all context menu items.
   *
   * @param {Function} [callback] - Callback when removed
   */
  removeAll(callback) {
    this._menus = [];
    if (callback) callback();
  },

  /**
   * Get all menu items (for testing).
   *
   * @returns {Array} Menu items
   */
  getMenuItems() {
    return [...this._menus];
  },

  onClicked: {
    _listeners: new Set(),

    addListener(listener) {
      this._listeners.add(listener);
    },

    removeListener(listener) {
      this._listeners.delete(listener);
    }
  }
};

/**
 * Complete mock browser object.
 */
export const mockBrowser = {
  storage: mockStorage,
  tabs: mockTabs,
  runtime: mockRuntime,
  commands: mockCommands,
  browserAction: mockBrowserAction,
  contextMenus: mockContextMenus
};

/**
 * Install the mock browser object globally.
 */
export function installBrowserMock() {
  globalThis.browser = mockBrowser;
}
