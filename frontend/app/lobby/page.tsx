'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/stores/gameStore';
import { connectSocket, emitWithAck, getSocket, SOCKET_EVENTS } from '@/lib/socket';
import { MAX_PLAYERS, MIN_PLAYERS } from '@graphwars/shared/src/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function LobbyPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const { room, setRoom, chatMessages } = useGameStore();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [mode, setMode] = useState<'multiplayer' | 'solo'>('solo');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [roomCode, setRoomCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  async function createRoom() {
    setConnecting(true);
    setError('');
    try {
      await connectSocket();
      const result = await emitWithAck<{ success: boolean; room: typeof room }>(
        SOCKET_EVENTS.ROOM_CREATE,
        { config: { maxPlayers, mode, isPrivate: false, botDifficulty } }
      );
      if (result.room) setRoom(result.room);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function joinRoom() {
    if (!roomCode.trim()) return;
    setConnecting(true);
    setError('');
    try {
      await connectSocket();
      const result = await emitWithAck<{ success: boolean; room: typeof room }>(
        SOCKET_EVENTS.ROOM_JOIN,
        { code: roomCode.trim().toUpperCase() }
      );
      if (result.room) setRoom(result.room);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function toggleReady() {
    if (!room) return;
    const me = room.players.find(p => p.odId === user?.uid && !p.isBot);
    await emitWithAck(SOCKET_EVENTS.READY, { roomId: room.id, ready: !me?.isReady });
  }

  async function startMatch() {
    if (!room) return;
    try {
      await emitWithAck(SOCKET_EVENTS.START_MATCH, { roomId: room.id });
      router.push(`/game/${room.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !chatInput.trim()) return;
    getSocket()?.emit(SOCKET_EVENTS.LOBBY_CHAT, { roomId: room.id, message: chatInput });
    setChatInput('');
  }

  const me = room?.players.find(p => p.odId === user?.uid && !p.isBot);
  const isHost = me?.isHost;
  const allReady = room?.players.filter(p => !p.isBot).every(p => p.isReady);
  const canStart = isHost && allReady && (room?.players.filter(p => !p.isBot).length ?? 0) >= MIN_PLAYERS;

  if (room) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Lobby {room.code && `· ${room.code}`}</CardTitle>
            <CardDescription>
              {room.players.filter(p => !p.isBot).length} / {room.config.maxPlayers} players · {room.config.mode} mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="grid gap-3">
              {room.players.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: player.color }}>
                        {player.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {player.username}
                        {player.isHost && ' (Host)'}
                        {player.isBot && ' (Bot)'}
                      </p>
                    </div>
                  </div>
                  <span className={player.isReady ? 'text-green-400' : 'text-muted-foreground'}>
                    {player.isReady ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 h-40 overflow-y-auto bg-secondary/20 space-y-2">
              {chatMessages.map((msg) => (
                <p key={msg.id} className="text-sm">
                  <span className="font-medium text-primary">{msg.username}: </span>
                  {msg.message}
                </p>
              ))}
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Chat..." />
              <Button type="submit" variant="secondary">Send</Button>
            </form>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={toggleReady} variant={me?.isReady ? 'secondary' : 'default'}>
                {me?.isReady ? 'Unready' : 'Ready Up'}
              </Button>
              {canStart && (
                <Button onClick={startMatch}>Start Match</Button>
              )}
              <Button variant="outline" onClick={() => setRoom(null)}>Leave Lobby</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Find a Match</h1>

      {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Play</CardTitle>
            <CardDescription>Create a new game room</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Players</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                >
                  {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
                    <option key={n} value={n}>{n} Players</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as 'multiplayer' | 'solo')}
                >
                  <option value="solo">Solo (with bots)</option>
                  <option value="multiplayer">Multiplayer</option>
                </select>
              </div>
            </div>
            {mode === 'solo' && (
              <div className="space-y-2">
                <Label>Bot Difficulty</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={botDifficulty}
                  onChange={(e) => setBotDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            )}
            <Button className="w-full" onClick={createRoom} disabled={connecting}>
              {connecting ? 'Creating...' : 'Create Room'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Join Room</CardTitle>
            <CardDescription>Enter a room code to join a private lobby</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Room Code"
              maxLength={6}
            />
            <Button variant="outline" className="w-full" onClick={joinRoom} disabled={connecting}>
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
