/**
 * socket-client.js — WebSocket Communication
 *
 * Manages Socket.IO connection to the backend.
 * Handles events bidirectionally and provides auto-reconnect.
 */

export class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 50;

    // Callbacks
    this.onConnected = null;
    this.onDisconnected = null;
    this.onStateChange = null;
    this.onNewLog = null;
    this.onChatResponse = null;
    this.onTaskUpdate = null;
    this.onTasksSync = null;
    this.onMetrics = null;
    this.onInitialData = null;
  }

  /**
   * Connect to the Socket.IO server
   */
  connect(url) {
    // Socket.IO is loaded globally from CDN
    if (typeof io === 'undefined') {
      console.error('[Socket] Socket.IO não carregado!');
      return;
    }

    const serverUrl = url || window.location.origin;
    console.log(`[Socket] Conectando a ${serverUrl}...`);

    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
    });

    this.setupEvents();
  }

  setupEvents() {
    const s = this.socket;

    s.on('connect', () => {
      console.log('[Socket] ✅ Conectado!');
      this.connected = true;
      this.reconnectAttempts = 0;
      if (this.onConnected) this.onConnected();
    });

    s.on('disconnect', (reason) => {
      console.log(`[Socket] 🔌 Desconectado: ${reason}`);
      this.connected = false;
      if (this.onDisconnected) this.onDisconnected(reason);
    });

    s.on('connect_error', (err) => {
      this.reconnectAttempts++;
      console.error(`[Socket] ❌ Erro de conexão (tentativa ${this.reconnectAttempts}):`, err.message);
    });

    // ─── Server Events ────────────────────────────────────

    s.on('connected', (data) => {
      console.log('[Socket] 📦 Dados iniciais recebidos:', {
        state: data.agentState,
        tasks: data.tasks.length,
        logs: data.logs.length,
        chat: data.chatHistory.length,
      });
      if (this.onInitialData) this.onInitialData(data);
    });

    s.on('state_change', (data) => {
      console.log(`[Socket] 🔄 Estado: ${data.state} | Room: ${data.room}`);
      if (this.onStateChange) this.onStateChange(data);
    });

    s.on('new_log', (data) => {
      if (this.onNewLog) this.onNewLog(data);
    });

    s.on('chat_response', (data) => {
      if (this.onChatResponse) this.onChatResponse(data);
    });

    s.on('task_update', (data) => {
      if (this.onTaskUpdate) this.onTaskUpdate(data);
    });

    s.on('tasks_sync', (data) => {
      if (this.onTasksSync) this.onTasksSync(data);
    });

    s.on('metrics', (data) => {
      if (this.onMetrics) this.onMetrics(data);
    });
  }

  // ─── Client Commands ──────────────────────────────────────

  sendChat(message) {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'chat',
      message,
    });
  }

  sendStop() {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'stop',
    });
  }

  createTask(title, priority = 'medium') {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'create_task',
      title,
      priority,
    });
  }

  updateTask(taskId, status) {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'update_task',
      taskId,
      status,
    });
  }

  deleteTask(taskId) {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'delete_task',
      taskId,
    });
  }

  delegateTask(taskId) {
    if (!this.connected) return;
    this.socket.emit('command', {
      type: 'delegate',
      taskId,
    });
  }

  requestSync() {
    if (!this.connected) return;
    this.socket.emit('request_sync');
  }

  // ─── State ────────────────────────────────────────────────

  isConnected() {
    return this.connected;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}
