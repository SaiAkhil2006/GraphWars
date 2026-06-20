import Link from 'next/link';
import { Crosshair, Zap, Users, Trophy, FunctionSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: FunctionSquare,
    title: 'Math as Weapons',
    description: 'Enter equations like y = sin(x) or y = x^2 to fire laser trajectories along graph paths.',
  },
  {
    icon: Users,
    title: '2–10 Player Battles',
    description: 'Multiplayer lobbies or solo mode with AI bots filling empty slots.',
  },
  {
    icon: Zap,
    title: 'Strategic Combat',
    description: 'Longer laser paths deal more damage. Obstacles block shots. Last player standing wins.',
  },
  {
    icon: Trophy,
    title: 'Ranked Leaderboards',
    description: 'Climb the ranks by wins, XP, ELO, and win rate. Track your match history and stats.',
  },
];

const howToPlay = [
  'Join a lobby with 2–10 players and ready up.',
  'Spawn on a coordinate plane with random obstacles.',
  'On your turn, enter a mathematical equation (y = ...).',
  'Your laser travels along the graph curve.',
  'Hit enemies for damage. Obstacles and borders stop your laser.',
  'Eliminate all opponents to win the match.',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-purple-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <Crosshair className="h-16 w-16 text-primary animate-pulse-slow" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-primary to-purple-400 bg-clip-text text-transparent">
              GraphWars
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Turn-based mathematical battle royale. Plot equations. Fire lasers. Eliminate opponents.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" className="animate-glow">
                <Link href="/register">Play Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
              <CardHeader>
                <f.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{f.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How To Play</h2>
        <div className="max-w-2xl mx-auto">
          <ol className="space-y-4">
            {howToPlay.map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </span>
                <p className="text-muted-foreground pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Battle?</h2>
        <p className="text-muted-foreground mb-8">Join thousands of players in the ultimate math combat arena.</p>
        <Button asChild size="lg">
          <Link href="/register">Create Account</Link>
        </Button>
      </section>
    </div>
  );
}
