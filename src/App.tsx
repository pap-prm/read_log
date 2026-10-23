import { useState, useEffect, useCallback, useRef } from 'react';
import { LogViewer } from './components/LogViewer';
import { FileList } from './components/FileList';
import { Header } from './components/Header';
import { StatsPanel } from './components/StatsPanel';
import { FilterBar } from './components/FilterBar';

export interface LogFile {
  name: string;
  size: number;
  modified: string;
  sizeFormatted: string;
}

export interface LogStats {
  total: number;
  errors: number;
  warnings: number;
  fatal: number;
  info: number;
  debug: number;
}

export interface LogData {
  filename: string;
  totalLines: number;
  totalPages: number;
  currentPage: number;
  linesPerPage: number;
  lines: string[];
  fileSize: number;
  lastModified: string;
}

function App() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [logData, setLogData] = useState<LogData | null>(null);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [logDirectory, setLogDirectory] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Загрузка списка файлов
  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setFiles(data.files);
      setLogDirectory(data.directory);
      if (!selectedFile && data.files.length > 0) {
        setSelectedFile(data.files[0].name);
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  }, [selectedFile]);

  // Загрузка содержимого файла
  const loadLog = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        lines: '1000',
      });
      if (search) params.set('search', search);
      if (levelFilter) params.set('level', levelFilter);

      const res = await fetch(`/api/logs/${encodeURIComponent(selectedFile)}?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setLogData(data);
    } catch (err) {
      setError('Ошибка загрузки лога');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, page, search, levelFilter]);

  // Загрузка статистики
  const loadStats = useCallback(async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(selectedFile)}/stats`);
      const data = await res.json();
      if (!data.error) setStats(data);
    } catch (err) { /* ignore */ }
  }, [selectedFile]);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadLog();
      loadStats();
    }
  }, [selectedFile, page, search, levelFilter]);

  // Автообновление
  useEffect(() => {
    if (autoRefresh && selectedFile) {
      intervalRef.current = setInterval(() => {
        loadLog();
        loadStats();
      }, 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, selectedFile, loadLog, loadStats]);

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    setPage(1);
    setSearch('');
    setLevelFilter('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Header
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        logDirectory={logDirectory}
      />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Боковая панель - список файлов */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto flex-shrink-0">
          <FileList
            files={files}
            selectedFile={selectedFile}
            onSelect={handleFileSelect}
            onRefresh={loadFiles}
          />
        </div>

        {/* Основная область */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {error && (
            <div className="bg-red-900/50 border-b border-red-700 px-4 py-3 text-red-200">
              ⚠️ {error}
            </div>
          )}

          {stats && <StatsPanel stats={stats} />}

          <FilterBar
            search={search}
            setSearch={setSearch}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            stats={stats}
          />

          <LogViewer
            data={logData}
            loading={loading}
            page={page}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
