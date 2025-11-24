// api.js - NEXUS AXION 4.1 avec Auto-Scanning

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { BackendService } from './server.js';
import { AutoScanner } from './auto-scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ========== SECURITY LOGGER ==========
class SecurityLogger {
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`, JSON.stringify(data, null, 2));
  }
  
  info(message, data) { this.log('INFO', message, data); }
  warn(message, data) { this.log('WARN', message, data); }
  error(message, data) { this.log('ERROR', message, data); }
  security(message, data) { this.log('SECURITY', message, data); }
}

const logger = new SecurityLogger();

// ========== MIDDLEWARE ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

app.use((req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  
  logger.info('REQUEST_RECEIVED', {
    method: req.method,
    path: req.path,
    ip,
    userAgent: req.headers['user-agent']
  });
  
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    logger.info('RESPONSE_SENT', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
    originalSend.call(this, data);
  };
  
  next();
});

// ========== BACKEND & SCANNER ==========
let backend;
let scanner;

async function initBackend() {
  logger.info('BACKEND_INIT_START', { message: 'Initializing backend...' });
  
  try {
    backend = new BackendService();
    await backend.init();
    logger.info('BACKEND_INIT_SUCCESS', { message: 'Backend ready' });
  } catch (error) {
    logger.error('BACKEND_INIT_FAILED', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function initScanner() {
  logger.info('SCANNER_INIT_START', { message: 'Initializing auto-scanner...' });
  
  try {
    scanner = new AutoScanner(backend);
    
    // 🔥 SCAN INITIAL AU DÉMARRAGE
    logger.info('SCANNER_FIRST_SCAN', { message: 'Starting initial scan...' });
    scanner.startInitialScan(); // Asynchrone, non-bloquant
    
    // 🔥 SCAN AUTOMATIQUE TOUTES LES 12H
    scanner.schedulePeriodicScan(12); // 12 heures
    
    logger.info('SCANNER_INIT_SUCCESS', { 
      message: 'Auto-scanner ready',
      schedule: 'Every 12 hours',
      reposPerScan: 3000
    });
  } catch (error) {
    logger.error('SCANNER_INIT_FAILED', {
      error: error.message,
      stack: error.stack
    });
  }
}

// ========== FRONTEND ==========
app.get('/', (req, res) => {
  logger.info('SERVING_PAGE', { page: 'index.html' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  logger.info('HEALTH_CHECK', { status: 'ok' });
  res.json({ 
    success: true, 
    message: 'API is running',
    scanner: {
      running: scanner?.isScanning || false,
      lastScan: scanner?.lastScanTime || null,
      totalProjects: scanner?.totalScanned || 0
    }
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, username, password } = req.body;
  logger.info('SIGNUP_ATTEMPT', { email, username });
  
  try {
    if (!email || !username || !password) {
      logger.warn('SIGNUP_MISSING_FIELDS', { email, username, hasPassword: !!password });
      return res.status(400).json({
        success: false,
        message: 'Email, username et password requis'
      });
    }
    
    const result = await backend.signup(email, username, password);
    
    if (result.success) {
      logger.info('SIGNUP_SUCCESS', { email, username });
    } else {
      logger.warn('SIGNUP_FAILED', { email, username, reason: result.message });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('SIGNUP_ERROR', {
      email,
      username,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  logger.info('LOGIN_ATTEMPT', { email });
  
  try {
    if (!email || !password) {
      logger.warn('LOGIN_MISSING_FIELDS', { email, hasPassword: !!password });
      return res.status(400).json({
        success: false,
        message: 'Email et password requis'
      });
    }
    
    const result = await backend.login(email, password);
    
    if (result.success) {
      logger.info('LOGIN_SUCCESS', { email });
    } else {
      logger.warn('LOGIN_FAILED', { email, reason: result.message });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('LOGIN_ERROR', {
      email,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  logger.info('PROFILE_REQUEST', { hasToken: !!token });
  
  try {
    if (!token) {
      logger.warn('PROFILE_NO_TOKEN', {});
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }
    
    const result = await backend.getProfile(token);
    
    if (result.success) {
      logger.info('PROFILE_SUCCESS', { userId: result.user.id });
    } else {
      logger.warn('PROFILE_FAILED', { reason: result.message });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('PROFILE_ERROR', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  const filters = {
    language: req.query.language,
    category: req.query.category,
    search: req.query.search,
    limit: parseInt(req.query.limit) || 50
  };
  
  logger.info('PROJECTS_REQUEST', filters);
  
  try {
    const result = await backend.getProjects(filters);
    logger.info('PROJECTS_SUCCESS', { count: result.projects?.length || 0 });
    res.json(result);
  } catch (error) {
    logger.error('PROJECTS_ERROR', {
      filters,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  const projectId = req.params.id;
  logger.info('PROJECT_DETAIL_REQUEST', { projectId });
  
  try {
    const result = await backend.getProject(projectId);
    
    if (result.success) {
      logger.info('PROJECT_DETAIL_SUCCESS', { projectId });
    } else {
      logger.warn('PROJECT_DETAIL_NOT_FOUND', { projectId });
    }
    
    res.json(result);
  } catch (error) {
    logger.error('PROJECT_DETAIL_ERROR', {
      projectId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  logger.info('STATS_REQUEST', {});
  
  try {
    const result = await backend.getStats();
    logger.info('STATS_SUCCESS', {
      totalProjects: result.stats?.total_projects || 0
    });
    res.json(result);
  } catch (error) {
    logger.error('STATS_ERROR', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/assistant/recommend', async (req, res) => {
  const { query, context } = req.body;
  logger.info('RECOMMEND_REQUEST', { query });
  
  try {
    if (!query) {
      logger.warn('RECOMMEND_NO_QUERY', {});
      return res.status(400).json({
        success: false,
        message: 'Query requis'
      });
    }
    
    const result = await backend.getRecommendations(query, context);
    logger.info('RECOMMEND_SUCCESS', {
      query,
      resultsCount: result.recommendations?.length || 0
    });
    res.json(result);
  } catch (error) {
    logger.error('RECOMMEND_ERROR', {
      query,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SCANNER STATUS ENDPOINT ==========
app.get('/api/scanner/status', (req, res) => {
  if (!scanner) {
    return res.json({
      success: true,
      scanner: {
        initialized: false
      }
    });
  }
  
  res.json({
    success: true,
    scanner: {
      initialized: true,
      isScanning: scanner.isScanning,
      lastScanTime: scanner.lastScanTime,
      totalScanned: scanner.totalScanned,
      nextScanIn: scanner.getNextScanTime()
    }
  });
});

// ========== ERROR HANDLERS ==========
app.use((err, req, res, next) => {
  logger.error('UNHANDLED_ERROR', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => {
  logger.warn('404_NOT_FOUND', {
    method: req.method,
    path: req.path
  });
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ========== START SERVER ==========
async function startServer() {
  try {
    logger.info('SERVER_START', { message: 'Starting server...' });
    
    await initBackend();
    await initScanner(); // 🔥 Scanner automatique
    
    app.listen(PORT, '0.0.0.0', () => {
      logger.info('SERVER_READY', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
      
      console.log(`
╔═══════════════════════════════════════════════════════╗
║   🌌 GitHub Discovery Platform                        ║
║   👤 CEO: Abdoul Anzize DAOUDA                        ║
║   🏢 Nexus Studio                                     ║
║   🌐 Server: http://0.0.0.0:${PORT}                           ║
║   📧 Contact: nexusstudio100@gmail.com                ║
║   🛡️  Security: Active                                ║
║   📊 Logging: Enhanced                                ║
║   🤖 Auto-Scanner: Every 12 hours                     ║
║   📦 Repos/Scan: 3000 (600/language × 5)              ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('SERVER_START_FAILED', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGTERM', () => {
  logger.info('SHUTDOWN', { signal: 'SIGTERM' });
  if (scanner) scanner.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SHUTDOWN', { signal: 'SIGINT' });
  if (scanner) scanner.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT_EXCEPTION', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED_REJECTION', {
    reason: String(reason),
    promise: String(promise)
  });
});

// ========== LAUNCH ==========
startServer();