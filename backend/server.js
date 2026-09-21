import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initializeDatabase } from './database/initDb.js';
import { checkAndInitializeDefaults } from './services/startupCheck.js';
import { deviceGuard } from './middlewares/deviceGuard.js';

import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import classRoutes from './routes/classRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import gradeRoutes from './routes/gradeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import posRoutes from './routes/posRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import parentRoutes from './routes/parentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Device hardware workstation guard
app.use(deviceGuard);

// Uploads directory: Uploads/Students and Uploads/Teachers
const uploadsDir = path.join(__dirname, 'Uploads');
const studentsUploadsDir = path.join(uploadsDir, 'Students');
const teachersUploadsDir = path.join(uploadsDir, 'Teachers');
if (!fs.existsSync(studentsUploadsDir)) fs.mkdirSync(studentsUploadsDir, { recursive: true });
if (!fs.existsSync(teachersUploadsDir)) fs.mkdirSync(teachersUploadsDir, { recursive: true });

app.use('/Uploads', express.static(uploadsDir));
app.use('/uploads', express.static(uploadsDir));

// API Routers
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/parent', parentRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await checkAndInitializeDefaults();
    res.json({
      status: 'online',
      app: 'Al-Nour Academic & School ERP',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Static frontend serving (for production & Electron packaging)
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    } else {
      res.status(404).json({ success: false, message: 'API Route Not Found' });
    }
  });
}

// 404 handler for API routes and unhandled methods
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

let server = null;

async function startServer() {
  try {
    console.log('[SERVER] Bootstrapping Al-Nour ERP Backend...');
    // Auto-verify and init DB
    await initializeDatabase();
    await checkAndInitializeDefaults();

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`================================================================`);
      console.log(`  نظام النور الأكاديمي والإداري المتكامل للمدارس`);
      console.log(`  Al-Nour Academic & School ERP Backend`);
      console.log(`  Local Access:   http://localhost:${PORT}`);
      console.log(`  Network Access: http://0.0.0.0:${PORT}`);
      console.log(`================================================================`);
    });
  } catch (err) {
    console.error('[SERVER FATAL] Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
function handleShutdown() {
  console.log('[SERVER] Gracefully shutting down...');
  if (server) {
    server.close(() => {
      console.log('[SERVER] Closed all active connections.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

startServer();

export default app;
