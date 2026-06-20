import { create, all } from 'mathjs';
import { MAP_MIN, MAP_MAX } from './constants';

const math = create(all);

const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sqrt', 'abs', 'log', 'log10', 'exp',
  'pow', 'floor', 'ceil', 'round',
];

export interface ParsedEquation {
  expression: string;
  original: string;
  evaluate: (x: number) => number;
}

export function normalizeEquation(input: string): string {
  let eq = input.trim().toLowerCase();
  eq = eq.replace(/\s+/g, '');
  eq = eq.replace(/^y=/, '');
  eq = eq.replace(/\^/g, '^');
  return eq;
}

export function validateEquation(input: string): { valid: boolean; error?: string } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: 'Equation cannot be empty' };
  }

  if (input.length > 200) {
    return { valid: false, error: 'Equation too long' };
  }

  const dangerous = /[;{}[\]`$\\]|import|require|eval|function|=>|process|global/i;
  if (dangerous.test(input)) {
    return { valid: false, error: 'Invalid characters in equation' };
  }

  try {
    const expr = normalizeEquation(input);
    const compiled = math.compile(expr);
    const testPoints = [-50, -10, 0, 10, 50];
    for (const x of testPoints) {
      const result = compiled.evaluate({ x });
      if (typeof result !== 'number' || !isFinite(result)) {
        if (result === Infinity || result === -Infinity) continue;
        return { valid: false, error: `Invalid result at x=${x}` };
      }
    }
    return { valid: true };
  } catch (e) {
    return { valid: false, error: `Parse error: ${(e as Error).message}` };
  }
}

export function parseEquation(input: string): ParsedEquation {
  const validation = validateEquation(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const expr = normalizeEquation(input);
  const compiled = math.compile(expr);

  return {
    expression: expr,
    original: input.trim(),
    evaluate: (x: number) => {
      const result = compiled.evaluate({ x });
      if (typeof result !== 'number' || !isFinite(result)) {
        return NaN;
      }
      return result;
    },
  };
}

export function generateGraphPoints(
  equation: ParsedEquation,
  step: number = 0.5
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];

  for (let x = MAP_MIN; x <= MAP_MAX; x += step) {
    const y = equation.evaluate(x);
    if (!isNaN(y) && isFinite(y) && y >= MAP_MIN - 50 && y <= MAP_MAX + 50) {
      points.push({ x, y });
    }
  }

  return points;
}

export function getSupportedFunctions(): string[] {
  return ALLOWED_FUNCTIONS;
}
