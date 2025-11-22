// server.js - Backend Service avec Turso DB

import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export class BackendService {
  constructor() {
    // Connexion DB Utilisateurs (Turso 1)
    this.dbUsers = createClient({
      url: process.env.TURSO_DB_URL_USERS,
      authToken: process.env.TURSO_DB_TOKEN_USERS
    });
    
    // Connexion DB Projets (Turso 2)
    this.dbProjects = createClient({
      url: process.env.TURSO_DB_URL_PROJECTS,
      authToken: process.env.TURSO_DB_TOKEN_PROJECTS
    });
    
    this.jwtSecret = process.env.JWT_SECRET;
  }

  async init() {
    console.log('🔧 [BACKEND] Initializing databases...');
    
    // Créer table utilisateurs
    await this.dbUsers.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Créer table projets GitHub
    await this.dbProjects.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        github_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL,
        description TEXT,
        language TEXT,
        stars INTEGER DEFAULT 0,
        topics TEXT,
        readme_content TEXT,
        ai_analysis TEXT,
        utility_score REAL DEFAULT 0,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Index pour recherche rapide
    await this.dbProjects.execute(`
      CREATE INDEX IF NOT EXISTS idx_language ON projects(language)
    `);
    
    await this.dbProjects.execute(`
      CREATE INDEX IF NOT EXISTS idx_category ON projects(category)
    `);
    
    await this.dbProjects.execute(`
      CREATE INDEX IF NOT EXISTS idx_utility ON projects(utility_score)
    `);
    
    console.log('✅ [BACKEND] Databases ready');
  }

  // ========== AUTHENTIFICATION ==========
  
  async signup(email, username, password) {
    console.log('[BACKEND] signup:', email, username);
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const result = await this.dbUsers.execute({
        sql: 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        args: [email, username, hashedPassword]
      });
      
      const userId = result.lastInsertRowid;
      
      const token = jwt.sign(
        { userId, email, username },
        this.jwtSecret,
        { expiresIn: '30d' }
      );
      
      return {
        success: true,
        user: { id: userId, email, username },
        token
      };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return {
          success: false,
          message: 'Email ou nom d\'utilisateur déjà utilisé'
        };
      }
      throw error;
    }
  }

  async login(email, password) {
    console.log('[BACKEND] login:', email);
    
    const result = await this.dbUsers.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Email ou mot de passe incorrect' };
    }
    
    const user = result.rows[0];
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return { success: false, message: 'Email ou mot de passe incorrect' };
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      this.jwtSecret,
      { expiresIn: '30d' }
    );
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      token
    };
  }

  async getProfile(token) {
    console.log('[BACKEND] getProfile');
    
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      const result = await this.dbUsers.execute({
        sql: 'SELECT id, email, username, created_at FROM users WHERE id = ?',
        args: [decoded.userId]
      });
      
      if (result.rows.length === 0) {
        return { success: false, message: 'Utilisateur non trouvé' };
      }
      
      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      return { success: false, message: 'Token invalide' };
    }
  }

  // ========== PROJETS GITHUB ==========
  
  async getProjects(filters = {}) {
    console.log('[BACKEND] getProjects:', filters);
    
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const args = [];
    
    if (filters.language) {
      sql += ' AND language = ?';
      args.push(filters.language);
    }
    
    if (filters.category) {
      sql += ' AND category = ?';
      args.push(filters.category);
    }
    
    if (filters.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      args.push(searchTerm, searchTerm);
    }
    
    sql += ' ORDER BY utility_score DESC';
    
    const limit = filters.limit || 50;
    sql += ' LIMIT ?';
    args.push(limit);
    
    const result = await this.dbProjects.execute({ sql, args });
    
    return {
      success: true,
      projects: result.rows.map(row => ({
        ...row,
        topics: row.topics ? JSON.parse(row.topics) : [],
        ai_analysis: row.ai_analysis ? JSON.parse(row.ai_analysis) : null
      }))
    };
  }

  async getProject(id) {
    console.log('[BACKEND] getProject:', id);
    
    const result = await this.dbProjects.execute({
      sql: 'SELECT * FROM projects WHERE id = ?',
      args: [id]
    });
    
    if (result.rows.length === 0) {
      return { success: false, message: 'Projet non trouvé' };
    }
    
    const project = result.rows[0];
    
    return {
      success: true,
      project: {
        ...project,
        topics: project.topics ? JSON.parse(project.topics) : [],
        ai_analysis: project.ai_analysis ? JSON.parse(project.ai_analysis) : null
      }
    };
  }

  async getStats() {
    console.log('[BACKEND] getStats');
    
    const totalResult = await this.dbProjects.execute(
      'SELECT COUNT(*) as total FROM projects'
    );
    
    const langResult = await this.dbProjects.execute(`
      SELECT language, COUNT(*) as count 
      FROM projects 
      WHERE language IS NOT NULL 
      GROUP BY language 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    const catResult = await this.dbProjects.execute(`
      SELECT category, COUNT(*) as count 
      FROM projects 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    return {
      success: true,
      stats: {
        total_projects: totalResult.rows[0].total,
        by_language: langResult.rows,
        by_category: catResult.rows
      }
    };
  }

  // ========== IA ASSISTANT ==========
  
  async getRecommendations(userInput, userContext = {}) {
    console.log('[BACKEND] getRecommendations:', userInput);
    
    const keywords = userInput.toLowerCase();
    
    let filters = {};
    
    if (keywords.includes('javascript') || keywords.includes('js')) {
      filters.language = 'JavaScript';
    } else if (keywords.includes('python')) {
      filters.language = 'Python';
    } else if (keywords.includes('java') && !keywords.includes('javascript')) {
      filters.language = 'Java';
    } else if (keywords.includes('typescript') || keywords.includes('ts')) {
      filters.language = 'TypeScript';
    } else if (keywords.includes('go') || keywords.includes('golang')) {
      filters.language = 'Go';
    }
    
    if (keywords.includes('auth') || keywords.includes('authentification')) {
      filters.category = 'authentication';
    } else if (keywords.includes('api') || keywords.includes('rest')) {
      filters.category = 'api';
    } else if (keywords.includes('database') || keywords.includes('db')) {
      filters.category = 'database';
    } else if (keywords.includes('ui') || keywords.includes('interface')) {
      filters.category = 'ui';
    }
    
    const projects = await this.getProjects({ ...filters, limit: 10 });
    
    return {
      success: true,
      intent: {
        detected_language: filters.language,
        detected_category: filters.category,
        original_query: userInput
      },
      recommendations: projects.projects
    };
  }

  // ========== SCANNER ==========
  
  async saveProject(projectData) {
    console.log('[BACKEND] saveProject:', projectData.full_name);
    
    try {
      await this.dbProjects.execute({
        sql: `
          INSERT INTO projects (
            github_id, name, full_name, description, language, 
            stars, topics, readme_content, ai_analysis, 
            utility_score, category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(github_id) DO UPDATE SET
            stars = excluded.stars,
            readme_content = excluded.readme_content,
            ai_analysis = excluded.ai_analysis,
            utility_score = excluded.utility_score,
            scanned_at = CURRENT_TIMESTAMP
        `,
        args: [
          projectData.github_id,
          projectData.name,
          projectData.full_name,
          projectData.description,
          projectData.language,
          projectData.stars,
          JSON.stringify(projectData.topics || []),
          projectData.readme_content,
          JSON.stringify(projectData.ai_analysis || {}),
          projectData.utility_score || 0,
          projectData.category
        ]
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving project:', error);
      return { success: false, error: error.message };
    }
  }
}