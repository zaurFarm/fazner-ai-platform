# 🚀 GitHub Deployment - Quick Start

Этот файл содержит краткое руководство по загрузке Fazner AI Platform на GitHub.

## 📋 Быстрый старт

### 1. Подготовка
```bash
# Сделайте файл исполняемым
chmod +x deploy.sh

# Запустите полную настройку
./deploy.sh --full
```

### 2. Ручная настройка

#### Создание репозитория на GitHub
1. Перейдите на [GitHub](https://github.com) и войдите в аккаунт
2. Нажмите "New repository" (зеленая кнопка)
3. Заполните данные:
   - **Repository name**: `fazner-ai-platform`
   - **Description**: `Enterprise AI Platform powered by Fazner AI`
   - **Visibility**: Public (или Private)
   - ✅ Add a README file
   - ✅ Add .gitignore: Node
   - ✅ Choose a license: MIT
4. Нажмите "Create repository"

#### Загрузка кода
```bash
# Инициализируйте Git репозиторий
git init

# Добавьте все файлы
git add .

# Сделайте первый коммит
git commit -m "🚀 Initial commit: Fazner AI Platform

Features:
- React + TypeScript frontend
- Node.js + Express backend
- PostgreSQL + Redis integration
- Fazner AI AI integration
- Docker containerization
- Security middleware
- Performance monitoring"

# Добавьте remote репозиторий
git remote add origin https://github.com/YOUR_USERNAME/fazner-ai-platform.git

# Отправьте код на GitHub
git branch -M main
git push -u origin main
```

## 🔧 Настройка GitHub Secrets

Перейдите в ваш репозиторий: `Settings` → `Secrets and variables` → `Actions`

Добавьте следующие secrets:

### Для Vercel (Frontend)
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

### Для Railway (Backend)
```
RAILWAY_TOKEN=your_railway_token
```

### Для Production Docker
```
PRODUCTION_HOST=your-server.com
PRODUCTION_USER=your-username
PRODUCTION_SSH_KEY=your-ssh-private-key
PRODUCTION_PORT=22
DATABASE_URL=postgresql://user:pass@prod-db:5432/minimax_ai
REDIS_URL=redis://prod-redis:6379
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_production_jwt_secret
```

### Для уведомлений
```
SLACK_WEBHOOK=https://hooks.slack.com/services/...
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

## 🎯 Автоматическое развертывание

После загрузки кода на GitHub, автоматически запустится:

1. **CI/CD Pipeline** (`.github/workflows/deploy.yml`)
2. **Security Scanning** (Trivy)
3. **Code Quality Checks** (ESLint, TypeScript)
4. **Build & Test** (Frontend + Backend)
5. **Docker Build** (Multi-stage production image)
6. **Deployment** (Vercel + Railway + Docker)

## 📊 Мониторинг развертывания

- Перейдите в `Actions` вкладку в GitHub репозитории
- Отслеживайте статус каждого workflow
- Получайте уведомления в Slack/Discord

## 🛠️ Настройка Branch Protection

1. Перейдите в `Settings` → `Branches`
2. Добавьте правило для ветки `main`:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging

## 🚨 Troubleshooting

### Проблемы с правами доступа
```bash
# Если получили ошибку "Authentication failed"
git remote set-url origin https://YOUR_USERNAME:YOUR_TOKEN@github.com/YOUR_USERNAME/fazner-ai-platform.git
```

### Слишком большой репозиторий
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

### Проблемы с зависимостями
```bash
# Очистите node_modules и переустановите
rm -rf node_modules frontend/node_modules backend/node_modules
rm package-lock.json frontend/package-lock.json backend/package-lock.json
npm run install:all
```

## 📞 Поддержка

Если возникли проблемы:

1. Проверьте [документацию GitHub](https://docs.github.com)
2. Создайте issue в репозитории
3. Обратитесь к [подробному руководству](GITHUB_DEPLOYMENT_GUIDE.md)

## ✅ Чек-лист развертывания

- [ ] Репозиторий создан на GitHub
- [ ] Все файлы загружены
- [ ] .gitignore настроен правильно
- [ ] GitHub Secrets добавлены
- [ ] Branch Protection настроен
- [ ] CI/CD Pipeline работает
- [ ] Развертывание проходит успешно
- [ ] Уведомления настроены

---

**Удачи с развертыванием! 🎉**

*Создано с помощью Fazner AI Team*