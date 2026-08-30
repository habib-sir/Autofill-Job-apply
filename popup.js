/**
 * Project: BD Job Autofill
 * Module: Popup Controller
 * Purpose: Populates profile selector, wires autofill trigger, and routes
 *          navigation to profile/application management views.
 * Author: Lead Engineer
 * Version: 1.5.0
 * Dependencies: background.js (message API), content-script.js (AUTOFILL_PAGE)
 * Last Updated: 2026-07-08
 */

const profileSelect = document.getElementById('profile-select');
const profileEmptyHint = document.getElementById('profile-empty-hint');
const autofillBtn = document.getElementById('autofill-btn');
const autofillStatus = document.getElementById('autofill-status');
const manageProfilesBtn = document.getElementById('manage-profiles-btn');
const manageApplicationsBtn = document.getElementById('manage-applications-btn');
const fillGraCheckbox = document.getElementById('fill-gra-checkbox');
const fillMasCheckbox = document.getElementById('fill-mas-checkbox');

// Profile keys that belong to each education section. Unchecking a section
// in the popup excludes these keys from the autofill payload, so a repeat
// ("2nd time") autofill can target just Graduation or just Masters without
// overwriting a section that's already filled in correctly.
const GRA_SECTION_KEYS = ['graExam', 'graInstitute', 'graSubject', 'graResultType', 'graResult', 'graYear', 'graDuration', 'bachelor'];
const MAS_SECTION_KEYS = ['masExam', 'masInstitute', 'masSubject', 'masResultType', 'masResult', 'masYear', 'masDuration', 'master'];
const SECTION_PREFS_STORAGE_KEY = 'bdJobAutofill.sectionPrefs';

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'https://chrome.google.com/webstore',
  'https://chromewebstore.google.com'
];

/**
 * Sends a message to the background service worker.
 * @param {string} type
 * @param {any} [payload]
 * @returns {Promise<any>}
 */
function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error((response && response.error) || 'Unknown error.'));
        return;
      }
      resolve(response.data);
    });
  });
}

/**
 * Sets the status line text and style.
 * @param {string} message
 * @param {'success'|'error'|''} tone
 */
function setStatus(message, tone) {
  autofillStatus.textContent = message;
  autofillStatus.className = 'popup__status';
  if (tone) {
    autofillStatus.classList.add(`popup__status--${tone}`);
  }
}

/**
 * Restores the Graduation/Masters "include this section" checkboxes from
 * chrome.storage.local so the choice persists between popup openings.
 * @returns {Promise<void>}
 */
function loadSectionPrefs() {
  return new Promise((resolve) => {
    chrome.storage.local.get([SECTION_PREFS_STORAGE_KEY], (result) => {
      const prefs = result[SECTION_PREFS_STORAGE_KEY] || {};
      fillGraCheckbox.checked = prefs.fillGra !== false;
      fillMasCheckbox.checked = prefs.fillMas !== false;
      resolve();
    });
  });
}

/**
 * Persists the current Graduation/Masters checkbox state.
 * @returns {void}
 */
function saveSectionPrefs() {
  chrome.storage.local.set({
    [SECTION_PREFS_STORAGE_KEY]: {
      fillGra: fillGraCheckbox.checked,
      fillMas: fillMasCheckbox.checked
    }
  });
}

/**
 * Returns a shallow copy of the profile with Graduation and/or Masters
 * fields stripped out, based on the current section checkboxes. Stripped
 * keys are simply omitted (not set to empty), so fillForm() skips those
 * inputs entirely and leaves whatever is already on the page untouched.
 * @param {object} profile
 * @returns {object}
 */
function applySectionFilters(profile) {
  const filtered = { ...profile };
  if (!fillGraCheckbox.checked) {
    for (const key of GRA_SECTION_KEYS) {
      delete filtered[key];
    }
  }
  if (!fillMasCheckbox.checked) {
    for (const key of MAS_SECTION_KEYS) {
      delete filtered[key];
    }
  }
  return filtered;
}

/**
 * Loads profiles into the select element and restores active selection.
 * @returns {Promise<void>}
 */
async function loadProfiles() {
  const [profiles, activeProfile] = await Promise.all([
    sendMessage('GET_PROFILES'),
    sendMessage('GET_ACTIVE_PROFILE')
  ]);

  profileSelect.innerHTML = '';

  if (profiles.length === 0) {
    profileEmptyHint.hidden = false;
    profileSelect.disabled = true;
    autofillBtn.disabled = true;
    return;
  }

  profileEmptyHint.hidden = true;
  profileSelect.disabled = false;
  autofillBtn.disabled = false;

  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name || 'Unnamed profile';
    profileSelect.appendChild(option);
  }

  let selectedId = activeProfile ? activeProfile.id : null;
  if (!selectedId || !profiles.some(p => p.id === selectedId)) {
    selectedId = profiles[0].id;
    await sendMessage('SET_ACTIVE_PROFILE', selectedId);
  }
  profileSelect.value = selectedId;
}

/**
 * Gets the active tab in the current window.
 * @returns {Promise<chrome.tabs.Tab>}
 */
function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!tabs[0]) {
        reject(new Error('No active tab found.'));
        return;
      }
      resolve(tabs[0]);
    });
  });
}

/**
 * Waits for a tab to finish loading.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (!tab || tab.status === 'complete') {
        resolve();
        return;
      }
      const listener = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  });
}

/**
 * Determines whether a URL is a restricted page where scripting injection
 * is disallowed by the browser (internal pages, web store, etc.).
 * @param {string} url
 * @returns {boolean}
 */
function isRestrictedUrl(url) {
  if (!url) {
    return true;
  }
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Sends a PING message to the content script and resolves true/false based
 * on whether a live listener responded, instead of throwing.
 * @param {number} tabId
 * @returns {Promise<boolean>}
 */
function pingContentScript(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(false);
        return;
      }
      resolve(!!(response && response.ok));
    });
  });
}

/**
 * Injects the content script files into the given tab.
 * @param {number} tabId
 * @returns {Promise<void>}
 */
function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['teletalk-mapping.js', 'content-script.js']
      },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      }
    );
  });
}

/**
 * Ensures the content script is loaded and responsive in the active tab.
 * Pings first; if unresponsive, injects immediately and pings again with
 * a short backoff to allow initialization.
 * @param {number} tabId
 * @param {string} tabUrl
 * @returns {Promise<void>}
 */
async function ensureContentScript(tabId, tabUrl) {
  if (isRestrictedUrl(tabUrl)) {
    throw new Error('This page cannot be autofilled (browser-restricted page).');
  }

  const alreadyLive = await pingContentScript(tabId);
  if (alreadyLive) {
    return;
  }

  try {
    await injectContentScript(tabId);
  } catch (injectErr) {
    throw new Error(
      `Failed to inject content script: ${injectErr.message}. Please refresh the page and try again.`
    );
  }

  const maxAttempts = 4;
  const delayMs = 250;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const live = await pingContentScript(tabId);
    if (live) {
      return;
    }
  }

  throw new Error('Failed to inject content script. Please refresh the page and try again.');
}

/**
 * Handles profile selection change: persists as active profile.
 * @returns {Promise<void>}
 */
async function handleProfileChange() {
  const profileId = profileSelect.value;
  try {
    await sendMessage('SET_ACTIVE_PROFILE', profileId);
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

/**
 * Sends the AUTOFILL_PAGE command and returns a normalized response.
 * @param {number} tabId
 * @param {object} activeProfile
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
function sendAutofillCommand(tabId, activeProfile) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { type: 'AUTOFILL_PAGE', payload: activeProfile },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      }
    );
  });
}

/**
 * Displays a visual feedback toast with the summary of matched/inserted fields and values.
 * @param {number} filledCount
 * @param {Array<{key: string, label: string, value: string}>} filledFields
 */
function showToast(filledCount, filledFields) {
  const toast = document.getElementById('toast');
  const toastCount = document.getElementById('toast-count');
  const toastList = document.getElementById('toast-list');
  const closeBtn = document.getElementById('toast-close-btn');

  if (!toast || !toastCount || !toastList) return;

  toastCount.textContent = filledCount;
  toastList.innerHTML = '';

  if (Array.isArray(filledFields) && filledFields.length > 0) {
    filledFields.forEach(field => {
      const item = document.createElement('div');
      item.className = 'toast-item';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'toast-item__label';
      labelSpan.textContent = field.label || field.key;

      const valueSpan = document.createElement('span');
      valueSpan.className = 'toast-item__value';
      valueSpan.textContent = field.value || '';

      item.appendChild(labelSpan);
      item.appendChild(valueSpan);
      toastList.appendChild(item);
    });
  } else {
    const emptyMsg = document.createElement('p');
    emptyMsg.style.fontSize = '11px';
    emptyMsg.style.color = 'var(--color-text-muted)';
    emptyMsg.style.margin = '0';
    emptyMsg.textContent = 'No specific fields mapped.';
    toastList.appendChild(emptyMsg);
  }

  // Show the toast
  toast.hidden = false;
  toast.removeAttribute('aria-hidden');
  // Trigger transition on next paint
  setTimeout(() => {
    toast.classList.add('toast--visible');
  }, 10);

  const hideToast = () => {
    toast.classList.remove('toast--visible');
    // Hide completely after transition finishes
    setTimeout(() => {
      toast.hidden = true;
      toast.setAttribute('aria-hidden', 'true');
    }, 300);
  };

  closeBtn.onclick = hideToast;

  // Close on clicking translucent background overlay
  toast.onclick = (e) => {
    if (e.target === toast) {
      hideToast();
    }
  };
}

/**
 * Handles autofill button click: sends fill command to content script.
 * @returns {Promise<void>}
 */
async function handleAutofillClick() {
  autofillBtn.disabled = true;
  setStatus('Filling form…', '');

  try {
    const activeProfile = await sendMessage('GET_ACTIVE_PROFILE');
    if (!activeProfile) {
      setStatus('No active profile selected.', 'error');
      return;
    }

    const tab = await getActiveTab();

    await waitForTabLoad(tab.id);

    await ensureContentScript(tab.id, tab.url);

    const filteredProfile = applySectionFilters(activeProfile);
    const response = await sendAutofillCommand(tab.id, filteredProfile);

    if (!response || !response.ok) {
      setStatus((response && response.error) || 'Autofill failed.', 'error');
      return;
    }

    setStatus(`Filled ${response.data.filledCount} field(s).`, 'success');
    showToast(response.data.filledCount, response.data.filledFields);
  } catch (error) {
    setStatus(error.message || 'Could not connect to page. Please refresh the page and try again.', 'error');
  } finally {
    autofillBtn.disabled = false;
  }
}

/**
 * Opens the profile management page in a new tab.
 * @returns {void}
 */
function openProfilesPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('profiles.html') });
}

/**
 * Opens the applications history page in a new tab.
 * @returns {void}
 */
function openApplicationsPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('applications.html') });
}

if (profileSelect) profileSelect.addEventListener('change', handleProfileChange);
if (autofillBtn) autofillBtn.addEventListener('click', handleAutofillClick);
if (manageProfilesBtn) manageProfilesBtn.addEventListener('click', openProfilesPage);
if (manageApplicationsBtn) manageApplicationsBtn.addEventListener('click', openApplicationsPage);
if (fillGraCheckbox) fillGraCheckbox.addEventListener('change', saveSectionPrefs);
if (fillMasCheckbox) fillMasCheckbox.addEventListener('change', saveSectionPrefs);

document.addEventListener('DOMContentLoaded', () => {
  loadProfiles().catch((error) => setStatus(error.message, 'error'));
  loadSectionPrefs();
});