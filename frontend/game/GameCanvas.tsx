'use client';

import { useEffect, useRef, useCallback } from 'react';
import { BattlefieldRenderer } from './BattlefieldRenderer';
import { useGameStore } from '@/stores/gameStore';
import type { GameState } from '@graphwars/shared';

interface GameCanvasProps {
  game: GameState;
}

export function GameCanvas({ game }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BattlefieldRenderer | null>(null);
  const { lastLaser, damageEvents, clearDamageEvents } = useGameStore();

  useEffect(() => {
    const renderer = new BattlefieldRenderer();
    rendererRef.current = renderer;

    if (containerRef.current) {
      renderer.init(containerRef.current).then(() => {
        renderer.updateGameState(game);
      });
    }

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.updateGameState(game);
  }, [game]);

  useEffect(() => {
    if (lastLaser && rendererRef.current) {
      const shooter = game.players.find(p => p.id === lastLaser.playerId);
      rendererRef.current.animateLaser(
        lastLaser.path,
        shooter?.color ?? '#00ffff',
        () => {}
      );
    }
  }, [lastLaser, game.players]);

  useEffect(() => {
    if (damageEvents.length > 0 && rendererRef.current) {
      for (const event of damageEvents) {
        rendererRef.current.showDamageIndicator(event.position, event.damage);
        if (event.damage >= 50) {
          rendererRef.current.showExplosion(event.position);
        }
      }
      clearDamageEvents();
    }
  }, [damageEvents, clearDamageEvents]);

  return (
    <div
      ref={containerRef}
      className="rounded-lg overflow-hidden border border-border shadow-2xl mx-auto"
      style={{ width: 700, height: 700 }}
    />
  );
}
