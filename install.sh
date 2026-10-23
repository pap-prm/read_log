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

# 1. Установка Node.js
echo ""
echo "[1/7] Установка Node.js..."
if ! command -v node &> /dev/null; then
    dnf install -y nodejs npm || {
        echo "Node.js не найден в репозиториях. Устанавливаем через NodeSource..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs
    }
fi
echo "Node.js версия: $(node --version)"

# 2. Создание пользователя
echo ""
echo "[2/7] Создание системного пользователя..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false "$APP_USER"
    echo "Пользователь $APP_USER создан"
else
    echo "Пользователь $APP_USER уже существует"
fi

# 3. Создание директорий
echo ""
echo "[3/7] Создание директорий..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"

# 4. Копирование файлов
echo ""
echo "[4/7] Копирование файлов..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR"/package.json "$APP_DIR/"
cp -r "$SCRIPT_DIR"/server.js "$APP_DIR/"
cp -r "$SCRIPT_DIR"/config.json "$APP_DIR/"
cp -r "$SCRIPT_DIR"/dist "$APP_DIR/"
cp -r "$SCRIPT_DIR"/node_modules "$APP_DIR/" 2>/dev/null || true

# 5. Установка зависимостей
echo ""
echo "[5/7] Установка зависимостей..."
cd "$APP_DIR"
npm install --production 2>/dev/null || npm install

# 6. Настройка прав
echo ""
echo "[6/7] Настройка прав доступа..."
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"
# Добавляем пользователя в группу jenkins для чтения логов
usermod -a -G jenkins "$APP_USER" 2>/dev/null || true
chmod -R g+r "$LOG_DIR" 2>/dev/null || true

# 7. Создание systemd-сервиса
echo ""
echo "[7/7] Создание systemd-сервиса..."
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

# 8. Настройка firewall
echo ""
echo "Настройка firewall..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${PORT}/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "Порт ${PORT} открыт в firewall"
fi

# 9. Запуск сервиса
echo ""
echo "Запуск сервиса..."
systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl start ${APP_NAME}

echo ""
echo "=========================================="
echo "  Установка завершена!"
echo "=========================================="
echo ""
echo "  Сервис доступен: http://$(hostname -I | awk '{print $1}'):${PORT}"
echo "  Папка логов: ${LOG_DIR}"
echo "  Конфиг: ${APP_DIR}/config.json"
echo ""
echo "  Управление:"
echo "    systemctl status ${APP_NAME}"
echo "    systemctl restart ${APP_NAME}"
echo "    systemctl stop ${APP_NAME}"
echo "    journalctl -u ${APP_NAME} -f"
echo ""
echo "  Для изменения папки логов или whitelist IP"
echo "  отредактируйте ${APP_DIR}/config.json"
echo "  и выполните: systemctl restart ${APP_NAME}"
echo "=========================================="
