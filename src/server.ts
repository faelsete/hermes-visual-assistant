import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer, type Socket as NetSocket } from 'node:net';
import { Server as SocketServer } from 'socket.io';
import { readFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

config.hermes_command_path = resolveConfigPath(config.hermes_command_path);
config.hermes_response_path = resolveConfigPath(config.hermes_response_path);

// ─── Unix socket path ──────────────────────────────────────────
const SOCKET_PATH = '/tmp/hermes-visual.sock';

// ─── State ─────────────────────────────────────────────────────
let currentState: AgentState = 'idle';
const recentLogs: LogEvent[] = [];
const MAX_RECENT_LOGS = 200;
const startTime = Date.now();
let pluginEventsReceived = 0;

// Rate limiting
const clientMessageCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000;

// ─── Initialize modules ───────────────────────────────────────
const commands = new CommandHandler(config);

// ─── Express + Socket.IO ──────────────────────────────────────
const app = express();
const httpServer = createHttpServer(app);
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
    pluginEvents: pluginEventsReceived,
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
    totalLogs: pluginEventsReceived,
    tasksCompleted: stats.completed,
    tasksPending: stats.pending,
    tasksActive: stats.active,
    lastEvent: lastLog?.message ?? 'Nenhum evento ainda',
    lastEventTime: lastLog?.timestamp ?? new Date().toISOString(),
    currentState,
  };
}

// ─── Process plugin event ──────────────────────────────────────
function processPluginEvent(payload: Record<string, unknown>): void {
  pluginEventsReceived++;

  const state = (payload.state as AgentState) ?? 'idle';
  const tool = (payload.tool as string) ?? undefined;
  const message = (payload.message as string) ?? '';
  const eventType = (payload.event as string) ?? 'unknown';
  const sessionId = (payload.session_id as string) ?? '';

  const logEvent: LogEvent = {
    timestamp: new Date().toISOString(),
    type: state,
    tool,
    message: message.substring(0, 300),
    metadata: { eventType, sessionId },
  };

  // Store log
  recentLogs.push(logEvent);
  if (recentLogs.length > MAX_RECENT_LOGS) {
    recentLogs.shift();
  }

  // Emit log to all clients
  io.emit('new_log', logEvent);

  // State change → room navigation
  if (state !== currentState) {
    currentState = state;
    const room = STATE_ROOM_MAP[currentState] ?? 'hub';

    io.emit('state_change', {
      state: currentState,
      tool,
      message,
      room,
    });

    console.log(
      `[Plugin] ${eventType} → ${currentState.toUpperCase()} → ${room} | ${message.substring(0, 80)}`
    );
  } else {
    // Same state but new activity — log it
    console.log(
      `[Plugin] ${eventType} | ${tool ?? ''} | ${message.substring(0, 60)}`
    );
  }

  // Update metrics for all clients
  io.emit('metrics', buildMetrics());
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

  socket.emit('metrics', buildMetrics());

  // Handle commands
  socket.on('command', async (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('chat_response', {
        id: `sys_${Date.now()}`,
        role: 'system',
        content: '⚠️ Rate limit atingido. Aguarde um momento.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

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

// ─── Unix Domain Socket (receives events from Hermes plugin) ──
function startUnixSocket(): void {
  // Clean up stale socket file
  if (existsSync(SOCKET_PATH)) {
    try {
      unlinkSync(SOCKET_PATH);
    } catch {
      // ignore
    }
  }

  const unixServer = createNetServer((conn: NetSocket) => {
    let buffer = '';

    conn.on('data', (chunk) => {
      buffer += chunk.toString();
    });

    conn.on('end', () => {
      for (const line of buffer.split('\n').filter(Boolean)) {
        try {
          const payload = JSON.parse(line) as Record<string, unknown>;
          processPluginEvent(payload);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Unix] ❌ JSON parse error: ${msg}`);
        }
      }
    });

    conn.on('error', (err) => {
      console.error(`[Unix] ❌ Connection error: ${err.message}`);
    });
  });

  unixServer.listen(SOCKET_PATH, () => {
    console.log(`[Unix] 🔌 Ouvindo em: ${SOCKET_PATH}`);
  });

  unixServer.on('error', (err) => {
    console.error(`[Unix] ❌ Server error: ${err.message}`);
  });

  // Cleanup on exit
  const cleanup = () => {
    if (existsSync(SOCKET_PATH)) {
      try {
        unlinkSync(SOCKET_PATH);
      } catch {
        // ignore
      }
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
}

// ─── Periodic metrics ──────────────────────────────────────────
setInterval(() => {
  io.emit('metrics', buildMetrics());
}, 5000);

// ─── Start ─────────────────────────────────────────────────────
async function main(): Promise<void> {
  await commands.init();

  // Start Unix socket for Hermes plugin events
  startUnixSocket();

  httpServer.listen(config.port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     🎮 HERMES VISUAL ASSISTANT v2.0.0       ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  🌐 http://localhost:${config.port}                  ║`);
    console.log(`║  🔌 Plugin: ${SOCKET_PATH.padEnd(30)}  ║`);
    console.log('║  📡 Modo: Plugin (real-time hooks)           ║');
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
