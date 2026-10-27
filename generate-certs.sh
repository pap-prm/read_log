#!/bin/bash
# Скрипт генерации SSL-сертификатов для Log Viewer
# Запуск: bash generate-certs.sh [домен/IP]

set -e

CERT_DIR="/opt/log-viewer/certs"
DOMAIN=${1:-$(hostname)}
DAYS=365

echo "=========================================="
echo "  Генерация SSL-сертификатов"
echo "=========================================="
echo ""
echo "Домен/IP: $DOMAIN"
echo "Срок действия: $DAYS дней"
echo "Директория: $CERT_DIR"
echo ""

# Создаём директорию
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

# Генерация самоподписанного сертификата
echo "Генерация сертификата..."
openssl req -x509 -newkey rsa:4096 \
  -keyout key.pem \
  -out cert.pem \
  -sha256 \
  -days $DAYS \
  -nodes \
  -subj "/C=RU/ST=Local/L=Local/O=LogViewer/CN=$DOMAIN" \
  -addext "subjectAltName=DNS:$DOMAIN,IP:$(hostname -I | awk '{print $1}'),IP:127.0.0.1"

# Устанавливаем права
chmod 600 key.pem
chmod 644 cert.pem

echo ""
echo "=========================================="
echo "  ✅ Сертификаты созданы!"
echo "=========================================="
echo ""
echo "  Сертификат: $CERT_DIR/cert.pem"
echo "  Ключ:       $CERT_DIR/key.pem"
echo ""
echo "  Срок действия: $DAYS дней"
echo "  Домен/IP: $DOMAIN"
echo ""
echo "  Для использования:"
echo "  1. Убедитесь что в config.json указано:"
echo "     \"https\": {"
echo "       \"enabled\": true,"
echo "       \"cert\": \"$CERT_DIR/cert.pem\","
echo "       \"key\": \"$CERT_DIR/key.pem\""
echo "     }"
echo ""
echo "  2. Перезапустите сервис:"
echo "     sudo systemctl restart log-viewer"
echo ""
echo "  3. Откройте в браузере:"
echo "     https://$(hostname -I | awk '{print $1}'):5556"
echo ""
echo "  ⚠️  Браузер покажет предупреждение о самоподписанном"
echo "     сертификате — это нормально для внутреннего использования."
echo "     Нажмите 'Дополнительно' → 'Перейти на сайт'"
echo "=========================================="
