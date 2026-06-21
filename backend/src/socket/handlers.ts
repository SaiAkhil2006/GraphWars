import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@graphwars/shared/src/constants.js';
import { verifyIdToken } from '../config/firebase.js';
import { gameService } from '../services/gameService.js';

interface SocketUser {
  uid: string;
  username: string;
  avatar?: string;
}

export function setupSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }
    socket.data.user = {
      uid: decoded.uid,
      username: socket.handshake.auth?.username || `Player_${decoded.uid.slice(0, 6)}`,
      avatar: socket.handshake.auth?.avatar,
    } as SocketUser;
    next();
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`Player connected: ${user.username} (${socket.id})`);

    socket.on(SOCKET_EVENTS.ROOM_CREATE, (data, callback) => {
      try {
        const room = gameService.createRoom(user.uid, user.username, data?.config ?? {});
        const player = room.players[0];
        gameService.bindSocket(socket.id, room.id, player.id);
        socket.join(room.id);
        callback?.({ success: true, room });
        io.to(room.id).emit(SOCKET_EVENTS.GAME_STATE_SYNC, { room });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_JOIN, (data, callback) => {
      try {
        const roomId = data?.roomId || data?.code;
        if (!roomId) {
          callback?.({ success: false, error: 'Room ID required' });
          return;
        }
        const room = gameService.joinRoom(roomId, user.uid, user.username, user.avatar);
        if (!room) {
          callback?.({ success: false, error: 'Room not found or full' });
          return;
        }
        const player = room.players.find(
  p => p.odId === user.uid && !p.isBot
);
        if (player) {
          gameService.bindSocket(socket.id, room.id, player.id);
        }
        socket.join(room.id);
        callback?.({ success: true, room });
        io.to(room.id).emit(SOCKET_EVENTS.PLAYER_JOIN, { player, room });
        io.to(room.id).emit(SOCKET_EVENTS.GAME_STATE_SYNC, { room });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_LIST, (_data, callback) => {
      const rooms = gameService.getPublicRooms();
      callback?.({ rooms });
    });

    socket.on(SOCKET_EVENTS.READY, (data, callback) => {
      const roomId = data?.roomId;
      if (!roomId) return;

      const room = gameService.setReady(roomId, user.uid, data?.ready ?? true);
      if (room) {
        io.to(roomId).emit(SOCKET_EVENTS.READY, {
          odId: user.uid,
          ready: data?.ready ?? true,
          room,
        });
        callback?.({ success: true, room });
      }
    });

    socket.on(SOCKET_EVENTS.START_MATCH, (data, callback) => {
      const roomId = data?.roomId;
      const room = gameService.getRoom(roomId);
      if (!room || room.hostId !== user.uid) {
        callback?.({ success: false, error: 'Only host can start' });
        return;
      }

      const game = gameService.startMatch(roomId);
      if (!game) {
        callback?.({ success: false, error: 'Cannot start match' });
        return;
      }

      io.to(roomId).emit(SOCKET_EVENTS.START_MATCH, { game });
      io.to(roomId).emit(SOCKET_EVENTS.TURN_BEGIN, {
        currentPlayerId: game.currentPlayerId,
        turnNumber: game.turnNumber,
        turnEndsAt: game.turnEndsAt,
        game,
      });

      startTurnManagement(io, roomId);
      callback?.({ success: true, game });
    });

    socket.on(SOCKET_EVENTS.EQUATION_SUBMIT, (data, callback) => {
      const roomId = data?.roomId;
      const equation = data?.equation;
      const binding = gameService.getSocketBinding(socket.id);
      const playerId = binding?.playerId;

      if (!roomId || !equation || !playerId) {
        callback?.({ success: false, error: 'Invalid submission' });
        return;
      }

      const result = gameService.submitEquation(roomId, playerId, equation);
      if ('error' in result) {
        callback?.({ success: false, error: result.error });
        return;
      }

      const { game, laser } = result;

      io.to(roomId).emit(SOCKET_EVENTS.LASER_FIRED, {
        playerId,
        equation,
        laser,
        game,
      });

      for (const hit of laser.hits) {
        io.to(roomId).emit(SOCKET_EVENTS.PLAYER_HIT, {
          targetId: hit.targetId,
          damage: hit.damage,
          position: hit.position,
          shooterId: playerId,
        });

        const target = game.players.find(p => p.id === hit.targetId);
        if (target?.isEliminated) {
          io.to(roomId).emit(SOCKET_EVENTS.PLAYER_ELIMINATED, {
            playerId: hit.targetId,
            eliminatedBy: playerId,
          });
        }
      }

      if (game.phase === 'finished') {
        io.to(roomId).emit(SOCKET_EVENTS.MATCH_END, {
          winnerId: game.winnerId,
          game,
        });
        gameService.cleanupRoom(roomId);
      } else {
        io.to(roomId).emit(SOCKET_EVENTS.TURN_END, { game });
        io.to(roomId).emit(SOCKET_EVENTS.TURN_BEGIN, {
          currentPlayerId: game.currentPlayerId,
          turnNumber: game.turnNumber,
          turnEndsAt: game.turnEndsAt,
          game,
        });
        startTurnManagement(io, roomId);
      }

      callback?.({ success: true, laser, game });
    });

    socket.on(SOCKET_EVENTS.LOBBY_CHAT, (data) => {
      const roomId = data?.roomId;
      if (!roomId || !data?.message) return;
      io.to(roomId).emit(SOCKET_EVENTS.LOBBY_CHAT, {
        id: `${Date.now()}-${socket.id}`,
        odId: user.uid,
        username: user.username,
        message: data.message.slice(0, 200),
        timestamp: Date.now(),
      });
    });

    socket.on(SOCKET_EVENTS.RECONNECT, (data, callback) => {
      const roomId = data?.roomId;
      const game = gameService.getGame(roomId);
      const room = gameService.getRoom(roomId);

      if (game) {
        socket.join(roomId);
        callback?.({ success: true, game });
      } else if (room) {
        socket.join(roomId);
        const player = room.players.find(p => p.odId === user.uid && !p.isBot);
        if (player) gameService.bindSocket(socket.id, room.id, player.id);
        callback?.({ success: true, room });
      } else {
        callback?.({ success: false, error: 'Session not found' });
      }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      const binding = gameService.unbindSocket(socket.id);
      if (binding) {
        const room = gameService.getRoom(binding.roomId);
        if (room && !room.isStarted) {
          const updated = gameService.leaveRoom(binding.roomId, user.uid);
          if (updated) {
            io.to(binding.roomId).emit(SOCKET_EVENTS.PLAYER_LEAVE, {
              odId: user.uid,
              room: updated,
            });
          }
        }
      }
      console.log(`Player disconnected: ${user.username}`);
    });
  });
}

function startTurnManagement(io: Server, roomId: string): void {
  const game = gameService.getGame(roomId);
  if (!game || game.phase !== 'playing') return;

  gameService.startTurnTimer(roomId, () => {
    const updated = gameService.skipTurn(roomId);
    if (!updated) return;

    io.to(roomId).emit(SOCKET_EVENTS.TURN_END, { game: updated, skipped: true });

    if (updated.phase === 'finished') {
      io.to(roomId).emit(SOCKET_EVENTS.MATCH_END, {
        winnerId: updated.winnerId,
        game: updated,
      });
      gameService.cleanupRoom(roomId);
    } else {
      io.to(roomId).emit(SOCKET_EVENTS.TURN_BEGIN, {
        currentPlayerId: updated.currentPlayerId,
        turnNumber: updated.turnNumber,
        turnEndsAt: updated.turnEndsAt,
        game: updated,
      });
      startTurnManagement(io, roomId);
    }
  });

  gameService.scheduleBotTurn(roomId, (equation) => {
    const currentGame = gameService.getGame(roomId);
    if (!currentGame?.currentPlayerId) return;

    const result = gameService.submitEquation(roomId, currentGame.currentPlayerId, equation);
    if ('error' in result) return;

    const { game, laser } = result;

    io.to(roomId).emit(SOCKET_EVENTS.LASER_FIRED, {
      playerId: currentGame.currentPlayerId,
      equation,
      laser,
      game,
    });

    for (const hit of laser.hits) {
      io.to(roomId).emit(SOCKET_EVENTS.PLAYER_HIT, {
        targetId: hit.targetId,
        damage: hit.damage,
        position: hit.position,
        shooterId: currentGame.currentPlayerId,
      });

      const target = game.players.find(p => p.id === hit.targetId);
      if (target?.isEliminated) {
        io.to(roomId).emit(SOCKET_EVENTS.PLAYER_ELIMINATED, {
          playerId: hit.targetId,
          eliminatedBy: currentGame.currentPlayerId,
        });
      }
    }

    if (game.phase === 'finished') {
      io.to(roomId).emit(SOCKET_EVENTS.MATCH_END, {
        winnerId: game.winnerId,
        game,
      });
      gameService.cleanupRoom(roomId);
    } else {
      io.to(roomId).emit(SOCKET_EVENTS.TURN_END, { game });
      io.to(roomId).emit(SOCKET_EVENTS.TURN_BEGIN, {
        currentPlayerId: game.currentPlayerId,
        turnNumber: game.turnNumber,
        turnEndsAt: game.turnEndsAt,
        game,
      });
      startTurnManagement(io, roomId);
    }
  });
}
