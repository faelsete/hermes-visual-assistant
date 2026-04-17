/**
 * ui.js — UI Overlay Manager
 *
 * Manages all HTML-based UI elements:
 * - Chat modal (RPG-style)
 * - Task panel (right sidebar)
 * - Status bar (bottom)
 * - Notification toasts
 * - Room minimap
 * - Metrics overlay
 */

// ─── Chat Modal ───────────────────────────────────────────────

export class ChatModal {
  constructor() {
    this.element = document.getElementById('chat-modal');
    this.messagesEl = document.getElementById('chat-messages');
    this.inputEl = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.closeBtn = document.getElementById('chat-close');
    this.visible = false;

    this.onSendMessage = null;

    this.setupEvents();
  }

  setupEvents() {
    this.closeBtn?.addEventListener('click', () => this.hide());
    this.sendBtn?.addEventListener('click', () => this.send());
    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide();
    });
  }

  show() {
    this.visible = true;
    this.element.classList.add('visible');
    setTimeout(() => this.inputEl?.focus(), 100);
  }

  hide() {
    this.visible = false;
    this.element.classList.remove('visible');
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  send() {
    const message = this.inputEl?.value.trim();
    if (!message) return;

    if (this.onSendMessage) {
      this.onSendMessage(message);
    }

    this.inputEl.value = '';
  }

  addMessage(msg) {
    if (!this.messagesEl) return;

    const div = document.createElement('div');
    div.className = `chat-msg chat-msg-${msg.role}`;

    const roleLabels = {
      user: '👤 Você',
      agent: '🤖 Hermes',
      system: '⚙️ Sistema',
    };

    const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    div.innerHTML = `
      <span class="chat-msg-header">
        <span class="chat-msg-role">${roleLabels[msg.role] || msg.role}</span>
        <span class="chat-msg-time">${time}</span>
      </span>
      <span class="chat-msg-content">${this.escapeHtml(msg.content)}</span>
    `;

    this.messagesEl.appendChild(div);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  loadHistory(messages) {
    if (!this.messagesEl) return;
    this.messagesEl.innerHTML = '';
    for (const msg of messages) {
      this.addMessage(msg);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ─── Task Panel ───────────────────────────────────────────────

export class TaskPanel {
  constructor() {
    this.listEl = document.getElementById('task-list');
    this.addBtn = document.getElementById('task-add-btn');
    this.titleInput = document.getElementById('task-title-input');
    this.prioritySelect = document.getElementById('task-priority-select');
    this.tasks = [];

    this.onCreateTask = null;
    this.onDeleteTask = null;
    this.onDelegateTask = null;
    this.onUpdateTask = null;

    this.setupEvents();
  }

  setupEvents() {
    this.addBtn?.addEventListener('click', () => this.createTask());
    this.titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.createTask();
    });
  }

  createTask() {
    const title = this.titleInput?.value.trim();
    if (!title) return;

    const priority = this.prioritySelect?.value || 'medium';

    if (this.onCreateTask) {
      this.onCreateTask(title, priority);
    }

    this.titleInput.value = '';
  }

  updateTaskList(tasks) {
    this.tasks = tasks;
    this.renderTasks();
  }

  addOrUpdateTask(task) {
    const idx = this.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.tasks[idx] = task;
    } else {
      this.tasks.push(task);
    }
    this.renderTasks();
  }

  renderTasks() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    // Sort: active first, then pending, then completed
    const sorted = [...this.tasks].sort((a, b) => {
      const order = { active: 0, pending: 1, failed: 2, completed: 3 };
      return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

    for (const task of sorted) {
      const card = this.createTaskCard(task);
      this.listEl.appendChild(card);
    }
  }

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card task-${task.status} task-priority-${task.priority}`;
    card.draggable = true;
    card.dataset.taskId = task.id;

    const priorityIcons = { low: '🟢', medium: '🟡', high: '🔴' };
    const statusIcons = {
      pending: '⏳',
      active: '🔄',
      completed: '✅',
      failed: '❌',
    };

    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-priority">${priorityIcons[task.priority] || '⚪'}</span>
        <span class="task-title">${this.escapeHtml(task.title)}</span>
        <span class="task-status">${statusIcons[task.status] || '?'}</span>
      </div>
      <div class="task-card-actions">
        ${task.status === 'pending' ? `<button class="task-btn task-delegate-btn" title="Delegar para Hermes">🎯</button>` : ''}
        ${task.status !== 'completed' ? `<button class="task-btn task-complete-btn" title="Marcar como concluída">✓</button>` : ''}
        <button class="task-btn task-delete-btn" title="Remover">×</button>
      </div>
    `;

    // Delegate button
    const delegateBtn = card.querySelector('.task-delegate-btn');
    delegateBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onDelegateTask) this.onDelegateTask(task.id);
    });

    // Complete button
    const completeBtn = card.querySelector('.task-complete-btn');
    completeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onUpdateTask) this.onUpdateTask(task.id, 'completed');
    });

    // Delete button
    const deleteBtn = card.querySelector('.task-delete-btn');
    deleteBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onDeleteTask) this.onDeleteTask(task.id);
    });

    // Drag events
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    return card;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ─── Status Bar ───────────────────────────────────────────────

export class StatusBar {
  constructor() {
    this.stateEl = document.getElementById('status-state');
    this.uptimeEl = document.getElementById('status-uptime');
    this.logsEl = document.getElementById('status-logs');
    this.connectionEl = document.getElementById('status-connection');
    this.lastEventEl = document.getElementById('status-last-event');
  }

  updateState(state) {
    if (!this.stateEl) return;
    const stateLabels = {
      idle: '💤 Ocioso',
      thinking: '🤔 Pensando',
      coding: '💻 Codando',
      researching: '🔍 Pesquisando',
      social: '📱 Social',
      executing: '⚡ Executando',
      sleeping: '😴 Dormindo',
      delegating: '📋 Delegando',
      waiting: '⏳ Aguardando',
    };
    this.stateEl.textContent = stateLabels[state] || state;
    this.stateEl.className = `status-value state-${state}`;
  }

  updateMetrics(metrics) {
    if (this.uptimeEl) {
      this.uptimeEl.textContent = this.formatUptime(metrics.uptime);
    }
    if (this.logsEl) {
      this.logsEl.textContent = `${metrics.totalLogs} logs`;
    }
    if (this.lastEventEl) {
      this.lastEventEl.textContent = metrics.lastEvent.substring(0, 50);
    }
  }

  setConnected(connected) {
    if (!this.connectionEl) return;
    this.connectionEl.textContent = connected ? '🟢 Online' : '🔴 Offline';
    this.connectionEl.className = `status-value ${connected ? 'connected' : 'disconnected'}`;
  }

  formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }
}

// ─── Toast Notifications ──────────────────────────────────────

export class ToastManager {
  constructor() {
    this.container = document.getElementById('toast-container');
    this.queue = [];
    this.maxVisible = 3;
  }

  show(message, type = 'info', duration = 3000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      event: '🎮',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '📢'}</span>
      <span class="toast-text">${message}</span>
    `;

    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Auto-remove
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

// ─── Room Nav (Minimap) ───────────────────────────────────────

export class RoomNav {
  constructor() {
    this.container = document.getElementById('room-nav');
    this.onRoomClick = null;
  }

  update(rooms) {
    if (!this.container) return;
    this.container.innerHTML = '';

    for (const room of rooms) {
      const btn = document.createElement('button');
      btn.className = `room-nav-btn ${room.active ? 'active' : ''}`;
      btn.textContent = `${room.icon} ${room.name}`;
      btn.title = room.name;
      btn.addEventListener('click', () => {
        if (this.onRoomClick) this.onRoomClick(room.id);
      });
      this.container.appendChild(btn);
    }
  }
}

// ─── Log Viewer ───────────────────────────────────────────────

export class LogViewer {
  constructor() {
    this.container = document.getElementById('log-viewer');
    this.toggleBtn = document.getElementById('log-toggle');
    this.visible = false;
    this.maxLogs = 50;

    this.toggleBtn?.addEventListener('click', () => this.toggle());
  }

  toggle() {
    this.visible = !this.visible;
    this.container?.classList.toggle('visible', this.visible);
    if (this.toggleBtn) {
      this.toggleBtn.textContent = this.visible ? '📜 Fechar Logs' : '📜 Ver Logs';
    }
  }

  addLog(logEvent) {
    if (!this.container) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${logEvent.type}`;

    const time = new Date(logEvent.timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const stateEmoji = {
      idle: '💤', thinking: '🤔', coding: '💻',
      researching: '🔍', social: '📱', executing: '⚡',
      sleeping: '😴', delegating: '📋', waiting: '⏳',
    };

    entry.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-state">${stateEmoji[logEvent.type] || '?'}</span>
      <span class="log-tool">${logEvent.tool || '-'}</span>
      <span class="log-msg">${this.escapeHtml(logEvent.message.substring(0, 100))}</span>
    `;

    this.container.querySelector('.log-entries')?.appendChild(entry);

    // Trim old entries
    const entries = this.container.querySelectorAll('.log-entry');
    if (entries.length > this.maxLogs) {
      entries[0].remove();
    }

    // Auto-scroll
    const logEntries = this.container.querySelector('.log-entries');
    if (logEntries) {
      logEntries.scrollTop = logEntries.scrollHeight;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
