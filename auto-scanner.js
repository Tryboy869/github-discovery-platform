// auto-scanner.js - Scanner Automatique Toutes les 12h

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SCAN_LANGUAGES = ['JavaScript', 'Python', 'Java', 'TypeScript', 'Go'];
const REPOS_PER_LANGUAGE = 600; // 600 × 5 = 3000 repos par scan

export class AutoScanner {
  constructor(backend) {
    this.backend = backend;
    this.headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    
    this.isScanning = false;
    this.lastScanTime = null;
    this.totalScanned = 0;
    this.scanInterval = null;
    this.nextScanTime = null;
  }

  // ========== SCAN INITIAL AU DÉMARRAGE ==========
  async startInitialScan() {
    console.log('\n🚀 [AUTO-SCANNER] Starting initial scan...');
    console.log('📊 This will scan 3000 repos (600 per language × 5)');
    console.log('⏱️  Estimated duration: 30-45 minutes');
    console.log('🔄 This runs in background, server is ready immediately\n');
    
    // Lancer scan en arrière-plan (non-bloquant)
    this.runScan().catch(error => {
      console.error('❌ [AUTO-SCANNER] Initial scan failed:', error);
    });
  }

  // ========== SCHEDULE SCAN PÉRIODIQUE ==========
  schedulePeriodicScan(hours = 12) {
    const intervalMs = hours * 60 * 60 * 1000;
    
    console.log(`\n⏰ [AUTO-SCANNER] Scheduled to run every ${hours} hours`);
    this.nextScanTime = new Date(Date.now() + intervalMs);
    console.log(`📅 [AUTO-SCANNER] Next scan at: ${this.nextScanTime.toISOString()}\n`);
    
    this.scanInterval = setInterval(async () => {
      console.log('\n🔄 [AUTO-SCANNER] Starting scheduled scan...');
      await this.runScan();
      this.nextScanTime = new Date(Date.now() + intervalMs);
      console.log(`📅 [AUTO-SCANNER] Next scan at: ${this.nextScanTime.toISOString()}\n`);
    }, intervalMs);
  }

  // ========== SCAN PRINCIPAL ==========
  async runScan() {
    if (this.isScanning) {
      console.log('⚠️  [AUTO-SCANNER] Scan already in progress, skipping');
      return;
    }
    
    this.isScanning = true;
    const scanStartTime = Date.now();
    
    try {
      for (const language of SCAN_LANGUAGES) {
        console.log(`\n📦 [AUTO-SCANNER] Scanning ${language} repositories...`);
        await this.scanLanguage(language, REPOS_PER_LANGUAGE);
        await this.sleep(5000); // Pause entre langages
      }
      
      const duration = ((Date.now() - scanStartTime) / 1000 / 60).toFixed(1);
      this.lastScanTime = new Date();
      
      console.log(`\n✅ [AUTO-SCANNER] Scan completed in ${duration} minutes`);
      console.log(`📊 [AUTO-SCANNER] Total repos scanned: ${this.totalScanned}`);
      
    } catch (error) {
      console.error('❌ [AUTO-SCANNER] Scan failed:', error);
    } finally {
      this.isScanning = false;
    }
  }

  // ========== SCAN PAR LANGAGE ==========
  async scanLanguage(language, maxRepos) {
    let scannedCount = 0;
    let page = 1;
    const perPage = 100; // Max GitHub API
    
    while (scannedCount < maxRepos) {
      try {
        const response = await fetch(
          `https://api.github.com/search/repositories?q=language:${language}+stars:>50&sort=stars&order=desc&per_page=${perPage}&page=${page}`,
          { headers: this.headers }
        );
        
        if (!response.ok) {
          console.error(`❌ GitHub API error: ${response.status}`);
          
          // Rate limit hit
          if (response.status === 403) {
            const resetTime = response.headers.get('x-ratelimit-reset');
            const waitTime = resetTime ? (parseInt(resetTime) * 1000 - Date.now()) : 60000;
            console.log(`⏳ Rate limit hit, waiting ${Math.ceil(waitTime / 1000)}s...`);
            await this.sleep(waitTime);
            continue;
          }
          
          break;
        }
        
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          console.log(`📭 No more ${language} repos to scan`);
          break;
        }
        
        for (const repo of data.items) {
          if (scannedCount >= maxRepos) break;
          
          await this.processRepo(repo);
          scannedCount++;
          this.totalScanned++;
          
          // Progress log tous les 50 repos
          if (scannedCount % 50 === 0) {
            console.log(`   📊 ${language}: ${scannedCount}/${maxRepos} repos scanned`);
          }
          
          await this.sleep(500); // Rate limiting
        }
        
        page++;
        
      } catch (error) {
        console.error(`❌ Error scanning ${language} page ${page}:`, error.message);
        break;
      }
    }
    
    console.log(`✅ ${language}: ${scannedCount} repos scanned`);
  }

  // ========== PROCESS REPO ==========
  async processRepo(repo) {
    try {
      // Fetch README
      const readme = await this.fetchReadme(repo.full_name);
      
      if (!readme) {
        // Skip repos sans README
        return;
      }
      
      // Analyser
      const analysis = this.analyzeRepo(repo, readme);
      
      // Sauvegarder
      const projectData = {
        github_id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        language: repo.language,
        stars: repo.stargazers_count,
        topics: repo.topics || [],
        readme_content: readme.substring(0, 10000), // Limiter
        ai_analysis: analysis,
        utility_score: this.calculateUtilityScore(repo, readme, analysis),
        category: analysis.category
      };
      
      await this.backend.saveProject(projectData);
      
    } catch (error) {
      console.error(`❌ Error processing ${repo.full_name}:`, error.message);
    }
  }

  // ========== FETCH README ==========
  async fetchReadme(fullName) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/readme`,
        { headers: this.headers }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      
      return content;
    } catch (error) {
      return null;
    }
  }

  // ========== ANALYSE IA ==========
  analyzeRepo(repo, readme) {
    const readmeLower = readme.toLowerCase();
    const description = (repo.description || '').toLowerCase();
    
    // Détection catégorie
    let category = 'general';
    
    if (readmeLower.includes('auth') || readmeLower.includes('authentication')) {
      category = 'authentication';
    } else if (readmeLower.includes('api') || readmeLower.includes('rest')) {
      category = 'api';
    } else if (readmeLower.includes('database') || readmeLower.includes('orm')) {
      category = 'database';
    } else if (readmeLower.includes('ui') || readmeLower.includes('component')) {
      category = 'ui';
    } else if (readmeLower.includes('framework')) {
      category = 'framework';
    } else if (readmeLower.includes('cli') || readmeLower.includes('command')) {
      category = 'cli';
    } else if (readmeLower.includes('testing') || readmeLower.includes('test')) {
      category = 'testing';
    }
    
    // Features
    const features = [];
    if (readmeLower.includes('typescript')) features.push('typescript');
    if (readmeLower.includes('async')) features.push('async');
    if (readmeLower.includes('security')) features.push('security');
    if (readmeLower.includes('performance')) features.push('performance');
    
    return {
      category,
      features,
      has_documentation: readme.length > 500,
      documentation_quality: this.assessDocQuality(readme),
      complexity: this.assessComplexity(readme),
      production_ready: readmeLower.includes('production') || repo.stargazers_count > 1000
    };
  }

  assessDocQuality(readme) {
    const length = readme.length;
    const hasInstall = readme.toLowerCase().includes('install');
    const hasUsage = readme.toLowerCase().includes('usage') || readme.toLowerCase().includes('example');
    
    if (length > 3000 && hasInstall && hasUsage) return 'excellent';
    if (length > 1500 && (hasInstall || hasUsage)) return 'good';
    if (length > 500) return 'basic';
    return 'poor';
  }

  assessComplexity(readme) {
    const length = readme.length;
    if (length > 5000) return 'high';
    if (length > 2000) return 'medium';
    return 'low';
  }

  calculateUtilityScore(repo, readme, analysis) {
    let score = 5.0;
    
    // Stars bonus
    if (repo.stargazers_count > 10000) score += 2;
    else if (repo.stargazers_count > 1000) score += 1;
    else if (repo.stargazers_count > 100) score += 0.5;
    
    // Documentation bonus
    if (analysis.documentation_quality === 'excellent') score += 1.5;
    else if (analysis.documentation_quality === 'good') score += 1;
    else if (analysis.documentation_quality === 'basic') score += 0.5;
    
    // Features bonus
    score += analysis.features.length * 0.2;
    
    // Production ready
    if (analysis.production_ready) score += 1;
    
    return Math.min(score, 10);
  }

  // ========== UTILS ==========
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      console.log('\n🛑 [AUTO-SCANNER] Stopped');
    }
  }

  getNextScanTime() {
    if (!this.nextScanTime) return null;
    const diff = this.nextScanTime - Date.now();
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / 1000 / 60);
    return `${hours}h ${minutes}m`;
  }
}