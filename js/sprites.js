/**
 * sprites.js — Pixel Art Sprite System v2
 *
 * Hermes Drone: 32x32 procedural sprite built with canvas primitives.
 * Tiles: 16x16 hex-string arrays.
 * All pre-rendered and cached for performance.
 *
 * Hermes design: Floating drone/robot companion — compact round body,
 * dark metallic blue with gold/orange accents, Greek-style winged helmet,
 * color-changing visor, tech backpack, jet-propelled sandals.
 */

// ─── Sweetie-16 Palette (SNES-inspired) ───────────────────────
export const PALETTE = [
  null,          // 0 - transparent
  '#1a1c2c',    // 1 - void/black
  '#5d275d',    // 2 - dark purple
  '#b13e53',    // 3 - crimson
  '#ef7d57',    // 4 - orange
  '#ffcd75',    // 5 - gold/yellow
  '#a7f070',    // 6 - lime
  '#38b764',    // 7 - green
  '#257179',    // 8 - dark teal
  '#29366f',    // 9 - navy
  '#3b5dc9',    // a(10) - blue
  '#41a6f6',    // b(11) - sky blue
  '#73eff7',    // c(12) - cyan
  '#f4f4f4',    // d(13) - white
  '#94b0c2',    // e(14) - silver
  '#566c86',    // f(15) - gray
];

// ─── Visor Colors Per State ───────────────────────────────────
const VISOR_COLORS = {
  idle:        { main: '#41a6f6', shine: '#73eff7', dim: '#3b5dc9' },
  thinking:    { main: '#ffcd75', shine: '#f4f4f4', dim: '#ef7d57' },
  coding:      { main: '#38b764', shine: '#a7f070', dim: '#257179' },
  researching: { main: '#73eff7', shine: '#f4f4f4', dim: '#41a6f6' },
  executing:   { main: '#a7f070', shine: '#f4f4f4', dim: '#38b764' },
  social:      { main: '#b13e53', shine: '#ef7d57', dim: '#5d275d' },
  sleeping:    { main: '#333c57', shine: '#566c86', dim: '#1a1c2c' },
  delegating:  { main: '#ef7d57', shine: '#ffcd75', dim: '#b13e53' },
  waiting:     { main: '#41a6f6', shine: '#73eff7', dim: '#29366f' },
};

// ─── Drone Color Constants ────────────────────────────────────
const C = {
  VOID:    '#1a1c2c',
  NAVY:    '#29366f',
  BLUE:    '#3b5dc9',
  SKY:     '#41a6f6',
  CYAN:    '#73eff7',
  GOLD:    '#ffcd75',
  ORANGE:  '#ef7d57',
  WHITE:   '#f4f4f4',
  SILVER:  '#94b0c2',
  GRAY:    '#566c86',
  GREEN:   '#38b764',
  LIME:    '#a7f070',
  PURPLE:  '#5d275d',
  CRIMSON: '#b13e53',
  DARKBLUE:'#1a237e',
};

// ─── Hermes Drone Renderer (32x32) ───────────────────────────

class HermesDroneRenderer {
  constructor() {
    this.cache = new Map();
    this.precacheAll();
  }

  // — Helpers ——
  px(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 1, 1);
  }

  rect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  // Draw a row of pixels symmetrically from center
  symRow(ctx, centerX, y, halfWidth, color) {
    this.rect(ctx, centerX - halfWidth, y, halfWidth * 2, 1, color);
  }

  // ─── Pre-cache ──────────────────────────────────────────────

  precacheAll() {
    const states = [
      'idle', 'thinking', 'coding', 'researching',
      'executing', 'social', 'sleeping', 'delegating', 'waiting',
    ];
    for (const state of states) {
      for (const frame of [0, 1]) {
        const key = `${state}_${frame}`;
        this.cache.set(key, this.renderFrame(state, frame));
      }
    }
  }

  renderFrame(state, frame) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const visor = VISOR_COLORS[state] || VISOR_COLORS.idle;

    // Draw the drone
    this.drawAntenna(ctx, frame, state);
    this.drawHelmet(ctx, frame);
    this.drawGoldBand(ctx);
    this.drawVisor(ctx, visor, frame, state);
    this.drawWings(ctx, frame);
    this.drawBody(ctx, frame);
    this.drawThrusters(ctx, frame);

    // Draw state-specific accessories
    this.drawAccessory(ctx, state, frame);

    return canvas;
  }

  // ─── Antenna ────────────────────────────────────────────────

  drawAntenna(ctx, frame, state) {
    // Antenna stem
    this.px(ctx, 15, 3, C.NAVY);
    this.px(ctx, 16, 3, C.NAVY);
    this.px(ctx, 15, 4, C.BLUE);
    this.px(ctx, 16, 4, C.BLUE);

    // Antenna glow — blinks between frames
    const glowColor = frame === 0 ? C.CYAN : C.SKY;
    this.px(ctx, 15, 2, glowColor);
    this.px(ctx, 16, 2, glowColor);

    // Extra glow in certain states
    if (state === 'thinking' || state === 'executing') {
      const extraGlow = frame === 0 ? C.WHITE : C.CYAN;
      this.px(ctx, 15, 1, extraGlow);
      this.px(ctx, 16, 1, extraGlow);
    }
  }

  // ─── Helmet ─────────────────────────────────────────────────

  drawHelmet(ctx, frame) {
    const cx = 15; // center column (0-indexed, left side of center pair)

    // Helmet top — rounded dome shape
    // Row 5: 6px wide
    this.rect(ctx, 13, 5, 6, 1, C.BLUE);
    // Row 6: 8px wide
    this.rect(ctx, 12, 6, 8, 1, C.BLUE);
    // Row 7: 10px wide
    this.rect(ctx, 11, 7, 10, 1, C.BLUE);
    // Row 8: 10px wide
    this.rect(ctx, 11, 8, 10, 1, C.BLUE);

    // Highlight on helmet dome
    this.px(ctx, 15, 5, C.SKY);
    this.px(ctx, 16, 5, C.SKY);
    this.px(ctx, 14, 6, C.SKY);
    this.px(ctx, 15, 6, C.SKY);

    // Outline pixels (navy border on outermost pixels)
    this.px(ctx, 13, 5, C.NAVY); this.px(ctx, 18, 5, C.NAVY);
    this.px(ctx, 12, 6, C.NAVY); this.px(ctx, 19, 6, C.NAVY);
    this.px(ctx, 11, 7, C.NAVY); this.px(ctx, 20, 7, C.NAVY);
    this.px(ctx, 11, 8, C.NAVY); this.px(ctx, 20, 8, C.NAVY);
  }

  // ─── Gold Band ──────────────────────────────────────────────

  drawGoldBand(ctx) {
    // Gold accent band between helmet and visor — row 9
    this.rect(ctx, 11, 9, 10, 1, C.GOLD);
    // Inner shine
    this.px(ctx, 14, 9, C.WHITE);
    this.px(ctx, 15, 9, C.WHITE);
  }

  // ─── Visor ──────────────────────────────────────────────────

  drawVisor(ctx, visorColors, frame, state) {
    // Visor area: rows 10-12, cols 11-20 (10px wide, 3px tall)

    // Border
    this.rect(ctx, 10, 10, 1, 3, C.NAVY);
    this.rect(ctx, 21, 10, 1, 3, C.NAVY);
    this.rect(ctx, 11, 10, 10, 1, C.NAVY); // top border line
    this.rect(ctx, 11, 12, 10, 1, C.NAVY); // bottom border line

    // Visor fill (main color)
    this.rect(ctx, 11, 10, 10, 3, visorColors.main);

    // Visor border re-apply on top/bottom
    this.rect(ctx, 10, 10, 12, 1, C.NAVY);
    this.rect(ctx, 10, 12, 12, 1, C.NAVY);
    this.px(ctx, 10, 11, C.NAVY);
    this.px(ctx, 21, 11, C.NAVY);

    // Visor interior (row 11 is the main visible row)
    this.rect(ctx, 11, 11, 10, 1, visorColors.main);

    // === EYES (bright spots inside visor) ===
    if (state === 'sleeping') {
      // Sleeping: horizontal line (closed eyes)
      this.rect(ctx, 13, 11, 2, 1, visorColors.shine);
      this.rect(ctx, 17, 11, 2, 1, visorColors.shine);
    } else {
      // Normal eyes: two bright dots
      const eyeColor = C.WHITE;
      // Left eye
      this.px(ctx, 13, 11, eyeColor);
      this.px(ctx, 14, 11, eyeColor);
      // Right eye
      this.px(ctx, 17, 11, eyeColor);
      this.px(ctx, 18, 11, eyeColor);

      // Pupil dots (dark center)
      if (frame === 0) {
        this.px(ctx, 13, 11, visorColors.shine);
        this.px(ctx, 17, 11, visorColors.shine);
      } else {
        this.px(ctx, 14, 11, visorColors.shine);
        this.px(ctx, 18, 11, visorColors.shine);
      }
    }

    // Visor shine (top-left reflection)
    this.px(ctx, 12, 10, visorColors.shine);
    this.px(ctx, 13, 10, visorColors.shine);
  }

  // ─── Wings ──────────────────────────────────────────────────

  drawWings(ctx, frame) {
    const wingOffset = frame === 0 ? 0 : -1; // Slight flap between frames

    // === Left Wing ===
    // Wing base connects to visor border
    this.px(ctx, 9, 10 + wingOffset, C.GOLD);
    this.px(ctx, 10, 10, C.GOLD);

    // Wing feathers (3 lines extending left-up)
    this.px(ctx, 8, 9 + wingOffset, C.GOLD);
    this.px(ctx, 7, 9 + wingOffset, C.ORANGE);
    this.px(ctx, 6, 8 + wingOffset, C.GOLD);
    this.px(ctx, 5, 8 + wingOffset, C.ORANGE);

    // Lower feather
    this.px(ctx, 8, 11 + wingOffset, C.GOLD);
    this.px(ctx, 7, 11 + wingOffset, C.GOLD);
    this.px(ctx, 9, 11, C.GOLD);

    // Wing glow
    this.px(ctx, 6, 9 + wingOffset, C.GOLD);

    // === Right Wing (mirrored) ===
    this.px(ctx, 22, 10 + wingOffset, C.GOLD);
    this.px(ctx, 21, 10, C.GOLD);

    this.px(ctx, 23, 9 + wingOffset, C.GOLD);
    this.px(ctx, 24, 9 + wingOffset, C.ORANGE);
    this.px(ctx, 25, 8 + wingOffset, C.GOLD);
    this.px(ctx, 26, 8 + wingOffset, C.ORANGE);

    this.px(ctx, 23, 11 + wingOffset, C.GOLD);
    this.px(ctx, 24, 11 + wingOffset, C.GOLD);
    this.px(ctx, 22, 11, C.GOLD);

    this.px(ctx, 25, 9 + wingOffset, C.GOLD);
  }

  // ─── Body ──────────────────────────────────────────────────

  drawBody(ctx, frame) {
    // Main body: rounded oval, rows 13-22

    // Body shape (each row with its width, centered at col 16)
    const bodyRows = [
      { y: 13, left: 13, width: 6 },   // top taper
      { y: 14, left: 12, width: 8 },
      { y: 15, left: 11, width: 10 },
      { y: 16, left: 10, width: 12 },  // widest
      { y: 17, left: 10, width: 12 },
      { y: 18, left: 10, width: 12 },
      { y: 19, left: 10, width: 12 },
      { y: 20, left: 11, width: 10 },
      { y: 21, left: 12, width: 8 },
      { y: 22, left: 13, width: 6 },   // bottom taper
    ];

    // Fill body
    for (const row of bodyRows) {
      this.rect(ctx, row.left, row.y, row.width, 1, C.BLUE);
    }

    // Body outline (navy border on outermost pixels)
    for (const row of bodyRows) {
      this.px(ctx, row.left, row.y, C.NAVY);
      this.px(ctx, row.left + row.width - 1, row.y, C.NAVY);
    }
    // Top and bottom full border
    this.rect(ctx, 13, 13, 6, 1, C.NAVY);
    this.rect(ctx, 13, 22, 6, 1, C.NAVY);

    // Refill interior (1px inset from border)
    for (const row of bodyRows) {
      if (row.width > 2) {
        this.rect(ctx, row.left + 1, row.y, row.width - 2, 1, C.BLUE);
      }
    }

    // Body center panel (darker area in the middle)
    this.rect(ctx, 14, 15, 4, 6, C.NAVY);
    // Panel inner (dark blue)
    this.rect(ctx, 14, 16, 4, 4, '#1e2a5e');

    // Orange accent stripes (vertical lines on sides)
    for (let y = 16; y <= 20; y++) {
      this.px(ctx, 12, y, C.ORANGE);
      this.px(ctx, 19, y, C.ORANGE);
    }

    // Center gem/light
    this.px(ctx, 15, 17, C.CYAN);
    this.px(ctx, 16, 17, C.CYAN);
    this.px(ctx, 15, 18, frame === 0 ? C.SKY : C.CYAN);
    this.px(ctx, 16, 18, frame === 0 ? C.CYAN : C.SKY);

    // Body highlight (top-left shine)
    this.px(ctx, 13, 14, C.SKY);
    this.px(ctx, 14, 14, C.SKY);

    // Silver backpack vent (lower body)
    this.rect(ctx, 14, 21, 4, 1, C.SILVER);
    this.px(ctx, 15, 21, C.GRAY);
    this.px(ctx, 16, 21, C.GRAY);
  }

  // ─── Thrusters ──────────────────────────────────────────────

  drawThrusters(ctx, frame) {
    // Two jet thrusters at the base

    // Left thruster housing
    this.rect(ctx, 13, 23, 2, 2, C.ORANGE);
    this.px(ctx, 13, 23, C.NAVY);

    // Right thruster housing
    this.rect(ctx, 17, 23, 2, 2, C.ORANGE);
    this.px(ctx, 18, 23, C.NAVY);

    // Jet flames (alternate between frames)
    if (frame === 0) {
      // Frame 0: longer left flame, shorter right
      this.px(ctx, 13, 25, C.CYAN);
      this.px(ctx, 14, 25, C.CYAN);
      this.px(ctx, 13, 26, C.SKY);
      this.px(ctx, 14, 26, C.SKY);
      this.px(ctx, 14, 27, C.BLUE);

      this.px(ctx, 17, 25, C.CYAN);
      this.px(ctx, 18, 25, C.CYAN);
      this.px(ctx, 17, 26, C.SKY);
    } else {
      // Frame 1: shorter left, longer right
      this.px(ctx, 13, 25, C.CYAN);
      this.px(ctx, 14, 25, C.CYAN);
      this.px(ctx, 13, 26, C.SKY);

      this.px(ctx, 17, 25, C.CYAN);
      this.px(ctx, 18, 25, C.CYAN);
      this.px(ctx, 17, 26, C.SKY);
      this.px(ctx, 18, 26, C.SKY);
      this.px(ctx, 17, 27, C.BLUE);
    }
  }

  // ─── State Accessories ──────────────────────────────────────

  drawAccessory(ctx, state, frame) {
    switch (state) {
      case 'thinking':
        this.drawThinkingAccessory(ctx, frame);
        break;
      case 'coding':
        this.drawCodingAccessory(ctx, frame);
        break;
      case 'researching':
        this.drawResearchAccessory(ctx, frame);
        break;
      case 'executing':
        this.drawExecutingAccessory(ctx, frame);
        break;
      case 'social':
        this.drawSocialAccessory(ctx, frame);
        break;
      case 'sleeping':
        this.drawSleepingAccessory(ctx, frame);
        break;
      case 'delegating':
        this.drawDelegatingAccessory(ctx, frame);
        break;
      case 'waiting':
        this.drawWaitingAccessory(ctx, frame);
        break;
      // idle: no extra accessory
    }
  }

  // 💡 Thinking: lightbulb above
  drawThinkingAccessory(ctx, frame) {
    const ox = frame === 0 ? 24 : 25;
    const oy = frame === 0 ? 2 : 1;
    // Bulb
    this.px(ctx, ox, oy, C.GOLD);
    this.px(ctx, ox + 1, oy, C.GOLD);
    this.px(ctx, ox, oy + 1, C.GOLD);
    this.px(ctx, ox + 1, oy + 1, C.WHITE);
    // Base
    this.px(ctx, ox, oy + 2, C.GRAY);
    this.px(ctx, ox + 1, oy + 2, C.GRAY);
    // Rays
    if (frame === 0) {
      this.px(ctx, ox - 1, oy, C.GOLD);
      this.px(ctx, ox + 2, oy + 1, C.GOLD);
    }
  }

  // 💻 Coding: holographic keyboard projection
  drawCodingAccessory(ctx, frame) {
    const baseY = 26;
    // Keyboard projection (small grid of dots)
    const kbColor = frame === 0 ? C.CYAN : C.SKY;
    for (let x = 8; x <= 23; x += 2) {
      this.px(ctx, x, baseY, kbColor);
      if (x % 4 === 0) {
        this.px(ctx, x, baseY + 1, kbColor);
      }
    }
    // Bracket icons
    this.px(ctx, 7, baseY, C.CYAN);
    this.px(ctx, 24, baseY, C.CYAN);
  }

  // 🔍 Researching: scanning rays
  drawResearchAccessory(ctx, frame) {
    const rayColor = frame === 0 ? C.CYAN : C.WHITE;
    // Scanning dots extending from visor
    this.px(ctx, 23, 10, rayColor);
    this.px(ctx, 25, 9, rayColor);
    this.px(ctx, 27, 8 + frame, rayColor);
    // Magnifying glass icon
    this.px(ctx, 27, 4, C.WHITE);
    this.px(ctx, 28, 4, C.WHITE);
    this.px(ctx, 27, 5, C.WHITE);
    this.px(ctx, 28, 5, C.WHITE);
    this.px(ctx, 29, 6, C.SILVER);
    this.px(ctx, 30, 7, C.SILVER);
  }

  // ⚡ Executing: energy sparks
  drawExecutingAccessory(ctx, frame) {
    // Energy lines around body
    const col = frame === 0 ? C.LIME : C.GREEN;
    this.px(ctx, 8, 15, col);
    this.px(ctx, 7, 17, col);
    this.px(ctx, 23, 16, col);
    this.px(ctx, 24, 18, col);
    // Terminal bracket
    this.px(ctx, 6, 14 + frame, C.LIME);
    this.px(ctx, 6, 16 + frame, C.LIME);
    this.px(ctx, 25, 15 - frame, C.LIME);
    this.px(ctx, 25, 17 - frame, C.LIME);
  }

  // 📱 Social: floating envelope/phone
  drawSocialAccessory(ctx, frame) {
    const ox = 24;
    const oy = 14 + frame;
    // Envelope shape
    this.rect(ctx, ox, oy, 5, 3, C.GOLD);
    this.px(ctx, ox, oy, C.ORANGE);
    this.px(ctx, ox + 4, oy, C.ORANGE);
    this.px(ctx, ox + 2, oy + 1, C.ORANGE);
    // Heart above
    this.px(ctx, ox + 1, oy - 1, C.CRIMSON);
    this.px(ctx, ox + 3, oy - 1, C.CRIMSON);
    this.px(ctx, ox + 2, oy - (frame === 0 ? 0 : 1), C.CRIMSON);
  }

  // 😴 Sleeping: Zzz above head
  drawSleepingAccessory(ctx, frame) {
    const yOff = frame === 0 ? 0 : -1;
    // Z letters floating up
    // Big Z
    this.px(ctx, 22, 2 + yOff, C.WHITE);
    this.px(ctx, 23, 2 + yOff, C.WHITE);
    this.px(ctx, 23, 3 + yOff, C.WHITE);
    this.px(ctx, 22, 4 + yOff, C.WHITE);
    this.px(ctx, 23, 4 + yOff, C.WHITE);
    // Small z
    this.px(ctx, 25, 4 + yOff, C.SILVER);
    this.px(ctx, 26, 4 + yOff, C.SILVER);
    this.px(ctx, 26, 5 + yOff, C.SILVER);
    this.px(ctx, 25, 6 + yOff, C.SILVER);
    this.px(ctx, 26, 6 + yOff, C.SILVER);
  }

  // 📋 Delegating: throwing a card
  drawDelegatingAccessory(ctx, frame) {
    const ox = frame === 0 ? 24 : 26;
    const oy = frame === 0 ? 11 : 9;
    // Card shape
    this.rect(ctx, ox, oy, 4, 3, C.WHITE);
    this.px(ctx, ox + 1, oy + 1, C.GOLD);
    this.px(ctx, ox + 2, oy + 1, C.GOLD);
    // Motion lines
    this.px(ctx, ox - 1, oy + 1, C.SILVER);
    if (frame === 1) {
      this.px(ctx, ox - 2, oy + 1, C.GRAY);
    }
  }

  // ⏳ Waiting: clock icon
  drawWaitingAccessory(ctx, frame) {
    const ox = 24;
    const oy = 3;
    // Clock face (circle)
    this.px(ctx, ox + 1, oy, C.GOLD);
    this.px(ctx, ox + 2, oy, C.GOLD);
    this.px(ctx, ox, oy + 1, C.GOLD);
    this.px(ctx, ox + 3, oy + 1, C.GOLD);
    this.px(ctx, ox, oy + 2, C.GOLD);
    this.px(ctx, ox + 3, oy + 2, C.GOLD);
    this.px(ctx, ox + 1, oy + 3, C.GOLD);
    this.px(ctx, ox + 2, oy + 3, C.GOLD);
    // Clock hands
    this.px(ctx, ox + 1, oy + 1, C.WHITE);
    this.px(ctx, ox + 2, oy + 1, C.WHITE);
    // Second hand moves
    if (frame === 0) {
      this.px(ctx, ox + 2, oy + 2, C.ORANGE);
    } else {
      this.px(ctx, ox + 1, oy + 2, C.ORANGE);
    }
  }

  // ─── Get Cached Sprite ──────────────────────────────────────

  getSprite(state, frame) {
    const key = `${state}_${frame}`;
    return this.cache.get(key) || this.cache.get('idle_0');
  }
}

// ─── Tile Sprites (16x16, hex-string arrays) ──────────────────

function hexToIndex(ch) {
  if (ch === '.') return 0;
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;
  if (code >= 97 && code <= 102) return code - 87;
  return 0;
}

const TILE_SPRITES = {
  floor_dark: [
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '9999999911111111',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
    '1111111199999999',
  ],
  floor_light: [
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    'ffffffff99999999',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
    '99999999ffffffff',
  ],
  wall_top: (() => {
    const r = [];
    r.push('eeeeeeeeeeeeeeee');
    r.push('efffffffffffffffe'[0] === 'e' ? 'effffffffffffffe' : 'effffffffffffffe');
    for (let i = 0; i < 11; i++) {
      r.push(i % 2 === 0 ? 'ef1f1f1f1f1f1f1e' : 'effffffffffffffe');
    }
    r.push('e111111111111111e'[0] === 'e' ? 'e11111111111111e' : 'e11111111111111e');
    r.push('1111111111111111');
    while (r.length < 16) r.push('eeeeeeeeeeeeeeee');
    return r.map(s => s.substring(0, 16).padEnd(16, 'e'));
  })(),
  wall_side: [
    'ee11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ef11111111111111',
    'ee11111111111111',
  ],
  door: [
    'eeeeeeeeeeeeeeee',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'e441111444444444',
    'e441111444444444',
    'e444444444554444',
    'e444444444554444',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'e444444444444444',
    'eeeeeeeeeeeeeeee',
  ].map(r => r.substring(0, 16)),
  computer: [
    '................',
    '..1111111111....',
    '..1bbbbbbbbb1...',
    '..1bbbbbbbbb1...',
    '..1bb1bbb1bb1...',
    '..1bbbbbbbbb1...',
    '..1bbbbbbbbb1...',
    '..11111111111...',
    '......ff........',
    '....ffffff......',
    '....ffffff......',
    '................',
    'eeeeeeeeeeeeeeee',
    'effffffffffffffE',
    'eeeeeeeeeeeeeeee',
    '................',
  ].map(r => r.substring(0, 16)),
  bookshelf: [
    '4444444444444444',
    '4334422334422344',
    '4334422334422344',
    '4334422334422344',
    '4334422334422344',
    '4444444444444444',
    '4223344223344224',
    '4223344223344224',
    '4223344223344224',
    '4223344223344224',
    '4444444444444444',
    '4344223344223344',
    '4344223344223344',
    '4344223344223344',
    '4344223344223344',
    '4444444444444444',
  ],
  plant: [
    '................',
    '................',
    '......77........',
    '.....7667.......',
    '....766767......',
    '...76677677.....',
    '...76776767.....',
    '....777677......',
    '.....7767.......',
    '......77........',
    '......44........',
    '......44........',
    '.....4444.......',
    '....444444......',
    '....444444......',
    '................',
  ],
  bed: [
    '3333333333333333',
    '3ddddddddddddd3',
    '3ddddddddddddd3',
    '3333333333333333',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3999999999999993',
    '3333333333333333',
    '..1..........1..',
    '..1..........1..',
  ].map(r => r.substring(0, 16).padEnd(16, '.')),
  meeting_table: [
    '................',
    '..4444444444....',
    '.44444444444....',
    '.44555555544....',
    '.44444444444....',
    '.44444444444....',
    '.44444444444....',
    '.44444444444....',
    '.44555555544....',
    '.44444444444....',
    '..4444444444....',
    '...4......4.....',
    '...4......4.....',
    '...4......4.....',
    '................',
    '................',
  ],
  phone: [
    '................',
    '................',
    '................',
    '................',
    '.....eeee.......',
    '.....e11e.......',
    '.....e11e.......',
    '.....e11e.......',
    '.....e55e.......',
    '.....eeee.......',
    '................',
    '..eeeeeeeeee....',
    '..efffffffffe...',
    '..efffffffffe...',
    '..eeeeeeeeee....',
    '................',
  ],
  terminal: [
    '1111111111111111',
    '1777.77.777.7711',
    '17..7..7..7.7711',
    '17..777.777.7711',
    '17..7..7.7..7711',
    '1777.77.7.7.7711',
    '1111111111111111',
    '177.7777777..111',
    '1.7.77..7.7..111',
    '1.7.7.7.77...111',
    '1.7.77..7.7..111',
    '177.7777777..111',
    '1111111111111111',
    '1.......7....111',
    '1111111111111111',
    '......ff........',
  ].map(r => r.substring(0, 16)),
  empty: Array(16).fill('................'),
};

// ─── Tile Rendering ───────────────────────────────────────────

function renderTileToCanvas(spriteData) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < 16; y++) {
    const row = spriteData[y] || '................';
    for (let x = 0; x < 16; x++) {
      const ch = row[x] || '.';
      const idx = hexToIndex(ch);
      if (idx === 0) continue;
      const color = PALETTE[idx];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

// ─── Tile Sprite Cache ────────────────────────────────────────
const tileSpriteCache = new Map();

function getCachedTile(name) {
  if (!tileSpriteCache.has(name)) {
    const data = TILE_SPRITES[name];
    if (data) {
      tileSpriteCache.set(name, renderTileToCanvas(data));
    }
  }
  return tileSpriteCache.get(name);
}

// ─── Public API: SpriteSystem ─────────────────────────────────

export class SpriteSystem {
  constructor() {
    this.hermes = new HermesDroneRenderer();

    // Pre-cache all tiles
    for (const name of Object.keys(TILE_SPRITES)) {
      getCachedTile(name);
    }
  }

  /**
   * Draw the Hermes drone agent at the given position.
   * Sprite size: 32x32. Position is top-left corner.
   */
  drawAgent(ctx, state, frame, x, y, _direction) {
    const sprite = this.hermes.getSprite(state, frame % 2);
    if (sprite) {
      ctx.drawImage(sprite, Math.floor(x), Math.floor(y));
    }
  }

  /**
   * Draw a tile sprite at the given position (16x16).
   */
  drawTile(ctx, tileName, x, y) {
    const cached = getCachedTile(tileName);
    if (cached) {
      ctx.drawImage(cached, Math.floor(x), Math.floor(y));
    }
  }

  /**
   * Get the agent sprite size.
   */
  getAgentSize() {
    return 32;
  }
}

// ─── Animation Controller ─────────────────────────────────────

export class AnimationController {
  constructor() {
    this.frame = 0;
    this.frameTimer = 0;
    this.frameDuration = 500; // ms per frame
    this.bobOffset = 0;
    this.bobTimer = 0;
  }

  update(deltaTime) {
    // Frame animation
    this.frameTimer += deltaTime;
    if (this.frameTimer >= this.frameDuration) {
      this.frameTimer -= this.frameDuration;
      this.frame = (this.frame + 1) % 2;
    }

    // Floating bob animation (smooth sine wave — drone hovering)
    this.bobTimer += deltaTime * 0.004;
    this.bobOffset = Math.sin(this.bobTimer) * 2.5;
  }

  getFrame() {
    return this.frame;
  }

  getBobOffset() {
    return this.bobOffset;
  }

  reset() {
    this.frame = 0;
    this.frameTimer = 0;
  }
}
