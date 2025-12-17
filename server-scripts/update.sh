#!/bin/bash

# MiniMax AI Platform - Скрипт обновления для сервера
# Автор: MiniMax Agent
# Версия: 1.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Функции для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка что мы в правильной директории
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml не найден! Убедитесь что вы в корне проекта."
    exit 1
fi

# Проверка .env файла
if [ ! -f ".env" ]; then
    log_error ".env файл не найден! Скопируйте .env.example в .env и настройте."
    exit 1
fi

log_info "🚀 Начинаем обновление MiniMax AI Platform..."

# Создание бэкапа перед обновлением
log_info "Создание бэкапа..."
BACKUP_DIR="backups/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r . "$BACKUP_DIR/" 2>/dev/null || true
log_success "Бэкап создан в $BACKUP_DIR"

# Остановка сервисов
log_info "Остановка сервисов..."
docker-compose down

# Очистка неиспользуемых ресурсов (опционально)
read -p "Очистить неиспользуемые Docker образы? (y/N): " clean_choice
if [[ $clean_choice =~ ^[Yy]$ ]]; then
    log_info "Очистка Docker ресурсов..."
    docker system prune -af --volumes
fi

# Пересборка образов
log_info "Пересборка Docker образов..."
docker-compose build --no-cache

# Запуск сервисов
log_info "Запуск сервисов..."
docker-compose up -d

# Ожидание запуска
log_info "Ожидание запуска сервисов..."
sleep 30

# Проверка здоровья сервисов
log_info "Проверка состояния сервисов..."

# Проверка базы данных
if docker-compose exec -T postgres pg_isready -U minimax_user -d minimax_ai_platform > /dev/null 2>&1; then
    log_success "✅ PostgreSQL: ОК"
else
    log_error "❌ PostgreSQL: ОШИБКА"
fi

# Проверка Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    log_success "✅ Redis: ОК"
else
    log_error "❌ Redis: ОШИБКА"
fi

# Проверка Backend API
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    log_success "✅ Backend API: ОК"
else
    log_warning "⚠️ Backend API: Не отвечает (возможно еще запускается)"
fi

# Проверка Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log_success "✅ Frontend: ОК"
else
    log_warning "⚠️ Frontend: Не отвечает (возможно еще запускается)"
fi

# Показ статистики
echo ""
log_info "📊 Статистика после обновления:"
echo "Active containers: $(docker-compose ps -q | wc -l)"
echo "Used disk space: $(docker system df --format 'table {{.Size}}' | tail -n +2 | head -n 1)"
echo "Memory usage: $(free -h | grep Mem | awk '{print $3 "/" $2}')"

# Получение внешнего IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")
echo ""
log_success "🎉 Обновление завершено!"
echo ""
echo "📱 Доступные сервисы:"
echo "   🌐 Frontend: http://$SERVER_IP:3000"
echo "   🔌 Backend API: http://$SERVER_IP:5000"
echo "   🗄️  Database: localhost:5432"
echo "   💾 Redis: localhost:6379"
echo ""
echo "📝 Полезные команды:"
echo "   Просмотр логов: docker-compose logs -f"
echo "   Статус сервисов: docker-compose ps"
echo "   Мониторинг: ./server-scripts/monitor.sh"
echo ""
log_info "Обновление успешно завершено! 🚀"