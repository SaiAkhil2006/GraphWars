'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crosshair, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/lobby', label: 'Play' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

  const hideNav = ['/', '/login', '/register'].includes(pathname);

  if (hideNav) return null;

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 font-bold text-xl">
          <Crosshair className="h-6 w-6 text-primary" />
          <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            GraphWars
          </span>
        </Link>

        {isAuthenticated && (
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-primary',
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL ?? undefined} />
                <AvatarFallback>{user?.displayName?.[0] ?? 'P'}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
