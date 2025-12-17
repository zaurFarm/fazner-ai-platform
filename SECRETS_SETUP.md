# 🔐 Настройка секретов для Fazner AI Platform

## 🎯 Что нужно сделать

После успешной загрузки проекта на GitHub, необходимо настроить секреты для автоматического развертывания.

## 📋 Список необходимых секретов

В вашем репозитории `zaurFarm/fazner-ai-platform` перейдите в **Settings → Secrets and variables → Actions** и добавьте следующие секреты:

### 🔑 Обязательные секреты

1. **`OPENROUTER_API_KEY`**
   - Ваш API ключ от OpenRouter
   - Формат: `sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **`JWT_SECRET`**
   - Секретный ключ для JWT токенов
   - Сгенерируйте: `openssl rand -base64 32`

3. **`SESSION_SECRET`**
   - Секретный ключ для сессий
   - Сгенерируйте: `openssl rand -base64 32`

### 🗄️ Базы данных (опционально для тестирования)

4. **`DATABASE_URL`**
   - URL подключения к PostgreSQL
   - Для тестирования: `postgresql://postgres:password@localhost:5432/fazner_test`

5. **`REDIS_URL`**
   - URL подключения к Redis
   - Для тестирования: `redis://localhost:6379`

### 🌍 Переменные окружения для GitHub Actions

6. **`VITE_API_URL`**
   - URL API для фронтенда
   - Значение: `https://zaurfarm-fazner-ai-platform.vercel.app/api`

## 🛠️ Автоматическая настройка через CLI

Выполните следующие команды в терминале (замените YOUR_TOKEN на ваш GitHub Personal Access Token):

```bash
# Установите GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Авторизуйтесь
gh auth login --with-token

# Настройте секреты
gh secret set OPENROUTER_API_KEY --body "your-openrouter-api-key"
gh secret set JWT_SECRET --body "your-jwt-secret"
gh secret set SESSION_SECRET --body "your-session-secret"
gh secret set DATABASE_URL --body "postgresql://user:password@host:5432/database"
gh secret set REDIS_URL --body "redis://localhost:6379"
gh secret set VITE_API_URL --body "https://zaurfarm-fazner-ai-platform.vercel.app/api"
```

## 🚀 После настройки секретов

1. **Перейдите на вкладку Actions** в вашем репозитории
2. **Нажмите "Enable Actions"** если потребуется
3. **Запустите workflow** вручную или он запустится автоматически при следующем push

## 🔧 Ручная настройка через веб-интерфейс

1. Откройте: https://github.com/zaurFarm/fazner-ai-platform/settings/secrets/actions
2. Нажмите "New repository secret"
3. Добавьте каждый секрет по отдельности

## ⚠️ Важные замечания

- **Никогда не коммитьте секреты в код!**
- Используйте только репозиторные секреты GitHub
- Регулярно обновляйте ключи безопасности
- Для продакшена используйте отдельные базы данных

## 🎉 Готово!

После настройки секретов ваш проект будет готов к автоматическому развертыванию!