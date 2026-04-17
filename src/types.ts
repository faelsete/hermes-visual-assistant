import { z } from 'zod';

// ─── Agent States ───────────────────────────────────────────────
export const AgentStateSchema = z.enum([
  'idle',
  'thinking',
  'coding',
  'researching',
  'social',
  'executing',
  'sleeping',
  'delegating',
  'waiting',
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

// ─── Log Event ──────────────────────────────────────────────────
export const LogEventSchema = z.object({
  timestamp: z.string(),
  type: AgentStateSchema,
  tool: z.string().optional(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
});
export type LogEvent = z.infer<typeof LogEventSchema>;

// ─── Chat Message ───────────────────────────────────────────────
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'agent', 'system']),
  content: z.string(),
  timestamp: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Task ───────────────────────────────────────────────────────
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'failed']),
  priority: z.enum(['low', 'medium', 'high']),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

// ─── Client Commands ────────────────────────────────────────────
export const ClientCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('chat'),
    message: z.string().min(1).max(2000),
  }),
  z.object({
    type: z.literal('stop'),
  }),
  z.object({
    type: z.literal('delegate'),
    taskId: z.string(),
  }),
  z.object({
    type: z.literal('create_task'),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
  z.object({
    type: z.literal('update_task'),
    taskId: z.string(),
    status: z.enum(['pending', 'active', 'completed', 'failed']),
  }),
  z.object({
    type: z.literal('delete_task'),
    taskId: z.string(),
  }),
]);
export type ClientCommand = z.infer<typeof ClientCommandSchema>;

// ─── App Config ─────────────────────────────────────────────────
export interface AppConfig {
  port: number;
  hermes_log_path: string;
  hermes_command_path: string;
  hermes_response_path: string;
  parser_patterns: Record<string, string[]>;
  ui: {
    fps_cap: number;
    pixel_scale: number;
  };
}

// ─── Server → Client Events ────────────────────────────────────
export interface ServerEvents {
  state_change: (data: {
    state: AgentState;
    tool?: string;
    message: string;
    room: string;
  }) => void;
  new_log: (data: LogEvent) => void;
  chat_response: (data: ChatMessage) => void;
  task_update: (data: Task) => void;
  tasks_sync: (data: Task[]) => void;
  metrics: (data: Metrics) => void;
  connected: (data: {
    agentState: AgentState;
    tasks: Task[];
    logs: LogEvent[];
    chatHistory: ChatMessage[];
  }) => void;
}

// ─── Client → Server Events ────────────────────────────────────
export interface ClientEvents {
  command: (data: ClientCommand) => void;
  request_sync: () => void;
}

// ─── Metrics ────────────────────────────────────────────────────
export interface Metrics {
  uptime: number;
  totalLogs: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksActive: number;
  lastEvent: string;
  lastEventTime: string;
  currentState: AgentState;
}

// ─── State → Room Mapping ───────────────────────────────────────
export const STATE_ROOM_MAP: Record<AgentState, string> = {
  idle: 'hub',
  thinking: 'hub',
  coding: 'code_lab',
  researching: 'research',
  social: 'social',
  executing: 'terminal',
  sleeping: 'hub',
  delegating: 'meeting',
  waiting: 'hub',
};
