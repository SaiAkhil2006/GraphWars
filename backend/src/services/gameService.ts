import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  LobbyRoom,
  PlayerState,
  MatchConfig,
  GameMove,
  BotDifficulty,
  MAX_HEALTH,
  TURN_TIMER_SECONDS,
  MIN_PLAYERS,
  MAX_PLAYERS,
  OBSTACLE_COUNT_MIN,
  OBSTACLE_COUNT_MAX,
  generateObstacles,
  generateSpawnPosition,
  getPlayerColor,
  computeLaserTrajectory,
  validateEquation,
  generateBotEquation,
  getBotThinkDelay,
  XP_PER_WIN,
  XP_PER_KILL,
  XP_PER_MATCH,
  XP_PER_LEVEL,
} from '@graphwars/shared/src';
import { User } from '../models/User';
import { Match } from '../models/Match';
import { Statistics } from '../models/Statistics';

const BOT_NAMES = [
  'AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot',
  'EpsilonBot', 'ZetaBot', 'EtaBot', 'ThetaBot',
];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class GameService {
  private rooms = new Map<string, LobbyRoom>();
  private games = new Map<string, GameState>();
  private turnTimers = new Map<string, NodeJS.Timeout>();
  private botTimers = new Map<string, NodeJS.Timeout>();
  private socketToRoom = new Map<string, string>();
  private socketToPlayer = new Map<string, string>();

  createRoom(hostId: string, hostUsername: string, config: Partial<MatchConfig>): LobbyRoom {
    const roomId = uuidv4();
    const room: LobbyRoom = {
      id: roomId,
      code: config.isPrivate ? generateRoomCode() : '',
      hostId,
      players: [{
        id: uuidv4(),
        odId: hostId,
        username: hostUsername,
        position: { x: 0, y: 0 },
        health: MAX_HEALTH,
        isReady: false,
        isBot: false,
        isEliminated: false,
        isHost: true,
        color: getPlayerColor(0),
      }],
      config: {
        maxPlayers: config.maxPlayers ?? 4,
        mode: config.mode ?? 'multiplayer',
        isPrivate: config.isPrivate ?? false,
        roomCode: config.roomCode,
        botDifficulty: config.botDifficulty ?? 'medium',
      },
      isStarted: false,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, odId: string, username: string, avatar?: string): LobbyRoom | null {
    const room = this.rooms.get(roomId) ?? this.findRoomByCode(roomId);
    if (!room || room.isStarted) return null;
    if (room.players.length >= room.config.maxPlayers) return null;
    if (room.players.some(p => p.odId === odId && !p.isBot)) return room;

    room.players.push({
      id: uuidv4(),
      odId,
      username,
      avatar,
      position: { x: 0, y: 0 },
      health: MAX_HEALTH,
      isReady: false,
      isBot: false,
      isEliminated: false,
      isHost: false,
      color: getPlayerColor(room.players.length),
    });

    return room;
  }

  findRoomByCode(code: string): LobbyRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.code === code.toUpperCase()) return room;
    }
    return undefined;
  }

  getRoom(roomId: string): LobbyRoom | undefined {
    return this.rooms.get(roomId) ?? this.findRoomByCode(roomId);
  }

  getPublicRooms(): LobbyRoom[] {
    return Array.from(this.rooms.values()).filter(
      r => !r.isStarted && !r.config.isPrivate && r.players.length < r.config.maxPlayers
    );
  }

  setReady(roomId: string, odId: string, ready: boolean): LobbyRoom | null {
    const room = this.getRoom(roomId);
    if (!room) return null;
    const player = room.players.find(p => p.odId === odId && !p.isBot);
    if (player) player.isReady = ready;
    return room;
  }

  leaveRoom(roomId: string, odId: string): LobbyRoom | null {
    const room = this.getRoom(roomId);
    if (!room || room.isStarted) return null;

    room.players = room.players.filter(p => p.odId !== odId || p.isBot);

    if (room.players.length === 0) {
      this.rooms.delete(room.id);
      return null;
    }

    if (!room.players.some(p => p.isHost)) {
      const first = room.players.find(p => !p.isBot);
      if (first) first.isHost = true;
      room.hostId = first?.odId ?? room.hostId;
    }

    return room;
  }

  canStart(room: LobbyRoom): boolean {
    const humans = room.players.filter(p => !p.isBot);
    return humans.length >= MIN_PLAYERS && humans.every(p => p.isReady);
  }

  startMatch(roomId: string): GameState | null {
    const room = this.getRoom(roomId);
    if (!room || !this.canStart(room)) return null;

    room.isStarted = true;
    let players = [...room.players];

    if (room.config.mode === 'solo' && players.length < room.config.maxPlayers) {
      const botsNeeded = room.config.maxPlayers - players.length;
      for (let i = 0; i < botsNeeded; i++) {
        players.push({
          id: uuidv4(),
          odId: `bot-${uuidv4()}`,
          username: BOT_NAMES[i % BOT_NAMES.length],
          position: { x: 0, y: 0 },
          health: MAX_HEALTH,
          isReady: true,
          isBot: true,
          botDifficulty: room.config.botDifficulty,
          isEliminated: false,
          isHost: false,
          color: getPlayerColor(players.length),
        });
      }
    }

    const obstacleCount = OBSTACLE_COUNT_MIN +
      Math.floor(Math.random() * (OBSTACLE_COUNT_MAX - OBSTACLE_COUNT_MIN));
    const obstacles = generateObstacles(obstacleCount);

    const spawnedPlayers: PlayerState[] = [];
    for (const player of players) {
      const pos = generateSpawnPosition(obstacles, spawnedPlayers);
      spawnedPlayers.push({ ...player, position: pos, isReady: true });
    }

    const alivePlayers = spawnedPlayers.filter(p => !p.isEliminated);
    const gameState: GameState = {
      matchId: room.id,
      phase: 'playing',
      players: spawnedPlayers,
      obstacles,
      currentTurnIndex: 0,
      currentPlayerId: alivePlayers[0]?.id ?? null,
      turnNumber: 1,
      turnEndsAt: Date.now() + TURN_TIMER_SECONDS * 1000,
      moves: [],
      winnerId: null,
      config: room.config,
    };

    this.games.set(room.id, gameState);
    return gameState;
  }

  getGame(matchId: string): GameState | undefined {
    return this.games.get(matchId);
  }

  submitEquation(
    matchId: string,
    playerId: string,
    equation: string
  ): { game: GameState; laser: ReturnType<typeof computeLaserTrajectory> } | { error: string } {
    const game = this.games.get(matchId);
    if (!game || game.phase !== 'playing') return { error: 'Game not active' };
    if (game.currentPlayerId !== playerId) return { error: 'Not your turn' };

    const validation = validateEquation(equation);
    if (!validation.valid) return { error: validation.error ?? 'Invalid equation' };

    const shooter = game.players.find(p => p.id === playerId);
    if (!shooter || shooter.isEliminated) return { error: 'Player not found' };

    const laser = computeLaserTrajectory(equation, shooter, game.players, game.obstacles);

    let totalDamageDealt = 0;
    for (const hit of laser.hits) {
      const target = game.players.find(p => p.id === hit.targetId);
      if (target) {
        target.health = Math.max(0, target.health - hit.damage);
        totalDamageDealt += hit.damage;
        if (target.health <= 0) {
          target.isEliminated = true;
        }
      }
    }

    const move: GameMove = {
      playerId,
      equation,
      turn: game.turnNumber,
      timestamp: Date.now(),
      hits: laser.hits,
      damageDealt: totalDamageDealt,
    };
    game.moves.push(move);

    this.clearTurnTimer(matchId);
    this.advanceTurn(game);

    return { game, laser };
  }

  skipTurn(matchId: string): GameState | null {
    const game = this.games.get(matchId);
    if (!game || game.phase !== 'playing') return null;

    this.clearTurnTimer(matchId);
    this.advanceTurn(game);
    return game;
  }

  private advanceTurn(game: GameState): void {
    const alive = game.players.filter(p => !p.isEliminated);

    if (alive.length <= 1) {
      game.phase = 'finished';
      game.winnerId = alive[0]?.id ?? null;
      game.currentPlayerId = null;
      game.turnEndsAt = null;
      this.clearTurnTimer(game.matchId);
      this.saveMatchResults(game);
      return;
    }

    let nextIndex = (game.currentTurnIndex + 1) % game.players.length;
    let attempts = 0;
    while (game.players[nextIndex].isEliminated && attempts < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    game.currentTurnIndex = nextIndex;
    game.currentPlayerId = game.players[nextIndex].id;
    game.turnNumber++;
    game.turnEndsAt = Date.now() + TURN_TIMER_SECONDS * 1000;
  }

  startTurnTimer(matchId: string, onExpire: () => void): void {
    this.clearTurnTimer(matchId);
    const timer = setTimeout(() => {
      onExpire();
    }, TURN_TIMER_SECONDS * 1000);
    this.turnTimers.set(matchId, timer);
  }

  clearTurnTimer(matchId: string): void {
    const timer = this.turnTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(matchId);
    }
  }

  scheduleBotTurn(matchId: string, onBotFire: (equation: string) => void): void {
    const game = this.games.get(matchId);
    if (!game || !game.currentPlayerId) return;

    const current = game.players.find(p => p.id === game.currentPlayerId);
    if (!current?.isBot) return;

    this.clearBotTimer(matchId);
    const delay = getBotThinkDelay(current.botDifficulty ?? 'medium');
    const timer = setTimeout(() => {
      const equation = generateBotEquation(current, game.players);
      onBotFire(equation);
    }, delay);
    this.botTimers.set(matchId, timer);
  }

  clearBotTimer(matchId: string): void {
    const timer = this.botTimers.get(matchId);
    if (timer) {
      clearTimeout(timer);
      this.botTimers.delete(matchId);
    }
  }

  private async saveMatchResults(game: GameState): Promise<void> {
    try {
      const winner = game.players.find(p => p.id === game.winnerId);
      const duration = game.moves.length > 0
        ? game.moves[game.moves.length - 1].timestamp - game.moves[0].timestamp
        : 0;

      const placements = [...game.players]
        .sort((a, b) => {
          if (a.isEliminated && !b.isEliminated) return 1;
          if (!a.isEliminated && b.isEliminated) return -1;
          return b.health - a.health;
        })
        .map((p, i) => ({ player: p, placement: i + 1 }));

      await Match.create({
        matchId: game.matchId,
        players: placements.map(({ player, placement }) => ({
          odId: player.odId,
          username: player.username,
          placement,
          damageDealt: game.moves
            .filter(m => m.playerId === player.id)
            .reduce((sum, m) => sum + m.damageDealt, 0),
          isBot: player.isBot,
        })),
        winner: winner?.odId ?? '',
        winnerUsername: winner?.username ?? 'Unknown',
        duration,
        moves: game.moves,
        mode: game.config.mode,
      });

      for (const { player, placement } of placements) {
        if (player.isBot) continue;

        const isWinner = player.id === game.winnerId;
        const kills = game.moves.filter(m =>
          m.playerId === player.id && m.hits.length > 0
        ).reduce((sum, m) => sum + m.hits.filter(h => {
          const target = game.players.find(p => p.id === h.targetId);
          return target?.isEliminated;
        }).length, 0);

        const xpGain = XP_PER_MATCH + (isWinner ? XP_PER_WIN : 0) + kills * XP_PER_KILL;

        const user = await User.findOneAndUpdate(
          { uid: player.odId },
          {
            $inc: {
              matchesPlayed: 1,
              wins: isWinner ? 1 : 0,
              losses: isWinner ? 0 : 1,
              xp: xpGain,
              elo: isWinner ? 25 : -15,
            },
          },
          { new: true }
        );

        if (user) {
          const newLevel = Math.floor(user.xp / XP_PER_LEVEL) + 1;
          if (newLevel > user.level) {
            await User.updateOne({ uid: player.odId }, { level: newLevel });
          }
        }

        const playerMoves = game.moves.filter(m => m.playerId === player.id);
        const totalDamage = playerMoves.reduce((s, m) => s + m.damageDealt, 0);
        const totalHits = playerMoves.reduce((s, m) => s + m.hits.length, 0);

        const stats = await Statistics.findOne({ odId: player.odId });
        const funcUsage: Record<string, number> = {};
        for (const m of playerMoves) {
          funcUsage[m.equation] = (funcUsage[m.equation] || 0) + 1;
        }

        if (stats) {
          const existingUsage = stats.functionUsage instanceof Map
            ? Object.fromEntries(stats.functionUsage)
            : (stats.functionUsage as Record<string, number>) ?? {};
          const allUsage = { ...existingUsage, ...funcUsage };
          const favorite = Object.entries(allUsage).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'x';
          const newPlacements = [...stats.placements, placement];
          const newShots = stats.totalShots + playerMoves.length;
          const newHits = stats.totalHits + totalHits;

          await Statistics.updateOne(
            { odId: player.odId },
            {
              $inc: { totalDamage, totalShots: playerMoves.length, totalHits: totalHits },
              favoriteFunction: favorite,
              placements: newPlacements,
              averagePlacement: newPlacements.reduce((a, b) => a + b, 0) / newPlacements.length,
              accuracy: newShots > 0 ? (newHits / newShots) * 100 : 0,
            }
          );
        } else {
          const favorite = Object.entries(funcUsage).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'x';
          await Statistics.create({
            odId: player.odId,
            totalDamage,
            totalShots: playerMoves.length,
            totalHits,
            favoriteFunction: favorite,
            functionUsage: funcUsage,
            placements: [placement],
            averagePlacement: placement,
            accuracy: playerMoves.length > 0 ? (totalHits / playerMoves.length) * 100 : 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to save match results:', err);
    }
  }

  bindSocket(socketId: string, roomId: string, playerId: string): void {
    this.socketToRoom.set(socketId, roomId);
    this.socketToPlayer.set(socketId, playerId);
  }

  getSocketBinding(socketId: string): { roomId: string; playerId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    const playerId = this.socketToPlayer.get(socketId);
    if (roomId && playerId) return { roomId, playerId };
    return null;
  }

  unbindSocket(socketId: string): { roomId: string; playerId: string } | null {
    const roomId = this.socketToRoom.get(socketId);
    const playerId = this.socketToPlayer.get(socketId);
    this.socketToRoom.delete(socketId);
    this.socketToPlayer.delete(socketId);
    if (roomId && playerId) return { roomId, playerId };
    return null;
  }

  cleanupRoom(roomId: string): void {
    this.rooms.delete(roomId);
    this.games.delete(roomId);
    this.clearTurnTimer(roomId);
    this.clearBotTimer(roomId);
  }
}

export const gameService = new GameService();
