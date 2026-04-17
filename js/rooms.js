/**
 * rooms.js — Room/World System
 *
 * Each room is a 20x15 tile grid (320x240 virtual pixels at 16px tiles).
 * Rooms are defined by tilemaps, object placements, and spawn points.
 * The agent auto-navigates to the room corresponding to its current state.
 */

// ─── Room Definitions ─────────────────────────────────────────
// Tile legend:
// 0 = floor_dark     1 = wall_top      2 = wall_side
// 3 = door           4 = computer      5 = bookshelf
// 6 = plant          7 = bed           8 = meeting_table
// 9 = phone          A = terminal      B = floor_light
// C = empty

const TILE_MAP = {
  0: 'floor_dark',
  1: 'wall_top',
  2: 'wall_side',
  3: 'door',
  4: 'computer',
  5: 'bookshelf',
  6: 'plant',
  7: 'bed',
  8: 'meeting_table',
  9: 'phone',
  A: 'terminal',
  B: 'floor_light',
  C: 'empty',
};

function parseRoomMap(rows) {
  return rows.map(row =>
    row.split('').map(ch => TILE_MAP[ch] || 'floor_dark')
  );
}

const ROOMS = {
  hub: {
    name: 'Hub Central',
    icon: '🏠',
    bgColor: '#1a1c2c',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '20000000000000000002',
      '20000600000000060002',
      '20000000000000000002',
      '20000000BB0000000002',
      '20000000BB0000000002',
      '20000000000000000002',
      '20006000000000600002',
      '20000000000000000002',
      '23000000000000000032',
      '20000000000000000002',
      '20000000000000000002',
      '20000600000000060002',
      '20000000000000000002',
      '11111111111111111111',
    ]),
    // Door positions and their target rooms
    doors: [
      { x: 0, y: 9, target: 'social', label: 'Social' },
      { x: 19, y: 9, target: 'code_lab', label: 'Code Lab' },
    ],
    objects: [
      { type: 'plant', x: 5, y: 2 },
      { type: 'plant', x: 14, y: 2 },
      { type: 'plant', x: 5, y: 7 },
      { type: 'plant', x: 14, y: 7 },
      { type: 'plant', x: 5, y: 12 },
      { type: 'plant', x: 14, y: 12 },
    ],
  },

  code_lab: {
    name: 'Code Lab',
    icon: '💻',
    bgColor: '#16213e',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '20000000000000000002',
      '20440044004400440002',
      '20000000000000000002',
      '20000000000000000002',
      '20440044004400000002',
      '20000000000000000002',
      '20000000000000000002',
      '20000000000000000002',
      '20000000000000000002',
      '23000000000000000002',
      '20000000000000000002',
      '20005500000000550002',
      '20005500000000550002',
      '11111111111111111111',
    ]),
    doors: [
      { x: 0, y: 10, target: 'hub', label: 'Hub' },
    ],
    objects: [],
  },

  social: {
    name: 'Social Room',
    icon: '📱',
    bgColor: '#2d132c',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BBBB9000000009BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBBB2',
      '2BBBB0000000000BBB32',
      '2BBBB0000000000BBBB2',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BBBB6BBBBBBBB6BBB2',
      '2BBBBBBBBBBBBBBB0BB2',
      '11111111111111111111',
    ]),
    doors: [
      { x: 19, y: 9, target: 'hub', label: 'Hub' },
    ],
    objects: [],
  },

  research: {
    name: 'Research Center',
    icon: '🌐',
    bgColor: '#1a1a2e',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '20000005500550000002',
      '20000005500550000002',
      '20000000000000000002',
      '20000000000000000002',
      '20000000BB0000000002',
      '20000000BB0000000002',
      '20000000000000000002',
      '20000000000000000002',
      '20000000000000000032',
      '20000000000000000002',
      '20000000000000000002',
      '20550000000000055002',
      '20550000000000055002',
      '11111111111111111111',
    ]),
    doors: [
      { x: 19, y: 9, target: 'terminal', label: 'Terminal' },
    ],
    objects: [],
  },

  terminal: {
    name: 'Terminal Room',
    icon: '⚡',
    bgColor: '#0a0a0a',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '20000000000000000002',
      '20AA00AA00AA00AA0002',
      '20000000000000000002',
      '20000000000000000002',
      '20AA00AA00AA00AA0002',
      '20000000000000000002',
      '20000000000000000002',
      '20000000000000000002',
      '23000000000000000002',
      '20000000000000000002',
      '20000000000000000002',
      '20AA00AA00AA00AA0002',
      '20000000000000000002',
      '11111111111111111111',
    ]),
    doors: [
      { x: 0, y: 9, target: 'research', label: 'Research' },
    ],
    objects: [],
  },

  meeting: {
    name: 'Meeting Room',
    icon: '👥',
    bgColor: '#1b1b2f',
    spawnX: 10,
    spawnY: 8,
    tilemap: parseRoomMap([
      '11111111111111111111',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BBBB00000000BBBBB2',
      '2BBB000888000BBBBB2',
      '2BBB000888000BBBBB2',
      '2BBB000888000BBBBB2',
      '2BBB000888000BBBBB2',
      '2BBB000000000BBBBB2',
      '2BBBBBBBBBBBBBBB032',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BB6BBBBBBBBBBB6BB2',
      '2BBBBBBBBBBBBBBBBBB2',
      '2BBBBBBBBBBBBBBBBBB2',
      '11111111111111111111',
    ]),
    doors: [
      { x: 19, y: 9, target: 'hub', label: 'Hub' },
    ],
    objects: [],
  },
};

// State → Room mapping
const STATE_TO_ROOM = {
  idle: 'hub',
  thinking: 'hub',
  coding: 'code_lab',
  researching: 'research',
  social: 'social',
  executing: 'terminal',
  sleeping: 'hub',
  delegating: 'meeting',
  waiting: 'hub',
};

// ─── Room System ──────────────────────────────────────────────

export class RoomSystem {
  constructor(spriteSystem) {
    this.sprites = spriteSystem;
    this.currentRoom = 'hub';
    this.transitioning = false;
    this.transitionAlpha = 0;
    this.transitionTarget = null;
    this.transitionPhase = 'none'; // 'fade_out' | 'fade_in' | 'none'
  }

  /**
   * Get current room data
   */
  getCurrentRoom() {
    return ROOMS[this.currentRoom];
  }

  /**
   * Get room name for a given state
   */
  getRoomForState(state) {
    return STATE_TO_ROOM[state] || 'hub';
  }

  /**
   * Navigate to a room with fade transition
   */
  navigateTo(roomId) {
    if (roomId === this.currentRoom || this.transitioning) return false;
    if (!ROOMS[roomId]) return false;

    this.transitioning = true;
    this.transitionTarget = roomId;
    this.transitionPhase = 'fade_out';
    this.transitionAlpha = 0;
    return true;
  }

  /**
   * Update transition animation
   * @returns {{ done: boolean, spawnX?: number, spawnY?: number }}
   */
  update(deltaTime) {
    if (!this.transitioning) return { done: false };

    const speed = deltaTime * 0.003;

    if (this.transitionPhase === 'fade_out') {
      this.transitionAlpha = Math.min(1, this.transitionAlpha + speed);
      if (this.transitionAlpha >= 1) {
        // Switch room
        this.currentRoom = this.transitionTarget;
        this.transitionPhase = 'fade_in';
      }
    } else if (this.transitionPhase === 'fade_in') {
      this.transitionAlpha = Math.max(0, this.transitionAlpha - speed);
      if (this.transitionAlpha <= 0) {
        this.transitioning = false;
        this.transitionPhase = 'none';
        this.transitionTarget = null;

        const room = ROOMS[this.currentRoom];
        return {
          done: true,
          spawnX: room.spawnX * 16,
          spawnY: room.spawnY * 16,
        };
      }
    }

    return { done: false };
  }

  /**
   * Render the current room's tilemap
   */
  render(ctx) {
    const room = ROOMS[this.currentRoom];
    if (!room) return;

    // Draw tilemap
    for (let y = 0; y < room.tilemap.length; y++) {
      for (let x = 0; x < room.tilemap[y].length; x++) {
        const tileName = room.tilemap[y][x];
        this.sprites.drawTile(ctx, tileName, x * 16, y * 16);
      }
    }

    // Draw door labels
    for (const door of room.doors) {
      this.drawDoorLabel(ctx, door);
    }
  }

  /**
   * Draw transition overlay
   */
  renderTransition(ctx, width, height) {
    if (!this.transitioning) return;

    ctx.fillStyle = `rgba(26, 28, 44, ${this.transitionAlpha})`;
    ctx.fillRect(0, 0, width, height);

    // Show room name during transition
    if (this.transitionAlpha > 0.5 && this.transitionTarget) {
      const targetRoom = ROOMS[this.transitionTarget];
      if (targetRoom) {
        ctx.fillStyle = `rgba(244, 244, 244, ${(this.transitionAlpha - 0.5) * 2})`;
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${targetRoom.icon} ${targetRoom.name}`,
          width / 2,
          height / 2
        );
        ctx.textAlign = 'left';
      }
    }
  }

  drawDoorLabel(ctx, door) {
    const px = door.x * 16;
    const py = door.y * 16 - 10;

    ctx.fillStyle = '#ffcd75';
    ctx.font = '4px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`→ ${door.label}`, px + 8, py);
    ctx.textAlign = 'left';
  }

  /**
   * Check if a position is on a door tile
   * @returns {string|null} target room ID or null
   */
  checkDoor(tileX, tileY) {
    const room = ROOMS[this.currentRoom];
    if (!room) return null;

    for (const door of room.doors) {
      if (door.x === tileX && door.y === tileY) {
        return door.target;
      }
    }
    return null;
  }

  /**
   * Check if a tile is walkable (not a wall or obstacle)
   */
  isWalkable(tileX, tileY) {
    const room = ROOMS[this.currentRoom];
    if (!room) return false;

    if (tileY < 0 || tileY >= room.tilemap.length) return false;
    if (tileX < 0 || tileX >= room.tilemap[0].length) return false;

    const tile = room.tilemap[tileY][tileX];
    const blocked = ['wall_top', 'wall_side', 'bookshelf', 'computer', 'terminal', 'meeting_table', 'bed', 'phone'];
    return !blocked.includes(tile);
  }

  /**
   * Get all room IDs and names for the minimap
   */
  getRoomList() {
    return Object.entries(ROOMS).map(([id, room]) => ({
      id,
      name: room.name,
      icon: room.icon,
      active: id === this.currentRoom,
    }));
  }

  /**
   * Get spawn position for current room
   */
  getSpawnPosition() {
    const room = ROOMS[this.currentRoom];
    return {
      x: room.spawnX * 16,
      y: room.spawnY * 16,
    };
  }
}
