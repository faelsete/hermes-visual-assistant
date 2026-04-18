#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Hermes Visual Assistant — Uninstall / Cleanup Script
# Remove tudo: processo, arquivos, diretórios de dados
# ─────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="/root/hermes-visual-assistant"
COMMANDS_DIR="/tmp/hermes_commands"
DATA_DIR="/tmp/hermes_visual_data"

echo -e "${YELLOW}╔══════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   🗑️  HERMES VISUAL ASSISTANT — UNINSTALL    ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. Parar processos ───────────────────────────────────────
echo -e "${YELLOW}[1/4]${NC} Parando processos..."

if pgrep -f "tsx.*server\.ts" > /dev/null 2>&1; then
  pkill -f "tsx.*server\.ts" && echo -e "  ${GREEN}✅ Servidor parado${NC}" || true
else
  echo -e "  ℹ️  Servidor não estava rodando"
fi

if pgrep -f "hermes-visual-assistant.*npm" > /dev/null 2>&1; then
  pkill -f "hermes-visual-assistant.*npm" && echo -e "  ${GREEN}✅ npm process parado${NC}" || true
fi

sleep 1

# ─── 2. Remover diretório do projeto ──────────────────────────
echo -e "${YELLOW}[2/4]${NC} Removendo projeto..."

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo -e "  ${GREEN}✅ $INSTALL_DIR removido${NC}"
else
  echo -e "  ℹ️  $INSTALL_DIR não encontrado"
fi

# ─── 3. Limpar diretórios de dados temporários ────────────────
echo -e "${YELLOW}[3/4]${NC} Limpando dados temporários..."

if [ -d "$COMMANDS_DIR" ]; then
  rm -rf "$COMMANDS_DIR"
  echo -e "  ${GREEN}✅ $COMMANDS_DIR removido${NC}"
else
  echo -e "  ℹ️  $COMMANDS_DIR não encontrado"
fi

if [ -d "$DATA_DIR" ]; then
  rm -rf "$DATA_DIR"
  echo -e "  ${GREEN}✅ $DATA_DIR removido${NC}"
else
  echo -e "  ℹ️  $DATA_DIR não encontrado"
fi

# ─── 4. Verificar limpeza ─────────────────────────────────────
echo -e "${YELLOW}[4/4]${NC} Verificando..."

REMAINING=$(pgrep -f "tsx.*server\.ts" 2>/dev/null || true)
if [ -z "$REMAINING" ]; then
  echo -e "  ${GREEN}✅ Nenhum processo restante${NC}"
else
  echo -e "  ${RED}⚠️  Processos ainda rodando: $REMAINING${NC}"
  echo -e "  ${RED}   Rode: kill -9 $REMAINING${NC}"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ HERMES VISUAL ASSISTANT REMOVIDO        ║${NC}"
echo -e "${GREEN}║   Os logs do Hermes NÃO foram tocados.       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
