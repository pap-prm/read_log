import type { LogStats } from '../App';

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  levelFilter: string;
  setLevelFilter: (v: string) => void;
  stats: LogStats | null;
}

export function FilterBar({ search, setSearch, levelFilter, setLevelFilter, stats }: FilterBarProps) {
  const buttons = [
    {
      value: '',
      label: 'Все',
      count: stats?.total ?? 0,
      activeColor: 'bg-gray-600 text-white border-gray-400',
      inactiveColor: 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700 hover:border-gray-500',
      countColor: 'bg-gray-700 text-gray-200',
      icon: '📋',
    },
    {
      value: 'FATAL',
      label: 'FATAL',
      count: stats?.fatal ?? 0,
      activeColor: 'bg-red-900/70 text-red-100 border-red-500 shadow-red-900/50 shadow-lg',
      inactiveColor: 'bg-gray-800 text-red-400 border-red-900/50 hover:bg-red-950/50 hover:border-red-700',
      countColor: 'bg-red-950 text-red-300',
      icon: '💀',
    },
    {
      value: 'ERROR',
      label: 'ERROR',
      count: stats?.errors ?? 0,
      activeColor: 'bg-red-800/60 text-red-100 border-red-400 shadow-red-900/50 shadow-lg',
      inactiveColor: 'bg-gray-800 text-red-400 border-red-900/50 hover:bg-red-950/50 hover:border-red-700',
      countColor: 'bg-red-950 text-red-300',
      icon: '❌',
    },
    {
      value: 'WARN',
      label: 'WARN',
      count: stats?.warnings ?? 0,
      activeColor: 'bg-yellow-800/60 text-yellow-100 border-yellow-500 shadow-yellow-900/50 shadow-lg',
      inactiveColor: 'bg-gray-800 text-yellow-400 border-yellow-900/50 hover:bg-yellow-950/50 hover:border-yellow-700',
      countColor: 'bg-yellow-950 text-yellow-300',
      icon: '⚠️',
    },
    {
      value: 'INFO',
      label: 'INFO',
      count: stats?.info ?? 0,
      activeColor: 'bg-blue-800/60 text-blue-100 border-blue-500 shadow-blue-900/50 shadow-lg',
      inactiveColor: 'bg-gray-800 text-blue-400 border-blue-900/50 hover:bg-blue-950/50 hover:border-blue-700',
      countColor: 'bg-blue-950 text-blue-300',
      icon: 'ℹ️',
    },
    {
      value: 'DEBUG',
      label: 'DEBUG',
      count: stats?.debug ?? 0,
      activeColor: 'bg-gray-700 text-gray-100 border-gray-400 shadow-gray-900/50 shadow-lg',
      inactiveColor: 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:border-gray-500',
      countColor: 'bg-gray-900 text-gray-300',
      icon: '🔍',
    },
  ];

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
      {/* Панель кнопок фильтров */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold mr-1">
          Уровень:
        </span>
        {buttons.map(btn => {
          const isActive = levelFilter === btn.value;
          return (
            <button
              key={btn.value || 'all'}
              onClick={() => setLevelFilter(btn.value)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium
                transition-all duration-150 cursor-pointer
                ${isActive ? btn.activeColor : btn.inactiveColor}
              `}
            >
              <span className="text-sm">{btn.icon}</span>
              <span>{btn.label}</span>
              <span className={`
                text-xs px-1.5 py-0.5 rounded-md font-bold min-w-[2rem] text-center
                ${isActive ? 'bg-white/20 text-white' : btn.countColor}
              `}>
                {btn.count.toLocaleString('ru-RU')}
              </span>
            </button>
          );
        })}

        {/* Разделитель */}
        <div className="w-px h-6 bg-gray-600 mx-2" />

        {/* Быстрые действия */}
        {(levelFilter || search) && (
          <button
            onClick={() => {
              setLevelFilter('');
              setSearch('');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                       bg-gray-700 text-gray-300 border border-gray-600
                       hover:bg-gray-600 hover:text-white transition-colors"
          >
            <span>✕</span>
            <span>Сбросить</span>
          </button>
        )}
      </div>

      {/* Строка поиска */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Поиск по содержимому логов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg
                       text-sm text-gray-200 placeholder-gray-500
                       focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       transition-colors"
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

        {search && stats && (
          <div className="text-xs text-gray-400 whitespace-nowrap">
            Найдено совпадений
          </div>
        )}
      </div>
    </div>
  );
}
