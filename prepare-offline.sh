#!/bin/bash
# Скрипт для подготовки офлайн-пакета для установки на сервер без интернета
# Запуск: bash prepare-offline.sh
# Результат: log-viewer-offline.tar.gz

set -e

echo "=========================================="
echo "  Подготовка офлайн-пакета Log Viewer"
echo "=========================================="

# Проверяем наличие package.json
if [ ! -f "package.json" ]; then
    echo "Ошибка: package.json не найден"
    echo "Запустите скрипт из директории проекта"
    exit 1
fi

# 1. Установка зависимостей
echo ""
echo "[1/4] Установка зависимостей..."
npm install

# 2. Сборка фронтенда
echo ""
echo "[2/4] Сборка фронтенда..."
npm run build

# 3. Проверка наличия node_modules
echo ""
echo "[3/4] Проверка файлов..."
if [ ! -d "node_modules" ]; then
    echo "Ошибка: node_modules не найден после npm install"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "Ошибка: dist не найден после npm run build"
    exit 1
fi

# 4. Создание архива
echo ""
echo "[4/4] Создание архива для офлайн-установки..."

# Создаём временную директорию
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="log-viewer-offline"
PACKAGE_DIR="$TEMP_DIR/$PACKAGE_NAME"

mkdir -p "$PACKAGE_DIR"

# Копируем необходимые файлы
echo "Копируем файлы..."
cp package.json "$PACKAGE_DIR/"
cp server.js "$PACKAGE_DIR/"
cp config.json "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/" 2>/dev/null || true
cp install.sh "$PACKAGE_DIR/"

# Копируем node_modules
echo "Копируем node_modules (это может занять время)..."
cp -r node_modules "$PACKAGE_DIR/"

# Копируем dist
echo "Копируем dist..."
cp -r dist "$PACKAGE_DIR/"

# Создаём итоговый архив
echo "Создаём архив..."
cd "$TEMP_DIR"
tar -czf "$OLDPWD/log-viewer-offline.tar.gz" "$PACKAGE_NAME"
cd "$OLDPWD"

# Удаляем временную директорию
rm -rf "$TEMP_DIR"

# Получаем размер архива
ARCHIVE_SIZE=$(du -h log-viewer-offline.tar.gz | cut -f1)

echo ""
echo "=========================================="
echo "  ✅ Офлайн-пакет готов!"
echo "=========================================="
echo ""
echo "  Файл: log-viewer-offline.tar.gz"
echo "  Размер: $ARCHIVE_SIZE"
echo ""
echo "  Инструкция по установке на сервере:"
echo ""
echo "  1. Скопируйте архив на сервер:"
echo "     scp log-viewer-offline.tar.gz user@server:/tmp/"
echo ""
echo "  2. На сервере распакуйте:"
echo "     cd /opt"
echo "     sudo tar -xzf /tmp/log-viewer-offline.tar.gz"
echo "     sudo mv log-viewer-offline log-viewer"
echo ""
echo "  3. Запустите установку:"
echo "     cd /opt/log-viewer"
echo "     sudo bash install.sh"
echo ""
echo "  Или запустите напрямую:"
echo "     cd /opt/log-viewer"
echo "     sudo node server.js"
echo ""
echo "=========================================="
