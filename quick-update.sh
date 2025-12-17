#!/bin/bash

# ⚡ Быстрое обновление с GitHub - Fazner AI Platform
# Используйте этот скрипт для быстрого обновления production

set -e

# Конфигурация
REPO_USER="zaurFarm"
REPO_NAME="fazner-ai-platform"
PROJECT_DIR="/opt/fazner-ai-platform"
BACKUP_DIR="/opt/backups/fazner-ai-platform"

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo "⚡ Быстрое обновление Fazner AI Platform с GitHub"
echo "================================================"

# Проверка наличия проекта
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Проект не найден в $PROJECT_DIR"
    echo "Используйте deploy-production.sh для первоначального развертывания"
    exit 1
fi

cd $PROJECT_DIR

# Создание быстрого бэкапа
log_info "💾 Создание быстрого бэкапа..."
BACKUP_FILE="$BACKUP_DIR/quick-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_FILE . 2>/dev/null || true
log_success "Бэкап создан: $BACKUP_FILE"

# Получение последних изменений с GitHub
log_info "📥 Получение последних изменений..."
git fetch origin
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]; then
    log_warning "Код уже актуальный, изменений нет"
    exit 0
fi

log_info "Обновление с $LOCAL_COMMIT до $REMOTE_COMMIT"
git reset --hard origin/main

# Перезапуск контейнеров
log_info "🔄 Перезапуск контейнеров..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Ожидание готовности
log_info "⏳ Ожидание готовности сервисов..."
sleep 20

# Быстрая проверка
log_info "🔍 Быстрая проверка..."
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    log_success "✅ Обновление завершено успешно!"
    echo ""
    echo "📊 Статус:"
    docker-compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
else
    echo "❌ Проблема с backend, проверьте логи:"
    docker-compose -f docker-compose.prod.yml logs backend --tail=20
    exit 1
fi

echo ""
echo "🎉 Быстрое обновление завершено!"