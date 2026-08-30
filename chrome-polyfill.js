/**
 * BD Job Autofill - Chrome Extension Web Polyfill
 * Emulates chrome.* Extension APIs inside a normal web browser.
 */

(function() {
  // CRITICAL: if this is a real installed Chrome/Edge extension, the browser
  // already provides a fully-working chrome.runtime (with a real extension ID,
  // e.g. "chrome-extension://abcdef.../"). In that case this file must do
  // nothing — every function below is a fake, in-page simulation of the
  // chrome.* APIs for the standalone web demo only. Without this guard,
  // chrome.runtime.sendMessage and chrome.runtime.getURL get silently
  // overwritten with the fake versions even inside a real extension, which
  // is why "Save Profile" was failing with "No response from registered
  // listeners" — the fake sendMessage only knows about a page-local listener
  // registry that background.js (a real service worker) never registers into.
  const isRealExtensionContext =
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    typeof chrome.runtime.id === 'string' &&
    chrome.runtime.id.length > 0;

  if (isRealExtensionContext) {
    return;
  }

  // Defensively patch window.fetch to support writing/assignment.
  // This resolves "TypeError: Cannot set property fetch of #<Window> which has only a getter"
  // which commonly occurs in sandboxed iframes or platform testing wrappers.
  try {
    let currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: function() {
        return currentFetch;
      },
      set: function(val) {
        currentFetch = val;
      }
    });
  } catch (e) {
    try {
      let currentFetch = window.fetch;
      Object.defineProperty(Window.prototype, 'fetch', {
        configurable: true,
        enumerable: true,
        get: function() {
          return currentFetch;
        },
        set: function(val) {
          currentFetch = val;
        }
      });
    } catch (err) {
      console.warn('Polyfill: Failed to configure writable fetch property:', err);
    }
  }

  window.chrome = window.chrome || {};

  // Find the highest accessible ancestor window in the same origin
  function getHighestAccessibleWindow() {
    let curr = window;
    while (curr.parent && curr.parent !== curr) {
      try {
        const test = curr.parent.document;
        curr = curr.parent;
      } catch (e) {
        break;
      }
    }
    return curr;
  }
  const sharedWindow = getHighestAccessibleWindow();

  // Initialize shared registries
  if (!sharedWindow.__chromeListeners) {
    sharedWindow.__chromeListeners = [];
  }
  if (sharedWindow.__chromeActiveTabUrl === undefined) {
    sharedWindow.__chromeActiveTabUrl = 'http://all-jobs.teletalk.com.bd/apply';
  }
  if (sharedWindow.__chromeActiveTabStatus === undefined) {
    sharedWindow.__chromeActiveTabStatus = 'complete';
  }

  // Helper to deep clone to prevent mutations
  function clone(obj) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  }

  // --- chrome.storage.local ---
  chrome.storage = chrome.storage || {};
  chrome.storage.local = chrome.storage.local || {
    get: function(keys, callback) {
      const result = {};
      let keysArray = [];
      if (typeof keys === 'string') {
        keysArray = [keys];
      } else if (Array.isArray(keys)) {
        keysArray = keys;
      } else if (keys && typeof keys === 'object') {
        keysArray = Object.keys(keys);
      } else {
        keysArray = null;
      }

      if (keysArray === null) {
        // If keys is null/undefined, return all storage keys
        for (let i = 0; i < localStorage.length; i++) {
          const lKey = localStorage.key(i);
          if (lKey.startsWith('chrome_storage_local_')) {
            const rawKey = lKey.slice('chrome_storage_local_'.length);
            try {
              result[rawKey] = JSON.parse(localStorage.getItem(lKey));
            } catch (e) {
              result[rawKey] = localStorage.getItem(lKey);
            }
          }
        }
      } else {
        keysArray.forEach(key => {
          const lKey = 'chrome_storage_local_' + key;
          const val = localStorage.getItem(lKey);
          if (val !== null) {
            try {
              result[key] = JSON.parse(val);
            } catch (e) {
              result[key] = val;
            }
          } else {
            // Default value if defined in object keys
            if (keys && typeof keys === 'object' && !Array.isArray(keys)) {
              result[key] = keys[key];
            } else {
              result[key] = undefined;
            }
          }
        });
      }

      setTimeout(() => {
        if (callback) callback(clone(result));
      }, 0);
    },
    set: function(items, callback) {
      Object.keys(items).forEach(key => {
        const lKey = 'chrome_storage_local_' + key;
        localStorage.setItem(lKey, JSON.stringify(items[key]));
      });
      setTimeout(() => {
        if (callback) callback();
      }, 0);
    },
    remove: function(keys, callback) {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach(key => {
        localStorage.removeItem('chrome_storage_local_' + key);
      });
      setTimeout(() => {
        if (callback) callback();
      }, 0);
    },
    clear: function(callback) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const lKey = localStorage.key(i);
        if (lKey.startsWith('chrome_storage_local_')) {
          localStorage.removeItem(lKey);
        }
      }
      setTimeout(() => {
        if (callback) callback();
      }, 0);
    }
  };

  // --- chrome.runtime ---
  chrome.runtime = chrome.runtime || {};
  chrome.runtime.lastError = undefined;

  chrome.runtime.getURL = function(path) {
    return path;
  };

  chrome.runtime.onMessage = chrome.runtime.onMessage || {
    addListener: function(listener) {
      // Ensure we don't register duplicate listeners from the same window
      const alreadyExists = sharedWindow.__chromeListeners.some(l => l.listener === listener);
      if (!alreadyExists) {
        sharedWindow.__chromeListeners.push({
          listener: listener,
          window: window,
          doc: document // tie this listener to the exact document that registered it
        });
      }
    },
    removeListener: function(listener) {
      sharedWindow.__chromeListeners = sharedWindow.__chromeListeners.filter(l => l.listener !== listener);
    }
  };

  chrome.runtime.sendMessage = function(message, callback) {
    let responded = false;
    const sendResponse = (response) => {
      if (responded) return;
      responded = true;
      if (callback) {
        if (response && response.error) {
          chrome.runtime.lastError = { message: response.error };
        } else {
          chrome.runtime.lastError = undefined;
        }
        setTimeout(() => {
          try {
            callback(clone(response));
          } finally {
            chrome.runtime.lastError = undefined;
          }
        }, 0);
      }
    };

    // Filter out dead listeners from reloaded/closed windows or navigated-away iframes.
    // Comparing l.window.document to the doc captured at registration time catches the
    // case where an iframe's src changes: the window reference survives, but the old
    // document (and everything the listener closed over) is gone, so that listener would
    // otherwise silently no-op instead of responding, causing "No response from
    // registered listeners".
    sharedWindow.__chromeListeners = sharedWindow.__chromeListeners.filter(l => {
      try {
        return l.window && !l.window.closed && l.window.document === l.doc;
      } catch (e) {
        return false;
      }
    });

    let asyncChannel = false;
    sharedWindow.__chromeListeners.forEach(l => {
      try {
        const result = l.listener(clone(message), {}, sendResponse);
        if (result === true) {
          asyncChannel = true;
        }
      } catch (e) {
        console.error('Error in listener callback:', e);
      }
    });

    if (!asyncChannel && !responded) {
      setTimeout(() => {
        if (!responded) {
          sendResponse({ ok: false, error: 'No response from registered listeners' });
        }
      }, 250);
    }
  };

  // --- chrome.tabs ---
  chrome.tabs = chrome.tabs || {};

  chrome.tabs.query = function(queryInfo, callback) {
    setTimeout(() => {
      const activeTab = {
        id: 1,
        url: sharedWindow.__chromeActiveTabUrl,
        status: sharedWindow.__chromeActiveTabStatus
      };
      if (callback) callback([activeTab]);
    }, 0);
  };

  chrome.tabs.get = function(tabId, callback) {
    setTimeout(() => {
      if (callback) {
        callback({
          id: 1,
          status: sharedWindow.__chromeActiveTabStatus
        });
      }
    }, 0);
  };

  chrome.tabs.sendMessage = function(tabId, message, callback) {
    // Treat sending to tabs exactly like runtime sendMessage, but targeting content scripts
    chrome.runtime.sendMessage(message, callback);
  };

  chrome.tabs.create = function(createProperties, callback) {
    const url = createProperties.url;
    if (sharedWindow.__chromeNavigateMain) {
      sharedWindow.__chromeNavigateMain(url);
    } else {
      window.open(url, '_blank');
    }
    if (callback) {
      setTimeout(() => callback({ id: 1, url }), 0);
    }
  };

  // --- chrome.scripting ---
  chrome.scripting = chrome.scripting || {};
  chrome.scripting.executeScript = function(injection, callback) {
    // In our web app, content-script.js is already loaded statically on the demo page.
    // So we don't need to manually inject it.
    setTimeout(() => {
      if (callback) callback();
    }, 50);
  };

  // Listen to iframe load events to handle window navigation tracking
  window.addEventListener('DOMContentLoaded', () => {
    // Set dynamic metadata or intercept forms if necessary
  });
})();
