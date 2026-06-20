'use client';

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from 'pixi.js';
import {
  MAP_MIN,
  MAP_MAX,
  type GameState,
  type Obstacle,
  type PlayerState,
  type Point,
} from '@graphwars/shared';

const CANVAS_SIZE = 700;
const PADDING = 40;

export class BattlefieldRenderer {
  private app: Application | null = null;
  private worldContainer: Container | null = null;
  private gridGraphics: Graphics | null = null;
  private obstacleContainer: Container | null = null;
  private playerContainer: Container | null = null;
  private laserGraphics: Graphics | null = null;
  private effectContainer: Container | null = null;
  private container: HTMLElement | null = null;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    this.app = new Application();
    await this.app.init({
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      backgroundColor: 0x0a0e1a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    this.worldContainer = new Container();
    this.app.stage.addChild(this.worldContainer);

    this.gridGraphics = new Graphics();
    this.obstacleContainer = new Container();
    this.playerContainer = new Container();
    this.laserGraphics = new Graphics();
    this.effectContainer = new Container();

    this.worldContainer.addChild(this.gridGraphics);
    this.worldContainer.addChild(this.obstacleContainer);
    this.worldContainer.addChild(this.laserGraphics);
    this.worldContainer.addChild(this.playerContainer);
    this.worldContainer.addChild(this.effectContainer);

    this.calculateTransform();
    this.drawGrid();
  }

  private calculateTransform(): void {
    const mapRange = MAP_MAX - MAP_MIN;
    const usable = CANVAS_SIZE - PADDING * 2;
    this.scale = usable / mapRange;
    this.offsetX = CANVAS_SIZE / 2;
    this.offsetY = CANVAS_SIZE / 2;
  }

  toScreen(point: Point): { x: number; y: number } {
    return {
      x: this.offsetX + point.x * this.scale,
      y: this.offsetY - point.y * this.scale,
    };
  }

  private drawGrid(): void {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();

    const gridStep = 20;
    const style = { color: 0x1e293b, alpha: 0.6, width: 1 };

    for (let x = MAP_MIN; x <= MAP_MAX; x += gridStep) {
      const start = this.toScreen({ x, y: MAP_MIN });
      const end = this.toScreen({ x, y: MAP_MAX });
      this.gridGraphics.moveTo(start.x, start.y);
      this.gridGraphics.lineTo(end.x, end.y);
      this.gridGraphics.stroke(style);
    }

    for (let y = MAP_MIN; y <= MAP_MAX; y += gridStep) {
      const start = this.toScreen({ x: MAP_MIN, y });
      const end = this.toScreen({ x: MAP_MAX, y });
      this.gridGraphics.moveTo(start.x, start.y);
      this.gridGraphics.lineTo(end.x, end.y);
      this.gridGraphics.stroke(style);
    }

    const axisStyle = { color: 0x475569, alpha: 0.9, width: 2 };
    const xStart = this.toScreen({ x: MAP_MIN, y: 0 });
    const xEnd = this.toScreen({ x: MAP_MAX, y: 0 });
    this.gridGraphics.moveTo(xStart.x, xStart.y);
    this.gridGraphics.lineTo(xEnd.x, xEnd.y);
    this.gridGraphics.stroke(axisStyle);

    const yStart = this.toScreen({ x: 0, y: MAP_MIN });
    const yEnd = this.toScreen({ x: 0, y: MAP_MAX });
    this.gridGraphics.moveTo(yStart.x, yStart.y);
    this.gridGraphics.lineTo(yEnd.x, yEnd.y);
    this.gridGraphics.stroke(axisStyle);

    const borderStyle = { color: 0x6366f1, alpha: 0.5, width: 2 };
    const corners = [
      { x: MAP_MIN, y: MAP_MIN },
      { x: MAP_MAX, y: MAP_MIN },
      { x: MAP_MAX, y: MAP_MAX },
      { x: MAP_MIN, y: MAP_MAX },
    ];
    const screenCorners = corners.map(c => this.toScreen(c));
    this.gridGraphics.moveTo(screenCorners[0].x, screenCorners[0].y);
    for (let i = 1; i < screenCorners.length; i++) {
      this.gridGraphics.lineTo(screenCorners[i].x, screenCorners[i].y);
    }
    this.gridGraphics.closePath();
    this.gridGraphics.stroke(borderStyle);
  }

  renderObstacles(obstacles: Obstacle[]): void {
    if (!this.obstacleContainer) return;
    this.obstacleContainer.removeChildren();

    for (const obs of obstacles) {
      const g = new Graphics();
      const color = 0x374151;

      switch (obs.shape) {
        case 'circle': {
          const pos = this.toScreen(obs.center);
          const r = (obs.radius ?? 5) * this.scale;
          g.circle(pos.x, pos.y, r);
          g.fill({ color, alpha: 0.85 });
          g.stroke({ color: 0x6b7280, width: 2 });
          break;
        }
        case 'rectangle': {
          const pos = this.toScreen(obs.center);
          const w = (obs.width ?? 10) * this.scale;
          const h = (obs.height ?? 10) * this.scale;
          g.rect(pos.x - w / 2, pos.y - h / 2, w, h);
          g.fill({ color, alpha: 0.85 });
          g.stroke({ color: 0x6b7280, width: 2 });
          break;
        }
        case 'triangle':
        case 'polygon': {
          if (obs.points.length > 0) {
            const first = this.toScreen(obs.points[0]);
            g.moveTo(first.x, first.y);
            for (let i = 1; i < obs.points.length; i++) {
              const p = this.toScreen(obs.points[i]);
              g.lineTo(p.x, p.y);
            }
            g.closePath();
            g.fill({ color, alpha: 0.85 });
            g.stroke({ color: 0x6b7280, width: 2 });
          }
          break;
        }
      }

      this.obstacleContainer.addChild(g);
    }
  }

  renderPlayers(players: PlayerState[], currentPlayerId?: string | null): void {
    if (!this.playerContainer) return;
    this.playerContainer.removeChildren();

    for (const player of players) {
      if (player.isEliminated) continue;

      const pos = this.toScreen(player.position);
      const isCurrent = player.id === currentPlayerId;
      const radius = 8;

      const circle = new Graphics();
      const color = parseInt(player.color.replace('#', ''), 16);

      if (isCurrent) {
        circle.circle(pos.x, pos.y, radius + 6);
        circle.stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
      }

      circle.circle(pos.x, pos.y, radius);
      circle.fill({ color, alpha: 1 });
      circle.stroke({ color: 0xffffff, width: 2 });

      const nameStyle = new TextStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: 11,
        fill: 0xffffff,
        fontWeight: 'bold',
      });
      const name = new Text({
        text: player.username,
        style: nameStyle,
      });
      name.anchor.set(0.5, 0);
      name.x = pos.x;
      name.y = pos.y + radius + 4;

      const hpBar = new Graphics();
      const barWidth = 30;
      const hpPercent = player.health / 100;
      hpBar.rect(pos.x - barWidth / 2, pos.y - radius - 10, barWidth, 4);
      hpBar.fill({ color: 0x1f2937, alpha: 0.8 });
      hpBar.rect(pos.x - barWidth / 2, pos.y - radius - 10, barWidth * hpPercent, 4);
      hpBar.fill({ color: hpPercent > 0.3 ? 0x22c55e : 0xef4444, alpha: 1 });

      this.playerContainer.addChild(circle);
      this.playerContainer.addChild(hpBar);
      this.playerContainer.addChild(name);
    }
  }

  async animateLaser(
    path: Point[],
    color: string = '#00ffff',
    onComplete?: () => void
  ): Promise<void> {
    if (!this.laserGraphics || !this.app || path.length < 2) {
      onComplete?.();
      return;
    }

    this.laserGraphics.clear();
    const laserColor = parseInt(color.replace('#', ''), 16) || 0x00ffff;
    const stepDelay = 15;
    let currentIndex = 1;

    return new Promise((resolve) => {
      const animate = () => {
        if (currentIndex >= path.length) {
          onComplete?.();
          resolve();
          return;
        }

        this.laserGraphics!.clear();

        const trailStart = Math.max(0, currentIndex - 20);
        for (let i = trailStart; i < currentIndex; i++) {
          const alpha = (i - trailStart) / 20;
          const p1 = this.toScreen(path[i]);
          const p2 = this.toScreen(path[i + 1] || path[i]);
          this.laserGraphics!.moveTo(p1.x, p1.y);
          this.laserGraphics!.lineTo(p2.x, p2.y);
          this.laserGraphics!.stroke({
            color: laserColor,
            width: 3,
            alpha: 0.3 + alpha * 0.7,
          });
        }

        const head = this.toScreen(path[currentIndex]);
        this.laserGraphics!.circle(head.x, head.y, 5);
        this.laserGraphics!.fill({ color: 0xffffff, alpha: 1 });
        this.laserGraphics!.circle(head.x, head.y, 8);
        this.laserGraphics!.stroke({ color: laserColor, width: 2, alpha: 0.8 });

        currentIndex++;
        setTimeout(animate, stepDelay);
      };

      animate();
    });
  }

  showDamageIndicator(position: Point, damage: number): void {
    if (!this.effectContainer) return;

    const pos = this.toScreen(position);
    const text = new Text({
      text: `-${damage}`,
      style: new TextStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: 18,
        fill: 0xef4444,
        fontWeight: 'bold',
      }),
    });
    text.anchor.set(0.5);
    text.x = pos.x;
    text.y = pos.y - 20;
    text.alpha = 1;

    this.effectContainer.addChild(text);

    let frame = 0;
    const animate = () => {
      frame++;
      text.y -= 1.5;
      text.alpha = 1 - frame / 40;
      if (frame < 40) {
        requestAnimationFrame(animate);
      } else {
        this.effectContainer?.removeChild(text);
        text.destroy();
      }
    };
    requestAnimationFrame(animate);
  }

  showExplosion(position: Point): void {
    if (!this.effectContainer) return;

    const pos = this.toScreen(position);
    const explosion = new Graphics();

    let frame = 0;
    const animate = () => {
      frame++;
      explosion.clear();
      const radius = frame * 2;
      const alpha = 1 - frame / 25;
      explosion.circle(pos.x, pos.y, radius);
      explosion.fill({ color: 0xff6b35, alpha: alpha * 0.6 });
      explosion.circle(pos.x, pos.y, radius * 0.6);
      explosion.fill({ color: 0xffd700, alpha: alpha * 0.8 });

      if (frame === 1) {
        this.effectContainer?.addChild(explosion);
      }

      if (frame < 25) {
        requestAnimationFrame(animate);
      } else {
        this.effectContainer?.removeChild(explosion);
        explosion.destroy();
      }
    };
    requestAnimationFrame(animate);
  }

  updateGameState(game: GameState): void {
    this.renderObstacles(game.obstacles);
    this.renderPlayers(game.players, game.currentPlayerId);
  }

  clearLaser(): void {
    this.laserGraphics?.clear();
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
