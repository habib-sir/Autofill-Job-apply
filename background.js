/**
 * Project: BD Job Autofill
 * Module: Background Service Worker
 * Purpose: Central storage access point and message router between popup,
 *          content scripts, and chrome.storage.local.
 * Author: Lead Engineer
 * Version: 1.0.0
 * Dependencies: chrome.storage, chrome.runtime
 * Last Updated: 2026-07-06
 */

const STORAGE_KEYS = {
  PROFILES: 'profiles',
  APPLICATIONS: 'applications',
  ACTIVE_PROFILE_ID: 'activeProfileId'
};

/**
 * Reads a value from chrome.storage.local.
 * @param {string} key
 * @returns {Promise<any>}
 */
function storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result[key]);
    });
  });
}

/**
 * Writes a value to chrome.storage.local.
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Handles GET_PROFILES message.
 * @returns {Promise<Array<object>>}
 */
async function handleGetProfiles() {
  const profiles = await storageGet(STORAGE_KEYS.PROFILES);
  return Array.isArray(profiles) ? profiles : [];
}

/**
 * Handles SAVE_PROFILE message. Inserts or updates by profile.id.
 * @param {object} profile
 * @returns {Promise<Array<object>>}
 */
async function handleSaveProfile(profile) {
  if (!profile || typeof profile !== 'object' || !profile.id) {
    throw new Error('Invalid profile payload: missing id.');
  }
  const profiles = await handleGetProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);
  if (index >= 0) {
    profiles[index] = profile;
  } else {
    profiles.push(profile);
  }
  await storageSet(STORAGE_KEYS.PROFILES, profiles);
  return profiles;
}

/**
 * Handles DELETE_PROFILE message.
 * @param {string} profileId
 * @returns {Promise<Array<object>>}
 */
async function handleDeleteProfile(profileId) {
  if (!profileId) {
    throw new Error('Invalid payload: missing profileId.');
  }
  const profiles = await handleGetProfiles();
  const filtered = profiles.filter((p) => p.id !== profileId);
  await storageSet(STORAGE_KEYS.PROFILES, filtered);

  const activeId = await storageGet(STORAGE_KEYS.ACTIVE_PROFILE_ID);
  if (activeId === profileId) {
    await storageSet(STORAGE_KEYS.ACTIVE_PROFILE_ID, null);
  }
  return filtered;
}

/**
 * Handles SET_ACTIVE_PROFILE message.
 * @param {string} profileId
 * @returns {Promise<string>}
 */
async function handleSetActiveProfile(profileId) {
  if (!profileId) {
    throw new Error('Invalid payload: missing profileId.');
  }
  await storageSet(STORAGE_KEYS.ACTIVE_PROFILE_ID, profileId);
  return profileId;
}

/**
 * Handles GET_ACTIVE_PROFILE message.
 * @returns {Promise<object|null>}
 */
async function handleGetActiveProfile() {
  const activeId = await storageGet(STORAGE_KEYS.ACTIVE_PROFILE_ID);
  if (!activeId) {
    return null;
  }
  const profiles = await handleGetProfiles();
  return profiles.find((p) => p.id === activeId) || null;
}

/**
 * Handles GET_APPLICATIONS message.
 * @returns {Promise<Array<object>>}
 */
async function handleGetApplications() {
  const applications = await storageGet(STORAGE_KEYS.APPLICATIONS);
  return Array.isArray(applications) ? applications : [];
}

/**
 * Handles SAVE_APPLICATION message. Inserts or updates by application.id.
 * @param {object} application
 * @returns {Promise<Array<object>>}
 */
async function handleSaveApplication(application) {
  if (!application || typeof application !== 'object' || !application.id) {
    throw new Error('Invalid application payload: missing id.');
  }
  const applications = await handleGetApplications();
  const index = applications.findIndex((a) => a.id === application.id);
  if (index >= 0) {
    applications[index] = application;
  } else {
    applications.push(application);
  }
  await storageSet(STORAGE_KEYS.APPLICATIONS, applications);
  return applications;
}

/**
 * Handles DELETE_APPLICATION message.
 * @param {string} applicationId
 * @returns {Promise<Array<object>>}
 */
async function handleDeleteApplication(applicationId) {
  if (!applicationId) {
    throw new Error('Invalid payload: missing applicationId.');
  }
  const applications = await handleGetApplications();
  const filtered = applications.filter((a) => a.id !== applicationId);
  await storageSet(STORAGE_KEYS.APPLICATIONS, filtered);
  return filtered;
}

const MESSAGE_HANDLERS = {
  GET_PROFILES: () => handleGetProfiles(),
  SAVE_PROFILE: (payload) => handleSaveProfile(payload),
  DELETE_PROFILE: (payload) => handleDeleteProfile(payload),
  SET_ACTIVE_PROFILE: (payload) => handleSetActiveProfile(payload),
  GET_ACTIVE_PROFILE: () => handleGetActiveProfile(),
  GET_APPLICATIONS: () => handleGetApplications(),
  SAVE_APPLICATION: (payload) => handleSaveApplication(payload),
  DELETE_APPLICATION: (payload) => handleDeleteApplication(payload)
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handler = message && MESSAGE_HANDLERS[message.type];
  if (!handler) {
    return false;
  }

  handler(message.payload)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
