import type { AgentState, LogEvent } from './types.js';

/**
 * Flexible log parser that handles Hermes JSONL format.
 *
 * Hermes JSONL format:
 *   {"role":"assistant","content":"...","reasoning":"...","finish_reason":"stop","timestamp":"..."}
 *   {"role":"user","content":"...","timestamp":"..."}
 *
 * Detects agent state changes by matching tool calls, keywords in content/reasoning.
 */

interface PatternSet {
  state: AgentState;
  patterns: RegExp[];
}

const DEFAULT_PATTERNS: PatternSet[] = [
  {
    state: 'researching',
    patterns: [
      /web_search|search_web|browse|google|bing/i,
      /researching|searching|looking\s*up|pesquisando/i,
      /read_url|fetch_url|scrape|crawl/i,
      /read_url_content|search_web/i,
      /\bpesquis/i,
    ],
  },
  {
    state: 'coding',
    patterns: [
      /edit_file|write_file|create_file|write_to_file/i,
      /replace_file_content|multi_replace/i,
      /coding|writing\s*code|implementing|codando/i,
      /refactor|modify.*file/i,
      /view_file|grep_search/i,
      /\bpatch\b|aplicar.*mudanças|editando/i,
    ],
  },
  {
    state: 'executing',
    patterns: [
      /run_command|execute_code|terminal|shell/i,
      /executing|running|compiling|building|executando/i,
      /npm\s+(run|install|start)|pip\s+install/i,
      /command_status|send_command_input/i,
      /systemctl|docker|git\s+(push|pull|clone)/i,
    ],
  },
  {
    state: 'social',
    patterns: [
      /social|tweet|post|instagram|facebook/i,
      /browser.*social|open.*twitter/i,
      /telegram|whatsapp|discord/i,
      /send.*message|publish|mensagem/i,
    ],
  },
  {
    state: 'thinking',
    patterns: [
      /thinking|planning|analyzing|reasoning/i,
      /sequential.*thinking|chain.*thought/i,
      /consider|evaluate|assess|reflect/i,
      /sequentialthinking/i,
      /analisando|pensando|planejando|avaliando/i,
    ],
  },
  {
    state: 'delegating',
    patterns: [
      /delegate|assign|dispatch/i,
      /spawn.*agent|create.*sub.*task/i,
      /browser_subagent/i,
      /delegar|delegando/i,
    ],
  },
  {
    state: 'waiting',
    patterns: [
      /waiting|awaiting|pending.*input/i,
      /user.*input|confirmation.*needed/i,
      /ask_question|request.*feedback/i,
      /aguardando|esperando/i,
    ],
  },
  {
    state: 'sleeping',
    patterns: [
      /\bsleep|dormindo|ocioso|idle|finish_reason.*stop/i,
      /sessão.*encerrada|session.*ended/i,
    ],
  },
];

export class LogParser {
  private patternSets: PatternSet[];
  private lastState: AgentState = 'idle';
  private lineCount = 0;

  constructor(customPatterns?: Record<string, string[]>) {
    this.patternSets = [...DEFAULT_PATTERNS];

    if (customPatterns) {
      for (const [state, patterns] of Object.entries(customPatterns)) {
        const existing = this.patternSets.find((p) => p.state === state);
        const newRegexes = patterns.map((p) => new RegExp(p, 'i'));

        if (existing) {
          existing.patterns.push(...newRegexes);
        } else {
          this.patternSets.push({
            state: state as AgentState,
            patterns: newRegexes,
          });
        }
      }
    }
  }

  /**
   * Parse a single log line and return a LogEvent if state-relevant.
   */
  parseLine(line: string): LogEvent | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) return null;

    this.lineCount++;

    // Strategy 1: Try JSON/JSONL parsing (Hermes primary format)
    const jsonEvent = this.tryParseHermesJsonl(trimmed);
    if (jsonEvent) return jsonEvent;

    // Strategy 2: Try structured format (key=value, [brackets], etc.)
    const structuredEvent = this.tryParseStructured(trimmed);
    if (structuredEvent) return structuredEvent;

    // Strategy 3: Plain text pattern matching
    return this.tryParseText(trimmed);
  }

  /**
   * Parse Hermes JSONL format: {role, content, reasoning, finish_reason, timestamp}
   * Also handles generic JSON log formats.
   */
  private tryParseHermesJsonl(line: string): LogEvent | null {
    if (!line.startsWith('{') && !line.startsWith('[')) return null;

    try {
      const json = JSON.parse(line) as Record<string, unknown>;

      const role = json.role as string | undefined;
      const content = (json.content as string) ?? '';
      const reasoning = (json.reasoning as string) ?? '';
      const finishReason = json.finish_reason as string | undefined;
      const timestamp =
        (json.timestamp as string) ??
        (json.time as string) ??
        new Date().toISOString();

      // Direct tool field (generic JSON format)
      const directTool =
        (json.tool as string) ??
        (json.action as string) ??
        (json.function as string) ??
        (json.name as string);

      // Build full searchable text from all available fields
      const searchText = [
        directTool ?? '',
        content.substring(0, 500),
        reasoning.substring(0, 500),
      ].join(' ');

      // Determine state based on role and content
      let state: AgentState;
      let tool: string | undefined = directTool;
      let displayMessage: string;

      if (role === 'user') {
        // User sent a message to Hermes
        state = 'waiting';
        displayMessage = `📩 Mensagem do usuário recebida`;
        tool = 'user_message';
      } else if (role === 'assistant') {
        // Hermes is responding — check reasoning/content for state hints
        if (reasoning) {
          state = this.detectState(reasoning);
          // If reasoning didn't give a state, check content
          if (state === this.lastState) {
            state = this.detectState(content);
          }
        } else {
          state = this.detectState(content);
        }

        // If still no specific state, assistant responding = thinking/active
        if (state === this.lastState && finishReason !== 'stop') {
          state = 'thinking';
        }

        // Extract tool name from content if present
        if (!tool) {
          tool = this.extractToolName(searchText);
        }

        displayMessage = content.substring(0, 200);

        // If finish_reason is "stop", the response is complete
        if (finishReason === 'stop' && !tool) {
          tool = 'response_complete';
        }
      } else if (role === 'tool_call' || role === 'tool' || role === 'tool_result') {
        // Explicit tool call entries
        state = this.detectState(searchText);
        tool = directTool ?? this.extractToolName(searchText);
        displayMessage = content.substring(0, 200) || `Tool: ${tool ?? 'unknown'}`;
      } else {
        // Unknown role — generic detection
        state = this.detectState(searchText);
        tool = directTool ?? this.extractToolName(searchText);
        displayMessage = content.substring(0, 200) || line.substring(0, 200);
      }

      // Only emit if state changed or we have a tool call
      if (state !== this.lastState || tool) {
        this.lastState = state;
        return {
          timestamp,
          type: state,
          tool,
          message: displayMessage,
          metadata: json,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private tryParseStructured(line: string): LogEvent | null {
    const structuredMatch = line.match(
      /^[\[(]?(\d{4}[/-]\d{2}[/-]\d{2}[T ]\d{2}:\d{2}:\d{2}[^\])]*)[\])]?\s*[\[(]?(\w+)[\])]?\s*(.+)/
    );

    if (structuredMatch) {
      const [, timestamp, _level, rest] = structuredMatch;
      const state = this.detectState(rest);

      if (state !== this.lastState || this.isSignificant(rest)) {
        this.lastState = state;
        return {
          timestamp: timestamp ?? new Date().toISOString(),
          type: state,
          tool: this.extractToolName(rest),
          message: rest.substring(0, 300),
        };
      }
    }

    return null;
  }

  private tryParseText(line: string): LogEvent | null {
    const state = this.detectState(line);

    if (state !== this.lastState || this.isSignificant(line)) {
      this.lastState = state;
      return {
        timestamp: this.extractTimestamp(line) ?? new Date().toISOString(),
        type: state,
        tool: this.extractToolName(line),
        message: line.substring(0, 300),
      };
    }

    return null;
  }

  private detectState(text: string): AgentState {
    for (const { state, patterns } of this.patternSets) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return state;
        }
      }
    }
    return this.lastState;
  }

  private isSignificant(line: string): boolean {
    return /^[=>*#\[!]|error|warn|success|fail|start|end|complete|begin|finish|tool|invoke/i.test(
      line
    );
  }

  private extractTimestamp(line: string): string | undefined {
    const match = line.match(/\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}/);
    return match?.[0];
  }

  private extractToolName(line: string): string | undefined {
    const toolPatterns = [
      /tool[_\s]*(?:call|use|name)?[:\s=]+["']?(\w+)/i,
      /(?:using|calling|executing|invoke|invoked)\s+["']?(\w+)/i,
      /\b(web_search|search_web|run_command|edit_file|write_file|create_file|read_url|execute_code|browser_subagent|sequentialthinking|view_file|grep_search|replace_file_content|write_to_file|list_dir|command_status|send_command_input|read_url_content|multi_replace_file_content|take_screenshot|navigate_page)\b/i,
      /\[(\w+_\w+)\]/,
    ];
    for (const pattern of toolPatterns) {
      const match = line.match(pattern);
      if (match) return match[1];
    }
    return undefined;
  }

  getLastState(): AgentState {
    return this.lastState;
  }

  getLineCount(): number {
    return this.lineCount;
  }
}
