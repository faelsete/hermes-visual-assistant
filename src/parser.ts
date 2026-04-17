import type { AgentState, LogEvent } from './types.js';

/**
 * Flexible log parser that handles both JSON and plain text logs.
 * Detects agent state changes by matching tool calls and keywords.
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
      /researching|searching|looking\s*up/i,
      /read_url|fetch_url|scrape|crawl/i,
      /read_url_content|search_web/i,
    ],
  },
  {
    state: 'coding',
    patterns: [
      /edit_file|write_file|create_file|write_to_file/i,
      /replace_file_content|multi_replace/i,
      /coding|writing\s*code|implementing/i,
      /refactor|modify.*file/i,
      /view_file|grep_search/i,
    ],
  },
  {
    state: 'executing',
    patterns: [
      /run_command|execute_code|terminal|shell/i,
      /executing|running|compiling|building/i,
      /npm\s+(run|install|start)|pip\s+install/i,
      /command_status|send_command_input/i,
    ],
  },
  {
    state: 'social',
    patterns: [
      /social|tweet|post|instagram|facebook/i,
      /browser.*social|open.*twitter/i,
      /telegram|whatsapp|discord/i,
      /send.*message|publish/i,
    ],
  },
  {
    state: 'thinking',
    patterns: [
      /thinking|planning|analyzing|reasoning/i,
      /sequential.*thinking|chain.*thought/i,
      /consider|evaluate|assess|reflect/i,
      /sequentialthinking/i,
    ],
  },
  {
    state: 'delegating',
    patterns: [
      /delegate|assign|dispatch/i,
      /spawn.*agent|create.*sub.*task/i,
      /browser_subagent/i,
    ],
  },
  {
    state: 'waiting',
    patterns: [
      /waiting|awaiting|pending.*input/i,
      /user.*input|confirmation.*needed/i,
      /ask_question|request.*feedback/i,
    ],
  },
];

export class LogParser {
  private patternSets: PatternSet[];
  private lastState: AgentState = 'idle';
  private lineCount = 0;

  constructor(customPatterns?: Record<string, string[]>) {
    // Start with defaults
    this.patternSets = [...DEFAULT_PATTERNS];

    // Merge custom patterns
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

    // Strategy 1: Try JSON parsing
    const jsonEvent = this.tryParseJson(trimmed);
    if (jsonEvent) return jsonEvent;

    // Strategy 2: Try structured format (key=value, [brackets], etc.)
    const structuredEvent = this.tryParseStructured(trimmed);
    if (structuredEvent) return structuredEvent;

    // Strategy 3: Plain text pattern matching
    return this.tryParseText(trimmed);
  }

  private tryParseJson(line: string): LogEvent | null {
    if (!line.startsWith('{') && !line.startsWith('[')) return null;

    try {
      const json = JSON.parse(line) as Record<string, unknown>;

      // Common JSON log fields
      const toolName =
        (json.tool as string) ??
        (json.action as string) ??
        (json.type as string) ??
        (json.function as string) ??
        (json.name as string);

      const message =
        (json.message as string) ??
        (json.content as string) ??
        (json.text as string) ??
        line.substring(0, 200);

      const timestamp =
        (json.timestamp as string) ??
        (json.time as string) ??
        (json.ts as string) ??
        new Date().toISOString();

      const searchText = `${toolName ?? ''} ${message}`;
      const state = this.detectState(searchText);

      if (state !== this.lastState || toolName) {
        this.lastState = state;
        return {
          timestamp,
          type: state,
          tool: toolName,
          message: typeof message === 'string' ? message.substring(0, 300) : String(message),
          metadata: json,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private tryParseStructured(line: string): LogEvent | null {
    // Match patterns like: [TIMESTAMP] [LEVEL] tool_name: message
    // or: 2024-01-01T00:00:00 INFO tool_call: web_search(...)
    const structuredMatch = line.match(
      /^[\[(]?(\d{4}[/-]\d{2}[/-]\d{2}[T ]\d{2}:\d{2}:\d{2}[^\])]*)[\])]?\s*[\[(]?(\w+)[\])]?\s*(.+)/
    );

    if (structuredMatch) {
      const [, timestamp, level, rest] = structuredMatch;
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
      /\b(web_search|search_web|run_command|edit_file|write_file|create_file|read_url|execute_code|browser_subagent|sequentialthinking|view_file|grep_search|replace_file_content|write_to_file|list_dir|command_status)\b/i,
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
