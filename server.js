import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Enable CORS for mobile phone requests over local network
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Storage file for SMS state
const DATA_FILE = path.join(__dirname, 'sms-bridge-data.json');

function loadState() {
  let loaded = null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      loaded = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading sms-bridge-data.json:', err);
  }

  if (!loaded) {
    loaded = {
      pairedDevice: null,
      pairingToken: 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      pendingJobs: [],
      pendingCommands: [],
      simBalance: {
        amount: null,
        currency: 'BDT',
        lastChecked: null,
        source: 'none'
      },
      messages: []
    };
  }

  if (!loaded.pendingCommands) {
    loaded.pendingCommands = [];
  }

  if (!loaded.simBalance) {
    loaded.simBalance = {
      amount: null,
      currency: 'BDT',
      lastChecked: null,
      source: 'none'
    };
  }

  return loaded;
}

let state = loadState();

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving sms-bridge-data.json:', err);
  }
}

/**
 * Parses Teletalk 16222 SMS reply content for PIN, Fee, Name, Password, and SIM Balance
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
    suggestedReply: null,
    simBalance: null
  };

  if (!body || typeof body !== 'string') return result;

  const text = body.trim();

  // Balance pattern check (from *152# or Teletalk notifications)
  const balanceMatch = text.match(/(?:current\s*balance|main\s*balance|balance|acc\s*balance)\s*(?:is|:|=|-)?\s*(?:Tk\.?|BDT)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i) ||
                       text.match(/(?:Tk\.?|BDT)\s*([0-9]+(?:\.[0-9]{1,2})?)\s*(?:balance|remaining)/i) ||
                       text.match(/(?:Balance|Tk\.?)\s*[:=]\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (balanceMatch) {
    result.simBalance = balanceMatch[1];
  }

  // Direct raw PIN entered (e.g. 12345678)
  if (/^[0-9]{6,10}$/.test(text)) {
    result.isTeletalk = true;
    result.type = 'PIN_NOTIFICATION';
    result.pin = text;
    return result;
  }

  // Check if this is a 1st SMS reply containing PIN
  const pinMatch = text.match(/(?:PIN\s*(?:is|:|=|-)?|your\s*PIN\s*(?:is|:|=|-)?)\s*([0-9]{6,10})/i) ||
                   text.match(/PIN\s*[:= ]*\s*([0-9]{6,10})/i);
  const feeMatch = text.match(/Tk\.?\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i) ||
                   text.match(/([0-9]+)\s*Tk/i);
  const nameMatch = text.match(/Applicant(?:'s)?\s*Name\s*:\s*([^,\n\.]+)/i);
  const startNameMatch = text.match(/^([A-Z\s\.\-]{3,35}),\s*(?:Tk|Application)/i);
  const payTypeMatch = text.match(/type\s*(?:is|:)?\s*([A-Za-z0-9]+\s+YES\s+[0-9]+)/i) ||
                       text.match(/([A-Za-z0-9]+\s+YES\s+[0-9]{6,10})/i);

  // Check if this is a 2nd SMS reply containing User ID and Password
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
    }
  }

  return result;
}

// API: Get current bridge state
app.get('/api/sms/state', (req, res) => {
  const now = Date.now();
  const isOnline = state.pairedDevice && (now - (state.pairedDevice.lastSeen || 0) < 60000);

  res.json({
    ok: true,
    pairedDevice: state.pairedDevice ? { ...state.pairedDevice, isOnline } : null,
    pairingToken: state.pairingToken,
    pendingJobs: state.pendingJobs,
    pendingCommands: state.pendingCommands || [],
    simBalance: state.simBalance,
    messages: state.messages
  });
});

// API: Get current Teletalk balance
app.get('/api/sms/balance', (req, res) => {
  res.json({ ok: true, simBalance: state.simBalance });
});

// API: Trigger automated balance check via USSD *152#
app.post('/api/sms/check-balance', async (req, res) => {
  const code = req.body?.code || '*152#';
  const requestId = 'ussd_' + Date.now();

  if (!state.pendingCommands) state.pendingCommands = [];
  // Keep only active pending commands, cancel any stale previous USSD checks
  state.pendingCommands.forEach(c => {
    if (c.status === 'PENDING' && c.type === 'USSD') {
      c.status = 'CANCELLED';
    }
  });

  const cmd = {
    id: requestId,
    type: 'USSD',
    code: code,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  state.pendingCommands.push(cmd);

  // Check if paired device is active
  const now = Date.now();
  const isOnline = state.pairedDevice && (now - (state.pairedDevice.lastSeen || 0) < 60000);

  if (isOnline) {
    // Check quickly (up to 400ms) if phone already has immediate USSD response
    const start = Date.now();
    while (Date.now() - start < 400) {
      const found = state.pendingCommands.find(c => c.id === requestId);
      if (found && (found.status === 'COMPLETED' || found.status === 'FAILED')) {
        break;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // If command was completed by phone:
  const completedCmd = state.pendingCommands.find(c => c.id === requestId);
  if (completedCmd && completedCmd.status === 'COMPLETED' && completedCmd.parsedBalance) {
    state.simBalance = {
      amount: completedCmd.parsedBalance,
      currency: 'BDT',
      lastChecked: new Date().toISOString(),
      source: 'Teletalk USSD ' + code + ' (মোবাইল ফোন)'
    };
    saveState();
    return res.json({ ok: true, simBalance: state.simBalance, livePhone: true, hasRealBalance: true });
  }

  saveState();

  res.json({
    ok: true,
    simBalance: state.simBalance,
    hasRealBalance: !!(state.simBalance && state.simBalance.amount),
    commandId: requestId,
    isOnline: !!isOnline,
    message: isOnline
      ? 'ফোনে ব্যালেন্স চেক রিকোয়েস্ট পাঠানো হয়েছে।'
      : 'টেলিটক সিমে *152# ডায়াল করে আসল ব্যালেন্স চেক করুন।'
  });
});

// API: Phone app fetches pending commands (like USSD balance query)
app.get('/api/sms/pending-commands', (req, res) => {
  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }
  const pending = (state.pendingCommands || []).filter(c => c.status === 'PENDING');
  res.json({ ok: true, commands: pending });
});

// API: Phone reports USSD response result
app.post('/api/sms/ussd-response', (req, res) => {
  const { requestId, rawResponse, code } = req.body;
  const parsed = parseTeletalkSms(rawResponse || '');

  if (!state.pendingCommands) state.pendingCommands = [];
  const cmd = state.pendingCommands.find(c => c.id === requestId);
  if (cmd) {
    cmd.status = 'COMPLETED';
    cmd.rawResponse = rawResponse;
    cmd.parsedBalance = parsed.simBalance || null;
    cmd.completedAt = new Date().toISOString();
  }

  if (parsed.simBalance) {
    state.simBalance = {
      amount: parsed.simBalance,
      currency: 'BDT',
      lastChecked: new Date().toISOString(),
      source: 'Teletalk USSD ' + (code || '*152#')
    };
  } else if (rawResponse) {
    const m = rawResponse.match(/(?:Tk\.?|BDT)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (m) {
      state.simBalance = {
        amount: m[1],
        currency: 'BDT',
        lastChecked: new Date().toISOString(),
        source: 'Teletalk USSD ' + (code || '*152#')
      };
    }
  }

  saveState();
  res.json({ ok: true, simBalance: state.simBalance });
});

// API: Update Teletalk balance (manual or via USSD response)
app.post('/api/sms/balance', (req, res) => {
  const { amount, source } = req.body;
  state.simBalance = {
    amount: amount !== undefined && amount !== null && amount !== '' ? String(amount).trim() : state.simBalance?.amount,
    currency: 'BDT',
    lastChecked: new Date().toISOString(),
    source: source || 'manual'
  };
  saveState();
  res.json({ ok: true, simBalance: state.simBalance });
});

// API: Clear all messages & jobs permanently
app.post('/api/sms/clear', (req, res) => {
  state.messages = [];
  state.pendingJobs = [];
  saveState();
  res.json({ ok: true, message: 'All messages and jobs cleared permanently' });
});

// Helper: retrieve host machine IPv4 network interfaces (e.g. Wi-Fi IP 192.168.x.x)
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (!iface.address.startsWith('169.254')) {
          addresses.push({ interface: name, address: iface.address });
        }
      }
    }
  }
  return addresses;
}

// API: Get network IPs for Wi-Fi pairing
app.get('/api/sms/network-ips', (req, res) => {
  const ips = getNetworkIps();
  res.json({
    ok: true,
    port: PORT,
    ips,
    suggestedIp: ips.length > 0 ? ips[0].address : null
  });
});

// API: Generate QR Code for Phone pairing
app.get('/api/sms/qr', async (req, res) => {
  try {
    const requestedHost = req.query.customHost || req.query.host;
    const requestedIp = req.query.ip;
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto');

    let host = requestedHost || forwardedHost || req.get('host') || `localhost:${PORT}`;
    if (requestedIp) {
      host = requestedIp.includes(':') ? requestedIp : `${requestedIp}:${PORT}`;
    }

    const protocol = forwardedProto || (req.protocol === 'https' ? 'https' : 'http');
    const pairingUrl = `${protocol}://${host}/mobile-sms-bridge.html?token=${state.pairingToken}`;

    const qrSvg = await QRCode.toString(pairingUrl, {
      type: 'svg',
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    const qrDataUrl = await QRCode.toDataURL(pairingUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.json({
      ok: true,
      pairingUrl,
      pairingToken: state.pairingToken,
      networkIps: getNetworkIps(),
      port: PORT,
      qrSvg,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// API: Regenerate pairing token
app.post('/api/sms/reset-token', async (req, res) => {
  state.pairingToken = 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  state.pairedDevice = null;
  saveState();

  const requestedHost = req.query.customHost || req.query.host;
  const requestedIp = req.query.ip;
  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto');

  let host = requestedHost || forwardedHost || req.get('host') || `localhost:${PORT}`;
  if (requestedIp) {
    host = requestedIp.includes(':') ? requestedIp : `${requestedIp}:${PORT}`;
  }

  const protocol = forwardedProto || (req.protocol === 'https' ? 'https' : 'http');
  const pairingUrl = `${protocol}://${host}/mobile-sms-bridge.html?token=${state.pairingToken}`;

  let qrSvg = '';
  let qrDataUrl = '';
  try {
    qrSvg = await QRCode.toString(pairingUrl, { type: 'svg', width: 260, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
    qrDataUrl = await QRCode.toDataURL(pairingUrl, { width: 260, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
  } catch (e) {}

  res.json({
    ok: true,
    pairingToken: state.pairingToken,
    pairingUrl,
    networkIps: getNetworkIps(),
    port: PORT,
    qrSvg,
    qrDataUrl
  });
});

// API: Mobile Phone pairs or heartbeats
app.post('/api/sms/pair', (req, res) => {
  const { token, deviceName, phoneModel, simCarrier, batteryLevel } = req.body;

  if (!token || token !== state.pairingToken) {
    console.warn(`Pair attempt with token ${token} vs active ${state.pairingToken}`);
    return res.status(403).json({
      ok: false,
      error: 'Pairing code did not match. Check the code shown in the extension and try again.'
    });
  }

  state.pairedDevice = {
    id: 'device_' + (phoneModel || 'mobile').toLowerCase().replace(/[^a-z0-9]/g, '_'),
    name: deviceName || 'Android Phone',
    model: phoneModel || 'Android Device',
    carrier: simCarrier || 'Teletalk Bangladesh',
    battery: batteryLevel !== undefined ? batteryLevel : 90,
    pairedAt: state.pairedDevice?.pairedAt || new Date().toISOString(),
    lastSeen: Date.now()
  };

  saveState();
  res.json({ ok: true, device: state.pairedDevice });
});

// API: Heartbeat ping from paired phone
app.post('/api/sms/heartbeat', (req, res) => {
  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
    if (req.body.batteryLevel !== undefined) {
      state.pairedDevice.battery = req.body.batteryLevel;
    }
  }
  res.json({ ok: true, pendingCount: state.pendingJobs.filter(j => j.status === 'PENDING').length });
});

// API: Unpair phone
app.post('/api/sms/unpair', (req, res) => {
  state.pairedDevice = null;
  state.pairingToken = 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  saveState();
  res.json({ ok: true });
});

// API: Queue an outgoing SMS from extension to be sent by phone
app.post('/api/sms/send', (req, res) => {
  const { recipient, body, type, orgCode, userId, pin, applicationId } = req.body;

  if (!recipient || !body) {
    return res.status(400).json({ ok: false, error: 'Recipient and message body are required' });
  }

  const newJob = {
    id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    recipient: recipient.trim(),
    body: body.trim(),
    type: type || 'CUSTOM',
    orgCode: orgCode || '',
    userId: userId || '',
    pin: pin || '',
    applicationId: applicationId || '',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    sentAt: null
  };

  state.pendingJobs.push(newJob);

  // Add to message history
  state.messages.push({
    id: 'msg_' + Date.now(),
    direction: 'outgoing',
    status: 'QUEUED_FOR_PHONE',
    jobId: newJob.id,
    sender: 'Desktop Extension',
    recipient: newJob.recipient,
    body: newJob.body,
    timestamp: newJob.createdAt
  });

  saveState();
  res.json({ ok: true, job: newJob });
});

// API: Phone fetches pending jobs
app.get('/api/sms/pending', (req, res) => {
  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }
  const pending = state.pendingJobs.filter(j => j.status === 'PENDING');
  res.json({ ok: true, jobs: pending });
});

// API: Phone confirms job was sent via its SIM card
app.post('/api/sms/report-sent', (req, res) => {
  const { jobId, simUsed, status, error } = req.body;
  const job = state.pendingJobs.find(j => j.id === jobId);

  if (job) {
    job.status = status === 'FAILED' ? 'FAILED' : 'SENT';
    job.sentAt = new Date().toISOString();
    job.simUsed = simUsed || 'Teletalk SIM';
    if (error) job.error = error;

    // Update message status
    const msg = state.messages.find(m => m.jobId === jobId);
    if (msg) {
      msg.status = job.status === 'SENT' ? 'SENT_FROM_PHONE' : 'FAILED_FROM_PHONE';
      msg.sentAt = job.sentAt;
      msg.simUsed = job.simUsed;
      if (error) msg.error = error;
    }
  }

  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }

  saveState();
  res.json({ ok: true, job });
});

// API: Phone syncs full inbox (past and existing SMS messages)
app.post('/api/sms/sync-inbox', (req, res) => {
  const { messages: incomingList } = req.body;
  if (!Array.isArray(incomingList)) {
    return res.status(400).json({ ok: false, error: 'Expected messages array' });
  }

  let addedCount = 0;
  for (const item of incomingList) {
    if (!item.body) continue;
    const bodyTrimmed = item.body.trim();
    const sender = item.sender || 'Unknown';
    const timestamp = item.timestamp || new Date().toISOString();

    // Deduplicate: check if message already exists with identical sender & body
    const exists = state.messages.some(m => 
      m.body === bodyTrimmed && 
      (m.sender === sender || m.sender.replace(/[^0-9]/g, '') === sender.replace(/[^0-9]/g, ''))
    );

    if (!exists) {
      const parsed = parseTeletalkSms(bodyTrimmed);
      state.messages.push({
        id: 'inbox_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        direction: 'incoming',
        sender,
        recipient: 'My Teletalk Phone',
        body: bodyTrimmed,
        parsed,
        timestamp,
        isInboxSync: true
      });
      addedCount++;
    }
  }

  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }

  saveState();
  res.json({ ok: true, syncedCount: addedCount, totalMessages: state.messages.length });
});

// API: Phone syncs incoming SMS (from 16222 or any sender)
app.post('/api/sms/incoming', (req, res) => {
  const { sender, body, timestamp } = req.body;

  if (!body) {
    return res.status(400).json({ ok: false, error: 'SMS body is required' });
  }

  const parsed = parseTeletalkSms(body);

  if (parsed.simBalance) {
    state.simBalance = {
      amount: parsed.simBalance,
      currency: 'BDT',
      lastChecked: new Date().toISOString(),
      source: 'SMS (' + (sender || '16222') + ')'
    };
  }

  const newMsg = {
    id: 'inc_' + Date.now(),
    direction: 'incoming',
    sender: sender || '16222',
    recipient: 'My Teletalk Phone',
    body: body.trim(),
    parsed,
    timestamp: timestamp || new Date().toISOString()
  };

  state.messages.push(newMsg);

  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }

  saveState();
  res.json({ ok: true, message: newMsg, parsed });
});

// API: Simulate SMS reply (For testing or demoing when real SMS cannot be sent immediately)
app.post('/api/sms/simulate-reply', (req, res) => {
  const { type, orgCode, userId, applicantName, pin } = req.body;
  const org = orgCode || 'BPSC';
  const uid = userId || '7A8B9C';
  const name = applicantName || 'MD ABDUR RAHIM';
  const genPin = pin || Math.floor(10000000 + Math.random() * 90000000).toString();

  let body = '';
  if (type === 'PIN_NOTIFICATION' || type === '1st_reply') {
    body = `Applicant's Name: ${name}, Tk. 220 will be charged as application fee. Your PIN is ${genPin}. To pay fee type: ${org} YES ${genPin} and send to 16222`;
  } else {
    const password = Math.random().toString(36).substring(2, 8).toUpperCase();
    body = `Congratulations! Fee payment completed successfully for ${org}. User ID is ${uid} and Password is ${password}. Please preserve this for future reference.`;
  }

  const parsed = parseTeletalkSms(body);
  const newMsg = {
    id: 'sim_' + Date.now(),
    direction: 'incoming',
    sender: '16222',
    recipient: 'My Teletalk Phone',
    body,
    parsed,
    timestamp: new Date().toISOString(),
    isSimulated: true
  };

  state.messages.push(newMsg);
  saveState();

  res.json({ ok: true, message: newMsg, parsed });
});

// Serve static files from root
app.use(express.static(__dirname));

// Direct requests for '/' to 'index.html'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BD Job Autofill Server running on http://0.0.0.0:${PORT}`);
});
