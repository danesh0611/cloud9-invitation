import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { INITIAL_120_PARTICIPANTS } from './src/data/sample120Participants';
import type { Participant, ScanAttemptLog, SystemStats } from './src/types';

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';
import pg from 'pg';
import dns from 'dns';
const { Pool } = pg;

// Resolves the hostname in the DATABASE_URL to an IPv4 IP address at startup.
// This prevents ENETUNREACH errors (Render lacks IPv6 routing) and ENOTFOUND DNS lookup failures.
async function getIpv4ConnectionString(urlStr: string): Promise<string> {
  try {
    const parsedUrl = new URL(urlStr);
    const hostname = parsedUrl.hostname;
    
    // Skip resolution if it's already an IP address or localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^[0-9.]+$/.test(hostname)) {
      return urlStr;
    }

    const ips = await new Promise<string[]>((resolve, reject) => {
      dns.resolve4(hostname, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });

    if (ips && ips.length > 0) {
      parsedUrl.hostname = ips[0];
      console.log(`[DB] Successfully resolved hostname ${hostname} to IPv4: ${ips[0]}`);
      return parsedUrl.toString();
    }
  } catch (err: any) {
    console.error('[DB] Failed to resolve hostname to IPv4, using original URL:', err.message);
  }
  return urlStr;
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database state stored in memory with file persistence.
// Supports Render Persistent Disk mounted at /data, falling back to local process directory.
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  participants: Record<string, Participant>; // keyed by unique_id
  logs: ScanAttemptLog[];
}

const CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateSecureUniqueId(existingIds: Set<string>): string {
  let uniqueId = '';
  let attempts = 0;
  do {
    const bytes = crypto.randomBytes(6);
    let code = 'C9-';
    for (let i = 0; i < 6; i++) {
      code += CHARSET[bytes[i] % CHARSET.length];
    }
    uniqueId = code;
    attempts++;
  } while (existingIds.has(uniqueId) && attempts < 100);
  return uniqueId;
}

let db: DatabaseSchema = {
  participants: {},
  logs: []
};

// PostgreSQL cloud database connection pool (initialized asynchronously in bootstrapDb)
let pool: any = null;

// Initialize database schema in cloud if not exists
async function initDb() {
  if (pool) {
    try {
      console.log('[DB] Connecting to Supabase Cloud Database...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chipset_db (
          key VARCHAR(50) PRIMARY KEY,
          value JSONB NOT NULL
        )
      `);
      console.log('[DB] Supabase Cloud Database initialized successfully.');
    } catch (err) {
      console.error('[DB] Failed to initialize Supabase table:', err);
    }
  }
}

// Load or seed database
async function loadDatabase() {
  if (pool) {
    try {
      const partsRes = await pool.query('SELECT value FROM chipset_db WHERE key = $1', ['participants']);
      const logsRes = await pool.query('SELECT value FROM chipset_db WHERE key = $1', ['logs']);

      if (partsRes.rows.length > 0) {
        db.participants = partsRes.rows[0].value;
        console.log(`[DB] Loaded ${Object.keys(db.participants).length} participants from Supabase Cloud Database.`);
        
        if (logsRes.rows.length > 0) {
          db.logs = logsRes.rows[0].value;
        }
        return;
      } else {
        console.log('[DB] Cloud database is empty. Seeding initial 120 participants...');
        await seedInitial120();
        return;
      }
    } catch (err) {
      console.error('[DB] Error loading from Supabase, falling back to local file storage:', err);
    }
  }

  // Local filesystem fallback
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(data);
      console.log(`[DB] Loaded ${Object.keys(db.participants).length} participants from local storage.`);
    } else {
      await seedInitial120();
    }
  } catch (err) {
    console.error('[DB] Error loading database, initializing fresh seed:', err);
    await seedInitial120();
  }
}

async function saveDatabase() {
  if (pool) {
    try {
      await Promise.all([
        pool.query(
          'INSERT INTO chipset_db (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
          ['participants', JSON.stringify(db.participants)]
        ),
        pool.query(
          'INSERT INTO chipset_db (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
          ['logs', JSON.stringify(db.logs)]
        )
      ]);
      console.log('[DB] Saved database state to Supabase Cloud Database.');
    } catch (err) {
      console.error('[DB] Failed to save database to Supabase:', err);
    }
  }

  // Always keep a local file backup for safety
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Failed to save database locally:', err);
  }
}

async function seedInitial120() {
  db.participants = {};
  db.logs = [];
  const existingIds = new Set<string>();

  INITIAL_120_PARTICIPANTS.forEach((p) => {
    const id = generateSecureUniqueId(existingIds);
    existingIds.add(id);
    db.participants[id] = {
      unique_id: id,
      name: p.name.trim(),
      email: p.email.trim(),
      team_name: p.team_name?.trim() || undefined,
      selection_status: p.selection_status,
      checked_in: false,
      check_in_time: null,
      created_at: new Date().toISOString(),
      verification_count: 0,
      last_verified_at: null
    };
  });

  await saveDatabase();
  console.log(`[DB] Seeded initial database with ${Object.keys(db.participants).length} participants.`);
}

// Bootstrap database connection
async function bootstrapDb() {
  if (process.env.DATABASE_URL) {
    try {
      const ipv4ConnectionString = await getIpv4ConnectionString(process.env.DATABASE_URL);
      pool = new Pool({
        connectionString: ipv4ConnectionString,
        ssl: { rejectUnauthorized: false } // Required for secure cloud db hosts like Supabase/Neon
      });
    } catch (err: any) {
      console.error('[DB] Failed to initialize connection pool:', err.message);
    }
  }

  await initDb();
  await loadDatabase();
}
bootstrapDb();

// --- REST API ROUTES ---

// 1. Get stats
app.get('/api/stats', (req, res) => {
  const participantsList = Object.values(db.participants);
  const total_imported = participantsList.length;
  const selectedList = participantsList.filter(p => p.selection_status === 'SELECTED');
  const total_selected = selectedList.length;
  const total_checked_in = selectedList.filter(p => p.checked_in).length;
  const total_not_checked_in = total_selected - total_checked_in;
  const invalid_attempts = db.logs.filter(l => l.status === 'INVALID_ID' || l.status === 'NOT_SELECTED').length;
  const checked_in_rate = total_selected > 0 ? Math.round((total_checked_in / total_selected) * 100) : 0;

  const stats: SystemStats = {
    total_imported,
    total_selected,
    total_checked_in,
    total_not_checked_in,
    invalid_attempts,
    checked_in_rate
  };

  res.json(stats);
});

// 2. Get participants list (searchable, filterable)
app.get('/api/participants', (req, res) => {
  const { search, status, checked_in } = req.query;
  let list = Object.values(db.participants);

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.unique_id.toLowerCase().includes(q) ||
      (p.team_name && p.team_name.toLowerCase().includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter(p => p.selection_status === status);
  }

  if (checked_in !== undefined && checked_in !== 'ALL') {
    const isCheckedIn = checked_in === 'true';
    list = list.filter(p => p.checked_in === isCheckedIn);
  }

  res.json(list);
});

// 3. Verify single participant by unique_id (Public verification)
// Anti-Fake security requirement: Database is source of truth, never exposes full list
app.get('/api/verify/:unique_id', (req, res) => {
  const unique_id = req.params.unique_id.trim().toUpperCase();
  const participant = db.participants[unique_id];

  const now = new Date().toISOString();

  if (!participant) {
    const log: ScanAttemptLog = {
      id: crypto.randomUUID(),
      timestamp: now,
      scanned_id: unique_id,
      status: 'INVALID_ID',
      notes: `Scanned ID ${unique_id} not found in database.`
    };
    db.logs.unshift(log);
    if (db.logs.length > 500) db.logs.pop();
    saveDatabase();

    return res.status(404).json({
      valid: false,
      status: 'INVALID',
      message: 'This invitation could not be verified. ID does not exist.'
    });
  }

  if (participant.selection_status !== 'SELECTED') {
    const log: ScanAttemptLog = {
      id: crypto.randomUUID(),
      timestamp: now,
      scanned_id: unique_id,
      status: 'NOT_SELECTED',
      participant_name: participant.name,
      notes: `Participant ${participant.name} is ${participant.selection_status}, not SELECTED.`
    };
    db.logs.unshift(log);
    if (db.logs.length > 500) db.logs.pop();
    saveDatabase();

    return res.status(403).json({
      valid: false,
      status: 'NOT_SELECTED',
      message: `Participant selection status is ${participant.selection_status}.`,
      participant: {
        unique_id: participant.unique_id,
        name: participant.name,
        email: participant.email,
        team_name: participant.team_name,
        selection_status: participant.selection_status,
        checked_in: participant.checked_in,
        check_in_time: participant.check_in_time,
        verification_count: participant.verification_count,
        last_verified_at: participant.last_verified_at
      }
    });
  }

  // Update verification metrics
  participant.verification_count = (participant.verification_count || 0) + 1;
  participant.last_verified_at = now;

  const logStatus = participant.checked_in ? 'ALREADY_CHECKED_IN' : 'VALID_NOT_CHECKED_IN';
  const log: ScanAttemptLog = {
    id: crypto.randomUUID(),
    timestamp: now,
    scanned_id: unique_id,
    status: logStatus,
    participant_name: participant.name,
    notes: participant.checked_in
      ? `Duplicate scan. Already checked in at ${participant.check_in_time}`
      : `Verified valid invitation for ${participant.name}`
  };
  db.logs.unshift(log);
  if (db.logs.length > 500) db.logs.pop();
  saveDatabase();

  return res.json({
    valid: true,
    status: participant.checked_in ? 'ALREADY_CHECKED_IN' : 'VALID',
    message: participant.checked_in ? 'Already checked in' : 'Valid selection invitation',
    participant: {
      unique_id: participant.unique_id,
      name: participant.name,
      email: participant.email,
      team_name: participant.team_name,
      selection_status: participant.selection_status,
      checked_in: participant.checked_in,
      check_in_time: participant.check_in_time,
      verification_count: participant.verification_count,
      last_verified_at: participant.last_verified_at
    }
  });
});

// 4. Check-in endpoint (Staff action)
app.post('/api/checkin/:unique_id', async (req, res) => {
  const unique_id = req.params.unique_id.trim().toUpperCase();
  const participant = db.participants[unique_id];

  if (!participant) {
    return res.status(404).json({
      success: false,
      message: 'Participant ID not found'
    });
  }

  if (participant.selection_status !== 'SELECTED') {
    return res.status(400).json({
      success: false,
      message: `Cannot check in: Participant status is ${participant.selection_status}`
    });
  }

  const now = new Date().toISOString();

  if (participant.checked_in) {
    return res.status(409).json({
      success: false,
      already_checked_in: true,
      message: `Already checked in at ${participant.check_in_time}`,
      participant,
      timestamp: participant.check_in_time
    });
  }

  // Mark as checked in
  participant.checked_in = true;
  participant.check_in_time = now;

  const log: ScanAttemptLog = {
    id: crypto.randomUUID(),
    timestamp: now,
    scanned_id: unique_id,
    status: 'ALREADY_CHECKED_IN',
    participant_name: participant.name,
    notes: `Staff checked in ${participant.name} (${unique_id}) successfully.`
  };
  db.logs.unshift(log);
  if (db.logs.length > 500) db.logs.pop();

  await saveDatabase();

  return res.json({
    success: true,
    message: `Successfully checked in ${participant.name}`,
    participant,
    timestamp: now
  });
});

// 5. Undo / Reset Check-in
app.post('/api/checkin/undo/:unique_id', async (req, res) => {
  const unique_id = req.params.unique_id.trim().toUpperCase();
  const participant = db.participants[unique_id];

  if (!participant) {
    return res.status(404).json({ success: false, message: 'Participant not found' });
  }

  participant.checked_in = false;
  participant.check_in_time = null;
  await saveDatabase();

  return res.json({
    success: true,
    message: `Check-in status reset for ${participant.name}`,
    participant
  });
});
// 5.5. RSVP Endpoint (Participant confirmation)
app.post('/api/rsvp/:unique_id', async (req, res) => {
  const unique_id = req.params.unique_id.trim().toUpperCase();
  const { status } = req.body;
  const participant = db.participants[unique_id];

  if (!participant) {
    return res.status(404).json({ success: false, message: 'Invitation not found' });
  }

  if (participant.selection_status !== 'SELECTED') {
    return res.status(400).json({ success: false, message: 'Only selected candidates can RSVP.' });
  }

  if (status !== 'CONFIRMED' && status !== 'DECLINED') {
    return res.status(400).json({ success: false, message: 'Invalid RSVP status. Must be CONFIRMED or DECLINED.' });
  }

  participant.rsvp_status = status;
  await saveDatabase();

  res.json({
    success: true,
    message: `RSVP status updated to ${status} for ${participant.name}.`,
    participant: {
      unique_id: participant.unique_id,
      name: participant.name,
      rsvp_status: participant.rsvp_status
    }
  });
});

// 5.6. Swap Candidates Endpoint (Admin action)
app.post('/api/participants/swap', async (req, res) => {
  const { original_id, new_id } = req.body;
  const original = db.participants[String(original_id).trim().toUpperCase()];
  const replacement = db.participants[String(new_id).trim().toUpperCase()];

  if (!original || !replacement) {
    return res.status(404).json({ success: false, message: 'One or both participants not found.' });
  }

  if (original.selection_status !== 'SELECTED') {
    return res.status(400).json({ success: false, message: 'The candidate to swap out must be currently SELECTED.' });
  }

  if (replacement.selection_status === 'SELECTED') {
    return res.status(400).json({ success: false, message: 'The replacement candidate must not be currently SELECTED.' });
  }

  // Perform Swap
  original.selection_status = 'NOT_SELECTED' as any;
  original.rsvp_status = undefined;

  replacement.selection_status = 'SELECTED' as any;
  replacement.rsvp_status = 'PENDING';

  await saveDatabase();

  res.json({
    success: true,
    message: `Successfully swapped selected seat from ${original.name} to ${replacement.name}.`,
    original: { unique_id: original.unique_id, name: original.name, selection_status: original.selection_status },
    replacement: { unique_id: replacement.unique_id, name: replacement.name, selection_status: replacement.selection_status }
  });
});

// 6. Bulk Ingest participants (CSV / Excel import)
app.post('/api/participants/bulk', async (req, res) => {
  const { participants: newEntries, overwrite } = req.body;

  if (!Array.isArray(newEntries) || newEntries.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or empty participant list' });
  }

  if (overwrite) {
    db.participants = {};
  }

  const existingIds = new Set(Object.keys(db.participants));
  const existingEmails = new Map(Object.values(db.participants).map(p => [p.email.toLowerCase(), p]));

  let added = 0;
  let updated = 0;

  newEntries.forEach((entry: any) => {
    if (!entry.name || !entry.email) return;
    const cleanEmail = entry.email.trim().toLowerCase();
    const cleanName = entry.name.trim();
    const cleanStatus = (entry.selection_status || entry.status || 'SELECTED').toUpperCase();
    const cleanTeam = entry.team_name || entry.team || undefined;
    const cleanCollege = entry.college ? String(entry.college).trim() : undefined;
    const cleanYear = entry.year_of_study ? String(entry.year_of_study).trim() : undefined;
    const cleanPhone = entry.phone ? String(entry.phone).trim() : undefined;
    const cleanCollegeEmail = entry.college_email ? String(entry.college_email).trim().toLowerCase() : undefined;
    const cleanPersonalEmail = entry.personal_email ? String(entry.personal_email).trim().toLowerCase() : undefined;

    if (existingEmails.has(cleanEmail) && !overwrite) {
      const existing = existingEmails.get(cleanEmail)!;
      existing.name = cleanName;
      existing.team_name = cleanTeam;
      existing.selection_status = cleanStatus as any;
      existing.college = cleanCollege;
      existing.year_of_study = cleanYear;
      existing.phone = cleanPhone;
      existing.college_email = cleanCollegeEmail;
      existing.personal_email = cleanPersonalEmail;
      updated++;
    } else {
      const id = generateSecureUniqueId(existingIds);
      existingIds.add(id);
      const newP: Participant = {
        unique_id: id,
        name: cleanName,
        email: cleanEmail,
        team_name: cleanTeam,
        selection_status: cleanStatus as any,
        checked_in: false,
        check_in_time: null,
        created_at: new Date().toISOString(),
        verification_count: 0,
        last_verified_at: null,
        college: cleanCollege,
        year_of_study: cleanYear,
        phone: cleanPhone,
        rsvp_status: cleanStatus === 'SELECTED' ? 'PENDING' : undefined,
        college_email: cleanCollegeEmail,
        personal_email: cleanPersonalEmail
      };
      db.participants[id] = newP;
      existingEmails.set(cleanEmail, newP);
      added++;
    }
  });

  await saveDatabase();

  res.json({
    success: true,
    message: `Processed ${newEntries.length} items: ${added} added, ${updated} updated.`,
    total: Object.keys(db.participants).length
  });
});

// 7. Reset to 120 Seed Participants
app.post('/api/reset-120', async (req, res) => {
  await seedInitial120();
  res.json({
    success: true,
    message: 'Reset and seeded 120 personalized Cloud9 participants successfully.',
    total: Object.keys(db.participants).length
  });
});

// 8. Clear database
app.post('/api/clear', async (req, res) => {
  db.participants = {};
  db.logs = [];
  await saveDatabase();
  res.json({ success: true, message: 'Database cleared' });
});

// 9. Scan attempt audit logs
app.get('/api/logs', (req, res) => {
  res.json(db.logs.slice(0, 100));
});

// 10. Clear logs
app.post('/api/logs/clear', async (req, res) => {
  db.logs = [];
  await saveDatabase();
  res.json({ success: true, message: 'Logs cleared' });
});

// 10.4. Send Single Test Email
app.post('/api/email/test', async (req, res) => {
  try {
    const { 
      smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort = Number(process.env.SMTP_PORT) || 465,
      smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || '',
      smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '',
      smtpFrom = process.env.SMTP_FROM || `Cloud9 Organizing Team <${smtpUser}>`,
      testEmail,
      originUrl
    } = req.body;

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ success: false, message: 'Please provide SMTP / Gmail user and password / app password.' });
    }

    if (!testEmail) {
      return res.status(400).json({ success: false, message: 'Please provide a test recipient email address.' });
    }

    const isGmail = smtpHost.includes('gmail') || smtpUser.includes('@gmail.com');
    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser.trim(),
              pass: smtpPass.trim()
            }
          }
        : {
            host: smtpHost.trim(),
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser.trim(),
              pass: smtpPass.trim()
            }
          }
    );

    const baseUrl = originUrl || (req.headers.origin ? String(req.headers.origin) : 'https://chipset.community');
    const sampleParticipant = Object.values(db.participants).find(p => p.selection_status === 'SELECTED') || {
      unique_id: 'C9-SAMPLE',
      name: 'Sample Candidate'
    };

    const verifyUrl = `${baseUrl}/verify?id=${sampleParticipant.unique_id}`;
    const whatsappLink = 'https://chat.whatsapp.com/DcV5YL43n8JDO8OFeAxixt?s=cl&p=a&ilr=4';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08080C; color: #ffffff; margin: 0; padding: 20px; }
          .card { max-width: 600px; margin: 0 auto; background: #0e0d14; border: 2px solid #f59e0b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
          .header { background: #1a56db; padding: 18px 24px; text-align: center; font-weight: 900; letter-spacing: 2px; color: #ffffff; font-size: 16px; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          h2 { color: #f59e0b; margin-top: 0; font-size: 22px; }
          p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
          .info-box { background: #16151f; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .label { color: #94a3b8; font-weight: bold; }
          .value { color: #f8fafc; font-weight: bold; }
          .btn-primary { display: inline-block; background: #f59e0b; color: #020617 !important; padding: 12px 24px; font-weight: 900; text-decoration: none; border-radius: 12px; margin: 8px 4px 8px 0; font-size: 14px; text-transform: uppercase; }
          .btn-whatsapp { display: inline-block; background: #25D366; color: #020617 !important; padding: 12px 24px; font-weight: 900; text-decoration: none; border-radius: 12px; margin: 8px 4px 8px 0; font-size: 14px; text-transform: uppercase; }
          .footer { padding: 16px 24px; background: #050508; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">✈️ CLOUD9 • TEST EMAIL BROADCAST</div>
          <div class="content">
            <h2>Congratulations, ${sampleParticipant.name}!</h2>
            <p>You have been officially selected to attend the exclusive <strong>Cloud9</strong> event organized by the Chipset technical community.</p>
            
            <div class="info-box">
              <div class="info-row"><span class="label">PASSENGER:</span> <span class="value">${sampleParticipant.name}</span></div>
              <div class="info-row"><span class="label">PASS ID:</span> <span class="value" style="color:#f59e0b;">${sampleParticipant.unique_id}</span></div>
              <div class="info-row"><span class="label">EVENT DATE:</span> <span class="value">29 August 2026</span></div>
              <div class="info-row"><span class="label">DESTINATION:</span> <span class="value">Gallery Hall 1</span></div>
              <div class="info-row"><span class="label">BOARDING TIME:</span> <span class="value">9:00 AM Onwards</span></div>
              <div class="info-row"><span class="label">VENUE GATE:</span> <span class="value">Block 5, 1st Floor Near Central Library</span></div>
            </div>

            <p><strong>Action Required:</strong> Please open your invitation pass to RSVP, confirm your attendance, and download your pass to show at entry.</p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${verifyUrl}" class="btn-primary">🎟️ View Pass & RSVP Seat</a>
            </div>

            <p style="font-size: 12px; color: #94a3b8;">
              ⚠️ <em>Important:</em> Show your digital or printed pass QR code at the entry desk on event day.
            </p>
          </div>
          <div class="footer">
            Cloud9 Organizing Team • Chipset Technical Community<br/>
            Direct Verification: ${verifyUrl}
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: smtpFrom,
      to: testEmail.trim(),
      subject: `[TEST] 🎉 You are Selected for Cloud9 Event!`,
      html: htmlContent
    });

    return res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}!`
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send test email.' });
  }
});

// 10.5. Bulk Email Dispatcher
app.post('/api/email/bulk-send', async (req, res) => {
  try {
    const { 
      smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort = Number(process.env.SMTP_PORT) || 465,
      smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || '',
      smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '',
      smtpFrom = process.env.SMTP_FROM || `Cloud9 Organizing Team <${smtpUser || 'cloud9@chipset.community'}>`,
      participantIds,
      subject = '🎉 You are Selected for Cloud9 Event! [Action Required: RSVP to Confirm Seat]',
      originUrl
    } = req.body;

    const allSelected = Object.values(db.participants).filter(p => p.selection_status === 'SELECTED');
    const targets = Array.isArray(participantIds) && participantIds.length > 0
      ? participantIds.map((id: string) => db.participants[id]).filter(Boolean)
      : allSelected;

    if (targets.length === 0) {
      return res.status(400).json({ success: false, message: 'No selected participants to email.' });
    }

    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide your email address and 16-character App Password to start automated sending.' 
      });
    }

    const baseUrl = originUrl || (req.headers.origin ? String(req.headers.origin) : 'https://chipset.community');

    const isGmail = smtpHost.includes('gmail') || smtpUser.includes('@gmail.com');
    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser.trim(),
              pass: smtpPass.trim()
            }
          }
        : {
            host: smtpHost.trim(),
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser.trim(),
              pass: smtpPass.trim()
            }
          }
    );

    // Verify SMTP connection before starting loop
    await transporter.verify();

    const results: Array<{ id: string; name: string; email: string; success: boolean; error?: string }> = [];

    for (const participant of targets) {
      const verifyUrl = `${baseUrl}/verify?id=${participant.unique_id}`;
      const toEmails = [
        participant.college_email,
        participant.personal_email,
        participant.email
      ].filter(Boolean)
       .filter((val, idx, self) => self.indexOf(val) === idx);

      const toField = toEmails.join(', ');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08080C; color: #ffffff; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #0e0d14; border: 2px solid #f59e0b; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
            .header { background: #1a56db; padding: 18px 24px; text-align: center; font-weight: 900; letter-spacing: 2px; color: #ffffff; font-size: 16px; text-transform: uppercase; }
            .content { padding: 28px 24px; }
            h2 { color: #f59e0b; margin-top: 0; font-size: 22px; }
            p { color: #cbd5e1; font-size: 14px; line-height: 1.6; }
            .info-box { background: #16151f; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
            .label { color: #94a3b8; font-weight: bold; }
            .value { color: #f8fafc; font-weight: bold; }
            .btn-primary { display: inline-block; background: #f59e0b; color: #020617 !important; padding: 12px 24px; font-weight: 900; text-decoration: none; border-radius: 12px; margin: 8px 4px 8px 0; font-size: 14px; text-transform: uppercase; }
            .btn-whatsapp { display: inline-block; background: #25D366; color: #020617 !important; padding: 12px 24px; font-weight: 900; text-decoration: none; border-radius: 12px; margin: 8px 4px 8px 0; font-size: 14px; text-transform: uppercase; }
            .footer { padding: 16px 24px; background: #050508; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">✈️ CLOUD9 • OFFICIAL ADMISSION PASS</div>
            <div class="content">
              <h2>Congratulations, ${participant.name}!</h2>
              <p>You have been officially selected to attend the exclusive <strong>Cloud9</strong> event organized by the Chipset technical community.</p>
              
              <div class="info-box">
                <div class="info-row"><span class="label">PASSENGER:</span> <span class="value">${participant.name}</span></div>
                <div class="info-row"><span class="label">PASS ID:</span> <span class="value" style="color:#f59e0b;">${participant.unique_id}</span></div>
                <div class="info-row"><span class="label">EVENT DATE:</span> <span class="value">29 August 2026</span></div>
                <div class="info-row"><span class="label">DESTINATION:</span> <span class="value">Gallery Hall 1</span></div>
                <div class="info-row"><span class="label">BOARDING TIME:</span> <span class="value">9:00 AM Onwards</span></div>
                <div class="info-row"><span class="label">VENUE GATE:</span> <span class="value">Block 5, 1st Floor Near Central Library</span></div>
              </div>

              <p><strong>Action Required:</strong> Please open your invitation pass to RSVP, confirm your attendance, and download your pass to show at entry.</p>

              <div style="text-align: center; margin: 24px 0;">
                <a href="${verifyUrl}" class="btn-primary">🎟️ View Pass & RSVP Seat</a>
              </div>

              <p style="font-size: 12px; color: #94a3b8;">
                ⚠️ <em>Important:</em> Show your digital or printed pass QR code at the entry desk on event day.
              </p>
            </div>
            <div class="footer">
              Cloud9 Organizing Team • Chipset Technical Community<br/>
              Direct Verification: ${verifyUrl}
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: toField,
          subject: subject,
          html: htmlContent
        });
        results.push({ id: participant.unique_id, name: participant.name, email: toField, success: true });
      } catch (err: any) {
        results.push({ id: participant.unique_id, name: participant.name, email: toField, success: false, error: err.message });
      }

      // Small throttling delay to avoid rate-limiting
      await new Promise(r => setTimeout(r, 200));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return res.json({
      success: true,
      message: `Successfully dispatched personalized emails to ${successCount} candidates (${failCount} failed).`,
      total: results.length,
      successCount,
      failCount,
      results
    });
  } catch (error: any) {
    console.error('Bulk email dispatch error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Bulk email dispatch failed.' });
  }
});

// 11. Download Entire Project Source Code (.ZIP) for local run & GitHub push
app.get('/api/export-project-zip', async (req, res) => {
  try {
    const zip = new JSZip();
    const rootDir = process.cwd();

    const ignoredDirs = new Set(['node_modules', 'dist', '.git', '.cache']);
    const ignoredFiles = new Set(['.DS_Store', 'db.json']);

    function addDirectoryToZip(currentDir: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (!ignoredDirs.has(entry.name)) {
            const subFolder = zipFolder.folder(entry.name);
            if (subFolder) {
              addDirectoryToZip(fullPath, subFolder);
            }
          }
        } else if (entry.isFile()) {
          if (!ignoredFiles.has(entry.name)) {
            const fileData = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, fileData);
          }
        }
      }
    }

    addDirectoryToZip(rootDir, zip);

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="chipset-invitation-system.zip"');
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Failed to generate project zip:', err);
    res.status(500).json({ success: false, message: 'Failed to create project ZIP: ' + err.message });
  }
});

// --- VITE & STATIC SERVING SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cloud9 Invitation & QR Verification Server running on http://localhost:${PORT}`);
  });
}

startServer();
