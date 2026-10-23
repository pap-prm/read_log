#!/bin/bash
# Скрипт установки Log Viewer на RedOS 8.0.3
# Запуск: sudo bash install.sh

set -e

APP_NAME="log-viewer"
APP_DIR="/opt/log-viewer"
APP_USER="logviewer"
PORT=5555
LOG_DIR="/opt/assembly_visual/logs"

echo "=========================================="
echo "  Установка Log Viewer на RedOS 8.0.3"
echo "=========================================="

# Проверка root
if [ "$EUID" -ne 0 ]; then
    echo "Ошибка: Запустите скрипт с правами root (sudo)"
    exit 1
fi

# Определяем директорию где лежит скрипт
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Исходная директория: $SCRIPT_DIR"

# Проверяем наличие необходимых файлов
if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    echo "Ошибка: package.json не найден в $SCRIPT_DIR"
    echo "Убедитесь что скрипт запускается из директории проекта"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/server.js" ]; then
    echo "Ошибка: server.js не найден в $SCRIPT_DIR"
    exit 1
fi

if [ ! -d "$SCRIPT_DIR/dist" ]; then
    echo "Ошибка: Директория dist не найдена в $SCRIPT_DIR"
    echo "Сначала выполните: npm run build"
    exit 1
fi

# 1. Установка Node.js
echo ""
echo "[1/8] Установка Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js не найден. Устанавливаем..."
    dnf install -y nodejs npm || {
        echo "Node.js не найден в репозиториях. Устанавливаем через NodeSource..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
    }
fi
echo "Node.js версия: $(node --version)"
echo "npm версия: $(npm --version)"

# 2. Создание директорий
echo ""
echo "[2/8] Создание директорий..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
echo "Создана директория: $APP_DIR"
echo "Создана директория: $LOG_DIR"

# 3. Создание пользователя
echo ""
echo "[3/8] Создание системного пользователя..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false "$APP_USER"
    echo "Пользователь $APP_USER создан"
else
    echo "Пользователь $APP_USER уже существует"
fi

# 4. Копирование файлов
echo ""
echo "[4/8] Копирование файлов..."
echo "Копируем из $SCRIPT_DIR в $APP_DIR"

# Копируем основные файлы
cp -v "$SCRIPT_DIR/package.json" "$APP_DIR/"
cp -v "$SCRIPT_DIR/server.js" "$APP_DIR/"
cp -v "$SCRIPT_DIR/config.json" "$APP_DIR/"

# Копируем собранный фронтенд
cp -rv "$SCRIPT_DIR/dist" "$APP_DIR/"

# Копируем node_modules если есть
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    echo "Копируем node_modules..."
    cp -r "$SCRIPT_DIR/node_modules" "$APP_DIR/"
fi

# Копируем README
if [ -f "$SCRIPT_DIR/README.md" ]; then
    cp -v "$SCRIPT_DIR/README.md" "$APP_DIR/"
fi

echo "Файлы скопированы успешно"

# 5. Установка зависимостей
echo ""
echo "[5/8] Установка зависимостей..."
cd "$APP_DIR"
echo "Перешли в директорию: $(pwd)"

# Проверяем что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "КРИТИЧЕСКАЯ ОШИБКА: package.json не найден в $APP_DIR"
    exit 1
fi

# Устанавливаем зависимости
npm install --omit=dev

# 6. Настройка прав
echo ""
echo "[6/8] Настройка прав доступа..."
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# Добавляем пользователя в группу jenkins для чтения логов
if getent group jenkins > /dev/null 2>&1; then
    usermod -a -G jenkins "$APP_USER"
    echo "Пользователь $APP_USER добавлен в группу jenkins"
else
    echo "Группа jenkins не найдена, пропускаем"
fi

# Даём права на чтение логов
if [ -d "$LOG_DIR" ]; then
    chmod -R g+r "$LOG_DIR" 2>/dev/null || true
    echo "Права на чтение логов настроены"
fi

# 7. Создание systemd-сервиса
echo ""
echo "[7/8] Создание systemd-сервиса..."
cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=Log Viewer Web Service
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${APP_DIR}
ReadOnlyPaths=${LOG_DIR}

[Install]
WantedBy=multi-user.target
EOF

echo "Systemd сервис создан: /etc/systemd/system/${APP_NAME}.service"

# 8. Настройка firewall
echo ""
echo "[8/8] Настройка firewall..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${PORT}/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "Порт ${PORT} открыт в firewall"
else
    echo "firewalld не найден, пропускаем"
fi

# 9. Запуск сервиса
echo ""
echo "Запуск сервиса..."
systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl start ${APP_NAME}

# Ждём 2 секунды и проверяем статус
sleep 2
if systemctl is-active --quiet ${APP_NAME}; then
    echo "✅ Сервис успешно запущен"
else
    echo "⚠️ Сервис не запустился. Проверьте логи:"
    echo "   journalctl -u ${APP_NAME} -n 50"
fi

echo ""
echo "=========================================="
echo "  ✅ Установка завершена!"
echo "=========================================="
echo ""
echo "  Сервис доступен: http://$(hostname -I | awk '{print $1}'):${PORT}"
echo "  Папка логов: ${LOG_DIR}"
echo "  Конфиг: ${APP_DIR}/config.json"
echo ""
echo "  Управление:"
echo "    systemctl status ${APP_NAME}    # Статус"
echo "    systemctl restart ${APP_NAME}   # Перезапуск"
echo "    systemctl stop ${APP_NAME}      # Остановка"
echo "    journalctl -u ${APP_NAME} -f    # Логи"
echo ""
echo "  Для изменения папки логов или whitelist IP"
echo "  отредактируйте ${APP_DIR}/config.json"
echo "  и выполните: systemctl restart ${APP_NAME}"
echo "=========================================="
