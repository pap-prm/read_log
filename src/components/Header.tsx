interface HeaderProps {
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  logDirectory: string;
}

export function Header({ autoRefresh, setAutoRefresh, logDirectory }: HeaderProps) {
  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="text-2xl">📋</div>
        <div>
          <h1 className="text-lg font-bold text-white">Log Viewer</h1>
          <p className="text-xs text-gray-400">
            {logDirectory || 'Загрузка...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-gray-300">Авто-обновление</span>
          <div
            className={`w-10 h-5 rounded-full transition-colors relative ${
              autoRefresh ? 'bg-green-500' : 'bg-gray-600'
            }`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${
                autoRefresh ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </label>

        {autoRefresh && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-400">5 сек</span>
          </div>
        )}
      </div>
    </header>
  );
}
