require('dotenv').config();
require('express-async-errors');

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const auditRoutes = require('./routes/audit');
const studentRoutes = require('./routes/student');
const jobRoutes = require('./routes/jobs');
const assessmentRoutes = require('./routes/assessment');
const careerRoutes = require('./routes/career');
const companyRoutes = require('./routes/company');
const universityRoutes = require('./routes/universityRoutes');
const notificationRoutes = require('./routes/notifications');
const alumniRoutes = require('./routes/alumni');
const universitiesRoutes = require('./routes/universities');
const { getEmailProviderStatus } = require('./services/emailService');

const app = express();
const server = http.createServer(app);
app.set('trust proxy', 1);

// Allowed origins — local dev + all Vercel preview/production URLs
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return cb(null, true);
    // Allow any vercel.app subdomain (covers all preview deployments)
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

// Socket.IO for real-time notifications
const io = new Server(server, { cors: corsOptions });
app.set('io', io);

// ── Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/audit', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ── Routes ─────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', service: 'Aura-Audit API', version: 'v2', docs: '/health' }));
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'aura-audit-server v2',
  email: getEmailProviderStatus(),
}));
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/university', universityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/universities', universitiesRoutes);

// POST /api/wake-ai — fire-and-forget nudge to the AI engine. Public (no
// auth) and deliberately non-blocking: the frontend calls this as early as
// possible in a user's session (root layout mount, login) so a sleeping AI
// engine starts its ~30-60s cold boot WHILE the user is still navigating
// the dashboard, rather than only starting when they actually submit an AI
// request. Always responds immediately regardless of the AI engine's state
// — this is a nudge, not a health check (use GET /api/status for that).
app.post('/api/wake-ai', (req, res) => {
  if (process.env.AI_ENGINE_URL) {
    const aiUrl = process.env.AI_ENGINE_URL.replace(/\/+$/, '');
    axios.get(`${aiUrl}/health`, { timeout: 20000 }).catch(() => {});
  }
  res.json({ ok: true });
});

// GET /api/status — public system status for the live indicator in the UI.
// Previously the only "is the AI engine up" signal was the silent wake nudge
// above, which the frontend never read the result of — a user had no way to
// know the AI engine was cold/down until an actual AI request came back as a
// placeholder/fallback result.
//
// Default (no ?wake) hits the AI engine's /health with a short timeout — a
// cheap "is the process up" check, fine for the automatic 45s background
// poll (using /ready here instead would fire a real LLM call every 45s for
// every visitor with the tab open, burning quota for no reason).
// ?wake=true hits /ready instead, with a long timeout, so an explicit
// "Start AI Engine" / "Re-check now" click gets the stronger guarantee it's
// actually asking for: /health only proves the process is reachable, not
// that a real AI request would succeed (e.g. it stays "ok" even if every
// LLM provider key is failing) — /ready makes one real generate call and
// reports whether that actually worked.
app.get('/api/status', async (req, res) => {
  const wake = req.query.wake === 'true';
  const started = Date.now();
  const result = { server: { status: 'online' }, checkedAt: new Date().toISOString() };

  if (!process.env.AI_ENGINE_URL) {
    result.aiEngine = { status: 'unconfigured' };
    return res.json(result);
  }

  const aiUrl = process.env.AI_ENGINE_URL.replace(/\/+$/, '');
  try {
    const r = await axios.get(`${aiUrl}${wake ? '/ready' : '/health'}`, { timeout: wake ? 90000 : 6000 });
    const isReady = wake ? r.data?.status === 'ready' : true;
    result.aiEngine = {
      status: isReady ? 'online' : 'offline',
      latencyMs: Date.now() - started,
      providers: r.data?.providers || null,
      ...(wake ? { llmCallOk: r.data?.llm_call_ok, llmCallError: r.data?.llm_call_error || null } : {}),
    };
  } catch (err) {
    result.aiEngine = {
      status: 'offline',
      latencyMs: Date.now() - started,
      message: err.code === 'ECONNABORTED' ? 'Timed out waiting for a response' : (err.message || 'Unreachable'),
    };
  }
  res.json(result);
});

// ── Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Socket ─────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join', (userId) => socket.join(`user:${userId}`));
  socket.on('join-audit', (auditId) => socket.join(`audit:${auditId}`));
});

global.emitToUser = (userId, event, data) => io.to(`user:${userId}`).emit(event, data);
global.emitAuditUpdate = (auditId, data) => io.to(`audit:${auditId}`).emit('audit-update', data);

// ── AI engine keep-alive ─────────────────────────────────
// Render's free tier spins down a service after ~15min of no inbound
// traffic. The AI engine only gets hit when a user actively uses an AI
// feature, so it goes cold far more often than this Node service (which
// gets hit by every page load/poll). A cold AI engine means the FIRST AI
// request after a gap eats a 30-60s container boot on top of the real
// work, which reads as "AI unavailable" even though it would have
// succeeded. Pinging it periodically — as long as THIS service is awake —
// keeps it warm for real requests without needing external cron infra.
if (process.env.AI_ENGINE_URL) {
  const AI_ENGINE_URL = process.env.AI_ENGINE_URL.replace(/\/+$/, '');
  setInterval(() => {
    axios.get(`${AI_ENGINE_URL}/health`, { timeout: 15000 }).catch(() => {});
  }, 10 * 60 * 1000); // every 10 min — comfortably inside Render's ~15min sleep window
}

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Aura-Audit server running on port ${PORT}`));
});
