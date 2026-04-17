/**
 * sprites.js — Pixel Art Sprite System
 *
 * All sprites are defined as arrays of hex strings.
 * Each character maps to a color in the SNES-inspired Sweetie-16 palette.
 * '.' = transparent, '1'-'9' and 'a'-'f' = palette colors.
 *
 * Sprites are 16x16 pixels, rendered at native resolution then scaled.
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

// Hex char to palette index
function hexToIndex(ch) {
  if (ch === '.') return 0;
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48;       // '0'-'9'
  if (code >= 97 && code <= 102) return code - 87;      // 'a'-'f'
  return 0;
}

// ─── Agent Sprites (16x16 each) ───────────────────────────────
// Hooded tech-mage character, top-down view
const AGENT_SPRITES = {
  // === IDLE DOWN ===
  idle_down_0: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  idle_down_1: [
    '................',
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === IDLE UP ===
  idle_up_0: [
    '................',
    '.....99999......',
    '....9999999.....',
    '...999999999....',
    '...999999999....',
    '....9999999.....',
    '....9999999.....',
    '.....99999......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === CODING (sitting at desk) ===
  coding_0: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9aeeea9.....',
    '.....9eee9......',
    '...9222229......',
    '..92255229.bb...',
    '..92222299.bb...',
    '..92222299.bb...',
    '..99222299bbb...',
    '...999999999....',
    '...1111111......',
    '................',
    '................',
  ],
  coding_1: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9aeeea9.....',
    '.....9eee9......',
    '...92222e9......',
    '..9225529..bb...',
    '..92222299.bb...',
    '..92222e99.bb...',
    '..99222299bbb...',
    '...999999999....',
    '...1111111......',
    '................',
    '................',
  ],

  // === RESEARCHING (standing, magnifying glass) ===
  researching_0: [
    '................',
    '.....99999...bb.',
    '....9aaaaa9..b.b',
    '...9aa9b9aa9.bb.',
    '...9aadddaa9b...',
    '....9addda9b....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  researching_1: [
    '..............bb',
    '.....99999...b.b',
    '....9aaaaa9..bb.',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === EXECUTING (terminal stance, energy) ===
  executing_0: [
    '......cc........',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '.c..9aeeea9..c..',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '..c922222c......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  executing_1: [
    '................',
    '.....99999..c...',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '..c9aadddaa9....',
    '....9addda9.c...',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222..c....',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === SOCIAL (holding phone) ===
  social_0: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9.dd...',
    '....922222.dd...',
    '...9225522.dd...',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  social_1: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9aedea9.....',
    '....9aeeea9.....',
    '.....9eee9.dd...',
    '....922222.d5d..',
    '...9225522.dd...',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === THINKING (hand on chin, thought bubble) ===
  thinking_0: [
    '............dd..',
    '.....99999.d55d.',
    '....9aaaaa9.dd..',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9adeda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  thinking_1: [
    '.............dd.',
    '.....99999..d5d.',
    '....9aaaaa9.dd..',
    '...9aa9b9aa9.d..',
    '...9aadddaa9....',
    '....9adeda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222......',
    '...9225522......',
    '...922222.......',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === SLEEPING (head down, Zzz) ===
  sleeping_0: [
    '................',
    '................',
    '................',
    '................',
    '.........ddd....',
    '..........d.....',
    '.........d...d..',
    '......99999.....',
    '.....9aaaaa9....',
    '....9aa11aa9....',
    '....9aaddaa9....',
    '....992222299...',
    '...922222222....',
    '..9922222299....',
    '..999999999.....',
    '................',
  ],
  sleeping_1: [
    '................',
    '................',
    '................',
    '..........ddd...',
    '...........d....',
    '..........d.....',
    '................',
    '......99999.....',
    '.....9aaaaa9....',
    '....9aa11aa9....',
    '....9aaddaa9....',
    '....992222299...',
    '...922222222....',
    '..9922222299....',
    '..999999999.....',
    '................',
  ],

  // === WAITING (arms crossed, clock) ===
  waiting_0: [
    '................',
    '.....99999...55.',
    '....9aaaaa9.5.15',
    '...9aa9b9aa9.55.',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '...e9222229e....',
    '...9225225229...',
    '...9222222229...',
    '...922222229....',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  waiting_1: [
    '................',
    '.....99999...55.',
    '....9aaaaa9.51.5',
    '...9aa9b9aa9.55.',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '...e9222229e....',
    '...9222552229...',
    '...9222222229...',
    '...922222229....',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],

  // === DELEGATING (pointing forward) ===
  delegating_0: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222e.....',
    '...9225522.e....',
    '...922222...e5..',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
  delegating_1: [
    '................',
    '.....99999......',
    '....9aaaaa9.....',
    '...9aa9b9aa9....',
    '...9aadddaa9....',
    '....9addda9.....',
    '....9aeeea9.....',
    '.....9eee9......',
    '....922222e.....',
    '...9225522.e....',
    '...922222..e5...',
    '...922222.......',
    '....92229.......',
    '....91.19.......',
    '....11.11.......',
    '................',
  ],
};

// ─── Tile Sprites (16x16 each) ────────────────────────────────
const TILE_SPRITES = {
  // Floor - checkered dark pattern
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
  // Floor - lighter
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
  // Wall top
  wall_top: [
    'eeeeeeeeeeeeeeee',
    'efffffffffffffffE',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'ef1f1f1f1f1f1f1e',
    'efffffffffffffe',
    'e11111111111111e',
    '1111111111111111',
  ].map(r => r.substring(0, 16).padEnd(16, 'e')),
  // Wall side
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
  // Door
  door: [
    'eeeeeeeeeeeeeeee',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44111144444444e',
    'e44111144444444e',
    'e44444444455444e',
    'e44444444455444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'e44444444444444e',
    'eeeeeeeeeeeeeeee',
  ].map(r => r.substring(0, 16)),
  // Computer/Monitor
  computer: [
    '................',
    '..1111111111....',
    '..1bbbbbbb1....',
    '..1bbbbbbb1....',
    '..1bb1bbb1b1....',
    '..1bbbbbbb1....',
    '..1bbbbbbb1....',
    '..1111111111....',
    '......ff........',
    '....ffffff......',
    '....ffffff......',
    '................',
    'eeeeeeeeeeeeeeee',
    'efffffffffffffe',
    'eeeeeeeeeeeeeeee',
    '................',
  ].map(r => r.substring(0, 16)),
  // Bookshelf
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
  // Plant
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
  // Bed
  bed: [
    '3333333333333333',
    '3ddddddddddddd3',
    '3ddddddddddddd3',
    '3333333333333333',
    '3333333333333333',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '399999999999993',
    '3333333333333333',
    '..1..........1..',
    '..1..........1..',
  ].map(r => r.substring(0, 16).padEnd(16, '.')),
  // Meeting table
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
  // Phone/Device on desk
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
  // Terminal screen (green on black)
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
    '11111111111111111',
    '......ff........',
  ].map(r => r.substring(0, 16)),
  // Empty/transparent
  empty: Array(16).fill('................'),
};

// ─── Sprite Rendering ─────────────────────────────────────────

/**
 * Pre-renders a sprite definition to an ImageData-compatible buffer.
 * Returns a canvas that can be drawn with drawImage for performance.
 */
function renderSpriteToCanvas(spriteData) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < 16; y++) {
    const row = spriteData[y] || '................';
    for (let x = 0; x < 16; x++) {
      const ch = row[x] || '.';
      const idx = hexToIndex(ch);
      if (idx === 0) continue; // transparent

      const color = PALETTE[idx];
      if (!color) continue;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas;
}

// ─── Sprite Cache ─────────────────────────────────────────────
const spriteCache = new Map();

function getCachedSprite(name, spriteData) {
  if (!spriteCache.has(name)) {
    spriteCache.set(name, renderSpriteToCanvas(spriteData));
  }
  return spriteCache.get(name);
}

// ─── Public API ───────────────────────────────────────────────

export class SpriteSystem {
  constructor() {
    // Pre-cache all sprites on init
    for (const [name, data] of Object.entries(AGENT_SPRITES)) {
      getCachedSprite(`agent_${name}`, data);
    }
    for (const [name, data] of Object.entries(TILE_SPRITES)) {
      getCachedSprite(`tile_${name}`, data);
    }
  }

  /**
   * Draw an agent sprite at the given position.
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} state - Agent state (idle, coding, etc.)
   * @param {number} frame - Animation frame (0 or 1)
   * @param {number} x - X position in virtual pixels
   * @param {number} y - Y position in virtual pixels
   * @param {string} direction - 'down' or 'up' (for idle/walking)
   */
  drawAgent(ctx, state, frame, x, y, direction = 'down') {
    const frameIdx = frame % 2;
    let spriteName;

    // Map state to sprite name
    switch (state) {
      case 'idle':
      case 'waiting':
      case 'delegating':
        spriteName = `${state}_${direction}_${frameIdx}`;
        if (!AGENT_SPRITES[spriteName]) {
          spriteName = `${state}_${frameIdx}`;
        }
        if (!AGENT_SPRITES[spriteName]) {
          spriteName = `idle_down_${frameIdx}`;
        }
        break;
      default:
        spriteName = `${state}_${frameIdx}`;
        if (!AGENT_SPRITES[spriteName]) {
          spriteName = `idle_down_${frameIdx}`;
        }
        break;
    }

    const cached = getCachedSprite(`agent_${spriteName}`, AGENT_SPRITES[spriteName]);
    if (cached) {
      ctx.drawImage(cached, Math.floor(x), Math.floor(y));
    }
  }

  /**
   * Draw a tile sprite at the given position.
   */
  drawTile(ctx, tileName, x, y) {
    const data = TILE_SPRITES[tileName];
    if (!data) return;

    const cached = getCachedSprite(`tile_${tileName}`, data);
    if (cached) {
      ctx.drawImage(cached, Math.floor(x), Math.floor(y));
    }
  }

  /**
   * Get available agent states for animation.
   */
  getAgentStates() {
    const states = new Set();
    for (const key of Object.keys(AGENT_SPRITES)) {
      const state = key.replace(/_\d+$/, '').replace(/_down$|_up$/, '');
      states.add(state);
    }
    return [...states];
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

    // Idle bob animation (smooth sine wave)
    this.bobTimer += deltaTime * 0.003;
    this.bobOffset = Math.sin(this.bobTimer) * 1.5;
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
