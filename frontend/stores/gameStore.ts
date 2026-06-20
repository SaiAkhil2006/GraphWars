'use client';

import { create } from 'zustand';
import type { GameState, LobbyRoom, ChatMessage } from '@graphwars/shared/src/types';

interface GameStore {
  room: LobbyRoom | null;
  game: GameState | null;
  chatMessages: ChatMessage[];
  lastLaser: { playerId: string; equation: string; path: { x: number; y: number }[] } | null;
  damageEvents: { targetId: string; damage: number; position: { x: number; y: number } }[];
  setRoom: (room: LobbyRoom | null) => void;
  setGame: (game: GameState | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setLastLaser: (laser: GameStore['lastLaser']) => void;
  addDamageEvent: (event: GameStore['damageEvents'][0]) => void;
  clearDamageEvents: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  room: null,
  game: null,
  chatMessages: [],
  lastLaser: null,
  damageEvents: [],
  setRoom: (room) => set({ room }),
  setGame: (game) => set({ game }),
  addChatMessage: (msg) =>
    set((s) => ({ chatMessages: [...s.chatMessages, msg].slice(-50) })),
  setLastLaser: (lastLaser) => set({ lastLaser }),
  addDamageEvent: (event) =>
    set((s) => ({ damageEvents: [...s.damageEvents, event] })),
  clearDamageEvents: () => set({ damageEvents: [] }),
  reset: () =>
    set({
      room: null,
      game: null,
      chatMessages: [],
      lastLaser: null,
      damageEvents: [],
    }),
}));
