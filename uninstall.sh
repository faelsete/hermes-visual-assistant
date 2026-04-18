#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Hermes Visual Assistant — Uninstall / Cleanup Script
# Remove tudo: processo, plugin, arquivos, diretórios de dados
# NÃO toca nos logs do Hermes.
# ─────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
INSTALL_DIR="/root/hermes-visual-assistant"
PLUGIN_DIR="$HERMES_HOME/plugins/hermes_visual_assistant"
COMMANDS_DIR="/tmp/hermes_commands"
SOCKET_PATH="/tmp/hermes-visual.sock"

echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   🗑️  HERMES VISUAL ASSISTANT — UNINSTALL    ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Parar processos ───────────────────────────────────────
echo -e "${YELLOW}[1/5]${NC} Parando processos..."

if pgrep -f "tsx.*server\.ts" > /dev/null 2>&1; then
  pkill -f "tsx.*server\.ts" && echo -e "  ${GREEN}✅ Servidor parado${NC}" || true
else
  echo -e "  ℹ️  Servidor não estava rodando"
fi

sleep 1

# ─── 2. Remover plugin do Hermes ──────────────────────────────
echo -e "${YELLOW}[2/5]${NC} Removendo plugin..."

if [ -d "$PLUGIN_DIR" ]; then
  rm -rf "$PLUGIN_DIR"
  echo -e "  ${GREEN}✅ Plugin removido de: $PLUGIN_DIR${NC}"
else
  echo -e "  ℹ️  Plugin não encontrado"
fi

# ─── 3. Remover Unix socket ──────────────────────────────────
echo -e "${YELLOW}[3/5]${NC} Limpando socket..."

if [ -e "$SOCKET_PATH" ]; then
  rm -f "$SOCKET_PATH"
  echo -e "  ${GREEN}✅ Socket removido: $SOCKET_PATH${NC}"
else
  echo -e "  ℹ️  Socket não encontrado"
fi

# ─── 4. Remover diretório do projeto ──────────────────────────
echo -e "${YELLOW}[4/5]${NC} Removendo projeto..."

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo -e "  ${GREEN}✅ $INSTALL_DIR removido${NC}"
else
  echo -e "  ℹ️  $INSTALL_DIR não encontrado"
fi

# ─── 5. Limpar dados temporários ──────────────────────────────
echo -e "${YELLOW}[5/5]${NC} Limpando dados temporários..."

if [ -d "$COMMANDS_DIR" ]; then
  rm -rf "$COMMANDS_DIR"
  echo -e "  ${GREEN}✅ $COMMANDS_DIR removido${NC}"
else
  echo -e "  ℹ️  $COMMANDS_DIR não encontrado"
fi

# ─── Verificar ────────────────────────────────────────────────
echo ""
REMAINING=$(pgrep -f "tsx.*server\.ts" 2>/dev/null || true)
if [ -z "$REMAINING" ]; then
  echo -e "${GREEN}✅ Nenhum processo restante${NC}"
else
  echo -e "${RED}⚠️  Processos ainda rodando: $REMAINING${NC}"
  echo -e "${RED}   Rode: kill -9 $REMAINING${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ TUDO REMOVIDO                           ║${NC}"
echo -e "${GREEN}║   Os logs do Hermes NÃO foram tocados.       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
