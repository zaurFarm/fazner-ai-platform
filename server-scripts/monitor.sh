#!/bin/bash

# MiniMax AI Platform - Скрипт мониторинга
# Автор: MiniMax Agent

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Получение текущего времени
current_time=$(date '+%Y-%m-%d %H:%M:%S')

echo "=================================================="
echo "  🖥️  MiniMax AI Platform - System Monitor"
echo "  📅 Время: $current_time"
echo "  🖥️  Сервер: $(hostname)"
echo "  🌐 IP: $(curl -s ifconfig.me 2>/dev/null || echo ' недоступен')"
echo "=================================================="

# Проверка Docker сервисов
echo -e "\n${BLUE}📦 Docker Контейнеры:${NC}"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Системные ресурсы
echo -e "\n${BLUE}💻 Системные Ресурсы:${NC}"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory: $(free -h | grep Mem | awk '{printf "%s / %s (%.1f%%)", $3, $2, $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{printf "%s / %s (%s)", $3, $2, $5}')"
echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"

# Проверка доступности сервисов
echo -e "\n${BLUE}🔍 Проверка Сервисов:${NC}"

# Backend Health Check
if curl -f -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API${NC}        - OK (http://localhost:5000)"
else
    echo -e "${RED}❌ Backend API${NC}        - DOWN"
fi

# Frontend Check
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend${NC}          - OK (http://localhost:3000)"
else
    echo -e "${RED}❌ Frontend${NC}          - DOWN"
fi

# Database Check
if docker-compose exec -T postgres pg_isready -U minimax_user -d minimax_ai_platform > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL${NC}        - OK"
else
    echo -e "${RED}❌ PostgreSQL${NC}        - DOWN"
fi

# Redis Check
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis${NC}             - OK"
else
    echo -e "${RED}❌ Redis${NC}             - DOWN"
fi

# Docker статистика
echo -e "\n${BLUE}📊 Docker Статистика:${NC}"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "Статистика недоступна"

# Последние логи (если есть ошибки)
echo -e "\n${BLUE}📋 Последние Ошибки в Логах:${NC}"
if docker-compose logs --tail=20 2>/dev/null | grep -i error | tail -5; then
    echo -e "${YELLOW}Найдены ошибки в логах${NC}"
else
    echo -e "${GREEN}Ошибок в логах не найдено${NC}"
fi

# Информация о дисковом пространстве
echo -e "\n${BLUE}💾 Использование Диска:${NC}"
docker system df

# Время работы системы
echo -e "\n${BLUE}⏰ Время Работы:${NC}"
echo "Система: $(uptime -p)"
echo "Docker: $(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo 'недоступен')"

# Сетевые подключения
echo -e "\n${BLUE}🌐 Сетевые Подключения:${NC}"
echo "Открытые порты:"
netstat -tlnp 2>/dev/null | grep -E ':(3000|5000|5432|6379)' || echo "Порт информация недоступна"

# Предупреждения
echo -e "\n${YELLOW}⚠️  Предупреждения:${NC}"
# Проверка использования диска
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo -e "${RED}⚠️  Высокое использование диска: ${disk_usage}%${NC}"
fi

# Проверка использования памяти
mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ $mem_usage -gt 80 ]; then
    echo -e "${RED}⚠️  Высокое использование памяти: ${mem_usage}%${NC}"
fi

# Проверка нагрузки CPU
cpu_load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
cpu_cores=$(nproc)
if (( $(echo "$cpu_load > $cpu_cores" | bc -l) )); then
    echo -e "${RED}⚠️  Высокая нагрузка CPU: $cpu_load (ядер: $cpu_cores)${NC}"
fi

echo -e "\n${BLUE}💡 Быстрые Команды:${NC}"
echo "  docker-compose logs -f           - Просмотр логов в реальном времени"
echo "  ./server-scripts/update.sh       - Обновление платформы"
echo "  docker-compose restart           - Перезапуск всех сервисов"
echo "  docker-compose down              - Остановка всех сервисов"
echo "  docker system prune -af          - Очистка неиспользуемых ресурсов"

echo -e "\n${GREEN}✅ Мониторинг завершен!${NC}"
echo "=================================================="