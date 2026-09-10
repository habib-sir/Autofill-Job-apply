/**
 * BD Job Autofill - 16222 Direct SMS Composer & Live Feed Controller
 * Purpose: Direct SMS sending via phone gateway and real-time 16222 reply tracking.
 */

// Default seed messages to show immediately if local storage and server are empty
const DEFAULT_INITIAL_MESSAGES = [
  {
    id: 'msg_welcome',
    direction: 'system',
    sender: 'BD Job SMS Assistant',
    recipient: 'System',
    body: 'Welcome to BD Job Autofill 16222 SMS Gateway. Send application fee SMS directly to 16222 and view live reply PINs & confirmation credentials here.',
    timestamp: new Date().toISOString()
  },
  {
    id: 'inc_sample_pin',
    direction: 'incoming',
    sender: '16222',
    recipient: 'My Teletalk Phone',
    body: "Applicant's Name: MD HABIBUR RAHMAN, Tk. 220 will be charged as application fee. Your PIN is 87654321. To pay fee type: BPSC YES 87654321 and send to 16222",
    parsed: {
      isTeletalk: true,
      type: 'PIN_NOTIFICATION',
      pin: '87654321',
      fee: '220',
      applicantName: 'MD HABIBUR RAHMAN',
      userId: null,
      password: null,
      suggestedReply: 'BPSC YES 87654321'
    },
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

// Storage keys
const STORAGE_KEY_MESSAGES = 'bd_job_sms_messages';
const STORAGE_KEY_CUSTOM_HOST = 'bd_job_sms_custom_host';

// State
let feedMessages = [];
let currentFilter = 'all';
let currentSearch = '';
let isServerOnline = false;
let pollingInterval = null;

// DOM Elements: Header & Status
const serverStatusPill = document.getElementById('server-status-pill');
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const refreshStateBtn = document.getElementById('refresh-state-btn');

// DOM Elements: Section 1 - 16222 Direct SMS Composer
const selectSavedApp = document.getElementById('select-saved-app');
const customRecipient = document.getElementById('custom-recipient');
const customBody = document.getElementById('custom-body');
const charCounter = document.getElementById('char-counter');
const chip1stSms = document.getElementById('chip-1st-sms');
const chip2ndSms = document.getElementById('chip-2nd-sms');
const chipHelpSms = document.getElementById('chip-help-sms');
const sendCustomSmsBtn = document.getElementById('send-custom-sms-btn');
const copyCustomSmsBtn = document.getElementById('copy-custom-sms-btn');
const openSmsAppLink = document.getElementById('open-sms-app-link');
const toggleQrBtn = document.getElementById('toggle-qr-btn');
const composerQrPanel = document.getElementById('composer-qr-panel');
const composerQrCanvas = document.getElementById('composer-qr-canvas');
const customSmsStatus = document.getElementById('custom-sms-status');
const currentGatewayLabel = document.getElementById('current-gateway-label');
const toggleServerConfigBtn = document.getElementById('toggle-server-config-btn');
const serverConfigDetails = document.getElementById('server-config-details');
const customServerUrlInput = document.getElementById('custom-server-url-input');
const saveServerUrlBtn = document.getElementById('save-server-url-btn');
const resetServerUrlBtn = document.getElementById('reset-server-url-btn');

// DOM Elements: Section 2 - Phone SMS Inbox & 16222 Live Feed
const smsFeedContainer = document.getElementById('sms-feed-container');
const smsCountBadge = document.getElementById('sms-count-badge');
const filterAllBtn = document.getElementById('filter-all-btn');
const filter16222Btn = document.getElementById('filter-16222-btn');
const filterSentBtn = document.getElementById('filter-sent-btn');
const refreshFeedBtn = document.getElementById('refresh-feed-btn');
const clearFeedBtn = document.getElementById('clear-feed-btn');
const smsSearchInput = document.getElementById('sms-search-input');
const smsToast = document.getElementById('sms-toast');

/**
 * Display toast notification
 */
function showToast(text, duration = 3000) {
  if (!smsToast) return;
  smsToast.textContent = text;
  smsToast.style.display = 'flex';
  clearTimeout(smsToast._timer);
  smsToast._timer = setTimeout(() => {
    smsToast.style.display = 'none';
  }, duration);
}

/**
 * Determine base API URL for server requests
 */
function getApiBaseUrl() {
  const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_HOST);
  if (custom && custom.trim()) {
    let url = custom.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }
    return url.replace(/\/+$/, '');
  }

  // Inside Chrome Extension or file protocol, point to local server
  if (window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'moz-extension:' ||
      window.location.protocol === 'file:') {
    return 'http://localhost:3000';
  }

  // Running on web server (Cloud Run, local dev, preview)
  return window.location.origin;
}

/**
 * Safe fetch wrapper that handles network errors gracefully without crashing
 */
async function apiFetch(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({ ok: false, error: 'Invalid JSON response' }));
    return { ok: res.ok && data.ok, status: res.status, data, url };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      isNetworkError: true,
      error: err.name === 'AbortError' ? 'Connection timed out' : (err.message || 'Failed to connect'),
      url
    };
  }
}

/**
 * Teletalk SMS Content Parser for 16222 replies
 */
function parseTeletalkSms(body) {
  const result = {
    isTeletalk: false,
    type: 'UNKNOWN',
    pin: null,
    fee: null,
    applicantName: null,
    userId: null,
    password: null,
    suggestedReply: null
  };

  if (!body || typeof body !== 'string') return result;
  const text = body.trim();

  // Raw PIN entered
  if (/^[0-9]{6,10}$/.test(text)) {
    result.isTeletalk = true;
    result.type = 'PIN_NOTIFICATION';
    result.pin = text;
    result.suggestedReply = `BPSC YES ${text}`;
    return result;
  }

  // 1st SMS reply with PIN
  const pinMatch = text.match(/(?:PIN\s*(?:is|:|=|-)?|your\s*PIN\s*(?:is|:|=|-)?)\s*([0-9]{6,10})/i) ||
                   text.match(/PIN\s*[:= ]*\s*([0-9]{6,10})/i);
  const feeMatch = text.match(/Tk\.?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i) ||
                   text.match(/([0-9]+)\s*Tk/i);
  const nameMatch = text.match(/Applicant(?:'s)?\s*Name\s*:\s*([^,\n\.]+)/i);
  const startNameMatch = text.match(/^([A-Z\s\.\-]{3,35}),\s*(?:Tk|Application)/i);
  const payTypeMatch = text.match(/type\s*(?:is|:)?\s*([A-Za-z0-9]+\s+YES\s+[0-9]+)/i) ||
                       text.match(/([A-Za-z0-9]+\s+YES\s+[0-9]{6,10})/i);

  // 2nd Confirmation SMS reply with User ID & Password
  const userMatch = text.match(/User\s*ID\s*(?:is|:)?\s*([A-Za-z0-9]+)/i);
  const passMatch = text.match(/Password\s*(?:is|:)?\s*([A-Za-z0-9@#\$%\^&\*!]+)/i);

  if (pinMatch) {
    result.isTeletalk = true;
    result.type = 'PIN_NOTIFICATION';
    result.pin = pinMatch[1];
    if (feeMatch) result.fee = feeMatch[1];
    if (nameMatch) {
      result.applicantName = nameMatch[1].trim();
    } else if (startNameMatch) {
      result.applicantName = startNameMatch[1].trim();
    }
    if (payTypeMatch) {
      result.suggestedReply = payTypeMatch[1].trim();
    } else {
      result.suggestedReply = `BPSC YES ${result.pin}`;
    }
  } else if (passMatch) {
    result.isTeletalk = true;
    result.type = 'PAYMENT_CONFIRMATION';
    result.password = passMatch[1];
    if (userMatch) result.userId = userMatch[1];
    if (nameMatch) {
      result.applicantName = nameMatch[1].trim();
    } else if (startNameMatch) {
      result.applicantName = startNameMatch[1].trim();
    }
  } else if (payTypeMatch) {
    result.isTeletalk = true;
    result.type = 'PIN_NOTIFICATION';
    const parts = payTypeMatch[1].split(/\s+/);
    if (parts.length >= 3) {
      result.pin = parts[2];
      result.suggestedReply = payTypeMatch[1].trim();
    }
  }

  return result;
}

/**
 * Load local messages from chrome.storage or localStorage
 */
async function loadLocalMessages() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await new Promise(resolve => {
        chrome.storage.local.get([STORAGE_KEY_MESSAGES], res => resolve(res[STORAGE_KEY_MESSAGES]));
      });
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    }
  } catch (e) {
    console.debug('chrome.storage.local read skipped:', e);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.debug('localStorage read skipped:', e);
  }

  return DEFAULT_INITIAL_MESSAGES;
}

/**
 * Persist messages locally
 */
async function saveLocalMessages(messages) {
  feedMessages = messages;
  try {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  } catch (e) {}

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY_MESSAGES]: messages });
    }
  } catch (e) {}
}

/**
 * Merge new messages with existing local list without duplicates
 */
function mergeMessages(existingList, incomingList) {
  const merged = [...existingList];
  for (const item of incomingList) {
    if (!item) continue;
    const exists = merged.some(m => {
      if (m.id && item.id && m.id === item.id) return true;
      if (m.body === item.body && Math.abs(new Date(m.timestamp || 0) - new Date(item.timestamp || 0)) < 2000) return true;
      return false;
    });
    if (!exists) {
      if (!item.parsed && item.body) {
        item.parsed = parseTeletalkSms(item.body);
      }
      merged.push(item);
    }
  }

  // Sort chronological descending (latest first)
  merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  return merged;
}

/**
 * Render SMS Feed messages
 */
function renderFeed() {
  if (!smsFeedContainer) return;

  let filtered = [...feedMessages];

  if (currentFilter === '16222') {
    filtered = filtered.filter(m =>
      (m.sender && m.sender.includes('16222')) ||
      (m.recipient && m.recipient.includes('16222')) ||
      (m.parsed && m.parsed.isTeletalk)
    );
  } else if (currentFilter === 'sent') {
    filtered = filtered.filter(m => m.direction === 'outgoing');
  }

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(m =>
      (m.body && m.body.toLowerCase().includes(q)) ||
      (m.sender && m.sender.toLowerCase().includes(q)) ||
      (m.parsed && m.parsed.pin && m.parsed.pin.includes(q)) ||
      (m.parsed && m.parsed.applicantName && m.parsed.applicantName.toLowerCase().includes(q)) ||
      (m.parsed && m.parsed.fee && m.parsed.fee.includes(q))
    );
  }

  if (smsCountBadge) {
    smsCountBadge.textContent = `${filtered.length} messages`;
  }

  if (filtered.length === 0) {
    smsFeedContainer.innerHTML = `
      <div style="text-align: center; color: var(--color-text-muted); font-size: 13px; padding: 30px 16px;">
        <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
        <strong>No SMS messages found</strong>
        <p style="margin: 4px 0 0 0; font-size: 11px;">
          ${currentSearch ? 'No messages match your search keyword.' : 'When your connected phone sends or receives an SMS, it will appear here in real time.'}
        </p>
      </div>
    `;
    return;
  }

  let html = '';
  filtered.forEach(msg => {
    const isIncoming = msg.direction === 'incoming';
    const is16222 = isIncoming && (msg.sender === '16222' || (msg.parsed && msg.parsed.isTeletalk));
    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : '';

    let bubbleClass = 'msg-bubble';
    if (is16222) bubbleClass += ' msg-bubble-16222';
    else if (isIncoming) bubbleClass += ' msg-bubble--incoming';
    else bubbleClass += ' msg-bubble-outgoing';

    html += `
      <div class="${bubbleClass}" style="margin-bottom: 10px; border-radius: 8px; padding: 12px 14px;">
        <div class="msg-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-weight: 700; ${is16222 ? 'color: #0284c7;' : isIncoming ? 'color: #166534;' : 'color: #1d4ed8;'}">
              ${isIncoming ? (is16222 ? '📱 16222 (Teletalk Reply)' : `📩 From: ${escapeHtml(msg.sender || 'Unknown')}`) : '📲 Sent from Phone (To: ' + escapeHtml(msg.recipient || '16222') + ')'}
            </span>
            ${msg.status ? `<span style="background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${escapeHtml(msg.status)}</span>` : ''}
          </div>
          <span style="color: var(--color-text-muted);">${dateStr} ${timeStr}</span>
        </div>

        <!-- Highlighted Teletalk Details -->
        ${msg.parsed && msg.parsed.pin ? `
          <div class="feed-pin-box">
            <div>
              <span style="font-size: 11px; color: #047857; font-weight: 600;">Extracted Teletalk PIN:</span>
              <span class="feed-pin-val">${escapeHtml(msg.parsed.pin)}</span>
              ${msg.parsed.fee ? `<span style="margin-left: 8px; font-size: 11px; font-weight: 700; color: #047857;">Fee: Tk. ${escapeHtml(msg.parsed.fee)}</span>` : ''}
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary btn-sm copy-pin-action" data-pin="${escapeHtml(msg.parsed.pin)}" style="font-size: 11px; padding: 2px 8px;" type="button">
                📋 Copy PIN
              </button>
              <button class="btn btn-primary btn-sm use-pin-action" data-pin="${escapeHtml(msg.parsed.pin)}" data-reply="${escapeHtml(msg.parsed.suggestedReply || '')}" style="font-size: 11px; padding: 2px 8px;" type="button">
                ⚡ Insert in Composer
              </button>
            </div>
          </div>
        ` : ''}

        ${msg.parsed && msg.parsed.password ? `
          <div class="feed-cred-box">
            <div style="font-weight: 700; color: #1e40af; margin-bottom: 2px;">🎉 Payment Confirmed Credentials:</div>
            <div>User ID: <strong>${escapeHtml(msg.parsed.userId || '--')}</strong> &bull; Password: <strong style="font-family: monospace; font-size: 14px; background: #dbeafe; padding: 1px 6px; border-radius: 4px;">${escapeHtml(msg.parsed.password)}</strong></div>
          </div>
        ` : ''}

        <!-- Message Body -->
        <div style="font-size: 13px; color: var(--color-text); line-height: 1.45; word-break: break-word; font-family: ${is16222 ? 'monospace' : 'inherit'};">
          ${escapeHtml(msg.body || '')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button class="btn btn-secondary btn-sm copy-msg-body-action" data-text="${escapeHtml(msg.body || '')}" style="font-size: 10px; padding: 2px 6px;" type="button">
            📋 Copy SMS
          </button>
        </div>
      </div>
    `;
  });

  smsFeedContainer.innerHTML = html;

  // Attach dynamic button handlers
  smsFeedContainer.querySelectorAll('.copy-pin-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pin = e.currentTarget.getAttribute('data-pin');
      if (pin) {
        navigator.clipboard.writeText(pin);
        showToast(`📋 Copied PIN: ${pin}`);
      }
    });
  });

  smsFeedContainer.querySelectorAll('.use-pin-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pin = e.currentTarget.getAttribute('data-pin');
      const suggested = e.currentTarget.getAttribute('data-reply');
      if (customBody) {
        customBody.value = suggested || `BPSC YES ${pin}`;
        updateCharCount();
        updateSmsLinkAndQr();
        customBody.scrollIntoView({ behavior: 'smooth', block: 'center' });
        customBody.focus();
        showToast(`⚡ Inserted PIN into Composer!`);
      }
    });
  });

  smsFeedContainer.querySelectorAll('.copy-msg-body-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const text = e.currentTarget.getAttribute('data-text');
      if (text) {
        navigator.clipboard.writeText(text);
        showToast('📋 Copied full message text');
      }
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Update character counter and SMS segment calculation
 */
function updateCharCount() {
  if (!customBody || !charCounter) return;
  const len = customBody.value.length;
  const parts = Math.max(1, Math.ceil(len / 160));
  charCounter.textContent = `${len} chars • ${parts} SMS`;
}

/**
 * Update SMS App link and QR code canvas
 */
function updateSmsLinkAndQr() {
  const recipient = (customRecipient && customRecipient.value.trim()) || '16222';
  const body = (customBody && customBody.value.trim()) || '';
  const encodedBody = encodeURIComponent(body);
  const smsUri = `sms:${recipient}?body=${encodedBody}`;

  if (openSmsAppLink) {
    openSmsAppLink.href = smsUri;
  }

  if (composerQrCanvas && typeof QRCode !== 'undefined') {
    try {
      QRCode.toCanvas(composerQrCanvas, smsUri, {
        width: 90,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      }, (err) => {
        if (err) console.debug('QR render err:', err);
      });
    } catch (e) {
      console.debug('QR canvas generation error:', e);
    }
  }
}

/**
 * Check gateway server status and update UI pill
 */
async function checkServerStatus() {
  const base = getApiBaseUrl();
  if (currentGatewayLabel) {
    currentGatewayLabel.textContent = base;
  }

  const result = await apiFetch('/api/sms/state');
  if (result.ok && result.data) {
    isServerOnline = true;
    if (serverStatusPill) {
      serverStatusPill.className = 'server-status-pill server-status-pill--online';
    }
    if (serverStatusText) {
      const devName = result.data.pairedDevice ? result.data.pairedDevice.name : 'Server Online';
      serverStatusText.textContent = `🟢 ${devName} (${base.replace(/^https?:\/\//, '')})`;
    }

    // Merge server messages with local messages
    if (Array.isArray(result.data.messages)) {
      const merged = mergeMessages(feedMessages, result.data.messages);
      await saveLocalMessages(merged);
      renderFeed();
    }
  } else {
    isServerOnline = false;
    if (serverStatusPill) {
      serverStatusPill.className = 'server-status-pill server-status-pill--offline';
    }
    if (serverStatusText) {
      serverStatusText.textContent = `🟡 Local Outbox (Server Offline)`;
    }
  }
}

/**
 * Handle sending custom SMS from Composer
 */
async function handleSendCustomSms() {
  const recipient = (customRecipient && customRecipient.value.trim()) || '16222';
  const body = (customBody && customBody.value.trim()) || '';

  if (!recipient || !body) {
    setCustomSmsStatus('Please enter both recipient number and SMS body.', 'error');
    if (!body && customBody) customBody.focus();
    return;
  }

  sendCustomSmsBtn.disabled = true;
  setCustomSmsStatus(`⏳ Dispatching SMS to ${recipient}...`, 'info');

  const parsed = parseTeletalkSms(body);
  const newMsg = {
    id: 'out_' + Date.now(),
    direction: 'outgoing',
    sender: 'Desktop Composer',
    recipient,
    body,
    parsed,
    status: 'DISPATCHING',
    timestamp: new Date().toISOString()
  };

  // Add immediately to local feed so user sees it instantly
  feedMessages.unshift(newMsg);
  await saveLocalMessages(feedMessages);
  renderFeed();

  // Dispatch to server gateway
  const result = await apiFetch('/api/sms/send', {
    method: 'POST',
    body: JSON.stringify({
      recipient,
      body,
      type: parsed.type || 'CUSTOM'
    })
  });

  if (result.ok) {
    newMsg.status = 'DISPATCHED_TO_PHONE';
    await saveLocalMessages(feedMessages);
    renderFeed();
    setCustomSmsStatus(`✅ Dispatched to phone gateway! Your Teletalk SIM is sending now.`, 'success');
    showToast(`📲 SMS sent to Phone Gateway (${recipient})`);
  } else {
    // Server is unreachable or local development
    newMsg.status = 'SAVED_TO_OUTBOX';
    await saveLocalMessages(feedMessages);
    renderFeed();
    setCustomSmsStatus(`💾 Saved to Outbox! Gateway server is offline. Click "Open SMS App" or Scan QR to send directly.`, 'warning');
    showToast(`💾 SMS saved to Outbox (Phone Gateway Offline)`);
  }

  sendCustomSmsBtn.disabled = false;
}

function setCustomSmsStatus(message, type) {
  if (!customSmsStatus) return;
  customSmsStatus.style.display = 'block';
  customSmsStatus.textContent = message;

  if (type === 'success') {
    customSmsStatus.style.background = '#dcfce7';
    customSmsStatus.style.color = '#166534';
    customSmsStatus.style.border = '1px solid #86efac';
  } else if (type === 'warning') {
    customSmsStatus.style.background = '#fef3c7';
    customSmsStatus.style.color = '#92400e';
    customSmsStatus.style.border = '1px solid #fde68a';
  } else if (type === 'error') {
    customSmsStatus.style.background = '#fee2e2';
    customSmsStatus.style.color = '#991b1b';
    customSmsStatus.style.border = '1px solid #fca5a5';
  } else {
    customSmsStatus.style.background = '#f0f9ff';
    customSmsStatus.style.color = '#0369a1';
    customSmsStatus.style.border = '1px solid #bae6fd';
  }
}

/**
 * Load saved applications into quick-load dropdown
 */
async function loadSavedApplications() {
  if (!selectSavedApp) return;

  let apps = [];
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      apps = await new Promise(resolve => {
        chrome.storage.local.get(['applications'], res => resolve(res.applications || []));
      });
    }
  } catch (e) {}

  if (!apps || apps.length === 0) {
    try {
      const raw = localStorage.getItem('applications');
      if (raw) apps = JSON.parse(raw);
    } catch (e) {}
  }

  if (Array.isArray(apps) && apps.length > 0) {
    selectSavedApp.innerHTML = '<option value="">-- Choose an application to auto-fill SMS --</option>';
    apps.forEach(app => {
      const opt = document.createElement('option');
      opt.value = app.id || app.userId;
      const org = app.orgCode || 'BPSC';
      const uid = app.userId || 'APP';
      const post = app.jobPost || app.title || '';
      opt.textContent = `${org} - ${uid} (${post.substring(0, 24)})`;
      opt.dataset.org = org;
      opt.dataset.uid = uid;
      selectSavedApp.appendChild(opt);
    });
  }
}

/**
 * Initialize all event listeners and state
 */
async function init() {
  // 1. Load and render local messages immediately
  feedMessages = await loadLocalMessages();
  renderFeed();

  // 2. Setup Saved Applications dropdown
  await loadSavedApplications();
  if (selectSavedApp) {
    selectSavedApp.addEventListener('change', () => {
      const selectedOpt = selectSavedApp.selectedOptions[0];
      if (selectedOpt && selectedOpt.dataset && selectedOpt.dataset.uid) {
        const org = selectedOpt.dataset.org || 'BPSC';
        const uid = selectedOpt.dataset.uid;
        if (customBody) {
          customBody.value = `${org} ${uid}`;
          updateCharCount();
          updateSmsLinkAndQr();
        }
      }
    });
  }

  // 3. Quick template format chips
  if (chip1stSms) {
    chip1stSms.addEventListener('click', () => {
      if (customBody) {
        customBody.value = 'BPSC 7A8B9C';
        updateCharCount();
        updateSmsLinkAndQr();
        customBody.focus();
      }
    });
  }

  if (chip2ndSms) {
    chip2ndSms.addEventListener('click', () => {
      if (customBody) {
        customBody.value = 'BPSC YES 87654321';
        updateCharCount();
        updateSmsLinkAndQr();
        customBody.focus();
      }
    });
  }

  if (chipHelpSms) {
    chipHelpSms.addEventListener('click', () => {
      if (customBody) {
        customBody.value = '16222 HELP';
        updateCharCount();
        updateSmsLinkAndQr();
        customBody.focus();
      }
    });
  }

  // 4. Character count and input updates
  if (customBody) {
    customBody.addEventListener('input', () => {
      updateCharCount();
      updateSmsLinkAndQr();
    });
  }

  if (customRecipient) {
    customRecipient.addEventListener('input', () => {
      updateSmsLinkAndQr();
    });
  }

  // 5. Send & Copy buttons
  if (sendCustomSmsBtn) {
    sendCustomSmsBtn.addEventListener('click', handleSendCustomSms);
  }

  if (copyCustomSmsBtn) {
    copyCustomSmsBtn.addEventListener('click', () => {
      const body = (customBody && customBody.value.trim()) || '';
      if (!body) {
        showToast('Please enter an SMS body to copy');
        return;
      }
      navigator.clipboard.writeText(body);
      showToast('📋 Copied SMS text to clipboard!');
    });
  }

  // 6. QR Code Toggle
  if (toggleQrBtn && composerQrPanel) {
    toggleQrBtn.addEventListener('click', () => {
      const isHidden = composerQrPanel.style.display === 'none';
      composerQrPanel.style.display = isHidden ? 'block' : 'none';
      toggleQrBtn.classList.toggle('btn-primary', isHidden);
      toggleQrBtn.classList.toggle('btn-secondary', !isHidden);
      if (isHidden) {
        updateSmsLinkAndQr();
      }
    });
  }

  // 7. Feed Filter Buttons
  function setFeedFilter(filter) {
    currentFilter = filter;
    if (filterAllBtn) filterAllBtn.className = filter === 'all' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (filter16222Btn) filter16222Btn.className = filter === '16222' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (filterSentBtn) filterSentBtn.className = filter === 'sent' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    renderFeed();
  }

  if (filterAllBtn) filterAllBtn.addEventListener('click', () => setFeedFilter('all'));
  if (filter16222Btn) filter16222Btn.addEventListener('click', () => setFeedFilter('16222'));
  if (filterSentBtn) filterSentBtn.addEventListener('click', () => setFeedFilter('sent'));

  // 8. Search input
  if (smsSearchInput) {
    smsSearchInput.addEventListener('input', (e) => {
      currentSearch = (e.target.value || '').trim();
      renderFeed();
    });
  }

  // 9. Feed Refresh & Clear
  if (refreshFeedBtn) {
    refreshFeedBtn.addEventListener('click', async () => {
      refreshFeedBtn.disabled = true;
      refreshFeedBtn.innerHTML = '<span>🔄</span> Syncing...';
      await checkServerStatus();
      refreshFeedBtn.disabled = false;
      refreshFeedBtn.innerHTML = '<span>🔄</span> Refresh';
      showToast('🔄 Feed refreshed!');
    });
  }

  if (refreshStateBtn) {
    refreshStateBtn.addEventListener('click', async () => {
      await checkServerStatus();
      showToast('🔄 Status updated');
    });
  }

  if (clearFeedBtn) {
    clearFeedBtn.addEventListener('click', async () => {
      if (confirm('Clear all messages from your Live Feed?')) {
        feedMessages = [];
        await saveLocalMessages([]);
        renderFeed();
        showToast('🗑️ Message history cleared');
      }
    });
  }

  // 10. Server Settings Config
  if (toggleServerConfigBtn && serverConfigDetails) {
    toggleServerConfigBtn.addEventListener('click', () => {
      const isHidden = serverConfigDetails.style.display === 'none';
      serverConfigDetails.style.display = isHidden ? 'block' : 'none';
      if (isHidden && customServerUrlInput) {
        customServerUrlInput.value = localStorage.getItem(STORAGE_KEY_CUSTOM_HOST) || getApiBaseUrl();
      }
    });
  }

  if (serverStatusPill && serverConfigDetails) {
    serverStatusPill.addEventListener('click', () => {
      serverConfigDetails.style.display = 'block';
      if (customServerUrlInput) {
        customServerUrlInput.value = localStorage.getItem(STORAGE_KEY_CUSTOM_HOST) || getApiBaseUrl();
        customServerUrlInput.focus();
      }
    });
  }

  if (saveServerUrlBtn && customServerUrlInput) {
    saveServerUrlBtn.addEventListener('click', async () => {
      const val = customServerUrlInput.value.trim();
      if (val) {
        localStorage.setItem(STORAGE_KEY_CUSTOM_HOST, val);
        showToast(`Saved Gateway: ${val}`);
      } else {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_HOST);
        showToast('Reset Gateway to default');
      }
      if (serverConfigDetails) serverConfigDetails.style.display = 'none';
      await checkServerStatus();
    });
  }

  if (resetServerUrlBtn) {
    resetServerUrlBtn.addEventListener('click', async () => {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_HOST);
      if (customServerUrlInput) customServerUrlInput.value = '';
      if (serverConfigDetails) serverConfigDetails.style.display = 'none';
      showToast('Reset Gateway to default localhost:3000');
      await checkServerStatus();
    });
  }

  // Initial update
  updateCharCount();
  updateSmsLinkAndQr();

  // Check server status
  await checkServerStatus();

  // Background polling every 5 seconds
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(checkServerStatus, 5000);
}

// Start on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
