'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/login');
  }, [loading, isAuthenticated, router]);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            Sign Out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Sound effects: Coming soon</p>
          <p>Graphics quality: High</p>
          <p>Notifications: Enabled</p>
        </CardContent>
      </Card>
    </div>
  );
}
