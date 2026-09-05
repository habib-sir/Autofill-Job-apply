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

// Android Phone Direct Gateway Elements
const sendStep1PhoneBtn = document.getElementById('send-step-1-phone-btn');
const step1PhoneStatus = document.getElementById('step-1-phone-status');
const sendStep2PhoneBtn = document.getElementById('send-step-2-phone-btn');
const step2PhoneStatus = document.getElementById('step-2-phone-status');

const openSetupModalBtn = document.getElementById('open-setup-modal-btn');
const openAppGuideBtn = document.getElementById('open-app-guide-btn');
const closeSetupModalBtn = document.getElementById('close-setup-modal-btn');
const modalDoneBtn = document.getElementById('modal-done-btn');
const androidSetupModal = document.getElementById('android-setup-modal');

const modalGatewayUrl = document.getElementById('modal-gateway-url');
const modalPairingToken = document.getElementById('modal-pairing-token');
const termuxScriptUrl = document.getElementById('termux-script-url');

const tabMacrodroidBtn = document.getElementById('tab-macrodroid-btn');
const tabTermuxBtn = document.getElementById('tab-termux-btn');
const tabAndroidAppBtn = document.getElementById('tab-android-app-btn');
const tabContentMacrodroid = document.getElementById('tab-content-macrodroid');
const tabContentTermux = document.getElementById('tab-content-termux');
const tabContentAndroidApp = document.getElementById('tab-content-android-app');

const simulateConnectPhoneBtn = document.getElementById('simulate-connect-phone-btn');
const sendTestPingBtn = document.getElementById('send-test-ping-btn');

// Wi-Fi / LAN IP controls (optional fallback)
const wifiConfigBanner = document.getElementById('wifi-config-banner');
const wifiIpInput = document.getElementById('wifi-ip-input');
const wifiPortInput = document.getElementById('wifi-port-input');
const applyWifiIpBtn = document.getElementById('apply-wifi-ip-btn');
const resetLocalhostBtn = document.getElementById('reset-localhost-btn');
const detectedIpsWrapper = document.getElementById('detected-ips-wrapper');
const detectedIpsList = document.getElementById('detected-ips-list');

let currentCustomHost = localStorage.getItem('bd_job_sms_custom_host') || '';

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

// Direct Scan-to-Send QR & Action Elements
const step1QrCanvas = document.getElementById('step-1-qr-canvas');
const copyStep1SmsBtn = document.getElementById('copy-step-1-sms-btn');
const copy16222Btn = document.getElementById('copy-16222-btn');
const step1SmsLink = document.getElementById('step-1-sms-link');
const markStep1SentBtn = document.getElementById('mark-step-1-sent-btn');

const step2QrCanvas = document.getElementById('step-2-qr-canvas');
const copyStep2SmsBtn = document.getElementById('copy-step-2-sms-btn');
const step2SmsLink = document.getElementById('step-2-sms-link');
const markStep2SentBtn = document.getElementById('mark-step-2-sent-btn');

// Smart 16222 Reply Parser Elements
const incomingSmsTextarea = document.getElementById('incoming-sms-textarea');
const parseIncomingBtn = document.getElementById('parse-incoming-btn');
const pasteSamplePinBtn = document.getElementById('paste-sample-pin-btn');
const pasteSamplePassBtn = document.getElementById('paste-sample-pass-btn');
const parseFeedbackMsg = document.getElementById('parse-feedback-msg');

// Activity Feed & Simulators
const smsFeedContainer = document.getElementById('sms-feed-container');
const simulatePinReplyBtn = document.getElementById('simulate-pin-reply-btn');
const simulatePassReplyBtn = document.getElementById('simulate-pass-reply-btn');

/**
 * Toast feedback notification
 */
function showSmsToast(msg) {
  const existing = document.querySelector('.sms-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'sms-toast';
  toast.innerHTML = `<span>📋</span> <span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/**
 * Copy to clipboard with fallback
 */
function copyToClipboard(text, feedback) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showSmsToast(feedback || 'Copied to clipboard!');
    }).catch(() => fallbackCopy(text, feedback));
  } else {
    fallbackCopy(text, feedback);
  }
}

function fallbackCopy(text, feedback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showSmsToast(feedback || 'Copied to clipboard!');
  } catch (e) {
    prompt('Copy to clipboard:', text);
  }
  document.body.removeChild(ta);
}

/**
 * Render Instant Scan-to-Send QR codes for Step 1 and Step 2
 */
function renderDirectSmsQrs() {
  const org = (orgCodeInput?.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput?.value || '7A8B9C').trim().toUpperCase();
  const step1Body = `${org} ${uid}`;
  const step1Uri = `SMSTO:16222:${step1Body}`;
  const step1WebUri = `sms:16222?body=${encodeURIComponent(step1Body)}`;

  if (step1SmsLink) step1SmsLink.href = step1WebUri;
  if (step1QrCanvas && typeof QRCodeLib !== 'undefined') {
    QRCodeLib.toCanvas(step1QrCanvas, step1Uri, {
      margin: 1,
      width: 120,
      color: { dark: '#0f172a', light: '#ffffff' }
    }, (err) => {
      if (err) console.error('Step 1 QR generation error:', err);
    });
  }

  const pin = manualPinInput?.value?.trim() || currentDetectedPin || '12345678';
  const step2Body = `${org} YES ${pin}`;
  const step2Uri = `SMSTO:16222:${step2Body}`;
  const step2WebUri = `sms:16222?body=${encodeURIComponent(step2Body)}`;

  if (step2SmsLink) step2SmsLink.href = step2WebUri;
  if (step2QrCanvas && typeof QRCodeLib !== 'undefined') {
    QRCodeLib.toCanvas(step2QrCanvas, step2Uri, {
      margin: 1,
      width: 120,
      color: { dark: '#0f172a', light: '#ffffff' }
    }, (err) => {
      if (err) console.error('Step 2 QR generation error:', err);
    });
  }
}

/**
 * Update previews based on orgCode and userId
 */
function updatePreviews() {
  const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
  const uid = (userIdInput.value || 'USERID').trim().toUpperCase();
  step1PreviewText.textContent = `${org} ${uid}`;

  const pin = manualPinInput.value.trim() || currentDetectedPin || '[PIN]';
  step2PreviewText.textContent = `${org} YES ${pin}`;

  renderDirectSmsQrs();
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
 * Determine base URL for mobile companion (LAN Wi-Fi IP or current origin)
 */
function getResolvedBaseUrl() {
  if (currentCustomHost) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${currentCustomHost}`;
  }
  return window.location.origin;
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

  const baseUrl = getResolvedBaseUrl();
  const fallbackUrl = `${baseUrl}/mobile-sms-bridge.html?token=${token}`;

  if (pairingTokenCode) pairingTokenCode.textContent = token;
  if (pairingTokenDisplay) pairingTokenDisplay.textContent = 'Token: ' + token;
  if (directMobileLink) directMobileLink.href = fallbackUrl;

  // Render immediately so QR code is never blank
  renderQrCodeGraphic(fallbackUrl);

  try {
    const endpoint = forceNew ? '/api/sms/reset-token' : '/api/sms/qr';
    const queryParams = currentCustomHost ? `?customHost=${encodeURIComponent(currentCustomHost)}` : '';
    const res = await fetch(`${endpoint}${queryParams}`, { method: forceNew ? 'POST' : 'GET' });
    const data = await res.json();
    if (data.ok) {
      bridgeState.pairingToken = data.pairingToken;
      localStorage.setItem('bd_job_pairing_token', data.pairingToken);

      const targetUrl = data.pairingUrl || fallbackUrl;
      if (pairingTokenCode) pairingTokenCode.textContent = data.pairingToken;
      if (pairingTokenDisplay) pairingTokenDisplay.textContent = 'Token: ' + data.pairingToken;
      if (directMobileLink) directMobileLink.href = targetUrl;

      if (data.qrSvg && qrCodeRender) {
        qrCodeRender.innerHTML = data.qrSvg;
      } else if (data.qrDataUrl && qrCodeRender) {
        qrCodeRender.innerHTML = `<img src="${data.qrDataUrl}" alt="Pairing QR Code" style="width:100%;height:100%;display:block;" />`;
      } else {
        renderQrCodeGraphic(targetUrl);
      }
    }
  } catch (err) {
    console.warn('Network request for server QR code failed, using client QR:', err);
  }
}

/**
 * Initialize Wi-Fi IP auto-detection and custom host management
 */
async function initWifiConfig() {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (currentCustomHost) {
    const parts = currentCustomHost.split(':');
    if (wifiIpInput) wifiIpInput.value = parts[0] || '';
    if (wifiPortInput) wifiPortInput.value = parts[1] || '3000';
  } else if (isLocalhost) {
    if (wifiPortInput) wifiPortInput.value = window.location.port || '3000';
  }

  try {
    const res = await fetch('/api/sms/network-ips');
    const data = await res.json();
    if (data.ok && data.ips && data.ips.length > 0) {
      if (detectedIpsWrapper && detectedIpsList) {
        detectedIpsWrapper.style.display = 'block';
        detectedIpsList.innerHTML = '';
        data.ips.forEach(item => {
          const pill = document.createElement('button');
          pill.className = 'wifi-ip-pill';
          pill.type = 'button';
          pill.textContent = `${item.address} (${item.interface})`;
          pill.title = `Click to use Wi-Fi IP ${item.address}:${data.port || 3000}`;
          
          if (currentCustomHost === `${item.address}:${data.port || 3000}`) {
            pill.classList.add('active');
          }
          
          pill.addEventListener('click', () => {
            if (wifiIpInput) wifiIpInput.value = item.address;
            if (wifiPortInput) wifiPortInput.value = data.port || '3000';
            applyCustomWifiHost(`${item.address}:${data.port || 3000}`);
          });
          detectedIpsList.appendChild(pill);
        });
      }

      // If user is currently on localhost without a saved custom host, prefill with first non-internal IP
      if (isLocalhost && !currentCustomHost && data.suggestedIp) {
        if (wifiIpInput && !wifiIpInput.value) {
          wifiIpInput.value = data.suggestedIp;
        }
      }
    }
  } catch (err) {
    console.debug('Network IP auto-discovery skipped:', err);
  }
}

function applyCustomWifiHost(hostString) {
  currentCustomHost = (hostString || '').trim();
  if (currentCustomHost) {
    localStorage.setItem('bd_job_sms_custom_host', currentCustomHost);
  } else {
    localStorage.removeItem('bd_job_sms_custom_host');
  }

  if (detectedIpsList) {
    const pills = detectedIpsList.querySelectorAll('.wifi-ip-pill');
    pills.forEach(p => {
      p.classList.toggle('active', currentCustomHost && p.textContent.startsWith(currentCustomHost.split(':')[0]));
    });
  }

  loadQrCode(false);
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
 * Direct Send 1st SMS via Connected Phone
 */
if (sendStep1PhoneBtn) {
  sendStep1PhoneBtn.addEventListener('click', async () => {
    const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
    const uid = (userIdInput.value || '').trim().toUpperCase();

    if (!uid) {
      alert('Please enter your Applicant User ID.');
      userIdInput.focus();
      return;
    }

    const body = `${org} ${uid}`;
    sendStep1PhoneBtn.disabled = true;
    
    if (step1PhoneStatus) {
      step1PhoneStatus.style.display = 'block';
      step1PhoneStatus.style.background = '#eff6ff';
      step1PhoneStatus.style.color = '#1e40af';
      step1PhoneStatus.style.border = '1px solid #bfdbfe';
      step1PhoneStatus.innerHTML = `<span>⏳</span> Dispatching to phone... Command: <code>${body}</code> &rarr; 16222`;
    }

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
        showSmsToast('Dispatched to phone! Sending via Teletalk SIM...');
        if (step1PhoneStatus) {
          step1PhoneStatus.style.background = '#ecfdf5';
          step1PhoneStatus.style.color = '#065f46';
          step1PhoneStatus.style.border = '1px solid #a7f3d0';
          step1PhoneStatus.innerHTML = `<span>🚀</span> <strong>SMS Command Active!</strong> Phone is sending <code>${body}</code> to 16222 via Teletalk.`;
        }
        step1Status.textContent = '🚀 Sending via Phone Teletalk SIM...';
        step1Status.style.color = 'var(--color-primary)';
        step1Card.classList.add('wizard-step--completed');
        step2Card.classList.add('wizard-step--active');
        await fetchBridgeState();
      } else {
        alert('Error: ' + data.error);
        if (step1PhoneStatus) {
          step1PhoneStatus.style.background = '#fef2f2';
          step1PhoneStatus.style.color = '#991b1b';
          step1PhoneStatus.textContent = 'Failed to dispatch: ' + data.error;
        }
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      sendStep1PhoneBtn.disabled = false;
    }
  });
}

/**
 * Direct Send 2nd Confirmation SMS via Connected Phone
 */
if (sendStep2PhoneBtn) {
  sendStep2PhoneBtn.addEventListener('click', async () => {
    const org = (orgCodeInput.value || 'BPSC').trim().toUpperCase();
    const pin = manualPinInput.value.trim() || currentDetectedPin;

    if (!pin) {
      alert('Please enter or await the PIN from 16222.');
      manualPinInput.focus();
      return;
    }

    const body = `${org} YES ${pin}`;
    sendStep2PhoneBtn.disabled = true;

    if (step2PhoneStatus) {
      step2PhoneStatus.style.display = 'block';
      step2PhoneStatus.style.background = '#eff6ff';
      step2PhoneStatus.style.color = '#1e40af';
      step2PhoneStatus.style.border = '1px solid #bfdbfe';
      step2PhoneStatus.innerHTML = `<span>⏳</span> Dispatching Confirmation SMS to phone: <code>${body}</code> &rarr; 16222`;
    }

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
        showSmsToast('Confirmation SMS dispatched to phone!');
        if (step2PhoneStatus) {
          step2PhoneStatus.style.background = '#ecfdf5';
          step2PhoneStatus.style.color = '#065f46';
          step2PhoneStatus.style.border = '1px solid #a7f3d0';
          step2PhoneStatus.innerHTML = `<span>✅</span> <strong>Sent from Phone!</strong> Teletalk is deducting fee. Awaiting confirmation password...`;
        }
        step2Status.textContent = '✅ Confirmation sent from phone!';
        step2Status.style.color = 'var(--color-success)';
        step2Card.classList.add('wizard-step--completed');
        step3Card.classList.add('wizard-step--active');
        await fetchBridgeState();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      sendStep2PhoneBtn.disabled = false;
    }
  });
}

/**
 * Simulate Connected Android Phone (Instant Testing & Demonstration)
 */
if (simulateConnectPhoneBtn) {
  simulateConnectPhoneBtn.addEventListener('click', async () => {
    simulateConnectPhoneBtn.disabled = true;
    simulateConnectPhoneBtn.textContent = 'Connecting...';
    try {
      const token = bridgeState.pairingToken || localStorage.getItem('bd_job_pairing_token') || 'BT-DEMO';
      const res = await fetch('/api/sms/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceName: 'Samsung Galaxy (Teletalk 4G)',
          phoneModel: 'SM-G998B',
          simCarrier: 'Teletalk Bangladesh (SIM 1)',
          batteryLevel: 94
        })
      });
      const data = await res.json();
      if (data.ok) {
        showSmsToast('Phone Gateway Connected! Full SMS Access active.');
        await fetchBridgeState();
      } else {
        alert('Pairing error: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      simulateConnectPhoneBtn.disabled = false;
      simulateConnectPhoneBtn.textContent = '⚡ Connect Simulated Phone';
    }
  });
}

/**
 * Send Test Ping to Phone
 */
if (sendTestPingBtn) {
  sendTestPingBtn.addEventListener('click', async () => {
    sendTestPingBtn.disabled = true;
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: '16222',
          body: 'PING_CHECK ' + Math.floor(1000 + Math.random() * 9000),
          type: 'TEST'
        })
      });
      const data = await res.json();
      if (data.ok) {
        showSmsToast('Test ping job sent to phone queue!');
        await fetchBridgeState();
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      sendTestPingBtn.disabled = false;
    }
  });
}

/**
 * Setup Modal & Tab Navigation
 */
function openAndroidSetupModal() {
  if (!androidSetupModal) return;
  androidSetupModal.style.display = 'flex';
  const token = bridgeState.pairingToken || localStorage.getItem('bd_job_pairing_token') || 'BT-DEMO';
  if (modalGatewayUrl) modalGatewayUrl.textContent = window.location.origin;
  if (modalPairingToken) modalPairingToken.textContent = token;
  if (termuxScriptUrl) termuxScriptUrl.textContent = window.location.origin + '/android-sms-gateway/termux-gateway.sh';
}

if (openSetupModalBtn) openSetupModalBtn.addEventListener('click', openAndroidSetupModal);
if (openAppGuideBtn) openAppGuideBtn.addEventListener('click', openAndroidSetupModal);
if (closeSetupModalBtn) closeSetupModalBtn.addEventListener('click', () => { if (androidSetupModal) androidSetupModal.style.display = 'none'; });
if (modalDoneBtn) modalDoneBtn.addEventListener('click', () => { if (androidSetupModal) androidSetupModal.style.display = 'none'; });

if (tabMacrodroidBtn && tabTermuxBtn && tabAndroidAppBtn) {
  tabMacrodroidBtn.addEventListener('click', () => {
    if (tabContentMacrodroid) tabContentMacrodroid.style.display = 'block';
    if (tabContentTermux) tabContentTermux.style.display = 'none';
    if (tabContentAndroidApp) tabContentAndroidApp.style.display = 'none';
    tabMacrodroidBtn.className = 'btn btn-primary btn-sm';
    tabTermuxBtn.className = 'btn btn-secondary btn-sm';
    tabAndroidAppBtn.className = 'btn btn-secondary btn-sm';
  });
  tabTermuxBtn.addEventListener('click', () => {
    if (tabContentMacrodroid) tabContentMacrodroid.style.display = 'none';
    if (tabContentTermux) tabContentTermux.style.display = 'block';
    if (tabContentAndroidApp) tabContentAndroidApp.style.display = 'none';
    tabMacrodroidBtn.className = 'btn btn-secondary btn-sm';
    tabTermuxBtn.className = 'btn btn-primary btn-sm';
    tabAndroidAppBtn.className = 'btn btn-secondary btn-sm';
  });
  tabAndroidAppBtn.addEventListener('click', () => {
    if (tabContentMacrodroid) tabContentMacrodroid.style.display = 'none';
    if (tabContentTermux) tabContentTermux.style.display = 'none';
    if (tabContentAndroidApp) tabContentAndroidApp.style.display = 'block';
    tabMacrodroidBtn.className = 'btn btn-secondary btn-sm';
    tabTermuxBtn.className = 'btn btn-secondary btn-sm';
    tabAndroidAppBtn.className = 'btn btn-primary btn-sm';
  });
}

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

// Wi-Fi Setup Event Listeners
if (applyWifiIpBtn) {
  applyWifiIpBtn.addEventListener('click', () => {
    const ip = (wifiIpInput?.value || '').trim();
    const port = (wifiPortInput?.value || '3000').trim();
    if (!ip) {
      alert('Please enter your computer\'s Wi-Fi IP address (e.g. 192.168.1.15).');
      return;
    }
    const host = port ? `${ip}:${port}` : ip;
    applyCustomWifiHost(host);
  });
}

if (resetLocalhostBtn) {
  resetLocalhostBtn.addEventListener('click', () => {
    if (wifiIpInput) wifiIpInput.value = '';
    applyCustomWifiHost('');
  });
}

if (wifiIpInput) {
  wifiIpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      applyWifiIpBtn?.click();
    }
  });
}

// Direct Scan-to-Send & Parser Event Listeners
if (copyStep1SmsBtn) {
  copyStep1SmsBtn.addEventListener('click', () => {
    const org = (orgCodeInput?.value || 'BPSC').trim().toUpperCase();
    const uid = (userIdInput?.value || '7A8B9C').trim().toUpperCase();
    copyToClipboard(`${org} ${uid}`, '1st SMS text copied!');
  });
}

if (copy16222Btn) {
  copy16222Btn.addEventListener('click', () => {
    copyToClipboard('16222', 'Recipient 16222 copied!');
  });
}

if (copyStep2SmsBtn) {
  copyStep2SmsBtn.addEventListener('click', () => {
    const org = (orgCodeInput?.value || 'BPSC').trim().toUpperCase();
    const pin = manualPinInput?.value?.trim() || currentDetectedPin || '12345678';
    copyToClipboard(`${org} YES ${pin}`, 'Confirmation SMS copied!');
  });
}

if (markStep1SentBtn) {
  markStep1SentBtn.addEventListener('click', () => {
    step1Status.textContent = '✅ Sent from phone (marked manually)';
    step1Status.style.color = 'var(--color-success)';
    step1Card.classList.add('wizard-step--completed');
    step2Card.classList.add('wizard-step--active');
    showSmsToast('Step 1 marked as sent!');
  });
}

if (markStep2SentBtn) {
  markStep2SentBtn.addEventListener('click', () => {
    step2Status.textContent = '✅ Confirmation SMS sent from phone';
    step2Status.style.color = 'var(--color-success)';
    step2Card.classList.add('wizard-step--completed');
    step3Card.classList.add('wizard-step--active');
    showSmsToast('Step 2 marked as sent!');
  });
}

if (parseIncomingBtn) {
  parseIncomingBtn.addEventListener('click', async () => {
    const raw = (incomingSmsTextarea?.value || '').trim();
    if (!raw) {
      alert('Please paste the SMS text from 16222 or enter your 8-digit PIN.');
      incomingSmsTextarea?.focus();
      return;
    }

    parseIncomingBtn.disabled = true;
    parseIncomingBtn.innerHTML = '<span>⏳</span> Parsing...';

    try {
      const res = await fetch('/api/sms/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: '16222',
          body: raw
        })
      });
      const data = await res.json();
      if (data.ok) {
        const parsed = data.message?.parsed;
        if (parseFeedbackMsg) {
          parseFeedbackMsg.style.display = 'block';
          if (parsed?.pin) {
            parseFeedbackMsg.style.background = '#ecfdf5';
            parseFeedbackMsg.style.color = '#065f46';
            parseFeedbackMsg.style.border = '1px solid #a7f3d0';
            parseFeedbackMsg.innerHTML = `✅ <strong>PIN Detected: ${parsed.pin}</strong> (Fee: Tk. ${parsed.fee || '220'}). Step 2 is ready!`;
            manualPinInput.value = parsed.pin;
            currentDetectedPin = parsed.pin;
            sendStep2Btn.disabled = false;
            updatePreviews();
            showSmsToast(`PIN ${parsed.pin} extracted successfully!`);
          } else if (parsed?.password) {
            parseFeedbackMsg.style.background = '#eff6ff';
            parseFeedbackMsg.style.color = '#1e40af';
            parseFeedbackMsg.style.border = '1px solid #bfdbfe';
            parseFeedbackMsg.innerHTML = `🎉 <strong>Payment Confirmed!</strong> Password: <strong>${parsed.password}</strong>`;
            showSmsToast('Payment confirmation password extracted!');
          } else {
            parseFeedbackMsg.style.background = '#fef3c7';
            parseFeedbackMsg.style.color = '#92400e';
            parseFeedbackMsg.style.border = '1px solid #fde68a';
            parseFeedbackMsg.innerHTML = `⚠️ SMS recorded. If a PIN was included, please type it in the "Enter PIN" box.`;
          }
        }
        await fetchBridgeState();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      parseIncomingBtn.disabled = false;
      parseIncomingBtn.innerHTML = '<span>⚡</span> Extract &amp; Proceed to Step 2';
    }
  });
}

if (pasteSamplePinBtn) {
  pasteSamplePinBtn.addEventListener('click', () => {
    if (incomingSmsTextarea) {
      const name = applicantNameInput?.value?.trim() || 'MD HABIBUR RAHMAN';
      const uid = (userIdInput?.value || '7A8B9C').trim().toUpperCase();
      const org = (orgCodeInput?.value || 'BPSC').trim().toUpperCase();
      incomingSmsTextarea.value = `${name}, Tk. 220 will be charged as application fee for ${org}. Your PIN is 54891234. To pay fee type ${org} YES 54891234 and send to 16222.`;
    }
    parseIncomingBtn?.click();
  });
}

if (pasteSamplePassBtn) {
  pasteSamplePassBtn.addEventListener('click', () => {
    if (incomingSmsTextarea) {
      const name = applicantNameInput?.value?.trim() || 'MD HABIBUR RAHMAN';
      const uid = (userIdInput?.value || '7A8B9C').trim().toUpperCase();
      const org = (orgCodeInput?.value || 'BPSC').trim().toUpperCase();
      incomingSmsTextarea.value = `Congratulations ${name}! Payment completed successfully for ${org} (${uid}). User ID is ${uid} and Password is BD${Math.floor(100000 + Math.random() * 900000)}.`;
    }
    parseIncomingBtn?.click();
  });
}

// Initialization
loadSavedApplications();
initWifiConfig();
loadQrCode();
fetchBridgeState();
updatePreviews();
renderDirectSmsQrs();

// Periodic state poll
setInterval(fetchBridgeState, 3000);
