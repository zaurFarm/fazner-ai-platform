# 🚀 Быстрое развертывание на GitHub (5 минут)

## Вариант 1: GitHub + Railway (Рекомендуется)

### **Шаг 1: Загружаем код на GitHub**
```bash
# В папке проекта
git init
git add .
git commit -m "Initial commit: Fazner AI Platform"
git branch -M main
git remotegithub.com/ВАШ-USERNAME/minimax- add origin https://ai-platform.git
git push -u origin main
```

### **Шаг 2: Настраиваем бэкенд на Railway**
1. Идем на [railway.app](https://railway.app)
2. Логинимся через GitHub
3. "New Project" → "Deploy from GitHub repo"
4. Выбираем наш репозиторий
5. Railway автоматически найдет backend/Dockerfile

**Настройки Railway:**
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

**Environment Variables в Railway:**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/railway
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret
OPENROUTER_API_KEY=sk-or-v1-ваш-api-ключ
NODE_ENV=production
PORT=5000
```

### **Шаг 3: Настраиваем фронтенд на Vercel**
1. Идем на [vercel.com](https://vercel.com)
2. "New Project" → "Import Git Repository"
3. Выбираем наш GitHub репозиторий
4. Настройки:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

**Environment Variables в Vercel:**
```
VITE_API_URL=https://ваш-railway-url.railway.app/api
VITE_OPENROUTER_API_KEY=sk-or-v1-ваш-api-ключ
```

### **Готово! Ваш сайт доступен:**
- **Frontend:** https://ваш-проект.vercel.app
- **Backend API:** https://ваш-railway-url.railway.app/api

## Вариант 2: GitHub + Docker на собственном VPS

### **Шаг 1: Подготовка сервера**
```bash
# На вашем Linux сервере
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose git -y
sudo usermod -aG docker $USER
# Перезайдите в систему
```

### **Шаг 2: Клонирование и развертывание**
```bash
# Клонируем репозиторий
git clone https://github.com/ВАШ-USERNAME/fazner-ai-platform.git
cd fazner-ai-platform

# Настраиваем переменные окружения
cp .env.example .env
nano .env  # Добавьте ваши API ключи

# Запускаем
chmod +x deploy.sh
./deploy.sh deploy
```

### **Готово! Доступ:**
- **Сайт:** http://ВАШ-IP-СЕРВЕРА:3000
- **API:** http://ВАШ-IP-СЕРВЕРА:5000

## Вариант 3: GitHub + Render.com (Полный стек)

### **Шаг 1: Deploy на Render**
1. Идем на [render.com](https://render.com)
2. "New +" → "Web Service"
3. Connect GitHub repository
4. Build Settings:
   - Build Command: `docker-compose build`
   - Start Command: `docker-compose up`

**Environment Variables в Render:**
```
OPENROUTER_API_KEY=ваш-api-ключ
DATABASE_PASSWORD=сильный-пароль
JWT_SECRET=ваш-jwt-секрет
NODE_ENV=production
```

**Готово:** https://ваш-проект.onrender.com

## 💰 Стоимость развертывания:

| Сервис | Frontend | Backend | Database | SSL | Итого/месяц |
|--------|----------|---------|----------|-----|-------------|
| GitHub + Railway | Бесплатно | $5 | $5 | ✅ | $10 |
| GitHub + Render | Бесплатно | $7 | $7 | ✅ | $14 |
| Собственный VPS | Бесплатно | $0 | $0 | ✅ | $20-40 |

## 🎯 Рекомендую начать с Railway - это быстро, надежно и дешево!