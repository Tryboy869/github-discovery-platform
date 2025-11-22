// api.js - API GATEWAY PRINCIPAL

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { BackendService } from './server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.static(__dirname));

// ========== INITIALISER BACKEND ==========
let backend;

async function initBackend() {
  console.log('🔧 [API GATEWAY] Initializing backend...');
  backend = new BackendService();
  await backend.init();
  console.log('✅ [API GATEWAY] Backend ready');
}

// ========== FRONTEND PAGES ==========

app.get('/', (req, res) => {
  console.log('🌐 [API GATEWAY] Serving index.html');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ========== API ENDPOINTS ==========

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// Inscription
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, username et password requis'
      });
    }
    
    const result = await backend.signup(email, username, password);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Signup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et password requis'
      });
    }
    
    const result = await backend.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Profil utilisateur
app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token manquant'
      });
    }
    
    const result = await backend.getProfile(token);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Liste des projets
app.get('/api/projects', async (req, res) => {
  try {
    const filters = {
      language: req.query.language,
      category: req.query.category,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50
    };
    
    const result = await backend.getProjects(filters);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Projects error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Détail d'un projet
app.get('/api/projects/:id', async (req, res) => {
  try {
    const result = await backend.getProject(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Project detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Statistiques
app.get('/api/stats', async (req, res) => {
  try {
    const result = await backend.getStats();
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// IA Recommandations
app.post('/api/assistant/recommend', async (req, res) => {
  try {
    const { query, context } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query requis'
      });
    }
    
    const result = await backend.getRecommendations(query, context);
    res.json(result);
  } catch (error) {
    console.error('❌ [API] Recommendations error:', error);
    res.status(500).json({ success: false, message: error.message });
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
║   🌌 GitHub Discovery Platform                        ║
║   👤 CEO: Abdoul Anzize DAOUDA                        ║
║   🏢 Nexus Studio                                     ║
║   🌐 Server: http://0.0.0.0:${PORT.toString().padEnd(28)}║
║   📧 Contact: nexusstudio100@gmail.com                ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

startServer();