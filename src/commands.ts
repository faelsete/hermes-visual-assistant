import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { AppConfig, Task, ChatMessage } from './types.js';

/**
 * Handles bidirectional communication with Hermes via file-based system.
 * Input commands: written as JSON files to hermes_command_path
 * Also manages task persistence in a local JSON file.
 */
export class CommandHandler {
  private inputPath: string;
  private responsePath: string;
  private tasks: Task[] = [];
  private chatHistory: ChatMessage[] = [];
  private readonly TASKS_FILE: string;
  private readonly CHAT_FILE: string;

  constructor(config: AppConfig) {
    this.inputPath = config.hermes_command_path;
    this.responsePath = config.hermes_response_path;
    this.TASKS_FILE = path.join(path.dirname(this.inputPath), 'tasks.json');
    this.CHAT_FILE = path.join(path.dirname(this.inputPath), 'chat_history.json');
  }

  async init(): Promise<void> {
    // Create command directories
    for (const dir of [this.inputPath, this.responsePath]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        console.log(`[Commands] 📁 Criado: ${dir}`);
      }
    }

    // Load persisted data
    await this.loadTasks();
    await this.loadChatHistory();
    console.log(
      `[Commands] ✅ Inicializado (${this.tasks.length} tasks, ${this.chatHistory.length} msgs)`
    );
  }

  // ─── Chat ───────────────────────────────────────────────────

  async sendChat(message: string): Promise<ChatMessage> {
    const chatMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Write command file for Hermes
    const cmdId = `chat_${Date.now()}`;
    const cmdFile = path.join(this.inputPath, `${cmdId}.cmd`);
    await writeFile(
      cmdFile,
      JSON.stringify({
        type: 'chat',
        message,
        timestamp: chatMsg.timestamp,
        id: chatMsg.id,
      }),
      'utf-8'
    );

    // Store in history
    this.chatHistory.push(chatMsg);
    await this.saveChatHistory();

    console.log(`[Commands] 💬 Chat enviado: ${cmdId}`);
    return chatMsg;
  }

  addAgentMessage(content: string): ChatMessage {
    const msg: ChatMessage = {
      id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      role: 'agent',
      content,
      timestamp: new Date().toISOString(),
    };
    this.chatHistory.push(msg);
    // Fire-and-forget save
    void this.saveChatHistory();
    return msg;
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory].slice(-100); // Last 100 messages
  }

  // ─── Stop ───────────────────────────────────────────────────

  async sendStop(): Promise<string> {
    const cmdId = `stop_${Date.now()}`;
    const cmdFile = path.join(this.inputPath, `${cmdId}.cmd`);
    await writeFile(
      cmdFile,
      JSON.stringify({
        type: 'stop',
        timestamp: new Date().toISOString(),
        id: cmdId,
      }),
      'utf-8'
    );
    console.log(`[Commands] 🛑 Stop enviado: ${cmdId}`);
    return cmdId;
  }

  // ─── Tasks ──────────────────────────────────────────────────

  createTask(title: string, description?: string, priority: 'low' | 'medium' | 'high' = 'medium'): Task {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title,
      description,
      status: 'pending',
      priority,
      createdAt: new Date().toISOString(),
    };
    this.tasks.push(task);
    void this.saveTasks();
    console.log(`[Commands] 📋 Task criada: ${task.id} — ${title}`);
    return task;
  }

  updateTask(taskId: string, updates: Partial<Pick<Task, 'status' | 'title' | 'description'>>): Task | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    if (updates.status) task.status = updates.status;
    if (updates.title) task.title = updates.title;
    if (updates.description !== undefined) task.description = updates.description;
    if (updates.status === 'completed') task.completedAt = new Date().toISOString();

    void this.saveTasks();
    return task;
  }

  deleteTask(taskId: string): boolean {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    void this.saveTasks();
    return true;
  }

  async delegateTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;

    task.status = 'active';

    // Write command file
    const cmdId = `delegate_${Date.now()}`;
    const cmdFile = path.join(this.inputPath, `${cmdId}.cmd`);
    await writeFile(
      cmdFile,
      JSON.stringify({
        type: 'delegate',
        taskId: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        timestamp: new Date().toISOString(),
        id: cmdId,
      }),
      'utf-8'
    );

    void this.saveTasks();
    console.log(`[Commands] 🎯 Task delegada: ${task.title}`);
    return task;
  }

  getTasks(): Task[] {
    return [...this.tasks];
  }

  getTaskStats(): { completed: number; pending: number; active: number } {
    return {
      completed: this.tasks.filter((t) => t.status === 'completed').length,
      pending: this.tasks.filter((t) => t.status === 'pending').length,
      active: this.tasks.filter((t) => t.status === 'active').length,
    };
  }

  // ─── Persistence ─────────────────────────────────────────────

  private async loadTasks(): Promise<void> {
    try {
      if (existsSync(this.TASKS_FILE)) {
        const data = await readFile(this.TASKS_FILE, 'utf-8');
        this.tasks = JSON.parse(data) as Task[];
      }
    } catch (error) {
      console.error('[Commands] ⚠️ Erro carregando tasks:', error);
      this.tasks = [];
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      await writeFile(this.TASKS_FILE, JSON.stringify(this.tasks, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Commands] ⚠️ Erro salvando tasks:', error);
    }
  }

  private async loadChatHistory(): Promise<void> {
    try {
      if (existsSync(this.CHAT_FILE)) {
        const data = await readFile(this.CHAT_FILE, 'utf-8');
        this.chatHistory = JSON.parse(data) as ChatMessage[];
      }
    } catch (error) {
      console.error('[Commands] ⚠️ Erro carregando chat:', error);
      this.chatHistory = [];
    }
  }

  private async saveChatHistory(): Promise<void> {
    try {
      // Keep only last 500 messages to prevent unbounded growth
      if (this.chatHistory.length > 500) {
        this.chatHistory = this.chatHistory.slice(-500);
      }
      await writeFile(this.CHAT_FILE, JSON.stringify(this.chatHistory, null, 2), 'utf-8');
    } catch (error) {
      console.error('[Commands] ⚠️ Erro salvando chat:', error);
    }
  }
}
