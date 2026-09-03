import express from 'express';
import path from 'path';
import fs from 'fs';
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
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading sms-bridge-data.json:', err);
  }
  return {
    pairedDevice: null,
    pairingToken: 'BT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    pendingJobs: [],
    messages: [
      {
        id: 'msg_welcome',
        direction: 'system',
        sender: 'BD Job SMS Assistant',
        recipient: 'System',
        body: 'Welcome to BD Job Autofill Phone SMS Gateway. Pair your Android phone with Teletalk SIM to send application fees automatically.',
        timestamp: new Date().toISOString()
      }
    ]
  };
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
 * Parses Teletalk 16222 SMS reply content for PIN, Fee, Name, and Password
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

  // Check if this is a 1st SMS reply containing PIN
  const pinMatch = text.match(/PIN\s*(?:is|:)?\s*([0-9]{6,10})/i);
  const feeMatch = text.match(/Tk\.?\s*([0-9]+(?:\.[0-9]+)?)/i);
  const nameMatch = text.match(/Applicant(?:'s)?\s*Name\s*:\s*([^,\n\.]+)/i);
  const payTypeMatch = text.match(/type\s*:\s*([A-Za-z0-9]+\s+YES\s+[0-9]+)/i);

  // Check if this is a 2nd SMS reply containing User ID and Password
  const userMatch = text.match(/User\s*ID\s*(?:is|:)?\s*([A-Za-z0-9]+)/i);
  const passMatch = text.match(/Password\s*(?:is|:)?\s*([A-Za-z0-9]+)/i);

  if (pinMatch) {
    result.isTeletalk = true;
    result.type = 'PIN_NOTIFICATION';
    result.pin = pinMatch[1];
    if (feeMatch) result.fee = feeMatch[1];
    if (nameMatch) result.applicantName = nameMatch[1].trim();
    if (payTypeMatch) {
      result.suggestedReply = payTypeMatch[1].trim();
    }
  } else if (passMatch) {
    result.isTeletalk = true;
    result.type = 'PAYMENT_CONFIRMATION';
    result.password = passMatch[1];
    if (userMatch) result.userId = userMatch[1];
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
    messages: state.messages
  });
});

// API: Generate QR Code for Phone pairing
app.get('/api/sms/qr', async (req, res) => {
  try {
    const forwardedHost = req.get('x-forwarded-host');
    const forwardedProto = req.get('x-forwarded-proto');
    const host = forwardedHost || req.get('host') || `localhost:${PORT}`;
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

  const forwardedHost = req.get('x-forwarded-host');
  const forwardedProto = req.get('x-forwarded-proto');
  const host = forwardedHost || req.get('host') || `localhost:${PORT}`;
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
    qrSvg,
    qrDataUrl
  });
});

// API: Mobile Phone pairs or heartbeats
app.post('/api/sms/pair', (req, res) => {
  const { token, deviceName, phoneModel, simCarrier, batteryLevel } = req.body;

  if (token !== state.pairingToken) {
    // If token matches or user requests pair
    console.warn(`Pair attempt with token ${token} vs active ${state.pairingToken}`);
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
  const { jobId, simUsed } = req.body;
  const job = state.pendingJobs.find(j => j.id === jobId);

  if (job) {
    job.status = 'SENT';
    job.sentAt = new Date().toISOString();
    job.simUsed = simUsed || 'Teletalk SIM';

    // Update message status
    const msg = state.messages.find(m => m.jobId === jobId);
    if (msg) {
      msg.status = 'SENT_FROM_PHONE';
    }
  }

  if (state.pairedDevice) {
    state.pairedDevice.lastSeen = Date.now();
  }

  saveState();
  res.json({ ok: true, job });
});

// API: Phone syncs incoming SMS (from 16222 or any sender)
app.post('/api/sms/incoming', (req, res) => {
  const { sender, body, timestamp } = req.body;

  if (!body) {
    return res.status(400).json({ ok: false, error: 'SMS body is required' });
  }

  const parsed = parseTeletalkSms(body);

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
  const name = applicantName || 'MD HABIBUR RAHMAN';
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

