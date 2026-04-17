# 🎮 Hermes Visual Assistant

Sistema visual 2D retro/pixel-art (estilo SNES/16-bit) para monitorar e interagir com o agente Hermes em tempo real.

![Status](https://img.shields.io/badge/versão-1.0.0-blue)
![Node](https://img.shields.io/badge/node-≥20-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🗺️ Visão Geral

- **Canvas 2D** com mundo top-down estilo Pokémon/Stardew Valley
- **Avatar animado** do agente com sprites pixel-art (16x16)
- **6 salas temáticas**: Hub, Code Lab, Social, Research, Terminal, Meeting
- **Sistema de tarefas** com drag-and-drop e prioridades
- **Chat integrado** estilo RPG para comunicação
- **Monitoramento em tempo real** via WebSocket
- **Efeitos de partículas** por estado (Matrix rain, sparkles, Zzz, etc.)

## ⚡ Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar em modo desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:3000
```

## 🔧 Configuração

Edite `config.json` para apontar para os logs do Hermes:

```json
{
  "port": 3000,
  "hermes_log_path": "/root/.hermes/sessions/",
  "hermes_command_path": "/tmp/hermes_commands/in",
  "hermes_response_path": "/tmp/hermes_commands/out",
  "parser_patterns": {
    "researching": ["web_search", "browse"],
    "coding": ["edit_file", "write_file"],
    "executing": ["run_command", "terminal"]
  },
  "ui": {
    "fps_cap": 30,
    "pixel_scale": 2
  }
}
```

### Paths Importantes

| Config | Descrição |
|--------|-----------|
| `hermes_log_path` | Diretório dos logs do Hermes (observado em tempo real) |
| `hermes_command_path` | Onde o backend escreve comandos para o Hermes ler |
| `hermes_response_path` | Onde o Hermes escreve respostas |

## 🏗️ Arquitetura

```
[Browser: Canvas 2D + Socket.IO]
            │
      WebSocket (JSON)
            │
[Node.js Backend (Express + Socket.IO)]
  ├── File Watcher (chokidar): observa logs
  ├── Log Parser: detecta estados via regex
  ├── Command Handler: escreve arquivos .cmd
  └── Socket Server: emite eventos para UI
            │
[Hermes Agent Process]
  ├── Gera logs → Watcher detecta
  ├── Lê arquivos .cmd → executa
  └── Output → novos logs → UI atualiza
```

## 📁 Estrutura de Arquivos

```
hermes-visual-assistant/
├── index.html              UI principal
├── css/
│   └── style.css           Estilos retro RPG
├── js/
│   ├── engine.js           Game loop, rendering, input
│   ├── sprites.js          Paleta SNES + sprite data
│   ├── rooms.js            Sistema de 6 salas
│   ├── particles.js        Efeitos visuais por estado
│   ├── ui.js               Chat, tasks, status, toasts
│   └── socket-client.js    Comunicação WebSocket
├── src/
│   ├── server.ts           Backend principal
│   ├── parser.ts           Parser flexível de logs
│   ├── watcher.ts          File watcher com chokidar
│   ├── commands.ts         Handler de comandos
│   └── types.ts            Tipos + Zod schemas
├── config.json             Configuração
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🎮 Como Usar

### Navegação
- **Clique nas portas** das salas para navegar entre elas
- **Clique no agente** para abrir o chat
- **Clique no mapa** para mover o agente manualmente

### Atalhos de Teclado
| Tecla | Ação |
|-------|------|
| `C` | Abrir/fechar chat |
| `L` | Abrir/fechar logs |
| `ESC` | Fechar modal |

### Criar Tasks
1. Digite o título no campo de texto na sidebar direita
2. Selecione a prioridade (🟢 baixa / 🟡 média / 🔴 alta)
3. Clique no botão `+` ou pressione Enter
4. Clique em 🎯 para delegar ao Hermes

### Monitoramento
O backend observa automaticamente os logs em `hermes_log_path`. Quando detecta padrões de ferramentas (web_search, edit_file, run_command, etc.), atualiza:
- Estado visual do agente
- Sala atual (auto-navegação)
- Efeitos de partículas
- Log stream na UI

## 🐳 Docker

```bash
# Build
docker build -t hermes-viz .

# Run (montando diretório de logs)
docker run -d \
  --name hermes-viz \
  -p 3000:3000 \
  -v /root/.hermes/sessions:/app/watched_logs \
  hermes-viz
```

## 🔌 Integração com Hermes

### O Hermes precisa:
1. **Gerar logs** em um diretório monitorável
2. **Ler arquivos .cmd** do diretório `hermes_command_path` (opcional)

### Formato de Log Suportado
O parser é flexível e aceita:

```json
{"tool": "web_search", "message": "Buscando...", "timestamp": "2024-01-01T00:00:00Z"}
```

```
[2024-01-01 00:00:00] INFO tool_call: web_search("query")
```

```
Executing run_command: npm install express
```

### Padrões Detectados

| Padrão | Estado | Sala |
|--------|--------|------|
| web_search, browse, read_url | 🔍 Researching | Research |
| edit_file, write_file, create_file | 💻 Coding | Code Lab |
| run_command, terminal, shell | ⚡ Executing | Terminal |
| social, telegram, discord | 📱 Social | Social |
| thinking, planning, analyzing | 🤔 Thinking | Hub |
| delegate, assign | 📋 Delegating | Meeting |
| waiting, pending | ⏳ Waiting | Hub |

## 🎨 Customização

### Adicionar Novos Padrões
Edite `parser_patterns` no `config.json`:

```json
{
  "parser_patterns": {
    "custom_state": ["my_pattern", "another_tool"]
  }
}
```

### Paleta de Cores (Sweetie-16)
A paleta SNES está definida em `js/sprites.js`. Modifique o array `PALETTE` para mudar as cores.

## 💻 Desenvolvimento

```bash
# Dev mode com hot reload do servidor
npm run dev

# Compilar TypeScript
npm run build

# Rodar versão compilada
npm run start:prod
```

## ⚠️ Limitações

- Sprites são 16x16 — para arte mais detalhada, substitua por sprite sheets PNG
- O parser depende de regex patterns — logs muito polimórficos podem precisar de regras adicionais
- Comunicação bidirecional via arquivo (não stdin) — precisa de wrapper no Hermes se ele não ler arquivos .cmd

## 📄 Licença

MIT
