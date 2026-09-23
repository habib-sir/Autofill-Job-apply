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
    body: "Applicant's Name: MD ABDUR RAHIM, Tk. 220 will be charged as application fee. Your PIN is 87654321. To pay fee type: BPSC YES 87654321 and send to 16222",
    parsed: {
      isTeletalk: true,
      type: 'PIN_NOTIFICATION',
      pin: '87654321',
      fee: '220',
      applicantName: 'MD ABDUR RAHIM',
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
let activeTrackingJobId = null;
let activeTrackingInterval = null;
let currentSimBalance = null;
let currentPairedDevice = null;

// DOM Elements: Header & Status
const serverStatusPill = document.getElementById('server-status-pill');
const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');
const refreshStateBtn = document.getElementById('refresh-state-btn');

// DOM Elements: Teletalk SIM Balance Card
const simBalanceCard = document.getElementById('sim-balance-card');
const teletalkBalanceVal = document.getElementById('teletalk-balance-val');
const balanceLastUpdated = document.getElementById('balance-last-updated');
const balanceSourceTag = document.getElementById('balance-source-tag');
const checkBalanceBtn = document.getElementById('check-balance-btn');
const checkBalanceIcon = document.getElementById('check-balance-icon');
const checkBalanceText = document.getElementById('check-balance-text');
const balancePhoneStatusTag = document.getElementById('balance-phone-status-tag');
const phoneOfflineGuideBox = document.getElementById('phone-offline-guide-box');
const closeOfflineGuideBtn = document.getElementById('close-offline-guide-btn');
const dialUssdBtn = document.getElementById('dial-ussd-btn');
const toggleBalanceEditBtn = document.getElementById('toggle-balance-edit-btn');
const balanceEditBox = document.getElementById('balance-edit-box');
const balanceInputField = document.getElementById('balance-input-field');
const saveBalanceBtn = document.getElementById('save-balance-btn');
const cancelBalanceBtn = document.getElementById('cancel-balance-btn');

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

// DOM Elements: Active Job Status Tracker (Sent from Phone indicator)
const activeJobTracker = document.getElementById('active-job-tracker');
const trackerStatusIcon = document.getElementById('tracker-status-icon');
const trackerStatusTitle = document.getElementById('tracker-status-title');
const trackerJobId = document.getElementById('tracker-job-id');
const trackerStatusDesc = document.getElementById('tracker-status-desc');
const trackerDetails = document.getElementById('tracker-details');

// DOM Elements: Phone App Pairing Panel
const pairingServerUrlInput = document.getElementById('pairing-server-url');
const pairingCodeInput = document.getElementById('pairing-code');
const copyPairingUrlBtn = document.getElementById('copy-pairing-url-btn');
const copyPairingCodeBtn = document.getElementById('copy-pairing-code-btn');
const regeneratePairingCodeBtn = document.getElementById('regenerate-pairing-code-btn');
const pairingPhoneStatus = document.getElementById('pairing-phone-status');

// DOM Elements: Section 2 - Phone SMS Inbox & 16222 Live Feed
const smsFeedContainer = document.getElementById('sms-feed-container');
const smsCountBadge = document.getElementById('sms-count-badge');
const filterAllBtn = document.getElementById('filter-all-btn');
const filter16222Btn = document.getElementById('filter-16222-btn');
const filterSentBtn = document.getElementById('filter-sent-btn');
const filterPendingBtn = document.getElementById('filter-pending-btn');
const refreshFeedBtn = document.getElementById('refresh-feed-btn');
const clearFeedBtn = document.getElementById('clear-feed-btn');
const smsSearchInput = document.getElementById('sms-search-input');
const clearStatusBanner = document.getElementById('clear-status-banner');
const loadSampleFeedBtn = document.getElementById('load-sample-feed-btn');
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
  const timeoutId = setTimeout(() => controller.abort(), 8000);

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

  // Balance pattern check (from *152# or Teletalk notifications)
  const balanceMatch = text.match(/(?:current\s*balance|main\s*balance|balance|acc\s*balance)\s*(?:is|:|=|-)?\s*(?:Tk\.?|BDT)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                       text.match(/(?:Tk\.?|BDT)\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:balance|remaining)/i) ||
                       text.match(/(?:Balance|Tk\.?)\s*[:=]\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (balanceMatch) {
    result.simBalance = balanceMatch[1];
  }

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
 * Update Teletalk SIM Balance Card UI
 */
function updateBalanceUI(simBalance) {
  if (!simBalance) return;
  currentSimBalance = simBalance;

  if (teletalkBalanceVal) {
    if (simBalance.amount !== null && simBalance.amount !== undefined && simBalance.amount !== '') {
      teletalkBalanceVal.textContent = `৳ ${simBalance.amount}`;
    } else {
      teletalkBalanceVal.textContent = 'ব্যালেন্স যাচাই করুন';
    }
  }

  if (balanceSourceTag && simBalance.source) {
    balanceSourceTag.textContent = simBalance.source;
  }

  if (balanceLastUpdated) {
    if (simBalance.lastChecked) {
      const d = new Date(simBalance.lastChecked);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString();
      balanceLastUpdated.textContent = `(সর্বশেষ চেক: ${timeStr}, ${dateStr})`;
    } else {
      balanceLastUpdated.textContent = '(*152# ডায়াল করুন)';
    }
  }
}

/**
 * Save updated Teletalk balance
 */
async function saveBalance(amount, source = 'ম্যানুয়াল আপডেট') {
  const clean = String(amount).replace(/[^0-9.]/g, '').trim();
  if (!clean) {
    showToast('অনুগ্রহ করে সঠিক টাকার পরিমাণ লিখুন');
    return false;
  }

  const updatedObj = {
    amount: clean,
    currency: 'BDT',
    lastChecked: new Date().toISOString(),
    source
  };

  updateBalanceUI(updatedObj);
  try {
    localStorage.setItem('bd_job_teletalk_balance', JSON.stringify(updatedObj));
  } catch (e) {}

  showToast(`💰 টেলিটক ব্যালেন্স সংরক্ষণ করা হয়েছে: ৳ ${clean}`);

  // Sync to server if online
  try {
    await apiFetch('/api/sms/balance', {
      method: 'POST',
      body: JSON.stringify({ amount: clean, source })
    });
  } catch (e) {}

  return true;
}

/**
 * Automated 1-Click Teletalk Balance Check (*152#)
 * Whenever user clicks the button, checks and updates balance right there without typing!
 */
async function triggerCheckBalance() {
  if (checkBalanceBtn) {
    checkBalanceBtn.disabled = true;
    checkBalanceBtn.style.opacity = '0.85';
  }
  if (checkBalanceIcon) {
    checkBalanceIcon.textContent = '🔄';
    checkBalanceIcon.style.display = 'inline-block';
    checkBalanceIcon.style.animation = 'spin 0.8s linear infinite';
  }
  if (checkBalanceText) {
    checkBalanceText.textContent = 'ব্যালেন্স চেক হচ্ছে...';
  }
  if (teletalkBalanceVal) {
    teletalkBalanceVal.innerHTML = '<span style="font-size: 20px; opacity: 0.85;">🔄 চেকিং...</span>';
  }
  if (balanceLastUpdated) {
    balanceLastUpdated.textContent = '(*152# রিকোয়েস্ট প্রসেস হচ্ছে...)';
  }

  let finalBalance = null;
  let hasRealBalance = false;

  try {
    const res = await apiFetch('/api/sms/check-balance', {
      method: 'POST',
      body: JSON.stringify({ code: '*152#' })
    });

    if (res.ok && res.data) {
      if (res.data.simBalance && res.data.simBalance.amount) {
        finalBalance = res.data.simBalance;
        hasRealBalance = true;
      }
    }
  } catch (err) {
    console.warn('Backend balance check issue:', err);
  }

  const isPhoneOnline = currentPairedDevice && currentPairedDevice.isOnline;

  if (hasRealBalance && finalBalance) {
    updateBalanceUI(finalBalance);
    showToast(`⚡ টেলিটক সিম ব্যালেন্স: ৳ ${finalBalance.amount}`);
  } else {
    // Check if user previously saved a real balance
    const savedAmount = (currentSimBalance && currentSimBalance.amount) ||
                        (() => {
                          try {
                            const cached = JSON.parse(localStorage.getItem('bd_job_teletalk_balance') || '{}');
                            return cached.amount || null;
                          } catch(e) { return null; }
                        })();

    if (savedAmount) {
      finalBalance = {
        amount: savedAmount,
        currency: 'BDT',
        lastChecked: new Date().toISOString(),
        source: (currentSimBalance && currentSimBalance.source) || 'সংরক্ষিত ব্যালেন্স'
      };
      updateBalanceUI(finalBalance);
      showToast(`⚡ বর্তমান সংরক্ষিত ব্যালেন্স: ৳ ${savedAmount}`);
    } else {
      if (teletalkBalanceVal) teletalkBalanceVal.textContent = 'ব্যালেন্স দিন';
      if (balanceLastUpdated) balanceLastUpdated.textContent = '(*152# ডায়াল করে চেক করুন)';
    }

    if (isPhoneOnline) {
      showToast(`📲 আপনার ফোন (${currentPairedDevice.name})-এ রিকোয়েস্ট গেছে। স্ক্রিনের সঠিক ব্যালেন্সটি লিখুন।`);
    } else {
      showToast('টেলিটক সিমে *152# ডায়াল করে প্রাপ্ত সঠিক ব্যালেন্সটি লিখুন।');
    }

    // Open inline balance editor so user can immediately save what they saw on their Infinix screen
    if (balanceEditBox) {
      balanceEditBox.style.display = 'block';
      if (balanceInputField) {
        balanceInputField.value = savedAmount || '';
        balanceInputField.focus();
      }
    }
  }

  // Check device environment
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    // If user is directly on a mobile phone, open the native phone dialer with *152#
    window.location.href = 'tel:*152%23';
  } else {
    // If on PC/desktop, check if phone is paired
    const isPhoneOnline = currentPairedDevice && currentPairedDevice.isOnline;
    if (!isPhoneOnline) {
      if (phoneOfflineGuideBox) phoneOfflineGuideBox.style.display = 'block';
    } else {
      showToast(`📲 আপনার ফোন (${currentPairedDevice.name})-এ রিকোয়েস্ট গেছে। স্ক্রিনে ডায়াল করুন।`);

      // Poll background status for up to 15 seconds to see if the phone sent back balance
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        if (attempts > 7) {
          clearInterval(pollTimer);
          return;
        }
        try {
          const checkRes = await apiFetch('/api/sms/state');
          if (checkRes.ok && checkRes.data && checkRes.data.simBalance && checkRes.data.simBalance.amount) {
            updateBalanceUI(checkRes.data.simBalance);
            if (balanceEditBox) balanceEditBox.style.display = 'none';
            clearInterval(pollTimer);
          }
        } catch(e) {}
      }, 2000);
    }
  }

  if (checkBalanceBtn) {
    checkBalanceBtn.disabled = false;
    checkBalanceBtn.style.opacity = '1';
  }
  if (checkBalanceIcon) {
    checkBalanceIcon.textContent = '⚡';
    checkBalanceIcon.style.animation = 'none';
  }
  if (checkBalanceText) {
    checkBalanceText.textContent = 'Check Balance (ব্যালেন্স চেক করুন)';
  }
}

/**
 * Load local messages from chrome.storage or localStorage
 */
async function loadLocalMessages() {
  const isExplicitlyCleared = localStorage.getItem('bd_job_sms_cleared') === 'true';
  if (isExplicitlyCleared) {
    if (clearStatusBanner) clearStatusBanner.style.display = 'flex';
    return [];
  }

  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const stored = await new Promise(resolve => {
        chrome.storage.local.get([STORAGE_KEY_MESSAGES], res => resolve(res[STORAGE_KEY_MESSAGES]));
      });
      if (Array.isArray(stored)) {
        return stored;
      }
    }
  } catch (e) {
    console.debug('chrome.storage.local read skipped:', e);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.debug('localStorage read skipped:', e);
  }

  return [];
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
  const clearedAt = localStorage.getItem('bd_job_sms_cleared_at');
  const clearedTime = clearedAt ? new Date(clearedAt).getTime() : 0;

  const merged = [...existingList];
  for (const item of incomingList) {
    if (!item) continue;
    const itemTime = item.timestamp ? new Date(item.timestamp).getTime() : 0;
    if (clearedTime > 0 && itemTime > 0 && itemTime <= clearedTime) {
      continue; // Skip messages from before the user cleared
    }

    const existingIdx = merged.findIndex(m => {
      if (m.id && item.id && m.id === item.id) return true;
      if (m.jobId && item.jobId && m.jobId === item.jobId) return true;
      if (m.body === item.body && Math.abs(new Date(m.timestamp || 0) - new Date(item.timestamp || 0)) < 2000) return true;
      return false;
    });

    if (existingIdx !== -1) {
      // Update status if server has newer status (e.g. SENT_FROM_PHONE)
      if (item.status && item.status !== merged[existingIdx].status) {
        merged[existingIdx].status = item.status;
        if (item.simUsed) merged[existingIdx].simUsed = item.simUsed;
        if (item.sentAt) merged[existingIdx].sentAt = item.sentAt;
      }
    } else {
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
    filtered = filtered.filter(m => m.direction === 'outgoing' && m.status === 'SENT_FROM_PHONE');
  } else if (currentFilter === 'pending') {
    filtered = filtered.filter(m => m.direction === 'outgoing' && m.status !== 'SENT_FROM_PHONE');
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

    const isSent = msg.status === 'SENT_FROM_PHONE';
    const isFailed = msg.status === 'FAILED_FROM_PHONE';
    const isPending = !isIncoming && !isSent && !isFailed;

    let bubbleClass = 'msg-bubble';
    if (is16222) bubbleClass += ' msg-bubble-16222';
    else if (isIncoming) bubbleClass += ' msg-bubble--incoming';
    else bubbleClass += ' msg-bubble-outgoing';

    // Status badge indicator
    let statusBadgeHtml = '';
    if (!isIncoming) {
      if (isSent) {
        statusBadgeHtml = `<span style="background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">✅ মোবাইল এ্যাপ থেকে প্রেরিত (Sent)</span>`;
      } else if (isFailed) {
        statusBadgeHtml = `<span style="background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">❌ পাঠানো ব্যর্থ (Failed)</span>`;
      } else {
        statusBadgeHtml = `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">⏳ মোবাইল এ্যাপে অপেক্ষমান (Pending)</span>`;
      }
    } else if (msg.status) {
      statusBadgeHtml = `<span style="background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${escapeHtml(msg.status)}</span>`;
    }

    html += `
      <div class="${bubbleClass}" style="margin-bottom: 10px; border-radius: 8px; padding: 12px 14px; border: ${!isIncoming && isSent ? '1px solid #bbf7d0' : !isIncoming && isPending ? '1px solid #fed7aa' : '1px solid var(--color-border)'};">
        <div class="msg-meta" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 11px; flex-wrap: wrap; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-weight: 700; ${is16222 ? 'color: #0284c7;' : isIncoming ? 'color: #166534;' : 'color: #1d4ed8;'}">
              ${isIncoming ? (is16222 ? '📱 16222 (Teletalk Reply)' : `📩 From: ${escapeHtml(msg.sender || 'Unknown')}`) : '📲 Outbox SMS (To: ' + escapeHtml(msg.recipient || '16222') + ')'}
            </span>
            ${statusBadgeHtml}
          </div>
          <span style="color: var(--color-text-muted); font-size: 10px;">${dateStr} ${timeStr}</span>
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

        <!-- Phone App Sent / Pending Status Banner for Outgoing -->
        ${!isIncoming && isSent ? `
          <div style="margin-top: 8px; font-size: 11px; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
            <span>📱 সিম: <strong>${escapeHtml(msg.simUsed || 'Teletalk SIM')}</strong> &bull; পাঠানোর সময়: <strong>${msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeStr}</strong></span>
            <span style="font-weight: 700; color: #15803d;">সফলভাবে প্রেরিত</span>
          </div>
        ` : ''}

        ${!isIncoming && isPending ? `
          <div style="margin-top: 8px; font-size: 11px; color: #92400e; background: #fffbeb; border: 1px solid #fed7aa; padding: 8px 10px; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 4px;">⏳ আপনার ফোনের 'BD Job SMS Gateway' এ্যাপে অপেক্ষমান রয়েছে।</div>
            <div style="display: flex; gap: 6px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <span style="color: #78350f; font-size: 10px;">ফোন এ্যাপ চালু থাকলে স্বয়ংক্রিয়ভাবে পাঠাবে বা সরাসরি পাঠান:</span>
              <a href="sms:${escapeHtml(msg.recipient || '16222')}?body=${encodeURIComponent(msg.body || '')}" class="btn btn-secondary btn-sm" style="font-size: 10px; padding: 2px 8px; text-decoration: none; font-weight: 600;">
                📲 ফোনে খুলুন
              </a>
            </div>
          </div>
        ` : ''}

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

    // Sync Teletalk balance
    if (result.data.simBalance) {
      updateBalanceUI(result.data.simBalance);
    }

    // Merge server messages with local messages
    if (Array.isArray(result.data.messages)) {
      const merged = mergeMessages(feedMessages, result.data.messages);
      await saveLocalMessages(merged);
      renderFeed();
    }

    updatePairingPanel(result.data);
  } else {
    isServerOnline = false;
    if (serverStatusPill) {
      serverStatusPill.className = 'server-status-pill server-status-pill--offline';
    }
    if (serverStatusText) {
      serverStatusText.textContent = `🟡 Local Outbox (Server Offline)`;
    }
    if (pairingPhoneStatus) {
      pairingPhoneStatus.textContent = 'Phone status: cannot reach the gateway server right now.';
    }
  }
}

/**
 * Track an outgoing SMS job in real-time until confirmed sent by phone
 */
function startTrackingJob(jobId, msgRef) {
  activeTrackingJobId = jobId;
  if (activeTrackingInterval) clearInterval(activeTrackingInterval);

  if (activeJobTracker) {
    activeJobTracker.style.display = 'block';
    activeJobTracker.style.background = '#fffbeb';
    activeJobTracker.style.border = '1px solid #fed7aa';
    if (trackerStatusIcon) trackerStatusIcon.textContent = '⏳';
    if (trackerStatusTitle) {
      trackerStatusTitle.textContent = 'মোবাইল এ্যাপে অপেক্ষমান... (Pending in Phone App)';
      trackerStatusTitle.style.color = '#9a3412';
    }
    if (trackerJobId) trackerJobId.textContent = `Job: ${jobId.substring(jobId.length - 8)}`;
    if (trackerStatusDesc) {
      trackerStatusDesc.innerHTML = 'এসএমএসটি গেটওয়েতে জমা হয়েছে। আপনার ফোনের <strong>BD Job SMS Gateway</strong> এ্যাপটি এটি গ্রহণ করে টেলিটক সিম থেকে পাঠাবে...';
      trackerStatusDesc.style.color = '#78350f';
    }
    if (trackerDetails) trackerDetails.style.display = 'none';
  }

  let attempts = 0;
  activeTrackingInterval = setInterval(async () => {
    attempts++;
    if (attempts > 60) {
      clearInterval(activeTrackingInterval);
      return;
    }

    const res = await apiFetch('/api/sms/state');
    if (res.ok && res.data) {
      if (res.data.simBalance) updateBalanceUI(res.data.simBalance);

      const foundJob = (res.data.pendingJobs || []).find(j => j.id === jobId);
      const foundMsg = (res.data.messages || []).find(m => m.jobId === jobId || m.id === msgRef.id);

      const isSent = (foundJob && foundJob.status === 'SENT') || (foundMsg && foundMsg.status === 'SENT_FROM_PHONE');
      const isFailed = (foundJob && foundJob.status === 'FAILED') || (foundMsg && foundMsg.status === 'FAILED_FROM_PHONE');

      if (isSent) {
        clearInterval(activeTrackingInterval);
        const simName = (foundJob && foundJob.simUsed) || (foundMsg && foundMsg.simUsed) || 'Teletalk SIM';
        const sentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (activeJobTracker) {
          activeJobTracker.style.background = '#f0fdf4';
          activeJobTracker.style.border = '1px solid #86efac';
          if (trackerStatusIcon) trackerStatusIcon.textContent = '✅';
          if (trackerStatusTitle) {
            trackerStatusTitle.textContent = 'মোবাইল এ্যাপ থেকে সফলভাবে পাঠানো হয়েছে! (Sent)';
            trackerStatusTitle.style.color = '#15803d';
          }
          if (trackerStatusDesc) {
            trackerStatusDesc.innerHTML = 'আপনার ফোনের <strong>BD Job SMS Gateway</strong> এ্যাপ সফলভাবে টেলিটক সিম ব্যবহার করে ১৬২২২ নম্বরে এসএমএসটি পাঠিয়েছে।';
            trackerStatusDesc.style.color = '#166534';
          }
          if (trackerDetails) {
            trackerDetails.style.display = 'block';
            trackerDetails.innerHTML = `📱 সিম: <strong>${escapeHtml(simName)}</strong> &bull; পাঠানোর সময়: <strong>${sentTimeStr}</strong>`;
          }
        }

        // Update local message status
        msgRef.status = 'SENT_FROM_PHONE';
        msgRef.simUsed = simName;
        msgRef.sentAt = new Date().toISOString();
        await saveLocalMessages(feedMessages);
        renderFeed();

        showToast('✅ মোবাইল এ্যাপ থেকে এসএমএস পাঠানো সম্পন্ন হয়েছে!');
      } else if (isFailed) {
        clearInterval(activeTrackingInterval);
        if (activeJobTracker) {
          activeJobTracker.style.background = '#fef2f2';
          activeJobTracker.style.border = '1px solid #fca5a5';
          if (trackerStatusIcon) trackerStatusIcon.textContent = '❌';
          if (trackerStatusTitle) {
            trackerStatusTitle.textContent = 'মোবাইল এ্যাপ থেকে পাঠানো ব্যর্থ হয়েছে (Failed)';
            trackerStatusTitle.style.color = '#991b1b';
          }
          if (trackerStatusDesc) {
            trackerStatusDesc.innerHTML = 'ফোন থেকে এসএমএস পাঠানো যায়নি। অনুগ্রহ করে ফোনে পর্যাপ্ত টেলিটক ব্যালেন্স ও নেটওয়ার্ক চেক করুন।';
            trackerStatusDesc.style.color = '#7f1d1d';
          }
        }
        msgRef.status = 'FAILED_FROM_PHONE';
        await saveLocalMessages(feedMessages);
        renderFeed();
      }
    }
  }, 2000);
}

/**
 * Fill in the pairing code and paired-phone status.
 * The Gateway Server URL field is populated separately (see refreshPairingServerUrl)
 * because it needs the PC's real LAN IP, not "localhost".
 */
function updatePairingPanel(stateData) {
  currentPairedDevice = stateData.pairedDevice;

  if (balancePhoneStatusTag) {
    if (currentPairedDevice && currentPairedDevice.isOnline) {
      balancePhoneStatusTag.textContent = `🟢 ফোন সংযুক্ত: ${currentPairedDevice.name}`;
      balancePhoneStatusTag.style.background = 'rgba(16, 185, 129, 0.35)';
      if (phoneOfflineGuideBox) phoneOfflineGuideBox.style.display = 'none';
    } else if (currentPairedDevice) {
      balancePhoneStatusTag.textContent = `🟡 ফোন অফলাইন: ${currentPairedDevice.name}`;
      balancePhoneStatusTag.style.background = 'rgba(234, 179, 8, 0.35)';
    } else {
      balancePhoneStatusTag.textContent = '🔴 ফোন কানেক্ট করা নেই (ক্লিক করুন)';
      balancePhoneStatusTag.style.background = 'rgba(239, 68, 68, 0.35)';
    }
  }

  if (pairingCodeInput && stateData.pairingToken) {
    pairingCodeInput.value = stateData.pairingToken;
  }
  if (pairingPhoneStatus) {
    const dev = stateData.pairedDevice;
    if (dev && dev.isOnline) {
      pairingPhoneStatus.textContent = `Phone status: 🟢 ${dev.name} connected (battery ${dev.battery}%)`;
    } else if (dev) {
      pairingPhoneStatus.textContent = `Phone status: 🟡 ${dev.name} paired but not seen recently. Open the app on your phone.`;
    } else {
      pairingPhoneStatus.textContent = 'Phone status: 🔴 not paired yet. Enter the code below in the app.';
    }
  }
}

/**
 * Look up the PC's real Wi-Fi IP address so the phone app knows
 * what address to connect to (localhost would point at the phone itself).
 */
async function refreshPairingServerUrl() {
  if (!pairingServerUrlInput) return;
  const result = await apiFetch('/api/sms/network-ips');
  if (result.ok && result.data && result.data.suggestedIp) {
    pairingServerUrlInput.value = `http://${result.data.suggestedIp}:${result.data.port}`;
  } else {
    pairingServerUrlInput.value = 'Could not detect Wi-Fi IP — make sure server.js is running';
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
    status: 'QUEUED_FOR_PHONE',
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

  if (result.ok && result.data && result.data.job) {
    const job = result.data.job;
    newMsg.jobId = job.id;
    newMsg.status = 'QUEUED_FOR_PHONE';
    await saveLocalMessages(feedMessages);
    renderFeed();
    setCustomSmsStatus(`📤 Queued to phone app. Open the app on your phone to send.`, 'success');
    showToast(`📲 SMS queued for Phone Gateway (${recipient})`);
    startTrackingJob(job.id, newMsg);
  } else if (result.ok) {
    newMsg.status = 'DISPATCHED_TO_PHONE';
    await saveLocalMessages(feedMessages);
    renderFeed();
    setCustomSmsStatus(`📤 Queued to your phone. Open the SMS Gateway page on your phone and tap "Open in SMS App" to actually send it.`, 'success');
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
    if (filterPendingBtn) filterPendingBtn.className = filter === 'pending' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    renderFeed();
  }

  if (filterAllBtn) filterAllBtn.addEventListener('click', () => setFeedFilter('all'));
  if (filter16222Btn) filter16222Btn.addEventListener('click', () => setFeedFilter('16222'));
  if (filterSentBtn) filterSentBtn.addEventListener('click', () => setFeedFilter('sent'));
  if (filterPendingBtn) filterPendingBtn.addEventListener('click', () => setFeedFilter('pending'));

  // 8. Search input
  if (smsSearchInput) {
    smsSearchInput.addEventListener('input', (e) => {
      currentSearch = (e.target.value || '').trim();
      renderFeed();
    });
  }

  // 9. Teletalk SIM Balance Controls
  if (balancePhoneStatusTag && phoneOfflineGuideBox) {
    balancePhoneStatusTag.addEventListener('click', () => {
      phoneOfflineGuideBox.style.display = phoneOfflineGuideBox.style.display === 'none' ? 'block' : 'none';
    });
  }

  if (closeOfflineGuideBtn && phoneOfflineGuideBox) {
    closeOfflineGuideBtn.addEventListener('click', () => {
      phoneOfflineGuideBox.style.display = 'none';
    });
  }

  if (checkBalanceBtn) {
    checkBalanceBtn.addEventListener('click', () => {
      triggerCheckBalance();
    });
  }

  if (dialUssdBtn) {
    dialUssdBtn.addEventListener('click', () => {
      setTimeout(() => {
        const entered = prompt('টেলিটক সিমে *152# ডায়াল করার পর স্ক্রিনে কত টাকা ব্যালেন্স দেখাচ্ছে? (Tk):', (currentSimBalance && currentSimBalance.amount) || '');
        if (entered !== null && entered.trim()) {
          saveBalance(entered.trim(), '*152# USSD');
        }
      }, 300);
    });
  }

  if (toggleBalanceEditBtn && balanceEditBox) {
    toggleBalanceEditBtn.addEventListener('click', () => {
      const isHidden = balanceEditBox.style.display === 'none';
      balanceEditBox.style.display = isHidden ? 'block' : 'none';
      if (isHidden && balanceInputField) {
        balanceInputField.value = (currentSimBalance && currentSimBalance.amount) || '';
        balanceInputField.focus();
      }
    });
  }

  if (saveBalanceBtn && balanceInputField) {
    saveBalanceBtn.addEventListener('click', async () => {
      const val = balanceInputField.value.trim();
      if (val) {
        await saveBalance(val, 'ম্যানুয়াল আপডেট');
        if (balanceEditBox) balanceEditBox.style.display = 'none';
      } else {
        showToast('টাকার পরিমাণ লিখুন');
      }
    });
  }

  if (cancelBalanceBtn && balanceEditBox) {
    cancelBalanceBtn.addEventListener('click', () => {
      balanceEditBox.style.display = 'none';
    });
  }

  // 10. Feed Refresh, Persistent Clear, and Load Sample
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
      if (confirm('আপনি কি নিশ্চিত যে সমস্ত এসএমএস হিস্টোরি ও কিউ স্থায়ীভাবে মুছে ফেলতে চান?\n(Clear all messages and queues permanently?)')) {
        feedMessages = [];
        const now = new Date().toISOString();
        localStorage.setItem('bd_job_sms_cleared', 'true');
        localStorage.setItem('bd_job_sms_cleared_at', now);
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify([]));
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [STORAGE_KEY_MESSAGES]: [] });
        }

        try {
          await apiFetch('/api/sms/clear', { method: 'POST' });
        } catch (e) {}

        if (activeJobTracker) activeJobTracker.style.display = 'none';
        if (activeTrackingInterval) clearInterval(activeTrackingInterval);

        renderFeed();
        if (clearStatusBanner) clearStatusBanner.style.display = 'flex';
        showToast('🗑️ সব মেসেজ স্থায়ীভাবে মুছে ফেলা হয়েছে');
      }
    });
  }

  if (loadSampleFeedBtn) {
    loadSampleFeedBtn.addEventListener('click', async () => {
      localStorage.removeItem('bd_job_sms_cleared');
      localStorage.removeItem('bd_job_sms_cleared_at');
      feedMessages = [...DEFAULT_INITIAL_MESSAGES];
      await saveLocalMessages(feedMessages);
      renderFeed();
      if (clearStatusBanner) clearStatusBanner.style.display = 'none';
      showToast('➕ ডেমো মেসেজ লোড করা হয়েছে');
    });
  }

  // 11. Server Settings Config
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

  // 11. Phone App Pairing Panel
  if (copyPairingUrlBtn && pairingServerUrlInput) {
    copyPairingUrlBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pairingServerUrlInput.value);
        showToast('📋 Server URL copied!');
      } catch (e) {
        pairingServerUrlInput.select();
        showToast('Select and copy manually (clipboard blocked)');
      }
    });
  }

  if (copyPairingCodeBtn && pairingCodeInput) {
    copyPairingCodeBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pairingCodeInput.value);
        showToast('📋 Pairing code copied!');
      } catch (e) {
        pairingCodeInput.select();
        showToast('Select and copy manually (clipboard blocked)');
      }
    });
  }

  if (regeneratePairingCodeBtn) {
    regeneratePairingCodeBtn.addEventListener('click', async () => {
      if (!confirm('This invalidates the old code. Your phone app will need the new code. Continue?')) return;
      const result = await apiFetch('/api/sms/reset-token', { method: 'POST' });
      if (result.ok && result.data && result.data.pairingToken) {
        pairingCodeInput.value = result.data.pairingToken;
        showToast('🔄 New pairing code generated');
      } else {
        showToast('Failed to regenerate code');
      }
    });
  }

  // Initial update
  updateCharCount();
  updateSmsLinkAndQr();
  await refreshPairingServerUrl();

  // Restore cached Teletalk balance if saved previously
  try {
    const cachedBal = localStorage.getItem('bd_job_teletalk_balance');
    if (cachedBal) updateBalanceUI(JSON.parse(cachedBal));
  } catch (e) {}

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
