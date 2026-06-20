'use client';

import { useEffect } from 'react';
import { connectSocket, getSocket, disconnectSocket, SOCKET_EVENTS } from '@/lib/socket';
import { useGameStore } from '@/stores/gameStore';
import type { GameState, LobbyRoom } from '@graphwars/shared';

export function useSocket() {
  const { setRoom, setGame, addChatMessage, setLastLaser, addDamageEvent } = useGameStore();

  useEffect(() => {
    let mounted = true;

    connectSocket().then((socket) => {
      if (!mounted) return;

      socket.on(SOCKET_EVENTS.GAME_STATE_SYNC, (data: { room?: LobbyRoom; game?: GameState }) => {
        if (data.room) setRoom(data.room);
        if (data.game) setGame(data.game);
      });

      socket.on(SOCKET_EVENTS.PLAYER_JOIN, (data: { room: LobbyRoom }) => {
        setRoom(data.room);
      });

      socket.on(SOCKET_EVENTS.PLAYER_LEAVE, (data: { room: LobbyRoom }) => {
        setRoom(data.room);
      });

      socket.on(SOCKET_EVENTS.READY, (data: { room: LobbyRoom }) => {
        setRoom(data.room);
      });

      socket.on(SOCKET_EVENTS.START_MATCH, (data: { game: GameState }) => {
        setGame(data.game);
      });

      socket.on(SOCKET_EVENTS.TURN_BEGIN, (data: { game: GameState }) => {
        setGame(data.game);
      });

      socket.on(SOCKET_EVENTS.TURN_END, (data: { game: GameState }) => {
        setGame(data.game);
      });

      socket.on(SOCKET_EVENTS.LASER_FIRED, (data: {
        playerId: string;
        equation: string;
        laser: { path: { x: number; y: number }[] };
        game: GameState;
      }) => {
        setGame(data.game);
        setLastLaser({
          playerId: data.playerId,
          equation: data.equation,
          path: data.laser.path,
        });
      });

      socket.on(SOCKET_EVENTS.PLAYER_HIT, (data: {
        targetId: string;
        damage: number;
        position: { x: number; y: number };
      }) => {
        addDamageEvent(data);
      });

      socket.on(SOCKET_EVENTS.PLAYER_ELIMINATED, () => {});

      socket.on(SOCKET_EVENTS.MATCH_END, (data: { game: GameState }) => {
        setGame(data.game);
      });

      socket.on(SOCKET_EVENTS.LOBBY_CHAT, (msg) => {
        addChatMessage(msg);
      });
    }).catch(console.error);

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [setRoom, setGame, addChatMessage, setLastLaser, addDamageEvent]);

  return getSocket();
}
