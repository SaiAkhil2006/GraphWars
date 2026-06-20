'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatWinRate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
    enabled: isAuthenticated,
  });

  const updateMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (data?.user?.username) setUsername(data.user.username);
  }, [data?.user?.username]);

  if (loading || isLoading) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading...</div>;
  }

  const profile = data?.user;
  const stats = data?.stats;
  const xpProgress = profile ? (profile.xp % 500) / 5 : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar || user?.photoURL || undefined} />
              <AvatarFallback className="text-3xl">{profile?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{profile?.username}</CardTitle>
              <CardDescription>{profile?.email}</CardDescription>
              <p className="text-sm mt-1">Level {profile?.level} · ELO {profile?.elo}</p>
              <Progress value={xpProgress} className="mt-2 w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xl font-bold">{profile?.matchesPlayed}</p>
              <p className="text-xs text-muted-foreground">Matches</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xl font-bold">{formatWinRate(profile?.wins ?? 0, profile?.matchesPlayed ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-xl font-bold">{stats?.accuracy ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>

          {stats && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Total Damage:</span> {stats.totalDamage}</p>
              <p><span className="text-muted-foreground">Favorite Function:</span> y = {stats.favoriteFunction}</p>
              <p><span className="text-muted-foreground">Avg Placement:</span> #{stats.averagePlacement}</p>
            </div>
          )}

          <div className="space-y-3 pt-4 border-t border-border">
            <Label>Update Username</Label>
            <div className="flex gap-2">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
              <Button
                onClick={() => updateMutation.mutate({ username })}
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
