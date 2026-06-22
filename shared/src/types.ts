import { BOT_THINK_DELAY } from './constants.ts';

export type BotDifficulty = keyof typeof BOT_THINK_DELAY;
export type MatchMode = 'multiplayer' | 'solo';
export type MatchPhase = 'lobby' | 'battlefield' | 'playing' | 'finished';
export type ObstacleShape = 'rectangle' | 'circle' | 'triangle' | 'polygon';
export type LeaderboardSort = 'wins' | 'winRate' | 'elo' | 'xp';

export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  id: string;
  shape: ObstacleShape;
  points: Point[];
  center: Point;
  radius?: number;
  width?: number;
  height?: number;
}

export interface PlayerState {
  id: string;
  odId: string;
  username: string;
  avatar?: string;
  position: Point;
  health: number;
  isReady: boolean;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  isEliminated: boolean;
  isHost: boolean;
  color: string;
}

export interface LaserResult {
  path: Point[];
  hits: LaserHit[];
  stoppedAt: Point | null;
  stopReason: 'obstacle' | 'boundary' | 'complete' | 'player';
  totalDistance: number;
}

export interface LaserHit {
  targetId: string;
  damage: number;
  position: Point;
  distanceTravelled: number;
}

export interface GameMove {
  playerId: string;
  equation: string;
  turn: number;
  timestamp: number;
  hits: LaserHit[];
  damageDealt: number;
}

export interface MatchConfig {
  maxPlayers: number;
  mode: MatchMode;
  isPrivate: boolean;
  roomCode?: string;
  botDifficulty: BotDifficulty;
}

export interface GameState {
  matchId: string;
  phase: MatchPhase;
  players: PlayerState[];
  obstacles: Obstacle[];
  currentTurnIndex: number;
  currentPlayerId: string | null;
  turnNumber: number;
  turnEndsAt: number | null;
  moves: GameMove[];
  winnerId: string | null;
  config: MatchConfig;
}

export interface LobbyRoom {
  id: string;
  code: string;
  hostId: string;
  players: PlayerState[];
  config: MatchConfig;
  isStarted: boolean;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  avatar?: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  elo: number;
  createdAt: string;
}

export interface MatchHistory {
  matchId: string;
  players: { odId: string; username: string; placement: number; damageDealt: number }[];
  winner: string;
  duration: number;
  moves: GameMove[];
  createdAt: string;
}

export interface UserStats {
  totalDamage: number;
  accuracy: number;
  favoriteFunction: string;
  averagePlacement: number;
}

export interface ChatMessage {
  id: string;
  odId: string;
  username: string;
  message: string;
  timestamp: number;
}
