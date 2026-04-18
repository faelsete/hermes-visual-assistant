import chokidar from 'chokidar';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';

/**
 * Watches a directory for log file changes using chokidar.
 * Emits 'line' events for each new line appended to watched files.
 * Uses tail-follow semantics: only reads NEW content added after startup.
 *
 * Fixed for Hermes JSONL format on Linux (Contabo):
 * - Uses polling for reliability on Linux servers
 * - Pre-initializes existing file positions to EOF on startup
 * - Watches .jsonl, .json, and .log files
 */
export class LogWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private filePositions = new Map<string, number>();
  private watchPath: string;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly DEBOUNCE_MS = 200;
  private ready = false;

  constructor(watchPath: string) {
    super();
    this.watchPath = watchPath;
  }

  async start(): Promise<void> {
    console.log(`[Watcher] 👁️  Observando: ${this.watchPath}`);

    // Pre-scan: record current EOF for ALL existing files
    // so we only process NEW content from this point forward
    await this.prescanExistingFiles();

    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignoreInitial: true,  // We already pre-scanned
      followSymlinks: true,
      depth: 2,
      // Use polling — more reliable on Linux servers (inotify can miss events)
      usePolling: true,
      interval: 1000,
      binaryInterval: 2000,
      ignored: [
        /(^|[/\\])\..(?!hermes)/, // hidden files except .hermes
        /node_modules/,
        /\.git/,
      ],
    });

    this.watcher.on('add', (filePath: string) => {
      if (!this.isWatchedExtension(filePath)) return;
      console.log(`[Watcher] 📄 Novo arquivo: ${filePath}`);
      // New file — start reading from beginning
      this.filePositions.set(filePath, 0);
      // Read immediately
      void this.readNewContent(filePath);
    });

    this.watcher.on('change', (filePath: string) => {
      if (!this.isWatchedExtension(filePath)) return;
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
      this.ready = true;
      console.log(
        `[Watcher] ✅ Pronto — ${this.filePositions.size} arquivos rastreados (polling mode)`
      );
      this.emit('ready');
    });
  }

  /**
   * Pre-scan existing files and set their positions to EOF.
   * This ensures we only process NEW content from startup onward.
   */
  private async prescanExistingFiles(): Promise<void> {
    try {
      const entries = await readdir(this.watchPath, { withFileTypes: true });
      let count = 0;

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (!this.isWatchedExtension(entry.name)) continue;

        const filePath = join(this.watchPath, entry.name);
        try {
          const fileStat = await stat(filePath);
          this.filePositions.set(filePath, fileStat.size);
          count++;
        } catch {
          // File might have been deleted between readdir and stat
        }
      }

      console.log(`[Watcher] 📊 Pre-scan: ${count} arquivos existentes (posição = EOF)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Watcher] ⚠️ Erro no pre-scan: ${msg}`);
    }
  }

  /**
   * Check if file extension is one we should watch.
   */
  private isWatchedExtension(filePath: string): boolean {
    return /\.(jsonl|json|log|txt)$/i.test(filePath);
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
      const lastPos = this.filePositions.get(filePath) ?? fileStat.size;

      // File was truncated or recreated — reset position
      if (fileStat.size < lastPos) {
        this.filePositions.set(filePath, 0);
        return this.readNewContent(filePath);
      }

      // No new content
      if (fileStat.size <= lastPos) return;

      const newBytes = fileStat.size - lastPos;
      console.log(
        `[Watcher] 📖 Lendo ${newBytes} bytes novos de ${filePath.split('/').pop()}`
      );

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
