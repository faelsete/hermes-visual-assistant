# 🎮 Hermes Visual Assistant v2.0

Sistema visual 2D retro/pixel-art (estilo SNES/16-bit) para monitorar e interagir com o agente Hermes em tempo real.

![Status](https://img.shields.io/badge/versão-2.0.0-blue)
![Node](https://img.shields.io/badge/node-≥20-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🗺️ Visão Geral

- **Canvas 2D** com mundo top-down estilo Pokémon/Stardew Valley
- **Avatar animado** do agente (drone pixel-art 32x32)
- **6 salas temáticas**: Hub, Code Lab, Social, Research, Terminal, Meeting
- **Plugin Hermes** que recebe eventos em tempo real via Unix socket
- **Chat integrado** estilo RPG para comunicação
- **Efeitos de partículas** por estado (Matrix rain, sparkles, Zzz, etc.)

## ⚡ Instalação

```bash
# 1. Clonar repositório
git clone https://github.com/faelsete/hermes-visual-assistant.git
cd hermes-visual-assistant

# 2. Instalar tudo (npm deps + plugin Hermes)
chmod +x install.sh
./install.sh

# 3. Iniciar servidor
npm run dev

# 4. Abrir no navegador (via túnel SSH se remoto)
# http://localhost:3000
```

### Acesso remoto (via SSH tunnel)

```bash
ssh -L 3000:localhost:3000 user@seu-servidor
# Depois abre http://localhost:3000 no navegador local
```

## 🔌 Como Funciona (v2.0)

```
Hermes Agent
  → Plugin Python (hooks no lifecycle)
    → Unix Socket (/tmp/hermes-visual.sock)
      → Node.js Server (Express + Socket.IO)
        → Browser (Canvas 2D pixel-art)
```

O plugin se registra automaticamente no Hermes e envia eventos em tempo real:
- `session_start` → Sessão iniciada
- `pre_tool_call` → Ferramenta sendo usada (muda sala/estado)
- `post_tool_call` → Ferramenta concluída
- `pre_llm_call` → Agente pensando
- `post_llm_call` → Resposta gerada
- `session_end` → Sessão encerrada

## 🎮 Estados Visuais

| Ferramenta | Estado | Sala |
|------------|--------|------|
| web_search, browse, read_url | 🔍 Researching | Research Center |
| edit_file, write_file, view_file | 💻 Coding | Code Lab |
| run_command, terminal | ⚡ Executing | Terminal |
| telegram, discord | 📱 Social | Social Hub |
| sequentialthinking | 🤔 Thinking | Hub Central |
| browser_subagent, spawn_agent | 📋 Delegating | Meeting Room |
| idle | 😴 Sleeping | Hub Central |

## 📁 Estrutura

```
hermes-visual-assistant/
├── plugin/
│   ├── __init__.py         Plugin Hermes (hooks lifecycle)
│   └── plugin.yaml         Manifest do plugin
├── src/
│   ├── server.ts           Backend (Unix socket + Socket.IO)
│   ├── commands.ts         Handler de tarefas/chat
│   └── types.ts            Tipos + Zod schemas
├── js/
│   ├── engine.js           Game loop + rendering
│   ├── sprites.js          Sprite system 32x32
│   ├── rooms.js            Sistema de 6 salas
│   ├── particles.js        Efeitos visuais
│   ├── ui.js               Chat, tasks, status
│   └── socket-client.js    Comunicação WebSocket
├── css/style.css           Estilo retro RPG
├── index.html              UI principal
├── config.json             Configuração
├── install.sh              Instalação automática
├── uninstall.sh            Remoção completa
└── README.md
```

## 🗑️ Desinstalação

### Opção 1: Script local (se o projeto ainda está instalado)

```bash
cd /root/hermes-visual-assistant
chmod +x uninstall.sh
./uninstall.sh
```

### Opção 2: Comando remoto (funciona sempre)

```bash
curl -sL https://raw.githubusercontent.com/faelsete/hermes-visual-assistant/master/uninstall.sh | bash
```

### Opção 3: Manual step-by-step

```bash
# 1. Parar servidor
pkill -f "tsx.*server" 2>/dev/null

# 2. Remover plugin do Hermes
rm -rf ~/.hermes/plugins/hermes_visual_assistant

# 3. Limpar Unix socket
rm -f /tmp/hermes-visual.sock

# 4. Remover projeto
rm -rf /root/hermes-visual-assistant

# 5. Limpar dados temporários
rm -rf /tmp/hermes_commands
```

> ⚠️ **Nenhum comando acima toca nos logs do Hermes** (`~/.hermes/sessions/`). Seus dados estão seguros.

## 🔧 Configuração

Edite `config.json`:

```json
{
  "port": 3000,
  "hermes_log_path": "~/.hermes/sessions/",
  "hermes_command_path": "/tmp/hermes_commands/in",
  "hermes_response_path": "/tmp/hermes_commands/out"
}
```

## 💻 Desenvolvimento

```bash
# Dev mode com hot reload
npm run dev

# Health check
curl http://localhost:3000/health
```

## 📄 Licença

MIT
