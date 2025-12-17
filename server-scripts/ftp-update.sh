#!/bin/bash

# MiniMax AI Platform - FTP Update Script
# Простой скрипт для обновления через FTP

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=========================================="
echo "  🔄 MiniMax AI Platform - FTP Update"
echo "=========================================="
echo ""

# Проверка файлов
if [ ! -f "docker-compose.yml" ]; then
    log_error "Файл docker-compose.yml не найден!"
    echo "Убедитесь что вы в корне проекта: /home/minimax/minimax-ai-platform/"
    exit 1
fi

# Проверка .env
if [ ! -f ".env" ]; then
    log_error "Файл .env не найден!"
    echo "Скопируйте .env.example в .env и настройте переменные"
    exit 1
fi

log_info "Проверка готовности к обновлению..."

# Показ текущего состояния
echo ""
echo "📊 Текущее состояние:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || echo "Контейнеры не запущены"

# Меню действий
echo ""
echo "Выберите действие:"
echo "1) 🔄 Полное обновление (рекомендуется)"
echo "2) 🚀 Быстрое обновление (без очистки)"
echo "3) 🔍 Только проверка состояния"
echo "4) ❌ Выход"
echo ""
read -p "Ваш выбор (1-4): " choice

case $choice in
    1)
        echo ""
        log_info "Запуск полного обновления..."
        
        # Создание бэкапа
        BACKUP_DIR="backups/backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r . "$BACKUP_DIR/" 2>/dev/null || true
        log_success "Бэкап создан: $BACKUP_DIR"
        
        # Остановка сервисов
        log_info "Остановка сервисов..."
        docker-compose down
        
        # Очистка
        log_info "Очистка старых образов..."
        docker system prune -af
        
        # Пересборка и запуск
        log_info "Пересборка и запуск..."
        docker-compose up --build -d
        
        # Ожидание
        log_info "Ожидание запуска (30 секунд)..."
        sleep 30
        ;;
        
    2)
        echo ""
        log_info "Запуск быстрого обновления..."
        
        # Остановка без удаления данных
        log_info "Остановка сервисов..."
        docker-compose down
        
        # Быстрая пересборка
        log_info "Быстрая пересборка..."
        docker-compose up --build -d
        
        # Ожидание
        log_info "Ожидание запуска (15 секунд)..."
        sleep 15
        ;;
        
    3)
        echo ""
        log_info "Проверка состояния..."
        
        # Запуск мониторинга
        if [ -f "server-scripts/monitor.sh" ]; then
            ./server-scripts/monitor.sh
        else
            docker-compose ps
            echo ""
            echo "Проверка доступности:"
            curl -f http://localhost:5000/health > /dev/null 2>&1 && echo "✅ Backend: OK" || echo "❌ Backend: DOWN"
            curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Frontend: OK" || echo "❌ Frontend: DOWN"
        fi
        exit 0
        ;;
        
    4)
        echo ""
        log_info "Отмена операции"
        exit 0
        ;;
        
    *)
        log_error "Неверный выбор!"
        exit 1
        ;;
esac

# Проверка результата
echo ""
log_info "Проверка результата обновления..."

# Проверка контейнеров
if docker-compose ps --format "table {{.Name}}\t{{.Status}}" | grep -q "Up"; then
    log_success "✅ Контейнеры запущены"
else
    log_error "❌ Проблемы с запуском контейнеров"
    echo "Проверьте логи: docker-compose logs"
    exit 1
fi

# Проверка сервисов
echo ""
echo "🔍 Проверка сервисов:"

# Backend
if curl -f -s http://localhost:5000/health > /dev/null 2>&1; then
    log_success "✅ Backend API: Работает"
else
    log_warning "⚠️ Backend API: Не отвечает"
fi

# Frontend  
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    log_success "✅ Frontend: Работает"
else
    log_warning "⚠️ Frontend: Не отвечает"
fi

# База данных
if docker-compose exec -T postgres pg_isready -U minimax_user -d minimax_ai_platform > /dev/null 2>&1; then
    log_success "✅ PostgreSQL: Работает"
else
    log_error "❌ PostgreSQL: Ошибка"
fi

# Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    log_success "✅ Redis: Работает"
else
    log_error "❌ Redis: Ошибка"
fi

# Получение IP и вывод ссылок
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "localhost")

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Обновление завершено!${NC}"
echo "=========================================="
echo ""
echo "📱 Доступ к сервисам:"
echo "   🌐 Сайт: http://$SERVER_IP:3000"
echo "   🔌 API: http://$SERVER_IP:5000"
echo "   📊 Health Check: http://$SERVER_IP:5000/health"
echo ""
echo "📝 Полезные команды:"
echo "   📋 Логи: docker-compose logs -f"
echo "   📊 Статус: docker-compose ps"
echo "   🔍 Мониторинг: ./server-scripts/monitor.sh"
echo "   🔄 Обновить: ./server-scripts/ftp-update.sh"
echo ""
log_success "Готово к работе! 🚀"