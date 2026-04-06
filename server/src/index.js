require('dotenv').config();
require('express-async-errors');

const express = require('express');
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

const app = express();
const server = http.createServer(app);

// Allowed origins — local dev + production Vercel URL
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,           // e.g. https://aura-audit.vercel.app
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
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
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'aura-audit-server v2' }));
app.use('/api/auth', authRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/university', universityRoutes);
app.use('/api/notifications', notificationRoutes);

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

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`🚀 Aura-Audit server running on port ${PORT}`));
});
