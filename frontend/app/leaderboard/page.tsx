'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Medal } from 'lucide-react';

const sortOptions = [
  { value: 'wins', label: 'Wins' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'elo', label: 'ELO' },
  { value: 'xp', label: 'XP' },
] as const;

export default function LeaderboardPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const [sort, setSort] = useState<string>('wins');

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', sort],
    queryFn: () => api.getLeaderboard(sort),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-400" />
          Leaderboard
        </h1>
        <div className="flex gap-2">
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={sort === opt.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="space-y-2">
              {data?.leaderboard?.map((entry: {
                rank: number;
                uid: string;
                username: string;
                avatar?: string;
                level: number;
                wins: number;
                winRate: number;
                elo: number;
                xp: number;
              }) => (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-4 p-3 rounded-lg ${
                    entry.rank <= 3 ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'
                  }`}
                >
                  <span className="w-8 text-center font-bold">
                    {entry.rank <= 3 ? (
                      <Medal className={`h-5 w-5 mx-auto ${
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-gray-300' : 'text-amber-600'
                      }`} />
                    ) : (
                      `#${entry.rank}`
                    )}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={entry.avatar} />
                    <AvatarFallback>{entry.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{entry.username}</p>
                    <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-bold">{entry.wins} wins</p>
                    <p className="text-muted-foreground">
                      {sort === 'elo' ? `${entry.elo} ELO` :
                       sort === 'xp' ? `${entry.xp} XP` :
                       `${entry.winRate}% WR`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
