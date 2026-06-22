import {
  MAP_MIN,
  MAP_MAX,
  BASE_DAMAGE,
  DAMAGE_MULTIPLIER,
  MAX_DAMAGE,
  PLAYER_HITBOX_RADIUS,
  MIN_SPAWN_DISTANCE,
} from './constants.ts';
import type { Point, Obstacle, PlayerState, LaserResult, LaserHit } from './types.ts';
import { generateGraphPoints, parseEquation } from './equationParser.ts';

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isOutOfBounds(p: Point): boolean {
  return p.x < MAP_MIN || p.x > MAP_MAX || p.y < MAP_MIN || p.y > MAP_MAX;
}

function calculateDamage(distanceTravelled: number): number {
  return Math.min(MAX_DAMAGE, Math.round(BASE_DAMAGE + distanceTravelled * DAMAGE_MULTIPLIER));
}

function pointInCircle(point: Point, center: Point, radius: number): boolean {
  return distance(point, center) <= radius;
}

function pointInRect(point: Point, center: Point, width: number, height: number): boolean {
  const halfW = width / 2;
  const halfH = height / 2;
  return (
    point.x >= center.x - halfW &&
    point.x <= center.x + halfW &&
    point.y >= center.y - halfH &&
    point.y <= center.y + halfH
  );
}

function pointInTriangle(point: Point, vertices: Point[]): boolean {
  if (vertices.length < 3) return false;
  const [a, b, c] = vertices;
  const sign = (p1: Point, p2: Point, p3: Point) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    if ((yi > point.y) !== (yj > point.y) &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointHitsObstacle(point: Point, obstacle: Obstacle): boolean {
  switch (obstacle.shape) {
    case 'circle':
      return pointInCircle(point, obstacle.center, obstacle.radius ?? 5);
    case 'rectangle':
      return pointInRect(point, obstacle.center, obstacle.width ?? 10, obstacle.height ?? 10);
    case 'triangle':
      return pointInTriangle(point, obstacle.points);
    case 'polygon':
      return pointInPolygon(point, obstacle.points);
    default:
      return false;
  }
}

export function pointHitsPlayer(
  point: Point,
  player: PlayerState,
  excludeId?: string
): boolean {
  if (player.id === excludeId || player.isEliminated) return false;
  return distance(point, player.position) <= PLAYER_HITBOX_RADIUS;
}

function findClosestPointIndex(path: Point[], position: Point): number {
  let minDist = Infinity;
  let idx = 0;
  for (let i = 0; i < path.length; i++) {
    const d = distance(path[i], position);
    if (d < minDist) {
      minDist = d;
      idx = i;
    }
  }
  return idx;
}

export function computeLaserTrajectory(
  equation: string,
  shooter: PlayerState,
  players: PlayerState[],
  obstacles: Obstacle[]
): LaserResult {
  const parsed = parseEquation(equation);
  const fullPath = generateGraphPoints(parsed, 0.5);

  if (fullPath.length === 0) {
    return {
      path: [],
      hits: [],
      stoppedAt: shooter.position,
      stopReason: 'complete',
      totalDistance: 0,
    };
  }

  const startIdx = findClosestPointIndex(fullPath, shooter.position);
  const hits: LaserHit[] = [];
  const laserPath: Point[] = [fullPath[startIdx]];
  let totalDistance = 0;
  let stoppedAt: Point | null = null;
  let stopReason: LaserResult['stopReason'] = 'complete';

  const directions = [
    { start: startIdx, step: 1 },
    { start: startIdx, step: -1 },
  ];

  for (const dir of directions) {
    let travelled = 0;
    let i = dir.start + dir.step;

    while (i >= 0 && i < fullPath.length) {
      const point = fullPath[i];
      const prev = laserPath[laserPath.length - 1];
      const segDist = distance(prev, point);
      travelled += segDist;
      totalDistance += segDist;

      if (isOutOfBounds(point)) {
        stoppedAt = prev;
        stopReason = 'boundary';
        break;
      }

      for (const obstacle of obstacles) {
        if (pointHitsObstacle(point, obstacle)) {
          stoppedAt = prev;
          stopReason = 'obstacle';
          i = fullPath.length;
          break;
        }
      }

      if (stopReason === 'obstacle') break;

      for (const player of players) {
        if (pointHitsPlayer(point, player, shooter.id)) {
          const dmg = calculateDamage(travelled);
          hits.push({
            targetId: player.id,
            damage: dmg,
            position: { ...point },
            distanceTravelled: travelled,
          });
          stoppedAt = point;
          stopReason = 'player';
          i = fullPath.length;
          break;
        }
      }

      if (stopReason === 'player') break;

      laserPath.push(point);
      i += dir.step;
    }
  }

  return {
    path: laserPath,
    hits,
    stoppedAt,
    stopReason,
    totalDistance,
  };
}

export function generateObstacles(count: number): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const shapes: Obstacle['shape'][] = ['rectangle', 'circle', 'triangle', 'polygon'];

  for (let i = 0; i < count; i++) {
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const center: Point = {
      x: MAP_MIN + 20 + Math.random() * (MAP_MAX - MAP_MIN - 40),
      y: MAP_MIN + 20 + Math.random() * (MAP_MAX - MAP_MIN - 40),
    };

    const id = `obs-${i}-${Date.now()}`;

    switch (shape) {
      case 'circle':
        obstacles.push({
          id,
          shape,
          center,
          radius: 5 + Math.random() * 10,
          points: [],
        });
        break;
      case 'rectangle':
        obstacles.push({
          id,
          shape,
          center,
          width: 8 + Math.random() * 15,
          height: 8 + Math.random() * 15,
          points: [],
        });
        break;
      case 'triangle': {
        const size = 8 + Math.random() * 12;
        const points: Point[] = [
          { x: center.x, y: center.y + size },
          { x: center.x - size, y: center.y - size / 2 },
          { x: center.x + size, y: center.y - size / 2 },
        ];
        obstacles.push({ id, shape, center, points });
        break;
      }
      case 'polygon': {
        const sides = 5 + Math.floor(Math.random() * 3);
        const radius = 6 + Math.random() * 10;
        const points: Point[] = [];
        for (let s = 0; s < sides; s++) {
          const angle = (2 * Math.PI * s) / sides;
          points.push({
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          });
        }
        obstacles.push({ id, shape, center, points });
        break;
      }
    }
  }

  return obstacles;
}

export function generateSpawnPosition(
  obstacles: Obstacle[],
  existingPlayers: PlayerState[]
): Point {
  for (let attempt = 0; attempt < 100; attempt++) {
    const pos: Point = {
      x: MAP_MIN + 15 + Math.random() * (MAP_MAX - MAP_MIN - 30),
      y: MAP_MIN + 15 + Math.random() * (MAP_MAX - MAP_MIN - 30),
    };

    let valid = true;

    for (const obs of obstacles) {
      if (pointHitsObstacle(pos, obs)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      for (const player of existingPlayers) {
        if (distance(pos, player.position) < MIN_SPAWN_DISTANCE) {
          valid = false;
          break;
        }
      }
    }

    if (valid) return pos;
  }

  return {
    x: MAP_MIN + 10 + Math.random() * 20,
    y: MAP_MIN + 10 + Math.random() * 20,
  };
}

const PLAYER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9',
];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
