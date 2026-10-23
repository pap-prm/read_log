# Краткая инструкция по офлайн-установке

## На машине с интернетом

```bash
# 1. Перейти в директорию проекта
cd /path/to/project

# 2. Запустить скрипт подготовки
bash prepare-offline.sh

# 3. Скопировать архив на сервер
scp log-viewer-offline.tar.gz user@server:/tmp/
```

## На сервере без интернета

```bash
# 1. Распаковать архив
cd /opt
sudo tar -xzf /tmp/log-viewer-offline.tar.gz
sudo mv log-viewer-offline log-viewer

# 2. Запустить установку
cd log-viewer
sudo bash install.sh

# 3. Проверить работу
curl http://localhost:5555
```

## Если нет Node.js на сервере

```bash
# На машине с интернетом
wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz
scp node-v20.11.0-linux-x64.tar.xz user@server:/tmp/

# На сервере
sudo tar -xf /tmp/node-v20.11.0-linux-x64.tar.xz -C /usr/local --strip-components=1
node --version
```

## Быстрая проверка

```bash
# Статус сервиса
sudo systemctl status log-viewer

# Логи
sudo journalctl -u log-viewer -f

# Открыть в браузере
http://<IP-сервера>:5555
```

## Управление

```bash
sudo systemctl start log-viewer    # Запуск
sudo systemctl stop log-viewer     # Остановка
sudo systemctl restart log-viewer  # Перезапуск
sudo systemctl status log-viewer   # Статус
```
