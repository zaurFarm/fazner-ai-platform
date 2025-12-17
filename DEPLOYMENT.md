# 🚀 Развертывание Fazner AI Platform

## Быстрое развертывание на Linux сервере

### 1. Подготовка сервера

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установите Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER
# Перезайдите в систему
```

### 2. Клонирование и настройка

```bash
# Клонируйте репозиторий
git clone <your-repository-url>
cd fazner-ai-platform

# Сделайте скрипт исполняемым
chmod +x deploy.sh

# Скопируйте файл окружения
cp .env.example .env
```

### 3. Настройка переменных окружения

Отредактируйте файл `.env`:
```bash
# Добавьте ваш OpenRouter API ключ
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# Настройте домен (для продакшена)
FRONTEND_URL=https://your-domain.com

# Измените пароли администратора
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=secure-password-here
```

### 4. Развертывание

```bash
# Полное развертывание
./deploy.sh deploy

# Или используйте Docker Compose напрямую
docker-compose up --build -d
```

### 5. Проверка работы

```bash
# Проверьте статус сервисов
docker-compose ps

# Просмотрите логи
docker-compose logs -f

# Проверьте доступность
curl http://localhost:5000/health
```

## 🌐 Доступные сервисы

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **База данных:** localhost:5432
- **Redis:** localhost:6379
- **Промотей (опционально):** http://localhost:9090
- **Графана (опционально):** http://localhost:3001

## 📋 Команды управления

```bash
# Остановить сервисы
./deploy.sh stop

# Перезапустить сервисы
./deploy.sh restart

# Просмотр логов
./deploy.sh logs [service-name]

# Статус сервисов
./deploy.sh status

# Полная очистка (ОСТОРОЖНО!)
./deploy.sh clean
```

## 🔧 Мониторинг и логирование

### Просмотр логов в реальном времени:
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Проверка состояния сервисов:
```bash
docker-compose ps
docker-compose top
```

### Статистика использования ресурсов:
```bash
docker stats
```

## 🔒 Безопасность в продакшене

### 1. Настройка SSL (HTTPS)
```bash
# Установите certbot
sudo apt install certbot

# Получите SSL сертификат
sudo certbot --nginx -d your-domain.com

# Обновите .env файл
FRONTEND_URL=https://your-domain.com
```

### 2. Настройка файрвола
```bash
# Разрешите только необходимые порты
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Настройка переменных окружения
```bash
# Используйте сильные пароли
JWT_SECRET=$(openssl rand -base64 64)
SESSION_SECRET=$(openssl rand -base64 64)

# Настройте базу данных с сильным паролем
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

## 📊 Мониторинг

### Включение мониторинга:
```bash
# Запустите с профилем мониторинга
docker-compose --profile monitoring up -d

# Или добавьте в docker-compose.yml:
# profiles: ["monitoring"]
```

### Prometheus метрики:
- CPU и память использование
- HTTP запросы и ответы
- Ошибки и время ответа
- Использование AI API

### Grafana дашборды:
- Обзор системы
- Производительность API
- Статистика AI использования
- Мониторинг базы данных

## 🛠️ Устранение неполадок

### Проблемы с базой данных:
```bash
# Пересоздать базу данных
docker-compose down -v
docker-compose up -d postgres

# Проверить логи
docker-compose logs postgres
```

### Проблемы с Redis:
```bash
# Очистить кеш
docker-compose exec redis redis-cli FLUSHDB

# Проверить соединение
docker-compose exec redis redis-cli ping
```

### Проблемы с AI API:
```bash
# Проверить API ключ
curl -H "Authorization: Bearer YOUR_API_KEY" https://openrouter.ai/api/v1/models
```

### Перезапуск всех сервисов:
```bash
# Полная перезагрузка
docker-compose restart

# Пересборка и запуск
docker-compose up --build -d
```

## 📈 Масштабирование

### Горизонтальное масштабирование:
```yaml
# В docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Настройка load balancer:
```nginx
# nginx.conf
upstream backend {
    server backend:5000;
    server backend:5001;
    server backend:5002;
}
```

## 🔄 Обновление

```bash
# Остановите сервисы
./deploy.sh stop

# Обновите код
git pull origin main

# Пересоберите и запустите
./deploy.sh deploy
```

## 💡 Полезные советы

1. **Регулярные бэкапы:**
   ```bash
   # Бэкап базы данных
   docker-compose exec postgres pg_dump -U minimax_user minimax_ai_platform > backup.sql
   ```

2. **Мониторинг дискового пространства:**
   ```bash
   docker system df
   docker system prune -af
   ```

3. **Настройка логирования:**
   ```bash
   # Ограничение размера логов
   # В docker-compose.yml добавьте:
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь в правильности настроек в `.env`
3. Проверьте доступность внешних API
4. Перезапустите сервисы: `./deploy.sh restart`