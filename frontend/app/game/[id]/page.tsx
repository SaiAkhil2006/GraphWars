'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/stores/gameStore';
import { connectSocket, emitWithAck, SOCKET_EVENTS } from '@/lib/socket';
import { validateEquation, TURN_TIMER_SECONDS } from '@graphwars/shared';
import { GameCanvas } from '@/game/GameCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock } from 'lucide-react';

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.id as string;
  const { user, loading, isAuthenticated } = useAuth();
  const { game, setGame } = useGameStore();
  const [equation, setEquation] = useState('');
  const [eqError, setEqError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_TIMER_SECONDS);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!roomId) return;
    connectSocket().then(() => {
      emitWithAck(SOCKET_EVENTS.RECONNECT, { roomId }).then((result: { game?: typeof game }) => {
        if (result.game) setGame(result.game);
      }).catch(() => router.push('/lobby'));
    });
  }, [roomId, setGame, router]);

  useEffect(() => {
    if (!game?.turnEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((game.turnEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 200);
    return () => clearInterval(interval);
  }, [game?.turnEndsAt, game?.turnNumber]);

  const myPlayer = game?.players.find(p => p.odId === user?.uid && !p.isBot);
  const currentPlayer = game?.players.find(p => p.id === game?.currentPlayerId);
  const isMyTurn = myPlayer?.id === game?.currentPlayerId && !myPlayer?.isEliminated;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMyTurn || !game) return;

    const validation = validateEquation(equation);
    if (!validation.valid) {
      setEqError(validation.error ?? 'Invalid equation');
      return;
    }

    setEqError('');
    setSubmitting(true);
    try {
      await emitWithAck(SOCKET_EVENTS.EQUATION_SUBMIT, {
        roomId: game.matchId,
        equation: equation.startsWith('y=') ? equation : `y = ${equation}`,
      });
      setEquation('');
    } catch (err) {
      setEqError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [isMyTurn, game, equation]);

  if (!game) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  if (game.phase === 'finished') {
    const winner = game.players.find(p => p.id === game.winnerId);
    const isWinner = winner?.odId === user?.uid;

    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <Card>
          <CardHeader>
            <Trophy className={`h-16 w-16 mx-auto mb-4 ${isWinner ? 'text-yellow-400' : 'text-muted-foreground'}`} />
            <CardTitle className="text-3xl">
              {isWinner ? 'Victory!' : `${winner?.username} Wins!`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Match Statistics</h3>
              {game.players.map((p) => (
                <div key={p.id} className="flex justify-between p-2 rounded bg-secondary/30">
                  <span>{p.username} {p.isBot && '(Bot)'}</span>
                  <span>{p.isEliminated ? 'Eliminated' : `${p.health} HP`}</span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground">{game.moves.length} turns played</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/lobby')}>Play Again</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div>
          <GameCanvas game={game} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span>Turn {game.turnNumber}</span>
                <span className="flex items-center gap-1 text-sm font-normal">
                  <Clock className="h-4 w-4" />
                  {timeLeft}s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {isMyTurn ? "It's your turn!" : `${currentPlayer?.username}'s turn`}
              </p>
              <Progress value={(timeLeft / TURN_TIMER_SECONDS) * 100} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Fire Equation</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <span className="flex items-center text-muted-foreground text-sm">y =</span>
                  <Input
                    value={equation}
                    onChange={(e) => { setEquation(e.target.value); setEqError(''); }}
                    placeholder="sin(x / 10) * 20"
                    disabled={!isMyTurn || submitting}
                    className="font-mono"
                  />
                </div>
                {eqError && <p className="text-destructive text-xs">{eqError}</p>}
                <Button type="submit" className="w-full" disabled={!isMyTurn || submitting || !equation.trim()}>
                  {submitting ? 'Firing...' : 'Fire Laser'}
                </Button>
              </form>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Examples: x, x^2, sin(x), cos(x), sqrt(abs(x))</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {game.players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded text-sm ${
                    p.id === game.currentPlayerId ? 'bg-primary/20 border border-primary/30' : 'bg-secondary/30'
                  } ${p.isEliminated ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{p.username}</span>
                  </div>
                  <span>{p.isEliminated ? 'OUT' : `${p.health} HP`}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
