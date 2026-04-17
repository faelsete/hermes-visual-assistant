/**
 * engine.js — Core Game Engine
 *
 * Manages the game loop, canvas rendering, input handling,
 * agent movement, and coordinates all visual subsystems.
 *
 * Virtual resolution: 320x240 (20x15 tiles at 16px)
 * Scaled to fit viewport with CSS image-rendering: pixelated
 */

import { SpriteSystem, AnimationController } from './sprites.js';
import { RoomSystem } from './rooms.js';
import { ParticleSystem } from './particles.js';

// ─── Constants ────────────────────────────────────────────────
const VIRTUAL_WIDTH = 320;
const VIRTUAL_HEIGHT = 240;
const TILE_SIZE = 16;
const AGENT_SPEED = 40; // pixels per second

// ─── Agent State ──────────────────────────────────────────────
class Agent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.state = 'idle';
    this.direction = 'down';
    this.moving = false;
    this.stateBubble = '';
    this.stateBubbleTimer = 0;
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.stateBubbleTimer = 3000; // Show state bubble for 3s
      this.stateBubble = this.getStateBubbleText(state);
    }
  }

  getStateBubbleText(state) {
    const bubbles = {
      idle: '💤',
      thinking: '🤔💭',
      coding: '💻 Codando...',
      researching: '🔍 Pesquisando...',
      social: '📱 Social...',
      executing: '⚡ Executando...',
      sleeping: '😴 Zzz...',
      delegating: '📋 Delegando...',
      waiting: '⏳ Aguardando...',
    };
    return bubbles[state] || state;
  }

  update(deltaTime, roomSystem) {
    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      this.moving = true;
      const speed = AGENT_SPEED * (deltaTime / 1000);
      const ratio = Math.min(speed / dist, 1);

      const newX = this.x + dx * ratio;
      const newY = this.y + dy * ratio;

      // Check walkability (center of 32x32 sprite)
      const tileX = Math.floor((newX + 16) / TILE_SIZE);
      const tileY = Math.floor((newY + 16) / TILE_SIZE);

      if (roomSystem.isWalkable(tileX, tileY)) {
        this.x = newX;
        this.y = newY;
      } else {
        // Try sliding along axes
        const tileXOnly = Math.floor((newX + 16) / TILE_SIZE);
        const tileYCurrent = Math.floor((this.y + 16) / TILE_SIZE);
        if (roomSystem.isWalkable(tileXOnly, tileYCurrent)) {
          this.x = newX;
        }
        const tileXCurrent = Math.floor((this.x + 16) / TILE_SIZE);
        const tileYOnly = Math.floor((newY + 16) / TILE_SIZE);
        if (roomSystem.isWalkable(tileXCurrent, tileYOnly)) {
          this.y = newY;
        }
      }

      // Update direction
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'down' : 'down'; // We only have down/up sprites
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }
    } else {
      this.moving = false;
    }

    // Update state bubble timer
    if (this.stateBubbleTimer > 0) {
      this.stateBubbleTimer -= deltaTime;
    }
  }
}

// ─── Game Engine ──────────────────────────────────────────────

export class GameEngine {
  constructor(canvasElement) {
    // Canvas setup — virtual resolution
    this.canvas = canvasElement;
    this.canvas.width = VIRTUAL_WIDTH;
    this.canvas.height = VIRTUAL_HEIGHT;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false; // Crispy pixels!

    // Subsystems
    this.sprites = new SpriteSystem();
    this.animation = new AnimationController();
    this.rooms = new RoomSystem(this.sprites);
    this.particles = new ParticleSystem();

    // Agent
    const spawn = this.rooms.getSpawnPosition();
    this.agent = new Agent(spawn.x, spawn.y);

    // Timing
    this.lastTime = 0;
    this.fpsInterval = 1000 / 30; // 30 FPS cap
    this.accumulator = 0;
    this.running = false;

    // Interaction
    this.hoveredDoor = null;
    this.onClick = null; // Callback when agent is clicked

    // State change callback
    this.onRoomChange = null;

    // Bind events
    this.setupInput();
  }

  // ─── Input Handling ───────────────────────────────────────

  setupInput() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = VIRTUAL_WIDTH / rect.width;
      const scaleY = VIRTUAL_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.handleClick(x, y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = VIRTUAL_WIDTH / rect.width;
      const scaleY = VIRTUAL_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      this.handleHover(x, y);
    });
  }

  handleClick(x, y) {
    // Check if clicked on agent
    const agentBounds = {
      x: this.agent.x,
      y: this.agent.y,
      w: 32,
      h: 32,
    };

    if (
      x >= agentBounds.x - 6 &&
      x <= agentBounds.x + agentBounds.w + 6 &&
      y >= agentBounds.y - 6 &&
      y <= agentBounds.y + agentBounds.h + 6
    ) {
      if (this.onClick) this.onClick();
      return;
    }

    // Check if clicked on a door
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    const doorTarget = this.rooms.checkDoor(tileX, tileY);

    if (doorTarget) {
      this.rooms.navigateTo(doorTarget);
      return;
    }

    // Otherwise move agent to clicked position
    const targetX = Math.floor(x / TILE_SIZE) * TILE_SIZE;
    const targetY = Math.floor(y / TILE_SIZE) * TILE_SIZE;

    if (this.rooms.isWalkable(tileX, tileY)) {
      this.agent.setTarget(targetX, targetY);
    }
  }

  handleHover(x, y) {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    const doorTarget = this.rooms.checkDoor(tileX, tileY);

    if (doorTarget) {
      this.canvas.style.cursor = 'pointer';
      this.hoveredDoor = doorTarget;
    } else {
      // Check agent hover
      if (
        x >= this.agent.x - 6 &&
        x <= this.agent.x + 38 &&
        y >= this.agent.y - 6 &&
        y <= this.agent.y + 38
      ) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
      this.hoveredDoor = null;
    }
  }

  // ─── State Management ─────────────────────────────────────

  setAgentState(state, room) {
    this.agent.setState(state);
    this.particles.setEffect(state);

    // Navigate to appropriate room
    const targetRoom = room || this.rooms.getRoomForState(state);
    if (targetRoom !== this.rooms.currentRoom) {
      this.rooms.navigateTo(targetRoom);
    }
  }

  // ─── Game Loop ────────────────────────────────────────────

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop() {
    this.running = false;
  }

  loop(timestamp) {
    if (!this.running) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Cap delta to avoid spiral of death
    const clampedDelta = Math.min(deltaTime, 100);

    this.update(clampedDelta);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  // ─── Update ───────────────────────────────────────────────

  update(deltaTime) {
    // Update animation
    this.animation.update(deltaTime);

    // Update room transitions
    const transition = this.rooms.update(deltaTime);
    if (transition.done) {
      // Teleport agent to spawn point of new room
      this.agent.x = transition.spawnX;
      this.agent.y = transition.spawnY;
      this.agent.targetX = transition.spawnX;
      this.agent.targetY = transition.spawnY;

      if (this.onRoomChange) {
        this.onRoomChange(this.rooms.currentRoom);
      }

      // Burst particles on room entry
      this.particles.burst('sparkles', this.agent.x + 16, this.agent.y + 16, 12);
    }

    // Update agent
    this.agent.update(deltaTime, this.rooms);

    // Update particles
    this.particles.setOrigin(this.agent.x + 16, this.agent.y - 4);
    this.particles.update(deltaTime);
  }

  // ─── Render ───────────────────────────────────────────────

  render() {
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Layer 1: Room tilemap
    this.rooms.render(ctx);

    // Layer 2: Agent shadow
    this.drawAgentShadow(ctx);

    // Layer 3: Agent sprite
    const bobY = this.agent.moving ? 0 : this.animation.getBobOffset();
    this.sprites.drawAgent(
      ctx,
      this.agent.state,
      this.animation.getFrame(),
      this.agent.x,
      this.agent.y + bobY,
      this.agent.direction
    );

    // Layer 4: Particles
    this.particles.render(ctx);

    // Layer 5: State bubble
    if (this.agent.stateBubbleTimer > 0) {
      this.drawStateBubble(ctx);
    }

    // Layer 6: Room name badge
    this.drawRoomBadge(ctx);

    // Layer 7: Transition overlay
    this.rooms.renderTransition(ctx, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
  }

  drawAgentShadow(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(
      this.agent.x + 16,
      this.agent.y + 30,
      10,
      3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  drawStateBubble(ctx) {
    const alpha = Math.min(1, this.agent.stateBubbleTimer / 500);
    const bubbleX = this.agent.x + 16;
    const bubbleY = this.agent.y - 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Bubble background
    const text = this.agent.stateBubble;
    ctx.font = '4px "Press Start 2P"';
    const metrics = ctx.measureText(text);
    const textWidth = Math.max(metrics.width, 20);

    // Background rounded rect
    const bx = bubbleX - textWidth / 2 - 4;
    const by = bubbleY - 6;
    const bw = textWidth + 8;
    const bh = 10;

    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#1a1c2c';
    ctx.strokeStyle = '#1a1c2c';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Bubble tail
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(bubbleX - 1, by + bh, 3, 3);

    // Text
    ctx.fillStyle = '#1a1c2c';
    ctx.textAlign = 'center';
    ctx.fillText(text, bubbleX, bubbleY + 1);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawRoomBadge(ctx) {
    const room = this.rooms.getCurrentRoom();
    if (!room) return;

    ctx.save();
    ctx.fillStyle = 'rgba(26, 28, 44, 0.7)';
    ctx.fillRect(4, 4, 120, 14);

    ctx.fillStyle = '#ffcd75';
    ctx.font = '5px "Press Start 2P"';
    ctx.fillText(`${room.icon} ${room.name}`, 8, 13);

    ctx.restore();
  }

  // ─── Public API ───────────────────────────────────────────

  getRoomList() {
    return this.rooms.getRoomList();
  }

  getCurrentState() {
    return this.agent.state;
  }

  getAgentPosition() {
    return { x: this.agent.x, y: this.agent.y };
  }

  navigateToRoom(roomId) {
    this.rooms.navigateTo(roomId);
  }
}
