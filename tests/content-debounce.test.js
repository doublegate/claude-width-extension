/**
 * Regression tests for the debounced width re-application in content/content.js.
 *
 * Loads the real content script so the MutationObserver debounce and the
 * message handlers share state exactly as they do in the browser.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createMockClaudeDOM, simulateRuntimeMessage, simulateStorageChange } from './setup.js';

const CONTENT_SRC = readFileSync(resolve(__dirname, '../content/content.js'), 'utf8');

async function loadContentScript() {
  new Function(CONTENT_SRC)();
  // Let async initialize() finish and the INIT_RETRY_INTERVALS timers drain.
  await vi.advanceTimersByTimeAsync(5000);
}

async function triggerObserverDebounce() {
  const msg = document.createElement('div');
  msg.className = 'Message assistant';
  document.querySelector('.Thread').appendChild(msg);
  // MutationObserver callbacks are delivered as microtasks.
  await Promise.resolve();
  await Promise.resolve();
}

describe('Content Script width debounce', () => {
  let originalDebounce;
  let observers;

  beforeEach(() => {
    observers = [];
    const RealMutationObserver = window.MutationObserver;
    vi.stubGlobal('MutationObserver', class extends RealMutationObserver {
      constructor(cb) {
        super(cb);
        observers.push(this);
      }
    });
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    originalDebounce = window.ClaudeWidthConstants.TIMING.DEBOUNCE_MS;
    window.ClaudeWidthConstants.TIMING.DEBOUNCE_MS = 200;
    createMockClaudeDOM();
  });

  afterEach(() => {
    observers.forEach(o => o.disconnect());
    vi.clearAllTimers();
    vi.unstubAllGlobals();
    window.ClaudeWidthConstants.TIMING.DEBOUNCE_MS = originalDebounce;
    vi.useRealTimers();
  });

  it('does not revert an updateWidth message with a pending observer callback', async () => {
    await loadContentScript();
    const main = document.querySelector('main');
    expect(main.style.maxWidth).toBe('85%');

    await triggerObserverDebounce();
    await simulateRuntimeMessage({ action: 'updateWidth', width: 50 });
    expect(main.style.maxWidth).toBe('50%');

    await vi.advanceTimersByTimeAsync(250);

    expect(main.style.maxWidth).toBe('50%');
    const status = await simulateRuntimeMessage({ action: 'getStatus' });
    expect(status.currentWidth).toBe(50);
  });

  it('does not revert a storage width change with a pending observer callback', async () => {
    await loadContentScript();
    const main = document.querySelector('main');

    await triggerObserverDebounce();
    await simulateStorageChange({ chatWidthPercent: { newValue: 70 } });

    await vi.advanceTimersByTimeAsync(250);

    expect(main.style.maxWidth).toBe('70%');
  });

  it('does not revert a preset cycle with a pending observer callback', async () => {
    await loadContentScript();
    const main = document.querySelector('main');

    await triggerObserverDebounce();
    const response = await simulateRuntimeMessage({ action: 'cyclePresets' });
    expect(response.currentWidth).toBe(100);

    await vi.advanceTimersByTimeAsync(250);

    expect(main.style.maxWidth).toBe('100%');
  });
});
