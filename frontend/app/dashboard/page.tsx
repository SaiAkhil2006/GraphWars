'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Play, Trophy, User, Swords } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatWinRate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  if (loading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const profile = data?.user;
  const xpProgress = profile ? (profile.xp % 500) / 5 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar || user?.photoURL || undefined} />
                  <AvatarFallback className="text-2xl">{profile?.username?.[0] ?? 'P'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile?.username}</CardTitle>
                  <CardDescription>Level {profile?.level} · {profile?.xp} XP</CardDescription>
                  <Progress value={xpProgress} className="mt-2 w-48" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold text-primary">{profile?.wins}</p>
                  <p className="text-sm text-muted-foreground">Wins</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold">{profile?.losses}</p>
                  <p className="text-sm text-muted-foreground">Losses</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold">{formatWinRate(profile?.wins ?? 0, profile?.matchesPlayed ?? 0)}</p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold">{profile?.elo}</p>
                  <p className="text-sm text-muted-foreground">ELO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Recent Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.recentMatches?.length > 0 ? (
                <div className="space-y-3">
                  {data.recentMatches.map((match: { matchId: string; winnerUsername: string; mode: string; createdAt: string; players: { odId: string; placement: number }[] }) => {
                    const myPlacement = match.players.find((p: { odId: string }) => p.odId === profile?.uid)?.placement;
                    const won = match.winnerUsername === profile?.username;
                    return (
                      <div key={match.matchId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                        <div>
                          <p className="font-medium">{won ? 'Victory' : `Placed #${myPlacement}`}</p>
                          <p className="text-sm text-muted-foreground">{match.mode} · {new Date(match.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span className={won ? 'text-green-400 font-bold' : 'text-muted-foreground'}>
                          {won ? 'WIN' : `#${myPlacement}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No matches yet. Start playing!</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button asChild size="lg" className="w-full h-16 text-lg">
            <Link href="/lobby">
              <Play className="mr-2 h-5 w-5" />
              Play Now
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/leaderboard">
              <Trophy className="mr-2 h-5 w-5" />
              Leaderboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/profile">
              <User className="mr-2 h-5 w-5" />
              Profile
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
