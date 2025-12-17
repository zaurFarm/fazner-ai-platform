# 🖥️ Развертывание на собственном сервере через SSH/FTP

## 📋 Подготовка сервера

### Системные требования:
- **RAM:** 4-8 GB
- **CPU:** 2-4 ядра
- **Storage:** 50+ GB SSD
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Доступ:** SSH (порт 22), FTP (порт 21), HTTP (порт 80), HTTPS (порт 443)

---

## 🚀 ШАГ 1: Подготовка сервера

### 1.1 Обновление системы
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.2 Установка Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 1.3 Установка Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 1.4 Установка дополнительных пакетов
```bash
# Ubuntu/Debian
sudo apt install -y git curl wget unzip htop nano

# CentOS/RHEL
sudo yum install -y git curl wget unzip htop nano
```

### 1.5 Настройка файрвола (опционально)
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 21/tcp    # FTP
sudo ufw allow 20/tcp    # FTP Data
sudo ufw allow 40000-40099/tcp  # FTP Passive
sudo ufw enable

# CentOS/RHEL (Firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ftp
sudo firewall-cmd --permanent --add-port=40000-40099/tcp
sudo firewall-cmd --reload
```

---

## 🚀 ШАГ 2: Настройка FTP сервера

### 2.1 Установка vsftpd
```bash
# Ubuntu/Debian
sudo apt install -y vsftpd

# CentOS/RHEL
sudo yum install -y vsftpd
```

### 2.2 Настройка vsftpd
```bash
sudo nano /etc/vsftpd.conf
```

**Добавьте в конец файла:**
```conf
# Разрешить локальных пользователей
local_enable=YES
write_enable=YES
local_umask=022
chroot_local_user=YES
chroot_list_enable=NO
allow_writeable_chroot=YES

# Пассивный режим для FTP
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=40099

# Логирование
xferlog_enable=YES
xferlog_std_format=YES
xferlog_file=/var/log/vsftpd.log

# Безопасность
userlist_enable=YES
userlist_file=/etc/vsftpd.userlist
userlist_deny=NO
```

### 2.3 Создание пользователя для FTP
```bash
# Создайте пользователя
sudo useradd -m -s /bin/bash minimax
sudo passwd minimax

# Создайте директорию для проектов
sudo mkdir -p /home/minimax/fazner-ai-platform
sudo chown minimax:minimax /home/minimax/fazner-ai-platform

# Добавьте в список разрешенных пользователей
echo "minimax" | sudo tee /etc/vsftpd.userlist
```

### 2.4 Запуск vsftpd
```bash
sudo systemctl enable vsftpd
sudo systemctl start vsftpd
sudo systemctl status vsftpd
```

---

## 🚀 ШАГ 3: Загрузка проекта через FTP

### 3.1 Подключение к FTP
**Используйте FTP клиент (FileZilla, WinSCP):**
- **Хост:** IP вашего сервера
- **Порт:** 21
- **Пользователь:** minimax
- **Пароль:** пароль который установили
- **Протокол:** FTP (не SFTP)

### 3.2 Загрузка файлов
1. Подключитесь к серверу
2. Перейдите в папку `/home/minimax/fazner-ai-platform`
3. Загрузите все файлы проекта

**Структура на сервере:**
```
/home/minimax/fazner-ai-platform/
├── frontend/
├── backend/
├── docker-compose.yml
├── deploy.sh
├── .env.example
└── README.md
```

---

## 🚀 ШАГ 4: Настройка развертывания

### 4.1 Подключение к серверу через SSH
```bash
# Подключение к серверу
ssh minimax@IP_ВАШЕГО_СЕРВЕРА

# Переход в папку проекта
cd /home/minimax/fazner-ai-platform
```

### 4.2 Настройка переменных окружения
```bash
# Создайте .env файл
cp .env.example .env

# Отредактируйте
nano .env
```

**Настройте в .env:**
```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://ВАШ-IP-СЕРВЕРА

# База данных (используем встроенные контейнеры)
DATABASE_URL=postgresql://minimax_user:minimax_password@postgres:5432/minimax_ai_platform

# Redis
REDIS_URL=redis://:redis_password@redis:6379

# Секреты (сгенерируйте свои)
JWT_SECRET=ВАШ_СГЕНЕРИРОВАННЫЙ_JWT_СЕКРЕТ
SESSION_SECRET=ВАШ_СГЕНЕРИРОВАННЫЙ_SESSION_СЕКРЕТ

# AI API
OPENROUTER_API_KEY=ваш-openrouter-api-ключ

# Администратор
ADMIN_EMAIL=admin@ваш-домен.com
ADMIN_PASSWORD=безопасный_пароль_админа
```

### 4.3 Генерация секретов
```bash
# Генерация безопасных секретов
openssl rand -base64 32
```

---

## 🚀 ШАГ 5: Развертывание

### 5.1 Сделайте скрипт исполняемым
```bash
chmod +x deploy.sh
```

### 5.2 Запуск развертывания
```bash
./deploy.sh deploy
```

### 5.3 Проверка работы
```bash
# Проверьте статус контейнеров
docker-compose ps

# Проверьте логи
docker-compose logs -f
```

### 5.4 Откройте в браузере
- **Сайт:** http://IP_ВАШЕГО_СЕРВЕРА:3000
- **API:** http://IP_ВАШЕГО_СЕРВЕРА:5000

---

## 🔄 ШАГ 6: Настройка автоматических обновлений

### 6.1 Создание скрипта обновления
```bash
nano update-platform.sh
```

**Содержимое файла:**
```bash
#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Starting platform update..."

# Остановка текущих сервисов
echo -e "${YELLOW}[INFO]${NC} Stopping services..."
docker-compose down

# Обновление кода (если используется git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}[INFO]${NC} Pulling latest changes..."
    git pull origin main
fi

# Пересборка образов
echo -e "${YELLOW}[INFO]${NC} Rebuilding images..."
docker-compose build --no-cache

# Запуск сервисов
echo -e "${YELLOW}[INFO]${NC} Starting services..."
docker-compose up -d

# Проверка здоровья
echo -e "${YELLOW}[INFO]${NC} Checking health..."
sleep 10
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}[SUCCESS]${NC} Platform updated successfully!"
else
    echo -e "${RED}[ERROR]${NC} Platform health check failed!"
fi

echo -e "${GREEN}[DONE]${NC} Update completed!"
```

### 6.2 Сделайте скрипт исполняемым
```bash
chmod +x update-platform.sh
```

---

## 🚀 ШАГ 7: Настройка Nginx (рекомендуется)

### 7.1 Установка Nginx
```bash
sudo apt install -y nginx
```

### 7.2 Создание конфигурации
```bash
sudo nano /etc/nginx/sites-available/fazner-ai-platform
```

**Конфигурация Nginx:**
```nginx
server {
    listen 80;
    server_name ВАШ-ДОМЕН.com www.ВАШ-ДОМЕН.com;
    
    # Frontend (React)
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 7.3 Включение сайта
```bash
sudo ln -s /etc/nginx/sites-available/fazner-ai-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7.4 Настройка SSL (Let's Encrypt)
```bash
# Установка certbot
sudo apt install -y certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d ВАШ-ДОМЕН.com -d www.ВАШ-ДОМЕН.com

# Автообновление
sudo crontab -e
# Добавьте: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔄 ШАГ 8: Автоматизация обновлений

### 8.1 Создание скрипта для FTP обновлений
```bash
nano ftp-update.sh
```

**Содержимое:**
```bash
#!/bin/bash

# Скрипт для обновления через FTP
# Использование: ./ftp-update.sh

echo "=== Fazner AI Platform FTP Update ==="
echo "1. Upload new files via FTP to /home/minimax/fazner-ai-platform/"
echo "2. Run this script to apply updates"
echo ""
read -p "Press Enter when ready to update..."

cd /home/minimax/fazner-ai-platform

# Остановка сервисов
echo "Stopping services..."
docker-compose down

# Очистка старых образов (опционально)
read -p "Clean old Docker images? (y/N): " clean_images
if [[ $clean_images =~ ^[Yy]$ ]]; then
    echo "Cleaning old images..."
    docker system prune -af
fi

# Пересборка и запуск
echo "Building and starting..."
docker-compose up --build -d

# Проверка
echo "Checking health..."
sleep 15
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Update successful!"
    echo "🌐 Site: http://$(curl -s ifconfig.me):3000"
    echo "🔌 API: http://$(curl -s ifconfig.me):5000"
else
    echo "❌ Update failed! Check logs:"
    docker-compose logs --tail=50
fi
```

### 8.2 Создание мониторинга
```bash
nano monitor.sh
```

**Скрипт мониторинга:**
```bash
#!/bin/bash

# Мониторинг состояния платформы

echo "=== Fazner AI Platform Status ==="
echo "Date: $(date)"
echo ""

# Проверка Docker контейнеров
echo "Docker Containers:"
docker-compose ps
echo ""

# Проверка ресурсов
echo "System Resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{printf "%s", $5}')"
echo ""

# Проверка доступности
echo "Services Health:"
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend API: OK"
else
    echo "❌ Backend API: DOWN"
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: DOWN"
fi

# Логи ошибок
echo ""
echo "Recent Errors:"
docker-compose logs --tail=10 | grep -i error
```

---

## 🛠️ Команды для управления

### Основные команды:
```bash
# Статус сервисов
./deploy.sh status

# Просмотр логов
./deploy.sh logs

# Перезапуск
./deploy.sh restart

# Остановка
./deploy.sh stop

# Обновление кода
./update-platform.sh

# Обновление через FTP
./ftp-update.sh

# Мониторинг
./monitor.sh

# Обновление через Git (если используется)
git pull origin main && ./deploy.sh deploy
```

### FTP обновления (пошагово):
1. **Загрузите новые файлы** через FTP клиент в папку `/home/minimax/fazner-ai-platform/`
2. **Подключитесь к серверу:** `ssh minimax@IP-СЕРВЕРА`
3. **Запустите обновление:** `./ftp-update.sh`
4. **Проверьте результат:** `./monitor.sh`

---

## 🔧 Устранение неполадок

### Проблема: Контейнеры не запускаются
```bash
# Проверьте логи
docker-compose logs

# Проверьте переменные окружения
cat .env

# Пересоздайте контейнеры
docker-compose down -v
docker-compose up --build -d
```

### Проблема: Ошибки базы данных
```bash
# Пересоздание базы данных
docker-compose down -v
docker-compose up -d postgres
# Подождите 30 секунд
docker-compose up -d
```

### Проблема: Недостаточно места
```bash
# Очистка Docker
docker system prune -af

# Очистка логов
sudo journalctl --vacuum-time=7d
```

---

## 📊 Схема развертывания:

```
Ваш компьютер → FTP/SFTP → Сервер → Docker → Работающий сайт
                              ↓
                    Автоматическое обновление при загрузке новых файлов!
```

## 💡 Советы:

1. **Всегда делайте бэкапы** перед обновлениями
2. **Тестируйте локально** перед загрузкой на сервер
3. **Используйте понятные имена файлов** при FTP загрузке
4. **Мониторьте ресурсы сервера** регулярно
5. **Настройте мониторинг** для отслеживания работы

**🎉 Теперь у вас есть полностью автономное развертывание на собственном сервере!**