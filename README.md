# 🔍 GitHub Discovery Platform

> Plateforme intelligente de découverte de projets GitHub open-source

**CEO & Fondateur** : Abdoul Anzize DAOUDA  
**Studio** : Nexus Studio  
**Contact** : nexusstudio100@gmail.com  
**GitHub** : [@Tryboy869](https://github.com/Tryboy869)

---

## 🎯 Vision

GitHub Discovery résout le problème majeur de l'écosystème open-source : **la découvrabilité**.

Millions de projets existent sur GitHub, mais seuls les plus populaires sont visibles. Cette plateforme utilise l'**intelligence artificielle** pour analyser, catégoriser et recommander les meilleurs projets selon **l'utilité réelle**, pas seulement les stars.

---

## ✨ Fonctionnalités

### 🔍 Mode Exploration Manuelle
- Filtrage par langage (JavaScript, Python, Java, TypeScript, Go)
- Recherche par catégorie (Auth, API, Database, UI, etc.)
- Classement par score d'utilité (non biaisé par les stars)
- Analyse approfondie de chaque projet

### 🤖 Mode Assistant IA
- Décrivez votre besoin en langage naturel
- L'IA recommande les meilleurs outils
- Stack technique complète générée automatiquement
- Justifications intelligentes pour chaque recommandation

### 💎 Scoring Intelligent
- **Utility Score** : Score d'utilité réel basé sur :
  - Qualité de la documentation
  - Maturité du projet
  - Features disponibles
  - Production-readiness
- Pas de biais par stars ou auteur populaire

---

## 🏗️ Architecture

### Frontend (Multi-Pages)
```
index.html          → Landing page
login.html          → Connexion
signup.html         → Inscription
explore.html        → Exploration manuelle
assistant.html      → Assistant IA
project.html        → Détail projet
profile.html        → Profil utilisateur
assets/
  ├── styles.css    → Styles globaux
  └── auth.js       → Gestion auth
```

### Backend (Node.js)
```
api.js              → API Gateway (point d'entrée)
server.js           → Logique backend
scanner.js          → Scanner GitHub
```

### Bases de Données (Turso)
- **DB Users** : Utilisateurs (email, username, password)
- **DB Projects** : Projets GitHub analysés

---

## 🚀 Installation & Déploiement

### 1. Cloner le repo
```bash
git clone https://github.com/Tryboy869/github-discovery.git
cd github-discovery
```

### 2. Installer dépendances
```bash
npm install
```

### 3. Configurer variables d'environnement
Créer un fichier `.env` :
```bash
# Base de données utilisateurs (Turso DB 1)
TURSO_DB_URL_USERS=libsql://your-users-db.turso.io
TURSO_DB_TOKEN_USERS=your_token_here

# Base de données projets GitHub (Turso DB 2)
TURSO_DB_URL_PROJECTS=libsql://your-projects-db.turso.io
TURSO_DB_TOKEN_PROJECTS=your_token_here

# GitHub API
GITHUB_TOKEN=ghp_your_github_personal_access_token

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 4. Créer les bases Turso
```bash
# Créer DB users
turso db create github-discovery-users

# Créer DB projects
turso db create github-discovery-projects

# Obtenir les URLs et tokens
turso db show github-discovery-users
turso db show github-discovery-projects
```

### 5. Lancer en local
```bash
npm start
```

Ouvrir [http://localhost:3000](http://localhost:3000)

### 6. Scanner les projets GitHub
```bash
npm run scan
```

---

## 📊 Déploiement Production (Render)

### Configuration Render

**Build Command** :
```
npm install
```

**Start Command** :
```
node api.js
```

**Environment Variables** :
Ajouter toutes les variables du `.env` dans Render

**Health Check Path** :
```
/api/health
```

---

## 🔧 Technologies Utilisées

### Frontend
- HTML5 (Multi-pages)
- CSS3 (Design moderne)
- JavaScript Vanilla (Pas de framework)

### Backend
- Node.js 18+
- Express.js
- Turso DB (SQLite distribué)

### Authentification
- bcryptjs (Hash password)
- jsonwebtoken (JWT tokens)

### GitHub Integration
- GitHub REST API v3
- Personal Access Token

---

## 📈 Roadmap

### Phase 1 : MVP (Actuel)
- ✅ Authentification utilisateurs
- ✅ Scan top 5 langages (JS, Python, Java, TS, Go)
- ✅ Exploration manuelle avec filtres
- ✅ Assistant IA basique
- ✅ Détail projets avec analyse

### Phase 2 : Intelligence IA (Q1 2025)
- 🔄 Analyse IA approfondie (GPT-4)
- 🔄 Recommandations contextuelles avancées
- 🔄 Graphe de relations entre projets
- 🔄 Collections dynamiques IA

### Phase 3 : Communauté (Q2 2025)
- 📅 Favoris & bookmarks
- 📅 Historique recherches
- 📅 Notifications nouveaux projets
- 📅 Système de reviews

### Phase 4 : Écosystème (Q3 2025)
- 📅 API publique
- 📅 Extension navigateur
- 📅 CLI tool
- 📅 Intégration IDE (VS Code)

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📝 License

MIT License - Voir [LICENSE](LICENSE) pour plus de détails

---

## 👤 Contact

**Abdoul Anzize DAOUDA**  
CEO & Founder - Nexus Studio

- 📧 Email personnel : anzizdaouda0@gmail.com
- 📧 Email studio : nexusstudio100@gmail.com
- 💼 GitHub : [@Tryboy869](https://github.com/Tryboy869)

---

## 🙏 Remerciements

- GitHub pour l'API publique
- Turso pour la base de données
- La communauté open-source

---

**Fait avec ❤️ par Nexus Studio**