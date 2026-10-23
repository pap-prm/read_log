import { useMemo } from 'react';
import type { LogData } from '../App';

interface LogViewerProps {
  data: LogData | null;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

// Подсветка ключевых слов в строке лога
function highlightLine(line: string, search: string = ''): JSX.Element {
  if (!line) return <span className="text-gray-600">&nbsp;</span>;

  // Паттерны для Java-логов (log4j/logback)
  const patterns = [
    // Дата-время: 2024-10-22 16:09:33.123
    { regex: /(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}[.,]\d{3})/g, className: 'text-cyan-400' },
    // Уровни логов
    { regex: /\b(FATAL)\b/g, className: 'text-red-500 font-bold bg-red-900/30 px-1 rounded' },
    { regex: /\b(ERROR)\b/g, className: 'text-red-400 font-bold bg-red-900/20 px-1 rounded' },
    { regex: /\b(WARN|WARNING)\b/g, className: 'text-yellow-400 font-bold bg-yellow-900/20 px-1 rounded' },
    { regex: /\b(INFO)\b/g, className: 'text-blue-400' },
    { regex: /\b(DEBUG)\b/g, className: 'text-gray-400' },
    { regex: /\b(TRACE)\b/g, className: 'text-gray-500' },
    // Классы Java (com.example.package.ClassName)
    { regex: /([a-z][a-z0-9]*\.)+[A-Z][a-zA-Z0-9]*(?=\s|:|\]|$)/g, className: 'text-purple-400' },
    // Потоки [main], [thread-1]
    { regex: /\[([^\]]+)\]/g, className: 'text-green-400' },
    // Исключения
    { regex: /(Exception|Error|Throwable|OutOfMemoryError|StackOverflowError|NullPointerException|ClassNotFoundException|IOException|SQLException)/g, className: 'text-red-400 font-semibold' },
    // Stack trace
    { regex: /^\s+at\s+/g, className: 'text-gray-500' },
    // "at com.example..."
    { regex: /(at\s+[a-z][a-z0-9.]*\.[A-Z]\w+)/g, className: 'text-orange-400' },
    // Номера строк :123
    { regex: /:(\d+)\)/g, className: 'text-gray-500' },
    // URL/пути
    { regex: /(\/[a-zA-Z0-9_\-./]+)/g, className: 'text-teal-400' },
    // Числа
    { regex: /\b(\d{4,})\b/g, className: 'text-amber-400' },
  ];

  // Разбиваем строку на токены
  let result: { text: string; className: string }[] = [{ text: line, className: '' }];

  for (const pattern of patterns) {
    const newResult: { text: string; className: string }[] = [];
    for (const segment of result) {
      if (segment.className) {
        newResult.push(segment);
        continue;
      }
      const parts = segment.text.split(pattern.regex);
      const matches = segment.text.match(pattern.regex) || [];
      let idx = 0;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          newResult.push({ text: parts[i], className: '' });
        }
        if (i < matches.length) {
          newResult.push({ text: matches[i], className: pattern.className });
        }
      }
    }
    result = newResult;
  }

  // Подсветка поиска
  if (search) {
    const searchResult: { text: string; className: string }[] = [];
    for (const segment of result) {
      const searchRegex = new RegExp(`(${escapeRegex(search)})`, 'gi');
      const parts = segment.text.split(searchRegex);
      for (const part of parts) {
        if (part.toLowerCase() === search.toLowerCase()) {
          searchResult.push({ text: part, className: 'bg-yellow-400/40 text-yellow-200 font-bold underline' });
        } else {
          searchResult.push({ text: part, className: segment.className });
        }
      }
    }
    result = searchResult;
  }

  return (
    <>
      {result.map((part, i) => (
        <span key={i} className={part.className}>
          {part.text}
        </span>
      ))}
    </>
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Определяем тип строки для фонового цвета
function getLineClass(line: string): string {
  const upper = line.toUpperCase();
  if (upper.includes('FATAL')) return 'bg-red-950/40 border-l-2 border-l-red-500';
  if (upper.includes('ERROR')) return 'bg-red-950/20 border-l-2 border-l-red-400';
  if (upper.includes('WARN')) return 'bg-yellow-950/20 border-l-2 border-l-yellow-500';
  if (upper.trim().startsWith('at ')) return 'bg-gray-900/50 text-gray-500';
  if (upper.includes('Caused by:')) return 'bg-orange-950/20 border-l-2 border-l-orange-400';
  return '';
}

export function LogViewer({ data, loading, page, onPageChange }: LogViewerProps) {
  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p>Выберите лог-файл для просмотра</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Информация о файле */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800/30 border-b border-gray-700/50 text-xs text-gray-500">
        <span>
          Строк: {data.totalLines.toLocaleString('ru-RU')} | Страница {data.currentPage} из {data.totalPages}
        </span>
        <span>
          Обновлён: {new Date(data.lastModified).toLocaleString('ru-RU')}
        </span>
      </div>

      {/* Содержимое лога */}
      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="p-0">
            {data.lines.map((line, idx) => {
              const lineNum = (data.currentPage - 1) * data.linesPerPage + idx + 1;
              return (
                <div
                  key={idx}
                  className={`flex hover:bg-gray-800/50 ${getLineClass(line)}`}
                >
                  <span className="inline-block w-16 text-right pr-3 py-0.5 text-gray-600 select-none border-r border-gray-800 flex-shrink-0 sticky left-0 bg-inherit">
                    {lineNum}
                  </span>
                  <pre className="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all overflow-x-auto">
                    {highlightLine(line)}
                  </pre>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700">
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⟪ Первая
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Назад
          </button>
          <span className="text-sm text-gray-400">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= data.totalPages}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперёд →
          </button>
          <button
            onClick={() => onPageChange(data.totalPages)}
            disabled={page >= data.totalPages}
            className="px-3 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Последняя ⟫
          </button>
        </div>
      )}
    </div>
  );
}
