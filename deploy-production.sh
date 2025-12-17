#!/bin/bash

# 🚀 Автоматический скрипт развертывания Fazner AI Platform
# Этот скрипт выполняет полное развертывание с GitHub на production сервер

set -e  # Exit on any error

# Конфигурация
REPO_NAME="fazner-ai-platform"
GITHUB_USER="zaurFarm"
DOCKER_REGISTRY="ghcr.io"
PROJECT_DIR="/opt/fazner-ai-platform"
BACKUP_DIR="/opt/backups/fazner-ai-platform"
ENV_FILE=".env.production"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Проверка предварительных условий
check_prerequisites() {
    log_info "🔍 Проверка предварительных условий..."
    
    # Проверка Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен!"
        exit 1
    fi
    
    # Проверка Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен!"
        exit 1
    fi
    
    # Проверка Git
    if ! command -v git &> /dev/null; then
        log_error "Git не установлен!"
        exit 1
    fi
    
    log_success "✅ Все предварительные условия выполнены"
}

# Создание необходимых директорий
setup_directories() {
    log_info "📁 Создание директорий..."
    
    sudo mkdir -p $PROJECT_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $PROJECT_DIR/{nginx,ssl,logs,prometheus,grafana,uploads}
    sudo mkdir -p $PROJECT_DIR/grafana/{provisioning,dashboards}
    sudo mkdir -p $PROJECT_DIR/prometheus
    
    # Установка прав доступа
    sudo chown -R $USER:$USER $PROJECT_DIR
    sudo chown -R $USER:$USER $BACKUP_DIR
    
    log_success "✅ Директории созданы"
}

# Клонирование/обновление репозитория
sync_repository() {
    log_info "📥 Синхронизация с GitHub..."
    
    if [ -d "$PROJECT_DIR/.git" ]; then
        log_info "Обновление существующего репозитория..."
        cd $PROJECT_DIR
        git fetch origin
        git reset --hard origin/main
    else
        log_info "Клонирование репозитория..."
        cd /opt
        git clone https://github.com/$GITHUB_USER/$REPO_NAME.git
        cd $REPO_NAME
    fi
    
    log_success "✅ Репозиторий синхронизирован"
}

# Создание резервной копии
create_backup() {
    log_info "💾 Создание резервной копии..."
    
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Резервное копирование базы данных
    if docker ps | grep -q fazner-database; then
        log_info "Резервное копирование базы данных..."
        docker exec fazner-database pg_dump -U fazner_user fazner_ai_platform > $PROJECT_DIR/db_backup.sql
    fi
    
    # Резервное копирование файлов
    tar -czf $BACKUP_FILE -C $PROJECT_DIR .
    
    # Удаление старых бэкапов (старше 7 дней)
    find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +7 -delete
    
    log_success "✅ Резервная копия создана: $BACKUP_FILE"
}

# Загрузка Docker образов
pull_docker_images() {
    log_info "🐳 Загрузка Docker образов..."
    
    BACKEND_IMAGE="$DOCKER_REGISTRY/$GITHUB_USER/$REPO_NAME-backend:latest"
    FRONTEND_IMAGE="$DOCKER_REGISTRY/$GITHUB_USER/$REPO_NAME-frontend:latest"
    
    docker pull $BACKEND_IMAGE
    docker pull $FRONTEND_IMAGE
    
    log_success "✅ Docker образы загружены"
}

# Остановка текущих контейнеров
stop_containers() {
    log_info "🛑 Остановка текущих контейнеров..."
    
    cd $PROJECT_DIR
    docker-compose -f docker-compose.prod.yml down || true
    
    # Принудительная остановка зависших контейнеров
    docker kill $(docker ps -q --filter "name=fazner") 2>/dev/null || true
    
    log_success "✅ Контейнеры остановлены"
}

# Обновление конфигурации
update_configuration() {
    log_info "⚙️ Обновление конфигурации..."
    
    # Копирование конфигурационных файлов
    cp -r nginx/* $PROJECT_DIR/nginx/ 2>/dev/null || true
    
    # Создание .env файла если не существует
    if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
        log_warning "Файл .env не найден. Создаю базовый..."
        cat > $PROJECT_DIR/$ENV_FILE << EOF
# Fazner AI Platform - Production Environment
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://fazner_user:your_password@database:5432/fazner_ai_platform
DB_USER=fazner_user
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_redis_password

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# OpenRouter AI
OPENROUTER_API_KEY=your_openrouter_api_key

# URLs
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://your-domain.com/api

# Admin
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=secure_admin_password

# Features
ENABLE_REGISTRATION=true
ENABLE_ANALYTICS=true
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin
EOF
        log_warning "⚠️  ВАЖНО: Отредактируйте файл $ENV_FILE с вашими настройками!"
    fi
    
    log_success "✅ Конфигурация обновлена"
}

# Запуск новых контейнеров
start_containers() {
    log_info "🚀 Запуск новых контейнеров..."
    
    cd $PROJECT_DIR
    
    # Запуск с новой конфигурацией
    docker-compose -f docker-compose.prod.yml up -d
    
    # Ожидание готовности сервисов
    log_info "⏳ Ожидание готовности сервисов..."
    sleep 30
    
    # Проверка состояния контейнеров
    if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
        log_success "✅ Контейнеры запущены"
    else
        log_error "❌ Ошибка запуска контейнеров"
        docker-compose -f docker-compose.prod.yml logs
        exit 1
    fi
}

# Проверка здоровья системы
health_check() {
    log_info "🔍 Проверка здоровья системы..."
    
    # Проверка backend
    if curl -f http://localhost/api/health > /dev/null 2>&1; then
        log_success "✅ Backend здоров"
    else
        log_error "❌ Backend не отвечает"
        return 1
    fi
    
    # Проверка frontend
    if curl -f http://localhost/ > /dev/null 2>&1; then
        log_success "✅ Frontend здоров"
    else
        log_error "❌ Frontend не отвечает"
        return 1
    fi
    
    # Проверка базы данных
    if docker exec fazner-database pg_isready -U fazner_user > /dev/null 2>&1; then
        log_success "✅ База данных доступна"
    else
        log_error "❌ База данных недоступна"
        return 1
    fi
    
    # Проверка Redis
    if docker exec fazner-redis redis-cli ping | grep -q PONG; then
        log_success "✅ Redis доступен"
    else
        log_error "❌ Redis недоступен"
        return 1
    fi
}

# Очистка старых образов
cleanup() {
    log_info "🧹 Очистка старых Docker образов..."
    
    # Удаление старых образов
    docker image prune -f
    
    # Удаление неиспользуемых томов
    docker volume prune -f
    
    log_success "✅ Очистка завершена"
}

# Отправка уведомления
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Fazner AI Platform Deployment: $message\"}" \
            $SLACK_WEBHOOK || true
    fi
    
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Fazner AI Platform Deployment: $message\"}" \
            $DISCORD_WEBHOOK || true
    fi
}

# Главная функция
main() {
    log_info "🚀 Начало развертывания Fazner AI Platform"
    log_info "=================================================="
    
    # Проверка аргументов
    SKIP_BACKUP=false
    if [ "$1" == "--skip-backup" ]; then
        SKIP_BACKUP=true
        log_info "Пропуск создания резервной копии"
    fi
    
    # Выполнение этапов
    check_prerequisites
    setup_directories
    sync_repository
    
    if [ "$SKIP_BACKUP" == "false" ]; then
        create_backup
    fi
    
    pull_docker_images
    stop_containers
    update_configuration
    start_containers
    
    # Проверка здоровья
    if health_check; then
        log_success "🎉 Развертывание завершено успешно!"
        send_notification "success" "Развертывание завершено успешно"
        
        echo ""
        echo "📊 Статус сервисов:"
        docker-compose -f $PROJECT_DIR/docker-compose.prod.yml ps
        
        echo ""
        echo "🌐 URLs:"
        echo "Frontend: https://$(hostname -I | awk '{print $1}')/"
        echo "Backend API: https://$(hostname -I | awk '{print $1}')/api"
        echo "Grafana: https://$(hostname -I | awk '{print $1}'):3001"
        echo "Prometheus: https://$(hostname -I | awk '{print $1}'):9090"
        
    else
        log_error "❌ Развертывание завершилось с ошибками"
        send_notification "failure" "Развертывание завершилось с ошибками"
        exit 1
    fi
    
    cleanup
    log_success "✨ Развертывание полностью завершено!"
}

# Обработка сигналов для graceful shutdown
trap 'log_error "Развертывание прервано пользователем"; exit 1' INT TERM

# Запуск
main "$@"