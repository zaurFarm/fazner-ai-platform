# 🔄 Настройка автоматического развертывания GitHub → Сайт

## 🎯 Цель
Настроить полностью автоматическое развертывание, чтобы при каждом `git push` в main происходило автоматическое обновление сайта.

## 📋 Что будет настроено

✅ **Автоматический деплой** при push в main  
✅ **Резервное копирование** перед каждым обновлением  
✅ **Rollback** в случае проблем  
✅ **Мониторинг** состояния после деплоя  
✅ **Уведомления** о статусе развертывания  

---

## 🚀 Способы развертывания

### **Вариант 1: Vercel + Railway (Рекомендуется для начинающих)**

#### **Frontend → Vercel (бесплатно)**
1. **Создайте аккаунт на Vercel**: https://vercel.com
2. **Подключите GitHub репозиторий**
3. **Настройте environment variables**

#### **Backend → Railway (просто)**
1. **Создайте аккаунт на Railway**: https://railway.app
2. **Подключите GitHub репозиторий**
3. **Настройте environment variables**

### **Вариант 2: VPS/Dedicated Server (максимальный контроль)**

#### **Требования:**
- Ubuntu 20.04+ сервер
- Docker & Docker Compose
- 2GB RAM минимум
- 20GB дискового пространства

---

## 🛠️ Пошаговая настройка

### **Этап 1: Настройка GitHub Secrets**

В репозитории `zaurFarm/fazner-ai-platform` → Settings → Secrets and variables → Actions

Добавьте следующие секреты:

#### **Для Vercel + Railway:**
```bash
# Vercel
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# Railway  
RAILWAY_TOKEN=your_railway_token

# Основные
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# URLs
FRONTEND_URL=https://your-app.vercel.app
BACKEND_URL=https://your-app.railway.app/api
```

#### **Для VPS сервера:**
```bash
# Сервер
VPS_HOST=your-server-ip
VPS_USER=your-username
VPS_SSH_KEY=your-ssh-private-key

# Уведомления (опционально)
SLACK_WEBHOOK=https://hooks.slack.com/...
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...

# Основные
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-key
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
```

### **Этап 2: Получение API ключей**

#### **OpenRouter API:**
1. Зайдите на: https://openrouter.ai/keys
2. Создайте новый API ключ
3. Скопируйте ключ (начинается с `sk-or-v1-`)

#### **Vercel:**
1. Зайдите в настройки: https://vercel.com/account/tokens
2. Создайте Personal Access Token
3. Получите Org ID и Project ID из Dashboard

#### **Railway:**
1. Зайдите в настройки: https://railway.app/account
2. Создайте Railway Token

### **Этап 3: Развертывание на сервер (для VPS)**

#### **Первоначальная настройка сервера:**

```bash
# Подключение к серверу
ssh your-username@your-server-ip

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Переподключение (чтобы применились права)
exit
ssh your-username@your-server-ip
```

#### **Развертывание проекта:**

```bash
# Клонирование репозитория
git clone https://github.com/zaurFarm/fazner-ai-platform.git /opt/fazner-ai-platform
cd /opt/fazner-ai-platform

# Создание production .env файла
cp .env.production.template .env.production
nano .env.production  # Отредактируйте с вашими настройками

# Запуск развертывания
chmod +x deploy-production.sh
./deploy-production.sh
```

### **Этап 4: Автоматизация обновлений**

#### **Настройка cron job для быстрых обновлений:**

```bash
# Отредактируйте crontab
crontab -e

# Добавьте строку для автоматических обновлений каждые 5 минут
*/5 * * * * cd /opt/fazner-ai-platform && ./quick-update.sh >> /var/log/fazner-update.log 2>&1
```

---

## 🔄 Как работает автоматическое развертывание

### **Сценарий: Вы внесли изменения в код**

1. **Вы делаете изменения** в коде локально
2. **Git push** в ветку main:
   ```bash
   git add .
   git commit -m "feat: добавил новую функцию"
   git push origin main
   ```

3. **GitHub Actions автоматически:**
   - ✅ Запускает тестирование
   - ✅ Собирает Docker образы
   - ✅ Развертывает на выбранную платформу
   - ✅ Проверяет здоровье системы
   - ✅ Отправляет уведомления

4. **Ваш сайт автоматически обновляется!**

---

## 🛡️ Стратегия безопасности

### **Ветки разработки:**
- `main` → Production (автоматический деплой)
- `develop` → Staging (тестирование)
- `feature/*` → Временные ветки

### **Rollback план:**
```bash
# Быстрый откат на предыдущую версию
cd /opt/fazner-ai-platform
docker-compose -f docker-compose.prod.yml down
git reset --hard HEAD~1  # Откат на предыдущий коммит
./deploy-production.sh --skip-backup
```

---

## 📊 Мониторинг и логирование

### **Проверка статуса:**
```bash
# Статус всех сервисов
docker-compose -f docker-compose.prod.yml ps

# Логи в реальном времени
docker-compose -f docker-compose.prod.yml logs -f

# Мониторинг ресурсов
docker stats
```

### **URL мониторинга:**
- **Frontend**: https://your-domain.com/
- **Backend API**: https://your-domain.com/api/health
- **Grafana**: https://your-domain.com:3001
- **Prometheus**: https://your-domain.com:9090

---

## 🚨 Устранение неполадок

### **Частые проблемы:**

#### **Docker образы не загружаются:**
```bash
# Проверка registry
docker login ghcr.io
# Или использование docker pull напрямую
docker pull ghcr.io/zaurFarm/fazner-ai-platform-backend:latest
```

#### **База данных недоступна:**
```bash
# Проверка PostgreSQL
docker exec fazner-database pg_isready -U fazner_user

# Сброс базы данных (ВНИМАНИЕ: удалит все данные!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d database
```

#### **Redis недоступен:**
```bash
# Проверка Redis
docker exec fazner-redis redis-cli ping
# Сброс Redis
docker exec fazner-redis redis-cli FLUSHALL
```

### **Полное восстановление:**
```bash
# Полная переустановка
cd /opt/fazner-ai-platform
git pull origin main
./deploy-production.sh --skip-backup
```

---

## 🎉 Результат

После настройки у вас будет:

✅ **Полностью автоматическое развертывание** при каждом push  
✅ **Резервное копирование** перед каждым обновлением  
✅ **Мониторинг состояния** в реальном времени  
✅ **Уведомления** о статусе развертывания  
✅ **Rollback** в случае проблем  

**Просто делайте `git push` и ваш сайт автоматически обновляется!** 🚀