import type { Enemy, EnemyKind, LevelConfig, Point } from './types';

export const TOTAL_LEVELS = 25;

export const SIZES = [
  9, 9, 11, 11, 13, 13, 15, 15, 17, 17, 17, 19, 19, 19, 21, 21, 21, 23, 23, 23, 25, 25, 25, 25, 25,
];

const DIRECTIONS = [
  { x: 0, y: -1, direction: 'up' as const },
  { x: 1, y: 0, direction: 'right' as const },
  { x: 0, y: 1, direction: 'down' as const },
  { x: -1, y: 0, direction: 'left' as const },
];

export const LEVEL_THEMES = [
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#0d1426',
    panel: '#17223a',
    surface: '#1d2a42',
    fg: '#f4f7ff',
    primary: '#7dd3fc',
    accent: '#5ce1c0',
    wall: '#243451',
    floor: '#0f1c2f',
    goal: '#32d299',
    player: '#7dd3fc',
    enemy: '#f87171',
    secondary: '#90a8d8',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: '#fff3df',
    panel: '#fffaf2',
    surface: '#ffe9c6',
    fg: '#31251d',
    primary: '#f59e0b',
    accent: '#fb7185',
    wall: '#f5d39d',
    floor: '#fff7eb',
    goal: '#ef4444',
    player: '#f59e0b',
    enemy: '#ea580c',
    secondary: '#8f6b4f',
  },
  {
    id: 'forest',
    name: 'Forest',
    bg: '#f1fdf0',
    panel: '#f7fff6',
    surface: '#dff9de',
    fg: '#163827',
    primary: '#22c55e',
    accent: '#10b981',
    wall: '#c7e7c6',
    floor: '#effdf2',
    goal: '#15803d',
    player: '#22c55e',
    enemy: '#dc2626',
    secondary: '#3a6a4d',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    bg: '#091d1f',
    panel: '#0d2a2f',
    surface: '#11383d',
    fg: '#e6fffb',
    primary: '#67e8f9',
    accent: '#a78bfa',
    wall: '#1a4445',
    floor: '#0a1c20',
    goal: '#34d399',
    player: '#67e8f9',
    enemy: '#f87171',
    secondary: '#9fcfc8',
  },
] as const;

export type MazeTheme = (typeof LEVEL_THEMES)[number];

export function getLevelConfig(level: number): LevelConfig {
  const size = SIZES[Math.min(level - 1, SIZES.length - 1)];
  const enemyCount = Math.min(6, 1 + Math.floor(level / 3));
  const enemySpeed = Math.max(550, 1700 - level * 40);

  return {
    size,
    enemyCount,
    enemySpeed,
    hintDensity: Math.max(0.18, 0.75 - level * 0.02),
    scoreMultiplier: 1 + level * 0.25,
    bossThreshold: Math.max(4, 9 + level / 4),
  };
}

export function generateMaze(n: number, seed: number): number[][] {
  const grid = Array.from({ length: n }, () => Array(n).fill(1));
  let s = seed;
  const random = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const stack: Point[] = [{ x: 1, y: 1 }];
  grid[1][1] = 0;

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options: Point[] = [];

    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x > 0 && y > 0 && x < n - 1 && y < n - 1 && grid[y][x] === 1) {
        options.push({ x, y });
      }
    }

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const next = options[Math.floor(random() * options.length)];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    grid[midY][midX] = 0;
    grid[next.y][next.x] = 0;
    stack.push(next);
  }

  grid[n - 2][n - 2] = 0;
  return grid;
}

export function isWalkable(maze: number[][], x: number, y: number) {
  if (y < 0 || x < 0 || y >= maze.length || x >= maze.length) {
    return false;
  }
  return maze[y][x] === 0;
}

export function findShortestPath(maze: number[][]): Point[] {
  const size = maze.length;
  const start: Point = { x: 1, y: 1 };
  const goal: Point = { x: size - 2, y: size - 2 };
  const queue: Point[] = [start];
  const prev = new Map<string, Point | null>([[`${start.x},${start.y}`, null]]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      break;
    }

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size && maze[ny][nx] === 0 && !prev.has(key)) {
        prev.set(key, current);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  const path: Point[] = [];
  let cursor: Point | null = goal;
  while (cursor) {
    path.push(cursor);
    cursor = prev.get(`${cursor.x},${cursor.y}`) ?? null;
  }

  return path.reverse();
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function getWalkableNeighbors(maze: number[][], point: Point) {
  return DIRECTIONS.filter(({ x, y }) => {
    const nx = point.x + x;
    const ny = point.y + y;
    return isWalkable(maze, nx, ny) && !(nx === 1 && ny === 1);
  });
}

function getDirectionFromDelta(dx: number, dy: number) {
  if (dx === 1 && dy === 0) return 'right';
  if (dx === -1 && dy === 0) return 'left';
  if (dy === -1) return 'up';
  if (dy === 1) return 'down';
  return 'right';
}

function getNearestStepToward(maze: number[][], enemy: Enemy, target: Point, stepCount = 1) {
  const options = getWalkableNeighbors(maze, enemy);
  if (!options.length) {
    return null;
  }

  const scored = options
    .map((option) => ({
      ...option,
      distance: Math.abs(target.x - (enemy.x + option.x)) + Math.abs(target.y - (enemy.y + option.y)),
    }))
    .sort((a, b) => a.distance - b.distance);

  const chosen = scored[0];
  if (!chosen) {
    return null;
  }

  return {
    x: enemy.x + chosen.x,
    y: enemy.y + chosen.y,
    direction: chosen.direction,
    stepCount,
  };
}

export function chooseEnemyKind(level: number, index: number): EnemyKind {
  const pool: EnemyKind[] = ['walker', 'walker', 'hunter', 'spinner', 'phantom'];
  if (level >= 6) pool.push('hunter');
  if (level >= 10) pool.push('boss');
  if (level >= 14) pool.push('phantom');

  return pool[(index + level) % pool.length];
}

export function buildLevel(level: number) {
  const config = getLevelConfig(level);
  const size = config.size;
  const maze = generateMaze(size, level * 137 + 17);
  const goal = { x: size - 2, y: size - 2 };
  const player = { x: 1, y: 1 };

  const cells: Point[] = [];
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !(x === goal.x && y === goal.y)) {
        cells.push({ x, y });
      }
    }
  }

  const enemies: Enemy[] = [];
  for (let index = 0; index < config.enemyCount; index += 1) {
    const cell = cells[(index * 11 + level * 7) % Math.max(cells.length, 1)] ?? { x: 2, y: 2 };
    const kind = chooseEnemyKind(level, index);
    enemies.push({
      ...cell,
      id: `enemy-${level}-${index}`,
      kind,
      direction: 'right',
      speed: config.enemySpeed,
      hp: kind === 'boss' ? 3 : 1,
    });
  }

  return {
    maze,
    player,
    goal,
    enemies,
    hint: findShortestPath(maze),
    config,
  };
}

export function advanceEnemies(
  maze: number[][],
  enemies: Enemy[],
  player: Point,
  level: number,
  turn: number,
  limit = 1
): Enemy[] {
  return enemies.map((enemy, index) => {
    const baseSeed = turn + level * 13 + index * 37;
    const rng = seededRandom(baseSeed);
    const walkable = getWalkableNeighbors(maze, enemy);

    if (!walkable.length) {
      return enemy;
    }

    if (enemy.kind === 'phantom') {
      if (turn % 3 !== index % 3) {
        return enemy;
      }

      const candidates = [] as Point[];
      for (let y = 1; y < maze.length - 1; y += 1) {
        for (let x = 1; x < maze.length - 1; x += 1) {
          if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
            candidates.push({ x, y });
          }
        }
      }

      const target = candidates[Math.floor(rng * candidates.length)] ?? { x: enemy.x, y: enemy.y };
      return {
        ...enemy,
        x: target.x,
        y: target.y,
        direction: getDirectionFromDelta(target.x - enemy.x, target.y - enemy.y),
      };
    }

    if (enemy.kind === 'hunter') {
      const step = getNearestStepToward(maze, enemy, player, limit);
      if (!step) {
        return enemy;
      }
      return {
        ...enemy,
        x: step.x,
        y: step.y,
        direction: step.direction,
      };
    }

    if (enemy.kind === 'spinner') {
      const cycle = ['right', 'down', 'left', 'up'] as const;
      const currentIndex = cycle.indexOf(enemy.direction);
      const nextIndex = (currentIndex + 1 + Math.floor(rng * 2)) % cycle.length;
      const chosen = cycle[nextIndex];
      const match = DIRECTIONS.find((dir) => dir.direction === chosen);
      if (!match) {
        return enemy;
      }

      const nx = enemy.x + match.x;
      const ny = enemy.y + match.y;
      if (!isWalkable(maze, nx, ny)) {
        return enemy;
      }

      return {
        ...enemy,
        x: nx,
        y: ny,
        direction: chosen,
      };
    }

    if (enemy.kind === 'boss') {
      const pattern = Math.floor(rng * 2);
      const target = pattern === 0 ? { x: player.x, y: enemy.y } : { x: enemy.x, y: player.y };
      const step = getNearestStepToward(maze, enemy, target, limit + 1);
      if (!step) {
        return enemy;
      }
      return {
        ...enemy,
        x: step.x,
        y: step.y,
        direction: step.direction,
        hp: enemy.hp ?? 3,
      };
    }

    const nextMove = walkable[Math.floor(rng * walkable.length)];
    if (!nextMove) {
      return enemy;
    }

    return {
      ...enemy,
      x: enemy.x + nextMove.x,
      y: enemy.y + nextMove.y,
      direction: nextMove.direction,
    };
  });
}
