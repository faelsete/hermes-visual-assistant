/**
 * particles.js — Particle Effects System
 *
 * Lightweight particle system using object pooling.
 * Supports multiple effect types tied to agent states.
 * Capped at 60 particles to stay RPi-friendly.
 */

import { PALETTE } from './sprites.js';

const MAX_PARTICLES = 60;

// ─── Particle Types ───────────────────────────────────────────

const PARTICLE_CONFIGS = {
  // Matrix rain — green characters falling
  matrix: {
    chars: '01アイウエオカキクケコ{}[]<>/*-+=',
    color: '#38b764',
    colorAlt: '#a7f070',
    lifetime: 2000,
    speed: 40,
    spawnRate: 80, // ms between spawns
    size: 6,
    gravity: 30,
  },

  // Sparkles — floating stars for research
  sparkles: {
    chars: '✦✧⋆*∗',
    color: '#ffcd75',
    colorAlt: '#73eff7',
    lifetime: 1500,
    speed: 15,
    spawnRate: 200,
    size: 5,
    gravity: -10,
  },

  // Zzz — sleep bubbles
  zzz: {
    chars: 'Zz',
    color: '#94b0c2',
    colorAlt: '#f4f4f4',
    lifetime: 2000,
    speed: 8,
    spawnRate: 600,
    size: 7,
    gravity: -15,
  },

  // Code brackets — coding particles
  code: {
    chars: '{}[]()<>;:=/\\',
    color: '#41a6f6',
    colorAlt: '#3b5dc9',
    lifetime: 1200,
    speed: 20,
    spawnRate: 120,
    size: 5,
    gravity: 5,
  },

  // Lightning — execution/energy
  lightning: {
    chars: '⚡↯↗↘',
    color: '#73eff7',
    colorAlt: '#ffcd75',
    lifetime: 400,
    speed: 60,
    spawnRate: 100,
    size: 6,
    gravity: 0,
  },

  // Hearts/social
  social: {
    chars: '♥♡💬📱',
    color: '#b13e53',
    colorAlt: '#ef7d57',
    lifetime: 1800,
    speed: 12,
    spawnRate: 300,
    size: 6,
    gravity: -8,
  },

  // Thought bubbles
  thought: {
    chars: '?!💡🧠',
    color: '#f4f4f4',
    colorAlt: '#ffcd75',
    lifetime: 1500,
    speed: 10,
    spawnRate: 400,
    size: 6,
    gravity: -12,
  },

  // Delegate arrows
  delegate: {
    chars: '→►▶➤',
    color: '#a7f070',
    colorAlt: '#38b764',
    lifetime: 800,
    speed: 40,
    spawnRate: 150,
    size: 6,
    gravity: 0,
  },

  // Clock ticks for waiting
  clock: {
    chars: '⏰⏳◷◶',
    color: '#ffcd75',
    colorAlt: '#ef7d57',
    lifetime: 2000,
    speed: 5,
    spawnRate: 500,
    size: 6,
    gravity: -5,
  },
};

// State → particle effect mapping
const STATE_PARTICLES = {
  idle: null,
  thinking: 'thought',
  coding: 'code',
  researching: 'sparkles',
  social: 'social',
  executing: 'matrix',
  sleeping: 'zzz',
  delegating: 'delegate',
  waiting: 'clock',
};

// ─── Particle Class ───────────────────────────────────────────

class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.char = '';
    this.color = '';
    this.size = 5;
    this.alpha = 1;
  }

  init(config, originX, originY, spread = 30) {
    this.active = true;
    this.x = originX + (Math.random() - 0.5) * spread;
    this.y = originY + (Math.random() - 0.5) * spread;

    const angle = Math.random() * Math.PI * 2;
    const speed = config.speed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - config.gravity;

    this.life = config.lifetime;
    this.maxLife = config.lifetime;

    const chars = config.chars;
    this.char = chars[Math.floor(Math.random() * chars.length)];
    this.color = Math.random() > 0.5 ? config.color : config.colorAlt;
    this.size = config.size;
    this.alpha = 1;
  }

  update(deltaTime) {
    if (!this.active) return;

    const dt = deltaTime / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= deltaTime;
    this.alpha = Math.max(0, this.life / this.maxLife);

    if (this.life <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active || this.alpha <= 0.05) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.font = `${this.size}px "Press Start 2P", monospace`;
    ctx.fillText(this.char, Math.floor(this.x), Math.floor(this.y));
    ctx.restore();
  }
}

// ─── Particle System ──────────────────────────────────────────

export class ParticleSystem {
  constructor() {
    // Object pool
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push(new Particle());
    }

    this.currentEffect = null;
    this.spawnTimer = 0;
    this.originX = 0;
    this.originY = 0;
  }

  /**
   * Set the current effect type based on agent state
   */
  setEffect(state) {
    const effectName = STATE_PARTICLES[state] || null;
    if (effectName === this.currentEffect) return;

    this.currentEffect = effectName;
    this.spawnTimer = 0;
  }

  /**
   * Update origin position (follows agent)
   */
  setOrigin(x, y) {
    this.originX = x;
    this.originY = y;
  }

  /**
   * Spawn a burst of particles (for state transitions)
   */
  burst(effectName, x, y, count = 10) {
    const config = PARTICLE_CONFIGS[effectName];
    if (!config) return;

    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (p) {
        p.init(config, x, y, 40);
      }
    }
  }

  /**
   * Update all particles and spawn new ones
   */
  update(deltaTime) {
    // Update existing particles
    for (const p of this.particles) {
      p.update(deltaTime);
    }

    // Spawn new particles based on current effect
    if (this.currentEffect) {
      const config = PARTICLE_CONFIGS[this.currentEffect];
      if (!config) return;

      this.spawnTimer += deltaTime;
      if (this.spawnTimer >= config.spawnRate) {
        this.spawnTimer -= config.spawnRate;
        const p = this.getInactiveParticle();
        if (p) {
          p.init(config, this.originX, this.originY, 20);
        }
      }
    }
  }

  /**
   * Render all active particles
   */
  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx);
    }
  }

  /**
   * Get an inactive particle from the pool
   */
  getInactiveParticle() {
    return this.particles.find(p => !p.active) || null;
  }

  /**
   * Get count of active particles
   */
  getActiveCount() {
    return this.particles.filter(p => p.active).length;
  }

  /**
   * Clear all particles
   */
  clear() {
    for (const p of this.particles) {
      p.active = false;
    }
  }
}
