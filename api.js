// api.js - Point d'entrée unique NEXUS AXION 3.5
// GitRadar - GitHub Intelligence Layer
// CEO: Abdoul Anzize DAOUDA - Nexus Studio

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitRadarScanner } from './scanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIGURATION ==========
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { success: false, message: 'Too many requests' }
});
app.use('/api/', limiter);

// ========== INITIALISER BACKEND ==========
let scanner;

async function initBackend() {
  console.log('🔧 [API GATEWAY] Initializing GitRadar Scanner...');
  scanner = new GitRadarScanner();
  await scanner.init();
  console.log('✅ [API GATEWAY] Scanner ready');
}

// ========== ROUTE MAP ==========
const routeMap = {
  // Auth
  'POST:/api/auth/register': (req) => scanner.registerUser(req.body),
  'POST:/api/auth/login': (req) => scanner.loginUser(req.body),
  
  // Repos Discovery
  'GET:/api/repos': (req) => scanner.searchRepos(req.query),
  'GET:/api/repos/:id': (req) => scanner.getRepoDetails(req.params.id),
  'GET:/api/repos/language/:lang': (req) => scanner.getReposByLanguage(req.params.lang),
  
  // IA Recommendations
  'POST:/api/recommend': (req) => scanner.getRecommendations(req.body, req.headers),
  'POST:/api/stack-builder': (req) => scanner.buildStack(req.body),
  
  // Collections
  'GET:/api/collections': (req) => scanner.getCollections(req.query),
  'GET:/api/trending': (req) => scanner.getTrending(req.query),
  
  // User Profile
  'GET:/api/profile': (req) => scanner.getUserProfile(req.headers),
  'PUT:/api/profile': (req) => scanner.updateProfile(req.body, req.headers),
  
  // Admin/Stats
  'GET:/api/stats': (req) => scanner.getStats(),
  'GET:/api/health': (req) => scanner.healthCheck()
};

// ========== ROUTER CENTRAL ==========
function routeRequest(method, path, req) {
  const routeKey = `${method}:${path}`;
  console.log(`📡 [API GATEWAY] ${routeKey}`);
  
  const handler = routeMap[routeKey];
  if (!handler) {
    throw new Error(`Route not mapped: ${routeKey}`);
  }
  
  return handler(req);
}

// ========== FRONTEND ==========
app.get('/', (req, res) => {
  console.log('🌐 [API GATEWAY] Serving frontend');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API ENDPOINTS ==========

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await routeRequest('POST', '/api/auth/register', req);
    res.json(result);
  } catch (error) {
    console.error('❌ [AUTH] Registration error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await routeRequest('POST', '/api/auth/login', req);
    res.json(result);
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

// Repos Discovery
app.get('/api/repos', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/repos', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/repos/:id', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/repos/:id', req);
    res.json(result);
  } catch (error) {
    res.status(404).json({ success: false, message: 'Repo not found' });
  }
});

app.get('/api/repos/language/:lang', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/repos/language/:lang', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// IA Recommendations
app.post('/api/recommend', async (req, res) => {
  try {
    const result = await routeRequest('POST', '/api/recommend', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/stack-builder', async (req, res) => {
  try {
    const result = await routeRequest('POST', '/api/stack-builder', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Collections
app.get('/api/collections', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/collections', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/trending', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/trending', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// User Profile
app.get('/api/profile', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/profile', req);
    res.json(result);
  } catch (error) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const result = await routeRequest('PUT', '/api/profile', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin/Stats
app.get('/api/stats', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/stats', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await routeRequest('GET', '/api/health', req);
    res.json(result);
  } catch (error) {
    res.status(503).json({ success: false, message: 'Service unavailable' });
  }
});

// ========== ERROR HANDLERS ==========
app.use((err, req, res, next) => {
  console.error('💥 [API GATEWAY] Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.use((req, res) => {
  console.warn(`⚠️ [API GATEWAY] 404: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ========== START SERVER ==========
async function startServer() {
  await initBackend();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   🌌 GITRADAR - GitHub Intelligence Layer             ║
║   🌐 Server:     http://0.0.0.0:${PORT}                       ║
║   📂 Frontend:   index.html                           ║
║   🤖 Scanner:    scanner.js                           ║
║   🔀 Gateway:     api.js (this file)                  ║
║   ✅ Routes:      ${Object.keys(routeMap).length} endpoints mapped                ║
║                                                       ║
║   👤 CEO:         Abdoul Anzize DAOUDA                ║
║   🏢 Company:     Nexus Studio                        ║
║   📧 Email:       anzizdaouda0@gmail.com              ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

startServer();