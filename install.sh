#!/bin/bash
# Скрипт установки Log Viewer на RedOS 8.0.3
# Поддерживает:
#   - Установку из директории разработки (копирование в /opt/log-viewer)
#   - Запуск на месте (если уже распаковано в /opt/log-viewer)
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
echo "Директория скрипта: $SCRIPT_DIR"
echo "Директория установки: $APP_DIR"

# Определяем режим работы
if [ "$SCRIPT_DIR" = "$APP_DIR" ]; then
    INSTALL_MODE="inplace"
    echo "Режим: установка на месте (файлы уже в $APP_DIR)"
else
    INSTALL_MODE="copy"
    echo "Режим: копирование из $SCRIPT_DIR в $APP_DIR"
fi

# Функция проверки наличия файла в зависимости от режима
check_file() {
    local file=$1
    if [ "$INSTALL_MODE" = "inplace" ]; then
        [ -f "$APP_DIR/$file" ]
    else
        [ -f "$SCRIPT_DIR/$file" ]
    fi
}

check_dir() {
    local dir=$1
    if [ "$INSTALL_MODE" = "inplace" ]; then
        [ -d "$APP_DIR/$dir" ]
    else
        [ -d "$SCRIPT_DIR/$dir" ]
    fi
}

# Проверяем наличие необходимых файлов
if ! check_file "package.json"; then
    echo "Ошибка: package.json не найден"
    if [ "$INSTALL_MODE" = "inplace" ]; then
        echo "Файл должен быть в $APP_DIR/package.json"
    else
        echo "Файл должен быть в $SCRIPT_DIR/package.json"
    fi
    exit 1
fi

if ! check_file "server.js"; then
    echo "Ошибка: server.js не найден"
    exit 1
fi

if ! check_dir "dist"; then
    echo "Ошибка: Директория dist не найдена"
    echo "Сначала выполните: npm run build"
    exit 1
fi

# 1. Проверка Node.js
echo ""
echo "[1/7] Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js не найден."
    echo ""
    echo "Для установки Node.js БЕЗ интернета:"
    echo "  1. Скачайте бинарники на машине с интернетом:"
    echo "     wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz"
    echo "  2. Скопируйте на сервер и распакуйте:"
    echo "     tar -xf node-v20.11.0-linux-x64.tar.xz -C /usr/local --strip-components=1"
    echo ""
    echo "Или установите из репозитория RedOS:"
    echo "  sudo dnf install nodejs npm"
    exit 1
fi
echo "Node.js версия: $(node --version)"
echo "npm версия: $(npm --version)"

# 2. Создание директорий
echo ""
echo "[2/7] Создание директорий..."
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
echo "Директория приложения: $APP_DIR"
echo "Директория логов: $LOG_DIR"

# 3. Создание пользователя
echo ""
echo "[3/7] Создание системного пользователя..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false "$APP_USER"
    echo "Пользователь $APP_USER создан"
else
    echo "Пользователь $APP_USER уже существует"
fi

# 4. Копирование файлов (только если режим copy)
echo ""
echo "[4/7] Подготовка файлов..."
if [ "$INSTALL_MODE" = "copy" ]; then
    echo "Копируем из $SCRIPT_DIR в $APP_DIR"

    # Копируем основные файлы (без ошибки если файл тот же)
    for file in package.json server.js config.json; do
        if [ -f "$SCRIPT_DIR/$file" ]; then
            cp -v "$SCRIPT_DIR/$file" "$APP_DIR/"
        fi
    done

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
else
    echo "Файлы уже на месте (режим inplace)"
fi

# Переходим в директорию приложения
cd "$APP_DIR"
echo "Рабочая директория: $(pwd)"

# Проверяем что package.json на месте
if [ ! -f "package.json" ]; then
    echo "КРИТИЧЕСКАЯ ОШИБКА: package.json не найден в $APP_DIR"
    echo "Восстановите файл из архива или создайте заново"
    exit 1
fi

# 5. Установка зависимостей
echo ""
echo "[5/7] Проверка зависимостей..."

if [ -d "node_modules" ] && [ -d "node_modules/express" ]; then
    echo "✅ node_modules уже установлены, пропускаем"
else
    echo "Пытаемся установить зависимости..."
    
    # Проверяем доступ к интернету
    if npm ping &> /dev/null; then
        echo "Интернет доступен, устанавливаем зависимости..."
        npm install --omit=dev
    else
        echo "⚠️ Интернет недоступен и node_modules отсутствуют!"
        echo ""
        echo "Для установки зависимостей БЕЗ интернета:"
        echo ""
        echo "Вариант 1: Скопируйте node_modules с другой машины"
        echo "  На машине с интернетом:"
        echo "    cd /path/to/project"
        echo "    npm install"
        echo "    tar -czf node_modules.tar.gz node_modules/"
        echo ""
        echo "  Скопируйте на сервер и распакуйте:"
        echo "    cd $APP_DIR"
        echo "    tar -xzf node_modules.tar.gz"
        echo ""
        echo "Вариант 2: Используйте prepare-offline.sh"
        echo "  На машине с интернетом:"
        echo "    bash prepare-offline.sh"
        echo "  Скопируйте log-viewer-offline.tar.gz на сервер"
        echo ""
        exit 1
    fi
fi

# 6. Генерация SSL-сертификатов
echo ""
echo "[6/8] Генерация SSL-сертификатов..."

CERT_DIR="$APP_DIR/certs"
if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ]; then
    echo "✅ SSL-сертификаты уже существуют, пропускаем"
else
    echo "Создание самоподписанного сертификата..."
    mkdir -p "$CERT_DIR"
    
    # Получаем hostname и IP
    CERT_DOMAIN=$(hostname)
    CERT_IP=$(hostname -I | awk '{print $1}')
    
    openssl req -x509 -newkey rsa:4096 \
        -keyout "$CERT_DIR/key.pem" \
        -out "$CERT_DIR/cert.pem" \
        -sha256 \
        -days 365 \
        -nodes \
        -subj "/C=RU/ST=Local/L=Local/O=LogViewer/CN=$CERT_DOMAIN" \
        -addext "subjectAltName=DNS:$CERT_DOMAIN,IP:$CERT_IP,IP:127.0.0.1" \
        2>/dev/null
    
    chmod 600 "$CERT_DIR/key.pem"
    chmod 644 "$CERT_DIR/cert.pem"
    
    echo "✅ SSL-сертификаты созданы"
    echo "   Домен: $CERT_DOMAIN"
    echo "   IP: $CERT_IP"
    echo "   Срок: 365 дней"
fi

# 7. Настройка прав
echo ""
echo "[7/8] Настройка прав доступа..."
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

# 8. Создание systemd-сервиса
echo ""
echo "[8/8] Создание systemd-сервиса..."

# Проверяем что node существует по указанному пути
NODE_PATH=$(which node)
echo "Путь к Node.js: $NODE_PATH"

cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=Log Viewer Web Service
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_PATH} server.js
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

# Настройка firewall
echo ""
echo "Настройка firewall..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${PORT}/tcp 2>/dev/null || true
    firewall-cmd --permanent --add-port=5556/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "Порты ${PORT} (HTTP) и 5556 (HTTPS) открыты в firewall"
else
    echo "firewalld не найден, пропускаем"
fi

# Запуск сервиса
echo ""
echo "Запуск сервиса..."
systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl restart ${APP_NAME}

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
echo "  🌐 HTTP:  http://$(hostname -I | awk '{print $1}'):${PORT}"
echo "  🔒 HTTPS: https://$(hostname -I | awk '{print $1}'):5556"
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
