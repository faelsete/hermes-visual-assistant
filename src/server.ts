import express from 'express';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LogWatcher } from './watcher.js';
import { LogParser } from './parser.js';
import { CommandHandler } from './commands.js';
import { ClientCommandSchema, STATE_ROOM_MAP } from './types.js';
import type {
  AgentState,
  AppConfig,
  LogEvent,
  Metrics,
  ServerEvents,
  ClientEvents,
} from './types.js';

// ─── Resolve paths ─────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ─── Load config ───────────────────────────────────────────────
const configPath = path.join(ROOT_DIR, 'config.json');
if (!existsSync(configPath)) {
  console.error('❌ config.json não encontrado!');
  process.exit(1);
}
const config: AppConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

// Resolve relative paths
const resolveConfigPath = (p: string): string => {
  if (p.startsWith('~')) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '/root';
    return path.resolve(p.replace('~', home));
  }
  return path.resolve(ROOT_DIR, p);
};

config.hermes_log_path = resolveConfigPath(config.hermes_log_path);
config.hermes_command_path = resolveConfigPath(config.hermes_command_path);
config.hermes_response_path = resolveConfigPath(config.hermes_response_path);

// ─── Ensure mock_logs exists for dev ───────────────────────────
if (!existsSync(config.hermes_log_path)) {
  mkdirSync(config.hermes_log_path, { recursive: true });
  console.log(`📁 Criado diretório de logs: ${config.hermes_log_path}`);
}

// ─── State ─────────────────────────────────────────────────────
let currentState: AgentState = 'idle';
const recentLogs: LogEvent[] = [];
const MAX_RECENT_LOGS = 200;
const startTime = Date.now();

// Rate limiting
const clientMessageCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // messages per minute
const RATE_WINDOW = 60_000;

// ─── Initialize modules ───────────────────────────────────────
const parser = new LogParser(config.parser_patterns);
const watcher = new LogWatcher(config.hermes_log_path);
const commands = new CommandHandler(config);

// ─── Express + Socket.IO ──────────────────────────────────────
const app = express();
const httpServer = createServer(app);
const io = new SocketServer<ClientEvents, ServerEvents>(httpServer, {
  cors: { origin: '*' },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

// Serve static files
app.use(express.static(ROOT_DIR, { index: 'index.html' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    agentState: currentState,
    logsWatched: watcher.getWatchedFileCount(),
    totalLogs: recentLogs.length,
  });
});

// ─── Rate limiter ──────────────────────────────────────────────
function checkRateLimit(socketId: string): boolean {
  const now = Date.now();
  let entry = clientMessageCounts.get(socketId);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    clientMessageCounts.set(socketId, entry);
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// ─── Metrics builder ──────────────────────────────────────────
function buildMetrics(): Metrics {
  const stats = commands.getTaskStats();
  const lastLog = recentLogs.length > 0 ? recentLogs[recentLogs.length - 1] : null;

  return {
    uptime: Math.floor((Date.now() - startTime) / 1000),
    totalLogs: parser.getLineCount(),
    tasksCompleted: stats.completed,
    tasksPending: stats.pending,
    tasksActive: stats.active,
    lastEvent: lastLog?.message ?? 'Nenhum evento ainda',
    lastEventTime: lastLog?.timestamp ?? new Date().toISOString(),
    currentState,
  };
}

// ─── Socket.IO connections ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Cliente conectado: ${socket.id}`);

  // Send initial state
  socket.emit('connected', {
    agentState: currentState,
    tasks: commands.getTasks(),
    logs: recentLogs.slice(-50),
    chatHistory: commands.getChatHistory(),
  });

  // Send metrics right away
  socket.emit('metrics', buildMetrics());

  // Handle commands
  socket.on('command', async (data) => {
    // Rate limit
    if (!checkRateLimit(socket.id)) {
      socket.emit('chat_response', {
        id: `sys_${Date.now()}`,
        role: 'system',
        content: '⚠️ Rate limit atingido. Aguarde um momento.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Validate
    const parsed = ClientCommandSchema.safeParse(data);
    if (!parsed.success) {
      console.error('[Socket] ❌ Comando inválido:', parsed.error.message);
      return;
    }

    const cmd = parsed.data;

    switch (cmd.type) {
      case 'chat': {
        const chatMsg = await commands.sendChat(cmd.message);
        io.emit('chat_response', chatMsg);

        // Simulate agent acknowledgment
        setTimeout(() => {
          const agentMsg = commands.addAgentMessage(
            `📨 Comando recebido: "${cmd.message.substring(0, 100)}"`
          );
          io.emit('chat_response', agentMsg);
        }, 500);
        break;
      }

      case 'stop': {
        await commands.sendStop();
        io.emit('chat_response', {
          id: `sys_${Date.now()}`,
          role: 'system',
          content: '🛑 Sinal de STOP enviado para Hermes',
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'create_task': {
        const task = commands.createTask(cmd.title, cmd.description, cmd.priority);
        io.emit('task_update', task);
        break;
      }

      case 'update_task': {
        const updated = commands.updateTask(cmd.taskId, { status: cmd.status });
        if (updated) io.emit('task_update', updated);
        break;
      }

      case 'delete_task': {
        commands.deleteTask(cmd.taskId);
        io.emit('tasks_sync', commands.getTasks());
        break;
      }

      case 'delegate': {
        const delegated = await commands.delegateTask(cmd.taskId);
        if (delegated) {
          io.emit('task_update', delegated);
          io.emit('chat_response', {
            id: `sys_${Date.now()}`,
            role: 'system',
            content: `🎯 Task delegada: "${delegated.title}"`,
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }
    }
  });

  socket.on('request_sync', () => {
    socket.emit('tasks_sync', commands.getTasks());
    socket.emit('metrics', buildMetrics());
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] 🔌 Cliente desconectado: ${socket.id}`);
    clientMessageCounts.delete(socket.id);
  });
});

// ─── Log watcher → events ──────────────────────────────────────
watcher.on('line', ({ line }: { filePath: string; line: string }) => {
  const event = parser.parseLine(line);
  if (!event) return;

  // Update state
  if (event.type !== currentState) {
    currentState = event.type;
    const room = STATE_ROOM_MAP[currentState] ?? 'hub';

    io.emit('state_change', {
      state: currentState,
      tool: event.tool,
      message: event.message,
      room,
    });

    console.log(`[State] ${currentState.toUpperCase()} → Room: ${room} | ${event.message.substring(0, 80)}`);
  }

  // Store log
  recentLogs.push(event);
  if (recentLogs.length > MAX_RECENT_LOGS) {
    recentLogs.shift();
  }

  io.emit('new_log', event);
});

// ─── Periodic metrics ──────────────────────────────────────────
setInterval(() => {
  io.emit('metrics', buildMetrics());
}, 5000);

// ─── Graceful shutdown ─────────────────────────────────────────
async function shutdown(): Promise<void> {
  console.log('\n🛑 Encerrando...');
  await watcher.stop();
  io.close();
  httpServer.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

// ─── Start ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  await commands.init();
  await watcher.start();

  httpServer.listen(config.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     🎮 HERMES VISUAL ASSISTANT v1.0.0       ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  🌐 http://localhost:${config.port}                  ║`);
    console.log(`║  📁 Logs: ${config.hermes_log_path.substring(0, 32).padEnd(32)}  ║`);
    console.log(`║  📋 Commands: ${config.hermes_command_path.substring(0, 28).padEnd(28)}  ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Ctrl+C para encerrar                       ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
