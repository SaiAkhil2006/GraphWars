import type { BotDifficulty, PlayerState, Point } from './types';
import { BOT_THINK_DELAY } from './constants';

const EASY_EQUATIONS = [
  'x',
  'x + 5',
  'x - 5',
  '-x',
  'x * 0.5',
  'x + 10',
  '2 * x',
];

const MEDIUM_EQUATIONS = [
  'x^2 / 50',
  'sin(x / 10) * 20',
  'cos(x / 10) * 20',
  'abs(x) * 0.3',
  'sqrt(abs(x)) * 2',
  'x^2 / 30 - 10',
  'sin(x / 5) * 30',
];

const HARD_EQUATIONS = [
  'sin(x / 8) * 40 + x * 0.1',
  'cos(x / 6) * 35',
  'x^2 / 25',
  'tan(x / 20) * 15',
  'log(abs(x) + 1) * 10',
  'abs(sin(x / 5)) * 30',
];

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function findNearestTarget(bot: PlayerState, players: PlayerState[]): PlayerState | null {
  let nearest: PlayerState | null = null;
  let minDist = Infinity;

  for (const player of players) {
    if (player.id === bot.id || player.isEliminated) continue;
    const d = distance(bot.position, player.position);
    if (d < minDist) {
      minDist = d;
      nearest = player;
    }
  }

  return nearest;
}

function generateAimedEquation(
  bot: PlayerState,
  target: PlayerState,
  difficulty: BotDifficulty
): string {
  const dx = target.position.x - bot.position.x;
  const dy = target.position.y - bot.position.y;
  const slope = dx !== 0 ? dy / dx : 0;

  const errorFactor = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.2 : 0.05;
  const error = (Math.random() - 0.5) * errorFactor * Math.abs(slope);

  if (difficulty === 'easy') {
    return EASY_EQUATIONS[Math.floor(Math.random() * EASY_EQUATIONS.length)];
  }

  if (Math.abs(slope) < 0.3) {
    const offset = target.position.y + (Math.random() - 0.5) * 20 * errorFactor;
    return `${offset / 50} + sin(x / 10) * ${5 + Math.random() * 10}`;
  }

  const m = slope + error;
  const b = bot.position.y - m * bot.position.x;
  const noise = (Math.random() - 0.5) * 10 * errorFactor;

  if (difficulty === 'hard' && Math.random() > 0.4) {
    const pool = HARD_EQUATIONS;
    const base = pool[Math.floor(Math.random() * pool.length)];
    return base;
  }

  if (difficulty === 'medium' && Math.random() > 0.5) {
    return MEDIUM_EQUATIONS[Math.floor(Math.random() * MEDIUM_EQUATIONS.length)];
  }

  return `${m.toFixed(2)} * x + ${(b + noise).toFixed(2)}`;
}

export function getBotThinkDelay(difficulty: BotDifficulty): number {
  const range = BOT_THINK_DELAY[difficulty];
  return range.min + Math.random() * (range.max - range.min);
}

export function generateBotEquation(
  bot: PlayerState,
  players: PlayerState[]
): string {
  const difficulty = bot.botDifficulty ?? 'medium';
  const target = findNearestTarget(bot, players);

  if (!target) {
    const pool = difficulty === 'easy' ? EASY_EQUATIONS :
      difficulty === 'medium' ? MEDIUM_EQUATIONS : HARD_EQUATIONS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return generateAimedEquation(bot, target, difficulty);
}
