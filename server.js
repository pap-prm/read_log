import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загрузка конфигурации
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));

const app = express();
const PORT = config.port || 5555;

// Middleware для проверки whitelist IP
function checkWhitelist(req, res, next) {
  if (!config.whitelist.enabled) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const normalizedIp = clientIp.replace('::ffff:', '');

  const isAllowed = config.whitelist.ips.some(entry => {
    // Одиночный IP
    if (!entry.includes('/')) {
      return normalizedIp === entry;
    }
    // CIDR диапазон
    const [range, bits] = entry.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    const ipNum = ipToNumber(normalizedIp);
    const rangeNum = ipToNumber(range);
    return (ipNum & mask) === (rangeNum & mask);
  });

  if (!isAllowed) {
    console.log(`[ACCESS DENIED] IP: ${normalizedIp} - ${req.url}`);
    return res.status(403).json({ error: 'Доступ запрещён. Ваш IP не в белом списке.' });
  }

  next();
}

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

app.use(checkWhitelist);

// Отдаём статику из dist
app.use(express.static(path.join(__dirname, 'dist')));

// API: Получить список лог-файлов
app.get('/api/logs', (req, res) => {
  try {
    const logDir = config.logDirectory;
    if (!fs.existsSync(logDir)) {
      return res.status(404).json({ error: `Папка не найдена: ${logDir}` });
    }

    const files = fs.readdirSync(logDir)
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const stat = fs.statSync(path.join(logDir, f));
        return {
          name: f,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          sizeFormatted: formatBytes(stat.size)
        };
      })
      .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({ files, directory: logDir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Читать содержимое лог-файла
app.get('/api/logs/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Защита от path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Недопустимое имя файла' });
    }

    const filePath = path.join(config.logDirectory, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const page = parseInt(req.query.page) || 1;
    const linesPerPage = parseInt(req.query.lines) || config.maxLinesPerPage;
    const search = req.query.search || '';
    const level = req.query.level || '';

    const content = fs.readFileSync(filePath, 'utf-8');
    let allLines = content.split('\n');

    // Фильтрация по уровню
    if (level) {
      const levelUpper = level.toUpperCase();
      allLines = allLines.filter(line => line.toUpperCase().includes(levelUpper));
    }

    // Поиск
    if (search) {
      const searchLower = search.toLowerCase();
      allLines = allLines.filter(line => line.toLowerCase().includes(searchLower));
    }

    const totalLines = allLines.length;
    const totalPages = Math.ceil(totalLines / linesPerPage);
    const startIdx = (page - 1) * linesPerPage;
    const endIdx = startIdx + linesPerPage;
    const pageLines = allLines.slice(startIdx, endIdx);

    const stat = fs.statSync(filePath);

    res.json({
      filename,
      totalLines,
      totalPages,
      currentPage: page,
      linesPerPage,
      lines: pageLines,
      fileSize: stat.size,
      lastModified: stat.mtime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Получить последние N строк (tail)
app.get('/api/logs/:filename/tail', (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Недопустимое имя файла' });
    }

    const filePath = path.join(config.logDirectory, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const lines = parseInt(req.query.lines) || 500;
    const content = fs.readFileSync(filePath, 'utf-8');
    const allLines = content.split('\n');
    const tailLines = allLines.slice(-lines);

    res.json({
      filename,
      lines: tailLines,
      totalLines: allLines.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Статистика по лог-файлу
app.get('/api/logs/:filename/stats', (req, res) => {
  try {
    const filename = req.params.filename;
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Недопустимое имя файла' });
    }

    const filePath = path.join(config.logDirectory, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const stats = {
      total: lines.length,
      errors: 0,
      warnings: 0,
      fatal: 0,
      info: 0,
      debug: 0
    };

    lines.forEach(line => {
      const upper = line.toUpperCase();
      if (upper.includes('ERROR')) stats.errors++;
      if (upper.includes('WARN')) stats.warnings++;
      if (upper.includes('FATAL')) stats.fatal++;
      if (upper.includes('INFO')) stats.info++;
      if (upper.includes('DEBUG')) stats.debug++;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================`);
  console.log(`  Log Viewer запущен на порту ${PORT}`);
  console.log(`  Папка логов: ${config.logDirectory}`);
  console.log(`  Whitelist IP: ${config.whitelist.enabled ? 'ВКЛЮЧЁН' : 'ВЫКЛЮЧЕН'}`);
  if (config.whitelist.enabled) {
    console.log(`  Разрешённые IP: ${config.whitelist.ips.join(', ')}`);
  }
  console.log(`===========================================`);
});
