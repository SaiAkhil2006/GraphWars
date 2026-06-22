import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '@graphwars/shared/src/constants.ts';
import { verifyIdToken } from '../config/firebase.ts';
import { gameService } from '../services/gameService.ts';

interface SocketUser {
  uid: string;
  username: string;
  avatar?: string;
}

export function setupSocketHandlers(io: Server): void {
  // -----------------------------
  // AUTH MIDDLEWARE
  // -----------------------------
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required (no token)'));
      }

      const decoded = await verifyIdToken(token);

      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user: SocketUser = {
        uid: decoded.uid,
        username:
          socket.handshake.auth?.username ||
          `Player_${decoded.uid.slice(0, 6)}`,
        avatar: socket.handshake.auth?.avatar,
      };

      socket.data.user = user;
      next();
    } catch (err) {
      console.error('AUTH ERROR:', err);
      next(new Error('Auth middleware failed'));
    }
  });

  // -----------------------------
  // CONNECTION ERROR DEBUGGING
  // -----------------------------
  io.engine.on('connection_error', (err) => {
    console.log('🚨 ENGINE CONNECTION ERROR:', err.message);
  });

  // -----------------------------
  // MAIN CONNECTION
  // -----------------------------
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;

    console.log(`🟢 Connected: ${user.username} (${socket.id})`);

    // -----------------------------
    // ROOM CREATE
    // -----------------------------
    socket.on(SOCKET_EVENTS.ROOM_CREATE, (data, callback) => {
      try {
        const room = gameService.createRoom(
          user.uid,
          user.username,
          data?.config ?? {}
        );

        const player = room.players[0];

        gameService.bindSocket(socket.id, room.id, player.id);

        socket.join(room.id);

        callback?.({ success: true, room });

        io.to(room.id).emit(SOCKET_EVENTS.GAME_STATE_SYNC, { room });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // -----------------------------
    // ROOM JOIN
    // -----------------------------
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (data, callback) => {
      try {
        const roomId = data?.roomId || data?.code;

        if (!roomId) {
          callback?.({ success: false, error: 'Room ID required' });
          return;
        }

        const room = gameService.joinRoom(
          roomId,
          user.uid,
          user.username,
          user.avatar
        );

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

        io.to(room.id).emit(SOCKET_EVENTS.PLAYER_JOIN, {
          player,
          room,
        });

        io.to(room.id).emit(SOCKET_EVENTS.GAME_STATE_SYNC, { room });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // -----------------------------
    // DISCONNECT
    // -----------------------------
    socket.on('disconnect', (reason) => {
      const binding = gameService.unbindSocket(socket.id);

      if (binding) {
        const room = gameService.getRoom(binding.roomId);

        if (room && !room.isStarted) {
          const updated = gameService.leaveRoom(
            binding.roomId,
            user.uid
          );

          if (updated) {
            io.to(binding.roomId).emit(
              SOCKET_EVENTS.PLAYER_LEAVE,
              {
                uid: user.uid,
                room: updated,
              }
            );
          }
        }
      }

      console.log(`🔴 Disconnected: ${user.username} (${reason})`);
    });
  });
}