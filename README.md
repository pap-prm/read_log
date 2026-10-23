# Log Viewer — Веб-сервис для просмотра лог-файлов

Веб-сервис для чтения и анализа текстовых логов Java-приложений с подсветкой синтаксиса, фильтрацией и контролем доступа по IP.

## Возможности

- 📋 Чтение лог-файлов из настраиваемой директории
- 🎨 Подсветка ключевых слов: ERROR, WARN, FATAL, INFO, DEBUG, TRACE
- 🔍 Поиск по содержимому логов
- 📊 Фильтрация по уровню логирования
- 📈 Статистика по лог-файлу (количество ошибок, предупреждений и т.д.)
- 🔄 Авто-обновление каждые 5 секунд
- 🔒 Контроль доступа по белому списку IP (одиночные адреса и CIDR-диапазоны)
- 📄 Постраничная навигация (1000 строк на страницу)
- 🐧 Поддержка формата Java-логов (log4j, logback)

---

## Инструкция по установке на RedOS 8.0.3

### 1. Установка Node.js

```bash
# Обновление системы
sudo dnf update -y

# Установка Node.js 18+ (LTS)
sudo dnf install -y nodejs npm

# Проверка версии
node --version   # должна быть >= 18
npm --version
```

Если в репозитории RedOS нет нужной версии Node.js, используйте NodeSource:

```bash
# Установка Node.js 20 через NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

### 2. Развёртывание приложения

#### Вариант А: Автоматическая установка (рекомендуется)

```bash
# Перейти в директорию проекта
cd /path/to/project

# Собрать фронтенд
npm install
npm run build

# Запустить установку
sudo bash install.sh
```

#### Вариант Б: Ручная установка

```bash
# 1. Создание директории
sudo mkdir -p /opt/log-viewer

# 2. Копирование файлов проекта
cd /path/to/project
sudo cp package.json server.js config.json /opt/log-viewer/
sudo cp -r dist /opt/log-viewer/

# 3. Установка зависимостей (ВАЖНО: сначала перейти в директорию!)
cd /opt/log-viewer
sudo npm install --omit=dev

# 4. Проверка что всё на месте
ls -la /opt/log-viewer/
# Должны быть: package.json, server.js, config.json, dist/, node_modules/
```

### 3. Настройка конфигурации

Отредактируйте файл `/opt/log-viewer/config.json`:

```json
{
  "port": 5555,
  "logDirectory": "/opt/assembly_visual/logs/",
  "logFilePattern": "*.log",
  "whitelist": {
    "enabled": true,
    "ips": [
      "127.0.0.1",
      "::1",
      "192.168.1.0/24",
      "10.0.0.0/8"
    ]
  },
  "maxLinesPerPage": 1000,
  "autoRefreshInterval": 5000
}
```

**Параметры:**
- `port` — порт, на котором будет работать сервис (5555)
- `logDirectory` — путь к папке с логами (из какой папки читать логи)
- `whitelist.enabled` — включить/выключить проверку IP
- `whitelist.ips` — список разрешённых IP:
  - Одиночные адреса: `"192.168.1.100"`
  - Диапазоны (CIDR): `"192.168.1.0/24"`, `"10.0.0.0/8"`

### 4. Настройка прав доступа

```bash
# Дать права на чтение логов
sudo useradd -r -s /bin/false logviewer
sudo usermod -a -G jenkins logviewer

# Права на папку приложения
sudo chown -R logviewer:logviewer /opt/log-viewer

# Права на папку с логами (если нужно)
sudo chmod -R g+r /opt/assembly_visual/logs/
```

### 5. Создание systemd-сервиса

Создайте файл `/etc/systemd/system/log-viewer.service`:

```bash
sudo tee /etc/systemd/system/log-viewer.service << 'EOF'
[Unit]
Description=Log Viewer Web Service
After=network.target

[Service]
Type=simple
User=logviewer
Group=logviewer
WorkingDirectory=/opt/log-viewer
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Безопасность
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/log-viewer
ReadOnlyPaths=/opt/assembly_visual/logs

[Install]
WantedBy=multi-user.target
EOF
```

### 6. Запуск сервиса

```bash
# Перезагрузка systemd
sudo systemctl daemon-reload

# Включение автозапуска
sudo systemctl enable log-viewer

# Запуск
sudo systemctl start log-viewer

# Проверка статуса
sudo systemctl status log-viewer

# Просмотр логов сервиса
sudo journalctl -u log-viewer -f
```

### 7. Настройка firewall (firewalld)

```bash
# Открыть порт 5555
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload

# Проверка
sudo firewall-cmd --list-ports
```

### 8. Проверка работы

Откройте браузер и перейдите по адресу:

```
http://<IP-сервера>:5555
```

---

## Установка БЕЗ доступа в интернет (офлайн)

### Шаг 1: Подготовка пакета на машине с интернетом

```bash
# На машине с интернетом, в директории проекта
bash prepare-offline.sh
```

Скрипт создаст файл `log-viewer-offline.tar.gz` со всеми необходимыми файлами.

### Шаг 2: Копирование на сервер без интернета

```bash
# Скопируйте архив на сервер любым способом:
# Через SCP
scp log-viewer-offline.tar.gz user@server:/tmp/

# Через rsync
rsync -avz log-viewer-offline.tar.gz user@server:/tmp/

# Через USB-флешку
cp log-viewer-offline.tar.gz /media/usb/
```

### Шаг 3: Установка на сервере

```bash
# На сервере без интернета
cd /opt
sudo tar -xzf /tmp/log-viewer-offline.tar.gz
sudo mv log-viewer-offline log-viewer
cd log-viewer
sudo bash install.sh
```

### Альтернатива: Ручная установка без скрипта

```bash
# На сервере
cd /opt
sudo tar -xzf /tmp/log-viewer-offline.tar.gz
sudo mv log-viewer-offline log-viewer
cd log-viewer

# Создание пользователя
sudo useradd -r -s /bin/false logviewer
sudo usermod -a -G jenkins logviewer

# Настройка прав
sudo chown -R logviewer:logviewer /opt/log-viewer
sudo chmod -R g+r /opt/assembly_visual/logs/

# Создание systemd-сервиса
sudo tee /etc/systemd/system/log-viewer.service << 'EOF'
[Unit]
Description=Log Viewer Web Service
After=network.target

[Service]
Type=simple
User=logviewer
Group=logviewer
WorkingDirectory=/opt/log-viewer
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/log-viewer
ReadOnlyPaths=/opt/assembly_visual/logs

[Install]
WantedBy=multi-user.target
EOF

# Запуск
sudo systemctl daemon-reload
sudo systemctl enable log-viewer
sudo systemctl start log-viewer

# Открыть порт в firewall
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload
```

### Установка Node.js без интернета

Если на сервере нет Node.js:

```bash
# На машине с интернетом скачайте бинарники
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz

# Скопируйте на сервер и распакуйте
sudo tar -xf node-v20.11.0-linux-x64.tar.xz -C /usr/local --strip-components=1

# Проверка
node --version
npm --version
```

---

## Обновление приложения

```bash
cd /opt/log-viewer

# Остановка сервиса
sudo systemctl stop log-viewer

# Обновление кода
# (скопируйте новые файлы)

# Установка новых зависимостей (если появились)
sudo npm install

# Пересборка фронтенда
sudo npm run build

# Запуск
sudo systemctl start log-viewer
```

---

## Структура проекта

```
/opt/log-viewer/
├── config.json          # Конфигурация (папка логов, порт, whitelist)
├── server.js            # Backend (Express.js)
├── package.json         # Зависимости
├── dist/                # Собранный фронтенд (после npm run build)
│   ├── index.html
│   └── assets/
├── src/                 # Исходный код фронтенда
│   ├── App.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── FileList.tsx
│   │   ├── LogViewer.tsx
│   │   ├── StatsPanel.tsx
│   │   ├── FilterBar.tsx
│   │   └── SettingsPanel.tsx
│   └── ...
└── README.md            # Эта инструкция
```

---

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/logs` | Список лог-файлов |
| GET | `/api/logs/:filename?page=1&lines=1000&search=&level=` | Содержимое файла с пагинацией |
| GET | `/api/logs/:filename/tail?lines=500` | Последние N строк |
| GET | `/api/logs/:filename/stats` | Статистика по файлу |

---

## Подсвечиваемые элементы

| Элемент | Цвет | Пример |
|---------|------|--------|
| FATAL | Красный жирный | `FATAL` |
| ERROR | Красный | `ERROR` |
| WARN/WARNING | Жёлтый | `WARN` |
| INFO | Синий | `INFO` |
| DEBUG | Серый | `DEBUG` |
| Дата-время | Голубой | `2024-10-22 16:09:33.123` |
| Java-классы | Фиолетовый | `com.example.MyClass` |
| Потоки | Зелёный | `[main]` |
| Исключения | Красный | `NullPointerException` |
| Stack trace | Тёмно-серый | `at com.example...` |

---

## Безопасность

- Whitelist IP проверяется на уровне middleware
- Поддерживаются одиночные IP и CIDR-диапазоны
- Защита от path traversal при чтении файлов
- Сервис запускается от непривилегированного пользователя
- systemd ограничивает права через `NoNewPrivileges` и `ProtectSystem`

---

## Устранение неполадок

### Ошибка: `Could not read package.json`

**Причина:** `npm install` запускается не из директории проекта.

**Решение:**
```bash
# Обязательно перейдите в директорию перед npm install
cd /opt/log-viewer
ls -la   # убедитесь что package.json на месте
npm install --omit=dev
```

### Ошибка: `EACCES: permission denied`

**Причина:** Недостаточно прав для чтения логов.

**Решение:**
```bash
# Добавить пользователя в группу jenkins
sudo usermod -a -G jenkins logviewer

# Дать права на чтение
sudo chmod -R g+r /opt/assembly_visual/logs/

# Перезапустить сервис
sudo systemctl restart log-viewer
```

### Сервис не запускается

```bash
# Проверить статус
sudo systemctl status log-viewer

# Посмотреть логи
sudo journalctl -u log-viewer --no-pager -n 50

# Проверить что порт свободен
sudo ss -tlnp | grep 5555
```

### Firewall блокирует

```bash
# Открыть порт
sudo firewall-cmd --permanent --add-port=5555/tcp
sudo firewall-cmd --reload

# Проверить
sudo firewall-cmd --list-ports
```

### Нет доступа к папке с логами

```bash
# Проверить что папка существует
ls -la /opt/assembly_visual/logs/

# Проверить права
namei -l /opt/assembly_visual/logs/

# Исправить права (если нужно)
sudo chmod 755 /opt/assembly_visual
sudo chmod 755 /opt/assembly_visual/logs
sudo chmod 644 /opt/assembly_visual/logs/*.log
```
