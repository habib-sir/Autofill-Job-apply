/**
 * BD Job Autofill - Mobile Phone Companion Bridge
 * Runs on user's Android phone with Teletalk SIM
 */

// Extract URL parameters
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token') || localStorage.getItem('bd_job_sms_token') || 'DEFAULT_TOKEN';
localStorage.setItem('bd_job_sms_token', token);

// Device identity
const userAgent = navigator.userAgent;
let detectedModel = 'Android Phone';
if (/Samsung/i.test(userAgent)) detectedModel = 'Samsung Galaxy';
else if (/Pixel/i.test(userAgent)) detectedModel = 'Google Pixel';
else if (/Xiaomi|Redmi/i.test(userAgent)) detectedModel = 'Xiaomi Redmi';
else if (/Realme/i.test(userAgent)) detectedModel = 'Realme';
else if (/OnePlus/i.test(userAgent)) detectedModel = 'OnePlus';
else if (/iPhone/i.test(userAgent)) detectedModel = 'iPhone';

const deviceState = {
  token,
  deviceName: detectedModel + ' (Teletalk)',
  phoneModel: detectedModel,
  simCarrier: 'Teletalk Bangladesh 4G',
  batteryLevel: 92
};

// UI Elements
const connectionBadge = document.getElementById('connection-badge');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const pendingJobsList = document.getElementById('pending-jobs-list');
const incomingInput = document.getElementById('incoming-sms-input');
const pasteBtn = document.getElementById('paste-clipboard-btn');
const sendIncomingBtn = document.getElementById('send-incoming-btn');
const demoPinBtn = document.getElementById('demo-pin-sms-btn');
const demoPassBtn = document.getElementById('demo-pass-sms-btn');
const reconnectBtn = document.getElementById('reconnect-btn');
const toastEl = document.getElementById('toast');

// Device Details UI
document.getElementById('dev-name').textContent = deviceState.deviceName;
document.getElementById('dev-sim').textContent = deviceState.simCarrier;
document.getElementById('dev-token').textContent = token;

const tokenInputEl = document.getElementById('token-input');
const updateTokenBtn = document.getElementById('update-token-btn');

if (tokenInputEl) {
  tokenInputEl.value = token;
}

if (updateTokenBtn) {
  updateTokenBtn.addEventListener('click', () => {
    const newVal = (tokenInputEl ? tokenInputEl.value : '').trim().toUpperCase();
    if (!newVal) {
      showToast('Please enter a pairing code');
      return;
    }
    deviceState.token = newVal;
    localStorage.setItem('bd_job_sms_token', newVal);
    document.getElementById('dev-token').textContent = newVal;
    showToast('Linking with code: ' + newVal);
    registerDevice();
    pollJobs();
  });
}

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.style.display = 'block';
  setTimeout(() => {
    toastEl.style.display = 'none';
  }, 2500);
}

// Read battery if available in modern browsers
if ('getBattery' in navigator) {
  navigator.getBattery().then(battery => {
    deviceState.batteryLevel = Math.round(battery.level * 100);
    battery.addEventListener('levelchange', () => {
      deviceState.batteryLevel = Math.round(battery.level * 100);
    });
  }).catch(() => {});
}

/**
 * Register phone with backend
 */
async function registerDevice() {
  try {
    const res = await fetch('/api/sms/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceState)
    });
    const data = await res.json();
    if (data.ok) {
      connectionDot.classList.remove('offline');
      connectionText.textContent = 'Linked to Extension';
      document.getElementById('dev-ping').textContent = 'Online (' + new Date().toLocaleTimeString() + ')';
    } else {
      setOffline();
    }
  } catch (err) {
    console.error('Pairing error:', err);
    setOffline();
  }
}

function setOffline() {
  connectionDot.classList.add('offline');
  connectionText.textContent = 'Disconnected';
  document.getElementById('dev-ping').textContent = 'Offline';
}

/**
 * Poll for pending SMS jobs sent from Chrome extension
 */
let lastJobsCount = 0;

async function checkPendingJobs() {
  try {
    const res = await fetch('/api/sms/pending');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    
    if (data.ok) {
      connectionDot.classList.remove('offline');
      connectionText.textContent = 'Linked to Extension';
      renderPendingJobs(data.jobs || []);
    }
  } catch (err) {
    setOffline();
  }
}

/**
 * Render pending jobs
 */
function renderPendingJobs(jobs) {
  if (jobs.length === 0) {
    pendingJobsList.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">📡</span>
        <p>Waiting for SMS jobs from your Chrome extension...</p>
        <p style="font-size: 12px; margin-top: 4px; color: #94a3b8;">When you click "Send SMS" in the extension, it will appear here instantly.</p>
      </div>
    `;
    lastJobsCount = 0;
    return;
  }

  // If new jobs arrived, vibrate
  if (jobs.length > lastJobsCount) {
    if (navigator.vibrate) {
      try { navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
    showToast('⚡ New SMS Job from Extension!');
  }
  lastJobsCount = jobs.length;

  pendingJobsList.innerHTML = '';

  jobs.forEach(job => {
    const card = document.createElement('div');
    card.className = 'card job-card';
    card.style.marginBottom = '12px';

    const tagText = job.type === '1ST_SMS' ? '1st Application SMS' : (job.type === '2ND_SMS' ? '2nd Confirmation SMS' : 'Custom SMS');
    const encodedBody = encodeURIComponent(job.body);
    // Standard SMS URI scheme for Android
    const smsUri = `sms:${job.recipient}?body=${encodedBody}`;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <span class="job-tag">${tagText}</span>
        <span style="font-size: 11px; color: var(--text-muted);">${new Date(job.createdAt).toLocaleTimeString()}</span>
      </div>
      <div class="job-recipient">Send To: <strong style="color: #0f172a; font-size: 15px;">${job.recipient}</strong></div>
      <div class="job-body-box">${job.body}</div>
      <a href="${smsUri}" target="_blank" class="btn btn-primary" id="open-sms-${job.id}">
        <span>📲</span> Open in SMS App &amp; Send (Teletalk)
      </a>
      <button class="btn btn-success" id="confirm-sent-${job.id}">
        <span>✅</span> Mark as Sent to Extension
      </button>
    `;

    pendingJobsList.appendChild(card);

    // Wire up mark as sent button
    const confirmBtn = card.querySelector(`#confirm-sent-${job.id}`);
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        await reportJobSent(job.id);
      });
    }

    // When clicking "Open in SMS app", also listen and offer quick mark
    const openBtn = card.querySelector(`#open-sms-${job.id}`);
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        showToast('Opening SMS app... Tap "Mark as Sent" when done!');
      });
    }
  });
}

/**
 * Notify server that SMS has been sent via phone SIM
 */
async function reportJobSent(jobId) {
  try {
    const res = await fetch('/api/sms/report-sent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, simUsed: deviceState.simCarrier })
    });
    const data = await res.json();
    if (data.ok) {
      showToast('✅ Marked as sent! Synced to extension.');
      await checkPendingJobs();
    }
  } catch (err) {
    alert('Failed to update status: ' + err.message);
  }
}

/**
 * Send incoming SMS back to extension
 */
async function syncIncomingSms(text) {
  const body = text || incomingInput.value.trim();
  if (!body) {
    showToast('Please paste or type the SMS message.');
    return;
  }

  try {
    const res = await fetch('/api/sms/incoming', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: '16222',
        body: body,
        timestamp: new Date().toISOString()
      })
    });
    const data = await res.json();
    if (data.ok) {
      incomingInput.value = '';
      if (data.parsed && data.parsed.pin) {
        showToast(`🎉 PIN Detected (${data.parsed.pin})! Synced to extension.`);
      } else if (data.parsed && data.parsed.password) {
        showToast(`🎉 Password Detected (${data.parsed.password})! Synced to extension.`);
      } else {
        showToast('✅ SMS synced to extension successfully!');
      }
    }
  } catch (err) {
    alert('Sync failed: ' + err.message);
  }
}

// Paste button listener
pasteBtn.addEventListener('click', async () => {
  if (navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        incomingInput.value = text;
        showToast('Pasted from clipboard!');
      } else {
        incomingInput.focus();
        showToast('Clipboard is empty.');
      }
    } catch (e) {
      incomingInput.focus();
      showToast('Long-press text box to paste.');
    }
  } else {
    incomingInput.focus();
    showToast('Long-press text box to paste.');
  }
});

sendIncomingBtn.addEventListener('click', () => syncIncomingSms());

// Simulation shortcuts for testing
demoPinBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/sms/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PIN_NOTIFICATION', orgCode: 'BPSC', userId: '7A8B9C' })
    });
    const data = await res.json();
    showToast('Simulated 16222 PIN reply sent to extension!');
  } catch (e) {
    alert(e.message);
  }
});

demoPassBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/sms/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PAYMENT_CONFIRMATION', orgCode: 'BPSC', userId: '7A8B9C' })
    });
    const data = await res.json();
    showToast('Simulated 16222 Password confirmation sent!');
  } catch (e) {
    alert(e.message);
  }
});

reconnectBtn.addEventListener('click', async () => {
  showToast('Reconnecting...');
  await registerDevice();
  await checkPendingJobs();
});

// Initialize
registerDevice();
checkPendingJobs();

// Polling intervals
setInterval(checkPendingJobs, 2500);
setInterval(() => {
  fetch('/api/sms/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batteryLevel: deviceState.batteryLevel })
  }).catch(() => {});
}, 10000);
