'use client';

import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@graphwars/shared/src/constants';
import { getIdToken, auth } from './firebase';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getIdToken();
  const user = auth.currentUser;

  socket = io(SOCKET_URL, {
    auth: {
      token,
      username: user?.displayName || `Player_${user?.uid?.slice(0, 6)}`,
      avatar: user?.photoURL,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  return new Promise((resolve, reject) => {
    socket!.on('connect', () => resolve(socket!));
    socket!.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Socket connection timeout')), 10000);
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitWithAck<T>(event: string, data?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }
    socket.emit(event, data, (response: T & { success?: boolean; error?: string }) => {
      if (response && 'success' in response && !response.success) {
        reject(new Error(response.error || 'Request failed'));
      } else {
        resolve(response);
      }
    });
  });
}

export { SOCKET_EVENTS };
