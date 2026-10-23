import type { LogFile } from '../App';

interface FileListProps {
  files: LogFile[];
  selectedFile: string;
  onSelect: (name: string) => void;
  onRefresh: () => void;
}

export function FileList({ files, selectedFile, onSelect, onRefresh }: FileListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-300 uppercase tracking-wider">
          Лог-файлы
        </h2>
        <button
          onClick={onRefresh}
          className="text-gray-400 hover:text-white transition-colors p-1"
          title="Обновить список"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            Нет лог-файлов
          </div>
        ) : (
          files.map(file => (
            <button
              key={file.name}
              onClick={() => onSelect(file.name)}
              className={`w-full text-left px-4 py-3 border-b border-gray-700/50 transition-colors ${
                selectedFile === file.name
                  ? 'bg-blue-900/30 border-l-2 border-l-blue-400'
                  : 'hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {file.sizeFormatted} • {new Date(file.modified).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        {files.length} файл(ов)
      </div>
    </div>
  );
}
