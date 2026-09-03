/**
 * Project: BD Job Autofill
 * Module: Applications Page Controller
 * Purpose: Loads, renders, creates, updates, and deletes job applications,
 *          binding all applications.html interactions and profile linkage.
 * Author: Lead Engineer
 * Version: 1.0.0
 * Dependencies: background.js (message API)
 * Last Updated: 2026-07-06
 */

const STATUS_LABELS = {
  planned: 'Planned',
  applied: 'Applied',
  admit_card: 'Admit Card',
  exam: 'Exam',
  result: 'Result',
  rejected: 'Rejected'
};

const tableBodyEl = document.getElementById('application-table-body');
const tableEmptyEl = document.getElementById('application-table-empty');
const formEl = document.getElementById('application-form');
const formEmptyHintEl = document.getElementById('application-form-empty-hint');
const formStatusEl = document.getElementById('application-form-status');
const newApplicationBtn = document.getElementById('new-application-btn');
const deleteApplicationBtn = document.getElementById('delete-application-btn');
const appIdInput = document.getElementById('app-id');
const profileSelectEl = document.getElementById('app-profileId');

let applications = [];
let profiles = [];
let selectedApplicationId = null;

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
 * Generates a reasonably unique identifier for a new application.
 * @returns {string}
 */
function generateApplicationId() {
  return `application_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
 * Escapes a string for safe insertion into HTML text content.
 * @param {string} value
 * @returns {string}
 */
function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) for display.
 * @param {string} isoDate
 * @returns {string}
 */
function formatDeadline(isoDate) {
  if (!isoDate) {
    return '—';
  }
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Determines whether a deadline date has passed relative to today.
 * @param {string} isoDate
 * @returns {boolean}
 */
function isOverdue(isoDate) {
  if (!isoDate) {
    return false;
  }
  const deadline = new Date(`${isoDate}T23:59:59`);
  return deadline.getTime() < Date.now();
}

/**
 * Resolves a profile's display label by id.
 * @param {string} profileId
 * @returns {string}
 */
function resolveProfileName(profileId) {
  const profile = profiles.find((p) => p.id === profileId);
  return profile ? profile.name || 'Unnamed profile' : '—';
}

/**
 * Populates the applicant profile select dropdown.
 */
function populateProfileSelect() {
  profileSelectEl.innerHTML = '';
  for (const profile of profiles) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.name || 'Unnamed profile';
    profileSelectEl.appendChild(option);
  }
}

/**
 * Renders the applications table based on the current applications array.
 */
function renderApplicationTable() {
  tableBodyEl.innerHTML = '';

  if (applications.length === 0) {
    tableEmptyEl.hidden = false;
    return;
  }

  tableEmptyEl.hidden = true;

  const sorted = [...applications].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  for (const application of sorted) {
    const row = document.createElement('tr');

    const orgCell = document.createElement('td');
    const orgButton = document.createElement('button');
    orgButton.type = 'button';
    orgButton.className = 'application-table__row-button';
    orgButton.textContent = escapeHtml(application.organization) || 'Untitled';
    orgButton.addEventListener('click', () => selectApplication(application.id));
    orgCell.appendChild(orgButton);
    row.appendChild(orgCell);

    const positionCell = document.createElement('td');
    positionCell.textContent = application.position || '—';
    row.appendChild(positionCell);

    const applicantCell = document.createElement('td');
    applicantCell.textContent = resolveProfileName(application.profileId);
    row.appendChild(applicantCell);

    const deadlineCell = document.createElement('td');
    deadlineCell.textContent = formatDeadline(application.deadline);
    if (isOverdue(application.deadline) && application.status !== 'result' && application.status !== 'rejected') {
      deadlineCell.classList.add('application-table__deadline--overdue');
    }
    row.appendChild(deadlineCell);

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = `status-badge status-badge--${application.status}`;
    statusBadge.textContent = STATUS_LABELS[application.status] || application.status;
    statusCell.appendChild(statusBadge);

    if (application.feeStatus) {
      const feeBadge = document.createElement('span');
      feeBadge.style.display = 'block';
      feeBadge.style.fontSize = '11px';
      feeBadge.style.marginTop = '4px';
      feeBadge.style.fontWeight = '600';
      feeBadge.style.color = application.feeStatus === 'Paid' ? '#16a34a' : '#d97706';
      feeBadge.textContent = `Fee: ${application.feeStatus}`;
      statusCell.appendChild(feeBadge);
    }

    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'application-table__row-button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', () => selectApplication(application.id));
    actionsCell.appendChild(editButton);

    const smsButton = document.createElement('button');
    smsButton.type = 'button';
    smsButton.className = 'application-table__row-button';
    smsButton.style.color = '#0284c7';
    smsButton.style.marginLeft = '8px';
    smsButton.textContent = '📱 Fee SMS';
    smsButton.addEventListener('click', () => {
      window.location.href = 'sms-sync.html';
    });
    actionsCell.appendChild(smsButton);

    row.appendChild(actionsCell);

    tableBodyEl.appendChild(row);
  }
}

/**
 * Populates the form fields with a given application's data.
 * @param {object} application
 */
function populateForm(application) {
  appIdInput.value = application.id || '';
  document.getElementById('app-organization').value = application.organization || '';
  document.getElementById('app-position').value = application.position || '';
  document.getElementById('app-url').value = application.url || '';
  document.getElementById('app-deadline').value = application.deadline || '';
  document.getElementById('app-status').value = application.status || 'planned';
  document.getElementById('app-userId').value = application.userId || '';
  document.getElementById('app-feeStatus').value = application.feeStatus || 'Unpaid';
  document.getElementById('app-password').value = application.password || '';
  document.getElementById('app-notes').value = application.notes || '';

  if (application.profileId && profiles.some((p) => p.id === application.profileId)) {
    profileSelectEl.value = application.profileId;
  } else if (profiles.length > 0) {
    profileSelectEl.value = profiles[0].id;
  }
}

/**
 * Reads current form field values into an application object.
 * @returns {object}
 */
function readFormData() {
  return {
    id: appIdInput.value || generateApplicationId(),
    organization: document.getElementById('app-organization').value.trim(),
    position: document.getElementById('app-position').value.trim(),
    profileId: profileSelectEl.value || '',
    url: document.getElementById('app-url').value.trim(),
    deadline: document.getElementById('app-deadline').value,
    status: document.getElementById('app-status').value,
    userId: (document.getElementById('app-userId').value || '').trim().toUpperCase(),
    feeStatus: document.getElementById('app-feeStatus').value,
    password: (document.getElementById('app-password').value || '').trim(),
    notes: document.getElementById('app-notes').value.trim()
  };
}

/**
 * Selects an application by id, populating the form for editing.
 * @param {string} applicationId
 */
function selectApplication(applicationId) {
  const application = applications.find((a) => a.id === applicationId);
  if (!application) {
    return;
  }

  selectedApplicationId = applicationId;
  formEmptyHintEl.hidden = true;
  formEl.hidden = false;
  deleteApplicationBtn.hidden = false;
  setFormStatus('', '');
  populateForm(application);
}

/**
 * Prepares the form for creating a new application.
 */
function startNewApplication() {
  if (profiles.length === 0) {
    setFormStatus('Create a profile first under Manage Profiles.', 'error');
    return;
  }

  selectedApplicationId = null;
  formEmptyHintEl.hidden = true;
  formEl.hidden = false;
  deleteApplicationBtn.hidden = true;
  setFormStatus('', '');
  populateForm({ id: '', status: 'planned' });
  document.getElementById('app-organization').focus();
}

/**
 * Handles application form submission: validates and saves via message API.
 * @param {SubmitEvent} event
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const organization = document.getElementById('app-organization').value.trim();
  if (!organization) {
    setFormStatus('Organization is required.', 'error');
    return;
  }

  const data = readFormData();

  try {
    applications = await sendMessage('SAVE_APPLICATION', data);
    selectedApplicationId = data.id;
    setFormStatus('Application saved.', 'success');
    deleteApplicationBtn.hidden = false;
    renderApplicationTable();
  } catch (error) {
    setFormStatus(error.message, 'error');
  }
}

/**
 * Handles delete button click: confirms and removes the selected application.
 */
async function handleDeleteClick() {
  if (!selectedApplicationId) {
    return;
  }

  const confirmed = window.confirm('Delete this application? This cannot be undone.');
  if (!confirmed) {
    return;
  }

  try {
    applications = await sendMessage('DELETE_APPLICATION', selectedApplicationId);
    selectedApplicationId = null;
    formEl.hidden = true;
    formEmptyHintEl.hidden = false;
    renderApplicationTable();
  } catch (error) {
    setFormStatus(error.message, 'error');
  }
}

/**
 * Loads all applications and profiles from storage on page initialization.
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    [applications, profiles] = await Promise.all([
      sendMessage('GET_APPLICATIONS'),
      sendMessage('GET_PROFILES')
    ]);
    populateProfileSelect();
    renderApplicationTable();
  } catch (error) {
    setFormStatus(error.message, 'error');
  }
}

if (newApplicationBtn) newApplicationBtn.addEventListener('click', startNewApplication);
if (formEl) formEl.addEventListener('submit', handleFormSubmit);
if (deleteApplicationBtn) deleteApplicationBtn.addEventListener('click', handleDeleteClick);

initialize();