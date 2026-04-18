#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Hermes Visual Assistant — Install Script
# Installs the Hermes plugin and npm dependencies
# ─────────────────────────────────────────────────────────────

set -euo pipefail

HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
PLUGIN_DIR="$HERMES_HOME/plugins/hermes_visual_assistant"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🎮 HERMES VISUAL ASSISTANT — INSTALLER      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── 1. Install npm dependencies ──────────────────────────────
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "  📦 Instalando dependências npm..."
  (cd "$SCRIPT_DIR" && npm install --silent)
else
  echo "  ✅ Dependências npm já instaladas"
fi

# ─── 2. Install Hermes plugin ─────────────────────────────────
echo "  🔌 Instalando plugin Hermes..."
mkdir -p "$PLUGIN_DIR"
cp "$SCRIPT_DIR/plugin/__init__.py" "$PLUGIN_DIR/__init__.py"
cp "$SCRIPT_DIR/plugin/plugin.yaml" "$PLUGIN_DIR/plugin.yaml"
echo "  ✅ Plugin instalado em: $PLUGIN_DIR"

# ─── 3. Done ──────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ INSTALAÇÃO COMPLETA                       ║"
echo "╠══════════════════════════════════════════════╣"
echo "║                                              ║"
echo "║  Iniciar:  npm run dev                       ║"
echo "║  Abrir:    http://localhost:3000              ║"
echo "║                                              ║"
echo "║  O plugin se ativa automaticamente na        ║"
echo "║  próxima sessão do Hermes.                   ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
