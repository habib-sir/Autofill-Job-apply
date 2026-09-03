/**
 * BD Job Autofill - Phone SMS Gateway & Fee Payment Sync Controller
 */

// State
let bridgeState = {
  pairedDevice: null,
  pairingToken: '',
  pendingJobs: [],
  messages: []
};

let savedApplications = [];
let currentDetectedPin = '';
let currentDetectedPassword = '';

// DOM Elements
const qrCodeRender = document.getElementById('qr-code-render');
const qrCodeBox = document.getElementById('qr-code-box');
const directMobileLink = document.getElementById('direct-mobile-link');
const copyMobileLinkBtn = document.getElementById('copy-mobile-link-btn');
const pairingTokenCode = document.getElementById('pairing-token-code');
const copyTokenBtn = document.getElementById('copy-token-btn');
const refreshQrBtn = document.getElementById('refresh-qr-btn');
const pairingTokenDisplay = document.getElementById('pairing-token-display');
const deviceConnectedView = document.getElementById('device-connected-view');
const deviceDisconnectedView = document.getElementById('device-disconnected-view');
const gatewayStatusBadge = document.getElementById('gateway-status-badge');
const toggleQrModalBtn = document.getElementById('toggle-qr-modal-btn');

const connectedDeviceName = document.getElementById('connected-device-name');
const connectedSim = document.getElementById('connected-sim');
const connectedBattery = document.getElementById('connected-battery');
const connectedLastseen = document.getElementById('connected-lastseen');
const unpairDeviceBtn = document.getElementById('unpair-device-btn');
const refreshStateBtn = document.getElementById('refresh-state-btn');

// Form inputs
const selectSavedApp = document.getElementById('select-saved-app');
const orgCodeInput = document.getElementById('org-code-input');
const userIdInput = document.getElementById('user-id-input');
const applicantNameInput = document.getElementById('applicant-name-input');

// Wizard steps
const step1Card = document.getElementById('step-1-card');
const step1PreviewText = document.getElementById('step-1-preview-text');
const step1Status = document.getElementById('step-1-status');
const sendStep1Btn = document.getElementById('send-step-1-btn');

const step2Card = document.getElementById('step-2-card');
const step2PreviewText = document.getElementById('step-2-preview-text');
const step2Status = document.getElementById('step-2-status');
const pinDetectedBox = document.getElementById('pin-detected-box');
const detectedFee = document.getElementById('detected-fee');
const detectedName = document.getElementById('detected-name');
const detectedPin = document.getElementById('detected-pin');
const manualPinInput = document.getElementById('manual-pin-input');
const sendStep2Btn = document.getElementById('send-step-2-btn');

const step3Card = document.getElementById('step-3-card');
const step3Status = document.getElementById('step-3-status');
const passwordConfirmedBox = document.getElementById('password-confirmed-box');
const passwordAwaitHint = document.getElementById('password-await-hint');
const finalUserId = document.getElementById('final-user-id');
const finalPassword = document.getElementById('final-password');
const saveToApplicationsBtn = document.getElementById('save-to-applications-btn');

// Custom SMS
const customRecipient = document.getElementById('custom-recipient');
const customBody = document.getElementById('custom-body');
const sendCustomSmsBtn = document.getElementById('send-custom-sms-btn');

// Activity Feed & Simulators
const smsFeedContainer = document.getElementById('sms-feed-container');
const simulatePinReplyBtn = document.getElementById('simulate-pin-reply-btn');
const simulatePassReplyBtn = document.getElementById('simulate-pass-reply-btn');

/**
 * Update previews based on orgCode and userId
 */
function updatePreviews() {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput.value || 'USERID').trim().toUpperCase();
  step1PreviewText.textContent = `${org} ${uid}`;

  const pin = manualPinInput.value.trim() || currentDetectedPin || '[PIN]';
  step2PreviewText.textContent = `${org} YES ${pin}`;
}

orgCodeInput.addEventListener('input', updatePreviews);
userIdInput.addEventListener('input', updatePreviews);
manualPinInput.addEventListener('input', (e) => {
  const pin = e.target.value.trim();
  if (pin) {
    currentDetectedPin = pin;
    sendStep2Btn.disabled = false;
    updatePreviews();
  }
});

/**
 * Load saved applications from Chrome storage to populate quick dropdown
 */
async function loadSavedApplications() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['applications', 'activeProfileId', 'profiles'], (result) => {
      savedApplications = result.applications || [];
      selectSavedApp.innerHTML = '<option value="">-- Choose an application or enter manually --</option>';

      savedApplications.forEach((app, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        const org = app.orgCode || extractOrgFromUrl(app.portalUrl) || 'Govt Job';
        const post = app.postName || 'Application';
        const uid = app.userId || 'No User ID';
        opt.textContent = `${org} - ${post} (User ID: ${uid})`;
        selectSavedApp.appendChild(opt);
      });
    });
  }
}

function extractOrgFromUrl(url) {
  if (!url) return '';
  const match = url.match(/([a-z0-9\-]+)\.teletalk\.com\.bd/i);
  return match ? match[1].toUpperCase() : '';
}

selectSavedApp.addEventListener('change', () => {
  const idx = selectSavedApp.value;
  if (idx !== '' && savedApplications[idx]) {
    const app = savedApplications[idx];
    if (app.orgCode) {
      orgCodeInput.value = app.orgCode;
    } else if (app.portalUrl) {
      orgCodeInput.value = extractOrgFromUrl(app.portalUrl) || 'BPSC';
    }
    if (app.userId) {
      userIdInput.value = app.userId;
    }
    if (app.applicantName) {
      applicantNameInput.value = app.applicantName;
    }
    updatePreviews();
  }
});

/**
 * Render QR Code graphic safely (SVG or Canvas via QRCodeLib)
 */
function renderQrCodeGraphic(url) {
  if (!qrCodeRender) return;

  if (typeof QRCodeLib !== 'undefined') {
    try {
      QRCodeLib.toString(url, {
        type: 'svg',
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }, (err, svgString) => {
        if (!err && svgString) {
          qrCodeRender.innerHTML = svgString;
          return;
        }
        renderQrToCanvas(url, qrCodeRender);
      });
      return;
    } catch (e) {
      renderQrToCanvas(url, qrCodeRender);
      return;
    }
  }

  qrCodeRender.innerHTML = `
    <div style="font-size:11px; text-align:center; padding:10px; color:#475569;">
      <a href="${url}" target="_blank" style="color:#0284c7; font-weight:600; text-decoration:underline;">Open Companion</a>
    </div>
  `;
}

function renderQrToCanvas(url, container) {
  if (typeof QRCodeLib !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 140;
    canvas.height = 140;
    QRCodeLib.toCanvas(canvas, url, { margin: 1, width: 140 }, (err) => {
      if (!err) {
        container.innerHTML = '';
        container.appendChild(canvas);
      }
    });
  }
}

/**
 * Fetch or generate QR Code for mobile pairing
 */
async function loadQrCode(forceNew = false) {
  let token = bridgeState.pairingToken || localStorage.getItem('bd_job_pairing_token');
  if (!token || forceNew) {
    token = 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    bridgeState.pairingToken = token;
  }
  localStorage.setItem('bd_job_pairing_token', token);

  const fallbackUrl = `${window.location.origin}/mobile-sms-bridge.html?token=${token}`;

  if (pairingTokenCode) pairingTokenCode.textContent = token;
  if (pairingTokenDisplay) pairingTokenDisplay.textContent = 'Token: ' + token;
  if (directMobileLink) directMobileLink.href = fallbackUrl;

  // Render immediately so QR code is never blank
  renderQrCodeGraphic(fallbackUrl);

  try {
    const endpoint = forceNew ? '/api/sms/reset-token' : '/api/sms/qr';
    const res = await fetch(endpoint, { method: forceNew ? 'POST' : 'GET' });
    const data = await res.json();
    if (data.ok) {
      bridgeState.pairingToken = data.pairingToken;
      localStorage.setItem('bd_job_pairing_token', data.pairingToken);

      if (pairingTokenCode) pairingTokenCode.textContent = data.pairingToken;
      if (pairingTokenDisplay) pairingTokenDisplay.textContent = 'Token: ' + data.pairingToken;
      if (directMobileLink) directMobileLink.href = data.pairingUrl;

      if (data.qrSvg && qrCodeRender) {
        qrCodeRender.innerHTML = data.qrSvg;
      } else if (data.qrDataUrl && qrCodeRender) {
        qrCodeRender.innerHTML = `<img src="${data.qrDataUrl}" alt="Pairing QR Code" style="width:100%;height:100%;display:block;" />`;
      } else {
        renderQrCodeGraphic(data.pairingUrl);
      }
    }
  } catch (err) {
    console.warn('Network request for server QR code failed, using client QR:', err);
  }
}

/**
 * Fetch latest bridge state
 */
async function fetchBridgeState() {
  try {
    const res = await fetch('/api/sms/state');
    const data = await res.json();
    if (!data.ok) return;

    bridgeState = data;
    renderDeviceStatus(data.pairedDevice);
    renderMessages(data.messages || []);
    analyzeMessageState(data.messages || []);
  } catch (err) {
    console.error('Error fetching bridge state:', err);
  }
}

/**
 * Render phone pairing status
 */
function renderDeviceStatus(device) {
  if (device && device.isOnline) {
    deviceConnectedView.style.display = 'flex';
    deviceDisconnectedView.style.display = 'none';

    connectedDeviceName.textContent = device.name || 'Android Phone';
    connectedSim.textContent = device.carrier || 'Teletalk Bangladesh';
    connectedBattery.textContent = (device.battery !== undefined ? device.battery : 90) + '%';
    connectedLastseen.textContent = 'Connected (Active)';

    gatewayStatusBadge.textContent = 'ONLINE';
    gatewayStatusBadge.className = 'step-badge';
    gatewayStatusBadge.style.background = '#dcfce7';
    gatewayStatusBadge.style.color = '#166534';
  } else if (device) {
    deviceConnectedView.style.display = 'flex';
    deviceDisconnectedView.style.display = 'none';

    connectedDeviceName.textContent = device.name || 'Android Phone';
    connectedSim.textContent = device.carrier || 'Teletalk Bangladesh';
    connectedBattery.textContent = (device.battery !== undefined ? device.battery : 90) + '%';
    connectedLastseen.textContent = 'Last seen ' + new Date(device.lastSeen).toLocaleTimeString();

    gatewayStatusBadge.textContent = 'STANDBY';
    gatewayStatusBadge.className = 'step-badge';
    gatewayStatusBadge.style.background = '#fef3c7';
    gatewayStatusBadge.style.color = '#92400e';
  } else {
    deviceConnectedView.style.display = 'none';
    deviceDisconnectedView.style.display = 'flex';

    gatewayStatusBadge.textContent = 'AWAITING PHONE';
    gatewayStatusBadge.className = 'step-badge';
    gatewayStatusBadge.style.background = '#f1f5f9';
    gatewayStatusBadge.style.color = '#475569';
  }
}

/**
 * Render SMS thread history
 */
function renderMessages(messages) {
  if (!messages || messages.length === 0) {
    smsFeedContainer.innerHTML = `
      <div style="text-align: center; color: var(--color-text-muted); font-size: 13px; padding: 20px;">
        No messages yet. Messages sent via your phone will appear here.
      </div>
    `;
    return;
  }

  // Reverse copy for newest on top or bottom
  const sorted = [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  smsFeedContainer.innerHTML = '';
  sorted.forEach(msg => {
    const bubble = document.createElement('div');
    const isOut = msg.direction === 'outgoing';
    bubble.className = `msg-bubble ${isOut ? 'msg-bubble--outgoing' : 'msg-bubble--incoming'}`;

    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
    const senderTitle = isOut ? `Desktop ➔ Phone ➔ ${msg.recipient}` : `${msg.sender} ➔ Phone ➔ Desktop`;

    let parsedExtra = '';
    if (msg.parsed && msg.parsed.isTeletalk) {
      if (msg.parsed.pin) {
        parsedExtra = `<div class="parsed-badge">🔑 PIN Auto-Extracted: ${msg.parsed.pin} (Fee: Tk. ${msg.parsed.fee || '220'})</div>`;
      } else if (msg.parsed.password) {
        parsedExtra = `<div class="parsed-badge" style="background:#dbeafe; color:#1e40af;">🎉 Fee Paid! Password: ${msg.parsed.password}</div>`;
      }
    }

    bubble.innerHTML = `
      <div class="msg-meta">
        <strong>${senderTitle}</strong>
        <span>${timeStr}</span>
      </div>
      <div style="word-break: break-word;">${msg.body}</div>
      ${parsedExtra}
    `;

    smsFeedContainer.appendChild(bubble);
  });

  // Auto-scroll to bottom
  smsFeedContainer.scrollTop = smsFeedContainer.scrollHeight;
}

/**
 * Inspect messages to auto-advance wizard steps
 */
function analyzeMessageState(messages) {
  const currentOrg = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const currentUid = (userIdInput.value || '7A8B9C').trim().toUpperCase();

  // Check if 1st SMS was sent
  const out1 = messages.find(m => m.direction === 'outgoing' && m.body && m.body.includes(currentUid));
  if (out1) {
    step1Status.textContent = '✅ Sent via phone SIM';
    step1Status.style.color = 'var(--color-success)';
    step1Card.classList.add('wizard-step--completed');
  }

  // Check if PIN reply arrived
  const pinMsg = messages.find(m => m.parsed && m.parsed.pin);
  if (pinMsg) {
    const parsed = pinMsg.parsed;
    currentDetectedPin = parsed.pin;
    pinDetectedBox.style.display = 'block';
    detectedPin.textContent = parsed.pin;
    if (parsed.fee) detectedFee.textContent = `Fee: Tk. ${parsed.fee}`;
    if (parsed.applicantName) detectedName.textContent = parsed.applicantName;

    manualPinInput.value = parsed.pin;
    step2PreviewText.textContent = `${currentOrg} YES ${parsed.pin}`;
    step2Status.textContent = '✅ PIN detected! Ready for 2nd SMS';
    step2Status.style.color = 'var(--color-success)';
    step2Card.classList.add('wizard-step--active');
    sendStep2Btn.disabled = false;
  }

  // Check if Password reply arrived
  const passMsg = messages.find(m => m.parsed && m.parsed.password);
  if (passMsg) {
    const parsed = passMsg.parsed;
    currentDetectedPassword = parsed.password;
    passwordConfirmedBox.style.display = 'block';
    passwordAwaitHint.style.display = 'none';

    finalUserId.textContent = parsed.userId || currentUid;
    finalPassword.textContent = parsed.password;

    step3Status.textContent = '🎉 Payment confirmed!';
    step3Status.style.color = 'var(--color-success)';
    step3Card.classList.add('wizard-step--completed');
    step2Card.classList.add('wizard-step--completed');
  }
}

/**
 * Send Step 1 SMS via Phone
 */
sendStep1Btn.addEventListener('click', async () => {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput.value || '').trim().toUpperCase();

  if (!uid) {
    alert('Please enter your Applicant User ID.');
    userIdInput.focus();
    return;
  }

  const body = `${org} ${uid}`;
  sendStep1Btn.disabled = true;
  step1Status.textContent = '⏳ Queuing to phone...';

  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '16222',
        body,
        type: '1ST_SMS',
        orgCode: org,
        userId: uid
      })
    });
    const data = await res.json();
    if (data.ok) {
      step1Status.textContent = '📲 Queued! Open companion on phone to send';
      step1Status.style.color = 'var(--color-primary)';
      await fetchBridgeState();
    } else {
      alert('Error: ' + data.error);
      step1Status.textContent = 'Failed to queue';
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  } finally {
    sendStep1Btn.disabled = false;
  }
});

/**
 * Send Step 2 Confirmation SMS via Phone
 */
sendStep2Btn.addEventListener('click', async () => {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const pin = manualPinInput.value.trim() || currentDetectedPin;

  if (!pin) {
    alert('Please enter or await the PIN from 16222.');
    manualPinInput.focus();
    return;
  }

  const body = `${org} YES ${pin}`;
  sendStep2Btn.disabled = true;
  step2Status.textContent = '⏳ Queuing 2nd SMS to phone...';

  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: '16222',
        body,
        type: '2ND_SMS',
        orgCode: org,
        pin
      })
    });
    const data = await res.json();
    if (data.ok) {
      step2Status.textContent = '📲 2nd SMS Queued! Sending from phone...';
      step2Status.style.color = 'var(--color-primary)';
      await fetchBridgeState();
    } else {
      alert('Error: ' + data.error);
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  } finally {
    sendStep2Btn.disabled = false;
  }
});

/**
 * Save Credentials to Application Tracker
 */
saveToApplicationsBtn.addEventListener('click', () => {
  const uid = (userIdInput.value || '').trim().toUpperCase();
  const org = (orgCodeInput.value || '').trim().toUpperCase();
  const pin = currentDetectedPin;
  const pass = currentDetectedPassword;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['applications'], (result) => {
      const apps = result.applications || [];
      // Find matching app by userId or org
      const target = apps.find(a => (a.userId && a.userId.toUpperCase() === uid) || (a.orgCode === org));
      if (target) {
        target.feeStatus = 'Paid';
        target.pin = pin;
        target.password = pass;
        target.paidAt = new Date().toISOString();
      } else {
        // Add new record
        apps.push({
          id: 'app_' + Date.now(),
          orgCode: org,
          userId: uid,
          postName: 'Application (' + org + ')',
          feeStatus: 'Paid',
          pin,
          password: pass,
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      }

      chrome.storage.local.set({ applications: apps }, () => {
        saveToApplicationsBtn.textContent = '✅ Saved to Application Tracker!';
        saveToApplicationsBtn.disabled = true;
        setTimeout(() => {
          saveToApplicationsBtn.textContent = '💾 Save Credentials to Application Tracker';
          saveToApplicationsBtn.disabled = false;
        }, 3000);
      });
    });
  } else {
    alert('Credentials saved: User ID ' + uid + ' | Password ' + pass);
  }
});

/**
 * Quick Custom SMS Send
 */
sendCustomSmsBtn.addEventListener('click', async () => {
  const recipient = customRecipient.value.trim();
  const body = customBody.value.trim();

  if (!recipient || !body) {
    alert('Please enter both recipient number and message text.');
    return;
  }

  sendCustomSmsBtn.disabled = true;
  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, body, type: 'CUSTOM' })
    });
    const data = await res.json();
    if (data.ok) {
      customBody.value = '';
      await fetchBridgeState();
    }
  } catch (err) {
    alert('Failed to send: ' + err.message);
  } finally {
    sendCustomSmsBtn.disabled = false;
  }
});

/**
 * Instant Simulators
 */
simulatePinReplyBtn.addEventListener('click', async () => {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput.value || '7A8B9C').trim().toUpperCase();
  const name = applicantNameInput.value.trim() || 'MD HABIBUR RAHMAN';

  try {
    const res = await fetch('/api/sms/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PIN_NOTIFICATION', orgCode: org, userId: uid, applicantName: name })
    });
    const data = await res.json();
    if (data.ok) {
      await fetchBridgeState();
    }
  } catch (e) {
    alert(e.message);
  }
});

simulatePassReplyBtn.addEventListener('click', async () => {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput.value || '7A8B9C').trim().toUpperCase();

  try {
    const res = await fetch('/api/sms/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PAYMENT_CONFIRMATION', orgCode: org, userId: uid })
    });
    const data = await res.json();
    if (data.ok) {
      await fetchBridgeState();
    }
  } catch (e) {
    alert(e.message);
  }
});

/**
 * Refresh QR Code / New Pairing Token
 */
if (refreshQrBtn) {
  refreshQrBtn.addEventListener('click', () => {
    loadQrCode(true);
  });
}

/**
 * Copy Pairing Code
 */
if (copyTokenBtn) {
  copyTokenBtn.addEventListener('click', async () => {
    const code = pairingTokenCode ? pairingTokenCode.textContent.trim() : bridgeState.pairingToken;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      const originalText = copyTokenBtn.innerHTML;
      copyTokenBtn.innerHTML = '✅ Copied!';
      setTimeout(() => {
        copyTokenBtn.innerHTML = originalText;
      }, 2000);
    } catch (e) {
      alert('Pairing Code: ' + code);
    }
  });
}

/**
 * Copy Mobile Companion Link
 */
if (copyMobileLinkBtn) {
  copyMobileLinkBtn.addEventListener('click', async () => {
    const link = directMobileLink ? directMobileLink.href : window.location.origin + '/mobile-sms-bridge.html?token=' + bridgeState.pairingToken;
    try {
      await navigator.clipboard.writeText(link);
      const originalText = copyMobileLinkBtn.innerHTML;
      copyMobileLinkBtn.innerHTML = '✅ Copied!';
      setTimeout(() => {
        copyMobileLinkBtn.innerHTML = originalText;
      }, 2000);
    } catch (e) {
      alert('Link: ' + link);
    }
  });
}

/**
 * Toggle QR view when phone is connected
 */
if (toggleQrModalBtn) {
  toggleQrModalBtn.addEventListener('click', () => {
    if (deviceDisconnectedView) {
      const isHidden = window.getComputedStyle(deviceDisconnectedView).display === 'none';
      deviceDisconnectedView.style.display = isHidden ? 'flex' : 'none';
      toggleQrModalBtn.textContent = isHidden ? 'Hide QR Code' : 'Show QR Code';
      if (isHidden) {
        loadQrCode(false);
      }
    }
  });
}

/**
 * Unpair device
 */
unpairDeviceBtn.addEventListener('click', async () => {
  if (confirm('Unlink this mobile phone from the SMS gateway?')) {
    try {
      await fetch('/api/sms/unpair', { method: 'POST' });
      await loadQrCode();
      await fetchBridgeState();
    } catch (e) {
      alert(e.message);
    }
  }
});

refreshStateBtn.addEventListener('click', () => {
  fetchBridgeState();
});

// Initialization
loadSavedApplications();
loadQrCode();
fetchBridgeState();
updatePreviews();

// Periodic state poll
setInterval(fetchBridgeState, 3000);
