import chokidar from 'chokidar';
import { readFile, stat } from 'node:fs/promises';
import { EventEmitter } from 'node:events';

/**
 * Watches a directory for log file changes using chokidar.
 * Emits 'line' events for each new line appended to watched files.
 * Uses tail-follow semantics: only reads NEW content added after initial scan.
 */
export class LogWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private filePositions = new Map<string, number>();
  private watchPath: string;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly DEBOUNCE_MS = 100;

  constructor(watchPath: string) {
    super();
    this.watchPath = watchPath;
  }

  async start(): Promise<void> {
    console.log(`[Watcher] 👁️  Observando: ${this.watchPath}`);

    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignoreInitial: false,
      followSymlinks: true,
      depth: 3,
      ignored: [
        /(^|[/\\])\../, // hidden files
        /node_modules/,
        /\.git/,
      ],
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher.on('add', (filePath: string) => {
      console.log(`[Watcher] 📄 Novo arquivo: ${filePath}`);
      // For existing files, jump to end (only read new content)
      this.initFilePosition(filePath);
    });

    this.watcher.on('change', (filePath: string) => {
      this.debouncedRead(filePath);
    });

    this.watcher.on('unlink', (filePath: string) => {
      console.log(`[Watcher] 🗑️  Arquivo removido: ${filePath}`);
      this.filePositions.delete(filePath);
      const timer = this.debounceTimers.get(filePath);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(filePath);
      }
    });

    this.watcher.on('error', (error: Error) => {
      console.error('[Watcher] ❌ Erro:', error.message);
      this.emit('error', error);
    });

    this.watcher.on('ready', () => {
      console.log('[Watcher] ✅ Pronto e observando mudanças');
      this.emit('ready');
    });
  }

  private async initFilePosition(filePath: string): Promise<void> {
    try {
      const fileStat = await stat(filePath);
      // Start at end of file (only read new lines from now on)
      this.filePositions.set(filePath, fileStat.size);
    } catch {
      this.filePositions.set(filePath, 0);
    }
  }

  private debouncedRead(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      void this.readNewContent(filePath);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(filePath, timer);
  }

  private async readNewContent(filePath: string): Promise<void> {
    try {
      const fileStat = await stat(filePath);
      const lastPos = this.filePositions.get(filePath) ?? 0;

      // File was truncated or recreated — reset position
      if (fileStat.size < lastPos) {
        this.filePositions.set(filePath, 0);
        return this.readNewContent(filePath);
      }

      if (fileStat.size <= lastPos) return;

      const content = await readFile(filePath, 'utf-8');
      const newContent = content.substring(lastPos);
      this.filePositions.set(filePath, fileStat.size);

      const lines = newContent.split('\n').filter((l) => l.trim().length > 0);

      for (const line of lines) {
        this.emit('line', { filePath, line: line.trim() });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Watcher] ❌ Erro lendo ${filePath}: ${msg}`);
    }
  }

  async stop(): Promise<void> {
    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[Watcher] 🛑 Parado');
    }
  }

  getWatchedFileCount(): number {
    return this.filePositions.size;
  }
}
