"""
Hermes Visual Assistant — Plugin
=================================

Hooks into Hermes agent lifecycle and sends real-time events
to the Visual Assistant server via Unix domain socket.

Events sent: session_start, thinking, tool_start, tool_end,
             response, session_end

Install:
  cd hermes-visual-assistant && ./install.sh
"""

import json
import logging
import os
import socket

logger = logging.getLogger(__name__)

SOCKET_PATH = "/tmp/hermes-visual.sock"

# ─── Tool → Visual State mapping ────────────────────────────────

TOOL_STATE_MAP = {
    # Researching
    "web_search": "researching",
    "search_web": "researching",
    "read_url": "researching",
    "read_url_content": "researching",
    "browse": "researching",
    "search": "researching",
    # Coding
    "edit_file": "coding",
    "write_file": "coding",
    "create_file": "coding",
    "write_to_file": "coding",
    "replace_file_content": "coding",
    "multi_replace_file_content": "coding",
    "view_file": "coding",
    "grep_search": "coding",
    "list_dir": "coding",
    # Executing
    "run_command": "executing",
    "execute_code": "executing",
    "command_status": "executing",
    "send_command_input": "executing",
    # Social / Messaging
    "send_message": "social",
    "send_telegram": "social",
    # Thinking
    "sequentialthinking": "thinking",
    # Delegating
    "browser_subagent": "delegating",
    "spawn_agent": "delegating",
    # Screenshots / visual
    "take_screenshot": "researching",
    "generate_image": "delegating",
}


def _send(payload: dict) -> None:
    """Send event to Visual Assistant server via Unix socket."""
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(1.0)
        sock.connect(SOCKET_PATH)
        data = json.dumps(payload).encode("utf-8")
        sock.sendall(data + b"\n")
        sock.close()
    except (ConnectionRefusedError, FileNotFoundError, OSError):
        pass  # Server not running — silently ignore
    except Exception as exc:
        logger.debug("hermes-visual: send failed: %s", exc)


def _tool_to_state(tool_name: str) -> str:
    """Map a tool name to a visual state."""
    return TOOL_STATE_MAP.get(tool_name.lower(), "executing")


def _summarize_args(tool_name: str, args: dict | None) -> str:
    """Extract a short summary from tool arguments."""
    if not args or not isinstance(args, dict):
        return ""
    # Priority keys for summary
    for key in (
        "query", "Url", "url", "CommandLine", "command",
        "TargetFile", "file_path", "SearchPath", "AbsolutePath",
        "text", "Prompt",
    ):
        if key in args:
            return str(args[key])[:120]
    return ""


# ─── Lifecycle hooks ─────────────────────────────────────────────

def _on_session_start(session_id="", platform="", **kwargs):
    _send({
        "event": "session_start",
        "state": "idle",
        "session_id": session_id,
        "platform": platform or "cli",
        "message": f"Sessão iniciada ({platform or 'cli'})",
    })


def _on_pre_tool_call(tool_name="", args=None, task_id="", **kwargs):
    state = _tool_to_state(tool_name)
    summary = _summarize_args(tool_name, args)
    _send({
        "event": "tool_start",
        "state": state,
        "tool": tool_name,
        "message": summary or f"Usando {tool_name}",
        "session_id": kwargs.get("session_id", task_id),
    })


def _on_post_tool_call(tool_name="", result="", task_id="", **kwargs):
    result_str = str(result)[:100] if result else ""
    _send({
        "event": "tool_end",
        "state": _tool_to_state(tool_name),
        "tool": tool_name,
        "message": result_str or f"{tool_name} concluído",
        "session_id": kwargs.get("session_id", task_id),
    })


def _on_pre_llm_call(session_id="", user_message="", platform="", **kwargs):
    _send({
        "event": "thinking",
        "state": "thinking",
        "message": (user_message or "")[:120],
        "session_id": session_id,
        "platform": platform or "cli",
    })


def _on_post_llm_call(session_id="", assistant_response="", **kwargs):
    summary = (assistant_response or "")[:120].replace("\n", " ")
    _send({
        "event": "response",
        "state": "idle",
        "message": summary,
        "session_id": session_id,
    })


def _on_session_end(session_id="", completed=False, interrupted=False, **kwargs):
    _send({
        "event": "session_end",
        "state": "sleeping",
        "message": "Sessão encerrada",
        "session_id": session_id,
        "completed": completed,
        "interrupted": interrupted,
    })


# ─── Registration ────────────────────────────────────────────────

def register(ctx):
    """Register hooks with Hermes plugin system."""
    ctx.register_hook("on_session_start", _on_session_start)
    ctx.register_hook("pre_llm_call", _on_pre_llm_call)
    ctx.register_hook("pre_tool_call", _on_pre_tool_call)
    ctx.register_hook("post_tool_call", _on_post_tool_call)
    ctx.register_hook("post_llm_call", _on_post_llm_call)
    ctx.register_hook("on_session_end", _on_session_end)
    logger.info("hermes-visual-assistant plugin registered")
