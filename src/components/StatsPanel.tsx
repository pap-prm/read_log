import type { LogStats } from '../App';

interface StatsPanelProps {
  stats: LogStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const items = [
    { label: 'Всего строк', value: stats.total, color: 'text-gray-300', bg: 'bg-gray-700' },
    { label: 'ERROR', value: stats.errors, color: 'text-red-400', bg: 'bg-red-900/30' },
    { label: 'WARN', value: stats.warnings, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    { label: 'FATAL', value: stats.fatal, color: 'text-red-600', bg: 'bg-red-900/50' },
    { label: 'INFO', value: stats.info, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: 'DEBUG', value: stats.debug, color: 'text-gray-400', bg: 'bg-gray-800' },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-700 overflow-x-auto">
      {items.map(item => (
        <div
          key={item.label}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${item.bg} flex-shrink-0`}
        >
          <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
          <span className={`text-sm font-bold ${item.color}`}>
            {item.value.toLocaleString('ru-RU')}
          </span>
        </div>
      ))}
    </div>
  );
}
