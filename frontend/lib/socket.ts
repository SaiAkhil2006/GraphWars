'use client';

import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@graphwars/shared/src/constants';
import { getIdToken, auth } from './firebase';
import { waitForAuth} from './helper';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const user = await waitForAuth(); 

  const token = await user.getIdToken();
  if (!token) throw new Error('Missing Firebase token');

  socket = io(SOCKET_URL, {
    auth: {
      token,
      username:
        user.displayName || `Player_${user.uid.slice(0, 6)}`,
      avatar: user.photoURL,
    },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('connect', () => {
    console.log('CONNECTED:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('CONNECT ERROR:', err.message);
  });

  return new Promise((resolve, reject) => {
    socket!.once('connect', () => resolve(socket!));
    socket!.once('connect_error', reject);
    setTimeout(() => reject(new Error('Socket timeout')), 10000);
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

    socket.emit(event, data, (response: any) => {
      if (response?.success === false) {
        reject(new Error(response.error || 'Request failed'));
      } else {
        resolve(response);
      }
    });
  });
}

export { SOCKET_EVENTS };