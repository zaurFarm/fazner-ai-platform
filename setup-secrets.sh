#!/bin/bash

# 🔐 Автоматическая настройка секретов для Fazner AI Platform
# Выполните этот скрипт после получения GitHub Personal Access Token

set -e

echo "🚀 Настройка секретов для Fazner AI Platform"
echo "================================================"

# Проверка наличия GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI не установлен. Устанавливаю..."
    
    # Установка GitHub CLI
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install -y gh
    
    echo "✅ GitHub CLI установлен"
fi

# Авторизация GitHub CLI
echo ""
echo "🔐 Авторизация в GitHub..."
echo "Вам нужно будет авторизоваться в GitHub. Выберите 'Login with a web browser' и следуйте инструкциям."
gh auth login --with-token

# Генерация случайных секретов
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

echo ""
echo "🛠️ Генерирую секреты..."
echo "JWT_SECRET: ${JWT_SECRET:0:20}..."
echo "SESSION_SECRET: ${SESSION_SECRET:0:20}..."

# Запрос OpenRouter API Key
echo ""
echo "📝 Введите ваш OpenRouter API Key (начинается с sk-or-v1-):"
read -p "OPENROUTER_API_KEY: " OPENROUTER_API_KEY

if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "❌ OpenRouter API Key обязателен!"
    exit 1
fi

# Настройка секретов в репозитории
REPO="zaurFarm/fazner-ai-platform"

echo ""
echo "⚙️ Настройка секретов в репозитории $REPO..."

# Установка секретов
gh secret set OPENROUTER_API_KEY --repo "$REPO" --body "$OPENROUTER_API_KEY"
gh secret set JWT_SECRET --repo "$REPO" --body "$JWT_SECRET"
gh secret set SESSION_SECRET --repo "$REPO" --body "$SESSION_SECRET"

# Опциональные секреты для тестирования
echo ""
echo "🗄️ Настройка опциональных секретов для тестирования..."

read -p "Хотите настроить тестовые базы данных? (y/N): " setup_db
if [[ $setup_db =~ ^[Yy]$ ]]; then
    gh secret set DATABASE_URL --repo "$REPO" --body "postgresql://postgres:password@localhost:5432/fazner_test"
    gh secret set REDIS_URL --repo "$REPO" --body "redis://localhost:6379"
fi

# Настройка VITE_API_URL
echo ""
echo "🌐 Настройка переменных окружения..."
gh secret set VITE_API_URL --repo "$REPO" --body "https://zaurfarm-fazner-ai-platform.vercel.app/api"

echo ""
echo "🎉 Настройка завершена успешно!"
echo ""
echo "📋 Что дальше:"
echo "1. Перейдите в репозиторий: https://github.com/$REPO"
echo "2. Откройте вкладку 'Actions'"
echo "3. Включите GitHub Actions если потребуется"
echo "4. Workflow запустится автоматически при следующем push"
echo ""
echo "🔍 Проверьте секреты: https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "✅ Готово к развертыванию!"