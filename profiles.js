/**
 * Project: BD Job Autofill
 * Module: Profiles Page Controller
 * Purpose: Loads, renders, creates, updates, and deletes profiles via the
 *          background message API, binding all profiles.html interactions.
 * Author: Lead Engineer
 * Version: 2.0.0 (Offline CV extraction — no network calls, no API key.
 *          PDF text is parsed locally via vendored PDF.js and mapped to
 *          profile fields using regex/keyword pattern matching.)
 * Dependencies: background.js (message API), lib/pdfjs/pdf.min.js (vendored)
 * Last Updated: 2026-07-09
 */

const TEXT_FIELD_KEYS = [
  'name',
  'fullName',
  'nameBn',
  'fatherName',
  'fatherBn',
  'motherName',
  'motherBn',
  'dateOfBirth',
  'gender',
  'nationality',
  'religion',
  'maritalStatus',
  'spouseName',
  'bloodGroup',
  'nidType',
  'nidNo',
  'birthRegNo',
  'passportNo',
  'mobile',
  'mobileConfirm',
  'email',
  'quota',
  'quotaDetails',
  'depStatus',
  'presentCareOf',
  'presentAddress',
  'presentDistrict',
  'presentUpazila',
  'presentPost',
  'presentPostcode',
  'permanentCareOf',
  'permanentAddress',
  'permanentDistrict',
  'permanentUpazila',
  'permanentPost',
  'permanentPostcode',
  'fatherOccupation',
  'sscExam',
  'sscRoll',
  'sscGroup',
  'sscGroupOther',
  'sscBoard',
  'sscBoardOther',
  'sscResultType',
  'sscResult',
  'sscYear',
  'hscExam',
  'hscRoll',
  'hscGroup',
  'hscGroupOther',
  'hscBoard',
  'hscBoardOther',
  'hscResultType',
  'hscResult',
  'hscYear',
  'graExam',
  'graInstitute',
  'graSubject',
  'graResultType',
  'graResult',
  'graYear',
  'graDuration',
  'masExam',
  'masInstitute',
  'masSubject',
  'masResultType',
  'masResult',
  'masYear',
  'masDuration',
  'bachelor',
  'master',
  'experienceComputer',
  'experienceSatlipi'
];

const CHECKBOX_FIELD_KEYS = ['sameAsPresent'];

const profileListEl = document.getElementById('profile-list');
const profileListEmptyEl = document.getElementById('profile-list-empty');
const profileFormEl = document.getElementById('profile-form');
const formEmptyHintEl = document.getElementById('form-empty-hint');
const formStatusEl = document.getElementById('form-status');
const newProfileBtn = document.getElementById('new-profile-btn');
const deleteProfileBtn = document.getElementById('delete-profile-btn');
const deleteProfileTopBtn = document.getElementById('delete-profile-top-btn');
const editorHeadingEl = document.getElementById('editor-heading');
const deleteModalEl = document.getElementById('delete-modal');
const modalProfileNameEl = document.getElementById('modal-profile-name');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCloseXBtn = document.getElementById('modal-close-x-btn');
const profileIdInput = document.getElementById('profile-id');
const copyFromProfileSelect = document.getElementById('copy-from-profile-select');
const copyFromProfileBtn = document.getElementById('copy-from-profile-btn');
const importJsonInput = document.getElementById('import-json-input');
const importJsonBtn = document.getElementById('import-json-btn');
const importStatusEl = document.getElementById('import-status');
const exportJsonBtn = document.getElementById('export-json-btn');

const ALL_PROFILE_FIELD_KEYS = [...TEXT_FIELD_KEYS, ...CHECKBOX_FIELD_KEYS];

let profiles = [];
let selectedProfileId = null;
let pendingImportFile = null;

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
 * Generates a reasonably unique identifier for a new profile.
 * @returns {string}
 */
function generateProfileId() {
  return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Sets the form status line text and style.
 * @param {string} message
 * @param {'success'|'error'|''} tone
 */
function setFormStatus(message, tone) {
  formStatusEl.textContent = message;
  formStatusEl.className = 'form-status';
  if (tone) {
    formStatusEl.classList.add(`form-status--${tone}`);
  }
}

/**
 * Sets the import panel status line text and style.
 * @param {string} message
 * @param {'success'|'error'|''} tone
 */
function setImportStatus(message, tone) {
  importStatusEl.textContent = message;
  importStatusEl.className = 'form-status';
  if (tone) {
    importStatusEl.classList.add(`form-status--${tone}`);
  }
}

let profilePendingDeletionId = null;

/**
 * Opens the in-app confirmation modal to delete a profile safely.
 * @param {string} profileId
 * @param {string} [profileName]
 */
function promptDeleteProfile(profileId, profileName) {
  if (!profileId) return;
  profilePendingDeletionId = profileId;
  const targetProfile = profiles.find((p) => p.id === profileId);
  const name = profileName || (targetProfile && targetProfile.name) || 'Unnamed profile';

  if (modalProfileNameEl) {
    modalProfileNameEl.textContent = `"${name}"`;
  }
  if (deleteModalEl) {
    deleteModalEl.hidden = false;
    deleteModalEl.classList.remove('is-hidden');
    deleteModalEl.style.display = 'flex';
  }
}

/**
 * Closes the delete confirmation modal.
 */
function closeDeleteModal() {
  profilePendingDeletionId = null;
  if (deleteModalEl) {
    deleteModalEl.hidden = true;
    deleteModalEl.classList.add('is-hidden');
    deleteModalEl.style.display = 'none';
  }
}

/**
 * Confirms and executes profile deletion via message API without using window.confirm.
 */
async function confirmDeleteProfile() {
  const idToDelete = profilePendingDeletionId || selectedProfileId;
  if (!idToDelete) {
    closeDeleteModal();
    return;
  }

  try {
    profiles = await sendMessage('DELETE_PROFILE', idToDelete);
    if (selectedProfileId === idToDelete) {
      selectedProfileId = null;
      profileFormEl.hidden = true;
      formEmptyHintEl.hidden = false;
    }
    closeDeleteModal();
    setFormStatus('Profile removed successfully.', 'success');
    renderProfileList();
  } catch (error) {
    closeDeleteModal();
    setFormStatus(error.message, 'error');
  }
}

/**
 * Renders the profile list sidebar based on current profiles array.
 */
function renderProfileList() {
  profileListEl.innerHTML = '';

  if (profiles.length === 0) {
    profileListEmptyEl.hidden = false;
  } else {
    profileListEmptyEl.hidden = true;

    for (const profile of profiles) {
      const li = document.createElement('li');
      li.className = 'profile-list__item';
      if (profile.id === selectedProfileId) {
        li.classList.add('profile-list__item--active');
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'profile-list__button';
      button.textContent = profile.name || 'Unnamed profile';
      button.title = profile.fullName ? `${profile.name} (${profile.fullName})` : (profile.name || '');
      button.addEventListener('click', () => selectProfile(profile.id));
      li.appendChild(button);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'profile-list__delete-btn';
      delBtn.title = `Delete profile "${profile.name || 'Unnamed'}"`;
      delBtn.setAttribute('aria-label', `Delete profile ${profile.name || 'Unnamed'}`);
      delBtn.innerHTML = '🗑️';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        promptDeleteProfile(profile.id, profile.name);
      });
      li.appendChild(delBtn);

      profileListEl.appendChild(li);
    }
  }

  renderCopyFromProfileOptions();
}

/**
 * Populates the "copy from a saved profile" dropdown from the current
 * profiles array, preserving the previously selected value if still valid.
 */
function renderCopyFromProfileOptions() {
  const previousValue = copyFromProfileSelect.value;
  copyFromProfileSelect.innerHTML = '<option value="">Select a profile…</option>';

  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name || 'Unnamed profile';
    copyFromProfileSelect.appendChild(option);
  }

  if (profiles.some((p) => p.id === previousValue)) {
    copyFromProfileSelect.value = previousValue;
  }
  copyFromProfileBtn.disabled = profiles.length === 0;
}

/**
 * Populates the form fields with a given profile's data.
 * @param {object} profile
 */
function populateForm(profile) {
  profileIdInput.value = profile.id || '';

  for (const key of TEXT_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (!input) {
      continue;
    }
    if (key === 'nationality' && !profile.id && profile[key] === undefined) {
      input.value = 'Bangladeshi';
      continue;
    }
    input.value = profile[key] || '';
  }

  for (const key of CHECKBOX_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (input) {
      input.checked = Boolean(profile[key]);
    }
  }

  // Populate dynamic Custom Fields
  const container = document.getElementById('custom-fields-container');
  if (container) {
    container.innerHTML = '';
    if (profile && Array.isArray(profile.customFields)) {
      profile.customFields.forEach(field => {
        addCustomFieldRow(field.key, field.value);
      });
    }
  }
}

/**
 * Reads current form field values into a profile object.
 * @returns {object}
 */
function readFormData() {
  const data = { id: profileIdInput.value || generateProfileId() };

  for (const key of TEXT_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (input) {
      data[key] = input.value.trim();
    }
  }

  for (const key of CHECKBOX_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (input) {
      data[key] = input.checked;
    }
  }

  // Read dynamic Custom Fields
  const customFields = [];
  const rows = document.querySelectorAll('.custom-field-row');
  rows.forEach(row => {
    const keyInput = row.querySelector('.custom-field-key');
    const valInput = row.querySelector('.custom-field-value');
    if (keyInput && valInput) {
      const key = keyInput.value.trim();
      const value = valInput.value;
      if (key) {
        customFields.push({ key, value });
      }
    }
  });
  data.customFields = customFields;

  return data;
}

/**
 * Selects a profile by id, populating the form for editing.
 * @param {string} profileId
 */
function selectProfile(profileId) {
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) {
    return;
  }

  selectedProfileId = profileId;
  formEmptyHintEl.hidden = true;
  profileFormEl.hidden = false;
  if (deleteProfileBtn) deleteProfileBtn.hidden = false;
  if (deleteProfileTopBtn) deleteProfileTopBtn.hidden = false;
  if (editorHeadingEl) editorHeadingEl.textContent = `Edit Profile: ${profile.name || 'Unnamed'}`;
  setFormStatus('', '');
  populateForm(profile);
  renderProfileList();
}

/**
 * Prepares the form for creating a new profile.
 */
function startNewProfile() {
  selectedProfileId = null;
  formEmptyHintEl.hidden = true;
  profileFormEl.hidden = false;
  if (deleteProfileBtn) deleteProfileBtn.hidden = true;
  if (deleteProfileTopBtn) deleteProfileTopBtn.hidden = true;
  if (editorHeadingEl) editorHeadingEl.textContent = 'Create New Profile';
  setFormStatus('', '');
  populateForm({ id: '' });
  renderProfileList();
  document.getElementById('field-name').focus();
}

/**
 * Handles profile form submission: validates and saves via message API.
 * @param {SubmitEvent} event
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const name = document.getElementById('field-name').value.trim();
  if (!name) {
    setFormStatus('Profile label is required.', 'error');
    return;
  }

  const data = readFormData();

  try {
    profiles = await sendMessage('SAVE_PROFILE', data);
    selectedProfileId = data.id;
    setFormStatus('Profile saved.', 'success');
    renderProfileList();
    if (deleteProfileBtn) deleteProfileBtn.hidden = false;
    if (deleteProfileTopBtn) deleteProfileTopBtn.hidden = false;
    if (editorHeadingEl) editorHeadingEl.textContent = `Edit Profile: ${data.name || 'Unnamed'}`;
  } catch (error) {
    setFormStatus(error.message, 'error');
  }
}

/**
 * Handles delete button click: confirms and removes the selected profile using in-app modal.
 */
function handleDeleteClick() {
  if (!selectedProfileId) {
    return;
  }
  const current = profiles.find((p) => p.id === selectedProfileId);
  promptDeleteProfile(selectedProfileId, current ? current.name : '');
}

/**
 * Handles the "same as present address" checkbox: copies present address
 * fields into permanent address fields and disables permanent inputs.
 */
function handleSameAsPresentChange() {
  const checkbox = document.getElementById('field-sameAsPresent');
  const mapping = {
    presentCareOf: 'permanentCareOf',
    presentAddress: 'permanentAddress',
    presentDistrict: 'permanentDistrict',
    presentUpazila: 'permanentUpazila',
    presentPost: 'permanentPost',
    presentPostcode: 'permanentPostcode'
  };

  for (const [sourceKey, targetKey] of Object.entries(mapping)) {
    const sourceInput = document.getElementById(`field-${sourceKey}`);
    const targetInput = document.getElementById(`field-${targetKey}`);
    if (!sourceInput || !targetInput) {
      continue;
    }
    if (checkbox.checked) {
      targetInput.value = sourceInput.value;
      targetInput.disabled = true;
    } else {
      targetInput.disabled = false;
    }
  }
}

/**
 * Returns a sample profile object based on the data from the provided
 * "Save Document - Study Online Bd.html" file, now with values that match
 * the BSDB Teletalk form options exactly.
 * @returns {object}
 */
function getSampleProfileData() {
  return {
    id: '',
    name: 'Habib',
    fullName: 'MD. HABIBUR RAHMAN',
    nameBn: 'মোঃ হাবিবুর রহমান',
    fatherName: 'MD. ABDUS SOBAHAN',
    fatherBn: 'মোঃ আব্দুস সোবহান',
    motherName: 'MST. HAMIDA BEGUM',
    motherBn: 'মোছাঃ হামিদা বেগম',
    dateOfBirth: '1994-12-20',
    gender: 'Male',
    nationality: 'Bangladeshi',
    religion: 'Islam',
    maritalStatus: 'Married',
    spouseName: 'MST. SADIYA AKHTER',
    bloodGroup: '',
    nidType: 'NID',
    nidNo: '3254367778',
    birthRegNo: '',
    passportNo: '',
    mobile: '01771522503',
    mobileConfirm: '01771522503',
    email: 'habiblinkage@gmail.com',
    quota: 'Not Applicable',
    quotaDetails: '',
    depStatus: 'Not Applicable',
    presentCareOf: 'MD. ABDUS SOBAHAN',
    presentAddress: 'SHOHORDIGHI UTTAR PARA',
    presentDistrict: '10',
    presentUpazila: '43',
    presentPost: 'FAPORE',
    presentPostcode: '5800',
    permanentCareOf: 'MD. ABDUS SOBAHAN',
    permanentAddress: 'SHOHORDIGHI UTTAR PARA',
    permanentDistrict: '10',
    permanentUpazila: '43',
    permanentPost: 'FAPORE',
    permanentPostcode: '5800',
    sameAsPresent: true,
    fatherOccupation: '',
    sscExam: 'S.S.C',
    sscRoll: '124300',
    sscGroup: 'Science',
    sscGroupOther: '',
    sscBoard: 'Rajshahi',
    sscBoardOther: '',
    sscResultType: 'GPA(out of 5)',
    sscResult: '4.38',
    sscYear: '2010',
    hscExam: 'H.S.C',
    hscRoll: '130381',
    hscGroup: 'Science',
    hscGroupOther: '',
    hscBoard: 'Rajshahi',
    hscBoardOther: '',
    hscResultType: 'GPA(out of 5)',
    hscResult: '4.50',
    hscYear: '2012',
    graExam: 'Honors',
    graInstitute: 'National University',
    graSubject: 'Zoology',
    graResultType: 'CGPA(out of 4)',
    graResult: '3.43',
    graYear: '2016',
    graDuration: '04',
    masExam: 'Masters',
    masInstitute: 'National University',
    masSubject: 'Zoology',
    masResultType: 'CGPA(out of 4)',
    masResult: '3.61',
    masYear: '2017',
    masDuration: '01',
    bachelor: 'B.Sc (Honors) in Zoology, National University, 2016, CGPA 3.43',
    master: 'M.Sc in Zoology, National University, 2017, CGPA 3.61',
    experienceComputer: 'Yes',
    experienceSatlipi: 'Yes',
    customFields: [
      { key: 'Height (Inches)', value: '68' },
      { key: 'Weight (KG)', value: '65' }
    ]
  };
}

/**
 * Dynamically appends a custom field row to the profile form.
 * @param {string} [key]
 * @param {string} [value]
 */
function addCustomFieldRow(key = '', value = '') {
  const container = document.getElementById('custom-fields-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'custom-field-row';
  row.style.display = 'flex';
  row.style.gap = 'var(--spacing-sm)';
  row.style.alignItems = 'center';
  row.style.marginTop = 'var(--spacing-xs)';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.className = 'custom-field-key';
  keyInput.placeholder = 'Key/Label (e.g. Height)';
  keyInput.value = key;
  keyInput.style.flex = '1';
  keyInput.style.padding = 'var(--spacing-sm)';
  keyInput.style.border = '1px solid var(--color-border)';
  keyInput.style.borderRadius = 'var(--radius)';
  keyInput.style.fontSize = '13px';

  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'custom-field-value';
  valueInput.placeholder = 'Value';
  valueInput.value = value;
  valueInput.style.flex = '1';
  valueInput.style.padding = 'var(--spacing-sm)';
  valueInput.style.border = '1px solid var(--color-border)';
  valueInput.style.borderRadius = 'var(--radius)';
  valueInput.style.fontSize = '13px';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'button button--danger remove-custom-field-btn';
  removeBtn.textContent = 'Remove';
  removeBtn.style.padding = 'var(--spacing-sm) var(--spacing-md)';
  removeBtn.style.fontSize = '13px';
  removeBtn.style.lineHeight = '1.2';
  removeBtn.style.margin = '0';
  removeBtn.style.minHeight = '34px';
  removeBtn.style.width = 'auto';
  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  row.appendChild(keyInput);
  row.appendChild(valueInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

/**
 * Loads all profiles from storage on page initialization.
 * @returns {Promise<void>}
 */
async function initialize() {
  closeDeleteModal();
  try {
    profiles = await sendMessage('GET_PROFILES');
    renderProfileList();
    if (!profiles || profiles.length === 0) {
      startNewProfile();
    }
  } catch (error) {
    setFormStatus(error.message, 'error');
  }
}

// --- Event Listeners ---

if (newProfileBtn) newProfileBtn.addEventListener('click', startNewProfile);
if (profileFormEl) profileFormEl.addEventListener('submit', handleFormSubmit);
if (deleteProfileBtn) deleteProfileBtn.addEventListener('click', handleDeleteClick);
if (deleteProfileTopBtn) deleteProfileTopBtn.addEventListener('click', handleDeleteClick);
if (modalCancelBtn) {
  modalCancelBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeDeleteModal();
  });
}
if (modalCloseXBtn) {
  modalCloseXBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeDeleteModal();
  });
}
if (modalConfirmBtn) {
  modalConfirmBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    confirmDeleteProfile();
  });
}
if (deleteModalEl) {
  deleteModalEl.addEventListener('click', (e) => {
    if (e.target === deleteModalEl) {
      closeDeleteModal();
    }
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && deleteModalEl && !deleteModalEl.hidden && deleteModalEl.style.display !== 'none') {
    closeDeleteModal();
  }
});
const sameAsPresentCheckbox = document.getElementById('field-sameAsPresent');
if (sameAsPresentCheckbox) {
  sameAsPresentCheckbox.addEventListener('change', handleSameAsPresentChange);
} else {
  console.warn('profiles.js: #field-sameAsPresent not found in the DOM; skipping listener.');
}

const addCustomFieldBtn = document.getElementById('add-custom-field-btn');
if (addCustomFieldBtn) {
  addCustomFieldBtn.addEventListener('click', () => {
    addCustomFieldRow('', '');
  });
}

// --- Sample Profile event listeners ---

const loadSampleBtn = document.getElementById('load-sample-btn');
const showSampleJsonBtn = document.getElementById('show-sample-json-btn');
const sampleJsonDisplay = document.getElementById('sample-json-display');

if (loadSampleBtn) {
  loadSampleBtn.addEventListener('click', () => {
    const sample = getSampleProfileData();
    selectedProfileId = null;
    formEmptyHintEl.hidden = true;
    profileFormEl.hidden = false;
    deleteProfileBtn.hidden = true;
    setFormStatus('Sample profile loaded. You can edit and save.', 'success');
    populateForm(sample);
    renderProfileList();
    const sameCheckbox = document.getElementById('field-sameAsPresent');
    if (sameCheckbox) {
      sameCheckbox.checked = true;
      sameCheckbox.dispatchEvent(new Event('change'));
    }
  });
}

if (showSampleJsonBtn) {
  showSampleJsonBtn.addEventListener('click', () => {
    if (sampleJsonDisplay.style.display === 'none') {
      const sample = getSampleProfileData();
      sampleJsonDisplay.textContent = JSON.stringify(sample, null, 2);
      sampleJsonDisplay.style.display = 'block';
      showSampleJsonBtn.textContent = 'Hide Sample JSON';
    } else {
      sampleJsonDisplay.style.display = 'none';
      showSampleJsonBtn.textContent = 'Show Sample JSON';
    }
  });
}

// ----- CV Import: fully offline PDF extraction (no network, no API key) -----
//
// PDF text is extracted locally using the vendored PDF.js build at
// lib/pdfjs/pdf.min.js (worker at lib/pdfjs/pdf.worker.min.js). Field values
// are then derived from that text with regex/keyword pattern matching in
// extractFieldsFromText(). If a PDF has no embedded text layer (e.g. a
// scanned/image-only form), each page is rendered to a canvas and OCR'd
// locally via the vendored Tesseract.js build at lib/tesseract/ (English +
// Bangla trained data, also vendored). Nothing in this section ever leaves
// the browser.

const cvStatusEl = document.getElementById('cv-status');
const cvFileInput = document.getElementById('cv-file-input');
const extractCvBtn = document.getElementById('extract-cv-btn');

/**
 * Lazily configures the vendored PDF.js worker. Safe to call repeatedly.
 */
function ensurePdfJsConfigured() {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error(
      'PDF.js is not loaded. Make sure lib/pdfjs/pdf.min.js is included ' +
      'before profiles.js and lib/pdfjs/pdf.worker.min.js is listed in ' +
      'web_accessible_resources in manifest.json.'
    );
  }
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdfjs/pdf.worker.min.js');
  }
}

/**
 * Checks that the vendored Tesseract.js build is loaded. Actual worker
 * creation happens lazily in runOcrOnPdf() since it's only needed when a
 * PDF has no extractable text layer.
 */
function ensureTesseractAvailable() {
  if (typeof Tesseract === 'undefined') {
    throw new Error(
      'Tesseract.js is not loaded. Make sure lib/tesseract/tesseract.min.js ' +
      'is included before profiles.js and the lib/tesseract/ assets are ' +
      'listed in web_accessible_resources in manifest.json.'
    );
  }
}

/** Set status for CV import area */
function setCvStatus(message, tone) {
  cvStatusEl.textContent = message;
  cvStatusEl.className = 'form-status';
  if (tone) {
    cvStatusEl.classList.add(`form-status--${tone}`);
  }
}

/** Enable/disable extract button based on file presence only (no API key needed) */
function updateExtractButton() {
  if (!cvFileInput || !extractCvBtn) return;
  const hasFile = cvFileInput.files && cvFileInput.files.length > 0;
  extractCvBtn.disabled = !hasFile;
}

if (cvFileInput) cvFileInput.addEventListener('change', updateExtractButton);

/** Read a File as an ArrayBuffer, for local PDF.js parsing. */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Groups raw OCR word boxes into visual rows by y-position, filtering out
 * low-confidence/stray border-line characters. Shared by the flat
 * label:value reconstruction below and the multi-column table parsers
 * (address block, education table) further down, which need row/column
 * structure rather than a flattened string.
 * @param {Array<{text:string, bbox:{x0:number,y0:number,x1:number,y1:number}, confidence:number}>} words
 * @returns {Array<{yc:number, words: Array<{text:string,x0:number,x1:number,y0:number,y1:number,yc:number}>}>}
 */
function groupWordsIntoRows(words) {
  // Table cell borders are frequently misread by Tesseract as tiny stray
  // characters ("A", "H", a lone ":") sitting right at column boundaries —
  // e.g. "Gender : : Male" or "Applicant's Name A MD. HABIBUR RAHMAN".
  // These are near-always low-confidence single-character guesses, so we
  // drop them here rather than trying to patch every downstream regex.
  const CONFIDENCE_FLOOR = 40;
  const items = (words || [])
    .filter((w) => w.text && w.text.trim())
    .filter((w) => w.confidence === undefined || w.confidence >= CONFIDENCE_FLOOR)
    .filter((w) => !/^[:;|.,]{1,2}$/.test(w.text.trim()))
    .map((w) => ({
      text: w.text.trim(),
      x0: w.bbox.x0,
      x1: w.bbox.x1,
      y0: w.bbox.y0,
      y1: w.bbox.y1,
      yc: (w.bbox.y0 + w.bbox.y1) / 2,
    }));

  if (items.length === 0) return [];

  const heights = items.map((it) => it.y1 - it.y0).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 20;
  const Y_TOL = Math.max(8, medianHeight * 0.6);

  items.sort((a, b) => a.yc - b.yc);
  const rows = [];
  for (const it of items) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row.yc - it.yc) <= Y_TOL) {
      row.words.push(it);
      row.yc = (row.yc * (row.words.length - 1) + it.yc) / row.words.length;
    } else {
      rows.push({ yc: it.yc, words: [it] });
    }
  }
  for (const row of rows) row.words.sort((a, b) => a.x0 - b.x0);
  return rows;
}

/**
 * Turns row-grouped words into "Label : Value" text lines by splitting each
 * row at its single widest x-gap. Good enough for simple 2-column forms;
 * genuine multi-column tables (3+ columns) need the specialized parsers
 * below instead, since a single gap can't disambiguate more than 2 columns.
 * @param {ReturnType<typeof groupWordsIntoRows>} rows
 * @param {number} pageWidth
 * @returns {string}
 */
function rowsToLines(rows, pageWidth) {
  const GAP_THRESHOLD = pageWidth * 0.025;
  const lines = [];
  for (const row of rows) {
    let maxGap = 0;
    let splitIdx = -1;
    for (let i = 1; i < row.words.length; i++) {
      const gap = row.words[i].x0 - row.words[i - 1].x1;
      if (gap > maxGap) {
        maxGap = gap;
        splitIdx = i;
      }
    }
    if (splitIdx > 0 && maxGap > GAP_THRESHOLD) {
      const label = row.words.slice(0, splitIdx).map((w) => w.text).join(' ');
      let valueWords = row.words.slice(splitIdx);
      // Safety net: even after confidence filtering, a stray single-char
      // border misread can slip through (e.g. no confidence field at all).
      // A real value is never a lone 1-character token followed by more
      // words, so drop it if that shape shows up.
      if (valueWords.length > 1 && valueWords[0].text.length === 1) {
        valueWords = valueWords.slice(1);
      }
      const value = valueWords.map((w) => w.text).join(' ');
      lines.push(`${label} : ${value}`);
    } else {
      lines.push(row.words.map((w) => w.text).join(' '));
    }
  }
  return lines.join('\n');
}

/**
 * Reconstructs "Label : Value" text lines from raw OCR word boxes, instead
 * of relying on Tesseract's default reading order. This matters for
 * two-column table forms (e.g. government application receipts where the
 * left column holds labels and the right column holds values) — Tesseract's
 * default text output reads such tables column-by-column ("Name of the
 * Post\nUser Id\n...\nMD. HABIBUR RAHMAN\n..."), which breaks every
 * label/value regex in extractFieldsFromText(). Grouping words into rows by
 * y-position and splitting each row into columns at its widest x-gap
 * restores the label-adjacent-to-value layout the regexes expect.
 * @param {Array<{text:string, bbox:{x0:number,y0:number,x1:number,y1:number}, confidence:number}>} words
 * @param {number} pageWidth
 * @returns {string}
 */
function reconstructRowsFromWords(words, pageWidth) {
  return rowsToLines(groupWordsIntoRows(words), pageWidth);
}

/**
 * Parses the side-by-side "Present Address / Permanent Address" block.
 * A single-gap split can't handle this (it's 2 label:value pairs sitting
 * next to each other per row), so instead we anchor a column boundary at
 * the "Permanent" header word and bucket every subsequent address-block
 * word left/right of it, then apply the normal sub-label regexes
 * (Care Of / Vill.../ District / Upazila/P.S. / Post Office / Post Code)
 * independently to each half.
 * @param {ReturnType<typeof groupWordsIntoRows>} rows
 * @returns {object} partial profile data (only fields that were found)
 */
function extractAddressTableFromRows(rows) {
  const out = {};
  const headerIdx = rows.findIndex((r) => {
    const t = r.words.map((w) => w.text).join(' ');
    return /present\s*address/i.test(t) && /permanent\s*address/i.test(t);
  });
  if (headerIdx === -1) return out;

  const headerRow = rows[headerIdx];
  const permWordIdx = headerRow.words.findIndex((w) => /^permanent$/i.test(w.text));
  if (permWordIdx <= 0) return out;
  const boundaryX =
    headerRow.words[permWordIdx].x0 -
    (headerRow.words[permWordIdx].x0 - headerRow.words[permWordIdx - 1].x1) / 2;

  const addrRowRegex = /^(Care\s*Of|Vill|House|District|Upazila|Post\s*Office|Post\s*Code)/i;
  const subLabelPatterns = [
    ['district', /^District\s*[:\-]?\s*(.+)/i],
    ['upazila', /Upazila[^A-Za-z]*(?:P\.?S\.?)?\s*[:\-]?\s*(.+)/i],
    ['post', /Post\s*Office\s*[:\-]?\s*(.+)/i],
    ['postcode', /Post\s*Code\s*[:\-]?\s*(.+)/i],
    ['address', /(?:Vill\/?\s*Road\/?)(?:\s*House\/?\s*Flat)?\s*[:\-]?\s*(.+)/i],
    ['careOf', /Care\s*Of\s*[:\-]?\s*(.+)/i],
  ];

  const present = {};
  const permanent = {};
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.words.map((w) => w.text).join(' ');
    if (/educat|examination/i.test(rowText)) break; // left the address block
    if (!addrRowRegex.test(rowText)) continue;

    const leftText = row.words.filter((w) => w.x0 < boundaryX).map((w) => w.text).join(' ');
    const rightText = row.words.filter((w) => w.x0 >= boundaryX).map((w) => w.text).join(' ');
    for (const [key, pat] of subLabelPatterns) {
      const lm = leftText.match(pat);
      if (lm && lm[1] && lm[1].trim() && !present[key]) present[key] = lm[1].trim();
      const rm = rightText.match(pat);
      if (rm && rm[1] && rm[1].trim() && !permanent[key]) permanent[key] = rm[1].trim();
    }
  }

  if (present.address) out.presentAddress = present.address;
  if (present.district) out.presentDistrict = present.district;
  if (present.upazila) out.presentUpazila = present.upazila;
  if (present.post) out.presentPost = present.post;
  if (present.postcode) out.presentPostcode = present.postcode;
  if (permanent.address) out.permanentAddress = permanent.address;
  if (permanent.district) out.permanentDistrict = permanent.district;
  if (permanent.upazila) out.permanentUpazila = permanent.upazila;
  if (permanent.post) out.permanentPost = permanent.post;
  if (permanent.postcode) out.permanentPostcode = permanent.postcode;

  return out;
}

/**
 * Parses the Educational Info table (Examination | Board/University | Roll
 * | Result | Group/Subject | Year | Duration). This is a genuine N-column
 * table, so column boundaries are anchored from the header row's word
 * x-positions (midpoints between consecutive header words), and every data
 * row's words are bucketed into whichever column boundary they fall inside.
 * @param {ReturnType<typeof groupWordsIntoRows>} rows
 * @returns {object} partial profile data (only fields that were found)
 */
function extractEducationTableFromRows(rows) {
  const out = {};
  const headerIdx = rows.findIndex((r) => {
    const t = r.words.map((w) => w.text).join(' ');
    return /examination/i.test(t) && /roll/i.test(t) && /result/i.test(t);
  });
  if (headerIdx === -1) return out;

  const headerWords = rows[headerIdx].words;
  // Column boundary = midpoint between each header word and the next.
  const boundaries = [];
  for (let i = 1; i < headerWords.length; i++) {
    boundaries.push((headerWords[i - 1].x1 + headerWords[i].x0) / 2);
  }
  const colNames = headerWords.map((w) => w.text.toLowerCase());

  function bucketRow(row) {
    const cells = colNames.map(() => []);
    for (const w of row.words) {
      let col = 0;
      while (col < boundaries.length && w.x0 >= boundaries[col]) col++;
      if (cells[col]) cells[col].push(w.text);
    }
    const cellFor = (matcher) => {
      const idx = colNames.findIndex(matcher);
      return idx >= 0 ? cells[idx].join(' ').trim() : '';
    };
    return {
      exam: cells[0] ? cells[0].join(' ').trim() : '',
      board: cellFor((c) => c.includes('board') || c.includes('university')),
      roll: cellFor((c) => c.includes('roll')),
      result: cellFor((c) => c.includes('result')),
      group: cellFor((c) => c.includes('group') || c.includes('subject')),
      year: cellFor((c) => c.includes('year')),
      duration: cellFor((c) => c.includes('duration')),
    };
  }

  const examRowMap = [
    [/^s\.?\s*s\.?\s*c\.?$/i, 'ssc'],
    [/^h\.?\s*s\.?\s*c\.?$/i, 'hsc'],
    [/^honou?rs$/i, 'gra'],
    [/^(?:b\.?\s*sc\.?|b\.?\s*a\.?|b\.?\s*b\.?\s*a\.?|bachelor)/i, 'gra'],
    [/^m\.?\s*sc\.?$/i, 'mas'],
    [/^(?:m\.?\s*a\.?|m\.?\s*b\.?\s*a\.?|master)/i, 'mas'],
  ];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const firstWord = row.words[0] ? row.words[0].text : '';
    if (/other\s*qualif|declare|signature/i.test(row.words.map((w) => w.text).join(' '))) break;
    const match = examRowMap.find(([re]) => re.test(firstWord));
    if (!match) continue;
    const prefix = match[1];
    const cell = bucketRow(row);

    const resultMatch = cell.result.match(/(\d\.\d{1,2})/);
    const yearMatch = cell.year.match(/(\d{4})/);
    // Guard against Result-column overflow ("CGPA 3.43 (Out of 4)") leaking
    // into the Group/Subject bucket when a cell's text runs wide — strip
    // filler words and parentheses before picking the subject/group name.
    const cleanedGroupText = cell.group
      .replace(/\b(?:of|out|in|on|cgpa|gpa)\b/gi, '')
      .replace(/[()0-9.]/g, '')
      .trim();
    const groupMatch = cleanedGroupText.match(/([A-Za-z]{3,30})/);

    if (cell.board) out[`${prefix}Board`] = cell.board.replace(/\s*\/\s*/g, '/');
    if (cell.roll && /^\d{2,10}$/.test(cell.roll)) out[`${prefix}Roll`] = cell.roll;
    if (resultMatch) out[`${prefix}Result`] = resultMatch[1];
    if (groupMatch) out[`${prefix}Group`] = groupMatch[1];
    if (yearMatch) out[`${prefix}Year`] = yearMatch[1];
    if (cell.duration && /^\d{1,2}$/.test(cell.duration)) out[`${prefix}Duration`] = cell.duration;
    // gra/mas also have an "institute"/"subject" naming in the profile
    // schema (Board/University header serves double duty as institute name
    // for Honors/Masters rows; Group/Subject serves double duty as subject).
    if (prefix === 'gra' || prefix === 'mas') {
      if (cell.board) out[`${prefix}Institute`] = cell.board;
      if (groupMatch) out[`${prefix}Subject`] = groupMatch[1];
    }
  }

  return out;
}

/**
 * Renders every page of a PDF to an offscreen canvas and runs local OCR
 * (Tesseract.js, English + Bangla) on each page image. Used as a fallback
 * when a PDF has no embedded text layer (e.g. a scanned/image-only form).
 * Entirely local — model files are vendored, no network requests are made.
 * @param {File} file
 * @param {(status: string) => void} [onProgress] optional progress callback
 * @returns {Promise<string>}
 */
async function extractTextFromPdfViaOcr(file, onProgress) {
  ensurePdfJsConfigured();
  ensureTesseractAvailable();

  const arrayBuffer = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const worker = await Tesseract.createWorker('eng+ben', 1, {
    workerPath: chrome.runtime.getURL('lib/tesseract/worker.min.js'),
    corePath: chrome.runtime.getURL('lib/tesseract/tesseract-core-lstm.wasm.js'),
    langPath: chrome.runtime.getURL('lib/tesseract/lang-data'),
    gzip: true,
    // IMPORTANT: Tesseract.js defaults to wrapping workerPath in a Blob
    // (workerBlobURL: true) and creating the worker from a blob: URL. That
    // blob-origin worker then tries to importScripts() our
    // chrome-extension://.../worker.min.js URL, which Chrome blocks
    // cross-origin ("Failed to execute 'importScripts' ... failed to
    // load"). Setting this to false makes Tesseract instantiate the worker
    // directly from workerPath instead, which is allowed since the file is
    // declared in web_accessible_resources.
    workerBlobURL: false,
    logger: (msg) => {
      if (onProgress && msg.status) {
        onProgress(msg.status + (msg.progress ? ` (${Math.round(msg.progress * 100)}%)` : ''));
      }
    },
  });

  try {
    const pageTexts = [];
    let tableFields = {};
    // Render at a higher scale than 1:1 for noticeably better OCR accuracy
    // on small form text.
    const RENDER_SCALE = 2;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (onProgress) onProgress(`Rendering page ${pageNum} of ${pdf.numPages}`);
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      if (onProgress) onProgress(`Reading page ${pageNum} of ${pdf.numPages}`);
      const { data } = await worker.recognize(canvas);

      // Prefer position-aware row reconstruction (handles two-column table
      // forms correctly). Fall back to Tesseract's raw text if word boxes
      // are unavailable for some reason.
      const words = data.words && data.words.length ? data.words : null;
      const rows = words ? groupWordsIntoRows(words) : [];
      const reconstructed = rows.length ? rowsToLines(rows, canvas.width) : '';

      pageTexts.push(reconstructed || data.text || '');

      // Genuine multi-column tables (Present/Permanent address block,
      // Educational Info table) can't be captured by the flat 2-column
      // reconstruction above, so parse them separately per page and merge
      // in whatever they find.
      if (rows.length) {
        tableFields = {
          ...extractAddressTableFromRows(rows),
          ...extractEducationTableFromRows(rows),
          ...tableFields,
        };
      }
    }

    return { text: pageTexts.join('\n'), tableFields };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extracts all text content from a PDF file, entirely locally via PDF.js.
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(file) {
  ensurePdfJsConfigured();
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    throw new Error(
      'Could not open this PDF (' +
        (err && (err.message || err.name) ? err.message || err.name : 'unknown PDF.js error') +
        '). It may be corrupted, password-protected, or not a valid PDF.'
    );
  }

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    // Join items with spaces; PDF.js splits text into positioned fragments
    // that don't include natural whitespace between them.
    const pageText = textContent.items.map((item) => item.str).join(' ');
    pageTexts.push(pageText);
  }
  return pageTexts.join('\n');
}

/**
 * Runs a list of regex patterns against the CV text in order, returning the
 * first non-empty capture group match, trimmed. Patterns are tried in order
 * so more specific/labelled patterns should come first.
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {string|null}
 */
function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim()) {
      return match[1]
        .trim()
        .replace(/\s{2,}/g, ' ')
        .replace(/^[,;:]+|[,;:]+$/g, '')
        .trim();
    }
  }
  return null;
}

/**
 * Normalizes a matched date string into YYYY-MM-DD where possible.
 * Accepts DD/MM/YYYY, DD-MM-YYYY, "20 December 1994", "December 20, 1994".
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeDate(raw) {
  if (!raw) return null;
  const s = raw.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/YYYY or DD-MM-YYYY
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // "20 December 1994" or "20 Dec 1994"
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (m) {
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }

  // "20-Dec-1994" (hyphenated day-month name-year)
  m = s.match(/^(\d{1,2})-([A-Za-z]{3,})-(\d{4})$/);
  if (m) {
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }

  // "December 20, 1994" or "December 20 1994"
  m = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mon = months[m[1].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, '0')}`;
  }

  return null; // leave unparsed dates unset rather than guessing wrong
}

/**
 * Extracts profile field values from raw CV text using regex/keyword
 * pattern matching. Entirely local — no network calls. Field labels are
 * matched loosely (case-insensitive, optional colon, flexible spacing) to
 * accommodate varied CV formatting.
 * @param {string} text
 * @returns {object} partial profile data, only fields that were found
 */
function extractFieldsFromText(text) {
  // Normalize whitespace/newlines into single spaces for label matching,
  // but keep an original-lines version for name/first-line heuristics.
  const flat = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const data = {};

  // --- Full name: prefer an explicit "Name:" label, else first non-empty line ---
  data.fullName = firstMatch(flat, [
    /(?:Applicant'?s?|Candidate'?s?)\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})(?:\n|$)/i,
    /(?:^|\n)\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})(?:\n|$)/i,
    /(?:^|\n)\s*Full\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})(?:\n|$)/i
  ]) || (lines[0] && /^[A-Za-z.\s'-]{3,60}$/.test(lines[0]) ? lines[0] : null);

  data.fatherName = firstMatch(flat, [
    /Father'?s?\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})/i
  ]);

  data.motherName = firstMatch(flat, [
    /Mother'?s?\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})/i
  ]);

  data.spouseName = firstMatch(flat, [
    /Spouse'?s?\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})/i,
    /(?:Husband|Wife)'?s?\s*Name\s*[:\-]\s*([A-Za-z.,' 	]{3,60})/i
  ]);

  // --- Bangla-script name fields ---
  // These forms print a Bangla line directly under each English name line
  // (আবেদনকারীর নাম / পিতার নাম / মাতার নাম). Bangla text lives in the
  // Unicode block \u0980-\u09FF; capture group allows Bangla letters,
  // combining marks and spaces. Colons are stripped from the OCR words
  // upstream, so the pattern doesn't require one.
  const BN = '\\u0980-\\u09FF';
  data.nameBn = firstMatch(flat, [
    new RegExp(`আবেদনকারীর\\s*নাম\\s*[:\\-]?\\s*([${BN}\\s]{3,60})(?:\\n|$)`, 'i')
  ]);
  data.fatherBn = firstMatch(flat, [
    new RegExp(`পিতার\\s*নাম\\s*[:\\-]?\\s*([${BN}\\s]{3,60})(?:\\n|$)`, 'i')
  ]);
  data.motherBn = firstMatch(flat, [
    new RegExp(`মাতার\\s*নাম\\s*[:\\-]?\\s*([${BN}\\s]{3,60})(?:\\n|$)`, 'i')
  ]);

  // --- Date of birth ---
  const dobRaw = firstMatch(flat, [
    /Date\s*of\s*Birth\s*[:\-]\s*([0-9A-Za-z,\/\-\s]{6,25})/i,
    /D\.?O\.?B\.?\s*[:\-]\s*([0-9A-Za-z,\/\-\s]{6,25})/i,
    /Birth\s*Date\s*[:\-]\s*([0-9A-Za-z,\/\-\s]{6,25})/i
  ]);
  const normalizedDob = normalizeDate(dobRaw);
  if (normalizedDob) data.dateOfBirth = normalizedDob;

  // --- Gender ---
  const genderRaw = firstMatch(flat, [
    /Gender\s*[:\-]\s*(Male|Female|Other)/i,
    /Sex\s*[:\-]\s*(Male|Female|Other)/i
  ]);
  if (genderRaw) {
    data.gender = genderRaw[0].toUpperCase() + genderRaw.slice(1).toLowerCase();
  }

  // --- Nationality ---
  data.nationality = firstMatch(flat, [
    /Nationality\s*[:\-]\s*([A-Za-z 	]{4,30})/i
  ]) || 'Bangladeshi';

  // --- Religion ---
  data.religion = firstMatch(flat, [
    /Religion\s*[:\-]\s*([A-Za-z 	]{3,20})/i
  ]);

  // --- Marital status ---
  const maritalRaw = firstMatch(flat, [
    /Marital\s*Status\s*[:\-]\s*(Married|Unmarried|Single|Divorced|Widowed)/i
  ]);
  if (maritalRaw) {
    const normalized = /single/i.test(maritalRaw) ? 'Unmarried' : maritalRaw;
    data.maritalStatus = normalized[0].toUpperCase() + normalized.slice(1).toLowerCase();
  }

  // --- Blood group ---
  data.bloodGroup = firstMatch(flat, [
    /Blood\s*Group\s*[:\-]\s*(A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)/i
  ]);

  // --- NID / birth reg / passport ---
  data.nidNo = firstMatch(flat, [
    /N\.?I\.?D\.?\s*(?:No\.?|Number)?\s*[:\-]\s*([0-9]{10,17})/i,
    /National\s*ID\s*(?:No\.?)?\s*[:\-]\s*([0-9]{10,17})/i
  ]);
  if (data.nidNo) data.nidType = 'NID';

  data.birthRegNo = firstMatch(flat, [
    /Birth\s*Reg(?:istration)?\.?\s*(?:No\.?)?\s*[:\-]\s*([0-9]{10,20})/i
  ]);

  data.passportNo = firstMatch(flat, [
    /Passport\s*(?:No\.?|Number|ID)?\s*[:\-]\s*([A-Z0-9]{6,12})/i
  ]);
  // Some forms print "Passport ID : N/A" with no real number — don't keep a
  // literal "N/A" as if it were a value.
  if (data.passportNo && /^n\W*a$/i.test(data.passportNo)) data.passportNo = null;

  // --- Contact info ---
  const mobile = firstMatch(flat, [
    /(?:Mobile|Phone|Cell|Contact)\s*(?:No\.?|Number)?\s*[:\-]\s*(\+?88)?(01[3-9]\d{8})/i,
    /(01[3-9]\d{8})/
  ]) || firstMatch(flat, [/(\+?880\s?1[3-9]\d{8})/]);
  if (mobile) {
    const digitsOnly = mobile.replace(/\D/g, '').replace(/^880/, '0');
    data.mobile = digitsOnly;
    data.mobileConfirm = digitsOnly;
  }

  data.email = firstMatch(flat, [
    /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/
  ]);

  // --- Address blocks ---
  data.presentAddress = firstMatch(flat, [
    /Present\s*Address\s*[:\-]\s*([^\n]{5,120})/i
  ]);
  data.permanentAddress = firstMatch(flat, [
    /Permanent\s*Address\s*[:\-]\s*([^\n]{5,120})/i
  ]);
  data.presentDistrict = firstMatch(flat, [
    /Present\s*(?:Address\s*)?District\s*[:\-]\s*([A-Za-z\s]{3,30})/i
  ]);
  data.permanentDistrict = firstMatch(flat, [
    /Permanent\s*(?:Address\s*)?District\s*[:\-]\s*([A-Za-z\s]{3,30})/i
  ]);
  data.presentPostcode = firstMatch(flat, [
    /Present\s*(?:Address\s*)?Post\s*[- ]?Code\s*[:\-]\s*(\d{4})/i
  ]);
  data.permanentPostcode = firstMatch(flat, [
    /Permanent\s*(?:Address\s*)?Post\s*[- ]?Code\s*[:\-]\s*(\d{4})/i
  ]);

  data.fatherOccupation = firstMatch(flat, [
    /Father'?s?\s*Occupation\s*[:\-]\s*([A-Za-z 	]{3,40})/i
  ]);

  // --- SSC ---
  data.sscBoard = firstMatch(flat, [/S\.?S\.?C\.?[^\n]*Board\s*[:\-]\s*([A-Za-z 	]{3,20})/i]);
  data.sscYear = firstMatch(flat, [/S\.?S\.?C\.?[^\n]*(?:Year|Passing)\s*[:\-]\s*(\d{4})/i, /S\.?S\.?C\.?[^\n]{0,80}(?<!\d)((?:19|20)\d{2})(?!\d)/i]);
  data.sscResult = firstMatch(flat, [/S\.?S\.?C\.?[^\n]*(?:GPA|Result|CGPA)\s*[:\-]\s*(\d\.\d{1,2})/i]);
  data.sscRoll = firstMatch(flat, [/S\.?S\.?C\.?[^\n]*Roll\s*(?:No\.?)?\s*[:\-]\s*(\d{4,8})/i]);
  data.sscGroup = firstMatch(flat, [/S\.?S\.?C\.?[^\n]*Group\s*[:\-]\s*(Science|Commerce|Arts|Humanities)/i]);

  // --- HSC ---
  data.hscBoard = firstMatch(flat, [/H\.?S\.?C\.?[^\n]*Board\s*[:\-]\s*([A-Za-z 	]{3,20})/i]);
  data.hscYear = firstMatch(flat, [/H\.?S\.?C\.?[^\n]*(?:Year|Passing)\s*[:\-]\s*(\d{4})/i, /H\.?S\.?C\.?[^\n]{0,80}(?<!\d)((?:19|20)\d{2})(?!\d)/i]);
  data.hscResult = firstMatch(flat, [/H\.?S\.?C\.?[^\n]*(?:GPA|Result|CGPA)\s*[:\-]\s*(\d\.\d{1,2})/i]);
  data.hscRoll = firstMatch(flat, [/H\.?S\.?C\.?[^\n]*Roll\s*(?:No\.?)?\s*[:\-]\s*(\d{4,8})/i]);
  data.hscGroup = firstMatch(flat, [/H\.?S\.?C\.?[^\n]*Group\s*[:\-]\s*(Science|Commerce|Arts|Humanities)/i]);

  // --- Graduation / Bachelor's ---
  data.graInstitute = firstMatch(flat, [
    /(?:B\.?Sc\.?|B\.?A\.?|B\.?B\.?A\.?|Bachelor)[^\n]*(?:from|,)\s*([A-Za-z\s]{5,60}(?:University|College|Institute))/i,
    /Bachelor'?s?[^\n]*Institut(?:e|ion)\s*[:\-]\s*([A-Za-z\s]{5,60})/i
  ]);
  data.graSubject = firstMatch(flat, [
    /(?:B\.?Sc\.?|Bachelor)[^\n]*in\s+([A-Za-z 	]{3,40})/i
  ]);
  data.graYear = firstMatch(flat, [
    /(?:B\.?Sc\.?|Bachelor)[^\n]{0,60}(\d{4})/i
  ]);
  data.graResult = firstMatch(flat, [
    /(?:B\.?Sc\.?|Bachelor)[^\n]*(?:CGPA|GPA)\s*[:\-]?\s*(\d\.\d{1,2})/i
  ]);

  // --- Masters ---
  data.masInstitute = firstMatch(flat, [
    /(?:M\.?Sc\.?|M\.?A\.?|M\.?B\.?A\.?|Master'?s?)[^\n]*(?:from|,)\s*([A-Za-z\s]{5,60}(?:University|College|Institute))/i
  ]);
  data.masSubject = firstMatch(flat, [
    /(?:M\.?Sc\.?|Master'?s?)[^\n]*in\s+([A-Za-z 	]{3,40})/i
  ]);
  data.masYear = firstMatch(flat, [
    /(?:M\.?Sc\.?|Master'?s?)[^\n]{0,60}(\d{4})/i
  ]);
  data.masResult = firstMatch(flat, [
    /(?:M\.?Sc\.?|Master'?s?)[^\n]*(?:CGPA|GPA)\s*[:\-]?\s*(\d\.\d{1,2})/i
  ]);

  // --- Skills / experience flags (keyword presence, not labelled fields) ---
  data.experienceComputer = /computer\s*(?:literate|skills?|experience)/i.test(flat) ? 'Yes' : null;
  data.experienceSatlipi = /(typing\s*speed|satlipi|words?\s*per\s*minute|wpm)/i.test(flat) ? 'Yes' : null;

  // Strip null/empty values so callers can treat "not present" uniformly.
  for (const key of Object.keys(data)) {
    if (data[key] === null || data[key] === undefined || data[key] === '') {
      delete data[key];
    }
  }

  return data;
}

/**
 * Runs the full offline extraction pipeline: parse PDF text locally, then
 * pattern-match it into profile fields. No network access at any point.
 * @param {File} file
 * @returns {Promise<object>}
 */
/**
 * Runs the full offline extraction pipeline: parse PDF text locally, then
 * pattern-match it into profile fields. No network access at any point.
 * Falls back to local OCR (Tesseract.js) if the PDF has no embedded text
 * layer (e.g. it's a scanned/image-only document).
 * @param {File} file
 * @param {(status: string) => void} [onProgress] optional progress callback
 * @returns {Promise<object>}
 */
async function extractCvData(file, onProgress) {
  let text = await extractTextFromPdf(file);
  let tableFields = {};

  if (!text || !text.trim()) {
    if (onProgress) onProgress('No text layer found — running local OCR');
    const ocrResult = await extractTextFromPdfViaOcr(file, onProgress);
    text = ocrResult.text;
    tableFields = ocrResult.tableFields || {};
  }

  if (!text || !text.trim()) {
    throw new Error('No extractable text found in this PDF, even after OCR. The scan quality may be too low to read.');
  }
  // Regex-based extraction handles simple "Label : Value" fields well; the
  // table parsers (address block, education table) fill in the fields that
  // require real multi-column layout awareness. Regex results win on
  // overlap since they come from cleaner text when a text layer exists.
  // Regex extraction handles simple label:value fields well, but the
  // table parser is more accurate for multi-column education rows.
  // Merge strategy: regex results fill in what tableFields missed, but
  // tableFields wins whenever it already has a non-empty value.
  const regexFields = extractFieldsFromText(text);
  const extracted = { ...regexFields, ...tableFields };
  // --- TEMP DEBUG: remove after diagnosing extraction ---
  console.log('--- OCR reconstructed text ---');
  console.log(text);
  console.log('--- tableFields (address/education parsers) ---');
  console.log(JSON.stringify(tableFields, null, 2));
  console.log('--- extractFieldsFromText() result (final merged) ---');
  console.log(JSON.stringify(extracted, null, 2));
  // --- END TEMP DEBUG ---
  if (Object.keys(extracted).length === 0) {
    throw new Error('Could not confidently match any fields in this CV. You can still fill the form manually.');
  }
  return extracted;
}

/** Populate the profile form with extracted data */
function populateFormWithExtracted(extractedData) {
  // For each text field, set value if present
  for (const key of TEXT_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (input && extractedData[key] !== undefined && extractedData[key] !== null) {
      input.value = extractedData[key];
    }
  }
  // Checkboxes
  for (const key of CHECKBOX_FIELD_KEYS) {
    const input = document.getElementById(`field-${key}`);
    if (input && extractedData[key] !== undefined) {
      input.checked = Boolean(extractedData[key]);
      // If sameAsPresent is checked, trigger change to copy fields
      if (key === 'sameAsPresent' && input.checked) {
        input.dispatchEvent(new Event('change'));
      }
    }
  }
  // If we have a fullName but no name, set name to the first word of fullName as a label
  if (extractedData.fullName && !document.getElementById('field-name').value) {
    const name = extractedData.fullName.split(' ')[0] || 'Profile';
    document.getElementById('field-name').value = name;
  }
  // Optionally set gender, nationality defaults
  if (!document.getElementById('field-nationality').value) {
    document.getElementById('field-nationality').value = 'Bangladeshi';
  }
  // Trigger any dependent logic (e.g., sameAsPresent)
  const sameCheckbox = document.getElementById('field-sameAsPresent');
  if (sameCheckbox.checked) {
    sameCheckbox.dispatchEvent(new Event('change'));
  }
  // Show form if hidden
  if (profileFormEl.hidden) {
    formEmptyHintEl.hidden = true;
    profileFormEl.hidden = false;
    deleteProfileBtn.hidden = true; // new unsaved profile
  }
}

/** Main handler for Extract button */
async function handleExtractCv() {
  const file = cvFileInput.files[0];
  if (!file) {
    setCvStatus('Please select a file.', 'error');
    return;
  }
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
    setCvStatus('Please select a PDF file. Offline extraction currently supports PDF only.', 'error');
    return;
  }

  extractCvBtn.disabled = true;
  setCvStatus('Extracting data offline... please wait.', '');
  try {
    const extracted = await extractCvData(file, (status) => setCvStatus(status, ''));
    populateFormWithExtracted(extracted);
    const foundCount = Object.keys(extracted).length;
    setCvStatus(
      `Extracted ${foundCount} field(s) offline. Review and fill in anything missed, then save the profile.`,
      'success'
    );
    // Scroll to form
    profileFormEl.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    const message =
      (err && typeof err.message === 'string' && err.message) ||
      (typeof err === 'string' && err) ||
      (err && err.name) ||
      'Unknown error while extracting the PDF. See console for details.';
    console.error('CV extraction failed:', err);
    setCvStatus('Error: ' + message, 'error');
  } finally {
    extractCvBtn.disabled = false;
  }
}

if (extractCvBtn) extractCvBtn.addEventListener('click', handleExtractCv);

if (cvFileInput && extractCvBtn) updateExtractButton();

// Initialize the page
initialize();