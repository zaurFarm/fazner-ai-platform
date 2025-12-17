# 🚀 Руководство по загрузке Fazner AI Platform на GitHub

## 📋 Содержание
1. [Подготовка проекта](#подготовка-проекта)
2. [Создание репозитория на GitHub](#создание-репозитория-на-github)
3. [Загрузка кода](#загрузка-кода)
4. [Настройка автоматического развертывания](#настройка-автоматического-развертывания)
5. [Дополнительные настройки](#дополнительные-настройки)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Подготовка проекта

### 1. Проверка файлов
Убедитесь, что у вас есть все необходимые файлы проекта:

```
fazner-ai-platform/
├── frontend/                 # React приложение
├── backend/                  # Node.js API
├── docker-compose.yml        # Docker конфигурация
├── README.md                # Документация
├── .gitignore              # Игнорируемые файлы
└── package.json             # Root package.json
```

### 2. Создание .gitignore файла
Создайте файл `.gitignore` в корне проекта:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.next/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Docker
.dockerignore

# Database
*.sqlite
*.db

# Redis
dump.rdb

# Backup files
*.backup
*.bak

# Temporary files
tmp/
temp/

# API Keys and secrets (extra safety)
**/config/secrets.js
**/config/keys.js
```

### 3. Обновление package.json файлов
Обновите информацию о проекте в `package.json` файлах:

**Root package.json:**
```json
{
  "name": "fazner-ai-platform",
  "version": "1.0.0",
  "description": "Enterprise AI Platform powered by Fazner AI",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "build": "npm run build:backend && npm run build:frontend",
    "build:backend": "cd backend && npm run build",
    "build:frontend": "cd frontend && npm run build",
    "start": "npm run start:backend",
    "start:backend": "cd backend && npm start",
    "install:all": "npm install && cd frontend && npm install && cd ../backend && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### 4. Создание README.md
Создайте информативный README.md:

```markdown
# Fazner AI Platform

🚀 Enterprise AI Platform powered by Fazner AI

## Описание

Современная платформа искусственного интеллекта, предоставляющая:
- 🤖 Генерацию кода
- 🏗️ Архитектурное планирование  
- 📝 Создание документации
- 💬 Интеллектуальный чат

## Технологии

### Frontend
- React 18 + TypeScript
- Zustand для state management
- Tailwind CSS
- Vite для сборки

### Backend  
- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- Redis для кэширования
- Socket.io для real-time коммуникации

### AI Integration
- Fazner AI через OpenRouter API
- Защищенная архитектура API
- Rate limiting и circuit breaker

## Быстрый старт

### Требования
- Node.js 18+
- Docker + Docker Compose
- PostgreSQL
- Redis

### Установка

1. Клонирование репозитория:
```bash
git clone https://github.com/YOUR_USERNAME/fazner-ai-platform.git
cd fazner-ai-platform
```

2. Установка зависимостей:
```bash
npm run install:all
```

3. Настройка переменных окружения:
```bash
cp .env.example .env
# Отредактируйте .env файл
```

4. Запуск через Docker:
```bash
docker-compose up -d
```

5. Или запуск в development режиме:
```bash
npm run dev
```

## Переменные окружения

### Frontend (.env)
```env
VITE_OPENROUTER_API_URL=https://openrouter.ai/api/v1
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_MINIMAX_MODEL=mini-max/text-01
```

### Backend (.env)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/minimax_ai
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_jwt_secret
```

## Развертывание

### Vercel (Frontend)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/fazner-ai-platform)

### Railway (Backend)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

- `POST /api/ai/generate` - Генерация AI ответа
- `POST /api/chat/complete` - Чат с AI
- `POST /api/code/generate` - Генерация кода
- `POST /api/architecture/design` - Архитектурное планирование
- `GET /api/health` - Health check

## Безопасность

- ✅ Rate limiting
- ✅ Input validation
- ✅ CORS protection  
- ✅ Security headers
- ✅ API key protection
- ✅ Request sanitization

## Мониторинг

- Health checks: `/health`
- Metrics: `/metrics`
- Logs: Structured logging с Winston

## Лицензия

MIT License - см. файл LICENSE

## Поддержка

Создайте issue в GitHub для сообщений об ошибках и предложений.

## Автор

Fazner AI Team - ваш AI помощник для разработки
```

---

## 🐙 Создание репозитория на GitHub

### Вариант 1: Через веб-интерфейс GitHub

1. **Войдите в GitHub**
   - Перейдите на [github.com](https://github.com)
   - Войдите в свой аккаунт

2. **Создайте новый репозиторий**
   - Нажмите зеленую кнопку "New" или "+" → "New repository"
   - Заполните поля:
     ```
     Repository name: fazner-ai-platform
     Description: Enterprise AI Platform powered by Fazner AI
     Visibility: Public (или Private если хотите приватный)
     ✅ Add a README file
     ✅ Add .gitignore: Node
     ✅ Choose a license: MIT
     ```
   - Нажмите "Create repository"

### Вариант 2: Через GitHub CLI (рекомендуется)

1. **Установите GitHub CLI**
   ```bash
   # macOS
   brew install gh
   
   # Windows (с помощью winget)
   winget install --id GitHub.cli
   
   # Linux
   sudo apt install gh
   ```

2. **Авторизуйтесь**
   ```bash
   gh auth login
   ```

3. **Создайте репозиторий**
   ```bash
   gh repo create fazner-ai-platform \
     --public \
     --description "Enterprise AI Platform powered by Fazner AI" \
     --source=. \
     --push
   ```

---

## 📤 Загрузка кода

### Способ 1: Инициализация локального Git репозитория

1. **Инициализируйте Git репозиторий**
   ```bash
   cd fazner-ai-platform
   git init
   ```

2. **Добавьте все файлы**
   ```bash
   git add .
   ```

3. **Сделайте первый коммит**
   ```bash
   git commit -m "🚀 Initial commit: Fazner AI Platform

   Features:
   - React + TypeScript frontend
   - Node.js + Express backend
   - PostgreSQL + Redis integration
   - Fazner AI AI integration
   - Docker containerization
   - Security middleware
   - Performance monitoring"
   ```

4. **Добавьте remote репозиторий**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/fazner-ai-platform.git
   ```

5. **Отправьте код на GitHub**
   ```bash
   git branch -M main
   git push -u origin main
   ```

### Способ 2: Клонирование и пуш (если репозиторий уже создан)

1. **Клонируйте пустой репозиторий**
   ```bash
   git clone https://github.com/YOUR_USERNAME/fazner-ai-platform.git
   cd fazner-ai-platform
   ```

2. **Скопируйте все файлы проекта**
   ```bash
   # Скопируйте все файлы из вашего проекта в клонированную папку
   ```

3. **Добавьте файлы и сделайте коммит**
   ```bash
   git add .
   git commit -m "🚀 Initial commit: Fazner AI Platform"
   git push origin main
   ```

---

## 🔄 Настройка автоматического развертывания

### 1. Настройка GitHub Actions

Создайте файл `.github/workflows/deploy.yml`:

```yaml
name: Deploy Fazner AI Platform

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        npm run install:all
        
    - name: Setup environment
      run: |
        cp .env.example .env
        sed -i 's/your_openrouter_api_key/${{ secrets.OPENROUTER_API_KEY }}/g' .env
        sed -i 's/your_jwt_secret/${{ secrets.JWT_SECRET }}/g' .env
        
    - name: Run tests
      run: |
        cd backend && npm test
        cd ../frontend && npm test
        
    - name: Build applications
      run: |
        npm run build

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: cd frontend && npm ci
      
    - name: Build frontend
      run: |
        cd frontend
        npm run build
        
    - name: Deploy to Vercel
      uses: vercel/action@v1
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to Railway
      uses: alistaircoleman/railway-deploy-action@v1
      with:
        railway-token: ${{ secrets.RAILWAY_TOKEN }}
        service: minimax-ai-backend
        
  docker-build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Build Docker image
      run: |
        docker build -t fazner-ai-platform .
        
    - name: Save Docker image
      run: |
        docker save fazner-ai-platform | gzip > fazner-ai-platform.tar.gz
        
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        name: docker-image
        path: fazner-ai-platform.tar.gz
```

### 2. Настройка Vercel для Frontend

1. **Подключите репозиторий**
   - Перейдите на [vercel.com](https://vercel.com)
   - Нажмите "New Project"
   - Импортируйте репозиторий `fazner-ai-platform`

2. **Настройте конфигурацию**
   ```
   Framework Preset: Vite
   Build Command: cd frontend && npm run build
   Output Directory: frontend/dist
   Install Command: cd frontend && npm install
   ```

3. **Настройте переменные окружения**
   ```
   VITE_OPENROUTER_API_URL = https://openrouter.ai/api/v1
   VITE_OPENROUTER_API_KEY = your_openrouter_api_key
   VITE_MINIMAX_MODEL = mini-max/text-01
   ```

### 3. Настройка Railway для Backend

1. **Создайте проект на Railway**
   - Перейдите на [railway.app](https://railway.app)
   - Создайте новый проект
   - Подключите GitHub репозиторий

2. **Настройте базу данных**
   - Добавьте PostgreSQL сервис
   - Добавьте Redis сервис

3. **Настройте переменные окружения**
   ```
   NODE_ENV = production
   PORT = 3001
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   REDIS_URL = ${{Redis.REDIS_URL}}
   OPENROUTER_API_KEY = your_openrouter_api_key
   JWT_SECRET = your_jwt_secret
   ```

4. **Настройте Dockerfile**
   Создайте `Dockerfile` в корне проекта:
   ```dockerfile
   # Multi-stage build
   FROM node:18-alpine AS builder
   
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   COPY frontend/package*.json ./frontend/
   COPY backend/package*.json ./backend/
   
   # Install dependencies
   RUN npm run install:all
   
   # Copy source code
   COPY . .
   
   # Build applications
   RUN npm run build
   
   # Production stage
   FROM node:18-alpine AS production
   
   WORKDIR /app
   
   # Install dumb-init for proper signal handling
   RUN apk add --no-cache dumb-init
   
   # Copy built applications
   COPY --from=builder /app/backend/dist ./backend/dist
   COPY --from=builder /app/backend/node_modules ./backend/node_modules
   COPY --from=builder /app/frontend/dist ./frontend/dist
   COPY --from=builder /app/backend/package.json ./backend/package.json
   COPY --from=builder /app/docker-compose.yml ./docker-compose.yml
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   
   USER nextjs
   
   EXPOSE 3001
   
   CMD ["dumb-init", "node", "backend/dist/server.js"]
   ```

### 4. Настройка Docker Hub

1. **Создайте аккаунт на Docker Hub**
2. **Настройте GitHub Secrets**:
   - `DOCKER_USERNAME` - ваше имя пользователя Docker Hub
   - `DOCKER_PASSWORD` - ваш пароль Docker Hub
   - `DOCKER_REPO` - имя репозитория (например: `yourusername/fazner-ai-platform`)

3. **Добавьте workflow для Docker**:
   Создайте `.github/workflows/docker.yml`:
   ```yaml
   name: Build and Push Docker Image
   
   on:
     push:
       branches: [ main ]
       tags: [ 'v*' ]
   
   jobs:
     docker:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v4
       
       - name: Set up Docker Buildx
         uses: docker/setup-buildx-action@v3
         
       - name: Login to Docker Hub
         uses: docker/login-action@v3
         with:
           username: ${{ secrets.DOCKER_USERNAME }}
           password: ${{ secrets.DOCKER_PASSWORD }}
           
       - name: Extract metadata
         id: meta
         uses: docker/metadata-action@v5
         with:
           images: ${{ secrets.DOCKER_REPO }}
           
       - name: Build and push
         uses: docker/build-push-action@v5
         with:
           context: .
           push: true
           tags: ${{ steps.meta.outputs.tags }}
           labels: ${{ steps.meta.outputs.labels }}
   ```

---

## ⚙️ Дополнительные настройки

### 1. Настройка GitHub Secrets

Перейдите в Settings → Secrets and variables → Actions и добавьте:

**Для GitHub Actions:**
```
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_jwt_secret
VERCEL_TOKEN=your_vercel_token
ORG_ID=your_vercel_org_id
PROJECT_ID=your_vercel_project_id
RAILWAY_TOKEN=your_railway_token
DOCKER_USERNAME=your_docker_username
DOCKER_PASSWORD=your_docker_password
DOCKER_REPO=yourusername/fazner-ai-platform
```

### 2. Настройка Branch Protection

1. Перейдите в Settings → Branches
2. Добавьте правило для ветки `main`:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Restrict pushes that create files larger than 100MB

### 3. Настройка Issue Templates

Создайте `.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug Report
description: Create a report to help us improve
title: "[Bug]: "
labels: ["bug"]
assignees: []

body:
- type: markdown
  attributes:
    value: |
      Thanks for taking the time to fill out this bug report!

- type: input
  id: what-happened
  attributes:
    label: What happened?
    description: Also tell us, what did you expect to happen?
    placeholder: Describe the bug
  validations:
    required: true

- type: input
  id: reproduction
  attributes:
    label: Reproduction steps
    description: Please provide step-by-step instructions
    placeholder: |
      1. Go to '...'
      2. Click on '....'
      3. See error
  validations:
    required: true

- type: dropdown
  id: browsers
  attributes:
    label: What browsers are you seeing the problem on?
    multiple: true
    options:
      - Firefox
      - Chrome
      - Safari
      - Microsoft Edge
```

### 4. Настройка README Badges

Добавьте бейджи в README.md:

```markdown
[![CI](https://github.com/YOUR_USERNAME/fazner-ai-platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/YOUR_USERNAME/fazner-ai-platform/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Code Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://standardjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Frontend Deploy](https://img.shields.io/badge/Frontend-Vercel-green.svg)](https://vercel.com)
[![Backend Deploy](https://img.shields.io/badge/Backend-Railway-orange.svg)](https://railway.app)
```

### 5. Настройка Code Quality

Создайте `.eslintrc.js` в корне:

```javascript
module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks',
    '@typescript-eslint',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-console': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

---

## 🛠️ Troubleshooting

### Частые проблемы и решения

#### 1. Ошибки при первом push
```bash
# Если получили ошибку "Authentication failed"
git remote set-url origin https://github.com/YOUR_USERNAME/fazner-ai-platform.git

# Или используйте Personal Access Token
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/fazner-ai-platform.git
```

#### 2. Слишком большой репозиторий
```bash
# Найдите большие файлы
git log --pretty=format:'%h %s' --name-only | grep -E '\.(jpg|jpeg|png|gif|mp4|mp3|zip|tar|gz)$' | head -20

# Удалите файлы из истории
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch path/to/large/file' \
--prune-empty --tag-name-filter cat -- --all

# Принудительно пушните изменения
git push origin main --force
```

#### 3. Проблемы с правами доступа
```bash
# Проверьте права доступа к файлам
git ls-files --others --exclude-standard

# Удалите игнорируемые файлы
git clean -fd
```

#### 4. Проблемы с зависимостями
```bash
# Очистите node_modules и переустановите
rm -rf node_modules frontend/node_modules backend/node_modules
rm package-lock.json frontend/package-lock.json backend/package-lock.json
npm run install:all
```

#### 5. Проблемы с Docker
```bash
# Пересоберите образ без кэша
docker build --no-cache -t fazner-ai-platform .

# Проверьте размер образа
docker images | grep fazner-ai-platform
```

### Проверочный чек-лист

- [ ] Репозиторий создан на GitHub
- [ ] Все файлы загружены
- [ ] .gitignore настроен правильно
- [ ] README.md заполнен
- [ ] GitHub Actions настроен
- [ ] Secrets добавлены
- [ ] Vercel подключен для frontend
- [ ] Railway подключен для backend
- [ ] Branch protection настроен
- [ ] Issue templates созданы
- [ ] Код компилируется без ошибок
- [ ] Тесты проходят
- [ ] Развертывание работает

---

## 🎉 Финальные шаги

1. **Проверьте все работает**:
   ```bash
   git status
   git log --oneline
   git remote -v
   ```

2. **Создайте первый релиз**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Настройте автоматические обновления**:
   - Включите Dependabot в Settings → Security → Dependency graph
   - Настройте автоматические обновления безопасности

4. **Создайте Documentation сайт**:
   - Используйте GitHub Pages для документации
   - Настройте Storybook для компонентов

5. **Добавьте команды в README**:
   ```bash
   # Quick deploy commands
   npm run deploy:frontend  # Deploy to Vercel
   npm run deploy:backend   # Deploy to Railway
   npm run deploy:docker    # Build Docker image
   ```

---

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте [документацию GitHub](https://docs.github.com)
2. Создайте issue в репозитории
3. Обратитесь к документации сервисов развертывания:
   - [Vercel Docs](https://vercel.com/docs)
   - [Railway Docs](https://docs.railway.app)
   - [Docker Docs](https://docs.docker.com)

---

**Удачи с развертыванием! 🚀**

*Создано с помощью Fazner AI Team - вашего AI помощника для разработки*