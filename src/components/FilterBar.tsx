import type { LogStats } from '../App';

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  levelFilter: string;
  setLevelFilter: (v: string) => void;
  stats: LogStats | null;
}

export function FilterBar({ search, setSearch, levelFilter, setLevelFilter, stats }: FilterBarProps) {
  const levels = [
    { value: '', label: 'Все уровни' },
    { value: 'ERROR', label: `ERROR (${stats?.errors || 0})` },
    { value: 'WARN', label: `WARN (${stats?.warnings || 0})` },
    { value: 'FATAL', label: `FATAL (${stats?.fatal || 0})` },
    { value: 'INFO', label: `INFO (${stats?.info || 0})` },
    { value: 'DEBUG', label: `DEBUG (${stats?.debug || 0})` },
  ];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Поиск по логам..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>

      <select
        value={levelFilter}
        onChange={e => setLevelFilter(e.target.value)}
        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-blue-500"
      >
        {levels.map(l => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </div>
  );
}
