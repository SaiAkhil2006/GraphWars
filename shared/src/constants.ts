export const MAP_MIN = -100;
export const MAP_MAX = 100;
export const MAP_SIZE = MAP_MAX - MAP_MIN;

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export const TURN_TIMER_SECONDS = 30;
export const MAX_HEALTH = 100;
export const MAX_DAMAGE = 100;
export const BASE_DAMAGE = 10;
export const DAMAGE_MULTIPLIER = 0.45;

export const PLAYER_HITBOX_RADIUS = 4;
export const OBSTACLE_COUNT_MIN = 8;
export const OBSTACLE_COUNT_MAX = 15;
export const MIN_SPAWN_DISTANCE = 15;

export const BOT_THINK_DELAY = {
  easy: { min: 3000, max: 8000 },
  medium: { min: 1500, max: 5000 },
  hard: { min: 800, max: 2500 },
} as const;

export const XP_PER_WIN = 100;
export const XP_PER_KILL = 25;
export const XP_PER_MATCH = 10;
export const XP_PER_LEVEL = 500;

export const SOCKET_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  READY: 'player:ready',
  START_MATCH: 'match:start',
  TURN_BEGIN: 'turn:begin',
  TURN_END: 'turn:end',
  EQUATION_SUBMIT: 'equation:submit',
  LASER_FIRED: 'laser:fired',
  PLAYER_HIT: 'player:hit',
  PLAYER_ELIMINATED: 'player:eliminated',
  MATCH_END: 'match:end',
  LOBBY_CHAT: 'lobby:chat',
  RECONNECT: 'player:reconnect',
  GAME_STATE_SYNC: 'game:state',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LIST: 'room:list',
  ERROR: 'error',
}
