# 🚀 Развертывание Fazner AI Platform на GitHub

## Варианты развертывания

### **Вариант 1: GitHub Packages + Docker (Рекомендуемый)**

#### **Шаг 1: Подготовка репозитория**
```bash
# Инициализируйте git репозиторий
git init
git add .
git commit -m "Initial commit: Fazner AI Platform"
git branch -M main
git remote add origin https://github.com/ваш-username/fazner-ai-platform.git
git push -u origin main
```

#### **Шаг 2: Настройка GitHub Packages**
1. Перейдите в репозиторий на GitHub
2. Settings → Actions → General
3. Убедитесь, что "Allow GitHub Actions to create and approve pull requests" включено
4. Settings → Packages → GitHub Packages включено

#### **Шаг 3: Настройка Secrets (важно для безопасности!)**
В репозитории Settings → Secrets and variables → Actions добавьте:

**Обязательные секреты:**
```
OPENROUTER_API_KEY=sk-or-v1-ваш-api-ключ
DATABASE_PASSWORD=сильный-пароль-бд
JWT_SECRET=сгенерированный-jwt-секрет
SESSION_SECRET=сгенерированный-session-секрет
```

**Опциональные для продакшена:**
```
DOMAIN_NAME=ваш-домен.com
SSL_EMAIL=ваш-email@домен.com
SERVER_HOST=IP-адрес-сервера
SERVER_USER=пользователь-сервера
SERVER_SSH_KEY=SSH-ключ-сервера
```

#### **Шаг 4: Автоматическое развертывание**
GitHub Actions автоматически:
- ✅ Протестирует код
- ✅ Соберет Docker образы
- ✅ Загрузит в GitHub Packages
- ✅ Запустит сканирование безопасности

### **Вариант 2: GitHub Pages (только фронтенд)**

#### **Для статического хостинга:**
```bash
# В frontend/package.json добавьте:
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}

# Установите gh-pages
npm install --save-dev gh-pages

# Разверните
npm run deploy
```

### **Вариант 3: Vercel (Frontend) + Railway (Backend)**

#### **Vercel для фронтенда:**
1. Подключите GitHub аккаунт к Vercel
2. Импортируйте репозиторий
3. Build settings:
   - Framework: Vite
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/dist`
4. Environment variables:
   ```
   VITE_API_URL=https://ваш-бэкенд-url
   VITE_OPENROUTER_API_KEY=ваш-api-ключ
   ```

#### **Railway для бэкенда:**
1. Подключите GitHub к Railway
2. Деплойте backend папку
3. Environment variables:
   ```
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   JWT_SECRET=ваш-секрет
   OPENROUTER_API_KEY=ваш-api-ключ
   ```

### **Вариант 4: Render (Full-stack)**

#### **Render.com поддерживает полный стек:**
1. Connect GitHub repository
2. Web Service settings:
   - Build command: `docker-compose build`
   - Start command: `docker-compose up`
3. Environment variables настраиваются в панели Render

## 🔒 Безопасность при развертывании

### **1. Скрытие API ключей**

#### **Никогда не коммитьте в код:**
```bash
# ✅ Правильно - через переменные окружения
const apiKey = process.env.OPENROUTER_API_KEY;

# ❌ Неправильно - прямо в коде
const apiKey = "sk-or-v1-реальный-ключ";
```

#### **Использование прокси-сервера:**
```typescript
// backend/src/routes/ai.ts
router.post('/generate', async (req, res) => {
  // Не передаем API ключ на фронтенд
  const response = await openai.chat.completions.create({
    model: "mini-max/text-01",
    messages: req.body.messages,
    max_tokens: 2000
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
    }
  });
  
  res.json({ response: response.choices[0].message.content });
});
```

### **2. Rate Limiting и Monitoring**
```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов
  message: 'Слишком много запросов',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### **3. Обфускация кода**
```bash
# Сборка с обфускацией для продакшена
npm run build:obfuscated
```

## 📦 GitHub Packages использование

### **Скачивание образов на вашем сервере:**
```bash
# Логин в GitHub Packages
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Скачивание образов
docker pull ghcr.io/ваш-username/fazner-ai-platform-backend:latest
docker pull ghcr.io/ваш-username/fazner-ai-platform-frontend:latest

# Запуск
docker run -d \
  -p 5000:5000 \
  -e OPENROUTER_API_KEY=ваш-ключ \
  ghcr.io/ваш-username/fazner-ai-platform-backend:latest
```

## 🔍 Обнаружение API конкурентами

### **Методы обнаружения (и как их избежать):**

#### **1. Анализ сетевого трафика**
**Как конкуренты могут:**
- Анализировать HTTP запросы к openrouter.ai
- Изучать headers и URL паттерны

**Защита:**
```typescript
// Создайте прокси-эндпоинт
app.post('/api/ai/chat', async (req, res) => {
  // Маскируем источник запроса
  const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
    ...req.body
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'User-Agent': 'Fazner-AI-Platform/1.0', // Маскируем под свой сервис
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  
  res.json(response.data);
});
```

#### **2. Анализ JavaScript кода**
**Как конкуренты могут:**
- Изучать минифицированный JavaScript
- Искать характерные паттерны API вызовов

**Защита:**
```typescript
// ❌ Не делайте так
const apiKey = "sk-or-v1-...";

// ✅ Делайте так
const API_CONFIG = {
  endpoint: '/api/internal/chat',
  method: 'POST'
};

// Используйте code splitting и lazy loading
const loadAI = lazy(() => import('./ai-service'));
```

#### **3. Анализ заголовков сервера**
**Как конкуренты могут:**
- Анализировать Server headers
- Изучать response паттерны

**Защита:**
```nginx
# nginx.conf
server_tokens off;
proxy_set_header X-Server "Fazner-AI-Platform";
```

#### **4. Анализ времени ответа**
**Как конкуренты могут:**
- Сопоставлять время ответа с известными API

**Защита:**
```typescript
// Добавляем random delay
const randomDelay = Math.random() * 2000;
await new Promise(resolve => setTimeout(resolve, randomDelay));

const response = await aiService.generate(prompt);
```

### **Продвинутые методы защиты:**

#### **1. API Gateway с обфускацией**
```typescript
// Создайте множественные endpoints
const endpoints = [
  '/api/v1/chat',
  '/api/v2/generate', 
  '/api/internal/ai',
  '/api/service/message'
];

// Ротация endpoints
const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
```

#### **2. Code Encryption**
```bash
# Используйте tools как:
npm install --save-dev @babel/plugin-transform-encrypt-code
npm install --save-dev javascript-obfuscator
```

#### **3. Proxy через собственный домен**
```typescript
// Создайте поддомен специально для AI
// ai-api.ваш-домен.com → openrouter.ai
```

#### **4. Environment Detection**
```typescript
// Определяйте продакшена и скрывайте детали
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Скрываем детали API
  removeDebugHeaders();
  obfuscateResponse();
}
```

## 🎯 Рекомендуемая стратегия

### **Для стартапа (до 100 пользователей):**
1. **GitHub Packages** для образов
2. **Railway** для бэкенда ($5/месяц)
3. **Vercel** для фронтенда (бесплатно)
4. **Базовая защита** через proxy endpoints

### **Для роста (100-1000 пользователей):**
1. **Собственный VPS** с Docker
2. **Nginx** reverse proxy
3. **Продвинутая защита** API
4. **Rate limiting** и monitoring

### **Для Enterprise (1000+ пользователей):**
1. **Kubernetes** cluster
2. **Load balancer** с multiple API endpoints
3. **Enterprise security** measures
4. **Dedicated infrastructure**

## 📊 Сравнение стоимости развертывания

| Платформа | Frontend | Backend | Database | SSL | Стоимость/месяц |
|-----------|----------|---------|----------|-----|-----------------|
| GitHub Pages + Railway | $0 | $5 | $5 | ✅ | $10 |
| Vercel + Railway | $0 | $5 | $5 | ✅ | $10 |
| Render | $0 | $7 | $7 | ✅ | $14 |
| DigitalOcean VPS | $0 | $0 | $0 | ✅ | $20-40 |
| AWS/GCP | $0 | $0 | $0 | ✅ | $50-100 |

**🎯 Рекомендую начать с GitHub + Railway для быстрого старта, затем мигрировать на собственный VPS при росте.**